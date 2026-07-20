# BocaBurger131 — TamaGo

A Pokemon Go companion Tamagotchi for Wear OS and custom hardware.

| Platform | Status | Location |
|---|---|---|
| **Wear OS** | 🟢 V1 scaffolded | `wearos-app/` |
| **Key Extraction** | 🟢 Script ready | `extraction/` |
| **NE71 Reflash** | 🟡 Waiting on hardware | — |
| **Custom PCB** | 🔴 Last resort | — |

## Project Structure

```
BocaBurger131/
├── Sprint-0_Research-Brief.md   # Full game design doc
├── wearos-app/                  # Galaxy Watch app
│   └── app/src/main/java/.../
│       ├── tamagotchi/          # State machine + IVs
│       ├── ble/                 # BLE GATT server + LED parser
│       ├── ui/screens/          # Egg → Baby → Adult screens
│       └── minigames/           # Pet & Coo, Berry Catch, Peek-a-Boo
└── extraction/                  # Gotcha Evolve key extraction
    ├── extract_keys.py          # SUOTA exploit script
    └── requirements.txt
```

## V1 Features (Live)
- [x] Egg → Baby → Teen evolution (100 catches = Teen)
- [x] Hidden IVs + personality (unique per seed)
- [x] Mood system (happy, hungry, sad, excited, sleepy)
- [x] Pet & Coo mini-game (tap to bond)
- [x] Berry Catch mini-game (timing feeding)
- [x] Peek-a-Boo mini-game (patience)
- [x] BLE GATT server (advertises as PGP)
- [x] LED pattern parser (caught/fled/spun detection)
- [x] Key extraction script (SUOTA exploit)

## Next

1. Extract keys from your Gotcha Evolve
2. Ship Wear OS V1 (no BLE yet — just the pet)
3. NE71 reflash (when hardware arrives)
4. Integrate BLE → pet reactions
