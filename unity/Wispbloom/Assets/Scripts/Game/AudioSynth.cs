// Wispbloom — the prototype's WebAudio synth ported to baked AudioClips.
// Every SFX is generated as PCM at boot (zero audio assets); the pentatonic
// chain melodies are identical to the web version. AudioDirector routes the
// SimEvents vocabulary onto these clips.
using System;
using UnityEngine;

namespace Wispbloom.Game
{
    public static class AudioSynth
    {
        const int SR = 44100;
        static readonly float[] Scale =
            { 261.63f, 293.66f, 329.63f, 392.0f, 440.0f, 523.25f, 587.33f, 659.25f, 784.0f, 880.0f };

        public static AudioClip Shoot() => Render(0.2f, (t, add) =>
        {
            add(Tone(t, Slide(520f, 880f, t / 0.12f), Wave.Triangle, Env(t, 0.12f)) * 0.5f);
            add(Noise(t) * Env(t, 0.06f) * 0.15f);
        });

        public static AudioClip Swap() => Render(0.1f, (t, add) =>
            add(Tone(t, Slide(340f, 480f, t / 0.08f), Wave.Sine, Env(t, 0.08f)) * 0.4f));

        public static AudioClip Attach() => Render(0.12f, (t, add) =>
        {
            add(Tone(t, Slide(220f, 180f, t / 0.09f), Wave.Sine, Env(t, 0.09f)) * 0.55f);
            add(Noise(t) * Env(t, 0.04f) * 0.2f);
        });

        public static AudioClip Match(int combo) => Render(0.42f, (t, add) =>
        {
            int baseN = Math.Clamp(combo - 1, 0, 5);
            for (int i = 0; i < 3; i++)
            {
                float start = i * 0.05f;
                if (t < start) continue;
                float lt = t - start;
                add(Tone(lt, Scale[(baseN + i) % Scale.Length] * 2f, Wave.Sine, Env(lt, 0.22f)) * 0.4f);
            }
            add(Noise(t) * Env(t, 0.12f) * 0.18f);
        });

        public static AudioClip Shift() => Render(0.45f, (t, add) =>
        {
            add(Tone(t, Slide(180f, 420f, t / 0.4f), Wave.Saw, Env(t, 0.4f)) * 0.18f);
            add(Tone(t, Slide(90f, 200f, t / 0.4f), Wave.Sine, Env(t, 0.4f)) * 0.3f);
        });

        public static AudioClip Power() => Render(0.5f, (t, add) =>
        {
            for (int i = 0; i < 5; i++)
            {
                float start = i * 0.04f;
                if (t < start) continue;
                float lt = t - start;
                add(Tone(lt, Scale[(i + 3) % Scale.Length] * 2f, Wave.Triangle, Env(lt, 0.3f)) * 0.3f);
            }
        });

        public static AudioClip Warn() => Render(0.26f, (t, add) =>
        {
            float lt = t < 0.14f ? t : t - 0.14f;
            add(Tone(lt, 660f, Wave.Square, Env(lt, 0.09f)) * 0.14f);
        });

        public static AudioClip Button() => Render(0.08f, (t, add) =>
            add(Tone(t, Slide(700f, 900f, t / 0.06f), Wave.Sine, Env(t, 0.06f)) * 0.3f));

        public static AudioClip Win() => Render(1.1f, (t, add) =>
        {
            int[] notes = { 0, 2, 4, 6, 8 };
            for (int i = 0; i < notes.Length; i++)
            {
                float start = i * 0.11f;
                if (t < start) continue;
                float lt = t - start;
                add(Tone(lt, Scale[notes[i]] * 2f, Wave.Sine, Env(lt, 0.5f)) * 0.35f);
            }
        });

        public static AudioClip Lose() => Render(0.9f, (t, add) =>
        {
            add(Tone(t, Slide(300f, 120f, t / 0.5f), Wave.Sine, Env(t, 0.5f)) * 0.4f);
            if (t > 0.15f)
            {
                float lt = t - 0.15f;
                add(Tone(lt, Slide(220f, 80f, lt / 0.7f), Wave.Sine, Env(lt, 0.7f)) * 0.35f);
            }
        });

        /// <summary>Looping ambient pad: three detuned sines through a slow
        /// amplitude LFO — the web version's music bed.</summary>
        public static AudioClip PadLoop()
        {
            const float dur = 8f;
            int n = (int)(SR * dur);
            var data = new float[n];
            float[] freqs = { 65.4f, 98.0f, 130.8f };
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float lfo = 0.75f + 0.25f * Mathf.Sin(t / dur * 2f * Mathf.PI); // loop-safe LFO
                float v = 0f;
                for (int f = 0; f < 3; f++)
                    v += Mathf.Sin(2f * Mathf.PI * freqs[f] * (1f + (f - 1) * 0.0015f) * t) * (f == 2 ? 0.5f : 1f);
                data[i] = v / 3f * 0.055f * lfo;
            }
            var clip = AudioClip.Create("wb_pad", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

        // ----- tiny synth kernel --------------------------------------------
        enum Wave { Sine, Triangle, Square, Saw }

        static AudioClip Render(float dur, Action<float, Action<float>> gen)
        {
            int n = (int)(SR * dur);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float acc = 0f;
                gen(t, v => acc += v);
                data[i] = Mathf.Clamp(acc, -1f, 1f);
            }
            var clip = AudioClip.Create("wb_sfx", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

        static float Tone(float t, float freq, Wave wave, float env)
        {
            float ph = 2f * Mathf.PI * freq * t;
            float v = wave switch
            {
                Wave.Triangle => Mathf.PingPong(ph / Mathf.PI, 2f) - 1f,
                Wave.Square => Mathf.Sign(Mathf.Sin(ph)) * 0.6f,
                Wave.Saw => (ph / Mathf.PI % 2f) - 1f,
                _ => Mathf.Sin(ph),
            };
            return v * env;
        }

        static float Slide(float from, float to, float k) => Mathf.Lerp(from, to, Mathf.Clamp01(k));
        static float Env(float t, float dur)
        {
            if (t >= dur) return 0f;
            float attack = Mathf.Clamp01(t / 0.012f);
            float release = 1f - t / dur;
            return attack * release * release;
        }

        static uint _noiseState = 22222;
        static float Noise(float _)
        {
            _noiseState = _noiseState * 1664525u + 1013904223u;
            return ((_noiseState >> 9) / 8388608f) - 1f;
        }
    }
}
