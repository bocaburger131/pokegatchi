// js/main.js — Production Bootstrap
import { store } from './core/Store.js';
import { GameLoop } from './core/GameLoop.js';
import { 
  EVO_LINES, MODEL_IDS, SPRITES, STAGES, FACE_DATA,
  TEAMS, STAT_META, MOODS, BG_IMAGES, MINIGAMES, ACHIEVEMENTS,
  TIMES, TIMES_LABEL, WEATHERS, WEATHER_LABEL,
  getSpriteName
} from './data/Pokedex.js';
import { SceneManager } from './scene/SceneManager.js';
import { ExpressionOverlay } from './scene/ExpressionOverlay.js';

// === INIT ===
store.load(); // Restore saved state

// Active line state
store.set('activeLine', store.get('activeLine') || 'eevee');

// === THREE.JS SETUP ===
const sceneMan = new SceneManager('layer-3d-buddy');
sceneMan.init();

// === EXPRESSION OVERLAY ===
const exprOverlay = new ExpressionOverlay('expressionCanvas');

// === GAME LOOP ===
const loop = new GameLoop();

// System 1: 3D render
loop.register((dt) => sceneMan.update(dt));

// System 2: Stat decay (once per second, not every frame)
let decayAccum = 0;
loop.register((dt) => {
  decayAccum += dt;
  if (decayAccum >= 1.0) {
    decayAccum -= 1.0;
    const s = store.state.pet.stats;
    s.hunger = Math.max(0, s.hunger - 0.02);
    s.boredom = Math.min(1, s.boredom + 0.03);
    store.save();
    updateHUD();
  }
});

// System 3: Expression update (every ~6 seconds change mood slightly)
let exprCheckAccum = 0;
loop.register((dt) => {
  exprCheckAccum += dt;
  if (exprCheckAccum >= 6.0) {
    exprCheckAccum = 0;
    autoMoodCheck();
  }
});

// === CORE RENDER FUNCTIONS ===
function updateHUD() {
  const s = store.state.pet.stats;
  const hEl = document.getElementById('hud-hunger');
  const bEl = document.getElementById('hud-boredom');
  if (!hEl) return;
  hEl.textContent = `HG: ${Math.round(s.hunger * 100)}%`;
  bEl.textContent = `BD: ${Math.round(s.boredom * 100)}%`;
  hEl.classList.toggle('alert', s.hunger < 0.25);
  bEl.classList.toggle('alert', s.boredom > 0.75);
}

function renderPetView() {
  const s = Math.min(store.state.pet.stage, 4);
  const line = EVO_LINES[store.state.activeLine];
  const modelInfo = MODEL_IDS[store.state.activeLine];
  const spritePath = SPRITES[store.state.activeLine][s];

  // Update name/species
  document.getElementById('petName').textContent = line?.names[s] || '—';
  document.getElementById('petSpecies').textContent = STAGES[s]?.species || '—';
  document.getElementById('petStage').textContent = STAGES[s]?.id.toUpperCase() || 'EGG';

  // Load 3D model (async)
  if (modelInfo) {
    sceneMan.loadModel(modelInfo.ids[s], modelInfo.cats[s]);
  }

  // Update expression overlay
  const spriteName = spritePath?.split('/').pop().replace('.png', '') || 'eevee';
  const face = FACE_DATA[spriteName];
  exprOverlay.setSpecies(spriteName);
  // Set face data on overlay
  if (face) {
    exprOverlay._getFaceData = () => face;
  }
  const mood = store.state.pet?.mood || 0;
  exprOverlay.setMood(mood);
  exprOverlay.start(spriteName, mood);
}

function updateLinePicker() {
  const panel = document.getElementById('linePicker');
  if (!panel) return;
  panel.innerHTML = Object.entries(EVO_LINES).map(([key, line]) =>
    `<button class="mode-btn ${store.state.activeLine === key ? 'active' : ''}" onclick="window.setLine('${key}')">${line.name}</button>`
  ).join('');
}

function renderStatus() {
  const p = store.state.pet;
  const statusEl = document.getElementById('hud-status');
  if (!statusEl) return;
  if (p.stats.hunger < 0.25) statusEl.textContent = '• HUNGRY •';
  else if (p.stats.boredom > 0.75) statusEl.textContent = '• BORED •';
  else statusEl.textContent = '• SEARCHING •';
}

function updateInventory() {
  const p = store.state.pet;
  document.getElementById('inv-berries').textContent = p.inventory.berries;
  document.getElementById('inv-toys').textContent = p.inventory.toys;
}

function autoMoodCheck() {
  const s = store.state.pet.stats;
  let mood = 1; // Content default
  if (s.hunger < 0.25) mood = 2;
  else if (s.hunger < 0.10) mood = 3;
  if (s.boredom > 0.75) mood = 3;
  if (s.boredom > 0.90) mood = 3;
  store.set('pet.mood', mood);
  // Update expression
  exprOverlay.setMood(mood);
}

// === WAKE-UP LEDGER ===
function processWakeupLedger() {
  const b = store.state.backlog;
  const earnedBerries = Math.floor(b.pendingSpins / 5);
  const earnedToys = Math.floor(b.pendingCatches / 5);
  
  document.getElementById('ledger-spins').textContent = `STOPS DETECTED: ${b.pendingSpins}`;
  document.getElementById('ledger-catches').textContent = `CAPTURES SUCCESS: ${b.pendingCatches}`;
  document.getElementById('ledger-rewards').textContent = `UNLOCKED: +${earnedBerries} Berries, +${earnedToys} Toys`;
  
  store.state.pet.inventory.berries += earnedBerries;
  store.state.pet.inventory.toys += earnedToys;
  
  // Highest rarity bonus
  if (b.highestRarity === 'ultra' || b.highestRarity === 'master') {
    store.state.pet.inventory.berries += 2;
  }
  
  store.state.backlog.pendingSpins = 0;
  store.state.backlog.pendingCatches = 0;
  store.state.backlog.highestRarity = 'common';
  store.save();
  updateInventory();
}

function dismissLedger() {
  document.getElementById('ledger-overlay').style.display = 'none';
  loop.unlock();
  checkEvolution();
}

// === EVOLUTION SYSTEM ===
function checkEvolution() {
  const p = store.state.pet;
  if (p.stage === 0) return; // Egg — need hatch first
  if (p.stage >= 4) return; // Maxed out
  
  const next = STAGES[p.stage + 1];
  if (!next) return;
  
  // Simplified: berries as evolution trigger for now
  if (p.inventory.berries >= 5 && p.stage === 1) {
    loop.lock();
    document.getElementById('hud-status').textContent = '★ EVOLUTION TRIGGERED ★';
    setTimeout(() => {
      store.set('pet.stage', p.stage + 1);
      store.state.pet.inventory.berries -= 5;
      store.save();
      renderPetView();
      loop.unlock();
      document.getElementById('hud-status').textContent = '• EVOLVED! •';
      updateInventory();
    }, 2000);
  }
}

// === ACTIONS (exposed globally for onclick) ===
window.handleFeedClick = function() {
  const p = store.state.pet;
  if (p.inventory.berries <= 0) return;
  p.inventory.berries--;
  p.stats.hunger = Math.min(1.0, p.stats.hunger + 0.35);
  document.getElementById('hud-status').textContent = '• FEEDING TIME •';
  setTimeout(() => renderStatus(), 2000);
  store.save();
  updateHUD();
  updateInventory();
  checkEvolution();
};

window.handlePlayClick = function() {
  const p = store.state.pet;
  if (p.inventory.toys <= 0) return;
  p.inventory.toys--;
  p.stats.boredom = Math.max(0, p.stats.boredom - 0.50);
  document.getElementById('hud-status').textContent = '• PLAYING METRICS UP •';
  setTimeout(() => renderStatus(), 2000);
  store.save();
  updateHUD();
  updateInventory();
  checkEvolution();
};

window.handleCleanClick = function() {
  store.state.pet.stats.cleanliness = 1.0;
  document.getElementById('hud-status').textContent = '• SYSTEM BATH COMPLETED •';
  setTimeout(() => renderStatus(), 2000);
  store.save();
};

window.handleHatchClick = function() {
  if (store.state.pet.stage > 0) return;
  store.set('pet.stage', 1);
  const name = EVO_LINES[store.state.activeLine].names[1];
  document.getElementById('hud-status').textContent = `★ ${name} HATCHED! ★`;
  store.save();
  renderPetView();
  updateLinePicker();
};

window.setLine = function(key) {
  if (!EVO_LINES[key]) return;
  store.set('activeLine', key);
  localStorage.setItem('pg_line', key);
  renderPetView();
  updateLinePicker();
};

window.dismissLedger = dismissLedger;

// === INIT ===
function initEngine() {
  processWakeupLedger();
  renderPetView();
  updateHUD();
  updateInventory();
  updateLinePicker();
  renderStatus();
  loop.start();
}

// Wait for DOM then start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine);
} else {
  initEngine();
}
