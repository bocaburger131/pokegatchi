// js/core/Store.js
export const store = {
  state: {
    pet: {
      name: 'Eevee',
      speciesId: '133',
      stage: 0, // 0=egg, 1=baby, 2=teen, 3=adult, 4=mega
      stats: { hunger: 1.0, boredom: 0.0, cleanliness: 1.0 },
      inventory: { berries: 2, toys: 3 },
    },
    backlog: {
      pendingSpins: 0,
      pendingCatches: 0,
      highestRarity: 'common',
    },
    time: { timeIdx: -1, weatherIdx: 0 },
    mode: 'play', // 'play' | 'auto' | 'scene'
    activeLine: 'eevee',
    achievements: [],
    streak: 0,
    catches: 0, steps: 0, stops: 0, uniqueStops: 0,
    totalFeeds: 0, totalPets: 0, totalHeals: 0,
  },
  listeners: {},

  get(key) {
    return key.split('.').reduce((o, k) => o?.[k], this.state);
  },

  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], this.state);
    target[last] = value;
    this._notify(key, value);
    return value;
  },

  subscribe(key, fn) {
    if (!this.listeners[key]) this.listeners[key] = new Set();
    this.listeners[key].add(fn);
    return () => this.listeners[key].delete(fn);
  },

  _notify(key, value) {
    this.listeners[key]?.forEach(fn => fn(value));
  },

  // Persistence
  save() {
    localStorage.setItem('pokegatchi_save', JSON.stringify(this.state));
  },

  load() {
    try {
      const saved = localStorage.getItem('pokegatchi_save');
      if (saved) Object.assign(this.state, JSON.parse(saved));
    } catch(e) { console.warn('Save load failed', e); }
  }
};
