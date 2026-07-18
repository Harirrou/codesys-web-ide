// Wispbloom — the Portal shift (World 2). A pair of counter-rotating mint
// swirls linking two rings at one shared angle, joined by a faint dotted
// thread. Pooled to the sim's max of two concurrent portals; each fades out
// over its final second. Wisps that drift across a gate hop rings (handled
// entirely in the sim); this view only draws the gates.
using System.Collections.Generic;
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    public class PortalView : MonoBehaviour
    {
        class Gate
        {
            public GameObject root;
            public SpriteRenderer a, b;
            public LineRenderer link;
        }

        ArtBinding _art;
        readonly List<Gate> _pool = new();
        static readonly Color Mint = new Color(0.5f, 1f, 0.85f);

        public static PortalView Create(Transform parent, ArtBinding art)
        {
            var go = new GameObject("Portals");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<PortalView>();
            v._art = art;
            for (int i = 0; i < 2; i++) v._pool.Add(v.Build());
            return v;
        }

        Gate Build()
        {
            var root = new GameObject("Portal");
            root.transform.SetParent(transform, false);

            SpriteRenderer Swirl(string name)
            {
                var sr = new GameObject(name).AddComponent<SpriteRenderer>();
                sr.transform.SetParent(root.transform, false);
                sr.sprite = _art.sparkle != null ? _art.sparkle : _art.spiritGlow;
                sr.material = MaterialLibrary.Additive;
                sr.sortingOrder = 9;
                sr.color = Mint;
                return sr;
            }

            var link = new GameObject("Link").AddComponent<LineRenderer>();
            link.transform.SetParent(root.transform, false);
            link.material = new Material(MaterialLibrary.Additive);
            if (_art.dustMote != null) link.material.mainTexture = _art.dustMote.texture;
            link.textureMode = LineTextureMode.Tile;
            link.useWorldSpace = true;
            link.startWidth = link.endWidth = 0.05f;
            link.positionCount = 2;
            link.sortingOrder = 7;

            var g = new Gate { root = root, a = Swirl("GateA"), b = Swirl("GateB"), link = link };
            root.SetActive(false);
            return g;
        }

        public void Sync(Vector3 fieldOrigin, GameSim sim)
        {
            var portals = sim.Portals;
            for (int i = 0; i < _pool.Count; i++)
            {
                var g = _pool[i];
                if (i >= portals.Count) { g.root.SetActive(false); continue; }
                var po = portals[i];
                g.root.SetActive(true);

                float fade = Mathf.Clamp01(po.Remaining);      // final second fades out
                float spin = Time.time * 220f;
                Place(g.a, fieldOrigin, po.RingA.Radius, po.Angle, spin, sim.PieceRadius, fade);
                Place(g.b, fieldOrigin, po.RingB.Radius, po.Angle, -spin, sim.PieceRadius, fade);

                Vector3 pa = Ring(fieldOrigin, po.RingA.Radius, po.Angle);
                Vector3 pb = Ring(fieldOrigin, po.RingB.Radius, po.Angle);
                g.link.SetPosition(0, pa);
                g.link.SetPosition(1, pb);
                g.link.startColor = g.link.endColor = new Color(Mint.r, Mint.g, Mint.b, 0.32f * fade);
                g.link.material.mainTextureScale = new Vector2(Vector3.Distance(pa, pb) * 4f, 1f);
            }
        }

        public void Hide()
        {
            foreach (var g in _pool) g.root.SetActive(false);
        }

        static Vector3 Ring(Vector3 origin, float r, float a)
            => origin + new Vector3(Mathf.Cos(a) * r, Mathf.Sin(a) * r, 0f);

        static void Place(SpriteRenderer sr, Vector3 origin, float r, float a, float spin, float pieceR, float fade)
        {
            sr.transform.position = Ring(origin, r, a);
            sr.transform.localRotation = Quaternion.Euler(0, 0, spin);
            sr.transform.localScale = Vector3.one * (pieceR * 3.4f);
            sr.color = new Color(Mint.r, Mint.g, Mint.b, 0.9f * fade);
        }
    }
}
