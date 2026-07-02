// js/core/Store.js — Minimal store
export const store = {
  state: {
    current: 'pikachu',
  },
  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o?.[k], this.state);
    if (target) target[last] = value;
    return value;
  },
};
