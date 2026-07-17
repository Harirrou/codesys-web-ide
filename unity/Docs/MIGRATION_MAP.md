# Wispbloom — Prototype → Unity Migration Map

Target: **Unity 6 LTS (6000.0.x)** · 2D project · **URP with the 2D
Renderer** · Android portrait · Input System (touch-first) · no third-party
packages · no visual scripting · C# split into Data / Sim / Game / View /
UI / Audio assemblies-by-folder.

Principle: the simulation is ported as **pure C# with no UnityEngine
dependency in the rules** (`Assets/Scripts/Sim`). Views subscribe to sim
events. This makes the port verifiable against the prototype (same inputs →
same outcomes) and keeps art swaps zero-risk for gameplay.

| Prototype (file → concern) | Unity equivalent | Notes |
|---|---|---|
| `levels.js` level objects | `LevelDefinition` ScriptableObject (`Scripts/Data`) | One asset per level; identical fields (objective, rings, spawn, shifts, s2/s3, hints). Authoring new levels = new assets, no code. |
| `core.js` constants (speeds, gaps, windows) | `GameTuning` ScriptableObject | Single balancing surface; defaults copied verbatim (PROJ_SPEED 1150 px/s → 11.5 u/s at 100 PPU, CHAIN_WINDOW 2.2, GAP_PULL 1.6, minGap factor 2.15, join 1.45, surge 1.9…). |
| `core.js` `Game` class (rings, pieces, separation, spawner, shifts, matching, chains, prism/pulse, objectives, fail/win) | `GameSim` + `OrbitSim` + `MatchSystem` + `ShiftSystem` (`Scripts/Sim`, pure C#) | Deterministic; seeded `Mulberry32` port for Daily. Emits `SimEvents` (PieceAttached, RunBurst, ShiftTriggered, PieceLeaped, SpawnWarning, Won, Lost…). |
| `core.js` input handlers (`onDown/Move/Up`, aim ray) | `AimController` (`Scripts/Game`) using Input System `EnhancedTouch` + mouse fallback | Same thresholds: 22 px tap radius (converted via `Screen.dpi`), aim = pointer − core in world space; guide via the same ray-march against sim state. |
| `core.js` rendering (wisps/core/rings/serpent) & `art.js` | Prefab views: `SpiritView`, `FlowerView`, `RingView`, `SerpentView` (phase 2) under `Scripts/View` + URP materials | All visuals read sim state; **no gameplay in views**. Placeholder sprites live in `Assets/Art/Placeholders` and are referenced only via the `ArtBinding` asset — swapping art touches zero code. |
| `particles.js` (bursts, rings, floating text, shake, slow-mo) | `EffectsDirector` + pooled `ParticleSystem`s + TMP floating text pool + Cinemachine-free camera shaker (simple impulse) | Slow-mo = `Time.timeScale` envelope (result timers use unscaled time, matching the prototype fix). Reduce-motion honored. |
| `audio.js` WebAudio synthesis | `AudioSynth` (`Scripts/Game`) generating PCM `AudioClip`s at boot + `AudioDirector` routing the same event vocabulary | Zero audio assets, identical pentatonic chain melodies; later swap = assign clips in `AudioDirector`. |
| `save.js` localStorage JSON | `SaveService` → JSON via `JsonUtility` in `Application.persistentDataPath` | Same schema + version field; settings identical incl. `glyphs` accessibility toggle. |
| `ui.js` canvas HUD/panels | UGUI + TextMeshPro: `HudView`, `PausePanel`, `ResultPanel` (slice); Title/Map/Grove/Settings/HowTo (phase 2) | Custom 9-sliced glow sprites (generated) — no default Unity button skin. `SafeAreaFitter` on every panel root. |
| `main.js` loop/lifecycle/back button | `GameController` (state machine: Playing/Paused/Won/Lost), `OnApplicationPause` → auto-pause + save, Android back via Input System `escapeKey`/back | Portrait locked in Player Settings by the bootstrap. |
| Backgrounds (Higgsfield CDN + baked fallback, per world, per orientation) | Static painted background sprite per world + URP 2D global light tint + existing dust/star particles | Portrait art re-used as-is (`bg-*.jpg`); imported by the art fetcher. |
| DPR cap / perf guards | URP asset tuned for mobile (no MSAA-4+, HDR off), Sprite Atlas, pooled everything, `PerformanceHud` | Slice ships with an on-screen FPS/frametime meter (toggle) for the checkpoint measurements. |

## Phasing

- **Vertical slice (this delivery):** one scene, one `LevelDefinition`
  ("Twin Streams" configuration: 2 rings, 3 spirit types, Bloom 20 —
  chosen over level 1 because the brief requires multiple tracks and three
  spirit types; level 1's single ring is a strict subset), full rule set
  minus boss/portal, HUD + pause + result, synth audio, FX, safe-area,
  perf HUD, screenshot tool.
- **Phase 2 (estimate below):** remaining 15 `LevelDefinition` assets
  (data entry, ~0.5 day), Title/Map/Grove/Settings/HowTo screens (2–3
  days), Portal shift + `SerpentView` boss (2 days), Endless/Daily (0.5
  day), cosmetics hookup (0.5 day), device QA + atlas/bloom tuning pass
  (1–2 days). **Total ≈ 7–9 working days** after slice approval.

## Deliberate deviations (flagged, not hidden)

1. **"Remaining moves"** — the prototype has no move limit; the objective
   counter is the equivalent scarce-resource display (see spec §5). The
   slice HUD shows Score + Objective pill. Adding a move limit would be a
   design change requiring your sign-off.
2. **Shader Graph** — the four requested effects (dissolve, rim, flowing
   orbit energy, soft distortion) ship as hand-written URP-compatible HLSL
   (`Assets/Shaders`), because shader *code* is reviewable and
   version-stable in a repo built outside the editor. Each file documents
   its graph-node equivalent; rebuilding them as .shadergraph assets is a
   1:1 mechanical task if you prefer graphs.
3. **Bloom** — URP 2D bloom requires a Volume + HDR emissive colors; the
   slice enables a restrained global bloom via the bootstrap and keeps all
   emissive intensities data-driven in materials so "selective bloom" is
   tuned per-asset, not via extra cameras.
