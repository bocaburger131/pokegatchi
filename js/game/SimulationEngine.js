// js/game/SimulationEngine.js — Gameplay action dispatcher & stat simulation
import { BALANCE } from './balance.js?v=1';

export class SimulationEngine {
  constructor({ store, eventBus }) {
    this._store = store;
    this._bus = eventBus;
    this._tickTimer = null;
    this._running = false;
    this._TICK_MS = 60_000; // 1 minute ticks
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._tick();
    this._tickTimer = setInterval(() => this._tick(), this._TICK_MS);
  }

  stop() {
    this._running = false;
    if (this._tickTimer) clearInterval(this._tickTimer);
  }

  _tick() {
    // Passive stat decay
    this._store.addStat('hunger', -BALANCE.HUNGER_DECAY);
    this._store.addStat('happiness', -BALANCE.HAPPINESS_DECAY);
    this._store.addStat('affection', -BALANCE.AFFECTION_DECAY);
    this._store.addStat('hygiene', -BALANCE.HYGIENE_DECAY);
    this._bus.emit('gameplay.tick', { ts: Date.now() });
  }

  dispatchAction(actionType, payload = {}) {
    const s = this._store;
    let journal = null;

    switch (actionType) {
      case 'feed':
        s.addStat('hunger', BALANCE.FEED_HUNGER);
        s.addStat('happiness', BALANCE.FEED_HAPPINESS);
        s.addHud('xp', BALANCE.XP_ACTION);
        journal = { type: 'feed', label: 'Fed your Pokémon', icon: '🍎' };
        break;
      case 'pet':
        s.addStat('happiness', BALANCE.PET_HAPPINESS);
        s.addStat('affection', BALANCE.PET_AFFECTION);
        s.addHud('xp', BALANCE.XP_ACTION);
        journal = { type: 'pet', label: 'Petted your Pokémon', icon: '🫳' };
        break;
      case 'heal':
      case 'clean':
        s.addStat('hygiene', BALANCE.HEAL_HYGIENE);
        s.addStat('happiness', BALANCE.HEAL_HAPPINESS);
        s.addHud('xp', BALANCE.XP_ACTION);
        journal = { type: 'heal', label: 'Healed your Pokémon', icon: '💊' };
        break;
      case 'bounce':
        s.addStat('happiness', BALANCE.BOUNCE_HAPPINESS);
        s.addHud('xp', BALANCE.XP_ACTION);
        journal = { type: 'bounce', label: 'Bounce!', icon: '🌟' };
        break;
      case 'use_item':
        s.addStat('hunger', BALANCE.USE_ITEM_HUNGER);
        s.addStat('happiness', BALANCE.USE_ITEM_HAPPINESS);
        s.addHud('xp', BALANCE.XP_ACTION);
        journal = { type: 'item', label: `Used ${payload.itemName || 'item'}`, icon: '🎒' };
        break;
      case 'catch_success':
        s.addHud('pokemonCaught', 1);
        s.addHud('xp', BALANCE.XP_CATCH);
        journal = { type: 'catch', label: 'Caught a Pokémon!', icon: '⚡' };
        break;
      case 'catch_fail':
        journal = { type: 'catch_fail', label: 'Catch failed', icon: '💨' };
        break;
      case 'spin_success':
        s.addHud('pokestopSpins', 1);
        s.addHud('xp', BALANCE.XP_SPIN);
        journal = { type: 'spin', label: 'PokéStop spun!', icon: '🔵' };
        break;
      case 'spin_fail':
        journal = { type: 'spin_fail', label: 'Spin failed', icon: '⛔' };
        break;
      default:
        break;
    }

    // Level-up check
    const xp = s.state.xp || 0;
    const level = s.state.level || 1;
    const xpNeeded = level * BALANCE.XP_PER_LEVEL;
    if (xp >= xpNeeded) {
      s.set('level', level + 1);
      s.set('xp', xp - xpNeeded);
      this._bus.emit('gameplay.level_up', { from: level, to: level + 1 });
    }

    this._bus.emit('gameplay.event', {
      actionType,
      payload,
      journal,
      ui: {
        animation: payload.animation || null,
      },
    });

    return { ok: true, actionType };
  }
}
