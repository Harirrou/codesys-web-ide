// Wispbloom — pooled burst particles, attach ripples, floating score text,
// camera shake and slow-motion. Also owns MaterialLibrary bootstrapping.
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    /// <summary>Shared runtime materials so views never build duplicates.</summary>
    public static class MaterialLibrary
    {
        public static Material Additive;      // soft additive (Shaders/WBAdditive)
        public static Material OrbitFlow;     // scrolling orbit energy
        static Material _dissolveBase;

        public static void Init()
        {
            if (Additive != null) return;
            Additive = new Material(Safe("Wispbloom/Additive"));
            OrbitFlow = new Material(Safe("Wispbloom/OrbitFlow"));
            _dissolveBase = new Material(Safe("Wispbloom/SpriteDissolve"));
        }

        static Shader Safe(string name)
        {
            var s = Shader.Find(name);
            if (s == null)
            {
                Debug.LogError($"Wispbloom: shader '{name}' missing, using Sprites/Default fallback.");
                s = Shader.Find("Sprites/Default");
            }
            return s;
        }

        public static Material NewDissolve() => new Material(_dissolveBase);
    }

    public class EffectsDirector : MonoBehaviour
    {
        public Camera cam;
        public Canvas worldTextCanvas;      // screen-space canvas for score pops
        public Font font;

        ParticleSystem _burst;
        readonly Queue<Text> _textPool = new();
        float _shake;
        Vector3 _camHome;
        Coroutine _slowMo;
        Image _flash;
        Color _flashColor = Color.white;
        float _flashAmt;

        void Awake()
        {
            MaterialLibrary.Init();
            _burst = BuildBurstSystem();
        }

        void Start()
        {
            // After CameraWidthFit has pulled the camera to z=-10.
            _camHome = cam.transform.localPosition;
            BuildFlash();
        }

        void BuildFlash()
        {
            if (worldTextCanvas == null) return;
            var go = new GameObject("Flash", typeof(RectTransform));
            go.transform.SetParent(worldTextCanvas.transform, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            _flash = go.AddComponent<Image>();
            _flash.raycastTarget = false;
            _flash.color = new Color(1f, 1f, 1f, 0f);
            go.transform.SetAsFirstSibling();   // behind score pops, over the field
        }

        /// <summary>Brief full-screen color wash — used to make orbit shifts and
        /// big combos land as events, not silent state changes.</summary>
        public void Flash(Color color, float strength)
        {
            if (Game.SaveService.Data.reduceMotion) return;
            _flashColor = color;
            _flashAmt = Mathf.Max(_flashAmt, strength);
        }

        ParticleSystem BuildBurstSystem()
        {
            var go = new GameObject("BurstFX");
            go.transform.SetParent(transform, false);
            var ps = go.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.playOnAwake = false;
            main.loop = false;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.35f, 0.8f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.8f, 2.4f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.14f);
            main.maxParticles = 512;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            var emission = ps.emission;
            emission.rateOverTime = 0f;
            var col = ps.colorOverLifetime;
            col.enabled = true;
            var grad = new Gradient();
            grad.SetKeys(
                new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0f, 1f) });
            col.color = grad;
            var psr = go.GetComponent<ParticleSystemRenderer>();
            psr.material = MaterialLibrary.Additive;
            psr.sortingOrder = 30;
            return ps;
        }

        static readonly Color[] Tint =
        {
            new Color(0.37f, 0.90f, 0.82f), new Color(0.95f, 0.49f, 0.81f),
            new Color(1.00f, 0.77f, 0.42f), new Color(0.66f, 0.55f, 1.00f),
        };

        public void BurstAt(Vector3 pos, bool corrupt, SpiritColor color, ArtBinding art)
        {
            var emitParams = new ParticleSystem.EmitParams
            {
                position = pos,
                startColor = corrupt ? new Color(0.7f, 0.55f, 1f) : Tint[(int)color],
            };
            _burst.Emit(emitParams, 14);
        }

        public void AttachRipple(Vector3 pos, ArtBinding art)
        {
            var emitParams = new ParticleSystem.EmitParams
            {
                position = pos,
                startColor = new Color(1f, 1f, 1f, 0.8f),
            };
            _burst.Emit(emitParams, 5);
        }

        public void CelebrateField(IEnumerable<SpiritView> spirits)
        {
            foreach (var s in spirits)
                if (s != null) BurstAt(s.transform.position, false, SpiritColor.Tide, null);
        }

        public void FloatingScore(Vector3 worldPos, int gained, int combo)
        {
            var label = TakeText();
            label.text = combo > 1 ? $"+{gained}  ×{combo}" : $"+{gained}";
            label.fontSize = combo > 1 ? 44 : 32;
            label.color = new Color(1f, 0.91f, 0.69f);
            label.rectTransform.position = cam.WorldToScreenPoint(worldPos);
            StartCoroutine(FloatRoutine(label));
        }

        Text TakeText()
        {
            Text label = _textPool.Count > 0 ? _textPool.Dequeue() : null;
            if (label == null)
            {
                var go = new GameObject("ScorePop");
                go.transform.SetParent(worldTextCanvas.transform, false);
                label = go.AddComponent<Text>();
                label.font = font;
                label.alignment = TextAnchor.MiddleCenter;
                label.horizontalOverflow = HorizontalWrapMode.Overflow;
                label.verticalOverflow = VerticalWrapMode.Overflow;
                var shadow = go.AddComponent<Shadow>();
                shadow.effectColor = new Color(0f, 0f, 0.1f, 0.6f);
                shadow.effectDistance = new Vector2(1.5f, -1.5f);
            }
            label.gameObject.SetActive(true);
            return label;
        }

        IEnumerator FloatRoutine(Text label)
        {
            float t = 0f;
            Vector3 start = label.rectTransform.position;
            var c = label.color;
            while (t < 1.1f)
            {
                t += Time.unscaledDeltaTime;
                float k = t / 1.1f;
                label.rectTransform.position = start + Vector3.up * (k * 60f);
                label.color = new Color(c.r, c.g, c.b, k < 0.15f ? k / 0.15f : 1f - Mathf.Max(0, (k - 0.4f) / 0.6f));
                yield return null;
            }
            label.gameObject.SetActive(false);
            _textPool.Enqueue(label);
        }

        public void Shake(float magnitude)
        {
            if (Game.SaveService.Data.reduceMotion) return;
            _shake = Mathf.Max(_shake, magnitude);
        }

        public void SlowMo(float duration, float scale)
        {
            if (Game.SaveService.Data.reduceMotion) return;
            if (_slowMo != null) StopCoroutine(_slowMo);
            _slowMo = StartCoroutine(SlowMoRoutine(duration, scale));
        }

        IEnumerator SlowMoRoutine(float duration, float scale)
        {
            Time.timeScale = scale;
            float t = 0f;
            while (t < duration)
            {
                t += Time.unscaledDeltaTime;
                yield return null;
            }
            Time.timeScale = 1f;
            _slowMo = null;
        }

        void LateUpdate()
        {
            if (_shake > 0.001f)
            {
                _shake = Mathf.Lerp(_shake, 0f, Time.unscaledDeltaTime * 3.5f);
                cam.transform.localPosition = _camHome + (Vector3)(Random.insideUnitCircle * _shake);
            }
            else cam.transform.localPosition = _camHome;

            if (_flash != null && _flashAmt > 0.001f)
            {
                _flashAmt = Mathf.Lerp(_flashAmt, 0f, Time.unscaledDeltaTime * 4.5f);
                _flash.color = new Color(_flashColor.r, _flashColor.g, _flashColor.b, _flashAmt * 0.32f);
            }
            else if (_flash != null && _flash.color.a > 0f)
                _flash.color = new Color(_flashColor.r, _flashColor.g, _flashColor.b, 0f);
        }
    }
}
