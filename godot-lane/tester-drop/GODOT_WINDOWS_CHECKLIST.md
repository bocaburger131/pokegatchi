# Godot Windows Checklist (Pokégatchi Godot Lane)

## Where this checklist is stored
- WSL path:
  - `/opt/data/BocaBurger/pokegatchi/godot-lane/tester-drop/GODOT_WINDOWS_CHECKLIST.md`
- Windows Explorer path:
  - `\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\tester-drop\GODOT_WINDOWS_CHECKLIST.md`

---

## 1) Install Godot 4.2.x (stable)
1. Go to: https://godotengine.org/download/windows/
2. Download **Godot Engine 4.2.x (Standard)** for Windows.
3. Run it once to confirm it opens.

> Optional: If SmartScreen appears, click **More info** → **Run anyway**.

---

## 2) Get the project branch
If using GitHub Desktop:
1. Open repo `bocaburger131/pokegatchi`
2. Fetch origin
3. Checkout branch: `hermes/godot-lane-bootstrap`

If using git CLI:
```bash
git clone https://github.com/bocaburger131/pokegatchi.git
cd pokegatchi
git checkout hermes/godot-lane-bootstrap
```

---

## 3) Open project in Godot
In Godot:
1. Click **Import**
2. Browse to repo folder, then select:
   - `godot-lane/project.godot`
3. Click **Import & Edit**

Main scene should be in:
- `godot-lane/scenes/Main.tscn`

---

## 4) Run quick validation (2–3 minutes)
Inside the running scene:
1. Switch teams (Valor/Mystic/Instinct)
2. Press actions: Feed, Pet, Heal, Catch, Spin
3. Switch among all 6 characters from roster
4. Open tabs: Bag / Pokédex / Journal
5. Toggle shape mode: AUTO → ROUND → RECT

Expected:
- No crash
- Sprite moves (idle + action reactions)
- Journal logs events
- Active character updates correctly

---

## 5) If something breaks, send me these 3 things
1. Screenshot of the Godot window
2. Exact error text from Godot Output/Debugger
3. Which step failed (install/import/run/action)

---

## 6) Quick local web fallback (no Godot required)
If Godot install is delayed, run this in repo root:
```bash
python3 -m http.server 8043
```
Open:
- `http://127.0.0.1:8043/previews/godot-lane-sample.html`

This mirrors current Godot lane behavior for tester preview.
