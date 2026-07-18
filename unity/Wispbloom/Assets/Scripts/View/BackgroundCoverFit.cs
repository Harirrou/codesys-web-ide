// Wispbloom — scales the painted background to cover the camera, anchored
// to the bottom so the glowing flora line is never cropped away.
using UnityEngine;

namespace Wispbloom.View
{
    [RequireComponent(typeof(SpriteRenderer))]
    public class BackgroundCoverFit : MonoBehaviour
    {
        public Camera cam;
        public Wispbloom.Data.ArtBinding art;

        /// <summary>Swap to a world's painted sky ("dawn"|"dusk"|"grove"|"lair").
        /// Falls back to whatever sprite is already set if the file is absent.</summary>
        public void SetWorld(string worldKey)
        {
            var s = PaintedResources.Background(worldKey);
            if (s != null) GetComponent<SpriteRenderer>().sprite = s;
        }

        void LateUpdate()
        {
            var sr = GetComponent<SpriteRenderer>();
            if (sr.sprite == null && art != null) sr.sprite = art.backgroundDawn;
            if (sr.sprite == null || cam == null) return;
            float h = cam.orthographicSize * 2f, w = h * cam.aspect;
            var size = sr.sprite.bounds.size;
            float scale = Mathf.Max(w / size.x, h / size.y);
            transform.localScale = Vector3.one * scale;
            float bottom = cam.transform.position.y - cam.orthographicSize;
            transform.position = new Vector3(0f, bottom + size.y * scale * 0.5f, 5f);
        }
    }
}
