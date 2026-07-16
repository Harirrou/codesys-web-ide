# Wispbloom — Game Design Document

**Name:** Wispbloom  •  **Tagline:** *Every match reshapes the sky.*
**Genre:** One-touch orbit-shooter puzzle (2D)  •  **Platform:** Android (WebView shell over an HTML5 canvas core), runs in any modern browser.

---

## 1. Concept selection (brainstorm summary)

Variations explored against the brief (originality, simplicity, touch
usability, visual appeal, dev difficulty, replayability, level authoring,
video appeal):

| Variation | Verdict |
|---|---|
| **A. Living cosmic garden** — wisps orbit a dormant bloom; matches wake it | ✅ **Chosen.** Strong silhouette (flower core + rings), warm emotional framing, glow-friendly art that screenshots well, and the "garden reacts to you" fantasy maps perfectly onto the Orbit Shift mechanic. |
| B. Ancient celestial machine — gears as orbits, symbols as pieces | Strong look but reads "cold"; gear teeth fight the smooth circular motion that makes aiming readable. |
| C. Stained-glass organisms — shards fuse into windows | Gorgeous stills, but glass shatter effects overwhelm play readability on small screens. |
| D. Ink-and-light world — sumi-e trails | Distinctive but low color separation hurts match-3 clarity, the one thing that cannot be compromised. |

Mechanics brainstormed then **cut** (with reasons): two-color pieces (readability
on 5–6 mm orbs), rhythm pulses (fights one-hand casual play), shadow pieces
copying the last shot (invisible rules frustrate), portals (kept for world 2 —
too much for the first ten levels). Mechanics **kept** are individually
teachable in one banner line each — see §3.

## 2. Core loop (2–4 minute levels)

1. **Read** the rings: colors drifting, gaps opening, gates spawning.
2. **Aim** (drag — a dotted guide with a ghost marker shows exactly what you'll hit) and **release**.
3. **Burst** 3+ → gap snaps shut → possible **chain reaction**.
4. **Orbit Shift** fires on every match → the level is now different.
5. Manage pressure (spawn gates fill rings; overgrow = lose) while pushing the objective.
6. Win → stars → next level unlocks; garden path progresses.

Skill expression: leading moving targets, banking on chain-snaps, choosing
*which ring* to match knowing which shift comes next (shifts cycle
round-robin, so experts can plan them), saving Prisms/Pulses for crowded rings.

## 3. The Orbit Shift (signature mechanic)

Every successful match triggers the next shift in the level's pool
(round-robin — predictable, therefore strategic):

| Shift | Effect | Banner |
|---|---|---|
| **Reverse** | The matched ring flips direction | ORBIT REVERSED |
| **Surge** | All rings run ~2× speed for 3 s | SURGE! |
| **Leap** | Up to 2 wisps jump from the matched ring to another (chain-hot on arrival — can instantly cascade) | WISPS LEAP |
| **Lull** | Spawning pauses 5 s (a positive shift for pacing) | THE GARDEN RESTS |

Levels introduce these one at a time (L4 reverse → L5 surge → L6 leap → L7 lull).

## 4. Pieces

- **Wisps** (4 colors), each with a **unique inner glyph** (dot / diamond /
  triangle / cross) — colorblind-safe by default.
- **Corrupted wisps** — thorned, darkened, glyph shows their true color;
  cleansed by matching that color. Drives the *cleanse* objective.
- **Prism** (earned, not random): chain **two bursts off one shot** → your next
  wisp is a wild that matches anything.
- **Pulse** (ability button): 4 matches charge it; the armed shot detonates,
  clearing the struck wisp and two neighbors per side, with slow-mo + shake.
- **Boss segments** — color-shelled, immune to normal matching; see §6.

## 5. Objectives & levels

Objectives rotate so no two consecutive levels feel the same:
**Bloom** (charge the core with burst energy), **Cleanse** (destroy all
corrupted), **Survive** (hold out under fast spawning), **Boss**.
Failure is always the same readable rule: *don't let any ring overgrow*
(crowded rings pulse red and chirp a warning first).

| # | Name | Objective | Teaches |
|---|---|---|---|
| 1 | First Light | Bloom 12 | aim, shoot, match, swap |
| 2 | Twin Streams | Bloom 20 | two rings, spawn gates, overgrowth |
| 3 | Creeping Shade | Cleanse 6 | corrupted wisps |
| 4 | The Garden Stirs | Bloom 28 | **Orbit Shift: reverse** |
| 5 | Hold the Bloom | Survive 60 s | surge; Pulse unlocks |
| 6 | Leaping Lights | Cleanse 8 | leap; 4th color; Prism |
| 7 | Deep Nectar | Bloom 45 | lull; 3 rings under pressure |
| 8 | Night of Petals | Survive 90 s | all shifts together |
| 9 | Shadow Storm | Cleanse 14 | mastery check |
| 10 | The Umbra Serpent | **Boss** | everything |

Stars: 1 = win, 2/3 = score thresholds (in level data). Endless Garden and
seeded **Daily Bloom** reuse the same sim with escalating spawn rates.

## 6. Boss — The Umbra Serpent

A shadow serpent of **8 color-shelled segments** riding the outer orbit.
Normal controls only:

- Hit a segment with its shell color (or a Prism) → **crack** (the shell
  re-colors — re-aim!) → second matching hit **breaks** it.
- Wrong color → harmless bounce.
- Every 15 s it **roars**: all rings reverse + surge (screen shake).
- Every 9 s it **feeds**: two wisps flood the inner ring — the overgrow clock
  is the real pressure.
- Break all 8 shells to win; each break enrages it (rings speed up).

## 7. Art direction

Bioluminescent cosmic garden: deep indigo-violet night, soft nebula blooms,
twinkling starfield, drifting ambient motes. Gameplay elements are the
brightest things on screen (readability first): additive-glow orbs with white
hot-spots, dashed orbit paths that drift to show direction, a six-petaled
core that opens as it charges. Bursts = radial sparks + expanding ring +
floating score; big moments get slow-motion and screen shake (both disabled
by "reduce motion"). All current art is procedural placeholder tuned to look
premium in screenshots; replacement plan in the README.

## 8. UX / screens

Title (animated emblem + orbiting wisps) → Garden Path (level grid, stars,
locks) → Gameplay (minimal HUD: pause, objective pill, score, Pulse button)
→ Pause (resume/restart/quit + quick sound/music/vibration) → Win/Lose
(animated stars, thresholds, next/replay/map) → Settings (sound, music,
vibration, reduce motion, reset w/ confirm) → How to Play (8 illustrated
rows). Touch targets ≥ 44 px; layout adapts to any portrait ratio; DPR-aware
rendering capped at 2.5× for low-end GPUs.

Tutorialization is interactive: timed hint banners inside levels 1–6, never a
text wall.

## 9. Audio

Fully synthesized (WebAudio): pitched pentatonic chimes that climb with chain
depth (chains literally play melodies), soft pluck shoot, low-mid thud attach,
whoosh + sub drop for shifts, airy pad + sparse plucks as ambient music.
Unlocks on first touch (autoplay policy), suspends on backgrounding.

## 10. Architecture

Strict module split (globals on `WB`, classic scripts so `file://` works in
WebView): `util` (math) / `audio` / `particles` (fx) / `save` / `levels`
(pure data) / `core` (simulation + field rendering) / `ui` (screens) /
`main` (loop, input, lifecycle). The Android layer is a ~100-line Kotlin
shell (immersive WebView + vibration bridge + back-button routing) — gameplay
code never touches Android APIs. Determinism where it matters: daily levels
seed a mulberry32 RNG.

Balancing levers are all data: ring speeds/radii/capacities, spawn intervals,
shift pools, star thresholds — one object per level in `levels.js`.
