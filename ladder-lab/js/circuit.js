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
  EC.empty = () => ({ cells: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), links: Array.from({ length: ROWS + 1 }, () => Array(COLS - 1).fill(false)) });
  EC.parse = function (text) {
    const c = EC.empty(); let r = 0, pend = null;
    String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).forEach((line) => {
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
    const out = [];
    for (let r = 0; r <= last; r++) {
      const lk = c.links[r].map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
      if (r > 0 && lk.length) out.push('~ ' + lk.join(' '));
      let row = c.cells[r].map((x) => (!x ? '.' : x.t === 'W' ? 'W' : x.t === 'TON' || x.t === 'TOF' ? x.t + ':' + x.d + ':' + x.s : x.t + ':' + x.d));
      while (row.length > 1 && row[row.length - 1] === '.') row.pop();
      out.push(row.join(' '));
    }
    return out.join('\n');
  };
  EC.isEmpty = (c) => !c.cells.some((row) => row.some(Boolean));

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
      if (k === 'k') { if (on) { d.off = 0; d.v = 1; } else if (d.v) { d.off++; if (d.off >= 3) d.v = 0; } }
      else if (k === 'kt') {
        const mode = cell ? cell.t : d.mode; if (cell) { d.mode = cell.t; d.s = cell.s; }
        if (mode === 'TOF') { if (on) { d.v = 1; d.acc = 0; } else if (d.v) { d.acc += DT; if (d.acc >= (d.s || 3) * 1000) d.v = 0; } }
        else { if (on) { d.acc += DT; d.v = d.acc >= (d.s || 3) * 1000 ? 1 : 0; } else { d.acc = 0; d.v = 0; } }
      } else if (k === 'lamp' || k === 'horn' || k === 'valve') d.v = on ? 1 : 0;
    });
    this.scn.step(this.st, this.D, DT);
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
  EC.SCN = {
    none: { init: () => ({ fault: '' }), step() {} },
    free: { init: () => ({ fault: '', n1: 0, n2: 0, n3: 0 }), step(st, D, dt) { ['K1', 'K2', 'K3'].forEach((k, i) => spin(st, 'n' + (i + 1), V(D, k), dt)); } },
    dol: {
      init: () => ({ fault: '', n: 0, rpm: 0, run: 0 }),
      step(st, D, dt) { const run = V(D, 'K1'); spin(st, 'n', run, dt); st.run = run; st.rpm = Math.round(st.n * 1480); burn(st, D, 'F2', run, dt, 'KM1'); },
    },
    rev: {
      init: () => ({ fault: '', n: 0, rpm: 0, dir: 0 }),
      step(st, D, dt) {
        const f = V(D, 'K1'), r = V(D, 'K2');
        if (f && r && !st.fault) st.fault = 'KM1 and KM2 closed together: a short circuit between two phases. The main breaker tripped with a bang.';
        const dir = st.fault ? 0 : f ? 1 : r ? -1 : 0; spin(st, 'n', dir, dt); st.dir = dir; st.rpm = Math.round(st.n * 1480); burn(st, D, 'F2', f || r, dt, 'the contactor');
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
      init: () => ({ fault: '', n: 0, pct: 0, mode: 0 }),
      step(st, D, dt) {
        const m = V(D, 'K1'), y = V(D, 'K2'), d = V(D, 'K3');
        if (y && d && !st.fault) st.fault = 'Star and delta contactors closed together: a short circuit. They need an interlock.';
        if (m && d && !y && st.n < 0.6 && !st.fault) st.fault = 'Delta at low speed: the starting current tripped the breaker. Start in star first.';
        const run = !st.fault && m; st.mode = run && y ? 1 : run && d ? 2 : 0;
        if (st.mode === 1) spin(st, 'n', 0.88, dt, 900); else if (st.mode === 2) spin(st, 'n', 1, dt, 300); else spin(st, 'n', 0, dt, 900);
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
  // steps: press X · release X · tap X [ms] · both X Y · free X Y · on X · off X · trip X · reset X · wait ms · expect A=1 B=0 · scn key>=n · mcb
  EC.run = function (task, circ) {
    const name = (tag) => { const p = task.parts.find((x) => x.d === tag); return p ? p.n + ' (' + tag + ')' : tag; };
    return task.tests.map((test) => {
      const sim = new Sim(circ, task); let stepNo = 0, cur = '';
      const run = (ms) => { for (let t = 0; t < ms; t += DT) { sim.tick(); if (sim.short) throw new Error(sim.short); if (sim.st.fault) throw new Error(sim.st.fault); } };
      try {
        run(100);
        test.steps.forEach((step) => {
          stepNo++; cur = step; const p = step.split(/\s+/), d = sim.D[p[1]];
          if (['press', 'release', 'tap', 'on', 'off', 'trip', 'reset'].includes(p[0]) && !d) throw new Error('unknown device ' + p[1]);
          switch (p[0]) {
            case 'press': case 'on': case 'trip': d.v = 1; run(30); break;
            case 'release': case 'off': case 'reset': d.v = 0; run(30); break;
            case 'tap': d.v = 1; run(+(p[2] || 200)); d.v = 0; run(100); break;
            case 'both': sim.D[p[1]].v = 1; sim.D[p[2]].v = 1; run(30); break;
            case 'free': sim.D[p[1]].v = 0; sim.D[p[2]].v = 0; run(30); break;
            case 'wait': run(+p[1]); break;
            case 'mcb': sim.resetMcb(); run(30); break;
            case 'expect': p.slice(1).forEach((cnd) => { const m = /^(\w+)=([01])$/.exec(cnd), v = sim.D[m[1]] ? sim.D[m[1]].v : -1; if (v !== +m[2]) throw new Error(name(m[1]) + ' should be ' + (+m[2] ? 'ON' : 'OFF') + ', but it is ' + (v ? 'ON' : 'OFF') + '.'); }); break;
            case 'scn': p.slice(1).forEach((cnd) => { const m = /^(\w+)(>=|<=|=)(-?\d+)$/.exec(cnd), v = sim.st[m[1]], w = +m[3]; if (!(m[2] === '>=' ? v >= w : m[2] === '<=' ? v <= w : v === w)) throw new Error((task.scnNames && task.scnNames[m[1]] || m[1]) + ' is ' + v + ', expected ' + m[2] + ' ' + w + '.'); }); break;
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
    { id: 'c-seal', level: 2, scn: 'dol', title: 'Direct-on-line starter: start, stop, seal-in',
      brief: 'The most important circuit of all. <b>START</b> (S1) pulls in the contactor <b>KM1</b>; a NO contact of KM1 beside the START button keeps it in (<b>seal-in</b>). <b>STOP</b> (S0, an NC button) and the NC contact of the <b>overload relay</b> F2 are in series above: each one can drop the contactor.',
      parts: [S0, S1, K1, F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['One path from the top: F2 NC, S0 NC, S1 NO, K1 coil.', 'Seal-in: K1 NO in the next path, beside S1. Link the two paths above and below these two contacts.', 'The overload contact must be F2 NC (95-96): it opens when the relay trips.'],
      solution: SEAL, tests: DOLTESTS },
    { id: 'c-panel', level: 2, scn: 'dol', title: 'A real starter panel: E-stop, RUN lamp, TRIP lamp',
      brief: 'The complete panel door:<ul><li><b>E-STOP</b> (S9), STOP (S0) and the overload contact in series.</li><li>START with seal-in.</li><li>Green <b>RUN</b> lamp (H1) in parallel with the coil.</li><li>Red <b>TRIP</b> lamp (H2) through the <b>NO</b> contact of the overload relay (97-98).</li></ul>After an E-stop or a trip the motor must not restart by itself.',
      parts: [P('S9', 'es', 'E-STOP'), S0, S1, K1, F2, P('H1', 'lamp', 'RUN', { c: 'green' }), P('H2', 'lamp', 'TRIP', { c: 'red' })], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Start from the seal-in circuit and put S9 NC at the very top.', 'RUN lamp: put H1 beside the K1 coil and link the two paths just above them.', 'TRIP lamp: its own path from L: F2 NO, then H2.'],
      solution: 'NC:S9 . NO:F2\nNC:F2 . LAMP:H2\nNC:S0\n~ 0\nNO:S1 NO:K1\n~ 0\nCOIL:K1 LAMP:H1',
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
      brief: 'Two contactors: <b>KM1</b> forward, <b>KM2</b> reverse (it swaps two phases). If both close, two phases are shorted. Build:<ul><li><b>FWD</b> (S1) and <b>REV</b> (S2), each with its own seal-in.</li><li>The <b>interlock</b>: an NC contact of KM2 in the KM1 coil path, and an NC contact of KM1 in the KM2 path.</li><li>STOP (S0) and the overload stop both. To change direction you press STOP first.</li></ul>',
      parts: [S0, P('S1', 'pb', 'FWD', { c: 'green' }), P('S2', 'pb', 'REV', { c: 'green' }), K1, P('K2', 'k', 'KM2'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Two seal-in circuits side by side, below the same F2 and S0: S1 with K1, S2 with K2.', 'Below each pair, before the coil: the NC contact of the other contactor.', 'Link the four paths above the buttons, and each pair below.'],
      solution: 'NC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'FWD runs forward and stays on', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'wait 2500', 'scn rpm>=1300'] }, { name: 'REV runs in reverse', steps: ['tap S2', 'wait 300', 'expect K2=1 K1=0', 'wait 2500', 'scn rpm<=-1300'] }, { name: 'REV while running forward does nothing (interlock)', steps: ['tap S1', 'wait 500', 'tap S2', 'wait 200', 'expect K1=1 K2=0'] }, { name: 'STOP, then the other direction', steps: ['tap S1', 'wait 500', 'tap S0', 'wait 200', 'expect K1=0', 'tap S2', 'wait 300', 'expect K2=1 K1=0'] }, { name: 'Overload stops it', steps: ['tap S2', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
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
    { id: 'c-rev2', level: 5, scn: 'rev', title: 'Master: direct reversing with push-button interlock',
      brief: 'The professional reversing starter. On top of the contactor interlock, each button also has an <b>NC contact in the other direction</b> (push-button interlock):<ul><li>Pressing <b>REV</b> while running forward first drops KM1, then pulls in KM2: direct reversal, no STOP needed.</li><li>Pressing both buttons at the very same moment does nothing at all.</li><li>STOP and the overload stop both.</li></ul>',
      parts: [S0, P('S1', 'pb', 'FWD', { c: 'green' }), P('S2', 'pb', 'REV', { c: 'green' }), K1, P('K2', 'k', 'KM2'), F2], scnNames: { rpm: 'Motor speed (rpm)' },
      hints: ['Start from the forward / reverse circuit with the contactor interlock.', 'Add one more row: S2 NC in the forward path and S1 NC in the reverse path.', 'Each button now has two contacts: NO in its own path, NC in the other.'],
      solution: 'NC:F2\nNC:S0\n~ 0 1 2\nNO:S1 NO:K1 NO:S2 NO:K2\n~ 0 2\nNC:S2 . NC:S1\nNC:K2 . NC:K1\nCOIL:K1 . COIL:K2',
      tests: [{ name: 'FWD and REV each run and stay on', steps: ['tap S1', 'wait 300', 'expect K1=1 K2=0', 'tap S0', 'wait 300', 'tap S2', 'wait 300', 'expect K2=1 K1=0'] }, { name: 'Direct reversal: REV while running forward', steps: ['tap S1', 'wait 1000', 'tap S2', 'wait 300', 'expect K1=0 K2=1', 'wait 3000', 'scn rpm<=-1300'] }, { name: 'And back: FWD while running in reverse', steps: ['tap S2', 'wait 1000', 'tap S1', 'wait 300', 'expect K2=0 K1=1'] }, { name: 'Both buttons at the same moment: nothing happens', steps: ['both S1 S2', 'wait 300', 'expect K1=0 K2=0', 'free S1 S2', 'wait 200', 'expect K1=0 K2=0'] }, { name: 'STOP and overload', steps: ['tap S1', 'wait 500', 'tap S0', 'wait 200', 'expect K1=0 K2=0', 'tap S2', 'wait 500', 'trip F2', 'wait 200', 'expect K1=0 K2=0', 'wait 2500'] }] },
  ];
  EC.FREE = { id: 'free', level: 0, scn: 'free', title: 'Free play: build any circuit',
    brief: 'An empty panel and a full parts box: three contactors (each one runs a motor), a helper relay, two timers, buttons, a selector, an E-stop, lamps and a horn. Build what you like and power it on.',
    parts: [P('S9', 'es', 'E-STOP'), S0, S1, P('S2', 'pb', 'S2'), P('S3', 'pb', 'S3'), P('S4', 'sel', 'Selector'), K1, P('K2', 'k', 'KM2'), P('K3', 'k', 'KM3'), P('K4', 'k', 'KA1'), P('KT1', 'kt', 'Timer 1', { s: 3 }), P('KT2', 'kt', 'Timer 2', { s: 5 }), F2, P('H1', 'lamp', 'Green', { c: 'green' }), P('H2', 'lamp', 'Red', { c: 'red' }), P('H3', 'horn', 'Horn')],
    hints: [], solution: '', tests: [] };
  EC.BY_ID = {}; EC.TASKS.forEach((t) => (EC.BY_ID[t.id] = t));
})(typeof window !== 'undefined' ? window : globalThis);
