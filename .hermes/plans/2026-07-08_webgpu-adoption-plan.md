# Pokégatchi WebGPU Adoption Plan (Feature-Flagged, Safe Rollout)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a safe, optional WebGPU rendering path for Pokégatchi while keeping current WebGL as the default and fallback.

**Architecture:** Keep `SceneManager` as the central renderer boundary, add a renderer factory that attempts WebGPU only when explicitly enabled, and hard-fallback to WebGL on unsupported devices/errors. No gameplay logic changes in phase 1.

**Tech Stack:** Three.js (current r128 WebGL baseline), optional parallel WebGPU-compatible Three.js module lane, feature flags in app settings/localStorage, browser capability checks.

---

## Scope Guardrails

- **Default behavior remains unchanged:** WebGLRenderer stays default for all users.
- **WebGPU is opt-in only** behind a feature flag (`pg_render_mode = webgl | webgpu`).
- **Hard fallback:** any init/runtime failure in WebGPU switches to WebGL automatically and logs a non-fatal warning.
- **No emote/gameplay rewrites in phase 1.**
- **No production-only lock-in:** keep one command to disable WebGPU quickly.

---

## Release Slices

### V1 (this plan)
- Add renderer mode setting + runtime capability check
- Add WebGPU attempt path
- Guaranteed fallback to WebGL
- Add status/debug indicator for active renderer

### V2
- Performance pass for animations/materials under WebGPU
- Optional TSL shader experiments on isolated effects

### V3
- Full WebGPU material/shader modernization where ROI is proven

---

## Task 1: Add rendering mode setting (no behavior change yet)

**Objective:** Introduce a persistent render-mode setting to control future renderer selection.

**Files:**
- Modify: `js/core/Store.js`
- Modify: `js/main.js`
- Modify: `index.html`

**Steps:**
1. Add a setting key in Store defaults, e.g. `pg_render_mode: 'webgl'`.
2. Wire getter/setter usage in `main.js` init path.
3. Add UI control in settings panel:
   - Options: `Auto (recommended)`, `Force WebGL`, `Try WebGPU`.
4. Keep actual renderer behavior unchanged in this task (still WebGL).

**Verification:**
- Toggle persists across reload.
- Console check returns expected stored value.

---

## Task 2: Create renderer capability probe utility

**Objective:** Add a utility that determines whether WebGPU can be attempted safely.

**Files:**
- Create: `js/scene/rendererCaps.js`
- Modify: `js/scene/SceneManager.js`

**Steps:**
1. Create utility methods:
   - `isWebGPUSupported()` (checks `navigator.gpu` + availability conditions)
   - `getPreferredRenderer(mode)` returning `'webgpu' | 'webgl'`.
2. Integrate utility call into SceneManager init flow but still instantiate WebGL in this task.
3. Add clear logging prefix (`[Renderer] ...`) for diagnostics.

**Verification:**
- Browser console shows capability decision path.
- No render regressions.

---

## Task 3: Add renderer factory with hard fallback

**Objective:** Centralize renderer creation and add WebGPU attempt + fallback logic.

**Files:**
- Modify: `js/scene/SceneManager.js`
- (Optional create) `js/scene/createRenderer.js`

**Steps:**
1. Refactor existing `new THREE.WebGLRenderer(...)` call into factory.
2. If mode requests WebGPU and capability probe passes:
   - Try WebGPU renderer init inside `try/catch`.
3. On any failure:
   - Log warning with error reason.
   - Instantiate WebGL renderer.
   - Set runtime flag `this.activeRenderer = 'webgl'`.
4. Expose current active renderer via a debug getter.

**Verification:**
- Force WebGL mode -> active renderer always `webgl`.
- Try WebGPU on unsupported browser -> automatic fallback to `webgl`, app still loads.

---

## Task 4: Surface active renderer in UI/debug

**Objective:** Make renderer mode visible so users can report issues precisely.

**Files:**
- Modify: `index.html`
- Modify: `assets/styles.css`
- Modify: `js/main.js`

**Steps:**
1. Add small non-intrusive status text (e.g., `Renderer: WebGL` / `Renderer: WebGPU`).
2. Update on startup and after fallback.
3. Add one debug helper on `window` for quick checks (e.g., `window.getRendererMode()`).

**Verification:**
- Status reflects real active renderer.
- When fallback occurs, UI updates accordingly.

---

## Task 5: Compatibility smoke test matrix

**Objective:** Validate no regressions in core interactions across renderer modes.

**Files:**
- Create: `.hermes/reports/webgpu-smoke-2026-07-08.md`

**Steps:**
1. Test baseline flows in `webgl` mode:
   - species select
   - feed/pet/heal/bounce
   - emote eat/sad/run/play/happy/wave
2. Test `try webgpu` mode:
   - startup behavior
   - renderer status output
   - fallback behavior if unavailable
3. Capture console errors and summarize.

**Verification:**
- No blocking JS errors in default mode.
- WebGPU mode never breaks app; fallback always recovers.

---

## Task 6: Rollout controls + rollback

**Objective:** Make production rollout safe and reversible in one edit.

**Files:**
- Modify: `js/core/Store.js`
- Modify: `js/main.js`

**Steps:**
1. Add kill switch constant (e.g., `ENABLE_WEBGPU_EXPERIMENT = false` initially).
2. Gate UI option visibility by this constant.
3. Document rollback steps:
   - set constant false
   - bump cache version

**Verification:**
- Turning constant off hides WebGPU option and forces WebGL path.

---

## What #4 (`webgpu-threejs-tsl`) specifically is

`webgpu-threejs-tsl` is a **community skill** focused on:
- WebGPU renderer setup in Three.js
- TSL (Three.js Shading Language) node-material authoring
- Compute shader and post-processing patterns
- WGSL integration guidance

It is best used in **V2+** after V1 fallback-safe architecture is stable.

---

## Risks / Tradeoffs

- WebGPU browser/device support is still uneven compared to WebGL.
- Different renderer backends can expose material/lighting differences.
- Team debugging cost rises if WebGPU is enabled too early.

Mitigation:
- Opt-in only + hard fallback + visible renderer status + kill switch.

---

## Deployment/Verification Commands (when implementing)

- Local run and console checks as today
- Cache-bust script imports on each renderer-path change
- Verify live Pages script versions before sharing links

---

## Done Definition

- Default users continue on WebGL with zero behavior change.
- WebGPU can be manually enabled for testing.
- Unsupported/failing paths auto-fallback safely.
- Renderer status is visible and diagnosable.
- Rollback is one toggle + cache bump.
