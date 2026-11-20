/* PLC Start — "Start a motor seven ways". Mounted in lessons through [[hw:starters]].
 * One 3-phase motor, seven starting methods (DOL, star-delta, autotransformer, stator resistance, rotor resistance,
 * soft starter, VFD). The power circuit is drawn live, the line current and the speed are plotted against time with
 * the direct-on-line curve as a ghost for comparison, and the control logic is shown as a relay circuit or as PLC
 * ladder with the same live states. A simple per-unit motor model: torque from the Kloss formula, current from slip. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-starters';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // ───────────── motor model (per unit: 1 = rated) ─────────────
  const Idol = (s) => { s = Math.max(0, Math.min(1, s)); const g = s * 1.033 / Math.sqrt(s * s + 0.0676); return Math.sqrt(36 * g * g + 0.09); };   // 6 × rated at standstill, 1 × at rated slip
  const Tdol = (s) => { s = Math.max(0.004, Math.min(1, s)); return 5 / (s / 0.2 + 0.2 / s); };   // breakdown 2.5 at slip 0.2
  const LOADS = { fan: { n: 'Fan / pump (easy start)', f: (n) => 0.08 + 0.82 * n * n }, heavy: { n: 'Loaded conveyor (hard start)', f: () => 0.8 } };
  const J = 1.6;
  const ton = (S, k, cond, dt, pt) => { S.tm[k] = cond ? (S.tm[k] || 0) + dt : 0; return cond && S.tm[k] >= pt; };

  // ───────────── the seven methods ─────────────
  // k: contactors; p: settings; logic(S, dt, P): contactor states; elec(S, s, P): {I, T} or null (no power)
  // rungs: [comment, [cells], [coil label, bit]]; cell = [type, hard-wired name, PLC name, bit]
  const RUN = (S) => S.run, OL = (S) => !S.trip;
  const head = [
    ['Start / stop with seal-in. The overload contact is in series: a trip drops everything.', [['OR', 'S2 START', 'I0.0 START', (S) => S.btn], ['NCB', 'S1 STOP', 'I0.1 STOP', () => 1], ['NO', 'F1 overload OK', 'I0.2 overload OK', OL]], ['run', RUN], 'K0 / M0.0'],
  ];
  const M = {
    dol: {
      name: 'Direct on line', hand: 'Close K1. That is all: full voltage at once.', tag: 'DOL', k: [['K1', 'line']], p: [],
      idea: 'One contactor: full voltage at once.',
      facts: ['Current: 6–8 × rated', 'Torque: full', 'Cost: lowest'], use: 'Small motors (to about 5–7 kW) on a strong supply.',
      hw: 'Breaker, 1 contactor, overload relay.', plc: '1 output. Reads the overload contact and the contactor feedback.',
      logic(S) { S.k.K1 = S.run ? 1 : 0; S.msg = S.run ? 'K1 is closed: the motor gets full voltage. Look at the current peak.' : ''; },
      elec(S, s) { return S.k.K1 ? { I: Idol(s), T: Tdol(s) } : null; },
      rungs: head.concat([['Line contactor', [['NO', 'K0', 'M0.0 run', RUN]], ['K1 line', (S) => S.k.K1], 'K1 / Q0.0']]),
    },
    sd: {
      name: 'Star-delta', hand: 'Close K1 and K2 (star). Wait until the speed stops rising. Open K2, then close K3 (delta). Never K2 and K3 together.', tag: 'Y-Δ', k: [['K1', 'line'], ['K2', 'star'], ['K3', 'delta']], p: [['tsd', 'Star time', 1, 10, 6, 's']],
      idea: 'Start with the windings in star (1/3 current, 1/3 torque), then switch to delta.',
      facts: ['Current: about 2 × rated', 'Torque: one third', 'Peak at the changeover'], use: 'Fans and pumps that start with a light load. Needs a motor with 6 terminals.',
      hw: 'Breaker, 3 contactors, overload relay, mechanical + electrical interlock between star and delta.', plc: '3 outputs and a timer. The interlock stays in the wiring too.',
      logic(S, dt, P) {
        const t1 = ton(S, 'star', S.run, dt, P.tsd), t2 = ton(S, 'gap', S.run && t1, dt, 0.06);
        S.k.K1 = S.run ? 1 : 0;
        const star = (S.run && !t1) || S.weld;                 // a welded star contactor stays closed
        let delta = S.run && t1 && t2;
        if (S.interlock && star) { if (delta) S.blocked = 1; delta = false; }   // NC contact of K2 in the coil circuit of K3
        S.k.K2 = star ? 1 : 0; S.k.K3 = delta ? 1 : 0;
        S.msg = !S.run ? '' : S.blocked ? 'K2 is welded, so its NC contact keeps K3 open: no short circuit. The motor stays in star, and the PLC raises "delta feedback missing".'
          : S.k.K3 ? 'Delta: full voltage on each winding. The step in the current is the changeover peak.' : !t1 ? 'Star: each winding gets 230 V instead of 400 V. Current and torque are one third.' : 'Short pause: star is open, delta not yet closed (so they never overlap).';
      },
      elec(S, s) { if (!S.k.K1) return null; if (S.k.K3 && !S.k.K2) return { I: Idol(s), T: Tdol(s) }; if (S.k.K2) return { I: Idol(s) / 3, T: Tdol(s) / 3 }; return null; },
      rungs: head.concat([
        ['Line contactor', [['NO', 'K0', 'M0.0 run', RUN]], ['K1 line', (S) => S.k.K1], 'K1 / Q0.0'],
        ['Star time', [['NO', 'K0', 'M0.0 run', RUN]], ['timer', (S) => S.run && S.tm.star >= S.P.tsd], 'K1T / T0'],
        ['Star: until the time is over, and never with delta', [['NO', 'K0', 'M0.0 run', RUN], ['NC', 'K1T', 'T0', (S) => !(S.run && S.tm.star >= S.P.tsd)], ['NC', 'K3 (interlock)', 'Q0.2 delta', (S) => !S.k.K3]], ['K2 star', (S) => S.k.K2], 'K2 / Q0.1'],
        ['Delta: after the time, and never with star', [['NO', 'K0', 'M0.0 run', RUN], ['NO', 'K1T', 'T0', (S) => S.run && S.tm.star >= S.P.tsd], ['NC', 'K2 (interlock)', 'Q0.1 star', (S) => !S.k.K2]], ['K3 delta', (S) => S.k.K3], 'K3 / Q0.2'],
      ]),
    },
    at: {
      name: 'Autotransformer', hand: 'Close K3 (star point) and K2 (transformer). Wait for speed. Open K3, close K1, then open K2. Never K1 and K3 together.', tag: 'AT', k: [['K1', 'run'], ['K2', 'transformer'], ['K3', 'star point']], p: [['tap', 'Tap', 50, 80, 65, '%'], ['tat', 'Start time', 1, 10, 4, 's']],
      idea: 'A transformer gives the motor a lower voltage (for example 65 %) while it starts.',
      facts: ['Line current: tap² (0.65² = 42 %)', 'Torque: tap²', 'Best torque per amp'], use: 'Big motors on a weak supply: compressors, pumps, mills.',
      hw: 'Breaker, 3 contactors, autotransformer, overload relay, interlock between run and star point.', plc: '3 outputs and timers, in a fixed order (closed transition).',
      logic(S, dt, P) {
        const a = ton(S, 'a', S.run, dt, P.tat), b = ton(S, 'b', S.run && a, dt, 0.15), c = ton(S, 'c', S.run && b, dt, 0.12);
        S.k.K3 = S.run && !a ? 1 : 0; S.k.K2 = S.run && !c ? 1 : 0; S.k.K1 = S.run && b ? 1 : 0;
        S.msg = !S.run ? '' : S.k.K1 && !S.k.K2 ? 'K1 only: full voltage. The transformer is out of the circuit.' : S.k.K1 ? 'K1 closes before K2 opens: the motor is never without voltage (closed transition).' : S.k.K3 ? 'K2 + K3: the motor gets ' + P.tap + ' % voltage. The supply sees only ' + Math.round(P.tap * P.tap / 100) + ' % of the DOL current.' : 'K3 opens: for a moment the transformer works as a series coil.';
      },
      elec(S, s, P) { const u = P.tap / 100; if (S.k.K1) return { I: Idol(s), T: Tdol(s) }; if (S.k.K2 && S.k.K3) return { I: u * u * Idol(s), T: u * u * Tdol(s) }; if (S.k.K2) return { I: 0.85 * Idol(s), T: 0.72 * Tdol(s) }; return null; },
      rungs: head.concat([
        ['Start time', [['NO', 'K0', 'M0.0 run', RUN]], ['timer', (S) => S.run && S.tm.a >= S.P.tat], 'K1T / T0'],
        ['Star point of the transformer: only during the start, never with K1', [['NO', 'K0', 'M0.0 run', RUN], ['NC', 'K1T', 'T0', (S) => !(S.run && S.tm.a >= S.P.tat)], ['NC', 'K1 (interlock)', 'Q0.0 run', (S) => !S.k.K1]], ['K3 star point', (S) => S.k.K3], 'K3 / Q0.2'],
        ['Transformer contactor: until K1 has taken over', [['NO', 'K0', 'M0.0 run', RUN], ['NC', 'K2T', 'T2', (S) => !(S.run && S.tm.c >= 0.12)]], ['K2 transformer', (S) => S.k.K2], 'K2 / Q0.1'],
        ['Run contactor: after the start time, when K3 is open', [['NO', 'K0', 'M0.0 run', RUN], ['NO', 'K1T', 'T0', (S) => S.run && S.tm.a >= S.P.tat], ['NC', 'K3 (interlock)', 'Q0.2 star point', (S) => !S.k.K3]], ['K1 run', (S) => S.k.K1], 'K1 / Q0.0'],
      ]),
    },
    res: {
      name: 'Stator resistance', hand: 'Close K1: the current goes through the resistors. Wait for speed, then close K2 to bridge them.', tag: 'R', k: [['K1', 'line'], ['K2', 'bypass']], p: [['tres', 'Resistor time', 1, 10, 4, 's']],
      idea: 'Resistors in series with the motor take part of the voltage. Then a contactor bridges them.',
      facts: ['Current: about 4 × rated', 'Torque: falls with voltage²', 'Resistors get hot'], use: 'Simple and smooth, for small and medium motors that start lightly. Wastes energy.',
      hw: 'Breaker, 2 contactors, 3 power resistors, overload relay.', plc: '2 outputs and a timer. Watch the resistor time: they overheat.',
      logic(S, dt, P) {
        S.k.K1 = S.run ? 1 : 0; S.k.K2 = S.run && ton(S, 'r', S.run, dt, P.tres) ? 1 : 0;
        S.msg = !S.run ? '' : S.k.K2 ? 'K2 bridges the resistors: full voltage.' : 'Current flows through the resistors. They drop voltage, so the motor gets less: softer start, less torque.';
      },
      elec(S, s) { if (!S.k.K1) return null; if (S.k.K2) return { I: Idol(s), T: Tdol(s) }; const u = 0.62 + 0.3 * (1 - s); return { I: u * Idol(s), T: u * u * Tdol(s) }; },
      rungs: head.concat([
        ['Line contactor (through the resistors)', [['NO', 'K0', 'M0.0 run', RUN]], ['K1 line', (S) => S.k.K1], 'K1 / Q0.0'],
        ['Resistor time', [['NO', 'K1', 'Q0.0 line', (S) => S.k.K1]], ['timer', (S) => S.run && S.tm.r >= S.P.tres], 'K1T / T0'],
        ['Bypass: bridge the resistors', [['NO', 'K1', 'Q0.0 line', (S) => S.k.K1], ['NO', 'K1T', 'T0', (S) => S.run && S.tm.r >= S.P.tres]], ['K2 bypass', (S) => S.k.K2], 'K2 / Q0.1'],
      ]),
    },
    rotor: {
      name: 'Rotor resistance', hand: 'Close K1 with all resistors in. Then close K11, K12 and K13 one by one, each time the speed stops rising.', tag: 'slip ring', k: [['K1', 'line'], ['K11', 'step 1'], ['K12', 'step 2'], ['K13', 'step 3']], p: [['tst', 'Time per step', 0.5, 4, 1.5, 's']],
      idea: 'A slip-ring motor: resistors in the ROTOR circuit give low current AND high torque. They are cut out step by step.',
      facts: ['Current: about 2–3 × rated', 'Torque: high from standstill', 'Needs a slip-ring motor'], use: 'Heavy starts: cranes, crushers, mills, big conveyors.',
      hw: 'Breaker, line contactor, slip-ring motor, 3 resistor groups, 3 step contactors, overload relay.', plc: '4 outputs, timers in a chain. Start only with all resistance in.',
      logic(S, dt, P) {
        S.k.K1 = S.run ? 1 : 0;
        S.k.K11 = S.run && ton(S, 'r1', S.run, dt, P.tst) ? 1 : 0; S.k.K12 = S.run && ton(S, 'r2', !!S.k.K11, dt, P.tst) ? 1 : 0; S.k.K13 = S.run && ton(S, 'r3', !!S.k.K12, dt, P.tst) ? 1 : 0;
        S.msg = !S.run ? '' : S.k.K13 ? 'All rotor resistors are bridged: the motor now runs like a normal one.' : S.k.K12 ? 'Step 2 bridged. Each step lifts the current a little and keeps the torque high.' : S.k.K11 ? 'Step 1 bridged.' : 'All resistance in the rotor: under 2 × current, but almost double torque right from standstill.';
      },
      elec(S, s) { if (!S.k.K1) return null; const e = s * (S.k.K13 ? 1 : S.k.K12 ? 0.45 : S.k.K11 ? 0.2 : 0.08); return { I: Idol(e), T: Tdol(e) }; },
      rungs: head.concat([
        ['Line contactor: the motor starts with all rotor resistance in', [['NO', 'K0', 'M0.0 run', RUN]], ['K1 line', (S) => S.k.K1], 'K1 / Q0.0'],
        ['Step 1 after the step time', [['NO', 'K1', 'Q0.0 line', (S) => S.k.K1], ['TON', 'K1T', 'T1', (S) => S.k.K11]], ['K11 step 1', (S) => S.k.K11], 'K11 / Q0.1'],
        ['Step 2 after step 1', [['NO', 'K11', 'Q0.1', (S) => S.k.K11], ['TON', 'K2T', 'T2', (S) => S.k.K12]], ['K12 step 2', (S) => S.k.K12], 'K12 / Q0.2'],
        ['Step 3 after step 2', [['NO', 'K12', 'Q0.2', (S) => S.k.K12], ['TON', 'K3T', 'T3', (S) => S.k.K13]], ['K13 step 3', (S) => S.k.K13], 'K13 / Q0.3'],
      ]),
    },
    soft: {
      name: 'Soft starter', hand: 'Close K1: the starter ramps the voltage up. When the motor is at full speed, close K2 (bypass).', tag: 'SS', k: [['K1', 'line'], ['K2', 'bypass']], p: [['tramp', 'Ramp time', 1, 10, 4, 's']],
      idea: 'Electronics (thyristors) raise the voltage smoothly. At full speed a bypass contactor takes over.',
      facts: ['Current: 2–4 × rated, adjustable', 'Torque: falls with voltage²', 'Soft stop too'], use: 'Pumps, fans, compressors, conveyors. No speed control.',
      hw: 'Breaker, soft starter, line and bypass contactor (often built in), its own motor protection.', plc: 'RUN output, reads "top of ramp" and "fault", closes the bypass.',
      logic(S, dt, P) {
        S.k.K1 = S.run ? 1 : 0; this.ramp(S, P);
        S.k.K2 = S.run && ton(S, 'top', S.run && S.trun >= P.tramp && S.n > 0.93, dt, 0.2) ? 1 : 0;
        S.msg = !S.run ? '' : S.k.K2 ? 'Top of ramp: the bypass K2 carries the current, so the starter stays cool.' : 'The starter lets through ' + Math.round(S.u * 100) + ' % voltage and limits the current to 3.5 × rated.';
      },
      ramp(S, P) { S.u = S.run ? Math.max(0.4, Math.min(0.4 + 0.6 * Math.min(1, S.trun / P.tramp), 3.5 / Idol(1 - S.n))) : 0.4; },
      elec(S, s) { if (!S.k.K1) return null; if (S.k.K2) return { I: Idol(s), T: Tdol(s) }; return { I: S.u * Idol(s), T: S.u * S.u * Tdol(s) }; },
      rungs: head.concat([
        ['Line contactor and RUN command to the starter', [['NO', 'K0', 'M0.0 run', RUN]], ['K1 + RUN', (S) => S.k.K1], 'K1 / Q0.0'],
        ['Bypass at the top of the ramp (a relay contact of the starter)', [['NO', 'K0', 'M0.0 run', RUN], ['NO', 'TOR relay', 'I0.3 top of ramp', (S) => S.run && S.trun >= S.P.tramp && S.n > 0.93]], ['K2 bypass', (S) => S.k.K2], 'K2 / Q0.1'],
      ]),
    },
    vfd: {
      name: 'Variable frequency drive', hand: 'Close K1: here it stands for the run signal on the drive input. A real drive stays on the supply and is not switched on and off with a contactor for every start. The drive does the whole ramp by itself: there is nothing to sequence.', tag: 'VFD', k: [['K1', 'run signal']], p: [['tramp', 'Ramp time', 1, 10, 4, 's']],
      idea: 'The drive raises frequency and voltage together: the motor follows the ramp with about rated current.',
      facts: ['Current: about 1–1.5 × rated', 'Torque: full, controlled', 'Speed control'], use: 'Anything that needs speed control, a very soft start, or energy saving.',
      hw: 'Breaker, the drive (with its own protection), motor cable with shield, often a safe-torque-off input.', plc: 'Run, direction, speed setpoint (analog or network). Reads ready, running, fault, current.',
      logic(S, dt, P) {
        S.k.K1 = S.run ? 1 : 0; this.ramp(S, P);
        S.msg = !S.run ? '' : S.f >= 1 ? 'The drive is at 50 Hz. The start cost about rated current only.' : 'The drive is at ' + Math.round(S.f * 50) + ' Hz. Voltage rises with frequency, so the motor is never "at standstill on full voltage".';
      },
      ramp(S, P) { S.f = S.run ? Math.min(1, S.trun / P.tramp) : 0; },
      elec(S, s, P, TL) { if (!S.k.K1) return null; const T = Math.min(1.6, TL + J * Math.max(0, S.f - S.n) * 9); return { I: 0.35 + 0.75 * T, T }; },
      rungs: head.concat([
        ['Run command to the drive (the speed setpoint is a word or an analog output)', [['NO', 'K0', 'M0.0 run', RUN], ['NO', 'drive ready', 'I0.3 ready', () => 1]], ['RUN', (S) => S.k.K1], 'DI1 / Q0.0'],
      ]),
    },
  };
  const ORDER = ['dol', 'sd', 'at', 'res', 'rotor', 'soft', 'vfd'];
  const CHECKS = [
    ['dol', 'Start direct on line and see the 6 × current peak'],
    ['sd', 'Star-delta with the fan: reach delta'],
    ['peak', 'Star-delta, star time too short: see the changeover peak (over 4 ×)'],
    ['stall', 'Star-delta with the loaded conveyor: the motor does not turn in star'],
    ['rotor', 'Start the loaded conveyor with rotor resistance (low current, high torque)'],
    ['at', 'Start with the autotransformer'], ['res', 'Start with stator resistance'], ['soft', 'Start with the soft starter'], ['vfd', 'Start with the drive: peak under 1.7 ×'],
    ['weld', 'Weld the star contactor: once without the interlock (short circuit), once with it (saved)'],
    ['trip', 'Trip the overload relay, then reset it'],
    ['hand', 'By hand: close the contactors yourself and do a star-delta start with a peak under 3 ×'],
  ];

  const CSS = `
.hw-starters{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:14px;margin:16px 0}
.hws-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}.hws-h b{font-size:var(--t-16)}
.hws-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.hws-tabs button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-ctl);padding:6px 12px;font:inherit;font-size:var(--t-14);font-weight:600;cursor:pointer;min-height:34px}
.hws-tabs button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.hws-tabs button.done::after{content:" ✓";color:var(--power-bright)}
.hws-idea{margin:4px 0 8px;font-size:var(--t-16)}.hws-facts{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.hws-facts span{background:var(--surface-3);border-radius:var(--r-ctl);padding:2px 10px;font-size:var(--t-13)}
.hws-grid{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:12px}@media(max-width:760px){.hws-grid{grid-template-columns:1fr}}
.hws-dia{background:var(--surface-2);border-radius:var(--r-ctl);padding:6px}.hws-dia svg{width:100%;height:auto;display:block;max-height:340px}
.hws-chart{background:var(--surface-2);border-radius:var(--r-ctl);padding:8px}.hws-chart canvas{width:100%;height:auto;display:block}
.hws-read{display:flex;gap:14px;flex-wrap:wrap;font-family:var(--f-mono);font-size:var(--t-13);margin:6px 2px 0}.hws-read b{font-size:var(--t-16)}
.hws-ctl{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}.hws-ctl label{font-size:var(--t-14);display:flex;gap:6px;align-items:center}
.hws-ctl select,.hws-ctl input[type=range]{max-width:150px}
.hws-cap{border-left:4px solid var(--info);background:var(--surface-2);border-radius:var(--r-ctl);padding:8px 12px;margin:8px 0;min-height:3.1em;font-size:var(--t-16);line-height:1.45}
.hws-cap.bad{border-color:var(--danger);background:var(--danger-soft)}.hws-cap small{display:block;font-family:var(--f-mono);font-size:var(--t-11);letter-spacing:.04em;color:var(--muted);text-transform:uppercase}
.hws-sec{font-family:var(--f-body);letter-spacing:.04em;text-transform:uppercase;font-size:var(--t-13);color:var(--muted);margin:14px 0 6px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center}
.hws-seg{display:inline-flex;border:1px solid var(--line);border-radius:var(--r-ctl);overflow:hidden}.hws-seg button{border:0;background:var(--surface);color:var(--ink);padding:5px 10px;font:inherit;font-size:var(--t-13);cursor:pointer;min-height:32px;text-transform:none;letter-spacing:0}
.hws-seg button.on{background:var(--ink);color:var(--surface)}
.hws-rungs{border:1px solid var(--line-2);border-radius:var(--r-ctl);overflow-x:auto;background:var(--surface)}
.hws-rung{padding:8px 10px;border-bottom:1px solid var(--line-2)}.hws-rung:last-child{border-bottom:0}.hws-rung i{display:block;font-size:var(--t-13);color:var(--muted);margin-bottom:5px}
.hws-row{display:flex;align-items:center;gap:0;min-width:max-content}.hws-wire{height:2px;width:14px;background:var(--line);flex:none}.hws-wire.on{background:var(--power-bright)}.hws-wire.gr{flex:1;min-width:14px}
.hws-c{border:2px solid var(--line);border-radius:var(--r-ctl);padding:3px 7px;font-family:var(--f-mono);font-size:var(--t-12);text-align:center;line-height:1.25;background:var(--surface);white-space:nowrap}
.hws-c b{display:block;font-size:var(--t-11);color:var(--muted);font-weight:600}.hws-c.on{border-color:var(--power-bright);background:var(--power-soft)}
.hws-or{display:flex;flex-direction:column;gap:3px}.hws-coil{border-radius:var(--r-ctl)}
.hws-who{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}@media(max-width:760px){.hws-who{grid-template-columns:1fr}}
.hws-who div{background:var(--surface-2);border-radius:var(--r-ctl);padding:8px 10px;font-size:var(--t-14);line-height:1.4}.hws-who b{display:block;font-size:var(--t-13);letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.hws-res{width:100%;border-collapse:collapse;font-size:var(--t-13)}.hws-res th,.hws-res td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line-2)}.hws-res th{color:var(--muted);font-size:var(--t-12);text-transform:uppercase;letter-spacing:.04em}
.hws-bar{display:inline-block;height:8px;border-radius:var(--r-tag);background:var(--info);vertical-align:middle;margin-right:6px}
.hws-chk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}@media(max-width:760px){.hws-chk{grid-template-columns:1fr}}
.hws-chk div{background:var(--surface-2);border-radius:var(--r-ctl);padding:6px 10px;font-size:var(--t-14)}.hws-chk div.ok{background:var(--power-soft)}.hws-chk div::before{content:"○ ";color:var(--muted)}.hws-chk div.ok::before{content:"✓ ";color:var(--power)}
.hws-tbl{overflow-x:auto}
.hw-starters [hidden]{display:none!important}
.hws-hand{padding:10px 12px}.hws-hand p{margin:0 0 8px;font-size:var(--t-14);line-height:1.45}.hws-hk{display:flex;gap:8px;flex-wrap:wrap}
.hws-hk button{border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-ctl);padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;min-width:92px;min-height:52px;line-height:1.25}
.hws-hk button small{display:block;font-weight:500;font-size:var(--t-12);color:var(--muted)}.hws-hk button.on{border-color:var(--power-bright);background:var(--power-soft)}`;

  LL.HW.starters = function (ph) {
    if (!document.getElementById('hw-starters-css')) { const st = document.createElement('style'); st.id = 'hw-starters-css'; st.textContent = CSS; document.head.appendChild(st); }
    let saved = {}; try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { saved = {}; }
    const done = saved.done || {}, results = saved.results || [];
    const keep = () => { try { localStorage.setItem(STORE, JSON.stringify({ done, results })); } catch (e) { /* private mode */ } };
    let method = 'dol', load = 'fan', mode = 'plc', weldSeen = saved.weldSeen || {};
    const P = { tsd: 6, tap: 65, tat: 4, tres: 4, tst: 1.5, tramp: 4 };
    let S;
    const fresh = () => { S = { run: false, btn: 0, n: 0, I: 0, T: 0, k: {}, tm: {}, trun: 0, t: 0, hist: [], peak: 0, trip: '', short: '', heat: 0, weld: false, interlock: true, blocked: 0, u: 0.4, f: 0, msg: '', P, atSpeed: 0, jump: 0, started: false }; M[method].k.forEach(([k]) => (S.k[k] = 0)); };
    fresh();
    const box = document.createElement('div'); box.className = 'hw-box hw-starters';
    box.innerHTML = `<div class="hws-h"><b>Start a motor seven ways</b><span class="hws-n" style="font-family:var(--f-mono);font-size:var(--t-13);color:var(--muted)"></span></div>
      <div class="hws-tabs" role="tablist"></div><p class="hws-idea"></p><div class="hws-facts"></div>
      <div class="hws-ctl"><button class="btn primary" data-a="start">▶ START</button><button class="btn" data-a="stop">■ STOP</button><button class="btn small" data-a="trip">Overload trips</button><button class="btn small" data-a="reset" hidden>Reset</button>
        <label>Load <select data-a="load">${Object.keys(LOADS).map((k) => `<option value="${k}">${LOADS[k].n}</option>`).join('')}</select></label><span class="hws-par"></span><span class="hws-x"></span></div>
      <div class="hws-cap"><small>What happens</small><span></span></div>
      <div class="hws-grid"><div class="hws-dia"></div><div class="hws-chart"><canvas width="640" height="300"></canvas><div class="hws-read"></div></div></div>
      <div class="hws-sec"><span>The control: who does what</span><span class="hws-seg"><button data-m="hw">Relays and timers</button><button data-m="plc">PLC ladder</button><button data-m="hand">By hand</button></span></div>
      <div class="hws-rungs"></div><div class="hws-who"></div>
      <div class="hws-sec"><span>Your starts, side by side</span><button class="btn small ghost" data-a="clear">Clear</button></div><div class="hws-tbl"><table class="hws-res"></table></div>
      <div class="hws-sec"><span>Try these</span><span class="hws-prog"></span></div><div class="hws-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q), $$ = (q) => [...box.querySelectorAll(q)];
    const cv = $('canvas'), ctx = cv.getContext('2d');
    const cap = (t, bad) => { const c = $('.hws-cap'); c.classList.toggle('bad', !!bad); c.lastElementChild.textContent = t; };
    const mark = (k) => { if (!done[k]) { done[k] = 1; keep(); renderChecks(); renderTabs(); } };

    // DOL ghost curve for the chosen load
    let ghost = [];
    const mkGhost = () => { ghost = []; let n = 0; for (let t = 0; t < 14; t += 0.02) { const s = 1 - n, TL = LOADS[load].f(n); n = Math.max(0, Math.min(1, n + (Tdol(s) - TL) / J * 0.02)); ghost.push([t, Idol(1 - n)]); } };

    function renderTabs() {
      $('.hws-tabs').innerHTML = ORDER.map((k) => `<button role="tab" data-t="${k}" class="${k === method ? 'on' : ''} ${done[k] ? 'done' : ''}" aria-selected="${k === method}">${esc(M[k].name)}</button>`).join('');
      $$('[data-t]').forEach((b) => (b.onclick = () => { method = b.dataset.t; fresh(); renderAll(); cap('Press START and watch the current (blue) and the speed (green). The grey line is the same motor started direct on line.'); }));
    }
    function renderPar() {
      const m = M[method];
      $('.hws-par').innerHTML = m.p.map(([k, n, lo, hi, , u]) => `<label>${esc(n)} <input type="range" data-p="${k}" min="${lo}" max="${hi}" step="${k === 'tap' ? 15 : 0.5}" value="${P[k]}"><b data-pv="${k}" style="font-family:var(--f-mono)">${P[k]} ${u}</b></label>`).join('');
      $$('[data-p]').forEach((r) => (r.oninput = () => { P[r.dataset.p] = +r.value; $(`[data-pv="${r.dataset.p}"]`).textContent = r.value + ' ' + m.p.find((x) => x[0] === r.dataset.p)[5]; }));
      $('.hws-x').innerHTML = method === 'sd' || (method === 'at' && mode === 'hand') ? `<label><input type="checkbox" data-a="il" ${S.interlock ? 'checked' : ''}> Interlock wired (NC contacts)</label>` + (method === 'sd' && mode !== 'hand' ? '<button class="btn small" data-a="weld">Star contactor welds</button>' : '') : '';
      $('[data-a="start"]').hidden = mode === 'hand';
      const il = $('[data-a="il"]'); if (il) il.onchange = () => { S.interlock = il.checked; cap(il.checked ? 'Interlock wired: an NC contact of each contactor is in the coil circuit of the other one. They cannot close together, whatever the program (or you) does.' : 'Interlock removed: now only the program (or you) keeps the two contactors apart. One mistake, or one welded contact, makes a short circuit.'); };
      const w = $('[data-a="weld"]'); if (w) w.onclick = () => { S.weld = true; cap('The contacts of K2 (star) are now welded: K2 stays closed even when its coil is off. Press START and wait for the changeover.'); };
    }
    function renderWho() {
      const m = M[method];
      $('.hws-who').innerHTML = `<div><b>Power circuit: always hardware</b>${esc(m.hw)} The PLC never carries motor current.</div>
        <div><b>Protection and interlocks: hardware, also with a PLC</b>The overload contact and the E-stop cut the coil circuit directly. ${method === 'sd' || method === 'at' ? 'The two contactors that must never close together are interlocked with NC contacts (and mechanically).' : 'The PLC reads these contacts as inputs, to show the alarm.'}</div>
        <div><b>${mode === 'plc' ? 'Sequence and timing: the PLC program' : mode === 'hand' ? 'Sequence and timing: you' : 'Sequence and timing: relays'}</b>${mode === 'hand' ? 'Here you close each contactor yourself, to feel what the sequence must do and what goes wrong when the order or the timing is bad. In a real panel a relay circuit or the PLC does this job.' : mode === 'plc' ? esc(m.plc) + ' Times are changed on the HMI, and the PLC checks every contactor feedback.' : 'Timer relays and auxiliary contacts do the sequence. It works without a PLC, but every change means rewiring, and there are no diagnostics.'}</div>`;
      $$('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    }
    function renderRungs() {
      const m = M[method], lab = (c) => esc(mode === 'plc' ? c[2] : c[1]);
      if (mode === 'hand') {
        $('.hws-rungs').innerHTML = `<div class="hws-hand"><p><b>You are the control now.</b> ${esc(m.hand)}</p><div class="hws-hk">${m.k.map(([k, n]) => `<button data-k="${k}" aria-pressed="false"><span>${k}</span><small>${esc(n)}</small></button>`).join('')}</div></div>`;
        return;
      }
      $('.hws-rungs').innerHTML = m.rungs.map((r, ri) => {
        const cells = r[1].map((c, ci) => c[0] === 'OR'
          ? `<span class="hws-or"><span class="hws-c" data-b="${ri}.${ci}.a"><b>NO</b>${lab(c)}</span><span class="hws-c" data-b="${ri}.${ci}.b"><b>NO seal-in</b>${mode === 'plc' ? 'M0.0 run' : 'K0'}</span></span>`
          : `<span class="hws-c" data-b="${ri}.${ci}"><b>${c[0] === 'NC' ? 'NC' : c[0] === 'NCB' ? 'NC button' : c[0] === 'TON' ? 'on-delay' : 'NO'}</b>${lab(c)}</span>`).join('<span class="hws-wire" data-w></span>');
        const coil = r[2][0] === 'timer' ? `<span class="hws-c" data-o="${ri}"><b>${mode === 'plc' ? 'TON' : 'timer relay'}</b>${esc(r[3].split(' / ')[mode === 'plc' ? 1 : 0])}</span>` : `<span class="hws-c hws-coil" data-o="${ri}"><b>${mode === 'plc' ? 'coil' : 'coil'}</b>${esc(r[3].split(' / ')[mode === 'plc' ? 1 : 0])} · ${esc(r[2][0])}</span>`;
        return `<div class="hws-rung"><i>${ri + 1}. ${esc(r[0])}</i><div class="hws-row"><span class="hws-wire" data-w></span>${cells}<span class="hws-wire gr" data-w></span>${coil}</div></div>`;
      }).join('');
    }
    function liveRungs() {
      const m = M[method];
      if (mode === 'hand') { $$('[data-k]').forEach((b) => { const on = !!S.k[b.dataset.k]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); return; }
      m.rungs.forEach((r, ri) => {
        let flow = true;
        r[1].forEach((c, ci) => {
          let on;
          if (c[0] === 'OR') { const a = !!c[3](S), b = !!S.run; const ea = box.querySelector(`[data-b="${ri}.${ci}.a"]`), eb = box.querySelector(`[data-b="${ri}.${ci}.b"]`); if (ea) ea.classList.toggle('on', a); if (eb) eb.classList.toggle('on', b); on = a || b; }
          else { on = !!c[3](S); const e = box.querySelector(`[data-b="${ri}.${ci}"]`); if (e) e.classList.toggle('on', on && flow); }
          flow = flow && on;
        });
        const o = box.querySelector(`[data-o="${ri}"]`); if (o) o.classList.toggle('on', !!r[2][1](S));
      });
    }
    function renderResults() {
      const t = $('.hws-res');
      if (!results.length) { t.innerHTML = '<tr><td style="color:var(--muted)">No start yet. Each finished start adds a row here, so you can compare the methods.</td></tr>'; return; }
      t.innerHTML = '<tr><th>Method</th><th>Load</th><th>Peak line current</th><th>Time to full speed</th></tr>' + results.slice(-9).map((r) => `<tr><td>${esc(r.m)}</td><td>${esc(r.l)}</td><td><span class="hws-bar" style="width:${Math.round(r.p * 12)}px;background:${r.p > 4.5 ? 'var(--danger)' : r.p > 2.5 ? 'var(--accent-bg)' : 'var(--power-bright)'}"></span>${r.p.toFixed(1)} × rated</td><td>${r.t ? r.t.toFixed(1) + ' s' : 'did not reach full speed'}</td></tr>`).join('');
    }
    function renderChecks() {
      $('.hws-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join('');
      const n = CHECKS.filter(([k]) => done[k]).length; $('.hws-prog').textContent = n + ' / ' + CHECKS.length + (n === CHECKS.length ? ' · all done' : '');
    }
    function renderAll() {
      const m = M[method];
      renderTabs(); $('.hws-idea').innerHTML = '<b>' + esc(m.name) + ':</b> ' + esc(m.idea) + ' <span style="color:var(--muted)">Used for: ' + esc(m.use) + '</span>';
      $('.hws-facts').innerHTML = m.facts.map((f) => `<span>${esc(f)}</span>`).join('');
      $('[data-a="load"]').value = load; mkGhost(); renderPar(); renderRungs(); renderWho(); renderResults(); renderChecks(); draw();
    }

    // ───────────── power circuit drawing ─────────────
    function diagram() {
      const m = method, live = (on) => (on ? 'var(--power-bright)' : 'currentColor'), sw = (on) => (on ? 3 : 1.8);
      const W = (x1, y1, x2, y2, on) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${live(on)}" stroke-width="${sw(on)}"/>`;
      const K = (x, y, id, on, sub) => W(x, y, x, y + 8, 0) + (on ? W(x, y + 8, x, y + 30, 1) : `<path d="M${x} ${y + 30} L${x - 11} ${y + 9}" stroke="currentColor" stroke-width="1.8"/>`) + W(x, y + 30, x, y + 38, 0)
        + `<text x="${x + 9}" y="${y + 18}" font-size="12" font-weight="700" fill="${on ? 'var(--power)' : 'currentColor'}" stroke="none">${id}</text><text x="${x + 9}" y="${y + 31}" font-size="9.5" fill="var(--muted)" stroke="none">${sub}</text>`;
      const B = (x, y, w, h, t, t2, on) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${on ? 'var(--power-soft)' : 'var(--surface)'}" stroke="${live(on)}" stroke-width="1.8"/><text x="${x + w / 2}" y="${y + h / 2 + (t2 ? -3 : 4)}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" stroke="none">${t}</text>` + (t2 ? `<text x="${x + w / 2}" y="${y + h / 2 + 11}" text-anchor="middle" font-size="9.5" fill="var(--muted)" stroke="none">${t2}</text>` : '');
      const k = S.k, pw = !S.trip && !S.short;
      let g = `<text x="150" y="12" text-anchor="middle" font-size="10" fill="var(--muted)" stroke="none">3 × 400 V</text>` + W(40, 20, 260, 20, pw) + W(150, 20, 150, 30, pw) + B(132, 30, 36, 20, 'Q1', '', pw && false) ;
      const mx = m === 'rotor' ? 105 : 150, my = 292;
      const motor = `<circle cx="${mx}" cy="${my}" r="24" fill="var(--surface)" stroke="${live(S.I > 0.05)}" stroke-width="2.4"/><g transform="rotate(${(S.ang || 0) % 360} ${mx} ${my})"><path d="M${mx} ${my - 15} V${my + 15} M${mx - 15} ${my} H${mx + 15}" stroke="${S.n > 0.01 ? 'var(--power-bright)' : 'var(--muted)'}" stroke-width="3"/></g><text x="${mx}" y="${my + 40}" text-anchor="middle" font-size="10" fill="var(--muted)" stroke="none">M  ${Math.round(S.n * 1480)} rpm</text>`;
      const F1 = (x) => B(x - 18, 236, 36, 20, 'F1', '', false) + W(x, 256, x, 268, S.I > 0.05);
      if (m === 'dol') g += W(150, 50, 150, 80, pw) + K(150, 80, 'K1', k.K1, 'line') + W(150, 118, 150, 236, k.K1) + F1(150);
      if (m === 'sd') g += W(150, 50, 150, 70, pw) + K(150, 70, 'K1', k.K1, 'line') + W(150, 108, 150, 236, k.K1) + F1(150)
        + W(235, 20, 235, 120, pw) + K(235, 120, 'K3', k.K3, 'delta') + W(235, 158, 235, 292, k.K3) + W(235, 292, 174, 292, k.K3)
        + W(126, 292, 60, 292, k.K2) + W(60, 292, 60, 208, k.K2) + K(60, 170, 'K2', k.K2, 'star') + `<path d="M48 168 H72 M53 162 H67" stroke="currentColor" stroke-width="1.8"/><text x="60" y="155" text-anchor="middle" font-size="9.5" fill="var(--muted)" stroke="none">star point</text>`;
      if (m === 'at') g += W(235, 20, 235, 60, pw) + K(235, 60, 'K1', k.K1, 'run') + W(235, 98, 235, 222, k.K1) + W(235, 222, 150, 222, k.K1) + W(150, 222, 150, 236, k.K1 || k.K2) + F1(150)
        + W(80, 20, 80, 50, pw) + K(80, 50, 'K2', k.K2, 'transf.') + B(52, 96, 56, 56, 'T1', S.P.tap + ' % tap', k.K2) + W(108, 124, 150, 124, k.K2) + W(150, 124, 150, 222, k.K2 && !k.K1)
        + K(80, 152, 'K3', k.K3, 'star pt') + `<path d="M68 194 H92 M73 200 H87" stroke="currentColor" stroke-width="1.8"/>`;
      if (m === 'res') g += W(150, 50, 150, 64, pw) + K(150, 64, 'K1', k.K1, 'line') + W(150, 102, 150, 120, k.K1) + B(128, 120, 44, 50, 'R', S.run && !k.K2 ? 'hot' : '3 resistors', k.K1 && !k.K2) + W(150, 170, 150, 236, k.K1) + F1(150)
        + W(150, 110, 235, 110, k.K1) + K(235, 122, 'K2', k.K2, 'bypass') + W(235, 110, 235, 122, k.K1) + W(235, 160, 235, 182, k.K2) + W(235, 182, 150, 182, k.K2);
      if (m === 'rotor') g += W(150, 50, 105, 50, pw) + W(105, 50, 105, 70, pw) + K(105, 70, 'K1', k.K1, 'line') + W(105, 108, 105, 236, k.K1) + F1(105)
        + W(129, 292, 200, 292, S.I > 0.05) + `<text x="165" y="286" text-anchor="middle" font-size="9" fill="var(--muted)" stroke="none">slip rings</text>` + W(200, 292, 200, 86, S.I > 0.05)
        + [['K11', 200], ['K12', 140], ['K13', 80]].map(([id, y], i) => B(180, y + 6, 40, 40, 'R' + (i + 1), k[id] ? 'bridged' : 'in', !k[id] && S.I > 0.05) + `<text x="232" y="${y + 24}" font-size="11.5" font-weight="700" fill="${k[id] ? 'var(--power)' : 'currentColor'}" stroke="none">${id}</text><text x="232" y="${y + 37}" font-size="9.5" fill="var(--muted)" stroke="none">${k[id] ? 'closed' : 'open'}</text>`).join('');
      if (m === 'soft') g += W(150, 50, 150, 60, pw) + K(150, 60, 'K1', k.K1, 'line') + W(150, 98, 150, 116, k.K1) + B(120, 116, 60, 56, 'Soft', k.K1 ? Math.round((k.K2 ? 1 : S.u) * 100) + ' % U' : 'starter', k.K1 && !k.K2) + W(150, 172, 150, 236, k.K1) + F1(150)
        + W(150, 106, 240, 106, k.K1) + W(240, 106, 240, 122, k.K1) + K(240, 122, 'K2', k.K2, 'bypass') + W(240, 160, 240, 190, k.K2) + W(240, 190, 150, 190, k.K2);
      if (m === 'vfd') g += W(150, 50, 150, 60, pw) + K(150, 60, 'K1', k.K1, 'line') + W(150, 98, 150, 120, k.K1) + B(112, 120, 76, 60, 'VFD', k.K1 ? Math.round(S.f * 50) + ' Hz' : 'drive', k.K1) + W(150, 180, 150, 268, k.K1);
      if (S.short) g += `<text x="150" y="212" text-anchor="middle" font-size="15" font-weight="800" fill="var(--danger)" stroke="none">SHORT CIRCUIT</text>`;
      if (S.trip === 'ol') g += `<text x="${mx}" y="232" text-anchor="middle" font-size="10" font-weight="800" fill="var(--danger)" stroke="none">F1 TRIPPED</text>`;
      return `<svg viewBox="0 0 300 340" fill="none" stroke="currentColor" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="Power circuit of the ${esc(M[m].name)} starter">${g}${motor}</svg>`;
    }
    function chart() {
      const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
      const cw = cv.clientWidth || 640, W = Math.max(280, Math.min(900, cw)), H = W < 480 ? 230 : 300, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const L = 34, R = 44, T = 14, Bm = 30, tmax = Math.max(8, Math.ceil((S.t + 1) / 2) * 2);
      const X = (t) => L + (t / tmax) * (W - L - R), YI = (i) => H - Bm - (Math.min(7, i) / 7) * (H - T - Bm), YN = (n) => H - Bm - n * (H - T - Bm);
      ctx.clearRect(0, 0, W, H); ctx.font = '12px "IBM Plex Mono", monospace'; ctx.lineWidth = 1;
      for (let i = 0; i <= 7; i++) { ctx.strokeStyle = v('--line-2'); ctx.beginPath(); ctx.moveTo(L, YI(i)); ctx.lineTo(W - R, YI(i)); ctx.stroke(); ctx.fillStyle = v('--info'); ctx.textAlign = 'right'; ctx.fillText(i + '×', L - 6, YI(i) + 4); }
      [0, 50, 100].forEach((p) => { ctx.fillStyle = v('--power'); ctx.textAlign = 'left'; ctx.fillText(p + '%', W - R + 6, YN(p / 100) + 4); });
      for (let t = 0; t <= tmax; t += (W < 480 && tmax > 8 ? 4 : 2)) { ctx.fillStyle = v('--muted'); ctx.textAlign = 'center'; ctx.fillText(t + ' s', X(t), H - 12); }
      ctx.strokeStyle = v('--muted'); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ghost.forEach(([t, i], k) => { if (t > tmax) return; k ? ctx.lineTo(X(t), YI(i)) : ctx.moveTo(X(t), YI(i)); }); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = v('--muted'); ctx.textAlign = 'left'; ctx.fillText('grey: direct on line', L + 8, T + 10);
      const line = (key, col, Y) => { ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); S.hist.forEach((h, k) => (k ? ctx.lineTo(X(h[0]), Y(h[key])) : ctx.moveTo(X(h[0]), Y(h[key])))); ctx.stroke(); };
      if (S.hist.length) { line(2, v('--power-bright'), YN); line(1, v('--info'), YI); }
      $('.hws-read').innerHTML = `<span style="color:var(--info)">line current <b>${S.I.toFixed(1)} ×</b></span><span>peak <b>${S.peak.toFixed(1)} ×</b></span><span style="color:var(--power)">speed <b>${Math.round(S.n * 100)} %</b></span><span>torque <b>${S.T.toFixed(1)} ×</b></span>`;
    }
    const draw = () => { $('.hws-dia').innerHTML = diagram(); chart(); liveRungs(); $('[data-a="reset"]').hidden = !S.trip && !S.short; };

    // ───────────── simulation ─────────────
    function finish(reached) {
      if (S.logged) return; S.logged = true;
      results.push({ m: M[method].name + (mode === 'hand' ? ' (by hand)' : ''), l: load === 'fan' ? 'fan' : 'conveyor', p: S.peak, t: reached ? S.atSpeed : 0 }); keep(); renderResults();
      if (reached && mode === 'hand') { if (method === 'sd' && S.peak < 3) mark('hand'); cap('Full speed. Your peak was ' + S.peak.toFixed(1) + ' × rated' + (S.peak > 4.5 ? ': as bad as a direct start. Wait longer before the next step.' : S.peak < 3 ? ': a clean start.' : '. Waiting a little longer before each step makes it lower.')); }
      if (reached && mode !== 'hand') {
        if (method === 'dol' && S.peak >= 5) mark('dol');
        if (method === 'sd' && load === 'fan') mark('sd');
        if (method === 'sd' && S.jump > 4) mark('peak');
        if (method === 'rotor' && load === 'heavy') mark('rotor');
        if (['at', 'res', 'soft'].includes(method)) mark(method);
        if (method === 'vfd' && S.peak < 1.7) mark('vfd');
      }
    }
    const handRun = () => !S.trip && !S.short && !!(method === 'at' ? S.k.K1 || S.k.K2 : S.k.K1);
    function step(dt) {
      const m = M[method];
      if (S.run) S.trun += dt;
      const hadK3 = S.k.K3;
      if (mode === 'hand') { if (S.weld) S.k.K2 = 1; S.run = handRun(); if (m.ramp) m.ramp(S, P); S.msg = ''; } else m.logic(S, dt, P);
      if (!S.short && method === 'sd' && S.k.K2 && S.k.K3) S.short = 'Star and delta closed together: a short circuit between the phases. The breaker trips with a bang.';
      if (!S.short && method === 'at' && S.k.K1 && S.k.K3) S.short = 'Run contactor and star point closed together: part of the transformer winding is shorted across the supply. The breaker trips.';
      if (S.short && !S.trip) { S.run = false; S.trip = 'short'; S.I = 0; M[method].k.forEach(([k]) => (S.k[k] = k === 'K2' && S.weld ? 1 : 0)); if (method === 'sd' && S.weld && mode !== 'hand') { weldSeen.no = 1; saved.weldSeen = weldSeen; if (weldSeen.no && weldSeen.yes) mark('weld'); keep(); } cap(S.short + ' This is why these two contactors are interlocked in the WIRING, not only in the program.', true); draw(); return; }
      if (method === 'sd' && S.blocked && !weldSeen.yes) { weldSeen.yes = 1; if (weldSeen.no && weldSeen.yes) mark('weld'); keep(); }
      const TL = LOADS[load].f(S.n), e = m.elec(S, 1 - S.n, P, TL);
      if (e) { S.I = e.I; S.T = e.T; const acc = (e.T - TL) / J; S.n = S.n <= 0.0005 && acc < 0 ? 0 : Math.max(0, Math.min(1, S.n + acc * dt)); }
      else { S.I = 0; S.T = 0; S.n = Math.max(0, S.n - (TL + 0.05) / J * dt); }
      if (method === 'sd' && S.k.K3 && !hadK3) S.jump = Idol(1 - S.n);
      if (S.run || S.n > 0.001) { S.t += dt; S.peak = Math.max(S.peak, S.I); if (!S.hist.length || S.t - S.hist[S.hist.length - 1][0] >= 0.03) S.hist.push([S.t, S.I, S.n]); }
      S.ang = (S.ang || 0) + S.n * 900 * dt;
      S.heat = Math.max(0, S.heat + (S.I > 1.15 ? (S.I * S.I - 1.3) : -3) * dt);
      if (S.run && S.heat > 300) { S.trip = 'ol'; S.run = false; cap('The overload relay F1 tripped: too much current for too long. Its contact opened the control circuit, so every contactor dropped. Let it cool, find the cause, then Reset.', true); mark('trip0'); }
      const final = method === 'dol' ? S.k.K1 : method === 'sd' ? S.k.K3 : method === 'at' ? S.k.K1 && !S.k.K2 : method === 'res' ? S.k.K2 : method === 'rotor' ? S.k.K13 : method === 'soft' ? S.k.K2 : S.f >= 1;
      if (S.run && final && !S.atSpeed && S.n > 0.9 && Math.abs((e ? e.T : 0) - TL) < 0.06) { S.atSpeed = S.t; finish(true); }
      if (S.run && !S.atSpeed && S.trun > 16 && mode !== 'hand') finish(false);
      if (S.run && !final && S.trun > 1.2 && S.n < 0.02 && S.I > 0.5) {
        if (method === 'sd') mark('stall');
        S.msg = method === 'sd' ? 'The motor does not turn: in star it has only one third of its torque, less than this load needs. Star-delta is only for light starts.' : method === 'soft' ? 'The motor does not turn: the current limit keeps the voltage low, and the torque falls with voltage². For this load the limit must be higher, or pick another method.' : 'The motor does not turn: less voltage means much less torque (voltage²), and this load needs more. It will only move when full voltage arrives.';
      }
      if (S.run && S.msg && !S.trip) cap(S.msg, /does not turn/.test(S.msg));
    }
    let raf = 0, last = 0;
    const loop = (now) => {
      if (!document.body.contains(box)) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (S.run || S.n > 0.001) { step(dt); draw(); }
      raf = requestAnimationFrame(loop);
    };
    box.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-a],[data-m],[data-k]'); if (!b) return;
      if (b.dataset.m) {
        const was = mode; mode = b.dataset.m;
        if ((was === 'hand') !== (mode === 'hand')) { fresh(); renderAll(); cap(mode === 'hand' ? 'By hand: there is no automatic sequence now. Close and open the contactors yourself with the buttons below.' : 'The sequence is automatic again. Press START.'); }
        else { renderRungs(); renderWho(); liveRungs(); }
        return;
      }
      if (b.dataset.k) {
        const k = b.dataset.k, close = !S.k[k];
        if (S.trip || S.short) return cap('Reset first: the protection has tripped.', true);
        const other = method === 'sd' ? { K2: 'K3', K3: 'K2' }[k] : method === 'at' ? { K1: 'K3', K3: 'K1' }[k] : '';
        if (close && S.interlock && other && S.k[other]) return cap(k + ' does not close: the NC contact of ' + other + ' is open in its coil circuit. That is the interlock doing its job. Open ' + other + ' first.');
        if (close && !M[method].k.some(([x]) => S.k[x]) && S.n < 0.05 && S.hist.length) { const il = S.interlock; fresh(); S.interlock = il; }
        S.k[k] = close ? 1 : 0; S.run = handRun();
        cap(k + (close ? ' closed.' : ' open.') + (S.run ? ' Watch the current and the speed, and take the next step when the speed stops rising.' : S.n > 0.05 ? ' No current now: the motor coasts.' : ''));
        draw(); return;
      }
      const a = b.dataset.a;
      if (a === 'start') {
        if (S.trip || S.short) return cap('Reset first: the protection has tripped.', true);
        if (S.run) return;
        if (S.n > 0.05) return cap('Wait until the motor has stopped, then start again.');
        const w = S.weld, il = S.interlock; fresh(); S.weld = w; S.interlock = il; S.run = true; S.btn = 1; setTimeout(() => (S.btn = 0), 300);
      }
      if (a === 'stop') { if (S.run && !S.atSpeed) finish(false); S.run = false; if (mode === 'hand') M[method].k.forEach(([k]) => (S.k[k] = 0)); cap('STOP opens the seal-in: all contactors drop and the motor coasts to a stop.'); }
      if (a === 'trip') { if (!S.run) return cap('Start the motor first, then trip the overload.'); S.trip = 'ol'; S.run = false; if (mode === 'hand') M[method].k.forEach(([k]) => (S.k[k] = 0)); done.trip0 = 1; cap('The overload relay F1 tripped. Its NC contact is in series with the control circuit, so every contactor dropped at once, with or without a PLC. The PLC only reads a second contact to show the alarm.', true); draw(); }
      if (a === 'reset') { const wasOl = S.trip === 'ol'; const il = S.interlock; fresh(); S.interlock = il; if (wasOl && done.trip0) mark('trip'); renderPar(); cap(wasOl ? 'Overload reset by hand at the relay. The motor does not restart by itself: you must press START.' : 'Breaker switched on again, and the welded contactor replaced.'); draw(); }
      if (a === 'clear') { results.length = 0; keep(); renderResults(); }
    });
    $('[data-a="load"]').onchange = (e) => { load = e.target.value; fresh(); renderAll(); cap(load === 'heavy' ? 'A loaded conveyor needs about 80 % torque from the first moment. Methods that cut the torque may not move it.' : 'A fan needs almost no torque at standstill; the load grows with the speed. Every method can start it.'); };
    renderAll();
    cap('Pick a method, press START and watch the current (blue) and the speed (green). The grey line is the same motor started direct on line.');
    raf = requestAnimationFrame(loop);
  };
})();
