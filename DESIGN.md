---
version: alpha
name: Pokégatchi Cozy Team HUD Revamp
description: Cozy storybook Pokémon-inspired interface with a central Pokéball launcher, team-reactive identity system, and compact watch-aware HUD.
colors:
  valor-red: "#D64545"
  mystic-blue: "#4A78E0"
  instinct-yellow: "#E0B53A"
  bg-night: "#172033"
  bg-dusk: "#2A3750"
  card-glass: "#FFFFFF22"
  card-line: "#FFFFFF33"
  text-primary: "#F9FBFF"
  text-secondary: "#C8D2E6"
  alert-hungry: "#FF8E61"
  alert-bored: "#7BB4FF"
typography:
  h1:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: Inter
    fontSize: 0.95rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0em"
  label-sm:
    fontFamily: Inter
    fontSize: 0.72rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.04em"
rounded:
  sm: 10px
  md: 16px
  lg: 24px
  xl: 999px
spacing:
  xs: 6px
  sm: 10px
  md: 14px
  lg: 20px
  xl: 28px
components:
  top-left-team-card:
    backgroundColor: "{colors.card-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 10px
  top-left-team-card-expanded:
    backgroundColor: "{colors.bg-dusk}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 14px
  gear-button:
    backgroundColor: "{colors.card-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    size: 42px
  pokeball-launcher:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg-night}"
    rounded: "{rounded.xl}"
    size: 72px
  bottom-sheet-menu:
    backgroundColor: "#0E1627E6"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: 14px
  hud-stat-pill:
    backgroundColor: "{colors.card-glass}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    height: 30px
  alert-indicator-shake:
    backgroundColor: "{colors.alert-hungry}"
    textColor: "#1B1B1B"
    rounded: "{rounded.xl}"
    size: 24px
---

## Overview

This redesign uses a calm, cozy storybook feel with stronger interaction hierarchy. The main action is always the center Pokéball launcher. The interface keeps only the three core sections (Pokédex, Journal, Bag) while making team identity and pet-state urgency visible at a glance.

## Colors

- **Team mapping is strict:** Valor = red, Mystic = blue, Instinct = yellow.
- Team colors recolor not just icons but also unlockable Pokéball markers and team-themed background accents.
- Hungry/bored alerts use warm orange and cool blue visual alerts, with shake animation and optional vibration support.

## Typography

- Heavy, compact labels for HUD and streak values.
- Friendly rounded sans text for readable mobile-first UI.

## Layout

- **Top Left:** Two-line team card with username, streak, and team selector.
- **Top Right:** Settings gear button.
- **Top HUD Row:** Steps, Spins, Catches, Achievements + animated alert status.
- **Center Stage:** Active buddy scene (Eevee first, quadruped stance).
- **Bottom Center:** Single Pokéball launcher that opens a slide-up menu.
- **Slide-up Menu (3 options):** Pokédex left, Journal center, Bag right.

## Shapes

- Soft rounded cards (16-24px) for glass HUD components.
- Full circular buttons for gear and Pokéball launcher.
- Team-colored ring badges for unlock indicators.

## Components

- `top-left-team-card` for default compact display.
- `top-left-team-card-expanded` variant for optional expanded stats/details.
- `pokeball-launcher` as primary interaction node.
- `bottom-sheet-menu` as the only navigation panel.
- `hud-stat-pill` for top metrics.
- `alert-indicator-shake` for bored/hungry urgency.

## Do's and Don'ts

- **Do** keep Pikachu unchanged in this redesign phase.
- **Do** render Eevee-like companion on all fours to match roster silhouettes.
- **Do** keep HUD minimal and high-signal.
- **Don't** reintroduce cluttered multi-button nav rows.
- **Don't** use biped Eevee poses in production UI.
