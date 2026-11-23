/* PLC Start extra machine: the valve test bench. Three cylinders, three kinds of valve, so the program must fit
 * the valve:
 *   A: 5/2 bistable (Y1 out, Y2 back): a pulse is enough, the valve remembers. Never both coils.
 *   B: 5/3 closed centre (Y3 out, Y4 back): both coils off = the cylinder stops where it is.
 *   C: vertical lift with a load on a 5/3 closed centre (Y5 up, Y6 down): both off = it holds the load.
 * Same pattern as plants.js. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const P = LL.Plants, D = LL.Draw, devices = LL.plantDevices;
  if (!P || !D) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  P.valvebench = {
    id: 'valvebench', name: 'Valve test bench', blurb: 'Three cylinders on three kinds of valve: A on a 5/2 bistable, B on a 5/3 closed centre, C a vertical lift with a load on a 5/3 closed centre.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'A0 A back', kind: 'sensor' },
      { addr: 'I0.3', name: 'A1 A out', kind: 'sensor' },
      { addr: 'I0.4', name: 'B0 B back', kind: 'sensor' },
      { addr: 'I0.5', name: 'B1 B out', kind: 'sensor' },
      { addr: 'I0.6', name: 'C0 lift up', kind: 'sensor' },
      { addr: 'I0.7', name: 'C1 lift down', kind: 'sensor' },
      { addr: 'I1.0', name: 'Jog UP', kind: 'pb', color: 'black' },
      { addr: 'I1.1', name: 'Jog DOWN', kind: 'pb', color: 'black' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Y1 A out (14)', color: 'blue' },
      { addr: 'Q0.1', name: 'Y2 A back (12)', color: 'blue' },
      { addr: 'Q0.2', name: 'Y3 B out (14)', color: 'green' },
      { addr: 'Q0.3', name: 'Y4 B back (12)', color: 'green' },
      { addr: 'Q0.4', name: 'Y5 lift up', color: 'amber' },
      { addr: 'Q0.5', name: 'Y6 lift down', color: 'amber' },
      { addr: 'Q0.6', name: 'Alarm lamp', color: 'red' },
    ],
    actions: [
      { id: 'air', label: 'Shut off the air', toggle: true, run(st) { st.noAir = !st.noAir; } },
      { id: 'leakC', label: 'Lift valve C leaks (the load creeps down)', toggle: true, run(st) { st.leakC = !st.leakC; } },
    ],
    init() { return { a: 0, va: 0, b: 0, c: 0, bothA: 0, bothB: 0, bothC: 0, bPct: 0, cPct: 0, t: 0 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const s = dt / 1000, air = !st.noAir;
      // A: bistable 5/2. The spool keeps its last position; both coils = it stays (and that is a fault in the program).
      if (Q['Q0.0'] && Q['Q0.1']) st.bothA = 1;
      else if (Q['Q0.0']) st.va = 1; else if (Q['Q0.1']) st.va = 0;
      if (air) st.a = clamp(st.a + (st.va ? 1 : -1) * s * 1.0, 0, 1);
      // B: 5/3 closed centre. One coil = move, none or both = centre = stop and hold.
      if (Q['Q0.2'] && Q['Q0.3']) st.bothB = 1;
      const db = Q['Q0.2'] && !Q['Q0.3'] ? 1 : Q['Q0.3'] && !Q['Q0.2'] ? -1 : 0;
      if (air) st.b = clamp(st.b + db * s / 1.6, 0, 1);
      // C: vertical lift on a 5/3 closed centre, 0 = up, 1 = down. Held by trapped air; a leaking valve lets it creep.
      if (Q['Q0.4'] && Q['Q0.5']) st.bothC = 1;
      const dc = Q['Q0.5'] && !Q['Q0.4'] ? 1 : Q['Q0.4'] && !Q['Q0.5'] ? -1 : 0;
      if (air) st.c = clamp(st.c + dc * s / 2, 0, 1);
      if ((st.leakC || !air) && dc === 0 && st.c < 1) st.c = clamp(st.c + s * 0.02, 0, 1);
      st.bPct = Math.round(st.b * 100); st.cPct = Math.round(st.c * 100);
      const o = devices(this, ctrl);
      o['I0.2'] = st.a < 0.03 ? 1 : 0; o['I0.3'] = st.a > 0.97 ? 1 : 0;
      o['I0.4'] = st.b < 0.03 ? 1 : 0; o['I0.5'] = st.b > 0.97 ? 1 : 0;
      o['I0.6'] = st.c < 0.03 ? 1 : 0; o['I0.7'] = st.c > 0.97 ? 1 : 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      // a horizontal cylinder: barrel, piston, rod, two sensors, and its valve with two coil lamps
      const horiz = (y, pos, name, label, y14, y12, s0, s1, both, col) => {
        const x = 40, L = 220, rod = pos * 120;
        c.fillStyle = th.metal; D.rr(c, x, y - 18, L, 36, 5); c.fill();
        c.fillStyle = th.glass; c.fillRect(x + 8, y - 12, L - 16, 24);
        const px = x + 14 + pos * (L - 44);
        c.fillStyle = th.metalDark; c.fillRect(px, y - 14, 10, 28); c.fillRect(px + 10, y - 4, L - 24 + rod - pos * (L - 44), 8);
        c.fillStyle = col; D.rr(c, x + L + rod - 4, y - 14, 14, 28, 3); c.fill();
        D.sensorDot(c, th, x + 20, y - 30, !!I[s0], s0.replace('I', 'I'));
        D.sensorDot(c, th, x + L - 20, y - 30, !!I[s1], s1);
        D.text(c, name, x, y + 34, { size: 12, weight: 700, color: th.ink, align: 'left' });
        D.text(c, label, x + 70, y + 34, { size: 11, color: th.muted, align: 'left' });
        // the valve: two coil lamps
        D.tag(c, th, x + L + 95, y - 10, y14[1] + ' ' + y14[0], !!Q[y14[0]]);
        D.tag(c, th, x + L + 95, y + 14, y12[1] + ' ' + y12[0], !!Q[y12[0]]);
        if (both) D.text(c, 'both coils were ON', x + L + 95, y + 36, { size: 10, mono: true, weight: 700, color: th.red });
      };
      horiz(70, st.a, 'Cylinder A', '5/2 bistable: remembers', ['Q0.0', 'Y1'], ['Q0.1', 'Y2'], 'I0.2', 'I0.3', st.bothA, th.blue);
      horiz(190, st.b, 'Cylinder B', '5/3 closed centre: stops', ['Q0.2', 'Y3'], ['Q0.3', 'Y4'], 'I0.4', 'I0.5', st.bothB, th.green);
      D.text(c, 'B at ' + st.bPct + ' %', 300, 236, { size: 11, mono: true, color: th.muted, align: 'left' });
      // C: the vertical lift with its load
      const x = 530, top = 40, L = 150, pos = st.c;
      c.fillStyle = th.metal; D.rr(c, x - 18, top, 36, L, 5); c.fill();
      c.fillStyle = th.glass; c.fillRect(x - 12, top + 8, 24, L - 16);
      const py = top + 10 + pos * (L - 34);
      c.fillStyle = th.metalDark; c.fillRect(x - 14, py, 28, 10); c.fillRect(x - 4, py + 10, 8, top + L - py - 10 + pos * 100 + 30);
      const ly = top + L + 30 + pos * 100;
      c.fillStyle = th.amber; D.rr(c, x - 34, ly, 68, 34, 4); c.fill();
      D.text(c, 'load', x, ly + 21, { size: 11, weight: 700, color: '#161a1d' });
      D.sensorDot(c, th, x + 34, top + 16, !!I['I0.6'], 'C0 up');
      D.sensorDot(c, th, x + 34, top + L - 18, !!I['I0.7'], 'C1 down');
      D.text(c, 'Lift C', x - 40, top + 8, { size: 12, weight: 700, color: th.ink, align: 'right' });
      D.text(c, '5/3 closed centre', x - 40, top + 24, { size: 11, color: th.muted, align: 'right' });
      D.tag(c, th, x - 90, top + 50, 'Y5 up Q0.4', !!Q['Q0.4']);
      D.tag(c, th, x - 90, top + 74, 'Y6 down Q0.5', !!Q['Q0.5']);
      D.text(c, 'lift at ' + st.cPct + ' %', x - 90, top + 98, { size: 11, mono: true, color: th.muted });
      if (st.bothC) D.text(c, 'both coils were ON', x - 90, top + 116, { size: 10, mono: true, weight: 700, color: th.red });
      D.lamp(c, th, 610, 330, 8, !!Q['Q0.6'], 'red', '', 'alarm');
      if (st.noAir) D.text(c, 'AIR OFF', 320, 20, { size: 13, mono: true, weight: 700, color: th.red });
    },
  };
  LL.PLANT_ORDER.push('valvebench');
})(typeof window !== 'undefined' ? window : globalThis);
