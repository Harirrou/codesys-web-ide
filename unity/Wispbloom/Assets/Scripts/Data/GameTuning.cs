// Wispbloom — global balancing + presentation tuning in one asset.
using UnityEngine;
using Wispbloom.Sim;

namespace Wispbloom.Data
{
    [CreateAssetMenu(menuName = "Wispbloom/Game Tuning", fileName = "GameTuning")]
    public class GameTuning : ScriptableObject
    {
        [Header("Simulation (prototype-accurate defaults)")]
        public SimTuning sim = new SimTuning();

        [Header("Field layout (fractions of camera half-height)")]
        [Tooltip("Vertical field center, fraction of screen height from top")]
        public float fieldCenterY = 0.46f;
        public float coreRadiusFraction = 0.085f;
        public float pieceRadiusFraction = 0.0335f;
        public float outerRingFraction = 0.36f;

        [Header("Feel")]
        public float tapMaxScreenDistancePx = 22f;
        public AnimationCurve spiritBreath = AnimationCurve.EaseInOut(0, 0.97f, 1, 1.03f);
        public AnimationCurve popIn = new AnimationCurve(
            new Keyframe(0f, 0f), new Keyframe(0.7f, 1.08f), new Keyframe(1f, 1f));
        public float slowMoScale = 0.35f;
        public float shakeDecay = 3.5f;
    }
}
