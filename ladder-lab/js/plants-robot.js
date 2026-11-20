/* PLC Start extra machine: robot cell. A robot loads raw parts into a machine and unloads the finished ones.
 * The PLC does not move the robot. It talks to the robot controller with a handshake: START + job number out,
 * READY / HOME / BUSY / DONE / CLEAR / FAULT back. The PLC owns the machine door and the machine cycle, so the
 * classic mistakes are real here: a door that closes on the arm, a machine that starts with the robot inside.
 * Same pattern as plants.js. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const P = LL.Plants, D = LL.Draw, devices = LL.plantDevices;
  if (!P || !D) return;
  const HOME = [320, 205], INF = [150, 205], MACH = [320, 92], OUT = [490, 205];
  // a job is a list of moves: [target point, seconds, action at the end]
  const JOBS = {
    0: [[INF, 0.8, 'pick-in'], [MACH, 1.0, 'place-m'], [HOME, 1.0, '']],   // LOAD
    1: [[MACH, 1.0, 'pick-m'], [OUT, 1.0, 'place-out'], [HOME, 0.8, '']],  // UNLOAD
  };
  const crash = (st, msg) => { if (!st.fault) { st.fault = msg; st.bad = 1; } };
  P.robotcell = {
    id: 'robotcell', name: 'Robot cell: machine tending', blurb: 'A robot takes raw parts from the infeed, loads them into a machine and unloads the finished parts. The robot has its own controller and its own programs (jobs). Your PLC only <b>talks</b> to it: START and a job number out, READY, HOME, BUSY, DONE and CLEAR back. The PLC owns the machine door and the machine cycle. If the door closes while the arm is inside, or the machine starts with the robot in it, there is a crash.',
    inputs: [
      { addr: 'I0.0', name: 'START', kind: 'pb', color: 'green' },
      { addr: 'I0.1', name: 'STOP', kind: 'pbnc', color: 'red' },
      { addr: 'I0.2', name: 'Part at infeed', kind: 'sensor' },
      { addr: 'I0.3', name: 'Door open', kind: 'sensor' },
      { addr: 'I0.4', name: 'Door closed', kind: 'sensor' },
      { addr: 'I0.5', name: 'Machine: part finished', kind: 'sensor', note: 'Stays on until the part is taken out' },
      { addr: 'I0.6', name: 'RESET', kind: 'pb', color: 'blue' },
      { addr: 'I1.0', name: 'Robot READY', kind: 'sensor', note: 'In automatic, no fault' },
      { addr: 'I1.1', name: 'Robot at HOME', kind: 'sensor' },
      { addr: 'I1.2', name: 'Robot BUSY', kind: 'sensor', note: 'A job is running' },
      { addr: 'I1.3', name: 'Robot job DONE', kind: 'sensor', note: 'Stays on until you take START away' },
      { addr: 'I1.4', name: 'Robot CLEAR of machine', kind: 'sensor', note: '1 = the arm is outside the machine' },
      { addr: 'I1.5', name: 'Robot FAULT', kind: 'sensor' },
    ],
    outputs: [
      { addr: 'Q0.0', name: 'Open door', color: 'blue', note: '1 = open, 0 = close' },
      { addr: 'Q0.1', name: 'Machine cycle start', color: 'green' },
      { addr: 'Q0.2', name: 'Running lamp', color: 'green' },
      { addr: 'Q0.3', name: 'Fault lamp', color: 'red' },
      { addr: 'Q1.0', name: 'Robot START job', color: 'blue' },
      { addr: 'Q1.1', name: 'Robot job: 0 = LOAD, 1 = UNLOAD', color: 'blue' },
      { addr: 'Q1.3', name: 'Robot fault RESET', color: 'blue' },
    ],
    actions: [{ id: 'rfault', label: 'Robot fault (lost the part)', run(st) { if (!st.rflt) { st.rflt = 1; st.rmsg = 'Robot fault: gripper lost the part'; } } }],
    init() { return { x: HOME[0], y: HOME[1], busy: 0, done: 0, job: 0, seg: 0, segT: 0, from: HOME, hand: 0, infeed: 1, inT: 0, mach: 0, cyc: 0, door: 0, made: 0, scrap: 0, bad: 0, rflt: 0, rmsg: '', prevStart: 0, prevCyc: 0, prevRst: 0, fault: null, clear: 1, home: 1, t: 0 }; },
    step(st, ctrl, Q, dt) {
      const h = dt / 1000, start = !!Q['Q1.0'], cyc = !!Q['Q0.1'], rst = !!Q['Q1.3'];
      st.t += dt;
      // the door follows its valve
      st.door = Math.max(0, Math.min(1, st.door + (Q['Q0.0'] ? 1 : -1) * h / 0.8));
      // infeed: a new raw part arrives 2 s after the last one was taken
      if (!st.infeed) { st.inT += h; if (st.inT >= 2) { st.infeed = 1; st.inT = 0; } }
      // robot fault reset
      if (rst && !st.prevRst && st.rflt) { st.rflt = 0; st.rmsg = ''; st.busy = 0; st.done = 0; st.hand = 0; st.x = HOME[0]; st.y = HOME[1]; }
      st.prevRst = rst;
      // start a job: rising edge of START while ready, home and DONE is off
      if (start && !st.prevStart && !st.rflt && !st.busy && !st.done && st.x === HOME[0] && st.y === HOME[1]) { st.busy = 1; st.job = Q['Q1.1'] ? 1 : 0; st.seg = 0; st.segT = 0; st.from = [st.x, st.y]; }
      if (!start) st.done = 0;
      st.prevStart = start;
      if (st.busy && !st.rflt && !st.fault) {
        const mv = JOBS[st.job][st.seg]; st.segT += h; const k = Math.min(1, st.segT / mv[1]);
        st.x = st.from[0] + (mv[0][0] - st.from[0]) * k; st.y = st.from[1] + (mv[0][1] - st.from[1]) * k;
        if (k >= 1) {
          st.x = mv[0][0]; st.y = mv[0][1];
          if (mv[2] === 'pick-in') { if (st.infeed) { st.infeed = 0; st.hand = 1; } else { st.rflt = 1; st.rmsg = 'Robot fault: no part at the infeed to pick'; } }
          else if (mv[2] === 'place-m') { if (st.mach) crash(st, 'Two parts in the machine: the robot loaded onto a part that was still inside.'); else { st.mach = st.hand; st.hand = 0; } }
          else if (mv[2] === 'pick-m') { if (!st.mach) { st.rflt = 1; st.rmsg = 'Robot fault: the machine is empty, nothing to unload'; } else { st.hand = st.mach; st.mach = 0; } }
          else if (mv[2] === 'place-out') { if (st.hand === 2) st.made++; else if (st.hand === 1) st.scrap++; st.hand = 0; }
          st.seg++; st.segT = 0; st.from = [st.x, st.y];
          if (st.seg >= JOBS[st.job].length && !st.rflt) { st.busy = 0; st.done = 1; }
        }
      }
      st.clear = st.y >= 140 ? 1 : 0; st.home = !st.busy && st.x === HOME[0] && st.y === HOME[1] ? 1 : 0;
      if (!st.clear && st.door < 0.98) crash(st, 'The robot hit the machine door: keep it open until the robot is CLEAR.');
      // machine cycle: 3 s, starts on a rising edge
      if (cyc && !st.prevCyc) {
        if (st.door > 0.02) crash(st, 'The machine started with its door open.');
        else if (!st.clear) crash(st, 'The machine started with the robot inside.');
        else if (st.mach === 1) st.cyc = 0.001;
      }
      st.prevCyc = cyc;
      if (st.cyc > 0) { st.cyc += h; if (!st.clear) crash(st, 'The robot went into the machine while it was working.'); if (st.door > 0.02) crash(st, 'The door opened while the machine was working.'); if (st.cyc >= 3) { st.cyc = 0; st.mach = 2; } }
      const o = devices(this, ctrl);
      o['I0.2'] = st.infeed; o['I0.3'] = st.door >= 0.98 ? 1 : 0; o['I0.4'] = st.door <= 0.02 ? 1 : 0; o['I0.5'] = st.mach === 2 ? 1 : 0;
      o['I1.0'] = st.rflt ? 0 : 1; o['I1.1'] = st.home; o['I1.2'] = st.busy && !st.rflt ? 1 : 0; o['I1.3'] = st.done; o['I1.4'] = st.clear; o['I1.5'] = st.rflt;
      return o;
    },
    draw(c, st, th, Q, I) {
      const part = (x, y, kind) => { c.fillStyle = kind === 2 ? th.on : th.amber; D.rr(c, x - 9, y - 9, 18, 18, 3); c.fill(); c.strokeStyle = th.ink; c.lineWidth = 1; c.stroke(); };
      // infeed and outfeed
      [[80, 'infeed'], [440, 'outfeed']].forEach(([x, n]) => { c.fillStyle = th.panel2; D.rr(c, x, 188, 120, 34, 6); c.fill(); c.strokeStyle = th.line; c.lineWidth = 1.5; c.stroke(); D.text(c, n, x + 60, 238, { size: 10, color: th.muted }); });
      if (st.infeed) part(INF[0], INF[1], 1);
      D.text(c, 'finished: ' + st.made + (st.scrap ? '   scrap: ' + st.scrap : ''), 500, 252, { size: 11, mono: true, weight: 700, color: th.ink });
      // machine with its door
      c.fillStyle = st.cyc > 0 ? th.panel2 : th.panel; D.rr(c, 250, 30, 140, 100, 8); c.fill(); c.strokeStyle = st.cyc > 0 ? th.on : th.line; c.lineWidth = 2.5; c.stroke();
      D.text(c, st.cyc > 0 ? 'WORKING ' + (3 - st.cyc).toFixed(1) + ' s' : 'MACHINE', 320, 48, { size: 11, weight: 700, color: st.cyc > 0 ? th.on : th.muted });
      if (st.mach) part(MACH[0], MACH[1], st.mach);
      const dw = 100 * (1 - st.door); c.fillStyle = th.blue; D.rr(c, 270, 126, Math.max(4, dw), 8, 3); c.fill();
      D.text(c, st.door >= 0.98 ? 'door open' : st.door <= 0.02 ? 'door closed' : 'door moving', 430, 130, { size: 10, color: th.muted });
      c.strokeStyle = th.red; c.setLineDash([5, 5]); c.lineWidth = 1; c.beginPath(); c.moveTo(210, 140); c.lineTo(430, 140); c.stroke(); c.setLineDash([]);
      D.text(c, 'machine zone', 236, 150, { size: 9, color: th.red });
      // robot
      c.fillStyle = th.metalDark; c.beginPath(); c.arc(320, 262, 16, 0, 7); c.fill();
      c.strokeStyle = st.rflt ? th.red : th.metal; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(320, 262); c.lineTo(st.x, st.y); c.stroke();
      c.fillStyle = st.rflt ? th.red : th.ink; c.beginPath(); c.arc(st.x, st.y, 7, 0, 7); c.fill();
      if (st.hand) part(st.x, st.y, st.hand);
      D.text(c, 'robot', 320, 292, { size: 10, color: th.muted });
      if (st.rmsg) D.text(c, st.rmsg, 320, 172, { size: 11, weight: 700, color: th.red });
      // the handshake signals
      [['READY', I['I1.0']], ['HOME', I['I1.1']], ['BUSY', I['I1.2']], ['DONE', I['I1.3']], ['CLEAR', I['I1.4']]].forEach(([n, v], i) => D.lamp(c, th, 30 + i * 46, 30, 7, !!v, n === 'BUSY' ? 'amber' : 'green', n, ''));
      D.lamp(c, th, 470, 30, 7, !!Q['Q1.0'], 'blue', 'START', Q['Q1.1'] ? 'UNLOAD' : 'LOAD');
      D.lamp(c, th, 560, 30, 9, !!Q['Q0.2'], 'green', 'Run', 'Q0.2'); D.lamp(c, th, 606, 30, 9, !!Q['Q0.3'], 'red', 'Fault', 'Q0.3');
      D.text(c, 'robot → PLC', 122, 84, { size: 9, color: th.muted }); D.text(c, 'PLC → robot', 470, 84, { size: 9, color: th.muted });
      D.fault(c, th, st.fault);
    },
  };
  LL.PLANT_ORDER.push('robotcell');
})(typeof window !== 'undefined' ? window : globalThis);
