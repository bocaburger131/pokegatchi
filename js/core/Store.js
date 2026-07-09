// js/core/Store.js
import { DEFAULT_STATE } from '../game/balance.js';
import { SaveManager } from '../game/SaveManager.js';

const JOURNAL_LIMIT = 200;

function deepGet(obj, key) {
  const keys = String(key || '').split('.').filter(Boolean);
  return keys.reduce((o, k) => (o !== undefined ? o[k] : undefined), obj);
}

function deepSet(obj, key, value) {
  const keys = String(key || '').split('.').filter(Boolean);
  if (!keys.length) return;
  const last = keys.pop();
  const target = keys.reduce((o, k) => {
    if (!o[k] || typeof o[k] !== 'object') o[k] = {};
    return o[k];
  }, obj);
  target[last] = value;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

const saveManager = new SaveManager();

function loadInitialState() {
  try {
    return saveManager.load();
  } catch (err) {
    console.warn('Store load failed, using defaults:', err);
    return clone(DEFAULT_STATE);
  }
}

export const store = {
  state: loadInitialState(),

  _persist() {
    saveManager.save(this.state);
  },

  set(key, value) {
    deepSet(this.state, key, value);

    // Keep inventory mirror in sync when legacy top-level keys are set.
    if (['berries', 'toys', 'potions', 'candy'].includes(key)) {
      deepSet(this.state, `inventory.${key}`, Math.max(0, Number(value || 0)));
    }

    if (window._onStoreChange) window._onStoreChange(key, value);
    this._persist();
    return value;
  },

  get(key) {
    return deepGet(this.state, key);
  },

  addStat(name, delta) {
    const current = Number(this.state[name] || 0);
    const next = Math.max(0, Math.min(100, current + Number(delta || 0)));
    this.state[name] = next;
    if (window._onStoreChange) window._onStoreChange(name, next);
    this._persist();
    return next;
  },

  addItem(name, delta = 1) {
    const current = Number(this.state[name] || 0);
    const next = Math.max(0, current + Number(delta || 0));
    this.state[name] = next;

    if (!this.state.inventory || typeof this.state.inventory !== 'object') this.state.inventory = {};
    this.state.inventory[name] = next;

    if (window._onStoreChange) window._onStoreChange(name, next);
    this._persist();
    return next;
  },

  addHud(name, delta = 1) {
    const current = Number(this.state[name] || 0);
    const next = current + Number(delta || 0);
    this.state[name] = next;
    if (window._onStoreChange) window._onStoreChange(name, next);
    this._persist();
    return next;
  },

  logEvent(type, label, icon) {
    if (!Array.isArray(this.state.journal)) this.state.journal = [];
    this.state.journal.unshift({ ts: Date.now(), type, label, icon });
    if (this.state.journal.length > JOURNAL_LIMIT) this.state.journal.length = JOURNAL_LIMIT;
    this._persist();
  },

  replaceState(nextState) {
    this.state = clone(nextState || DEFAULT_STATE);
    if (window._onStoreChange) {
      Object.entries(this.state).forEach(([key, value]) => window._onStoreChange(key, value));
    }
    this._persist();
  },

  snapshot() {
    return clone(this.state);
  },
};
