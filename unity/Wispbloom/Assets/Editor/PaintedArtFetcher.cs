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
            // Refreshed painterly spirit set (1024px cutouts, complete 4-color
            // set incl. Dusk). Sprites are rescaled to piece size in SpriteView,
            // so PPU only sets the source bounds.
            ("spirit_tide.png",    "hf_20260718_060609_e7c88db4-35e8-4af8-8f12-2a64e35f842d.png", 1024f),
            ("spirit_blossom.png", "hf_20260718_060612_6a12a4ca-81e5-4c2f-a923-732da0269251.png", 1024f),
            ("spirit_ember.png",   "hf_20260718_060615_a5542739-d884-470a-9d2a-b55573613a03.png", 1024f),
            ("spirit_dusk.png",    "hf_20260718_060618_c3471afc-7259-43c4-a420-49a005a12905.png", 1024f),
            ("flower_petal.png",   "hf_20260717_110244_18574522-ec92-484b-9fe4-616997a90907.png", 512f),
            ("flower_heart.png",   "hf_20260717_110255_cba5d4c1-2d2c-4389-9956-b32970b6270f.png", 512f),
            ("orbit_tile.png",     "hf_20260717_110258_e65393aa-8170-471f-b98a-5c1217f41c0c.png", 512f),
            ("fx_dust.png",        "hf_20260717_110302_b0b8e8f4-f2c6-426b-a881-846917a8f013.png", 512f),
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
            if (art.spiritBodies == null || art.spiritBodies.Length < 4)
                art.spiritBodies = new Sprite[4];
            art.spiritBodies[0] = S("spirit_tide.png") ?? art.spiritBodies[0];
            art.spiritBodies[1] = S("spirit_blossom.png") ?? art.spiritBodies[1];
            art.spiritBodies[2] = S("spirit_ember.png") ?? art.spiritBodies[2];
            art.spiritBodies[3] = S("spirit_dusk.png") ?? art.spiritBodies[3];
            art.flowerPetal = S("flower_petal.png") ?? art.flowerPetal;
            art.flowerHeart = S("flower_heart.png") ?? art.flowerHeart;
            art.orbitTile = S("orbit_tile.png") ?? art.orbitTile;
            art.dustMote = S("fx_dust.png") ?? art.dustMote;
            // Backgrounds are baked into Resources (PaintedResources) — not fetched.
            EditorUtility.SetDirty(art);
            AssetDatabase.SaveAssets();
        }
    }
}
