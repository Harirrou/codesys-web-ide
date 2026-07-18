// Wispbloom — the whole front end built at runtime: Title, Level Map (two
// worlds, star-gated), Settings, How to Play and the Grove (cosmetics). No
// scene authoring required, so it self-heals into an already-built scene the
// moment the scripts recompile. Every control uses the ArtBinding glow panel
// + shared font — no default Unity skin. Navigation is callback-driven into
// the GameController.
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.UI;
using Wispbloom.Data;
using Wispbloom.Game;

namespace Wispbloom.UI
{
    public class ScreenManager : MonoBehaviour
    {
        GameController _game;
        ArtBinding _art;
        Font _font;
        Sprite _panel;
        int _levelCount;
        string[] _levelNames;

        GameObject _root;
        GameObject _title, _map, _settings, _howto, _grove;
        Button _homeButton;

        // Map
        Button[] _levelButtons;
        Text[] _levelStars;

        // Settings
        Text _soundL, _musicL, _vibrL, _glyphL, _motionL, _resetL;
        bool _resetArmed;

        // Grove
        Text _groveStars;
        Button[] _trailButtons;
        Button[] _coreButtons;

        static readonly Color Ink = new Color(0.93f, 0.96f, 1f);
        static readonly Color Dim = new Color(0.5f, 0.55f, 0.7f, 0.6f);
        static readonly Color Gold = new Color(1f, 0.85f, 0.41f);

        public static ScreenManager Create(Transform uiParent, ArtBinding art, GameController game)
        {
            var go = new GameObject("ScreenManager", typeof(RectTransform));
            go.transform.SetParent(uiParent, false);
            var rt = (RectTransform)go.transform;
            Stretch(rt);
            var sm = go.AddComponent<ScreenManager>();
            sm._game = game;
            sm._art = art;
            sm._font = art.uiFont;
            sm._panel = art.panelGlow9Slice;
            sm._levelCount = LevelLibrary.Count;
            sm._root = go;

            sm._levelNames = new string[sm._levelCount];
            for (int i = 0; i < sm._levelCount; i++)
                sm._levelNames[i] = LevelLibrary.Get(i).Name;

            sm.BuildTitle();
            sm.BuildMap();
            sm.BuildSettings();
            sm.BuildHowTo();
            sm.BuildGrove();
            sm.BuildHomeButton();
            sm.HideEverything();
            return sm;
        }

        // ----- screens -------------------------------------------------------

        void BuildTitle()
        {
            _title = Screen("Title");

            // Drifting sparkles across the title.
            if (_art.sparkle != null)
                for (int i = 0; i < 6; i++)
                {
                    float x = (i - 2.5f) * 180f;
                    var s = Accent(_title.transform, _art.sparkle, 0.5f, 0.5f, x, 300f - (i % 3) * 220f, 34f + (i % 3) * 14f,
                                   new Color(1f, 1f, 1f, 0.5f));
                    var f = s.gameObject.AddComponent<UiFx>();
                    f.drift = new Vector2(6f + i * 2f, 10f + i * 3f);
                    f.shimmerAmp = 0.35f; f.shimmerSpeed = 1.6f + i * 0.2f;
                }

            // Soft glow behind the wordmark.
            var glow = Accent(_title.transform, _art.spiritGlow, 0.5f, 0.5f, 0, 620, 720f, new Color(0.75f, 0.85f, 1f, 0.22f));
            var glowFx = glow.gameObject.AddComponent<UiFx>();
            glowFx.baseScale = 1f; glowFx.pulseAmp = 0.06f; glowFx.pulseSpeed = 1.3f;
            glowFx.shimmerAmp = 0.06f; glowFx.shimmerSpeed = 1.1f;

            var title = Label(_title.transform, "Wispbloom", 0.5f, 0.5f, 0, 620, 128, TextAnchor.MiddleCenter, Ink);
            var titleFx = title.gameObject.AddComponent<UiFx>();
            titleFx.pulseAmp = 0.02f; titleFx.pulseSpeed = 1.5f;

            var sub = Label(_title.transform, "Every match reshapes the sky", 0.5f, 0.5f, 0, 470, 44, TextAnchor.MiddleCenter, new Color(0.7f, 0.82f, 1f));
            sub.fontStyle = FontStyle.Normal;

            float y = 130;
            Button(_title.transform, "PLAY", 0.5f, 0.5f, 0, y, 640, 150, 54, () => ShowMap()); y -= 185;
            Button(_title.transform, "DAILY BLOOM", 0.5f, 0.5f, 0, y, 640, 130, 42, () => _game.PlayDaily()); y -= 165;
            Button(_title.transform, "ENDLESS GARDEN", 0.5f, 0.5f, 0, y, 640, 130, 42, () => _game.PlayEndless()); y -= 165;
            Button(_title.transform, "THE GROVE", 0.5f, 0.5f, 0, y, 640, 130, 42, () => ShowGrove()); y -= 165;

            Button(_title.transform, "HOW TO PLAY", 0.32f, 0.5f, 0, -820, 500, 118, 38, () => ShowHowTo());
            Button(_title.transform, "SETTINGS", 0.68f, 0.5f, 0, -820, 500, 118, 38, () => ShowSettings());
        }

        void BuildMap()
        {
            _map = Screen("Map");
            Label(_map.transform, "Choose a Bloom", 0.5f, 1f, 0, -150, 66, TextAnchor.MiddleCenter, Ink);
            Button(_map.transform, "BACK", 0f, 1f, 150, -150, 240, 110, 36, () => ShowTitle());

            Label(_map.transform, "THE FIRST GARDEN", 0.5f, 0.5f, 0, 920, 34, TextAnchor.MiddleCenter, new Color(0.7f, 0.82f, 1f));

            _levelButtons = new Button[_levelCount];
            _levelStars = new Text[_levelCount];
            for (int i = 0; i < _levelCount; i++)
            {
                bool world2 = i >= 10;
                int local = world2 ? i - 10 : i;
                int row = local / 2, col = local % 2;
                float x = col == 0 ? -250 : 250;
                float y = world2 ? (-260 - row * 190) : (760 - row * 190);

                int index = i;
                var b = Button(_map.transform, (i + 1).ToString(), 0.5f, 0.5f, x, y, 430, 165, 52,
                               () => _game.PlayLevel(index));
                _levelButtons[i] = b;
                _levelStars[i] = Label(b.transform, "", 0.5f, 0f, 0, 26, 30, TextAnchor.MiddleCenter, Gold);
            }

            Label(_map.transform, "THE DEEP GROVE", 0.5f, 0.5f, 0, -110, 34, TextAnchor.MiddleCenter, new Color(0.6f, 1f, 0.82f));
        }

        void BuildSettings()
        {
            _settings = Screen("Settings");
            Label(_settings.transform, "Settings", 0.5f, 1f, 0, -160, 72, TextAnchor.MiddleCenter, Ink);
            Button(_settings.transform, "BACK", 0f, 1f, 150, -150, 240, 110, 36, () => ShowTitle());

            float y = 560;
            _soundL = Toggle(_settings.transform, y, () => { var s = SaveService.Data; s.sound = !s.sound; SaveService.Flush(); RefreshSettings(); }); y -= 190;
            _musicL = Toggle(_settings.transform, y, () => { var s = SaveService.Data; s.music = !s.music; SaveService.Flush(); if (_game.audioDirector != null) _game.audioDirector.ApplyMusicSetting(); RefreshSettings(); }); y -= 190;
            _vibrL = Toggle(_settings.transform, y, () => { var s = SaveService.Data; s.vibration = !s.vibration; SaveService.Flush(); RefreshSettings(); }); y -= 190;
            _glyphL = Toggle(_settings.transform, y, () => { var s = SaveService.Data; s.glyphs = !s.glyphs; SaveService.Flush(); RefreshSettings(); }); y -= 190;
            _motionL = Toggle(_settings.transform, y, () => { var s = SaveService.Data; s.reduceMotion = !s.reduceMotion; SaveService.Flush(); RefreshSettings(); }); y -= 220;

            var reset = Button(_settings.transform, "RESET PROGRESS", 0.5f, 0.5f, 0, y, 640, 120, 40, OnResetTapped);
            _resetL = reset.GetComponentInChildren<Text>();
        }

        void BuildHowTo()
        {
            _howto = Screen("HowTo");
            Label(_howto.transform, "How to Play", 0.5f, 1f, 0, -160, 72, TextAnchor.MiddleCenter, Ink);
            Button(_howto.transform, "BACK", 0f, 1f, 150, -150, 240, 110, 36, () => ShowTitle());

            string[] lines =
            {
                "Drag anywhere to aim a beam from the flower.",
                "Release to shoot your wisp; tap the flower to swap it.",
                "Match 3 or more wisps of one color to burst them.",
                "Every match triggers an Orbit Shift that reshapes the rings.",
                "Thorned wisps must be cleansed — match their inner color.",
                "Fill the PULSE meter, then tap it to blast a cluster.",
                "Never let a ring overgrow, or the garden is lost.",
                "Chain two bursts in one shot to earn a rainbow Prism.",
            };
            float y = 640;
            for (int i = 0; i < lines.Length; i++)
            {
                var t = Label(_howto.transform, (i + 1) + ".  " + lines[i], 0.5f, 0.5f, 0, y, 34, TextAnchor.MiddleCenter, new Color(0.85f, 0.9f, 1f));
                t.fontStyle = FontStyle.Normal;
                y -= 150;
            }
        }

        void BuildGrove()
        {
            _grove = Screen("Grove");
            Label(_grove.transform, "The Grove", 0.5f, 1f, 0, -160, 72, TextAnchor.MiddleCenter, Ink);
            Button(_grove.transform, "BACK", 0f, 1f, 150, -150, 240, 110, 36, () => ShowTitle());
            _groveStars = Label(_grove.transform, "", 0.5f, 1f, 0, -300, 40, TextAnchor.MiddleCenter, Gold);

            Label(_grove.transform, "TRAILS", 0.5f, 0.5f, 0, 560, 38, TextAnchor.MiddleCenter, new Color(0.7f, 0.82f, 1f));
            _trailButtons = new Button[Cosmetics.Trails.Length];
            for (int i = 0; i < Cosmetics.Trails.Length; i++)
            {
                var opt = Cosmetics.Trails[i];
                int idx = i;
                float x = (i - (Cosmetics.Trails.Length - 1) / 2f) * 250f;
                _trailButtons[i] = Button(_grove.transform, opt.label, 0.5f, 0.5f, x, 400, 230, 130, 34, () => EquipTrail(idx));
            }

            Label(_grove.transform, "FLOWER CORES", 0.5f, 0.5f, 0, 120, 38, TextAnchor.MiddleCenter, new Color(0.7f, 0.82f, 1f));
            _coreButtons = new Button[Cosmetics.Cores.Length];
            for (int i = 0; i < Cosmetics.Cores.Length; i++)
            {
                var opt = Cosmetics.Cores[i];
                int idx = i;
                float x = (i - (Cosmetics.Cores.Length - 1) / 2f) * 270f;
                _coreButtons[i] = Button(_grove.transform, opt.label, 0.5f, 0.5f, x, -40, 250, 130, 34, () => EquipCore(idx));
            }
        }

        void BuildHomeButton()
        {
            _homeButton = Button(_root.transform, "MENU", 0f, 1f, 155, -270, 200, 96, 32, () => _game.ReturnToMenu());
        }

        // ----- navigation ----------------------------------------------------

        public void ShowTitle() { HideEverything(); Intro(_title); }
        public void ShowMap() { HideEverything(); RefreshMap(); Intro(_map); }
        public void ShowSettings() { HideEverything(); RefreshSettings(); Intro(_settings); }
        public void ShowHowTo() { HideEverything(); Intro(_howto); }
        public void ShowGrove() { HideEverything(); RefreshGrove(); Intro(_grove); }

        GameObject _active;
        float _introT = 1f;
        void Intro(GameObject g) { g.SetActive(true); _active = g; _introT = 0f; }

        /// <summary>Called by the GameController when a level starts: all menus
        /// off, only the little in-game MENU button remains.</summary>
        public void HideAll()
        {
            _title.SetActive(false); _map.SetActive(false); _settings.SetActive(false);
            _howto.SetActive(false); _grove.SetActive(false);
            _homeButton.gameObject.SetActive(true);
        }

        void HideEverything()
        {
            _title.SetActive(false); _map.SetActive(false); _settings.SetActive(false);
            _howto.SetActive(false); _grove.SetActive(false);
            _homeButton.gameObject.SetActive(false);
        }

        public bool AnyScreenVisible =>
            _title.activeSelf || _map.activeSelf || _settings.activeSelf ||
            _howto.activeSelf || _grove.activeSelf;

        void Update()
        {
            // Quick pop-in when a screen appears.
            if (_introT < 1f && _active != null)
            {
                _introT = Mathf.Min(1f, _introT + Time.unscaledDeltaTime * 6f);
                float e = 1f - (1f - _introT) * (1f - _introT);   // ease-out
                float s = 0.96f + 0.04f * e;
                ((RectTransform)_active.transform).localScale = new Vector3(s, s, 1f);
            }

            if (!Input.GetKeyDown(KeyCode.Escape)) return;
            // Sub-screens step back to the title; the title and in-game state
            // are left for the GameController (quit / pause) to handle.
            if (_map.activeSelf || _settings.activeSelf || _howto.activeSelf || _grove.activeSelf)
                ShowTitle();
        }

        // ----- refresh -------------------------------------------------------

        void RefreshMap()
        {
            var stars = SaveService.Data.stars;
            for (int i = 0; i < _levelCount; i++)
            {
                bool unlocked = i == 0 || (stars != null && i - 1 < stars.Length && stars[i - 1] > 0);
                _levelButtons[i].interactable = unlocked;
                var img = _levelButtons[i].GetComponent<Image>();
                if (img != null) img.color = unlocked ? Color.white : Dim;
                _levelStars[i].text = unlocked ? StarString(stars != null && i < stars.Length ? stars[i] : 0) : "locked";
                _levelStars[i].color = unlocked ? Gold : Dim;
            }
        }

        void RefreshSettings()
        {
            var s = SaveService.Data;
            _soundL.text = "Sound            " + OnOff(s.sound);
            _musicL.text = "Music            " + OnOff(s.music);
            _vibrL.text = "Vibration       " + OnOff(s.vibration);
            _glyphL.text = "Glyph hints    " + OnOff(s.glyphs);
            _motionL.text = "Reduce motion  " + OnOff(s.reduceMotion);
            _resetArmed = false;
            if (_resetL != null) _resetL.text = "RESET PROGRESS";
        }

        void RefreshGrove()
        {
            int total = Cosmetics.TotalStars();
            _groveStars.text = total + " stars earned";
            for (int i = 0; i < _trailButtons.Length; i++)
                StyleCosmetic(_trailButtons[i], Cosmetics.Trails[i], Cosmetics.Trail, total);
            for (int i = 0; i < _coreButtons.Length; i++)
                StyleCosmetic(_coreButtons[i], Cosmetics.Cores[i], Cosmetics.Core, total);
        }

        void StyleCosmetic(Button b, CosmeticOption opt, string equipped, int total)
        {
            bool unlocked = total >= opt.starsToUnlock;
            bool isEquipped = opt.key == equipped;
            b.interactable = unlocked;
            var img = b.GetComponent<Image>();
            if (img != null) img.color = !unlocked ? Dim : (isEquipped ? Gold : Color.white);
            var label = b.GetComponentInChildren<Text>();
            if (label != null)
                label.text = unlocked ? (isEquipped ? opt.label + "  ✓" : opt.label) : opt.starsToUnlock + "★";
        }

        void EquipTrail(int i)
        {
            if (Cosmetics.TotalStars() < Cosmetics.Trails[i].starsToUnlock) return;
            Cosmetics.Trail = Cosmetics.Trails[i].key;
            SaveService.Data.trailCosmetic = Cosmetics.Trail;
            SaveService.Flush();
            RefreshGrove();
        }

        void EquipCore(int i)
        {
            if (Cosmetics.TotalStars() < Cosmetics.Cores[i].starsToUnlock) return;
            Cosmetics.Core = Cosmetics.Cores[i].key;
            SaveService.Data.coreCosmetic = Cosmetics.Core;
            SaveService.Flush();
            RefreshGrove();
        }

        void OnResetTapped()
        {
            if (!_resetArmed)
            {
                _resetArmed = true;
                if (_resetL != null) _resetL.text = "TAP AGAIN TO CONFIRM";
                return;
            }
            var s = SaveService.Data;
            s.stars = new int[16];
            s.bestEndless = 0;
            s.dailyKey = "";
            s.dailyBest = 0;
            s.trailCosmetic = "wisp";
            s.coreCosmetic = "classic";
            SaveService.Flush();
            Cosmetics.LoadFromSave();
            RefreshSettings();
        }

        // ----- helpers -------------------------------------------------------

        static string OnOff(bool on) => on ? "ON" : "OFF";

        static string StarString(int stars)
        {
            string s = "";
            for (int i = 0; i < 3; i++) s += i < stars ? "★" : "☆";
            return s;
        }

        GameObject Screen(string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(_root.transform, false);
            Stretch((RectTransform)go.transform);

            // Painted sky on its own child so the slow Ken-Burns zoom never
            // drags the buttons/labels (which are added to the root above it).
            var skyGo = new GameObject("Sky", typeof(RectTransform));
            skyGo.transform.SetParent(go.transform, false);
            Stretch((RectTransform)skyGo.transform);
            var img = skyGo.AddComponent<Image>();
            var sky = Wispbloom.View.PaintedResources.Title();
            if (sky != null)
            {
                img.sprite = sky; img.type = Image.Type.Simple;
                img.color = new Color(0.72f, 0.76f, 0.9f, 1f);   // slight cool darken for text contrast
            }
            else if (_art.backgroundDawn != null)
            {
                img.sprite = _art.backgroundDawn; img.type = Image.Type.Simple;
                img.color = new Color(0.16f, 0.2f, 0.32f, 1f);
            }
            else img.color = new Color(0.03f, 0.05f, 0.12f, 0.97f);
            var kb = skyGo.AddComponent<UiFx>();
            kb.baseScale = 1.06f; kb.kenBurns = 0.035f;

            go.SetActive(false);
            return go;
        }

        Image Accent(Transform parent, Sprite sprite, float ax, float ay, float x, float y, float size, Color color)
        {
            var go = new GameObject("Accent", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(ax, ay);
            rt.anchoredPosition = new Vector2(x, y);
            rt.sizeDelta = new Vector2(size, size);
            var img = go.AddComponent<Image>();
            img.sprite = sprite;
            img.color = color;
            img.raycastTarget = false;
            return img;
        }

        Text Toggle(Transform parent, float y, UnityAction onClick)
        {
            var b = Button(parent, "", 0.5f, 0.5f, 0, y, 760, 150, 40, onClick);
            return b.GetComponentInChildren<Text>();
        }

        Text Label(Transform parent, string text, float ax, float ay, float x, float y, int size, TextAnchor align, Color color)
        {
            var go = new GameObject("Label", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(ax, ay);
            rt.anchoredPosition = new Vector2(x, y);
            rt.sizeDelta = new Vector2(1000, 160);
            var label = go.AddComponent<Text>();
            label.font = _font;
            label.text = text;
            label.fontSize = size;
            label.fontStyle = FontStyle.Bold;
            label.alignment = align;
            label.color = color;
            label.horizontalOverflow = HorizontalWrapMode.Overflow;
            label.verticalOverflow = VerticalWrapMode.Overflow;
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0.08f, 0.7f);
            shadow.effectDistance = new Vector2(2f, -2f);
            return label;
        }

        Button Button(Transform parent, string text, float ax, float ay, float x, float y, float w, float h, int size, UnityAction onClick)
        {
            var go = new GameObject("Button", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(ax, ay);
            rt.anchoredPosition = new Vector2(x, y);
            rt.sizeDelta = new Vector2(w, h);
            var img = go.AddComponent<Image>();
            img.sprite = _panel;
            img.type = Image.Type.Sliced;
            var btn = go.AddComponent<Button>();
            var colors = btn.colors;
            colors.highlightedColor = new Color(1.15f, 1.15f, 1.25f);
            colors.pressedColor = new Color(0.8f, 0.85f, 1f);
            btn.colors = colors;
            btn.onClick.AddListener(onClick);
            var label = Label(go.transform, text, 0.5f, 0.5f, 0, 0, size, TextAnchor.MiddleCenter, Ink);
            label.rectTransform.sizeDelta = new Vector2(w, h);
            return btn;
        }

        static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }
    }
}
