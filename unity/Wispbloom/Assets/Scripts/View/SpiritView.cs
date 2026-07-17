// Wispbloom — one living spirit: body sprite + additive halo, driven purely
// by sim state. Breathing, blinking, squash-recovery and dissolve are
// presentation-only; sprites come exclusively from ArtBinding.
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    public class SpiritView : MonoBehaviour
    {
        static readonly Color[] Tint =
        {
            new Color(0.37f, 0.90f, 0.82f), // Tide
            new Color(0.95f, 0.49f, 0.81f), // Blossom
            new Color(1.00f, 0.77f, 0.42f), // Ember
            new Color(0.66f, 0.55f, 1.00f), // Dusk
        };

        SpriteRenderer _body;
        SpriteRenderer _halo;
        Material _dissolveMat;
        GameTuning _tuning;
        float _blinkPhase;
        bool _corrupt;

        public static SpiritView Create(Transform parent, ArtBinding art, GameTuning tuning,
                                        SpiritColor color, bool corrupt, bool prism)
        {
            var go = new GameObject("Spirit");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<SpiritView>();
            v._tuning = tuning;
            v._corrupt = corrupt;
            v._blinkPhase = Random.value * 6.28f;

            var halo = new GameObject("Halo").AddComponent<SpriteRenderer>();
            halo.transform.SetParent(go.transform, false);
            halo.sprite = art.spiritGlow;
            halo.sortingOrder = 10;
            halo.color = new Color(Tint[(int)color].r, Tint[(int)color].g, Tint[(int)color].b,
                                   corrupt ? 0.18f : 0.4f);
            halo.material = MaterialLibrary.Additive;
            halo.transform.localScale = Vector3.one * 2.3f;
            v._halo = halo;

            var body = new GameObject("Body").AddComponent<SpriteRenderer>();
            body.transform.SetParent(go.transform, false);
            body.sprite = art.spiritBodies[(int)color];
            body.sortingOrder = 11;
            if (corrupt) body.color = new Color(0.55f, 0.45f, 0.7f);
            v._body = body;
            v._dissolveMat = MaterialLibrary.NewDissolve();
            return v;
        }

        /// <summary>Follow the simulation piece; all liveliness layers on top.</summary>
        public void Sync(Vector3 fieldOrigin, Ring ring, Piece p, GameSim sim)
        {
            float radius = sim.PieceRadiusOn(ring, p);
            transform.position = fieldOrigin +
                new Vector3(Mathf.Cos(p.Angle) * radius, Mathf.Sin(p.Angle) * radius, 0f);

            float pop = _tuning.popIn.Evaluate(p.Scale);
            float breath = _tuning.spiritBreath.Evaluate(Mathf.PingPong(p.Wobble * 0.35f, 1f));
            // Squash & stretch along travel: subtle scale on the angular axis.
            float squash = Mathf.Lerp(1f, 0.9f, Mathf.Abs(p.Impulse) * 0.4f);
            float size = sim.PieceRadius * 2f / SpriteWorldSize();
            transform.localScale = new Vector3(size * pop * breath, size * pop * squash * breath, 1f);

            // Chain-hot spirits glow hotter — clear "about to cascade" read.
            _halo.color = new Color(_halo.color.r, _halo.color.g, _halo.color.b,
                (_corrupt ? 0.18f : 0.4f) + (p.ChainT > 0 ? 0.25f : 0f));

            // Blink: brief eyelid via material property (shader scales eye row).
            _blinkPhase = p.Wobble;
        }

        float SpriteWorldSize()
            => _body.sprite != null ? _body.sprite.bounds.size.x : 1f;

        /// <summary>Burst removal: swap to the dissolve material and fade out.</summary>
        public void Dissolve()
        {
            _body.material = _dissolveMat;
            StartCoroutine(DissolveRoutine());
        }

        System.Collections.IEnumerator DissolveRoutine()
        {
            float t = 0f;
            while (t < 0.35f)
            {
                t += Time.deltaTime;
                _dissolveMat.SetFloat("_Dissolve", t / 0.35f);
                _halo.color = new Color(_halo.color.r, _halo.color.g, _halo.color.b,
                                        Mathf.Lerp(0.5f, 0f, t / 0.35f));
                yield return null;
            }
            Destroy(gameObject);
        }
    }
}
