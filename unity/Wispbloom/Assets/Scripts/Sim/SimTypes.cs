// Wispbloom — pure simulation types. No UnityEngine dependency in this
// folder: the rules are engine-agnostic and verifiable against the HTML5
// prototype (game/js/core.js), which is the gameplay specification.
using System;
using System.Collections.Generic;

namespace Wispbloom.Sim
{
    public enum SpiritColor { Tide = 0, Blossom = 1, Ember = 2, Dusk = 3 }

    public enum Objective { Bloom, Cleanse, Survive, Boss, Endless }

    public enum ShiftKind { Reverse, Surge, Leap, Lull, Portal }

    /// <summary>One wisp riding a ring. Mirrors the prototype's piece object.</summary>
    public sealed class Piece
    {
        public int Id;
        public SpiritColor Color;
        public float Angle;             // radians, normalized [0, TAU)
        public bool Corrupt;
        public bool Prism;
        public float ChainT;            // chain-hot window remaining (s)
        public float Impulse;           // extra angular velocity (gap pull)
        public float RadialFrom;        // entry radius while animating inward
        public float RadialT = 1f;      // 0..1 ease progress; >=1 means settled
        public float Scale;             // spawn pop 0..1
        public float Wobble;            // idle phase (breathing + blink)
        public bool IsBoss;             // serpent shell segment (proto 'boss')
        public int BossHp;              // shell hp, 2 -> cracked -> broken
        public float PortalCooldown;    // seconds until this piece may hop again
    }

    /// <summary>An open portal pair linking two rings at one angle. Mirrors
    /// the prototype's {a, ringA, ringB, t} object (core.js openPortal).</summary>
    public sealed class Portal
    {
        public float Angle;             // radians, shared by both gates
        public Ring RingA;              // the matched ring the portal opened from
        public Ring RingB;              // random other ring
        public float Remaining;         // seconds until the portal closes
    }

    public sealed class Ring
    {
        public int Index;
        public float RelativeRadius;    // level data 'rr'
        public float Radius;            // world units, set by layout
        public int Direction;           // +1 / -1
        public float Speed;             // rad/s
        public int Capacity;
        public float MinGap;            // rad, set by layout
        public float GateAngle;
        public readonly List<Piece> Pieces = new List<Piece>();
    }

    public sealed class Projectile
    {
        public float X, Y, Vx, Vy;
        public SpiritColor Color;
        public bool Prism;
        public bool Pulse;
    }

    /// <summary>Level data snapshot handed to the sim (built from the
    /// LevelDefinition ScriptableObject, or by the endless generator).</summary>
    public sealed class LevelSpec
    {
        public string Name = "";
        public Objective Objective;
        public int Target;              // bloom energy target
        public float SurviveTime;
        public int ColorCount = 3;
        public RingSpec[] Rings = Array.Empty<RingSpec>();
        public float SpawnInterval;     // 0 = no spawner
        public int[] SpawnRings = Array.Empty<int>();
        public ShiftKind[] Shifts = Array.Empty<ShiftKind>();
        public BossSpec Boss;           // null when not a boss level
        public int Star2Score, Star3Score;
        public int? Seed;               // daily determinism
        public string Bg = "dawn";      // world art key ('dawn'|'dusk'|'lair'|'grove')
        public HintSpec[] Hints = System.Array.Empty<HintSpec>();
    }

    /// <summary>Timed tutorial banner (levels.js 'hints': { at, text }).</summary>
    public sealed class HintSpec { public float At; public string Text; }

    /// <summary>Boss configuration (levels.js 'boss': { segments, roarEvery,
    /// eatEvery }). Null on non-boss levels.</summary>
    public sealed class BossSpec
    {
        public int Segments;
        public float RoarEvery;
        public float EatEvery;
    }

    [Serializable]
    public struct RingSpec
    {
        public float rr;
        public int dir;
        public float speed;
        public int fill;
        public int corrupt;
        public int capacity;
    }

    /// <summary>Deterministic RNG — mulberry32 port, identical sequence to the
    /// prototype for the same seed (used by Daily Bloom).</summary>
    public sealed class Mulberry32
    {
        private uint _s;
        public Mulberry32(uint seed) { _s = seed; }
        public double Next()
        {
            _s += 0x6D2B79F5u;
            uint t = _s;
            t = (t ^ (t >> 15)) * (t | 1u);
            t ^= t + (t ^ (t >> 7)) * (t | 61u);
            return ((t ^ (t >> 14)) & 0xFFFFFFFFu) / 4294967296.0;
        }
    }
}
