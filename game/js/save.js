/* Wispbloom — save.js
 * Local persistence via localStorage (works in browsers and in the
 * Android WebView because MainActivity enables DOM storage).
 */
'use strict';
(function (WB) {

  const KEY = 'wispbloom-save-v1';

  const DEFAULTS = {
    stars: {},          // levelId -> 0..3
    bestEndless: 0,
    daily: {},          // dateKey -> best score
    cosmetics: {
      trail: 'wisp',    // see WB.COSMETICS.trails
      core: 'classic',  // see WB.COSMETICS.cores
    },
    settings: {
      glyphs: false,     // colorblind ID badges on wisps (accessibility)
      sound: true,
      music: true,
      vibration: true,
      reduceMotion: false,
    },
  };

  class SaveSys {
    constructor() {
      this.data = JSON.parse(JSON.stringify(DEFAULTS));
      this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = Object.assign({}, DEFAULTS, parsed);
          this.data.settings = Object.assign({}, DEFAULTS.settings, parsed.settings || {});
          this.data.cosmetics = Object.assign({}, DEFAULTS.cosmetics, parsed.cosmetics || {});
        }
      } catch (e) { /* corrupted or unavailable storage: keep defaults */ }
    }

    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) { /* storage full/unavailable: play session still works */ }
    }

    totalStars() {
      let n = 0;
      for (const k in this.data.stars) n += this.data.stars[k];
      return n;
    }

    // A level is unlocked once the previous one has at least 1 star.
    isUnlocked(index) {
      if (index === 0) return true;
      return (this.data.stars[index - 1] || 0) > 0;
    }

    recordStars(levelIndex, stars) {
      const prev = this.data.stars[levelIndex] || 0;
      if (stars > prev) {
        this.data.stars[levelIndex] = stars;
        this.save();
      }
    }

    recordEndless(score) {
      if (score > this.data.bestEndless) {
        this.data.bestEndless = score;
        this.save();
        return true;
      }
      return false;
    }

    recordDaily(score) {
      const k = WB.dailyKey();
      // Keep only today's entry so the table never grows unbounded.
      const best = this.data.daily[k] || 0;
      if (score > best) {
        this.data.daily = {};
        this.data.daily[k] = score;
        this.save();
        return true;
      }
      return false;
    }

    dailyBest() {
      return this.data.daily[WB.dailyKey()] || 0;
    }
  }

  WB.save = new SaveSys();
})(window.WB);
