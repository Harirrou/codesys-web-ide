/* Ladder Lab — "Set up a drive": quick commissioning of a VFD at its keypad. Mounted in lessons through [[hw:drive]].
 * A motor nameplate, the ten parameters every drive asks for, a run panel and a live frequency chart. Wrong values
 * give the faults a real drive gives: overcurrent, overvoltage on a fast stop, a nuisance overload trip.
 * Parameter codes are shown for SINAMICS, Altivar and PowerFlex. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-drive';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const NP = { volt: 400, cur: 8.2, freq: 50, rpm: 1440 };
  // key, name, unit, min, max, step, factory value, why
  const PAR = [
    ['volt', 'Motor rated voltage', 'V', 200, 480, 10, 230, 'From the nameplate. The drive uses it for the voltage / frequency ratio.'],
    ['cur', 'Motor rated current', 'A', 2, 20, 0.1, 15, 'From the nameplate. It sets the motor overload protection inside the drive.'],
    ['freq', 'Motor rated frequency', 'Hz', 50, 60, 10, 60, 'From the nameplate: 50 Hz in Europe, 60 Hz in North America.'],
    ['rpm', 'Motor rated speed', 'rpm', 900, 3600, 10, 1750, 'From the nameplate. The drive works out the slip from it.'],
    ['acc', 'Ramp-up time', 's', 0.5, 20, 0.5, 0.5, 'Time from 0 to the maximum frequency. Too short: overcurrent.'],
    ['dec', 'Ramp-down time', 's', 0.5, 20, 0.5, 0.5, 'Time from maximum to 0. Too short with a heavy load: overvoltage.'],
    ['fmin', 'Minimum frequency', 'Hz', 0, 30, 5, 0, 'The motor never runs slower than this while it has a run command.'],
    ['fmax', 'Maximum frequency', 'Hz', 30, 70, 5, 60, 'The motor never runs faster than this, whatever the setpoint says.'],
    ['cmd', 'Run command comes from', '', 0, 2, 1, 0, 'Who may start the motor: the keypad, a terminal (a PLC output), or the network.'],
    ['ref', 'Speed setpoint comes from', '', 0, 2, 1, 0, 'Who sets the speed: the keypad, an analog input (0–10 V from the PLC), or the network.'],
  ];
  const SRC = ['keypad', 'terminals', 'network'], REF = ['keypad', 'analog input', 'network'];
  const CODE = {
    siemens: { n: 'SINAMICS', c: ['p0304', 'p0305', 'p0310', 'p0311', 'p1120', 'p1121', 'p1080', 'p1082', 'p0015', 'p0015'] },
    schneider: { n: 'Altivar', c: ['UnS', 'nCr', 'FrS', 'nSP', 'ACC', 'dEC', 'LSP', 'HSP', 'Cd1', 'Fr1'] },
    rockwell: { n: 'PowerFlex 525', c: ['P031', 'P033', 'P032', 'P036', 'P041', 'P042', 'P043', 'P044', 'P046', 'P047'] },
  };
  const CHECKS = [
    ['np', 'Type in the four values from the motor nameplate'],
    ['run', 'Run to full speed and stop again without a fault (ramps of 3 s or more)'],
    ['lim', 'Set the limits to 10 Hz and 50 Hz, and see the motor stay inside them'],
    ['plc', 'Give the control to the PLC: run command from terminals, setpoint from the analog input'],
    ['flt', 'Make one fault on purpose, read why, and reset it'],
  ];
  const CSS = `
.hw-drive{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:16px 0}
.hwd-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px}.hwd-h b{font-size:1.05rem}
.hwd-br{display:flex;gap:5px;flex-wrap:wrap}.hwd-br button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer;min-height:32px}.hwd-br button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.hwd-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:12px}@media(max-width:820px){.hwd-grid{grid-template-columns:1fr}}
.hwd-np{border:2px solid var(--line);border-radius:8px;padding:8px 12px;font-family:var(--f-mono);font-size:.84rem;line-height:1.55;background:var(--surface-2);margin-bottom:10px}.hwd-np b{font-family:var(--f-display);letter-spacing:.08em;display:block;font-size:.76rem;text-transform:uppercase;color:var(--muted)}
.hwd-par{display:grid;gap:5px}.hwd-p{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:8px;align-items:center;background:var(--surface-2);border-radius:8px;padding:5px 8px;font-size:.84rem}
.hwd-p code{font-size:.76rem;color:var(--muted)}.hwd-p.bad{box-shadow:inset 3px 0 0 #f5a524}.hwd-p.ok{box-shadow:inset 3px 0 0 var(--power-bright)}
.hwd-v{display:flex;gap:4px;align-items:center}.hwd-v b{font-family:var(--f-mono);min-width:86px;text-align:right;font-size:.86rem}
.hwd-v input{width:62px;font:inherit;font-family:var(--f-mono);font-size:.86rem;text-align:right;border:1px solid var(--line);border-radius:7px;padding:5px 6px;background:var(--surface);color:var(--ink)}.hwd-v i{font-style:normal;font-size:.76rem;color:var(--muted);min-width:24px}
.hwd-v button{width:32px;height:32px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;font:inherit;font-weight:700;cursor:pointer}
.hwd-dev{background:#1f2937;border-radius:14px;padding:12px;color:#e5e7eb}
.hwd-lcd{background:#0b1f17;border-radius:8px;padding:10px 12px;font-family:var(--f-mono);color:#4ade80;display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.hwd-lcd b{font-size:1.7rem}.hwd-lcd.flt{background:#7f1d1d;color:#fff}
.hwd-leds{display:flex;gap:12px;font-size:.72rem;margin:8px 0;flex-wrap:wrap}.hwd-leds i{display:inline-block;width:9px;height:9px;border-radius:50%;background:#374151;margin-right:4px}.hwd-leds .on i{background:#4ade80}.hwd-leds .red.on i{background:#ef4444}
.hwd-keys{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.hwd-keys button{border:0;border-radius:9px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;min-height:40px;background:#374151;color:#fff}.hwd-keys button.go{background:#16a34a}.hwd-keys button.st{background:#dc2626}.hwd-keys button:disabled{opacity:.4;cursor:not-allowed}
.hwd-ext{background:var(--surface-2);border-radius:10px;padding:8px 10px;margin-top:8px;font-size:.84rem;display:grid;gap:6px}.hwd-ext label{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.hwd-ext input[type=range]{flex:1;min-width:120px}
.hwd-cv{background:var(--surface-2);border-radius:10px;padding:6px;margin-top:8px}.hwd-cv canvas{display:block;width:100%;height:auto}
.hwd-cap{border-left:4px solid var(--info);background:var(--surface-2);border-radius:8px;padding:8px 12px;margin:10px 0;font-size:.94rem;line-height:1.45;min-height:3em}.hwd-cap.bad{border-color:var(--danger);background:var(--danger-soft)}
.hwd-sec{font-family:var(--f-display);letter-spacing:.08em;text-transform:uppercase;font-size:.8rem;color:var(--muted);margin:12px 0 6px;display:flex;justify-content:space-between}
.hwd-chk{display:grid;gap:6px}.hwd-chk div{background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:.86rem}.hwd-chk div.ok{background:var(--power-soft)}.hwd-chk div::before{content:"○ ";color:var(--muted)}.hwd-chk div.ok::before{content:"✓ ";color:var(--power)}`;

  LL.HW.drive = function (ph) {
    if (!document.getElementById('hw-drive-css')) { const st = document.createElement('style'); st.id = 'hw-drive-css'; st.textContent = CSS; document.head.appendChild(st); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    const P = {}; PAR.forEach((p) => (P[p[0]] = p[6]));
    let brand = 'siemens';
    const S = { f: 0, run: false, keyRun: false, di: false, keyRef: 50, ai: 50, fault: '', hist: [], t: 0, hot: 0, peak: 0, clean: false, hadFault: false };
    const box = document.createElement('div'); box.className = 'hw-box hw-drive';
    box.innerHTML = `<div class="hwd-h"><b>Set up a drive: the first ten parameters</b><span class="hwd-br">${Object.keys(CODE).map((k) => `<button data-b="${k}">${CODE[k].n}</button>`).join('')}</span></div>
      <div class="hwd-grid"><div><div class="hwd-np"><b>Motor nameplate</b>3~ Mot · 4 kW · cos φ 0.82<br>${NP.volt} V Y · ${NP.cur} A · ${NP.freq} Hz · ${NP.rpm} rpm<br>load: a fan with a heavy wheel</div><div class="hwd-par"></div></div>
      <div><div class="hwd-dev"><div class="hwd-lcd"><b data-d="hz">0.0 Hz</b><span data-d="st">READY</span></div><div class="hwd-leds"><span data-l="rdy"><i></i>READY</span><span data-l="run"><i></i>RUN</span><span data-l="flt" class="red"><i></i>FAULT</span><span data-d="amps"></span></div>
        <div class="hwd-keys"><button class="go" data-a="krun">RUN</button><button class="st" data-a="kstop">STOP</button><button data-a="kdn">▼</button><button data-a="kup">▲</button><button data-a="reset">FAULT RESET</button></div></div>
        <div class="hwd-ext"><label><input type="checkbox" data-a="di"> PLC output on terminal DI1 (run)</label><label>PLC analog output on AI1 <input type="range" min="0" max="100" value="50" data-a="ai" aria-label="Analog setpoint"><b data-d="ai" style="font-family:var(--f-mono)">5.0 V</b></label></div>
        <div class="hwd-cv"><canvas width="520" height="170" role="img" aria-label="Output frequency over time"></canvas></div></div></div>
      <div class="hwd-cap"></div><div class="hwd-sec"><span>Try these</span><span class="hwd-prog"></span></div><div class="hwd-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q), cv = $('canvas'), ctx = cv.getContext('2d');
    const cap = (t, bad) => { const c = $('.hwd-cap'); c.textContent = t; c.classList.toggle('bad', !!bad); };
    const mark = (k) => { if (!done[k]) { done[k] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } checks(); } };
    function checks() { $('.hwd-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join(''); $('.hwd-prog').textContent = CHECKS.filter(([k]) => done[k]).length + ' / ' + CHECKS.length; }
    const npOk = () => P.volt === NP.volt && Math.abs(P.cur - NP.cur) < 0.05 && P.freq === NP.freq && P.rpm === NP.rpm;
    const show = (k) => (k === 'cmd' ? SRC[P.cmd] : k === 'ref' ? REF[P.ref] : (k === 'cur' || k === 'acc' || k === 'dec' ? P[k].toFixed(1) : P[k]) + ' ' + PAR.find((p) => p[0] === k)[2]);
    function pars() {
      $('.hwd-par').innerHTML = PAR.map((p, i) => { const k = p[0], st = k in NP ? (Math.abs(P[k] - NP[k]) < 0.05 ? 'ok' : 'bad') : ''; return `<div class="hwd-p ${st}" title="${esc(p[7])}"><code>${CODE[brand].c[i]}</code><span>${esc(p[1])}</span><span class="hwd-v"><button data-p="${k}" data-s="-1" aria-label="${esc(p[1])} down">−</button>${k === 'cmd' || k === 'ref' ? `<b>${show(k)}</b>` : `<input data-pi="${k}" value="${k === 'cur' || k === 'acc' || k === 'dec' ? P[k].toFixed(1) : P[k]}" inputmode="decimal" aria-label="${esc(p[1])}"><i>${p[2]}</i>`}<button data-p="${k}" data-s="1" aria-label="${esc(p[1])} up">+</button></span></div>`; }).join('');
      box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === brand));
      if (npOk()) mark('np'); if (P.cmd === 1 && P.ref === 1) mark('plc');
    }
    function trip(code, why) { S.fault = code; S.run = false; S.keyRun = false; S.hadFault = true; S.clean = false; cap(code + ': ' + why, true); }
    function step(dt) {
      const want = !S.fault && (P.cmd === 0 ? S.keyRun : P.cmd === 1 ? S.di : false);
      if (want && !S.run) { S.run = true; S.clean = true; S.peak = 0; if (P.cmd === 2) cap('The run command is set to "network", but no network is connected in this exercise. Choose keypad or terminals.'); }
      if (!want) S.run = S.run && S.f > 0.05 && !S.fault;       // ramping down
      const sp = Math.max(P.fmin, Math.min(P.fmax, (P.ref === 0 ? S.keyRef : P.ref === 1 ? S.ai : 0) / 100 * P.fmax)), tgt = want ? sp : 0;
      const ratio = P.volt / P.freq, prev = S.f;
      if (S.fault) S.f = Math.max(0, S.f - 25 * dt);               // coasting
      else { const rate = P.fmax / (tgt > S.f ? P.acc : P.dec); S.f += Math.max(-rate * dt, Math.min(rate * dt, tgt - S.f)); }
      const accel = (S.f - prev) / dt;
      if (!S.fault && S.f > 0.5) {
        if (ratio > 9) trip('F OVERCURRENT', 'too much voltage for each Hz. The motor iron saturates and the current jumps. Check rated voltage and rated frequency against the nameplate.');
        else if (accel > 45) trip('F OVERCURRENT', 'the ramp-up time is too short for this heavy fan wheel. The drive would need more current than it can give. Make the ramp longer.');
        else if (accel < -22) trip('F OVERVOLTAGE', 'the ramp-down time is too short. The heavy wheel drives the motor, the motor works as a generator and fills the DC link. Make the ramp longer, or add a braking resistor.');
        else if (ratio < 7.2 || P.cur < NP.cur * 0.9) { S.hot += dt; if (S.hot > 4) trip('F MOTOR OVERLOAD', ratio < 7.2 ? 'too little voltage for each Hz: the motor is weak, slips and gets hot. Check rated voltage and frequency.' : 'the rated current in the drive is lower than on the nameplate, so the drive thinks the motor is overloaded. Type in ' + NP.cur + ' A.'); }
        else S.hot = 0;
      }
      S.amps = S.f > 0.3 && !S.fault ? NP.cur * (0.35 + 0.65 * Math.pow(S.f / 50, 2)) * (ratio < 7.2 ? 1.5 : 1) + Math.max(0, accel) * 0.25 : 0;
      S.peak = Math.max(S.peak, S.f);
      if (S.clean && !want && S.f <= 0.05 && S.peak >= P.fmax - 0.5 && P.acc >= 3 && P.dec >= 3 && !S.fault) { S.clean = false; mark('run'); cap('A clean run: up in ' + P.acc + ' s, down in ' + P.dec + ' s, no fault.'); }
      if (S.run && P.fmin === 10 && P.fmax === 50 && S.f >= 9.9 && S.f <= 50.05 && want && Math.abs(S.f - sp) < 0.1 && (sp === 10 || sp === 50)) mark('lim');
      S.t += dt; S.hist.push(S.f); if (S.hist.length > 260) S.hist.shift();
    }
    function draw() {
      const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim(), W = 520, H = 170, L = 34, B = 22, Y = (f) => H - B - (f / 70) * (H - B - 8);
      ctx.clearRect(0, 0, W, H); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle';
      [0, 25, 50].forEach((f) => { ctx.strokeStyle = v('--line-2'); ctx.beginPath(); ctx.moveTo(L, Y(f)); ctx.lineTo(W - 4, Y(f)); ctx.stroke(); ctx.fillStyle = v('--muted'); ctx.textAlign = 'right'; ctx.fillText(f + '', L - 5, Y(f)); });
      [[P.fmin, '#f5a524'], [P.fmax, v('--danger')]].forEach(([f, c]) => { ctx.strokeStyle = c; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(L, Y(f)); ctx.lineTo(W - 4, Y(f)); ctx.stroke(); ctx.setLineDash([]); });
      ctx.strokeStyle = S.fault ? v('--danger') : v('--power-bright'); ctx.lineWidth = 2; ctx.beginPath(); S.hist.forEach((f, i) => { const x = L + (i / 259) * (W - L - 4); i ? ctx.lineTo(x, Y(f)) : ctx.moveTo(x, Y(f)); }); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = v('--muted'); ctx.textAlign = 'left'; ctx.fillText('Hz · dashes: minimum and maximum frequency', L + 4, H - 8);
      const lcd = $('.hwd-lcd'); lcd.classList.toggle('flt', !!S.fault); $('[data-d="hz"]').textContent = S.fault ? S.fault : S.f.toFixed(1) + ' Hz';
      $('[data-d="st"]').textContent = S.fault ? 'press FAULT RESET' : S.f > 0.05 ? Math.round(S.f / P.freq * P.rpm) + ' rpm' : 'READY';
      $('[data-l="rdy"]').classList.toggle('on', !S.fault); $('[data-l="run"]').classList.toggle('on', S.f > 0.05 && !S.fault); $('[data-l="flt"]').classList.toggle('on', !!S.fault);
      $('[data-d="amps"]').textContent = (S.amps || 0).toFixed(1) + ' A'; $('[data-d="ai"]').textContent = (S.ai / 10).toFixed(1) + ' V';
      $('[data-a="krun"]').disabled = P.cmd !== 0; $('[data-a="kstop"]').disabled = P.cmd !== 0; $('[data-a="kup"]').disabled = P.ref !== 0; $('[data-a="kdn"]').disabled = P.ref !== 0;
    }
    let last = 0;
    const loop = (now) => { if (!document.body.contains(box)) return; const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; if (dt > 0) step(dt); draw(); requestAnimationFrame(loop); };
    box.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.b) { brand = t.dataset.b; pars(); cap('The same ten settings, with the parameter numbers of ' + CODE[brand].n + '. Every drive asks for them in its quick commissioning.'); return; }
      if (t.dataset.p) {
        const p = PAR.find((x) => x[0] === t.dataset.p), k = p[0];
        if (S.f > 0.05 && ['volt', 'cur', 'freq', 'rpm', 'cmd', 'ref'].includes(k)) return cap('Stop the motor first. Motor data and sources cannot be changed while it runs.', true);
        P[k] = Math.round(Math.max(p[3], Math.min(p[4], P[k] + p[5] * +t.dataset.s)) * 10) / 10; pars(); cap(p[1] + ' = ' + show(k) + '. ' + p[7]); return;
      }
      const a = t.dataset.a;
      if (a === 'krun') { S.keyRun = true; cap('RUN from the keypad. The frequency rises with the ramp-up time to the setpoint.'); }
      if (a === 'kstop') { S.keyRun = false; cap('STOP: the frequency falls with the ramp-down time.'); }
      if (a === 'kup') S.keyRef = Math.min(100, S.keyRef + 10);
      if (a === 'kdn') S.keyRef = Math.max(0, S.keyRef - 10);
      if (a === 'reset') { if (!S.fault) return cap('No fault to reset.'); if (S.f > 0.05) return cap('Wait until the motor has stopped.', true); S.fault = ''; S.hot = 0; if (S.hadFault) mark('flt'); cap('Fault reset. Fix the cause before you start again, or it comes back.'); }
    });
    box.addEventListener('change', (e) => {
      const k = e.target.dataset.pi; if (!k) return; const p = PAR.find((x) => x[0] === k), val = parseFloat(String(e.target.value).replace(',', '.'));
      if (S.f > 0.05 && ['volt', 'cur', 'freq', 'rpm'].includes(k)) { pars(); return cap('Stop the motor first. Motor data cannot be changed while it runs.', true); }
      if (!isNaN(val)) P[k] = Math.round(Math.max(p[3], Math.min(p[4], val)) * 10) / 10;
      pars(); cap(p[1] + ' = ' + show(k) + '. ' + p[7]);
    });
    box.addEventListener('input', (e) => { const a = e.target.dataset.a; if (a === 'ai') S.ai = +e.target.value; if (a === 'di') { S.di = e.target.checked; if (P.cmd !== 1) cap('The terminal is on, but the drive does not listen: "Run command comes from" is set to ' + SRC[P.cmd] + '.', true); } });
    pars(); checks();
    cap('A new drive has factory values that do not fit your motor. Read the nameplate, set the first four parameters with − and +, then the ramps. Then press RUN.');
    requestAnimationFrame(loop);
  };
})();
