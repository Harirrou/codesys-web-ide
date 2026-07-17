// Wispbloom — clearly-isolated PLACEHOLDER sprite generation. These painted-
// style procedural textures make the slice runnable before the final art is
// fetched; every file is prefixed PLACEHOLDER_ and lives only in
// Assets/Art/Placeholders. Swapping them (PaintedArtFetcher or by hand in
// the ArtBinding asset) touches zero gameplay code.
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Wispbloom.EditorTools
{
    public static class PlaceholderArt
    {
        public const string Dir = "Assets/Art/Placeholders";

        public static void GenerateAll()
        {
            Directory.CreateDirectory(Dir);
            SpiritBody("PLACEHOLDER_spirit_tide", new Color(0.37f, 0.90f, 0.82f), new Color(0.11f, 0.43f, 0.39f));
            SpiritBody("PLACEHOLDER_spirit_blossom", new Color(0.95f, 0.49f, 0.81f), new Color(0.49f, 0.18f, 0.40f));
            SpiritBody("PLACEHOLDER_spirit_ember", new Color(1.00f, 0.77f, 0.42f), new Color(0.54f, 0.35f, 0.11f));
            SpiritBody("PLACEHOLDER_spirit_dusk", new Color(0.66f, 0.55f, 1.00f), new Color(0.29f, 0.20f, 0.56f));
            SoftGlow("PLACEHOLDER_glow", 256);
            Petal("PLACEHOLDER_petal");
            SoftGlow("PLACEHOLDER_heart", 512, warm: true);
            OrbitTile("PLACEHOLDER_orbit_tile");
            SoftGlow("PLACEHOLDER_dust", 64);
            Sparkle("PLACEHOLDER_sparkle");
            Panel9("PLACEHOLDER_panel");
            Vertical("PLACEHOLDER_bg_dawn");
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            ApplySpriteImportSettings();
        }

        // Without this, a fresh project (3D default behavior) imports the
        // PNGs as plain textures and every ArtBinding slot loads null —
        // which is exactly the first-open crash observed in the field.
        static void ApplySpriteImportSettings()
        {
            (string name, float ppu, Vector4 border)[] files =
            {
                ("PLACEHOLDER_spirit_tide", 256f, Vector4.zero),
                ("PLACEHOLDER_spirit_blossom", 256f, Vector4.zero),
                ("PLACEHOLDER_spirit_ember", 256f, Vector4.zero),
                ("PLACEHOLDER_spirit_dusk", 256f, Vector4.zero),
                ("PLACEHOLDER_glow", 256f, Vector4.zero),
                ("PLACEHOLDER_petal", 256f, Vector4.zero),
                ("PLACEHOLDER_heart", 512f, Vector4.zero),
                ("PLACEHOLDER_orbit_tile", 512f, Vector4.zero),
                ("PLACEHOLDER_dust", 64f, Vector4.zero),
                ("PLACEHOLDER_sparkle", 64f, Vector4.zero),
                ("PLACEHOLDER_panel", 100f, new Vector4(24, 24, 24, 24)),
                ("PLACEHOLDER_bg_dawn", 100f, Vector4.zero),
            };
            foreach (var (name, ppu, border) in files)
            {
                string path = $"{Dir}/{name}.png";
                if (AssetImporter.GetAtPath(path) is not TextureImporter imp) continue;
                imp.textureType = TextureImporterType.Sprite;
                imp.spritePixelsPerUnit = ppu;
                imp.spriteBorder = border;
                imp.mipmapEnabled = false;
                imp.alphaIsTransparency = true;
                imp.SaveAndReimport();
            }
        }

        static void Save(Texture2D tex, string name)
        {
            File.WriteAllBytes($"{Dir}/{name}.png", tex.EncodeToPNG());
            Object.DestroyImmediate(tex);
        }

        static Texture2D NewTex(int w, int h)
        {
            var t = new Texture2D(w, h, TextureFormat.RGBA32, false);
            var clear = new Color(0, 0, 0, 0);
            var px = new Color[w * h];
            for (int i = 0; i < px.Length; i++) px[i] = clear;
            t.SetPixels(px);
            return t;
        }

        /// <summary>Round spirit blob with curl tip, soft gradient, face.</summary>
        static void SpiritBody(string name, Color main, Color dark)
        {
            const int S = 256;
            var t = NewTex(S, S);
            Vector2 c = new Vector2(S / 2f, S / 2f - 8);
            float R = S * 0.34f;
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    Vector2 p = new Vector2(x, y) - c;
                    float d = p.magnitude;
                    // curl tip: small lobe up-right
                    Vector2 tip = p - new Vector2(R * 0.55f, R * 0.95f);
                    float dTip = tip.magnitude;
                    float body = Mathf.Min(d / R, dTip / (R * 0.35f));
                    if (body > 1f) continue;
                    float lightK = Mathf.Clamp01(1f - (p + new Vector2(R * 0.35f, -R * 0.4f)).magnitude / (R * 1.5f));
                    Color col = Color.Lerp(dark, Color.Lerp(main, Color.white, 0.65f), lightK);
                    float edge = Mathf.SmoothStep(1f, 0.92f, body);
                    col.a = edge;
                    t.SetPixel(x, S - 1 - y, col);
                }
            // face
            void Dot(float fx, float fy, float r, Color col)
            {
                for (int y = (int)(fy - r); y <= fy + r; y++)
                    for (int x = (int)(fx - r); x <= fx + r; x++)
                        if (new Vector2(x - fx, y - fy).magnitude <= r && x >= 0 && x < S && y >= 0 && y < S)
                            t.SetPixel(x, S - 1 - y, col);
            }
            var ink = new Color(0.16f, 0.10f, 0.21f, 0.95f);
            Dot(c.x - R * 0.28f, c.y - R * 0.05f, R * 0.10f, ink);
            Dot(c.x + R * 0.28f, c.y - R * 0.05f, R * 0.10f, ink);
            Dot(c.x - R * 0.31f, c.y - R * 0.09f, R * 0.035f, Color.white);
            Dot(c.x + R * 0.25f, c.y - R * 0.09f, R * 0.035f, Color.white);
            Dot(c.x, c.y + R * 0.22f, R * 0.07f, ink);
            t.Apply();
            Save(t, name);
        }

        static void SoftGlow(string name, int size, bool warm = false)
        {
            var t = NewTex(size, size);
            Vector2 c = Vector2.one * (size / 2f);
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float k = 1f - Mathf.Clamp01((new Vector2(x, y) - c).magnitude / (size / 2f));
                    float a = k * k;
                    Color col = warm
                        ? Color.Lerp(new Color(1f, 0.8f, 0.5f), Color.white, k)
                        : Color.white;
                    t.SetPixel(x, y, new Color(col.r, col.g, col.b, a));
                }
            t.Apply();
            Save(t, name);
        }

        static void Petal(string name)
        {
            const int W = 128, H = 256;
            var t = NewTex(W, H);
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    float v = y / (float)H;                    // 0 base → 1 tip
                    float halfWidth = Mathf.Sin(Mathf.PI * Mathf.Pow(1f - v, 0.7f)) * W * 0.42f;
                    float dx = Mathf.Abs(x - W / 2f);
                    if (dx > halfWidth) continue;
                    float k = 1f - dx / Mathf.Max(1f, halfWidth);
                    Color col = Color.Lerp(new Color(1f, 0.86f, 0.62f), Color.white, v * 0.8f + k * 0.2f);
                    t.SetPixel(x, y, new Color(col.r, col.g, col.b, 0.55f + 0.45f * k));
                }
            t.Apply();
            Save(t, name);
        }

        static void OrbitTile(string name)
        {
            const int W = 512, H = 128;
            var t = NewTex(W, H);
            for (int y = 0; y < H; y++)
                for (int x = 0; x < W; x++)
                {
                    float v = Mathf.Abs(y - H / 2f) / (H / 2f);
                    float band = Mathf.Exp(-v * v * 7f);
                    float shimmer = 0.75f + 0.25f * Mathf.Sin(x / (float)W * Mathf.PI * 8f);
                    float a = band * shimmer;
                    t.SetPixel(x, y, new Color(0.85f, 0.93f, 1f, a));
                }
            t.Apply();
            Save(t, name);
        }

        static void Sparkle(string name)
        {
            const int S = 64;
            var t = NewTex(S, S);
            Vector2 c = Vector2.one * (S / 2f);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    Vector2 p = new Vector2(x, y) - c;
                    float star = Mathf.Max(0f, 1f - (Mathf.Abs(p.x) + Mathf.Abs(p.y)) / (S * 0.45f));
                    float cross = Mathf.Max(
                        Mathf.Exp(-Mathf.Abs(p.y) * 0.4f) * Mathf.Exp(-Mathf.Abs(p.x) * 0.06f),
                        Mathf.Exp(-Mathf.Abs(p.x) * 0.4f) * Mathf.Exp(-Mathf.Abs(p.y) * 0.06f));
                    float a = Mathf.Clamp01(star * 0.4f + cross);
                    t.SetPixel(x, y, new Color(1f, 1f, 1f, a));
                }
            t.Apply();
            Save(t, name);
        }

        static void Panel9(string name)
        {
            const int S = 96;
            var t = NewTex(S, S);
            for (int y = 0; y < S; y++)
                for (int x = 0; x < S; x++)
                {
                    float dx = Mathf.Min(x, S - 1 - x);
                    float dy = Mathf.Min(y, S - 1 - y);
                    float d = Mathf.Min(Mathf.Min(dx, dy), 24f);
                    float corner = Mathf.Min(new Vector2(Mathf.Max(0, 24 - dx), Mathf.Max(0, 24 - dy)).magnitude, 24f);
                    float inside = 24f - corner;
                    float a = Mathf.Clamp01(inside / 6f);
                    var fill = new Color(0.20f, 0.26f, 0.47f, 0.72f * a);
                    float rim = Mathf.Clamp01(1f - Mathf.Abs(inside - 3f) / 2.2f);
                    fill = Color.Lerp(fill, new Color(0.66f, 0.78f, 1f, 0.9f * a), rim * 0.8f);
                    t.SetPixel(x, y, fill);
                }
            t.Apply();
            Save(t, name);
        }

        static void Vertical(string name)
        {
            const int W = 384, H = 688;
            var t = NewTex(W, H);
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
            {
                int x = rng.Next(W), y = rng.Next(H);
                float a = 0.25f + (float)rng.NextDouble() * 0.5f;
                t.SetPixel(x, y, new Color(0.85f, 0.9f, 1f, a));
            }
            t.Apply();
            Save(t, name);
        }
    }
}
