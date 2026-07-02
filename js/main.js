// js/main.js — Production Bootstrap (Merged)
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
import { 
  renderStats, renderMoods, renderGoals, renderEvo, renderMinigames, 
  renderAchievements, updateButtons, renderLinePicker,
  toast, showMilestone, closeMilestone, toggleAchievements, 
  checkAchievements, autoMoodCheck as uiAutoMoodCheck, petAnim
} from './ui/UIRenderer.js';

// === CONSTANTS ===
const WEATHER_TYPES = ['clear', 'cloudy', 'rain', 'snow', 'fog'];

// === INIT ===
store.load(); // Restore saved state

// Init runtime fields
if (!store.state.team) store.state.team = null;
if (!store.state._uniqueStopSet) store.state._uniqueStopSet = [];
if (!store.state.moodSwirl) store.state.moodSwirl = false;

// === THREE.JS SETUP ===
const sceneMan = new SceneManager('pet3dContainer');
sceneMan.init();

// When 3D model fails after timeout, ensure sprite background stays visible
sceneMan.setFallbackCallback((pokedexId) => {
  // Sprite already set by renderPetView() — just make sure it's prominent
  const container = document.getElementById('pet3dContainer');
  if (container) {
    container.style.opacity = '1';
    container.style.filter = 'brightness(1.2) contrast(1.1)';
  }
  // Show sprite glow with pulsing animation
  const glow = document.getElementById('spriteGlow');
  if (glow) glow.style.opacity = '0.6';
  const petWrap = document.getElementById('petWrap');
  if (petWrap) petWrap.classList.add('has-glow');
});

// When 3D model loads successfully, keep the glow subtle (no pulse)
sceneMan.setSuccessCallback((pokedexId) => {
  const petWrap = document.getElementById('petWrap');
  if (petWrap) petWrap.classList.remove('has-glow');
});

// === EXPRESSION OVERLAY ===
const exprOverlay = new ExpressionOverlay('expressionCanvas');

// === GAME LOOP ===
const loop = new GameLoop();

// System 1: 3D render
loop.register((dt) => sceneMan.update(dt));

// System 2: Stat decay (once per second)
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

// System 3: Expression check / mood (every ~6 seconds)
let exprCheckAccum = 0;
loop.register((dt) => {
  exprCheckAccum += dt;
  if (exprCheckAccum >= 6.0) {
    exprCheckAccum = 0;
    autoMoodCheck();
  }
});

// System 4: UI refresh (every ~2 seconds)
let renderAccum = 0;
loop.register((dt) => {
  renderAccum += dt;
  if (renderAccum >= 2.0) {
    renderAccum = 0;
    renderAll();
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

  document.getElementById('petName').textContent = line?.names[s] || '—';
  document.getElementById('petSpecies').textContent = STAGES[s]?.species || '—';
  document.getElementById('petLevelDisplay').textContent = STAGES[s]?.id.toUpperCase() || 'EGG';

  // ALWAYS set the sprite background behind the 3D canvas
  // If 3D model loads, it renders on top (transparent background).
  // If 3D fails, the sprite shows through.
  if (spritePath) {
    // Convert relative path to absolute for GitHub Pages
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    const absSpritePath = spritePath.startsWith('http') ? spritePath : base + '/' + spritePath;
    sceneMan.setSpriteBackground(absSpritePath);
  }

  if (modelInfo) {
    sceneMan.loadModel(modelInfo.ids[s], modelInfo.cats[s]);
  }

  const spriteName = spritePath?.split('/').pop().replace('.png', '') || 'eevee';
  const face = FACE_DATA[spriteName];
  exprOverlay.setSpecies(spriteName);
  if (face) {
    exprOverlay._getFaceData = () => face;
  }
  const mood = store.state.pet?.mood || 0;
  exprOverlay.setMood(mood);
  exprOverlay.start(spriteName, mood);
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
  exprOverlay.setMood(mood);
}

// === renderAll() — full UI refresh ===
function renderAll() {
  renderPetView();
  renderStats();
  renderMoods();
  renderGoals();
  renderEvo();
  renderMinigames();
  renderAchievements();
  updateButtons();
  renderLinePicker();
  updateHUD();
  updateInventory();
  renderStatus();
}

// === HELPER: tick() ===
function tick() {
  store.save();
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
  if (p.stage === 0) return;
  if (p.stage >= 4) return;
  
  const next = STAGES[p.stage + 1];
  if (!next) return;
  
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

// === SCENE / WEATHER ===
function applyScene() {
  const timeIdx = store.state.time.timeIdx;
  const weatherIdx = store.state.time.weatherIdx;
  
  const bgContainer = document.getElementById('skyLayer');
  if (!bgContainer) return;
  
  if (timeIdx >= 0 && timeIdx < BG_IMAGES.length) {
    bgContainer.style.backgroundImage = `url(${BG_IMAGES[timeIdx]})`;
  } else {
    bgContainer.style.backgroundImage = '';
  }
  
  const weatherEl = document.getElementById('weather-overlay');
  if (!weatherEl) return;
  weatherEl.className = 'weather-overlay';
  if (weatherIdx >= 0 && weatherIdx < WEATHERS.length) {
    weatherEl.classList.add(WEATHERS[weatherIdx]);
  }
}

function initParticles() {
  const scene3d = document.getElementById('pet3dContainer');
  if (!scene3d) return;
  
  // Stars
  let starsEl = document.getElementById('star-particles');
  if (!starsEl) {
    starsEl = document.createElement('div');
    starsEl.id = 'star-particles';
    starsEl.className = 'particle-layer stars';
    scene3d.appendChild(starsEl);
  }
  
  // Rain
  let rainEl = document.getElementById('rain-particles');
  if (!rainEl) {
    rainEl = document.createElement('div');
    rainEl.id = 'rain-particles';
    rainEl.className = 'particle-layer rain';
    scene3d.appendChild(rainEl);
  }
  
  // Snow
  let snowEl = document.getElementById('snow-particles');
  if (!snowEl) {
    snowEl = document.createElement('div');
    snowEl.id = 'snow-particles';
    snowEl.className = 'particle-layer snow';
    scene3d.appendChild(snowEl);
  }
}

// === WINDOW ACTIONS ===

/**
 * window.hatch() — hatch the egg (stage 0→1), reset progress counters
 */
window.hatch = function() {
  const p = store.state.pet;
  if (p.stage !== 0) return;
  store.set('pet.stage', 1);
  store.state.catches = 0;
  store.state.steps = 0;
  store.state.stops = 0;
  store.state.uniqueStops = 0;
  store.state._uniqueStopSet = [];
  const name = EVO_LINES[store.state.activeLine]?.names[1] || 'Buddy';
  toast(`🥚 ${name} HATCHED!`);
  renderAll();
};

/**
 * window.feed() — +10 Hunger (0-100 scale = +0.10), +3 Bond (= boredom -0.03)
 */
window.feed = function() {
  const p = store.state.pet;
  if (p.stage === 0) return;
  p.stats.hunger = Math.min(1.0, p.stats.hunger + 0.10);
  p.stats.boredom = Math.max(0, p.stats.boredom - 0.03);
  store.state.totalFeeds = (store.state.totalFeeds || 0) + 1;
  autoMoodCheck();
  petAnim('bounce');
  toast('🍖 Yum! +10 Hunger, +3 Bond');
  tick();
  renderAll();
};

/**
 * window.petAction() — +10 Bond (= boredom -0.10), +3 Energy (= cleanliness +0.03)
 */
window.petAction = function() {
  const p = store.state.pet;
  if (p.stage === 0) return;
  p.stats.boredom = Math.max(0, p.stats.boredom - 0.10);
  p.stats.cleanliness = Math.min(1.0, p.stats.cleanliness + 0.03);
  store.state.totalPets = (store.state.totalPets || 0) + 1;
  petAnim('wiggle');
  toast('💛 Pet! +10 Bond, +3 Energy');
  tick();
  renderAll();
};

/**
 * window.healPet() — boost all stats by a substantial amount
 */
window.healPet = function() {
  const p = store.state.pet;
  if (p.stage === 0) return;
  p.stats.hunger = Math.min(1.0, p.stats.hunger + 0.25);
  p.stats.boredom = Math.max(0, p.stats.boredom - 0.25);
  p.stats.cleanliness = Math.min(1.0, p.stats.cleanliness + 0.25);
  store.state.totalHeals = (store.state.totalHeals || 0) + 1;
  petAnim('sparkle');
  toast('💊 Healed! All stats boosted');
  tick();
  renderAll();
};

/**
 * window.addCatch() — increment catches/streak, +2 Bond, -1 Energy, 20% random weather
 */
window.addCatch = function() {
  const p = store.state.pet;
  if (p.stage === 0) return;
  store.state.catches = (store.state.catches || 0) + 1;
  store.state.streak = (store.state.streak || 0) + 1;
  p.stats.boredom = Math.max(0, p.stats.boredom - 0.02);
  p.stats.cleanliness = Math.max(0, p.stats.cleanliness - 0.01);
  
  // 20% random weather change
  if (Math.random() < 0.2) {
    const wi = Math.floor(Math.random() * WEATHERS.length);
    store.state.time.weatherIdx = wi;
    applyScene();
  }
  
  toast(`🏆 Caught! Streak: ${store.state.streak}`);
  checkAchievements();
  tick();
  renderAll();
};

/**
 * window.addStep(n) — add steps, check milestones, check achievements
 */
window.addStep = function(n) {
  if (store.state.pet.stage === 0) return;
  store.state.steps = (store.state.steps || 0) + n;
  
  // Check milestones
  const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
  for (const m of milestones) {
    if (store.state.steps >= m && !store.state[`_milestone_${m}`]) {
      store.state[`_milestone_${m}`] = true;
      showMilestone('👟', `${m.toLocaleString()} Steps!`, 'Keep walking!');
    }
  }
  
  toast(`👟 +${n} steps (Total: ${(store.state.steps || 0).toLocaleString()})`);
  checkAchievements();
  tick();
  renderAll();
};

/**
 * window.addStop() — random stop ID, track unique, check achievements
 */
window.addStop = function() {
  if (store.state.pet.stage === 0) return;
  const stopIds = [];
  for (let i = 0; i < 200; i++) {
    stopIds.push(`stop_${i}`);
  }
  const id = stopIds[Math.floor(Math.random() * stopIds.length)];
  
  // Track unique
  if (!store.state._uniqueStopSet) store.state._uniqueStopSet = [];
  if (!store.state._uniqueStopSet.includes(id)) {
    store.state._uniqueStopSet.push(id);
    store.state.uniqueStops = (store.state.uniqueStops || 0) + 1;
  }
  store.state.stops = (store.state.stops || 0) + 1;
  
  toast(`🔄 Stop spun! (${store.state.uniqueStops} unique)`);
  checkAchievements();
  tick();
  renderAll();
};

/**
 * window.walkBatch() — quick 1000-step batch
 */
window.walkBatch = function() {
  window.addStep(1000);
};

/**
 * window.evolve() — check stage goals from STAGES, evolve if met
 */
window.evolve = function() {
  const p = store.state.pet;
  if (p.stage === 0 || p.stage >= 4) return;
  
  const next = STAGES[p.stage + 1];
  if (!next) return;
  
  const s = store.state;
  const catches = s.catches || 0;
  const steps = s.steps || 0;
  const uniqueStops = s.uniqueStops || 0;
  
  if (catches >= next.needCatch && steps >= next.needSteps && uniqueStops >= next.needStops) {
    // 1) Lock game loop during evolution animation
    loop.lock();

    // 2) Play flash/glow/sparkle animation on pet-wrap for ~2s
    const wrap = document.getElementById('petWrap');
    petAnim('sparkle');
    if (wrap) wrap.classList.add('evolving');

    // Store new stage & boost stats
    const newStage = p.stage + 1;
    store.set('pet.stage', newStage);

    // Boost stats +15 (0-100 scale → +0.15 on 0-1 scale)
    p.stats.hunger = Math.min(1.0, p.stats.hunger + 0.15);
    p.stats.boredom = Math.max(0, p.stats.boredom - 0.15);
    p.stats.cleanliness = Math.min(1.0, p.stats.cleanliness + 0.15);

    s.streak = 0;

    const line = EVO_LINES[s.activeLine];
    const newName = line?.names[newStage] || '???';

    // 3) After animation completes, load new model, show milestone, unlock
    setTimeout(() => {
      if (wrap) wrap.classList.remove('evolving');

      store.save();
      renderAll();  // loads new stage's 3D model via renderPetView → sceneMan.loadModel

      // 4) Show the milestone
      showMilestone('⬆', `Evolved to ${newName}!`, 'Stats boosted!');

      // 5) Unlock game loop
      loop.unlock();
    }, 2000);
  } else {
    toast(`❌ Need ${next.needCatch}c / ${next.needSteps.toLocaleString()}👟 / ${next.needStops}🔄`);
  }
};

// === MINI-GAMES ===

/**
 * window.playMiniGame(name) — play a mini-game by name, boosting the associated stat.
 * stat:1 → hunger (+0.10), stat:2 → boredom (-0.10, inverted since lower=better),
 * stat:3 → cleanliness (+0.10). Shows toast, animates, saves & re-renders.
 */
window.playMiniGame = function(name) {
  const p = store.state.pet;
  if (p.stage === 0) return;

  const game = MINIGAMES.find(m => m.name === name);
  if (!game) {
    toast(`❌ Unknown minigame: ${name}`);
    return;
  }

  const statIdx = game.stat; // 1=hunger, 2=boredom, 3=cleanliness
  const boost = 0.10;

  if (statIdx === 1) {
    // Hunger — higher is better
    p.stats.hunger = Math.min(1.0, p.stats.hunger + boost);
  } else if (statIdx === 2) {
    // Boredom — lower is better, so subtract
    p.stats.boredom = Math.max(0, p.stats.boredom - boost);
  } else if (statIdx === 3) {
    // Cleanliness — higher is better
    p.stats.cleanliness = Math.min(1.0, p.stats.cleanliness + boost);
  }

  toast(`${game.icon} ${game.name}!`);
  petAnim('bounce');
  tick();
  renderAll();
};

// ─── DEMO ONLY: quick-boost helpers for evolution testing ───
/**
 * DEMO ONLY: window.boostCatches(n) — add n catches, show toast
 * Use this to quickly meet evolution catch requirements.
 */
window.boostCatches = function(n) {
  if (store.state.pet.stage === 0) return;
  store.state.catches = (store.state.catches || 0) + n;
  toast(`⚡ DEMO: +${n} catches (Total: ${store.state.catches})`);
  tick();
  renderAll();
};

/**
 * DEMO ONLY: window.boostSteps(n) — add n steps, show toast
 * Use this to quickly meet evolution step requirements.
 */
window.boostSteps = function(n) {
  if (store.state.pet.stage === 0) return;
  store.state.steps = (store.state.steps || 0) + n;
  toast(`⚡ DEMO: +${n.toLocaleString()} steps (Total: ${(store.state.steps || 0).toLocaleString()})`);
  tick();
  renderAll();
};

/**
 * DEMO ONLY: window.boostStops(n) — add n unique stops, show toast
 * Use this to quickly meet evolution stop requirements.
 */
window.boostStops = function(n) {
  if (store.state.pet.stage === 0) return;
  for (let i = 0; i < n; i++) {
    const stopId = `demo_stop_${i}`;
    if (!store.state._uniqueStopSet.includes(stopId)) {
      store.state._uniqueStopSet.push(stopId);
      store.state.uniqueStops = (store.state.uniqueStops || 0) + 1;
    }
  }
  toast(`⚡ DEMO: +${n} unique stops (Total: ${store.state.uniqueStops})`);
  tick();
  renderAll();
};
// ─── END DEMO ONLY ───

/**
 * window.resetPet() — confirm dialog, wipe everything
 */
window.resetPet = function() {
  if (!confirm('Reset your pet? All progress will be lost!')) return;
  store.state.pet.stage = 0;
  store.state.pet.stats = { hunger: 1.0, boredom: 0.0, cleanliness: 1.0 };
  store.state.pet.mood = 1;
  store.state.catches = 0;
  store.state.steps = 0;
  store.state.stops = 0;
  store.state.uniqueStops = 0;
  store.state._uniqueStopSet = [];
  store.state.streak = 0;
  store.state.totalFeeds = 0;
  store.state.totalPets = 0;
  store.state.totalHeals = 0;
  store.state.achievements = [];
  renderAll();
};

/**
 * window.updateAutoDisplay() — update the auto mode live counter (caught/spun only)
 */
window.updateAutoDisplay = function() {
  const catchEl = document.getElementById('autoCatchCount');
  const spinEl = document.getElementById('autoSpinCount');
  if (catchEl) catchEl.textContent = store.state._autoCatches || 0;
  if (spinEl) spinEl.textContent = store.state._autoSpins || 0;
};

/**
 * window.setMode(m) — 'play' | 'auto' | 'scene', toggles controls & auto intervals
 * Auto mode only simulates catch + spin (NO auto-walk or auto-steps).
 */
window.setMode = function(m) {
  store.state.mode = m;
  
  const sceneControls = document.getElementById('sceneControls');
  if (sceneControls) {
    sceneControls.style.display = (m === 'scene') ? 'flex' : 'none';
  }
  
  // Auto status display
  const autoStatus = document.getElementById('autoStatus');
  
  // Auto mode intervals — only catch + spin, no walking
  if (m === 'auto') {
    // Reset live counters on each auto session start
    store.state._autoCatches = 0;
    store.state._autoSpins = 0;
    window.updateAutoDisplay();
    
    // Show auto status bar
    if (autoStatus) autoStatus.style.display = 'block';
    
    if (!store._autoWeatherInterval) {
      store._autoWeatherInterval = setInterval(() => {
        store.state.time.weatherIdx = (store.state.time.weatherIdx + 1) % WEATHERS.length;
        applyScene();
        renderAll();
      }, 15000);
    }
    if (!store._autoTimeInterval) {
      store._autoTimeInterval = setInterval(() => {
        store.state.time.timeIdx = (store.state.time.timeIdx + 1) % TIMES.length;
        applyScene();
        renderAll();
      }, 10000);
    }
    if (!store._autoCatchInterval) {
      store._autoCatchInterval = setInterval(() => {
        window.addCatch();
        store.state._autoCatches = (store.state._autoCatches || 0) + 1;
        window.updateAutoDisplay();
      }, 8000);
    }
    if (!store._autoSpinInterval) {
      store._autoSpinInterval = setInterval(() => {
        window.addStop();
        store.state._autoSpins = (store.state._autoSpins || 0) + 1;
        window.updateAutoDisplay();
      }, 6000);
    }
  } else {
    // Hide auto status bar
    if (autoStatus) autoStatus.style.display = 'none';
    
    if (store._autoWeatherInterval) {
      clearInterval(store._autoWeatherInterval);
      store._autoWeatherInterval = null;
    }
    if (store._autoTimeInterval) {
      clearInterval(store._autoTimeInterval);
      store._autoTimeInterval = null;
    }
    if (store._autoCatchInterval) {
      clearInterval(store._autoCatchInterval);
      store._autoCatchInterval = null;
    }
    if (store._autoSpinInterval) {
      clearInterval(store._autoSpinInterval);
      store._autoSpinInterval = null;
    }
  }
  renderAll();
};

/**
 * window.setTime(i) — set time-of-day index, apply scene
 */
window.setTime = function(i) {
  store.state.time.timeIdx = i;
  applyScene();
};

/**
 * window.setWeather(i) — set weather index, apply scene
 */
window.setWeather = function(i) {
  store.state.time.weatherIdx = i;
  applyScene();
};

/**
 * window.selectTeam(team) — hide team overlay, set team, save
 */
window.selectTeam = function(team) {
  const overlay = document.getElementById('teamOverlay');
  if (overlay) overlay.style.display = 'none';
  store.state.team = team;
  store.save();
  renderAll();
  applyScene();
};

/**
 * window.setMood(i) — manually set pet mood
 */
window.setMood = function(i) {
  store.state.pet.mood = i;
  renderMoods();
  toast(MOODS[i] || `Mood ${i}`);
};

/**
 * window.setLine(key) — switch evolution line
 */
window.setLine = function(key) {
  if (!EVO_LINES[key]) return;
  store.set('activeLine', key);
  localStorage.setItem('pg_line', key);
  renderPetView();
  renderLinePicker();
};

/**
 * window.toggleAchievements() — delegate to UIRenderer
 */
window.toggleAchievements = function() {
  toggleAchievements();
};

/**
 * window.closeMilestone() — delegate to UIRenderer
 */
window.closeMilestone = function() {
  closeMilestone();
};

window.dismissLedger = dismissLedger;

// === KEYBOARD SHORTCUTS ===
document.addEventListener('keydown', (e) => {
  // Shift+1-5 for weather
  if (e.shiftKey && e.key >= '1' && e.key <= '5') {
    e.preventDefault();
    window.setWeather(parseInt(e.key) - 1);
    return;
  }
  
  switch (e.key.toLowerCase()) {
    case 'c': window.addCatch(); break;
    case 's': window.addStep(100); break;
    case 'f': window.feed(); break;
    case 'p': window.petAction(); break;
    case 'h': window.healPet(); break;
  }
  
  // 1-5 for time-of-day
  if (e.key >= '1' && e.key <= '5') {
    window.setTime(parseInt(e.key) - 1);
  }
});

// === INIT ===
function initEngine() {
  processWakeupLedger();
  renderPetView();
  updateHUD();
  updateInventory();
  renderStatus();
  renderAll();
  initParticles();
  applyScene();
  loop.start();
}

// Wait for DOM then start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEngine);
} else {
  initEngine();
}
