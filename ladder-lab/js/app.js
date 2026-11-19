/* Ladder Lab — application shell: routing, pages, mini simulators, the Lab
 * (editor + machine + tests), quizzes and glossary. No dependencies. */
(function () {
  'use strict';
  const LL = window.LL;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  // own key only: a typed URL like #ch-constructor or #path-toString must not find Object's inherited members
  const own = (o, k) => !!o && k != null && Object.prototype.hasOwnProperty.call(o, k);

  // ───────────────────────── storage ─────────────────────────
  const KEY = 'ladderlab.v1';
  let S = { lessons: {}, ch: {}, chTried: {}, programs: {}, st: {}, lang: {}, plant: {}, quiz: { best: 0, predict: 0, predictBest: 0 }, theme: '', brand: 'll' };
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
  LL.brand = S.brand || 'll';
  S.st = S.st || {}; S.lang = S.lang || {};
  let saveT = 0;
  function saveNow() { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
  function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 250); }
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  // ───────────────────────── icons ─────────────────────────
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M9 7h6M9 11h6"/></svg>',
    lab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4v16M21 4v16M3 9h5M16 9h5M8 6v6M11 6v6M3 16h12M18 16h3"/><circle cx="16.5" cy="16" r="2.2"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    step: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 5l9 7-9 7z"/><rect x="16" y="5" width="3" height="14" rx="1"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    redo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/></svg>',
  };
  const BRAND_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="7" fill="var(--ink)"/><path d="M8 7v18M24 7v18" stroke="var(--surface)" stroke-width="2.4" stroke-linecap="round"/><path d="M8 12h4M15 12h3M20.5 12H24" stroke="var(--power-bright)" stroke-width="2.4" stroke-linecap="round"/><path d="M12 9v6M15 9v6" stroke="var(--power-bright)" stroke-width="2.2"/><circle cx="19.3" cy="12" r="1.9" fill="none" stroke="var(--power-bright)" stroke-width="1.8"/><path d="M8 20h16" stroke="var(--surface)" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/></svg>';

  // ───────────────────────── theme ─────────────────────────
  function applyTheme() {
    if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
    else document.documentElement.removeAttribute('data-theme');
    PT = null;
  }
  function isDark() {
    if (S.theme) return S.theme === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  let PT = null;
  function plantTheme() {
    if (PT) return PT;
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    PT = {
      panel: v('--p-panel'), panel2: v('--p-panel2'), bezel: v('--p-bezel'), lampOff: v('--p-lampoff'), metal: v('--p-metal'), metalDark: v('--p-metal-dark'),
      pipe: v('--p-pipe'), water: v('--p-water'), road: v('--p-road'), roadLine: v('--p-road-line'), zebra: v('--p-zebra'), carBody: v('--p-car'), carGlass: v('--p-glass'),
      box: v('--p-box'), boxEdge: v('--p-box-edge'), wall: v('--p-wall'), inside: v('--p-inside'), door: v('--p-door'), door2: v('--p-door2'), ground: v('--p-ground'),
      knob: v('--p-knob'), chip: v('--p-chip'), glass: v('--p-glass2'), ink: v('--ink'), muted: v('--muted'), line: v('--line'), on: v('--power-bright'), onInk: '#04210f',
      red: '#e23b3b', green: '#22c55e', amber: '#f5a524', blue: '#3b82f6', white: '#f1f5f9',
    };
    return PT;
  }
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { PT = null; });

  // ───────────────────────── toast / modal ─────────────────────────
  let toastT = 0;
  // o.ms: how long it stays (long texts need more time); o.top: on phones show it under the header, not over the machine
  function toast(msg, o) {
    o = o || {};
    let t = $('.toast');
    if (!t) { t = h('<div class="toast" role="status"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.toggle('top', !!o.top); t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), o.ms || 2600);
  }
  function modal(title, bodyHtml, actions) {
    const m = h(`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="card"><div class="mh"><h2>${esc(title)}</h2><button class="iconbtn" data-x aria-label="Close">✕</button></div><div class="mb">${bodyHtml}</div><div class="row ma"></div></div></div>`);
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape' && $$('.modal').pop() === m) close(); }; // only the top window
    document.addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-x]')) close(); });
    (actions || []).forEach((a) => {
      const b = h(`<button class="btn ${a.cls || ''}">${esc(a.label)}</button>`);
      b.onclick = () => { if (!a.run || a.run(m) !== false) close(); }; // Close / Cancel buttons have no run
      $('.ma', m).appendChild(b);
    });
    document.body.appendChild(m);
    return m;
  }

  // ───────────────────────── frame loop ─────────────────────────
  const tickers = new Set();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last); last = now;
    tickers.forEach((t) => { try { t.tick(dt); } catch (e) { console.error(e); tickers.delete(t); } });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ───────────────────────── device controls ─────────────────────────
  // Renders operator devices for a list [{addr,name,kind,color}] bound to ctrl
  function deviceEl(d, ctrl, onChange) {
    const kind = d.kind;
    if (kind === 'sel3') {
      const labels = d.labels || ['OFF', 'MAN', 'AUTO'];
      const cur = () => (ctrl[d.addr] === undefined ? d.def || 0 : +ctrl[d.addr]);
      const el = h(`<span class="dev sel3" role="radiogroup" aria-label="${esc(d.name)}"><span class="lbl">${esc(d.name)}<span class="sub">${esc(d.addr)} MAN · ${esc(d.addr2)} AUTO</span></span><span class="segs">${labels.map((l, k) => `<button type="button" role="radio" data-k="${k}">${esc(l)}</button>`).join('')}</span></span>`);
      const sync = () => $$('button', el).forEach((b) => { const on = +b.dataset.k === cur(); b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      $$('button', el).forEach((b) => (b.onclick = () => { ctrl[d.addr] = +b.dataset.k; sync(); onChange && onChange(); }));
      sync(); el._sync = sync;
      return el;
    }
    if (kind === 'ana') {
      const mn = d.min == null ? 6400 : d.min, mx = d.max == null ? 32000 : d.max;
      if (ctrl[d.addr] == null) ctrl[d.addr] = d.value == null ? mn : d.value;
      const el = h(`<label class="dev ana"><span class="lbl">${esc(d.name)}<span class="sub">${esc(d.addr)} = <b data-v>0</b> · <i data-ma></i></span></span><input type="range" min="${mn}" max="${mx}" step="64" value="${ctrl[d.addr]}" aria-label="${esc(d.name)}"></label>`);
      const inp = el.querySelector('input');
      const show = () => { el.querySelector('[data-v]').textContent = ctrl[d.addr]; el.querySelector('[data-ma]').textContent = d.unit === 'V' ? (ctrl[d.addr] / 2764.8).toFixed(1) + ' V' : (ctrl[d.addr] / 1600).toFixed(1) + ' mA'; };
      inp.addEventListener('input', () => { ctrl[d.addr] = +inp.value; show(); onChange && onChange(); });
      show();
      el._sync = show;
      return el;
    }
    const cls = kind === 'sw' ? 'sw' : d.color === 'red' || kind === 'pbnc' ? 'red' : d.color === 'black' ? 'black' : d.color === 'blue' ? 'blue' : '';
    const b = h(`<button class="dev ${cls}" type="button" aria-pressed="false"><span class="cap"><i></i></span><span class="lbl">${esc(d.name)}<span class="sub">${esc(d.addr)}${kind === 'pbnc' ? ' · NC' : ''}</span></span></button>`);
    const set = (v) => { ctrl[d.addr] = v; b.classList.toggle('down', !!v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); onChange && onChange(); };
    if (kind === 'sw') b.addEventListener('click', () => set(!ctrl[d.addr]));
    else {
      // A real finger press lasts ~150 ms; keep very quick taps "pressed" long enough
      // for the PLC to see them in at least one scan.
      let downAt = 0, relT = 0;
      const down = (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ } clearTimeout(relT); downAt = performance.now(); set(true); };
      const up = () => { if (!ctrl[d.addr]) return; const held = performance.now() - downAt; clearTimeout(relT); if (held >= 150) set(false); else relT = setTimeout(() => set(false), 150 - held); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } });
      b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') set(false); });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    b._sync = () => b.classList.toggle('down', !!ctrl[d.addr]);
    return b;
  }
  function lampEl(addr, name) {
    return h(`<span class="lamp" data-a="${esc(addr)}"><i></i>${esc(name)} <span class="sub">${esc(addr)}</span></span>`);
  }

  // Parse with the fewest columns that fit (keeps small examples readable on phones)
  function compactParse(text) {
    for (let c = 3; c <= 12; c++) { try { return LL.parseProgram('COLS ' + c + '\n' + text); } catch (e) { /* too narrow */ } }
    return LL.parseProgram(text);
  }

  // ───────────────────────── mini simulator ─────────────────────────
  class MiniSim {
    constructor(host, spec, opts) {
      opts = opts || {};
      this.spec = spec;
      this.st = spec.lang === 'st';
      this.prog = this.st ? LL.compileST(spec.program) : compactParse(spec.program);
      this.tags = {};
      Object.keys(spec.inputs || {}).forEach((a) => (this.tags[a] = spec.inputs[a].name));
      Object.keys(spec.outputs || {}).forEach((a) => (this.tags[a] = spec.outputs[a]));
      this.m = LL.makeMachine(this.prog);
      this.ctrl = {};
      this.running = !spec.step;
      this.acc = 0;
      const el = h(`<div class="mini card">
        <div class="mini-head"><span class="eyebrow"><span class="live-dot"></span>${esc(opts.label || 'Live example · press the buttons')}</span>
          <span class="row"><span class="scanstate"></span>
          ${spec.step ? `<button class="btn small" data-a="run">${I.play} Run</button><button class="btn small" data-a="step">${I.step} Step</button>` : ''}
          <button class="btn small ghost" data-a="reset" title="Reset memory">${I.reset}</button>
          ${opts.noOpen ? '' : `<button class="btn small" data-a="open">Open in Lab ${I.arrow}</button>`}</span></div>
        ${this.st ? `<pre class="code st-code">${LL.highlightST(spec.program)}</pre><div class="mini-err" hidden></div>` : '<div class="ladder-host"></div>'}
        <div class="mini-io"></div>
        ${spec.note ? `<div class="mini-note">${esc(spec.note)}</div>` : ''}
      </div>`);
      host.replaceWith(el);
      this.el = el;
      if (!this.st) {
        this.view = new LL.LadderView($('.ladder-host', el), { fit: true });
        this.view.setProgram(this.prog, this.tags);
        requestAnimationFrame(() => this.view.fit());
      }
      const io = $('.mini-io', el);
      Object.keys(spec.inputs || {}).forEach((a) => io.appendChild(deviceEl(Object.assign({ addr: a }, spec.inputs[a]), this.ctrl)));
      Object.keys(spec.outputs || {}).forEach((a) => io.appendChild(lampEl(a, spec.outputs[a])));
      this.vals = h('<span class="vals"></span>');
      io.appendChild(this.vals);
      this.lamps = $$('.lamp', io);
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        const a = b.dataset.a;
        if (a === 'reset') { this.m.reset(); this.phaseText(''); }
        if (a === 'run') { this.running = !this.running; b.innerHTML = this.running ? I.pause + ' Pause' : I.play + ' Run'; if (this.view) this.view.setActiveRung(-1); this.phaseText(''); }
        if (a === 'step') { this.running = false; const rb = $('[data-a="run"]', el); if (rb) rb.innerHTML = I.play + ' Run'; this.stepPhase(); }
        if (a === 'open') openInLab(this.spec);
      });
      this.visible = true;
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver((en) => { this.visible = en[0].isIntersecting; });
        this.io.observe(el);
      }
      tickers.add(this);
      this.render();
    }
    inputs() {
      const o = {};
      Object.keys(this.spec.inputs || {}).forEach((a) => {
        const k = this.spec.inputs[a].kind, v = !!this.ctrl[a];
        o[a] = k === 'ana' ? +this.ctrl[a] || 0 : k === 'pbnc' ? (v ? 0 : 1) : v ? 1 : 0;
      });
      return o;
    }
    phaseText(t) { const s = $('.scanstate', this.el); if (s) s.textContent = t; }
    stepPhase() {
      if (this.st) { this.m.setInputs(this.inputs()); this.m.scan(10); this.phaseText('scan ' + this.m.scanCount); this.render(); return; }
      const n = this.prog.rungs.length;
      if (this.m.phase === 0) this.m.setInputs(this.inputs());
      const ph = this.m.stepPhase(10);
      this.view.setActiveRung(ph >= 1 && ph <= n ? ph - 1 : -1);
      this.phaseText(ph === 0 ? '① read inputs' : ph <= n ? '② solved rung ' + ph : '③ wrote outputs');
      this.render();
    }
    tick(dt) {
      if (!document.body.contains(this.el)) { tickers.delete(this); this.io && this.io.disconnect(); return; }
      if (!this.visible) return;
      if (this.running) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= 10 && n < 20) { this.m.setInputs(this.inputs()); this.m.scan(10); this.acc -= 10; n++; }
        if (n >= 20) this.acc = 0;
      }
      this.render();
    }
    render() {
      this.lamps.forEach((l) => l.classList.toggle('on', !!this.m.bit(l.dataset.a)));
      if (this.st) {
        const er = $('.mini-err', this.el);
        const msg = this.m.error ? 'PLC in STOP · ' + this.m.error : '';
        if (er._m !== msg) { er._m = msg; er.hidden = !msg; er.textContent = msg; }
        const html = this.m.listVars().filter((v) => !v.at).map((v) => `<span class="val">${esc(v.name)} <b>${esc(v.value)}</b></span>`).join('');
        if (html !== this._vh) { this.vals.innerHTML = html; this._vh = html; }
        return;
      }
      const showPower = this.running || this.m.scanCount > 0;
      this.view.update(this.m, showPower);
      const parts = [];
      LL.usedAddrs(this.prog).forEach((a) => {
        if (/^T\d+$/.test(a)) { const t = this.m.timers[+a.slice(1)]; parts.push(`${a}.ET <b>${t ? (t.et / 1000).toFixed(1) : '0.0'}s</b>`); }
        else if (/^C\d+$/.test(a)) parts.push(`${a}.CV <b>${this.m.word(a + '.CV')}</b>`);
        else if (/^(MW|AQW)\d+$/.test(a)) parts.push(`${a} <b>${this.m.word(a)}</b>`);
        else if (/^M\d/.test(a)) parts.push(`${a} <b>${this.m.bit(a)}</b>`);
      });
      const html = parts.map((p) => `<span class="val">${p}</span>`).join('');
      if (html !== this._vh) { this.vals.innerHTML = html; this._vh = html; }
    }
  }

  // a lesson example (MiniSim spec) → the Lab; it asks first if that would replace the learner's program
  function openInLab(spec, msg) {
    if (spec.lang === 'st') return labReplace({ lang: 'st', text: spec.program, plant: spec.plant || 'panel', name: spec.name, msg });
    const lines = ['NAME ' + (spec.name || 'Lesson example'), 'COLS 7'];
    Object.keys(spec.inputs || {}).forEach((a) => lines.push('TAG ' + a + ' ' + spec.inputs[a].name));
    Object.keys(spec.outputs || {}).forEach((a) => lines.push('TAG ' + a + ' ' + spec.outputs[a]));
    const p = LL.parseProgram(spec.program);
    const body = LL.programToText(p).split('\n').filter((l) => !/^(NAME|COLS) /.test(l));
    labReplace({ lang: 'ld', text: lines.concat(body).join('\n'), plant: spec.plant || 'panel', name: spec.name || 'Lesson example', msg });
  }

  // ═════════════ MY WORK: never lose a Lab program · My programs · backup file ═════════════
  // The free Lab keeps ONE Ladder program (S.programs.lab) and ONE ST program (S.st.lab). Everything that
  // puts another program there goes through labReplace(): it asks first when the learner's program would
  // be lost, and the Lab then shows an Undo bar. My programs (S.saved) keeps up to 50 named copies.
  Object.assign(I, {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M7 9l5-5 5 5M5 20h14"/></svg>',
  });
  const SAVED_MAX = 50;
  const S_DEFAULT = () => ({ lessons: {}, ch: {}, chTried: {}, programs: {}, st: {}, lang: {}, plant: {}, quiz: { best: 0, predict: 0, predictBest: 0 }, theme: '', brand: 'll', saved: [] });
  if (!Array.isArray(S.saved)) S.saved = [];
  let labNow = null; // the free Lab on screen
  let labUndo = null; // one-shot: the program the last replacement threw out; the next free Lab offers Undo
  const BAD_KEY = (k) => k === '__proto__' || k === 'constructor' || k === 'prototype';
  const liveLab = () => (labNow && labNow.el && document.body.contains(labNow.el) ? labNow : null);
  const plantName = (p) => (own(LL.Plants, p) ? LL.Plants[p].name : 'Trainer panel');
  const langName = (l) => (l === 'st' ? 'Structured Text' : 'Ladder');
  const labText = (lang) => (lang === 'st' ? S.st.lab : S.programs.lab);
  const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtDate = (ms) => { try { return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  // the same program? (Ladder: compare the clean text, so spaces and order of the text lines do not matter)
  function normProg(lang, t) {
    t = String(t == null ? '' : t).replace(/\r\n?/g, '\n');
    if (lang === 'st') return t.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();
    try { return LL.programToText(LL.parseProgram(t)).trim(); } catch (e) { return t.trim(); }
  }
  // nothing of the learner's in it: no text, empty rungs, an ST frame without logic, or the Lab's start program
  function progEmpty(lang, t) {
    if (t == null || !String(t).trim()) return true;
    if (lang === 'st') return !String(t).replace(/\(\*[\s\S]*?\*\)/g, ' ').replace(/\/\/[^\n]*/g, ' ').replace(/\bVAR\w*\b[\s\S]*?\bEND_VAR\b/gi, ' ').replace(/\bEND_PROGRAM\b/gi, ' ').replace(/\bPROGRAM\s+\w+/gi, ' ').trim();
    if (normProg('ld', t) === normProg('ld', LL.OPEN_PROGRAMS.video.program)) return true;
    try { const p = LL.parseProgram(t); return !(p.blocks || []).length && !(p.dbs || []).length && p.rungs.every((r) => r.cells.every((row) => row.every((c) => !c))); } catch (e) { return false; }
  }
  function progName(lang, t) {
    if (lang === 'st') { const m = /\bPROGRAM\s+(\w+)/i.exec(t || ''); return m ? m[1] : 'ST program'; }
    try { return LL.parseProgram(t).name || 'Untitled'; } catch (e) { return 'Untitled'; }
  }
  function progSize(lang, t) {
    if (lang === 'st') return plural(String(t || '').split('\n').filter((l) => l.trim()).length, 'line');
    try { return plural(LL.parseProgram(t).rungs.length, 'rung'); } catch (e) { return ''; }
  }
  // the Lab program now (the start program when the learner has none yet)
  function labCurrent() {
    const lang = S.lang.lab === 'st' ? 'st' : 'ld';
    const t = labText(lang);
    const text = t != null ? String(t) : lang === 'st' ? '' : LL.OPEN_PROGRAMS.video.program;
    return { lang, text, plant: S.plant.lab || (S.programs.lab ? 'panel' : 'cylinders'), empty: progEmpty(lang, t), name: progName(lang, text) };
  }
  // a copy in My programs (null when the list is full)
  function keepProgram(o, at) {
    if (S.saved.length >= SAVED_MAX) { toast('My programs is full (' + SAVED_MAX + ' programs). Delete one first.', { ms: 4500 }); return null; }
    const e = { id: newId(), name: String(o.name || 'Untitled').trim().slice(0, 80) || 'Untitled', lang: o.lang === 'st' ? 'st' : 'ld', text: String(o.text), plant: own(LL.Plants, o.plant) ? o.plant : 'panel', at: Date.now() };
    S.saved.splice(at == null ? 0 : at, 0, e); saveNow();
    return e;
  }
  // o: { lang, text, plant, name, msg, title, verb }. title/verb: other words (Clear: "Empty your Lab program?")
  function labReplace(o) {
    const lang = o.lang === 'st' ? 'st' : 'ld';
    const old = labText(lang);
    const before = progEmpty(lang, old) ? null : { lang, text: old, plant: S.plant.lab };
    const go = (pre) => labPut(lang, o.text, o.plant, before, (pre || '') + (o.msg || ''));
    if (!before || normProg(lang, old) === normProg(lang, o.text)) return go();
    const nm = progName(lang, old);
    const kept = S.saved.some((e) => e.lang === lang && normProg(lang, e.text) === normProg(lang, old));
    modal(o.title || 'Replace your Lab program?', `<p class="mp-q">The Lab has your ${langName(lang)} program <b>${esc(nm)}</b> (${esc(progSize(lang, old))}).${o.title ? '' : ` <b>${esc(o.name || progName(lang, o.text))}</b> will take its place.`}</p>
      <p class="muted mp-why">Why ask? The Lab keeps only one ${langName(lang)} program. ${kept ? 'A copy of yours is already in <b>My programs</b>.' : 'Save yours in <b>My programs</b> and you can load it again later.'}</p>`, [
      ...(kept ? [] : [{ label: 'Save it to My programs first', cls: 'primary', run: () => { const e = keepProgram({ lang, text: old, name: nm, plant: S.plant.lab }); if (!e) return false; setTimeout(() => go('Your program is saved in My programs. ')); } }]),
      { label: o.verb || 'Replace', cls: kept ? 'primary' : '', run: () => { setTimeout(() => go()); } },
      { label: 'Cancel' },
    ]);
  }
  // write the program into the Lab: in place when the free Lab is on screen in that language, else via the router
  function labPut(lang, text, plant, before, msg) {
    const L = liveLab();
    const undo = before ? Object.assign({ after: normProg(lang, text) }, before) : null;
    if (L && L.lang === lang) { L.loadProgram(lang, text, plant); if (undo) L.offerUndo(undo); }
    else {
      if (lang === 'st') S.st.lab = text; else S.programs.lab = text;
      S.lang.lab = lang;
      if (plant && own(LL.Plants, plant)) S.plant.lab = plant;
      saveNow();
      labUndo = undo;
      if (L) labView = L.view;
      if (location.hash === '#lab') { current = ''; route(); } else location.hash = 'lab';
    }
    if (msg) toast(msg, { ms: 4200 });
  }

  // ── files ──
  // Inside the Claude artifact viewer a page may not download by itself: it offers the file through the
  // "downloads" capability (the viewer confirms). Everywhere else (installed app, file, web) a normal download link.
  let dlNs = null;
  function download(name, text, type) {
    const plain = () => {
      const url = URL.createObjectURL(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.hidden = true;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    const C = window.claude;
    if (!C || typeof C.use !== 'function') return plain();
    (dlNs = dlNs || C.use('downloads')).then((d) => {
      if (!d) return plain();
      return d.save({ filename: name, data: text }).then(
        () => toast('Saved: ' + name),
        (e) => { const c = e && e.code; if (c === 'declined') toast('Not saved.'); else if (c === 'rate_limited') toast('A save is already waiting for your answer.'); else toast('Saving files is not possible in this view.'); });
    }, plain);
  }
  function pickFile(accept, cb) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.hidden = true;
    inp.onchange = () => {
      const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast('This file is too big (more than 8 MB).'); return; }
      const r = new FileReader();
      r.onload = () => cb(f, String(r.result || ''));
      r.onerror = () => toast('Could not read the file.');
      r.readAsText(f);
    };
    document.body.appendChild(inp); inp.click();
  }
  const fileSlug = (s) => String(s || 'program').normalize('NFKD').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'program';
  function downloadProgram() {
    const c = labCurrent();
    if (!c.text.trim()) { toast('The Lab program is empty. Nothing to download.'); return; }
    const text = c.lang === 'st' ? c.text : LL.programToText(LL.parseProgram(c.text));
    download(fileSlug(c.name) + (c.lang === 'st' ? '.st.txt' : '.txt'), text);
    toast('Downloaded: ' + fileSlug(c.name) + (c.lang === 'st' ? '.st.txt' : '.txt'));
  }
  // a .txt file → { lang, text, name } or { error }
  function readProgramFile(text, fname) {
    text = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const base = String(fname || '').replace(/(\.st)?\.txt$/i, '').replace(/[-_]+/g, ' ').trim();
    if (!text.trim()) return { error: 'The file is empty.' };
    if (/^\s*RUNG\b/m.test(text) && !/\bEND_PROGRAM\b/i.test(text)) {
      try { const p = LL.parseProgram(text); if (!/^\s*NAME /m.test(text) && base) p.name = base; return { lang: 'ld', text: LL.programToText(p), name: p.name || base || 'Untitled' }; } catch (e) { return { error: 'This looks like a Ladder program, but line "' + e.message + '" is wrong.' }; }
    }
    if (/:=|\bEND_PROGRAM\b|\bEND_IF\b|\bEND_VAR\b/i.test(text)) {
      const r = LL.compileST(text, 'ST program');
      return { lang: 'st', text, name: progName('st', text) !== 'ST program' ? progName('st', text) : base || 'ST program', warn: r.ok ? '' : 'It has an error on line ' + r.error.line + ': ' + r.error.msg };
    }
    return { error: 'This is not a Ladder Lab program. A Ladder file has RUNG lines; an ST file has := or END_PROGRAM.' };
  }
  function openProgramFile() {
    pickFile('.txt,.st,text/plain', (f, text) => {
      const r = readProgramFile(text, f.name);
      if (r.error) { modal('Cannot open this file', `<p>${esc(r.error)}</p><p class="muted">Use a file that <b>Download this program (.txt)</b> made.</p>`, [{ label: 'OK' }]); return; }
      labReplace({ lang: r.lang, text: r.text, name: r.name, msg: 'Opened "' + r.name + '" in the Lab.' + (r.warn ? ' ' + r.warn : '') });
    });
  }

  // ── backup: one .json file with everything ──
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
  function clean(v, d) { // a copy of plain JSON data without __proto__ & co.
    d = d || 0;
    if (d > 12) return undefined;
    if (Array.isArray(v)) return v.map((x) => clean(x, d + 1));
    if (isObj(v)) { const o = {}; Object.keys(v).forEach((k) => { if (!BAD_KEY(k)) o[k] = clean(v[k], d + 1); }); return o; }
    return v;
  }
  const storeKey = (k) => !!k && k !== KEY && /^(ll-|ladderlab)/.test(k);
  function exportWork() {
    saveNow();
    const store = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (storeKey(k)) store[k] = localStorage.getItem(k); } } catch (e) { /* storage unavailable */ }
    const name = 'ladder-lab-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    download(name, JSON.stringify({ format: 'ladder-lab-backup', version: 1, exported: new Date().toISOString(), app: S, store }, null, 1), 'application/json');
    toast('Backup downloaded: ' + name + '. Keep it somewhere safe.', { ms: 4500 });
  }
  function checkBackup(d) {
    if (!isObj(d)) return null;
    const raw = d.format === 'ladder-lab-backup' ? d.app : isObj(d.lessons) && isObj(d.ch) ? d : null;
    if (!isObj(raw)) return null;
    const a = clean(raw);
    ['lessons', 'ch', 'chTried', 'programs', 'st', 'lang', 'plant', 'quiz'].forEach((k) => { if (a[k] != null && !isObj(a[k])) delete a[k]; });
    ['programs', 'st'].forEach((k) => { if (a[k]) Object.keys(a[k]).forEach((p) => { if (typeof a[k][p] !== 'string') delete a[k][p]; }); });
    ['theme', 'brand'].forEach((k) => { if (a[k] != null && typeof a[k] !== 'string') delete a[k]; });
    a.saved = (Array.isArray(a.saved) ? a.saved : []).filter((e) => isObj(e) && typeof e.text === 'string' && typeof e.name === 'string').slice(0, SAVED_MAX)
      .map((e) => ({ id: typeof e.id === 'string' ? e.id.slice(0, 40) : newId(), name: e.name.slice(0, 80), lang: e.lang === 'st' ? 'st' : 'ld', text: e.text, plant: own(LL.Plants, e.plant) ? e.plant : 'panel', at: +e.at || Date.now() }));
    const store = {};
    if (isObj(d.store)) Object.keys(d.store).forEach((k) => { if (storeKey(k) && typeof d.store[k] === 'string') store[k] = d.store[k]; });
    return { app: a, store, exported: typeof d.exported === 'string' ? d.exported : '' };
  }
  function workSummary(a) {
    const n = (o) => (isObj(o) ? Object.keys(o).filter((k) => o[k]).length : 0);
    const progs = isObj(a.programs) ? a.programs : {}, sts = isObj(a.st) ? a.st : {};
    const taskWork = Object.keys(progs).concat(Object.keys(sts)).filter((k) => k.startsWith('ch:')).length;
    const labs = [];
    if (!progEmpty('ld', progs.lab)) labs.push('Ladder "' + progName('ld', progs.lab) + '"');
    if (!progEmpty('st', sts.lab)) labs.push('ST "' + progName('st', sts.lab) + '"');
    const q = isObj(a.quiz) ? a.quiz : {};
    const best = Object.keys(q).filter((k) => /best/i.test(k) && typeof q[k] === 'number' && q[k] > 0).length;
    return { lessons: Math.min(n(a.lessons), LL.LESSONS.length), tasks: n(a.ch), taskWork, labs, saved: (a.saved || []).length, quiz: best, miss: isObj(q.miss) ? Object.values(q.miss).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0) : 0 };
  }
  function importWork() {
    pickFile('.json,application/json', (f, text) => {
      let d = null; try { d = JSON.parse(text); } catch (e) { /* not JSON */ }
      const b = checkBackup(d);
      if (!b) { modal('Not a backup file', '<p>This file is not a Ladder Lab backup. Choose the <b>.json</b> file that <b>Export my work</b> made.</p>', [{ label: 'OK' }]); return; }
      const w = workSummary(b.app), here = workSummary(S), nStore = Object.keys(b.store).length;
      const li = [
        `<li><b>${w.lessons}</b> of ${LL.LESSONS.length} lessons done</li>`,
        `<li><b>${w.tasks}</b> task${w.tasks === 1 ? '' : 's'} passed${w.taskWork ? ` · your programs for <b>${w.taskWork}</b> task${w.taskWork === 1 ? '' : 's'}` : ''}</li>`,
        `<li>Lab: ${w.labs.length ? esc(w.labs.join(' and ')) : '<span class="muted">no Lab program</span>'}</li>`,
        `<li><b>${w.saved}</b> program${w.saved === 1 ? '' : 's'} in My programs</li>`,
        `<li>Quiz: ${w.quiz ? `<b>${w.quiz}</b> best score${w.quiz === 1 ? '' : 's'}` : 'no scores yet'}${w.miss ? ` · <b>${w.miss}</b> questions to repeat` : ''}</li>`,
        nStore ? `<li>Settings of <b>${nStore}</b> simulator${nStore === 1 ? '' : 's'} (rack, network…)</li>` : '',
      ].join('');
      const when = b.exported ? fmtDate(Date.parse(b.exported)) : '';
      modal('Import this backup?', `<p style="margin-top:0">File <b>${esc(f.name)}</b>${when ? ', saved ' + esc(when) : ''}. It has:</p><ul class="bk-sum">${li}</ul>
        <div class="bk-how"><p><b>Merge</b>: keep your work here and add what is new in the file. Nothing is deleted.</p><p><b>Replace</b>: delete your work here and use only the file.</p></div>
        <p class="muted" style="margin-bottom:0">Here now: ${here.lessons} lessons, ${here.tasks} tasks, ${here.saved} saved programs.</p>`, [
        { label: 'Merge with my work', cls: 'primary', run: () => applyImport(b, 'merge') },
        { label: 'Replace my work', run: () => { setTimeout(() => modal('Replace all your work?', '<p>Your progress and programs in this browser are deleted. Only the file stays. Merge is the safe choice.</p>', [{ label: 'Replace everything', cls: 'primary', run: () => applyImport(b, 'replace') }, { label: 'Cancel' }])); } },
        { label: 'Cancel' },
      ]);
    });
  }
  function mergeVal(a, b) {
    if (a === undefined || a === null) return b;
    if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
    if (Array.isArray(a) && Array.isArray(b)) { const seen = new Set(a.map((x) => JSON.stringify(x))); return a.concat(b.filter((x) => !seen.has(JSON.stringify(x)))); }
    if (isObj(a) && isObj(b)) { Object.keys(b).forEach((k) => { if (!BAD_KEY(k)) a[k] = mergeVal(a[k], b[k]); }); return a; }
    return a; // text settings (theme, brand…): yours stay
  }
  function applyImport(b, mode) {
    let next, lost = 0;
    if (mode === 'replace') next = Object.assign(S_DEFAULT(), b.app);
    else {
      next = clean(S);
      const extra = [];
      Object.keys(b.app).forEach((k) => {
        if (k === 'saved') return;
        if (k === 'programs' || k === 'st') {
          const lang = k === 'st' ? 'st' : 'ld';
          next[k] = isObj(next[k]) ? next[k] : {};
          Object.keys(b.app[k]).forEach((p) => {
            const mine = next[k][p], theirs = b.app[k][p];
            if (mine == null || progEmpty(lang, mine)) next[k][p] = theirs;
            // two different Lab programs: yours stays in the Lab, the file's goes to My programs
            else if (p === 'lab' && !progEmpty(lang, theirs) && normProg(lang, mine) !== normProg(lang, theirs)) extra.push({ id: newId(), name: progName(lang, theirs) + ' (from backup)', lang, text: theirs, plant: (isObj(b.app.plant) && own(LL.Plants, b.app.plant.lab) && b.app.plant.lab) || 'panel', at: Date.now() });
          });
          return;
        }
        next[k] = mergeVal(next[k], b.app[k]);
      });
      // the same saved program (same id) is not added twice; a Lab program from the file only if it is not saved yet
      next.saved = Array.isArray(next.saved) ? next.saved : [];
      const has = (e) => next.saved.some((x) => x.id === e.id), hasText = (e) => next.saved.some((x) => x.lang === e.lang && normProg(x.lang, x.text) === normProg(e.lang, e.text));
      const put = (e) => { if (next.saved.length < SAVED_MAX) next.saved.push(e); else lost++; };
      b.app.saved.forEach((e) => { if (!has(e)) put(e); });
      extra.forEach((e) => { if (!hasText(e)) put(e); });
    }
    if (!Array.isArray(next.saved)) next.saved = [];
    ['lessons', 'ch', 'chTried', 'programs', 'st', 'lang', 'plant', 'quiz'].forEach((k) => { if (!isObj(next[k])) next[k] = S_DEFAULT()[k]; });
    S = next;
    try {
      if (mode === 'replace') { const ks = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (storeKey(k)) ks.push(k); } ks.forEach((k) => localStorage.removeItem(k)); }
      Object.keys(b.store).forEach((k) => { if (mode === 'replace' || localStorage.getItem(k) == null) localStorage.setItem(k, b.store[k]); });
    } catch (e) { /* storage unavailable */ }
    saveNow();
    try { sessionStorage.setItem('ladderlab.toast', (mode === 'replace' ? 'Backup imported. Your work now comes from the file.' : 'Backup imported and merged with your work.') + (lost ? ' ' + lost + ' saved programs did not fit (max ' + SAVED_MAX + ').' : '')); } catch (e) { /* storage unavailable */ }
    location.reload();
  }

  // ── the My programs window ──
  function myPrograms() {
    const m = modal('My programs', '<div class="mp"><div class="mp-now"></div><div class="mp-head"><h3>Saved programs</h3><span class="mp-count"></span></div><ul class="mp-list"></ul>' +
      `<div class="mp-files"><h3>Program file</h3><p class="muted">A plain text file. Open it in the Lab on another computer, or send it to your teacher.</p><div class="row"><button class="btn small" data-mf="down">${I.download} Download this program (.txt)</button><button class="btn small" data-mf="open">${I.upload} Open a .txt program</button></div>` +
      `<h3>Backup of all your work</h3><p class="muted">One file with your progress, Lab programs, My programs and quiz scores. Your work lives only in this browser: make a backup now and then.</p><div class="row"><button class="btn small" data-mf="export">${I.download} Export my work</button><button class="btn small" data-mf="import">${I.upload} Import</button></div></div></div>`, [{ label: 'Close' }]);
    m.classList.add('mp-modal');
    const closeAll = () => { const x = $('[data-x]', m); if (x) x.click(); else m.remove(); };
    const draw = () => {
      const c = labCurrent();
      $('.mp-now', m).innerHTML = `<div class="mp-cur"><span class="eyebrow">In the Lab now</span><b>${esc(c.name)}</b><span class="mp-meta"><span class="chip mp-lang">${c.lang === 'st' ? 'ST' : 'LD'}</span>${esc(plantName(c.plant))}${c.empty ? ' · <span class="muted">start program</span>' : ''}</span></div>
        <div class="mp-saveas"><button class="btn small primary" data-mp="saveas"${c.empty ? ' disabled' : ''}>${I.folder} Save current as…</button></div>
        <form class="mp-form" hidden><label class="mp-lbl" for="mp-name">Name</label><input id="mp-name" maxlength="80" autocomplete="off"><button class="btn small primary" type="submit">Save</button><button class="btn small" type="button" data-mp="nosave">Cancel</button></form>`;
      $('.mp-count', m).textContent = S.saved.length + ' / ' + SAVED_MAX;
      $('.mp-list', m).innerHTML = S.saved.length ? S.saved.map((e) => `<li class="mp-item" data-id="${esc(e.id)}">
          <div class="mp-info"><b class="mp-name">${esc(e.name)}</b><span class="mp-meta"><span class="chip mp-lang">${e.lang === 'st' ? 'ST' : 'LD'}</span>${esc(plantName(e.plant))} · ${esc(fmtDate(e.at))}</span></div>
          <div class="mp-act"><button class="btn small primary" data-mp="load">Load</button><button class="btn small" data-mp="ren">Rename</button><button class="btn small" data-mp="dup">Duplicate</button><button class="btn small mp-del" data-mp="del" aria-label="Delete ${esc(e.name)}" title="Delete">${I.trash}</button></div>
        </li>`).join('') : '<li class="mp-empty">No saved programs yet. Press <b>Save current as…</b> to keep a copy of your Lab program. Then you can try something new and load your copy again later.</li>';
      const form = $('.mp-form', m);
      form.onsubmit = (ev) => {
        ev.preventDefault();
        const cur = labCurrent(), nm = $('#mp-name', m).value.trim() || cur.name;
        const e = keepProgram({ lang: cur.lang, text: cur.text, plant: cur.plant, name: nm });
        if (e) { toast('Saved in My programs: "' + e.name + '"'); draw(); }
      };
    };
    m.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-mp],[data-mf]'); if (!b || !m.contains(b)) return;
      const li = b.closest('.mp-item'), e = li && S.saved.find((x) => x.id === li.dataset.id);
      const k = b.dataset.mp || b.dataset.mf;
      if (k === 'saveas') { const f = $('.mp-form', m); f.hidden = false; $('.mp-saveas', m).hidden = true; const i = $('#mp-name', m); i.value = labCurrent().name; i.focus(); i.select(); }
      else if (k === 'nosave') draw();
      else if (k === 'load' && e) { closeAll(); labReplace({ lang: e.lang, text: e.text, plant: e.plant, name: e.name, msg: 'Loaded "' + e.name + '" from My programs.' }); }
      else if (k === 'ren' && e) {
        const r = modal('Rename program', `<div class="field"><label for="mp-rn">New name</label><input id="mp-rn" maxlength="80" value="${esc(e.name)}" autocomplete="off"></div>`, [
          { label: 'Cancel' },
          { label: 'Rename', cls: 'primary', run: () => { const v = $('#mp-rn', r).value.trim(); if (!v) return false; e.name = v.slice(0, 80); saveNow(); draw(); toast('Renamed'); } },
        ]);
        const i = $('#mp-rn', r); i.focus(); i.select();
        i.addEventListener('keydown', (kv) => { if (kv.key === 'Enter') { kv.preventDefault(); $('.ma .primary', r).click(); } });
      }
      else if (k === 'dup' && e) { const c = keepProgram({ lang: e.lang, text: e.text, plant: e.plant, name: e.name + ' (copy)' }, S.saved.indexOf(e) + 1); if (c) { draw(); toast('Copy made: "' + c.name + '"'); } }
      else if (k === 'del' && e) {
        modal('Delete "' + e.name + '"?', '<p>The program is removed from My programs. This cannot be undone.</p><p class="muted">Not sure? Load it and press <b>Download this program (.txt)</b> first.</p>', [
          { label: 'Cancel' },
          { label: 'Delete', cls: 'mp-danger', run: () => { const i = S.saved.indexOf(e); if (i >= 0) S.saved.splice(i, 1); saveNow(); draw(); toast('Deleted "' + e.name + '"'); } },
        ]);
      }
      else if (k === 'down') downloadProgram();
      else if (k === 'open') { closeAll(); openProgramFile(); }
      else if (k === 'export') exportWork();
      else if (k === 'import') { closeAll(); importWork(); }
    });
    draw();
    return m;
  }
  // Home: the "Keep your work safe" box
  function workBox(el) {
    const box = $('.mp-home', el); if (!box) return;
    box.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-bk]'); if (!b) return;
      if (b.dataset.bk === 'export') exportWork();
      else if (b.dataset.bk === 'import') importWork();
      else myPrograms();
    });
  }

  // ═════════════ SEARCH (#search) ═════════════
  // Lessons, tasks, machines, glossary terms and topics, as you type. Topics on Home stay the main way in.
  let SIDX = null;
  let glossQ = ''; // one-shot: the glossary opens filtered on this term
  const plainText = (s) => String(s || '').replace(/\[\[[^\]]*\]\]/g, ' ').replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  function searchIndex() {
    if (SIDX) return SIDX;
    const out = [];
    const add = (o) => { o.n = out.length; o.lt = o.title.toLowerCase(); o.ls = (o.sub || '').toLowerCase(); o.lb = (o.body || '').toLowerCase(); out.push(o); };
    TOPICS.forEach((T) => add({ type: 'topic', href: '#topic-' + T.id, title: T.title, sub: plainText(T.blurb), body: plainText(T.intro), T, meta: topicCounts(T).replace(/<[^>]+>/g, '') }));
    LL.LESSONS.forEach((l) => add({ type: 'lesson', href: '#lesson-' + l.id, title: l.title, sub: plainText(l.summary), body: plainText(l.body) + ' ' + (l.takeaways || []).join(' '), meta: 'Lesson ' + lessonNo(l) + ' · ' + l.min + ' min', done: !!S.lessons[l.id] }));
    LL.CHALLENGES.forEach((c) => add({ type: 'task', href: '#ch-' + c.id, title: c.title, sub: plainText(c.brief), meta: 'Level ' + c.level + (c.lang === 'st' ? ' · ST' : '') + ' · ' + plantName(c.plant), id: c.id }));
    LL.PLANT_ORDER.forEach((p) => { const M = LL.Plants[p]; if (M) add({ type: 'machine', href: '#lab', title: M.name, sub: plainText(M.blurb), plant: p, meta: 'Machine in the Lab' }); });
    (LL.GLOSSARY || []).forEach(([t, d]) => add({ type: 'term', href: '#glossary', title: t, sub: d, term: t, meta: 'Glossary' }));
    SIDX = out;
    return out;
  }
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function hl(text, words) {
    if (!words.length) return esc(text);
    const re = new RegExp('(' + words.slice().sort((a, b) => b.length - a.length).map(reEsc).join('|') + ')', 'gi');
    return String(text).split(re).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join('');
  }
  function snip(text, words, n) {
    n = n || 170;
    if (text.length <= n) return text;
    const low = text.toLowerCase();
    let at = -1;
    words.forEach((w) => { const i = low.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; });
    if (at < n - 50) return text.slice(0, n).replace(/\s+\S*$/, '') + ' …';
    let s = text.lastIndexOf(' ', at - 50); s = s < 0 ? 0 : s + 1;
    return '… ' + text.slice(s, s + n).replace(/\s+\S*$/, '') + (s + n < text.length ? ' …' : '');
  }
  const atWord = (s, i) => i === 0 || !/[a-z0-9]/i.test(s[i - 1]);
  function runSearch(q) {
    const words = [...new Set(q.toLowerCase().split(/[\s,;]+/).filter(Boolean))];
    const ph = q.toLowerCase().trim();
    const hits = [];
    if (ph.length < 2) return { words, hits };
    searchIndex().forEach((it) => {
      let sc = 0;
      for (const w of words) {
        const t = it.lt.indexOf(w), s = it.ls.indexOf(w), b = it.lb.indexOf(w);
        if (t < 0 && s < 0 && b < 0) return; // every word must be somewhere
        // in the title; more for a whole word ("timer" in "On-delay timer") than for a start ("Timers")
        if (t >= 0) sc += 10 + (t === 0 ? 3 : 0) + (atWord(it.lt, t) ? 4 : 0) + (atWord(it.lt, t) && !/[a-z0-9]/i.test(it.lt[t + w.length] || '') ? 5 : 0);
        if (s >= 0) sc += 4 + (atWord(it.ls, s) ? 1 : 0);
        if (b >= 0) sc += 1;
      }
      if (it.lt === ph) sc += 60; else if (it.lt.startsWith(ph)) sc += 25; else if (words.length > 1 && it.lt.includes(ph)) sc += 15;
      hits.push({ it, sc });
    });
    hits.sort((a, b) => b.sc - a.sc || a.it.n - b.it.n);
    return { words, hits };
  }
  const SEARCH_GROUPS = [['topic', 'Topics'], ['lesson', 'Lessons'], ['task', 'Tasks'], ['machine', 'Machines'], ['term', 'Glossary']];
  const SEARCH_TRY = ['seal-in', 'TON', 'PNP', 'counter', 'Modbus', 'PID', 'star-delta', 'safety', 'interview', 'CASE'];
  function pageSearch(q0) {
    const el = h(`<div class="wrap srch"><span class="plate">Search</span><h1>Search</h1>
      <div class="srch-box">${I.search}<input type="search" id="srch-q" placeholder="Lessons, tasks, machines, terms…" aria-label="Search lessons, tasks, machines, glossary and topics" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div>
      <p class="srch-count" aria-live="polite"></p><div class="srch-res"></div>
      <p class="srch-foot muted">The best way to explore is still <a href="#topics">by topic</a>: every lesson, task and machine of one subject in one place.</p></div>`);
    const inp = $('#srch-q', el), res = $('.srch-res', el), cnt = $('.srch-count', el);
    const open = {}; // groups opened with "Show all"
    const hitHtml = (it, words) => {
      const inS = words.filter((w) => it.ls.includes(w)).length, inB = words.filter((w) => it.lb.includes(w)).length;
      const text = inB > inS ? snip(it.body, words) : snip(it.sub || '', words, it.type === 'term' ? 260 : 170);
      const ic = it.type === 'topic' ? topicIc(it.T, 'srch-tic') : `<span class="srch-ic" aria-hidden="true">${{ lesson: I.learn, task: I.target, machine: I.lab, term: I.book }[it.type]}</span>`;
      const done = it.type === 'lesson' ? !!S.lessons[it.href.slice(8)] : it.type === 'task' ? !!S.ch[it.id] : false;
      return `<a class="srch-hit" href="${it.href}"${it.T ? ` style="--tc:${it.T.color}"` : ''}${it.plant ? ` data-plant="${esc(it.plant)}"` : ''}${it.term ? ` data-term="${esc(it.term)}"` : ''}>${ic}<span class="srch-tx"><span class="srch-t">${hl(it.title, words)}${done ? ' <span class="chip ok">✓</span>' : ''}</span><span class="srch-meta">${esc(it.meta || '')}</span>${text ? `<span class="srch-sn">${hl(text, words)}</span>` : ''}</span></a>`;
    };
    const draw = () => {
      const q = inp.value;
      const r = runSearch(q);
      if (q.trim().length < 2) {
        cnt.textContent = q.trim() ? 'Type one more letter.' : '';
        res.innerHTML = `<div class="srch-try"><span class="muted">Try:</span>${SEARCH_TRY.map((w) => `<button type="button" class="srch-chip" data-try="${esc(w)}">${esc(w)}</button>`).join('')}</div>`;
        return;
      }
      cnt.innerHTML = r.hits.length ? `<b>${r.hits.length}</b> result${r.hits.length === 1 ? '' : 's'} for “${esc(q.trim())}”` : `No result for “${esc(q.trim())}”. Try a shorter word or another spelling (for example <i>timer</i> instead of <i>timers</i>).`;
      res.innerHTML = SEARCH_GROUPS.map(([type, name]) => {
        const g = r.hits.filter((x) => x.it.type === type);
        if (!g.length) return '';
        const lim = open[type] ? g.length : type === 'term' ? 4 : 5;
        return `<section class="srch-grp"><h2>${esc(name)} <span class="muted">${g.length}</span></h2><div class="srch-list">${g.slice(0, lim).map((x) => hitHtml(x.it, r.words)).join('')}</div>${g.length > lim ? `<button type="button" class="btn small srch-more" data-more="${type}">Show all ${g.length} ${esc(name.toLowerCase())}</button>` : ''}</section>`;
      }).join('');
    };
    let qt = 0;
    const setUrl = () => {
      const v = inp.value.trim();
      const hs = v ? 'search-' + encodeURIComponent(v) : 'search';
      if ('#' + hs === location.hash) return;
      current = hs;
      try { history.replaceState(history.state, '', '#' + hs); } catch (e) { /* file:// */ }
    };
    inp.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { Object.keys(open).forEach((k) => delete open[k]); draw(); setUrl(); }, 90); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = $('.srch-hit', res); if (a) { e.preventDefault(); a.click(); } } });
    res.addEventListener('click', (e) => {
      const t = e.target.closest('[data-try]'); if (t) { inp.value = t.dataset.try; draw(); setUrl(); inp.focus(); return; }
      const mo = e.target.closest('[data-more]'); if (mo) { open[mo.dataset.more] = 1; draw(); return; }
      const a = e.target.closest('.srch-hit'); if (!a) return;
      if (a.dataset.plant) { S.plant.lab = a.dataset.plant; labView = 'machine'; saveNow(); toast('Machine: ' + plantName(a.dataset.plant) + '. Your program is kept: press Clear for an empty editor, or ⓘ How it works for its working program.', { ms: 6500, top: true }); }
      if (a.dataset.term) glossQ = a.dataset.term;
    });
    inp.value = q0 || '';
    main().appendChild(el);
    draw();
    requestAnimationFrame(() => { try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); } });
  }

  // ───────────────────────── pages ─────────────────────────
  const main = () => $('#main');
  const lessonIdx = (id) => LL.LESSONS.findIndex((l) => l.id === id);
  const lessonNo = (l) => { const sameLvl = LL.LESSONS.filter((x) => x.level === l.level); return l.level + '.' + String(sameLvl.indexOf(l) + 1).padStart(2, '0'); };
  const countDone = () => ({ l: LL.LESSONS.filter((l) => S.lessons[l.id]).length, c: LL.CHALLENGES.filter((c) => S.ch[c.id]).length });

  // ───────────────────────── topics (js/topics.js) ─────────────────────────
  // Each topic element carries its colour as --tc; css/app.css mixes the icon stroke and tint from it.
  const TOPICS = LL.TOPICS || [];
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  // "8 lessons · 10 tasks · 2 machines": every part stays on one line, so a narrow card wraps only between parts
  const topicCounts = (T) => [[T.lessons.length, 'lesson'], [T.tasks.length, 'task'], [T.machines.length, 'machine']].filter(([n]) => n).map(([n, w]) => `<span class="nw">${plural(n, w)}</span>`).join(' · ');
  const topicDone = (T) => { const l = T.lessons.filter((id) => S.lessons[id]).length, c = T.tasks.filter((id) => S.ch[id]).length; return { l, c, n: l + c, of: T.lessons.length + T.tasks.length }; };
  const topicIc = (T, cls) => `<span class="tp-ic${cls ? ' ' + cls : ''}" aria-hidden="true">${T.icon}</span>`;
  // on: this chip's topic is the current page ('page'), or the topic a lesson was opened from ('true')
  const topicChip = (T, on) => `<a class="tp-chip${on ? ' on' : ''}" href="#topic-${T.id}" style="--tc:${T.color}"${on ? ` aria-current="${on === true ? 'page' : on}"` : ''}>${topicIc(T)}<span>${esc(T.title)}</span></a>`;
  // interactive widgets in a lesson body → small "▶ live example" chips on the topic page
  const lessonWidgets = (l) => {
    const b = l.body || '', n = (re) => (b.match(re) || []).length, out = [];
    const hw = n(/\[\[hw:\w+\]\]/g), comm = n(/\[\[comm:\w+\]\]/g), live = n(/\[\[sim:\w+\]\]/g) + n(/\[\[mem:explorer\]\]/g);
    if (hw) out.push(hw > 1 ? hw + ' simulators' : 'simulator');
    if (comm) out.push(comm > 1 ? comm + ' animations' : 'animation');
    if (live) out.push(live > 1 ? live + ' live examples' : 'live example');
    return out;
  };
  let labView = ''; // one-shot: the Lab opens on this view (phones show one pane at a time)

  function pageHome() {
    const d = countDone();
    const next = LL.LESSONS.find((l) => !S.lessons[l.id]) || LL.LESSONS[0];
    // "Explore by topic" sits in the hero grid: on phones (css) it comes before the live rung, so the topics are on the first screen
    const el = h(`<div class="wrap">
      <section class="hero">
        <div class="hero-t">
          <span class="plate">PLC · Ladder logic trainer</span>
          <h1>Learn ladder logic by <em>wiring it</em>, not memorising it.</h1>
          <p class="lead">${LL.LESSONS.length} short lessons from your first contact to whole-machine projects, a PLC simulator with ${LL.PLANT_ORDER.length} animated machines, and ${LL.CHALLENGES.length} challenges that test your program like a commissioning engineer would.</p>
          <div class="row">
            <a class="btn primary" href="#lesson-${next.id}">${d.l ? 'Continue: ' + esc(next.title) : 'Start lesson 1'} ${I.arrow}</a>
            <a class="btn" href="#lab">${I.lab} Open the Lab</a>
          </div>
        </div>
        <div class="card hero-demo"><div class="demo-cap"><span class="eyebrow">Try it now: tap START, then STOP</span></div><div class="demo"></div></div>
        ${TOPICS.length ? `<section class="tp-home" id="topics"><div class="sec-head"><div><h2>Explore by topic</h2><p>Pick a subject: every lesson, simulator, task, machine and quiz about it in one place.</p></div></div><div class="tp-grid"></div></section>` : ''}
      </section>
      <div class="sec-head"><div><h2>Your progress</h2><p>${d.l}/${LL.LESSONS.length} lessons · ${d.c}/${LL.CHALLENGES.length} challenges passed</p></div></div>
      <div class="grid levels-strip"></div>
      <div class="sec-head"><div><h2>Five ways to practise</h2><p>Mix them. Understanding comes from building and breaking things.</p></div></div>
      <div class="grid paths">
        <a class="card path" href="#learn"><span class="ic">${I.learn}</span><h3>Lessons</h3><p>What, why and where, each with live examples you can press.</p></a>
        <a class="card path" href="#lab"><span class="ic">${I.lab}</span><h3>Lab</h3><p>Draw rungs and drive a motor, tank, conveyor, elevator, mixer, sorter, filling line or the 3 cylinders from your video.</p></a>
        <a class="card path" href="#path"><span class="ic">${I.arrow}</span><h3>Guided path</h3><p>All tasks in the order to solve them, from your first contact to whole machines.</p></a>
        <a class="card path" href="#path-interview"><span class="ic">${I.arrow}</span><h3>Interview path</h3><p>The classic PLC interview tasks, in the order to prepare them.</p></a>
        <a class="card path" href="#challenges"><span class="ic">${I.target}</span><h3>Challenges</h3><p>Real tasks with automatic tests, hints and bug hunts.</p></a>
        <a class="card path" href="#quiz"><span class="ic">${I.quiz}</span><h3>Quiz</h3><p>Concept questions plus endless "predict the output" drills.</p></a>
      </div>
      <section class="card mp-home" aria-labelledby="mp-home-h">
        <span class="mp-home-ic" aria-hidden="true">${I.folder}</span>
        <div class="mp-home-t"><h2 id="mp-home-h">Keep your work safe</h2><p>Your progress and programs are saved only in this browser. If you clear the browser data, they are gone. Export a backup file now and then. Import it on another computer to continue there.</p></div>
        <div class="row mp-home-b"><button class="btn primary" data-bk="export">${I.download} Export my work</button><button class="btn" data-bk="import">${I.upload} Import</button><button class="btn" data-bk="my">${I.folder} My programs${S.saved.length ? ' (' + S.saved.length + ')' : ''}</button></div>
      </section>
    </div>`);
    main().appendChild(el);
    workBox(el);
    new MiniSim($('.demo', el), { program: 'RUNG Start/stop with seal-in\nNO(I0.3) | NO(I0.0) | COIL(Q0.0)\n. NO(Q0.0)', inputs: { 'I0.0': { name: 'START', kind: 'pb' }, 'I0.3': { name: 'STOP', kind: 'pbnc' } }, outputs: { 'Q0.0': 'Motor' } }, { label: 'Live rung', noOpen: true });
    const tg = $('.tp-grid', el);
    if (tg) TOPICS.forEach((T) => {
      const d = topicDone(T), pct = d.of ? Math.round((d.n / d.of) * 100) : 0;
      // .started: phones show the small progress line only on topics you have begun (no 22 empty bars for a newcomer)
      tg.appendChild(h(`<a class="card tp-card${d.n ? ' started' : ''}" href="#topic-${T.id}" style="--tc:${T.color}">
        <div class="tp-head">${topicIc(T)}<h3>${esc(T.title)}</h3></div>
        <p>${esc(T.blurb)}</p>
        <span class="tp-n">${topicCounts(T)}</span>
        <div class="tp-foot"><span class="meter" title="${d.n} of ${d.of} lessons and tasks done"><i style="width:${pct}%"></i></span><span class="tp-pct">${d.n}/${d.of}</span><span class="tp-go">Open ${I.arrow}</span></div>
      </a>`));
    });
    const strip = $('.levels-strip', el);
    LL.LEVELS.forEach((lv) => {
      const ls = LL.LESSONS.filter((l) => l.level === lv.n), dn = ls.filter((l) => S.lessons[l.id]).length;
      strip.appendChild(h(`<a class="card lvl" href="#learn"><span class="n">${lv.n}</span><h4>${esc(lv.name)}</h4><div class="meter"><i style="width:${Math.round((dn / ls.length) * 100)}%"></i></div><span class="muted" style="font-size:.82rem">${dn}/${ls.length} lessons</span></a>`));
    });
  }

  function pageLearn() {
    const el = h(`<div class="wrap"><span class="plate">Course</span><h1 style="margin:10px 0 6px">Lessons</h1><p class="muted" style="margin:0 0 26px;max-width:62ch">Work through the levels in order. Every lesson explains <b>what</b> an instruction is, <b>why</b> it exists and <b>where</b> it is used, with live examples. Then practise in the linked challenges.</p><a class="srch-learn" href="#search">${I.search}<span>Search lessons, tasks, machines and terms</span></a>${TOPICS.length ?`<div class="tp-pick"><div class="tp-pick-h"><h2>Or pick a topic</h2><a class="tp-all" href="#topics">All ${TOPICS.length} topics ${I.arrow}</a></div><div class="tp-strip tp-swipe">${TOPICS.map((T) => topicChip(T)).join('')}</div><p class="tp-swipe-hint" aria-hidden="true">Swipe for more topics →</p></div>` : ''}<div class="levels"></div><div class="sec-head"><div><h2>Reference</h2><p>Terms you'll hear on site, in plain words.</p></div><a class="btn" href="#glossary">${I.book} Open glossary</a></div></div>`);
    const lv = $('.levels', el);
    LL.LEVELS.forEach((L) => {
      const b = h(`<section class="level-block"><div class="level-head"><span class="big">${L.n}</span><div><h2>${esc(L.name)}</h2><p>${esc(L.sub)}</p></div></div><div class="lessons"></div></section>`);
      LL.LESSONS.filter((l) => l.level === L.n).forEach((l) => {
        $('.lessons', b).appendChild(h(`<a class="card lesson-card" href="#lesson-${l.id}"><span class="no">${lessonNo(l)}</span><span class="body"><h4>${esc(l.title)}</h4><p>${esc(l.summary)}</p></span><span class="check ${S.lessons[l.id] ? 'done' : ''}">${S.lessons[l.id] ? I.check : ''}</span></a>`));
      });
      lv.appendChild(b);
    });
    main().appendChild(el);
    swipeStrip($('.tp-swipe', el));
  }
  // phones: the topic strip scrolls sideways; its right edge fades until you reach the end
  function swipeStrip(s) {
    if (!s) return;
    const upd = () => s.classList.toggle('at-end', s.scrollLeft + s.clientWidth >= s.scrollWidth - 4);
    s.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  // tid: the topic the learner came from (#lesson-<id>~<topic>). Then Back / Next follow that topic's
  // order and the last lesson leads back to the topic page; otherwise the course order.
  function pageLesson(id, tid) {
    const i = lessonIdx(id);
    if (i < 0) return pageLearn();
    const l = LL.LESSONS[i];
    const T = own(LL.TOPIC_BY_ID, tid) && LL.TOPIC_BY_ID[tid].lessons.includes(l.id) ? LL.TOPIC_BY_ID[tid] : null;
    const seq = T ? T.lessons.map((x) => LL.LESSONS[lessonIdx(x)]).filter(Boolean) : LL.LESSONS;
    const k = seq.indexOf(l), prev = seq[k - 1], next = seq[k + 1];
    const lhref = (x) => '#lesson-' + x.id + (T ? '~' + T.id : '');
    const lvl = LL.LEVELS[l.level - 1];
    const tps = LL.topicsOfLesson ? LL.topicsOfLesson(l.id) : [];
    const nextNote = T ? `<p class="tp-next">${next ? `Next in <b>${esc(T.title)}</b>: ${esc(next.title)}` : `Last lesson in <b>${esc(T.title)}</b>. The button takes you back to the topic and its tasks.`}</p>` : '';
    let body = l.body.replace(/\[\[sim:(\w+)\]\]/g, (m, k) => `<div class="sim-ph" data-sim="${k}"></div>`).replace(/\[\[mem:explorer\]\]/g, '<div class="mem-ph"></div>').replace(/\[\[brands:table\]\]/g, () => LL.brandTableHTML()).replace(/\[\[comm:(\w+)\]\]/g, (m, k) => `<div class="comm-ph" data-comm="${k}"></div>`).replace(/\[\[hw:(\w+)\]\]/g, (m, k) => `<div class="hw-ph" data-hw="${k}"></div>`);
    const el = h(`<div class="wrap"><div class="lesson">
      <article>
        ${T ? `<a class="btn small ghost" href="#topic-${T.id}">${I.back} ${esc(T.title)}</a>` : `<a class="btn small ghost" href="#learn">${I.back} All lessons</a>`}
        <div class="eyebrow" style="margin-top:14px">${T ? `${esc(T.title)}: step ${k + 1} of ${seq.length} · ` : ''}Lesson ${lessonNo(l)} · Level ${l.level}: ${esc(lvl.name)} · ${l.min} min</div>
        <h1>${esc(l.title)}</h1>
        ${tps.length ? `<div class="tp-chips tp-lesson"><span class="tp-lbl">Topic${tps.length > 1 ? 's' : ''}</span>${tps.map((X) => topicChip(X, T && X.id === T.id ? 'true' : false)).join('')}</div>` : ''}
        <p class="sum">${esc(l.summary)}</p>
        <div class="prose">${body}</div>
        <div class="lesson-nav">
          ${prev ? `<a class="btn" href="${lhref(prev)}">${I.back} ${esc(prev.title)}</a>` : '<span></span>'}
          <button class="btn go" data-done>${S.lessons[l.id] ? 'Completed ✓' : 'Mark complete'}${next ? ' & continue' : T ? ' & back to the topic' : ''}</button>
        </div>
        ${nextNote}
      </article>
      <aside><div class="card">
        <h4>Remember</h4><ul>${l.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${l.mistakes && l.mistakes.length ? `<h4>Common mistakes</h4><ul>${l.mistakes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${l.challenges.length ? '<h4>Practise</h4>' + l.challenges.map((c) => { const ch = LL.CH_BY_ID[c]; return `<a class="ch-link" href="#ch-${c}">${I.target}<span>${esc(ch.title)}</span>${S.ch[c] ? '<span class="chip ok">passed</span>' : ''}</a>`; }).join('') : ''}
        <a class="ch-link" href="#lab">${I.lab}<span>Free play in the Lab</span></a>
      </div></aside>
    </div></div>`);
    main().appendChild(el);
    $$('.mem-ph', el).forEach((ph) => memExplorer(ph));
    if (LL.commMount) LL.commMount(el);
    $$('.hw-ph', el).forEach((ph) => { const f = LL.HW && LL.HW[ph.dataset.hw]; if (f) f(ph); });
    $$('.sim-ph', el).forEach((ph) => { const spec = l.sims[ph.dataset.sim]; if (spec) new MiniSim(ph, Object.assign({ name: l.title }, spec)); });
    $$('[data-open]', el).forEach((o) => {
      const spec = LL.OPEN_PROGRAMS[o.dataset.open];
      const b = h(`<button class="btn primary">${I.lab} Open the video circuit${spec.lang === 'st' ? ' (ST)' : ''} in the Lab</button>`);
      b.onclick = () => labReplace({ lang: spec.lang === 'st' ? 'st' : 'ld', text: spec.program, plant: spec.plant, name: progName(spec.lang === 'st' ? 'st' : 'ld', spec.program) });
      o.appendChild(b);
    });
    $('[data-done]', el).onclick = () => {
      S.lessons[l.id] = 1; save();
      if (next) location.hash = lhref(next).slice(1);
      else if (T) { toast('All lessons of ' + T.title + ' done. Now try its tasks.', { ms: 4000 }); location.hash = 'topic-' + T.id; }
      else { toast('Course complete. Well done!'); location.hash = 'learn'; }
    };
  }

  // one topic: its lessons, tasks, Lab machines and quiz questions in one place
  function pageTopic(id) {
    if (!own(LL.TOPIC_BY_ID, id)) return pageHome();
    const T = LL.TOPIC_BY_ID[id];
    const lessons = T.lessons.map((x) => LL.LESSONS[lessonIdx(x)]).filter(Boolean);
    const tasks = T.tasks.filter((x) => own(LL.CH_BY_ID, x)).map((x) => LL.CH_BY_ID[x]);
    const machines = T.machines.filter((x) => own(LL.Plants, x));
    const quiz = (T.quiz || []).filter((q) => own(BANKS, q.mode));
    const d = topicDone(T), pct = d.of ? Math.round((d.n / d.of) * 100) : 0;
    // lessons opened from here carry the topic (#lesson-<id>~<topic>): "Mark complete & continue" then stays in this topic
    const lhref = (l) => '#lesson-' + l.id + '~' + T.id;
    // the next step: the first lesson, then the next lesson not done, then the next task not passed
    const startL = LL.LESSONS[lessonIdx(T.start)];
    const nextL = startL && !S.lessons[startL.id] ? startL : lessons.find((l) => !S.lessons[l.id]);
    const nextC = tasks.find((c) => !S.ch[c.id]);
    const go = nextL ? `<a class="btn primary" href="${lhref(nextL)}">${nextL === startL ? 'Start here' : 'Continue'}: ${esc(nextL.title)} ${I.arrow}</a>`
      : nextC ? `<a class="btn primary" href="#ch-${nextC.id}">Next task: ${esc(nextC.title)} ${I.arrow}</a>`
      : '<span class="chip ok">✓ All done in this topic. Well done!</span>';
    const P = T.path && own(LL.PATH_BY_ID, T.path.id) ? LL.PATH_BY_ID[T.path.id] : null;
    const pathBtn = P ? `<a class="btn" href="#path-${P.id}">${esc(T.path.label || P.title)} ${I.arrow}</a>` : '';
    const prog = [lessons.length ? `<b>${d.l}/${lessons.length}</b> lessons` : '', tasks.length ? `<b>${d.c}/${tasks.length}</b> tasks` : ''].filter(Boolean).join(' · ');
    // the sections, and the jump buttons, in page order; a topic can show its quiz first
    // (interview: the questions are what people look for there)
    const SEC = {
      lessons: ['Lessons', 'Lessons', 'Read them in this order. Some have a simulator or an animation you can try.', lessons.length],
      tasks: ['Tasks', 'Tasks', `Tasks with a machine and automatic tests. <b>${d.c}/${tasks.length}</b> passed.`, tasks.length],
      machines: ['Machines', 'Machines in the Lab', 'Free play: open a machine and try your own program.', machines.length],
      quiz: ['Quiz', 'Quiz', 'Check what you know: up to 10 questions per round.', quiz.length],
    };
    const order = (T.quizFirst ? ['quiz', 'lessons', 'tasks', 'machines'] : ['lessons', 'tasks', 'machines', 'quiz']).filter((k) => SEC[k][3]);
    const sec = (k) => `<section class="tp-sec" id="tp-${k}"><div class="sec-head"><div><h2>${SEC[k][1]}</h2><p>${SEC[k][2]}</p></div></div><div class="tp-${k}"></div></section>`;
    // no number on the Quiz pill: its buttons count questions, not quiz buttons
    const jump = (k) => `<button type="button" data-jump="tp-${k}">${SEC[k][0]}${k === 'quiz' ? '' : ` <span>${SEC[k][3]}</span>`}</button>`;
    const el = h(`<div class="wrap tp-page" style="--tc:${T.color}">
      <a class="btn small ghost" href="#topics">${I.back} All topics</a>
      <header class="card tp-hero">
        ${topicIc(T, 'big')}
        <div class="tp-hero-t">
          <span class="eyebrow">Topic · ${topicCounts(T)}</span>
          <h1>${esc(T.title)}</h1>
          <p>${esc(T.intro)}</p>
          <div class="tp-hero-go">${go}${pathBtn}${prog ? `<div class="tp-prog"><span>${prog} done</span><div class="meter"><i style="width:${pct}%"></i></div></div>` : ''}</div>
        </div>
      </header>
      ${order.length > 1 ? `<div class="filters tp-jump" role="group" aria-label="Jump to">${order.map(jump).join('')}</div>` : ''}
      ${order.map(sec).join('')}
      <section class="tp-sec tp-others"><div class="sec-head"><div><h2>Other topics</h2><p>Jump to another subject.</p></div></div><div class="tp-strip">${TOPICS.map((X) => topicChip(X, X.id === T.id)).join('')}</div></section>
    </div>`);
    // lesson cards: the big number is the step in this topic (1, 2, 3…); the course number is small text
    lessons.forEach((l, k) => {
      const w = lessonWidgets(l);
      $('.tp-lessons', el).appendChild(h(`<a class="card lesson-card" href="${lhref(l)}"><span class="no tp-step" title="Step ${k + 1} in this topic">${k + 1}</span><span class="body"><span class="tp-lno">Lesson ${lessonNo(l)} · ${l.min} min</span><h4>${esc(l.title)}</h4><p>${esc(l.summary)}</p>${w.length ? `<span class="tp-ws">${w.map((x) => `<span class="tp-w">${I.play}${esc(x)}</span>`).join('')}</span>` : ''}</span><span class="check ${S.lessons[l.id] ? 'done' : ''}">${S.lessons[l.id] ? I.check : ''}</span></a>`));
    });
    tasks.forEach((c) => {
      const t = chKind(c), plain = c.brief.replace(/<[^>]+>/g, '');
      // kind chips (no chip when the title already says it, or starts with its icon)
      const tags = [t.st ? 'ST' : '', t.bug && !/bug hunt|^🐞/i.test(c.title) ? '🐞 bug hunt' : '', c.kind === 'diagnose' && !/fault finding|^🔧/i.test(c.title) ? '🔧 fault finding' : ''].filter(Boolean).map((x) => `<span class="chip">${x}</span>`).join('');
      const state = S.ch[c.id] ? '<span class="chip ok">✓ passed</span>' : S.chTried[c.id] ? '<span class="chip">in progress</span>' : '';
      $('.tp-tasks', el).appendChild(h(`<a class="card ch-card tp-task" href="#ch-${c.id}"><div class="top-line"><span class="eyebrow">Level ${c.level} · ${esc(LL.Plants[c.plant].name)}</span>${state}</div><h4>${esc(c.title)}</h4><p>${esc(plain.length > 140 ? plain.slice(0, 138) + '…' : plain)}</p>${tags ? `<div class="tp-tags">${tags}</div>` : ''}</a>`));
    });
    const mbox = $('.tp-machines', el);
    machines.forEach((pid) => {
      // count only the tasks on this page: that is where the learner looks for them
      const M = LL.Plants[pid], n = tasks.filter((c) => c.plant === pid).length;
      const a = h(`<a class="card tp-mach" href="#lab"><h4>${esc(M.name)}</h4><p>${esc(M.blurb || '')}</p><div class="tp-mfoot"><span class="muted">${n ? 'Used in ' + plural(n, 'task') + ' here' : 'Free play'}</span><span class="btn small">${I.lab} Open in the Lab</span></div></a>`);
      // same as picking the machine in the Lab's machine list: your program is kept, so say it with the Lab's words
      a.onclick = () => { S.plant.lab = pid; labView = 'machine'; saveNow(); toast('Machine: ' + M.name + '. Your program is kept: press Clear for an empty editor, or ⓘ How it works for its working program.', { ms: 6500, top: true }); };
      mbox.appendChild(a);
    });
    // phones (css): the first 4 machines, then a "Show all" button
    if (machines.length > 4) {
      mbox.classList.add('cut');
      const more = h(`<button type="button" class="btn small tp-more">Show all ${machines.length} machines</button>`);
      more.onclick = () => { mbox.classList.remove('cut'); more.remove(); };
      mbox.after(more);
    }
    // quiz buttons: preselect the level / topic in that quiz bank, like its filter buttons do
    const QNAME = { concept: 'Concept check', iv: 'Interview questions', net: 'Industrial networks' };
    [...new Set(quiz.map((q) => q.mode))].forEach((mode) => {
      const B = BANKS[mode], items = quiz.filter((q) => q.mode === mode);
      const label = (q) => (mode === 'concept' ? 'Level ' + q.sel + (LL.LEVELS[q.sel - 1] ? ': ' + LL.LEVELS[q.sel - 1].name : '') : String(q.sel));
      const nq = (q) => B.list().filter((x) => String(x[B.by]) === String(q.sel)).length;
      const g = h(`<div class="card tp-qg${items.length > 3 ? ' wide' : ''}"><div class="tp-qh">${I.quiz}<b>${QNAME[mode]}</b></div><div class="tp-qb">${items.map((q) => `<button type="button" class="btn small" data-qs="${esc(String(q.sel))}">${esc(label(q))} <span class="tp-qn">· ${plural(nq(q), 'question')}</span></button>`).join('')}</div></div>`);
      $$('[data-qs]', g).forEach((b) => (b.onclick = () => { S.quiz[B.sel] = b.dataset.qs; saveNow(); location.hash = 'quiz-' + mode; }));
      $('.tp-quiz', el).appendChild(g);
    });
    $$('[data-jump]', el).forEach((b) => (b.onclick = () => {
      const s = document.getElementById(b.dataset.jump);
      if (s) s.scrollIntoView({ behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));
    main().appendChild(el);
  }

  function pathState(P) {
    const done = P.all.filter((id) => S.ch[id]).length;
    const next = P.all.find((id) => !S.ch[id]);
    return { done, next: next && LL.CH_BY_ID[next] };
  }
  function pagePath(pid) {
    const P = own(LL.PATH_BY_ID, pid) ? LL.PATH_BY_ID[pid] : LL.PATHS[0];
    S.path = P.id; save();
    const ps = pathState(P);
    const pct = Math.round((ps.done / P.all.length) * 100);
    const el = h(`<div class="wrap"><span class="plate">Guided path</span><h1 style="margin:10px 0 6px">${esc(P.title)}</h1>
      <p class="muted" style="margin:0 0 14px;max-width:66ch">${esc(P.blurb)}</p>
      <div class="filters" role="group" aria-label="Path">${LL.PATHS.map((x) => `<a class="${x.id === P.id ? 'on' : ''}" href="#path-${x.id}">${esc(x.short)} <span>${x.all.filter((id) => S.ch[id]).length}/${x.all.length}</span></a>`).join('')}</div>
      <div class="card path-now"><div class="path-prog"><span><b>${ps.done}/${P.all.length}</b> solved</span><div class="meter"><i style="width:${pct}%"></i></div></div>
        ${ps.next ? `<a class="btn primary" href="#ch-${ps.next.id}">${ps.done ? 'Continue' : 'Start'}: ${esc(ps.next.title)} ${I.arrow}</a>` : '<span class="chip ok">✓ Path complete. Impressive!</span>'}</div>
      <div class="stages"></div></div>`);
    let n = 0;
    P.stages.forEach((stg, k) => {
      const sd = stg.ids.filter((id) => S.ch[id]).length;
      const b = h(`<section class="level-block path-stage"><div class="level-head"><span class="big">${k + 1}</span><div><h2>${esc(stg.title)}</h2><p>${esc(stg.sub)} · ${sd}/${stg.ids.length} solved</p></div></div>
        <div class="read-first">${stg.lessons.filter((l) => lessonIdx(l) >= 0).map((l) => { const L = LL.LESSONS[lessonIdx(l)]; return `<a class="chip" href="#lesson-${l}">${I.learn} ${esc(L.title)}${S.lessons[l] ? ' ✓' : ''}</a>`; }).join('')}</div>
        <ol class="pathlist"></ol></section>`);
      stg.ids.forEach((id) => {
        const c = LL.CH_BY_ID[id]; n++;
        if (!c) return;
        const isNext = ps.next && ps.next.id === id;
        $('.pathlist', b).appendChild(h(`<li class="${S.ch[id] ? 'done' : ''} ${isNext ? 'next' : ''}"><a href="#ch-${id}"><span class="pn">${S.ch[id] ? '✓' : n}</span><span class="pt"><b>${esc(c.title)}</b><span>${c.lang === 'st' ? 'ST · ' : ''}${esc(LL.Plants[c.plant].name)}</span></span>${isNext ? '<span class="chip">next</span>' : S.chTried[id] && !S.ch[id] ? '<span class="chip">in progress</span>' : ''}</a></li>`));
      });
      $('.stages', el).appendChild(b);
    });
    main().appendChild(el);
  }

  // interactive bit / byte / word explorer (Siemens layout: MW10 = MB10 high byte + MB11 low byte)
  function memExplorer(host) {
    const bits = new Array(16).fill(0);    // index 0..7 = M10.7..M10.0, 8..15 = M11.7..M11.0
    const el = h(`<div class="card memx"><div class="memx-head"><span class="eyebrow">Memory explorer · tap the bits</span><span class="row"><button class="btn small" data-x="clr">all 0</button><button class="btn small" data-x="inc">+1</button><button class="btn small" data-x="shl">SHL</button></span></div>
      <div class="memx-bytes">${[10, 11].map((b, bi) => `<div class="memx-byte"><div class="memx-lbl">MB${b} ${bi ? '(low byte)' : '(high byte)'}</div><div class="memx-bits">${[7, 6, 5, 4, 3, 2, 1, 0].map((k) => `<button class="memx-bit" data-i="${bi * 8 + (7 - k)}"><b>0</b><small>M${b}.${k}</small><i>${1 << k}</i></button>`).join('')}</div><div class="memx-val" data-b="${bi}"></div></div>`).join('')}</div>
      <div class="memx-word"></div></div>`);
    host.replaceWith(el);
    const draw = () => {
      $$('.memx-bit', el).forEach((b) => { const v = bits[+b.dataset.i]; b.classList.toggle('on', !!v); b.querySelector('b').textContent = v; });
      const byte = (bi) => bits.slice(bi * 8, bi * 8 + 8).reduce((a, v) => a * 2 + v, 0);
      [0, 1].forEach((bi) => { const v = byte(bi); $(`[data-b="${bi}"]`, el).innerHTML = `= <b>${v}</b> · 16#${v.toString(16).toUpperCase().padStart(2, '0')}`; });
      const w = byte(0) * 256 + byte(1), si = w > 32767 ? w - 65536 : w;
      $('.memx-word', el).innerHTML = `<b>MW10</b> = MB10 × 256 + MB11 = <b>${w}</b> as WORD · <b>${si}</b> as INT · 16#${w.toString(16).toUpperCase().padStart(4, '0')}<br><span class="muted">binary ${bits.slice(0, 8).join('')} ${bits.slice(8).join('')}</span>`;
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.memx-bit'); if (b) { const i = +b.dataset.i; bits[i] = bits[i] ? 0 : 1; draw(); return; }
      const x = e.target.closest('[data-x]'); if (!x) return;
      let w = bits.reduce((a, v) => a * 2 + v, 0);
      if (x.dataset.x === 'clr') w = 0; if (x.dataset.x === 'inc') w = (w + 1) & 0xffff; if (x.dataset.x === 'shl') w = (w << 1) & 0xffff;
      for (let i = 15; i >= 0; i--) { bits[i] = w & 1; w >>= 1; }
      draw();
    });
    draw();
  }

  const chKind = (c) => ({ st: c.lang === 'st', bug: /^(bug-|fix-|st-bug)/.test(c.id), project: c.level === 6 });
  function pageChallenges() {
    const total = LL.CHALLENGES.length, passed = LL.CHALLENGES.filter((c) => S.ch[c.id]).length;
    const el = h(`<div class="wrap"><span class="plate">Practice</span><h1 style="margin:10px 0 6px">Challenges &amp; exercises</h1><p class="muted" style="margin:0 0 14px;max-width:64ch">Each task gives you a machine and a job. Build the program, try it by hand, then press <b>Run tests</b>: the checker presses buttons, waits and checks the outputs like a commissioning engineer. Stuck? Hints first, solution last. <b>${passed}/${total}</b> passed.</p>
      <div class="path-banner">${LL.PATHS.map((P) => { const ps = pathState(P); return `<a class="card" href="#path-${P.id}"><span class="eyebrow">Guided path</span><b>${esc(P.title)}</b><div class="meter"><i style="width:${Math.round((ps.done / P.all.length) * 100)}%"></i></div><span class="muted">${ps.done}/${P.all.length} · ${ps.next ? 'next: ' + esc(ps.next.title) : 'complete'}</span></a>`; }).join('')}</div>
      <div class="filters" role="group" aria-label="Filter"></div><div class="lv"></div></div>`);
    const F = [['all', 'All'], ['ld', 'Ladder'], ['st', 'Structured Text'], ['bug', '🐞 Bug hunts'], ['project', 'Projects'], ['todo', 'Not passed yet']];
    const cur = S.chFilter || 'all';
    const fl = $('.filters', el);
    F.forEach(([k, l]) => {
      const n = LL.CHALLENGES.filter((c) => match(c, k)).length;
      const b = h(`<button class="${k === cur ? 'on' : ''}">${l} <span>${n}</span></button>`);
      b.onclick = () => { S.chFilter = k; save(); main().innerHTML = ''; pageChallenges(); };
      fl.appendChild(b);
    });
    function match(c, k) { const t = chKind(c); return k === 'all' || (k === 'ld' && !t.st) || (k === 'st' && t.st) || (k === 'bug' && t.bug) || (k === 'project' && t.project) || (k === 'todo' && !S.ch[c.id]); }
    LL.LEVELS.forEach((L) => {
      const list = LL.CHALLENGES.filter((c) => c.level === L.n && match(c, cur));
      if (!list.length) return;
      const b = h(`<section class="level-block"><div class="level-head"><span class="big">${L.n}</span><div><h2>${esc(L.name)}</h2><p>${list.length} task${list.length > 1 ? 's' : ''}</p></div></div><div class="ch-grid"></div></section>`);
      list.forEach((c) => {
        const plain = c.brief.replace(/<[^>]+>/g, '');
        const t = chKind(c);
        $('.ch-grid', b).appendChild(h(`<a class="card ch-card" href="#ch-${c.id}"><div class="top-line"><span class="eyebrow">${t.st ? 'ST · ' : ''}${esc(LL.Plants[c.plant].name)}</span>${S.ch[c.id] ? '<span class="chip ok">✓ passed</span>' : S.chTried[c.id] ? '<span class="chip">in progress</span>' : t.bug ? '<span class="chip">bug hunt</span>' : ''}</div><h4>${esc(c.title)}</h4><p>${esc(plain.length > 130 ? plain.slice(0, 128) + '…' : plain)}</p></a>`));
      });
      $('.lv', el).appendChild(b);
    });
    if (!$('.lv', el).children.length) $('.lv', el).innerHTML = '<p class="muted">Nothing here. All passed? Try another filter.</p>';
    main().appendChild(el);
  }

  function pageGlossary() {
    const el = h(`<div class="wrap"><span class="plate">Reference</span><h1 style="margin:10px 0 14px">Glossary</h1><input class="gl-search" id="gl-q" type="search" placeholder="Search ${LL.GLOSSARY.length} terms: seal-in, TON, PNP…" aria-label="Search glossary"><div class="gl-list"></div></div>`);
    const list = $('.gl-list', el);
    const draw = (q) => {
      q = (q || '').toLowerCase();
      list.innerHTML = LL.GLOSSARY.filter(([t, d]) => !q || t.toLowerCase().includes(q) || d.toLowerCase().includes(q))
        .map(([t, d]) => `<div class="card gl-item"><h4>${esc(t)}</h4><p>${esc(d)}</p></div>`).join('') || '<p class="muted">No match. Try a shorter word.</p>';
    };
    $('#gl-q', el).addEventListener('input', (e) => draw(e.target.value));
    if (glossQ) $('#gl-q', el).value = glossQ; // from a search result
    draw(glossQ); glossQ = '';
    main().appendChild(el);
  }

  // ───────────────────────── quiz ─────────────────────────
  function pageQuiz(start) {
    const el = h(`<div class="wrap quiz-wrap"><span class="plate">Drill</span><h1 style="margin:10px 0 6px">Quiz</h1><p class="muted" style="margin:0 0 20px">Short sessions, often. That's how it sticks.</p><div class="grid modes"></div><div class="qarea" style="margin-top:20px"></div></div>`);
    const modes = $('.modes', el);
    const area = $('.qarea', el);
    [['predict', 'Predict the output', 'Random rungs and input states. Will the lamp light? Endless.', 'Best streak ' + (S.quiz.predictBest || 0)],
      ['drill', 'Timer & counter drill', 'TON, TOF, TP, RTO, CTU, CTD scenarios. Endless.', 'Best streak ' + (S.quiz.drillBest || 0)],
      ['concept', 'Concept check', LL.QUIZ.length + ' questions, 10 per round, pick a level.', 'Best score ' + (S.quiz.best || 0) + '/10'],
      ['iv', 'Interview questions', (LL.QUIZ_IV || []).length + ' questions asked in PLC job interviews, by topic, with a model answer.', 'Best score ' + (S.quiz.ivBest || 0) + '/10'],
      ['net', 'Industrial networks', (LL.QUIZ_NET || []).length + ' questions: how it works, RS-232 / RS-485, Modbus, PROFIBUS, CAN / CANopen / DeviceNet, LIN, AS-i, HART, IO-Link, PROFINET, EtherNet/IP, EtherCAT, OPC UA, MQTT, safety, troubleshooting.', 'Best score ' + (S.quiz.netBest || 0) + '/10']].forEach(([k, t, d, s]) => {
      const b = h(`<button class="card path" style="text-align:left;cursor:pointer"><span class="ic">${k === 'predict' ? I.lab : k === 'drill' ? I.reset : I.quiz}</span><h3>${t}</h3><p>${d}</p><span class="chip">${s}</span></button>`);
      b.onclick = () => (k === 'predict' ? predict(area) : k === 'drill' ? drill(area) : concept(area, k));
      modes.appendChild(b);
    });
    main().appendChild(el);
    if (start === 'iv' || start === 'net' || start === 'concept') concept(area, start); else predict(area);
  }

  // question banks: the concept bank is filtered by level, the interview and network banks by topic
  const BANKS = {
    concept: { list: () => LL.QUIZ, by: 'l', all: 'All levels', vals: () => [1, 2, 3, 4, 5, 6, 7], name: (v) => 'Level ' + v, sel: 'lvl', best: 'best', tag: (q) => 'Level ' + q.l, more: 'Re-read the lessons behind the ones you missed.' },
    iv: { list: () => LL.QUIZ_IV || [], by: 't', all: 'All topics', vals: () => [...new Set((LL.QUIZ_IV || []).map((q) => q.t))], name: (v) => v, sel: 'ivT', best: 'ivBest', tag: (q) => 'Interview · ' + q.t, more: 'In an interview, say the answer in your own words and add one example from a machine.' },
    net: { list: () => LL.QUIZ_NET || [], by: 't', all: 'All topics', vals: () => [...new Set((LL.QUIZ_NET || []).map((q) => q.t))], name: (v) => v, sel: 'netT', best: 'netBest', tag: (q) => 'Networks · ' + q.t, more: 'The lesson "Networks: PLCs that talk to each other" shows how the data reaches your program.' },
  };
  function concept(area, mode) {
    mode = BANKS[mode] ? mode : 'concept';
    const B = BANKS[mode], all = B.list();
    // "My mistakes": every wrongly answered question is kept (by its text) until it is answered right
    S.quiz.miss = S.quiz.miss || {};
    const miss = new Set(S.quiz.miss[mode] || []);
    const keepMiss = () => { S.quiz.miss[mode] = [...miss]; save(); };
    let sel = S.quiz[B.sel] || 'all';
    if (sel === 'miss' && !all.some((q) => miss.has(q.q))) sel = 'all';
    const match = (q, v) => v === 'all' || (v === 'miss' ? miss.has(q.q) : String(q[B.by]) === String(v));
    const pool = all.filter((q) => match(q, sel));
    const qs = (pool.length ? pool : all).slice().sort(() => Math.random() - 0.5).slice(0, 10).map((q) => {
      // shuffle the answer options so the right one is not always in the same place
      const order = q.a.map((_, i) => i).sort(() => Math.random() - 0.5);
      return Object.assign({}, q, { a: order.map((i) => q.a[i]), c: order.indexOf(q.c) });
    });
    const nMiss = () => all.filter((q) => miss.has(q.q)).length;
    const lvlBar = () => `<div class="filters" style="margin:0">${['all', ...B.vals()].map((L) => `<button data-lvl="${esc(String(L))}" class="${String(L) === String(sel) ? 'on' : ''}">${L === 'all' ? B.all : esc(B.name(L))} <span>${all.filter((q) => match(q, L)).length}</span></button>`).join('')}${nMiss() ? `<button data-lvl="miss" class="miss ${sel === 'miss' ? 'on' : ''}" title="Questions you answered wrong. They leave this list when you answer them right.">↻ My mistakes <span>${nMiss()}</span></button>` : ''}</div>`;
    const bindLvl = () => $$('[data-lvl]', area).forEach((b) => (b.onclick = () => { S.quiz[B.sel] = b.dataset.lvl; save(); concept(area, mode); }));
    let i = 0, score = 0;
    const show = () => {
      if (i >= qs.length) {
        S.quiz[B.best] = Math.max(S.quiz[B.best] || 0, score); save();
        area.innerHTML = `<div class="card qcard"><span class="eyebrow">Result</span><h2>${score} / ${qs.length}</h2><p class="muted">${score >= 8 ? 'Excellent. You can explain this to someone else now.' : (score >= 5 ? 'Good. ' : 'Keep going. ') + B.more}</p><div class="row"><button class="btn primary" data-again>Another round</button></div></div>`;
        $('[data-again]', area).onclick = () => concept(area, mode);
        if (nMiss()) { const mb = h(`<button class="btn" data-missb>↻ Repeat my mistakes (${nMiss()})</button>`); mb.onclick = () => { S.quiz[B.sel] = 'miss'; save(); concept(area, mode); }; $('[data-again]', area).after(mb); }
        return;
      }
      const q = qs[i];
      area.innerHTML = lvlBar() + `<div class="card qcard" style="margin-top:12px"><div class="row" style="justify-content:space-between"><span class="eyebrow">Question ${i + 1}/${qs.length} · ${esc(B.tag(q))}</span><span class="scorebar">Score <b>${score}</b></span></div><h2>${esc(q.q)}</h2><div class="opts">${q.a.map((a, k) => `<button class="opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span>${esc(a)}</button>`).join('')}</div><div class="fb"></div></div>`;
      bindLvl();
      $$('.opt', area).forEach((b) => (b.onclick = () => {
        if (area.dataset.lock) return;
        area.dataset.lock = 1;
        const k = +b.dataset.k, ok = k === q.c;
        if (ok) score++;
        const wasMiss = miss.has(q.q);
        if (ok) miss.delete(q.q); else miss.add(q.q);
        keepMiss();
        b.classList.add(ok ? 'right' : 'wrong');
        $$('.opt', area)[q.c].classList.add('right');
        const note = ok && wasMiss ? ' <span class="chip ok">removed from your mistakes</span>' : !ok ? ' <span class="chip">added to "My mistakes": it will come back</span>' : '';
        $('.fb', area).innerHTML = `<div class="why"><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${esc(q.why)}${note}</div><div class="row" style="margin-top:12px"><button class="btn primary" data-n>${i + 1 < qs.length ? 'Next' : 'See result'} ${I.arrow}</button></div>`;
        $('[data-n]', area).onclick = () => { delete area.dataset.lock; i++; show(); };
      }));
    };
    delete area.dataset.lock;
    show();
  }

  function genDrill() {
    const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const t = r(0, 8);
    const onoff = (on) => (on ? 0 : 1);
    switch (t) {
      case 0: { const pt = r(2, 6), on = r(1, 8); return { tag: 'TON', q: `TON with PT = ${pt} s. Its input has been ON for ${on} s without interruption. Is the output (done bit) ON?`, a: ['ON', 'OFF'], c: onoff(on >= pt), why: `A TON turns on after its input has been on continuously for PT: ${on} s ${on >= pt ? '≥' : '<'} ${pt} s.` }; }
      case 1: { const pt = r(4, 6), a = r(1, pt - 1), off = r(1, 3), b = r(1, pt - 1); return { tag: 'TON', q: `TON with PT = ${pt} s. Input ON for ${a} s, OFF for ${off} s, then ON again for ${b} s. Is the output ON now?`, a: ['ON', 'OFF'], c: 1, why: `A TON restarts from zero every time its input goes off, so only the last ${b} s count (${b} s < ${pt} s).` }; }
      case 2: { const pt = r(4, 7), a = r(1, pt - 1), off = r(1, 3), b = r(1, pt); return { tag: 'RTO', q: `Retentive timer RTO with PT = ${pt} s. Input ON for ${a} s, OFF for ${off} s, then ON again for ${b} s. Is the output ON now?`, a: ['ON', 'OFF'], c: onoff(a + b >= pt), why: `An RTO keeps its time while the input is off: ${a} + ${b} = ${a + b} s ${a + b >= pt ? '≥' : '<'} ${pt} s.` }; }
      case 3: { const pt = r(3, 8), ago = r(1, 10); return { tag: 'TOF', q: `TOF with PT = ${pt} s. Its input was ON and switched OFF ${ago} s ago. Is the output still ON?`, a: ['ON', 'OFF'], c: onoff(ago < pt), why: `A TOF stays on for PT after the input goes off: ${ago} s ${ago < pt ? '<' : '≥'} ${pt} s.` }; }
      case 4: { const pt = r(2, 5), hold = r(1, 8), x = r(1, 8); const on = x < pt; return { tag: 'TP', q: `Pulse timer TP with PT = ${pt} s. A button is pressed and held for ${hold} s. ${x} s after the press, is the output ON?`, a: ['ON', 'OFF'], c: onoff(on), why: `A TP gives exactly PT = ${pt} s from the rising edge, however long the button is held: ${x} s ${on ? '<' : '≥'} ${pt} s.` }; }
      case 5: { const n = r(3, 8), k = r(1, 10); return { tag: 'CTU', q: `CTU with PV = ${n}. The input has had ${k} rising edges since the last reset. Is the done bit ON?`, a: ['ON', 'OFF'], c: onoff(k >= n), why: `CTU is done when CV ≥ PV: CV = ${k}, PV = ${n}.` }; }
      case 6: { const n = r(3, 8), k = r(1, n + 2); const ans = String(n - k); const opts = [...new Set([ans, String(n + k), String(k), String(n), String(n - k - 1)])].slice(0, 4).sort(() => Math.random() - 0.5); return { tag: 'CTD', q: `CTD with PV = ${n}, freshly loaded (reset). After ${k} pulses, what is CV?`, a: opts, c: opts.indexOf(ans), why: `CTD starts at PV and counts down: ${n} − ${k} = ${n - k}. Done when CV ≤ 0.` }; }
      case 7: { const s = r(2, 5); const opts = ['1', String(s * 100), String(s), '0'].sort(() => Math.random() - 0.5); return { tag: 'CTU', q: `A CTU input is held ON for ${s} s (scan time 10 ms). How much does CV increase?`, a: opts, c: opts.indexOf('1'), why: 'Counters count rising edges, not scans: one press = +1.' }; }
      default: { const pt = r(2, 6), x = r(1, 9); const on = x < pt; return { tag: 'TOF', q: `Fan overrun: TOF with PT = ${pt} s fed by the light switch. The switch went off ${x} s ago. Is the fan running?`, a: ['Running', 'Stopped'], c: onoff(on), why: `Off-delay: the fan stops PT = ${pt} s after the switch goes off.` }; }
    }
  }
  function drill(area) {
    let streak = 0;
    const show = () => {
      const g = genDrill();
      area.innerHTML = `<div class="card qcard"><div class="row" style="justify-content:space-between"><span class="eyebrow">Timer & counter drill · ${g.tag}</span><span class="scorebar">Streak <b>${streak}</b> · Best <b>${S.quiz.drillBest || 0}</b></span></div><h2>${esc(g.q)}</h2><div class="opts">${g.a.map((a, k) => `<button class="opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span>${esc(a)}</button>`).join('')}</div><div class="fb"></div></div>`;
      $$('.opt', area).forEach((b) => (b.onclick = () => {
        if (area.dataset.lock) return; area.dataset.lock = 1;
        const ok = +b.dataset.k === g.c;
        streak = ok ? streak + 1 : 0;
        S.quiz.drillBest = Math.max(S.quiz.drillBest || 0, streak); save();
        b.classList.add(ok ? 'right' : 'wrong'); $$('.opt', area)[g.c].classList.add('right');
        $('.fb', area).innerHTML = `<div class="why"><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${esc(g.why)}</div><div class="row" style="margin-top:12px"><button class="btn primary" data-n>Next ${I.arrow}</button></div>`;
        $('[data-n]', area).onclick = () => { delete area.dataset.lock; show(); };
      }));
    };
    delete area.dataset.lock;
    show();
  }

  function genPredict() {
    const X = () => (Math.random() < 0.65 ? 'NO' : 'NC');
    const names = ['A', 'B', 'C', 'D'];
    const addr = ['I0.0', 'I0.1', 'I0.2', 'I0.3'];
    const t = Math.floor(Math.random() * 6);
    const c = (k) => X() + '(' + addr[k] + ')';
    let rows;
    switch (t) {
      case 0: rows = [c(0) + ' ' + c(1) + ' COIL(Q0.0)']; break;
      case 1: rows = [c(0) + ' | COIL(Q0.0)', c(1)]; break;
      case 2: rows = [c(0) + ' | ' + c(1) + ' | COIL(Q0.0)', '. ' + c(2)]; break;
      case 3: rows = [c(0) + ' | ' + c(2) + ' COIL(Q0.0)', c(1)]; break;
      case 4: rows = [c(0) + ' ' + c(1) + ' | COIL(Q0.0)', c(2) + ' -']; break;
      default: rows = [c(0) + ' | ' + c(1) + ' ' + c(3) + ' | COIL(Q0.0)', '. ' + c(2) + ' -']; break;
    }
    const n = t >= 5 ? 4 : t >= 2 ? 3 : 2;
    const tags = {}; for (let k = 0; k < n; k++) tags[addr[k]] = names[k];
    tags['Q0.0'] = 'Lamp';
    const ins = {}; for (let k = 0; k < n; k++) ins[addr[k]] = Math.random() < 0.5 ? 1 : 0;
    const prog = compactParse('RUNG\n' + rows.join('\n'));
    const m = new LL.Machine(prog);
    m.setInputs(ins); m.scan(10);
    return { prog, tags, ins, m, ans: m.bit('Q0.0'), n, addr, names };
  }

  function predict(area) {
    let streak = S.quiz.predict || 0;
    const show = () => {
      const g = genPredict();
      area.innerHTML = `<div class="card qcard"><div class="row" style="justify-content:space-between"><span class="eyebrow">Predict the output</span><span class="scorebar">Streak <b>${streak}</b> · Best <b>${S.quiz.predictBest || 0}</b></span></div>
        <h2>With these inputs, is the lamp ON or OFF?</h2>
        <div class="predict-ins">${g.addr.slice(0, g.n).map((a, k) => `<span class="val ${g.ins[a] ? 'one' : ''}">${g.names[k]} = ${a} = <b>${g.ins[a]}</b></span>`).join('')}</div>
        <div class="ladder-host card" style="padding:6px;overflow-x:auto"></div>
        <div class="row"><button class="btn" data-v="1" style="flex:1">Lamp ON</button><button class="btn" data-v="0" style="flex:1">Lamp OFF</button></div><div class="fb"></div></div>`;
      const view = new LL.LadderView($('.ladder-host', area), { fit: true });
      view.setProgram(g.prog, g.tags);
      view.update(g.m, false);
      $$('[data-v]', area).forEach((b) => (b.onclick = () => {
        if (area.dataset.lock) return; area.dataset.lock = 1;
        const ok = +b.dataset.v === g.ans;
        streak = ok ? streak + 1 : 0;
        S.quiz.predict = streak; S.quiz.predictBest = Math.max(S.quiz.predictBest || 0, streak); save();
        if (ok) b.classList.add('go');
        view.update(g.m, true);
        const st = LL.toST(Object.assign(g.prog, { tags: g.tags, name: 'Quiz' })).split('\n').filter((l) => /:=/.test(l)).join('\n');
        $('.fb', area).innerHTML = `<div class="why"><b>${ok ? 'Correct!' : 'Not this time.'}</b> The lamp is <b>${g.ans ? 'ON' : 'OFF'}</b>. Green shows where power can flow. Remember: NO passes on 1, NC passes on 0.<pre class="code" style="margin:8px 0 0;font-family:var(--f-mono);font-size:.85rem;white-space:pre-wrap">${esc(st)}</pre></div><div class="row" style="margin-top:12px"><button class="btn primary" data-n>Next rung ${I.arrow}</button></div>`;
        $('[data-n]', area).onclick = () => { delete area.dataset.lock; show(); };
      }));
    };
    delete area.dataset.lock;
    show();
  }

  // ───────────────────────── the Lab ─────────────────────────
  const TOOL_GROUPS = [
    [['select', 'Select'], ['erase', 'Erase'], ['link', 'Branch']],
    [['NO', '-| |-'], ['NC', '-|/|-'], ['P', 'P edge'], ['N', 'N edge'], ['CMP', 'Compare'], ['LIM', 'In range'], ['WIRE', 'Wire'], ['NOT', 'NOT']],
    [['COIL', '( )'], ['SET', '(S)'], ['RST', '(R)'], ['NCOIL', '(/)']],
    [['TON', 'TON'], ['TOF', 'TOF'], ['TP', 'TP'], ['RTO', 'RTO'], ['CTU', 'CTU'], ['CTD', 'CTD']],
    [['MOV', 'MOV'], ['ADD', 'ADD'], ['SUB', 'SUB'], ['MUL', 'MUL'], ['DIV', 'DIV'], ['MOD', 'MOD']],
    [['SHRB', 'SHRB'], ['SHL', 'SHL'], ['SHR', 'SHR']],
    [['WAND', 'W AND'], ['WOR', 'W OR'], ['WXOR', 'W XOR'], ['WNOT', 'W NOT'], ['I_BCD', 'INT→BCD'], ['BCD_I', 'BCD→INT']],
    [['CONV', 'CONV'], ['ROUND', 'ROUND'], ['TRUNC', 'TRUNC'], ['NORM_X', 'NORM_X'], ['SCALE_X', 'SCALE_X']],
    [['SMOV', 'S MOV'], ['CONCAT', 'CONCAT'], ['ITOS', 'INT→STR'], ['SMID', 'MID']],
    [['CALL', 'CALL block'], ['PID', 'PID']],
    [['MC_POWER', 'MC Power'], ['MC_HOME', 'MC Home'], ['MC_ABS', 'Move abs'], ['MC_REL', 'Move rel'], ['MC_JOG', 'MC Jog'], ['MC_STOP', 'MC Stop'], ['MC_RESET', 'MC Reset'], ['MC_SETPOS', 'Set pos']],
  ];
  function toolIcon(k) {
    const s = 'stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"';
    switch (k) {
      case 'select': return `<svg viewBox="0 0 30 22"><path d="M10 3l10 8-5 1 3 6-2 1-3-6-3 4z" fill="currentColor"/></svg>`;
      case 'erase': return `<svg viewBox="0 0 30 22" ${s}><path d="M8 6l14 10M22 6L8 16"/></svg>`;
      case 'link': return `<svg viewBox="0 0 30 22" ${s}><path d="M2 5h26M15 5v12M2 17h13"/><circle cx="15" cy="5" r="2" fill="currentColor"/></svg>`;
      case 'NO': return `<svg viewBox="0 0 30 22" ${s}><path d="M1 11h10M19 11h10M11 4v14M19 4v14"/></svg>`;
      case 'NC': return `<svg viewBox="0 0 30 22" ${s}><path d="M1 11h10M19 11h10M11 4v14M19 4v14M8 18l14-14"/></svg>`;
      case 'P': case 'N': return `<svg viewBox="0 0 30 22" ${s}><path d="M1 11h9M20 11h9M10 4v14M20 4v14"/><text x="15" y="15" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="monospace">${k}</text></svg>`;
      case 'CMP': return `<svg viewBox="0 0 30 22" ${s}><rect x="5" y="4" width="20" height="14" rx="2"/><text x="15" y="15" font-size="9" text-anchor="middle" fill="currentColor" stroke="none" font-family="monospace">≥</text></svg>`;
      case 'WIRE': return `<svg viewBox="0 0 30 22" ${s}><path d="M2 11h26"/></svg>`;
      case 'LIM': return `<svg viewBox="0 0 30 22" ${s}><rect x="4" y="4" width="22" height="14" rx="2"/><path d="M9 14v-6M21 14v-6"/><circle cx="15" cy="11" r="1.8" fill="currentColor"/></svg>`;
      case 'NOT': return `<svg viewBox="0 0 30 22" ${s}><rect x="4" y="5" width="22" height="12" rx="2"/><text x="15" y="14.5" font-size="7" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="monospace">NOT</text></svg>`;
      case 'COIL': case 'SET': case 'RST': case 'NCOIL': {
        const l = { SET: 'S', RST: 'R', NCOIL: '/' }[k] || '';
        return `<svg viewBox="0 0 30 22" ${s}><path d="M1 11h7M22 11h7M11 3a9 9 0 0 0 0 16M19 3a9 9 0 0 1 0 16"/>${l ? `<text x="15" y="15" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="monospace">${l}</text>` : ''}</svg>`;
      }
      default: return `<svg viewBox="0 0 30 22" ${s}><rect x="3" y="3" width="24" height="16" rx="3"/><path d="M3 8h24"/></svg>`;
    }
  }
  const BIT_TYPES = ['NO', 'NC', 'P', 'N', 'COIL', 'NCOIL', 'SET', 'RST'];

  class Lab {
    constructor(opts) {
      this.opts = opts;
      this.ch = opts.challenge || null;
      this.key = this.ch ? 'ch:' + this.ch.id : 'lab';
      const text = S.programs[this.key] || (this.ch ? (this.ch.starter || 'NAME ' + this.ch.title + '\nRUNG\n') : LL.OPEN_PROGRAMS.video.program);
      try { this.prog = LL.parseProgram(text); } catch (e) { this.prog = LL.parseProgram('RUNG\n'); }
      if (this.ch && !S.programs[this.key]) this.prog.name = this.ch.title;
      if (!this.prog.rungs.length) this.prog.rungs.push(LL.emptyRung(this.prog.cols));
      this.plantId = this.ch ? this.ch.plant : S.plant.lab || (S.programs.lab ? 'panel' : 'cylinders');
      this.lang = this.ch ? this.ch.lang || 'ld' : S.lang.lab || 'ld';
      if (this.lang === 'st') this.src = S.st[this.key] != null ? S.st[this.key] : this.ch && this.ch.starter ? this.ch.starter : this.stTemplate();
      this.tool = 'select';
      this.sel = null;
      this.hist = [LL.programToText(this.prog)]; this.hi = 0;
      this.running = true;
      this.speed = 1;
      this.acc = 0;
      this.view = 'program';
      this.hint = 0;
      this.build();
      this.newMachine();
      tickers.add(this);
      if (!this.ch) {
        labNow = this;
        // opened by a replacement (lesson example, My programs…): offer Undo; Ladder also gets it on ↶
        const u = labUndo; labUndo = null;
        if (u && u.lang === this.lang) { if (u.lang === 'ld') { this.hist = [normProg('ld', u.text), this.hist[0]]; this.hi = 1; } this.offerUndo(u); }
      }
    }

    // replace the free Lab's program in place (callers: labPut; the guard has already asked)
    loadProgram(lang, text, plant) {
      if (plant && own(LL.Plants, plant) && plant !== this.plantId) { this.plantId = plant; S.plant.lab = plant; const ps = $('#plant-sel', this.el); if (ps) ps.value = plant; }
      if (lang === 'st') { this.src = text; S.st[this.key] = text; saveNow(); $('#st-src', this.el).value = text; this._gutter(); this.newMachine(); return; }
      let p; try { p = LL.parseProgram(text); } catch (e) { p = LL.parseProgram('RUNG\n'); }
      if (!p.rungs.length) p.rungs.push(LL.emptyRung(p.cols));
      this.prog = p; this.sel = null; this.blk = null; this.newMachine(); this.commit();
    }
    // "Your old program was replaced. [Undo]" (it goes away when you hide it or leave the Lab)
    offerUndo(u) {
      const old = $('.mp-undo', this.el); if (old) old.remove();
      const bar = h(`<div class="mp-undo" role="status"><span class="mp-undo-ic" aria-hidden="true">${I.undo}</span><span class="mp-undo-t">Your old program <b>${esc(progName(u.lang, u.text))}</b> was replaced.</span><button type="button" class="btn small" data-u>Undo</button><button type="button" class="iconbtn" data-ux aria-label="Hide this message">✕</button></div>`);
      $('[data-ux]', bar).onclick = () => bar.remove();
      $('[data-u]', bar).onclick = () => {
        bar.remove();
        // unchanged since the replacement: straight back; changed: the guard asks again (nothing is lost)
        if (normProg(u.lang, labText(u.lang)) === u.after) labPut(u.lang, u.text, u.plant, null, 'Your old program is back.');
        else labReplace({ lang: u.lang, text: u.text, plant: u.plant, name: progName(u.lang, u.text), msg: 'Your old program is back.' });
      };
      $('.fault-host', this.el).before(bar);
    }

    get plant() { return LL.Plants[this.plantId]; }
    tags() { return Object.assign({}, LL.plantTags(this.plantId), (this.ch && this.ch.tags) || {}, this.prog.tags || {}); }

    stTemplate() {
      return 'PROGRAM PLC_PRG\n' + LL.stIoDecls(this.plant, Object.assign({}, LL.plantTags(this.plantId), (this.ch && this.ch.tags) || {})) + '\n\n(* Write your logic here *)\n\nEND_PROGRAM\n';
    }
    newMachine() {
      if (this.lang === 'st') this.stProg = LL.compileST(this.src, this.ch ? this.ch.title : 'ST program');
      this.m = this.lang === 'st' ? LL.makeMachine(this.stProg) : new LL.Machine(this.prog);
      this.pst = this.initPlant();
      this.ctrl = this.ctrl || {};
      this.I = LL.plantDevices(this.plant, this.ctrl);
      this.buildDevices();
      this.refresh();
      if (this.lang === 'st' && $('.st-status', this.el)) this.compile(true);
    }

    build() {
      const ch = this.ch;
      const st = this.lang === 'st';
      const el = h(`<div class="wrap"><div class="lab" data-lang="${this.lang}" data-view="${ch ? 'task' : 'program'}">
        <div class="lab-main">
          <div class="seg" role="tablist">${ch ? '<button data-v="task">Task</button>' : ''}<button data-v="program">Program</button><button data-v="machine">Machine</button></div>
          <div class="card lab-bar">
            <span class="title" title="${esc(this.prog.name)}">${ch ? '' : st ? 'Structured Text' : esc(this.prog.name)}</span>
            ${ch ? (st ? '<span class="chip">ST</span>' : '') : `<span class="langsw" role="group" aria-label="Language"><button class="${st ? '' : 'on'}" data-a="lang-ld">Ladder</button><button class="${st ? 'on' : ''}" data-a="lang-st">ST</button></span>`}
            <button class="btn small runbtn" data-a="run"></button>
            <button class="btn small" data-a="step" title="Execute one scan phase">${I.step}<span class="hide-s">Step</span></button>
            <button class="btn small" data-a="reset" title="Reset PLC memory and machine">${I.reset}</button>
            <button class="btn small" data-a="speed" title="Simulation speed">1×</button>
            <button class="btn small ld-only" data-a="zoom" title="Zoom: fit width or 100 %">⤢</button>
            <span class="sep"></span>
            <button class="btn small ld-only" data-a="undo" title="Undo">${I.undo}</button>
            <button class="btn small ld-only" data-a="redo" title="Redo">${I.redo}</button>
            <button class="btn small ld-only" data-a="brands" title="This ladder in TIA Portal, Studio 5000, Schneider, TwinCAT, Omron and as Structured Text">${I.code} Other brands</button>
            <button class="btn small" data-a="clear" title="Empty the editor">${I.trash}<span class="hide-s">Clear</span></button>
            <button class="btn small" data-a="file" title="New, examples, import/export">${I.file} File</button>
            ${ch ? '' : `<button class="btn small" data-a="myprogs" title="My programs: save, load, download and back up your programs">${I.folder}<span class="hide-s">My programs</span></button>`}
            <span class="scanstate"></span>
          </div>
          <div class="fault-host"></div>
          <div class="blk-bar ld-only"></div>
          <div class="card prog-card only-program ld-only"><div class="prog-scroll"><div class="ladder-host"></div></div><div class="palette"></div></div>
          <div class="card inspector only-program ld-only"></div>
          <div class="card issues only-program ld-only" hidden></div>
          <div class="card st-card only-program st-only">
            <div class="st-wrap"><pre class="st-gutter" aria-hidden="true"></pre><textarea class="st-ed" id="st-src" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Structured Text program"></textarea></div>
            <div class="keybar">${[':=', ';', '(', ')', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE', 'IF  THEN\n\nEND_IF', 'ELSE', 'CASE  OF\n\nEND_CASE', 'FOR i := 1 TO 10 DO\n\nEND_FOR', 'WHILE  DO\n\nEND_WHILE', 'T#1s', '(*  *)'].map((k) => `<button type="button" data-k="${esc(k)}">${esc(k.split('\n')[0].replace('  ', ' … '))}</button>`).join('')}</div>
            <div class="st-status"></div>
          </div>
        </div>
        <div class="lab-side">
          ${ch ? '<div class="card chal only-task"></div>' : ''}
          <div class="card machine only-machine">
            <div class="machine-head"><span class="eyebrow">Machine</span>${ch ? `<b>${esc(this.plant.name)}</b>` : `<select id="plant-sel" aria-label="Machine">${LL.PLANT_ORDER.map((p) => `<option value="${p}">${esc(LL.Plants[p].name)}</option>`).join('')}</select>`}<button class="btn small how-btn" data-a="how" title="How this machine works and its working program">ⓘ How it works</button></div>
            <canvas width="640" height="360" aria-label="Machine animation"></canvas>
            <p class="blurb"></p>
            <div class="dock desktop-only"></div>
          </div>
          <details class="card details-card only-machine" open><summary>I/O &amp; values</summary><table class="iotable live-io"></table></details>
        </div>
        <div class="dock dock-sticky mobile-only"></div>
      </div></div>`);
      main().appendChild(el);
      this.el = el;
      this.root = $('.lab', el);
      // mobile-only / desktop-only helpers
      const style = document.getElementById('lab-mq') || document.head.appendChild(h('<style id="lab-mq">.mobile-only{display:none!important}@media(max-width:1000px){.mobile-only{display:flex!important}.desktop-only{display:none!important}}.hide-s{margin-left:2px}@media(max-width:520px){.hide-s{display:none}}</style>'));
      void style;
      if (st) this.setupEditor();
      this.ladder = new LL.LadderView($('.ladder-host', el), { editable: true, zoom: window.innerWidth < 700 ? 'fit' : undefined, onPick: (p) => this.pick(p) });
      this.canvas = $('canvas', el);
      this.ctx = this.canvas.getContext('2d');
      // touch buttons drawn on a machine's HMI screen
      const hmiAt = (e) => { const r = this.canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * 640 / r.width, y = (e.clientY - r.top) * 360 / r.height; const hb = typeof this.plant.hmiButtons === 'function' ? this.plant.hmiButtons(this.pst, this.I || {}) : this.plant.hmiButtons || []; return hb.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); };
      const fieldAt = (e) => { if (!this.plant.hmiFields) return null; const r = this.canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * 640 / r.width, y = (e.clientY - r.top) * 360 / r.height; return this.plant.hmiFields.find((f) => x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h); };
      this.canvas.addEventListener('pointerdown', (e) => {
        const f = fieldAt(e); if (!f) return; e.preventDefault();
        modal('HMI: ' + f.label, `<div class="field"><label for="hmiv">${esc(f.label)}${f.unit ? ' (' + esc(f.unit) + ')' : ''} → ${f.addr}</label><input id="hmiv" type="number" inputmode="numeric" value="${this.m.word(f.addr)}"></div><p class="muted" style="font-size:.85rem;margin:0">The touch panel writes the number straight into the PLC word ${f.addr}, as a real HMI does.</p>`, [{ label: 'Cancel' }, { label: 'Write', cls: 'primary', run: (mm) => { const v = Math.round(+$('#hmiv', mm).value); if (isNaN(v)) return false; this.m.setWord(f.addr, v); toast(f.addr + ' = ' + v); } }]);
        setTimeout(() => { const i = document.getElementById('hmiv'); if (i) { i.focus(); i.select(); } }, 50);
      });
      this.canvas.addEventListener('pointermove', (e) => { if (fieldAt(e)) this.canvas.style.cursor = 'pointer'; });
      this.canvas.addEventListener('pointerdown', (e) => { const b = hmiAt(e); if (!b) return; e.preventDefault(); this._hmi = { addr: b.addr, t: performance.now() }; this.ctrl[b.addr] = true; });
      const hmiUp = () => { const h2 = this._hmi; if (!h2) return; this._hmi = null; setTimeout(() => { this.ctrl[h2.addr] = false; }, Math.max(0, 150 - (performance.now() - h2.t))); };
      this.canvas.addEventListener('pointerup', hmiUp); this.canvas.addEventListener('pointerleave', hmiUp); this.canvas.addEventListener('pointercancel', hmiUp);
      this.canvas.addEventListener('pointermove', (e) => { this.canvas.style.cursor = hmiAt(e) ? 'pointer' : ''; });
      // palette
      const pal = $('.palette', el);
      TOOL_GROUPS.forEach((g) => {
        const grp = h('<div class="grp"></div>');
        g.forEach(([k, lab]) => {
          const b = h(`<button class="tool" data-tool="${k}" title="${esc((LL.ELEMENT_INFO[k] || [lab])[0])}">${toolIcon(k)}<span>${esc(lab)}</span></button>`);
          b.onclick = () => this.setTool(k);
          grp.appendChild(b);
        });
        pal.appendChild(grp);
      });
      this.setTool('select');
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b && el.contains(b)) this.action(b.dataset.a, b); });
      $$('.seg button', el).forEach((b) => (b.onclick = () => this.setView(b.dataset.v)));
      this.setView(ch ? 'task' : labView || 'program');
      labView = '';
      const ps = $('#plant-sel', el);
      if (ps) { ps.value = this.plantId; ps.onchange = () => { this.plantId = ps.value; S.plant.lab = ps.value; save(); this.newMachine(); toast('Machine: ' + this.plant.name + '. Your program is kept: press Clear for an empty editor, or ⓘ How it works for its working program.'); }; }
      if (ch) this.renderTask();
      this.updateRunBtn();
      this.resizeCanvas();
      if (st) this.compile(true);
      this._onResize = () => { this.resizeCanvas(); this.ladder.fit(); };
      window.addEventListener('resize', this._onResize);
    }

    setupEditor() {
      const ta = $('#st-src', this.el), gut = $('.st-gutter', this.el);
      ta.value = this.src;
      const lines = () => { const n = ta.value.split('\n').length; let g = ''; const bad = this.stProg && !this.stProg.ok ? this.stProg.error.line : -1; for (let i = 1; i <= n; i++) g += (i === bad ? '<b>' + i + '</b>' : i) + '\n'; gut.innerHTML = g; gut.scrollTop = ta.scrollTop; };
      this._gutter = lines;
      ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
      ta.addEventListener('input', () => { this.src = ta.value; S.st[this.key] = this.src; if (this.ch) S.chTried[this.ch.id] = 1; saveNow(); lines(); clearTimeout(this._ct); this._ct = setTimeout(() => this.compile(), 350); });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); }
        if (e.key === 'Enter') { const before = ta.value.slice(0, ta.selectionStart); const ind = (/(^|\n)([ \t]*)[^\n]*$/.exec(before) || [])[2] || ''; if (ind) { e.preventDefault(); ta.setRangeText('\n' + ind, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } }
      });
      $$('.keybar button', this.el).forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.k.replace(/\\n/g, '\n');
        const start = ta.selectionStart;
        ta.focus();
        ta.setRangeText(k, start, ta.selectionEnd, 'end');
        const gap = k.indexOf('  ');
        if (gap >= 0) { ta.selectionStart = ta.selectionEnd = start + gap + 1; }
        ta.dispatchEvent(new Event('input'));
      }));
      lines();
    }
    compile(initial) {
      const p = LL.compileST(this.src, this.ch ? this.ch.title : 'ST program');
      const status = $('.st-status', this.el);
      if (p.ok) {
        this.stProg = p;
        this.m = LL.makeMachine(p);
        const nv = p.ast.order.length;
        status.className = 'st-status ok';
        status.textContent = '✓ Compiled: ' + p.lines + ' lines, ' + nv + ' variable' + (nv === 1 ? '' : 's') + '. PLC restarted with the new program.';
        if (!initial) this.notice('Compiled · PLC restarted');
      } else {
        this.stProg = p.ok ? p : this.stProg && this.stProg.ok ? Object.assign({}, this.stProg, { pendingError: p.error }) : p;
        if (!this.m || !this.stProg.ok) this.m = LL.makeMachine(p);
        status.className = 'st-status bad';
        status.textContent = 'Line ' + p.error.line + ': ' + p.error.msg + (this.stProg.ok ? '  (the last good program keeps running)' : '');
        this._errLine = p.error.line;
      }
      this._lastCompile = p;
      if (this._gutter) {
        const gut = $('.st-gutter', this.el), ta = $('#st-src', this.el);
        const n = ta.value.split('\n').length; let g = ''; for (let i = 1; i <= n; i++) g += (!p.ok && i === p.error.line ? '<b>' + i + '</b>' : i) + '\n'; gut.innerHTML = g; gut.scrollTop = ta.scrollTop;
      }
    }
    setView(v) {
      this.view = v;
      this.root.dataset.view = v;
      $$('.seg button', this.el).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      if (v !== 'task') setTimeout(() => { this.resizeCanvas(); this.ladder.fit(); }, 0);
    }

    resizeCanvas() {
      const w = this.canvas.clientWidth || 600;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(w * 360 / 640 * dpr);
      this.cscale = (w * dpr) / 640;
    }

    buildDevices() {
      const devs = this.plant.inputs.filter((d) => d.kind !== 'sensor' && d.kind !== 'hmi');
      const tags = this.tags();
      this.devButtons = [];
      $$('.dock', this.el).forEach((dock) => {
        dock.innerHTML = '';
        devs.filter((d) => !d.group).forEach((d) => { const b = deviceEl(Object.assign({}, d, { name: d.kind === 'sel3' ? d.name : tags[d.addr] || d.name }), this.ctrl); dock.appendChild(b); this.devButtons.push(b); });
        [...new Set(devs.filter((d) => d.group).map((d) => d.group))].forEach((g) => {
          const title = (this.plant.groups && this.plant.groups[g]) || (g === 'hmi' ? 'HMI touch keys' : g);
          const det = h(`<details class="hmikeys"><summary>${esc(title)}</summary><div class="hmikeys-in"></div></details>`);
          devs.filter((d) => d.group === g).forEach((d) => { const b = deviceEl(Object.assign({}, d, { name: tags[d.addr] || d.name }), this.ctrl); $('.hmikeys-in', det).appendChild(b); this.devButtons.push(b); });
          dock.appendChild(det);
        });
        this.plant.actions.forEach((a) => {
          const b = h(`<button class="dev act" type="button"><span class="lbl">${esc(a.label)}<span class="sub">${a.toggle ? 'toggle' : 'event'}</span></span></button>`);
          b.onclick = () => { a.run(this.pst); if (a.toggle) $$('.dev.act', this.el).filter((x) => x.textContent.startsWith(a.label)).forEach((x) => x.classList.toggle('down')); };
          dock.appendChild(b);
        });
        const lamps = h('<div class="lamps"></div>');
        this.plant.outputs.filter((o) => /^Q/.test(o.addr)).forEach((o) => lamps.appendChild(lampEl(o.addr, tags[o.addr] || o.name)));
        dock.appendChild(lamps);
      });
      this.lampEls = $$('.dock .lamp', this.el);
      $('.blurb', this.el).textContent = this.plant.blurb;
      // IO table
      const rows = this.plant.inputs.flatMap((d) => d.kind === 'sel3' ? [d.addr, d.addr2].map((a, k) => `<tr><td>${a}</td><td>${esc(d.name)} ${k ? 'AUTO' : 'MANUAL'}<span class="kind">selector position</span></td><td data-io="${a}">0</td></tr>`) : [`<tr><td>${d.addr}</td><td>${esc(tags[d.addr] || d.name)}<span class="kind">${d.kind === 'pbnc' ? 'button, wired NC' : d.kind === 'pb' ? 'button, NO' : d.kind === 'sw' ? 'switch' : d.kind === 'hmi' ? 'HMI touch button (writes the M bit)' : d.kind === 'hmiw' ? 'HMI number field (tap it on the screen)' : 'sensor'}</span>${d.note ? `<div class="kind" style="margin:0">${esc(d.note)}</div>` : ''}</td><td data-io="${d.addr}">0</td></tr>`])
        .concat(this.plant.outputs.map((o) => `<tr><td>${o.addr}</td><td>${esc(tags[o.addr] || o.name)}<span class="kind">output</span></td><td data-io="${o.addr}">0</td></tr>`));
      $('.live-io', this.el).innerHTML = `<tr class="force-head"><td colspan="4"><span class="muted" style="font-size:.78rem">Tap <b>F</b> to force a bit: ON → OFF → normal. Forcing overrides the program or the field, like a real programming tool. On a real machine: only with the danger area clear.</span></td></tr>` + rows.join('') + '<tbody class="valrows"></tbody>';
      this.ioCells = $$('[data-io]', this.el);
      this.ioCells.forEach((c) => {
        const a = c.dataset.io;
        if (!/^[IQ]\d+\.\d$/.test(a)) return;
        const fb = h(`<button class="frc" type="button" title="Force ${a}">F</button>`);
        c.parentNode.appendChild(h('<td class="frc-td"></td>')).appendChild(fb);
        fb.onclick = () => {
          this.forces = this.forces || {};
          const cur = this.forces[a];
          if (cur === undefined) this.forces[a] = 1; else if (cur === 1) this.forces[a] = 0; else delete this.forces[a];
          const v = this.forces[a];
          fb.textContent = v === undefined ? 'F' : 'F' + v; fb.classList.toggle('on', v !== undefined);
          c.parentNode.classList.toggle('forced', v !== undefined);
          const n = Object.keys(this.forces).length;
          toast(v === undefined ? a + ' back to normal' + (n ? ' · ' + n + ' force(s) still active' : '') : a + ' forced ' + (v ? 'ON' : 'OFF'));
        };
      });
    }

    setTool(k) {
      this.tool = k;
      $$('.tool', this.el).forEach((b) => b.classList.toggle('on', b.dataset.tool === k));
    }

    // ── editing target: the main program or the open block ──
    get E() {
      const b = this.blk && (this.prog.blocks || []).find((x) => x.name === this.blk);
      if (!b) { this.blk = null; return this.prog; }
      return { rungs: b.rungs, cols: this.prog.cols, name: b.name, tags: this.prog.tags, blocks: this.prog.blocks, _blk: b };
    }
    blockVars() {
      const b = this.E._blk; if (!b) return [];
      const out = b.params.map((pp) => ['#' + pp.name, pp.dir + ' ' + pp.type]);
      const seen = new Set(out.map((x) => x[0]));
      b.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (!c) return; ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { const v = c[k]; if (typeof v === 'string' && v[0] === '#') { const base = v.split('.')[0]; if (!seen.has(base)) { seen.add(base); out.push([base, 'static']); } } }); })));
      return out;
    }
    renderBlockBar() {
      const bar = $('.blk-bar', this.el); if (!bar) return;
      const blocks = this.prog.blocks || [];
      const cur = this.E._blk;
      const BR = LL.BRANDS[S.brand] || LL.BRANDS.ll; LL.brand = S.brand || 'll';
      const kindOf = (b) => (b.kind === 'FC' ? 'FC' : 'FB');
      LL.blockKinds = {}; blocks.forEach((b) => (LL.blockKinds[b.name] = kindOf(b)));
      let html = `<div class="blk-tabs"><button class="${cur || this.dbSel != null ? '' : 'on'}" data-blk="">Main program</button>${blocks.map((b) => `<button class="${cur && cur.name === b.name ? 'on' : ''}" data-blk="${esc(b.name)}">${esc(b.name)} <small class="blk-kind">${esc(BR[kindOf(b) === 'FC' ? 'fc' : 'fb'])}</small></button>`).join('')}<button data-blk-new title="Create a reusable block">+ Block</button>${(this.prog.dbs || []).map((d) => `<button class="${this.dbSel === d.num ? 'on' : ''}" data-db="${d.num}">DB${d.num} ${esc(d.name)} <small class="blk-kind">DB</small></button>`).join('')}<button data-db-new title="Create a data block: named values, arrays, recipes">+ DB</button><label class="blk-brand muted">Names as <select data-brand>${Object.keys(LL.BRANDS).map((k) => `<option value="${k}" ${k === (S.brand || 'll') ? 'selected' : ''}>${esc(LL.BRANDS[k].name)}</option>`).join('')}</select></label></div>`;
      if (cur && this.dbSel == null) {
        const insts = [];
        const scan = (rungs, pre) => rungs.forEach((r, ri) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'CALL' && c.block === cur.name) insts.push(kindOf(cur) === 'FC' ? { key: pre + cur.name + '@' + c.id, label: 'call in rung ' + (ri + 1) } : { key: pre + c.inst, label: c.inst }); })));
        scan(this.prog.rungs, '');
        blocks.forEach((b) => { if (b !== cur) { const outer = []; scan.call(null, [], ''); void outer; } });
        if (!this.monInst || !insts.some((i) => i.key === this.monInst)) this.monInst = insts[0] ? insts[0].key : '';
        const isFC = kindOf(cur) === 'FC';
        html += `<div class="card blk-iface"><div class="row" style="justify-content:space-between;gap:8px"><span class="eyebrow">${esc(BR.name)} · ${esc(isFC ? BR.fcLong : BR.fbLong)}</span><span class="row" style="gap:6px">${insts.length ? `<label class="muted" style="font-size:.8rem">Monitor <select data-mon>${insts.map((i) => `<option value="${esc(i.key)}" ${i.key === this.monInst ? 'selected' : ''}>${esc(i.label)}</option>`).join('')}</select></label>` : '<span class="muted" style="font-size:.8rem">not called yet: add CALL ' + esc(cur.name) + ' in the main program</span>'}<button class="btn small" data-blk-del style="color:var(--danger)">Delete block</button></span></div>
          <div class="blk-row"><label>Kind <select data-bkind><option value="FB" ${isFC ? '' : 'selected'}>${esc(BR.fb)} (with memory)</option><option value="FC" ${isFC ? 'selected' : ''}>${esc(BR.fc)} (no memory)</option></select></label><label>Name <input data-bname value="${esc(cur.name)}" class="mono"></label><label style="flex:1">Comment <input data-bcom value="${esc(cur.comment || '')}" placeholder="what the block does"></label></div>
          <table class="blk-params"><tr><th>Dir</th><th>Name</th><th>Type</th><th>Comment</th><th></th></tr>${cur.params.map((pp, k) => `<tr data-pk="${k}"><td><select data-pf="dir">${['IN', 'OUT', 'INOUT'].map((d) => `<option value="${d}" ${d === pp.dir ? 'selected' : ''}>${esc(BR.dirs[d])}</option>`).join('')}</select></td><td><input data-pf="name" class="mono" value="${esc(pp.name)}"></td><td><select data-pf="type">${['BOOL', 'INT'].map((d) => `<option ${d === pp.type ? 'selected' : ''}>${d}</option>`).join('')}</select></td><td><input data-pf="comment" value="${esc(pp.comment || '')}"></td><td><button class="btn small ghost" data-pdel>✕</button></td></tr>`).join('')}</table>
          <div class="row"><button class="btn small" data-padd>+ Parameter</button><span class="muted" style="font-size:.8rem">${isFC ? 'Any other #name you use inside is ' + esc(BR.temp) + ': it is cleared at every call, so an FC cannot remember anything (no latches, timers or edges inside: use an FB for that).' : 'Any other #name you use inside (e.g. #Latch, #Delay) is ' + esc(BR.stat) + ' memory: every ' + esc(BR.inst.split(' (')[0].toLowerCase()) + ' gets its own copy.'}</span></div>
          <div class="hint blk-brand-note"><b>${esc(BR.name)}:</b> ${esc(BR.note)}</div></div>`;
      }
      const dbc = this.dbSel != null && (this.prog.dbs || []).find((d) => d.num === this.dbSel);
      if (dbc) {
        const cur2 = (f) => {
          const key = 'DB' + dbc.num + '.' + f.name.toUpperCase();
          const show = (k) => { const v = this.m.dbv ? this.m.dbv[k] : undefined; return v === undefined ? '—' : f.type === 'STRING' ? "'" + v + "'" : String(v); };
          if (f.lo == null) return show(key);
          const xs = []; for (let k = f.lo; k <= Math.min(f.hi, f.lo + 7); k++) xs.push(show(key + '[' + k + ']')); return xs.join(', ') + (f.hi - f.lo > 7 ? ' …' : '');
        };
        html += `<div class="card blk-iface"><div class="row" style="justify-content:space-between;gap:8px"><span class="eyebrow">Data block · ${esc((LL.BRANDS[S.brand] || LL.BRANDS.ll).name)}: ${esc({ ll: 'global DB', tia: 'global data block (DB) with a PLC data type', rk: 'controller tags of a user-defined data type (UDT)', cds: 'GVL with a STRUCT (DUT)', sch: 'GVL with a STRUCT (DUT)', tc: 'GVL with a STRUCT (DUT)', om: 'global variable of a structure data type' }[S.brand] || 'global DB')}</span><button class="btn small" data-db-del style="color:var(--danger)">Delete DB</button></div>
          <div class="blk-row"><label>Number <input data-dbnum class="mono" value="${dbc.num}" style="width:70px"></label><label>Name <input data-dbname class="mono" value="${esc(dbc.name)}"></label><label style="flex:1">Comment <input data-dbcom value="${esc(dbc.comment || '')}"></label></div>
          <table class="blk-params"><tr><th>Field</th><th>Type</th><th>Array</th><th>Start values</th><th>Now</th><th>Comment</th><th></th></tr>${dbc.fields.map((f, k) => `<tr data-fk="${k}"><td><input data-ff="name" class="mono" value="${esc(f.name)}"></td><td><select data-ff="type">${['BOOL', 'INT', 'DINT', 'STRING'].map((t) => `<option ${t === f.type ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td><input data-ff="range" class="mono" placeholder="e.g. 1..3" value="${f.lo != null ? f.lo + '..' + f.hi : ''}" style="width:70px"></td><td><input data-ff="init" class="mono" placeholder="${f.lo != null ? '500,300,800' : '0'}" value="${esc((f.init || []).join(','))}"></td><td class="mono muted" style="font-size:.78rem;white-space:nowrap">${esc(cur2(f))}</td><td><input data-ff="comment" value="${esc(f.comment || '')}"></td><td><button class="btn small ghost" data-fdel>✕</button></td></tr>`).join('')}</table>
          <div class="row"><button class="btn small" data-fadd>+ Field</button><span class="muted" style="font-size:.8rem">Use it in the ladder as <b>DB${dbc.num}.NAME</b>, or for an array <b>DB${dbc.num}.NAME[2]</b> / <b>DB${dbc.num}.NAME[MW30]</b> (the index from a word). Start values are loaded at every download.</span></div></div>`;
      }
      bar.innerHTML = html;
      const bs = $('[data-brand]', bar); if (bs) bs.onchange = () => { S.brand = bs.value; save(); this.refresh(); toast('Block names shown as ' + LL.BRANDS[bs.value].name); };
      $$('[data-blk]', bar).forEach((b) => (b.onclick = () => { this.blk = b.dataset.blk || null; this.dbSel = null; this.sel = null; this.refresh(); }));
      $$('[data-db]', bar).forEach((b) => (b.onclick = () => { this.dbSel = +b.dataset.db; this.blk = null; this.sel = null; this.refresh(); }));
      const ndb = $('[data-db-new]', bar);
      if (ndb) ndb.onclick = () => { this.prog.dbs = this.prog.dbs || []; let n = 10; while (this.prog.dbs.some((d) => d.num === n)) n++; this.prog.dbs.push({ num: n, name: n === 10 ? 'Recipes' : 'Data' + n, comment: '', fields: [{ name: 'Value', type: 'INT', lo: 1, hi: 3, init: ['0', '0', '0'], comment: '' }] }); this.dbSel = n; this.blk = null; this.commit('DB' + n + ' created: add fields, then use DB' + n + '.VALUE[1] in the ladder'); };
      if (dbc) {
        $('[data-dbnum]', bar).onchange = (e) => { const n = parseInt(e.target.value, 10); if (!(n >= 1 && n <= 999) || this.prog.dbs.some((d) => d !== dbc && d.num === n)) { toast('Use a free DB number 1 … 999'); e.target.value = dbc.num; return; } dbc.num = n; this.dbSel = n; this.commit('Renumbered: update the DB addresses in your rungs'); };
        $('[data-dbname]', bar).onchange = (e) => { const v = e.target.value.trim(); if (!/^[A-Za-z_]\w*$/.test(v)) { toast('Letters, digits and _ only'); e.target.value = dbc.name; return; } dbc.name = v; this.commit(); };
        $('[data-dbcom]', bar).onchange = (e) => { dbc.comment = e.target.value; this.commit(); };
        $('[data-db-del]', bar).onclick = () => modal('Delete DB' + dbc.num + '?', '<p>The data block is removed. Rungs that use it will show errors until you change them. Undo brings it back.</p>', [{ label: 'Cancel' }, { label: 'Delete', cls: 'primary', run: () => { this.prog.dbs.splice(this.prog.dbs.indexOf(dbc), 1); this.dbSel = null; this.commit('DB deleted'); } }]);
        $('[data-fadd]', bar).onclick = () => { let k = dbc.fields.length + 1; while (dbc.fields.some((f) => f.name.toUpperCase() === 'FIELD' + k)) k++; dbc.fields.push({ name: 'Field' + k, type: 'INT', lo: null, hi: null, init: ['0'], comment: '' }); this.commit(); };
        $$('[data-fk]', bar).forEach((tr) => {
          const f = dbc.fields[+tr.dataset.fk];
          $('[data-fdel]', tr).onclick = () => { dbc.fields.splice(+tr.dataset.fk, 1); this.commit('Field removed'); };
          $$('[data-ff]', tr).forEach((inp) => (inp.onchange = () => {
            const k = inp.dataset.ff, v = inp.value.trim();
            if (k === 'name') { if (!/^[A-Za-z_]\w*$/.test(v) || dbc.fields.some((x) => x !== f && x.name.toUpperCase() === v.toUpperCase())) { toast('Invalid or duplicate field name'); inp.value = f.name; return; } f.name = v; }
            else if (k === 'type') f.type = v;
            else if (k === 'range') { if (!v) { f.lo = null; f.hi = null; } else { const m = /^(-?\d+)\s*\.\.\s*(-?\d+)$/.exec(v); if (!m || +m[2] < +m[1] || +m[2] - +m[1] > 999) { toast('Write the array range like 1..10'); inp.value = f.lo != null ? f.lo + '..' + f.hi : ''; return; } f.lo = +m[1]; f.hi = +m[2]; } }
            else if (k === 'init') f.init = v ? v.split(',').map((x) => x.trim()) : [];
            else f.comment = v;
            this.commit();
          }));
        });
      }
      const nb = $('[data-blk-new]', bar);
      if (nb) nb.onclick = () => {
        const m = modal('New block', `<p class="muted" style="margin:0 0 10px">A block is a piece of ladder you write once and call many times, each call with its own inputs, outputs and memory (an FB with an instance in TIA Portal, an Add-On Instruction in Studio 5000, a function block in CODESYS).</p><div class="field"><label for="nbk">Kind</label><select id="nbk"><option value="FB">${esc(BR.fbLong)}</option><option value="FC">${esc(BR.fcLong)}</option></select></div><div class="field"><label for="nbn">Block name</label><input id="nbn" class="mono" value="FB_${blocks.length ? 'Block' + (blocks.length + 1) : 'Motor'}"></div><p class="muted" style="font-size:.85rem;margin:6px 0 0">Rule of thumb: if the block must remember anything from one scan to the next (a latch, a timer, an edge, a counter), it is an FB. If it only calculates its outputs from its inputs, an FC is enough.</p>`, [{ label: 'Cancel' }, { label: 'Create', cls: 'primary', run: (mm) => {
          const kind = $('#nbk', mm).value;
          let nm = $('#nbn', mm).value.trim();
          if (kind === 'FC') nm = nm.replace(/^FB_/, 'FC_');
          if (!/^[A-Za-z_]\w*$/.test(nm) || blocks.some((x) => x.name === nm)) { toast('Use a new name with letters, digits and _ only'); return false; }
          this.prog.blocks = this.prog.blocks || [];
          this.prog.blocks.push({ name: nm, kind, comment: '', params: [{ dir: 'IN', name: 'Start', type: 'BOOL', comment: '' }, { dir: 'OUT', name: 'Run', type: 'BOOL', comment: '' }], rungs: [LL.emptyRung(this.prog.cols)] });
          this.blk = nm; this.sel = null; this.commit('Block ' + nm + ' created. Write its rungs with #Start, #Run …, then CALL it from the main program.');
        } }]);
        const kSel = $('#nbk', m), nIn = $('#nbn', m); if (kSel) kSel.onchange = () => { nIn.value = kSel.value === 'FC' ? nIn.value.replace(/^FB_/, 'FC_') : nIn.value.replace(/^FC_/, 'FB_'); };
      };
      if (!cur) return;
      const ren = (old, nw) => { const fix = (rungs) => rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'CALL' && c.block === old) c.block = nw; }))); fix(this.prog.rungs); blocks.forEach((b) => fix(b.rungs)); };
      $('[data-bname]', bar).onchange = (e) => { const nw = e.target.value.trim(); if (!/^[A-Za-z_]\w*$/.test(nw) || blocks.some((x) => x !== cur && x.name === nw)) { toast('Invalid or duplicate name'); e.target.value = cur.name; return; } ren(cur.name, nw); cur.name = nw; this.blk = nw; this.commit('Block renamed'); };
      $('[data-bcom]', bar).onchange = (e) => { cur.comment = e.target.value; this.commit(); };
      $('[data-bkind]', bar).onchange = (e) => { cur.kind = e.target.value; this.commit(cur.name + ' is now ' + (cur.kind === 'FC' ? 'an FC: no memory, no instance' : 'an FB: every call needs an instance')); };
      $$('[data-pk]', bar).forEach((tr) => {
        const pp = cur.params[+tr.dataset.pk];
        $$('[data-pf]', tr).forEach((inp) => (inp.onchange = () => {
          const f = inp.dataset.pf, v = inp.value.trim();
          if (f === 'name') {
            if (!/^[A-Za-z_]\w*$/.test(v) || cur.params.some((x) => x !== pp && x.name === v)) { toast('Invalid or duplicate parameter name'); inp.value = pp.name; return; }
            const old = pp.name;
            cur.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (!c) return; ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { if (typeof c[k] === 'string' && c[k].split('.')[0] === '#' + old) c[k] = '#' + v + c[k].slice(old.length + 1); }); })));
            const fixArgs = (rungs) => rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'CALL' && c.block === cur.name && c.args && old in c.args) { c.args[v] = c.args[old]; delete c.args[old]; } })));
            fixArgs(this.prog.rungs); blocks.forEach((b) => fixArgs(b.rungs));
          }
          pp[f] = v;
          this.commit();
        }));
        $('[data-pdel]', tr).onclick = () => { cur.params.splice(+tr.dataset.pk, 1); this.commit('Parameter removed'); };
      });
      $('[data-padd]', bar).onclick = () => { let k = cur.params.length + 1; while (cur.params.some((x) => x.name === 'Param' + k)) k++; cur.params.push({ dir: 'IN', name: 'Param' + k, type: 'BOOL', comment: '' }); this.commit('Parameter added'); };
      $('[data-blk-del]', bar).onclick = () => modal('Delete block ' + cur.name + '?', '<p>The block and its rungs are removed. CALLs to it will show an error until you remove them. Undo brings it back.</p>', [{ label: 'Cancel' }, { label: 'Delete', cls: 'primary', run: () => { this.prog.blocks.splice(this.prog.blocks.indexOf(cur), 1); this.blk = null; this.commit('Block deleted'); } }]);
      const mon = $('[data-mon]', bar); if (mon) mon.onchange = () => { this.monInst = mon.value; };
    }

    // ── editing ──
    commit(msg) {
      const t = LL.programToText(this.prog);
      if (t !== this.hist[this.hi]) { this.hist = this.hist.slice(0, this.hi + 1); this.hist.push(t); if (this.hist.length > 80) this.hist.shift(); this.hi = this.hist.length - 1; }
      S.programs[this.key] = t;
      if (this.ch) S.chTried[this.ch.id] = 1;
      saveNow();
      // Like downloading to a real PLC: the new program starts from clean memory,
      // so no bit, timer or counter keeps a value written by the old program.
      this.m.load(this.prog);
      this.m.reset();
      this.notice('Program updated · PLC restarted');
      this.refresh();
      if (msg) toast(msg);
    }
    notice(t) { this._notice = t; this._noticeUntil = performance.now() + 1800; this.scanText(t); }
    restore(t) { this.prog = LL.parseProgram(t); this.sel = null; S.programs[this.key] = t; save(); this.m.load(this.prog); this.m.reset(); this.refresh(); }

    usedNums(re) { const s = new Set(); [this.prog.rungs].concat((this.prog.blocks || []).map((b) => b.rungs)).flat().forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.addr) { const m = re.exec(c.addr); if (m) s.add(+m[1]); } }))); return s; }
    defaultFor(type) {
      const used = LL.usedAddrs(this.prog);
      if (LL.TIMERS.includes(type)) { const u = this.usedNums(/^T(\d+)$/); let n = 0; while (u.has(n)) n++; return { addr: 'T' + n, pt: 3000 }; }
      if (LL.COUNTERS.includes(type)) { const u = this.usedNums(/^C(\d+)$/); let n = 0; while (u.has(n)) n++; return { addr: 'C' + n, pv: 5 }; }
      if (['COIL', 'NCOIL', 'SET', 'RST'].includes(type)) { const o = this.plant.outputs.find((x) => !used.has(x.addr)); return { addr: o ? o.addr : 'M0.0' }; }
      if (['NO', 'NC', 'P', 'N'].includes(type)) { const o = this.plant.inputs.find((x) => !used.has(x.addr)) || this.plant.inputs[0]; return { addr: o.addr }; }
      if (type === 'CALL') { const bl = (this.prog.blocks || []).filter((x) => x.name !== this.blk); const b = bl[0]; const used2 = new Set(); [this.prog.rungs].concat((this.prog.blocks || []).map((x) => x.rungs)).flat().forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'CALL') used2.add(c.inst); }))); const base = b ? b.name.replace(/^FB_?/i, '') || 'Inst' : 'Inst'; let k = 1; while (used2.has(base + k)) k++; if (!b) toast('Create a block first with + Block above the ladder'); return { block: b ? b.name : '', inst: b && b.kind === 'FC' ? '' : base + k, args: {} }; }
      if (LL.MOTION.includes(type)) {
        const usedMc = new Set(); [this.prog.rungs].concat((this.prog.blocks || []).map((x) => x.rungs)).flat().forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && /^MC\d/.test(c.addr || '')) usedMc.add(c.addr); })));
        let k = 0; while (usedMc.has('MC' + k)) k++;
        const home = (this.plant.inputs.find((x) => /home/i.test(x.name)) || this.plant.inputs[0]).addr;
        return { MC_POWER: { ax: 'AX0' }, MC_JOG: { ax: 'AX0', a: '50' }, MC_HOME: { addr: 'MC' + k, ax: 'AX0', src: home }, MC_ABS: { addr: 'MC' + k, ax: 'AX0', a: '100', b: '200' }, MC_REL: { addr: 'MC' + k, ax: 'AX0', a: '50', b: '100' }, MC_STOP: { addr: 'MC' + k, ax: 'AX0' }, MC_RESET: { addr: 'MC' + k, ax: 'AX0' }, MC_SETPOS: { addr: 'MC' + k, ax: 'AX0', a: '0' } }[type];
      }
      if (type === 'PID') { const ai = this.plant.inputs.find((x) => /^AIW/.test(x.addr)), aq = this.plant.outputs.find((x) => /^AQW/.test(x.addr)); return { a: ai ? ai.addr : 'MW10', b: 'MW20', dst: aq ? aq.addr : 'MW30', kp: 1, ti: 10, td: 0 }; }
      if (type === 'SHRB') return { src: (this.plant.inputs.find((x) => x.kind === 'sensor') || this.plant.inputs[0]).addr, addr: 'M10.0', n: 8 };
      // word logic, BCD, REAL: a free word / REAL for the result, an analog input of this machine for NORM_X
      if (['LIM', 'NORM_X', 'SCALE_X', 'CONV', 'ROUND', 'TRUNC', 'I_BCD', 'BCD_I'].concat(LL.WORDLOGIC || []).includes(type)) {
        const free = (pre, from) => { let k = from; while (used.has(pre + k)) k++; return pre + k; };
        const ai = (this.plant.inputs.find((x) => /^AIW/.test(x.addr)) || {}).addr || 'MW10';
        return { LIM: ai === 'MW10' ? { a: '10', src: 'MW10', b: '20' } : { a: '5000', src: ai, b: '20000' }, NORM_X: { a: '0', src: ai, b: '27648', dst: free('MR', 0) }, SCALE_X: { a: '0.0', src: 'MR0', b: '100.0', dst: free('MR', 1) },
          CONV: { src: 'MW10', dst: free('MR', 0) }, ROUND: { src: 'MR0', dst: free('MW', 20) }, TRUNC: { src: 'MR0', dst: free('MW', 20) }, I_BCD: { src: 'MW10', dst: free('MW', 20) }, BCD_I: { src: 'MW10', dst: free('MW', 20) },
          WAND: { a: 'MW10', b: '16#00FF', dst: free('MW', 20) }, WOR: { a: 'MW10', b: '16#0001', dst: free('MW', 20) }, WXOR: { a: 'MW10', b: 'MW12', dst: free('MW', 20) }, WNOT: { a: 'MW10', dst: free('MW', 20) } }[type];
      }
      return {};
    }

    pick(p) {
      const rung = this.E.rungs[p.i];
      if (p.kind === 'rung') { this.sel = { kind: 'rung', i: p.i }; this.refresh(); return; }
      const C = this.prog.cols;
      let { r, c } = p;
      const cell = rung.cells[r][c];
      switch (this.tool) {
        case 'select': this.sel = { kind: 'cell', i: p.i, r, c }; this.refresh(); return;
        case 'erase':
          if (cell) { rung.cells[r][c] = null; this.sel = null; this.commit(); }
          else { const b = c < C - 1 ? c + 1 : C - 1; if (rung.links[r][b]) { rung.links[r][b] = false; this.commit(); } }
          return;
        case 'link': {
          const b = c < C - 1 ? c + 1 : C - 1;
          if (r === rung.rows - 1) this.addRow(rung);
          rung.links[r][b] = !rung.links[r][b];
          this.sel = { kind: 'cell', i: p.i, r, c };
          this.commit(rung.links[r][b] ? 'Branch added on the right side of this cell' : 'Branch removed');
          return;
        }
      }
      const type = this.tool, isOut = LL.isOutput(type);
      if (isOut) c = C - 1;
      else if (c === C - 1) { toast('Contacts go left of the output column (dashed amber).'); return; }
      const old = rung.cells[r][c];
      const keep = old && ((BIT_TYPES.includes(old.type) && BIT_TYPES.includes(type)) || (LL.TIMERS.includes(old.type) && LL.TIMERS.includes(type)) || (LL.COUNTERS.includes(old.type) && LL.COUNTERS.includes(type)));
      const props = keep ? { addr: old.addr, pt: old.pt, pv: old.pv } : this.defaultFor(type);
      rung.cells[r][c] = LL.mkCell(type, props);
      const row = rung.cells[r];
      if (isOut) {
        let last = -1; for (let k = 0; k < C - 1; k++) if (row[k]) last = k;
        if (last >= 0) for (let k = last + 1; k < C - 1; k++) if (!row[k]) row[k] = LL.mkCell('WIRE');
      } else {
        if (r === 0) for (let k = 0; k < c; k++) if (!row[k]) row[k] = LL.mkCell('WIRE');
        if (row[C - 1]) for (let k = c + 1; k < C - 1; k++) if (!row[k]) row[k] = LL.mkCell('WIRE');
      }
      this.sel = { kind: 'cell', i: p.i, r, c };
      this.commit();
    }

    addRow(rung) { rung.rows++; rung.cells.push(new Array(rung.cols).fill(null)); rung.links.push(new Array(rung.cols + 1).fill(false)); }

    action(a, btn) {
      const P = this.E;
      switch (a) {
        case 'run': this.running = !this.running; if (this.running) { this.ladder.setActiveRung(-1); this.scanText(''); } this.updateRunBtn(); break;
        case 'step': this.running = false; this.updateRunBtn(); this.stepPhase(); break;
        case 'reset': this.m.reset(); this.pst = this.initPlant(); this.acc = 0; this.ctrl = {}; this.forces = {}; this.buildDevices(); this.ladder.setActiveRung(-1); this.scanText(''); toast('PLC memory and machine reset'); break;
        case 'speed': this.speed = this.speed === 1 ? 0.25 : this.speed === 0.25 ? 0.1 : 1; btn.textContent = this.speed === 1 ? '1×' : this.speed === 0.25 ? '¼×' : '⅒×'; toast('Simulation speed ' + btn.textContent); break;
        case 'zoom': this.ladder.opts.zoom = this.ladder.opts.zoom === 'fit' ? 1 : 'fit'; this.ladder.fit(); toast(this.ladder.opts.zoom === 'fit' ? 'Zoom: fit width' : 'Zoom: 100 %'); break;
        case 'undo': if (this.hi > 0) { this.hi--; this.restore(this.hist[this.hi]); } break;
        case 'redo': if (this.hi < this.hist.length - 1) { this.hi++; this.restore(this.hist[this.hi]); } break;
        case 'brands': {
          const prog = Object.assign({}, this.prog, { tags: this.tags() });
          const TABS = [
            ['tia', 'TIA Portal', 'Siemens TIA Portal (S7-1200 / S7-1500) as SCL, with the tags and instance DBs to create.', () => LL.toTIA(prog)],
            ['rk', 'Studio 5000', 'Rockwell rung text: XIC = NO, XIO = NC, OTE = coil, OTL / OTU = set / reset, [ , ] = branch. Paste a rung after double-clicking its number in Logix Designer.', () => LL.toRockwell(prog)],
            ['sch', 'Schneider', 'Schneider EcoStruxure Machine Expert (CODESYS-based) Structured Text.', () => LL.toMachineExpert(prog)],
            ['tc', 'TwinCAT 3', 'Beckhoff TwinCAT 3: PROGRAM MAIN with AT %I* / %Q* variables to link to the terminals.', () => LL.toTwinCAT(prog)],
            ['om', 'Omron Sysmac', 'Omron Sysmac Studio (NJ / NX) Structured Text with the variables to create.', () => LL.toSysmac(prog)],
            ['cx', 'Omron CX', 'Omron CX-Programmer (CP1 / CJ) mnemonics: LD, AND, OR, OUT, TIM, CNT …', () => LL.toOmronCX(prog)],
            ['st', 'IEC ST', 'IEC 61131-3 Structured Text as in CODESYS: the common language of all of them.', () => LL.toST(prog)],
            ['xref', 'Brand table', 'The same element in every brand.', null],
          ];
          const pick = { tia: 'tia', rk: 'rk', sch: 'sch', tc: 'tc', om: 'om', cds: 'st' }[S.brand] || S.exportTab || 'tia';
          const m = modal('This program in other brands', `<div class="brand-tabs">${TABS.map(([k, n]) => `<button class="${k === pick ? 'on' : ''}" data-bt="${k}">${esc(n)}</button>`).join('')}</div><p class="muted brand-note" style="margin:8px 0"></p><div class="brand-out"></div>`, [{ label: 'Copy', run: () => { const t = $('.brand-out pre', m); if (t && navigator.clipboard) { navigator.clipboard.writeText(t.textContent).then(() => toast('Copied'), () => toast('Copy failed: select the text by hand')); } return false; } }, { label: 'Close', cls: 'primary' }]);
          m.classList.add('wide');
          const show = (k) => {
            const t = TABS.find((x) => x[0] === k) || TABS[0];
            S.exportTab = t[0]; save();
            $$('[data-bt]', m).forEach((b) => b.classList.toggle('on', b.dataset.bt === t[0]));
            $('.brand-note', m).textContent = t[2];
            let out; try { out = t[3] ? `<pre class="code brand-pre">${esc(t[3]())}</pre>` : LL.brandTableHTML(); } catch (e) { out = `<p class="muted">Could not translate this program: ${esc(e.message)}</p>`; }
            $('.brand-out', m).innerHTML = out;
          };
          $$('[data-bt]', m).forEach((b) => (b.onclick = () => show(b.dataset.bt)));
          show(pick);
          break;
        }
        case 'rk': modal('Studio 5000 rung text', `<p class="muted" style="margin:0 0 10px">The same ladder in Rockwell's rung text (XIC = NO contact, XIO = NC contact, OTE = coil, OTL / OTU = set / reset, [ , ] = a parallel branch). Logix Designer shows it when you edit a rung as text, and you can paste a rung into it. See the lesson "From Ladder Lab to the real software".</p><pre>${esc(LL.toRockwell(Object.assign({}, this.prog, { tags: this.tags() })))}</pre>`, [{ label: 'Close' }]); break;
        case 'st': modal('Structured Text', `<p class="muted" style="margin:0 0 10px">The same logic written as IEC 61131-3 Structured Text, as in CODESYS. Reading both side by side is a great way to learn.</p><pre>${esc(LL.toST(Object.assign({}, this.prog, { tags: this.tags() })))}</pre>`, [{ label: 'Close' }]); break;
        case 'file': this.fileMenu(); break;
        case 'myprogs': myPrograms(); break;
        case 'clear': this.clearEditor(); break;
        // rung ops
        case 'r-add': { const i = this.sel.i; P.rungs.splice(i + 1, 0, LL.emptyRung(P.cols)); this.sel = { kind: 'rung', i: i + 1 }; this.commit('Rung added'); break; }
        case 'r-above': { const i = this.sel.i; P.rungs.splice(i, 0, LL.emptyRung(P.cols)); this.sel = { kind: 'rung', i }; this.commit('Rung added'); break; }
        case 'r-row': this.addRow(P.rungs[this.sel.i]); this.commit('Branch row added. Use the Branch tool to connect it.'); break;
        case 'r-unrow': { const r = P.rungs[this.sel.i]; if (r.rows > 1 && r.cells[r.rows - 1].every((x) => !x)) { r.rows--; r.cells.pop(); r.links.pop(); r.links[r.rows - 1].fill(false); this.commit(); } else toast('The last row must be empty to remove it'); break; }
        case 'r-up': { const i = this.sel.i; if (i > 0) { [P.rungs[i - 1], P.rungs[i]] = [P.rungs[i], P.rungs[i - 1]]; this.sel.i--; this.commit(); } break; }
        case 'r-down': { const i = this.sel.i; if (i < P.rungs.length - 1) { [P.rungs[i + 1], P.rungs[i]] = [P.rungs[i], P.rungs[i + 1]]; this.sel.i++; this.commit(); } break; }
        case 'r-dup': { const i = this.sel.i; const copy = LL.parseProgram('COLS ' + P.cols + '\nRUNG ' + (P.rungs[i].comment || '') + '\n' + LL.rungToLines(P.rungs[i]).join('\n')).rungs[0]; P.rungs.splice(i + 1, 0, copy); this.sel = { kind: 'rung', i: i + 1 }; this.commit('Rung duplicated'); break; }
        case 'r-del': { if (P.rungs.length <= 1) { P.rungs[0] = LL.emptyRung(P.cols); } else P.rungs.splice(this.sel.i, 1); this.sel = null; this.commit('Rung deleted'); break; }
        case 'c-del': { const s = this.sel; P.rungs[s.i].cells[s.r][s.c] = null; this.sel = null; this.commit(); break; }
        case 'c-link': { const s = this.sel, rung = P.rungs[s.i], b = s.c < P.cols - 1 ? s.c + 1 : P.cols - 1; if (s.r === rung.rows - 1) this.addRow(rung); rung.links[s.r][b] = !rung.links[s.r][b]; this.commit(); break; }
        case 'tests': this.runTests(); break;
        case 'how': this.showGuide(); break;
        case 'lang-ld': case 'lang-st': { const l = a.slice(5); if (l !== this.lang) { S.lang.lab = l; saveNow(); current = ''; route(); } break; }
        case 'hint': this.hint++; this.renderTask(); break;
        case 'solution': this.askSolution(); break;
      }
    }

    updateRunBtn() {
      const b = $('[data-a="run"]', this.el);
      b.classList.toggle('running', this.running);
      b.innerHTML = this.running ? `<span class="rd">●</span> RUN` : `${I.play} Run`;
      b.title = this.running ? 'PLC is running. Tap to stop.' : 'Start the PLC';
    }
    scanText(t) { const e = $('.scanstate', this.el); if (e.textContent !== t) { e.textContent = t; e.classList.toggle('hot', t === this._notice && this._noticeUntil > performance.now()); } }

    stepPhase() {
      if (this.lang === 'st') { this.plantStep(10); this.m.scan(10); this.scanText('Scan ' + this.m.scanCount + ' done (one Step = one whole scan in ST)'); return; }
      const n = this.prog.rungs.length;
      if (this.m.phase === 0) this.plantStep(10);
      const ph = this.m.stepPhase(10);
      this.ladder.setActiveRung(ph >= 1 && ph <= n ? ph - 1 : -1);
      this.scanText(ph === 0 ? 'Scan ' + this.m.scanCount + ' · ① read inputs' : ph <= n ? '② solved rung ' + ph + ' of ' + n : '③ wrote outputs');
    }

    refresh() {
      if (this.lang === 'st') return;
      this.renderBlockBar();
      this.ladder.setProgram(this.E, this.tags());
      this.ladder.select(this.sel ? { kind: this.sel.kind, i: this.sel.i, r: this.sel.r, c: this.sel.c } : null);
      this.renderInspector();
      this.renderIssues();
      const t = $('.lab-bar .title', this.el);
      if (t && !this.ch) t.textContent = this.prog.name;
    }

    renderIssues() {
      const box = $('.issues', this.el);
      const iss = LL.lint(this.prog);
      box.hidden = !iss.length;
      box.innerHTML = iss.map((x) => `<div class="issue ${x.level}"><span class="tagx">${x.level === 'error' ? 'ERROR' : 'CHECK'}</span><span>Rung ${x.rung}: ${esc(x.msg)}</span></div>`).join('');
    }

    quickChips(field, list) {
      return `<div class="quick" data-for="${field}">${list.map(([a, n]) => `<button type="button" data-q="${esc(a)}">${esc(a)}${n ? `<b>${esc(n)}</b>` : ''}</button>`).join('')}</div>`;
    }

    renderInspector() {
      const box = $('.inspector', this.el);
      const s = this.sel;
      const tags = this.tags();
      if (!s) {
        box.innerHTML = `<div class="ih"><h3>How to edit</h3></div><p class="desc">1. Pick a tool below the ladder (for example <b>-| |-</b>). 2. Tap a dashed box to place it; outputs jump to the amber column on the right. 3. Tap an element with <b>Select</b> to set its address. Use <b>Branch</b> on a cell to drop a parallel path from its right side. Tap a rung's header line for rung options.</p><div class="row"><button class="btn small" data-a2="addrung">+ Add rung at end</button></div>`;
        $('[data-a2="addrung"]', box).onclick = () => { this.E.rungs.push(LL.emptyRung(this.prog.cols)); this.sel = { kind: 'rung', i: this.E.rungs.length - 1 }; this.commit('Rung added'); };
        return;
      }
      if (s.kind === 'rung') {
        const r = this.E.rungs[s.i];
        box.innerHTML = `<div class="ih"><h3>${this.blk ? esc(this.blk) + ' · ' : ''}Rung ${s.i + 1}</h3><span class="muted" style="font-size:.85rem">${r.rows} row${r.rows > 1 ? 's' : ''}</span></div>
          <div class="field"><label for="rc">Comment: say why this rung exists</label><input id="rc" value="${esc(r.comment)}" placeholder="e.g. Motor start/stop latch"></div>
          <div class="row"><button class="btn small" data-a="r-above">+ Rung above</button><button class="btn small" data-a="r-add">+ Rung below</button><button class="btn small" data-a="r-row">+ Branch row</button><button class="btn small" data-a="r-unrow">− Last row</button><button class="btn small" data-a="r-up">↑</button><button class="btn small" data-a="r-down">↓</button><button class="btn small" data-a="r-dup">Duplicate</button><button class="btn small" data-a="r-del" style="color:var(--danger)">Delete rung</button></div>`;
        $('#rc', box).oninput = (e) => { r.comment = e.target.value; clearTimeout(this._ct); this._ct = setTimeout(() => this.commit(), 400); };
        return;
      }
      const rung = this.E.rungs[s.i];
      const cell = rung && rung.cells[s.r][s.c];
      const C = this.prog.cols;
      const b = s.c < C - 1 ? s.c + 1 : C - 1;
      const linkOn = rung && rung.links[s.r][b];
      if (!cell) {
        box.innerHTML = `<div class="ih"><h3>Empty cell</h3><span class="muted mono">rung ${s.i + 1} · row ${s.r + 1} · col ${s.c + 1}</span></div><p class="desc">Choose a tool in the palette, then tap this cell. ${s.c === C - 1 ? 'This is the output column: coils, timers, counters and math go here.' : 'Contacts, compares and wires go here.'}</p><div class="row"><button class="btn small" data-a="c-link">${linkOn ? 'Remove branch' : 'Branch down from right side'}</button></div>`;
        return;
      }
      const [title, desc] = LL.ELEMENT_INFO[cell.type] || [cell.type, ''];
      const used = [...LL.usedAddrs(this.prog)];
      const nameOf = (a) => tags[a] || '';
      const inputs = this.plant.inputs.map((d) => [d.addr, nameOf(d.addr)]);
      const outputs = this.plant.outputs.map((d) => [d.addr, nameOf(d.addr)]);
      const mem = [...new Set(['M0.0', 'M0.1', 'M0.2', 'M0.3'].concat(used.filter((a) => /^M\d/.test(a) || /^MW\d+\.\d+$/.test(a))))].sort().map((a) => [a, nameOf(a)]);
      const tim = used.filter((a) => /^T\d+$/.test(a)).map((a) => [a, '']);
      const ctr = used.filter((a) => /^C\d+$/.test(a)).map((a) => [a, '']);
      const bvs = this.blk ? this.blockVars() : [];
      if (bvs.length) { inputs.unshift(...bvs); outputs.unshift(...bvs); mem.unshift(...bvs.filter((x) => !/INT/.test(x[1]))); tim.unshift(...bvs.filter((x) => x[1] === 'static')); ctr.unshift(...bvs.filter((x) => x[1] === 'static')); }
      const words0 = [...new Set(['MW0'].concat(this.plant.inputs.concat(this.plant.outputs).map((d) => d.addr).filter((a) => /^A[IQ]W/.test(a)), used.filter((a) => /^M[WR]\d+$/.test(a)), used.filter((a) => /^C\d+$/.test(a)).map((a) => a + '.CV'), used.filter((a) => /^T\d+$/.test(a)).map((a) => a + '.ET')))].map((a) => [a, '']);
      const words = bvs.filter((x) => !/BOOL/.test(x[1])).concat(words0);
      let fields = '';
      let chips = '';
      const T = cell.type;
      if (BIT_TYPES.includes(T)) {
        fields += `<div class="field"><label for="f-addr">Address</label><input id="f-addr" class="mono" data-f="addr" value="${esc(cell.addr)}" autocomplete="off" spellcheck="false"></div>`;
        fields += `<div class="field"><label for="f-sym">Symbol name</label><input id="f-sym" data-sym value="${esc(nameOf(cell.addr))}" placeholder="e.g. Start_PB"></div>`;
        const list = ['COIL', 'NCOIL', 'SET'].includes(T) ? outputs.concat(mem) : T === 'RST' ? outputs.concat(mem, tim, ctr) : inputs.concat(outputs, mem, tim, ctr, [['SM0.5', '1 Hz clock'], ['SM0.1', 'first scan'], ['SM0.0', 'always on']]);
        chips = this.quickChips('addr', list);
      } else if (LL.TIMERS.includes(T)) {
        fields += `<div class="field"><label for="f-addr">Timer</label><input id="f-addr" class="mono" data-f="addr" value="${esc(cell.addr)}"></div><div class="field"><label for="f-pt">Preset time (s)</label><input id="f-pt" type="number" step="0.1" min="0.01" data-f="pt" value="${cell.pt / 1000}"></div>`;
        fields += `<div class="field"><label for="f-type">Type</label><select id="f-type" data-type>${LL.TIMERS.map((t) => `<option ${t === T ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
      } else if (LL.COUNTERS.includes(T)) {
        fields += `<div class="field"><label for="f-addr">Counter</label><input id="f-addr" class="mono" data-f="addr" value="${esc(cell.addr)}"></div><div class="field"><label for="f-pv">Preset (PV)</label><input id="f-pv" type="number" step="1" data-f="pv" value="${cell.pv}"></div>`;
        fields += `<div class="field"><label for="f-type">Type</label><select id="f-type" data-type>${LL.COUNTERS.map((t) => `<option ${t === T ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
        chips = this.quickChips('addr', ctr);
      } else if (T === 'CMP') {
        fields += `<div class="field"><label for="f-a">Value A</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div><div class="field"><label for="f-op">Compare</label><select id="f-op" data-f="op">${LL.CMP_OPS.map((o) => `<option ${o === cell.op ? 'selected' : ''}>${o}</option>`).join('')}</select></div><div class="field"><label for="f-b">Value B</label><input id="f-b" class="mono" data-f="b" value="${esc(cell.b)}"></div>`;
        chips = this.quickChips('a', words);
      } else if (T === 'MOV') {
        fields += `<div class="field"><label for="f-src">Source</label><input id="f-src" class="mono" data-f="src" value="${esc(cell.src)}"></div><div class="field"><label for="f-dst">Destination</label><input id="f-dst" class="mono" data-f="dst" value="${esc(cell.dst)}"></div>`;
      } else if (T === 'CALL') {
        const blocks = this.prog.blocks || [];
        if (blocks.length && !blocks.some((x) => x.name === cell.block)) { const first = blocks.find((x) => x.name !== this.blk); if (first) cell.block = first.name; }
        const b = blocks.find((x) => x.name === cell.block);
        fields += `<div class="field"><label for="f-blk">Block</label><select id="f-blk" data-call="block">${blocks.length ? '' : '<option value="">(no blocks yet: create one with + Block)</option>'}${blocks.filter((x) => x.name !== this.blk).map((x) => `<option ${x.name === cell.block ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>${b && b.kind === 'FC' ? `<p class="muted" style="font-size:.85rem;margin:0">${esc(b.name)} is an ${esc((LL.BRANDS[S.brand] || LL.BRANDS.ll).fc)}: no instance, no memory. Just connect the parameters.</p>` : `<div class="field"><label for="f-inst">${esc((LL.BRANDS[S.brand] || LL.BRANDS.ll).inst)}</label><input id="f-inst" class="mono" data-call="inst" value="${esc(cell.inst)}"></div>`}`;
        if (b) b.params.forEach((pp) => { fields += `<div class="field"><label>${pp.dir} ${esc(pp.name)} <span class="muted">${pp.type}${pp.comment ? ' · ' + esc(pp.comment) : ''}</span></label><input class="mono" data-arg="${esc(pp.name)}" data-ptype="${pp.type}" data-pdir="${pp.dir}" value="${esc((cell.args || {})[pp.name] || '')}" placeholder="${pp.type === 'INT' ? 'MW10, AIW0, 100 …' : pp.dir === 'IN' ? 'I0.0, M0.1 …' : 'Q0.0, M0.1 …'}"></div>`; });
      } else if (LL.STRING_OPS.includes(T)) {
        const fld = (f, label) => `<div class="field"><label for="f-${f}">${label}</label><input id="f-${f}" class="mono" data-f="${f}" value="${esc(cell[f])}"></div>`;
        if (T === 'SMOV') fields += fld('src', "Source: STRn, ISTRn or a text in quotes 'ABC'") + fld('dst', 'Destination: STRn or QSTRn');
        if (T === 'CONCAT') fields += fld('a', 'First string') + fld('b', "Second string (e.g. '-')") + fld('dst', 'Result: STRn or QSTRn');
        if (T === 'ITOS') fields += fld('a', 'Number (word)') + `<div class="field"><label for="f-n">Digits (leading zeros; 0 = none)</label><input id="f-n" type="number" min="0" max="10" data-f="n" value="${cell.n}"></div>` + fld('dst', 'Result: STRn or QSTRn');
        if (T === 'SMID') fields += fld('src', 'Source string') + fld('a', 'Start position (from 1)') + fld('b', 'Number of characters') + fld('dst', 'Result: STRn or QSTRn');
      } else if (LL.MOTION.includes(T)) {
        const axSel = `<div class="field"><label for="f-ax">Axis</label><select id="f-ax" data-f="ax">${['AX0', 'AX1', 'AX2', 'AX3'].map((x) => `<option ${x === cell.ax ? 'selected' : ''}>${x}</option>`).join('')}</select></div>`;
        const tagF = ['MC_POWER', 'MC_JOG'].includes(T) ? '' : `<div class="field"><label for="f-addr">Command tag (MC0 … MC99: its .DONE, .BUSY, .ERR, .ABORT bits)</label><input id="f-addr" class="mono" data-f="addr" value="${esc(cell.addr)}"></div>`;
        const extra = T === 'MC_HOME' ? `<div class="field"><label for="f-src">Reference (home) switch</label><input id="f-src" class="mono" data-f="src" value="${esc(cell.src)}"></div>`
          : T === 'MC_ABS' || T === 'MC_REL' ? `<div class="field"><label for="f-a">${T === 'MC_ABS' ? 'Position (mm)' : 'Distance (mm, negative = backwards)'}</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div><div class="field"><label for="f-b">Velocity (mm/s)</label><input id="f-b" class="mono" data-f="b" value="${esc(cell.b)}"></div>`
          : T === 'MC_JOG' ? `<div class="field"><label for="f-a">Velocity (mm/s, negative = backwards)</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div>`
          : T === 'MC_SETPOS' ? `<div class="field"><label for="f-a">Position value to set (mm)</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div>` : '';
        fields += tagF + axSel + extra + `<p class="muted" style="font-size:.82rem;margin:4px 0 0">Read the axis with AX0.POS (mm), AX0.VEL, AX0.ON, AX0.HOMED, AX0.MOVING, AX0.ERR.</p>`;
        if (T === 'MC_HOME') chips = this.quickChips('src', inputs);
      } else if (T === 'PID') {
        fields += `<div class="field"><label for="f-a">PV: measured value (word)</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div><div class="field"><label for="f-b">SP: setpoint (word, same units)</label><input id="f-b" class="mono" data-f="b" value="${esc(cell.b)}"></div><div class="field"><label for="f-dst">OUT: 0 … 27648 = 0 … 100 %</label><input id="f-dst" class="mono" data-f="dst" value="${esc(cell.dst)}"></div><div class="field"><label for="f-kp">Kp: % output per unit of error</label><input id="f-kp" type="number" step="0.01" min="0.001" data-f="kp" value="${cell.kp}"></div><div class="field"><label for="f-ti">Ti: integral time in s (0 = no I)</label><input id="f-ti" type="number" step="0.1" min="0" data-f="ti" value="${cell.ti}"></div><div class="field"><label for="f-td">Td: derivative time in s (0 = no D)</label><input id="f-td" type="number" step="0.05" min="0" data-f="td" value="${cell.td}"></div>`;
        chips = this.quickChips('a', words);
      } else if (T === 'SHRB') {
        fields += `<div class="field"><label for="f-src">DATA bit (enters the register)</label><input id="f-src" class="mono" data-f="src" value="${esc(cell.src)}"></div><div class="field"><label for="f-addr">START bit (first bit of the register)</label><input id="f-addr" class="mono" data-f="addr" value="${esc(cell.addr)}"></div><div class="field"><label for="f-n">Length N (negative = shift the other way)</label><input id="f-n" type="number" step="1" min="-64" max="64" data-f="n" value="${cell.n}"></div>`;
        chips = this.quickChips('src', inputs.concat(mem));
      } else if (T === 'SHL' || T === 'SHR') {
        fields += `<div class="field"><label for="f-a">IN (word)</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div><div class="field"><label for="f-b">N (bits to shift)</label><input id="f-b" class="mono" data-f="b" value="${esc(cell.b)}"></div><div class="field"><label for="f-dst">OUT (word)</label><input id="f-dst" class="mono" data-f="dst" value="${esc(cell.dst)}"></div>`;
      } else if (T === 'LIM' || (LL.WORDLOGIC || []).includes(T) || (LL.BCD_OPS || []).includes(T) || (LL.REAL_OPS || []).includes(T)) {
        // word logic, LIM, BCD and REAL: one labelled field per operand
        const fld = (f, label) => `<div class="field"><label for="f-${f}">${label}</label><input id="f-${f}" class="mono" data-f="${f}" value="${esc(cell[f])}" autocomplete="off" spellcheck="false"></div>`;
        const res = (what) => fld('dst', 'Result ' + what);
        let note;
        if (T === 'LIM') { fields += fld('a', 'Low limit') + fld('src', 'Value to test') + fld('b', 'High limit'); note = 'Power passes while LOW ≤ VALUE ≤ HIGH. Use words (MW10, AIW0), REAL (MR0) or numbers (12.5).'; }
        else if (T === 'WNOT') { fields += fld('a', 'IN (word)') + res('(word)'); note = 'Every bit flips: 16#00FF becomes 16#FF00.'; }
        else if ((LL.WORDLOGIC || []).includes(T)) { fields += fld('a', 'A (word)') + fld('b', 'B (word or mask)') + res('(word)'); note = 'Write a mask in hex 16#00FF or binary 2#0000_0101. A word has 16 bits: bit 0 on the right … bit 15 on the left.'; }
        else if (T === 'I_BCD') { fields += fld('src', 'Number 0 … 9999') + res('(BCD word)'); note = '1234 becomes 16#1234: one digit in every 4 bits, for a 7-segment display.'; }
        else if (T === 'BCD_I') { fields += fld('src', 'BCD word') + res('(word)'); note = '16#1234 becomes 1234, e.g. from a thumbwheel switch. A 4-bit group above 9 is not BCD: then nothing is written.'; }
        else if (T === 'NORM_X' || T === 'SCALE_X') { fields += fld('a', 'MIN') + fld('src', 'VALUE') + fld('b', 'MAX') + res(T === 'NORM_X' ? '(MRn)' : '(MRn or word)'); note = T === 'NORM_X' ? 'VALUE from MIN … MAX (e.g. AIW0, 0 … 27648) becomes 0.0 … 1.0 in a REAL (MR0 … MR99).' : 'VALUE 0.0 … 1.0 (a REAL, e.g. from NORM_X) becomes MIN … MAX. Into a word (MW, AQW) it is rounded.'; }
        else { fields += fld('src', 'Source') + res(T === 'CONV' ? '(other type)' : '(word or MRn)'); note = T === 'CONV' ? 'INT → REAL: MW10 into MR0. REAL → INT: MR0 into MW10, rounded to the nearest (2.5 → 2, 3.5 → 4).' : T === 'ROUND' ? 'Source is a REAL (MR0 or 2.5). 2.4 → 2, 2.6 → 3, x.5 → the even number.' : 'Source is a REAL (MR0 or 2.5). The decimals are cut off: 2.9 → 2, -2.9 → -2.'; }
        chips = `<p class="muted" style="font-size:.82rem;margin:0 0 6px">${note}${T === 'LIM' || (LL.REAL_OPS || []).includes(T) ? ' MR0 … MR99 hold REAL numbers: write them with a point (100.0).' : ''}</p>` + this.quickChips(T === 'LIM' || T === 'NORM_X' ? 'src' : (LL.WORDLOGIC || []).includes(T) ? 'a' : 'src', words);
      } else if (LL.MATH.includes(T)) {
        fields += `<div class="field"><label for="f-a">A</label><input id="f-a" class="mono" data-f="a" value="${esc(cell.a)}"></div><div class="field"><label for="f-b">B</label><input id="f-b" class="mono" data-f="b" value="${esc(cell.b)}"></div><div class="field"><label for="f-dst">Result</label><input id="f-dst" class="mono" data-f="dst" value="${esc(cell.dst)}"></div>`;
      }
      const swap = ['NO', 'NC', 'P', 'N'].includes(T) ? ['NO', 'NC', 'P', 'N'] : ['COIL', 'NCOIL', 'SET', 'RST'].includes(T) ? ['COIL', 'NCOIL', 'SET', 'RST'] : null;
      box.innerHTML = `<div class="ih"><h3>${esc(title)}</h3><span class="muted mono" style="font-size:.8rem">rung ${s.i + 1} · row ${s.r + 1} · col ${s.c + 1}</span></div>
        <p class="desc">${esc(desc)}</p>
        ${fields ? `<div class="fields">${fields}</div>` : ''}${chips}
        <div class="row">${swap ? swap.map((t) => `<button class="btn small ${t === T ? 'primary' : ''}" data-swap="${t}">${esc((LL.ELEMENT_INFO[t] || [t])[0])}</button>`).join('') : ''}</div>
        <div class="row">${s.c < C - 1 || true ? `<button class="btn small" data-a="c-link">${linkOn ? 'Remove branch on the right' : 'Branch down from the right side'}</button>` : ''}<button class="btn small" data-a="c-del" style="color:var(--danger)">Delete</button></div>`;
      const apply = (f, v, inp) => {
        if (f === 'pt') { const ms = Math.round(parseFloat(v) * 1000); if (!(ms > 0)) { inp && inp.classList.add('bad'); return; } cell.pt = ms; }
        else if (f === 'pv') { const n = parseInt(v, 10); if (isNaN(n)) { inp && inp.classList.add('bad'); return; } cell.pv = n; }
        else if (f === 'op') cell.op = v;
        else if (f === 'kp' || f === 'ti' || f === 'td') { const x = parseFloat(v); if (isNaN(x) || x < 0 || (f === 'kp' && x <= 0)) { inp && inp.classList.add('bad'); return; } cell[f] = x; }
        else if (f === 'n' && T === 'ITOS') { const n = parseInt(v, 10); if (isNaN(n) || n < 0 || n > 10) { inp && inp.classList.add('bad'); return; } cell.n = n; }
        else if (f === 'n') { const n = parseInt(v, 10); if (isNaN(n) || n === 0 || Math.abs(n) > 64) { inp && inp.classList.add('bad'); return; } cell.n = n; }
        else if (LL.STRING_OPS.includes(T) || (T === 'CMP' && /'|STR/i.test(String(v)))) { const a = /^'.*'$/.test(String(v).trim()) ? "'" + String(v).trim().slice(1, -1).toUpperCase().replace(/\s+/g, '') + "'" : LL.norm(v); const ok = f === 'dst' ? LL.isWritableStr(a) : (T === 'ITOS' || (T === 'SMID' && f !== 'src')) ? LL.isWordAddr(a) : LL.isStrAddr(a); inp && inp.classList.toggle('bad', !ok); if (!ok) return; cell[f] = a; }
        else {
          let a = LL.norm(v);
          const byName = Object.keys(tags).find((k) => tags[k] && tags[k].toUpperCase() === String(v).trim().toUpperCase());
          if (byName) a = byName;
          const ok = LL.MOTION.includes(T) ? (f === 'addr' ? /^MC\d{1,2}$/.test(a) : f === 'ax' ? /^AX[0-3]$/.test(a) : f === 'src' ? LL.isBitAddr(a) : LL.isWordAddr(a)) : T === 'SHRB' ? (f === 'src' ? LL.isBitAddr(a) : /^[QM]\d{1,2}\.[0-7]$/.test(a)) : f === 'addr' ? (LL.TIMERS.includes(T) ? /^T\d{1,2}$/.test(a) || (!!this.blk && /^#[A-Za-z_]\w*$/.test(a)) : LL.COUNTERS.includes(T) ? /^C\d{1,2}$/.test(a) || (!!this.blk && /^#[A-Za-z_]\w*$/.test(a)) : LL.isBitAddr(a) || (T === 'RST' && LL.isWritableWord(a))) : f === 'dst' ? LL.isWritableWord(a) : LL.isWordAddr(a);
          inp && inp.classList.toggle('bad', !ok);
          if (!ok) return;
          cell[f] = a;
          if (f === 'addr') { const sym = $('#f-sym', box); if (sym) sym.value = tags[a] || ''; }
        }
        inp && inp.classList.remove('bad');
        clearTimeout(this._ft); this._ft = setTimeout(() => { this.commit(); }, 120);
      };
      $$('[data-f]', box).forEach((inp) => { inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => apply(inp.dataset.f, inp.value, inp)); });
      $$('[data-call]', box).forEach((inp) => inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (inp.dataset.call === 'block') { cell.block = inp.value; const nb = (this.prog.blocks || []).find((x) => x.name === inp.value); if (nb && nb.kind === 'FC') cell.inst = ''; else if (!cell.inst) cell.inst = nb ? nb.name.replace(/^FB_?/i, '') + '1' : 'Inst1'; this.commit(); return; }
        const v = inp.value.trim(); const ok = /^[A-Za-z_]\w*$/.test(v); inp.classList.toggle('bad', !ok); if (!ok) return;
        cell.inst = v; clearTimeout(this._ft); this._ft = setTimeout(() => this.commit(), 300);
      }));
      $$('[data-arg]', box).forEach((inp) => inp.addEventListener('input', () => {
        let a = LL.norm(inp.value); const byName = Object.keys(tags).find((k) => tags[k] && tags[k].toUpperCase() === inp.value.trim().toUpperCase()); if (byName) a = byName;
        const ty = inp.dataset.ptype, out = inp.dataset.pdir !== 'IN';
        const ok = a === '' || (ty === 'INT' ? (out ? LL.isWritableWord(a) : LL.isWordAddr(a)) : (out ? LL.isWritableBit(a) : LL.isBitAddr(a) || ['0', '1', 'TRUE', 'FALSE'].includes(a)));
        inp.classList.toggle('bad', !ok); if (!ok) return;
        cell.args = cell.args || {}; cell.args[inp.dataset.arg] = a;
        clearTimeout(this._ft); this._ft = setTimeout(() => this.commit(), 300);
      }));
      $$('.quick button', box).forEach((qb) => (qb.onclick = () => {
        const f = qb.parentNode.dataset.for;
        const inp = $(`[data-f="${f}"]`, box);
        inp.value = qb.dataset.q;
        apply(f, qb.dataset.q, inp);
        $$('.quick button', box).forEach((x) => x.classList.toggle('on', x === qb));
      }));
      const sym = $('[data-sym]', box);
      if (sym) sym.oninput = () => { this.prog.tags = this.prog.tags || {}; const v = sym.value.trim(); if (v) this.prog.tags[cell.addr] = v; else delete this.prog.tags[cell.addr]; clearTimeout(this._ft); this._ft = setTimeout(() => this.commit(), 400); };
      const ty = $('[data-type]', box);
      if (ty) ty.onchange = () => { cell.type = ty.value; this.commit(); };
      $$('[data-swap]', box).forEach((sb) => (sb.onclick = () => { cell.type = sb.dataset.swap; this.commit(); }));
    }

    renderTask() {
      const ch = this.ch, box = $('.chal', this.el);
      if (!box) return;
      const tags = this.tags();
      const plant = this.plant;
      const io = plant.inputs.map((d) => d.kind === 'sel3' ? `<tr><td>${d.addr} / ${d.addr2}</td><td>${esc(d.name)} <span class="kind">selector: ${d.addr} = MANUAL, ${d.addr2} = AUTO</span></td></tr>` : `<tr><td>${d.addr}</td><td>${esc(tags[d.addr] || d.name)} <span class="kind">${d.kind === 'pbnc' ? 'NC button' : d.kind === 'pb' ? 'NO button' : d.kind === 'sw' ? 'switch' : 'sensor'}</span></td></tr>`)
        .concat(plant.outputs.map((o) => `<tr><td>${o.addr}</td><td>${esc(tags[o.addr] || o.name)} <span class="kind">output</span></td></tr>`)).join('');
      const PP = this.pathOf(), pIdx = PP ? PP.all.indexOf(ch.id) : -1;
      box.innerHTML = `<div class="row" style="justify-content:space-between"><span class="plate">Challenge · Level ${ch.level}</span>${PP ? `<a class="chip" href="#path-${PP.id}">${esc(PP.short)} · ${pIdx + 1}/${PP.all.length}</a>` : ''}${S.ch[ch.id] ? '<span class="chip ok">✓ passed</span>' : ''}</div>
        <h2>${esc(ch.title)}</h2>
        <p class="brief">${ch.brief}</p>
        <details class="card" style="background:var(--surface-2)"><summary class="panel-title" style="cursor:pointer">I/O list · ${esc(plant.name)}</summary><table class="iotable">${io}</table></details>
        ${ch.hints.slice(0, this.hint).map((t, k) => `<div class="hint"><b>Hint ${k + 1}.</b> ${esc(t)}</div>`).join('')}
        ${ch.kind === 'diagnose' ? `<div class="diag"><h3>What is wrong?</h3>${ch.options.map((o, k) => `<button class="diag-opt" data-opt="${k}">${esc(o.t)}</button>`).join('')}<div class="diag-res"></div></div>` : ''}
        <div class="row" ${ch.kind === 'diagnose' ? 'style="display:none"' : ''}>
          <button class="btn go" data-a="tests">${I.check} Run tests</button>
          ${this.hint < ch.hints.length ? `<button class="btn" data-a="hint">Hint ${this.hint + 1}/${ch.hints.length}</button>` : ''}
          <button class="btn ghost" data-a="solution">Solution</button>
        </div>
        <div class="results"></div>
        ${ch.kind === 'diagnose' && this.hint < ch.hints.length ? `<div class="row"><button class="btn" data-a="hint">Hint ${this.hint + 1}/${ch.hints.length}</button></div>` : ''}`;
      if (ch.kind === 'diagnose') $$('.diag-opt', box).forEach((b) => (b.onclick = () => {
        const o = ch.options[+b.dataset.opt], res = $('.diag-res', box);
        $$('.diag-opt', box).forEach((x) => x.classList.remove('good', 'bad'));
        b.classList.add(o.ok ? 'good' : 'bad');
        if (o.ok) {
          res.innerHTML = `<div class="passed-banner"><span>Found it! ${esc(o.why)}</span>${this.nextCh() ? `<a class="btn small" href="#ch-${this.nextCh().id}">${this.pathOf() ? 'Next in the path' : 'Next challenge'}: ${esc(this.nextCh().title)} ${I.arrow}</a>` : ''}</div><div class="hint"><b>How a technician proves it:</b> ${esc(ch.proof)}</div>`;
          S.ch[ch.id] = 1; save(); this.renderTaskBadge(); toast('Fault found!');
        } else res.innerHTML = `<div class="res bad"><span class="ri">✕</span><div><b>Not this one.</b><div class="rm">${esc(o.why)}</div></div></div>`;
      }));
    }

    runTests() {
      const res = LL.runChallenge(this.lang === 'st' ? (this._lastCompile || this.stProg) : this.prog, this.ch);
      const allOk = res.every((r) => r.ok);
      const box = $('.results', this.el);
      const tags = this.tags();
      box.innerHTML = (allOk ? `<div class="passed-banner"><span>All ${res.length} tests passed. Machine commissioned!</span>${this.nextCh() ? `<a class="btn small" href="#ch-${this.nextCh().id}">${this.pathOf() ? 'Next in the path' : 'Next challenge'}: ${esc(this.nextCh().title)} ${I.arrow}</a>` : ''}</div>` : '') +
        res.map((r, k) => `<div class="res ${r.ok ? 'ok' : 'bad'}"><span class="ri">${r.ok ? '✓' : '✕'}</span><div><b>${esc(r.name)}</b>${r.ok ? '' : `<div class="rm">${esc(r.msg)}</div><ol class="steps-list">${this.ch.tests[k].steps.map((st) => `<li>${esc(LL.describeStep(st, tags))}</li>`).join('')}</ol>`}</div></div>`).join('');
      if (allOk) { S.ch[this.ch.id] = 1; save(); this.renderTaskBadge(); toast('Challenge passed!'); }
      else toast(res.filter((r) => !r.ok).length + ' test(s) failed. See the details.');
      if (this.view !== 'task' && window.innerWidth <= 1000) this.setView('task');
    }
    renderTaskBadge() { const p = $('.chal .plate', this.el); if (p && !$('.chal .chip.ok', this.el)) p.insertAdjacentHTML('afterend', '<span class="chip ok">✓ passed</span>'); }
    clearEditor() {
      // the free Lab: the guard offers "Save it to My programs first", then Undo
      if (!this.ch) {
        const st = this.lang === 'st';
        labReplace({ lang: this.lang, text: st ? this.stTemplate() : 'NAME New program\nRUNG\n', title: st ? 'Empty the ST editor?' : 'Empty your Lab program?', verb: 'Empty it', msg: st ? 'ST editor emptied.' : 'Editor emptied. Undo (↶) brings your program back.' });
        return;
      }
      if (this.lang === 'st') {
        modal('Empty the ST editor?', '<p>Your Structured Text is replaced by an empty program with the I/O of this machine. Copy it first (File) if you want to keep it.</p>', [
          { label: 'Cancel' },
          { label: 'Empty it', cls: 'primary', run: () => { const t = this.stTemplate(); this.src = t; S.st[this.key] = t; saveNow(); $('#st-src', this.el).value = t; this._gutter(); this.compile(); toast('ST editor emptied'); } },
        ]);
        return;
      }
      this.prog = LL.parseProgram('NAME ' + (this.ch ? this.ch.title : 'New program') + '\nRUNG\n');
      this.sel = null; this.m.load(this.prog); this.m.reset(); this.pst = this.initPlant(); this.ctrl = {}; this.buildDevices();
      this.commit('Editor emptied');
      toast('Editor emptied. Undo (↶) brings your program back.');
    }
    nextCh() { const P = this.pathOf(); if (P) { const ids = P.all, i = ids.indexOf(this.ch.id); const nx = ids.slice(i + 1).find((id) => !S.ch[id]) || ids[i + 1]; return nx ? LL.CH_BY_ID[nx] : null; } const i = LL.CHALLENGES.indexOf(this.ch); return LL.CHALLENGES[i + 1]; }
    pathOf() { const pref = own(LL.PATH_BY_ID, S.path) ? LL.PATH_BY_ID[S.path] : LL.PATH_BY_ID.ladder; if (pref && pref.all.includes(this.ch.id)) return pref; return LL.PATHS.find((P) => P.all.includes(this.ch.id)); }

    askSolution() {
      modal('Load the solution?', '<p>Your current program will be replaced. You can get it back with <b>Undo</b>. Try one more hint first? Struggling a little is how it sticks.</p>', [
        { label: 'Load solution', cls: 'primary', run: () => { if (this.lang === 'st') { this.src = this.ch.solution; S.st[this.key] = this.src; saveNow(); $('#st-src', this.el).value = this.src; this._gutter(); this.compile(); toast('Solution loaded. Read it line by line, then run the tests.'); return; } const p = LL.parseProgram(this.ch.solution); p.name = this.ch.title; this.prog = p; this.sel = null; this.m.load(p); this.m.reset(); this.commit('Solution loaded. Study each rung, then run the tests.'); } },
        { label: 'Keep trying' },
      ]);
    }

    fileMenu() {
      if (this.lang === 'st') return this.fileMenuST();
      const ex = [];
      LL.LESSONS.forEach((l) => Object.keys(l.sims || {}).forEach((k) => ex.push({ t: l.title, k, spec: l.sims[k] })));
      const m = modal('Program', `<div class="grid" style="gap:14px">
        <div class="field"><label for="pname">Program name</label><input id="pname" value="${esc(this.prog.name)}"></div>
        <div class="row"><button class="btn small" data-m="new">New empty program</button><button class="btn small" data-m="video">Load the video circuit</button></div>
        <div><div class="panel-title" style="padding-left:0">Text (copy to save or share, paste to import)</div><textarea id="ptext" spellcheck="false">${esc(LL.programToText(this.prog))}</textarea><div class="row" style="margin-top:8px"><button class="btn small" data-m="copy">Copy text</button><button class="btn small primary" data-m="import">Apply text</button></div></div>
        ${this.ch ? '' : `<div><div class="panel-title" style="padding-left:0">Examples from the lessons</div><div class="ex-list">${ex.map((e, i) => `<button data-ex="${i}"><b>${esc(e.t)}</b><small>${esc(e.spec.program.split('\n')[0].replace(/^RUNG\s*/, ''))}</small></button>`).join('')}</div></div>`}
      </div>`, [{ label: 'Done' }]);
      $('#pname', m).oninput = (e) => { this.prog.name = e.target.value || 'Untitled'; clearTimeout(this._nt); this._nt = setTimeout(() => this.commit(), 300); };
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m],[data-ex]'); if (!b) return;
        const k = b.dataset.m;
        if (!this.ch && (k === 'new' || k === 'video')) { m.remove(); labReplace(k === 'new' ? { lang: 'ld', text: 'NAME New program\nRUNG\n', name: 'a new empty program', msg: 'New program' } : { lang: 'ld', text: LL.OPEN_PROGRAMS.video.program, plant: 'cylinders', msg: 'Video circuit loaded' }); return; }
        if (k === 'new') { this.prog = LL.parseProgram('NAME ' + (this.ch ? this.ch.title : 'New program') + '\nRUNG\n'); this.sel = null; this.m.load(this.prog); this.m.reset(); this.commit('New program'); m.remove(); }
        if (k === 'video') { this.prog = LL.parseProgram(LL.OPEN_PROGRAMS.video.program); if (!this.ch) { this.plantId = 'cylinders'; S.plant.lab = 'cylinders'; const ps = $('#plant-sel', this.el); if (ps) ps.value = 'cylinders'; } this.sel = null; this.newMachine(); this.commit('Video circuit loaded'); m.remove(); }
        if (k === 'copy') { const ta = $('#ptext', m); const t = ta.value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied'), () => { ta.focus(); ta.select(); toast('Select-all done: copy with your keyboard'); }); }
        if (k === 'import') { try { const p = LL.parseProgram($('#ptext', m).value); if (!p.rungs.length) p.rungs.push(LL.emptyRung(p.cols)); this.prog = p; this.sel = null; this.m.load(p); this.m.reset(); this.commit('Program imported'); m.remove(); } catch (err) { toast('Could not read it: ' + err.message); } }
        if (b.dataset.ex != null) { const e2 = ex[+b.dataset.ex]; m.remove(); openInLab(Object.assign({ name: e2.t }, e2.spec, { plant: 'panel' }), 'Example loaded on the trainer panel'); }
      });
    }

    showGuide() {
      const g = LL.MACHINE_GUIDE[this.plantId] || { how: [this.plant.blurb] };
      const exCh = g.ex && LL.CH_BY_ID[g.ex], stCh = g.st && LL.CH_BY_ID[g.st];
      const tags = this.tags();
      const io = this.plant.inputs.map((d) => d.kind === 'sel3' ? `<tr><td>${d.addr} / ${d.addr2}</td><td>${esc(d.name)} selector</td><td class="muted">OFF = both 0, MAN = ${d.addr} on, AUTO = ${d.addr2} on</td></tr>` : `<tr><td>${d.addr}</td><td>${esc(tags[d.addr] || d.name)}</td><td class="muted">${d.kind === 'pbnc' ? 'button wired NC: 1 until pressed' : d.kind === 'pb' ? 'button: 1 while pressed' : d.kind === 'sw' ? 'switch' : esc(d.note || 'sensor')}</td></tr>`)
        .concat(this.plant.outputs.map((o) => `<tr><td>${o.addr}</td><td>${esc(tags[o.addr] || o.name)}</td><td class="muted">output</td></tr>`)).join('');
      const proj = exCh || stCh;
      const note = this.ch ? '<p class="muted">You are in a challenge: use <b>Hints</b> and <b>Solution</b> in the task panel.</p>'
        : (proj || g.video) ? `<div class="callout tip" style="margin:12px 0 0">The working program below is the reference solution${proj ? ` of the project <a href="#ch-${proj.id}"><b>${esc(proj.title)}</b></a>` : ''}. Learning tip: try the project yourself first, then load this and compare. Every rung has a comment saying what it does.</div>` : '';
      const btns = [];
      if (!this.ch) {
        if (g.video) btns.push({ label: 'Load working ladder (video circuit)', cls: 'primary', run: () => this.loadExample(null, 'video') });
        if (exCh) btns.push({ label: 'Load working ladder program', cls: g.video ? '' : 'primary', run: () => this.loadExample(exCh, 'ld') });
        if (stCh) btns.push({ label: 'Load working ST program', cls: exCh || g.video ? '' : 'primary', run: () => this.loadExample(stCh, 'st') });
      }
      btns.push({ label: 'Close' });
      modal('How the ' + this.plant.name.toLowerCase() + ' works', `<ul class="guide">${g.how.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>${note}<details style="margin-top:12px"><summary class="panel-title" style="padding-left:0;cursor:pointer">I/O list (${this.plant.inputs.length + this.plant.outputs.length} signals)</summary><div class="tbl"><table>${io}</table></div></details>`, btns);
    }
    loadExample(ch, kind) {
      const msg = 'Working program loaded: press the buttons and watch it run';
      if (kind === 'video') return labReplace({ lang: 'ld', text: LL.OPEN_PROGRAMS.video.program, plant: 'cylinders', msg });
      if (kind === 'st') return labReplace({ lang: 'st', text: ch.solution, plant: ch.plant, name: 'the working ST program', msg });
      const head = (/^NAME /m.test(ch.solution) ? '' : 'NAME ' + ch.title + ' (example)\n') + Object.keys(ch.tags || {}).map((a) => 'TAG ' + a + ' ' + ch.tags[a] + '\n').join('');
      labReplace({ lang: 'ld', text: head + ch.solution, plant: ch.plant, msg });
    }

    fileMenuST() {
      const ex = [];
      LL.LESSONS.forEach((l) => Object.keys(l.sims || {}).forEach((k) => { if (l.sims[k].lang === 'st') ex.push({ t: l.title, spec: Object.assign({ plant: 'panel' }, l.sims[k]) }); }));
      Object.keys(LL.OPEN_PROGRAMS).forEach((k) => { const o = LL.OPEN_PROGRAMS[k]; if (o.lang === 'st') ex.push({ t: 'Video circuit with CASE', spec: o }); });
      const m = modal('Structured Text', `<div class="grid" style="gap:14px">
        <div class="row"><button class="btn small primary" data-m="io">Insert I/O declarations for ${esc(this.plant.name)}</button><button class="btn small" data-m="new">New program</button></div>
        <div><div class="panel-title" style="padding-left:0">Text (copy to save or share, paste to import)</div><textarea id="ptext" spellcheck="false">${esc(this.src)}</textarea><div class="row" style="margin-top:8px"><button class="btn small" data-m="copy">Copy text</button><button class="btn small primary" data-m="import">Apply text</button></div></div>
        ${this.ch ? '' : `<div><div class="panel-title" style="padding-left:0">ST examples</div><div class="ex-list">${ex.map((e, i) => `<button data-ex="${i}"><b>${esc(e.t)}</b><small>${esc(LL.Plants[e.spec.plant || 'panel'].name)}</small></button>`).join('')}</div></div>`}
      </div>`, [{ label: 'Done' }]);
      const setSrc = (t) => { this.src = t; S.st[this.key] = t; saveNow(); $('#st-src', this.el).value = t; this._gutter(); this.compile(); };
      m.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m],[data-ex]'); if (!b) return;
        const k = b.dataset.m;
        if (k === 'io') { const decl = LL.stIoDecls(this.plant, this.tags()); setSrc(/\bVAR\b[\s\S]*?\bEND_VAR\b/i.test(this.src) ? this.src.replace(/\bVAR\b[\s\S]*?\bEND_VAR\b/i, decl) : decl + '\n\n' + this.src); m.remove(); toast('I/O declarations inserted'); }
        if (k === 'new' && !this.ch) { m.remove(); labReplace({ lang: 'st', text: this.stTemplate(), name: 'a new empty program', msg: 'New ST program' }); return; }
        if (k === 'new') { setSrc(this.stTemplate()); m.remove(); }
        if (k === 'copy') { const ta = $('#ptext', m); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast('Copied'), () => { ta.focus(); ta.select(); toast('Select-all done: copy with your keyboard'); }); }
        // Apply text is an edit of your own text: no question, but the free Lab offers Undo
        if (k === 'import') { const was = this.src, t = $('#ptext', m).value; setSrc(t); m.remove(); if (!this.ch && !progEmpty('st', was) && normProg('st', was) !== normProg('st', t)) this.offerUndo({ lang: 'st', text: was, plant: this.plantId, after: normProg('st', t) }); }
        if (b.dataset.ex != null && !this.ch) { const sp = ex[+b.dataset.ex].spec; m.remove(); labReplace({ lang: 'st', text: sp.program, plant: sp.plant || 'panel', name: ex[+b.dataset.ex].t, msg: 'Example loaded' }); return; }
        if (b.dataset.ex != null) { const sp = ex[+b.dataset.ex].spec; m.remove(); this.plantId = sp.plant || 'panel'; S.plant.lab = this.plantId; const ps = $('#plant-sel', this.el); if (ps) ps.value = this.plantId; this.src = sp.program; S.st[this.key] = sp.program; saveNow(); $('#st-src', this.el).value = sp.program; this._gutter(); this.newMachine(); toast('Example loaded'); }
      });
    }

    initPlant() { const st = this.plant.init(); ((this.ch && this.ch.faults) || []).forEach((f) => { if (f.kind === 'plant') st[f.flag] = f.value; }); return st; }

    // one machine step: program outputs → forces → field faults → machine → field faults → forces → PLC inputs
    plantStep(dt) {
      const faults = this.ch && this.ch.faults;
      const F = this.forces || {};
      const Q = LL.plantOutputs(this.plant, this.m);
      for (const a in F) if (a[0] === 'Q') Q[a] = F[a];
      const I = LL.faultIn(this.plant.step(this.pst, this.ctrl, LL.faultOut(Q, faults), dt), faults);
      for (const a in F) if (a[0] === 'I') I[a] = F[a];
      this.I = I;
      this.m.setInputs(I);
    }

    tick(dt) {
      if (!document.body.contains(this.el)) { tickers.delete(this); window.removeEventListener('resize', this._onResize); return; }
      if (this.running && !this.pst.fault && !this.m.error) {
        this.acc += dt * this.speed;
        let n = 0;
        while (this.acc >= 10 && n < 30) {
          this.plantStep(10);
          this.m.scan(10);
          this.acc -= 10; n++;
        }
        if (n >= 30) this.acc = 0;
        this.scanText(this._noticeUntil > performance.now() ? this._notice : 'scan ' + this.m.scanCount + ' · 10 ms');
      }
      // views
      if (this.lang !== 'st') { if (this.blk) { const mon = this.monInst && this.m.monitor(this.monInst); if (mon && mon.trace) this.ladder.update(mon, true); } else this.ladder.update(this.m, true); }
      this.drawPlant();
      const Q = this.m.outputs();
      this.lampEls.forEach((l) => l.classList.toggle('on', !!Q[l.dataset.a]));
      this.ioCells.forEach((c) => { const a = c.dataset.io; const F = this.forces || {}; const v = a in F ? F[a] : a[0] === 'I' || /^(AIW|HC)/.test(a) ? (this.I[a] || 0) : /^(AQW|MW|MD)/.test(a) ? this.m.word(a) : /STR/.test(a) ? "'" + this.m.str(a) + "'" : this.m.bit(a); if (c._v !== v) { c.textContent = v; c.className = v === 1 ? 'v1' : ''; c._v = v; } });
      this.renderVals();
      const fh = $('.fault-host', this.el);
      const f = this.pst.fault ? 'Machine fault: ' + this.pst.fault : this.m.error ? 'PLC in STOP · ' + this.m.error : '';
      if (fh._f !== f) {
        fh._f = f;
        fh.innerHTML = f ? `<div class="fault-banner"><span>⚠ ${esc(f)}</span><button class="btn small" data-a="reset">Reset</button></div>` : '';
      }
    }

    renderVals() {
      if (this.lang === 'st') {
        const html = this.m.listVars().filter((v) => !v.at).map((v) => `<tr><td>${esc(v.name)}</td><td><span class="kind">${esc(v.type || '')}</span></td><td class="${v.on ? 'v1' : ''}" style="white-space:nowrap">${esc(v.value)}</td></tr>`).join('');
        const tb = $('.valrows', this.el);
        if (tb && tb._h !== html) { tb.innerHTML = html; tb._h = html; }
        return;
      }
      const parts = [];
      const used = LL.usedAddrs(this.prog);
      // words used as 16 bits (word logic, BCD, a bit of the word) also show their hex pattern
      const pat = new Set();
      [this.prog.rungs].concat((this.prog.blocks || []).map((b) => b.rungs)).forEach((rs) => rs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && ['WAND', 'WOR', 'WXOR', 'WNOT', 'I_BCD', 'BCD_I'].includes(c.type)) ['a', 'b', 'src', 'dst'].forEach((k) => c[k] && pat.add(c[k])); }))));
      used.forEach((a) => { const mm = /^MW(\d+)\.\d+$/.exec(a); if (mm) pat.add('MW' + mm[1]); });
      [...used].sort().forEach((a) => {
        if (/^T\d+$/.test(a)) { const t = this.m.timers[+a.slice(1)]; parts.push([a + '.ET', t ? (t.et / 1000).toFixed(2) + ' s' : '0.00 s'], [a + ' done', this.m.bit(a)]); }
        else if (/^C\d+$/.test(a)) parts.push([a + '.CV', this.m.word(a + '.CV')], [a + ' done', this.m.bit(a)]);
        else if (/^(MW|AQW|MD)\d+$/.test(a)) { const v = this.m.word(a); parts.push([a, pat.has(a) ? LL.hex4(v) + ' · ' + v : v]); }
        else if (/^MW\d+\.\d+$/.test(a)) parts.push([a, this.m.bit(a)]);
        else if (/^MR\d+$/.test(a)) parts.push([a, LL.fmtReal(this.m.word(a), 4)]);
        else if (/STR\d/.test(a)) parts.push([a, "'" + this.m.str(a) + "'"]);
        else if (/^DB\d/.test(a)) { const e0 = this.m.error; let v = LL.isStrAddr(a) ? "'" + this.m.str(a) + "'" : this.m.read(a); if (!e0) this.m.error = e0; parts.push([a, v]); }
        else if (/^M\d/.test(a)) parts.push([a, this.m.bit(a)]);
      });
      const tags = this.tags();
      const html = parts.map(([a, v]) => `<tr><td>${esc(a)}</td><td>${esc(tags[a] || '')}<span class="kind">${/^M\d/.test(a) ? 'memory' : /^MR\d/.test(a) ? 'REAL' : /^MW\d+\.\d+$/.test(a) ? 'bit of ' + a.split('.')[0] : ''}</span></td><td class="${v === 1 ? 'v1' : ''}">${esc(v)}</td></tr>`).join('');
      const tb = $('.valrows', this.el);
      if (tb && tb._h !== html) { tb.innerHTML = html; tb._h = html; }
    }

    drawPlant() {
      const c = this.ctx;
      if (!this.canvas.offsetParent) return;
      const sc = this.cscale || 1;
      c.setTransform(1, 0, 0, 1, 0, 0);
      const th = plantTheme();
      c.fillStyle = getComputedStyle(this.canvas).backgroundColor || '#fff';
      c.clearRect(0, 0, this.canvas.width, this.canvas.height);
      c.setTransform(sc, 0, 0, sc, 0, 0);
      this.plant.draw(c, this.pst, th, LL.plantOutputs(this.plant, this.m), this.I || {}, this.tags());
    }
  }

  // ───────────────────────── scroll memory ─────────────────────────
  // Back / Forward return to the place you left (long topic pages, the task lists). Each history entry
  // gets a key in history.state; the scroll position per key lives here (and in sessionStorage for a
  // reload). A new page (new entry, no key yet) opens at the top.
  const SCROLL_KEY = 'ladderlab.scroll';
  let scrollMem = {};
  try { scrollMem = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}') || {}; } catch (e) { /* storage unavailable */ }
  let scrollAt = ''; // key of the page on screen; '' while a page is being drawn (its scroll events are not the learner's)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', () => { if (scrollAt) scrollMem[scrollAt] = Math.round(window.scrollY); }, { passive: true });
  window.addEventListener('pagehide', () => {
    const ks = Object.keys(scrollMem); ks.slice(0, Math.max(0, ks.length - 200)).forEach((k) => delete scrollMem[k]);
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrollMem)); } catch (e) { /* storage unavailable */ }
  });
  function entryKey() {
    let k = history.state && history.state.k;
    if (!k) {
      k = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      try { history.replaceState(Object.assign({}, history.state, { k }), ''); } catch (e) { return ''; }
    }
    return k;
  }

  // ───────────────────────── router ─────────────────────────
  let current = '';
  function route() {
    const hsh = (location.hash || '#home').slice(1) || 'home';
    if (hsh === current) return;
    current = hsh;
    scrollAt = '';
    const m = main();
    m.innerHTML = '';
    tickers.clear();
    // typed URLs can name anything: own() keeps #ch-constructor, #topic-toString… away from Object's members
    const isTopic = hsh.startsWith('topic-') && own(LL.TOPIC_BY_ID, hsh.slice(6));
    const chId = hsh.startsWith('ch-') && own(LL.CH_BY_ID, hsh.slice(3)) ? hsh.slice(3) : '';
    let tab = 'home'; // topic pages live on Home ("Explore by topic"): their "All topics" link goes there too
    if (hsh === 'learn' || hsh.startsWith('lesson-') || hsh === 'glossary') tab = 'learn';
    else if (hsh === 'lab') tab = 'lab';
    else if (hsh === 'challenges' || chId) tab = 'challenges';
    else if (hsh === 'path' || hsh.startsWith('path-')) tab = 'path';
    else if (hsh === 'quiz' || hsh.startsWith('quiz-')) tab = 'quiz';
    else if (hsh === 'search' || hsh.startsWith('search-')) tab = 'search';
    $$('[data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    if (hsh === 'learn') pageLearn();
    else if (hsh.startsWith('lesson-')) { const [lid, tid] = hsh.slice(7).split('~'); pageLesson(lid, tid); }
    else if (hsh === 'lab') new Lab({});
    else if (hsh === 'challenges') pageChallenges();
    else if (hsh === 'path' || hsh.startsWith('path-')) pagePath(hsh.slice(5) || S.path || 'ladder');
    else if (chId) new Lab({ challenge: LL.CH_BY_ID[chId] });
    else if (hsh === 'quiz' || hsh.startsWith('quiz-')) pageQuiz(hsh.slice(5));
    else if (hsh === 'glossary') pageGlossary();
    else if (tab === 'search') { let q = hsh.slice(7); try { q = decodeURIComponent(q); } catch (e) { /* keep it raw */ } pageSearch(q); }
    else if (isTopic) pageTopic(hsh.slice(6));
    else pageHome();
    const d = countDone();
    const xp = $('.xp'); if (xp) xp.textContent = d.l + '/' + LL.LESSONS.length + ' lessons · ' + d.c + '/' + LL.CHALLENGES.length + ' challenges';
    // Back / Forward: the remembered place; a new page: the top, or for #topics (Home) "Explore by topic"
    const key = entryKey(), y = key ? scrollMem[key] : 0;
    const place = () => {
      const t = hsh === 'topics' && $('#topics');
      if (y) window.scrollTo(0, y);
      else if (t) t.scrollIntoView();
      else window.scrollTo(0, 0);
    };
    place();
    requestAnimationFrame(() => { if (current !== hsh) return; place(); scrollAt = key; });
  }

  function shell() {
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="top"><div class="wrap">
        <a class="brand" href="#home" aria-label="Ladder Lab home">${BRAND_SVG}<span>Ladder <b>Lab</b></span></a>
        <nav class="nav"><a data-tab="learn" href="#learn">Learn</a><a data-tab="lab" href="#lab">Lab</a><a data-tab="path" href="#path">Path</a><a data-tab="challenges" href="#challenges">Challenges</a><a data-tab="quiz" href="#quiz">Quiz</a><a href="#glossary">Glossary</a></nav>
        <span class="spacer"></span><span class="xp"></span>
        <a class="iconbtn srch-btn" data-tab="search" href="#search" aria-label="Search" title="Search (key /)">${I.search}</a>
        <button class="iconbtn" id="theme-btn" aria-label="Switch light or dark theme"></button>
      </div></header>
      <main id="main"></main>
      <nav class="tabs" aria-label="Sections">
        <a data-tab="home" href="#home">${I.home}Home</a><a data-tab="learn" href="#learn">${I.learn}Learn</a><a data-tab="lab" href="#lab">${I.lab}Lab</a><a data-tab="challenges" href="#challenges">${I.target}Tasks</a><a data-tab="quiz" href="#quiz">${I.quiz}Quiz</a>
      </nav>`);
    const tb = $('#theme-btn');
    const setIcon = () => { tb.innerHTML = isDark() ? I.sun : I.moon; };
    tb.onclick = () => { S.theme = isDark() ? 'light' : 'dark'; save(); applyTheme(); setIcon(); };
    applyTheme(); setIcon();
    // "/" opens Search (not while typing, not over a window)
    document.addEventListener('keydown', (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || $('.modal')) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      if (!/^#search/.test(location.hash)) location.hash = 'search'; else { const i = $('#srch-q'); if (i) i.focus(); }
    });
    // a message that survives the reload after Import
    try { const msg = sessionStorage.getItem('ladderlab.toast'); if (msg) { sessionStorage.removeItem('ladderlab.toast'); setTimeout(() => toast(msg, { ms: 5500 }), 400); } } catch (e) { /* storage unavailable */ }
  }

  shell();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude|anthropic|usercontent/.test(location.host)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
