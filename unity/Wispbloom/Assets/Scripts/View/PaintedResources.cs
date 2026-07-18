// Wispbloom — loads the baked Higgsfield painted backgrounds from a Resources
// folder at runtime and turns them into sprites in memory. This works in the
// editor AND in the Android build, and deliberately sidesteps the texture-vs-
// sprite import ambiguity that stranded painted art before: whatever the
// importer decides, the underlying Texture2D is fetched and a sprite is built
// with Sprite.Create. Files live at Assets/Resources/WispbloomArt/bg-<world>.jpg.
using System.Collections.Generic;
using UnityEngine;

namespace Wispbloom.View
{
    public static class PaintedResources
    {
        static readonly Dictionary<string, Sprite> _cache = new();
        static readonly HashSet<string> _missing = new();

        /// <summary>Painted sky for a world key ("dawn"|"dusk"|"grove"|"lair").
        /// Returns null if the baked file isn't present (procedural fallback).</summary>
        public static Sprite Background(string worldKey) => Load("bg-" + (worldKey ?? "dawn"));

        /// <summary>Painted sky used behind the menus.</summary>
        public static Sprite Title() => Load("bg-title");

        static readonly string[] SpiritKeys = { "tide", "blossom", "ember", "dusk" };

        /// <summary>Painted spirit for a color index (0=Tide..3=Dusk), loaded
        /// from raw PNG bytes on disk so it never depends on Unity's texture
        /// import pipeline. Checks StreamingAssets first (survives into builds),
        /// then the auto-fetch folder. Returns null → procedural fallback.</summary>
        public static Sprite Spirit(int colorIndex)
        {
            if (colorIndex < 0 || colorIndex >= SpiritKeys.Length) return null;
            string key = SpiritKeys[colorIndex];
            string cacheKey = "spirit-" + key;
            if (_cache.TryGetValue(cacheKey, out var cached)) return cached;
            if (_missing.Contains(cacheKey)) return null;

            string[] candidates =
            {
                System.IO.Path.Combine(Application.streamingAssetsPath, "wispbloom", "spirit-" + key + ".png"),
                System.IO.Path.Combine(Application.dataPath, "StreamingAssets", "wispbloom", "spirit-" + key + ".png"),
                System.IO.Path.Combine(Application.dataPath, "Art", "Painted", "spirit_" + key + ".png"),
            };
            foreach (var path in candidates)
            {
                try
                {
                    if (!System.IO.File.Exists(path)) continue;
                    var bytes = System.IO.File.ReadAllBytes(path);
                    var tex = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                    if (!tex.LoadImage(bytes)) continue;
                    tex.wrapMode = TextureWrapMode.Clamp;
                    tex.filterMode = FilterMode.Bilinear;
                    var sprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height),
                        new Vector2(0.5f, 0.5f), Mathf.Max(tex.width, 1), 0, SpriteMeshType.FullRect, Vector4.zero);
                    sprite.name = "DISK_spirit_" + key;
                    _cache[cacheKey] = sprite;
                    return sprite;
                }
                catch { /* try next candidate */ }
            }
            _missing.Add(cacheKey);
            return null;
        }

        static Sprite Load(string name)
        {
            if (_cache.TryGetValue(name, out var cached)) return cached;
            if (_missing.Contains(name)) return null;
            var tex = Resources.Load<Texture2D>("WispbloomArt/" + name);
            if (tex == null) { _missing.Add(name); return null; }
            var sprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height),
                new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, Vector4.zero);
            sprite.name = "PAINTED_" + name;
            _cache[name] = sprite;
            return sprite;
        }
    }
}
