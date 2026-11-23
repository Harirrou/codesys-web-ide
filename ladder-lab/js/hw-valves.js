/* PLC Start: pneumatic valves. Mounted in lessons through [[hw:valves]] and [[hw:airlogic]].
 * [[hw:valves]]  A valve island with 8 directional valves (2/2, 3/2 NC / NO, 5/2 monostable / bistable, 5/3 closed /
 *                exhaust / pressure centre). Mount one, drive its coils like PLC outputs, cut the power or the air, hang a
 *                load on the cylinder, throttle the exhaust: the ISO 1219 symbol shifts, the air flows, the cylinder moves.
 * [[hw:airlogic]] The small valves around them: check valve, one-way flow control, shuttle (OR), two-pressure (AND),
 *                quick exhaust, pressure regulator.
 * The physics is in LL.ValveSim (pure, tested in node); the rest draws it. */
(function (G) {
  const LL = (G.LL = G.LL || {});

  // ───────────── the valves ─────────────
  // box contents: per port the connection. For a double-acting cylinder: cap (port 4, extends), rod (port 2, retracts).
  // 'P' = joined to supply 1, 'E' = joined to an exhaust, 'X' = blocked. Single-acting / nozzle: out (port 2).
  const VALVES = {
    v22: { n: '2/2', sub: 'NC', name: '2/2 valve, normally closed', ports: 2, kind: 'nozzle', coils: ['14'], ret: 'spring',
      boxes: { on: { out: 'P' }, rest: { out: 'X' } }, order: ['on', 'rest'],
      use: 'Open / shut one line: blow-off nozzles, air knives, vacuum on / off, the main shut-off valve.',
      loss: 'Closes: the air stops.', plc: 'Coil ON for as long as air must flow.' },
    v32nc: { n: '3/2', sub: 'NC', name: '3/2 valve, normally closed', ports: 3, kind: 'single', coils: ['14'], ret: 'spring',
      boxes: { on: { out: 'P' }, rest: { out: 'E' } }, order: ['on', 'rest'],
      use: 'Single-acting cylinders (spring return), clamps, stoppers, ejectors, and the soft-start / dump valve of a machine.',
      loss: 'Exhausts the cylinder: the spring pulls it back. A safe rest position for most clamps and ejectors.', plc: 'Coil ON for as long as the cylinder must stay out.' },
    v32no: { n: '3/2', sub: 'NO', name: '3/2 valve, normally open', ports: 3, kind: 'single', coils: ['14'], ret: 'spring',
      boxes: { on: { out: 'E' }, rest: { out: 'P' } }, order: ['on', 'rest'],
      use: 'Things that must stay pressurised without power: a brake that is released by air, a part that must stay clamped, a pilot signal that is on by default.',
      loss: 'Pressurises: the cylinder goes OUT (or stays out) when the power fails. Choose it only when that is the safe state.', plc: 'Coil ON to vent (switch the function off).' },
    v52m: { n: '5/2', sub: 'mono', name: '5/2 valve, monostable (one coil, spring return)', ports: 5, kind: 'double', coils: ['14'], ret: 'spring',
      boxes: { on: { cap: 'P', rod: 'E' }, rest: { cap: 'E', rod: 'P' } }, order: ['on', 'rest'],
      use: 'The everyday valve for double-acting cylinders: pushers, lifts, grippers, slides. Most machines use it by default.',
      loss: 'Springs back: the cylinder RETRACTS by itself when the power fails or the E-stop opens.', plc: 'Coil ON for the whole time the cylinder must be out. Coil OFF = back.' },
    v52b: { n: '5/2', sub: 'bi', name: '5/2 valve, bistable (two coils, "memory valve")', ports: 5, kind: 'double', coils: ['14', '12'], ret: 'none',
      boxes: { on: { cap: 'P', rod: 'E' }, rest: { cap: 'E', rod: 'P' } }, order: ['on', 'rest'],
      use: 'Grippers and clamps that must not let go when the power fails; long strokes where a short pulse is enough.',
      loss: 'Stays where it is and keeps pushing: a gripper keeps the part. The cylinder does not move.', plc: 'A short pulse on 14 (out) or on 12 (back). Never both together: the valve keeps its last position.' },
    v53c: { n: '5/3', sub: 'closed', name: '5/3 valve, closed centre', ports: 5, kind: 'double', coils: ['14', '12'], ret: 'centre',
      boxes: { on: { cap: 'P', rod: 'E' }, mid: { cap: 'X', rod: 'X' }, off: { cap: 'E', rod: 'P' } }, order: ['on', 'mid', 'off'],
      use: 'Stop a cylinder anywhere in its stroke and hold it there: positioning, lifts, vertical loads (with pilot check valves for a long hold).',
      loss: 'Springs to the centre: all ports blocked, the cylinder stops and holds where it is (trapped air, it may creep a little).', plc: 'Coil 14 = out, coil 12 = back, both OFF = stop. Never both ON.' },
    v53e: { n: '5/3', sub: 'exhaust', name: '5/3 valve, exhaust centre (open centre)', ports: 5, kind: 'double', coils: ['14', '12'], ret: 'centre',
      boxes: { on: { cap: 'P', rod: 'E' }, mid: { cap: 'E', rod: 'E' }, off: { cap: 'E', rod: 'P' } }, order: ['on', 'mid', 'off'],
      use: 'A cylinder that must be free when stopped: move it by hand after an E-stop, free a trapped hand, a soft stop with no force.',
      loss: 'Both sides vented: no force at all. Free to push by hand. A vertical load FALLS.', plc: 'Coil 14 = out, coil 12 = back, both OFF = no force. Never both ON.' },
    v53p: { n: '5/3', sub: 'pressure', name: '5/3 valve, pressure centre', ports: 5, kind: 'double', coils: ['14', '12'], ret: 'centre',
      boxes: { on: { cap: 'P', rod: 'E' }, mid: { cap: 'P', rod: 'P' }, off: { cap: 'E', rod: 'P' } }, order: ['on', 'mid', 'off'],
      use: 'Balanced pressure on both sides: rodless or through-rod cylinders, or with pilot check valves to hold a position.',
      loss: 'Both sides under pressure. With a normal single-rod cylinder it CREEPS OUT, because the piston side has the bigger area.', plc: 'Coil 14 = out, coil 12 = back, both OFF = both sides pressurised. Never both ON.' },
  };
  const ORDER = ['v22', 'v32nc', 'v32no', 'v52m', 'v52b', 'v53c', 'v53e', 'v53p'];

  // ───────────── pure logic ─────────────
  const ValveSim = {
    VALVES, ORDER,
    init: (type) => ({ type, pos: VALVES[type].ret === 'centre' ? 'mid' : 'rest', x: type === 'v32no' ? 1 : 0, v: 0, jet: 0, both: false }),
    // the valve position for the inputs { y14, y12, man, power }
    position(st, inp) {
      const V = VALVES[st.type], p = inp.power !== false;
      const a = (p && inp.y14) || inp.man, b = p && inp.y12 && V.coils.length > 1;
      st.both = !!(a && b);
      if (V.ret === 'spring') return a ? 'on' : 'rest';
      if (V.ret === 'none') return a && !b ? 'on' : b && !a ? 'rest' : st.pos;       // bistable: keeps its last position
      return a && !b ? 'on' : b && !a ? 'off' : 'mid';                                // 5/3: both or none = centre
    },
    // one time step. o = { y14, y12, man, power, air, load (vertical load), speed (0.1..1, meter-out throttle) }
    step(st, o, dt) {
      const V = VALVES[st.type];
      st.pos = ValveSim.position(st, o);
      const box = V.boxes[st.pos], air = o.air !== false, sp = Math.max(0.1, Math.min(1, o.speed == null ? 1 : o.speed));
      const P = (c) => (c === 'P' ? (air ? 'P' : 'E') : c);                         // no air: the supply line is dumped
      const vmax = 0.9; let v = 0;
      if (V.kind === 'nozzle') { st.jet = P(box.out) === 'P' ? 1 : 0; st.x = Math.max(0, Math.min(1, st.x + (st.jet ? 0.8 : -0.5) * dt)); st.v = 0; st.ch = { out: P(box.out) }; return st; }
      if (V.kind === 'single') {
        const out = P(box.out);
        v = out === 'P' ? vmax * sp : out === 'E' ? -vmax : 0;                    // the spring returns it, at full speed
        if (o.load && out !== 'P') v = Math.max(v, 0.6);                           // a hanging load beats the spring
        st.ch = { out };
      } else {
        const cap = P(box.cap), rod = P(box.rod);
        if (cap === 'P' && rod === 'E') v = vmax * sp;
        else if (rod === 'P' && cap === 'E') v = -vmax * sp * (o.load ? 0.6 : 1);
        else if (cap === 'P' && rod === 'P') v = 0.22 * vmax;                       // area difference: it creeps out
        else if (cap === 'E' && rod === 'E') v = o.load ? 0.75 : 0;                 // nothing holds it
        else if (cap === 'X' && rod === 'X') v = o.load ? 0.012 : 0;                // trapped air: holds, creeps a little
        else v = o.load ? 0.3 : 0;
        if (o.load && cap === 'P' && rod === 'E') v = vmax * sp * 1.15;             // the load helps it down
        st.ch = { cap, rod };
      }
      st.x = Math.max(0, Math.min(1, st.x + v * dt));
      st.v = (st.x <= 0 && v < 0) || (st.x >= 1 && v > 0) ? 0 : v;
      return st;
    },
    sensors: (st) => ({ b1: st.x <= 0.02, b2: st.x >= 0.98 }),
  };

  // the small valves: pure functions of their inputs
  const AIR = {
    check: { name: 'Check valve (non-return)', inputs: ['Pressure left', 'Pressure right'], use: 'Lets air pass one way only. Inside quick exhausts, flow controls, vacuum lines, and to keep pressure in a tank or behind a load.',
      out: (a, b) => (a && !b ? { flow: 'ltr', txt: 'Flows left → right: the ball lifts off its seat.' } : b && !a ? { flow: 'none', txt: 'Blocked: the pressure pushes the ball onto its seat.' } : a && b ? { flow: 'none', txt: 'Same pressure both sides: no flow.' } : { flow: 'none', txt: 'No pressure: nothing moves.' }) },
    flow: { name: 'One-way flow control', inputs: ['Air in (to cylinder)', 'Air back (exhaust)'], knob: 1, use: 'Sets the speed of a cylinder. Fit it at the cylinder port as METER-OUT: it throttles the air leaving the cylinder, so the piston moves smooth and steady.',
      out: (a, b, k) => (a && !b ? { flow: 'ltr', fast: 1, txt: 'Into the cylinder: the check valve opens, full flow.' } : b && !a ? { flow: 'rtl', fast: k, txt: `Out of the cylinder: the check closes, the air must pass the needle: ${Math.round(k * 100)} % flow = the speed.` } : { flow: 'none', txt: 'No flow.' }) },
    shuttle: { name: 'Shuttle valve (OR)', inputs: ['Input X', 'Input Y'], use: 'Two signals, one output: a cylinder moved from two places (two hand valves, manual or automatic). The ball closes the side without pressure.',
      out: (a, b) => ({ y: a || b, ball: a && !b ? 'r' : b && !a ? 'l' : 'm', txt: a || b ? 'Output A has air: X OR Y.' : 'No input, no output.' }) },
    andv: { name: 'Two-pressure valve (AND)', inputs: ['Input X', 'Input Y'], use: 'Output only when both inputs have air: two-hand start in pure pneumatics, "part present AND guard closed". In a PLC machine this is a rung.',
      out: (a, b) => ({ y: a && b, ball: a && !b ? 'l' : b && !a ? 'r' : 'm', txt: a && b ? 'Both inputs: output A has air (X AND Y).' : a || b ? 'Only one input: the slider blocks it. No output.' : 'No input, no output.' } ) },
    quick: { name: 'Quick exhaust valve', inputs: ['Valve gives air', 'Valve exhausts'], use: 'Fitted right at the cylinder: the air leaves through the big port of the quick exhaust instead of the long tube and the valve. The cylinder returns much faster.',
      out: (a, b) => (a && !b ? { flow: 'ltr', txt: 'Air from the valve passes to the cylinder.' } : b && !a ? { flow: 'dump', txt: 'The valve side drops: the cylinder air dumps straight out here. Fast.' } : { flow: 'none', txt: 'No flow.' }) },
    reg: { name: 'Pressure regulator', inputs: ['Supply on'], knob: 1, use: 'Sets a lower, steady pressure: less force for a gripper that must not crush, or a gentle press. Force = pressure × piston area.',
      out: (a, b, k) => { const bar = a ? Math.round(k * 60) / 10 : 0; return { bar, txt: a ? `Outlet ${bar} bar from a 7 bar supply. A 32 mm cylinder now pushes about ${Math.round(bar * 80)} N (≈ ${Math.round(bar * 8)} kg).` : 'Supply off: 0 bar.' }; } },
  };
  ValveSim.AIR = AIR;

  // ───────────── vacuum: a venturi ejector, a suction cup, a part ─────────────
  // o = { gen, blow, lift, mass (kg), cup (mm), leak, sw (switch point, -kPa) }
  const VacSim = {
    init: () => ({ vac: 0, y: 0, held: false, dropped: false, part: 0, msg: '' }),
    force: (vacKpa, cupMm) => vacKpa * 1000 * Math.PI * cupMm * cupMm / 4 * 1e-6,
    step(st, o, dt) {
      const target = o.blow ? 0 : o.gen ? (o.leak ? 30 : 75) : 0;
      const tau = o.blow ? 0.03 : target > st.vac ? 0.18 : 0.35;                 // kPa below atmosphere; blow-off clears it fast
      st.vac += (target - st.vac) * Math.min(1, dt / tau);
      if (st.vac < 0.05) st.vac = 0;
      const touching = st.y < 0.02 && !st.dropped;
      const ymov = o.lift ? 1 : -1, moving = (o.lift && st.y < 1) || (!o.lift && st.y > 0);
      const need = o.mass * (9.81 + (moving ? 5 : 0)), have = VacSim.force(st.vac, o.cup);
      if (touching && have > o.mass * 9.81 * 1.05) st.held = true;
      if (st.held && have < need) { st.held = false; if (st.y > 0.02 || o.lift) { st.dropped = true; st.msg = (st.y > 0.02 ? 'The part fell' : 'The part tore off the cup') + ': the cup holds ' + Math.round(have) + ' N, the move needs ' + Math.round(need) + ' N.'; } }
      st.y = Math.max(0, Math.min(1, st.y + ymov * dt / 0.8));
      if (st.dropped && st.y < 0.02 && !o.lift) { st.dropped = false; }             // back down: the cup is on the part again
      st.part = st.held ? st.y : 0;
      st.sw = st.vac >= (o.sw || 50);
      return st;
    },
  };
  ValveSim.Vac = VacSim;
  // ───────────── a pneumatic drawing (ISO 1219-2 names) and the faults to find on it ─────────────
  const PDRAW = {
    parts: {
      '0Z1': ['Service unit (FRL)', 'Filter, regulator and gauge: clean air at a set pressure for the whole machine. 0 = supply group, Z = air preparation.'],
      '0V1': ['Shut-off / soft-start valve', 'A 3/2 valve that switches the air on slowly and dumps all air when switched off. Lock it out before you work on the machine.'],
      '1V1': ['5/2 valve, coil 1M1', 'Drives cylinder 1A1. 1 = circuit 1, V = valve. Its coil has its own name on the electrical drawing: 1M1, wired to a PLC output.'],
      '1V2': ['One-way flow control (out stroke)', 'Meter-out on the rod side: sets the speed of the out stroke of 1A1.'],
      '1V3': ['One-way flow control (back stroke)', 'Meter-out on the piston side: sets the speed of the back stroke of 1A1.'],
      '1A1': ['Cylinder 1A1', 'Double-acting cylinder of circuit 1. A = actuator.'],
      '1B1': ['Sensor 1B1 (back)', 'Reed switch at the back end of 1A1. B = sensor; wired to a PLC input.'],
      '1B2': ['Sensor 1B2 (out)', 'Reed switch at the front end of 1A1.'],
      '2V1': ['5/3 valve, coils 2M1 / 2M2', 'Closed-centre valve for cylinder 2A1: both coils off = stop and hold.'],
      '2A1': ['Cylinder 2A1', 'Double-acting cylinder of circuit 2.'],
    },
    faults: [
      { q: 'Cylinder 1A1 goes out much too slowly, but comes back fast.', a: '1V2', why: '1V2 throttles the air leaving the rod side, so it sets the out stroke. It is closed too far (or blocked).' },
      { q: 'No cylinder moves at all. All coils switch (the LEDs on the valves light), the gauge shows 0 bar.', a: '0V1', why: 'No air downstream: the shut-off / soft-start valve 0V1 is off or did not switch. Check its coil and the main supply.' },
      { q: 'The PLC switches output 1M1, the LED on 1V1 lights, 1A1 does not move. Pressing the manual override on 1V1 moves it.', a: '1V1', why: 'Air is there and the cylinder works with the override, so the valve does not switch electrically: coil, connector or a pilot valve that needs more pressure.' },
      { q: '1A1 is out (you can see it), but the PLC waits for ever in the step "wait for 1A1 out".', a: '1B2', why: 'The sensor at the front end, 1B2, does not switch: moved on the barrel, cable broken or wrong address.' },
      { q: 'Cylinder 2A1 stops in the middle and slowly sinks under its load.', a: '2V1', why: 'The closed centre of 2V1 should block the air; an internal leak (worn seals) lets it out. A pilot check valve on the cylinder holds a load for longer.' },
    ],
  };
  ValveSim.PDRAW = PDRAW;
  LL.ValveSim = ValveSim;
  if (typeof document === 'undefined') return;

  // ───────────── drawing helpers ─────────────
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AIRC = '#2c6cc4';
  const STORE = 'll-valves-done';
  const CSS = `
.hw-vlv { display: grid; gap: 12px; }
.vlv-island { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0; padding: 10px 10px 0; border: 1px solid var(--line); border-radius: var(--r-panel) var(--r-panel) 0 0; background: linear-gradient(180deg, var(--surface-2), var(--surface-3)); }
.vlv-slot { appearance: none; font: inherit; cursor: pointer; display: grid; justify-items: center; gap: 4px; padding: 8px 2px 10px; margin: 0 1px; border: 1px solid var(--line); border-bottom: 0; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #e9ecea, #c9cec9); color: #161a1d; transform: translateY(6px); transition: transform .15s, box-shadow .15s; }
.vlv-slot b { font: 700 13px/1 var(--f-mono); }
.vlv-slot span { font: 500 11px/1.1 var(--f-body); color: #343a3e; }
.vlv-slot i { width: 8px; height: 8px; border-radius: 50%; background: #5d666b; }
.vlv-slot.on { transform: none; background: linear-gradient(180deg, #f8f8f5, #d8ddd8); box-shadow: 0 -2px 8px rgba(0,0,0,.15); border-color: ${AIRC}; }
.vlv-slot.on i { background: #f2a900; box-shadow: 0 0 8px #f2a900; }
.vlv-plate { height: 10px; margin-top: -12px; border: 1px solid var(--line); border-top: 0; border-radius: 0 0 var(--r-panel) var(--r-panel); background: linear-gradient(180deg, #aeb4b0, #7b858a); }
.vlv-svg svg { width: 100%; height: auto; display: block; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-panel); }
.vlv-ctl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.vlv-ctl .btn.on { background: var(--power); border-color: var(--power); color: var(--on-power); }
.vlv-ctl .btn.warn { background: var(--danger); border-color: var(--danger); color: var(--on-danger); }
.vlv-ctl label { display: inline-flex; align-items: center; gap: 8px; font-size: var(--t-14); }
.vlv-ctl input[type=range] { width: 120px; }
.vlv-say { font-size: var(--t-14); padding: 8px 12px; border-left: 4px solid ${AIRC}; background: var(--surface-2); border-radius: 0 var(--r-ctl) var(--r-ctl) 0; }
.vlv-say.bad { border-left-color: var(--danger); }
.vlv-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px 20px; font-size: var(--t-14); }
.vlv-info h4 { margin: 0 0 2px; font-size: var(--t-12); text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
.vlv-info p { margin: 0; color: var(--ink-2); }
.vlv-chk { display: grid; gap: 4px; font-size: var(--t-14); }
.vlv-chk div::before { content: ""; display: inline-block; width: 12px; height: 12px; margin-right: 8px; vertical-align: -1px; border: 1.5px solid var(--edge); border-radius: 2px; }
.vlv-chk div.ok { color: var(--muted); text-decoration: line-through; }
.vlv-chk div.ok::before { background: var(--power); border-color: var(--power); }
.vlv-sec { display: flex; justify-content: space-between; font: 600 var(--t-12)/1.3 var(--f-body); letter-spacing: .04em; text-transform: uppercase; color: var(--muted); border-top: 1px solid var(--line-2); padding-top: 8px; }
.vlv-flow { stroke-dasharray: 6 6; animation: vlv-run .6s linear infinite; }
.vlv-ex { stroke-dasharray: 3 5; animation: vlv-run .4s linear infinite reverse; }
@keyframes vlv-run { to { stroke-dashoffset: -12; } }
.vlv-puff { animation: vlv-puff .7s ease-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes vlv-puff { from { opacity: .8; transform: scale(.4); } to { opacity: 0; transform: scale(1.6) translateY(8px); } }
.vlv-shift { transition: transform .12s ease-out; }
.air-pick { display: flex; flex-wrap: wrap; gap: 6px; }
.air-pick button { appearance: none; font: 500 var(--t-13) var(--f-body); padding: 6px 10px; min-height: 36px; border: 1px solid var(--line); border-radius: var(--r-ctl); background: var(--surface); color: var(--ink); cursor: pointer; }
.air-pick button.on { border-color: ${AIRC}; box-shadow: inset 0 0 0 1px ${AIRC}; color: ${AIRC}; font-weight: 600; }
@media (max-width: 640px) { .vlv-island { grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 8px; padding-bottom: 8px; border-radius: var(--r-panel); } .vlv-plate { display: none; } .vlv-slot { transform: none; border-bottom: 1px solid var(--line); border-radius: 4px; } .vlv-slot.on { transform: translateY(-2px); } }
`;
  const addCss = () => { if (!document.getElementById('hw-vlv-css')) { const s = document.createElement('style'); s.id = 'hw-vlv-css'; s.textContent = CSS; document.head.appendChild(s); } };
  let FS = 1; // text size factor: the drawing shrinks on a phone, its labels must not
  const T = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-size="${((o.z || 11) * FS).toFixed(1)}"${o.b ? ' font-weight="700"' : ''} fill="${o.f || 'currentColor'}" text-anchor="${o.a || 'start'}"${o.m ? ' font-family="IBM Plex Mono, monospace"' : ''}>${esc(s)}</text>`; };
  let NOW = 0; // seconds; a redrawn path starts its dash animation at the same phase, so the air keeps flowing
  const phase = (period) => ` style="animation-delay:-${(NOW % period).toFixed(2)}s"`;
  const line = (d, st, w) => `<path d="${d}" fill="none" stroke="${st === 'P' ? AIRC : st === 'E' ? 'var(--muted)' : 'var(--wire)'}" stroke-width="${w || (st === 'P' ? 3 : 2)}"${st === 'P' ? ' class="vlv-flow"' + phase(0.6) : st === 'E' ? ' class="vlv-ex"' + phase(0.4) : ''}/>`;
  const arrow = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 7; return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="currentColor" stroke-width="1.6"/><path d="M${x2} ${y2} L${(x2 - h * Math.cos(a - 0.45)).toFixed(1)} ${(y2 - h * Math.sin(a - 0.45)).toFixed(1)} L${(x2 - h * Math.cos(a + 0.45)).toFixed(1)} ${(y2 - h * Math.sin(a + 0.45)).toFixed(1)} Z" fill="currentColor"/>`; };
  const tee = (x, y, up) => `<path d="M${x} ${y} V${y + (up ? -12 : 12)} M${x - 6} ${y + (up ? -12 : 12)} H${x + 6}" stroke="currentColor" stroke-width="1.6"/>`;

  // one box of an ISO symbol (w 64, h 52); ports: top y=0, bottom y=52
  const BW = 64, BH = 52;
  const PX = { 5: { 4: 18, 2: 46, 5: 10, 1: 32, 3: 54 }, 3: { 2: 32, 1: 20, 3: 44 }, 2: { 2: 32, 1: 32 } };
  function boxSvg(V, key) {
    const b = V.boxes[key], px = PX[V.ports]; let g = `<rect x="0" y="0" width="${BW}" height="${BH}" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/>`;
    const B = BH - 6, Tp = 6;
    if (V.ports === 2) g += b.out === 'P' ? arrow(px[1], B, px[2], Tp) : tee(px[1], BH, true) + tee(px[2], 0, false);
    else if (V.ports === 3) g += b.out === 'P' ? arrow(px[1], B, px[2], Tp) + tee(px[3], BH, true) : b.out === 'E' ? arrow(px[2], Tp, px[3], B) + tee(px[1], BH, true) : tee(px[1], BH, true) + tee(px[3], BH, true) + tee(px[2], 0, false);
    else {
      const c = b.cap, r = b.rod;
      if (c === 'P' && r === 'E') g += arrow(px[1], B, px[4], Tp) + arrow(px[2], Tp, px[3], B) + tee(px[5], BH, true);
      else if (c === 'E' && r === 'P') g += arrow(px[1], B, px[2], Tp) + arrow(px[4], Tp, px[5], B) + tee(px[3], BH, true);
      else if (c === 'X') g += [4, 2].map((p) => tee(px[p], 0, false)).join('') + [5, 1, 3].map((p) => tee(px[p], BH, true)).join('');
      else if (c === 'E' && r === 'E') g += arrow(px[4], Tp, px[5], B) + arrow(px[2], Tp, px[3], B) + tee(px[1], BH, true);
      else if (c === 'P' && r === 'P') g += `<path d="M${px[1]} ${B} V${BH / 2} H${px[4]} M${px[1]} ${BH / 2} H${px[2]}" stroke="currentColor" stroke-width="1.6" fill="none"/>` + arrow(px[4], BH / 2, px[4], Tp) + arrow(px[2], BH / 2, px[2], Tp) + tee(px[5], BH, true) + tee(px[3], BH, true);
    }
    return g;
  }
  const coilSym = (x, y, on, lab) => `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="22" height="26" fill="${on ? 'var(--power-bright)' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.5"/><path d="M2 24 L20 2" stroke="currentColor" stroke-width="1.5"/>${T(11, -5, 'Y' + lab, { z: 10, m: 1, b: 1, a: 'middle', f: on ? 'var(--power)' : 'var(--muted)' })}</g>`;
  const springSym = (x, y, w) => `<path d="M${x} ${y + 13} l${w / 6} -9 l${w / 6} 18 l${w / 6} -18 l${w / 6} 18 l${w / 6} -18 l${w / 6} 9" fill="none" stroke="currentColor" stroke-width="1.4"/>`;

  // ───────────── [[hw:valves]] ─────────────
  const CHECKS = [
    ['mono', '5/2 monostable: extend the cylinder, then cut the power. Watch it go back.'],
    ['bi', '5/2 bistable: pulse Y14, switch it off again. The cylinder stays out.'],
    ['half', '5/3 closed centre: stop the cylinder halfway.'],
    ['drop', 'Hang a vertical load on a 5/3 exhaust centre and stop it. Watch it fall.'],
    ['creep', '5/3 pressure centre: stop it in the middle and see it creep out.'],
    ['slow', 'Turn the flow control down and run a cylinder slowly.'],
    ['single', '3/2 NC: a single-acting cylinder goes out on air and back on its spring.'],
  ];
  LL.HW = LL.HW || {};
  LL.HW.valves = function (ph) {
    addCss();
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    const inp = { y14: false, y12: false, man: false, power: true, air: true, load: false, speed: 1 };
    let st = ValveSim.init('v52m'), mid = false;
    const box = document.createElement('div'); box.className = 'hw-box hw-vlv';
    box.innerHTML = `<div><div class="vlv-island" role="radiogroup" aria-label="Valve on the island">${ORDER.map((k) => `<button type="button" role="radio" class="vlv-slot" data-v="${k}" title="${esc(VALVES[k].name)}"><i></i><b>${VALVES[k].n}</b><span>${VALVES[k].sub}</span></button>`).join('')}</div><div class="vlv-plate"></div></div>
      <div class="vlv-svg"></div>
      <div class="vlv-ctl"><button class="btn" data-c="y14">Y14 coil</button><button class="btn" data-c="y12">Y12 coil</button><button class="btn" data-c="man" title="The yellow push button on the valve">Manual override (hold)</button>
        <button class="btn" data-c="power">Cut the power</button><button class="btn" data-c="air">Shut off the air</button><button class="btn" data-c="load">Vertical load</button>
        <label>Flow control <input type="range" min="10" max="100" value="100" data-c="speed"><span class="vlv-sp">100 %</span></label></div>
      <div class="vlv-say" aria-live="polite"></div>
      <div class="vlv-info"></div>
      <div class="vlv-sec"><span>Try these</span><span class="vlv-prog"></span></div><div class="vlv-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    const mark = (k) => { if (!done[k]) { done[k] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } checks(); } };
    function checks() { $('.vlv-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join(''); $('.vlv-prog').textContent = CHECKS.filter(([k]) => done[k]).length + ' / ' + CHECKS.length; }
    function pick(k) {
      st = ValveSim.init(k); inp.y14 = inp.y12 = inp.man = false; mid = false;
      if (k === 'v32no') st.x = 1;
      box.querySelectorAll('.vlv-slot').forEach((b) => { const on = b.dataset.v === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      const V = VALVES[k];
      $('[data-c="y12"]').hidden = V.coils.length < 2;
      $('[data-c="load"]').hidden = V.kind === 'nozzle'; if (V.kind === 'nozzle') inp.load = false;
      $('[data-c="speed"]').closest('label').hidden = V.kind === 'nozzle';
      $('.vlv-info').innerHTML = `<div><h4>${esc(V.n + ' ' + V.sub)}</h4><p>${esc(V.name)}. ${V.ports} ports, ${V.order.length} positions.</p></div><div><h4>Use it for</h4><p>${esc(V.use)}</p></div><div><h4>When the power fails</h4><p>${esc(V.loss)}</p></div><div><h4>In the PLC program</h4><p>${esc(V.plc)}</p></div>`;
      draw();
    }
    box.querySelectorAll('.vlv-slot').forEach((b) => b.addEventListener('click', () => pick(b.dataset.v)));
    box.querySelector('.vlv-island').addEventListener('keydown', (e) => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!d) return; const i = (ORDER.indexOf(st.type) + d + ORDER.length) % ORDER.length; pick(ORDER[i]); box.querySelector(`[data-v="${ORDER[i]}"]`).focus(); });
    const btn = (c) => $(`[data-c="${c}"]`);
    ['y14', 'y12', 'power', 'air', 'load'].forEach((c) => btn(c).addEventListener('click', () => {
      inp[c] = !inp[c];
      if (c === 'power' && !inp.power && st.type === 'v52m' && st.x > 0.9) mark('mono');
      if (c === 'y14' && !inp.y14 && st.type === 'v52b' && st.x > 0.9) mark('bi');
      if ((c === 'y14' || c === 'y12') && !inp.y14 && !inp.y12) { if (st.type === 'v53c' && st.x > 0.15 && st.x < 0.85) mark('half'); if (st.x > 0.1 && st.x < 0.9) mid = true; }
      draw();
    }));
    const man = btn('man');
    const hold = (on) => (e) => { e.preventDefault(); inp.man = on; draw(); };
    man.addEventListener('pointerdown', hold(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => man.addEventListener(ev, hold(false)));
    man.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') hold(true)(e); }); man.addEventListener('keyup', hold(false));
    $('[data-c="speed"]').addEventListener('input', (e) => { inp.speed = +e.target.value / 100; $('.vlv-sp').textContent = e.target.value + ' %'; });
    // ── the drawing
    function draw() {
      const V = VALVES[st.type], ch = st.ch || { cap: 'E', rod: 'P', out: 'E' };
      FS = Math.min(1.8, Math.max(1, 600 / (box.clientWidth || 640)));
      const vert = inp.load && V.kind !== 'nozzle';
      const order = V.order, k = order.indexOf(st.pos), nb = order.length;
      const vx = 320 - (nb * BW) / 2, vy = 250;                                    // valve body; the active box sits over the ports
      const shift = ((nb - 1) / 2 - k) * BW;                                       // boxes slide; the ports stay
      const portX = (p) => 320 - BW / 2 + PX[V.ports][p];
      let g = '';
      // supply: compressor / FRL symbol, line to port 1
      const sup = inp.air ? 'P' : 'E';
      g += `<g transform="translate(72 352)"><circle r="14" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><path d="M-6 6 L0 -7 L6 6 Z" fill="${inp.air ? AIRC : 'var(--muted)'}"/></g>` + T(72, 384, inp.air ? 'air 6 bar' : 'air OFF', { a: 'middle', z: 10, m: 1, f: inp.air ? AIRC : 'var(--danger)' });
      g += line(`M86 352 H${portX(1)} V${vy + BH}`, sup);
      // exhausts with silencers
      const exP = V.ports === 5 ? [5, 3] : V.ports === 3 ? [3] : [];
      exP.forEach((p) => { const x = portX(p), live = (V.ports === 5 && ((p === 5 && ch.cap === 'E') || (p === 3 && ch.rod === 'E'))) || (V.ports === 3 && ch.out === 'E'); g += `<path d="M${x} ${vy + BH} V${vy + BH + 18}" stroke="currentColor" stroke-width="1.6"/><rect x="${x - 6}" y="${vy + BH + 18}" width="12" height="16" fill="var(--surface-3)" stroke="currentColor" stroke-width="1.2"/>` + (live && Math.abs(st.v) > 0.01 ? `<circle class="vlv-puff"${phase(0.7)} cx="${x}" cy="${vy + BH + 40}" r="5" fill="var(--muted)" opacity=".6"/>` : '') ; });
      // the valve: boxes, actuators, port numbers
      g += `<g transform="translate(${vx} ${vy})"><g class="vlv-shift" style="transform: translateX(${shift}px)">`;
      order.forEach((key, i) => { g += `<g transform="translate(${i * BW} 0)">${boxSvg(V, key)}</g>`; });
      const left = 0, right = nb * BW, on14 = (inp.power && inp.y14) || inp.man, on12 = inp.power && inp.y12;
      g += coilSym(left - 24, 13, on14, '14') + `<rect x="${left - 34}" y="18" width="9" height="16" fill="${inp.man ? '#f2a900' : '#e9c46a'}" stroke="currentColor" stroke-width="1.2"/>`;
      if (V.coils.length > 1) g += coilSym(right + 2, 13, on12, '12');
      if (V.ret === 'spring') g += springSym(right, 13, 30);
      if (V.ret === 'centre') g += springSym(right + 28, 13, 22) + springSym(left - 60, 13, 22);
      g += '</g></g>';
      // port numbers (fixed)
      Object.keys(PX[V.ports]).forEach((p) => { const top = (V.ports === 5 && (p === '4' || p === '2')) || (V.ports < 5 && p === '2'); g += T(portX(p) + 4, top ? vy - 4 : vy + BH + 12, p, { z: 9, m: 1, f: 'var(--muted)' }); });
      // the actuator
      if (V.kind === 'nozzle') {
        const live = ch.out === 'P';
        g += line(`M${portX(2)} ${vy} V150 H360`, ch.out);
        g += `<path d="M360 142 L384 146 V154 L360 158 Z" fill="var(--surface-3)" stroke="currentColor" stroke-width="1.4"/>`;
        if (live) g += [0, 1, 2].map((i) => `<path class="vlv-flow" d="M388 ${146 + i * 4} L${430 + i * 6} ${138 + i * 12}" stroke="${AIRC}" stroke-width="2"/>`).join('');
        const px = 440 + st.x * 110;
        g += `<rect x="${px}" y="132" width="34" height="34" rx="3" fill="#e9a100" stroke="currentColor" stroke-width="1.2"/>` + T(px + 17, 182, 'part', { a: 'middle', z: 10 }) + `<path d="M420 166 H600" stroke="currentColor" stroke-width="1.5"/>` + T(372, 128, 'blow-off nozzle', { z: 10, a: 'middle', f: 'var(--muted)' });
      } else {
        // the cylinder: horizontal, or hanging down with a load (vertical). Local x runs along the stroke, local y across.
        const L = vert ? 150 : 220, D = 54, ROD = L - 20, ox = vert ? 520 : 200, oy = vert ? 20 : 80;
        const tf = (x, y) => (vert ? [ox + y, oy + x] : [ox + x, oy + y]);
        const xr = 20 + st.x * (L - 50), tip = xr + 10 + ROD;                   // piston and rod tip
        const rect = (x, y, w, h, attr) => { const p = tf(x, y), q = tf(x + w, y + h); return `<rect x="${Math.min(p[0], q[0]).toFixed(1)}" y="${Math.min(p[1], q[1]).toFixed(1)}" width="${Math.abs(q[0] - p[0]).toFixed(1)}" height="${Math.abs(q[1] - p[1]).toFixed(1)}" ${attr}/>`; };
        const tint = (c) => (c === 'P' ? `fill="color-mix(in srgb, ${AIRC} 30%, transparent)"` : 'fill="none"');
        g += rect(0, 0, L, D, 'fill="var(--surface-2)" stroke="currentColor" stroke-width="2"');
        g += rect(2, 2, xr - 2, D - 4, tint(V.kind === 'single' ? ch.out : ch.cap)) + (V.kind === 'double' ? rect(xr + 10, 2, L - xr - 12, D - 4, tint(ch.rod)) : '');
        if (V.kind === 'single') { const pts = Array.from({ length: 9 }, (_, i) => tf(xr + 12 + i * (L - xr - 16) / 8, D / 2 + (i % 2 ? -15 : 15))); g += `<path d="M${pts.map((q) => q.map((n) => n.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="currentColor" stroke-width="1.3"/>`; }
        g += rect(xr, 3, 10, D - 6, 'fill="#5d666b"') + rect(xr + 10, D / 2 - 6, ROD, 12, 'fill="#b3b9b5" stroke="currentColor" stroke-width="1.2"');
        if (vert) { g += rect(tip, -16, 30, D + 32, 'fill="#e9a100" stroke="currentColor" stroke-width="1.4"'); const c = tf(tip + 15, D / 2); g += T(c[0], c[1] + 4, 'load', { a: 'middle', z: 10, b: 1, f: '#161a1d' }); }
        const s = ValveSim.sensors(st), sy = vert ? D + 12 : -12;
        [[16, 'B1', s.b1], [L - 24, 'B2', s.b2]].forEach(([x, n, on]) => { const c = tf(x, sy); g += `<circle cx="${c[0]}" cy="${c[1]}" r="6" fill="${on ? 'var(--power-bright)' : 'var(--surface-3)'}" stroke="currentColor" stroke-width="1.2"/>` + T(vert ? c[0] + 10 : c[0], vert ? c[1] + 4 : c[1] - 10, n, { a: vert ? 'start' : 'middle', z: 10, m: 1, b: on, f: on ? 'var(--power)' : 'var(--muted)' }); });
        // tubes: port 4 to the piston side, port 2 to the rod side (single-acting: port 2 to the piston side)
        const capP = vert ? tf(8, 0) : tf(8, D), rodP = tf(L - 8, D);
        const capPath = vert ? `M${portX(V.kind === 'single' ? 2 : 4)} ${vy} V200 H${capP[0] - 20} V${capP[1]} H${capP[0]}` : `M${portX(V.kind === 'single' ? 2 : 4)} ${vy} V200 H${capP[0]} V${capP[1]}`;
        const rodPath = vert ? `M${portX(2)} ${vy} V222 H${rodP[0] + 30} V${rodP[1]} H${rodP[0]}` : `M${portX(2)} ${vy} V215 H${rodP[0]} V${rodP[1]}`;
        g += line(capPath, V.kind === 'single' ? ch.out : ch.cap);
        if (V.kind === 'double') {
          g += line(rodPath, ch.rod);
          const fc = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-5 -7 q5 7 0 14 M5 -7 q-5 7 0 14" fill="none" stroke="currentColor" stroke-width="1.1"/>${inp.speed < 1 ? `<path d="M-9 9 L9 -9" stroke="${AIRC}" stroke-width="1.5"/>` : ''}</g>`;
          g += vert ? fc(capP[0] - 20, capP[1] + 40) + fc(rodP[0] + 30, rodP[1] + 26) : fc(capP[0], capP[1] + 30) + fc(rodP[0], rodP[1] + 30);
        }
        const lab = tf(vert ? -8 : 0, vert ? D / 2 : -34);
        g += T(lab[0], lab[1] + (vert ? 0 : 0), V.kind === 'single' ? (vert ? 'spring return' : 'single-acting cylinder (spring return)') : (vert ? 'hanging load' : 'double-acting cylinder'), { z: 10, f: 'var(--muted)', a: vert ? 'middle' : 'start' });
      }
      if (st.both) g += T(440, 392, 'Both coils ON: never do this!', { a: 'middle', b: 1, f: 'var(--danger)', z: 12 });
      if (!inp.power) g += T(440, 376, 'POWER OFF: every coil is dead', { a: 'middle', b: 1, f: 'var(--danger)', z: 12 });
      $('.vlv-svg').innerHTML = `<svg viewBox="0 0 640 400" role="img" aria-label="${esc(VALVES[st.type].name)} driving a cylinder" style="color:var(--ink)">${g}</svg>`;
      // buttons and the status line
      btn('y14').classList.toggle('on', inp.y14); btn('y12').classList.toggle('on', inp.y12); btn('man').classList.toggle('on', inp.man);
      btn('power').classList.toggle('warn', !inp.power); btn('power').textContent = inp.power ? 'Cut the power' : 'Power back on';
      btn('air').classList.toggle('warn', !inp.air); btn('air').textContent = inp.air ? 'Shut off the air' : 'Air back on';
      btn('load').classList.toggle('on', inp.load);
      const s = ValveSim.sensors(st), falling = inp.load && st.v > 0.3 && !((inp.power && inp.y14) || inp.man), mv = falling ? 'FALLING: nothing holds the load' : st.v > 0.01 ? 'extending' : st.v < -0.01 ? 'retracting' : st.x >= 0.98 ? 'out (B2)' : st.x <= 0.02 ? 'back (B1)' : 'stopped at ' + Math.round(st.x * 100) + ' %';
      const say = $('.vlv-say');
      say.classList.toggle('bad', st.both || falling);
      say.textContent = V.kind === 'nozzle' ? `Valve in position "${st.pos}". ${ch.out === 'P' ? 'Air blows: the part is pushed away.' : 'Closed: no air.'}` : `Valve in position "${st.pos === 'mid' ? 'centre' : st.pos}" · cylinder ${mv} · B1 ${s.b1 ? 'ON' : 'off'} · B2 ${s.b2 ? 'ON' : 'off'}${st.both ? ' · both coils on: the valve does not know where to go' : ''}`;
      if (V.kind === 'single' && st.type === 'v32nc' && s.b2) mark('single-out');
      if (done['single-out'] && st.type === 'v32nc' && s.b1) mark('single');
      if (inp.speed < 0.5 && Math.abs(st.v) > 0.01 && V.kind === 'double') mark('slow');
      if (st.type === 'v53e' && inp.load && st.pos === 'mid' && st.v > 0.3) mark('drop');
      if (st.type === 'v53p' && st.pos === 'mid' && st.v > 0.05 && st.x > 0.1 && st.x < 0.95) mark('creep');
    }
    let last = 0, raf = 0;
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (!box.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t; NOW = t / 1000;
      const x0 = st.x, p0 = st.pos;
      ValveSim.step(st, inp, dt);
      if (st.x !== x0 || st.pos !== p0) draw();
    }
    checks(); pick('v52m'); raf = requestAnimationFrame(tick);
  };

  // ───────────── [[hw:airlogic]] ─────────────
  LL.HW.airlogic = function (ph) {
    addCss();
    const K = Object.keys(AIR); let cur = 'shuttle', a = false, b = false, knob = 0.5;
    const box = document.createElement('div'); box.className = 'hw-box hw-vlv';
    box.innerHTML = `<div class="air-pick" role="radiogroup" aria-label="Valve">${K.map((k) => `<button type="button" role="radio" data-k="${k}">${esc(AIR[k].name)}</button>`).join('')}</div>
      <div class="vlv-svg"></div><div class="vlv-ctl"><button class="btn" data-i="a"></button><button class="btn" data-i="b"></button><label class="air-knob">Knob <input type="range" min="10" max="100" value="50"></label></div>
      <div class="vlv-say" aria-live="polite"></div><div class="vlv-info"><div><h4>Use it for</h4><p class="air-use"></p></div></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    box.querySelectorAll('[data-k]').forEach((x) => x.addEventListener('click', () => { cur = x.dataset.k; a = b = false; draw(); }));
    $('[data-i="a"]').addEventListener('click', () => { a = !a; draw(); });
    $('[data-i="b"]').addEventListener('click', () => { b = !b; draw(); });
    $('.air-knob input').addEventListener('input', (e) => { knob = +e.target.value / 100; draw(); });
    function draw() {
      const E = AIR[cur], r = E.out(a, b, knob);
      FS = Math.min(1.5, Math.max(1, 480 / (box.clientWidth || 640)));
      box.querySelectorAll('[data-k]').forEach((x) => { const on = x.dataset.k === cur; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
      const bA = $('[data-i="a"]'), bB = $('[data-i="b"]');
      bA.textContent = E.inputs[0] + (a ? ': ON' : ': off'); bA.classList.toggle('on', a);
      bB.hidden = E.inputs.length < 2; bB.textContent = (E.inputs[1] || '') + (b ? ': ON' : ': off'); bB.classList.toggle('on', b);
      $('.air-knob').hidden = !E.knob;
      $('.air-use').textContent = E.use; $('.vlv-say').textContent = r.txt;
      const L = (d, on) => line(d, on ? 'P' : 'X', 3);
      let g = '';
      const body = `<rect x="250" y="70" width="140" height="80" rx="6" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.6"/>`;
      if (cur === 'shuttle' || cur === 'andv') {
        const out = r.y, bx = r.ball === 'l' ? 270 : r.ball === 'r' ? 370 : 320;
        g += body + L('M120 110 H250', a) + L('M390 110 H520', b) + L('M320 70 V20', out) + T(120, 100, 'X', { b: 1 }) + T(512, 100, 'Y', { b: 1 }) + T(332, 26, 'A (out)', { b: 1, f: out ? AIRC : 'var(--muted)' });
        g += cur === 'shuttle' ? `<circle cx="${bx}" cy="110" r="14" fill="#5d666b" stroke="currentColor"/>` + `<path d="M256 96 V124 M384 96 V124" stroke="currentColor" stroke-width="2"/>` : `<rect x="${bx - 30}" y="98" width="60" height="24" rx="4" fill="#5d666b" stroke="currentColor"/>`;
        g += `<circle cx="320" cy="14" r="9" fill="${out ? 'var(--power-bright)' : 'var(--surface-3)'}" stroke="currentColor"/>`;
        g += T(320, 180, cur === 'shuttle' ? 'X OR Y → A' : 'X AND Y → A', { a: 'middle', z: 14, b: 1 });
      } else if (cur === 'check' || cur === 'flow' || cur === 'quick') {
        const fl = r.flow;
        g += body + L('M100 110 H250', a || fl === 'rtl') + L('M390 110 H540', b || fl === 'ltr' || fl === 'dump');
        g += `<path d="M300 90 L340 110 L300 130 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="${fl === 'ltr' ? 352 : 336}" cy="110" r="11" fill="#5d666b" stroke="currentColor"/>`;
        if (cur === 'flow') g += `<path d="M270 160 q30 -22 60 0 M270 178 q30 22 60 0" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M262 196 L340 146" stroke="${AIRC}" stroke-width="1.8"/>` + T(360, 186, 'needle: ' + Math.round(knob * 100) + ' %', { z: 11, m: 1 });
        if (fl === 'ltr') g += arrow(430, 90, 500, 90); if (fl === 'rtl') g += arrow(500, 90, 430, 90);
        if (cur === 'quick') g += `<path d="M320 150 V190" stroke="currentColor" stroke-width="2"/><rect x="306" y="190" width="28" height="12" fill="var(--surface-3)" stroke="currentColor"/>` + (fl === 'dump' ? `<circle class="vlv-puff" cx="320" cy="214" r="9" fill="var(--muted)" opacity=".6"/>` : '') + T(100, 140, 'from valve', { z: 11 }) + T(540, 140, 'to cylinder', { z: 11, a: 'end' });
        else g += T(100, 140, cur === 'flow' ? 'valve side' : 'left', { z: 11 }) + T(540, 140, cur === 'flow' ? 'cylinder side' : 'right', { z: 11, a: 'end' });
        if (cur === 'flow' && fl !== 'none') g += T(320, 236, fl === 'rtl' ? `speed ${Math.round(r.fast * 100)} %` : 'full flow in', { a: 'middle', z: 14, b: 1, f: AIRC });
      } else if (cur === 'reg') {
        const bar = r.bar;
        g += body + L('M100 110 H250', a) + L('M390 110 H540', a && bar > 0) + `<path d="M300 150 V180 M285 180 H335" stroke="currentColor" stroke-width="2"/><circle cx="320" cy="194" r="10" fill="#5d666b"/>`;
        g += `<g transform="translate(470 60)"><circle r="34" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => { const ang = (-135 + i * 45) * Math.PI / 180; return `<path d="M${(26 * Math.sin(ang)).toFixed(1)} ${(-26 * Math.cos(ang)).toFixed(1)} L${(32 * Math.sin(ang)).toFixed(1)} ${(-32 * Math.cos(ang)).toFixed(1)}" stroke="currentColor"/>`; }).join('')}<path d="M0 0 L${(24 * Math.sin((-135 + bar * 45) * Math.PI / 180)).toFixed(1)} ${(-24 * Math.cos((-135 + bar * 45) * Math.PI / 180)).toFixed(1)}" stroke="var(--danger)" stroke-width="2.4"/>${T(0, 18, bar + ' bar', { a: 'middle', z: 10, m: 1, b: 1 })}</g>`;
        g += T(100, 140, 'supply 7 bar', { z: 11 }) + T(320, 230, 'turn the knob = the spring sets the outlet pressure', { a: 'middle', z: 11, f: 'var(--muted)' });
      }
      $('.vlv-svg').innerHTML = `<svg viewBox="60 0 520 250" role="img" aria-label="${esc(E.name)}" style="color:var(--ink)">${g}</svg>`;
    }
    draw();
  };

  // ───────────── [[hw:vacuum]] ─────────────
  LL.HW.vacuum = function (ph) {
    addCss();
    const o = { gen: false, blow: false, lift: false, mass: 2, cup: 30, leak: false, sw: 50 };
    const st = VacSim.init();
    const box = document.createElement('div'); box.className = 'hw-box hw-vlv';
    box.innerHTML = `<div class="vlv-svg"></div>
      <div class="vlv-ctl"><button class="btn" data-v="gen">Vacuum ON (Y1)</button><button class="btn" data-v="blow" title="Hold for a short blow-off pulse">Blow-off (hold)</button><button class="btn" data-v="lift">Lift the gripper</button><button class="btn" data-v="leak">Porous part / torn cup</button></div>
      <div class="vlv-ctl"><label>Part <input type="range" min="0.5" max="8" step="0.5" value="2" data-r="mass"><span data-o="mass">2 kg</span></label><label>Cup <select data-r="cup">${[20, 30, 40, 50, 60].map((d) => `<option value="${d}"${d === 30 ? ' selected' : ''}>${d} mm</option>`).join('')}</select></label><label>Vacuum switch at <input type="range" min="20" max="70" step="5" value="50" data-r="sw"><span data-o="sw">-50 kPa</span></label></div>
      <div class="vlv-say" aria-live="polite"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    ['gen', 'lift', 'leak'].forEach((k) => $(`[data-v="${k}"]`).addEventListener('click', () => { o[k] = !o[k]; if (k === 'gen' && !o.gen) st.msg = ''; draw(); }));
    const bl = $('[data-v="blow"]'), hold = (on) => (e) => { e.preventDefault(); o.blow = on; draw(); };
    bl.addEventListener('pointerdown', hold(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => bl.addEventListener(ev, hold(false)));
    bl.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') hold(true)(e); }); bl.addEventListener('keyup', hold(false));
    box.querySelectorAll('[data-r]').forEach((x) => x.addEventListener('input', () => { o[x.dataset.r] = +x.value; const out = $(`[data-o="${x.dataset.r}"]`); if (out) out.textContent = x.dataset.r === 'mass' ? x.value + ' kg' : '-' + x.value + ' kPa'; draw(); }));
    function draw() {
      FS = Math.min(1.8, Math.max(1, 600 / (box.clientWidth || 640)));
      const gx = 330, cy = 70 + st.y * 120, gripY = 210 - st.y * 120;            // cup height on screen: down at 210, up at 90
      const F = VacSim.force(st.vac, o.cup), vac = st.vac;
      let g = '';
      // supply → valve → venturi
      g += `<g transform="translate(60 300)"><circle r="13" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><path d="M-6 6 L0 -7 L6 6 Z" fill="${AIRC}"/></g>` + T(60, 330, 'air 6 bar', { a: 'middle', z: 10, m: 1, f: AIRC });
      g += line('M73 300 H130', 'P') + `<rect x="130" y="286" width="44" height="28" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/>` + T(152, 280, 'Y1', { a: 'middle', z: 10, m: 1, b: 1, f: o.gen ? 'var(--power)' : 'var(--muted)' }) + `<rect x="118" y="290" width="12" height="20" fill="${o.gen ? 'var(--power-bright)' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.2"/>`;
      g += line('M174 300 H210', o.gen ? 'P' : 'X');
      // venturi ejector: nozzle and diffuser, suction port up
      g += `<path d="M210 290 L240 296 L240 304 L210 310 Z M246 296 L290 286 L290 314 L246 304 Z" fill="var(--surface-3)" stroke="currentColor" stroke-width="1.4"/>` + T(250, 336, 'venturi ejector', { a: 'middle', z: 10, f: 'var(--muted)' });
      if (o.gen && !o.blow) g += `<circle class="vlv-puff"${phase(0.7)} cx="306" cy="300" r="7" fill="var(--muted)" opacity=".6"/>`;
      // blow-off line
      g += line(`M243 296 V${gripY + 10} H${gx - 40}`, o.blow ? 'P' : vac > 1 ? 'E' : 'X', 2);
      // the gripper: rod, vacuum switch, cup
      g += `<rect x="${gx - 6}" y="20" width="12" height="${gripY - 4}" fill="#b3b9b5" stroke="currentColor" stroke-width="1"/><rect x="${gx - 40}" y="${gripY}" width="80" height="20" rx="3" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.4"/>`;
      g += `<path d="M${gx - 22} ${gripY + 20} L${gx - 30} ${gripY + 40} H${gx + 30} L${gx + 22} ${gripY + 20} Z" fill="${o.leak ? 'color-mix(in srgb, var(--danger) 30%, var(--surface-3))' : 'var(--surface-3)'}" stroke="currentColor" stroke-width="1.4"/>`;
      g += `<circle cx="${gx + 60}" cy="${gripY + 10}" r="9" fill="${st.sw ? 'var(--power-bright)' : 'var(--surface-3)'}" stroke="currentColor"/>` + T(gx + 74, gripY + 14, 'vacuum switch → PLC: ' + (st.sw ? 'ON' : 'off'), { z: 10, m: 1, b: st.sw, f: st.sw ? 'var(--power)' : 'var(--muted)' });
      // the part
      const py = st.held ? gripY + 40 : 250;
      g += `<rect x="${gx - 50}" y="${py}" width="100" height="40" rx="3" fill="#e9a100" stroke="currentColor" stroke-width="1.4"/>` + T(gx, py + 25, o.mass + ' kg', { a: 'middle', z: 12, b: 1, f: '#161a1d' }) + `<path d="M300 290 H470" stroke="currentColor" stroke-width="1.5"/>`;
      // gauge
      const ang = (-135 + Math.min(1, vac / 90) * 270) * Math.PI / 180;
      g += `<g transform="translate(540 90)"><circle r="44" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/>${[0, 30, 60, 90].map((k) => { const a2 = (-135 + k / 90 * 270) * Math.PI / 180; return `<path d="M${(34 * Math.sin(a2)).toFixed(1)} ${(-34 * Math.cos(a2)).toFixed(1)} L${(42 * Math.sin(a2)).toFixed(1)} ${(-42 * Math.cos(a2)).toFixed(1)}" stroke="currentColor" stroke-width="1.5"/>`; }).join('')}<path d="M0 0 L${(32 * Math.sin(ang)).toFixed(1)} ${(-32 * Math.cos(ang)).toFixed(1)}" stroke="var(--danger)" stroke-width="2.6"/>${T(0, 30, '-' + Math.round(vac) + ' kPa', { a: 'middle', z: 11, m: 1, b: 1 })}</g>` + T(540, 150, 'vacuum gauge', { a: 'middle', z: 10, f: 'var(--muted)' });
      g += T(540, 186, 'holding force', { a: 'middle', z: 10, f: 'var(--muted)' }) + T(540, 206, Math.round(F) + ' N', { a: 'middle', z: 14, b: 1, m: 1 }) + T(540, 226, 'weight ' + Math.round(o.mass * 9.81) + ' N', { a: 'middle', z: 10, m: 1, f: 'var(--muted)' });
      $('.vlv-svg').innerHTML = `<svg viewBox="0 0 640 345" role="img" aria-label="Vacuum gripper" style="color:var(--ink)">${g}</svg>`;
      box.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', !!o[b.dataset.v]));
      $('[data-v="leak"]').classList.toggle('warn', o.leak); $('[data-v="leak"]').classList.remove('on');
      const say = $('.vlv-say');
      say.classList.toggle('bad', !!st.msg);
      say.textContent = st.msg || (st.held ? (o.lift ? 'Part lifted. The PLC keeps watching the vacuum switch while it moves.' : 'Part gripped. Vacuum switch ' + (st.sw ? 'ON: safe to lift.' : 'still off: do not lift yet.')) : o.gen ? 'Vacuum on, building up…' : 'Lower the cup onto the part and switch the vacuum on.');
    }
    let last = 0, raf = 0, sig = '';
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (!box.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t; NOW = t / 1000;
      VacSim.step(st, o, dt);
      const s2 = [Math.round(st.vac), st.y.toFixed(2), st.held, st.dropped, st.sw, st.msg].join();
      if (s2 !== sig) { sig = s2; draw(); }
    }
    draw(); raf = requestAnimationFrame(tick);
  };

  // ───────────── [[hw:pdraw]]: read a pneumatic drawing, then find the fault on it ─────────────
  LL.HW.pdraw = function (ph) {
    addCss();
    let sel = '', mode = 'read', fi = 0, score = 0, answered = false;
    const box = document.createElement('div'); box.className = 'hw-box hw-vlv';
    box.innerHTML = `<div class="air-pick" role="radiogroup" aria-label="Mode"><button type="button" data-m="read">Read the drawing</button><button type="button" data-m="find">Find the fault</button></div><div class="vlv-svg"></div><div class="vlv-say" aria-live="polite"></div><div class="pd-next"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    box.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.m; sel = ''; fi = 0; score = 0; answered = false; draw(); }));
    // component positions: [x, y, w, h] hit boxes on the drawing
    const HIT = { '0Z1': [30, 300, 70, 40], '0V1': [120, 300, 70, 40], '1V1': [150, 196, 120, 46], '1V2': [236, 120, 40, 40], '1V3': [140, 120, 40, 40], '1A1': [130, 40, 180, 50], '1B1': [140, 14, 30, 22], '1B2': [270, 14, 30, 22], '2V1': [400, 196, 170, 46], '2A1': [420, 40, 180, 50] };
    function draw() {
      FS = Math.min(1.6, Math.max(1, 560 / (box.clientWidth || 640)));
      const P = PDRAW.parts, sym = (id) => (sel === id ? 'var(--info)' : 'currentColor');
      let g = '';
      // supply group
      g += `<rect x="36" y="306" width="58" height="28" fill="var(--surface)" stroke="${sym('0Z1')}" stroke-width="1.6"/><circle cx="65" cy="320" r="8" fill="none" stroke="${sym('0Z1')}"/>` + T(65, 352, '0Z1', { a: 'middle', z: 11, m: 1, b: 1 });
      g += `<rect x="126" y="306" width="29" height="28" fill="var(--surface)" stroke="${sym('0V1')}" stroke-width="1.6"/><rect x="155" y="306" width="29" height="28" fill="var(--surface)" stroke="${sym('0V1')}" stroke-width="1.6"/>` + T(155, 352, '0V1', { a: 'middle', z: 11, m: 1, b: 1 });
      g += `<path d="M94 320 H126 M184 320 H540 M210 320 V242 M480 320 V242" stroke="currentColor" stroke-width="1.6" fill="none"/>`;
      // circuit 1
      g += `<rect x="156" y="200" width="54" height="40" fill="var(--surface)" stroke="${sym('1V1')}" stroke-width="1.6"/><rect x="210" y="200" width="54" height="40" fill="var(--surface)" stroke="${sym('1V1')}" stroke-width="1.6"/><rect x="138" y="208" width="18" height="24" fill="var(--surface)" stroke="${sym('1V1')}"/><path d="M140 230 L154 210" stroke="${sym('1V1')}"/>` + T(274, 226, '1V1', { z: 11, m: 1, b: 1 }) + T(146, 254, '1M1', { a: 'middle', z: 9, m: 1, f: 'var(--muted)' });
      g += `<path d="M228 200 V160 M246 200 V176 H256 V160" stroke="currentColor" stroke-width="1.6" fill="none"/>`;
      g += `<path d="M160 160 V96 M256 160 V96" stroke="currentColor" stroke-width="1.6"/>` + `<path d="M228 160 H160" stroke="currentColor" stroke-width="1.6"/>`;
      [['1V3', 160], ['1V2', 256]].forEach(([id, x]) => { g += `<g transform="translate(${x} 140)"><rect x="-14" y="-16" width="28" height="32" fill="var(--surface)" stroke="${sym(id)}" stroke-width="1.4"/><path d="M-5 -10 q5 10 0 20 M5 -10 q-5 10 0 20" fill="none" stroke="${sym(id)}"/><path d="M-10 10 L10 -10" stroke="${sym(id)}"/></g>` + T(x + (id === '1V3' ? -20 : 20), 144, id, { z: 11, m: 1, b: 1, a: id === '1V3' ? 'end' : 'start' }); });
      g += `<rect x="136" y="46" width="170" height="40" fill="var(--surface)" stroke="${sym('1A1')}" stroke-width="1.8"/><path d="M200 50 V82 M200 66 H330" stroke="${sym('1A1')}" stroke-width="3"/>` + T(320, 60, '1A1', { z: 11, m: 1, b: 1 });
      [['1B1', 155], ['1B2', 285]].forEach(([id, x]) => { g += `<rect x="${x - 10}" y="18" width="20" height="14" fill="var(--surface)" stroke="${sym(id)}" stroke-width="1.4"/><path d="M${x} 32 V46" stroke="${sym(id)}" stroke-dasharray="2 2"/>` + T(x, 12, id, { a: 'middle', z: 10, m: 1, b: 1 }); });
      // circuit 2
      g += [0, 1, 2].map((k) => `<rect x="${420 + k * 46}" y="200" width="46" height="40" fill="var(--surface)" stroke="${sym('2V1')}" stroke-width="1.6"/>`).join('') + `<rect x="402" y="208" width="18" height="24" fill="var(--surface)" stroke="${sym('2V1')}"/><rect x="558" y="208" width="18" height="24" fill="var(--surface)" stroke="${sym('2V1')}"/>` + T(490, 260, '2V1', { a: 'middle', z: 11, m: 1, b: 1 }) + T(411, 254, '2M1', { a: 'middle', z: 9, m: 1, f: 'var(--muted)' }) + T(567, 254, '2M2', { a: 'middle', z: 9, m: 1, f: 'var(--muted)' });
      g += `<path d="M478 200 V96 M502 200 V96" stroke="currentColor" stroke-width="1.6"/><rect x="430" y="46" width="170" height="40" fill="var(--surface)" stroke="${sym('2A1')}" stroke-width="1.8"/><path d="M470 50 V82 M470 66 H620" stroke="${sym('2A1')}" stroke-width="3"/>` + T(600, 40, '2A1', { z: 11, m: 1, b: 1, a: 'end' });
      // hit boxes
      g += Object.keys(HIT).map((id) => { const [x, y, w, h] = HIT[id]; return `<rect class="pd-hit" data-id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${sel === id ? 'color-mix(in srgb, var(--info) 14%, transparent)' : 'transparent'}" stroke="${sel === id ? 'var(--info)' : 'none'}" stroke-dasharray="4 3" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(id + ': ' + P[id][0])}"/>`; }).join('');
      $('.vlv-svg').innerHTML = `<svg viewBox="0 0 640 362" role="img" aria-label="Pneumatic drawing with two circuits" style="color:var(--ink)">${g}</svg>`;
      box.querySelectorAll('[data-m]').forEach((b) => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      box.querySelectorAll('.pd-hit').forEach((r) => { const go = () => pick(r.dataset.id); r.addEventListener('click', go); r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
      const say = $('.vlv-say'), next = $('.pd-next');
      say.classList.remove('bad'); next.innerHTML = '';
      if (mode === 'read') say.innerHTML = sel ? `<b>${esc(sel)}: ${esc(P[sel][0])}.</b> ${esc(P[sel][1])}` : 'Tap any part of the drawing. The name tells you the circuit (the first number), the kind of part (the letter) and which one (the last number).';
      else {
        const f = PDRAW.faults[fi];
        if (!f) { say.innerHTML = `<b>Done: ${score} of ${PDRAW.faults.length} right on the first try.</b> On a real machine the drawing is how you find the part to check.`; next.innerHTML = '<button class="btn" type="button">Again</button>'; next.firstChild.onclick = () => { fi = 0; score = 0; sel = ''; answered = false; draw(); }; return; }
        say.innerHTML = `<b>Fault ${fi + 1} of ${PDRAW.faults.length}:</b> ${esc(f.q)} <span class="muted">Tap the part you check first.</span>` + (sel ? `<br>${sel === f.a ? '<b style="color:var(--power)">Right.</b>' : `<b style="color:var(--danger)">Not ${esc(sel)}.</b>`} ${sel === f.a ? esc(f.why) : 'Try again.'}` : '');
        if (sel && sel !== f.a) say.classList.add('bad');
        if (sel === f.a) { next.innerHTML = '<button class="btn primary" type="button">Next fault</button>'; next.firstChild.onclick = () => { fi++; sel = ''; answered = false; draw(); }; }
      }
    }
    function pick(id) {
      if (mode === 'find') { const f = PDRAW.faults[fi]; if (!f) return; if (!answered) { answered = true; if (id === f.a) score++; } }
      sel = id; draw();
    }
    draw();
  };
})(typeof window !== 'undefined' ? window : globalThis);
