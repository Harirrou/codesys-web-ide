// Wispbloom — zero-click setup. The first time the project opens (no scene
// on disk yet), this builds the vertical slice, fetches the painted art,
// opens the scene and tells the user to press Play. Manual menu items
// remain available for re-runs.
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Wispbloom.EditorTools
{
    [InitializeOnLoad]
    public static class AutoBootstrap
    {
        static AutoBootstrap()
        {
            // delayCall: wait until the asset database is fully ready.
            EditorApplication.delayCall += TryBootstrap;
        }

        static void TryBootstrap()
        {
            if (Application.isPlaying) return;
            if (File.Exists(VerticalSliceBuilder.ScenePath)) return;   // already set up
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            {
                EditorApplication.delayCall += TryBootstrap;           // asset DB not ready yet
                return;
            }

            Debug.Log("Wispbloom: first open detected — building the vertical slice…");
            try
            {
                VerticalSliceBuilder.Build(silent: true);
            }
            catch (System.Exception e)
            {
                Debug.LogError($"Wispbloom: scene build failed — run Wispbloom → Build Vertical Slice manually. {e}");
                return;
            }

            try
            {
                PaintedArtFetcher.Fetch();
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"Wispbloom: painted-art download failed (offline?). The game runs with placeholders; retry via Wispbloom → Fetch Painted Art. {e.Message}");
            }

            EditorSceneManager.OpenScene(VerticalSliceBuilder.ScenePath);
            EditorUtility.DisplayDialog("Wispbloom is ready",
                "Everything is set up.\n\nJust press the Play button ▶ at the top of the editor.\n\n" +
                "Controls: drag to aim, release to shoot, tap the flower to swap.",
                "Let's play");
        }
    }
}
