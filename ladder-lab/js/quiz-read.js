/* PLC Start — "Read a program" quiz: several rungs and a short story (buttons pressed, time passing).
 * The learner says what is ON at the end. Endless: every question is made from a pattern with random parts.
 *
 * LL.genRead()      → { kind, text, tags, init, steps: [{ say, ops: [{ in, ms | scans }] }], ask: [addr], want: {addr: 0|1}, why }
 * LL.readRun(sc)    → { m, got }   the real PLC engine plays the story; `got` is the truth shown to the learner.
 * `want` is worked out by plain reasoning in each pattern, independent of the engine. The tests check want === got
 * for every pattern many times, so the explanation text can never disagree with the simulation. */
(function (G) {
  const LL = (G.LL = G.LL || {});
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const on = (v) => (v ? 'ON' : 'OFF');

  // story pieces
  const tap = (a, name) => ({ say: 'Tap ' + name + ' (press and release).', ops: [{ in: { [a]: 1 }, ms: 200 }, { in: { [a]: 0 }, ms: 200 }] });
  const tapNC = (a, name) => ({ say: 'Tap ' + name + ' (wired NC: its input goes to 0 while pressed).', ops: [{ in: { [a]: 0 }, ms: 200 }, { in: { [a]: 1 }, ms: 200 }] });
  const set = (a, v, say) => ({ say, ops: [{ in: { [a]: v }, ms: 200 }] });
  const pulse = (a, say) => ({ say, ops: [{ in: { [a]: 1 }, ms: 200 }, { in: { [a]: 0 }, ms: 200 }] });
  const wait = (s) => ({ say: 'Wait ' + s + ' s.', ops: [{ ms: s * 1000 - 200 }] });   // the step before already took 0.2 s

  const P = [];

  // 1. start / stop seal-in, STOP wired NC
  P.push(() => {
    const A = 'I0.0', S = 'I0.1';
    const seqs = [['a'], ['a', 's'], ['a', 's', 'a'], ['s', 'a'], ['hs', 'a', 'rs'], ['a', 'a', 's']];
    const seq = pick(seqs); let q = 0, stopHeld = false; const steps = [];
    seq.forEach((e) => {
      if (e === 'a') { steps.push(tap(A, 'START')); if (!stopHeld) q = 1; }
      if (e === 's') { steps.push(tapNC(S, 'STOP')); q = 0; }
      if (e === 'hs') { steps.push(set(S, 0, 'Press STOP and keep it pressed (its input is 0).')); stopHeld = true; q = 0; }
      if (e === 'rs') { steps.push(set(S, 1, 'Release STOP (its input is 1 again).')); stopHeld = false; }
    });
    return { kind: 'Start / stop with seal-in', text: 'RUNG Motor latch\nNO(I0.0) | NO(I0.1) COIL(Q0.0)\nNO(Q0.0)', tags: { 'I0.0': 'START', 'I0.1': 'STOP', 'Q0.0': 'Motor' }, init: { 'I0.1': 1 }, steps, ask: ['Q0.0'], want: { 'Q0.0': q },
      why: 'START switches the motor on and the Motor contact under it keeps it on (seal-in). The STOP contact is in series: when its input is 0 the rung is broken and the seal is lost. While STOP is held, START can do nothing.' };
  });

  // 2. two coils on one output + a rung in between that reads it
  P.push(() => {
    const a = rnd(2), bb = rnd(3) ? 1 - a : a;                  // mostly the interesting case: A and B differ
    const steps = [set('I0.0', a, 'Switch A is ' + on(a) + '.'), set('I0.1', bb, 'Switch B is ' + on(bb) + '.')];
    return { kind: 'Two coils on one output', text: 'RUNG First coil\nNO(I0.0) COIL(Q0.0)\nRUNG Reads the lamp in the middle\nNO(Q0.0) COIL(Q0.1)\nRUNG Second coil on the same output\nNO(I0.1) COIL(Q0.0)', tags: { 'I0.0': 'A', 'I0.1': 'B', 'Q0.0': 'Lamp', 'Q0.1': 'Horn' }, steps, ask: ['Q0.0', 'Q0.1'], want: { 'Q0.0': bb, 'Q0.1': a },
      why: 'The PLC solves the rungs from top to bottom and writes the outputs once, at the end of the scan. The Lamp is written twice, so the <b>last</b> rung wins: Lamp = B. But rung 2 reads the Lamp bit <b>between</b> the two writes, so the Horn follows A. This is why one output should have only one coil.' };
  });

  // 3. SET and RESET: the later rung wins
  P.push(() => {
    const setFirst = rnd(2) === 1; let A = 0, B = 0, q = 0; const steps = [];
    const evs = pick([['A1', 'B1'], ['A1', 'A0', 'B1', 'B0'], ['B1', 'A1'], ['A1', 'B1', 'B0'], ['A1', 'B1', 'A0'], ['A1', 'A0']]);
    evs.forEach((e) => {
      const v = +e[1]; if (e[0] === 'A') A = v; else B = v;
      steps.push(set(e[0] === 'A' ? 'I0.0' : 'I0.1', v, 'Switch ' + e[0] + ' goes ' + on(v) + '.'));
      if (setFirst) q = B ? 0 : A ? 1 : q; else q = A ? 1 : B ? 0 : q;
    });
    const rs = 'RUNG Reset\nNO(I0.1) RST(Q0.0)', ss = 'RUNG Set\nNO(I0.0) SET(Q0.0)';
    return { kind: 'Set and reset', text: setFirst ? ss + '\n' + rs : rs + '\n' + ss, tags: { 'I0.0': 'A', 'I0.1': 'B', 'Q0.0': 'Valve' }, steps, ask: ['Q0.0'], want: { 'Q0.0': q },
      why: 'SET switches the bit on and it stays on; RESET switches it off and it stays off. When both rungs are true in the same scan, the <b>lower</b> rung is done last, so it wins. Here the ' + (setFirst ? 'RESET rung is lower: reset wins' : 'SET rung is lower: set wins') + '.' };
  });

  // 4. a bit used before it is written: one scan late per rung
  P.push(() => {
    const len = 2 + rnd(2), rev = rnd(4) > 0, n = 1 + rnd(3);
    const bits = len === 2 ? ['M0.0', 'Q0.0'] : ['M0.0', 'M0.1', 'Q0.0'];
    const rungs = bits.map((b, k) => 'RUNG\nNO(' + (k ? bits[k - 1] : 'I0.0') + ') COIL(' + b + ')');
    if (rev) rungs.reverse();
    const want = {}; bits.forEach((b, k) => (want[b] = rev ? (n >= k + 1 ? 1 : 0) : 1));
    return { kind: 'Rung order and the scan', text: rungs.join('\n'), tags: { 'I0.0': 'A', 'Q0.0': 'Lamp' }, steps: [{ say: 'Switch A goes ON. The PLC makes exactly <b>' + n + ' scan' + (n > 1 ? 's' : '') + '</b>, then we look.', ops: [{ in: { 'I0.0': 1 }, scans: n }] }], ask: bits, want,
      why: rev ? 'Each rung here reads a bit that is only written <b>further down</b>. So in one scan the signal moves only one rung: M0.0 after scan 1, the next bit after scan 2, and so on. Nobody sees it (a scan is a few ms), but this is how "one scan late" bugs are born.' : 'The rungs are in the natural order: each bit is written before the next rung reads it. So the signal runs through all rungs in the <b>same</b> scan.' };
  });

  // 5. forward / reverse with interlock
  P.push(() => {
    const seq = pick([['f', 'r'], ['r', 'f'], ['f', 's', 'r'], ['f', 'r', 's'], ['both'], ['r', 's', 'f', 'r']]); let f = 0, r = 0; const steps = [];
    seq.forEach((e) => {
      if (e === 'f') { steps.push(tap('I0.0', 'FWD')); if (!r) f = 1; }
      if (e === 'r') { steps.push(tap('I0.1', 'REV')); if (!f) r = 1; }
      if (e === 's') { steps.push(tapNC('I0.2', 'STOP')); f = 0; r = 0; }
      if (e === 'both') { steps.push({ say: 'Press FWD and REV at exactly the same moment, then release both.', ops: [{ in: { 'I0.0': 1, 'I0.1': 1 }, ms: 200 }, { in: { 'I0.0': 0, 'I0.1': 0 }, ms: 200 }] }); if (!f && !r) f = 1; }
    });
    return { kind: 'Forward / reverse interlock', text: 'RUNG Forward\nNO(I0.0) | NO(I0.2) NC(Q0.1) COIL(Q0.0)\nNO(Q0.0)\nRUNG Reverse\nNO(I0.1) | NO(I0.2) NC(Q0.0) COIL(Q0.1)\nNO(Q0.1)', tags: { 'I0.0': 'FWD', 'I0.1': 'REV', 'I0.2': 'STOP', 'Q0.0': 'Forward', 'Q0.1': 'Reverse' }, init: { 'I0.2': 1 }, steps, ask: ['Q0.0', 'Q0.1'], want: { 'Q0.0': f, 'Q0.1': r },
      why: 'Each direction has the NC contact of the <b>other</b> direction in its rung (interlock). While one runs, the other button does nothing: you must stop first. With both buttons at the same moment, the Forward rung is solved first, switches on, and its NC contact blocks Reverse in the same scan.' };
  });

  // 6. push-on / push-off with an edge
  P.push(() => {
    const n = 1 + rnd(4), hold = rnd(3) === 0; const steps = [];
    for (let k = 0; k < n; k++) steps.push(hold && k === n - 1 ? { say: 'Press the button and keep it pressed for 3 s, then release.', ops: [{ in: { 'I0.0': 1 }, ms: 3000 }, { in: { 'I0.0': 0 }, ms: 200 }] } : tap('I0.0', 'the button'));
    return { kind: 'Push-on / push-off', text: 'RUNG One pulse per press\nP(I0.0) COIL(M0.0)\nRUNG Flip the lamp on each pulse\nNO(M0.0) NC(Q0.0) | COIL(Q0.0)\nNC(M0.0) NO(Q0.0)', tags: { 'I0.0': 'Button', 'M0.0': 'Pulse', 'Q0.0': 'Lamp' }, steps, ask: ['Q0.0'], want: { 'Q0.0': n % 2 },
      why: 'The P contact is true for only <b>one scan</b> when the button goes from 0 to 1. How long you hold it does not matter. Each pulse flips the lamp: ' + n + ' press' + (n > 1 ? 'es' : '') + ' = ' + (n % 2 ? 'an odd number, lamp ON' : 'an even number, lamp OFF') + '.' };
  });

  // 7. TON
  P.push(() => {
    const N = 3 + rnd(3), v = rnd(4); const steps = []; let q;
    if (v === 0) { steps.push(set('I0.0', 1, 'Switch A goes ON.'), wait(N - 1)); q = 0; }
    else if (v === 1) { steps.push(set('I0.0', 1, 'Switch A goes ON.'), wait(N + 1)); q = 1; }
    else if (v === 2) { steps.push(set('I0.0', 1, 'Switch A goes ON.'), wait(N + 1), set('I0.0', 0, 'Switch A goes OFF.')); q = 0; }
    else { steps.push(set('I0.0', 1, 'Switch A goes ON.'), wait(N - 1), set('I0.0', 0, 'Switch A goes OFF.'), wait(1), set('I0.0', 1, 'Switch A goes ON again.'), wait(N - 1)); q = 0; }
    return { kind: 'On-delay timer (TON)', text: 'RUNG On-delay ' + N + ' s\nNO(I0.0) TON(T0,' + N + 's)\nRUNG Lamp when the time is over\nNO(T0) COIL(Q0.0)', tags: { 'I0.0': 'A', 'Q0.0': 'Lamp' }, steps, ask: ['Q0.0'], want: { 'Q0.0': q },
      why: 'A TON switches on only after its input has been ON for the <b>whole</b> time without a break (' + N + ' s here). When the input goes OFF, the timer output goes OFF at once and the time starts again from zero. Two short times do not add up.' };
  });

  // 8. TOF
  P.push(() => {
    const N = 3 + rnd(3), late = rnd(2), again = !late && rnd(2); const steps = [set('I0.0', 1, 'Switch A goes ON.'), wait(1), set('I0.0', 0, 'Switch A goes OFF.'), wait(late ? N + 1 : N - 1)];
    if (again) steps.push(set('I0.0', 1, 'Switch A goes ON again.'), wait(1), set('I0.0', 0, 'Switch A goes OFF.'), wait(N - 1));
    return { kind: 'Off-delay timer (TOF)', text: 'RUNG Off-delay ' + N + ' s\nNO(I0.0) TOF(T0,' + N + 's)\nRUNG Fan runs on\nNO(T0) COIL(Q0.0)', tags: { 'I0.0': 'A', 'Q0.0': 'Fan' }, steps, ask: ['Q0.0'], want: { 'Q0.0': late ? 0 : 1 },
      why: 'A TOF switches on at once with its input. When the input goes OFF, the output <b>stays on</b> for the time (' + N + ' s here), then drops. Every new ON starts it fresh. Typical use: a fan that runs on after the motor stops.' };
  });

  // 9. TP
  P.push(() => {
    const N = 3 + rnd(3), v = rnd(3); const steps = []; let q;
    if (v === 0) { steps.push(tap('I0.0', 'the button'), wait(N - 2)); q = 1; }
    else if (v === 1) { steps.push(set('I0.0', 1, 'Press the button and keep it pressed.'), wait(N + 1)); q = 0; }
    else { steps.push(tap('I0.0', 'the button'), wait(N + 1)); q = 0; }
    return { kind: 'Pulse timer (TP)', text: 'RUNG Pulse of ' + N + ' s\nNO(I0.0) TP(T0,' + N + 's)\nRUNG Valve open during the pulse\nNO(T0) COIL(Q0.0)', tags: { 'I0.0': 'Button', 'Q0.0': 'Valve' }, steps, ask: ['Q0.0'], want: { 'Q0.0': q },
      why: 'A TP gives one pulse of a <b>fixed length</b> (' + N + ' s here) when its input goes ON. A short tap gives the full pulse; holding the button does not make it longer.' };
  });

  // 10. counter
  P.push(() => {
    const k = 3 + rnd(3), n = k - 1 + rnd(3), reset = rnd(3) === 0, after = reset ? rnd(2) * k : 0; const steps = [];
    steps.push({ say: 'A box passes the sensor <b>' + n + ' time' + (n > 1 ? 's' : '') + '</b>.', ops: [].concat(...Array.from({ length: n }, () => [{ in: { 'I0.0': 1 }, ms: 150 }, { in: { 'I0.0': 0 }, ms: 150 }])) });
    if (reset) { steps.push(tap('I0.1', 'RESET')); if (after) steps.push({ say: 'Then <b>' + after + '</b> more boxes pass.', ops: [].concat(...Array.from({ length: after }, () => [{ in: { 'I0.0': 1 }, ms: 150 }, { in: { 'I0.0': 0 }, ms: 150 }])) }); }
    const cnt = reset ? after : n;
    return { kind: 'Counter (CTU)', text: 'RUNG Count the boxes\nNO(I0.0) CTU(C0,' + k + ')\nRUNG Lamp when the batch is full\nNO(C0) COIL(Q0.0)\nRUNG Reset the counter\nNO(I0.1) RST(C0)', tags: { 'I0.0': 'Sensor', 'I0.1': 'RESET', 'Q0.0': 'Full lamp' }, steps, ask: ['Q0.0'], want: { 'Q0.0': cnt >= k ? 1 : 0 },
      why: 'A CTU adds 1 each time its input goes from 0 to 1. Its contact is ON when the count is <b>equal to or more than</b> the preset (' + k + ' here), and it stays ON above it. RESET puts the count back to 0. At the end the count is ' + cnt + '.' };
  });

  // 11. a small step sequence
  P.push(() => {
    const seq = pick([['st'], ['st', 's1'], ['st', 's1', 's2'], ['s1', 'st'], ['st', 's2'], ['st', 's1', 's2', 'st']]); let step = 0; const steps = [];
    seq.forEach((e) => {
      if (e === 'st') { steps.push(tap('I0.0', 'START')); if (step === 0) step = 1; }
      if (e === 's1') { steps.push(pulse('I0.1', 'The part arrives at the drill: sensor S1 gives a short signal.')); if (step === 1) step = 2; }
      if (e === 's2') { steps.push(pulse('I0.2', 'The drill is down: sensor S2 gives a short signal.')); if (step === 2) step = 0; }
    });
    return { kind: 'Step sequence', text: 'RUNG Start: go to step 1 (only when no step is active)\nNO(I0.0) NC(M0.1) NC(M0.2) SET(M0.1)\nRUNG Part at the drill: step 2 on\nNO(M0.1) NO(I0.1) SET(M0.2)\nRUNG Step 2 switches step 1 off\nNO(M0.2) RST(M0.1)\nRUNG Drill is down: the cycle is finished\nNO(M0.2) NO(I0.2) RST(M0.2)\nRUNG Step 1: conveyor\nNO(M0.1) COIL(Q0.0)\nRUNG Step 2: drill\nNO(M0.2) COIL(Q0.1)', tags: { 'I0.0': 'START', 'I0.1': 'S1', 'I0.2': 'S2', 'M0.1': 'Step 1', 'M0.2': 'Step 2', 'Q0.0': 'Conveyor', 'Q0.1': 'Drill' }, steps, ask: ['Q0.0', 'Q0.1'], want: { 'Q0.0': step === 1 ? 1 : 0, 'Q0.1': step === 2 ? 1 : 0 },
      why: 'Only one step bit is on at a time. A sensor moves the sequence on <b>only in the step that waits for it</b>: S1 does nothing before START, S2 does nothing in step 1, and START does nothing while a step is active. The outputs just follow the step bits. At the end ' + (step ? 'step ' + step + ' is active' : 'no step is active') + '.' };
  });

  // 12. alarm latch with acknowledge
  P.push(() => {
    const seq = pick([['f1'], ['f1', 'f0'], ['f1', 'f0', 'ack'], ['f1', 'ack'], ['f1', 'ack', 'f0'], ['ack']]); let fault = 0, al = 0; const steps = [];
    seq.forEach((e) => {
      if (e === 'f1') { steps.push(set('I0.0', 1, 'The pressure switch reports a fault (input ON).')); fault = 1; al = 1; }
      if (e === 'f0') { steps.push(set('I0.0', 0, 'The fault goes away (input OFF).')); fault = 0; }
      if (e === 'ack') { steps.push(tap('I0.1', 'ACK')); if (!fault) al = 0; }
    });
    return { kind: 'Alarm with acknowledge', text: 'RUNG Remember the fault\nNO(I0.0) SET(M0.0)\nRUNG Acknowledge works only when the fault is gone\nNO(I0.1) NC(I0.0) RST(M0.0)\nRUNG Alarm lamp\nNO(M0.0) COIL(Q0.0)', tags: { 'I0.0': 'Fault', 'I0.1': 'ACK', 'M0.0': 'Alarm', 'Q0.0': 'Alarm lamp' }, steps, ask: ['Q0.0'], want: { 'Q0.0': al },
      why: 'The alarm is <b>latched</b>: it stays on after the fault has gone, so the operator sees that something happened. ACK clears it, but the NC contact of the fault blocks ACK while the fault is still there.' };
  });

  LL.READ_PATTERNS = P;
  LL.genRead = function (k) { const sc = P[k == null ? rnd(P.length) : k](); sc.init = sc.init || {}; return sc; };
  LL.readRun = function (sc) {
    let prog = null;                                           // the narrowest grid that fits, so it is easy to read on a phone
    for (let c = 3; c <= 8 && !prog; c++) { try { prog = LL.parseProgram('COLS ' + c + '\n' + sc.text); } catch (e) { /* too narrow */ } }
    if (!prog) prog = LL.parseProgram(sc.text);
    const m = new LL.Machine(prog), I = Object.assign({}, sc.init);
    const run = (n) => { for (let k = 0; k < n; k++) { m.setInputs(I); m.scan(10); } };
    run(10);                                                   // the PLC is already running before the story starts
    sc.steps.forEach((s) => s.ops.forEach((o) => { Object.assign(I, o.in || {}); run(o.scans || Math.round(o.ms / 10)); }));
    const got = {}; sc.ask.forEach((a) => (got[a] = m.bit(a) ? 1 : 0));
    return { m, prog, got, inputs: I };
  };
})(typeof window !== 'undefined' ? window : globalThis);
