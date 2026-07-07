# Asset Handoff for Ziva (Godot Lane)

This file tells Ziva which assets are already available so it can implement polish work without guessing.

## Ground truth / intent alignment
- This is a **Godot parallel lane** for Pokégatchi.
- Shipping baseline is still web lane.
- Team identity is mostly for HUD/theming emphasis right now.
- Goal is to use existing generated assets first, then improve animation/behavior polish.

## Existing Godot lane active pet sprites (currently mapped)
- `res://assets/sprites/eevee_skin_v2_compact.png`
- `res://assets/sprites/psyduck_skin_v1.png`
- `res://assets/sprites/pikachu_skin_v1.png`
- `res://assets/sprites/bulbasaur_skin_v1.png`
- `res://assets/sprites/charmander_skin_v1.png`
- `res://assets/sprites/squirtle_skin_v1.png`

## Imported web-lane sprite library for Ziva context
A larger sprite library has been copied into:
- `res://assets/sprites/library/`
- `res://assets/sprites/library/generated/`

These include all currently available web-lane PNGs under `assets/sprites/` and generated variants.

## Constraints for Ziva
1. Do not rewrite project architecture from scratch.
2. Keep HUD minimal: Bag / Pokédex / Journal.
3. Keep team theming simple and consistent (Valor/Mystic/Instinct).
4. Prioritize animation/feel polish over feature bloat.
5. Reuse existing art assets before requesting net-new art.

## Suggested immediate tasks for Ziva
1. Audit `res://assets/sprites/` + `res://assets/sprites/library/` and choose best 6-pet mappings.
2. Improve per-pet idle/action expression behavior (distinct per species).
3. Keep Bag/Pokédex/Journal in sync with GameState persistence.
4. Keep shape-aware layout behavior intact.

## Quick validation checklist
- No red runtime errors.
- All 6 pets render and animate.
- Mood/action state readable at a glance.
- Save/reload preserves state.
