// js/game/balance.js
export const SAVE_SCHEMA_VERSION = 2;

export const DEFAULT_STATE = {
  current: 'squirtle',

  // Core pet stats
  hunger: 80,
  happiness: 60,
  affection: 50,
  boredom: 15,
  dirtiness: 10,
  sickness: 0,

  // Progression
  xp: 0,
  level: 1,
  unlocks: [],

  // HUD counters
  steps: 1247,
  pokemonCaught: 42,
  pokestopSpins: 18,
  badges: 3,

  // Legacy top-level inventory keys (kept for UI compatibility)
  berries: 5,
  toys: 3,
  potions: 2,
  candy: 10,

  // Canonical inventory bag table
  inventory: {
    berries: 5,
    toys: 3,
    potions: 2,
    candy: 10,
  },

  // Journal remains present for UI rendering
  journal: [],

  // Simulation metadata
  sim: {
    lastTickTs: 0,
  },
};

export const STAT_KEYS = ['hunger', 'happiness', 'affection', 'boredom', 'dirtiness', 'sickness'];

export const CLAMP_RULES = {
  hunger: [0, 100],
  happiness: [0, 100],
  affection: [0, 100],
  boredom: [0, 100],
  dirtiness: [0, 100],
  sickness: [0, 100],
  level: [1, 999],
  xp: [0, 1_000_000],
};

// Stat changes are data-driven (per action) rather than hard-coded in main.js.
export const ACTION_BALANCE = {
  feed: {
    journal: { type: 'feed', label: 'Fed', icon: '🍽' },
    effects: { hunger: +15, happiness: -4, boredom: -3, dirtiness: +2, xp: +8 },
    ui: { toast: '🍽 Feeding...' },
  },
  pet: {
    journal: { type: 'pet', label: 'Petted', icon: '🫳' },
    effects: { affection: +10, happiness: +5, boredom: -6, xp: +7 },
    ui: { toast: '🫳 Petting...' },
  },
  heal: {
    journal: { type: 'heal', label: 'Healed', icon: '💊' },
    effects: { happiness: +20, sickness: -30, dirtiness: -8, xp: +10 },
    setToMax: ['hunger'],
    ui: { toast: '💊 Healing...' },
  },
  bounce: {
    journal: { type: 'bounce', label: 'Bounced', icon: '⭐' },
    effects: { happiness: +10, boredom: -8, dirtiness: +3, xp: +6 },
    ui: { toast: '🌟 Bounce!' },
  },
  catch_success: {
    journal: { type: 'catch', label: 'Catch Success', icon: '✅' },
    effects: { pokemonCaught: +1, happiness: +3, affection: +2, xp: +14 },
    itemDrops: { candy: 1 },
    ui: { toast: '✅ Catch success', sceneFx: 'catch' },
  },
  catch_fail: {
    journal: { type: 'fled', label: 'Catch Failed', icon: '❌' },
    effects: { happiness: -2, boredom: +2, xp: +2 },
    ui: { toast: '❌ Catch failed' },
  },
  spin_success: {
    journal: { type: 'spin', label: 'Spin Success', icon: '💠' },
    effects: { pokestopSpins: +1, xp: +10 },
    itemDrops: { berries: 1 },
    ui: { toast: '💠 Spin success', sceneFx: 'spin' },
  },
  spin_fail: {
    journal: { type: 'spin', label: 'Spin Failed', icon: '⛔' },
    effects: { boredom: +1, xp: +1 },
    ui: { toast: '⛔ Spin failed' },
  },
};

export const ITEM_BALANCE = {
  berries: {
    consume: 1,
    journal: { type: 'item', label: 'Used Berry', icon: '🫐' },
    effects: { hunger: +20, boredom: -2, xp: +6 },
    animation: 'feed',
    ui: { toast: '🍇 Used a Berry!' },
  },
  toys: {
    consume: 1,
    journal: { type: 'item', label: 'Used Toy', icon: '🧸' },
    effects: { happiness: +15, boredom: -12, affection: +3, xp: +7 },
    animation: 'bounce',
    ui: { toast: '🧸 Played with a Toy!' },
  },
  potions: {
    consume: 1,
    journal: { type: 'item', label: 'Used Potion', icon: '💊' },
    effects: { happiness: +20, affection: +12, sickness: -25, dirtiness: -5, xp: +9 },
    animation: 'heal',
    ui: { toast: '💖 Used a Potion!' },
  },
  candy: {
    consume: 1,
    journal: { type: 'item', label: 'Used Candy', icon: '🍬' },
    effects: { happiness: +10, boredom: -4, xp: +5 },
    animation: 'feed',
    ui: { toast: '🍬 Gave Candy!' },
  },
};

export const SPECIES_BALANCE = {
  squirtle: { decayMultiplier: 1.0, affectionGainMultiplier: 1.0, boredomGainMultiplier: 1.0 },
  pikachu: { decayMultiplier: 1.05, affectionGainMultiplier: 1.15, boredomGainMultiplier: 0.95 },
  eevee: { decayMultiplier: 0.95, affectionGainMultiplier: 1.05, boredomGainMultiplier: 1.05 },
  psyduck: { decayMultiplier: 1.1, affectionGainMultiplier: 0.95, boredomGainMultiplier: 1.1 },
};

// Per-minute baseline decay/growth (simulation converts by elapsed seconds)
export const DECAY_PER_MINUTE = {
  hunger: -2.2,
  happiness: -1.0,
  affection: -0.5,
  boredom: +1.8,
  dirtiness: +1.2,
};

export const SIMULATION = {
  tickMs: 15_000,
  maxCatchupSeconds: 8 * 60 * 60, // 8h
};

export const XP_LEVEL_TABLE = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 260 },
  { level: 4, minXp: 520 },
  { level: 5, minXp: 900 },
  { level: 6, minXp: 1_400 },
  { level: 7, minXp: 2_050 },
];

export const UNLOCK_TABLE = [
  { id: 'bag-tab-journal-plus', name: 'Journal+ Tab', when: (s) => (s.xp || 0) >= 200 },
  { id: 'item-slot-5', name: 'Bag Slot 5', when: (s) => (s.level || 1) >= 3 },
  { id: 'sparkle-scene-reaction', name: 'Sparkle Scene FX', when: (s) => (s.affection || 0) >= 70 },
  { id: 'healing-badge', name: 'Healing Badge', when: (s) => (s.sickness || 0) <= 5 && (s.dirtiness || 0) <= 20 },
];
