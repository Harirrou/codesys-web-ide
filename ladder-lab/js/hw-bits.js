/* PLC Start — "A word is 16 bits": a word calculator. Mounted in lessons through [[hw:bits]].
 * Two 16-bit words A and B with clickable bits, shown as decimal, hex, binary and BCD, and the result of
 * WAND / WOR / WXOR / WNOT with a one-line reason for each. A small mission list drills masks, hex and BCD. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-bits';
  const hex = (v) => '16#' + (v & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const bin = (v) => '2#' + (v & 0xffff).toString(2).padStart(16, '0').replace(/(.{4})(?=.)/g, '$1_');
  const signed = (v) => ((v & 0xffff) << 16) >> 16;
  const bcd = (v) => { const d = [12, 8, 4, 0].map((s) => (v >> s) & 15); return d.every((x) => x < 10) ? d.join('') : null; };
  const OPS = {
    and: { n: 'AND', ins: 'WAND(A,B,R)', f: (a, b) => a & b, why: 'AND: a result bit is 1 only where A and B are both 1. B works as a mask: where B has a 0, the bit is removed. Use it to keep only the bits you want.' },
    or: { n: 'OR', ins: 'WOR(A,B,R)', f: (a, b) => a | b, why: 'OR: a result bit is 1 where A or B (or both) is 1. Use it to switch bits on without touching the others.' },
    xor: { n: 'XOR', ins: 'WXOR(A,B,R)', f: (a, b) => a ^ b, why: 'XOR: a result bit is 1 where A and B are different. Use it to flip bits, or to see which bits have changed between an old and a new word.' },
    not: { n: 'NOT A', ins: 'WNOT(A,R)', f: (a) => ~a & 0xffff, why: 'NOT: every bit is flipped. A mask turned around: "all bits except these".' },
  };
  const TASKS = [
    ['run', 'Make the drive "run" word: A = 16#047F', (s) => s.a === 0x047f],
    ['mask', 'Keep only the low byte: A = 16#12AB, AND with the right mask so the result is 16#00AB', (s) => s.op === 'and' && s.a === 0x12ab && s.r === 0x00ab],
    ['set', 'Switch bit 7 on without changing the rest: A = 16#047E, OR, result 16#04FE', (s) => s.op === 'or' && s.a === 0x047e && s.r === 0x04fe],
    ['chg', 'What changed? A = 16#0231 (old), B = 16#0237 (new), XOR: only the changed bits remain', (s) => s.op === 'xor' && s.a === 0x0231 && s.b === 0x0237],
    ['bcd', 'Write the number 1234 in BCD in A (one digit in every 4 bits)', (s) => s.a === 0x1234],
    ['neg', 'Make A = −1 as a signed number. Look at the bits', (s) => s.a === 0xffff],
  ];
  const CSS = `
.hw-bits{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:14px;margin:16px 0}
.hwb-h{font-size:var(--t-16);font-weight:700;margin-bottom:8px}
.hwb-row{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px;align-items:center;margin:10px 0}
.hwb-row>b{font-family:var(--f-mono);font-size:var(--t-16)}.hwb-w{min-width:0}
.hwb-bits{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:3px;max-width:520px}
.hwb-bits button,.hwb-bits span{border:1.5px solid var(--line);background:var(--surface-2);color:var(--muted);border-radius:var(--r-tag);font-family:var(--f-mono);font-size:var(--t-13);font-weight:700;padding:0;height:38px;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15}
.hwb-bits i{font-style:normal;font-size:var(--t-11);font-weight:500;color:var(--muted)}
.hwb-bits button{cursor:pointer}.hwb-bits .on{background:var(--power-soft);border-color:var(--power-bright);color:var(--ink)}
.hwb-bits .gap{margin-left:4px}.hwb-bits .dim{opacity:.38}
.hwb-nums{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));gap:3px;max-width:520px;font-family:var(--f-mono);font-size:var(--t-11);color:var(--muted);text-align:center;margin-top:2px}.hwb-nums .gap{margin-left:4px}
.hwb-val{display:flex;gap:6px 14px;flex-wrap:wrap;font-family:var(--f-mono);font-size:var(--t-13);margin-top:5px;align-items:center}.hwb-val b{font-size:var(--t-16)}
.hwb-val input{width:104px;font:inherit;border:1px solid var(--line);border-radius:var(--r-ctl);padding:3px 6px;background:var(--surface);color:var(--ink)}
.hwb-ops{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 2px 62px}@media(max-width:560px){.hwb-ops{margin-left:0}.hwb-row{grid-template-columns:26px minmax(0,1fr)}.hwb-bits{grid-template-columns:repeat(8,minmax(0,1fr));gap:4px}.hwb-bits :nth-child(9){margin-left:0}.hwb-bits button,.hwb-bits span{height:42px;font-size:var(--t-14)}}
.hwb-ops button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-ctl);padding:5px 14px;font:inherit;font-weight:700;font-size:var(--t-14);cursor:pointer;min-height:34px}.hwb-ops button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.hwb-ops code{align-self:center;font-size:var(--t-13);color:var(--muted)}
.hwb-cap{border-left:4px solid var(--info);background:var(--surface-2);border-radius:var(--r-ctl);padding:8px 12px;margin:10px 0;font-size:var(--t-16);line-height:1.45}
.hwb-pre{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.hwb-sec{font-family:var(--f-body);letter-spacing:.04em;text-transform:uppercase;font-size:var(--t-13);color:var(--muted);margin:14px 0 6px;display:flex;justify-content:space-between}
.hwb-chk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}@media(max-width:760px){.hwb-chk{grid-template-columns:1fr}}
.hwb-chk div{background:var(--surface-2);border-radius:var(--r-ctl);padding:6px 10px;font-size:var(--t-14)}.hwb-chk div.ok{background:var(--power-soft)}.hwb-chk div::before{content:"○ ";color:var(--muted)}.hwb-chk div.ok::before{content:"✓ ";color:var(--power)}`;

  LL.HW.bits = function (ph) {
    if (!document.getElementById('hw-bits-css')) { const st = document.createElement('style'); st.id = 'hw-bits-css'; st.textContent = CSS; document.head.appendChild(st); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    const S = { a: 0x047e, b: 0x0001, op: 'or', r: 0 };
    const box = document.createElement('div'); box.className = 'hw-box hw-bits';
    const row = (k, name) => `<div class="hwb-row"><b>${name}</b><div class="hwb-w"><div class="hwb-bits" data-w="${k}"></div><div class="hwb-val" data-v="${k}"></div></div></div>`;
    box.innerHTML = `<div class="hwb-h">A word is 16 bits: click them</div>
      <div class="hwb-pre"><button class="btn small" data-pre="047E,0001,or">Drive: ready → run</button><button class="btn small" data-pre="12AB,00FF,and">Mask the low byte</button><button class="btn small" data-pre="0231,0237,xor">What changed?</button><button class="btn small" data-pre="1234,0000,or">BCD 1234</button><button class="btn small" data-pre="0000,0000,and">Clear</button></div>
      ${row('a', 'A')}<div class="hwb-ops">${Object.keys(OPS).map((k) => `<button data-op="${k}">${OPS[k].n}</button>`).join('')}<code></code></div>${row('b', 'B')}${row('r', '= R')}
      <div class="hwb-cap"></div><div class="hwb-sec"><span>Try these</span><span class="hwb-prog"></span></div><div class="hwb-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    function render() {
      S.r = OPS[S.op].f(S.a, S.b) & 0xffff;
      ['a', 'b', 'r'].forEach((k) => {
        const v = S[k], el = $(`[data-w="${k}"]`), dim = k === 'b' && S.op === 'not';
        el.innerHTML = Array.from({ length: 16 }, (_, i) => { const b = 15 - i, on = (v >> b) & 1, cls = (on ? 'on' : '') + (i && i % 4 === 0 ? ' gap' : '') + (dim ? ' dim' : ''); return k === 'r' ? `<span class="${cls}"><i>${b}</i>${on}</span>` : `<button type="button" class="${cls}" data-b="${b}" aria-label="${k.toUpperCase()} bit ${b}" aria-pressed="${!!on}"><i>${b}</i>${on}</button>`; }).join('');
        const d = bcd(v);
        $(`[data-v="${k}"]`).innerHTML = (k === 'r' ? `<b>${hex(v)}</b>` : `<input data-in="${k}" value="${hex(v)}" aria-label="Value of ${k.toUpperCase()}: type hex like 16#00FF or a decimal number" spellcheck="false">`)
          + `<span>decimal <b>${signed(v)}</b>${v > 32767 ? ' (unsigned ' + v + ')' : ''}</span><span>BCD <b>${d == null ? 'not valid' : +d}</b></span>` + (k === 'r' ? `<span style="color:var(--muted)">${bin(v)}</span>` : '');
      });
      box.querySelectorAll('[data-op]').forEach((b) => b.classList.toggle('on', b.dataset.op === S.op));
      $('.hwb-ops code').textContent = OPS[S.op].ins;
      $('.hwb-cap').textContent = OPS[S.op].why;
      let ch = false; TASKS.forEach(([id, , ok]) => { if (!done[id] && ok(S)) { done[id] = 1; ch = true; } });
      if (ch) { try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } }
      $('.hwb-chk').innerHTML = TASKS.map(([id, t]) => `<div class="${done[id] ? 'ok' : ''}">${t}</div>`).join('');
      const n = TASKS.filter(([id]) => done[id]).length; $('.hwb-prog').textContent = n + ' / ' + TASKS.length;
    }
    box.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.b != null) { const k = t.parentNode.dataset.w; S[k] ^= 1 << +t.dataset.b; S[k] &= 0xffff; render(); const again = box.querySelector(`[data-w="${k}"] [data-b="${t.dataset.b}"]`); if (again) again.focus(); }
      else if (t.dataset.op) { S.op = t.dataset.op; render(); }
      else if (t.dataset.pre) { const p = t.dataset.pre.split(','); S.a = parseInt(p[0], 16); S.b = parseInt(p[1], 16); S.op = p[2]; render(); }
    });
    box.addEventListener('change', (e) => {
      const k = e.target.dataset.in; if (!k) return;
      const s = e.target.value.trim().toUpperCase().replace(/_/g, '');
      const v = /^16#[0-9A-F]+$/.test(s) ? parseInt(s.slice(3), 16) : /^2#[01]+$/.test(s) ? parseInt(s.slice(2), 2) : /^-?\d+$/.test(s) ? parseInt(s, 10) : NaN;
      if (!isNaN(v)) S[k] = v & 0xffff;
      render();
    });
    render();
  };
})();
