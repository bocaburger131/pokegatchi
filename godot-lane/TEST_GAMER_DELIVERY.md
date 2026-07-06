# Pokégatchi Godot Lane — Test Gamer Delivery (Task 10)

This package gives the game tester something usable **right now** even without a local Godot install.

## Delivery options

### Option A (recommended now): Web mirror demo
Use the mirror page that reflects the current Godot-lane behavior:

- `previews/godot-lane-sample.html`

Run locally from repo root:

```bash
python3 -m http.server 8043
```

Then open:

- `http://127.0.0.1:8043/previews/godot-lane-sample.html`

What tester can validate:
- Team switching (Valor/Mystic/Instinct)
- Modes (Play/Auto/Scene)
- Shape mode (AUTO/ROUND/RECT)
- BLE transport toggle (SIM/LOCAL)
- Actions (Feed/Pet/Heal/Catch/Spin/Swap)
- HUD tabs (Bag/Pokédex/Journal)
- Mood/state + stat bar reactions

---

### Option B: Godot lane in editor (when Godot 4.x is available)
Open:
- `godot-lane/project.godot`

Main scene:
- `godot-lane/scenes/Main.tscn`

Same verification checklist as Option A.

---

## 3-minute demo script for tester
1. Open mirror page.
2. Click team: `Mystic -> Valor`.
3. Click `BLE` until `LOCAL`.
4. Click `Catch`, then `Spin`.
5. Open `📓 Journal` and confirm events were logged.
6. Click `Shape` to `ROUND` then `RECT`, verify margins/layout shift.
7. Click `Swap` to switch Eevee/Psyduck.

Expected: No console errors; status/mood/stats/journal all update.

---

## Notes
- This is a sample lane, not production runtime yet.
- BLE is adapter-ready with pluggable providers in:
  - `godot-lane/scripts/ble/BleEventBridge.gd`
- Current providers: `SIM` and queue-based `LOCAL`.
