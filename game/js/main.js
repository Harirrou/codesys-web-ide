/* Wispbloom — main.js
 * Bootstrap: canvas/DPR management, input wiring, the frame loop, and
 * app-lifecycle handling (backgrounding pauses gameplay and audio).
 */
'use strict';
(function (WB) {

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  WB.view = { w: 0, h: 0, dpr: 1 };

  // Painted world backgrounds. Preference order:
  //   1. window.WB_BG_DATA — data URIs injected by the single-file bundle
  //   2. hosted AI-painted art (Higgsfield) — best quality when online
  //   3. baked local art in img/ — always ships with the game
  // The procedural sky in ui.js covers the frames before anything loads.
  const BG_CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GCWeZZjU0NmAmmShhKAENmTFXd/';
  const BG_REMOTE = {
    title: 'hf_20260716_224156_1dee9484-f31e-4e2e-9387-1e1501445690.png',
    dawn: 'hf_20260716_224200_02c49906-6f8d-4bf7-a777-ca3703d05b67.png',
    dusk: 'hf_20260716_224202_d7f7e07d-dfc1-45e3-bc17-54c900429fe5.png',
    lair: 'hf_20260716_224206_787959a5-986b-4cf5-8dd6-ae39202adaf0.png',
  };
  WB.BG = {};
  Object.keys(BG_REMOTE).forEach((key) => {
    const img = new Image();
    if (window.WB_BG_DATA && window.WB_BG_DATA[key]) {
      img.src = window.WB_BG_DATA[key];
    } else {
      img.onerror = () => { img.onerror = null; img.src = 'img/bg-' + key + '.jpg'; };
      img.src = BG_CDN + BG_REMOTE[key];
    }
    WB.BG[key] = img;
  });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    WB.view.w = w;
    WB.view.h = h;
    WB.view.dpr = dpr;
    WB.ui.stars = null; // rebuild starfield for the new size
    if (WB.ui.game) WB.ui.game.layout(w, h);
    if (WB.ui.gameless) WB.ui.gameless.layout(w, h);
  }
  window.addEventListener('resize', resize);
  resize();

  // ----- input -------------------------------------------------------------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.changedTouches ? e.changedTouches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  let pointerActive = false;

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointerActive = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const p = pos(e);
    WB.ui.onDown(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointerActive) return;
    const p = pos(e);
    WB.ui.onMove(p.x, p.y);
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!pointerActive) return;
    pointerActive = false;
    const p = pos(e);
    WB.ui.onUp(p.x, p.y);
  });
  canvas.addEventListener('pointercancel', () => { pointerActive = false; });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  // ----- lifecycle -----------------------------------------------------------
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (WB.ui.screen === 'game' && WB.ui.game && !WB.ui.game.result) {
        WB.ui.paused = true;
      }
      WB.audio.suspend();
      WB.save.save();
    } else {
      WB.audio.resume();
    }
  });

  // Android back button (dispatched from MainActivity via evaluateJavascript).
  WB.handleBack = function () {
    const ui = WB.ui;
    if (ui.screen === 'game') {
      if (ui.paused) ui.quitToMenu();
      else ui.paused = true;
      return true;   // consumed
    }
    if (ui.screen !== 'title') {
      ui.goto('title');
      return true;
    }
    return false;    // let Android close the app
  };

  // ----- frame loop -----------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;  // clamp long frames (backgrounding, jank)
    ctx.clearRect(0, 0, WB.view.w, WB.view.h);
    WB.ui.frame(ctx, WB.view.w, WB.view.h, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})(window.WB);
