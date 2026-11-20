/* PLC Start — two extra pages.
 * #oral : interview practice out loud. A question from the interview bank, you answer aloud, then compare with the
 *         model answer and rate yourself. Questions you did not know come back first.
 * #cheat: one page with the things to remember: contacts, timers, patterns, wiring, starters, safety, networks,
 *         fault finding. Made to be printed. */
(function () {
  const LL = (window.LL = window.LL || {});
  const STORE = 'll-hw-oral';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const CSS = `
.xo-card{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:18px;max-width:780px}
.xo-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0 14px}
.xo-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}.xo-chips button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-ctl);padding:5px 12px;font:inherit;font-size:var(--t-13);font-weight:600;cursor:pointer;min-height:34px}.xo-chips button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.xo-q{font-size:var(--t-20);font-weight:700;line-height:1.35;margin:6px 0 12px}.xo-tag{font-family:var(--f-mono);font-size:var(--t-12);color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.xo-time{font-family:var(--f-mono);font-size:var(--t-24);font-weight:700}.xo-hint{color:var(--muted);font-size:var(--t-14);line-height:1.45}
.xo-ans{border-left:4px solid var(--power-bright);background:var(--power-soft);border-radius:var(--r-ctl);padding:12px 14px;margin:14px 0}.xo-ans b{display:block;font-size:var(--t-16);margin-bottom:4px}.xo-ans p{margin:0;line-height:1.5}
.xo-rate{display:flex;gap:8px;flex-wrap:wrap}.xo-bar{height:8px;border-radius:var(--r-tag);background:var(--surface-3);overflow:hidden;flex:1;min-width:120px}.xo-bar i{display:block;height:100%;background:var(--power-bright)}
.xo-how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0 0}@media(max-width:640px){.xo-how{grid-template-columns:1fr}}.xo-how div{background:var(--surface-2);border-radius:var(--r-ctl);padding:8px 10px;font-size:var(--t-14);line-height:1.4}.xo-how b{display:block}
.xc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}@media(max-width:860px){.xc{grid-template-columns:1fr}}
.xc section{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:12px 14px;break-inside:avoid;min-width:0;overflow-x:auto}.xc td{overflow-wrap:anywhere}.xc h2{font-size:var(--t-16);margin:0 0 8px;font-family:var(--f-body);letter-spacing:.04em;text-transform:uppercase}
.xc table{width:100%;border-collapse:collapse;font-size:var(--t-13)}.xc td,.xc th{text-align:left;padding:4px 6px;border-bottom:1px solid var(--line-2);vertical-align:top}.xc th{font-size:var(--t-12);text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.xc pre{margin:6px 0;font-size:var(--t-13);background:var(--surface-2);border-radius:var(--r-ctl);padding:8px;overflow-x:auto}.xc ul,.xc ol{margin:4px 0 4px 18px;padding:0;font-size:var(--t-14);line-height:1.5}.xc p{font-size:var(--t-14);line-height:1.5;margin:4px 0}.xc code{font-size:var(--t-13)}
.xa{max-width:760px}.xa-lead{font-size:var(--t-18);line-height:1.55;margin:0 0 8px;max-width:62ch}.xa section{margin-top:22px}.xa h2{font-size:var(--t-18);margin:0 0 6px}.xa p,.xa li{line-height:1.6;max-width:68ch}.xa ul{margin:0;padding-left:20px}.xa li{margin:0 0 4px}
@media print{header.top,nav.tabs,.xc-noprint{display:none!important}.xc{grid-template-columns:1fr 1fr;gap:8px}.xc section{border-color:#999}body{background:#fff}}`;
  function css() { if (!document.getElementById('xo-css')) { const s = document.createElement('style'); s.id = 'xo-css'; s.textContent = CSS; document.head.appendChild(s); } }

  // ───────────── interview practice out loud ─────────────
  function oral(main) {
    css();
    const bank = (LL.QUIZ_IV || []).map((q) => ({ t: q.t, q: q.q, a: q.a[q.c], why: q.why, k: q.q.slice(0, 60) }));
    let mem = {}; try { mem = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { mem = {}; }
    const topics = [...new Set(bank.map((q) => q.t))];
    let topic = '', cur = null, shown = false, t0 = 0, tick = 0;
    const page = el(`<div class="wrap"><span class="plate">Interview practice</span><h1 style="margin:10px 0 6px">Answer out loud</h1>
      <p class="muted" style="margin:0 0 6px;max-width:66ch">In an interview nobody gives you four answers to pick from. Read the question, say your answer aloud as if the interviewer sat in front of you, then compare with the model answer. Questions you did not know come back first.</p>
      <div class="xo-top"><div class="xo-bar"><i></i></div><span class="chip xo-n"></span><a class="btn small ghost" href="#quiz-iv">Multiple choice instead</a></div>
      <div class="xo-chips"></div><div class="xo-card"></div>
      <div class="xo-how"><div><b>1. What it is</b>One clear sentence. No long start.</div><div><b>2. Why it matters</b>What goes wrong without it.</div><div><b>3. An example</b>"On a conveyor, for example…" A real machine shows you have done it.</div></div></div>`);
    main.appendChild(page);
    const $ = (q) => page.querySelector(q), card = $('.xo-card');
    const pool = () => bank.filter((q) => !topic || q.t === topic);
    function next() {
      const p = pool(), rank = (q) => (mem[q.k] == null ? 1 : mem[q.k] === 2 ? 3 : mem[q.k] === 0 ? 0 : 0.5);
      const best = p.filter((q) => q !== cur).sort((a, b) => rank(a) - rank(b) || Math.random() - 0.5).slice(0, 6);
      cur = best[Math.floor(Math.random() * Math.min(3, best.length))] || p[0]; shown = false; t0 = Date.now(); render();
    }
    function render() {
      const p = pool(), known = p.filter((q) => mem[q.k] === 2).length;
      $('.xo-bar i').style.width = (p.length ? (known / p.length) * 100 : 0) + '%'; $('.xo-n').textContent = known + ' / ' + p.length + ' known';
      $('.xo-chips').innerHTML = `<button data-t="" class="${topic ? '' : 'on'}">All topics</button>` + topics.map((t) => `<button data-t="${esc(t)}" class="${topic === t ? 'on' : ''}">${esc(t)}</button>`).join('');
      if (!cur) { card.innerHTML = '<p>No questions in this topic.</p>'; return; }
      const can = 'speechSynthesis' in window;
      card.innerHTML = `<div class="xo-tag">${esc(cur.t)}${mem[cur.k] != null ? ' · last time: ' + ['not known', 'partly', 'known'][mem[cur.k]] : ''}</div><div class="xo-q">${esc(cur.q)}</div>`
        + (shown ? `<div class="xo-ans"><b>${esc(cur.a)}</b><p>${esc(cur.why)}</p></div><p class="xo-hint">How was your answer?</p><div class="xo-rate"><button class="btn go" data-r="2">I knew it</button><button class="btn" data-r="1">Partly</button><button class="btn" data-r="0">I did not know</button></div>`
          : `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><span class="xo-time">0:00</span><span class="xo-hint">Speak now. A good answer takes 20 to 60 seconds.</span></div><div class="xo-rate" style="margin-top:14px"><button class="btn primary" data-a="show">Show the model answer</button>${can ? '<button class="btn" data-a="say">${LL.SYM.sound} Read the question to me</button>' : ''}<button class="btn ghost" data-a="skip">Skip</button></div>`);
    }
    page.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.t != null) { topic = t.dataset.t; cur = null; return next(); }
      if (t.dataset.a === 'show') { shown = true; return render(); }
      if (t.dataset.a === 'skip') return next();
      if (t.dataset.a === 'say') { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(cur.q); u.lang = 'en-US'; u.rate = 0.9; window.speechSynthesis.speak(u); } catch (err) { /* not available here */ } return; }
      if (t.dataset.r != null) { mem[cur.k] = +t.dataset.r; try { localStorage.setItem(STORE, JSON.stringify(mem)); } catch (err) { /* private mode */ } next(); }
    });
    tick = setInterval(() => { if (!document.body.contains(page)) return clearInterval(tick); const s = page.querySelector('.xo-time'); if (s && !shown) { const n = Math.floor((Date.now() - t0) / 1000); s.textContent = Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); } }, 500);
    next();
  }

  // ───────────── cheat sheet ─────────────
  const SHEET = `
<section><h2>Contacts and coils</h2><table>
<tr><th>Symbol</th><th>Passes power when</th><th>Other names</th></tr>
<tr><td><code>NO(I0.0)</code> ─┤ ├─</td><td>the bit is 1</td><td>XIC, examine if closed</td></tr>
<tr><td><code>NC(I0.0)</code> ─┤/├─</td><td>the bit is 0</td><td>XIO, examine if open</td></tr>
<tr><td><code>P</code> / <code>N</code></td><td>one scan on a rising / falling edge</td><td>ONS, R_TRIG / F_TRIG</td></tr>
<tr><td><code>COIL</code> ─( )─</td><td>writes the rung result every scan</td><td>OTE</td></tr>
<tr><td><code>SET</code> / <code>RST</code></td><td>writes 1 / 0 and it stays</td><td>OTL / OTU, S / R</td></tr>
</table><p><b>NC stop button:</b> wired NC gives a 1 when not pressed, so in the program use a normal <code>NO</code> contact.</p></section>
<section><h2>The four rungs to know by heart</h2>
<pre>Seal-in (start / stop)
NO(START) | NO(STOP_nc) NO(OL_ok) COIL(MOTOR)
NO(MOTOR)

Interlock (never both)
NO(FWD_cmd) NC(REV) COIL(FWD)
NO(REV_cmd) NC(FWD) COIL(REV)

One-shot
P(BUTTON) COIL(PULSE)

Flasher
NC(T1) TON(T0,500ms)
NO(T0) TON(T1,500ms)     lamp = NO(T0)</pre></section>
<section><h2>Timers and counters</h2><table>
<tr><th>Block</th><th>Output is on…</th><th>Use</th></tr>
<tr><td><b>TON</b></td><td>after the input was on for the whole time</td><td>delay a start, filter a signal</td></tr>
<tr><td><b>TOF</b></td><td>while the input is on, and for the time after it</td><td>fan run-on, keep a lamp on</td></tr>
<tr><td><b>TP</b></td><td>for exactly the time, once per edge</td><td>a fixed pulse</td></tr>
<tr><td><b>RTO</b></td><td>after the total on-time; keeps its time</td><td>run hours, needs a reset</td></tr>
<tr><td><b>CTU / CTD</b></td><td>when the count reaches the preset / zero</td><td>parts, batches; count on an edge</td></tr>
</table></section>
<section><h2>Scan cycle and its traps</h2><ol><li>Read all inputs → 2. run the program top to bottom → 3. write all outputs.</li></ol><ul>
<li>A signal shorter than one scan can be missed.</li><li>Two coils for one address: the last rung wins.</li><li>If the same signal moves two steps in a row, use an edge, or the sequence runs through in one scan.</li><li>PID, ramps and totals: in a periodic task.</li><li>A scan that is too long: the watchdog stops the CPU.</li></ul></section>
<section><h2>Step sequence (state machine)</h2><pre>CMP(MW0==0) NO(START)     MOV(10,MW0)
CMP(MW0==10) NO(SENSOR_A) MOV(20,MW0)
CMP(MW0==20) NO(T0)       MOV(0,MW0)
outputs:  CMP(MW0==10) COIL(VALVE_A)</pre><p>One word holds the step. Transitions write it. Outputs only read it. Add a watchdog timer per step and an alarm step.</p></section>
<section><h2>Analog scaling</h2><pre>out = (in − inMin) × (outMax − outMin)
      / (inMax − inMin) + outMin</pre><table>
<tr><td>0–10 V / 0–20 mA</td><td>raw 0 … 27648 (Siemens)</td></tr><tr><td>4–20 mA</td><td>raw 0 … 27648 (channel set to 4–20 mA) or 5530 … 27648 (channel set to 0–20 mA); below about 3.6 mA = broken wire</td></tr><tr><td>Hysteresis</td><td>on at 30 %, off at 80 %: no chatter</td></tr></table></section>
<section><h2>Wiring inputs and outputs</h2><table>
<tr><th>Device</th><th>Switches</th><th>Needs</th></tr>
<tr><td>PNP sensor</td><td>+24 V</td><td>sinking input (common to 0 V)</td></tr><tr><td>NPN sensor</td><td>0 V</td><td>sourcing input (common to +24 V)</td></tr>
<tr><td>PNP output</td><td>+24 V</td><td>load to 0 V</td></tr><tr><td>NPN output</td><td>0 V</td><td>load to +24 V</td></tr>
<tr><td>Relay output</td><td>AC or DC</td><td>slow, wears; not for pulses</td></tr></table><p>Sensor wires: brown +24 V, blue 0 V, black signal. DC coil: flyback diode. Big load: interposing contactor.</p></section>
<section><h2>Starting a motor</h2><table>
<tr><th>Method</th><th>Current</th><th>Torque</th><th>For</th></tr>
<tr><td>Direct on line</td><td>6–8 ×</td><td>full</td><td>small motors</td></tr><tr><td>Star-delta</td><td>≈ 2 ×</td><td>1/3</td><td>light starts</td></tr>
<tr><td>Soft starter</td><td>2–4 ×</td><td>reduced</td><td>pumps, fans</td></tr><tr><td>Drive (VFD)</td><td>≈ 1 ×</td><td>full</td><td>speed control</td></tr>
<tr><td>Rotor resistance</td><td>≈ 2 ×</td><td>high</td><td>heavy starts</td></tr></table><p>Power circuit: breaker → contactor → overload relay → motor. Overload NC 95-96 in the coil path, NO 97-98 to the trip lamp.</p></section>
<section><h2>Safety</h2><table>
<tr><th>PL</th><th>Typical structure</th></tr><tr><td>a, b, c</td><td>one channel (well-tried parts, or tested)</td></tr><tr><td>d</td><td>two channels, faults are found</td></tr><tr><td>e</td><td>two channels, full monitoring</td></tr></table>
<p>Risk graph: <b>S</b> how bad · <b>F</b> how often · <b>P</b> can it be avoided. Stop category 0 = power off at once, 1 = brake then power off, 2 = stop with power on.</p><p><b>Lock-out:</b> isolate, your own padlock, release stored energy, prove it is dead. An E-stop is not isolation.</p></section>
<section><h2>Networks in one line each</h2><table>
<tr><td><b>Modbus RTU</b></td><td>RS-485, one master asks, slaves answer. Simple, slow.</td></tr><tr><td><b>PROFINET</b></td><td>Ethernet, Siemens world. Device names, GSDML files.</td></tr>
<tr><td><b>EtherNet/IP</b></td><td>Ethernet, Rockwell world. EDS files, RPI.</td></tr><tr><td><b>EtherCAT</b></td><td>Ethernet, one frame through all devices. Fast motion.</td></tr>
<tr><td><b>IO-Link</b></td><td>Point to point to one smart sensor.</td></tr><tr><td><b>CAN / CANopen</b></td><td>Two wires, priority by ID. Vehicles, drives.</td></tr><tr><td><b>OPC UA / MQTT</b></td><td>Data up to SCADA, MES, cloud.</td></tr></table></section>
<section><h2>Fault finding, in this order</h2><ol><li>Ask the operator: what changed, when?</li><li>Read the alarm and the CPU diagnostics.</li><li>Is the input LED on? Does the PLC see the 1?</li><li>Go online: find the rung that does not pass power.</li><li>Is the output on? LED? Voltage at the load?</li><li>Measure before you replace.</li><li>Remove forces and bridges before you leave.</li></ol></section>
<section><h2>Brand words</h2><table>
<tr><th></th><th>Siemens</th><th>Rockwell</th><th>CODESYS</th></tr>
<tr><td>Input bit</td><td>%I0.0</td><td>Local:1:I.Data.0</td><td>%IX0.0</td></tr><tr><td>Memory bit</td><td>%M0.0</td><td>a BOOL tag</td><td>a BOOL variable</td></tr>
<tr><td>Block with memory</td><td>FB + instance DB</td><td>AOI</td><td>FB instance</td></tr><tr><td>Main program</td><td>OB1</td><td>Continuous task</td><td>MainTask / PLC_PRG</td></tr>
<tr><td>Periodic</td><td>OB30</td><td>Periodic task</td><td>Cyclic task</td></tr></table></section>`;
  function cheat(main) {
    css();
    main.appendChild(el(`<div class="wrap"><span class="plate">Reference</span><h1 style="margin:10px 0 6px">Cheat sheet</h1>
      <p class="muted xc-noprint" style="margin:0 0 6px;max-width:66ch">The things to have in your head before an interview or a first day on site. One page: print it, or keep it open on your phone.</p>
      <div class="xc-noprint" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="xc-print">Print this page</button><a class="btn ghost" href="#oral">Practise interview answers out loud</a><a class="btn ghost" href="#glossary">Glossary</a><a class="btn ghost" href="#calc">Calculators</a></div>
      <div class="xc">${SHEET}</div></div>`));
    const b = main.querySelector('#xc-print'); if (b) b.onclick = () => { try { window.print(); } catch (e) { /* not available */ } };
  }
  // #about: what the app is, what happens with the user's data (nothing leaves the device), the limits of a
  // simulator, whose the trade names are, and the licences of the fonts. Google Play asks for this text inside the app.
  function about(main) {
    css();
    const A = LL.APP, n = esc(A.name);
    main.appendChild(el(`<div class="wrap xa"><span class="plate">About</span><h1 style="margin:10px 0 6px">About ${n}</h1>
      <p class="xa-lead">${n} teaches PLC ladder logic by doing: lessons, a simulator with machines, tasks with automatic tests, an electrical wiring bench (Circuits), quizzes and calculators.</p>
      <section><h2>Privacy policy</h2><p><b>Your data stays on your device.</b> This policy is for the app ${n} on Android and on the web.</p><ul>
        <li>No account, no ads, no tracking.</li>
        <li>The app does not send anything to anyone. Nothing about you or about how you use the app is collected.</li>
        <li>Your progress, your programs and your quiz scores are saved only on this device.</li>
        <li>To keep them or to move them to another device: <a href="#home">Home</a>, then <b>Export my work</b>. To delete them: delete the app, or clear the data of this site in your browser.</li>
        <li>The app asks for no permission on your phone and contains no code from advertising or analytics companies.</li>
        <li>Questions about privacy: write to the developer. The contact address is on the app's page in Google Play.</li>
      </ul></section>
      <section><h2>For learning only</h2><p>A simulator is not a real machine. Real machines can hurt people. Before you work on one, follow the rules of your workplace, the standards of your country and the instructions of the maker. Values from the calculators help you check and learn: a qualified person must confirm them before anything is ordered or built.</p></section>
      <section><h2>Names of other companies</h2><p>Siemens, SIMATIC, TIA Portal, Rockwell Automation, Allen-Bradley, Studio 5000, CODESYS, Schneider Electric, EcoStruxure, Beckhoff, TwinCAT, Omron, Sysmac, ABB, Mitsubishi Electric and other product names belong to their owners. ${n} is not made, approved or supported by any of them. The names are used only to explain how the same thing is called in each software.</p></section>
      <section><h2>Fonts</h2><p class="xa-fonts"></p></section>
      <section><h2>Version</h2><p style="font-family:var(--f-mono)">${n} ${esc(A.version)}</p></section>
      <p><a class="btn" href="#home">Back to Home</a></p></div>`));
    const f = main.querySelector('.xa-fonts');
    if (f) f.textContent = (A.fonts || 'The fonts in this app are free fonts under the SIL Open Font License.');
  }
  LL.Extra = { oral, cheat, about };
})();
