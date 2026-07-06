# Godot Android Export Quickstart (Pokégatchi)

This gets you from Godot project to installable APK.

## 1) Install prerequisites on your desktop
- Godot 4.2.x stable
- Android Studio (SDK + platform tools)
- Java 17 (if not already bundled via Android Studio)

## 2) Open project
- Open `godot-lane/project.godot` in Godot.

## 3) Install Android build template in Godot
- Godot menu: **Editor → Manage Export Templates**
- Download/install matching templates for your Godot version.

## 4) Verify export preset
- Open **Project → Export**
- Confirm preset exists: `Android-APK-Debug`
- File: `godot-lane/export_presets.cfg`

## 5) Configure Android SDK paths in Godot
- **Editor Settings → Export → Android**
- Set:
  - adb path
  - apksigner path
  - debug keystore path (or create one)

## 6) Export debug APK
- Export preset: `Android-APK-Debug`
- Export path: `build/android/pokegatchi-debug.apk`

## 7) Install on phone
- Enable Developer Mode + USB debugging on Android phone
- Connect by USB
- Install via:
  - `adb install -r build/android/pokegatchi-debug.apk`

## 8) Smoke test checklist (2 minutes)
- App launches
- Switch teams (Valor/Mystic/Instinct)
- Switch characters in roster
- Trigger Feed/Pet/Heal/Catch/Spin
- Open Bag/Pokédex/Journal
- Confirm no crash

## Notes
- iOS export requires macOS + Xcode.
- Release signing/store setup should be done after gameplay stabilization.
