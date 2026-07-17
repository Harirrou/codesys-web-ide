// Minimal UnityEditor API stubs for compile-checking the Editor scripts.
using System;
using UnityEngine;

namespace UnityEditor
{
    public class MenuItem : Attribute { public MenuItem(string path) { } }
    public class InitializeOnLoadAttribute : Attribute { }
    public class InitializeOnLoadMethodAttribute : Attribute { }

    public static class AssetDatabase
    {
        public static T LoadAssetAtPath<T>(string path) where T : UnityEngine.Object => default;
        public static void CreateAsset(UnityEngine.Object asset, string path) { }
        public static void Refresh() { }
        public static void SaveAssets() { }
    }

    public class AssetImporter { public static AssetImporter GetAtPath(string path) => null; }

    public class TextureImporter : AssetImporter
    {
        public TextureImporterType textureType { get; set; }
        public float spritePixelsPerUnit { get; set; }
        public bool mipmapEnabled { get; set; }
        public bool alphaIsTransparency { get; set; }
        public TextureWrapMode wrapMode { get; set; }
        public void ReadTextureSettings(TextureImporterSettings s) { }
        public void SetTextureSettings(TextureImporterSettings s) { }
        public void SaveAndReimport() { }
    }
    public enum TextureImporterType { Sprite }
    public class TextureImporterSettings { public int spriteAlignment { get; set; } }
    public enum SpriteAlignment { BottomCenter }

    public static class EditorUtility
    {
        public static void SetDirty(UnityEngine.Object o) { }
        public static bool DisplayDialog(string t, string m, string ok) => true;
        public static void DisplayProgressBar(string t, string i, float p) { }
        public static void ClearProgressBar() { }
    }

    public static class EditorApplication { public static Action delayCall; }

    public static class PlayerSettings
    {
        public static string companyName { get; set; }
        public static string productName { get; set; }
        public static UIOrientation defaultInterfaceOrientation { get; set; }
        public static bool allowedAutorotateToPortrait { get; set; }
        public static bool allowedAutorotateToPortraitUpsideDown { get; set; }
        public static bool allowedAutorotateToLandscapeLeft { get; set; }
        public static bool allowedAutorotateToLandscapeRight { get; set; }
        public static void SetApplicationIdentifier(BuildTargetGroup g, string id) { }
        public static class Android { public static AndroidSdkVersions minSdkVersion { get; set; } }
    }
    public enum UIOrientation { Portrait }
    public enum BuildTargetGroup { Android }
    public enum AndroidSdkVersions { AndroidApiLevel26 }

    public class EditorBuildSettingsScene { public EditorBuildSettingsScene(string path, bool enabled) { } }
    public static class EditorBuildSettings { public static EditorBuildSettingsScene[] scenes { get; set; } }

    namespace Events
    {
        public static class UnityEventTools
        {
            public static void AddVoidPersistentListener(UnityEngine.Events.UnityEvent e, UnityEngine.Events.UnityAction a) { }
        }
    }
}

namespace UnityEditor.SceneManagement
{
    public static class EditorSceneManager
    {
        public static UnityEngine.SceneManagement.Scene NewScene(NewSceneSetup s, NewSceneMode m) => default;
        public static bool SaveScene(UnityEngine.SceneManagement.Scene s, string path) => true;
        public static UnityEngine.SceneManagement.Scene OpenScene(string path) => default;
    }
    public enum NewSceneSetup { EmptyScene }
    public enum NewSceneMode { Single }
}

namespace UnityEngine.SceneManagement { public struct Scene { } }

namespace UnityEngine.Rendering
{
    public static class GraphicsSettings { public static object defaultRenderPipeline { get; set; } }
}

namespace UnityEngine.Rendering.Universal
{
    public class ScriptableRendererData : ScriptableObject { }
    public class Renderer2DData : ScriptableRendererData { }
    public class UniversalRenderPipelineAsset : ScriptableObject
    {
        public static UniversalRenderPipelineAsset Create(ScriptableRendererData data) => null;
        public bool supportsHDR { get; set; }
        public int msaaSampleCount { get; set; }
    }
    public class UniversalAdditionalCameraData : MonoBehaviour { }
    public class Bloom
    {
        public FloatParameter intensity = new FloatParameter();
        public FloatParameter threshold = new FloatParameter();
        public FloatParameter scatter = new FloatParameter();
    }
    public class FloatParameter { public void Override(float v) { } }
}

namespace UnityEngine
{
    public static class QualitySettings { public static object renderPipeline { get; set; } }
}

namespace UnityEngine.Networking
{
    public class UnityWebRequest
    {
        public static UnityWebRequest Get(string url) => new UnityWebRequest();
        public object SendWebRequest() => null;
        public bool isDone => true;
        public Result result => Result.Success;
        public string error => "";
        public DownloadHandler downloadHandler => new DownloadHandler();
        public enum Result { Success }
    }
    public class DownloadHandler { public byte[] data => null; }
}
