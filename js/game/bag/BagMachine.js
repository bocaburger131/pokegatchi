// js/game/bag/BagMachine.js
import { BAG_ACCESSORY_EVENTS, BAG_GAME_EVENTS, BAG_SYNC_EVENTS, BAG_UI_EVENTS } from './events.js';
import { commitReplayGuard, createReplayGuardState, replayGuardCheck } from './replayGuard.js';

const STACKABLE_ITEMS = ['berries', 'toys', 'potions', 'candy'];

export function createInitialBagState(storeState = {}) {
  return {
    phase: 'CLOSED',
    selectedItem: null,
    capacity: {
      maxSlots: Number(storeState?.bagCapacity?.maxSlots || 12),
      usedSlots: 0,
      overflowCount: 0,
    },
    inventory: {
      berries: Number(storeState.berries || 0),
      toys: Number(storeState.toys || 0),
      potions: Number(storeState.potions || 0),
      candy: Number(storeState.candy || 0),
    },
    pendingTx: {},
    sync: {
      online: true,
      catchingUp: false,
      gapDetected: false,
    },
    replayGuard: createReplayGuardState(),
    ui: {
      toasts: [],
      error: null,
      lastAction: null,
    },
  };
}

function cloneState(state) {
  return {
    ...state,
    capacity: { ...state.capacity },
    inventory: { ...state.inventory },
    pendingTx: { ...state.pendingTx },
    sync: { ...state.sync },
    replayGuard: {
      rewardIdsSeen: new Set(state.replayGuard.rewardIdsSeen),
      watermarkByAccessory: { ...state.replayGuard.watermarkByAccessory },
      nonceWindow: { ...state.replayGuard.nonceWindow },
    },
    ui: { ...state.ui, toasts: [...(state.ui.toasts || [])] },
  };
}

function countUsedSlots(inv) {
  return STACKABLE_ITEMS.reduce((acc, k) => acc + (Number(inv[k] || 0) > 0 ? 1 : 0), 0);
}

function withToast(next, text, level = 'info') {
  next.ui.toasts.unshift({ ts: Date.now(), level, text });
  if (next.ui.toasts.length > 40) next.ui.toasts.length = 40;
  return next;
}

function applyInventoryPatch(next, patch = {}) {
  Object.entries(patch).forEach(([k, v]) => {
    if (!STACKABLE_ITEMS.includes(k)) return;
    next.inventory[k] = Math.max(0, Number(v || 0));
  });
  next.capacity.usedSlots = countUsedSlots(next.inventory);
}

export function bagReducer(state, action) {
  const next = cloneState(state);
  const type = action?.type;
  const payload = action?.payload || {};

  switch (type) {
    case BAG_UI_EVENTS.OPEN_REQUEST:
      if (next.phase === 'CLOSED') {
        next.phase = 'OPENING';
        next.ui.error = null;
      }
      return next;

    case BAG_UI_EVENTS.OPENED:
    case BAG_GAME_EVENTS.INVENTORY_SNAPSHOT:
      next.phase = 'IDLE';
      if (payload.inventory) applyInventoryPatch(next, payload.inventory);
      if (payload.maxSlots) next.capacity.maxSlots = Math.max(1, Number(payload.maxSlots));
      return next;

    case BAG_UI_EVENTS.CLOSE_REQUEST:
      next.phase = 'CLOSED';
      next.selectedItem = null;
      return next;

    case BAG_UI_EVENTS.ITEM_SELECT_REQUEST:
      next.selectedItem = payload.itemName || null;
      return next;

    case BAG_UI_EVENTS.ITEM_USE_REQUEST: {
      const item = payload.itemName;
      next.ui.error = null;
      if (!item || !STACKABLE_ITEMS.includes(item)) {
        next.ui.error = 'Unknown item';
        return withToast(next, '⚠ Unknown item', 'error');
      }
      if ((next.inventory[item] || 0) < 1) {
        next.ui.error = `No ${item} left`;
        return withToast(next, `❌ No ${item} left`, 'warn');
      }
      const txId = payload.txId || `bagtx-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
      next.pendingTx[txId] = { itemName: item, requestedAt: Date.now() };
      next.inventory[item] = Math.max(0, Number(next.inventory[item] || 0) - 1); // optimistic
      next.capacity.usedSlots = countUsedSlots(next.inventory);
      next.phase = 'BUSY';
      next.ui.lastAction = { type: 'use_item', item, txId };
      return withToast(next, `Using ${item}...`);
    }

    case BAG_GAME_EVENTS.TX_APPLIED:
    case BAG_GAME_EVENTS.ITEM_CONSUMED: {
      const txId = payload.txId;
      if (txId && next.pendingTx[txId]) delete next.pendingTx[txId];
      if (payload.inventory) applyInventoryPatch(next, payload.inventory);
      next.phase = Object.keys(next.pendingTx).length ? 'BUSY' : 'IDLE';
      next.ui.error = null;
      return next;
    }

    case BAG_GAME_EVENTS.ITEM_CONSUME_REJECTED:
    case BAG_GAME_EVENTS.TX_REVERTED: {
      const txId = payload.txId;
      const item = payload.itemName || next.pendingTx[txId]?.itemName;
      if (item && STACKABLE_ITEMS.includes(item)) {
        next.inventory[item] = Math.max(0, Number(next.inventory[item] || 0) + 1); // rollback optimistic decrement
      }
      if (txId && next.pendingTx[txId]) delete next.pendingTx[txId];
      next.capacity.usedSlots = countUsedSlots(next.inventory);
      next.phase = 'CONFLICT';
      next.ui.error = payload.reason || 'Action rejected';
      return withToast(next, `⚠ ${next.ui.error}`, 'error');
    }

    case BAG_GAME_EVENTS.ITEM_GRANTED: {
      const item = payload.itemName;
      const amt = Math.max(0, Number(payload.amount || 0));
      if (!STACKABLE_ITEMS.includes(item) || !amt) return next;
      const hasSlot = (next.inventory[item] || 0) > 0;
      const freeSlots = Math.max(0, next.capacity.maxSlots - next.capacity.usedSlots);
      if (!hasSlot && freeSlots < 1) {
        next.capacity.overflowCount += amt;
        return withToast(next, `Bag full: moved ${amt} ${item} to overflow`, 'warn');
      }
      next.inventory[item] = Math.max(0, Number(next.inventory[item] || 0) + amt);
      next.capacity.usedSlots = countUsedSlots(next.inventory);
      return next;
    }

    case BAG_GAME_EVENTS.CAPACITY_CHANGED:
      next.capacity.maxSlots = Math.max(1, Number(payload.maxSlots || next.capacity.maxSlots));
      next.capacity.usedSlots = countUsedSlots(next.inventory);
      return next;

    case BAG_GAME_EVENTS.CAPACITY_FULL:
      return withToast(next, 'Bag full', 'warn');

    case BAG_GAME_EVENTS.OVERFLOW_CREATED:
      next.capacity.overflowCount = Math.max(0, Number(payload.overflowCount || next.capacity.overflowCount));
      return next;

    case BAG_SYNC_EVENTS.NET_DISCONNECTED:
      next.sync.online = false;
      next.phase = 'OFFLINE';
      return withToast(next, 'Offline mode: inventory is read-only', 'warn');

    case BAG_SYNC_EVENTS.NET_CONNECTED:
      next.sync.online = true;
      next.sync.catchingUp = true;
      next.phase = 'CATCHING_UP';
      return next;

    case BAG_SYNC_EVENTS.CATCHUP_START:
      next.sync.catchingUp = true;
      next.phase = 'CATCHING_UP';
      return next;

    case BAG_SYNC_EVENTS.SEQ_GAP:
      next.sync.gapDetected = true;
      next.sync.catchingUp = true;
      next.phase = 'CATCHING_UP';
      return withToast(next, 'Sync gap detected. Re-syncing bag...', 'warn');

    case BAG_SYNC_EVENTS.CATCHUP_END:
      next.sync.catchingUp = false;
      next.sync.gapDetected = false;
      next.phase = Object.keys(next.pendingTx).length ? 'BUSY' : 'IDLE';
      return next;

    case BAG_ACCESSORY_EVENTS.REWARD_GRANT_REQUESTED: {
      const verdict = replayGuardCheck(next.replayGuard, payload, action?.ts || Date.now());
      if (!verdict.accept) {
        next.ui.error = verdict.reason;
        return withToast(next, `Replay blocked (${verdict.reason})`, 'warn');
      }
      commitReplayGuard(next.replayGuard, payload, action?.ts || Date.now());
      return next;
    }

    case BAG_ACCESSORY_EVENTS.REWARD_GRANTED:
      return bagReducer(next, {
        type: BAG_GAME_EVENTS.ITEM_GRANTED,
        payload: {
          itemName: payload.itemName,
          amount: payload.amount,
        },
      });

    case BAG_ACCESSORY_EVENTS.REWARD_DUPLICATE:
      return withToast(next, 'Duplicate accessory reward ignored', 'warn');

    case BAG_UI_EVENTS.RECOVERY_RETRY:
      next.ui.error = null;
      next.phase = next.sync.online ? 'CATCHING_UP' : 'OFFLINE';
      return next;

    default:
      return next;
  }
}

export class BagMachine {
  constructor({ eventBus, store }) {
    this.eventBus = eventBus;
    this.store = store;
    this.state = createInitialBagState(store.state);
    this.unsub = null;
  }

  start() {
    if (this.unsub) this.unsub();
    this.unsub = this.eventBus.subscribe('*', (evt) => {
      this.state = bagReducer(this.state, evt);
      if (window._onBagStateChange) window._onBagStateChange(this.state, evt);
    });
  }

  stop() {
    if (this.unsub) this.unsub();
    this.unsub = null;
  }

  dispatch(type, payload = {}) {
    return this.eventBus.emit(type, payload);
  }

  getState() {
    return this.state;
  }
}
