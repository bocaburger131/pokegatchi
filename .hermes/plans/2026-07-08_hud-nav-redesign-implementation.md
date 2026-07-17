# Pokégatchi HUD/Nav Revamp Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ship the new navigation/HUD redesign with a single bottom-center Pokéball launcher, top-left team profile card, top-right settings, and team-reactive unlock/alert behavior.

**Architecture:** Keep existing gameplay/store loops; replace navigation shell + HUD composition in `index.html`, `assets/styles.css`, and `js/main.js` with a componentized launcher + bottom-sheet behavior and team-driven visual state classes.

**Tech Stack:** Existing Pokégatchi web lane (Three.js + ES modules), CSS animations, localStorage-backed store.

---

## Locked interview decisions (from user)

- `1C` → Pokéball opens **slide-up bottom sheet**
- `2C` → Team colors affect UI + unlock order + team-themed backgrounds
- `3B` → Hungry/bored alerts use **shake + pulse** (plus vibration where supported)
- `4A` → Cozy storybook visual direction
- `5B and C` → Provide both two-line top-left card and expandable behavior sample; implement two-line default with expandable variant available
- Eevee should be **quadruped** (four legs), not biped
- Pikachu remains untouched in this phase

---

## Task 1 — Build new HUD shell markup

**Files:**
- Modify: `index.html`

**Steps:**
1. Add top-left team card container with compact 2-line layout.
2. Add optional expandable drawer child block (hidden by default).
3. Add top-right settings icon button.
4. Add top HUD metric row for steps/spins/catches/achievements.
5. Add bottom-center Pokéball launcher button.
6. Add slide-up sheet containing 3 nav actions (Pokédex / Journal / Bag).

**Verification:**
- Page renders without JS errors.
- Launcher and sheet nodes exist in DOM.

---

## Task 2 — CSS styling + animations

**Files:**
- Modify: `assets/styles.css`

**Steps:**
1. Add cozy glass cards and team-color CSS variables.
2. Add `team-valor`, `team-mystic`, `team-instinct` body/state classes.
3. Add Pokéball launcher style and active press states.
4. Add slide-up panel transitions (`transform + opacity`).
5. Add alert shake/pulse animations.
6. Add Eevee quadruped pose framing class for scene container.

**Verification:**
- Switching team class visibly recolors accents.
- Alert icon animates with shake+pulse.

---

## Task 3 — JS behavior wiring

**Files:**
- Modify: `js/main.js`

**Steps:**
1. Add `toggleQuickMenu()` open/close behavior for bottom sheet.
2. Add `setTeamTheme(team)` to apply team classes and icon variants.
3. Add top-left expandable card toggle function.
4. Add `updateHudStats()` binding for steps/spins/catches/achievements.
5. Add pet-state alert evaluator (hungry/bored triggers shake marker).
6. Add `navigator.vibrate(...)` call guarded by capability + user setting.

**Verification:**
- Menu opens/closes from center Pokéball.
- Team switch updates visual accents and unlock markers.
- Hungry/bored state surfaces animated indicator and optional vibration.

---

## Task 4 — Eevee-first art integration

**Files:**
- Add/Modify as needed:
  - `assets/generated/ui/` (new images)
  - `js/data/Pokedex.js` (species presentation mapping only)

**Steps:**
1. Use quadruped Eevee art sample as new active design baseline.
2. Keep Pikachu behavior/assets untouched.
3. Integrate team-themed background overlays (red/blue/yellow accents).

**Verification:**
- Eevee appears in quadruped style in redesigned shell.
- Pikachu path unchanged.

---

## Task 5 — Browser verification + deploy readiness

**Files:**
- N/A (test and validate)

**Steps:**
1. Verify locally in browser:
   - launcher sheet flow
   - top-left card compact + expand
   - team class swaps
   - HUD stat updates
   - hungry/bored alert animation
2. Bump cache versions for changed JS/CSS.
3. Prepare commit scoped to web files only.

**Verification:**
- No blocking console errors.
- All new controls function.

---

## Task 6 — GitHub Pages publish and validation

**Steps:**
1. Push feature branch commit.
2. Deploy to `main` using existing safe workflow.
3. Verify live URL reflects new script/style versions.
4. Share final link + concise QA checklist.

**Verification:**
- Live page contains center launcher and new top HUD layout.

---

## Rollback Plan

- Single revert commit restoring old shell markup/styles/scripts if UX regressions appear.
- Keep new assets isolated in `assets/generated/ui/` for low-risk rollback.
