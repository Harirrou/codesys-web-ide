// Wispbloom — flying wisp: body sprite + additive comet trail (TrailRenderer)
// + tiny spark emission. Pooled via simple release/destroy for the slice.
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    public class ProjectileView : MonoBehaviour
    {
        public static ProjectileView Create(Transform parent, ArtBinding art, GameTuning tuning, Projectile pr)
        {
            var go = new GameObject("Projectile");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<ProjectileView>();

            var body = new GameObject("Body").AddComponent<SpriteRenderer>();
            body.transform.SetParent(go.transform, false);
            body.sprite = pr.Pulse ? art.spiritGlow : art.spiritBodies[(int)pr.Color];
            body.sortingOrder = 15;
            float size = 0.32f / Mathf.Max(0.01f, body.sprite.bounds.size.x);
            body.transform.localScale = Vector3.one * size;

            var trail = go.AddComponent<TrailRenderer>();
            trail.time = 0.18f;
            trail.startWidth = 0.16f;
            trail.endWidth = 0.0f;
            trail.material = MaterialLibrary.Additive;
            var tint = pr.Pulse ? Color.white : SpiritTint(pr.Color, pr.Prism);
            trail.startColor = new Color(tint.r, tint.g, tint.b, 0.7f);
            trail.endColor = new Color(tint.r, tint.g, tint.b, 0f);
            trail.numCapVertices = 4;
            return v;
        }

        static Color SpiritTint(SpiritColor c, bool prism)
        {
            if (prism) return Color.HSVToRGB(Time.time * 0.15f % 1f, 0.6f, 1f);
            return c switch
            {
                SpiritColor.Tide => new Color(0.37f, 0.9f, 0.82f),
                SpiritColor.Blossom => new Color(0.95f, 0.49f, 0.81f),
                SpiritColor.Ember => new Color(1f, 0.77f, 0.42f),
                _ => new Color(0.66f, 0.55f, 1f),
            };
        }

        public void Release() => Destroy(gameObject);
    }
}
