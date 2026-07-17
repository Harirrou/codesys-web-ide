// Wispbloom — checkpoint instrumentation: FPS / frame-time overlay
// (three-finger tap or F1 toggles) and a screenshot tool (two-finger tap
// or F2 saves a PNG to persistentDataPath). Used for the vertical-slice
// performance measurements on device.
using UnityEngine;
using UnityEngine.UI;

namespace Wispbloom.View
{
    public class PerformanceHud : MonoBehaviour
    {
        public Text label;
        float _accum;
        int _frames;
        float _worst;
        bool _visible;

        void Update()
        {
            bool toggle = Input.GetKeyDown(KeyCode.F1) ||
                (Input.touchCount == 3 && Input.GetTouch(2).phase == TouchPhase.Began);
            if (toggle) { _visible = !_visible; label.enabled = _visible; _worst = 0f; }

            bool shot = Input.GetKeyDown(KeyCode.F2) ||
                (Input.touchCount == 2 && Input.GetTouch(1).phase == TouchPhase.Began &&
                 Input.GetTouch(0).phase != TouchPhase.Began);
            if (shot)
            {
                string file = $"wispbloom-{System.DateTime.Now:HHmmss}.png";
                ScreenCapture.CaptureScreenshot(file);
                Debug.Log($"Screenshot saved: {Application.persistentDataPath}/{file}");
            }

            if (!_visible) return;
            _accum += Time.unscaledDeltaTime;
            _frames++;
            _worst = Mathf.Max(_worst, Time.unscaledDeltaTime);
            if (_accum >= 0.5f)
            {
                float avgMs = _accum / _frames * 1000f;
                label.text = $"{_frames / _accum:0} fps · {avgMs:0.0} ms avg · {_worst * 1000f:0.0} ms worst";
                _accum = 0f; _frames = 0; _worst = 0f;
            }
        }
    }
}
