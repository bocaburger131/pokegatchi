# SHIFT4FUNDING — Sprint 0 Research Brief

> **Author:** @researcher
> **Team:** See full roster below
> **Status:** Sprint 0 — Foundational Design
> **Goal:** Define the game systems, data sources, personalization model, and build roadmap for the SHIFT4FUNDING companion pet (Wear OS app + Hardware device).

---

## 1. The Dream Team

| Codename | Role | What They Own |
|---|---|---|
| `@researcher` | Gameplay Strategist | Game design, data mining, personalization, event strategy — the soul of the pet experience |
| `@architect` | Companion Architect | Full system integration, BLE + Tamagotchi engine + UI layers across both platforms |
| `@alchemist` | Pixel Alchemist | All animations — Lottie (Wear OS) + frame strips (ESP32) |
| `@weaver` | Behavior Weaver | Tamagotchi personality engine, mood, evolution state machine |
| `@whisperer` | BLE Whisperer | PGP certification handshake, key extraction, BLE GATT server on both platforms |
| `@wearable` | Wearable Alchemist | Kotlin + Jetpack Compose for Wear OS, tiles, complications, background services |
| `@sorcerer` | Embedded Sorcerer | ESP32-S3 firmware, NE71 teardown, LCD drivers, custom PCB design |
| `@enchanter` | UX Enchanter | Emotional interaction design, gesture systems, evolution ceremonies, tactile feedback |
| `@growth` | Growth Alchemist | Post-launch content drops, animation packs, seasonal events, in-pet rewards |
| `@gametester` | Game Test Agent | Systematic QA playthroughs, bug reproduction, console-error capture, and handoff feedback to all build agents before merge/release |

---

## 2. Available Data Sources

### 2.1 PGP BLE Protocol (Real-time)

From the reverse-engineered protocol, the Pokemon Go Plus sends distinct notification patterns via BLE notifications:

| LED Pattern | Meaning | What We Can Do |
|---|---|---|
| Flashing green | Pokemon nearby — tap to catch | Show "wild Pokemon nearby" animation + quick-time Catch Assist event |
| Flashing blue | Pokestop nearby — tap to spin | Show "stop nearby" animation |
| Solid green | Pokemon caught successfully | Celebration animation, +weight, +happiness, record species |
| Solid red | Pokemon fled | Sad animation, tap to comfort → +bond |
| Triple flash (green > yellow > red) | Cannot connect/error | Error state animation |
| Solid blue | Stop spun successfully | Berry animation, +food/happiness |
| Rapid red (3x) | Bag/box full | Storage full warning animation |

**What PGP BLE does NOT give us:** species name, CP, shiny status, costume, or buddy info. The BLE protocol only signals event type (nearby/caught/fled/spun). For detailed data, we need the companion app layer.

### 2.2 Phone Companion App (Rich Data)

An Android companion app (installed on the phone) can access:

| Source | How | What It Gives Us |
|---|---|---|
| **NotificationListenerService** | Intercept Pokemon Go push notifications | Pokemon species name, CP, shiny status(!), costume details, location |
| **Pokemon Go calendar** | Hard-coded event dates (updated via companion app) | Community Day dates, Go Fest, Spotlight Hours, seasonal events |
| **Phone storage (media)** | Screenshot detection (optional) | Could scan for Pokedex screenshots — low priority |
| **Google Calendar / OS events** | Calendar permissions | User's personal events (optional: pet reacts to "Busy" status) |

**Notification data is the gold mine.** The Pokemon Go notification when you catch something typically reads:

> *"You caught a ✨ Shiny ✨ Pikachu! CP 867"*

We parse this → trigger species-specific pet reaction, unlock costume item if costumed, sparkle animation if shiny.

### 2.3 Hardware Device (Limited)

The ESP32-S3 device has no companion phone — it only gets PGP BLE signals. Data is limited to event types (caught/fled/spun/nearby). No species, no shiny, no CP.

**Implication:** The hardware device has a simpler but still compelling Tamagotchi experience. Richer data is exclusive to the Wear OS + phone companion ecosystem.

---

## 3. The IV & Growth System

### 3.1 Hidden Stats (IVs)

Every pet is born with **random base IVs** (1-31, like real Pokemon) plus **trainable stats**:

| Stat | Base IV | Trainable | Increased By | Decreased By | Visual Effect at High |
|---|---|---|---|---|---|
| **Weight** | Random (1-31) | Yes | Feeding mini-games, berry catches | Training mini-games | Pet gets visibly buffer / larger sprite |
| **Happiness** | Random (1-31) | Yes | Playing, petting, successful auto-catches | Ignoring, Pokemon fleeing, idle time | Glowing aura, sparkles, faster animations |
| **Intelligence** | Random (1-31) | Yes | Simon Says, Memory Wall, Echo Chamber | — | Different evolution branches, "smart" idle animations |
| **Agility** | Random (1-31) | Yes | Fetch, Obstacle Swipe, Combo Punch | — | Faster reaction frames, catch assist bonus |
| **Bond** | Starts at 10 | Yes | All interactions over time, comforting after flees | Long absence (24h+) | Unique bond evolutions, unlocks special interactions |
| **Discipline** | Random (1-31) | Yes | Meditation Circle, Calm Down, Rhythm Tap | — | Pet obeys commands faster, better combo execution |

### 3.2 Evolution Branches

Evolution is triggered by **cumulative catch milestones** (100 / 500 / 1000 catches), but the **form** is determined by which stats are highest.

| Stage | Catch Milestone | Form Determined By |
|---|---|---|
| Baby → Teen | 100 catches | Happiness + Bond (caring path) OR Intelligence + Agility (training path) |
| Teen → Adult | 500 catches | All stats — branching opens based on highest 2 |
| Adult → Mega | 1000 catches | Full IV + stat history — unique form per user |

**Example branches (Adult):**
- High Happiness + High Bond → "Sunny" form — warm colors, glow effects, comforting idle animations
- High Agility + High Intelligence → "Storm" form — sharp angles, speed lines, energetic animations
- High Weight + High Discipline → "Mountain" form — bulky sprite, slow deliberate movements, tanky
- Balanced → "Prism" form — shimmering, shifts colors subtly, all-around animations

### 3.3 Seeding Uniqueness (Hidden Seed)

When the device/app first pairs with the user's Pokemon Go account (via companion), we generate a **unique seed** based on:

```
seed = hash(account_id + first_catch_time + initial_buddy_species)
```

This seed determines:
- Base IVs (1-31 per stat)
- Starting color palette variation (3-4 shades off the "standard")
- Personality traits (e.g., "Lazy" = slower happiness decay but slower training gains)
- Favorite mini-game (slight score bonus in one random game)
- Evolution branch preferences (subtle weighting toward certain paths)

**Two users can have the same pet species but completely different experience.**

---

## 4. Mini-Game Complete Library

### 🥚 Baby Stage (Easy — Bonding)

| Mini-Game | Mechanic | Trains | Notes |
|---|---|---|---|
| **Pet & Coo** | Tap the pet repeatedly. It reacts: giggles, rolls, nuzzles. | Happiness | Simplest interaction. Every few taps triggers a new animation. |
| **Berry Catch** | Single berry bounces across screen. Tap it. Pet eats it. | Weight (Feed) | Teaches tap timing. Only one berry at a time. |
| **Peek-a-Boo** | Pet covers eyes. Tap after 2-3 seconds to reveal. Happy face. | Bond | Tap too early = pet "not ready yet" animation. Tap too late = pet peeks sadly. |
| **First Steps** | Swipe left/right. Baby pet wobbles in that direction. | Agility | Simple directional input. Pet's legs are unsteady — charming wobble animation. |

### 🧒 Teen Stage (Medium — Coordination)

| Mini-Game | Mechanic | Trains | Notes |
|---|---|---|---|
| **Fetch** | Swipe in a direction to "throw" a ball. Pet runs there. Tap it when it returns. | Play / Bond | Return speed varies with Agility stat. Higher Agility = faster return. |
| **Simon Says** | 3 colored dots flash in a sequence. Repeat by tapping. Gets longer. | Intelligence | Classic memory game. 3 → 5 → 8 → 12 sequences. |
| **Target Tap** | Circles appear at random positions. Tap them before they vanish. | Agility | Speed increases per round. Miss 3 = game over. |
| **Berry Blitz** | Pet shows a "craving" (color icon). Tap the matching berry from 3-4 flying across. | Weight (Feed Focus) | Wrong berry = pet spits it out unhappily. Right = big happiness + weight. |
| **Jump Rope** | Pet jumps in place. Tap in rhythm to keep the rope swinging. | Discipline + Agility | Simple: steady tap (1/sec). Mistap = rope catches. 10 jumps = win. |

### 🦸 Adult Stage (Hard — Mastery)

| Mini-Game | Mechanic | Trains | Notes |
|---|---|---|---|
| **Combo Punch (Color Boxing)** | Colors flash on screen in sequence. Tap the matching color **in order**. Speed increases. | Agility + Intelligence | Your boxing idea. Gets intense — 5-color sequences at high speed. |
| **Bonding Dance** | Pet starts a rhythm. Tap along. Perfect streak = special celebration animation. | Bond + Discipline | Visual pulse guides timing. Higher Discipline = wider timing window. |
| **Obstacle Swipe** | Pet runs forward. Swipe UP (jump), DOWN (slide), LEFT/RIGHT (dodge). | Agility | Obstacles come faster. Longer survival = higher score. |
| **Memory Wall** | 4x4 grid. Pet shows a pattern (tiles light up). Tiles flip. Recreate pattern. | Intelligence | Starts at 3 tiles, goes up to 8. Grid scrambles slightly at higher levels. |
| **Jump Rope Pro** | Pet jumps faster. Double-tap rhythm (2/sec). Stop or mistap = rope catches. | Discipline + Agility | 20+ jumps required. Advanced version. |

### 🌟 Mega Stage (Expert — Peak)

| Mini-Game | Mechanic | Trains | Notes |
|---|---|---|---|
| **Rapid Fire** | Screen fills with targets: RED = tap, BLUE = dodge (swipe away), GREEN = tap-hold-release. Rapid combinations. | Full Reaction | Combat training. 60-second gauntlet. |
| **Meditation Circle** | A dot moves in a complex Lissajous curve. Keep your finger on it. Deviate = penalty. | Discipline | Teaches patience. The calmer you are, the higher the score. |
| **Echo Chamber** | 10+ move sequence (taps + swipes + holds). Memorize and replicate it fully. One mistake = restart. | Intelligence + Memory | The ultimate memory challenge. Sequences are procedurally generated. |
| **Jump Rope Master** | Variable rhythm — rope speeds up and slows down unpredictably. Your taps must match. | Discipline + Agility | 50 jumps to complete. Pet's face shows focus/concentration. |

---

## 5. Pokemon Go Integration System

### 5.1 Real-Time Reactions

| In-Game Event | Pet Reaction | Data Source |
|---|---|---|
| Pokemon caught | Celebration animation + species silhouette (squad formation briefly) | PGP BLE (caught signal) |
| Shiny caught | Sparkle overload — pet glows for 24h, special shiny dance | Companion notification |
| Costume Pokemon caught | Unlock that costume item for your pet permanently | Companion notification |
| Pokemon fled | Sad animation. Tap to comfort → Bond increases. | PGP BLE (fled signal) |
| Buddy Pokemon | Your in-game buddy appears beside your pet on screen | Companion (reads buddy data) |
| Pokestop spun | Pet gets a "berry" animation, happiness + weight | PGP BLE (spun signal) |
| Bag full | Pet shows "storage full" concern animation | PGP BLE (red rapid pattern) |

### 5.2 Event Calendar Integration

| Event Type | How We Know | Pet Behavior |
|---|---|---|
| Community Day (monthly) | Hard-coded dates in companion app | Pet wakes with "event ready" animation, special outfit, readiness badge |
| Spotlight Hour (weekly) | Hard-coded | Pet gets "bonus hour" glow for 60 minutes |
| Go Fest (annual) | Companion app update | Premium event outfit, exclusive mini-game |
| Season change (every 3 months) | Calendar | Pet's environment background changes, seasonal idle |
| Event spawn rotation | Companion data | Pet "sniffs the air" animation, hints at event theme |

### 5.3 Costume Unlock System

When you catch a **costume Pokemon** (witch hat Pikachu, flower crown Chansey, etc.), the companion app reads the notification and:

1. Records the costume item type
2. Unlocks it as a **wearable cosmetic for your pet**
3. Pet can equip one cosmetic item at a time (hat, accessory, scarf, etc.)
4. Collection screen shows all unlocked cosmetics

**Initial costume catalog** (maps to common costume Pokemon):
- Witch hat → pointy hat (any Pokemon)
- Flower crown → flower crown
- Party hat -> birthday hat
- Beanie / winter hat -> beanie
- Explorer hat -> safari hat
- Sunglasses -> cool shades
- Scarf -> scarf
- Ribbon -> bow
- Detective hat -> fedora
- New year glasses -> 202X glasses
- Balloon -> balloon accessory

---

## 6. Making It Unique Per Player (Complete System)

### Layer 1: Identity Layer
- **Custom name** — user names their pet on first launch
- **Start color** — derived from seed, not chosen (feels "fated")
- **Base IVs** — random 1-31 per stat, visible only via in-game "checkup"

### Layer 2: Playstyle Layer
- **Evolution path** — determined by your actual play habits (which stats you train most)
- **Personality quirks** — based on seed + behavior patterns:
  - Do you comfort the pet after flees? → More affectionate animations
  - Do you spam feed berries? → Food-motivated behavior
  - Do you train hard games? → Competitive, energetic personality
- **Favorite mini-game** — the game you play most becomes the pet's "favorite" (special bonus)

### Layer 3: Collection Layer
- **Costume unlocks** — directly from YOUR gameplay, not a shop
- **Catch species memory** — pet "remembers" the last 10 Pokemon you caught (shown in squad formation)
- **Rare catch showcase** — shinies and 100% IV catches get a dedicated gallery

### Layer 4: Seasonal Layer
- **Event participation medals** — badges on your pet for attending Community Days
- **Streak rewards** — 7-day catch streak = cosmetic enhancement
- **Seasonal backgrounds** — pet's environment changes with real seasons

### Layer 5: Social Layer (Future)
- **Friend visits** — see another user's pet (simplified), accessories they've unlocked
- **Accessory trading** — trade duplicate costume items between users
- **Gym takeovers (watch)** — your pet "defends" a gym on your watch face → special animation

---

## 7. Build Order (Ranked by Impact ⇧ vs. Effort ⇩)

### Phase 0: Foundation (Week 1-2)
| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P1 | Basic Tamagotchi state machine (hunger, happiness, weight, bond) | Low | Essential |
| P1 | Pet & Coo, Berry Catch (baby mini-games) | Low | Essential — first interaction |
| P1 | Evolution stages: Baby → Teen (stat thresholds) | Low | Essential |
| P1 | Custom naming | Low | Essential — identity |
| P1 | Watch app shell (Compose UI, main loop) | Medium | Essential |

### Phase 1: Personality (Week 3-4)
| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P1 | Seed generation from account data | Low | Huge — uniqueness foundation |
| P1 | Base IVs + stat tracking | Medium | Huge — personalization core |
| P2 | All baby + teen mini-games | Medium | Huge — engagement |
| P2 | Evolution branch system (stats determine form) | Medium | Huge — replayability |
| P2 | Mood system with idle animations | Medium | High — pet feels alive |
| P3 | Jump Rope (all tiers) | Low | Medium — fun addition |

### Phase 2: Integration (Week 5-6)
| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P1 | PGP BLE handshake (certification) | High | Critical — core functionality |
| P2 | BLE notification parsing (caught/fled/spun) | Medium | Huge — real-time reactions |
| P2 | Phone companion app (NotificationListenerService) | High | Huge — rich data |
| P2 | Costume unlock from caught costume Pokemon | Medium | High — collection dopamine |
| P3 | Squad formation (show last caught) | Medium | High — connection to real game |
| P3 | Catch Assist quick-time event | Medium | High — gameplay loop |

### Phase 3: Refinement (Week 7-8)
| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P2 | All adult + mega mini-games | High | Huge — late-game content |
| P2 | Shiny reaction (sparkle mode) | Low | High — special moments |
| P2 | Event calendar integration | Medium | High — keeps app fresh |
| P3 | Buddy Pokemon interaction | Medium | Medium — cute |
| P3 | Evolution ceremony animation | Medium | High — memorable milestone |
| P3 | Mega evolution final form + unique animations | High | Huge — aspirational goal |

### Phase 4: Polish (Week 9-10)
| Priority | Feature | Effort | Impact |
|---|---|---|---|
| P3 | Seasonal backgrounds | Medium | Medium |
| P3 | Achievement badges | Medium | Medium |
| P3 | Pet profile/share card | Low | Medium |
| P4 | Social features (friend visits) | High | Medium |
| P4 | Accessory trading | High | Medium |
| P4 | Watch face complication (pet visible on home screen) | Medium | High |

---

## 8. Open Questions for @researcher to Investigate

1. **Can we reliably parse Pokemon Go notification data on Android?** NotificationListenerService works on Android 14/15, but Niantic may change notification text format. Need to build flexible parsing with regex fallbacks.

2. **Does Pokemon Go check for active BLE peripheral connections while the phone is in power-saving mode?** Need to test — may affect auto-catch reliability.

3. **Can the companion app access the Pokemon Go calendar data, or must we maintain a manual schedule?** Manual schedule is safer (Niantic doesn't expose an API for this).

4. **What is the exact PGP BLE notification format for caught vs. fled?** From the reverse engineering docs, the LED pattern is the indicator. Need to map raw notification bytes → event type.

5. **How does the PGP++/Gotcha handle reconnection vs. initial connection?** Reconnection is faster and doesn't require full certification. Important for battery optimization.

6. **What screen controller does the NE71 charging case use?** Need teardown photos → identify LCD driver → determine if it's an ST7789 or similar standard driver.

7. **Can we build the catch assist quick-time event without introducing input lag that causes missed catches?** The QTE must be <200ms to not interfere with PGP's normal catch timing.

---

## 9. Next Steps

| # | Action | Owner |
|---|---|---|
| 1 | Approve this research brief | Product Visionary (you) |
| 2 | Begin Phase 0 build — Tamagotchi state machine + Wear OS shell | `@architect` + `@wearable` |
| 3 | Tear down NE71, photograph PCB, identify chips | `@sorcerer` |
| 4 | Research PGP notification byte mapping | `@whisperer` + `@researcher` |
| 5 | Design first 3 mini-games as wireframes/prototypes | `@enchanter` + `@alchemist` |
| 6 | Extract keys from Gotcha Evolve devices | `@whisperer` + you (hardware) |
| 7 | Run pre-merge gameplay regression sweep (core flow + console error capture + UI centering + mobile checks) and post a bug report for all agents | `@gametester` |

---

## 10. Research Findings — Phase 1 Complete

### 10.1 PGP BLE Protocol — Complete Event Mapping

**No species/CP/shiny data flows over BLE.** The protocol only signals event *type* via LED color sequences.

| LED Pattern | Game Event | Auto-Action |
|---|---|---|
| Green only, 5× flashes | Pokemon in range | Auto-catch: press button after 1.0-2.5s delay |
| Yellow (R+G), 5× flashes | New species in range | Always press (auto-catch new) |
| Blue only, 5× flashes | Pokestop in range | Auto-spin: press button |
| Ball shake (white flash sequence) → ends green | Pokemon caught! | Log success, update stats |
| Ball shake → ends red | Pokemon fled! | Log failure, sad pet animation |
| Solid red (no off) | Box full | Skip catch |
| Red + off alternating | Out of balls / out of range | Skip |
| RGB all active (no off) | Got items from stop | Log spin, feed pet |

**Handshake timing:**
- Full initial handshake: ~10 messages, ~1-3 seconds
- Reconnection (session key exists): ~4-6 messages, ~500ms
- Button press window: 200-500ms (min/max)
- Must respond within ~4 seconds (supervision timeout)
- Connection interval: 20-40ms (negotiated)

Key takeaway: The PGP BLE protocol gives us **event types only**. Rich data (species, CP, shiny, costume) requires the phone companion app with notification parsing.

### 10.2 Android Notification Parsing — Findings

**Pokemon Go notification format (push notifications):**
- Text format: `"Pikachu was caught!"` or `"Pikachu fled!"` — species name only
- **NO CP, NO shiny status, NO costume info** in push notifications
- Must handle ALL languages (localization) — regex parsing against species name list
- Android 15 risk: ASI (Enhanced notifications) may flag content as "sensitive"

**Event calendars — available via LeekDuck/ScrapedDuck:**
- Structured JSON feed: `https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json`
- Community Days, Spotlight Hours, Go Fest dates available programmatically
- No official Niantic feed — must use community-maintained source

### 10.3 NE71 / Earbud Case Hardware — GREAT NEWS

**The JL AC696N chip IS reflashable.** Not OTP locked.

| Component | Likely Chip | Flashable? |
|---|---|---|
| Case MCU | JL AC6966B (QFN32) or AC6965A (QSOP24) | **YES** — via USB using open-source jl-uboot-tool |
| LCD Driver | GC9A01 (round 1.28") or ST7789V (rect) | Standard SPI — drive with any MCU |
| Touch | CST816S or FT6336 | Standard I2C |

**Flashing method:** The chip enters "UBOOT" mode when you hold a button and plug in USB — enumerates as a USB mass storage device. Flash `.fw` files via `jl-uboot-tool` (Python, cross-platform).

**SDK available** at GitLab `gitlab.zh-jieli.com` (BR25 SDK, Chinese docs).

Even if reflashing the JL chip proves difficult, the **screen and touch are standard parts** — we can drop in an ESP32-S3 to drive the same display without changing the case.

### 10.4 Wear OS BLE — Feasibility Assessment

**Verdict: 6/10 — Conditionally feasible but fragile.**

**Watch-side solutions:**
- Foreground service with `connectedDevice` type
- GATT keepalive every 20 seconds to prevent 30-second OEM timeout
- `START_STICKY` for auto-restart
- BLE uses ~0.1-0.3% battery per hour once connected (advertising stops after connection)

**Phone-side problem (bigger issue):**
- Pokemon Go may be suspended during deep Doze
- BLE connection stays alive at hardware level, but app won't process notifications
- 1-hour forced disconnect is server-side (Niantic)
- User must set Pokemon Go as "Unrestricted" in battery settings

**Bottom line:** Wear OS BLE autocatcher *can* work but needs careful architecture and user cooperation on phone battery settings.

---

## 11. Updated Build Path (Post-Research)

Based on the research findings, the recommended build order changes:

### Sprint 1: Wear OS Tamagotchi (No BLE Yet) — 1-2 weeks
Build the pet first. The BLE can wait because:

### Sprint 2: Key Extraction + NE71 Reflash Attempt — Parallel Track
The NE71 chip IS reflashable. This changes the priority:
1. Extract keys from Gotcha Evolves (SUOTA exploit, no soldering)
2. Open NE71, photograph chip markings, identify exact MCU variant
3. Try flashing custom firmware to the JL chip (PGP protocol + Tamagotchi)
4. If JL flash works → no PCB needed. Ship firmware for existing hardware.
5. If JL flash fails → the LCD/touch is standard → drop in ESP32-S3 on a custom PCB

### Why this matters
The NE71 case has a working touchscreen, battery, USB-C, BLE, and pocket-friendly form factor — and the chip can be reflashed. If we get custom firmware on it, we have a **finished hardware product** without any new PCB fabrication.

---

*End of Sprint 0 Research Brief — Research Phase 1 Complete.*
