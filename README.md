# FOLD

**A paper plane. A breeze. A page.**

An endless paper-plane gliding toy — meditative, immediate, no score, no crash, no fail. Phosphor green on deep black, framed like a retro CRT terminal.

**Live demo:** https://adonaylizardo.github.io/fold/

## Quick start (local)

```bash
npm install
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`). Works on desktop and mobile.

Build for production:

```bash
npm run build
npm run preview
```

Output goes to `dist/` — GitHub Pages deploys automatically on push to `main`.

## How to fly

### The basics

You always fly **forward**. Gravity pulls you down — without lift you **descend**. Work to stay aloft with pointer and keyboard. There is no game over; sink low and climb back. Ambient wind exists but is **not** enough to hover forever.

### Pointer (mouse / touch)

Move your pointer — the plane **turns and tilts** toward the breeze. Pointer up = climb tendency; pointer sideways = bank and turn.

### Click / tap — breeze wave

Drops an expanding green **wave** (reticle + ring + streaks). The plane keeps its path until the wave front reaches it, then lurches **away from the click**. Nearby = fast and strong; far = delayed and weaker.

### Keyboard

| Key | Action |
|-----|--------|
| **W** / **↑** | Climb (pitch up, gain lift) |
| **S** / **↓** | Dive |
| **A** / **←** | Turn / bank left |
| **D** / **→** | Turn / bank right |
| **Space** | Barrel roll (short cooldown) |

Hold keys to steer; they combine with pointer breeze. On touch, **tap the plane** for barrel roll.

### Gravity & lift

- Gravity constantly pulls the plane down.
- **Forward speed + nose-up pitch** generate lift — use **W** or pointer-up to climb.
- Release climb input and you gradually lose altitude. No crash state — just glide back up.

### Sound

First gesture unlocks a quiet whoosh bed plus soft cues on wave hits, turns, and rolls. No music, no harsh beeps.

## Look

- **Retro terminal bezel** — CRT frame, scanlines, phosphor-green chrome
- **Persistent flight ribbons** — dual wingtip trails (3D + screen overlay) that never wipe during a session
- **Living starfield** — twinkling stars, parallax, streaming dust — no planets

## Feel

Real paper-plane flight: forward momentum, gravity, and breeze. Clicks send ripples through the wind; you work to stay up.

## v1.1 ideas

- **Soundscape** — layered phosphor hum, soft terminal static, subtle doppler on rolls
- **Fold skins** — swap wireframe crease patterns and green intensity presets
- **Share a 10s loop** — record a short flight clip as a GIF or link

---

Built by Adonay Lizardo with Forge.
