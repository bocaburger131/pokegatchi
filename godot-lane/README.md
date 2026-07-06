# Pokégatchi Godot Lane (Branch-out Bootstrap)

This folder is the bootstrap lane for a future Godot implementation while web remains the shipping baseline.

## Why this exists
- Keep momentum shipping in web repo
- Create a clean Godot branch-out path in parallel
- Avoid mixing experimental engine setup with production web code

## Current status
- Godot project files are scaffolded in this folder
- Team select overlay + persistent team state scaffolded
- Mode bar wired to team-aware status text
- V1 sample screen implemented:
  - team select + team theme switching
  - pet panel with Eevee/Psyduck sample sprites
  - live stat loop (hunger/happiness/energy)
  - actions (Feed / Pet / Heal / Catch / Spin)
  - sample pet swap trigger
- Task 4 done (HUD parity demo):
  - 🎒 Bag panel with item counts
  - 📖 Pokédex panel with seen species list
  - 📓 Journal panel with timestamped activity log
- Task 5 done (BLE simulation hook):
  - `scripts/ble/BleEventBridge.gd` emits mock catch/spin events
  - Catch/Spin buttons route through BLE event bridge
  - BLE events update stats, bag items, and journal log
- Task 8 done (pluggable BLE transport adapter):
  - `BleEventBridge` now supports provider abstraction (`MockBleProvider`, `QueueBleProvider`)
  - Runtime transport switching via `BLE: SIM/LOCAL` button
  - Provider poll loop + transport status signal wired in `Main.gd`
  - Keeps current mock behavior while opening a clean path for real transport adapter
- Task 9 done (Option C tester mirror):
  - Added `previews/godot-lane-sample.html` as a web-accessible mirror of current Godot sample behavior
  - Includes team/mode/shape controls, BLE mode toggle, actions, stats, journal, and responsive round-vs-rect layout logic
- Task 6 done (watch-form-factor pass):
  - Responsive breakpoint (`WATCH_BREAKPOINT := 540.0`)
  - Runtime `resized` handler + `_apply_watch_layout()`
  - Compact typography for small/round displays
  - Reduced sprite and panel footprints for watch screens
- Shape detection/override pass done:
  - Auto-detects round-like displays via viewport aspect + size
  - `Shape` button cycles `AUTO -> ROUND -> RECT`
  - Stores shape preference in `GameState.layout_shape_mode`
  - Lets non-watch rectangular devices avoid circular margins
- This lane is **not** the production target yet

## Next steps
1. Open `godot-lane/project.godot` in Godot 4.x
2. Validate all interactions in `Main.tscn`
3. Fine-tune for true round clipping/margins once tested on emulator/device
4. Replace mock BLE bridge with real transport adapter
5. Add expression/action sprite-state mapping visuals

## Source of recovered reference
- `recovery/gemini-session-snapshot/`
- `recovery/RECOVERED_GEMINI_INTENT_AND_FINISH_PLAN.md`


## Task roadmap (status)
- Task 8: Real transport adapter path ✅ completed
- Task 9: Expression/action visual mapping ✅ completed
- Task 10: Test-gamer delivery package ✅ completed

## Option C (CI artifact delivery)
- Workflow: `.github/workflows/godot-lane-artifacts.yml`
- Trigger: pushes to `hermes/godot-lane-bootstrap` touching `godot-lane/**` or manual `workflow_dispatch`
- Artifacts:
  - `godot-lane-source.zip`
  - `godot-lane-web-mirror.zip`

## Tester handoff
- `godot-lane/TEST_GAMER_DELIVERY.md`
- Web mirror demo: `previews/godot-lane-sample.html`
