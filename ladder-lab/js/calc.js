/* PLC Start — calculators (#calc, #calc-<id>).
 * The formulas a PLC programmer needs on a project, from Ohm's law to sizing a cable, a power supply or a cabinet fan.
 * Every calculator is one entry in LIST: fields, a run(values) function and a few notes. One page draws them all.
 * run() returns { r: [[label, value, unit, flag]], how: [lines with the numbers filled in], warn: [..] } or { err }.
 * LL.Calc = { LIST, GROUPS, run(id, values), page(main, id) } */
(function () {
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const LL = (ROOT.LL = ROOT.LL || {});
  const STORE = 'll-calc';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // ───────────── small helpers ─────────────
  const SQ3 = Math.sqrt(3), G = 9.81, PI = Math.PI;
  // number to text: d decimals at most, no useless zeros; very small numbers keep 2 digits
  const F = (x, d) => {
    if (typeof x !== 'number' || !isFinite(x)) return '—';
    d = d == null ? 2 : d;
    const a = Math.abs(x);
    let s = a !== 0 && a < Math.pow(10, -d) ? x.toPrecision(2) : x.toFixed(d);
    if (s.indexOf('.') >= 0 && !/e/.test(s)) s = s.replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  };
  const N = (k, l, u, d, o) => Object.assign({ k, l, u, d, ty: 'n' }, o || {});
  const S = (k, l, opts, d, o) => Object.assign({ k, l, ty: 's', opts, d }, o || {});
  const X = (k, l, d, ph, o) => Object.assign({ k, l, ty: 'x', d, ph: ph || '' }, o || {});
  const E = (t) => ({ err: t });
  const nextStd = (list, x) => list.find((s) => s >= x - 1e-9);
  const hex = (v, n) => (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
  const bin = (v, n) => (v >>> 0).toString(2).padStart(n, '0').replace(/(.{4})(?=.)/g, '$1 ');
  const STD_MOTOR = [0.09, 0.12, 0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250];
  // copper wires with PVC insulation, air 40 °C, three loaded wires: values as in IEC 60204-1 table 6
  const CSA = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
  const AMP = {
    B1: [8.6, 10.3, 13.5, 18.3, 24, 31, 44, 59, 77, 96, 117, 149, 180, 208],
    B2: [8.5, 10.1, 13.1, 17.4, 23, 30, 40, 54, 70, 86, 103, 130, 156, 179],
    C: [9.8, 11.7, 15.2, 21, 28, 36, 50, 66, 84, 104, 125, 160, 194, 225],
    E: [10.4, 12.4, 16.1, 22, 30, 37, 52, 70, 88, 110, 133, 171, 207, 240],
  };
  const METHODS = [['B1', 'B1: single wires in a duct or conduit'], ['B2', 'B2: a cable in a duct or conduit'], ['C', 'C: a cable fixed on a wall'], ['E', 'E: a cable on an open tray']];
  const KAPPA = 56; // copper, m / (Ω · mm²)
  // text → whole number: 123, -5, 16#FF, 0xFF, FFh, 2#1010, 0b1010, 8#17
  function parseNum(s) {
    s = String(s == null ? '' : s).trim().replace(/[_\s']/g, '');
    let neg = false, m, v;
    if (s[0] === '-') { neg = true; s = s.slice(1); }
    if ((m = /^(?:16#|0x)([0-9a-f]+)$/i.exec(s)) || (m = /^([0-9a-f]+)h$/i.exec(s))) v = parseInt(m[1], 16);
    else if ((m = /^(?:2#|0b)([01]+)$/i.exec(s))) v = parseInt(m[1], 2);
    else if ((m = /^(?:8#|0o)([0-7]+)$/i.exec(s))) v = parseInt(m[1], 8);
    else if (/^\d+$/.test(s)) v = parseInt(s, 10);
    else return NaN;
    return neg ? -v : v;
  }
  function crc16(b) { let c = 0xFFFF; for (const x of b) { c ^= x; for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xA001 : c >>> 1; } return c; }
  function f32bits(x) { const d = new DataView(new ArrayBuffer(4)); d.setFloat32(0, x); return d.getUint32(0); }
  function bitsF32(u) { const d = new DataView(new ArrayBuffer(4)); d.setUint32(0, u >>> 0); return d.getFloat32(0); }
  function parseIp(s) {
    const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(String(s || ''));
    if (!m) return null;
    const p = m.slice(1).map(Number);
    return p.some((x) => x > 255) ? null : ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  }
  const ipStr = (u) => [u >>> 24, (u >>> 16) & 255, (u >>> 8) & 255, u & 255].join('.');
  function timeLit(ms) {
    ms = Math.round(ms);
    if (ms === 0) return 'T#0ms';
    const p = [['d', 86400000], ['h', 3600000], ['m', 60000], ['s', 1000], ['ms', 1]];
    let out = 'T#';
    p.forEach(([u, k]) => { const q = Math.floor(ms / k); if (q) { out += q + u; ms -= q * k; } });
    return out;
  }
  function span(sec) {
    if (!isFinite(sec)) return '—';
    if (sec < 120) return F(sec, 1) + ' s';
    if (sec < 7200) return F(sec / 60, 1) + ' min';
    if (sec < 172800) return F(sec / 3600, 1) + ' h';
    if (sec < 730 * 86400) return F(sec / 86400, 1) + ' days';
    return F(sec / 86400 / 365, 1) + ' years';
  }

  const GROUPS = [
    ['proj', 'Projects: tanks, pumps, air, lines'], ['elec', 'Electricity basics'], ['motor', 'Motors and drives'], ['size', 'Sizing the cabinet'], ['sig', 'Analog signals and sensors'],
    ['num', 'Numbers, addresses and units'], ['time', 'Scan, counting and motion'], ['mech', 'Machines and process'], ['ctrl', 'Control, networks and safety'],
  ];
  const LEVELS = { 1: 'Basic', 2: 'Everyday', 3: 'Advanced' };
  const LIST = [], BY = Object.create(null);
  const add = (o) => { LIST.push(o); BY[o.id] = o; };

  // ═════════════ Electricity basics ═════════════
  add({
    id: 'ohm', g: 'elec', lv: 1, t: 'Ohm’s law and power', d: 'Voltage, current and resistance: give two, get the third and the power.', key: 'volt amp ohm watt U I R P lamp resistor',
    f: [S('find', 'What do you want to find?', [['i', 'Current (I)'], ['u', 'Voltage (U)'], ['r', 'Resistance (R)']], 'i'),
      N('u', 'Voltage', 'V', 24, { show: (v) => v.find !== 'u' }), N('i', 'Current', 'A', 0.1, { show: (v) => v.find !== 'i' }), N('r', 'Resistance', 'Ω', 240, { show: (v) => v.find !== 'r' })],
    run(v) {
      let u = v.u, i = v.i, r = v.r, how;
      if (v.find === 'i') { if (!r) return E('The resistance cannot be 0.'); i = u / r; how = `I = U ÷ R = ${F(u)} ÷ ${F(r)} = ${F(i, 4)} A`; }
      else if (v.find === 'u') { u = i * r; how = `U = I × R = ${F(i, 4)} × ${F(r)} = ${F(u)} V`; }
      else { if (!i) return E('The current cannot be 0.'); r = u / i; how = `R = U ÷ I = ${F(u)} ÷ ${F(i, 4)} = ${F(r)} Ω`; }
      const p = u * i;
      return { r: [v.find === 'i' ? ['Current', F(i, 4), 'A', 'big'] : v.find === 'u' ? ['Voltage', F(u), 'V', 'big'] : ['Resistance', F(r), 'Ω', 'big'], ['In milliamps', F(i * 1000, 1), 'mA'], ['Power', F(p, 3), 'W']],
        how: [how, `P = U × I = ${F(u)} × ${F(i, 4)} = ${F(p, 3)} W`] };
    },
    tips: ['1 A = 1000 mA. A PLC input takes about 2 to 7 mA, a small relay coil about 20 mA.', 'A resistor must be made for the power: take at least 2 × the calculated watts.'],
  });
  add({
    id: 'res', g: 'elec', lv: 1, t: 'Resistors: series, parallel, divider', d: 'Total resistance, or the voltage in the middle of two resistors.', key: 'series parallel voltage divider resistor',
    f: [S('m', 'Circuit', [['s', 'In series'], ['p', 'In parallel'], ['d', 'Voltage divider (R1 on top, R2 below)']], 's'), N('r1', 'R1', 'Ω', 1000), N('r2', 'R2', 'Ω', 1000),
      N('r3', 'R3 (0 = not used)', 'Ω', 0, { show: (v) => v.m !== 'd' }), N('u', 'Supply voltage', 'V', 10, { show: (v) => v.m === 'd' })],
    run(v) {
      const rs = [v.r1, v.r2].concat(v.m !== 'd' && v.r3 > 0 ? [v.r3] : []);
      if (rs.some((x) => !(x > 0))) return E('Every resistor must be bigger than 0.');
      if (v.m === 's') { const t = rs.reduce((a, b) => a + b, 0); return { r: [['Total resistance', F(t), 'Ω', 'big']], how: ['R = ' + rs.map((x) => F(x)).join(' + ') + ' = ' + F(t) + ' Ω'] }; }
      if (v.m === 'p') { const t = 1 / rs.reduce((a, b) => a + 1 / b, 0); return { r: [['Total resistance', F(t), 'Ω', 'big']], how: ['1 ÷ R = ' + rs.map((x) => '1 ÷ ' + F(x)).join(' + '), 'R = ' + F(t) + ' Ω'] }; }
      const o = v.u * v.r2 / (v.r1 + v.r2), i = v.u / (v.r1 + v.r2);
      return { r: [['Voltage on R2', F(o, 3), 'V', 'big'], ['Current', F(i * 1000, 3), 'mA']], how: [`U2 = U × R2 ÷ (R1 + R2) = ${F(v.u)} × ${F(v.r2)} ÷ ${F(v.r1 + v.r2)} = ${F(o, 3)} V`] };
    },
    tips: ['In parallel the total is always smaller than the smallest resistor.', 'A divider only keeps its voltage when almost no current is taken from the middle.'],
  });
  add({
    id: 'p3', g: 'elec', lv: 1, t: 'Power and current (AC and DC)', d: 'From kW to amps, or from amps to kW, for three-phase, single-phase and DC.', key: 'three phase kW kVA kvar cos phi amps single phase',
    f: [S('sys', 'Supply', [['3', 'Three-phase'], ['1', 'Single-phase'], ['dc', 'DC']], '3'), S('find', 'What do you want to find?', [['i', 'Current from power'], ['p', 'Power from current']], 'i'),
      N('u', 'Voltage', 'V', 400), N('p', 'Active power', 'kW', 10, { show: (v) => v.find === 'i' }), N('i', 'Current', 'A', 17, { show: (v) => v.find === 'p' }), N('cos', 'Power factor cos φ', '', 0.85, { show: (v) => v.sys !== 'dc' })],
    run(v) {
      const k = v.sys === '3' ? SQ3 : 1, c = v.sys === 'dc' ? 1 : v.cos, ks = v.sys === '3' ? '√3 × ' : '', cs = v.sys === 'dc' ? '' : ' × cos φ';
      if (!(v.u > 0) || !(c > 0) || c > 1) return E('Voltage must be above 0 and cos φ between 0 and 1.');
      let i = v.i, p = v.p, how;
      if (v.find === 'i') { i = p * 1000 / (k * v.u * c); how = `I = P ÷ (${ks}U${cs}) = ${F(p * 1000, 0)} ÷ (${v.sys === '3' ? '1.732 × ' : ''}${F(v.u)}${v.sys === 'dc' ? '' : ' × ' + F(c)}) = ${F(i)} A`; }
      else { p = k * v.u * i * c / 1000; how = `P = ${ks}U × I${cs} = ${F(p)} kW`; }
      const s = k * v.u * i / 1000, q = s * Math.sqrt(Math.max(0, 1 - c * c));
      const r = [v.find === 'i' ? ['Current', F(i), 'A', 'big'] : ['Active power', F(p), 'kW', 'big']];
      if (v.sys !== 'dc') r.push(['Apparent power', F(s), 'kVA'], ['Reactive power', F(q), 'kvar']);
      return { r, how: [how] };
    },
    tips: ['kW is the power that does work. kVA is what the cable and the transformer must carry.', 'For a motor use the motor calculator: the kW on the nameplate is the power at the shaft.'],
  });
  add({
    id: 'energy', g: 'elec', lv: 1, t: 'Energy and cost', d: 'How many kWh a machine uses in a day and a year, and what it costs.', key: 'kWh cost price electricity bill',
    f: [N('p', 'Power', 'kW', 5.5), N('load', 'Average load', '%', 80), N('h', 'Hours per day', 'h', 16), N('days', 'Days per year', '', 250), N('price', 'Price per kWh', '', 0.15)],
    run(v) {
      const d = v.p * v.load / 100 * v.h, y = d * v.days;
      return { r: [['Energy per year', F(y, 0), 'kWh', 'big'], ['Energy per day', F(d, 1), 'kWh'], ['Cost per year', F(y * v.price, 0), '']],
        how: [`Per day = P × load × hours = ${F(v.p)} × ${F(v.load / 100)} × ${F(v.h)} = ${F(d, 1)} kWh`, `Per year = ${F(d, 1)} × ${F(v.days, 0)} = ${F(y, 0)} kWh`] };
    },
    tips: ['For a motor, the electrical power is the shaft power ÷ efficiency.'],
  });
  add({
    id: 'pfc', g: 'elec', lv: 3, t: 'Power factor correction', d: 'The capacitor power (kvar) to bring cos φ up to the target.', key: 'kvar capacitor cos phi reactive compensation',
    f: [N('p', 'Active power', 'kW', 50), N('c1', 'cos φ now', '', 0.75), N('c2', 'cos φ wanted', '', 0.95), N('u', 'Voltage (line to line)', 'V', 400), N('f', 'Frequency', 'Hz', 50)],
    run(v) {
      if (!(v.c1 > 0 && v.c1 <= 1 && v.c2 > 0 && v.c2 <= 1)) return E('cos φ must be between 0 and 1.');
      const t1 = Math.tan(Math.acos(v.c1)), t2 = Math.tan(Math.acos(v.c2)), q = v.p * (t1 - t2);
      const i1 = v.p * 1000 / (SQ3 * v.u * v.c1), i2 = v.p * 1000 / (SQ3 * v.u * v.c2), c = q * 1000 / (3 * 2 * PI * v.f * v.u * v.u) * 1e6;
      return { r: [['Capacitor power', F(q, 1), 'kvar', 'big'], ['Current before', F(i1, 1), 'A'], ['Current after', F(i2, 1), 'A'], ['Each capacitor (delta)', F(c, 0), 'µF']],
        how: [`Q = P × (tan φ1 − tan φ2) = ${F(v.p)} × (${F(t1, 3)} − ${F(t2, 3)}) = ${F(q, 1)} kvar`], warn: q < 0 ? ['The target is lower than the value now: no capacitor is needed.'] : [] };
    },
    tips: ['Less reactive current means a cooler cable and transformer, and no penalty on the bill.', 'With many drives in the plant ask a specialist: harmonics can damage capacitors.'],
  });
  add({
    id: 'trafo', g: 'elec', lv: 3, t: 'Transformer current and short circuit', d: 'Rated current of a transformer and the highest fault current behind it.', key: 'transformer kVA short circuit kA breaking capacity uk',
    f: [N('s', 'Transformer power', 'kVA', 630), N('u', 'Secondary voltage', 'V', 400), N('uk', 'Short-circuit voltage uk', '%', 4)],
    run(v) {
      if (!(v.u > 0 && v.uk > 0)) return E('Voltage and uk must be above 0.');
      const i = v.s * 1000 / (SQ3 * v.u), k = i * 100 / v.uk;
      return { r: [['Rated current', F(i, 0), 'A', 'big'], ['Short-circuit current at the terminals', F(k / 1000, 1), 'kA']],
        how: [`In = S ÷ (√3 × U) = ${F(v.s * 1000, 0)} ÷ (1.732 × ${F(v.u)}) = ${F(i, 0)} A`, `Ik = In × 100 ÷ uk = ${F(i, 0)} × 100 ÷ ${F(v.uk)} = ${F(k, 0)} A`] };
    },
    tips: ['Every breaker must be able to switch off the fault current at its place (breaking capacity in kA).', 'Cables make the fault current smaller further away. This value is the worst case, right at the transformer.'],
  });

  // ═════════════ Motors and drives ═════════════
  add({
    id: 'flc', g: 'motor', lv: 1, t: 'Motor current from kW', d: 'The full-load current of a motor when you only know its power.', key: 'motor full load current FLC amps nameplate kW hp',
    f: [S('ph', 'Motor', [['3', 'Three-phase'], ['1', 'Single-phase']], '3'), N('p', 'Power at the shaft', 'kW', 7.5), N('u', 'Voltage', 'V', 400), N('cos', 'Power factor cos φ', '', 0.85), N('eta', 'Efficiency', '%', 88)],
    run(v) {
      if (!(v.u > 0 && v.cos > 0 && v.cos <= 1 && v.eta > 0 && v.eta <= 100)) return E('Check the voltage, cos φ (0 to 1) and the efficiency (1 to 100 %).');
      const k = v.ph === '3' ? SQ3 : 1, i = v.p * 1000 / (k * v.u * v.cos * v.eta / 100);
      return { r: [['Full-load current', F(i, 1), 'A', 'big'], ['Electrical power in', F(v.p / (v.eta / 100)), 'kW'], ['Start current, direct on line (about 7 ×)', F(i * 7, 0), 'A'], ['Power in horsepower', F(v.p / 0.7457, 1), 'hp']],
        how: [`I = P ÷ (${v.ph === '3' ? '√3 × ' : ''}U × cos φ × η) = ${F(v.p * 1000, 0)} ÷ (${v.ph === '3' ? '1.732 × ' : ''}${F(v.u)} × ${F(v.cos)} × ${F(v.eta / 100)}) = ${F(i, 1)} A`] };
    },
    tips: ['If you have the nameplate, use the current written on it. This formula is for when you do not.', 'Quick check for 400 V three-phase: about 2 A for every kW.'],
  });
  add({
    id: 'speed', g: 'motor', lv: 1, t: 'Motor speed, slip and drive frequency', d: 'Speed of the field, slip, and the shaft speed at any drive frequency.', key: 'rpm poles synchronous slip VFD Hz frequency',
    f: [N('fn', 'Rated frequency', 'Hz', 50), S('poles', 'Poles', [['2', '2'], ['4', '4'], ['6', '6'], ['8', '8']], '4'), N('nn', 'Speed on the nameplate', 'rpm', 1450), N('f', 'Frequency from the drive', 'Hz', 35)],
    run(v) {
      const po = +v.poles, ns = 120 * v.fn / po, slip = ns - v.nn, nf = 120 * v.f / po;
      const w = [];
      if (slip < 0 || slip > ns * 0.15) w.push('The nameplate speed does not fit this number of poles. Check the poles.');
      if (v.f > v.fn) w.push('Above the rated frequency the motor gets weaker: the torque falls as the frequency rises.');
      return { r: [['Shaft speed at ' + F(v.f) + ' Hz', F(nf - slip, 0), 'rpm', 'big'], ['Field speed at rated frequency', F(ns, 0), 'rpm'], ['Slip', F(slip, 0) + ' rpm = ' + F(slip / ns * 100, 1), '%'], ['Field speed at ' + F(v.f) + ' Hz', F(nf, 0), 'rpm']],
        how: [`n field = 120 × f ÷ poles = 120 × ${F(v.fn)} ÷ ${po} = ${F(ns, 0)} rpm`, `Slip = ${F(ns, 0)} − ${F(v.nn, 0)} = ${F(slip, 0)} rpm`, `At ${F(v.f)} Hz: 120 × ${F(v.f)} ÷ ${po} − ${F(slip, 0)} = ${F(nf - slip, 0)} rpm`], warn: w };
    },
    tips: ['The slip in rpm stays about the same at the same load, at any frequency.', 'With less load the motor turns a little faster, close to the field speed.'],
  });
  add({
    id: 'torque', g: 'motor', lv: 1, t: 'Torque, power and speed', d: 'Torque of a motor from kW and rpm, or the power from torque.', key: 'Nm torque kW rpm 9550',
    f: [S('find', 'What do you want to find?', [['t', 'Torque'], ['p', 'Power']], 't'), N('p', 'Power', 'kW', 7.5, { show: (v) => v.find === 't' }), N('t', 'Torque', 'Nm', 50, { show: (v) => v.find === 'p' }), N('n', 'Speed', 'rpm', 1450)],
    run(v) {
      if (!(v.n > 0)) return E('The speed must be above 0.');
      if (v.find === 't') { const t = 9550 * v.p / v.n; return { r: [['Torque', F(t, 1), 'Nm', 'big']], how: [`T = 9550 × P ÷ n = 9550 × ${F(v.p)} ÷ ${F(v.n, 0)} = ${F(t, 1)} Nm`] }; }
      const p = v.t * v.n / 9550;
      return { r: [['Power', F(p), 'kW', 'big']], how: [`P = T × n ÷ 9550 = ${F(v.t)} × ${F(v.n, 0)} ÷ 9550 = ${F(p)} kW`] };
    },
    tips: ['Same power at a lower speed means more torque: that is what a gearbox does.', 'A drive in torque mode works with % of this rated torque.'],
  });
  add({
    id: 'stardelta', g: 'motor', lv: 2, t: 'Star-delta starter values', d: 'Start current, relay setting and contactor sizes for a star-delta starter.', key: 'star delta wye overload setting 0.58 contactor start current',
    f: [N('i', 'Motor current on the nameplate (delta)', 'A', 30), N('k', 'Start current, direct on line', '× In', 7)],
    run(v) {
      const i = v.i;
      return { r: [['Overload relay setting (relay in the motor winding line)', F(i * 0.58, 1), 'A', 'big'], ['Start current direct on line', F(i * v.k, 0), 'A'], ['Start current in star (one third)', F(i * v.k / 3, 0), 'A'],
        ['Main and delta contactor, at least', F(i * 0.58, 1), 'A'], ['Star contactor, at least', F(i / 3, 1), 'A'], ['Start torque in star', '33', '% of direct start']],
        how: [`Winding current = In ÷ √3 = ${F(i)} × 0.58 = ${F(i * 0.58, 1)} A`, `Star start current = ${F(i)} × ${F(v.k)} ÷ 3 = ${F(i * v.k / 3, 0)} A`] };
    },
    tips: ['If the overload relay sits in the supply line before the starter, set it to the full nameplate current.', 'Change to delta when the motor is near full speed, often after 5 to 10 s. Keep a short pause (about 50 ms) between star off and delta on.', 'Star gives only one third of the torque: a heavy load may not start.'],
  });
  add({
    id: 'gear', g: 'motor', lv: 2, t: 'Gearbox and belt speed', d: 'From motor rpm to belt speed, the torque after the gearbox, and the Hz for a speed you want.', key: 'gear ratio conveyor speed m/min drum roller VFD frequency',
    f: [N('n', 'Motor speed at rated frequency', 'rpm', 1450), N('i', 'Gear ratio (motor turns for 1 output turn)', '', 20), N('d', 'Drum or wheel diameter', 'mm', 200), N('eta', 'Gearbox efficiency', '%', 90), N('t', 'Motor torque', 'Nm', 10), N('fn', 'Rated frequency', 'Hz', 50), N('want', 'Speed you want (0 = skip)', 'm/min', 30)],
    run(v) {
      if (!(v.i > 0 && v.d > 0 && v.n > 0)) return E('Speed, ratio and diameter must be above 0.');
      const no = v.n / v.i, sp = PI * v.d / 1000 * no, to = v.t * v.i * v.eta / 100, fo = to / (v.d / 2000);
      const r = [['Belt speed at ' + F(v.fn) + ' Hz', F(sp, 1), 'm/min', 'big'], ['The same in m/s', F(sp / 60, 3), 'm/s'], ['Output speed', F(no, 1), 'rpm'], ['Output torque', F(to, 0), 'Nm'], ['Pull force at the drum', F(fo, 0), 'N']];
      const how = [`n out = n motor ÷ ratio = ${F(v.n, 0)} ÷ ${F(v.i)} = ${F(no, 1)} rpm`, `v = π × D × n out = 3.1416 × ${F(v.d / 1000, 3)} m × ${F(no, 1)} = ${F(sp, 1)} m/min`, `T out = T motor × ratio × η = ${F(v.t)} × ${F(v.i)} × ${F(v.eta / 100)} = ${F(to, 0)} Nm`];
      const w = [];
      if (v.want > 0) { const f = v.fn * v.want / sp; r.splice(1, 0, ['Frequency for ' + F(v.want) + ' m/min', F(f, 1), 'Hz']); how.push(`f = ${F(v.fn)} × ${F(v.want)} ÷ ${F(sp, 1)} = ${F(f, 1)} Hz`); if (f > v.fn) w.push('This speed needs more than the rated frequency: the motor gets weaker there. Better change the gear ratio.'); if (f < v.fn * 0.2) w.push('Very low frequency: a motor with its own fan cools badly below about 20 Hz. Use a separate fan or another ratio.'); }
      return { r, how, warn: w };
    },
    tips: ['A gearbox makes the speed smaller and the torque bigger by the same ratio.'],
  });
  add({
    id: 'accel', g: 'motor', lv: 3, t: 'Torque to accelerate', d: 'The extra torque a motor needs to bring a load up to speed in a given time.', key: 'inertia acceleration torque J ramp time',
    f: [N('j', 'Inertia at the motor shaft', 'kg·m²', 0.05), N('n', 'Speed change', 'rpm', 1450), N('t', 'Ramp time', 's', 1), N('tl', 'Load torque while running', 'Nm', 5)],
    run(v) {
      if (!(v.t > 0)) return E('The ramp time must be above 0.');
      const w = 2 * PI * v.n / 60, ta = v.j * w / v.t;
      return { r: [['Torque needed during the ramp', F(ta + v.tl, 1), 'Nm', 'big'], ['Only for accelerating', F(ta, 1), 'Nm'], ['Speed change', F(w, 1), 'rad/s']],
        how: [`ω = 2π × n ÷ 60 = ${F(w, 1)} rad/s`, `T acc = J × ω ÷ t = ${F(v.j, 4)} × ${F(w, 1)} ÷ ${F(v.t)} = ${F(ta, 1)} Nm`, `T total = ${F(ta, 1)} + ${F(v.tl)} = ${F(ta + v.tl, 1)} Nm`] };
    },
    tips: ['A ramp that is too short gives an overcurrent trip. A stop ramp that is too short gives an overvoltage trip.', 'A solid disc or roller: J = ½ × mass × radius². Behind a gearbox, divide the load inertia by ratio².'],
  });

  // ═════════════ Sizing the cabinet ═════════════
  add({
    id: 'cable', g: 'size', lv: 2, t: 'Cable size and voltage drop', d: 'The smallest copper cable that carries the current and keeps the voltage drop low.', key: 'cable cross section mm2 voltage drop wire size ampacity',
    f: [S('sys', 'Supply', [['3', 'Three-phase'], ['1', 'Single-phase AC'], ['dc', 'DC (for example 24 V)']], '3'), N('u', 'Voltage', 'V', 400), N('i', 'Current', 'A', 16), N('l', 'Cable length (one way)', 'm', 50),
      N('cos', 'Power factor cos φ', '', 0.85, { show: (v) => v.sys !== 'dc' }), N('max', 'Highest drop you accept', '%', 5), S('m', 'How the cable is laid', METHODS, 'B2')],
    run(v) {
      if (!(v.u > 0 && v.i > 0 && v.l >= 0)) return E('Voltage and current must be above 0.');
      const k = v.sys === '3' ? SQ3 : 2, c = v.sys === 'dc' ? 1 : v.cos, amp = AMP[v.m];
      const drop = (a) => k * v.l * v.i * c / (KAPPA * a);
      const ia = amp.findIndex((x) => x >= v.i), id = CSA.findIndex((a) => drop(a) / v.u * 100 <= v.max);
      if (ia < 0 || id < 0) return E('Bigger than 120 mm². Use cables in parallel or a busbar, and ask an electrical engineer.');
      const n = Math.max(ia, id), a = CSA[n], d = drop(a);
      return { r: [['Cable size', F(a), 'mm²', 'big'], ['Voltage drop', F(d) + ' V = ' + F(d / v.u * 100), '%'], ['This size may carry', F(amp[n], 1), 'A'], ['Needed for the current alone', F(CSA[ia]), 'mm²'], ['Needed for the drop alone', F(CSA[id]), 'mm²']],
        how: [`ΔU = ${v.sys === '3' ? '√3' : '2'} × L × I${v.sys === 'dc' ? '' : ' × cos φ'} ÷ (56 × A)`, `ΔU = ${v.sys === '3' ? '1.732' : '2'} × ${F(v.l)} × ${F(v.i)}${v.sys === 'dc' ? '' : ' × ' + F(c)} ÷ (56 × ${F(a)}) = ${F(d)} V`, `In percent: ${F(d)} ÷ ${F(v.u)} × 100 = ${F(d / v.u * 100)} %`],
        warn: v.sys === 'dc' && v.u <= 30 && d / v.u > 0.1 ? ['More than 10 % drop on 24 V: sensors and valves at the end may not work.'] : [], x: { a, d } };
    },
    tips: ['Current values: copper with PVC, air at 40 °C, as in the machine standard IEC 60204-1. Many cables together or more heat: take a bigger size.', 'The fuse or breaker must not be bigger than what the cable may carry.', 'A long 24 V cable is almost always chosen by the drop, not by the current.', 'Always check the rules of your country before you order.'],
  });
  add({
    id: 'starter', g: 'size', lv: 2, t: 'Parts for a direct-on-line starter', d: 'Motor current, overload setting, contactor, motor breaker and cable for one motor.', key: 'DOL contactor size AC-3 overload relay motor protection breaker MPCB selection',
    f: [N('p', 'Motor power', 'kW', 7.5), N('u', 'Voltage (three-phase)', 'V', 400), N('cos', 'Power factor cos φ', '', 0.85), N('eta', 'Efficiency', '%', 88)],
    run(v) {
      if (!(v.u > 0 && v.cos > 0 && v.cos <= 1 && v.eta > 0 && v.eta <= 100)) return E('Check the voltage, cos φ (0 to 1) and the efficiency (1 to 100 %).');
      const i = v.p * 1000 / (SQ3 * v.u * v.cos * v.eta / 100);
      const AC3 = [6, 9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 265, 330, 400];
      const MP = [[0.1, 0.16], [0.16, 0.25], [0.25, 0.4], [0.4, 0.63], [0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6.3], [6, 10], [9, 14], [13, 18], [17, 23], [20, 25], [24, 32], [32, 40], [40, 50], [50, 63], [63, 80], [80, 100]];
      const k = nextStd(AC3, i), mp = MP.find((x) => i >= x[0] && i <= x[1]), ia = AMP.B2.findIndex((x) => x >= i);
      return { r: [['Motor current', F(i, 1), 'A', 'big'], ['Overload relay: set to', F(i, 1), 'A'], ['Contactor (AC-3), typical size', k ? F(k) : 'ask the maker', k ? 'A' : ''], ['Motor breaker, typical range', mp ? F(mp[0]) + ' … ' + F(mp[1]) : 'bigger than 100', 'A'],
        ['Cable for the current alone (in a duct)', ia >= 0 ? F(CSA[ia]) : 'more than 120', 'mm²'], ['Start current (about 7 ×)', F(i * 7, 0), 'A']],
        how: [`I = P ÷ (√3 × U × cos φ × η) = ${F(v.p * 1000, 0)} ÷ (1.732 × ${F(v.u)} × ${F(v.cos)} × ${F(v.eta / 100)}) = ${F(i, 1)} A`, 'Overload setting = the motor current. Contactor and breaker: the next standard size.'] };
    },
    tips: ['Use the current on the real nameplate when you have it.', 'AC-3 is the rating for starting a normal motor. For jogging or plugging (AC-4) take a much bigger contactor.', 'Sizes are typical catalogue steps. Check the catalogue, and check the cable for voltage drop with the cable calculator.'],
  });
  add({
    id: 'psu24', g: 'size', lv: 2, t: '24 V power supply size', d: 'Add up everything on the 24 V and pick the power supply with reserve.', key: '24V DC power supply sizing load budget amps PSU',
    f: [N('cpu', 'PLC with its modules', 'mA', 600), N('hmi', 'HMI panel', 'mA', 500), N('di', 'Inputs that can be on together', '', 16), N('dim', 'Current of one input', 'mA', 5), N('sn', 'Sensors', '', 10), N('sm', 'Current of one sensor', 'mA', 25),
      N('rn', 'Relays and small contactors on together', '', 8), N('rm', 'Current of one coil', 'mA', 20), N('vn', 'Valves on together', '', 6), N('vw', 'Power of one valve coil', 'W', 3), N('ln', 'Lamps', '', 4), N('lm', 'Current of one lamp', 'mA', 50), N('oth', 'Everything else', 'mA', 0), N('res', 'Reserve', '%', 25)],
    run(v) {
      const parts = [['PLC', v.cpu], ['HMI', v.hmi], ['inputs', v.di * v.dim], ['sensors', v.sn * v.sm], ['coils', v.rn * v.rm], ['valves', v.vn * v.vw / 24 * 1000], ['lamps', v.ln * v.lm], ['other', v.oth]];
      const t = parts.reduce((a, b) => a + b[1], 0) / 1000, need = t * (1 + v.res / 100), std = nextStd([0.6, 1.3, 2.5, 5, 10, 20, 40], need);
      return { r: [['Power supply', std ? F(std) : 'more than 40: split into two supplies', std ? 'A' : '', 'big'], ['Load now', F(t), 'A'], ['With reserve', F(need), 'A'], ['Power', F(need * 24, 0), 'W']],
        how: [parts.filter((p) => p[1] > 0).map((p) => p[0] + ' ' + F(p[1], 0)).join(' + ') + ' = ' + F(t * 1000, 0) + ' mA', `Valve current = W ÷ 24 V. With ${F(v.res)} % reserve: ${F(t)} × ${F(1 + v.res / 100)} = ${F(need)} A`] };
    },
    tips: ['Take the real values from the datasheets: this is where most mistakes come from.', 'Keep 20 to 30 % reserve for later changes and for the start current of the loads.', 'Put outputs and valves on their own fuse or electronic breaker, so one short circuit does not switch off the PLC.'],
  });
  add({
    id: 'heat', g: 'size', lv: 3, t: 'Cabinet heat: fan or cooler', d: 'Will the cabinet stay cool by itself, or does it need a fan or a cooling unit?', key: 'enclosure heat loss cooling fan airflow m3/h thermal temperature rise',
    f: [N('w', 'Width', 'mm', 800), N('h', 'Height', 'mm', 2000), N('d', 'Depth', 'mm', 600), S('mnt', 'Where it stands', [['free', 'Free on all sides'], ['wall', 'Back against a wall']], 'free'),
      S('k', 'Cabinet material', [['5.5', 'Painted steel'], ['4.5', 'Stainless steel'], ['12', 'Aluminium'], ['3.5', 'Plastic']], '5.5'), N('pv', 'Heat made inside', 'W', 600), N('ti', 'Highest temperature allowed inside', '°C', 35), N('tu', 'Highest temperature outside', '°C', 25)],
    run(v) {
      const W = v.w / 1000, H = v.h / 1000, D = v.d / 1000, k = +v.k;
      if (!(W > 0 && H > 0 && D > 0)) return E('Give the three sizes of the cabinet.');
      const a = v.mnt === 'free' ? 1.8 * H * (W + D) + 1.4 * W * D : 1.4 * W * (H + D) + 1.8 * D * H;
      const dt = v.ti - v.tu, wall = k * a * dt, tin = v.tu + v.pv / (k * a), rest = v.pv - wall;
      const r = [], how = [`Surface A = ${F(a)} m² (formula for this way of standing)`, `Heat through the walls = k × A × ΔT = ${F(k)} × ${F(a)} × ${F(dt)} = ${F(wall, 0)} W`, `Inside without cooling = outside + P ÷ (k × A) = ${F(v.tu)} + ${F(v.pv / (k * a), 1)} = ${F(tin, 1)} °C`];
      if (rest <= 0) r.push(['Cooling needed', 'none', '', 'big ok']);
      else if (dt >= 5) { const q = 3.1 * rest / dt; r.push(['Fan with filter, air flow at least', F(q, 0), 'm³/h', 'big']); how.push(`Air flow = 3.1 × rest heat ÷ ΔT = 3.1 × ${F(rest, 0)} ÷ ${F(dt)} = ${F(q, 0)} m³/h`); }
      else { r.push(['Cooling unit, at least', F(rest, 0), 'W', 'big']); how.push(`Cooling power = heat inside − heat through the walls = ${F(v.pv, 0)} − ${F(wall, 0)} = ${F(rest, 0)} W`); }
      r.push(['Temperature inside without cooling', F(tin, 1), '°C'], ['Heat leaving through the walls', F(wall, 0), 'W'], ['Cooling surface', F(a), 'm²']);
      return { r, how, warn: rest > 0 && dt < 5 ? ['The air outside is not at least 5 °C cooler than the limit inside: a fan cannot do it, you need a cooling unit.'] : [] };
    },
    tips: ['Heat made inside: a drive loses about 3 % of its power as heat, a power supply about 10 %, a PLC rack 20 to 50 W. Add the values from the datasheets.', 'A fan only works when the air outside is cooler and clean enough.', 'Every 10 °C cooler doubles the life of the electronics.'],
  });
  add({
    id: 'ups', g: 'size', lv: 2, t: 'Battery and UPS run time', d: 'How long a battery keeps the PLC or the HMI alive after a power cut.', key: 'UPS battery Ah backup runtime buffer',
    f: [N('u', 'Battery voltage', 'V', 24), N('ah', 'Battery capacity', 'Ah', 7), N('p', 'Load', 'W', 60), N('eta', 'Efficiency of the UPS', '%', 85), N('use', 'Part of the battery you may use', '%', 80)],
    run(v) {
      if (!(v.p > 0)) return E('The load must be above 0.');
      const wh = v.u * v.ah * v.use / 100 * v.eta / 100, h = wh / v.p;
      return { r: [['Run time', span(h * 3600), '', 'big'], ['Usable energy', F(wh, 0), 'Wh'], ['Battery current', F(v.p / (v.eta / 100) / v.u, 1), 'A']],
        how: [`Energy = U × Ah × usable × η = ${F(v.u)} × ${F(v.ah)} × ${F(v.use / 100)} × ${F(v.eta / 100)} = ${F(wh, 0)} Wh`, `Time = ${F(wh, 0)} ÷ ${F(v.p)} = ${F(h, 2)} h`] };
    },
    tips: ['A battery emptied fast gives less than its Ah value. Old or cold batteries give less too: plan with half.', 'Most PLCs only need a few seconds: enough to save data and stop cleanly.'],
  });
  add({
    id: 'io', g: 'size', lv: 1, t: 'I/O count and cards', d: 'From the signal list to the number of cards, with spare channels.', key: 'IO list cards modules spare channels DI DO AI AO',
    f: [N('di', 'Digital inputs', '', 46), N('do', 'Digital outputs', '', 30), N('ai', 'Analog inputs', '', 6), N('ao', 'Analog outputs', '', 2), N('sp', 'Spare', '%', 20),
      S('cdi', 'Channels on a DI card', [['8', '8'], ['16', '16'], ['32', '32']], '16'), S('cdo', 'Channels on a DO card', [['8', '8'], ['16', '16'], ['32', '32']], '16'), S('cai', 'Channels on an AI card', [['2', '2'], ['4', '4'], ['8', '8']], '8'), S('cao', 'Channels on an AO card', [['2', '2'], ['4', '4'], ['8', '8']], '4')],
    run(v) {
      const one = (n, c) => { const need = Math.ceil(n * (1 + v.sp / 100)), cards = n > 0 ? Math.ceil(need / c) : 0; return [need, cards, cards * c - n]; };
      const a = one(v.di, +v.cdi), b = one(v.do, +v.cdo), c = one(v.ai, +v.cai), d = one(v.ao, +v.cao);
      const row = (name, x) => [name, x[1] + (x[1] === 1 ? ' card' : ' cards'), '(' + x[2] + ' free channels)'];
      return { r: [['Cards in total', String(a[1] + b[1] + c[1] + d[1]), '', 'big'], row('Digital inputs', a), row('Digital outputs', b), row('Analog inputs', c), row('Analog outputs', d)],
        how: [`Channels needed = signals × (1 + spare), rounded up: DI ${a[0]}, DO ${b[0]}, AI ${c[0]}, AO ${d[0]}`, 'Cards = channels needed ÷ channels on one card, rounded up'] };
    },
    tips: ['Keep 10 to 20 % spare: every machine gets more sensors later.', 'Count safety signals apart: they go to safety cards or a safety relay.', 'Leave free slots in the rack and free space on the rail too.'],
  });

  // ═════════════ Analog signals and sensors ═════════════
  const RAWS = { s7: [0, 27648], s74: [5530, 27648], r15: [0, 32767], r12: [0, 4095], r8k: [0, 8000], r10k: [0, 10000], r16: [0, 65535] };
  add({
    id: 'scale', g: 'sig', lv: 1, t: 'Analog scaling', d: 'Turn the raw number of an analog card into bar, °C or %, and back.', key: 'scale raw 27648 32767 engineering units NORM_X SCALE_X SCP linear',
    f: [S('dir', 'Direction', [['r', 'Raw number → real value'], ['e', 'Real value → raw number']], 'r'),
      S('raw', 'Raw range of the card', [['s7', '0 … 27648'], ['s74', '5530 … 27648 (4–20 mA on a 0–20 mA channel)'], ['r15', '0 … 32767'], ['r12', '0 … 4095 (12 bit)'], ['r8k', '0 … 8000'], ['r10k', '0 … 10000'], ['r16', '0 … 65535'], ['own', 'My own range']], 's7'),
      N('r0', 'Raw at the low end', '', 0, { show: (v) => v.raw === 'own' }), N('r1', 'Raw at the high end', '', 27648, { show: (v) => v.raw === 'own' }), N('e0', 'Real value at the low end', '', 0), N('e1', 'Real value at the high end', '', 100), N('x', 'Value to convert', '', 13824)],
    run(v) {
      const rr = RAWS[v.raw] || [v.r0, v.r1], r0 = rr[0], r1 = rr[1];
      if (r1 === r0 || v.e1 === v.e0) return E('The low end and the high end cannot be the same.');
      const k = (v.e1 - v.e0) / (r1 - r0), b = v.e0 - k * r0;
      const w = [];
      let out, pct, how;
      if (v.dir === 'r') { out = k * v.x + b; pct = (v.x - r0) / (r1 - r0) * 100; how = `Value = (raw − ${F(r0)}) × (${F(v.e1)} − ${F(v.e0)}) ÷ (${F(r1)} − ${F(r0)}) + ${F(v.e0)} = ${F(out, 3)}`; }
      else { out = (v.x - b) / k; pct = (v.x - v.e0) / (v.e1 - v.e0) * 100; how = `Raw = (value − ${F(v.e0)}) × (${F(r1)} − ${F(r0)}) ÷ (${F(v.e1)} − ${F(v.e0)}) + ${F(r0)} = ${F(out, 0)}`; }
      if (pct < 0 || pct > 100) w.push('The value is outside the range. In the PLC, limit it and raise an alarm.');
      return { r: [[v.dir === 'r' ? 'Real value' : 'Raw number', F(out, v.dir === 'r' ? 3 : 0), '', 'big'], ['Position in the range', F(pct, 1), '%'], ['One raw step is', F(Math.abs(k), 5), 'units']],
        how: [how, `Short form: value = ${F(k, 6)} × raw ${b < 0 ? '−' : '+'} ${F(Math.abs(b), 4)}`, `In ST: Value := (INT_TO_REAL(Raw) - ${F(r0)}.0) * ${F(v.e1 - v.e0)} / ${F(r1 - r0)}.0 + ${F(v.e0)};`], warn: w, x: { pct, r0, r1, raw: v.dir === 'r' ? v.x : out, val: v.dir === 'r' ? out : v.x } };
    },
    tips: ['Do the maths in REAL. In whole numbers, multiply first and divide last, or the result loses its decimals.', 'A reversed signal is no problem: give the bigger real value at the low end.', 'The raw range is in the manual of the card. It is not the same for every card.'],
  });
  add({
    id: 'ma', g: 'sig', lv: 1, t: '4–20 mA to value', d: 'What a 4–20 mA signal means in bar, °C or %, and what the meter must show.', key: '4-20 mA current loop transmitter percent wire break NAMUR',
    f: [S('dir', 'Direction', [['m', 'mA → value'], ['v', 'Value → mA']], 'm'), N('lo', 'Value at 4 mA', '', 0), N('hi', 'Value at 20 mA', '', 10), N('x', 'Number to convert', '', 12)],
    run(v) {
      if (v.hi === v.lo) return E('The values at 4 mA and at 20 mA cannot be the same.');
      const ma = v.dir === 'm' ? v.x : 4 + (v.x - v.lo) / (v.hi - v.lo) * 16, val = v.dir === 'm' ? v.lo + (v.x - 4) / 16 * (v.hi - v.lo) : v.x, pct = (ma - 4) / 16 * 100;
      const st = ma < 3.6 ? ['Broken wire or dead transmitter', 'bad'] : ma < 3.8 ? ['Below the range', 'bad'] : ma <= 20.5 ? ['Good signal', 'ok'] : ma < 21 ? ['Above the range', 'bad'] : ['Fault signal or short circuit', 'bad'];
      return { r: [v.dir === 'm' ? ['Value', F(val, 3), '', 'big'] : ['Current', F(ma, 3), 'mA', 'big'], ['Position in the range', F(pct, 1), '%'], ['Voltage on a 250 Ω resistor', F(ma * 0.25, 3), 'V'], ['Signal check', st[0], '', st[1]]],
        how: [v.dir === 'm' ? `Value = low + (mA − 4) ÷ 16 × (high − low) = ${F(v.lo)} + (${F(ma)} − 4) ÷ 16 × ${F(v.hi - v.lo)} = ${F(val, 3)}` : `mA = 4 + (value − low) ÷ (high − low) × 16 = 4 + ${F(v.x - v.lo)} ÷ ${F(v.hi - v.lo)} × 16 = ${F(ma, 3)}`] };
    },
    tips: ['4 mA is the zero, so 0 mA can only mean a fault. That is why 4–20 mA is used.', 'Quick points to test a loop: 4 mA = 0 %, 8 = 25 %, 12 = 50 %, 16 = 75 %, 20 = 100 %.', 'Below about 3.6 mA or above about 21 mA the transmitter reports a fault.'],
  });
  add({
    id: 'resol', g: 'sig', lv: 2, t: 'Analog resolution', d: 'The smallest change an analog card can see, in volts or mA and in real units.', key: 'bits resolution ADC 12 bit 16 bit steps accuracy',
    f: [S('bits', 'Resolution of the card', [['8', '8 bit'], ['10', '10 bit'], ['12', '12 bit'], ['13', '13 bit'], ['14', '14 bit'], ['15', '15 bit'], ['16', '16 bit']], '12'), N('sig', 'Signal span (10 for 0–10 V, 16 for 4–20 mA)', 'V or mA', 10), N('eng', 'Measuring span of the sensor', 'units', 100)],
    run(v) {
      const steps = Math.pow(2, +v.bits);
      return { r: [['Smallest step in real units', F(v.eng / steps, 4), 'units', 'big'], ['Steps', F(steps, 0), ''], ['Smallest signal step', F(v.sig / steps * 1000, 3), 'mV or µA']],
        how: [`Steps = 2^${v.bits} = ${F(steps, 0)}`, `Step = span ÷ steps = ${F(v.eng)} ÷ ${F(steps, 0)} = ${F(v.eng / steps, 4)} units`] };
    },
    tips: ['Resolution is not accuracy: a 16-bit card with a poor sensor is still poor.', 'The last digits always move a little because of noise. Filter the value before you show it.', 'Pick a sensor range close to what you really measure: a 0–100 bar sensor on a 0–5 bar line wastes most of the steps.'],
  });
  add({
    id: 'loop', g: 'sig', lv: 2, t: 'Current loop: is the supply enough?', d: 'Check that a 2-wire transmitter still gets enough voltage at the end of a long cable.', key: 'loop resistance burden 2-wire transmitter supply voltage cable length',
    f: [N('us', 'Supply voltage', 'V', 24), N('um', 'Lowest voltage the transmitter needs', 'V', 10.5), N('rin', 'Resistance of the analog input', 'Ω', 250), N('l', 'Cable length (one way)', 'm', 300), N('a', 'Wire size', 'mm²', 0.5)],
    run(v) {
      if (!(v.a > 0)) return E('The wire size must be above 0.');
      const rc = 2 * v.l / (KAPPA * v.a), i = 0.022, left = v.us - i * (v.rin + rc), rmax = (v.us - v.um) / i;
      return { r: [['Voltage left for the transmitter at 22 mA', F(left), 'V', 'big ' + (left >= v.um ? 'ok' : 'bad')], ['Cable resistance (both wires)', F(rc, 1), 'Ω'], ['Highest total resistance allowed', F(rmax, 0), 'Ω'], ['Resistance in this loop', F(v.rin + rc, 0), 'Ω']],
        how: [`R cable = 2 × L ÷ (56 × A) = 2 × ${F(v.l)} ÷ (56 × ${F(v.a)}) = ${F(rc, 1)} Ω`, `U left = U supply − 0.022 A × (R input + R cable) = ${F(v.us)} − 0.022 × ${F(v.rin + rc, 1)} = ${F(left)} V`],
        warn: left < v.um ? ['Not enough voltage: the signal will stop rising before 20 mA. Use a thicker wire, a higher supply or an input with less resistance.'] : [] };
    },
    tips: ['The check uses 22 mA, the highest current a transmitter sends when it reports a fault.', 'The cable length changes the voltage, not the reading: that is the strength of a current signal.'],
  });
  const PT = { A: 3.9083e-3, B: -5.775e-7, C: -4.183e-12 };
  const ptR = (t, r0) => r0 * (1 + PT.A * t + PT.B * t * t + (t < 0 ? PT.C * (t - 100) * t * t * t : 0));
  add({
    id: 'pt100', g: 'sig', lv: 2, t: 'Pt100 and Pt1000', d: 'Resistance of the sensor at a temperature, or the temperature from the ohms you measure.', key: 'RTD Pt100 Pt1000 resistance temperature ohm 138.5',
    f: [S('typ', 'Sensor', [['100', 'Pt100'], ['1000', 'Pt1000']], '100'), S('dir', 'Direction', [['t', 'Temperature → ohms'], ['r', 'Ohms → temperature']], 't'), N('x', 'Number to convert', '', 100), N('rc', 'Cable resistance, both wires (2-wire only)', 'Ω', 0)],
    run(v) {
      const r0 = +v.typ;
      let t, r;
      if (v.dir === 't') { t = v.x; r = ptR(t, r0); }
      else {
        r = v.x; t = (r / r0 - 1) / PT.A;
        for (let i = 0; i < 30; i++) { const d = (ptR(t + 0.01, r0) - ptR(t - 0.01, r0)) / 0.02; t -= (ptR(t, r0) - r) / d; }
      }
      if (t < -200 || t > 850 || !isFinite(t)) return E('Outside the range of a Pt sensor (−200 to 850 °C).');
      const sens = (ptR(t + 0.5, r0) - ptR(t - 0.5, r0));
      const res = [v.dir === 't' ? ['Resistance', F(r, 2), 'Ω', 'big'] : ['Temperature', F(t, 1), '°C', 'big'], ['Change for 1 °C here', F(sens, 3), 'Ω']];
      if (v.rc > 0) res.push(['Error from the cable with 2 wires', '+' + F(v.rc / sens, 1), '°C', 'bad']);
      return { r: res, how: [`R = R0 × (1 + A × t + B × t²), with R0 = ${r0} Ω, A = 0.0039083, B = −0.0000005775`, `At ${F(t, 1)} °C: R = ${F(r, 2)} Ω`] };
    },
    tips: ['Easy points for Pt100: 0 °C = 100 Ω, 100 °C = 138.5 Ω. About 0.385 Ω for each °C.', 'With 2 wires the cable is measured too and the reading is too high. Use 3 or 4 wires.', 'Reading around 0 Ω: short circuit. Reading far too high: broken wire.'],
  });
  add({
    id: 'loadcell', g: 'sig', lv: 3, t: 'Load cell signal', d: 'The millivolts a weighing system gives, and how small one step of weight is.', key: 'load cell mV/V weighing scale strain gauge excitation',
    f: [N('cap', 'Capacity of one cell', 'kg', 500), N('n', 'Cells under the tank or platform', '', 4), N('s', 'Sensitivity', 'mV/V', 2), N('ex', 'Excitation voltage', 'V', 10), N('w', 'Weight on the scale now', 'kg', 800), N('d', 'Step you want to show', 'kg', 0.1)],
    run(v) {
      const tot = v.cap * v.n, full = v.s * v.ex, sig = full * v.w / tot;
      if (!(tot > 0)) return E('Capacity and number of cells must be above 0.');
      return { r: [['Signal now', F(sig, 3), 'mV', 'big'], ['Total capacity', F(tot, 0), 'kg'], ['Signal at full capacity', F(full, 2), 'mV'], ['Signal for one step of ' + F(v.d) + ' kg', F(full / tot * v.d * 1000, 2), 'µV'], ['Load on the cells', F(v.w / tot * 100, 0), '%']],
        how: [`Full signal = sensitivity × excitation = ${F(v.s)} × ${F(v.ex)} = ${F(full, 2)} mV`, `Signal = full signal × weight ÷ capacity = ${F(full, 2)} × ${F(v.w)} ÷ ${F(tot, 0)} = ${F(sig, 3)} mV`],
        warn: v.w > tot ? ['Overload: the weight is above the capacity of the cells.'] : full / tot * v.d * 1000 < 0.5 ? ['One step is under 0.5 µV: too small for most weighing modules. Use a bigger step or smaller cells.'] : [] };
    },
    tips: ['The weight now includes the empty tank or platform.', 'Cells in parallel: the capacities add up, the mV/V stays the same.', 'These signals are tiny: use a weighing module, a shielded cable and keep it away from motor cables.'],
  });
  add({
    id: 'flow', g: 'sig', lv: 2, t: 'Flow from pulses and totalizer', d: 'Flow from a pulse flow meter, and what to add to the total in every PLC cycle.', key: 'flow meter pulses K-factor litres totalizer l/min',
    f: [N('k', 'Pulses for one litre (K-factor)', '', 100), N('f', 'Pulse frequency', 'Hz', 50), N('cyc', 'Cycle time of the block that adds', 'ms', 10)],
    run(v) {
      if (!(v.k > 0)) return E('The K-factor must be above 0.');
      const ls = v.f / v.k, fmax = v.cyc > 0 ? 1000 / (2 * v.cyc) : Infinity;
      return { r: [['Flow', F(ls * 60), 'l/min', 'big'], ['The same in m³/h', F(ls * 3.6, 3), 'm³/h'], ['Volume of one pulse', F(1000 / v.k, 2), 'ml'], ['Add in every cycle', F(ls * v.cyc / 1000, 5), 'l']],
        how: [`Flow = frequency ÷ K = ${F(v.f)} ÷ ${F(v.k)} = ${F(ls, 4)} l/s = ${F(ls * 60)} l/min`, `Per cycle = flow in l/s × cycle time = ${F(ls, 4)} × ${F(v.cyc / 1000, 3)} = ${F(ls * v.cyc / 1000, 5)} l`],
        warn: v.f >= fmax ? [`${F(v.f)} Hz is too fast for a normal input with this cycle (limit about ${F(fmax, 0)} Hz). Use a high-speed counter.`] : [] };
    },
    tips: ['Best total: count the pulses and divide by K. No rounding error.', 'If you add flow × time instead, do it in a block with a fixed cycle and keep the total in an LREAL, or count whole litres in a DINT. A big REAL stops counting small amounts.'],
  });
  add({
    id: 'dpflow', g: 'sig', lv: 3, t: 'Flow from differential pressure', d: 'Flow through an orifice plate from the pressure difference (square root).', key: 'orifice differential pressure square root extraction dp flow',
    f: [N('dp', 'Pressure difference now', '', 25), N('dpm', 'Pressure difference at full flow', '', 100), N('qm', 'Full flow', '', 100)],
    run(v) {
      if (!(v.dpm > 0)) return E('The pressure at full flow must be above 0.');
      const q = v.qm * Math.sqrt(Math.max(0, v.dp) / v.dpm);
      return { r: [['Flow', F(q), '', 'big'], ['Pressure signal', F(v.dp / v.dpm * 100, 1), '%'], ['Flow in percent', F(q / v.qm * 100, 1), '%']],
        how: [`Q = Q full × √(Δp ÷ Δp full) = ${F(v.qm)} × √(${F(v.dp)} ÷ ${F(v.dpm)}) = ${F(q)}`] };
    },
    tips: ['25 % pressure is already 50 % flow.', 'Do the square root only once: in the transmitter or in the PLC, never in both.', 'Below about 10 % flow the signal is too small to trust: set the flow to 0 there.'],
  });

  // ═════════════ Numbers, addresses and units ═════════════
  add({
    id: 'num', g: 'num', lv: 1, t: 'Number converter', d: 'One number as decimal, hex, binary, signed, BCD and bits.', key: 'hex binary decimal BCD signed convert bits 16# 2#',
    f: [X('x', 'Number (123, -5, 16#FF, 0xFF, 2#1010)', '16#00FF', '16#00FF'), S('bits', 'Size', [['8', 'Byte (8 bit)'], ['16', 'Word (16 bit)'], ['32', 'Double word (32 bit)']], '16')],
    run(v) {
      const n = parseNum(v.x), b = +v.bits, M = Math.pow(2, b);
      if (isNaN(n)) return E('Write a whole number: 123, -5, 16#FF, 0xFF or 2#1010.');
      if (n >= M || n < -M / 2) return E('This number does not fit in ' + b + ' bits.');
      const u = ((n % M) + M) % M, sg = u >= M / 2 ? u - M : u, hx = hex(u, b / 4);
      const on = []; for (let i = 0; i < b; i++) if (Math.floor(u / Math.pow(2, i)) % 2) on.push(i);
      const asBcd = /^[0-9]+$/.test(hx) ? String(parseInt(hx, 10)) : 'not a BCD number';
      const lim = Math.pow(10, b / 4), toBcd = n >= 0 && n < lim ? '16#' + String(n).padStart(b / 4, '0') : 'does not fit';
      const r = [['Hex', '16#' + hx, '', 'big'], ['Decimal, no sign', String(u), ''], ['Decimal, with sign', String(sg), ''], ['Binary', bin(u, b), ''], ['Bits that are 1', on.length ? on.join(', ') : 'none', ''],
        ['Read as BCD', asBcd, ''], ['The decimal number written in BCD', toBcd, '']];
      if (b > 8) { let sw = ''; for (let i = hx.length - 2; i >= 0; i -= 2) sw += hx.substr(i, 2); r.push(['Bytes swapped', '16#' + sw, '']); }
      return { r, how: ['Each hex digit is 4 bits. Bit 0 is on the right.', 'With sign: if the top bit is 1, the value is the number − ' + F(M, 0) + '.'] };
    },
    tips: ['16#FFFF is 65535 without a sign and −1 with a sign: the same bits, read in two ways.', 'BCD keeps every decimal digit in its own 4 bits. Old displays and thumbwheel switches use it.'],
  });
  add({
    id: 'real', g: 'num', lv: 2, t: 'REAL and Modbus words', d: 'A decimal number as two 16-bit words, and back, in every byte order.', key: 'float REAL IEEE 754 Modbus two registers word swap byte order ABCD CDAB',
    f: [S('dir', 'Direction', [['n', 'Number → words'], ['w', 'Words → number']], 'n'), X('x', 'Number', '123.456', '123.456', { show: (v) => v.dir === 'n' }), X('h', 'The two words in hex', '42F6 E979', '42F6 E979', { show: (v) => v.dir === 'w' })],
    run(v) {
      let u;
      if (v.dir === 'n') { const x = parseFloat(String(v.x).replace(',', '.')); if (isNaN(x)) return E('Write a number, for example 123.456.'); u = f32bits(x); }
      else { const s = String(v.h).replace(/16#|0x|[\s_,]/gi, ''); if (!/^[0-9a-f]{8}$/i.test(s)) return E('Write 8 hex digits, for example 42F6 E979.'); u = parseInt(s, 16) >>> 0; }
      const b = [u >>> 24, (u >>> 16) & 255, (u >>> 8) & 255, u & 255], mk = (o) => ((b[o[0]] << 24) | (b[o[1]] << 16) | (b[o[2]] << 8) | b[o[3]]) >>> 0;
      const hi = u >>> 16, lo = u & 0xFFFF, val = bitsF32(u);
      const ord = [['high word first (ABCD)', [0, 1, 2, 3]], ['low word first (CDAB)', [2, 3, 0, 1]], ['bytes swapped (BADC)', [1, 0, 3, 2]], ['all reversed (DCBA)', [3, 2, 1, 0]]];
      const r = v.dir === 'n' ? [['Hex', '16#' + hex(u, 8), '', 'big'], ['High word', '16#' + hex(hi, 4) + ' = ' + hi, ''], ['Low word', '16#' + hex(lo, 4) + ' = ' + lo, ''], ['Value really stored', F(val, 6), '']]
        : [['Number, ' + ord[0][0], F(val, 6), '', 'big']].concat(ord.slice(1).map((o) => ['Number, ' + o[0], F(bitsF32(mk(o[1])), 6), '']));
      return { r, how: ['A REAL is 32 bits: 1 bit sign, 8 bits exponent, 23 bits digits (IEEE 754).', 'Modbus sends 16 bits per register, so a REAL takes two registers.'] };
    },
    tips: ['A crazy value such as 1.6e-41 or 6.2e+27 almost always means the word order is wrong: try the other orders.', 'A REAL keeps about 7 digits. 123.456 is really stored as 123.456001.'],
  });
  add({
    id: 'bits', g: 'num', lv: 2, t: 'Bit logic and masks', d: 'AND, OR, XOR, NOT and shifts on two words, to build and test masks.', key: 'AND OR XOR NOT shift rotate mask bit test SHL SHR ROL',
    f: [X('a', 'A', '16#00F3', '16#00F3'), X('b', 'B (the mask)', '16#000F', '16#000F'), N('n', 'Shift or bit number', '', 4)],
    run(v) {
      const a = parseNum(v.a), b = parseNum(v.b), n = Math.round(v.n);
      if (isNaN(a) || isNaN(b) || a < 0 || b < 0 || a > 65535 || b > 65535) return E('A and B must be words: 0 to 65535, or 16#0000 to 16#FFFF.');
      if (n < 0 || n > 15) return E('The shift or bit number must be 0 to 15.');
      const w = (x) => '16#' + hex(x & 0xFFFF, 4) + '   ' + bin(x & 0xFFFF, 16);
      return { r: [['A AND B', w(a & b), '', 'big'], ['A OR B', w(a | b), ''], ['A XOR B', w(a ^ b), ''], ['NOT A', w(~a), ''], ['A shifted left by ' + n, w(a << n), ''], ['A shifted right by ' + n, w(a >>> n), ''], ['A rotated left by ' + n, w((a << n) | (a >>> (16 - n))), ''], ['Bit ' + n + ' of A', (a >>> n) & 1 ? 'ON' : 'OFF', '']],
        how: ['A = ' + bin(a, 16), 'B = ' + bin(b, 16), 'AND keeps the bits where B is 1. OR sets them. XOR flips them.'] };
    },
    tips: ['Keep some bits: A AND mask. Switch bits on: A OR mask. Switch bits off: A AND NOT mask.', 'Shift left by 1 is × 2, shift right by 1 is ÷ 2.'],
  });
  add({
    id: 'addr', g: 'num', lv: 1, t: 'Bit number and byte.bit', d: 'Change a bit number (83) into byte.bit (10.3) and word.bit, and back.', key: 'bit address byte.bit offset word bit number I10.3',
    f: [S('dir', 'Direction', [['n', 'Bit number → address'], ['a', 'Address → bit number']], 'n'), N('n', 'Bit number (first bit = 0)', '', 83, { show: (v) => v.dir === 'n' }), N('by', 'Byte', '', 10, { show: (v) => v.dir === 'a' }), N('bi', 'Bit (0 to 7)', '', 3, { show: (v) => v.dir === 'a' })],
    run(v) {
      const n = v.dir === 'n' ? Math.round(v.n) : Math.round(v.by) * 8 + Math.round(v.bi);
      if (n < 0 || (v.dir === 'a' && (v.bi < 0 || v.bi > 7))) return E('Bit numbers start at 0 and a bit in a byte is 0 to 7.');
      const by = Math.floor(n / 8), bi = n % 8;
      return { r: [v.dir === 'n' ? ['Byte.bit', by + '.' + bi, '', 'big'] : ['Bit number', String(n), '', 'big'], ['Word.bit (16-bit words)', Math.floor(n / 16) + '.' + String(n % 16).padStart(2, '0'), ''], ['Word that holds this byte', String(by - by % 2), ''], ['Mask of the bit in its byte', '16#' + hex(1 << bi, 2), '']],
        how: [`Byte = bit number ÷ 8, whole part = ${by}`, `Bit = the rest = ${bi}`, `Back: ${by} × 8 + ${bi} = ${n}`] };
    },
    tips: ['A byte has bits 0 to 7. There is no bit .8 or .9: after 10.7 comes 11.0.', 'Systems that count bits in 16-bit words go from .00 to .15.'],
  });
  add({
    id: 'overlap', g: 'num', lv: 2, t: 'Do two addresses overlap?', d: 'Check if two memory addresses use the same bytes, for example MW10 and MD8.', key: 'memory overlap MW MD MB double word address clash',
    f: [X('a', 'First address', 'MW10', 'MW10'), X('b', 'Second address', 'MD8', 'MD8'), S('m', 'How the PLC counts', [['byte', 'By byte: MW10 starts at byte 10'], ['size', 'By size: MW10 starts at byte 20, MD10 at byte 40']], 'byte')],
    run(v) {
      const SZ = { X: 1, B: 1, W: 2, D: 4, L: 8 };
      const one = (s) => {
        const m = /^%?([A-Z]*?)([XBWDL]?)(\d+)(?:\.(\d+))?$/i.exec(String(s).trim().replace(/\s/g, ''));
        if (!m) return null;
        const t = (m[2] || 'X').toUpperCase(), sz = SZ[t], n = +m[3], st = v.m === 'size' && t !== 'X' ? n * sz : n;
        return { name: String(s).trim().toUpperCase(), from: st, to: st + sz - 1 };
      };
      const a = one(v.a), b = one(v.b);
      if (!a || !b) return E('Write addresses like MW10, MD8, MB3 or M10.3.');
      const ov = a.from <= b.to && b.from <= a.to, sh = []; for (let i = Math.max(a.from, b.from); i <= Math.min(a.to, b.to); i++) sh.push(i);
      const rg = (x) => (x.from === x.to ? 'byte ' + x.from : 'bytes ' + x.from + ' to ' + x.to);
      return { r: [['Overlap', ov ? 'YES: they share ' + (sh.length === 1 ? 'byte ' : 'bytes ') + sh.join(', ') : 'No, they are apart', '', 'big ' + (ov ? 'bad' : 'ok')], [a.name + ' uses', rg(a), ''], [b.name + ' uses', rg(b), ''], ['Next free word after both', 'byte ' + (Math.max(a.to, b.to) + 1 + (Math.max(a.to, b.to) + 1) % 2), '']],
        how: ['A bit or byte uses 1 byte, a word (W) 2 bytes, a double word (D) 4 bytes, a long (L) 8 bytes.', 'Two addresses overlap when their byte ranges touch.'] };
    },
    tips: ['Classic bug: MW10 and MW11 share byte 11. With byte counting, use only even numbers for words and steps of 4 for double words.', 'Named tags (symbols) without a fixed address never overlap: use them when you can.'],
  });
  add({
    id: 'modbus', g: 'num', lv: 2, t: 'Modbus register address', d: 'From a number like 40001 to the real address in the message, and back.', key: 'Modbus 40001 holding register coil offset function code address',
    f: [S('dir', 'Direction', [['r', 'Number from the manual (40001) → address'], ['o', 'Address in the message → number']], 'r'), N('ref', 'Number from the manual', '', 40011, { show: (v) => v.dir === 'r' }),
      S('ty', 'Kind of data', [['0', 'Coil (output bit)'], ['1', 'Discrete input (input bit)'], ['3', 'Input register'], ['4', 'Holding register']], '4', { show: (v) => v.dir === 'o' }), N('off', 'Address in the message (first = 0)', '', 10, { show: (v) => v.dir === 'o' })],
    run(v) {
      const T = { 0: ['Coil (output bit)', '01', '05 or 15'], 1: ['Discrete input (input bit)', '02', 'read only'], 3: ['Input register', '04', 'read only'], 4: ['Holding register', '03', '06 or 16'] };
      let ty, off;
      if (v.dir === 'r') {
        const n = Math.round(v.ref), s = String(n);
        if (n < 1) return E('The number starts at 1.');
        if (n < 10000) { ty = 0; off = n - 1; }
        else { ty = +s[0]; off = +s.slice(1) - 1; if (!T[ty] || off < 0) return E('The first digit must be 0, 1, 3 or 4, for example 40001.'); }
      } else { ty = +v.ty; off = Math.round(v.off); if (off < 0 || off > 65535) return E('The address must be 0 to 65535.'); }
      const t = T[ty], five = off + 1 <= 9999 ? String(ty * 10000 + off + 1).padStart(5, '0') : 'needs 6 digits', six = String(ty) + String(off + 1).padStart(5, '0');
      return { r: [v.dir === 'r' ? ['Address in the message', off + ' = 16#' + hex(off, 4), '', 'big'] : ['Number in the manual', five + ' or ' + six, '', 'big'], ['Kind of data', t[0], ''], ['Function code to read', t[1], ''], ['Function code to write', t[2], '']],
        how: ['The first digit is only the kind of data. It is not sent.', `Address in the message = the rest − 1 = ${off + 1} − 1 = ${off}`] };
    },
    tips: ['The most common Modbus mistake is "one off": some software counts from 0, some from 1. If the values look shifted by one register, add or take 1.', 'Function 03 reads holding registers, 04 reads input registers. Many devices keep everything in holding registers.'],
  });
  add({
    id: 'crc', g: 'num', lv: 3, t: 'Checksums: CRC-16, LRC, sum', d: 'The check bytes at the end of a Modbus or serial message.', key: 'CRC16 Modbus RTU LRC checksum BCC XOR frame',
    f: [X('x', 'Message bytes in hex', '01 03 00 00 00 0A', '01 03 00 00 00 0A')],
    run(v) {
      const s = String(v.x).replace(/16#|0x/gi, '').replace(/[^0-9a-f]/gi, '');
      if (!s.length || s.length % 2) return E('Write whole bytes in hex, two digits each: 01 03 00 00 00 0A.');
      const b = []; for (let i = 0; i < s.length; i += 2) b.push(parseInt(s.substr(i, 2), 16));
      const c = crc16(b), sum = b.reduce((a, x) => a + x, 0), lrc = (-sum) & 0xFF, xr = b.reduce((a, x) => a ^ x, 0);
      const r = [['CRC-16 for Modbus RTU, as sent', hex(c & 0xFF, 2) + ' ' + hex(c >>> 8, 2), '', 'big'], ['CRC as a number', '16#' + hex(c, 4), ''], ['LRC for Modbus ASCII', '16#' + hex(lrc, 2), ''], ['Sum of the bytes (low byte)', '16#' + hex(sum & 0xFF, 2), ''], ['XOR of the bytes (BCC)', '16#' + hex(xr, 2), ''], ['Bytes', String(b.length), '']];
      if (b.length > 3 && crc16(b) === 0) r.splice(1, 0, ['The last two bytes', 'are a correct CRC for the bytes before them', '', 'ok']);
      return { r, how: ['Start with 16#FFFF. For each byte: XOR it in, then 8 times: shift right, and if a 1 fell out, XOR with 16#A001.', 'The low byte of the CRC is sent first.'] };
    },
    tips: ['A message with its own correct CRC at the end gives a CRC of 0000 over everything: a quick test.', 'A wrong CRC on site is nearly always noise, a missing terminator or a wrong baud rate, not a wrong formula.'],
  });
  add({
    id: 'time', g: 'num', lv: 1, t: 'Time values and timer presets', d: 'A time as T#… and as the preset number for timers that count in ticks.', key: 'timer preset time base T# TIME ms seconds ticks 100ms',
    f: [N('x', 'Time', '', 2.5), S('u', 'Unit', [['1', 'ms'], ['1000', 's'], ['60000', 'min'], ['3600000', 'h']], '1000')],
    run(v) {
      const ms = v.x * +v.u;
      if (!(ms >= 0)) return E('The time cannot be negative.');
      const pre = (b) => { const p = ms / b; return F(p, 2) + (p > 32767 ? '  (too big for 16 bits: use a bigger base)' : p !== Math.round(p) ? '  (not a whole number: round it)' : ''); };
      return { r: [['IEC time', timeLit(ms), '', 'big'], ['Milliseconds', F(ms, 0), 'ms'], ['Seconds', F(ms / 1000, 3), 's'], ['Preset with a 1 ms base', pre(1), ''], ['Preset with a 10 ms base', pre(10), ''], ['Preset with a 100 ms base', pre(100), ''], ['Preset with a 1 s base', pre(1000), ''],
        ['As a blink period', ms > 0 ? F(1000 / ms, 3) : '—', 'Hz']],
        how: ['Preset = time ÷ time base', `${F(ms, 0)} ms ÷ 100 ms = ${F(ms / 100, 2)}`] };
    },
    tips: ['A TIME value can hold about 24 days on some PLCs and 49 days on others. For longer times count hours with a counter.', 'A timer is only as exact as the scan: with a 20 ms scan, a time of 5 ms means nothing.'],
  });
  add({
    id: 'ovf', g: 'num', lv: 2, t: 'When does a counter overflow?', d: 'How long until a counter or a total reaches the end of its data type.', key: 'overflow INT DINT UINT counter max 32767 2147483647 rollover',
    f: [N('rate', 'Counts', '', 10), S('per', 'Per', [['1', 'second'], ['60', 'minute'], ['3600', 'hour']], '1'), S('ty', 'Data type', [['32767', 'INT (up to 32 767)'], ['65535', 'UINT (up to 65 535)'], ['2147483647', 'DINT (up to 2 147 483 647)'], ['4294967295', 'UDINT (up to 4 294 967 295)']], '32767')],
    run(v) {
      if (!(v.rate > 0)) return E('The count rate must be above 0.');
      const s = +v.ty / (v.rate / +v.per);
      return { r: [['Full after', span(s), '', 'big'], ['Counts per day', F(v.rate / +v.per * 86400, 0), ''], ['Highest value', F(+v.ty, 0), '']],
        how: [`Time = highest value ÷ counts per second = ${F(+v.ty, 0)} ÷ ${F(v.rate / +v.per, 4)} = ${F(s, 0)} s`],
        warn: s < 86400 * 365 ? ['This counter gets full in less than a year. Use a bigger type, or reset it at a known point (shift, batch, day).'] : [] };
    },
    tips: ['After the highest value an INT jumps to −32768: a part counter then shows nonsense.', 'An IEC up-counter block (CTU) stops at its highest value. A Rockwell CTU and a plain +1 in the program roll over.'],
  });
  const UNITS = [
    ['Pressure', [['bar', 1], ['mbar', 0.001], ['kPa', 0.01], ['MPa', 10], ['psi', 0.0689476], ['m of water', 0.0980665]]],
    ['Temperature', [['°C', 0], ['°F', 0], ['K', 0]]],
    ['Length', [['mm', 0.001], ['m', 1], ['inch', 0.0254], ['foot', 0.3048]]],
    ['Flow', [['l/min', 1], ['l/s', 60], ['m³/h', 16.6667], ['US gal/min', 3.78541]]],
    ['Power', [['kW', 1], ['W', 0.001], ['hp (US)', 0.7457], ['PS (metric hp)', 0.7355]]],
    ['Torque', [['Nm', 1], ['lb·ft', 1.35582], ['kgf·m', 9.80665]]],
    ['Force', [['N', 1], ['kN', 1000], ['kgf', 9.80665], ['lbf', 4.44822]]],
    ['Speed', [['m/s', 1], ['m/min', 1 / 60], ['km/h', 1 / 3.6], ['ft/min', 0.00508]]],
    ['Rotation', [['rpm', 1], ['turns per second (Hz)', 60], ['rad/s', 9.549297]]],
    ['Mass', [['kg', 1], ['g', 0.001], ['lb', 0.453592], ['t', 1000]]],
    ['Volume', [['l', 1], ['ml', 0.001], ['m³', 1000], ['US gal', 3.78541]]],
  ];
  add({
    id: 'units', g: 'num', lv: 1, t: 'Unit converter', d: 'Pressure, temperature, flow, power, torque, speed and more.', key: 'bar psi kPa celsius fahrenheit hp kW l/min gpm Nm convert units',
    f: [N('x', 'Value', '', 6), S('u', 'Unit', UNITS.reduce((a, c, ci) => a.concat(c[1].map((u, ui) => [ci + '.' + ui, c[0] + ': ' + u[0]])), []), '0.0')],
    run(v) {
      const p = String(v.u).split('.'), cat = UNITS[+p[0]], me = cat[1][+p[1]];
      let rows;
      if (cat[0] === 'Temperature') {
        const c = me[0] === '°C' ? v.x : me[0] === '°F' ? (v.x - 32) / 1.8 : v.x - 273.15;
        rows = [['°C', c], ['°F', c * 1.8 + 32], ['K', c + 273.15]];
        if (c < -273.15) return E('Colder than absolute zero.');
      } else { const base = v.x * me[1]; rows = cat[1].map((u) => [u[0], base / u[1]]); }
      const r = rows.filter((x) => x[0] !== me[0]).map((x, i) => [F(v.x, 4) + ' ' + me[0] + ' =', F(x[1], Math.abs(x[1]) >= 100 ? 2 : 4), x[0], i === 0 ? 'big' : '']);
      return { r, how: cat[0] === 'Temperature' ? ['°F = °C × 1.8 + 32', 'K = °C + 273.15'] : ['Change to the first unit of the list, then to the unit you want.'] };
    },
    tips: ['Quick ones: 1 bar ≈ 14.5 psi = 100 kPa. 1 hp ≈ 0.75 kW. 1 inch = 25.4 mm.', 'A pressure sensor can be gauge (0 = air pressure) or absolute (0 = vacuum): about 1 bar apart.'],
  });

  // ═════════════ Scan, counting and motion ═════════════
  add({
    id: 'scan', g: 'time', lv: 2, t: 'Scan time: will the PLC see it?', d: 'Reaction time of the PLC, the shortest pulse it catches and how far the part moves meanwhile.', key: 'scan time cycle response time pulse width fast sensor missed pulse',
    f: [N('sc', 'Scan time', 'ms', 10), N('fl', 'Input filter time', 'ms', 3), N('out', 'Output delay (relay about 10, transistor under 1)', 'ms', 1), N('len', 'Length of the part or flag (0 = skip)', 'mm', 50), N('sp', 'Speed', 'm/min', 30)],
    run(v) {
      const resp = v.fl + 2 * v.sc + v.out, minp = v.sc + v.fl, fmax = 1000 / (2 * minp), mmps = v.sp * 1000 / 60;
      const r = [['Slowest reaction, input to output', F(resp, 1), 'ms', 'big'], ['Shortest pulse that is always seen', F(minp, 1), 'ms'], ['Fastest pulse train a normal input can count', F(fmax, 1), 'Hz']];
      const w = [], how = [`Reaction = filter + 2 × scan + output delay = ${F(v.fl)} + 2 × ${F(v.sc)} + ${F(v.out)} = ${F(resp, 1)} ms`, `Shortest pulse = scan + filter = ${F(minp, 1)} ms`];
      if (v.len > 0 && mmps > 0) {
        const tp = v.len / mmps * 1000;
        r.push(['The sensor sees the part for', F(tp, 1), 'ms', tp >= minp ? 'ok' : 'bad'], ['The part moves during the reaction', F(mmps * resp / 1000, 1), 'mm']);
        how.push(`Time in front of the sensor = length ÷ speed = ${F(v.len)} mm ÷ ${F(mmps, 0)} mm/s = ${F(tp, 1)} ms`);
        if (tp < minp) w.push('The part passes faster than one scan: the PLC can miss it. Use a fast input with an interrupt, a pulse-stretching sensor or a high-speed counter.');
        else if (tp < 2 * minp) w.push('Close to the limit. Keep a factor of 2 between the pulse time and the scan time.');
      }
      return { r, how, warn: w };
    },
    tips: ['Worst case: the input changes just after the PLC read its inputs, so it waits one full scan, then needs one more to work.', 'The scan time changes: use the longest value the PLC shows, not the average.'],
  });
  add({
    id: 'enc', g: 'time', lv: 2, t: 'Encoder: counts, distance, frequency', d: 'Millimetres per count, counts per millimetre and the pulse frequency at full speed.', key: 'encoder PPR pulses per revolution quadrature x4 resolution HSC frequency',
    f: [N('ppr', 'Pulses per turn (PPR)', '', 1024), S('q', 'Counting', [['1', '× 1 (one edge)'], ['2', '× 2'], ['4', '× 4 (all edges of A and B)']], '4'), N('mm', 'Travel for one turn of the encoder', 'mm', 314.16), N('sp', 'Highest speed', 'm/min', 60), N('hsc', 'Limit of the counter input', 'kHz', 100)],
    run(v) {
      if (!(v.ppr > 0 && v.mm > 0)) return E('Pulses per turn and travel per turn must be above 0.');
      const cpr = v.ppr * +v.q, rps = v.sp * 1000 / 60 / v.mm, fs = rps * v.ppr / 1000;
      return { r: [['One count is', F(v.mm / cpr, 4), 'mm', 'big'], ['Counts per mm', F(cpr / v.mm, 3), ''], ['Counts per turn', F(cpr, 0), ''], ['Signal frequency at full speed', F(fs, 2), 'kHz', fs <= v.hsc ? 'ok' : 'bad'], ['Counts per second at full speed', F(rps * cpr, 0), ''], ['Encoder speed', F(rps * 60, 0), 'rpm']],
        how: [`Counts per turn = PPR × ${v.q} = ${F(cpr, 0)}`, `mm per count = ${F(v.mm)} ÷ ${F(cpr, 0)} = ${F(v.mm / cpr, 4)} mm`, `Frequency = turns per second × PPR = ${F(rps, 3)} × ${F(v.ppr, 0)} = ${F(fs * 1000, 0)} Hz`],
        warn: fs > v.hsc ? ['Too fast for this counter input: counts will be lost. Use an encoder with fewer pulses or a faster input.'] : [] };
    },
    tips: ['A wheel on the belt: travel per turn = π × diameter (100 mm wheel = 314.16 mm).', 'A ball screw: travel per turn = the pitch of the screw.', 'A normal PLC input is far too slow for an encoder: use the high-speed counter inputs.'],
  });
  add({
    id: 'move', g: 'time', lv: 2, t: 'Move time of an axis', d: 'How long a positioning move takes with a given speed and acceleration.', key: 'motion profile trapezoid acceleration cycle time positioning servo ramp',
    f: [N('d', 'Distance', 'mm', 800), N('v', 'Highest speed', 'mm/s', 1000), N('a', 'Acceleration and deceleration', 'mm/s²', 2000)],
    run(v) {
      if (!(v.d > 0 && v.v > 0 && v.a > 0)) return E('Distance, speed and acceleration must be above 0.');
      const da = v.v * v.v / (2 * v.a);
      if (2 * da >= v.d) {
        const vp = Math.sqrt(v.a * v.d), t = 2 * Math.sqrt(v.d / v.a);
        return { r: [['Move time', F(t, 3), 's', 'big'], ['Shape', 'triangle: the top speed is never reached', ''], ['Speed reached', F(vp, 0), 'mm/s']],
          how: [`Distance to reach full speed = v² ÷ (2 × a) = ${F(da, 0)} mm, twice that is more than the move`, `Speed reached = √(a × d) = ${F(vp, 0)} mm/s`, `Time = 2 × √(d ÷ a) = ${F(t, 3)} s`], warn: ['A higher top speed will not make this move faster. Only more acceleration helps.'] };
      }
      const ta = v.v / v.a, tc = (v.d - 2 * da) / v.v;
      return { r: [['Move time', F(2 * ta + tc, 3), 's', 'big'], ['Shape', 'ramp up, constant speed, ramp down', ''], ['Each ramp', F(ta, 3) + ' s and ' + F(da, 0), 'mm'], ['At constant speed', F(tc, 3) + ' s and ' + F(v.d - 2 * da, 0), 'mm']],
        how: [`Ramp time = v ÷ a = ${F(v.v)} ÷ ${F(v.a)} = ${F(ta, 3)} s`, `Ramp distance = v² ÷ (2 × a) = ${F(da, 0)} mm`, `Constant part = (${F(v.d)} − 2 × ${F(da, 0)}) ÷ ${F(v.v)} = ${F(tc, 3)} s`, `Total = 2 × ${F(ta, 3)} + ${F(tc, 3)} = ${F(2 * ta + tc, 3)} s`] };
    },
    tips: ['Add the settling time at the end (in-position window), often 50 to 200 ms.', 'A jerk limit (smooth S-ramps) makes the move softer and a little longer.'],
  });
  add({
    id: 'step', g: 'time', lv: 2, t: 'Stepper and servo: pulses per mm', d: 'Pulses for one millimetre, for a move, and the pulse frequency for a speed.', key: 'stepper pulses per mm microstep pitch pulse train PTO electronic gear',
    f: [N('spr', 'Steps for one motor turn', '', 200), S('ms', 'Microsteps', [['1', '1 (full step)'], ['2', '2'], ['4', '4'], ['8', '8'], ['16', '16'], ['32', '32']], '8'), N('g', 'Gear ratio (motor turns for 1 output turn)', '', 1), N('pitch', 'Travel for one output turn', 'mm', 5), N('d', 'Move', 'mm', 100), N('v', 'Speed', 'mm/s', 50), N('fmax', 'Limit of the pulse output', 'kHz', 100)],
    run(v) {
      if (!(v.pitch > 0 && v.spr > 0 && v.g > 0)) return E('Steps, ratio and travel per turn must be above 0.');
      const ppm = v.spr * +v.ms * v.g / v.pitch, f = ppm * v.v / 1000;
      return { r: [['Pulses for 1 mm', F(ppm, 3), '', 'big'], ['One pulse moves', F(1 / ppm, 5), 'mm'], ['Pulses for the move', F(ppm * v.d, 0), ''], ['Pulse frequency at this speed', F(f, 2), 'kHz', f <= v.fmax ? 'ok' : 'bad'], ['Motor speed', F(v.v / v.pitch * v.g * 60, 0), 'rpm']],
        how: [`Pulses per mm = steps × microsteps × ratio ÷ travel per turn = ${F(v.spr, 0)} × ${v.ms} × ${F(v.g)} ÷ ${F(v.pitch)} = ${F(ppm, 3)}`, `Frequency = pulses per mm × speed = ${F(ppm, 3)} × ${F(v.v)} = ${F(f * 1000, 0)} Hz`],
        warn: f > v.fmax ? ['Faster than the pulse output can go. Use fewer microsteps or a lower speed.'] : [] };
    },
    tips: ['A servo with a pulse input works the same way: use the pulses per turn set in the drive (electronic gear).', 'If pulses per mm is not a whole number, the error adds up over many moves: count in pulses, not in mm.'],
  });
  add({
    id: 'track', g: 'time', lv: 3, t: 'Tracking a part on a conveyor', d: 'Delay, encoder counts and shift-register steps between a sensor and a reject gate.', key: 'conveyor tracking reject delay shift register FIFO encoder window',
    f: [N('d', 'Distance from the sensor to the gate', 'mm', 1200), N('sp', 'Belt speed', 'm/min', 30), N('pitch', 'Distance between two parts', 'mm', 300), N('mm', 'Belt travel for one encoder count (0 = no encoder)', 'mm', 0.5), N('sc', 'Scan time', 'ms', 10), N('act', 'Reaction time of the gate', 'ms', 40)],
    run(v) {
      const mmps = v.sp * 1000 / 60;
      if (!(mmps > 0 && v.d > 0)) return E('Distance and speed must be above 0.');
      const t = v.d / mmps, r = [['Travel time', F(t, 3), 's', 'big'], ['Parts between sensor and gate', v.pitch > 0 ? F(v.d / v.pitch, 2) : '—', ''], ['Shift-register length', v.pitch > 0 ? String(Math.max(1, Math.round(v.d / v.pitch))) : '—', 'steps']];
      if (v.mm > 0) r.push(['Encoder counts for the distance', F(v.d / v.mm, 0), '']);
      r.push(['Position error from one scan', F(mmps * v.sc / 1000, 1), 'mm'], ['Fire the gate earlier by', F(mmps * v.act / 1000, 1) + ' mm = ' + F(v.act, 0), 'ms']);
      return { r, how: [`Belt speed = ${F(v.sp)} m/min = ${F(mmps, 0)} mm/s`, `Time = distance ÷ speed = ${F(v.d)} ÷ ${F(mmps, 0)} = ${F(t, 3)} s`, `Scan error = speed × scan time = ${F(mmps, 0)} × ${F(v.sc / 1000, 3)} = ${F(mmps * v.sc / 1000, 1)} mm`],
        warn: v.pitch > 0 && Math.abs(v.d / v.pitch - Math.round(v.d / v.pitch)) > 0.15 ? ['The distance is not a whole number of part gaps: a simple shift register will be off. Use encoder counts or a FIFO of positions.'] : [] };
    },
    tips: ['A timer only works when the belt speed never changes. With a drive on the belt, count encoder pulses.', 'With an encoder: store the count when the sensor sees the part, and fire when the count has grown by the distance.', 'Belts stop and start: a time delay loses the part, a count does not.'],
  });

  // ═════════════ Machines and process ═════════════
  add({
    id: 'conv', g: 'mech', lv: 2, t: 'Motor power for a conveyor or a lift', d: 'The motor size to move a load on a flat belt, up a slope or straight up.', key: 'conveyor motor sizing power friction incline hoist lift kW',
    f: [N('m', 'Mass that moves (load and belt)', 'kg', 200), N('mu', 'Friction factor (rollers 0.05, belt on steel 0.3)', '', 0.3), N('ang', 'Slope (0 = flat, 90 = straight up)', '°', 0), N('sp', 'Speed', 'm/min', 30), N('eta', 'Efficiency of gearbox and drive', '%', 85), N('sf', 'Safety factor', '', 1.5)],
    run(v) {
      if (!(v.eta > 0)) return E('The efficiency must be above 0.');
      const a = v.ang * PI / 180, f = v.m * G * (v.mu * Math.cos(a) + Math.sin(a)), p = f * (v.sp / 60) / (v.eta / 100) / 1000, need = p * v.sf, std = nextStd(STD_MOTOR, need);
      return { r: [['Motor', std ? F(std) : 'more than 250', 'kW', 'big'], ['Pull force', F(f, 0), 'N'], ['Power while running', F(p, 3), 'kW'], ['With the safety factor', F(need, 3), 'kW']],
        how: [`F = m × g × (μ × cos α + sin α) = ${F(v.m)} × 9.81 × (${F(v.mu)} × ${F(Math.cos(a), 3)} + ${F(Math.sin(a), 3)}) = ${F(f, 0)} N`, `P = F × v ÷ η = ${F(f, 0)} × ${F(v.sp / 60, 3)} m/s ÷ ${F(v.eta / 100)} = ${F(p * 1000, 0)} W`, `Motor = P × safety factor = ${F(need, 3)} kW, next standard size`] };
    },
    tips: ['Starting needs more than running. That is what the safety factor is for: 1.5 for easy loads, 2 for many starts.', 'For a lift, set the slope to 90 and the friction to 0. A lift also needs a brake.', 'The friction factor is the biggest guess: measure the pull with a spring scale if you can.'],
  });
  add({
    id: 'pump', g: 'mech', lv: 2, t: 'Pump power', d: 'The motor for a pump from flow and head.', key: 'pump power flow head pressure kW hydraulic sizing',
    f: [N('q', 'Flow', 'm³/h', 30), N('h', 'Head', 'm', 40), N('rho', 'Density (water = 1000)', 'kg/m³', 1000), N('ep', 'Pump efficiency', '%', 70), N('em', 'Motor efficiency', '%', 90)],
    run(v) {
      if (!(v.ep > 0 && v.em > 0)) return E('The efficiencies must be above 0.');
      const ph = v.rho * G * (v.q / 3600) * v.h / 1000, ps = ph / (v.ep / 100), pe = ps / (v.em / 100), std = nextStd(STD_MOTOR, ps * 1.15);
      return { r: [['Motor (shaft power + 15 %)', std ? F(std) : 'more than 250', 'kW', 'big'], ['Power in the water', F(ph), 'kW'], ['Power at the pump shaft', F(ps), 'kW'], ['Electrical power', F(pe), 'kW'], ['Pressure of this head', F(v.rho * G * v.h / 1e5), 'bar']],
        how: [`P water = ρ × g × Q × H = ${F(v.rho, 0)} × 9.81 × ${F(v.q / 3600, 5)} m³/s × ${F(v.h)} = ${F(ph * 1000, 0)} W`, `P shaft = P water ÷ pump efficiency = ${F(ph)} ÷ ${F(v.ep / 100)} = ${F(ps)} kW`] };
    },
    tips: ['10 m of water head is about 1 bar.', 'Head is the height you lift plus the losses in the pipe. Take flow and head from the pump curve.'],
  });
  add({
    id: 'fan', g: 'mech', lv: 2, t: 'Fan or pump on a drive: energy saved', d: 'Flow, pressure and power at a lower speed, and the money a drive saves.', key: 'affinity laws VFD energy saving fan pump speed cube law',
    f: [N('p', 'Power at full speed', 'kW', 15), N('n', 'New speed', '%', 80), N('h', 'Running hours per year', 'h', 6000), N('price', 'Price per kWh', '', 0.15)],
    run(v) {
      const k = v.n / 100, pn = v.p * k * k * k, save = (v.p - pn) * v.h;
      return { r: [['Power at ' + F(v.n) + ' % speed', F(pn), 'kW', 'big'], ['Flow', F(k * 100, 0), '%'], ['Pressure', F(k * k * 100, 0), '%'], ['Power', F(k * k * k * 100, 0), '%'], ['Energy saved per year', F(save, 0), 'kWh'], ['Money saved per year', F(save * v.price, 0), '']],
        how: ['Flow follows the speed, pressure follows speed², power follows speed³', `P = ${F(v.p)} × ${F(k)}³ = ${F(pn)} kW`, `Saved = (${F(v.p)} − ${F(pn)}) × ${F(v.h, 0)} h = ${F(save, 0)} kWh`] };
    },
    tips: ['80 % speed needs only about half the power. This is why fans and pumps get drives.', 'True for fans and for pumps that push through pipe friction. A pump that lifts water high saves less.'],
  });
  add({
    id: 'pneu', g: 'mech', lv: 2, t: 'Pneumatic cylinder: force and air', d: 'Push and pull force of a cylinder, if it is big enough for the load, and the air it uses.', key: 'pneumatic cylinder force bore pressure air consumption sizing',
    f: [N('d', 'Piston diameter (bore)', 'mm', 50), N('rod', 'Rod diameter', 'mm', 20), N('p', 'Pressure', 'bar', 6), N('s', 'Stroke', 'mm', 200), N('n', 'Double strokes per minute', '', 10), N('load', 'Load to move (0 = skip)', 'kg', 60)],
    run(v) {
      if (!(v.d > 0 && v.rod >= 0 && v.rod < v.d)) return E('The rod must be thinner than the piston.');
      const a1 = PI * v.d * v.d / 4, a2 = a1 - PI * v.rod * v.rod / 4, f1 = 0.1 * v.p * a1, f2 = 0.1 * v.p * a2, air = (a1 + a2) * v.s / 1e6 * (v.p + 1);
      const r = [['Push force (out)', F(f1, 0), 'N', 'big'], ['Pull force (back)', F(f2, 0), 'N'], ['Push force as weight', F(f1 / G, 0), 'kg'], ['Air for one double stroke', F(air, 2), 'l (normal)'], ['Air use', F(air * v.n, 1), 'l/min (normal)']];
      const w = [];
      if (v.load > 0) { const lf = v.load * G / f1 * 100; r.splice(1, 0, ['The load uses', F(lf, 0), '% of the push force', lf <= 70 ? 'ok' : 'bad']); if (lf > 70) w.push('Too small: take the next bigger cylinder. Keep the load under 70 % of the force (under 50 % when lifting or moving fast).'); else if (lf > 50) w.push('Fine for a slow, flat move. For lifting or fast moves keep the load under 50 %.'); }
      return { r, how: [`Piston area = π × D² ÷ 4 = ${F(a1, 0)} mm²`, `Force = pressure × area = ${F(v.p)} bar × ${F(a1, 0)} mm² × 0.1 = ${F(f1, 0)} N`, `Pull side: area minus the rod = ${F(a2, 0)} mm²`], warn: w };
    },
    tips: ['1 bar on 1 mm² is 0.1 N. On a 50 mm piston, 6 bar gives about 1200 N (120 kg).', 'Friction takes about 10 %: the real force is a little lower.', 'The pull force is smaller because the rod takes away area.'],
  });
  add({
    id: 'hyd', g: 'mech', lv: 3, t: 'Hydraulic cylinder and pump motor', d: 'Force of a hydraulic cylinder, the oil flow for its speed and the pump motor power.', key: 'hydraulic cylinder force flow l/min pump motor kW bar',
    f: [N('d', 'Piston diameter (bore)', 'mm', 63), N('rod', 'Rod diameter', 'mm', 36), N('p', 'Pressure', 'bar', 160), N('v', 'Speed out', 'mm/s', 100), N('eta', 'Efficiency of pump and motor', '%', 85)],
    run(v) {
      if (!(v.d > 0 && v.rod >= 0 && v.rod < v.d && v.eta > 0)) return E('The rod must be thinner than the piston.');
      const a1 = PI * v.d * v.d / 4, a2 = a1 - PI * v.rod * v.rod / 4, q = a1 * v.v * 60 / 1e6, pw = v.p * q / 600 / (v.eta / 100), std = nextStd(STD_MOTOR, pw);
      return { r: [['Push force', F(0.1 * v.p * a1 / 1000, 1), 'kN', 'big'], ['Pull force', F(0.1 * v.p * a2 / 1000, 1), 'kN'], ['Oil flow for this speed', F(q, 1), 'l/min'], ['Pump motor', F(pw) + ' → ' + (std ? F(std) : 'more than 250'), 'kW'], ['Speed back with the same flow', F(q * 1e6 / 60 / a2, 0), 'mm/s']],
        how: [`Force = p × A = ${F(v.p)} bar × ${F(a1, 0)} mm² × 0.1 = ${F(0.1 * v.p * a1, 0)} N`, `Flow = A × v = ${F(a1, 0)} mm² × ${F(v.v)} mm/s = ${F(q, 1)} l/min`, `P = p × Q ÷ 600 ÷ η = ${F(v.p)} × ${F(q, 1)} ÷ 600 ÷ ${F(v.eta / 100)} = ${F(pw)} kW`] };
    },
    tips: ['Pressure makes the force, flow makes the speed.', 'The cylinder comes back faster than it goes out with the same flow: the rod side holds less oil.'],
  });
  add({
    id: 'tank', g: 'mech', lv: 2, t: 'Tank volume and level', d: 'Litres in a tank from the level, for round and square tanks, and the pressure at the bottom.', key: 'tank volume level litres horizontal cylinder hydrostatic pressure',
    f: [S('sh', 'Shape', [['v', 'Round, standing'], ['h', 'Round, lying'], ['b', 'Box']], 'v'), N('d', 'Diameter', 'm', 2, { show: (v) => v.sh !== 'b' }), N('w', 'Width', 'm', 1.5, { show: (v) => v.sh === 'b' }),
      N('l', 'Length', 'm', 3, { show: (v) => v.sh !== 'v' }), N('ht', 'Height of the tank', 'm', 3, { show: (v) => v.sh !== 'h' }), N('lv', 'Level now', 'm', 1.2), N('rho', 'Density (water = 1000)', 'kg/m³', 1000)],
    run(v) {
      const top = v.sh === 'h' ? v.d : v.ht;
      if (!(top > 0) || v.lv < 0) return E('Give the sizes of the tank. The level cannot be negative.');
      const h = Math.min(v.lv, top);
      let vol, full, how;
      if (v.sh === 'v') { const a = PI * v.d * v.d / 4; vol = a * h; full = a * v.ht; how = `V = π × D² ÷ 4 × level = ${F(a, 3)} m² × ${F(h)} = ${F(vol, 3)} m³`; }
      else if (v.sh === 'b') { vol = v.w * v.l * h; full = v.w * v.l * v.ht; how = `V = width × length × level = ${F(v.w)} × ${F(v.l)} × ${F(h)} = ${F(vol, 3)} m³`; }
      else { const r = v.d / 2, seg = r * r * Math.acos((r - h) / r) - (r - h) * Math.sqrt(Math.max(0, 2 * r * h - h * h)); vol = seg * v.l; full = PI * r * r * v.l; how = `Wet area = r² × acos((r − h) ÷ r) − (r − h) × √(2rh − h²) = ${F(seg, 3)} m², × length = ${F(vol, 3)} m³`; }
      return { r: [['Volume now', F(vol * 1000, 0), 'l', 'big'], ['Filled', F(vol / full * 100, 1), '%'], ['Volume when full', F(full * 1000, 0), 'l'], ['Mass of the liquid', F(vol * v.rho, 0), 'kg'], ['Pressure at the bottom', F(v.rho * G * h / 100, 1), 'mbar']],
        how: [how, `p = ρ × g × level = ${F(v.rho, 0)} × 9.81 × ${F(h)} = ${F(v.rho * G * h, 0)} Pa`], warn: v.lv > top ? ['The level is above the top of the tank: it is counted as full.'] : [] };
    },
    tips: ['A pressure sensor at the bottom measures level: 1 m of water is about 98 mbar.', 'In a lying round tank the volume does not follow the level in a straight line: half the level is half the volume, but a quarter of the level is only 20 %.', 'In the PLC, use this formula or a table with a few points and straight lines between them.'],
  });
  add({
    id: 'heatup', g: 'mech', lv: 2, t: 'Heater power', d: 'The heater you need to warm a mass by some degrees in a given time.', key: 'heating power kW heat up time water oil specific heat',
    f: [N('m', 'Mass', 'kg', 500), S('c', 'Material', [['4.186', 'Water'], ['2', 'Oil'], ['0.49', 'Steel'], ['0.9', 'Aluminium'], ['1.005', 'Air']], '4.186'), N('dt', 'Temperature rise', '°C', 60), N('t', 'Time', 'min', 60), N('eta', 'Efficiency (heat not lost)', '%', 90), N('u', 'Three-phase voltage', 'V', 400)],
    run(v) {
      if (!(v.t > 0 && v.eta > 0 && v.u > 0)) return E('Time, efficiency and voltage must be above 0.');
      const kwh = v.m * +v.c * v.dt / 3600, p = kwh / (v.t / 60) / (v.eta / 100);
      return { r: [['Heater power', F(p, 1), 'kW', 'big'], ['Energy', F(kwh / (v.eta / 100), 1), 'kWh'], ['Current (three-phase)', F(p * 1000 / (SQ3 * v.u), 1), 'A']],
        how: [`Energy = m × c × ΔT = ${F(v.m)} × ${v.c} × ${F(v.dt)} = ${F(v.m * +v.c * v.dt, 0)} kJ = ${F(kwh, 1)} kWh`, `P = energy ÷ time ÷ η = ${F(kwh, 1)} ÷ ${F(v.t / 60, 2)} h ÷ ${F(v.eta / 100)} = ${F(p, 1)} kW`] };
    },
    tips: ['1 litre of water is 1 kg.', 'To hold the temperature later you need much less power, only what the tank loses.', 'A heater has cos φ = 1: current = power ÷ (√3 × voltage).'],
  });
  add({
    id: 'prod', g: 'mech', lv: 2, t: 'OEE and production rate', d: 'Availability, performance, quality and OEE from the numbers of one shift.', key: 'OEE availability performance quality cycle time parts per hour takt',
    f: [N('plan', 'Planned production time', 'min', 480), N('down', 'Stop time', 'min', 45), N('cyc', 'Ideal cycle time for one part', 's', 6), N('tot', 'Parts made', '', 3900), N('bad', 'Bad parts', '', 80)],
    run(v) {
      const run = v.plan - v.down;
      if (!(v.plan > 0 && run > 0 && v.cyc > 0 && v.tot > 0)) return E('Times and parts must be above 0, and the stop time shorter than the planned time.');
      const av = run / v.plan, ideal = run * 60 / v.cyc, pf = v.tot / ideal, q = (v.tot - v.bad) / v.tot, oee = av * pf * q;
      return { r: [['OEE', F(oee * 100, 1), '%', 'big'], ['Availability', F(av * 100, 1), '%'], ['Performance', F(pf * 100, 1), '%'], ['Quality', F(q * 100, 1), '%'], ['Good parts per hour', F((v.tot - v.bad) / (v.plan / 60), 0), ''], ['Real cycle time', F(run * 60 / v.tot, 2), 's']],
        how: [`Availability = run time ÷ planned time = ${F(run)} ÷ ${F(v.plan)} = ${F(av * 100, 1)} %`, `Performance = parts made ÷ parts possible = ${F(v.tot, 0)} ÷ ${F(ideal, 0)} = ${F(pf * 100, 1)} %`, `Quality = good ÷ made = ${F(v.tot - v.bad, 0)} ÷ ${F(v.tot, 0)} = ${F(q * 100, 1)} %`, `OEE = ${F(av, 3)} × ${F(pf, 3)} × ${F(q, 3)} = ${F(oee * 100, 1)} %`],
        warn: pf > 1 ? ['Performance above 100 %: the ideal cycle time is set too long.'] : [] };
    },
    tips: ['85 % is called world class. Many lines run at 60 %.', 'In the PLC: count run time, stop time, parts and bad parts. Calculate once per minute, not in every scan.'],
  });

  // ═════════════ Control, networks and safety ═════════════
  add({
    id: 'pid', g: 'ctrl', lv: 3, t: 'PID start values', d: 'First settings for a PID loop from a simple test, and the same gain in the other forms.', key: 'PID tuning Ziegler Nichols gain Kp Ti Td proportional band reset',
    f: [S('m', 'Test you did', [['c', 'Loop swings steadily with P only (Ku, Tu)'], ['o', 'Step on the output, loop open (delay and rise)']], 'c'), S('ty', 'Controller', [['pid', 'PID'], ['pi', 'PI'], ['p', 'P only']], 'pi'),
      N('ku', 'Gain where it swings steadily (Ku)', '', 4, { show: (v) => v.m === 'c' }), N('tu', 'Time of one swing (Tu)', 's', 20, { show: (v) => v.m === 'c' }),
      N('k', 'Process gain (% change of value for 1 % output)', '', 1.5, { show: (v) => v.m === 'o' }), N('l', 'Dead time before it starts to move', 's', 3, { show: (v) => v.m === 'o' }), N('t', 'Time constant (63 % of the change)', 's', 30, { show: (v) => v.m === 'o' })],
    run(v) {
      let kp, ti = 0, td = 0, how;
      if (v.m === 'c') {
        if (!(v.ku > 0 && v.tu > 0)) return E('Ku and Tu must be above 0.');
        if (v.ty === 'p') kp = 0.5 * v.ku; else if (v.ty === 'pi') { kp = 0.45 * v.ku; ti = v.tu / 1.2; } else { kp = 0.6 * v.ku; ti = v.tu / 2; td = v.tu / 8; }
        how = v.ty === 'p' ? 'Kp = 0.5 × Ku' : v.ty === 'pi' ? 'Kp = 0.45 × Ku,  Ti = Tu ÷ 1.2' : 'Kp = 0.6 × Ku,  Ti = Tu ÷ 2,  Td = Tu ÷ 8';
      } else {
        if (!(v.k > 0 && v.l > 0 && v.t > 0)) return E('Gain, dead time and time constant must be above 0.');
        const b = v.t / (v.k * v.l);
        if (v.ty === 'p') kp = b; else if (v.ty === 'pi') { kp = 0.9 * b; ti = v.l / 0.3; } else { kp = 1.2 * b; ti = 2 * v.l; td = 0.5 * v.l; }
        how = v.ty === 'p' ? 'Kp = T ÷ (K × L)' : v.ty === 'pi' ? 'Kp = 0.9 × T ÷ (K × L),  Ti = L ÷ 0.3' : 'Kp = 1.2 × T ÷ (K × L),  Ti = 2 × L,  Td = 0.5 × L';
      }
      const r = [['Gain Kp', F(kp, 3), '', 'big']];
      if (ti) r.push(['Integral time Ti', F(ti, 2), 's'], ['Ti in minutes', F(ti / 60, 3), 'min'], ['Integral gain Ki = Kp ÷ Ti', F(kp / ti, 4), '1/s'], ['Repeats per minute', F(60 / ti, 3), '']);
      if (td) r.push(['Derivative time Td', F(td, 2), 's'], ['Derivative gain Kd = Kp × Td', F(kp * td, 3), 's']);
      r.push(['Proportional band', F(100 / kp, 1), '%'], ['Softer start: half the gain', F(kp / 2, 3), '']);
      return { r, how: ['Rules of Ziegler and Nichols:', how] };
    },
    tips: ['These are start values and they are lively. Begin with half the gain, then go up slowly.', 'Check how your PID block wants the numbers: gain or proportional band, Ti in seconds or minutes, or Ki.', 'Run the PID in a block with a fixed cycle, about 10 times faster than the process reacts.', 'Most loops in a plant run as PI. Use the D part only on slow, clean signals such as temperature.'],
  });
  add({
    id: 'filt', g: 'ctrl', lv: 2, t: 'Smoothing an analog value', d: 'The filter factor for a simple low-pass filter in the PLC.', key: 'low pass filter smoothing time constant PT1 first order alpha noise',
    f: [N('tau', 'Filter time constant', 's', 2), N('cyc', 'Cycle time of the block', 'ms', 100)],
    run(v) {
      const dt = v.cyc / 1000;
      if (!(v.tau > 0 && dt > 0)) return E('Both times must be above 0.');
      const a = dt / (v.tau + dt);
      return { r: [['Filter factor', F(a, 4), '', 'big'], ['63 % of a jump after', F(v.tau, 2), 's'], ['95 % after', F(3 * v.tau, 2), 's'], ['99 % after', F(5 * v.tau, 2), 's'], ['Noise faster than this is damped', F(1 / (2 * PI * v.tau), 3), 'Hz']],
        how: [`Factor = cycle ÷ (time constant + cycle) = ${F(dt, 3)} ÷ (${F(v.tau)} + ${F(dt, 3)}) = ${F(a, 4)}`, `In ST: Out := Out + ${F(a, 4)} * (In - Out);`], warn: dt > v.tau / 2 ? ['The cycle is too slow for this filter. Call the block at least 10 times per time constant.'] : [] };
    },
    tips: ['Call this line in a block with a fixed cycle. In the free main program the filter changes with the scan time.', 'More filter means a calmer value but a slower one: a PID loop on it gets slower too.', 'Out must be a REAL that keeps its value between cycles.'],
  });
  add({
    id: 'serial', g: 'ctrl', lv: 2, t: 'Modbus RTU timing', d: 'Time of one question and answer, and how long a full round over all slaves takes.', key: 'baud rate serial RS-485 Modbus RTU poll time character time 3.5 timeout',
    f: [S('baud', 'Baud rate', [['1200', '1200'], ['2400', '2400'], ['4800', '4800'], ['9600', '9600'], ['19200', '19200'], ['38400', '38400'], ['57600', '57600'], ['115200', '115200']], '9600'), S('par', 'Parity', [['1', 'Even or odd'], ['0', 'None']], '1'), S('stop', 'Stop bits', [['1', '1'], ['2', '2']], '1'),
      N('n', 'Registers read in one message', '', 10), N('sl', 'Slaves', '', 5), N('dly', 'Thinking time of a slave', 'ms', 5)],
    run(v) {
      const bits = 1 + 8 + +v.par + +v.stop, ch = bits / +v.baud * 1000, gap = +v.baud > 19200 ? 1.75 : 3.5 * ch;
      if (v.n < 1 || v.n > 125) return E('One message reads 1 to 125 registers.');
      const rq = 8 * ch, rp = (5 + 2 * v.n) * ch, one = rq + gap + v.dly + rp + gap;
      return { r: [['One full round', F(one * v.sl, 0), 'ms', 'big'], ['One question and answer', F(one, 1), 'ms'], ['Time of one byte', F(ch, 3), 'ms'], ['Silence between messages', F(gap, 2), 'ms'], ['Question / answer', '8 / ' + (5 + 2 * v.n), 'bytes'], ['A good timeout for the master', F(Math.max(100, Math.ceil(one * 3 / 50) * 50), 0), 'ms']],
        how: [`Bits per byte = 1 start + 8 data + ${v.par} parity + ${v.stop} stop = ${bits}`, `Byte time = ${bits} ÷ ${v.baud} = ${F(ch, 3)} ms`, `Answer = 5 + 2 × ${F(v.n, 0)} = ${5 + 2 * v.n} bytes = ${F(rp, 1)} ms`, `Round = (question + silence + thinking + answer + silence) × slaves = ${F(one, 1)} × ${F(v.sl, 0)} = ${F(one * v.sl, 0)} ms`],
        warn: bits !== 11 ? ['Modbus RTU expects 11 bits per byte: with no parity use 2 stop bits. Many devices accept 8N1 anyway, but all must be set the same.'] : [] };
    },
    tips: ['One slave that does not answer costs a full timeout in every round: that is why a dead slave makes the whole line slow.', 'Read many registers in one message instead of many small messages.', 'All devices on the line need the same baud rate, parity and stop bits.'],
  });
  add({
    id: 'ip', g: 'ctrl', lv: 2, t: 'IP address and subnet', d: 'The network of an IP address, its free addresses, and if two devices can talk.', key: 'IP subnet mask network broadcast same subnet 255.255.255.0 CIDR ethernet',
    f: [X('ip', 'IP address', '192.168.0.10', '192.168.0.10'), X('mask', 'Subnet mask or /bits', '255.255.255.0', '255.255.255.0 or /24'), X('ip2', 'Second device (empty = skip)', '192.168.1.20', '192.168.1.20')],
    run(v) {
      const ip = parseIp(v.ip);
      if (ip == null) return E('Write the IP address as four numbers from 0 to 255: 192.168.0.10.');
      let mask, m = /^\s*\/?(\d{1,2})\s*$/.exec(String(v.mask));
      if (m) { const b = +m[1]; if (b > 32) return E('The mask has 0 to 32 bits.'); mask = b === 0 ? 0 : (0xFFFFFFFF << (32 - b)) >>> 0; }
      else { mask = parseIp(v.mask); if (mask == null) return E('Write the mask as 255.255.255.0 or as /24.'); const inv = (~mask) >>> 0; if ((inv & (inv + 1)) !== 0) return E('This is not a valid subnet mask: the 1 bits must be together on the left.'); }
      let bits = 0; for (let i = 31; i >= 0; i--) if ((mask >>> i) & 1) bits++;
      const net = (ip & mask) >>> 0, bc = (net | ~mask) >>> 0, hosts = bits >= 31 ? 0 : Math.pow(2, 32 - bits) - 2;
      const r = [['Network', ipStr(net) + ' /' + bits, '', 'big'], ['Subnet mask', ipStr(mask), ''], ['Addresses for devices', hosts ? ipStr(net + 1) + ' to ' + ipStr(bc - 1) : 'none', ''], ['Number of devices', F(hosts, 0), ''], ['Broadcast address', ipStr(bc), '']];
      const w = [];
      if (hosts && (ip === net || ip === bc)) w.push('This address is the network address or the broadcast address: a device cannot use it.');
      if (String(v.ip2 || '').trim()) {
        const ip2 = parseIp(v.ip2);
        if (ip2 == null) return E('The second address is not a valid IP address.');
        const same = ((ip2 & mask) >>> 0) === net;
        r.splice(1, 0, ['Can the two devices talk directly?', same ? (ip2 === ip ? 'Same address twice: a conflict!' : 'Yes, same network') : 'No, different networks: change one address or use a router', '', same && ip2 !== ip ? 'ok' : 'bad']);
      }
      return { r, how: ['Network = IP address AND mask, bit by bit.', `${ipStr(ip)} AND ${ipStr(mask)} = ${ipStr(net)}`, 'Two devices are in the same network when this result is the same for both.'], warn: w };
    },
    tips: ['With mask 255.255.255.0 the first three numbers must be the same and the last one different.', 'To reach a PLC, give your laptop an address in the same network that no other device uses.', 'Two devices with the same address give strange faults that come and go.'],
  });
  add({
    id: 'datalog', g: 'ctrl', lv: 2, t: 'Data logging: memory and days', d: 'How much memory a data log uses and how long the card lasts.', key: 'data log memory SD card size records trend archive bytes',
    f: [N('n', 'Values in one record', '', 20), S('b', 'Size of one value', [['1', '1 byte (BOOL, BYTE)'], ['2', '2 bytes (INT, WORD)'], ['4', '4 bytes (DINT, REAL)'], ['8', '8 bytes (LREAL)']], '4'), N('ts', 'Time stamp', 'bytes', 8), N('iv', 'One record every', 's', 1), N('mem', 'Memory you can use', 'MB', 2000)],
    run(v) {
      if (!(v.iv > 0)) return E('The interval must be above 0.');
      const rec = v.n * +v.b + v.ts, day = rec * 86400 / v.iv / 1e6;
      return { r: [['The memory lasts', span(v.mem / day * 86400), '', 'big'], ['One record', F(rec, 0), 'bytes'], ['Per day', F(day, 2), 'MB'], ['Records per day', F(86400 / v.iv, 0), ''], ['As a text file (CSV), about', F(day * 3, 1), 'MB per day']],
        how: [`Record = values × size + time stamp = ${F(v.n, 0)} × ${v.b} + ${F(v.ts, 0)} = ${F(rec, 0)} bytes`, `Per day = record × 86 400 s ÷ interval = ${F(day, 2)} MB`, `Days = memory ÷ per day = ${F(v.mem)} ÷ ${F(day, 2)} = ${F(v.mem / day, 0)}`] };
    },
    tips: ['A text file (CSV) is about 3 times bigger than the raw numbers.', 'Memory cards wear out when you write very often: collect records and write them in blocks.', 'Log only when a value changes, or more slowly, and the card lasts many times longer.'],
  });
  add({
    id: 'safedist', g: 'ctrl', lv: 3, t: 'Light curtain: safety distance', d: 'How far a light curtain must be from the danger so the machine stops in time.', key: 'light curtain safety distance ISO 13855 stopping time resolution',
    f: [N('t1', 'Stop time of the machine (measured)', 'ms', 120), N('t2', 'Reaction time of curtain and safety relay', 'ms', 30), S('d', 'Resolution of the curtain', [['14', '14 mm (finger)'], ['20', '20 mm'], ['30', '30 mm (hand)'], ['40', '40 mm'], ['50', 'more than 40 mm (body)']], '14')],
    run(v) {
      const t = (v.t1 + v.t2) / 1000, d = +v.d;
      if (!(t > 0)) return E('The times must be above 0.');
      let s, how;
      if (d > 40) { s = 1600 * t + 850; how = [`S = 1600 × T + 850 = 1600 × ${F(t, 3)} + 850 = ${F(s, 0)} mm`]; }
      else {
        const c = Math.max(0, 8 * (d - 14));
        s = Math.max(100, 2000 * t + c); how = [`S = 2000 × T + 8 × (d − 14) = 2000 × ${F(t, 3)} + ${F(c, 0)} = ${F(2000 * t + c, 0)} mm`];
        if (s > 500) { s = Math.max(500, 1600 * t + c); how.push(`More than 500 mm, so with the slower hand speed: S = 1600 × ${F(t, 3)} + ${F(c, 0)} = ${F(1600 * t + c, 0)} mm (not less than 500)`); }
      }
      return { r: [['Smallest distance', F(s, 0), 'mm', 'big'], ['Total stop time', F(t * 1000, 0), 'ms'], ['The danger moves on during the stop for', F(t, 3), 's']], how,
        warn: ['This is a first check only. The real distance must be decided and tested by the person responsible for safety, with the measured stop time.'] };
    },
    tips: ['Formula from ISO 13855: 2000 mm/s is the speed of a hand, 1600 mm/s the speed of a walking person.', 'The stop time must be measured on the real machine, at its worst: full speed, heaviest load, worn brake.', 'A slower machine stop means the curtain must stand further away. Shortening the distance later is not allowed without a new measurement.'],
  });

  // ───────────── run with defaults filled in (also used by the tests) ─────────────
  const defaults = (c) => { const o = {}; c.f.forEach((x) => { o[x.k] = x.d; }); return o; };
  function run(id, vals) {
    const c = BY[id]; if (!c) return null;
    const v = Object.assign(defaults(c), vals || {});
    for (const x of c.f) {
      if (x.show && !x.show(v)) continue;
      if (x.ty === 'n' && !(typeof v[x.k] === 'number' && isFinite(v[x.k]))) return { err: 'Fill in every field with a number.' };
    }
    try { return c.run(v); } catch (e) { return { err: 'This cannot be calculated. Check the numbers.' }; }
  }

  // ───────────── page ─────────────
  const CSS = `
.cx-head p{max-width:68ch;margin:0 0 12px}
.cx-find{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}
.cx-find input{flex:1;min-width:200px;border:1px solid var(--edge);background:var(--surface);color:var(--ink);border-radius:var(--r-ctl);padding:9px 12px;min-height:44px;font:inherit}
.cx-chips{display:flex;gap:0;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 0 4px;border-bottom:1px solid var(--line)}.cx-chips::-webkit-scrollbar{display:none}
.cx-chips button{border:0;border-bottom:3px solid transparent;margin-bottom:-1px;background:none;color:var(--muted);padding:0 14px;font:inherit;font-size:var(--t-14);font-weight:500;cursor:pointer;min-height:44px;white-space:nowrap}
.cx-chips button.on{color:var(--ink);font-weight:600;border-bottom-color:var(--ink)}
.cx-grp h2{font:600 var(--t-12)/1.3 var(--f-body);letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:26px 0 0;padding-bottom:6px;border-bottom:1px solid var(--line)}
.cx-grid{columns:2 420px;column-gap:48px}
.cx-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 14px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--line-2);text-decoration:none;color:var(--ink);min-width:0;break-inside:avoid}
.cx-card:hover{border-bottom-color:var(--ink)}
.cx-card b{grid-column:1;font-weight:600;line-height:var(--lh-ui)}
.cx-card span.cx-d{grid-column:1;color:var(--ink-2);font-size:var(--t-14);line-height:1.4}
.cx-lv{font:500 var(--t-12) var(--f-mono);color:var(--muted);white-space:nowrap}.cx-card .cx-lv{grid-column:2;grid-row:1}

.cx-none{color:var(--muted);margin:18px 0}
.cx-one{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:14px;align-items:start}
@media(max-width:860px){.cx-one{display:flex;flex-direction:column;align-items:stretch}.cx-stack{display:contents}.cx-picbox{order:-1}}
.cx-box{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:14px 16px;min-width:0}
.cx-box h2{font:600 var(--t-12)/1.3 var(--f-body);letter-spacing:.04em;text-transform:uppercase;margin:0 0 10px;color:var(--muted)}
.cx-f{display:grid;gap:10px}
.cx-f label{display:grid;gap:4px;font-size:var(--t-14);font-weight:600;line-height:1.3}
.cx-in{display:flex;align-items:stretch;border:1px solid var(--edge);border-radius:var(--r-ctl);background:var(--surface);overflow:hidden}
.cx-in input,.cx-in select{flex:1;min-width:0;border:0;background:transparent;color:var(--ink);padding:9px 10px;min-height:42px;font:inherit;font-family:var(--f-mono)}
.cx-in select{font-family:inherit}
.cx-in i{font-style:normal;display:flex;align-items:center;padding:0 10px;color:var(--muted);font-size:var(--t-13);border-left:1px solid var(--line);white-space:nowrap}
.cx-in.bad{border-color:var(--danger)}
.cx-res{display:grid;gap:0}
.cx-row{display:flex;gap:10px;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid var(--line-2);flex-wrap:wrap}
.cx-row:last-child{border-bottom:0}
.cx-row span{color:var(--muted);font-size:var(--t-14);line-height:1.35}
.cx-row b{font-family:var(--f-mono);font-size:var(--t-16);text-align:right;overflow-wrap:anywhere;min-width:0}
.cx-row b small{font-weight:500;color:var(--muted);font-size:var(--t-13);margin-left:4px}
.cx-row.big{display:grid;justify-content:start;gap:2px;background:var(--surface-2);border:0;border-left:3px solid var(--ink);border-radius:0;padding:12px 14px;margin-bottom:6px}
.cx-row.big span{color:var(--ink);font-weight:600}
.cx-row.big b{font-size:var(--t-24);line-height:1.15;text-align:left}
.cx-row.big b small{font-size:var(--t-16)}
.cx-row.bad b{color:var(--danger)}
.cx-row.ok b{color:var(--power)}
.cx-row.big.bad{background:var(--danger-soft);border-left-color:var(--danger)}
.cx-err{background:var(--danger-soft);border-radius:var(--r-ctl);padding:12px 14px;line-height:1.45}
.cx-warn{border-left:4px solid #e9a100;background:var(--surface-2);border-radius:var(--r-ctl);padding:9px 12px;margin-top:10px;font-size:var(--t-14);line-height:1.45}
.cx-how{font-family:var(--f-mono);font-size:var(--t-13);line-height:1.55;background:var(--surface-2);border-radius:var(--r-ctl);padding:10px 12px;overflow-x:auto}
.cx-how div{white-space:pre-wrap;overflow-wrap:anywhere}
.cx-tips{margin:0;padding-left:18px;font-size:var(--t-14);line-height:1.5}
.cx-tips li{margin:0 0 5px}
.cx-nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;margin-top:16px}
.cx-stack{display:grid;gap:14px;min-width:0}
.cx-pic svg{display:block;width:100%;height:auto}
.cx-cap{font-size:var(--t-13);color:var(--muted);margin:8px 0 0;line-height:1.4}
.cx-svg text{font-family:var(--f-mono);font-size:var(--t-11);fill:currentColor}
.cx-svg .t2{font-size:var(--t-13);font-weight:700}
.cx-svg .tm{fill:var(--muted)}
.cx-svg .s{fill:none;stroke:currentColor;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.cx-svg .s1{fill:none;stroke:currentColor;stroke-width:1;opacity:.45;stroke-dasharray:3 3}
.cx-svg .bd{fill:var(--surface-2);stroke:currentColor;stroke-width:2;stroke-linejoin:round}
.cx-svg .wa{fill:#2c6cc4;opacity:.6}
.cx-svg .wb{fill:#e9a100;opacity:.75}
.cx-svg .pp{fill:none;stroke:currentColor;stroke-width:9;opacity:.16;stroke-linecap:round;stroke-linejoin:round}
.cx-svg .fl{fill:none;stroke:#2c6cc4;stroke-width:4;stroke-dasharray:9 7;stroke-linejoin:round}
.cx-svg .fl.hot{stroke:#e2553b}
.cx-svg .fl.am{stroke:#e9a100}
.cx-svg .fl.el{stroke:var(--power-bright)}
.cx-svg .gn{fill:var(--power-bright)}
.cx-svg .rd{fill:var(--danger)}
.cx-svg .mu{fill:var(--muted)}
.cx-svg .hl{fill:var(--power-soft);stroke:var(--power);stroke-width:1.5}
.cx-svg .bz{fill:var(--danger-soft)}
.cx-svg .ac{fill:none;stroke:var(--power-bright);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}`;
  let cssIn = false;
  function css() { if (cssIn) return; cssIn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } };
  const save = (o) => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) { /* private mode */ } };
  let listState = { q: '', g: '' };

  function list(main) {
    const wrap = el(`<div class="wrap cx-head"><span class="plate">Tools</span><h1 style="margin:10px 0 8px">Calculators</h1>
      <p class="muted">${LIST.length} calculators for the numbers you need on a project: fill a tank, size a pump, a pipe, a cable or a power supply, scale an analog value. Each one shows the formula with your numbers in it, and many have a moving picture.</p>
      <div class="cx-find"><input type="search" id="cx-q" placeholder="Search: cable, 4–20 mA, hex, encoder…" aria-label="Search the calculators" autocomplete="off"></div>
      <div class="cx-chips" role="group" aria-label="Group"></div><div class="cx-list"></div></div>`);
    const q = wrap.querySelector('#cx-q'), chips = wrap.querySelector('.cx-chips'), out = wrap.querySelector('.cx-list');
    q.value = listState.q;
    const draw = () => {
      chips.innerHTML = [['', 'All']].concat(GROUPS).map(([k, n]) => `<button type="button" data-g="${k}" class="${listState.g === k ? 'on' : ''}" aria-pressed="${listState.g === k}">${esc(n)}</button>`).join('');
      const words = listState.q.toLowerCase().split(/\s+/).filter(Boolean);
      const hit = (c) => { const t = (c.t + ' ' + c.d + ' ' + (c.key || '')).toLowerCase(); return words.every((w) => t.includes(w)); };
      const html = GROUPS.filter(([k]) => !listState.g || listState.g === k).map(([k, n]) => {
        const cs = LIST.filter((c) => c.g === k && hit(c));
        return cs.length ? `<section class="cx-grp"><h2>${esc(n)}</h2><div class="cx-grid">${cs.map((c) => `<a class="cx-card" href="#calc-${c.id}"><b>${esc(c.t)}</b><span class="cx-d">${esc(c.d)}</span><span class="cx-lv">${LEVELS[c.lv]}${c.pic ? ' · picture' : ''}</span></a>`).join('')}</div></section>` : '';
      }).join('');
      out.innerHTML = html || '<p class="cx-none">No calculator found. Try a shorter word.</p>';
    };
    q.addEventListener('input', () => { listState.q = q.value; draw(); });
    chips.addEventListener('click', (e) => { const b = e.target.closest('button[data-g]'); if (!b) return; listState.g = b.dataset.g; draw(); });
    draw();
    main.appendChild(wrap);
  }

  function one(main, c) {
    const all = load(), vals = Object.assign(defaults(c), all[c.id] || {});
    const same = LIST.filter((x) => x.g === c.g), at = same.indexOf(c), prev = same[at - 1], next = same[at + 1];
    const gname = (GROUPS.find((g) => g[0] === c.g) || [])[1];
    const wrap = el(`<div class="wrap"><a class="btn small ghost" href="#calc">← All calculators</a>
      <h1 style="margin:10px 0 6px">${esc(c.t)}</h1><p class="muted" style="margin:0;max-width:68ch">${esc(c.d)} <span class="cx-lv" style="margin:0 0 0 6px">${LEVELS[c.lv]}</span></p>
      <div class="cx-one"><div class="cx-box"><h2>Your numbers</h2><div class="cx-f"></div><p style="margin:12px 0 0"><button type="button" class="btn small" id="cx-reset">Back to the example</button></p></div>
      <div class="cx-stack"><div class="cx-box cx-picbox" hidden><h2 style="display:flex;justify-content:space-between;align-items:center;gap:8px">See it <button type="button" class="btn small" id="cx-pause"></button></h2><div class="cx-pic"></div><p class="cx-cap"></p></div><div class="cx-box"><h2>Result</h2><div class="cx-out" aria-live="polite"></div></div>
      <div class="cx-box cx-howbox"><h2>How it is calculated</h2><div class="cx-how"></div></div>
      <div class="cx-box"><h2>Good to know</h2><ul class="cx-tips">${(c.tips || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div></div>
      <div class="cx-nav">${prev ? `<a class="btn small" href="#calc-${prev.id}">← ${esc(prev.t)}</a>` : '<span></span>'}${next ? `<a class="btn small" href="#calc-${next.id}">${esc(next.t)} →</a>` : '<span></span>'}</div>
      <p class="muted" style="font-size:var(--t-13);margin:14px 0 0;max-width:68ch">${esc(gname)}. A calculator helps you check, it does not replace the datasheet, the standard of your country or the engineer who signs the drawing.</p></div>`);
    const form = wrap.querySelector('.cx-f'), out = wrap.querySelector('.cx-out'), how = wrap.querySelector('.cx-how'), howBox = wrap.querySelector('.cx-howbox');
    const drawForm = () => {
      form.innerHTML = c.f.map((x) => {
        if (x.show && !x.show(vals)) return '';
        const id = 'cx-' + x.k;
        let inp;
        if (x.ty === 's') inp = `<select id="${id}" data-k="${x.k}">${x.opts.map((o) => `<option value="${esc(o[0])}"${String(vals[x.k]) === String(o[0]) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
        else if (x.ty === 'x') inp = `<input id="${id}" data-k="${x.k}" type="text" value="${esc(vals[x.k])}" placeholder="${esc(x.ph)}" autocomplete="off" autocapitalize="off" spellcheck="false">`;
        else inp = `<input id="${id}" data-k="${x.k}" type="number" step="any" inputmode="decimal" value="${esc(vals[x.k])}">`;
        return `<label for="${id}">${esc(x.l)}<span class="cx-in">${inp}${x.u ? `<i>${esc(x.u)}</i>` : ''}</span></label>`;
      }).join('');
    };
    const picBox = wrap.querySelector('.cx-picbox'), picEl = wrap.querySelector('.cx-pic'), capEl = wrap.querySelector('.cx-cap'), pauseBtn = wrap.querySelector('#cx-pause');
    let still = false; try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
    const an = { t: 0, last: 0, paused: still, p: null, els: null };
    const paint = () => { if (an.p && an.p.run) an.p.run(an.els, an.t); };
    const setPause = () => { pauseBtn.textContent = an.paused ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', String(an.paused)); };
    pauseBtn.onclick = () => { an.paused = !an.paused; setPause(); };
    const drawPic = (r) => {
      const p = c.pic && r ? c.pic(vals, r.x || {}, r) : null;
      an.p = p; picBox.hidden = !p;
      if (!p) return;
      picEl.innerHTML = p.svg; capEl.textContent = p.cap || ''; capEl.hidden = !p.cap; pauseBtn.hidden = !p.run;
      an.els = {}; picEl.querySelectorAll('[data-i]').forEach((n) => { an.els[n.getAttribute('data-i')] = n; });
      if (an.paused && an.t === 0 && p.still) an.t = p.still;
      paint();
    };
    const frame = (now) => {
      if (!wrap.isConnected) return;
      if (!an.paused && an.last) { an.t += Math.min(0.1, (now - an.last) / 1000); paint(); }
      an.last = now;
      requestAnimationFrame(frame);
    };
    const calc = () => {
      const r = run(c.id, vals);
      if (!r || r.err) { out.innerHTML = `<div class="cx-err">${esc(r ? r.err : 'Not found.')}</div>`; howBox.hidden = true; drawPic(null); return; }
      drawPic(r);
      out.innerHTML = '<div class="cx-res">' + r.r.map((x) => `<div class="cx-row ${esc(x[3] || '')}"><span>${esc(x[0])}</span><b>${esc(x[1])}${x[2] ? `<small>${esc(x[2])}</small>` : ''}</b></div>`).join('') + '</div>'
        + (r.warn || []).map((w) => `<div class="cx-warn">${esc(w)}</div>`).join('');
      howBox.hidden = !(r.how && r.how.length);
      how.innerHTML = (r.how || []).map((h) => `<div>${esc(h)}</div>`).join('');
    };
    const read = (inp) => {
      const x = c.f.find((y) => y.k === inp.dataset.k); if (!x) return;
      vals[x.k] = x.ty === 'n' ? (inp.value.trim() === '' ? NaN : parseFloat(inp.value.replace(',', '.'))) : inp.value;
      const a = load(), keep = {};
      c.f.forEach((y) => { const val = vals[y.k]; if (!(y.ty === 'n' && !isFinite(val))) keep[y.k] = val; });
      a[c.id] = keep; save(a);
    };
    form.addEventListener('input', (e) => { const t = e.target; if (!t.dataset || !t.dataset.k) return; read(t); if (t.tagName === 'SELECT') { drawForm(); const s = form.querySelector('#cx-' + t.dataset.k); if (s) s.focus(); } calc(); });
    wrap.querySelector('#cx-reset').onclick = () => { Object.assign(vals, defaults(c)); const a = load(); delete a[c.id]; save(a); drawForm(); calc(); };
    setPause(); drawForm(); calc();
    main.appendChild(wrap);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(frame);
  }

  function page(main, id) {
    css();
    if (id && BY[id]) one(main, BY[id]); else list(main);
  }

  LL.Calc = { LIST, GROUPS, LEVELS, run, page, add, pic: (id, fn) => { if (BY[id]) BY[id].pic = fn; }, defaults,
    _h: { F, N, S, X, E, esc, nextStd, span, STD_MOTOR, AMP, CSA } };
})();
