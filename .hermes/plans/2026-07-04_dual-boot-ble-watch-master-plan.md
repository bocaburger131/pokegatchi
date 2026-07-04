# Pokégatchi — Dual-Boot BLE + Watch Master Plan
> **Authored:** 2026-07-04 by Hermes (AUTO/BLE Agent + Game Integration + Watch/Hardware)
> **Goal:** (1) Standalone BLE test harness (MODE A) to verify auto-catch/spin wiring end-to-end, (2) flip a switch to run the full Pokégatchi game (MODE B), (3) wire the Wear OS watch to show the pet and react to catches in real-time, (4) roadmap headphone audio/haptic layer.

---

## Current State Audit

| Module | Location | Status |
|--------|----------|--------|
| 3D model + bone animations | `js/scene/SceneManager.js` | ✅ Working — 45 bones, playAnimation() API exists |
| Expression overlay | `js/scene/ExpressionOverlay.js` | ✅ Working — showTempMood(mood, duration) |
| Game store | `js/core/Store.js` | ✅ Working — addStat/addHud/addItem |
| Main orchestration | `js/main.js` | ✅ Working — but auto = simulated only (demoBoost*) |
| Wear OS Kotlin app | `wearos-app/` | ✅ Exists — Canvas pet, TamagotchiState reducer, BleGattServerService |
| BLE GATT service | `BleGattServerService.kt` | ✅ LED parser complete, broadcasts Intents — **BLE service start is commented out** |
| BLE event bus (web) | — | ❌ Does not exist |
| BLE test harness page | `auto-catcher.html` | ❌ Does not exist |
| Dual-boot toggle | — | ❌ Does not exist |
| Web Bluetooth client | `js/ble/` | ❌ Folder does not exist |
| Watch ↔ web bridge | — | ❌ Does not exist |
| Headphone layer | — | ❌ Does not exist |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EVENT SOURCES                                │
│  PGP/Go-tcha device ──► BleGattServerService.kt (Wear OS)          │
│                           │  broadcasts Android Intent              │
│                           ▼                                         │
│                    BleWebSocketBridge.kt ──► ws://localhost:8765    │
│                                                  │                  │
│  Web Bluetooth API ─────────────────────────────►│                  │
│  MockBleProvider.js (simulation) ───────────────►│                  │
│                                                  │                  │
│                     js/ble/BleHarness.js (MODE A)│                  │
│                     js/ble/BleEventBridge.js ────┤                  │
│                                                  │                  │
│             ┌────────────────────────────────────┘                  │
│             ▼                                                        │
│   ┌─────────────────────┐     ┌─────────────────────────────────┐  │
│   │   MODE A             │     │   MODE B                        │  │
│   │   auto-catcher.html  │ ◄──►│   index.html (full game)        │  │
│   │   Raw BLE events     │     │   3D pet + animations + stats   │  │
│   │   Counters + logs    │     │   Store.js drives everything    │  │
│   │   No pet, no game    │     │                                 │  │
│   └─────────────────────┘     └─────────────────────────────────┘  │
│                                          │                           │
│                                          ▼                           │
│                              Wear OS MainScreen.kt                   │
│                              Canvas pet + mood display               │
│                                          │                           │
│                                    (future)                          │
│                                Headphone audio layer                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1 — Dual-Boot UI Toggle
**Goal:** Two pages, one button to switch. Zero risk to existing game.

### Files to Create
- `auto-catcher.html` — standalone BLE harness (no Three.js, no game)
- `assets/auto-catcher.css` — dark diagnostic stylesheet

### Files to Modify
- `index.html` line ~37 — add `<a class="mode-toggle" href="auto-catcher.html">🔵 BLE Test</a>` in `.top-bar`
- `assets/styles.css` — append `.mode-toggle` styles (blue pill button, right-aligned)

### auto-catcher.html Sections
```
┌─────────────────────────────────────────────────────────┐
│  🔵 BLE Test Harness v0.1           [← Game (MODE B)]   │
├──────────────────┬──────────────────┬───────────────────┤
│  CONNECTION      │  COUNTERS        │  MOCK CONTROLS    │
│  ● DISCONNECTED  │  🟢 Caught: 0    │  Rate: 3/min      │
│  [MOCK | BLE]    │  🔴 Fled:   0    │  Auto: [ON/OFF]   │
│  [Scan][Connect] │  💠 Spins:  0    │  [🟢][🔴][💠][📶] │
│                  │  📶 Nearby: 0    │                   │
│                  │  Catch %:   —    │                   │
├──────────────────┴──────────────────┴───────────────────┤
│  📋 LIVE EVENT LOG                          [Clear Log]  │
│  14:32:01  🟢  CAUGHT         04 00 23 00 [MOCK]        │
│  14:31:59  📶  NEARBY         01 00 00 ...              │
├─────────────────────────────────────────────────────────┤
│  🔬 RAW GATT LOG (debug bytes)              [Clear]     │
│  NOTIFY ...8e39: 04 00 23 00                            │
└─────────────────────────────────────────────────────────┘
```

---

## PHASE 2 — BLE Module Stack (`js/ble/`)
**Goal:** Protocol layer that works with MOCK (no hardware) first, real BLE second.

### Files to Create

#### `js/ble/PgpProtocol.js`
Pure JavaScript port of `BleGattServerService.kt` LED classifier.
- All PGP UUIDs (SERVICE, WRITE, NOTIFY, AUTH, ENC, DEVICE_INFO, BATTERY)
- `parseLedNotification(uint8Array)` → `{ event, patterns, raw }`
- `PgpEvents` enum: `caught | fled | spun | pokemon_nearby | new_species | bag_full | out_of_balls | unknown`
- Pattern classifier: detects ball-shake sequence → last color → caught (green+blue) or fled (red)

#### `js/ble/MockBleProvider.js`
Simulation engine — no hardware needed.
- Configurable `eventsPerMinute` (default 3.0)
- `catchRate` probability (default 72%)
- `startAuto()` / `stopAuto()` — fires NEARBY → (800ms delay) → CAUGHT or FLED
- `fire(eventType)` — manual single event
- Emits `bleEvent` CustomEvent matching same shape as real client

#### `js/ble/PgpBleClient.js`
Web Bluetooth GATT central for real hardware.
- `scan()` — opens browser device picker (filters: Go-tcha Classic/Evolve, Pokemon GO Plus)
- `connect()` — GATT connect + subscribe to PGP_READ_NOTIFY_CHAR
- `_onLedNotification()` → calls `parseLedNotification()` → emits `bleEvent`
- Emits: `connected`, `disconnected`, `bleEvent`, `rawNotify`, `rawWrite`, `error`
- ⚠️ Requires Chrome/Edge on HTTPS or localhost

#### `js/ble/BleHarness.js`
UI controller for `auto-catcher.html`.
- `switchSource('mock' | 'ble')` — swap active provider
- Wires both providers to DOM: counters, event log, raw GATT log
- `fireEvent(type)` — manual fire button
- `resetCounters()`, `clearEventLog()`, `clearGattLog()`

#### `js/ble/BleEventBridge.js`
The game integration layer — attaches to any provider, drives Store.
- `attach(bleProvider)` — subscribe to bleEvent
- `detach()` — unsubscribe
- On `caught`: `store.addHud('pokemonCaught',1)`, `addStat('happiness',8)`, `addStat('affection',2)`, `addStat('hunger',-2)`, fire `onCatch` hook
- On `fled`: `store.addStat('happiness',-5)`, fire `onFled` hook
- On `spun`: `store.addHud('pokestopSpins',1)`, `addStat('hunger',3)`, `addStat('happiness',2)`, `addItem('berries',1)`, fire `onSpin` hook
- On `bag_full` / `out_of_balls`: toast warning only
- `onCatch` hook → `playAnimation('bounce')` + `exprOverlay.showTempMood(4, 2)` (excited)
- `onFled` hook → `exprOverlay.showTempMood(2, 2)` (sad)
- `onSpin` hook → `exprOverlay.showTempMood(0, 1)` (happy)

#### `js/ble/WearOsBridge.js` *(Phase 4 — watch integration)*
WebSocket client that receives events from Kotlin bridge.
- `new WearOsBridge('ws://localhost:8765')`
- Parses `{ type, ts }` JSON → emits `bleEvent` CustomEvent
- Plug-compatible with `BleEventBridge.attach(wearOsBridge)`

---

## PHASE 3 — Wire BLE Bridge into Game (MODE B)
**Goal:** Real events drive pet reactions. `demoBoost*` functions stay for manual testing; BLE bridge is additive on top.

### Modify `js/main.js`

Add imports at top:
```javascript
import { BleEventBridge } from './ble/BleEventBridge.js';
import { MockBleProvider } from './ble/MockBleProvider.js';
import { PgpBleClient }    from './ble/PgpBleClient.js';
```

Add `window.initBleBridge(source)` after `init()`:
```javascript
window.initBleBridge = function(source = 'mock') {
  const bridge = new BleEventBridge(store, {
    toastFn: toast,
    onCatch: () => { playAnimation('bounce'); exprOverlay.showTempMood(4, 2); },
    onFled:  () => { exprOverlay.showTempMood(2, 2); },
    onSpin:  () => { exprOverlay.showTempMood(0, 1); },
  });
  const provider = source === 'ble' ? new PgpBleClient() : new MockBleProvider();
  bridge.attach(provider);
  window._bleProvider = provider;
  window._bleBridge   = bridge;
  toast(`🔵 BLE bridge active (${source})`);
  return { bridge, provider };
};
```

No changes to `Store.js`, `SceneManager.js`, or `ExpressionOverlay.js` — they already have the full API needed.

---

## PHASE 4 — Wear OS Watch Integration
**Goal:** Watch shows the pet, reacts to catches in real-time.

### What Exists (Kotlin)
| File | Status |
|------|--------|
| `MainActivity.kt` | ✅ Composable shell — BLE service start **commented out** (lines 18-20) |
| `MainScreen.kt` | ✅ 509-line Canvas pet — Egg/Baby/Teen/Adult/Mega stages with bounce animations |
| `TamagotchiState.kt` | ✅ Full reducer — `PokemonCaught`, `PokemonFled`, `PokeStopSpun` actions wired up |
| `BleGattServerService.kt` | ✅ Full GATT profile, LED classifier, Intent broadcaster — **never started** |
| `NotificationListener.kt` | ✅ Service stub — parses Pokemon GO notifications |
| `SeedGenerator.kt` | ✅ Pet IV seed generation |
| `MiniGames.kt` | ✅ Mini-game stubs |

### Step 1 — Uncomment BLE Service Start
**File:** `MainActivity.kt` lines 18-20  
Uncomment:
```kotlin
Intent(this, BleGattServerService::class.java).also { intent ->
    startForegroundService(intent)
}
```
⚠️ Requires `FOREGROUND_SERVICE_CONNECTED_DEVICE` permission in `AndroidManifest.xml`

### Step 2 — Wire TamagotchiState into MainScreen
`TamagotchiState` reducer already handles `PokemonCaught` — it increments `catchCount`, adjusts happiness, and can trigger evolution. The `BleGattServerService` already broadcasts `ACTION_BLE_EVENT` Intent.

Wire them together in `MainActivity.kt`:
```kotlin
val broadcastReceiver = object : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        when (intent.getStringExtra("event_type")) {
            "caught"  -> viewModel.dispatch(TamagotchiAction.PokemonCaught)
            "fled"    -> viewModel.dispatch(TamagotchiAction.PokemonFled)
            "spun"    -> viewModel.dispatch(TamagotchiAction.PokeStopSpun)
        }
    }
}
registerReceiver(broadcastReceiver, IntentFilter(BleGattServerService.ACTION_BLE_EVENT))
```

### Step 3 — Enhance Watch UI for Catch Reactions
Current `MainScreen.kt` shows pet based on `state.mood`. Add catch celebration:
- Add `state.lastCatchTimestamp` field to `TamagotchiState`
- On `PokemonCaught` action: set `lastCatchTimestamp = System.currentTimeMillis()`
- In `MainScreen`: if `(now - lastCatchTimestamp) < 2000ms` → show sparkle overlay + excited emoji
- Use existing `infiniteTransition` for the sparkle pulse animation

### Step 4 — WebSocket Bridge (Watch → Browser)
For full-circle integration (watch BLE → browser web app):

**New file: `wearos-app/.../util/BleWebSocketBridge.kt`**
```kotlin
// BroadcastReceiver that relays BLE events to browser via WebSocket
// Uses NanoHTTPD (add to build.gradle: org.nanohttpd:nanohttpd-websocket:2.3.1)
class BleWebSocketBridge : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        val type = intent.getStringExtra("event_type") ?: return
        wsServer?.broadcastMessage("""{"type":"$type","ts":${System.currentTimeMillis()}}""")
    }
}
```

Then `WearOsBridge.js` in browser connects to `ws://192.168.x.x:8765` (phone's IP).

---

## PHASE 5 — Headphone Audio/Haptic Layer
**Goal:** Headphones deliver audio feedback on catch/spin — no hardware mods needed.

### Architecture
Headphones = audio output channel. The companion phone plays a sound when a catch/spin event fires. That's it — no BLE HID hacking needed for Phase 1.

### Step 1 — Sound Assets
Add to `assets/sounds/`:
- `catch_success.mp3` — happy jingle (short, 1s)
- `catch_fled.mp3` — sad tone
- `pokestop_spin.mp3` — soft chime
- `pokemon_nearby.mp3` — subtle pulse

Use free assets from: [freesound.org](https://freesound.org) or generate via text-to-speech/tone generator.

### Step 2 — SoundManager.js
**New file: `js/audio/SoundManager.js`**
```javascript
export class SoundManager {
  constructor() {
    this._sounds = {};
    this._muted  = false;
  }

  preload(name, url) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    this._sounds[name] = audio;
  }

  play(name) {
    if (this._muted) return;
    const s = this._sounds[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {}); // swallow autoplay policy errors
  }

  setMuted(v) { this._muted = !!v; }
}
```

### Step 3 — Wire into BleEventBridge
Add `soundManager` option to `BleEventBridge`:
```javascript
// In BleEventBridge._onBleEvent():
case PgpEvents.CAUGHT:
  this._sound?.play('catch_success');
  // ...existing store updates...
  break;
case PgpEvents.FLED:
  this._sound?.play('catch_fled');
  break;
case PgpEvents.SPUN:
  this._sound?.play('pokestop_spin');
  break;
```

### Step 4 — Advanced: Headphone Button → Manual Catch
Most BT headphones expose `MediaSession` controls via `navigator.mediaSession`.  
Tap the play button on headphones → `previoustrack` event → fire manual catch:
```javascript
navigator.mediaSession.setActionHandler('previoustrack', () => {
  window._bleProvider?.fire('caught');
});
```
This lets George tap his headphone button to manually trigger a catch animation — useful for testing without the PGP device.

---

## Sprint Order (What to Build First)

| Sprint | Work | Outcome | Risk |
|--------|------|---------|------|
| **Sprint 1 (Day 1)** | `PgpProtocol.js` + `MockBleProvider.js` + `BleEventBridge.js` + `auto-catcher.html` + CSS | Full mock harness working in browser, MODE A ↔ MODE B toggle | 🟢 Zero — pure JS, no hardware |
| **Sprint 2 (Day 1-2)** | Wire `BleEventBridge` into `main.js`, test in game with mock | Mock events drive pet animations + stats in real game | 🟢 Low — additive only |
| **Sprint 3 (Day 2-3)** | `PgpBleClient.js` + real Web Bluetooth | Test with nRF Connect app first, then real PGP device | 🟡 Medium — needs Chrome + HTTPS + device |
| **Sprint 4 (Day 3-4)** | Uncomment BleGattServerService start in Kotlin + wire to TamagotchiState | Watch reacts to real catches | 🟡 Medium — needs watch + device |
| **Sprint 5 (Day 4-5)** | `BleWebSocketBridge.kt` + `WearOsBridge.js` | Watch → browser full-circle | 🟠 Medium — WebSocket cross-device networking |
| **Sprint 6 (Week 2)** | `SoundManager.js` + sound assets + headphone button | Headphones deliver audio on catch | 🟢 Low |
| **Sprint 7 (Week 2)** | Watch MainScreen catch celebration (sparkle overlay) | Watch shows excited pet on catch | 🟢 Low — pure Compose UI |

---

## Known Blockers

| Issue | Severity | Fix |
|-------|----------|-----|
| Web Bluetooth requires HTTPS | 🔴 Hard | Use `localhost` for dev; deploy to HTTPS for production |
| PGP device is exclusive (one BLE central at a time) | 🔴 Production | In test: disconnect Pokemon GO first; long-term: Wear OS service holds the connection |
| `handleEncryptionWrite()` is a stub in Kotlin | 🟠 Unknown | May or may not block Pokemon GO from accepting the connection — test first, fix crypto if rejected |
| OTP blob in Kotlin is from a cloned Go-tcha | 🟠 Unknown | Run `extract_keys.py` on your actual device if Pokemon GO rejects the handshake |
| `extract_keys.py` needs compiled DA14580 .bin | 🟠 Blocked | Requires Dialog Semiconductor SDK + Keil uVision build toolchain |
| Android Doze kills BLE service | 🟡 During testing | Set app to `UNRESTRICTED` battery mode on watch |
| Browser autoplay policy blocks audio | 🟡 Low | `SoundManager.play()` wraps in `.catch(() => {})` — sounds only play after user interaction |

---

## Complete New File List

```
js/ble/
  PgpProtocol.js         ← LED parser, UUIDs, PgpEvents enum
  MockBleProvider.js     ← Simulation engine
  PgpBleClient.js        ← Web Bluetooth GATT central
  BleHarness.js          ← auto-catcher.html UI controller
  BleEventBridge.js      ← Game integration layer
  WearOsBridge.js        ← (Phase 4) WebSocket relay from Kotlin

js/audio/
  SoundManager.js        ← (Phase 5) Audio playback for headphones

assets/
  auto-catcher.css       ← MODE A dark diagnostic styles
  sounds/
    catch_success.mp3
    catch_fled.mp3
    pokestop_spin.mp3
    pokemon_nearby.mp3

auto-catcher.html        ← MODE A standalone harness page

wearos-app/.../util/
  BleWebSocketBridge.kt  ← (Phase 4) Android Intent → WebSocket relay
```

## Files to Modify

```
index.html               ← Add mode-toggle button in .top-bar
assets/styles.css        ← Append .mode-toggle CSS
js/main.js               ← Add BLE imports + window.initBleBridge()
wearos-app/.../ui/MainActivity.kt  ← Uncomment BLE service start + wire TamagotchiState
wearos-app/.../ui/screens/MainScreen.kt  ← Add catch celebration sparkle overlay
```
