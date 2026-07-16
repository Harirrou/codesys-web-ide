/* Wispbloom — core.js
 * The gameplay simulation: orbit rings, wisps (pieces), the shooter core,
 * matching, chain reactions, orbit shifts, power pieces and the boss.
 * Rendering of the play field lives here too; menus/HUD live in ui.js.
 */
'use strict';
(function (WB) {

  // Wisp colors. Every color also has a unique inner glyph so the game is
  // fully playable with color-vision deficiencies.
  WB.COLORS = [
    { main: '#5ee6d0', dark: '#1d6e63', glyph: 'dot' },      // tide wisp
    { main: '#f27ecf', dark: '#7c2f66', glyph: 'diamond' },  // blossom wisp
    { main: '#ffc46b', dark: '#8a5a1d', glyph: 'triangle' }, // ember wisp
    { main: '#a98bff', dark: '#4a3390', glyph: 'cross' },    // dusk wisp
  ];

  const SHIFT_INFO = {
    reverse: { label: 'ORBIT REVERSED', color: '#8fd8ff' },
    surge:   { label: 'SURGE!',         color: '#ffc46b' },
    leap:    { label: 'WISPS LEAP',     color: '#f27ecf' },
    lull:    { label: 'THE GARDEN RESTS', color: '#9fe8b9' },
  };

  const PROJ_SPEED = 1150;       // px/s
  const CHAIN_WINDOW = 2.2;      // seconds pieces stay "chain hot" after a burst
  const GAP_PULL = 1.6;          // rad/s impulse pulling chain edges together

  let pieceUid = 1;

  function makePiece(colorIdx, angle, opts) {
    return Object.assign({
      id: pieceUid++,
      colorIdx,
      a: WB.angNorm(angle),
      radial: null,        // non-null while animating toward the ring radius
      radialFrom: 0,
      radialT: 0,
      scale: 0,            // pop-in animation
      corrupt: false,
      prism: false,
      boss: false,
      bossHp: 0,
      chainT: 0,           // chain-reaction window
      impulse: 0,          // extra angular velocity (gap closing)
      wobble: Math.random() * WB.TAU,
    }, opts || {});
  }

  class Game {
    /**
     * @param {object} level  level definition (see levels.js)
     * @param {object} mode   {type:'campaign', index} | {type:'endless'} | {type:'daily'}
     */
    constructor(level, mode) {
      this.level = level;
      this.mode = mode;
      this.rng = level.seed != null ? WB.rngFromSeed(level.seed) : Math.random;
      this.time = 0;
      this.score = 0;
      this.energy = 0;
      this.cleansed = 0;
      this.cleanseTarget = 0;
      this.result = null;            // null | 'won' | 'lost'
      this.resultT = 0;
      this.combo = 0;                // chain depth for current cascade
      this.burstsThisShot = 0;
      this.pendingPrism = false;
      this.ability = 0;              // pulse meter 0..4
      this.abilityMax = 4;
      this.pulseArmed = false;
      this.surgeT = 0;
      this.lullT = 0;
      this.shiftIdx = 0;
      this.banner = null;            // {text,color,t}
      this.shownHints = [];
      this.spawnT = level.spawn ? level.spawn.interval * 0.6 : 0;
      this.projectiles = [];
      this.warnT = 0;
      this.shotSwayA = 0;

      // Aiming state
      this.aiming = false;
      this.aimX = 0; this.aimY = 0;
      this.downX = 0; this.downY = 0;
      this.downOnCore = false;

      this.buildRings();
      this.buildBoss();

      // Shooter queue — colors drawn from what is actually in play.
      this.current = this.drawColor();
      this.next = this.drawColor();

      this.layout(WB.view.w, WB.view.h);
    }

    buildRings() {
      this.rings = this.level.rings.map((rd, i) => {
        const ring = {
          idx: i,
          rr: rd.rr,
          r: 100,
          dir: rd.dir,
          speed: rd.speed,
          capacity: rd.capacity || 18,
          pieces: [],
          dashOff: Math.random() * 100,
          gateA: -Math.PI / 2 + i * 1.4,
        };
        const fill = rd.fill || 0;
        const corruptSlots = new Set();
        while (corruptSlots.size < (rd.corrupt || 0)) {
          corruptSlots.add(Math.floor(this.rng() * fill));
        }
        this.cleanseTarget += (rd.corrupt || 0);
        // Seed the ring in short same-color clumps (1-2) so early boards read
        // clearly but rarely start with a ready-made match of 3.
        let slot = 0;
        const startA = this.rng() * WB.TAU;
        while (slot < fill) {
          const c = Math.floor(this.rng() * this.level.colors);
          const clump = Math.min(fill - slot, 1 + Math.floor(this.rng() * 2));
          for (let k = 0; k < clump; k++) {
            const p = makePiece(c, startA + (slot / fill) * WB.TAU, { scale: 1 });
            if (corruptSlots.has(slot)) p.corrupt = true;
            ring.pieces.push(p);
            slot++;
          }
        }
        this.sanitizeInitial(ring);
        return ring;
      });
    }

    // Recolor any accidental starting runs of 3+ so levels never open
    // with free matches.
    sanitizeInitial(ring) {
      const ps = ring.pieces;
      if (ps.length < 3) return;
      for (let guard = 0; guard < 4; guard++) {
        let changed = false;
        for (let i = 0; i < ps.length; i++) {
          const a = ps[i], b = ps[(i + 1) % ps.length], c = ps[(i + 2) % ps.length];
          if (a.colorIdx === b.colorIdx && b.colorIdx === c.colorIdx) {
            b.colorIdx = (b.colorIdx + 1 + Math.floor(this.rng() * (this.level.colors - 1))) % this.level.colors;
            changed = true;
          }
        }
        if (!changed) break;
      }
    }

    buildBoss() {
      this.boss = null;
      if (this.level.obj !== 'boss') return;
      const cfg = this.level.boss;
      const ring = this.rings[this.rings.length - 1];
      this.boss = {
        ring,
        total: cfg.segments,
        alive: cfg.segments,
        roarEvery: cfg.roarEvery,
        roarT: cfg.roarEvery,
        eatEvery: cfg.eatEvery,
        eatT: cfg.eatEvery,
        rage: 0,
      };
      for (let i = 0; i < cfg.segments; i++) {
        const p = makePiece(i % this.level.colors, (i / cfg.segments) * WB.TAU, {
          boss: true, bossHp: 2, scale: 1,
        });
        ring.pieces.push(p);
      }
    }

    layout(w, h) {
      this.w = w; this.h = h;
      this.cx = w / 2;
      this.cy = h * 0.46;
      const maxR = Math.min(w * 0.47, h * 0.36);
      this.coreR = WB.clamp(Math.min(w, h) * 0.085, 26, 46);
      this.pieceR = WB.clamp(maxR * 0.075, 10, 20);
      const inner = this.coreR + this.pieceR + 26;
      for (const ring of this.rings) {
        ring.r = inner + (maxR - inner) * ring.rr;
        ring.minGap = (this.pieceR * 2.15) / ring.r;
      }
    }

    // ----- shooter --------------------------------------------------------
    drawColor() {
      if (this.pendingPrism) {
        this.pendingPrism = false;
        return { prism: true, colorIdx: 0 };
      }
      // Weighted by colors currently on the field so shots are always useful.
      const counts = new Array(this.level.colors).fill(1);
      for (const ring of this.rings) {
        for (const p of ring.pieces) {
          if (!p.boss && p.colorIdx < counts.length) counts[p.colorIdx] += 3;
        }
      }
      let total = 0;
      for (const c of counts) total += c;
      let roll = this.rng() * total;
      for (let i = 0; i < counts.length; i++) {
        roll -= counts[i];
        if (roll <= 0) return { prism: false, colorIdx: i };
      }
      return { prism: false, colorIdx: 0 };
    }

    swap() {
      if (this.result) return;
      const t = this.current;
      this.current = this.next;
      this.next = t;
      WB.audio.swap();
      WB.vibrate(8);
    }

    armPulse() {
      if (this.result || this.ability < this.abilityMax || this.pulseArmed) return false;
      this.pulseArmed = true;
      this.ability = 0;
      WB.audio.power();
      WB.vibrate(20);
      WB.fx.text(this.cx, this.cy - this.coreR - 24, 'PULSE READY', '#ffffff', true);
      return true;
    }

    shoot(dirX, dirY) {
      if (this.result) return;
      const len = Math.hypot(dirX, dirY);
      if (len < 0.001) return;
      const nx = dirX / len, ny = dirY / len;
      this.projectiles.push({
        x: this.cx + nx * (this.coreR + 6),
        y: this.cy + ny * (this.coreR + 6),
        vx: nx * PROJ_SPEED,
        vy: ny * PROJ_SPEED,
        colorIdx: this.current.prism ? -1 : this.current.colorIdx,
        prism: !!this.current.prism,
        pulse: this.pulseArmed,
      });
      if (this.pulseArmed) this.pulseArmed = false;
      this.burstsThisShot = 0;
      this.combo = 0;
      this.current = this.next;
      this.next = this.drawColor();
      this.shotSwayA = Math.atan2(ny, nx);
      WB.audio.shoot();
      WB.vibrate(10);
    }

    // ----- input (routed from ui.js) ---------------------------------------
    onDown(x, y) {
      if (this.result) return;
      this.downX = x; this.downY = y;
      this.aimX = x; this.aimY = y;
      this.downOnCore = WB.dist(x, y, this.cx, this.cy) < this.coreR * 1.9;
      this.aiming = true;
    }

    onMove(x, y) {
      if (!this.aiming) return;
      this.aimX = x; this.aimY = y;
    }

    onUp(x, y) {
      if (!this.aiming) return;
      this.aiming = false;
      const dragged = WB.dist(x, y, this.downX, this.downY) > 22;
      if (!dragged) {
        if (this.downOnCore) this.swap();
        return;
      }
      this.shoot(x - this.cx, y - this.cy);
    }

    get aimVec() {
      const dx = this.aimX - this.cx, dy = this.aimY - this.cy;
      const len = Math.hypot(dx, dy);
      if (len < 4) return null;
      return { x: dx / len, y: dy / len };
    }

    // ----- simulation -------------------------------------------------------
    update(dt) {
      if (this.result) {
        this.resultT += dt;
        WB.fx.update(dt);
        this.updatePieceAnims(dt);
        return;
      }

      this.time += dt;
      if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
      if (this.surgeT > 0) this.surgeT -= dt;
      if (this.lullT > 0) this.lullT -= dt;
      if (this.warnT > 0) this.warnT -= dt;

      this.showHints();
      this.updateSpawner(dt);
      this.updateRings(dt);
      this.updateProjectiles(dt);
      this.updateBoss(dt);
      this.checkChains();
      this.checkEnd();
      WB.fx.update(dt);
    }

    showHints() {
      const hints = this.level.hints || [];
      for (let i = 0; i < hints.length; i++) {
        if (this.time >= hints[i].at && !this.shownHints[i]) {
          this.shownHints[i] = true;
          this.banner = { text: hints[i].text, color: '#cfe3ff', t: 3.4, hint: true };
        }
      }
    }

    spawnInterval() {
      let base = this.level.spawn.interval;
      if (this.level.obj === 'endless') {
        base = Math.max(1.7, base - this.time * 0.022);
      }
      return base;
    }

    updateSpawner(dt) {
      if (!this.level.spawn || this.lullT > 0) return;
      this.spawnT -= dt;
      if (this.spawnT > 0) return;
      this.spawnT = this.spawnInterval();
      const candidates = this.level.spawn.rings.filter(i => this.rings[i].pieces.length < this.rings[i].capacity + 1);
      if (!candidates.length) return;
      const ring = this.rings[candidates[Math.floor(this.rng() * candidates.length)]];
      const c = Math.floor(this.rng() * this.level.colors);
      const p = makePiece(c, ring.gateA);
      ring.pieces.push(p);
      WB.fx.ring(this.cx + Math.cos(ring.gateA) * ring.r, this.cy + Math.sin(ring.gateA) * ring.r, '#ffffff', this.pieceR * 2.2);
      // Crowding warning
      if (ring.pieces.length >= ring.capacity - 2) {
        this.warnT = 1.2;
        WB.audio.warn();
      }
    }

    ringSpeed(ring) {
      let s = ring.speed * ring.dir;
      if (this.surgeT > 0) s *= 1.9;
      if (this.boss) s *= 1 + this.boss.rage * 0.12;
      return s;
    }

    updateRings(dt) {
      for (const ring of this.rings) {
        const w = this.ringSpeed(ring);
        ring.dashOff -= w * ring.r * dt;
        for (const p of ring.pieces) {
          p.a = WB.angNorm(p.a + (w + p.impulse) * dt);
          p.impulse *= Math.pow(0.02, dt); // decay fast
          if (Math.abs(p.impulse) < 0.02) p.impulse = 0;
          if (p.chainT > 0) p.chainT -= dt;
        }
        this.separate(ring);
      }
      this.updatePieceAnims(dt);
    }

    updatePieceAnims(dt) {
      for (const ring of this.rings) {
        for (const p of ring.pieces) {
          if (p.scale < 1) p.scale = Math.min(1, p.scale + dt * 5);
          if (p.radial != null) {
            p.radialT += dt * 7;
            if (p.radialT >= 1) { p.radial = null; }
          }
          p.wobble += dt * 2.2;
        }
      }
    }

    // Keep beads separated like a chain: resolve angular overlaps.
    separate(ring) {
      const ps = ring.pieces;
      if (ps.length < 2) return;
      ps.sort((a, b) => a.a - b.a);
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i], q = ps[(i + 1) % ps.length];
          let gap = q.a - p.a;
          if (i === ps.length - 1) gap += WB.TAU;
          if (gap < ring.minGap) {
            const push = (ring.minGap - gap) / 2;
            p.a = WB.angNorm(p.a - push);
            q.a = WB.angNorm(q.a + push);
            moved = true;
          }
        }
        if (moved) ps.sort((a, b) => a.a - b.a);
        else break;
      }
    }

    // ----- projectiles & attaching -----------------------------------------
    updateProjectiles(dt) {
      const maxR = this.rings[this.rings.length - 1].r + 60;
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        WB.fx.trail(pr.x, pr.y, pr.pulse ? '#ffffff' : (pr.prism ? '#e8e8ff' : WB.COLORS[pr.colorIdx].main));
        const hit = this.findHit(pr.x, pr.y);
        if (hit) {
          this.projectiles.splice(i, 1);
          this.onProjectileHit(pr, hit.ring, hit.piece);
          continue;
        }
        if (WB.dist(pr.x, pr.y, this.cx, this.cy) > maxR) {
          this.projectiles.splice(i, 1);
        }
      }
    }

    findHit(x, y) {
      const rr = WB.dist(x, y, this.cx, this.cy);
      for (const ring of this.rings) {
        if (Math.abs(rr - ring.r) > this.pieceR * 2.4) continue;
        for (const p of ring.pieces) {
          const px = this.cx + Math.cos(p.a) * this.pieceRadius(ring, p);
          const py = this.cy + Math.sin(p.a) * this.pieceRadius(ring, p);
          const rad = p.boss ? this.pieceR * 1.5 : this.pieceR;
          if (WB.dist(x, y, px, py) < rad + this.pieceR * 0.9) {
            return { ring, piece: p };
          }
        }
      }
      return null;
    }

    pieceRadius(ring, p) {
      if (p.radial == null) return ring.r;
      return WB.lerp(p.radialFrom, ring.r, WB.easeOutCubic(Math.min(1, p.radialT)));
    }

    onProjectileHit(pr, ring, hitPiece) {
      // Boss segments: crack with a matching color, bounce otherwise.
      if (hitPiece.boss) {
        this.hitBossSegment(pr, ring, hitPiece);
        return;
      }
      if (pr.pulse) {
        this.pulseBlast(ring, hitPiece);
        return;
      }
      const a = Math.atan2(pr.y - this.cy, pr.x - this.cx);
      const p = makePiece(pr.prism ? hitPiece.colorIdx : pr.colorIdx, a, {
        prism: pr.prism,
        radial: 1, radialFrom: WB.dist(pr.x, pr.y, this.cx, this.cy), radialT: 0,
        scale: 0.4,
      });
      ring.pieces.push(p);
      this.separate(ring);
      WB.audio.attach();
      WB.vibrate(12);
      WB.fx.ring(pr.x, pr.y, pr.prism ? '#ffffff' : WB.COLORS[pr.colorIdx].main, this.pieceR * 2.4);
      const run = this.findRun(ring, p);
      if (run.length >= 3) {
        this.burst(ring, run, false);
      } else if (ring.pieces.length >= ring.capacity) {
        this.fail();
      }
    }

    // The Pulse power: clears the struck wisp and up to 2 neighbors per side.
    pulseBlast(ring, hitPiece) {
      const ps = ring.pieces;
      ps.sort((a, b) => a.a - b.a);
      const idx = ps.indexOf(hitPiece);
      const grab = new Set([hitPiece]);
      for (let off = 1; off <= 2; off++) {
        const l = ps[(idx - off + ps.length) % ps.length];
        const r = ps[(idx + off) % ps.length];
        if (l && !l.boss) grab.add(l);
        if (r && !r.boss) grab.add(r);
      }
      this.burst(ring, [...grab], false, true);
      WB.fx.shake(10);
      WB.fx.slowMo(0.5);
      WB.audio.power();
      WB.vibrate(35);
    }

    // ----- matching ----------------------------------------------------------
    // Find the contiguous same-color run containing piece p (prisms are wild).
    findRun(ring, p) {
      const ps = ring.pieces;
      if (ps.length === 0) return [];
      ps.sort((a, b) => a.a - b.a);
      const n = ps.length;
      const idx = ps.indexOf(p);
      if (idx < 0) return [];
      const joinGap = ring.minGap * 1.45;
      // Establish run color (first non-prism encountered, else prism-only run)
      let runColor = p.prism ? -1 : p.colorIdx;
      const included = [idx];
      const tryExtend = (dir) => {
        let cur = idx;
        for (let step = 0; step < n - 1; step++) {
          const nxt = (cur + dir + n) % n;
          if (included.includes(nxt)) break;
          const a = ps[cur], b = ps[nxt];
          let gap = dir > 0 ? b.a - a.a : a.a - b.a;
          if (gap < 0) gap += WB.TAU;
          if (gap > joinGap) break;
          if (b.boss) break;
          const bColor = b.prism ? -1 : b.colorIdx;
          if (runColor === -1) runColor = bColor;
          if (bColor !== -1 && runColor !== -1 && bColor !== runColor) break;
          included.push(nxt);
          cur = nxt;
        }
      };
      tryExtend(1);
      tryExtend(-1);
      return included.map(i => ps[i]);
    }

    burst(ring, run, isChain, isPulse) {
      if (!run.length) return;
      this.combo = isChain ? this.combo + 1 : 1;
      this.burstsThisShot++;
      const mult = 1 + (this.combo - 1) * 0.5;
      const gained = Math.round(30 * run.length * mult);
      this.score += gained;
      this.energy += run.length;
      if (!isPulse) this.ability = Math.min(this.abilityMax, this.ability + 1);

      // Midpoint for FX / floating text
      let mx = 0, my = 0;
      for (const p of run) {
        const px = this.cx + Math.cos(p.a) * ring.r;
        const py = this.cy + Math.sin(p.a) * ring.r;
        mx += px; my += py;
        WB.fx.burst(px, py, p.corrupt ? '#b18cff' : WB.COLORS[p.colorIdx].main, 14, 190);
        if (p.corrupt) this.cleansed++;
      }
      mx /= run.length; my /= run.length;
      WB.fx.ring(mx, my, '#ffffff', this.pieceR * 4);
      WB.fx.text(mx, my, '+' + gained + (this.combo > 1 ? '  x' + this.combo : ''), '#ffe9b0', this.combo > 1);
      WB.audio.match(this.combo);
      WB.vibrate(this.combo > 1 ? 30 : 18);
      WB.fx.shake(3 + Math.min(9, run.length));
      if (this.combo >= 3) WB.fx.slowMo(0.4);

      // Remove pieces; find the angular gap edges to pull together.
      const ids = new Set(run.map(p => p.id));
      ring.pieces = ring.pieces.filter(p => !ids.has(p.id));
      this.flagChainEdges(ring, run);

      // Earn a Prism by chaining two bursts off one shot.
      if (this.burstsThisShot === 2 && !this.pendingPrism && !this.next.prism && !this.current.prism) {
        this.pendingPrism = true;
        WB.fx.text(this.cx, this.cy + this.coreR + 34, 'PRISM EARNED!', '#ffffff', true);
        WB.audio.power();
      }

      this.triggerShift(ring);
    }

    // Mark pieces at the edges of the removed segment: they get a pull
    // toward each other and a "chain hot" window so rejoining same colors
    // cascade into chain reactions.
    flagChainEdges(ring, run) {
      if (!ring.pieces.length) return;
      let midA = Math.atan2(
        run.reduce((s, p) => s + Math.sin(p.a), 0),
        run.reduce((s, p) => s + Math.cos(p.a), 0)
      );
      let bestCW = null, bestCCW = null, dCW = Infinity, dCCW = Infinity;
      for (const p of ring.pieces) {
        if (p.boss) continue;
        const d = WB.angDiff(midA, p.a);
        if (d >= 0 && d < dCW) { dCW = d; bestCW = p; }
        if (d < 0 && -d < dCCW) { dCCW = -d; bestCCW = p; }
      }
      if (bestCW) { bestCW.chainT = CHAIN_WINDOW; bestCW.impulse = -GAP_PULL; }
      if (bestCCW) { bestCCW.chainT = CHAIN_WINDOW; bestCCW.impulse = GAP_PULL; }
    }

    checkChains() {
      for (const ring of this.rings) {
        for (const p of ring.pieces) {
          if (p.chainT <= 0 || p.boss) continue;
          const run = this.findRun(ring, p);
          if (run.length >= 3) {
            p.chainT = 0;
            this.burst(ring, run, true);
            return; // one chain per frame keeps cascades readable
          }
        }
      }
    }

    // ----- Orbit Shift: every match reshapes the level ----------------------
    triggerShift(matchedRing) {
      const pool = this.level.shifts || [];
      if (!pool.length) return;
      const kind = pool[this.shiftIdx % pool.length];
      this.shiftIdx++;
      const info = SHIFT_INFO[kind];
      this.banner = { text: info.label, color: info.color, t: 1.6 };
      WB.audio.shift();

      if (kind === 'reverse') {
        matchedRing.dir *= -1;
        WB.fx.ring(this.cx, this.cy, info.color, matchedRing.r);
      } else if (kind === 'surge') {
        this.surgeT = 3;
        WB.fx.shake(4);
      } else if (kind === 'lull') {
        this.lullT = 5;
        this.spawnT = Math.max(this.spawnT, 2);
      } else if (kind === 'leap') {
        this.doLeap(matchedRing);
      }
    }

    doLeap(fromRing) {
      const others = this.rings.filter(r => r !== fromRing && !(this.boss && r === this.boss.ring));
      if (!others.length || fromRing.pieces.length === 0) return;
      const target = others[Math.floor(this.rng() * others.length)];
      let moved = 0;
      for (let tries = 0; tries < 6 && moved < 2; tries++) {
        if (!fromRing.pieces.length || target.pieces.length >= target.capacity - 1) break;
        const p = fromRing.pieces[Math.floor(this.rng() * fromRing.pieces.length)];
        if (p.boss) continue;
        fromRing.pieces.splice(fromRing.pieces.indexOf(p), 1);
        p.radialFrom = fromRing.r;
        p.radial = 1; p.radialT = 0;
        p.chainT = CHAIN_WINDOW;
        target.pieces.push(p);
        moved++;
      }
      if (moved) WB.fx.ring(this.cx, this.cy, SHIFT_INFO.leap.color, target.r);
    }

    // ----- boss --------------------------------------------------------------
    hitBossSegment(pr, ring, seg) {
      const px = this.cx + Math.cos(seg.a) * ring.r;
      const py = this.cy + Math.sin(seg.a) * ring.r;
      const match = pr.prism || pr.pulse || pr.colorIdx === seg.colorIdx;
      if (!match) {
        WB.audio.bounce();
        WB.fx.burst(px, py, '#666a8c', 6, 90);
        return;
      }
      seg.bossHp--;
      WB.audio.bossHit();
      WB.vibrate(30);
      WB.fx.shake(8);
      WB.fx.burst(px, py, WB.COLORS[seg.colorIdx].main, 20, 240);
      if (seg.bossHp <= 0) {
        ring.pieces.splice(ring.pieces.indexOf(seg), 1);
        this.boss.alive--;
        this.boss.rage++;
        this.score += 400;
        this.energy += 2;
        WB.fx.ring(px, py, '#ffffff', this.pieceR * 6);
        WB.fx.text(px, py, 'SHELL BROKEN', '#ffd9f4', true);
        WB.fx.slowMo(0.5);
        if (this.boss.alive > 0) {
          this.banner = { text: 'THE SERPENT RAGES', color: '#ff9db0', t: 1.6 };
        }
      } else {
        // Cracked segment reveals a new shell color — re-aim!
        seg.colorIdx = (seg.colorIdx + 1 + Math.floor(this.rng() * (this.level.colors - 1))) % this.level.colors;
        WB.fx.text(px, py, 'CRACKED!', '#ffffff');
      }
    }

    updateBoss(dt) {
      if (!this.boss || this.boss.alive <= 0) return;
      const b = this.boss;
      b.roarT -= dt;
      if (b.roarT <= 0) {
        b.roarT = b.roarEvery;
        for (const ring of this.rings) ring.dir *= -1;
        this.surgeT = 2;
        this.banner = { text: 'THE SERPENT ROARS', color: '#ff9db0', t: 1.6 };
        WB.audio.shift();
        WB.fx.shake(9);
        WB.vibrate(40);
      }
      b.eatT -= dt;
      if (b.eatT <= 0) {
        b.eatT = b.eatEvery;
        // The serpent feeds: two extra wisps burst onto the inner ring.
        const inner = this.rings[0];
        for (let i = 0; i < 2 && inner.pieces.length < inner.capacity; i++) {
          const c = Math.floor(this.rng() * this.level.colors);
          inner.pieces.push(makePiece(c, inner.gateA + i * 0.4));
        }
        this.banner = { text: 'THE SERPENT FEEDS', color: '#c9b2ff', t: 1.4 };
        if (inner.pieces.length >= inner.capacity) this.fail();
      }
    }

    // ----- win / lose ---------------------------------------------------------
    fail() {
      if (this.result) return;
      this.result = 'lost';
      this.resultT = 0;
      WB.audio.lose();
      WB.vibrate(60);
      WB.fx.shake(12);
    }

    winNow() {
      if (this.result) return;
      this.result = 'won';
      this.resultT = 0;
      WB.audio.win();
      WB.vibrate(50);
      WB.fx.slowMo(0.7);
      for (const ring of this.rings) {
        for (const p of ring.pieces) {
          const px = this.cx + Math.cos(p.a) * ring.r;
          const py = this.cy + Math.sin(p.a) * ring.r;
          WB.fx.burst(px, py, p.boss ? '#fff' : WB.COLORS[p.colorIdx].main, 8, 150);
        }
      }
    }

    checkEnd() {
      if (this.result) return;
      // Overflow loss applies to every mode.
      for (const ring of this.rings) {
        if (!(this.boss && ring === this.boss.ring) && ring.pieces.length >= ring.capacity) {
          this.fail();
          return;
        }
      }
      const o = this.level.obj;
      if (o === 'bloom' && this.energy >= this.level.target) this.winNow();
      else if (o === 'cleanse' && this.cleansed >= this.cleanseTarget) this.winNow();
      else if (o === 'survive' && this.time >= this.level.time) this.winNow();
      else if (o === 'boss' && this.boss && this.boss.alive <= 0) this.winNow();
      // 'endless' only ends by overflow.
    }

    stars() {
      if (this.result !== 'won') return 0;
      let s = 1;
      if (this.score >= this.level.s2) s++;
      if (this.score >= this.level.s3) s++;
      return s;
    }

    objectiveText() {
      const o = this.level.obj;
      if (o === 'bloom') return { icon: 'bloom', text: this.energy + ' / ' + this.level.target };
      if (o === 'cleanse') return { icon: 'cleanse', text: (this.cleanseTarget - this.cleansed) + ' left' };
      if (o === 'survive') return { icon: 'time', text: Math.max(0, Math.ceil(this.level.time - this.time)) + 's' };
      if (o === 'boss') return { icon: 'boss', text: this.boss.alive + ' / ' + this.boss.total };
      return { icon: 'time', text: Math.floor(this.time) + 's' };
    }

    // ===== rendering ==========================================================
    draw(ctx) {
      const t = this.time;

      // Orbit paths with direction dashes
      for (const ring of this.rings) {
        const crowd = ring.pieces.length / ring.capacity;
        const danger = crowd > 0.78 && !(this.boss && ring === this.boss.ring);
        ctx.save();
        ctx.strokeStyle = danger
          ? 'rgba(255,110,130,' + (0.16 + 0.12 * Math.sin(t * 6)) + ')'
          : 'rgba(140,160,220,0.13)';
        ctx.lineWidth = this.pieceR * 1.7;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, ring.r, 0, WB.TAU);
        ctx.stroke();
        ctx.strokeStyle = danger ? 'rgba(255,140,150,0.5)' : 'rgba(160,185,255,0.28)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([7, 13]);
        ctx.lineDashOffset = ring.dashOff;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, ring.r, 0, WB.TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        // Spawn gate bud
        if (this.level.spawn && this.level.spawn.rings.includes(ring.idx)) {
          const gx = this.cx + Math.cos(ring.gateA) * ring.r;
          const gy = this.cy + Math.sin(ring.gateA) * ring.r;
          const pulse = 0.6 + 0.4 * Math.sin(t * 3);
          ctx.save();
          ctx.globalAlpha = this.lullT > 0 ? 0.25 : 0.5 * pulse + 0.2;
          ctx.fillStyle = '#dfe8ff';
          ctx.beginPath();
          ctx.arc(gx, gy, 4, 0, WB.TAU);
          ctx.fill();
          ctx.strokeStyle = '#dfe8ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(gx, gy, 8 + pulse * 3, 0, WB.TAU);
          ctx.stroke();
          ctx.restore();
        }
      }

      this.drawAim(ctx);

      // Pieces
      for (const ring of this.rings) {
        for (const p of ring.pieces) {
          this.drawPiece(ctx, ring, p);
        }
      }

      // Projectiles
      for (const pr of this.projectiles) {
        this.drawOrb(ctx, pr.x, pr.y, this.pieceR * 0.95,
          pr.pulse ? null : (pr.prism ? null : pr.colorIdx), pr.prism, pr.pulse, 1, 0);
      }

      this.drawCore(ctx, t);
      WB.fx.draw(ctx);
      this.drawBanner(ctx);
    }

    drawAim(ctx) {
      if (!this.aiming) return;
      const v = this.aimVec;
      if (!v) return;
      // March along the ray to the first wisp we would hit.
      const maxR = this.rings[this.rings.length - 1].r + 50;
      let hitX = this.cx + v.x * maxR, hitY = this.cy + v.y * maxR, found = false;
      for (let d = this.coreR + 10; d < maxR; d += 7) {
        const x = this.cx + v.x * d, y = this.cy + v.y * d;
        if (this.findHit(x, y)) { hitX = x; hitY = y; found = true; break; }
      }
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 9]);
      ctx.beginPath();
      ctx.moveTo(this.cx + v.x * (this.coreR + 8), this.cy + v.y * (this.coreR + 8));
      ctx.lineTo(hitX, hitY);
      ctx.stroke();
      ctx.setLineDash([]);
      if (found) {
        const c = this.current.prism ? '#ffffff' : WB.COLORS[this.current.colorIdx].main;
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hitX, hitY, this.pieceR + 3 + Math.sin(this.time * 8) * 2, 0, WB.TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawPiece(ctx, ring, p) {
      const rr = this.pieceRadius(ring, p);
      const x = this.cx + Math.cos(p.a) * rr;
      const y = this.cy + Math.sin(p.a) * rr;
      const wob = 1 + Math.sin(p.wobble) * 0.05;
      const s = p.scale * wob;
      if (p.boss) {
        this.drawBossSegment(ctx, x, y, p, s);
      } else {
        this.drawOrb(ctx, x, y, this.pieceR * s, p.colorIdx, p.prism, false, 1, p.corrupt ? 1 : 0);
      }
    }

    // The universal wisp renderer: colored orb + colorblind glyph.
    drawOrb(ctx, x, y, r, colorIdx, prism, pulse, alpha, corrupt) {
      ctx.save();
      ctx.globalAlpha = alpha;
      let main, dark;
      if (pulse) { main = '#ffffff'; dark = '#8a93c9'; }
      else if (prism) {
        const hue = (performance.now() * 0.12) % 360;
        main = 'hsl(' + hue + ',85%,75%)';
        dark = 'hsl(' + hue + ',60%,35%)';
      } else {
        main = WB.COLORS[colorIdx].main;
        dark = WB.COLORS[colorIdx].dark;
      }
      // Soft glow
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.2);
      g.addColorStop(0, main);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha * (corrupt ? 0.12 : 0.3);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, WB.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      // Body
      const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.15, x, y, r);
      if (corrupt) {
        body.addColorStop(0, '#4a3f63');
        body.addColorStop(1, '#221b34');
      } else {
        body.addColorStop(0, '#ffffff');
        body.addColorStop(0.35, main);
        body.addColorStop(1, dark);
      }
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, WB.TAU);
      ctx.fill();
      // Corrupted thorns
      if (corrupt) {
        ctx.strokeStyle = '#151022';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * WB.TAU + x * 0.01;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
          ctx.lineTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35);
          ctx.stroke();
        }
      }
      // Glyph (also readable on corrupted wisps — their "true color")
      if (colorIdx != null && colorIdx >= 0 && !pulse && !prism) {
        this.drawGlyph(ctx, x, y, r * 0.44, WB.COLORS[colorIdx].glyph,
          corrupt ? WB.COLORS[colorIdx].main : 'rgba(20,18,40,0.75)');
      }
      if (prism) {
        this.drawGlyph(ctx, x, y, r * 0.44, 'star', 'rgba(255,255,255,0.9)');
      }
      if (pulse) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, WB.TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawGlyph(ctx, x, y, s, kind, color) {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, s * 0.4);
      ctx.beginPath();
      if (kind === 'dot') {
        ctx.arc(x, y, s * 0.7, 0, WB.TAU);
        ctx.fill();
      } else if (kind === 'diamond') {
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
        ctx.closePath(); ctx.fill();
      } else if (kind === 'triangle') {
        ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.9, y + s * 0.7); ctx.lineTo(x - s * 0.9, y + s * 0.7);
        ctx.closePath(); ctx.fill();
      } else if (kind === 'cross') {
        ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
        ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
        ctx.stroke();
      } else if (kind === 'star') {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * WB.TAU + Math.PI / 4;
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
        }
        ctx.stroke();
      }
    }

    drawBossSegment(ctx, x, y, p, s) {
      const r = this.pieceR * 1.5 * s;
      ctx.save();
      // Shadow body
      const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
      body.addColorStop(0, '#3b3252');
      body.addColorStop(1, '#171226');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, WB.TAU);
      ctx.fill();
      // Colored shell plates
      const c = WB.COLORS[p.colorIdx];
      ctx.strokeStyle = c.main;
      ctx.lineWidth = p.bossHp >= 2 ? 5 : 2.5;
      if (p.bossHp < 2) ctx.setLineDash([6, 5]); // cracked shell
      ctx.beginPath();
      ctx.arc(x, y, r * 0.8, 0, WB.TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // Eye
      ctx.fillStyle = '#ffd9f4';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.28, 0, WB.TAU);
      ctx.fill();
      ctx.fillStyle = '#1a1128';
      ctx.beginPath();
      ctx.arc(x + Math.cos(this.time * 1.7) * r * 0.1, y + Math.sin(this.time * 1.3) * r * 0.1, r * 0.13, 0, WB.TAU);
      ctx.fill();
      // Color glyph so the target color is unmistakable
      this.drawGlyph(ctx, x, y - r * 1.35, r * 0.24, c.glyph, c.main);
      ctx.restore();
    }

    drawCore(ctx, t) {
      const { cx, cy, coreR } = this;
      const target = this.level.target || 40;
      const energyK = this.level.obj === 'bloom' ? WB.clamp(this.energy / target, 0, 1)
        : WB.clamp(this.energy / 60, 0, 1);
      ctx.save();
      // Petals: open wider as the core charges
      const petals = 6;
      const open = 0.5 + energyK * 0.7;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * WB.TAU + t * 0.15;
        const px = cx + Math.cos(a) * coreR * 0.72;
        const py = cy + Math.sin(a) * coreR * 0.72;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.scale(1, open + Math.sin(t * 1.8 + i) * 0.06);
        ctx.fillStyle = 'rgba(122,224,255,0.16)';
        ctx.strokeStyle = 'rgba(160,235,255,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, -coreR * 0.55, coreR * 0.34, coreR * 0.72, 0, 0, WB.TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      // Core body glow
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, coreR * 0.1, cx, cy, coreR * 2.4);
      g.addColorStop(0, 'rgba(190,240,255,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.4, 0, WB.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      const body = ctx.createRadialGradient(cx - coreR * 0.3, cy - coreR * 0.3, coreR * 0.1, cx, cy, coreR);
      body.addColorStop(0, '#eafcff');
      body.addColorStop(0.55, '#7ecbe8');
      body.addColorStop(1, '#2b5d8f');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, WB.TAU);
      ctx.fill();
      // Energy ring for bloom levels
      if (this.level.obj === 'bloom') {
        ctx.strokeStyle = '#ffe9b0';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR + 6, -Math.PI / 2, -Math.PI / 2 + WB.TAU * energyK);
        ctx.stroke();
      }
      // Loaded wisp (tap target for swap)
      const sway = this.aiming && this.aimVec ? this.aimVec : { x: 0, y: -1 };
      this.drawOrb(ctx, cx + sway.x * coreR * 0.1, cy + sway.y * coreR * 0.1,
        this.pieceR * 1.05, this.current.prism ? null : this.current.colorIdx,
        !!this.current.prism, this.pulseArmed, 1, 0);
      // Next wisp preview, tucked under the core
      this.drawOrb(ctx, cx + coreR * 1.35, cy + coreR * 1.1, this.pieceR * 0.62,
        this.next.prism ? null : this.next.colorIdx, !!this.next.prism, false, 0.85, 0);
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#cfe3ff';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', cx + coreR * 1.35, cy + coreR * 1.1 + this.pieceR + 12);
      ctx.restore();
    }

    drawBanner(ctx) {
      if (!this.banner) return;
      const b = this.banner;
      const k = WB.clamp(b.t / 0.3, 0, 1);
      ctx.save();
      ctx.globalAlpha = Math.min(1, k);
      ctx.textAlign = 'center';
      const y = b.hint ? this.h * 0.83 : this.cy - this.rings[this.rings.length - 1].r - 26;
      // Shrink long banners so they never clip on narrow screens.
      let size = b.hint ? 16 : 22;
      ctx.font = (b.hint ? '600 ' : '800 ') + size + 'px system-ui, sans-serif';
      while (size > 11 && ctx.measureText(b.text).width > this.w - 56) {
        size--;
        ctx.font = (b.hint ? '600 ' : '800 ') + size + 'px system-ui, sans-serif';
      }
      ctx.fillStyle = 'rgba(10,14,30,0.55)';
      const w = ctx.measureText(b.text).width + 36;
      WB.roundRect(ctx, this.cx - w / 2, y - 22, w, 34, 17);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, this.cx, y + 2);
      ctx.restore();
    }
  }

  WB.Game = Game;
})(window.WB);
