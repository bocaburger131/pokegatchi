// js/core/Store.js — Full store with stats, HUD, and inventory
export const store = {
  state: {
    current: 'pikachu',
    // === PET STATS ===
    hunger: 80,
    happiness: 60,
    affection: 50,
    // === HUD COUNTERS ===
    steps: 1247,
    pokemonCaught: 42,
    pokestopSpins: 18,
    badges: 3,
    // === INVENTORY ===
    berries: 5,
    toys: 3,
    potions: 2,
    candy: 10,
    // === JOURNAL ===
    journal: [],
  },

  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o?.[k], this.state);
    if (target !== undefined) target[last] = value;
    else this.state[last] = value;
    // Trigger UI update
    if (window._onStoreChange) window._onStoreChange(key, value);
    return value;
  },

  get(key) {
    const keys = key.split('.');
    return keys.reduce((o, k) => (o !== undefined ? o[k] : undefined), this.state);
  },

  // Convenience modifiers (clamped 0-100)
  addStat(name, delta) {
    const current = this.state[name] || 0;
    this.state[name] = Math.max(0, Math.min(100, current + delta));
    if (window._onStoreChange) window._onStoreChange(name, this.state[name]);
    return this.state[name];
  },

  addItem(name, delta = 1) {
    const current = this.state[name] || 0;
    this.state[name] = Math.max(0, current + delta);
    if (window._onStoreChange) window._onStoreChange(name, this.state[name]);
    return this.state[name];
  },

  addHud(name, delta = 1) {
    const current = this.state[name] || 0;
    this.state[name] = current + delta;
    if (window._onStoreChange) window._onStoreChange(name, this.state[name]);
    return this.state[name];
  },

  logEvent(type, label, icon) {
    this.state.journal.unshift({ ts: Date.now(), type, label, icon });
    if (this.state.journal.length > 200) this.state.journal.length = 200;
  },
};
