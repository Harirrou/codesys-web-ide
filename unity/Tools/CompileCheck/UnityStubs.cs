// Minimal Unity API stubs — signature-level only, for compiling the
// Wispbloom runtime scripts outside Unity. Never shipped; verification only.
#pragma warning disable 67
using System;
using System.Collections;
using System.Collections.Generic;

namespace UnityEngine
{
    public struct Vector2
    {
        public float x, y;
        public Vector2(float x, float y) { this.x = x; this.y = y; }
        public static Vector2 zero => default;
        public static Vector2 one => new Vector2(1, 1);
        public static Vector2 up => new Vector2(0, 1);
        public float magnitude => (float)Math.Sqrt(x * x + y * y);
        public float sqrMagnitude => x * x + y * y;
        public void Normalize() { var m = magnitude; if (m > 1e-6f) { x /= m; y /= m; } }
        public static float Distance(Vector2 a, Vector2 b) => (a - b).magnitude;
        public static Vector2 operator +(Vector2 a, Vector2 b) => new Vector2(a.x + b.x, a.y + b.y);
        public static Vector2 operator -(Vector2 a, Vector2 b) => new Vector2(a.x - b.x, a.y - b.y);
        public static Vector2 operator *(Vector2 a, float d) => new Vector2(a.x * d, a.y * d);
        public static Vector2 operator /(Vector2 a, float d) => new Vector2(a.x / d, a.y / d);
        public static implicit operator Vector3(Vector2 v) => new Vector3(v.x, v.y, 0);
    }

    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float x, float y, float z = 0) { this.x = x; this.y = y; this.z = z; }
        public static Vector3 zero => default;
        public static Vector3 one => new Vector3(1, 1, 1);
        public static Vector3 up => new Vector3(0, 1, 0);
        public float magnitude => (float)Math.Sqrt(x * x + y * y + z * z);
        public static float Distance(Vector3 a, Vector3 b) => (a - b).magnitude;
        public static Vector3 operator +(Vector3 a, Vector3 b) => new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
        public static Vector3 operator -(Vector3 a, Vector3 b) => new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
        public static Vector3 operator *(Vector3 a, float d) => new Vector3(a.x * d, a.y * d, a.z * d);
        public static Vector3 operator /(Vector3 a, float d) => new Vector3(a.x / d, a.y / d, a.z / d);
        public static implicit operator Vector2(Vector3 v) => new Vector2(v.x, v.y);
    }

    public struct Color
    {
        public float r, g, b, a;
        public Color(float r, float g, float b, float a = 1f) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static Color white => new Color(1, 1, 1);
        public static Color red => new Color(1, 0, 0);
        public static Color HSVToRGB(float h, float s, float v) => white;
        public static Color Lerp(Color x, Color y, float t) => x;
    }

    public struct Vector4
    {
        public Vector4(float x, float y, float z, float w) { }
        public static Vector4 zero => default;
    }

    public struct Quaternion
    {
        public static Quaternion Euler(float x, float y, float z) => default;
    }

    public struct Rect
    {
        public Vector2 position, size;
        public Rect(float x, float y, float w, float h) { position = default; size = default; }
        public static bool operator ==(Rect a, Rect b) => true;
        public static bool operator !=(Rect a, Rect b) => false;
        public override bool Equals(object o) => true;
        public override int GetHashCode() => 0;
    }

    public struct Keyframe
    {
        public Keyframe(float time, float value) { }
    }

    public class AnimationCurve
    {
        public AnimationCurve(params Keyframe[] keys) { }
        public static AnimationCurve EaseInOut(float ts, float vs, float te, float ve) => new AnimationCurve();
        public float Evaluate(float t) => t;
    }

    public class Gradient
    {
        public void SetKeys(GradientColorKey[] c, GradientAlphaKey[] a) { }
    }
    public struct GradientColorKey { public GradientColorKey(Color c, float t) { } }
    public struct GradientAlphaKey { public GradientAlphaKey(float a, float t) { } }

    public static class Mathf
    {
        public const float PI = (float)Math.PI;
        public static float Sin(float f) => (float)Math.Sin(f);
        public static float Cos(float f) => (float)Math.Cos(f);
        public static float Atan2(float y, float x) => (float)Math.Atan2(y, x);
        public static float Sqrt(float f) => (float)Math.Sqrt(f);
        public static float Abs(float f) => Math.Abs(f);
        public static int Abs(int i) => Math.Abs(i);
        public static float Min(float a, float b) => Math.Min(a, b);
        public static float Max(float a, float b) => Math.Max(a, b);
        public static int Min(int a, int b) => Math.Min(a, b);
        public static int Max(int a, int b) => Math.Max(a, b);
        public static float Clamp(float v, float a, float b) => Math.Clamp(v, a, b);
        public static int Clamp(int v, int a, int b) => Math.Clamp(v, a, b);
        public static float Clamp01(float v) => Math.Clamp(v, 0f, 1f);
        public static float Lerp(float a, float b, float t) => a + (b - a) * Clamp01(t);
        public static float PingPong(float t, float len) => len - Math.Abs(t % (2 * len) - len);
        public static float Sign(float f) => Math.Sign(f);
        public static int FloorToInt(float f) => (int)Math.Floor(f);
        public static int CeilToInt(float f) => (int)Math.Ceiling(f);
        public static float Pow(float b, float e) => (float)Math.Pow(b, e);
        public static float Exp(float f) => (float)Math.Exp(f);
        public static float SmoothStep(float a, float b, float t) => Lerp(a, b, t);
    }

    public static class Random
    {
        public static float value => 0.5f;
        public static Vector2 insideUnitCircle => default;
    }

    public static class Time
    {
        public static float time => 0f;
        public static float deltaTime => 0.016f;
        public static float unscaledTime => 0f;
        public static float unscaledDeltaTime => 0.016f;
        public static float timeScale { get; set; }
    }

    public static class Screen
    {
        public static int width => 1080;
        public static int height => 2340;
        public static float dpi => 440f;
        public static Rect safeArea => default;
    }

    public class Object
    {
        public string name { get; set; }
        public static void Destroy(Object o) { }
        public static void DestroyImmediate(Object o) { }
        public static T[] FindObjectsByType<T>(FindObjectsInactive inactive, FindObjectsSortMode sort) => new T[0];
        public static implicit operator bool(Object o) => o != null;
    }

    public class Component : Object
    {
        public GameObject gameObject { get; }
        public Transform transform { get; }
        public T GetComponent<T>() => default;
        public T GetComponentInChildren<T>() => default;
    }

    public class Behaviour : Component { public bool enabled { get; set; } }

    public class MonoBehaviour : Behaviour
    {
        public Coroutine StartCoroutine(IEnumerator routine) => null;
        public void StopCoroutine(Coroutine c) { }
    }

    public class Coroutine { }

    public class GameObject : Object
    {
        public GameObject() { }
        public GameObject(string name, params Type[] components) { }
        public Transform transform { get; }
        public string tag { get; set; }
        public T AddComponent<T>() where T : Component => default;
        public T GetComponent<T>() => default;
        public void SetActive(bool active) { }
        public bool activeSelf => true;
    }

    public class Transform : Component, IEnumerable
    {
        public Vector3 position { get; set; }
        public Vector3 localPosition { get; set; }
        public Vector3 localScale { get; set; }
        public Quaternion localRotation { get; set; }
        public Transform parent { get; }
        public void SetParent(Transform p, bool worldPositionStays) { }
        public void SetSiblingIndex(int i) { }
        public int GetSiblingIndex() => 0;
        public void SetAsFirstSibling() { }
        public IEnumerator GetEnumerator() { yield break; }
        public void Translate(Vector3 v) { }
        public void Rotate(float x, float y, float z) { }
    }

    public class RectTransform : Transform
    {
        public Vector2 anchorMin { get; set; }
        public Vector2 anchorMax { get; set; }
        public Vector2 offsetMin { get; set; }
        public Vector2 offsetMax { get; set; }
        public Vector2 anchoredPosition { get; set; }
        public Vector2 sizeDelta { get; set; }
    }

    public class Camera : Behaviour
    {
        public bool orthographic { get; set; }
        public float orthographicSize { get; set; }
        public float aspect => 0.46f;
        public Color backgroundColor { get; set; }
        public CameraClearFlags clearFlags { get; set; }
        public Vector3 ScreenToWorldPoint(Vector3 v) => v;
        public Vector3 WorldToScreenPoint(Vector3 v) => v;
    }
    public enum CameraClearFlags { SolidColor }

    public class Texture : Object
    {
        public TextureWrapMode wrapMode { get; set; }
        public FilterMode filterMode { get; set; }
    }
    public class Texture2D : Texture
    {
        public Texture2D(int w, int h, TextureFormat f, bool mip) { }
        public int width => 0; public int height => 0;
        public void SetPixel(int x, int y, Color c) { }
        public void SetPixels(Color[] c) { }
        public void Apply() { }
        public byte[] EncodeToPNG() => null;
    }
    public enum TextureFormat { RGBA32 }
    public enum TextureWrapMode { Clamp, Repeat }

    public class Sprite : Object
    {
        public Bounds bounds => default;
        public Texture2D texture => null;
        public static Sprite Create(Texture2D tex, Rect rect, Vector2 pivot, float ppu,
            uint extrude, SpriteMeshType meshType, Vector4 border) => new Sprite();
    }
    public enum SpriteMeshType { FullRect }
    public enum FilterMode { Bilinear }
    public enum FindObjectsInactive { Include }
    public enum FindObjectsSortMode { None }
    public struct Bounds { public Vector3 size => new Vector3(1, 1, 1); }

    public class Shader : Object { public static Shader Find(string name) => null; }

    public class Material : Object
    {
        public Material(Shader s) { }
        public Material(Material src) { }
        public Texture mainTexture { get; set; }
        public Vector2 mainTextureScale { get; set; }
        public void SetFloat(string n, float v) { }
        public float GetFloat(string n) => 0f;
        public void SetColor(string n, Color c) { }
    }

    public class Renderer : Component
    {
        public bool enabled { get; set; }
        public Material material { get; set; }
        public Material sharedMaterial { get; set; }
        public int sortingOrder { get; set; }
    }

    public class SpriteRenderer : Renderer
    {
        public Sprite sprite { get; set; }
        public Color color { get; set; }
        public SpriteDrawMode drawMode { get; set; }
    }
    public enum SpriteDrawMode { Simple }

    public class LineRenderer : Renderer
    {
        public int positionCount { get; set; }
        public void SetPosition(int i, Vector3 p) { }
        public LineTextureMode textureMode { get; set; }
        public bool useWorldSpace { get; set; }
        public int numCapVertices { get; set; }
        public float startWidth { get; set; }
        public float endWidth { get; set; }
        public Color startColor { get; set; }
        public Color endColor { get; set; }
    }
    public enum LineTextureMode { Tile }

    public class TrailRenderer : Renderer
    {
        public float time { get; set; }
        public float startWidth { get; set; }
        public float endWidth { get; set; }
        public Color startColor { get; set; }
        public Color endColor { get; set; }
        public int numCapVertices { get; set; }
    }

    public class MeshFilter : Component { public Mesh sharedMesh { get; set; } }
    public class MeshRenderer : Renderer { }
    public class Mesh : Object
    {
        public Vector3[] vertices { get; set; }
        public Vector2[] uv { get; set; }
        public int[] triangles { get; set; }
        public void RecalculateBounds() { }
    }

    public sealed class ParticleSystem : Component
    {
        public struct MinMaxCurve { public MinMaxCurve(float min, float max) { } public static implicit operator MinMaxCurve(float v) => default; }
        public struct MainModule
        {
            public bool playOnAwake { set { } }
            public bool loop { set { } }
            public MinMaxCurve startLifetime { set { } }
            public MinMaxCurve startSpeed { set { } }
            public MinMaxCurve startSize { set { } }
            public Color startColor { set { } }
            public int maxParticles { set { } }
            public ParticleSystemSimulationSpace simulationSpace { set { } }
        }
        public struct EmissionModule { public float rateOverTime { set { } } }
        public struct ShapeModule
        {
            public ParticleSystemShapeType shapeType { set { } }
            public float radius { set { } }
            public float radiusThickness { set { } }
        }
        public struct ColorOverLifetimeModule
        {
            public bool enabled { set { } }
            public Gradient color { set { } }
        }
        public struct TextureSheetAnimationModule { }
        public struct EmitParams
        {
            public Vector3 position { set { } }
            public Color startColor { set { } }
        }
        public MainModule main => default;
        public EmissionModule emission => default;
        public ShapeModule shape => default;
        public ColorOverLifetimeModule colorOverLifetime => default;
        public TextureSheetAnimationModule textureSheetAnimation => default;
        public void Emit(EmitParams p, int count) { }
    }
    public enum ParticleSystemSimulationSpace { Local, World }
    public enum ParticleSystemShapeType { Circle }
    public class ParticleSystemRenderer : Renderer { public ParticleSystemRenderMode renderMode { get; set; } }
    public enum ParticleSystemRenderMode { Billboard }

    public class AudioClip : Object
    {
        public static AudioClip Create(string name, int lengthSamples, int channels, int frequency, bool stream) => new AudioClip();
        public void SetData(float[] data, int offset) { }
    }
    public class AudioListener : Behaviour { }
    public class AudioSource : Behaviour
    {
        public AudioClip clip { get; set; }
        public bool loop { get; set; }
        public float volume { get; set; }
        public void Play() { }
        public void PlayOneShot(AudioClip clip, float volume) { }
    }

    public class Font : Object { }
    public static class Resources
    {
        public static T GetBuiltinResource<T>(string path) where T : Object => default;
        public static T Load<T>(string path) where T : Object => default;
    }

    public static class Application
    {
        public static string persistentDataPath => "/tmp";
        public static bool isPlaying => false;
        public static bool isEditor => true;
    }

    public static class JsonUtility
    {
        public static string ToJson(object o) => "";
        public static T FromJson<T>(string s) => default;
    }

    public static class ScreenCapture { public static void CaptureScreenshot(string filename) { } }

    public class GUIStyle
    {
        public int fontSize { get; set; }
        public bool wordWrap { get; set; }
        public GUIStyleState normal => new GUIStyleState();
    }
    public class GUIStyleState { public Color textColor { get; set; } }
    public static class GUI { public static void Label(Rect r, string text, GUIStyle s) { } }

    public static class Debug
    {
        public static void Log(object m) { }
        public static void LogWarning(object m) { }
        public static void LogError(object m) { }
    }

    public enum KeyCode { Escape, F1, F2 }
    public enum TouchPhase { Began, Moved, Stationary, Ended, Canceled }
    public struct Touch
    {
        public Vector2 position => default;
        public TouchPhase phase => default;
        public int fingerId => 0;
    }
    public static class Input
    {
        public static int touchCount => 0;
        public static Touch GetTouch(int i) => default;
        public static Vector3 mousePosition => default;
        public static bool GetMouseButton(int b) => false;
        public static bool GetMouseButtonDown(int b) => false;
        public static bool GetMouseButtonUp(int b) => false;
        public static bool GetKeyDown(KeyCode k) => false;
    }

    public class ScriptableObject : Object { public static T CreateInstance<T>() where T : ScriptableObject => default; }

    public class CreateAssetMenuAttribute : Attribute { public string menuName; public string fileName; }
    public class TooltipAttribute : Attribute { public TooltipAttribute(string t) { } }
    public class HeaderAttribute : Attribute { public HeaderAttribute(string t) { } }
    public class TextAreaAttribute : Attribute { }
    public class RangeAttribute : Attribute { public RangeAttribute(float min, float max) { } }
    public class RequireComponentAttribute : Attribute { public RequireComponentAttribute(Type t) { } }
    public class ExecuteAlwaysAttribute : Attribute { }
    public class SerializeField : Attribute { }
}

namespace UnityEngine.UI
{
    public class Graphic : Behaviour
    {
        public Color color { get; set; }
        public bool raycastTarget { get; set; }
        public RectTransform rectTransform => null;
    }
    public class MaskableGraphic : Graphic { }
    public class Text : MaskableGraphic
    {
        public string text { get; set; }
        public Font font { get; set; }
        public int fontSize { get; set; }
        public FontStyle fontStyle { get; set; }
        public TextAnchor alignment { get; set; }
        public HorizontalWrapMode horizontalOverflow { get; set; }
        public VerticalWrapMode verticalOverflow { get; set; }
    }
    public class Image : MaskableGraphic
    {
        public Sprite sprite { get; set; }
        public Type type { get; set; }
        public FillMethod fillMethod { get; set; }
        public float fillAmount { get; set; }
        public enum Type { Simple, Sliced, Filled }
        public enum FillMethod { Radial360 }
    }
    public class Button : Behaviour
    {
        public ButtonClickedEvent onClick => new ButtonClickedEvent();
        public ColorBlock colors { get; set; }
        public bool interactable { get; set; }
        public class ButtonClickedEvent : Events.UnityEvent { }
    }
    public struct ColorBlock
    {
        public Color highlightedColor { get; set; }
        public Color pressedColor { get; set; }
    }
    public class Shadow : Behaviour
    {
        public Color effectColor { get; set; }
        public Vector2 effectDistance { get; set; }
    }
    public class CanvasScaler : Behaviour
    {
        public ScaleMode uiScaleMode { get; set; }
        public Vector2 referenceResolution { get; set; }
        public float matchWidthOrHeight { get; set; }
        public enum ScaleMode { ScaleWithScreenSize }
    }
    public class GraphicRaycaster : Behaviour { }
}

namespace UnityEngine
{
    public enum FontStyle { Normal, Bold }
    public enum TextAnchor { MiddleCenter, MiddleLeft, MiddleRight }
    public enum HorizontalWrapMode { Wrap, Overflow }
    public enum VerticalWrapMode { Truncate, Overflow }
    public class Canvas : Behaviour { public RenderMode renderMode { get; set; } }
    public enum RenderMode { ScreenSpaceOverlay }
}

namespace UnityEngine.Events
{
    public class UnityEvent { public void AddListener(UnityAction a) { } }
    public delegate void UnityAction();
}

namespace UnityEngine.EventSystems
{
    public class EventSystem : MonoBehaviour
    {
        public static EventSystem current => null;
        public bool IsPointerOverGameObject() => false;
        public bool IsPointerOverGameObject(int pointerId) => false;
    }
    public class StandaloneInputModule : MonoBehaviour { }
}

namespace UnityEngine.Rendering
{
    public class VolumeProfile : ScriptableObject
    {
        public bool TryGet<T>(out T comp) { comp = default; return false; }
        public T Add<T>(bool overrides) => default;
    }
}

namespace UnityEngine.Rendering.Universal
{
    public class Light2D : MonoBehaviour
    {
        public enum LightType { Global, Point }
        public LightType lightType { get; set; }
        public Color color { get; set; }
        public float intensity { get; set; }
        public float pointLightOuterRadius { get; set; }
    }
}
