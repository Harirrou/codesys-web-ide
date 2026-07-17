# Wispbloom — Art Asset Manifest (Vertical Slice)

Status legend: **GENERATED** = already produced (Higgsfield, URLs baked into
`PaintedArtFetcher.cs`; menu *Wispbloom → Fetch Painted Art* downloads,
imports and binds them). **PLACEHOLDER** = procedural stand-in only, listed
so it can be produced with the same pipeline. Placeholder files are all
prefixed `PLACEHOLDER_` and live in `Assets/Art/Placeholders` — visual
quality is NOT claimed complete while any of them is still bound.

Common: PNG with straight alpha unless noted; additive assets may ship on
black (alpha ignored by the additive shader). sRGB, no mipmaps, bilinear.

| # | Filename | Purpose | Px | Alpha | Pivot | PPU | Sorting layer/order | Animated by | Maps | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `spirit_tide.png` | Tide spirit body | 1024² | yes | center | 640 | Field/11 | code (breath, blink, squash) | none | GENERATED |
| 2 | `spirit_blossom.png` | Blossom spirit body | 1024² | yes | center | 640 | Field/11 | code | none | GENERATED |
| 3 | `spirit_ember.png` | Ember spirit body | 1024² | yes | center | 640 | Field/11 | code | none | GENERATED |
| 4 | `spirit_dusk.png` | Dusk spirit body (4th color, phase 2) | 1024² | yes | center | 640 | Field/11 | code | none | PLACEHOLDER |
| 5 | `spirit_corrupt_overlay.png` | Thorn crown overlay for corrupted spirits | 1024² | yes | center | 640 | Field/12 | code (slow pulse) | none | PLACEHOLDER |
| 6 | `flower_petal.png` | Single core petal (12 instanced, 2 rows) | 1024² | black-additive | **bottom-center** | 512 | Field/20-21 | code (open, sway) | emission via HDR tint | GENERATED |
| 7 | `flower_heart.png` | Core heart glow | 1024² | black-additive | center | 512 | Field/22 | code (pulse, celebrate) | none | GENERATED |
| 8 | `orbit_tile.png` | Orbit energy band, tiles in X around the ring mesh | 1376×768 | black-additive | n/a (mesh UV) | 512 | Field/4-6 | shader `_Scroll`, `_Pulse`, `_Danger` | none | GENERATED |
| 9 | `fx_dust.png` | Dust motes + sparkles particle sheet | 1024² | black-additive | center | 512 | FX/30 | Particle System | none | GENERATED |
| 10 | `bg_dawn.jpg` | Dawn-world painted background (portrait) | 768×1376 | no | center | 160 | Background/-10 | none (BackgroundCoverFit) | none | GENERATED |
| 11 | `ui_panel_glow.png` | 9-slice rounded glow panel/button skin (border 24 px) | 96² | yes | center | n/a (UI) | UI | UGUI tint states | none | PLACEHOLDER |
| 12 | `ui_star.png` | Result-screen star | 256² | yes | center | n/a | UI | code pop | none | PLACEHOLDER (uses sparkle) |
| 13 | `app_icon.png` | Launcher icon | 1024² | no | n/a | n/a | n/a | none | none | GENERATED (`hf_20260716_225142_2bc5764f…png`) |

## Exact generation prompts

Reproduce any asset consistently with these prompts (model: nano-banana-pro
class, 1:1 unless noted; spirit sprites pass through background removal):

- **#1–3 spirits** (swap the color words teal-turquoise / blossom-pink /
  amber-gold): *"Single cute round translucent spirit creature game sprite: a
  soft {COLOR} glowing blob with a small curled wisp tip at its upper right,
  minimal kawaii face with two small dark round eyes with tiny white glints
  and a tiny dark 'o' mouth, soft painterly airbrushed shading, pale luminous
  top-left, deeper {COLOR} lower edge, gentle white rim light, subtle inner
  glow. Perfectly centered, fills 80% of frame, on PURE SOLID BLACK
  background, no other objects, no text, no watermark. Premium mobile game
  asset, painted style."*
- **#4 dusk spirit**: same prompt with *"soft violet-lavender"*.
- **#5 corrupt overlay**: *"Crown of dark curved thorns forming an open ring,
  shadowy purple-black with faint magenta rim light, painterly, centered,
  transparent-ready on pure solid black background, no creature inside, game
  overlay sprite."*
- **#6 petal / #7 heart / #8 orbit band / #9 dust**: prompts recorded
  verbatim in `PaintedArtFetcher.cs` generation history (see also chat log);
  identical wording regenerates them.
- **#11 UI panel**: *"Rounded rectangle UI panel for a celestial fantasy
  game, deep translucent indigo glass with a delicate luminous silver-blue
  rim, soft outer glow, painterly edges, symmetric so it slices 9-way,
  centered on transparent background, no text."*
- **#12 star**: *"Single elegant five-point star of warm golden light, soft
  painted glow, centered, pure solid black background, game UI sprite."*

## Import pipeline

`PaintedArtFetcher.ApplyImportSettings` enforces PPU/pivot/wrap per this
table. Add new rows to the `Files` array + this manifest together. All field
sprites go into one Sprite Atlas (`Assets/Art/Wispbloom.spriteatlas`,
created in phase 2 once the full set exists) for mobile batching.
