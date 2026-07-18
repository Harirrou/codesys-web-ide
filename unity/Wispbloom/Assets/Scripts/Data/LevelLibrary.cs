// Wispbloom — runtime source of truth for all campaign levels plus the
// endless/daily generator. Ported field-by-field from the HTML5 prototype
// (game/js/levels.js), which is the gameplay specification — do not tune
// values here without changing the prototype first.
//
// Pure data: no UnityEngine dependency, safe to use from Sim-side tests.
using System;
using Wispbloom.Sim;

namespace Wispbloom.Data
{
    public static class LevelLibrary
    {
        /// <summary>Number of campaign levels (levels.js WB.LEVELS.length).</summary>
        public const int Count = 16;

        // ---- tiny builders keeping the tables below close to levels.js ------

        private static RingSpec R(float rr, int dir, float speed, int fill, int corrupt, int capacity)
            => new RingSpec { rr = rr, dir = dir, speed = speed, fill = fill, corrupt = corrupt, capacity = capacity };

        private static HintSpec H(float at, string text)
            => new HintSpec { At = at, Text = text };

        /// <summary>Fresh LevelSpec for campaign level <paramref name="index"/> (0-based).</summary>
        public static LevelSpec Get(int index)
        {
            switch (index)
            {
                case 0: // 1 — pure tutorial: aim, shoot, match
                    return new LevelSpec
                    {
                        Name = "First Light",
                        Bg = "dawn",
                        Objective = Objective.Bloom,
                        Target = 12,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.72f, 1, 0.22f, 12, 0, 17),
                        },
                        SpawnInterval = 0f,
                        SpawnRings = Array.Empty<int>(),
                        Shifts = Array.Empty<ShiftKind>(),
                        Star2Score = 900, Star3Score = 1400,
                        Hints = new[]
                        {
                            H(0.5f, "Drag anywhere to aim, release to shoot"),
                            H(6f, "Match 3 wisps of the same color"),
                            H(14f, "Tap the core to swap your wisp"),
                        },
                    };

                case 1: // 2 — two rings, gentle spawner
                    return new LevelSpec
                    {
                        Name = "Twin Streams",
                        Bg = "dawn",
                        Objective = Objective.Bloom,
                        Target = 20,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.52f, -1, 0.26f, 9, 0, 13),
                            R(0.8f, 1, 0.2f, 12, 0, 19),
                        },
                        SpawnInterval = 7f,
                        SpawnRings = new[] { 1 },
                        Shifts = Array.Empty<ShiftKind>(),
                        Star2Score = 1600, Star3Score = 2600,
                        Hints = new[]
                        {
                            H(0.5f, "Shots pass empty space and stick to wisps"),
                            H(8f, "Don’t let a ring overgrow!"),
                        },
                    };

                case 2: // 3 — cleanse introduction
                    return new LevelSpec
                    {
                        Name = "Creeping Shade",
                        Bg = "dawn",
                        Objective = Objective.Cleanse,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.52f, 1, 0.24f, 9, 3, 13),
                            R(0.8f, -1, 0.22f, 12, 3, 19),
                        },
                        SpawnInterval = 8f,
                        SpawnRings = new[] { 0, 1 },
                        Shifts = Array.Empty<ShiftKind>(),
                        Star2Score = 2000, Star3Score = 3200,
                        Hints = new[]
                        {
                            H(0.5f, "Cleanse thorned wisps: match their inner color"),
                        },
                    };

                case 3: // 4 — the Orbit Shift mechanic arrives
                    return new LevelSpec
                    {
                        Name = "The Garden Stirs",
                        Bg = "dawn",
                        Objective = Objective.Bloom,
                        Target = 28,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.52f, 1, 0.3f, 10, 0, 13),
                            R(0.8f, -1, 0.24f, 13, 0, 19),
                        },
                        SpawnInterval = 6f,
                        SpawnRings = new[] { 0, 1 },
                        Shifts = new[] { ShiftKind.Reverse },
                        Star2Score = 2400, Star3Score = 3800,
                        Hints = new[]
                        {
                            H(0.5f, "Every match now reshapes the orbits!"),
                        },
                    };

                case 4: // 5 — survive + surge shift, ability unlocks here
                    return new LevelSpec
                    {
                        Name = "Hold the Bloom",
                        Bg = "dusk",
                        Objective = Objective.Survive,
                        SurviveTime = 60f,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.52f, -1, 0.3f, 8, 0, 13),
                            R(0.8f, 1, 0.26f, 11, 0, 19),
                        },
                        SpawnInterval = 3.6f,
                        SpawnRings = new[] { 0, 1 },
                        Shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge },
                        Star2Score = 2600, Star3Score = 4200,
                        Hints = new[]
                        {
                            H(0.5f, "Survive! Keep the rings from overgrowing"),
                            H(5f, "Matches charge the Pulse button"),
                        },
                    };

                case 5: // 6 — three rings + leap shift, prisms flow
                    return new LevelSpec
                    {
                        Name = "Leaping Lights",
                        Bg = "dusk",
                        Objective = Objective.Cleanse,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, 1, 0.3f, 7, 2, 11),
                            R(0.66f, -1, 0.26f, 10, 3, 15),
                            R(0.88f, 1, 0.22f, 13, 3, 21),
                        },
                        SpawnInterval = 6.5f,
                        SpawnRings = new[] { 1, 2 },
                        Shifts = new[] { ShiftKind.Reverse, ShiftKind.Leap },
                        Star2Score = 3200, Star3Score = 5200,
                        Hints = new[]
                        {
                            H(0.5f, "Chain two bursts in one shot to earn a Prism"),
                        },
                    };

                case 6: // 7 — big bloom under pressure
                    return new LevelSpec
                    {
                        Name = "Deep Nectar",
                        Bg = "dusk",
                        Objective = Objective.Bloom,
                        Target = 45,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, -1, 0.34f, 8, 0, 11),
                            R(0.66f, 1, 0.3f, 10, 0, 15),
                            R(0.88f, -1, 0.24f, 14, 0, 21),
                        },
                        SpawnInterval = 4.5f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge, ShiftKind.Lull },
                        Star2Score = 4200, Star3Score = 6600,
                    };

                case 7: // 8 — long survival, every shift in play
                    return new LevelSpec
                    {
                        Name = "Night of Petals",
                        Bg = "dusk",
                        Objective = Objective.Survive,
                        SurviveTime = 90f,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, 1, 0.36f, 7, 0, 11),
                            R(0.66f, -1, 0.3f, 10, 0, 15),
                            R(0.88f, 1, 0.26f, 12, 0, 21),
                        },
                        SpawnInterval = 3.2f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge, ShiftKind.Leap, ShiftKind.Lull },
                        Star2Score = 5200, Star3Score = 8200,
                    };

                case 8: // 9 — the storm before the boss
                    return new LevelSpec
                    {
                        Name = "Shadow Storm",
                        Bg = "dusk",
                        Objective = Objective.Cleanse,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, -1, 0.4f, 8, 4, 11),
                            R(0.66f, 1, 0.34f, 11, 5, 15),
                            R(0.88f, -1, 0.28f, 14, 5, 21),
                        },
                        SpawnInterval = 4f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge, ShiftKind.Leap },
                        Star2Score = 6200, Star3Score = 9600,
                    };

                case 9: // 10 — BOSS
                    return new LevelSpec
                    {
                        Name = "The Umbra Serpent",
                        Bg = "lair",
                        Objective = Objective.Boss,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.5f, 1, 0.3f, 9, 0, 14),
                            R(0.84f, -1, 0.2f, 0, 0, 99),
                        },
                        SpawnInterval = 5f,
                        SpawnRings = new[] { 0 },
                        Shifts = new[] { ShiftKind.Reverse },
                        Boss = new BossSpec { Segments = 8, RoarEvery = 15f, EatEvery = 9f },
                        Star2Score = 5200, Star3Score = 8000,
                        Hints = new[]
                        {
                            H(0.5f, "Crack every shell: hit segments with their color!"),
                        },
                    };

                // ===== WORLD 2: THE DEEP GROVE — the Portal shift arrives =====

                case 10: // 11 — portals introduced gently
                    return new LevelSpec
                    {
                        Name = "Grove Gate",
                        Bg = "grove",
                        Objective = Objective.Bloom,
                        Target = 35,
                        ColorCount = 3,
                        Rings = new[]
                        {
                            R(0.52f, 1, 0.28f, 9, 0, 14),
                            R(0.8f, -1, 0.24f, 12, 0, 19),
                        },
                        SpawnInterval = 6.5f,
                        SpawnRings = new[] { 1 },
                        Shifts = new[] { ShiftKind.Portal },
                        Star2Score = 3000, Star3Score = 4800,
                        Hints = new[]
                        {
                            H(0.5f, "Portals! Wisps that drift through hop rings"),
                        },
                    };

                case 11: // 12 — portals + reversal, cleanse pressure
                    return new LevelSpec
                    {
                        Name = "Twin Doors",
                        Bg = "grove",
                        Objective = Objective.Cleanse,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, -1, 0.3f, 8, 3, 11),
                            R(0.66f, 1, 0.26f, 10, 3, 15),
                            R(0.88f, -1, 0.22f, 13, 4, 21),
                        },
                        SpawnInterval = 6f,
                        SpawnRings = new[] { 1, 2 },
                        Shifts = new[] { ShiftKind.Portal, ShiftKind.Reverse },
                        Star2Score = 3800, Star3Score = 6000,
                    };

                case 12: // 13 — big bloom, portals under surge
                    return new LevelSpec
                    {
                        Name = "Through and Through",
                        Bg = "grove",
                        Objective = Objective.Bloom,
                        Target = 55,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, 1, 0.34f, 8, 0, 11),
                            R(0.66f, -1, 0.3f, 11, 0, 15),
                            R(0.88f, 1, 0.26f, 14, 0, 21),
                        },
                        SpawnInterval = 4.2f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Portal, ShiftKind.Surge },
                        Star2Score = 4800, Star3Score = 7600,
                    };

                case 13: // 14 — survival with everything drifting
                    return new LevelSpec
                    {
                        Name = "Spore Drift",
                        Bg = "grove",
                        Objective = Objective.Survive,
                        SurviveTime = 75f,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, -1, 0.36f, 7, 0, 11),
                            R(0.66f, 1, 0.32f, 10, 0, 15),
                            R(0.88f, -1, 0.26f, 12, 0, 21),
                        },
                        SpawnInterval = 3.1f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Portal, ShiftKind.Leap, ShiftKind.Lull },
                        Star2Score = 5400, Star3Score = 8600,
                    };

                case 14: // 15 — fast cleanse maze
                    return new LevelSpec
                    {
                        Name = "Maze of Light",
                        Bg = "grove",
                        Objective = Objective.Cleanse,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, 1, 0.42f, 8, 5, 11),
                            R(0.66f, -1, 0.36f, 11, 5, 15),
                            R(0.88f, 1, 0.3f, 14, 6, 21),
                        },
                        SpawnInterval = 3.8f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Portal, ShiftKind.Reverse, ShiftKind.Surge },
                        Star2Score = 6800, Star3Score = 10600,
                    };

                case 15: // 16 — the grove finale: every shift in the game
                    return new LevelSpec
                    {
                        Name = "Heart of the Grove",
                        Bg = "grove",
                        Objective = Objective.Bloom,
                        Target = 70,
                        ColorCount = 4,
                        Rings = new[]
                        {
                            R(0.44f, -1, 0.4f, 8, 0, 11),
                            R(0.66f, 1, 0.34f, 11, 0, 15),
                            R(0.88f, -1, 0.28f, 14, 0, 21),
                        },
                        SpawnInterval = 3.4f,
                        SpawnRings = new[] { 0, 1, 2 },
                        Shifts = new[] { ShiftKind.Portal, ShiftKind.Reverse, ShiftKind.Surge, ShiftKind.Leap, ShiftKind.Lull },
                        Star2Score = 8000, Star3Score = 12500,
                    };

                default:
                    throw new ArgumentOutOfRangeException(nameof(index), index,
                        "Campaign level index must be in [0, " + (Count - 1) + "].");
            }
        }

        /// <summary>
        /// Endless / daily mode config generator (levels.js WB.makeEndless).
        /// A seeded rng makes the daily challenge identical for everyone on the
        /// same date — the caller passes the date-derived seed. seed == null is
        /// free-play endless with a non-deterministic rng.
        /// RNG draw order matches the prototype exactly: per ring, direction
        /// first, then speed (6 draws total).
        /// </summary>
        public static LevelSpec MakeEndless(int? seed)
        {
            Func<double> rng;
            if (seed != null)
            {
                // Prototype: WB.rngFromSeed(seed) — mulberry32 over seed>>>0.
                var m = new Mulberry32(unchecked((uint)seed.Value));
                rng = m.Next;
            }
            else
            {
                var r = new Random();
                rng = r.NextDouble;
            }

            // dirs[Math.floor(rng() * 2)] — index 0 => +1, index 1 => -1.
            int Dir() => rng() < 0.5 ? 1 : -1;

            return new LevelSpec
            {
                Name = seed != null ? "Daily Bloom" : "Endless Garden",
                Bg = seed != null ? "dawn" : "dusk",
                Objective = Objective.Endless,
                ColorCount = 4,
                Rings = new[]
                {
                    R(0.44f, Dir(), (float)(0.28 + rng() * 0.1), 7, 0, 11),
                    R(0.66f, Dir(), (float)(0.24 + rng() * 0.1), 10, 0, 15),
                    R(0.88f, Dir(), (float)(0.2 + rng() * 0.08), 12, 0, 21),
                },
                SpawnInterval = 4.6f, // interval shrinks over time in endless (handled by the sim)
                SpawnRings = new[] { 0, 1, 2 },
                Shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge, ShiftKind.Leap, ShiftKind.Portal, ShiftKind.Lull },
                Seed = seed,
            };
        }
    }
}
