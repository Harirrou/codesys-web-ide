// Wispbloom — minimal gameplay HUD: pause, objective pill, score, PULSE
// meter, shift banners, toasts, level-name intro, danger flash.
using UnityEngine;
using UnityEngine.UI;
using Wispbloom.Sim;

namespace Wispbloom.UI
{
    public class HudView : MonoBehaviour
    {
        public Text objectiveText;
        public Text scoreText;
        public Text bannerText;
        public Text levelNameText;
        public Image pulseFill;
        public Text pulseLabel;
        public Image dangerVignette;

        Game.GameController _game;
        float _bannerT, _nameT, _dangerT;

        public void Bind(Game.GameController game) => _game = game;

        public void Refresh(GameSim sim)
        {
            objectiveText.text = sim.Level.Objective switch
            {
                Objective.Bloom => $"✿  {sim.Energy} / {sim.Level.Target}",
                Objective.Cleanse => $"☘  {sim.CleanseTarget - sim.Cleansed} left",
                Objective.Survive => $"⏳  {Mathf.Max(0, Mathf.CeilToInt(sim.Level.SurviveTime - sim.Time))}s",
                _ => $"✦  {Mathf.FloorToInt(sim.Time)}s",
            };
            scoreText.text = sim.Score.ToString();
            pulseFill.fillAmount = sim.Ability / (float)sim.Tune.PulseMeterMax;
            pulseLabel.text = sim.PulseIsArmed ? "ARMED" : "PULSE";

            if (_bannerT > 0) { _bannerT -= Time.unscaledDeltaTime; if (_bannerT <= 0) bannerText.enabled = false; }
            if (_nameT > 0)
            {
                _nameT -= Time.unscaledDeltaTime;
                var c = levelNameText.color;
                levelNameText.color = new Color(c.r, c.g, c.b, Mathf.Clamp01(_nameT));
                if (_nameT <= 0) levelNameText.enabled = false;
            }
            _dangerT = Mathf.Max(0f, _dangerT - Time.unscaledDeltaTime);
            float pulse = 0.5f + 0.5f * Mathf.Sin(Time.unscaledTime * 6f);
            dangerVignette.color = new Color(1f, 0.25f, 0.35f, _dangerT > 0 ? 0.10f + 0.12f * pulse : 0f);
        }

        static readonly string[] ShiftLabels =
            { "ORBIT REVERSED", "SURGE!", "WISPS LEAP", "THE GARDEN RESTS", "PORTALS OPEN" };

        public void ShowShiftBanner(ShiftKind kind) => Toast(ShiftLabels[(int)kind]);

        public void Toast(string text)
        {
            bannerText.text = text;
            bannerText.enabled = true;
            _bannerT = 1.6f;
        }

        public void ShowLevelName(string name)
        {
            levelNameText.text = name;
            levelNameText.enabled = true;
            _nameT = 2.6f;
        }

        public void PulseDanger() => _dangerT = 1.4f;

        // UI events (wired by the bootstrap)
        public void OnPausePressed() => _game.TogglePause(true);
        public void OnPulsePressed() => _game.ArmPulse();
    }
}
