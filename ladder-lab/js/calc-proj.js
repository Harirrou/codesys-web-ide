/* PLC Start — project calculators and the moving pictures of the calculators.
 * Part 1: the group "Projects": whole jobs from industry (fill a tank, pump pit, drain, pipe, valve, dosing,
 *         filling by weight, compressed air, conveyor line, winder, cooling, main supply…).
 * Part 2: pictures for calculators of js/calc.js (tank, conveyor, gearbox, axis move, cylinder, cable, 4–20 mA…).
 * A picture is pic(values, x, result) → { svg, cap, still, run(elements, seconds) }. The page keeps the clock,
 * run() only moves the parts marked with data-i. Pictures run faster than real time: the text in them shows the real time. */
(function () {
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const LL = ROOT.LL, C = LL && LL.Calc;
  if (!C) return;
  const { F, N, S, E, esc, nextStd, STD_MOTOR, AMP, CSA } = C._h;
  const PI = Math.PI, G = 9.81, SQ3 = Math.sqrt(3);
  const add = C.add;
  const DN = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 400];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // friction factor of a pipe (roughness 0.05 mm): laminar 64 / Re, else the Swamee–Jain formula
  function fric(v, D, nu) {
    const Re = v * D / nu;
    if (!(Re > 1)) return { Re: 0, f: 0 };
    if (Re < 2300) return { Re, f: 64 / Re };
    return { Re, f: 0.25 / Math.pow(Math.log10(0.00005 / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2) };
  }
  // minutes as text
  const tm = (min) => (!isFinite(min) ? '—' : min < 2 ? F(min * 60, 0) + ' s' : min < 120 ? F(min, 1) + ' min' : F(min / 60, 1) + ' h');

  // ───────────── picture helpers ─────────────
  const svg = (label, body, h) => `<svg class="cx-svg" viewBox="0 0 360 ${h || 180}" role="img" aria-label="${esc(label)}">${body}</svg>`;
  const tx = (x, y, s, o) => `<text x="${x}" y="${y}"${o ? ' ' + o : ''}>${esc(s)}</text>`;
  const dyn = (i, x, y, o) => `<text data-i="${i}" x="${x}" y="${y}"${o ? ' ' + o : ''}></text>`;
  const pipe = (d, i, cls) => `<path class="pp" d="${d}"/><path class="fl${cls ? ' ' + cls : ''}" data-i="${i}" d="${d}"/>`;
  const A = (el, k, val) => el.setAttribute(k, typeof val === 'number' ? val.toFixed(1) : val);
  const flow = (el, t, sp, on) => { el.style.strokeDashoffset = String(-((t * sp) % 16)); el.style.opacity = on === false ? '0.15' : '1'; };
  const lp = (t, d, hold) => Math.min(1, (t % (d + hold)) / d); // 0 → 1 in d seconds, then wait
  const level = (el, bottom, h) => { A(el, 'y', bottom - h); A(el, 'height', Math.max(0, h)); };
  const MID = 'text-anchor="middle"', END = 'text-anchor="end"';

  // ═════════════ Projects ═════════════
  add({
    id: 'fill', g: 'proj', lv: 2, t: 'Fill a tank: pump, pipe and time', d: 'The pump, the pipe and the motor to fill a tank in a given time, or the time with the pump you have.', key: 'fill tank pump size pipe diameter fill time transfer flow l/min',
    f: [S('m', 'What do you want to find?', [['p', 'The pump for a fill time'], ['t', 'The fill time with my pump']], 'p'),
      S('sh', 'Tank', [['v', 'I know the volume'], ['r', 'Round standing tank'], ['b', 'Box tank']], 'v'),
      N('vol', 'Volume to fill', 'l', 5000, { show: (v) => v.sh === 'v' }), N('d', 'Diameter', 'm', 2, { show: (v) => v.sh === 'r' }), N('w', 'Width', 'm', 1.5, { show: (v) => v.sh === 'b' }), N('l', 'Length', 'm', 2, { show: (v) => v.sh === 'b' }), N('h', 'Height to fill', 'm', 1.6, { show: (v) => v.sh !== 'v' }),
      N('t', 'Fill time you want', 'min', 10, { show: (v) => v.m === 'p' }), N('q', 'Flow of my pump', 'l/min', 300, { show: (v) => v.m === 't' }),
      N('out', 'Flow that leaves the tank while filling', 'l/min', 0), N('lift', 'Height the pump must lift', 'm', 6), N('pl', 'Pipe length', 'm', 30)],
    run(v) {
      const V = v.sh === 'v' ? v.vol : v.sh === 'r' ? PI * v.d * v.d / 4 * v.h * 1000 : v.w * v.l * v.h * 1000;
      if (!(V > 0)) return E('The volume must be above 0.');
      let Q, time;
      if (v.m === 'p') { if (!(v.t > 0)) return E('The fill time must be above 0.'); Q = V / v.t + Math.max(0, v.out); time = v.t; }
      else { const net = v.q - Math.max(0, v.out); if (!(net > 0)) return E('The pump is not bigger than the flow that leaves: the tank never fills.'); Q = v.q; time = V / net; }
      const qs = Q / 60000, dneed = Math.sqrt(4 * qs / (PI * 2)) * 1000, dn = nextStd(DN, dneed);
      if (!dn) return E('This needs a pipe bigger than DN 400. Use more than one pump and ask a piping engineer.');
      const D = dn / 1000, vel = qs / (PI * D * D / 4), fr = fric(vel, D, 1e-6), hf = fr.f * Math.max(0, v.pl) / D * vel * vel / (2 * G) * 1.3;
      const head = Math.max(0, v.lift) + hf, ps = 1000 * G * qs * head / 1000 / 0.6, mot = nextStd(STD_MOTOR, ps * 1.15);
      const r = [v.m === 'p' ? ['Pump flow needed', F(Q, 0), 'l/min', 'big'] : ['Fill time', tm(time), '', 'big'], ['Flow in m³/h', F(Q * 0.06, 1), 'm³/h'], ['Volume to fill', F(V, 0), 'l'], ['Pipe size', 'DN ' + dn, ''], ['Speed in the pipe', F(vel, 2), 'm/s'],
        ['Pump head (lift + loss in the pipe)', F(head, 1), 'm'], ['Pump motor, about', mot ? F(mot) : 'more than 250', 'kW']];
      if (v.sh !== 'v') r.push(['The level rises', F(v.h / time * 1000 / 60, 1), 'mm/s']);
      return { r, x: { V, Q, time },
        how: [v.m === 'p' ? `Flow = volume ÷ time${v.out > 0 ? ' + flow that leaves' : ''} = ${F(V, 0)} ÷ ${F(v.t)}${v.out > 0 ? ' + ' + F(v.out) : ''} = ${F(Q, 0)} l/min` : `Time = volume ÷ (pump − flow that leaves) = ${F(V, 0)} ÷ ${F(Q - Math.max(0, v.out), 0)} = ${F(time, 1)} min`,
          `Pipe for about 2 m/s: d = √(4 × Q ÷ (π × 2)) = ${F(dneed, 0)} mm → DN ${dn}`, `Loss in the pipe = ${F(hf, 2)} m (with 30 % for bends and valves). Head = ${F(v.lift)} + ${F(hf, 2)} = ${F(head, 1)} m`,
          `Motor = ρ × g × Q × H ÷ pump efficiency 0.6 = ${F(ps, 2)} kW, + 15 %, next size`],
        warn: time < 1 ? ['Less than one minute: the level moves very fast. Close the valve early, or the tank runs over (see “Filling by weight” for the same idea).'] : [] };
    },
    pic(v, x) {
      return { still: 4, cap: 'The picture runs faster than real time. The clock in it shows the real time.',
        svg: svg('A pump fills a tank', pipe('M14 150 H196 V22 H262 V44', 'f') + '<circle class="bd" cx="70" cy="150" r="17"/><path class="gn" data-i="imp" d="M70 138 L80 156 L60 156 Z"/>'
          + '<rect class="bd" x="232" y="44" width="104" height="122"/><rect class="wa" data-i="w" x="233" y="165" width="102" height="0"/>' + (v.out > 0 ? pipe('M336 158 H356', 'o') : '')
          + tx(70, 126, 'pump', MID + ' class="tm"') + dyn('t1', 14, 30, 'class="t2"') + dyn('t2', 14, 48) + dyn('t3', 14, 64, 'class="tm"')),
        run(e, t) {
          const p = lp(t, 6, 1.5), on = p < 1;
          level(e.w, 165, 108 * p); flow(e.f, t, 60, on); if (e.o) flow(e.o, t, 30);
          A(e.imp, 'transform', 'rotate(' + (on ? (t * 300) % 360 : 0).toFixed(0) + ' 70 150)');
          e.t1.textContent = on ? tm(p * x.time) : 'FULL after ' + tm(x.time); e.t2.textContent = F(p * x.V, 0) + ' l in the tank'; e.t3.textContent = 'pump: ' + F(x.Q, 0) + ' l/min';
        } };
    },
    tips: ['About 2 m/s is a good speed in a pressure pipe. Use a bigger pipe on the suction side of the pump (about 1 m/s).', 'The pump must be chosen from its curve at this flow and this head. The motor size here is a first guess.', 'In the PLC: stop the pump from a level sensor, and add a separate high-high level switch that stops it too.', 'A flow that leaves while you fill makes the fill longer: the net flow is pump minus outflow.'],
  });
  add({
    id: 'drain', g: 'proj', lv: 2, t: 'Empty a tank by gravity', d: 'How long a tank takes to run empty through a hole or a valve at the bottom.', key: 'drain time gravity empty tank outlet Torricelli discharge',
    f: [N('d', 'Tank diameter', 'm', 2), N('h', 'Level above the outlet at the start', 'm', 2), N('h2', 'Level at the end', 'm', 0), N('dn', 'Inside diameter of the outlet', 'mm', 50), N('cd', 'Outlet factor (0.6 sharp hole, 0.8 short pipe)', '', 0.6)],
    run(v) {
      if (!(v.d > 0 && v.h > 0 && v.dn > 0 && v.cd > 0)) return E('Diameter, level, outlet and factor must be above 0.');
      if (!(v.h2 >= 0 && v.h2 < v.h)) return E('The level at the end must be lower than at the start, and not below 0.');
      const At = PI * v.d * v.d / 4, a = PI * v.dn * v.dn / 4e6, k = 2 * At / (v.cd * a * Math.sqrt(2 * G)), t = k * (Math.sqrt(v.h) - Math.sqrt(v.h2));
      const q0 = v.cd * a * Math.sqrt(2 * G * v.h) * 60000, q1 = v.cd * a * Math.sqrt(2 * G * v.h2) * 60000, th = k * (Math.sqrt(v.h) - Math.sqrt((v.h + v.h2) / 2));
      return { r: [['Time to drain', tm(t / 60), '', 'big'], ['Flow at the start', F(q0, 0), 'l/min'], ['Flow at the end', F(q1, 0), 'l/min'], ['Half of the volume is out after', tm(th / 60), ''], ['Volume that runs out', F(At * (v.h - v.h2) * 1000, 0), 'l'], ['Speed of the jet at the start', F(Math.sqrt(2 * G * v.h), 1), 'm/s']],
        x: { t: t / 60 },
        how: [`Speed out = √(2 × g × level) = √(2 × 9.81 × ${F(v.h)}) = ${F(Math.sqrt(2 * G * v.h), 2)} m/s`, `Flow = factor × outlet area × speed = ${F(v.cd)} × ${F(a * 1e6, 0)} mm² × ${F(Math.sqrt(2 * G * v.h), 2)} = ${F(q0, 0)} l/min`,
          `Time = 2 × tank area ÷ (factor × outlet area × √(2g)) × (√start − √end) = ${F(t, 0)} s`] };
    },
    pic(v, x) {
      return { still: 2, cap: 'The level falls fast at first and slowly at the end: less level means less pressure at the outlet.',
        svg: svg('A tank runs empty through the outlet', '<rect class="bd" x="60" y="22" width="150" height="130"/><rect class="wa" data-i="w" x="61" y="151" width="148" height="0"/><path class="pp" d="M210 146 H222"/><path class="fl" data-i="j" d="M222 146"/>'
          + '<path class="s" d="M20 172 H340"/>' + dyn('t1', 240, 40, 'class="t2"') + dyn('t2', 240, 58) + dyn('t3', 240, 74, 'class="tm"')),
        run(e, t) {
          const p = lp(t, 6, 1.5), sq = Math.sqrt(v.h) - (Math.sqrt(v.h) - Math.sqrt(v.h2)) * p, h = sq * sq, len = 8 + 70 * Math.sqrt(h / v.h);
          level(e.w, 151, 124 * h / v.h); A(e.j, 'd', h > 0.001 ? `M222 146 Q${(222 + len).toFixed(1)} 146 ${(222 + len).toFixed(1)} 172` : 'M222 146'); flow(e.j, t, 60, p < 1 || v.h2 > 0);
          e.t1.textContent = tm(p * x.t); e.t2.textContent = 'level ' + F(h, 2) + ' m'; e.t3.textContent = F(v.cd * PI * v.dn * v.dn / 4e6 * Math.sqrt(2 * G * h) * 60000, 0) + ' l/min';
        } };
    },
    tips: ['Half the level gives only 71 % of the flow: the last part always takes the longest.', 'A long drain pipe or a valve that is not fully open makes it slower: use a smaller factor.', 'In the PLC: do not wait for a fixed time. Use a low level switch, and a timer only as a watchdog alarm.'],
  });
  add({
    id: 'sump', g: 'proj', lv: 2, t: 'Pump pit: levels and starts per hour', d: 'How far apart the start and stop levels must be so the pump does not start too often.', key: 'sump pit lift station level switches pump starts per hour hysteresis on off level float',
    f: [N('qin', 'Flow coming in', 'l/min', 120), N('qp', 'Pump flow', 'l/min', 300), N('z', 'Most starts allowed per hour', '', 10), N('a', 'Area of the pit or tank', 'm²', 2)],
    run(v) {
      if (!(v.qp > 0 && v.z > 0 && v.a > 0 && v.qin >= 0)) return E('Pump flow, starts and area must be above 0.');
      const V = v.qp * (60 / v.z) / 4, over = v.qin >= v.qp, tf = v.qin > 0 ? V / v.qin : Infinity, tp = over ? Infinity : V / (v.qp - v.qin), st = isFinite(tf + tp) ? 60 / (tf + tp) : 0;
      return { r: [['Volume between the stop and the start level', F(V, 0), 'l', 'big'], ['Distance between the two levels', F(V / v.a, 0), 'mm'], ['Starts per hour with this inflow', over ? 'never stops' : F(st, 1), '', over ? 'bad' : 'ok'], ['Filling time (pump off)', tm(tf), ''], ['Pumping time (pump on)', tm(tp), ''], ['Worst inflow for the starts', F(v.qp / 2, 0), 'l/min']],
        x: { tf, tp, over },
        how: [`Shortest cycle allowed = 60 ÷ starts = ${F(60 / v.z, 1)} min`, `Volume = pump flow × cycle ÷ 4 = ${F(v.qp)} × ${F(60 / v.z, 1)} ÷ 4 = ${F(V, 0)} l`, `Distance = volume ÷ area = ${F(V / 1000, 3)} m³ ÷ ${F(v.a)} m² = ${F(V / v.a, 0)} mm`,
          over ? 'The inflow is not smaller than the pump flow.' : `With ${F(v.qin)} l/min in: fill ${F(tf, 2)} min + pump ${F(tp, 2)} min = ${F(tf + tp, 2)} min`],
        warn: over ? ['The pump is too small for this inflow: the level keeps rising. Use a bigger pump or a second one.'] : [] };
    },
    pic(v, x) {
      return { still: 2, cap: 'The pump starts at the upper level and stops at the lower one. A bigger distance means fewer starts.',
        svg: svg('A pit with a start level, a stop level and a pump', pipe('M14 46 H128 V62', 'fi') + '<path class="bd" d="M110 34 V164 H250 V34"/><rect class="wa" data-i="w" x="111" y="163" width="138" height="0"/>'
          + '<path class="s1" d="M110 70 H250"/><path class="s1" d="M110 130 H250"/>' + tx(256, 74, 'START level') + tx(256, 134, 'STOP level') + pipe('M232 152 V18 H348', 'fo') + '<circle data-i="lamp" class="mu" cx="232" cy="152" r="9"/>'
          + dyn('t1', 14, 100, 'class="t2"') + dyn('t2', 14, 118) + dyn('t3', 14, 134, 'class="tm"')),
        run(e, t) {
          let y, on;
          if (x.over) { y = 130 - 92 * Math.min(1, (t % 8) / 5); on = true; }
          else if (!(v.qin > 0)) { y = 130; on = false; }
          else { const sf = clamp(x.tf / (x.tf + x.tp), 0.15, 0.85), c = (t % 6) / 6; on = c >= sf; y = on ? 70 + 60 * ((c - sf) / (1 - sf)) : 130 - 60 * (c / sf); }
          level(e.w, 163, 163 - y); flow(e.fi, t, 40, v.qin > 0); flow(e.fo, t, 70, on); A(e.lamp, 'class', on ? 'gn' : 'mu');
          e.t1.textContent = on ? 'PUMP ON' : 'PUMP OFF'; e.t2.textContent = x.over ? 'level still rises' : !(v.qin > 0) ? 'no inflow' : on ? 'for ' + tm(x.tp) : 'for ' + tm(x.tf); e.t3.textContent = F(v.qin, 0) + ' l/min in';
        } };
    },
    tips: ['Most starts happen when the inflow is half of the pump flow. That is the case the formula uses.', 'Typical limits: about 10 to 15 starts per hour for a small motor started direct, fewer for a big one. Check the motor datasheet.', 'With two pumps, change the duty pump at every start: each one then starts half as often.', 'Add a high-high level alarm above the start level and a dry-run protection below the stop level.'],
  });
  add({
    id: 'pipe', g: 'proj', lv: 2, t: 'Pipe size, speed and pressure loss', d: 'The pipe for a flow, the speed in it and the pressure lost along the pipe.', key: 'pipe diameter DN velocity pressure drop friction head loss Reynolds',
    f: [N('q', 'Flow', 'm³/h', 20), S('pick', 'Pipe size', [['auto', 'Choose it for me']].concat(DN.map((d) => [String(d), 'DN ' + d])), 'auto'), N('vt', 'Speed you want (water: 1 to 2.5)', 'm/s', 2, { show: (v) => v.pick === 'auto' }),
      N('len', 'Pipe length', 'm', 50), S('fl', 'Liquid', [['w', 'Water, 20 °C'], ['h', 'Water, 80 °C'], ['o', 'Light oil']], 'w')],
    run(v) {
      const L = { w: [998, 1.0e-6], h: [972, 0.37e-6], o: [870, 3.0e-5] }[v.fl];
      if (!(v.q > 0)) return E('The flow must be above 0.');
      const qs = v.q / 3600;
      let dn = +v.pick;
      if (v.pick === 'auto') { if (!(v.vt > 0)) return E('The speed must be above 0.'); dn = nextStd(DN, Math.sqrt(4 * qs / (PI * v.vt)) * 1000); if (!dn) return E('This needs a pipe bigger than DN 400.'); }
      const D = dn / 1000, vel = qs / (PI * D * D / 4), fr = fric(vel, D, L[1]), dp = fr.f * Math.max(0, v.len) / D * L[0] * vel * vel / 2;
      const w = [];
      if (vel > 3) w.push('More than 3 m/s: noise, wear and water hammer when a valve closes fast. Take a bigger pipe.');
      else if (vel < 0.5) w.push('Less than 0.5 m/s: dirt can settle and the pipe is bigger (and dearer) than needed.');
      return { r: [['Pipe size', 'DN ' + dn, '', 'big'], ['Speed in the pipe', F(vel, 2), 'm/s', vel > 3 ? 'bad' : 'ok'], ['Pressure loss over ' + F(v.len) + ' m', F(dp / 1e5, 3), 'bar'], ['The same as head', F(dp / (L[0] * G), 2), 'm'], ['Kind of flow', fr.Re < 2300 ? 'smooth (laminar)' : 'turbulent', ''], ['Flow in l/min', F(v.q * 1000 / 60, 0), 'l/min']],
        x: { vel, dn, dp: dp / 1e5 },
        how: [v.pick === 'auto' ? `d = √(4 × Q ÷ (π × v)) = √(4 × ${F(qs, 5)} ÷ (3.1416 × ${F(v.vt)})) = ${F(Math.sqrt(4 * qs / (PI * v.vt)) * 1000, 0)} mm → DN ${dn}` : `Area of DN ${dn} = ${F(PI * D * D / 4 * 1e6, 0)} mm²`,
          `Speed = flow ÷ area = ${F(qs, 5)} m³/s ÷ ${F(PI * D * D / 4, 5)} m² = ${F(vel, 2)} m/s`, `Loss = f × L ÷ D × ρ × v² ÷ 2, with f = ${F(fr.f, 4)} → ${F(dp / 1e5, 3)} bar`], warn: w };
    },
    pic(v, x) {
      const th = clamp(4 + x.dn / 12, 6, 30);
      return { still: 1, cap: 'Faster flow in the same pipe loses much more pressure: double the speed, four times the loss.',
        svg: svg('Flow in a pipe with the pressure before and after', `<path d="M30 92 H330" style="fill:none;stroke:currentColor;opacity:.16;stroke-width:${th.toFixed(0)}"/><path class="fl" data-i="f" d="M30 92 H330"/>`
          + '<circle class="bd" cx="50" cy="50" r="16"/><circle class="bd" cx="310" cy="50" r="16"/><path class="s" d="M50 66 V86 M310 66 V86"/><path class="ac" data-i="n1" d="M50 50 L50 38"/><path class="ac" data-i="n2" d="M310 50 L310 38"/>'
          + tx(50, 24, 'before', MID + ' class="tm"') + tx(310, 24, 'after', MID + ' class="tm"') + tx(180, 50, 'loss ' + F(x.dp, 3) + ' bar', MID + ' class="t2"') + tx(180, 130, 'DN ' + x.dn + '   ' + F(x.vel, 2) + ' m/s', MID) + tx(180, 148, F(v.len) + ' m of pipe', MID + ' class="tm"')),
        run(e, t) {
          flow(e.f, t, clamp(25 + 35 * x.vel, 25, 220));
          const k = Math.min(1, t / 1.2), a2 = 60 - clamp(x.dp * 60, 0, 110) * k;
          A(e.n1, 'transform', 'rotate(60 50 50)'); A(e.n2, 'transform', 'rotate(' + a2.toFixed(0) + ' 310 50)');
        } };
    },
    tips: ['Good speeds for water: 1 to 2.5 m/s in a pressure pipe, 0.5 to 1 m/s on the suction side of a pump.', 'Bends, valves and filters add loss: add 20 to 50 % for a normal pipe run.', 'DN is the nominal size: the real inside diameter depends on the pipe type.'],
  });
  add({
    id: 'kv', g: 'proj', lv: 3, t: 'Control valve size (Kv and Cv)', d: 'The valve size for a flow and a pressure drop, so the valve works in the middle of its stroke.', key: 'control valve sizing Kv Kvs Cv flow coefficient pressure drop',
    f: [N('q', 'Highest flow', 'm³/h', 10), N('dp', 'Pressure drop over the valve', 'bar', 1), N('rho', 'Density (water = 1000)', 'kg/m³', 1000)],
    run(v) {
      if (!(v.q > 0 && v.dp > 0 && v.rho > 0)) return E('Flow, pressure drop and density must be above 0.');
      const kv = v.q * Math.sqrt(v.rho / 1000 / v.dp), kvs = nextStd([0.1, 0.16, 0.25, 0.4, 0.63, 1, 1.6, 2.5, 4, 6.3, 10, 16, 25, 40, 63, 100, 160, 250, 400, 630], kv * 1.25);
      if (!kvs) return E('Bigger than Kvs 630: ask the valve maker.');
      const load = kv / kvs * 100;
      return { r: [['Kv needed', F(kv, 2), '', 'big'], ['The same as Cv (US)', F(kv * 1.156, 2), ''], ['Valve to order: Kvs', F(kvs), ''], ['The valve is used up to', F(load, 0), '% of its Kvs', 'ok']],
        x: { load },
        how: [`Kv = Q × √(density ÷ 1000 ÷ Δp) = ${F(v.q)} × √(${F(v.rho / 1000, 3)} ÷ ${F(v.dp)}) = ${F(kv, 2)}`, `Valve: the next size above Kv × 1.25 = ${F(kv * 1.25, 2)} → Kvs ${F(kvs)}`, `Cv = 1.156 × Kv = ${F(kv * 1.156, 2)}`] };
    },
    pic(v, x) {
      return { still: 2, cap: 'A valve that is too big works almost closed and controls badly. A valve that is too small never gives the full flow.',
        svg: svg('A control valve in a pipe, opening to the needed position', pipe('M20 120 H340', 'f') + '<path class="bd" d="M196 100 L196 140 L256 100 L256 140 Z"/><path class="s" d="M226 120 V70"/><rect class="bd" x="206" y="44" width="40" height="26" rx="6"/>'
          + '<rect class="bd" x="310" y="30" width="18" height="70"/><rect class="gn" data-i="b" x="311" y="99" width="16" height="0"/>' + tx(319, 22, 'open', MID + ' class="tm"') + dyn('t1', 20, 40, 'class="t2"') + tx(20, 58, 'Kv is the flow in m³/h', 'class="tm"') + tx(20, 72, 'at 1 bar pressure drop', 'class="tm"')),
        run(e, t) { const k = Math.min(1, t / 1.5), p = x.load * k; level(e.b, 99, 68 * p / 100); flow(e.f, t, 20 + 0.8 * p); e.t1.textContent = F(p, 0) + ' % of Kvs'; } };
    },
    tips: ['Kv is the water flow in m³/h that passes with 1 bar pressure drop.', 'Aim for the valve to work between 20 and 80 % open. The line size is often one or two sizes bigger than the valve.', 'For gas and steam the formula is different: use the tool of the valve maker.', 'A control valve needs pressure drop to control: give it about one third of the total loss of the line.'],
  });
  add({
    id: 'dilute', g: 'proj', lv: 1, t: 'Mix a batch: concentrate and water', d: 'How much concentrate and how much water for a batch, and the dosing times for the PLC.', key: 'dilution mixing batch concentration percent recipe dosing time C1V1',
    f: [N('vf', 'Volume you want to make', 'l', 1000), N('cf', 'Strength you want', '%', 2), N('cc', 'Strength of the concentrate', '%', 30), N('qd', 'Flow of the dosing pump', 'l/h', 120), N('qw', 'Water flow', 'l/min', 50)],
    run(v) {
      if (!(v.vf > 0 && v.cc > 0 && v.cf >= 0)) return E('Volume and concentrate strength must be above 0.');
      if (v.cf > v.cc) return E('You cannot make a mix stronger than the concentrate.');
      const vc = v.vf * v.cf / v.cc, vw = v.vf - vc;
      return { r: [['Concentrate', F(vc, 1), 'l', 'big'], ['Water', F(vw, 1), 'l'], ['Ratio concentrate : water', vc > 0 ? '1 : ' + F(vw / vc, 1) : '—', ''], ['Dosing pump runs for', v.qd > 0 ? tm(vc / v.qd * 60) : '—', ''], ['Water valve is open for', v.qw > 0 ? tm(vw / v.qw) : '—', '']],
        x: { vc, vw },
        how: [`Concentrate = volume × strength wanted ÷ strength of concentrate = ${F(v.vf)} × ${F(v.cf)} ÷ ${F(v.cc)} = ${F(vc, 1)} l`, `Water = ${F(v.vf)} − ${F(vc, 1)} = ${F(vw, 1)} l`, v.qd > 0 ? `Dosing time = ${F(vc, 1)} l ÷ ${F(v.qd)} l/h = ${F(vc / v.qd * 60, 1)} min` : 'Give the pump flow to get the dosing time.'] };
    },
    pic(v, x) {
      const hw = 108 * x.vw / v.vf, hc = Math.max(x.vc > 0 ? 3 : 0, 108 * x.vc / v.vf);
      return { still: 5, cap: 'First the water, then the concentrate. A mixer or a pump in a loop must then mix them.',
        svg: svg('A tank filled with water and then with concentrate', pipe('M20 30 H190 V46', 'fw') + pipe('M340 30 H250 V46', 'fc', 'am') + '<rect class="bd" x="150" y="46" width="140" height="120"/><rect class="wa" data-i="w" x="151" y="165" width="138" height="0"/><rect class="wb" data-i="c" x="151" y="165" width="138" height="0"/>'
          + tx(20, 20, 'water', 'class="tm"') + tx(340, 20, 'concentrate', END + ' class="tm"') + dyn('t1', 20, 80, 'class="t2"') + dyn('t2', 20, 98) + dyn('t3', 20, 114)),
        run(e, t) {
          const c = t % 7.5, pw = Math.min(1, c / 3.5), pc = clamp((c - 3.5) / 2, 0, 1);
          level(e.w, 165, hw * pw); level(e.c, 165 - hw * pw, hc * pc); flow(e.fw, t, 60, pw < 1); flow(e.fc, t, 40, pw >= 1 && pc < 1);
          e.t1.textContent = pw < 1 ? 'WATER' : pc < 1 ? 'CONCENTRATE' : 'READY: MIX'; e.t2.textContent = 'water ' + F(x.vw * pw, 0) + ' l'; e.t3.textContent = 'conc. ' + F(x.vc * pc, 1) + ' l';
        } };
    },
    tips: ['Dosing by time only works when the flow is always the same. Better: a flow meter, or weigh the tank.', 'The formula is for strength by volume. For strength by weight, do the same sum in kg.', 'Fill most of the water first, then dose: the concentrate mixes better and nothing splashes at full strength.'],
  });
  add({
    id: 'ratio', g: 'proj', lv: 2, t: 'Dosing pump for a flow', d: 'The dosing pump setting to add a chemical in step with the main flow.', key: 'dosing pump ppm ml per m3 chlorine proportional flow pacing stroke',
    f: [N('qm', 'Main flow', 'm³/h', 20), N('dose', 'Dose', '', 50), S('u', 'Unit of the dose', [['ml', 'ml for each m³'], ['pct', '% of the main flow']], 'ml'), N('cap', 'Biggest flow of the dosing pump', 'l/h', 2)],
    run(v) {
      if (!(v.qm > 0 && v.dose >= 0 && v.cap > 0)) return E('Main flow and pump size must be above 0.');
      const qd = v.u === 'ml' ? v.qm * v.dose / 1000 : v.qm * 1000 * v.dose / 100, set = qd / v.cap * 100, w = [];
      if (set > 100) w.push('The dosing pump is too small for this dose.');
      else if (set < 10) w.push('The pump would run under 10 %: it doses badly there. Take a smaller pump or a weaker chemical.');
      return { r: [['Dosing flow', F(qd, 3), 'l/h', 'big'], ['Pump setting', F(set, 1), '%', set > 100 || set < 10 ? 'bad' : 'ok'], ['Signal to the pump (4–20 mA)', set <= 100 ? F(4 + 0.16 * set, 2) : 'more than 20', 'mA'], ['Chemical used per day', F(qd * 24, 1), 'l'], ['The same in ml/min', F(qd * 1000 / 60, 2), 'ml/min']],
        x: { set },
        how: [v.u === 'ml' ? `Dosing flow = main flow × dose = ${F(v.qm)} m³/h × ${F(v.dose)} ml/m³ = ${F(qd * 1000, 0)} ml/h` : `Dosing flow = main flow × dose % = ${F(v.qm * 1000, 0)} l/h × ${F(v.dose / 100, 4)} = ${F(qd, 2)} l/h`,
          `Setting = dosing flow ÷ pump size = ${F(qd, 3)} ÷ ${F(v.cap)} = ${F(set, 1)} %`, `mA = 4 + 16 × setting = ${F(4 + 0.16 * Math.min(100, set), 2)} mA`], warn: w };
    },
    pic(v, x) {
      return { still: 1, cap: 'When the main flow changes, the PLC changes the pump signal by the same amount: the dose stays the same.',
        svg: svg('A dosing pump adds drops to the main pipe', pipe('M20 130 H340', 'f') + '<rect class="bd" x="150" y="30" width="60" height="44" rx="6"/><path class="s" d="M180 74 V122"/><circle class="wb" data-i="d" cx="180" cy="80" r="5"/>'
          + tx(180, 56, 'pump', MID) + tx(180, 22, F(clamp(x.set, 0, 999), 0) + ' %', MID + ' class="t2"') + tx(20, 112, 'main flow ' + F(v.qm) + ' m³/h', 'class="tm"') + tx(20, 160, 'drops: the chemical', 'class="tm"')),
        run(e, t) { const hz = clamp(0.4 + x.set / 30, 0.4, 4), c = (t * hz) % 1; A(e.d, 'cy', 80 + 44 * c); e.d.style.opacity = x.set > 0 ? '1' : '0'; flow(e.f, t, 60); } };
    },
    tips: ['1 ml in 1 m³ is 1 ppm by volume.', 'In the PLC: pump signal % = flow now ÷ highest flow × setting at the highest flow. Stop the pump when the main flow is 0.', 'A dosing pump with strokes gives its flow in pulses: put the injection point before a mixer or a long pipe.'],
  });
  add({
    id: 'batchw', g: 'proj', lv: 3, t: 'Filling by weight: fast, slow, stop', d: 'Where to change from fast to slow and where to close the valve, so the scale stops on the target.', key: 'weighing filling coarse fine feed preact in-flight cut-off batching scale dribble',
    f: [N('tg', 'Target weight', 'kg', 25), N('qc', 'Fast flow', 'kg/s', 2.5), N('qf', 'Slow flow', 'kg/s', 0.25), N('fp', 'Amount to fill in slow flow', 'kg', 2), N('tc', 'Closing time of the valve', 'ms', 150), N('fall', 'Fall height from the valve to the product', 'm', 0.3), N('sc', 'Scan time of the PLC', 'ms', 10)],
    run(v) {
      if (!(v.tg > 0 && v.qc > 0 && v.qf > 0 && v.fp >= 0 && v.tc >= 0 && v.fall >= 0)) return E('Weight and flows must be above 0.');
      const ti = v.tc / 2000 + Math.sqrt(2 * v.fall / G), pf = v.qf * ti, pc = v.qc * ti, sw = v.tg - v.fp - pc, cut = v.tg - pf;
      if (sw <= 0) return E('The slow part and the product still in the air are more than the target. Use a smaller slow part or a slower fast flow.');
      const tfast = (v.tg - v.fp) / v.qc, tslow = v.fp / v.qf, w = [];
      if (v.fp < pc) w.push('The slow part is smaller than what is still falling after the fast valve closes. Make the slow part bigger.');
      return { r: [['Close the slow valve at', F(cut, 3), 'kg', 'big'], ['Change from fast to slow at', F(sw, 2), 'kg'], ['Product still coming after the stop', F(pf * 1000, 0), 'g'], ['Fill time', F(tfast + tslow, 1), 's'], ['Error from one scan', F(v.qf * v.sc, 1), 'g'], ['Fills per hour, without handling', F(3600 / (tfast + tslow), 0), '']],
        x: { sw, cut, tfast, tslow },
        how: [`Time after the stop command = half the closing time + fall time = ${F(v.tc / 2000, 3)} + ${F(Math.sqrt(2 * v.fall / G), 3)} = ${F(ti, 3)} s`, `Product still coming = slow flow × that time = ${F(v.qf)} × ${F(ti, 3)} = ${F(pf, 3)} kg`,
          `Stop at = target − product still coming = ${F(v.tg)} − ${F(pf, 3)} = ${F(cut, 3)} kg`, `Change to slow at = target − slow part − fast flow × ${F(ti, 3)} s = ${F(sw, 2)} kg`], warn: w };
    },
    pic(v, x) {
      const tot = x.tfast + x.tslow, sf = clamp(x.tfast / tot, 0.2, 0.75);
      return { still: 3, cap: 'Fast to save time, slow to hit the target. The valve closes a little early because product is still falling.',
        svg: svg('A hopper fills a bin on a scale, first fast, then slow', '<path class="bd" d="M130 14 H230 L196 64 H164 Z"/><rect data-i="s" class="wb" x="170" y="64" width="20" height="0"/><path class="bd" d="M140 84 V152 H220 V84"/><rect class="wb" data-i="w" x="141" y="151" width="78" height="0"/>'
          + '<rect class="bd" x="120" y="154" width="120" height="12" rx="3"/><path class="s1" d="M140 96 H220"/>' + tx(226, 100, 'target', 'class="tm"') + dyn('t1', 20, 60, 'class="t2"') + dyn('t2', 20, 80, 'class="t2"') + tx(250, 164, 'scale', 'class="tm"')),
        run(e, t) {
          const c = (t % 7.5) / 6, fast = c < sf, done = c >= 1, wgt = done ? v.tg : fast ? x.sw * (c / sf) : x.sw + (v.tg - x.sw) * ((c - sf) / (1 - sf)), sw = done ? 0 : fast ? 18 : 5;
          level(e.w, 151, 55 * wgt / v.tg); A(e.s, 'x', 180 - sw / 2); A(e.s, 'width', sw); A(e.s, 'height', done ? 0 : 151 - 55 * wgt / v.tg - 64);
          e.t1.textContent = done ? 'STOP' : fast ? 'FAST' : 'SLOW'; e.t2.textContent = F(wgt, 2) + ' kg';
        } };
    },
    tips: ['The best systems learn: after every fill, correct the stop point by a part of the error (for example half).', 'The slow flow and the scan time set the accuracy: one scan late is slow flow × scan time.', 'The scale must be calm: filter the weight, and wait for a steady value before you check the result.', 'Read the scale in a fast task or with the weighing module, not in a slow main program.'],
  });
  add({
    id: 'air', g: 'proj', lv: 2, t: 'Compressed air: compressor and tank', d: 'The compressor size for all your air users and the receiver tank that keeps the starts low.', key: 'compressor sizing compressed air receiver tank FAD l/min leak pressure switch',
    f: [N('use', 'Air used by all machines together', 'l/min', 800), N('sim', 'Part that is used at the same time', '%', 70), N('leak', 'Leaks', '%', 15), N('res', 'Reserve for later', '%', 20), N('pon', 'Compressor starts at', 'bar', 6.5), N('poff', 'Compressor stops at', 'bar', 8), N('z', 'Most starts per hour', '', 10)],
    run(v) {
      if (!(v.use > 0 && v.sim > 0 && v.z > 0)) return E('Air use, the part used and the starts must be above 0.');
      if (!(v.poff > v.pon && v.pon > 0)) return E('The stop pressure must be higher than the start pressure.');
      const now = v.use * v.sim / 100 * (1 + v.leak / 100), Q = now * (1 + v.res / 100), dp = v.poff - v.pon, V = 15 * (Q / 1000) / (v.z * dp) * 1000;
      const tank = nextStd([50, 90, 150, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000], V), mot = nextStd(STD_MOTOR, Q / 1000 * 6.5), Vt = tank || V;
      return { r: [['Compressor: free air delivery', F(Q, 0), 'l/min', 'big'], ['The same in m³/min', F(Q / 1000, 2), 'm³/min'], ['Compressor motor, about', mot ? F(mot) : 'more than 250', 'kW'], ['Receiver tank', tank ? F(tank, 0) : F(V, 0), 'l'], ['Tank volume calculated', F(V, 0), 'l'], ['Air used now, with leaks', F(now, 0), 'l/min']],
        x: { rise: Vt * dp / Math.max(1e-9, Q - now), fall: Vt * dp / now },
        how: [`Air now = use × part used × (1 + leaks) = ${F(v.use)} × ${F(v.sim / 100)} × ${F(1 + v.leak / 100)} = ${F(now, 0)} l/min`, `Compressor = air now × (1 + reserve) = ${F(now, 0)} × ${F(1 + v.res / 100)} = ${F(Q, 0)} l/min`,
          `Tank = 15 × Q ÷ (starts × pressure band) = 15 × ${F(Q / 1000, 3)} m³/min ÷ (${F(v.z)} × ${F(dp)} bar) = ${F(V / 1000, 3)} m³`, `Motor: about 6.5 kW for each m³/min at 7 to 8 bar`] };
    },
    pic(v, x) {
      const px = (bar) => 150 + 18 * clamp(bar, 0, 10);
      const sf = clamp(x.rise / (x.rise + x.fall), 0.2, 0.8);
      return { still: 1, cap: 'The tank is a buffer: the pressure moves between the start and the stop value, and the compressor rests in between.',
        svg: svg('A compressor fills a receiver tank between two pressures', '<rect class="bd" x="16" y="70" width="70" height="56" rx="6"/>' + tx(51, 102, 'compr.', MID) + '<circle data-i="lamp" class="mu" cx="51" cy="60" r="7"/>' + pipe('M86 98 H112', 'f', 'el')
          + '<rect class="bd" x="112" y="40" width="34" height="116" rx="17"/><path class="s" d="M150 150 H330"/><rect class="hl" x="' + px(v.pon).toFixed(0) + '" y="140" width="' + (px(v.poff) - px(v.pon)).toFixed(0) + '" height="10"/>'
          + '<path class="rd" data-i="p" d="M0 138 L-6 124 L6 124 Z"/>' + tx(150, 166, '0', MID + ' class="tm"') + tx(330, 166, '10 bar', END + ' class="tm"') + dyn('t1', 160, 60, 'class="t2"') + dyn('t2', 160, 80) + dyn('t3', 160, 96, 'class="tm"')),
        run(e, t) {
          const c = (t % 7) / 7, on = c < sf, bar = on ? v.pon + (v.poff - v.pon) * (c / sf) : v.poff - (v.poff - v.pon) * ((c - sf) / (1 - sf));
          A(e.p, 'transform', 'translate(' + px(bar).toFixed(1) + ' 0)'); A(e.lamp, 'class', on ? 'gn' : 'mu'); flow(e.f, t, 50, on);
          e.t1.textContent = F(bar, 1) + ' bar'; e.t2.textContent = on ? 'compressor ON ' + tm(x.rise) : 'compressor OFF ' + tm(x.fall); e.t3.textContent = 'green band: start to stop';
        } };
    },
    tips: ['Air values are in normal litres: the air at room pressure, before it is compressed.', 'Leaks of 15 to 30 % are common in old plants. Fixing leaks is cheaper than a bigger compressor.', 'A bigger pressure band or a bigger tank gives fewer starts. A compressor with a drive needs a much smaller tank.', 'The start pressure must still be above what the machines need, plus the loss in the pipes and the dryer.'],
  });
  add({
    id: 'leak', g: 'proj', lv: 1, t: 'Air leak: how much it costs', d: 'The air lost through a leak, the power the compressor needs for it and what it costs in a year.', key: 'compressed air leak cost hole energy kWh money year pneumatic',
    f: [N('d', 'Size of the hole (one leak)', 'mm', 1), N('n', 'Number of such leaks', '', 10), N('p', 'Line pressure', 'bar', 6), N('h', 'Hours with air on, per year', 'h', 4000), N('c', 'Price of electricity', 'per kWh', 0.2)],
    run(v) {
      if (!(v.d > 0 && v.n > 0 && v.p > 0 && v.h > 0)) return E('Hole size, number, pressure and hours must be above 0.');
      // choked flow through a round hole (discharge factor 0.9), as free air at 20 °C
      const A1 = PI * v.d * v.d / 4 * 1e-6, mdot = 0.9 * A1 * (v.p + 1) * 1e5 * 0.0404 / Math.sqrt(293), q1 = mdot / 1.204 * 60000, Q = q1 * v.n;
      const kw = Q / 1000 * 6.5, kwh = kw * v.h, cost = kwh * v.c;
      return { r: [['Air lost', F(Q, 0), 'l/min', 'big'], ['One leak', F(q1, 1), 'l/min'], ['Compressor power for it', F(kw, 2), 'kW'], ['Energy per year', F(kwh, 0), 'kWh'], ['Cost per year', F(cost, 0), '(your money)', cost > 1000 ? 'bad' : '']],
        how: [`A hole lets air out at the speed of sound: about 0.9 × area × absolute pressure × 0.0404 ÷ √T kg/s`, `One ${F(v.d)} mm hole at ${F(v.p)} bar ≈ ${F(q1, 1)} l/min of free air`, `Compressor power ≈ 6.5 kW per m³/min = ${F(kw, 2)} kW`, `Cost = ${F(kw, 2)} kW × ${F(v.h, 0)} h × ${F(v.c)} = ${F(cost, 0)}`],
        warn: Q > 100 ? ['That is a lot of air. Listen for leaks on a quiet weekend, or use an ultrasonic leak finder, and fix the biggest ones first.'] : [] };
    },
    tips: ['A 1 mm leak at 6 bar loses about 60 l/min: you cannot hear it on a running machine, but you pay for it all year.', 'Leaks of 20 to 30 % of all the air are normal in old plants.', 'Shut off the air with the machine (a 3/2 valve on the supply): no leaks at night and at the weekend.'],
  });
  add({
    id: 'vcup', g: 'proj', lv: 2, t: 'Vacuum cups: size for a part', d: 'The suction cup size to hold and move a part safely, and the vacuum switch point.', key: 'vacuum suction cup gripper size holding force safety factor kPa venturi pick and place',
    f: [N('m', 'Mass of the part', 'kg', 2), N('n', 'Number of cups', '', 2), N('vac', 'Vacuum', '-kPa', 60), S('dir', 'How the part hangs and moves', [['h', 'Flat part, lifted (cups on top)'], ['v', 'Held at the side (vertical)']], 'h'), N('a', 'Acceleration of the move', 'm/s²', 5)],
    run(v) {
      if (!(v.m > 0 && v.n >= 1 && v.vac > 0 && v.vac < 100)) return E('Mass and cups above 0; vacuum between 0 and 100 kPa.');
      const S2 = v.dir === 'v' ? 4 : 2, mu = 0.5, Fneed = v.dir === 'v' ? v.m * (G + v.a) / mu * S2 : v.m * (G + v.a) * S2, Fcup = Fneed / Math.floor(v.n);
      const Aneed = Fcup / (v.vac * 1000), d = Math.sqrt(4 * Aneed / PI) * 1000;
      const cups = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 125, 150], dd = nextStd(cups, d), Fhave = dd ? v.vac * 1000 * PI * dd * dd / 4 * 1e-6 * Math.floor(v.n) : 0;
      return { r: [['Cup diameter, at least', F(d, 1), 'mm'], ['Take the standard cup', dd ? F(dd, 0) : 'more than 150', 'mm', 'big'], ['Holding force needed, all cups', F(Fneed, 0), 'N'], ['Holding force of the chosen cups', dd ? F(Fhave, 0) : '—', 'N'], ['Vacuum switch point, about', F(v.vac * 0.75, 0), '-kPa']],
        how: [`Force needed = mass × (g + a)${v.dir === 'v' ? ' ÷ friction 0.5' : ''} × safety ${S2} = ${F(v.m)} × ${F(G + v.a, 1)}${v.dir === 'v' ? ' ÷ 0.5' : ''} × ${S2} = ${F(Fneed, 0)} N`, `Per cup ${F(Fcup, 0)} N; area = force ÷ vacuum = ${F(Aneed * 1e6, 0)} mm²`, `Diameter = √(4 × area ÷ π) = ${F(d, 1)} mm`],
        warn: v.dir === 'v' ? ['Held at the side the part hangs on friction only: that is why the force is doubled again (÷ 0.5) and the safety factor is 4.'] : [] };
    },
    tips: ['Safety factor 2 for a flat part lifted straight up, 4 when the part is held at the side or moved fast.', 'Set the vacuum switch a bit below the normal vacuum: the PLC lifts only when it is ON, and stops the move when it goes OFF.', 'Porous parts (cardboard, wood) leak: they need a bigger generator, not only a bigger cup.'],
  });
  add({
    id: 'cylspeed', g: 'proj', lv: 2, t: 'Cylinder speed: air flow and tube size', d: 'How fast a cylinder moves for a stroke time, the air flow it needs and the tube size that gives it.', key: 'pneumatic cylinder speed stroke time air flow tube size valve flow l/min',
    f: [N('d', 'Piston diameter (bore)', 'mm', 40), N('s', 'Stroke', 'mm', 300), N('t', 'Wanted stroke time', 's', 0.6), N('p', 'Pressure', 'bar', 6)],
    run(v) {
      if (!(v.d > 0 && v.s > 0 && v.t > 0 && v.p > 0)) return E('All values must be above 0.');
      const A1 = PI * v.d * v.d / 4, vel = v.s / 1000 / v.t, Q = A1 * v.s / 1e6 * (v.p + 1) / v.t * 60;
      const TUBE = [[4, 100], [6, 300], [8, 600], [10, 1000], [12, 1500], [16, 2800]], tube = TUBE.find((x) => x[1] >= Q);
      return { r: [['Piston speed', F(vel, 2), 'm/s', vel > 1 ? 'bad' : ''], ['Air flow while it moves', F(Q, 0), 'l/min (normal)', 'big'], ['Tube (outside diameter), about', tube ? F(tube[0], 0) : 'more than 16', 'mm'], ['Valve flow, choose at least', F(Q * 1.5, 0), 'l/min (Qn)']],
        how: [`Speed = stroke ÷ time = ${F(v.s / 1000, 2)} m ÷ ${F(v.t)} s = ${F(vel, 2)} m/s`, `Air = area × stroke × (pressure + 1) ÷ time = ${F(A1, 0)} mm² × ${F(v.s)} mm × ${F(v.p + 1)} ÷ ${F(v.t)} s = ${F(Q, 0)} l/min`, 'Tube and valve: rules of thumb for short tubes at 6 bar; the valve Qn about 1.5 × the flow'],
        warn: vel > 1 ? ['Over 1 m/s a cylinder needs good end cushions (or shock absorbers), or it hits hard at the end of the stroke.'] : vel < 0.05 ? ['Under about 0.05 m/s many cylinders move in jerks (stick-slip). Use a low-friction cylinder or hydraulics for slow, smooth moves.'] : [] };
    },
    tips: ['Normal speed for a pneumatic cylinder: 0.1 to 1 m/s.', 'Set the speed with a meter-out flow control; the tube and the valve only set the top speed.', 'A long, thin tube is a hidden throttle: keep the valve close to the cylinder.'],
  });
  add({
    id: 'line', g: 'proj', lv: 1, t: 'Conveyor line: speed for parts per hour', d: 'The belt speed for an output, and if the sensor and the PLC are fast enough to see every part.', key: 'conveyor throughput parts per hour belt speed gap pitch sensor time line rate',
    f: [N('n', 'Parts per hour', '', 3600), N('len', 'Length of one part', 'mm', 300), N('gap', 'Gap between two parts', 'mm', 200), N('sc', 'Scan time of the PLC', 'ms', 10)],
    run(v) {
      if (!(v.n > 0 && v.len > 0 && v.gap >= 0)) return E('Parts per hour and part length must be above 0.');
      const pitch = v.len + v.gap, mmps = v.n * pitch / 3600, tg = v.gap / mmps * 1000, tp = v.len / mmps * 1000, w = [];
      if (v.gap <= 0) w.push('No gap: a sensor cannot count parts that touch. Speed up the next belt to pull them apart.');
      else if (tg < 2 * v.sc) w.push('The gap passes in less than two scans: the PLC can miss it and count two parts as one. Make the gap bigger or use a fast input.');
      return { r: [['Belt speed', F(mmps * 60 / 1000, 1), 'm/min', 'big'], ['The same in m/s', F(mmps / 1000, 3), 'm/s'], ['One part every', F(3600 / v.n, 2), 's'], ['Sensor sees the part for', F(tp, 0), 'ms'], ['Sensor sees the gap for', F(tg, 0), 'ms', tg >= 2 * v.sc ? 'ok' : 'bad'], ['Parts per minute', F(v.n / 60, 1), '']],
        x: { tper: 3600 / v.n },
        how: [`Pitch = part + gap = ${F(v.len)} + ${F(v.gap)} = ${F(pitch)} mm`, `Speed = parts per hour × pitch = ${F(v.n, 0)} × ${F(pitch / 1000, 3)} m ÷ 60 = ${F(mmps * 60 / 1000, 1)} m/min`, `Gap time = gap ÷ speed = ${F(v.gap)} mm ÷ ${F(mmps, 0)} mm/s = ${F(tg, 0)} ms`], warn: w };
    },
    pic(v, x) {
      const P = 64, bw = clamp(P * v.len / (v.len + v.gap), 6, P), sp = clamp(P / x.tper, 12, 220);
      let boxes = ''; for (let i = 0; i < 8; i++) boxes += `<rect class="hl" data-i="b${i}" x="0" y="92" width="${bw.toFixed(1)}" height="26" rx="2"/>`;
      return { still: 1, cap: 'The sensor must see every gap. A higher speed or a smaller gap makes the gap time shorter.',
        svg: svg('Parts on a conveyor pass a sensor', '<path class="s" d="M24 120 H336"/><circle class="bd" cx="24" cy="130" r="10"/><circle class="bd" cx="336" cy="130" r="10"/><path class="s" d="M24 140 H336"/>' + boxes
          + '<rect class="bd" x="212" y="30" width="16" height="20" rx="3"/><path data-i="beam" class="ac" d="M220 50 V118"/>' + tx(220, 22, 'sensor', MID + ' class="tm"') + dyn('t1', 24, 40, 'class="t2"') + dyn('t2', 24, 60)),
        run(e, t) {
          let seen = false;
          for (let i = 0; i < 8; i++) { const xx = ((i * P + t * sp) % (8 * P)) - P; A(e['b' + i], 'x', xx); if (xx <= 220 && xx + bw >= 220) seen = true; }
          e.beam.style.opacity = seen ? '1' : '0.25'; e.t1.textContent = seen ? 'sensor ON' : 'sensor OFF'; e.t2.textContent = 'parts counted: ' + Math.floor((t * sp + 220) / P);
        } };
    },
    tips: ['Faster belt with the same parts per hour means a bigger gap: that is how a speed-up belt separates parts.', 'Count on the edge of the sensor, never on the level: one part must give one count.', 'Keep at least two scan times for the gap and for the part.'],
  });
  add({
    id: 'roll', g: 'proj', lv: 2, t: 'Winder: roll length and speed', d: 'Metres of material on a roll, how long it lasts, and the roll speed from full to empty.', key: 'winder unwinder roll length diameter rpm web line speed paper film coil',
    f: [N('do', 'Outside diameter of the roll', 'mm', 800), N('di', 'Diameter of the core', 'mm', 90), N('th', 'Thickness of the material', 'mm', 0.1), N('v', 'Line speed', 'm/min', 100)],
    run(v) {
      if (!(v.di > 0 && v.do > v.di && v.th > 0 && v.v > 0)) return E('The roll must be bigger than the core, and thickness and speed above 0.');
      const L = PI * (v.do * v.do - v.di * v.di) / (4 * v.th) / 1000, n1 = v.v * 1000 / (PI * v.do), n2 = v.v * 1000 / (PI * v.di);
      return { r: [['Length on the roll', F(L, 0), 'm', 'big'], ['The roll lasts', tm(L / v.v), ''], ['Roll speed when full', F(n1, 1), 'rpm'], ['Roll speed when empty', F(n2, 1), 'rpm'], ['Speed range of the drive', '1 : ' + F(n2 / n1, 1), ''], ['Layers', F((v.do - v.di) / (2 * v.th), 0), '']],
        x: { L, n1 },
        how: [`Length = π × (D² − d²) ÷ (4 × thickness) = 3.1416 × (${F(v.do)}² − ${F(v.di)}²) ÷ (4 × ${F(v.th, 3)}) = ${F(L * 1000, 0)} mm`, `rpm = line speed ÷ (π × diameter): full ${F(n1, 1)}, empty ${F(n2, 1)}`, `Time = length ÷ line speed = ${F(L, 0)} ÷ ${F(v.v)} = ${F(L / v.v, 1)} min`] };
    },
    pic(v, x) {
      const R = 62, rc = Math.max(8, R * v.di / v.do);
      return { still: 2, cap: 'The line speed stays the same, so the roll must turn faster and faster as it gets smaller.',
        svg: svg('A roll that unwinds and gets smaller', '<circle class="wb" data-i="r" cx="100" cy="100" r="62"/><circle class="bd" cx="100" cy="100" r="' + rc.toFixed(1) + '"/><path class="s" data-i="sp" d="M100 100 L100 40"/><path class="s" data-i="web" d="M100 38 H330"/><circle class="bd" cx="330" cy="100" r="8"/>'
          + dyn('t1', 190, 128, 'class="t2"') + dyn('t2', 190, 146) + dyn('t3', 190, 162, 'class="tm"')),
        run(e, t) {
          const p = lp(t, 7, 1), r2 = R * R - (R * R - rc * rc) * p, r = Math.sqrt(r2), dia = v.do * r / R;
          const ang = 12 * PI * (R - r) / Math.max(1, R - rc); // the roll turns faster as it gets smaller
          A(e.r, 'r', r); A(e.sp, 'd', `M100 100 L${(100 + r * Math.sin(ang)).toFixed(1)} ${(100 - r * Math.cos(ang)).toFixed(1)}`); A(e.web, 'd', `M100 ${(100 - r).toFixed(1)} L330 92`);
          e.t1.textContent = F(v.v * 1000 / (PI * dia), 0) + ' rpm'; e.t2.textContent = F(x.L * (1 - p), 0) + ' m left'; e.t3.textContent = 'diameter ' + F(dia, 0) + ' mm';
        } };
    },
    tips: ['In the drive or the PLC: rpm = line speed ÷ (π × diameter). The diameter comes from a sensor or is calculated from the two speeds.', 'For the same web tension the torque must fall as the roll gets smaller: torque = tension × radius.', 'A wide speed range (1 : 8 and more) needs a motor with a separate fan or a servo.'],
  });
  add({
    id: 'cool', g: 'proj', lv: 2, t: 'Cooling: water or air flow for a heat load', d: 'The flow of water, oil or air that carries a heat load away.', key: 'cooling water flow heat load chiller heat exchanger delta T air flow',
    f: [N('p', 'Heat to carry away', 'kW', 10), S('m', 'Cooling medium', [['w', 'Water'], ['g', 'Water with 30 % glycol'], ['o', 'Oil'], ['a', 'Air']], 'w'), N('dt', 'The medium may get warmer by', '°C', 5)],
    run(v) {
      const M = { w: [998, 4.18], g: [1040, 3.7], o: [870, 1.9], a: [1.2, 1.005] }[v.m];
      if (!(v.p > 0 && v.dt > 0)) return E('Heat and temperature rise must be above 0.');
      const kg = v.p / (M[1] * v.dt), m3s = kg / M[0];
      const r = v.m === 'a' ? [['Air flow', F(m3s * 3600, 0), 'm³/h', 'big'], ['The same in m³/min', F(m3s * 60, 1), 'm³/min']] : [['Flow', F(m3s * 60000, 1), 'l/min', 'big'], ['The same in m³/h', F(m3s * 3600, 2), 'm³/h']];
      r.push(['Mass flow', F(kg, 3), 'kg/s']);
      return { r, x: {}, how: [`Mass flow = heat ÷ (c × ΔT) = ${F(v.p)} kW ÷ (${M[1]} × ${F(v.dt)}) = ${F(kg, 3)} kg/s`, `Volume flow = mass flow ÷ density = ${F(kg, 3)} ÷ ${M[0]} = ${F(m3s, 5)} m³/s`] };
    },
    pic(v) {
      return { still: 1, cap: 'The medium comes in cold, takes the heat and leaves warmer. A smaller temperature rise needs more flow.',
        svg: svg('Cold medium flows into a machine and leaves warm', pipe('M14 100 H120', 'a') + pipe('M240 100 H346', 'b', 'hot') + '<rect class="bd" x="120" y="56" width="120" height="88" rx="8"/>' + tx(180, 96, 'heat', MID) + tx(180, 114, F(v.p) + ' kW', MID + ' class="t2"')
          + tx(60, 82, 'cold in', MID + ' class="tm"') + tx(294, 82, 'warm out', MID + ' class="tm"') + tx(294, 128, '+' + F(v.dt) + ' °C', MID + ' class="t2"')),
        run(e, t) { flow(e.a, t, 60); flow(e.b, t, 60); } };
    },
    tips: ['Easy rule for water: l/min = kW × 14.3 ÷ temperature rise.', 'Easy rule for air: m³/h = watts × 3 ÷ temperature rise.', 'In the PLC, watch the flow and the return temperature: a blocked filter shows as less flow and a hotter return.'],
  });
  add({
    id: 'tmix', g: 'proj', lv: 1, t: 'Mix hot and cold water', d: 'How much hot and how much cold water gives the temperature you want.', key: 'mixing valve temperature hot cold blend flow',
    f: [N('th', 'Hot water', '°C', 60), N('tc', 'Cold water', '°C', 15), N('tw', 'Temperature you want', '°C', 40), N('q', 'Total flow', 'l/min', 20)],
    run(v) {
      if (!(v.th > v.tc)) return E('The hot water must be hotter than the cold water.');
      if (v.tw < v.tc || v.tw > v.th) return E('The temperature you want must be between cold and hot.');
      const s = (v.tw - v.tc) / (v.th - v.tc);
      return { r: [['Hot water', F(v.q * s, 1), 'l/min', 'big'], ['Cold water', F(v.q * (1 - s), 1), 'l/min'], ['Share of hot water', F(s * 100, 1), '%']], x: { s },
        how: [`Hot share = (wanted − cold) ÷ (hot − cold) = (${F(v.tw)} − ${F(v.tc)}) ÷ (${F(v.th)} − ${F(v.tc)}) = ${F(s, 3)}`, `Hot = ${F(v.q)} × ${F(s, 3)} = ${F(v.q * s, 1)} l/min`] };
    },
    pic(v, x) {
      const wh = 3 + 9 * x.s, wc = 3 + 9 * (1 - x.s);
      return { still: 1, cap: 'A mixing valve does this all the time: more hot when the result is too cold, more cold when it is too hot.',
        svg: svg('A hot and a cold pipe join into one', `<path class="pp" d="M20 50 H150 L200 92"/><path class="pp" d="M20 134 H150 L200 92"/><path class="pp" d="M200 92 H340"/><path class="fl hot" data-i="h" style="stroke-width:${wh.toFixed(1)}" d="M20 50 H150 L200 92"/><path class="fl" data-i="c" style="stroke-width:${wc.toFixed(1)}" d="M20 134 H150 L200 92"/><path class="fl am" data-i="m" d="M200 92 H340"/>`
          + tx(20, 36, 'hot ' + F(v.th) + ' °C', 'class="tm"') + tx(20, 158, 'cold ' + F(v.tc) + ' °C', 'class="tm"') + tx(270, 78, F(v.tw) + ' °C', MID + ' class="t2"')),
        run(e, t) { flow(e.h, t, 15 + 80 * x.s); flow(e.c, t, 15 + 80 * (1 - x.s)); flow(e.m, t, 70); } };
    },
    tips: ['This works for two flows of the same liquid.', 'In the PLC this share is a good start value for the valve. A PID loop on the mixed temperature then corrects it.'],
  });
  add({
    id: 'levelp', g: 'proj', lv: 2, t: 'Level sensor by pressure: range and scaling', d: 'The pressure range to order for a tank, and the level that 20 mA means in the PLC.', key: 'hydrostatic level transmitter pressure range mbar scaling tank level 4-20 mA',
    f: [N('ht', 'Highest level above the sensor', 'm', 3), N('rho', 'Density (water = 1000)', 'kg/m³', 1000), N('lv', 'Level now', 'm', 1.2)],
    run(v) {
      if (!(v.ht > 0 && v.rho > 0 && v.lv >= 0)) return E('Height and density must be above 0.');
      const k = v.rho * G / 100, pf = k * v.ht, rg = nextStd([40, 60, 100, 160, 250, 400, 600, 1000, 1600, 2500, 4000, 6000, 10000], pf);
      if (!rg) return E('More than 10 bar: ask for a special range.');
      const mA = (h) => 4 + 16 * k * h / rg;
      return { r: [['Sensor range to order', rg >= 1000 ? '0 … ' + F(rg / 1000) + ' bar' : '0 … ' + F(rg, 0) + ' mbar', '', 'big'], ['In the PLC, 20 mA means a level of', F(rg / k, 3), 'm'], ['Pressure at the highest level', F(pf, 0), 'mbar'], ['Signal at the highest level', F(mA(v.ht), 2), 'mA'], ['Signal at the level now', F(mA(v.lv), 2), 'mA'], ['Level for each mA', F(rg / k / 16 * 1000, 0), 'mm']],
        x: { rg, k },
        how: [`Pressure = density × g × level = ${F(v.rho, 0)} × 9.81 × ${F(v.ht)} = ${F(pf * 100, 0)} Pa = ${F(pf, 0)} mbar`, `Next standard range: ${F(rg, 0)} mbar`, `Level at 20 mA = range ÷ (density × g) = ${F(rg * 100, 0)} Pa ÷ ${F(v.rho * G, 0)} = ${F(rg / k, 3)} m`] };
    },
    pic(v, x) {
      return { still: 2, cap: 'The sensor at the bottom feels the weight of the liquid above it. More level, more pressure, more mA.',
        svg: svg('A tank with a pressure sensor at the bottom and its mA signal', '<rect class="bd" x="40" y="24" width="120" height="130"/><rect class="wa" data-i="w" x="41" y="153" width="118" height="0"/><rect class="gn" x="160" y="142" width="16" height="10" rx="2"/>'
          + '<rect class="bd" x="262" y="24" width="16" height="130"/><rect class="gn" data-i="b" x="263" y="153" width="14" height="0"/>' + tx(284, 30, '20 mA', 'class="tm"') + tx(284, 156, '4 mA', 'class="tm"') + tx(176, 138, 'sensor', 'class="tm"')
          + dyn('t1', 176, 60, 'class="t2"') + dyn('t2', 176, 80) + dyn('t3', 176, 98)),
        run(e, t) {
          const c = (t % 8) / 8, f = c < 0.5 ? c * 2 : 2 - c * 2, h = v.ht * f, mbar = x.k * h, ma = 4 + 16 * mbar / x.rg;
          level(e.w, 153, 124 * f); level(e.b, 153, 128 * (ma - 4) / 16);
          e.t1.textContent = F(h, 2) + ' m'; e.t2.textContent = F(mbar, 0) + ' mbar'; e.t3.textContent = F(ma, 2) + ' mA';
        } };
    },
    tips: ['Scale the input with the range of the sensor, not with the height of the tank: 20 mA is the range, and the full tank is a little less.', 'A liquid with another density gives another reading: 1 m of oil is less pressure than 1 m of water.', 'A closed tank with pressure on top needs a differential pressure sensor.', 'The level is counted from the sensor, not from the tank floor: add the mounting height.'],
  });
  add({
    id: 'mains', g: 'proj', lv: 2, t: 'Main supply of a machine', d: 'Total current of the cabinet, the main switch and the incoming cable.', key: 'main switch incoming feeder total load demand factor kVA main breaker machine supply',
    f: [N('u', 'Voltage (three-phase)', 'V', 400), N('pm', 'All motors together', 'kW', 22), N('pb', 'Biggest motor', 'kW', 11), N('ph', 'Heaters', 'kW', 6), N('po', 'Other loads', 'kW', 2), N('sim', 'Part that runs at the same time', '%', 80)],
    run(v) {
      if (!(v.u > 0 && v.sim > 0)) return E('Voltage and the part that runs must be above 0.');
      const k = SQ3 * v.u, im = v.pm * 1000 / (k * 0.85 * 0.88), ih = v.ph * 1000 / k, io = v.po * 1000 / (k * 0.95), it = (im + ih + io) * v.sim / 100, ib = v.pb * 1000 / (k * 0.85 * 0.88);
      if (!(it > 0)) return E('Give at least one load.');
      const sw = nextStd([16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800], it), ia = AMP.E.findIndex((a) => a >= (sw || it));
      return { r: [['Total current', F(it, 1), 'A', 'big'], ['Main switch or breaker', sw ? F(sw) : 'more than 800', 'A'], ['Incoming cable for that switch (on a tray)', ia >= 0 ? F(CSA[ia]) : 'more than 120', 'mm²'], ['Apparent power', F(k * it / 1000, 1), 'kVA'], ['Peak when the biggest motor starts direct', F(it + 6 * ib, 0), 'A']],
        x: {},
        how: [`Motors: ${F(v.pm)} kW ÷ (√3 × ${F(v.u)} × 0.85 × 0.88) = ${F(im, 1)} A`, `Heaters: ${F(v.ph)} kW ÷ (√3 × ${F(v.u)}) = ${F(ih, 1)} A.  Other: ${F(io, 1)} A`, `Total = (${F(im, 1)} + ${F(ih, 1)} + ${F(io, 1)}) × ${F(v.sim / 100)} = ${F(it, 1)} A`, `Start peak = total + 6 × current of the biggest motor (${F(ib, 1)} A)`] };
    },
    tips: ['Motors on drives count with their power, but they do not give the start peak.', 'The currents are simply added. That is a little too high, so it is on the safe side.', 'The cable must fit the main breaker, and the breaker must switch off the short-circuit current of the supply.', 'Check the voltage drop of a long incoming cable with the cable calculator. Local rules decide in the end.'],
  });
  add({
    id: 'brake', g: 'proj', lv: 3, t: 'Braking resistor for a drive', d: 'The energy a drive must burn when it stops a heavy load fast, and the resistor for it.', key: 'braking resistor chopper VFD regenerative energy stop inertia overvoltage',
    f: [N('j', 'Inertia at the motor shaft', 'kg·m²', 0.5), N('n', 'Speed before the stop', 'rpm', 1450), N('ts', 'Stop time', 's', 2), N('cyc', 'One stop every', 's', 30), N('tf', 'Friction torque that helps to stop', 'Nm', 5), S('u', 'Drive', [['750', '400 V drive (about 750 V inside)'], ['390', '230 V drive (about 390 V inside)']], '750')],
    run(v) {
      if (!(v.j > 0 && v.n > 0 && v.ts > 0 && v.cyc > 0)) return E('Inertia, speed, stop time and cycle must be above 0.');
      const w = 2 * PI * v.n / 60, tb = v.j * w / v.ts - Math.max(0, v.tf);
      if (tb <= 0) return { r: [['Braking resistor', 'not needed', '', 'big ok'], ['Energy in the moving load', F(0.5 * v.j * w * w / 1000, 2), 'kJ']], x: {}, how: [`Torque to stop = J × ω ÷ t = ${F(v.j * w / v.ts, 1)} Nm: the friction (${F(v.tf)} Nm) does it alone.`] };
      const pp = tb * w, eb = pp * v.ts / 2, U = +v.u;
      return { r: [['Peak braking power', F(pp / 1000, 2), 'kW', 'big'], ['Energy to burn at each stop', F(eb / 1000, 2), 'kJ'], ['Average power of the resistor', F(eb / v.cyc, 0), 'W'], ['Resistor value, at most', F(U * U / pp, 0), 'Ω'], ['Braking part of the cycle', F(v.ts / v.cyc * 100, 1), '%']],
        x: {},
        how: [`ω = 2π × n ÷ 60 = ${F(w, 1)} rad/s.  Torque to stop = J × ω ÷ t − friction = ${F(v.j * w / v.ts, 1)} − ${F(v.tf)} = ${F(tb, 1)} Nm`, `Peak power = torque × ω = ${F(tb, 1)} × ${F(w, 1)} = ${F(pp, 0)} W`,
          `Energy = peak power × stop time ÷ 2 = ${F(eb, 0)} J.  Average = ${F(eb, 0)} ÷ ${F(v.cyc)} = ${F(eb / v.cyc, 0)} W`, `R at most = U² ÷ peak power = ${U}² ÷ ${F(pp, 0)} = ${F(U * U / pp, 0)} Ω`] };
    },
    tips: ['Without a resistor the energy goes into the drive and it trips with overvoltage.', 'The resistor must not be smaller than the lowest value the drive allows: see the drive manual.', 'A longer stop ramp is the cheapest fix: half the time needs double the peak power.', 'Losses in the motor and gearbox help a little, so the real values are somewhat lower.'],
  });
  add({
    id: 'feeder', g: 'proj', lv: 2, t: 'Feeder: drive speed for a rate', d: 'From one test run to the frequency for the kg per hour you want.', key: 'screw feeder calibration kg/h Hz volumetric dosing rate belt feeder',
    f: [N('m', 'Product collected in the test', 'kg', 12.5), N('tt', 'Test time', 's', 60), N('ft', 'Drive frequency in the test', 'Hz', 30), N('want', 'Rate you want', 'kg/h', 1000), N('fmin', 'Lowest frequency allowed', 'Hz', 10), N('fmax', 'Highest frequency allowed', 'Hz', 60)],
    run(v) {
      if (!(v.m > 0 && v.tt > 0 && v.ft > 0 && v.want >= 0)) return E('Test weight, test time and test frequency must be above 0.');
      const rate = v.m / v.tt * 3600, k = rate / v.ft, f = v.want / k, okf = f >= v.fmin && f <= v.fmax;
      return { r: [['Frequency for ' + F(v.want) + ' kg/h', F(f, 1), 'Hz', 'big ' + (okf ? 'ok' : 'bad')], ['Rate in the test', F(rate, 0), 'kg/h'], ['Rate for each Hz', F(k, 2), 'kg/h'], ['Range of the feeder', F(k * v.fmin, 0) + ' … ' + F(k * v.fmax, 0), 'kg/h']], x: {},
        how: [`Rate in the test = ${F(v.m)} kg ÷ ${F(v.tt)} s × 3600 = ${F(rate, 0)} kg/h`, `For each Hz = ${F(rate, 0)} ÷ ${F(v.ft)} = ${F(k, 2)} kg/h`, `Frequency = ${F(v.want)} ÷ ${F(k, 2)} = ${F(f, 1)} Hz`],
        warn: okf ? [] : ['This rate is outside the speed range of the feeder. Change the gear ratio or the screw.'] };
    },
    tips: ['Do the test at two or three speeds: many feeders are not exactly straight-line.', 'The rate changes with the product (density, moisture): repeat the test for every product and keep the factor in the recipe.', 'For exact dosing, weigh: a loss-in-weight feeder corrects itself.'],
  });
  add({
    id: 'takt', g: 'proj', lv: 1, t: 'Takt time and machines needed', d: 'How fast the line must work for the demand, and how many machines that takes.', key: 'takt time capacity planning machines needed demand shift cycle time bottleneck',
    f: [N('dem', 'Parts needed per shift', '', 2000), N('sh', 'Shift length', 'min', 480), N('br', 'Breaks and planned stops', 'min', 45), N('cyc', 'Cycle time of one machine', 's', 20), N('oee', 'Real performance of the machine (OEE)', '%', 80)],
    run(v) {
      const run = (v.sh - v.br) * 60;
      if (!(v.dem > 0 && run > 0 && v.cyc > 0 && v.oee > 0)) return E('Demand, working time, cycle time and OEE must be above 0.');
      const takt = run / v.dem, eff = v.cyc / (v.oee / 100), n = Math.ceil(eff / takt - 1e-9), outp = n * run / eff;
      return { r: [['Machines needed', String(n), '', 'big'], ['Takt time: one part every', F(takt, 2), 's'], ['Real time for one part on one machine', F(eff, 1), 's'], ['Output with ' + n + (n === 1 ? ' machine' : ' machines'), F(outp, 0), 'parts per shift'], ['Reserve', F((outp / v.dem - 1) * 100, 0), '%']], x: {},
        how: [`Takt = working time ÷ demand = ${F(run, 0)} s ÷ ${F(v.dem, 0)} = ${F(takt, 2)} s`, `Real cycle = cycle ÷ OEE = ${F(v.cyc)} ÷ ${F(v.oee / 100)} = ${F(eff, 1)} s`, `Machines = real cycle ÷ takt = ${F(eff / takt, 2)}, rounded up = ${n}`] };
    },
    tips: ['The slowest station sets the output of the whole line: find it first.', 'A buffer between two stations hides short stops of one of them.', 'Plan with the real OEE, not with the cycle time from the catalogue.'],
  });

  // ═════════════ pictures for the calculators of calc.js ═════════════
  C.pic('tank', (v) => {
    const top = v.sh === 'h' ? v.d : v.ht, f = clamp(v.lv / top, 0, 1);
    const body = v.sh === 'h'
      ? '<clipPath id="cx-tk"><circle cx="180" cy="92" r="64"/></clipPath><circle class="bd" cx="180" cy="92" r="65"/><rect class="wa" data-i="w" clip-path="url(#cx-tk)" x="114" y="156" width="132" height="0"/>'
      : '<rect class="bd" x="' + (v.sh === 'b' ? 100 : 124) + '" y="26" width="' + (v.sh === 'b' ? 160 : 112) + '" height="132"/><rect class="wa" data-i="w" x="' + (v.sh === 'b' ? 101 : 125) + '" y="157" width="' + (v.sh === 'b' ? 158 : 110) + '" height="0"/>';
    const H = v.sh === 'h' ? 128 : 130, bot = v.sh === 'h' ? 156 : 157;
    return { still: 3, cap: v.sh === 'h' ? 'A lying round tank is narrow at the bottom and at the top: the same step of level is not the same volume.' : 'In a tank with straight walls the volume follows the level in a straight line.',
      svg: svg('The tank with its level', body + dyn('t1', 20, 40, 'class="t2"') + tx(20, 58, 'level', 'class="tm"')),
      run(e, t) { const k = Math.min(1, t / 2); level(e.w, bot, H * f * k); e.t1.textContent = F(v.lv * k, 2) + ' m'; } };
  });
  C.pic('conv', (v) => {
    const a = clamp(v.ang, 0, 90) * PI / 180, L = Math.min(250, a > 0.01 ? 112 / Math.sin(a) : 250), ex = 50 + L * Math.cos(a), ey = 150 - L * Math.sin(a), deg = -a * 180 / PI;
    return { still: 1.5, cap: 'The motor must beat the friction and, on a slope, lift the weight. Steeper or heavier needs more power.',
      svg: svg('A load moves on a conveyor at the given slope', `<path class="s" d="M50 150 L${ex.toFixed(1)} ${ey.toFixed(1)}"/><path class="s1" d="M50 150 H320"/><circle class="bd" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="11"/><g data-i="b"><rect class="hl" x="-15" y="-22" width="30" height="20" rx="2"/></g>`
        + tx(ex, ey + 4, 'M', MID) + tx(350, 30, F(v.m) + ' kg', END + ' class="t2"') + tx(350, 48, F(v.sp) + ' m/min', END) + tx(350, 64, 'slope ' + F(v.ang) + '°', END + ' class="tm"')),
      run(e, t) { const p = lp(t, 3.5, 0.6) * 0.86 + 0.06; A(e.b, 'transform', `translate(${(50 + L * p * Math.cos(a)).toFixed(1)} ${(150 - L * p * Math.sin(a)).toFixed(1)}) rotate(${deg.toFixed(1)})`); } };
  });
  C.pic('gear', (v) => ({ still: 1, cap: 'The gearbox trades speed for torque: the motor turns ' + F(v.i) + ' times for one turn of the drum.',
    svg: svg('A motor drives a belt through a gearbox', '<rect class="bd" x="14" y="66" width="62" height="48" rx="6"/><circle class="bd" cx="45" cy="90" r="14"/><path class="s" data-i="m" d="M45 90 L45 76"/><rect class="bd" x="86" y="62" width="44" height="56" rx="4"/><path class="s" d="M76 90 H86 M130 90 H150"/>'
      + '<path class="pp" d="M176 66 H320 M176 114 H320"/><path class="fl el" data-i="b" d="M176 66 H320"/><circle class="bd" cx="176" cy="90" r="24"/><circle class="bd" cx="320" cy="90" r="24"/><path class="s" data-i="d" d="M176 90 L176 66"/>'
      + tx(45, 136, 'motor', MID + ' class="tm"') + tx(108, 136, 'gear', MID + ' class="tm"') + tx(45, 54, F(v.n, 0) + ' rpm', MID) + tx(176, 136, F(v.n / v.i, 1) + ' rpm', MID) + tx(248, 50, F(PI * v.d / 1000 * v.n / v.i, 1) + ' m/min', MID + ' class="t2"')),
    run(e, t) { const am = t * 540, ad = am / clamp(v.i, 1, 60); A(e.m, 'transform', 'rotate(' + (am % 360).toFixed(0) + ' 45 90)'); A(e.d, 'transform', 'rotate(' + (ad % 360).toFixed(0) + ' 176 90)'); flow(e.b, t, clamp(540 / clamp(v.i, 1, 60) * PI / 180 * 24, 4, 200)); } }));
  C.pic('move', (v) => {
    const da = v.v * v.v / (2 * v.a), tri = 2 * da >= v.d, vp = tri ? Math.sqrt(v.a * v.d) : v.v, ta = vp / v.a, tc = tri ? 0 : (v.d - 2 * da) / v.v, T = 2 * ta + tc;
    const X = (tt) => 40 + 280 * tt / T, Y = (sp) => 100 - 66 * sp / Math.max(v.v, vp);
    const pos = (tt) => (tt < ta ? 0.5 * v.a * tt * tt : tt < ta + tc ? 0.5 * v.a * ta * ta + vp * (tt - ta) : v.d - 0.5 * v.a * (T - tt) * (T - tt));
    const vel = (tt) => (tt < ta ? v.a * tt : tt < ta + tc ? vp : v.a * (T - tt));
    return { still: 2, cap: tri ? 'The move is too short to reach the top speed: the speed goes up and straight down again.' : 'Ramp up, constant speed, ramp down. The area under the line is the distance.',
      svg: svg('Speed of the axis over time, and the axis moving', `<path class="s1" d="M40 ${Y(v.v).toFixed(1)} H320"/><path class="s" d="M40 26 V100 H326"/><path class="ac" d="M40 100 L${X(ta).toFixed(1)} ${Y(vp).toFixed(1)} L${X(ta + tc).toFixed(1)} ${Y(vp).toFixed(1)} L320 100"/><circle class="rd" data-i="dot" cx="40" cy="100" r="5"/>`
        + '<path class="s" d="M40 152 H320"/><rect class="hl" data-i="car" x="30" y="134" width="20" height="16" rx="2"/>' + tx(40, 18, 'speed', 'class="tm"') + tx(326, 114, 'time', END + ' class="tm"') + dyn('t1', 350, 30, END + ' class="t2"') + dyn('t2', 350, 48, END) + dyn('t3', 350, 172, END + ' class="tm"')),
      run(e, t) { const tt = lp(t, 4, 1) * T, s = pos(tt); A(e.dot, 'cx', X(tt)); A(e.dot, 'cy', Y(vel(tt))); A(e.car, 'x', 30 + 280 * s / v.d); e.t1.textContent = F(tt, 2) + ' s'; e.t2.textContent = F(vel(tt), 0) + ' mm/s'; e.t3.textContent = 'position ' + F(s, 0) + ' mm'; } };
  });
  C.pic('pneu', (v) => {
    const a1 = PI * v.d * v.d / 4, a2 = a1 - PI * v.rod * v.rod / 4, rh = clamp(56 * v.rod / v.d, 6, 40);
    return { still: 1, cap: 'Going out, the air pushes on the whole piston. Coming back, the rod takes away area, so the force is smaller.',
      svg: svg('A cylinder moves out and back', '<rect class="bd" x="50" y="62" width="190" height="60" rx="4"/><rect data-i="air" class="wa" x="52" y="64" width="0" height="56"/><rect class="bd" data-i="rod" x="80" y="' + (92 - rh / 2).toFixed(1) + '" width="150" height="' + rh.toFixed(1) + '"/><rect class="gn" data-i="p" x="70" y="64" width="12" height="56"/>'
        + '<path class="s" d="M70 122 V140 M222 122 V140"/>' + tx(70, 154, 'port A', MID + ' class="tm"') + tx(222, 154, 'port B', MID + ' class="tm"') + dyn('t1', 20, 30, 'class="t2"') + dyn('t2', 20, 48)),
      run(e, t) {
        const c = t % 4.4, out = c < 2.2, k = out ? Math.min(1, c / 1.6) : 1 - Math.min(1, (c - 2.2) / 1.6), xp = 62 + 104 * k;
        A(e.p, 'x', xp); A(e.rod, 'x', xp + 12);
        if (out) { A(e.air, 'x', 52); A(e.air, 'width', Math.max(0, xp - 52)); } else { A(e.air, 'x', xp + 12); A(e.air, 'width', Math.max(0, 238 - xp - 12)); }
        e.t1.textContent = out ? 'OUT: ' + F(0.1 * v.p * a1, 0) + ' N' : 'BACK: ' + F(0.1 * v.p * a2, 0) + ' N'; e.t2.textContent = 'air ' + F(v.p) + ' bar on port ' + (out ? 'A' : 'B');
      } };
  });
  C.pic('cable', (v, x) => {
    const th = clamp(2 + 2.2 * Math.log(x.a + 1), 3, 13), end = v.u - x.d;
    return { still: 1, cap: 'A longer or thinner cable loses more voltage on the way. The load only gets what is left.',
      svg: svg('Voltage at the start and at the end of the cable', '<rect class="bd" x="12" y="60" width="74" height="60" rx="6"/><rect class="bd" x="274" y="60" width="74" height="60" rx="6"/>' + `<path d="M86 90 H274" style="fill:none;stroke:currentColor;opacity:.2;stroke-width:${th.toFixed(1)}"/>` + '<path class="fl el" data-i="f" d="M86 90 H274"/>'
        + tx(49, 86, 'supply', MID + ' class="tm"') + tx(49, 104, F(v.u, 1) + ' V', MID + ' class="t2"') + tx(311, 86, 'load', MID + ' class="tm"') + dyn('t1', 311, 104, MID + ' class="t2"') + tx(180, 70, F(x.a) + ' mm²   ' + F(v.l) + ' m', MID) + dyn('t2', 180, 120, MID) + tx(180, 150, F(v.i) + ' A', MID + ' class="tm"')),
      run(e, t) { const k = Math.min(1, t / 1.5); flow(e.f, t, 60); e.t1.textContent = F(v.u - x.d * k, 1) + ' V'; e.t2.textContent = 'lost on the way: ' + F(x.d * k, 2) + ' V'; if (end < 0) e.t1.textContent = '0 V'; } };
  });
  C.pic('ma', (v) => {
    const ma = v.dir === 'm' ? v.x : 4 + (v.x - v.lo) / (v.hi - v.lo) * 16, px = (m) => 30 + 12.5 * clamp(m, 0, 24);
    let ticks = '';
    [4, 8, 12, 16, 20].forEach((m) => { ticks += `<path class="s" d="M${px(m)} 84 V100"/>` + tx(px(m), 76, m + '', MID) + tx(px(m), 118, F(v.lo + (m - 4) / 16 * (v.hi - v.lo), 2), MID + ' class="tm"'); });
    return { still: 2, cap: 'Green is the working range. Below 3.6 mA or above 21 mA the signal reports a fault, for example a broken wire.',
      svg: svg('A 4 to 20 mA scale with a pointer', `<rect class="bz" x="${px(0)}" y="86" width="${px(3.6) - px(0)}" height="12"/><rect class="hl" x="${px(4)}" y="86" width="${px(20) - px(4)}" height="12"/><rect class="bz" x="${px(21)}" y="86" width="${px(24) - px(21)}" height="12"/>` + ticks
        + '<path class="rd" data-i="p" d="M0 84 L-7 66 L7 66 Z"/>' + tx(30, 150, 'mA', 'class="tm"') + dyn('t1', 180, 40, MID + ' class="t2"') + tx(px(1.8), 136, 'fault', MID + ' class="tm"') + tx(px(22.5), 136, 'fault', MID + ' class="tm"')),
      run(e, t) { const k = Math.min(1, t / 1.4), m = 4 + (ma - 4) * (1 - (1 - k) * (1 - k)); A(e.p, 'transform', 'translate(' + px(m).toFixed(1) + ' 0)'); e.t1.textContent = F(m, 2) + ' mA  =  ' + F(v.lo + (m - 4) / 16 * (v.hi - v.lo), 2); } };
  });
  C.pic('scale', (v, x) => {
    const X = (p) => 40 + 2.8 * clamp(p, -8, 108), e0 = v.e0, e1 = v.e1;
    return { still: 2, cap: 'Scaling is a straight line: the same position on the raw bar and on the real bar.',
      svg: svg('The raw range and the real range side by side', '<rect class="bd" x="40" y="44" width="280" height="16"/><rect class="hl" x="40" y="116" width="280" height="16"/><path class="ac" data-i="l" d="M40 38 V138"/>'
        + tx(40, 34, F(x.r0), MID + ' class="tm"') + tx(320, 34, F(x.r1), MID + ' class="tm"') + tx(40, 150, F(e0), MID + ' class="tm"') + tx(320, 150, F(e1), MID + ' class="tm"') + tx(12, 56, 'raw', 'class="tm"') + tx(8, 128, 'real', 'class="tm"') + dyn('t1', 180, 84, 'class="t2"') + dyn('t2', 180, 104, 'class="t2"')),
      run(e, t) { const k = Math.min(1, t / 1.4), p = x.pct * k, xx = X(p); A(e.l, 'd', `M${xx.toFixed(1)} 38 V138`); [e.t1, e.t2].forEach((n) => { A(n, 'x', p < 50 ? xx + 8 : xx - 8); A(n, 'text-anchor', p < 50 ? 'start' : 'end'); }); e.t1.textContent = 'raw ' + F(x.r0 + (x.r1 - x.r0) * p / 100, 0); e.t2.textContent = 'value ' + F(e0 + (e1 - e0) * p / 100, 2); } };
  });
  C.pic('track', (v) => {
    const mmps = v.sp * 1000 / 60, T = v.d / mmps;
    return { still: 2.5, cap: 'The PLC remembers the part at the sensor and acts when it has travelled the distance to the gate.',
      svg: svg('A part travels from the sensor to the reject gate', '<path class="s" d="M20 122 H340"/><path class="s1" d="M80 40 V122 M280 40 V122"/><rect class="bd" x="72" y="24" width="16" height="18" rx="3"/><path class="s" data-i="g" d="M280 60 V96"/><rect class="hl" data-i="b" x="20" y="98" width="30" height="22" rx="2"/>'
        + tx(80, 16, 'sensor', MID + ' class="tm"') + tx(280, 16, 'gate', MID + ' class="tm"') + tx(180, 140, F(v.d) + ' mm', MID + ' class="tm"') + dyn('t1', 180, 60, MID + ' class="t2"') + dyn('t2', 180, 80, MID)),
      run(e, t) {
        const p = lp(t, 5, 0.8), xx = 20 + 300 * p, cx = xx + 15, f = clamp((cx - 80) / 200, 0, 1), hit = cx >= 280;
        A(e.b, 'x', xx); A(e.b, 'y', hit ? 98 + Math.min(40, (cx - 280) * 1.2) : 98); A(e.g, 'transform', 'rotate(' + (hit ? -40 : 0) + ' 280 60)');
        e.t1.textContent = cx < 80 ? 'waiting for the part' : hit ? 'GATE FIRES' : F(f * T, 2) + ' s'; e.t2.textContent = cx < 80 ? '' : v.mm > 0 ? F(f * v.d / v.mm, 0) + ' counts' : F(f * v.d, 0) + ' mm';
      } };
  });
  C.pic('filt', (v) => {
    let d = 'M40 140'; for (let i = 1; i <= 60; i++) d += ` L${(40 + 290 * i / 60).toFixed(1)} ${(140 - 110 * (1 - Math.exp(-5 * i / 60))).toFixed(1)}`;
    const xt = (k) => 40 + 290 * k / 5;
    return { still: 1.5, cap: 'The input jumps at once (dotted). The filtered value follows slowly: 63 % after one time constant, 95 % after three.',
      svg: svg('A jump of the input and the filtered value following it', '<path class="s" d="M40 22 V140 H336"/><path class="s1" d="M40 30 H330"/>' + `<path class="s1" d="M${xt(1)} 30 V140 M${xt(3)} 30 V140"/>` + `<path class="ac" d="${d}"/><circle class="rd" data-i="dot" cx="40" cy="140" r="5"/>`
        + tx(xt(1), 156, F(v.tau, 2) + ' s', MID + ' class="tm"') + tx(xt(3), 156, F(3 * v.tau, 2) + ' s', MID + ' class="tm"') + tx(xt(1) + 4, 96, '63 %', 'class="tm"') + tx(xt(3) + 4, 50, '95 %', 'class="tm"') + dyn('t1', 330, 120, END + ' class="t2"')),
      run(e, t) { const p = lp(t, 4, 1), y = 1 - Math.exp(-5 * p); A(e.dot, 'cx', 40 + 290 * p); A(e.dot, 'cy', 140 - 110 * y); e.t1.textContent = F(5 * v.tau * p, 2) + ' s: ' + F(y * 100, 0) + ' %'; } };
  });
})();
