/* Wispbloom — particles.js
 * Lightweight effect systems shared by gameplay and menus:
 * spark/glow particles, expanding rings, floating text, screen shake,
 * and brief slow-motion. All effects respect the "reduced motion" setting.
 */
'use strict';
(function (WB) {

  class Effects {
    constructor() {
      this.parts = [];
      this.rings = [];
      this.texts = [];
      this.shakeT = 0;
      this.shakeMag = 0;
      this.slowT = 0;       // remaining slow-motion time (real seconds)
      this.slowFactor = 1;  // current time multiplier
    }

    get reduced() { return WB.save && WB.save.data.settings.reduceMotion; }

    burst(x, y, color, n, speed) {
      const count = this.reduced ? Math.ceil(n / 3) : n;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * WB.TAU;
        const s = (speed || 160) * (0.3 + Math.random());
        this.parts.push({
          x, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0, max: 0.45 + Math.random() * 0.5,
          size: 2 + Math.random() * 4,
          color,
          drag: 0.9,
        });
      }
    }

    trail(x, y, color) {
      if (this.reduced && Math.random() < 0.6) return;
      this.parts.push({
        x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        life: 0, max: 0.3 + Math.random() * 0.25,
        size: 1.5 + Math.random() * 3,
        color,
        drag: 0.95,
      });
    }

    ring(x, y, color, maxR) {
      this.rings.push({ x, y, color, life: 0, max: 0.5, maxR: maxR || 70 });
    }

    text(x, y, str, color, big) {
      this.texts.push({ x, y, str, color: color || '#fff', life: 0, max: 1.1, big: !!big });
    }

    shake(mag) {
      if (this.reduced) return;
      this.shakeMag = Math.max(this.shakeMag, mag);
      this.shakeT = 0.3;
    }

    slowMo(dur) {
      if (this.reduced) return;
      this.slowT = Math.max(this.slowT, dur);
    }

    clear() {
      this.parts.length = 0;
      this.rings.length = 0;
      this.texts.length = 0;
      this.shakeT = 0;
      this.slowT = 0;
      this.slowFactor = 1;
    }

    update(dt) {
      if (this.slowT > 0) {
        this.slowT -= dt;
        this.slowFactor = this.slowT > 0 ? 0.35 : 1;
      } else {
        this.slowFactor = 1;
      }
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        if (this.shakeT <= 0) this.shakeMag = 0;
      }
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life += dt;
        if (p.life >= p.max) { this.parts.splice(i, 1); continue; }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.life += dt;
        if (r.life >= r.max) this.rings.splice(i, 1);
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life += dt;
        if (t.life >= t.max) this.texts.splice(i, 1);
      }
    }

    applyShake(ctx) {
      if (this.shakeT > 0 && this.shakeMag > 0) {
        const m = this.shakeMag * (this.shakeT / 0.3);
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = k * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, WB.TAU);
        ctx.fill();
      }
      for (const r of this.rings) {
        const k = r.life / r.max;
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.maxR * WB.easeOutCubic(k), 0, WB.TAU);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      for (const t of this.texts) {
        const k = t.life / t.max;
        ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - WB.easeInOut(Math.max(0, (k - 0.4) / 0.6));
        ctx.fillStyle = t.color;
        ctx.font = (t.big ? '700 30px' : '600 18px') + ' system-ui, sans-serif';
        ctx.fillText(t.str, t.x, t.y - k * 34);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  WB.fx = new Effects();
})(window.WB);
