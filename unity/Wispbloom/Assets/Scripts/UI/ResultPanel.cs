// Wispbloom — win/lose sequence: animated stars, score, thresholds,
// replay/next actions. Mirrors the prototype's result overlay.
using UnityEngine;
using UnityEngine.UI;
using Wispbloom.Game;
using Wispbloom.Sim;

namespace Wispbloom.UI
{
    public class ResultPanel : MonoBehaviour
    {
        public Text titleText;
        public Text scoreText;
        public Text thresholdText;
        public Image[] starImages = new Image[3];
        public Button nextButton;
        public Button menuButton;

        GameController _game;
        float _shownAt;
        int _stars;

        public void Bind(GameController game) => _game = game;
        public void Hide() => gameObject.SetActive(false);

        public void Show(GameSim sim)
        {
            gameObject.SetActive(true);
            _shownAt = Time.unscaledTime;
            bool won = sim.Result == GameResult.Won;
            _stars = sim.Stars();
            titleText.text = won ? "The Garden Blooms!" : "Overgrown…";
            titleText.color = won ? new Color(0.78f, 0.97f, 0.85f) : new Color(1f, 0.73f, 0.77f);
            scoreText.text = $"Score  {sim.Score}";
            thresholdText.text = won
                ? $"2★ at {sim.Level.Star2Score}   •   3★ at {sim.Level.Star3Score}"
                : "Keep any orbit from overgrowing";
            // Star progress is recorded by the GameController (it knows the
            // real level index, endless best and daily best).
            if (nextButton != null)
                nextButton.gameObject.SetActive(won && _game != null && _game.HasNextLevel);
        }

        void Update()
        {
            // Stars pop in one by one, prototype-style.
            float t = (Time.unscaledTime - _shownAt) / 1.2f;
            for (int i = 0; i < 3; i++)
            {
                bool earned = i < _stars && t > (i + 1) / 3f;
                starImages[i].color = earned
                    ? new Color(1f, 0.85f, 0.41f)
                    : new Color(0.45f, 0.5f, 0.7f, 0.35f);
                if (earned)
                {
                    float pop = Mathf.Clamp01((t - (i + 1) / 3f) * 6f);
                    starImages[i].rectTransform.localScale =
                        Vector3.one * (1f + (1f - pop) * 0.6f);
                }
            }
        }

        public void OnReplay() => _game.Restart();
        public void OnNext() => _game.PlayNextLevel();
        public void OnMenu() => _game.ReturnToMenu();
    }
}
