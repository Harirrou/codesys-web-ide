// Wispbloom — authorable level data. One asset per level; mirrors the
// prototype's levels.js schema so content ports 1:1.
using UnityEngine;
using Wispbloom.Sim;

namespace Wispbloom.Data
{
    [CreateAssetMenu(menuName = "Wispbloom/Level Definition", fileName = "Level")]
    public class LevelDefinition : ScriptableObject
    {
        public string displayName = "First Light";
        public Objective objective = Objective.Bloom;
        [Tooltip("Bloom: energy target")] public int target = 20;
        [Tooltip("Survive: seconds")] public float surviveTime = 60f;
        [Range(2, 4)] public int colorCount = 3;
        public RingSpec[] rings;
        [Header("Spawner (0 interval = none)")]
        public float spawnInterval = 7f;
        public int[] spawnRings = { 1 };
        [Header("Orbit shifts, cycled round-robin per match")]
        public ShiftKind[] shifts;
        [Header("Stars")]
        public int star2Score = 1600;
        public int star3Score = 2600;
        [Header("Timed tutorial hints")]
        public Hint[] hints;

        [System.Serializable]
        public struct Hint { public float at; [TextArea] public string text; }

        public LevelSpec ToSpec(int? seed = null) => new LevelSpec
        {
            Name = displayName,
            Objective = objective,
            Target = target,
            SurviveTime = surviveTime,
            ColorCount = colorCount,
            Rings = rings,
            SpawnInterval = spawnInterval,
            SpawnRings = spawnRings ?? new int[0],
            Shifts = shifts ?? new ShiftKind[0],
            Star2Score = star2Score,
            Star3Score = star3Score,
            Seed = seed,
        };
    }
}
