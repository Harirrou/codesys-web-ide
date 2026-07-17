// Wispbloom — one-click vertical-slice assembly.
// Menu: Wispbloom → Build Vertical Slice.
// Creates URP (2D Renderer) assets, applies Android-portrait player
// settings, generates placeholder art + data assets, and constructs the
// playable scene (field, flower, HUD, pause, result, aim, FX, perf HUD).
// Deterministic and re-runnable; everything it makes lives under Assets/.
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using Wispbloom.Data;
using Wispbloom.Game;
using Wispbloom.Sim;
using Wispbloom.UI;
using Wispbloom.View;

namespace Wispbloom.EditorTools
{
    public static class VerticalSliceBuilder
    {
        public const string ScenePath = "Assets/Scenes/VerticalSlice.unity";

        [MenuItem("Wispbloom/Build Vertical Slice")]
        public static void BuildFromMenu() => Build(false);

        /// <summary>Regenerates placeholders and refills any empty ArtBinding
        /// slots. Safe to run any time; never overwrites painted art.</summary>
        [MenuItem("Wispbloom/Repair Art Binding")]
        public static void RepairArt()
        {
            PlaceholderArt.GenerateAll();
            var art = CreateArtBinding();
            AssetDatabase.SaveAssets();
            Debug.Log("Wispbloom: art binding repaired. Null slots refilled: " +
                      (art.spiritGlow != null && art.panelGlow9Slice != null ? "OK" : "STILL MISSING — see errors above"));
        }

        public static void Build(bool silent)
        {
            PlaceholderArt.GenerateAll();
            SetupPipeline();
            SetupPlayerSettings();
            var art = CreateArtBinding();
            var tuning = LoadOrCreate<GameTuning>("Assets/Data/GameTuning.asset");
            var level = CreateSliceLevel();
            BuildScene(art, tuning, level);
            if (!silent)
                EditorUtility.DisplayDialog("Wispbloom",
                    "Vertical slice built.\n\nOpen Assets/Scenes/VerticalSlice.unity and press Play.\n" +
                    "Then run Wispbloom → Fetch Painted Art to replace placeholders.", "OK");
        }

        // ----- render pipeline ------------------------------------------------
        static void SetupPipeline()
        {
            Directory.CreateDirectory("Assets/Settings");
            var rendererData = AssetDatabase.LoadAssetAtPath<Renderer2DData>("Assets/Settings/Renderer2D.asset");
            if (rendererData == null)
            {
                rendererData = ScriptableObject.CreateInstance<Renderer2DData>();
                AssetDatabase.CreateAsset(rendererData, "Assets/Settings/Renderer2D.asset");
            }
            var rp = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/Settings/URP.asset");
            if (rp == null)
            {
                rp = UniversalRenderPipelineAsset.Create(rendererData);
                AssetDatabase.CreateAsset(rp, "Assets/Settings/URP.asset");
            }
            rp.supportsHDR = true;              // needed for restrained bloom
            rp.msaaSampleCount = 1;             // mobile: bloom replaces MSAA need
            GraphicsSettings.defaultRenderPipeline = rp;
            QualitySettings.renderPipeline = rp;

            // Global volume profile: selective, restrained bloom.
            var profile = LoadOrCreate<VolumeProfile>("Assets/Settings/PostFX.asset");
            if (!profile.TryGet<Bloom>(out var bloom))
                bloom = profile.Add<Bloom>(true);
            bloom.intensity.Override(0.55f);
            bloom.threshold.Override(1.05f);    // only HDR-bright pixels bloom
            bloom.scatter.Override(0.6f);
            EditorUtility.SetDirty(profile);
        }

        static Shader FindShaderSafe(string name)
        {
            var s = Shader.Find(name);
            if (s == null)
            {
                Debug.LogError($"Wispbloom: shader '{name}' not found — falling back to Sprites/Default.");
                s = Shader.Find("Sprites/Default");
            }
            return s;
        }

        static void SetupPlayerSettings()
        {
            EditorSettings.defaultBehaviorMode = EditorBehaviorMode.Mode2D;
            PlayerSettings.companyName = "Wispbloom";
            PlayerSettings.productName = "Wispbloom";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.wispbloom.game");
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
        }

        // ----- data assets ----------------------------------------------------
        static T LoadOrCreate<T>(string path) where T : ScriptableObject
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset == null)
            {
                asset = ScriptableObject.CreateInstance<T>();
                AssetDatabase.CreateAsset(asset, path);
            }
            return asset;
        }

        static ArtBinding CreateArtBinding()
        {
            var art = LoadOrCreate<ArtBinding>("Assets/Data/ArtBinding.asset");
            Sprite S(string name) =>
                AssetDatabase.LoadAssetAtPath<Sprite>($"{PlaceholderArt.Dir}/{name}.png");
            // Only fill empty slots so fetched painted art is never overwritten.
            art.spiritBodies ??= new Sprite[4];
            if (art.spiritBodies[0] == null) art.spiritBodies[0] = S("PLACEHOLDER_spirit_tide");
            if (art.spiritBodies[1] == null) art.spiritBodies[1] = S("PLACEHOLDER_spirit_blossom");
            if (art.spiritBodies[2] == null) art.spiritBodies[2] = S("PLACEHOLDER_spirit_ember");
            if (art.spiritBodies[3] == null) art.spiritBodies[3] = S("PLACEHOLDER_spirit_dusk");
            if (art.spiritGlow == null) art.spiritGlow = S("PLACEHOLDER_glow");
            if (art.flowerPetal == null) art.flowerPetal = S("PLACEHOLDER_petal");
            if (art.flowerHeart == null) art.flowerHeart = S("PLACEHOLDER_heart");
            if (art.orbitTile == null) art.orbitTile = S("PLACEHOLDER_orbit_tile");
            if (art.dustMote == null) art.dustMote = S("PLACEHOLDER_dust");
            if (art.sparkle == null) art.sparkle = S("PLACEHOLDER_sparkle");
            if (art.backgroundDawn == null) art.backgroundDawn = S("PLACEHOLDER_bg_dawn");
            if (art.panelGlow9Slice == null) art.panelGlow9Slice = S("PLACEHOLDER_panel");
            if (art.uiFont == null) art.uiFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (art.spiritBodies[0] == null || art.spiritGlow == null || art.orbitTile == null)
                Debug.LogError("Wispbloom: placeholder sprites failed to import as Sprites — " +
                               "run Wispbloom → Build Vertical Slice again after import settles.");
            EditorUtility.SetDirty(art);
            return art;
        }

        static LevelDefinition CreateSliceLevel()
        {
            var level = LoadOrCreate<LevelDefinition>("Assets/Data/Level_Slice.asset");
            level.displayName = "Twin Streams";
            level.objective = Objective.Bloom;
            level.target = 20;
            level.colorCount = 3;
            level.rings = new[]
            {
                // rr values match the prototype's Twin Streams exactly —
                // smaller inner radii over-crowd the ring (verified by the
                // headless sim harness).
                new RingSpec { rr = 0.52f, dir = -1, speed = 0.26f, fill = 9,  corrupt = 0, capacity = 13 },
                new RingSpec { rr = 0.80f, dir =  1, speed = 0.20f, fill = 12, corrupt = 0, capacity = 19 },
            };
            level.spawnInterval = 7f;
            level.spawnRings = new[] { 1 };
            level.shifts = new[] { ShiftKind.Reverse, ShiftKind.Surge };
            level.star2Score = 1600;
            level.star3Score = 2600;
            EditorUtility.SetDirty(level);
            return level;
        }

        // ----- scene ----------------------------------------------------------
        static void BuildScene(ArtBinding art, GameTuning tuning, LevelDefinition level)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Camera: portrait, width-locked framing (design width 3.9 units).
            var camGo = new GameObject("Main Camera");
            var cam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
            cam.orthographic = true;
            cam.orthographicSize = 4.22f;          // 390x844 reference: halfW 1.95
            cam.backgroundColor = new Color(0.043f, 0.055f, 0.125f);
            cam.clearFlags = CameraClearFlags.SolidColor;
            camGo.AddComponent<UniversalAdditionalCameraData>();
            var fitter = camGo.AddComponent<CameraWidthFit>();
            fitter.designHalfWidth = 1.95f;

            // Global 2D light (dim ambience; the flower is the key light).
            var globalLight = new GameObject("GlobalLight").AddComponent<Light2D>();
            globalLight.lightType = Light2D.LightType.Global;
            globalLight.intensity = 0.85f;
            globalLight.color = new Color(0.82f, 0.87f, 1f);

            // Painted background + ambient dust.
            var bg = new GameObject("Background").AddComponent<SpriteRenderer>();
            bg.sprite = art.backgroundDawn;
            bg.sortingOrder = -10;
            bg.drawMode = SpriteDrawMode.Simple;
            bg.transform.localScale = Vector3.one * 1.35f;
            var bgFit = bg.gameObject.AddComponent<BackgroundCoverFit>();
            bgFit.cam = cam;
            bgFit.art = art;

            var fieldRoot = new GameObject("FieldRoot").transform;

            var flower = new GameObject("Flower").AddComponent<FlowerView>();
            flower.transform.SetParent(fieldRoot, false);

            // FX + UI canvas.
            var canvasGo = new GameObject("Canvas");
            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 2340);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<UnityEngine.EventSystems.EventSystem>();
            esGo.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();

            var fxGo = new GameObject("Effects");
            var effects = fxGo.AddComponent<EffectsDirector>();
            effects.cam = cam;
            effects.worldTextCanvas = canvas;
            effects.font = art.uiFont;

            var audio = new GameObject("Audio").AddComponent<AudioDirector>();

            // Aim guide (dotted line + ghost).
            var aimGo = new GameObject("Aim");
            var aim = aimGo.AddComponent<AimController>();
            var guide = aimGo.AddComponent<LineRenderer>();
            guide.material = new Material(FindShaderSafe("Wispbloom/Additive"));
            if (art.dustMote != null) guide.material.mainTexture = art.dustMote.texture;
            guide.textureMode = LineTextureMode.Tile;
            guide.startWidth = guide.endWidth = 0.045f;
            guide.startColor = guide.endColor = new Color(1f, 1f, 1f, 0.5f);
            var ghostSr = new GameObject("Ghost").AddComponent<SpriteRenderer>();
            ghostSr.transform.SetParent(aimGo.transform, false);
            ghostSr.sprite = art.spiritGlow;
            ghostSr.material = new Material(FindShaderSafe("Wispbloom/Additive"));
            ghostSr.sortingOrder = 14;
            aim.guide = guide;
            aim.ghost = ghostSr.transform;

            // HUD + panels.
            var ui = UiBuilder.Build(canvas, art);

            // Controller wiring.
            var controllerGo = new GameObject("GameController");
            var game = controllerGo.AddComponent<GameController>();
            game.level = level;
            game.tuning = tuning;
            game.art = art;
            game.cam = cam;
            game.flower = flower;
            game.fieldRoot = fieldRoot;
            game.effects = effects;
            game.audioDirector = audio;
            game.hud = ui.hud;
            game.pausePanel = ui.pause;
            game.resultPanel = ui.result;
            game.aim = aim;
            aim.game = game;
            UiBuilder.WireActions(ui, game, audio);

            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }
    }

}
