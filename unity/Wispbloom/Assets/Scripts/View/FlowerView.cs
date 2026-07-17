// Wispbloom — the central flower, built from separate layers so each can
// animate independently: petal ring (two staggered rows of petal sprites),
// heart glow, a URP 2D point light illuminating nearby spirits, and the
// loaded/next wisp display. Opens and intensifies with progress.
using UnityEngine;
using UnityEngine.Rendering.Universal;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    public class FlowerView : MonoBehaviour
    {
        GameSim _sim;
        GameTuning _tuning;
        ArtBinding _art;
        Transform _petalRoot;
        Transform[] _petals;
        SpriteRenderer _heart;
        Light2D _light;
        SpriteRenderer _loaded, _loadedHalo, _next;
        float _matchKick;
        float _celebrateT = -1f;

        public void Bind(GameSim sim, GameTuning tuning, ArtBinding art)
        {
            _sim = sim; _tuning = tuning; _art = art;
            foreach (Transform child in transform) Destroy(child.gameObject);
            transform.position = Vector3.zero; // parent = fieldRoot

            _petalRoot = new GameObject("Petals").transform;
            _petalRoot.SetParent(transform, false);
            _petals = new Transform[12];
            for (int i = 0; i < 12; i++)
            {
                bool front = i >= 6;
                var sr = new GameObject($"Petal{i}").AddComponent<SpriteRenderer>();
                sr.transform.SetParent(_petalRoot, false);
                sr.sprite = art.flowerPetal;
                sr.material = MaterialLibrary.Additive;
                sr.sortingOrder = front ? 21 : 20;
                sr.color = front ? new Color(1f, 0.98f, 0.94f, 0.95f)
                                 : new Color(1f, 0.9f, 0.78f, 0.8f);
                float angle = (i % 6) / 6f * 360f + (front ? 30f : 0f);
                sr.transform.localRotation = Quaternion.Euler(0, 0, angle);
                _petals[i] = sr.transform;
            }

            _heart = new GameObject("Heart").AddComponent<SpriteRenderer>();
            _heart.transform.SetParent(transform, false);
            _heart.sprite = art.flowerHeart;
            _heart.material = MaterialLibrary.Additive;
            _heart.sortingOrder = 22;

            // The flower literally lights the garden: nearby spirits catch it.
            _light = new GameObject("BloomLight").AddComponent<Light2D>();
            _light.transform.SetParent(transform, false);
            _light.lightType = Light2D.LightType.Point;
            _light.color = new Color(1f, 0.93f, 0.78f);
            _light.falloffIntensity = 0.6f;

            _loadedHalo = MakeSprite("LoadedHalo", art.spiritGlow, 24, MaterialLibrary.Additive);
            _loaded = MakeSprite("Loaded", null, 25, null);
            _next = MakeSprite("Next", null, 25, null);
        }

        SpriteRenderer MakeSprite(string name, Sprite sprite, int order, Material mat)
        {
            var sr = new GameObject(name).AddComponent<SpriteRenderer>();
            sr.transform.SetParent(transform, false);
            sr.sprite = sprite;
            sr.sortingOrder = order;
            if (mat != null) sr.material = mat;
            return sr;
        }

        public void OnMatch() => _matchKick = 1f;
        public void Celebrate() => _celebrateT = 0f;

        void Update()
        {
            if (_sim == null) return;
            float t = Time.time;
            float energyK = _sim.Level.Objective == Objective.Bloom && _sim.Level.Target > 0
                ? Mathf.Clamp01(_sim.Energy / (float)_sim.Level.Target)
                : Mathf.Clamp01(_sim.Energy / 60f);
            _matchKick = Mathf.Max(0f, _matchKick - Time.deltaTime * 2.2f);

            // Gentle rotation + breathing; petals open with progress; match kick.
            _petalRoot.localRotation = Quaternion.Euler(0, 0, t * 3.5f);
            float open = 0.62f + energyK * 0.5f + _matchKick * 0.12f;
            float breathe = 1f + Mathf.Sin(t * 1.6f) * 0.02f;
            float petalScale = _sim.CoreRadius * 2.1f;
            for (int i = 0; i < _petals.Length; i++)
            {
                bool front = i >= 6;
                float sway = 1f + Mathf.Sin(t * 1.1f + i * 1.7f) * 0.025f;
                float len = (front ? 0.72f : 1f) * open * sway * breathe;
                _petals[i].localScale = new Vector3(petalScale * 0.5f, petalScale * len, 1f);
            }

            float heartK = 0.9f + energyK * 0.5f + _matchKick * 0.5f;
            if (_celebrateT >= 0f)
            {
                _celebrateT += Time.deltaTime;
                heartK += Mathf.Sin(_celebrateT * 10f) * 0.3f + _celebrateT * 0.5f;
            }
            _heart.transform.localScale = Vector3.one * (_sim.CoreRadius * 1.7f * heartK);
            _light.intensity = 0.55f + energyK * 0.55f + _matchKick * 0.6f;
            _light.pointLightOuterRadius = _sim.CoreRadius * (5f + energyK * 2f);

            SyncAmmo();
        }

        void SyncAmmo()
        {
            var cur = _sim.Current;
            var nxt = _sim.Next;
            _loaded.sprite = _art.spiritBodies[(int)cur.color];
            float size = _sim.PieceRadius * 2.1f / Mathf.Max(0.01f, _loaded.sprite.bounds.size.x);
            _loaded.transform.localScale = Vector3.one * size;
            _loaded.transform.localPosition = new Vector3(0f, Mathf.Sin(Time.time * 1.1f) * 0.02f, 0f);
            _loadedHalo.transform.localScale = Vector3.one * (_sim.PieceRadius * 4f);
            _loadedHalo.color = new Color(1f, 1f, 1f, _sim.PulseIsArmed ? 0.75f : 0.35f);

            _next.sprite = _art.spiritBodies[(int)nxt.color];
            float nsize = _sim.PieceRadius * 1.3f / Mathf.Max(0.01f, _next.sprite.bounds.size.x);
            _next.transform.localScale = Vector3.one * nsize;
            _next.transform.localPosition = new Vector3(_sim.CoreRadius * 1.4f, -_sim.CoreRadius * 1.15f, 0f);
        }
    }
}
