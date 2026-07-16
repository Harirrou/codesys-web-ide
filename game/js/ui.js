/* Wispbloom — ui.js
 * Screen manager: title, level path, gameplay HUD, pause, win/lose,
 * settings, how-to-play. Everything is canvas-drawn with large touch
 * targets; buttons register hit rects each frame.
 */
'use strict';
(function (WB) {

  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  class UI {
    constructor() {
      this.screen = 'title';
      this.game = null;
      this.gameMode = null;
      this.buttons = [];       // {rect, action, id} rebuilt every frame
      this.t = 0;
      this.stars = null;       // background starfield cache
      this.motes = [];
      this.confirmReset = 0;
      this.transition = 0;     // fade-in on screen change
    }

    goto(screen) {
      this.screen = screen;
      this.transition = 1;
      this.confirmReset = 0;
    }

    // ----- game flow --------------------------------------------------------
    startLevel(index) {
      this.gameMode = { type: 'campaign', index };
      this.game = new WB.Game(WB.LEVELS[index], this.gameMode);
      this.paused = false;
      this.resultSaved = false;
      WB.fx.clear();
      this.goto('game');
    }

    startEndless(daily) {
      this.gameMode = { type: daily ? 'daily' : 'endless' };
      const def = WB.makeEndless(daily ? WB.dailySeed() : null);
      this.game = new WB.Game(def, this.gameMode);
      this.paused = false;
      this.resultSaved = false;
      WB.fx.clear();
      this.goto('game');
    }

    quitToMenu() {
      this.game = null;
      WB.fx.clear();
      this.goto(this.gameMode && this.gameMode.type === 'campaign' ? 'levels' : 'title');
    }

    saveResult() {
      if (this.resultSaved || !this.game) return;
      this.resultSaved = true;
      const g = this.game;
      if (this.gameMode.type === 'campaign') {
        if (g.result === 'won') WB.save.recordStars(this.gameMode.index, g.stars());
      } else if (this.gameMode.type === 'endless') {
        this.newBest = WB.save.recordEndless(g.score);
      } else if (this.gameMode.type === 'daily') {
        this.newBest = WB.save.recordDaily(g.score);
      }
    }

    // ----- input ------------------------------------------------------------
    onDown(x, y) {
      WB.audio.unlock();
      WB.audio.resume();
      this.pressed = null;
      for (const b of this.buttons) {
        if (WB.inRect(x, y, b.rect)) {
          this.pressed = b;
          return;
        }
      }
      if (this.screen === 'game' && this.game && !this.paused && !this.game.result) {
        this.game.onDown(x, y);
      }
    }

    onMove(x, y) {
      if (this.pressed) return;
      if (this.screen === 'game' && this.game) this.game.onMove(x, y);
    }

    onUp(x, y) {
      if (this.pressed) {
        if (WB.inRect(x, y, this.pressed.rect)) {
          WB.audio.button();
          this.pressed.action();
        }
        this.pressed = null;
        return;
      }
      if (this.screen === 'game' && this.game) this.game.onUp(x, y);
    }

    // ----- shared drawing helpers --------------------------------------------
    btn(ctx, x, y, w, h, label, action, opts) {
      opts = opts || {};
      const rect = { x, y, w, h };
      if (!opts.disabled) this.buttons.push({ rect, action });
      const isPressed = this.pressed && this.pressed.rect === rect;
      ctx.save();
      ctx.globalAlpha = opts.disabled ? 0.35 : 1;
      WB.roundRect(ctx, x, y, w, h, h / 2);
      if (opts.primary) {
        const g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, isPressed ? '#67c6e8' : '#8fe0f7');
        g.addColorStop(1, isPressed ? '#3a7dc9' : '#529ade');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = isPressed ? 'rgba(90,110,180,0.5)' : 'rgba(52,66,120,0.55)';
      }
      ctx.fill();
      ctx.strokeStyle = opts.primary ? 'rgba(230,250,255,0.7)' : 'rgba(150,175,240,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = opts.primary ? '#0b1428' : '#dfe8ff';
      ctx.font = '700 ' + (opts.fontSize || Math.floor(h * 0.42)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y + h / 2 + 1);
      ctx.restore();
      return rect;
    }

    iconBtn(ctx, x, y, size, kind, action) {
      const rect = { x, y, w: size, h: size };
      this.buttons.push({ rect, action });
      ctx.save();
      ctx.fillStyle = 'rgba(52,66,120,0.55)';
      ctx.strokeStyle = 'rgba(150,175,240,0.4)';
      WB.roundRect(ctx, x, y, size, size, size * 0.3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#dfe8ff';
      ctx.fillStyle = '#dfe8ff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const cx = x + size / 2, cy = y + size / 2, s = size * 0.22;
      ctx.beginPath();
      if (kind === 'pause') {
        ctx.moveTo(cx - s * 0.6, cy - s); ctx.lineTo(cx - s * 0.6, cy + s);
        ctx.moveTo(cx + s * 0.6, cy - s); ctx.lineTo(cx + s * 0.6, cy + s);
        ctx.stroke();
      } else if (kind === 'back') {
        ctx.moveTo(cx + s * 0.7, cy - s); ctx.lineTo(cx - s * 0.7, cy); ctx.lineTo(cx + s * 0.7, cy + s);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawStars(ctx, cx, cy, count, size, dimEmpty) {
      for (let i = 0; i < 3; i++) {
        const x = cx + (i - 1) * size * 2.4;
        const filled = i < count;
        ctx.save();
        ctx.translate(x, cy + (i === 1 ? -size * 0.35 : 0));
        ctx.fillStyle = filled ? '#ffd869' : (dimEmpty ? 'rgba(120,130,180,0.3)' : 'rgba(120,130,180,0.5)');
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k / 5) * WB.TAU;
          const a2 = a + WB.TAU / 10;
          ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
          ctx.lineTo(Math.cos(a2) * size * 0.45, Math.sin(a2) * size * 0.45);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // ----- background ----------------------------------------------------------
    buildBackdrop(w, h) {
      const rng = WB.rngFromSeed(7);
      this.stars = [];
      for (let i = 0; i < 90; i++) {
        this.stars.push({ x: rng() * w, y: rng() * h, s: 0.5 + rng() * 1.6, tw: rng() * WB.TAU, spd: 0.5 + rng() });
      }
      this.motes = [];
      for (let i = 0; i < 10; i++) {
        this.motes.push({
          x: rng() * w, y: rng() * h, r: 2 + rng() * 4,
          vx: (rng() - 0.5) * 12, vy: (rng() - 0.5) * 12,
          c: WB.COLORS[Math.floor(rng() * 4)].main, ph: rng() * WB.TAU,
        });
      }
    }

    // Which painted background belongs to the current screen.
    bgKey() {
      if (this.screen === 'game' && this.game) return this.game.level.bg || 'dusk';
      if (this.screen === 'levels') return 'dawn';
      if (this.screen === 'grove') return 'grove';
      return 'title';
    }

    // Cover-fit a painted background with a slow breathing zoom and a
    // 0.5 s crossfade between worlds; falls back to the procedural sky
    // until the image is ready.
    drawBgImage(ctx, w, h, key, alpha) {
      const img = WB.BG && WB.BG[key];
      if (!img || !img.complete || !img.naturalWidth) return false;
      const reduced = WB.save.data.settings.reduceMotion;
      const zoom = reduced ? 1.02 : 1.03 + 0.025 * Math.sin(this.t * 0.08);
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      // Legibility veil: keeps gameplay glow the brightest thing on screen.
      ctx.fillStyle = 'rgba(8,11,26,0.34)';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return true;
    }

    drawBackdrop(ctx, w, h, dt) {
      const key = this.bgKey();
      if (key !== this.bgCur) {
        this.bgPrev = this.bgCur;
        this.bgCur = key;
        this.bgFade = this.bgPrev ? 1 : 0;
      }
      if (this.bgFade > 0) this.bgFade = Math.max(0, this.bgFade - dt * 2);

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0a0e21');
      g.addColorStop(0.55, '#111737');
      g.addColorStop(1, '#1b1330');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const drewImage = this.drawBgImage(ctx, w, h, this.bgCur, 1);
      if (this.bgFade > 0 && this.bgPrev) {
        this.drawBgImage(ctx, w, h, this.bgPrev, this.bgFade);
      }
      if (!drewImage) {
        // Procedural nebula fallback (also the pre-load first frames).
        const blobs = [
          [w * 0.85, h * 0.15, w * 0.5, 'rgba(90,60,140,0.14)'],
          [w * 0.1, h * 0.75, w * 0.45, 'rgba(40,110,130,0.12)'],
          [w * 0.6, h * 0.95, w * 0.4, 'rgba(140,70,110,0.1)'],
        ];
        for (const [x, y, r, c] of blobs) {
          const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
          rg.addColorStop(0, c);
          rg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = rg;
          ctx.fillRect(0, 0, w, h);
        }
      }
      if (!this.stars) this.buildBackdrop(w, h);
      ctx.save();
      for (const s of this.stars) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.t * s.spd + s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#cfe0ff';
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      const reduced = WB.save.data.settings.reduceMotion;
      for (const m of this.motes) {
        if (!reduced) {
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.x < -20) m.x = w + 20; if (m.x > w + 20) m.x = -20;
          if (m.y < -20) m.y = h + 20; if (m.y > h + 20) m.y = -20;
        }
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 1.3 + m.ph);
        ctx.fillStyle = m.c;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, WB.TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // ===== frame ==================================================================
    frame(ctx, w, h, dt) {
      this.t += dt;
      this.buttons = [];
      this.drawBackdrop(ctx, w, h, dt);

      if (this.screen === 'title') this.drawTitle(ctx, w, h);
      else if (this.screen === 'levels') this.drawLevels(ctx, w, h);
      else if (this.screen === 'settings') this.drawSettings(ctx, w, h);
      else if (this.screen === 'howto') this.drawHowto(ctx, w, h);
      else if (this.screen === 'grove') this.drawGrove(ctx, w, h);
      else if (this.screen === 'game') this.drawGame(ctx, w, h, dt);

      if (this.transition > 0) {
        this.transition = Math.max(0, this.transition - dt * 3);
        ctx.fillStyle = 'rgba(10,14,32,' + this.transition + ')';
        ctx.fillRect(0, 0, w, h);
      }
    }

    // ----- title -------------------------------------------------------------
    drawTitle(ctx, w, h) {
      const cx = w / 2;
      const ey = h * 0.23;
      const er = Math.min(w, h) * 0.11;

      // Slow light rays breathing out of the emblem
      if (!WB.save.data.settings.reduceMotion) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, ey);
        for (let i = 0; i < 6; i++) {
          ctx.save();
          ctx.rotate(this.t * 0.06 + (i / 6) * WB.TAU);
          const rg = ctx.createLinearGradient(0, 0, 0, -h * 0.55);
          rg.addColorStop(0, 'rgba(120,200,255,0.06)');
          rg.addColorStop(1, 'rgba(120,200,255,0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-h * 0.045, -h * 0.55);
          ctx.lineTo(h * 0.045, -h * 0.55);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // Drifting glowing petals
      if (!this.petals) {
        this.petals = [];
        const rng = WB.rngFromSeed(31);
        for (let i = 0; i < 9; i++) {
          this.petals.push({
            x: rng() * w, y: rng() * h, rot: rng() * WB.TAU,
            vr: (rng() - 0.5) * 1.2, vy: 14 + rng() * 22, vx: (rng() - 0.5) * 10,
            s: 5 + rng() * 7, hue: rng() < 0.5 ? 'rgba(126,203,232,' : 'rgba(242,126,207,',
            a: 0.14 + rng() * 0.2,
          });
        }
      }
      const reduced = WB.save.data.settings.reduceMotion;
      for (const p of this.petals) {
        if (!reduced) {
          p.y += p.vy / 60; p.x += (p.vx + Math.sin(this.t + p.rot) * 8) / 60; p.rot += p.vr / 60;
          if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.hue + p.a + ')';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s * 0.45, p.s, 0, 0, WB.TAU);
        ctx.fill();
        ctx.restore();
      }

      // Animated bloom emblem
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * WB.TAU + this.t * 0.25;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * er * 0.75, ey + Math.sin(a) * er * 0.75);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = 'rgba(122,224,255,0.18)';
        ctx.strokeStyle = 'rgba(160,235,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, -er * 0.5, er * 0.34, er * 0.75, 0, 0, WB.TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      const g = ctx.createRadialGradient(cx, ey, 2, cx, ey, er);
      g.addColorStop(0, '#f2fdff');
      g.addColorStop(1, '#3d7fb5');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, ey, er * 0.55 + Math.sin(this.t * 2) * 2, 0, WB.TAU);
      ctx.fill();
      // Orbiting wisps around the emblem
      for (let i = 0; i < 3; i++) {
        const a = this.t * (0.6 + i * 0.2) + i * 2.1;
        const rr = er * (1.5 + i * 0.35);
        this.gameless = this.gameless || new WB.Game(WB.LEVELS[0], { type: 'campaign', index: 0 });
        this.gameless.drawOrb(ctx, cx + Math.cos(a) * rr, ey + Math.sin(a) * rr, 9, i, false, false, 0.9, 0);
      }
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      const ts = Math.floor(Math.min(w * 0.13, 58));
      ctx.font = '800 ' + ts + 'px ' + FONT;
      const tg = ctx.createLinearGradient(0, h * 0.42 - ts, 0, h * 0.42 + 8);
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(0.55, '#cfeaff');
      tg.addColorStop(1, '#8fb8ef');
      ctx.shadowColor = 'rgba(120,200,255,0.55)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = tg;
      ctx.fillText('WISPBLOOM', cx, h * 0.42);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(200,220,255,0.8)';
      ctx.font = '500 15px ' + FONT;
      ctx.fillText('Every match reshapes the sky', cx, h * 0.42 + 26);
      ctx.restore();

      const bw = Math.min(w * 0.72, 300), bx = cx - bw / 2;
      let by = h * 0.52;
      const bh = 52, gap = 14;
      this.btn(ctx, bx, by, bw, bh, 'PLAY', () => this.goto('levels'), { primary: true });
      by += bh + gap;
      this.btn(ctx, bx, by, bw, bh, 'ENDLESS GARDEN', () => this.startEndless(false));
      by += bh + gap;
      const dailyBest = WB.save.dailyBest();
      this.btn(ctx, bx, by, bw, bh, dailyBest ? 'DAILY ✦ BEST ' + dailyBest : 'DAILY BLOOM', () => this.startEndless(true));
      by += bh + gap;
      const third = (bw - 20) / 3;
      this.btn(ctx, bx, by, third, 46, 'HOW TO', () => this.goto('howto'), { fontSize: 13 });
      this.btn(ctx, bx + third + 10, by, third, 46, 'GROVE', () => this.goto('grove'), { fontSize: 13 });
      this.btn(ctx, bx + 2 * (third + 10), by, third, 46, 'SETTINGS', () => this.goto('settings'), { fontSize: 13 });

      ctx.fillStyle = 'rgba(170,190,240,0.6)';
      ctx.font = '500 13px ' + FONT;
      ctx.fillText('✦ ' + WB.save.totalStars() + ' stars gathered' +
        (WB.save.data.bestEndless ? '  •  endless best ' + WB.save.data.bestEndless : ''), cx, h - 22);
    }

    // ----- level select ---------------------------------------------------------
    drawLevels(ctx, w, h) {
      const cx = w / 2;
      this.iconBtn(ctx, 14, 14, 46, 'back', () => this.goto('title'));
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef6ff';
      ctx.font = '800 26px ' + FONT;
      ctx.fillText('The Garden Path', cx, 46);
      ctx.fillStyle = 'rgba(190,210,255,0.6)';
      ctx.font = '500 13px ' + FONT;
      ctx.fillText('Restore the bloom, orbit by orbit', cx, 68);

      const cols = 2;
      const rows = Math.ceil(WB.LEVELS.length / cols);
      const WORLD2 = 10;                    // index where The Deep Grove begins
      const divRow = Math.floor(WORLD2 / cols);
      const divH = 30;
      const cellW = Math.min(w * 0.44, 190);
      const cellH = Math.min((h - 130 - divH) / rows, 96);
      const gridW = cols * cellW;
      const x0 = cx - gridW / 2;
      const y0 = 92;
      const nodePos = (i) => ({
        x: x0 + (i % cols) * cellW + cellW / 2,
        y: y0 + Math.floor(i / cols) * cellH + cellH / 2 + (Math.floor(i / cols) >= divRow ? divH : 0),
      });
      // World divider
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(150,230,200,0.85)';
      ctx.font = '700 14px ' + FONT;
      ctx.fillText('✦  WORLD 2 — THE DEEP GROVE  ✦', cx, y0 + divRow * cellH + divH / 2 + 5);
      ctx.restore();
      // Winding garden path connecting the level nodes
      ctx.save();
      ctx.strokeStyle = 'rgba(140,170,240,0.28)';
      ctx.lineWidth = 3;
      ctx.setLineDash([1, 9]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < WB.LEVELS.length; i++) {
        const p = nodePos(i);
        if (i === 0) ctx.moveTo(p.x, p.y - 8);
        else {
          const q = nodePos(i - 1);
          ctx.bezierCurveTo(q.x, q.y - 8 + cellH * 0.42, p.x, p.y - 8 - cellH * 0.42, p.x, p.y - 8);
        }
      }
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < WB.LEVELS.length; i++) {
        const pos = nodePos(i);
        const x = pos.x, y = pos.y;
        const lv = WB.LEVELS[i];
        const unlocked = WB.save.isUnlocked(i);
        const stars = WB.save.data.stars[i] || 0;
        const r = Math.min(cellH * 0.32, 30);
        const rect = { x: x - cellW / 2 + 6, y: y - cellH / 2 + 4, w: cellW - 12, h: cellH - 8 };
        if (unlocked) this.buttons.push({ rect, action: () => this.startLevel(i) });
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.4;
        const isBoss = lv.obj === 'boss';
        const grad = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, r);
        grad.addColorStop(0, isBoss ? '#ffd9f4' : '#d9f4ff');
        grad.addColorStop(1, isBoss ? '#8f3a68' : '#3a6a9e');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y - 8, r + (isBoss ? 4 : 0), 0, WB.TAU);
        ctx.fill();
        if (stars > 0) {
          ctx.strokeStyle = '#ffd869';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y - 8, r + 4, 0, WB.TAU);
          ctx.stroke();
        }
        ctx.fillStyle = '#0b1428';
        ctx.font = '800 ' + Math.floor(r * 0.9) + 'px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unlocked ? (isBoss ? '♛' : String(i + 1)) : '⚿', x, y - 7);
        ctx.textBaseline = 'alphabetic';
        this.drawStars(ctx, x, y + r + 8, stars, 6, true);
        ctx.fillStyle = 'rgba(200,215,255,0.8)';
        ctx.font = '500 11px ' + FONT;
        ctx.fillText(unlocked ? lv.name : 'Locked', x, y + r + 26);
        ctx.restore();
      }
    }

    // ----- settings ------------------------------------------------------------
    toggleRow(ctx, x, y, w, label, value, onToggle) {
      const h = 54;
      const rect = { x, y, w, h };
      this.buttons.push({ rect, action: onToggle });
      ctx.save();
      WB.roundRect(ctx, x, y, w, h, 14);
      ctx.fillStyle = 'rgba(52,66,120,0.4)';
      ctx.fill();
      ctx.fillStyle = '#dfe8ff';
      ctx.font = '600 17px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 18, y + h / 2 + 1);
      // Switch
      const sw = 52, sh = 28;
      const sx = x + w - sw - 16, sy = y + (h - sh) / 2;
      WB.roundRect(ctx, sx, sy, sw, sh, sh / 2);
      ctx.fillStyle = value ? '#5fd6a8' : 'rgba(110,120,160,0.5)';
      ctx.fill();
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.arc(value ? sx + sw - sh / 2 : sx + sh / 2, sy + sh / 2, sh / 2 - 4, 0, WB.TAU);
      ctx.fill();
      ctx.restore();
      return y + h + 12;
    }

    drawSettings(ctx, w, h) {
      const cx = w / 2;
      this.iconBtn(ctx, 14, 14, 46, 'back', () => { WB.save.save(); this.goto('title'); });
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef6ff';
      ctx.font = '800 26px ' + FONT;
      ctx.fillText('Settings', cx, 46);

      const s = WB.save.data.settings;
      const bw = Math.min(w * 0.85, 360), bx = cx - bw / 2;
      let y = 92;
      y = this.toggleRow(ctx, bx, y, bw, 'Sound effects', s.sound, () => { s.sound = !s.sound; WB.save.save(); });
      y = this.toggleRow(ctx, bx, y, bw, 'Music', s.music, () => { s.music = !s.music; WB.save.save(); WB.audio.applyMusicSetting(); });
      y = this.toggleRow(ctx, bx, y, bw, 'Vibration', s.vibration, () => { s.vibration = !s.vibration; WB.save.save(); WB.vibrate(20); });
      y = this.toggleRow(ctx, bx, y, bw, 'Reduce motion', s.reduceMotion, () => { s.reduceMotion = !s.reduceMotion; WB.save.save(); });
      y += 18;
      const label = this.confirmReset > 0 ? 'TAP AGAIN TO CONFIRM' : 'RESET PROGRESS';
      this.btn(ctx, bx, y, bw, 48, label, () => {
        if (this.confirmReset > 0) {
          WB.save.data.stars = {};
          WB.save.data.bestEndless = 0;
          WB.save.data.daily = {};
          WB.save.save();
          this.confirmReset = 0;
        } else {
          this.confirmReset = 3;
        }
      }, { fontSize: 15 });
      if (this.confirmReset > 0) this.confirmReset -= 1 / 60;

      ctx.fillStyle = 'rgba(170,190,240,0.55)';
      ctx.font = '500 12px ' + FONT;
      ctx.fillText('Wispbloom prototype — all art & audio procedural', cx, h - 22);
    }

    // ----- the Grove: cosmetics earned with stars ---------------------------------
    drawGrove(ctx, w, h) {
      const cx = w / 2;
      const stars = WB.save.totalStars();
      this.iconBtn(ctx, 14, 14, 46, 'back', () => this.goto('title'));
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef6ff';
      ctx.font = '800 26px ' + FONT;
      ctx.fillText('The Grove', cx, 46);
      ctx.fillStyle = 'rgba(190,240,215,0.85)';
      ctx.font = '600 14px ' + FONT;
      ctx.fillText('✦ ' + stars + ' stars gathered — spend nothing, just shine', cx, 68);

      const bw = Math.min(w * 0.88, 380), bx = cx - bw / 2;
      const rowH = Math.min(56, (h - 190) / 8);
      let y = 90;
      const cos = WB.save.data.cosmetics;

      const section = (label) => {
        ctx.fillStyle = 'rgba(170,200,255,0.7)';
        ctx.font = '700 12px ' + FONT;
        ctx.textAlign = 'left';
        ctx.fillText(label.toUpperCase(), bx + 6, y + 12);
        y += 22;
      };

      const item = (def, kind, equipped, preview) => {
        const unlocked = stars >= def.need;
        const rect = { x: bx, y, w: bw, h: rowH - 8 };
        if (unlocked && !equipped) {
          this.buttons.push({ rect, action: () => { cos[kind] = def.id; WB.save.save(); } });
        }
        ctx.save();
        ctx.globalAlpha = unlocked ? 1 : 0.45;
        WB.roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
        ctx.fillStyle = equipped ? 'rgba(95,214,168,0.22)' : 'rgba(52,66,120,0.4)';
        ctx.fill();
        if (equipped) {
          ctx.strokeStyle = 'rgba(95,214,168,0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        preview(rect.x + 26, rect.y + rect.h / 2);
        ctx.fillStyle = '#dfe8ff';
        ctx.font = '600 15px ' + FONT;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.name, rect.x + 52, rect.y + rect.h / 2 + 1);
        ctx.textAlign = 'right';
        ctx.font = '600 12px ' + FONT;
        ctx.fillStyle = equipped ? '#5fd6a8' : (unlocked ? 'rgba(200,220,255,0.8)' : 'rgba(255,216,105,0.9)');
        ctx.fillText(equipped ? 'EQUIPPED' : (unlocked ? 'TAP TO EQUIP' : def.need + ' ★'), rect.x + rect.w - 16, rect.y + rect.h / 2 + 1);
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
        y += rowH;
      };

      section('Projectile trails');
      for (const tdef of WB.COSMETICS.trails) {
        item(tdef, 'trail', cos.trail === tdef.id, (px, py) => {
          const col = tdef.id === 'wisp' ? WB.COLORS[(Math.floor(this.t) % 4)].main
            : tdef.id === 'aurora' ? 'hsl(' + ((this.t * 80) % 360) + ',80%,72%)'
            : tdef.color;
          const g = ctx.createLinearGradient(px - 16, py, px + 16, py);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, col);
          ctx.strokeStyle = g;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(px - 16, py);
          ctx.lineTo(px + 14, py);
          ctx.stroke();
        });
      }
      y += 8;
      section('Core blooms');
      for (const cdef of WB.COSMETICS.cores) {
        item(cdef, 'core', cos.core === cdef.id, (px, py) => {
          const g = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, 12);
          g.addColorStop(0, cdef.body[0]);
          g.addColorStop(0.55, cdef.body[1]);
          g.addColorStop(1, cdef.body[2]);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 11, 0, WB.TAU);
          ctx.fill();
        });
      }
    }

    // ----- how to play -----------------------------------------------------------
    drawHowto(ctx, w, h) {
      const cx = w / 2;
      this.iconBtn(ctx, 14, 14, 46, 'back', () => this.goto('title'));
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef6ff';
      ctx.font = '800 26px ' + FONT;
      ctx.fillText('How to Play', cx, 46);

      this.gameless = this.gameless || new WB.Game(WB.LEVELS[0], { type: 'campaign', index: 0 });
      const ix = 46; // icon column center
      const rows = [
        ['Drag anywhere to aim, release to shoot', () => {
          this.gameless.drawOrb(ctx, ix - 14, 0, 10, 0, false, false, 1, 0);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.setLineDash([3, 7]);
          ctx.beginPath(); ctx.moveTo(ix, 0); ctx.lineTo(ix + 22, 0); ctx.stroke();
          ctx.setLineDash([]);
        }],
        ['Match 3+ wisps of one color to burst them', () => {
          for (let i = 0; i < 3; i++) this.gameless.drawOrb(ctx, ix - 18 + i * 18, 0, 9, 1, false, false, 1, 0);
        }],
        ['Tap the core to swap your loaded wisp', () => {
          this.gameless.drawOrb(ctx, ix - 8, 0, 10, 2, false, false, 1, 0);
          this.gameless.drawOrb(ctx, ix + 12, 0, 7, 3, false, false, 0.8, 0);
        }],
        ['Every match triggers an Orbit Shift', () => {
          ctx.strokeStyle = '#8fd8ff';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ix, 0, 13, 0.5, WB.TAU - 0.5); ctx.stroke();
        }],
        ['Cleanse thorned wisps: match their glyph', () => {
          this.gameless.drawOrb(ctx, ix, 0, 10, 1, false, false, 1, 1);
        }],
        ['Chain 2 bursts in one shot: earn a Prism', () => {
          this.gameless.drawOrb(ctx, ix, 0, 10, 0, true, false, 1, 0);
        }],
        ['Fill the meter, tap PULSE for a blast', () => {
          this.gameless.drawOrb(ctx, ix, 0, 10, 0, false, true, 1, 0);
        }],
        ['Don’t let any orbit overgrow!', () => {
          ctx.strokeStyle = 'rgba(255,120,140,0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(ix, 0, 12, 0, WB.TAU); ctx.stroke();
        }],
      ];
      let y = 100;
      const step = Math.min(64, (h - 140) / rows.length);
      const fs = Math.max(12, Math.min(15, Math.floor((w - 100) / 24)));
      for (const [text, icon] of rows) {
        ctx.save();
        ctx.translate(0, y);
        icon();
        ctx.restore();
        ctx.fillStyle = '#dfe8ff';
        ctx.font = '500 ' + fs + 'px ' + FONT;
        ctx.textAlign = 'left';
        ctx.fillText(text, 82, y + 5, w - 96);
        y += step;
      }
    }

    // ----- gameplay + HUD ---------------------------------------------------------
    drawGame(ctx, w, h, dt) {
      const g = this.game;
      if (!g) return;
      if (!this.paused) {
        // Slow-motion scales simulation time only — but once the level is
        // decided, run real time so the result screen isn't delayed.
        g.update(dt * (g.result ? 1 : WB.fx.slowFactor));
      }
      ctx.save();
      WB.fx.applyShake(ctx);
      g.draw(ctx);
      ctx.restore();

      // --- HUD ---
      // Pause
      this.iconBtn(ctx, 12, 12, 44, 'pause', () => { this.paused = true; });
      // Objective pill
      const obj = g.objectiveText();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '700 16px ' + FONT;
      const label = this.objIcon(obj.icon) + '  ' + obj.text;
      const pw = ctx.measureText(label).width + 34;
      WB.roundRect(ctx, w / 2 - pw / 2, 14, pw, 40, 20);
      ctx.fillStyle = 'rgba(20,28,60,0.65)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,175,240,0.35)';
      ctx.stroke();
      ctx.fillStyle = '#eef6ff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, w / 2, 35);
      // Score
      ctx.textAlign = 'right';
      ctx.font = '700 18px ' + FONT;
      ctx.fillStyle = '#ffe9b0';
      ctx.fillText(String(g.score), w - 16, 35);
      ctx.restore();

      // Pulse ability button (from level 5 onward, and in endless/daily)
      const abilityUnlocked = this.gameMode.type !== 'campaign' || this.gameMode.index >= 4;
      if (abilityUnlocked) this.drawPulseButton(ctx, w, h, g);

      // Level name intro
      if (g.time < 2.6 && !g.result) {
        ctx.save();
        ctx.globalAlpha = WB.clamp(2.6 - g.time, 0, 1);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#eef6ff';
        ctx.font = '800 24px ' + FONT;
        ctx.fillText(g.level.name, w / 2, h * 0.16);
        ctx.restore();
      }

      if (this.paused) this.drawPause(ctx, w, h);
      else if (g.result && g.resultT > 0.9) this.drawResult(ctx, w, h, g);
    }

    objIcon(kind) {
      if (kind === 'bloom') return '✿';
      if (kind === 'cleanse') return '☘';
      if (kind === 'time') return '⏳';
      if (kind === 'boss') return '♛';
      return '✦';
    }

    drawPulseButton(ctx, w, h, g) {
      const r = 34;
      const x = 24 + r, y = h - 24 - r;
      const ready = g.ability >= g.abilityMax;
      const rect = { x: x - r - 8, y: y - r - 8, w: r * 2 + 16, h: r * 2 + 16 };
      this.buttons.push({ rect, action: () => g.armPulse() });
      ctx.save();
      ctx.globalAlpha = ready ? 1 : 0.75;
      ctx.fillStyle = 'rgba(20,28,60,0.7)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, WB.TAU);
      ctx.fill();
      // Meter arc
      ctx.strokeStyle = ready ? '#ffffff' : '#7ecbe8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + WB.TAU * (g.ability / g.abilityMax));
      ctx.stroke();
      if (ready) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(this.t * 6)) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 5 + Math.sin(this.t * 6) * 2, 0, WB.TAU);
        ctx.stroke();
      }
      ctx.fillStyle = ready ? '#ffffff' : 'rgba(220,232,255,0.8)';
      ctx.font = '800 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.pulseArmed ? 'ARMED' : 'PULSE', x, y);
      ctx.restore();
    }

    overlayBase(ctx, w, h) {
      ctx.fillStyle = 'rgba(8,12,28,0.78)';
      ctx.fillRect(0, 0, w, h);
    }

    drawPause(ctx, w, h) {
      this.buttons = [];   // pause modal swallows all input
      this.overlayBase(ctx, w, h);
      const cx = w / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#eef6ff';
      ctx.font = '800 30px ' + FONT;
      ctx.fillText('Paused', cx, h * 0.26);
      const bw = Math.min(w * 0.7, 280), bx = cx - bw / 2;
      let y = h * 0.34;
      this.btn(ctx, bx, y, bw, 52, 'RESUME', () => { this.paused = false; }, { primary: true });
      y += 66;
      this.btn(ctx, bx, y, bw, 52, 'RESTART', () => {
        if (this.gameMode.type === 'campaign') this.startLevel(this.gameMode.index);
        else this.startEndless(this.gameMode.type === 'daily');
      });
      y += 66;
      this.btn(ctx, bx, y, bw, 52, 'QUIT', () => this.quitToMenu());
      y += 80;
      const s = WB.save.data.settings;
      const third = (bw - 20) / 3;
      this.btn(ctx, bx, y, third, 44, s.sound ? '♪ ON' : '♪ OFF', () => { s.sound = !s.sound; WB.save.save(); }, { fontSize: 13 });
      this.btn(ctx, bx + third + 10, y, third, 44, s.music ? '♫ ON' : '♫ OFF', () => { s.music = !s.music; WB.save.save(); WB.audio.applyMusicSetting(); }, { fontSize: 13 });
      this.btn(ctx, bx + 2 * (third + 10), y, third, 44, s.vibration ? '≈ ON' : '≈ OFF', () => { s.vibration = !s.vibration; WB.save.save(); }, { fontSize: 13 });
    }

    drawResult(ctx, w, h, g) {
      this.saveResult();
      this.buttons = [];   // modal swallows gameplay input
      this.overlayBase(ctx, w, h);
      const cx = w / 2;
      const won = g.result === 'won';
      const isCampaign = this.gameMode.type === 'campaign';
      const k = WB.clamp((g.resultT - 0.9) * 2, 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.fillStyle = won ? '#c8f7d8' : '#ffb9c4';
      ctx.font = '800 32px ' + FONT;
      const title = won ? 'The Garden Blooms!' : (isCampaign ? 'Overgrown…' : 'The Garden Sleeps');
      ctx.fillText(title, cx, h * 0.22);

      if (won && isCampaign) {
        const earned = g.stars();
        this.drawStars(ctx, cx, h * 0.31, Math.floor(earned * WB.clamp((g.resultT - 1) / 1.2, 0, 1) + 0.001), 17, false);
      }
      ctx.fillStyle = '#eef6ff';
      ctx.font = '700 22px ' + FONT;
      ctx.fillText('Score  ' + g.score, cx, h * 0.4);
      if (!isCampaign) {
        const best = this.gameMode.type === 'daily' ? WB.save.dailyBest() : WB.save.data.bestEndless;
        ctx.fillStyle = this.newBest ? '#ffd869' : 'rgba(190,210,255,0.7)';
        ctx.font = '600 15px ' + FONT;
        ctx.fillText(this.newBest ? 'NEW BEST!' : 'Best  ' + best, cx, h * 0.4 + 28);
      } else if (isCampaign && won) {
        ctx.fillStyle = 'rgba(190,210,255,0.6)';
        ctx.font = '500 13px ' + FONT;
        ctx.fillText('2★ at ' + g.level.s2 + '   •   3★ at ' + g.level.s3, cx, h * 0.4 + 26);
      }

      const bw = Math.min(w * 0.7, 280), bx = cx - bw / 2;
      let y = h * 0.5;
      if (won && isCampaign && this.gameMode.index < WB.LEVELS.length - 1) {
        this.btn(ctx, bx, y, bw, 54, 'NEXT LEVEL', () => this.startLevel(this.gameMode.index + 1), { primary: true });
        y += 68;
      } else if (won && isCampaign) {
        ctx.fillStyle = '#ffd869';
        ctx.font = '600 15px ' + FONT;
        ctx.fillText('You have restored the whole garden ✦', cx, y + 20);
        y += 48;
      }
      this.btn(ctx, bx, y, bw, 54, won ? 'REPLAY' : 'TRY AGAIN', () => {
        if (isCampaign) this.startLevel(this.gameMode.index);
        else this.startEndless(this.gameMode.type === 'daily');
      }, { primary: !won });
      y += 68;
      this.btn(ctx, bx, y, bw, 54, isCampaign ? 'MAP' : 'MENU', () => this.quitToMenu());
      ctx.restore();
    }
  }

  WB.ui = new UI();
})(window.WB);
