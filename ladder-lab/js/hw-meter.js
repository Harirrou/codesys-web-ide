/* Ladder Lab — "Measure like an electrician". Mounted in lessons through [[hw:meter]].
 * Tab 1: a 24 V DC control circuit (power supply, fuse, E-stop, START, relay coil with flyback diode, relay contact,
 * lamp, PLC inputs) with numbered test points and a multimeter (V DC, V AC, Ω, continuity). The readings come from a
 * small nodal solver, so every probe pair gives a realistic value (also polarity, floating points, wrong dial position).
 * Four hidden faults (blown fuse, broken wire, burnt coil, contact that does not close) must be PROVEN with a measurement.
 * Tab 2: a 3-phase motor nameplate: star or delta for 400 V mains, and the overload relay set to the nameplate current. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-meter';
  let uidN = 0;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // keep device ids like -K1 or -F1 on one line
  const nw = (s) => String(s).replace(/(^|[\s(])(-[A-Z][0-9]+(?:\s1[34]–1[34])?)/g, '$1<span class="hwm-nw">$2</span>');
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ───────────── brands: how the PLC input card is named ─────────────
  const BR = {
    tia: { b: 'Siemens', s: 'TIA', n: 'Siemens TIA', card: 'DI 16 × 24 V DC', a: ['%I0.0', '%I0.1', '%I0.2'], ol: 'Siemens 3RU2',
      on: 'In TIA Portal go online: the contact of "EStop_OK" turns green, or watch %I0.0 in a watch table.' },
    sch: { b: 'Schneider', s: '', n: 'Schneider Machine Expert', card: 'M241 inputs', a: ['%IX0.0', '%IX0.1', '%IX0.2'], ol: 'Schneider TeSys LRD',
      on: 'In Machine Expert log in: the I/O mapping of the controller shows %IX0.0 = TRUE. (M221 in Machine Expert Basic: %I0.0.)' },
    tc: { b: 'TwinCAT', s: '', n: 'Beckhoff TwinCAT', card: 'EL1008 terminal', a: ['In 1', 'In 2', 'In 3'], ol: 'any brand (Beckhoff makes none)',
      on: 'In TwinCAT the EL1008 has an LED per channel; online, the linked variable bEStopOk (AT %I*) shows TRUE.' },
    om: { b: 'Omron', s: '', n: 'Omron', card: 'CJ / CP inputs', a: ['0.00', '0.01', '0.02'], ol: 'Omron J7TKN',
      on: 'In CX-Programmer go online: CIO 0.00 shows 1. In Sysmac Studio (NX/NJ) the I/O Map shows TRUE.' },
    rk: { b: 'Studio 5000', s: '', n: 'Rockwell Studio 5000', card: 'Local:1:I', a: ['Data.0', 'Data.1', 'Data.2'], ol: 'Allen-Bradley 193-T1',
      on: 'In Studio 5000 go online: Local:1:I.Data.0 = 1 in the tag monitor. US drawings name the relay CR1 and the lamp PL1.' },
    cds: { b: 'CODESYS', s: '', n: 'CODESYS', card: 'DI card', a: ['%IX0.0', '%IX0.1', '%IX0.2'], ol: 'any brand (e.g. Siemens 3RU2)',
      on: 'In CODESYS log in: the I/O mapping of the card shows %IX0.0 = TRUE.' },
  };
  const BORDER = ['tia', 'sch', 'tc', 'om', 'rk', 'cds'];

  // ───────────── the circuit ─────────────
  // nodes n1…n8 (n8 = M = 0 V, earthed: PE is the same node). L and N are the 230 V mains side of the power supply.
  const PTS = {
    L: { n: 'L', wx: 76, wy: 190, bx: 76, by: 176, d: 'mains L (input of the power supply)' },
    N: { n: 'N', wx: 76, wy: 220, bx: 76, by: 206, d: 'mains N (input of the power supply)' },
    PE: { n: 'n8', wx: 76, wy: 250, bx: 76, by: 236, d: 'PE, the protective earth' },
    1: { n: 'n1', wx: 220, wy: 110, bx: 241, by: 110, d: '+24 V terminal of the power supply (L+)' },
    2: { n: 'n2', wx: 330, wy: 60, bx: 330, by: 39, d: 'after the fuse -F1' },
    3: { n: 'n3', wx: 360, wy: 160, bx: 338, by: 160, d: 'after the E-stop -S1 (also PLC input 1 and -K1 contact 13)' },
    4: { n: 'n4', wx: 360, wy: 240, bx: 338, by: 240, d: 'START -S2, terminal 14' },
    5: { n: 'n5', wx: 360, wy: 272, bx: 338, by: 272, d: 'relay coil -K1, terminal A1' },
    6: { n: 'n6', wx: 360, wy: 352, bx: 338, by: 352, d: 'relay coil -K1, terminal A2' },
    7: { n: 'n7', wx: 490, wy: 250, bx: 468, by: 250, d: 'after the contact -K1 13–14 (lamp -H1 and PLC input 2)' },
    8: { n: 'n8', wx: 220, wy: 360, bx: 241, by: 360, d: 'the 0 V rail (M)' },
  };
  const PORDER = ['L', 'N', 'PE', '1', '2', '3', '4', '5', '6', '7', '8'];
  const ZERO = { 8: 1, PE: 1 }; // points that are 0 V (M) — the reference for "point X against 0 V"
  const DCN = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'];
  const IDX = {};
  DCN.forEach((k, i) => (IDX[k] = i));
  const LEAD = 0.2; // test lead resistance in Ω

  // parts: the element between two test points, with a kind (sw = should be closed or open, load, psu)
  const PARTS = {
    fuse: { t: '-F1 fuse', a: '1', b: '2', k: 'sw' },
    estop: { t: '-S1 E-stop', a: '2', b: '3', k: 'sw' },
    start: { t: '-S2 START', a: '3', b: '4', k: 'sw' },
    wire: { t: 'wire 4–5', a: '4', b: '5', k: 'sw' },
    coil: { t: '-K1 coil', a: '5', b: '6', k: 'load' },
    contact: { t: '-K1 contact 13–14', a: '3', b: '7', k: 'sw' },
    lamp: { t: '-H1 lamp', a: '7', b: '8', k: 'load' },
    psu: { t: '-G1 power supply', a: '1', b: '8', k: 'psu' },
  };
  const VERDICT = ['fuse', 'estop', 'start', 'wire', 'coil', 'contact', 'lamp', 'psu'];
  const pkey = (a, b) => [a, b].sort().join('|');
  const PAIR = {};
  Object.keys(PARTS).forEach((k) => (PAIR[pkey(PARTS[k].a, PARTS[k].b)] = k));
  PAIR[pkey('1', 'PE')] = 'psu';
  PAIR[pkey('7', 'PE')] = 'lamp';
  PAIR[pkey('6', '8')] = 'a2';
  PAIR[pkey('6', 'PE')] = 'a2';

  const CASES = {
    ok: { t: 'Working circuit', sym: 'Everything works. Hold START: the relay -K1 pulls in, the lamp -H1 lights and the PLC sees input 2. Use it to learn what GOOD readings look like.' },
    A: { t: 'Fault A', part: 'fuse', sym: 'The operator says: "Nothing works." The lamp is off and no PLC input LED is on, not even input 1 (E-stop OK). The green DC OK LED of the power supply is on.',
      hint: 'Start at the power supply. Measure each point against point 8 (0 V): 1, 2, 3 … Where does the 24 V stop?',
      win: 'Right: the fuse -F1 is blown. 24 V before it, 0 V after it (or OL with Ω). Before you put in a new fuse, ask WHY it blew: look for a short circuit (Ω from point 2 to point 8, power OFF).' },
    B: { t: 'Fault B', part: 'wire', sym: 'The operator says: "I press START, but the relay does not click." Input 1 (E-stop OK) is on.',
      hint: 'Ask the colleague to hold START. Then measure points 3, 4, 5 and 6 against point 8. Where does the 24 V stop?',
      win: 'Right: the wire from START (4) to the coil (5) is broken. Point 4 has 24 V, point 5 has 0 V, so there are 24 V across the wire. A good wire shows 0 V.' },
    C: { t: 'Fault C', part: 'coil', sym: 'The operator says: "I press START, but the relay does not click." (Yes, the same complaint as fault B. Only measuring tells the difference!)',
      hint: 'Hold START and find out if 24 V reaches the coil (points 5 and 6). If it gets 24 V and still does not pull in, check the coil with Ω (power OFF).',
      win: 'Right: the coil of -K1 is burnt (open). It gets 24 V but does not pull in, and Ω shows OL instead of about 600 Ω. Change the relay.' },
    D: { t: 'Fault D', part: 'contact', sym: 'The operator says: "The relay clicks and its LED is on, but the lamp stays off." The PLC input 2 (K1 on) stays off too.',
      hint: 'The relay pulls in, so its coil circuit is fine. Hold START and measure across the contact -K1 13–14 (points 3 and 7), or points 3 and 7 against point 8.',
      win: 'Right: the contact -K1 13–14 does not close. The relay pulls in, but you measure 24 V across the contact: it is open. Change the relay. (The lamp was fine: the PLC input 2 was off too, and both get their 24 V through point 7.)' },
  };
  const CORDER = ['ok', 'A', 'B', 'C', 'D'];

  const MODES = [
    { k: 'off', t: 'OFF', a: -80, l: 'Off' },
    { k: 'vac', t: 'V AC', a: -40, l: 'Volts AC' },
    { k: 'vdc', t: 'V DC', a: 0, l: 'Volts DC' },
    { k: 'ohm', t: 'Ω', a: 40, l: 'Ohms' },
    { k: 'cont', t: '•)))', a: 80, l: 'Continuity beep' },
  ];
  const MBY = {};
  MODES.forEach((m) => (MBY[m.k] = m));

  // ───────────── the motors (tab 2) ─────────────
  const MOT = {
    1: { name: 'Motor 1 · pump', type: '112M-4', v: '230/400 V', vv: 'Δ/Y', a: '13.6/7.9 A', kw: '4.0', cos: '0.83', rpm: 1440, eff: '88.6', ip: 'IP55', uw: 230, In: 7.9,
      lo: 5.5, hi: 8, start: 6.5, right: 'Y', I: 7.5, run: 1446, bad: { Y: null, D: { I: 24.6, rpm: 1490 } } },
    2: { name: 'Motor 2 · fan', type: '160M-4', v: '400/690 V', vv: 'Δ/Y', a: '20.4/11.8 A', kw: '11', cos: '0.85', rpm: 1465, eff: '91.4', ip: 'IP55', uw: 400, In: 20.4,
      lo: 17, hi: 22, start: 19, right: 'D', I: 19.4, run: 1468, bad: { Y: { I: 33, rpm: 1250 }, D: null } },
  };

  // ───────────── the mission ─────────────
  const CHECKS = [
    { id: 'm24', g: 'Measure', t: '24 V DC at the power supply', d: 'V DC, red on 1, black on 8.', hint: 'Turn the dial to V DC. Click point 1 (red probe), then point 8 (black probe).' },
    { id: 'm230', g: 'Measure', t: '230 V AC at the supply input', d: 'V AC between L and N.', hint: 'Turn the dial to V AC and put the probes on L and N (the mains input of the power supply).' },
    { id: 'mClosed', g: 'Measure', t: 'Closed contact = 0 V', d: 'Working circuit: V DC across the E-stop (2 and 3).', hint: 'Working circuit, power ON, E-stop released: measure V DC between points 2 and 3, across the E-stop.' },
    { id: 'mOpen', g: 'Measure', t: 'Open contact = 24 V', d: 'Working circuit: V DC across START (3 and 4), not pressed.', hint: 'Working circuit, nobody holds START: measure V DC between points 3 and 4, across the START button.' },
    { id: 'mCoil', g: 'Measure', t: 'Coil resistance with power OFF', d: 'Working circuit: Ω across the coil (5 and 6).', hint: 'Switch the main switch -Q1 OFF. Turn the dial to Ω and measure between points 5 and 6 (the coil -K1).' },
    { id: 'fA', g: 'Find the fault', t: 'Fault A solved', d: 'Prove it, then name the part.', hint: 'Choose Fault A above the drawing, measure, then name the faulty part.' },
    { id: 'fB', g: 'Find the fault', t: 'Fault B solved', d: 'Prove it, then name the part.', hint: 'Choose Fault B above the drawing, measure, then name the faulty part.' },
    { id: 'fC', g: 'Find the fault', t: 'Fault C solved', d: 'Prove it, then name the part.', hint: 'Choose Fault C. It has the same complaint as B: measure to tell them apart.' },
    { id: 'fD', g: 'Find the fault', t: 'Fault D solved', d: 'Prove it, then name the part.', hint: 'Choose Fault D, measure, then name the faulty part.' },
    { id: 'mot1', g: 'Motor nameplate', t: 'Motor 1 runs correctly', d: 'Right connection for 400 V, overload = nameplate current.', hint: 'Open the tab "2 · Motor nameplate": connect Motor 1 for 400 V mains, set its overload relay, press Test run.' },
    { id: 'mot2', g: 'Motor nameplate', t: 'Motor 2 runs correctly', d: 'Right connection for 400 V, overload = nameplate current.', hint: 'In the tab "2 · Motor nameplate" choose Motor 2: it has a different nameplate voltage. Connect it, set the overload, press Test run.' },
  ];

  // ───────────── CSS (once) ─────────────
  const CSS = `
.hw-meter{--hwm-red:#d7263d;--hwm-blk:#1d2730;--hwm-body:#f1b233;--hwm-body2:#d99716;--hwm-lcd:#bfcbb6;--hwm-lcdink:#17221a;--hwm-lamp:#ffc233}
:root[data-theme="dark"] .hw-meter{--hwm-red:#ff5a6e;--hwm-blk:#d5dde3;--hwm-body:#d99a22;--hwm-body2:#b07a12;--hwm-lcd:#a9b7a0}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hw-meter{--hwm-red:#ff5a6e;--hwm-blk:#d5dde3;--hwm-body:#d99a22;--hwm-body2:#b07a12;--hwm-lcd:#a9b7a0}}
.hw-box.hw-meter{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:18px 0;color:var(--ink);font-size:.95rem;line-height:1.45;min-width:0}
.hw-meter *{box-sizing:border-box}
.hw-meter p,.hw-meter li{max-width:none}
.hwm-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.hwm-title{margin:0;font-family:var(--f-display);font-weight:700;font-size:1.32rem;line-height:1.15;letter-spacing:.01em}
.hwm-seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface-2);max-width:100%}
.hwm-seg button{flex:1 1 auto;min-height:36px;padding:4px 11px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--ink-2);font-weight:600;font-size:.84rem;cursor:pointer;white-space:nowrap}
.hwm-seg button:first-child{border-left:0}
.hwm-seg button:hover{background:var(--surface-3)}
.hwm-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwm-intro{margin:8px 0 0;color:var(--ink-2);font-size:.92rem}
.hwm-rule{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:10px 0 0;padding:8px 12px;border-radius:10px;background:color-mix(in srgb,var(--accent-bg) 16%,var(--surface));border:1px solid color-mix(in srgb,var(--accent-bg) 55%,var(--line));font-size:.9rem}
.hwm-rule b{font-family:var(--f-display);letter-spacing:.06em;text-transform:uppercase;font-size:.9rem}
.hwm-rule span{white-space:nowrap}
.hwm-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 0;border-bottom:1px solid var(--line);padding-bottom:8px}
.hwm-tab{min-height:38px;padding:4px 14px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;color:var(--ink-2)}
.hwm-tab:hover{background:var(--surface-2)}
.hwm-tab[aria-selected="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.hwm-tab:focus-visible,.hwm-meter [data-act]:focus-visible{outline:3px solid var(--accent-bg);outline-offset:2px}
.hwm-sec{margin-top:14px}
.hwm-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 12px;margin:0 0 8px}
.hwm-h b{font-family:var(--f-display);font-size:.95rem;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2)}
.hwm-h span{font-size:.82rem;color:var(--muted)}
.hwm-cases{display:flex;flex-wrap:wrap;gap:6px}
.hwm-case{min-height:36px;padding:4px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font:inherit;font-weight:600;font-size:.86rem;cursor:pointer;color:var(--ink-2);display:inline-flex;align-items:center;gap:6px}
.hwm-case:hover{background:var(--surface-2)}
.hwm-case[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.hwm-case i{font-style:normal;color:var(--power);font-weight:800}
.hwm-case[aria-pressed="true"] i{color:var(--power-bright)}
.hwm-sym{margin:8px 0 0;padding:8px 12px;border-radius:10px;background:var(--surface-2);border-left:4px solid var(--info);font-size:.9rem}
.hwm-sym.f{border-left-color:var(--danger)}
.hwm-sym.solved{border-left-color:var(--power)}
.hwm-ctl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.hwm-sw{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:4px 12px 4px 6px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font:inherit;font-size:.86rem;color:var(--ink);cursor:pointer;text-align:left;line-height:1.2}
.hwm-sw:hover{background:var(--surface-2)}
.hwm-sw small{display:block;color:var(--muted);font-size:.74rem}
.hwm-sw b{font-weight:700}
.hwm-knobi{flex:none;width:28px;height:28px;border-radius:7px;display:grid;place-items:center;background:var(--surface-3);color:var(--ink-2);font-weight:800;font-size:.72rem}
.hwm-sw[aria-pressed="true"] .hwm-knobi{background:var(--power);color:#fff}
.hwm-sw.es .hwm-knobi{background:#c62828;color:#fff;border-radius:50%}
.hwm-sw.es[aria-pressed="true"]{border-color:var(--danger);background:var(--danger-soft)}
.hwm-sw.st[aria-pressed="true"]{border-color:var(--power);background:var(--power-soft)}
.hwm-sw.pw[aria-pressed="false"]{border-color:var(--accent-bg);background:color-mix(in srgb,var(--accent-bg) 14%,var(--surface))}
.hwm-sw.pw[aria-pressed="false"] .hwm-knobi{background:var(--accent-bg);color:var(--accent-ink)}
.hwm-draw{margin-top:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);padding:6px;overflow-x:auto;scrollbar-width:thin}
.hwm-svg{display:block;width:100%;height:auto;min-width:0}
.hwm-narrow .hwm-svg{min-width:640px}
.hwm-swipe{display:none;font-size:.78rem;color:var(--muted);margin-top:4px}
.hwm-narrow .hwm-swipe{display:block}
.hwm-svg .w{fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hwm-svg .thin{stroke-width:1.5}
.hwm-svg .dash{stroke-dasharray:4 3;stroke-width:1.4}
.hwm-svg .pe1{fill:none;stroke:#e6c800;stroke-width:3}
.hwm-svg .pe2{fill:none;stroke:#2e9d4f;stroke-width:3;stroke-dasharray:7 7}
.hwm-svg .box{fill:var(--surface);stroke:var(--ink-2);stroke-width:2}
.hwm-svg .jd{fill:var(--ink-2)}
.hwm-svg text{font-family:var(--f-body);fill:var(--ink-2);font-size:11px}
.hwm-svg .lb{font-weight:700;fill:var(--ink);font-size:12px}
.hwm-svg .sm{font-size:9.5px;fill:var(--muted)}
.hwm-svg .mono{font-family:var(--f-mono)}
.hwm-svg .addr{font-family:var(--f-mono);font-weight:700;font-size:11px;fill:var(--ink)}
.hwm-svg .led{fill:var(--surface-3);stroke:var(--line);stroke-width:1}
.hwm-svg .led.on{fill:var(--power-bright);stroke:var(--power);filter:drop-shadow(0 0 3px var(--power-bright))}
.hwm-svg .coil{fill:var(--surface);stroke:var(--ink-2);stroke-width:2}
.hwm-svg .coil.on{fill:var(--power-soft);stroke:var(--power)}
.hwm-svg .lamp{fill:var(--surface);stroke:var(--ink-2);stroke-width:2}
.hwm-svg .lamp.on{fill:var(--hwm-lamp);stroke:#b97f00;filter:drop-shadow(0 0 7px var(--hwm-lamp))}
.hwm-svg .badge rect{fill:var(--accent-bg)}
.hwm-svg .badge text{fill:var(--accent-ink);font-weight:700;font-size:9.5px}
.hwm-svg .badge.g rect{fill:var(--power)}
.hwm-svg .badge.g text{fill:#fff}
.hwm-svg .badge.r rect{fill:var(--danger)}
.hwm-svg .badge.r text{fill:#fff}
.hwm-svg [data-act]{cursor:pointer}
.hwm-svg .part:hover .hl,.hwm-svg .part:focus-visible .hl{fill:color-mix(in srgb,var(--info) 12%,transparent);stroke:var(--info)}
.hwm-svg .hl{fill:transparent;stroke:transparent;stroke-width:1.5;stroke-dasharray:3 3}
.hwm-svg .part:focus-visible{outline:none}
.hwm-tp .hit{fill:transparent}
.hwm-tp .tpd{fill:var(--ink-2)}
.hwm-tp .tpl{stroke:var(--muted);stroke-width:1.2}
.hwm-tp .tpb{fill:var(--surface);stroke:var(--info);stroke-width:2}
.hwm-tp text{font-family:var(--f-mono);font-weight:700;font-size:11px;fill:var(--info);text-anchor:middle;dominant-baseline:central;pointer-events:none}
.hwm-tp.pe text{font-size:8.5px}
.hwm-tp:hover .tpb,.hwm-tp:focus-visible .tpb{fill:color-mix(in srgb,var(--info) 18%,var(--surface));stroke-width:3}
.hwm-tp:focus-visible{outline:none}
.hwm-tp.red .tpb{fill:var(--hwm-red);stroke:var(--hwm-red)}
.hwm-tp.red text{fill:#fff}
.hwm-tp.blk .tpb{fill:var(--hwm-blk);stroke:var(--hwm-blk)}
.hwm-tp.blk text{fill:var(--surface)}
.hwm-tp .ring{fill:none;stroke-width:2;opacity:0}
.hwm-tp.red .ring{stroke:var(--hwm-red);opacity:.45}
.hwm-tp.blk .ring{stroke:var(--hwm-blk);opacity:.45}
.hwm-tp .ptag{font-family:var(--f-body);font-size:8.5px;font-weight:800}
.hwm-tp.red .ptag{fill:var(--hwm-red)}
.hwm-tp.blk .ptag{fill:var(--hwm-blk)}
.hwm-mgrid{display:grid;grid-template-columns:236px minmax(0,1fr);gap:14px;margin-top:12px;align-items:start}
.hwm-narrow .hwm-mgrid{grid-template-columns:minmax(0,1fr)}
.hwm-dev{width:236px;max-width:100%;margin:0 auto;border-radius:22px;padding:12px 12px 10px;background:linear-gradient(180deg,var(--hwm-body),var(--hwm-body2));box-shadow:inset 0 0 0 3px rgba(0,0,0,.12),0 4px 12px rgba(0,0,0,.18);color:#1c1406}
.hwm-lcd{position:relative;height:74px;border-radius:9px;background:var(--hwm-lcd);box-shadow:inset 0 2px 6px rgba(0,0,0,.35);padding:6px 10px;color:var(--hwm-lcdink);display:flex;align-items:flex-end;justify-content:flex-end;gap:6px;overflow:hidden}
.hwm-lcd b{font:600 2.35rem/1 var(--f-mono);letter-spacing:-.02em}
.hwm-lcd .u{font:700 .9rem/1.6 var(--f-mono)}
.hwm-flags{position:absolute;left:9px;top:6px;display:flex;gap:6px;font:700 .64rem/1 var(--f-mono)}
.hwm-flags i{font-style:normal;opacity:.12}
.hwm-flags i.on{opacity:1}
.hwm-flags i.live.on{color:#a40000}
.hwm-lcd.off b,.hwm-lcd.off .u{opacity:0}
.hwm-lcd.beep{animation:hwm-beep .5s ease-out}
@keyframes hwm-beep{0%{box-shadow:inset 0 2px 6px rgba(0,0,0,.35),0 0 0 0 rgba(0,0,0,.4)}40%{box-shadow:inset 0 2px 6px rgba(0,0,0,.35),0 0 0 5px rgba(0,0,0,.25)}}
.hwm-dial{position:relative;height:122px;margin-top:6px}
.hwm-knob{position:absolute;left:50%;top:88px;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#59636b,#20272d);box-shadow:0 2px 6px rgba(0,0,0,.4);transition:transform .25s}
.hwm-knob i{position:absolute;left:50%;top:3px;width:6px;height:24px;margin-left:-3px;border-radius:3px;background:#f6f6f2}
.hwm-mode{position:absolute;transform:translate(-50%,-50%);min-width:44px;min-height:30px;padding:2px 6px;border:2px solid transparent;border-radius:8px;background:rgba(255,255,255,.28);color:#1c1406;font:700 .78rem/1.1 var(--f-body);cursor:pointer;white-space:nowrap}
.hwm-mode:hover{background:rgba(255,255,255,.5)}
.hwm-mode[aria-pressed="true"]{background:#1c1406;color:#ffd77a;border-color:#1c1406}
.hwm-jacks{display:flex;justify-content:space-around;margin-top:2px}
.hwm-jack{display:flex;flex-direction:column;align-items:center;gap:2px;font:700 .7rem var(--f-mono)}
.hwm-jack i{width:22px;height:22px;border-radius:50%;border:5px solid #20272d;background:#0d1114}
.hwm-jack.r i{border-color:#b3121f}
.hwm-side{min-width:0}
.hwm-probe{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:.88rem}
.hwm-pt{display:inline-flex;align-items:center;gap:5px;font-weight:700}
.hwm-pt i{width:12px;height:12px;border-radius:50%;flex:none}
.hwm-pt.r i{background:var(--hwm-red)}
.hwm-pt.b i{background:var(--hwm-blk)}
.hwm-pt em{font-style:normal;font-family:var(--f-mono)}
.hwm-pad{margin-top:8px;display:grid;gap:6px}
.hwm-padrow{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.hwm-padrow > span{width:64px;font-size:.78rem;font-weight:800;flex:none}
.hwm-padrow.r > span{color:var(--hwm-red)}
.hwm-padrow.b > span{color:var(--hwm-blk)}
.hwm-pb{min-width:32px;min-height:32px;padding:0 6px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink-2);font:700 .8rem var(--f-mono);cursor:pointer}
.hwm-pb:hover{background:var(--surface-2)}
.hwm-padrow.r .hwm-pb[aria-pressed="true"]{background:var(--hwm-red);border-color:var(--hwm-red);color:#fff}
.hwm-padrow.b .hwm-pb[aria-pressed="true"]{background:var(--hwm-blk);border-color:var(--hwm-blk);color:var(--surface)}
.hwm-pbtns{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.hwm-see{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
.hwm-see span{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line-2);font-size:.78rem;color:var(--ink-2)}
.hwm-see i{width:9px;height:9px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line)}
.hwm-see i.on{background:var(--power-bright);border-color:var(--power)}
.hwm-see i.lamp.on{background:var(--hwm-lamp);border-color:#b97f00}
.hwm-log{margin:10px 0 0;padding:0;list-style:none;font-size:.82rem;border:1px solid var(--line-2);border-radius:10px;overflow:hidden}
.hwm-log li{display:grid;grid-template-columns:3.6em minmax(0,1fr) auto;gap:8px;align-items:baseline;padding:4px 9px;border-top:1px solid var(--line-2);margin:0}
.hwm-log li:first-child{border-top:0;background:var(--surface-2)}
.hwm-log li.empty{display:block;color:var(--muted)}
.hwm-log em{font-style:normal;font-weight:700;font-size:.72rem;color:var(--muted)}
.hwm-log span{font-family:var(--f-mono);overflow-wrap:anywhere}
.hwm-log small{display:block;font-family:var(--f-body);color:var(--muted);font-size:.72rem}
.hwm-log b{font-family:var(--f-mono);white-space:nowrap}
.hwm-diag{margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.hwm-diag p{margin:0 0 8px;font-size:.9rem}
.hwm-vbtns{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.hwm-vbtns .btn{justify-content:flex-start;text-align:left}
.hwm-vbtns .btn.no{border-color:var(--danger);background:var(--danger-soft)}
.hwm-vbtns .btn.yes{border-color:var(--power);background:var(--power-soft)}
.hwm-k{font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.hwm-cl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px 10px}
.hwm-cl li{margin:0;display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:8px;background:var(--surface-2);font-size:.88rem;line-height:1.3}
.hwm-cl li > i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:.8rem}
.hwm-cl li.ok > i{background:var(--power-soft);color:var(--power)}
.hwm-cl li.no > i{background:var(--danger-soft);color:var(--danger)}
.hwm-cl small{display:block;color:var(--muted);font-size:.78rem;margin-top:1px}
.hwm-clg{grid-column:1 / -1;font-size:.72rem!important;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:none!important;padding:6px 2px 0!important}
.hwm-next{margin:10px 0 0;padding:8px 10px;border-radius:8px;border:1px dashed var(--line);font-size:.9rem}
.hwm-win{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--power-soft);border:1px solid var(--power);font-weight:600}
.hwm-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hwm-nw{white-space:nowrap}
.hwm-cap{position:sticky;bottom:10px;z-index:6;margin-top:16px;padding:9px 12px;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hwm-cap.ok{border-left-color:var(--power)}
.hwm-cap.warn{border-left-color:var(--accent-bg)}
.hwm-cap.bad{border-left-color:var(--danger)}
.hwm-caph{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:1px}
.hwm-cap p{margin:0;font-size:.93rem}
.hwm-cap .rd{font-family:var(--f-mono);font-weight:700;white-space:nowrap}
.hwm-more{display:none;align-items:center;min-height:32px;margin:-9px -8px -7px 0;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--ink);font:700 .8rem var(--f-body);cursor:pointer}
.hwm-more:hover{background:var(--surface-2)}
.hwm-narrow .hwm-cap{padding:7px 10px}
.hwm-narrow .hwm-cap.hwm-long .hwm-more{display:inline-flex}
.hwm-narrow .hwm-cap:not(.hwm-capx) p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.hwm-cap.flash{animation:hwm-flash .7s ease-out}
@keyframes hwm-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hwm-cap{bottom:calc(var(--tabbar-h) + 8px + env(safe-area-inset-bottom,0px))}}
.hwm-narrow .hwm-title{font-size:1.2rem}
.hwm-narrow .hwm-seg{width:100%}
.hwm-narrow .hwm-seg button{flex:1 1 30%;padding:4px 6px;border-top:1px solid var(--line)}
.hwm-mots{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.hwm-mains{margin:8px 0 0;font-size:.9rem;color:var(--ink-2)}
.hwm-mains b{font-family:var(--f-mono)}
.hwm-mgrid2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:12px;align-items:start}
.hwm-narrow .hwm-mgrid2{grid-template-columns:minmax(0,1fr)}
.hwm-plate{border-radius:12px;padding:10px 12px 12px;background:linear-gradient(160deg,#dfe4e7,#b9c2c8);color:#1b242a;box-shadow:inset 0 0 0 2px #8f9aa2,0 2px 6px rgba(0,0,0,.15);position:relative}
:root[data-theme="dark"] .hwm-plate{background:linear-gradient(160deg,#9aa5ad,#788690)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hwm-plate{background:linear-gradient(160deg,#9aa5ad,#788690)}}
.hwm-plate:before,.hwm-plate:after{content:"";position:absolute;top:8px;width:8px;height:8px;border-radius:50%;background:#7d8890;box-shadow:inset 0 1px 1px rgba(0,0,0,.5)}
.hwm-plate:before{left:8px}
.hwm-plate:after{right:8px}
.hwm-ptop{display:flex;justify-content:space-between;gap:8px;font:800 .82rem var(--f-display);letter-spacing:.08em;text-transform:uppercase;padding:0 14px 6px;border-bottom:2px solid #6f7b83}
.hwm-pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:8px}
.hwm-pf{display:flex;flex-direction:column;align-items:flex-start;gap:0;min-height:44px;padding:4px 7px;border:1px solid #7b868e;border-radius:6px;background:rgba(255,255,255,.35);color:#1b242a;font:inherit;cursor:pointer;text-align:left}
.hwm-pf:hover{background:rgba(255,255,255,.6)}
.hwm-pf[aria-pressed="true"]{background:#fff;box-shadow:0 0 0 2px var(--info)}
.hwm-pf small{font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#46525a}
.hwm-pf b{font:700 .95rem/1.2 var(--f-mono)}
.hwm-pf.w2{grid-column:span 2}
.hwm-pf.w3{grid-column:1 / -1}
.hwm-narrow .hwm-pgrid{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-flow:dense}
.hwm-pnote{margin:8px 0 0;font-size:.78rem;color:#33404a}
.hwm-card{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px}
.hwm-card + .hwm-card{margin-top:10px}
.hwm-card h5{margin:0 0 6px;font-size:.95rem}
.hwm-tbsvg{display:block;width:100%;max-width:330px;height:auto;margin:4px auto 0}
.hwm-tbsvg .w{fill:none;stroke:var(--ink-2);stroke-width:2;stroke-linecap:round}
.hwm-tbsvg text{font-family:var(--f-mono);font-size:11px;font-weight:700;fill:var(--ink-2)}
.hwm-tbsvg .sm{font-family:var(--f-body);font-size:9.5px;font-weight:600;fill:var(--muted)}
.hwm-tbsvg .tb{fill:var(--surface-2);stroke:var(--line);stroke-width:1.5}
.hwm-tbsvg .stud{fill:#c0a060;stroke:#7a5c20;stroke-width:1.5}
.hwm-tbsvg .br{fill:#c58f3a;stroke:#7a5c20;stroke-width:1.2}
.hwm-tbsvg .wd{fill:var(--surface);stroke:var(--ink-2);stroke-width:2}
.hwm-tbsvg .wd.ok{fill:var(--power-soft);stroke:var(--power)}
.hwm-tbsvg .wd.bad{fill:var(--danger-soft);stroke:var(--danger)}
.hwm-tbsvg .vok{fill:var(--power)}
.hwm-tbsvg .vbad{fill:var(--danger)}
.hwm-btns{display:flex;flex-wrap:wrap;gap:6px}
.hwm-btns .btn[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.hwm-ol{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.hwm-olsvg{width:130px;height:80px;flex:none}
.hwm-olsvg .sc{fill:none;stroke:var(--line);stroke-width:8;stroke-linecap:round}
.hwm-olsvg .tk{stroke:var(--ink-2);stroke-width:1.5}
.hwm-olsvg text{font-family:var(--f-mono);font-size:9px;fill:var(--muted);text-anchor:middle}
.hwm-olsvg .pn{stroke:var(--info);stroke-width:3;stroke-linecap:round}
.hwm-olsvg .hub{fill:var(--ink-2)}
.hwm-olset{flex:1 1 170px;min-width:0}
.hwm-olset output{display:block;font:700 1.5rem/1.1 var(--f-mono)}
.hwm-olset input{width:100%;accent-color:var(--info);margin:4px 0;height:30px}
.hwm-run{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:10px}
.hwm-motor{width:64px;height:64px;flex:none}
.hwm-motor .fan{transform-origin:32px 32px}
.hwm-motor.spin .fan{animation:hwm-spin .35s linear infinite}
.hwm-motor.slow .fan{animation:hwm-spin 1.1s linear infinite}
@keyframes hwm-spin{to{transform:rotate(360deg)}}
.hwm-motor .body{fill:var(--surface-3);stroke:var(--ink-2);stroke-width:2}
.hwm-motor .fan path{fill:var(--ink-2)}
.hwm-vals{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.86rem}
.hwm-vals span{display:flex;flex-direction:column}
.hwm-vals em{font-style:normal;font-size:.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.hwm-vals b{font:700 1.05rem var(--f-mono)}
.hwm-vals b.bad{color:var(--danger)}
.hwm-vals b.ok{color:var(--power)}
.hwm-rulebox{margin:10px 0 0;padding:8px 10px;border-radius:8px;background:var(--surface-2);border-left:4px solid var(--info);font-size:.86rem;color:var(--ink-2)}
@media (prefers-reduced-motion:reduce){.hwm-cap.flash,.hwm-lcd.beep{animation:none}.hwm-knob{transition:none}.hwm-motor.spin .fan,.hwm-motor.slow .fan{animation:none}}
`;
  function injectCSS() {
    if (document.getElementById('hw-meter-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-meter-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ───────────── the solver: nodal analysis of the 24 V circuit ─────────────
  // E: [{a, b, g}] conductances; inj: {node: current into the node}. n8 is the reference (0 V).
  function solve(E, inj, leak) {
    const n = DCN.length, A = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    const add = (a, b, g) => {
      const i = IDX[a], j = IDX[b];
      if (i != null) A[i][i] += g;
      if (j != null) A[j][j] += g;
      if (i != null && j != null) { A[i][j] -= g; A[j][i] -= g; }
    };
    E.forEach((e) => add(e.a, e.b, e.g));
    for (let i = 0; i < n; i++) A[i][i] += leak;
    Object.keys(inj).forEach((k) => { const i = IDX[k]; if (i != null) A[i][n] += inj[k]; });
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      const t = A[c]; A[c] = A[p]; A[p] = t;
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        if (!f) continue;
        for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
      }
    }
    const V = { n8: 0 };
    DCN.forEach((k, i) => (V[k] = A[i][n] / A[i][i]));
    return V;
  }
  // the closed elements of the circuit. ohm = the meter's own small test current: LEDs, the diode and PLC inputs
  // do not conduct with it (their electronics need more voltage), and the power supply output is off.
  function elements(S, ohm) {
    const E = [], add = (a, b, r) => E.push({ a, b, g: 1 / r });
    if (S.fault !== 'A') add('n1', 'n2', 0.1);
    if (!S.estop) add('n2', 'n3', 0.05);
    if (S.start) add('n3', 'n4', 0.05);
    if (S.fault !== 'B') add('n4', 'n5', 0.03);
    if (S.fault !== 'C') add('n5', 'n6', 600);
    add('n6', 'n8', 0.03);
    if (S.k1 && S.fault !== 'D') add('n3', 'n7', 0.05);
    if (!ohm) {
      add('n7', 'n8', 1200); // LED pilot lamp, 20 mA
      add('n3', 'n8', 4700); // PLC input 1, about 5 mA
      add('n7', 'n8', 4700); // PLC input 2
      if (S.power) E.push({ a: 'n1', b: 'n8', g: 50 }); // the power supply: 24 V behind 0.02 Ω
    }
    return E;
  }
  const dcNode = (p) => (p === 'L' || p === 'N' ? 'n8' : PTS[p].n); // the mains is earthed at the transformer: no DC on L / N
  // what the circuit does by itself (no meter): relay, lamp, PLC inputs
  function circuit(S) {
    const base = Object.assign({}, S, { k1: false });
    const inj = S.power ? { n1: 24 * 50 } : {};
    let V = solve(elements(base, false), inj, 1e-10);
    const k1 = !!S.power && S.fault !== 'C' && V.n5 - V.n6 >= 16.8;
    if (k1) V = solve(elements(Object.assign({}, S, { k1 }), false), inj, 1e-10);
    return { V, k1, lamp: V.n7 > 18, in0: V.n3 > 15, in1: V.n7 > 15 };
  }
  // one reading of the meter
  function measure(S, mode, r, b) {
    const C = circuit(S);
    const st = Object.assign({}, S, { k1: C.k1 });
    if (mode === 'off' || !r || !b) return { C, none: true };
    if (mode === 'vdc') {
      const E = elements(st, false), nr = dcNode(r), nb = dcNode(b);
      if (nr !== nb) E.push({ a: nr, b: nb, g: 1e-7 }); // 10 MΩ meter input
      const V = solve(E, S.power ? { n1: 24 * 50 } : {}, 1e-10);
      return { C, val: V[nr] - V[nb], unit: 'V DC' };
    }
    if (mode === 'vac') {
      const ac = (p) => (p === 'L' && S.power ? 230 : 0);
      return { C, val: Math.abs(ac(r) - ac(b)), unit: 'V AC' };
    }
    // Ω and continuity
    if (S.power) return { C, live: true };
    const mains = (p) => p === 'L' || p === 'N';
    if (mains(r) || mains(b)) return { C, R: Infinity, mainsOhm: true };
    const nr = PTS[r].n, nb = PTS[b].n;
    if (nr === nb) return { C, R: LEAD };
    const V = solve(elements(st, true), { [nr]: 1e-3, [nb]: -1e-3 }, 1e-12);
    const R = (V[nr] - V[nb]) / 1e-3;
    return { C, R: R > 4e7 ? Infinity : R + LEAD };
  }
  function fmt(m, mode) {
    if (m.none) return { v: '', u: '' };
    if (m.live) return { v: 'Err', u: '' };
    if (mode === 'vdc') {
      const a = Math.abs(m.val), v = a < 0.005 ? '0.00' : (m.val < 0 ? '-' : '') + (a < 10 ? a.toFixed(2) : a.toFixed(1));
      return { v, u: 'V DC' };
    }
    if (mode === 'vac') return { v: m.val < 0.5 ? '0.0' : m.val.toFixed(1), u: 'V AC' };
    const R = m.R;
    if (R === Infinity) return { v: 'OL', u: 'Ω' };
    if (R < 1000) return { v: R.toFixed(1), u: 'Ω' };
    if (R < 1e6) return { v: (R / 1000).toFixed(2), u: 'kΩ' };
    return { v: (R / 1e6).toFixed(2), u: 'MΩ' };
  }

  // ───────────── the widget ─────────────
  LL.HW.meter = function (ph) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'hw-box hw-meter';
    const uid = 'hwm' + ++uidN;

    let P = load();
    // the live state (not saved): the circuit, the meter, the probes
    const S = { power: true, estop: false, start: false, fault: null };
    let caseId = 'ok', mode = 'vdc', red = null, black = null, next = 'red';
    let log = [], recs = [], cap = null, capOpen = false, verdict = {}, mSel = P.mSel, runT = 0, runState = {};

    function load() {
      const d = { brand: BR[LL.brand] ? LL.brand : 'tia', done: {}, tab: 'circ', mSel: 1, mot: { 1: { c: null, ol: MOT[1].start }, 2: { c: null, ol: MOT[2].start } } };
      try {
        const o = JSON.parse(localStorage.getItem(STORE) || 'null');
        if (!o || typeof o !== 'object') return d;
        if (BR[o.brand]) d.brand = o.brand;
        if (o.done && typeof o.done === 'object') CHECKS.forEach((c) => { if (o.done[c.id]) d.done[c.id] = 1; });
        if (o.tab === 'motor') d.tab = 'motor';
        if (o.mSel === 2) d.mSel = 2;
        [1, 2].forEach((k) => {
          const m = o.mot && o.mot[k];
          if (!m) return;
          if (m.c === 'Y' || m.c === 'D') d.mot[k].c = m.c;
          const v = Math.round(+m.ol * 10) / 10;
          if (v >= MOT[k].lo && v <= MOT[k].hi) d.mot[k].ol = v;
        });
      } catch (e) { /* blocked storage */ }
      return d;
    }
    function save() { try { localStorage.setItem(STORE, JSON.stringify({ brand: P.brand, done: P.done, tab: P.tab, mSel, mot: P.mot })); } catch (e) { /* storage full or blocked */ } }

    root.innerHTML = `
<div class="hwm-head"><h4 class="hwm-title">Measure like an electrician</h4>
<div class="hwm-seg" role="group" aria-label="PLC brand">${BORDER.map((k) => `<button type="button" data-act="brand" data-b="${k}" data-f="b-${k}">${BR[k].b}</button>`).join('')}</div></div>
<p class="hwm-intro">A 24 V control circuit with numbered test points, and a multimeter. Turn the dial, then click a point for the <b style="color:var(--hwm-red)">red probe</b> and another point for the <b>black probe</b>. Learn what good readings look like, then find four hidden faults.</p>
<div class="hwm-rule" role="note"><b>The rule</b><span>⚡ Volts: power <b>ON</b>.</span><span>Ω and beep: power <b>OFF</b>.</span></div>
<div class="hwm-tabs" role="tablist" aria-label="Part of the exercise">
<button type="button" class="hwm-tab" role="tab" id="${uid}-t1" aria-controls="${uid}-p1" data-act="tab" data-t="circ" data-f="tab-circ">1 · Measure the circuit</button>
<button type="button" class="hwm-tab" role="tab" id="${uid}-t2" aria-controls="${uid}-p2" data-act="tab" data-t="motor" data-f="tab-motor">2 · Motor nameplate</button></div>
<div class="hwm-pane" role="tabpanel" id="${uid}-p1" aria-labelledby="${uid}-t1">
 <div class="hwm-sec"><div class="hwm-h"><b>Circuit</b><span>Choose the working circuit or a fault.</span></div><div class="hwm-cases"></div><div class="hwm-sym" role="note"></div></div>
 <div class="hwm-ctl">
  <button type="button" class="hwm-sw pw" data-act="power" data-f="power"></button>
  <button type="button" class="hwm-sw es" data-act="estop" data-f="estop"></button>
  <button type="button" class="hwm-sw st" data-act="start" data-f="start"></button>
 </div>
 <div class="hwm-draw"></div><div class="hwm-swipe">The drawing is wide: swipe it sideways. Or use the point buttons under the meter.</div>
 <div class="hwm-mgrid">
  <div class="hwm-dev" role="group" aria-label="Multimeter">
   <div class="hwm-lcd" aria-hidden="true"><span class="hwm-flags"><i class="auto">AUTO</i><i class="bp">•)))</i><i class="live">⚡ LIVE</i></span><b></b><span class="u"></span></div>
   <div class="hwm-dial"><div class="hwm-knob" aria-hidden="true"><i></i></div>${MODES.map((m) => {
      const x = 106 + 74 * Math.sin((m.a * Math.PI) / 180), y = 88 - 62 * Math.cos((m.a * Math.PI) / 180);
      return `<button type="button" class="hwm-mode" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px" data-act="mode" data-m="${m.k}" data-f="mode-${m.k}" aria-label="Dial: ${m.l}">${m.t}</button>`;
    }).join('')}</div>
   <div class="hwm-jacks" aria-hidden="true"><span class="hwm-jack"><i></i>COM</span><span class="hwm-jack r"><i></i>VΩ</span></div>
  </div>
  <div class="hwm-side">
   <div class="hwm-probe"></div>
   <div class="hwm-pad"></div>
   <div class="hwm-pbtns"><button type="button" class="btn small" data-act="swap" data-f="swap">⇄ Swap probes</button><button type="button" class="btn small" data-act="clearp" data-f="clearp">Take probes off</button></div>
   <div class="hwm-see" aria-label="What you see on the machine"></div>
   <ol class="hwm-log" aria-label="Your readings"></ol>
  </div>
 </div>
 <div class="hwm-diagw"></div>
</div>
<div class="hwm-pane" role="tabpanel" id="${uid}-p2" aria-labelledby="${uid}-t2" hidden></div>
<div class="hwm-sec hwm-check"></div>
<div class="hwm-cap"><div class="hwm-caph"><span class="hwm-k">What happened</span><button type="button" class="hwm-more" data-act="more" data-f="more" aria-expanded="false">more ▾</button></div><p role="status" aria-live="polite"></p></div>`;
    const $ = (s) => root.querySelector(s);
    const casesEl = $('.hwm-cases'), symEl = $('.hwm-sym'), drawEl = $('.hwm-draw'), lcdEl = $('.hwm-lcd'), probeEl = $('.hwm-probe'), padEl = $('.hwm-pad');
    const seeEl = $('.hwm-see'), logEl = $('.hwm-log'), diagEl = $('.hwm-diagw'), chkEl = $('.hwm-check'), capEl = $('.hwm-cap'), moreEl = $('.hwm-more');
    const p1 = $('#' + uid + '-p1'), p2 = $('#' + uid + '-p2');

    // ───── drawing ─────
    const ptLabel = (p) => (PTS[p] && /^\d$/.test(p) ? 'point ' + p : p);
    function svgCircuit(C) {
      const B = BR[P.brand];
      const no = (x, y1, y2) => `<path class="w" d="M${x} ${y2} L${x - 13} ${y1 + 5}"/>`;
      const nc = (x, y1, y2) => `<path class="w" d="M${x} ${y1} H${x + 9} M${x} ${y2} L${x + 13} ${y1 - 3}"/>`;
      const badge = (x, y, t, cls) => { const w = t.length * 6.6 + 12; return `<g class="badge ${cls || ''}"><rect x="${x}" y="${y - 8}" width="${w.toFixed(0)}" height="16" rx="8"/><text x="${(x + w / 2).toFixed(0)}" y="${y + 3.5}" text-anchor="middle">${t}</text></g>`; };
      const part = (id, label, inner, hl) => `<g class="part" data-act="info" data-part="${id}" data-f="part-${id}" tabindex="0" role="button" aria-label="${label}: what is it?"><rect class="hl" x="${hl[0]}" y="${hl[1]}" width="${hl[2]}" height="${hl[3]}" rx="6"/>${inner}</g>`;
      let h = `<svg class="hwm-svg" viewBox="0 0 720 412" role="group" aria-label="24 V control circuit with test points">`;
      // mains + main switch -Q1
      h += `<text x="6" y="160" class="sm">230 V AC</text><text x="6" y="186" class="sm">L</text><text x="6" y="216" class="sm">N</text><text x="6" y="246" class="sm">PE</text>`;
      const q = (y) => `<path class="w" d="M4 ${y} H24 M50 ${y} H100"/><circle cx="24" cy="${y}" r="2.5" class="jd"/><circle cx="50" cy="${y}" r="2.5" class="jd"/>` +
        (S.power ? `<path class="w" d="M24 ${y} L50 ${y - 1}"/>` : `<path class="w" d="M24 ${y} L46 ${y - 12}"/>`);
      h += part('q1', 'Main switch -Q1', q(190) + q(220) + `<path class="w dash" d="M${S.power ? 37 : 35} ${S.power ? 190 : 184} V${S.power ? 220 : 214}"/><text x="37" y="174" text-anchor="middle" class="lb">-Q1</text>`, [12, 162, 50, 66]);
      h += badge(S.power ? 21 : 18, 272, S.power ? 'ON' : 'OFF', S.power ? 'g' : '');
      h += `<path class="pe1" d="M4 250 H100"/><path class="pe2" d="M4 250 H100"/>`;
      // power supply -G1
      h += part('psu', 'Power supply -G1', `<rect class="box" x="100" y="170" width="90" height="100" rx="6"/><text x="145" y="190" text-anchor="middle" class="lb">-G1</text><text x="145" y="210" text-anchor="middle" class="sm">230 V AC</text><text x="145" y="224" text-anchor="middle" class="sm">→ 24 V DC</text>
<text x="106" y="194" class="sm">L</text><text x="106" y="224" class="sm">N</text><text x="106" y="254" class="sm">PE</text><text x="185" y="194" text-anchor="end" class="sm">L+</text><text x="185" y="254" text-anchor="end" class="sm">M</text>
<circle class="led${S.power ? ' on' : ''}" cx="132" cy="258" r="4.5"/><text x="140" y="261" class="sm">DC OK</text>`, [96, 166, 98, 108]);
      h += `<path class="w" d="M190 190 H220 V60 H250 M300 60 H360 V95"/><path class="w" d="M190 250 H220 V380 H600 V340 H620"/>`;
      // earth link: M is earthed
      h += part('pe', 'Earth connection of M', `<path class="w" d="M262 380 V394 M250 394 H274 M254 399 H270 M258 404 H266"/><text x="280" y="402" class="sm">PE (M is earthed)</text>`, [244, 384, 120, 26]);
      // fuse -F1
      h += part('fuse', 'Fuse -F1', `<rect class="box" x="250" y="53" width="50" height="14" rx="2"/><path class="w thin" d="M245 60 H305"/><text x="275" y="44" text-anchor="middle" class="lb">-F1</text><text x="298" y="44" class="sm">2 A</text>`, [242, 32, 76, 40]);
      // E-stop -S1 (NC, mushroom head)
      h += part('estop', 'E-stop -S1', `${nc(360, 95, 130)}<path class="w dash" d="M366 113 H333"/><path class="w" d="M333 103 a10 10 0 0 0 0 20 z"/><text x="318" y="98" text-anchor="end" class="lb">-S1</text><text x="318" y="111" text-anchor="end" class="sm">E-stop</text>`, [270, 86, 112, 52]);
      h += `<path class="w" d="M360 130 V188"/>`;
      if (S.estop) h += badge(380, 113, 'PRESSED', 'r');
      // START -S2 (NO, push button)
      h += part('start', 'START button -S2', `${no(360, 188, 222)}<path class="w dash" d="M353 205 H333"/><path class="w" d="M333 197 V213 M333 197 h-5 M333 213 h-5"/><text x="318" y="200" text-anchor="end" class="lb">-S2</text><text x="318" y="213" text-anchor="end" class="sm">START</text>`, [270, 182, 106, 46]);
      if (S.start) h += badge(376, 205, 'HELD', 'g');
      h += `<path class="w" d="M360 222 V292 M360 328 V380"/>`;
      // coil -K1 + flyback diode -V1
      h += part('coil', 'Relay coil -K1', `<rect class="coil${C.k1 ? ' on' : ''}" x="346" y="292" width="28" height="36" rx="2"/><text x="300" y="306" text-anchor="end" class="lb">-K1</text><text x="300" y="319" text-anchor="end" class="sm">relay coil</text><text x="380" y="300" class="sm">A1</text><text x="380" y="327" class="sm">A2</text>`, [256, 288, 140, 44]);
      if (C.k1) h += badge(262, 335, 'pulled in', 'g');
      h += part('diode', 'Flyback diode -V1', `<path class="w" d="M360 284 H418 V302 M418 322 V340 H360"/><path class="w" d="M409 322 H427 L418 305 Z M408 304 H428"/><text x="434" y="316" class="lb">-V1</text>`, [400, 296, 62, 32]);
      // contact -K1 13–14 → lamp -H1 and PLC input 2
      h += `<path class="w" d="M360 160 H620 M490 160 V190 M490 222 V294 M490 326 V380 M490 250 H620"/>`;
      h += part('contact', 'Relay contact -K1 13–14', `${no(490, 190, 222)}<text x="470" y="203" text-anchor="end" class="lb">-K1</text><text x="470" y="216" text-anchor="end" class="sm">13–14</text>`, [430, 184, 72, 44]);
      h += part('lamp', 'Lamp -H1', `<circle class="lamp${C.lamp ? ' on' : ''}" cx="490" cy="310" r="16"/><path class="w thin" d="M479 299 L501 321 M501 299 L479 321"/><text x="514" y="306" class="lb">-H1</text><text x="514" y="319" class="sm">lamp</text>`, [470, 290, 82, 40]);
      // PLC input card -A1
      h += part('plc', 'PLC input card -A1', `<rect class="box" x="620" y="112" width="90" height="248" rx="6"/><text x="665" y="130" text-anchor="middle" class="lb">-A1 PLC</text><text x="665" y="144" text-anchor="middle" class="sm">${esc(B.card)}</text>
<rect x="616" y="156" width="8" height="8" class="jd"/><rect x="616" y="246" width="8" height="8" class="jd"/><rect x="616" y="336" width="8" height="8" class="jd"/>
<text x="630" y="164" class="addr">${esc(B.a[0])}</text><text x="630" y="178" class="sm">EStop_OK</text><circle class="led${C.in0 ? ' on' : ''}" cx="698" cy="160" r="5"/>
<text x="630" y="254" class="addr">${esc(B.a[1])}</text><text x="630" y="268" class="sm">K1_On</text><circle class="led${C.in1 ? ' on' : ''}" cx="698" cy="250" r="5"/>
<text x="630" y="344" class="addr">M</text><text x="630" y="358" class="sm">0 V common</text>`, [606, 106, 110, 260]);
      // junction dots
      [[360, 160], [490, 160], [490, 250], [360, 284], [360, 340], [360, 380], [490, 380], [262, 380]].forEach(([x, y]) => (h += `<circle class="jd" cx="${x}" cy="${y}" r="3.5"/>`));
      // test points (on top)
      PORDER.forEach((p) => {
        const T = PTS[p], who = red === p ? 'red' : black === p ? 'blk' : '';
        const tag = who === 'red' ? '+' : who === 'blk' ? 'COM' : '';
        const mainsP = p === 'L' || p === 'N' || p === 'PE', tagx = mainsP ? T.bx - 15 : T.bx, tagy = mainsP ? T.by + 4 : T.by - 15;
        h += `<g class="hwm-tp${who ? ' ' + who : ''}${p === 'PE' ? ' pe' : ''}" data-act="pt" data-pt="${p}" data-f="pt-${p}" tabindex="0" role="button" aria-label="Test point ${esc(p)}: ${esc(T.d)}${who ? (who === 'red' ? ', red probe here' : ', black probe here') : ''}">
<circle class="hit" cx="${T.bx}" cy="${T.by}" r="17"/><line class="tpl" x1="${T.wx}" y1="${T.wy}" x2="${T.bx}" y2="${T.by}"/><circle class="tpd" cx="${T.wx}" cy="${T.wy}" r="3"/><circle class="ring" cx="${T.bx}" cy="${T.by}" r="14"/><circle class="tpb" cx="${T.bx}" cy="${T.by}" r="10"/><text x="${T.bx}" y="${T.by}">${esc(p)}</text>${tag ? `<text class="ptag" x="${tagx}" y="${tagy}" style="text-anchor:${mainsP ? 'end' : 'middle'}">${tag}</text>` : ''}</g>`;
      });
      return h + '</svg>';
    }

    // ───── rendering of tab 1 ─────
    function stateTxt(rec) {
      return (rec.power ? 'ON' : 'OFF') + (rec.estop ? ' · E-stop pressed' : '') + (rec.start ? ' · START held' : '');
    }
    function renderCircuit() {
      const a = document.activeElement, fk = a && root.contains(a) ? a.getAttribute('data-f') : null;
      const m = measure(S, mode, red, black), C = m.C;
      casesEl.innerHTML = CORDER.map((k) => {
        const done = k !== 'ok' && P.done['f' + k];
        return `<button type="button" class="hwm-case" data-act="case" data-c="${k}" data-f="case-${k}" aria-pressed="${caseId === k}">${CASES[k].t}${done ? '<i aria-hidden="true">✓</i><span class="hwm-sr"> (solved)</span>' : ''}</button>`;
      }).join('');
      const Cs = CASES[caseId], solved = caseId !== 'ok' && P.done['f' + caseId];
      symEl.className = 'hwm-sym' + (caseId === 'ok' ? '' : solved ? ' solved' : ' f');
      symEl.innerHTML = `<b>${esc(Cs.t)}${solved ? ' · solved ✓' : ''}:</b> ${nw(esc(Cs.sym))}`;
      const sw = (el, on, ic, t, sub) => { el.setAttribute('aria-pressed', String(on)); el.innerHTML = `<span class="hwm-knobi" aria-hidden="true">${ic}</span><span><b>${t}</b><small>${sub}</small></span>`; };
      sw($('[data-act="power"]'), S.power, S.power ? 'I' : 'O', 'Main switch -Q1: ' + (S.power ? 'ON' : 'OFF'), S.power ? 'click: switch OFF' : 'click: switch ON');
      sw($('[data-act="estop"]'), S.estop, '', 'E-stop -S1: ' + (S.estop ? 'PRESSED' : 'released'), S.estop ? 'click: release it' : 'click: press it');
      sw($('[data-act="start"]'), S.start, S.start ? '✋' : '▶', 'START -S2: ' + (S.start ? 'held' : 'not pressed'), S.start ? 'a colleague holds it · click: let go' : 'click: a colleague holds it');
      const sl = drawEl.scrollLeft;
      drawEl.innerHTML = svgCircuit(C);
      drawEl.scrollLeft = sl;
      // meter
      const f = fmt(m, mode);
      lcdEl.classList.toggle('off', mode === 'off');
      lcdEl.querySelector('b').textContent = mode === 'off' ? '' : m.none ? (mode === 'ohm' || mode === 'cont' ? 'OL' : '-.--') : f.v;
      lcdEl.querySelector('.u').textContent = mode === 'off' ? '' : m.none ? (mode === 'vdc' ? 'V DC' : mode === 'vac' ? 'V AC' : 'Ω') : f.u;
      lcdEl.querySelector('.auto').classList.toggle('on', mode !== 'off');
      const beep = (mode === 'cont') && !m.none && !m.live && m.R < 50;
      lcdEl.querySelector('.bp').classList.toggle('on', mode === 'cont');
      lcdEl.querySelector('.live').classList.toggle('on', !!m.live);
      $('.hwm-knob').style.transform = 'rotate(' + MBY[mode].a + 'deg)';
      root.querySelectorAll('[data-act="mode"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
      probeEl.innerHTML = `<span class="hwm-pt r"><i aria-hidden="true"></i>Red +: <em>${red ? esc(ptLabel(red)) : '—'}</em></span><span class="hwm-pt b"><i aria-hidden="true"></i>Black COM: <em>${black ? esc(ptLabel(black)) : '—'}</em></span><span style="color:var(--muted);font-size:.8rem">Next click: ${next === 'red' ? 'red' : 'black'} probe</span>`;
      padEl.innerHTML = [['r', 'red', 'Red +'], ['b', 'black', 'Black'], ].map(([c, k, t]) => `<div class="hwm-padrow ${c}" role="group" aria-label="${k} probe on point"><span>${t}</span>${PORDER.map((p) => `<button type="button" class="hwm-pb" data-act="pad" data-p="${k}" data-pt="${p}" data-f="pad-${k}-${p}" aria-pressed="${(k === 'red' ? red : black) === p}" aria-label="${k} probe on ${esc(ptLabel(p))}">${esc(p)}</button>`).join('')}</div>`).join('');
      seeEl.innerHTML = `<span><i class="${S.power ? 'on' : ''}"></i>-G1 DC OK</span><span><i class="${C.k1 ? 'on' : ''}"></i>-K1 ${C.k1 ? 'pulled in' : 'off'}</span><span><i class="lamp${C.lamp ? ' on' : ''}"></i>-H1 ${C.lamp ? 'lit' : 'off'}</span><span><i class="${C.in0 ? 'on' : ''}"></i>PLC ${esc(BR[P.brand].a[0])}</span><span><i class="${C.in1 ? 'on' : ''}"></i>PLC ${esc(BR[P.brand].a[1])}</span>`;
      logEl.innerHTML = log.length ? log.map((x) => `<li><em>${esc(x.m)}</em><span>${esc(x.p)}<small>${esc(x.s)}</small></span><b>${esc(x.v)}</b></li>`).join('') : '<li class="empty">Your readings appear here (newest on top).</li>';
      renderDiag();
      if (fk) { const n = root.querySelector('[data-f="' + fk + '"]'); if (n) n.focus({ preventScroll: true }); }
      return { m, beep };
    }
    function renderDiag() {
      if (caseId === 'ok') { diagEl.innerHTML = ''; return; }
      const solved = P.done['f' + caseId];
      let h = `<div class="hwm-diag"><div class="hwm-h"><b>Your verdict</b><span>${solved ? 'Solved ✓' : 'Measure first, then choose'}</span></div><p>Which part is faulty? Prove it with the meter before you change a part.</p><div class="hwm-vbtns">`;
      VERDICT.forEach((k) => {
        const v = solved && k === CASES[caseId].part ? 'yes' : verdict[k];
        h += `<button type="button" class="btn small${v === 'no' ? ' no' : v === 'yes' ? ' yes' : ''}" data-act="verdict" data-part="${k}" data-f="v-${k}">${v === 'no' ? '✗ ' : v === 'yes' ? '✓ ' : ''}${esc(PARTS[k].t)}</button>`;
      });
      diagEl.innerHTML = h + '</div></div>';
    }

    // ───── what the reading means ─────
    function explain(m, r, b) {
      const C = m.C, key = pkey(r, b), part = PAIR[key], hasMains = r === 'L' || r === 'N' || b === 'L' || b === 'N';
      const f = fmt(m, mode), rd = `<span class="rd">${f.v} ${f.u}</span>`;
      const live = (p) => C.V[dcNode(p)] > 18, dead = (p) => C.V[dcNode(p)] < 1;
      if (m.live) return ['Stop! Ω and the beep need the power OFF. The meter sends its own small test current; the 24 V of the circuit spoils the reading and can damage the meter. Switch -Q1 OFF first.', 'bad'];
      if (mode === 'vac') {
        if (!S.power && hasMains) return [`${rd}: the main switch -Q1 is OFF. This is how you prove a circuit dead before you touch it: measure L–N, L–PE and N–PE.`, 'info'];
        if (key === pkey('L', 'N')) return [`${rd} between L and N: the mains input of the power supply. Danger! Only trained electricians measure here, with a meter rated CAT III.`, 'warn'];
        if (key === pkey('L', 'PE')) return [`${rd} between L and PE (earth). L is the live wire.`, 'warn'];
        if (key === pkey('N', 'PE')) return [`${rd} between N and PE: N is earthed at the transformer, so it is almost 0 V.`, 'info'];
        if (r === 'L' || b === 'L') return [`${rd} between L and the 24 V side. M is earthed, so the whole 24 V side sits at earth potential and L is 230 V against it.`, 'warn'];
        return [`${rd} in V AC: this is a DC circuit, and in V AC the meter ignores DC. Wrong mode = wrong conclusion! Turn the dial to V DC.`, 'warn'];
      }
      if (mode === 'vdc') {
        if (!S.power) return [`${rd}: the main switch is OFF, so there is no voltage anywhere. Volts need the power ON.`, 'info'];
        if (hasMains) return [`${rd}: L and N carry AC (alternating) voltage. In V DC the meter averages it to almost nothing. For the mains, turn the dial to V AC.`, 'warn'];
        const a = Math.abs(m.val), neg = m.val < -0.5;
        const sign = neg ? ' The minus sign: the probes are the wrong way round (red on the lower voltage). The size of the number is still right.' : '';
        const hi = a >= 20, lo = a < 1;
        const noV = lo && dead(PARTS[part] ? PARTS[part].a : r) && dead(PARTS[part] ? PARTS[part].b : b);
        if (part && PARTS[part] && PARTS[part].k === 'sw') {
          if (noV) return [`${rd} across ${PARTS[part].t}, but careful: there is no voltage on either side. 0 V across a part means "closed" only when 24 V is present.` + sign, 'warn'];
          const T = {
            fuse: [`${rd} across the fuse -F1: both sides have the same voltage, so the fuse is good (closed).`, `${rd} across the fuse -F1: it is OPEN (blown)! A good fuse shows 0 V.`],
            estop: [`${rd} across the closed E-stop -S1: the same 24 V is on both sides. Closed contact = 0 V.`, `${rd} across the E-stop: it is open (pressed). One side has 24 V; the other side is pulled to 0 V through the PLC input. Open contact = 24 V.`],
            start: [`${rd} across START: a colleague holds it, so it is closed. Closed contact = 0 V.`, `${rd} across the open START button. One side has 24 V; the other side is pulled to 0 V through the coil -K1. Open contact = 24 V: this is the key idea!`],
            wire: [`${rd} across the wire 4–5: the wire is good.`, `${rd} across a wire! A good wire shows 0 V. This wire is broken (open).`],
            contact: [`${rd} across the contact -K1 13–14: it is closed (K1 is pulled in).`, C.k1 ? `${rd} across -K1 13–14 although K1 is pulled in: the contact does NOT close. It is faulty!` : `${rd} across -K1 13–14: the contact is open because K1 is off. Normal.`],
          }[part];
          if (lo) return [T[0] + sign, 'ok'];
          if (hi) return [T[1] + sign, (part === 'start' && !S.start) || (part === 'estop' && S.estop) || (part === 'contact' && !C.k1) ? 'ok' : 'bad'];
        }
        if (part === 'coil') {
          if (hi) return [C.k1 ? `${rd} across the coil, and -K1 is pulled in: normal. A load uses the whole voltage.${sign}` : `${rd} across the coil, but -K1 does NOT pull in! The coil gets its voltage and does not work. Check it with Ω (power OFF).${sign}`, C.k1 ? 'ok' : 'bad'];
          if (lo) return [`${rd} across the coil: no voltage reaches it. Something before it is open (is START held?).${sign}`, 'info'];
        }
        if (part === 'lamp') {
          if (hi) return [`${rd} across the lamp: it gets its voltage and lights.${sign}`, 'ok'];
          if (lo) return [`${rd} across the lamp: no voltage reaches it. Look before it: the contact -K1 13–14.${sign}`, 'info'];
        }
        if (part === 'a2') return [`${rd} between A2 and 0 V: the wire from the coil to M is good.${sign}`, 'ok'];
        if (part === 'psu') return [`${rd} at the power supply: it works. A 24 V supply may show 23–28 V; many are set a little higher to make up for long wires.${sign}`, 'ok'];
        const z = ZERO[b] ? r : ZERO[r] ? b : null;
        if (z && z !== 'L' && z !== 'N') {
          if (hi) return [`${ptLabel(z).replace(/^p/, 'P')} has 24 V against 0 V (M): the 24 V arrives here.${sign}`, 'info'];
          if (lo) return [`${ptLabel(z).replace(/^p/, 'P')} has 0 V against 0 V (M): no 24 V here. If the point before has 24 V, the fault is between them.${sign}`, 'info'];
        }
        return [`The meter shows the DIFFERENCE between the two points: ${rd}. Tip: measure each point against point 8 (0 V) to see where the 24 V is.${sign}`, 'info'];
      }
      // Ω / continuity
      if (m.mainsOhm) return [`${rd} between mains points: the input of the power supply has electronics inside, no simple resistance. Use Ω on the 24 V parts.`, 'info'];
      const R = m.R, open = R === Infinity, beep = mode === 'cont' && R < 50;
      const pre = mode === 'cont' ? (beep ? `Beep! (${f.v} ${f.u}) ` : `No beep (${f.v} ${f.u}). `) : rd + ': ';
      if (part === 'coil') {
        if (open) return [pre + 'OL across the coil: the coil wire is broken (burnt coil). A good coil shows about 600 Ω.', 'bad'];
        return [pre + (mode === 'cont' ? 'No beep, but the coil is fine! 600 Ω is too high for the beeper. Use Ω for coils.' : 'a good relay coil. Ohm\'s law: I = U / R = 24 V / 600 Ω = 0.04 A = 40 mA.'), mode === 'cont' ? 'warn' : 'ok'];
      }
      if (part && PARTS[part] && PARTS[part].k === 'sw') {
        if (!open && R < 5) return [pre + `${PARTS[part].t} is closed / good. (About 0.2 Ω are the test leads themselves.)`, 'ok'];
        const T = { fuse: 'OL = open: the fuse -F1 is blown.', estop: 'OL: the E-stop is open (pressed). Released, it shows about 0 Ω.', start: 'OL: START is open, because nobody presses it. A good NO button shows OL at rest and about 0 Ω when pressed.',
          wire: 'OL across a wire: the wire is broken!', contact: 'OL: the contact is open. With the power OFF the relay is off, so its NO contact 13–14 is open anyway. To test it you need K1 pulled in: power ON, measure volts.' }[part];
        return [pre + T, part === 'fuse' || part === 'wire' ? 'bad' : 'info'];
      }
      if (part === 'lamp') return [pre + 'an LED lamp (like a PLC input) has electronics inside: a meter shows no clear resistance. Test lamps with volts, power ON.', 'info'];
      if (part === 'psu') return [pre + 'with the power OFF, the output of the supply looks open. Fine.', 'info'];
      if (part === 'a2') return [pre + 'the wire from A2 to 0 V is good.', 'ok'];
      if (open) return [pre + 'no connection between these points (OL = "over limit", open).', 'info'];
      return [pre + `there is a path between ${ptLabel(r)} and ${ptLabel(b)} of ${f.v} ${f.u}.`, 'info'];
    }

    // ───── record + checks ─────
    function record(m) {
      if (m.none) return;
      const f = fmt(m, mode), rec = { mode, r: red, b: black, val: m.live ? NaN : mode === 'vdc' || mode === 'vac' ? m.val : m.R, power: S.power, estop: S.estop, start: S.start, k1: m.C.k1, caseId, live: !!m.live };
      const top = log[0], line = { m: MBY[mode].t, p: ptLabel(red) + ' → ' + ptLabel(black), s: (caseId === 'ok' ? '' : CASES[caseId].t + ' · ') + stateTxt(rec), v: f.v + (f.u ? ' ' + f.u : '') };
      if (!top || top.m !== line.m || top.p !== line.p || top.s !== line.s || top.v !== line.v) { log.unshift(line); log = log.slice(0, 6); }
      recs.push(rec);
      if (recs.length > 400) recs = recs.slice(-300);
      const pair = pkey(red, black), dc = mode === 'vdc' && S.power, ok = caseId === 'ok';
      const a = Math.abs(rec.val);
      const hit = [];
      const tick = (id) => { if (!P.done[id]) { P.done[id] = 1; hit.push(id); } };
      if (dc && (pair === pkey('1', '8') || pair === pkey('1', 'PE')) && a >= 23) tick('m24');
      if (mode === 'vac' && pair === pkey('L', 'N') && rec.val >= 200) tick('m230');
      if (dc && ok && pair === pkey('2', '3') && !S.estop && a < 0.5) tick('mClosed');
      if (dc && ok && pair === pkey('3', '4') && !S.start && !S.estop && a >= 23) tick('mOpen');
      if (mode === 'ohm' && ok && !S.power && pair === pkey('5', '6') && rec.val > 550 && rec.val < 650) tick('mCoil');
      return hit;
    }
    // is the fault of this case proven by the readings?
    function proven(cid) {
      const fp = PARTS[CASES[cid].part], key = pkey(fp.a, fp.b), R = recs.filter((x) => x.caseId === cid && !x.live);
      const across = R.some((x) => x.mode === 'vdc' && x.power && pkey(x.r, x.b) === key && Math.abs(x.val) >= 20 && (cid !== 'D' || x.k1));
      const ohm = cid !== 'D' && R.some((x) => (x.mode === 'ohm' || x.mode === 'cont') && !x.power && pkey(x.r, x.b) === key && x.val === Infinity);
      if (across || ohm) return true;
      if (cid === 'C') return false; // 24 V at A1 and 0 V at A2 is normal for a good coil too
      // both sides against 0 V, in the same circuit state: 24 V before the part, 0 V after it
      const vs = (x, p) => x.mode === 'vdc' && x.power && ((x.r === p && ZERO[x.b]) || (x.b === p && ZERO[x.r]));
      const sig = (x) => [x.estop, x.start, x.k1].join();
      return R.some((x) => vs(x, fp.a) && Math.abs(x.val) >= 20 && R.some((y) => vs(y, fp.b) && Math.abs(y.val) < 2 && sig(y) === sig(x)));
    }

    // ───── checklist ─────
    function renderCheck() {
      const okN = CHECKS.filter((c) => P.done[c.id]).length, all = okN === CHECKS.length;
      let h = `<div class="hwm-h"><b>Mission checklist <span class="chip${all ? ' ok' : ''}" style="font-family:var(--f-body);letter-spacing:0;text-transform:none;margin-left:6px">${okN} / ${CHECKS.length}</span></b><button type="button" class="btn small" data-act="reset" data-f="reset">Reset mission</button></div><ul class="hwm-cl">`;
      let g = '';
      CHECKS.forEach((c) => {
        if (c.g !== g) { g = c.g; h += `<li class="hwm-clg" aria-hidden="true">${esc(g)}</li>`; }
        const d = !!P.done[c.id];
        h += `<li class="${d ? 'ok' : 'no'}"><i aria-hidden="true">${d ? '✓' : '✗'}</i><span><b>${esc(c.t)}</b><span class="hwm-sr">${d ? ' done' : ' not yet'}</span><small>${esc(c.d)}</small></span></li>`;
      });
      h += '</ul>';
      const nx = CHECKS.find((c) => !P.done[c.id]);
      h += all ? '<p class="hwm-win">Mission complete! You measure like an electrician: volts with power ON, ohms with power OFF, 0 V across a closed contact, 24 V across an open one, and you prove a fault before you change a part.</p>' : `<p class="hwm-next"><b>Next:</b> ${nw(esc(nx.hint))}</p>`;
      chkEl.innerHTML = h;
      return all;
    }

    // ───── caption ─────
    function say(text, kind) {
      cap = { text, kind: kind || 'info' };
      capEl.className = 'hwm-cap ' + cap.kind;
      capEl.querySelector('p').innerHTML = nw(text);
      fitCap();
      void capEl.offsetWidth;
      capEl.classList.add('flash');
    }
    function fitCap() {
      const p = capEl.querySelector('p'), narrow = root.classList.contains('hwm-narrow');
      capEl.classList.toggle('hwm-capx', capOpen);
      const lh = parseFloat(getComputedStyle(p).lineHeight) || 21;
      capEl.classList.toggle('hwm-long', narrow && p.scrollHeight > lh * 3 + 2);
      moreEl.textContent = capOpen ? 'less ▴' : 'more ▾';
      moreEl.setAttribute('aria-expanded', String(capOpen));
    }
    const WIN = ' Mission complete: every check is green!';
    let wasAll = CHECKS.every((c) => P.done[c.id]);
    // after an action in tab 1: redraw, take the reading, explain it (lead = what the action did)
    function act1(lead, leadKind) {
      const r = renderCircuit(), m = r.m;
      const hit = record(m) || [];
      if (r.beep) { lcdEl.classList.remove('beep'); void lcdEl.offsetWidth; lcdEl.classList.add('beep'); }
      renderCheck();
      save();
      let t = lead || '', k = leadKind || 'info';
      if (mode === 'off') { t += (t ? ' ' : '') + 'The meter is OFF. Turn the dial to V DC to start.'; }
      else if (!red || !black) { t += (t ? ' ' : '') + (!red && !black ? 'Click a test point for the red probe.' : !red ? 'Now click a point for the red probe.' : 'Now click a second point for the black probe (COM).'); }
      else if (red && black) {
        const e = explain(m, red, black);
        t += (t ? ' ' : '') + e[0];
        if (!leadKind || leadKind === 'info') k = e[1];
      }
      if (hit.length) {
        t += ' ✓ Checklist: ' + hit.map((id) => CHECKS.find((c) => c.id === id).t).join(', ') + '.';
        if (k === 'info') k = 'ok';
      }
      const all = CHECKS.every((c) => P.done[c.id]);
      if (all && !wasAll) { t += WIN; k = 'ok'; }
      wasAll = all;
      say(t, k);
    }
    function setCase(c) {
      if (!CASES[c]) return;
      caseId = c;
      S.fault = c === 'ok' ? null : c;
      S.start = false; S.estop = false; S.power = true;
      verdict = {};
      log = [];
      act1(c === 'ok' ? 'Working circuit: no fault. Learn the good readings here.' : `${CASES[c].t}: listen to the operator (blue box), then measure. The main switch is ON.`, 'info');
    }
    function verdictFor(part) {
      const cid = caseId;
      if (cid === 'ok') return;
      const C = CASES[cid];
      if (part !== C.part) {
        verdict[part] = 'no';
        renderDiag();
        return say(`No: ${PARTS[part].t} is not the faulty part. ${C.hint}`, 'warn');
      }
      if (!proven(cid)) {
        renderDiag();
        return say(`Maybe, but you have not PROVEN it yet. An electrician never changes a part on a guess. Measure across ${PARTS[part].t} (V DC, power ON: an open part shows 24 V)${cid === 'D' ? ' while K1 is pulled in' : ' or check it with Ω (power OFF: an open part shows OL)'}.`, 'warn');
      }
      verdict[part] = 'yes';
      const fresh = !P.done['f' + cid];
      P.done['f' + cid] = 1;
      save();
      renderCircuit();
      renderCheck();
      const all = CHECKS.every((c) => P.done[c.id]);
      const t = C.win + (fresh ? ' ✓ Checklist: ' + C.t + ' solved.' : '') + (all && !wasAll ? WIN : '');
      wasAll = all;
      say(t, 'ok');
    }

    // component info (click on a part of the drawing)
    function info(id) {
      const B = BR[P.brand];
      const T = {
        q1: 'Main switch -Q1 switches the 230 V to the power supply. Switch it OFF (and lock it) before you work on the circuit or measure Ω. The incoming side of a main switch stays live!',
        psu: 'Power supply -G1: it makes 24 V DC from 230 V AC. L+ is +24 V, M is 0 V. Why 24 V? It is safe to touch (no electric shock), it is enough for relays, sensors and PLC inputs, and every brand uses it.',
        pe: 'M (0 V) is connected to earth (PE). This is common in control cabinets (PELV): if a 24 V wire touches the earthed cabinet, the fuse blows at once instead of the fault staying hidden.',
        fuse: 'Fuse -F1, 2 A: it protects the WIRES. If too much current flows (a short circuit), it melts and opens the circuit. A miniature circuit breaker (MCB) does the same job, and you can switch it on again. A blown fuse looks the same as a good one: measure it!',
        estop: 'E-stop -S1: an NC contact (normally closed). Pressed, it opens and removes the 24 V from everything after it. NC is fail-safe: a broken wire acts like a pressed E-stop. The PLC watches it on input ' + B.a[0] + ' (EStop_OK).',
        start: 'START -S2: an NO contact (normally open). Pressed, it closes and the coil -K1 gets 24 V. Use "a colleague holds it" to keep it pressed while you measure.',
        coil: 'Relay coil -K1 (A1 +, A2 −), about 600 Ω. With 24 V it takes I = 24 V / 600 Ω = 40 mA and pulls in: its contacts change over. The relay LED shows when the coil has voltage.',
        diode: 'Flyback diode -V1 across the coil. When the coil switches off, it makes a voltage spike of hundreds of volts. The diode lets this energy circle through the coil and protects the contact or the PLC output. It points "backwards" (cathode at A1+), so in normal operation no current flows through it. Fitted the wrong way it is a short circuit: the fuse blows.',
        contact: 'Contact -K1 13–14: an NO contact of the relay. It closes when the coil pulls in, and gives 24 V to the lamp -H1 and to PLC input ' + B.a[1] + ' (K1_On). Contacts can burn or wear out: then the relay clicks but the contact stays open.',
        lamp: 'Lamp -H1: an LED pilot light, 24 V, about 20 mA. It lights when K1 is pulled in.',
        plc: `PLC input card -A1 (${B.n}: ${B.a[0]} and ${B.a[1]}). An input sees "1" above about 15 V and "0" below 5 V. Each input takes about 5 mA, so it also pulls its wire to 0 V when the contact before it is open. ${B.on}`,
      }[id];
      if (T) say(T, 'info');
    }

    // ───── tab 2: the motor ─────
    function renderMotor() {
      const a = document.activeElement, fk = a && root.contains(a) ? a.getAttribute('data-f') : null;
      const M = MOT[mSel], st = P.mot[mSel], B = BR[P.brand], rs = runState[mSel] || {};
      const fld = (id, k, v, cls) => `<button type="button" class="hwm-pf${cls ? ' ' + cls : ''}" data-act="field" data-k="${id}" data-f="fld-${id}"><small>${k}</small><b>${v}</b></button>`;
      let h = `<div class="hwm-sec"><div class="hwm-h"><b>Motor</b><span>Your mains: 3 × 400 V, 50 Hz</span></div><div class="hwm-mots" role="group" aria-label="Motor">${[1, 2].map((k) => `<button type="button" class="hwm-case" data-act="mot" data-m="${k}" data-f="mot-${k}" aria-pressed="${mSel === k}">${esc(MOT[k].name)} ${MOT[k].kw} kW${P.done['mot' + k] ? '<i aria-hidden="true">✓</i><span class="hwm-sr"> (done)</span>' : ''}</button>`).join('')}</div>
<p class="hwm-mains">Mains in this plant: <b>3 × 400 V</b> between the phases L1, L2, L3. Read the nameplate (click any field), connect the motor in the terminal box, set the overload relay, then press <b>Test run</b>.</p></div>`;
      h += `<div class="hwm-mgrid2"><div><div class="hwm-plate" role="group" aria-label="Motor nameplate"><div class="hwm-ptop"><span>3~ Mot.</span><span>IEC 60034</span></div><div class="hwm-pgrid">
${fld('type', 'Type', M.type, '')}${fld('hz', 'Hz', '50', '')}${fld('ip', 'Protection', M.ip, '')}
${fld('v', 'Voltage', M.v + ' ' + M.vv, 'w2')}${fld('kw', 'Power', M.kw + ' kW', '')}
${fld('a', 'Current', M.a, 'w2')}${fld('cos', 'cos φ', M.cos, '')}
${fld('rpm', 'Speed', M.rpm + ' min⁻¹', '')}${fld('eff', 'Efficiency', 'IE3 ' + M.eff + ' %', '')}${fld('ins', 'Ins. class · duty', 'F · S1', '')}
</div><p class="hwm-pnote">Click a field: what it means.</p></div>
<div class="hwm-rulebox"><b>The rule:</b> the SMALLER voltage on the plate is the voltage of ONE winding. Your mains = the bigger voltage → <b>star (Y)</b>. Your mains = the smaller voltage → <b>delta (Δ)</b>.</div></div>`;
      // terminal box + windings
      const c = st.c, uw = c === 'Y' ? 231 : c === 'D' ? 400 : 0, good = c ? Math.abs(uw - M.uw) < 20 : null;
      let tb = `<svg class="hwm-tbsvg" viewBox="0 0 330 170" role="img" aria-label="Terminal box: ${c === 'Y' ? 'star bridge' : c === 'D' ? 'three delta bridges' : 'no bridges yet'}">`;
      tb += `<rect class="tb" x="8" y="8" width="174" height="154" rx="10"/><text x="95" y="24" text-anchor="middle" class="sm">terminal box</text>`;
      const T = [['W2', 40, 56], ['U2', 95, 56], ['V2', 150, 56], ['U1', 40, 114], ['V1', 95, 114], ['W1', 150, 114]];
      if (c === 'Y') tb += `<rect class="br" x="30" y="50" width="130" height="12" rx="4"/>`;
      if (c === 'D') [40, 95, 150].forEach((x) => (tb += `<rect class="br" x="${x - 6}" y="56" width="12" height="58" rx="4"/>`));
      T.forEach(([n, x, y]) => (tb += `<circle class="stud" cx="${x}" cy="${y}" r="9"/><text x="${y < 80 ? x : x + 12}" y="${y < 80 ? y - 14 : y + 22}" text-anchor="${y < 80 ? 'middle' : 'start'}">${n}</text>`));
      [['L1', 40], ['L2', 95], ['L3', 150]].forEach(([n, x]) => (tb += `<path class="w" d="M${x} 123 V170"/><text x="${x + 8}" y="166" class="sm">${n}</text>`));
      // the windings
      const wc = c ? (good ? 'wd ok' : 'wd bad') : 'wd';
      if (c === 'Y') tb += `<g transform="translate(255 85)"><path class="w" d="M0 0 V-34 M0 0 L29 17 M0 0 L-29 17"/><rect class="${wc}" x="-6" y="-46" width="12" height="26" rx="3"/><rect class="${wc}" x="-6" y="-46" width="12" height="26" rx="3" transform="rotate(120)"/><rect class="${wc}" x="-6" y="-46" width="12" height="26" rx="3" transform="rotate(240)"/><text y="62" text-anchor="middle" class="${good ? 'vok' : 'vbad'}">231 V</text><text y="76" text-anchor="middle" class="sm">per winding</text></g>`;
      else if (c === 'D') tb += `<g transform="translate(255 92)"><path class="w" d="M0 -48 L42 24 L-42 24 Z"/><rect class="${wc}" x="-6" y="-13" width="12" height="28" rx="3" transform="translate(21 -12) rotate(-30)"/><rect class="${wc}" x="-6" y="-13" width="12" height="28" rx="3" transform="translate(-21 -12) rotate(30)"/><rect class="${wc}" x="-6" y="-13" width="12" height="28" rx="3" transform="translate(0 24) rotate(90)"/><text y="54" text-anchor="middle" class="${good ? 'vok' : 'vbad'}">400 V</text><text y="68" text-anchor="middle" class="sm">per winding</text></g>`;
      else tb += `<text x="255" y="80" text-anchor="middle" class="sm">choose</text><text x="255" y="94" text-anchor="middle" class="sm">star or delta</text>`;
      tb += '</svg>';
      h += `<div><div class="hwm-card"><h5>Terminal box: star or delta?</h5><div class="hwm-btns" role="group" aria-label="Connection"><button type="button" class="btn small" data-act="conn" data-c="Y" data-f="conn-Y" aria-pressed="${c === 'Y'}">Star (Y)</button><button type="button" class="btn small" data-act="conn" data-c="D" data-f="conn-D" aria-pressed="${c === 'D'}">Delta (Δ)</button></div>${tb}</div>`;
      // overload relay
      const ang = (v) => Math.PI * (1 - (v - M.lo) / (M.hi - M.lo)), px = (v, r) => (65 + r * Math.cos(ang(v))).toFixed(1), py = (v, r) => (70 - r * Math.sin(ang(v))).toFixed(1);
      let dial = `<svg class="hwm-olsvg" viewBox="0 0 130 80" aria-hidden="true"><path class="sc" d="M15 70 A50 50 0 0 1 115 70"/>`;
      for (let v = M.lo; v <= M.hi + 0.001; v += (M.hi - M.lo) / 5) dial += `<line class="tk" x1="${px(v, 44)}" y1="${py(v, 44)}" x2="${px(v, 56)}" y2="${py(v, 56)}"/>`;
      dial += `<text x="14" y="79">${M.lo}</text><text x="116" y="79">${M.hi}</text><line class="pn" x1="65" y1="70" x2="${px(st.ol, 46)}" y2="${py(st.ol, 46)}"/><circle class="hub" cx="65" cy="70" r="5"/></svg>`;
      h += `<div class="hwm-card"><h5>Overload relay -F2 <small style="font-weight:400;color:var(--muted)">(${esc(B.ol)})</small></h5><div class="hwm-ol">${dial}<div class="hwm-olset"><span class="hwm-k">Setting · range ${M.lo}–${M.hi} A</span><output>${st.ol.toFixed(1)} A</output>
<input type="range" min="${M.lo}" max="${M.hi}" step="0.1" value="${st.ol}" data-ol="1" data-f="ol" aria-label="Overload relay setting in ampere"><div class="hwm-btns"><button type="button" class="btn small" data-act="olstep" data-d="-1" data-f="ol-m" aria-label="0.1 A less">− 0.1</button><button type="button" class="btn small" data-act="olstep" data-d="1" data-f="ol-p" aria-label="0.1 A more">+ 0.1</button></div></div></div></div>`;
      // test run
      const spin = rs.phase === 'run' ? (rs.slow ? 'slow' : 'spin') : '';
      h += `<div class="hwm-card"><h5>Test run</h5><div class="hwm-run"><svg class="hwm-motor ${spin}" viewBox="0 0 64 64" aria-hidden="true"><circle class="body" cx="32" cy="32" r="29"/><g class="fan"><path d="M32 32 L30 8 Q32 5 36 8 Z"/><path d="M32 32 L30 8 Q32 5 36 8 Z" transform="rotate(120 32 32)"/><path d="M32 32 L30 8 Q32 5 36 8 Z" transform="rotate(240 32 32)"/><circle cx="32" cy="32" r="5" fill="var(--surface)"/></g></svg>
<div class="hwm-vals"><span><em>Clamp meter L1</em><b class="${rs.bad ? 'bad' : rs.ok ? 'ok' : ''}">${rs.I != null ? rs.I.toFixed(1) + ' A' : '—'}</b></span><span><em>Speed</em><b>${rs.rpm != null ? rs.rpm + ' rpm' : '—'}</b></span><span><em>Overload</em><b class="${rs.trip ? 'bad' : rs.phase ? 'ok' : ''}">${rs.trip ? 'TRIPPED' : rs.phase ? 'OK' : '—'}</b></span></div></div>
<div class="hwm-btns" style="margin-top:10px"><button type="button" class="btn small primary" data-act="run" data-f="run">▶ Test run</button>${rs.trip ? '<button type="button" class="btn small" data-act="olreset" data-f="olreset">Reset the overload</button>' : ''}</div></div></div></div>`;
      p2.innerHTML = h;
      if (fk) { const n = root.querySelector('[data-f="' + fk + '"]'); if (n) n.focus({ preventScroll: true }); }
    }
    function fieldInfo(k) {
      const M = MOT[mSel], hi = M.v.split('/')[1].replace(' V', ''), lo = M.v.split('/')[0];
      const In = M.In.toFixed(1), Ilo = M.a.split('/')[0];
      const t = {
        type: `3~ Mot. = three-phase motor. ${M.type}: frame size ${M.type.split('-')[0]}, "-4" = 4 poles. IEC 60034 is the standard for electric motors.`,
        hz: 'Made for 50 Hz mains. On 60 Hz it turns about 20 % faster.',
        ip: 'IP55: the first 5 = protected against dust, the second 5 = protected against water jets.',
        v: `${M.v} ${M.vv}: two voltages for two connections. Delta (Δ) for ${lo} V mains, star (Y) for ${hi} V mains. Each winding is made for ${M.uw} V, the smaller number. Your mains is 400 V: ${M.right === 'Y' ? 'star' : 'delta'} gives each winding ${M.uw === 230 ? '400 / 1.73 = 231 V' : '400 V'}.`,
        kw: `${M.kw} kW is the MECHANICAL power at the shaft, not what it takes from the mains. Check: √3 × 400 V × ${In} A × ${M.cos} = ${(Math.sqrt(3) * 400 * M.In * +M.cos / 1000).toFixed(1)} kW electrical; × efficiency ${M.eff} % ≈ ${M.kw} kW at the shaft.`,
        a: `${M.a}: the rated (full-load) current for each connection: ${Ilo} at ${lo} V in delta, ${M.a.split('/')[1]} at ${hi} V in star. On 400 V mains the motor takes ${In} A. Set the overload relay to the current of YOUR connection.`,
        cos: `cos φ ${M.cos} (power factor): the motor also needs current for its magnetic field. This current does no work. Only ${Math.round(+M.cos * 100)} % of the current does useful work.`,
        rpm: `${M.rpm} rpm at full load. A 4-pole motor at 50 Hz has a synchronous speed of 1500 rpm; the ${1500 - M.rpm} rpm difference is the slip. Unloaded it turns almost 1500 rpm.`,
        eff: `IE3 = efficiency class "premium". ${M.eff} % of the electrical power becomes shaft power; the rest becomes heat.`,
        ins: 'Insulation class F: the windings may get up to 155 °C. S1 = continuous duty: it may run at full power all day.',
      }[k];
      root.querySelectorAll('[data-act="field"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
      if (t) say(t, 'info');
    }
    function setConn(c) {
      const M = MOT[mSel];
      stopRun();
      P.mot[mSel].c = c;
      runState[mSel] = {};
      save();
      renderMotor();
      const right = c === M.right;
      const T = mSel === 1
        ? { Y: 'Star (Y) on 400 V: each winding gets 400 / √3 = 231 V. This motor\'s windings are made for 230 V (the smaller voltage on the plate). Right!',
          D: 'Delta (Δ) on 400 V: each winding gets the full 400 V, but it is made for 230 V. Far too much: the current would be about 3 times too high and the motor burns. Delta is right only on 3 × 230 V mains.' }
        : { D: 'Delta (Δ) on 400 V: each winding gets 400 V, and this motor\'s windings are made for 400 V (the smaller voltage on the plate). Right! A motor like this can also use a star-delta starter.',
          Y: 'Star (Y) on 400 V: each winding gets only 231 V, but it is made for 400 V. The motor has only 1/3 of its torque: under load it cannot reach speed, the current rises and it overheats. Star is only used for a star-delta START.' };
      say(T[c], right ? 'ok' : 'bad');
    }
    function setOL(v, quiet) {
      const M = MOT[mSel];
      v = Math.round(Math.min(M.hi, Math.max(M.lo, v)) * 10) / 10;
      stopRun();
      P.mot[mSel].ol = v;
      runState[mSel] = {};
      save();
      const out = p2.querySelector('.hwm-olset output'), inp = p2.querySelector('[data-ol]');
      if (out && inp) { out.textContent = v.toFixed(1) + ' A'; if (+inp.value !== v) inp.value = v; }
      const pn = p2.querySelector('.hwm-olsvg .pn');
      if (pn) { const ang = Math.PI * (1 - (v - M.lo) / (M.hi - M.lo)); pn.setAttribute('x2', (65 + 46 * Math.cos(ang)).toFixed(1)); pn.setAttribute('y2', (70 - 46 * Math.sin(ang)).toFixed(1)); }
      const vals = p2.querySelector('.hwm-vals');
      if (vals) vals.querySelectorAll('b').forEach((b) => { b.textContent = '—'; b.className = ''; });
      p2.querySelector('.hwm-motor').setAttribute('class', 'hwm-motor');
      const rb = p2.querySelector('[data-act="olreset"]');
      if (rb) rb.remove();
      if (!quiet) say(`Overload relay set to ${v.toFixed(1)} A. It must match the motor current for YOUR connection (read it on the plate).`, 'info');
    }
    function stopRun() { clearTimeout(runT); runT = 0; }
    function testRun() {
      const M = MOT[mSel], st = P.mot[mSel], B = BR[P.brand], k = mSel;
      stopRun();
      if (!st.c) { runState[k] = {}; renderMotor(); return say('Choose star or delta in the terminal box first. Without bridges the windings are not connected.', 'warn'); }
      const right = st.c === M.right, bad = M.bad[st.c];
      const Irun = right ? M.I : bad.I, rpm = right ? M.run : bad.rpm;
      // phase 1: start (inrush)
      runState[k] = { phase: 'run', I: Math.round(M.In * 6.5 * 10) / 10, rpm: 300, slow: !right && st.c === 'Y' };
      renderMotor();
      say(`Starting… For a moment the motor takes about 6–7 × its rated current (${runState[k].I.toFixed(0)} A): the inrush current. That is normal and too short to trip the overload.`, 'info');
      runT = setTimeout(() => {
        if (!root.isConnected) return;
        const trip = !right || st.ol < Irun - 0.05;
        runState[k] = { phase: 'run', I: Irun, rpm, slow: !right && st.c === 'Y', bad: !right || st.ol < Irun - 0.05 };
        renderMotor();
        say(`Running: the clamp meter shows ${Irun.toFixed(1)} A, speed ${rpm} rpm.${trip ? ' Watch the overload relay…' : ''}`, trip ? 'warn' : 'info');
        runT = setTimeout(() => {
          if (!root.isConnected) return;
          const ol = st.ol.toFixed(1), In = M.In.toFixed(1);
          let t, kind = 'bad', pass = false;
          if (!right && st.c === 'D') t = `The overload TRIPPED after a few seconds. In delta each winding got 400 V instead of 230 V: the motor hummed and took ${Irun.toFixed(1)} A, 3 × too much. The overload saved the motor. Fix the connection: star for this motor on 400 V.`;
          else if (!right) t = `The overload TRIPPED. In star each winding got only 231 V instead of 400 V: the fan could not reach full speed (${rpm} rpm) and took ${Irun.toFixed(0)} A. Connect it in delta.`;
          else if (trip) t = `Right connection, but the overload TRIPPED after about a minute of normal running: it is set too low (${ol} A, the motor takes ${Irun.toFixed(1)} A). Set it to the nameplate current: ${In} A.`;
          else if (st.ol > M.In + 0.05) { t = `It runs (${Irun.toFixed(1)} A, ${rpm} rpm), but the overload is set to ${ol} A, higher than the nameplate current ${In} A. If the ${mSel === 1 ? 'pump' : 'fan'} blocks, it trips too late and the winding gets too hot. Set it exactly to ${In} A.`; kind = 'warn'; }
          else if (st.ol < M.In - 0.05) { t = `It runs for now (${Irun.toFixed(1)} A), but ${ol} A is below the nameplate current ${In} A: on a hot day or at full load it will trip for no good reason. Set it exactly to ${In} A.`; kind = 'warn'; }
          else {
            pass = true; kind = 'ok';
            t = `Perfect: ${st.c === 'Y' ? 'star' : 'delta'} on 400 V, overload ${ol} A = nameplate current. The motor runs at ${rpm} rpm and takes ${Irun.toFixed(1)} A, a little below rated, because the ${mSel === 1 ? 'pump' : 'fan'} does not need the full ${M.kw} kW. The overload's NC contact 95–96 stays closed: the PLC input Motor_OL_OK (${B.a[2]}) = 1.`;
          }
          runState[k] = { phase: trip ? 'stop' : 'run', I: trip ? 0 : Irun, rpm: trip ? 0 : rpm, trip, ok: pass, bad: kind === 'bad', slow: !right && st.c === 'Y' };
          if (trip) t += ` The trip opens 95–96: the PLC sees Motor_OL_OK (${B.a[2]}) = 0 and must switch the contactor off and show an alarm.`;
          let fresh = false;
          if (pass && !P.done['mot' + k]) { P.done['mot' + k] = 1; fresh = true; save(); }
          renderMotor();
          renderCheck();
          const all = CHECKS.every((c) => P.done[c.id]);
          if (fresh) t += ` ✓ Checklist: Motor ${k} runs correctly.`;
          if (all && !wasAll) t += WIN;
          wasAll = all;
          say(t, kind);
        }, reduced() ? 300 : 1400);
      }, reduced() ? 200 : 1100);
    }

    // ───── tabs, brand, reset ─────
    function setTab(t, quiet) {
      P.tab = t === 'motor' ? 'motor' : 'circ';
      p1.hidden = P.tab !== 'circ';
      p2.hidden = P.tab !== 'motor';
      root.querySelectorAll('[data-act="tab"]').forEach((b) => { const on = b.dataset.t === P.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      if (P.tab === 'motor') renderMotor(); else stopRun();
      save();
      if (!quiet) say(P.tab === 'motor' ? 'Motor nameplate: your mains is 3 × 400 V. Read the plate of Motor 1, choose star or delta, set the overload relay, then press Test run.' : 'Measure the circuit: turn the dial, then click a point for the red probe and one for the black probe.', 'info');
    }
    function setBrand(k) {
      if (!BR[k]) return;
      P.brand = k;
      root.querySelectorAll('[data-act="brand"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.b === k)));
      save();
      if (P.tab === 'motor') { renderMotor(); say(`${BR[k].n}: the overload relay could be a ${BR[k].ol}. Its NC contact 95–96 goes to the PLC input ${BR[k].a[2]}. Star, delta and the nameplate are the same for every brand.`, 'info'); }
      else { renderCircuit(); say(`${BR[k].n}: the PLC inputs are ${BR[k].a[0]} (EStop_OK) and ${BR[k].a[1]} (K1_On). The 24 V wiring and the meter readings are the same for every brand. ${BR[k].on}`, 'info'); }
    }
    function reset() {
      stopRun();
      P.done = {}; P.mot = { 1: { c: null, ol: MOT[1].start }, 2: { c: null, ol: MOT[2].start } };
      runState = {}; recs = []; log = []; verdict = {}; wasAll = false;
      caseId = 'ok'; S.fault = null; S.power = true; S.estop = false; S.start = false; red = null; black = null; next = 'red'; mode = 'vdc';
      save();
      renderCircuit(); renderCheck(); if (P.tab === 'motor') renderMotor();
      say('Mission reset. Start with the working circuit: V DC, red probe on point 1, black probe on point 8.', 'info');
    }

    // ───── probes ─────
    function clickPt(p) {
      if (!PTS[p]) return;
      let lead = '';
      if (red === p) { red = null; next = 'red'; lead = `Red probe taken off ${ptLabel(p)}.`; return act1(lead); }
      if (black === p) { black = null; next = 'black'; lead = `Black probe taken off ${ptLabel(p)}.`; return act1(lead); }
      const who = !red ? 'red' : !black ? 'black' : next;
      if (who === 'red') red = p; else black = p;
      next = who === 'red' ? 'black' : 'red';
      act1('');
    }
    function padPt(k, p) {
      if (!PTS[p]) return;
      if (k === 'red') { if (black === p) black = red; red = p; next = 'black'; }
      else { if (red === p) red = black; black = p; next = 'red'; }
      act1('');
    }

    // ───── events ─────
    function onAct(b) {
      const a = b.dataset.act;
      if (a === 'brand') setBrand(b.dataset.b);
      else if (a === 'tab') setTab(b.dataset.t);
      else if (a === 'case') setCase(b.dataset.c);
      else if (a === 'power') {
        S.power = !S.power;
        if (!S.power) S.start = S.start; // the colleague may keep holding START
        act1(S.power ? 'Main switch -Q1 ON: the power supply makes 24 V.' : 'Main switch -Q1 OFF: no voltage anywhere now (in a real cabinet: lock it and prove it dead before you touch).', 'info');
      } else if (a === 'estop') {
        const was = circuit(S).k1;
        S.estop = !S.estop;
        const now = circuit(S).k1;
        act1(S.estop ? 'E-stop -S1 pressed: its NC contact opens.' + (was && !now ? ' K1 drops out; the diode -V1 catches the voltage spike of the coil.' : '') : 'E-stop -S1 released (turned back): its contact closes again.', 'info');
      } else if (a === 'start') {
        const was = circuit(S).k1;
        S.start = !S.start;
        const now = circuit(S).k1;
        let t = S.start ? 'A colleague holds START -S2: its NO contact closes.' : 'The colleague lets go of START: its contact opens.';
        if (!was && now) t += ' Click! K1 pulls in.';
        if (was && !now) t += ' K1 drops out; the diode -V1 catches the voltage spike of the coil.';
        if (S.start && !now && S.power && !S.estop) t += ' But K1 does not pull in…';
        act1(t, 'info');
      } else if (a === 'mode') {
        const m = b.dataset.m;
        if (!MBY[m]) return;
        mode = m;
        act1(m === 'off' ? '' : `Dial on ${MBY[m].l}.`, 'info');
      } else if (a === 'pt') clickPt(b.dataset.pt);
      else if (a === 'pad') padPt(b.dataset.p, b.dataset.pt);
      else if (a === 'swap') { const t = red; red = black; black = t; act1('Probes swapped.', 'info'); }
      else if (a === 'clearp') { red = null; black = null; next = 'red'; act1('Probes taken off.', 'info'); }
      else if (a === 'verdict') verdictFor(b.dataset.part);
      else if (a === 'info') info(b.dataset.part);
      else if (a === 'more') { capOpen = !capOpen; fitCap(); }
      else if (a === 'reset') reset();
      else if (a === 'mot') { stopRun(); mSel = +b.dataset.m === 2 ? 2 : 1; save(); renderMotor(); say(`${MOT[mSel].name}, ${MOT[mSel].kw} kW, ${MOT[mSel].v} ${MOT[mSel].vv}. Your mains: 3 × 400 V. Star or delta?`, 'info'); }
      else if (a === 'conn') setConn(b.dataset.c);
      else if (a === 'olstep') setOL(P.mot[mSel].ol + 0.1 * +b.dataset.d);
      else if (a === 'run') testRun();
      else if (a === 'olreset') { runState[mSel] = {}; renderMotor(); say('Overload reset (the blue button). Contact 95–96 is closed again. Fix the cause first, then try again.', 'info'); }
      else if (a === 'field') fieldInfo(b.dataset.k);
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !root.contains(b) || b.disabled) return;
      onAct(b);
    });
    root.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t.matches) return;
      // the SVG test points and parts act as buttons
      if ((e.key === 'Enter' || e.key === ' ') && t.matches('g[data-act]')) { e.preventDefault(); onAct(t); return; }
      if (t.matches('[role="tab"]') && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) {
        e.preventDefault();
        setTab(P.tab === 'circ' ? 'motor' : 'circ');
        const n = root.querySelector('[data-f="tab-' + P.tab + '"]');
        if (n) n.focus();
      }
    });
    root.addEventListener('input', (e) => { if (e.target.dataset && e.target.dataset.ol) setOL(+e.target.value, true); });
    root.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.ol) setOL(+e.target.value); });

    ph.replaceWith(root);
    let ro = null, seen = false, lastW = -1;
    const fit = () => {
      if (!root.isConnected) { if (seen) { stopRun(); if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); } return; }
      seen = true;
      const w = root.clientWidth;
      if (w === lastW) return;
      lastW = w;
      root.classList.toggle('hwm-narrow', w < 600);
      fitCap();
    };
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(() => requestAnimationFrame(fit)); ro.observe(root); } else window.addEventListener('resize', fit);
    root.querySelectorAll('[data-act="brand"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.b === P.brand)));
    renderCircuit();
    renderCheck();
    setTab(P.tab, true);
    const any = CHECKS.some((c) => P.done[c.id]);
    say(any ? 'Welcome back: your mission progress is restored. The meter is on V DC: click a point for the red probe.' : 'Start here: the dial is on V DC. Click point 1 (red probe), then point 8 (black probe): the voltage of the power supply.', 'info');
    capEl.classList.remove('flash');
  };
})();
