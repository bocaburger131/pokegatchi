# Pokégatchi V2 — Restructure Plan

> **Goal:** Strip down to core Pokémon experience — bone-animated 3D models, bag inventory, Pokédex, journal, team-colored HUD. No mini-games, no weather, no distractions.

---

## Phase 0: Assets Ready ✅

### Downloaded & Converted GLB Models (6)
| File | Pokemon | Size |
|------|---------|------|
| `pikachu_v2.glb` | Pikachu (#025) | 420 KB |
| `eevee_v2.glb` | Eevee (#133) | 350 KB |
| `charmander_v2.glb` | Charmander (#004) | 412 KB |
| `bulbasaur_v2.glb` | Bulbasaur (#001) | 816 KB |
| `squirtle_v2.glb` | Squirtle (#007) | 489 KB |
| `pichu_v2.glb` | Pichu (#172) | 267 KB |

**Source:** PokeMiners/pogo_assets (actual Pokémon GO rigged models from the APK)
**Conversion:** FBX2glTF (Facebook) → binary GLB with full skeleton preserved

### Each Model Has:
- 40-79 bones with full armature (Head, Tail1-3, LEar1-3, REar1-3, Arms, Legs, Hips, Spine)
- 3 meshes per Pokémon (body, tail/sippo, alternate tail)
- Animation slots defined: `Idle_Field`, `Eat_0`, `Happy_0`, `Walk`, `Run` (empty keyframes — we create our own)
- Niantic's original bone names and hierarchy preserved

---

## Phase 1: Bone Animation Engine

### 1.1 Load V2 GLB in Three.js
- Replace current Pokemon3D API GLB loading with local `_v2.glb` models
- Use `GLTFLoader` — same as now
- Models have skins/skeletons → `AnimationMixer` ready

### 1.2 Bone Reference System
After loading, traverse the armature and cache bone references:
```js
const bones = {};
model.traverse(c => {
  if (c.isBone) bones[c.name] = c;
});
// bones.Head, bones.Tail1, bones.LEar1, bones.LArm, etc.
```

### 1.3 Runtime Bone Animations (No Blender Needed!)
Instead of importing Blender keyframes, animate bones in the RAF loop:

**Idle (breathing + look-around):**
- `Head.rotation` — gentle Y rotation (±5°), occasional look left/right
- `Tail1/Tail2/Tail3.rotation` — sine wave wag
- `LEar1/REar1.rotation` — subtle ear flick
- `Hips.rotation` — gentle sway
- Body mesh scale — subtle breathing pulse

**Feed:**
- `Head.rotation` — tilt down toward `Feeding_Socket`
- `LForeArm/RForeArm.rotation` — arms come up toward mouth
- `Tail1-Tail3` — happy wag
- After 0.5s, return to idle

**Happy/Excited:**
- `Head.rotation` — tilt up, big turn
- `LEar1/REar1` — ears perk up
- `Tail1-Tail3` — excited rapid wag
- `Hips` — bounce up/down

**Heal:**
- Spin whole model (existing tween works) + sparkle effect
- Add bone-level head tilt

**Pet:**
- `Head.rotation` — lean toward camera
- `LEar1/REar1` — ears go back (contentment)
- `Tail1-Tail3` — slow content wag

**Bounce:**
- `Hips position Y` — quick up/down
- Arms spread slightly

### 1.4 Animation Approach
- Use quaternion `slerp()` for smooth bone rotations
- Use `THREE.Quaternion` for each target pose
- Each animation type defines a set of bone targets (quaternion + position offsets)
- Interpolator: `t → 0→1→0` (out-and-back) for most animations
- Override system: interrupt current animation with new one (unlike current "block if active")

### 1.5 Shadow/Dirty Tint (Green)
- When dirty: apply emissive color shift to body mesh materials
- Green tint replaces the "shadow purple" concept
- `material.emissive.setHex(0x224400)` + `material.emissiveIntensity = 0.3`
- Can apply as a shader uniform or material swap
- Clean state = normal colors

---

## Phase 2: V2 UI Restructure

### 2.1 What Stays
- ✅ Pet card with 3D canvas + expression overlay
- ✅ Buddy animations (bone-driven now)
- ✅ Pokémon cameos in background (Eevee/Pikachu/Bulbasaur)
- ✅ Auto mode (catch + spin only, no walking)
- ✅ Team selection overlay
- ✅ Expression overlay (eyes/mouth/moods)
- ✅ Evolution system (catches/steps/stops → stage)
- ✅ Keyboard shortcuts

### 2.2 What Goes
- ❌ Mini-games section (entirely removed)
- ❌ Mood pills (auto-mood based on stats only)
- ❌ Stats panel (integrated into Pokédex)
- ❌ Achievement system (merged into Journal)
- ❌ Wake-up ledger overlay (merged into Journal)
- ❌ Scene forest/background toggle (single clean background)
- ❌ All weather/temperature remnants
- ❌ Mode: "Scenes" (removed)

### 2.3 New UI Layout

```
┌─────────────────────────────────────────┐
│  ✦ PG  🔍  EGG    👟0  🏆0  🔄0       │  ← Top bar (team-colored)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ┌───────────┐                          │
│  │  3D MODEL  │  Pokémon Name           │  ← Pet card with
│  │  + eyes    │  Stage/Species           │     bone-animated 3D
│  │  + mouth   │  Mood label             │     + expression overlay
│  └───────────┘                          │
│  🎒 Bag  📖 Pokédex  📓 Journal        │  ← 3 main nav buttons
│                                         │
│  Hatch │ Feed │ Pet │ Heal │ Evolve     │  ← Action buttons
│  Catch │ +100 Steps │ Spin │ Walk+1k    │
└─────────────────────────────────────────┘
```

### 2.4 New Screens

#### 🎒 Bag
```
┌─────────────────────────────────────────┐
│  ← Back          🎒 Bag                │
├─────────────────────────────────────────┤
│  🫐 Berries: 25    🧸 Toys: 12         │
│                                         │
│  [Use Berry]  [Use Toy]                 │
│                                         │
│  (Items earned via auto-catch/spin)     │
└─────────────────────────────────────────┘
```

#### 📖 Pokédex
```
┌─────────────────────────────────────────┐
│  ← Back          📖 Pokédex             │
├─────────────────────────────────────────┤
│  Current Pokémon: Pikachu               │
│  Stage: Adult (3/5)                     │
│                                         │
│  ❤️ HP: ████████░░ 80                   │
│  🍖 Hunger: ██████░░░░ 60               │
│  💛 Bond: ███████░░░ 70                 │
│  ⚡ Energy: ████████░░ 80               │
│  🧠 Smarts: ██████░░░░ 60               │
│                                         │
│  Mood: 😊 Happy                         │
│  Evolution: 250/500 catches             │
│             25k/50k steps               │
│             30/50 stops                 │
└─────────────────────────────────────────┘
```

#### 📓 Journal
```
┌─────────────────────────────────────────┐
│  ← Back          📓 Journal             │
├─────────────────────────────────────────┤
│  📅 Today's Activity                    │
│  ├─ Pokémon caught: 12                  │
│  ├─ PokéStops spun: 8                  │
│  └─ Steps walked: 3,452                │
│                                         │
│  🏅 Achievements                        │
│  ├─ ✅ First Catch                      │
│  ├─ ✅ 10 Catches                      │
│  ├─ 🔒 50 Catches                      │
│  └─ ✅ First Evolution                 │
│                                         │
│  📊 All Time Stats                      │
│  ├─ Total caught: 347                   │
│  ├─ Total stops: 189                    │
│  ├─ Total steps: 128,453                │
│  └─ Streak: 12                          │
└─────────────────────────────────────────┘
```

### 2.5 HUD System
- **Team-colored** — HUD elements (`--accent`) match team color (red/blue/yellow)
- Displays in top bar:
  - 👟 Steps (cumulative)
  - 🏆 Pokémon caught
  - 🔄 PokéStops spun
- Badges show progress milestones:
  - After 10 catches: bronze badge
  - After 50 catches: silver badge
  - After 250 catches: gold badge
  - After 500 catches: platinum badge

### 2.6 Cameo System (KEPT)
- Scene background shows 3 idle Pokémon cameos (Eevee, Pikachu, Bulbasaur)
- Originally CSS-positioned sprites — could upgrade to 3D mini-model cameos

---

## Phase 3: Evolution & Auto Mode

### 3.1 Evolution (unchanged from current)
- Catches + Steps + Stops → meet thresholds → button Evolve
- 5 stages per line: Egg → Baby → Teen → Adult → Mega
- Evolution animation: sparkle + model swap

### 3.2 Auto Mode (unchanged)
- Catch every 8s, spin every 6s
- Live counter: "X caught · Y spun"
- NO auto-walk (removed)
- Auto-run stops when switching to Play mode

### 3.3 Inventory System
- 🫐 Berries earned: auto-catch every 5 → +1 berry
- 🧸 Toys earned: auto-spin every 5 → +1 toy
- Bag screen: display counts, use items
- Using a berry: +hunger
- Using a toy: -boredom

---

## Phase 4: Expression Overlay (KEPT, improved)
- Same 2D canvas overlay on top of 3D model
- Blinks (curved arcs ✓), mouths (6 moods ✓), star eyes ✓
- FACE_DATA per species needs calibration — use debug overlay 🔍

---

## File Structure V2

```
pokegatchi/
├── index.html              ← Simplified, no minigames sections
├── assets/
│   ├── styles.css           ← Updated, no minigame CSS, team-colored HUD
│   ├── models_v2/           ← NEW: 6 PokeMiners GLB with skeletons
│   │   ├── pikachu_v2.glb
│   │   ├── eevee_v2.glb
│   │   ├── charmander_v2.glb
│   │   ├── bulbasaur_v2.glb
│   │   ├── squirtle_v2.glb
│   │   └── pichu_v2.glb
│   └── sprites/             ← Keep for fallback
├── js/
│   ├── main.js              ← Updated, new nav routing
│   ├── core/
│   │   └── Store.js         ← Same, remove achievement lists
│   ├── scene/
│   │   ├── SceneManager.js  ← Updated V2 model loading + bone animation
│   │   └── ExpressionOverlay.js ← Same (keep the improvements)
│   ├── data/
│   │   └── Pokedex.js       ← V2 data, MODEL_IDS_V2 for local GLBs
│   └── ui/
│       └── UIRenderer.js    ← Bag, Pokédex, Journal renderers
└── V2-PLAN.md               ← This file
```

---

## Implementation Order

1. **Phase 1: Bone Animation** (Pikachu first)
   - Load `pikachu_v2.glb` in SceneManager
   - Write bone reference/scan system
   - Create idle animation (head turn, ear flick, tail wag, breathing)
   - Create feed animation (head down, arms up, happy wag)
   - Create happy/excited animation
   - Wire into playAnimation()

2. **Phase 2: UI Restructure**
   - Strip mini-games from HTML/CSS/JS
   - Add Bag/Pokédex/Journal nav buttons
   - Build Bag screen
   - Build Pokédex screen (stats display)
   - Build Journal screen (activity log + achievements)
   - Make HUD team-colored

3. **Phase 3: Polish**
   - Green "shadow/dirty" tint concept
   - Calibrate expression overlay FACE_DATA
   - Evolve all 6 lines to test bone rigs
   - Verify auto mode works with new UI

---

## Animation Technique Reference

### Bone Rotation with Quaternions (Three.js)
```js
// Cache bone reference
const headBone = bones['Head'];

// Target rotation (look right slightly)
const targetQ = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, 0.3, 0) // 17° Y rotation
);

// Each frame, slerp toward target
headBone.quaternion.slerp(targetQ, 0.05);
```

### Tail Wag (Sine Wave)
```js
// Tail1 = base, Tail2 = middle, Tail3 = tip
const t = Date.now() * 0.003;
bones['Tail1'].rotation.z = Math.sin(t) * 0.2;
bones['Tail2'].rotation.z = Math.sin(t * 1.3 + 0.5) * 0.3;
bones['Tail3'].rotation.z = Math.sin(t * 1.6 + 1.0) * 0.4;
```

### T-Pose Rest
Every bone has a rest (bind pose) quaternion. Store it on load, and idle animations blend from rest using slerp.
