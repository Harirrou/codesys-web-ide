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

  // ───────────────────────── bottle filling line ─────────────────────────
  P.bottling = {
    id: 'bottling', name: 'Bottle filling line', blurb: 'Bottles ride a conveyor to a filler. A sensor sees a bottle in position; a level probe in the filler head says it is full.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Bottle in place', kind: 'sensor', note: '1 while a bottle stands under the filler' },
      { addr: 'I0.3', name: 'Bottle full', kind: 'sensor', note: '1 when the bottle under the filler is full' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Conveyor', color: 'green' },
      { addr: 'Q0.1', name: 'Fill valve', color: 'blue' },
      { addr: 'Q0.2', name: 'Running lamp', color: 'green' },
    ],
    actions: [],
    init() { return { b: [{ x: 0.25, l: 0 }, { x: 0, l: 0 }], off: 0, filled: 0, under: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      const at = st.b.find((b) => Math.abs(b.x - 0.5) < 0.012);
      if (Q['Q0.1']) {
        if (!at) st.fault = st.fault || 'Fill valve opened with no bottle under it: product spilled.';
        else { at.l += 0.5 * s; if (at.l > 1.15) st.fault = st.fault || 'Bottle overflowed: the valve stayed open after it was full.'; }
      }
      if (Q['Q0.0']) {
        if (Q['Q0.1'] && at) st.fault = st.fault || 'Conveyor moved while filling: product sprayed everywhere.';
        const v = 0.2 * s;
        st.off += v;
        st.b.forEach((b) => (b.x += v));
        st.b = st.b.filter((b) => { if (b.x > 1.03) { if (b.l >= 0.9) st.filled++; else st.under++; return false; } return true; });
        if (!st.b.length || Math.min(...st.b.map((b) => b.x)) >= 0.25) st.b.push({ x: 0, l: 0 });
      }
      const o = devices(this, ctrl);
      o['I0.2'] = at ? 1 : 0;
      o['I0.3'] = at && at.l >= 0.95 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x0 = 40, L = 560, y = 250;
      c.fillStyle = th.metalDark; D.rr(c, x0 - 14, y, L + 28, 20, 10); c.fill();
      c.strokeStyle = th.pipe; c.lineWidth = 2;
      for (let i = 0; i < 34; i++) { const xx = x0 + (((i / 34) + st.off) % 1) * L; c.beginPath(); c.moveTo(xx, y + 3); c.lineTo(xx - 5, y + 17); c.stroke(); }
      const fx = x0 + 0.5 * L;
      // filler head
      c.fillStyle = th.metal; D.rr(c, fx - 40, 40, 80, 50, 8); c.fill();
      c.fillStyle = Q['Q0.1'] ? th.blue : th.metalDark; c.fillRect(fx - 6, 90, 12, 46);
      if (Q['Q0.1']) { c.fillStyle = th.water; c.fillRect(fx - 3, 136, 6, 70); }
      D.text(c, 'FILLER', fx, 58, { size: 11, weight: 700, color: th.ink });
      D.text(c, 'Q0.1 valve', fx, 76, { size: 9, mono: true, color: th.muted });
      st.b.forEach((b) => {
        const bx = x0 + b.x * L, bw = 34, bh = 80;
        c.fillStyle = th.glass; D.rr(c, bx - bw / 2, y - bh, bw, bh, 8); c.fill();
        c.fillStyle = th.water; const lh = Math.min(1, b.l) * (bh - 14);
        D.rr(c, bx - bw / 2 + 3, y - lh - 3, bw - 6, lh, 5); c.fill();
        c.strokeStyle = th.metalDark; c.lineWidth = 2; D.rr(c, bx - bw / 2, y - bh, bw, bh, 8); c.stroke();
        c.fillStyle = th.metalDark; c.fillRect(bx - 8, y - bh - 10, 16, 10);
      });
      D.sensorDot(c, th, fx - 60, y - 30, !!I['I0.2'], 'I0.2 in place', 'left');
      D.sensorDot(c, th, fx + 56, 112, !!I['I0.3'], 'I0.3 full');
      D.lamp(c, th, 70, 60, 12, !!Q['Q0.2'], 'green', 'Running', 'Q0.2');
      D.text(c, 'filled ' + st.filled + '   under-filled ' + st.under, 600, 310, { size: 12, mono: true, weight: 600, color: st.under ? th.red : th.ink, align: 'right' });
      D.text(c, Q['Q0.0'] ? 'CONVEYOR →' : 'conveyor stopped', x0, 310, { size: 11, mono: true, weight: 600, color: Q['Q0.0'] ? th.on : th.muted, align: 'left' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── batch mixer ─────────────────────────
  P.mixer = {
    id: 'mixer', name: 'Batch mixer', blurb: 'A mixing vessel with two ingredient valves, a heater, a mixer and a drain. Each batch is checked for recipe, mixing time and temperature.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Level 40%', kind: 'sensor' },
      { addr: 'I0.3', name: 'Level 80%', kind: 'sensor' },
      { addr: 'I0.4', name: 'Not empty', kind: 'sensor', note: '1 while there is liquid in the vessel (> 3 %)' },
      { addr: 'I0.5', name: 'Temp ≥ 60 °C', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Valve A', color: 'blue' },
      { addr: 'Q0.1', name: 'Valve B', color: 'amber' },
      { addr: 'Q0.2', name: 'Mixer', color: 'green' },
      { addr: 'Q0.3', name: 'Heater', color: 'red' },
      { addr: 'Q0.4', name: 'Drain valve', color: 'blue' },
      { addr: 'Q0.5', name: 'Batch done', color: 'green' },
    ],
    actions: [],
    init() { return { a: 0, b: 0, temp: 20, mixT: 0, maxT: 20, ang: 0, draining: false, good: 0, bad: 0, last: '', t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      if (Q['Q0.0']) st.a += 0.1 * s;
      if (Q['Q0.1']) st.b += 0.1 * s;
      let lv = st.a + st.b;
      if (Q['Q0.4'] && lv > 0) {
        if (!st.draining) { st.draining = true; st.ratio = st.a / lv; st.vol = lv; }
        const k = Math.max(0, lv - 0.15 * s) / lv; st.a *= k; st.b *= k; lv = st.a + st.b;
      }
      if (!Q['Q0.4'] && st.draining && lv < 0.05) {
        st.draining = false;
        const why = [];
        if (st.vol < 0.75) why.push('too little product');
        if (Math.abs(st.ratio - 0.5) > 0.1) why.push('recipe ratio ' + Math.round(st.ratio * 100) + '/' + Math.round((1 - st.ratio) * 100) + ' instead of 50/50');
        if (st.mixT < 4000) why.push('mixed only ' + (st.mixT / 1000).toFixed(1) + ' s');
        if (st.maxT < 60) why.push('only heated to ' + Math.round(st.maxT) + ' °C');
        if (why.length) { st.bad++; st.last = 'Bad batch: ' + why.join(', '); } else { st.good++; st.last = 'Good batch'; }
        st.a = st.b = 0; st.mixT = 0; st.maxT = st.temp;
      }
      if (lv >= 1) { st.fault = st.fault || 'Vessel overflowed.'; }
      if (Q['Q0.3'] && lv <= 0.03) st.fault = st.fault || 'Heater switched on in an empty vessel: it burned out.';
      st.temp += (Q['Q0.3'] && lv > 0.03 ? 10 : -1.5) * s;
      st.temp = Math.max(20, st.temp);
      st.maxT = Math.max(st.maxT, st.temp);
      if (Q['Q0.2']) { st.ang += dt * 0.012; if (lv > 0.3) st.mixT += dt; }
      const o = devices(this, ctrl);
      o['I0.2'] = lv > 0.4 ? 1 : 0; o['I0.3'] = lv > 0.8 ? 1 : 0; o['I0.4'] = lv > 0.03 ? 1 : 0; o['I0.5'] = st.temp >= 60 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const tx = 230, ty = 70, tw = 180, tb = 280, H = tb - ty;
      const lv = Math.min(1, st.a + st.b);
      const mixCol = st.a + st.b > 0 ? (st.b / (st.a + st.b) > 0.5 ? th.amber : th.water) : th.water;
      c.fillStyle = mixCol; c.globalAlpha = 0.8; c.fillRect(tx, tb - lv * H, tw, lv * H); c.globalAlpha = 1;
      c.strokeStyle = th.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, tb); c.lineTo(tx + tw, tb); c.lineTo(tx + tw, ty); c.stroke();
      D.pipe(c, th, [[60, 30], [tx + 40, 30], [tx + 40, ty + 4]], !!Q['Q0.0'], st.t);
      D.pipe(c, th, [[580, 30], [tx + tw - 40, 30], [tx + tw - 40, ty + 4]], !!Q['Q0.1'], st.t);
      D.text(c, 'A  Q0.0', 70, 16, { size: 10, mono: true, color: th.blue, align: 'left' });
      D.text(c, 'B  Q0.1', 570, 16, { size: 10, mono: true, color: th.amber, align: 'right' });
      D.pipe(c, th, [[tx + tw / 2, tb], [tx + tw / 2, 320], [600, 320]], !!Q['Q0.4'] && lv > 0, st.t);
      D.text(c, 'drain Q0.4', tx + tw / 2 + 12, 306, { size: 10, mono: true, color: th.muted, align: 'left' });
      // mixer
      c.strokeStyle = th.metalDark; c.lineWidth = 4; c.beginPath(); c.moveTo(tx + tw / 2, ty - 20); c.lineTo(tx + tw / 2, tb - 30); c.stroke();
      c.fillStyle = Q['Q0.2'] ? th.on : th.metal; D.rr(c, tx + tw / 2 - 18, ty - 38, 36, 20, 4); c.fill();
      const w = Math.cos(st.ang) * 30; c.lineWidth = 6; c.beginPath(); c.moveTo(tx + tw / 2 - w, tb - 30); c.lineTo(tx + tw / 2 + w, tb - 30); c.stroke();
      // heater coil
      c.strokeStyle = Q['Q0.3'] ? th.red : th.metalDark; c.lineWidth = 3; c.beginPath();
      for (let i = 0; i <= 12; i++) c.lineTo(tx + 20 + i * 12, tb - 10 + (i % 2 ? -6 : 6)); c.stroke();
      D.sensorDot(c, th, tx - 20, tb - 0.8 * H, !!I['I0.3'], 'I0.3 80%', 'left');
      D.sensorDot(c, th, tx - 20, tb - 0.4 * H, !!I['I0.2'], 'I0.2 40%', 'left');
      D.sensorDot(c, th, tx - 20, tb - 0.03 * H - 6, !!I['I0.4'], 'I0.4 not empty', 'left');
      D.text(c, Math.round(st.temp) + ' °C', tx + tw + 50, 110, { size: 18, mono: true, weight: 700, color: st.temp >= 60 ? th.red : th.ink });
      D.sensorDot(c, th, tx + tw + 20, 136, !!I['I0.5'], 'I0.5 ≥ 60°C');
      D.text(c, Math.round(lv * 100) + ' %', tx + tw / 2, ty - 52, { size: 12, mono: true, weight: 700, color: th.ink });
      D.lamp(c, th, 560, 210, 12, !!Q['Q0.5'], 'green', 'Done', 'Q0.5');
      D.text(c, 'good ' + st.good + '  bad ' + st.bad, 20, 250, { size: 12, mono: true, weight: 700, color: st.bad ? th.red : th.ink, align: 'left' });
      if (st.last) D.text(c, st.last.length > 34 ? st.last.slice(0, 33) + '…' : st.last, 20, 270, { size: 10, color: st.last.startsWith('Good') ? th.on : th.red, align: 'left' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── elevator ─────────────────────────
  P.elevator = {
    id: 'elevator', name: '3-floor elevator', blurb: 'A lift car with up/down motor, a sensor at each floor, an automatic door and call buttons.',
    inputs: [
      { addr: 'I0.0', name: 'Call 1', kind: 'pb', color: 'black' },
      { addr: 'I0.1', name: 'Call 2', kind: 'pb', color: 'black' },
      { addr: 'I0.2', name: 'Call 3', kind: 'pb', color: 'black' },
      { addr: 'I0.3', name: 'At floor 1', kind: 'sensor' },
      { addr: 'I0.4', name: 'At floor 2', kind: 'sensor' },
      { addr: 'I0.5', name: 'At floor 3', kind: 'sensor' },
      { addr: 'I0.6', name: 'Door closed', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Motor UP', color: 'green' },
      { addr: 'Q0.1', name: 'Motor DOWN', color: 'blue' },
      { addr: 'Q0.2', name: 'Door open', color: 'amber' },
    ],
    actions: [],
    init() { return { pos: 0, door: 0, s1: 0, s2: 0, s3: 0, opened: false, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, up = Q['Q0.0'], dn = Q['Q0.1'];
      if (up && dn) st.fault = st.fault || 'Motor UP and DOWN energised together.';
      if ((up || dn) && st.door > 0.02) st.fault = st.fault || 'The car moved with the door open!';
      if (!st.fault) st.pos += ((up ? 1 : 0) - (dn ? 1 : 0)) * 0.5 * s;
      if (st.pos < -0.06) st.fault = st.fault || 'Car overran floor 1 into the pit.';
      if (st.pos > 2.06) st.fault = st.fault || 'Car overran floor 3 into the roof.';
      st.door = clamp(st.door + (Q['Q0.2'] ? 1 : -1) * s, 0, 1);
      const fl = [0, 1, 2].find((k) => Math.abs(st.pos - k) < 0.02);
      if (st.door >= 0.99 && !st.opened && fl != null) { st['s' + (fl + 1)]++; st.opened = true; }
      if (st.door < 0.5) st.opened = false;
      const o = devices(this, ctrl);
      [0, 1, 2].forEach((k) => (o['I0.' + (3 + k)] = fl === k ? 1 : 0));
      o['I0.6'] = st.door <= 0.02 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const sx = 250, sw = 140, top = 20, fh = 100;
      const yOf = (p) => top + (2 - p) * fh;
      c.fillStyle = th.inside; c.fillRect(sx, top, sw, fh * 3);
      for (let k = 0; k < 3; k++) {
        const y = yOf(k) + fh;
        c.fillStyle = th.wall; c.fillRect(sx - 160, y - 4, 160, 6); c.fillRect(sx + sw, y - 4, 160, 6);
        D.text(c, 'Floor ' + (k + 1), sx - 150, y - 20, { size: 12, weight: 700, color: th.ink, align: 'left' });
        D.sensorDot(c, th, sx + sw + 24, y - 50, !!I['I0.' + (3 + k)], 'I0.' + (3 + k));
        D.text(c, 'served ' + st['s' + (k + 1)], sx - 150, y - 40, { size: 10, mono: true, color: th.muted, align: 'left' });
      }
      const cy = yOf(st.pos);
      c.strokeStyle = th.metalDark; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + sw / 2, 0); c.lineTo(sx + sw / 2, cy + 6); c.stroke();
      c.fillStyle = th.metal; D.rr(c, sx + 12, cy + 6, sw - 24, fh - 10, 6); c.fill();
      const dw = (sw - 40) / 2 * (1 - st.door);
      c.fillStyle = th.door; c.fillRect(sx + 20, cy + 14, dw, fh - 26); c.fillRect(sx + sw - 20 - dw, cy + 14, dw, fh - 26);
      c.strokeStyle = th.metalDark; c.strokeRect(sx + 20, cy + 14, sw - 40, fh - 26);
      D.text(c, Q['Q0.0'] ? '▲' : Q['Q0.1'] ? '▼' : '', sx + sw / 2, cy - 8 + fh / 2, { size: 22, weight: 700, color: th.on });
      D.text(c, 'UP Q0.0', 560, 60, { size: 11, mono: true, weight: 700, color: Q['Q0.0'] ? th.on : th.muted });
      D.text(c, 'DOWN Q0.1', 560, 80, { size: 11, mono: true, weight: 700, color: Q['Q0.1'] ? th.on : th.muted });
      D.text(c, 'DOOR Q0.2', 560, 100, { size: 11, mono: true, weight: 700, color: Q['Q0.2'] ? th.amber : th.muted });
      D.sensorDot(c, th, 540, 124, !!I['I0.6'], 'I0.6 closed');
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── box sorter ─────────────────────────
  const SORT_PATTERN = [1, 0, 0, 1, 1, 0, 1, 0, 0, 1];
  P.sorter = {
    id: 'sorter', name: 'Box sorter', blurb: 'Boxes are measured at the check station (a low and a high photo-eye). Tall boxes must be pushed off at the pusher; short ones ride to the end.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Box at check', kind: 'sensor', note: 'Low photo-eye: any box' },
      { addr: 'I0.3', name: 'Tall box', kind: 'sensor', note: 'High photo-eye at the same spot: tall boxes only' },
      { addr: 'I0.4', name: 'Box at pusher', kind: 'sensor' },
      { addr: 'I0.5', name: 'Pusher out', kind: 'sensor' },
      { addr: 'I0.6', name: 'Pusher home', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Conveyor', color: 'green' },
      { addr: 'Q0.1', name: 'Pusher', color: 'amber' },
    ],
    actions: [],
    init() { return { b: [], n: 0, p: 0, off: 0, tallBin: 0, shortBin: 0, wrong: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      st.p = clamp(st.p + (Q['Q0.1'] ? 2 : -2) * s, 0, 1);
      if (st.p > 0.6) st.b = st.b.filter((b) => { if (Math.abs(b.x - 0.7) < 0.04) { if (b.tall) st.tallBin++; else st.wrong++; return false; } return true; });
      if (Q['Q0.0']) {
        if (st.p > 0.3 && st.b.some((b) => Math.abs(b.x - 0.7) < 0.07)) st.fault = st.fault || 'A box jammed against the extended pusher.';
        const v = 0.2 * s;
        st.off += v;
        st.b.forEach((b) => (b.x += v));
        st.b = st.b.filter((b) => { if (b.x > 1.03) { if (b.tall) st.wrong++; else st.shortBin++; return false; } return true; });
        if (!st.b.length || Math.min(...st.b.map((b) => b.x)) >= 0.45) st.b.push({ x: 0, tall: SORT_PATTERN[st.n++ % SORT_PATTERN.length] });
      }
      const o = devices(this, ctrl);
      const chk = st.b.find((b) => Math.abs(b.x - 0.3) < 0.035);
      o['I0.2'] = chk ? 1 : 0;
      o['I0.3'] = chk && chk.tall ? 1 : 0;
      o['I0.4'] = st.b.some((b) => Math.abs(b.x - 0.7) < 0.012) ? 1 : 0;
      o['I0.5'] = st.p > 0.97 ? 1 : 0;
      o['I0.6'] = st.p < 0.03 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x0 = 40, L = 520, y = 220;
      c.fillStyle = th.metalDark; D.rr(c, x0 - 14, y, L + 28, 20, 10); c.fill();
      c.strokeStyle = th.pipe; c.lineWidth = 2;
      for (let i = 0; i < 30; i++) { const xx = x0 + (((i / 30) + st.off) % 1) * L; c.beginPath(); c.moveTo(xx, y + 3); c.lineTo(xx - 5, y + 17); c.stroke(); }
      st.b.forEach((b) => {
        const bx = x0 + b.x * L, bw = 0.07 * L, bh = b.tall ? 70 : 34;
        c.fillStyle = th.box; D.rr(c, bx - bw / 2, y - bh, bw, bh, 3); c.fill(); c.strokeStyle = th.boxEdge; c.lineWidth = 1.5; c.stroke();
      });
      const cx = x0 + 0.3 * L;
      c.strokeStyle = 'rgba(239,68,68,.45)'; c.setLineDash([4, 4]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx, y - 20); c.lineTo(cx, y - 6); c.moveTo(cx, y - 62); c.lineTo(cx, y - 48); c.stroke(); c.setLineDash([]);
      D.sensorDot(c, th, cx - 18, y - 14, !!I['I0.2'], 'I0.2 low', 'left');
      D.sensorDot(c, th, cx - 18, y - 56, !!I['I0.3'], 'I0.3 tall', 'left');
      const px = x0 + 0.7 * L;
      D.sensorDot(c, th, px - 18, y - 90, !!I['I0.4'], 'I0.4', 'left');
      // pusher from the back (top of drawing) pushing down off the belt
      c.fillStyle = th.metal; D.rr(c, px - 26, 40, 52, 40, 6); c.fill();
      c.fillStyle = Q['Q0.1'] ? th.amber : th.metalDark; c.fillRect(px - 5, 80, 10, 20 + st.p * 70);
      c.fillStyle = th.metalDark; D.rr(c, px - 22, 96 + st.p * 70, 44, 10, 3); c.fill();
      D.text(c, 'Pusher Q0.1', px + 34, 52, { size: 10, mono: true, color: th.muted, align: 'left' });
      D.sensorDot(c, th, px + 40, 70, !!I['I0.6'], 'home I0.6');
      D.sensorDot(c, th, px + 40, 92, !!I['I0.5'], 'out I0.5');
      D.text(c, 'tall bin ' + st.tallBin + '   short ' + st.shortBin + '   wrong ' + st.wrong, x0, 300, { size: 12, mono: true, weight: 600, color: st.wrong ? th.red : th.ink, align: 'left' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── car wash ─────────────────────────
  P.carwash = {
    id: 'carwash', name: 'Automatic car wash', blurb: 'A wash bay with a travelling gantry (soap, brushes, rinse) and a dryer. Each car that leaves is inspected: soap, brushes and rinse must cover the whole car, then at least 3 s of drying.',
    inputs: [
      { addr: 'I0.0', name: 'START (coin)', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Car in position', kind: 'sensor' },
      { addr: 'I0.3', name: 'Gantry home', kind: 'sensor', note: 'Front end of travel' },
      { addr: 'I0.4', name: 'Gantry at end', kind: 'sensor', note: 'Back end of travel' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Gantry forward', color: 'green' },
      { addr: 'Q0.1', name: 'Gantry back', color: 'blue' },
      { addr: 'Q0.2', name: 'Soap spray', color: 'white' },
      { addr: 'Q0.3', name: 'Brushes', color: 'blue' },
      { addr: 'Q0.4', name: 'Rinse', color: 'blue' },
      { addr: 'Q0.5', name: 'Dryer', color: 'amber' },
      { addr: 'Q0.6', name: 'Green light', color: 'green' },
      { addr: 'Q0.7', name: 'Red light', color: 'red' },
    ],
    actions: [
      { id: 'in', label: 'Car drives in', run(st) { if (st.car === 'none') { st.car = 'entering'; st.ct = 0; } } },
      { id: 'out', label: 'Car drives out', run(st) { if (st.car === 'in') { st.car = 'leaving'; st.ct = 0; st.checkOut = true; } } },
    ],
    init() { return { g: 0, car: 'none', ct: 0, soap: {}, brush: {}, rinse: {}, dry: 0, clean: 0, dirty: 0, last: '', stall: 0, ang: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, f = Q['Q0.0'], b = Q['Q0.1'];
      const busy = f || b || Q['Q0.2'] || Q['Q0.3'] || Q['Q0.4'] || Q['Q0.5'];
      if (f && b) st.fault = st.fault || 'Gantry driven forward and back at the same time.';
      if (st.checkOut) {
        st.checkOut = false;
        if (busy || st.g > 0.03) st.fault = st.fault || 'The car drove out while the wash was still running!';
        const cov = (o) => Object.keys(o).length / 20;
        const why = [];
        if (cov(st.soap) < 0.9) why.push('soap ' + Math.round(cov(st.soap) * 100) + '%');
        if (cov(st.brush) < 0.9) why.push('brushes ' + Math.round(cov(st.brush) * 100) + '%');
        if (cov(st.rinse) < 0.9) why.push('rinse ' + Math.round(cov(st.rinse) * 100) + '%');
        if (st.dry < 3000) why.push('dried ' + (st.dry / 1000).toFixed(1) + ' s');
        if (why.length) { st.dirty++; st.last = 'Dirty car: ' + why.join(', '); } else { st.clean++; st.last = 'Clean car'; }
        st.soap = {}; st.brush = {}; st.rinse = {}; st.dry = 0;
      }
      if (st.car === 'entering' || st.car === 'leaving') { st.ct += dt; if (st.ct >= 1500) st.car = st.car === 'entering' ? 'in' : 'none'; }
      const carIn = st.car === 'in';
      if ((Q['Q0.2'] || Q['Q0.4']) && !carIn) st.fault = st.fault || 'Sprayed water into a bay with no car in position.';
      if (!st.fault) st.g = clamp(st.g + ((f ? 1 : 0) - (b ? 1 : 0)) * 0.25 * s, 0, 1);
      if ((f && st.g >= 1) || (b && st.g <= 0)) st.stall += dt; else st.stall = 0;
      if (st.stall > 1000) st.fault = st.fault || 'Gantry motor stalled at the end of travel. Stop it with the limit switch.';
      const seg = Math.min(19, Math.floor(st.g * 20));
      if (carIn && (f || b)) { if (Q['Q0.2']) st.soap[seg] = 1; if (Q['Q0.3']) st.brush[seg] = 1; if (Q['Q0.4']) st.rinse[seg] = 1; }
      if (carIn && Q['Q0.5']) st.dry += dt;
      if (Q['Q0.3']) st.ang += dt * 0.02;
      const o = devices(this, ctrl);
      o['I0.2'] = carIn ? 1 : 0; o['I0.3'] = st.g <= 0.01 ? 1 : 0; o['I0.4'] = st.g >= 0.99 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const bx = 120, bw = 400, gy = 270;
      c.fillStyle = th.ground; c.fillRect(0, gy, 640, 10);
      c.fillStyle = th.wall; c.fillRect(bx - 10, 40, 10, gy - 40); c.fillRect(bx + bw, 40, 10, gy - 40); c.fillRect(bx - 10, 30, bw + 20, 12);
      // car
      let cx = null;
      if (st.car === 'in') cx = bx + bw / 2;
      else if (st.car === 'entering') cx = -80 + (bx + bw / 2 + 80) * (st.ct / 1500);
      else if (st.car === 'leaving') cx = bx + bw / 2 + (st.ct / 1500) * 420;
      if (cx != null) {
        c.fillStyle = th.carBody; D.rr(c, cx - 110, gy - 56, 220, 40, 12); c.fill(); D.rr(c, cx - 60, gy - 86, 120, 34, 12); c.fill();
        c.fillStyle = th.carGlass; D.rr(c, cx - 50, gy - 80, 44, 24, 5); c.fill(); D.rr(c, cx + 4, gy - 80, 44, 24, 5); c.fill();
        c.fillStyle = th.knob; c.beginPath(); c.arc(cx - 66, gy - 14, 14, 0, 7); c.arc(cx + 66, gy - 14, 14, 0, 7); c.fill();
      }
      // gantry
      const gx = bx + 20 + st.g * (bw - 40);
      c.fillStyle = th.metal; c.fillRect(gx - 16, 42, 32, 12); c.fillRect(gx - 16, 42, 8, gy - 42); c.fillRect(gx + 8, 42, 8, gy - 42);
      if (Q['Q0.3']) { c.strokeStyle = th.blue; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const y = 70 + i * 32; c.beginPath(); c.moveTo(gx - 8, y + Math.sin(st.ang + i) * 6); c.lineTo(gx + 8, y - Math.sin(st.ang + i) * 6); c.stroke(); } }
      if (Q['Q0.2'] || Q['Q0.4']) { c.fillStyle = Q['Q0.2'] ? 'rgba(255,255,255,.75)' : th.water; for (let i = 0; i < 18; i++) { const yy = 60 + ((i * 37 + st.t * 0.2) % (gy - 70)); c.beginPath(); c.arc(gx + ((i % 3) - 1) * 10, yy, 2.5, 0, 7); c.fill(); } }
      if (Q['Q0.5']) { c.fillStyle = th.amber; D.rr(c, bx + bw / 2 - 30, 46, 60, 14, 4); c.fill(); D.text(c, '≋ DRYER ≋', bx + bw / 2, 72, { size: 10, mono: true, weight: 700, color: th.amber }); }
      D.sensorDot(c, th, bx + 20, gy + 26, !!I['I0.3'], 'home I0.3');
      D.sensorDot(c, th, bx + bw - 90, gy + 26, !!I['I0.4'], 'end I0.4');
      D.sensorDot(c, th, bx + bw / 2 - 40, gy + 26, !!I['I0.2'], 'car I0.2');
      D.lamp(c, th, 40, 70, 12, !!Q['Q0.6'], 'green', 'GO', 'Q0.6');
      D.lamp(c, th, 40, 140, 12, !!Q['Q0.7'], 'red', 'WAIT', 'Q0.7');
      D.text(c, 'clean ' + st.clean + '  dirty ' + st.dirty, 630, 20, { size: 12, mono: true, weight: 700, color: st.dirty ? th.red : th.ink, align: 'right' });
      if (st.last) D.text(c, st.last.length > 40 ? st.last.slice(0, 39) + '…' : st.last, 630, 300, { size: 10, color: st.last.startsWith('Clean') ? th.on : th.red, align: 'right' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── pump station ─────────────────────────
  P.pumps = {
    id: 'pumps', name: 'Two-pump station', blurb: 'A wastewater sump with two identical pumps. One pump normally does the work (duty), the other is standby. Level switches at 20 %, 70 % and 85 %.',
    inputs: [
      { addr: 'I0.0', name: 'AUTO', kind: 'sw' },
      { addr: 'I0.1', name: 'Level > 20%', kind: 'sensor', note: 'Low switch: pumps may run while this is 1' },
      { addr: 'I0.2', name: 'Level > 70%', kind: 'sensor', note: 'High switch: start the duty pump' },
      { addr: 'I0.3', name: 'Level > 85%', kind: 'sensor', note: 'High-high switch: alarm, start standby' },
      { addr: 'I0.4', name: 'Pump 1 OK', kind: 'sensor', note: '0 when pump 1 has tripped' },
      { addr: 'I0.5', name: 'Pump 2 OK', kind: 'sensor', note: '0 when pump 2 has tripped' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Pump 1', color: 'green' },
      { addr: 'Q0.1', name: 'Pump 2', color: 'green' },
      { addr: 'Q0.2', name: 'High-level alarm', color: 'red' },
    ],
    actions: [
      { id: 'storm', label: 'Storm inflow', toggle: true, run(st) { st.storm = !st.storm; } },
      { id: 'trip1', label: 'Trip pump 1', toggle: true, run(st) { st.trip1 = !st.trip1; } },
      { id: 'trip2', label: 'Trip pump 2', toggle: true, run(st) { st.trip2 = !st.trip2; } },
    ],
    init() { return { level: 0.5, storm: false, trip1: false, trip2: false, p1Starts: 0, p2Starts: 0, r1: 0, r2: 0, both: 0, a1: 0, a2: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      const r1 = Q['Q0.0'] && !st.trip1 ? 1 : 0, r2 = Q['Q0.1'] && !st.trip2 ? 1 : 0;
      if (r1 && !st.r1) st.p1Starts++;
      if (r2 && !st.r2) st.p2Starts++;
      st.r1 = r1; st.r2 = r2;
      if (r1 && r2) st.both = 1;
      st.level += ((st.storm ? 0.16 : 0.06) - 0.1 * (r1 + r2)) * s;
      if (st.level >= 1) { st.level = 1; st.fault = st.fault || 'The sump overflowed: sewage in the street!'; }
      if ((r1 || r2) && st.level < 0.05) st.fault = st.fault || 'A pump ran dry and was damaged.';
      st.level = clamp(st.level, 0, 1);
      if (r1) st.a1 += dt * 0.02; if (r2) st.a2 += dt * 0.02;
      const o = devices(this, ctrl);
      o['I0.1'] = st.level > 0.2 ? 1 : 0; o['I0.2'] = st.level > 0.7 ? 1 : 0; o['I0.3'] = st.level > 0.85 ? 1 : 0;
      o['I0.4'] = st.trip1 ? 0 : 1; o['I0.5'] = st.trip2 ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q, I) {
      const tx = 200, ty = 40, tw = 240, tb = 290, H = tb - ty;
      c.fillStyle = th.water; c.globalAlpha = 0.75; c.fillRect(tx, tb - st.level * H, tw, st.level * H); c.globalAlpha = 1;
      c.strokeStyle = th.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, tb); c.lineTo(tx + tw, tb); c.lineTo(tx + tw, ty); c.stroke();
      [[0.85, 'I0.3', '85%'], [0.7, 'I0.2', '70%'], [0.2, 'I0.1', '20%']].forEach(([lv, a, l]) => D.sensorDot(c, th, tx - 20, tb - lv * H, !!I[a], a + ' ' + l, 'left'));
      D.pipe(c, th, [[20, 60], [tx + 20, 60], [tx + 20, ty + 6]], true, st.t * (st.storm ? 2.5 : 1));
      D.text(c, st.storm ? 'STORM inflow' : 'inflow', 20, 46, { size: 10, mono: true, weight: 700, color: st.storm ? th.red : th.muted, align: 'left' });
      [[1, tx + 70], [2, tx + 170]].forEach(([n, x]) => {
        const run = n === 1 ? st.r1 : st.r2, trip = n === 1 ? st.trip1 : st.trip2;
        c.fillStyle = trip ? th.red : run ? th.on : th.metal; c.beginPath(); c.arc(x, tb - 24, 18, 0, 7); c.fill();
        c.save(); c.translate(x, tb - 24); c.rotate(n === 1 ? st.a1 : st.a2); c.fillStyle = th.metalDark; c.fillRect(-2, -14, 4, 28); c.fillRect(-14, -2, 28, 4); c.restore();
        D.pipe(c, th, [[x, tb - 42], [x, 20], [620, 20]], !!run, st.t);
        D.text(c, 'P' + n + (trip ? ' TRIPPED' : ''), x, tb + 16, { size: 11, weight: 700, color: trip ? th.red : th.ink });
        D.text(c, 'starts ' + (n === 1 ? st.p1Starts : st.p2Starts), x, tb + 32, { size: 10, mono: true, color: th.muted });
      });
      D.lamp(c, th, 560, 120, 12, !!Q['Q0.2'] && st.t % 600 < 400, 'red', 'Alarm', 'Q0.2');
      D.text(c, Math.round(st.level * 100) + ' %', tx + tw / 2, ty + 20, { size: 16, mono: true, weight: 700, color: th.ink });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── analog tank ─────────────────────────
  P.atank = {
    id: 'atank', name: 'Analog level tank', blurb: 'A level transmitter sends 4–20 mA (read as AIW0 = 6400…32000). A control valve opens 0–100 % from AQW0 = 0…32000. Water is drawn off continuously.',
    inputs: [
      { addr: 'I0.0', name: 'AUTO', kind: 'sw' },
      { addr: 'AIW0', name: 'Level transmitter', kind: 'sensor', note: '4–20 mA: 0 % = 6400, 100 % = 32000' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'High alarm', color: 'red' },
      { addr: 'Q0.1', name: 'Low alarm', color: 'amber' },
      { addr: 'AQW0', name: 'Inlet valve', color: 'blue' },
    ],
    actions: [
      { id: 'bypass', label: 'Manual bypass fill', toggle: true, run(st) { st.bypass = !st.bypass; } },
      { id: 'demand', label: 'High demand', toggle: true, run(st) { st.hi = !st.hi; } },
    ],
    init() { return { level: 0.205, valve: 0, bypass: false, hi: false, hist: [], ht: 0, lvlPct: 21, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      const cmd = clamp((Q['AQW0'] || 0) / 32000, 0, 1);
      st.valve += (cmd - st.valve) * Math.min(1, s * 3);
      const inflow = 0.12 * st.valve + (st.bypass ? 0.1 : 0);
      st.level += (inflow - (st.level > 0 ? (st.hi ? 0.08 : 0.05) : 0)) * s;
      if (st.level >= 1) { st.level = 1; if (inflow > 0.01) st.fault = st.fault || 'Tank overflowed.'; }
      st.level = clamp(st.level, 0, 1);
      st.lvlPct = Math.round(st.level * 100);
      st.ht += dt; if (st.ht >= 200) { st.ht = 0; st.hist.push(st.level); if (st.hist.length > 120) st.hist.shift(); }
      const o = devices(this, ctrl);
      o['AIW0'] = Math.round(6400 + st.level * 25600);
      return o;
    },
    draw(c, st, th, Q, I) {
      const tx = 60, ty = 50, tw = 130, tb = 290, H = tb - ty;
      c.fillStyle = th.water; c.globalAlpha = 0.8; c.fillRect(tx, tb - st.level * H, tw, st.level * H); c.globalAlpha = 1;
      c.strokeStyle = th.ink; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, tb); c.lineTo(tx + tw, tb); c.lineTo(tx + tw, ty); c.stroke();
      D.pipe(c, th, [[tx + 30, ty - 30], [tx + 30, ty + 4]], st.valve > 0.02, st.t);
      c.fillStyle = th.blue; D.rr(c, tx + 14, ty - 44, 32, 16, 3); c.fill();
      D.text(c, 'valve ' + Math.round(st.valve * 100) + '%', tx + 54, ty - 36, { size: 11, mono: true, weight: 700, color: th.ink, align: 'left' });
      D.text(c, 'AQW0 = ' + (Q['AQW0'] || 0), tx + 54, ty - 20, { size: 10, mono: true, color: th.muted, align: 'left' });
      // transmitter
      const ma = 4 + 16 * st.level;
      c.fillStyle = th.panel2; D.rr(c, tx + tw + 12, 120, 86, 56, 6); c.fill(); c.strokeStyle = th.line; c.lineWidth = 1; c.stroke();
      D.text(c, 'LT 101', tx + tw + 55, 134, { size: 10, weight: 700, color: th.muted });
      D.text(c, ma.toFixed(2) + ' mA', tx + tw + 55, 152, { size: 13, mono: true, weight: 700, color: th.ink });
      D.text(c, 'AIW0 ' + (I['AIW0'] || 0), tx + tw + 55, 168, { size: 10, mono: true, color: th.muted });
      D.text(c, st.lvlPct + ' %', tx + tw / 2, tb - st.level * H - 12, { size: 13, mono: true, weight: 700, color: th.ink });
      // trend
      const gx = 320, gy = 50, gw = 290, gh = 200;
      c.fillStyle = th.panel; D.rr(c, gx, gy, gw, gh, 8); c.fill(); c.strokeStyle = th.line; c.stroke();
      [0, 25, 50, 75, 100].forEach((v) => { const y = gy + gh - (v / 100) * gh; c.strokeStyle = th.line; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(gx, y); c.lineTo(gx + gw, y); c.stroke(); c.globalAlpha = 1; D.text(c, v + '', gx - 6, y, { size: 9, mono: true, color: th.muted, align: 'right' }); });
      c.setLineDash([6, 5]); c.strokeStyle = th.amber; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx, gy + gh / 2); c.lineTo(gx + gw, gy + gh / 2); c.stroke(); c.setLineDash([]);
      D.text(c, 'setpoint 50 %', gx + gw - 6, gy + gh / 2 - 10, { size: 9, mono: true, color: th.amber, align: 'right' });
      c.strokeStyle = th.water; c.lineWidth = 2.5; c.beginPath();
      st.hist.forEach((v, i) => { const x = gx + (i / 119) * gw, y = gy + gh - v * gh; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      D.text(c, 'level trend · last 24 s', gx + 8, gy + 12, { size: 10, weight: 600, color: th.muted, align: 'left' });
      D.lamp(c, th, 380, 290, 10, !!Q['Q0.0'], 'red', 'High', 'Q0.0');
      D.lamp(c, th, 460, 290, 10, !!Q['Q0.1'], 'amber', 'Low', 'Q0.1');
      D.text(c, (st.bypass ? 'BYPASS ' : '') + (st.hi ? 'HIGH DEMAND' : ''), 600, 290, { size: 10, mono: true, weight: 700, color: th.red, align: 'right' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── drilling station ─────────────────────────
  P.drill = {
    id: 'drill', name: 'Drilling station', blurb: 'A part is clamped, drilled with a spindle on a feed slide, and ejected. Drilling needs the spindle running and the part clamped.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Part present', kind: 'sensor' },
      { addr: 'I0.3', name: 'Clamped', kind: 'sensor' },
      { addr: 'I0.4', name: 'Drill up', kind: 'sensor', note: 'Top limit of the feed slide' },
      { addr: 'I0.5', name: 'Drill down', kind: 'sensor', note: 'Bottom limit: hole depth reached' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Clamp', color: 'blue' },
      { addr: 'Q0.1', name: 'Spindle', color: 'green' },
      { addr: 'Q0.2', name: 'Feed down', color: 'amber' },
      { addr: 'Q0.3', name: 'Feed up', color: 'amber' },
      { addr: 'Q0.4', name: 'Ejector', color: 'blue' },
      { addr: 'Q0.5', name: 'Cycle lamp', color: 'green' },
    ],
    actions: [{ id: 'load', label: 'Load a part', run(st) { if (!st.part) { st.part = true; st.drilled = false; } } }],
    init() { return { part: true, drilled: false, clamp: 0, z: 0, ej: 0, ejT: 0, ang: 0, good: 0, bad: 0, stall: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      const dn = Q['Q0.2'], up = Q['Q0.3'];
      if (dn && up) st.fault = st.fault || 'Feed down and feed up together.';
      st.clamp = clamp(st.clamp + (Q['Q0.0'] ? 2 : -2) * s, 0, 1);
      if (!st.fault) st.z = clamp(st.z + ((dn ? 0.25 : 0) - (up ? 0.5 : 0)) * s, 0, 1);
      if (dn && st.z >= 1) st.stall += dt; else st.stall = 0;
      if (st.stall > 500) st.fault = st.fault || 'Feed kept pushing at the bottom: use the "drill down" limit switch.';
      if (st.z > 0.4 && st.part && dn) {
        if (!Q['Q0.1']) st.fault = st.fault || 'Drill bit broke: it fed into the part without the spindle running.';
        if (st.clamp < 0.97) st.fault = st.fault || 'The part spun loose: it was not clamped while drilling.';
      }
      if (st.z >= 0.98 && st.part && Q['Q0.1']) st.drilled = true;
      if (Q['Q0.4']) {
        if (st.clamp > 0.05 && st.part) st.fault = st.fault || 'The ejector hit a part that was still clamped.';
        if (st.z > 0.05) st.fault = st.fault || 'The ejector hit the drill: retract it first.';
        st.ejT += dt;
        if (st.ejT >= 300 && st.part) { st.part = false; if (st.drilled) st.good++; else st.bad++; }
      } else st.ejT = 0;
      st.ej += ((Q['Q0.4'] ? 1 : 0) - st.ej) * Math.min(1, s * 8);
      if (Q['Q0.1']) st.ang += dt * 0.05;
      const o = devices(this, ctrl);
      o['I0.2'] = st.part ? 1 : 0; o['I0.3'] = st.part && st.clamp > 0.97 ? 1 : 0;
      o['I0.4'] = st.z <= 0.01 ? 1 : 0; o['I0.5'] = st.z >= 0.99 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const tx = 180, ty = 250;
      c.fillStyle = th.metalDark; c.fillRect(tx - 60, ty, 300, 18);
      c.fillStyle = th.metal; c.fillRect(tx + 160, 30, 26, ty - 30);
      // drill head
      const hy = 60 + st.z * 110;
      c.fillStyle = Q['Q0.1'] ? th.on : th.metal; D.rr(c, tx + 40, hy, 120, 46, 6); c.fill();
      D.text(c, 'SPINDLE', tx + 100, hy + 23, { size: 11, weight: 700, color: Q['Q0.1'] ? th.onInk : th.ink });
      c.fillStyle = th.metalDark; c.fillRect(tx + 94, hy + 46, 12, 40);
      c.save(); c.translate(tx + 100, hy + 92); c.strokeStyle = th.ink; c.lineWidth = 3; c.beginPath();
      for (let i = 0; i < 4; i++) { c.moveTo(-5, i * 8); c.lineTo(5, i * 8 + 4 * Math.sin(st.ang + i)); } c.stroke(); c.restore();
      // part
      if (st.part) {
        const ex = st.ej * 160;
        c.fillStyle = th.box; D.rr(c, tx + 50 + ex, ty - 50, 100, 50, 4); c.fill(); c.strokeStyle = th.boxEdge; c.lineWidth = 1.5; c.stroke();
        if (st.drilled) { c.fillStyle = th.inside; c.fillRect(tx + 94 + ex, ty - 50, 12, 40); }
      }
      // clamp
      c.fillStyle = Q['Q0.0'] ? th.blue : th.metal; c.fillRect(tx - 40 + st.clamp * 88, ty - 40, 14, 30);
      c.fillStyle = th.metalDark; c.fillRect(tx - 60, ty - 30, 20 + st.clamp * 88, 10);
      // ejector
      c.fillStyle = Q['Q0.4'] ? th.amber : th.metal; c.fillRect(tx - 60 + st.ej * 100, ty - 22, 16, 18);
      D.sensorDot(c, th, tx + 210, 70, !!I['I0.4'], 'up I0.4');
      D.sensorDot(c, th, tx + 210, 180, !!I['I0.5'], 'down I0.5');
      D.sensorDot(c, th, tx + 60, ty + 34, !!I['I0.2'], 'part I0.2');
      D.sensorDot(c, th, tx - 50, ty - 60, !!I['I0.3'], 'clamped I0.3');
      D.lamp(c, th, 50, 60, 12, !!Q['Q0.5'], 'green', 'Cycle', 'Q0.5');
      D.text(c, 'good ' + st.good + '  bad ' + st.bad, 620, 300, { size: 12, mono: true, weight: 700, color: st.bad ? th.red : th.ink, align: 'right' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── industrial oven ─────────────────────────
  P.oven = {
    id: 'oven', name: 'Industrial oven', blurb: 'A baking oven with heater, circulation fan and door switch. Two thermostats: 170 °C and 180 °C. Each tray taken out is checked: 10 s at baking temperature, never above 205 °C.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Door closed', kind: 'sensor' },
      { addr: 'I0.3', name: 'Temp ≥ 180 °C', kind: 'sensor' },
      { addr: 'I0.4', name: 'Temp ≥ 170 °C', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Heater', color: 'red' },
      { addr: 'Q0.1', name: 'Fan', color: 'blue' },
      { addr: 'Q0.2', name: 'Baking lamp', color: 'amber' },
      { addr: 'Q0.3', name: 'Buzzer', color: 'green' },
    ],
    actions: [{ id: 'door', label: 'Open / close door', toggle: true, run(st) { st.open = !st.open; if (st.open) st.check = true; } }],
    init() { return { temp: 20, open: false, bakeT: 0, maxT: 20, noFan: 0, good: 0, bad: 0, last: '', ang: 0, check: false, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      if (Q['Q0.0'] && st.open) { st.openHeat = (st.openHeat || 0) + dt; if (st.openHeat > 200) st.fault = st.fault || 'Heater on with the door open: the operator got burned.'; } else st.openHeat = 0;
      if (Q['Q0.0'] && !Q['Q0.1']) { st.noFan += dt; if (st.noFan > 2000) st.fault = st.fault || 'Heater element overheated: the fan must run whenever the heater is on.'; } else st.noFan = 0;
      st.temp += ((Q['Q0.0'] ? 25 : 0) - (st.temp - 20) * (st.open ? 0.3 : 0.04)) * s;
      if (st.temp > 250) st.fault = st.fault || 'Oven overheated.';
      st.maxT = Math.max(st.maxT, st.temp);
      if (!st.open && st.temp >= 165) st.bakeT += dt;
      if (st.check) {
        st.check = false;
        if (st.bakeT > 500 || st.maxT > 100) {
          const why = [];
          if (st.bakeT < 9500) why.push('under-baked (' + (st.bakeT / 1000).toFixed(1) + ' s)');
          if (st.maxT > 205) why.push('burned (' + Math.round(st.maxT) + ' °C)');
          if (why.length) { st.bad++; st.last = 'Bad tray: ' + why.join(', '); } else { st.good++; st.last = 'Good tray'; }
        }
        st.bakeT = 0; st.maxT = st.temp;
      }
      if (Q['Q0.1']) st.ang += dt * 0.03;
      const o = devices(this, ctrl);
      o['I0.2'] = st.open ? 0 : 1; o['I0.3'] = st.temp >= 180 ? 1 : 0; o['I0.4'] = st.temp >= 170 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const ox = 150, oy = 40, ow = 300, oh = 230;
      c.fillStyle = th.metal; D.rr(c, ox, oy, ow, oh, 12); c.fill();
      const glow = Math.max(0, Math.min(1, (st.temp - 20) / 200));
      c.fillStyle = th.inside; D.rr(c, ox + 20, oy + 20, ow - 40, oh - 40, 8); c.fill();
      c.fillStyle = 'rgba(255,120,30,' + (glow * 0.55).toFixed(2) + ')'; D.rr(c, ox + 20, oy + 20, ow - 40, oh - 40, 8); c.fill();
      c.strokeStyle = Q['Q0.0'] ? th.red : th.metalDark; c.lineWidth = 4; c.beginPath();
      for (let i = 0; i <= 14; i++) c.lineTo(ox + 40 + i * 16, oy + oh - 40 + (i % 2 ? -8 : 8)); c.stroke();
      c.save(); c.translate(ox + ow / 2, oy + 70); c.rotate(st.ang); c.fillStyle = th.metalDark; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); D.rr(c, -4, 0, 8, 26, 4); c.fill(); } c.restore();
      c.fillStyle = th.box; D.rr(c, ox + 90, oy + 120, 120, 26, 6); c.fill();
      if (st.open) { c.fillStyle = th.door; c.globalAlpha = 0.9; c.fillRect(ox + ow, oy + 10, 60, oh - 20); c.globalAlpha = 1; D.text(c, 'DOOR OPEN', ox + ow + 30, oy + oh / 2, { size: 10, weight: 700, color: th.ink }); }
      else { c.strokeStyle = th.metalDark; c.lineWidth = 3; D.rr(c, ox + 14, oy + 14, ow - 28, oh - 28, 10); c.stroke(); }
      D.text(c, Math.round(st.temp) + ' °C', 560, 70, { size: 22, mono: true, weight: 700, color: st.temp >= 170 ? th.red : th.ink });
      D.sensorDot(c, th, 520, 104, !!I['I0.3'], '≥180 I0.3');
      D.sensorDot(c, th, 520, 124, !!I['I0.4'], '≥170 I0.4');
      D.sensorDot(c, th, 520, 144, !!I['I0.2'], 'door I0.2');
      D.lamp(c, th, 70, 70, 12, !!Q['Q0.2'], 'amber', 'Baking', 'Q0.2');
      D.lamp(c, th, 70, 150, 12, !!Q['Q0.3'] && st.t % 500 < 300, 'green', 'Buzzer', 'Q0.3');
      D.text(c, 'good ' + st.good + '  bad ' + st.bad, 20, 250, { size: 12, mono: true, weight: 700, color: st.bad ? th.red : th.ink, align: 'left' });
      if (st.last) D.text(c, st.last.length > 40 ? st.last.slice(0, 39) + '…' : st.last, 20, 300, { size: 10, color: st.last.startsWith('Good') ? th.on : th.red, align: 'left' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── washing machine ─────────────────────────
  P.washer = {
    id: 'washer', name: 'Washing machine', blurb: 'Door lock, water valve, heater, a drum that turns left/right, a drain pump and high-speed spin. Each load is checked when the door is opened.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Door closed', kind: 'sensor' },
      { addr: 'I0.3', name: 'Door locked', kind: 'sensor' },
      { addr: 'I0.4', name: 'Water level OK', kind: 'sensor', note: '1 when the drum is filled to wash level (60 %)' },
      { addr: 'I0.5', name: 'Drum empty', kind: 'sensor', note: '1 when the water is drained' },
      { addr: 'I0.6', name: 'Water ≥ 40 °C', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Door lock', color: 'amber' },
      { addr: 'Q0.1', name: 'Water valve', color: 'blue' },
      { addr: 'Q0.2', name: 'Heater', color: 'red' },
      { addr: 'Q0.3', name: 'Drum left', color: 'green' },
      { addr: 'Q0.4', name: 'Drum right', color: 'green' },
      { addr: 'Q0.5', name: 'Drain pump', color: 'blue' },
      { addr: 'Q0.6', name: 'Spin (fast)', color: 'amber' },
      { addr: 'Q0.7', name: 'End lamp', color: 'green' },
    ],
    actions: [{ id: 'door', label: 'Open / close door', toggle: true, run(st) { if (st.lock > 0.5) { st.note = 'The door is locked'; return; } st.open = !st.open; if (st.open) st.check = true; } }],
    init() { return { open: false, lock: 0, water: 0, temp: 20, ang: 0, washT: 0, spinT: 0, dirs: 0, lastDir: 0, clean: 0, dirty: 0, last: '', note: '', check: false, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, L = Q['Q0.3'], R = Q['Q0.4'];
      st.lock = clamp(st.lock + (Q['Q0.0'] && !st.open ? 1 : -1) * 2 * s, 0, 1);
      const locked = st.lock > 0.95 && !st.open;
      if (L && R) st.fault = st.fault || 'Drum motor driven left and right together.';
      if ((L || R) && !locked) st.fault = st.fault || 'The drum turned with the door not locked.';
      if (Q['Q0.1'] && !locked) st.fault = st.fault || 'Water valve opened with the door unlocked: water on the floor.';
      if (Q['Q0.2'] && st.water < 0.5) st.fault = st.fault || 'Heater switched on without enough water: it burned out.';
      if (Q['Q0.6'] && st.water > 0.1) st.fault = st.fault || 'Spun with water in the drum: the machine walked across the room.';
      if (!Q['Q0.0'] && st.water > 0.05) st.fault = st.fault || 'Door unlocked with water in the drum: flood!';
      st.water += ((Q['Q0.1'] ? 0.12 : 0) - (Q['Q0.5'] ? 0.2 : 0)) * s;
      if (st.water >= 1) st.fault = st.fault || 'The drum overflowed.';
      st.water = clamp(st.water, 0, 1);
      st.temp += ((Q['Q0.2'] && st.water > 0.5 ? 5 : 0) - (st.temp - 20) * 0.01) * s;
      if (st.water < 0.05) st.temp += (20 - st.temp) * Math.min(1, s * 0.5);
      const dir = L ? -1 : R ? 1 : 0;
      if (dir && dir !== st.lastDir && st.lastDir) st.dirs++;
      if (dir) st.lastDir = dir;
      if (dir && st.water >= 0.5 && st.temp >= 35) st.washT += dt;
      if (Q['Q0.6'] && R && st.water < 0.05) st.spinT += dt;
      st.ang += dir * dt * (Q['Q0.6'] ? 0.04 : 0.006);
      if (st.check) {
        st.check = false;
        if (st.washT > 0 || st.spinT > 0) {
          const why = [];
          if (st.washT < 8000) why.push('washed ' + (st.washT / 1000).toFixed(1) + ' s');
          if (st.dirs < 2) why.push('drum never reversed');
          if (st.spinT < 3000) why.push('spun ' + (st.spinT / 1000).toFixed(1) + ' s');
          if (why.length) { st.dirty++; st.last = 'Dirty load: ' + why.join(', '); } else { st.clean++; st.last = 'Clean load'; }
        }
        st.washT = 0; st.spinT = 0; st.dirs = 0; st.lastDir = 0;
      }
      const o = devices(this, ctrl);
      o['I0.2'] = st.open ? 0 : 1; o['I0.3'] = locked ? 1 : 0; o['I0.4'] = st.water >= 0.6 ? 1 : 0; o['I0.5'] = st.water < 0.02 ? 1 : 0; o['I0.6'] = st.temp >= 40 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const cx = 280, cy = 170, R = 105;
      c.fillStyle = th.panel2; D.rr(c, cx - 150, 30, 300, 290, 16); c.fill(); c.strokeStyle = th.line; c.lineWidth = 2; c.stroke();
      c.fillStyle = th.inside; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, R - 6, 0, 7); c.clip();
      c.fillStyle = th.water; c.globalAlpha = 0.75; c.fillRect(cx - R, cy + R - st.water * 2 * R, 2 * R, st.water * 2 * R); c.globalAlpha = 1;
      c.translate(cx, cy); c.rotate(st.ang); c.fillStyle = th.box;
      for (let i = 0; i < 5; i++) { c.rotate((Math.PI * 2) / 5); D.rr(c, 20, -14, 46, 28, 8); c.fill(); }
      c.restore();
      c.strokeStyle = st.open ? th.amber : th.metalDark; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R + 4, 0, 7); c.stroke();
      if (st.open) D.text(c, 'DOOR OPEN', cx, cy, { size: 14, weight: 800, color: th.amber });
      D.text(c, st.lock > 0.95 ? '🔒 locked' : 'unlocked', cx, 52, { size: 11, mono: true, weight: 700, color: st.lock > 0.95 ? th.amber : th.muted });
      D.text(c, Math.round(st.water * 100) + '% water · ' + Math.round(st.temp) + ' °C', cx, 300, { size: 12, mono: true, weight: 600, color: th.ink });
      D.text(c, Q['Q0.3'] ? '↺ LEFT' : Q['Q0.4'] ? (Q['Q0.6'] ? '↻ SPIN' : '↻ RIGHT') : '', cx + 140, 60, { size: 12, mono: true, weight: 700, color: th.on, align: 'right' });
      D.sensorDot(c, th, 470, 70, !!I['I0.4'], 'level I0.4');
      D.sensorDot(c, th, 470, 92, !!I['I0.5'], 'empty I0.5');
      D.sensorDot(c, th, 470, 114, !!I['I0.6'], '40°C I0.6');
      D.sensorDot(c, th, 470, 136, !!I['I0.3'], 'locked I0.3');
      D.lamp(c, th, 500, 200, 11, !!Q['Q0.7'], 'green', 'End', 'Q0.7');
      D.text(c, 'clean ' + st.clean + '  dirty ' + st.dirty, 630, 290, { size: 12, mono: true, weight: 700, color: st.dirty ? th.red : th.ink, align: 'right' });
      if (st.last) D.text(c, st.last.length > 30 ? st.last.slice(0, 29) + '…' : st.last, 630, 310, { size: 10, color: st.last.startsWith('Clean') ? th.on : th.red, align: 'right' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── overhead crane ─────────────────────────
  P.crane = {
    id: 'crane', name: 'Overhead crane', blurb: 'A crane bridge travels between stations A, B and C. Its hook has a lifting magnet. Loads arrive at A and must be delivered to C.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'At station A', kind: 'sensor' },
      { addr: 'I0.3', name: 'At station B', kind: 'sensor' },
      { addr: 'I0.4', name: 'At station C', kind: 'sensor' },
      { addr: 'I0.5', name: 'Hook up', kind: 'sensor' },
      { addr: 'I0.6', name: 'Hook down', kind: 'sensor' },
      { addr: 'I0.7', name: 'Load waiting at A', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Travel left', color: 'green' },
      { addr: 'Q0.1', name: 'Travel right', color: 'green' },
      { addr: 'Q0.2', name: 'Hoist up', color: 'blue' },
      { addr: 'Q0.3', name: 'Hoist down', color: 'blue' },
      { addr: 'Q0.4', name: 'Magnet', color: 'red' },
      { addr: 'Q0.5', name: 'Beacon', color: 'amber' },
    ],
    actions: [{ id: 'place', label: 'Place a load at A', run(st) { if (!st.loadA && !(st.hook && st.x < 0.2)) st.loadA = true; } }],
    init() { return { x: 0.1, z: 0, loadA: true, hook: false, loadC: 0, delivered: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, Lf = Q['Q0.0'], Rt = Q['Q0.1'], Up = Q['Q0.2'], Dn = Q['Q0.3'];
      if (Lf && Rt) st.fault = st.fault || 'Travel left and right together.';
      if (Up && Dn) st.fault = st.fault || 'Hoist up and down together.';
      if ((Lf || Rt) && st.z > 0.03) st.fault = st.fault || 'The crane travelled with the hook lowered: the load swung into the racks.';
      if (!st.fault) {
        st.x += ((Rt ? 1 : 0) - (Lf ? 1 : 0)) * 0.2 * s;
        st.z = clamp(st.z + ((Dn ? 1 : 0) - (Up ? 1 : 0)) * 0.5 * s, 0, 1);
      }
      if (st.x < 0 || st.x > 1) st.fault = st.fault || 'The crane hit the end stop of the runway.';
      const at = (p) => Math.abs(st.x - p) < 0.01;
      if (Q['Q0.4'] && st.z >= 0.98 && !st.hook) {
        if (at(0.1) && st.loadA) { st.loadA = false; st.hook = true; }
      }
      if (!Q['Q0.4'] && st.hook) {
        if (st.z < 0.95) st.fault = st.fault || 'The magnet let go in mid-air: the load was dropped!';
        else if (at(0.9)) { st.hook = false; st.delivered++; st.loadC = 1500; }
        else if (at(0.1)) { st.hook = false; st.loadA = true; }
        else { st.hook = false; st.fault = st.fault || 'Load set down in the aisle, not at a station.'; }
      }
      if (st.loadC > 0) st.loadC -= dt;
      const o = devices(this, ctrl);
      o['I0.2'] = at(0.1) ? 1 : 0; o['I0.3'] = at(0.5) ? 1 : 0; o['I0.4'] = at(0.9) ? 1 : 0;
      o['I0.5'] = st.z <= 0.01 ? 1 : 0; o['I0.6'] = st.z >= 0.99 ? 1 : 0; o['I0.7'] = st.loadA ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x0 = 40, W = 560, top = 40, floor = 290;
      c.fillStyle = th.metalDark; c.fillRect(x0 - 10, top - 10, W + 20, 12);
      c.fillStyle = th.ground; c.fillRect(0, floor, 640, 12);
      [['A', 0.1, 'I0.2'], ['B', 0.5, 'I0.3'], ['C', 0.9, 'I0.4']].forEach(([n, p, a]) => {
        const xx = x0 + p * W;
        D.text(c, 'Station ' + n, xx, floor + 26, { size: 11, weight: 700, color: th.ink });
        D.sensorDot(c, th, xx, top - 22, !!I[a], a);
      });
      if (st.loadA) { c.fillStyle = th.box; D.rr(c, x0 + 0.1 * W - 26, floor - 40, 52, 40, 4); c.fill(); }
      if (st.loadC > 0) { c.fillStyle = th.box; D.rr(c, x0 + 0.9 * W - 26, floor - 40, 52, 40, 4); c.fill(); }
      const bx = x0 + st.x * W;
      c.fillStyle = (Q['Q0.0'] || Q['Q0.1']) ? th.amber : th.metal; D.rr(c, bx - 40, top, 80, 24, 5); c.fill();
      const hy = top + 30 + st.z * (floor - top - 100);
      c.strokeStyle = th.metalDark; c.lineWidth = 2; c.beginPath(); c.moveTo(bx - 8, top + 24); c.lineTo(bx - 8, hy); c.moveTo(bx + 8, top + 24); c.lineTo(bx + 8, hy); c.stroke();
      c.fillStyle = Q['Q0.4'] ? th.red : th.metalDark; D.rr(c, bx - 30, hy, 60, 14, 4); c.fill();
      if (st.hook) { c.fillStyle = th.box; D.rr(c, bx - 26, hy + 14, 52, 40, 4); c.fill(); }
      if (Q['Q0.5']) D.lamp(c, th, bx, top + 12, 5, true, 'amber');
      D.sensorDot(c, th, 600, 80, !!I['I0.5'], 'up I0.5', 'left');
      D.sensorDot(c, th, 600, 100, !!I['I0.6'], 'down I0.6', 'left');
      D.text(c, 'delivered ' + st.delivered, 600, 130, { size: 12, mono: true, weight: 700, color: th.ink, align: 'right' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── rotary indexing table ─────────────────────────
  P.indexer = {
    id: 'indexer', name: 'Rotary indexing table', blurb: 'A turntable with 3 pockets moves parts from the load station to a press and then to an ejector. It must only index when every station is clear.',
    inputs: [
      { addr: 'I0.0', name: 'AUTO', kind: 'sw' },
      { addr: 'I0.1', name: 'Table in position', kind: 'sensor', note: 'Index cam: 1 when a pocket is exactly at each station' },
      { addr: 'I0.2', name: 'Part at load', kind: 'sensor' },
      { addr: 'I0.3', name: 'Part at press', kind: 'sensor' },
      { addr: 'I0.4', name: 'Press up', kind: 'sensor' },
      { addr: 'I0.5', name: 'Press down', kind: 'sensor' },
      { addr: 'I0.6', name: 'Part at eject', kind: 'sensor' },
      { addr: 'I0.7', name: 'Ejector home', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Index motor', color: 'green' },
      { addr: 'Q0.1', name: 'Press down', color: 'red' },
      { addr: 'Q0.2', name: 'Ejector', color: 'amber' },
      { addr: 'Q0.3', name: 'Running lamp', color: 'green' },
    ],
    actions: [{ id: 'load', label: 'Load a part', run(st) { const k = st.slot(0); if (st.inPos() && !st.pk[k]) st.pk[k] = { pressed: false }; } }],
    init() {
      const st = { a: 0, pk: [null, null, null], press: 0, ej: 0, ejT: 0, good: 0, bad: 0, t: 0, fault: null };
      st.inPos = () => { const f = st.a - Math.floor(st.a); return f < 0.015 || f > 0.985; };
      st.slot = (station) => ((station - Math.round(st.a)) % 3 + 3) % 3;
      return st;
    },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      if (Q['Q0.0']) {
        if (st.press > 0.05) st.fault = st.fault || 'The table turned while the press was down: crash!';
        if (st.ej > 0.05) st.fault = st.fault || 'The table turned with the ejector out.';
        if (!st.fault) st.a += s / 1.2;
      }
      st.press = clamp(st.press + (Q['Q0.1'] ? 2 : -2) * s, 0, 1);
      st.ej = clamp(st.ej + (Q['Q0.2'] ? 4 : -4) * s, 0, 1);
      if (Q['Q0.1'] && !st.inPos()) st.fault = st.fault || 'Press came down between stations.';
      const pp = st.pk[st.slot(1)];
      if (st.press > 0.97 && pp && st.inPos()) pp.pressed = true;
      const pe = st.slot(2);
      if (Q['Q0.2'] && st.inPos() && st.pk[pe]) { st.ejT += dt; if (st.ejT >= 200) { if (st.pk[pe].pressed) st.good++; else st.bad++; st.pk[pe] = null; } } else st.ejT = 0;
      const o = devices(this, ctrl);
      const ip = st.inPos();
      o['I0.1'] = ip ? 1 : 0;
      o['I0.2'] = ip && st.pk[st.slot(0)] ? 1 : 0; o['I0.3'] = ip && st.pk[st.slot(1)] ? 1 : 0; o['I0.6'] = ip && st.pk[st.slot(2)] ? 1 : 0;
      o['I0.4'] = st.press < 0.03 ? 1 : 0; o['I0.5'] = st.press > 0.97 ? 1 : 0; o['I0.7'] = st.ej < 0.03 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const cx = 300, cy = 175, R = 110;
      c.fillStyle = th.metal; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.strokeStyle = th.metalDark; c.lineWidth = 3; c.stroke();
      const stAng = [Math.PI / 2, Math.PI / 2 + 2.094, Math.PI / 2 + 4.189];
      ['LOAD', 'PRESS', 'EJECT'].forEach((n, i) => { const a = stAng[i]; D.text(c, n, cx + Math.cos(a) * (R + 38), cy + Math.sin(a) * (R + 38), { size: 11, weight: 800, color: th.ink }); });
      for (let k = 0; k < 3; k++) {
        const a = stAng[0] + (k + st.a) * 2.094;
        const px = cx + Math.cos(a) * 70, py = cy + Math.sin(a) * 70;
        c.fillStyle = th.inside; c.beginPath(); c.arc(px, py, 24, 0, 7); c.fill();
        const part = st.pk[k];
        if (part) { c.fillStyle = part.pressed ? th.on : th.box; D.rr(c, px - 16, py - 16, 32, 32, 5); c.fill(); }
      }
      // press at station 1, ejector at station 2
      const pa = stAng[1], ex = cx + Math.cos(pa) * 70, ey = cy + Math.sin(pa) * 70;
      c.fillStyle = Q['Q0.1'] ? th.red : th.metalDark; c.globalAlpha = 0.4 + 0.6 * st.press; c.beginPath(); c.arc(ex, ey, 14 + st.press * 8, 0, 7); c.fill(); c.globalAlpha = 1;
      const ea = stAng[2], jx = cx + Math.cos(ea) * (R + 6), jy = cy + Math.sin(ea) * (R + 6);
      c.fillStyle = Q['Q0.2'] ? th.amber : th.metalDark; c.fillRect(jx - 8 - st.ej * 20, jy - 6, 22, 12);
      D.sensorDot(c, th, 560, 60, !!I['I0.1'], 'in pos I0.1', 'left');
      D.sensorDot(c, th, 560, 82, !!I['I0.4'], 'press up I0.4', 'left');
      D.sensorDot(c, th, 560, 104, !!I['I0.5'], 'press dn I0.5', 'left');
      D.sensorDot(c, th, 560, 126, !!I['I0.7'], 'ejector home I0.7', 'left');
      D.text(c, 'good ' + st.good + '  bad ' + st.bad, 620, 300, { size: 12, mono: true, weight: 700, color: st.bad ? th.red : th.ink, align: 'right' });
      D.text(c, Q['Q0.0'] ? 'INDEXING ↻' : '', 40, 40, { size: 12, mono: true, weight: 700, color: th.on, align: 'left' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── greenhouse ─────────────────────────
  P.greenhouse = {
    id: 'greenhouse', name: 'Greenhouse climate', blurb: 'Temperature transmitter (0–50 °C as 4–20 mA, AIW0), heater, roof vent with open/closed limits, circulation fan and drip irrigation with a soil-dry sensor.',
    inputs: [
      { addr: 'I0.0', name: 'AUTO', kind: 'sw' },
      { addr: 'AIW0', name: 'Temperature', kind: 'sensor', note: '0 °C = 6400, 50 °C = 32000 (512 counts per °C)' },
      { addr: 'I0.2', name: 'Vent open', kind: 'sensor' },
      { addr: 'I0.3', name: 'Vent closed', kind: 'sensor' },
      { addr: 'I0.4', name: 'Soil dry', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Heater', color: 'red' },
      { addr: 'Q0.1', name: 'Vent open motor', color: 'blue' },
      { addr: 'Q0.2', name: 'Vent close motor', color: 'blue' },
      { addr: 'Q0.3', name: 'Fan', color: 'green' },
      { addr: 'Q0.4', name: 'Irrigation valve', color: 'blue' },
      { addr: 'Q0.5', name: 'Temp alarm', color: 'amber' },
    ],
    actions: [
      { id: 'sunny', label: 'Sunny day', toggle: true, run(st) { st.sunny = !st.sunny; } },
      { id: 'cold', label: 'Cold night', toggle: true, run(st) { st.cold = !st.cold; } },
    ],
    init() { return { T: 15, vent: 0, moist: 0.25, sunny: false, cold: false, stall: 0, ang: 0, tC: 15, moistPct: 25, hist: [], ht: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, op = Q['Q0.1'], cl = Q['Q0.2'];
      if (op && cl) st.fault = st.fault || 'Vent motor driven open and close together.';
      st.vent = clamp(st.vent + ((op ? 1 : 0) - (cl ? 1 : 0)) * 0.25 * s, 0, 1);
      if ((op && st.vent >= 1) || (cl && st.vent <= 0)) st.stall += dt; else st.stall = 0;
      if (st.stall > 1500) st.fault = st.fault || 'Vent motor stalled at the end: stop it with the limit switch.';
      const To = st.cold ? 5 : 18;
      st.T += ((Q['Q0.0'] ? 1.5 : 0) + (st.sunny ? 0.6 : 0) - (st.T - To) * (0.01 + 0.08 * st.vent)) * s;
      st.moist += ((Q['Q0.4'] ? 0.15 : 0) - (st.sunny ? 0.03 : 0.015)) * s;
      if (st.moist > 1) st.fault = st.fault || 'Over-watered: the beds are flooded.';
      st.moist = clamp(st.moist, 0, 1);
      if (Q['Q0.3']) st.ang += dt * 0.03;
      st.tC = Math.round(st.T); st.moistPct = Math.round(st.moist * 100);
      st.ht += dt; if (st.ht >= 250) { st.ht = 0; st.hist.push(st.T); if (st.hist.length > 120) st.hist.shift(); }
      const o = devices(this, ctrl);
      o['AIW0'] = Math.round(6400 + clamp(st.T, 0, 50) * 512);
      o['I0.2'] = st.vent >= 0.99 ? 1 : 0; o['I0.3'] = st.vent <= 0.01 ? 1 : 0; o['I0.4'] = st.moist < 0.3 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x = 40, y = 90, w = 300, h = 190;
      c.fillStyle = st.sunny ? 'rgba(253,230,138,.55)' : th.panel; D.rr(c, 10, 10, 360, 320, 10); c.fill();
      if (st.sunny) { c.fillStyle = '#f59e0b'; c.beginPath(); c.arc(330, 36, 20, 0, 7); c.fill(); }
      c.fillStyle = th.glass; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w / 2, y - 60); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
      c.strokeStyle = th.metalDark; c.lineWidth = 3; c.stroke();
      // vent flap on the right roof slope
      c.save(); c.translate(x + w / 2, y - 60); c.rotate(-st.vent * 0.6); c.fillStyle = Q['Q0.1'] || Q['Q0.2'] ? th.blue : th.metal; c.fillRect(0, -4, 90, 8); c.restore();
      // plants
      for (let i = 0; i < 6; i++) { const px = x + 30 + i * 45; c.fillStyle = st.moist < 0.3 ? '#a16207' : '#16a34a'; c.beginPath(); c.ellipse(px, y + h - 30, 14, 20, 0, 0, 7); c.fill(); }
      if (Q['Q0.4']) { c.fillStyle = th.water; for (let i = 0; i < 12; i++) c.fillRect(x + 20 + i * 24, y + h - 70 + ((st.t / 10 + i * 7) % 30), 2, 6); }
      if (Q['Q0.0']) { c.fillStyle = th.red; D.rr(c, x + 10, y + h - 14, 60, 8, 3); c.fill(); }
      c.save(); c.translate(x + w - 40, y + 30); c.rotate(st.ang); c.fillStyle = Q['Q0.3'] ? th.on : th.metalDark; for (let i = 0; i < 3; i++) { c.rotate(2.094); D.rr(c, -3, 0, 6, 18, 3); c.fill(); } c.restore();
      D.text(c, st.T.toFixed(1) + ' °C', 190, 140, { size: 20, mono: true, weight: 700, color: th.ink });
      D.text(c, 'soil ' + st.moistPct + '%', 190, 164, { size: 11, mono: true, color: th.muted });
      D.sensorDot(c, th, 400, 262, !!I['I0.2'], 'vent open I0.2');
      D.sensorDot(c, th, 400, 282, !!I['I0.3'], 'vent closed I0.3');
      D.sensorDot(c, th, 400, 302, !!I['I0.4'], 'soil dry I0.4');
      // trend
      const gx = 390, gy = 40, gw = 230, gh = 200;
      c.fillStyle = th.panel; D.rr(c, gx, gy, gw, gh, 8); c.fill(); c.strokeStyle = th.line; c.lineWidth = 1; c.stroke();
      const yy = (v) => gy + gh - ((v - 0) / 40) * gh;
      c.fillStyle = 'rgba(34,197,94,.14)'; c.fillRect(gx, yy(26), gw, yy(20) - yy(26));
      [10, 20, 26, 35].forEach((v) => D.text(c, v + '°', gx - 4, yy(v), { size: 9, mono: true, color: th.muted, align: 'right' }));
      c.strokeStyle = th.red; c.lineWidth = 2.5; c.beginPath();
      st.hist.forEach((v, i) => { const px = gx + (i / 119) * gw, py = yy(clamp(v, 0, 40)); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
      D.text(c, 'temperature · 30 s · band 20–26 °C', gx + 6, gy + 12, { size: 9, weight: 600, color: th.muted, align: 'left' });
      D.lamp(c, th, 600, 290, 10, !!Q['Q0.5'], 'amber', 'Alarm', 'Q0.5');
      D.text(c, (st.cold ? 'COLD NIGHT ' : '') + (st.sunny ? 'SUNNY' : ''), 520, 262, { size: 10, mono: true, weight: 700, color: th.blue, align: 'left' });
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── sliding gate ─────────────────────────
  P.gate = {
    id: 'gate', name: 'Automatic sliding gate', blurb: 'A sliding gate with one remote button, open/closed limit switches, a photocell across the gateway and a rubber safety edge. A car in the gateway blocks the photocell.',
    inputs: [
      { addr: 'I0.0', name: 'Remote', kind: 'pb', color: 'black' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Gate open', kind: 'sensor' },
      { addr: 'I0.3', name: 'Gate closed', kind: 'sensor' },
      { addr: 'I0.4', name: 'Photocell clear', kind: 'sensor', note: '1 = beam clear, 0 = something in the gateway' },
      { addr: 'I0.5', name: 'Safety edge OK', kind: 'sensor', note: 'NC rubber edge: 0 when the gate touches something' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Motor open', color: 'green' },
      { addr: 'Q0.1', name: 'Motor close', color: 'blue' },
      { addr: 'Q0.2', name: 'Flashing lamp', color: 'amber' },
    ],
    actions: [
      { id: 'car', label: 'Car in gateway', toggle: true, run(st) { st.car = !st.car; } },
      { id: 'edge', label: 'Hit safety edge', run(st) { st.edgeT = 300; } },
    ],
    init() { return { pos: 0, car: false, edgeT: 0, stall: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, op = Q['Q0.0'], cl = Q['Q0.1'];
      if (op && cl) st.fault = st.fault || 'Motor driven open and close together.';
      if (!st.fault) st.pos = clamp(st.pos + ((op ? 1 : 0) - (cl ? 1 : 0)) * 0.2 * s, 0, 1);
      if (st.car && cl && st.pos < 0.45) st.fault = st.fault || 'The gate closed onto the car!';
      if ((op && st.pos >= 1) || (cl && st.pos <= 0)) st.stall += dt; else st.stall = 0;
      if (st.stall > 1500) st.fault = st.fault || 'Gate motor stalled at the end of travel.';
      st.edgeT = Math.max(0, st.edgeT - dt);
      const o = devices(this, ctrl);
      o['I0.2'] = st.pos >= 0.99 ? 1 : 0; o['I0.3'] = st.pos <= 0.01 ? 1 : 0;
      o['I0.4'] = st.car ? 0 : 1; o['I0.5'] = st.edgeT > 0 ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q, I) {
      const gx = 120, gw = 360, gy = 120;
      c.fillStyle = th.ground; c.fillRect(0, 250, 640, 14);
      c.fillStyle = th.wall; c.fillRect(gx - 30, 90, 26, 160); c.fillRect(gx + gw + 4, 90, 26, 160);
      if (st.car) { c.fillStyle = th.carBody; D.rr(c, gx + 90, 190, 180, 50, 12); c.fill(); c.fillStyle = th.carGlass; D.rr(c, gx + 130, 168, 90, 28, 8); c.fill(); }
      const off = st.pos * gw;
      c.strokeStyle = th.metalDark; c.lineWidth = 4;
      c.save(); c.beginPath(); c.rect(gx - 4, 60, gw + 8, 200); c.clip();
      const x0 = gx - off;
      c.strokeRect(x0, gy, gw, 120);
      for (let i = 1; i < 12; i++) { c.beginPath(); c.moveTo(x0 + i * gw / 12, gy); c.lineTo(x0 + i * gw / 12, gy + 120); c.stroke(); }
      c.fillStyle = st.edgeT > 0 ? th.red : th.knob; c.fillRect(x0 + gw - 6, gy, 8, 120);
      c.restore();
      c.strokeStyle = st.car ? th.red : 'rgba(239,68,68,.35)'; c.setLineDash([4, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(gx - 4, 230); c.lineTo(gx + gw + 4, 230); c.stroke(); c.setLineDash([]);
      D.lamp(c, th, gx - 17, 76, 9, !!Q['Q0.2'], 'amber');
      D.text(c, Q['Q0.0'] ? '◀ OPENING' : Q['Q0.1'] ? 'CLOSING ▶' : Math.round(st.pos * 100) + '% open', 320, 40, { size: 13, mono: true, weight: 700, color: Q['Q0.0'] || Q['Q0.1'] ? th.on : th.muted });
      D.sensorDot(c, th, 560, 100, !!I['I0.2'], 'open I0.2');
      D.sensorDot(c, th, 560, 122, !!I['I0.3'], 'closed I0.3');
      D.sensorDot(c, th, 560, 144, !I['I0.4'], 'photocell I0.4');
      D.sensorDot(c, th, 560, 166, !I['I0.5'], 'edge I0.5');
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── compressor station ─────────────────────────
  P.compressor = {
    id: 'compressor', name: 'Air compressor station', blurb: 'A screw compressor fills an air receiver. Pressure switches at 6, 8 and 10 bar. The load valve makes it compress; unloaded it idles. The motor may start at most 3 times per minute.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP / reset', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'P ≥ 6 bar', kind: 'sensor' },
      { addr: 'I0.3', name: 'P ≥ 8 bar', kind: 'sensor' },
      { addr: 'I0.4', name: 'OL ok', kind: 'sensor', note: 'Overload relay: 1 = healthy' },
      { addr: 'I0.5', name: 'P ≥ 10 bar', kind: 'sensor', note: 'Safety high-pressure switch' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Motor', color: 'green' },
      { addr: 'Q0.1', name: 'Load valve', color: 'blue' },
      { addr: 'Q0.2', name: 'Fault lamp', color: 'red' },
      { addr: 'Q0.3', name: 'Running lamp', color: 'green' },
    ],
    actions: [
      { id: 'demand', label: 'Low air demand', toggle: true, run(st) { st.low = !st.low; } },
      { id: 'trip', label: 'Trip overload', toggle: true, run(st) { st.tripped = !st.tripped; } },
    ],
    init() { return { P: 3, low: false, tripped: false, run: 0, runT: 0, starts: 0, startTimes: [], ang: 0, hist: [], ht: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      const run = Q['Q0.0'] && !st.tripped ? 1 : 0;
      if (run && !st.run) {
        st.starts++; st.runT = 0; st.startTimes.push(st.t);
        st.startTimes = st.startTimes.filter((x) => st.t - x < 60000);
        if (st.startTimes.length > 3) st.fault = st.fault || 'Motor overheated: more than 3 starts in one minute. Keep it idling (run-on) instead of stopping.';
      }
      st.run = run;
      if (run) st.runT += dt;
      if (run && Q['Q0.1'] && st.runT < 1500) st.fault = st.fault || 'Started under load: the motor stalled. Start unloaded, then load.';
      st.P += ((run && Q['Q0.1'] ? 0.6 : 0) - (st.low ? 0.05 : 0.2) * Math.min(1, st.P / 2)) * s;
      if (st.P > 10.6) st.fault = st.fault || 'Safety valve blew at 10.6 bar.';
      st.P = clamp(st.P, 0, 11);
      if (run) st.ang += dt * (Q['Q0.1'] ? 0.03 : 0.015);
      st.ht += dt; if (st.ht >= 250) { st.ht = 0; st.hist.push(st.P); if (st.hist.length > 160) st.hist.shift(); }
      const o = devices(this, ctrl);
      o['I0.2'] = st.P >= 6 ? 1 : 0; o['I0.3'] = st.P >= 8 ? 1 : 0; o['I0.4'] = st.tripped ? 0 : 1; o['I0.5'] = st.P >= 10 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      // motor + compressor
      c.fillStyle = st.run ? th.on : th.metal; D.rr(c, 40, 150, 100, 70, 10); c.fill();
      D.text(c, 'M', 90, 185, { size: 18, weight: 800, color: st.run ? th.onInk : th.ink });
      c.save(); c.translate(190, 185); c.rotate(st.ang); c.fillStyle = th.metalDark; for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); D.rr(c, -4, 0, 8, 30, 4); c.fill(); } c.restore();
      D.pipe(c, th, [[220, 185], [300, 185]], st.run && Q['Q0.1'], st.t);
      c.fillStyle = Q['Q0.1'] ? th.blue : th.metal; D.rr(c, 240, 172, 30, 26, 4); c.fill();
      D.text(c, 'load valve', 255, 214, { size: 9, mono: true, color: th.muted });
      // receiver
      c.fillStyle = th.metal; D.rr(c, 300, 110, 90, 160, 40); c.fill();
      D.text(c, st.P.toFixed(1) + ' bar', 345, 190, { size: 15, mono: true, weight: 800, color: st.P >= 10 ? th.red : th.ink });
      D.sensorDot(c, th, 410, 120, !!I['I0.5'], '10 bar');
      D.sensorDot(c, th, 410, 142, !!I['I0.3'], '8 bar');
      D.sensorDot(c, th, 410, 164, !!I['I0.2'], '6 bar');
      // trend
      const gx = 470, gy = 40, gw = 150, gh = 200;
      c.fillStyle = th.panel; D.rr(c, gx, gy, gw, gh, 8); c.fill();
      const yy = (v) => gy + gh - (v / 11) * gh;
      c.fillStyle = 'rgba(34,197,94,.14)'; c.fillRect(gx, yy(8), gw, yy(6) - yy(8));
      c.strokeStyle = th.blue; c.lineWidth = 2; c.beginPath(); st.hist.forEach((v, i) => { const px = gx + (i / 159) * gw, py = yy(v); i ? c.lineTo(px, py) : c.moveTo(px, py); }); c.stroke();
      D.text(c, 'pressure · 40 s', gx + 6, gy + 12, { size: 9, color: th.muted, align: 'left' });
      D.text(c, 'starts ' + st.starts + (st.tripped ? '  OL TRIPPED' : '') + (st.low ? '  low demand' : ''), 40, 290, { size: 11, mono: true, weight: 700, color: st.tripped ? th.red : th.ink, align: 'left' });
      D.lamp(c, th, 60, 60, 11, !!Q['Q0.3'], 'green', 'Running', 'Q0.3');
      D.lamp(c, th, 140, 60, 11, !!Q['Q0.2'], 'red', 'Fault', 'Q0.2');
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── filling & capping line ─────────────────────────
  P.capline = {
    id: 'capline', name: 'Filling & capping line', blurb: 'Bottles move one pitch at a time. When a bottle stops at the filler, the bottle ahead stands at the capper: both stations work at the same time. Every bottle leaving must be full and capped.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Bottle at filler', kind: 'sensor' },
      { addr: 'I0.3', name: 'Bottle full', kind: 'sensor' },
      { addr: 'I0.4', name: 'Bottle at capper', kind: 'sensor' },
      { addr: 'I0.5', name: 'Capper up', kind: 'sensor' },
      { addr: 'I0.6', name: 'Capper down', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Conveyor', color: 'green' },
      { addr: 'Q0.1', name: 'Fill valve', color: 'blue' },
      { addr: 'Q0.2', name: 'Capper down', color: 'amber' },
      { addr: 'Q0.3', name: 'Capper twist', color: 'green' },
      { addr: 'Q0.4', name: 'Running lamp', color: 'green' },
    ],
    actions: [],
    init() { return { b: [{ x: 0.15, l: 0, cap: 0 }], cz: 0, off: 0, ang: 0, good: 0, bad: 0, last: '', t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      const atF = st.b.find((b) => Math.abs(b.x - 0.4) < 0.012), atC = st.b.find((b) => Math.abs(b.x - 0.65) < 0.012);
      st.cz = clamp(st.cz + (Q['Q0.2'] ? 3 : -3) * s, 0, 1);
      if (Q['Q0.1']) { if (!atF) st.fault = st.fault || 'Fill valve opened with no bottle: product spilled.'; else { atF.l += 0.5 * s; if (atF.l > 1.15) st.fault = st.fault || 'Bottle overflowed.'; } }
      if (Q['Q0.0']) {
        if (Q['Q0.1'] && atF) st.fault = st.fault || 'Conveyor moved while filling.';
        if (st.cz > 0.1) st.fault = st.fault || 'Conveyor moved with the capper down: bottles smashed.';
        const v = 0.2 * s; st.off += v; st.b.forEach((b) => (b.x += v));
        st.b = st.b.filter((b) => { if (b.x > 1.03) { const ok = b.l >= 0.9 && b.cap >= 800; if (ok) st.good++; else { st.bad++; st.last = 'Bad bottle: ' + (b.l < 0.9 ? 'under-filled ' : '') + (b.cap < 800 ? 'not capped' : ''); } return false; } return true; });
        if (Math.min(...st.b.map((b) => b.x)) >= 0.25) st.b.push({ x: 0, l: 0, cap: 0 });
      }
      if (Q['Q0.3'] && st.cz > 0.97 && atC) { atC.cap += dt; if (atC.l < 0.9) st.fault = st.fault || 'Capped an empty bottle.'; }
      if (Q['Q0.3']) st.ang += dt * 0.03;
      const o = devices(this, ctrl);
      o['I0.2'] = atF ? 1 : 0; o['I0.3'] = atF && atF.l >= 0.95 ? 1 : 0; o['I0.4'] = atC ? 1 : 0;
      o['I0.5'] = st.cz < 0.03 ? 1 : 0; o['I0.6'] = st.cz > 0.97 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const x0 = 30, L = 580, y = 250;
      c.fillStyle = th.metalDark; D.rr(c, x0 - 10, y, L + 20, 18, 9); c.fill();
      c.strokeStyle = th.pipe; c.lineWidth = 2;
      for (let i = 0; i < 36; i++) { const xx = x0 + (((i / 36) + st.off) % 1) * L; c.beginPath(); c.moveTo(xx, y + 3); c.lineTo(xx - 5, y + 15); c.stroke(); }
      const fx = x0 + 0.4 * L, cx = x0 + 0.65 * L;
      c.fillStyle = th.metal; D.rr(c, fx - 34, 50, 68, 44, 6); c.fill(); D.text(c, 'FILLER', fx, 72, { size: 10, weight: 700, color: th.ink });
      c.fillStyle = Q['Q0.1'] ? th.blue : th.metalDark; c.fillRect(fx - 5, 94, 10, 50); if (Q['Q0.1']) { c.fillStyle = th.water; c.fillRect(fx - 2, 144, 4, 30); }
      c.fillStyle = th.metal; D.rr(c, cx - 34, 50, 68, 44, 6); c.fill(); D.text(c, 'CAPPER', cx, 72, { size: 10, weight: 700, color: th.ink });
      const ch = 94 + st.cz * 66;
      c.fillStyle = th.metalDark; c.fillRect(cx - 4, 94, 8, ch - 94);
      c.save(); c.translate(cx, ch + 6); c.rotate(st.ang); c.fillStyle = Q['Q0.3'] ? th.on : th.amber; D.rr(c, -14, -6, 28, 12, 3); c.fill(); c.restore();
      st.b.forEach((b) => {
        const bx = x0 + b.x * L, bw = 30, bh = 74;
        c.fillStyle = th.glass; D.rr(c, bx - bw / 2, y - bh, bw, bh, 7); c.fill();
        c.fillStyle = th.water; const lh = Math.min(1, b.l) * (bh - 14); D.rr(c, bx - bw / 2 + 3, y - lh - 3, bw - 6, lh, 4); c.fill();
        c.fillStyle = b.cap >= 800 ? th.red : th.metalDark; c.fillRect(bx - 7, y - bh - 8, 14, 8);
      });
      D.sensorDot(c, th, fx - 50, y - 24, !!I['I0.2'], 'I0.2', 'left');
      D.sensorDot(c, th, fx + 44, 116, !!I['I0.3'], 'full I0.3');
      D.sensorDot(c, th, cx + 50, y - 24, !!I['I0.4'], 'I0.4');
      D.sensorDot(c, th, cx + 44, 60, !!I['I0.5'], 'up I0.5');
      D.sensorDot(c, th, cx + 44, 82, !!I['I0.6'], 'down I0.6');
      D.text(c, 'good ' + st.good + '  bad ' + st.bad, 620, 300, { size: 12, mono: true, weight: 700, color: st.bad ? th.red : th.ink, align: 'right' });
      D.lamp(c, th, 50, 60, 10, !!Q['Q0.4'], 'green', 'Running', 'Q0.4');
      D.fault(c, th, st.fault);
    },
  };

  // ───────────────────────── palletizer ─────────────────────────
  P.palletizer = {
    id: 'palletizer', name: 'Palletizer', blurb: 'Boxes arrive on the infeed. The box pusher forms rows of 3, the row pusher moves each row onto the pallet (2 rows = 1 layer), and the elevator lowers the pallet one layer. 3 layers make a full pallet.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Box at pusher', kind: 'sensor' },
      { addr: 'I0.3', name: 'Box pusher home', kind: 'sensor' },
      { addr: 'I0.4', name: 'Box pusher out', kind: 'sensor' },
      { addr: 'I0.5', name: 'Row pusher home', kind: 'sensor' },
      { addr: 'I0.6', name: 'Row pusher out', kind: 'sensor' },
      { addr: 'I0.7', name: 'Elevator at layer', kind: 'sensor', note: 'Index sensor: 1 when the pallet is at a layer height' },
      { addr: 'I1.0', name: 'Pallet present', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Infeed conveyor', color: 'green' },
      { addr: 'Q0.1', name: 'Box pusher', color: 'amber' },
      { addr: 'Q0.2', name: 'Row pusher', color: 'amber' },
      { addr: 'Q0.3', name: 'Elevator down', color: 'blue' },
      { addr: 'Q0.4', name: 'Pallet out', color: 'green' },
      { addr: 'Q0.5', name: 'Pallet full lamp', color: 'green' },
    ],
    actions: [],
    init() { return { q: [0.7, 0.45, 0.2], bp: 0, rp: 0, row: 0, rows: 0, layers: [], z: 0, pallet: true, px: 0, newT: 0, pallets: 0, bad: 0, last: '', off: 0, t: 0, fault: null }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000;
      // infeed
      if (Q['Q0.0']) {
        st.off += 0.25 * s;
        if (st.bp > 0.05 && st.q.some((x) => x > 0.88)) st.fault = st.fault || 'A box jammed against the extended box pusher.';
        let lim = 1;
        st.q.sort((a, b) => b - a);
        st.q = st.q.map((x) => { const nx = Math.min(x + 0.25 * s, lim); lim = nx - 0.2; return nx; });
        if (!st.q.length || Math.min(...st.q) > 0.2) st.q.push(0);
      }
      const boxAt = st.q.some((x) => x >= 0.99);
      // box pusher
      if (Q['Q0.1'] && st.rp > 0.05) st.fault = st.fault || 'Box pushed into the row pusher.';
      st.bp = clamp(st.bp + (Q['Q0.1'] ? 2 : -2) * s, 0, 1);
      if (st.bp > 0.97 && boxAt) { st.q = st.q.filter((x) => x < 0.99); st.row++; if (st.row > 3) st.fault = st.fault || 'Row overfilled: a 4th box fell off the table.'; }
      // row pusher
      if (Q['Q0.2'] && st.bp > 0.05) st.fault = st.fault || 'Row pusher moved with the box pusher out.';
      st.rp = clamp(st.rp + (Q['Q0.2'] ? 1 : -1) * s, 0, 1);
      if (st.rp > 0.97 && st.row > 0) {
        if (!st.pallet) st.fault = st.fault || 'Row pushed with no pallet: boxes on the floor.';
        const L = Math.round(st.z);
        st.layers[L] = st.layers[L] || [];
        st.layers[L].push(st.row);
        if (st.layers[L].length > 2) st.fault = st.fault || 'Layer overfilled: lower the elevator after 2 rows.';
        st.row = 0;
      }
      // elevator
      if (Q['Q0.3']) { if (st.rp > 0.05) st.fault = st.fault || 'Elevator moved with the row pusher out.'; st.z += 0.5 * s; if (st.z > 3.05) st.fault = st.fault || 'Elevator ran past the bottom.'; }
      // pallet out
      if (Q['Q0.4'] && st.pallet) {
        st.px += 0.5 * s;
        if (st.px >= 1) {
          st.pallet = false; st.px = 0;
          const ok = st.layers.length === 3 && st.layers.every((l) => l && l.length === 2 && l.every((r) => r === 3));
          if (ok) st.pallets++; else { st.bad++; st.last = 'Bad pallet: ' + st.layers.map((l) => (l || []).join('+')).join(' | '); }
          st.layers = []; st.newT = 1500;
        }
      }
      if (!st.pallet && st.newT > 0) { st.newT -= dt; if (st.newT <= 0) { st.pallet = true; st.z = 0; } }
      const o = devices(this, ctrl);
      o['I0.2'] = boxAt ? 1 : 0; o['I0.3'] = st.bp < 0.03 ? 1 : 0; o['I0.4'] = st.bp > 0.97 ? 1 : 0;
      o['I0.5'] = st.rp < 0.03 ? 1 : 0; o['I0.6'] = st.rp > 0.97 ? 1 : 0;
      o['I0.7'] = Math.abs(st.z - Math.round(st.z)) < 0.02 ? 1 : 0; o['I1.0'] = st.pallet ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      // infeed (left, horizontal)
      const ix = 20, iw = 260, iy = 120;
      c.fillStyle = th.metalDark; D.rr(c, ix, iy, iw, 16, 8); c.fill();
      st.q.forEach((x) => { c.fillStyle = th.box; D.rr(c, ix + x * (iw - 40), iy - 30, 36, 30, 3); c.fill(); });
      D.text(c, 'infeed Q0.0', ix, iy + 30, { size: 9, mono: true, color: Q['Q0.0'] ? th.on : th.muted, align: 'left' });
      // row table
      const tx = 300, ty = 80;
      c.fillStyle = th.panel2; D.rr(c, tx, ty, 140, 60, 6); c.fill(); c.strokeStyle = th.line; c.stroke();
      for (let i = 0; i < st.row; i++) { c.fillStyle = th.box; D.rr(c, tx + 6 + i * 44, ty + 12, 40, 36, 3); c.fill(); }
      c.fillStyle = Q['Q0.1'] ? th.amber : th.metal; c.fillRect(tx - 30 + st.bp * 20, ty + 20, 24, 20);
      D.text(c, 'box pusher', tx + 70, ty + 74, { size: 9, mono: true, color: th.muted });
      c.fillStyle = Q['Q0.2'] ? th.amber : th.metal; c.fillRect(tx, ty - 22 + st.rp * 30, 140, 10);
      D.text(c, 'row pusher', tx + 70, ty - 30, { size: 9, mono: true, color: th.muted });
      // pallet (side view)
      const pxx = 300 + st.px * 300, py = 200 + Math.min(3, st.z) * 18;
      if (st.pallet) {
        c.fillStyle = th.wall; c.fillRect(pxx, py + 60, 150, 14);
        st.layers.forEach((l, li) => (l || []).forEach((r, ri) => { for (let k = 0; k < r; k++) { c.fillStyle = th.box; D.rr(c, pxx + 4 + ri * 72 + k * 22, py + 40 - li * 22, 20, 20, 2); c.fill(); } }));
      }
      D.text(c, 'layer ' + Math.min(3, Math.round(st.z)) + '/3', 520, 120, { size: 12, mono: true, weight: 700, color: th.ink });
      D.sensorDot(c, th, 600, 150, !!I['I0.7'], 'at layer I0.7', 'left');
      D.sensorDot(c, th, 600, 172, !!I['I1.0'], 'pallet I1.0', 'left');
      D.text(c, 'pallets ' + st.pallets + '  bad ' + st.bad, 620, 310, { size: 12, mono: true, weight: 700, color: st.bad ? th.red : th.ink, align: 'right' });
      D.lamp(c, th, 40, 40, 10, !!Q['Q0.5'], 'green', 'Full', 'Q0.5');
      D.fault(c, th, st.fault);
    },
  };

  LL.PLANT_ORDER = ['panel', 'motor', 'conveyor', 'tank', 'traffic', 'cylinders', 'garage', 'parking', 'stardelta', 'bottling', 'mixer', 'elevator', 'sorter', 'carwash', 'pumps', 'atank', 'drill', 'oven', 'washer', 'crane', 'indexer', 'greenhouse', 'gate', 'compressor', 'capline', 'palletizer'];

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
    const m = LL.makeMachine(prog);
    const st = plant.init();
    const ctrl = {};
    const dt = 10;
    const never = opts.never || [];
    let t = 0, I = {};
    const name = (a) => (opts.tags && opts.tags[a] ? opts.tags[a] + ' (' + a + ')' : a);
    const val = (a) => (/^I/.test(a) || /^AIW/.test(a) ? (I[a] || 0) : m.read(a));
    const parseConds = (arr) => arr.map((s) => { const [a, v] = s.split('='); return { a: LL.norm(a), v: +v }; });
    const condOk = (cs) => cs.every((x) => val(x.a) === x.v);
    const fmt = (v, a) => (LL.isBitAddr(a) || /^[IQM]\d+\.[0-7]$/.test(a) || /\.(Q|Q1)$/.test(a) ? (v ? 'ON' : 'OFF') : String(v));
    function tick() {
      I = plant.step(st, ctrl, m.outputs(), dt);
      m.setInputs(I);
      m.scan(dt);
      t += dt;
      if (st.fault) throw new Error('Machine fault: ' + st.fault);
      if (m.error) throw new Error('PLC stopped: ' + m.error);
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
          case 'range': {
            const a = LL.norm(p[1]), lo = +p[2], hi = +p[3], v = val(a);
            if (!(v >= lo && v <= hi)) throw new Error(name(a) + ' is ' + v + ', expected between ' + lo + ' and ' + hi + '.');
            break;
          }
          case 'plant': {
            p.slice(1).forEach((cond) => {
              const m2 = /^(\w+)(>=|<=|=|>|<)(-?\d+)$/.exec(cond);
              const v = st[m2[1]], w = +m2[3];
              const ok = { '>=': v >= w, '<=': v <= w, '=': v === w, '>': v > w, '<': v < w }[m2[2]];
              if (!ok) throw new Error('machine check failed: ' + m2[1] + ' is ' + v + ', expected ' + m2[2] + ' ' + w + (st.last ? ' (' + st.last + ')' : '') + '.');
            });
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
    const cond = (s) => { const [a, v] = s.split('='); const bit = LL.isBitAddr(a) || /\.(Q|Q1)$/i.test(a); return n(a) + (!bit ? ' = ' + v : v === '1' ? ' ON' : ' OFF'); };
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
      case 'plant': return 'check the machine: ' + p.slice(1).join(', ');
      case 'range': return 'check ' + n(p[1]) + ' is ' + p[2] + '…' + p[3];
      case 'pulses': return n(p[1]) + ' flashes ' + (p[3] === p[4] ? p[3] : p[3] + '–' + p[4]) + '× in ' + (+p[2] / 1000) + ' s';
    }
    return step;
  };

  LL.runChallenge = function (prog, ch) {
    if (prog.lang === 'st' && !prog.ok) return ch.tests.map((t, i) => ({ name: t.name, ok: false, msg: i === 0 ? 'Fix the compile error first: line ' + prog.error.line + ': ' + prog.error.msg : 'Not run.' }));
    const errs = prog.lang === 'st' ? [] : LL.lint(prog).filter((x) => x.level === 'error');
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
