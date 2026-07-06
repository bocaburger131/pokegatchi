# Expression/Action Visual Mapping (Task 9)

Current implementation in `scripts/Main.gd` maps mood/action state to lightweight visual effects on `PetSprite`:

## Expression mapping
- `Neutral` → default tint/scale
- `Hungry` → warm/desaturated tint
- `Sleepy` → cool blue tint
- `Excited` → bright warm tint + slight scale up
- `Sad` → muted gray-blue tint
- `Determined` → red-leaning tint

## Action overlays
- `feed` → lerp tint toward soft green
- `heal` → lerp tint toward cyan-white
- `catch`/`spin` → slight scale bump

## Why this approach
- Works immediately with current PNG assets
- No animation import pipeline required yet
- Easy to later replace with real sprite-sheet/AnimatedSprite2D states

## Next upgrade path
1. Add expression spritesheets per species (Eevee/Psyduck first)
2. Replace tint/scale logic with frame/state selection
3. Keep this fallback for missing assets
