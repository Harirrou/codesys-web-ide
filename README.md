# Wispbloom 🌸

**Every match reshapes the sky.**

A fast, satisfying one-touch orbit-shooter puzzle game for Android (and any
modern browser). You are the heart of a dormant cosmic garden. Glowing wisps
drift along the orbit rings around you — shoot matching wisps into their
streams, burst them in threes, and watch every match *reshape the orbits
themselves*.

> Originally briefed as "Orbit Bloom"; renamed after the theme settled on
> soft bioluminescent creatures in a living cosmic garden.

---

## Play it right now (fastest)

The whole game is a self-contained HTML5 canvas app with **zero build step
and zero dependencies**:

```bash
# Option A: just open it
open game/index.html            # macOS
xdg-open game/index.html        # Linux
start game\index.html           # Windows

# Option B: serve it (recommended for phones on the same Wi-Fi)
cd game && python3 -m http.server 8080
# then browse to http://<your-laptop-ip>:8080 on your phone
```

Works with mouse or touch. On a phone browser choose "Add to Home Screen"
for a fullscreen experience.

## Build the Android app

The `android/` folder is a standard Android Studio project. The WebView shell
packages `game/` directly into the APK (see `sourceSets` in
`android/app/build.gradle.kts`), so the web game is the single source of truth.

1. Open `android/` in Android Studio (Hedgehog or newer).
2. Let Gradle sync (AGP 8.5.2, Kotlin 1.9.24, compileSdk 34, minSdk 26).
3. Run on a device/emulator, or **Build → Build APK(s)**.

The shell contributes: immersive fullscreen, keep-screen-on, hardware back
button routed into the game (`WB.handleBack`), pause/resume of WebView timers
on app backgrounding, and a native vibration bridge (`WispbloomAndroid.vibrate`).

## Controls

| Action | Input |
|---|---|
| Aim | Drag anywhere on screen |
| Shoot | Release |
| Swap loaded wisp | Tap the core |
| Pulse power | Tap the PULSE button when its meter is full |
| Pause | Top-left button (also auto-pauses on backgrounding) |

## The game in one paragraph

Wisps of 3–4 colors ride concentric orbit rings around your core. Shoot a
matching wisp into a stream to make 3+ and burst them; the gap snaps shut and
can cascade into chain reactions. **The Orbit Shift**: every match mutates the
level — rings reverse, surge, wisps leap between orbits, or the garden rests
(spawning pauses). Rings slowly fill from spawn gates; if any ring overgrows,
you lose. Chain two bursts off one shot to earn a **Prism** (wild wisp); four
matches charge the **Pulse** (area blast). Ten campaign levels rotate four
objectives — *charge the bloom*, *cleanse corruption*, *survive*, and a
**boss**: the Umbra Serpent, whose color-shelled segments ride the outer ring
and must each be cracked with matching shots while it roars (reversing all
orbits) and feeds (flooding the inner ring).

Full design document: [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md)

## Project structure

```
game/                     the actual game (HTML5 canvas, no dependencies)
  index.html
  css/style.css
  js/util.js              math/angles/RNG/easing helpers
  js/audio.js             synthesized SFX + ambient music (WebAudio)
  js/particles.js         particles, rings, floating text, shake, slow-mo
  js/save.js              localStorage save: stars, bests, settings
  js/levels.js            DATA-DRIVEN level definitions + endless/daily gen
  js/core.js              gameplay sim: rings, matching, shifts, boss, render
  js/ui.js                screens: title, level path, HUD, pause, results…
  js/main.js              bootstrap: canvas/DPR, input, loop, lifecycle
android/                  Android Studio project (Kotlin WebView shell)
docs/GAME_DESIGN.md       concept, mechanics, level design, roadmap
```

Adding a level = adding one object to `WB.LEVELS` in `js/levels.js`.
The schema is documented at the top of that file.

## Testing

An automated Playwright smoke test was used during development (loads the
game, drives level 1 to a win, verifies drag-aiming via real pointer events,
beats the boss, screenshots every screen, asserts zero console errors). Re-run
the idea with any Playwright install pointing at `game/index.html`.

Manual checklist:
- Level 1 is winnable in under a minute and teaches itself via hint banners.
- Ring crowding shows a red pulsing warning before a loss.
- Sound starts only after the first touch (autoplay policy).
- Backgrounding the app/tab pauses gameplay and audio, and saves.

## Placeholder assets to replace later

Everything ships procedural so the game is fully playable today; these are the
intended upgrade points:

1. **Wisp sprites** — currently gradient orbs with glyphs (`core.js → drawOrb`).
   Replace with hand-painted creature sprites (keep the per-color glyphs for
   colorblind accessibility).
2. **Backgrounds** — per-world painted backgrounds are already in: the game
   loads AI-painted art (generated with Higgsfield, hosted on its CDN) and
   falls back to the baked images in `game/img/` when offline
   (`main.js → WB.BG`, `ui.js → drawBgImage`). To make the AI art permanent,
   download the four `BG_REMOTE` URLs in `main.js` over the baked
   `img/bg-*.jpg` files (the extension mismatch is harmless to browsers).
   Final hand-painted parallax illustrations remain the end goal.
3. **SFX & music** — WebAudio synthesis (`audio.js`). Replace with recorded
   layered samples and a composed ambient track; the call sites
   (`shoot/attach/match/shift/…`) are already the final event vocabulary.
4. **Boss art** — segments are drawn shapes (`core.js → drawBossSegment`).
   Replace with an articulated serpent illustration.
5. **App icon** — vector approximation of the emblem
   (`android/.../ic_launcher_fg.xml`); replace with final art.
6. **Fonts** — system-ui stack; consider a licensed display font for titles.

## Next development phase (recommendations)

1. **More worlds**: 3 worlds × 10 levels, each introducing one new shift type
   (portals between rings, frozen arc sections, splitting orbits).
2. **More power pieces**: Time Drop (slow), Split Seed (dual shot), Echo Seed
   (repeats last successful shot) — the projectile/piece flags in `core.js`
   are designed to extend this way.
3. **Cosmetics**: projectile trails, core skins, orbit themes unlocked by
   stars (save system already tracks totals).
4. **Meta polish**: world map illustration, level-intro objective card,
   score popups on the map, cloud save.
5. **Native packaging polish**: Play-ready signing config, versioned release
   builds, Play Asset Delivery if art grows.
6. **Analytics-free difficulty tuning**: expose per-level constants
   (spawn interval, capacities, star thresholds) — already data-driven in
   `levels.js` — and playtest sweep with the bot harness.
