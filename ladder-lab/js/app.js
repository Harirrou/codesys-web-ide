/* Ladder Lab — application shell: routing, pages, mini simulators, the Lab
 * (editor + machine + tests), quizzes and glossary. No dependencies. */
(function () {
  'use strict';
  const LL = window.LL;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // ───────────────────────── storage ─────────────────────────
  const KEY = 'ladderlab.v1';
  let S = { lessons: {}, ch: {}, chTried: {}, programs: {}, plant: {}, quiz: { best: 0, predict: 0, predictBest: 0 }, theme: '' };
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) { /* storage unavailable */ }
  let saveT = 0;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }, 250); }

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
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = h('<div class="toast" role="status"></div>'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function modal(title, bodyHtml, actions) {
    const m = h(`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="card"><div class="mh"><h2>${esc(title)}</h2><button class="iconbtn" data-x aria-label="Close">✕</button></div><div class="mb">${bodyHtml}</div><div class="row ma"></div></div></div>`);
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-x]')) close(); });
    (actions || []).forEach((a) => {
      const b = h(`<button class="btn ${a.cls || ''}">${esc(a.label)}</button>`);
      b.onclick = () => { if (a.run(m) !== false) close(); };
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
    const cls = kind === 'sw' ? 'sw' : d.color === 'red' || kind === 'pbnc' ? 'red' : d.color === 'black' ? 'black' : d.color === 'blue' ? 'blue' : '';
    const b = h(`<button class="dev ${cls}" type="button" aria-pressed="false"><span class="cap"><i></i></span><span class="lbl">${esc(d.name)}<span class="sub">${esc(d.addr)}${kind === 'pbnc' ? ' · NC' : ''}</span></span></button>`);
    const set = (v) => { ctrl[d.addr] = v; b.classList.toggle('down', !!v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); onChange && onChange(); };
    if (kind === 'sw') b.addEventListener('click', () => set(!ctrl[d.addr]));
    else {
      const down = (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) { /* synthetic event */ } set(true); };
      const up = () => { if (ctrl[d.addr]) set(false); };
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
      this.prog = compactParse(spec.program);
      this.tags = {};
      Object.keys(spec.inputs || {}).forEach((a) => (this.tags[a] = spec.inputs[a].name));
      Object.keys(spec.outputs || {}).forEach((a) => (this.tags[a] = spec.outputs[a]));
      this.m = new LL.Machine(this.prog);
      this.ctrl = {};
      this.running = !spec.step;
      this.acc = 0;
      const el = h(`<div class="mini card">
        <div class="mini-head"><span class="eyebrow"><span class="live-dot"></span>${esc(opts.label || 'Live example · press the buttons')}</span>
          <span class="row"><span class="scanstate"></span>
          ${spec.step ? `<button class="btn small" data-a="run">${I.play} Run</button><button class="btn small" data-a="step">${I.step} Step</button>` : ''}
          <button class="btn small ghost" data-a="reset" title="Reset memory">${I.reset}</button>
          ${opts.noOpen ? '' : `<button class="btn small" data-a="open">Open in Lab ${I.arrow}</button>`}</span></div>
        <div class="ladder-host"></div>
        <div class="mini-io"></div>
        ${spec.note ? `<div class="mini-note">${esc(spec.note)}</div>` : ''}
      </div>`);
      host.replaceWith(el);
      this.el = el;
      this.view = new LL.LadderView($('.ladder-host', el), { fit: true });
      this.view.setProgram(this.prog, this.tags);
      requestAnimationFrame(() => this.view.fit());
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
        if (a === 'run') { this.running = !this.running; b.innerHTML = this.running ? I.pause + ' Pause' : I.play + ' Run'; this.view.setActiveRung(-1); this.phaseText(''); }
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
        o[a] = k === 'pbnc' ? (v ? 0 : 1) : v ? 1 : 0;
      });
      return o;
    }
    phaseText(t) { const s = $('.scanstate', this.el); if (s) s.textContent = t; }
    stepPhase() {
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
      const showPower = this.running || this.m.scanCount > 0;
      this.view.update(this.m, showPower);
      this.lamps.forEach((l) => l.classList.toggle('on', !!this.m.bit(l.dataset.a)));
      const parts = [];
      LL.usedAddrs(this.prog).forEach((a) => {
        if (/^T\d+$/.test(a)) { const t = this.m.timers[+a.slice(1)]; parts.push(`${a}.ET <b>${t ? (t.et / 1000).toFixed(1) : '0.0'}s</b>`); }
        else if (/^C\d+$/.test(a)) parts.push(`${a}.CV <b>${this.m.word(a + '.CV')}</b>`);
        else if (/^MW\d+$/.test(a)) parts.push(`${a} <b>${this.m.word(a)}</b>`);
        else if (/^M\d/.test(a)) parts.push(`${a} <b>${this.m.bit(a)}</b>`);
      });
      const html = parts.map((p) => `<span class="val">${p}</span>`).join('');
      if (html !== this._vh) { this.vals.innerHTML = html; this._vh = html; }
    }
  }

  function openInLab(spec) {
    const lines = ['NAME ' + (spec.name || 'Lesson example'), 'COLS 7'];
    Object.keys(spec.inputs || {}).forEach((a) => lines.push('TAG ' + a + ' ' + spec.inputs[a].name));
    Object.keys(spec.outputs || {}).forEach((a) => lines.push('TAG ' + a + ' ' + spec.outputs[a]));
    const p = LL.parseProgram(spec.program);
    const body = LL.programToText(p).split('\n').filter((l) => !/^(NAME|COLS) /.test(l));
    S.programs.lab = lines.concat(body).join('\n');
    S.plant.lab = spec.plant || 'panel';
    save();
    location.hash = 'lab';
  }

  // ───────────────────────── pages ─────────────────────────
  const main = () => $('#main');
  const lessonIdx = (id) => LL.LESSONS.findIndex((l) => l.id === id);
  const lessonNo = (l) => { const sameLvl = LL.LESSONS.filter((x) => x.level === l.level); return l.level + '.' + String(sameLvl.indexOf(l) + 1).padStart(2, '0'); };
  const countDone = () => ({ l: LL.LESSONS.filter((l) => S.lessons[l.id]).length, c: LL.CHALLENGES.filter((c) => S.ch[c.id]).length });

  function pageHome() {
    const d = countDone();
    const next = LL.LESSONS.find((l) => !S.lessons[l.id]) || LL.LESSONS[0];
    const el = h(`<div class="wrap">
      <section class="hero">
        <div>
          <span class="plate">PLC · Ladder logic trainer</span>
          <h1>Learn ladder logic by <em>wiring it</em>, not memorising it.</h1>
          <p class="lead">Twenty-five short lessons from your first contact to state machines, a PLC simulator with nine animated machines, and challenges that test your program like a commissioning engineer would.</p>
          <div class="row">
            <a class="btn primary" href="#lesson-${next.id}">${d.l ? 'Continue: ' + esc(next.title) : 'Start lesson 1'} ${I.arrow}</a>
            <a class="btn" href="#lab">${I.lab} Open the Lab</a>
          </div>
        </div>
        <div class="card hero-demo"><div class="demo-cap"><span class="eyebrow">Try it now: tap START, then STOP</span></div><div class="demo"></div></div>
      </section>
      <div class="sec-head"><div><h2>Your progress</h2><p>${d.l}/${LL.LESSONS.length} lessons · ${d.c}/${LL.CHALLENGES.length} challenges passed</p></div></div>
      <div class="grid levels-strip"></div>
      <div class="sec-head"><div><h2>Four ways to practise</h2><p>Mix them. Understanding comes from building and breaking things.</p></div></div>
      <div class="grid paths">
        <a class="card path" href="#learn"><span class="ic">${I.learn}</span><h3>Lessons</h3><p>What, why and where, each with live examples you can press.</p></a>
        <a class="card path" href="#lab"><span class="ic">${I.lab}</span><h3>Lab</h3><p>Draw rungs and drive a motor, tank, conveyor, traffic light or the 3 cylinders from your video.</p></a>
        <a class="card path" href="#challenges"><span class="ic">${I.target}</span><h3>Challenges</h3><p>Real tasks with automatic tests, hints and bug hunts.</p></a>
        <a class="card path" href="#quiz"><span class="ic">${I.quiz}</span><h3>Quiz</h3><p>Concept questions plus endless "predict the output" drills.</p></a>
      </div>
    </div>`);
    main().appendChild(el);
    new MiniSim($('.demo', el), { program: 'RUNG Start/stop with seal-in\nNO(I0.3) NO(I0.0) | COIL(Q0.0)\n. NO(Q0.0)', inputs: { 'I0.0': { name: 'START', kind: 'pb' }, 'I0.3': { name: 'STOP', kind: 'pbnc' } }, outputs: { 'Q0.0': 'Motor' } }, { label: 'Live rung', noOpen: true });
    const strip = $('.levels-strip', el);
    LL.LEVELS.forEach((lv) => {
      const ls = LL.LESSONS.filter((l) => l.level === lv.n), dn = ls.filter((l) => S.lessons[l.id]).length;
      strip.appendChild(h(`<a class="card lvl" href="#learn"><span class="n">${lv.n}</span><h4>${esc(lv.name)}</h4><div class="meter"><i style="width:${Math.round((dn / ls.length) * 100)}%"></i></div><span class="muted" style="font-size:.82rem">${dn}/${ls.length} lessons</span></a>`));
    });
  }

  function pageLearn() {
    const el = h(`<div class="wrap"><span class="plate">Course</span><h1 style="margin:10px 0 6px">Lessons</h1><p class="muted" style="margin:0 0 26px;max-width:62ch">Work through the levels in order. Every lesson explains <b>what</b> an instruction is, <b>why</b> it exists and <b>where</b> it is used, with live examples. Then practise in the linked challenges.</p><div class="levels"></div><div class="sec-head"><div><h2>Reference</h2><p>Terms you'll hear on site, in plain words.</p></div><a class="btn" href="#glossary">${I.book} Open glossary</a></div></div>`);
    const lv = $('.levels', el);
    LL.LEVELS.forEach((L) => {
      const b = h(`<section class="level-block"><div class="level-head"><span class="big">${L.n}</span><div><h2>${esc(L.name)}</h2><p>${esc(L.sub)}</p></div></div><div class="lessons"></div></section>`);
      LL.LESSONS.filter((l) => l.level === L.n).forEach((l) => {
        $('.lessons', b).appendChild(h(`<a class="card lesson-card" href="#lesson-${l.id}"><span class="no">${lessonNo(l)}</span><span class="body"><h4>${esc(l.title)}</h4><p>${esc(l.summary)}</p></span><span class="check ${S.lessons[l.id] ? 'done' : ''}">${S.lessons[l.id] ? I.check : ''}</span></a>`));
      });
      lv.appendChild(b);
    });
    main().appendChild(el);
  }

  function pageLesson(id) {
    const i = lessonIdx(id);
    if (i < 0) return pageLearn();
    const l = LL.LESSONS[i], prev = LL.LESSONS[i - 1], next = LL.LESSONS[i + 1];
    const lvl = LL.LEVELS[l.level - 1];
    let body = l.body.replace(/\[\[sim:(\w+)\]\]/g, (m, k) => `<div class="sim-ph" data-sim="${k}"></div>`);
    const el = h(`<div class="wrap"><div class="lesson">
      <article>
        <a class="btn small ghost" href="#learn">${I.back} All lessons</a>
        <div class="eyebrow" style="margin-top:14px">Lesson ${lessonNo(l)} · Level ${l.level}: ${esc(lvl.name)} · ${l.min} min</div>
        <h1>${esc(l.title)}</h1>
        <p class="sum">${esc(l.summary)}</p>
        <div class="prose">${body}</div>
        <div class="lesson-nav">
          ${prev ? `<a class="btn" href="#lesson-${prev.id}">${I.back} ${esc(prev.title)}</a>` : '<span></span>'}
          <button class="btn go" data-done>${S.lessons[l.id] ? 'Completed ✓' : 'Mark complete'}${next ? ' & continue' : ''}</button>
        </div>
      </article>
      <aside><div class="card">
        <h4>Remember</h4><ul>${l.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${l.mistakes && l.mistakes.length ? `<h4>Common mistakes</h4><ul>${l.mistakes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${l.challenges.length ? '<h4>Practise</h4>' + l.challenges.map((c) => { const ch = LL.CH_BY_ID[c]; return `<a class="ch-link" href="#ch-${c}">${I.target}<span>${esc(ch.title)}</span>${S.ch[c] ? '<span class="chip ok">passed</span>' : ''}</a>`; }).join('') : ''}
        <a class="ch-link" href="#lab">${I.lab}<span>Free play in the Lab</span></a>
      </div></aside>
    </div></div>`);
    main().appendChild(el);
    $$('.sim-ph', el).forEach((ph) => { const spec = l.sims[ph.dataset.sim]; if (spec) new MiniSim(ph, Object.assign({ name: l.title }, spec)); });
    $$('[data-open]', el).forEach((o) => {
      const spec = LL.OPEN_PROGRAMS[o.dataset.open];
      const b = h(`<button class="btn primary">${I.lab} Open the video circuit in the Lab</button>`);
      b.onclick = () => { S.programs.lab = spec.program; S.plant.lab = spec.plant; save(); location.hash = 'lab'; };
      o.appendChild(b);
    });
    $('[data-done]', el).onclick = () => { S.lessons[l.id] = 1; save(); if (next) location.hash = 'lesson-' + next.id; else { toast('Course complete. Well done!'); location.hash = 'learn'; } };
  }

  function pageChallenges() {
    const el = h(`<div class="wrap"><span class="plate">Practice</span><h1 style="margin:10px 0 6px">Challenges</h1><p class="muted" style="margin:0 0 20px;max-width:64ch">Each challenge gives you a machine and a job. Build the ladder, test it by hand, then press <b>Run tests</b>: the checker presses buttons, waits, and verifies the outputs like a commissioning engineer. Stuck? Hints first, solution last.</p><div class="lv"></div></div>`);
    LL.LEVELS.forEach((L) => {
      const list = LL.CHALLENGES.filter((c) => c.level === L.n);
      if (!list.length) return;
      const b = h(`<section class="level-block"><div class="level-head"><span class="big">${L.n}</span><div><h2>${esc(L.name)}</h2></div></div><div class="ch-grid"></div></section>`);
      list.forEach((c) => {
        const plain = c.brief.replace(/<[^>]+>/g, '');
        $('.ch-grid', b).appendChild(h(`<a class="card ch-card" href="#ch-${c.id}"><div class="top-line"><span class="eyebrow">${esc(LL.Plants[c.plant].name)}</span>${S.ch[c.id] ? '<span class="chip ok">✓ passed</span>' : S.chTried[c.id] ? '<span class="chip">in progress</span>' : ''}</div><h4>${esc(c.title)}</h4><p>${esc(plain.length > 130 ? plain.slice(0, 128) + '…' : plain)}</p></a>`));
      });
      $('.lv', el).appendChild(b);
    });
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
    draw('');
    main().appendChild(el);
  }

  // ───────────────────────── quiz ─────────────────────────
  function pageQuiz() {
    const el = h(`<div class="wrap quiz-wrap"><span class="plate">Drill</span><h1 style="margin:10px 0 6px">Quiz</h1><p class="muted" style="margin:0 0 20px">Short sessions, often. That's how it sticks.</p><div class="grid modes"></div><div class="qarea" style="margin-top:20px"></div></div>`);
    const modes = $('.modes', el);
    const area = $('.qarea', el);
    [['predict', 'Predict the output', 'Random rungs and input states. Will the lamp light? Endless.', 'Best streak ' + (S.quiz.predictBest || 0)],
      ['concept', 'Concept check', '10 questions across all levels, with explanations.', 'Best score ' + (S.quiz.best || 0) + '/10']].forEach(([k, t, d, s]) => {
      const b = h(`<button class="card path" style="text-align:left;cursor:pointer"><span class="ic">${k === 'predict' ? I.lab : I.quiz}</span><h3>${t}</h3><p>${d}</p><span class="chip">${s}</span></button>`);
      b.onclick = () => (k === 'predict' ? predict(area) : concept(area));
      modes.appendChild(b);
    });
    main().appendChild(el);
    predict(area);
  }

  function concept(area) {
    const qs = LL.QUIZ.slice().sort(() => Math.random() - 0.5).slice(0, 10);
    let i = 0, score = 0;
    const show = () => {
      if (i >= qs.length) {
        S.quiz.best = Math.max(S.quiz.best || 0, score); save();
        area.innerHTML = `<div class="card qcard"><span class="eyebrow">Result</span><h2>${score} / ${qs.length}</h2><p class="muted">${score >= 8 ? 'Excellent. You can explain this to someone else now.' : score >= 5 ? 'Good. Re-read the lessons behind the ones you missed.' : 'Keep going. Each lesson\'s "Remember" box is the fastest review.'}</p><div class="row"><button class="btn primary" data-again>Another round</button></div></div>`;
        $('[data-again]', area).onclick = () => concept(area);
        return;
      }
      const q = qs[i];
      area.innerHTML = `<div class="card qcard"><div class="row" style="justify-content:space-between"><span class="eyebrow">Question ${i + 1}/${qs.length} · Level ${q.l}</span><span class="scorebar">Score <b>${score}</b></span></div><h2>${esc(q.q)}</h2><div class="opts">${q.a.map((a, k) => `<button class="opt" data-k="${k}"><span class="k">${'ABCD'[k]}</span>${esc(a)}</button>`).join('')}</div><div class="fb"></div></div>`;
      $$('.opt', area).forEach((b) => (b.onclick = () => {
        if (area.dataset.lock) return;
        area.dataset.lock = 1;
        const k = +b.dataset.k, ok = k === q.c;
        if (ok) score++;
        b.classList.add(ok ? 'right' : 'wrong');
        $$('.opt', area)[q.c].classList.add('right');
        $('.fb', area).innerHTML = `<div class="why"><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${esc(q.why)}</div><div class="row" style="margin-top:12px"><button class="btn primary" data-n>${i + 1 < qs.length ? 'Next' : 'See result'} ${I.arrow}</button></div>`;
        $('[data-n]', area).onclick = () => { delete area.dataset.lock; i++; show(); };
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
    [['NO', '-| |-'], ['NC', '-|/|-'], ['P', 'P edge'], ['N', 'N edge'], ['CMP', 'Compare'], ['WIRE', 'Wire'], ['NOT', 'NOT']],
    [['COIL', '( )'], ['SET', '(S)'], ['RST', '(R)'], ['NCOIL', '(/)']],
    [['TON', 'TON'], ['TOF', 'TOF'], ['TP', 'TP'], ['RTO', 'RTO'], ['CTU', 'CTU'], ['CTD', 'CTD']],
    [['MOV', 'MOV'], ['ADD', 'ADD'], ['SUB', 'SUB'], ['MUL', 'MUL'], ['DIV', 'DIV']],
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
    }

    get plant() { return LL.Plants[this.plantId]; }
    tags() { return Object.assign({}, LL.plantTags(this.plantId), (this.ch && this.ch.tags) || {}, this.prog.tags || {}); }

    newMachine() {
      this.m = new LL.Machine(this.prog);
      this.pst = this.plant.init();
      this.ctrl = this.ctrl || {};
      this.I = LL.plantDevices(this.plant, this.ctrl);
      this.buildDevices();
      this.refresh();
    }

    build() {
      const ch = this.ch;
      const el = h(`<div class="wrap"><div class="lab" data-view="${ch ? 'task' : 'program'}">
        <div class="lab-main">
          <div class="seg" role="tablist">${ch ? '<button data-v="task">Task</button>' : ''}<button data-v="program">Program</button><button data-v="machine">Machine</button></div>
          <div class="card lab-bar">
            <span class="title" title="${esc(this.prog.name)}">${ch ? '' : esc(this.prog.name)}</span>
            <button class="btn small runbtn" data-a="run"></button>
            <button class="btn small" data-a="step" title="Execute one scan phase">${I.step}<span class="hide-s">Step</span></button>
            <button class="btn small" data-a="reset" title="Reset PLC memory and machine">${I.reset}</button>
            <button class="btn small" data-a="speed" title="Simulation speed">1×</button>
            <button class="btn small" data-a="zoom" title="Zoom: fit width or 100 %">⤢</button>
            <span class="sep"></span>
            <button class="btn small" data-a="undo" title="Undo">${I.undo}</button>
            <button class="btn small" data-a="redo" title="Redo">${I.redo}</button>
            <button class="btn small" data-a="st" title="Show Structured Text">${I.code} ST</button>
            <button class="btn small" data-a="file" title="New, examples, import/export">${I.file} File</button>
            <span class="scanstate"></span>
          </div>
          <div class="fault-host"></div>
          <div class="card prog-card only-program"><div class="prog-scroll"><div class="ladder-host"></div></div><div class="palette"></div></div>
          <div class="card inspector only-program"></div>
          <div class="card issues only-program" hidden></div>
        </div>
        <div class="lab-side">
          ${ch ? '<div class="card chal only-task"></div>' : ''}
          <div class="card machine only-machine">
            <div class="machine-head"><span class="eyebrow">Machine</span>${ch ? `<b>${esc(this.plant.name)}</b>` : `<select id="plant-sel" aria-label="Machine">${LL.PLANT_ORDER.map((p) => `<option value="${p}">${esc(LL.Plants[p].name)}</option>`).join('')}</select>`}</div>
            <canvas width="640" height="360" aria-label="Machine animation"></canvas>
            <p class="blurb"></p>
            <div class="dock desktop-only"></div>
          </div>
          <details class="card details-card only-machine" open><summary>I/O &amp; values</summary><table class="iotable"></table></details>
        </div>
        <div class="dock dock-sticky mobile-only"></div>
      </div></div>`);
      main().appendChild(el);
      this.el = el;
      this.root = $('.lab', el);
      // mobile-only / desktop-only helpers
      const style = document.getElementById('lab-mq') || document.head.appendChild(h('<style id="lab-mq">.mobile-only{display:none!important}@media(max-width:1000px){.mobile-only{display:flex!important}.desktop-only{display:none!important}}.hide-s{margin-left:2px}@media(max-width:520px){.hide-s{display:none}}</style>'));
      void style;
      this.ladder = new LL.LadderView($('.ladder-host', el), { editable: true, zoom: window.innerWidth < 700 ? 'fit' : undefined, onPick: (p) => this.pick(p) });
      this.canvas = $('canvas', el);
      this.ctx = this.canvas.getContext('2d');
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
      this.setView(ch ? 'task' : 'program');
      const ps = $('#plant-sel', el);
      if (ps) { ps.value = this.plantId; ps.onchange = () => { this.plantId = ps.value; S.plant.lab = ps.value; save(); this.newMachine(); toast('Machine: ' + this.plant.name); }; }
      if (ch) this.renderTask();
      this.updateRunBtn();
      this.resizeCanvas();
      this._onResize = () => { this.resizeCanvas(); this.ladder.fit(); };
      window.addEventListener('resize', this._onResize);
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
      const devs = this.plant.inputs.filter((d) => d.kind !== 'sensor');
      const tags = this.tags();
      this.devButtons = [];
      $$('.dock', this.el).forEach((dock) => {
        dock.innerHTML = '';
        devs.forEach((d) => { const b = deviceEl(Object.assign({}, d, { name: tags[d.addr] || d.name }), this.ctrl); dock.appendChild(b); this.devButtons.push(b); });
        this.plant.actions.forEach((a) => {
          const b = h(`<button class="dev act" type="button"><span class="lbl">${esc(a.label)}<span class="sub">${a.toggle ? 'toggle' : 'event'}</span></span></button>`);
          b.onclick = () => { a.run(this.pst); if (a.toggle) $$('.dev.act', this.el).filter((x) => x.textContent.startsWith(a.label)).forEach((x) => x.classList.toggle('down')); };
          dock.appendChild(b);
        });
        const lamps = h('<div class="lamps"></div>');
        this.plant.outputs.forEach((o) => lamps.appendChild(lampEl(o.addr, tags[o.addr] || o.name)));
        dock.appendChild(lamps);
      });
      this.lampEls = $$('.dock .lamp', this.el);
      $('.blurb', this.el).textContent = this.plant.blurb;
      // IO table
      const rows = this.plant.inputs.map((d) => `<tr><td>${d.addr}</td><td>${esc(tags[d.addr] || d.name)}<span class="kind">${d.kind === 'pbnc' ? 'button, wired NC' : d.kind === 'pb' ? 'button, NO' : d.kind === 'sw' ? 'switch' : 'sensor'}</span>${d.note ? `<div class="kind" style="margin:0">${esc(d.note)}</div>` : ''}</td><td data-io="${d.addr}">0</td></tr>`)
        .concat(this.plant.outputs.map((o) => `<tr><td>${o.addr}</td><td>${esc(tags[o.addr] || o.name)}<span class="kind">output</span></td><td data-io="${o.addr}">0</td></tr>`));
      $('.iotable', this.el).innerHTML = rows.join('') + '<tbody class="valrows"></tbody>';
      this.ioCells = $$('[data-io]', this.el);
    }

    setTool(k) {
      this.tool = k;
      $$('.tool', this.el).forEach((b) => b.classList.toggle('on', b.dataset.tool === k));
    }

    // ── editing ──
    commit(msg) {
      const t = LL.programToText(this.prog);
      if (t !== this.hist[this.hi]) { this.hist = this.hist.slice(0, this.hi + 1); this.hist.push(t); if (this.hist.length > 80) this.hist.shift(); this.hi = this.hist.length - 1; }
      S.programs[this.key] = t;
      if (this.ch) S.chTried[this.ch.id] = 1;
      save();
      this.m.load(this.prog);
      this.refresh();
      if (msg) toast(msg);
    }
    restore(t) { this.prog = LL.parseProgram(t); this.sel = null; S.programs[this.key] = t; save(); this.m.load(this.prog); this.m.reset(); this.refresh(); }

    usedNums(re) { const s = new Set(); this.prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.addr) { const m = re.exec(c.addr); if (m) s.add(+m[1]); } }))); return s; }
    defaultFor(type) {
      const used = LL.usedAddrs(this.prog);
      if (LL.TIMERS.includes(type)) { const u = this.usedNums(/^T(\d+)$/); let n = 0; while (u.has(n)) n++; return { addr: 'T' + n, pt: 3000 }; }
      if (LL.COUNTERS.includes(type)) { const u = this.usedNums(/^C(\d+)$/); let n = 0; while (u.has(n)) n++; return { addr: 'C' + n, pv: 5 }; }
      if (['COIL', 'NCOIL', 'SET', 'RST'].includes(type)) { const o = this.plant.outputs.find((x) => !used.has(x.addr)); return { addr: o ? o.addr : 'M0.0' }; }
      if (['NO', 'NC', 'P', 'N'].includes(type)) { const o = this.plant.inputs.find((x) => !used.has(x.addr)) || this.plant.inputs[0]; return { addr: o.addr }; }
      return {};
    }

    pick(p) {
      const rung = this.prog.rungs[p.i];
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
      const P = this.prog;
      switch (a) {
        case 'run': this.running = !this.running; if (this.running) { this.ladder.setActiveRung(-1); this.scanText(''); } this.updateRunBtn(); break;
        case 'step': this.running = false; this.updateRunBtn(); this.stepPhase(); break;
        case 'reset': this.m.reset(); this.pst = this.plant.init(); this.acc = 0; Object.keys(this.ctrl).forEach((k) => (this.ctrl[k] = false)); $$('.dev', this.el).forEach((d) => d.classList.remove('down')); this.ladder.setActiveRung(-1); this.scanText(''); toast('PLC memory and machine reset'); break;
        case 'speed': this.speed = this.speed === 1 ? 0.25 : this.speed === 0.25 ? 0.1 : 1; btn.textContent = this.speed === 1 ? '1×' : this.speed === 0.25 ? '¼×' : '⅒×'; toast('Simulation speed ' + btn.textContent); break;
        case 'zoom': this.ladder.opts.zoom = this.ladder.opts.zoom === 'fit' ? 1 : 'fit'; this.ladder.fit(); toast(this.ladder.opts.zoom === 'fit' ? 'Zoom: fit width' : 'Zoom: 100 %'); break;
        case 'undo': if (this.hi > 0) { this.hi--; this.restore(this.hist[this.hi]); } break;
        case 'redo': if (this.hi < this.hist.length - 1) { this.hi++; this.restore(this.hist[this.hi]); } break;
        case 'st': modal('Structured Text', `<p class="muted" style="margin:0 0 10px">The same logic written as IEC 61131-3 Structured Text, as in CODESYS. Reading both side by side is a great way to learn.</p><pre>${esc(LL.toST(Object.assign({}, P, { tags: this.tags() })))}</pre>`, [{ label: 'Close' }]); break;
        case 'file': this.fileMenu(); break;
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
    scanText(t) { $('.scanstate', this.el).textContent = t; }

    stepPhase() {
      const n = this.prog.rungs.length;
      if (this.m.phase === 0) { this.I = this.plant.step(this.pst, this.ctrl, this.m.outputs(), 10); this.m.setInputs(this.I); }
      const ph = this.m.stepPhase(10);
      this.ladder.setActiveRung(ph >= 1 && ph <= n ? ph - 1 : -1);
      this.scanText(ph === 0 ? 'Scan ' + this.m.scanCount + ' · ① read inputs' : ph <= n ? '② solved rung ' + ph + ' of ' + n : '③ wrote outputs');
    }

    refresh() {
      this.ladder.setProgram(this.prog, this.tags());
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
        $('[data-a2="addrung"]', box).onclick = () => { this.prog.rungs.push(LL.emptyRung(this.prog.cols)); this.sel = { kind: 'rung', i: this.prog.rungs.length - 1 }; this.commit('Rung added'); };
        return;
      }
      if (s.kind === 'rung') {
        const r = this.prog.rungs[s.i];
        box.innerHTML = `<div class="ih"><h3>Rung ${s.i + 1}</h3><span class="muted" style="font-size:.85rem">${r.rows} row${r.rows > 1 ? 's' : ''}</span></div>
          <div class="field"><label for="rc">Comment: say why this rung exists</label><input id="rc" value="${esc(r.comment)}" placeholder="e.g. Motor start/stop latch"></div>
          <div class="row"><button class="btn small" data-a="r-above">+ Rung above</button><button class="btn small" data-a="r-add">+ Rung below</button><button class="btn small" data-a="r-row">+ Branch row</button><button class="btn small" data-a="r-unrow">− Last row</button><button class="btn small" data-a="r-up">↑</button><button class="btn small" data-a="r-down">↓</button><button class="btn small" data-a="r-dup">Duplicate</button><button class="btn small" data-a="r-del" style="color:var(--danger)">Delete rung</button></div>`;
        $('#rc', box).oninput = (e) => { r.comment = e.target.value; clearTimeout(this._ct); this._ct = setTimeout(() => this.commit(), 400); };
        return;
      }
      const rung = this.prog.rungs[s.i];
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
      const mem = [...new Set(['M0.0', 'M0.1', 'M0.2', 'M0.3'].concat(used.filter((a) => /^M\d/.test(a))))].sort().map((a) => [a, nameOf(a)]);
      const tim = used.filter((a) => /^T\d+$/.test(a)).map((a) => [a, '']);
      const ctr = used.filter((a) => /^C\d+$/.test(a)).map((a) => [a, '']);
      const words = [...new Set(['MW0'].concat(used.filter((a) => /^MW/.test(a)), used.filter((a) => /^C\d+$/.test(a)).map((a) => a + '.CV'), used.filter((a) => /^T\d+$/.test(a)).map((a) => a + '.ET')))].map((a) => [a, '']);
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
        else {
          let a = LL.norm(v);
          const byName = Object.keys(tags).find((k) => tags[k] && tags[k].toUpperCase() === String(v).trim().toUpperCase());
          if (byName) a = byName;
          const ok = f === 'addr' ? (LL.TIMERS.includes(T) ? /^T\d{1,2}$/.test(a) : LL.COUNTERS.includes(T) ? /^C\d{1,2}$/.test(a) : LL.isBitAddr(a) || (T === 'RST' && /^MW\d+$/.test(a))) : f === 'dst' ? /^MW\d+$/.test(a) : LL.isWordAddr(a);
          inp && inp.classList.toggle('bad', !ok);
          if (!ok) return;
          cell[f] = a;
          if (f === 'addr') { const sym = $('#f-sym', box); if (sym) sym.value = tags[a] || ''; }
        }
        inp && inp.classList.remove('bad');
        clearTimeout(this._ft); this._ft = setTimeout(() => { this.commit(); }, 120);
      };
      $$('[data-f]', box).forEach((inp) => { inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => apply(inp.dataset.f, inp.value, inp)); });
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
      const io = plant.inputs.map((d) => `<tr><td>${d.addr}</td><td>${esc(tags[d.addr] || d.name)} <span class="kind">${d.kind === 'pbnc' ? 'NC button' : d.kind === 'pb' ? 'NO button' : d.kind === 'sw' ? 'switch' : 'sensor'}</span></td></tr>`)
        .concat(plant.outputs.map((o) => `<tr><td>${o.addr}</td><td>${esc(tags[o.addr] || o.name)} <span class="kind">output</span></td></tr>`)).join('');
      box.innerHTML = `<div class="row" style="justify-content:space-between"><span class="plate">Challenge · Level ${ch.level}</span>${S.ch[ch.id] ? '<span class="chip ok">✓ passed</span>' : ''}</div>
        <h2>${esc(ch.title)}</h2>
        <p class="brief">${ch.brief}</p>
        <details class="card" style="background:var(--surface-2)"><summary class="panel-title" style="cursor:pointer">I/O list · ${esc(plant.name)}</summary><table class="iotable">${io}</table></details>
        ${ch.hints.slice(0, this.hint).map((t, k) => `<div class="hint"><b>Hint ${k + 1}.</b> ${esc(t)}</div>`).join('')}
        <div class="row">
          <button class="btn go" data-a="tests">${I.check} Run tests</button>
          ${this.hint < ch.hints.length ? `<button class="btn" data-a="hint">Hint ${this.hint + 1}/${ch.hints.length}</button>` : ''}
          <button class="btn ghost" data-a="solution">Solution</button>
        </div>
        <div class="results"></div>`;
    }

    runTests() {
      const res = LL.runChallenge(this.prog, this.ch);
      const allOk = res.every((r) => r.ok);
      const box = $('.results', this.el);
      const tags = this.tags();
      box.innerHTML = (allOk ? `<div class="passed-banner"><span>All ${res.length} tests passed. Machine commissioned!</span>${this.nextCh() ? `<a class="btn small" href="#ch-${this.nextCh().id}">Next challenge ${I.arrow}</a>` : ''}</div>` : '') +
        res.map((r, k) => `<div class="res ${r.ok ? 'ok' : 'bad'}"><span class="ri">${r.ok ? '✓' : '✕'}</span><div><b>${esc(r.name)}</b>${r.ok ? '' : `<div class="rm">${esc(r.msg)}</div><ol class="steps-list">${this.ch.tests[k].steps.map((st) => `<li>${esc(LL.describeStep(st, tags))}</li>`).join('')}</ol>`}</div></div>`).join('');
      if (allOk) { S.ch[this.ch.id] = 1; save(); this.renderTaskBadge(); toast('Challenge passed!'); }
      else toast(res.filter((r) => !r.ok).length + ' test(s) failed. See the details.');
      if (this.view !== 'task' && window.innerWidth <= 1000) this.setView('task');
    }
    renderTaskBadge() { const p = $('.chal .plate', this.el); if (p && !$('.chal .chip.ok', this.el)) p.insertAdjacentHTML('afterend', '<span class="chip ok">✓ passed</span>'); }
    nextCh() { const i = LL.CHALLENGES.indexOf(this.ch); return LL.CHALLENGES[i + 1]; }

    askSolution() {
      modal('Load the solution?', '<p>Your current program will be replaced. You can get it back with <b>Undo</b>. Try one more hint first? Struggling a little is how it sticks.</p>', [
        { label: 'Load solution', cls: 'primary', run: () => { const p = LL.parseProgram(this.ch.solution); p.name = this.ch.title; this.prog = p; this.sel = null; this.m.load(p); this.m.reset(); this.commit('Solution loaded. Study each rung, then run the tests.'); } },
        { label: 'Keep trying' },
      ]);
    }

    fileMenu() {
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
        if (k === 'new') { this.prog = LL.parseProgram('NAME ' + (this.ch ? this.ch.title : 'New program') + '\nRUNG\n'); this.sel = null; this.m.load(this.prog); this.m.reset(); this.commit('New program'); m.remove(); }
        if (k === 'video') { this.prog = LL.parseProgram(LL.OPEN_PROGRAMS.video.program); if (!this.ch) { this.plantId = 'cylinders'; S.plant.lab = 'cylinders'; const ps = $('#plant-sel', this.el); if (ps) ps.value = 'cylinders'; } this.sel = null; this.newMachine(); this.commit('Video circuit loaded'); m.remove(); }
        if (k === 'copy') { const ta = $('#ptext', m); const t = ta.value; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied'), () => { ta.focus(); ta.select(); toast('Select-all done: copy with your keyboard'); }); }
        if (k === 'import') { try { const p = LL.parseProgram($('#ptext', m).value); if (!p.rungs.length) p.rungs.push(LL.emptyRung(p.cols)); this.prog = p; this.sel = null; this.m.load(p); this.m.reset(); this.commit('Program imported'); m.remove(); } catch (err) { toast('Could not read it: ' + err.message); } }
        if (b.dataset.ex != null) { const e2 = ex[+b.dataset.ex]; openInLab(Object.assign({ name: e2.t }, e2.spec)); m.remove(); this.prog = LL.parseProgram(S.programs.lab); this.plantId = 'panel'; const ps = $('#plant-sel', this.el); if (ps) ps.value = 'panel'; this.sel = null; this.newMachine(); this.commit('Example loaded on the trainer panel'); }
      });
    }

    tick(dt) {
      if (!document.body.contains(this.el)) { tickers.delete(this); window.removeEventListener('resize', this._onResize); return; }
      if (this.running && !this.pst.fault) {
        this.acc += dt * this.speed;
        let n = 0;
        while (this.acc >= 10 && n < 30) {
          this.I = this.plant.step(this.pst, this.ctrl, this.m.outputs(), 10);
          this.m.setInputs(this.I);
          this.m.scan(10);
          this.acc -= 10; n++;
        }
        if (n >= 30) this.acc = 0;
        this.scanText('scan ' + this.m.scanCount + ' · 10 ms');
      }
      // views
      this.ladder.update(this.m, true);
      this.drawPlant();
      const Q = this.m.outputs();
      this.lampEls.forEach((l) => l.classList.toggle('on', !!Q[l.dataset.a]));
      this.ioCells.forEach((c) => { const a = c.dataset.io; const v = a[0] === 'I' ? (this.I[a] || 0) : this.m.bit(a); if (c._v !== v) { c.textContent = v; c.className = v ? 'v1' : ''; c._v = v; } });
      this.renderVals();
      const fh = $('.fault-host', this.el);
      const f = this.pst.fault || '';
      if (fh._f !== f) {
        fh._f = f;
        fh.innerHTML = f ? `<div class="fault-banner"><span>⚠ Machine fault: ${esc(f)}</span><button class="btn small" data-a="reset">Reset machine</button></div>` : '';
      }
    }

    renderVals() {
      const parts = [];
      const used = LL.usedAddrs(this.prog);
      [...used].sort().forEach((a) => {
        if (/^T\d+$/.test(a)) { const t = this.m.timers[+a.slice(1)]; parts.push([a + '.ET', t ? (t.et / 1000).toFixed(2) + ' s' : '0.00 s'], [a + ' done', this.m.bit(a)]); }
        else if (/^C\d+$/.test(a)) parts.push([a + '.CV', this.m.word(a + '.CV')], [a + ' done', this.m.bit(a)]);
        else if (/^MW\d+$/.test(a)) parts.push([a, this.m.word(a)]);
        else if (/^M\d/.test(a)) parts.push([a, this.m.bit(a)]);
      });
      const tags = this.tags();
      const html = parts.map(([a, v]) => `<tr><td>${esc(a)}</td><td>${esc(tags[a] || '')}<span class="kind">${/^M\d/.test(a) ? 'memory' : ''}</span></td><td class="${v === 1 ? 'v1' : ''}">${v}</td></tr>`).join('');
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
      this.plant.draw(c, this.pst, th, this.m.outputs(), this.I || {}, this.tags());
    }
  }

  // ───────────────────────── router ─────────────────────────
  let current = '';
  function route() {
    const hsh = (location.hash || '#home').slice(1) || 'home';
    if (hsh === current) return;
    current = hsh;
    const m = main();
    m.innerHTML = '';
    tickers.clear();
    let tab = 'home';
    if (hsh === 'learn' || hsh.startsWith('lesson-') || hsh === 'glossary') tab = 'learn';
    else if (hsh === 'lab') tab = 'lab';
    else if (hsh === 'challenges' || hsh.startsWith('ch-')) tab = 'challenges';
    else if (hsh === 'quiz') tab = 'quiz';
    $$('[data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    if (hsh === 'learn') pageLearn();
    else if (hsh.startsWith('lesson-')) pageLesson(hsh.slice(7));
    else if (hsh === 'lab') new Lab({});
    else if (hsh === 'challenges') pageChallenges();
    else if (hsh.startsWith('ch-') && LL.CH_BY_ID[hsh.slice(3)]) new Lab({ challenge: LL.CH_BY_ID[hsh.slice(3)] });
    else if (hsh === 'quiz') pageQuiz();
    else if (hsh === 'glossary') pageGlossary();
    else pageHome();
    const d = countDone();
    const xp = $('.xp'); if (xp) xp.textContent = d.l + '/' + LL.LESSONS.length + ' lessons · ' + d.c + '/' + LL.CHALLENGES.length + ' challenges';
    window.scrollTo(0, 0);
  }

  function shell() {
    document.body.insertAdjacentHTML('afterbegin', `
      <header class="top"><div class="wrap">
        <a class="brand" href="#home" aria-label="Ladder Lab home">${BRAND_SVG}<span>Ladder <b>Lab</b></span></a>
        <nav class="nav"><a data-tab="learn" href="#learn">Learn</a><a data-tab="lab" href="#lab">Lab</a><a data-tab="challenges" href="#challenges">Challenges</a><a data-tab="quiz" href="#quiz">Quiz</a><a href="#glossary">Glossary</a></nav>
        <span class="spacer"></span><span class="xp"></span>
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
  }

  shell();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude|anthropic|usercontent/.test(location.host)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
