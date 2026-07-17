// Wispbloom — programmatic UI construction for the slice. Every control uses
// the custom glow 9-slice sprite and shared font from ArtBinding — no default
// Unity button skin anywhere. Layout is anchor-based and safe-area aware.
using UnityEditor;
using UnityEditor.Events;
using UnityEngine;
using UnityEngine.UI;
using Wispbloom.Data;
using Wispbloom.Game;
using Wispbloom.UI;
using Wispbloom.View;

namespace Wispbloom.EditorTools
{
    public struct UiRefs
    {
        public HudView hud;
        public PausePanel pause;
        public ResultPanel result;
        public Button pauseBtn, pulseBtn, resumeBtn, restartBtn, replayBtn;
        public Button soundBtn, musicBtn, vibrationBtn;
    }

    public static class UiBuilder
    {
        static Font _font;
        static Sprite _panel;

        public static UiRefs Build(Canvas canvas, ArtBinding art)
        {
            _font = art.uiFont;
            _panel = art.panelGlow9Slice;
            var refs = new UiRefs();

            var safe = Panel(canvas.transform, "SafeArea", Vector2.zero, Vector2.one, false);
            safe.gameObject.AddComponent<SafeAreaFitter>();

            // --- HUD -----------------------------------------------------------
            var hudGo = Panel(safe, "HUD", Vector2.zero, Vector2.one, false);
            refs.hud = hudGo.gameObject.AddComponent<HudView>();

            refs.pauseBtn = GlowButton(hudGo, "PauseBtn", "II", new Vector2(0, 1), new Vector2(0.055f, -0.012f), new Vector2(120, 120), 44);
            var objective = Label(hudGo, "Objective", "BLOOM 0 / 20", new Vector2(0.5f, 1f), new Vector2(0f, -0.035f), 46, TextAnchor.MiddleCenter);
            AddPill(objective);
            var score = Label(hudGo, "Score", "0", new Vector2(1f, 1f), new Vector2(-0.07f, -0.035f), 48, TextAnchor.MiddleRight);
            score.color = new Color(1f, 0.91f, 0.69f);

            var banner = Label(hudGo, "Banner", "", new Vector2(0.5f, 0.5f), new Vector2(0f, 0.31f), 52, TextAnchor.MiddleCenter);
            banner.color = new Color(0.56f, 0.85f, 1f);
            banner.enabled = false;
            var levelName = Label(hudGo, "LevelName", "", new Vector2(0.5f, 1f), new Vector2(0f, -0.115f), 62, TextAnchor.MiddleCenter);
            levelName.enabled = false;

            // Danger vignette: full-screen soft red frame, alpha-driven.
            var vignette = Panel(hudGo, "Danger", Vector2.zero, Vector2.one, true);
            var vignetteImg = vignette.GetComponent<Image>();
            vignetteImg.sprite = art.spiritGlow;
            vignetteImg.color = new Color(1f, 0.25f, 0.35f, 0f);
            vignetteImg.raycastTarget = false;

            // Pulse ability button (round meter).
            refs.pulseBtn = GlowButton(hudGo, "PulseBtn", "PULSE", new Vector2(0.09f, 0f), new Vector2(0f, 0.075f), new Vector2(190, 190), 34);
            var fillGo = new GameObject("Fill").AddComponent<Image>();
            fillGo.transform.SetParent(refs.pulseBtn.transform, false);
            fillGo.sprite = art.spiritGlow;
            fillGo.type = Image.Type.Filled;
            fillGo.fillMethod = Image.FillMethod.Radial360;
            fillGo.color = new Color(0.49f, 0.8f, 0.91f, 0.55f);
            fillGo.raycastTarget = false;
            Stretch(fillGo.rectTransform, 8);
            fillGo.transform.SetAsFirstSibling();

            refs.hud.objectiveText = objective;
            refs.hud.scoreText = score;
            refs.hud.bannerText = banner;
            refs.hud.levelNameText = levelName;
            refs.hud.pulseFill = fillGo;
            refs.hud.pulseLabel = refs.pulseBtn.GetComponentInChildren<Text>();
            refs.hud.dangerVignette = vignetteImg;

            // Perf HUD label (F1 / three-finger tap).
            var perf = Label(hudGo, "Perf", "", new Vector2(0.5f, 0f), new Vector2(0f, 0.012f), 30, TextAnchor.MiddleCenter);
            perf.color = new Color(0.7f, 1f, 0.8f, 0.9f);
            perf.enabled = false;
            hudGo.gameObject.AddComponent<PerformanceHud>().label = perf;

            // --- Pause modal ---------------------------------------------------
            var pauseGo = Modal(safe, "PausePanel");
            refs.pause = pauseGo.gameObject.AddComponent<PausePanel>();
            Label(pauseGo, "Title", "Paused", new Vector2(0.5f, 1f), new Vector2(0f, -0.16f), 72, TextAnchor.MiddleCenter);
            refs.resumeBtn = GlowButton(pauseGo, "Resume", "RESUME", new Vector2(0.5f, 0.5f), new Vector2(0f, 0.1f), new Vector2(640, 130), 44);
            refs.restartBtn = GlowButton(pauseGo, "Restart", "RESTART", new Vector2(0.5f, 0.5f), new Vector2(0f, -0.02f), new Vector2(640, 130), 44);
            refs.soundBtn = GlowButton(pauseGo, "Sound", "SOUND ON", new Vector2(0.3f, 0.5f), new Vector2(0f, -0.16f), new Vector2(280, 110), 34);
            refs.musicBtn = GlowButton(pauseGo, "Music", "MUSIC ON", new Vector2(0.5f, 0.5f), new Vector2(0f, -0.16f), new Vector2(280, 110), 34);
            refs.vibrationBtn = GlowButton(pauseGo, "Vib", "VIBRATE ON", new Vector2(0.7f, 0.5f), new Vector2(0f, -0.16f), new Vector2(280, 110), 34);
            refs.pause.soundLabel = refs.soundBtn.GetComponentInChildren<Text>();
            refs.pause.musicLabel = refs.musicBtn.GetComponentInChildren<Text>();
            refs.pause.vibrationLabel = refs.vibrationBtn.GetComponentInChildren<Text>();

            // --- Result modal --------------------------------------------------
            var resultGo = Modal(safe, "ResultPanel");
            refs.result = resultGo.gameObject.AddComponent<ResultPanel>();
            var title = Label(resultGo, "Title", "The Garden Blooms!", new Vector2(0.5f, 1f), new Vector2(0f, -0.18f), 76, TextAnchor.MiddleCenter);
            var scoreR = Label(resultGo, "Score", "Score 0", new Vector2(0.5f, 0.5f), new Vector2(0f, 0.06f), 56, TextAnchor.MiddleCenter);
            var thresholds = Label(resultGo, "Thresholds", "", new Vector2(0.5f, 0.5f), new Vector2(0f, 0.005f), 34, TextAnchor.MiddleCenter);
            thresholds.color = new Color(0.75f, 0.82f, 1f, 0.8f);
            refs.result.titleText = title;
            refs.result.scoreText = scoreR;
            refs.result.thresholdText = thresholds;
            refs.result.starImages = new Image[3];
            for (int i = 0; i < 3; i++)
            {
                var star = new GameObject($"Star{i}").AddComponent<Image>();
                star.transform.SetParent(resultGo, false);
                star.sprite = art.sparkle;
                var rt = star.rectTransform;
                rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.72f);
                rt.anchoredPosition = new Vector2((i - 1) * 150f, i == 1 ? 26f : 0f);
                rt.sizeDelta = new Vector2(120, 120);
                refs.result.starImages[i] = star;
            }
            refs.replayBtn = GlowButton(resultGo, "Replay", "REPLAY", new Vector2(0.5f, 0.5f), new Vector2(0f, -0.14f), new Vector2(640, 132), 46);

            return refs;
        }

        public static void WireActions(UiRefs ui, GameController game, AudioDirector audio)
        {
            void Wire(Button b, UnityEngine.Events.UnityAction act)
            {
                UnityEventTools.AddVoidPersistentListener(b.onClick, act);
            }
            Wire(ui.pauseBtn, game.hud.OnPausePressed);
            Wire(ui.pulseBtn, game.hud.OnPulsePressed);
            Wire(ui.resumeBtn, ui.pause.OnResume);
            Wire(ui.restartBtn, ui.pause.OnRestart);
            Wire(ui.soundBtn, ui.pause.OnToggleSound);
            Wire(ui.musicBtn, ui.pause.OnToggleMusic);
            Wire(ui.vibrationBtn, ui.pause.OnToggleVibration);
            Wire(ui.replayBtn, ui.result.OnReplay);
            ui.pause.Bind(game);
            ui.result.Bind(game);
        }

        // ----- widget helpers -------------------------------------------------
        static RectTransform Panel(Transform parent, string name, Vector2 min, Vector2 max, bool withImage)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = min; rt.anchorMax = max;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            if (withImage) go.AddComponent<Image>();
            return rt;
        }

        static RectTransform Modal(Transform parent, string name)
        {
            var rt = Panel(parent, name, Vector2.zero, Vector2.one, true);
            var img = rt.GetComponent<Image>();
            img.color = new Color(0.03f, 0.05f, 0.11f, 0.82f);
            rt.gameObject.SetActive(false);
            return rt;
        }

        static Text Label(Transform parent, string name, string text, Vector2 anchor, Vector2 offset, int size, TextAnchor align)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = anchor;
            rt.anchoredPosition = new Vector2(offset.x * 1080f, offset.y * 2340f);
            rt.sizeDelta = new Vector2(1000, 120);
            var label = go.AddComponent<Text>();
            label.font = _font;
            label.text = text;
            label.fontSize = size;
            label.fontStyle = FontStyle.Bold;
            label.alignment = align;
            label.color = new Color(0.93f, 0.96f, 1f);
            label.horizontalOverflow = HorizontalWrapMode.Overflow;
            label.verticalOverflow = VerticalWrapMode.Overflow;
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0.08f, 0.7f);
            shadow.effectDistance = new Vector2(2f, -2f);
            return label;
        }

        static void AddPill(Text label)
        {
            var pill = new GameObject("Pill").AddComponent<Image>();
            pill.transform.SetParent(label.transform.parent, false);
            pill.transform.SetSiblingIndex(label.transform.GetSiblingIndex());
            pill.sprite = _panel;
            pill.type = Image.Type.Sliced;
            pill.color = new Color(1f, 1f, 1f, 0.85f);
            pill.raycastTarget = false;
            var rt = pill.rectTransform;
            var lrt = label.rectTransform;
            rt.anchorMin = lrt.anchorMin; rt.anchorMax = lrt.anchorMax;
            rt.anchoredPosition = lrt.anchoredPosition;
            rt.sizeDelta = new Vector2(560, 110);
        }

        static Button GlowButton(Transform parent, string name, string text, Vector2 anchor, Vector2 offset, Vector2 size, int fontSize)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = anchor;
            rt.anchoredPosition = new Vector2(offset.x * 1080f, offset.y * 2340f);
            rt.sizeDelta = size;
            var img = go.AddComponent<Image>();
            img.sprite = _panel;
            img.type = Image.Type.Sliced;
            var btn = go.AddComponent<Button>();
            var colors = btn.colors;
            colors.highlightedColor = new Color(1.15f, 1.15f, 1.25f);
            colors.pressedColor = new Color(0.8f, 0.85f, 1f);
            btn.colors = colors;
            var label = Label(go.transform, "Label", text, new Vector2(0.5f, 0.5f), Vector2.zero, fontSize, TextAnchor.MiddleCenter);
            label.rectTransform.sizeDelta = size;
            return btn;
        }

        static void Stretch(RectTransform rt, float inset)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(inset, inset);
            rt.offsetMax = new Vector2(-inset, -inset);
        }
    }
}
