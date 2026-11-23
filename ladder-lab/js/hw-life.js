/* PLC Start: heartbeat with a life word, and the communication watchdog. Mounted through [[hw:lifeword]].
 * The PLC counts LifeWord 0..599 every 0.1 s; a remote device echoes it (LifeWordReply). The watchdog checks that the
 * echo keeps CHANGING: simple version with a TON, advanced version with a stopwatch TimeAcc and a ResponseTime.
 * The learner makes the remote freeze, answer slowly or cuts the cable, and watches the two rungs, the GRAFCET steps
 * and the CommError trend. The scan is in LL.LifeSim (pure, tested in node); the rest draws it. */
(function (G) {
  const LL = (G.LL = G.LL || {});
  const DELAY = 60;
  // ───────────── pure logic: one PLC scan of the two rungs plus the remote device ─────────────
  const LifeSim = {
    init: (adv) => ({ adv: !!adv, t: 0, pt: 0, life: 0, reply: 0, last: 0, et: 0, err: false, acc: 0, resp: 0, mode: 'ok', q: [], echo: 0, lastCopy: -1e9, r: {}, errs: 0, gap: 0, maxGap: 0, hist: [] }),
    scan(st, dt) {
      dt = dt || 10;
      st.t += dt;
      // rung 1: heartbeat
      st.pt += dt;
      const pulse = st.pt >= 100;
      if (pulse) st.pt = 0;
      if (pulse) st.life++;
      const wrap = st.life >= 600;
      if (wrap) st.life = 0;
      // the remote device
      if (st.mode === 'ok' || (st.mode === 'slow' && st.t - st.lastCopy >= 2000)) { if (st.mode === 'slow') st.lastCopy = st.t; st.q.push([st.t + DELAY, st.life]); }
      while (st.q.length && st.q[0][0] <= st.t) st.echo = st.q.shift()[1];
      st.reply = st.mode === 'cut' ? 0 : st.echo;
      // rung 2: watchdog
      const chg = st.reply !== st.last;
      if (chg) st.last = st.reply;
      const was = st.err;
      let tq = false, over = false;
      if (!st.adv) {
        st.et = chg ? 0 : Math.min(1000, st.et + dt);
        tq = st.et >= 1000;
        if (tq) st.err = true;
      } else {
        if (chg) { st.resp = st.acc; st.acc = 0.1; } else if (pulse && st.acc < 10) st.acc = Math.round((st.acc + 0.1) * 10) / 10;
        over = st.acc > 1.0;
        if (over) st.err = true;
      }
      if (chg) st.err = false;
      if (st.err && !was) st.errs++;
      st.gap = chg ? 0 : st.gap + dt; if (st.gap > st.maxGap) st.maxGap = st.gap;
      st.r = { pulse, wrap, chg, nchg: !chg, tq, over, set: tq || over, rst: chg };
      return st;
    },
  };
  LL.LifeSim = LifeSim;
  if (typeof document === 'undefined') return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CSS = `
.hw-life { display: grid; gap: 12px; }
.lf-top { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; }
.lf-seg { display: inline-flex; border: 1px solid var(--edge); border-radius: var(--r-ctl); overflow: hidden; }
.lf-seg button { appearance: none; border: 0; background: var(--surface); color: var(--ink); font: 500 var(--t-13) var(--f-body); padding: 8px 12px; min-height: 38px; cursor: pointer; }
.lf-seg button + button { border-left: 1px solid var(--edge); }
.lf-seg button.on { background: var(--ink); color: var(--surface); }
.lf-modes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.lf-modes button { appearance: none; font: 600 var(--t-13)/1.2 var(--f-body); color: var(--ink); cursor: pointer; min-height: 44px; padding: 6px 8px; border: 1px solid var(--line); border-radius: var(--r-ctl); background: var(--surface); display: flex; gap: 8px; align-items: center; justify-content: center; text-align: center; }
.lf-modes button i { width: 10px; height: 10px; border-radius: 50%; background: var(--line); flex: none; }
.lf-modes button.on { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.lf-modes button.on i { background: var(--tc, var(--power-bright)); box-shadow: 0 0 8px var(--tc, var(--power-bright)); }
.lf-svg svg { width: 100%; height: auto; display: block; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-panel); }
.lf-grid { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 12px; align-items: start; }
.lf-rungs { overflow-x: auto; }
.lf-rungs svg { min-width: 560px; }
.lf-graf svg { max-width: 260px; margin: 0 auto; }
.lf-say { font-size: var(--t-14); padding: 8px 12px; border-left: 4px solid var(--power); background: var(--surface-2); border-radius: 0 var(--r-ctl) var(--r-ctl) 0; }
.lf-say.bad { border-left-color: var(--danger); }
.lf-ctl { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: var(--t-13); color: var(--muted); }
@media (max-width: 900px) { .lf-grid { grid-template-columns: minmax(0, 1fr); } .lf-modes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;
  const T = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-size="${((o.z || 11) * FS).toFixed(1)}"${o.b ? ' font-weight="700"' : ''} fill="${o.f || 'currentColor'}" text-anchor="${o.a || 'start'}"${o.m ? ' font-family="IBM Plex Mono, monospace"' : ''}>${esc(s)}</text>`; };
  let FS = 1;
  const ON = 'var(--power-bright)', OFF = 'var(--wire)';
  // ladder parts on one line of a rung: x positions are fixed, power flows left to right while each part passes it
  function rungLine(y, parts, lastOn) {
    let g = '', x = 18, p = true;
    parts.forEach((pt) => {
      const w = pt.w || 70, out = pt.coil || pt.box;
      const live = p, pass = live && pt.on;
      g += `<path d="M${x} ${y} H${x + 10}" stroke="${live ? ON : OFF}" stroke-width="${live ? 3 : 2}"/>`;
      if (pt.box) {
        g += `<rect x="${x + 10}" y="${y - 14}" width="${w - 20}" height="28" rx="2" fill="${live ? 'color-mix(in srgb, var(--power-bright) 18%, var(--surface))' : 'var(--surface)'}" stroke="${live ? ON : 'currentColor'}" stroke-width="1.6"/>` + T(x + w / 2, y + 4, pt.t, { a: 'middle', z: 9.5, m: 1, b: live });
      } else if (pt.coil) {
        g += `<path d="M${x + 22} ${y - 12} a14 14 0 0 0 0 24 M${x + 48} ${y - 12} a14 14 0 0 1 0 24" fill="none" stroke="${live ? ON : 'currentColor'}" stroke-width="2.2"/>` + (live ? `<circle cx="${x + 35}" cy="${y}" r="6" fill="${ON}"/>` : '') + T(x + 35, y + 4, pt.k || '', { a: 'middle', z: 9, b: 1 }) + T(x + 35, y - 18, pt.t, { a: 'middle', z: 9, m: 1 });
      } else {
        g += `<path d="M${x + 22} ${y - 12} V${y + 12} M${x + 48} ${y - 12} V${y + 12}" stroke="${pass ? ON : 'currentColor'}" stroke-width="2.4"/>` + (pass ? `<rect x="${x + 25}" y="${y - 9}" width="20" height="18" fill="${ON}" opacity=".35"/>` : '') + (pt.nc ? `<path d="M${x + 18} ${y + 12} L${x + 52} ${y - 12}" stroke="${pass ? ON : 'currentColor'}" stroke-width="1.8"/>` : '') + (pt.p ? T(x + 35, y + 4, 'P', { a: 'middle', z: 9, b: 1 }) : '') + T(x + 35, y - 18, pt.t, { a: 'middle', z: 9, m: 1 });
        g += `<path d="M${x + 10} ${y} H${x + 22} M${x + 48} ${y} H${x + w}" stroke="${live ? ON : OFF}" stroke-width="2"/>`;
      }
      if (!out) p = pass;
      x += w;
    });
    return g + `<path d="M${x} ${y} H602" stroke="${OFF}" stroke-width="2"/>`;
  }

  LL.HW = LL.HW || {};
  LL.HW.lifeword = function (ph) {
    if (!document.getElementById('hw-life-css')) { const s = document.createElement('style'); s.id = 'hw-life-css'; s.textContent = CSS; document.head.appendChild(s); }
    let st = LifeSim.init(false), speed = 1, paused = false, seen = {};
    const MODES = [['ok', 'Remote OK', '#088339'], ['freeze', 'Remote freezes', '#c21f1f'], ['slow', 'Remote slow (every 2 s)', '#e9a100'], ['cut', 'Cable cut (reply = 0)', '#c21f1f']];
    const box = document.createElement('div'); box.className = 'hw-box hw-life';
    box.innerHTML = `<div class="lf-top"><div class="lf-seg" role="radiogroup" aria-label="Version"><button type="button" data-ver="0">Simple: TON</button><button type="button" data-ver="1">Advanced: stopwatch</button></div>
        <div class="lf-ctl"><div class="lf-seg"><button type="button" data-sp="1">1×</button><button type="button" data-sp="0.2">Slow motion</button><button type="button" data-sp="0">Pause</button></div></div></div>
      <div class="lf-modes" role="radiogroup" aria-label="Remote device">${MODES.map(([k, t, c]) => `<button type="button" role="radio" data-mode="${k}" style="--tc:${c}"><i></i>${esc(t)}</button>`).join('')}</div>
      <div class="lf-svg lf-net"></div>
      <div class="lf-grid"><div class="lf-svg lf-rungs"></div><div class="lf-svg lf-graf"></div></div>
      <div class="lf-say" aria-live="polite"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    box.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => { const m = st.mode; st = LifeSim.init(b.dataset.ver === '1'); st.mode = m; draw(true); }));
    box.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => { const v = +b.dataset.sp; paused = v === 0; if (v) speed = v; draw(true); }));
    box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; st.lastCopy = -1e9; st.maxGap = 0; draw(true); }));
    function draw() {
      const fit = (el, vb) => { const w = el.clientWidth || vb; FS = Math.min(1.7, Math.max(1, 0.62 * vb / w)); };
      fit($('.lf-net'), 640);
      const r = Object.assign({}, st.r, seen), cut = st.mode === 'cut', err = st.err;
      seen = {};
      box.querySelectorAll('[data-ver]').forEach((b) => b.classList.toggle('on', (b.dataset.ver === '1') === st.adv));
      box.querySelectorAll('[data-sp]').forEach((b) => b.classList.toggle('on', paused ? b.dataset.sp === '0' : +b.dataset.sp === speed));
      box.querySelectorAll('[data-mode]').forEach((b) => { const on = b.dataset.mode === st.mode; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      // ── the network: PLC, remote device, the two arrows, live values
      const k1 = (st.t % 700) / 700, k2 = ((st.t + 350) % 700) / 700;
      let g = `<rect x="10" y="10" width="200" height="170" rx="8" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.6"/>` + T(110, 32, 'PLC', { a: 'middle', z: 14, b: 1 });
      const row = (y, k, v, hi) => T(24, y, k, { z: 11, f: 'var(--muted)' }) + T(196, y, v, { z: 12, m: 1, b: 1, a: 'end', f: hi || 'currentColor' });
      g += row(58, 'LifeWord', st.life) + row(80, 'LifeWordReply', st.reply) + row(102, 'LastReply', st.last);
      g += st.adv ? row(124, 'TimeAcc', st.acc.toFixed(1) + ' s', st.acc > 1 ? 'var(--danger)' : '') + row(146, 'ResponseTime', st.resp.toFixed(1) + ' s') : row(124, 'WatchdogTimer.ET', (st.et / 1000).toFixed(2) + ' s', st.et >= 1000 ? 'var(--danger)' : '') + row(146, 'PT', '1.00 s');
      g += `<circle cx="38" cy="166" r="9" fill="${err ? 'var(--lamp-red)' : 'var(--lamp-green)'}" stroke="currentColor"/>` + T(54, 170, err ? 'CommError = 1' : 'CommError = 0 (OK)', { z: 11, b: 1, f: err ? 'var(--danger)' : 'var(--power)' });
      g += `<rect x="430" y="10" width="200" height="170" rx="8" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.6"/>` + T(530, 32, 'Remote device', { a: 'middle', z: 14, b: 1 }) + T(530, 52, st.mode === 'ok' ? 'copies the value back' : st.mode === 'freeze' ? 'FROZEN: the echo stops' : st.mode === 'slow' ? 'answers every 2 s' : 'unreachable', { a: 'middle', z: 11, f: st.mode === 'ok' ? 'var(--muted)' : 'var(--danger)' });
      g += T(530, 96, 'echo', { a: 'middle', z: 11, f: 'var(--muted)' }) + T(530, 124, cut ? '—' : String(st.echo), { a: 'middle', z: 24, m: 1, b: 1 });
      g += `<path d="M212 70 H428" stroke="var(--info)" stroke-width="3"/><path d="M428 70 l-10 -6 v12 z" fill="var(--info)"/>` + T(320, 60, 'LifeWord →', { a: 'middle', z: 11, m: 1 });
      if (!paused) g += `<g transform="translate(${(220 + k1 * 190).toFixed(1)} 70)"><rect x="-17" y="-9" width="34" height="18" rx="3" fill="var(--info)"/>${T(0, 4, st.life, { a: 'middle', z: 10, m: 1, b: 1, f: 'var(--on-info)' })}</g>`;
      g += `<path d="M428 130 H212" stroke="${cut ? 'var(--danger)' : 'var(--info)'}" stroke-width="3"${cut ? ' stroke-dasharray="7 6"' : ''}/><path d="M212 130 l10 -6 v12 z" fill="${cut ? 'var(--danger)' : 'var(--info)'}"/>` + T(320, 156, '← LifeWordReply', { a: 'middle', z: 11, m: 1 });
      if (cut) g += `<path d="M310 118 l20 24 M330 118 l-20 24" stroke="var(--danger)" stroke-width="3"/>`;
      else if (!paused && st.mode !== 'freeze') g += `<g transform="translate(${(420 - k2 * 190).toFixed(1)} 130)"><rect x="-17" y="-9" width="34" height="18" rx="3" fill="var(--info)"/>${T(0, 4, st.echo, { a: 'middle', z: 10, m: 1, b: 1, f: 'var(--on-info)' })}</g>`;
      // trend of CommError and of the changes, the last 10 s
      const H = st.hist, x0 = 10, w = 620, y0 = 200;
      g += `<rect x="${x0}" y="${y0}" width="${w}" height="44" fill="var(--surface-2)" stroke="var(--line)"/>` + T(x0 + 6, y0 + 14, 'CommError, last 10 s', { z: 10, f: 'var(--muted)' });
      if (H.length > 1) { let d = ''; H.forEach((h, i) => { const x = x0 + w - (H.length - 1 - i) * (w / 200); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (h ? y0 + 20 : y0 + 38); }); g += `<path d="${d}" fill="none" stroke="var(--danger)" stroke-width="2"/>`; }
      $('.lf-net').innerHTML = `<svg viewBox="0 0 640 252" role="img" aria-label="PLC and remote device exchanging the life word" style="color:var(--ink)">${g}</svg>`;
      // ── the two rungs with live power flow (they scroll sideways on a phone, like a real ladder)
      FS = 1;
      let R = `<path d="M18 10 V${st.adv ? 352 : 308} M602 10 V${st.adv ? 352 : 308}" stroke="currentColor" stroke-width="3"/>` + T(26, 22, 'Rung 1: heartbeat', { z: 11, b: 1 });
      R += rungLine(56, [{ t: 'Clock 0.1 s', on: r.pulse, p: 1 }, { box: 1, t: 'INC LifeWord', w: 150 }]);
      R += rungLine(100, [{ t: 'LifeWord>=600', on: r.wrap, w: 110 }, { box: 1, t: 'MOVE 0 → LifeWord', w: 170 }]);
      R += T(26, 136, 'Rung 2: watchdog' + (st.adv ? ' with a stopwatch' : ''), { z: 11, b: 1 });
      if (!st.adv) {
        R += rungLine(170, [{ t: 'Reply<>Last', on: r.chg }, { box: 1, t: 'MOVE Reply → Last', w: 170 }]);
        R += rungLine(212, [{ t: 'Changed', on: r.nchg, nc: 1 }, { box: 1, t: 'TON 1 s (ET ' + (st.et / 1000).toFixed(1) + ')', w: 190 }]);
        R += rungLine(252, [{ t: 'Timer.Q', on: r.tq }, { coil: 1, t: 'CommError', k: 'S' }]);
        R += rungLine(292, [{ t: 'Changed', on: r.chg }, { coil: 1, t: 'CommError', k: 'R' }]);
      } else {
        R += rungLine(170, [{ t: 'Reply<>Last', on: r.chg }, { box: 1, t: 'Resp := TimeAcc; Last := Reply', w: 240 }]);
        R += rungLine(212, [{ t: 'Changed', on: r.chg }, { box: 1, t: 'TimeAcc := 0.1', w: 150 }]);
        R += rungLine(254, [{ t: 'Changed', on: r.nchg, nc: 1 }, { t: 'Clock 0.1 s', on: r.pulse, p: 1 }, { box: 1, t: 'TimeAcc += 0.1', w: 150 }]);
        R += rungLine(296, [{ t: 'TimeAcc>1.0', on: r.over }, { coil: 1, t: 'CommError', k: 'S' }]);
        R += rungLine(336, [{ t: 'Changed', on: r.chg }, { coil: 1, t: 'CommError', k: 'R' }]);
      }
      $('.lf-rungs').innerHTML = `<svg viewBox="0 0 620 ${st.adv ? 360 : 316}" role="img" aria-label="The two rungs, with the power flow of this scan" style="color:var(--ink)">${R}</svg>`;
      // ── GRAFCET: two steps
      FS = 1;
      const sOK = !err, gx = 70;
      let Gf = T(10, 18, 'As a GRAFCET', { z: 11, b: 1 });
      const step = (y, name, on, col) => `<rect x="${gx - 50}" y="${y}" width="100" height="40" fill="${on ? col : 'var(--surface)'}" stroke="currentColor" stroke-width="${on ? 2.4 : 1.4}"/>` + T(gx, y + 25, name, { a: 'middle', z: 11, b: 1, f: on ? '#fff' : 'currentColor' });
      Gf += step(34, 'OK', sOK, 'var(--power)') + step(150, 'COMM ERROR', !sOK, 'var(--danger)');
      Gf += `<path d="M${gx} 74 V150" stroke="currentColor" stroke-width="1.6"/><path d="M${gx - 12} 112 H${gx + 12}" stroke="currentColor" stroke-width="2.4"/>` + T(gx + 18, 106, st.adv ? 'TimeAcc > 1.0 s' : 'reply frozen', { z: 10 }) + T(gx + 18, 120, st.adv ? '' : 'for > 1 s', { z: 10 });
      Gf += `<path d="M${gx - 50} 170 H${gx - 62} V54 H${gx - 50}" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M${gx - 70} 112 H${gx - 54}" stroke="currentColor" stroke-width="2.4"/>` + T(gx - 66, 218, 'back to OK when', { z: 10 }) + T(gx - 66, 232, 'the reply changes', { z: 10 });
      Gf += T(10, 258, 'errors so far: ' + st.errs, { z: 10, m: 1, f: 'var(--muted)' }) + T(10, 274, 'longest silence: ' + (st.maxGap / 1000).toFixed(1) + ' s', { z: 10, m: 1, f: 'var(--muted)' });
      $('.lf-graf').innerHTML = `<svg viewBox="0 0 220 284" role="img" aria-label="GRAFCET: step OK and step COMM ERROR" style="color:var(--ink)">${Gf}</svg>`;
      const say = $('.lf-say');
      say.classList.toggle('bad', err);
      say.textContent = st.mode === 'ok' ? 'The echo changes about every 0.1 s, a little after LifeWord (transport delay). The watchdog restarts at every change: no error.'
        : st.mode === 'freeze' ? (err ? 'The echo stopped changing for more than 1 s: CommError. Click "Remote OK" and watch it reset at the first change.' : 'The echo is frozen. The ' + (st.adv ? 'stopwatch' : 'timer') + ' runs…')
        : st.mode === 'slow' ? 'The remote answers every 2 s: after 1 s silence CommError comes on, at the next answer it goes off. It blinks.' + (st.adv ? ' ResponseTime shows how slow: about 2 s.' : '')
        : 'Cable cut: the reply reads 0. It changes once (to 0), then never again: CommError after 1 s.';
    }
    let last = 0, raf = 0, acc = 0, lastDraw = 0;
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (!box.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min(100, t - (last || t)); last = t;
      if (!paused) { acc += dt * speed; while (acc >= 10) { LifeSim.scan(st, 10); acc -= 10; ['pulse', 'wrap', 'chg', 'tq', 'over'].forEach((k) => { if (st.r[k]) seen[k] = true; }); if (st.t % 50 === 0) { st.hist.push(st.err ? 1 : 0); if (st.hist.length > 200) st.hist.shift(); } } }
      if (t - lastDraw > 60) { lastDraw = t; draw(); }
    }
    draw(); raf = requestAnimationFrame(tick);
  };
})(typeof window !== 'undefined' ? window : globalThis);
