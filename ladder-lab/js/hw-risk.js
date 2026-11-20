/* PLC Start — "How safe must it be?": the risk graph of ISO 13849-1. Mounted in lessons through [[hw:risk]].
 * Pick a hazard, answer three questions (how bad, how often, can you avoid it) and follow the path through the
 * graph to the required performance level PLr a … e. Then see what that level usually means for the hardware:
 * one or two channels, monitoring, typical category. A simplification for learning, not a design tool. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-risk';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PL = { '111': 'a', '112': 'b', '121': 'b', '122': 'c', '211': 'c', '212': 'd', '221': 'd', '222': 'e' };
  const Q = [
    ['S', 'How bad is the injury?', ['S1 · slight: a bruise, a small cut, it heals', 'S2 · serious: lost finger, broken bones, death']],
    ['F', 'How often is a person in the danger zone?', ['F1 · seldom, and only for a short time', 'F2 · often, or for a long time']],
    ['P', 'Can the person avoid the danger?', ['P1 · yes, it is slow or easy to see', 'P2 · hardly: fast, hidden, no room to escape']],
  ];
  const HW = {
    a: { cat: 'Category B', ch: 1, mon: 0, t: 'One channel with normal industrial parts, built to the usual rules. A single fault can stop the safety function.', sil: 'no SIL needed' },
    b: { cat: 'Category B or 1', ch: 1, mon: 0, t: 'One channel, but with well-tried parts and principles (for example a switch with forced-opening contacts).', sil: 'about SIL 1' },
    c: { cat: 'Category 1 or 2', ch: 1, mon: 1, t: 'One channel with well-tried parts, or one channel that is tested automatically at regular times.', sil: 'about SIL 1' },
    d: { cat: 'Category 3', ch: 2, mon: 1, t: 'Two channels: one fault alone must not stop the safety function. Most faults are found, for example by contactor feedback.', sil: 'about SIL 2' },
    e: { cat: 'Category 4', ch: 2, mon: 2, t: 'Two channels with full monitoring: every fault is found before or at the next demand, and faults must not add up.', sil: 'about SIL 3' },
  };
  const EX = [
    { id: 'conv', n: 'Slow belt conveyor', d: 'The edge of a slow, light belt can pinch a hand. People pass by now and then, and it is easy to pull the hand back.', a: '111', why: 'A bruise (S1), seldom there (F1), easy to avoid (P1).' },
    { id: 'label', n: 'Labelling machine rollers', d: 'Two small rollers with low force can squeeze fingers. The operator adjusts the label many times per shift. The rollers are slow and in full view.', a: '121', why: 'It heals (S1), but the operator is there often (F2). Slow and visible (P1).' },
    { id: 'seal', n: 'Hot sealing bar', d: 'A sealing bar at 180 °C in a packaging machine. The operator clears jams many times per shift. The bar looks the same hot or cold.', a: '122', why: 'A burn heals (S1), often there (F2), and you cannot see that it is hot (P2).' },
    { id: 'robot', n: 'Robot cell door', d: 'A fast robot that can crush a person. An operator goes in about once a week to clear a jam, for a minute.', a: '212', why: 'Crushing is serious (S2). Seldom and short (F1). A fast robot cannot be avoided (P2).' },
    { id: 'press', n: 'Hand-fed press', d: 'A hydraulic press. The operator puts every part in by hand, every few seconds, with the hands between the tools.', a: '222', why: 'Lost hands (S2), every cycle (F2), no chance to react (P2). The highest level.' },
  ];
  const CSS = `
.hw-risk{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:14px;margin:16px 0}
.hwr-h{font-size:var(--t-16);font-weight:700;margin-bottom:8px}
.hwr-ex{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.hwr-ex button,.hwr-q button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:var(--r-ctl);padding:7px 12px;font:inherit;font-size:var(--t-14);font-weight:600;cursor:pointer;min-height:38px;text-align:left}
.hwr-ex button.on,.hwr-q button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.hwr-ex button.done::after{content:" ✓";color:var(--power-bright)}
.hwr-d{background:var(--surface-2);border-radius:var(--r-ctl);padding:9px 12px;font-size:var(--t-16);line-height:1.45;margin-bottom:10px}
.hwr-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}@media(max-width:780px){.hwr-grid{grid-template-columns:1fr}}
.hwr-q{display:grid;gap:10px}.hwr-q b{display:block;font-size:var(--t-14);margin-bottom:5px}.hwr-q .o{display:grid;gap:5px}
.hwr-g{background:var(--surface-2);border-radius:var(--r-ctl);padding:6px}.hwr-g svg{display:block;width:100%;height:auto}
.hwr-res{border-left:4px solid var(--info);background:var(--surface-2);border-radius:var(--r-ctl);padding:9px 12px;margin:10px 0;font-size:var(--t-16);line-height:1.45}.hwr-res.ok{border-color:var(--power-bright);background:var(--power-soft)}.hwr-res.bad{border-color:var(--danger);background:var(--danger-soft)}
.hwr-hw{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:12px;align-items:center;background:var(--surface-2);border-radius:var(--r-ctl);padding:10px}@media(max-width:560px){.hwr-hw{grid-template-columns:1fr}}
.hwr-hw svg{display:block;width:100%;height:auto}.hwr-hw p{margin:0;font-size:var(--t-14);line-height:1.45}.hwr-hw b{font-size:var(--t-16)}
.hwr-note{font-size:var(--t-13);color:var(--muted);margin-top:8px}`;

  LL.HW.risk = function (ph) {
    if (!document.getElementById('hw-risk-css')) { const st = document.createElement('style'); st.id = 'hw-risk-css'; st.textContent = CSS; document.head.appendChild(st); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    let ex = EX[0], ans = ['', '', ''];
    const box = document.createElement('div'); box.className = 'hw-box hw-risk';
    box.innerHTML = `<div class="hwr-h">How safe must it be? Three questions, one letter</div><div class="hwr-ex"></div><div class="hwr-d"></div>
      <div class="hwr-grid"><div class="hwr-q"></div><div class="hwr-g"></div></div><div class="hwr-res"></div><div class="hwr-hw" hidden></div>
      <div class="hwr-note">A learning picture of the ISO 13849-1 risk graph. A real machine needs a full risk assessment, and the level reached also depends on part quality (MTTFd), diagnostics (DC) and common-cause faults.</div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    function graph() {
      const key = ans.join(''), X = [22, 96, 176, 256], on = (lvl, path) => ans.slice(0, lvl).every(Boolean) && ans.slice(0, lvl).join('') === path;
      const ln = (x1, y1, x2, y2, hot) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${hot ? 'var(--power-bright)' : 'var(--line)'}" stroke-width="${hot ? 2.4 : 1.2}"/>`;
      const tx = (x, y, s, hot, o) => `<text x="${x}" y="${y}" font-size="${(o && o.z) || 10}" font-weight="${hot ? 700 : 500}" fill="${hot ? 'var(--power)' : 'currentColor'}" stroke="none" text-anchor="${(o && o.a) || 'middle'}">${s}</text>`;
      let g = `<circle cx="${X[0]}" cy="110" r="5" fill="currentColor" stroke="none"/>`;
      const yS = { 1: 62, 2: 158 };
      [1, 2].forEach((s) => {
        const hs = on(1, '' + s); g += ln(X[0], 110, X[1], yS[s], hs) + tx(X[1] - 30, yS[s] + (s === 1 ? -8 : 16), 'S' + s, hs);
        [1, 2].forEach((f) => {
          const yF = yS[s] + (f === 1 ? -24 : 24), hf = on(2, '' + s + f); g += ln(X[1], yS[s], X[2], yF, hf) + tx(X[2] - 34, yF + (f === 1 ? -4 : 12), 'F' + f, hf);
          [1, 2].forEach((p) => {
            const yP = yF + (p === 1 ? -12 : 12), hp = on(3, '' + s + f + p), pl = PL['' + s + f + p];
            g += ln(X[2], yF, X[3], yP, hp) + tx(X[3] - 30, yP + (p === 1 ? -3 : 10), 'P' + p, hp, { z: 8.5 })
              + `<rect x="${X[3] + 4}" y="${yP - 9}" width="30" height="18" rx="5" fill="${hp ? 'var(--power-bright)' : 'var(--surface)'}" stroke="${hp ? 'var(--power-bright)' : 'var(--line)'}" stroke-width="1.2"/>` + `<text x="${X[3] + 19}" y="${yP + 4}" font-size="11" font-weight="700" fill="${hp ? '#fff' : 'currentColor'}" stroke="none" text-anchor="middle">${pl}</text>`;
          });
        });
      });
      g += tx(X[0], 132, 'start', false, { z: 9 }) + tx(X[3] + 19, 14, 'PLr', false, { z: 10 });
      $('.hwr-g').innerHTML = `<svg viewBox="0 0 300 220" fill="none" stroke="currentColor" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="Risk graph">${g}</svg>`;
    }
    function hardware(pl) {
      const h = HW[pl], row = (y) => `<rect x="10" y="${y}" width="52" height="26" rx="5" fill="var(--surface)" stroke="currentColor" stroke-width="1.2"/><text x="36" y="${y + 17}" font-size="10" text-anchor="middle" fill="currentColor" stroke="none">sensor</text><path d="M62 ${y + 13} H84" stroke="currentColor" stroke-width="1.2"/><rect x="84" y="${y}" width="52" height="26" rx="5" fill="var(--surface)" stroke="currentColor" stroke-width="1.2"/><text x="110" y="${y + 17}" font-size="10" text-anchor="middle" fill="currentColor" stroke="none">logic</text><path d="M136 ${y + 13} H158" stroke="currentColor" stroke-width="1.2"/><rect x="158" y="${y}" width="52" height="26" rx="5" fill="var(--surface)" stroke="currentColor" stroke-width="1.2"/><text x="184" y="${y + 17}" font-size="9.5" text-anchor="middle" fill="currentColor" stroke="none">contactor</text>`;
      let g = h.ch === 2 ? row(8) + row(56) + `<path d="M110 34 V56" stroke="var(--info)" stroke-width="1.2" stroke-dasharray="3 2"/><text x="118" y="49" font-size="8" fill="var(--info)" stroke="none">compare</text>` : row(30);
      if (h.mon) g += `<path d="M184 ${h.ch === 2 ? 82 : 56} v12 H110 v-12" stroke="var(--info)" stroke-width="1.2" stroke-dasharray="3 2"/><text x="147" y="${h.ch === 2 ? 104 : 78}" font-size="8" text-anchor="middle" fill="var(--info)" stroke="none">${h.mon === 2 ? 'full monitoring' : 'feedback / test'}</text>`;
      const w = $('.hwr-hw'); w.hidden = false;
      w.innerHTML = `<svg viewBox="0 0 220 112" fill="none" role="img" aria-label="Typical structure for PL ${pl}">${g}</svg><p><b>PL ${pl} · ${h.cat} · ${h.ch === 2 ? 'two channels' : 'one channel'}</b><br>${esc(h.t)}<br><span style="color:var(--muted)">${h.sil} in the other standard (IEC 62061).</span></p>`;
    }
    function render() {
      $('.hwr-ex').innerHTML = EX.map((e) => `<button data-e="${e.id}" class="${e === ex ? 'on' : ''} ${done[e.id] ? 'done' : ''}">${esc(e.n)}</button>`).join('');
      $('.hwr-d').textContent = ex.d;
      $('.hwr-q').innerHTML = Q.map(([k, q, o], i) => `<div><b>${i + 1}. ${esc(q)}</b><div class="o">${o.map((t, j) => `<button data-q="${i}" data-v="${j + 1}" class="${ans[i] === String(j + 1) ? 'on' : ''}">${esc(t)}</button>`).join('')}</div></div>`).join('');
      graph();
      const key = ans.join(''), r = $('.hwr-res');
      if (!ans.every(Boolean)) { r.className = 'hwr-res'; r.textContent = 'Answer the three questions. The green path in the graph shows where you are.'; $('.hwr-hw').hidden = true; return; }
      const pl = PL[key], right = key === ex.a;
      r.className = 'hwr-res ' + (right ? 'ok' : 'bad');
      r.innerHTML = right ? `<b>Required performance level: PL ${pl}.</b> That matches the usual rating for this hazard. ${esc(ex.why)}` : `<b>Your rating gives PL ${pl}.</b> Most assessors rate this hazard differently: ${esc(ex.why)} That gives PL ${PL[ex.a]}. Change your answers and watch the path.`;
      hardware(pl);
      if (right && !done[ex.id]) { done[ex.id] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } $('.hwr-ex').querySelector('.on').classList.add('done'); }
    }
    box.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.e) { ex = EX.find((x) => x.id === t.dataset.e); ans = ['', '', '']; }
      else if (t.dataset.q) ans[+t.dataset.q] = t.dataset.v;
      render();
    });
    render();
  };
})();
