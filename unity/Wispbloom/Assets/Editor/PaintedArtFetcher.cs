// Wispbloom — Menu: Wispbloom → Fetch Painted Art.
// Downloads the generated painterly assets (Higgsfield-hosted; prompts in
// unity/Docs/ART_MANIFEST.md) into Assets/Art/Painted, applies import
// settings per the manifest, and rebinds ArtBinding — placeholders retire
// without touching a single gameplay file. Requires normal internet.
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;
using Wispbloom.Data;

namespace Wispbloom.EditorTools
{
    public static class PaintedArtFetcher
    {
        const string Dir = "Assets/Art/Painted";
        const string Cdn = "https://d8j0ntlcm91z4.cloudfront.net/user_3GCWeZZjU0NmAmmShhKAENmTFXd/";

        // filename → (cdn file, pixels-per-unit). Pivot is center for all;
        // the petal uses a bottom pivot (set below).
        static readonly (string file, string cdn, float ppu)[] Files =
        {
            ("spirit_tide.png",    "hf_20260717_111326_ee0e03fd-7244-4439-ab0b-dbbf3d8c6d94.png", 640f),
            ("spirit_blossom.png", "hf_20260717_111329_7720f7b9-e15d-4b4f-9fed-38516fdcf7f8.png", 640f),
            ("spirit_ember.png",   "hf_20260717_111332_71d73c6a-e813-4703-9a9a-eff715621502.png", 640f),
            ("flower_petal.png",   "hf_20260717_110244_18574522-ec92-484b-9fe4-616997a90907.png", 512f),
            ("flower_heart.png",   "hf_20260717_110255_cba5d4c1-2d2c-4389-9956-b32970b6270f.png", 512f),
            ("orbit_tile.png",     "hf_20260717_110258_e65393aa-8170-471f-b98a-5c1217f41c0c.png", 512f),
            ("fx_dust.png",        "hf_20260717_110302_b0b8e8f4-f2c6-426b-a881-846917a8f013.png", 512f),
            ("bg_dawn.jpg",        "hf_20260716_224200_02c49906-6f8d-4bf7-a777-ca3703d05b67.png", 160f),
        };

        [MenuItem("Wispbloom/Fetch Painted Art")]
        public static void Fetch()
        {
            Directory.CreateDirectory(Dir);
            var pending = new List<(UnityWebRequest req, string path)>();
            foreach (var (file, cdn, _) in Files)
            {
                var req = UnityWebRequest.Get(Cdn + cdn);
                req.SendWebRequest();
                pending.Add((req, $"{Dir}/{file}"));
            }
            try
            {
                for (int i = 0; i < pending.Count; i++)
                {
                    var (req, path) = pending[i];
                    EditorUtility.DisplayProgressBar("Wispbloom", $"Downloading {Path.GetFileName(path)}…", i / (float)pending.Count);
                    while (!req.isDone) System.Threading.Thread.Sleep(30);
                    if (req.result != UnityWebRequest.Result.Success)
                    {
                        Debug.LogError($"Wispbloom art download failed: {path} — {req.error}");
                        continue;
                    }
                    File.WriteAllBytes(path, req.downloadHandler.data);
                }
            }
            finally { EditorUtility.ClearProgressBar(); }

            AssetDatabase.Refresh();
            ApplyImportSettings();
            Rebind();
            Debug.Log("Wispbloom: painted art fetched and bound. Placeholders retired.");
        }

        static void ApplyImportSettings()
        {
            foreach (var (file, _, ppu) in Files)
            {
                string path = $"{Dir}/{file}";
                if (AssetImporter.GetAtPath(path) is not TextureImporter imp) continue;
                imp.textureType = TextureImporterType.Sprite;
                imp.spritePixelsPerUnit = ppu;
                imp.mipmapEnabled = false;
                imp.alphaIsTransparency = file.EndsWith(".png");
                imp.wrapMode = file.StartsWith("orbit") ? TextureWrapMode.Repeat : TextureWrapMode.Clamp;
                if (file == "flower_petal.png")
                {
                    var settings = new TextureImporterSettings();
                    imp.ReadTextureSettings(settings);
                    settings.spriteAlignment = (int)SpriteAlignment.BottomCenter;
                    imp.SetTextureSettings(settings);
                }
                imp.SaveAndReimport();
            }
        }

        static void Rebind()
        {
            var art = AssetDatabase.LoadAssetAtPath<ArtBinding>("Assets/Data/ArtBinding.asset");
            if (art == null) { Debug.LogWarning("ArtBinding.asset missing — run Build Vertical Slice first."); return; }
            Sprite S(string file) => AssetDatabase.LoadAssetAtPath<Sprite>($"{Dir}/{file}");
            art.spiritBodies[0] = S("spirit_tide.png") ?? art.spiritBodies[0];
            art.spiritBodies[1] = S("spirit_blossom.png") ?? art.spiritBodies[1];
            art.spiritBodies[2] = S("spirit_ember.png") ?? art.spiritBodies[2];
            // Dusk spirit ships in phase 2 (slice uses three types); placeholder stays.
            art.flowerPetal = S("flower_petal.png") ?? art.flowerPetal;
            art.flowerHeart = S("flower_heart.png") ?? art.flowerHeart;
            art.orbitTile = S("orbit_tile.png") ?? art.orbitTile;
            art.dustMote = S("fx_dust.png") ?? art.dustMote;
            art.backgroundDawn = S("bg_dawn.jpg") ?? art.backgroundDawn;
            EditorUtility.SetDirty(art);
            AssetDatabase.SaveAssets();
        }
    }
}
