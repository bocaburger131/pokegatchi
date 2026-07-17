# Godot Setup Checklist (Windows + WSL project path)

## Where everything goes

### 1) Godot editor install location (Windows)
Choose ONE:
- **Installer version (recommended):** default install path from installer
- **Portable version:** `C:\Tools\Godot\Godot_v4.2.2-stable_win64.exe`

### 2) Project location (already created by Hermes)
- **WSL path (actual repo):**
  - `/opt/data/BocaBurger/pokegatchi/godot-lane/`
- **Windows Explorer path (open this in File Explorer):**
  - `\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\`

### 3) Main files to open
- Project file:
  - `project.godot`
- Main scene:
  - `scenes/Main.tscn`

---

## 1-minute install checklist (Windows)

1. Download Godot 4.2.x (standard editor) from official Godot site.
2. Install or place portable EXE at:
   - `C:\Tools\Godot\Godot_v4.2.2-stable_win64.exe`
3. Launch Godot.
4. Click **Import**.
5. Browse to:
   - `\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\project.godot`
6. Import project, then click **Run** (F5).
7. If prompted for main scene, choose:
   - `scenes/Main.tscn`

---

## Quick validation steps (send results back)

1. Team switch: Mystic -> Valor -> Instinct
2. Character roster: click all 6 characters
3. Actions: Feed, Pet, Heal, Catch, Spin, Swap
4. Open Journal tab and verify entries appear
5. Toggle Shape AUTO -> ROUND -> RECT

Report back:
- ✅ Runs / ❌ Doesn’t run
- Any error text from Output panel
- Screenshot of the running scene
