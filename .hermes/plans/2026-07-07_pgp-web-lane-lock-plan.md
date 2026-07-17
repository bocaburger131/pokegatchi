# Pokégatchi Web Lane Lock Plan (PGP + Animation)

> **Plan-only mode:** no implementation in this document.  
> **Decision:** lock to **Web lane** as primary shipping lane; Godot becomes reference/prototyping only.

## Goal
Ship a working private game focused on **PGP mode** with polished animation feedback and installable/testable delivery.

## Product Scope (locked)
- Keep two core modes in product logic:
  - **PGP mode (priority):** spin/catch outcome loop with strong feedback
  - **Pokégatchi mode:** pet simulation (reduced scope this sprint)
- Prioritize these event buckets:
  - `spin_success`, `spin_fail`
  - `catch_success`, `catch_fail`
- Use cozy 2D storybook visuals already generated.

## Lane Policy
1. **Primary lane:** `/opt/data/BocaBurger/pokegatchi` (web app)
2. **Godot lane:** no feature parity requirement this sprint; only used for idea prototyping.
3. No new engine pivots until web PGP loop is stable and demo-ready.

---

## Definition of Done (for this sprint)
A tester can:
1. Open web game
2. Switch to PGP mode
3. Trigger spin/catch events (mock or BLE bridge)
4. See correct success/fail animation each time
5. Observe journal/log updates
6. Run/install as a local app-like experience (PWA or desktop wrapper path documented)

---

## Workstreams (run concurrently)

## Stream A — Core PGP gameplay lock
**Objective:** deterministic PGP outcomes and event routing.

### A1. Event contract freeze
- Define canonical event payload shape for:
  - `spin_success`, `spin_fail`, `catch_success`, `catch_fail`
- Files to update:
  - `js/core/Store.js`
  - `js/main.js`
  - `js/ble/*` (bridge adapters)

### A2. Mode gate hardening
- Ensure all PGP-only animations/actions are gated by `core_mode === 'pgp'`.
- Ensure pet-only loops don’t override PGP outcome feedback while in PGP mode.
- Files:
  - `js/main.js`

### A3. Outcome correctness tests
- Add test harness hooks for forced outcomes (success/fail) for spin/catch.
- Verify no cross-wiring (e.g., spin fail never triggers catch success FX).
- Files:
  - `auto-catcher.html` (if used as harness)
  - `js/main.js`

## Stream B — Animation + VFX integration
**Objective:** clean, readable animation feedback with no stale/static feel.

### B1. Asset normalization
- Convert selected VFX to final runtime-ready PNG sets (alpha background).
- Organize buckets by outcome.
- Target folders:
  - `assets/vfx/pgp/spin/success/`
  - `assets/vfx/pgp/spin/fail/`
  - `assets/vfx/pgp/catch/success/`
  - `assets/vfx/pgp/catch/fail/`

### B2. Runtime animator map
- Create central mapping table:
  - event -> bucket -> weighted random asset
- Files:
  - `js/scene/` (or `js/ui/`) new `PgpFxManager.js`
  - `js/main.js`

### B3. Animation timing pass
- Tune animation durations and easing for readability:
  - success: punchy/bright
  - fail: muted/brief
- Enforce max overlap count to prevent clutter.

## Stream C — Install + run experience
**Objective:** make it easy to launch like an app.

### C1. One-command dev start
- Standardize run command and docs.
- Files:
  - `README.md`
  - optional `scripts/dev.sh`

### C2. PWA install path (preferred)
- Add/verify manifest + service worker + install prompt behavior.
- Files:
  - `manifest.webmanifest`
  - `sw.js`
  - `index.html`

### C3. Fallback installer path (optional)
- Document Electron/Tauri wrapper only if needed after PWA validation.

## Stream D — QA + acceptance
**Objective:** prevent regressions and prove working game.

### D1. PGP test matrix
- Cases:
  - spin success/fail (x20 each)
  - catch success/fail (x20 each)
  - mode switch stress (pgp <-> pokegatchi)
  - animation disabled edge states removed (feature toggles only)

### D2. Accessibility + UI sanity
- Fix known ARIA mismatch debt.
- Confirm no broken handler references in console.

### D3. Build verification checklist
- Local run
- GitHub Pages deploy check
- Mobile install check (PWA)

---

## Prioritized Bug/Improvement List
1. Ensure PGP event outcomes never map to wrong FX bucket.
2. Eliminate stale static moments in PGP loop (always visible feedback).
3. Tighten mode-switch state reset so old animations don’t leak across modes.
4. Consolidate settings to feature toggles only (already directionally done).
5. Remove/disable dead experimental controls from user-facing HUD.

---

## Suggested 5-Day Execution Sequence

### Day 1
- A1 + A2 (event contract + mode gate)
- B1 folder structure and asset curation

### Day 2
- B2 integration (event->FX mapper)
- D1 initial matrix run

### Day 3
- B3 timing polish
- Fix top 3 defects from matrix

### Day 4
- C1 + C2 (installable flow)
- D2 accessibility/console cleanup

### Day 5
- D3 final verification + release notes
- Deliver tester build link + quickstart

---

## Release Artifacts
- Web URL (GitHub Pages)
- Changelog of PGP lock improvements
- Known limitations list
- Quickstart: "Install on mobile/desktop" section

---

## Risks + Mitigations
- **Risk:** animation asset mismatch/style drift  
  **Mitigation:** keep one style lock and centralized mapper.
- **Risk:** BLE bridge noise causes inconsistent outcomes  
  **Mitigation:** keep forced-outcome mock harness as source of truth for QA.
- **Risk:** lane split resumes and slows progress  
  **Mitigation:** no new Godot feature tasks until web DoD is met.

---

## Immediate Next Step (first action when execution starts)
Implement **A1 Event Contract Freeze** + **B1 Asset Bucket Normalization** in one PR so all later work has stable wiring.