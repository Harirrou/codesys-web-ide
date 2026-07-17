/* Wispbloom — art.js (v2, reference-matched style)
 * Soft painterly blob spirits, a radiant white bloom, glowing ribbon
 * orbits — matched against the client's reference painting. The Umbra
 * Serpent renderer follows below.
 */
'use strict';
(function () {

  /* ---------- shared color helpers ---------- */
  function hexRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function hslRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) {
      t = ((t % 1) + 1) % 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  var WHITE = [255, 255, 255], INK = [24, 16, 40];

  function glyphPath(ctx, g, s) {
    ctx.beginPath();
    if (g === 'dot') {
      ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    } else if (g === 'diamond') {
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.78, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.78, 0);
      ctx.closePath();
    } else if (g === 'triangle') {
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.9, s * 0.7); ctx.lineTo(-s * 0.9, s * 0.7);
      ctx.closePath();
    } else if (g === 'cross') {
      var w = s * 0.34;
      ctx.moveTo(-w, -s); ctx.lineTo(w, -s); ctx.lineTo(w, -w); ctx.lineTo(s, -w);
      ctx.lineTo(s, w); ctx.lineTo(w, w); ctx.lineTo(w, s); ctx.lineTo(-w, s);
      ctx.lineTo(-w, w); ctx.lineTo(-s, w); ctx.lineTo(-s, -w); ctx.lineTo(-w, -w);
      ctx.closePath();
    }
  }

  /* =====================================================================
   * WISP — soft round spirit blob with a tiny curl tip and a minimal
   * kawaii face (small dark eyes, tiny mouth), heavy soft glow.
   * =================================================================== */
  window.WB_ART_WISP = function (ctx, o) {
    var r = o.r, t = o.t || 0;
    var main = hexRgb(o.main), dark = hexRgb(o.dark);

    if (o.prism) {
      var hue = (t * 50) % 360;
      main = hslRgb(hue, 0.7, 0.72);
      dark = hslRgb(hue + 40, 0.55, 0.42);
    }
    if (o.pulse) {
      main = [255, 250, 240];
      dark = [210, 190, 150];
    }
    var pale = mix(main, WHITE, 0.72);
    var deepEdge = mix(main, dark, o.corrupt ? 0.85 : 0.55);
    if (o.corrupt) {
      pale = mix(main, INK, 0.25);
      deepEdge = mix(dark, INK, 0.6);
    }

    var breathe = 1 + Math.sin(t * 1.8 + o.blink * 1.7) * 0.025;
    var R = r * breathe;

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;

    /* soft ambient glow */
    ctx.globalCompositeOperation = 'lighter';
    var halo = ctx.createRadialGradient(0, 0, R * 0.3, 0, 0, R * 2.4);
    halo.addColorStop(0, rgba(main, o.corrupt ? 0.16 : 0.3));
    halo.addColorStop(0.55, rgba(main, o.corrupt ? 0.06 : 0.12));
    halo.addColorStop(1, rgba(main, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, R * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    /* corrupt thorns, tucked behind the body */
    if (o.corrupt) {
      ctx.fillStyle = rgba(mix(dark, INK, 0.5), 1);
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * Math.PI * 2 - 0.4;
        var len = R * (0.32 + 0.16 * Math.sin(i * 2.7));
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-R * 0.16, R * 0.86);
        ctx.lineTo(0, R * 0.92 + len);
        ctx.lineTo(R * 0.16, R * 0.86);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    /* body: near-circle with a small curl tip at upper right */
    var curlA = -1.05 + Math.sin(t * 1.2 + o.blink) * 0.06; // tip wiggles gently
    ctx.beginPath();
    ctx.arc(0, 0, R, curlA + 0.55, curlA - 0.55 + Math.PI * 2);
    var tipX = Math.cos(curlA) * R * 1.42, tipY = Math.sin(curlA) * R * 1.42;
    var a1 = curlA - 0.55, a2 = curlA + 0.55;
    ctx.bezierCurveTo(
      Math.cos(a1) * R * 1.18, Math.sin(a1) * R * 1.18,
      tipX + Math.sin(curlA) * R * 0.34, tipY - Math.cos(curlA) * R * 0.34,
      tipX, tipY);
    ctx.bezierCurveTo(
      tipX - Math.sin(curlA) * R * 0.1, tipY + Math.cos(curlA) * R * 0.1,
      Math.cos(a2) * R * 1.05, Math.sin(a2) * R * 1.05,
      Math.cos(a2) * R, Math.sin(a2) * R);
    ctx.closePath();

    var body = ctx.createRadialGradient(-R * 0.32, -R * 0.38, R * 0.1, 0, R * 0.08, R * 1.35);
    body.addColorStop(0, rgba(pale, 1));
    body.addColorStop(0.45, rgba(main, 1));
    body.addColorStop(1, rgba(deepEdge, 1));
    ctx.fillStyle = body;
    ctx.fill();

    /* soft under-shadow inside the lower rim for roundness */
    var us = ctx.createRadialGradient(0, R * 0.55, R * 0.2, 0, R * 0.45, R * 1.05);
    us.addColorStop(0, rgba(deepEdge, 0));
    us.addColorStop(1, rgba(mix(deepEdge, INK, 0.35), 0.4));
    ctx.fillStyle = us;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    /* specular highlight */
    ctx.fillStyle = rgba(WHITE, o.corrupt ? 0.25 : 0.75);
    ctx.save();
    ctx.translate(-R * 0.38, -R * 0.44);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.28, R * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgba(WHITE, o.corrupt ? 0.15 : 0.5);
    ctx.beginPath();
    ctx.arc(-R * 0.05, -R * 0.6, R * 0.07, 0, Math.PI * 2);
    ctx.fill();

    /* face — tiny and minimal like the reference */
    var eyeY = -R * 0.02;
    var blink = Math.pow(Math.max(0, Math.sin((o.blink || 0) * 0.6)), 26);
    var eyeH = R * 0.115 * (1 - blink * 0.85);
    var faceInk = o.corrupt ? mix(main, WHITE, 0.35) : [42, 26, 54];
    if (o.corrupt) {
      /* narrowed glaring eyes */
      ctx.strokeStyle = rgba(faceInk, 0.95);
      ctx.lineWidth = Math.max(1, R * 0.09);
      ctx.lineCap = 'round';
      for (var s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.moveTo(s * R * 0.34, eyeY - R * 0.06 * s * 0.3 - R * 0.05);
        ctx.lineTo(s * R * 0.14, eyeY + R * 0.02);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = rgba(faceInk, 0.92);
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        ctx.beginPath();
        ctx.ellipse(s2 * R * 0.26, eyeY, R * 0.105, Math.max(0.6, eyeH), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      /* eye glints */
      if (blink < 0.5) {
        ctx.fillStyle = rgba(WHITE, 0.85);
        for (var s3 = -1; s3 <= 1; s3 += 2) {
          ctx.beginPath();
          ctx.arc(s3 * R * 0.26 - R * 0.035, eyeY - R * 0.04, R * 0.032, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* tiny mouth: happy 'o' */
      ctx.fillStyle = rgba(faceInk, 0.8);
      ctx.beginPath();
      ctx.ellipse(0, eyeY + R * 0.24, R * 0.075, R * 0.095, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* pulse: charge ring */
    if (o.pulse) {
      ctx.strokeStyle = rgba(WHITE, 0.7 + 0.2 * Math.sin(t * 6));
      ctx.lineWidth = Math.max(1, R * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.28, 0, Math.PI * 2);
      ctx.stroke();
    }
    /* prism: little sparkle at the tip */
    if (o.prism) {
      var sp = 0.7 + 0.3 * Math.sin(t * 5);
      ctx.strokeStyle = rgba(WHITE, 0.9);
      ctx.lineWidth = Math.max(1, R * 0.07);
      ctx.lineCap = 'round';
      ctx.save();
      ctx.translate(tipX * 0.92, tipY * 0.92);
      for (var k = 0; k < 4; k++) {
        var sa = k * Math.PI / 2 + t * 0.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa) * R * 0.1, Math.sin(sa) * R * 0.1);
        ctx.lineTo(Math.cos(sa) * R * 0.26 * sp, Math.sin(sa) * R * 0.26 * sp);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* optional colorblind glyph badge (settings toggle) */
    var wantGlyph = window.WB && WB.save && WB.save.data.settings.glyphs;
    if (wantGlyph && o.glyph && !o.pulse && r > 8) {
      ctx.save();
      ctx.translate(0, R * 0.55);
      ctx.fillStyle = o.corrupt ? rgba(main, 0.95) : 'rgba(30,20,48,0.6)';
      glyphPath(ctx, o.glyph, R * 0.2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  /* =====================================================================
   * CORE — radiant white night-bloom: two rows of sharp luminous petals
   * around a brilliant warm heart, like the reference painting.
   * =================================================================== */
  function petal(ctx, len, wid) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.28, wid * 0.72, -len * 0.75, 0, -len);
    ctx.bezierCurveTo(-wid * 0.72, -len * 0.75, -wid, -len * 0.28, 0, 0);
    ctx.closePath();
  }

  window.WB_ART_CORE = function (ctx, o) {
    var cx = o.cx, cy = o.cy, r = o.r, t = o.t || 0;
    var k = o.energyK == null ? 0.6 : o.energyK;
    var tintHex = (o.body && o.body[1]) || '#7ecbe8';
    var tint = hexRgb(tintHex);
    var cream = mix([255, 250, 236], tint, 0.16);      // petals: warm white + skin tint
    var warm = mix([255, 214, 140], tint, 0.25);       // heart warmth
    var glow = mix([255, 244, 220], tint, 0.3);

    ctx.save();
    ctx.translate(cx, cy);

    /* big soft bloom halo */
    ctx.globalCompositeOperation = 'lighter';
    var halo = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * (2.6 + k * 0.9));
    halo.addColorStop(0, rgba(glow, 0.34 + k * 0.2));
    halo.addColorStop(0.4, rgba(glow, 0.12 + k * 0.08));
    halo.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * (2.6 + k * 0.9), 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    var rot = t * 0.06;
    var outerLen = r * (1.85 + k * 0.45);
    var innerLen = r * (1.15 + k * 0.28);

    /* back row: 6 sharp petals */
    for (var i = 0; i < 6; i++) {
      var a = rot + (i / 6) * Math.PI * 2;
      var sway = 1 + Math.sin(t * 1.1 + i * 1.9) * 0.02;
      ctx.save();
      ctx.rotate(a);
      ctx.scale(1, sway);
      var pg = ctx.createLinearGradient(0, 0, 0, -outerLen);
      pg.addColorStop(0, rgba(warm, 0.95));
      pg.addColorStop(0.45, rgba(cream, 0.92));
      pg.addColorStop(1, rgba(mix(cream, WHITE, 0.5), 0.85));
      ctx.fillStyle = pg;
      petal(ctx, outerLen, r * 0.52);
      ctx.fill();
      ctx.restore();
    }
    /* front row: 6 shorter petals, offset 30° — brighter */
    for (var j = 0; j < 6; j++) {
      var a2 = rot + ((j + 0.5) / 6) * Math.PI * 2;
      var sway2 = 1 + Math.sin(t * 1.3 + j * 2.3) * 0.025;
      ctx.save();
      ctx.rotate(a2);
      ctx.scale(1, sway2);
      var pg2 = ctx.createLinearGradient(0, 0, 0, -innerLen);
      pg2.addColorStop(0, rgba(mix(warm, WHITE, 0.3), 1));
      pg2.addColorStop(1, rgba(WHITE, 0.95));
      ctx.fillStyle = pg2;
      petal(ctx, innerLen, r * 0.42);
      ctx.fill();
      ctx.restore();
    }

    /* warm petal-base shading so petals read as one bloom, not cutouts */
    var baseSh = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.05);
    baseSh.addColorStop(0, rgba(mix(warm, [255, 190, 110], 0.5), 0.55));
    baseSh.addColorStop(1, rgba(warm, 0));
    ctx.fillStyle = baseSh;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2); ctx.fill();

    /* brilliant golden heart */
    ctx.globalCompositeOperation = 'lighter';
    var heart = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.95);
    heart.addColorStop(0, 'rgba(255,252,240,' + (0.95 + k * 0.05) + ')');
    heart.addColorStop(0.35, rgba(mix([255, 216, 140], tint, 0.15), 0.8));
    heart.addColorStop(1, rgba(warm, 0));
    ctx.fillStyle = heart;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();
  };
})();
/* Wispbloom — Umbra Serpent boss renderer.
 * One creature: smoky violet-black body flowing through ring segments,
 * horned head with rose eyes, per-segment armored color shells + glyph badges.
 * ES2018, canvas 2D only. No shadowBlur; glow = radial gradients + 'lighter'.
 * Fully deterministic per (t, segments) — no randomness in draw path.
 *
 * Rev 2 (art-director notes):
 *  - body: 3 value bands (belly bounce / core shadow / lit band) + bloom rim
 *  - shells cast additive colored light onto the adjacent flesh (clipped)
 *  - severed ends get glowing rose wound caps, then taper into smoke
 *  - bigger dorsal fins + carved scale plates so it reads at thumbnail size
 */
(function () {
  'use strict';
  var TAU = Math.PI * 2;

  function lerp(a, b, u) { return a + (b - a) * u; }
  function fract(x) { return x - Math.floor(x); }
  function hash(n) { return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
  function hexRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }
  function rgba(hex, a) {
    var c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  window.WB_ART_SERPENT = function (ctx, o) {
    var cx = o.cx, cy = o.cy, R = o.ringR, t = o.t || 0;
    var segs = o.segments || [];
    var n = segs.length;
    if (!n) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- geometry -------------------------------------------------------
    function wob(a) { return Math.sin(a * 3 + t * 1.4) * 3.2 + Math.sin(a * 5 - t * 0.9) * 1.6; }
    function P(a) {
      var r = R + wob(a);
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    }
    function nodeR(i) { return segs[i].r * (i === 0 ? 1.45 : 1); }

    // links between consecutive segments (wraps around)
    var linkNext = [], linkPrev = [], gapArr = [];
    var i, j, k, q, u, a, w, p, nx, ny;
    for (i = 0; i < n; i++) { linkNext.push(false); linkPrev.push(false); gapArr.push(0); }
    for (i = 0; i < n && n > 1; i++) {
      j = (i + 1) % n;
      var g = ((segs[j].a - segs[i].a) % TAU + TAU) % TAU;
      gapArr[i] = g;
      if (g > 1e-4 && g < 1.2) { linkNext[i] = true; linkPrev[j] = true; }
    }
    var conns = [];
    for (i = 0; i < n; i++) {
      if (linkNext[i]) conns.push({ i: i, j: (i + 1) % n, a0: segs[i].a, a1: segs[i].a + gapArr[i] });
    }
    // if the tail wraps back around to meet the head while the head already
    // has a neck behind it, stop the tail short — almost biting its own tail
    for (k = 0; k < conns.length; k++) {
      if (conns[k].j === 0 && linkNext[0]) {
        conns[k].bite = true;
        conns[k].a1 -= Math.min(0.26, (conns[k].a1 - conns[k].a0) * 0.4);
      }
    }

    // head facing: away from the side its body attaches on
    var headA = segs[0].a;
    var headFwd = headA - Math.PI / 2;              // default: face decreasing angle
    if (n > 1 && !linkNext[0] && linkPrev[0]) headFwd = headA + Math.PI / 2;

    // --- shared gradients (few; unit gradients reused via transforms) ----
    // Cross-body cylinder shading. The body rides radius R (half-width ~22-27)
    // inside a gradient spanning R±60, so the stops below land as bands:
    //   belly bounce (inner) -> core shadow -> broad lit band -> rim falloff.
    var bodyGrad = ctx.createRadialGradient(cx, cy, Math.max(1, R - 60), cx, cy, R + 60);
    bodyGrad.addColorStop(0.00, '#050310');
    bodyGrad.addColorStop(0.27, '#0d0720');   // inner silhouette edge
    bodyGrad.addColorStop(0.35, '#2a1a4e');   // belly bounce light
    bodyGrad.addColorStop(0.46, '#140b28');   // core shadow band
    bodyGrad.addColorStop(0.60, '#4e3880');   // main lit band
    bodyGrad.addColorStop(0.70, '#6f55ab');   // approaching the rim
    bodyGrad.addColorStop(0.79, '#2a1950');
    bodyGrad.addColorStop(1.00, '#050310');

    // screen-space key light from upper-left, applied over the body
    var keyGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.7, cy + R);
    keyGrad.addColorStop(0.00, 'rgba(158,122,248,0.34)');
    keyGrad.addColorStop(0.45, 'rgba(120,90,210,0.08)');
    keyGrad.addColorStop(1.00, 'rgba(64,150,200,0.07)');

    var orbU = ctx.createRadialGradient(-0.34, -0.38, 0.05, 0, 0, 1.05);
    orbU.addColorStop(0.00, '#4d3878');
    orbU.addColorStop(0.30, '#2a1c4a');
    orbU.addColorStop(0.70, '#140d27');
    orbU.addColorStop(1.00, '#070411');

    // head skull gradient (unit, local head frame) — highlight placed so it
    // faces the SCREEN light (upper-left) regardless of head rotation
    var lightLocal = -2.35 - headFwd;
    var headU = ctx.createRadialGradient(
      Math.cos(lightLocal) * 0.55, Math.sin(lightLocal) * 0.55, 0.1, 0, 0, 1.75);
    headU.addColorStop(0.00, '#6d51a8');
    headU.addColorStop(0.30, '#453075');
    headU.addColorStop(0.65, '#241745');
    headU.addColorStop(1.00, '#120b26');
    // which side of the skull faces the screen light (for the rim stroke)
    var headMirror = Math.cos(headFwd) < 0 ? -1 : 1;

    var smokeU = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    smokeU.addColorStop(0.00, 'rgba(150,115,220,0.30)');
    smokeU.addColorStop(0.55, 'rgba(100,70,170,0.13)');
    smokeU.addColorStop(1.00, 'rgba(80,50,150,0)');

    var eyeU = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    eyeU.addColorStop(0.00, 'rgba(255,150,200,0.95)');
    eyeU.addColorStop(0.35, 'rgba(255,90,160,0.5)');
    eyeU.addColorStop(1.00, 'rgba(255,60,140,0)');

    var colorGlow = {};
    function glowFor(hex) {
      if (!colorGlow[hex]) {
        var g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g2.addColorStop(0.00, rgba(hex, 0.55));
        g2.addColorStop(0.45, rgba(hex, 0.22));
        g2.addColorStop(1.00, rgba(hex, 0));
        colorGlow[hex] = g2;
      }
      return colorGlow[hex];
    }

    function unitFill(grad, x, y, s, alpha, comp) {
      ctx.save();
      if (comp) ctx.globalCompositeOperation = comp;
      if (alpha != null) ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // --- ribbon helpers ---------------------------------------------------
    function ribbonPts(a0, a1, w0, w1, widen, pinch) {
      var N = 20, L = [], Rr = [];
      for (var qq = 0; qq <= N; qq++) {
        var uu = qq / N, aa = lerp(a0, a1, uu);
        var ww = lerp(w0, w1, uu) * (1 - pinch * Math.sin(uu * Math.PI)) * widen;
        var pp = P(aa);
        var nxx = Math.cos(aa), nyy = Math.sin(aa);
        L.push([pp.x + nxx * ww, pp.y + nyy * ww]);
        Rr.push([pp.x - nxx * ww, pp.y - nyy * ww]);
      }
      return { L: L, R: Rr };
    }
    function tracePoly(rb) {
      ctx.beginPath();
      ctx.moveTo(rb.L[0][0], rb.L[0][1]);
      for (var qq = 1; qq < rb.L.length; qq++) ctx.lineTo(rb.L[qq][0], rb.L[qq][1]);
      for (var q2 = rb.R.length - 1; q2 >= 0; q2--) ctx.lineTo(rb.R[q2][0], rb.R[q2][1]);
      ctx.closePath();
    }
    function traceLine(pts, from, to) {
      if (from == null) { from = 0; to = pts.length - 1; }
      ctx.beginPath();
      ctx.moveTo(pts[from][0], pts[from][1]);
      for (var qq = from + 1; qq <= to; qq++) ctx.lineTo(pts[qq][0], pts[qq][1]);
    }

    // --- 0. drifting spore motes around the orbit (atmosphere) -------------
    for (k = 0; k < 10; k++) {
      var ma = hash(k * 3 + 1) * TAU + t * (0.04 + hash(k) * 0.05) * (k % 2 ? 1 : -1);
      var mr = R + (hash(k * 7 + 2) - 0.5) * 90 + Math.sin(t * 0.7 + k * 1.7) * 12;
      var mx = cx + Math.cos(ma) * mr, my = cy + Math.sin(ma) * mr;
      var ms = 1.8 + hash(k * 11 + 5) * 3.2;
      var twk = 0.35 + 0.3 * Math.sin(t * 1.9 + k * 2.4);
      unitFill(smokeU, mx, my, ms * 2.4, twk, 'lighter');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(214,196,255,' + (twk * 0.9).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(mx, my, ms * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // --- 1. soft violet under-glow along the body -------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (k = 0; k < conns.length; k++) {
      var c0 = conns[k];
      ctx.fillStyle = 'rgba(110,78,205,0.10)';
      tracePoly(ribbonPts(c0.a0, c0.a1, nodeR(c0.i) * 0.9,
        c0.bite ? 4 : nodeR(c0.j) * 0.9, 2.1, 0));
      ctx.fill();
      ctx.fillStyle = 'rgba(126,92,222,0.13)';
      tracePoly(ribbonPts(c0.a0, c0.a1, nodeR(c0.i) * 0.9,
        c0.bite ? 4 : nodeR(c0.j) * 0.9, 1.45, 0));
      ctx.fill();
    }
    ctx.restore();
    for (i = 0; i < n; i++) {
      var pg = P(segs[i].a);
      unitFill(glowFor(segs[i].main), pg.x, pg.y, nodeR(i) * 2.3, segs[i].cracked ? 0.32 : 0.75, 'lighter');
    }

    // --- 2. smoke tails at severed ends ------------------------------------
    function smokeTail(idx, dir) {
      var r = nodeR(idx) * 0.72, a0 = segs[idx].a;
      var steps = 10, len = 0.40;
      var Lp = [], Rp = [];
      for (q = 0; q <= steps; q++) {
        u = q / steps; a = a0 + dir * len * u;
        w = r * (1 - u) * (1 - u * 0.25);
        p = P(a);
        var drift = u * u * 9 * Math.sin(t * 1.1 + idx * 2.0 + u * 4);
        nx = Math.cos(a); ny = Math.sin(a);
        var x = p.x + nx * drift, y = p.y + ny * drift;
        Lp.push([x + nx * w, y + ny * w]);
        Rp.push([x - nx * w, y - ny * w]);
      }
      ctx.save();
      ctx.fillStyle = bodyGrad;
      ctx.globalAlpha = 0.9;
      tracePoly({ L: Lp, R: Rp });
      ctx.fill();
      ctx.restore();
      for (var pf = 0; pf < 4; pf++) {
        var ua = a0 + dir * (len * 0.7 + 0.05 + pf * 0.085);
        var pp = P(ua);
        var off = Math.sin(t * 0.9 + pf * 1.7 + idx) * (4 + pf * 3.5);
        unitFill(smokeU, pp.x + Math.cos(ua) * off, pp.y + Math.sin(ua) * off,
          r * (0.75 - pf * 0.13), 0.9 - pf * 0.2, 'lighter');
      }
    }
    for (i = 0; i < n; i++) {
      if (i !== 0 && !linkPrev[i] && n > 1) smokeTail(i, -1);
      if (i !== 0 && !linkNext[i] && n > 1) smokeTail(i, 1);
    }

    // --- 3. body ribbons ----------------------------------------------------
    for (k = 0; k < conns.length; k++) {
      var c1 = conns[k];
      var w0 = nodeR(c1.i) * 0.88, w1 = c1.bite ? 3 : nodeR(c1.j) * 0.88;
      var rb = ribbonPts(c1.a0, c1.a1, w0, w1, 1, c1.bite ? 0.12 : 0.30);
      var span = c1.a1 - c1.a0;
      var Pi = P(c1.a0), Pj = P(c1.a1);
      ctx.save();
      // base smoky fill (banded cylinder shading baked into bodyGrad)
      ctx.fillStyle = bodyGrad;
      tracePoly(rb);
      ctx.fill();
      // carved scale plates: dark groove + lit tailward edge on the outer half
      var nR = Math.max(4, Math.round(span / 0.13));
      for (q = 1; q < nR; q++) {
        u = q / nR;
        a = lerp(c1.a0, c1.a1, u);
        w = lerp(w0, w1, u) * (1 - 0.30 * Math.sin(u * Math.PI)) * 0.92;
        p = P(a);
        nx = Math.cos(a); ny = Math.sin(a);
        var tx = -Math.sin(a), ty = Math.cos(a);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(4,2,10,0.38)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(p.x + nx * w, p.y + ny * w);
        ctx.quadraticCurveTo(
          p.x - tx * w * 0.24, p.y - ty * w * 0.24,
          p.x - nx * w, p.y - ny * w);
        ctx.stroke();
        // lit edge just tailward of the groove, outer half only
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(160,124,244,0.20)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x + nx * w * 0.96 + tx * 2.2, p.y + ny * w * 0.96 + ty * 2.2);
        ctx.quadraticCurveTo(
          p.x + nx * w * 0.45 + tx * 1.2, p.y + ny * w * 0.45 + ty * 1.2,
          p.x + tx * 0.6, p.y + ty * 0.6);
        ctx.stroke();
      }
      // ---- clipped light pass: orb color spill + painterly key light
      ctx.save();
      tracePoly(rb);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      // the shells cast light onto the flesh they sit in
      unitFill(glowFor(segs[c1.i].main), Pi.x, Pi.y, nodeR(c1.i) * 2.7,
        segs[c1.i].cracked ? 0.30 : 0.62, 'lighter');
      unitFill(glowFor(segs[c1.j].main), Pj.x, Pj.y, nodeR(c1.j) * 2.7,
        segs[c1.j].cracked ? 0.30 : 0.62, 'lighter');
      ctx.fillStyle = keyGrad;
      ctx.fillRect(cx - R - 80, cy - R - 80, (R + 80) * 2, (R + 80) * 2);
      ctx.restore();
      // outer rim light: soft bloom pass then crisp line
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(150,112,240,0.14)';
      ctx.lineWidth = 5.5;
      traceLine(rb.L);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(186,152,255,0.55)';
      ctx.lineWidth = 2.6;
      traceLine(rb.L);
      ctx.stroke();
      // rim picks up the shell color near each orb
      var seg4 = Math.max(2, Math.round(rb.L.length * 0.28));
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = rgba(segs[c1.i].main, segs[c1.i].cracked ? 0.18 : 0.4);
      traceLine(rb.L, 0, seg4);
      ctx.stroke();
      ctx.strokeStyle = rgba(segs[c1.j].main, segs[c1.j].cracked ? 0.18 : 0.4);
      traceLine(rb.L, rb.L.length - 1 - seg4, rb.L.length - 1);
      ctx.stroke();
      // faint cool reflected light on the belly edge
      ctx.strokeStyle = 'rgba(94,190,214,0.16)';
      ctx.lineWidth = 1.8;
      traceLine(rb.R);
      ctx.stroke();
      // inner shade just inside the belly silhouette (grounds the tube)
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 3;
      traceLine(rb.R);
      ctx.stroke();
      // smoke puffs where the tail-tip dissolves near the head
      if (c1.bite) {
        var tipP = P(c1.a1);
        unitFill(smokeU, tipP.x, tipP.y, 9, 0.95, 'lighter');
        for (var bp = 0; bp < 3; bp++) {
          var ba = c1.a1 + 0.045 + bp * 0.055;
          var bpp = P(ba);
          var boff = Math.sin(t * 1.0 + bp * 1.9) * (3 + bp * 2.5);
          unitFill(smokeU, bpp.x + Math.cos(ba) * boff, bpp.y + Math.sin(ba) * boff,
            8 - bp * 1.8, 0.85 - bp * 0.22, 'lighter');
        }
      }
      ctx.restore();
      // dorsal fins on the outer edge — big swept sails, alternating size
      ctx.save();
      for (var sq = 0; sq < 2; sq++) {
        var ut = sq === 0 ? 0.30 : 0.64;
        var ta = lerp(c1.a0, c1.a1, ut);
        var twd = lerp(w0, w1, ut) * (1 - 0.30 * Math.sin(ut * Math.PI));
        var tp = P(ta);
        var tnx = Math.cos(ta), tny = Math.sin(ta);
        var ttx = -Math.sin(ta), tty = Math.cos(ta); // toward increasing a (tailward)
        var bx1 = tp.x + tnx * (twd - 1), by1 = tp.y + tny * (twd - 1);
        var big = sq === 0 ? 1.0 : 0.66;
        var ln = twd * big * (1.05 + 0.16 * Math.sin(t * 1.1 + c1.i * 1.7 + sq * 2.3));
        var bw = twd * 0.36 * big;
        ctx.beginPath();
        ctx.moveTo(bx1 - ttx * bw, by1 - tty * bw);
        ctx.quadraticCurveTo(
          bx1 + tnx * ln * 1.2 - ttx * bw * 0.1, by1 + tny * ln * 1.2 - tty * bw * 0.1,
          bx1 + tnx * ln * 0.85 + ttx * ln * 1.0, by1 + tny * ln * 0.85 + tty * ln * 1.0);
        ctx.quadraticCurveTo(
          bx1 + tnx * ln * 0.30 + ttx * bw * 1.1, by1 + tny * ln * 0.30 + tty * bw * 1.1,
          bx1 + ttx * bw, by1 + tty * bw);
        ctx.closePath();
        ctx.fillStyle = '#332158';
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,4,18,0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // lit membrane wash + crisp leading edge
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(140,102,230,0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(206,176,255,0.6)';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(bx1 - ttx * bw * 0.8, by1 - tty * bw * 0.8);
        ctx.quadraticCurveTo(
          bx1 + tnx * ln * 1.15 - ttx * bw * 0.1, by1 + tny * ln * 1.15 - tty * bw * 0.1,
          bx1 + tnx * ln * 0.85 + ttx * ln * 0.95, by1 + tny * ln * 0.85 + tty * ln * 0.95);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.restore();
      // soft smoke drifting off the outer edge
      for (var wq = 0; wq < 3; wq++) {
        var us = 0.18 + 0.3 * wq + hash(c1.i * 17 + wq) * 0.16;
        var wa = lerp(c1.a0, c1.a1, us);
        var wp = P(wa);
        var wr = lerp(nodeR(c1.i), nodeR(c1.j), us) * 0.8;
        var sw = Math.sin(t * 1.2 + c1.i * 2.4 + wq * 1.9);
        var od = wr + 5 + 6 * (0.5 + 0.5 * sw);
        unitFill(smokeU,
          wp.x + Math.cos(wa) * od - Math.sin(wa) * sw * 6,
          wp.y + Math.sin(wa) * od + Math.cos(wa) * sw * 6,
          6.5 + hash(c1.i * 5 + wq * 3) * 4, 0.5, 'lighter');
      }
    }

    // --- 4. segment nodes (tail first, head last) --------------------------
    function drawGlyph(gl, s) {
      ctx.beginPath();
      if (gl === 'dot') {
        ctx.arc(0, 0, s * 0.72, 0, TAU);
      } else if (gl === 'diamond') {
        ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
      } else if (gl === 'triangle') {
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.92, s * 0.72); ctx.lineTo(-s * 0.92, s * 0.72); ctx.closePath();
      } else { // cross
        var w2 = s * 0.36;
        ctx.moveTo(-w2, -s); ctx.lineTo(w2, -s); ctx.lineTo(w2, -w2); ctx.lineTo(s, -w2);
        ctx.lineTo(s, w2); ctx.lineTo(w2, w2); ctx.lineTo(w2, s); ctx.lineTo(-w2, s);
        ctx.lineTo(-w2, w2); ctx.lineTo(-s, w2); ctx.lineTo(-s, -w2); ctx.lineTo(-w2, -w2);
        ctx.closePath();
      }
      ctx.fill();
    }

    function drawShellRing(s, idx, x, y, r, noCore) {
      var rp = r * 0.60, lw = r * 0.30;
      var rot = s.a + t * 0.22 + idx * 0.6;
      ctx.save();
      if (s.cracked) ctx.globalAlpha = 0.6;
      // dark backing ring
      ctx.strokeStyle = rgba(s.dark, 0.95);
      ctx.lineWidth = lw + 3.5;
      ctx.beginPath();
      ctx.arc(x, y, rp, 0, TAU);
      ctx.stroke();
      // plates
      var NP = 6;
      ctx.strokeStyle = s.main;
      ctx.lineWidth = lw;
      if (s.cracked) ctx.setLineDash([lw * 0.9, lw * 0.65]);
      for (q = 0; q < NP; q++) {
        var s0 = rot + q * TAU / NP + 0.11, s1 = rot + (q + 1) * TAU / NP - 0.11;
        ctx.beginPath();
        ctx.arc(x, y, rp, s0, s1);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // per-plate sheen weighted by light direction (upper-left)
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = lw * 0.32;
      for (var q2 = 0; q2 < NP; q2++) {
        var mid = rot + (q2 + 0.5) * TAU / NP;
        var lit = Math.max(0, Math.cos(mid - (-2.35)));
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.3 * lit).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, rp + lw * 0.20, mid - 0.36, mid + 0.36);
        ctx.stroke();
      }
      ctx.restore();

      // molten core / dim ember when cracked
      if (noCore) {
        // head collar: keep the center dark so it never reads as an eye
      } else if (s.cracked) {
        unitFill(glowFor(s.main), x, y, r * 0.24, 0.35, 'lighter');
      } else {
        unitFill(glowFor(s.main), x, y, r * 0.36, 0.9, 'lighter');
        ctx.save();
        ctx.fillStyle = rgba(s.main, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.13, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // cracks
      if (s.cracked) {
        ctx.save();
        ctx.strokeStyle = 'rgba(6,3,14,0.8)';
        ctx.lineWidth = 1.8;
        for (var c = 0; c < 3; c++) {
          var ca = s.a + c * 2.1 + hash(idx * 7 + c) * 1.0;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(ca) * r * 0.12, y + Math.sin(ca) * r * 0.12);
          for (var q3 = 1; q3 <= 3; q3++) {
            var rr = r * (0.12 + q3 * 0.27);
            var ja = ca + (hash(idx * 13 + c * 5 + q3) - 0.5) * 0.85;
            ctx.lineTo(x + Math.cos(ja) * rr, y + Math.sin(ja) * rr);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    function drawNode(idx) {
      var s = segs[idx], r = nodeR(idx);
      p = P(s.a);
      var x = p.x, y = p.y;
      // contact occlusion where the body threads through
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.12, 0, TAU);
      ctx.fill();
      ctx.restore();
      // dark orb body
      unitFill(orbU, x, y, r, 1, null);
      // orb flesh picks up its own shell light on the lit side
      unitFill(glowFor(s.main), x - r * 0.3, y - r * 0.3, r * 0.85,
        s.cracked ? 0.10 : 0.22, 'lighter');
      // rim light crescent, light from upper-left
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(178,148,255,0.5)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(x, y, r - 1.2, -2.75, -0.7);
      ctx.stroke();
      ctx.restore();
      drawShellRing(s, idx, x, y, r);
    }

    // colored light spill from shells onto the surrounding scene
    for (i = 0; i < n; i++) {
      var ps = P(segs[i].a);
      unitFill(glowFor(segs[i].main), ps.x, ps.y, nodeR(i) * 2.1,
        segs[i].cracked ? 0.16 : 0.34, 'lighter');
    }

    // ---- head: custom silhouette, horns, rose eyes -------------------------
    function drawHead() {
      var s = segs[0], r = nodeR(0);
      p = P(headA);
      var tilt = Math.sin(t * 0.9) * 0.04;

      // menacing rose under-glow around the whole head
      unitFill(eyeU, p.x, p.y, r * 1.7, 0.4, 'lighter');

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(headFwd + tilt);

      // -- horns: bold crescents swept back over the body
      var sway = Math.sin(t * 1.3) * 0.06;
      for (var m = -1; m <= 1; m += 2) {
        ctx.save();
        ctx.scale(r, r * m);
        ctx.beginPath();
        ctx.moveTo(0.05, 0.60);
        // outer edge: rises then sweeps back into a curved sickle tip
        ctx.bezierCurveTo(-0.30, 1.20 + sway, -1.05, 1.42 + sway, -1.85, 1.02 + sway);
        // inner edge of the sickle, back toward the skull
        ctx.bezierCurveTo(-1.15, 1.10 + sway, -0.60, 0.90, -0.38, 0.30);
        ctx.closePath();
        ctx.fillStyle = '#3a2766';
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,4,18,0.7)';
        ctx.lineWidth = 0.04;
        ctx.stroke();
        ctx.restore();
        // crisp lit edge along the horn's leading curve
        ctx.save();
        ctx.scale(1, m);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(200,168,255,0.55)';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(r * 0.02, r * 0.62);
        ctx.bezierCurveTo(-r * 0.30, r * (1.18 + sway), -r * 1.05, r * (1.40 + sway), -r * 1.82, r * (1.02 + sway));
        ctx.stroke();
        ctx.restore();
        // faint violet smoke at the horn tip (local coords — frame is rotated)
        unitFill(smokeU, -r * 1.80, m * r * (1.02 + sway), r * 0.30, 0.85, 'lighter');
      }

      // -- skull silhouette: broad back, tapered snout
      ctx.save();
      ctx.scale(r, r);
      ctx.beginPath();
      ctx.moveTo(-1.0, 0);
      ctx.bezierCurveTo(-1.02, -0.55, -0.62, -0.92, -0.10, -0.94);
      ctx.bezierCurveTo(0.35, -0.95, 0.75, -0.72, 1.05, -0.40);
      ctx.quadraticCurveTo(1.45, -0.12, 1.45, 0.02);   // snout tip
      ctx.quadraticCurveTo(1.30, 0.28, 0.95, 0.42);    // front of lower jaw
      ctx.bezierCurveTo(0.55, 0.62, 0.10, 0.88, -0.25, 0.88);
      ctx.bezierCurveTo(-0.70, 0.86, -1.02, 0.50, -1.0, 0);
      ctx.closePath();
      ctx.fillStyle = headU;
      ctx.fill();
      // crown ridge plates on top of the skull
      ctx.strokeStyle = 'rgba(10,5,22,0.55)';
      ctx.lineWidth = 0.045;
      ctx.beginPath();
      ctx.moveTo(-0.55, -0.72);
      ctx.quadraticCurveTo(-0.15, -0.86, 0.28, -0.74);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.35, -0.45);
      ctx.quadraticCurveTo(0.15, -0.60, 0.60, -0.44);
      ctx.stroke();
      ctx.restore();

      // skull rim light along whichever edge faces the screen light
      ctx.save();
      ctx.scale(1, headMirror);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(192,158,255,0.5)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.92, -r * 0.30);
      ctx.bezierCurveTo(-r * 0.62, -r * 0.90, -r * 0.10, -r * 0.94, r * 0.35, -r * 0.90);
      ctx.quadraticCurveTo(r * 0.95, -r * 0.60, r * 1.40, -r * 0.06);
      ctx.stroke();
      ctx.restore();

      // mouth: dark cut with faint rose breath light inside
      ctx.save();
      ctx.strokeStyle = 'rgba(5,2,12,0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(r * 1.42, r * 0.04);
      ctx.quadraticCurveTo(r * 0.9, r * 0.30, r * 0.42, r * 0.48);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,110,175,0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 1.34, r * 0.11);
      ctx.quadraticCurveTo(r * 0.9, r * 0.36, r * 0.48, r * 0.53);
      ctx.stroke();
      ctx.restore();
      ctx.restore(); // leave rotated frame

      // -- collar shell at the back of the skull (the matchable armor)
      var fx = Math.cos(headFwd + tilt), fy = Math.sin(headFwd + tilt);
      drawShellRing(s, 0, p.x - fx * r * 0.62, p.y - fy * r * 0.62, r * 0.56, true);

      // -- face on top
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(headFwd + tilt);
      for (var m2 = -1; m2 <= 1; m2 += 2) {
        var ex = r * 0.62, ey = m2 * r * 0.42;
        unitFill(eyeU, ex, ey, r * 0.52, 1, 'lighter');
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(m2 * 0.48);
        // hot almond core, slanted forward for menace
        ctx.fillStyle = '#ff9ec6';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.24, r * 0.095, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff0f7';
        ctx.beginPath();
        ctx.ellipse(r * 0.03, 0, r * 0.15, r * 0.05, 0, 0, TAU);
        ctx.fill();
        // brow — slim dark slash just above the eye
        ctx.strokeStyle = 'rgba(7,4,16,0.85)';
        ctx.lineWidth = r * 0.075;
        ctx.beginPath();
        ctx.moveTo(-r * 0.26, -m2 * r * 0.10);
        ctx.quadraticCurveTo(r * 0.02, -m2 * r * 0.20, r * 0.30, -m2 * r * 0.05);
        ctx.stroke();
        ctx.restore();
      }
      // nostril slit
      ctx.fillStyle = 'rgba(6,3,14,0.85)';
      ctx.save();
      ctx.translate(r * 1.18, -r * 0.14);
      ctx.rotate(0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.06, r * 0.024, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.restore();
    }

    for (i = n - 1; i >= 1; i--) drawNode(i);
    drawHead();

    // --- 4.5 glowing wound caps where the body was severed ------------------
    function woundCap(idx, dir) {
      var r = nodeR(idx);
      var aw = segs[idx].a + dir * (r * 1.28 / R);
      p = P(aw);
      var wr = r * 0.55;
      var pulse = 0.72 + 0.28 * Math.sin(t * 3.1 + idx * 1.9);
      // rose glow bleeding out of the cut
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(aw);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pulse;
      ctx.save();
      ctx.scale(wr * 1.9, wr * 1.1);
      ctx.fillStyle = eyeU;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.restore();
      // hot cut face: ellipse across the body (major axis along the normal)
      ctx.fillStyle = 'rgba(255,150,205,' + (0.42 * pulse).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(0, 0, wr * 0.95, wr * 0.34, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,196,228,' + (0.7 * pulse).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, wr * 1.02, wr * 0.42, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      // embers drifting off the wound into the gap
      for (var e = 0; e < 3; e++) {
        var ea = aw + dir * (0.07 + e * 0.065 + 0.018 * Math.sin(t * 1.5 + e * 2.2 + idx));
        var ep = P(ea);
        var eo = Math.sin(t * 1.2 + e * 1.9 + idx * 0.8) * (3 + e * 4);
        var exx = ep.x + Math.cos(ea) * eo, eyy = ep.y + Math.sin(ea) * eo;
        unitFill(eyeU, exx, eyy, 3.6 - e * 0.8, (0.8 - e * 0.2) * pulse, 'lighter');
      }
    }
    for (i = 0; i < n; i++) {
      if (i !== 0 && !linkPrev[i] && n > 1) woundCap(i, -1);
      if (i !== 0 && !linkNext[i] && n > 1) woundCap(i, 1);
    }

    // --- 5. glyph badges floating just outside each shell ------------------
    for (i = 0; i < n; i++) {
      var s2 = segs[i], r2 = nodeR(i);
      var pb = P(s2.a);
      var bob = Math.sin(t * 2.1 + s2.a * 3) * 2;
      var bd = r2 + 16 + bob;
      var bx = pb.x + Math.cos(s2.a) * bd, by = pb.y + Math.sin(s2.a) * bd;
      unitFill(glowFor(s2.main), bx, by, 13.5, s2.cracked ? 0.5 : 0.9, 'lighter');
      ctx.save();
      ctx.fillStyle = '#100c20';
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(s2.main, s2.cracked ? 0.6 : 0.95);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.translate(bx, by);
      ctx.fillStyle = rgba(s2.main, s2.cracked ? 0.75 : 1);
      drawGlyph(s2.glyph, 5);
      ctx.restore();
    }

    ctx.restore();
  };
})();
