// js/game/balance.js — Default state & tuning constants
export const DEFAULT_STATE = {
  current: 'pikachu',
  // === PET STATS ===
  hunger: 80,
  happiness: 60,
  affection: 50,
  hygiene: 70,
  // === HUD COUNTERS ===
  steps: 0,
  pokemonCaught: 0,
  pokestopSpins: 0,
  badges: 0,
  xp: 0,
  level: 1,
  // === INVENTORY ===
  berries: 5,
  toys: 3,
  potions: 2,
  candy: 10,
  // === JOURNAL ===
  journal: [],
};

export const BALANCE = {
  // Stat gains per action
  FEED_HUNGER: 15,
  FEED_HAPPINESS: 5,
  PET_HAPPINESS: 12,
  PET_AFFECTION: 8,
  HEAL_HYGIENE: 20,
  HEAL_HAPPINESS: 5,
  BOUNCE_HAPPINESS: 10,
  USE_ITEM_HUNGER: 10,
  USE_ITEM_HAPPINESS: 8,
  // Decay per tick (every 60s)
  HUNGER_DECAY: 2,
  HAPPINESS_DECAY: 1,
  AFFECTION_DECAY: 0.5,
  HYGIENE_DECAY: 1,
  // XP per action
  XP_ACTION: 5,
  XP_CATCH: 20,
  XP_SPIN: 10,
  XP_PER_LEVEL: 100,
};
