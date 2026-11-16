/* Ladder Lab — virtual machines ("plants") that the ladder program controls.
 * Each plant: inputs (operator devices + sensors), outputs (actuators),
 * actions (things that happen in the world), init(), step() physics, draw().
 * Input kinds: pb = push button wired NO, pbnc = push button wired NC
 * (reads 1 until pressed), sw = maintained switch, sensor = driven by the plant.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const P = (LL.Plants = {});

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function devices(plant, ctrl) {
    const o = {};
    plant.inputs.forEach((i) => {
      const on = !!ctrl[i.addr];
      if (i.kind === 'pb' || i.kind === 'sw') o[i.addr] = on ? 1 : 0;
      else if (i.kind === 'pbnc') o[i.addr] = on ? 0 : 1;
    });
    return o;
  }
  LL.plantDevices = devices;

  // ───────────── drawing helpers (logical canvas 640 × 360) ─────────────
  const D = (LL.Draw = {});
  D.rr = function (c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  D.text = function (c, s, x, y, o) {
    o = o || {};
    c.font = (o.weight || 500) + ' ' + (o.size || 12) + 'px ' + (o.mono ? 'var(--mono-stack, ui-monospace, monospace)' : 'system-ui, sans-serif');
    if (o.mono) c.font = (o.weight || 500) + ' ' + (o.size || 12) + 'px "IBM Plex Mono", ui-monospace, monospace';
    else c.font = (o.weight || 500) + ' ' + (o.size || 12) + 'px "IBM Plex Sans", system-ui, sans-serif';
    c.fillStyle = o.color || '#000';
    c.textAlign = o.align || 'center';
    c.textBaseline = o.base || 'middle';
    c.fillText(s, x, y);
  };
  D.lamp = function (c, th, x, y, r, on, color, label, sub) {
    const col = th[color] || color;
    if (on) {
      const g = c.createRadialGradient(x, y, 0, x, y, r * 2.4);
      g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.4, 0, 7); c.fill();
    }
    c.fillStyle = th.bezel; c.beginPath(); c.arc(x, y, r + 4, 0, 7); c.fill();
    c.fillStyle = on ? col : th.lampOff; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    if (on) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, 7); c.fill(); }
    if (label) D.text(c, label, x, y + r + 14, { size: 11, weight: 600, color: th.ink });
    if (sub) D.text(c, sub, x, y + r + 27, { size: 10, mono: true, color: th.muted });
  };
  D.sensorDot = function (c, th, x, y, on, label, align) {
    c.fillStyle = th.bezel; D.rr(c, x - 7, y - 7, 14, 14, 3); c.fill();
    c.fillStyle = on ? th.red : th.lampOff; c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
    if (label) D.text(c, label, x + (align === 'left' ? -12 : 12), y, { size: 10, mono: true, color: th.muted, align: align === 'left' ? 'right' : 'left' });
  };
  D.tag = function (c, th, x, y, s, on) {
    c.font = '600 10px "IBM Plex Mono", ui-monospace, monospace';
    const w = c.measureText(s).width + 10;
    c.fillStyle = on ? th.on : th.chip; D.rr(c, x - w / 2, y - 8, w, 16, 4); c.fill();
    D.text(c, s, x, y + 0.5, { size: 10, mono: true, weight: 600, color: on ? th.onInk : th.muted });
  };
  D.pipe = function (c, th, pts, flowing, t) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = th.metalDark; c.lineWidth = 10; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    c.strokeStyle = flowing ? th.water : th.pipe; c.lineWidth = 6; c.stroke();
    if (flowing) { c.setLineDash([6, 10]); c.lineDashOffset = -t * 0.06; c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.stroke(); c.setLineDash([]); }
  };
  D.contactor = function (c, th, x, y, label, on, sub) {
    c.fillStyle = th.panel2; D.rr(c, x - 26, y - 22, 52, 44, 6); c.fill();
    c.strokeStyle = on ? th.on : th.line; c.lineWidth = 2; c.stroke();
    D.text(c, label, x, y - 6, { size: 13, weight: 700, color: th.ink });
    D.text(c, on ? 'CLOSED' : 'open', x, y + 10, { size: 9, mono: true, weight: 600, color: on ? th.on : th.muted });
    if (sub) D.text(c, sub, x, y + 34, { size: 10, color: th.muted });
  };
  D.fault = function (c, th, msg) {
    if (!msg) return;
    c.fillStyle = th.red; D.rr(c, 20, 300, 600, 44, 8); c.fill();
    D.text(c, '⚠ ' + msg, 320, 322, { size: 13, weight: 700, color: '#fff' });
  };

  // ───────────────────────── trainer panel ─────────────────────────
  P.panel = {
    id: 'panel', name: 'Trainer panel', blurb: 'Push buttons, switches and 8 pilot lamps. The simplest test bench.',
    inputs: [
      { addr: 'I0.0', name: 'PB1', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'PB2', kind: 'pb', color: 'green' },
      { addr: 'I0.2', name: 'PB3', kind: 'pb', color: 'black' },
      { addr: 'I0.3', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.4', name: 'SW1', kind: 'sw' },
      { addr: 'I0.5', name: 'SW2', kind: 'sw' },
      { addr: 'I0.6', name: 'SW3', kind: 'sw' },
      { addr: 'I0.7', name: 'SW4', kind: 'sw' },
    ],
    outputs: ['green', 'green', 'amber', 'amber', 'red', 'red', 'blue', 'white'].map((col, i) => ({ addr: 'Q0.' + i, name: 'L' + (i + 1), color: col })),
    actions: [],
    init() { return { t: 0 }; },
    step(st, ctrl, Q, dt) { st.t += dt; return devices(this, ctrl); },
    draw(c, st, th, Q, I, tags) {
      c.fillStyle = th.panel; D.rr(c, 16, 16, 608, 328, 14); c.fill();
      c.strokeStyle = th.line; c.lineWidth = 1; c.stroke();
      D.text(c, 'PILOT LAMPS', 40, 40, { size: 10, weight: 700, color: th.muted, align: 'left' });
      this.outputs.forEach((o, i) => {
        const x = 70 + i * 71;
        D.lamp(c, th, x, 88, 18, !!Q[o.addr], o.color, (tags && tags[o.addr]) || o.name, o.addr);
      });
      D.text(c, 'OPERATOR DEVICES', 40, 172, { size: 10, weight: 700, color: th.muted, align: 'left' });
      this.inputs.forEach((d, i) => {
        const x = 70 + i * 71, y = 222, pressed = d.kind === 'sw' ? !!I[d.addr] : d.kind === 'pbnc' ? !I[d.addr] : !!I[d.addr];
        if (d.kind === 'sw') {
          c.fillStyle = th.bezel; c.beginPath(); c.arc(x, y, 20, 0, 7); c.fill();
          c.save(); c.translate(x, y); c.rotate(pressed ? 0.6 : -0.6);
          c.fillStyle = th.knob; D.rr(c, -5, -18, 10, 36, 4); c.fill(); c.restore();
          D.text(c, pressed ? 'ON' : 'OFF', x, y - 30, { size: 9, mono: true, weight: 700, color: pressed ? th.on : th.muted });
        } else {
          const col = d.color === 'red' ? th.red : d.color === 'black' ? th.knob : th.green;
          c.fillStyle = th.bezel; c.beginPath(); c.arc(x, y, 21, 0, 7); c.fill();
          c.fillStyle = col; c.beginPath(); c.arc(x, y, pressed ? 13 : 16, 0, 7); c.fill();
          D.text(c, d.kind === 'pbnc' ? 'NC' : 'NO', x, y - 32, { size: 9, mono: true, weight: 700, color: th.muted });
        }
        D.text(c, (tags && tags[d.addr]) || d.name, x, y + 36, { size: 11, weight: 600, color: th.ink });
        D.tag(c, th, x, y + 54, d.addr + '=' + (I[d.addr] ? 1 : 0), !!I[d.addr]);
      });
    },
  };

  // ───────────────────────── reversing motor ─────────────────────────
  P.motor = {
    id: 'motor', name: 'Reversing motor', blurb: 'A 3-phase motor with forward (K1) and reverse (K2) contactors and a thermal overload relay.',
    inputs: [
      { addr: 'I0.0', name: 'FWD', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'REV', kind: 'pb', color: 'green' },
      { addr: 'I0.2', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.3', name: 'OL ok', kind: 'sensor', note: 'Overload relay NC contact: 1 = healthy, 0 = tripped' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'K1 Forward', color: 'green' },
      { addr: 'Q0.1', name: 'K2 Reverse', color: 'blue' },
      { addr: 'Q0.2', name: 'Run lamp', color: 'green' },
      { addr: 'Q0.3', name: 'Fault lamp', color: 'red' },
    ],
    actions: [{ id: 'trip', label: 'Trip overload', toggle: true, run(st) { st.tripped = !st.tripped; } }],
    init() { return { speed: 0, ang: 0, tripped: false, fault: null, t: 0 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const k1 = Q['Q0.0'], k2 = Q['Q0.1'];
      if (k1 && k2) st.fault = st.fault || 'Short circuit: K1 and K2 closed together.';
      const target = st.fault || st.tripped ? 0 : k1 && !k2 ? 1 : k2 && !k1 ? -1 : 0;
      st.speed += (target - st.speed) * Math.min(1, (dt / 1000) * 2.2);
      st.ang += st.speed * dt * 0.012;
      const o = devices(this, ctrl);
      o['I0.3'] = st.tripped ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q) {
      const k1 = !!Q['Q0.0'], k2 = !!Q['Q0.1'];
      // supply lines
      ['L1', 'L2', 'L3'].forEach((l, i) => {
        const y = 40 + i * 12;
        c.strokeStyle = th.line; c.lineWidth = 2; c.beginPath(); c.moveTo(40, y); c.lineTo(330, y); c.stroke();
        D.text(c, l, 28, y, { size: 9, mono: true, color: th.muted });
      });
      c.strokeStyle = th.line; c.lineWidth = 2;
      [[120, k1], [230, k2]].forEach(([x, on]) => { c.strokeStyle = on ? th.on : th.line; c.beginPath(); c.moveTo(x, 64); c.lineTo(x, 108); c.stroke(); });
      D.contactor(c, th, 120, 130, 'K1', k1, 'Forward Q0.0');
      D.contactor(c, th, 230, 130, 'K2', k2, 'Reverse Q0.1');
      c.strokeStyle = k1 || k2 ? th.on : th.line;
      c.beginPath(); c.moveTo(120, 152); c.lineTo(120, 190); c.lineTo(330, 190); c.moveTo(230, 152); c.lineTo(230, 190); c.stroke();
      if (k2) { D.text(c, '⇄ L1/L3 swapped', 230, 205, { size: 9, mono: true, color: th.blue }); }
      // OL relay
      c.fillStyle = th.panel2; D.rr(c, 330, 166, 70, 48, 6); c.fill(); c.strokeStyle = st.tripped ? th.red : th.line; c.stroke();
      D.text(c, 'OL', 365, 182, { size: 13, weight: 700, color: th.ink });
      D.text(c, st.tripped ? 'TRIPPED' : 'I0.3 = 1', 365, 199, { size: 9, mono: true, weight: 600, color: st.tripped ? th.red : th.muted });
      c.strokeStyle = th.line; c.beginPath(); c.moveTo(400, 190); c.lineTo(440, 190); c.stroke();
      // motor
      const mx = 510, my = 160;
      c.fillStyle = th.metal; D.rr(c, mx - 70, my - 55, 120, 110, 12); c.fill();
      for (let i = 0; i < 7; i++) { c.fillStyle = th.metalDark; c.fillRect(mx - 62 + i * 16, my - 55, 6, 110); }
      c.fillStyle = th.metalDark; c.fillRect(mx + 50, my - 8, 40, 16);
      c.save(); c.translate(mx + 92, my); c.rotate(st.ang);
      c.fillStyle = th.amber; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); D.rr(c, -4, 0, 8, 34, 4); c.fill(); }
      c.restore();
      c.fillStyle = th.bezel; c.beginPath(); c.arc(mx + 92, my, 6, 0, 7); c.fill();
      D.text(c, 'M 3~', mx - 10, my + 72, { size: 12, weight: 700, color: th.ink });
      const rpm = Math.round(Math.abs(st.speed) * 1450);
      D.text(c, (st.speed > 0.02 ? '↻ FWD ' : st.speed < -0.02 ? '↺ REV ' : '') + rpm + ' rpm', mx - 10, my + 90, { size: 11, mono: true, color: th.muted });
      D.lamp(c, th, 80, 260, 11, !!Q['Q0.2'], 'green', 'Run', 'Q0.2');
      D.lamp(c, th, 150, 260, 11, !!Q['Q0.3'], 'red', 'Fault', 'Q0.3');
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── conveyor ─────────────────────────
  P.conveyor = {
    id: 'conveyor', name: 'Box conveyor', blurb: 'A belt conveyor with a photo-eye that sees boxes passing. Boxes drop into a bin at the end.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Photo-eye', kind: 'sensor', note: '1 while a box blocks the light beam' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Belt motor', color: 'green' },
      { addr: 'Q0.1', name: 'Batch done', color: 'amber' },
      { addr: 'Q0.2', name: 'Feeder', color: 'blue' },
    ],
    actions: [{ id: 'box', label: 'Drop a box', run(st) { if (!st.boxes.some((b) => b.x < 0.16)) st.boxes.push({ x: 0.05, h: 0.8 + Math.random() * 0.4 }); } }],
    init() { return { boxes: [], off: 0, bin: 0, feedT: 0, t: 0 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const run = Q['Q0.0'];
      if (Q['Q0.2']) { st.feedT += dt; if (st.feedT >= 1500) { st.feedT = 0; this.actions[0].run(st); } } else st.feedT = 1500;
      if (run) {
        const v = 0.25 * dt / 1000;
        st.off += v;
        st.boxes.forEach((b) => (b.x += v));
        const before = st.boxes.length;
        st.boxes = st.boxes.filter((b) => b.x < 1.04);
        st.bin += before - st.boxes.length;
      }
      const o = devices(this, ctrl);
      o['I0.2'] = st.boxes.some((b) => Math.abs(b.x - 0.7) < 0.045) ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x0 = 50, x1 = 540, y = 200, L = x1 - x0;
      // belt
      c.fillStyle = th.metalDark; D.rr(c, x0 - 18, y, L + 36, 26, 13); c.fill();
      c.strokeStyle = th.pipe; c.lineWidth = 2;
      for (let i = 0; i < 30; i++) { const xx = x0 + (((i / 30) + st.off) % 1) * L; c.beginPath(); c.moveTo(xx, y + 3); c.lineTo(xx - 6, y + 23); c.stroke(); }
      [x0, x1].forEach((xx) => { c.fillStyle = Q['Q0.0'] ? th.on : th.metal; c.beginPath(); c.arc(xx, y + 13, 10, 0, 7); c.fill(); });
      // legs
      c.fillStyle = th.metal; [x0 + 20, x1 - 20, (x0 + x1) / 2].forEach((xx) => c.fillRect(xx - 4, y + 26, 8, 60));
      // photo eye
      const px = x0 + 0.7 * L;
      c.fillStyle = th.bezel; D.rr(c, px - 9, y - 96, 18, 24, 4); c.fill();
      c.strokeStyle = I['I0.2'] ? th.red : 'rgba(239,68,68,.35)'; c.lineWidth = 2; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(px, y - 72); c.lineTo(px, y); c.stroke(); c.setLineDash([]);
      D.sensorDot(c, th, px + 22, y - 84, !!I['I0.2'], 'I0.2 photo-eye');
      // boxes
      st.boxes.forEach((b) => {
        const bx = x0 + b.x * L, bw = 0.08 * L, bh = 34 * b.h;
        c.fillStyle = th.box; D.rr(c, bx - bw / 2, y - bh, bw, bh, 3); c.fill();
        c.strokeStyle = th.boxEdge; c.lineWidth = 1.5; c.stroke();
        c.beginPath(); c.moveTo(bx - bw / 2, y - bh + 8); c.lineTo(bx + bw / 2, y - bh + 8); c.stroke();
      });
      // bin
      c.fillStyle = th.panel2; D.rr(c, x1 + 30, y + 30, 64, 60, 6); c.fill(); c.strokeStyle = th.line; c.stroke();
      D.text(c, String(st.bin), x1 + 62, y + 56, { size: 22, weight: 700, color: th.ink });
      D.text(c, 'in bin', x1 + 62, y + 78, { size: 10, color: th.muted });
      D.text(c, Q['Q0.0'] ? 'BELT RUNNING  →' : 'belt stopped', x0, y + 50, { size: 11, mono: true, weight: 600, color: Q['Q0.0'] ? th.on : th.muted, align: 'left' });
      D.lamp(c, th, 80, 60, 12, !!Q['Q0.1'], 'amber', 'Batch done', 'Q0.1');
      D.lamp(c, th, 180, 60, 12, !!Q['Q0.2'], 'blue', 'Feeder', 'Q0.2');
      D.lamp(c, th, 280, 60, 12, !!Q['Q0.0'], 'green', 'Motor', 'Q0.0');
    },
  };

  // ───────────────────────── tank ─────────────────────────
  P.tank = {
    id: 'tank', name: 'Water tank', blurb: 'A tank with a fill pump, drain valve, mixer and two level switches (low 20 %, high 80 %).',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Low level', kind: 'sensor', note: '1 while water is above 20 %' },
      { addr: 'I0.3', name: 'High level', kind: 'sensor', note: '1 while water is above 80 %' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Fill pump', color: 'green' },
      { addr: 'Q0.1', name: 'Drain valve', color: 'blue' },
      { addr: 'Q0.2', name: 'Mixer', color: 'amber' },
      { addr: 'Q0.3', name: 'Alarm', color: 'red' },
    ],
    actions: [{ id: 'demand', label: 'Consumer demand', toggle: true, run(st) { st.demand = !st.demand; } }],
    init() { return { level: 0.1, demand: false, ang: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      st.level += ((Q['Q0.0'] ? 0.1 : 0) - (Q['Q0.1'] ? 0.12 : 0) - (st.demand ? 0.04 : 0)) * s;
      if (st.level >= 1) { st.level = 1; if (Q['Q0.0']) st.fault = st.fault || 'Tank overflowed: the pump kept running when it was full.'; }
      st.level = clamp(st.level, 0, 1);
      if (Q['Q0.2']) st.ang += dt * 0.012;
      const o = devices(this, ctrl);
      o['I0.2'] = st.level > 0.2 ? 1 : 0;
      o['I0.3'] = st.level > 0.8 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const tx = 250, ty = 50, tw = 170, tb = 270, th_ = tb - ty;
      // liquid
      c.fillStyle = th.water; c.globalAlpha = 0.85;
      const ly = tb - st.level * th_;
      c.beginPath(); c.moveTo(tx, ly);
      for (let x = 0; x <= tw; x += 10) c.lineTo(tx + x, ly + Math.sin(x / 18 + st.t / 300) * (Q['Q0.2'] ? 3 : 1));
      c.lineTo(tx + tw, tb); c.lineTo(tx, tb); c.closePath(); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = th.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, tb); c.lineTo(tx + tw, tb); c.lineTo(tx + tw, ty); c.stroke();
      // scale
      for (let i = 0; i <= 10; i++) { const y = tb - (i / 10) * th_; c.strokeStyle = th.line; c.lineWidth = 1; c.beginPath(); c.moveTo(tx + tw, y); c.lineTo(tx + tw + (i % 5 ? 5 : 10), y); c.stroke(); }
      D.text(c, Math.round(st.level * 100) + ' %', tx + tw / 2, ty - 16, { size: 14, weight: 700, mono: true, color: th.ink });
      // level switches
      D.sensorDot(c, th, tx + tw + 24, tb - 0.8 * th_, !!I['I0.3'], 'I0.3 high 80%');
      D.sensorDot(c, th, tx + tw + 24, tb - 0.2 * th_, !!I['I0.2'], 'I0.2 low 20%');
      // mixer
      c.strokeStyle = th.metalDark; c.lineWidth = 4; c.beginPath(); c.moveTo(tx + tw / 2, ty - 4); c.lineTo(tx + tw / 2, tb - 40); c.stroke();
      c.fillStyle = Q['Q0.2'] ? th.amber : th.metal; D.rr(c, tx + tw / 2 - 16, ty - 22, 32, 18, 4); c.fill();
      const w = Math.cos(st.ang) * 26;
      c.strokeStyle = th.metalDark; c.lineWidth = 5; c.beginPath(); c.moveTo(tx + tw / 2 - w, tb - 40); c.lineTo(tx + tw / 2 + w, tb - 40); c.stroke();
      // fill pump + pipe
      D.pipe(c, th, [[40, 280], [140, 280], [140, 30], [tx + 30, 30], [tx + 30, ty + 6]], !!Q['Q0.0'], st.t);
      c.fillStyle = Q['Q0.0'] ? th.on : th.metal; c.beginPath(); c.arc(140, 220, 22, 0, 7); c.fill();
      D.text(c, 'P', 140, 220, { size: 14, weight: 700, color: Q['Q0.0'] ? th.onInk : th.ink });
      D.text(c, 'Fill pump Q0.0', 140, 256, { size: 10, color: th.muted });
      // drain
      D.pipe(c, th, [[tx + tw - 30, tb], [tx + tw - 30, 310], [600, 310]], !!Q['Q0.1'] && st.level > 0, st.t);
      c.fillStyle = Q['Q0.1'] ? th.on : th.metal; c.save(); c.translate(tx + tw - 30, 296); c.beginPath(); c.moveTo(-12, -8); c.lineTo(12, 8); c.lineTo(12, -8); c.lineTo(-12, 8); c.closePath(); c.fill(); c.restore();
      D.text(c, 'Drain Q0.1', tx + tw + 20, 296, { size: 10, color: th.muted, align: 'left' });
      if (st.demand) { D.pipe(c, th, [[tx, tb - 10], [tx - 50, tb - 10], [tx - 50, 330]], st.level > 0, st.t); D.text(c, 'demand', tx - 50, 344, { size: 10, color: th.muted }); }
      D.lamp(c, th, 570, 60, 13, !!Q['Q0.3'] && (st.t % 600 < 400), 'red', 'Alarm', 'Q0.3');
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── traffic light ─────────────────────────
  P.traffic = {
    id: 'traffic', name: 'Traffic crossing', blurb: 'A road with car signals and a pedestrian crossing.',
    inputs: [
      { addr: 'I0.0', name: 'RUN', kind: 'sw' },
      { addr: 'I0.1', name: 'Ped button', kind: 'pb', color: 'black' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Red', color: 'red' },
      { addr: 'Q0.1', name: 'Yellow', color: 'amber' },
      { addr: 'Q0.2', name: 'Green', color: 'green' },
      { addr: 'Q0.3', name: 'Walk', color: 'green' },
      { addr: 'Q0.4', name: "Don't walk", color: 'red' },
    ],
    actions: [],
    init() { return { cars: [{ x: -40 }, { x: 140 }], t: 0, spawn: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      if ((Q['Q0.2'] || Q['Q0.1']) && Q['Q0.3']) st.fault = st.fault || 'Walk signal shown while cars still have green/yellow.';
      if (Q['Q0.0'] && Q['Q0.2']) st.fault = st.fault || 'Red and green lit at the same time.';
      const stopLine = 330, go = !!Q['Q0.2'];
      const v = 0.12 * dt;
      st.cars.sort((a, b) => b.x - a.x);
      st.cars.forEach((car, i) => {
        let lim = Infinity;
        if (i > 0) lim = st.cars[i - 1].x - 70;
        if (!go && car.x <= stopLine - 60) lim = Math.min(lim, stopLine - 60);
        car.x = Math.min(car.x + v, lim);
      });
      st.cars = st.cars.filter((c2) => c2.x < 700);
      st.spawn -= dt;
      if (st.spawn <= 0 && !st.cars.some((c2) => c2.x < 40)) { st.cars.push({ x: -60, hue: Math.random() }); st.spawn = 1200 + Math.random() * 1800; }
      return devices(this, ctrl);
    },
    draw(c, st, th, Q) {
      c.fillStyle = th.road; c.fillRect(0, 150, 640, 110);
      c.strokeStyle = th.roadLine; c.lineWidth = 3; c.setLineDash([24, 18]); c.beginPath(); c.moveTo(0, 205); c.lineTo(640, 205); c.stroke(); c.setLineDash([]);
      c.fillStyle = th.zebra; for (let i = 0; i < 6; i++) c.fillRect(340, 156 + i * 18, 60, 10);
      c.fillStyle = th.on; c.fillRect(326, 150, 4, 55);
      st.cars.forEach((car) => {
        c.fillStyle = th.carBody; D.rr(c, car.x - 50, 166, 56, 28, 6); c.fill();
        c.fillStyle = th.carGlass; D.rr(c, car.x - 30, 170, 22, 20, 3); c.fill();
      });
      // car signal head
      c.fillStyle = th.bezel; D.rr(c, 280, 20, 40, 112, 8); c.fill();
      D.lamp(c, th, 300, 42, 11, !!Q['Q0.0'], 'red');
      D.lamp(c, th, 300, 76, 11, !!Q['Q0.1'], 'amber');
      D.lamp(c, th, 300, 110, 11, !!Q['Q0.2'], 'green');
      c.fillStyle = th.metal; c.fillRect(297, 132, 6, 18);
      D.text(c, 'Q0.0 / Q0.1 / Q0.2', 300, 10 + 2, { size: 9, mono: true, color: th.muted });
      // ped head
      c.fillStyle = th.bezel; D.rr(c, 430, 270, 70, 60, 8); c.fill();
      D.text(c, '🚶', 450, 300, { size: 22, color: Q['Q0.3'] ? th.green : th.lampOff });
      D.text(c, '✋', 482, 300, { size: 22, color: Q['Q0.4'] ? th.red : th.lampOff });
      c.globalAlpha = Q['Q0.3'] ? 1 : 0.15; c.fillStyle = th.green; c.beginPath(); c.arc(450, 300, 14, 0, 7); c.fill(); c.globalAlpha = Q['Q0.4'] ? 1 : 0.15; c.fillStyle = th.red; c.beginPath(); c.arc(482, 300, 14, 0, 7); c.fill(); c.globalAlpha = 1;
      D.text(c, 'WALK', 450, 300, { size: 8, weight: 700, color: '#fff' });
      D.text(c, 'WAIT', 482, 300, { size: 8, weight: 700, color: '#fff' });
      D.text(c, 'Q0.3 / Q0.4', 465, 342, { size: 9, mono: true, color: th.muted });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── three cylinders ─────────────────────────
  P.cylinders = {
    id: 'cylinders', name: 'Three pneumatic cylinders', blurb: 'Cylinders A, B, C with spring-return solenoid valves and reed switches at both ends.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'A0 A home', kind: 'sensor' },
      { addr: 'I0.3', name: 'A1 A out', kind: 'sensor' },
      { addr: 'I0.4', name: 'B0 B home', kind: 'sensor' },
      { addr: 'I0.5', name: 'B1 B out', kind: 'sensor' },
      { addr: 'I0.6', name: 'C0 C home', kind: 'sensor' },
      { addr: 'I0.7', name: 'C1 C out', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Y1 valve A', color: 'blue' },
      { addr: 'Q0.1', name: 'Y2 valve B', color: 'green' },
      { addr: 'Q0.2', name: 'Y3 valve C', color: 'amber' },
    ],
    actions: [],
    init() { return { pos: [0, 0, 0], t: 0 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      ['Q0.0', 'Q0.1', 'Q0.2'].forEach((q, i) => { st.pos[i] = clamp(st.pos[i] + (Q[q] ? 1 : -1) * dt / 1000, 0, 1); });
      const o = devices(this, ctrl);
      st.pos.forEach((p, i) => { o['I0.' + (2 + i * 2)] = p < 0.03 ? 1 : 0; o['I0.' + (3 + i * 2)] = p > 0.97 ? 1 : 0; });
      return o;
    },
    draw(c, st, th, Q, I) {
      const cols = [th.blue, th.green, th.amber];
      ['A', 'B', 'C'].forEach((n, i) => {
        const x = 110 + i * 200, top = 130, bot = 290, on = !!Q['Q0.' + i];
        const rod = st.pos[i] * 90;
        // rod
        c.fillStyle = th.metalDark; c.fillRect(x - 6, top - 20 - rod, 12, 30 + rod);
        c.fillStyle = cols[i]; D.rr(c, x - 22, top - 34 - rod, 44, 16, 4); c.fill();
        // barrel
        c.fillStyle = th.metal; D.rr(c, x - 36, top - 10, 72, 16, 4); c.fill();
        c.fillStyle = th.glass; c.fillRect(x - 28, top + 6, 56, bot - top - 26);
        c.fillStyle = th.metal; D.rr(c, x - 36, bot - 22, 72, 16, 4); c.fill();
        c.strokeStyle = th.metalDark; c.lineWidth = 2; [x - 24, x + 24].forEach((xx) => { c.beginPath(); c.moveTo(xx, top + 6); c.lineTo(xx, bot - 22); c.stroke(); });
        // piston
        const py = bot - 34 - st.pos[i] * (bot - top - 52);
        c.fillStyle = th.metalDark; c.fillRect(x - 26, py, 52, 10);
        c.fillStyle = th.metalDark; c.fillRect(x - 4, top - 10, 8, py - top + 10);
        // sensors
        D.sensorDot(c, th, x + 44, top + 16, !!I['I0.' + (3 + i * 2)], n + '1 I0.' + (3 + i * 2));
        D.sensorDot(c, th, x + 44, bot - 34, !!I['I0.' + (2 + i * 2)], n + '0 I0.' + (2 + i * 2));
        // valve
        c.fillStyle = on ? cols[i] : th.metal; D.rr(c, x - 60, bot - 26, 20, 26, 3); c.fill();
        c.strokeStyle = on ? th.on : th.line; c.lineWidth = 2; c.stroke();
        D.text(c, 'Cylinder ' + n, x, bot + 18, { size: 12, weight: 700, color: th.ink });
        D.tag(c, th, x, bot + 38, 'Y' + (i + 1) + ' Q0.' + i, on);
      });
    },
  };

  // ───────────────────────── garage door ─────────────────────────
  P.garage = {
    id: 'garage', name: 'Garage door', blurb: 'A roll-up door with up/down motor, limit switches and a safety photo-beam.',
    inputs: [
      { addr: 'I0.0', name: 'OPEN', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'CLOSE', kind: 'pb', color: 'black' },
      { addr: 'I0.2', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.3', name: 'LS open', kind: 'sensor', note: 'Upper limit: 1 when fully open' },
      { addr: 'I0.4', name: 'LS closed', kind: 'sensor', note: 'Lower limit: 1 when fully closed' },
      { addr: 'I0.5', name: 'Beam clear', kind: 'sensor', note: 'Safety beam: 1 = clear, 0 = blocked' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Motor UP', color: 'green' },
      { addr: 'Q0.1', name: 'Motor DOWN', color: 'blue' },
      { addr: 'Q0.2', name: 'Warning light', color: 'amber' },
    ],
    actions: [{ id: 'obstacle', label: 'Obstacle in doorway', toggle: true, run(st) { st.obstacle = !st.obstacle; } }],
    init() { return { pos: 0, obstacle: false, stall: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const up = Q['Q0.0'], dn = Q['Q0.1'];
      if (up && dn) st.fault = st.fault || 'Motor UP and DOWN energised together.';
      if (!st.fault) {
        let np = clamp(st.pos + ((up ? 1 : 0) - (dn ? 1 : 0)) * 0.25 * dt / 1000, 0, 1);
        if (st.obstacle && dn && !up && st.pos >= 0.3 && np < 0.3) { np = 0.3; st.fault = 'The door closed onto the obstacle!'; }
        st.pos = np;
      }
      if ((up && st.pos >= 1) || (dn && st.pos <= 0)) st.stall += dt; else st.stall = 0;
      if (st.stall > 1500) st.fault = st.fault || 'Motor stalled at the end of travel. Use the limit switch to stop it.';
      const o = devices(this, ctrl);
      o['I0.3'] = st.pos >= 0.99 ? 1 : 0;
      o['I0.4'] = st.pos <= 0.01 ? 1 : 0;
      o['I0.5'] = st.obstacle ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x = 170, y = 50, w = 300, h = 220;
      c.fillStyle = th.wall; c.fillRect(x - 40, y - 30, w + 80, h + 40);
      c.fillStyle = th.inside; c.fillRect(x, y, w, h);
      if (st.obstacle) { c.fillStyle = th.carBody; D.rr(c, x + 70, y + h - 46, 160, 40, 10); c.fill(); c.fillStyle = th.carGlass; D.rr(c, x + 110, y + h - 70, 80, 28, 8); c.fill(); }
      const dh = (1 - st.pos) * h;
      for (let i = 0; i < dh; i += 18) { c.fillStyle = (i / 18) % 2 ? th.door : th.door2; c.fillRect(x, y + i, w, Math.min(18, dh - i)); }
      c.fillStyle = th.metalDark; c.fillRect(x, y + dh - 4, w, 6);
      c.fillStyle = th.ground; c.fillRect(x - 60, y + h, w + 120, 12);
      // beam
      c.strokeStyle = st.obstacle ? th.red : 'rgba(239,68,68,.35)'; c.lineWidth = 2; c.setLineDash([4, 5]);
      c.beginPath(); c.moveTo(x - 10, y + h - 12); c.lineTo(x + w + 10, y + h - 12); c.stroke(); c.setLineDash([]);
      D.sensorDot(c, th, x - 22, y + h - 12, !I['I0.5'], 'beam I0.5', 'left');
      D.sensorDot(c, th, x + w + 22, y + 6, !!I['I0.3'], 'LS open I0.3');
      D.sensorDot(c, th, x + w + 22, y + h - 6, !!I['I0.4'], 'LS closed I0.4');
      D.lamp(c, th, x + w / 2, y - 14, 9, !!Q['Q0.2'], 'amber');
      D.text(c, Q['Q0.0'] ? '▲ UP' : Q['Q0.1'] ? '▼ DOWN' : '■ stopped', 70, 120, { size: 13, weight: 700, mono: true, color: Q['Q0.0'] || Q['Q0.1'] ? th.on : th.muted });
      D.text(c, Math.round(st.pos * 100) + '% open', 70, 142, { size: 11, mono: true, color: th.muted });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── parking lot ─────────────────────────
  P.parking = {
    id: 'parking', name: 'Parking lot', blurb: 'Entry and exit sensors pulse when a car passes. Signs show FULL or SPACES.',
    inputs: [
      { addr: 'I0.0', name: 'Entry sensor', kind: 'sensor' },
      { addr: 'I0.1', name: 'Exit sensor', kind: 'sensor' },
      { addr: 'I0.2', name: 'RESET', kind: 'pb', color: 'black' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'FULL sign', color: 'red' },
      { addr: 'Q0.1', name: 'SPACES sign', color: 'green' },
    ],
    actions: [
      { id: 'enter', label: 'Car enters', run(st) { if (st.cars < 8) { st.cars++; st.ent = 300; } } },
      { id: 'leave', label: 'Car leaves', run(st) { if (st.cars > 0) { st.cars--; st.ex = 300; } } },
    ],
    init() { return { cars: 0, ent: 0, ex: 0, t: 0 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const o = devices(this, ctrl);
      o['I0.0'] = st.ent > 0 ? 1 : 0; o['I0.1'] = st.ex > 0 ? 1 : 0;
      st.ent = Math.max(0, st.ent - dt); st.ex = Math.max(0, st.ex - dt);
      return o;
    },
    draw(c, st, th, Q, I) {
      c.fillStyle = th.road; c.fillRect(150, 60, 460, 250);
      for (let i = 0; i < 8; i++) {
        const x = 170 + (i % 4) * 108, y = i < 4 ? 70 : 220;
        c.strokeStyle = th.roadLine; c.lineWidth = 2; c.strokeRect(x, y, 96, 80);
        if (i < st.cars) { c.fillStyle = th.carBody; D.rr(c, x + 18, y + 10, 60, 60, 10); c.fill(); c.fillStyle = th.carGlass; D.rr(c, x + 26, y + 18, 44, 18, 4); c.fill(); }
        D.text(c, String(i + 1), x + 10, y + 12, { size: 9, mono: true, color: th.roadLine });
      }
      c.fillStyle = th.road; c.fillRect(40, 160, 120, 50);
      D.sensorDot(c, th, 70, 150, !!I['I0.0'], 'entry I0.0', 'left');
      D.sensorDot(c, th, 70, 222, !!I['I0.1'], 'exit I0.1', 'left');
      c.fillStyle = th.bezel; D.rr(c, 16, 20, 120, 88, 8); c.fill();
      D.text(c, 'FULL', 76, 46, { size: 18, weight: 800, color: Q['Q0.0'] ? th.red : th.lampOff });
      D.text(c, 'SPACES', 76, 78, { size: 16, weight: 800, color: Q['Q0.1'] ? th.green : th.lampOff });
      D.text(c, st.cars + ' cars parked (real count)', 380, 340, { size: 11, mono: true, color: th.muted });
    },
  };

  // ───────────────────────── star-delta starter ─────────────────────────
  P.stardelta = {
    id: 'stardelta', name: 'Star-delta starter', blurb: 'Starts a big motor in star (low current), then switches to delta for full power.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'OL ok', kind: 'sensor', note: 'Overload relay: 1 = healthy' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'KM main', color: 'green' },
      { addr: 'Q0.1', name: 'KY star', color: 'amber' },
      { addr: 'Q0.2', name: 'KΔ delta', color: 'blue' },
      { addr: 'Q0.3', name: 'Fault lamp', color: 'red' },
    ],
    actions: [{ id: 'trip', label: 'Trip overload', toggle: true, run(st) { st.tripped = !st.tripped; } }],
    init() { return { speed: 0, ang: 0, amps: 0, tripped: false, fault: null, t: 0 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const km = Q['Q0.0'], ky = Q['Q0.1'], kd = Q['Q0.2'];
      if (ky && kd) st.fault = st.fault || 'Short circuit: star and delta contactors closed together.';
      if (km && kd && !ky && st.speed < 0.35) st.fault = st.fault || 'Started directly in delta: inrush current tripped the breaker.';
      const run = !st.fault && !st.tripped && km;
      const target = run && ky ? 0.85 : run && kd ? 1 : 0;
      st.speed += (target - st.speed) * Math.min(1, (dt / 1000) * (target > st.speed ? 0.9 : 0.6));
      st.amps = run ? (ky ? 18 + (0.85 - st.speed) * 40 : kd ? 30 + (1 - st.speed) * 120 : 0) : 0;
      st.ang += st.speed * dt * 0.012;
      const o = devices(this, ctrl);
      o['I0.2'] = st.tripped ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q) {
      D.contactor(c, th, 90, 70, 'KM', !!Q['Q0.0'], 'main Q0.0');
      D.contactor(c, th, 90, 160, 'KY', !!Q['Q0.1'], 'star Q0.1');
      D.contactor(c, th, 90, 250, 'KΔ', !!Q['Q0.2'], 'delta Q0.2');
      // windings diagram
      const cx = 290, cy = 160;
      c.lineWidth = 4;
      if (Q['Q0.1']) {
        c.strokeStyle = th.amber;
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60); c.stroke(); }
        D.text(c, 'STAR  Y', cx, cy + 90, { size: 13, weight: 700, color: th.amber });
      } else if (Q['Q0.2']) {
        c.strokeStyle = th.blue; c.beginPath();
        for (let i = 0; i <= 3; i++) { const a = -Math.PI / 2 + i * 2.094; const px = cx + Math.cos(a) * 60, py = cy + Math.sin(a) * 60; i ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke(); D.text(c, 'DELTA  Δ', cx, cy + 90, { size: 13, weight: 700, color: th.blue });
      } else { D.text(c, 'windings open', cx, cy, { size: 12, color: th.muted }); }
      // motor
      const mx = 500, my = 140;
      c.fillStyle = th.metal; c.beginPath(); c.arc(mx, my, 62, 0, 7); c.fill();
      c.save(); c.translate(mx, my); c.rotate(st.ang); c.fillStyle = th.metalDark;
      for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); D.rr(c, -5, 10, 10, 44, 4); c.fill(); } c.restore();
      D.text(c, Math.round(st.speed * 1480) + ' rpm', mx, my + 84, { size: 13, mono: true, weight: 700, color: th.ink });
      // ammeter
      const a = Math.min(st.amps, 150) / 150;
      c.strokeStyle = th.line; c.lineWidth = 8; c.beginPath(); c.arc(mx, 300, 36, Math.PI, 0); c.stroke();
      c.strokeStyle = a > 0.6 ? th.red : th.on; c.beginPath(); c.arc(mx, 300, 36, Math.PI, Math.PI + a * Math.PI); c.stroke();
      D.text(c, Math.round(st.amps) + ' A', mx, 292, { size: 12, mono: true, weight: 700, color: th.ink });
      D.lamp(c, th, 600, 40, 10, !!Q['Q0.3'], 'red', 'Fault', 'Q0.3');
      D.text(c, st.tripped ? 'OL TRIPPED' : '', 600, 100, { size: 10, mono: true, weight: 700, color: th.red });
      D.fault(c, th, st.fault);
    },
  };

  LL.PLANT_ORDER = ['panel', 'motor', 'conveyor', 'tank', 'traffic', 'cylinders', 'garage', 'parking', 'stardelta'];

  // ───────────────────────── automated test runner ─────────────────────────
  /* Test steps (strings):
   *   press A / release A / on A / off A      operate a device
   *   tap A [ms]                               press, wait, release, wait
   *   wait ms                                  run the PLC + machine
   *   action id                                something happens in the plant
   *   expect A=1 B=0 MW0=3                     check values now
   *   waitfor A=1 ms                           run until true (fail on timeout)
   *   order Q0.0+ Q0.1+ Q0.0- ms               output edges must happen in this order
   *   pulses A ms min max                      count rising edges over a window
   *   stays A=0 ms                             value must hold for the whole window
   */
  function runTest(prog, plantId, steps, opts) {
    opts = opts || {};
    const plant = P[plantId];
    const m = new LL.Machine(prog);
    const st = plant.init();
    const ctrl = {};
    const dt = 10;
    const never = opts.never || [];
    let t = 0, I = {};
    const name = (a) => (opts.tags && opts.tags[a] ? opts.tags[a] + ' (' + a + ')' : a);
    const val = (a) => (/^I/.test(a) ? (I[a] || 0) : m.read(a));
    const parseConds = (arr) => arr.map((s) => { const [a, v] = s.split('='); return { a: LL.norm(a), v: +v }; });
    const condOk = (cs) => cs.every((x) => val(x.a) === x.v);
    const fmt = (v, a) => (LL.isWordAddr(a) ? String(v) : v ? 'ON' : 'OFF');
    function tick() {
      I = plant.step(st, ctrl, m.outputs(), dt);
      m.setInputs(I);
      m.scan(dt);
      t += dt;
      if (st.fault) throw new Error('Machine fault: ' + st.fault);
      for (const n of never) if (condOk(parseConds(n.when.split(/\s+/)))) throw new Error(n.msg);
    }
    function run(ms) { for (let k = 0; k < ms / dt; k++) tick(); }
    tick();
    steps.forEach((step, idx) => {
      const p = step.trim().split(/\s+/);
      const cmd = p[0];
      const where = 'Step ' + (idx + 1) + ' (' + LL.describeStep(step, opts.tags) + '): ';
      try {
        switch (cmd) {
          case 'press': case 'on': ctrl[p[1]] = true; run(30); break;
          case 'release': case 'off': ctrl[p[1]] = false; run(30); break;
          case 'tap': ctrl[p[1]] = true; run(+(p[2] || 150)); ctrl[p[1]] = false; run(150); break;
          case 'wait': run(+p[1]); break;
          case 'action': { const a = plant.actions.find((x) => x.id === p[1]); a.run(st); run(20); break; }
          case 'expect': {
            parseConds(p.slice(1)).forEach((x) => { const v = val(x.a); if (v !== x.v) throw new Error('expected ' + name(x.a) + ' = ' + fmt(x.v, x.a) + ' but it is ' + fmt(v, x.a) + '.'); });
            break;
          }
          case 'waitfor': {
            const cs = parseConds(p.slice(1, -1)), lim = +p[p.length - 1];
            let w = 0;
            while (!condOk(cs)) { if (w >= lim) throw new Error('waited ' + lim / 1000 + ' s but it never happened.'); tick(); w += dt; }
            break;
          }
          case 'stays': {
            const cs = parseConds(p.slice(1, -1)), lim = +p[p.length - 1];
            for (let w = 0; w < lim; w += dt) { tick(); if (!condOk(cs)) throw new Error(cs.map((x) => name(x.a)).join(', ') + ' changed after ' + (w / 1000).toFixed(1) + ' s; it should have held.'); }
            break;
          }
          case 'order': {
            const want = p.slice(1, -1), lim = +p[p.length - 1];
            const addrs = [...new Set(want.map((s) => s.slice(0, -1)))];
            const prev = {}; addrs.forEach((a) => (prev[a] = val(a)));
            const got = [];
            for (let w = 0; w < lim && got.length < want.length; w += dt) {
              tick();
              addrs.forEach((a) => { const v = val(a); if (v !== prev[a]) { got.push(a + (v ? '+' : '-')); prev[a] = v; } });
            }
            for (let k = 0; k < want.length; k++) if (got[k] !== want[k]) {
              const pretty = (s) => (s ? name(s.slice(0, -1)) + (s.endsWith('+') ? ' ON' : ' OFF') : 'nothing');
              throw new Error('event ' + (k + 1) + ' should be ' + pretty(want[k]) + ' but was ' + pretty(got[k]) + '.');
            }
            break;
          }
          case 'pulses': {
            const a = p[1], win = +p[2], mn = +p[3], mx = +p[4];
            let n = 0, pv = val(a);
            for (let w = 0; w < win; w += dt) { tick(); const v = val(a); if (v && !pv) n++; pv = v; }
            if (n < mn || n > mx) throw new Error(name(a) + ' switched on ' + n + ' times in ' + win / 1000 + ' s; expected ' + (mn === mx ? mn : mn + '–' + mx) + '.');
            break;
          }
          default: throw new Error('unknown test step');
        }
      } catch (e) { e.message = where + e.message; e.step = idx; throw e; }
    });
    return true;
  }

  LL.describeStep = function (step, tags) {
    const p = step.trim().split(/\s+/);
    const n = (a) => (tags && tags[a] ? tags[a] : a);
    const cond = (s) => { const [a, v] = s.split('='); return n(a) + (LL.isWordAddr(a) ? ' = ' + v : v === '1' ? ' ON' : ' OFF'); };
    switch (p[0]) {
      case 'press': return 'press and hold ' + n(p[1]);
      case 'release': return 'release ' + n(p[1]);
      case 'on': return 'switch ' + n(p[1]) + ' on';
      case 'off': return 'switch ' + n(p[1]) + ' off';
      case 'tap': return 'tap ' + n(p[1]) + (p[2] ? ' for ' + (+p[2] / 1000) + ' s' : '');
      case 'wait': return 'wait ' + (+p[1] / 1000) + ' s';
      case 'action': return p[1];
      case 'expect': return 'check ' + p.slice(1).map(cond).join(', ');
      case 'waitfor': return 'wait up to ' + (+p[p.length - 1] / 1000) + ' s for ' + p.slice(1, -1).map(cond).join(', ');
      case 'stays': return p.slice(1, -1).map(cond).join(', ') + ' for ' + (+p[p.length - 1] / 1000) + ' s';
      case 'order': return 'sequence ' + p.slice(1, -1).map((s) => n(s.slice(0, -1)) + (s.endsWith('+') ? '↑' : '↓')).join(' → ');
      case 'pulses': return n(p[1]) + ' flashes ' + (p[3] === p[4] ? p[3] : p[3] + '–' + p[4]) + '× in ' + (+p[2] / 1000) + ' s';
    }
    return step;
  };

  LL.runChallenge = function (prog, ch) {
    const errs = LL.lint(prog).filter((x) => x.level === 'error');
    if (errs.length) return ch.tests.map((t, i) => ({ name: t.name, ok: false, msg: i === 0 ? 'Fix program errors first: rung ' + errs[0].rung + ': ' + errs[0].msg : 'Not run.' }));
    const tags = Object.assign({}, LL.plantTags(ch.plant), ch.tags || {});
    return ch.tests.map((t) => {
      try { runTest(prog, ch.plant, t.steps, { never: ch.never, tags }); return { name: t.name, ok: true }; }
      catch (e) { return { name: t.name, ok: false, msg: e.message }; }
    });
  };

  LL.plantTags = function (id) {
    const p = P[id], o = {};
    if (!p) return o;
    p.inputs.concat(p.outputs).forEach((x) => (o[x.addr] = x.name));
    return o;
  };
  LL.runTest = runTest;
})(typeof window !== 'undefined' ? window : globalThis);
