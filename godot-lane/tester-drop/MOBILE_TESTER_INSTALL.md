# Mobile Tester Install Guide (Android)

## Fast path
1. Build/export APK from Godot using `godot-lane/export_presets.cfg` (preset `Android-APK-Debug`).
2. Send APK to tester (Discord, Drive, etc).
3. Tester enables "Install unknown apps" on their Android device.
4. Tester installs APK and runs it.

## For tester
- Verify app opens and you can:
  - pick team color
  - switch character
  - trigger actions (Feed/Pet/Heal/Catch/Spin)
  - view Bag/Pokédex/Journal

## If install fails
- Confirm APK downloaded fully
- Re-enable unknown-app install for source app
- Remove old version and reinstall
