/* Ladder Lab — hands-on challenges. Each one is checked by automated tests
 * that drive the virtual machine exactly like a commissioning engineer would. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  const IO_CYL = 'PROGRAM PLC_PRG\nVAR\n  Start  AT %IX0.0 : BOOL;\n  StopOK AT %IX0.1 : BOOL;   (* wired NC: TRUE when not pressed *)\n  A0 AT %IX0.2 : BOOL;  A1 AT %IX0.3 : BOOL;\n  B0 AT %IX0.4 : BOOL;  B1 AT %IX0.5 : BOOL;\n  C0 AT %IX0.6 : BOOL;  C1 AT %IX0.7 : BOOL;\n  Y1 AT %QX0.0 : BOOL;  Y2 AT %QX0.1 : BOOL;  Y3 AT %QX0.2 : BOOL;';

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

    {
      id: 'analog-scale', level: 4, plant: 'atank', title: 'Scale a 4–20 mA level signal',
      brief: 'The level transmitter gives <b>AIW0</b>: 6400 at 0 % (4 mA) up to 32000 at 100 % (20 mA). Convert it to <b>percent in MW0</b> (0–100). Then light the <b>High alarm</b> (Q0.0) at ≥ 90 % and the <b>Low alarm</b> (Q0.1) at ≤ 10 %.',
      hints: ['Percent = (AIW0 − 6400) ÷ 256, because 25600 counts ÷ 100 % = 256 counts per percent.', 'Use an always-on contact SM0.0 with SUB(AIW0,6400,MW0), then DIV(MW0,256,MW0) on the next rung.', 'Alarms are compare contacts on MW0.'],
      solution: 'NAME Level scaling\nRUNG Remove the 4 mA live zero\nNO(SM0.0) SUB(AIW0,6400,MW0)\nRUNG 256 counts per percent\nNO(SM0.0) DIV(MW0,256,MW0)\nRUNG High alarm\nCMP(MW0>=90) COIL(Q0.0)\nRUNG Low alarm\nCMP(MW0<=10) COIL(Q0.1)',
      tests: [
        { name: 'Scales 20 % correctly', steps: ['wait 50', 'expect MW0=20'] },
        { name: 'High alarm at 90 %', steps: ['action bypass', 'waitfor Q0.0=1 20000', 'plant lvlPct>=89 lvlPct<=91', 'expect Q0.1=0'] },
        { name: 'Low alarm at 10 %', steps: ['expect Q0.1=0', 'waitfor Q0.1=1 5000', 'plant lvlPct>=9 lvlPct<=11', 'expect Q0.0=0'] },
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
    {
      id: 'cyl-cycle-stop', level: 5, plant: 'cylinders', title: 'Cylinders: continuous cycle with cycle-stop',
      brief: 'START begins <b>continuous</b> cycling of <b>A+ B+ A− B−</b>. Pressing <b>STOP</b> (wired NC) is a <b>cycle stop</b>: the machine finishes the current cycle and stops with both cylinders home. It must not stop in the middle of a stroke.',
      hints: ['Latch a "run request" bit with START/STOP. STOP only clears the request.', 'Use a step number MW0. Step 0 → 1 needs the run request AND both cylinders home. The last step always goes back to 0, so a new cycle starts only if the request is still on.'],
      solution: 'NAME Cycle stop\nRUNG Run request (STOP = cycle stop)\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG 0 → 1: requested and home\nCMP(MW0==0) NO(M0.0) NO(I0.2) NO(I0.4) MOV(1,MW0)\nRUNG 1 → 2: A out\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: B out\nCMP(MW0==2) NO(I0.5) MOV(3,MW0)\nRUNG 3 → 4: A home\nCMP(MW0==3) NO(I0.2) MOV(4,MW0)\nRUNG 4 → 0: B home (cycle complete)\nCMP(MW0==4) NO(I0.4) MOV(0,MW0)\nRUNG Y1 in steps 1, 2\nCMP(MW0==1) | COIL(Q0.0)\nCMP(MW0==2)\nRUNG Y2 in steps 2, 3\nCMP(MW0==2) | COIL(Q0.1)\nCMP(MW0==3)',
      tests: [
        { name: 'Cycles continuously', steps: ['tap I0.0', 'expect Q0.0=1', 'order Q0.1+ Q0.0- Q0.1- Q0.0+ Q0.1+ 9000'] },
        { name: 'STOP finishes the cycle', steps: ['tap I0.0', 'wait 800', 'tap I0.1', 'expect Q0.0=1 Q0.1=1', 'order Q0.0- Q0.1- 4000', 'stays Q0.0=0 3000', 'expect I0.2=1 I0.4=1'] },
      ],
    },
    {
      id: 'cyl-dwell', level: 5, plant: 'cylinders', title: 'Cylinders: clamp, stamp and dwell',
      brief: 'A press station: <b>A+</b> clamps the part, <b>B+</b> stamps it and <b>holds for 2 s</b> (dwell), then <b>B−</b>, then <b>A−</b> releases. One cycle per START press, only from home. STOP aborts (both valves off).',
      hints: ['Six steps: 0 idle, 1 clamp, 2 stamp, 3 dwell (TON 2 s), 4 stamp back, 5 unclamp.', 'Y1 stays on in steps 1–4: CMP(MW0>=1) CMP(MW0<=4) in series. Y2 in steps 2–3.'],
      solution: 'NAME Clamp and stamp\nRUNG 0 → 1: START from home\nCMP(MW0==0) P(I0.0) NO(I0.2) NO(I0.4) MOV(1,MW0)\nRUNG 1 → 2: clamped\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: stamp down\nCMP(MW0==2) NO(I0.5) MOV(3,MW0)\nRUNG 3 → 4: dwell done\nCMP(MW0==3) NO(T0) MOV(4,MW0)\nRUNG 4 → 5: stamp up\nCMP(MW0==4) NO(I0.4) MOV(5,MW0)\nRUNG 5 → 0: unclamped\nCMP(MW0==5) NO(I0.2) MOV(0,MW0)\nRUNG STOP aborts\nNC(I0.1) MOV(0,MW0)\nRUNG Dwell time\nCMP(MW0==3) TON(T0,2s)\nRUNG Y1 clamp in steps 1–4\nCMP(MW0>=1) CMP(MW0<=4) COIL(Q0.0)\nRUNG Y2 stamp in steps 2–3\nCMP(MW0>=2) CMP(MW0<=3) COIL(Q0.1)',
      tests: [
        { name: 'Sequence A+ B+ B− A−', steps: ['tap I0.0', 'expect Q0.0=1', 'order Q0.1+ Q0.1- Q0.0- 8000', 'stays Q0.0=0 2000'] },
        { name: 'Holds the stamp 2 s', steps: ['tap I0.0', 'waitfor I0.5=1 4000', 'stays Q0.1=1 1900', 'waitfor Q0.1=0 400'] },
        { name: 'STOP aborts', steps: ['tap I0.0', 'wait 1500', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 MW0=0'] },
      ],
    },
    {
      id: 'cyl-parallel', level: 5, plant: 'cylinders', title: 'Cylinders: simultaneous moves',
      brief: '<b>A and C extend together</b>. Only when <b>both</b> are out, <b>B</b> extends. When B is out, <b>all three retract together</b>. The cycle ends when all are home. One cycle per START; STOP aborts.',
      hints: ['A step can wait for two sensors at once: NO(A1) NO(C1) in series.', 'Return to idle only when A0, B0 and C0 are all on.'],
      solution: 'NAME Parallel moves\nRUNG 0 → 1: START from home\nCMP(MW0==0) P(I0.0) NO(I0.2) NO(I0.4) NO(I0.6) MOV(1,MW0)\nRUNG 1 → 2: A and C both out\nCMP(MW0==1) NO(I0.3) NO(I0.7) MOV(2,MW0)\nRUNG 2 → 3: B out\nCMP(MW0==2) NO(I0.5) MOV(3,MW0)\nRUNG 3 → 0: everything home\nCMP(MW0==3) NO(I0.2) NO(I0.4) NO(I0.6) MOV(0,MW0)\nRUNG STOP aborts\nNC(I0.1) MOV(0,MW0)\nRUNG Y1 in steps 1, 2\nCMP(MW0==1) | COIL(Q0.0)\nCMP(MW0==2)\nRUNG Y3 in steps 1, 2\nCMP(MW0==1) | COIL(Q0.2)\nCMP(MW0==2)\nRUNG Y2 in step 2\nCMP(MW0==2) COIL(Q0.1)',
      tests: [
        { name: 'A and C together, then B', steps: ['tap I0.0', 'expect Q0.0=1 Q0.2=1 Q0.1=0', 'waitfor Q0.1=1 2000', 'expect I0.3=1 I0.7=1'] },
        { name: 'All retract together', steps: ['tap I0.0', 'waitfor I0.5=1 3000', 'wait 50', 'expect Q0.0=0 Q0.1=0 Q0.2=0', 'waitfor MW0=0 2000', 'expect I0.2=1 I0.4=1 I0.6=1'] },
      ],
    },

    // ───────────── Level 6 · Real-world projects ─────────────
    {
      id: 'ped-crossing', level: 6, plant: 'traffic', title: 'Pedestrian crossing on request',
      brief: 'With <b>RUN</b> on, cars keep <b>green</b> until a pedestrian presses the button (a short tap must be remembered). Then: <b>yellow 2 s</b> → <b>red + Walk 5 s</b> → back to green and wait for the next request. Don\'t walk whenever Walk is off. RUN off: red.',
      hints: ['Latch a "request" memory bit with the button; drop it when the red phase timer is done.', 'Request starts a 2 s yellow timer; its done bit starts a 5 s red timer.', 'Green = RUN AND NOT request. Yellow = request AND NOT yellow-timer-done. Walk = yellow timer done.'],
      never: [{ when: 'Q0.2=1 Q0.3=1', msg: 'Walk was on while cars had green!' }, { when: 'Q0.1=1 Q0.3=1', msg: 'Walk was on during yellow!' }],
      solution: 'RUNG Remember the request until the red phase has finished\nNO(I0.1) | NO(I0.0) NC(T2) COIL(M0.0)\nNO(M0.0)\nRUNG Yellow time\nNO(M0.0) TON(T1,2s)\nRUNG Red time\nNO(T1) TON(T2,5s)\nRUNG Green until a request\nNO(I0.0) NC(M0.0) COIL(Q0.2)\nRUNG Yellow\nNO(M0.0) NC(T1) COIL(Q0.1)\nRUNG Red\nNO(T1) | COIL(Q0.0)\nNC(I0.0)\nRUNG Walk\nNO(T1) COIL(Q0.3)\nRUNG Don\'t walk\nNC(Q0.3) COIL(Q0.4)',
      tests: [
        { name: 'Green waits for a request', steps: ['on I0.0', 'expect Q0.2=1', 'stays Q0.2=1 6000'] },
        { name: 'Short tap starts the cycle', steps: ['on I0.0', 'wait 1000', 'tap I0.1 80', 'expect Q0.1=1 Q0.2=0', 'wait 2000', 'expect Q0.0=1 Q0.3=1', 'wait 5000', 'expect Q0.2=1 Q0.3=0 Q0.4=1', 'stays Q0.2=1 4000'] },
        { name: 'RUN off is red', steps: ['wait 100', 'expect Q0.0=1 Q0.2=0 Q0.4=1'] },
      ],
    },
    {
      id: 'bottling', level: 6, plant: 'bottling', title: 'Bottle filling line',
      brief: '<b>START</b> runs the line (STOP stops everything). The conveyor brings bottles to the filler. When a bottle <b>arrives</b> in position: stop the conveyor, open the fill valve until the bottle is <b>full</b>, close it, then move on to the next bottle. No spills, no overfilling, no under-filled bottles. Running lamp on while the line runs.',
      hints: ['Latch a "line running" memory bit.', 'The bottle stays in place after filling, so start the fill on the rising edge P(I0.2) of "bottle in place", not on the level.', 'Fill step: SET on arrival, RESET when full. Conveyor = running AND NOT filling. Valve = filling AND NOT full.'],
      solution: 'RUNG Line running latch\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG New bottle arrived → filling step\nNO(M0.0) P(I0.2) SET(M0.1)\nRUNG Full or line stopped → end of filling\nNO(I0.3) | RST(M0.1)\nNC(M0.0)\nRUNG Fill valve\nNO(M0.1) NC(I0.3) COIL(Q0.1)\nRUNG Conveyor only when not filling\nNO(M0.0) NC(M0.1) COIL(Q0.0)\nRUNG Running lamp\nNO(M0.0) COIL(Q0.2)',
      tests: [
        { name: 'Stops and fills the first bottle', steps: ['tap I0.0', 'waitfor I0.2=1 3000', 'wait 50', 'expect Q0.0=0 Q0.1=1', 'waitfor I0.3=1 3000', 'wait 50', 'expect Q0.1=0 Q0.0=1'] },
        { name: 'Fills a run of bottles', steps: ['tap I0.0', 'wait 16000', 'plant filled>=3 under=0'] },
        { name: 'STOP mid-fill', steps: ['tap I0.0', 'waitfor Q0.1=1 3000', 'wait 500', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0'] },
      ],
    },
    {
      id: 'mixer', level: 6, plant: 'mixer', title: 'Batch mixer recipe',
      brief: 'One batch per <b>START</b> (vessel must be empty): ① valve A until 40 % ② valve B until 80 %, mixer on ③ keep mixing for <b>5 s</b> and heat to <b>60 °C</b> (heater only while below 60 °C) ④ drain until empty ⑤ <b>Batch done</b> lamp for 2 s, then ready again. STOP aborts to idle. Use a step number in <b>MW0</b>.',
      hints: ['One transition rung per step: CMP(MW0==n) AND condition → MOV(n+1, MW0).', 'Step 3 → 4 needs both: mix timer done AND temperature OK.', 'Outputs decode the step: valve A in step 1, valve B in step 2, mixer in steps 2–3, heater in step 3 AND NOT temp OK, drain in step 4, lamp in step 5.'],
      solution: 'NAME Batch mixer\nRUNG 0 → 1: start when the vessel is empty\nCMP(MW0==0) P(I0.0) NC(I0.4) MOV(1,MW0)\nRUNG 1 → 2: 40 % reached\nCMP(MW0==1) NO(I0.2) MOV(2,MW0)\nRUNG 2 → 3: 80 % reached\nCMP(MW0==2) NO(I0.3) MOV(3,MW0)\nRUNG 3 → 4: mixed long enough and hot\nCMP(MW0==3) NO(T0) NO(I0.5) MOV(4,MW0)\nRUNG 4 → 5: empty\nCMP(MW0==4) NC(I0.4) MOV(5,MW0)\nRUNG 5 → 0: done lamp shown\nCMP(MW0==5) NO(T1) MOV(0,MW0)\nRUNG STOP aborts\nNC(I0.1) MOV(0,MW0)\nRUNG Mix timer in step 3\nCMP(MW0==3) TON(T0,5s)\nRUNG Done-lamp timer in step 5\nCMP(MW0==5) TON(T1,2s)\nRUNG Valve A\nCMP(MW0==1) COIL(Q0.0)\nRUNG Valve B\nCMP(MW0==2) COIL(Q0.1)\nRUNG Mixer in steps 2 and 3\nCMP(MW0==2) | COIL(Q0.2)\nCMP(MW0==3)\nRUNG Heater: step 3, only below 60 °C\nCMP(MW0==3) NC(I0.5) COIL(Q0.3)\nRUNG Drain\nCMP(MW0==4) COIL(Q0.4)\nRUNG Batch done\nCMP(MW0==5) COIL(Q0.5)',
      tests: [
        { name: 'Uses the step register', steps: ['tap I0.0', 'expect MW0=1 Q0.0=1'] },
        { name: 'Makes a good batch', steps: ['tap I0.0', 'waitfor Q0.5=1 35000', 'wait 200', 'plant good=1 bad=0'] },
        { name: 'Two batches in a row', steps: ['tap I0.0', 'waitfor Q0.5=1 35000', 'waitfor MW0=0 4000', 'tap I0.0', 'waitfor Q0.5=1 35000', 'wait 200', 'plant good=2 bad=0'] },
        { name: 'STOP aborts', steps: ['tap I0.0', 'wait 3000', 'tap I0.1', 'expect MW0=0 Q0.0=0 Q0.2=0 Q0.3=0'] },
      ],
    },
    {
      id: 'elevator', level: 6, plant: 'elevator', title: '3-floor elevator',
      brief: 'Call buttons are <b>remembered</b> until served. The car travels to a called floor, <b>stops at its floor sensor</b>, opens the door for <b>3 s</b>, then closes it. A call for the floor the car is at just opens the door. The car must never move with the door open, never run both directions, and never overrun floor 1 or 3.',
      hints: ['SET a memory bit per call; RESET it once the door has been open 3 s at that floor.', 'Store the last floor seen in MW0 (MOV 1/2/3 from the floor sensors). Then "call above" = (call 2 AND MW0 < 2) OR (call 3 AND MW0 < 3).', '"Serving" = at a floor that has a call. Door opens while serving and the motor is off. Motors need: door closed, not serving, door command off, and the other motor off.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'UP and DOWN together.' }],
      solution: 'NAME Elevator\nRUNG Remember the last floor\nNO(I0.3) MOV(1,MW0)\nRUNG\nNO(I0.4) MOV(2,MW0)\nRUNG\nNO(I0.5) MOV(3,MW0)\nRUNG Calls are remembered\nNO(I0.0) SET(M0.1)\nRUNG\nNO(I0.1) SET(M0.2)\nRUNG\nNO(I0.2) SET(M0.3)\nRUNG Serving: the car is at a floor with a call\nNO(I0.3) NO(M0.1) | COIL(M1.0)\nNO(I0.4) NO(M0.2) |\nNO(I0.5) NO(M0.3)\nRUNG Door open while serving and stopped\nNO(M1.0) NC(Q0.0) NC(Q0.1) COIL(Q0.2)\nRUNG Door open time\nNO(Q0.2) TON(T0,3s)\nRUNG Clear the call that was served\nNO(T0) NO(I0.3) RST(M0.1)\nRUNG\nNO(T0) NO(I0.4) RST(M0.2)\nRUNG\nNO(T0) NO(I0.5) RST(M0.3)\nRUNG Up: door closed, not serving, a call above\nNO(I0.6) NC(M1.0) NC(Q0.1) NC(Q0.2) | NO(M0.2) CMP(MW0<2) | COIL(Q0.0)\n. . . . NO(M0.3) CMP(MW0<3)\nRUNG Down: door closed, not serving, a call below\nNO(I0.6) NC(M1.0) NC(Q0.0) NC(Q0.2) | NO(M0.1) CMP(MW0>1) | COIL(Q0.1)\n. . . . NO(M0.2) CMP(MW0>2)',
      tests: [
        { name: 'Call at the current floor opens the door', steps: ['tap I0.0', 'waitfor Q0.2=1 1000', 'waitfor Q0.2=0 5000', 'waitfor I0.6=1 2000'] },
        { name: 'Goes up to floor 3 and serves it', steps: ['tap I0.2', 'expect Q0.0=1', 'waitfor I0.5=1 6000', 'wait 100', 'expect Q0.0=0 Q0.2=1', 'waitfor I0.6=1 6000', 'plant s3=1'] },
        { name: 'Comes back down to floor 1', steps: ['tap I0.2', 'waitfor I0.5=1 6000', 'waitfor Q0.2=1 1000', 'waitfor Q0.2=0 5000', 'waitfor I0.6=1 2000', 'tap I0.0', 'expect Q0.1=1', 'waitfor I0.3=1 6000', 'wait 100', 'expect Q0.2=1', 'waitfor I0.6=1 6000', 'plant s1=1'] },
        { name: 'Remembers two calls', steps: ['tap I0.1', 'tap I0.2', 'wait 16000', 'plant s2=1 s3=1', 'expect Q0.0=0 Q0.1=0'] },
      ],
    },
    {
      id: 'sorter', level: 6, plant: 'sorter', title: 'Box sorter with tracking',
      brief: '<b>START</b> runs the conveyor (STOP stops it). At the check station, remember whether the box is <b>tall</b>. When that box reaches the pusher, <b>stop the conveyor</b>, extend the pusher until it is out, retract it until home, then carry on. Short boxes ride through to the end. At most one box is between the check station and the pusher.',
      hints: ['On the rising edge of "box at check", SET a "tall pending" bit if the tall eye is blocked.', 'On the rising edge of "box at pusher" with "tall pending": SET a push step that stops the conveyor.', 'Push: extend until "out", then a return bit retracts until "home"; then reset the push step, the return bit and "tall pending".'],
      solution: 'NAME Box sorter\nRUNG Running latch\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG Tall box at the check station → remember\nP(I0.2) NO(I0.3) SET(M0.1)\nRUNG Remembered tall box reached the pusher → push step\nP(I0.4) NO(M0.1) SET(M0.2)\nRUNG Pusher fully out → return\nNO(M0.2) NO(I0.5) SET(M0.3)\nRUNG Back home → forget the box\nNO(M0.3) NO(I0.6) RST(M0.1)\nRUNG Back home → end push step\nNO(M0.3) NO(I0.6) RST(M0.2)\nRUNG Clear return bit\nNC(M0.2) RST(M0.3)\nRUNG Pusher valve\nNO(M0.2) NC(M0.3) COIL(Q0.1)\nRUNG Conveyor stops while pushing\nNO(M0.0) NC(M0.2) COIL(Q0.0)',
      tests: [
        { name: 'Sorts the boxes', steps: ['tap I0.0', 'wait 28000', 'plant tallBin>=3 shortBin>=3 wrong=0'] },
        { name: 'Conveyor stops while pushing', steps: ['tap I0.0', 'waitfor Q0.1=1 8000', 'expect Q0.0=0', 'waitfor I0.5=1 2000', 'waitfor I0.6=1 2000', 'wait 100', 'expect Q0.0=1'] },
        { name: 'STOP', steps: ['tap I0.0', 'wait 2000', 'tap I0.1', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'carwash', level: 6, plant: 'carwash', title: 'Automatic car wash',
      brief: 'Green light = drive in. With a car in position and the gantry home, <b>START</b> runs: ① gantry forward with <b>soap + brushes</b> to the end ② gantry back with <b>rinse + brushes</b> to home ③ <b>dryer 4 s</b> ④ green light: drive out; back to idle when the car has left. Red light while washing. <b>STOP</b> aborts the wash and the gantry returns home (once STOP is released). No spraying without a car.',
      hints: ['Step number in MW0: 0 idle, 1 forward pass, 2 back pass, 3 dry, 4 drive out.', 'Transitions use the gantry limit switches, a TON for drying, and "car in position" going off for 4 → 0.', 'Homing after STOP: gantry back also in step 0 while the gantry is not home and STOP is not pressed. Green light only when the gantry is home.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'Gantry forward and back together.' }],
      solution: 'NAME Car wash\nRUNG 0 → 1: car in place, gantry home, START\nCMP(MW0==0) NO(I0.2) NO(I0.3) P(I0.0) MOV(1,MW0)\nRUNG 1 → 2: soap pass done\nCMP(MW0==1) NO(I0.4) MOV(2,MW0)\nRUNG 2 → 3: rinse pass done\nCMP(MW0==2) NO(I0.3) MOV(3,MW0)\nRUNG 3 → 4: dried\nCMP(MW0==3) NO(T0) MOV(4,MW0)\nRUNG 4 → 0: car has left\nCMP(MW0==4) NC(I0.2) MOV(0,MW0)\nRUNG STOP aborts\nNC(I0.1) MOV(0,MW0)\nRUNG Dry time\nCMP(MW0==3) TON(T0,4s)\nRUNG Gantry forward\nCMP(MW0==1) NC(Q0.1) COIL(Q0.0)\nRUNG Gantry back: rinse pass, or homing after an abort\nCMP(MW0==2) - - | NC(Q0.0) COIL(Q0.1)\nCMP(MW0==0) NC(I0.3) NO(I0.1)\nRUNG Soap\nCMP(MW0==1) COIL(Q0.2)\nRUNG Brushes on both passes\nCMP(MW0==1) | COIL(Q0.3)\nCMP(MW0==2)\nRUNG Rinse\nCMP(MW0==2) COIL(Q0.4)\nRUNG Dryer\nCMP(MW0==3) COIL(Q0.5)\nRUNG Green: drive in (idle, gantry home) or drive out\nCMP(MW0==0) NO(I0.3) | COIL(Q0.6)\nCMP(MW0==4) -\nRUNG Red: wait\nNC(Q0.6) COIL(Q0.7)',
      tests: [
        { name: 'Washes a car properly', steps: ['expect Q0.6=1', 'action in', 'wait 1800', 'tap I0.0', 'expect Q0.7=1 Q0.0=1 Q0.2=1', 'waitfor Q0.6=1 20000', 'action out', 'wait 2000', 'plant clean=1 dirty=0', 'expect MW0=0'] },
        { name: 'No car, no wash', steps: ['tap I0.0', 'wait 500', 'expect Q0.0=0 Q0.2=0 MW0=0'] },
        { name: 'STOP aborts and homes the gantry', steps: ['action in', 'wait 1800', 'tap I0.0', 'wait 2000', 'tap I0.1', 'expect Q0.2=0 Q0.0=0', 'waitfor I0.3=1 6000', 'wait 100', 'expect Q0.1=0 Q0.6=1'] },
      ],
    },
    {
      id: 'pump-station', level: 6, plant: 'pumps', title: 'Duty / standby pump station',
      brief: 'In <b>AUTO</b>: start the <b>duty</b> pump when the level reaches 70 % and stop it at 20 %. <b>Swap</b> duty and standby after every pumping cycle so both pumps wear equally. If the level still reaches <b>85 %</b>, raise the alarm and run the <b>standby</b> pump too, until 20 %. A tripped pump must never be commanded, and the healthy one takes over as duty.',
      hints: ['Demand latch: AUTO AND (>70 % OR demand) AND >20 %. Standby latch: same with >85 %.', 'Toggle a "pump 2 is duty" bit on the falling edge N(...) of the demand latch: the one-button toggle pattern.', 'Pump 1 is duty if (NOT toggle AND pump 1 OK) OR pump 2 not OK. Pump 1 = P1 OK AND ((demand AND P1 duty) OR standby).'],
      solution: 'NAME Pump station\nRUNG Demand: start at 70 %, stop at 20 %\nNO(I0.0) | NO(I0.2) | NO(I0.1) COIL(M0.0)\n. NO(M0.0)\nRUNG Standby: start at 85 %, stop at 20 %\nNO(I0.0) | NO(I0.3) | NO(I0.1) COIL(M0.3)\n. NO(M0.3)\nRUNG Pulse at the end of each pumping cycle\nN(M0.0) COIL(M0.2)\nRUNG Toggle the duty pump on each pulse\nNO(M0.2) NC(M0.1) | COIL(M0.1)\nNC(M0.2) NO(M0.1)\nRUNG Pump 1 is duty (or pump 2 has tripped)\nNC(M0.1) NO(I0.4) | COIL(M1.0)\nNC(I0.5) -\nRUNG Pump 1\nNO(I0.4) | NO(M0.0) NO(M1.0) | COIL(Q0.0)\n. NO(M0.3) -\nRUNG Pump 2\nNO(I0.5) | NO(M0.0) NC(M1.0) | COIL(Q0.1)\n. NO(M0.3) -\nRUNG High-level alarm\nNO(I0.3) COIL(Q0.2)',
      tests: [
        { name: 'Duty pump cycle, then swap', steps: ['on I0.0', 'waitfor Q0.0=1 8000', 'expect Q0.1=0', 'waitfor Q0.0=0 20000', 'expect I0.1=0', 'waitfor Q0.1=1 15000', 'expect Q0.0=0'] },
        { name: 'Equal wear over time', steps: ['on I0.0', 'wait 90000', 'plant p1Starts>=2 p2Starts>=2'] },
        { name: 'Storm: standby pump helps', steps: ['on I0.0', 'action storm', 'wait 40000', 'plant both=1'] },
        { name: 'Pump 1 trips: pump 2 takes over', steps: ['action trip1', 'on I0.0', 'wait 45000', 'plant p1Starts=0 p2Starts>=2'] },
        { name: 'Nothing in manual', steps: ['action storm', 'wait 2000', 'expect Q0.0=0 Q0.1=0'] },
      ],
    },
    {
      id: 'level-control', level: 6, plant: 'atank', title: 'Analog level control (P controller)',
      brief: 'Keep the scaling and alarms from "Scale a 4–20 mA level signal". In <b>AUTO</b>, hold the level near <b>50 %</b> with a proportional controller: <b>error = 50 − level %</b>, <b>valve % = error × 10</b>, limited to 0…100 %, sent as <b>AQW0 = valve % × 320</b>. AUTO off: valve closed (AQW0 = 0).',
      hints: ['SUB(50,MW0,MW2) gives the error; MUL(MW2,10,MW4) the valve %.', 'Clamp with compares: CMP(MW4<0) → MOV(0,MW4) and CMP(MW4>100) → MOV(100,MW4). Put the manual MOV(0,MW4) after them.', 'MUL(MW4,320,AQW0) on an always-on contact. Notice the level settles a little below 50 %: that is the proportional offset.'],
      solution: 'NAME Level control\nRUNG Remove the 4 mA live zero\nNO(SM0.0) SUB(AIW0,6400,MW0)\nRUNG 256 counts per percent\nNO(SM0.0) DIV(MW0,256,MW0)\nRUNG High alarm\nCMP(MW0>=90) COIL(Q0.0)\nRUNG Low alarm\nCMP(MW0<=10) COIL(Q0.1)\nRUNG Error = setpoint − level\nNO(SM0.0) SUB(50,MW0,MW2)\nRUNG Valve % = error × Kp\nNO(SM0.0) MUL(MW2,10,MW4)\nRUNG Clamp at 0 %\nCMP(MW4<0) MOV(0,MW4)\nRUNG Clamp at 100 %\nCMP(MW4>100) MOV(100,MW4)\nRUNG Manual: valve closed\nNC(I0.0) MOV(0,MW4)\nRUNG 0…100 % → 0…32000\nNO(SM0.0) MUL(MW4,320,AQW0)',
      tests: [
        { name: 'Holds the level near 50 %', steps: ['on I0.0', 'wait 40000', 'plant lvlPct>=42 lvlPct<=58'] },
        { name: 'Copes with high demand', steps: ['on I0.0', 'wait 20000', 'action demand', 'wait 30000', 'plant lvlPct>=35 lvlPct<=58'] },
        { name: 'Valve limited to 100 %', steps: ['on I0.0', 'wait 300', 'expect AQW0=32000'] },
        { name: 'Manual closes the valve', steps: ['on I0.0', 'wait 5000', 'off I0.0', 'wait 100', 'expect AQW0=0'] },
      ],
    },
    // ───────────── Level 7 · Structured Text ─────────────
    {
      id: 'st-latch', level: 7, lang: 'st', plant: 'motor', title: 'ST: start/stop in one line',
      brief: 'Write the motor start/stop with seal-in in <b>Structured Text</b>. FWD starts K1, STOP (wired NC) and the overload (OL) stop it, there is no restart after an overload reset, and STOP wins.',
      hints: ['The seal-in rung translates directly: K1 := (FWD OR K1) AND …;', 'STOP and OL read TRUE when healthy, so they are AND-ed without NOT.'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  FWD     AT %IX0.0 : BOOL;\n  STOP_OK AT %IX0.2 : BOOL;   (* wired NC: TRUE when not pressed *)\n  OL_OK   AT %IX0.3 : BOOL;\n  K1      AT %QX0.0 : BOOL;\nEND_VAR\n\nK1 := (FWD OR K1) AND STOP_OK AND OL_OK;',
      tests: [
        { name: 'Start latches', steps: ['tap I0.0', 'wait 300', 'expect Q0.0=1'] },
        { name: 'Stop', steps: ['tap I0.0', 'tap I0.2', 'expect Q0.0=0'] },
        { name: 'Overload, no auto-restart', steps: ['tap I0.0', 'action trip', 'wait 50', 'expect Q0.0=0', 'action trip', 'wait 300', 'expect Q0.0=0'] },
        { name: 'Stop is dominant', steps: ['press I0.2', 'press I0.0', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'st-timers', level: 7, lang: 'st', plant: 'panel', title: 'ST: timer and counter blocks',
      brief: 'In ST: L1 comes on <b>3 s after</b> SW1 is switched on (TON). Count presses of PB1 with a <b>CTU</b> (preset 5): L8 lights at 5 presses. PB2 resets the count.',
      hints: ['Declare instances: Delay : TON; Count : CTU;', 'Call each block every scan: Delay(IN := SW1, PT := T#3s); then use Delay.Q.', 'CTU counts rising edges of CU by itself; R resets it.'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  PB1 AT %IX0.0 : BOOL;\n  PB2 AT %IX0.1 : BOOL;\n  SW1 AT %IX0.4 : BOOL;\n  L1  AT %QX0.0 : BOOL;\n  L8  AT %QX0.7 : BOOL;\n  Delay : TON;\n  Count : CTU;\nEND_VAR\n\nDelay(IN := SW1, PT := T#3s);\nL1 := Delay.Q;\n\nCount(CU := PB1, R := PB2, PV := 5);\nL8 := Count.Q;',
      tests: [
        { name: 'On-delay 3 s', steps: ['on I0.4', 'wait 2800', 'expect Q0.0=0', 'wait 300', 'expect Q0.0=1', 'off I0.4', 'expect Q0.0=0'] },
        { name: 'Counts to 5 and resets', steps: ['tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'expect Q0.7=0', 'tap I0.0', 'expect Q0.7=1', 'tap I0.1', 'expect Q0.7=0'] },
      ],
    },
    {
      id: 'st-case-abc', level: 7, lang: 'st', plant: 'cylinders', title: 'ST: CASE sequence A+ B+ C+ C− B− A−',
      brief: 'Build the classic sequence with a <b>CASE</b> statement and an INT variable <b>Step</b>: 0 idle, 10 A out, 20 B out, 30 C out, 40 C back, 50 B back, 60 A back, then 0. Start on a START press with everything home. STOP forces Step 0. Decode the valves from Step after the CASE.',
      hints: ['StartEdge : R_TRIG; then StartEdge(CLK := Start); so one press starts one cycle.', 'Each CASE branch only changes Step: 10: IF A1 THEN Step := 20; END_IF', 'Outputs: Y1 := Step >= 10 AND Step <= 50; Y2 is on in steps 20–40, Y3 only in 30.'],
      starter: IO_CYL + '\n  Step : INT := 0;\n  StartEdge : R_TRIG;\nEND_VAR\n\nStartEdge(CLK := Start);\n\nCASE Step OF\n  0:  IF StartEdge.Q AND A0 AND B0 AND C0 THEN Step := 10; END_IF\n  10: (* A is extending: wait for A1 *)\n\nEND_CASE\n',
      solution: IO_CYL + '\n  Step : INT := 0;\n  StartEdge : R_TRIG;\nEND_VAR\n\nStartEdge(CLK := Start);\n\nCASE Step OF\n  0:  IF StartEdge.Q AND A0 AND B0 AND C0 THEN Step := 10; END_IF\n  10: IF A1 THEN Step := 20; END_IF\n  20: IF B1 THEN Step := 30; END_IF\n  30: IF C1 THEN Step := 40; END_IF\n  40: IF C0 THEN Step := 50; END_IF\n  50: IF B0 THEN Step := 60; END_IF\n  60: IF A0 THEN Step := 0; END_IF\nEND_CASE\n\nIF NOT StopOK THEN Step := 0; END_IF\n\n(* outputs decoded from the step *)\nY1 := Step >= 10 AND Step <= 50;\nY2 := Step >= 20 AND Step <= 40;\nY3 := Step = 30;',
      tests: [
        { name: 'Uses Step = 10 for A out', steps: ['tap I0.0', 'expect STEP=10 Q0.0=1'] },
        { name: 'Correct sequence', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=0', 'order Q0.1+ Q0.2+ Q0.2- Q0.1- Q0.0- 12000', 'waitfor STEP=0 2000'] },
        { name: 'STOP', steps: ['tap I0.0', 'wait 1500', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0 STEP=0'] },
      ],
    },
    {
      id: 'st-repeat-count', level: 7, lang: 'st', plant: 'cylinders', title: 'ST: repeat a stroke N times',
      brief: 'One START press: cylinder <b>A strokes out and back 3 times</b>, then <b>B goes out and back once</b>. Count A strokes in an INT variable <b>Strokes</b>. STOP aborts to Step 0.',
      hints: ['Reset Strokes := 0 when the cycle starts.', 'In the "A back" step: when A0, add 1 to Strokes; then IF Strokes < 3 go back to the "A out" step, ELSE go on to B.'],
      starter: IO_CYL + '\n  Step : INT := 0;\n  Strokes : INT := 0;\n  StartEdge : R_TRIG;\nEND_VAR\n\nStartEdge(CLK := Start);\n',
      solution: IO_CYL + '\n  Step : INT := 0;\n  Strokes : INT := 0;\n  StartEdge : R_TRIG;\nEND_VAR\n\nStartEdge(CLK := Start);\n\nCASE Step OF\n  0:  IF StartEdge.Q AND A0 AND B0 THEN\n        Strokes := 0;\n        Step := 10;\n      END_IF\n  10: IF A1 THEN Step := 20; END_IF          (* A out *)\n  20: IF A0 THEN                              (* A back *)\n        Strokes := Strokes + 1;\n        IF Strokes < 3 THEN Step := 10; ELSE Step := 30; END_IF\n      END_IF\n  30: IF B1 THEN Step := 40; END_IF          (* B out *)\n  40: IF B0 THEN Step := 0; END_IF           (* B back *)\nEND_CASE\n\nIF NOT StopOK THEN Step := 0; END_IF\n\nY1 := Step = 10;\nY2 := Step = 30;',
      tests: [
        { name: 'Three A strokes, then B', steps: ['tap I0.0', 'expect Q0.0=1', 'order Q0.0- Q0.0+ Q0.0- Q0.0+ Q0.0- Q0.1+ Q0.1- 12000', 'expect STROKES=3'] },
        { name: 'Ends idle', steps: ['tap I0.0', 'wait 9000', 'expect STEP=0', 'stays Q0.0=0 2000'] },
        { name: 'STOP', steps: ['tap I0.0', 'wait 1500', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 STEP=0'] },
      ],
    },
    {
      id: 'st-for-bargraph', level: 7, lang: 'st', plant: 'panel', title: 'ST: FOR loop bar graph',
      brief: 'Each press of PB1 adds 1 to a <b>Count</b> (maximum 8); PB2 clears it. Show Count as a <b>bar graph</b> on L1…L8: Count = 3 lights L1, L2, L3. Build the bit pattern with a <b>FOR</b> loop and write it to the whole output byte <b>%QB0</b> at once.',
      hints: ['Edge : R_TRIG; to add 1 per press.', 'Pattern := 0; FOR i := 1 TO Count DO Pattern := Pattern * 2 + 1; END_FOR gives 1, 3, 7, 15… (binary 1, 11, 111…).', 'Declare Lamps AT %QB0 : BYTE; and assign Lamps := Pattern;'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  PB1 AT %IX0.0 : BOOL;\n  PB2 AT %IX0.1 : BOOL;\n  Lamps AT %QB0 : BYTE;      (* Q0.0 … Q0.7 as one byte *)\n  Edge : R_TRIG;\n  Count, Pattern, i : INT;\nEND_VAR\n\nEdge(CLK := PB1);\nIF Edge.Q AND Count < 8 THEN Count := Count + 1; END_IF\nIF PB2 THEN Count := 0; END_IF\n\nPattern := 0;\nFOR i := 1 TO Count DO\n  Pattern := Pattern * 2 + 1;\nEND_FOR\nLamps := Pattern;',
      tests: [
        { name: 'Bar grows', steps: ['tap I0.0', 'tap I0.0', 'tap I0.0', 'expect Q0.0=1 Q0.1=1 Q0.2=1 Q0.3=0 COUNT=3'] },
        { name: 'Stops at 8', steps: ['tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'tap I0.0', 'expect Q0.7=1 COUNT=8'] },
        { name: 'Clear', steps: ['tap I0.0', 'tap I0.0', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 COUNT=0'] },
      ],
    },
    {
      id: 'st-while-slot', level: 7, lang: 'st', plant: 'panel', title: 'ST: WHILE search for a free slot',
      brief: 'SW1…SW4 show which of 4 parking slots are <b>occupied</b>. Copy them into an <b>ARRAY[0..3] OF BOOL</b>, then use a <b>WHILE</b> loop to find the <b>first free slot</b> and light its lamp (L1…L4). If all four are occupied, light <b>L5 (FULL)</b> instead.',
      hints: ['i := 0; WHILE i < 4 DO IF NOT Occ[i] THEN EXIT; END_IF i := i + 1; END_WHILE. After the loop, i is the first free slot, or 4 if full.', 'Trap: WHILE i < 4 AND Occ[i] DO … reads Occ[4] when i reaches 4, because ST evaluates both sides of AND. That is an array-index fault.', 'Then L1 := i = 0; L2 := i = 1; … L5 := i = 4;'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  S1 AT %IX0.4 : BOOL;  S2 AT %IX0.5 : BOOL;\n  S3 AT %IX0.6 : BOOL;  S4 AT %IX0.7 : BOOL;\n  L1 AT %QX0.0 : BOOL;  L2 AT %QX0.1 : BOOL;\n  L3 AT %QX0.2 : BOOL;  L4 AT %QX0.3 : BOOL;\n  L5 AT %QX0.4 : BOOL;\n  Occ : ARRAY[0..3] OF BOOL;\n  i : INT;\nEND_VAR\n\nOcc[0] := S1; Occ[1] := S2; Occ[2] := S3; Occ[3] := S4;\n\ni := 0;\nWHILE i < 4 DO\n  IF NOT Occ[i] THEN EXIT; END_IF\n  i := i + 1;\nEND_WHILE\n\nL1 := i = 0;  L2 := i = 1;  L3 := i = 2;  L4 := i = 3;\nL5 := i = 4;   (* full *)',
      tests: [
        { name: 'All free → slot 1', steps: ['wait 50', 'expect Q0.0=1 Q0.1=0 Q0.4=0'] },
        { name: 'Slot 1 taken → slot 2', steps: ['on I0.4', 'expect Q0.1=1 Q0.0=0'] },
        { name: 'Gap is found', steps: ['on I0.4', 'on I0.6', 'expect Q0.1=1 Q0.2=0'] },
        { name: 'First two taken → slot 3', steps: ['on I0.4', 'on I0.5', 'expect Q0.2=1'] },
        { name: 'All taken → FULL', steps: ['on I0.4', 'on I0.5', 'on I0.6', 'on I0.7', 'expect Q0.4=1 Q0.0=0 Q0.1=0 Q0.2=0 Q0.3=0'] },
      ],
    },
    // ═════════════ Exercise pack 2 ═════════════
    // Level 1
    {
      id: 'xor-stairs', level: 1, plant: 'panel', title: 'Staircase light (two-way switching)',
      tags: { 'I0.4': 'Downstairs SW', 'I0.5': 'Upstairs SW', 'Q0.0': 'Stair light' },
      brief: 'A stair light has a switch at the bottom (SW1) and the top (SW2). Flipping <b>either</b> switch must change the light. That is <b>exclusive OR</b>: on when exactly one switch is on.',
      hints: ['XOR = (A AND NOT B) OR (NOT A AND B).', 'Two rows, each with one NO and one NC contact, joined before the coil.'],
      solution: 'RUNG Light = SW1 XOR SW2\nNO(I0.4) NC(I0.5) | COIL(Q0.0)\nNC(I0.4) NO(I0.5)',
      tests: [
        { name: 'Both off → dark', steps: ['expect Q0.0=0'] },
        { name: 'Either switch flips it', steps: ['on I0.4', 'expect Q0.0=1', 'on I0.5', 'expect Q0.0=0', 'off I0.4', 'expect Q0.0=1', 'off I0.5', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'majority', level: 1, plant: 'panel', title: '2-out-of-3 safety voting',
      tags: { 'I0.4': 'Sensor A', 'I0.5': 'Sensor B', 'I0.6': 'Sensor C', 'Q0.0': 'Trip' },
      brief: 'Three pressure sensors watch the same vessel. One sensor alone may be faulty, so the plant <b>trips</b> (L1) only when <b>at least two</b> of the three (SW1, SW2, SW3) agree. This is used in real safety systems ("2oo3").',
      hints: ['Trip = (A AND B) OR (A AND C) OR (B AND C).', 'Three parallel rows with two contacts each.'],
      solution: 'RUNG 2-out-of-3\nNO(I0.4) NO(I0.5) | COIL(Q0.0)\nNO(I0.4) NO(I0.6) |\nNO(I0.5) NO(I0.6)',
      tests: [
        { name: 'One sensor is not enough', steps: ['on I0.4', 'expect Q0.0=0', 'off I0.4', 'on I0.5', 'expect Q0.0=0', 'off I0.5', 'on I0.6', 'expect Q0.0=0'] },
        { name: 'Any two trip', steps: ['on I0.4', 'on I0.6', 'expect Q0.0=1', 'off I0.4', 'on I0.5', 'expect Q0.0=1'] },
        { name: 'All three trip', steps: ['on I0.4', 'on I0.5', 'on I0.6', 'expect Q0.0=1'] },
      ],
    },
    {
      id: 'bug-or', level: 1, plant: 'panel', title: '🐞 Bug hunt: pump runs in manual',
      tags: { 'I0.4': 'Auto mode', 'I0.0': 'Local run', 'I0.5': 'Remote run', 'Q0.0': 'Pump' },
      brief: 'The pump (L1) must only run in <b>Auto</b> (SW1), and then when <b>Local</b> (PB1) or <b>Remote</b> (SW2) asks. Operators complain that Remote starts the pump even in manual. Find the wrongly placed branch and fix it.',
      starter: 'RUNG Pump\nNO(I0.4) NO(I0.0) | COIL(Q0.0)\nNO(I0.5)',
      hints: ['Read the rung as Boolean: right now it is (Auto AND Local) OR Remote.', 'The branch must go around Local only, so Auto stays in series with both.'],
      solution: 'RUNG Pump = Auto AND (Local OR Remote)\nNO(I0.4) | NO(I0.0) | COIL(Q0.0)\n. NO(I0.5)',
      tests: [
        { name: 'Remote alone does nothing', steps: ['on I0.5', 'expect Q0.0=0'] },
        { name: 'Auto + remote runs', steps: ['on I0.4', 'on I0.5', 'expect Q0.0=1'] },
        { name: 'Auto + local runs', steps: ['on I0.4', 'press I0.0', 'expect Q0.0=1'] },
      ],
    },
    // Level 2
    {
      id: 'jog-run', level: 2, plant: 'motor', title: 'Jog and run',
      tags: { 'I0.1': 'JOG' },
      brief: '<b>FWD</b> starts the motor and it keeps running (latched). The <b>JOG</b> button (I0.1) runs the same contactor K1 only <b>while held</b>, for setting up the machine. STOP and the overload stop everything. Jogging must never latch.',
      hints: ['If you seal in with the output Q0.0 itself, a jog press would latch too. Seal in with a memory bit instead.', 'Run latch: M0.0 = (FWD OR M0.0) AND STOP AND OL. K1 = M0.0 OR (JOG AND STOP AND OL).'],
      solution: 'RUNG Run latch (memory bit, not the output)\nNO(I0.0) | NO(I0.2) NO(I0.3) COIL(M0.0)\nNO(M0.0)\nRUNG K1 = run OR jog\nNO(M0.0) - - | COIL(Q0.0)\nNO(I0.1) NO(I0.2) NO(I0.3)',
      tests: [
        { name: 'Jog only while held', steps: ['press I0.1', 'expect Q0.0=1', 'release I0.1', 'wait 100', 'expect Q0.0=0'] },
        { name: 'Run latches', steps: ['tap I0.0', 'wait 300', 'expect Q0.0=1', 'tap I0.2', 'expect Q0.0=0'] },
        { name: 'Overload stops jog', steps: ['action trip', 'press I0.1', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'two-station', level: 2, plant: 'panel', title: 'Start/stop from two stations',
      tags: { 'I0.0': 'Start A', 'I0.1': 'Start B', 'I0.2': 'Stop B (NO)', 'I0.3': 'Stop A (NC)', 'Q0.0': 'Motor' },
      brief: 'A long conveyor has a control station at each end. <b>Start A</b> or <b>Start B</b> starts the motor (L1). <b>Stop A</b> (wired NC) or <b>Stop B</b> (an old button wired NO) stops it. Stops win over starts.',
      hints: ['Starts in parallel with the seal-in contact; stops in series.', 'Stop A reads 1 when OK (NO contact), Stop B reads 1 when pressed (NC contact).'],
      solution: 'RUNG Two starts in parallel, two stops in series\nNO(I0.0) | NO(I0.3) NC(I0.2) COIL(Q0.0)\nNO(I0.1) |\nNO(Q0.0)',
      tests: [
        { name: 'Start A, stop B', steps: ['tap I0.0', 'expect Q0.0=1', 'tap I0.2', 'expect Q0.0=0'] },
        { name: 'Start B, stop A', steps: ['tap I0.1', 'expect Q0.0=1', 'tap I0.3', 'expect Q0.0=0'] },
        { name: 'Stops win', steps: ['press I0.2', 'press I0.0', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'bug-latch', level: 2, plant: 'motor', title: '🐞 Bug hunt: STOP doesn\'t always stop',
      brief: 'A safety audit found that holding <b>FWD</b> keeps the motor running even while <b>STOP</b> is pressed. Find out why and fix the rung so STOP always wins.',
      starter: 'RUNG Start/stop\nNO(I0.0) - | NO(I0.3) COIL(Q0.0)\nNO(Q0.0) NO(I0.2)',
      hints: ['Follow the power path through the FWD contact: does it pass through STOP?', 'STOP must be in series with the whole start OR seal-in branch.'],
      solution: 'RUNG Start/stop, STOP in series with everything\nNO(I0.0) | NO(I0.2) NO(I0.3) COIL(Q0.0)\nNO(Q0.0)',
      tests: [
        { name: 'Start and stop', steps: ['tap I0.0', 'expect Q0.0=1', 'tap I0.2', 'expect Q0.0=0'] },
        { name: 'STOP wins while FWD is held', steps: ['press I0.0', 'press I0.2', 'expect Q0.0=0'] },
      ],
    },
    // Level 3
    {
      id: 'stair-timer', level: 3, plant: 'panel', title: 'Staircase timer (retrigger)',
      tags: { 'I0.0': 'Button floor 1', 'I0.1': 'Button floor 2', 'Q0.0': 'Stair light' },
      brief: 'A press on <b>either</b> floor button lights the stairs (L1) for <b>5 s</b> after the button is released. Pressing again while it is on <b>restarts</b> the 5 s.',
      hints: ['An off-delay timer (TOF) restarts every time its input comes on again.'],
      solution: 'RUNG 5 s after the last press\nNO(I0.0) | TOF(T0,5s)\nNO(I0.1)\nRUNG Light\nNO(T0) COIL(Q0.0)',
      tests: [
        { name: 'On for 5 s', steps: ['tap I0.0', 'expect Q0.0=1', 'wait 4500', 'expect Q0.0=1', 'wait 700', 'expect Q0.0=0'] },
        { name: 'Second press restarts', steps: ['tap I0.0', 'wait 4000', 'tap I0.1', 'wait 4000', 'expect Q0.0=1', 'wait 1500', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'cascade', level: 3, plant: 'panel', title: 'Cascade start of three conveyors',
      tags: { 'I0.0': 'START', 'Q0.0': 'Conveyor 1', 'Q0.1': 'Conveyor 2', 'Q0.2': 'Conveyor 3' },
      brief: 'Starting three big motors at once trips the supply. <b>START</b> runs conveyor 1 at once, conveyor 2 <b>2 s later</b> and conveyor 3 <b>4 s later</b>. <b>STOP</b> stops all three immediately.',
      hints: ['One run latch M0.0, then two TON timers on M0.0 (2 s and 4 s).'],
      solution: 'RUNG Run latch\nNO(I0.0) | NO(I0.3) COIL(M0.0)\nNO(M0.0)\nRUNG Conveyor 1\nNO(M0.0) COIL(Q0.0)\nRUNG 2 s delay\nNO(M0.0) TON(T0,2s)\nRUNG Conveyor 2\nNO(T0) COIL(Q0.1)\nRUNG 4 s delay\nNO(M0.0) TON(T1,4s)\nRUNG Conveyor 3\nNO(T1) COIL(Q0.2)',
      tests: [
        { name: 'Staggered start', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=0', 'wait 1500', 'expect Q0.1=0', 'wait 500', 'expect Q0.1=1 Q0.2=0', 'wait 2000', 'expect Q0.2=1'] },
        { name: 'STOP stops all', steps: ['tap I0.0', 'wait 4500', 'tap I0.3', 'expect Q0.0=0 Q0.1=0 Q0.2=0'] },
      ],
    },
    {
      id: 'warning-horn', level: 3, plant: 'conveyor', title: 'Pre-start warning horn',
      tags: { 'Q0.1': 'Warning horn' },
      brief: 'Before a long conveyor moves, people nearby must be warned. <b>START</b> sounds the horn (Q0.1) for <b>3 s</b> with the belt still stopped. Then the horn stops and the belt runs (latched). <b>STOP</b> stops it, and every restart warns again.',
      hints: ['Latch a "start request" bit. A TON on it gives the 3 s warning.', 'Horn = request AND NOT timer done. Belt = timer done.'],
      solution: 'RUNG Start request\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG 3 s warning\nNO(M0.0) TON(T0,3s)\nRUNG Horn\nNO(M0.0) NC(T0) COIL(Q0.1)\nRUNG Belt\nNO(T0) COIL(Q0.0)',
      tests: [
        { name: 'Warns, then runs', steps: ['tap I0.0', 'expect Q0.1=1 Q0.0=0', 'wait 2500', 'expect Q0.0=0', 'wait 500', 'expect Q0.0=1 Q0.1=0'] },
        { name: 'Restart warns again', steps: ['tap I0.0', 'wait 3500', 'tap I0.1', 'expect Q0.0=0', 'tap I0.0', 'expect Q0.1=1 Q0.0=0'] },
      ],
    },
    {
      id: 'bug-flasher', level: 3, plant: 'panel', title: '🐞 Bug hunt: beacon barely flickers',
      tags: { 'I0.4': 'Alarm active', 'Q0.4': 'Beacon' },
      brief: 'The beacon (L5) should flash about <b>0.5 s on, 0.5 s off</b> while SW1 is on. The current program makes it flicker for a single scan. Find out why and fix it.',
      starter: 'RUNG Flash timer\nNO(I0.4) NC(T1) TON(T1,500ms)\nRUNG Beacon\nNO(T1) COIL(Q0.4)',
      hints: ['A timer that resets itself is done for exactly one scan.', 'Use two timers: one for the off time, one for the on time, and let the second reset the first.'],
      solution: 'RUNG Off time, reset by the on timer\nNO(I0.4) NC(T2) TON(T1,500ms)\nRUNG On time\nNO(T1) TON(T2,500ms)\nRUNG Beacon\nNO(I0.4) NO(T1) COIL(Q0.4)',
      tests: [
        { name: 'Flashes ~1 Hz', steps: ['on I0.4', 'pulses Q0.4 4000 3 5'] },
        { name: 'Lamp stays on about half the time', steps: ['on I0.4', 'waitfor Q0.4=1 2000', 'stays Q0.4=1 400'] },
      ],
    },
    // Level 4
    {
      id: 'ctd-batch', level: 4, plant: 'conveyor', title: 'Count-down batch (CTD)',
      brief: 'Use a <b>down counter</b>. START reloads the counter with <b>4</b> and runs the belt. Each box at the photo-eye counts <b>down</b>. At 0 the belt stops and Batch done (Q0.1) lights.',
      hints: ['CTD(C0,4) starts at the preset and is done at CV ≤ 0.', 'A RESET coil on a down counter reloads the preset.'],
      solution: 'RUNG Belt stops when the count reaches 0\nNO(I0.0) | NO(I0.1) NC(C0) COIL(Q0.0)\nNO(Q0.0)\nRUNG Count down\nNO(I0.2) CTD(C0,4)\nRUNG Batch done\nNO(C0) COIL(Q0.1)\nRUNG Reload on START\nNO(I0.0) RST(C0)',
      tests: [
        { name: 'Counts down to 0', steps: ['tap I0.0', 'expect C0.CV=4', 'action box', 'wait 1200', 'action box', 'wait 1200', 'action box', 'wait 1200', 'wait 2500', 'expect Q0.0=1 C0.CV=1', 'action box', 'wait 4000', 'expect Q0.0=0 Q0.1=1 C0.CV=0'] },
        { name: 'START reloads', steps: ['tap I0.0', 'action box', 'wait 4000', 'tap I0.0', 'expect C0.CV=4'] },
      ],
    },
    {
      id: 'stages-cmp', level: 4, plant: 'panel', title: 'Three stages from one timer',
      tags: { 'I0.0': 'Hold', 'Q0.0': 'After 1 s', 'Q0.1': 'After 2 s', 'Q0.2': 'After 3 s' },
      brief: 'While PB1 is held, light L1 after <b>1 s</b>, L2 after <b>2 s</b> and L3 after <b>3 s</b>, using <b>one</b> TON and compares on its elapsed time (T0.ET is in ms). Releasing PB1 turns all off.',
      hints: ['TON(T0, 10s) on PB1, then CMP(T0.ET>=1000) → L1, and so on.'],
      solution: 'RUNG One timer\nNO(I0.0) TON(T0,10s)\nRUNG Stage 1\nCMP(T0.ET>=1000) COIL(Q0.0)\nRUNG Stage 2\nCMP(T0.ET>=2000) COIL(Q0.1)\nRUNG Stage 3\nCMP(T0.ET>=3000) COIL(Q0.2)',
      tests: [
        { name: 'Stages', steps: ['press I0.0', 'wait 900', 'expect Q0.0=0', 'wait 200', 'expect Q0.0=1 Q0.1=0', 'wait 1000', 'expect Q0.1=1 Q0.2=0', 'wait 1000', 'expect Q0.2=1'] },
        { name: 'Release resets', steps: ['press I0.0', 'wait 3200', 'release I0.0', 'expect Q0.0=0 Q0.1=0 Q0.2=0'] },
      ],
    },
    // Level 5
    {
      id: 'drill-station', level: 5, plant: 'drill', title: 'Drilling station sequence',
      brief: 'START (part present, drill up, clamp open): ① <b>clamp</b> until clamped ② <b>spindle on + feed down</b> to the bottom limit ③ <b>feed up</b> (spindle still on) to the top limit ④ <b>unclamp</b>, wait 0.6 s ⑤ <b>eject</b> for 1 s, done. Cycle lamp on during the cycle. <b>STOP</b> during a cycle: spindle and feed down off, drill returns up, unclamp. The next cycle needs a new part.',
      hints: ['Step number MW0 0–5, plus step 6 = "retract after STOP".', 'Clamp in steps 1–3, spindle in 2–3, feed down in 2, feed up in 3 and 6, ejector in 5.', 'Interlock feed down and feed up with NC contacts of each other.'],
      never: [{ when: 'Q0.2=1 Q0.3=1', msg: 'Feed down and up together.' }],
      solution: 'NAME Drilling station\nRUNG 0 → 1: START with a part, drill up, clamp open\nCMP(MW0==0) P(I0.0) NO(I0.2) NO(I0.4) NC(I0.3) MOV(1,MW0)\nRUNG 1 → 2: clamped\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: hole depth reached\nCMP(MW0==2) NO(I0.5) MOV(3,MW0)\nRUNG 3 → 4: drill back up\nCMP(MW0==3) NO(I0.4) MOV(4,MW0)\nRUNG 4 → 5: clamp opened\nCMP(MW0==4) NO(T0) MOV(5,MW0)\nRUNG 5 → 0: ejected\nCMP(MW0==5) NO(T1) MOV(0,MW0)\nRUNG STOP during a cycle → retract\nNC(I0.1) CMP(MW0>=1) CMP(MW0<=5) MOV(6,MW0)\nRUNG 6 → 0: drill is up\nCMP(MW0==6) NO(I0.4) MOV(0,MW0)\nRUNG Unclamp time\nCMP(MW0==4) TON(T0,600ms)\nRUNG Eject time\nCMP(MW0==5) TON(T1,1s)\nRUNG Clamp in steps 1–3\nCMP(MW0>=1) CMP(MW0<=3) COIL(Q0.0)\nRUNG Spindle in steps 2–3\nCMP(MW0>=2) CMP(MW0<=3) COIL(Q0.1)\nRUNG Feed down in step 2\nCMP(MW0==2) NC(Q0.3) COIL(Q0.2)\nRUNG Feed up in steps 3 and 6\nCMP(MW0==3) | NC(Q0.2) COIL(Q0.3)\nCMP(MW0==6)\nRUNG Ejector in step 5\nCMP(MW0==5) COIL(Q0.4)\nRUNG Cycle lamp\nCMP(MW0>=1) CMP(MW0<=5) COIL(Q0.5)',
      tests: [
        { name: 'Drills and ejects a part', steps: ['tap I0.0', 'expect Q0.0=1 Q0.5=1', 'waitfor Q0.1=1 2000', 'expect Q0.2=1', 'waitfor I0.5=1 6000', 'wait 50', 'expect Q0.3=1 Q0.2=0 Q0.1=1', 'waitfor Q0.4=1 6000', 'waitfor MW0=0 3000', 'plant good=1 bad=0'] },
        { name: 'Needs a new part', steps: ['tap I0.0', 'waitfor Q0.4=1 12000', 'waitfor MW0=0 3000', 'tap I0.0', 'expect MW0=0 Q0.0=0', 'action load', 'tap I0.0', 'expect Q0.0=1'] },
        { name: 'STOP retracts the drill', steps: ['tap I0.0', 'waitfor Q0.2=1 2000', 'wait 2000', 'tap I0.1', 'expect Q0.1=0 Q0.2=0 Q0.3=1', 'waitfor I0.4=1 3000', 'wait 50', 'expect MW0=0 Q0.3=0 Q0.0=0'] },
      ],
    },
    {
      id: 'oven', level: 5, plant: 'oven', title: 'Industrial oven bake cycle',
      brief: 'START (door closed): ① <b>preheat</b> to 180 °C ② <b>bake 10 s</b>, holding 170–180 °C (heater on below 170, off at 180) ③ heater off, <b>buzzer</b> until the door is opened. The <b>fan</b> runs whenever heating and for <b>5 s after</b>. Opening the door or STOP during heating aborts (heater off at once). Baking lamp on during ①–②.',
      hints: ['Steps: 0 idle, 1 preheat, 2 bake (TON 10 s), 3 done.', 'Hysteresis bit: SET below 170 °C, RESET at 180 °C. Heater = that bit AND door closed (interlock in the heater rung).', 'Fan: a TOF of 5 s fed by "step 1 or 2".'],
      solution: 'NAME Oven\nRUNG 0 → 1: START with the door closed\nCMP(MW0==0) P(I0.0) NO(I0.2) MOV(1,MW0)\nRUNG 1 → 2: preheated\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: baked 10 s\nCMP(MW0==2) NO(T0) MOV(3,MW0)\nRUNG 3 → 0: door opened, tray taken\nCMP(MW0==3) NC(I0.2) MOV(0,MW0)\nRUNG Abort: STOP, or door opened while heating\nNC(I0.1) - | MOV(0,MW0)\nNC(I0.2) CMP(MW0<=2)\nRUNG Bake time\nCMP(MW0==2) TON(T0,10s)\nRUNG Heat request ON below 170 °C (steps 1–2)\nCMP(MW0>=1) CMP(MW0<=2) NC(I0.4) SET(M0.0)\nRUNG Heat request OFF at 180 °C or outside steps 1–2\nNO(I0.3) | RST(M0.0)\nCMP(MW0==0) |\nCMP(MW0==3)\nRUNG Heater with door interlock\nNO(M0.0) NO(I0.2) COIL(Q0.0)\nRUNG Fan during heating + 5 s\nCMP(MW0>=1) CMP(MW0<=2) TOF(T1,5s)\nRUNG Fan\nNO(T1) COIL(Q0.1)\nRUNG Baking lamp\nCMP(MW0>=1) CMP(MW0<=2) COIL(Q0.2)\nRUNG Buzzer when done\nCMP(MW0==3) COIL(Q0.3)',
      tests: [
        { name: 'Bakes a good tray', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=1 Q0.2=1', 'waitfor Q0.3=1 30000', 'expect Q0.0=0', 'action door', 'wait 200', 'plant good=1 bad=0', 'expect Q0.3=0'] },
        { name: 'Fan runs on 5 s', steps: ['tap I0.0', 'waitfor Q0.3=1 30000', 'expect Q0.1=1', 'wait 5300', 'expect Q0.1=0'] },
        { name: 'Door interlock', steps: ['tap I0.0', 'wait 2000', 'action door', 'wait 50', 'expect Q0.0=0 MW0=0'] },
        { name: 'No start with the door open', steps: ['action door', 'tap I0.0', 'expect MW0=0 Q0.0=0'] },
      ],
    },
    // Level 6
    {
      id: 'traffic-night', level: 6, plant: 'traffic', title: 'Traffic light with night mode',
      brief: 'RUN on (day): the normal cycle Green 5 s → Yellow 2 s → Red 5 s, Walk during red. RUN off (night): <b>yellow flashes</b> about 1 Hz and every other lamp is dark, pedestrian lamps included.',
      hints: ['Start from the traffic-light solution.', 'Yellow = (day yellow phase) OR (NOT RUN AND SM0.5).', 'Red and Don\'t walk now need RUN in series.'],
      never: [{ when: 'Q0.2=1 Q0.3=1', msg: 'Walk was on while cars had green!' }],
      solution: 'RUNG Green time\nNO(I0.0) NC(T3) TON(T1,5s)\nRUNG Yellow time\nNO(T1) TON(T2,2s)\nRUNG Red time\nNO(T2) TON(T3,5s)\nRUNG Green\nNO(I0.0) NC(T1) COIL(Q0.2)\nRUNG Yellow: day phase or night flashing\nNO(T1) NC(T2) | COIL(Q0.1)\nNC(I0.0) NO(SM0.5)\nRUNG Red\nNO(T2) COIL(Q0.0)\nRUNG Walk\nNO(T2) COIL(Q0.3)\nRUNG Don\'t walk (day only)\nNO(I0.0) NC(Q0.3) COIL(Q0.4)',
      tests: [
        { name: 'Night: yellow flashes', steps: ['pulses Q0.1 4000 3 5', 'expect Q0.0=0 Q0.2=0 Q0.3=0 Q0.4=0'] },
        { name: 'Day cycle', steps: ['on I0.0', 'expect Q0.2=1 Q0.1=0', 'wait 5200', 'expect Q0.1=1 Q0.2=0', 'wait 2000', 'expect Q0.0=1 Q0.3=1', 'wait 5000', 'expect Q0.2=1 Q0.4=1'] },
      ],
    },
    // Level 7 · ST
    {
      id: 'st-bug-latch', level: 7, lang: 'st', plant: 'panel', title: '🐞 ST bug hunt: lamp stays on',
      brief: 'L1 should be on <b>only while PB1 is held</b>. In this program it stays on forever after the first press. Why? Fix it.',
      starter: 'PROGRAM PLC_PRG\nVAR\n  PB1 AT %IX0.0 : BOOL;\n  L1  AT %QX0.0 : BOOL;\nEND_VAR\n\n(* BUG: L1 should follow PB1 *)\nIF PB1 THEN\n  L1 := TRUE;\nEND_IF',
      hints: ['An IF without ELSE only ever writes TRUE. Nothing writes FALSE, so it behaves like a SET coil.', 'Write the plain assignment L1 := PB1; or add an ELSE.'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  PB1 AT %IX0.0 : BOOL;\n  L1  AT %QX0.0 : BOOL;\nEND_VAR\n\nL1 := PB1;',
      tests: [{ name: 'Follows the button', steps: ['press I0.0', 'expect Q0.0=1', 'release I0.0', 'expect Q0.0=0', 'press I0.0', 'expect Q0.0=1'] }],
    },
    {
      id: 'st-bug-timer', level: 7, lang: 'st', plant: 'panel', title: '🐞 ST bug hunt: timer won\'t reset',
      tags: { 'I0.4': 'Run request', 'Q0.0': 'Running' },
      brief: 'L1 should come on 3 s after SW1 is switched on and go off <b>immediately</b> when SW1 goes off. Here it stays on after SW1 goes off, and the next delay is wrong. Fix it.',
      starter: 'PROGRAM PLC_PRG\nVAR\n  SW1 AT %IX0.4 : BOOL;\n  L1  AT %QX0.0 : BOOL;\n  Delay : TON;\nEND_VAR\n\n(* BUG: L1 does not go off when SW1 goes off *)\nIF SW1 THEN\n  Delay(IN := SW1, PT := T#3s);\nEND_IF\nL1 := Delay.Q;',
      hints: ['When SW1 is off the timer is never called, so it never sees IN = FALSE.', 'Call function blocks unconditionally, every scan.'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  SW1 AT %IX0.4 : BOOL;\n  L1  AT %QX0.0 : BOOL;\n  Delay : TON;\nEND_VAR\n\nDelay(IN := SW1, PT := T#3s);   (* every scan *)\nL1 := Delay.Q;',
      tests: [
        { name: 'Delay 3 s', steps: ['on I0.4', 'wait 2800', 'expect Q0.0=0', 'wait 400', 'expect Q0.0=1'] },
        { name: 'Off immediately, and re-times', steps: ['on I0.4', 'wait 3300', 'off I0.4', 'wait 50', 'expect Q0.0=0', 'on I0.4', 'wait 1000', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'st-traffic', level: 7, lang: 'st', plant: 'traffic', title: 'ST: pedestrian crossing with CASE',
      brief: 'Rewrite "Pedestrian crossing on request" in ST: with RUN on, green until the button is pressed (remember a short tap), then <b>yellow 2 s</b>, <b>red + Walk 5 s</b>, back to green. RUN off: red. Use a CASE on a <b>State</b> variable and one TON.',
      hints: ['IF PedBtn THEN Request := TRUE; END_IF before the CASE.', 'In each timed state: T(IN := TRUE, PT := …); IF T.Q THEN T(IN := FALSE); State := next; END_IF', 'Decode lamps after the CASE: Green := RunSw AND State = 0; …'],
      never: [{ when: 'Q0.2=1 Q0.3=1', msg: 'Walk was on while cars had green!' }, { when: 'Q0.1=1 Q0.3=1', msg: 'Walk was on during yellow!' }],
      solution: 'PROGRAM PLC_PRG\nVAR\n  RunSw  AT %IX0.0 : BOOL;\n  PedBtn AT %IX0.1 : BOOL;\n  Red    AT %QX0.0 : BOOL;\n  Yellow AT %QX0.1 : BOOL;\n  Green  AT %QX0.2 : BOOL;\n  Walk   AT %QX0.3 : BOOL;\n  DontWalk AT %QX0.4 : BOOL;\n  State : INT := 0;\n  Request : BOOL;\n  T : TON;\nEND_VAR\n\nIF PedBtn THEN Request := TRUE; END_IF\n\nCASE State OF\n  0: (* green, wait for a request *)\n     IF Request THEN State := 1; END_IF\n  1: (* yellow 2 s *)\n     T(IN := TRUE, PT := T#2s);\n     IF T.Q THEN T(IN := FALSE); State := 2; END_IF\n  2: (* red + walk 5 s *)\n     T(IN := TRUE, PT := T#5s);\n     IF T.Q THEN T(IN := FALSE); Request := FALSE; State := 0; END_IF\nEND_CASE\n\nIF NOT RunSw THEN State := 0; Request := FALSE; T(IN := FALSE); END_IF\n\nGreen := RunSw AND State = 0;\nYellow := State = 1;\nRed := State = 2 OR NOT RunSw;\nWalk := State = 2;\nDontWalk := NOT Walk;',
      tests: [
        { name: 'Green waits for a request', steps: ['on I0.0', 'expect Q0.2=1', 'stays Q0.2=1 6000'] },
        { name: 'Short tap starts the cycle', steps: ['on I0.0', 'wait 1000', 'tap I0.1 80', 'expect Q0.1=1 Q0.2=0', 'wait 2000', 'expect Q0.0=1 Q0.3=1', 'wait 5000', 'expect Q0.2=1 Q0.3=0 Q0.4=1', 'stays Q0.2=1 4000'] },
        { name: 'RUN off is red', steps: ['wait 100', 'expect Q0.0=1 Q0.2=0 Q0.4=1'] },
      ],
    },
    {
      id: 'st-mixer', level: 7, lang: 'st', plant: 'mixer', title: 'ST: batch mixer with CASE',
      brief: 'Rewrite the batch-mixer recipe in ST with a <b>Step</b> variable: 0 idle → 10 valve A to 40 % → 20 valve B to 80 % (mixer on) → 30 mix 5 s and heat to 60 °C (heater only below 60 °C) → 40 drain until empty → 50 done lamp 2 s → 0. START only when empty; STOP aborts to 0.',
      hints: ['Call the timers before the CASE: MixTime(IN := Step = 30, PT := T#5s);', 'Transitions only inside the CASE; decode outputs after it: ValveA := Step = 10; Heater := Step = 30 AND NOT TempOK; …'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  Start  AT %IX0.0 : BOOL;\n  StopOK AT %IX0.1 : BOOL;\n  L40 AT %IX0.2 : BOOL;\n  L80 AT %IX0.3 : BOOL;\n  NotEmpty AT %IX0.4 : BOOL;\n  TempOK AT %IX0.5 : BOOL;\n  ValveA AT %QX0.0 : BOOL;\n  ValveB AT %QX0.1 : BOOL;\n  Mixer  AT %QX0.2 : BOOL;\n  Heater AT %QX0.3 : BOOL;\n  Drain  AT %QX0.4 : BOOL;\n  Done   AT %QX0.5 : BOOL;\n  Step : INT := 0;\n  StartEdge : R_TRIG;\n  MixTime, DoneTime : TON;\nEND_VAR\n\nStartEdge(CLK := Start);\nMixTime(IN := Step = 30, PT := T#5s);\nDoneTime(IN := Step = 50, PT := T#2s);\n\nCASE Step OF\n  0:  IF StartEdge.Q AND NOT NotEmpty THEN Step := 10; END_IF\n  10: IF L40 THEN Step := 20; END_IF\n  20: IF L80 THEN Step := 30; END_IF\n  30: IF MixTime.Q AND TempOK THEN Step := 40; END_IF\n  40: IF NOT NotEmpty THEN Step := 50; END_IF\n  50: IF DoneTime.Q THEN Step := 0; END_IF\nEND_CASE\n\nIF NOT StopOK THEN Step := 0; END_IF\n\nValveA := Step = 10;\nValveB := Step = 20;\nMixer := Step = 20 OR Step = 30;\nHeater := Step = 30 AND NOT TempOK;\nDrain := Step = 40;\nDone := Step = 50;',
      tests: [
        { name: 'Uses Step = 10 for valve A', steps: ['tap I0.0', 'expect STEP=10 Q0.0=1'] },
        { name: 'Makes a good batch', steps: ['tap I0.0', 'waitfor Q0.5=1 35000', 'wait 200', 'plant good=1 bad=0'] },
        { name: 'STOP aborts', steps: ['tap I0.0', 'wait 3000', 'tap I0.1', 'expect STEP=0 Q0.0=0 Q0.2=0 Q0.3=0'] },
      ],
    },
    {
      id: 'st-average', level: 7, lang: 'st', plant: 'atank', title: 'ST: moving average with a ring buffer',
      brief: 'Noisy or wavy levels make alarms flicker, so alarm on the <b>average</b> instead. Scale the level to % in <b>Level</b>. Every <b>500 ms</b> store it in a ring buffer <b>ARRAY[0..9] OF INT</b>. Compute <b>Avg</b> of the 10 samples with a <b>FOR</b> loop. High alarm (Q0.0) when Avg ≥ 60. (Open the bypass to fill the tank.)',
      hints: ['Level := (LevelRaw − 6400) / 256; with LevelRaw AT %IW0 : INT.', 'Sample clock: Clock(IN := NOT Clock.Q, PT := T#500ms); IF Clock.Q THEN Samples[Idx] := Level; Idx := (Idx + 1) MOD 10; END_IF', 'Sum := 0; FOR i := 0 TO 9 DO Sum := Sum + Samples[i]; END_FOR Avg := Sum / 10;'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  LevelRaw  AT %IW0 : INT;\n  HighAlarm AT %QX0.0 : BOOL;\n  Level : INT;\n  Samples : ARRAY[0..9] OF INT;\n  Idx, i, Sum, Avg : INT;\n  Clock : TON;\nEND_VAR\n\nLevel := (LevelRaw - 6400) / 256;\n\nClock(IN := NOT Clock.Q, PT := T#500ms);\nIF Clock.Q THEN\n  Samples[Idx] := Level;\n  Idx := (Idx + 1) MOD 10;\nEND_IF\n\nSum := 0;\nFOR i := 0 TO 9 DO\n  Sum := Sum + Samples[i];\nEND_FOR\nAvg := Sum / 10;\n\nHighAlarm := Avg >= 60;',
      tests: [
        { name: 'Scales the level', steps: ['wait 20', 'expect LEVEL=20'] },
        { name: 'Average lags the level', steps: ['action bypass', 'wait 8000', 'range AVG 40 58', 'expect Q0.0=0'] },
        { name: 'Alarm on the average', steps: ['action bypass', 'waitfor Q0.0=1 15000', 'plant lvlPct>=65'] },
      ],
    },
    // ═════════════ Project pack 3 ═════════════
    {
      id: 'washer', level: 6, plant: 'washer', title: 'Washing machine program',
      brief: 'START (door closed): ① <b>lock the door</b> until locked ② <b>fill</b> to wash level ③ <b>heat</b> to 40 °C ④ <b>wash 12 s</b>, drum turning <b>2 s left / 2 s right</b> ⑤ <b>drain</b> until empty ⑥ <b>spin 4 s</b> (drum right + spin, drain pump on) ⑦ unlock, <b>End lamp</b> until the door is opened. <b>STOP</b> during a cycle: drain first, then unlock. The door must stay locked whenever there is water inside.',
      hints: ['Steps 0–7 in MW0, plus step 9 "drain after STOP" that goes to 7.', 'Drum rhythm: two cross-resetting timers (the flasher pattern) while in step 4. Interlock left/right with NC contacts.', 'Door lock is on in steps 1–6 and 9. Drain pump in 5, 6 and 9.'],
      never: [{ when: 'Q0.3=1 Q0.4=1', msg: 'Drum left and right together.' }],
      solution: 'NAME Washing machine\nRUNG 0 → 1: START with the door closed\nCMP(MW0==0) P(I0.0) NO(I0.2) MOV(1,MW0)\nRUNG 1 → 2: door locked\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: filled\nCMP(MW0==2) NO(I0.4) MOV(3,MW0)\nRUNG 3 → 4: hot\nCMP(MW0==3) NO(I0.6) MOV(4,MW0)\nRUNG 4 → 5: washed\nCMP(MW0==4) NO(T0) MOV(5,MW0)\nRUNG 5 → 6: drained\nCMP(MW0==5) NO(I0.5) MOV(6,MW0)\nRUNG 6 → 7: spun\nCMP(MW0==6) NO(T3) MOV(7,MW0)\nRUNG 7 → 0: door opened, laundry out\nCMP(MW0==7) NC(I0.2) MOV(0,MW0)\nRUNG STOP: drain first (step 9)\nNC(I0.1) CMP(MW0>=1) CMP(MW0<=6) MOV(9,MW0)\nRUNG 9 → 7: drained after STOP\nCMP(MW0==9) NO(I0.5) MOV(7,MW0)\nRUNG Wash time\nCMP(MW0==4) TON(T0,12s)\nRUNG Drum rhythm: left phase\nCMP(MW0==4) NC(T2) TON(T1,2s)\nRUNG Drum rhythm: right phase\nNO(T1) TON(T2,2s)\nRUNG Spin time\nCMP(MW0==6) TON(T3,4s)\nRUNG Door lock in steps 1–6 and 9\nCMP(MW0>=1) CMP(MW0<=6) | COIL(Q0.0)\nCMP(MW0==9) -\nRUNG Water valve\nCMP(MW0==2) COIL(Q0.1)\nRUNG Heater\nCMP(MW0==3) COIL(Q0.2)\nRUNG Drum left\nCMP(MW0==4) NC(T1) NC(Q0.4) COIL(Q0.3)\nRUNG Drum right: wash rhythm or spin\nCMP(MW0==4) NO(T1) | NC(Q0.3) COIL(Q0.4)\nCMP(MW0==6) -\nRUNG Drain pump in steps 5, 6, 9\nCMP(MW0==5) | COIL(Q0.5)\nCMP(MW0==6) |\nCMP(MW0==9)\nRUNG Spin\nCMP(MW0==6) COIL(Q0.6)\nRUNG End lamp\nCMP(MW0==7) COIL(Q0.7)',
      tests: [
        { name: 'Washes a clean load', steps: ['tap I0.0', 'expect Q0.0=1', 'waitfor Q0.1=1 2000', 'waitfor Q0.2=1 8000', 'waitfor Q0.3=1 8000', 'waitfor Q0.5=1 16000', 'waitfor Q0.7=1 12000', 'expect Q0.0=0', 'wait 600', 'action door', 'wait 200', 'plant clean=1 dirty=0', 'expect MW0=0'] },
        { name: 'Drum reverses', steps: ['tap I0.0', 'waitfor Q0.3=1 12000', 'waitfor Q0.4=1 3000', 'waitfor Q0.3=1 3000'] },
        { name: 'STOP drains before unlocking', steps: ['tap I0.0', 'waitfor Q0.3=1 12000', 'tap I0.1', 'expect Q0.3=0 Q0.4=0 Q0.5=1 Q0.0=1', 'waitfor I0.5=1 6000', 'wait 100', 'expect Q0.0=0 Q0.7=1'] },
        { name: 'No start with the door open', steps: ['action door', 'tap I0.0', 'expect MW0=0 Q0.0=0'] },
      ],
    },
    {
      id: 'crane', level: 6, plant: 'crane', title: 'Overhead crane: deliver A → C',
      brief: 'START (crane at A, hook up, load waiting): lower the hook, switch the <b>magnet</b> on, wait 0.5 s, raise, <b>travel to C</b>, lower, magnet off, wait 0.5 s, raise, travel back to A. Never travel with the hook down. <b>STOP pauses</b> all motion while held, and the magnet must <b>keep holding</b> the load. The beacon flashes during a cycle.',
      hints: ['Nine steps: 0 idle, 1 down, 2 grip, 3 up, 4 travel right, 5 down, 6 release, 7 up, 8 travel left.', 'Put NO(STOP) only in the motion rungs, not in the step logic or the magnet rung. That is how you get "pause".', 'Magnet = steps 2–5.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'Travel left and right together.' }, { when: 'Q0.2=1 Q0.3=1', msg: 'Hoist up and down together.' }],
      solution: 'NAME Overhead crane\nRUNG 0 → 1: START at A, hook up, load waiting\nCMP(MW0==0) P(I0.0) NO(I0.2) NO(I0.5) NO(I0.7) MOV(1,MW0)\nRUNG 1 → 2: hook down on the load\nCMP(MW0==1) NO(I0.6) MOV(2,MW0)\nRUNG 2 → 3: gripped\nCMP(MW0==2) NO(T0) MOV(3,MW0)\nRUNG 3 → 4: hook up\nCMP(MW0==3) NO(I0.5) MOV(4,MW0)\nRUNG 4 → 5: at C\nCMP(MW0==4) NO(I0.4) MOV(5,MW0)\nRUNG 5 → 6: hook down at C\nCMP(MW0==5) NO(I0.6) MOV(6,MW0)\nRUNG 6 → 7: released\nCMP(MW0==6) NO(T1) MOV(7,MW0)\nRUNG 7 → 8: hook up\nCMP(MW0==7) NO(I0.5) MOV(8,MW0)\nRUNG 8 → 0: back at A\nCMP(MW0==8) NO(I0.2) MOV(0,MW0)\nRUNG Grip time\nCMP(MW0==2) TON(T0,500ms)\nRUNG Release time\nCMP(MW0==6) TON(T1,500ms)\nRUNG Hoist down in steps 1, 5 (STOP pauses)\nCMP(MW0==1) | NO(I0.1) NC(Q0.2) COIL(Q0.3)\nCMP(MW0==5)\nRUNG Hoist up in steps 3, 7\nCMP(MW0==3) | NO(I0.1) NC(Q0.3) COIL(Q0.2)\nCMP(MW0==7)\nRUNG Travel right in step 4\nCMP(MW0==4) NO(I0.1) NC(Q0.0) COIL(Q0.1)\nRUNG Travel left in step 8\nCMP(MW0==8) NO(I0.1) NC(Q0.1) COIL(Q0.0)\nRUNG Magnet holds in steps 2–5, even during STOP\nCMP(MW0>=2) CMP(MW0<=5) COIL(Q0.4)\nRUNG Beacon\nCMP(MW0>=1) NO(SM0.5) COIL(Q0.5)',
      tests: [
        { name: 'Delivers a load', steps: ['tap I0.0', 'expect Q0.3=1', 'waitfor Q0.1=1 5000', 'waitfor I0.4=1 6000', 'waitfor Q0.4=0 5000', 'waitfor MW0=0 10000', 'expect I0.2=1', 'plant delivered=1'] },
        { name: 'STOP pauses, magnet holds', steps: ['tap I0.0', 'waitfor Q0.1=1 5000', 'wait 1000', 'press I0.1', 'wait 100', 'expect Q0.1=0 Q0.4=1', 'wait 1000', 'release I0.1', 'expect Q0.1=1'] },
        { name: 'No load, no start', steps: ['tap I0.0', 'waitfor Q0.0=1 15000', 'waitfor MW0=0 6000', 'tap I0.0', 'expect MW0=0 Q0.3=0', 'action place', 'tap I0.0', 'expect Q0.3=1'] },
      ],
    },
    {
      id: 'indexer', level: 6, plant: 'indexer', title: 'Rotary indexing table',
      brief: 'With <b>AUTO</b> on and the table in position, work the stations: <b>press</b> a part under the press (down to the bottom, then let it spring up), and <b>eject</b> a part at the eject station. When the press is up, nothing is left at eject and the ejector is home, <b>index</b> the table one position. Only index when there is a part at any station. Every part must be pressed before it is ejected.',
      hints: ['Steps: 0 wait, 1 station work, 2 indexing. 0 → 1 when in position AND a part at load, press or eject.', 'Remember "pressed this dwell" in M0.0 (SET at press down, RESET while indexing). Press = step 1 AND part at press AND NOT M0.0.', 'Step 2 ends on the rising edge P(I0.1) of "in position", because the table starts in position.'],
      solution: 'NAME Indexing table\nRUNG 0 → 1: in position with a part at any station\nCMP(MW0==0) NO(I0.0) NO(I0.1) | NO(I0.2) | MOV(1,MW0)\n. . . | NO(I0.3) |\n. . . NO(I0.6)\nRUNG Press a part that is not pressed yet\nCMP(MW0==1) NO(I0.3) NC(M0.0) COIL(Q0.1)\nRUNG Pressed → remember\nCMP(MW0==1) NO(I0.5) SET(M0.0)\nRUNG Eject the part at the eject station\nCMP(MW0==1) NO(I0.6) COIL(Q0.2)\nRUNG 1 → 2: stations done\nCMP(MW0==1) | NC(I0.3) | NO(I0.4) NC(I0.6) NO(I0.7) MOV(2,MW0)\n. NO(M0.0)\nRUNG 2 → 0: arrived at the next position\nCMP(MW0==2) P(I0.1) MOV(0,MW0)\nRUNG Forget "pressed" while indexing\nCMP(MW0==2) RST(M0.0)\nRUNG Index motor\nCMP(MW0==2) COIL(Q0.0)\nRUNG Running lamp\nNO(I0.0) COIL(Q0.3)',
      tests: [
        { name: 'Presses and ejects three parts', steps: ['on I0.0', 'action load', 'waitfor I0.2=0 4000', 'waitfor I0.1=1 2000', 'action load', 'waitfor I0.2=0 4000', 'waitfor I0.1=1 2000', 'action load', 'wait 12000', 'plant good=3 bad=0'] },
        { name: 'Idle without parts', steps: ['on I0.0', 'wait 2000', 'expect Q0.0=0 Q0.1=0'] },
        { name: 'Press holds the table', steps: ['on I0.0', 'action load', 'waitfor Q0.1=1 4000', 'expect Q0.0=0', 'waitfor I0.5=1 1000', 'expect Q0.0=0'] },
      ],
    },
    {
      id: 'auto-batching', level: 6, plant: 'conveyor', title: 'Automatic batching line',
      tags: { 'Q0.1': 'Carton closing', 'Q0.2': 'Feeder' },
      brief: 'START runs the belt <b>and the feeder</b> (which drops a box every 1.5 s); STOP stops both. Count boxes at the photo-eye. After every <b>5 boxes</b>: stop belt and feeder for <b>3 s</b> while the carton closes (Q0.1 on), then continue with a new batch. Count finished batches in <b>MW10</b>.',
      hints: ['CTU(C0,5) on the photo-eye; C0 done starts a 3 s TON.', 'When the TON is done: ADD 1 to MW10 on its rising edge, and RST C0. That ends the pause by itself.', 'One rung can drive two coils: branch at the output column.'],
      solution: 'NAME Automatic batching\nRUNG Line running\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG Count boxes\nNO(I0.2) CTU(C0,5)\nRUNG Pause 3 s after a batch\nNO(C0) TON(T0,3s)\nRUNG Carton closing lamp\nNO(C0) COIL(Q0.1)\nRUNG Belt and feeder run unless pausing\nNO(M0.0) NC(C0) ~ | COIL(Q0.0)\nCOIL(Q0.2)\nRUNG Count the batch once\nP(T0) ADD(MW10,1,MW10)\nRUNG Start the next batch\nNO(T0) RST(C0)',
      tests: [
        { name: 'Pauses after 5 boxes', steps: ['tap I0.0', 'expect Q0.0=1 Q0.2=1', 'waitfor Q0.1=1 15000', 'expect Q0.0=0 Q0.2=0', 'wait 3200', 'expect Q0.0=1 Q0.1=0 MW10=1'] },
        { name: 'Keeps batching', steps: ['tap I0.0', 'wait 26000', 'range MW10 2 3', 'plant bin>=8'] },
        { name: 'STOP', steps: ['tap I0.0', 'wait 2000', 'tap I0.1', 'expect Q0.0=0 Q0.2=0'] },
      ],
    },
    {
      id: 'cyl-abba-c', level: 5, plant: 'cylinders', title: 'Cylinders: A+ B+ B− A− C+ C−',
      brief: 'One cycle per START (from home): <b>A out, B out, B back, A back, C out, C back</b>. Each move waits for its sensor. STOP aborts.',
      hints: ['Six motion steps in MW0. Y1 is on in steps 1–3, Y2 in step 2, Y3 in step 5.'],
      solution: 'NAME A+ B+ B− A− C+ C−\nRUNG 0 → 1\nCMP(MW0==0) P(I0.0) NO(I0.2) NO(I0.4) NO(I0.6) MOV(1,MW0)\nRUNG 1 → 2: A out\nCMP(MW0==1) NO(I0.3) MOV(2,MW0)\nRUNG 2 → 3: B out\nCMP(MW0==2) NO(I0.5) MOV(3,MW0)\nRUNG 3 → 4: B home\nCMP(MW0==3) NO(I0.4) MOV(4,MW0)\nRUNG 4 → 5: A home\nCMP(MW0==4) NO(I0.2) MOV(5,MW0)\nRUNG 5 → 6: C out\nCMP(MW0==5) NO(I0.7) MOV(6,MW0)\nRUNG 6 → 0: C home\nCMP(MW0==6) NO(I0.6) MOV(0,MW0)\nRUNG STOP\nNC(I0.1) MOV(0,MW0)\nRUNG Y1 in steps 1–3\nCMP(MW0>=1) CMP(MW0<=3) COIL(Q0.0)\nRUNG Y2 in step 2\nCMP(MW0==2) COIL(Q0.1)\nRUNG Y3 in step 5\nCMP(MW0==5) COIL(Q0.2)',
      tests: [
        { name: 'Sequence', steps: ['tap I0.0', 'expect Q0.0=1', 'order Q0.1+ Q0.1- Q0.0- Q0.2+ Q0.2- 10000', 'waitfor MW0=0 2000'] },
        { name: 'STOP', steps: ['tap I0.0', 'wait 1500', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0 MW0=0'] },
      ],
    },
    {
      id: 'st-greenhouse', level: 7, lang: 'st', plant: 'greenhouse', title: 'ST: greenhouse climate control',
      brief: 'In AUTO, keep the greenhouse at <b>20–26 °C</b>. Scale <b>AIW0</b> (0–50 °C) to whole degrees in <b>TempC</b>. <b>Heater</b> on below 20 °C, off at 22 °C. <b>Vent</b>: open fully above 26 °C, close fully below 23 °C (stop each motor at its limit). <b>Fan</b> whenever the heater is on or the vent is not closed. <b>Irrigation</b>: a 4 s pulse when the soil is dry. <b>Alarm</b> below 10 °C or above 35 °C. AUTO off: heater, vent motors and irrigation off.',
      hints: ['TempC := (TempRaw − 6400) / 512;', 'Hysteresis in ST: IF TempC < 20 THEN Heater := TRUE; ELSIF TempC >= 22 THEN Heater := FALSE; END_IF', 'Irrigate : TP; then Irrigate(IN := AutoSw AND SoilDry, PT := T#4s);'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  AutoSw     AT %IX0.0 : BOOL;\n  TempRaw    AT %IW0  : INT;\n  VentOpen   AT %IX0.2 : BOOL;\n  VentClosed AT %IX0.3 : BOOL;\n  SoilDry    AT %IX0.4 : BOOL;\n  Heater     AT %QX0.0 : BOOL;\n  VentOpenCmd  AT %QX0.1 : BOOL;\n  VentCloseCmd AT %QX0.2 : BOOL;\n  Fan        AT %QX0.3 : BOOL;\n  Water      AT %QX0.4 : BOOL;\n  Alarm      AT %QX0.5 : BOOL;\n  TempC : INT;\n  Venting : BOOL;\n  Irrigate : TP;\nEND_VAR\n\nTempC := (TempRaw - 6400) / 512;\n\nIF AutoSw THEN\n  (* heater 20 / 22 *)\n  IF TempC < 20 THEN Heater := TRUE; ELSIF TempC >= 22 THEN Heater := FALSE; END_IF\n  (* vent 26 / 23 *)\n  IF TempC > 26 THEN Venting := TRUE; ELSIF TempC < 23 THEN Venting := FALSE; END_IF\n  VentOpenCmd := Venting AND NOT VentOpen;\n  VentCloseCmd := NOT Venting AND NOT VentClosed;\nELSE\n  Heater := FALSE; Venting := FALSE;\n  VentOpenCmd := FALSE; VentCloseCmd := FALSE;\nEND_IF\n\nFan := Heater OR NOT VentClosed;\n\nIrrigate(IN := AutoSw AND SoilDry, PT := T#4s);\nWater := Irrigate.Q;\n\nAlarm := TempC < 10 OR TempC > 35;',
      tests: [
        { name: 'Scales the temperature', steps: ['wait 20', 'expect TEMPC=15'] },
        { name: 'Heats on a cold night', steps: ['on I0.0', 'action cold', 'wait 25000', 'plant tC>=19 tC<=23'] },
        { name: 'Vents on a sunny day', steps: ['on I0.0', 'action sunny', 'wait 40000', 'plant tC>=21 tC<=28'] },
        { name: 'Irrigates dry soil', steps: ['on I0.0', 'wait 100', 'expect Q0.4=1', 'wait 4500', 'expect Q0.4=0', 'plant moistPct>=60 moistPct<=95'] },
        { name: 'Manual: outputs off', steps: ['action cold', 'wait 2000', 'expect Q0.0=0 Q0.4=0 Q0.1=0'] },
      ],
    },
    {
      id: 'st-elevator', level: 7, lang: 'st', plant: 'elevator', title: 'ST: elevator with arrays and FOR',
      brief: 'Rewrite the 3-floor elevator in ST using <b>arrays</b>: Calls : ARRAY[1..3] OF BOOL and AtFloor : ARRAY[1..3] OF BOOL. Use <b>FOR</b> loops to find the current floor, whether the car is serving a call, and whether there is a call <b>above</b> or <b>below</b>. Same rules as the ladder project: door open 3 s, never move with the door open.',
      hints: ['First FOR: IF AtFloor[i] THEN Floor := i; IF Calls[i] THEN Serving := TRUE; END_IF END_IF', 'Second FOR: IF Calls[i] AND i > Floor THEN CallAbove := TRUE; END_IF', 'Clear the served call with Calls[Floor] := FALSE; when the door timer is done.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'UP and DOWN together.' }],
      solution: 'PROGRAM PLC_PRG\nVAR\n  Call1 AT %IX0.0 : BOOL;  Call2 AT %IX0.1 : BOOL;  Call3 AT %IX0.2 : BOOL;\n  At1 AT %IX0.3 : BOOL;  At2 AT %IX0.4 : BOOL;  At3 AT %IX0.5 : BOOL;\n  DoorClosed AT %IX0.6 : BOOL;\n  Up AT %QX0.0 : BOOL;  Down AT %QX0.1 : BOOL;  DoorOpen AT %QX0.2 : BOOL;\n  Calls   : ARRAY[1..3] OF BOOL;\n  AtFloor : ARRAY[1..3] OF BOOL;\n  Floor : INT := 1;      (* last floor seen *)\n  i : INT;\n  Serving, CallAbove, CallBelow : BOOL;\n  DoorTimer : TON;\nEND_VAR\n\nAtFloor[1] := At1;  AtFloor[2] := At2;  AtFloor[3] := At3;\nIF Call1 THEN Calls[1] := TRUE; END_IF\nIF Call2 THEN Calls[2] := TRUE; END_IF\nIF Call3 THEN Calls[3] := TRUE; END_IF\n\nServing := FALSE;\nFOR i := 1 TO 3 DO\n  IF AtFloor[i] THEN\n    Floor := i;\n    IF Calls[i] THEN Serving := TRUE; END_IF\n  END_IF\nEND_FOR\n\nCallAbove := FALSE;  CallBelow := FALSE;\nFOR i := 1 TO 3 DO\n  IF Calls[i] AND i > Floor THEN CallAbove := TRUE; END_IF\n  IF Calls[i] AND i < Floor THEN CallBelow := TRUE; END_IF\nEND_FOR\n\nDoorOpen := Serving AND NOT Up AND NOT Down;\nDoorTimer(IN := DoorOpen, PT := T#3s);\nIF DoorTimer.Q THEN Calls[Floor] := FALSE; END_IF\n\nUp   := DoorClosed AND NOT Serving AND NOT DoorOpen AND NOT Down AND CallAbove;\nDown := DoorClosed AND NOT Serving AND NOT DoorOpen AND NOT Up AND CallBelow;',
      tests: [
        { name: 'Call at the current floor opens the door', steps: ['tap I0.0', 'waitfor Q0.2=1 1000', 'waitfor Q0.2=0 5000', 'waitfor I0.6=1 2000'] },
        { name: 'Goes up to floor 3 and serves it', steps: ['tap I0.2', 'expect Q0.0=1', 'waitfor I0.5=1 6000', 'wait 100', 'expect Q0.0=0 Q0.2=1', 'waitfor I0.6=1 6000', 'plant s3=1'] },
        { name: 'Comes back down to floor 1', steps: ['tap I0.2', 'waitfor I0.5=1 6000', 'waitfor Q0.2=1 1000', 'waitfor Q0.2=0 5000', 'waitfor I0.6=1 2000', 'tap I0.0', 'expect Q0.1=1', 'waitfor I0.3=1 6000', 'wait 100', 'expect Q0.2=1', 'waitfor I0.6=1 6000', 'plant s1=1'] },
        { name: 'Remembers two calls', steps: ['tap I0.1', 'tap I0.2', 'wait 16000', 'plant s2=1 s3=1', 'expect Q0.0=0 Q0.1=0'] },
      ],
    },
    {
      id: 'st-bottling', level: 7, lang: 'st', plant: 'bottling', title: 'ST: bottle filling with CASE',
      brief: 'Rewrite the bottle filling line in ST. A <b>Running</b> latch (START/STOP), an <b>R_TRIG</b> on "bottle in place", and a CASE with steps 0 idle, 10 index (conveyor), 20 fill (valve until full). Running lamp while running.',
      hints: ['Running := (Start OR Running) AND StopOK;', 'Arrived(CLK := InPlace); then in step 10: IF Arrived.Q THEN Step := 20; END_IF', 'Valve := Step = 20 AND NOT Full;'],
      solution: 'PROGRAM PLC_PRG\nVAR\n  Start   AT %IX0.0 : BOOL;\n  StopOK  AT %IX0.1 : BOOL;\n  InPlace AT %IX0.2 : BOOL;\n  Full    AT %IX0.3 : BOOL;\n  Conveyor AT %QX0.0 : BOOL;\n  Valve    AT %QX0.1 : BOOL;\n  RunLamp  AT %QX0.2 : BOOL;\n  Running : BOOL;\n  Step : INT := 0;\n  Arrived : R_TRIG;\nEND_VAR\n\nRunning := (Start OR Running) AND StopOK;\nArrived(CLK := InPlace);\n\nCASE Step OF\n  0:  IF Running THEN Step := 10; END_IF       (* idle *)\n  10: IF Arrived.Q THEN Step := 20; END_IF     (* move to the next bottle *)\n  20: IF Full THEN Step := 10; END_IF          (* fill *)\nEND_CASE\nIF NOT Running THEN Step := 0; END_IF\n\nConveyor := Step = 10;\nValve := Step = 20 AND NOT Full;\nRunLamp := Running;',
      tests: [
        { name: 'Stops and fills the first bottle', steps: ['tap I0.0', 'waitfor I0.2=1 3000', 'wait 50', 'expect Q0.0=0 Q0.1=1', 'waitfor I0.3=1 3000', 'wait 50', 'expect Q0.1=0 Q0.0=1'] },
        { name: 'Fills a run of bottles', steps: ['tap I0.0', 'wait 16000', 'plant filled>=3 under=0'] },
        { name: 'STOP mid-fill', steps: ['tap I0.0', 'waitfor Q0.1=1 3000', 'wait 500', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0'] },
      ],
    },
    // ═════════════ Project pack 4 ═════════════
    {
      id: 'gate', level: 6, plant: 'gate', title: 'Sliding gate with one remote button',
      brief: 'One <b>remote</b> button does everything, like real gate controllers: closed → <b>open</b>; open → <b>close</b>; moving → <b>stop</b>; stopped → go the <b>other way</b> than before. When fully open, <b>auto-close after 10 s</b> (the timer restarts while the photocell is blocked). While closing, a blocked <b>photocell</b> or the <b>safety edge</b> makes the gate reverse and open. STOP stops it. The lamp flashes while it moves.',
      hints: ['States in MW0: 0 closed, 1 opening, 2 open, 3 closing, 4 stopped. Remember the last direction in a bit (SET while opening, RESET while closing).', 'One button press must cause one change only. Use the next-state pattern: first MOV(MW0, MW2), then every transition writes MW2, and at the end MOV(MW2, MW0). Then a press can never cascade 1 → 4 → 3 in one scan.', 'Auto-close: TON in state 2 with the photocell-clear contact in series.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'Open and close motors together.' }],
      solution: 'NAME Sliding gate\nRUNG Remote: one pulse per press\nP(I0.0) COIL(M1.0)\nRUNG Next state = current state by default\nNO(SM0.0) MOV(MW0,MW2)\nRUNG 0 → 1: remote opens\nCMP(MW0==0) NO(M1.0) NC(I0.2) MOV(1,MW2)\nRUNG 1 → 2: fully open\nCMP(MW0==1) NO(I0.2) MOV(2,MW2)\nRUNG 1 → 4: remote or STOP while opening\nCMP(MW0==1) | NO(M1.0) | MOV(4,MW2)\n. NC(I0.1)\nRUNG Auto-close timer (restarts while the photocell is blocked)\nCMP(MW0==2) NO(I0.4) TON(T0,10s)\nRUNG 2 → 3: remote or auto-close\nCMP(MW0==2) | NO(M1.0) | MOV(3,MW2)\n. NO(T0)\nRUNG 3 → 0: closed\nCMP(MW0==3) NO(I0.3) MOV(0,MW2)\nRUNG 3 → 4: remote or STOP while closing\nCMP(MW0==3) | NO(M1.0) | MOV(4,MW2)\n. NC(I0.1)\nRUNG 3 → 1: photocell or safety edge: reverse (last, so it wins)\nCMP(MW0==3) | NC(I0.4) | MOV(1,MW2)\n. NC(I0.5)\nRUNG 4 → 3: remote after stopping while opening\nCMP(MW0==4) NO(M1.0) NO(M0.1) MOV(3,MW2)\nRUNG 4 → 1: remote after stopping while closing\nCMP(MW0==4) NO(M1.0) NC(M0.1) MOV(1,MW2)\nRUNG Apply the next state\nNO(SM0.0) MOV(MW2,MW0)\nRUNG Remember the direction: opening\nCMP(MW0==1) SET(M0.1)\nRUNG Remember the direction: closing\nCMP(MW0==3) RST(M0.1)\nRUNG Motor open\nCMP(MW0==1) NC(Q0.1) COIL(Q0.0)\nRUNG Motor close\nCMP(MW0==3) NC(Q0.0) COIL(Q0.1)\nRUNG Flashing lamp while moving\nNO(SM0.5) | CMP(MW0==1) | COIL(Q0.2)\n. CMP(MW0==3)',
      tests: [
        { name: 'Opens, then auto-closes', steps: ['tap I0.0', 'expect Q0.0=1', 'waitfor I0.2=1 6000', 'wait 50', 'expect Q0.0=0', 'stays Q0.1=0 9500', 'waitfor Q0.1=1 1000', 'waitfor I0.3=1 6000', 'wait 50', 'expect Q0.1=0 MW0=0'] },
        { name: 'Press while opening stops, next press closes', steps: ['tap I0.0', 'wait 2000', 'tap I0.0', 'expect Q0.0=0 Q0.1=0', 'tap I0.0', 'expect Q0.1=1', 'waitfor I0.3=1 4000'] },
        { name: 'Photocell reverses closing', steps: ['tap I0.0', 'waitfor I0.2=1 6000', 'tap I0.0', 'wait 1500', 'action car', 'wait 50', 'expect Q0.1=0 Q0.0=1', 'waitfor I0.2=1 6000'] },
        { name: 'No auto-close while blocked', steps: ['tap I0.0', 'waitfor I0.2=1 6000', 'action car', 'stays Q0.1=0 12000'] },
        { name: 'Safety edge reverses', steps: ['tap I0.0', 'waitfor I0.2=1 6000', 'tap I0.0', 'wait 1500', 'action edge', 'wait 50', 'expect Q0.0=1 Q0.1=0'] },
        { name: 'Lamp flashes while moving', steps: ['tap I0.0', 'pulses Q0.2 3000 2 4'] },
      ],
    },
    {
      id: 'st-gate', level: 7, lang: 'st', plant: 'gate', title: 'ST: sliding gate state machine',
      brief: 'The same one-button gate in ST: a <b>State</b> INT (0 closed, 1 opening, 2 open, 3 closing, 4 stopped), a <b>R_TRIG</b> on the remote, a <b>TON</b> for auto-close (10 s, only while the photocell is clear), photocell/safety-edge reversal while closing, STOP. Notice that CASE runs only <b>one</b> branch per scan, so a press can never cascade through several states.',
      hints: ['In state 3 check the safety conditions FIRST: IF NOT BeamClear OR NOT EdgeOK THEN State := 1; ELSIF IsClosed THEN …', 'WasOpening := TRUE in state 1 and FALSE in state 3; state 4 uses it to pick the direction.', 'Flash: Flash(IN := NOT Flash.Q, PT := T#500ms); IF Flash.Q THEN Lamp := NOT Lamp; END_IF, and force Lamp FALSE when not moving.'],
      never: [{ when: 'Q0.0=1 Q0.1=1', msg: 'Open and close motors together.' }],
      solution: 'PROGRAM PLC_PRG\nVAR\n  Remote    AT %IX0.0 : BOOL;\n  StopOK    AT %IX0.1 : BOOL;\n  IsOpen    AT %IX0.2 : BOOL;\n  IsClosed  AT %IX0.3 : BOOL;\n  BeamClear AT %IX0.4 : BOOL;\n  EdgeOK    AT %IX0.5 : BOOL;\n  MotorOpen  AT %QX0.0 : BOOL;\n  MotorClose AT %QX0.1 : BOOL;\n  Lamp       AT %QX0.2 : BOOL;\n  State : INT := 0;   (* 0 closed, 1 opening, 2 open, 3 closing, 4 stopped *)\n  WasOpening : BOOL;\n  Press : R_TRIG;\n  AutoClose, Flash : TON;\nEND_VAR\n\nPress(CLK := Remote);\nAutoClose(IN := State = 2 AND BeamClear, PT := T#10s);\n\nCASE State OF\n  0: IF Press.Q AND NOT IsOpen THEN State := 1; END_IF\n  1: WasOpening := TRUE;\n     IF IsOpen THEN State := 2;\n     ELSIF Press.Q OR NOT StopOK THEN State := 4;\n     END_IF\n  2: IF Press.Q OR AutoClose.Q THEN State := 3; END_IF\n  3: WasOpening := FALSE;\n     IF NOT BeamClear OR NOT EdgeOK THEN State := 1;   (* safety first *)\n     ELSIF IsClosed THEN State := 0;\n     ELSIF Press.Q OR NOT StopOK THEN State := 4;\n     END_IF\n  4: IF Press.Q THEN\n       IF WasOpening THEN State := 3; ELSE State := 1; END_IF\n     END_IF\nEND_CASE\n\nFlash(IN := NOT Flash.Q, PT := T#500ms);\nIF Flash.Q THEN Lamp := NOT Lamp; END_IF\nIF State <> 1 AND State <> 3 THEN Lamp := FALSE; END_IF\n\nMotorOpen := State = 1;\nMotorClose := State = 3;',
      tests: [
        { name: 'Opens, then auto-closes', steps: ['tap I0.0', 'expect Q0.0=1', 'waitfor I0.2=1 6000', 'wait 50', 'expect Q0.0=0', 'stays Q0.1=0 9500', 'waitfor Q0.1=1 1000', 'waitfor I0.3=1 6000', 'wait 50', 'expect Q0.1=0 STATE=0'] },
        { name: 'Press while opening stops, next press closes', steps: ['tap I0.0', 'wait 2000', 'tap I0.0', 'expect Q0.0=0 Q0.1=0', 'tap I0.0', 'expect Q0.1=1', 'waitfor I0.3=1 4000'] },
        { name: 'Photocell reverses closing', steps: ['tap I0.0', 'waitfor I0.2=1 6000', 'tap I0.0', 'wait 1500', 'action car', 'wait 50', 'expect Q0.1=0 Q0.0=1', 'waitfor I0.2=1 6000'] },
        { name: 'No auto-close while blocked', steps: ['tap I0.0', 'waitfor I0.2=1 6000', 'action car', 'stays Q0.1=0 12000'] },
        { name: 'Lamp flashes while moving', steps: ['tap I0.0', 'pulses Q0.2 3000 2 4'] },
      ],
    },
    {
      id: 'compressor', level: 6, plant: 'compressor', title: 'Air compressor station',
      brief: 'START enables, STOP disables and resets faults. When pressure is <b>below 6 bar</b>, start the motor <b>unloaded</b>, then after <b>2 s</b> open the load valve. At <b>8 bar</b> close the load valve but keep the motor <b>idling for 15 s</b> (run-on); if the pressure falls below 6 bar again it reloads without restarting. After 15 s idle, stop. The motor may start at most 3 times a minute. <b>Overload</b> or <b>10 bar</b> stops everything and latches the fault lamp until STOP is pressed.',
      hints: ['Demand bit: SET below 6 bar, RESET at 8 bar. That is hysteresis again.', 'Run-on: TON(15 s) fed by "motor running AND NOT demand". Motor = enabled AND NOT fault AND (demand OR (motor AND NOT run-on done)).', 'Unloaded start: TON(2 s) from the motor; load valve = demand AND that timer done.'],
      solution: 'NAME Compressor\nRUNG Enable (STOP disables)\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG Fault latch: 10 bar or overload, reset with STOP\nNO(I0.5) | NO(I0.1) COIL(M0.5)\nNC(I0.4) |\nNO(M0.5)\nRUNG Demand ON below 6 bar\nNO(M0.0) NC(M0.5) NC(I0.2) SET(M0.1)\nRUNG Demand OFF at 8 bar, when disabled or faulted\nNO(I0.3) | RST(M0.1)\nNC(M0.0) |\nNO(M0.5)\nRUNG Run-on: idling unloaded\nNO(Q0.0) NC(M0.1) TON(T1,15s)\nRUNG Motor: demand, or idling until the run-on ends\nNO(M0.0) NC(M0.5) | NO(M0.1) - | COIL(Q0.0)\n. . NO(Q0.0) NC(T1)\nRUNG Unloaded start time\nNO(Q0.0) TON(T0,2s)\nRUNG Load valve\nNO(M0.1) NO(T0) COIL(Q0.1)\nRUNG Fault lamp\nNO(M0.5) COIL(Q0.2)\nRUNG Running lamp\nNO(Q0.0) COIL(Q0.3)',
      tests: [
        { name: 'Unloaded start, then compress to 8 bar', steps: ['tap I0.0', 'expect Q0.0=1 Q0.1=0', 'wait 2200', 'expect Q0.1=1', 'waitfor I0.3=1 15000', 'wait 50', 'expect Q0.1=0 Q0.0=1'] },
        { name: 'Run-on, then stop', steps: ['action demand', 'tap I0.0', 'waitfor I0.3=1 20000', 'wait 50', 'stays Q0.0=1 14500', 'waitfor Q0.0=0 1500'] },
        { name: 'Reloads without restarting', steps: ['tap I0.0', 'wait 60000', 'plant starts=1'] },
        { name: 'Overload latches the fault', steps: ['tap I0.0', 'wait 3000', 'action trip', 'wait 50', 'expect Q0.0=0 Q0.2=1', 'action trip', 'wait 500', 'expect Q0.2=1 Q0.0=0', 'tap I0.1', 'expect Q0.2=0'] },
      ],
    },
    {
      id: 'capline', level: 6, plant: 'capline', title: 'Filling & capping line (parallel stations)',
      brief: 'START/STOP. The conveyor runs until a bottle <b>arrives</b> at the filler; then it waits while <b>both stations work at the same time</b>: fill the bottle at the filler until full, and cap the bottle at the capper (capper down to the bottom, <b>twist 1 s</b>, back up). Only when the bottle is full, the cap is done (or there was no bottle at the capper) and the capper is up does the conveyor move on.',
      hints: ['A "dwell" bit M0.1: SET on the rising edge of "bottle at filler", RESET when both stations are done.', 'Two station-done bits: fill done (SET at full) and cap done (SET when the 1 s twist timer ends). Clear them while the conveyor runs.', 'Station 2 done = NOT bottle at capper OR cap done. That OR branch is the key to parallel stations.'],
      solution: 'NAME Filling and capping\nRUNG Running latch\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG Bottle arrived at the filler → dwell\nNO(M0.0) P(I0.2) SET(M0.1)\nRUNG Fill done\nNO(M0.1) NO(I0.3) SET(M0.2)\nRUNG Fill valve\nNO(M0.0) NO(M0.1) NO(I0.2) NC(I0.3) NC(M0.2) COIL(Q0.1)\nRUNG Capper reached the bottom\nNO(M0.1) NO(I0.6) SET(M0.3)\nRUNG Twist 1 s\nNO(M0.3) NC(M0.4) TON(T0,1s)\nRUNG Cap done\nNO(T0) SET(M0.4)\nRUNG Capper down until capped\nNO(M0.0) NO(M0.1) NO(I0.4) NC(M0.4) COIL(Q0.2)\nRUNG Twist motor\nNO(M0.0) NO(M0.3) NC(M0.4) COIL(Q0.3)\nRUNG Both stations done and capper up → move on\nNO(M0.1) NO(M0.2) NO(I0.5) | NO(M0.4) | RST(M0.1)\n. . . NC(I0.4)\nRUNG Clear fill done while moving\nNC(M0.1) RST(M0.2)\nRUNG Clear capper bits while moving\nNC(M0.1) RST(M0.3)\nRUNG\nNC(M0.1) RST(M0.4)\nRUNG Conveyor\nNO(M0.0) NC(M0.1) COIL(Q0.0)\nRUNG Running lamp\nNO(M0.0) COIL(Q0.4)',
      tests: [
        { name: 'Fills and caps every bottle', steps: ['tap I0.0', 'wait 25000', 'plant good>=4 bad=0'] },
        { name: 'Stations work in parallel', steps: ['tap I0.0', 'waitfor Q0.1=1 3000', 'expect Q0.0=0', 'waitfor Q0.2=1 8000', 'expect Q0.0=0 Q0.1=1', 'waitfor Q0.3=1 1000', 'expect Q0.0=0'] },
        { name: 'STOP', steps: ['tap I0.0', 'wait 2000', 'tap I0.1', 'expect Q0.0=0 Q0.1=0 Q0.2=0'] },
      ],
    },
    {
      id: 'palletizer', level: 6, plant: 'palletizer', title: 'Palletizer: rows, layers, pallets',
      brief: 'START/STOP. Build pallets of <b>3 layers</b>; each layer is <b>2 rows</b> of <b>3 boxes</b>. Push each box onto the row table (out, then home); after 3 boxes push the row onto the pallet; after 2 rows <b>lower the elevator one layer</b>; after 3 layers send the <b>pallet out</b> (Full lamp on) and wait for a new pallet. Infeed runs only while the box pusher is home. Never move a pusher or the elevator into another one.',
      hints: ['Steps: 0 wait for a box, 1 push box, 2 box pusher back, 3 push row, 4 row pusher back, 5 lower, 6 pallet out, 7 wait for a new pallet.', 'Three counters: C0 boxes per row (3), C1 rows per layer (2), C2 layers per pallet (3). Each counts the condition "in that step AND the move has finished".', 'Two transitions leave step 2: to 3 if C0 is done, else back to 0. Same pattern for steps 4 and 5.'],
      solution: 'NAME Palletizer\nRUNG Running latch\nNO(I0.0) | NO(I0.1) COIL(M0.0)\nNO(M0.0)\nRUNG Count boxes in the row\nCMP(MW0==2) NO(I0.3) CTU(C0,3)\nRUNG Count rows on the layer\nCMP(MW0==4) NO(I0.5) CTU(C1,2)\nRUNG Count layers on the pallet\nCMP(MW0==5) P(I0.7) CTU(C2,3)\nRUNG 0 → 1: box ready, everything home, pallet there\nCMP(MW0==0) NO(M0.0) NO(I0.2) NO(I0.3) NO(I0.5) NO(I1.0) MOV(1,MW0)\nRUNG 1 → 2: box pushed\nCMP(MW0==1) NO(I0.4) MOV(2,MW0)\nRUNG 2 → 3: pusher home, row complete\nCMP(MW0==2) NO(I0.3) NO(C0) MOV(3,MW0)\nRUNG 2 → 0: pusher home, row not complete\nCMP(MW0==2) NO(I0.3) NC(C0) MOV(0,MW0)\nRUNG 3 → 4: row pushed\nCMP(MW0==3) NO(I0.6) MOV(4,MW0)\nRUNG 4 → 5: row pusher home, layer complete\nCMP(MW0==4) NO(I0.5) NO(C1) MOV(5,MW0)\nRUNG 4 → 0: row pusher home, layer not complete\nCMP(MW0==4) NO(I0.5) NC(C1) MOV(0,MW0)\nRUNG New row after a row push\nCMP(MW0==4) RST(C0)\nRUNG 5 → 6: lowered, pallet full\nCMP(MW0==5) P(I0.7) NO(C2) MOV(6,MW0)\nRUNG 5 → 0: lowered, more layers to go\nCMP(MW0==5) P(I0.7) NC(C2) MOV(0,MW0)\nRUNG New layer after lowering\nCMP(MW0==5) RST(C1)\nRUNG 6 → 7: pallet gone\nCMP(MW0==6) NC(I1.0) MOV(7,MW0)\nRUNG 7 → 0: new pallet\nCMP(MW0==7) NO(I1.0) MOV(0,MW0)\nRUNG New pallet: reset layer count\nCMP(MW0==7) RST(C2)\nRUNG Infeed only while the box pusher is home\nNO(M0.0) NO(I0.3) COIL(Q0.0)\nRUNG Box pusher\nCMP(MW0==1) COIL(Q0.1)\nRUNG Row pusher\nCMP(MW0==3) COIL(Q0.2)\nRUNG Elevator down\nCMP(MW0==5) COIL(Q0.3)\nRUNG Pallet out\nCMP(MW0==6) COIL(Q0.4)\nRUNG Pallet full lamp\nCMP(MW0==6) | COIL(Q0.5)\nCMP(MW0==7)',
      tests: [
        { name: 'Builds a full pallet', steps: ['tap I0.0', 'waitfor Q0.4=1 90000', 'wait 2500', 'plant pallets=1 bad=0'] },
        { name: 'Rows of three', steps: ['tap I0.0', 'waitfor Q0.2=1 15000', 'expect C0.CV=3'] },
        { name: 'Lowers after two rows', steps: ['tap I0.0', 'order Q0.2+ Q0.2- Q0.2+ Q0.2- Q0.3+ 40000'] },
        { name: 'STOP stops the infeed', steps: ['tap I0.0', 'wait 500', 'tap I0.1', 'wait 2500', 'expect Q0.0=0 Q0.1=0'] },
      ],
    },
  ];

  // keep levels together (stable sort)
  LL.CHALLENGES.sort((a, b) => a.level - b.level);

  LL.CH_BY_ID = {};
  LL.CHALLENGES.forEach((c) => (LL.CH_BY_ID[c.id] = c));
})(typeof window !== 'undefined' ? window : globalThis);

/* Ladder Lab — how each machine works, and which reference program shows it running. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  LL.MACHINE_GUIDE = {
    panel: { how: ['A test bench for small logic: push buttons PB1–PB3 (wired NO), a STOP button wired NC (reads 1 until pressed), maintained switches SW1–SW4 and lamps L1–L8.', 'Nothing here can break, so use it to try any rung from the lessons.'], ex: 'toggle' },
    motor: { how: ['Two contactors feed the motor: K1 forward, K2 reverse (K2 swaps two phases). Both on at once is a short circuit, a fault.', 'The overload relay contact (I0.3) reads 1 while healthy. "Trip overload" opens it, like an overheated motor.', 'Usual program: two seal-in rungs with STOP and OL in series, each with an NC interlock contact of the other contactor.'], ex: 'interlock' },
    conveyor: { how: ['The belt moves while Q0.0 is on and takes 4 s end to end. Boxes drop into the bin at the end.', 'Photo-eye I0.2 is 1 while a box blocks the beam. Q0.2 runs a feeder that drops a box every 1.5 s, or press "Drop a box".', 'Usual program: start/stop latch plus a CTU counting the photo-eye.'], ex: 'count-boxes' },
    tank: { how: ['The fill pump raises the level 10 %/s. The drain valve and "Consumer demand" lower it.', 'Level switches: I0.2 = above 20 %, I0.3 = above 80 %. Running the pump at 100 % is an overflow fault.', 'Usual program: an auto latch, SET the pump below LOW and RESET it at HIGH (hysteresis).'], ex: 'tank' },
    traffic: { how: ['Car signal: Q0.0 red, Q0.1 yellow, Q0.2 green. Pedestrian: Q0.3 walk, Q0.4 don\'t walk. Cars stop at the line unless green.', 'Walk together with green or yellow is a fault.', 'Usual program: three chained TON timers, or a CASE with one timer in ST.'], ex: 'traffic', st: 'st-traffic' },
    cylinders: { how: ['Three spring-return pneumatic cylinders. Valve on = extend (1 s), valve off = retract.', 'Reed switches at both ends: A0 = A home, A1 = A out, and the same for B and C.', 'Usual program: a step sequence where every move waits for its end sensor. The circuit from your video is loaded as the example.'], video: true, st: 'st-case-abc' },
    garage: { how: ['Motor UP / DOWN move the door in 4 s. Limit switches I0.3 (open) and I0.4 (closed) tell where it is. Driving into an end is a stall fault.', 'Safety beam I0.5 is 1 when clear and 0 when something is in the doorway. Closing onto the obstacle is a fault.', 'Usual program: reversing-motor latches + limit switches + "reverse if the beam is blocked while closing".'], ex: 'garage' },
    parking: { how: ['"Car enters" / "Car leaves" pulse the entry / exit sensor for 0.3 s and move a car in or out.', 'Signs: Q0.0 FULL, Q0.1 SPACES.', 'Usual program: CTU on entry and CTD on exit with the same counter number.'], ex: 'parking' },
    stardelta: { how: ['KM main + KY star start the motor with about a third of the current; after a few seconds KY drops and KΔ pulls in for full power.', 'KY and KΔ together is a short circuit. Starting directly in delta trips the breaker. The ammeter shows the current.', 'Usual program: run latch, TON for the star time, interlocked star and delta rungs.'], ex: 'star-delta' },
    bottling: { how: ['Bottles move on the conveyor. I0.2 = bottle in place under the filler, I0.3 = that bottle is full.', 'Opening the valve without a bottle spills; moving while filling sprays; overfilling overflows.', 'Usual program: start filling on the RISING EDGE of "in place". The bottle is still there after filling.'], ex: 'bottling', st: 'st-bottling' },
    mixer: { how: ['Valves A and B fill the vessel, the mixer stirs, the heater adds 10 °C/s (only with liquid inside!), the drain empties it.', 'Sensors: level 40 %, level 80 %, not-empty, temperature ≥ 60 °C.', 'Each drained batch is graded: 50/50 recipe, mixed at least 4 s, heated to 60 °C.'], ex: 'mixer', st: 'st-mixer' },
    elevator: { how: ['The car moves half a floor per second. Floor sensors I0.3–I0.5 are on at each floor. The door opens in 1 s; I0.6 = door closed.', 'Moving with the door open, or past floor 1 or 3, is a fault.', 'Usual program: remembered calls, last floor in a word, "call above / below" decides the direction.'], ex: 'elevator', st: 'st-elevator' },
    sorter: { how: ['Boxes come in a tall/short pattern. The check station has a low eye (any box) and a high eye (tall boxes only).', 'Tall boxes must be pushed off at the pusher (0.5 s stroke). The conveyor must stand still while pushing.', 'Usual program: remember "tall" at the check station (tracking), push when that box reaches the pusher.'], ex: 'sorter' },
    carwash: { how: ['Drive the car in and out with the action buttons. The gantry travels 4 s each way with soap, brushes or rinse; then the dryer.', 'Water with no car, or driving out while washing, is a fault.', 'Every car leaving is graded for soap, brush and rinse coverage and drying time.'], ex: 'carwash' },
    pumps: { how: ['Wastewater flows in at 6 %/s (storm: 16 %/s). Each pump removes 10 %/s.', 'Level switches 20 / 70 / 85 %. "Pump OK" inputs drop to 0 when a pump trips. Overflow or a dry-running pump is a fault.', 'Usual program: demand latch 70 → 20 %, duty/standby toggle at the end of each cycle, standby helps above 85 %.'], ex: 'pump-station' },
    atank: { how: ['A 4–20 mA level transmitter reads on AIW0 (6400 = 0 %, 32000 = 100 %). A control valve opens 0–100 % from AQW0 (0–32000).', 'Water is drawn off all the time. The trend shows the level against the 50 % setpoint.', 'Usual program: scale to %, alarms with compares, then a P controller (error × gain, clamped).'], ex: 'level-control', st: 'st-average' },
    drill: { how: ['Clamp, spindle, feed slide (down 4 s, up 2 s) with top/bottom limits, and an ejector.', 'Drilling needs the spindle running AND the part clamped. Ejecting needs the clamp open and the drill up.', 'Usual program: a step sequence; STOP retracts the drill to a safe position.'], ex: 'drill-station' },
    oven: { how: ['The heater adds about 25 °C/s; the oven cools slowly, much faster with the door open. Thermostats switch at 170 and 180 °C.', 'Heater with the door open, or without the fan, is a fault.', 'Each tray is graded when the door opens: about 10 s at baking temperature, never above 205 °C.'], ex: 'oven' },
    washer: { how: ['Door lock, water valve (12 %/s), heater (needs water), drum left/right, drain pump (20 %/s) and fast spin.', 'Water or drum with the door unlocked, spinning with water, or unlocking while full are faults.', 'Each load is graded when the door opens: washed ≥ 8 s warm with the drum reversing, spun ≥ 3 s.'], ex: 'washer' },
    crane: { how: ['The bridge travels between stations A, B and C (sensors on the runway). The hoist lowers and raises the hook; a magnet grips the load.', 'Travelling with the hook down, releasing the magnet in mid-air, or hitting the end stops are faults.', 'Usual program: nine-step sequence; STOP pauses motion but the magnet keeps holding.'], ex: 'crane' },
    indexer: { how: ['A turntable with 3 pockets: LOAD → PRESS → EJECT. "In position" is on when the pockets line up with the stations.', 'Turning with the press down or the ejector out is a crash. Ejecting a part that was not pressed counts as bad.', 'Usual program: work the stations while in position, then index one pitch (rising edge of "in position").'], ex: 'indexer' },
    greenhouse: { how: ['Temperature on AIW0 (0–50 °C, 512 counts per °C). Heater, roof vent motor with open/closed limits, fan, drip irrigation.', '"Sunny day" heats the house, "Cold night" cools it. Soil dries over time; over-watering floods the beds.', 'Usual program (ST): scaling, heater 20/22 °C and vent 26/23 °C hysteresis, irrigation pulses, alarm.'], st: 'st-greenhouse' },
    gate: { how: ['The gate slides fully open in 5 s. Limits: I0.2 open, I0.3 closed. Photocell I0.4 = 0 when the gateway is blocked; safety edge I0.5 = 0 when the gate touches something.', 'Closing onto the car is a fault.', 'Usual program: one remote button that cycles open → stop → close → reverse, auto-close, safety reversal.'], ex: 'gate', st: 'st-gate' },
    compressor: { how: ['The load valve makes the compressor build pressure (+0.6 bar/s); unloaded it just idles. Air is used all the time.', 'Starting loaded stalls the motor; more than 3 starts per minute overheats it; 10.6 bar blows the safety valve.', 'Usual program: 6/8 bar hysteresis, unloaded start, 15 s run-on, fault latch.'], ex: 'compressor' },
    capline: { how: ['Bottles move one pitch at a time. When a bottle stands at the filler, the one ahead stands at the capper.', 'Moving while filling or with the capper down, and capping an empty bottle, are faults. Every bottle leaving must be full AND capped.', 'Usual program: dwell on arrival, both stations work in parallel, move on when both are done.'], ex: 'capline' },
    palletizer: { how: ['Infeed brings boxes; the box pusher forms rows of 3 on the table; the row pusher moves a row onto the pallet; the elevator lowers one layer per 2 rows.', 'Overfilled rows or layers and pushers hitting each other are faults. Full pallets (3 × 2 × 3) leave on the pallet conveyor.', 'Usual program: step sequence + three nested counters.'], ex: 'palletizer' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
