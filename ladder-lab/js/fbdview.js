/* PLC Start — FBD (function block diagram) view of a ladder program. Read-only and live.
 *
 * Every rung becomes one network: contacts in series become an AND box (&), parallel branches an OR box (>=1),
 * an NC contact is a small circle (negation) on the pin, and the coil / timer / counter / maths box sits on the right.
 * It is the same logic as the ladder, drawn the way TIA Portal, CODESYS and others show FBD.
 *
 * LL.FBD.trees(rung)                 → [{ expr, outs: [cell] }]   logic tree(s) of one rung (pure, tested in node)
 * LL.FBD.value(expr, M, rungIndex)   → 0 | 1                      what the tree gives with the live PLC values
 * LL.FBD.render(host, rungs, tags)   → { update(M) }              draws all networks as SVG
 * LL.FBD.toggle(lab) / LL.FBD.tick(lab)                           the card under the ladder in the Lab */
(function (G) {
  const LL = (G.LL = G.LL || {});
  const TRUE = { t: 'true' };
  const IN_TYPES = { NO: 1, NC: 1, P: 1, N: 1, CMP: 1, LIM: 1 };

  // ───────────── ladder grid → logic tree (same walk as the Structured Text export) ─────────────
  const key = (x) => {
    if (!x) return 'F';
    switch (x.t) {
      case 'true': return 'T';
      case 'in': { const c = x.cell; return (x.neg ? '!' : '') + c.type + ':' + (c.addr || '') + ':' + (c.a || '') + (c.op || '') + (c.b || '') + (c.src || ''); }
      case 'not': return '!(' + key(x.x) + ')';
      default: return x.t + '(' + x.items.map(key).join(',') + ')';
    }
  };
  function AND(a, b) {
    if (!a || !b) return null;
    if (a.t === 'true') return b;
    if (b.t === 'true') return a;
    return { t: 'and', items: [].concat(a.t === 'and' ? a.items : [a], b.t === 'and' ? b.items : [b]) };
  }
  function OR(list) {
    const xs = [];
    list.forEach((x) => { if (!x) return; if (x.t === 'or') x.items.forEach((y) => xs.push(y)); else xs.push(x); });
    if (!xs.length) return null;
    if (xs.some((x) => x.t === 'true')) return TRUE;
    const uniq = [], seen = new Set();
    xs.forEach((x) => { const k = key(x); if (!seen.has(k)) { seen.add(k); uniq.push(x); } });
    if (uniq.length === 1) return uniq[0];
    // the part that all branches share comes out in front:  A·B + A·C  →  A·(B + C)
    const fs = uniq.map((x) => (x.t === 'and' ? x.items : [x]));
    let k = 0;
    while (fs.every((f) => f.length > k && key(f[k]) === key(fs[0][k]))) k++;
    if (k > 0) {
      const pre = fs[0].slice(0, k), rests = fs.map((f) => f.slice(k));
      const preNode = pre.length === 1 ? pre[0] : { t: 'and', items: pre };
      if (rests.some((r) => !r.length)) return preNode;
      return AND(preNode, OR(rests.map((r) => (r.length === 1 ? r[0] : { t: 'and', items: r }))));
    }
    return { t: 'or', items: uniq };
  }
  function trees(rung) {
    const R = rung.rows, C = rung.cols;
    let cur = new Array(R).fill(TRUE);
    for (let c = 0; c < C - 1; c++) {
      const next = [];
      for (let r = 0; r < R; r++) {
        const cell = rung.cells[r][c];
        let e = null;
        if (cell) {
          if (cell.type === 'WIRE') e = cur[r];
          else if (cell.type === 'NOT') e = cur[r] ? { t: 'not', x: cur[r] } : TRUE;
          else if (IN_TYPES[cell.type]) e = AND(cur[r], { t: 'in', cell, r, c, neg: cell.type === 'NC' });
        }
        next.push(e);
      }
      let r = 0;
      while (r < R) {
        const s = r;
        while (r < R - 1 && rung.links[r][c + 1]) r++;
        if (r > s) { const g = OR(next.slice(s, r + 1)); for (let k = s; k <= r; k++) next[k] = g; }
        r++;
      }
      cur = next;
    }
    const out = [];
    for (let r = 0; r < R; r++) {
      const cell = rung.cells[r][C - 1];
      if (!cell) continue;
      const last = out[out.length - 1];
      if (last && key(last.expr) === key(cur[r])) last.outs.push(cell); else out.push({ expr: cur[r], outs: [cell] });
    }
    return out;
  }

  // ───────────── live value of a tree ─────────────
  function leafRaw(x, M, ri) {   // the signal itself, before the negation circle
    const c = x.cell;
    try {
      switch (c.type) {
        case 'NO': case 'NC': return M.bit(c.addr) ? 1 : 0;
        case 'P': case 'N': { const tr = M.trace && M.trace[ri]; return tr && tr.pin[x.r] && tr.pin[x.r][x.c] && tr.pout[x.r][x.c] ? 1 : 0; }
        case 'CMP': return M.compare(c.a, c.op, c.b) ? 1 : 0;
        case 'LIM': { const v = M.word(c.src); return M.word(c.a) <= v && v <= M.word(c.b) ? 1 : 0; }
      }
    } catch (e) { /* an address the PLC does not know yet */ }
    return 0;
  }
  function value(x, M, ri) {
    if (!x) return 0;
    switch (x.t) {
      case 'true': return 1;
      case 'in': { const v = leafRaw(x, M, ri); return x.neg ? 1 - v : v; }
      case 'not': return value(x.x, M, ri) ? 0 : 1;
      case 'and': return x.items.every((i) => value(i, M, ri)) ? 1 : 0;
      case 'or': return x.items.some((i) => value(i, M, ri)) ? 1 : 0;
    }
    return 0;
  }

  // ───────────── drawing ─────────────
  const ROW = 30, GW = 44, esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const dur = (ms) => (ms >= 1000 && ms % 100 === 0 ? ms / 1000 + 's' : ms + 'ms');
  const OUT_SYM = { COIL: '=', NCOIL: '=', SET: 'S', RST: 'R' };
  function leafText(c, tags) {
    const nm = (a) => (tags && tags[a]) || '';
    switch (c.type) {
      case 'P': return { a: '↑ ' + (nm(c.addr) || c.addr), b: nm(c.addr) ? c.addr : 'rising edge' };
      case 'N': return { a: '↓ ' + (nm(c.addr) || c.addr), b: nm(c.addr) ? c.addr : 'falling edge' };
      case 'CMP': return { a: (nm(c.a) || c.a) + ' ' + c.op + ' ' + (nm(c.b) || c.b), b: '' };
      case 'LIM': return { a: (nm(c.a) || c.a) + ' ≤ ' + (nm(c.src) || c.src) + ' ≤ ' + (nm(c.b) || c.b), b: '' };
    }
    return nm(c.addr) ? { a: nm(c.addr), b: c.addr } : { a: c.addr || '?', b: '' };
  }
  function outLines(c) {
    const L = [];
    const push = (k, v) => { if (v != null && v !== '') L.push(k + ' ' + v); };
    if (c.pt != null) push('PT', dur(c.pt));
    if (c.pv != null) push('PV', c.pv);
    if (c.block) push('', c.block + (c.inst ? ' · ' + c.inst : ''));
    if (c.ax) push('axis', c.ax);
    if (c.type === 'CMP') push('', c.a + ' ' + c.op + ' ' + c.b);
    else { push('IN1', c.a); push('IN2', c.b); }
    push('IN', c.src); push('N', c.n); push('OUT', c.dst);
    if (c.args) Object.keys(c.args).forEach((k) => push(k, c.args[k]));
    return L.map((s) => s.trim());
  }
  // sizes: rows a subtree needs and its width
  function measure(x, tags) {
    if (!x || x.t === 'true') { x = x || { t: 'false' }; return { x, kind: 'label', txt: { a: x.t === 'true' ? 'always on' : 'not connected', b: '' }, h: 1, w: 86, neg: false }; }
    if (x.t === 'not') { const m = measure(x.x, tags); m.neg = !m.neg; m.expr = x; return m; }
    if (x.t === 'in') { const txt = leafText(x.cell, tags); return { x, kind: 'leaf', txt, h: 1, w: Math.max(34, Math.max(txt.a.length * 6.9, txt.b.length * 5.6) + 12), neg: !!x.neg }; }
    const kids = x.items.map((i) => measure(i, tags));
    let off = 0; kids.forEach((k) => { k.off = off; off += k.h; });   // the box is as tall as everything that feeds it: every wire is straight
    const gap = 18;
    return { x, kind: 'gate', kids, h: off, gap, w: Math.max(...kids.map((k) => k.w)) + gap + GW, neg: false };
  }
  function render(host, rungs, tags, opts) {
    opts = opts || {};
    const live = [];                                        // { el, fn(M) }
    let html = '';
    const nets = rungs.map((rung, ri) => {
      const groups = trees(rung);
      let svg = '', H = 8, W = 0; const reg = [];
      const wire = (d, fn) => { reg.push(fn); return `<path class="fbd-w" data-l="${reg.length - 1}" d="${d}"/>`; };
      // a rung inside an MCR zone that is off, or a rung that a jump skips, has no power: the ladder trace knows (left rail = 0)
      const rail = (M) => { const tr = M.trace && M.trace[ri]; return !tr || !tr.node || !tr.node[0] || tr.node[0][0] ? 1 : 0; };
      const draw = (m, xr, yt, valFn) => {                   // returns the y of the output; the output is at (xr, y)
        const y = yt + ROW / 2;
        if (m.kind === 'label') { svg += `<text class="fbd-n fbd-dim" x="${xr - 6}" y="${y + 4}" text-anchor="end">${esc(m.txt.a)}</text>`; return y; }
        if (m.kind === 'leaf') {
          reg.push((M) => leafRaw(m.x, M, ri));
          svg += `<g class="fbd-leaf" data-l="${reg.length - 1}"><text class="fbd-n" x="${xr - 6}" y="${m.txt.b ? y - 1 : y + 4}" text-anchor="end">${esc(m.txt.a)}</text>${m.txt.b ? `<text class="fbd-a" x="${xr - 6}" y="${y + 10}" text-anchor="end">${esc(m.txt.b)}</text>` : ''}</g>`;
          return y;
        }
        const xb = xr - GW;
        m.kids.forEach((k) => {
          const xc = xb - m.gap;
          const raw = k.kind === 'leaf' ? (M) => leafRaw(k.x, M, ri) : k.kind === 'label' ? () => (k.x.t === 'true' ? 1 : 0) : (M) => rail(M) && value(k.x, M, ri);   // before the circle
          const yc = draw(k, xc, yt + k.off * ROW);
          svg += wire(`M${xc} ${yc}H${k.neg ? xb - 9 : xb}`, raw);
          if (k.neg) svg += `<circle class="fbd-neg" cx="${xb - 4.5}" cy="${yc}" r="4"/>`;
        });
        svg += `<rect class="fbd-box" x="${xb}" y="${yt + 4}" width="${GW}" height="${m.h * ROW - 8}" rx="4"/><text class="fbd-sym" x="${xb + GW / 2}" y="${yt + ROW / 2 + 5}" text-anchor="middle">${m.x.t === 'and' ? '&amp;' : '≥1'}</text>`;
        return y;
      };
      groups.forEach((g) => {
        const m = measure(g.expr, tags), top = H;
        const rootRaw = (M) => rail(M) && (m.kind === 'leaf' ? leafRaw(m.x, M, ri) : value(m.x, M, ri));   // the signal before any circle; none without rung power
        const x0 = m.w + 6;                                  // right edge of the logic tree
        const y0 = draw(m, x0, top);
        // output boxes, stacked; the first one is level with the tree output
        let oy = top, right = x0; const xo = x0 + 30;
        g.outs.forEach((c, k) => {
          const sym = OUT_SYM[c.type], lines = sym ? [] : outLines(c), bw = sym ? GW : Math.max(58, Math.max(c.type.length * 8, ...lines.map((s) => s.length * 5.8)) + 14), bh = sym ? ROW - 8 : 22 + lines.length * 12;
          const yp = oy + ROW / 2, circle = (c.type === 'NCOIL') !== m.neg, xe = circle ? xo - 9 : xo;
          if (k === 0) svg += wire(`M${x0} ${y0}H${xe}`, rootRaw);
          else svg += wire(`M${x0 + 14} ${y0}V${yp}H${xe}`, rootRaw) + `<circle class="fbd-dot" cx="${x0 + 14}" cy="${y0}" r="2.4"/>`;
          if (circle) svg += `<circle class="fbd-neg" cx="${xo - 4.5}" cy="${yp}" r="4"/>`;
          svg += `<rect class="fbd-box fbd-out" x="${xo}" y="${oy + 4}" width="${bw}" height="${bh}" rx="4"/>`;
          if (sym) svg += `<text class="fbd-sym" x="${xo + bw / 2}" y="${yp + 5}" text-anchor="middle">${sym}</text>`;
          else { svg += `<text class="fbd-ttl" x="${xo + bw / 2}" y="${oy + 19}" text-anchor="middle">${esc(c.type)}</text>`; lines.forEach((s, i) => (svg += `<text class="fbd-a" x="${xo + 7}" y="${oy + 32 + i * 12}">${esc(s)}</text>`)); }
          const addr = c.addr || c.dst || c.inst || '', nm = (tags && tags[addr]) || '';
          if (addr) {
            reg.push((M) => { try { return /^(MW|MD|MR|AQW|AIW|STR|DB|#)/.test(addr) ? 0 : M.bit(addr) ? 1 : 0; } catch (e) { return 0; } });
            svg += `<g class="fbd-leaf" data-l="${reg.length - 1}"><text class="fbd-n" x="${xo + bw + 7}" y="${nm ? yp - 1 : yp + 4}">${esc(nm || addr)}</text>${nm ? `<text class="fbd-a" x="${xo + bw + 7}" y="${yp + 10}">${esc(addr)}</text>` : ''}</g>`;
          }
          right = Math.max(right, xo + bw + 12 + Math.max((nm || addr).length * 6.9, nm ? addr.length * 5.6 : 0));
          oy += Math.max(ROW, bh + 8);
        });
        H = Math.max(top + m.h * ROW, oy) + 6; W = Math.max(W, right);
      });
      if (!groups.length) { svg += `<text class="fbd-n fbd-dim" x="8" y="22">empty rung</text>`; H = 34; W = 120; }
      W = Math.ceil(W + 8); H = Math.ceil(H + 2);
      html += `<div class="fbd-net" data-net="${ri}"><div class="fbd-h"><b>${String(ri + 1).padStart(2, '0')}</b>${rung.comment ? ' <i>' + esc(rung.comment) + '</i>' : ''}</div><div class="fbd-sc"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Network ${ri + 1} as function block diagram">${svg}</svg></div></div>`;
      return reg;
    });
    host.innerHTML = html || '<p class="muted">No rungs yet.</p>';
    [...host.querySelectorAll('.fbd-net')].forEach((el) => { const reg = nets[+el.dataset.net]; [...el.querySelectorAll('[data-l]')].forEach((e) => live.push({ el: e, fn: reg[+e.dataset.l] })); });
    return { update(M) { live.forEach((o) => { let v = 0; if (M) { try { v = o.fn(M) ? 1 : 0; } catch (e) { v = 0; } } if (o.v !== v) { o.v = v; o.el.classList.toggle('on', !!v); } }); } };
  }

  const CSS = `
.fbd-card{padding:12px;min-width:0;max-width:100%;overflow:hidden}.fbd-host,.fbd-net{min-width:0;max-width:100%}.fbd-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.fbd-note{font-size:var(--t-13);color:var(--muted);margin:0 0 8px}
.fbd-net{border-top:1px solid var(--line-2);padding:6px 0 2px}.fbd-h{font-size:var(--t-13);color:var(--muted)}.fbd-h b{font-family:var(--f-mono);color:var(--accent);margin-right:6px}
.fbd-sc{overflow-x:auto;padding-bottom:2px}.fbd-sc svg{display:block}
.fbd-w{fill:none;stroke:var(--wire);stroke-width:1.6}.fbd-w.on{stroke:var(--power-bright);stroke-width:2.2}
.fbd-box{fill:var(--surface);stroke:var(--ink);stroke-width:1.4}.fbd-out{fill:var(--surface-2)}
.fbd-sym{font:700 var(--t-13) var(--f-mono);fill:var(--ink)}.fbd-ttl{font:700 var(--t-11) var(--f-mono);fill:var(--ink)}
.fbd-n{font:600 var(--t-12) var(--f-body);fill:var(--ink)}.fbd-a{font:var(--t-11) var(--f-mono);fill:var(--muted)}.fbd-dim{fill:var(--muted);font-style:italic;font-weight:400}
.fbd-leaf.on .fbd-n{fill:var(--power)}.fbd-neg{fill:var(--surface);stroke:var(--ink);stroke-width:1.4}.fbd-dot{fill:var(--wire)}`;
  function css() { if (typeof document !== 'undefined' && !document.getElementById('fbd-css')) { const s = document.createElement('style'); s.id = 'fbd-css'; s.textContent = CSS; document.head.appendChild(s); } }

  // ───────────── the card in the Lab ─────────────
  function toggle(lab) {
    css();
    if (lab._fbd) { lab._fbd.box.remove(); lab._fbd = null; return false; }
    const box = document.createElement('div'); box.className = 'card fbd-card only-program ld-only';
    box.innerHTML = '<div class="fbd-top"><b>The same program as FBD (function block diagram)</b><button class="btn small ghost" data-x>Close</button></div><p class="fbd-note">Read it from left to right. <b>&amp;</b> = AND (contacts in series), <b>≥1</b> = OR (parallel branches), a small circle = NOT (an NC contact). Green = signal is 1. You edit in the ladder; this view follows.</p><div class="fbd-host"></div>';
    const after = lab.el.querySelector('.card.prog-card'); after.parentNode.insertBefore(box, after.nextSibling);
    box.querySelector('[data-x]').onclick = () => toggle(lab);
    lab._fbd = { box, dirty: true, view: null };
    tick(lab);
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return true;
  }
  function tick(lab) {
    const F = lab._fbd; if (!F) return;
    if (!document.body.contains(F.box)) { lab._fbd = null; return; }
    if (F.dirty) { F.dirty = false; F.view = render(F.box.querySelector('.fbd-host'), (lab.E && lab.E.rungs) || [], lab.tags()); }
    let M = lab.m;
    if (lab.blk) { M = lab.monInst ? lab.m.monitor(lab.monInst) : null; if (M && !M.trace) M = null; }
    F.view.update(M);
  }
  LL.FBD = { trees, value, render, toggle, tick, key };
})(typeof window !== 'undefined' ? window : globalThis);
