// Wispbloom — bulletproof art fallback. If any ArtBinding slot is empty at
// runtime (e.g. the editor import pipeline failed on first open), the same
// placeholder textures are painted in memory and bound as sprites created
// with Sprite.Create — zero dependence on asset importing. Painted art
// fetched later still takes priority because only null slots are filled.
using UnityEngine;
using UnityEngine.UI;
using Wispbloom.Data;

namespace Wispbloom.View
{
    public static class RuntimeArt
    {
        public static void FillMissing(ArtBinding art)
        {
            if (art == null) return;
            art.spiritBodies ??= new Sprite[4];
            if (art.spiritBodies.Length < 4) art.spiritBodies = new Sprite[4];

            var spiritCols = new[]
            {
                (new Color(0.37f, 0.90f, 0.82f), new Color(0.11f, 0.43f, 0.39f)),
                (new Color(0.95f, 0.49f, 0.81f), new Color(0.49f, 0.18f, 0.40f)),
                (new Color(1.00f, 0.77f, 0.42f), new Color(0.54f, 0.35f, 0.11f)),
                (new Color(0.66f, 0.55f, 1.00f), new Color(0.29f, 0.20f, 0.56f)),
            };
            for (int i = 0; i < 4; i++)
                if (art.spiritBodies[i] == null)
                    art.spiritBodies[i] = Make(SpiritBody(spiritCols[i].Item1, spiritCols[i].Item2), 256f);

            if (art.spiritGlow == null) art.spiritGlow = Make(SoftGlow(256, false), 256f);
            if (art.flowerPetal == null) art.flowerPetal = Make(Petal(), 256f, pivotY: 0f);
            if (art.flowerHeart == null) art.flowerHeart = Make(SoftGlow(512, true), 512f);
            if (art.orbitTile == null) art.orbitTile = Make(OrbitTile(), 512f, wrap: true);
            if (art.dustMote == null) art.dustMote = Make(SoftGlow(64, false), 64f);
            if (art.sparkle == null) art.sparkle = Make(Sparkle(), 64f);
            // Prefer the baked Higgsfield painted sky; only paint a procedural
            // gradient if the Resources file is somehow absent.
            if (art.backgroundDawn == null)
                art.backgroundDawn = PaintedResources.Background("dawn") ?? Make(Background(), 100f);
            if (art.panelGlow9Slice == null)
                art.panelGlow9Slice = Make(Panel9(), 100f, border: new Vector4(24, 24, 24, 24));
            if (art.uiFont == null) art.uiFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        }

        /// <summary>Rebinds UI Images that were saved with null sprites (the
        /// scene was built while the ArtBinding was broken). Name-based and
        /// conservative: modal dim-backgrounds keep their plain look.</summary>
        public static void ReskinUi(ArtBinding art)
        {
            foreach (var img in Object.FindObjectsByType<Image>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (img.sprite != null) continue;
                string n = img.gameObject.name;
                if (n == "PausePanel" || n == "ResultPanel") continue;  // intentional dim veils
                if (n == "Danger" || n == "Fill") { img.sprite = art.spiritGlow; continue; }
                if (n.StartsWith("Star")) { img.sprite = art.sparkle; continue; }
                img.sprite = art.panelGlow9Slice;
                img.type = Image.Type.Sliced;
            }
        }

        // Public builders for the ambient/framing layers (AmbientDepth, flower
        // aura). Painted in memory like everything else here.
        public static Sprite MakeVignette() => Make(Vignette(), 100f);
        public static Sprite MakeAura() => Make(Aura(), 512f);
        public static Sprite MakeBokeh() => Make(Bokeh(), 128f);

        static Sprite Make(Texture2D tex, float ppu, float pivotY = 0.5f, bool wrap = false, Vector4 border = default)
        {
            tex.wrapMode = wrap ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
            tex.filterMode = FilterMode.Bilinear;
            tex.Apply();
            var sprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height),
                new Vector2(0.5f, pivotY), ppu, 0, SpriteMeshType.FullRect, border);
            sprite.name = "RUNTIME_" + tex.name;
            return sprite;
        }

        // ----- painters (mirrors Editor/PlaceholderArt.cs) --------------------
        static Texture2D NewTex(int w, int h, string name)
        {
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false) { name = name };
            var px = new Color[w * h];
            for (int i = 0; i < px.Length; i++) px[i] = new Color(0, 0, 0, 0);
            t.SetPixels(px);
            return t;
        }

        static Texture2D SpiritBody(Color main, Color dark)
        {
            const int S = 256;
            var t = NewTex(S, S, "spirit");
            Vector2 c = new Vector2(S / 2f, S / 2f - 6);
            float R = S * 0.36f;
            Color lightMain = Color.Lerp(main, Color.white, 0.72f);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    Vector2 p = new Vector2(x, y) - c;
                    // Round body with a soft upward wisp tip on the upper-right.
                    Vector2 tip = p - new Vector2(R * 0.5f, R * 0.98f);
                    float body = Mathf.Min(p.magnitude / R, tip.magnitude / (R * 0.4f));
                    if (body > 1f) continue;

                    // Vertical soft-body gradient (lighter toward the top).
                    float vGrad = Mathf.Clamp01(0.5f + p.y / (R * 2.1f));
                    Color baseCol = Color.Lerp(dark, main, 0.35f + vGrad * 0.55f);

                    // Key light, upper-left.
                    float key = Mathf.Clamp01(1f - (p + new Vector2(R * 0.42f, -R * 0.5f)).magnitude / (R * 1.35f));
                    Color col = Color.Lerp(baseCol, lightMain, key * 0.85f);

                    // Rim light along the lower edge for a soft 3D read.
                    float rim = Mathf.SmoothStep(0.78f, 1f, body) *
                                Mathf.Clamp01(0.5f - p.y / (R * 1.8f));
                    col = Color.Lerp(col, Color.Lerp(main, Color.white, 0.4f), rim * 0.5f);

                    // Glossy specular dab, upper-left.
                    float gloss = Mathf.Exp(-(p - new Vector2(-R * 0.34f, R * 0.36f)).sqrMagnitude / (R * R * 0.09f));
                    col = Color.Lerp(col, Color.white, gloss * 0.55f);

                    col.a = Mathf.SmoothStep(1f, 0.9f, body);
                    t.SetPixel(x, S - 1 - y, col);
                }

            void Dot(float fx, float fy, float r, Color col)
            {
                int r0 = (int)(r + 1.5f);
                for (int y = (int)fy - r0; y <= fy + r0; y++)
                    for (int x = (int)fx - r0; x <= fx + r0; x++)
                    {
                        if (x < 0 || x >= S || y < 0 || y >= S) continue;
                        float d = new Vector2(x - fx, y - fy).magnitude;
                        if (d > r) continue;
                        float a = Mathf.SmoothStep(1f, 0.6f, d / r) * col.a;
                        int yy = S - 1 - y;
                        // soft over-blend so features don't look stamped
                        t.SetPixel(x, yy, new Color(col.r, col.g, col.b, a));
                    }
            }

            var ink = new Color(0.17f, 0.11f, 0.24f, 1f);
            // rosy blush
            Dot(c.x - R * 0.34f, c.y - R * 0.26f, R * 0.14f, new Color(1f, 0.55f, 0.62f, 0.35f));
            Dot(c.x + R * 0.34f, c.y - R * 0.26f, R * 0.14f, new Color(1f, 0.55f, 0.62f, 0.35f));
            // eyes + catchlights
            Dot(c.x - R * 0.27f, c.y + R * 0.02f, R * 0.115f, ink);
            Dot(c.x + R * 0.27f, c.y + R * 0.02f, R * 0.115f, ink);
            Dot(c.x - R * 0.30f, c.y + R * 0.06f, R * 0.04f, new Color(1f, 1f, 1f, 0.95f));
            Dot(c.x + R * 0.24f, c.y + R * 0.06f, R * 0.04f, new Color(1f, 1f, 1f, 0.95f));
            // little smile
            Dot(c.x, c.y - R * 0.14f, R * 0.055f, new Color(ink.r, ink.g, ink.b, 0.9f));
            return t;
        }

        static Texture2D SoftGlow(int size, bool warm)
        {
            var t = NewTex(size, size, warm ? "heart" : "glow");
            Vector2 c = Vector2.one * (size / 2f);
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float k = 1f - Mathf.Clamp01((new Vector2(x, y) - c).magnitude / (size / 2f));
                    Color col = warm ? Color.Lerp(new Color(1f, 0.8f, 0.5f), Color.white, k) : Color.white;
                    t.SetPixel(x, y, new Color(col.r, col.g, col.b, k * k));
                }
            return t;
        }

        static Texture2D Petal()
        {
            const int W = 128, H = 256;
            var t = NewTex(W, H, "petal");
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    float v = y / (float)H;
                    float halfWidth = Mathf.Sin(Mathf.PI * Mathf.Pow(1f - v, 0.7f)) * W * 0.42f;
                    float dx = Mathf.Abs(x - W / 2f);
                    if (dx > halfWidth) continue;
                    float k = 1f - dx / Mathf.Max(1f, halfWidth);
                    Color col = Color.Lerp(new Color(1f, 0.86f, 0.62f), Color.white, v * 0.8f + k * 0.2f);
                    t.SetPixel(x, y, new Color(col.r, col.g, col.b, 0.55f + 0.45f * k));
                }
            return t;
        }

        static Texture2D OrbitTile()
        {
            const int W = 512, H = 128;
            var t = NewTex(W, H, "orbit");
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    float v = Mathf.Abs(y - H / 2f) / (H / 2f);
                    float band = Mathf.Exp(-v * v * 7f);
                    float shimmer = 0.75f + 0.25f * Mathf.Sin(x / (float)W * Mathf.PI * 8f);
                    t.SetPixel(x, y, new Color(0.85f, 0.93f, 1f, band * shimmer));
                }
            return t;
        }

        static Texture2D Sparkle()
        {
            const int S = 64;
            var t = NewTex(S, S, "sparkle");
            Vector2 c = Vector2.one * (S / 2f);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    Vector2 p = new Vector2(x, y) - c;
                    float star = Mathf.Max(0f, 1f - (Mathf.Abs(p.x) + Mathf.Abs(p.y)) / (S * 0.45f));
                    float cross = Mathf.Max(
                        Mathf.Exp(-Mathf.Abs(p.y) * 0.4f) * Mathf.Exp(-Mathf.Abs(p.x) * 0.06f),
                        Mathf.Exp(-Mathf.Abs(p.x) * 0.4f) * Mathf.Exp(-Mathf.Abs(p.y) * 0.06f));
                    t.SetPixel(x, y, new Color(1f, 1f, 1f, Mathf.Clamp01(star * 0.4f + cross)));
                }
            return t;
        }

        static Texture2D Panel9()
        {
            const int S = 96;
            var t = NewTex(S, S, "panel");
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float dx = Mathf.Min(x, S - 1 - x);
                    float dy = Mathf.Min(y, S - 1 - y);
                    float corner = Mathf.Min(new Vector2(Mathf.Max(0, 24 - dx), Mathf.Max(0, 24 - dy)).magnitude, 24f);
                    float inside = 24f - corner;
                    float a = Mathf.Clamp01(inside / 6f);
                    var fill = new Color(0.20f, 0.26f, 0.47f, 0.72f * a);
                    float rim = Mathf.Clamp01(1f - Mathf.Abs(inside - 3f) / 2.2f);
                    fill = Color.Lerp(fill, new Color(0.66f, 0.78f, 1f, 0.9f * a), rim * 0.8f);
                    t.SetPixel(x, y, fill);
                }
            return t;
        }

        static Texture2D Background()
        {
            const int W = 384, H = 688;
            var t = NewTex(W, H, "bg");
            var top = new Color(0.024f, 0.125f, 0.169f);
            var mid = new Color(0.039f, 0.173f, 0.267f);
            var bot = new Color(0.071f, 0.188f, 0.278f);
            for (int y = 0; y < H; y++)
            {
                float v = y / (float)H;
                Color row = v > 0.5f ? Color.Lerp(mid, top, (v - 0.5f) * 2f) : Color.Lerp(bot, mid, v * 2f);
                for (int x = 0; x < W; x++) t.SetPixel(x, y, new Color(row.r, row.g, row.b, 1f));
            }
            var rng = new System.Random(7);
            for (int i = 0; i < 160; i++)
                t.SetPixel(rng.Next(W), rng.Next(H),
                    new Color(0.85f, 0.9f, 1f, 0.25f + (float)rng.NextDouble() * 0.5f));
            return t;
        }

        // Radial darkening for cinematic framing: transparent center, dark edges.
        static Texture2D Vignette()
        {
            const int S = 256;
            var t = NewTex(S, S, "vignette");
            Vector2 c = Vector2.one * (S / 2f);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float d = (new Vector2(x, y) - c).magnitude / (S / 2f);
                    float a = Mathf.Clamp01((d - 0.55f) / 0.45f);
                    t.SetPixel(x, y, new Color(0.02f, 0.03f, 0.07f, a * a * 0.85f));
                }
            return t;
        }

        // Big soft radial aura for the flower / ambient glow.
        static Texture2D Aura()
        {
            const int S = 256;
            var t = NewTex(S, S, "aura");
            Vector2 c = Vector2.one * (S / 2f);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float k = 1f - Mathf.Clamp01((new Vector2(x, y) - c).magnitude / (S / 2f));
                    float soft = Mathf.SmoothStep(0f, 1f, k);
                    t.SetPixel(x, y, new Color(1f, 0.96f, 0.85f, soft * soft * 0.9f));
                }
            return t;
        }

        // Out-of-focus bokeh dot: bright soft ring, used for drifting motes.
        static Texture2D Bokeh()
        {
            const int S = 64;
            var t = NewTex(S, S, "bokeh");
            Vector2 c = Vector2.one * (S / 2f);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float d = (new Vector2(x, y) - c).magnitude / (S / 2f);
                    if (d > 1f) continue;
                    float core = Mathf.SmoothStep(1f, 0.2f, d);
                    float rim = Mathf.Exp(-Mathf.Pow((d - 0.82f) * 6f, 2f)) * 0.5f;
                    t.SetPixel(x, y, new Color(0.9f, 0.95f, 1f, Mathf.Clamp01(core * 0.5f + rim)));
                }
            return t;
        }
    }
}
