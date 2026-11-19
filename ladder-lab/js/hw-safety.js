/* Ladder Lab — "A safety relay on the rail". Mounted in lessons through [[hw:safetyrelay]].
 * One safety relay with its sensor (E-stop, guard door, light curtain), its reset button, the feedback loop
 * and two contactors. Pick a layout: the terminal names and LEDs change, the behaviour is the same.
 * Operate it, make faults, and read the LEDs like in front of a real cabinet.
 * The behaviour is in LL.SafetySim (pure, tested in node); the rest is the drawing. Our own drawing, no maker's logo. */
(function (G) {
  const LL = (G.LL = G.LL || {});

  // ───────────── behaviour ─────────────
  // cfg: { app: 'estop2' | 'estop1' | 'door' | 'curtain', auto, fb, delay, faults: { weld1, break2, cross, weldK1, stuck } }
  // inp: { act (sensor actuated: E-stop pressed, door open, beam broken), reset (button held), power }
  const SafetySim = {
    init(cfg) { return { cfg, power: 0, in1: 0, in2: 0, out: 0, fault: 0, needOpen: 0, startC: 0, startPrev: 0, k1: 0, k2: 0, tdel: 0, ramp: 0, motor: 0, why: 'off', said: '' }; },
    step(st, inp, dt) {
      const c = st.cfg, F = c.faults || {}, two = c.app !== 'estop1';
      const c1 = !inp.act || F.weld1 ? 1 : 0;                       // channel 1 contact closed (a welded contact never opens)
      let c2 = two ? (inp.act ? 0 : 1) : c1;
      if (two && F.break2) c2 = 0;                                  // broken wire in channel 2
      st.said = '';
      if (!inp.power) { Object.assign(st, { power: 0, in1: 0, in2: 0, fault: 0, needOpen: 0, startC: 0, startPrev: 0, why: 'off' }); if (st.out) { st.out = 0; st.tdel = 0; } }
      else {
        st.power = 1; st.in1 = c1; st.in2 = c2;
        if (two && F.cross && c.app !== 'curtain') st.fault = 1;    // short between the channels: found by the relay's test pulses, latched
        const fbOk = c.fb ? !st.k1 && !st.k2 : true;                // feedback loop: both contactors must have dropped
        const btn = c.auto ? 1 : inp.reset || F.stuck ? 1 : 0;
        const startC = btn && fbOk ? 1 : 0, edge = startC && !st.startPrev, inOk = st.in1 && st.in2;
        if (!st.in1 && !st.in2) st.needOpen = 0;                    // both channels were open together: the relay is ready again
        if (st.out) {
          if (st.fault || !inOk) { st.out = 0; st.needOpen = st.in1 || st.in2 ? 1 : 0; st.tdel = c.delay ? 1500 : 0; }
        } else if (inOk && !st.fault && !st.needOpen && (c.auto ? startC : edge)) st.out = 1;
        // why it is in this state, in one word (for the text and the practice goals)
        st.why = st.out ? 'on' : st.fault ? 'cross' : !inOk ? (st.in1 !== st.in2 && !inp.act ? 'onech' : 'input') : st.needOpen ? 'needopen' : c.fb && (st.k1 || st.k2) && st.tdel <= 0 ? 'fb' : !c.auto && F.stuck ? 'stuck' : 'wait';
        if (!c.auto && inp.reset && !st.resetPrev && !st.out) st.said = st.why;   // a reset press that did not start it
        st.startC = startC; st.startPrev = startC; st.resetPrev = inp.reset ? 1 : 0;
      }
      if (!inp.power) st.resetPrev = 0;
      // the contactors follow the safety outputs; with delayed outputs they hold for the ramp time first
      if (st.out) { st.k1 = 1; st.k2 = 1; st.ramp = 0; st.tdel = 0; }
      else {
        if (st.tdel > 0) { st.tdel -= dt; st.ramp = 1; }
        if (st.tdel <= 0) { st.tdel = 0; st.ramp = 0; if (!F.weldK1) st.k1 = 0; st.k2 = 0; }
      }
      st.motor = st.k1 && st.k2 ? 1 : 0;
      return st;
    },
  };
  LL.SafetySim = SafetySim;
  if (typeof document === 'undefined') return;

  // ───────────── five common layouts of terminal names and LEDs (no maker names; always check your own datasheet) ─────────────
  const BR = {
    a: { n: 'Layout A · 6 LEDs', kind: 'S11 / S12 · start S34', fill: '#f5c400', ink: '#1b1b1b', ch1: ['S11', 'S12'], ch2: ['S21', 'S22'], start: 'S34', outs: ['13-14', '23-24'], aux: 'Y32',
      top: ['A1', '13', '23', '33', 'S12', 'S22', 'S34', '41'], bot: ['S11', 'S21', 'Y32', '42', 'A2', '14', '24', '34'], leds: [['Power', 'power'], ['In1', 'in1'], ['In2', 'in2'], ['Out', 'out'], ['Reset', 'start'], ['Fault', 'fault']] },
    b: { n: 'Layout B · 4 LEDs', kind: 'T1 / IN1 · start INS', fill: '#3f4a55', ink: '#ffffff', band: '#f5c400', ch1: ['T1', 'IN1'], ch2: ['T2', 'IN2'], start: 'INS', outs: ['13-14', '23-24'], aux: '41-42',
      top: ['A1', 'T1', 'IN1', 'INS', '13', '23', '33', '41'], bot: ['A2', 'T2', 'IN2', 'INF', '14', '24', '34', '42'], leds: [['DEVICE', 'power'], ['OUT', 'out'], ['IN', 'in'], ['SF', 'fault']] },
    c: { n: 'Layout C · 3 LEDs', kind: 'S11 / S12 · start S33-S34', fill: '#dfe3e8', ink: '#1b1b1b', band: '#d6001c', ch1: ['S11', 'S12'], ch2: ['S21', 'S22'], start: 'S33-S34', outs: ['13-14', '23-24'], aux: '33-34',
      top: ['A1', 'S11', 'S12', 'S33', '13', '23', '33', ''], bot: ['A2', 'S21', 'S22', 'S34', '14', '24', '34', ''], leds: [['A1/A2', 'power'], ['K1', 'out'], ['K2', 'out']] },
    d: { n: 'Layout D · 4 LEDs', kind: 'T11 / T12 · start T31-T32', fill: '#f2c100', ink: '#1b1b1b', ch1: ['T11', 'T12'], ch2: ['T21', 'T22'], start: 'T31-T32', outs: ['13-14', '23-24'], aux: 'X1',
      top: ['A1', 'T11', 'T12', 'T31', '13', '23', '33', '43'], bot: ['A2', 'T21', 'T22', 'T32', '14', '24', '34', '44'], leds: [['PWR', 'power'], ['IN1', 'in1'], ['IN2', 'in2'], ['OUT', 'out']] },
    e: { n: 'Layout E · 3 LEDs', kind: 'S11 / S12 · start S34', fill: '#c62828', ink: '#ffffff', ch1: ['S11', 'S12'], ch2: ['S21', 'S22'], start: 'S34', outs: ['13-14', '23-24'], aux: 'Y32',
      top: ['A1', 'S11', 'S12', 'S34', '13', '23', '', ''], bot: ['A2', 'S21', 'S22', 'Y32', '14', '24', '', ''], leds: [['PWR/Fault', 'pwrf'], ['IN', 'in'], ['OUT', 'out']] },
  };
  const APPS = { estop2: ['E-stop, 2 channels', 'E-stop', 'Press the E-stop', 'Release the E-stop'], estop1: ['E-stop, 1 channel', 'E-stop', 'Press the E-stop', 'Release the E-stop'], door: ['Guard door, 2 switches', 'door', 'Open the door', 'Close the door'], curtain: ['Light curtain', 'curtain', 'Break the beam', 'Clear the beam'] };
  const FAULTS = [['weld1', 'Channel 1 contact welded'], ['break2', 'Wire broken in channel 2'], ['cross', 'Short between the channels'], ['weldK1', 'Contactor K1 welded'], ['stuck', 'Reset button stuck']];
  const CHECKS = [
    ['start', 'Start it: with the reset button, all channels closed.'],
    ['trip', 'Trip it with the sensor, release it, and see that it stays OFF until you press reset.'],
    ['weld', 'Two channels: weld the channel 1 contact, trip the sensor, then try to reset. The relay refuses.'],
    ['one', 'One channel: weld the contact, then press the E-stop. The motor keeps running: this is why one channel is not enough.'],
    ['cross', 'Make a short between the channels: the relay goes to FAULT.'],
    ['fb', 'Weld contactor K1 with the feedback loop wired: after a stop, reset is refused.'],
    ['nofb', 'The same without the feedback loop: the relay starts again on a welded contactor. Dangerous.'],
    ['stuck', 'Reset button stuck: the relay does not start by itself. It needs a new press.'],
    ['auto', 'Automatic start: release the sensor and the outputs come back by themselves.'],
  ];
  const STORE = 'll-hw-safetyrelay';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const CSS = `
.hw-sr{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:14px 0;text-align:left}
.hsr-swipe{display:none;font-size:.78rem;color:var(--muted);margin:4px 0 0}@media(max-width:640px){.hsr-swipe{display:block}}
.hsr-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 8px}.hsr-row>span{font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-right:2px}
.hsr-row button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-weight:600;font-size:.82rem;cursor:pointer;min-height:36px}
.hsr-row button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.hsr-row button.bad.on{background:var(--danger);border-color:var(--danger);color:#fff}
.hsr-svg{background:var(--surface-2);border-radius:10px;overflow-x:auto}.hsr-svg svg{display:block;width:100%;min-width:560px;height:auto}
.hsr-act{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.hsr-act .btn.hot{background:var(--danger);border-color:var(--danger);color:#fff}
.hsr-say{border-left:4px solid var(--info);background:var(--surface-2);border-radius:8px;padding:8px 12px;font-size:.9rem;margin:8px 0}.hsr-say.good{border-left-color:var(--power)}.hsr-say.bad{border-left-color:var(--danger);background:var(--danger-soft)}
.hsr-sec{display:flex;justify-content:space-between;font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:12px 0 6px}
.hsr-chk{display:grid;gap:6px}.hsr-chk div{background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:.86rem}.hsr-chk div.ok{background:var(--power-soft)}.hsr-chk div::before{content:"○ ";color:var(--muted)}.hsr-chk div.ok::before{content:"✓ ";color:var(--power)}
.hsr-note{font-size:.8rem;color:var(--muted);margin:6px 0 0}.hw-sr [hidden]{display:none!important}`;

  LL.HW = LL.HW || {};
  LL.HW.safetyrelay = function (ph) {
    if (!document.getElementById('hw-sr-css')) { const s = document.createElement('style'); s.id = 'hw-sr-css'; s.textContent = CSS; document.head.appendChild(s); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    const cfg = { app: 'estop2', auto: false, fb: true, delay: false, faults: {} };
    let brand = 'a', st = SafetySim.init(cfg), inp = { act: false, reset: false, power: true }, sawTrip = false, blink = 0, lastSig = '';
    const box = document.createElement('div'); box.className = 'hw-box hw-sr';
    box.innerHTML = `<div class="hsr-row" data-g="brand"><span>Relay layout</span>${Object.keys(BR).map((k) => `<button data-b="${k}">${esc(BR[k].n)}</button>`).join('')}</div>
      <div class="hsr-row" data-g="app"><span>Used for</span>${Object.keys(APPS).map((k) => `<button data-app="${k}">${esc(APPS[k][0])}</button>`).join('')}</div>
      <div class="hsr-row"><span>Start</span><button data-o="auto" data-v="0">reset button (monitored)</button><button data-o="auto" data-v="1">automatic</button><span style="margin-left:8px">Feedback loop</span><button data-o="fb" data-v="1">wired</button><button data-o="fb" data-v="0">not wired</button><span style="margin-left:8px">Outputs</span><button data-o="delay" data-v="0">at once</button><button data-o="delay" data-v="1">delayed 1.5 s</button></div>
      <div class="hsr-svg"></div>
      <p class="hsr-swipe">Swipe the drawing sideways to see the contactors and the motor.</p>
      <div class="hsr-act"><button class="btn" data-a="act"></button><button class="btn primary" data-a="reset">Press RESET</button><button class="btn ghost" data-a="power"></button></div>
      <div class="hsr-say"></div>
      <div class="hsr-row"><span>Make a fault</span>${FAULTS.map(([k, t]) => `<button class="bad" data-f="${k}">${esc(t)}</button>`).join('')}<button data-f="">no faults</button></div>
      <p class="hsr-note"></p>
      <div class="hsr-sec"><span>Try these</span><span class="hsr-prog"></span></div><div class="hsr-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    const mark = (k) => { if (!done[k]) { done[k] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } checks(); } };
    function checks() { $('.hsr-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join(''); $('.hsr-prog').textContent = CHECKS.filter(([k]) => done[k]).length + ' / ' + CHECKS.length; }

    function svg() {
      const B = BR[brand], F = cfg.faults, two = cfg.app !== 'estop1', cur = cfg.app === 'curtain', ON = 'var(--power-bright)', OFF = 'var(--wire)', INK = 'currentColor';
      const w = (d, on, dash) => `<path d="${d}" fill="none" stroke="${on ? ON : OFF}" stroke-width="${on ? 2.2 : 1.5}"${dash ? ' stroke-dasharray="4 4"' : ''}/>`;
      const T = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-size="${o.z || 10}" ${o.b ? 'font-weight="700" ' : ''}fill="${o.f || INK}" text-anchor="${o.a || 'start'}"${o.m ? ' font-family="IBM Plex Mono, monospace"' : ''}>${esc(s)}</text>`; };
      // a contact drawn on a horizontal wire: closed = a bar, open = a lifted bar
      const contact = (x, y, closed, lab, bad) => `<circle cx="${x}" cy="${y}" r="2" fill="${INK}"/><circle cx="${x + 24}" cy="${y}" r="2" fill="${INK}"/>` + (closed ? `<path d="M${x} ${y} H${x + 24}" stroke="${bad ? 'var(--danger)' : INK}" stroke-width="2"/>` : `<path d="M${x} ${y} L${x + 21} ${y - 11}" stroke="${INK}" stroke-width="1.8"/>`) + T(x + 12, y - 15, lab, { z: 9, a: 'middle', f: bad ? 'var(--danger)' : 'var(--muted)', b: bad });
      const p = st.power, c1 = !inp.act || F.weld1, c2 = two ? !inp.act && !F.break2 : c1;
      let g = '';
      // ── the sensor, top left
      const lab = cur ? (inp.act ? 'beam broken' : 'beam free') : cfg.app === 'door' ? (inp.act ? 'door open' : 'door closed') : inp.act ? 'E-stop pressed' : 'E-stop released';
      if (cur) g += `<rect x="40" y="26" width="10" height="56" rx="3" fill="var(--accent-bg)"/><rect x="150" y="26" width="10" height="56" rx="3" fill="var(--accent-bg)"/>` + [36, 48, 60, 72].map((y) => `<path d="M50 ${y} H150" stroke="${inp.act ? 'var(--line)' : 'var(--danger)'}" stroke-width="1.2" stroke-dasharray="${inp.act ? '3 5' : ''}"/>`).join('') + (inp.act ? `<circle cx="100" cy="54" r="12" fill="var(--muted)"/>` : '');
      else if (cfg.app === 'door') g += `<rect x="50" y="24" width="96" height="60" rx="4" fill="none" stroke="${INK}" stroke-width="1.5"/>` + (inp.act ? `<path d="M50 24 L96 12 V72 L50 84" fill="var(--surface-3)" stroke="${INK}" stroke-width="1.5"/>` : `<path d="M98 24 V84" stroke="${INK}" stroke-width="1.5"/><circle cx="90" cy="54" r="2.5" fill="${INK}"/>`);
      else g += `<rect x="72" y="58" width="56" height="26" rx="5" fill="var(--accent-bg)"/><ellipse cx="100" cy="${inp.act ? 54 : 44}" rx="34" ry="13" fill="#d02a2a"/><rect x="92" y="${inp.act ? 54 : 46}" width="16" height="14" fill="#a11"/>`;
      g += T(100, 100, lab, { a: 'middle', b: 1, f: inp.act ? 'var(--danger)' : INK });
      // ── the two channels (a loop out of the relay, through the contact, and back), or the two OSSD wires of a curtain
      const chan = (y, nm, closed, live, bad, show) => {
        if (!show) return T(282, y + 4, nm[1], { z: 9, a: 'end', m: 1, f: 'var(--muted)' }) + w(`M250 ${y} H290`, false, true) + T(180, y + 4, 'bridged in the relay wiring', { z: 9, a: 'middle', f: 'var(--muted)' });
        if (cur) return w(`M160 ${y < 170 ? 44 : 64} H${y < 170 ? 216 : 200} V${y} H290`, live) + T(282, y - 5, nm[1], { z: 9, a: 'end', m: 1 }) + T(206, y - 5, y < 170 ? 'OSSD 1' : 'OSSD 2', { z: 9, f: 'var(--muted)' });
        return w(`M290 ${y - 20} H70 V${y + 11} H128`, p) + contact(128, y + 11, closed, y < 170 ? 'contact 1' : 'contact 2', bad) + w(`M152 ${y + 11} H290`, live) + T(282, y - 25, nm[0], { z: 9, a: 'end', m: 1 }) + T(282, y + 6, nm[1], { z: 9, a: 'end', m: 1 });
      };
      g += chan(140, B.ch1, c1, p && st.in1, !!F.weld1, true) + chan(205, B.ch2, c2, p && st.in2, false, two);
      if (two && F.break2 && !cur) g += `<path d="M214 211 l8 10 M222 211 l-8 10" stroke="var(--danger)" stroke-width="2"/>` + T(218, 236, 'wire broken', { z: 9, a: 'middle', f: 'var(--danger)', b: 1 });
      if (two && F.cross && !cur) g += `<path d="M236 151 V216" stroke="var(--danger)" stroke-width="2.4"/>` + T(242, 186, 'short', { z: 9, f: 'var(--danger)', b: 1 });
      // ── the start circuit: feedback contacts of K1 and K2, then the reset button
      const fb1 = !st.k1, fb2 = !st.k2, btn = inp.reset || F.stuck, sy = 300;
      g += w(`M40 ${sy} H56`, p) + (cfg.fb ? contact(56, sy, fb1, 'K1', !fb1 && !st.out) + w(`M80 ${sy} H96`, p && fb1) + contact(96, sy, fb2, 'K2') : w(`M56 ${sy} H120`, p) + T(88, sy - 8, 'no feedback loop', { z: 9, a: 'middle', f: 'var(--danger)', b: 1 }));
      const fbOn = p && (cfg.fb ? fb1 && fb2 : true);
      g += w(`M120 ${sy} H168`, fbOn) + (cfg.auto ? w(`M168 ${sy} H192`, fbOn) + T(180, sy - 8, 'bridge', { z: 9, a: 'middle', f: 'var(--muted)' }) : contact(168, sy, btn, 'RESET', !!F.stuck)) + w(`M192 ${sy} H290`, fbOn && (cfg.auto || btn)) + T(282, sy - 5, B.start, { z: 9, a: 'end', m: 1 }) + T(40, sy + 18, cfg.fb ? 'feedback loop (K1, K2) + reset button' : 'start circuit', { z: 9, f: 'var(--muted)' });
      // ── the relay, drawn like the real unit
      g += `<rect x="290" y="14" width="140" height="330" rx="10" fill="${B.fill}" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>` + (B.band ? `<rect x="290" y="86" width="140" height="10" fill="${B.band}"/>` : '');
      const block = (y, names) => `<rect x="298" y="${y}" width="124" height="46" rx="5" fill="#16191c"/>` + names.map((n, i) => { const x = 313 + (i % 4) * 31, yy = y + 18 + Math.floor(i / 4) * 20; return n ? `<rect x="${x - 11}" y="${yy - 11}" width="22" height="15" rx="2.5" fill="#f5c400"/>` + T(x, yy, n, { z: n.length > 3 ? 6.5 : 8, a: 'middle', m: 1, b: 1, f: '#16191c' }) : ''; }).join('');
      g += block(20, B.top) + block(292, B.bot) + T(360, 116, 'SAFETY RELAY', { z: 10, a: 'middle', b: 1, f: B.ink }) + T(360, 129, B.kind, { z: 8.5, a: 'middle', f: B.ink }) + `<rect x="316" y="138" width="88" height="20" rx="3" fill="#fff" stroke="rgba(0,0,0,.3)"/>` + T(360, 152, '-KF50', { z: 11, a: 'middle', m: 1, b: 1, f: '#16191c' });
      const val = { power: p, in1: p && st.in1, in2: p && st.in2, in: p && st.in1 && st.in2, out: p && st.out, start: p && st.startC, fault: p && (st.fault || (st.why === 'needopen' && blink)), pwrf: p };
      B.leds.forEach(([name, k], i) => { const y = 176 + i * 18, on = !!val[k], red = k === 'fault' || (k === 'pwrf' && st.fault) || (k === 'power' && brand === 'b' && st.fault); g += `<rect x="304" y="${y - 6}" width="12" height="9" rx="2" fill="${on ? (red ? '#ff3b30' : '#35e06f') : 'rgba(0,0,0,.28)'}" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>` + T(322, y + 2, name, { z: 9.5, f: B.ink, m: 1 }); });
      // ── outputs: two contactors in series in the motor circuit
      const o = p && st.out, kbox = (y, nm, on, weld) => `<rect x="520" y="${y - 16}" width="62" height="32" rx="6" fill="${on ? 'var(--power-soft)' : 'var(--surface)'}" stroke="${weld ? 'var(--danger)' : on ? ON : 'var(--line)'}" stroke-width="1.6"/>` + T(551, y + 4, nm, { a: 'middle', b: 1, m: 1, z: 12, f: weld ? 'var(--danger)' : INK }) + (weld ? T(551, y + 30, 'welded', { z: 9, a: 'middle', f: 'var(--danger)', b: 1 }) : '');
      g += w('M430 140 H520', o || (st.ramp && p)) + T(438, 134, B.outs[0], { z: 9, m: 1 }) + kbox(140, 'K1', st.k1, F.weldK1 && st.k1) + w('M430 205 H520', o || (st.ramp && p)) + T(438, 199, B.outs[1], { z: 9, m: 1 }) + kbox(205, 'K2', st.k2, false);
      if (cfg.delay) g += T(476, 222, st.ramp ? 'holding ' + (st.tdel / 1000).toFixed(1) + ' s' : 'delayed contacts', { z: 9, a: 'middle', f: st.ramp ? 'var(--accent)' : 'var(--muted)', b: !!st.ramp });
      g += w('M430 262 H470', o) + T(438, 256, B.aux, { z: 9, m: 1 }) + T(476, 266, '→ to the PLC: relay is on', { z: 9, f: 'var(--muted)' });
      // motor circuit on the right
      const m1 = st.k1, m2 = st.k2, run = st.motor;
      g += T(650, 30, 'L1 L2 L3', { z: 9, a: 'middle', m: 1 }) + w('M650 36 V118', true) + (m1 ? w('M650 118 V162', true) : `<path d="M650 162 L640 124" stroke="${INK}" stroke-width="1.8" fill="none"/>`) + T(664, 144, 'K1', { z: 10, b: 1, m: 1 }) + w('M650 162 V183', m1) + (m2 ? w('M650 183 V227', m1) : `<path d="M650 227 L640 189" stroke="${INK}" stroke-width="1.8" fill="none"/>`) + T(664, 209, 'K2', { z: 10, b: 1, m: 1 }) + w('M650 227 V262', run);
      g += `<circle cx="650" cy="290" r="28" fill="var(--surface)" stroke="${run ? ON : INK}" stroke-width="${run ? 2.6 : 1.5}"/>` + T(650, 295, 'M', { z: 16, a: 'middle', b: 1 }) + T(650, 334, run ? (st.ramp ? 'drive ramps down' : 'RUNNING') : 'stopped', { a: 'middle', b: 1, f: run ? (st.ramp ? 'var(--accent)' : 'var(--power)') : 'var(--muted)' });
      return `<svg viewBox="0 0 720 352" role="img" aria-label="Safety relay with sensor, reset button, feedback loop and two contactors" font-family="IBM Plex Sans, sans-serif">${g}</svg>`;
    }
    function say() {
      const two = cfg.app !== 'estop1', F = cfg.faults, A = APPS[cfg.app];
      const t = {
        off: ['The relay has no supply: all outputs are open.', ''],
        on: [cfg.app === 'estop1' && F.weld1 && inp.act ? '<b>The E-stop is pressed, but the motor still runs.</b> The contact is welded, and with one channel nothing else can open the circuit.' : 'Outputs ON: ' + (two ? 'both channels are closed' : 'the channel is closed') + ' and the start was given. K1 and K2 are in, the motor runs.', cfg.app === 'estop1' && F.weld1 && inp.act ? 'bad' : 'good'],
        cross: ['<b>FAULT:</b> the relay found a short between channel 1 and channel 2 (its test pulses arrive on the wrong input). Outputs stay off. Remove the short, then switch the supply off and on.', 'bad'],
        input: ['Outputs OFF: ' + (inp.act ? 'the ' + A[1] + ' opened the channels.' : 'a channel is open.'), ''],
        onech: ['Outputs OFF: <b>only one channel is closed.</b> Look at the IN LEDs: one is dark. A broken wire or a contact that does not close.', 'bad'],
        needopen: ['<b>The relay refuses to start.</b> One channel never opened when the other one did. A welded contact or a bridged wire. It waits until both channels have been open together.', 'bad'],
        fb: ['<b>The relay refuses to start: the feedback loop is open.</b> A contactor did not drop out (K1 is welded). The NC contact in the start circuit keeps it open.', 'bad'],
        stuck: ['The reset button is closed all the time. A monitored start needs a <b>new press</b>, so the relay does not start by itself.', 'bad'],
        wait: [cfg.auto ? 'Ready.' : 'Channels closed, outputs still OFF: the relay waits for the <b>reset button</b>.', ''],
      }[st.why] || ['', ''];
      let extra = '';
      if (st.why === 'on' && !cfg.fb && F.weldK1) extra = ' <b>Danger:</b> K1 is welded and nobody noticed, because there is no feedback loop. Only K2 can stop the motor now.';
      if (st.why === 'on' && cfg.auto) extra += ' Automatic start is only allowed where nobody can stand inside the danger zone.';
      if (st.ramp) extra += ' The delayed contacts hold for 1.5 s while the drive brakes the motor (stop category 1).';
      const e = $('.hsr-say'); e.className = 'hsr-say ' + t[1]; e.innerHTML = t[0] + extra;
    }
    function ui() {
      box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === brand));
      box.querySelectorAll('[data-app]').forEach((b) => b.classList.toggle('on', b.dataset.app === cfg.app));
      box.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('on', String(+!!cfg[b.dataset.o]) === b.dataset.v));
      box.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f ? !!cfg.faults[b.dataset.f] : !Object.keys(cfg.faults).some((k) => cfg.faults[k])));
      const a = $('[data-a="act"]'); a.textContent = inp.act ? APPS[cfg.app][3] : APPS[cfg.app][2]; a.classList.toggle('hot', inp.act);
      $('[data-a="power"]').textContent = inp.power ? 'Supply off' : 'Supply on'; $('[data-a="reset"]').hidden = cfg.auto;
      $('.hsr-note').textContent = 'Five common terminal and LED layouts. Makers use different names, and change them between types: always check the datasheet of your relay.';
    }
    function tick(dt) {
      const before = st.out;
      SafetySim.step(st, inp, dt);
      // practice goals
      if (st.out && !before && !cfg.auto && !Object.keys(cfg.faults).some((k) => cfg.faults[k])) { mark('start'); if (sawTrip) mark('trip'); }
      if (!st.out && before && inp.act) sawTrip = true;
      if (st.said === 'needopen' && cfg.faults.weld1) mark('weld');
      if (cfg.app === 'estop1' && cfg.faults.weld1 && inp.act && st.out) mark('one');
      if (st.fault) mark('cross');
      if (st.said === 'fb' && cfg.faults.weldK1) mark('fb');
      if (st.out && !before && !cfg.fb && cfg.faults.weldK1 && st.k1) mark('nofb');
      if (st.why === 'stuck') mark('stuck');
      if (st.out && !before && cfg.auto && sawTrip) mark('auto');
      if (st.out && !before && cfg.faults.weldK1 && !cfg.fb) sawTrip = false;
      const sig = [brand, cfg.app, cfg.auto, cfg.fb, cfg.delay, JSON.stringify(cfg.faults), inp.act, inp.reset, inp.power, st.out, st.in1, st.in2, st.fault, st.k1, st.k2, st.why, st.startC, Math.ceil(st.tdel / 100), st.why === 'needopen' ? blink : 0].join('|');
      if (sig !== lastSig) { lastSig = sig; $('.hsr-svg').innerHTML = svg(); say(); ui(); }
    }
    const restart = () => { st = SafetySim.init(cfg); inp.act = false; inp.reset = false; inp.power = true; sawTrip = false; };
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.b) brand = b.dataset.b;
      if (b.dataset.app) { cfg.app = b.dataset.app; cfg.faults = {}; restart(); }
      if (b.dataset.o) { cfg[b.dataset.o] = b.dataset.v === '1'; if (b.dataset.o === 'auto') restart(); }
      if (b.dataset.f !== undefined) { if (!b.dataset.f) cfg.faults = {}; else cfg.faults[b.dataset.f] = !cfg.faults[b.dataset.f]; }
      if (b.dataset.a === 'act') inp.act = !inp.act;
      if (b.dataset.a === 'power') inp.power = !inp.power;
      if (b.dataset.a === 'reset') { inp.reset = true; tick(10); setTimeout(() => { inp.reset = false; }, 350); }
      lastSig = ''; tick(10);
    });
    let last = 0;
    const timer = setInterval(() => {
      if (!document.body.contains(box)) { clearInterval(timer); return; }
      const now = Date.now(), dt = Math.min(300, last ? now - last : 100); last = now; blink = Math.floor(now / 400) % 2;
      tick(dt);
    }, 100);
    checks(); tick(10);
  };
})(typeof window !== 'undefined' ? window : globalThis);
