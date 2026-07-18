// Wispbloom — tiny reusable UI animator so the menus breathe instead of
// sitting there like a mock-up: gentle scale pulse, alpha shimmer, a slow
// Ken-Burns zoom for background skies, and drifting motion for sparkles.
// Runs on unscaled time so it keeps moving while the game is paused.
using UnityEngine;
using UnityEngine.UI;

namespace Wispbloom.UI
{
    public class UiFx : MonoBehaviour
    {
        public float baseScale = 1f;
        public float pulseAmp = 0f, pulseSpeed = 2f;
        public float shimmerAmp = 0f, shimmerSpeed = 2f;
        public float kenBurns = 0f;
        public Vector2 drift = Vector2.zero;   // anchored px/sec (sparkles)

        RectTransform _rt;
        Graphic _g;
        Color _baseCol;
        float _t, _seed;

        void Awake()
        {
            _rt = GetComponent<RectTransform>();
            _g = GetComponent<Graphic>();
            if (_g != null) _baseCol = _g.color;
            _seed = transform.GetSiblingIndex() * 1.7f;
        }

        void Update()
        {
            _t += Time.unscaledDeltaTime;
            float phase = _t + _seed;

            if (_rt != null && (pulseAmp != 0f || kenBurns != 0f || baseScale != 1f))
            {
                float s = baseScale + Mathf.Sin(phase * pulseSpeed) * pulseAmp
                                    + Mathf.Sin(phase * 0.6f) * kenBurns;
                _rt.localScale = new Vector3(s, s, 1f);
            }

            if (_rt != null && (drift.x != 0f || drift.y != 0f))
            {
                var p = _rt.anchoredPosition + drift * Time.unscaledDeltaTime;
                if (p.y > 640f) p.y = -640f;
                if (p.x > 580f) p.x = -580f; else if (p.x < -580f) p.x = 580f;
                _rt.anchoredPosition = p;
            }

            if (_g != null && shimmerAmp > 0f)
            {
                float a = Mathf.Clamp01(_baseCol.a + Mathf.Sin(phase * shimmerSpeed) * shimmerAmp);
                _g.color = new Color(_baseCol.r, _baseCol.g, _baseCol.b, a);
            }
        }
    }
}
