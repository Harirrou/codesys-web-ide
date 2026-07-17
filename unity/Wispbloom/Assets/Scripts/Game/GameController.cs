// Wispbloom — scene orchestrator: owns the sim, routes input, drives views,
// and runs the Playing / Paused / Won / Lost state machine. Presentation
// subscribes to SimEvents; gameplay rules never live here.
using System.Collections.Generic;
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;
using Wispbloom.View;
using Wispbloom.UI;

namespace Wispbloom.Game
{
    public class GameController : MonoBehaviour
    {
        [Header("Data")]
        public LevelDefinition level;
        public GameTuning tuning;
        public ArtBinding art;

        [Header("Scene refs (wired by the bootstrap)")]
        public Camera cam;
        public FlowerView flower;
        public Transform fieldRoot;
        public EffectsDirector effects;
        public AudioDirector audioDirector;
        public HudView hud;
        public PausePanel pausePanel;
        public ResultPanel resultPanel;
        public AimController aim;

        public GameSim Sim { get; private set; }
        public bool Paused { get; private set; }
        float _resultTimer;
        bool _resultShown;
        readonly List<RingView> _ringViews = new();
        readonly Dictionary<int, SpiritView> _spiritViews = new();
        readonly List<(Projectile pr, ProjectileView view)> _projViews = new();

        string _artProblems;

        void Start()
        {
            _artProblems = DiagnoseArt();
            StartLevel();
        }

        // Renders any missing-art report directly on screen so a phone
        // screenshot is enough to debug remotely.
        string DiagnoseArt()
        {
            if (art == null) return "ArtBinding asset not assigned";
            var missing = new System.Collections.Generic.List<string>();
            if (art.spiritBodies == null || art.spiritBodies.Length < 4) missing.Add("spiritBodies[]");
            else for (int i = 0; i < 4; i++) if (art.spiritBodies[i] == null) missing.Add($"spiritBodies[{i}]");
            if (art.spiritGlow == null) missing.Add("spiritGlow");
            if (art.flowerPetal == null) missing.Add("flowerPetal");
            if (art.flowerHeart == null) missing.Add("flowerHeart");
            if (art.orbitTile == null) missing.Add("orbitTile");
            if (art.dustMote == null) missing.Add("dustMote");
            if (art.sparkle == null) missing.Add("sparkle");
            if (art.backgroundDawn == null) missing.Add("backgroundDawn");
            if (art.panelGlow9Slice == null) missing.Add("panelGlow9Slice");
            if (art.uiFont == null) missing.Add("uiFont");
            if (missing.Count == 0) return null;
            string report = "ART MISSING: " + string.Join(", ", missing) +
                            "  (run Wispbloom > Repair Art Binding)";
            Debug.LogError("Wispbloom: " + report);
            return report;
        }

        void OnGUI()
        {
            if (_artProblems == null) return;
            var style = new GUIStyle { fontSize = 26, wordWrap = true };
            style.normal.textColor = UnityEngine.Color.red;
            GUI.Label(new UnityEngine.Rect(20, UnityEngine.Screen.height * 0.35f,
                UnityEngine.Screen.width - 40, 400), _artProblems, style);
        }

        public void StartLevel()
        {
            foreach (Transform child in fieldRoot) Destroy(child.gameObject);
            _ringViews.Clear();
            _spiritViews.Clear();
            _projViews.Clear();
            Paused = false;
            _resultTimer = 0f;
            _resultShown = false;
            Time.timeScale = 1f;

            Sim = new GameSim(level.ToSpec(), tuning.sim);
            Layout();
            HookEvents();

            foreach (var ring in Sim.Rings)
            {
                var rv = RingView.Create(fieldRoot, ring, art, tuning);
                _ringViews.Add(rv);
                foreach (var p in ring.Pieces) SpawnSpiritView(ring, p);
            }
            flower.Bind(Sim, tuning, art);
            hud.Bind(this);
            pausePanel.Bind(this);
            resultPanel.Bind(this);
            pausePanel.Hide();
            resultPanel.Hide();
            audioDirector.Bind(Sim.Events);
            hud.ShowLevelName(level.displayName);
        }

        void Layout()
        {
            float halfH = cam.orthographicSize;
            float halfW = halfH * cam.aspect;
            float minHalf = Mathf.Min(halfW, halfH);
            // Field center: mirrors the prototype's 46 %-from-top placement.
            fieldRoot.position = new Vector3(0f, halfH * (1f - tuning.fieldCenterY * 2f), 0f);
            float core = Mathf.Clamp(minHalf * tuning.coreRadiusFraction * 2f, 0.26f, 0.46f);
            float outer = Mathf.Min(halfW * 0.94f, halfH * tuning.outerRingFraction * 2f);
            float piece = Mathf.Clamp(outer * 0.075f, 0.10f, 0.20f);
            float inner = core + piece + 0.26f;
            Sim.SetLayout(core, piece, inner, outer);
        }

        void HookEvents()
        {
            var e = Sim.Events;
            e.Attached += (p, ring, x, y) =>
            {
                SpawnSpiritView(ring, p);
                effects.AttachRipple(FieldPoint(x, y), art);
            };
            e.Burst += (run, ring, combo, gained) =>
            {
                Vector3 mid = Vector3.zero;
                foreach (var p in run)
                {
                    var v = TakeSpiritView(p);
                    Vector3 at = v != null ? v.transform.position
                                           : RingPoint(ring, p.Angle);
                    mid += at;
                    effects.BurstAt(at, p.Corrupt, p.Color, art);
                    if (v != null) v.Dissolve();
                }
                mid /= run.Count;
                effects.FloatingScore(mid, gained, combo);
                effects.Shake(0.06f + Mathf.Min(0.14f, run.Count * 0.02f));
                if (combo >= 3) effects.SlowMo(0.4f, tuning.slowMoScale);
                flower.OnMatch();
            };
            e.Shift += (kind, ring) => hud.ShowShiftBanner(kind);
            e.Leaped += (p, from, to) => { /* view keeps following sim state */ };
            e.Spawned += (ring, p) =>
            {
                SpawnSpiritView(ring, p);
                effects.AttachRipple(RingPoint(ring, p.Angle), art);
            };
            e.SpawnWarning += ring => hud.PulseDanger();
            e.PrismEarned += () => hud.Toast("PRISM EARNED!");
            e.PulseBlast += (x, y) =>
            {
                effects.Shake(0.22f);
                effects.SlowMo(0.5f, tuning.slowMoScale);
            };
            e.Won += () => { _resultTimer = 0f; effects.CelebrateField(_spiritViews.Values); flower.Celebrate(); };
            e.Lost += () => { _resultTimer = 0f; effects.Shake(0.3f); };
        }

        void SpawnSpiritView(Ring ring, Piece piece)
        {
            var view = SpiritView.Create(fieldRoot, art, tuning, piece.Color, piece.Corrupt, piece.Prism);
            _spiritViews[piece.Id] = view;
        }

        SpiritView TakeSpiritView(Piece p)
        {
            if (!_spiritViews.TryGetValue(p.Id, out var v)) return null;
            _spiritViews.Remove(p.Id);
            return v;
        }

        public Vector3 FieldPoint(float x, float y) => fieldRoot.position + new Vector3(x, y, 0f);
        Vector3 RingPoint(Ring ring, float angle)
            => FieldPoint(Mathf.Cos(angle) * ring.Radius, Mathf.Sin(angle) * ring.Radius);

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape)) OnBackButton();
            if (Paused) return;

            float dt = Time.deltaTime;
            bool decided = Sim.Result != GameResult.Playing;
            Sim.Tick(decided ? Time.unscaledDeltaTime : dt);

            SyncViews();
            hud.Refresh(Sim);

            if (decided)
            {
                _resultTimer += Time.unscaledDeltaTime;
                if (!_resultShown && _resultTimer > 0.9f)
                {
                    _resultShown = true;
                    Time.timeScale = 1f;
                    resultPanel.Show(Sim);
                }
            }
        }

        void SyncViews()
        {
            foreach (var ring in Sim.Rings)
                foreach (var p in ring.Pieces)
                    if (_spiritViews.TryGetValue(p.Id, out var v))
                        v.Sync(FieldPoint(0, 0), ring, p, Sim);

            // projectile views follow sim projectiles; create/destroy to match
            for (int i = _projViews.Count - 1; i >= 0; i--)
                if (!Sim.Projectiles.Contains(_projViews[i].pr))
                {
                    _projViews[i].view.Release();
                    _projViews.RemoveAt(i);
                }
            foreach (var pr in Sim.Projectiles)
            {
                bool known = false;
                foreach (var t in _projViews) if (t.pr == pr) { known = true; break; }
                if (!known)
                    _projViews.Add((pr, ProjectileView.Create(fieldRoot, art, tuning, pr)));
            }
            foreach (var t in _projViews)
                t.view.transform.position = FieldPoint(t.pr.X, t.pr.Y);
        }

        // ----- UI actions ----------------------------------------------------
        public void TogglePause(bool pause)
        {
            if (Sim.Result != GameResult.Playing && pause) return;
            Paused = pause;
            Time.timeScale = pause ? 0f : 1f;
            if (pause) pausePanel.Show(); else pausePanel.Hide();
        }

        public void Restart() { Time.timeScale = 1f; StartLevel(); }

        public void ArmPulse() { if (Sim.ArmPulse()) audioDirector.PlayPower(); }

        void OnBackButton()
        {
            if (Paused) TogglePause(false);
            else TogglePause(true);
        }

        void OnApplicationPause(bool paused)
        {
            if (paused && Sim != null && Sim.Result == GameResult.Playing)
                TogglePause(true);
            if (paused) SaveService.Flush();
        }
    }
}
