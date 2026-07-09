# Pokégatchi (SHIFT4FUNDING)

Pokégatchi is a **Pokémon GO Plus + Tamagotchi hybrid** project with a live **web shipping lane** and companion **Wear OS / Godot R&D lanes**.

- Live web app: https://bocaburger131.github.io/pokegatchi/
- Current web branch in this workspace: `hermes/godot-lane-bootstrap`
- Latest pushed `main` SHA: `db7a3141b8fc8e9a1e813fd8ca8de441a8a71b7c`

---

## Repo File Tree (high-level)

```text
pokegatchi/
├── index.html                     # Main web app shell (HUD, panels, launcher)
├── assets/
│   ├── styles.css                 # Core UI system + storybook styling
│   ├── backgrounds/               # Scene/background art packs
│   ├── sprites/                   # Generated and fallback sprite assets
│   ├── models_v2/                 # GLB models for species (Draco-free runtime path)
│   ├── vfx/                       # Catch/spin visual effects sheets
│   └── emotes/                    # Emote/reference bundles
├── js/
│   ├── main.js                    # App orchestration + HUD/menu/bag/journal logic
│   ├── core/Store.js              # State store (stats, inventory, journal)
│   ├── data/Pokedex.js            # Species metadata + model/sprite mappings
│   └── scene/
│       ├── SceneManager.js        # Three.js scene/model loading control
│       └── ExpressionOverlay.js   # Expression/mood overlay logic
├── wearos-app/                    # Wear OS app lane
├── godot-lane/                    # Godot support / R&D lane
├── extraction/                    # Legacy key extraction scripts
└── README.md
```

---

## Key Files (web lane)

### `index.html`
- Declares app shell and overlay/panel structure.
- Bottom launcher includes:
  - `#unlockBalls` (now **6** balls)
  - `#quickMenu` (Pokédex / Journal / Bag)
  - `#pokeballLauncher`
- Script tag currently cache-busted to:
  - `js/main.js?v=32`

### `assets/styles.css`
- Central theme + component styling.
- Includes generated-art cohesion and storybook passes.
- Launcher/menu styling now uses warm, parchment-like gradients.
- Unlock-ball collapse/minimize styles:
  - `.unlock-balls`
  - `.unlock-balls.minimized`

### `js/main.js`
- Main runtime wiring.
- Launcher state controller:
  - `setLauncherState(open)`
- Behavior updates:
  - 6-ball launcher minimize on menu open
  - clean close/open transitions for Bag / Journal / Pokédex interactions
  - bag open helper supports forced open: `window.openBag(true)`

### `js/core/Store.js`
- Reactive state for:
  - pet stats (`hunger`, `happiness`, `affection`)
  - HUD counters (`steps`, `pokemonCaught`, `pokestopSpins`, `badges`)
  - inventory (`berries`, `toys`, `potions`, `candy`)
  - journal events

### `js/data/Pokedex.js`
- Species roster and model/sprite mapping.
- Used by picker + scene loading pipeline.

### `js/scene/SceneManager.js`
- Three.js scene lifecycle.
- Model display logic and animation playback.
- Current web lane avoids runtime Draco decoding issues (Draco loader removed in active path).

---

## Browser Console Output (verification snapshot)

Captured from local run (`http://127.0.0.1:8080/?t=readme-console-update`):

```json
{
  "mainJs": "http://127.0.0.1:8080/js/main.js?v=32",
  "ballCount": 6,
  "ballsMinimized": false,
  "quickMenuBg": "linear-gradient(rgba(102, 74, 54, 0.88), rgba(60, 44, 33, 0.94)), radial-gradient(120% 140% at 50% 0%, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0) 60%)",
  "quickMenuBorder": "rgba(242, 224, 189, 0.44)"
}
```

This confirms the active web build is serving the storybook launcher/menu pass locally.

---

## Recent Web UI Commits

- `8ea7ae7` — storybook launcher pass + 6-ball collapse behavior
- `ff916f9` — premium polish pass for HUD/icons/stats/inventory
- `c083b3a` — generated-art cohesion + illustrated background pass

---

## Notes

- GitHub Pages may briefly serve stale cached JS/CSS after pushes.
- If visuals look old, hard refresh (Ctrl+Shift+R) and re-check `main.js?v=32` in devtools.
