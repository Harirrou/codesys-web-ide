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
