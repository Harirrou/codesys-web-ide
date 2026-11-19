/* Ladder Lab — two debug tools for the Lab, like the ones in real PLC software.
 * Cross-reference: every address of the program, where it is written and where it is read, with jumps to the rung
 *   and warnings (two coils, written but never read, read but never written).
 * Trend: a live chart of the signals you pick (inputs, outputs, memory bits, words) over the last 20 seconds.
 * Watch a test: the steps of one challenge test run live on the machine, at human speed. It stops at the moment the test
 *   fails, with the PLC paused, so you can read the ladder. It uses the very same step code as the test runner (LL.testSteps).
 * Hooked into the Lab by a few small calls in app.js. */
(function () {
  const LL = (window.LL = window.LL || {});
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const CSS = `
.lt-x{width:100%;border-collapse:collapse;font-size:.86rem}.lt-x th,.lt-x td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line-2);vertical-align:top}
.lt-x th{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);position:sticky;top:0;background:var(--surface)}
.lt-x td:first-child{font-family:var(--f-mono);font-weight:700;white-space:nowrap}.lt-x small{color:var(--muted)}
.lt-go{border:1px solid var(--line);background:var(--surface-2);color:var(--ink);border-radius:6px;padding:2px 7px;margin:1px 3px 1px 0;font:inherit;font-family:var(--f-mono);font-size:.8rem;cursor:pointer;min-height:28px}
.lt-go:hover{border-color:var(--info)}.lt-go i{font-style:normal;color:var(--muted);font-size:.7rem;margin-left:3px}
.lt-warn{display:inline-block;background:#f5a52433;border-radius:6px;padding:1px 7px;font-size:.78rem;font-weight:600}.lt-warn.bad{background:var(--danger-soft);color:var(--danger)}
.lt-sum{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.lt-wrap{max-height:62vh;overflow:auto}
.lt-flash .rung-bg{stroke:var(--info)!important;stroke-width:3!important}
.lt-trend{padding:12px}.lt-th{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.lt-chips{display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}.lt-chips button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:3px 10px;font:inherit;font-family:var(--f-mono);font-size:.76rem;cursor:pointer;min-height:30px}
.lt-chips button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.lt-trend canvas{display:block;width:100%;height:auto;background:var(--surface-2);border-radius:8px}
.lt-rp{margin:0 12px 10px;padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);border-left:4px solid var(--info)}
.lt-rp.good{border-left-color:var(--power)}.lt-rp.bad{border-left-color:var(--danger);background:var(--danger-soft)}
.lt-rp-h{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.lt-rp-h b{font-size:.92rem;min-width:0}
.lt-rp-h span{display:flex;gap:6px;flex-wrap:wrap}.lt-rp-h small{color:var(--muted);font-family:var(--f-mono);font-weight:400;margin-left:6px}
.lt-rp-dots{display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 6px;padding:0;list-style:none}
.lt-rp-dots li{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:600 .68rem var(--f-mono);background:var(--surface);border:1px solid var(--line);color:var(--muted)}
.lt-rp-dots li.done{background:var(--power);border-color:var(--power);color:#fff}.lt-rp-dots li.now{border-color:var(--info);color:var(--info);box-shadow:0 0 0 3px color-mix(in srgb,var(--info) 22%,transparent)}
.lt-rp-dots li.bad{background:var(--danger);border-color:var(--danger);color:#fff}
.lt-rp-now{font-size:.88rem;margin:0}.lt-rp-now i{font-style:normal;color:var(--muted)}.lt-rp-msg{font-size:.86rem;margin:6px 0 0;color:var(--ink-2)}
.lt-watch{margin-top:6px}.lt-rp [hidden]{display:none!important}.lt-rp{scroll-margin-top:74px;scroll-margin-bottom:150px}`;
  function css() { if (!document.getElementById('lt-css')) { const s = document.createElement('style'); s.id = 'lt-css'; s.textContent = CSS; document.head.appendChild(s); } }
  const isAddr = (v) => typeof v === 'string' && /^(SM|AIW|AQW|MW|MD|MR|HC|STR|ISTR|QSTR|AX|MC|DB|[IQMTC])\d/.test(v) && !/^\d/.test(v);
  const base = (a) => a.replace(/\.(Q|DN|TT|EN|ET|PT|CV|PV|DONE|BUSY|ERR|ABORT|POS|VEL|ON|HOMED|MOVING)$/, '').replace(/^(MW\d+)\.\d+$/, '$1');
  const READS = { NO: 'contact', NC: 'NC contact', P: 'rising edge', N: 'falling edge' }, WRITES = { COIL: 'coil', NCOIL: 'negated coil', SET: 'set', RST: 'reset', TON: 'timer', TOF: 'timer', TP: 'timer', RTO: 'timer', CTU: 'counter', CTD: 'counter' };

  // every address of a program: { key: { w: [{rung, how, blk}], r: [...] } }
  function collect(prog) {
    const use = {};
    const add = (addr, mode, rung, how, blk) => { if (!isAddr(addr)) return; const k = base(addr), u = (use[k] = use[k] || { w: [], r: [] }); if (!u[mode].some((x) => x.rung === rung && x.blk === blk && x.how === how)) u[mode].push({ rung, how, blk }); };
    const visit = (rungs, blk) => (rungs || []).forEach((r, i) => r.cells.forEach((row) => row.forEach((c) => {
      if (!c) return; const t = c.type;
      if (READS[t]) return add(c.addr, 'r', i, READS[t], blk);
      if (t === 'CMP' || t === 'LIM') return ['a', 'b', 'src'].forEach((f) => add(c[f], 'r', i, 'compare', blk));
      if (WRITES[t]) return add(c.addr, 'w', i, WRITES[t], blk);
      if (t === 'CALL') return Object.keys(c.args || {}).forEach((p) => add(c.args[p], 'r', i, 'block call', blk));
      ['src', 'a', 'b'].forEach((f) => add(c[f], 'r', i, t, blk)); ['dst', 'addr'].forEach((f) => add(c[f], 'w', i, t, blk));
    })));
    visit(prog.rungs, '');
    (prog.blocks || []).forEach((b) => visit(b.rungs, b.name));
    return use;
  }
  LL.xrefOf = collect;
  const ORDER = ['I', 'AIW', 'HC', 'Q', 'AQW', 'M', 'MW', 'MD', 'MR', 'T', 'C'];
  const rank = (k) => { const m = /^[A-Z]+/.exec(k)[0], i = ORDER.indexOf(m); return (i < 0 ? 99 : i) * 100000 + (parseFloat(k.replace(/^[A-Z]+/, '')) || 0) * 10; };

  function xref(lab, modal) {
    css();
    const use = collect(lab.prog), tags = lab.tags(), keys = Object.keys(use).sort((a, b) => rank(a) - rank(b));
    const notes = (k, u) => {
      const out = [], coils = u.w.filter((x) => (x.how === 'coil' || x.how === 'negated coil') && !x.blk);
      if (coils.length > 1) out.push('<span class="lt-warn bad">two coils: the last rung wins</span>');
      if (/^(M|MW|MD|MR)\d/.test(k)) { if (u.w.length && !u.r.length) out.push('<span class="lt-warn">written, never read</span>'); if (u.r.length && !u.w.length) out.push('<span class="lt-warn">read, never written</span>'); }
      if (/^[TC]\d/.test(k) && u.r.length && !u.w.length) out.push('<span class="lt-warn bad">no timer or counter with this name</span>');
      if (/^Q\d/.test(k) && u.r.length && !u.w.length) out.push('<span class="lt-warn">read, never written</span>');
      return out.join(' ');
    };
    const refs = (list) => list.map((x) => (x.blk ? `<small>${esc(x.blk)}:${x.rung + 1} ${esc(x.how)}</small> ` : `<button class="lt-go" data-go="${x.rung}">${x.rung + 1}<i>${esc(x.how)}</i></button>`)).join('') || '<small>—</small>';
    const warn = keys.filter((k) => notes(k, use[k])).length;
    const body = keys.length ? `<div class="lt-sum"><span class="chip">${keys.length} addresses</span><span class="chip">${lab.prog.rungs.length} rungs</span>${warn ? `<span class="chip" style="background:#f5a52433">${warn} to check</span>` : '<span class="chip ok">nothing to check</span>'}</div>
      <div class="lt-wrap"><table class="lt-x"><tr><th>Address</th><th>Name</th><th>Written in rung</th><th>Read in rung</th><th></th></tr>${keys.map((k) => `<tr><td>${esc(k)}</td><td>${esc(tags[k] || '')}</td><td>${refs(use[k].w)}</td><td>${refs(use[k].r)}</td><td>${notes(k, use[k])}</td></tr>`).join('')}</table></div>
      <p class="muted" style="font-size:.84rem;margin:10px 0 0">Tap a rung number to jump to it. Real software has the same list: "Cross-references" in TIA Portal, "Cross Reference" in Studio 5000 and CODESYS.</p>` : '<p>The program is empty. Add a rung first.</p>';
    const m = modal('Cross-reference: where is each address used?', body, [{ label: 'Close' }]);
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const x = m.querySelector('[data-x]'); if (x) x.click();
      const tab = lab.el.querySelector('[data-v="program"]'); if (tab) tab.click();
      setTimeout(() => { const g = lab.el.querySelector('.rung[data-rung="' + b.dataset.go + '"]'); if (!g) return; g.scrollIntoView({ block: 'center', behavior: 'smooth' }); g.classList.add('lt-flash'); setTimeout(() => g.classList.remove('lt-flash'), 1800); }, 60);
    });
  }

  // ───────────── trend ─────────────
  const WIN = 20000, COL = ['#22c55e', '#3b82f6', '#f5a524', '#ef4444', '#a855f7', '#14b8a6', '#ec4899', '#84cc16'];
  const isWord = (a) => /^(AIW|AQW|MW|MD|MR|HC)\d/.test(a) || /\.(CV|ET|POS|VEL)$/.test(a);
  function value(lab, a) {
    try { if (/^(I\d|AIW|HC)/.test(a)) return +(lab.I || {})[a] || 0; return isWord(a) ? +lab.m.word(a) || 0 : lab.m.bit(a) ? 1 : 0; } catch (e) { return 0; }
  }
  function toggleTrend(lab) {
    css();
    if (lab._trend) { lab._trend.box.remove(); lab._trend = null; return false; }
    const use = collect(lab.prog), tags = lab.tags();
    const all = [...new Set([...lab.plant.outputs.map((o) => o.addr), ...lab.plant.inputs.map((i) => i.addr), ...Object.keys(use).filter((k) => /^(M|MW|MD|MR|T|C)\d/.test(k))])].filter((a) => !/STR/.test(a)).map((a) => (/^C\d+$/.test(a) ? a + '.CV' : a));
    const sel = new Set(all.filter((a) => /^Q/.test(a)).slice(0, 4).concat(all.filter((a) => /^I\d/.test(a)).slice(0, 2)));
    const box = document.createElement('div'); box.className = 'card lt-trend only-machine';
    box.innerHTML = `<div class="lt-th"><b>Trend · last 20 s</b><span><button class="btn small ghost" data-t="clear">Clear</button> <button class="btn small ghost" data-t="close">Close</button></span></div><div class="lt-chips"></div><canvas width="640" height="200" role="img" aria-label="Trend of the selected signals"></canvas>`;
    const mach = lab.el.querySelector('.card.machine'); mach.parentNode.insertBefore(box, mach.nextSibling);
    const T = (lab._trend = { box, sel, all, buf: {}, cv: box.querySelector('canvas'), t0: lab.m.time });
    const chips = () => { box.querySelector('.lt-chips').innerHTML = all.map((a) => `<button data-s="${esc(a)}" class="${sel.has(a) ? 'on' : ''}" title="${esc(tags[base(a)] || '')}">${esc(a)}${tags[base(a)] ? ' ' + esc(String(tags[base(a)]).slice(0, 14)) : ''}</button>`).join(''); };
    chips();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t === 'close') return toggleTrend(lab);
      if (b.dataset.t === 'clear') { T.buf = {}; return; }
      if (b.dataset.s) { const a = b.dataset.s; if (sel.has(a)) sel.delete(a); else if (sel.size < 8) sel.add(a); chips(); }
    });
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return true;
  }
  function sample(lab) {
    const T = lab._trend; if (!T) return;
    if (!document.body.contains(T.box)) { lab._trend = null; return; }
    const now = lab.m.time;
    T.sel.forEach((a) => { const b = (T.buf[a] = T.buf[a] || []), v = value(lab, a); if (!b.length || b[b.length - 1][0] !== now) b.push([now, v]); while (b.length && b[0][0] < now - WIN) b.shift(); });
    const cv = T.cv, list = [...T.sel], H = Math.max(120, list.length * 30 + 26);
    const W = Math.max(280, Math.min(900, Math.round(cv.clientWidth) || 640)), L = W < 420 ? 64 : 96;
    if (cv.height !== H) cv.height = H;
    if (cv.width !== W) cv.width = W;
    const ctx = cv.getContext('2d'), cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim(), X = (t) => L + ((t - (now - WIN)) / WIN) * (W - L - 6);
    ctx.clearRect(0, 0, W, H); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textBaseline = 'middle';
    for (let s = 0; s <= 20; s += 5) { const x = X(now - s * 1000); ctx.strokeStyle = v('--line-2'); ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, H - 18); ctx.stroke(); ctx.fillStyle = v('--muted'); ctx.textAlign = 'center'; ctx.fillText(s ? '-' + s + ' s' : 'now', Math.min(W - 16, x), H - 8); }
    list.forEach((a, i) => {
      const y0 = 8 + i * 30, b = T.buf[a] || [], word = isWord(a), cur = b.length ? b[b.length - 1][1] : 0;
      let lo = 0, hi = 1; if (word) { lo = Math.min(...b.map((p) => p[1]), 0); hi = Math.max(...b.map((p) => p[1]), lo + 1); }
      const Y = (val) => y0 + 22 - ((val - lo) / (hi - lo)) * 18;
      ctx.fillStyle = COL[i % 8]; ctx.textAlign = 'left'; ctx.fillText(a, 4, y0 + 8); ctx.fillStyle = v('--muted'); ctx.fillText(word ? String(Math.round(cur * 100) / 100) : cur ? 'ON' : 'off', 4, y0 + 20);
      ctx.strokeStyle = COL[i % 8]; ctx.lineWidth = 1.8; ctx.beginPath();
      b.forEach((p, k) => { const x = X(p[0]), y = Y(p[1]); if (!k) ctx.moveTo(x, y); else { if (!word) ctx.lineTo(x, Y(b[k - 1][1])); ctx.lineTo(x, y); } });
      if (b.length) ctx.lineTo(X(now), Y(cur)); ctx.stroke(); ctx.lineWidth = 1;
    });
  }
  // ───────────── watch a test live ─────────────
  const SPEEDS = [1, 4, 16];
  function stopReplay(lab) { const R = lab._replay; if (R) { R.bar.remove(); lab._replay = null; } }
  function replay(lab, k) {
    css();
    stopReplay(lab);
    const ch = lab.ch, t = ch && ch.tests[k]; if (!t) return;
    const tags = Object.assign({}, LL.plantTags(ch.plant), ch.tags || {});       // the same names the test runner uses
    // a fresh PLC and a fresh machine, exactly like the start of a test
    lab.m.reset(); lab.pst = lab.initPlant(); lab.acc = 0; lab.forces = {}; lab.ctrl = {}; lab.buildDevices();
    Object.keys(lab.ctrl).forEach((key) => delete lab.ctrl[key]);
    if (lab.ladder && lab.ladder.setActiveRung) lab.ladder.setActiveRung(-1);
    const env = { plant: lab.plant, idx: 0, get m() { return lab.m; }, get ctrl() { return lab.ctrl; }, get st() { return lab.pst; }, get I() { return lab.I || {}; } };
    const opts = { tags, never: ch.never };
    const bar = document.createElement('div'); bar.className = 'lt-rp'; bar.setAttribute('role', 'status');
    bar.innerHTML = `<div class="lt-rp-h"><b>▶ Watching: ${esc(t.name)}<small data-t></small></b><span><button class="btn small" data-r="speed" title="Play faster">1×</button><button class="btn small" data-r="again" hidden>Watch again</button><button class="btn small" data-r="prog" hidden>Show the program</button><button class="btn small ghost" data-r="stop">Stop</button></span></div><ol class="lt-rp-dots">${t.steps.map((x, i) => `<li title="${esc(LL.describeStep(x, tags))}">${i + 1}</li>`).join('')}</ol><p class="lt-rp-now"></p><p class="lt-rp-msg" hidden></p>`;
    const mach = lab.el.querySelector('.card.machine'); mach.insertBefore(bar, mach.querySelector('canvas'));
    const R = (lab._replay = { k, test: t, env, opts, tags, bar, gen: LL.testSteps(env, t.steps, opts), started: false, over: false, speed: 1, t: 0, scan0: 0, shown: -2 });
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.r === 'stop') return stopReplay(lab);
      if (b.dataset.r === 'again') return replay(lab, k);
      if (b.dataset.r === 'prog') { const pv = lab.el.querySelector('[data-v="program"]'); if (pv) pv.click(); return; }
      if (b.dataset.r === 'speed') { R.speed = SPEEDS[(SPEEDS.indexOf(R.speed) + 1) % SPEEDS.length]; b.textContent = R.speed + '×'; }
    });
    lab.running = true; lab.updateRunBtn();
    const mv = lab.el.querySelector('[data-v="machine"]'); if (mv && window.innerWidth <= 1000) mv.click();
    show(bar);
    replayDraw(lab);
  }
  // phone: the bar goes to the top, so the machine under it is on screen; desktop: scroll as little as possible
  function show(bar) { bar.scrollIntoView({ block: window.innerWidth <= 1000 ? 'start' : 'nearest', behavior: 'smooth' }); }
  function finish(lab, ok, msg) {
    const R = lab._replay; R.over = true; R.ok = ok; R.msg = msg || '';
    const bar = R.bar, q = (x) => bar.querySelector(x);
    bar.classList.add(ok ? 'good' : 'bad');
    q('[data-r="speed"]').hidden = true; q('[data-r="again"]').hidden = false; q('[data-r="stop"]').textContent = 'Close';
    q('.lt-rp-h b').firstChild.textContent = (ok ? '✓ Passed: ' : '✕ Failed: ') + R.test.name;
    const m = q('.lt-rp-msg'); m.hidden = false;
    if (ok) m.textContent = 'Every step was right. The machine keeps running, so you can go on by hand.';
    else {
      lab.running = false; lab.updateRunBtn();                                   // freeze this moment
      q('[data-r="prog"]').hidden = false;
      const pre = 'Step ' + (R.env.idx + 1) + ' (' + LL.describeStep(R.test.steps[R.env.idx] || '', R.tags) + '): ';   // the step is already shown above
      let short = msg.startsWith(pre) ? msg.slice(pre.length) : msg; short = short.charAt(0).toUpperCase() + short.slice(1);
      m.innerHTML = '<b>' + esc(short) + '</b><br>The PLC is paused at this moment. Look at the ladder: follow the green power and find the contact that stops it (or the one that should have stopped it).';
    }
    replayDraw(lab);
    show(bar);
  }
  // called by the Lab after every scan; false = the replay is over, stop scanning this frame
  function replayScan(lab) {
    const R = lab._replay; if (!R || R.over) return true;
    if (lab.m.scanCount < R.scan0) { stopReplay(lab); return true; }             // the program was changed or reset by hand
    R.scan0 = lab.m.scanCount; R.t += 10;
    let err = null, r;
    try { LL.testAfterTick(R.env, R.opts); } catch (e) { err = e; }
    try {
      if (err && !R.started) throw err;
      r = err ? R.gen.throw(err) : R.gen.next(); R.started = true;
    } catch (e) { finish(lab, false, e.message); return false; }
    if (r.done) { finish(lab, true); }
    return true;
  }
  // called once per frame: step marker, time, pressed buttons
  function replayDraw(lab) {
    const R = lab._replay; if (!R) return;
    if (!document.body.contains(R.bar)) { lab._replay = null; return; }
    (lab.devButtons || []).forEach((b) => b._sync && b._sync());
    const act = R.env.acted; if (act) { R.env.acted = null; if (act.toggle) [...lab.el.querySelectorAll('.dev.act')].filter((x) => x.textContent.startsWith(act.label)).forEach((x) => x.classList.toggle('down')); }
    R.bar.querySelector('[data-t]').textContent = (R.t / 1000).toFixed(1) + ' s';
    const idx = R.over ? (R.ok ? R.test.steps.length : R.env.idx) : R.started ? R.env.idx : -1, key = idx + (R.over ? 1000 : 0);
    if (key === R.shown) return; R.shown = key;
    [...R.bar.querySelectorAll('.lt-rp-dots li')].forEach((li, i) => { li.className = i < idx ? 'done' : i === idx ? (R.over && !R.ok ? 'bad' : 'now') : ''; });
    const now = R.bar.querySelector('.lt-rp-now'), n = R.test.steps.length;
    now.innerHTML = idx < 0 ? '<i>Starting the PLC…</i>' : idx >= n ? '<i>All ' + n + ' steps done.</i>' : '<i>Step ' + (idx + 1) + ' of ' + n + ':</i> ' + esc(LL.describeStep(R.test.steps[idx], R.tags));
  }
  LL.LabTools = { xref, toggleTrend, sample, replay, replayScan, replayDraw, stopReplay };
})();
