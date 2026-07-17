# Wispbloom — Gameplay Specification (extracted from the prototype)

This document treats the existing HTML5 prototype (`game/`) as the
authoritative gameplay specification for the Unity rebuild. Every rule below
was read out of the shipping code, with source references. Nothing here is a
redesign.

Sources: `game/js/core.js` (simulation + field rendering), `game/js/levels.js`
(level data), `game/js/ui.js` (screens/HUD), `game/js/save.js` (persistence),
`game/js/audio.js` (synthesized audio), `game/js/main.js` (loop/lifecycle).

---

## 1. Core gameplay loop

A shooter-puzzle around a central flower ("the core"):

1. Wisps (colored spirit pieces) ride concentric orbit rings, drifting at
   per-ring angular speeds.
2. The player aims from the core and shoots the loaded wisp outward.
3. The projectile attaches to the first wisp it collides with, inserting into
   that ring at the impact angle (`onProjectileHit`).
4. A contiguous same-color run of **3+** bursts (`findRun` / `burst`):
   score, "energy", particles, and a possible chain reaction.
5. **Orbit Shift** — every burst triggers the next shift from the level's
   pool, cycled **round-robin** (`triggerShift`, `shiftIdx`): the level's
   structure changes on every match.
6. Spawn gates periodically add wisps; if any ring reaches its capacity the
   level is lost ("overgrown").
7. Objective completion wins the level (see §6).

## 2. Player input and gestures

From `Game.onDown/onMove/onUp` + `ui.onDown` routing:

- **Drag anywhere → aim.** The aim vector is `pointer − coreCenter`
  (not drag delta). A dotted guide line raycasts to the first wisp that
  would be hit and shows a pulsing ghost ring there (`drawAim`, ray marched
  in 7 px steps).
- **Release → shoot** if drag distance > 22 px.
- **Tap (≤22 px drag) on the core** (within 1.9× core radius) → swap the
  loaded wisp with the next one.
- **Tap the PULSE button** (bottom-left, when meter full) → arm the Pulse
  shot. Button appears from campaign level 5 onward and in endless/daily.
- UI buttons capture the pointer first; gameplay only receives input when no
  button is hit and the game is neither paused nor decided.

## 3. Movement and orbit rules

- Ring layout: radii distributed between `coreR + pieceR + 26` and
  `min(w·0.47, h·0.36)` by each ring's relative `rr` (`layout`).
- Piece angular motion: `a += (ringSpeed + impulse) · dt`;
  `ringSpeed = speed · dir · surgeMult · bossRage` (`ringSpeed`,
  `updateRings`). `surgeMult = 1.9` while a Surge shift is active.
- **Separation**: pieces behave like beads — each frame pieces are sorted by
  angle and any pair closer than `minGap = pieceR·2.15 / ringR` is pushed
  apart symmetrically, 3 relaxation passes (`separate`).
- **Gap pull**: after a burst, the two pieces flanking the gap receive an
  angular impulse (±1.6 rad/s, fast exponential decay) toward each other and
  a 2.2 s "chain-hot" window (`flagChainEdges`, `CHAIN_WINDOW`, `GAP_PULL`).
- Radial animation: newly attached/leaped/teleported pieces animate from
  their entry radius to the ring radius over ~1/7 s eased (`pieceRadius`,
  `radialT += dt·7`, easeOutCubic).
- Spawn pop: `scale` grows 0→1 at 5/s; idle wobble `wobble += 2.2·dt` drives
  a ±5 % scale breathing and the blink phase.

## 4. Matching, collision, spawning, removal

- **Projectile**: speed 1150 px/s from the core edge; collides when within
  `pieceR·0.9 + targetRadius` of any piece (`findHit`; boss segments have
  1.5× radius). Misses that exit `outerR + 60` vanish with no penalty.
- **Attach**: creates a piece at the impact angle; neighbors within
  `minGap·2.3` squash to 72 % scale (impact wave). A Prism projectile adopts
  the struck piece's color but stays wild.
- **Match**: run detection walks both directions from the new piece while
  the angular gap ≤ `minGap·1.45` and colors match; **Prism is wild** (joins
  any run; a prism-only run adopts the first real color). Boss segments
  never join runs. Run ≥ 3 → burst.
- **Chain reactions**: each frame, any chain-hot piece whose run reaches 3+
  bursts as a chain (`checkChains`, one chain per frame for readability).
- **Burst effects**: score `30 · runLength · (1 + (combo−1)·0.5)`; energy
  `+runLength`; ability meter +1 (not from Pulse blasts); corrupted pieces in
  the run count toward Cleanse. Combo = cascade depth of the current shot
  (`this.combo`), shown as "CHAIN ×N" from ×2; slow-mo at ×3.
- **Prism earn rule**: exactly on the **2nd burst of one shot**, if no prism
  is already pending/loaded → the next drawn wisp is a Prism.
- **Pulse power**: meter 0–4; arming costs the full meter; the armed shot
  clears the struck piece ± up to 2 neighbors per side (max 5), with
  slow-mo + heavy shake; it does not charge the meter.
- **Spawning**: each level defines `spawn.interval` and target rings; a
  spawner drops one random-color wisp at the ring's fixed gate angle
  whenever the timer elapses (blocked while a Lull is active; endless mode
  shrinks the interval by 0.022 s per elapsed second, floor 1.7 s). At
  `capacity − 2` a warning chirp + red ring pulse begins.
- **Removal**: bursts remove pieces immediately; the serpent boss removes a
  segment when its 2-hit shell breaks.
- **Color draw**: the loaded/next wisp colors are weighted by colors
  currently on the field (`drawColor`, weight 1 + 3·count) so shots stay
  useful.

## 5. Score and "remaining" logic

- Score: burst formula above, +400 per boss segment destroyed.
- **The prototype has no move limit.** The scarce resource is *time/board
  pressure*, surfaced as the objective pill: energy `n/target` (Bloom),
  corrupted remaining (Cleanse), seconds remaining (Survive), shells
  remaining (Boss). The Unity HUD reproduces the objective pill; the brief's
  "remaining moves" maps to this counter (documented deviation — inventing a
  move limit would change the game).
- Stars: 1 for winning; 2/3 at per-level score thresholds `s2`/`s3`.

## 6. Level progression

- 16 campaign levels in `WB.LEVELS`, data-driven (schema at the top of
  `levels.js`): objective, colors (3–4), rings (radius, direction, speed,
  prefill, corrupted count, capacity), spawner, shift pool, star thresholds,
  timed tutorial hints, background/world key.
- Objectives: `bloom` (energy target), `cleanse` (clear all corrupted),
  `survive` (hold N seconds), `boss` (break 8 serpent shells).
- Shift pool grows by world: reverse → surge → leap → lull → portal (W2).
- Unlock rule: level N is playable once level N−1 has ≥1 star.
- Extra modes: Endless Garden (escalating spawn) and Daily Bloom (same
  generator, date-seeded RNG — mulberry32 for determinism).
- Initial boards are seeded in 1–2 piece clumps and sanitized so no ready
  match of 3 exists at spawn (`sanitizeInitial`).

## 7. Pause, restart, win, failure

- Pause: HUD button or app backgrounding (`visibilitychange`) → modal with
  Resume / Restart / Quit + quick sound/music/vibration toggles. Simulation
  and effects fully freeze.
- Win: objective met → `winNow`: field-wide burst FX, win jingle, slow-mo;
  result panel after 0.9 s (real-time) with animated stars, score,
  thresholds, Next/Replay/Map.
- Failure: any non-boss ring at capacity → `fail`: lose sting, shake;
  panel with Try Again / Map. Boss's inner-ring flood uses the same rule.
- Android back button: pause → quit-to-menu → title → exit (`WB.handleBack`).

## 8. Saved data and settings

`localStorage` JSON (`save.js`), schema v1:

- `stars` (per level), `bestEndless`, `daily{dateKey:best}` (today only),
- `cosmetics { trail, core }` — earned by total stars, equipped in Grove,
- `settings { glyphs:false, sound, music, vibration, reduceMotion }`.

Writes on: star/best improvements, every settings toggle, backgrounding.
Defaults are merged over missing fields on load. "Reset progress" clears
stars/bests after a double-tap confirm.

## 9. Audio behavior

100 % synthesized (WebAudio), unlocked on first touch, suspended when
hidden. Event vocabulary (`audio.js`): shoot (pluck+noise), swap, attach
(low thud), match (3-note pentatonic arpeggio whose base steps up with
chain depth — chains play rising melodies), shift (whoosh + sub), power,
warn (double chirp), bossHit, button, win (5-note rise), lose (falling
pair). Music: continuous pad (3 detuned oscillators through a lowpass with
a slow LFO) + sparse random pentatonic plucks every 1.6–4.2 s; music gain
ramps with the setting.

## 10. Screens and UI states

Title (living flower emblem, orbiting wisps, light rays, falling petals,
wordmark; PLAY / ENDLESS / DAILY / HOW TO / GROVE / SETTINGS; stars+best
footer) → Garden Path level select (two worlds, winding dotted path, star
pips, locks, boss node) → Gameplay HUD (pause, objective pill, score,
PULSE meter button, timed hint banners, shift banners, level-name intro,
danger vignette) → Pause modal → Result panel (win/lose variants described
above; endless/daily show best & NEW BEST) → Grove (trail + core-skin
collection, equip states, star gates) → Settings (5 toggles + reset w/
confirm) → How to Play (8 illustrated rows). Screen transitions use a
0.33 s fade; modals swallow all input behind them.
