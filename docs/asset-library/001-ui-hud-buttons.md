# Asset Pack 001 — UI HUD + Buttons
**Art Director: Pokégatchi**
**Priority: 1 (highest)**
**Status: SPEC — awaiting generation**

---

## 1. ASSET LIST

| # | Asset ID | Description | Size | Format | Backing |
|---|----------|-------------|------|--------|---------|
| A1 | `hud-stat-pill-bg` | Glass pill background for HUD stat bars (steps, spins, catches) | 160×30 | PNG | Transparent |
| A2 | `hud-stat-pill-hungry` | Hungry alert variant — warm orange glow | 160×30 | PNG | Transparent |
| A3 | `hud-stat-pill-bored` | Bored alert variant — cool blue glow | 160×30 | PNG | Transparent |
| A4 | `launcher-pokeball-idle` | Center Pokéball launcher — default idle state | 72×72 | PNG | Transparent |
| A5 | `launcher-pokeball-press` | Center Pokéball launcher — pressed/active state | 72×72 | PNG | Transparent |
| A6 | `launcher-pokeball-glow` | Soft radial glow for behind launcher (ambient) | 120×120 | PNG | Transparent |
| A7 | `btn-gear-idle` | Settings gear button — idle | 42×42 | PNG | Transparent |
| A8 | `btn-gear-press` | Settings gear button — pressed | 42×42 | PNG | Transparent |
| A9 | `btn-close` | Universal close/dismiss button (×) | 36×36 | PNG | Transparent |
| A10 | `btn-back` | Universal back arrow button | 36×36 | PNG | Transparent |
| A11 | `btn-confirm` | Confirm/check button | 44×44 | PNG | Transparent |
| A12 | `btn-tab-idle` | Bottom-sheet tab — idle state (Pokédex / Journal / Bag) | 64×64 | PNG | Transparent |
| A13 | `btn-tab-active` | Bottom-sheet tab — active/selected state | 64×64 | PNG | Transparent |
| A14 | `sheet-bg` | Bottom-sheet menu background panel | 340×180 | PNG | Transparent |
| A15 | `card-glass` | Generic glass card background (team card, overlays) | 280×80 | PNG | Transparent |
| A16 | `toggle-on` | Settings toggle — ON state | 52×28 | PNG | Transparent |
| A17 | `toggle-off` | Settings toggle — OFF state | 52×28 | PNG | Transparent |
| A18 | `alert-dot` | Small alert indicator dot (notification badge) | 12×12 | PNG | Transparent |

---

## 2. PROMPT SET

### BATCH 1 — Glass Components (A1–A3, A14–A15)
*Generate together: glass pill, sheet bg, card bg — same lighting/glass treatment*

#### A1 — `hud-stat-pill-bg`
```
A small horizontal UI pill background for a mobile game HUD, approximately 160x30 pixels. Warm parchment and wood UI style with soft forest atmosphere. The pill is a frosted glass rectangle with fully rounded pill ends (radius ~15px). It has a subtle warm cream inner glow, a thin 1px golden-brown border with soft opacity, and a faint wood-grain texture barely visible underneath the glass. The glass has a soft top-left highlight reflection. No text, no icons, no content inside. Transparent background. Cozy storybook game aesthetic, premium-casual mobile game UI, soft lighting, centered composition.
```

#### A2 — `hud-stat-pill-hungry`
```
Same pill shape and glass treatment as the base HUD pill, but with a warm orange-amber alert glow emanating from the center. The border shifts to a warm orange (#FF8E61 area) with higher opacity, and the inner glow is a soft radial warm orange. The wood-grain beneath is still visible. The glow is gentle and cozy, not alarming or neon. No text, no icons. Transparent background. Cozy mobile game UI component.
```

#### A3 — `hud-stat-pill-bored`
```
Same pill shape and glass treatment as the base HUD pill, but with a cool blue alert glow. The border shifts to a soft sky blue (#7BB4FF area) with higher opacity, and the inner glow is a soft radial cool blue. The wood-grain beneath is still visible. The glow is gentle and sleepy, not cold or clinical. No text, no icons. Transparent background. Cozy mobile game UI component.
```

#### A14 — `sheet-bg`
```
A bottom-sheet menu panel background for a mobile game, approximately 340x180 pixels. Warm parchment and wood UI style. Dark frosted glass panel with rounded top corners (24px radius), flat bottom edge. The glass is a deep navy-night (#0E1627) with 90% opacity, giving it a rich dark translucent quality. It has a subtle warm golden rim light along the top edge, and a very faint wood-grain pattern underneath. The glass has a soft top-center highlight. No text, no icons, no content inside. Transparent background. Premium-casual mobile game aesthetic, cozy storybook feel.
```

#### A15 — `card-glass`
```
A small glass card background for a mobile game HUD, approximately 280x80 pixels. Warm parchment and wood UI style. Rounded rectangle with 16px corner radius. The glass is translucent white (#FFFFFF) at 13% opacity — very light and airy. It has a subtle 1px white border at 20% opacity, a soft top-left highlight, and a faint warm cream inner glow. No wood texture on this one — it's a lighter, cleaner glass for team cards and stat displays. No text, no icons. Transparent background. Cozy premium-casual mobile UI.
```

---

### BATCH 2 — Launcher (A4–A6)
*Generate together: idle, pressed, ambient glow — must match perfectly*

#### A4 — `launcher-pokeball-idle`
```
A circular UI button for a mobile game, 72x72 pixels. Designed as a stylized Pokéball-inspired launcher button in warm parchment and wood UI style. The button is a perfect circle with a soft 3D pillowy look — it has a warm cream (#FFF7ED) main body with a subtle golden-brown horizontal dividing line across the center. The top half has a gentle highlight, the bottom half has a soft shadow. A small circular center button area is a warm golden-brown. The entire button has a subtle drop shadow beneath it. Cozy storybook aesthetic, premium-casual mobile game, soft rounded shapes, clean outlines. No sharp edges, no neon colors, no metallic chrome. Transparent background.
```

#### A5 — `launcher-pokeball-press`
```
The same circular Pokéball-inspired launcher button, 72x72 pixels, but in a pressed/depressed state. The button appears slightly flatter and pushed down — the highlight is dimmer, the drop shadow is smaller and tighter, and the overall button is scaled down by ~5% to simulate being pressed. The center button glows slightly warmer. The dividing line is slightly brighter. Transparent background.
```

#### A6 — `launcher-pokeball-glow`
```
A soft radial ambient glow to sit behind the launcher button, 120x120 pixels. The glow is a warm golden-cream radial gradient that fades to fully transparent at the edges. The center is a soft warm glow (#FCD34D at 30% opacity) fading outward. Very soft, very subtle — like a candlelit warmth. Not a harsh lens flare, not neon. Transparent background. Cozy storybook atmosphere.
```

---

### BATCH 3 — Icon Buttons (A7–A13)
*Generate together: gear, close, back, confirm, tabs — share outline weight and style*

#### A7 — `btn-gear-idle`
```
A circular settings gear icon button for a mobile game, 42x42 pixels. Warm parchment and wood UI style. The button is a frosted glass circle with the same glass treatment as the HUD pills. Inside, a simple gear icon rendered as a warm golden-brown line-art cogwheel with 6 rounded teeth. The gear has a subtle wood-grain texture. Clean readable silhouette, thick enough to read at watch size. No text. Transparent background. Cozy premium-casual mobile UI.
```

#### A8 — `btn-gear-press`
```
Same gear button, 42x42 pixels, but pressed. The glass circle darkens slightly, the gear icon appears to sink inward, and a subtle warm glow appears around the gear. The overall button scales down ~5%. Transparent background.
```

#### A9 — `btn-close`
```
A circular close/dismiss button for a mobile game, 36x36 pixels. Warm parchment and wood UI style. Frosted glass circle with a simple × (cross) mark in warm golden-brown. The cross has rounded tips and is centered perfectly. Clean silhouette, thick line weight. No text. Transparent background.
```

#### A10 — `btn-back`
```
A circular back arrow button for a mobile game, 36x36 pixels. Warm parchment and wood UI style. Frosted glass circle with a simple left-pointing arrow (← or chevron) in warm golden-brown. The arrow has rounded tips and is centered. Clean silhouette. No text. Transparent background.
```

#### A11 — `btn-confirm`
```
A circular confirm/check button for a mobile game, 44x44 pixels. Slightly larger than other icon buttons because it's a primary action. Warm parchment and wood UI style. Frosted glass circle with a subtle warm golden inner glow. Inside, a simple checkmark (✓) in warm golden-brown with rounded tips. The glass has a slightly more pronounced highlight than other buttons. Clean silhouette. No text. Transparent background.
```

#### A12 — `btn-tab-idle`
```
A bottom-sheet navigation tab icon button, 64x64 pixels, idle/unselected state. Warm parchment and wood UI style. Square with rounded corners (16px radius). The button is a subtle frosted glass square with very low opacity — almost invisible when idle. The icon area is reserved but empty (icon will be overlaid separately). A very faint golden-brown border at 10% opacity. No text, no icon content. Transparent background. Cozy premium-casual mobile UI.
```

#### A13 — `btn-tab-active`
```
Same tab button, 64x64 pixels, active/selected state. The frosted glass square is now fully visible with a warm cream inner glow. The border is brighter (golden-brown at 40% opacity). A subtle warm golden glow emanates from the center. The icon area is reserved but empty. No text. Transparent background. Cozy premium-casual mobile UI.
```

---

### BATCH 4 — Small Controls (A16–A18)
*Generate together: toggle states + alert dot — share material treatment*

#### A16 — `toggle-on`
```
A settings toggle switch in ON state for a mobile game, 52x28 pixels. Warm parchment and wood UI style. The toggle track is a rounded pill shape with a warm golden-brown fill (#E0B53A area) and a subtle wood-grain texture. The toggle knob is a warm cream circle (#FFF7ED) sitting on the right side, with a soft drop shadow. The track has rounded ends (14px radius). Clean silhouette, readable at small sizes. No text. Transparent background. Cozy storybook aesthetic.
```

#### A17 — `toggle-off`
```
Same toggle switch in OFF state, 52x28 pixels. The toggle track is a muted gray-brown with low opacity, giving a "sleeping" appearance. The toggle knob is a slightly dimmer cream circle sitting on the left side. The track still has rounded ends. No text. Transparent background. Cozy storybook aesthetic.
```

#### A18 — `alert-dot`
```
A tiny notification badge dot for a mobile game, 12x12 pixels. Warm orange-amber (#FF8E61) with a soft inner glow. The dot is a perfect circle with a subtle highlight in the top-left and a soft shadow beneath. It has a gentle pulsing quality conveyed through the soft radial gradient. Readable at tiny sizes. No text. Transparent background. Cozy premium-casual mobile UI.
```

---

## 3. NEGATIVE PROMPT GUIDANCE

Apply to **every** prompt in this pack:

```
no text, no letters, no numbers, no words, no UI labels, no fonts, no typography,
no neon, no harsh lighting, no metallic chrome, no sharp edges, no hard corners,
no photorealistic, no 3D render, no AI artifacts, no blurry edges, no pixelation,
no dark mode, no cool blue tones (except BORED alert variant),
no complex backgrounds, no gradients that clip to edge,
no inconsistent line weights, no mixed art styles, no cel shading,
no anime style, no pixel art, no vector flat design,
no drop shadows that extend beyond the asset boundary,
no real-world brand logos, no watermarks, no artist signatures
```

**Batch-specific negatives:**

- **Batch 1 (Glass):** no opaque backgrounds, no dark glass, no heavy wood grain, no cracks or damage
- **Batch 2 (Launcher):** no metallic sphere, no chrome, no 3D ball, no Pokéball center button detail, no red/white coloring
- **Batch 3 (Icons):** no complex icons, no multi-line symbols, no thin hairlines, no filled shapes
- **Batch 4 (Controls):** no skeuomorphic switches, no iOS-style toggles, no bright green ON states, no shadows outside the toggle track

---

## 4. NAMING CONVENTIONS

```
pokegatchi_ui_{component}_{state}_{size}.png
```

**Examples:**
```
pokegatchi_ui_hudpill_idle_160x30.png
pokegatchi_ui_hudpill_hungry_160x30.png
pokegatchi_ui_launcher_idle_72x72.png
pokegatchi_ui_launcher_press_72x72.png
pokegatchi_ui_launcher_glow_120x120.png
pokegatchi_ui_gear_idle_42x42.png
pokegatchi_ui_gear_press_42x42.png
pokegatchi_ui_close_idle_36x36.png
pokegatchi_ui_back_idle_36x36.png
pokegatchi_ui_confirm_idle_44x44.png
pokegatchi_ui_tab_idle_64x64.png
pokegatchi_ui_tab_active_64x64.png
pokegatchi_ui_sheet_bg_340x180.png
pokegatchi_ui_card_glass_280x80.png
pokegatchi_ui_toggle_on_52x28.png
pokegatchi_ui_toggle_off_52x28.png
pokegatchi_ui_alert_dot_12x12.png
```

**Destination directory:** `assets/ui/hud/`

---

## 5. GENERATION NOTES FOR CONSISTENCY

### Material Language
All glass components share the same frosted-glass treatment:
- Opacity: 13–22% (card-glass = 13%, sheet-bg = 90% dark, pills = ~20% light)
- Border: 1px solid, warm golden-brown (#C8A96E area), opacity 15–40% depending on state
- Highlight: soft top-left crescent, ~30% opacity white
- Drop shadow: soft, warm brown, 0–4px blur, 0–2px Y offset

### Wood Treatment
Where wood-grain appears (pills, sheet bg, toggle):
- Subtle horizontal grain lines, 2–3px spacing
- Color: warm brown (#8B6914 area) at 5–10% opacity
- Never dominant — glass effect is primary

### Color Palette (from DESIGN.md)
| Token | Hex | Usage |
|-------|-----|-------|
| bg-night | #172033 | Sheet background |
| bg-dusk | #2A3750 | Card backgrounds |
| card-glass | #FFFFFF22 | Glass components |
| card-line | #FFFFFF33 | Glass borders |
| alert-hungry | #FF8E61 | Hungry pill glow |
| alert-bored | #7BB4FF | Bored pill glow |
| instinct-yellow | #E0B53A | Toggle ON, warm accents |
| text-primary | #F9FBFF | Highlights |
| warm-cream | #FFF7ED | Launcher body, knob |
| muted-gold | #FCD34D | Glow center, ambient light |
| golden-brown | #C8A96E | Borders, icon line art |

### Outline Weight
All icon line art (gear, close, back, confirm): **2.5–3px** equivalent weight
All border lines: **1px** with soft opacity
All drop shadows: **0 2px 8px** at 15–25% opacity warm brown

### Silhouette Readability
- Every icon button must be recognizable as its shape (circle, square, pill) at 50% scale
- The gear must read as a gear at 21×21 (half size)
- The × must read as a close button at 18×18
- The checkmark must read at 22×22

---

## 6. BATCH STRATEGY

| Batch | Assets | Why Together | Generate Order |
|-------|--------|-------------|----------------|
| **B1 — Glass** | A1, A2, A3, A14, A15 | Same glass material, lighting, border treatment. Must feel like one family. | 1st |
| **B2 — Launcher** | A4, A5, A6 | Idle/press/glow must match perfectly. Same light source, same material. | 2nd |
| **B3 — Icons** | A7, A8, A9, A10, A11, A12, A13 | Same line weight, same glass circle treatment, same icon style. | 3rd |
| **B4 — Controls** | A16, A17, A18 | Toggle pair must match exactly; alert dot shares warm palette. | 4th |

### Cross-Batch Consistency Check
After all 4 batches are generated, run a cohesion review:
1. **Glass check:** Are B1 glass components and B3 icon-button glass circles using the same treatment?
2. **Color check:** Are all warm tones within the same family (golden-brown, cream, muted gold)?
3. **Shadow check:** Do all drop shadows share the same light direction (top-left)?
4. **Scale check:** Do all assets look correct at their intended display sizes side by side?

### Review Gate (from cohesion-gate)
- [ ] All assets are transparent-background PNGs
- [ ] No text present in any asset
- [ ] Glass treatment consistent across all batches
- [ ] Color palette matches DESIGN.md tokens
- [ ] All silhouettes readable at 50% scale
- [ ] No mixed art styles within the pack
- [ ] Edge boundaries clean — no clipped shadows or glow overspill

---

*Generated: 2026-07-15 — Pokégatchi Art Director — Spec only, awaiting generation run*