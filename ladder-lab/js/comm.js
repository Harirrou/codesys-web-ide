/* Ladder Lab — "what happens on the wire": small step-by-step animations of how industrial
 * networks move data (serial bits, polling, token, CAN arbitration, LIN, EtherCAT, cyclic
 * Ethernet, publish/subscribe). Used in lessons through [[comm:scene]] placeholders. */
(function () {
  const LL = (window.LL = window.LL || {});
  const W = 640, H = 250;
  const col = () => {
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    return { ink: v('--ink') || '#12202b', muted: v('--muted') || '#5b6b77', line: v('--line') || '#c9d2d9', surf: v('--surface-2') || '#f3f6f8', surf3: v('--surface-3') || '#e2e8ec',
      accent: v('--accent-bg') || '#ffb02e', ok: v('--power-bright') || '#22c55e', bad: v('--danger') || '#d02a2a', info: v('--info') || '#2160c4' };
  };
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function text(c, s, x, y, o) { o = o || {}; c.font = (o.w || 600) + ' ' + (o.s || 15) + 'px ' + (o.mono ? '"IBM Plex Mono", ui-monospace, monospace' : '"IBM Plex Sans", system-ui, sans-serif'); c.fillStyle = o.c; c.textAlign = o.a || 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); }
  function node(c, K, x, y, label, o) {
    o = o || {}; const w = o.w || 96, h = o.h || 42;
    rr(c, x - w / 2, y - h / 2, w, h, 9); c.fillStyle = o.fill || K.surf; c.fill(); c.lineWidth = o.hl ? 3 : 1.5; c.strokeStyle = o.hl ? o.hl : K.line; c.stroke();
    text(c, label, x, y - (o.sub ? 7 : 0), { s: o.fs || 15, c: o.dim ? K.muted : K.ink, w: 700 });
    if (o.sub) text(c, o.sub, x, y + 11, { s: 12, c: K.muted, w: 500 });
  }
  function packet(c, K, x, y, label, color, o) {
    o = o || {}; c.font = '700 ' + (o.s || 13) + 'px "IBM Plex Mono", monospace'; const w = Math.max(30, c.measureText(label).width + 16), h = o.h || 24;
    rr(c, x - w / 2, y - h / 2, w, h, 6); c.fillStyle = color; c.fill(); text(c, label, x, y, { s: o.s || 13, c: o.ink || '#fff', mono: true, w: 700 });
  }
  function line(c, pts, color, w) { c.strokeStyle = color; c.lineWidth = w || 3; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
  // position along a polyline, t = 0…1
  function along(pts, t) {
    const segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); L += l; }
    let d = Math.max(0, Math.min(1, t)) * L;
    for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const k = segs[i] ? d / segs[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d -= segs[i]; }
    return pts[pts.length - 1];
  }
  function clock(c, K, x, y, p, color) { c.strokeStyle = color; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 14, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 10 * Math.sin(p * 6.28), y - 10 * Math.cos(p * 6.28)); c.stroke(); }

  // ───────────── scenes: a title, and steps of { d: duration ms, t: caption, f(c, K, p) } ─────────────
  const S = {};

  // Modbus RTU: one master polls slaves one after the other
  S.poll = (() => {
    const M = [80, 70], BUS = 150, SL = [[240, 205], [390, 205], [540, 205]];
    const base = (c, K, hl, dead) => {
      line(c, [[40, BUS], [610, BUS]], K.line, 4); line(c, [[M[0], M[1] + 21], [M[0], BUS]], K.line, 3);
      text(c, 'RS-485 line (2 wires, shared)', 470, BUS - 14, { s: 12, c: K.muted, w: 500 });
      node(c, K, M[0], M[1], 'Master', { sub: 'PLC', hl: hl === 0 ? K.accent : null });
      SL.forEach(([x, y], i) => { line(c, [[x, BUS], [x, y - 21]], K.line, 3); node(c, K, x, y, 'Slave ' + (i + 1), { sub: dead === i ? 'unplugged' : 'address ' + (i + 1), dim: dead === i, hl: hl === i + 1 ? K.accent : null }); });
    };
    const req = (i) => [[M[0], M[1] + 36], [M[0], BUS], [SL[i][0], BUS], [SL[i][0], SL[i][1] - 34]];
    return { title: 'Polling: Modbus RTU', steps: [
      { d: 3600, t: 'The master asks slave 1: "read 2 registers from address 0". The request is a few bytes: address, function code, register, count, and a CRC check.', f(c, K, p) { base(c, K, 0); const [x, y] = along(req(0), ease(p)); packet(c, K, x, y, '01 03 00 00 00 02 CRC', K.info, { s: 12 }); } },
      { d: 3000, t: 'Every slave hears every byte (it is one shared line), but only the slave whose address matches will answer. The others stay quiet.', f(c, K) { base(c, K, 1); text(c, 'mine!', SL[0][0], SL[0][1] + 36, { s: 13, c: K.ok }); text(c, 'not for me', SL[1][0], SL[1][1] + 36, { s: 13, c: K.muted }); text(c, 'not for me', SL[2][0], SL[2][1] + 36, { s: 13, c: K.muted }); } },
      { d: 3600, t: 'Slave 1 answers with the data. The master checks the CRC: if one bit was damaged by noise, the CRC does not match and the answer is thrown away.', f(c, K, p) { base(c, K, 1); const [x, y] = along(req(0).slice().reverse(), ease(p)); packet(c, K, x, y, '01 03 04 data CRC', K.ok, { s: 12, ink: '#04210f' }); } },
      { d: 3600, t: 'Then slave 2, then slave 3, always one at a time. Nobody talks without being asked, so two devices never talk at the same time.', f(c, K, p) { base(c, K, 2); const k = p < 0.5 ? 1 : 2; const [x, y] = along(req(1), ease((p % 0.5) * 2)); packet(c, K, x, y, k === 1 ? '02 03 … CRC' : 'answer', k === 1 ? K.info : K.ok, { s: 12, ink: k === 1 ? '#fff' : '#04210f' }); } },
      { d: 4200, t: 'Slave 3 is unplugged: no answer. The master waits until its timeout (for example 300 ms), reports an error for slave 3, and moves on to the next request.', f(c, K, p) { base(c, K, 3, 2); if (p < 0.4) { const [x, y] = along(req(2), ease(p / 0.4)); packet(c, K, x, y, '03 03 … CRC', K.info, { s: 12 }); } else { clock(c, K, M[0] + 80, M[1], (p - 0.4) / 0.6, K.bad); text(c, p > 0.9 ? 'timeout → error, next!' : 'waiting…', M[0] + 170, M[1], { s: 14, c: K.bad }); } } },
      { d: 3600, t: 'One full round = all requests + all answers + any timeouts. More slaves, slower baud rate, or one dead slave → every value updates less often.', f(c, K) { base(c, K, -1, 2); text(c, 'round time = Σ requests + answers + timeouts', 330, 30, { s: 15, c: K.ink }); } },
    ] };
  })();

  // PROFIBUS DP: masters pass a token; the holder polls its slaves
  S.token = (() => {
    const MS = [[150, 60], [480, 60]], BUS = 140, SL = [[110, 205], [250, 205], [400, 205], [540, 205]];
    const base = (c, K, holder, hs) => {
      line(c, [[40, BUS], [610, BUS]], K.line, 4);
      MS.forEach(([x, y], i) => { line(c, [[x, y + 21], [x, BUS]], K.line, 3); node(c, K, x, y, 'Master ' + (i + 1), { sub: i ? 'second PLC' : 'PLC', hl: holder === i ? K.accent : null }); if (holder === i) { c.fillStyle = K.accent; c.beginPath(); c.arc(x + 62, y - 10, 11, 0, 7); c.fill(); text(c, 'T', x + 62, y - 10, { s: 13, c: '#2a1a00' }); } });
      SL.forEach(([x, y], i) => { line(c, [[x, BUS], [x, y - 21]], K.line, 3); node(c, K, x, y, 'Slave ' + (i + 1), { sub: i < 3 ? 'of master 1' : 'of master 2', w: 104, hl: hs === i ? K.info : null }); });
    };
    const path = (m, s) => [[MS[m][0], MS[m][1] + 21], [MS[m][0], BUS], [SL[s][0], BUS], [SL[s][0], SL[s][1] - 21]];
    const xchg = (c, K, m, s, p) => { const go = p < 0.5; const [x, y] = along(go ? path(m, s) : path(m, s).reverse(), ease(go ? p * 2 : (p - 0.5) * 2)); packet(c, K, x, y, go ? 'outputs' : 'inputs', go ? K.info : K.ok, { ink: go ? '#fff' : '#04210f' }); };
    return { title: 'Token passing: PROFIBUS', steps: [
      { d: 3200, t: 'PROFIBUS can have several masters. They pass a "token" (T) around. Only the master holding the token may use the bus.', f(c, K) { base(c, K, 0); } },
      { d: 3600, t: 'Master 1 has the token. It sends outputs to slave 1 and gets slave 1\'s inputs back in the same exchange.', f(c, K, p) { base(c, K, 0, 0); xchg(c, K, 0, 0, p); } },
      { d: 3600, t: 'Then slave 2, slave 3: every slave in its list, in the same order every cycle. Slaves never talk on their own.', f(c, K, p) { const s = p < 0.5 ? 1 : 2; base(c, K, 0, s); xchg(c, K, 0, s, (p % 0.5) * 2); } },
      { d: 3000, t: 'Master 1 passes the token to master 2…', f(c, K, p) { base(c, K, -1); const [x, y] = along([[MS[0][0], MS[0][1] + 21], [MS[0][0], BUS], [MS[1][0], BUS], [MS[1][0], MS[1][1] + 21]], ease(p)); c.fillStyle = K.accent; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); text(c, 'T', x, y, { s: 13, c: '#2a1a00' }); } },
      { d: 3600, t: '…which polls its own slave, then gives the token back. The cycle repeats with the same order and timing: the bus time is predictable (deterministic).', f(c, K, p) { base(c, K, 1, 3); xchg(c, K, 1, 3, p); } },
    ] };
  })();

  // CAN arbitration (also CANopen, DeviceNet, J1939)
  S.can = (() => {
    const A = 0x12, B = 0x15, N = 7;
    const bits = (v) => Array.from({ length: N }, (_, i) => (v >> (N - 1 - i)) & 1);
    const a = bits(A), b = bits(B); let lose = a.findIndex((x, i) => x !== b[i]);
    const table = (c, K, upto, showLose) => {
      const x0 = 210, dx = 52, ys = [70, 110, 150];
      ['Node A  ID 0x12', 'Node B  ID 0x15', 'Bus reads'].forEach((s, r) => text(c, s, 30, ys[r], { s: 14, c: K.ink, a: 'left' }));
      for (let i = 0; i < N; i++) {
        text(c, 'bit ' + (i + 1), x0 + i * dx, 38, { s: 11, c: K.muted, w: 500 });
        if (i >= upto) continue;
        const bus = a[i] & b[i];
        const cell = (v, y, dim) => { rr(c, x0 + i * dx - 20, y - 15, 40, 30, 6); c.fillStyle = dim ? K.surf : v ? K.surf3 : K.info; c.fill(); text(c, String(v), x0 + i * dx, y, { s: 16, c: dim ? K.muted : v ? K.ink : '#fff', mono: true }); };
        cell(a[i], ys[0]); cell(b[i], ys[1], showLose && i > lose); cell(bus, ys[2]);
      }
      text(c, '0 = dominant (wins)    1 = recessive', 330, 205, { s: 13, c: K.muted, w: 500 });
    };
    return { title: 'Arbitration: CAN, CANopen, DeviceNet', steps: [
      { d: 3600, t: 'On CAN there is no master. Any node may start sending when the bus is quiet. Every message starts with its ID, and the ID is also its priority.', f(c, K) { table(c, K, 0); } },
      { d: 5200, t: 'Node A (ID 0x12) and node B (ID 0x15) start at the same moment. Each sends its ID bit by bit AND listens to the bus at the same time. (A real ID has 11 bits; 7 are shown.)', f(c, K, p) { table(c, K, Math.min(lose, Math.floor(p * (lose + 0.99)))); } },
      { d: 4200, t: 'Bit ' + (lose + 1) + ': B sends 1 but hears 0 (A\'s 0 is "dominant", it overwrites a 1). B knows it lost, stops at once and just listens. No collision, no time lost.', f(c, K) { table(c, K, lose + 1); text(c, 'B lost here', 210 + lose * 52, 110 + 32, { s: 13, c: K.bad }); } },
      { d: 4200, t: 'A simply goes on: its data (up to 8 bytes), a CRC, then every node that received it correctly sends an ACK bit. Lower ID = higher priority.', f(c, K) { table(c, K, N, true); text(c, '→ A sends its data, CRC, ACK', 470, 230, { s: 13, c: K.ok }); } },
      { d: 4600, t: 'Every node receives every message and keeps only the IDs it cares about. CANopen and DeviceNet are rules on top of CAN that say what the IDs and bytes mean (CANopen: PDO = process data, SDO = parameters).', f(c, K) { table(c, K, N, true); } },
    ] };
  })();

  // LIN: master header, slave response, schedule table
  S.lin = (() => {
    const M = [90, 80], BUS = 150, SL = [[260, 210, 'Window motor'], [420, 210, 'Mirror'], [570, 210, 'Rain sensor']];
    const base = (c, K, hl) => {
      line(c, [[40, BUS], [620, BUS]], K.line, 4); text(c, 'one wire + 12 V + ground', 470, BUS - 14, { s: 12, c: K.muted, w: 500 });
      line(c, [[M[0], M[1] + 21], [M[0], BUS]], K.line, 3); node(c, K, M[0], M[1], 'Master', { sub: 'body controller', w: 130 });
      SL.forEach(([x, y, n], i) => { line(c, [[x, BUS], [x, y - 21]], K.line, 3); node(c, K, x, y, n, { w: 128, sub: 'slave', hl: hl === i ? K.accent : null }); });
    };
    return { title: 'Header and response: LIN', steps: [
      { d: 3600, t: 'LIN is a cheap, slow bus (up to 19.2 kbit/s) on one signal wire: one master and up to 15 slaves. It is used for simple things in cars: windows, mirrors, seats, sensors.', f(c, K) { base(c, K); } },
      { d: 4200, t: 'The master sends a header: a "break" (a new frame starts), a sync byte 0x55 (01010101) so every slave tunes its clock, then the frame ID.', f(c, K, p) { base(c, K); const [x] = along([[M[0], BUS], [600, BUS]], ease(p)); packet(c, K, x, BUS + 26, 'break | 55 | ID 0x21', K.info, { s: 12 }); } },
      { d: 4200, t: 'Only the slave that owns ID 0x21 (the rain sensor) fills in the response: 1–8 data bytes and a checksum. The master and anyone interested read it.', f(c, K, p) { base(c, K, 2); const [x] = along([[570, BUS], [M[0], BUS]], ease(p)); packet(c, K, x, BUS + 26, 'data | checksum', K.ok, { s: 12, ink: '#04210f' }); } },
      { d: 3600, t: 'The master works through a fixed schedule: frame 1, frame 2, frame 3, again and again. Simple and predictable, but slow: never for fast machine control.', f(c, K) { base(c, K); ['1: window 0x10', '2: mirror 0x11', '3: rain 0x21'].forEach((s, i) => text(c, s, 330, 40 + i * 22, { s: 13, c: K.ink, a: 'left', mono: true })); text(c, 'schedule table', 330, 18, { s: 12, c: K.muted, a: 'left' }); } },
    ] };
  })();

  // EtherCAT: one frame passes through every device "on the fly"
  S.ethercat = (() => {
    const M = [70, 110], SL = [190, 300, 410, 520], Y = 110;
    const base = (c, K, hl) => {
      line(c, [[M[0] + 48, Y], [SL[3] + 40, Y]], K.line, 4);
      node(c, K, M[0], M[1], 'Master', { sub: 'PLC / IPC' });
      SL.forEach((x, i) => node(c, K, x, Y, 'Slave ' + (i + 1), { w: 84, hl: hl === i ? K.accent : null }));
    };
    const frame = (c, K, x, y, done, back) => { const w = 26; for (let i = 0; i < 4; i++) { rr(c, x + i * w - 52, y - 12, w - 3, 24, 4); c.fillStyle = done[i] ? K.ok : K.info; c.fill(); text(c, String(i + 1), x + i * w - 52 + (w - 3) / 2, y, { s: 12, c: done[i] ? '#04210f' : '#fff', mono: true }); } text(c, back ? '← back' : 'frame →', x + 2, y + 24, { s: 11, c: K.muted }); };
    return { title: 'On-the-fly frame: EtherCAT', steps: [
      { d: 3600, t: 'EtherCAT sends ONE Ethernet frame with a slot for every device. The devices are chained in a line (each has an IN and an OUT port).', f(c, K) { base(c, K); frame(c, K, M[0] + 10, Y + 55, [0, 0, 0, 0]); } },
      { d: 6000, t: 'As the frame passes, each device reads its outputs from its slot and writes its inputs into it, while the frame is still moving. It does not wait for the whole frame.', f(c, K, p) { const x = lerp(M[0] + 60, SL[3] + 30, ease(p)); const done = SL.map((sx) => x > sx - 10); base(c, K, done.lastIndexOf(true)); frame(c, K, x, Y + 55, done); } },
      { d: 4200, t: 'The last device sends the frame back through the chain to the master. One round trip = the whole machine updated, often in 100 µs or less.', f(c, K, p) { base(c, K); frame(c, K, lerp(SL[3] + 30, M[0] + 60, ease(p)), Y + 55, [1, 1, 1, 1], true); } },
      { d: 4200, t: 'Distributed clocks: all devices share one time base (better than 1 µs), so many servo axes move exactly together. That is why EtherCAT is popular for motion and fast machines.', f(c, K, p) { base(c, K); SL.forEach((x) => clock(c, K, x, Y - 60, p, K.info)); } },
    ] };
  })();

  // PROFINET / EtherNet/IP: cyclic exchange through switches, producer / consumer
  S.cyclic = (() => {
    const C = [320, 40], SW = [320, 120], D = [[150, 210], [320, 210], [490, 210]];
    const base = (c, K, dead) => {
      line(c, [[C[0], C[1] + 21], [SW[0], SW[1] - 16]], K.line, 3); D.forEach(([x, y]) => line(c, [[SW[0], SW[1] + 16], [x, y - 21]], K.line, 3));
      node(c, K, C[0], C[1], 'Controller', { sub: 'PLC', w: 120 });
      rr(c, SW[0] - 50, SW[1] - 16, 100, 32, 6); c.fillStyle = K.surf3; c.fill(); text(c, 'switch', SW[0], SW[1], { s: 13, c: K.ink });
      D.forEach(([x, y], i) => node(c, K, x, y, ['Drive', 'Remote I/O', 'Valve island'][i], { w: 122, dim: dead === i, sub: dead === i ? 'no power' : 'device' }));
    };
    const pk = (c, K, i, p, up) => { const pts = [[C[0], C[1] + 21], [SW[0], SW[1]], [D[i][0], D[i][1] - 21]]; const [x, y] = along(up ? pts.reverse() : pts, ease(p)); packet(c, K, x, y, up ? 'in' : 'out', up ? K.ok : K.info, { ink: up ? '#04210f' : '#fff', s: 12 }); };
    return { title: 'Cyclic exchange: PROFINET, EtherNet/IP', steps: [
      { d: 3800, t: 'At start-up the controller sets up a connection with each device (PROFINET finds it by its device name, EtherNet/IP opens a CIP connection).', f(c, K, p) { base(c, K); D.forEach((_, i) => pk(c, K, i, p, false)); } },
      { d: 5200, t: 'Then, every cycle (for example every 2 ms), the controller sends the outputs to each device, AND each device sends its inputs by itself. Nobody has to ask: producer / consumer.', f(c, K, p) { base(c, K); const q = (p * 2) % 1; D.forEach((_, i) => { pk(c, K, i, q, false); pk(c, K, i, q, true); }); } },
      { d: 4000, t: 'The switch sends each packet only to the right port, and every cable sends in both directions at once (full duplex). Many conversations at the same time, no waiting.', f(c, K, p) { base(c, K); const q = (p * 2) % 1; D.forEach((_, i) => { pk(c, K, i, q, false); pk(c, K, i, (q + 0.5) % 1, true); }); } },
      { d: 4800, t: 'The valve island loses power: its packets stop. After a few missed cycles (the watchdog), the controller marks it as failed, sets its inputs to 0 and reports a diagnostic alarm.', f(c, K, p) { base(c, K, 2); const q = (p * 2) % 1; [0, 1].forEach((i) => { pk(c, K, i, q, false); pk(c, K, i, q, true); }); if (p > 0.6) text(c, 'device failure!', D[2][0], D[2][1] + 36, { s: 13, c: K.bad }); } },
      { d: 3800, t: 'Parameters, diagnostics and firmware travel as separate "acyclic" messages in between, when needed (PROFINET record read / write, EtherNet/IP explicit MSG).', f(c, K) { base(c, K); text(c, 'cyclic: I/O every 2 ms     acyclic: when asked', 320, 245, { s: 13, c: K.muted }); } },
    ] };
  })();

  // MQTT broker and OPC UA client / server
  S.pubsub = (() => {
    const P = [[90, 70, 'Machine 1'], [90, 180, 'Machine 2']], B = [320, 125], SU = [[550, 70, 'Dashboard'], [550, 180, 'Cloud / MES']];
    const base = (c, K) => {
      P.forEach(([x, y, n]) => { line(c, [[x + 48, y], [B[0] - 50, B[1]]], K.line, 3); node(c, K, x, y, n, { sub: 'publisher', w: 120 }); });
      SU.forEach(([x, y, n]) => { line(c, [[B[0] + 50, B[1]], [x - 60, y]], K.line, 3); node(c, K, x, y, n, { sub: 'subscriber', w: 124 }); });
      node(c, K, B[0], B[1], 'Broker', { sub: 'MQTT server', w: 110, fill: K.surf3 });
    };
    return { title: 'Publish / subscribe: MQTT (and OPC UA)', steps: [
      { d: 4000, t: 'MQTT: machines publish small messages to "topics" on a broker, for example plant/line1/temp = 72.5. They do not know who will read them.', f(c, K, p) { base(c, K); const [x, y] = along([[P[0][0] + 48, P[0][1]], [B[0] - 50, B[1]]], ease(p)); packet(c, K, x, y, 'line1/temp 72.5', K.info, { s: 11 }); } },
      { d: 4200, t: 'Subscribers tell the broker what they want (plant/line1/#). The broker sends each new message to everyone who subscribed. Publisher and subscriber never talk directly.', f(c, K, p) { base(c, K); SU.forEach(([x, y]) => { const [px, py] = along([[B[0] + 50, B[1]], [x - 60, y]], ease(p)); packet(c, K, px, py, '72.5', K.ok, { ink: '#04210f' }); }); } },
      { d: 4600, t: 'OPC UA works differently: a client (SCADA, MES) connects to the server inside the PLC, browses named tags, reads, writes or subscribes to changes, with certificates for security.', f(c, K, p) { c.clearRect(0, 0, W, H); node(c, K, 140, 120, 'OPC UA client', { sub: 'SCADA / MES', w: 150 }); node(c, K, 500, 120, 'OPC UA server', { sub: 'in the PLC', w: 150 }); line(c, [[215, 120], [425, 120]], K.line, 3); const go = p < 0.5; const [x] = along([[215, 120], [425, 120]], ease(go ? p * 2 : 1 - (p - 0.5) * 2)); packet(c, K, x, 92, go ? 'read Line1.Temp' : '72.5 °C', go ? K.info : K.ok, { s: 12, ink: go ? '#fff' : '#04210f' }); } },
      { d: 3800, t: 'Neither one is for fast machine I/O. They carry information up to screens, databases and the cloud. Fast I/O stays on PROFINET, EtherNet/IP, EtherCAT …', f(c, K) { base(c, K); } },
    ] };
  })();

  // ───────────── the widget ─────────────
  function scenePlayer(ph, sc) {
    const box = document.createElement('div'); box.className = 'comm-box';
    box.innerHTML = `<div class="comm-h"><b>${sc.title}</b><span class="comm-n"></span></div><canvas></canvas><p class="comm-cap"></p><div class="comm-ctl"><button class="btn small" data-c="prev" aria-label="Previous step">◀</button><button class="btn small primary" data-c="play">▶ Play</button><button class="btn small" data-c="next" aria-label="Next step">▶|</button><button class="btn small ghost" data-c="restart">↺ Restart</button></div>`;
    ph.replaceWith(box);
    const cv = box.querySelector('canvas'), cap = box.querySelector('.comm-cap'), num = box.querySelector('.comm-n'), playB = box.querySelector('[data-c="play"]');
    const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    let i = 0, t = 0, playing = false, lastT = 0, raf = 0;
    const draw = () => { const K = col(); c.clearRect(0, 0, W, H); const st = sc.steps[i]; st.f(c, K, Math.min(1, t / st.d)); cap.textContent = st.t; num.textContent = 'step ' + (i + 1) + ' / ' + sc.steps.length; };
    const loop = (now) => {
      if (!document.body.contains(box)) { playing = false; return; }
      const dt = Math.min(100, now - (lastT || now)); lastT = now; t += dt;
      if (t >= sc.steps[i].d) { if (i < sc.steps.length - 1) { i++; t = 0; } else { t = sc.steps[i].d; playing = false; playB.textContent = '▶ Play'; } }
      draw(); if (playing) raf = requestAnimationFrame(loop);
    };
    const play = (on) => { playing = on; playB.textContent = on ? '❚❚ Pause' : '▶ Play'; cancelAnimationFrame(raf); if (on) { lastT = 0; raf = requestAnimationFrame(loop); } };
    box.querySelector('[data-c="play"]').onclick = () => { if (!playing && i === sc.steps.length - 1 && t >= sc.steps[i].d) { i = 0; t = 0; } play(!playing); };
    box.querySelector('[data-c="next"]').onclick = () => { play(false); if (i < sc.steps.length - 1) i++; t = sc.steps[i].d * 0.999; draw(); };
    box.querySelector('[data-c="prev"]').onclick = () => { play(false); if (i > 0) i--; t = sc.steps[i].d * 0.999; draw(); };
    box.querySelector('[data-c="restart"]').onclick = () => { i = 0; t = 0; play(true); };
    t = sc.steps[0].d * 0.999; draw();
  }

  // serial byte: start bit, data bits (LSB first), parity, stop bit, on TTL / RS-232 / RS-485
  function serialPlayer(ph) {
    const box = document.createElement('div'); box.className = 'comm-box';
    box.innerHTML = `<div class="comm-h"><b>One byte on a serial line</b><span class="comm-n"></span></div>
      <div class="comm-opts"><label>Character <input data-ch maxlength="1" value="A" class="mono" style="width:3em"></label>
      <label>Parity <select data-par><option value="none">none</option><option value="even" selected>even</option><option value="odd">odd</option></select></label>
      <label>Baud <select data-baud><option>9600</option><option selected>19200</option><option>115200</option></select></label>
      <label>Line <select data-phy><option value="ttl">logic (UART)</option><option value="232">RS-232</option><option value="485">RS-485</option></select></label></div>
      <canvas></canvas><p class="comm-cap"></p><div class="comm-ctl"><button class="btn small primary" data-c="play">▶ Send it</button></div>`;
    ph.replaceWith(box);
    const cv = box.querySelector('canvas'), cap = box.querySelector('.comm-cap'), info = box.querySelector('.comm-n');
    const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    let cur = -1, raf = 0;
    const frame = () => {
      const ch = (box.querySelector('[data-ch]').value || 'A').charCodeAt(0) & 255, par = box.querySelector('[data-par]').value;
      const data = Array.from({ length: 8 }, (_, k) => (ch >> k) & 1);
      const ones = data.reduce((a, b) => a + b, 0);
      const bits = [{ v: 0, n: 'start', why: 'Start bit: the line drops from idle to 0. The receiver sees the edge and starts its own clock: from now on it samples each bit in the middle.' }];
      data.forEach((v, k) => bits.push({ v, n: 'b' + k, why: 'Data bit ' + k + (k === 0 ? ' (the lowest bit is sent first)' : '') + ' = ' + v + '. "' + String.fromCharCode(ch) + '" is ' + ch + ' = 0x' + ch.toString(16).toUpperCase().padStart(2, '0') + ' = ' + ch.toString(2).padStart(8, '0') + ' (written high bit first).' }));
      if (par !== 'none') { const v = par === 'even' ? ones % 2 : 1 - (ones % 2); bits.push({ v, n: 'par', why: 'Parity bit (' + par + '): makes the number of 1s ' + par + '. If one bit is damaged on the way, the receiver sees wrong parity and rejects the byte.' }); }
      bits.push({ v: 1, n: 'stop', why: 'Stop bit: back to 1 (idle). It gives the receiver a pause before the next start bit. Both sides must agree on baud, data bits, parity and stop bits, or they read garbage.' });
      return { ch, bits };
    };
    const draw = () => {
      const K = col(), { ch, bits } = frame(), phy = box.querySelector('[data-phy]').value, baud = +box.querySelector('[data-baud]').value;
      const bt = 1e6 / baud, n = bits.length;
      info.textContent = bits.length + ' bits × ' + bt.toFixed(1) + ' µs = ' + (bits.length * bt / 1000).toFixed(2) + ' ms per byte';
      c.clearRect(0, 0, W, H);
      const x0 = 70, x1 = 620, dx = (x1 - x0) / (n + 1), yHi = 70, yLo = 150;
      const lvl = (v) => (phy === '232' ? (v ? yLo : yHi) : v ? yHi : yLo);
      const lab = phy === 'ttl' ? ['1 (3.3 / 5 V)', '0 (0 V)'] : phy === '232' ? ['0 = +12 V', '1 = −12 V'] : ['1: A−B < −0.2 V', '0: A−B > +0.2 V'];
      text(c, phy === '232' ? lab[0] : lab[0], x0 - 8, yHi, { s: 11, c: K.muted, a: 'right', w: 500 }); text(c, phy === '232' ? lab[1] : lab[1], x0 - 8, yLo, { s: 11, c: K.muted, a: 'right', w: 500 });
      c.strokeStyle = K.line; c.lineWidth = 1; c.setLineDash([3, 4]); [yHi, yLo].forEach((y) => { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }); c.setLineDash([]);
      // idle, bits, idle
      const seq = [{ v: 1, n: 'idle' }].concat(bits);
      c.strokeStyle = K.info; c.lineWidth = 3; c.beginPath(); let px = x0, py = lvl(1); c.moveTo(px, py);
      seq.forEach((b, k) => { const y = lvl(b.v); c.lineTo(px, y); px = x0 + (k + 1) * dx; c.lineTo(px, y); });
      c.lineTo(x1, lvl(1)); c.stroke();
      seq.forEach((b, k) => {
        if (!k) return; const cx = x0 + k * dx + dx / 2;
        if (k - 1 === cur) { c.fillStyle = 'rgba(255,176,46,.28)'; c.fillRect(x0 + k * dx, 40, dx, 140); }
        text(c, b.n, cx, 196, { s: 12, c: b.n === 'start' || b.n === 'stop' || b.n === 'par' ? K.ink : K.muted, mono: true });
        text(c, String(b.v), cx, 220, { s: 14, c: K.ink, mono: true });
      });
      text(c, 'idle', x0 + dx / 2, 196, { s: 12, c: K.muted, mono: true });
      cap.textContent = cur < 0 ? (phy === '232' ? 'RS-232: point to point, about 15 m, voltages are inverted (+12 V = 0). ' : phy === '485' ? 'RS-485: the bit is the difference between wires A and B, so noise that hits both wires cancels out: up to 1200 m and 32 devices on one pair. ' : 'Inside the device (UART) the bits are simply high and low voltages. ') + 'Press "Send it" to follow the bits one by one.' : bits[cur].why;
    };
    box.querySelectorAll('input,select').forEach((e) => (e.oninput = () => { cur = -1; draw(); }));
    box.querySelector('[data-c="play"]').onclick = () => {
      cancelAnimationFrame(raf); cur = 0; let t0 = 0; const n = frame().bits.length;
      const step = (now) => { if (!document.body.contains(box)) return; if (!t0) t0 = now; cur = Math.min(n - 1, Math.floor((now - t0) / 2600)); draw(); if (now - t0 < n * 2600) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    draw();
  }

  LL.COMM_SCENES = S;
  LL.commMount = function (root) {
    root.querySelectorAll('.comm-ph').forEach((ph) => { const k = ph.dataset.comm; if (k === 'serial') serialPlayer(ph); else if (S[k]) scenePlayer(ph, S[k]); });
  };
})();
