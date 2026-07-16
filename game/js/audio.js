/* Wispbloom — audio.js
 * All sound is synthesized with WebAudio, so the prototype ships with
 * zero audio asset files. Each method below is a placeholder voice that
 * can later be swapped for recorded samples (see README "Replacing
 * placeholder assets").
 */
'use strict';
(function (WB) {

  // Pentatonic scale used for matches/chains so chains always sound musical.
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0, 880.0];

  class AudioSys {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.musicNodes = [];
      this.musicTimer = null;
      this.unlocked = false;
    }

    // Must be called from a user gesture (Android/Chrome autoplay policy).
    unlock() {
      if (this.unlocked) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.0;
        this.musicGain.connect(this.master);
        this.unlocked = true;
        this.startMusic();
      } catch (e) { /* audio is best-effort */ }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    suspend() {
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    }

    get sfxOn() { return WB.save.data.settings.sound; }
    get musicOn() { return WB.save.data.settings.music; }

    // --- tiny synth building blocks -------------------------------------
    tone(freq, dur, type, vol, when, slide) {
      if (!this.unlocked || !this.sfxOn) return;
      const t0 = this.ctx.currentTime + (when || 0);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }

    noise(dur, vol, freq, when) {
      if (!this.unlocked || !this.sfxOn) return;
      const t0 = this.ctx.currentTime + (when || 0);
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq || 1200;
      f.Q.value = 0.8;
      const g = this.ctx.createGain();
      g.gain.value = vol || 0.15;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    }

    // --- game voices ------------------------------------------------------
    shoot()  { this.tone(520, 0.12, 'triangle', 0.18, 0, 880); this.noise(0.06, 0.05, 2400); }
    swap()   { this.tone(340, 0.08, 'sine', 0.14, 0, 480); }
    attach() { this.tone(220, 0.09, 'sine', 0.2, 0, 180); this.noise(0.04, 0.08, 900); }
    bounce() { this.tone(140, 0.1, 'square', 0.08, 0, 90); }

    match(combo) {
      const base = WB.clamp(combo - 1, 0, 5);
      for (let i = 0; i < 3; i++) {
        this.tone(SCALE[(base + i) % SCALE.length] * 2, 0.22, 'sine', 0.16, i * 0.05);
      }
      this.noise(0.12, 0.1, 1800);
    }

    shift()   { this.tone(180, 0.4, 'sawtooth', 0.07, 0, 420); this.tone(90, 0.4, 'sine', 0.12, 0, 200); }
    power()   { for (let i = 0; i < 5; i++) this.tone(SCALE[i + 3] * 2, 0.3, 'triangle', 0.12, i * 0.04); this.noise(0.25, 0.12, 2600); }
    warn()    { this.tone(660, 0.09, 'square', 0.06); this.tone(660, 0.09, 'square', 0.06, 0.14); }
    bossHit() { this.tone(110, 0.25, 'sawtooth', 0.16, 0, 55); this.noise(0.15, 0.16, 600); }
    button()  { this.tone(700, 0.06, 'sine', 0.1, 0, 900); }

    win() {
      const notes = [0, 2, 4, 6, 8];
      notes.forEach((n, i) => this.tone(SCALE[n] * 2, 0.5, 'sine', 0.14, i * 0.11));
      this.noise(0.4, 0.08, 3000, 0.3);
    }

    lose() {
      this.tone(300, 0.5, 'sine', 0.14, 0, 120);
      this.tone(220, 0.7, 'sine', 0.12, 0.15, 80);
    }

    // --- ambient music: soft evolving pad + sparse pentatonic plucks ------
    startMusic() {
      if (!this.unlocked) return;
      this.stopMusic();
      const ctx = this.ctx;
      const pad = ctx.createGain();
      pad.gain.value = 0.05;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 500;
      pad.connect(filt); filt.connect(this.musicGain);
      [65.4, 98.0, 130.8].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f * (1 + (i - 1) * 0.0015);
        o.connect(pad);
        o.start();
        this.musicNodes.push(o);
      });
      // Slow LFO breathing on the pad.
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoG.gain.value = 0.025;
      lfo.connect(lfoG); lfoG.connect(pad.gain);
      lfo.start();
      this.musicNodes.push(lfo);

      const pluck = () => {
        if (!this.unlocked) return;
        if (this.musicOn && Math.random() < 0.7) {
          const f = SCALE[Math.floor(Math.random() * 6)];
          const t0 = ctx.currentTime;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
          o.connect(g); g.connect(this.musicGain);
          o.start(t0); o.stop(t0 + 2.4);
        }
        this.musicTimer = setTimeout(pluck, 1600 + Math.random() * 2600);
      };
      pluck();
      this.applyMusicSetting();
    }

    applyMusicSetting() {
      if (!this.unlocked) return;
      const target = this.musicOn ? 1.0 : 0.0;
      this.musicGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.6);
    }

    stopMusic() {
      this.musicNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      this.musicNodes = [];
      if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; }
    }
  }

  WB.audio = new AudioSys();
})(window.WB);
