/* Ladder Lab extra machines: three classic reduced-voltage starters for a 3-phase motor.
 * resstart  = stator resistance starter (line contactor + bypass contactor over the resistors)
 * autotrafo = autotransformer starter, closed transition (transformer, star point, run contactor)
 * rotorres  = slip-ring motor with rotor resistance cut out in three steps
 * Same pattern as plants.js. One small per-unit motor model: torque from the Kloss formula, current from the slip. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const P = LL.Plants, D = LL.Draw, devices = LL.plantDevices;
  if (!P || !D) return;
  const Idol = (s) => { s = Math.max(0, Math.min(1, s)); const g = s * 1.033 / Math.sqrt(s * s + 0.0676); return Math.sqrt(36 * g * g + 0.09); };   // 6 × rated at standstill
  const Tdol = (s) => { s = Math.max(0.004, Math.min(1, s)); return 5 / (s / 0.2 + 0.2 / s); };                                               // breakdown 2.5 × at slip 0.2
  const base = () => ({ n: 0, I: 0, ang: 0, peak: 0, speed: 0, peak10: 0, heat: 0, heatPct: 0, tripped: false, fault: null, bad: 0, hist: [], tt: 0 });
  const trip = { id: 'trip', label: 'Overload relay trips; again = reset', toggle: true, run(st) { st.tripped = !st.tripped; } };
  function setFault(st, msg) { if (!st.fault) { st.fault = msg; st.bad = 1; } }
  // one step of the motor: e = { I, T } when it has power, null when not
  function turn(st, dt, e, TL, J) {
    const h = dt / 1000;
    if (e) {
      if (st.I === 0 && st.n < 0.02) st.peak = 0;
      st.I = e.I; const acc = (e.T - TL) / J;
      st.n = st.n <= 0 && acc < 0 ? 0 : Math.max(0, Math.min(1, st.n + acc * h));
    } else { st.I = 0; st.n = Math.max(0, st.n - ((TL + 0.05) / J) * h); }
    st.peak = Math.max(st.peak, st.I); st.ang += st.n * h * 11;
    st.speed = Math.round(st.n * 100); st.peak10 = Math.round(st.peak * 10);
    st.tt += dt; if (st.tt >= 100) { st.tt = 0; st.hist.push(st.I); if (st.hist.length > 140) st.hist.shift(); }
  }
  // ───────── drawing helpers ─────────
  function wire(c, th, pts, on) {
    c.strokeStyle = on ? th.on : th.line; c.lineWidth = on ? 4 : 2.5; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
  }
  function box(c, th, x, y, w, h, label, sub, on, hot) {
    c.fillStyle = hot ? th.red : th.panel2; D.rr(c, x - w / 2, y - h / 2, w, h, 6); c.fill();
    c.strokeStyle = on ? th.on : th.line; c.lineWidth = 2; c.stroke();
    D.text(c, label, x, y - (sub ? 5 : 0), { size: 12, weight: 700, color: hot ? '#fff' : th.ink });
    if (sub) D.text(c, sub, x, y + 10, { size: 9, mono: true, weight: 600, color: hot ? '#fff' : on ? th.on : th.muted });
  }
  function motor(c, th, st, x, y, r, label) {
    c.fillStyle = th.metal; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.strokeStyle = st.I > 0.05 ? th.on : th.line; c.lineWidth = 3; c.stroke();
    c.save(); c.translate(x, y); c.rotate(st.ang); c.fillStyle = th.metalDark;
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); D.rr(c, -4, r * 0.18, 8, r * 0.66, 3); c.fill(); }
    c.restore();
    D.text(c, Math.round(st.n * 1480) + ' rpm', x, y + r + 16, { size: 13, mono: true, weight: 700, color: th.ink });
    if (label) D.text(c, label, x, y + r + 32, { size: 10, color: th.muted });
  }
  function meter(c, th, st, x, y, limit) {
    const a = Math.min(st.I, 7) / 7, lim = limit / 7;
    c.lineCap = 'butt'; c.strokeStyle = th.line; c.lineWidth = 10; c.beginPath(); c.arc(x, y, 44, Math.PI, 0); c.stroke();
    c.strokeStyle = th.red; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 52, Math.PI + lim * Math.PI, 0); c.stroke();
    c.strokeStyle = st.I > limit ? th.red : st.I > 2.5 ? th.amber : th.on; c.lineWidth = 10; c.beginPath(); c.arc(x, y, 44, Math.PI, Math.PI + a * Math.PI); c.stroke();
    D.text(c, st.I.toFixed(1) + ' × In', x, y - 10, { size: 14, mono: true, weight: 700, color: th.ink });
    D.text(c, 'line current   peak ' + st.peak.toFixed(1) + ' ×', x, y + 14, { size: 10, color: th.muted });
  }
  function trend(c, th, st, x, y, w, h, limit) {
    c.fillStyle = th.panel2; D.rr(c, x, y, w, h, 6); c.fill();
    const Y = (i) => y + h - 4 - (Math.min(i, 7) / 7) * (h - 8);
    c.strokeStyle = th.line; c.lineWidth = 1; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(x + 4, Y(1)); c.lineTo(x + w - 4, Y(1)); c.stroke();
    c.strokeStyle = th.red; c.beginPath(); c.moveTo(x + 4, Y(limit)); c.lineTo(x + w - 4, Y(limit)); c.stroke(); c.setLineDash([]);
    if (st.hist.length > 1) {
      c.strokeStyle = th.blue; c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath();
      st.hist.forEach((v, i) => { const px = x + 4 + (i / 139) * (w - 8); i ? c.lineTo(px, Y(v)) : c.moveTo(px, Y(v)); }); c.stroke();
    }
    D.text(c, 'current, last 14 s (dashes: 1 × rated, red: breaker)', x + w / 2, y + h + 12, { size: 9, color: th.muted });
  }
  function supply(c, th, x1, x2, y) { wire(c, th, [[x1, y], [x2, y]], true); D.text(c, '3 × 400 V', (x1 + x2) / 2, y - 12, { size: 10, mono: true, color: th.muted }); }
  function common(c, th, st, Q, lampAddr) {
    D.lamp(c, th, 600, 36, 10, !!Q[lampAddr], 'red', 'Fault', lampAddr);
    if (st.tripped) D.text(c, 'OL TRIPPED', 560, 78, { size: 10, mono: true, weight: 700, color: th.red });
    D.fault(c, th, st.fault);
  }

  // ───────────────────────── stator resistance starter ─────────────────────────
  P.resstart = {
    id: 'resstart', name: 'Stator resistance starter', blurb: 'A fan motor started through three power resistors. The line contactor KM1 feeds the motor through the resistors, so it gets less voltage and takes less current. A few seconds later the bypass contactor KM2 bridges the resistors. They are made for a short start only: if KM2 does not close, they burn.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'OL ok', kind: 'sensor', note: 'Overload relay: 1 = healthy' },
      { addr: 'I0.3', name: 'KM2 closed', kind: 'sensor', note: 'Auxiliary contact of the bypass contactor' },
      { addr: 'I0.4', name: 'RESET', kind: 'pb', color: 'blue' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'KM1 line contactor', color: 'green' },
      { addr: 'Q0.1', name: 'KM2 bypass contactor', color: 'blue' },
      { addr: 'Q0.2', name: 'Fault lamp', color: 'red' },
    ],
    actions: [trip, { id: 'deadK2', label: 'Bypass coil broken (KM2 does not close); again = repaired', toggle: true, run(st) { st.deadK2 = !st.deadK2; } }, { id: 'weldK2', label: 'Bypass contacts welded (KM2 stays closed); again = replaced', toggle: true, run(st) { st.weldK2 = !st.weldK2; } }],
    init() { return Object.assign(base(), { deadK2: false, weldK2: false, k2: 0 }); },
    step(st, ctrl, Q, dt) {
      const h = dt / 1000, k1 = !!Q['Q0.0'], k2 = (!!Q['Q0.1'] && !st.deadK2) || !!st.weldK2;
      st.k2 = k2 ? 1 : 0;
      if (k1 && k2 && st.n < 0.5 && !st.tripped) setFault(st, 'Bypass closed too early: full-voltage inrush tripped the breaker.');
      const pow = !st.fault && !st.tripped && k1, s = 1 - st.n, TL = 0.08 + 0.82 * st.n * st.n;
      let e = null;
      if (pow && k2) e = { I: Idol(s), T: Tdol(s) };
      else if (pow) { const u = 0.62 + 0.3 * st.n; e = { I: u * Idol(s), T: u * u * Tdol(s) }; }
      turn(st, dt, e, TL, 2);
      st.heat = pow && !k2 ? st.heat + (st.I * st.I + 8) * h : Math.max(0, st.heat - 10 * h);
      st.heatPct = Math.round(Math.min(100, (st.heat / 130) * 100));
      if (st.heat >= 130) setFault(st, 'Start resistors burnt: they are made for a short start only.');
      const o = devices(this, ctrl);
      o['I0.2'] = st.tripped ? 0 : 1; o['I0.3'] = st.k2;
      return o;
    },
    draw(c, st, th, Q) {
      const k1 = !!Q['Q0.0'], k2 = !!st.k2, live = k1 && !st.fault && !st.tripped;
      supply(c, th, 60, 250, 36);
      wire(c, th, [[110, 36], [110, 58]], true); D.contactor(c, th, 110, 80, 'KM1', k1, '');
      wire(c, th, [[110, 102], [110, 140]], live); box(c, th, 110, 165, 64, 50, 'R', st.heatPct + ' % hot', live && !k2, st.heatPct > 85);
      wire(c, th, [[110, 190], [110, 235], [262, 235]], live && !k2);
      wire(c, th, [[110, 122], [215, 122], [215, 143]], live); D.contactor(c, th, 215, 165, 'KM2', k2, '');
      wire(c, th, [[215, 187], [215, 235], [262, 235]], live && k2);
      D.text(c, 'line Q0.0', 62, 80, { size: 9, color: th.muted }); D.text(c, 'bypass Q0.1', 215, 208, { size: 9, color: th.muted });
      D.text(c, 'resistors', 46, 165, { size: 9, color: th.muted });
      motor(c, th, st, 310, 215, 46, 'fan motor');
      meter(c, th, st, 500, 110, 5); trend(c, th, st, 400, 150, 200, 80, 5);
      common(c, th, st, Q, 'Q0.2');
    },
  };

  // ───────────────────────── autotransformer starter ─────────────────────────
  P.autotrafo = {
    id: 'autotrafo', name: 'Autotransformer starter', blurb: 'A big compressor motor on a weak supply. To start, KM3 closes the star point of the autotransformer and KM2 connects it to the line: the motor gets 65 % voltage from the tap, and the supply sees only 42 % of the direct current. Then KM3 opens, the run contactor KM1 closes, and KM2 opens. KM1 and KM3 must never be closed together.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'OL ok', kind: 'sensor', note: 'Overload relay: 1 = healthy' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'KM1 run contactor', color: 'green' },
      { addr: 'Q0.1', name: 'KM2 transformer contactor', color: 'blue' },
      { addr: 'Q0.2', name: 'KM3 star point contactor', color: 'amber' },
      { addr: 'Q0.3', name: 'Fault lamp', color: 'red' },
    ],
    actions: [trip],
    init() { return base(); },
    step(st, ctrl, Q, dt) {
      const h = dt / 1000, k1 = !!Q['Q0.0'], k2 = !!Q['Q0.1'], k3 = !!Q['Q0.2'];
      if (k1 && k3) setFault(st, 'Short circuit: run contactor and star point closed together.');
      if (k1 && st.n < 0.5 && !st.tripped) setFault(st, 'Full voltage too early: the inrush current tripped the breaker.');
      const pow = !st.fault && !st.tripped, s = 1 - st.n, TL = 0.25 + 0.5 * st.n * st.n;
      let e = null;
      if (pow && k1) e = { I: Idol(s), T: Tdol(s) };
      else if (pow && k2 && k3) e = { I: 0.4225 * Idol(s), T: 0.4225 * Tdol(s) };
      else if (pow && k2) e = { I: 0.85 * Idol(s), T: 0.72 * Tdol(s) };
      turn(st, dt, e, TL, 1.6);
      st.heat = k2 && pow ? st.heat + 10 * h : Math.max(0, st.heat - 8 * h);
      st.heatPct = Math.round(Math.min(100, st.heat));
      if (st.heat >= 100) setFault(st, 'Autotransformer overheated: switch it off after the start.');
      const o = devices(this, ctrl);
      o['I0.2'] = st.tripped ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q) {
      const k1 = !!Q['Q0.0'], k2 = !!Q['Q0.1'], k3 = !!Q['Q0.2'], ok = !st.fault && !st.tripped;
      supply(c, th, 50, 250, 36);
      wire(c, th, [[90, 36], [90, 58]], true); D.contactor(c, th, 90, 80, 'KM2', k2, '');
      wire(c, th, [[90, 102], [90, 135]], ok && k2); box(c, th, 90, 160, 70, 50, 'T1  65 %', st.heatPct + ' % hot', ok && k2, st.heatPct > 85);
      wire(c, th, [[90, 185], [90, 218]], ok && k2 && k3); D.contactor(c, th, 90, 240, 'KM3', k3, '');
      wire(c, th, [[78, 268], [102, 268]], false); wire(c, th, [[83, 274], [97, 274]], false);
      wire(c, th, [[205, 36], [205, 58]], true); D.contactor(c, th, 205, 80, 'KM1', k1, '');
      wire(c, th, [[205, 102], [205, 160], [262, 160]], ok && k1);
      wire(c, th, [[125, 160], [205, 160]], ok && k2 && !k1); if (ok && k2 && !k1) wire(c, th, [[205, 160], [262, 160]], true);
      D.text(c, 'transformer Q0.1', 90, 114, { size: 9, color: th.muted }); D.text(c, 'star point Q0.2', 152, 244, { size: 9, color: th.muted });
      D.text(c, 'run Q0.0', 205, 114, { size: 9, color: th.muted }); D.text(c, 'tap', 160, 152, { size: 9, color: th.muted });
      motor(c, th, st, 310, 160, 46, 'compressor motor');
      meter(c, th, st, 500, 110, 5); trend(c, th, st, 400, 150, 200, 80, 5);
      common(c, th, st, Q, 'Q0.3');
    },
  };

  // ───────────────────────── slip-ring motor with rotor resistance ─────────────────────────
  P.rotorres = {
    id: 'rotorres', name: 'Slip-ring motor with rotor resistance', blurb: 'A stone crusher that starts fully loaded. A slip-ring motor has its rotor winding brought out on three rings. Resistors in the rotor circuit give a high torque with a low current. KM1 starts the motor with all resistance in; then K11, K12 and K13 bridge the resistors one step after the other. A step that comes too early makes a current surge.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'OL ok', kind: 'sensor', note: 'Overload relay: 1 = healthy' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'KM1 line contactor', color: 'green' },
      { addr: 'Q0.1', name: 'K11 bridges step 1', color: 'blue' },
      { addr: 'Q0.2', name: 'K12 bridges step 2', color: 'blue' },
      { addr: 'Q0.3', name: 'K13 bridges step 3', color: 'blue' },
      { addr: 'Q0.4', name: 'Fault lamp', color: 'red' },
    ],
    actions: [trip],
    init() { return base(); },
    step(st, ctrl, Q, dt) {
      const h = dt / 1000, k1 = !!Q['Q0.0'], s1 = !!Q['Q0.1'], s2 = !!Q['Q0.2'], s3 = !!Q['Q0.3'];
      const pow = !st.fault && !st.tripped && k1, f = s3 ? 1 : s2 ? 0.45 : s1 ? 0.2 : 0.08, e0 = (1 - st.n) * f;
      let e = pow ? { I: Idol(e0), T: Tdol(e0) } : null;
      if (e && e.I > 3.6) { setFault(st, 'Current surge: rotor resistance cut out too early. Breaker tripped.'); st.peak = Math.max(st.peak, e.I); e = null; }
      turn(st, dt, e, 0.8, 1.6);
      st.heat = pow && !s3 ? st.heat + (2 * st.I * st.I + 3) * h : Math.max(0, st.heat - 8 * h);
      st.heatPct = Math.round(Math.min(100, st.heat));
      if (st.heat >= 100) setFault(st, 'Rotor resistors overheated: bridge all steps after the start.');
      const o = devices(this, ctrl);
      o['I0.2'] = st.tripped ? 0 : 1;
      return o;
    },
    draw(c, st, th, Q) {
      const k1 = !!Q['Q0.0'], live = k1 && !st.fault && !st.tripped, br = [!!Q['Q0.1'], !!Q['Q0.2'], !!Q['Q0.3']];
      supply(c, th, 40, 140, 36);
      wire(c, th, [[80, 36], [80, 58]], true); D.contactor(c, th, 80, 80, 'KM1', k1, '');
      wire(c, th, [[80, 102], [80, 170]], live); D.text(c, 'line Q0.0', 130, 108, { size: 9, color: th.muted });
      motor(c, th, st, 80, 212, 42, 'slip-ring motor, crusher');
      wire(c, th, [[122, 212], [160, 212]], live); D.text(c, 'slip rings', 142, 228, { size: 9, color: th.muted });
      [0, 1, 2].forEach((i) => {
        const x = 190 + i * 66, on = br[i] || (i < 2 && br[2]) || (i < 1 && br[1]);
        box(c, th, x, 212, 50, 34, 'R' + (i + 1), on ? 'bridged' : 'in', live && !on, !on && st.heatPct > 85);
        wire(c, th, [[x + 25, 212], [x + 41, 212]], live);
        wire(c, th, [[x - 27, 212], [x - 27, 150], [x - 18, 150]], live && on); wire(c, th, [[x + 18, 150], [x + 27, 150], [x + 27, 212]], live && on);
        D.contactor(c, th, x, 150, 'K1' + (i + 1), br[i], ''); D.text(c, 'Q0.' + (i + 1), x, 116, { size: 9, mono: true, color: th.muted });
      });
      wire(c, th, [[363, 200], [363, 224]], false); wire(c, th, [[369, 205], [369, 219]], false);
      D.text(c, 'rotor resistors ' + st.heatPct + ' % hot', 256, 250, { size: 10, mono: true, color: st.heatPct > 85 ? th.red : th.muted });
      meter(c, th, st, 500, 110, 3.6); trend(c, th, st, 400, 150, 200, 80, 3.6);
      common(c, th, st, Q, 'Q0.4');
    },
  };

  LL.PLANT_ORDER.push('resstart', 'autotrafo', 'rotorres');
})(typeof window !== 'undefined' ? window : globalThis);
