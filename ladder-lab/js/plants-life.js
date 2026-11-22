/* PLC Start extra machine: a remote device that echoes a life word. The PLC sends a counter (LifeWord, AQW30);
 * the device copies it back (LifeWordReply, AIW30) after a short transport delay. A second channel does the same
 * on AQW31 / AIW31 (for example an HMI panel). Faults: the device freezes, answers only every 2 s, or the cable is
 * cut (the reply reads 0). Same pattern as plants.js. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const P = LL.Plants, D = LL.Draw, devices = LL.plantDevices;
  if (!P || !D) return;
  const DELAY = 60;                                                        // ms from the PLC output to the echo
  const chan = () => ({ q: [], echo: 0, lvl: 500, lastCopy: -1e9 });
  // the device answers with the echo and (channel 1) the tower level it measures
  function deliver(c, st, out, mode, lvl) {
    if (mode === 'freeze') return;
    const every = mode === 'slow' ? 2000 : mode === 'lag' ? 700 : 0;
    if (every && st.t - c.lastCopy < every) return;
    if (every) c.lastCopy = st.t;
    c.q.push([st.t + DELAY, out, lvl]);
  }
  function arrive(c, t) { while (c.q.length && c.q[0][0] <= t) { const m = c.q.shift(); c.echo = m[1]; c.lvl = m[2]; } }
  P.remote = {
    id: 'remote', name: 'Remote device: life word echo', blurb: 'A remote device on the network copies your life word back. LifeWord goes out on AQW30, the echo comes back on AIW30 a little later. A second channel does the same on AQW31 / AIW31. Make it freeze, answer slowly or cut the cable, and see if your watchdog notices.',
    inputs: [
      { addr: 'I0.0', name: 'RESET', kind: 'pb', color: 'blue' },
      { addr: 'I0.1', name: 'START (pump in auto)', kind: 'pb', color: 'green' },
      { addr: 'I0.2', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'AIW30', name: 'LifeWordReply (echo, channel 1)', kind: 'sensor', note: 'The remote device copies AQW30 back here, about 60 ms later' },
      { addr: 'AIW31', name: 'Echo of channel 2', kind: 'sensor', note: 'The second device copies AQW31 back here' },
      { addr: 'AIW32', name: 'Tower level (per mille, by radio)', kind: 'sensor', note: '0 to 1000 = 0 to 100 %. Measured at the tower, sent with the echo: it freezes when the link freezes, and reads 0 when the cable is cut' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'CommError channel 1', color: 'red' },
      { addr: 'Q0.1', name: 'CommError channel 2', color: 'red' },
      { addr: 'Q0.2', name: 'Pump to the water tower', color: 'green' },
      { addr: 'Q0.3', name: 'Warning: link slow', color: 'amber' },
      { addr: 'AQW30', name: 'LifeWord to the remote device', color: 'blue' },
      { addr: 'AQW31', name: 'Life word, channel 2', color: 'blue' },
    ],
    actions: [
      { id: 'freeze', label: 'Remote freezes (the echo stops changing)', toggle: true, run(st) { st.m1 = st.m1 === 'freeze' ? 'ok' : 'freeze'; } },
      { id: 'slow', label: 'Remote slow (answers every 2 s)', toggle: true, run(st) { st.m1 = st.m1 === 'slow' ? 'ok' : 'slow'; } },
      { id: 'cut', label: 'Cable cut (the echo reads 0)', toggle: true, run(st) { st.m1 = st.m1 === 'cut' ? 'ok' : 'cut'; } },
      { id: 'lag', label: 'Radio link poor (answers every 0.7 s)', toggle: true, run(st) { st.m1 = st.m1 === 'lag' ? 'ok' : 'lag'; } },
      { id: 'freeze2', label: 'Channel 2 freezes', toggle: true, run(st) { st.m2 = st.m2 === 'freeze' ? 'ok' : 'freeze'; } },
    ],
    init() { return { t: 0, m1: 'ok', m2: 'ok', c1: chan(), c2: chan(), maxLife: 0, wrapped: 0, prevLife: 0, lvl: 50, lvlMax: 50 }; },
    step(st, ctrl, Q, dt) {
      st.t += dt;
      const l1 = Q['AQW30'] | 0, l2 = Q['AQW31'] | 0;
      if (l1 > st.maxLife) st.maxLife = l1;
      if (st.prevLife >= 590 && l1 < 10) st.wrapped = 1;
      st.prevLife = l1;
      // the water tower: the pump fills 4 %/s, the town takes 1 %/s
      st.lvl = Math.max(0, st.lvl + ((Q['Q0.2'] ? 4 : 0) - 1) * dt / 1000);
      if (st.lvl > st.lvlMax) st.lvlMax = st.lvl;
      if (st.lvl >= 100 && !st.fault) st.fault = 'The water tower overflowed: the pump ran on old level data';
      deliver(st.c1, st, l1, st.m1, Math.round(st.lvl * 10)); deliver(st.c2, st, l2, st.m2);
      arrive(st.c1, st.t); arrive(st.c2, st.t);
      const o = devices(this, ctrl);
      o['AIW30'] = st.m1 === 'cut' ? 0 : st.c1.echo;
      o['AIW31'] = st.c2.echo;
      o['AIW32'] = st.m1 === 'cut' ? 0 : st.c1.lvl || 0;
      return o;
    },
    draw(c, st, th, Q, I) {
      const box = (x, y, w, h, title, sub) => { c.fillStyle = th.panel; D.rr(c, x, y, w, h, 8); c.fill(); c.strokeStyle = th.line; c.lineWidth = 2; c.stroke(); D.text(c, title, x + w / 2, y + 22, { size: 13, weight: 700, color: th.ink }); if (sub) D.text(c, sub, x + w / 2, y + 40, { size: 10, color: th.muted }); };
      box(30, 30, 170, 150, 'PLC', 'your program');
      box(440, 30, 170, 150, 'Remote device', st.m1 === 'freeze' ? 'FROZEN' : st.m1 === 'slow' ? 'answers every 2 s' : st.m1 === 'lag' ? 'poor radio: every 0.7 s' : st.m1 === 'cut' ? 'not reachable' : 'echoes the value');
      const lane = (y, label, val, dir, ok) => {
        c.strokeStyle = ok ? th.blue : th.red; c.lineWidth = 3; c.setLineDash(ok ? [] : [6, 6]);
        c.beginPath(); c.moveTo(205, y); c.lineTo(435, y); c.stroke(); c.setLineDash([]);
        const tip = dir > 0 ? 435 : 205; c.fillStyle = ok ? th.blue : th.red; c.beginPath(); c.moveTo(tip, y); c.lineTo(tip - dir * 10, y - 6); c.lineTo(tip - dir * 10, y + 6); c.fill();
        const k = ((st.t / 700) % 1), x = dir > 0 ? 210 + k * 220 : 430 - k * 220;
        if (ok) { c.fillStyle = th.blue; D.rr(c, x - 18, y - 22, 36, 16, 3); c.fill(); D.text(c, String(val), x, y - 10, { size: 10, mono: true, weight: 700, color: '#fff' }); }
        D.text(c, label, 320, y + 18, { size: 11, mono: true, color: th.muted });
      };
      lane(80, 'LifeWord AQW30 = ' + (Q['AQW30'] | 0), Q['AQW30'] | 0, 1, true);
      lane(150, 'LifeWordReply AIW30 = ' + (I['AIW30'] | 0), I['AIW30'] | 0, -1, st.m1 !== 'cut');
      if (st.m1 === 'cut') { c.strokeStyle = th.red; c.lineWidth = 3; c.beginPath(); c.moveTo(310, 140); c.lineTo(330, 160); c.moveTo(330, 140); c.lineTo(310, 160); c.stroke(); }
      // water tower at the remote side
      const tx = 470, ty = 268, th2 = 70;
      c.strokeStyle = th.line; c.lineWidth = 2; c.strokeRect(tx, ty - th2, 60, th2);
      c.fillStyle = th.water; c.fillRect(tx + 2, ty - th2 * Math.min(1, st.lvl / 100), 56, th2 * Math.min(1, st.lvl / 100));
      D.text(c, 'tower ' + Math.round(st.lvl) + ' %', tx + 30, ty + 14, { size: 10, mono: true, color: th.muted });
      D.text(c, 'PLC sees ' + Math.round((I['AIW32'] | 0) / 10) + ' %', tx + 120, ty - 30, { size: 10, mono: true, color: th.muted });
      D.lamp(c, th, 300, 270, 10, !!Q['Q0.2'], 'green', '', 'pump');
      D.lamp(c, th, 360, 270, 8, !!Q['Q0.3'], 'amber', '', 'link slow');
      D.lamp(c, th, 80, 270, 10, !!Q['Q0.0'], 'red', '', 'CommError 1');
      D.lamp(c, th, 200, 270, 10, !!Q['Q0.1'], 'red', '', 'CommError 2');
      D.text(c, 'channel 2: AQW31 = ' + (Q['AQW31'] | 0) + ' → AIW31 = ' + (I['AIW31'] | 0) + (st.m2 === 'freeze' ? '  (frozen)' : ''), 140, 340, { size: 10, mono: true, color: th.muted });
    },
  };
  LL.PLANT_ORDER.push('remote');
})(typeof window !== 'undefined' ? window : globalThis);
