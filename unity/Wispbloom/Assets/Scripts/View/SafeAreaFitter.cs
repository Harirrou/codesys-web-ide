// Wispbloom — pins a UI root RectTransform inside the device safe area
// (notches, punch-holes, gesture bars). Attach to each panel root.
using UnityEngine;

namespace Wispbloom.View
{
    [RequireComponent(typeof(RectTransform))]
    public class SafeAreaFitter : MonoBehaviour
    {
        Rect _applied;

        void OnEnable() => Apply();
        void Update() { if (Screen.safeArea != _applied) Apply(); }

        void Apply()
        {
            _applied = Screen.safeArea;
            var rt = (RectTransform)transform;
            Vector2 min = _applied.position;
            Vector2 max = _applied.position + _applied.size;
            min.x /= Screen.width; min.y /= Screen.height;
            max.x /= Screen.width; max.y /= Screen.height;
            rt.anchorMin = min;
            rt.anchorMax = max;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }
    }
}
