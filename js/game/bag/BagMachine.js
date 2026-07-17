// js/game/bag/BagMachine.js — Bag state machine (open/close, item use, overflow)
import { BAG_GAME_EVENTS, BAG_UI_EVENTS } from './events.js?v=1';

const MAX_ITEMS = 99;
const OVERFLOW_THRESHOLD = 95;

export class BagMachine {
  constructor({ eventBus, store }) {
    this._bus = eventBus;
    this._store = store;
    this._state = {
      open: false,
      inventory: {
        berries: store.state.berries || 0,
        toys: store.state.toys || 0,
        potions: store.state.potions || 0,
        candy: store.state.candy || 0,
      },
      pendingTx: {},
      ui: { error: null },
    };
    this._txCounter = 0;
  }

  start() {
    // Subscribe to UI events
    this._bus.subscribe(BAG_UI_EVENTS.OPEN_REQUEST, () => this._open());
    this._bus.subscribe(BAG_UI_EVENTS.CLOSE_REQUEST, () => this._close());
    this._bus.subscribe(BAG_UI_EVENTS.ITEM_USE_REQUEST, (evt) => {
      this._useItem(evt.payload?.itemName);
    });

    // Initial sync from store
    this._syncFromStore();
    this._notifyStateChange();
  }

  dispatch(event, payload = {}) {
    if (event === BAG_UI_EVENTS.OPEN_REQUEST) this._open();
    else if (event === BAG_UI_EVENTS.CLOSE_REQUEST) this._close();
    else if (event === BAG_UI_EVENTS.ITEM_USE_REQUEST) this._useItem(payload.itemName);
  }

  getState() {
    // Sync inventory from store on read
    this._syncFromStore();
    return { ...this._state, inventory: { ...this._state.inventory } };
  }

  _open() {
    this._state.open = true;
    this._state.ui.error = null;
    this._syncFromStore();
    this._notifyStateChange();
  }

  _close() {
    this._state.open = false;
    this._notifyStateChange();
  }

  _syncFromStore() {
    const s = this._store.state;
    this._state.inventory = {
      berries: s.berries || 0,
      toys: s.toys || 0,
      potions: s.potions || 0,
      candy: s.candy || 0,
    };
  }

  _useItem(itemName) {
    if (!itemName) {
      this._state.ui.error = 'No item specified';
      return;
    }

    const count = this._store.get(itemName) || 0;
    if (count < 1) {
      this._state.ui.error = `No ${itemName} left`;
      this._notifyStateChange();
      return;
    }

    // Create a pending transaction
    const txId = `tx_${++this._txCounter}_${Date.now()}`;
    this._state.pendingTx[txId] = { itemName, ts: Date.now() };
    this._state.ui.error = null;

    // Deduct from store
    this._store.addItem(itemName, -1);
    this._syncFromStore();

    // Check overflow
    const total = Object.values(this._state.inventory).reduce((a, b) => a + b, 0);
    if (total >= OVERFLOW_THRESHOLD) {
      const overflowCount = total - OVERFLOW_THRESHOLD;
      this._bus.emit(BAG_GAME_EVENTS.OVERFLOW_CREATED, { overflowCount });
    }

    // Emit item used
    this._bus.emit(BAG_GAME_EVENTS.ITEM_USED, { itemName, txId, remainingCount: count - 1 });

    // Resolve pending tx
    delete this._state.pendingTx[txId];

    this._notifyStateChange();
  }

  _notifyStateChange() {
    if (typeof window._onBagStateChange === 'function') {
      window._onBagStateChange(this.getState());
    }
  }
}
