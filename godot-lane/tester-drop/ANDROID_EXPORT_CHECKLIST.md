# Godot Lane → Android Export Checklist (Pokégatchi)

Project:
- `\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\project.godot`

---

## 1) One-time setup on Windows

1. Install **Godot 4.2+** (standard).
2. Install **Android Studio** (for SDK/Platform Tools).
3. In Android Studio, install:
   - Android SDK Platform (latest stable)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
4. In Godot: **Editor → Manage Export Templates** → download/install templates for your Godot version.

---

## 2) Open project

1. Launch Godot.
2. Import:
   - `\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\project.godot`
3. Open scene:
   - `scenes/Main.tscn`
4. Press F5 once to confirm project runs.

---

## 3) Configure Android export in Godot

1. **Project → Export...**
2. Add preset: **Android**
3. Set package/application id (example):
   - `com.pokegatchi.godotlane`
4. Set version:
   - Name: `0.1.0`
   - Code: `1`
5. Architecture defaults are fine to start.

If prompted about SDK/JDK/keystore paths, set them in:
- **Editor Settings → Export → Android**

---

## 4) First test build (debug APK)

1. In Export window, choose Android preset.
2. Click **Export Project**.
3. Save as:
   - `godot-lane/tester-drop/pokegatchi-godotlane-debug.apk`

Optional Windows path equivalent:
- `\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\tester-drop\pokegatchi-godotlane-debug.apk`

---

## 5) Install on Android phone

Option A (USB + ADB):
1. Enable Developer Options + USB Debugging on phone.
2. Connect phone via USB.
3. In terminal:
   ```bash
   adb install -r /opt/data/BocaBurger/pokegatchi/godot-lane/tester-drop/pokegatchi-godotlane-debug.apk
   ```

Option B (manual):
1. Copy APK to phone.
2. Open APK and allow install from unknown sources.

---

## 6) Mobile validation checklist

On phone, verify:
1. App launches without crash
2. Team switch works (Valor/Mystic/Instinct)
3. 6-character roster buttons work
4. Actions work (Feed/Pet/Heal/Catch/Spin/Swap)
5. Journal logs actions
6. Shape toggle AUTO/ROUND/RECT behaves correctly
7. Performance feels smooth (no obvious stutter)

---

## 7) Send back to me

Please send:
- ✅/❌ Did APK build?
- ✅/❌ Did app install?
- Any error text/screenshots
- Device model + Android version
- “Feels smooth / slightly laggy / very laggy”

I’ll tune animations + layout based on your real device result.
