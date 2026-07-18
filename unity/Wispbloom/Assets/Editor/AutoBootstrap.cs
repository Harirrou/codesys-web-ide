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
            if (File.Exists(VerticalSliceBuilder.ScenePath))
            {
                // Scene exists: still self-heal the art binding if any slot
                // is empty (covers a first run that crashed half-way).
                var art = UnityEditor.AssetDatabase.LoadAssetAtPath<Wispbloom.Data.ArtBinding>("Assets/Data/ArtBinding.asset");
                if (art != null && (art.spiritGlow == null || art.panelGlow9Slice == null ||
                    art.spiritBodies == null || art.spiritBodies.Length < 4 || art.spiritBodies[0] == null))
                {
                    Debug.LogWarning("Wispbloom: empty art slots detected — repairing automatically.");
                    VerticalSliceBuilder.RepairArt();
                }
                // Auto-pull the painted spirit/petal/heart/orbit art once, if it
                // was never fetched. The CDN is reachable from a normal network;
                // failure is harmless (the painted skies are baked in Resources
                // and the spirits fall back to the in-engine recreation).
                // Trigger on the Dusk cutout specifically so machines that
                // fetched the older three-spirit set upgrade to the full set.
                if (!File.Exists("Assets/Art/Painted/spirit_dusk.png"))
                {
                    try { PaintedArtFetcher.Fetch(); }
                    catch (System.Exception e)
                    {
                        Debug.LogWarning("Wispbloom: painted-art fetch skipped (offline?). " +
                            "Retry any time via Wispbloom → Fetch Painted Art. " + e.Message);
                    }
                }
                return;
            }
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
