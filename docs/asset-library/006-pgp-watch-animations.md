# Asset Pack 006 — PGP Watch Animations
**Art Director: Pokégatchi**
**Priority: 6 (watch polish)**
**Status: GENERATING**

---

## Goal
Game-ready sprite sheet animations for PGP (Pokémon Go Plus) mode — catch/spin outcomes + device connection states. Small-screen readable, cozy-branded, pure FX (no text, no copyrighted characters).

## Target Platform
- Wear OS watch (1.2–1.5" round display)
- Also web emulator (index.html PGP mode triggered by `?mode=pgp`)
- Godot lane (Godot compatible sprite sheets)

## Asset List (6 sheets, 3×2 grid = 6 frames each)

| # | Filename | Description | Sheet Size | Frames |
|---|----------|-------------|------------|--------|
| 1 | `pgp_catch_success` | Sparkle burst + ✅ flash — white/gold star burst with gentle particle ring | 512×512 | 3×2 |
| 2 | `pgp_catch_fail` | Gentle puff of smoke + ❌ fade — soft gray poof, no sharp sparks | 512×512 | 3×2 |
| 3 | `pgp_spin_success` | Blue disc spin → glow ring → item drop — PokeStop-style circle flash | 512×512 | 3×2 |
| 4 | `pgp_spin_fail` | Disc spin → dull gray flash → fade — same as success but gray/muted | 512×512 | 3×2 |
| 5 | `pgp_connect` | Wi-Fi-like arcs pulsing in — 3 concentric arcs, green glow, gentle pulse | 512×512 | 3×2 |
| 6 | `pgp_disconnect` | Arcs breaking apart — arcs fade outward, red pulse, then dissolve | 512×512 | 3×2 |

## Style Rules
- **Cozy premium-casual** — same warm, friendly tone as UI packs
- **No text, no letters, no Pokémon, no copyrighted characters**
- **Transparent background** (alpha channel required)
- **Clean rounded shapes** — soft glow, no harsh edges
- **Watch-readable** — bold silhouettes, high contrast, not busy
- **Color palette:** Gold (#FCD34D), Warm white (#FFF7ED), Blue (#7BB4FF), Green (#4ADE80), Red (#F87171), Gray (#9CA3AF)

## Prompt Strategy

### Batch A — Catch Outcomes (2 sheets)
- `pgp_catch_success`: "sprite sheet 3x2 grid, 6-frame animation sequence, cozy game UI style, golden sparkle burst animation, white star particles expanding outward with soft glow ring, clean rounded shapes, gentle premium-casual aesthetic, transparent background, no text, no characters, no background scene"
- `pgp_catch_fail`: "sprite sheet 3x2 grid, 6-frame animation sequence, soft gray smoke puff animation, gentle particles fading outward, muted warm gray tones, cozy game UI style, clean rounded shapes, transparent background, no text, no characters, no background scene"

### Batch B — Spin Outcomes (2 sheets)
- `pgp_spin_success`: "sprite sheet 3x2 grid, 6-frame animation sequence, blue disc spinning animation, circular glow ring expanding, warm golden sparkle particles dropping from center, PokeStop-inspired circle flash, cozy game UI style, soft blue #7BB4FF and gold #FCD34D accents, transparent background, no text, no characters, no background scene"
- `pgp_spin_fail`: "sprite sheet 3x2 grid, 6-frame animation sequence, gray muted disc spinning animation, dull circular ring contracting, particles fading to nothing, muted gray tones #9CA3AF, cozy game UI style, soft disappointment vibe, transparent background, no text, no characters, no background scene"

### Batch C — Connection States (2 sheets)
- `pgp_connect`: "sprite sheet 3x2 grid, 6-frame animation sequence, three concentric Wi-Fi-like arcs pulsing inward, soft green glow #4ADE80, gentle pulse animation, cozy game UI style, rounded shapes, warm friendly tech vibe, transparent background, no text, no characters, no background scene"
- `pgp_disconnect`: "sprite sheet 3x2 grid, 6-frame animation sequence, three concentric arcs breaking outward, soft red pulse #F87171, arcs dissolving into particles, gentle fade to nothing, cozy game UI style, transparent background, no text, no characters, no background scene"

## Negative Prompt (all sheets)
> no text, no letters, no numbers, no words; no photorealistic, no 3D render, no AI artifacts; no harsh lighting, no neon, no metallic chrome; no cel shading, no anime, no pixel art; no background scene, no characters, no Pokémon, no creatures; no dark mode, no sharp edges; no mixed styles

## Processing Pipeline
Same v5 pipeline as other packs:
1. Generate via FAL at 1024×1024 square
2. Download → rembg background removal → verify alpha
3. Crop to content bounds + 2px padding
4. Resize to 512×512 (LANCZOS)
5. Verify: alpha channel present, 6 distinguishable frames, 70%+ fill
6. Deploy to `art/final/vfx/pgp/`

## Code Wiring (post-deploy)
- `art/final/vfx/pgp/catch_success.png` → referenced in `js/main.js` `_pickPgpVfxBucket('catch_success')`
- `art/final/vfx/pgp/catch_fail.png` → `_pickPgpVfxBucket('catch_fail')`
- `art/final/vfx/pgp/spin_success.png` → `_pickPgpVfxBucket('spin_success')`
- `art/final/vfx/pgp/spin_fail.png` → `_pickPgpVfxBucket('spin_fail')`
- `art/final/vfx/pgp/connect.png` → new `window.triggerConnectAnim()` 
- `art/final/vfx/pgp/disconnect.png` → new `window.triggerDisconnectAnim()`

## Verification
- [ ] All 6 sheets have alpha channel
- [ ] All 6 sheets have 6 distinguishable frames (3×2 grid)
- [ ] Fill percentage 70%+ per sheet
- [ ] Files deployed to gh-pages branch
- [ ] Cache-busted (?v=3) 
- [ ] Live test: Incognito → PGP mode → trigger catch_success → animation plays