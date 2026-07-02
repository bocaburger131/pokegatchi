// js/ui/UIRenderer.js
// Ported from old index.html ~lines 1060–1415
// Adapted from the old global S to the new Store.js state system

import { store } from '../core/Store.js';
import {
  EVO_LINES, STAGES, STAT_META, MOODS, MINIGAMES, ACHIEVEMENTS,
  TIMES, TIMES_LABEL, WEATHERS, WEATHER_LABEL, BG_IMAGES
} from '../data/Pokedex.js';

// ─── Stat Array Bridge ──────────────────────────────────
// The old UI expected stats as an array of 4 numbers (0-100):
//   [hunger, bond, energy, smarts]
// The new Store has pet.stats as { hunger, boredom, cleanliness } (0-1).
// This helper converts so render functions work seamlessly.

function _statArray() {
  const s = store.state.pet.stats;
  const hunger  = Math.round((s.hunger ?? 0.5) * 100);
  const bond    = Math.round((1 - (s.boredom ?? 0.3)) * 100);     // invert boredom → bond
  const energy  = Math.round((s.cleanliness ?? 0.5) * 100);       // cleanliness → energy
  const smarts  = Math.round(((s.hunger ?? 0.5) + (1 - (s.boredom ?? 0.3)) + (s.cleanliness ?? 0.5)) / 3 * 100);
  return [hunger, bond, energy, smarts];
}

function _stage()       { return store.state.pet.stage ?? 0; }
function _mood()        { return store.state.pet.mood ?? 0; }
function _activeLine()  { return store.state.activeLine ?? 'eevee'; }
function _achieved(id)  { return (store.state.achievements || []).includes(id); }

// ══════════════════════════════════════════════════════════
//  RENDER FUNCTIONS
// ══════════════════════════════════════════════════════════

/**
 * renderStats() — renders 4 stat bars with gradient fills, low stat pulse
 */
export function renderStats() {
  const panel = document.getElementById('statsPanel');
  if (!panel) return;
  const stats = _statArray();
  panel.innerHTML = stats.map((v, i) => {
    const p = Math.min(v, 100);
    const meta = STAT_META[i];
    if (!meta) return '';
    const low = v <= 20;
    return `<div class="stat-row ${low ? 'low' : ''}">
      <span class="si">${meta.icon}</span>
      <span class="sn">${meta.name}</span>
      <div class="stat-bar-bg"><div class="stat-fill" style="width:${p}%;background:linear-gradient(90deg,${meta.colors[0]},${meta.colors[1]})"></div></div>
      <span class="sv" style="color:${meta.colors[0]}">${v}</span>
    </div>`;
  }).join('');
}

/**
 * renderMoods() — renders 6 mood pill buttons
 */
export function renderMoods() {
  const grid = document.getElementById('moodGrid');
  if (!grid) return;
  const mood = _mood();
  grid.innerHTML = MOODS.map((m, i) =>
    `<button class="mood-pill ${mood === i ? 'active' : ''}" onclick="window.setMood(${i})">${m}</button>`
  ).join('');
}

/**
 * renderGoals() — renders 3 progress bars (catches, steps, stops) toward next stage
 */
export function renderGoals() {
  const panel = document.getElementById('goalPanel');
  if (!panel) return;
  const stage = _stage();
  if (stage >= 4) {
    panel.innerHTML = '<div style="color:var(--accent);font-size:0.8rem;font-weight:800;text-align:center;">✨ MAX EVOLUTION REACHED ✨</div>';
    return;
  }
  const next = STAGES[stage + 1];
  if (!next) return;
  const s = store.state;
  const goals = [
    { icon:'🏆', label:'Catches',      cur:s.catches,     need:next.needCatch, done:s.catches >= next.needCatch },
    { icon:'👟', label:'Steps',        cur:s.steps,       need:next.needSteps, done:s.steps >= next.needSteps },
    { icon:'🔄', label:'Unique Stops', cur:s.uniqueStops, need:next.needStops, done:s.uniqueStops >= next.needStops },
  ];
  panel.innerHTML = goals.map(g => {
    const pct = g.need > 0 ? Math.min((g.cur / g.need) * 100, 100) : 100;
    return `<div class="goal-row ${g.done ? 'done' : ''}">
      <span class="gi">${g.done ? '✅' : g.icon}</span>
      <span class="gl">${g.label}</span>
      <div class="goal-bar-bg"><div class="goal-fill ${g.done ? 'complete' : ''}" style="width:${pct}%;background:${g.done ? 'linear-gradient(90deg,var(--accent),#FCD34D)' : 'linear-gradient(90deg,var(--accent-dim),var(--accent))'}"></div></div>
      <span class="gv">${g.done ? '✓' : `${g.cur.toLocaleString()}/${g.need.toLocaleString()}`}</span>
    </div>`;
  }).join('');
}

/**
 * renderEvo() — renders evolution timeline with 5 dots + arrows
 */
export function renderEvo() {
  const line = EVO_LINES[_activeLine()];
  if (!line) return;
  const names = ['Egg', ...line.names.slice(0, 4)];
  const reqs = ['Tap Hatch','—','50c +5k👟 +10🔄','250c +25k👟 +30🔄','500c +50k👟 +50🔄'];
  const track = document.getElementById('evoTrack');
  if (!track) return;
  const stage = _stage();
  track.innerHTML = names.map((n, i) => {
    const cls = i < stage ? 'active' : i === stage ? 'current' : '';
    return `<div class="evo-node">
      <div class="evo-dot ${cls}"></div>
      <span class="evo-lbl">${n}</span>
      <span class="evo-req">${reqs[i]}</span>
    </div>${i < 4 ? '<span class="evo-arr">→</span>' : ''}`;
  }).join('');
}

/**
 * renderMinigames() — renders 6 mini-game cards
 */
export function renderMinigames() {
  const panel = document.getElementById('minigamePanel');
  if (!panel) return;
  panel.innerHTML = MINIGAMES.map(m =>
    `<div class="mg-card" onclick="window.playMiniGame('${m.name}', this)">
      <span class="mg-icon">${m.icon}</span>
      <div class="mg-name">${m.name}</div>
      <div class="mg-stat">${m.stat}</div>
    </div>`
  ).join('');
}

/**
 * renderAchievements() — renders locked/unlocked achievement list
 * FIX: The old code had a broken display check:
 *   if (!document.getElementById('achPanel').style.display === 'block') return;
 * This always evaluated to false due to operator precedence.
 * Fixed to: if (document.getElementById('achPanel').style.display !== 'block') return;
 */
export function renderAchievements() {
  const unlocked = (store.state.achievements || []).length;
  const badge = document.getElementById('achBadge');
  if (badge) badge.textContent = unlocked > 0 ? `🏅 ${unlocked}` : '';

  const panel = document.getElementById('achPanel');
  if (!panel) return;
  // FIXED: old bug was `!panel.style.display === 'block'` (always false)
  if (panel.style.display !== 'block') return;

  panel.innerHTML = ACHIEVEMENTS.map(a => {
    const done = _achieved(a.id);
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;opacity:${done ? 1 : 0.3};">
      <span style="font-size:1rem;">${done ? a.icon : '🔒'}</span>
      <div style="flex:1;"><div style="font-size:0.7rem;font-weight:700;">${a.name}</div><div style="font-size:0.55rem;color:var(--text-dimmer);">${a.desc}</div></div>
      ${done ? '<span style="font-size:0.8rem;">✅</span>' : ''}
    </div>`;
  }).join('');
}

/**
 * updateButtons() — enables/disables Hatch, Evolve buttons
 */
export function updateButtons() {
  const btnHatch = document.getElementById('btnHatch');
  const btnEvolve = document.getElementById('btnEvolve');
  const stage = _stage();
  if (btnHatch) btnHatch.disabled = stage > 0;
  if (btnEvolve) btnEvolve.disabled = stage === 0 || stage >= 4;
}

/**
 * renderLinePicker() — renders all 6 evolution line buttons
 */
export function renderLinePicker() {
  const panel = document.getElementById('linePicker');
  if (!panel) return;
  const active = _activeLine();
  panel.innerHTML = Object.entries(EVO_LINES).map(([key, line]) =>
    `<button class="mode-btn ${active === key ? 'active' : ''}" onclick="window.setLine('${key}')">${line.name}</button>`
  ).join('');
}

/**
 * renderAll() — convenience: re-render everything
 */
export function renderAll() {
  renderStats();
  renderMoods();
  renderGoals();
  renderEvo();
  renderMinigames();
  renderAchievements();
  updateButtons();
  renderLinePicker();
}

// ══════════════════════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════════════════════

/**
 * toast(msg) — shows animated toast notification
 */
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), 2500);
}

/**
 * showMilestone(icon, title, desc) — shows centered milestone popup
 */
export function showMilestone(icon, title, desc) {
  const iconEl = document.getElementById('mpIcon');
  const titleEl = document.getElementById('mpTitle');
  const descEl = document.getElementById('mpDesc');
  const popup = document.getElementById('milestonePopup');
  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (popup) popup.classList.add('show');
}

/**
 * closeMilestone() — hides milestone popup
 */
export function closeMilestone() {
  const popup = document.getElementById('milestonePopup');
  if (popup) popup.classList.remove('show');
}

/**
 * toggleAchievements() — toggles achievement panel visibility
 */
let _achToggle = false;
export function toggleAchievements() {
  _achToggle = !_achToggle;
  const panel = document.getElementById('achPanel');
  if (!panel) return;
  panel.style.display = _achToggle ? 'block' : 'none';
  if (_achToggle) renderAchievements();
}

// ══════════════════════════════════════════════════════════
//  ACHIEVEMENTS CHECK
// ══════════════════════════════════════════════════════════

/**
 * checkAchievements() — checks all achievement conditions
 * The new Pokedex.js ACHIEVEMENTS don't have .check() methods
 * (they were removed from the old data), so we inline the
 * condition logic here mapped by achievement id.
 */
export function checkAchievements() {
  const s = store.state;
  const stats = _statArray();
  const stage = _stage();
  const achieved = new Set(s.achievements || []);

  // Condition map keyed by achievement id
  const conditions = {
    'first_catch':   () => s.catches >= 1,
    'hatch':         () => stage >= 1,
    '50_catches':    () => s.catches >= 50,
    '250_catches':   () => s.catches >= 250,
    '500_catches':   () => s.catches >= 500,
    '1k_steps':      () => s.steps >= 1000,
    '10k_steps':     () => s.steps >= 10000,
    '50k_steps':     () => s.steps >= 50000,
    '10_stops':      () => s.uniqueStops >= 10,
    '30_stops':      () => s.uniqueStops >= 30,
    '50_stops':      () => s.uniqueStops >= 50,
    'evolve_teen':   () => stage >= 2,
    'evolve_adult':  () => stage >= 3,
    'evolve_mega':   () => stage >= 4,
    'full_stats':    () => stats.every(v => v >= 100),
    'first_hatch':   () => stage >= 1,
    'catcher_10':    () => s.catches >= 10,
    'catcher_50':    () => s.catches >= 50,
    'catcher_100':   () => s.catches >= 100,
    'walker_1k':     () => s.steps >= 1000,
    'walker_10k':    () => s.steps >= 10000,
    'spinner_10':    () => s.uniqueStops >= 10,
    'spinner_25':    () => s.uniqueStops >= 25,
    'evo_baby':      () => stage >= 1,
    'evo_teen':      () => stage >= 2,
    'evo_adult':     () => stage >= 3,
    'evo_mega':      () => stage >= 4,
    'streak_5':      () => s.streak >= 5,
    'streak_10':     () => s.streak >= 10,
    'feeder':        () => s.totalFeeds >= 25,
    'healer':        () => s.totalHeals >= 10,
    'explorer':      () => true, // Would depend on weather history
  };

  let newUnlock = false;
  ACHIEVEMENTS.forEach(a => {
    if (achieved.has(a.id)) return;
    const check = conditions[a.id];
    if (check && check()) {
      // Add to store
      if (!s.achievements) s.achievements = [];
      s.achievements.push(a.id);
      showMilestone(a.icon, a.name, a.desc);
      newUnlock = true;
    }
  });

  if (newUnlock) {
    store.save();
    renderAchievements();
  }
}

// ══════════════════════════════════════════════════════════
//  AUTO MOOD
// ══════════════════════════════════════════════════════════

/**
 * autoMoodCheck() — sets mood based on stat thresholds
 * Uses the old threshold logic converted to new 0-100 stat values.
 */
export function autoMoodCheck() {
  const stage = _stage();
  if (stage === 0) return;
  const stats = _statArray();
  const [hunger, bond, energy] = stats;

  let mood;
  if (hunger <= 20) mood = 2;          // Hungry
  else if (energy <= 15) mood = 5;     // Sleepy
  else if (bond <= 20) mood = 3;       // Sad
  else if (bond >= 80 && hunger >= 70) mood = 4; // Excited
  else if (hunger >= 60 && energy >= 60) mood = 0; // Happy
  else mood = 1;                       // Content

  store.set('pet.mood', mood);
  renderMoods();
}

// ══════════════════════════════════════════════════════════
//  PET ANIMATIONS
// ══════════════════════════════════════════════════════════

/**
 * petAnim(type) — adds CSS animation class to pet canvas wrapper
 * type: 'bounce' | 'wiggle' | 'sparkle' | 'celebrate'
 */
export function petAnim(type) {
  const wrap = document.getElementById('petWrap');
  if (!wrap) return;
  wrap.classList.remove('bounce', 'wiggle', 'sparkle', 'celebrate');
  void wrap.offsetWidth; // force reflow
  wrap.classList.add(type);
  setTimeout(() => wrap.classList.remove(type), 900);
}
