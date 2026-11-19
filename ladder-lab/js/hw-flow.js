/* Ladder Lab — "Jumps, zones, queues, sequencer": four instructions you meet in older programs. Mounted through [[hw:flow]].
 * Jump (JMP / LBL): the rungs in between are NOT scanned, so everything there keeps its last state.
 * Zone (MCR, Omron IL / ILC): the rungs are scanned as FALSE, so normal coils drop and TON timers reset; latched bits stay.
 * Queue (FIFO / LIFO): values go in at one end; first in first out, or last in first out.
 * Sequencer (SQO, drum): a table of output patterns; every pulse moves to the next row.
 * The logic is in LL.FlowSim (pure, tested in node); the rest is the widget. */
(function (G) {
  const LL = (G.LL = G.LL || {});
  // ───────────── pure logic ─────────────
  const PT = 3000;
  const FlowSim = {
    PT,
    newZone: () => ({ motor: 0, valve: 0, et: 0, t1: 0, lamp: 0, tr: ['run', 'run', 'run', 'run', 'run', 'run', 'run'] }),
    // one scan of the 7-rung demo program. mode 'jmp': inp.z = 1 jumps over rungs 2-4. mode 'mcr': inp.z = 1 enables the zone.
    zone(st, inp, mode, dt) {
      const tr = ['run'];
      if (mode === 'jmp' && inp.z) tr.push('skip', 'skip', 'skip');           // not scanned: nothing in there changes
      else {
        const p = mode === 'mcr' && !inp.z ? 0 : 1;                           // zone off: every rung is solved as false
        st.motor = p && inp.b ? 1 : 0;
        if (p && inp.c) st.valve = 1;
        st.et = p && inp.b ? Math.min(PT, st.et + dt) : 0;
        st.t1 = st.et >= PT ? 1 : 0;
        tr.push(p ? 'run' : 'off', p ? 'run' : 'off', p ? 'run' : 'off');
      }
      tr.push('run');
      st.lamp = inp.d ? 1 : 0; tr.push('run');
      if (inp.r) st.valve = 0; tr.push('run');
      st.tr = tr;
      return st;
    },
    load(q, v, cap) { if (q.length >= cap) return false; q.push(v); return true; },
    unload(q, mode) { if (!q.length) return undefined; return mode === 'lifo' ? q.pop() : q.shift(); },
    SEQ: { outs: ['Clamp', 'Drill motor', 'Drill down', 'Eject', 'Done lamp'], rows: [[1, 0, 0, 0, 0], [1, 1, 0, 0, 0], [1, 1, 1, 0, 0], [1, 1, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]] },
    next(pos, n) { return (pos + 1) % n; },
  };
  LL.FlowSim = FlowSim;
  if (typeof document === 'undefined') return;

  // ───────────── widget ─────────────
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-flow';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const CHECKS = [
    ['jmp', 'Jump: start the motor (B on), switch SKIP on, then switch B off. The motor stays ON.'],
    ['mcr', 'Zone: latch the valve (tap C), keep B on, then switch ENABLE off. The motor drops, the valve stays.'],
    ['full', 'Queue: load parts until the queue is FULL.'],
    ['fifo', 'Queue: with two or more parts inside, unload in FIFO. The oldest part comes out.'],
    ['lifo', 'Queue: with two or more parts inside, unload in LIFO. The newest part comes out.'],
    ['turn', 'Sequencer: step through the whole table until it starts again at row 1.'],
  ];
  const CSS = `
.hw-flow{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:14px 0}
.hwf-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.hwf-tabs button,.hwf-seg button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 14px;font:inherit;font-weight:600;font-size:.86rem;cursor:pointer;min-height:36px}
.hwf-tabs button.on,.hwf-seg button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.hwf-cap{background:var(--surface-2);border-radius:8px;padding:8px 10px;font-size:.88rem;margin:8px 0}
.hwf-rungs{display:grid;gap:4px;margin:8px 0}.hwf-r{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:center;padding:6px 10px;border-radius:8px;border:1px solid var(--line-2);background:var(--surface);font-family:var(--f-mono);font-size:.82rem}
.hwf-r b{color:var(--accent)}.hwf-r i{font-style:normal;font-family:var(--f-body);font-size:.74rem;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap}
.hwf-r.run i{background:var(--power-soft);color:var(--power)}.hwf-r.skip{opacity:.55;border-style:dashed}.hwf-r.skip i{background:var(--surface-3);color:var(--muted)}
.hwf-r.off{background:var(--danger-soft)}.hwf-r.off i{background:var(--danger);color:#fff}.hwf-r.zone{margin-left:14px}.hwf-r.edge{border-color:var(--info)}
.hwf-io{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}.hwf-sw{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:7px 12px;font:inherit;font-weight:600;font-size:.86rem;cursor:pointer;min-height:40px}
.hwf-sw.on{background:var(--power);border-color:var(--power);color:#fff}.hwf-lamp{display:inline-flex;align-items:center;gap:6px;font-size:.86rem;font-weight:600;padding:5px 10px;border-radius:999px;background:var(--surface-2)}
.hwf-lamp::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--p-lampoff)}.hwf-lamp.on::before{background:var(--power-bright);box-shadow:0 0 0 3px var(--power-soft)}
.hwf-bar{display:inline-block;width:70px;height:8px;border-radius:4px;background:var(--surface-3);overflow:hidden;vertical-align:middle}.hwf-bar s{display:block;height:100%;background:var(--accent-bg)}
.hwf-q{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:10px 0}.hwf-q div{height:54px;border-radius:10px;border:1px dashed var(--line);display:grid;place-items:center;font-weight:700;font-size:.8rem;color:var(--muted)}
.hwf-q div.g{border:1px solid var(--power);background:var(--power-soft);color:var(--power)}.hwf-q div.b{border:1px solid var(--danger);background:var(--danger-soft);color:var(--danger)}.hwf-q small{display:block;font-weight:400;font-size:.66rem;color:var(--muted)}
.hwf-ends{display:flex;justify-content:space-between;font-size:.74rem;color:var(--muted)}
.hwf-t{width:100%;border-collapse:collapse;font-size:.82rem;margin:8px 0}.hwf-t th,.hwf-t td{padding:5px 6px;border-bottom:1px solid var(--line-2);text-align:center}.hwf-t th:first-child,.hwf-t td:first-child{text-align:left;font-family:var(--f-mono)}
.hwf-t th{font-size:.7rem;color:var(--muted)}.hwf-t tr.on td{background:var(--power-soft);font-weight:700}.hwf-t td.one{color:var(--power);font-weight:700}
.hwf-sec{display:flex;justify-content:space-between;font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:12px 0 6px}
.hwf-chk{display:grid;gap:6px}.hwf-chk div{background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:.86rem}.hwf-chk div.ok{background:var(--power-soft)}.hwf-chk div::before{content:"○ ";color:var(--muted)}.hwf-chk div.ok::before{content:"✓ ";color:var(--power)}
.hw-flow [hidden]{display:none!important}@media(max-width:520px){.hwf-r{grid-template-columns:20px 1fr;}.hwf-r i{grid-column:2;justify-self:start}.hwf-q div{height:46px;font-size:.7rem}}`;

  LL.HW.flow = function (ph) {
    if (!document.getElementById('hw-flow-css')) { const st = document.createElement('style'); st.id = 'hw-flow-css'; st.textContent = CSS; document.head.appendChild(st); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    let tab = 'jmp', Z = FlowSim.newZone(), inp = { z: 0, b: 0, c: 0, d: 0, r: 0 }, q = [], qmode = 'fifo', qmsg = 'The camera checks every part and stores the result. Three stations later the reject arm takes the result out again.', pos = 0, auto = false, seen = new Set([0]), n = 0;
    const CAP = 6, SEQ = FlowSim.SEQ;
    const box = document.createElement('div'); box.className = 'hw-box hw-flow';
    box.innerHTML = `<div class="hwf-tabs"><button data-t="jmp">Jump (JMP / LBL)</button><button data-t="mcr">Zone (MCR)</button><button data-t="q">Queue (FIFO / LIFO)</button><button data-t="seq">Sequencer</button></div><div class="hwf-body"></div><div class="hwf-sec"><span>Try these</span><span class="hwf-prog"></span></div><div class="hwf-chk"></div>`;
    ph.replaceWith(box);
    const $ = (s) => box.querySelector(s), body = $('.hwf-body');
    const mark = (k) => { if (!done[k]) { done[k] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } checks(); } };
    function checks() { $('.hwf-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join(''); $('.hwf-prog').textContent = CHECKS.filter(([k]) => done[k]).length + ' / ' + CHECKS.length; }
    const sw = (k, label) => `<button type="button" class="hwf-sw ${inp[k] ? 'on' : ''}" data-i="${k}" aria-pressed="${inp[k] ? 'true' : 'false'}">${label}: ${inp[k] ? 'ON' : 'off'}</button>`;
    const lamp = (v, label) => `<span class="hwf-lamp ${v ? 'on' : ''}">${label}</span>`;
    function drawZone() {
      const jmp = tab === 'jmp', T = Z.tr, word = { run: 'scanned', skip: 'not scanned', off: 'solved as FALSE' };
      const rows = [[jmp ? 'SKIP ─┤ ├─ ( JMP L1 )' : 'ENABLE ─┤ ├─ ( MCR )   zone start', 'edge'], ['B ─┤ ├─ ( Motor )', 'zone'], ['C ─┤ ├─ ( S  Valve )   latch', 'zone'], ['B ─┤ ├─ [ TON T1  3 s ]', 'zone'], [jmp ? 'LBL L1   the jump lands here' : '( MCR )   zone end', 'edge'], ['D ─┤ ├─ ( Lamp )', ''], ['R ─┤ ├─ ( R  Valve )   unlatch', '']];
      const state = jmp ? (inp.z ? 'SKIP is on: rungs 2 to 4 are <b>not scanned</b>. Nothing in there changes: the motor, the valve and the timer keep the state they had.' : 'SKIP is off: all rungs are scanned, like a normal program.') : (inp.z ? 'ENABLE is on: the zone works like normal rungs.' : 'ENABLE is off: rungs 2 to 4 are scanned but <b>solved as FALSE</b>. The normal coil drops and the timer resets. The latched valve stays, because a false SET rung does nothing.');
      body.innerHTML = `<div class="hwf-io">${sw('z', jmp ? 'SKIP' : 'ENABLE')}${sw('b', 'B')}${sw('c', 'C')}${sw('d', 'D')}${sw('r', 'R')}</div>
        <div class="hwf-rungs">${rows.map(([t, cls], i) => `<div class="hwf-r ${T[i]} ${cls}"><b>${i + 1}</b><span>${esc(t)}</span><i>${word[T[i]]}</i></div>`).join('')}</div>
        <div class="hwf-io">${lamp(Z.motor, 'Motor')}${lamp(Z.valve, 'Valve (latched)')}<span class="hwf-lamp ${Z.t1 ? 'on' : ''}">T1 <span class="hwf-bar"><s style="width:${(Z.et / PT) * 100}%"></s></span> ${(Z.et / 1000).toFixed(1)} s</span>${lamp(Z.lamp, 'Lamp')}</div>
        <div class="hwf-cap">${state}</div>`;
    }
    function drawQ() {
      const cells = []; for (let i = 0; i < CAP; i++) { const v = q[i]; cells.push(v ? `<div class="${v.ok ? 'g' : 'b'}">${v.ok ? 'good' : 'BAD'}<small>part ${v.n}</small></div>` : '<div>empty</div>'); }
      body.innerHTML = `<div class="hwf-io"><span class="hwf-seg"><button data-m="fifo" class="${qmode === 'fifo' ? 'on' : ''}">FIFO: first in, first out</button> <button data-m="lifo" class="${qmode === 'lifo' ? 'on' : ''}">LIFO: last in, first out</button></span></div>
        <div class="hwf-ends"><span>oldest</span><span>newest</span></div><div class="hwf-q">${cells.join('')}</div>
        <div class="hwf-io"><button class="btn small" data-q="g">Load a good part</button><button class="btn small" data-q="b">Load a BAD part</button><button class="btn small primary" data-q="u">Unload one</button><button class="btn small ghost" data-q="c">Empty</button></div>
        <div class="hwf-io">${lamp(!q.length, 'EMPTY')}${lamp(q.length >= CAP, 'FULL')}<span class="hwf-lamp">count ${q.length} of ${CAP}</span></div>
        <div class="hwf-cap">${qmsg}</div>`;
    }
    function drawSeq() {
      body.innerHTML = `<div class="hwf-io"><button class="btn small primary" data-s="n">Next step (one pulse)</button><button class="btn small" data-s="a">${auto ? 'Stop' : 'Run by itself'}</button><button class="btn small ghost" data-s="r">Back to row 1</button></div>
        <div style="overflow-x:auto"><table class="hwf-t"><tr><th>Row</th>${SEQ.outs.map((o) => `<th>${o}</th>`).join('')}</tr>${SEQ.rows.map((r, i) => `<tr class="${i === pos ? 'on' : ''}"><td>${i === pos ? '▶ ' : ''}${i + 1}</td>${r.map((v) => `<td class="${v ? 'one' : ''}">${v}</td>`).join('')}</tr>`).join('')}</table></div>
        <div class="hwf-io">${SEQ.outs.map((o, i) => lamp(SEQ.rows[pos][i], o)).join('')}</div>
        <div class="hwf-cap">The sequencer copies <b>row ${pos + 1}</b> of the table to the outputs. Every pulse (a sensor, a timer) moves it one row down; after the last row it starts again. Today you build the same with a step number and CASE, or with an array: <code>Outputs := Table[Step]</code>.</div>`;
    }
    function draw() { box.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === tab)); if (tab === 'q') drawQ(); else if (tab === 'seq') drawSeq(); else drawZone(); }
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t) { tab = b.dataset.t; if (tab === 'jmp' || tab === 'mcr') { Z = FlowSim.newZone(); inp = { z: tab === 'mcr' ? 1 : 0, b: 0, c: 0, d: 0, r: 0 }; } auto = false; }
      if (b.dataset.i) inp[b.dataset.i] = inp[b.dataset.i] ? 0 : 1;
      if (b.dataset.m) qmode = b.dataset.m;
      if (b.dataset.q === 'g' || b.dataset.q === 'b') { n++; if (FlowSim.load(q, { ok: b.dataset.q === 'g', n }, CAP)) { qmsg = 'Part ' + n + ' is stored at the "newest" end.'; if (q.length >= CAP) { mark('full'); qmsg += ' The queue is FULL: stop the infeed, or the next result is lost.'; } } else { n--; qmsg = '<b>FULL:</b> the load is refused. On a real line this is the moment a result gets lost and the wrong part is rejected later.'; } }
      if (b.dataset.q === 'u') { const had = q.length, v = FlowSim.unload(q, qmode); if (!v) qmsg = '<b>EMPTY:</b> there is nothing to unload. Always check the EMPTY bit first.'; else { qmsg = (qmode === 'fifo' ? 'FIFO gives the <b>oldest</b>: part ' : 'LIFO gives the <b>newest</b>: part ') + v.n + ' (' + (v.ok ? 'good, it passes' : 'BAD, the reject arm fires') + ').'; if (had >= 2) mark(qmode); } }
      if (b.dataset.q === 'c') { q = []; qmsg = 'Queue emptied.'; }
      if (b.dataset.s === 'n') stepSeq();
      if (b.dataset.s === 'a') auto = !auto;
      if (b.dataset.s === 'r') { pos = 0; seen = new Set([0]); }
      draw();
    });
    function stepSeq() { pos = FlowSim.next(pos, SEQ.rows.length); if (pos === 0 && seen.size === SEQ.rows.length) mark('turn'); if (pos === 0) seen = new Set([0]); else seen.add(pos); }
    let last = 0, acc = 0;
    const timer = setInterval(() => {
      if (!document.body.contains(box)) { clearInterval(timer); return; }
      const now = Date.now(), dt = Math.min(300, last ? now - last : 100); last = now;
      if (tab === 'jmp' || tab === 'mcr') {
        const before = JSON.stringify([Z.motor, Z.valve, Z.t1, Z.lamp, Z.tr, Math.round(Z.et / 100)]);
        FlowSim.zone(Z, inp, tab, dt);
        if (tab === 'jmp' && inp.z && Z.motor && !inp.b) mark('jmp');
        if (tab === 'mcr' && !inp.z && inp.b && !Z.motor && Z.valve) mark('mcr');
        if (before !== JSON.stringify([Z.motor, Z.valve, Z.t1, Z.lamp, Z.tr, Math.round(Z.et / 100)])) drawZone();
      } else if (tab === 'seq' && auto) { acc += dt; if (acc >= 900) { acc = 0; stepSeq(); drawSeq(); } }
    }, 100);
    checks(); draw();
  };
})(typeof window !== 'undefined' ? window : globalThis);
