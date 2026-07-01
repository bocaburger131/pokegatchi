# TamaGo — Creative Brief for @alchemist (v3 — Cats & Soup Pokemon)

## Project Identity

TamaGo is a Pokemon Go companion that lives on your wrist. It looks and feels like a Pokemon designed in the **Cats & Soup** art style — cozy, whimsical, soft pastels, thick outlines, and chibi proportions. Each evolution stage should feel like discovering a new Pokemon in a storybook.

**Core directive:** This creature must feel like it could be a real Pokemon species, drawn by an artist who loves Cats & Soup.

---

## Primary Art Style — Cats & Soup

| Element | Cats & Soup Rule | Applied to Trappix |
|---|---|---|
| **Proportions** | Oversized head, tiny body, minimal limbs | Head is 60% of total height, body is a squishy oval, stubby limbs barely visible |
| **Outlines** | Thick, textured black lines (inverted hull) | Consistent 3-4px dark outline around everything, same thickness |
| **Colors** | Muted pastels, low contrast, no pure whites or blacks | Soft lavender bodies, warm cream bellies, dusty rose cheeks |
| **Shading** | Soft watercolor gradient blends, no hard cell shade | Gentle radial gradients from center, shadows are slightly darker pastel tones |
| **Eyes** | Simple dot eyes, minimal iris detail | Black dot + one small white highlight. No complex pupils unless excited |
| **Mouth** | Tiny "o" or subtle line, never exaggerated | Small curve, never opens wide |
| **Background** | Cozy magical everyday settings | Watch BG: soft starry night in muted indigo, warm glow behind pet |
| **Vibe** | Gentle, sleepy, comforting, whimsical | The pet feels warm to the touch. It's your cozy companion. |
| **Texture** | Hand-drawn feel, slight imperfection | Edges slightly fuzzy, gradients have subtle noise |

---

## The Creature: "Trappix" — Cats & Soup Edition

A cozy Electric/Psychic-type Pokemon that forms a symbiotic bond with Pokemon Go trainers. It feeds on catch energy and communicates through gentle sparks.

### Evolution Line (Silhouette-Driven)

| Stage | Name | Silhouette | Cats & Soup Feel |
|---|---|---|---|
| **Egg** | — | Perfect oval, pokeball dividing line | Like a decorated Easter egg, soft lavender with a cream stripe |
| **Baby** | **Trappup** | Mushroom shape — huge round head, tiny body blob | A sleepy baby in a onesie, one eye barely open |
| **Teen** | **Trappix** | Teardrop — head still big, body lengthened, nub tail appears | A kitten sitting up, curious but still drowsy |
| **Adult** | **Trappix** | Fox-like — tail curves up, small ears, proud but gentle | A fox curled on a cushion, wise and warm |
| **Mega** | **Mega Trappix** | Floating jellyfish — trails below, halo above | A glowing nightlight, floating in a dream |

### Color Strategy (Soft Pastel)

| Element | Fixed or Variable | Pastel Equivalent |
|---|---|---|
| Body base | Variable (seeded) | `#C4B5FD` (soft lavender) to `#F9A8D4` (soft pink) |
| Belly | Always warm cream | `#FFF7ED` (warm cream, not white) |
| Ear/tail tips | Darker pastel shade | `#8B5CF6` (dusty violet) |
| Eyes | Warm brown/black dot | `#4A3728` (soft brown) |
| Cheek blush | Dusty rose | `#FDA4AF` |
| Crown marking | Soft gold | `#FCD34D` (muted gold, not bright) |
| Energy sparks | Soft yellow | `#FEF08A` (warm butter) |

---

## Trappix Pokedex Entry (Cats & Soup Version)

```
Type: Electric / Psychic
Species: The Nap Helper Pokemon
Height: 0.3m (Baby) → 0.6m (Adult)
Ability: Comatose / Synchronize

"This Pokemon emits a gentle warmth that helps trainers relax
after a long day of catching. It purrs softly when near Pokestops
and sparks gently when a Pokemon is caught. It prefers to nap
in sunny spots and only opens its eyes fully for special moments."
```

---

## Expression & Animation Style (Muted & Cozy)

Unlike Pokemon's energetic expressions, Cats & Soup style is **gentle and understated**. Emotions are shown through subtle body changes, not big face changes.

| Emotion | Face | Body Language |
|---|---|---|
| Happy | Eyes become soft arcs (^_^), tiny smile | Gentle sway, slow sparkles float up |
| Content | Dot eyes, half-lidded | Relaxed, maybe a tiny wiggle |
| Hungry | Eyes slightly wider, tiny "o" mouth | Leans forward slightly toward food |
| Sad | Eyes downturned (u_u), no mouth | Crouches slightly smaller, dimmer glow |
| Excited | Eyes become star dots (*_*), cheeks glow | Soft bounce, more sparkles, tail wags |
| Sleepy | Lines for eyes ( - _ - ), head droops | Slow wobble, almost falling asleep standing |
| Purring | Content squint, tiny heart appears | Gentle vibration in outline |

---

## Animation Spec

### Lottie — Technical

- **Format:** Lottie JSON (After Effects → bodymovin)
- **Framerate:** 24fps (slower = cozier)
- **Resolution:** 240×240
- **Outlines:** Must preserve thick outline even in motion
- **Colors:** sRGB, no neon, no pure white
- **File size:** < 50KB per animation
- **Loop type:** Seamless ping-pong for idles

### Animation Priority

1. **Egg idle + hatch** — first thing users see
2. **Baby idle + happy** — defines the soul
3. **Caught reaction** — core gameplay feedback
4. **Fled reaction** — core gameplay feedback
5. **Pet reaction** — direct interaction response
6. **Feed reaction** — nom animation
7. **Spun reaction** — stop reward
8. **Evolution + Teen form** — milestone moment
9. **Adult + Mega forms** — aspirational content
10. **Mini-game reactions** — Pet & Coo, Berry Catch, Peek-a-Boo

---

## Reference Generation Prompts (for Product Visionary)

Feed these to your image generator to create reference material:

### 1. Baby Trappup — Cats & Soup Pokemon
> *"A baby Pokemon drawn in the Cats & Soup art style. It has an oversized round soft lavender head and a tiny cream-colored body, one single dot eye barely open, tiny stubby limbs, a small nub tail with a pokeball tip, soft dusty rose blush on cheeks, tiny yellow sparkles floating around it. Very cozy sleepy kawaii aesthetic, thick black outlines, soft watercolor shading, muted pastel colors, warm gentle lighting, storybook illustration style, sits on a dark round watch screen, extremely cute"*

### 2. Full Evolution Line — Storybook Page
> *"Four stages of a purple Electric/Psychic Pokemon in Cats & Soup style arranged left to right: Stage 1 a lavender oval egg with a cream stripe, Stage 2 a baby with huge round head and tiny body one dot eye glowing softly, Stage 3 a teen with two eyes a tiny tail and small ears, Stage 4 an adult fox-like form with a gold crown marking and curled tail. All have thick black outlines, soft muted pastel colors, watercolor shading, cozy storybook illustration style, white background"*

### 3. Emotion Sheet — Cozy Expressions
> *"A grid of 6 poses of a baby purple Pokemon in Cats & Soup style: Happy (eyes as soft arcs ^_^, tiny smile), Content (dot eyes, relaxed), Hungry (wider eyes, tiny o mouth), Sad (u_u eyes, droopy), Excited (star dot eyes * _ *, sparkles), Sleepy (line eyes - _ -, head drooping). All have thick black outlines, soft pastel colors, cozy kawaii aesthetic, simple and gentle, no sharp emotions"*

---

*For @alchemist: Reference the Cats & Soup game art for line weight, color palette, and expression approach. The pet should feel like it could be sold as a plushie.*
