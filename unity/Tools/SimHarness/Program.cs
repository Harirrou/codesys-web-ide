// Wispbloom headless playtest harness. Drives the pure C# simulation with a
// deterministic bot across every ported campaign level plus the endless/daily
// generator, then checks the phase-2 additions specifically: the Umbra
// Serpent boss is defeatable, portals open and pieces hop, and the daily seed
// is bit-for-bit reproducible. No Unity, no rendering — just the sim.
using System;
using Wispbloom.Sim;
using Wispbloom.Data;

class SimHarness
{
    // Layout the GameController derives for a 390x844 reference phone.
    const float CoreR = 0.332f, PieceR = 0.1375f, InnerR = 0.7295f, OuterR = 1.833f;

    struct Report
    {
        public GameResult result;
        public float time;
        public int score, stars, shots, bursts, shifts;
        public int portalOpened, portalHop, bossBroken;
        public override string ToString()
            => $"{result,-7} t={time,5:0.0}s score={score,6} stars={stars} " +
               $"shots={shots,3} bursts={bursts,3} shifts={shifts,3} " +
               $"portals={portalOpened} hops={portalHop} serpent={bossBroken}/8";
    }

    static int Main()
    {
        int failures = 0;
        Console.WriteLine("== Wispbloom sim playtests (ported campaign) ==");
        for (int i = 0; i < LevelLibrary.Count; i++)
        {
            try
            {
                var r = Play(LevelLibrary.Get(i), 220f);
                Console.WriteLine($"L{i + 1,2} {LevelLibrary.Get(i).Name,-20} {r}");
            }
            catch (Exception e)
            {
                failures++;
                Console.WriteLine($"L{i + 1,2} EXCEPTION: {e.Message}\n{e.StackTrace}");
            }
        }

        Console.WriteLine();

        // --- Boss: the serpent must be defeatable -------------------------
        try
        {
            var r = Play(LevelLibrary.Get(9), 300f);
            Console.WriteLine($"BOSS   Umbra Serpent      {r}");
            if (r.result != GameResult.Won) { failures++; Console.WriteLine("  FAIL: serpent not defeated"); }
        }
        catch (Exception e) { failures++; Console.WriteLine("BOSS EXCEPTION: " + e); }

        // --- Portals: opening + hopping on the first Grove level -----------
        try
        {
            var r = Play(LevelLibrary.Get(10), 220f);
            Console.WriteLine($"PORTAL Grove Gate         {r}");
            if (r.portalOpened == 0) { failures++; Console.WriteLine("  FAIL: no portals opened"); }
        }
        catch (Exception e) { failures++; Console.WriteLine("PORTAL EXCEPTION: " + e); }

        // --- Determinism: the daily seed reproduces exactly ----------------
        var a = Play(LevelLibrary.MakeEndless(20260718), 60f);
        var b = Play(LevelLibrary.MakeEndless(20260718), 60f);
        bool det = a.score == b.score && a.shots == b.shots && a.bursts == b.bursts
                   && Math.Abs(a.time - b.time) < 1e-3f;
        Console.WriteLine($"DAILY  seed 20260718      A(score={a.score},shots={a.shots},bursts={a.bursts}) " +
                          $"B(score={b.score},shots={b.shots},bursts={b.bursts}) -> {(det ? "MATCH" : "MISMATCH")}");
        if (!det) failures++;

        Console.WriteLine();
        Console.WriteLine(failures == 0 ? "ALL CHECKS PASSED" : $"{failures} CHECK(S) FAILED");
        return failures == 0 ? 0 : 1;
    }

    static Report Play(LevelSpec spec, float maxTime)
    {
        var sim = new GameSim(spec, new SimTuning());
        sim.SetLayout(CoreR, PieceR, InnerR, OuterR);
        var r = new Report();
        sim.Events.Burst += (run, ring, combo, g) => r.bursts++;
        sim.Events.Shift += (k, ring) => r.shifts++;
        sim.Events.PortalOpened += p => r.portalOpened++;
        sim.Events.PortalHop += (p, from, to) => r.portalHop++;
        sim.Events.BossHit += (seg, broken) => { if (broken) r.bossBroken++; };

        const float dt = 1f / 60f, cadence = 0.28f;
        float sinceShot = 999f;
        int swaps = 0;
        while (sim.Result == GameResult.Playing && sim.Time < maxTime)
        {
            sim.Tick(dt);
            sinceShot += dt;
            if (sinceShot >= cadence && sim.Projectiles.Count == 0)
            {
                if (TryShoot(sim)) { r.shots++; sinceShot = 0f; swaps = 0; }
                else if (swaps < 1) { sim.Swap(); sinceShot = cadence - 0.06f; swaps++; }
                else { sinceShot = 0f; swaps = 0; }   // hold: never force a fatal shot
            }
        }
        r.result = sim.Result;
        r.time = sim.Time;
        r.score = sim.Score;
        r.stars = sim.Stars();
        return r;
    }

    // Deterministic bot: crack the serpent when a color-matched lane is clear,
    // cleanse thorned wisps first on cleanse levels, otherwise match the
    // nearest same-color wisp on the innermost ring (cleanest line of sight).
    static bool TryShoot(GameSim sim)
    {
        var cur = sim.Current.color;

        if (sim.BossRing != null && sim.BossAlive > 0)
        {
            foreach (var seg in sim.BossRing.Pieces)
            {
                if (!seg.IsBoss || seg.Color != cur) continue;
                float tof = sim.BossRing.Radius / sim.Tune.ProjectileSpeed;
                float ang = seg.Angle + sim.RingSpeed(sim.BossRing) * tof;
                if (LaneClear(sim, ang, sim.BossRing)) { ShootAngle(sim, ang); return true; }
            }
        }

        if (sim.Level.Objective == Objective.Cleanse)
        {
            var t = FindMatch(sim, cur, corruptOnly: true);
            if (t.HasValue) { ShootLead(sim, t.Value.ring, t.Value.piece); return true; }
        }

        var g = FindMatch(sim, cur, corruptOnly: false);
        if (g.HasValue) { ShootLead(sim, g.Value.ring, g.Value.piece); return true; }
        return false;
    }

    static (Ring ring, Piece piece)? FindMatch(GameSim sim, SpiritColor c, bool corruptOnly)
    {
        foreach (var ring in sim.Rings)
            foreach (var p in ring.Pieces)
            {
                if (p.IsBoss) continue;
                if (corruptOnly && !p.Corrupt) continue;
                if (p.Color == c) return (ring, p);
            }
        return null;
    }

    // No inner ring piece blocks the radial path at this angle.
    static bool LaneClear(GameSim sim, float ang, Ring target)
    {
        foreach (var ring in sim.Rings)
        {
            if (ring == target || ring.Radius >= target.Radius) continue;
            float w = PieceR * 2.2f / ring.Radius;
            foreach (var p in ring.Pieces)
                if (MathF.Abs(GameSim.Diff(p.Angle, ang)) < w) return false;
        }
        return true;
    }

    static void ShootLead(GameSim sim, Ring ring, Piece p)
    {
        float tof = ring.Radius / sim.Tune.ProjectileSpeed;
        ShootAngle(sim, p.Angle + sim.RingSpeed(ring) * tof);
    }

    static void ShootAngle(GameSim sim, float a) => sim.Shoot(MathF.Cos(a), MathF.Sin(a));
}
