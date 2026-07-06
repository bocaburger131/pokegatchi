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
- This lane is **not** the production target yet

## Next steps
1. Install Godot 4.x on dev environment
2. Open `godot-lane/project.godot`
3. Validate scene boot (`Main.tscn`) and team switching
4. Port systems incrementally from web lane:
   - pet state loop
   - asset mapping for final character sheets
   - UI parity for HUD panels (Bag / Pokédex / Journal)

## Source of recovered reference
- `recovery/gemini-session-snapshot/`
- `recovery/RECOVERED_GEMINI_INTENT_AND_FINISH_PLAN.md`
