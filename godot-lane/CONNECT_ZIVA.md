# Ziva Connection Guide (Godot Lane)

This project includes the Ziva installer plugin at:
- `res://addons/ziva_installer/`

And a local bridge client script at:
- `res://tools/ziva_bridge.py`

## 1) Enable installer plugin in Godot

In Godot:
1. `Project -> Project Settings -> Plugins`
2. Ensure **Ziva Installer** is **Enabled**

`project.godot` already has:
- `enabled=PackedStringArray("res://addons/ziva_installer/plugin.cfg")`

## 2) Install Ziva agent (inside Godot)

In the editor, left dock should show **Ziva Installer**.
Click **Install Ziva AI Agent** and wait for completion.
Then restart editor when prompted.

After install, this file should exist:
- `res://addons/ziva_agent/ziva_agent.gdextension`

## 3) Enable local API bridge (optional but recommended)

The installer has a test API that can be enabled by launching Godot with env var:
- `ZIVA_INSTALLER_TEST_API=1`

### Windows PowerShell launch example
```powershell
$env:ZIVA_INSTALLER_TEST_API="1"
& "C:\Program Files\Godot\Godot_v4.7-stable_win64.exe" "\\wsl$\Ubuntu\opt\data\BocaBurger\pokegatchi\godot-lane\project.godot"
```

When active, the local API listens on:
- `127.0.0.1:8099`

## 4) Communicate with Ziva installer from terminal

From repo root:
```bash
python3 godot-lane/tools/ziva_bridge.py doctor
python3 godot-lane/tools/ziva_bridge.py ready
python3 godot-lane/tools/ziva_bridge.py state
python3 godot-lane/tools/ziva_bridge.py install
python3 godot-lane/tools/ziva_bridge.py installed
python3 godot-lane/tools/ziva_bridge.py screenshot
```

Host overrides (if needed):
```bash
python3 godot-lane/tools/ziva_bridge.py ready --host 127.0.0.1
python3 godot-lane/tools/ziva_bridge.py ready --host <WINDOWS_HOST_IP>
```

## 5) What this gives you

- Programmatic status checks (`ready`, `state`)
- Trigger install (`install`)
- Verify installation (`installed`)
- Grab editor screenshot for debugging (`screenshot`)

## 6) Limitations

- This bridge currently talks to the **installer API**, not chat prompts inside Ziva Agent UI.
- Direct "send prompt to Ziva" requires Ziva Agent exposing a runtime API endpoint (not present in installer plugin code).
