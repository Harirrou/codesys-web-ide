/* Wispbloom — art.js
 * Premium renderers for wisps, the Heartbloom core and the Umbra Serpent.
 * Produced and screenshot-verified by the art workflow; consumed by core.js.
 */
/* Wispbloom — wisp creature renderer.
   Plain ES2018, canvas 2D only. No shadowBlur; glow is built from radial
   gradients + globalCompositeOperation 'lighter'. Deterministic per frame. */
(function () {
  'use strict';

  /* ---------- color helpers ---------- */
  function hexRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(a, b, t) {
    return [(a[0] + (b[0] - a[0]) * t) | 0,
            (a[1] + (b[1] - a[1]) * t) | 0,
            (a[2] + (b[2] - a[2]) * t) | 0];
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
    return [(f(h + 1 / 3) * 255) | 0, (f(h) * 255) | 0, (f(h - 1 / 3) * 255) | 0];
  }
  var WHITE = [255, 255, 255], INK = [6, 8, 18];

  /* ---------- shape helpers ---------- */
  /* Teardrop spirit body: soft, slightly curled flame tip up, plump base. */
  function bodyPath(ctx, r, lean, squash) {
    var ty = -1.34 * r, tx = lean * r, s = squash;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(tx + 0.10 * r, -1.04 * r, 0.94 * r, -0.6 * r, 1.0 * r, 0.1 * r * s);
    ctx.bezierCurveTo(1.02 * r, 0.7 * r * s, 0.58 * r, 1.04 * r * s, 0, 1.04 * r * s);
    ctx.bezierCurveTo(-0.58 * r, 1.04 * r * s, -1.02 * r, 0.7 * r * s, -1.0 * r, 0.1 * r * s);
    ctx.bezierCurveTo(-0.94 * r, -0.6 * r, tx - 0.28 * r, -0.98 * r, tx, ty);
    ctx.closePath();
  }

  /* flame-trail tendril: S-curved tapering ribbon, no blobby tip */
  function tendril(ctx, bx, by, w, L, bend, drift, col, a) {
    var tx = bx + drift, ty = by + L;
    ctx.fillStyle = rgba(col, a);
    ctx.beginPath();
    ctx.moveTo(bx - w, by);
    ctx.bezierCurveTo(bx - w + bend, by + L * 0.45,
                      tx - bend * 0.7, ty - L * 0.35, tx, ty);
    ctx.bezierCurveTo(tx - bend * 0.7 + w * 0.5, ty - L * 0.35,
                      bx + w + bend, by + L * 0.45, bx + w, by);
    ctx.closePath();
    ctx.fill();
  }

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
    } else { /* star (prism) */
      var i, a, rr;
      for (i = 0; i < 10; i++) {
        a = -Math.PI / 2 + i * Math.PI / 5;
        rr = (i % 2 === 0) ? s : s * 0.45;
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
    }
  }

  /* ---------- main renderer ---------- */
  window.WB_ART_WISP = function (ctx, o) {
    var r = o.r, t = o.t || 0;
    var main = hexRgb(o.main), dark = hexRgb(o.dark);
    var glyph = o.glyph;
    var nucCol = null, rimCol = null, prismHue = 0;

    if (o.prism) {
      prismHue = (t * 55) % 360;
      main = hslRgb(prismHue, 0.75, 0.68);
      dark = hslRgb(prismHue + 45, 0.62, 0.30);
      nucCol = hslRgb(prismHue + 140, 0.85, 0.78);
      rimCol = hslRgb(prismHue + 210, 0.9, 0.82);
      glyph = 'star';
    }
    if (o.pulse) {
      main = [255, 250, 238];
      dark = [172, 152, 112];
    }

    var lite = mix(main, WHITE, 0.55);
    var deep = mix(dark, INK, o.corrupt ? 0.55 : 0.4);

    var lean = Math.sin(t * 1.7 + o.blink * 0.3) * 0.14;
    var squash = 1 + Math.sin(t * 2.3) * 0.02;

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha);

    /* --- 1. ambient halo (lighter) --- */
    ctx.globalCompositeOperation = 'lighter';
    var halo = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.2);
    var haloA = o.corrupt ? 0.12 : (o.pulse ? 0.32 : 0.22);
    halo.addColorStop(0, rgba(main, haloA));
    halo.addColorStop(0.5, rgba(o.prism ? nucCol : main, haloA * 0.35));
    halo.addColorStop(1, rgba(main, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();

    /* --- 2. trailing flame tendrils (lighter, behind body) --- */
    var drift = Math.sin(t * 0.9 + o.blink) * 0.5 * r;
    var flick = Math.sin(t * 2.4 + o.blink * 2.0) * 0.18 * r;
    var tenCol = o.corrupt ? mix(main, INK, 0.3) : main;
    var tenA = o.corrupt ? 0.45 : 0.55;
    tendril(ctx, -0.4 * r, 0.55 * r, 0.15 * r, 1.15 * r,
            -0.30 * r + flick, drift * 0.6 - 0.25 * r, tenCol, tenA * 0.8);
    tendril(ctx, 0.38 * r, 0.6 * r, 0.13 * r, 0.9 * r,
            0.28 * r - flick, drift * 0.5 + 0.2 * r, tenCol, tenA * 0.75);
    tendril(ctx, 0, 0.72 * r, 0.17 * r, 1.55 * r,
            0.34 * r + flick * 0.6, drift, o.corrupt ? tenCol : lite, tenA);
    /* two drifting spark motes */
    if (!o.corrupt) {
      var ma = t * 1.1 + o.blink * 2.0;
      ctx.fillStyle = rgba(lite, 0.5 + 0.3 * Math.sin(t * 3.0));
      ctx.beginPath();
      ctx.arc(Math.cos(ma) * 1.45 * r, Math.sin(ma * 0.7) * 0.9 * r - 0.2 * r, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(Math.cos(ma + 2.6) * 1.3 * r, Math.sin(ma * 0.8 + 1.2) * 1.1 * r, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    /* --- 3. corrupt thorns behind body --- */
    if (o.corrupt) {
      var TH = [[-2.55, 1.0, 0.30], [-1.95, 0.55, -0.2], [-1.28, 0.95, 0.25],
                [-0.55, 0.65, -0.3], [0.5, 0.9, 0.3], [1.22, 0.6, -0.25],
                [1.9, 1.0, 0.2], [2.5, 0.7, -0.3]];
      for (var i = 0; i < TH.length; i++) {
        var a = TH[i][0] - Math.PI / 2;
        var len = (0.34 + TH[i][1] * 0.34) * r;
        var bend = TH[i][2];
        var px = Math.cos(a) * r * 0.9, py = Math.sin(a) * r * 0.9;
        var nx = Math.cos(a + bend * 0.5), ny = Math.sin(a + bend * 0.5);
        ctx.beginPath();
        ctx.moveTo(px - Math.sin(a) * 0.14 * r, py + Math.cos(a) * 0.14 * r);
        ctx.lineTo(px + nx * len, py + ny * len);
        ctx.lineTo(px + Math.sin(a) * 0.14 * r, py - Math.cos(a) * 0.14 * r);
        ctx.closePath();
        ctx.fillStyle = rgba(deep, 1);
        ctx.fill();
        ctx.strokeStyle = rgba(main, 0.55);
        ctx.lineWidth = Math.max(0.8, r * 0.05);
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    /* --- 4. rim-light underlay, then body over it (lit crescent top-left) --- */
    bodyPath(ctx, r, lean, squash);
    ctx.fillStyle = rgba(o.corrupt ? main : (rimCol || lite), 0.9);
    ctx.fill();

    ctx.save();
    ctx.translate(0.055 * r, 0.08 * r);
    bodyPath(ctx, r * 0.935, lean, squash);
    var bg = ctx.createRadialGradient(-0.35 * r, -0.45 * r, r * 0.1, 0, 0.1 * r, r * 1.35);
    if (o.corrupt) {
      bg.addColorStop(0, rgba(mix(dark, INK, 0.15), 1));
      bg.addColorStop(0.55, rgba(mix(dark, INK, 0.55), 1));
      bg.addColorStop(1, rgba(INK, 1));
    } else {
      bg.addColorStop(0, rgba(mix(main, WHITE, 0.25), 1));
      bg.addColorStop(0.55, rgba(main, 1));
      bg.addColorStop(1, rgba(dark, 1));
    }
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.restore();

    /* soft painted contour: keeps the silhouette on bright backdrops */
    bodyPath(ctx, r, lean, squash);
    ctx.strokeStyle = rgba(o.pulse ? [110, 88, 52] : mix(deep, INK, 0.3), o.pulse ? 0.4 : 0.3);
    ctx.lineWidth = Math.max(0.8, r * 0.05);
    ctx.stroke();

    /* --- 5. inner nucleus + prism iridescent band (lighter) --- */
    ctx.globalCompositeOperation = 'lighter';
    var nc = nucCol || (o.corrupt ? main : mix(main, WHITE, 0.7));
    var nuc = ctx.createRadialGradient(-0.12 * r, -0.2 * r, 0, -0.12 * r, -0.2 * r, r * 0.9);
    var nucA = o.pulse ? 0.95 : (o.corrupt ? 0.26 : 0.6);
    nuc.addColorStop(0, rgba(nc, nucA));
    nuc.addColorStop(0.4, rgba(main, nucA * 0.35));
    nuc.addColorStop(1, rgba(main, 0));
    ctx.fillStyle = nuc;
    ctx.beginPath(); ctx.arc(-0.12 * r, -0.2 * r, r * 0.9, 0, Math.PI * 2); ctx.fill();

    if (o.prism) {
      ctx.save();
      bodyPath(ctx, r, lean, squash);
      ctx.clip();
      var band = ctx.createLinearGradient(-r, -1.3 * r, r, r);
      band.addColorStop(0.05, rgba(hslRgb(prismHue + 90, 0.9, 0.7), 0));
      band.addColorStop(0.35, rgba(hslRgb(prismHue + 160, 0.9, 0.7), 0.5));
      band.addColorStop(0.6, rgba(hslRgb(prismHue + 260, 0.9, 0.72), 0.45));
      band.addColorStop(0.95, rgba(hslRgb(prismHue + 330, 0.9, 0.7), 0));
      ctx.fillStyle = band;
      ctx.fillRect(-r, -1.4 * r, 2 * r, 2.5 * r);
      ctx.restore();
    }

    if (!o.corrupt) { /* small specular gloss, top-left */
      ctx.fillStyle = rgba(WHITE, 0.30);
      ctx.beginPath();
      ctx.ellipse(-0.42 * r, -0.6 * r, 0.22 * r, 0.13 * r, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    /* --- 6. pulse charge rings --- */
    if (o.pulse) {
      ctx.globalCompositeOperation = 'lighter';
      var ph = (t * 1.3) % 1;
      ctx.strokeStyle = rgba(WHITE, 0.85 * (1 - ph));
      ctx.lineWidth = r * 0.10;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.15 + ph * 0.6), 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba([255, 240, 200], 0.5);
      ctx.lineWidth = r * 0.07;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    /* --- 7. eyes + tiny mouth --- */
    var cyc = ((o.blink % 3.1) + 3.1) % 3.1;
    var open = 1;
    if (cyc < 0.32) open = Math.abs(Math.cos((cyc / 0.32) * Math.PI));
    var ex = 0.33 * r, ey = -0.22 * r, ew = 0.18 * r, eh = 0.26 * r;

    if (o.corrupt) {
      var sh = Math.max(0.11, 0.17 * open);
      [-1, 1].forEach(function (s) {
        ctx.save();
        ctx.translate(s * ex, ey);
        ctx.rotate(s * 0.42);
        ctx.fillStyle = rgba(mix(main, WHITE, 0.4), 1);
        ctx.beginPath();
        ctx.ellipse(0, 0, ew * 1.3, sh * r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(WHITE, 0.85);           /* hot core in the slit */
        ctx.beginPath();
        ctx.ellipse(ew * 0.15, 0, ew * 0.5, sh * r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    } else {
      [-1, 1].forEach(function (s) {
        if (open < 0.12) {
          ctx.strokeStyle = rgba(INK, 0.9);
          ctx.lineWidth = Math.max(1, r * 0.07);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s * ex - ew, ey);
          ctx.quadraticCurveTo(s * ex, ey + eh * 0.5, s * ex + ew, ey);
          ctx.stroke();
        } else {
          ctx.fillStyle = rgba(INK, 0.92);
          ctx.beginPath();
          ctx.ellipse(s * ex, ey, ew, eh * open, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      if (open >= 0.12) {
        ctx.fillStyle = rgba(WHITE, 0.95 * open);
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.arc(s * ex - ew * 0.28, ey - eh * 0.32 * open, ew * 0.32, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      /* tiny content smile */
      ctx.strokeStyle = rgba(mix(deep, INK, 0.3), 0.9);
      ctx.lineWidth = Math.max(1, r * 0.065);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.11 * r, 0.1 * r);
      ctx.quadraticCurveTo(0, 0.19 * r, 0.11 * r, 0.1 * r);
      ctx.stroke();
    }

    /* --- 8. glyph mark, low on the belly (no disc — reads as a marking) --- */
    ctx.save();
    ctx.translate(0, 0.62 * r);
    var gs = 0.27 * r;
    if (o.corrupt) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(main, 0.4);
      glyphPath(ctx, glyph, gs * 1.5); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(mix(main, WHITE, 0.25), 1);
      glyphPath(ctx, glyph, gs); ctx.fill();
    } else {
      /* soft light plate behind, then deep ink glyph on the bright belly */
      ctx.fillStyle = rgba(lite, 0.5);
      ctx.beginPath(); ctx.arc(0, 0, gs * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(o.pulse ? [104, 92, 64] : deep, 0.95);
      glyphPath(ctx, glyph, gs); ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  };
})();

/* Wispbloom — Heartbloom core renderer.
   window.WB_ART_CORE(ctx, o)
   o = { cx, cy, r, energyK, t, body:[c0,c1,c2], petal, stroke }
   Canvas 2D only, ES2018, no shadowBlur, deterministic in t.        */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---- tiny color kit ------------------------------------------------ */
  function parseColor(c) {
    if (!c) return [255, 255, 255, 1];
    c = ('' + c).trim();
    if (c[0] === '#') {
      if (c.length === 4) {
        return [
          parseInt(c[1] + c[1], 16),
          parseInt(c[2] + c[2], 16),
          parseInt(c[3] + c[3], 16), 1];
      }
      return [
        parseInt(c.slice(1, 3), 16),
        parseInt(c.slice(3, 5), 16),
        parseInt(c.slice(5, 7), 16), 1];
    }
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(',');
      return [
        parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]),
        p.length > 3 ? parseFloat(p[3]) : 1];
    }
    return [255, 255, 255, 1];
  }
  function css(c, a) {
    var al = (a === undefined ? c[3] : c[3] * a);
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' +
      Math.max(0, Math.min(1, al)).toFixed(3) + ')';
  }
  function mix(a, b, k) {
    return [
      a[0] + (b[0] - a[0]) * k,
      a[1] + (b[1] - a[1]) * k,
      a[2] + (b[2] - a[2]) * k,
      a[3] + (b[3] - a[3]) * k];
  }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  /* Wide organic petal in unit space: base (0,0), tip near (0,-1).
     sk = sideways bend (-1..1) so no petal is a plain ellipse.        */
  function petalPath(ctx, sk) {
    var tx = sk * 0.28;
    ctx.beginPath();
    ctx.moveTo(0, 0.05);
    ctx.bezierCurveTo(-0.66, -0.06, -0.78 + sk * 0.36, -0.52, tx - 0.24, -0.86);
    ctx.quadraticCurveTo(tx - 0.02, -1.02, tx + 0.24, -0.86);
    ctx.bezierCurveTo(0.78 + sk * 0.36, -0.50, 0.66, -0.06, 0, 0.05);
    ctx.closePath();
  }

  /* Lit edge — open path along one flank + tip, for rim light.        */
  function petalEdgePath(ctx, sk) {
    var tx = sk * 0.28;
    ctx.beginPath();
    ctx.moveTo(-0.30, -0.06);
    ctx.bezierCurveTo(-0.68, -0.16, -0.76 + sk * 0.36, -0.52, tx - 0.22, -0.85);
    ctx.quadraticCurveTo(tx - 0.01, -1.0, tx + 0.16, -0.89);
  }

  /* Luminous center vein, unit space (filled sliver, no stroke).      */
  function veinPath(ctx, sk) {
    var tx = sk * 0.24;
    ctx.beginPath();
    ctx.moveTo(-0.055, -0.04);
    ctx.quadraticCurveTo(-0.045 + sk * 0.20, -0.50, tx, -0.94);
    ctx.quadraticCurveTo(0.055 + sk * 0.20, -0.50, 0.055, -0.04);
    ctx.closePath();
  }

  window.WB_ART_CORE = function (ctx, o) {
    var cx = o.cx, cy = o.cy, r = o.r;
    var e = clamp01(o.energyK || 0);
    var t = o.t || 0;

    var petal = parseColor(o.petal);
    var stroke = parseColor(o.stroke);
    var b0 = parseColor(o.body[0]);
    var b1 = parseColor(o.body[1]);
    var b2 = parseColor(o.body[2]);

    var warm = [255, 224, 176, petal[3]];
    var pWarm = mix(petal, warm, 0.26 * e);   // colors warm up with energy
    var night = [8, 10, 26, petal[3]];
    var white = [255, 255, 248, 1];

    ctx.save();
    ctx.translate(cx, cy);

    /* gentle global breathing */
    var breath = 1 + 0.020 * Math.sin(t * 1.35) * (0.45 + 0.55 * e);
    ctx.scale(breath, breath);
    var rot = t * 0.055;

    /* Shared gradients (budget: 7 per call) -------------------------- */
    var haloR = r * (1.85 + 0.85 * e);
    var gHalo = ctx.createRadialGradient(0, 0, r * 0.10, 0, 0, haloR);
    var haloA = (0.09 + 0.24 * e) * (1 + 0.10 * Math.sin(t * 1.35 + 0.7));
    gHalo.addColorStop(0, css(pWarm, haloA));
    gHalo.addColorStop(0.30, css(mix(pWarm, b1, 0.30), haloA * 0.5));
    gHalo.addColorStop(0.60, css(pWarm, haloA * 0.16));
    gHalo.addColorStop(1, css(pWarm, 0));

    var gBack = ctx.createLinearGradient(0, 0, 0, -1);
    gBack.addColorStop(0, css(mix(pWarm, night, 0.74), 0.96));
    gBack.addColorStop(0.55, css(mix(pWarm, night, 0.42), 0.92));
    gBack.addColorStop(1, css(mix(pWarm, night, 0.14), 0.90));

    var gFront = ctx.createLinearGradient(0, 0, 0, -1);
    gFront.addColorStop(0, css(mix(pWarm, night, 0.60), 0.96));
    gFront.addColorStop(0.45, css(mix(pWarm, night, 0.18), 0.94));
    gFront.addColorStop(0.8, css(pWarm, 0.94));
    gFront.addColorStop(1, css(mix(pWarm, white, 0.34), 0.95));

    var gVein = ctx.createLinearGradient(0, 0, 0, -1);
    gVein.addColorStop(0, css(pWarm, 0));
    gVein.addColorStop(0.28, css(mix(pWarm, white, 0.5), 0.10 + 0.12 * e));
    gVein.addColorStop(0.60, css(mix(pWarm, white, 0.72), 0.30 + 0.42 * e));
    gVein.addColorStop(1, css(pWarm, 0));

    var rc = r * (0.50 + 0.08 * e);          // heart orb radius
    var gOrb = ctx.createRadialGradient(-rc * 0.30, -rc * 0.34, rc * 0.08,
      0, 0, rc * 1.05);
    gOrb.addColorStop(0, css(b0));
    gOrb.addColorStop(0.55, css(b1));
    gOrb.addColorStop(1, css(b2));

    var nucR = rc * (0.55 + 0.45 * e);
    var gNuc = ctx.createRadialGradient(0, 0, 0, 0, 0, nucR);
    var nucA = 0.28 + 0.68 * e + 0.06 * Math.sin(t * 2.1);
    gNuc.addColorStop(0, css(mix(b0, white, 0.65), nucA));
    gNuc.addColorStop(0.5, css(b0, nucA * 0.5));
    gNuc.addColorStop(1, css(b0, 0));

    var tipR = r * 0.088;
    var gTip = ctx.createRadialGradient(0, 0, 0, 0, 0, tipR);
    gTip.addColorStop(0, css(mix(pWarm, white, 0.8), 0.95));
    gTip.addColorStop(0.35, css(pWarm, 0.55));
    gTip.addColorStop(1, css(pWarm, 0));

    /* 1 — glow halo -------------------------------------------------- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gHalo;
    ctx.beginPath();
    ctx.arc(0, 0, haloR, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* petal rows ------------------------------------------------------ */
    function petalRow(n, rowOff, rowPhase, baseLen, baseWid, fill, veinA,
      edgeA) {
      for (var i = 0; i < n; i++) {
        var a = rot + rowOff + i * TAU / n;
        // individual, asymmetric sway
        a += (0.030 + 0.045 * e) * Math.sin(t * 0.9 + i * 1.87 + rowPhase);
        var len = baseLen * (1 + 0.075 * Math.sin(i * 4.7 + rowPhase * 5 + 1.2)
          + 0.05 * Math.sin(t * 1.15 + i * 2.13 + rowPhase));
        var wid = baseWid * (1 + 0.06 * Math.sin(i * 3.3 + rowPhase * 7)
          + 0.04 * Math.sin(t * 0.75 + i * 1.31 + rowPhase * 2));
        var sk = 0.40 * Math.sin(i * 2.399 + rowPhase * 3.1)
          + 0.13 * Math.sin(t * 0.65 + i * 1.7);

        ctx.save();
        ctx.rotate(a);
        ctx.translate(0, -r * 0.14);

        ctx.save();
        ctx.scale(wid, len);
        petalPath(ctx, sk);
        ctx.fillStyle = fill;              // unit-space gradient maps here
        ctx.fill();
        ctx.restore();

        // rim light on one flank + tip
        ctx.save();
        ctx.scale(wid, len);
        petalEdgePath(ctx, sk);
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = css(mix(stroke, white, 0.3), edgeA);
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        if (veinA > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = veinA;
          ctx.scale(wid, len);
          veinPath(ctx, sk);
          ctx.fillStyle = gVein;
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
    }

    /* 2 — back petal row */
    petalRow(6, TAU / 12, 2.1,
      r * (1.30 + 1.28 * e), r * (0.50 + 0.14 * e), gBack, 0.22,
      0.14 + 0.10 * e);

    /* 3 — front petal row */
    petalRow(6, 0, 0.0,
      r * (0.92 + 0.82 * e), r * (0.46 + 0.14 * e), gFront, 1.0,
      0.30 + 0.25 * e);

    /* inner bloom light seating petals into the heart (reuses gNuc) */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.26 + 0.44 * e;
    ctx.scale(2.5, 2.5);
    ctx.fillStyle = gNuc;
    ctx.beginPath();
    ctx.arc(0, 0, nucR, 0, TAU);
    ctx.fill();
    ctx.restore();

    /* 4 — heart orb ---------------------------------------------------- */
    ctx.save();
    // seat shadow so the orb reads on top of petals
    ctx.fillStyle = 'rgba(4,6,18,0.35)';
    ctx.beginPath();
    ctx.arc(0, rc * 0.12, rc * 1.16, 0, TAU);
    ctx.fill();

    ctx.fillStyle = gOrb;
    ctx.beginPath();
    ctx.arc(0, 0, rc, 0, TAU);
    ctx.fill();

    // rim light (upper-left crescent, no gradient)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = css(mix(pWarm, white, 0.45), 0.24 + 0.44 * e);
    ctx.lineWidth = rc * 0.11;
    ctx.beginPath();
    ctx.arc(0, 0, rc * 0.90, Math.PI * 0.95, Math.PI * 1.75);
    ctx.stroke();
    ctx.restore();

    // freckles / seeds — deterministic per index, each with a dew speck
    for (var f = 0; f < 7; f++) {
      var fa = f * 2.399 + 0.9;
      var fr = rc * (0.32 + 0.46 * ((f * 0.618) % 1));
      var fx = Math.cos(fa) * fr, fy = Math.sin(fa) * fr;
      ctx.fillStyle = css(b2, 0.7);
      ctx.beginPath();
      ctx.arc(fx, fy, rc * 0.07, 0, TAU);
      ctx.fill();
      ctx.fillStyle = css(mix(b0, white, 0.5), 0.5);
      ctx.beginPath();
      ctx.arc(fx - rc * 0.025, fy - rc * 0.03, rc * 0.025, 0, TAU);
      ctx.fill();
    }

    // bright nucleus
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gNuc;
    ctx.beginPath();
    ctx.arc(0, 0, nucR, 0, TAU);
    ctx.fill();

    // jewel glint — thin 4-point star, only when charged
    if (e > 0.35) {
      var glA = (e - 0.35) / 0.65 * (0.30 + 0.08 * Math.sin(t * 2.1 + 1.1));
      ctx.save();
      ctx.rotate(t * 0.18 + 0.6);
      ctx.fillStyle = css(white, glA);
      var gl = rc * 1.35, gw = rc * 0.085;
      for (var q = 0; q < 2; q++) {
        ctx.beginPath();
        ctx.moveTo(-gl, 0);
        ctx.quadraticCurveTo(0, -gw, gl, 0);
        ctx.quadraticCurveTo(0, gw, -gl, 0);
        ctx.closePath();
        ctx.fill();
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
    ctx.restore();

    /* 5 — stamens ------------------------------------------------------ */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var nS = 7;
    for (var s = 0; s < nS; s++) {
      var sa = rot * 1.3 + s * TAU / nS + 0.45
        + 0.10 * Math.sin(t * 1.05 + s * 2.3);
      var sLen = r * (0.70 + 0.46 * e)
        * (1 + 0.10 * Math.sin(s * 2.7 + 0.8)
          + 0.06 * Math.sin(t * 1.3 + s * 1.9));
      var bx = Math.cos(sa) * rc * 0.28;
      var by = Math.sin(sa) * rc * 0.28;
      var ex = Math.cos(sa) * sLen;
      var ey = Math.sin(sa) * sLen - r * 0.08;
      var mxp = Math.cos(sa + 0.45) * sLen * 0.52;
      var myp = Math.sin(sa + 0.45) * sLen * 0.52;

      ctx.strokeStyle = css(mix(pWarm, white, 0.35), 0.40 + 0.35 * e);
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(mxp, myp, ex, ey);
      ctx.stroke();

      ctx.save();
      ctx.translate(ex, ey);
      ctx.fillStyle = gTip;
      ctx.beginPath();
      ctx.arc(0, 0, tipR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = css(white, 0.60 + 0.38 * e);
      ctx.beginPath();
      ctx.arc(0, 0, tipR * 0.26, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    /* 6 — drifting light motes (cosmic garden dust) -------------------- */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var m = 0; m < 5; m++) {
      var ph = m * 2.399;
      var ma = t * (0.22 + 0.05 * Math.sin(ph * 3.7)) * (m % 2 ? 1 : -1) + ph;
      var mr = r * (1.35 + 0.75 * ((m * 0.618) % 1))
        * (1 + 0.06 * Math.sin(t * 0.9 + ph));
      var mScale = 0.42 + 0.42 * ((m * 0.382) % 1);
      var mA = (0.22 + 0.55 * e) * (0.6 + 0.4 * Math.sin(t * 1.6 + ph * 2));
      ctx.save();
      ctx.translate(Math.cos(ma) * mr, Math.sin(ma) * mr * 0.92);
      ctx.scale(mScale, mScale);
      ctx.globalAlpha = Math.max(0, mA);
      ctx.fillStyle = gTip;
      ctx.beginPath();
      ctx.arc(0, 0, tipR, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

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
