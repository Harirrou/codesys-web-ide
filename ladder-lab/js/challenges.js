/* Ladder Lab — hands-on challenges. Each one is checked by automated tests
 * that drive the virtual machine exactly like a commissioning engineer would. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  LL.CHALLENGES = [
    // ───────────── Level 1 · Foundations ─────────────
    {
      id: 'first-light', level: 1, plant: 'panel', title: 'First light',
      brief: 'Lamp <b>L1</b> must be ON while <b>PB1</b> is held down, and OFF when it is released.',
      hints: ['One normally-open contact on PB1 (I0.0) feeding one coil on L1 (Q0.0).'],
      solution: 'RUNG Lamp follows the button\nNO(I0.0) COIL(Q0.0)',
      tests: [
        { name: 'Lamp is off at rest', steps: ['expect Q0.0=0'] },
        { name: 'Lamp follows PB1', steps: ['press I0.0', 'expect Q0.0=1', 'release I0.0', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'ready-lamp', level: 1, plant: 'panel', title: 'Ready lamp (NC contact)',
      tags: { 'Q0.1': 'Ready' },
      brief: 'The <b>Ready</b> lamp L2 (Q0.1) is ON whenever <b>PB2</b> is <i>not</i> pressed, and goes OFF while PB2 is held.',
      hints: ['A normally-closed contact passes power while its bit is 0.'],
      solution: 'RUNG Ready unless PB2 is pressed\nNC(I0.1) COIL(Q0.1)',
      tests: [
        { name: 'Ready at rest', steps: ['expect Q0.1=1'] },
        { name: 'PB2 turns Ready off', steps: ['press I0.1', 'expect Q0.1=0', 'release I0.1', 'expect Q0.1=1'] },
      ],
    },
    {
      id: 'two-hand', level: 1, plant: 'panel', title: 'Two-hand press (AND)',
      tags: { 'Q0.0': 'Press down' },
      brief: 'A press may only close when the operator uses <b>both hands</b>: L1 (Press down) is ON only while <b>PB1 AND PB2</b> are both held.',
      hints: ['Series contacts make an AND: power must pass through both.'],
      solution: 'RUNG Both hands on the buttons\nNO(I0.0) NO(I0.1) COIL(Q0.0)',
      tests: [
        { name: 'One hand is not enough', steps: ['press I0.0', 'expect Q0.0=0', 'release I0.0', 'press I0.1', 'expect Q0.0=0'] },
        { name: 'Two hands close the press', steps: ['press I0.0', 'press I0.1', 'expect Q0.0=1', 'release I0.1', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'hall-light', level: 1, plant: 'panel', title: 'Hall light (OR)',
      tags: { 'Q0.2': 'Hall light', 'I0.4': 'Door SW', 'I0.5': 'Stairs SW' },
      brief: 'Light L3 (Q0.2) comes ON if <b>SW1 OR SW2</b> is on.',
      hints: ['Put the second contact on a branch below the first one and join the branch back before the coil.'],
      solution: 'RUNG Either switch lights the hall\nNO(I0.4) | COIL(Q0.2)\nNO(I0.5)',
      tests: [
        { name: 'Off with both switches off', steps: ['expect Q0.2=0'] },
        { name: 'Each switch alone works', steps: ['on I0.4', 'expect Q0.2=1', 'off I0.4', 'expect Q0.2=0', 'on I0.5', 'expect Q0.2=1'] },
        { name: 'Both switches on', steps: ['on I0.4', 'on I0.5', 'expect Q0.2=1'] },
      ],
    },
    {
      id: 'permissive', level: 1, plant: 'panel', title: 'Permissive + run (AND/OR)',
      tags: { 'I0.4': 'Auto mode', 'I0.0': 'Local run', 'I0.5': 'Remote run', 'Q0.0': 'Pump' },
      brief: 'The pump L1 (Q0.0) runs only in <b>Auto mode</b> (SW1), and then when either <b>Local run</b> (PB1) OR <b>Remote run</b> (SW2) asks for it.',
      hints: ['Pump = Auto AND (Local OR Remote).', 'Branch only around the part that is OR-ed. The Auto contact stays in series.'],
      solution: 'RUNG Pump = Auto AND (Local OR Remote)\nNO(I0.4) | NO(I0.0) | COIL(Q0.0)\n. NO(I0.5)',
      tests: [
        { name: 'Nothing without Auto', steps: ['press I0.0', 'on I0.5', 'expect Q0.0=0'] },
        { name: 'Auto + local', steps: ['on I0.4', 'expect Q0.0=0', 'press I0.0', 'expect Q0.0=1', 'release I0.0', 'expect Q0.0=0'] },
        { name: 'Auto + remote', steps: ['on I0.4', 'on I0.5', 'expect Q0.0=1'] },
      ],
    },
    {
      id: 'stop-nc', level: 1, plant: 'panel', title: 'The NC stop button trap',
      tags: { 'Q0.4': 'Stop pressed' },
      brief: 'The red <b>STOP</b> button (I0.3) is wired <b>normally-closed</b>, so its input reads 1 while nobody touches it. Make lamp L5 (Q0.4) light while STOP is being <b>pressed</b>.',
      hints: ['Watch I0.3 in the I/O list: it is 1 at rest and drops to 0 when pressed.', 'You want the lamp when the bit is 0, so the contact you need is…'],
      solution: 'RUNG STOP is wired NC: pressed = 0\nNC(I0.3) COIL(Q0.4)',
      tests: [
        { name: 'Dark while nobody presses STOP', steps: ['wait 50', 'expect Q0.4=0'] },
        { name: 'Lit while STOP is pressed', steps: ['press I0.3', 'expect Q0.4=1', 'release I0.3', 'expect Q0.4=0'] },
      ],
    },

    // ───────────── Level 2 · Memory & motor control ─────────────
    {
      id: 'start-stop', level: 2, plant: 'motor', title: 'Start / stop with seal-in',
      brief: 'Tap <b>FWD</b> to start K1 (Q0.0); the motor keeps running after you release it. <b>STOP</b> (wired NC) or an <b>overload trip</b> stops it. After an overload reset the motor must <b>not</b> restart by itself. If START and STOP are pressed together, STOP wins.',
      hints: ['Put a contact of the output itself (Q0.0) in parallel with the start button. That is the seal-in, or holding, contact.', 'STOP and OL are wired NC, so they read 1 when healthy: use normally-open contacts for them, in series.'],
      solution: 'RUNG Start/stop latch\nNO(I0.0) | NO(I0.2) NO(I0.3) COIL(Q0.0)\nNO(Q0.0)',
      tests: [
        { name: 'Start latches', steps: ['tap I0.0', 'wait 300', 'expect Q0.0=1'] },
        { name: 'Stop unlatches', steps: ['tap I0.0', 'tap I0.2', 'expect Q0.0=0', 'wait 300', 'expect Q0.0=0'] },
        { name: 'Overload stops, no auto-restart', steps: ['tap I0.0', 'action trip', 'wait 50', 'expect Q0.0=0', 'action trip', 'wait 300', 'expect Q0.0=0'] },
        { name: 'Stop is dominant', steps: ['press I0.2', 'press I0.0', 'expect Q0.0=0', 'release I0.0', 'release I0.2', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'set-reset', level: 2, plant: 'panel', title: 'Set & reset coils',
      brief: 'Use a <b>SET</b> coil and a <b>RESET</b> coil: PB1 turns L1 (Q0.0) on, PB2 turns it off. If both are held, L1 must be <b>OFF</b> (reset dominant).',
      hints: ['When two rungs write the same bit, the rung lower down runs later in the scan, so it wins.'],
      solution: 'RUNG Set\nNO(I0.0) SET(Q0.0)\nRUNG Reset (last rung wins)\nNO(I0.1) RST(Q0.0)',
      tests: [
        { name: 'Set stays set', steps: ['tap I0.0', 'wait 200', 'expect Q0.0=1'] },
        { name: 'Reset clears', steps: ['tap I0.0', 'tap I0.1', 'expect Q0.0=0'] },
        { name: 'Reset dominant', steps: ['press I0.0', 'press I0.1', 'expect Q0.0=0', 'release I0.1', 'expect Q0.0=1'] },
      ],
    },
    {
      id: 'interlock', level: 2, plant: 'motor', title: 'Forward / reverse interlock',
      brief: '<b>FWD</b> latches K1 (Q0.0), <b>REV</b> latches K2 (Q0.1). STOP and the overload stop both. K1 and K2 must <b>never</b> be on together: pressing REV while running forward is ignored until STOP.',
      hints: ['Two start/stop circuits.', 'Put an NC contact of K2 in the K1 rung, and an NC contact of K1 in the K2 rung. That is an electrical interlock.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'K1 and K2 were on at the same time: short circuit!' }],
      solution: 'RUNG Forward\nNO(I0.0) | NO(I0.2) NO(I0.3) NC(Q0.1) COIL(Q0.0)\nNO(Q0.0)\nRUNG Reverse\nNO(I0.1) | NO(I0.2) NO(I0.3) NC(Q0.0) COIL(Q0.1)\nNO(Q0.1)',
      tests: [
        { name: 'Forward runs', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=0'] },
        { name: 'Reverse runs', steps: ['tap I0.1', 'expect Q0.1=1 Q0.0=0'] },
        { name: 'REV ignored while FWD', steps: ['tap I0.0', 'tap I0.1', 'expect Q0.0=1 Q0.1=0', 'tap I0.2', 'tap I0.1', 'expect Q0.1=1 Q0.0=0'] },
        { name: 'Both pressed at once', steps: ['press I0.0', 'press I0.1', 'wait 200', 'release I0.0', 'release I0.1', 'wait 100'] },
        { name: 'Overload stops both', steps: ['tap I0.1', 'action trip', 'wait 50', 'expect Q0.0=0 Q0.1=0'] },
      ],
    },
    {
      id: 'toggle', level: 2, plant: 'panel', title: 'One-button toggle',
      brief: 'Each <b>press</b> of PB1 toggles L1 (Q0.0): first press ON, next press OFF, and so on. Holding the button must not make it flicker.',
      hints: ['Use a rising-edge contact P(I0.0) to make a one-scan pulse on a memory bit.', 'Then Q0.0 = pulse XOR Q0.0: two branches, (pulse AND NOT Q0.0) OR (NOT pulse AND Q0.0).'],
      solution: 'RUNG One-shot pulse on each press\nP(I0.0) COIL(M0.0)\nRUNG Flip the lamp on each pulse\nNO(M0.0) NC(Q0.0) | COIL(Q0.0)\nNC(M0.0) NO(Q0.0)',
      tests: [
        { name: 'Press → on', steps: ['tap I0.0', 'expect Q0.0=1'] },
        { name: 'Holding does not flicker', steps: ['press I0.0', 'wait 1000', 'expect Q0.0=1', 'release I0.0', 'wait 100', 'expect Q0.0=1'] },
        { name: 'Press again → off → on', steps: ['tap I0.0', 'tap I0.0', 'expect Q0.0=0', 'tap I0.0', 'expect Q0.0=1'] },
      ],
    },
    {
      id: 'fix-double-coil', level: 2, plant: 'panel', title: 'Bug hunt: double coil',
      brief: 'L1 should light when <b>PB1 OR PB2</b> is pressed. The previous programmer wrote two rungs that both drive Q0.0, and PB1 "doesn\'t work". Fix the program.',
      starter: 'RUNG Lamp from PB1\nNO(I0.0) COIL(Q0.0)\nRUNG Lamp from PB2\nNO(I0.1) COIL(Q0.0)',
      hints: ['Run it and press PB1: rung 1 turns Q0.0 on, rung 2 turns it straight back off in the same scan.', 'One output = one coil. Combine the conditions with a parallel branch.'],
      solution: 'RUNG Lamp from PB1 or PB2\nNO(I0.0) | COIL(Q0.0)\nNO(I0.1)',
      tests: [
        { name: 'PB1 lights L1', steps: ['press I0.0', 'expect Q0.0=1'] },
        { name: 'PB2 lights L1', steps: ['press I0.1', 'expect Q0.0=1'] },
      ],
    },
    {
      id: 'fix-stop', level: 2, plant: 'motor', title: 'Bug hunt: motor won\'t start',
      brief: 'An electrician wired the STOP button NC like the drawings say. Now the motor never starts. Find and fix the bug in the program (don\'t rewire!).',
      starter: 'RUNG Start/stop\nNO(I0.0) | NC(I0.2) NO(I0.3) COIL(Q0.0)\nNO(Q0.0)',
      hints: ['Look at I0.2 with nothing pressed: it is 1. What does an NC contact do with a 1?'],
      solution: 'RUNG Start/stop\nNO(I0.0) | NO(I0.2) NO(I0.3) COIL(Q0.0)\nNO(Q0.0)',
      tests: [
        { name: 'Motor starts', steps: ['tap I0.0', 'expect Q0.0=1'] },
        { name: 'Motor stops', steps: ['tap I0.0', 'tap I0.2', 'expect Q0.0=0'] },
      ],
    },

    // ───────────── Level 3 · Timers ─────────────
    {
      id: 'delay-on', level: 3, plant: 'panel', title: 'On-delay (TON)',
      tags: { 'I0.4': 'Run request', 'Q0.0': 'Running' },
      brief: 'L1 comes ON <b>3 s after</b> SW1 is switched on, and goes OFF immediately when SW1 is switched off. If SW1 goes off before 3 s, L1 never lights.',
      hints: ['TON(T0, 3s) fed by SW1, then a contact T0 (its done bit) drives the lamp.'],
      solution: 'RUNG 3 s on-delay\nNO(I0.4) TON(T0,3s)\nRUNG Lamp when timer done\nNO(T0) COIL(Q0.0)',
      tests: [
        { name: 'Waits 3 s', steps: ['on I0.4', 'wait 2700', 'expect Q0.0=0', 'wait 400', 'expect Q0.0=1'] },
        { name: 'Off immediately', steps: ['on I0.4', 'wait 3200', 'off I0.4', 'expect Q0.0=0'] },
        { name: 'Short request ignored', steps: ['on I0.4', 'wait 1500', 'off I0.4', 'on I0.4', 'wait 2000', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'fan-overrun', level: 3, plant: 'panel', title: 'Fan overrun (TOF)',
      tags: { 'I0.4': 'Light switch', 'Q0.1': 'Fan' },
      brief: 'A bathroom fan L2 (Q0.1) runs while the light switch SW1 is on, and keeps running for <b>5 s after</b> it is switched off.',
      hints: ['An off-delay timer output turns on immediately and turns off PT after its input drops.'],
      solution: 'RUNG 5 s off-delay\nNO(I0.4) TOF(T1,5s)\nRUNG Fan\nNO(T1) COIL(Q0.1)',
      tests: [
        { name: 'Starts immediately', steps: ['on I0.4', 'expect Q0.1=1'] },
        { name: 'Runs on 5 s', steps: ['on I0.4', 'wait 500', 'off I0.4', 'wait 4700', 'expect Q0.1=1', 'wait 400', 'expect Q0.1=0'] },
      ],
    },
    {
      id: 'one-pulse', level: 3, plant: 'panel', title: 'Fixed pulse (TP)',
      tags: { 'I0.0': 'Feed', 'Q0.0': 'Feeder solenoid' },
      brief: 'Each press of PB1 fires the feeder L1 for exactly <b>2 s</b>, whether the button is tapped or held for a long time.',
      hints: ['A pulse timer (TP) gives a fixed-length output on every rising edge of its input.'],
      solution: 'RUNG 2 s pulse per press\nNO(I0.0) TP(T4,2s)\nRUNG Solenoid\nNO(T4) COIL(Q0.0)',
      tests: [
        { name: 'Tap gives 2 s', steps: ['tap I0.0 100', 'expect Q0.0=1', 'wait 1500', 'expect Q0.0=1', 'wait 400', 'expect Q0.0=0'] },
        { name: 'Holding still gives 2 s', steps: ['press I0.0', 'wait 2400', 'expect Q0.0=0', 'release I0.0'] },
      ],
    },
    {
      id: 'service-hours', level: 3, plant: 'panel', title: 'Run-hour meter (RTO)',
      tags: { 'I0.4': 'Machine running', 'Q0.7': 'Service due', 'I0.2': 'Service done' },
      brief: 'Count the total running time of a machine (SW1 on). After <b>5 s in total</b>, even split over several runs, light <b>Service due</b> L8 (Q0.7). PB3 (Service done) clears it.',
      hints: ['A retentive timer keeps its elapsed time when its input switches off.', 'Retentive timers only clear with a RESET coil.'],
      solution: 'RUNG Accumulate run time\nNO(I0.4) RTO(T5,5s)\nRUNG Service lamp\nNO(T5) COIL(Q0.7)\nRUNG Clear after service\nNO(I0.2) RST(T5)',
      tests: [
        { name: 'Time adds up', steps: ['on I0.4', 'wait 3000', 'off I0.4', 'wait 2000', 'on I0.4', 'wait 1500', 'expect Q0.7=0', 'wait 700', 'expect Q0.7=1'] },
        { name: 'Service done clears it', steps: ['on I0.4', 'wait 5200', 'off I0.4', 'tap I0.2', 'expect Q0.7=0'] },
      ],
    },
    {
      id: 'flasher', level: 3, plant: 'panel', title: 'Flashing beacon',
      tags: { 'I0.4': 'Alarm active', 'Q0.4': 'Beacon' },
      brief: 'While SW1 is on, beacon L5 (Q0.4) flashes about <b>0.5 s on, 0.5 s off</b>. When SW1 goes off, the beacon is dark.',
      hints: ['Two timers that reset each other make a free-running oscillator.', 'Or: use the system clock bit SM0.5 (1 Hz, 50 % duty) in series with SW1.'],
      solution: 'RUNG Off-time timer, reset by the on-time timer\nNO(I0.4) NC(T2) TON(T1,500ms)\nRUNG On-time timer\nNO(T1) TON(T2,500ms)\nRUNG Beacon on while T1 is done\nNO(I0.4) NO(T1) COIL(Q0.4)',
      tests: [
        { name: 'Flashes ~1 Hz', steps: ['on I0.4', 'pulses Q0.4 4000 3 5'] },
        { name: 'Dark when off', steps: ['on I0.4', 'wait 1700', 'off I0.4', 'wait 50', 'stays Q0.4=0 2000'] },
      ],
    },
    {
      id: 'traffic', level: 3, plant: 'traffic', title: 'Traffic light cycle',
      brief: 'With <b>RUN</b> on, loop: Green 5 s → Yellow 2 s → Red 5 s. Pedestrian <b>Walk</b> only during red; <b>Don\'t walk</b> at all other times. With RUN off: red and Don\'t walk.',
      hints: ['Chain three TON timers: green time, yellow time, red time. The last one resets the first.', 'Each lamp is then a combination of timer done bits.'],
      never: [{ when: 'Q0.2=1 Q0.3=1', msg: 'Walk was on while cars had green!' }, { when: 'Q0.0=1 Q0.2=1', msg: 'Red and green together.' }],
      solution: 'RUNG Green time\nNO(I0.0) NC(T3) TON(T1,5s)\nRUNG Yellow time\nNO(T1) TON(T2,2s)\nRUNG Red time (resets the cycle)\nNO(T2) TON(T3,5s)\nRUNG Green\nNO(I0.0) NC(T1) COIL(Q0.2)\nRUNG Yellow\nNO(T1) NC(T2) COIL(Q0.1)\nRUNG Red\nNO(T2) | COIL(Q0.0)\nNC(I0.0)\nRUNG Walk\nNO(T2) COIL(Q0.3)\nRUNG Don\'t walk\nNC(Q0.3) COIL(Q0.4)',
      tests: [
        { name: 'Idle is safe', steps: ['wait 100', 'expect Q0.0=1 Q0.4=1 Q0.2=0 Q0.3=0'] },
        { name: 'Full cycle timing', steps: ['on I0.0', 'expect Q0.2=1 Q0.0=0', 'wait 4700', 'expect Q0.2=1', 'wait 500', 'expect Q0.1=1 Q0.2=0', 'wait 2000', 'expect Q0.0=1 Q0.3=1 Q0.1=0', 'wait 5000', 'expect Q0.2=1 Q0.3=0 Q0.4=1'] },
      ],
    },
    {
      id: 'star-delta', level: 3, plant: 'stardelta', title: 'Star-delta starter',
      brief: '<b>START</b> latches the main contactor KM (Q0.0) together with the star contactor KY (Q0.1). After <b>4 s</b>, KY drops out and the delta contactor KΔ (Q0.2) pulls in. STOP or overload switch everything off. KY and KΔ must never be on together.',
      hints: ['Latch a "running" memory bit M0.0 with START/STOP/OL.', 'TON timer from M0.0. Star = M0.0 AND NOT timer, Delta = M0.0 AND timer, each with an NC interlock of the other.'],
      never: [{ when: 'Q0.1=1 Q0.2=1', msg: 'Star and delta were on together!' }],
      solution: 'RUNG Running latch\nNO(I0.0) | NO(I0.1) NO(I0.2) COIL(M0.0)\nNO(M0.0)\nRUNG Main contactor\nNO(M0.0) COIL(Q0.0)\nRUNG Star time\nNO(M0.0) TON(T0,4s)\nRUNG Star\nNO(M0.0) NC(T0) NC(Q0.2) COIL(Q0.1)\nRUNG Delta\nNO(M0.0) NO(T0) NC(Q0.1) COIL(Q0.2)',
      tests: [
        { name: 'Starts in star', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=1 Q0.2=0'] },
        { name: 'Changes to delta after 4 s', steps: ['tap I0.0', 'wait 3500', 'expect Q0.1=1', 'wait 600', 'expect Q0.1=0 Q0.2=1 Q0.0=1'] },
        { name: 'Stop and overload', steps: ['tap I0.0', 'wait 5000', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0', 'tap I0.0', 'action trip', 'wait 50', 'expect Q0.0=0 Q0.1=0'] },
      ],
    },

    // ───────────── Level 4 · Counters & data ─────────────
    {
      id: 'count-boxes', level: 4, plant: 'conveyor', title: 'Batch of five boxes',
      brief: '<b>START</b> runs the belt (seal-in, STOP stops it). Count boxes at the photo-eye. After <b>5 boxes</b> the belt stops by itself and <b>Batch done</b> (Q0.1) lights. Pressing START again clears the count and starts a new batch.',
      hints: ['CTU(C0,5) counts rising edges of the photo-eye.', 'Put NC(C0) in the motor rung, and RST(C0) on START.'],
      solution: 'RUNG Belt motor stops when the batch is complete\nNO(I0.0) | NO(I0.1) NC(C0) COIL(Q0.0)\nNO(Q0.0)\nRUNG Count boxes\nNO(I0.2) CTU(C0,5)\nRUNG Batch done lamp\nNO(C0) COIL(Q0.1)\nRUNG New batch\nNO(I0.0) RST(C0)',
      tests: [
        { name: 'Belt starts', steps: ['tap I0.0', 'expect Q0.0=1'] },
        { name: 'Stops after 5', steps: ['tap I0.0', 'action box', 'wait 1200', 'action box', 'wait 1200', 'action box', 'wait 1200', 'action box', 'wait 1200', 'expect Q0.0=1', 'action box', 'wait 4000', 'expect Q0.0=0 Q0.1=1 C0.CV=5'] },
        { name: 'START begins a new batch', steps: ['tap I0.0', 'action box', 'wait 1200', 'action box', 'wait 1200', 'action box', 'wait 1200', 'action box', 'wait 1200', 'action box', 'wait 4000', 'tap I0.0', 'expect Q0.0=1 Q0.1=0', 'wait 2000', 'expect C0.CV=0'] },
      ],
    },
    {
      id: 'parking', level: 4, plant: 'parking', title: 'Parking lot counter',
      brief: 'The lot has <b>5 spaces</b>. Count cars in (entry sensor) and out (exit sensor) with <b>one counter</b>. Show <b>FULL</b> (Q0.0) at 5 cars, otherwise <b>SPACES</b> (Q0.1). RESET clears the count.',
      hints: ['CTU and CTD can share the same counter number: one adds, one subtracts.'],
      solution: 'RUNG Car in\nNO(I0.0) CTU(C0,5)\nRUNG Car out\nNO(I0.1) CTD(C0,5)\nRUNG Reset\nNO(I0.2) RST(C0)\nRUNG Full\nNO(C0) COIL(Q0.0)\nRUNG Spaces\nNC(C0) COIL(Q0.1)',
      tests: [
        { name: 'Empty lot', steps: ['expect Q0.1=1 Q0.0=0'] },
        { name: 'Fills up', steps: ['action enter', 'wait 500', 'action enter', 'wait 500', 'action enter', 'wait 500', 'action enter', 'wait 500', 'expect Q0.0=0', 'action enter', 'wait 500', 'expect Q0.0=1 Q0.1=0'] },
        { name: 'Car leaves → space', steps: ['action enter', 'wait 500', 'action enter', 'wait 500', 'action enter', 'wait 500', 'action enter', 'wait 500', 'action enter', 'wait 500', 'action leave', 'wait 500', 'expect Q0.0=0 Q0.1=1'] },
        { name: 'Reset', steps: ['action enter', 'wait 500', 'action enter', 'wait 500', 'tap I0.2', 'expect C0.CV=0'] },
      ],
    },
    {
      id: 'compare', level: 4, plant: 'panel', title: 'Level indicators (compare)',
      tags: { 'I0.0': 'Count', 'I0.1': 'Clear', 'Q0.0': '≥ 3', 'Q0.1': '≥ 6', 'Q0.2': 'exactly 4' },
      brief: 'Count presses of PB1 in counter C1 (preset 100). L1 lights at <b>count ≥ 3</b>, L2 at <b>count ≥ 6</b>, L3 when the count is <b>exactly 4</b>. PB2 clears the count.',
      hints: ['A compare contact reads a number (like C1.CV) and passes power when the comparison is true.'],
      solution: 'RUNG Count presses\nNO(I0.0) CTU(C1,100)\nRUNG Clear\nNO(I0.1) RST(C1)\nRUNG ≥ 3\nCMP(C1.CV>=3) COIL(Q0.0)\nRUNG ≥ 6\nCMP(C1.CV>=6) COIL(Q0.1)\nRUNG = 4\nCMP(C1.CV==4) COIL(Q0.2)',
      tests: [
        { name: 'Thresholds', steps: ['tap I0.0', 'tap I0.0', 'expect Q0.0=0', 'tap I0.0', 'expect Q0.0=1 Q0.1=0 Q0.2=0', 'tap I0.0', 'expect Q0.2=1', 'tap I0.0', 'expect Q0.2=0', 'tap I0.0', 'expect Q0.1=1'] },
        { name: 'Clear', steps: ['tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.1', 'expect Q0.0=0 C1.CV=0'] },
      ],
    },
    {
      id: 'math', level: 4, plant: 'panel', title: 'Score keeper (MOV & ADD)',
      tags: { 'I0.0': '+1', 'I0.1': '+5', 'I0.2': 'Clear', 'Q0.0': '≥ 10' },
      brief: 'Keep a score in <b>MW10</b>. Each press of PB1 adds 1, each press of PB2 adds 5, PB3 sets it back to 0. L1 lights when the score is 10 or more.',
      hints: ['ADD runs on every scan while its rung has power, so feed it with a rising-edge contact P(...).', 'MOV(0,MW10) clears the word.'],
      solution: 'RUNG +1 once per press\nP(I0.0) ADD(MW10,1,MW10)\nRUNG +5 once per press\nP(I0.1) ADD(MW10,5,MW10)\nRUNG Clear\nNO(I0.2) MOV(0,MW10)\nRUNG Target reached\nCMP(MW10>=10) COIL(Q0.0)',
      tests: [
        { name: 'Adds one per press', steps: ['press I0.0', 'wait 500', 'release I0.0', 'expect MW10=1', 'tap I0.0', 'expect MW10=2'] },
        { name: 'Adds five', steps: ['tap I0.1', 'tap I0.1', 'expect MW10=10 Q0.0=1'] },
        { name: 'Clears', steps: ['tap I0.1', 'tap I0.2', 'expect MW10=0 Q0.0=0'] },
      ],
    },

    // ───────────── Level 5 · Sequences & projects ─────────────
    {
      id: 'tank', level: 5, plant: 'tank', title: 'Tank level control (hysteresis)',
      brief: 'START enables automatic mode, STOP disables it. In auto, the pump (Q0.0) <b>starts when the level falls below the LOW switch</b> and <b>stops at the HIGH switch</b>, then waits until the level is low again. The pump must never run when auto is off.',
      hints: ['Pump = "set" by low level, "reset" by high level. This is hysteresis, and it stops the pump short-cycling.', 'Latch an Auto memory bit (M0.0) with START/STOP.'],
      solution: 'RUNG Auto mode latch\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG Level low → start pump\nNO(M0.0) NC(I0.2) SET(Q0.0)\nRUNG Level high or auto off → stop pump\nNO(I0.3) | RST(Q0.0)\nNC(M0.0)',
      tests: [
        { name: 'Fills to high', steps: ['action demand', 'tap I0.0', 'expect Q0.0=1', 'waitfor I0.3=1 15000', 'wait 50', 'expect Q0.0=0'] },
        { name: 'Waits, then refills (hysteresis)', steps: ['action demand', 'tap I0.0', 'waitfor I0.3=1 15000', 'wait 50', 'stays Q0.0=0 8000', 'waitfor Q0.0=1 12000', 'expect I0.2=0'] },
        { name: 'Stop disables', steps: ['tap I0.0', 'wait 500', 'tap I0.1', 'expect Q0.0=0', 'wait 2000', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'cylinders-abc', level: 5, plant: 'cylinders', title: 'Cylinder sequence A+ B+ C+ C− B− A−',
      brief: 'When all cylinders are home and <b>START</b> is pressed, run one cycle: A out, then B out, then C out, then C back, B back, A back. Each move starts only after the sensor confirms the previous one. <b>STOP</b> aborts: all valves off. The machine does not restart on its own.',
      hints: ['Use memory bits: M0.0 = cycle running, M0.1 = return phase (set when C reaches its end).', 'Y1 = M0.0 AND NOT(return AND B home). Work backwards for Y2 and Y3.'],
      solution: 'RUNG Start only when everything is home\nNO(I0.0) NO(I0.2) NO(I0.4) NO(I0.6) NC(M0.0) SET(M0.0)\nRUNG C fully out → return phase\nNO(M0.0) NO(I0.7) SET(M0.1)\nRUNG A home in return phase, or STOP → end cycle\nNO(M0.1) NO(I0.2) | RST(M0.0)\nNC(I0.1) -\nRUNG Clear return phase\nNC(M0.0) RST(M0.1)\nRUNG Y1 valve A\nNO(M0.0) | NC(M0.1) | COIL(Q0.0)\n. NC(I0.4)\nRUNG Y2 valve B\nNO(M0.0) NO(I0.3) | NC(M0.1) | COIL(Q0.1)\n. . NC(I0.6)\nRUNG Y3 valve C\nNO(M0.0) NO(I0.5) NC(M0.1) COIL(Q0.2)',
      tests: [
        { name: 'Correct sequence', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=0', 'order Q0.1+ Q0.2+ Q0.2- Q0.1- Q0.0- 12000', 'wait 1500', 'expect I0.2=1 I0.4=1 I0.6=1'] },
        { name: 'One cycle only', steps: ['tap I0.0', 'wait 9000', 'stays Q0.0=0 3000'] },
        { name: 'STOP aborts', steps: ['tap I0.0', 'wait 1600', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0', 'stays Q0.0=0 2000'] },
      ],
    },
    {
      id: 'step-machine', level: 5, plant: 'cylinders', title: 'Step-number state machine',
      brief: 'Build <b>A+ B+ A− B−</b> as a state machine with the step number in <b>MW0</b>: 0 = idle, 1 = A out, 2 = B out, 3 = A back, 4 = B back, then 0. START (with A and B home) moves 0 → 1. STOP forces step 0. Outputs are decoded from the step number.',
      hints: ['One rung per transition: CMP(MW0==n) AND condition → MOV(n+1,MW0).', 'Then one rung per output: Y1 on in steps 1 and 2, Y2 on in steps 2 and 3.'],
      solution: 'RUNG 0 → 1: start\nCMP(MW0==0) NO(I0.0) NO(I0.2) NO(I0.4) MOV(1,MW0)\nRUNG 1 → 2: A is out\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: B is out\nCMP(MW0==2) NO(I0.5) MOV(3,MW0)\nRUNG 3 → 4: A is home\nCMP(MW0==3) NO(I0.2) MOV(4,MW0)\nRUNG 4 → 0: B is home\nCMP(MW0==4) NO(I0.4) MOV(0,MW0)\nRUNG STOP → step 0\nNC(I0.1) MOV(0,MW0)\nRUNG Y1 in steps 1, 2\nCMP(MW0==1) | COIL(Q0.0)\nCMP(MW0==2)\nRUNG Y2 in steps 2, 3\nCMP(MW0==2) | COIL(Q0.1)\nCMP(MW0==3)',
      tests: [
        { name: 'Uses the step register', steps: ['tap I0.0', 'expect MW0=1'] },
        { name: 'Sequence A+ B+ A− B−', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=0', 'order Q0.1+ Q0.0- Q0.1- 8000', 'waitfor MW0=0 3000'] },
        { name: 'STOP resets', steps: ['tap I0.0', 'wait 1500', 'tap I0.1', 'expect MW0=0 Q0.0=0 Q0.1=0'] },
      ],
    },
    {
      id: 'garage', level: 5, plant: 'garage', title: 'Garage door project',
      brief: 'OPEN runs the motor UP until the upper limit. CLOSE runs it DOWN until the lower limit. STOP halts it. The warning light flashes while the door moves. If the <b>safety beam</b> is blocked while closing, the door must stop and <b>reverse to fully open</b>. UP and DOWN must never be on together.',
      hints: ['Two latched rungs with limit switches and interlocks, like the reversing motor.', 'Remember the "reverse" request in a memory bit, because the DOWN coil is already off on the next scan.', 'Flash: SM0.5 AND (UP OR DOWN).'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'UP and DOWN were on together.' }],
      solution: 'RUNG Beam blocked while closing → remember to reverse\nNO(Q0.1) NC(I0.5) SET(M0.0)\nRUNG Clear reverse request at top or on STOP\nNO(I0.3) | RST(M0.0)\nNC(I0.2)\nRUNG Motor DOWN\nNO(I0.1) | NO(I0.2) NC(I0.4) NO(I0.5) NC(Q0.0) NC(M0.0) COIL(Q0.1)\nNO(Q0.1)\nRUNG Motor UP\nNO(I0.0) | NO(I0.2) NC(I0.3) NC(Q0.1) COIL(Q0.0)\nNO(Q0.0) |\nNO(M0.0)\nRUNG Warning light flashes while moving\nNO(SM0.5) NO(Q0.0) | COIL(Q0.2)\n. NO(Q0.1)',
      tests: [
        { name: 'Opens to the limit', steps: ['tap I0.0', 'expect Q0.0=1', 'waitfor I0.3=1 6000', 'wait 50', 'expect Q0.0=0'] },
        { name: 'Closes to the limit', steps: ['tap I0.0', 'waitfor I0.3=1 6000', 'tap I0.1', 'expect Q0.1=1', 'waitfor I0.4=1 6000', 'wait 50', 'expect Q0.1=0'] },
        { name: 'STOP halts', steps: ['tap I0.0', 'wait 1000', 'tap I0.2', 'expect Q0.0=0', 'wait 1000', 'expect Q0.0=0'] },
        { name: 'Safety beam reverses', steps: ['tap I0.0', 'waitfor I0.3=1 6000', 'tap I0.1', 'wait 1500', 'action obstacle', 'wait 50', 'expect Q0.1=0 Q0.0=1', 'waitfor I0.3=1 6000'] },
        { name: 'Warning light flashes', steps: ['tap I0.0', 'pulses Q0.2 3000 2 4'] },
      ],
    },
  ];

  LL.CH_BY_ID = {};
  LL.CHALLENGES.forEach((c) => (LL.CH_BY_ID[c.id] = c));
})(typeof window !== 'undefined' ? window : globalThis);
