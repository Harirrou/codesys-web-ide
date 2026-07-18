// Wispbloom — the Umbra Serpent (boss level 10). Owns ALL boss-segment
// rendering: a translucent body ribbon threaded through the living shell
// segments on the boss ring, a colored glow shell at each segment (its
// current weak-point color, pulsing when cracked to one hp), and a head
// marker on the first alive segment. Driven purely by sim state — the
// GameController skips normal SpiritViews for IsBoss pieces.
using System.Collections.Generic;
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    public class SerpentView : MonoBehaviour
    {
        LineRenderer _body;
        SpriteRenderer _head;
        ArtBinding _art;
        readonly Dictionary<int, SpriteRenderer> _shells = new();
        readonly List<int> _retire = new();
        readonly List<Piece> _segs = new();
        readonly List<Vector3> _pts = new();

        static readonly Color[] Tint =
        {
            new Color(0.37f, 0.90f, 0.82f), new Color(0.95f, 0.49f, 0.81f),
            new Color(1.00f, 0.77f, 0.42f), new Color(0.66f, 0.55f, 1.00f),
        };

        public static SerpentView Create(Transform parent, ArtBinding art)
        {
            var go = new GameObject("Serpent");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<SerpentView>();
            v._art = art;

            var bodyGo = new GameObject("Body");
            bodyGo.transform.SetParent(go.transform, false);
            v._body = bodyGo.AddComponent<LineRenderer>();
            v._body.material = MaterialLibrary.Additive;
            v._body.textureMode = LineTextureMode.Tile;
            v._body.useWorldSpace = true;
            v._body.numCapVertices = 4;
            v._body.startColor = new Color(0.34f, 0.17f, 0.46f, 0.9f);
            v._body.endColor = new Color(0.18f, 0.10f, 0.32f, 0.45f);
            v._body.startWidth = 0.42f;
            v._body.endWidth = 0.16f;
            v._body.sortingOrder = 8;
            v._body.positionCount = 0;

            v._head = new GameObject("Head").AddComponent<SpriteRenderer>();
            v._head.transform.SetParent(go.transform, false);
            v._head.sprite = art.spiritGlow;
            v._head.material = MaterialLibrary.Additive;
            v._head.sortingOrder = 12;
            v._head.color = new Color(0.72f, 0.42f, 0.92f, 0.9f);
            v._head.gameObject.SetActive(false);
            return v;
        }

        public void Sync(Vector3 fieldOrigin, GameSim sim)
        {
            var ring = sim.BossRing;
            if (ring == null) { Hide(); return; }

            _segs.Clear();
            foreach (var p in ring.Pieces) if (p.IsBoss) _segs.Add(p);
            _segs.Sort((a, b) => a.Angle.CompareTo(b.Angle));

            // Retire shells whose segment has been cracked open and destroyed.
            _retire.Clear();
            foreach (var kv in _shells)
            {
                bool alive = false;
                foreach (var s in _segs) if (s.Id == kv.Key) { alive = true; break; }
                if (!alive) _retire.Add(kv.Key);
            }
            foreach (int id in _retire)
            {
                if (_shells[id] != null) Destroy(_shells[id].gameObject);
                _shells.Remove(id);
            }

            if (_segs.Count == 0) { Hide(); return; }

            float r = ring.Radius;
            foreach (var seg in _segs)
            {
                if (!_shells.TryGetValue(seg.Id, out var sr) || sr == null)
                {
                    sr = new GameObject("Shell").AddComponent<SpriteRenderer>();
                    sr.transform.SetParent(transform, false);
                    sr.sprite = _art.spiritGlow;
                    sr.material = MaterialLibrary.Additive;
                    sr.sortingOrder = 11;
                    _shells[seg.Id] = sr;
                }
                Vector3 at = fieldOrigin + new Vector3(Mathf.Cos(seg.Angle) * r, Mathf.Sin(seg.Angle) * r, 0f);
                sr.transform.position = at;
                var c = Tint[(int)seg.Color];
                bool cracked = seg.BossHp <= 1;
                float pulse = cracked ? 0.5f + 0.5f * Mathf.Sin(Time.time * 9f) : 1f;
                sr.color = new Color(c.r, c.g, c.b, 0.7f * pulse + 0.2f);
                sr.transform.localScale = Vector3.one * (sim.PieceRadius * (cracked ? 3.0f : 3.7f));
            }

            // Body ribbon: a smooth arc through all alive segments following the
            // ring. A single strand keeps it to one LineRenderer; when the
            // serpent is broken into pieces they share one faint thread — a
            // deliberate simplification of the prototype's per-gap strands.
            _body.enabled = true;
            _pts.Clear();
            int n = _segs.Count, sub = 5;
            for (int i = 0; i < n - 1; i++)
            {
                float a0 = _segs[i].Angle, a1 = _segs[i + 1].Angle;
                for (int k = 0; k < sub; k++)
                {
                    float a = Mathf.Lerp(a0, a1, k / (float)sub);
                    _pts.Add(fieldOrigin + new Vector3(Mathf.Cos(a) * r, Mathf.Sin(a) * r, 0f));
                }
            }
            _pts.Add(fieldOrigin + new Vector3(Mathf.Cos(_segs[n - 1].Angle) * r, Mathf.Sin(_segs[n - 1].Angle) * r, 0f));
            _body.positionCount = _pts.Count;
            for (int i = 0; i < _pts.Count; i++) _body.SetPosition(i, _pts[i]);

            _head.gameObject.SetActive(true);
            _head.transform.position = _pts[0];
            _head.transform.localScale = Vector3.one * (sim.PieceRadius * 4.2f);
        }

        public void Hide()
        {
            if (_body != null) _body.enabled = false;
            if (_head != null) _head.gameObject.SetActive(false);
            if (_shells.Count > 0)
            {
                foreach (var kv in _shells) if (kv.Value != null) Destroy(kv.Value.gameObject);
                _shells.Clear();
            }
        }
    }
}
