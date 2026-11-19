/* Ladder Lab — "Who runs when?": PLC tasks on a time line. Mounted in lessons through [[hw:tasks]].
 * One CPU, three kinds of program: the main cyclic program, a periodic task and a hardware interrupt.
 * The time line shows which one has the CPU in every millisecond, when the main program reads its inputs,
 * which sensor pulses it misses, how regular the PID calls are, and what the watchdog does with a long cycle. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-tasks';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const BR = {
    siemens: { n: 'Siemens', main: 'OB1 (program cycle)', per: 'OB30 (cyclic interrupt)', int: 'OB40 (hardware interrupt)', start: 'OB100 (startup)', wd: 'cycle monitoring time, OB80' },
    rockwell: { n: 'Studio 5000', main: 'Continuous task', per: 'Periodic task', int: 'Event task', start: 'first scan bit S:FS', wd: 'task watchdog' },
    codesys: { n: 'CODESYS / TwinCAT', main: 'Freewheeling or cyclic MainTask', per: 'Cyclic task with an interval', int: 'Event task', start: 'first-cycle init code', wd: 'task watchdog' },
    omron: { n: 'Omron Sysmac', main: 'Primary periodic task', per: 'Periodic task', int: 'Event task', start: 'P_First_Run flag', wd: 'Task Execution Timeout' },
  };
  const CHECKS = [
    ['miss', 'Make the main program miss at least 3 pulses (long program, no interrupt)'],
    ['int', 'Switch the interrupt on and catch 10 pulses with it'],
    ['jit', 'PID in the main program: see the time between calls change by 20 ms or more'],
    ['exact', 'PID in the periodic task: the time between calls stays the same'],
    ['wd', 'Make the cycle longer than 150 ms: the watchdog stops the CPU. Then restart it'],
  ];
  const CSS = `
.hw-tasks{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:16px 0}
.hwt-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:8px}.hwt-h b{font-size:1.05rem}
.hwt-br{display:flex;gap:5px;flex-wrap:wrap}.hwt-br button,.hwt-seg button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:5px 11px;font:inherit;font-size:.8rem;font-weight:600;cursor:pointer;min-height:32px}
.hwt-br button.on,.hwt-seg button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.hwt-cv{background:var(--surface-2);border-radius:10px;padding:6px;margin:8px 0}.hwt-cv canvas{display:block;width:100%;height:auto}
.hwt-ctl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;margin:10px 0}@media(max-width:700px){.hwt-ctl{grid-template-columns:1fr}}
.hwt-ctl label{display:grid;gap:3px;font-size:.86rem}.hwt-ctl label b{font-family:var(--f-mono);font-weight:600}.hwt-ctl input[type=range]{width:100%}
.hwt-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:.86rem}.hwt-seg{display:inline-flex;gap:4px}
.hwt-num{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}@media(max-width:700px){.hwt-num{grid-template-columns:1fr}}
.hwt-num div{background:var(--surface-2);border-radius:10px;padding:8px 10px;font-size:.84rem;line-height:1.4}.hwt-num b{display:block;font-family:var(--f-mono);font-size:1.05rem}.hwt-num div.bad{background:var(--danger-soft)}.hwt-num div.ok{background:var(--power-soft)}
.hwt-cap{border-left:4px solid var(--info);background:var(--surface-2);border-radius:8px;padding:8px 12px;margin:8px 0;font-size:.94rem;line-height:1.45;min-height:3em}.hwt-cap.bad{border-color:var(--danger);background:var(--danger-soft)}
.hwt-sec{font-family:var(--f-display);letter-spacing:.08em;text-transform:uppercase;font-size:.8rem;color:var(--muted);margin:12px 0 6px;display:flex;justify-content:space-between}
.hwt-chk{display:grid;gap:6px}.hwt-chk div{background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:.86rem}.hwt-chk div.ok{background:var(--power-soft)}.hwt-chk div::before{content:"○ ";color:var(--muted)}.hwt-chk div.ok::before{content:"✓ ";color:var(--power)}
.hw-tasks [hidden]{display:none!important}`;

  LL.HW.tasks = function (ph) {
    if (!document.getElementById('hw-tasks-css')) { const st = document.createElement('style'); st.id = 'hw-tasks-css'; st.textContent = CSS; document.head.appendChild(st); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    const C = { scan: 40, bug: false, per: 100, useInt: false, pid: 'main', brand: 'siemens', speed: 0.25 };
    const WIN = 800, HIST = new Array(WIN).fill(null);
    let S;
    const reset = () => { S = { t: 0, mainLeft: 0, scanStart: 0, cyc: 0, perNext: 100, perLeft: 0, intLeft: 0, inp: 0, pulseEnd: -1, nextPulse: 60, last: 0, sent: 0, seenMain: 0, seenInt: 0, pidAt: -1, iv: [], stop: false, acc: 0, restarted: false }; HIST.fill(null); };
    reset();
    const box = document.createElement('div'); box.className = 'hw-box hw-tasks';
    box.innerHTML = `<div class="hwt-h"><b>Who has the CPU? One millisecond at a time</b><span class="hwt-br">${Object.keys(BR).map((k) => `<button data-b="${k}">${BR[k].n}</button>`).join('')}</span></div>
      <div class="hwt-cv"><canvas width="760" height="250" role="img" aria-label="Time line of the PLC tasks"></canvas></div>
      <div class="hwt-cap"></div>
      <div class="hwt-num"><div data-n="p"></div><div data-n="pid"></div><div data-n="cyc"></div></div>
      <div class="hwt-ctl">
        <label><span>Main program takes <b data-v="scan"></b></span><input type="range" min="5" max="120" step="5" value="40" data-c="scan" aria-label="Run time of the main program"></label>
        <label><span>Periodic task every <b data-v="per"></b></span><input type="range" min="20" max="200" step="10" value="100" data-c="per" aria-label="Interval of the periodic task"></label>
      </div>
      <div class="hwt-row"><span>Sensor pulse (5 ms):</span><span class="hwt-seg"><button data-i="0">read in the main program</button><button data-i="1">on a hardware interrupt</button></span></div>
      <div class="hwt-row" style="margin-top:8px"><span>PID is called in:</span><span class="hwt-seg"><button data-p="main">the main program</button><button data-p="per">the periodic task</button></span></div>
      <div class="hwt-row" style="margin-top:10px"><button class="btn small" data-a="bug">Add a slow loop (+200 ms)</button><button class="btn small" data-a="restart" hidden>Restart the CPU</button><button class="btn small ghost" data-a="zero">Counters to zero</button><span class="hwt-seg"><button data-s="0.25">slow</button><button data-s="1">real time</button></span></div>
      <div class="hwt-sec"><span>Try these</span><span class="hwt-prog"></span></div><div class="hwt-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q), cv = $('canvas'), ctx = cv.getContext('2d');
    const cap = (t, bad) => { const c = $('.hwt-cap'); c.textContent = t; c.classList.toggle('bad', !!bad); };
    const mark = (k) => { if (!done[k]) { done[k] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } checks(); } };
    function checks() { $('.hwt-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join(''); $('.hwt-prog').textContent = CHECKS.filter(([k]) => done[k]).length + ' / ' + CHECKS.length; }
    function ui() {
      box.querySelectorAll('[data-b]').forEach((b) => b.classList.toggle('on', b.dataset.b === C.brand));
      box.querySelectorAll('[data-i]').forEach((b) => b.classList.toggle('on', (b.dataset.i === '1') === C.useInt));
      box.querySelectorAll('[data-p]').forEach((b) => b.classList.toggle('on', b.dataset.p === C.pid));
      box.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', +b.dataset.s === C.speed));
      $('[data-v="scan"]').textContent = C.scan + ' ms' + (C.bug ? ' + 200 ms loop' : ''); $('[data-v="per"]').textContent = C.per + ' ms';
      $('[data-a="bug"]').textContent = C.bug ? 'Remove the slow loop' : 'Add a slow loop (+200 ms)'; $('[data-a="restart"]').hidden = !S.stop;
    }
    // one millisecond of CPU time
    function ms() {
      const t = S.t;
      if (!S.stop && t >= S.nextPulse) { S.inp = 1; S.pulseEnd = t + 5; S.sent++; S.nextPulse = t + 95 + Math.floor(Math.random() * 70); if (C.useInt) S.intLeft = 1; }
      if (t >= S.pulseEnd) S.inp = 0;
      let who = 'stop', read = 0;
      if (!S.stop) {
        if (t >= S.perNext) { S.perLeft = 4; S.perNext += C.per; S.perFresh = 1; }
        if (S.intLeft > 0) { who = 'int'; S.intLeft--; S.seenInt++; }
        else if (S.perLeft > 0) { who = 'per'; if (S.perFresh) { S.perFresh = 0; if (C.pid === 'per') pid(t); } S.perLeft--; }
        else {
          who = 'main';
          if (S.mainLeft <= 0) { if (S.scanStart) S.cyc = t - S.scanStart; S.scanStart = t; read = 1; if (S.inp && !S.last) S.seenMain++; S.last = S.inp; S.mainLeft = C.scan + (C.bug ? 200 : 0); if (C.pid === 'main') pid(t); }
          S.mainLeft--;
        }
        if (t - S.scanStart > 150) { S.stop = true; S.cyc = t - S.scanStart; mark2('wd0'); cap('CPU in STOP: the main program did not finish within 150 ms, the limit used here (' + BR[C.brand].wd + '; the default is 150 ms at Siemens, 500 ms at Rockwell, and you set it yourself in CODESYS). All outputs go off. A program must never wait in a loop: remove the slow loop, then restart the CPU.', true); ui(); }
      }
      HIST[t % WIN] = { who, inp: S.inp, read };
      S.t++;
    }
    const flags = {}; const mark2 = (k) => (flags[k] = 1);
    function pid(t) { if (S.pidAt >= 0) { S.iv.push(t - S.pidAt); if (S.iv.length > 10) S.iv.shift(); } S.pidAt = t; }
    function draw() {
      const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
      const W = 760, H = 250, L = 96, lanes = [['Sensor input', 30], [C.useInt ? 'Interrupt' : 'Interrupt (off)', 78], ['Periodic task', 126], ['Main program', 174]], col = { int: v('--danger'), per: '#f5a524', main: v('--info'), stop: v('--muted') };
      ctx.clearRect(0, 0, W, H); ctx.font = '12px "IBM Plex Sans", sans-serif'; ctx.textBaseline = 'middle';
      lanes.forEach(([n, y]) => { ctx.fillStyle = v('--muted'); ctx.textAlign = 'left'; ctx.fillText(n, 4, y + 12); ctx.fillStyle = v('--surface'); ctx.fillRect(L, y, W - L - 4, 26); });
      const X = (age) => W - 4 - (age / WIN) * (W - L - 4);
      for (let a = 0; a < WIN; a++) {
        const t = S.t - 1 - a; if (t < 0) break; const h = HIST[t % WIN]; if (!h) continue; const x = X(a), w = (W - L - 4) / WIN + 0.6;
        if (h.inp) { ctx.fillStyle = v('--power-bright'); ctx.fillRect(x, 30, w, 26); }
        const y = h.who === 'int' ? 78 : h.who === 'per' ? 126 : 174; ctx.fillStyle = col[h.who]; ctx.fillRect(x, y, w, 26);
        if (h.read) { ctx.fillStyle = v('--ink'); ctx.fillRect(x, 168, 1.6, 38); ctx.beginPath(); ctx.moveTo(x - 4, 164); ctx.lineTo(x + 5, 164); ctx.lineTo(x + 0.5, 171); ctx.fill(); }
        if (t % 100 === 0) { ctx.fillStyle = v('--line'); ctx.fillRect(x, 214, 1, 8); ctx.fillStyle = v('--muted'); ctx.textAlign = 'center'; ctx.fillText(t + ' ms', x, 232); }
      }
      ctx.fillStyle = v('--muted'); ctx.textAlign = 'left'; ctx.fillText('▼ = the main program reads its inputs here', L, 12);
    }
    function nums() {
      const miss = S.sent - S.seenMain, a = $('[data-n="p"]'), b = $('[data-n="pid"]'), c = $('[data-n="cyc"]');
      a.innerHTML = `<b>${S.sent} pulses sent</b>main program saw ${S.seenMain}${miss > 0 ? ', missed ' + miss : ''}${C.useInt ? ' · interrupt saw ' + S.seenInt : ''}`; a.className = C.useInt ? 'ok' : miss > 0 ? 'bad' : '';
      const mn = S.iv.length ? Math.min(...S.iv) : 0, mx = S.iv.length ? Math.max(...S.iv) : 0;
      b.innerHTML = `<b>PID every ${S.iv.length ? (mn === mx ? mn : mn + ' … ' + mx) + ' ms' : '…'}</b>${S.iv.length < 4 ? 'measuring' : mx - mn <= 2 ? 'regular: the PID maths is right' : 'irregular: the PID works with a wrong time'}`; b.className = S.iv.length >= 4 ? (mx - mn <= 2 ? 'ok' : 'bad') : '';
      c.innerHTML = `<b>Cycle time ${S.cyc} ms</b>${S.stop ? 'CPU STOP: watchdog 150 ms' : 'watchdog at 150 ms'}`; c.className = S.stop ? 'bad' : '';
      if (!C.useInt && miss >= 3) mark('miss');
      if (C.useInt && S.seenInt >= 10) mark('int');
      if (S.iv.length >= 6) { if (C.pid === 'main' && mx - mn >= 20) mark('jit'); if (C.pid === 'per' && mx - mn <= 2) mark('exact'); }
      if (flags.wd0 && S.restarted) mark('wd');
    }
    let last = 0;
    const loop = (now) => {
      if (!document.body.contains(box)) return;
      const dt = Math.min(60, now - (last || now)); last = now; S.acc += dt * C.speed;
      let n = Math.min(80, Math.floor(S.acc)); S.acc -= n; while (n-- > 0) ms();
      draw(); nums(); requestAnimationFrame(loop);
    };
    box.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.b) { C.brand = t.dataset.b; const b = BR[C.brand]; cap(b.n + ': main program = ' + b.main + ' · periodic = ' + b.per + ' · interrupt = ' + b.int + ' · startup = ' + b.start + '.'); }
      else if (t.dataset.i) { C.useInt = t.dataset.i === '1'; S.seenInt = 0; cap(C.useInt ? 'The pulse now starts an interrupt (' + BR[C.brand].int + '). The CPU stops the main program for a moment, counts the pulse, and goes on. No pulse is lost, however long the main program is.' : 'The main program reads its inputs only at the ▼ marks. A 5 ms pulse between two marks is never seen. The longer the program, the more pulses are lost.'); }
      else if (t.dataset.p) { C.pid = t.dataset.p; S.iv = []; S.pidAt = -1; cap(C.pid === 'per' ? 'PID in the periodic task (' + BR[C.brand].per + '): it is called every ' + C.per + ' ms exactly, whatever the main program does. PID maths needs this fixed time.' : 'PID in the main program: it is called once per cycle. The cycle time changes with the program and with every interrupt, so the time between two calls changes too.'); }
      else if (t.dataset.s) C.speed = +t.dataset.s;
      else if (t.dataset.a === 'bug') { C.bug = !C.bug; if (C.bug) cap('A slow loop was added to the main program: now one cycle needs ' + (C.scan + 200) + ' ms. Watch the cycle time.'); }
      else if (t.dataset.a === 'restart') { const keep = C.bug; reset(); S.restarted = !keep; cap(keep ? 'Restarted, but the slow loop is still in the program: it will stop again. Remove the loop first.' : 'Restarted. On the first cycle the startup code runs once (' + BR[C.brand].start + '): set start values there.', keep); }
      else if (t.dataset.a === 'zero') { const st = S.stop; reset(); S.stop = st; }
      ui();
    });
    box.addEventListener('input', (e) => { const k = e.target.dataset.c; if (!k) return; C[k] = +e.target.value; if (k === 'per') { S.iv = []; S.pidAt = -1; } ui(); });
    ui(); checks();
    cap('The main program runs again and again. It reads its inputs only at the ▼ marks. Make it longer with the slider and watch what happens to the 5 ms sensor pulses.');
    requestAnimationFrame(loop);
  };
})();
