// Wispbloom — routes SimEvents to synthesized clips; honors save settings.
// Swapping to recorded audio later = assign clips in the inspector; the
// event vocabulary is final.
using UnityEngine;
using Wispbloom.Sim;

namespace Wispbloom.Game
{
    public class AudioDirector : MonoBehaviour
    {
        AudioSource _sfx;
        AudioSource _music;
        AudioClip _shoot, _swap, _attach, _shift, _power, _warn, _button, _win, _lose, _pad;
        AudioClip[] _match;

        void Awake()
        {
            _sfx = gameObject.AddComponent<AudioSource>();
            _music = gameObject.AddComponent<AudioSource>();
            _music.loop = true;
            _shoot = AudioSynth.Shoot();
            _swap = AudioSynth.Swap();
            _attach = AudioSynth.Attach();
            _shift = AudioSynth.Shift();
            _power = AudioSynth.Power();
            _warn = AudioSynth.Warn();
            _button = AudioSynth.Button();
            _win = AudioSynth.Win();
            _lose = AudioSynth.Lose();
            _pad = AudioSynth.PadLoop();
            _match = new AudioClip[6];
            for (int i = 0; i < 6; i++) _match[i] = AudioSynth.Match(i + 1);

            _music.clip = _pad;
            _music.volume = SaveService.Data.music ? 1f : 0f;
            _music.Play();
        }

        public void Bind(SimEvents e)
        {
            e.Shot += _ => Play(_shoot);
            e.Swapped += () => Play(_swap);
            e.Attached += (_, _, _, _) => Play(_attach);
            e.Burst += (_, _, combo, _) => Play(_match[Mathf.Clamp(combo - 1, 0, 5)]);
            e.Shift += (_, _) => Play(_shift);
            e.PrismEarned += () => Play(_power);
            e.SpawnWarning += _ => Play(_warn);
            e.Won += () => Play(_win);
            e.Lost += () => Play(_lose);
        }

        public void PlayPower() => Play(_power);
        public void PlayButton() => Play(_button);

        void Play(AudioClip clip)
        {
            if (!SaveService.Data.sound) return;
            _sfx.PlayOneShot(clip, 0.9f);
        }

        public void ApplyMusicSetting() => _music.volume = SaveService.Data.music ? 1f : 0f;
    }
}
