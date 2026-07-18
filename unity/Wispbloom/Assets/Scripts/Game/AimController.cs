// Wispbloom — touch-first aiming, matching the prototype exactly:
// drag anywhere = aim from the core toward the pointer; release (>tap
// distance) = shoot; short tap near the core = swap. Draws the dotted
// guide with a pulsing ghost ring at the first spirit the shot would hit.
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.Game
{
    public class AimController : MonoBehaviour
    {
        public GameController game;
        public LineRenderer guide;          // dotted material, additive
        public Transform ghost;             // ring highlight at predicted hit

        Vector2 _downScreen;
        bool _dragging;
        bool _reskinned;
        SpriteRenderer _ghostSr;

        void EnsureSkin()
        {
            if (_reskinned || game == null || game.art == null) return;
            _reskinned = true;
            _ghostSr = ghost != null ? ghost.GetComponent<SpriteRenderer>() : null;
            var ghostSr = _ghostSr;
            if (ghostSr != null && ghostSr.sprite == null) ghostSr.sprite = game.art.spiritGlow;
            if (guide != null && guide.material != null && guide.material.mainTexture == null &&
                game.art.dustMote != null)
                guide.material.mainTexture = game.art.dustMote.texture;
        }

        void Update()
        {
            EnsureSkin();
            if (game.Sim == null || game.Paused || game.Sim.Result != GameResult.Playing)
            {
                SetGuideVisible(false);
                return;
            }

            bool down = false, held = false, up = false;
            Vector2 pos = default;
            if (Input.touchCount > 0)
            {
                var t = Input.GetTouch(0);
                pos = t.position;
                down = t.phase == TouchPhase.Began;
                held = t.phase == TouchPhase.Moved || t.phase == TouchPhase.Stationary;
                up = t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled;
            }
            else
            {
                pos = Input.mousePosition;
                down = Input.GetMouseButtonDown(0);
                held = Input.GetMouseButton(0);
                up = Input.GetMouseButtonUp(0);
            }

            if (down && !PointerOverUi(pos)) { _dragging = true; _downScreen = pos; }
            if (!_dragging) { SetGuideVisible(false); return; }

            Vector3 world = game.cam.ScreenToWorldPoint(new Vector3(pos.x, pos.y, 10f));
            Vector3 local = world - game.fieldRoot.position;

            if (held || down) DrawGuide(local);

            if (up)
            {
                _dragging = false;
                SetGuideVisible(false);
                float tapPx = game.tuning.tapMaxScreenDistancePx * (Screen.dpi > 1f ? Screen.dpi / 160f : 1f);
                if (Vector2.Distance(pos, _downScreen) <= tapPx)
                {
                    // Tap: swap when near the core (1.9x radius, prototype rule).
                    if (local.magnitude < game.Sim.CoreRadius * 1.9f) game.Sim.Swap();
                }
                else
                {
                    game.Sim.Shoot(local.x, local.y);
                }
            }
        }

        void DrawGuide(Vector3 localAim)
        {
            var sim = game.Sim;
            Vector2 dir = new Vector2(localAim.x, localAim.y);
            if (dir.magnitude < 0.04f) { SetGuideVisible(false); return; }
            dir.Normalize();

            // Ray-march to the first hit, same step ratio as the prototype.
            float maxR = sim.Rings[^1].Radius + 0.5f;
            float step = sim.PieceRadius * 0.45f;
            Vector2 hit = dir * maxR;
            bool found = false;
            for (float d = sim.CoreRadius + 0.1f; d < maxR; d += step)
            {
                Vector2 p = dir * d;
                if (sim.FindHit(p.x, p.y).HasValue) { hit = p; found = true; break; }
            }

            // Preview whether this shot will actually burst a run — the guide
            // and target ghost glow green when it scores, white when it won't.
            bool willMatch = false;
            if (found)
            {
                var info = sim.FindHit(hit.x, hit.y);
                if (info.HasValue)
                {
                    float attachA = Mathf.Atan2(hit.y, hit.x);
                    var col = sim.Current.prism ? info.Value.piece.Color : sim.Current.color;
                    willMatch = sim.Current.prism || sim.WouldMatch(info.Value.ring, attachA, col);
                }
            }
            Color tint = willMatch ? new Color(0.45f, 1f, 0.6f) : new Color(1f, 1f, 1f);

            SetGuideVisible(true);
            Vector3 a = game.FieldPoint(dir.x * (sim.CoreRadius + 0.08f), dir.y * (sim.CoreRadius + 0.08f));
            Vector3 b = game.FieldPoint(hit.x, hit.y);
            guide.positionCount = 2;
            guide.SetPosition(0, a);
            guide.SetPosition(1, b);
            guide.startColor = guide.endColor = new Color(tint.r, tint.g, tint.b, 0.6f);
            guide.material.mainTextureScale = new Vector2(Vector3.Distance(a, b) * 3f, 1f);

            ghost.gameObject.SetActive(found);
            if (found)
            {
                ghost.position = b;
                float pulse = 1f + Mathf.Sin(Time.time * 8f) * (willMatch ? 0.22f : 0.12f);
                ghost.localScale = Vector3.one * (sim.PieceRadius * 2.6f * pulse);
                if (_ghostSr != null)
                    _ghostSr.color = new Color(tint.r, tint.g, tint.b, willMatch ? 0.9f : 0.55f);
            }
        }

        void SetGuideVisible(bool v)
        {
            guide.enabled = v;
            if (!v) ghost.gameObject.SetActive(false);
        }

        static bool PointerOverUi(Vector2 screenPos)
        {
            var es = UnityEngine.EventSystems.EventSystem.current;
            if (es == null) return false;
            return es.IsPointerOverGameObject() ||
                   (Input.touchCount > 0 && es.IsPointerOverGameObject(Input.GetTouch(0).fingerId));
        }
    }
}
