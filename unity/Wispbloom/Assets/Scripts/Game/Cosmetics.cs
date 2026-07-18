// Wispbloom — equipped cosmetics (trail + flower core), ported from the
// prototype's WB.COSMETICS. Kept as light static state so views can read the
// current look without threading it through every constructor. Unlock
// thresholds are total-star counts, matching the Grove screen.
using UnityEngine;

namespace Wispbloom.Game
{
    public struct CosmeticOption
    {
        public string key;
        public string label;
        public int starsToUnlock;
        public Color color;
        public CosmeticOption(string key, string label, int stars, Color color)
        { this.key = key; this.label = label; this.starsToUnlock = stars; this.color = color; }
    }

    public static class Cosmetics
    {
        // Comet trail colors. "aurora" cycles hue at runtime (color unused).
        public static readonly CosmeticOption[] Trails =
        {
            new CosmeticOption("wisp",   "Wisp",   0,  new Color(0.85f, 0.95f, 1f)),
            new CosmeticOption("ember",  "Ember",  6,  new Color(1f, 0.6f, 0.32f)),
            new CosmeticOption("tide",   "Tide",   14, new Color(0.37f, 0.9f, 0.82f)),
            new CosmeticOption("aurora", "Aurora", 24, new Color(0.7f, 0.55f, 1f)),
        };

        // Flower heart tints.
        public static readonly CosmeticOption[] Cores =
        {
            new CosmeticOption("classic",  "Classic",  0,  new Color(1f, 0.93f, 0.78f)),
            new CosmeticOption("radiant",  "Radiant",  10, new Color(1f, 0.82f, 0.55f)),
            new CosmeticOption("twilight", "Twilight", 20, new Color(0.72f, 0.7f, 1f)),
        };

        public static string Trail = "wisp";
        public static string Core = "classic";

        public static void LoadFromSave()
        {
            Trail = SaveService.Data.trailCosmetic;
            Core = SaveService.Data.coreCosmetic;
        }

        public static bool IsAuroraTrail => Trail == "aurora";

        public static Color TrailTint(Color fallback)
        {
            foreach (var o in Trails) if (o.key == Trail) return o.color;
            return fallback;
        }

        public static Color CoreTint(Color fallback)
        {
            foreach (var o in Cores) if (o.key == Core) return o.color;
            return fallback;
        }

        public static int TotalStars()
        {
            int total = 0;
            var stars = SaveService.Data.stars;
            if (stars != null) foreach (int s in stars) total += s;
            return total;
        }
    }
}
