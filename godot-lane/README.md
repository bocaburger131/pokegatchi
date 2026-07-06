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
  - actions (Feed / Pet / Heal)
  - sample pet swap trigger (cycles Eevee/Psyduck on Feed)
- This lane is **not** the production target yet

## Next steps
1. Open `godot-lane/project.godot` in Godot 4.x
2. Validate all interactions in `Main.tscn`
3. Add HUD parity modules (Bag / Pokédex / Journal)
4. Add animation-state mapping for expressions/actions
5. Integrate BLE event bridge hooks for catch/spin signal simulation

## Source of recovered reference
- `recovery/gemini-session-snapshot/`
- `recovery/RECOVERED_GEMINI_INTENT_AND_FINISH_PLAN.md`
