// Wispbloom — the "alive" layer that lifts the scene out of flat/sample
// territory: two parallax fields of softly drifting bokeh motes and a
// cinematic vignette that frames the play area. All screen-anchored (parented
// to the camera) so it costs nothing to reason about and never interacts with
// the gameplay field. Painted in memory — no assets required.
using UnityEngine;

namespace Wispbloom.View
{
    public class AmbientDepth : MonoBehaviour
    {
        Camera _cam;
        SpriteRenderer _vignette;
        Mote[] _motes;
        const float Z = 10f;   // camera-local depth → world z ≈ 0

        class Mote
        {
            public SpriteRenderer sr;
            public float x, y, vx, vy, size, baseAlpha, phase, twinkle;
        }

        public static AmbientDepth Create(Transform camTransform, Camera cam)
        {
            var go = new GameObject("AmbientDepth");
            go.transform.SetParent(camTransform, false);
            var a = go.AddComponent<AmbientDepth>();
            a._cam = cam;

            a._vignette = new GameObject("Vignette").AddComponent<SpriteRenderer>();
            a._vignette.transform.SetParent(go.transform, false);
            a._vignette.sprite = RuntimeArt.MakeVignette();
            a._vignette.sortingOrder = 34;
            a._vignette.color = new Color(1f, 1f, 1f, 0.9f);

            var bokeh = RuntimeArt.MakeBokeh();
            var rng = new System.Random(11);
            int n = 28;
            a._motes = new Mote[n];
            for (int i = 0; i < n; i++)
            {
                bool far = (i & 1) == 0;
                var sr = new GameObject("Mote").AddComponent<SpriteRenderer>();
                sr.transform.SetParent(go.transform, false);
                sr.sprite = bokeh;
                sr.material = MaterialLibrary.Additive;
                sr.sortingOrder = far ? -6 : -5;
                a._motes[i] = new Mote
                {
                    sr = sr,
                    size = (far ? 0.05f : 0.11f) + (float)rng.NextDouble() * 0.05f,
                    vx = (float)(rng.NextDouble() - 0.5) * (far ? 0.04f : 0.10f),
                    vy = (far ? 0.015f : 0.045f) + (float)rng.NextDouble() * 0.03f,
                    baseAlpha = (far ? 0.10f : 0.20f) + (float)rng.NextDouble() * 0.14f,
                    phase = (float)rng.NextDouble() * 6.28f,
                    twinkle = 0.6f + (float)rng.NextDouble() * 1.4f,
                };
            }
            // Seed positions across the current view.
            a.Layout(rng);
            return a;
        }

        void Layout(System.Random rng)
        {
            float hh = _cam.orthographicSize, hw = hh * _cam.aspect;
            foreach (var m in _motes)
            {
                m.x = (float)(rng.NextDouble() * 2 - 1) * hw;
                m.y = (float)(rng.NextDouble() * 2 - 1) * hh;
            }
        }

        void LateUpdate()
        {
            if (_cam == null) return;
            float hh = _cam.orthographicSize, hw = hh * _cam.aspect;
            float dt = Time.deltaTime, t = Time.time;

            // Cover the view with the vignette (sprite is 2.56 world units @100ppu).
            float cover = Mathf.Max(hw, hh) * 2f / 2.56f * 1.05f;
            _vignette.transform.localPosition = new Vector3(0f, 0f, Z);
            _vignette.transform.localScale = Vector3.one * cover;

            foreach (var m in _motes)
            {
                m.x += m.vx * dt;
                m.y += m.vy * dt;
                if (m.y - m.size > hh) { m.y = -hh - m.size; }
                if (m.x > hw + m.size) m.x = -hw - m.size;
                else if (m.x < -hw - m.size) m.x = hw + m.size;

                m.sr.transform.localPosition = new Vector3(m.x, m.y, Z);
                m.sr.transform.localScale = Vector3.one * m.size;
                float a = m.baseAlpha * (0.55f + 0.45f * Mathf.Sin(t * m.twinkle + m.phase));
                m.sr.color = new Color(0.9f, 0.95f, 1f, Mathf.Max(0f, a));
            }
        }
    }
}
