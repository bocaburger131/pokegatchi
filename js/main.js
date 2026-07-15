// js/main.js — Complete with HUD sync, Bag system, Demo Boost, stat-modifying actions, collapsible sections
import * as THREE from 'three';
import { store } from './core/Store.js?v=4';
import { SceneManager } from './scene/SceneManager.js?v=18';
import { ExpressionOverlay } from './scene/ExpressionOverlay.js?v=2';
import { V2_MODELS, POKEMON_IDS, SPECIES_TO_POKEMON3D, FACE_DATA } from './data/Pokedex.js?v=2';
import { DEFAULT_STATE } from './game/balance.js?v=1';
import { EventBus } from './game/EventBus.js?v=1';
import { SimulationEngine } from './game/SimulationEngine.js?v=1';
import { BagMachine } from './game/bag/BagMachine.js?v=1';
import { BAG_GAME_EVENTS, BAG_UI_EVENTS } from './game/bag/events.js?v=1';

// === GLOBALS ===
const ANIMS = {
  FEED: 'feed',
  PET: 'pet',
  HEAL: 'heal',
  BOUNCE: 'bounce',
  EAT: 'eat',
  SAD: 'sad',
  WAVE: 'wave',
  RUN: 'run',
  PLAY: 'play',
};
let sceneMan, exprOverlay;
let currentSpecies = null;
let _hudFlashTimer = null;
let _journalTab = 'log';

const eventBus = new EventBus();
const simulation = new SimulationEngine({ store, eventBus });
const bagMachine = new BagMachine({ eventBus, store });
window.__bagMachine = bagMachine;
window.__eventBus = eventBus;
window.__simulation = simulation;
window.getActionLog = function(limit = 50) {
  return eventBus.getLog().slice(0, Math.max(1, Number(limit || 50)));
};

// Canonical PGP event contract (A1 freeze)
const PGP_EVENT_SCHEMA_VERSION = 1;
const PGP_ACTION_TO_OUTCOME = Object.freeze({
  catch_success: 'catch_success',
  catch_fail: 'catch_fail',
  spin_success: 'spin_success',
  spin_fail: 'spin_fail',
});
const PGP_OUTCOME_TO_ACTION = Object.freeze({
  catch_success: 'catch_success',
  catch_fail: 'catch_fail',
  spin_success: 'spin_success',
  spin_fail: 'spin_fail',
});

function _toPgpEventType(outcome) {
  const [kind, result] = String(outcome).split('_');
  return `pgp.${kind}.${result}`;
}

function _buildPgpEvent(actionType, payload = {}) {
  const outcome = PGP_ACTION_TO_OUTCOME[actionType];
  if (!outcome) return null;
  return {
    schemaVersion: PGP_EVENT_SCHEMA_VERSION,
    source: String(payload.source || 'web_ui'),
    actionType,
    outcome,
    eventType: _toPgpEventType(outcome),
    eventTsMs: Date.now(),
  };
}

function dispatchGameplay(actionType, payload = {}) {
  const pgpEvent = _buildPgpEvent(actionType, payload);
  const nextPayload = pgpEvent ? { ...payload, pgpEvent } : payload;
  return simulation.dispatchAction(actionType, nextPayload);
}

// Per-sprite visual centering/scale tweaks (only for PNG skin mode)
const SPRITE_BG_POS = {
  eevee: '50% 56%',      // center + lift for generated sheet crops
  psyduck: '50% 58%',
  squirtle: '50% 58%',
};
const SPRITE_BG_SIZE = {
  eevee: '94%',          // slightly larger so face reads better
  psyduck: '92%',
  squirtle: '92%',
};

const GENERATED_BG_ROTATION = [
  'assets/backgrounds/cats-soup/magical-forest.png',
  'assets/backgrounds/cats-soup/sunlit-forest.png',
  'assets/backgrounds/cats-soup/day-forest.png',
  'assets/backgrounds/cats-soup/enchanted-night.png',
];

// === TOAST ===
function toast(msg, dur) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; setTimeout(() => { el.style.display = 'none'; }, 300); }, dur || 2000);
}

// === CSS FLASH ANIMATION (injected once) ===
(function injectFlashStyle() {
  if (document.getElementById('hudFlashStyle')) return;
  const style = document.createElement('style');
  style.id = 'hudFlashStyle';
  style.textContent = `
    @keyframes hudFlash {
      0%   { filter: brightness(1); transform: scale(1); }
      40%  { filter: brightness(1.8); transform: scale(1.15); }
      100% { filter: brightness(1); transform: scale(1); }
    }
    .hud-flash {
      animation: hudFlash 0.45s ease-out;
    }
    .unlock-ball.filled {
      background: radial-gradient(circle at 30% 30%, #fff, var(--accent));
      box-shadow: 0 0 8px var(--accent);
    }
  `;
  document.head.appendChild(style);
})();

// === HUD AUTO-UPDATE ===
window._onStoreChange = function(key, value) {
  const elements = document.querySelectorAll('[data-store-key]');
  elements.forEach(el => {
    const k = el.getAttribute('data-store-key');
    if (k === key) {
      const valEl = el.querySelector('.hud-val') || el;
      valEl.textContent = value;
      // Flash for stat keys (hunger, happiness, affection, dirtiness)
      if (['hunger', 'happiness', 'affection', 'dirtiness'].includes(key)) {
        valEl.classList.remove('hud-flash');
        // Force reflow
        void valEl.offsetWidth;
        valEl.classList.add('hud-flash');
        clearTimeout(valEl._flashT);
        valEl._flashT = setTimeout(() => valEl.classList.remove('hud-flash'), 500);
        // Also update stat bars + quality styling
        const bar = document.getElementById('bar' + key.charAt(0).toUpperCase() + key.slice(1));
        const valSpan = document.getElementById('val' + key.charAt(0).toUpperCase() + key.slice(1));
        if (bar) bar.style.width = value + '%';
        if (valSpan) valSpan.textContent = value;
        applyStatVisual(key, Number(value || 0));
      }
    }
  });
  if (window.updateNeedAlert) window.updateNeedAlert();
  if (window.updateTeamStreak) window.updateTeamStreak();
  if (key === 'level') syncLevelBadge();
  if (key === 'unlocks') renderUnlockBalls();

  // Also update bag count badges
  const bagMap = {
    berries: 'bagCountBerries',
    toys: 'bagCountToys',
    potions: 'bagCountPotions',
    candy: 'bagCountCandy',
  };
  const badgeId = bagMap[key];
  if (badgeId) {
    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = value;
  }
};

// === SYNC ALL HUD FROM STORE INITIAL STATE ===
function syncAllHUD() {
  const elements = document.querySelectorAll('[data-store-key]');
  elements.forEach(el => {
    const key = el.getAttribute('data-store-key');
    const val = store.get(key);
    if (val !== undefined) {
      const valEl = el.querySelector('.hud-val') || el;
      valEl.textContent = val;
    }
  });
  if (window.updateNeedAlert) window.updateNeedAlert();
  if (window.updateTeamStreak) window.updateTeamStreak();
  // Sync bag count badges
  const bagItems = ['berries', 'toys', 'potions', 'candy'];
  const bagMap = {
    berries: 'bagCountBerries',
    toys: 'bagCountToys',
    potions: 'bagCountPotions',
    candy: 'bagCountCandy',
  };
  bagItems.forEach(item => {
    const badge = document.getElementById(bagMap[item]);
    if (badge) badge.textContent = store.get(item) || 0;
  });

  ['hunger', 'happiness', 'affection', 'dirtiness'].forEach((k) => {
    applyStatVisual(k, Number(store.get(k) || 0));
  });
  syncLevelBadge();
  renderUnlockBalls();
}

function syncLevelBadge() {
  const badge = document.getElementById('hudLevelBadge');
  if (!badge) return;
  const level = Number(store.get('level') || 1);
  badge.textContent = `Lv.${level}`;
}

function renderUnlockBalls() {
  const container = document.getElementById('unlockBalls');
  if (!container) return;
  const balls = container.querySelectorAll('.unlock-ball');
  const unlocks = store.get('unlocks') || [];
  const count = Math.min(unlocks.length, balls.length);
  balls.forEach((ball, i) => {
    ball.classList.toggle('filled', i < count);
  });
}

function applyStatVisual(key, value) {
  const suffix = key.charAt(0).toUpperCase() + key.slice(1);
  const bar = document.getElementById('bar' + suffix);
  const val = document.getElementById('val' + suffix);
  if (!bar || !val) return;

  const isDirtiness = key === 'dirtiness';
  let grad = 'linear-gradient(90deg, #22c55e, #4ade80)';
  let color = '#86efac';
  if (isDirtiness) {
    // dirtiness is inverted: high = bad, low = good
    if (value > 60)      { grad = 'linear-gradient(90deg, #dc2626, #f87171)'; color = '#fca5a5'; }
    else if (value > 30) { grad = 'linear-gradient(90deg, #d97706, #facc15)'; color = '#fde68a'; }
  } else {
    if (value <= 30)      { grad = 'linear-gradient(90deg, #dc2626, #f87171)'; color = '#fca5a5'; }
    else if (value <= 60) { grad = 'linear-gradient(90deg, #d97706, #facc15)'; color = '#fde68a'; }
  }

  bar.style.background = grad;
  bar.classList.add('shimmer');
  val.style.color = color;

  const row = val.closest('.stat-row');
  if (row) row.classList.toggle('low', (isDirtiness ? value > 60 : value <= 30));
}

// === WRAPPER ===
try {
  console.log('Pokégatchi — initializing...');
  init();
  console.log('Pokégatchi — initialized OK');
} catch (e) {
  console.error('Pokégatchi init failed:', e.message, e.stack);
}

function init() {
  sceneMan = new SceneManager('pet3dContainer');
  sceneMan.init();
  window.__sceneMan = sceneMan; // debug hook for runtime animation verification

  exprOverlay = new ExpressionOverlay('expressionCanvas');

  // Start render loop
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); // cap to avoid spiral
    sceneMan.update(dt);
  }
  loop();

  eventBus.subscribe('gameplay.event', (evt) => {
    const info = evt.payload || {};
    const journal = info.journal;
    if (journal) {
      store.logEvent(journal.type, journal.label, journal.icon);
      _pgRenderJournal();
    }

    const ui = info.ui || {};
    if (ui.toast) toast(ui.toast);
    if (info.animation && currentSpecies) {
      playAnimation(info.animation);
    }

    const outcome = info?.pgpEvent?.outcome;
    if (outcome) {
      window.triggerPgpOutcomeAnim(outcome);
      return;
    }

    if (ui.sceneFx === 'catch' && _pgScreenEffectsAllowed()) window.triggerCatchAnim();
    if (ui.sceneFx === 'spin' && _pgScreenEffectsAllowed()) window.triggerSpinAnim();
  });

  eventBus.subscribe('gameplay.error', (evt) => {
    const msg = evt?.payload?.message || 'Gameplay error';
    toast(`⚠ ${msg}`, 2500);
  });

  eventBus.subscribe('unlock.awarded', (evt) => {
    const u = evt.payload || {};
    toast(`🔓 Unlocked: ${u.name || u.id}`);
    store.logEvent('unlock', `Unlocked ${u.name || u.id}`, '🔓');
    _pgRenderJournal();
  });

  eventBus.subscribe('gameplay.level_up', (evt) => {
    const info = evt.payload || {};
    toast(`⬆️ Level ${info.to}!`);
    store.logEvent('level', `Level ${info.to}`, '⬆️');
    _pgRenderJournal();
  });

  eventBus.subscribe(BAG_GAME_EVENTS.OVERFLOW_CREATED, (evt) => {
    const n = Number(evt?.payload?.overflowCount || 0);
    if (n > 0) toast(`🎒 Overflow: ${n}`);
  });

  // Sync all HUD elements from initial store state
  syncAllHUD();
  bagMachine.start();
  window._onBagStateChange = function(bagState) {
    const map = {
      berries: 'bagCountBerries',
      toys: 'bagCountToys',
      potions: 'bagCountPotions',
      candy: 'bagCountCandy',
    };
    Object.entries(map).forEach(([key, id]) => {
      const badge = document.getElementById(id);
      if (badge) badge.textContent = Number(bagState?.inventory?.[key] || 0);
    });
  };
  simulation.start();

  const currentTeam = localStorage.getItem('pg_team') || 'mystic';
  setTeamTheme(currentTeam, true);
  setGeneratedBackgroundByTime();
  // NOTE: default species loaded below after all window exports are defined
}

function setGeneratedBackgroundByTime() {
  const sky = document.getElementById('skyLayer');
  if (!sky) return;
  const hr = new Date().getHours();
  let idx = 0;
  if (hr >= 6 && hr < 11) idx = 1;        // sunlit
  else if (hr >= 11 && hr < 17) idx = 2;  // day
  else if (hr >= 17 && hr < 21) idx = 0;  // magical dusk
  else idx = 3;                           // enchanted night
  const bg = GENERATED_BG_ROTATION[idx];
  sky.style.backgroundImage = `linear-gradient(180deg, rgba(20,16,42,0.16) 0%, rgba(20,16,42,0.28) 58%, rgba(20,16,42,0.34) 100%), url('${bg}')`;
  sky.style.backgroundSize = 'cover';
  sky.style.backgroundPosition = 'center center';
}
window.setGeneratedBackgroundByTime = setGeneratedBackgroundByTime;

function teamMeta(team) {
  const map = {
    valor: { name: 'Valor', dot: '🔴' },
    mystic: { name: 'Mystic', dot: '🔵' },
    instinct: { name: 'Instinct', dot: '🟡' },
  };
  return map[team] || map.mystic;
}

window.updateTeamStreak = function() {
  const streakEl = document.getElementById('streakVal');
  if (!streakEl) return;
  const catches = store.state.pokemonCaught || 0;
  const spins = store.state.pokestopSpins || 0;
  streakEl.textContent = Math.max(1, Math.floor((catches + spins) / 4));
};

function setTeamTheme(team, silent) {
  const t = ['valor','mystic','instinct'].includes(team) ? team : 'mystic';
  document.body.setAttribute('data-team', t);
  localStorage.setItem('pg_team', t);

  const meta = teamMeta(t);
  const dot = document.getElementById('teamDot');
  const name = document.getElementById('teamNameTxt');
  const bag = document.getElementById('quickBagBtn');
  const balls = document.querySelectorAll('.unlock-ball');
  if (dot) dot.textContent = meta.dot;
  if (name) name.textContent = meta.name;
  if (bag) {
    bag.classList.remove('team-valor','team-mystic','team-instinct');
    bag.classList.add(`team-${t}`);
  }
  balls.forEach(b => {
    b.classList.remove('team-valor','team-mystic','team-instinct');
    b.classList.add(`team-${t}`);
  });
  if (!silent) toast(`🎨 Team set to ${meta.name}`);
}
window.setTeamTheme = setTeamTheme;

window.updateNeedAlert = function() {
  const el = document.getElementById('hudNeedAlert');
  if (!el) return;
  const hungry = (store.state.hunger || 0) < 40;
  const sad   = (store.state.happiness || 0) < 40;
  const dirty = (store.state.dirtiness || 0) > 60;
  const need = hungry || sad || dirty;

  if (need) {
    el.classList.add('active');
    if (hungry)        { el.textContent = '🍽️'; el.title = 'Hungry'; }
    else if (sad)      { el.textContent = '😢'; el.title = 'Sad'; }
    else if (dirty)    { el.textContent = '🛁'; el.title = 'Dirty'; }
    if (_pgVibrateAllowed && _pgVibrateAllowed() && navigator.vibrate) {
      try { navigator.vibrate([80, 50, 80]); } catch(_) {}
    }
  } else {
    el.classList.remove('active');
    el.textContent = '✅';
    el.title = 'All good';
  }
};

function setLauncherState(open) {
  const menu = document.getElementById('quickMenu');
  const launcher = document.getElementById('pokeballLauncher');
  const balls = document.getElementById('unlockBalls');
  if (!menu || !launcher || !balls) return;
  menu.classList.toggle('open', open);
  launcher.classList.toggle('open', open);
  balls.classList.toggle('minimized', open);
  menu.setAttribute('aria-hidden', open ? 'false' : 'true');
}

window.toggleQuickMenu = function() {
  const menu = document.getElementById('quickMenu');
  if (!menu) return;
  const nextOpen = !menu.classList.contains('open');
  setLauncherState(nextOpen);
};

window.openPokedexFromMenu = function() {
  setLauncherState(false);
  const picker = document.getElementById('pickerGrid');
  if (picker) picker.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('📱 Pokédex opened');
};

window.openBagFromMenu = function() {
  setLauncherState(false);
  window.openBag(true);
};

// === ALL WINDOW EXPORTS (defined BEFORE init runs) ===
window.selectSpecies = function(species) {
  currentSpecies = species;
  store.set('current', species);

  // Update UI
  document.getElementById('petName').textContent = species.charAt(0).toUpperCase() + species.slice(1);
  document.getElementById('petSpecies').textContent = `Showing ${species}`;
  // petNameDisplay is an alias for petName (same element)
  const petNameDisplay = document.getElementById('petName');
  if (petNameDisplay) petNameDisplay.textContent = species.charAt(0).toUpperCase() + species.slice(1);

  // Highlight picker button
  document.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.pick-btn[data-species="${species}"]`);
  if (btn) btn.classList.add('active');

  const exprCanvas = document.getElementById('expressionCanvas');

  // Load V2 model from local assets/models_v2 OR sprite fallback from assets/sprites/generated
  const modelOrSprite = V2_MODELS[species];
  if (modelOrSprite) {
    try {
      if (modelOrSprite.endsWith('.png')) {
        const spritePath = modelOrSprite.includes('/') ? modelOrSprite : `assets/sprites/generated/${modelOrSprite}`;
        sceneMan.showSpriteOnly(spritePath);
        const c = document.getElementById('pet3dContainer');
        if (c) {
          c.dataset.skin = species;
          c.style.setProperty('background-position', SPRITE_BG_POS[species] || '50% 60%', 'important');
          c.style.setProperty('background-size', SPRITE_BG_SIZE[species] || '92%', 'important');
        }
        if (exprCanvas) exprCanvas.style.opacity = '1';
        toast(`✨ Loaded ${species} skin`);
      } else {
        sceneMan.init(); // ensure 3D renderer exists in case we switched from sprite mode
        const c = document.getElementById('pet3dContainer');
        if (c) {
          c.dataset.skin = '';
          c.style.backgroundImage = 'none';
          c.style.setProperty('background-position', '50% 55%', 'important'); // reset default for 3D mode
          c.style.setProperty('background-size', 'contain', 'important');
        }
        // Pikachu 3D polish lane: hide 2D expression overlay for cleaner 3D presentation
        if (exprCanvas) exprCanvas.style.opacity = species === 'pikachu' ? '0' : '1';
        sceneMan.loadV2Model(modelOrSprite);
        toast(`✨ Loading ${species}...`);
      }
    } catch (e) {
      console.error('Failed to load model/skin:', e);
      toast(`⚠ Failed to load ${species}`, 3000);
    }
  } else {
    toast(`⚠ No model for ${species}`, 3000);
  }

  // Face data for expression overlay
  const fd = FACE_DATA[species];
  if (fd && species !== 'pikachu') {
    try {
      exprOverlay._getFaceData = () => fd;
      exprOverlay.start(species, 0);
    } catch (e) {
      console.error('Failed to start expression overlay:', e);
    }
  } else {
    try { exprOverlay.stop(); } catch (_) {}
  }

  _pgApplyModeUI();
};

// === ANIMATION ACTIONS (stat-modifying) ===
function playAnimation(name) {
  if (!currentSpecies) return false;
  sceneMan.playAnimation(name);
  return true;
}

window.feed = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation(ANIMS.FEED);
  const wrap = document.getElementById('petWrap');
  if (wrap) { wrap.classList.add('wiggle'); setTimeout(() => wrap.classList.remove('wiggle'), 350); }
  if (currentSpecies !== 'pikachu') {
    _spawnGeneratedFx(_getActionFrames('feed'), { label: '🍽 Feed', size: 72, duration: 900, radius: 36, action: 'feed', heroSize: 136 });
    exprOverlay.showTempMood(0, 2); // happy
  }
  dispatchGameplay('feed', { animation: ANIMS.FEED });
};

window.petAction = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation(ANIMS.PET);
  const wrap = document.getElementById('petWrap');
  if (wrap) { wrap.classList.add('sparkle'); setTimeout(() => wrap.classList.remove('sparkle'), 650); }
  if (currentSpecies !== 'pikachu') {
    _spawnGeneratedFx(_getActionFrames('pet'), { label: '🫳 Pet', size: 68, duration: 980, radius: 44, action: 'pet', heroSize: 138 });
    exprOverlay.showTempMood(0, 1.5); // happy
  }
  dispatchGameplay('pet', { animation: ANIMS.PET });
};

window.healPet = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation(ANIMS.HEAL);
  const wrap = document.getElementById('petWrap');
  if (wrap) { wrap.classList.add('celebrate'); setTimeout(() => wrap.classList.remove('celebrate'), 850); }
  if (currentSpecies !== 'pikachu') {
    _spawnGeneratedFx(_getActionFrames('heal'), { label: '💊 Heal', size: 74, duration: 1100, radius: 52, action: 'heal', heroSize: 142 });
    exprOverlay.showTempMood(4, 2); // excited
  }
  dispatchGameplay('heal', { animation: ANIMS.HEAL });
};

window.cleanPet = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation(ANIMS.BOUNCE);
  const wrap = document.getElementById('petWrap');
  if (wrap) { wrap.classList.add('sparkle'); setTimeout(() => wrap.classList.remove('sparkle'), 650); }
  if (currentSpecies !== 'pikachu') {
    _spawnGeneratedFx(_getActionFrames('heal'), { label: '🛁 Bath', size: 74, duration: 1000, radius: 48, action: 'heal', heroSize: 140 });
    exprOverlay.showTempMood(4, 1.8); // excited
  }
  dispatchGameplay('clean', { animation: ANIMS.HEAL });
};

window.bounce = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation(ANIMS.BOUNCE);
  const wrap = document.getElementById('petWrap');
  if (wrap) { wrap.classList.add('bounce'); setTimeout(() => wrap.classList.remove('bounce'), 450); }
  if (currentSpecies !== 'pikachu') {
    _spawnGeneratedFx(_getActionFrames('bounce'), { label: '🌟 Bounce', size: 70, duration: 850, radius: 40, action: 'bounce', heroSize: 140 });
    exprOverlay.showTempMood(4, 1.5); // excited
  }
  dispatchGameplay('bounce', { animation: ANIMS.BOUNCE });
};

window.emoteEat = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation(ANIMS.EAT); // true model animation (bones/tween), not face overlay
  toast(`🍽️ ${currentSpecies.charAt(0).toUpperCase() + currentSpecies.slice(1)} eating emote`);
};

window.emoteWave = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  if (currentSpecies !== 'pikachu') return toast('👋 Wave polish is currently Pikachu-only');
  playAnimation(ANIMS.WAVE); // true model animation (bones/tween), not face overlay
  toast('👋 Pikachu wave emote');
};

window.emoteSad = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  if (currentSpecies !== 'pikachu') return toast('😢 Sad polish is currently Pikachu-only');
  playAnimation(ANIMS.SAD);
  toast('😢 Pikachu sad emote');
};

window.emoteRun = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  if (currentSpecies !== 'pikachu') return toast('🏃 Run polish is currently Pikachu-only');
  playAnimation(ANIMS.RUN);
  toast('🏃 Pikachu running in place');
};

window.emotePlay = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  if (currentSpecies !== 'pikachu') return toast('🎾 Play polish is currently Pikachu-only');
  playAnimation(ANIMS.PLAY);
  toast('🎾 Pikachu play emote');
};

window.emoteHappy = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  if (currentSpecies !== 'pikachu') return toast('😄 Happy polish is currently Pikachu-only');
  playAnimation('celebrate');
  toast('😄 Pikachu happy emote');
};

// === BAG SYSTEM ===
window.openBag = function(forceOpen) {
  // Collapse demo section if open
  const demoSection = document.getElementById('demoSection');
  if (demoSection && demoSection.classList.contains('open')) {
    demoSection.classList.remove('open');
    const demoChevron = demoSection.querySelector('.collapsible-chevron');
    if (demoChevron) demoChevron.textContent = '▶';
  }

  const bagSection = document.getElementById('bagSection');
  if (!bagSection) return;
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !bagSection.classList.contains('open');
  bagSection.classList.toggle('open', shouldOpen);
  const chevron = bagSection.querySelector('.collapsible-chevron');
  if (chevron) chevron.textContent = bagSection.classList.contains('open') ? '▼' : '▶';

  if (shouldOpen) bagMachine.dispatch(BAG_UI_EVENTS.OPEN_REQUEST, {});
  else bagMachine.dispatch(BAG_UI_EVENTS.CLOSE_REQUEST, {});

  // Sync bag counts on open from bag machine state
  const bagItems = ['berries', 'toys', 'potions', 'candy'];
  const bagMap = {
    berries: 'bagCountBerries',
    toys: 'bagCountToys',
    potions: 'bagCountPotions',
    candy: 'bagCountCandy',
  };
  const bagState = bagMachine.getState();
  bagItems.forEach(item => {
    const badge = document.getElementById(bagMap[item]);
    if (badge) badge.textContent = Number(bagState?.inventory?.[item] || store.get(item) || 0);
  });

  if (bagSection.classList.contains('open')) {
    bagSection.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    bagSection.style.transform = 'scale(1.02)';
    setTimeout(() => { bagSection.style.transform = 'scale(1)'; }, 150);
  }
};

window.useItem = function(itemName) {
  if (!currentSpecies) return toast('Pick a Pokémon first!');

  const preState = bagMachine.getState();
  const priorError = preState?.ui?.error || null;

  bagMachine.dispatch(BAG_UI_EVENTS.ITEM_USE_REQUEST, { itemName });
  const bagState = bagMachine.getState();
  if (bagState?.ui?.error && bagState.ui.error !== priorError) return toast(`⚠ ${bagState.ui.error}`, 2200);

  const count = store.get(itemName) || 0;
  if (count < 1) return toast('❌ No ' + itemName + ' left!', 2500);

  const animMap = {
    berries: ANIMS.FEED,
    toys: ANIMS.BOUNCE,
    potions: ANIMS.HEAL,
    candy: ANIMS.FEED,
  };

  const anim = animMap[itemName];
  if (anim) playAnimation(anim);
  if (itemName === 'candy' && exprOverlay) {
    exprOverlay.showTempMood(4, 1.5); // excited special animation
  }

  const pendingIds = Object.keys(bagState?.pendingTx || {});
  const txId = pendingIds[pendingIds.length - 1];
  dispatchGameplay('use_item', { itemName, animation: anim, txId });
};

// === DEMO BOOST (generic dispatcher for HTML onclick) ===
window.demoBoost = function(type, value) {
  switch (type) {
    case 'hunger':
      window.demoBoostHunger();
      break;
    case 'happiness':
      window.demoBoostHappiness();
      break;
    case 'affection':
      window.demoBoostAffection();
      break;
    case 'steps':
      window.demoBoostSteps();
      break;
    case 'caught':
      window.demoBoostCaught();
      break;
    case 'spin':
      window.demoBoostSpin();
      break;
    case 'berry':
      window.demoAddBerry();
      break;
    case 'toy':
      window.demoAddToy();
      break;
    case 'potion':
      window.demoAddPotion();
      break;
    default:
      toast('⚠ Unknown demo type: ' + type, 2500);
  }
};

// === DEMO BOOST (individual functions) ===
window.demoBoostHunger = function() {
  store.addStat('hunger', 10);
  toast('⚡ Demo boost: +10 hunger');
};

window.demoBoostHappiness = function() {
  store.addStat('happiness', 10);
  toast('⚡ Demo boost: +10 happiness');
};

window.demoBoostAffection = function() {
  store.addStat('affection', 10);
  toast('⚡ Demo boost: +10 affection');
};

window.demoBoostSteps = function() {
  store.addHud('steps', 100);
  toast('⚡ Demo boost: +100 steps');
};

window.demoBoostCaught = function() {
  if (_pgIsModePgp()) {
    return window.pgpSample('catch_success');
  }
  dispatchGameplay('catch_success', { source: 'demo', animation: ANIMS.BOUNCE });
};

window.demoBoostSpin = function() {
  if (_pgIsModePgp()) {
    return window.pgpSample('spin_success');
  }
  dispatchGameplay('spin_success', { source: 'demo', animation: ANIMS.BOUNCE });
};

window.demoAddBerry = function() {
  store.addItem('berries', 1);
  toast('⚡ Demo boost: +1 Berry');
};

window.demoAddToy = function() {
  store.addItem('toys', 1);
  toast('⚡ Demo boost: +1 Toy');
};

window.demoAddPotion = function() {
  store.addItem('potions', 1);
  toast('⚡ Demo boost: +1 Potion');
};

// === COLLAPSIBLE SECTIONS ===
window.toggleBag = function() {
  const bagSection = document.getElementById('bagSection');
  if (!bagSection) return;
  bagSection.classList.toggle('open');
  const chevron = bagSection.querySelector('.collapsible-chevron');
  if (chevron) chevron.textContent = bagSection.classList.contains('open') ? '▼' : '▶';
};

window.toggleDemo = function() {
  const demoSection = document.getElementById('demoSection');
  if (!demoSection) return;
  demoSection.classList.toggle('open');
  const chevron = demoSection.querySelector('.collapsible-chevron');
  if (chevron) chevron.textContent = demoSection.classList.contains('open') ? '▼' : '▶';
};

// === DEBUG OVERLAY ===
window.toggleDebugOverlay = function() {
  if (!exprOverlay) return;
  const on = exprOverlay.toggleDebug();
  const btn = document.getElementById('debugToggle');
  if (btn) {
    btn.textContent = on ? '🔍 ON' : '🔍';
    btn.style.background = on ? 'var(--accent)' : 'var(--accent-dim)';
  }
  toast(on ? '🔍 Debug ON' : '🔍 Debug OFF');
};

// =====================================================================
// === FEATURE 1: CATCH & SPIN CELEBRATION OVERLAYS ====================
// =====================================================================
const PGP_VFX_BUCKETS = Object.freeze({
  catch_success: [
    'assets/vfx/pgp/catch/success/catch_success_set_b_transparent.png',
    'assets/vfx/pgp/catch/success/catch_success_set_a_alpha.png',
  ],
  catch_fail: [
    'assets/vfx/pgp/catch/fail/catch_fail_set_b_transparent.png',
    'assets/vfx/pgp/catch/fail/catch_fail_set_a_alpha.png',
  ],
  spin_success: [
    'assets/vfx/pgp/spin/success/pokestop_spin_outcomes_set_b_transparent.png',
    'assets/vfx/pgp/spin/success/pokestop_spin_outcomes_set_a_alpha.png',
  ],
  spin_fail: [
    'assets/vfx/pgp/spin/fail/pokestop_spin_outcomes_set_b_transparent.png',
    'assets/vfx/pgp/spin/fail/pokestop_spin_outcomes_set_a_alpha.png',
  ],
});

function _pickPgpVfxBucket(outcome) {
  return PGP_VFX_BUCKETS[outcome] || PGP_VFX_BUCKETS.spin_fail;
}


const ACTION_FRAMESETS = {
  squirtle: {
    feed: ['assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f01.png','assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f02.png','assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f03.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f01.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f01.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f02.png'],
    pet: ['assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f04.png','assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f05.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f02.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f03.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f01.png'],
    heal: ['assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f06.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f04.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f05.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f02.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f03.png'],
    bounce: ['assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f03.png','assets/sprites/generated/squirtle_skin_v1_alpha/squirtle_skin_v1_alpha_f05.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f03.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f04.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f05.png'],
  },
  eevee: {
    feed: ['assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f01.png','assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f02.png','assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f03.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f02.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f01.png'],
    pet: ['assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f04.png','assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f05.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f03.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f01.png'],
    heal: ['assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f06.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f04.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f05.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f02.png'],
    bounce: ['assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f03.png','assets/sprites/generated/eevee_skin_v2_compact_alpha/eevee_skin_v2_compact_alpha_f05.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f03.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f06.png'],
  },
  pikachu: {
    feed: ['assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f01.png','assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f02.png','assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f03.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f02.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f01.png'],
    pet: ['assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f04.png','assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f05.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f03.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f01.png'],
    heal: ['assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f06.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f04.png','assets/vfx/generated/catch_success_set_a_alpha/catch_success_set_a_alpha_f06.png','assets/vfx/generated/catch_fail_set_a_alpha/catch_fail_set_a_alpha_f04.png'],
    bounce: ['assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f03.png','assets/sprites/generated/pikachu_skin_v1_alpha/pikachu_skin_v1_alpha_f05.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f04.png','assets/vfx/generated/pokestop_spin_outcomes_set_a_alpha/pokestop_spin_outcomes_set_a_alpha_f06.png'],
  },
};

function _getActionFrames(action) {
  const speciesKey = ACTION_FRAMESETS[currentSpecies] ? currentSpecies : 'squirtle';
  return ACTION_FRAMESETS[speciesKey][action] || ACTION_FRAMESETS.squirtle[action] || [];
}

function _spawnGeneratedFx(images, options = {}) {
  if (!_pgScreenEffectsAllowed()) return;
  const wrap = document.querySelector('.pet-canvas-wrap');
  if (!wrap || !images || images.length === 0) return;
  const rect = wrap.getBoundingClientRect();
  const ov = document.createElement('div');
  ov.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:11;overflow:visible;border-radius:50%;`;
  document.body.appendChild(ov);

  const primary = images[0];
  const fx = images.slice(1);

  if (primary) {
    const hero = document.createElement('img');
    hero.src = primary;
    hero.style.cssText = `position:absolute;left:50%;top:50%;width:${options.heroSize || 134}px;height:${options.heroSize || 134}px;object-fit:contain;transform:translate(-50%,-50%);opacity:0;filter:drop-shadow(0 10px 16px rgba(0,0,0,.32));z-index:3;`;
    ov.appendChild(hero);
    const action = options.action || 'default';
    let heroFrames;
    if (action === 'feed') {
      heroFrames = [
        { transform: 'translate(-50%,-50%) scale(0.92) rotate(0deg)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.02) rotate(-4deg)', opacity: 1, offset: 0.35 },
        { transform: 'translate(-50%,-50%) scale(1.01) rotate(3deg)', opacity: 1, offset: 0.68 },
        { transform: 'translate(-50%,-50%) scale(1.00) rotate(0deg)', opacity: 0 }
      ];
    } else if (action === 'pet') {
      heroFrames = [
        { transform: 'translate(-50%,-50%) translateY(0) scale(0.96)', opacity: 0 },
        { transform: 'translate(-50%,-50%) translateY(-8px) scale(1.04)', opacity: 1, offset: 0.45 },
        { transform: 'translate(-50%,-50%) translateY(-2px) scale(1.02)', opacity: 1, offset: 0.75 },
        { transform: 'translate(-50%,-50%) translateY(0) scale(1.00)', opacity: 0 }
      ];
    } else if (action === 'heal') {
      heroFrames = [
        { transform: 'translate(-50%,-50%) scale(0.86)', opacity: 0, filter: 'brightness(1)' },
        { transform: 'translate(-50%,-50%) scale(1.08)', opacity: 1, offset: 0.38, filter: 'brightness(1.35)' },
        { transform: 'translate(-50%,-50%) scale(1.02)', opacity: 1, offset: 0.72, filter: 'brightness(1.15)' },
        { transform: 'translate(-50%,-50%) scale(1.00)', opacity: 0, filter: 'brightness(1)' }
      ];
    } else if (action === 'bounce') {
      heroFrames = [
        { transform: 'translate(-50%,-50%) translateY(0) scale(0.94)', opacity: 0 },
        { transform: 'translate(-50%,-50%) translateY(-34px) scale(1.08)', opacity: 1, offset: 0.30 },
        { transform: 'translate(-50%,-50%) translateY(2px) scale(0.98)', opacity: 1, offset: 0.58 },
        { transform: 'translate(-50%,-50%) translateY(-16px) scale(1.03)', opacity: 1, offset: 0.8 },
        { transform: 'translate(-50%,-50%) translateY(0) scale(1.00)', opacity: 0 }
      ];
    } else {
      heroFrames = [
        { transform: 'translate(-50%,-50%) scale(0.3)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.45 },
        { transform: 'translate(-50%,-50%) scale(0.6)', opacity: 0 }
      ];
    }
    hero.animate(heroFrames, { duration: Math.max(700, (options.duration || 1000) - 120), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  }

  const emit = fx.length ? fx : [primary].filter(Boolean);
  emit.forEach((src, i) => {
    const img = document.createElement('img');
    const baseAng = (i / Math.max(emit.length,1)) * Math.PI * 2;
    const ang = baseAng + (Math.random() * 0.35 - 0.175);
    const r = (options.radius || 42) + i * 10 + Math.random() * 8;
    const tx = Math.round(Math.cos(ang) * r);
    const ty = Math.round(Math.sin(ang) * r - (options.action === 'feed' ? 24 : options.action === 'heal' ? 46 : 18));
    const size = (options.size || 64) - Math.min(20, i * 4);
    img.src = src;
    img.style.cssText = `position:absolute;left:50%;top:50%;width:${Math.max(20,size)}px;height:${Math.max(20,size)}px;object-fit:contain;transform:translate(-50%,-50%);filter:drop-shadow(0 0 10px rgba(255,255,255,.4));opacity:0;z-index:5;`;
    ov.appendChild(img);
    const rot = (i % 2 ? 1 : -1) * (18 + Math.random() * 18);
    img.animate([
      { transform: 'translate(-50%,-50%) scale(0.3) rotate(0deg)', opacity: 0 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1) rotate(${rot * 0.4}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${Math.round(tx*1.25)}px), calc(-50% + ${Math.round(ty*1.25)}px)) scale(0.55) rotate(${rot}deg)`, opacity: 0 }
    ], { duration: options.duration || 1100, delay: i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  });

  const label = document.createElement('div');
  label.textContent = options.label || '✨';
  label.style.cssText = `position:absolute;left:50%;bottom:16%;transform:translateX(-50%);font-size:.95rem;font-weight:900;color:#fff;text-shadow:0 0 10px rgba(255,255,255,.7),0 2px 4px rgba(0,0,0,.8);`;
  ov.appendChild(label);
  label.animate([
    { transform: 'translateX(-50%) translateY(10px)', opacity: 0 },
    { transform: 'translateX(-50%) translateY(-8px)', opacity: 1, offset: 0.5 },
    { transform: 'translateX(-50%) translateY(-30px)', opacity: 0 }
  ], { duration: 1000, easing: 'ease-out', fill: 'forwards' });

  setTimeout(() => ov.remove(), (options.duration || 1100) + 500 + images.length * 60);
}

// Inject CSS keyframes for catch + spin animations
(function injectAnimStyles() {
  if (document.getElementById('pgAnimStyles')) return;
  const s = document.createElement('style');
  s.id = 'pgAnimStyles';
  s.textContent = `
    @keyframes pgBallBurst {
      0%   { transform: translate(-50%,-50%) translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(-50%,-50%) translate(var(--tx),var(--ty)) scale(0.3); opacity: 0; }
    }
    @keyframes pgSparkleUp {
      0%   { transform: translate(var(--sx),var(--sy)) scale(1); opacity: 1; }
      100% { transform: translate(var(--ex),var(--ey)) scale(0); opacity: 0; }
    }
    @keyframes pgCaughtText {
      0%   { transform: translateX(-50%) translateY(0); opacity: 1; }
      60%  { transform: translateX(-50%) translateY(-40px); opacity: 1; }
      100% { transform: translateX(-50%) translateY(-60px); opacity: 0; }
    }
    @keyframes pgCanvasFlash {
      0%   { opacity: 0.85; }
      50%  { opacity: 0.4; }
      100% { opacity: 0; }
    }
    @keyframes pgDiamondSpin {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes pgItemPop {
      0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0; }
      30%  { transform: translate(-50%,-50%) scale(1.3); opacity: 1; }
      70%  { transform: translate(-30%,-80%) scale(1); opacity: 1; }
      100% { transform: translate(20%,-120%) scale(0.7); opacity: 0; }
    }
    @keyframes pgRingPulse {
      0%   { opacity: 0.9; transform: translate(-50%,-50%) scale(0.5); }
      60%  { opacity: 0.5; transform: translate(-50%,-50%) scale(1.05); }
      100% { opacity: 0;   transform: translate(-50%,-50%) scale(1.35); }
    }
  `;
  document.head.appendChild(s);
})();

window.triggerPgpOutcomeAnim = function(outcome) {
  if (!_pgScreenEffectsAllowed()) return;
  const key = PGP_ACTION_TO_OUTCOME[outcome] ? outcome : String(outcome || '');
  if (!PGP_VFX_BUCKETS[key]) return;

  if (key === 'catch_success') return window.triggerCatchAnim();
  if (key === 'spin_success') return window.triggerSpinAnim();

  if (key === 'catch_fail') {
    _spawnGeneratedFx(_pickPgpVfxBucket('catch_fail'), {
      label: '❌ Catch failed', size: 80, duration: 900, radius: 44, heroSize: 118, action: 'default'
    });
    return;
  }

  if (key === 'spin_fail') {
    _spawnGeneratedFx(_pickPgpVfxBucket('spin_fail'), {
      label: '⛔ Spin failed', size: 78, duration: 840, radius: 42, heroSize: 110, action: 'default'
    });
  }
};

window.triggerCatchAnim = function() {
  if (!_pgScreenEffectsAllowed()) return;
  _spawnGeneratedFx(_pickPgpVfxBucket('catch_success'), { label: '✨ Caught!', size: 84, duration: 1200, radius: 56 });
  const wrap = document.querySelector('.pet-canvas-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();

  const ov = document.createElement('div');
  ov.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:10;overflow:visible;border-radius:50%;`;
  document.body.appendChild(ov);

  // Flash layer
  const flash = document.createElement('div');
  flash.style.cssText = `position:absolute;inset:0;border-radius:50%;background:white;animation:pgCanvasFlash 0.4s ease-out forwards;`;
  ov.appendChild(flash);

  // 8 Pokéball particles
  const colors = ['#E3350D','#ffffff','#E3350D','#ffffff','#E3350D','#ffffff','#E3350D','#ffffff'];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = 60 + Math.random() * 30;
    const tx = Math.round(Math.cos(angle) * dist);
    const ty = Math.round(Math.sin(angle) * dist);
    const p = document.createElement('div');
    p.style.cssText = `position:absolute;left:50%;top:50%;width:12px;height:12px;border-radius:50%;background:${colors[i]};border:2px solid ${i%2===0?'#fff':'#E3350D'};--tx:${tx}px;--ty:${ty}px;animation:pgBallBurst 0.9s ease-out ${i*0.04}s forwards;`;
    ov.appendChild(p);
  }

  // 12 green sparkles
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + 0.2;
    const s0 = 10 + Math.random() * 10, s1 = 55 + Math.random() * 40;
    const sx = Math.round(Math.cos(angle) * s0 - 2.5);
    const sy = Math.round(Math.sin(angle) * s0 - 2.5);
    const ex = Math.round(Math.cos(angle) * s1 - 2.5);
    const ey = Math.round(Math.sin(angle) * s1 - 2.5);
    const sp = document.createElement('div');
    sp.style.cssText = `position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;background:#39FF14;box-shadow:0 0 6px #39FF14;--sx:${sx}px;--sy:${sy}px;--ex:${ex}px;--ey:${ey}px;transform:translate(${sx}px,${sy}px);animation:pgSparkleUp 1s ease-out ${i*0.03}s forwards;`;
    ov.appendChild(sp);
  }

  // "✨ Caught!" text
  const txt = document.createElement('div');
  txt.textContent = '✨ Caught!';
  txt.style.cssText = `position:absolute;left:50%;bottom:20%;font-size:1rem;font-weight:900;color:#fff;text-shadow:0 0 8px #39FF14,0 2px 4px rgba(0,0,0,0.8);white-space:nowrap;pointer-events:none;animation:pgCaughtText 1s ease-out 0.1s forwards;opacity:1;`;
  ov.appendChild(txt);

  setTimeout(() => ov.remove(), 1300);
};

window.triggerSpinAnim = function() {
  if (!_pgScreenEffectsAllowed()) return;
  _spawnGeneratedFx(_pickPgpVfxBucket('spin_success'), { label: '💠 Spin!', size: 82, duration: 1000, radius: 52 });
  const wrap = document.querySelector('.pet-canvas-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();

  const ov = document.createElement('div');
  ov.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:10;overflow:visible;border-radius:50%;`;
  document.body.appendChild(ov);

  // Blue ring pulse
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;left:50%;top:50%;width:140px;height:140px;border-radius:50%;border:3px solid #60A5FA;box-shadow:0 0 12px #60A5FA;animation:pgRingPulse 0.8s ease-out forwards;`;
  ov.appendChild(ring);

  // 6 blue diamonds orbiting
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const orbit = 45;
    const startX = Math.round(Math.cos(angle) * orbit) - 5;
    const startY = Math.round(Math.sin(angle) * orbit) - 5;
    const endX   = Math.round(Math.cos(angle) * orbit * 1.9) - 5;
    const endY   = Math.round(Math.sin(angle) * orbit * 1.9) - 5;
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:50%;top:50%;width:10px;height:10px;background:#60A5FA;box-shadow:0 0 6px #3B82F6;clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);transform:translate(${startX}px,${startY}px);animation:pgDiamondSpin 0.9s ease-out ${i*0.05}s forwards;`;
    // Animate manually using extra style
    const dur = 0.9;
    const delay = i * 0.05;
    d.animate([
      { transform: `translate(${startX}px,${startY}px) rotate(0deg) scale(1)`, opacity: 1 },
      { transform: `translate(${endX}px,${endY}px) rotate(360deg) scale(0.2)`, opacity: 0 },
    ], { duration: dur * 1000, delay: delay * 1000, fill: 'forwards', easing: 'ease-out' });
    ov.appendChild(d);
  }

  // 💠 +Berry item pop
  const pop = document.createElement('div');
  pop.innerHTML = '💠 <span style="font-size:0.75rem;font-weight:800;color:#fff">+Berry</span>';
  pop.style.cssText = `position:absolute;left:50%;top:50%;font-size:1.2rem;white-space:nowrap;text-shadow:0 0 8px #60A5FA,0 2px 4px rgba(0,0,0,0.8);animation:pgItemPop 0.9s ease-out 0.1s forwards;opacity:0;`;
  ov.appendChild(pop);

  setTimeout(() => ov.remove(), 1100);
};

// =====================================================================
// === FEATURE 2: SETTINGS PANEL =======================================
// =====================================================================

function _pgSettingGet(key, def) {
  const v = localStorage.getItem(key);
  return v === null ? def : v === 'true';
}
function _pgSettingSet(key, val) {
  localStorage.setItem(key, String(val));
}
function _pgApplySetting(key, val) {
  if (key === 'pg_show_cameos') {
    document.querySelectorAll('.cameo-pkmn').forEach(el => { el.style.display = val ? '' : 'none'; });
  }
  if (key === 'pg_bone_anim') {
    window._pgBoneAnimEnabled = val;
  }
}

window.openSettings = function() {
  _pgRenderSettings();
  const p = document.getElementById('settingsPanel');
  const bd = document.getElementById('pgBackdrop');
  if (!p) return;
  p.classList.add('open');
  if (bd) bd.classList.add('open');
};
window.closeSettings = function() {
  const p = document.getElementById('settingsPanel');
  const bd = document.getElementById('pgBackdrop');
  if (p) p.classList.remove('open');
  if (bd) bd.classList.remove('open');
};

function _pgRenderSettings() {
  const body = document.getElementById('settingsBody');
  if (!body) return;

  const settings = [
    { group: '🔊 Sound', items: [
      { key: 'pg_sound',       label: 'Master Sound',  def: true },
      { key: 'pg_sound_catch', label: 'Catch Sound',   def: true },
      { key: 'pg_sound_spin',  label: 'Spin Sound',    def: true },
    ]},
    { group: '🎮 Game', items: [
      { key: 'pg_mode_pgp',          label: 'PGP Mode',          def: false },
      { key: 'pg_watch_sleep',       label: 'Watch Sleep',       def: false },
      { key: 'pg_auto_catch',        label: 'Auto Catch',        def: true },
      { key: 'pg_auto_spin',         label: 'Auto Spin',         def: true },
      { key: 'pg_vibrate',           label: 'Vibrate Alerts',    def: true },
      { key: 'pg_screen_effects',    label: 'Screen Effects',    def: true },
      { key: 'pg_show_cameos',       label: 'Show Cameos',       def: true },
      { key: 'pg_bone_anim',         label: 'Bone Animations',   def: true },
    ]},
  ];

  let html = `<div class="pg-settings-section">
    <div class="pg-settings-section-title">🎨 Team</div>
    <button class="pg-settings-team-btn" onclick="window.closeSettings();const to=document.getElementById('teamOverlay');if(to)to.style.display='flex';">Change Team</button>
  </div>`;

  settings.forEach(({ group, items }) => {
    html += `<div class="pg-settings-section"><div class="pg-settings-section-title">${group}</div>`;
    items.forEach(({ key, label, def }) => {
      const on = _pgSettingGet(key, def);
      html += `<label class="pg-toggle-row">
        <span class="pg-toggle-label">${label}</span>
        <span class="pg-toggle-wrap">
          <input type="checkbox" class="pg-toggle-inp" data-key="${key}" ${on?'checked':''} onchange="window._pgToggleChange(this)">
          <span class="pg-toggle-pill"></span>
        </span>
      </label>`;
    });
    html += `</div>`;
  });

  html += `<div class="pg-settings-section">
    <div class="pg-settings-section-title">📊 Stats Reset</div>
    <button class="pg-reset-btn" id="pgResetBtn"
      onmousedown="window._pgResetHold(this)" onmouseup="window._pgResetCancel()" onmouseleave="window._pgResetCancel()"
      ontouchstart="window._pgResetHold(this)" ontouchend="window._pgResetCancel()">
      🗑 Reset Progress (hold 3s)
    </button>
  </div>`;

  body.innerHTML = html;
  ['pg_show_cameos','pg_bone_anim'].forEach(k => _pgApplySetting(k, _pgSettingGet(k, true)));
}

window._pgToggleChange = function(inp) {
  const key = inp.dataset.key;
  _pgSettingSet(key, inp.checked);
  _pgApplySetting(key, inp.checked);
  if (key === 'pg_mode_pgp' || key === 'pg_watch_sleep' || key === 'pg_screen_effects') {
    _pgApplyModeUI();
  }
};

let _pgResetTimer = null;
window._pgResetHold = function(btn) {
  let elapsed = 0;
  btn.textContent = '🗑 Hold... 3.0s';
  _pgResetTimer = setInterval(() => {
    elapsed += 0.1;
    const left = Math.max(0, 3 - elapsed).toFixed(1);
    btn.textContent = `🗑 Hold... ${left}s`;
    if (elapsed >= 3) {
      clearInterval(_pgResetTimer); _pgResetTimer = null;
      store.replaceState(DEFAULT_STATE);
      syncAllHUD();
      window.closeSettings();
      toast('🗑 Progress reset!', 2500);
    }
  }, 100);
};
window._pgResetCancel = function() {
  if (_pgResetTimer) { clearInterval(_pgResetTimer); _pgResetTimer = null; }
  const btn = document.getElementById('pgResetBtn');
  if (btn) btn.textContent = '🗑 Reset Progress (hold 3s)';
};

// _journalTab is now declared at module top (before init()) to avoid TDZ

window.openJournal = function() {
  _journalTab = 'log';
  _pgRenderJournal();
  setLauncherState(false);
  const p = document.getElementById('journalPanel');
  const bd = document.getElementById('pgBackdrop');
  if (!p) return;
  p.classList.add('open');
  if (bd) bd.classList.add('open');
};
window.closeJournal = function() {
  const p = document.getElementById('journalPanel');
  const bd = document.getElementById('pgBackdrop');
  if (p) p.classList.remove('open');
  if (bd) bd.classList.remove('open');
};
window.clearJournal = function() {
  store.set('journal', []);
  _pgRenderJournal();
};
window.switchJournalTab = function(tab) {
  _journalTab = tab;
  _pgRenderJournal();
};

// Backward-compat alias used by inline HTML handlers
window.switchJTab = function(tab) {
  window.switchJournalTab(tab);
};

// Backward-compat settings handlers used by inline HTML
window.saveSetting = function(key, value) {
  _pgSettingSet(key, !!value);
  // Map legacy key names to active feature flags
  if (key === 'pg_auto_catch_anim') {
    _pgSettingSet('pg_auto_catch', !!value);
  }
  if (key === 'pg_show_cameos' || key === 'pg_bone_anim') {
    _pgApplySetting(key, !!value);
  }
  if (key === 'pg_mode_pgp' || key === 'pg_watch_sleep' || key === 'pg_screen_effects') {
    _pgApplyModeUI();
  }
};

window.toggleCameos = function(value) {
  window.saveSetting('pg_show_cameos', !!value);
};

window.toggleBoneAnim = function(value) {
  window.saveSetting('pg_bone_anim', !!value);
};

// Backward-compat reset handlers for static settings panel
let _legacyResetTimer = null;
window.startReset = function() {
  const fill = document.getElementById('resetBarFill');
  const btn = document.getElementById('resetBtn');
  let elapsed = 0;
  if (_legacyResetTimer) clearInterval(_legacyResetTimer);
  _legacyResetTimer = setInterval(() => {
    elapsed += 0.1;
    const pct = Math.min(100, (elapsed / 3) * 100);
    if (fill) fill.style.width = pct + '%';
    if (btn) btn.textContent = `Hold ${Math.max(0, 3 - elapsed).toFixed(1)}s to Reset Progress`;
    if (elapsed >= 3) {
      clearInterval(_legacyResetTimer); _legacyResetTimer = null;
      store.replaceState(DEFAULT_STATE);
      syncAllHUD();
      window.closeSettings();
      if (fill) fill.style.width = '0%';
      if (btn) btn.textContent = 'Hold 3s to Reset Progress';
      toast('🗑 Progress reset!', 2500);
    }
  }, 100);
};

window.cancelReset = function() {
  if (_legacyResetTimer) { clearInterval(_legacyResetTimer); _legacyResetTimer = null; }
  const fill = document.getElementById('resetBarFill');
  const btn = document.getElementById('resetBtn');
  if (fill) fill.style.width = '0%';
  if (btn) btn.textContent = 'Hold 3s to Reset Progress';
};

function _pgIsModePgp() {
  return _pgSettingGet('pg_mode_pgp', false);
}

function _pgIsWatchSleeping() {
  return _pgSettingGet('pg_watch_sleep', false);
}

function _pgScreenEffectsAllowed() {
  if (_pgIsWatchSleeping()) return false;
  return _pgSettingGet('pg_screen_effects', true);
}

function _pgVibrateAllowed() {
  return _pgSettingGet('pg_vibrate', true);
}

function _pgModeStatusText() {
  const mode = _pgIsModePgp() ? 'PGP' : 'Pokégatchi';
  const slp = _pgIsWatchSleeping() ? ' • sleeping' : ' • awake';
  return `${mode}${slp}`;
}

function _pgApplyModeUI() {
  const pgp = _pgIsModePgp();
  const sleep = _pgIsWatchSleeping();
  const p = document.getElementById('pokegatchiActions');
  const g = document.getElementById('pgpActions');
  if (p) p.style.display = pgp ? 'none' : '';
  if (g) g.style.display = pgp ? '' : 'none';

  const species = document.getElementById('petSpecies');
  if (species) {
    const base = currentSpecies ? `Showing ${currentSpecies}` : 'Showing pet';
    species.textContent = `${base} · ${_pgModeStatusText()}`;
  }

  const container = document.getElementById('pet3dContainer');
  if (container) container.style.opacity = sleep ? '0.55' : '1';
}

window.pgpSample = function(outcome) {
  const actionType = PGP_OUTCOME_TO_ACTION[outcome];
  if (!actionType) {
    toast(`⚠ Unknown PGP outcome: ${outcome}`, 2500);
    return;
  }

  dispatchGameplay(actionType, {
    source: 'pgp_sample',
    animation: actionType.includes('catch') ? ANIMS.BOUNCE : null,
    requestedOutcome: outcome,
  });
  _pgRenderJournal();
};

function _pgTimeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

const _journalMilestones = [
  { label:'First Catch',  sub:'Caught your first Pokémon',    icon:'🟢', req:j=>j.filter(e=>e.type==='catch').length>=1 },
  { label:'10 Catches',   sub:'Caught 10 Pokémon',             icon:'⚡', req:j=>j.filter(e=>e.type==='catch').length>=10 },
  { label:'50 Catches',   sub:'Caught 50 Pokémon',             icon:'🎯', req:j=>j.filter(e=>e.type==='catch').length>=50 },
  { label:'100 Catches',  sub:'Caught 100 Pokémon',            icon:'🏆', req:j=>j.filter(e=>e.type==='catch').length>=100 },
  { label:'First Spin',   sub:'Spun your first PokéStop',      icon:'💠', req:j=>j.filter(e=>e.type==='spin').length>=1 },
  { label:'10 Spins',     sub:'Spun 10 PokéStops',             icon:'🌀', req:j=>j.filter(e=>e.type==='spin').length>=10 },
  { label:'50 Spins',     sub:'Spun 50 PokéStops',             icon:'💫', req:j=>j.filter(e=>e.type==='spin').length>=50 },
  { label:'First Feed',   sub:'Fed your Pokémon',              icon:'🍽', req:j=>j.filter(e=>e.type==='feed').length>=1 },
  { label:'Pet x10',      sub:'Petted your Pokémon 10 times',  icon:'🫳', req:j=>j.filter(e=>e.type==='pet').length>=10 },
  { label:'Full Bond',    sub:'Reached 100 affection',         icon:'💕', req:()=>store.state.affection>=100 },
];

function _pgRenderJournal() {
  const body = document.getElementById('journalBody');
  if (!body) return;
  const jrn = store.state.journal || [];

  const tabs = ['log','today','milestones'];
  const tabLabels = { log:'📋 Log', today:'📊 Today', milestones:'🏆 Milestones' };
  let html = `<div class="pg-journal-tabs">`;
  tabs.forEach(t => {
    html += `<button class="pg-journal-tab${_journalTab===t?' active':''}" onclick="window.switchJournalTab('${t}')">${tabLabels[t]}</button>`;
  });
  html += `</div>`;

  if (_journalTab === 'log') {
    if (jrn.length === 0) {
      html += `<div class="pg-journal-empty">No activity yet</div>`;
    } else {
      const colorMap = { catch:'#4ade80', fled:'#f87171', spin:'#60a5fa', item:'#a78bfa', feed:'#fbbf24', pet:'#f472b6', heal:'#34d399', bounce:'#fcd34d' };
      html += `<div class="pg-journal-list">`;
      jrn.forEach(e => {
        const color = colorMap[e.type] || '#ccc';
        html += `<div class="pg-journal-row" style="border-left:3px solid ${color};">${e.icon} <span class="pg-journal-lbl">${e.label}</span> · <span class="pg-journal-time">${_pgTimeAgo(e.ts)}</span></div>`;
      });
      html += `</div>`;
    }
  } else if (_journalTab === 'today') {
    const caught = jrn.filter(e=>e.type==='catch').length;
    const fled   = jrn.filter(e=>e.type==='fled').length;
    const spins  = jrn.filter(e=>e.type==='spin').length;
    const feeds  = jrn.filter(e=>e.type==='feed').length;
    const items  = jrn.filter(e=>e.type==='item').length;
    const total  = caught + fled;
    const rate   = total > 0 ? Math.round(caught/total*100) : 0;
    const stats = [
      {icon:'🟢', label:'Caught',    val:caught},
      {icon:'🔴', label:'Fled',       val:fled},
      {icon:'📊', label:'Catch Rate', val:rate+'%'},
      {icon:'💠', label:'Spins',       val:spins},
      {icon:'🍽', label:'Feeds',       val:feeds},
      {icon:'🎒', label:'Items Used',  val:items},
    ];
    html += `<div class="pg-journal-stats-grid">`;
    stats.forEach(s => {
      html += `<div class="pg-journal-stat-cell"><span class="pg-journal-stat-icon">${s.icon}</span><span class="pg-journal-stat-val">${s.val}</span><span class="pg-journal-stat-lbl">${s.label}</span></div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="pg-journal-milestones">`;
    _journalMilestones.forEach(m => {
      const unlocked = m.req(jrn);
      html += `<div class="pg-milestone-badge${unlocked?' unlocked':''}">
        <span class="pg-milestone-icon">${unlocked?m.icon:'🔒'}</span>
        <span class="pg-milestone-text">
          <span class="pg-milestone-name">${m.label}</span>
          <span class="pg-milestone-sub">${m.sub}</span>
        </span>
      </div>`;
    });
    html += `</div>`;
  }

  body.innerHTML = html;
}

function _applyLaunchModeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get('mode') || '').toLowerCase();
    if (mode === 'pgp') {
      _pgSettingSet('pg_mode_pgp', true);
    } else if (mode === 'pet' || mode === 'pokegatchi') {
      _pgSettingSet('pg_mode_pgp', false);
    }
  } catch (_) {
    // no-op
  }
}

// Load default species (deferred — all window exports must be defined first)
_applyLaunchModeFromUrl();
window.selectSpecies(store.state.current || 'squirtle');
_pgApplyModeUI();
