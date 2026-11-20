/* PLC Start — "Wire the I/O": mounted in lessons through [[hw:wiring]] (LL.HW.wiring).
 * The learner picks a PLC input card (sinking / sourcing) and a field device (push button, PNP, NPN,
 * 2-wire, 4-wire sensor), or an output card (relay, transistor PNP, transistor NPN, triac) and a load
 * (24 V lamp, 24 V valve coil, stepper pulses, 230 V lamp, 10 A heater), with options (bleeder resistor,
 * flyback diode, interposing contactor, where the load returns). "Power on" plays two phases
 * (signal ON, then signal OFF) and animates the current path. Results: works / LED on but the load does
 * not switch / no signal / stuck on / damage. A mission of 8 wiring tasks, each explained. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-wiring';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let uidN = 0;

  // ───────────── brands: addresses, terminal names, example modules ─────────────
  const BR = {
    siemens: { n: 'Siemens', i0: 'I0.0', i1: 'I0.1', q0: 'Q0.0', diC: () => '1M', pL: 'L+', pM: 'M', rC: '1L', tC: '1L',
      ex: { sinking: 'S7-1200 SM 1221 (1M to 0 V)', sourcing: 'S7-1200 SM 1221 (1M to +24 V)', relay: 'S7-1200 SM 1222 relay', pnp: 'S7-1200 SM 1222 24 V DC', npn: '', triac: '' },
      note: 'Siemens TIA: the address is %I0.0 / %Q0.0. Many S7-1200 inputs are sink or source: it depends on where you wire 1M (to 0 V = sinking, takes PNP). Siemens outputs are mostly sourcing (PNP).' },
    schneider: { n: 'Schneider', i0: '%I0.0', i1: '%I0.1', q0: '%Q0.0', diC: () => 'COM0', pL: 'V0+', pM: 'V0−', rC: 'C0', tC: 'C0',
      ex: {}, note: 'Schneider Machine Expert: the address is %I0.0 / %Q0.0 (M221). Many input cards are sink or source by COM wiring. Transistor output cards come as "source" or "sink" versions: read the name on the card.' },
    twincat: { n: 'TwinCAT', i0: 'Channel 1', i1: 'Channel 2', q0: 'Channel 1', diC: (k) => (k === 'sinking' ? '0 V' : '+24 V'), pL: '+24 V', pM: '0 V', rC: 'COM', tC: 'COM',
      ex: { sinking: 'EL1008, positive switching', sourcing: 'EL1088, ground switching', relay: 'EL2622', pnp: 'EL2008, positive switching', npn: 'EL2088, ground switching', triac: 'EL2712' },
      note: 'Beckhoff TwinCAT: say "positive switching" for PNP and "ground switching" for NPN. The 24 V and 0 V come through the power contacts of the terminal row. You link a variable (bSensor AT %I*) to the channel.' },
    omron: { n: 'Omron', i0: '0.00', i1: '0.01', q0: '100.00', diC: () => 'COM', pL: '+V', pM: '0V', rC: 'COM', tC: 'COM',
      ex: {}, note: 'Omron: transistor output units are NPN or PNP by type: order the right one. Many inputs (CP1, CJ) take both, by the way COM is wired; NX input units come as NPN or PNP. CP1 addresses: inputs 0.00, outputs 100.00 (Sysmac Studio: variables).' },
    rockwell: { n: 'Studio 5000', i0: 'Local:1:I.Data.0', i1: 'Local:1:I.Data.1', q0: 'Local:2:O.Data.0', diC: (k) => (k === 'sinking' ? 'GND' : 'DC+'), pL: '+DC', pM: 'RTN', rC: 'L1', tC: 'L1',
      ex: { sinking: '1756-IB16, sink input', sourcing: '1756-IV16, source input', relay: '1756-OW16I', pnp: '1756-OB16E, source output', npn: '1756-OV16E, sink output', triac: '1756-OA16, AC output' },
      note: 'Rockwell Studio 5000: the catalogue name says it: "sink input" (takes PNP), "source output" (PNP). The address is the slot: Local:1:I.Data.0.' },
    codesys: { n: 'CODESYS', i0: '%IX0.0', i1: '%IX0.1', q0: '%QX0.0', diC: () => 'COM', pL: '24V', pM: '0V', rC: 'COM', tC: 'COM',
      ex: {}, note: 'CODESYS runs on hardware from many makers (WAGO, Festo, Eaton, …). The card type comes from the hardware maker, not from CODESYS. The address is %IX0.0 / %QX0.0.' },
  };
  const BORDER = ['siemens', 'schneider', 'twincat', 'omron', 'rockwell', 'codesys'];

  // ───────────── catalog ─────────────
  const INC = {
    sinking: { t: 'Sinking input', s: 'takes PNP · common to 0 V' },
    sourcing: { t: 'Sourcing input', s: 'takes NPN · common to +24 V' },
  };
  const DEV = {
    pb: { t: 'Push button', s: 'a plain contact · 2 wires' },
    pnp: { t: 'PNP sensor', s: '3 wires · switches +24 V' },
    npn: { t: 'NPN sensor', s: '3 wires · switches 0 V' },
    w2: { t: '2-wire sensor', s: 'in series with the input' },
    w4: { t: '4-wire PNP sensor', s: 'NO + NC outputs' },
  };
  const OUTC = {
    relay: { t: 'Relay', s: 'AC or DC · 2 A · slow, wears', max: 2 },
    pnp: { t: 'Transistor PNP', s: 'sourcing · 24 V DC · 0.5 A', max: 0.5 },
    npn: { t: 'Transistor NPN', s: 'sinking · 24 V DC · 0.5 A', max: 0.5 },
    triac: { t: 'Triac', s: 'AC only · 0.5 A · no wear', max: 0.5 },
  };
  const LOAD = {
    lamp24: { t: '24 V DC lamp', s: 'LED pilot lamp · 0.04 A', ac: false, a: 0.04 },
    valve: { t: '24 V DC valve', s: 'solenoid coil · 0.3 A', ac: false, a: 0.3, ind: true },
    pulse: { t: 'Stepper drive', s: 'pulse input · 5 kHz', ac: false, a: 0.01, fast: true },
    lamp230: { t: '230 V AC lamp', s: 'LED pilot lamp · 0.02 A', ac: true, a: 0.02 },
    heater: { t: '230 V AC heater', s: '2.3 kW · 10 A', ac: true, a: 10 },
  };
  const isTr = (k) => k === 'pnp' || k === 'npn';

  // ───────────── the mission ─────────────
  const TASKS = [
    { id: 'pnp', mode: 'in', t: 'A PNP sensor the PLC can see', d: 'Wire a PNP sensor so the input turns on.',
      set: { dev: 'pnp', inCard: 'sinking' }, ok: (c) => c.mode === 'in' && c.dev === 'pnp',
      why: 'PNP gives +24 V (it sources current). A sinking card takes the current and sends it to 0 V. One gives, one takes.' },
    { id: 'npn', mode: 'in', t: 'An NPN sensor the PLC can see', d: 'An NPN sensor on a sinking card gives no signal. Fix it.',
      set: { dev: 'npn', inCard: 'sinking' }, ok: (c) => c.mode === 'in' && c.dev === 'npn',
      why: 'NPN switches 0 V. A sinking card has 0 V on its common too: no voltage, no current. A sourcing card (common to +24 V) works.' },
    { id: 'w2', mode: 'in', t: 'A 2-wire sensor that really turns OFF', d: 'With no target, the input must be 0.',
      set: { dev: 'w2', inCard: 'sinking', bleed: false }, ok: (c) => c.mode === 'in' && c.dev === 'w2',
      why: 'A 2-wire sensor leaks about 1.5 mA when off. A bleeder resistor takes this current around the input.' },
    { id: 'sink', mode: 'out', t: 'A lamp on a sinking (NPN) output', d: 'The LED on the card is on, but the lamp stays dark. Fix the wiring.',
      set: { outCard: 'npn', load: 'lamp24', ret: '0v', diode: false, ipr: false }, ok: (c) => c.mode === 'out' && c.outCard === 'npn' && c.load === 'lamp24',
      why: 'An NPN output switches 0 V. The other end of the lamp must go to +24 V. Then the current flows through the lamp into the output.' },
    { id: 'valve', mode: 'out', t: 'A valve coil on a transistor', d: 'Switch a 24 V valve with a transistor output, and keep the card alive.',
      set: { outCard: 'pnp', load: 'valve', ret: '0v', diode: false, ipr: false }, ok: (c) => c.mode === 'out' && isTr(c.outCard) && c.load === 'valve',
      why: 'A coil makes a high voltage spike when it is switched off. The flyback diode gives the current a safe way round.' },
    { id: 'ac', mode: 'out', t: 'A 230 V AC lamp', d: 'A transistor output only switches DC. Choose a card for AC.',
      set: { outCard: 'pnp', load: 'lamp230', diode: false, ipr: false }, ok: (c) => c.mode === 'out' && c.load === 'lamp230',
      why: 'Relay and triac outputs switch AC. A transistor output is for 24 V DC only.' },
    { id: 'heat', mode: 'out', t: 'A 10 A heater', d: 'The card gives 2 A at most. Switch 10 A safely.',
      set: { outCard: 'relay', load: 'heater', diode: false, ipr: false }, ok: (c) => c.mode === 'out' && c.load === 'heater',
      why: 'The PLC switches only the coil of an interposing contactor (0.1 A). The contactor switches the 10 A.' },
    { id: 'fast', mode: 'out', t: '5000 pulses per second', d: 'A stepper drive needs fast pulses. Pick the right output.',
      set: { outCard: 'relay', load: 'pulse', ret: '0v', diode: false, ipr: false }, ok: (c) => c.mode === 'out' && c.load === 'pulse',
      why: 'A relay needs about 10 ms to move. A transistor switches in microseconds and never wears out.' },
  ];

  // ───────────── geometry and current paths (SVG user units) ─────────────
  const YT = 38, YB = 262;
  const PIN = {
    sink: (y) => 'M50 112 V' + YT + ' H210 V112 M280 ' + y + ' H560 V' + YB + ' H50 V188',
    src: (y) => 'M50 112 V' + YT + ' H560 V' + y + ' H280 M210 188 V' + YB + ' H50 V188',
    sinkBleed: 'M50 112 V' + YT + ' H210 V112 M280 140 H380 V' + YB + ' H50 V188',
    srcBleed: 'M50 112 V' + YT + ' H380 V140 H280 M210 188 V' + YB + ' H50 V188',
  };
  const POUT = {
    top: 'M50 112 V' + YT + ' H262 V150 H430 M520 150 H590 V' + YB + ' H50 V188',
    bot: 'M50 112 V' + YT + ' H590 V150 H520 M430 150 H262 V' + YB + ' H50 V188',
    short: 'M50 112 V' + YT + ' H262 V150 H400 V100 H550 V150 H590 V' + YB + ' H50 V188',
    freeTop: 'M520 150 H550 V100 H400 V150 H430',
    freeBot: 'M430 150 H400 V100 H550 V150 H520',
    load: 'M690 84 V236',
  };

  // ───────────── the physics (simple rules, explained) ─────────────
  function evalIn(c) {
    const B = BR[c.brand], sink = c.inCard === 'sinking', d = c.dev, com = B.diC(c.inCard);
    const i0 = B.i0, i1 = B.i1, main = sink ? PIN.sink(140) : PIN.src(140);
    const ph = (o) => Object.assign({ flow: null, cls: 'ok', sens: false, led: [0, 0], bit: [0, 0], tags: [], target: false }, o);
    const pnpLike = d === 'pnp' || d === 'w4';
    const lbl = d === 'pb' ? ['Button pressed', 'Button released'] : ['Target in front', 'No target'];
    let r;
    if ((d === 'pnp' || d === 'w4' || d === 'npn') && pnpLike !== sink) {
      const v = d === 'npn' ? '0 V' : '+24 V';
      r = { kind: 'nosignal', badge: 'No signal',
        why: d === 'npn'
          ? `No signal. The sensor LED is on, but the input LED stays off. The NPN sensor switches 0 V to the input, and the common ${com} of this sinking card is also at 0 V. 0 V on both sides of the input: no voltage, so no current. Fix: a sourcing card (common to +24 V), or a PNP sensor.`
          : `No signal. The sensor LED is on, but the input LED stays off. The ${d === 'w4' ? '4-wire PNP' : 'PNP'} sensor switches +24 V to the input, and the common ${com} of this sourcing card is also at +24 V. Same voltage on both sides: no current. Fix: a sinking card (common to 0 V), or an NPN sensor.`,
        on: ph({ sens: true, target: true, tags: [{ x: 352, y: 126, t: v }, { x: 522, y: sink ? 247 : 62, t: v }] }), off: ph({}) };
    } else if (d === 'w4') {
      r = { kind: 'works', badge: 'Works',
        why: `Works. The black wire (NO output) goes to ${i0}, the white wire (NC output) to ${i1}. They are always opposite. If both are 0 or both are 1, a wire is broken or the sensor is faulty: the program can check this. That is why some machines use 4-wire sensors.`,
        on: ph({ flow: PIN.sink(140), sens: true, target: true, led: [1, 0], bit: [1, 0] }),
        off: ph({ flow: PIN.sink(175), led: [0, 1], bit: [0, 1] }) };
    } else if (d === 'w2' && !c.bleed) {
      r = { kind: 'stuck', badge: 'Input stays ON',
        why: `With no target, the 2-wire sensor still needs a little current for its own electronics: about 1.5 mA. It can only get it through the input, so this "leakage" current flows through ${i0}. This card is only sure it is OFF below 0.5 mA, so the input stays on or flickers. Fix: add a bleeder resistor parallel to the input. Or use a 3-wire sensor, or a card made for 2-wire sensors.`,
        on: ph({ flow: main, sens: true, target: true, led: [1, 0], bit: [1, 0] }),
        off: ph({ flow: main, cls: 'leak', led: [1, 0], bit: [1, 0], tags: [{ x: 352, y: 126, t: '1.5 mA' }] }) };
    } else if (d === 'w2') {
      r = { kind: 'works', badge: 'Works',
        why: `Works. With no target, the 1.5 mA leakage now flows through the bleeder resistor (for example 4.7 kΩ, 0.5 W), not through the input. The input sees almost no voltage and reads 0. With a target, the sensor passes the full current and ${i0} turns on.`,
        on: ph({ flow: main, sens: true, target: true, led: [1, 0], bit: [1, 0] }),
        off: ph({ flow: sink ? PIN.sinkBleed : PIN.srcBleed, cls: 'leak', tags: [{ x: 352, y: 126, t: '1.5 mA' }] }) };
    } else {
      let why;
      if (d === 'pb') why = sink
        ? `Works. A push button is only a contact: it does not care about the direction of the current. On a sinking card, wire it to +24 V. Pressed: +24 V → button → ${i0} → card → ${com} → 0 V.`
        : `Works. A push button is only a contact. On a sourcing card the common ${com} is at +24 V, so wire the button to 0 V. Pressed: +24 V → ${com} → card → ${i0} → button → 0 V.`;
      else if (d === 'pnp') why = `Works. The PNP sensor switches +24 V to ${i0}. The current flows from +24 V through the sensor, into the input, through the card to ${com} and back to 0 V. The sensor gives current (sources), the sinking card takes it (sinks). One gives, one takes: that is the rule.`;
      else why = `Works. The current flows from +24 V into the common ${com}, through the card, out of ${i0}, into the NPN sensor and down to 0 V. The card gives current (sources), the NPN sensor takes it (sinks).`;
      r = { kind: 'works', badge: 'Works', why, on: ph({ flow: main, sens: true, target: true, led: [1, 0], bit: [1, 0] }), off: ph({}) };
    }
    const bits = (p) => (d === 'w4' ? `${i0} = ${p.bit[0]}, ${i1} = ${p.bit[1]}` : `${i0} = ${p.bit[0]}`);
    const leds = (p) => (d === 'w4' ? (p.led[0] ? '0 on' : '0 off') + ' · ' + (p.led[1] ? '1 on' : '1 off') : p.led[0] ? 'on' : 'off');
    const sensTxt = (p) => (d === 'pb' ? (p.target ? 'closed' : 'open') : p.sens ? 'on' : 'off');
    const okRow = (p, want) => (d === 'w4' ? p.bit[0] === want && p.bit[1] === 1 - want : p.bit[0] === want);
    r.head = [d === 'pb' ? 'Button' : 'Sensor LED', 'Input LED', 'PLC sees'];
    r.rows = [[lbl[0], sensTxt(r.on), leds(r.on), bits(r.on), okRow(r.on, 1)], [lbl[1], sensTxt(r.off), leds(r.off), bits(r.off), okRow(r.off, 0)]];
    return r;
  }

  function evalOut(c) {
    const B = BR[c.brand], C = OUTC[c.outCard], L = LOAD[c.load], tr = isTr(c.outCard), q0 = B.q0;
    const T = c.ipr ? { t: 'K1 coil', ac: c.outCard === 'triac', a: 0.1, ind: true, sup: true } : L;
    const topCom = c.outCard !== 'npn';
    const wrongRet = tr && (c.outCard === 'pnp' ? c.ret === '24v' : c.ret === '0v');
    const main = topCom ? POUT.top : POUT.bot;
    const com = c.outCard === 'relay' ? B.rC : c.outCard === 'triac' ? B.tC : c.outCard === 'pnp' ? B.pL : B.pM;
    const ph = (o) => Object.assign({ flow: null, cls: 'ok', led: false, load: 'off', spike: false, dmg: null, k1: false, free: null, tags: [] }, o);
    const what = c.ipr ? 'the contactor coil K1' : 'the ' + L.t.replace(/^\d.*? (lamp|valve|heater)$/, '$1').toLowerCase();
    let r;
    if (tr && T.ac) {
      r = { kind: 'damage', badge: 'Damage!',
        why: `Damage! A transistor output is made for 24 V DC only. 230 V AC is about 10 times more voltage, and AC changes direction 100 times per second. The transistor breaks down at once. Use a relay or a triac output for AC loads.`,
        on: ph({ flow: main, cls: 'bad', led: true, dmg: { at: 'card', t: 'transistor destroyed' } }), off: ph({ dmg: { at: 'card', t: 'transistor destroyed' } }) };
    } else if (c.diode && T.ac) {
      r = { kind: 'damage', badge: 'Fuse blown!',
        why: `Fuse blown! A diode lets current pass one way only. On AC it is a short circuit for every second half-wave: nothing limits the current. Fuse F2 blows at once. Flyback diodes are for DC coils only. On AC coils use an RC snubber or a varistor.`,
        on: ph({ flow: POUT.short, cls: 'bad', led: true, dmg: { at: 'fuse', t: 'F2 blown' } }), off: ph({ dmg: { at: 'fuse', t: 'F2 blown' } }) };
    } else if (c.outCard === 'triac' && !T.ac) {
      r = { kind: 'stuck', badge: 'Load never turns OFF',
        why: `The load turns on, but it never turns off, even with ${q0} = 0. A triac only stops when its current passes zero. AC passes zero 100 times per second; DC never does. Use a transistor or a relay output for DC loads.`,
        on: ph({ flow: main, led: true, load: 'on' }), off: ph({ flow: main, load: 'on' }) };
    } else if (T.a > C.max) {
      const t = c.outCard === 'relay' ? 'contact welded' : 'triac destroyed';
      r = { kind: 'damage', badge: 'Damage!',
        why: `Damage! The heater takes 10 A, but this output is made for ${C.max} A. ${c.outCard === 'relay' ? 'The relay contact gets very hot and welds shut: now the heater cannot be switched off!' : 'The triac overheats and fails.'} Use an interposing contactor: the PLC switches only its coil (about 0.1 A), and the contactor switches the 10 A from its own fused supply.`,
        on: ph({ flow: main, cls: 'bad', led: true, load: c.outCard === 'relay' ? 'on' : 'off', dmg: { at: 'card', t } }),
        off: ph(c.outCard === 'relay' ? { flow: main, cls: 'bad', load: 'on', dmg: { at: 'card', t } } : { dmg: { at: 'card', t } }) };
    } else if (wrongRet) {
      const v = c.outCard === 'pnp' ? '+24 V' : '0 V';
      r = { kind: 'led', badge: 'LED on, load does not switch',
        why: `The LED on the card is on: the program and the card are fine. But ${what} has ${v} on both ends. No voltage across it, so no current. ${c.outCard === 'pnp' ? 'A sourcing (PNP) output gives +24 V: the other end of the load must go to 0 V.' : 'A sinking (NPN) output switches 0 V: the other end of the load must go to +24 V.'}`,
        on: ph({ led: true, tags: [{ x: 380, y: 140, t: v }, { x: 560, y: 140, t: v }] }), off: ph({}) };
    } else if (tr && T.ind && !T.sup && !c.diode) {
      r = { kind: 'damage', badge: 'Damage at switch-off!',
        why: `Switching on worked. But a coil stores energy in its magnetic field. When the transistor switches off, the coil pushes the current on and makes a voltage spike of hundreds of volts. The transistor breaks (at once, or after many switchings). Many cards have a small internal clamp, but the safe rule is: put a flyback diode across every DC coil.`,
        on: ph({ flow: main, led: true, load: 'on' }), off: ph({ spike: true, dmg: { at: 'card', t: 'transistor destroyed' } }) };
    } else if (L.fast && (c.ipr || c.outCard === 'relay')) {
      r = { kind: 'led', badge: 'LED flickers, no pulses',
        why: `The program sends 5000 pulses per second and the LED flickers. But a ${c.ipr ? 'contactor' : 'relay'} needs about 10 ms to move: it cannot follow, so the drive gets no clean pulses and the motor does not turn. The contacts would also wear out in minutes. Fast signals need a transistor output (often a special high-speed output).`,
        on: ph({ led: 'blink', load: 'off' }), off: ph({}) };
    } else {
      const free = T.ind && c.diode ? (topCom ? POUT.freeTop : POUT.freeBot) : null;
      const arc = c.outCard === 'relay' && T.ind && !T.sup && !c.diode;
      const glow = c.outCard === 'triac' && !c.ipr && c.load === 'lamp230';
      let why;
      if (c.ipr) why = `Works. ${q0} switches only the coil of the interposing contactor K1 (about 0.1 A, with a built-in suppressor). The K1 contact switches the ${L.t} from its own supply and its own fuse F3.${L.a > C.max ? ' The 230 V and the 10 A stay out of the PLC card.' : ' Here it is not needed, but it is also used to separate voltages (for example 24 V PLC, 230 V load).'}`;
      else if (arc) why = `Works, with a note: at every switch-off the coil makes a spike, and a small spark (arc) jumps on the relay contact. The contact wears much faster. Add a flyback diode (DC coil) or an RC snubber (AC coil).`;
      else if (glow) why = `Works, with a note: a triac has no moving parts, so it lasts very long and is good for frequent AC switching. But it leaks about 1–2 mA when it is off. A small LED lamp can glow a little when it should be off. A bigger load does not notice.`;
      else if (c.outCard === 'relay') why = `Works. The relay contact is a simple switch: it does not care about AC or DC or the direction of the current. It is good for mixed loads up to 2 A. But it is slow (about 10 ms) and wears out (about 100 000 switchings at full load).`;
      else if (c.outCard === 'triac') why = `Works. The triac switches AC. It turns off at the next zero crossing of the current.`;
      else if (c.outCard === 'pnp') why = `Works. The PNP (sourcing) output switches +24 V. The current flows from ${com} through the transistor, out of ${q0}, through the load and back to 0 V.`;
      else why = `Works. The NPN (sinking) output switches 0 V. The current flows from +24 V through the load, into ${q0}, through the transistor to ${com} (0 V).`;
      if (!c.ipr && !arc && !glow && free) why += ' The flyback diode catches the switch-off spike: the coil current circles through the diode and dies away. The valve now releases a few milliseconds later. That is normal.';
      else if (!c.ipr && c.diode && !T.ind) why += ' The diode is not needed for this load, but it does no harm on DC.';
      if (!c.ipr && L.fast && tr) why += ' A transistor switches in microseconds and never wears out: right for pulses.';
      r = { kind: arc || glow ? 'warn' : 'works', badge: arc || glow ? 'Works, with a note' : 'Works', why,
        on: ph({ flow: main, led: true, load: c.ipr ? 'off' : 'on', k1: !!c.ipr }),
        off: ph({ free, load: glow ? 'glow' : 'off', flow: glow ? main : null, cls: 'leak', spike: arc }) };
      if (c.ipr) r.on.load = 'on';
    }
    const lt = (p) => (p.dmg && p.load !== 'on' ? 'broken' : p.load === 'on' ? (L.fast && !c.ipr ? 'pulses' : 'ON') : p.load === 'glow' ? 'glows' : L.fast ? 'no pulses' : 'off');
    const ledT = (p) => (p.led === 'blink' ? 'flickers' : p.led ? 'on' : 'off');
    r.head = ['Card LED', c.ipr ? L.t : 'Load'];
    r.rows = [[q0 + ' = 1', ledT(r.on), lt(r.on), r.on.load === 'on' && !r.on.dmg], [q0 + ' = 0', ledT(r.off), lt(r.off), r.off.load === 'off' && !r.off.dmg]];
    return r;
  }

  // ───────────── CSS ─────────────
  const CSS = `
.hw-wiring{--hww-case:transparent;--hww-bn:#8a5a2b;--hww-bu:#2563c9;--hww-wh:#aab4bc;--hww-lamp:#ffd23f;--hww-heat:#ff7a1a}
:root[data-theme="dark"] .hw-wiring{--hww-case:#8b9ba7;--hww-bn:#c98d52;--hww-bu:#5b97f0;--hww-wh:#d6dde2}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hw-wiring{--hww-case:#8b9ba7;--hww-bn:#c98d52;--hww-bu:#5b97f0;--hww-wh:#d6dde2}}
.hw-box.hw-wiring{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:14px;margin:18px 0;color:var(--ink);font-size:var(--t-16);line-height:1.45;min-width:0}
.hw-wiring *{box-sizing:border-box}
.hw-wiring p,.hw-wiring li{max-width:none}
.hww-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px}
.hww-title{margin:0;font-family:var(--f-body);font-weight:700;font-size:var(--t-20);line-height:1.15;letter-spacing:.01em}
.hww-brands{display:flex;flex-wrap:wrap;gap:4px}
.hww-brands button{min-height:32px;padding:3px 10px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface-2);color:var(--ink-2);font:600 var(--t-13) var(--f-body);cursor:pointer;white-space:nowrap}
.hww-brands button:hover{border-color:var(--ink-2)}
.hww-brands button[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.hww-intro{margin:8px 0 0;color:var(--ink-2);font-size:var(--t-14)}
.hww-tabs{display:flex;margin-top:12px;border:1px solid var(--line);border-radius:var(--r-ctl);overflow:hidden;background:var(--surface-2)}
.hww-tabs button{flex:1 1 0;min-height:42px;padding:6px 10px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--ink-2);font:700 var(--t-16) var(--f-body);cursor:pointer}
.hww-tabs button:first-child{border-left:0}
.hww-tabs button small{display:block;font-weight:500;font-size:var(--t-12);color:var(--muted)}
.hww-tabs button[aria-selected="true"]{background:var(--ink);color:var(--surface)}
.hww-tabs button[aria-selected="true"] small{color:inherit;opacity:.8}
.hww-pick{margin-top:12px;display:grid;gap:10px}
.hww-grp{min-width:0}
.hww-k{display:block;margin:0 0 5px;font-size:var(--t-12);font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
.hww-opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:6px}
.hww-opt{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;min-height:46px;padding:5px 10px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface);color:var(--ink);cursor:pointer;text-align:left;font:inherit}
.hww-opt:hover{background:var(--surface-2);border-color:var(--ink-2)}
.hww-opt b{font-size:var(--t-14);line-height:1.2}
.hww-opt small{font-size:var(--t-12);color:var(--muted);line-height:1.25}
.hww-opt[aria-pressed="true"]{border:2px solid var(--info);padding:4px 9px;background:color-mix(in srgb,var(--info) 9%,var(--surface))}
.hww-ex{margin:4px 0 0;font-size:var(--t-13);color:var(--muted)}
.hww-row{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:flex-start}
.hww-tg{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:4px 12px 4px 8px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface);color:var(--ink);font:600 var(--t-14) var(--f-body);cursor:pointer;text-align:left}
.hww-tg:hover{border-color:var(--ink-2)}
.hww-tg i{flex:none;width:20px;height:20px;border-radius:var(--r-tag);border:2px solid var(--muted);display:grid;place-items:center;font-style:normal;font-size:var(--t-13);line-height:1}
.hww-tg[aria-pressed="true"] i{background:var(--info);border-color:var(--info);color:var(--on-info)}
.hww-tg[aria-pressed="true"]{border-color:var(--info)}
.hww-tg small{display:block;font-weight:500;font-size:var(--t-12);color:var(--muted)}
.hww-seg{display:inline-flex;border:1px solid var(--line);border-radius:var(--r-ctl);overflow:hidden;background:var(--surface-2)}
.hww-seg button{min-height:38px;padding:4px 12px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--ink-2);font:600 var(--t-14) var(--f-body);cursor:pointer;white-space:nowrap}
.hww-seg button:first-child{border-left:0}
.hww-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hww-seg button:disabled{opacity:.45;cursor:default}
.hww-stage{margin-top:14px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface-2);overflow:hidden}
.hww-draw{overflow-x:auto;scrollbar-width:thin;padding:6px 6px 0}
.hww-draw svg{display:block;width:100%;height:auto;min-width:560px;margin:0 auto;max-width:760px}
.hww-narrow .hww-draw svg{min-width:470px}
.hww-narrow .hww-svg text{font-size:var(--t-13)}
.hww-narrow .hww-svg .ts{font-size:var(--t-12)}
.hww-narrow .hww-svg .tm{font-size:var(--t-12)}
.hww-tbl td.m{white-space:nowrap}
.hww-swipe{display:none;margin:2px 10px 0;font-size:var(--t-12);color:var(--muted)}
.hww-narrow .hww-swipe{display:block}
.hww-run{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;border-top:1px solid var(--line);background:var(--surface)}
.hww-run .btn.go{min-width:132px;font-weight:700}
.hww-run .btn.go[aria-pressed="true"]{background:var(--surface-3);border-color:var(--line);color:var(--ink)}
.hww-step{font-size:var(--t-14);color:var(--ink-2)}
.hww-res{padding:10px 12px 12px;border-top:1px solid var(--line);background:var(--surface)}
.hww-res.idle{color:var(--muted);font-size:var(--t-14)}
.hww-verd{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border-radius:var(--r-ctl);font-weight:700;font-size:var(--t-14);background:var(--surface-3)}
.hww-verd.works{background:var(--power-soft);color:var(--power)}
.hww-verd.warn,.hww-verd.led,.hww-verd.nosignal,.hww-verd.stuck{background:color-mix(in srgb,var(--accent-bg) 22%,transparent);color:var(--accent)}
.hww-verd.damage{background:var(--danger-soft);color:var(--danger)}
.hww-tbl{margin-top:8px;overflow-x:auto}
.hww-tbl table{border-collapse:collapse;width:100%;font-size:var(--t-13);min-width:0}
.hww-tbl th,.hww-tbl td{padding:4px 8px;border-bottom:1px solid var(--line-2);text-align:left;vertical-align:top}
.hww-tbl th{font-size:var(--t-12);letter-spacing:.04em;text-transform:uppercase;color:var(--muted);font-weight:700}
.hww-tbl td.m{font-family:var(--f-mono);font-weight:600;overflow-wrap:anywhere}
.hww-tbl td.y{color:var(--power);font-weight:700}
.hww-tbl td.n{color:var(--danger);font-weight:700}
.hww-rule{margin:10px 0 0;padding:8px 10px;border-radius:var(--r-ctl);background:var(--surface-2);border-left:4px solid var(--info);font-size:var(--t-14);color:var(--ink-2)}
.hww-sec{margin-top:18px}
.hww-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;margin:0 0 8px}
.hww-h b{font-family:var(--f-body);font-size:var(--t-16);letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2)}
.hw-wiring .hww-cl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px 10px}
.hww-cl li{margin:0;display:flex;gap:8px;align-items:flex-start;padding:8px 9px;border-radius:var(--r-ctl);background:var(--surface-2);font-size:var(--t-14);line-height:1.3}
.hww-cl li.cur{box-shadow:inset 0 0 0 2px var(--info)}
.hww-cl li > i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:var(--t-13)}
.hww-cl li.ok > i{background:var(--power-soft);color:var(--power)}
.hww-cl li.no > i{background:var(--surface-3);color:var(--muted)}
.hww-cl li > span{flex:1;min-width:0}
.hww-cl small{display:block;color:var(--muted);font-size:var(--t-13);margin-top:2px}
.hww-cl li.ok small{color:var(--ink-2)}
.hww-cl .btn{flex:none;align-self:center}
.hww-win{margin:10px 0 0;padding:10px 12px;border-radius:var(--r-ctl);background:var(--power-soft);border:1px solid var(--power);font-weight:600}
.hww-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hww-cap{position:sticky;bottom:10px;z-index:6;margin-top:16px;padding:9px 12px;border-radius:var(--r-ctl);border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hww-cap.ok{border-left-color:var(--power)}
.hww-cap.warn{border-left-color:var(--accent-bg)}
.hww-cap.bad{border-left-color:var(--danger)}
.hww-caph{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:1px}
.hww-cap p{margin:0;font-size:var(--t-14)}
.hww-more{display:none;align-items:center;min-height:32px;margin:-9px -8px -7px 0;padding:0 10px;border:0;border-radius:var(--r-ctl);background:transparent;color:var(--ink);font:700 var(--t-13) var(--f-body);cursor:pointer}
.hww-more:hover{background:var(--surface-2)}
.hww-narrow .hww-cap{padding:7px 10px}
.hww-narrow .hww-cap.long .hww-more{display:inline-flex}
.hww-narrow .hww-cap:not(.open) p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.hww-cap.flash{animation:hww-flash .7s ease-out}
@keyframes hww-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hww-cap{bottom:calc(var(--tabbar-h) + 8px + env(safe-area-inset-bottom,0px))}}
.hww-narrow .hww-title{font-size:var(--t-20)}
.hww-narrow .hww-opts{grid-template-columns:1fr 1fr}
.hww-narrow .hww-tabs button{font-size:var(--t-14)}
.hww-narrow .hw-wiring .hww-cl,.hww-narrow .hww-cl{grid-template-columns:1fr}
/* drawing */
.hww-svg text{font-family:var(--f-body);font-size:var(--t-12);fill:var(--ink)}
.hww-svg .tb{font-weight:700;font-size:var(--t-13)}
.hww-svg .ts{font-size:var(--t-11);fill:var(--muted)}
.hww-svg .tm{font-family:var(--f-mono);font-size:var(--t-11);font-weight:600}
.hww-svg .tw{font-family:var(--f-mono);font-size:var(--t-11);font-weight:700;fill:var(--muted)}
.hww-svg .rail{stroke:var(--wire);stroke-width:3;fill:none}
.hww-svg .w{stroke:var(--wire);stroke-width:2.5;fill:none;stroke-linejoin:round}
.hww-svg .bn{stroke:var(--hww-bn)}.hww-svg .bu{stroke:var(--hww-bu)}.hww-svg .bk{stroke:#14191d}.hww-svg .wh{stroke:var(--hww-wh)}
.hww-svg .case{fill:none;stroke:var(--hww-case);stroke-width:5.5}
.hww-svg .in{stroke:var(--muted);stroke-width:1.6;fill:none}
.hww-svg .box{fill:var(--surface);stroke:var(--ink-2);stroke-width:1.6}
.hww-svg .card{fill:var(--surface);stroke:var(--ink-2);stroke-width:2}
.hww-svg .cardh{fill:var(--surface-3)}
.hww-svg .psu{fill:var(--surface-3);stroke:var(--ink-2);stroke-width:1.6}
.hww-svg .term{fill:var(--surface);stroke:var(--ink-2);stroke-width:2}
.hww-svg .dot{fill:var(--wire)}
.hww-svg .led{fill:var(--surface-3);stroke:var(--muted);stroke-width:1.4}
.hww-svg .led.on{fill:var(--power-bright);stroke:var(--power);filter:drop-shadow(0 0 4px var(--power-bright))}
.hww-svg .led.amb{fill:var(--accent-bg);stroke:var(--accent);filter:drop-shadow(0 0 4px var(--accent-bg))}
.hww-svg .led.blink{animation:hww-blink .18s steps(2) infinite}
.hww-svg .sled{fill:var(--surface-3);stroke:var(--muted);stroke-width:1.2}
.hww-svg .sled.on{fill:var(--hww-lamp);stroke:var(--accent);filter:drop-shadow(0 0 4px var(--hww-lamp))}
.hww-svg .sym{fill:none;stroke:var(--ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.hww-svg .symf{fill:var(--ink)}
.hww-svg .lamp{fill:var(--surface);stroke:var(--ink);stroke-width:1.8}
.hww-svg .lamp.on{fill:var(--hww-lamp);filter:drop-shadow(0 0 8px var(--hww-lamp))}
.hww-svg .lamp.glow{fill:color-mix(in srgb,var(--hww-lamp) 35%,var(--surface));filter:drop-shadow(0 0 3px var(--hww-lamp))}
.hww-svg .heat.on{fill:color-mix(in srgb,var(--hww-heat) 40%,var(--surface));stroke:var(--hww-heat)}
.hww-svg .coil.on{fill:color-mix(in srgb,var(--info) 22%,var(--surface))}
.hww-svg .tgt{fill:var(--p-metal);stroke:var(--p-metal-dark);stroke-width:1.5}
.hww-svg .flow{fill:none;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:7 9;animation:hww-run .6s linear infinite}
.hww-svg .flow.ok{stroke:var(--power-bright)}
.hww-svg .flow.leak{stroke:var(--accent-bg);stroke-width:3;stroke-dasharray:3 9;animation-duration:1.4s}
.hww-svg .flow.bad{stroke:var(--danger);stroke-width:5.5}
.hww-svg .tag rect{fill:var(--surface);stroke:var(--accent);stroke-width:1.4}
.hww-svg .tag text{font-family:var(--f-mono);font-size:var(--t-11);font-weight:700;fill:var(--accent)}
.hww-svg .dmg polygon{fill:var(--danger);stroke:var(--surface);stroke-width:1.5}
.hww-svg .dmg rect{fill:var(--danger)}
.hww-svg .dmg text{fill:#fff;font-weight:700;font-size:var(--t-11)}
.hww-svg .spk{fill:none;stroke:var(--danger);stroke-width:3;stroke-linejoin:round}
.hww-svg .spk.arc{stroke:var(--accent-bg)}
.hww-svg .fz{fill:var(--surface);stroke:var(--ink-2);stroke-width:1.6}
.hww-svg .off{opacity:.55}
.hww-svg .zone{fill:none;stroke:var(--line);stroke-width:1.5;stroke-dasharray:5 4}
@keyframes hww-run{to{stroke-dashoffset:-32}}
@keyframes hww-blink{to{opacity:.25}}
@media (prefers-reduced-motion:reduce){.hww-svg .flow{animation:none;stroke-dasharray:none}.hww-svg .flow.leak{stroke-dasharray:3 5}.hww-svg .led.blink{animation:none}.hww-cap.flash{animation:none}}
`;
  function injectCSS() {
    if (document.getElementById('hw-wiring-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-wiring-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ───────────── SVG helpers ─────────────
  const P = (d, cls) => `<path d="${d}" class="${cls}"/>`;
  const T = (x, y, t, cls, a) => `<text x="${x}" y="${y}"${cls ? ` class="${cls}"` : ''}${a ? ` text-anchor="${a}"` : ''}>${esc(t)}</text>`;
  const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="3.6" class="dot"/>`;
  const TERM = (x, y) => `<circle cx="${x}" cy="${y}" r="5" class="term"/>`;
  const tag = (x, y, t) => { const w = t.length * 6.6 + 10; return `<g class="tag"><rect x="${x - w / 2}" y="${y - 9}" width="${w}" height="17" rx="8"/>${T(x, y + 4, t, '', 'middle')}</g>`; };
  const burst = (x, y, t) => {
    let pts = '';
    for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 9 : 19; pts += (x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1) + ' '; }
    const w = t.length * 6.4 + 12;
    return `<g class="dmg"><polygon points="${pts}"/><rect x="${x - w / 2}" y="${y + 21}" width="${w}" height="18" rx="5"/>${T(x, y + 34, t, '', 'middle')}</g>`;
  };
  const resV = (x, y1, y2) => { const m = (y1 + y2) / 2; return P(`M${x} ${y1} V${m - 13} M${x} ${m + 13} V${y2}`, 'w') + `<rect x="${x - 5}" y="${m - 13}" width="10" height="26" class="fz"/>`; };
  function rails(ac, fuse, fuseBlown) {
    const top = ac ? 'L 230 V AC' : '+24 V DC', bot = ac ? 'N' : '0 V';
    let s = `<rect x="14" y="112" width="72" height="76" rx="6" class="psu"/>${T(50, 145, ac ? 'Mains' : 'PSU', 'tb', 'middle')}${T(50, 162, ac ? '230 V AC' : '24 V DC', 'ts', 'middle')}`;
    s += P(`M50 112 V${YT} H96 M124 ${YT} H610`, 'rail') + P(`M50 188 V${YB} H610`, 'rail');
    s += `<rect x="96" y="${YT - 7}" width="28" height="14" rx="2" class="fz"/>` + P(`M96 ${YT} H124`, 'in');
    s += T(110, YT - 13, fuse, 'ts', 'middle') + T(150, YT - 9, top, 'tm') + T(150, YB + 18, bot, 'tm');
    if (fuseBlown) s += P(`M100 ${YT - 10} L120 ${YT + 10} M120 ${YT - 10} L100 ${YT + 10}`, 'spk');
    return s;
  }

  // input circuit
  function drawIn(c, p) {
    const B = BR[c.brand], sink = c.inCard === 'sinking', d = c.dev, three = d === 'pnp' || d === 'npn' || d === 'w4';
    let s = rails(false, 'F1 2 A', false);
    // device supply wires
    if (three) { s += P(`M210 112 V${YT}`, 'w bn') + DOT(210, YT) + P(`M210 188 V${YB}`, 'w bu') + DOT(210, YB) + T(218, 80, 'BN', 'tw') + T(218, 230, 'BU', 'tw'); }
    else if (sink) { s += P(`M210 112 V${YT}`, d === 'w2' ? 'w bn' : 'w') + DOT(210, YT) + (d === 'w2' ? T(218, 80, 'BN', 'tw') : ''); }
    else { s += P(`M210 188 V${YB}`, d === 'w2' ? 'w bu' : 'w') + DOT(210, YB) + (d === 'w2' ? T(218, 230, 'BU', 'tw') : ''); }
    // signal wires
    const sigCls = three ? 'w bk' : d === 'w2' ? (sink ? 'w bu' : 'w bn') : 'w';
    s += (three ? P('M280 140 H430', 'case') : '') + P('M280 140 H430', sigCls) + (three ? T(292, 133, 'BK', 'tw') : d === 'w2' ? T(292, 133, sink ? 'BU' : 'BN', 'tw') : '');
    if (d === 'w4') s += P('M280 175 H430', 'w wh') + T(292, 168, 'WH', 'tw');
    // bleeder
    if (d === 'w2' && c.bleed) { s += sink ? resV(380, 140, YB) + DOT(380, YB) : resV(380, YT, 140) + DOT(380, YT); s += DOT(380, 140) + T(388, sink ? 214 : 70, 'bleeder', 'ts'); }
    // common wire
    s += sink ? P(`M560 230 V${YB}`, 'w') + DOT(560, YB) : P(`M560 88 V${YT}`, 'w') + DOT(560, YT);
    s += T(570, sink ? 250 : 66, B.diC(c.inCard), 'tm');
    // device body
    s += `<rect x="180" y="112" width="100" height="76" rx="${d === 'pb' ? 8 : 14}" class="box"/>`;
    if (d === 'pb') {
      const dn = p && p.target ? 8 : 0;
      s += P(`M196 160 H212 M248 160 H264`, 'sym') + P(`M208 ${148 + dn} H252 M230 ${148 + dn} V${128 + dn} M220 ${128 + dn} H240`, 'sym') + T(230, 180, 'S1 · NO', 'ts', 'middle');
    } else {
      s += `<rect x="180" y="120" width="9" height="60" rx="2" class="cardh"/>`;
      s += T(234, 146, d === 'w2' ? '2-wire' : d === 'w4' ? 'PNP' : d.toUpperCase(), 'tb', 'middle');
      s += T(234, 162, d === 'w4' ? 'NO + NC' : d === 'w2' ? 'DC sensor' : 'sensor', 'ts', 'middle');
      s += `<circle cx="266" cy="124" r="5" class="sled${p && p.sens ? ' on' : ''}"/>`;
    }
    if (p && p.target) s += `<rect x="146" y="128" width="26" height="44" rx="3" class="tgt"/>` + T(159, 186, d === 'pb' ? '' : 'metal', 'ts', 'middle');
    // card
    s += `<rect x="430" y="88" width="160" height="142" rx="8" class="card"/><rect x="431" y="89" width="158" height="28" rx="7" class="cardh"/>`;
    s += T(442, 107, 'DI · ' + (sink ? 'sinking' : 'sourcing'), 'tb');
    const rows = d === 'w4' ? [140, 175] : [140];
    rows.forEach((y, i) => {
      const on = p ? p.led[i] : 0;
      s += P(`M430 ${y} H446 M468 ${y} H486 M506 ${y} H560`, 'in') + `<rect x="446" y="${y - 4}" width="22" height="8" class="fz"/>`;
      s += sink ? `<polygon points="488,${y - 8} 488,${y + 8} 503,${y}" class="led${on ? (p.cls === 'leak' ? ' amb' : ' on') : ''}"/>` + P(`M504 ${y - 8} V${y + 8}`, 'in')
        : `<polygon points="503,${y - 8} 503,${y + 8} 488,${y}" class="led${on ? (p.cls === 'leak' ? ' amb' : ' on') : ''}"/>` + P(`M487 ${y - 8} V${y + 8}`, 'in');
      s += TERM(430, y) + T(440, y - 7, String(i), 'ts');
    });
    s += P(`M560 ${rows[0]} V${sink ? 230 : 88}`, 'in') + (d === 'w4' ? DOT(560, 175) : '') + DOT(560, 140) + TERM(560, sink ? 230 : 88);
    const bt = p ? (d === 'w4' ? `${p.bit[0]} / ${p.bit[1]}` : String(p.bit[0])) : '–';
    s += T(442, 206, 'PLC sees', 'ts') + T(442, 221, (d === 'w4' ? B.i0 + ' / .1' : B.i0) + ' = ' + bt, 'tm');
    // flow, tags
    if (p && p.flow) s += P(p.flow, 'flow ' + p.cls);
    if (p) p.tags.forEach((g) => (s += tag(g.x, g.y, g.t)));
    return { vb: '0 0 640 300', s };
  }

  // output circuit
  function drawOut(c, p) {
    const B = BR[c.brand], L = LOAD[c.load], tr = isTr(c.outCard), npn = c.outCard === 'npn';
    const ac = c.ipr ? c.outCard === 'triac' : L.ac;
    const retTop = tr && c.ret === '24v';
    const fuseBlown = p && p.dmg && p.dmg.at === 'fuse';
    let s = rails(ac, 'F2 4 A', fuseBlown);
    const com = c.outCard === 'relay' ? B.rC : c.outCard === 'triac' ? B.tC : npn ? B.pM : B.pL;
    // common + internal path (bus x = 262, switching element on the Q line)
    s += npn ? P(`M262 220 V${YB}`, 'w') + DOT(262, YB) : P(`M262 90 V${YT}`, 'w') + DOT(262, YT);
    s += T(270, npn ? 246 : 66, com, 'tm');
    // Q wire and load return
    s += P('M320 150 H430', 'w') + P(`M520 150 H590 V${retTop ? YT : YB}`, 'w') + DOT(590, retTop ? YT : YB);
    if (c.diode) {
      const cathL = !(npn || retTop); // cathode towards the + end of the load
      s += P('M400 150 V100 H466 M484 100 H550 V150', 'w') + DOT(400, 150) + DOT(550, 150);
      s += cathL ? `<polygon points="484,92 484,108 468,100" class="symf"/>` + P('M467 91 V109', 'sym') : `<polygon points="466,92 466,108 482,100" class="symf"/>` + P('M483 91 V109', 'sym');
      s += T(475, 86, 'flyback diode', 'ts', 'middle');
    }
    // card
    s += `<rect x="150" y="90" width="170" height="130" rx="8" class="card"/><rect x="151" y="91" width="168" height="35" rx="7" class="cardh"/>`;
    s += T(160, 106, 'DQ card', 'tb') + T(160, 120, { relay: 'relay contact', pnp: 'PNP · sourcing', npn: 'NPN · sinking', triac: 'triac · AC only' }[c.outCard], 'ts');
    const ledCls = p && p.led ? (p.led === 'blink' ? 'led on blink' : 'led on') : 'led';
    s += `<circle cx="172" cy="150" r="7" class="${ledCls}"/>` + T(185, 154, 'LED', 'ts');
    s += T(160, 192, 'PLC writes', 'ts') + T(160, 208, B.q0 + ' = ' + (p ? (p.led ? 1 : 0) : '–'), 'tm');
    // switching element
    const sy = 150, closed = p && (p.load === 'on' || p.flow) && !(p.dmg && p.dmg.at === 'fuse');
    s += P(npn ? 'M262 220 V150 H272 M304 150 H320' : 'M262 90 V150 H272 M304 150 H320', 'in') + DOT(262, 150);
    s += `<rect x="272" y="137" width="32" height="26" rx="5" class="box"/>`;
    if (c.outCard === 'relay') s += P(`M276 150 H280 L296 ${closed ? 150 : 140} M297 145 V150 H301`, 'sym');
    else if (c.outCard === 'triac') s += `<polygon points="281,141 281,149 295,145" class="sym"/><polygon points="295,151 295,159 281,155" class="sym"/>` + P('M279 141 V159 M297 141 V159', 'sym');
    else s += P('M282 141 V159 M282 146 L297 140 M282 154 L297 160 M276 150 H282', 'sym') + `<polygon points="${npn ? '297,160 290,160 294,154' : '283,154 290,155 286,160'}" class="symf"/>`;
    s += TERM(320, 150) + T(326, 142, 'Q 0', 'ts');
    // load (or K1 coil)
    s += TERM(430, 150) + TERM(520, 150);
    const on = p && p.load === 'on' && !c.ipr, glow = p && p.load === 'glow';
    if (c.ipr) {
      const k = p && p.k1;
      s += `<rect x="445" y="128" width="60" height="44" rx="3" class="box coil${k ? ' on' : ''}"/>` + T(475, 155, 'K1', 'tb', 'middle') + P('M430 150 H445 M505 150 H520', 'w');
      s += T(475, 196, 'interposing contactor', 'ts', 'middle') + T(475, 209, 'coil ' + (ac ? '230 V AC' : '24 V DC') + ' · 0.1 A', 'ts', 'middle');
    } else if (c.load === 'lamp24' || c.load === 'lamp230') {
      s += P('M430 150 H458 M492 150 H520', 'w') + `<circle cx="475" cy="150" r="17" class="lamp${on ? ' on' : glow ? ' glow' : ''}"/>` + P('M463 138 L487 162 M487 138 L463 162', 'sym');
      s += T(475, 196, L.t, 'ts', 'middle');
    } else if (c.load === 'valve') {
      s += P('M430 150 H452 M498 150 H520', 'w') + `<rect x="452" y="136" width="46" height="28" class="box coil${on ? ' on' : ''}"/>` + P('M452 164 L498 136', 'sym');
      s += T(475, 196, 'valve coil Y1', 'ts', 'middle');
    } else if (c.load === 'heater') {
      s += P('M430 150 H446 M504 150 H520', 'w') + `<rect x="446" y="136" width="58" height="28" rx="3" class="box heat${on ? ' on' : ''}"/>` + P('M452 150 l5 -8 l7 16 l7 -16 l7 16 l7 -16 l7 16 l5 -8', 'sym');
      s += T(475, 196, 'heater 10 A', 'ts', 'middle');
    } else {
      s += P('M430 150 H444 M506 150 H520', 'w') + `<rect x="444" y="126" width="62" height="48" rx="5" class="box"/>` + T(475, 143, 'PUL', 'tm', 'middle');
      s += P(on ? 'M452 164 h6 v-10 h6 v10 h6 v-10 h6 v10 h6 v-10 h6 v10 h8' : 'M452 164 h46', on ? 'spk arc' : 'sym');
      s += T(475, 196, 'stepper drive', 'ts', 'middle');
    }
    // the separate load circuit for the interposing contactor
    let vb = '0 0 640 300';
    if (c.ipr) {
      vb = '0 0 760 300';
      const k = p && p.k1, hon = k && p.load === 'on';
      s += `<rect x="622" y="44" width="130" height="212" rx="10" class="zone"/>` + T(687, 62, L.ac ? 'Load 230 V AC' : 'Load 24 V DC', 'ts', 'middle');
      s += P('M690 84 V96 M690 112 V128 M690 150 V166 M690 210 V236', 'w') + T(700, 82, L.ac ? 'L' : '+', 'tm') + T(700, 248, L.ac ? 'N' : '0 V', 'tm');
      s += `<rect x="683" y="96" width="14" height="16" rx="2" class="fz"/>` + T(704, 108, 'F3', 'ts');
      s += P(`M690 128 L${k ? 692 : 702} 150`, 'sym') + T(704, 143, 'K1', 'ts');
      s += P('M505 136 C560 120 620 128 684 139', 'zone');
      if (c.load === 'heater') s += `<rect x="676" y="166" width="28" height="44" rx="3" class="box heat${hon ? ' on' : ''}"/>` + P('M690 170 l-7 5 l14 6 l-14 6 l14 6 l-14 6 l7 5', 'sym');
      else if (c.load === 'lamp24' || c.load === 'lamp230') s += P('M690 166 V171 M690 205 V210', 'w') + `<circle cx="690" cy="188" r="17" class="lamp${hon ? ' on' : ''}"/>` + P('M678 176 L702 200 M702 176 L678 200', 'sym');
      else s += `<rect x="672" y="166" width="36" height="44" rx="4" class="box${hon && c.load === 'valve' ? ' coil on' : ''}"/>` + T(690, 192, c.load === 'valve' ? 'Y1' : 'PUL', 'tm', 'middle');
      if (hon) s += P(POUT.load, 'flow ok');
    }
    // flows and marks
    if (p && p.flow) s += P(p.flow, 'flow ' + p.cls);
    if (p && p.free) s += P(p.free, 'flow leak');
    if (p) p.tags.forEach((g) => (s += tag(g.x, g.y, g.t)));
    if (p && p.spike) s += P('M342 98 l-10 14 h9 l-8 14 l14 -18 h-9 l8 -10', p.dmg ? 'spk' : 'spk arc') + T(352, 92, p.dmg ? 'spike!' : 'arc', 'ts');
    if (p && p.dmg) s += p.dmg.at === 'fuse' ? burst(110, YT + 2, p.dmg.t) : burst(288, sy, p.dmg.t);
    return { vb, s };
  }

  // ───────────── the widget ─────────────
  LL.HW.wiring = function (ph) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'hw-box hw-wiring';
    const uid = 'hww' + ++uidN;

    const DEF = { brand: 'siemens', mode: 'in', inCard: 'sinking', dev: 'pnp', bleed: false, outCard: 'pnp', load: 'lamp24', ret: '0v', diode: false, ipr: false, done: {} };
    let c = load();
    const restored = Object.keys(c.done).length > 0;
    let wantScroll = true, powered = false, phase = 'on', res = null, timers = [], cur = null, cap = null, capOpen = false;

    function load() {
      try {
        const o = JSON.parse(localStorage.getItem(STORE) || 'null');
        if (!o || typeof o !== 'object') return JSON.parse(JSON.stringify(DEF));
        const v = (k, ok) => (ok ? o[k] : DEF[k]);
        const done = {};
        if (o.done && typeof o.done === 'object') TASKS.forEach((t) => { if (o.done[t.id]) done[t.id] = 1; });
        return { brand: v('brand', BR[o.brand]), mode: v('mode', o.mode === 'in' || o.mode === 'out'), inCard: v('inCard', INC[o.inCard]), dev: v('dev', DEV[o.dev]),
          bleed: !!o.bleed, outCard: v('outCard', OUTC[o.outCard]), load: v('load', LOAD[o.load]), ret: v('ret', o.ret === '0v' || o.ret === '24v'), diode: !!o.diode, ipr: !!o.ipr, done };
      } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
    }
    function save() { try { localStorage.setItem(STORE, JSON.stringify(c)); } catch (e) { /* storage blocked */ } }

    root.innerHTML = `
<div class="hww-head"><h4 class="hww-title">Wire the I/O</h4>
<div class="hww-brands" role="group" aria-label="PLC brand">${BORDER.map((k) => `<button type="button" data-act="brand" data-v="${k}" data-f="b-${k}">${BR[k].n}</button>`).join('')}</div></div>
<p class="hww-intro">Choose a card and a device, then press <b>Power on</b>. The green dashes show where the current flows. On a real machine a wrong wire can burn a card. Here you can try every mistake for free.</p>
<div class="hww-tabs" role="tablist" aria-label="Circuit">
<button type="button" role="tab" id="${uid}-tin" data-act="mode" data-v="in" data-f="m-in">Input circuit<small>sensor → PLC</small></button>
<button type="button" role="tab" id="${uid}-tout" data-act="mode" data-v="out" data-f="m-out">Output circuit<small>PLC → load</small></button></div>
<div class="hww-pick" role="tabpanel"></div>
<div class="hww-stage"><div class="hww-draw"><svg class="hww-svg" role="img" aria-label="Wiring drawing" viewBox="0 0 640 300"></svg></div><p class="hww-swipe">Swipe the drawing sideways to see all of it.</p>
<div class="hww-run"><button type="button" class="btn go" data-act="power" data-f="power">${LL.SYM.bolt} Power on</button><span class="hww-step" aria-live="polite"></span></div>
<div class="hww-res" aria-live="polite"></div></div>
<div class="hww-sec hww-check"></div>
<div class="hww-cap"><div class="hww-caph"><span class="hww-k" style="margin:0">What happened</span><button type="button" class="hww-more" data-act="more" aria-expanded="false">more ▾</button></div><p role="status" aria-live="polite"></p></div>`;
    const $ = (q) => root.querySelector(q);
    const pickEl = $('.hww-pick'), svgEl = $('.hww-svg'), runEl = $('.hww-run'), stepEl = $('.hww-step'), resEl = $('.hww-res'), chkEl = $('.hww-check'), capEl = $('.hww-cap'), moreEl = $('.hww-more');

    const evalNow = () => (c.mode === 'in' ? evalIn(c) : evalOut(c));
    const opt = (act, k, o, sel) => `<button type="button" class="hww-opt" data-act="${act}" data-v="${k}" data-f="${act}-${k}" aria-pressed="${sel}"><b>${esc(o.t)}</b><small>${esc(o.s)}</small></button>`;
    const tg = (act, on, t, sub) => `<button type="button" class="hww-tg" data-act="${act}" data-f="${act}" aria-pressed="${on}"><i aria-hidden="true">${on ? '✓' : ''}</i><span>${esc(t)}<small>${esc(sub)}</small></span></button>`;

    function renderPick() {
      const B = BR[c.brand];
      let h = '';
      if (c.mode === 'in') {
        const ex = B.ex[c.inCard];
        h += `<div class="hww-grp"><span class="hww-k">Input card</span><div class="hww-opts">${Object.keys(INC).map((k) => opt('inCard', k, INC[k], c.inCard === k)).join('')}</div>${ex ? `<p class="hww-ex">${esc(B.n)} example: ${esc(ex)}</p>` : ''}</div>`;
        h += `<div class="hww-grp"><span class="hww-k">Device</span><div class="hww-opts">${Object.keys(DEV).map((k) => opt('dev', k, DEV[k], c.dev === k)).join('')}</div></div>`;
        if (c.dev === 'w2') h += `<div class="hww-row">${tg('bleed', c.bleed, 'Bleeder resistor', 'parallel to the input')}</div>`;
      } else {
        const ex = B.ex[c.outCard];
        h += `<div class="hww-grp"><span class="hww-k">Output card</span><div class="hww-opts">${Object.keys(OUTC).map((k) => opt('outCard', k, OUTC[k], c.outCard === k)).join('')}</div>${ex ? `<p class="hww-ex">${esc(B.n)} example: ${esc(ex)}</p>` : ''}</div>`;
        h += `<div class="hww-grp"><span class="hww-k">Load</span><div class="hww-opts">${Object.keys(LOAD).map((k) => opt('load', k, LOAD[k], c.load === k)).join('')}</div></div>`;
        h += '<div class="hww-row">';
        if (isTr(c.outCard)) h += `<div class="hww-grp"><span class="hww-k">Other end of the ${c.ipr ? 'coil' : 'load'} to</span><div class="hww-seg" role="group" aria-label="Other end of the load">${[['0v', '0 V'], ['24v', '+24 V']].map(([k, t]) => `<button type="button" data-act="ret" data-v="${k}" data-f="ret-${k}" aria-pressed="${c.ret === k}">${t}</button>`).join('')}</div></div>`;
        h += `<div class="hww-grp"><span class="hww-k">Extras</span><div class="hww-row" style="gap:6px">${tg('diode', c.diode, 'Flyback diode', 'across the coil')}${tg('ipr', c.ipr, 'Interposing contactor', 'K1 switches the load')}</div></div>`;
        h += '</div>';
      }
      pickEl.innerHTML = h;
      pickEl.setAttribute('aria-labelledby', uid + (c.mode === 'in' ? '-tin' : '-tout'));
    }

    function renderDraw() {
      const p = powered && res ? res[phase] : null;
      const d = c.mode === 'in' ? drawIn(c, p) : drawOut(c, p);
      svgEl.setAttribute('viewBox', d.vb);
      const wide = d.vb.endsWith('760 300');
      svgEl.style.maxWidth = wide ? '760px' : '640px';
      svgEl.style.minWidth = wide && root.classList.contains('hww-narrow') ? '560px' : '';
      svgEl.innerHTML = d.s;
      // phones: the drawing is wider than the screen; show the device and the card first (the PSU is on the left)
      if (wantScroll && root.classList.contains('hww-narrow')) {
        const box = svgEl.parentNode, k = svgEl.clientWidth / (d.vb.endsWith('760 300') ? 760 : 640);
        box.scrollLeft = Math.round((c.mode === 'out' && c.ipr ? 380 : 128) * k);
      }
      wantScroll = false;
    }

    function renderRun() {
      const busy = timers.length > 0;
      const pw = runEl.querySelector('[data-act="power"]');
      pw.innerHTML = powered ? (busy ? LL.SYM.bolt + ' Testing…' : '■ Power off') : LL.SYM.bolt + ' Power on';
      pw.setAttribute('aria-pressed', String(powered));
      pw.disabled = busy;
      let seg = runEl.querySelector('.hww-seg');
      if (powered && !busy) {
        const lb = c.mode === 'in' ? (c.dev === 'pb' ? ['Pressed', 'Released'] : ['Target in', 'No target']) : [BR[c.brand].q0 + ' = 1', BR[c.brand].q0 + ' = 0'];
        const h = `<span class="hww-k" style="margin:0 2px 0 0;display:inline">Show</span>${['on', 'off'].map((k, i) => `<button type="button" data-act="phase" data-v="${k}" data-f="ph-${k}" aria-pressed="${phase === k}">${esc(lb[i])}</button>`).join('')}`;
        if (!seg) { seg = document.createElement('div'); seg.className = 'hww-seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Show phase'); runEl.insertBefore(seg, stepEl); }
        seg.innerHTML = h;
        seg.style.alignItems = 'center';
      } else if (seg) seg.remove();
    }

    function renderRes() {
      if (!powered || !res || timers.length) {
        resEl.className = 'hww-res idle';
        resEl.innerHTML = timers.length ? 'Testing…' : 'Press <b>Power on</b> to test this wiring: first with the signal ON, then OFF.';
        return;
      }
      resEl.className = 'hww-res';
      let h = `<span class="hww-verd ${res.kind}">${res.kind === 'works' || res.kind === 'warn' ? '✓' : res.kind === 'damage' ? '✗' : '!'} ${esc(res.badge)}</span>`;
      h += `<div class="hww-tbl"><table><tr><th>Test</th>${res.head.map((x) => `<th>${esc(x)}</th>`).join('')}<th><span class="hww-sr">correct?</span></th></tr>`;
      res.rows.forEach((r) => {
        h += `<tr><td>${esc(r[0])}</td>${r.slice(1, -1).map((x, i) => `<td class="${i === r.length - 3 ? 'm' : ''}">${esc(x)}</td>`).join('')}<td class="${r[r.length - 1] ? 'y' : 'n'}">${r[r.length - 1] ? '✓' : '✗'}<span class="hww-sr">${r[r.length - 1] ? ' as it should be' : ' wrong'}</span></td></tr>`;
      });
      h += '</table></div>';
      resEl.innerHTML = h;
    }

    function ruleText() {
      if (c.mode === 'in') return c.inCard === 'sinking'
        ? '<b>Rule:</b> follow the current from +24 V to 0 V. A sinking input takes current IN and sends it to its common (0 V). So the device must give +24 V: a PNP sensor or a contact wired to +24 V.'
        : '<b>Rule:</b> a sourcing input gives current OUT: its common is at +24 V. So the device must take the current to 0 V: an NPN sensor or a contact wired to 0 V.';
      return '<b>Rule:</b> PNP (sourcing) output → load → 0 V. NPN (sinking) output ← load ← +24 V. Relay: any voltage, slow. Triac: AC only. Over 0.5–2 A: use an interposing relay or contactor.';
    }

    function renderCheck() {
      const n = TASKS.filter((t) => c.done[t.id]).length, all = n === TASKS.length;
      let h = `<div class="hww-h"><b>Mission checklist <span class="chip${all ? ' ok' : ''}" style="font-family:var(--f-body);letter-spacing:0;text-transform:none;margin-left:6px">${n} / ${TASKS.length}</span></b><button type="button" class="btn small" data-act="reset" data-f="reset">Reset mission</button></div>`;
      h += `<p class="hww-rule">${ruleText()}</p><ul class="hww-cl" style="margin-top:10px">`;
      TASKS.forEach((t, i) => {
        const ok = !!c.done[t.id];
        h += `<li class="${ok ? 'ok' : 'no'}${cur === t.id ? ' cur' : ''}"><i aria-hidden="true">${ok ? '✓' : i + 1}</i><span><b>${esc(t.t)}</b><span class="hww-sr">${ok ? ' done' : ' not yet'}</span><small>${esc(ok ? t.why : t.d)}</small></span><button type="button" class="btn small" data-act="task" data-v="${t.id}" data-f="task-${t.id}" aria-label="Set up task ${i + 1}: ${esc(t.t)}">${ok ? 'Again' : 'Set up'}</button></li>`;
      });
      h += '</ul>';
      if (all) h += '<p class="hww-win">Mission complete! You can now wire PNP, NPN and 2-wire sensors, and choose relay, transistor or triac outputs. Try the 4-wire sensor too, or switch the brand to see its names.</p>';
      chkEl.innerHTML = h;
    }

    function renderAll() {
      const a = document.activeElement, fk = a && root.contains(a) ? a.getAttribute('data-f') : null;
      root.querySelectorAll('[data-act="brand"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === c.brand)));
      root.querySelectorAll('[data-act="mode"]').forEach((b) => { b.setAttribute('aria-selected', String(b.dataset.v === c.mode)); b.tabIndex = b.dataset.v === c.mode ? 0 : -1; });
      renderPick(); renderDraw(); renderRun(); renderRes(); renderCheck();
      if (fk) { const n = root.querySelector('[data-f="' + fk + '"]'); if (n && !n.disabled) n.focus({ preventScroll: true }); }
      save();
    }

    // ───── caption ─────
    function say(text, kind) {
      cap = { text, kind: kind || 'info' };
      capEl.className = 'hww-cap ' + cap.kind + (capOpen ? ' open' : '');
      capEl.querySelector('p').textContent = text;
      fitCap();
      void capEl.offsetWidth;
      capEl.classList.add('flash');
    }
    function fitCap() {
      const p = capEl.querySelector('p'), narrow = root.classList.contains('hww-narrow');
      capEl.classList.toggle('open', capOpen);
      const lh = parseFloat(getComputedStyle(p).lineHeight) || 21;
      capEl.classList.toggle('long', narrow && (capOpen || p.scrollHeight > lh * 3 + 2));
      moreEl.textContent = capOpen ? 'less ▴' : 'more ▾';
      moreEl.setAttribute('aria-expanded', String(capOpen));
    }
    const kindOf = (k) => (k === 'works' ? 'ok' : k === 'damage' ? 'bad' : 'warn');

    // ───── power on: phase ON, then phase OFF ─────
    function stop() { timers.forEach(clearTimeout); timers = []; }
    function unpower() { stop(); powered = false; res = null; phase = 'on'; }
    function stepTxt(ph) {
      const B = BR[c.brand];
      if (c.mode === 'in') return c.dev === 'pb' ? (ph === 'on' ? 'Step 1 of 2: the button is pressed.' : 'Step 2 of 2: the button is released.') : ph === 'on' ? 'Step 1 of 2: a metal target is in front of the sensor.' : 'Step 2 of 2: the target is gone.';
      return ph === 'on' ? `Step 1 of 2: the program sets ${B.q0} = 1.` : `Step 2 of 2: the program sets ${B.q0} = 0.`;
    }
    function powerOn() {
      if (powered) { unpower(); renderAll(); stepEl.textContent = ''; return say('Power off. Change the wiring, then press Power on again.'); }
      powered = true; res = evalNow(); phase = 'on';
      const ms = reduced() ? 1400 : 1900;
      stepEl.textContent = stepTxt('on');
      timers.push(setTimeout(() => {
        if (!root.isConnected) return stop();
        phase = 'off'; stepEl.textContent = stepTxt('off'); renderDraw();
      }, ms));
      timers.push(setTimeout(() => {
        if (!root.isConnected) return stop();
        timers = [];
        // end on the phase that tells the story: damage at switch-on, or the OFF problem (leak, stuck, spike, glow)
        phase = res.on.dmg ? 'on' : res.off.dmg || res.off.spike || res.off.flow || res.kind === 'stuck' ? 'off' : 'on';
        stepEl.textContent = '';
        finish();
      }, ms * 2));
      renderAll();
      say(stepTxt('on') + ' Watch the drawing.', 'info');
    }
    function finish() {
      const ok = res.kind === 'works' || res.kind === 'warn';
      let news = '';
      if (ok) TASKS.forEach((t, i) => { if (!c.done[t.id] && t.ok(c)) { c.done[t.id] = 1; news += ` ✓ Task ${i + 1} done: ${t.t}.`; } });
      if (news && TASKS.every((t) => c.done[t.id])) news += ' Mission complete!';
      renderAll();
      say(res.why + news, kindOf(res.kind));
    }

    function change(fn, msg) {
      const was = powered;
      wantScroll = true;
      unpower();
      fn();
      renderAll();
      stepEl.textContent = '';
      say((msg || '') + (was ? ' Power is off now. Press Power on to test again.' : ' Press Power on to test it.'), 'info');
    }

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !root.contains(b) || b.disabled) return;
      const act = b.dataset.act, v = b.dataset.v;
      if (act === 'brand') {
        if (v === c.brand) return say(BR[v].note, 'info');
        c.brand = v; if (powered && !timers.length) res = evalNow();
        renderAll();
        return say(BR[v].note, 'info');
      }
      if (act === 'mode') { if (v === c.mode) return; cur = null; return change(() => (c.mode = v), v === 'in' ? 'Input circuit: a field device sends a signal into the PLC.' : 'Output circuit: the PLC switches a load.'); }
      if (act === 'inCard') return change(() => (c.inCard = v), `${INC[v].t}: ${v === 'sinking' ? 'current flows INTO the input and out of the common to 0 V.' : 'current flows OUT of the input; the common is at +24 V.'}`);
      if (act === 'dev') return change(() => (c.dev = v), {
        pb: 'Push button: a plain contact, it works with both card types if you wire it to the right side.',
        pnp: 'PNP sensor: brown +24 V, blue 0 V, black = output. When it sees a target, it switches +24 V to the black wire.',
        npn: 'NPN sensor: brown +24 V, blue 0 V, black = output. When it sees a target, it switches 0 V to the black wire.',
        w2: '2-wire sensor: it sits in series with the input, like a switch. But it needs a little current even when off.',
        w4: '4-wire PNP sensor: +24 V, 0 V and two outputs: NO (black) and NC (white). They are always opposite.',
      }[v]);
      if (act === 'bleed') return change(() => (c.bleed = !c.bleed), c.bleed ? 'Bleeder resistor removed.' : 'Bleeder resistor added: it sits between the input terminal and the common.');
      if (act === 'outCard') return change(() => (c.outCard = v), {
        relay: 'Relay output: a small relay inside the card. Its contact switches AC or DC up to 2 A. About 10 ms to switch; contacts wear.',
        pnp: 'Transistor PNP (sourcing) output: switches +24 V DC to the load, up to 0.5 A. Fast and no wear.',
        npn: 'Transistor NPN (sinking) output: switches the load to 0 V, up to 0.5 A. The load connects to +24 V.',
        triac: 'Triac output: an electronic AC switch, up to 0.5 A. No wear, but AC only and a small leakage current.',
      }[v]);
      if (act === 'load') return change(() => (c.load = v), `Load: ${LOAD[v].t} (${LOAD[v].s}).`);
      if (act === 'ret') return change(() => (c.ret = v), `The other end of the ${c.ipr ? 'coil' : 'load'} now goes to ${v === '0v' ? '0 V' : '+24 V'}.`);
      if (act === 'diode') return change(() => (c.diode = !c.diode), c.diode ? 'Flyback diode removed.' : 'Flyback diode added across the load, cathode to the + side. It blocks in normal use.');
      if (act === 'ipr') return change(() => (c.ipr = !c.ipr), c.ipr ? 'Interposing contactor removed: the card switches the load directly.' : 'Interposing contactor K1 added: the card switches only its coil; its contact switches the load.');
      if (act === 'power') return powerOn();
      if (act === 'phase') {
        phase = v; renderDraw(); renderRun();
        const n = root.querySelector('[data-f="ph-' + v + '"]'); if (n) n.focus({ preventScroll: true });
        const row = res.rows[v === 'on' ? 0 : 1];
        return say(`${row[0]}: ${res.head.map((x, i) => x + ' ' + row[i + 1]).join(', ')}.`, kindOf(res.kind));
      }
      if (act === 'task') {
        const t = TASKS.find((x) => x.id === v); if (!t) return;
        cur = t.id;
        change(() => { c.mode = t.mode; Object.assign(c, t.set); }, `Task ${TASKS.indexOf(t) + 1}: ${t.d}`);
        const top = root.querySelector('.hww-tabs');
        if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        return;
      }
      if (act === 'reset') { c.done = {}; cur = null; unpower(); renderAll(); return say('Mission reset. Start with task 1: press Set up.', 'info'); }
      if (act === 'more') { capOpen = !capOpen; fitCap(); }
    });
    root.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t.matches && t.matches('[role="tab"]') && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) {
        e.preventDefault();
        const v = c.mode === 'in' ? 'out' : 'in';
        const n = root.querySelector('[data-act="mode"][data-v="' + v + '"]');
        if (n) { n.click(); n.focus(); }
      }
    });

    ph.replaceWith(root);
    let ro = null, seen = false, lastW = -1;
    const fit = () => {
      if (!root.isConnected) { if (seen) { stop(); if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); } return; }
      seen = true;
      const w = root.clientWidth;
      if (w === lastW) return;
      lastW = w;
      const was = root.classList.contains('hww-narrow');
      root.classList.toggle('hww-narrow', w < 600);
      if (was !== w < 600 && svgEl.firstChild) renderDraw();
      fitCap();
    };
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(() => requestAnimationFrame(fit)); ro.observe(root); } else window.addEventListener('resize', fit);
    renderAll();
    say(restored ? (TASKS.every((t) => c.done[t.id]) ? 'Welcome back: your mission is complete. Try other cards, the 4-wire sensor, or another brand.' : 'Welcome back: your mission progress is saved. Press Set up on the next task.') : 'Start with task 1 below: press Set up, then Power on. Or choose any card and device yourself.', 'info');
    capEl.classList.remove('flash');
  };
})();
