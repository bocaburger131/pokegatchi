// js/game/SaveManager.js
import { DEFAULT_STATE, SAVE_SCHEMA_VERSION } from './balance.js';

const STORAGE_KEY = 'pg_save_state';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function clamp(n, min, max) {
  const v = Number.isFinite(Number(n)) ? Number(n) : min;
  return Math.max(min, Math.min(max, v));
}

function normalize(stateLike = {}) {
  const s = { ...clone(DEFAULT_STATE), ...stateLike };

  // Keep legacy + canonical inventory synced.
  const inv = { ...(DEFAULT_STATE.inventory || {}), ...(s.inventory || {}) };
  ['berries', 'toys', 'potions', 'candy'].forEach((k) => {
    const top = Number.isFinite(Number(s[k])) ? Number(s[k]) : inv[k] || 0;
    inv[k] = Math.max(0, top);
    s[k] = inv[k];
  });
  s.inventory = inv;

  s.hunger = clamp(s.hunger, 0, 100);
  s.happiness = clamp(s.happiness, 0, 100);
  s.affection = clamp(s.affection, 0, 100);
  s.boredom = clamp(s.boredom, 0, 100);
  s.dirtiness = clamp(s.dirtiness, 0, 100);
  s.sickness = clamp(s.sickness, 0, 100);
  s.xp = clamp(s.xp, 0, 1_000_000);
  s.level = clamp(s.level, 1, 999);

  if (!Array.isArray(s.unlocks)) s.unlocks = [];
  if (!Array.isArray(s.journal)) s.journal = [];
  if (!s.sim || typeof s.sim !== 'object') s.sim = { lastTickTs: 0 };
  if (!Number.isFinite(Number(s.sim.lastTickTs))) s.sim.lastTickTs = 0;

  return s;
}

function migrateLegacyToV1(legacy) {
  // Legacy had raw state object with no schema wrapper.
  return {
    schemaVersion: 1,
    savedAt: Date.now(),
    state: {
      ...legacy,
      inventory: {
        berries: legacy.berries ?? 0,
        toys: legacy.toys ?? 0,
        potions: legacy.potions ?? 0,
        candy: legacy.candy ?? 0,
      },
      sim: { lastTickTs: Date.now() },
    },
  };
}

function migrateV1ToV2(data) {
  const prev = data.state || {};
  const upgraded = {
    ...prev,
    boredom: prev.boredom ?? DEFAULT_STATE.boredom,
    dirtiness: prev.dirtiness ?? DEFAULT_STATE.dirtiness,
    sickness: prev.sickness ?? DEFAULT_STATE.sickness,
    xp: prev.xp ?? DEFAULT_STATE.xp,
    level: prev.level ?? DEFAULT_STATE.level,
    unlocks: Array.isArray(prev.unlocks) ? prev.unlocks : [],
    sim: {
      ...(prev.sim || {}),
      lastTickTs: Number.isFinite(Number(prev?.sim?.lastTickTs)) ? Number(prev.sim.lastTickTs) : Date.now(),
    },
  };

  return {
    schemaVersion: 2,
    savedAt: Date.now(),
    state: upgraded,
  };
}

export class SaveManager {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalize(DEFAULT_STATE);
      const parsed = JSON.parse(raw);

      let data;
      if (parsed && typeof parsed === 'object' && parsed.state && parsed.schemaVersion) {
        data = parsed;
      } else {
        data = migrateLegacyToV1(parsed || {});
      }

      if (data.schemaVersion < 2) data = migrateV1ToV2(data);
      if (data.schemaVersion !== SAVE_SCHEMA_VERSION) {
        // Future schema: best effort fallback to normalized state.
        return normalize(data.state || DEFAULT_STATE);
      }
      return normalize(data.state || DEFAULT_STATE);
    } catch (err) {
      console.warn('SaveManager.load failed, falling back to defaults:', err);
      return normalize(DEFAULT_STATE);
    }
  }

  save(state) {
    try {
      const payload = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        state: normalize(state),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      console.warn('SaveManager.save failed:', err);
      return false;
    }
  }

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
