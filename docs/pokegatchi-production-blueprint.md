# Pokégatchi Production Blueprint (Watch-First + Web Lane)

**Scope:** Complete implementation blueprint for UI, gameplay-animation orchestration, sprite pipeline, event naming, and alpha readiness.

**Product premise:** Pokémon GO Plus + Tamagotchi hybrid with accessory-origin catch/spin rewards feeding an emotional pet loop.

---

## A) Core Experience Pillars

1. **Emotional Bond Loop**
   - Needs drive interaction: hunger, boredom, dirtiness, sickness.
   - Player emotion target: care, attachment, pride.
2. **Reward-to-Reaction Loop**
   - Accessory events become inventory + visible pet reaction + journal story.
   - Player emotion target: momentum, surprise, “my pet is alive.”
3. **Watch-Speed UX**
   - 1–2 tap actions, large hit targets, no deep nesting for primary care loop.
4. **Consistent Animation Language**
   - Same motion vocabulary across pet, HUD, rewards, and menus.
5. **Reusable Multi-Pet Framework**
   - Species-specific tuning via tables, not branch-heavy code.

---

## B) Full Game Feature Breakdown

- Pet simulation: hunger/happiness/affection/boredom/dirtiness/sickness
- Item economy: berries/toys/potions/candy + endgame rewards
- Accessory ingest: catch/spin success/fail events
- Inventory/bag capacity and expansion
- XP, level, unlocks (pets/features/cosmetics)
- Journal (event log + milestones)
- Pokedex/roster and species switching
- Team theming (Valor/Mystic/Instinct)
- Settings (PGP mode, visuals, vibration, effects)

---

## C) UI Screen Map

1. **Startup/Splash** → 2. **Team Identity** → 3. **Main Pet HUD**
4. **Quick Menu Launcher**
   - Pokédex
   - Journal
   - Bag
5. **Bag Overlay**
   - Item list
   - Use/inspect actions
   - Capacity meter
6. **Journal Overlay**
   - Log / Today / Milestones tabs
7. **Settings Panel**
8. **Unlock Reveal Modal**
9. **Failure/Recovery Modal** (critical sickness, revive flow)

---

## D) Animation State Machine (Pet/UI/World)

### Pet State Machine (separate from gameplay state)
- `pet_idle_relaxed`
- `pet_idle_alert`
- `pet_need_hungry`
- `pet_need_bored`
- `pet_need_dirty`
- `pet_need_sick`
- `pet_action_feed`
- `pet_action_play`
- `pet_action_clean`
- `pet_action_heal`
- `pet_react_reward`
- `pet_sleep`
- `pet_levelup`
- `pet_unlock_reveal`

### UI State Machine
- `ui_launcher_closed/open`
- `ui_panel_bag_open/closed`
- `ui_panel_journal_open/closed`
- `ui_panel_pokedex_open/closed`
- `ui_toast_enter/hold/exit`

### World/FX State Machine
- `fx_reward_idle`
- `fx_catch_burst`
- `fx_spin_burst`
- `fx_need_warning_pulse`
- `fx_scene_mood_shift`

---

## E) Trigger/Event Matrix + Naming Conventions

### Gameplay Event Naming Convention
`pg.game.<domain>.<verb>[_<result>]`

Examples:
- `pg.game.pet.feed`
- `pg.game.pet.clean`
- `pg.game.accessory.catch_success`
- `pg.game.accessory.spin_fail`
- `pg.game.progress.level_up`
- `pg.game.unlock.awarded`

### Animation ID Naming Convention
`anim.<layer>.<subject>.<action>[.<variant>]`

Examples:
- `anim.pet.squirtle.feed.loop`
- `anim.ui.launcher.open`
- `anim.fx.reward.catch.success`

### Sprite Sheet Naming Convention
`{subject}_{action}_{variant}_{frames}f_{size}px_v{n}.png`

Examples:
- `pikachu_feed_main_08f_512px_v1.png`
- `ui_bag_open_default_12f_1024px_v2.png`

---

## F) Sprite Sheet Shot List

### Pet (MVP)
- idle_relaxed, idle_alert
- hungry, bored, dirty, sick reactions
- feed, play, clean, heal actions
- reward_react
- sleep_in, sleep_loop, wake
- levelup

### Items
- berry_use, toy_use, potion_use, candy_use
- reward_drop_common, reward_drop_rare

### UI
- launcher open/close
- bag panel open/close
- journal tab switch
- toast enter/exit
- button press/confirm

### FX
- catch_success burst
- spin_success burst
- fail puff
- unlock flare

---

## G) FTUE Storyboard

1. Brand splash (1.2s)
2. Team select pulse (Valor/Mystic/Instinct)
3. Starter pet reveal (hero pose)
4. “Your pet is hungry” guided feed
5. “Your pet is bored” guided toy
6. First accessory reward simulation
7. Journal entry reveal
8. End FTUE: “Daily care keeps your buddy thriving”

---

## H) Daily Session Storyboard

1. Open app → idle pet reads mood
2. Need badge shows (hungry/bored/dirty)
3. Player uses bag item
4. Accessory sync event arrives
5. Reward celebration + pet reaction + journal log
6. XP ticks and unlock check runs
7. Player checks milestones
8. Exit with state saved and catch-up timestamp

---

## I) Bag/Inventory Interaction Design

- **Purpose:** satisfying tactile use flow, not spreadsheet menu
- **Core interactions:** tap item → quick preview → confirm use (single tap for common)
- **Capacity UX:** progress ring + “+slot” unlock hints
- **Animation:** panel slide + item card pop + pet reaction chain
- **Fallback:** if item animation missing, use generic icon pulse + toast
- **Priority:** P0

---

## J) Accessory Reward Pipeline

1. Accessory event ingest (`catch_success|fail`, `spin_success|fail`)
2. Replay protection check (`eventId` dedup window)
3. Simulation dispatch
4. Inventory mutation
5. Pet reaction animation dispatch
6. HUD/toast update
7. Journal log append
8. XP/unlock recalculation
9. Persist save snapshot

---

## K) Edge Cases / Failure Modes

- Duplicate accessory packets (replay) → ignore duplicate `eventId`
- Offline long gap catch-up too harsh → cap + softened decay profile
- Zero inventory item use → error toast + no state mutation
- Corrupt save JSON → recover to safe defaults + mark telemetry flag
- Missing sprite sheet → fallback animation token set

---

## L) JavaScript/Three.js Implementation Plan

### Runtime Layers
1. **Simulation Layer** (`SimulationEngine`) – gameplay truth
2. **Event Layer** (`EventBus`) – canonical game events + action log
3. **Presentation Layer** (`main.js`, SceneManager, HUD) – subscribes, never owns core balance
4. **Persistence Layer** (`SaveManager`) – schema version + migrations

### Rules
- No direct gameplay balance literals in UI handlers
- All player actions become `dispatchGameplay(...)`
- Journal/HUD/scene reactions derive from gameplay events only

---

## M) Recommended Folder Structure

```text
js/
  game/
    balance/
      species.balance.json
      items.balance.json
      actions.balance.json
      progression.balance.json
    events/
      eventNames.js
      EventBus.js
      replayGuard.js
    sim/
      SimulationEngine.js
      decayProfiles.js
      unlockRules.js
    save/
      SaveManager.js
      migrations/
        v1_to_v2.js
        v2_to_v3.js
  ui/
    hud/
    panels/
    toasts/
  scene/
    SceneManager.js
    ExpressionOverlay.js
assets/
  sprites/
    pets/{species}/
    items/
    ui/
  fx/
  audio/
```

---

## N) Missing Systems To Build Next

1. **ReplayGuard** for accessory-origin events (`eventId` + TTL dedup)
2. **Catch-up decay profile** (piecewise fairness for long inactivity)
3. **Balance JSON loading** (move remaining JS object tables to data files)
4. **Automated migration tests** with malformed historical fixtures
5. **Animation fallback registry** (per event, per asset missing)

---

## O) Alpha Readiness Checklist

### Required Gameplay States
- [ ] hunger/happiness/affection/boredom/dirtiness/sickness validated
- [ ] XP + level + unlock checks validated
- [ ] bag capacity constraints validated

### Required Triggers
- [ ] `pg.game.pet.*` actions wired
- [ ] `pg.game.accessory.*` events wired
- [ ] replay dedup in place

### Required Assets (MVP)
- [ ] pet core sheets (idle/need/action)
- [ ] reward FX sheets (catch/spin/fail)
- [ ] UI panel and button state sheets

### Required UX
- [ ] watch-friendly tap targets
- [ ] no dead-end modal/panel transitions
- [ ] journal reflects all gameplay events

### Required Reliability
- [ ] save schema migration tests pass
- [ ] long-inactivity catch-up tests pass
- [ ] accessory replay tests pass

---

## 30-System Implementation Matrix (Purpose/Emotion/Triggers/Priority)

> Compact matrix for production tracking. Each row has concrete entry/exit + animation class + fallback.

| # | System | Purpose | Emotion Target | Entry Trigger | Exit Trigger | Animation Type | Duration | Sound | Fallback | Priority |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Startup | establish quality | delight | app launch | team screen shown | logo fade + parallax | 900–1400ms | soft chime | static logo | P0 |
| 2 | Intro | establish bond | wonder | first launch | pet revealed | reveal burst + pet pose | 1.5–2.2s | sparkle swell | generic reveal | P0 |
| 3 | Idle loop | living pet baseline | comfort | no active action | action starts | subtle sprite loop | 2–4s cycle | low ambience | 2-frame bob | P0 |
| 4 | Emotion react | readability of needs | empathy | stat threshold crossed | need resolved | icon + face shift | 350–900ms | chirp cues | icon pulse only | P0 |
| 5 | Feed | satisfy hunger | care | use berry/feed action | hunger update complete | squash/stretch + nibble | 700–1200ms | munch | bar gain + toast | P0 |
| 6 | Play | reduce boredom | joy | toy action | boredom drop done | bounce + confetti | 700–1300ms | toy pop | HUD pulse | P0 |
| 7 | Clean | reduce dirt | relief | clean action | dirtiness lowered | wipe overlay + sparkle | 900–1400ms | water swish | cleanliness icon | P0 |
| 8 | Sleep | rest rhythm | calm | sleep schedule/manual | wake trigger | dim fade + breathe | 1.2–2.5s | lull tone | opacity dim | P1 |
| 9 | Level up | progression feedback | pride | xp crosses threshold | reward shown | ring pulse + badge rise | 1.1–1.8s | level fanfare | toast only | P0 |
| 10 | Unlock reveal | new content payoff | excitement | unlock rule true | reveal dismissed | curtain open + flare | 1.6–2.4s | reveal swell | modal text only | P0 |
| 11 | Bag UI | item operations | control | bag open | bag close | panel slide + card settle | 220–380ms | soft click | plain list | P0 |
| 12 | Item use | direct impact | satisfaction | item confirm | effect applied | card pop + pet react | 450–1000ms | use sfx | instant stat update | P0 |
| 13 | Journal | memory/progress | reflection | journal open | close/switch tab | tab slide + row fade | 180–300ms | paper tick | text list | P1 |
| 14 | Pokedex | roster identity | collection urge | pokedex open | species selected | card carousel | 220–420ms | select ping | plain grid | P1 |
| 15 | Toasts | concise feedback | clarity | gameplay event emit | timeout | slide/fade | 700–1800ms | cue per type | text only | P0 |
| 16 | Buttons | tactile confidence | responsiveness | press | release | depress + glow | 80–160ms | tap | color change only | P0 |
| 17 | Scene mood | contextual world | immersion | time/mode/state change | next scene event | bg crossfade | 500–1400ms | ambient morph | hard swap | P1 |
| 18 | Accessory sync | external progress | momentum | accessory packet | event consumed | sync pulse icon | 180–350ms | sync chirp | status dot | P0 |
| 19 | Catch/spin reward | celebrate loop | excitement | reward success | reward settled | burst particles | 800–1300ms | burst cue | icon pop | P0 |
| 20 | Failure states | preserve stakes | concern | low/sick/death conditions | recover/revive | desat + droop | 600–1800ms | minor/danger cues | warning toast | P0 |
| 21 | Menu transitions | smooth flow | polish | panel switch | panel ready | shared easing motion | 160–320ms | subtle whoosh | instant switch | P1 |
| 22 | Full session storyboard | holistic cadence | engagement | session start | session end | scripted sequence | variable | layered cues | checklist mode | P1 |
| 23 | Sprite sheet reqs | production scope | confidence | art planning | backlog locked | n/a | n/a | n/a | placeholder atlas | P0 |
| 24 | Anim state machine | deterministic behavior | trust | runtime update | state transition | rule-driven dispatch | tick-based | n/a | default anim map | P0 |
| 25 | Trigger/event names | integration consistency | reliability | action dispatch | handler complete | n/a | n/a | n/a | alias map | P0 |
| 26 | Audio mapping | reinforce visuals | immersion | any anim/event | clip done | event-based playback | 80–1500ms | mapped cues | silent mode | P1 |
| 27 | UX pitfalls | prevent frustration | trust | edge case | safe fallback | n/a | n/a | n/a | defensive defaults | P0 |
| 28 | Accessibility | readability on small screens | comfort | render cycle | user setting change | contrast/font scaling | instant–200ms | optional cues | high-contrast mode | P0 |
| 29 | Performance | stable frame pacing | confidence | scene/action heavy load | frame recovery | LOD/fx throttles | adaptive | n/a | disable heavy fx | P0 |
| 30 | Cosmetic monetization | long-term sustain | expression | store open/equip | purchase/equip done | preview spin + shine | 600–1400ms | boutique cue | static preview | P2 |

---

## Minimum Viable Sprite Sheets First (P0)

1. `pet_idle_relaxed`
2. `pet_need_hungry`
3. `pet_need_bored`
4. `pet_need_dirty`
5. `pet_action_feed`
6. `pet_action_play`
7. `pet_action_clean`
8. `pet_action_heal`
9. `fx_catch_success`
10. `fx_spin_success`
11. `ui_launcher_open_close`
12. `ui_bag_open_close`
13. `ui_button_states`

## Polish-Later Animation Set (P1/P2)

- idle micro-variants by time/weather
- pet personality idles per species
- unlock cinematic camera moves
- rarity-tier reward choreography
- cosmetic equip flourish sequences

## Reusable AI Prompt Seeds (Art)

- **Pet Idle:** “storybook cozy 2D sprite sheet, {species}, front-facing, subtle breathing loop, clean alpha, 8 frames, consistent palette, no background”
- **Need Reaction:** “{species} hungry/bored/dirty expression set, readable at watch size, bold silhouette, 6-frame reaction, transparent background”
- **Action Feed/Play/Clean:** “{species} {action} animation sheet, squash-and-stretch timing, 8–12 frames, game UI-ready alpha PNG”
- **Reward FX:** “catch reward burst particles, magical but clean readability, layered transparent sprite sheet, 10 frames”
- **UI Panel Motion Frames:** “storybook parchment game UI panel open/close transitional states, premium bevel, alpha PNG sequence”
