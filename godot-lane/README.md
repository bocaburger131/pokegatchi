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
- This lane is **not** the production target yet

## Next steps
1. Open `godot-lane/project.godot` in Godot 4.x
2. Validate all interactions in `Main.tscn`
3. Add animation-state mapping for richer expression/action frames
4. Replace mock BLE bridge with real transport adapter
5. Run watch-form-factor layout pass (round/small screens)

## Source of recovered reference
- `recovery/gemini-session-snapshot/`
- `recovery/RECOVERED_GEMINI_INTENT_AND_FINISH_PLAN.md`
