// js/main.js — Stripped: pick a Pokémon, animate it
import { store } from './core/Store.js';
import { SceneManager } from './scene/SceneManager.js';
import { ExpressionOverlay } from './scene/ExpressionOverlay.js';
import { V2_MODELS, FACE_DATA } from './data/Pokedex.js';

// === GLOBALS ===
let sceneMan, exprOverlay;
let currentSpecies = null;

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

// === INIT ===
(function init() {
  sceneMan = new SceneManager('pet3dContainer');
  sceneMan.init();

  exprOverlay = new ExpressionOverlay('expressionCanvas');
  exprOverlay.init(320, 320);

  // Start render loop
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05); // cap to avoid spiral
    sceneMan.update(dt);
  }
  loop();

  // Load default species
  selectSpecies(store.state.current || 'pikachu');
})();

// === SPECIES SELECTION ===
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
    sceneMan.loadV2Model(glbFile);
    toast(`✨ Loading ${species}...`);
  } else {
    toast(`⚠ No model for ${species}`, 3000);
  }

  // Face data for expression overlay
  const fd = FACE_DATA[species];
  if (fd) {
    exprOverlay._getFaceData = () => fd;
    exprOverlay.start(species, 0);
  }
};

// === ANIMATION ACTIONS ===
window.feed = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  sceneMan.playAnimation('feed');
  toast('🍽 Feeding...');
};

window.petAction = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  sceneMan.playAnimation('pet');
  toast('🫳 Petting...');
};

window.healPet = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  sceneMan.playAnimation('heal');
  toast('💊 Healing...');
};

window.bounce = function() {
  if (!currentSpecies) return toast('Pick a Pokémon first!');
  sceneMan.playAnimation('bounce');
  toast('🌟 Bounce!');
};

window.toggleDebugOverlay = function() {
  if (!exprOverlay) return;
  const on = exprOverlay.toggleDebug();
  const btn = document.getElementById('debugToggle');
  btn.textContent = on ? '🔍 ON' : '🔍';
  btn.style.background = on ? 'var(--accent)' : 'var(--accent-dim)';
  toast(on ? '🔍 Debug ON' : '🔍 Debug OFF');
};
