using System;
using System.Linq;
using Wispbloom.Sim;

class SimHarness
{
    static int Main()
    {
        var level = new LevelSpec
        {
            Objective = Objective.Bloom, Target = 20, ColorCount = 3,
            Rings = new[]
            {
                new RingSpec { rr = 0.52f, dir = -1, speed = 0.26f, fill = 9,  capacity = 13 },
                new RingSpec { rr = 0.80f, dir =  1, speed = 0.20f, fill = 12, capacity = 19 },
            },
            SpawnInterval = 7f, SpawnRings = new[] { 1 },
            Shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge },
            Star2Score = 1600, Star3Score = 2600, Seed = 1234,
        };
        var sim = new GameSim(level, new SimTuning());
        // Exact values GameController derives for a 390x844 reference phone.
        sim.SetLayout(0.332f, 0.1375f, 0.7295f, 1.833f);

        foreach (var ring in sim.Rings)
            Console.WriteLine($"ring{ring.Index} r={ring.Radius:0.00} minGap={ring.MinGap:0.000} " +
                $"join={ring.MinGap * 1.45f:0.000} spacing={(MathF.PI * 2 / ring.Pieces.Count):0.000} " +
                $"colors=[{string.Join(",", ring.Pieces.Select(p => (int)p.Color))}]");

        int bursts = 0, shifts = 0, chains = 0;
        sim.Events.Burst += (run, r, combo, gained) => { bursts++; if (combo > 1) chains++; };
        sim.Events.Shift += (k, r) => shifts++;

        const float dt = 1f / 60f;
        int shots = 0;
        float sinceShot = 999f;
        while (sim.Result == GameResult.Playing && sim.Time < 180f)
        {
            sim.Tick(dt);
            sinceShot += dt;
            if (sinceShot >= 0.45f && sim.Projectiles.Count == 0)
            {
                Ring tr = null; Piece target = null;
                foreach (var ring in sim.Rings)          // inner ring first: clean line of sight
                {
                    foreach (var p in ring.Pieces)
                        if (p.Color == sim.Current.color) { tr = ring; target = p; break; }
                    if (target != null) break;
                }
                if (target == null) { sim.Swap(); continue; }
                float tof = tr.Radius / sim.Tune.ProjectileSpeed;
                float a = target.Angle + sim.RingSpeed(tr) * tof;
                shots++;
                sim.Shoot(MathF.Cos(a), MathF.Sin(a));
                sinceShot = 0f;
            }
        }
        Console.WriteLine($"RESULT={sim.Result} time={sim.Time:0.0}s shots={shots} bursts={bursts} chains={chains} shifts={shifts} score={sim.Score} energy={sim.Energy}/20 stars={sim.Stars()}");
        return 0;
    }
}
