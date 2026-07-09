// js/game/SimulationEngine.js
import {
  ACTION_BALANCE,
  CLAMP_RULES,
  DECAY_PER_MINUTE,
  ITEM_BALANCE,
  SIMULATION,
  SPECIES_BALANCE,
  UNLOCK_TABLE,
  XP_LEVEL_TABLE,
} from './balance.js';
import { BAG_GAME_EVENTS } from './bag/events.js';

function clampByRule(key, value) {
  const rule = CLAMP_RULES[key];
  if (!rule) return value;
  const [min, max] = rule;
  return Math.max(min, Math.min(max, value));
}

function toDeltaPerSecond(perMinuteMap) {
  const out = {};
  Object.entries(perMinuteMap).forEach(([k, v]) => {
    out[k] = v / 60;
  });
  return out;
}

const DECAY_PER_SECOND = toDeltaPerSecond(DECAY_PER_MINUTE);

export class SimulationEngine {
  constructor({ store, eventBus }) {
    this.store = store;
    this.eventBus = eventBus;
    this.interval = null;
  }

  start() {
    this.catchUpFromLastTick();
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(SIMULATION.tickMs / 1000), SIMULATION.tickMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  catchUpFromLastTick() {
    const lastTs = Number(this.store.get('sim.lastTickTs') || 0);
    const now = Date.now();
    if (!lastTs) {
      this.store.set('sim.lastTickTs', now);
      return;
    }
    const elapsedSec = Math.max(0, Math.floor((now - lastTs) / 1000));
    const safeElapsed = Math.min(elapsedSec, SIMULATION.maxCatchupSeconds);
    if (safeElapsed > 0) this.tick(safeElapsed, { source: 'catchup' });
  }

  tick(seconds, meta = { source: 'interval' }) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;

    const species = this.store.get('current') || 'squirtle';
    const speciesCfg = SPECIES_BALANCE[species] || SPECIES_BALANCE.squirtle;
    const decayMult = speciesCfg?.decayMultiplier || 1;
    const boredomMult = speciesCfg?.boredomGainMultiplier || 1;

    const patch = {};
    Object.entries(DECAY_PER_SECOND).forEach(([key, perSec]) => {
      let delta = perSec * seconds * decayMult;
      if (key === 'boredom') delta *= boredomMult;
      patch[key] = delta;
    });

    // Sickness pressure from neglect
    const hunger = Number(this.store.get('hunger') || 0);
    const dirtiness = Number(this.store.get('dirtiness') || 0);
    const boredom = Number(this.store.get('boredom') || 0);
    const sicknessDelta = ((hunger < 30 ? 0.9 : 0) + (dirtiness > 65 ? 1.1 : 0) + (boredom > 70 ? 0.6 : 0)) * (seconds / 60);
    if (sicknessDelta > 0) patch.sickness = (patch.sickness || 0) + sicknessDelta;

    this.applyPatch(patch, { reason: 'simulation.tick', source: meta.source });
    this.recomputeLevel();
    this.checkUnlocks();
    this.store.set('sim.lastTickTs', Date.now());
  }

  dispatchAction(actionType, payload = {}) {
    if (actionType === 'use_item') {
      return this.useItem(payload.itemName);
    }

    const actionCfg = ACTION_BALANCE[actionType];
    if (!actionCfg) {
      return this.eventBus.emit('gameplay.error', {
        actionType,
        message: `Unknown action: ${actionType}`,
      });
    }

    this.applyActionConfig(actionType, actionCfg, payload);
    this.recomputeLevel();
    this.checkUnlocks();
    this.store.set('sim.lastTickTs', Date.now());

    return this.eventBus.emit('gameplay.event', {
      actionType,
      payload,
      journal: actionCfg.journal,
      ui: actionCfg.ui || {},
      animation: payload.animation || null,
    });
  }

  useItem(itemName) {
    const itemCfg = ITEM_BALANCE[itemName];
    if (!itemCfg) {
      return this.eventBus.emit('gameplay.error', {
        actionType: 'use_item',
        itemName,
        message: `Unknown item: ${itemName}`,
      });
    }

    const count = Number(this.store.get(itemName) || 0);
    if (count < itemCfg.consume) {
      return this.eventBus.emit('gameplay.error', {
        actionType: 'use_item',
        itemName,
        message: `No ${itemName} left`,
      });
    }

    const patch = { ...(itemCfg.effects || {}) };
    patch[itemName] = (patch[itemName] || 0) - itemCfg.consume;
    this.applyPatch(patch, { reason: 'action.use_item', itemName });

    const txId = payload.txId || `use-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
    this.eventBus.emit(BAG_GAME_EVENTS.ITEM_CONSUMED, {
      txId,
      itemName,
      amount: itemCfg.consume,
      inventory: {
        berries: Number(this.store.get('berries') || 0),
        toys: Number(this.store.get('toys') || 0),
        potions: Number(this.store.get('potions') || 0),
        candy: Number(this.store.get('candy') || 0),
      },
    });
    this.eventBus.emit(BAG_GAME_EVENTS.TX_APPLIED, { txId, itemName });

    this.recomputeLevel();
    this.checkUnlocks();
    this.store.set('sim.lastTickTs', Date.now());

    return this.eventBus.emit('gameplay.event', {
      actionType: 'use_item',
      itemName,
      txId,
      journal: itemCfg.journal,
      ui: itemCfg.ui || {},
      animation: itemCfg.animation,
    });
  }

  applyActionConfig(actionType, actionCfg, payload = {}) {
    const patch = { ...(actionCfg.effects || {}) };

    // Species affinity can buff affection gains
    const species = this.store.get('current') || 'squirtle';
    const speciesCfg = SPECIES_BALANCE[species] || SPECIES_BALANCE.squirtle;
    if (patch.affection) {
      patch.affection = patch.affection * (speciesCfg.affectionGainMultiplier || 1);
    }

    Object.entries(actionCfg.itemDrops || {}).forEach(([item, amount]) => {
      patch[item] = (patch[item] || 0) + amount;
    });

    this.applyPatch(patch, { reason: `action.${actionType}`, payload });

    if (actionCfg.itemDrops) {
      Object.entries(actionCfg.itemDrops).forEach(([itemName, amount]) => {
        this.eventBus.emit(BAG_GAME_EVENTS.ITEM_GRANTED, {
          source: actionType,
          itemName,
          amount,
          inventory: {
            berries: Number(this.store.get('berries') || 0),
            toys: Number(this.store.get('toys') || 0),
            potions: Number(this.store.get('potions') || 0),
            candy: Number(this.store.get('candy') || 0),
          },
        });
      });
    }

    (actionCfg.setToMax || []).forEach((key) => {
      this.store.set(key, 100);
    });
  }

  applyPatch(patch, meta = {}) {
    const changed = [];

    Object.entries(patch).forEach(([key, deltaRaw]) => {
      const delta = Number(deltaRaw || 0);
      if (!Number.isFinite(delta) || delta === 0) return;

      if (['berries', 'toys', 'potions', 'candy'].includes(key)) {
        this.store.addItem(key, delta);
        changed.push(key);
        return;
      }

      if (['steps', 'pokemonCaught', 'pokestopSpins', 'badges', 'xp'].includes(key)) {
        const cur = Number(this.store.get(key) || 0);
        this.store.set(key, clampByRule(key, cur + delta));
        changed.push(key);
        return;
      }

      const cur = Number(this.store.get(key) || 0);
      const next = clampByRule(key, cur + delta);
      if (next !== cur) {
        this.store.set(key, next);
        changed.push(key);
      }
    });

    if (changed.length) {
      this.eventBus.emit('state.changed', {
        changedKeys: changed,
        meta,
      });
    }
  }

  recomputeLevel() {
    const xp = Number(this.store.get('xp') || 0);
    let nextLevel = 1;
    XP_LEVEL_TABLE.forEach((entry) => {
      if (xp >= entry.minXp) nextLevel = entry.level;
    });

    const curLevel = Number(this.store.get('level') || 1);
    if (nextLevel !== curLevel) {
      this.store.set('level', nextLevel);
      this.eventBus.emit('gameplay.level_up', { from: curLevel, to: nextLevel, xp });
    }
  }

  checkUnlocks() {
    const unlocks = new Set(this.store.get('unlocks') || []);
    let changed = false;

    UNLOCK_TABLE.forEach((entry) => {
      if (unlocks.has(entry.id)) return;
      if (entry.when(this.store.state)) {
        unlocks.add(entry.id);
        changed = true;
        this.eventBus.emit('unlock.awarded', { id: entry.id, name: entry.name });
      }
    });

    if (changed) {
      this.store.set('unlocks', Array.from(unlocks));
    }
  }
}
