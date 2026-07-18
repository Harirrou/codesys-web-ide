// Wispbloom — the complete gameplay simulation, ported 1:1 from the HTML5
// prototype (game/js/core.js). Pure C#: no UnityEngine. All tunables come in
// through SimTuning so balancing lives in a ScriptableObject.
//
// Contract: identical inputs produce identical outcomes to the prototype
// (same constants, same order of operations, same RNG for seeded runs).
using System;
using System.Collections.Generic;

namespace Wispbloom.Sim
{
    /// <summary>Balancing constants — prototype values are the defaults.</summary>
    [Serializable]
    public class SimTuning
    {
        public float ProjectileSpeed = 11.5f;   // 1150 px/s at 100 px/unit
        public float ChainWindow = 2.2f;
        public float GapPull = 1.6f;
        public float MinGapFactor = 2.15f;      // minGap = pieceR*factor / ringR
        public float JoinFactor = 1.45f;        // run joins within minGap*this
        public float SurgeMultiplier = 1.9f;
        public float SurgeDuration = 3f;
        public float LullDuration = 5f;
        public float PortalDuration = 6f;
        public int PulseMeterMax = 4;
        public int ScorePerPiece = 30;
        public float ComboScoreStep = 0.5f;
    }

    public enum GameResult { Playing, Won, Lost }

    /// <summary>Events the presentation layer subscribes to. The sim never
    /// touches rendering, audio or UI.</summary>
    public sealed class SimEvents
    {
        public Action<Projectile> Shot;
        public Action<Piece, Ring, float, float> Attached;       // piece, ring, x, y
        public Action<List<Piece>, Ring, int, int> Burst;        // run, ring, combo, score gained
        public Action<ShiftKind, Ring> Shift;
        public Action<Piece, Ring, Ring> Leaped;
        public Action<Ring, Piece> Spawned;
        public Action<Ring> SpawnWarning;
        public Action PrismEarned;
        public Action PulseArmed;
        public Action<float, float> PulseBlast;                  // x, y
        public Action Swapped;
        public Action Won;
        public Action Lost;
        public Action<Portal> PortalOpened;
        public Action<Piece, Ring, Ring> PortalHop;              // piece, from, to
        public Action<Piece, bool> BossHit;                      // segment, broken
        public Action<Piece> BossBounce;                         // color mismatch
        public Action BossRoared;                                // all rings reversed + surge
        public Action BossFed;                                   // 2 wisps forced onto ring 0
    }

    public sealed class GameSim
    {
        const float TAU = (float)(Math.PI * 2);

        public readonly LevelSpec Level;
        public readonly SimTuning Tune;
        public readonly SimEvents Events = new SimEvents();
        public readonly List<Ring> Rings = new List<Ring>();
        public readonly List<Projectile> Projectiles = new List<Projectile>();
        public readonly List<Portal> Portals = new List<Portal>();

        // Layout (world units) — set by SetLayout before the first Tick.
        public float CoreRadius { get; private set; } = 0.45f;
        public float PieceRadius { get; private set; } = 0.17f;

        public float Time { get; private set; }
        public int Score { get; private set; }
        public int Energy { get; private set; }
        public int Cleansed { get; private set; }
        public int CleanseTarget { get; private set; }
        public int Combo { get; private set; }
        public int Ability { get; private set; }
        public bool PulseIsArmed { get; private set; }
        public GameResult Result { get; private set; } = GameResult.Playing;
        public float SurgeRemaining { get; private set; }
        public float LullRemaining { get; private set; }
        public (SpiritColor color, bool prism) Current { get; private set; }
        public (SpiritColor color, bool prism) Next { get; private set; }

        // Boss state (proto this.boss). BossRing is null on non-boss levels.
        public Ring BossRing { get; private set; }
        public int BossTotal { get; private set; }
        public int BossAlive { get; private set; }
        public int BossRage { get; private set; }

        readonly Func<double> _rng;
        int _pieceUid = 1;
        int _shiftIdx;
        int _burstsThisShot;
        bool _prismPending;
        float _spawnTimer;
        float _roarTimer, _eatTimer;

        public GameSim(LevelSpec level, SimTuning tune)
        {
            Level = level;
            Tune = tune;
            if (level.Seed.HasValue)
            {
                var m = new Mulberry32((uint)level.Seed.Value);
                _rng = m.Next;
            }
            else
            {
                var r = new Random();
                _rng = r.NextDouble;
            }
            BuildRings();
            BuildBoss();
            _spawnTimer = level.SpawnInterval > 0 ? level.SpawnInterval * 0.6f : 0f;
            Current = DrawColor();
            Next = DrawColor();
        }

        // ----- setup ---------------------------------------------------------

        void BuildRings()
        {
            for (int i = 0; i < Level.Rings.Length; i++)
            {
                var rs = Level.Rings[i];
                var ring = new Ring
                {
                    Index = i,
                    RelativeRadius = rs.rr,
                    Direction = rs.dir,
                    Speed = rs.speed,
                    Capacity = rs.capacity,
                    GateAngle = -MathF.PI / 2f + i * 1.4f,
                };
                var corruptSlots = new HashSet<int>();
                while (corruptSlots.Count < rs.corrupt)
                    corruptSlots.Add((int)(_rng() * rs.fill));
                CleanseTarget += rs.corrupt;

                // Seed in 1-2 piece clumps, then sanitize ready-made triples.
                int slot = 0;
                float startA = (float)(_rng() * TAU);
                while (slot < rs.fill)
                {
                    var color = (SpiritColor)(int)(_rng() * Level.ColorCount);
                    int clump = Math.Min(rs.fill - slot, 1 + (int)(_rng() * 2));
                    for (int k = 0; k < clump && slot < rs.fill; k++, slot++)
                    {
                        ring.Pieces.Add(new Piece
                        {
                            Id = _pieceUid++,
                            Color = color,
                            Angle = Norm(startA + slot / (float)rs.fill * TAU),
                            Corrupt = corruptSlots.Contains(slot),
                            Scale = 1f,
                            Wobble = (float)(_rng() * TAU),
                        });
                    }
                }
                SanitizeInitial(ring);
                Rings.Add(ring);
            }
        }

        /// <summary>Boss levels: the serpent's shell segments ride the LAST
        /// ring, evenly spaced, hp 2 each (core.js buildBoss).</summary>
        void BuildBoss()
        {
            BossRing = null;
            if (Level.Objective != Objective.Boss || Level.Boss == null) return;
            var cfg = Level.Boss;
            var ring = Rings[Rings.Count - 1];
            BossRing = ring;
            BossTotal = cfg.Segments;
            BossAlive = cfg.Segments;
            BossRage = 0;
            _roarTimer = cfg.RoarEvery;
            _eatTimer = cfg.EatEvery;
            for (int i = 0; i < cfg.Segments; i++)
            {
                ring.Pieces.Add(new Piece
                {
                    Id = _pieceUid++,
                    Color = (SpiritColor)(i % Level.ColorCount),
                    Angle = Norm(i / (float)cfg.Segments * TAU),
                    IsBoss = true,
                    BossHp = 2,
                    Scale = 1f,
                    Wobble = (float)(_rng() * TAU),
                });
            }
        }

        void SanitizeInitial(Ring ring)
        {
            var ps = ring.Pieces;
            if (ps.Count < 3) return;
            for (int guard = 0; guard < 4; guard++)
            {
                bool changed = false;
                for (int i = 0; i < ps.Count; i++)
                {
                    var a = ps[i]; var b = ps[(i + 1) % ps.Count]; var c = ps[(i + 2) % ps.Count];
                    if (a.Color == b.Color && b.Color == c.Color)
                    {
                        b.Color = (SpiritColor)(((int)b.Color + 1 + (int)(_rng() * (Level.ColorCount - 1))) % Level.ColorCount);
                        changed = true;
                    }
                }
                if (!changed) break;
            }
        }

        /// <summary>World-space layout. Field center is the origin.</summary>
        public void SetLayout(float coreRadius, float pieceRadius, float innerRingRadius, float outerRingRadius)
        {
            CoreRadius = coreRadius;
            PieceRadius = pieceRadius;
            foreach (var ring in Rings)
            {
                ring.Radius = innerRingRadius + (outerRingRadius - innerRingRadius) * ring.RelativeRadius;
                ring.MinGap = PieceRadius * Tune.MinGapFactor / ring.Radius;
            }
        }

        // ----- player actions ------------------------------------------------

        public void Swap()
        {
            if (Result != GameResult.Playing) return;
            (Current, Next) = (Next, Current);
            Events.Swapped?.Invoke();
        }

        public bool ArmPulse()
        {
            if (Result != GameResult.Playing || Ability < Tune.PulseMeterMax || PulseIsArmed) return false;
            PulseIsArmed = true;
            Ability = 0;
            Events.PulseArmed?.Invoke();
            return true;
        }

        public void Shoot(float dirX, float dirY)
        {
            if (Result != GameResult.Playing) return;
            float len = MathF.Sqrt(dirX * dirX + dirY * dirY);
            if (len < 1e-4f) return;
            float nx = dirX / len, ny = dirY / len;
            var pr = new Projectile
            {
                X = nx * (CoreRadius + 0.06f),
                Y = ny * (CoreRadius + 0.06f),
                Vx = nx * Tune.ProjectileSpeed,
                Vy = ny * Tune.ProjectileSpeed,
                Color = Current.prism ? SpiritColor.Tide : Current.color,
                Prism = Current.prism,
                Pulse = PulseIsArmed,
            };
            Projectiles.Add(pr);
            PulseIsArmed = false;
            _burstsThisShot = 0;
            Combo = 0;
            Current = Next;
            Next = DrawColor();
            Events.Shot?.Invoke(pr);
        }

        (SpiritColor, bool) DrawColor()
        {
            if (_prismPending)
            {
                _prismPending = false;
                return (SpiritColor.Tide, true);
            }
            // Weight by colors on the field so shots stay useful (proto rule).
            Span<int> counts = stackalloc int[4];
            for (int i = 0; i < Level.ColorCount; i++) counts[i] = 1;
            foreach (var ring in Rings)
                foreach (var p in ring.Pieces)
                    if (!p.IsBoss && (int)p.Color < Level.ColorCount) counts[(int)p.Color] += 3;
            int total = 0;
            for (int i = 0; i < Level.ColorCount; i++) total += counts[i];
            double roll = _rng() * total;
            for (int i = 0; i < Level.ColorCount; i++)
            {
                roll -= counts[i];
                if (roll <= 0) return ((SpiritColor)i, false);
            }
            return (SpiritColor.Tide, false);
        }

        // ----- frame ---------------------------------------------------------

        public void Tick(float dt)
        {
            if (Result != GameResult.Playing)
            {
                UpdateAnimTimers(dt);
                return;
            }
            Time += dt;
            if (SurgeRemaining > 0) SurgeRemaining -= dt;
            if (LullRemaining > 0) LullRemaining -= dt;

            UpdateSpawner(dt);
            UpdateRings(dt);
            UpdatePortals(dt);
            UpdateProjectiles(dt);
            UpdateBoss(dt);
            CheckChains();
            CheckEnd();
        }

        void UpdateAnimTimers(float dt)
        {
            foreach (var ring in Rings)
                foreach (var p in ring.Pieces)
                {
                    if (p.Scale < 1f) p.Scale = MathF.Min(1f, p.Scale + dt * 5f);
                    if (p.RadialT < 1f) p.RadialT += dt * 7f;
                    p.Wobble += dt * 2.2f;
                }
        }

        public float RingSpeed(Ring ring)
        {
            float s = ring.Speed * ring.Direction;
            if (SurgeRemaining > 0) s *= Tune.SurgeMultiplier;
            if (BossRing != null) s *= 1f + BossRage * 0.12f;   // serpent rage
            return s;
        }

        void UpdateRings(float dt)
        {
            foreach (var ring in Rings)
            {
                float w = RingSpeed(ring);
                foreach (var p in ring.Pieces)
                {
                    p.Angle = Norm(p.Angle + (w + p.Impulse) * dt);
                    p.Impulse *= MathF.Pow(0.02f, dt);
                    if (MathF.Abs(p.Impulse) < 0.02f) p.Impulse = 0f;
                    if (p.ChainT > 0) p.ChainT -= dt;
                    if (p.PortalCooldown > 0) p.PortalCooldown -= dt;
                }
                Separate(ring);
            }
            UpdateAnimTimers(dt);
        }

        void Separate(Ring ring)
        {
            var ps = ring.Pieces;
            if (ps.Count < 2) return;
            ps.Sort((a, b) => a.Angle.CompareTo(b.Angle));
            for (int pass = 0; pass < 3; pass++)
            {
                bool moved = false;
                for (int i = 0; i < ps.Count; i++)
                {
                    var p = ps[i]; var q = ps[(i + 1) % ps.Count];
                    float gap = q.Angle - p.Angle;
                    if (i == ps.Count - 1) gap += TAU;
                    if (gap < ring.MinGap)
                    {
                        float push = (ring.MinGap - gap) / 2f;
                        p.Angle = Norm(p.Angle - push);
                        q.Angle = Norm(q.Angle + push);
                        moved = true;
                    }
                }
                if (moved) ps.Sort((a, b) => a.Angle.CompareTo(b.Angle));
                else break;
            }
        }

        void UpdateSpawner(float dt)
        {
            if (Level.SpawnInterval <= 0 || LullRemaining > 0) return;
            _spawnTimer -= dt;
            if (_spawnTimer > 0) return;
            float interval = Level.SpawnInterval;
            if (Level.Objective == Objective.Endless)
                interval = MathF.Max(1.7f, interval - Time * 0.022f);
            _spawnTimer = interval;

            var candidates = new List<Ring>();
            foreach (int idx in Level.SpawnRings)
            {
                if (BossRing != null && Rings[idx] == BossRing) continue;   // serpent's ring
                if (Rings[idx].Pieces.Count < Rings[idx].Capacity + 1)
                    candidates.Add(Rings[idx]);
            }
            if (candidates.Count == 0) return;
            var ring = candidates[(int)(_rng() * candidates.Count)];
            var piece = new Piece
            {
                Id = _pieceUid++,
                Color = (SpiritColor)(int)(_rng() * Level.ColorCount),
                Angle = ring.GateAngle,
                Wobble = (float)(_rng() * TAU),
            };
            ring.Pieces.Add(piece);
            Events.Spawned?.Invoke(ring, piece);
            if (ring.Pieces.Count >= ring.Capacity - 2)
                Events.SpawnWarning?.Invoke(ring);
        }

        // ----- projectiles ---------------------------------------------------

        public float PieceRadiusOn(Ring ring, Piece p)
            => p.RadialT >= 1f ? ring.Radius
             : p.RadialFrom + (ring.Radius - p.RadialFrom) * EaseOutCubic(Math.Clamp(p.RadialT, 0f, 1f));

        public (Ring ring, Piece piece)? FindHit(float x, float y)
        {
            float rr = MathF.Sqrt(x * x + y * y);
            foreach (var ring in Rings)
            {
                if (MathF.Abs(rr - ring.Radius) > PieceRadius * 2.4f) continue;
                foreach (var p in ring.Pieces)
                {
                    float pr = PieceRadiusOn(ring, p);
                    float px = MathF.Cos(p.Angle) * pr, py = MathF.Sin(p.Angle) * pr;
                    float dx = x - px, dy = y - py;
                    float rad = p.IsBoss ? PieceRadius * 1.5f : PieceRadius;  // boss body is bigger
                    if (dx * dx + dy * dy < Sq(rad + PieceRadius * 0.9f))
                        return (ring, p);
                }
            }
            return null;
        }

        void UpdateProjectiles(float dt)
        {
            float maxR = Rings[^1].Radius + 0.6f;
            for (int i = Projectiles.Count - 1; i >= 0; i--)
            {
                var pr = Projectiles[i];
                pr.X += pr.Vx * dt;
                pr.Y += pr.Vy * dt;
                var hit = FindHit(pr.X, pr.Y);
                if (hit.HasValue)
                {
                    Projectiles.RemoveAt(i);
                    OnProjectileHit(pr, hit.Value.ring, hit.Value.piece);
                    continue;
                }
                if (pr.X * pr.X + pr.Y * pr.Y > maxR * maxR)
                    Projectiles.RemoveAt(i);
            }
        }

        void OnProjectileHit(Projectile pr, Ring ring, Piece hitPiece)
        {
            // Boss segments: crack with a matching color, bounce otherwise.
            if (hitPiece.IsBoss) { HitBossSegment(pr, ring, hitPiece); return; }
            if (pr.Pulse) { PulseBlast(ring, hitPiece); return; }

            float angle = MathF.Atan2(pr.Y, pr.X);
            var piece = new Piece
            {
                Id = _pieceUid++,
                Color = pr.Prism ? hitPiece.Color : pr.Color,
                Prism = pr.Prism,
                Angle = Norm(angle),
                RadialFrom = MathF.Sqrt(pr.X * pr.X + pr.Y * pr.Y),
                RadialT = 0f,
                Scale = 0.4f,
                Wobble = (float)(_rng() * TAU),
            };
            ring.Pieces.Add(piece);
            foreach (var q in ring.Pieces)                       // impact squash wave
                if (q != piece && MathF.Abs(Diff(q.Angle, piece.Angle)) < ring.MinGap * 2.3f)
                    q.Scale = MathF.Min(q.Scale, 0.72f);
            Separate(ring);
            Events.Attached?.Invoke(piece, ring, pr.X, pr.Y);

            var run = FindRun(ring, piece);
            if (run.Count >= 3) DoBurst(ring, run, isChain: false);
            else if (ring.Pieces.Count >= ring.Capacity) Fail();
        }

        void PulseBlast(Ring ring, Piece hitPiece)
        {
            var ps = ring.Pieces;
            ps.Sort((a, b) => a.Angle.CompareTo(b.Angle));
            int idx = ps.IndexOf(hitPiece);
            var grab = new List<Piece> { hitPiece };
            for (int off = 1; off <= 2 && ps.Count > grab.Count; off++)
            {
                var l = ps[(idx - off + ps.Count) % ps.Count];
                var r = ps[(idx + off) % ps.Count];
                if (!l.IsBoss && !grab.Contains(l)) grab.Add(l);
                if (!r.IsBoss && !grab.Contains(r)) grab.Add(r);
            }
            float pr = PieceRadiusOn(ring, hitPiece);
            Events.PulseBlast?.Invoke(MathF.Cos(hitPiece.Angle) * pr, MathF.Sin(hitPiece.Angle) * pr);
            DoBurst(ring, grab, isChain: false, isPulse: true);
        }

        // ----- matching ------------------------------------------------------

        public List<Piece> FindRun(Ring ring, Piece piece)
        {
            var ps = ring.Pieces;
            var result = new List<Piece>();
            if (ps.Count == 0) return result;
            ps.Sort((a, b) => a.Angle.CompareTo(b.Angle));
            int n = ps.Count, idx = ps.IndexOf(piece);
            if (idx < 0) return result;
            float joinGap = ring.MinGap * Tune.JoinFactor;

            int runColor = piece.Prism ? -1 : (int)piece.Color;
            var included = new List<int> { idx };
            void Extend(int dir)
            {
                int cur = idx;
                for (int step = 0; step < n - 1; step++)
                {
                    int nxt = (cur + dir + n) % n;
                    if (included.Contains(nxt)) break;
                    var a = ps[cur]; var b = ps[nxt];
                    float gap = dir > 0 ? b.Angle - a.Angle : a.Angle - b.Angle;
                    if (gap < 0) gap += TAU;
                    if (gap > joinGap) break;
                    if (b.IsBoss) break;                        // boss segments never join runs
                    int bc = b.Prism ? -1 : (int)b.Color;
                    if (runColor == -1) runColor = bc;
                    if (bc != -1 && runColor != -1 && bc != runColor) break;
                    included.Add(nxt);
                    cur = nxt;
                }
            }
            Extend(1);
            Extend(-1);
            foreach (int i in included) result.Add(ps[i]);
            return result;
        }

        /// <summary>Read-only: would dropping a piece of <paramref name="color"/>
        /// at <paramref name="angle"/> on this ring form a run of 3+? Drives the
        /// aim preview so a shot can be read as "will score" before firing.
        /// Never mutates state.</summary>
        public bool WouldMatch(Ring ring, float angle, SpiritColor color)
        {
            if (ring == null || ring.Pieces.Count < 2) return false;
            var sorted = new List<Piece>(ring.Pieces);
            sorted.Sort((a, b) => a.Angle.CompareTo(b.Angle));
            int n = sorted.Count;
            float joinGap = ring.MinGap * Tune.JoinFactor;
            float a0 = Norm(angle);

            int ins = 0;
            while (ins < n && sorted[ins].Angle < a0) ins++;

            int count = 1;
            float prev = a0;
            for (int k = 0; k < n; k++)
            {
                var p = sorted[(ins + k) % n];
                float gap = Norm(p.Angle - prev);
                if (gap > joinGap) break;
                if (p.IsBoss || (int)p.Color != (int)color) break;
                count++; prev = p.Angle;
            }
            prev = a0;
            for (int k = 0; k < n; k++)
            {
                var p = sorted[((ins - 1 - k) % n + n) % n];
                float gap = Norm(prev - p.Angle);
                if (gap > joinGap) break;
                if (p.IsBoss || (int)p.Color != (int)color) break;
                count++; prev = p.Angle;
            }
            return count >= 3;
        }

        void DoBurst(Ring ring, List<Piece> run, bool isChain, bool isPulse = false)
        {
            if (run.Count == 0) return;
            Combo = isChain ? Combo + 1 : 1;
            _burstsThisShot++;
            float mult = 1f + (Combo - 1) * Tune.ComboScoreStep;
            int gained = (int)MathF.Round(Tune.ScorePerPiece * run.Count * mult);
            Score += gained;
            Energy += run.Count;
            if (!isPulse) Ability = Math.Min(Tune.PulseMeterMax, Ability + 1);
            foreach (var p in run) if (p.Corrupt) Cleansed++;

            ring.Pieces.RemoveAll(run.Contains);
            FlagChainEdges(ring, run);

            if (_burstsThisShot == 2 && !_prismPending && !Next.prism && !Current.prism)
            {
                _prismPending = true;
                Events.PrismEarned?.Invoke();
            }

            Events.Burst?.Invoke(run, ring, Combo, gained);
            TriggerShift(ring);
        }

        void FlagChainEdges(Ring ring, List<Piece> removed)
        {
            if (ring.Pieces.Count == 0) return;
            float sx = 0, sy = 0;
            foreach (var p in removed) { sx += MathF.Cos(p.Angle); sy += MathF.Sin(p.Angle); }
            float midA = MathF.Atan2(sy, sx);
            Piece cw = null, ccw = null;
            float dCw = float.MaxValue, dCcw = float.MaxValue;
            foreach (var p in ring.Pieces)
            {
                if (p.IsBoss) continue;
                float d = Diff(midA, p.Angle);
                if (d >= 0 && d < dCw) { dCw = d; cw = p; }
                if (d < 0 && -d < dCcw) { dCcw = -d; ccw = p; }
            }
            if (cw != null) { cw.ChainT = Tune.ChainWindow; cw.Impulse = -Tune.GapPull; }
            if (ccw != null) { ccw.ChainT = Tune.ChainWindow; ccw.Impulse = Tune.GapPull; }
        }

        void CheckChains()
        {
            // Index-based: FindRun sorts ring.Pieces, which would invalidate a
            // foreach enumerator (C#-specific; the JS prototype had no issue).
            for (int r = 0; r < Rings.Count; r++)
            {
                var ring = Rings[r];
                for (int i = 0; i < ring.Pieces.Count; i++)
                {
                    var p = ring.Pieces[i];
                    if (p.ChainT <= 0 || p.IsBoss) continue;
                    var run = FindRun(ring, p);
                    if (run.Count >= 3)
                    {
                        p.ChainT = 0;
                        DoBurst(ring, run, isChain: true);
                        return; // one chain per frame keeps cascades readable
                    }
                }
            }
        }

        // ----- orbit shifts --------------------------------------------------

        void TriggerShift(Ring matchedRing)
        {
            if (Level.Shifts.Length == 0) return;
            var kind = Level.Shifts[_shiftIdx % Level.Shifts.Length];
            _shiftIdx++;
            switch (kind)
            {
                case ShiftKind.Reverse:
                    matchedRing.Direction *= -1;
                    break;
                case ShiftKind.Surge:
                    SurgeRemaining = Tune.SurgeDuration;
                    break;
                case ShiftKind.Lull:
                    LullRemaining = Tune.LullDuration;
                    _spawnTimer = MathF.Max(_spawnTimer, 2f);
                    break;
                case ShiftKind.Leap:
                    DoLeap(matchedRing);
                    break;
                case ShiftKind.Portal:
                    OpenPortal(matchedRing);
                    break;
            }
            Events.Shift?.Invoke(kind, matchedRing);
        }

        void DoLeap(Ring from)
        {
            var others = Rings.FindAll(r => r != from && !(BossRing != null && r == BossRing));
            if (others.Count == 0 || from.Pieces.Count == 0) return;
            var target = others[(int)(_rng() * others.Count)];
            int moved = 0;
            for (int tries = 0; tries < 6 && moved < 2; tries++)
            {
                if (from.Pieces.Count == 0 || target.Pieces.Count >= target.Capacity - 1) break;
                var p = from.Pieces[(int)(_rng() * from.Pieces.Count)];
                if (p.IsBoss) continue;                          // never leap the serpent
                from.Pieces.Remove(p);
                p.RadialFrom = from.Radius;
                p.RadialT = 0f;
                p.ChainT = Tune.ChainWindow;
                target.Pieces.Add(p);
                moved++;
                Events.Leaped?.Invoke(p, from, target);
            }
        }

        // ----- portals -------------------------------------------------------

        /// <summary>Open a portal pair between the matched ring and a random
        /// other ring (core.js openPortal). Max 2 concurrent, oldest drops.</summary>
        void OpenPortal(Ring fromRing)
        {
            var others = Rings.FindAll(r => r != fromRing && !(BossRing != null && r == BossRing));
            if (others.Count == 0) return;
            var target = others[(int)(_rng() * others.Count)];
            var portal = new Portal
            {
                Angle = (float)(_rng() * TAU),
                RingA = fromRing,
                RingB = target,
                Remaining = Tune.PortalDuration,
            };
            Portals.Add(portal);
            if (Portals.Count > 2) Portals.RemoveAt(0);
            Events.PortalOpened?.Invoke(portal);
        }

        void UpdatePortals(float dt)
        {
            for (int i = Portals.Count - 1; i >= 0; i--)
            {
                var po = Portals[i];
                po.Remaining -= dt;
                if (po.Remaining <= 0) { Portals.RemoveAt(i); continue; }
                HopThrough(po, po.RingA, po.RingB);
                HopThrough(po, po.RingB, po.RingA);
            }
        }

        void HopThrough(Portal po, Ring from, Ring to)
        {
            for (int j = 0; j < from.Pieces.Count; j++)
            {
                var p = from.Pieces[j];
                if (p.IsBoss || p.PortalCooldown > 0) continue;
                if (MathF.Abs(Diff(p.Angle, po.Angle)) < from.MinGap * 0.55f
                    && to.Pieces.Count < to.Capacity - 1)
                {
                    from.Pieces.RemoveAt(j);
                    p.PortalCooldown = 2f;
                    p.RadialFrom = from.Radius;
                    p.RadialT = 0f;
                    p.ChainT = Tune.ChainWindow;                 // arrivals can cascade
                    to.Pieces.Add(p);
                    Events.PortalHop?.Invoke(p, from, to);
                    break;   // one hop per portal per frame keeps it readable
                }
            }
        }

        // ----- boss ----------------------------------------------------------

        /// <summary>Projectile struck a shell segment (core.js hitBossSegment):
        /// prism/pulse/matching color cracks it, otherwise it bounces off.</summary>
        void HitBossSegment(Projectile pr, Ring ring, Piece seg)
        {
            bool match = pr.Prism || pr.Pulse || pr.Color == seg.Color;
            if (!match)
            {
                Events.BossBounce?.Invoke(seg);
                return;
            }
            seg.BossHp--;
            if (seg.BossHp <= 0)
            {
                ring.Pieces.Remove(seg);
                BossAlive--;
                BossRage++;
                Score += 400;
                Energy += 2;
                Events.BossHit?.Invoke(seg, true);
            }
            else
            {
                // Cracked segment reveals a new shell color — re-aim!
                seg.Color = (SpiritColor)(((int)seg.Color + 1 + (int)(_rng() * (Level.ColorCount - 1))) % Level.ColorCount);
                Events.BossHit?.Invoke(seg, false);
            }
        }

        void UpdateBoss(float dt)
        {
            if (BossRing == null || BossAlive <= 0) return;
            _roarTimer -= dt;
            if (_roarTimer <= 0)
            {
                _roarTimer = Level.Boss.RoarEvery;
                foreach (var ring in Rings) ring.Direction *= -1;
                SurgeRemaining = 2f;
                Events.BossRoared?.Invoke();
            }
            _eatTimer -= dt;
            if (_eatTimer <= 0)
            {
                _eatTimer = Level.Boss.EatEvery;
                // The serpent feeds: two extra wisps burst onto the inner ring.
                var inner = Rings[0];
                for (int i = 0; i < 2 && inner.Pieces.Count < inner.Capacity; i++)
                {
                    inner.Pieces.Add(new Piece
                    {
                        Id = _pieceUid++,
                        Color = (SpiritColor)(int)(_rng() * Level.ColorCount),
                        Angle = Norm(inner.GateAngle + i * 0.4f),
                        Wobble = (float)(_rng() * TAU),
                    });
                }
                Events.BossFed?.Invoke();
                if (inner.Pieces.Count >= inner.Capacity) Fail();
            }
        }

        // ----- win / lose ----------------------------------------------------

        void Fail()
        {
            if (Result != GameResult.Playing) return;
            Result = GameResult.Lost;
            Events.Lost?.Invoke();
        }

        void CheckEnd()
        {
            if (Result != GameResult.Playing) return;
            foreach (var ring in Rings)
                if (!(BossRing != null && ring == BossRing) && ring.Pieces.Count >= ring.Capacity)
                { Fail(); return; }

            bool won = Level.Objective switch
            {
                Objective.Bloom => Energy >= Level.Target,
                Objective.Cleanse => Cleansed >= CleanseTarget,
                Objective.Survive => Time >= Level.SurviveTime,
                Objective.Boss => BossRing != null && BossAlive <= 0,
                _ => false,
            };
            if (won)
            {
                Result = GameResult.Won;
                Events.Won?.Invoke();
            }
        }

        public int Stars()
        {
            if (Result != GameResult.Won) return 0;
            int s = 1;
            if (Score >= Level.Star2Score) s++;
            if (Score >= Level.Star3Score) s++;
            return s;
        }

        // ----- helpers -------------------------------------------------------

        static float Sq(float v) => v * v;
        static float EaseOutCubic(float t) => 1f - MathF.Pow(1f - t, 3f);
        public static float Norm(float a) { a %= TAU; return a < 0 ? a + TAU : a; }
        public static float Diff(float a, float b)
        {
            float d = Norm(b - a);
            return d > MathF.PI ? d - TAU : d;
        }
    }
}
