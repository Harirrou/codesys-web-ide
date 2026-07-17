// Wispbloom — pause modal: resume / restart / quick toggles. Freezes the
// game via Time.timeScale (GameController owns the state).
using UnityEngine;
using UnityEngine.UI;
using Wispbloom.Game;

namespace Wispbloom.UI
{
    public class PausePanel : MonoBehaviour
    {
        public Text soundLabel, musicLabel, vibrationLabel;
        GameController _game;

        public void Bind(GameController game) => _game = game;
        public void Show() { gameObject.SetActive(true); RefreshLabels(); }
        public void Hide() => gameObject.SetActive(false);

        void RefreshLabels()
        {
            var s = SaveService.Data;
            soundLabel.text = s.sound ? "♪ ON" : "♪ OFF";
            musicLabel.text = s.music ? "♫ ON" : "♫ OFF";
            vibrationLabel.text = s.vibration ? "≈ ON" : "≈ OFF";
        }

        public void OnResume() => _game.TogglePause(false);
        public void OnRestart() { _game.TogglePause(false); _game.Restart(); }
        public void OnToggleSound() { SaveService.Data.sound = !SaveService.Data.sound; SaveService.Flush(); RefreshLabels(); }
        public void OnToggleMusic()
        {
            SaveService.Data.music = !SaveService.Data.music;
            SaveService.Flush();
            _game.audioDirector.ApplyMusicSetting();
            RefreshLabels();
        }
        public void OnToggleVibration() { SaveService.Data.vibration = !SaveService.Data.vibration; SaveService.Flush(); RefreshLabels(); }
    }
}
