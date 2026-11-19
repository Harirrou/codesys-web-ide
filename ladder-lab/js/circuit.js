/* Ladder Lab — Circuit Lab engine: hard-wired control circuits (contactors, buttons, relays, timers), no PLC.
 * A control circuit is a grid of COLS current paths between the L rail (top) and the N rail (bottom).
 * A cell holds a wire, a contact of a device, or a load (coil, timer, lamp…). Neighbouring paths can be linked
 * at the boundary between two rows. Every 10 ms the engine finds which points are connected to L and to N:
 * a load is on when one side reaches L and the other side reaches N; L joined to N without a load is a short circuit.
 * Contactors pick up one tick after their coil is on and drop three ticks after it is off (so overlaps are real).
 * Pure logic (runs in Node for the tests). Drawing and editing live in circuit-ui.js. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const EC = (LL.EC = {});
  const COLS = (EC.COLS = 6), ROWS = (EC.ROWS = 7), DT = 10;
  const LOADS = (EC.LOADS = ['COIL', 'TON', 'TOF', 'LAMP', 'HORN', 'VALVE']);
  const isLoad = (c) => !!c && LOADS.includes(c.t);

  // ───────────── circuit data and text format ─────────────
  // cells[r][c]: null | {t:'W'} | {t:'NO'|'NC', d} | {t:'COIL'|'LAMP'|'HORN'|'VALVE', d} | {t:'TON'|'TOF', d, s}
  // links[r][c] (r = 1 … ROWS-1): a wire between path c and path c+1 at the top of row r
  // pw: choices made in the power circuit (which phases a contactor swaps, where the capacitor goes…), text lines "@ key=value"
  EC.empty = () => ({ cells: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), links: Array.from({ length: ROWS + 1 }, () => Array(COLS - 1).fill(false)), pw: {} });
  EC.parse = function (text) {
    const c = EC.empty(); let r = 0, pend = null;
    String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
      if (line[0] === '@') { const m = /^@\s*(\w+)=(\w*)$/.exec(line); if (m) c.pw[m[1]] = m[2]; return; }
      if (line[0] === '~') { pend = line.slice(1).trim().split(/\s+/).filter((x) => /^\d$/.test(x)).map(Number); return; }
      if (r >= ROWS) return;
      if (pend && r > 0) pend.forEach((k) => { if (k < COLS - 1) c.links[r][k] = true; });
      pend = null;
      line.split(/\s+/).slice(0, COLS).forEach((tok, k) => {
        if (tok === '.' || !tok) return;
        const p = tok.split(':');
        if (p[0] === 'W') c.cells[r][k] = { t: 'W' };
        else if (p[0] === 'NO' || p[0] === 'NC') c.cells[r][k] = { t: p[0], d: p[1] };
        else if (p[0] === 'TON' || p[0] === 'TOF') c.cells[r][k] = { t: p[0], d: p[1], s: +p[2] || 3 };
        else if (LOADS.includes(p[0])) c.cells[r][k] = { t: p[0], d: p[1] };
      });
      r++;
    });
    return c;
  };
  EC.toText = function (c) {
    let last = -1; c.cells.forEach((row, r) => { if (row.some(Boolean)) last = r; });
    const out = Object.keys(c.pw || {}).filter((k) => c.pw[k]).sort().map((k) => '@ ' + k + '=' + c.pw[k]);
    for (let r = 0; r <= last; r++) {
      const lk = c.links[r].map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
      if (r > 0 && lk.length) out.push('~ ' + lk.join(' '));
      let row = c.cells[r].map((x) => (!x ? '.' : x.t === 'W' ? 'W' : x.t === 'TON' || x.t === 'TOF' ? x.t + ':' + x.d + ':' + x.s : x.t + ':' + x.d));
      while (row.length > 1 && row[row.length - 1] === '.') row.pop();
      out.push(row.join(' '));
    }
    return out.join('\n');
  };
  EC.isEmpty = (c) => !c.cells.some((row) => row.some(Boolean)) && !Object.keys(c.pw || {}).some((k) => c.pw[k]);

  // ───────────── simulation ─────────────
  const NL = 0, NN = 1, node = (c, r) => (r <= 0 ? NL : r >= ROWS ? NN : 2 + (r - 1) * COLS + c);
  EC.node = node;
  function Sim(circ, task) {
    this.c = circ; this.task = task; this.scn = EC.SCN[task.scn || 'none'];
    this.kind = {}; this.D = {};
    task.parts.forEach((p) => { this.kind[p.d] = p.k; this.D[p.d] = { v: 0, on: 0, off: 0, acc: 0, en: 0 }; });
    this.st = this.scn.init(); this.t = 0; this.mcb = true; this.short = ''; this.root = []; this.en = [];
    this.solve();
  }
  EC.Sim = Sim;
  Sim.prototype.conducts = function (cell) { const d = this.D[cell.d]; if (!d) return false; return cell.t === 'NO' ? !!d.v : !d.v; };
  // which points are joined right now (union-find over the grid nodes)
  Sim.prototype.solve = function () {
    const n = 2 + (ROWS - 1) * COLS, par = Array.from({ length: n }, (_, i) => i);
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
    const loads = [];
    for (let c = 0; c < COLS; c++) {
      let after = false;
      for (let r = 0; r < ROWS; r++) {
        const cell = this.c.cells[r][c], a = node(c, r), b = node(c, r + 1);
        if (!cell) { if (after) join(a, b); continue; }           // below a load, an empty cell is a wire down to N
        if (isLoad(cell)) { loads.push({ cell, a, b, r, c }); after = true; continue; }
        after = false;
        if (cell.t === 'W' || this.conducts(cell)) join(a, b);
      }
    }
    for (let r = 1; r < ROWS; r++) for (let c = 0; c < COLS - 1; c++) if (this.c.links[r][c]) join(node(c, r), node(c + 1, r));
    const isShort = find(NL) === find(NN);
    this.root = par.map((_, i) => find(i)); this.loads = loads;
    this.live = (i) => this.mcb && !isShort && this.root[i] === this.root[NL];
    this.neutral = (i) => this.root[i] === this.root[NN];
    return isShort;
  };
  Sim.prototype.tick = function () {
    const isShort = this.solve();
    if (isShort && this.mcb) { this.mcb = false; this.short = 'Short circuit in the control circuit: L is joined to N without a load between them. The control breaker F1 tripped.'; }
    const en = {};
    this.loads.forEach((l) => { const on = this.mcb && !isShort && ((this.live(l.a) && this.neutral(l.b)) || (this.live(l.b) && this.neutral(l.a))); if (on) en[l.cell.d] = l.cell; else if (!en[l.cell.d]) en[l.cell.d] = null; });
    Object.keys(this.D).forEach((tag) => {
      const d = this.D[tag], k = this.kind[tag], cell = en[tag], on = !!cell;
      d.en = on ? 1 : 0;
      if (k === 'k') { if (d.weld) d.v = 1; else if (on && !d.jam) { d.off = 0; d.v = 1; } else if (d.v) { d.off++; if (d.off >= 3) d.v = 0; } }   // test faults: weld = contacts stuck closed, jam = it cannot pull in
      else if (k === 'kt') {
        const mode = cell ? cell.t : d.mode; if (cell) { d.mode = cell.t; d.s = cell.s; }
        if (mode === 'TOF') { if (on) { d.v = 1; d.acc = 0; } else if (d.v) { d.acc += DT; if (d.acc >= (d.s || 3) * 1000) d.v = 0; } }
        else { if (on) { d.acc += DT; d.v = d.acc >= (d.s || 3) * 1000 ? 1 : 0; } else { d.acc = 0; d.v = 0; } }
      } else if (k === 'lamp' || k === 'horn' || k === 'valve') d.v = on ? 1 : 0;
    });
    this.scn.step(this.st, this.D, DT, this.c.pw || {}, this.task);
    this.t += DT;
  };
  Sim.prototype.resetMcb = function () { this.mcb = true; this.short = ''; };

  // ───────────── the machines behind the circuits (power side) ─────────────
  const V = (D, t) => (D[t] ? D[t].v : 0);
  const spin = (st, key, target, dt, tau) => { st[key] += (target - st[key]) * Math.min(1, dt / (tau || 500)); if (Math.abs(st[key]) < 0.002) st[key] = 0; };
  // an overload that has tripped must drop the contactor through its NC contact 95-96
  const burn = (st, D, ol, running, dt, name) => {
    if (V(D, ol) && running) { st['hot' + ol] = (st['hot' + ol] || 0) + dt; if (st['hot' + ol] > 1500 && !st.fault) st.fault = 'The overload relay ' + ol + ' tripped, but ' + name + ' stayed closed: the motor burns. Put its NC contact (95-96) in the coil circuit.'; }
    else st['hot' + ol] = 0;
  };
  // A power circuit the learner builds: three places between the supply and the motor (pw.p1 … pw.p3).
  // Returns '' when it is right, or the reason why it is not.
  EC.powerCheck = function (pw, task) {
    if (task && task.scn === 'rev') {
      // four places: one above (p1), two side by side (p2, p3), one below (p4)
      const b = [pw.p1, pw.p2, pw.p3, pw.p4];
      if (b.some((x) => !x)) return 'The power circuit is not complete: a place between the supply and the motor is still empty.';
      if (b[0] !== 'Q1') return 'The main breaker Q1 must come first: it protects and isolates everything after it.';
      if (b[3] !== 'F2') return 'The overload relay F2 is the last part before the motor: both directions must go through it. The two places side by side are for the two contactors.';
      return '';
    }
    const a = [pw.p1, pw.p2, pw.p3];
    if (a.some((x) => !x)) return 'The power circuit is not complete: a place between the supply and the motor is still empty.';
    if (a[0] !== 'Q1') return 'The main breaker Q1 must come first: it protects and isolates everything after it.';
    if (a[1] !== 'K1') return 'The contactor KM1 comes before the overload relay: the relay sits directly in front of the motor and measures its current.';
    return '';
  };
  EC.SCN = {
    none: { init: () => ({ fault: '' }), step() {} },
    free: { init: () => ({ fault: '', n1: 0, n2: 0, n3: 0 }), step(st, D, dt) { ['K1', 'K2', 'K3'].forEach((k, i) => spin(st, 'n' + (i + 1), V(D, k), dt)); } },
    dol: {
      init: () => ({ fault: '', n: 0, rpm: 0, run: 0 }),
      step(st, D, dt, pw, task) { st.note = task && task.pbuild ? EC.powerCheck(pw, task) : ''; const run = V(D, 'K1') && !st.note ? 1 : 0; spin(st, 'n', run, dt); st.run = run; st.rpm = Math.round(st.n * 1480); burn(st, D, 'F2', run, dt, 'KM1'); },
    },
    rev: {
      init: () => ({ fault: '', n: 0, rpm: 0, dir: 0 }),
      step(st, D, dt, pw, task) {
        st.note = task && task.pbuild ? EC.powerCheck(pw, task) : '';
        const f = st.note ? 0 : V(D, 'K1'), r = st.note ? 0 : V(D, 'K2'), sw = pw.swap || '';
        if (f && r && sw !== 'same' && !st.fault) st.fault = 'KM1 and KM2 closed together: a short circuit between two phases. The main breaker tripped with a bang.';
        const dir = st.fault ? 0 : f ? 1 : r ? (sw === 'l13' ? -1 : sw ? 1 : 0) : 0; spin(st, 'n', dir, dt); st.dir = dir; st.rpm = Math.round(st.n * 1480); burn(st, D, 'F2', f || r, dt, 'the contactor');
      },
    },
    two: {
      init: () => ({ fault: '', n1: 0, n2: 0, pile: 0, run1: 0, run2: 0 }),
      step(st, D, dt) {
        const a = V(D, 'K1'), b = V(D, 'K2'); spin(st, 'n1', a, dt); spin(st, 'n2', b, dt); st.run1 = a; st.run2 = b;
        if (b && !a) { st.pile += dt; if (st.pile > 1500 && !st.fault) st.fault = 'Conveyor 2 feeds onto the stopped conveyor 1: the material piles up.'; } else st.pile = 0;
        burn(st, D, 'F2', a, dt, 'KM1'); burn(st, D, 'F3', b, dt, 'KM2');
      },
    },
    sd: {
      init: () => ({ fault: '', n: 0, pct: 0, mode: 0, prot: 1 }),
      step(st, D, dt, pw, task) {
        const m = V(D, 'K1'), y = V(D, 'K2'), d = V(D, 'K3');
        // a task can ask how the delta contactor is wired (pw.d) and how the overload relay is set (pw.ol)
        const ask = !!(task && task.power), dsel = ask ? (pw && pw.d) || '' : 'next', ol = ask ? (pw && pw.ol) || '' : '58';
        st.prot = ol === '58' ? 1 : 0;
        st.note = ol === '100' ? 'Set to the full nameplate current, the relay trips too late: it sits in the winding circuit, where only 0.58 × that current flows.' : ol === '173' ? 'Set to 1.73 × the nameplate current, the relay never trips before the motor burns: only 0.58 × the nameplate current flows through it.' : '';
        if (y && d && !st.fault) st.fault = 'Star and delta contactors closed together: a short circuit. They need an interlock.';
        if (m && d && !y && st.n < 0.6 && dsel === 'next' && !st.fault) st.fault = 'Delta at low speed: the starting current tripped the breaker. Start in star first.';
        const run = !st.fault && m; st.mode = run && y ? 1 : run && d ? 2 : 0;
        if (st.mode === 2 && dsel !== 'next') { st.dbad = (st.dbad || 0) + dt; if (st.dbad > 2500 && !st.fault) st.fault = dsel === 'same' ? 'In delta the motor lost its power and slowed down: each winding has the same phase on both ends, so no voltage is across it.' : dsel === 'n' ? 'The winding ends are on N: that is still a star connection, the motor never gets its full power. A delta links each winding end to the next phase.' : 'The delta contactor is not wired yet.'; } else st.dbad = 0;
        if (st.mode === 1) spin(st, 'n', 0.88, dt, 900); else if (st.mode === 2) spin(st, 'n', dsel === 'next' ? 1 : dsel === 'n' ? 0.88 : 0, dt, dsel === 'next' ? 300 : 900); else spin(st, 'n', 0, dt, 900);
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', m && (y || d), dt, 'KM1');
      },
    },
    tank: {
      init: () => ({ fault: '', level: 50, lv: 50, starts: 0, was: 0 }),
      step(st, D, dt) {
        const p = V(D, 'K1'); if (p && !st.was) st.starts++; st.was = p;
        st.level = Math.max(0, st.level + (p ? 8 : -4) * dt / 1000);
        if (st.level >= 100 && !st.fault) { st.level = 100; st.fault = 'The tank overflowed: the pump did not stop at the high float switch.'; }
        st.lv = Math.round(st.level);
        if (D.B1) D.B1.v = st.level >= 30 ? 1 : 0; if (D.B2) D.B2.v = st.level >= 80 ? 1 : 0;
        burn(st, D, 'F2', p, dt, 'KM1');
      },
    },
    // a 3-phase motor on a single-phase supply with a run capacitor (Steinmetz connection)
    stein: {
      init: () => ({ fault: '', n: 0, rpm: 0, hum: 0 }),
      step(st, D, dt, pw) {
        const run = V(D, 'K1'), ok = pw.conn === 'delta' && (pw.cap === 'wl' || pw.cap === 'wn');
        spin(st, 'n', run && ok ? (pw.cap === 'wl' ? 0.96 : -0.96) : 0, dt, 700); st.hum = run && !ok ? 1 : 0; st.rpm = Math.round(st.n * 1480);
        burn(st, D, 'F2', run, dt, 'KM1');
      },
    },
    // the same motor with a heavy start: a start capacitor helps for the first seconds only
    steinh: {
      init: () => ({ fault: '', n: 0, rpm: 0, stall: 0, long: 0, hum: 0 }),
      step(st, D, dt) {
        const run = V(D, 'K1'), boost = V(D, 'K2');
        if (run && boost) spin(st, 'n', 0.96, dt, 500); else if (run && st.n > 0.7) spin(st, 'n', 0.96, dt, 500); else spin(st, 'n', 0, dt, 500);
        st.hum = run && !boost && st.n < 0.7 ? 1 : 0;
        if (st.hum) { st.stall += dt; if (st.stall > 3000 && !st.fault) st.fault = 'The motor hums but cannot start this load: the run capacitor alone gives too little torque. Add the start capacitor for the first seconds.'; } else st.stall = 0;
        if (run && boost && st.n > 0.9) { st.long += dt; if (st.long > 3000 && !st.fault) st.fault = 'The start capacitor stayed connected at full speed: it is made for a few seconds only and has burst.'; } else st.long = 0;
        st.rpm = Math.round(st.n * 1480); burn(st, D, 'F2', run, dt, 'KM1');
      },
    },
    // stator resistance starter: KM1 through the resistors, KM2 bridges them
    res: {
      init: () => ({ fault: '', n: 0, pct: 0, heat: 0 }),
      step(st, D, dt) {
        const a = V(D, 'K1'), b = V(D, 'K2');
        if (a && b && st.n < 0.5 && !st.fault) st.fault = 'Bypass closed too early: a full-voltage start, the breaker tripped.';
        const run = !st.fault && a; spin(st, 'n', run ? (b ? 1 : 0.9) : 0, dt, run && !b ? 1300 : 400);
        if (run && !b) { st.heat += dt; if (st.heat > 8000 && !st.fault) st.fault = 'The start resistors burnt: they are made for a short start. The bypass KM2 must close.'; } else st.heat = Math.max(0, st.heat - 2 * dt);
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', a, dt, 'KM1');
      },
    },
    // autotransformer starter: KM3 star point + KM2 transformer, then KM1 run
    at: {
      init: () => ({ fault: '', n: 0, pct: 0, heat: 0 }),
      step(st, D, dt) {
        const k1 = V(D, 'K1'), k2 = V(D, 'K2'), k3 = V(D, 'K3');
        if (k1 && k3 && !st.fault) st.fault = 'Run contactor and star point closed together: part of the transformer is shorted.';
        if (k1 && st.n < 0.5 && !st.fault) st.fault = 'Full voltage too early: the starting current tripped the breaker.';
        const ok = !st.fault; spin(st, 'n', ok && k1 ? 1 : ok && k2 && k3 ? 0.9 : ok && k2 ? 0.93 : 0, dt, k1 ? 400 : 1500);
        if (k2 && ok) { st.heat += dt; if (st.heat > 10000 && !st.fault) st.fault = 'The autotransformer overheated: KM2 must open after the start.'; } else st.heat = Math.max(0, st.heat - 2 * dt);
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', k1 || k2, dt, 'the contactor');
      },
    },
    // slip-ring motor: rotor resistance cut out in two steps
    rotor: {
      init: () => ({ fault: '', n: 0, pct: 0, heat: 0 }),
      step(st, D, dt) {
        const k1 = V(D, 'K1'), s1 = V(D, 'K2'), s2 = V(D, 'K3');
        if (k1 && !st.fault && ((s2 && st.n < 0.65) || (s1 && st.n < 0.35))) st.fault = 'Current surge: a rotor resistor step was bridged too early. The breaker tripped.';
        const run = !st.fault && k1; spin(st, 'n', run ? (s2 ? 1 : s1 ? 0.85 : 0.55) : 0, dt, 700);
        if (run && !s2) { st.heat += dt; if (st.heat > 12000 && !st.fault) st.fault = 'The rotor resistors overheated: bridge all steps after the start.'; } else st.heat = Math.max(0, st.heat - 2 * dt);
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', k1, dt, 'KM1');
      },
    },
    // soft starter: KM1 feeds it, RUN starts its ramp, the bypass KM2 takes over at the top of the ramp (B1)
    soft: {
      init: () => ({ fault: '', n: 0, pct: 0, hot: 0 }),
      step(st, D, dt) {
        const k1 = V(D, 'K1'), go = V(D, 'A1'), byp = V(D, 'K2');
        if (k1 && byp && st.n < 0.9 && !st.fault) st.fault = 'Bypass closed before the top of the ramp: a direct start through KM2.';
        const ok = !st.fault;
        if (ok && k1 && byp) spin(st, 'n', 1, dt, 200); else if (ok && k1 && go) st.n = Math.min(1, st.n + dt / 3000); else spin(st, 'n', 0, dt, 700);
        const top = ok && k1 && go && st.n >= 0.99; if (D.B1) D.B1.v = top ? 1 : 0;
        if (top && !byp) { st.hot += dt; if (st.hot > 5000 && !st.fault) st.fault = 'The soft starter carried the full current too long and overheated: close the bypass KM2 at the top of the ramp.'; } else st.hot = 0;
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', k1, dt, 'KM1');
      },
    },
    // duty and standby pump: only one may run
    pumps: {
      init: () => ({ fault: '', n1: 0, n2: 0, both: 0, run1: 0, run2: 0 }),
      step(st, D, dt) {
        const a = V(D, 'K1'), b = V(D, 'K2'); spin(st, 'n1', a, dt); spin(st, 'n2', b, dt); st.run1 = a; st.run2 = b;
        if (a && b) { st.both += dt; if (st.both > 1000 && !st.fault) st.fault = 'Both pumps run together: only the duty pump may run.'; } else st.both = 0;
        burn(st, D, 'F2', a, dt, 'KM1'); burn(st, D, 'F3', b, dt, 'KM2');
      },
    },
    // air compressor: pressure switch B1 (opens at 8 bar, closes again at 6 bar), load valve Y1
    comp: {
      init: () => ({ fault: '', n: 0, bar: 5, p10: 50, starts: 0, was: 0 }),
      step(st, D, dt) {
        const k = V(D, 'K1'), load = V(D, 'Y1');
        if (k && !st.was) st.starts++; st.was = k;
        if (k && load && st.n < 0.8 && !st.fault) st.fault = 'Started under load: the motor stalled and the breaker tripped. Load the compressor only when it is at speed.';
        spin(st, 'n', !st.fault && k ? 1 : 0, dt, 600);
        st.bar = Math.max(0, st.bar + ((k && load && st.n > 0.8 ? 0.6 : 0) - 0.2) * dt / 1000);
        if (st.bar >= 10 && !st.fault) st.fault = 'Pressure too high: the safety valve blew. The pressure switch must stop the motor.';
        if (D.B1) { if (st.bar >= 8) D.B1.v = 1; else if (st.bar <= 6) D.B1.v = 0; }
        st.p10 = Math.round(st.bar * 10); burn(st, D, 'F2', k, dt, 'KM1');
      },
    },
    // two-speed motor with two separate windings: KM1 low speed, KM2 high speed, each with its own overload relay
    spd2: {
      init: () => ({ fault: '', n: 0, rpm: 0, sp: 0 }),
      step(st, D, dt) {
        const lo = V(D, 'K1'), hi = V(D, 'K2');
        if (lo && hi && !st.fault) st.fault = 'Low and high speed contactors closed together: both windings are fed at once, they fight each other and the breaker tripped. They need an interlock.';
        st.sp = st.fault ? 0 : hi ? 2 : lo ? 1 : 0; spin(st, 'n', st.sp === 2 ? 1 : st.sp === 1 ? 0.5 : 0, dt, 600); st.rpm = Math.round(st.n * 2900);
        burn(st, D, 'F2', lo, dt, 'KM1'); burn(st, D, 'F3', hi, dt, 'KM2');
      },
    },
    // Dahlander motor: one winding with a centre tap. Low: KM1 feeds U1 V1 W1 (delta). High: KM2 feeds U2 V2 W2 and KM3 bridges U1 V1 W1 (double star).
    dahl: {
      init: () => ({ fault: '', n: 0, rpm: 0, sp: 0, bad: 0 }),
      step(st, D, dt) {
        const lo = V(D, 'K1'), hi = V(D, 'K2'), star = V(D, 'K3');
        if (lo && star && !st.fault) st.fault = 'KM1 (low speed) and KM3 (star point) closed together: KM3 bridges the three wires that KM1 feeds. A dead short circuit.';
        if (lo && hi && !st.fault) st.fault = 'Low and high speed contactors closed together: the winding is fed from both ends. The breaker tripped.';
        if (hi && !star && !st.fault) { st.bad += dt; if (st.bad > 1500) st.fault = 'KM2 feeds U2 V2 W2, but the star point KM3 is open: the winding is not connected for high speed. The motor hums and overheats. KM3 must close first.'; } else st.bad = 0;
        st.sp = st.fault ? 0 : hi && star ? 2 : lo ? 1 : 0; spin(st, 'n', st.sp === 2 ? 1 : st.sp === 1 ? 0.5 : 0, dt, 600); st.rpm = Math.round(st.n * 2900);
        burn(st, D, 'F2', lo, dt, 'KM1'); burn(st, D, 'F3', hi, dt, 'KM2');
      },
    },
    // single-phase motor: main winding, start winding with a start capacitor, centrifugal switch (opens at about 75 % speed)
    cap1: {
      init: () => ({ fault: '', n: 0, rpm: 0, hum: 0, cs: 1, stall: 0, long: 0, hunt: 0 }),
      step(st, D, dt, pw) {
        pw = pw || {};
        const run = V(D, 'K1'), cap = pw.cap || '', sw = pw.sw || '';
        st.cs = st.n < 0.75 ? 1 : 0;                                   // the switch on the shaft: closed at standstill
        const startOk = cap === 'aux' && !!sw, mainOn = run && !(sw === 'main' && !st.cs);
        const pull = run && !st.fault && mainOn && (st.n > 0.3 || startOk);   // a motor that already turns runs on its main winding alone
        spin(st, 'n', pull ? 0.97 : 0, dt, 600); st.rpm = Math.round(st.n * 1480);
        st.hum = run && !st.fault && st.n < 0.3 && !startOk ? 1 : 0;
        if (st.hum) { st.stall += dt; if (st.stall > 3000 && !st.fault) st.fault = cap === 'main' ? 'The motor only hums: with the capacitor in the main winding there is no strong field and no second, shifted field. The capacitor belongs in series with the start winding.' : cap === 'ln' ? 'The motor only hums: a capacitor across L and N does nothing inside the motor. It must be in series with the start winding, so that winding gets a shifted current.' : 'The motor only hums: the main winding alone makes a field that goes up and down but does not turn. Finish the power circuit.'; } else st.stall = 0;
        if (run && sw === 'main' && st.n > 0.5) { st.hunt += dt; if (st.hunt > 2500 && !st.fault) st.fault = 'The switch cuts the main winding at speed: the motor falls back, the switch closes, and it starts again, on and on. The switch must cut the start winding.'; } else st.hunt = 0;
        if (run && sw === 'none' && st.n > 0.9) { st.long += dt; if (st.long > 3000 && !st.fault) st.fault = 'The start winding and the start capacitor stayed connected at full speed: both are made for a few seconds only. The capacitor burst.'; } else st.long = 0;
        burn(st, D, 'F2', run, dt, 'KM1');
      },
    },
    // single-phase motor in two directions: KM1 forward, KM2 reverse (it must swap the ends of the start winding only)
    cap1r: {
      init: () => ({ fault: '', n: 0, rpm: 0, dir: 0, cs: 1 }),
      step(st, D, dt, pw) {
        pw = pw || {};
        const f = V(D, 'K1'), r = V(D, 'K2');
        if (f && r && !st.fault) st.fault = 'KM1 and KM2 closed together: L and N are joined through the two contactors. A short circuit.';
        st.cs = Math.abs(st.n) < 0.75 ? 1 : 0;
        const want = st.fault ? 0 : f ? 1 : r ? (pw.swap === 'aux' ? -1 : pw.swap ? 1 : 0) : 0;
        // a motor that still turns keeps its direction: its main winding alone pulls the rotor the way it already goes
        const dir = want && Math.abs(st.n) > 0.3 ? Math.sign(st.n) : want;
        spin(st, 'n', dir * 0.97, dt, 600); st.dir = dir; st.rpm = Math.round(st.n * 1480);
        burn(st, D, 'F2', f || r, dt, 'the contactor');
      },
    },
    // DC injection braking: KM1 runs the motor, KM2 puts DC from a rectifier on two motor wires for a few seconds
    brake: {
      init: () => ({ fault: '', n: 0, pct: 0, hot: 0, dc: 0 }),
      step(st, D, dt) {
        const k1 = V(D, 'K1'), k2 = V(D, 'K2');
        if (k1 && k2 && !st.fault) st.fault = 'KM1 and the brake contactor KM2 closed together: mains voltage on the DC supply. The rectifier is destroyed. They need an interlock.';
        const ok = !st.fault; st.dc = ok && k2 && !k1 ? 1 : 0;
        if (ok && k1) spin(st, 'n', 1, dt, 500); else if (st.dc) spin(st, 'n', 0, dt, 450); else spin(st, 'n', 0, dt, 5000);
        if (st.dc && st.n < 0.05) { st.hot += dt; if (st.hot > 5000 && !st.fault) st.fault = 'DC stayed on the stopped motor: the winding overheats. A timer must switch the brake off after a few seconds.'; } else if (!st.dc) st.hot = 0;
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', k1, dt, 'KM1');
      },
    },
    // plugging: KM2 reverses the field to brake; the zero-speed switch B1 (closed while the shaft turns forward) ends it
    plug: {
      init: () => ({ fault: '', n: 0, pct: 0 }),
      step(st, D, dt) {
        const k1 = V(D, 'K1'), k2 = V(D, 'K2');
        if (k1 && k2 && !st.fault) st.fault = 'KM1 and KM2 closed together: a short circuit between two phases. They need an interlock.';
        const ok = !st.fault;
        if (ok && k1) spin(st, 'n', 1, dt, 500); else if (ok && k2) spin(st, 'n', -1, dt, 900); else spin(st, 'n', 0, dt, 5000);
        if (st.n < -0.3 && !st.fault) st.fault = 'The motor ran backwards: plugging must end when the motor stops. The zero-speed switch B1 must drop KM2.';
        if (D.B1) D.B1.v = st.n > 0.1 ? 1 : 0;
        st.pct = Math.round(st.n * 100); burn(st, D, 'F2', k1 || k2, dt, 'the contactor');
      },
    },
    // a drive: no contactors, only signals on its inputs DI1 (forward) and DI2 (reverse)
    vfd: {
      init: () => ({ fault: '', n: 0, hz: 0 }),
      step(st, D, dt) {
        const f = V(D, 'A1'), r = V(D, 'A2'), flt = V(D, 'F5');
        if (f && r && !st.fault) st.fault = 'Run forward and run reverse given together: the drive stops with a command fault.';
        const tgt = flt || st.fault ? 0 : f ? 1 : r ? -1 : 0, d = tgt - st.n, mx = dt / 2000;
        st.n += Math.abs(d) <= mx ? d : Math.sign(d) * mx; st.hz = Math.round(st.n * 50);
      },
    },
    hoist: {
      init: () => ({ fault: '', pos: 50, p: 50, dir: 0 }),
      step(st, D, dt) {
        const up = V(D, 'K1'), dn = V(D, 'K2');
        if (up && dn && !st.fault) st.fault = 'Up and down contactors closed together: a short circuit between two phases.';
        st.dir = st.fault ? 0 : up ? 1 : dn ? -1 : 0; st.pos += st.dir * 20 * dt / 1000;
        if (st.pos >= 100 && !st.fault) { st.pos = 100; st.fault = 'The hook ran into the top: the top limit switch B1 must cut the UP contactor.'; }
        if (st.pos <= 0 && !st.fault) { st.pos = 0; st.fault = 'The rope went slack at the bottom: the bottom limit switch B2 must cut the DOWN contactor.'; }
        st.p = Math.round(st.pos);
        if (D.B1) D.B1.v = st.pos >= 95 ? 1 : 0; if (D.B2) D.B2.v = st.pos <= 5 ? 1 : 0;
        burn(st, D, 'F2', up || dn, dt, 'the contactor');
      },
    },
  };

  // ───────────── static checks ─────────────
  EC.lint = function (circ, task) {
    const out = [], kind = {}; task.parts.forEach((p) => (kind[p.d] = p.k));
    (task.power || []).forEach((q) => { if (!(circ.pw || {})[q.k]) out.push('The power circuit is not finished: ' + q.q); });
    if (task.pbuild && EC.powerCheck(circ.pw || {}, task)) out.push(EC.powerCheck(circ.pw || {}, task));
    const coils = {}, contacts = {};
    circ.cells.forEach((row) => row.forEach((x) => { if (!x || !x.d) return; if (isLoad(x)) coils[x.d] = (coils[x.d] || 0) + 1; else contacts[x.d] = 1; }));
    Object.keys(coils).forEach((d) => { if (coils[d] > 1) out.push(d + ' is placed ' + coils[d] + ' times as a load. A device has one coil (or one lamp).'); });
    Object.keys(contacts).forEach((d) => { if ((kind[d] === 'k' || kind[d] === 'kt') && !coils[d]) out.push('You use a contact of ' + d + ', but its coil is not in the circuit: the contact will never switch.'); });
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 1; r++) {
      const a = circ.cells[r][c]; if (!isLoad(a)) continue;
      for (let q = r + 1; q < ROWS; q++) { const b = circ.cells[q][c]; if (!b) continue; if (isLoad(b)) out.push(a.d + ' and ' + b.d + ' are in series: two loads share the voltage and neither works properly. Put loads side by side (in parallel).'); else out.push('There is a ' + (b.t === 'W' ? 'wire' : 'contact') + ' below ' + a.d + '. Draw contacts above the load: the load is the last part before N.'); break; }
    }
    return out;
  };

  // ───────────── test runner ─────────────
  // steps: press X · release X · tap X [ms] · both X Y · free X Y · on X · off X · trip X · reset X · wait ms · expect A=1 B=0 · scn key>=n · mcb · jam K (cannot close) · weld K (stays closed)
  EC.run = function (task, circ) {
    const name = (tag) => { const p = task.parts.find((x) => x.d === tag); return p ? p.n + ' (' + tag + ')' : tag; };
    return task.tests.map((test) => {
      const sim = new Sim(circ, task); let stepNo = 0, cur = '';
      const run = (ms) => { for (let t = 0; t < ms; t += DT) { sim.tick(); if (sim.short) throw new Error(sim.short); if (sim.st.fault) throw new Error(sim.st.fault); } };
      try {
        run(100);
        test.steps.forEach((step) => {
          stepNo++; cur = step; const p = step.split(/\s+/), d = sim.D[p[1]];
          if (['press', 'release', 'tap', 'on', 'off', 'trip', 'reset', 'jam', 'weld'].includes(p[0]) && !d) throw new Error('unknown device ' + p[1]);
          switch (p[0]) {
            case 'press': case 'on': case 'trip': d.v = 1; run(+(p[2] || 30)); break;   // press X 10 = the next step comes only 10 ms later
            case 'release': case 'off': case 'reset': d.v = 0; run(30); break;
            case 'tap': d.v = 1; run(+(p[2] || 200)); d.v = 0; run(100); break;
            case 'both': sim.D[p[1]].v = 1; sim.D[p[2]].v = 1; run(30); break;
            case 'free': sim.D[p[1]].v = 0; sim.D[p[2]].v = 0; run(30); break;
            case 'wait': run(+p[1]); break;
            case 'jam': d.jam = 1; run(30); break;
            case 'weld': d.weld = 1; d.v = 1; run(30); break;
            case 'mcb': sim.resetMcb(); run(30); break;
            case 'expect': p.slice(1).forEach((cnd) => { const m = /^(\w+)=([01])$/.exec(cnd), v = sim.D[m[1]] ? sim.D[m[1]].v : -1; if (v !== +m[2]) throw new Error(name(m[1]) + ' should be ' + (+m[2] ? 'ON' : 'OFF') + ', but it is ' + (v ? 'ON' : 'OFF') + '.'); }); break;
            case 'scn': p.slice(1).forEach((cnd) => { const m = /^(\w+)(>=|<=|=)(-?\d+)$/.exec(cnd), v = sim.st[m[1]], w = +m[3]; if (!(m[2] === '>=' ? v >= w : m[2] === '<=' ? v <= w : v === w)) throw new Error((task.scnNames && task.scnNames[m[1]] || m[1]) + ' is ' + v + ', expected ' + m[2] + ' ' + w + '.' + (sim.st.note ? ' ' + sim.st.note : '')); }); break;
            default: throw new Error('bad test step: ' + step);
          }
        });
        return { name: test.name, ok: true };
      } catch (e) { return { name: test.name, ok: false, msg: (stepNo ? 'Step ' + stepNo + ' (' + EC.say(cur, task) + '): ' : '') + e.message }; }
    });
  };
  EC.say = function (step, task) {
    const p = step.split(/\s+/), n = (tag) => { const x = task.parts.find((y) => y.d === tag); return x ? x.n : tag; };
    switch (p[0]) {
      case 'press': return 'hold ' + n(p[1]); case 'release': return 'release ' + n(p[1]); case 'tap': return 'press ' + n(p[1]);
      case 'both': return 'press ' + n(p[1]) + ' and ' + n(p[2]) + ' at the same moment';
      case 'free': return 'release ' + n(p[1]) + ' and ' + n(p[2]) + ' together';
      case 'on': return 'switch ' + n(p[1]) + ' on'; case 'off': return 'switch ' + n(p[1]) + ' off';
      case 'trip': return n(p[1]) + ' trips'; case 'reset': return 'reset ' + n(p[1]); case 'wait': return 'wait ' + (+p[1] / 1000) + ' s';
      case 'expect': return 'check ' + p.slice(1).map((c) => { const m = c.split('='); return n(m[0]) + ' ' + (+m[1] ? 'ON' : 'OFF'); }).join(', ');
      case 'jam': return 'fault: the coil wire of ' + n(p[1]) + ' is broken, it cannot close';
      case 'weld': return 'fault: the contacts of ' + n(p[1]) + ' weld together, it stays closed';
      case 'scn': return 'check the machine';
    }
    return step;
  };

  // ───────────── tasks: beginner → master ─────────────
  const P = (d, k, n, x) => Object.assign({ d, k, n }, x || {});
  const S0 = P('S0', 'pb', 'STOP', { c: 'red' }), S1 = P('S1', 'pb', 'START', { c: 'green' }), F2 = P('F2', 'ol', 'Overload'), K1 = P('K1', 'k', 'KM1');
  const SEAL = 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0\nCOIL:K1';
  const DOLTESTS = [
    { name: 'START: the motor runs and stays on', steps: ['tap S1', 'wait 200', 'expect K1=1', 'wait 2500', 'expect K1=1', 'scn rpm>=1300'] },
    { name: 'STOP switches it off', steps: ['tap S1', 'wait 500', 'tap S0', 'wait 100', 'expect K1=0'] },
    { name: 'STOP wins when both are pressed', steps: ['press S0', 'press S1', 'wait 200', 'expect K1=0', 'release S1', 'release S0'] },
    { name: 'An overload trip drops the contactor; no restart by itself', steps: ['tap S1', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0', 'wait 2500', 'reset F2', 'wait 300', 'expect K1=0'] },
  ];
  EC.TASKS = [
    { id: 'c-lamp', level: 1, scn: 'none', title: 'Your first circuit: a switch and a lamp',
      brief: 'Current flows from <b>L</b> (top) down to <b>N</b> (bottom). Put the switch <b>S1</b> in the first path and the lamp <b>H1</b> below it. Then press <b>Power on</b> and turn the switch.',
      parts: [P('S1', 'sel', 'Switch'), P('H1', 'lamp', 'Lamp', { c: 'green' })],
      hints: ['Pick "S1 NO" in the parts box and tap the top cell of the first path.', 'Pick "H1 lamp" and tap the cell below the switch. The wire down to N is drawn for you.'],
      solution: 'NO:S1\nLAMP:H1',
      tests: [{ name: 'Switch off: lamp off', steps: ['expect H1=0'] }, { name: 'Switch on: lamp on, and off again', steps: ['on S1', 'expect H1=1', 'off S1', 'expect H1=0'] }] },
    { id: 'c-series', level: 1, scn: 'none', title: 'Series and parallel: AND, OR',
      brief: 'Two push buttons, two lamps.<ul><li><b>H1</b> lights only when S1 <b>and</b> S2 are pressed: contacts one below the other (series).</li><li><b>H2</b> lights when S1 <b>or</b> S2 is pressed: contacts side by side (parallel), joined with a <b>link</b>.</li></ul>A button can have several contacts: use S1 and S2 twice.',
      parts: [P('S1', 'pb', 'S1'), P('S2', 'pb', 'S2'), P('H1', 'lamp', 'both', { c: 'green' }), P('H2', 'lamp', 'any', { c: 'amber' })],
      hints: ['Series: S1 NO, below it S2 NO, below it H1.', 'Parallel: S1 NO and S2 NO side by side in two paths. Then tap the small dot between the two paths, just below the contacts: that links them.', 'Put H2 under one of the two parallel contacts.'],
      solution: 'NO:S1 . NO:S1 NO:S2\n~ 2\nNO:S2 . LAMP:H2\nLAMP:H1',
      tests: [{ name: 'Nothing pressed: both lamps off', steps: ['expect H1=0 H2=0'] }, { name: 'Only S1: H2 on, H1 off', steps: ['press S1', 'expect H1=0 H2=1', 'release S1'] }, { name: 'Only S2: H2 on, H1 off', steps: ['press S2', 'expect H1=0 H2=1', 'release S2'] }, { name: 'S1 and S2: both lamps on', steps: ['press S1', 'press S2', 'expect H1=1 H2=1', 'release S1', 'release S2', 'expect H1=0 H2=0'] }] },
    { id: 'c-relay', level: 1, scn: 'none', title: 'A relay: one coil, many contacts',
      brief: 'A relay is a switch moved by a coil. Wire it so that:<ul><li>button <b>S1</b> feeds the coil of relay <b>K1</b>,</li><li>the green lamp <b>H1</b> is on while the relay is pulled in (K1 <b>NO</b> contact),</li><li>the red lamp <b>H2</b> is on while it is not (K1 <b>NC</b> contact).</li></ul>',
      parts: [P('S1', 'pb', 'S1'), P('K1', 'k', 'Relay'), P('H1', 'lamp', 'ON', { c: 'green' }), P('H2', 'lamp', 'OFF', { c: 'red' })],
      hints: ['Path 1: S1 NO, then K1 coil.', 'Path 2: K1 NO, then H1. Path 3: K1 NC, then H2.'],
      solution: 'NO:S1 NO:K1 NC:K1\nCOIL:K1 LAMP:H1 LAMP:H2',
      tests: [{ name: 'At rest: red lamp on', steps: ['expect K1=0 H1=0 H2=1'] }, { name: 'Button held: relay in, green on, red off', steps: ['press S1', 'wait 100', 'expect K1=1 H1=1 H2=0', 'release S1', 'wait 100', 'expect K1=0 H1=0 H2=1'] }] },
    { id: 'c-power', level: 2, scn: 'dol', pbuild: true, title: 'The power circuit: breaker, contactor, overload relay',
      brief: 'Every motor starter has the same three parts between the supply and the motor. This time the control circuit is already built for you. <b>Build the power circuit</b>: put the three parts in the right order.<ul><li><b>Q1 main breaker</b>: protects against a short circuit and switches everything off for repair.</li><li><b>KM1 contactor</b>: switches the motor on and off, moved by its coil in the control circuit.</li><li><b>F2 overload relay</b>: measures the motor current and trips when the motor is overloaded.</li></ul>Pick a part under the power circuit, then tap a place.',
      parts: [S0, S1, K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['What must you be able to switch off before you touch anything else? That part comes first.', 'The overload relay is mounted directly under the contactor: it is the last part before the motor.', 'Order from the top: Q1, KM1, F2.'],
      starter: SEAL, solution: '@ p1=Q1\n@ p2=K1\n@ p3=F2\n' + SEAL, tests: DOLTESTS },
    { id: 'c-seal', level: 2, scn: 'dol', title: 'Direct-on-line starter: start, stop, seal-in',
      brief: 'The most important circuit of all. <b>START</b> (S1) pulls in the contactor <b>KM1</b>; a NO contact of KM1 beside the START button keeps it in (<b>seal-in</b>). <b>STOP</b> (S0, an NC button) and the NC contact of the <b>overload relay</b> F2 are in series above: each one can drop the contactor.',
      parts: [S0, S1, K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['One path from the top: F2 NC, S0 NC, S1 NO, K1 coil.', 'Seal-in: K1 NO in the next path, beside S1. Link the two paths above and below these two contacts.', 'The overload contact must be F2 NC (95-96): it opens when the relay trips.'],
      solution: SEAL, tests: DOLTESTS },
    { id: 'c-panel', level: 2, scn: 'dol', pbuild: true, title: 'A real starter panel: power circuit, E-stop, RUN lamp, TRIP lamp',
      brief: 'The complete starter, both sheets:<ul><li><b>Power circuit</b>: main breaker, contactor and overload relay in the right order.</li><li><b>E-STOP</b> (S9), STOP (S0) and the overload contact in series.</li><li>START with seal-in.</li><li>Green <b>RUN</b> lamp (H1) in parallel with the coil.</li><li>Red <b>TRIP</b> lamp (H2) through the <b>NO</b> contact of the overload relay (97-98).</li></ul>After an E-stop or a trip the motor must not restart by itself.',
      parts: [P('S9', 'es', 'E-STOP'), S0, S1, K1, F2, P('H1', 'lamp', 'RUN', { c: 'green' }), P('H2', 'lamp', 'TRIP', { c: 'red' })], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Power circuit from the top: Q1, KM1, F2.', 'Control: start from the seal-in circuit and put S9 NC at the very top.', 'RUN lamp: put H1 beside the K1 coil and link the two paths just above them.', 'TRIP lamp: its own path from L: F2 NO, then H2.'],
      solution: '@ p1=Q1\n@ p2=K1\n@ p3=F2\nNC:S9 . NO:F2\nNC:F2 . LAMP:H2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0\nCOIL:K1 LAMP:H1',
      tests: DOLTESTS.slice(0, 2).concat([
        { name: 'RUN lamp follows the contactor', steps: ['expect H1=0', 'tap S1', 'wait 200', 'expect K1=1 H1=1', 'tap S0', 'wait 100', 'expect H1=0'] },
        { name: 'E-STOP drops everything; no start while it is pressed; no restart', steps: ['tap S1', 'wait 300', 'on S9', 'wait 100', 'expect K1=0 H1=0', 'tap S1', 'wait 100', 'expect K1=0', 'off S9', 'wait 300', 'expect K1=0'] },
        { name: 'Overload: contactor off, TRIP lamp on until reset', steps: ['expect H2=0', 'tap S1', 'wait 300', 'trip F2', 'wait 200', 'expect K1=0 H2=1', 'wait 2500', 'reset F2', 'wait 100', 'expect H2=0 K1=0'] },
      ]) },
    { id: 'c-two', level: 2, scn: 'dol', title: 'Start and stop from two places',
      brief: 'A long conveyor has a button box at each end: <b>START 1</b> (S1) and <b>STOP 1</b> (S0), <b>START 2</b> (S3) and <b>STOP 2</b> (S2). Each START starts it, each STOP stops it.<br><b>Rule:</b> stops in series, starts in parallel.',
      parts: [S0, P('S2', 'pb', 'STOP 2', { c: 'red' }), S1, P('S3', 'pb', 'START 2', { c: 'green' }), K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['F2 NC, S0 NC and S2 NC one below the other.', 'Then three contacts side by side: S1 NO, S3 NO and K1 NO, with links above and below all three.'],
      solution: 'NC:F2\nNC:S0\nNC:S2\n~ 0 1\nNO:S1 NO:S3 NO:K1\n~ 0 1\nCOIL:K1',
      tests: [{ name: 'START 1 starts, STOP 2 stops', steps: ['tap S1', 'wait 300', 'expect K1=1', 'tap S2', 'wait 100', 'expect K1=0'] }, { name: 'START 2 starts, STOP 1 stops', steps: ['tap S3', 'wait 300', 'expect K1=1', 'tap S0', 'wait 100', 'expect K1=0'] }, DOLTESTS[3]] },
    { id: 'c-jog', level: 2, scn: 'dol', title: 'Jog and run',
      brief: '<b>RUN</b> (S1) starts the motor and it stays on. <b>JOG</b> (S2) runs it only while the button is held, for setting up. STOP (S0) and the overload stop it.<br>Trick: the seal-in sits on a small helper relay <b>KA1</b>, not on the contactor. Then JOG can feed KM1 without latching anything.',
      parts: [S0, P('S1', 'pb', 'RUN', { c: 'green' }), P('S2', 'pb', 'JOG'), K1, P('K2', 'k', 'KA1'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['KA1 (K2) gets the normal seal-in circuit: S1 NO with K2 NO beside it, then the K2 coil.', 'KM1 (K1) is fed by a K2 NO contact, with S2 NO in parallel.', 'All four contacts hang on the same wire below STOP: link the paths above them.'],
      solution: 'NC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K2 NO:K2 NO:S2\n~ 0 2\nCOIL:K2 . COIL:K1',
      tests: [{ name: 'JOG: runs only while held, nothing latches', steps: ['press S2', 'wait 200', 'expect K1=1', 'release S2', 'wait 200', 'expect K1=0 K2=0'] }, { name: 'RUN: stays on, STOP stops', steps: ['tap S1', 'wait 300', 'expect K1=1', 'wait 1000', 'expect K1=1', 'tap S0', 'wait 200', 'expect K1=0 K2=0'] }, { name: 'Overload stops RUN and JOG', steps: ['tap S1', 'wait 300', 'trip F2', 'wait 200', 'expect K1=0', 'press S2', 'wait 200', 'expect K1=0', 'release S2'] }] },
    { id: 'c-fix', level: 3, scn: 'dol', title: 'Fault finding: "it only runs while I hold START"',
      brief: 'An electrician wired this starter and the operator complains: <i>the motor runs only while I hold START, and sometimes STOP does nothing.</i> Power it on, try it, find the wiring mistake and fix it.',
      parts: [S0, S1, K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Follow the green wire with START held. Which contact is the seal-in contact beside?', 'The K1 contact bridges the STOP button. It must bridge the START button.'],
      starter: 'NC:F2\n~ 0\nNC:S0 NO:K1\n~ 0\nNO:S1\nCOIL:K1',
      solution: SEAL, tests: DOLTESTS },
    { id: 'c-rev', level: 3, scn: 'rev', title: 'Forward / reverse with an electrical interlock',
      brief: 'Two contactors: <b>KM1</b> forward, <b>KM2</b> reverse (it swaps two phases). If both close, two phases are shorted. Build:<ul><li><b>FWD</b> (S1) and <b>REV</b> (S2), each with its own seal-in.</li><li>The <b>interlock</b>: an NC contact of KM2 in the KM1 coil path, and an NC contact of KM1 in the KM2 path.</li><li>In the <b>power circuit</b>: choose how the three wires go through KM2, so the motor really turns the other way.</li><li>STOP (S0) and the overload stop both. To change direction you press STOP first.</li></ul>',
      parts: [S0, P('S1', 'pb', 'FWD', { c: 'green' }), P('S2', 'pb', 'REV', { c: 'green' }), K1, P('K2', 'k', 'KM2'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      power: [{ k: 'swap', q: 'How do the wires go through KM2?', o: [['l13', 'L1 and L3 change places'], ['same', 'Same order as KM1'], ['rot', 'All three move one place']] }],
      hints: ['Power circuit: a motor turns the other way when two of its three phases change places. Moving all three one place keeps the direction.', 'Two seal-in circuits side by side, below the same F2 and S0: S1 with K1, S2 with K2.', 'Below each pair, before the coil: the NC contact of the other contactor.', 'Link the four paths above the buttons, and each pair below.'],
      solution: '@ swap=l13\nNC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'FWD runs forward and stays on', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 2500', 'scn rpm>=1300'] }, { name: 'REV runs in reverse', steps: ['tap S2', 'wait 300', 'expect K2=1 K1=0', 'wait 2500', 'scn rpm<=-1300'] }, { name: 'REV while running forward does nothing (interlock)', steps: ['tap S1', 'wait 500', 'tap S2', 'wait 200', 'expect K1=1 K2=0'] }, { name: 'STOP, then the other direction', steps: ['tap S1', 'wait 500', 'tap S0', 'wait 200', 'expect K1=0', 'tap S2', 'wait 300', 'expect K2=1 K1=0'] }, { name: 'Overload stops it', steps: ['tap S2', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-revp', level: 3, scn: 'rev', pbuild: true, title: 'Build the reversing power circuit',
      brief: 'The control circuit of this forward / reverse starter is ready. <b>Build the power circuit</b> yourself. There are four places: one at the top, two side by side, and one at the bottom, directly above the motor.<ul><li>Put <b>Q1</b>, <b>KM1</b>, <b>KM2</b> and <b>F2</b> in the right places.</li><li>Then choose how the three wires go through KM2, so the motor turns the other way.</li></ul>Think: which part must both directions share, and which parts work side by side?',
      parts: [S0, P('S1', 'pb', 'FWD', { c: 'green' }), P('S2', 'pb', 'REV', { c: 'green' }), K1, P('K2', 'k', 'KM2'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      pparts: [['Q1', 'Q1 main breaker'], ['K1', 'KM1 forward'], ['K2', 'KM2 reverse'], ['F2', 'F2 overload relay']], pslots: 4,
      power: [{ k: 'swap', q: 'How do the wires go through KM2?', o: [['same', 'Same order as KM1'], ['rot', 'All three move one place'], ['l13', 'L1 and L3 change places']] }],
      hints: ['The breaker is always first. The overload relay is always last, directly before the motor.', 'The two contactors do the same job for two directions: they sit side by side, in parallel.', 'A motor turns the other way when two of its three phases change places.'],
      starter: 'NC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2', solution: '@ p1=Q1\n@ p2=K1\n@ p3=K2\n@ p4=F2\n@ swap=l13\nNC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'FWD runs forward', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 2500', 'scn rpm>=1300'] }, { name: 'REV runs in reverse', steps: ['tap S2', 'wait 300', 'expect K2=1 K1=0', 'wait 2500', 'scn rpm<=-1300'] }, { name: 'Overload stops it', steps: ['tap S2', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-warn', level: 3, scn: 'dol', title: 'Start warning: horn first, then the conveyor',
      brief: 'People work near this conveyor. After <b>START</b> a horn (<b>H3</b>) must sound for <b>3 s</b>. Only then the contactor KM1 pulls in, and the horn stops. STOP during the warning cancels the start.<br>Parts: helper relay <b>KA1</b> (it remembers the start) and an <b>on-delay timer KT1</b>.',
      parts: [S0, S1, K1, P('K2', 'k', 'KA1'), P('KT1', 'kt', 'Timer', { s: 3 }), P('H3', 'horn', 'Horn'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Seal-in on KA1 (K2): S1 NO with K2 NO beside it.', 'Below the seal-in, four paths on one wire: K2 coil, KT1 timer coil, KT1 NC then the horn, KT1 NO then the K1 coil.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K2\n~ 0 1 2\nW W NC:KT1 NO:KT1\nCOIL:K2 TON:KT1:3 HORN:H3 COIL:K1',
      tests: [{ name: 'START: horn at once, motor still off', steps: ['tap S1', 'wait 300', 'expect H3=1 K1=0', 'wait 2200', 'expect H3=1 K1=0'] }, { name: 'After 3 s: motor on, horn off', steps: ['tap S1', 'wait 3400', 'expect K1=1 H3=0', 'wait 2000', 'expect K1=1 H3=0'] }, { name: 'STOP during the warning cancels the start', steps: ['tap S1', 'wait 1500', 'tap S0', 'wait 200', 'expect H3=0 K1=0', 'wait 3000', 'expect K1=0 H3=0'] }, { name: 'STOP and overload while running', steps: ['tap S1', 'wait 3500', 'tap S0', 'wait 200', 'expect K1=0 H3=0', 'tap S1', 'wait 3500', 'trip F2', 'wait 200', 'expect K1=0', 'wait 2500'] }] },
    { id: 'c-seq', level: 3, scn: 'two', title: 'Two conveyors in the right order',
      brief: 'Conveyor 2 drops material onto conveyor 1. So conveyor 1 must run first.<ul><li><b>START</b>: KM1 (conveyor 1) at once.</li><li><b>5 s</b> later: KM2 (conveyor 2).</li><li>STOP, or <b>either</b> overload relay (F2, F3): both stop.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2'), P('KT1', 'kt', 'Timer', { s: 5 }), F2, P('F3', 'ol', 'Overload 2')],
      hints: ['F2 NC, F3 NC and S0 NC in series, then the seal-in on K1.', 'Three paths below: K1 coil, the timer coil KT1, and KT1 NO then the K2 coil.'],
      solution: 'NC:F2\nNC:F3\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1\nW W NO:KT1\nCOIL:K1 TON:KT1:5 COIL:K2',
      tests: [{ name: 'START: conveyor 1 at once, conveyor 2 waits', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 4200', 'expect K1=1 K2=0'] }, { name: 'Conveyor 2 after 5 s', steps: ['tap S1', 'wait 5400', 'expect K1=1 K2=1'] }, { name: 'STOP stops both', steps: ['tap S1', 'wait 5500', 'tap S0', 'wait 200', 'expect K1=0 K2=0'] }, { name: 'Overload of conveyor 1 stops both', steps: ['tap S1', 'wait 5500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }, { name: 'Overload of conveyor 2 stops both', steps: ['tap S1', 'wait 5500', 'trip F3', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-sd', level: 4, scn: 'sd', title: 'Star-delta starter with a timer',
      brief: 'The classic interview circuit. Three contactors: <b>KM1</b> line, <b>KM2</b> star, <b>KM3</b> delta, and the on-delay timer <b>KT1</b> (4 s).<ul><li>START: KM1 and KM2 (star) pull in, the timer runs.</li><li>After 4 s: KM2 drops, KM3 (delta) pulls in.</li><li>KM2 and KM3 must <b>never</b> be closed together: each one has an NC contact of the other in its coil path.</li><li>STOP and the overload drop everything.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 Y'), P('K3', 'k', 'KM3 Δ'), P('KT1', 'kt', 'Timer', { s: 4 }), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['F2 NC, S0 NC, then the seal-in on K1 (S1 NO with K1 NO beside it).', 'Below, four paths on one wire: K1 coil · KT1 NC, K3 NC, K2 coil (star) · KT1 NO, K2 NC, K3 coil (delta) · the timer coil.', 'Without the two NC interlock contacts both contactors are closed for a moment: a short circuit.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1 2\nW NC:KT1 NO:KT1 W\nW NC:K3 NC:K2 W\nCOIL:K1 COIL:K2 COIL:K3 TON:KT1:4',
      tests: [{ name: 'START: line and star', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=1 K3=0', 'wait 3200', 'expect K1=1 K2=1 K3=0'] }, { name: 'After 4 s: star off, delta on, full speed', steps: ['tap S1', 'wait 4500', 'expect K1=1 K2=0 K3=1', 'wait 2000', 'scn pct>=95'] }, { name: 'STOP drops all three; the next start is in star again', steps: ['tap S1', 'wait 5000', 'tap S0', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 3000', 'tap S1', 'wait 300', 'expect K1=1 K2=1 K3=0'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 5000', 'trip F2', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 2500'] }] },
    { id: 'c-sdp', level: 4, scn: 'sd', title: 'Star-delta: finish the power circuit',
      brief: 'The control circuit of this star-delta starter is already built. <b>Finish the power circuit</b>:<ul><li>The motor has six terminals. The line contactor KM1 feeds the winding <b>starts</b> U1 V1 W1. The star contactor KM2 bridges the winding <b>ends</b> U2 V2 W2. Where must the <b>delta contactor KM3</b> connect these ends?</li><li>The overload relay F2 sits below KM1, in the wires to U1 V1 W1. To which current do you set it?</li></ul>In delta, each winding must sit between two <b>different</b> phases.',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 Y'), P('K3', 'k', 'KM3 Δ'), P('KT1', 'kt', 'Timer', { s: 4 }), F2], scnNames: { pct: 'Motor speed (%)', prot: 'Overload relay setting right (1 = yes)' },
      power: [{ k: 'd', q: 'KM3 (delta) connects the winding ends U2 V2 W2 to…', o: [['next', 'the next phase: U2 to L2, V2 to L3, W2 to L1'], ['same', 'the same phase: U2 to L1, V2 to L2, W2 to L3'], ['n', 'the neutral wire N, all three']] }, { k: 'ol', q: 'The overload relay F2 is set to…', o: [['100', 'the nameplate current'], ['58', '0.58 × the nameplate current'], ['173', '1.73 × the nameplate current']] }],
      hints: ['A winding only gets voltage when its two ends are on different phases. U1 is on L1, so U2 must not go to L1.', 'In delta the line current splits over two windings. Through one winding, and through the relay in its wire, flows the line current divided by 1.73, which is 0.58 × the nameplate current.'],
      starter: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1 2\nW NC:KT1 NO:KT1 W\nW NC:K3 NC:K2 W\nCOIL:K1 COIL:K2 COIL:K3 TON:KT1:4',
      solution: '@ d=next\n@ ol=58\nNC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1 2\nW NC:KT1 NO:KT1 W\nW NC:K3 NC:K2 W\nCOIL:K1 COIL:K2 COIL:K3 TON:KT1:4',
      tests: [{ name: 'START in star, then delta at full speed', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=1 K3=0', 'wait 4200', 'expect K1=1 K2=0 K3=1', 'wait 4000', 'scn pct>=95'] }, { name: 'The overload relay is set for the current in the winding', steps: ['scn prot=1'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 5000', 'trip F2', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 2500'] }] },
    { id: 'c-tank', level: 4, scn: 'tank', title: 'Real project: fill a tank with two float switches',
      brief: 'Water is drawn from this tank all the time. A pump (KM1) fills it.<ul><li>Selector <b>AUTO</b> (S1) on: the pump starts when the level falls below the <b>low float</b> B1 (30 %) and runs until the <b>high float</b> B2 (80 %).</li><li>Between 30 % and 80 % it keeps doing what it was doing: you need a <b>seal-in</b>, or the pump clicks on and off every second.</li><li>AUTO off or an overload: pump off.</li></ul>A float switch contact is <b>actuated</b> (NO closed, NC open) while the water is above it.',
      parts: [P('S1', 'sel', 'AUTO'), P('B1', 'ls', 'Low 30%'), P('B2', 'ls', 'High 80%'), K1, F2], scnNames: { lv: 'Tank level (%)', starts: 'Pump starts' },
      hints: ['In series: F2 NC, S1 NO, B2 NC (stop at the top).', 'Start condition: B1 NC (closed when the water is below 30 %), with K1 NO beside it as seal-in.'],
      solution: 'NC:F2\nNO:S1\nNC:B2\n~ 0\nNC:B1 NO:K1\n~ 0\nCOIL:K1',
      tests: [{ name: 'AUTO off: the pump stays off', steps: ['wait 3000', 'expect K1=0'] }, { name: '40 s in AUTO: level stays between 25 % and 90 %', steps: ['on S1', 'wait 20000', 'scn lv>=25 lv<=90', 'wait 20000', 'scn lv>=25 lv<=90'] }, { name: 'The pump does not chatter: a few long runs', steps: ['on S1', 'wait 40000', 'scn starts>=2 starts<=4'] }, { name: 'AUTO off stops the pump', steps: ['on S1', 'wait 7000', 'expect K1=1', 'off S1', 'wait 200', 'expect K1=0'] }, { name: 'Overload stops the pump', steps: ['on S1', 'wait 7000', 'trip F2', 'wait 200', 'expect K1=0', 'wait 2000'] }] },
    { id: 'c-hoist', level: 4, scn: 'hoist', title: 'Real project: a hoist with limit switches',
      brief: 'A hoist is <b>hold-to-run</b>: it moves only while a button is held, so there is <b>no seal-in</b>.<ul><li><b>UP</b> (S1) held: KM1. <b>DOWN</b> (S2) held: KM2.</li><li>The <b>top limit switch</b> B1 stops UP, the <b>bottom limit switch</b> B2 stops DOWN (NC contacts: they open when the hook reaches them).</li><li>Interlock between KM1 and KM2, and the overload contact.</li></ul>',
      parts: [P('S1', 'pb', 'UP'), P('S2', 'pb', 'DOWN'), K1, P('K2', 'k', 'KM2'), P('B1', 'ls', 'Top'), P('B2', 'ls', 'Bottom'), F2], scnNames: { p: 'Hook position (%)' },
      hints: ['F2 NC at the top, then two paths linked below it.', 'Path UP: S1 NO, B1 NC, K2 NC, K1 coil. Path DOWN: S2 NO, B2 NC, K1 NC, K2 coil.'],
      solution: 'NC:F2\n~ 0\nNO:S1 NO:S2\nNC:B1 NC:B2\nNC:K2 NC:K1\nCOIL:K1 COIL:K2',
      tests: [{ name: 'UP only while held (no seal-in)', steps: ['press S1', 'wait 500', 'expect K1=1 K2=0', 'release S1', 'wait 200', 'expect K1=0'] }, { name: 'DOWN only while held', steps: ['press S2', 'wait 500', 'expect K2=1 K1=0', 'release S2', 'wait 200', 'expect K2=0'] }, { name: 'The top limit switch stops UP', steps: ['press S1', 'wait 4000', 'expect K1=0', 'scn p<=99', 'release S1'] }, { name: 'The bottom limit switch stops DOWN; UP still works', steps: ['press S2', 'wait 4000', 'expect K2=0', 'scn p>=1', 'release S2', 'press S1', 'wait 500', 'expect K1=1', 'release S1'] }, { name: 'DOWN pressed while going UP: no short circuit', steps: ['press S1', 'wait 300', 'press S2', 'wait 300', 'expect K1=1 K2=0', 'release S1', 'release S2'] }] },
    { id: 'c-vfd', level: 3, scn: 'vfd', title: 'A drive needs only signals: run forward, run reverse',
      brief: 'A variable frequency drive (VFD) has <b>no contactors</b> for start and reverse. It ramps the motor by itself. The control circuit only gives signals to its inputs:<ul><li>Selector <b>RUN</b> (S1) on: input <b>DI1</b> (run forward).</li><li>Selector <b>REVERSE</b> (S2) on as well: DI1 off, input <b>DI2</b> (run reverse). Never both inputs together.</li><li>The drive has a <b>fault relay</b> (F5). When it trips: no run signal, and the red <b>FAULT</b> lamp (H2) is on.</li></ul>',
      parts: [P('S1', 'sel', 'RUN'), P('S2', 'sel', 'REVERSE'), P('A1', 'valve', 'DI1 fwd'), P('A2', 'valve', 'DI2 rev'), P('F5', 'ol', 'Drive fault'), P('H2', 'lamp', 'FAULT', { c: 'red' })], scnNames: { hz: 'Drive output (Hz)' },
      hints: ['One path from the top: F5 NC, then S1 NO.', 'Below it two paths, linked: S2 NC then A1, and S2 NO then A2. The same selector opens one path and closes the other.', 'Fault lamp: its own path from L: F5 NO, then H2.'],
      solution: 'NC:F5 . NO:F5\nNO:S1 . LAMP:H2\n~ 0\nNC:S2 NO:S2\nVALVE:A1 VALVE:A2',
      tests: [{ name: 'RUN: forward, the drive ramps to 50 Hz', steps: ['expect A1=0 A2=0', 'on S1', 'expect A1=1 A2=0', 'wait 2500', 'scn hz>=48'] }, { name: 'REVERSE: only DI2, the drive ramps down and back up the other way', steps: ['on S1', 'wait 2500', 'on S2', 'expect A1=0 A2=1', 'wait 4500', 'scn hz<=-48'] }, { name: 'RUN off: no signal, the drive ramps to zero', steps: ['on S1', 'wait 2500', 'off S1', 'expect A1=0 A2=0', 'wait 2500', 'scn hz<=1 hz>=-1'] }, { name: 'Drive fault: no run signal, FAULT lamp on', steps: ['expect H2=0', 'on S1', 'wait 1000', 'trip F5', 'expect A1=0 A2=0 H2=1', 'reset F5', 'expect H2=0 A1=1'] }] },
    { id: 'c-soft', level: 4, scn: 'soft', title: 'Soft starter with a bypass contactor',
      brief: 'A pump starts on a <b>soft starter</b>: electronics raise the voltage over 3 s. At full speed a bypass contactor takes over, so the soft starter stays cool.<ul><li>START: line contactor <b>KM1</b> and the <b>RUN</b> signal to the soft starter (A1), with seal-in.</li><li>The soft starter closes its <b>top of ramp</b> contact (B1) when the motor is at full speed. Only then: bypass <b>KM2</b>.</li><li>STOP and the overload drop everything.</li></ul>KM2 too early is a direct start. No KM2 at all overheats the soft starter.',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 bypass'), P('A1', 'valve', 'RUN'), P('B1', 'ls', 'Top of ramp'), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['Seal-in on K1.', 'Three paths below it: K1 coil, the RUN signal A1, and B1 NO then the K2 coil.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1\nW W NO:B1\nCOIL:K1 VALVE:A1 COIL:K2',
      tests: [{ name: 'START: line contactor and RUN, no bypass yet', steps: ['tap S1', 'wait 300', 'expect K1=1 A1=1 K2=0', 'wait 2000', 'expect K2=0'] }, { name: 'Top of ramp: the bypass closes; nothing overheats', steps: ['tap S1', 'wait 3600', 'expect K1=1 K2=1', 'wait 8000', 'expect K2=1', 'scn pct>=99'] }, { name: 'STOP drops everything; the next start ramps again', steps: ['tap S1', 'wait 4000', 'tap S0', 'wait 200', 'expect K1=0 K2=0 A1=0', 'wait 4000', 'tap S1', 'wait 300', 'expect K1=1 A1=1 K2=0'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 4000', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-pumps', level: 4, scn: 'pumps', title: 'Real project: duty pump and standby pump',
      brief: 'Two pumps on one pipe. One is the <b>duty</b> pump, the other one waits as <b>standby</b>.<ul><li>Selector <b>RUN</b> (S1) on: the duty pump runs. Selector <b>DUTY 2</b> (S4) off = pump 1 is duty, on = pump 2 is duty.</li><li>If the overload relay of the duty pump trips, the <b>standby pump starts by itself</b>.</li><li>The red <b>ALARM</b> lamp (H2) is on while any overload relay is tripped.</li><li>Never both pumps together.</li></ul>Tip: the NO contact of an overload relay (97-98) closes when it trips. Use it as a signal.',
      parts: [P('S1', 'sel', 'RUN'), P('S4', 'sel', 'DUTY 2'), K1, P('K2', 'k', 'KM2'), F2, P('F3', 'ol', 'Overload 2'), P('H2', 'lamp', 'ALARM', { c: 'red' })],
      hints: ['Pump 1 path: S1 NO, F2 NC, then S4 NC with F3 NO beside it (linked), then the K1 coil.', 'Pump 2 path: S1 NO, F3 NC, then S4 NO with F2 NO beside it, then the K2 coil.', 'Alarm: F2 NO and F3 NO side by side from L, linked below, then H2.'],
      solution: 'NO:S1 . . . NO:F2 NO:F3\n~ 0 1 2 4\nNC:F2 . NC:F3 . LAMP:H2\n~ 0 2\nNC:S4 NO:F3 NO:S4 NO:F2\n~ 0 2\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'RUN off: both pumps off', steps: ['wait 300', 'expect K1=0 K2=0 H2=0'] }, { name: 'Pump 1 is duty', steps: ['on S1', 'wait 300', 'expect K1=1 K2=0 H2=0', 'wait 2000', 'expect K1=1 K2=0'] }, { name: 'Pump 2 is duty', steps: ['on S4', 'on S1', 'wait 300', 'expect K1=0 K2=1', 'wait 2000', 'expect K1=0 K2=1'] }, { name: 'Pump 1 trips: pump 2 takes over, alarm on; reset: back to pump 1', steps: ['on S1', 'wait 500', 'trip F2', 'wait 300', 'expect K1=0 K2=1 H2=1', 'wait 2500', 'reset F2', 'wait 300', 'expect K1=1 K2=0 H2=0', 'wait 1500'] }, { name: 'Pump 2 is duty and trips: pump 1 takes over', steps: ['on S4', 'on S1', 'wait 500', 'trip F3', 'wait 300', 'expect K2=0 K1=1 H2=1', 'wait 2500'] }, { name: 'Both tripped: both off, alarm on', steps: ['on S1', 'wait 500', 'trip F2', 'trip F3', 'wait 300', 'expect K1=0 K2=0 H2=1', 'wait 2500'] }] },
    { id: 'c-comp', level: 4, scn: 'comp', title: 'Real project: air compressor with a pressure switch',
      brief: 'A workshop compressor keeps the air tank between 6 and 8 bar.<ul><li>Selector <b>AUTO</b> (S1) on, and the <b>pressure switch</b> B1 says "pressure low": the motor (KM1) runs. B1 is actuated from 8 bar and released again at 6 bar. The gap is inside the switch, so you need no seal-in.</li><li>A compressor must start <b>unloaded</b>. Only <b>3 s</b> after the start the load valve <b>Y1</b> gets voltage and the compressor pumps.</li><li>AUTO off or an overload: motor and valve off.</li></ul>',
      parts: [P('S1', 'sel', 'AUTO'), P('B1', 'ls', 'Pressure 8 bar'), K1, P('KT1', 'kt', 'Timer', { s: 3 }), P('Y1', 'valve', 'Load valve'), F2], scnNames: { p10: 'Pressure (bar × 10)', starts: 'Motor starts' },
      hints: ['In series: F2 NC, S1 NO, B1 NC (closed while the pressure is low).', 'Below, three paths on one wire: K1 coil, the timer coil KT1, and KT1 NO then the valve Y1.'],
      solution: 'NC:F2\nNO:S1\nNC:B1\n~ 0 1\nW W NO:KT1\nCOIL:K1 TON:KT1:3 VALVE:Y1',
      tests: [{ name: 'AUTO on: the motor starts unloaded', steps: ['expect K1=0', 'on S1', 'wait 300', 'expect K1=1 Y1=0', 'wait 2200', 'expect K1=1 Y1=0'] }, { name: 'After 3 s the load valve opens', steps: ['on S1', 'wait 3500', 'expect K1=1 Y1=1'] }, { name: 'One minute in AUTO: pressure stays between 4 and 9 bar, a few long runs', steps: ['on S1', 'wait 30000', 'scn p10>=40 p10<=90', 'wait 30000', 'scn p10>=40 p10<=90 starts>=2 starts<=6'] }, { name: 'AUTO off stops motor and valve', steps: ['on S1', 'wait 5000', 'off S1', 'wait 200', 'expect K1=0 Y1=0'] }, { name: 'Overload stops motor and valve', steps: ['on S1', 'wait 5000', 'trip F2', 'wait 200', 'expect K1=0 Y1=0', 'wait 2500'] }] },
    { id: 'c-1ph', level: 3, scn: 'cap1', title: 'Single-phase motor with a start capacitor',
      brief: 'Pumps, compressors and small machines in houses and shops run on <b>230 V single-phase</b>. A single-phase motor has two windings: the <b>main winding</b> and a <b>start winding</b>. The main winding alone only makes the rotor hum. For the start, the start winding gets a shifted current through a <b>start capacitor</b>; a <b>centrifugal switch</b> on the shaft cuts it off at about 75 % speed.<ul><li>Finish the <b>power circuit</b>: where does the capacitor go, and what does the switch cut off?</li><li>Build the control: START, STOP, seal-in, overload contact.</li></ul>',
      parts: [S0, S1, K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      power: [{ k: 'cap', q: 'Where does the start capacitor go?', o: [['main', 'In series with the main winding'], ['aux', 'In series with the start winding'], ['ln', 'Between L and N']] }, { k: 'sw', q: 'What does the centrifugal switch cut off at speed?', o: [['aux', 'The start winding and its capacitor'], ['main', 'The main winding'], ['none', 'Nothing: leave the switch out']] }],
      hints: ['The capacitor shifts the current in the winding it is in series with. The main winding must keep its full current, so the capacitor goes to the other one.', 'A start capacitor and a start winding are built for a few seconds. Something must take them out when the motor is up to speed.', 'The control circuit is the normal seal-in circuit: F2 NC, S0 NC, S1 NO with K1 NO beside it, K1 coil.'],
      solution: '@ cap=aux\n@ sw=aux\n' + SEAL,
      tests: [{ name: 'START: the motor runs up and keeps running', steps: ['tap S1', 'wait 200', 'expect K1=1', 'wait 3500', 'scn rpm>=1300', 'wait 5000', 'scn rpm>=1300', 'expect K1=1'] }, DOLTESTS[1], DOLTESTS[3]] },
    { id: 'c-2spd', level: 4, scn: 'spd2', title: 'Two-speed motor: LOW and HIGH with two windings',
      brief: 'A fan with a <b>two-speed motor</b>: it has two separate windings in one housing. <b>KM1</b> feeds the low-speed winding, <b>KM2</b> the high-speed winding. Each winding has its own overload relay (F2 low, F3 high), because the currents are different.<ul><li><b>LOW</b> (S1) and <b>HIGH</b> (S2), each with its own seal-in.</li><li>Both windings fed together destroy the motor: <b>interlock</b> KM1 and KM2.</li><li>To change the speed you press STOP first.</li><li>STOP (S0) and <b>both</b> overload contacts stop the motor.</li></ul>',
      parts: [S0, P('S1', 'pb', 'LOW', { c: 'green' }), P('S2', 'pb', 'HIGH', { c: 'green' }), P('K1', 'k', 'KM1 low'), P('K2', 'k', 'KM2 high'), P('F2', 'ol', 'Overload low'), P('F3', 'ol', 'Overload high')], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['It is the forward / reverse circuit with other names: two seal-in circuits side by side, and the NC contact of the other contactor before each coil.', 'Three contacts in series at the top: F2 NC, F3 NC, S0 NC. Then link all four paths below S0.'],
      solution: 'NC:F2\nNC:F3\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'LOW: low speed, and it stays on', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 3000', 'scn rpm>=1300 rpm<=1600'] }, { name: 'HIGH: high speed', steps: ['tap S2', 'wait 300', 'expect K2=1 K1=0', 'wait 3500', 'scn rpm>=2700'] }, { name: 'HIGH while running LOW does nothing (interlock)', steps: ['tap S1', 'wait 500', 'tap S2', 'wait 200', 'expect K1=1 K2=0'] }, { name: 'LOW while running HIGH does nothing (interlock)', steps: ['tap S2', 'wait 500', 'tap S1', 'wait 200', 'expect K2=1 K1=0'] }, { name: 'STOP, then the other speed', steps: ['tap S1', 'wait 500', 'tap S0', 'wait 200', 'expect K1=0', 'tap S2', 'wait 300', 'expect K2=1 K1=0'] }, { name: 'The overload of each winding stops the motor', steps: ['tap S1', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0', 'wait 2500', 'reset F2', 'tap S2', 'wait 500', 'trip F3', 'wait 200', 'expect K2=0', 'wait 2500'] }] },
    { id: 'c-brake', level: 4, scn: 'brake', title: 'Real project: stop a saw fast with DC braking',
      brief: 'A circular saw runs on for a long time after STOP. That is dangerous. <b>DC injection braking</b> stops it in about two seconds: after STOP, the contactor <b>KM2</b> puts DC from a small rectifier on two motor wires for 3 s.<ul><li>START with seal-in on <b>KM1</b>, as always.</li><li>STOP (S0) has two contacts: its <b>NC</b> contact drops KM1, its <b>NO</b> contact starts <b>KM2</b>, which holds itself.</li><li>The timer <b>KT1</b> (3 s) runs with KM2 and drops it again: DC on a stopped motor overheats the winding.</li><li>KM1 and KM2 must <b>never</b> be closed together: interlock both ways.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 brake'), P('KT1', 'kt', 'Timer', { s: 3 }), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['Left: the normal starter, with one more contact before the K1 coil: K2 NC.', 'Right, a second circuit from L: S0 NO with K2 NO beside it (seal-in), then K1 NC.', 'Below K1 NC, two paths on one wire: KT1 NC then the K2 coil, and the timer coil.', 'The timer coil must not be behind its own NC contact, or it resets itself and the brake never switches off.'],
      solution: 'NC:F2 . NO:S0 NO:K2\n~ 2\nNC:S0 . NC:K1\n~ 0 2\nNO:S1 NO:K1 NC:KT1 TON:KT1:3\n~ 0\nNC:K2 . COIL:K2\nCOIL:K1',
      tests: [{ name: 'START: the saw runs, the brake is off', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 2500', 'scn pct>=95'] }, { name: 'STOP: KM2 brakes, the saw stands still in 2 s', steps: ['tap S1', 'wait 2500', 'tap S0', 'wait 100', 'expect K1=0 K2=1', 'wait 2000', 'scn pct<=5'] }, { name: 'The brake switches off by itself after 3 s', steps: ['tap S1', 'wait 2500', 'tap S0', 'wait 3500', 'expect K2=0 K1=0', 'wait 6000', 'expect K2=0'] }, { name: 'START during braking does nothing', steps: ['tap S1', 'wait 2500', 'tap S0', 'wait 300', 'tap S1', 'wait 200', 'expect K1=0 K2=1'] }, { name: 'Overload drops the motor', steps: ['tap S1', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0', 'wait 2500'] }] },
    { id: 'c-stein', level: 4, scn: 'stein', title: 'Real project: a 3-phase motor on a single-phase supply (capacitor)',
      brief: 'A workshop has only <b>230 V single-phase</b> (L and N), but the machine has a small <b>3-phase motor</b> (230 / 400 V). The classic trick is the <b>Steinmetz connection</b>: two motor terminals go to L and N, and a <b>run capacitor</b> feeds the third terminal with a shifted current, so the field turns.<ul><li>Finish the <b>power circuit</b>: how are the windings linked, and where does the capacitor go? The motor must turn <b>forward</b>.</li><li>Build the control: START, STOP, seal-in, overload contact.</li></ul>Rule of thumb: about 70 µF for each kW, and the motor gives about 70 % of its power.',
      parts: [S0, S1, K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      power: [{ k: 'conn', q: 'How are the motor windings linked?', o: [['delta', 'Delta (Δ): each winding gets 230 V'], ['star', 'Star (Y): each winding gets 133 V']] }, { k: 'cap', q: 'Where does the capacitor go?', o: [['wl', 'From W1 to L'], ['wn', 'From W1 to N'], ['ln', 'From L to N']] }],
      hints: ['The nameplate says 230 / 400 V. On a 230 V supply the windings must be in delta, or each one gets too little voltage.', 'A capacitor across L and N shifts nothing in the motor. It must feed the third terminal W1. From L or from N decides the direction.', 'The control circuit is the normal seal-in circuit: F2 NC, S0 NC, S1 NO with K1 NO beside it, K1 coil.'],
      solution: '@ cap=wl\n@ conn=delta\n' + SEAL,
      tests: [{ name: 'START: the motor runs forward at speed', steps: ['tap S1', 'wait 200', 'expect K1=1', 'wait 3500', 'scn rpm>=1300'] }, DOLTESTS[1], DOLTESTS[3]] },
    { id: 'c-dahl', level: 5, scn: 'dahl', title: 'Master: Dahlander motor, two speeds from one winding',
      brief: 'A <b>Dahlander</b> motor gets two speeds (1 : 2) from <b>one</b> winding with a tap in the middle, and needs three contactors:<ul><li><b>LOW</b> (S1): <b>KM1</b> feeds U1 V1 W1.</li><li><b>HIGH</b> (S2): <b>KM3</b> bridges U1 V1 W1 to a star point, and <b>KM2</b> feeds U2 V2 W2. KM2 may only close <b>when KM3 is closed</b>.</li><li>KM1 together with KM2 or KM3 is a short circuit: interlock both ways. The tests also break a coil wire and weld a contactor, to see that your circuit stays safe.</li><li>To change the speed you press STOP first. STOP and both overload contacts (F2 low, F3 high) stop the motor.</li></ul>',
      parts: [S0, P('S1', 'pb', 'LOW', { c: 'green' }), P('S2', 'pb', 'HIGH', { c: 'green' }), P('K1', 'k', 'KM1 low'), P('K2', 'k', 'KM2 high'), P('K3', 'k', 'KM3 star'), P('F2', 'ol', 'Overload low'), P('F3', 'ol', 'Overload high')], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Top: F2 NC, F3 NC, S0 NC. Then two seal-in pairs: S1 with K1, and S2 with K2. Seal the high speed with KM2, the last contactor of the chain: it is only closed when everything before it worked.', 'Low path below its pair: K2 NC, K3 NC, K1 coil.', 'High path below its pair: K1 NC, then two paths on one wire: the K3 coil, and K3 NO followed by the K2 coil.', 'K3 NO before the K2 coil makes sure the star point is closed first.', 'Think of faults: if KM3 welds closed, the motor must not restart after STOP and LOW must stay blocked. A seal-in on K3 would restart it.'],
      solution: 'NC:F2\nNC:F3\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:K2 . NC:K1\n~ 2\nNC:K3 . W NO:K3\nCOIL:K1 . COIL:K3 COIL:K2',
      tests: [{ name: 'LOW: only KM1, low speed', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0 K3=0', 'wait 3000', 'scn rpm>=1300 rpm<=1600'] }, { name: 'HIGH: star point KM3 and KM2, high speed', steps: ['tap S2', 'wait 300', 'expect K3=1 K2=1 K1=0', 'wait 3500', 'scn rpm>=2700'] }, { name: 'HIGH while running LOW does nothing', steps: ['tap S1', 'wait 500', 'tap S2', 'wait 200', 'expect K1=1 K2=0 K3=0'] }, { name: 'LOW while running HIGH does nothing', steps: ['tap S2', 'wait 500', 'tap S1', 'wait 200', 'expect K1=0 K2=1 K3=1'] }, { name: 'STOP drops all; then the other speed', steps: ['tap S2', 'wait 500', 'tap S0', 'wait 200', 'expect K1=0 K2=0 K3=0', 'tap S1', 'wait 300', 'expect K1=1 K2=0 K3=0'] }, { name: 'The overload of each speed stops the motor', steps: ['tap S1', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0', 'wait 2500', 'reset F2', 'tap S2', 'wait 500', 'trip F3', 'wait 200', 'expect K2=0 K3=0', 'wait 2500'] }, { name: 'Fault: KM3 cannot close, so KM2 must stay open', steps: ['jam K3', 'tap S2', 'wait 400', 'expect K2=0 K3=0'] }, { name: 'Fault: KM3 welds closed. No restart after STOP, and LOW stays blocked', steps: ['tap S2', 'wait 500', 'weld K3', 'tap S0', 'wait 300', 'expect K2=0', 'tap S1', 'wait 300', 'expect K1=0'] }] },
    { id: 'c-plug', level: 5, scn: 'plug', title: 'Master: plugging, braking with a zero-speed switch',
      brief: '<b>Plugging</b> brakes a motor with its own reverse contactor: after STOP, <b>KM2</b> closes and the field pulls backwards. The moment the shaft stands still, KM2 must drop, or the motor runs backwards. A <b>zero-speed switch B1</b> on the shaft does this: its NO contact is closed while the motor turns forward.<ul><li>START with seal-in on KM1.</li><li>When KM1 has dropped and the shaft still turns (B1 closed): KM2 on. At standstill B1 opens: KM2 off.</li><li>KM1 and KM2 interlocked both ways.</li><li>An overload trip stops everything and must <b>not</b> plug: braking draws even more current.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 brake'), P('B1', 'ls', 'Speed switch'), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['F2 NC at the very top, for both circuits: link the paths just below it.', 'Left: S0 NC, the seal-in (S1 NO with K1 NO), K2 NC, K1 coil.', 'Right, from below F2: K1 NC, B1 NO, K2 coil. No button is needed: the speed switch does the work.'],
      solution: 'NC:F2\n~ 0 1\nNC:S0 . NC:K1\n~ 0\nNO:S1 NO:K1 NO:B1\n~ 0\nNC:K2 . COIL:K2\nCOIL:K1',
      tests: [{ name: 'START: the motor runs, KM2 is off', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 2500', 'scn pct>=95'] }, { name: 'STOP: KM2 brakes and drops at standstill', steps: ['tap S1', 'wait 2500', 'tap S0', 'expect K1=0 K2=1', 'wait 1500', 'expect K2=0', 'scn pct<=10 pct>=-10', 'wait 3000', 'expect K2=0'] }, { name: 'At standstill nothing closes', steps: ['wait 500', 'expect K1=0 K2=0'] }, { name: 'START during braking does nothing', steps: ['tap S1', 'wait 2500', 'tap S0 100', 'tap S1 100', 'wait 1500', 'expect K1=0'] }, { name: 'Overload: everything off, no plugging', steps: ['tap S1', 'wait 2500', 'trip F2', 'wait 300', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-1phrev', level: 5, scn: 'cap1r', title: 'Master: reverse a single-phase motor',
      brief: 'A single-phase motor for a door or a small hoist must turn both ways. Its direction is set at the start, by the way the <b>start winding</b> is connected against the main winding.<ul><li>Power circuit: what must <b>KM2</b> swap, so the motor starts the other way?</li><li>Control: FWD (S1) and REV (S2) with seal-in and interlock, STOP, overload.</li><li>A single-phase motor that still turns <b>keeps its direction</b>, whatever you switch. So after a stop, a new start must be <b>blocked for 3 s</b>: use the timer <b>KT1 as an off-delay</b> (TOF). It is on while a contactor is on and stays on 3 s longer; its NC contact sits in series with each start button.</li></ul>',
      parts: [S0, P('S1', 'pb', 'FWD', { c: 'green' }), P('S2', 'pb', 'REV', { c: 'green' }), P('K1', 'k', 'KM1 fwd'), P('K2', 'k', 'KM2 rev'), P('KT1', 'kt', 'Timer', { s: 3 }), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      power: [{ k: 'swap', q: 'What does KM2 swap?', o: [['ln', 'L and N of the whole motor'], ['aux', 'The two ends of the start winding'], ['both', 'The ends of both windings']] }],
      hints: ['Swapping L and N, or both windings, changes nothing: both fields flip together. Only one winding may be turned around.', 'Start from the forward / reverse circuit: two seal-in pairs, an NC interlock before each coil.', 'Put KT1 NC directly below each start button, with a plain wire below each seal-in contact. Link the pairs below these, not above.', 'The timer needs its own circuit from L: K1 NO and K2 NO side by side, linked below, then the off-delay coil of KT1.'],
      solution: '@ swap=aux\nNC:F2 . . . NO:K1 NO:K2\n~ 4\nNC:S0 . . . TOF:KT1:3\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\nNC:KT1 W NC:KT1 W\n~ 0 2\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'FWD runs forward and stays on', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 2500', 'scn rpm>=1300'] }, { name: 'REV runs in reverse', steps: ['tap S2', 'wait 300', 'expect K2=1 K1=0', 'wait 2500', 'scn rpm<=-1300'] }, { name: 'REV while running forward does nothing', steps: ['tap S1', 'wait 500', 'tap S2', 'wait 200', 'expect K1=1 K2=0'] }, { name: 'REV pressed a moment after FWD: only one contactor closes (interlock)', steps: ['press S1 10', 'press S2 10', 'wait 200', 'expect K1=1 K2=0', 'free S1 S2'] }, { name: 'After STOP a start is blocked for 3 s, then REV really reverses', steps: ['tap S1', 'wait 1500', 'tap S0', 'wait 300', 'tap S2', 'wait 200', 'expect K1=0 K2=0', 'wait 3200', 'tap S2', 'wait 300', 'expect K2=1', 'wait 2500', 'scn rpm<=-1300'] }, { name: 'Overload stops it', steps: ['tap S2', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-stein2', level: 5, scn: 'steinh', title: 'Master: start capacitor for a heavy start',
      brief: 'The same 3-phase motor on single-phase, now on a loaded compressor. The run capacitor alone cannot start it: the motor only hums. A second, bigger <b>start capacitor</b> is switched in parallel by <b>KM2</b> for the first seconds.<ul><li>START: KM1 (motor with the run capacitor) <b>and</b> KM2 (start capacitor).</li><li>After <b>2 s</b> the timer drops KM2. KM1 stays.</li><li>A start capacitor left in at full speed bursts. STOP and the overload drop everything.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 start'), P('KT1', 'kt', 'Timer', { s: 2 }), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Seal-in on K1, as always.', 'Three paths below it: K1 coil, the timer coil KT1, and KT1 NC then the K2 coil.', 'KT1 NC is closed while the time runs, so K2 is in from the start and drops after 2 s.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1\nW W NC:KT1\nCOIL:K1 TON:KT1:2 COIL:K2',
      tests: [{ name: 'START: motor and start capacitor together', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=1'] }, { name: 'After 2 s the start capacitor is out, the motor runs on', steps: ['tap S1', 'wait 2500', 'expect K1=1 K2=0', 'wait 6000', 'expect K1=1 K2=0', 'scn rpm>=1300'] }, { name: 'STOP drops both; the next start uses the start capacitor again', steps: ['tap S1', 'wait 3000', 'tap S0', 'wait 200', 'expect K1=0 K2=0', 'wait 2500', 'tap S1', 'wait 300', 'expect K1=1 K2=1'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 3000', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-res', level: 4, scn: 'res', title: 'Stator resistance starter',
      brief: 'A softer start for a fan: <b>KM1</b> feeds the motor through three resistors, so it gets less voltage and takes less current. After <b>4 s</b> the bypass contactor <b>KM2</b> bridges the resistors.<ul><li>START: KM1 with seal-in, and the timer KT1 starts.</li><li>After 4 s: KM2 closes and stays.</li><li>STOP and the overload drop both.</li></ul>KM2 too early is a full-voltage start. No KM2 at all burns the resistors.',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 bypass'), P('KT1', 'kt', 'Timer', { s: 4 }), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['Seal-in on K1.', 'Below it three paths: K1 coil, the timer coil KT1, and KT1 NO then the K2 coil.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1\nW W NO:KT1\nCOIL:K1 TON:KT1:4 COIL:K2',
      tests: [{ name: 'START: through the resistors first', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 3200', 'expect K1=1 K2=0'] }, { name: 'After 4 s the bypass closes; full speed, nothing burns', steps: ['tap S1', 'wait 4400', 'expect K1=1 K2=1', 'wait 8000', 'expect K2=1', 'scn pct>=95'] }, { name: 'STOP drops both; the next start is through the resistors again', steps: ['tap S1', 'wait 5000', 'tap S0', 'wait 200', 'expect K1=0 K2=0', 'wait 5000', 'tap S1', 'wait 300', 'expect K1=1 K2=0'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 5000', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
    { id: 'c-rotor', level: 5, scn: 'rotor', title: 'Master: slip-ring motor, rotor resistance in steps',
      brief: 'A crusher starts fully loaded. Its slip-ring motor has resistors in the rotor circuit: high torque, low current. They are bridged step by step (two steps here, real starters have three to five).<ul><li>START: <b>KM1</b> with all resistance in.</li><li><b>2 s</b> later: <b>K11</b> bridges the first step.</li><li><b>2 s</b> after K11: <b>K12</b> bridges the second step.</li><li>STOP and the overload drop everything. A step that comes too early makes a current surge.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'K11'), P('K3', 'k', 'K12'), P('KT1', 'kt', 'Timer 1', { s: 2 }), P('KT2', 'kt', 'Timer 2', { s: 2 }), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['Seal-in on K1. Then five paths on one wire.', 'K1 coil · timer KT1 · KT1 NO then K2 coil · K2 NO then timer KT2 · KT2 NO then K3 coil.', 'It is a chain: each step starts the timer of the next one, so everything drops when K1 drops.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0 1 2 3\nW W NO:KT1 NO:K2 NO:KT2\nCOIL:K1 TON:KT1:2 COIL:K2 TON:KT2:2 COIL:K3',
      tests: [{ name: 'START: all resistance in', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0 K3=0', 'wait 1300', 'expect K2=0 K3=0'] }, { name: 'One step every 2 s', steps: ['tap S1', 'wait 2400', 'expect K2=1 K3=0', 'wait 1000', 'expect K2=1 K3=0', 'wait 1100', 'expect K1=1 K2=1 K3=1'] }, { name: 'Full speed, no surge, nothing overheats', steps: ['tap S1', 'wait 16000', 'expect K1=1 K2=1 K3=1', 'scn pct>=95'] }, { name: 'STOP opens every step; the next start has all resistance in', steps: ['tap S1', 'wait 6000', 'tap S0', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 4000', 'tap S1', 'wait 300', 'expect K1=1 K2=0 K3=0'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 6000', 'trip F2', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 2500'] }] },
    { id: 'c-at', level: 5, scn: 'at', title: 'Master: autotransformer starter',
      brief: 'A big compressor motor on a weak supply starts on <b>65 % voltage</b> from an autotransformer. Six current paths, the full panel:<ul><li>START latches the helper relay <b>KA1</b>. <b>KM3</b> (star point) and <b>KM2</b> (transformer) pull in.</li><li>After <b>5 s</b>: KM3 drops and <b>KM1</b> (run) pulls in. KM1 and KM3 are interlocked: together they short the transformer.</li><li><b>1 s</b> after KM1: KM2 drops too (second timer). The motor is never without voltage.</li><li>STOP and the overload drop everything.</li></ul>',
      parts: [S0, S1, K1, P('K2', 'k', 'KM2 transf.'), P('K3', 'k', 'KM3 star pt'), P('K4', 'k', 'KA1'), P('KT1', 'kt', 'Timer 1', { s: 5 }), P('KT2', 'kt', 'Timer 2', { s: 1 }), F2], scnNames: { pct: 'Motor speed (%)' },
      hints: ['Seal-in on the helper relay K4 (KA1). Below it six paths on one wire.', 'K4 coil · timer KT1 · KT1 NC, K1 NC, K3 coil · KT1 NO, K3 NC, K1 coil · KT2 NC, K2 coil · K1 NO, timer KT2.', 'KM2 is on from the start through KT2 NC, and drops 1 s after KM1 has closed.'],
      solution: 'NC:F2\nNC:S0\n~ 0\nNO:S1 NO:K4\n~ 0 1 2 3 4\nW W NC:KT1 NO:KT1 NC:KT2 NO:K1\nW W NC:K1 NC:K3 W W\nCOIL:K4 TON:KT1:5 COIL:K3 COIL:K1 COIL:K2 TON:KT2:1',
      tests: [{ name: 'START: star point and transformer, run contactor open', steps: ['tap S1', 'wait 300', 'expect K3=1 K2=1 K1=0', 'wait 4200', 'expect K3=1 K2=1 K1=0'] }, { name: 'After 5 s: star point out, run contactor in', steps: ['tap S1', 'wait 5400', 'expect K3=0 K1=1 K2=1'] }, { name: '1 s later the transformer is out; full speed', steps: ['tap S1', 'wait 6600', 'expect K1=1 K2=0 K3=0', 'wait 12000', 'expect K1=1 K2=0 K3=0', 'scn pct>=95'] }, { name: 'STOP drops everything; the next start is on the transformer again', steps: ['tap S1', 'wait 7000', 'tap S0', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 6000', 'tap S1', 'wait 300', 'expect K3=1 K2=1 K1=0'] }, { name: 'Overload drops everything', steps: ['tap S1', 'wait 7000', 'trip F2', 'wait 200', 'expect K1=0 K2=0 K3=0', 'wait 2500'] }] },
    { id: 'c-rev2', level: 5, scn: 'rev', title: 'Master: direct reversing with push-button interlock',
      brief: 'The professional reversing starter. On top of the contactor interlock, each button also has an <b>NC contact in the other direction</b> (push-button interlock):<ul><li>Pressing <b>REV</b> while running forward first drops KM1, then pulls in KM2: direct reversal, no STOP needed.</li><li>Pressing both buttons at the very same moment does nothing at all.</li><li>STOP and the overload stop both.</li></ul>',
      parts: [S0, P('S1', 'pb', 'FWD', { c: 'green' }), P('S2', 'pb', 'REV', { c: 'green' }), K1, P('K2', 'k', 'KM2'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      power: [{ k: 'swap', q: 'How do the wires go through KM2?', o: [['l13', 'L1 and L3 change places'], ['same', 'Same order as KM1'], ['rot', 'All three move one place']] }],
      hints: ['Start from the forward / reverse circuit with the contactor interlock.', 'Add one more row: S2 NC in the forward path and S1 NC in the reverse path.', 'Each button now has two contacts: NO in its own path, NC in the other.'],
      solution: '@ swap=l13\nNC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:S2 . NC:S1\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'FWD and REV each run and stay on', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'tap S0', 'wait 300', 'tap S2', 'wait 300', 'expect K2=1 K1=0'] }, { name: 'Direct reversal: REV while running forward', steps: ['tap S1', 'wait 1000', 'tap S2', 'wait 300', 'expect K1=0 K2=1', 'wait 3000', 'scn rpm<=-1300'] }, { name: 'And back: FWD while running in reverse', steps: ['tap S2', 'wait 1000', 'tap S1', 'wait 300', 'expect K2=0 K1=1'] }, { name: 'Both buttons at the same moment: nothing happens', steps: ['both S1 S2', 'wait 300', 'expect K1=0 K2=0', 'free S1 S2', 'wait 200', 'expect K1=0 K2=0'] }, { name: 'STOP and overload', steps: ['tap S1', 'wait 500', 'tap S0', 'wait 200', 'expect K1=0 K2=0', 'tap S2', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
  ];
  EC.FREE = { id: 'free', level: 0, scn: 'free', title: 'Free play: build any circuit',
    brief: 'An empty panel and a full parts box: three contactors (each one runs a motor), a helper relay, two timers, buttons, a selector, an E-stop, lamps and a horn. Build what you like and power it on.',
    parts: [P('S9', 'es', 'E-STOP'), S0, S1, P('S2', 'pb', 'S2'), P('S3', 'pb', 'S3'), P('S4', 'sel', 'Selector'), K1, P('K2', 'k', 'KM2'), P('K3', 'k', 'KM3'), P('K4', 'k', 'KA1'), P('KT1', 'kt', 'Timer 1', { s: 3 }), P('KT2', 'kt', 'Timer 2', { s: 5 }), F2, P('H1', 'lamp', 'Green', { c: 'green' }), P('H2', 'lamp', 'Red', { c: 'red' }), P('H3', 'horn', 'Horn')],
    hints: [], solution: '', tests: [] };
  EC.BY_ID = {}; EC.TASKS.forEach((t) => (EC.BY_ID[t.id] = t));
})(typeof window !== 'undefined' ? window : globalThis);
