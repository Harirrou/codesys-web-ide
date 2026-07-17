// Wispbloom — one orbit track as magical energy: painted base band (tiled
// energy texture on a baked ring mesh with a scrolling flow shader), sparse
// spark particles riding the path, and a soft under-glow. No line circles.
using UnityEngine;
using Wispbloom.Data;
using Wispbloom.Sim;

namespace Wispbloom.View
{
    public class RingView : MonoBehaviour
    {
        Ring _ring;
        Material _flowMat;
        ParticleSystem _sparks;

        public static RingView Create(Transform parent, Ring ring, ArtBinding art, GameTuning tuning)
        {
            var go = new GameObject($"Ring{ring.Index}");
            go.transform.SetParent(parent, false);
            var v = go.AddComponent<RingView>();
            v._ring = ring;

            // Base band: ring mesh with the orbit energy texture flowing along it.
            var mf = go.AddComponent<MeshFilter>();
            var mr = go.AddComponent<MeshRenderer>();
            mf.sharedMesh = BuildRingMesh(ring.Radius, 0.16f, 96);
            v._flowMat = new Material(MaterialLibrary.OrbitFlow);
            v._flowMat.mainTexture = art.orbitTile != null ? art.orbitTile.texture : null;
            mr.sharedMaterial = v._flowMat;
            mr.sortingOrder = 4 + ring.Index;

            // Depth separation: outer rings slightly dimmer + cooler.
            float depth = 1f - ring.Index * 0.12f;
            v._flowMat.SetColor("_Tint", new Color(0.85f * depth + 0.15f, 0.92f * depth + 0.08f, 1f, 0.85f));

            // Sparse crystal sparks orbiting with the ring.
            var sparksGo = new GameObject("Sparks");
            sparksGo.transform.SetParent(go.transform, false);
            v._sparks = sparksGo.AddComponent<ParticleSystem>();
            var main = v._sparks.main;
            main.startLifetime = 4f;
            main.startSpeed = 0f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.03f, 0.08f);
            main.startColor = new Color(0.9f, 0.96f, 1f, 0.8f);
            main.maxParticles = 40;
            main.simulationSpace = ParticleSystemSimulationSpace.Local;
            var emission = v._sparks.emission;
            emission.rateOverTime = 6f;
            var shape = v._sparks.shape;
            shape.shapeType = ParticleSystemShapeType.Circle;
            shape.radius = ring.Radius;
            shape.radiusThickness = 0.02f;
            var psr = sparksGo.GetComponent<ParticleSystemRenderer>();
            psr.material = MaterialLibrary.Additive;
            psr.sortingOrder = 6 + ring.Index;
            if (art.sparkle != null)
            {
                psr.renderMode = ParticleSystemRenderMode.Billboard;
                var tsa = v._sparks.textureSheetAnimation;
                psr.material.mainTexture = art.sparkle.texture;
            }
            return v;
        }

        void Update()
        {
            if (_ring == null) return;
            // Scroll direction/speed mirrors ring motion; occasional pulse.
            float flow = _ring.Direction * _ring.Speed;
            _flowMat.SetFloat("_Scroll", _flowMat.GetFloat("_Scroll") + flow * Time.deltaTime * 0.5f);
            float crowd = _ring.Pieces.Count / (float)_ring.Capacity;
            float danger = Mathf.Clamp01((crowd - 0.78f) / 0.22f);
            _flowMat.SetFloat("_Danger", danger);
            _flowMat.SetFloat("_Pulse", 0.5f + 0.5f * Mathf.Sin(Time.time * (1.4f + danger * 4f)));
        }

        /// <summary>Flat ring (annulus) mesh with U wrapping around the circle
        /// so a horizontal texture tiles along the track.</summary>
        static Mesh BuildRingMesh(float radius, float halfWidth, int segments)
        {
            var mesh = new Mesh { name = "OrbitRing" };
            var verts = new Vector3[(segments + 1) * 2];
            var uvs = new Vector2[verts.Length];
            var tris = new int[segments * 6];
            for (int i = 0; i <= segments; i++)
            {
                float a = i / (float)segments * Mathf.PI * 2f;
                var dir = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f);
                verts[i * 2] = dir * (radius - halfWidth);
                verts[i * 2 + 1] = dir * (radius + halfWidth);
                float u = i / (float)segments * 6f;   // texture repeats 6x around
                uvs[i * 2] = new Vector2(u, 0f);
                uvs[i * 2 + 1] = new Vector2(u, 1f);
                if (i < segments)
                {
                    int t = i * 6, b = i * 2;
                    tris[t] = b; tris[t + 1] = b + 1; tris[t + 2] = b + 2;
                    tris[t + 3] = b + 1; tris[t + 4] = b + 3; tris[t + 5] = b + 2;
                }
            }
            mesh.vertices = verts;
            mesh.uv = uvs;
            mesh.triangles = tris;
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
