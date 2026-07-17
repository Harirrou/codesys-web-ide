// Wispbloom — the single indirection between gameplay prefabs and art.
// Placeholder sprites and final painted sprites are swapped HERE (or by the
// PaintedArtFetcher), never in gameplay code.
using UnityEngine;

namespace Wispbloom.Data
{
    [CreateAssetMenu(menuName = "Wispbloom/Art Binding", fileName = "ArtBinding")]
    public class ArtBinding : ScriptableObject
    {
        [Header("Spirits (index = SpiritColor: Tide, Blossom, Ember, Dusk)")]
        public Sprite[] spiritBodies = new Sprite[4];
        public Sprite spiritGlow;          // shared soft additive halo

        [Header("Flower core")]
        public Sprite flowerPetal;         // single petal, pivot at base
        public Sprite flowerHeart;         // additive heart glow

        [Header("Orbit track")]
        public Sprite orbitTile;           // horizontal energy band, tiles in X

        [Header("Effects")]
        public Sprite dustMote;            // soft round particle
        public Sprite sparkle;             // 4-point star particle

        [Header("Background (per world key)")]
        public Sprite backgroundDawn;

        [Header("UI")]
        public Sprite panelGlow9Slice;     // rounded glow panel/button
        public Font uiFont;

        public bool UsingPlaceholders =>
            spiritBodies[0] != null && spiritBodies[0].name.StartsWith("PLACEHOLDER");
    }
}
