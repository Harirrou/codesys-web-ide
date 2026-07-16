/* Wispbloom — util.js
 * Small shared helpers: math, angles, RNG, easing.
 * Everything lives on the global WB namespace (classic scripts,
 * so the game works from file:// inside the Android WebView).
 */
'use strict';
window.WB = window.WB || {};

(function (WB) {
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  // Normalize angle into [0, TAU)
  function angNorm(a) {
    a %= TAU;
    return a < 0 ? a + TAU : a;
  }

  // Shortest signed difference from a to b, in (-PI, PI]
  function angDiff(a, b) {
    let d = angNorm(b - a);
    if (d > Math.PI) d -= TAU;
    return d;
  }

  // Deterministic RNG (mulberry32) for daily challenges / repeatable levels.
  function rngFromSeed(seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dailyKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dailySeed() {
    const k = dailyKey();
    let h = 2166136261;
    for (let i = 0; i < k.length; i++) {
      h ^= k.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Easing
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // Rounded rectangle path helper
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function inRect(px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function vibrate(ms) {
    if (!WB.save || !WB.save.data.settings.vibration) return;
    try {
      if (window.WispbloomAndroid && window.WispbloomAndroid.vibrate) {
        window.WispbloomAndroid.vibrate(ms);
      } else if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (e) { /* vibration is best-effort */ }
  }

  WB.TAU = TAU;
  WB.clamp = clamp;
  WB.lerp = lerp;
  WB.dist = dist;
  WB.angNorm = angNorm;
  WB.angDiff = angDiff;
  WB.rngFromSeed = rngFromSeed;
  WB.dailyKey = dailyKey;
  WB.dailySeed = dailySeed;
  WB.easeOutCubic = easeOutCubic;
  WB.easeOutBack = easeOutBack;
  WB.easeInOut = easeInOut;
  WB.roundRect = roundRect;
  WB.inRect = inRect;
  WB.hexToRgba = hexToRgba;
  WB.vibrate = vibrate;
})(window.WB);
