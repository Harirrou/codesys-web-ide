// Wispbloom — keeps a constant world-space width across aspect ratios so
// the orbit field always fits phones from 16:9 to 21:9 in portrait.
using UnityEngine;

namespace Wispbloom.View
{
    [RequireComponent(typeof(Camera))]
    [ExecuteAlways]
    public class CameraWidthFit : MonoBehaviour
    {
        public float designHalfWidth = 1.95f;
        void Awake() => Apply();
        void Update() => Apply();
        void Apply()
        {
            var cam = GetComponent<Camera>();
            if (cam.aspect > 0.0001f)
                cam.orthographicSize = designHalfWidth / cam.aspect;
        }
    }
}
