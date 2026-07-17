# Wispbloom Unity — Vertical Slice: Run, Verify, Approve

## 1. Opening the project (playable Android-ready scene)

1. Install **Unity 6 LTS (6000.0.x)** with the Android Build Support module.
2. Open `unity/Wispbloom` (first import compiles URP; ~2–5 min).
3. Menu **Wispbloom → Build Vertical Slice** — one click creates the URP
   2D-Renderer assets, portrait Android player settings, placeholder art,
   the data assets, and `Assets/Scenes/VerticalSlice.unity`, already added
   to Build Settings.
4. Menu **Wispbloom → Fetch Painted Art** (needs internet) — downloads the
   generated painterly assets, applies manifest import settings and rebinds
   them; placeholders retire automatically.
5. Press **Play** in the editor, or **File → Build & Run** on a connected
   Android phone.

Controls: drag anywhere = aim (dotted guide + ghost), release = shoot, tap
the flower = swap, PULSE button when full = armed blast. Escape/back =
pause.

## 2. Screenshots (checkpoint deliverable)

This repo was authored in a cloud environment without a Unity editor, so
front-facing screenshots must come from your first run — the slice makes
that a one-tap job: **two-finger tap (or F2)** saves a PNG to
`Application.persistentDataPath`; **three-finger tap (or F1)** toggles the
performance HUD so captures include live numbers. Please attach 3 shots at
the approval checkpoint: idle field, a chain burst, and the win panel.

## 3. Comparison vs. the reference art direction

| Reference requirement | Slice implementation |
|---|---|
| Deep midnight blue + nebula | Painted dawn background (`bg_dawn`) + dark global 2D light |
| Warm luminous central flower | 12 instanced painted petals (2 rows) + additive heart + URP 2D point light that literally lights nearby spirits; opens with progress, kicks on match, celebrates on win |
| Cute translucent spirits, painted edges, no flat circles with faces | Generated painterly blob spirits (3 colors), breath/blink/squash driven by curves, chain-hot glow, dissolve-with-glowing-edge on removal |
| Orbit paths as moving light, not line circles | Ring mesh + `WBOrbitFlow` shader (scrolling painted band, pulse, danger blush) + orbiting crystal spark particles, depth-tinted per ring |
| Tiny drifting stars / magical dust | Background painting + burst/dust particle systems (pooled emitter) |
| Selective soft bloom | URP Volume: threshold 1.05 (only HDR-bright pixels), intensity 0.55 |
| No default Unity buttons | All UI on the custom 9-slice glow skin + shadowed type |
| Safe-area & aspect coverage | `CameraWidthFit` (16:9→21:9 portrait), `SafeAreaFitter` on every panel |

## 4. Known visible weaknesses (honest list)

1. `ui_panel_glow`, star, dusk spirit, corrupt-thorn overlay are still
   procedural placeholders (manifest rows 4/5/11/12).
2. The orbit band texture tiles 6× around the ring; at the largest ring a
   seam repeat can be noticed — needs a dedicated arc-authored texture or
   higher repeat with variation.
3. Spirit eye-blink is material/curve-driven but the painted sprites have
   baked-open eyes — a 2-frame closed-eye variant per spirit would complete
   the blink illusion.
4. Bloom is calibrated in the editor, not yet eyeballed on an OLED phone.
5. Legacy UGUI Text (not TMP) — crisp at 1080p reference but TMP SDF is the
   phase-2 typography upgrade.

## 5. Performance measurement protocol

On device: enable the perf HUD (three-finger tap), play 60 s including
chains and the pulse blast, record avg fps / avg ms / worst ms shown.
Budget targets: 60 fps on a 2020 mid-ranger (Snapdragon 730-class), < 3 ms
worst-frame spike from bursts (pooled particles + zero per-frame
allocations in the sim hot path were built for this). Report numbers at
the checkpoint; URP settings (HDR on, MSAA off, bloom scatter 0.6) are the
first knobs if a device misses budget.

## 6. Migration estimate for the remaining game

See `MIGRATION_MAP.md` §Phasing — ≈ **7–9 working days**: levels 1–16 data
(0.5 d), Title/Map/Grove/Settings/HowTo (2–3 d), Portal shift + Umbra
Serpent boss view (2 d), Endless/Daily (0.5 d), cosmetics (0.5 d), device
QA + atlas/bloom pass (1–2 d).

## 7. Approval checkpoint

Reply with: (a) the 3 screenshots + perf numbers, (b) art verdict per
manifest row (approve / regenerate with prompt tweak), (c) go / no-go on
phase 2 scope. Nothing beyond the slice gets built until this checkpoint
clears — per the brief.
