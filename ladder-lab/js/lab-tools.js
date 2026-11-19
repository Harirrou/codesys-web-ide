/* Ladder Lab — two debug tools for the Lab, like the ones in real PLC software.
 * Cross-reference: every address of the program, where it is written and where it is read, with jumps to the rung
 *   and warnings (two coils, written but never read, read but never written).
 * Trend: a live chart of the signals you pick (inputs, outputs, memory bits, words) over the last 20 seconds.
 * Hooked into the Lab by three small calls in app.js. */
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
.lt-chips button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.lt-trend canvas{display:block;width:100%;height:auto;background:var(--surface-2);border-radius:8px}`;
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
  LL.LabTools = { xref, toggleTrend, sample };
})();
