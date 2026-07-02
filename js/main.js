// js/main.js — Complete with HUD sync, Bag system, Demo Boost, stat-modifying actions, collapsible sections
import { store } from './core/Store.js';
import { SceneManager } from './scene/SceneManager.js';
import { ExpressionOverlay } from './scene/ExpressionOverlay.js';
import { V2_MODELS, FACE_DATA } from './data/Pokedex.js';

// === GLOBALS ===
let sceneMan, exprOverlay;
let currentSpecies = null;
let _hudFlashTimer = null;

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
      // Flash for stat keys (hunger, happiness, affection)
      if (['hunger', 'happiness', 'affection'].includes(key)) {
        valEl.classList.remove('hud-flash');
        // Force reflow
        void valEl.offsetWidth;
        valEl.classList.add('hud-flash');
        clearTimeout(valEl._flashT);
        valEl._flashT = setTimeout(() => valEl.classList.remove('hud-flash'), 500);
        // Also update the stat bars
        const bar = document.getElementById('bar' + key.charAt(0).toUpperCase() + key.slice(1));
        const valSpan = document.getElementById('val' + key.charAt(0).toUpperCase() + key.slice(1));
        if (bar) bar.style.width = value + '%';
        if (valSpan) valSpan.textContent = value;
      }
    }
  });

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

  exprOverlay = new ExpressionOverlay('expressionCanvas');

  // Start render loop
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); // cap to avoid spiral
    sceneMan.update(dt);
  }
  loop();

  // Sync all HUD elements from initial store state
  syncAllHUD();
  // NOTE: default species loaded below after all window exports are defined
}

// === ALL WINDOW EXPORTS (defined BEFORE init runs) ===
window.selectSpecies = function(species) {
  currentSpecies = species;
  store.set('current', species);

  // Update UI
  document.getElementById('petName').textContent = species.charAt(0).toUpperCase() + species.slice(1);
  document.getElementById('petSpecies').textContent = `Showing ${species}`;
  document.getElementById('petNameDisplay').textContent = species.charAt(0).toUpperCase() + species.slice(1);

  // Highlight picker button
  document.querySelectorAll('.pick-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.pick-btn[data-species="${species}"]`);
  if (btn) btn.classList.add('active');

  // Load V2 model
  const glbFile = V2_MODELS[species];
  if (glbFile) {
    try {
      sceneMan.loadV2Model(glbFile);
      toast(`✨ Loading ${species}...`);
    } catch (e) {
      console.error('Failed to load model:', e);
      toast(`⚠ Failed to load ${species} model`, 3000);
    }
  } else {
    toast(`⚠ No model for ${species}`, 3000);
  }

  // Face data for expression overlay
  const fd = FACE_DATA[species];
  if (fd) {
    try {
      exprOverlay._getFaceData = () => fd;
      exprOverlay.start(species, 0);
    } catch (e) {
      console.error('Failed to start expression overlay:', e);
    }
  }
};

// === ANIMATION ACTIONS (stat-modifying) ===
function playAnimation(name) {
  if (!currentSpecies) return false;
  sceneMan.playAnimation(name);
  return true;
}

window.feed = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation('feed');
  store.addStat('hunger', 15);
  store.addStat('happiness', -5);
  exprOverlay.showTempMood(0, 2); // happy
  toast('🍽 Feeding... +15 hunger, -5 happiness');
};

window.petAction = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation('pet');
  store.addStat('affection', 10);
  store.addStat('happiness', 5);
  exprOverlay.showTempMood(0, 1.5); // happy
  toast('🫳 Petting... +10 affection, +5 happiness');
};

window.healPet = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation('heal');
  store.addStat('happiness', 25);
  const hungerToAdd = 100 - store.state.hunger;
  store.addStat('hunger', hungerToAdd); // refill to 100
  exprOverlay.showTempMood(4, 2); // excited
  toast('💊 Healing... +25 happiness, hunger restored!');
};

window.bounce = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  playAnimation('bounce');
  store.addStat('happiness', 10);
  exprOverlay.showTempMood(4, 1.5); // excited
  toast('🌟 Bounce! +10 happiness');
};

// === BAG SYSTEM ===
window.openBag = function() {
  // Collapse demo section if open
  const demoSection = document.getElementById('demoSection');
  if (demoSection && demoSection.classList.contains('open')) {
    demoSection.classList.remove('open');
    const demoChevron = demoSection.querySelector('.collapsible-chevron');
    if (demoChevron) demoChevron.textContent = '▶';
  }

  const bagSection = document.getElementById('bagSection');
  if (!bagSection) return;
  bagSection.classList.toggle('open');
  const chevron = bagSection.querySelector('.collapsible-chevron');
  if (chevron) chevron.textContent = bagSection.classList.contains('open') ? '▼' : '▶';

  // Sync bag counts on open
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

  // Animate
  bagSection.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  bagSection.style.transform = 'scale(1.02)';
  setTimeout(() => { bagSection.style.transform = 'scale(1)'; }, 150);
};

window.useItem = function(itemName) {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  const count = store.get(itemName) || 0;
  if (count < 1) return toast('❌ No ' + itemName + ' left!', 2500);

  switch (itemName) {
    case 'berries':
      store.addStat('hunger', 20);
      store.addItem('berries', -1);
      playAnimation('feed');
      toast('🍇 Used a Berry! +20 hunger');
      break;
    case 'toys':
      store.addStat('happiness', 15);
      store.addItem('toys', -1);
      playAnimation('bounce');
      toast('🧸 Played with a Toy! +15 happiness');
      break;
    case 'potions':
      store.addStat('happiness', 20);
      store.addStat('affection', 15);
      store.addItem('potions', -1);
      playAnimation('heal');
      toast('💖 Used a Potion! +20 happiness, +15 affection');
      break;
    case 'candy':
      store.addStat('happiness', 10);
      store.addItem('candy', -1);
      playAnimation('feed');
      exprOverlay.showTempMood(4, 1.5); // excited special animation
      toast('🍬 Gave Candy! +10 happiness');
      break;
    default:
      toast('⚠ Unknown item: ' + itemName, 2500);
  }
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
  store.addHud('pokemonCaught', 1);
  toast('⚡ Demo boost: +1 Pokémon caught');
};

window.demoBoostSpin = function() {
  store.addHud('pokestopSpins', 1);
  toast('⚡ Demo boost: +1 Pokéstop spin');
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
  btn.textContent = on ? '🔍 ON' : '🔍';
  btn.style.background = on ? 'var(--accent)' : 'var(--accent-dim)';
  toast(on ? '🔍 Debug ON' : '🔍 Debug OFF');
};

// Load default species (deferred — all window exports must be defined first)
Promise.resolve().then(() => {
  window.selectSpecies(store.state.current || 'pikachu');
});
