/* Ladder Lab — Circuit Lab pages: the task list (#circuits) and the bench (#circuit-<id>).
 * The bench draws the control circuit as IEC current paths (L on top, N at the bottom), lets you place parts and
 * links, powers it on with live current flow, shows the machine it controls, and runs the task tests.
 * Engine: circuit.js (LL.EC). */
(function () {
  const LL = (window.LL = window.LL || {}), EC = LL.EC;
  if (!EC) return;
  const STORE = 'll-hw-circuit';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const load = () => { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; d.done = d.done || {}; d.circ = d.circ || {}; return d; } catch (e) { return { done: {}, circ: {} }; } };
  const save = (d) => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* private mode */ } };
  const LEVELS = { 1: 'First circuits', 2: 'Motor basics', 3: 'Interlocks and timers', 4: 'Real projects', 5: 'Master' };
  const KIND = { pb: 'push button', es: 'emergency stop', sel: 'switch', ls: 'switch moved by the machine', k: 'contactor / relay', kt: 'timer relay', ol: 'overload relay', lamp: 'lamp', horn: 'horn', valve: 'valve' };
  const SCNNAME = { none: 'Lamps only', free: 'Three motors', dol: 'One motor', rev: 'Reversing motor', two: 'Two conveyors', sd: 'Star-delta motor', tank: 'Tank and pump', hoist: 'Hoist' };
  const LAMPC = { green: '#22c55e', red: '#e23b3b', amber: '#f5a524' };
  const TERM = { pb: { NO: ['13', '14'], NC: ['11', '12'] }, sel: { NO: ['13', '14'], NC: ['11', '12'] }, es: { NO: ['13', '14'], NC: ['11', '12'] }, ls: { NO: ['13', '14'], NC: ['11', '12'] }, k: { NO: ['13', '14'], NC: ['21', '22'] }, kt: { NO: ['17', '18'], NC: ['15', '16'] }, ol: { NO: ['97', '98'], NC: ['95', '96'] } };

  const CSS = `
.ec-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 12px}
.ec-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start}
@media(max-width:900px){.ec-grid{grid-template-columns:1fr}.ec-grid .ec-side{display:contents}.ec-grid .ec-side>.ec-card:first-child{order:-1}}
.ec-card{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:12px}
.ec-side{display:grid;gap:14px}
.ec-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.ec-status{border-left:4px solid var(--info);background:var(--surface-2);border-radius:8px;padding:7px 11px;font-size:.92rem;line-height:1.4;margin-bottom:8px;min-height:2.6em}
.ec-status.bad{border-color:var(--danger);background:var(--danger-soft)}.ec-status.live{border-color:var(--power-bright)}
.ec-svg{background:var(--surface-2);border-radius:10px;overflow:hidden}.ec-svg svg{display:block;width:100%;height:auto;max-height:78vh;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.ec [hidden]{display:none!important}
.ec-svg .hit{fill:transparent;stroke:none;cursor:pointer}.ec-svg.edit .hit{stroke:var(--line);stroke-width:1;stroke-dasharray:2 5}.ec-svg.edit .hit:hover{fill:var(--info);fill-opacity:.09}
.ec-svg .lh{fill:var(--surface);stroke:var(--line);stroke-width:1.5;cursor:pointer}.ec-svg .lh.on{fill:var(--ink);stroke:var(--ink)}.ec-svg .lh:hover{stroke:var(--info);stroke-width:2.5}
.ec-pal{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.ec-dev{border:1px solid var(--line-2);border-radius:10px;padding:5px 7px;background:var(--surface-2);display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.ec-dev>span{font-size:.78rem;line-height:1.2}.ec-dev>span b{font-family:var(--f-mono);font-size:.84rem}.ec-dev>span small{display:block;color:var(--muted);font-size:.68rem}
.ec-dev button,.ec-tool{border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:7px;padding:4px 9px;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;min-height:32px}
.ec-dev button.on,.ec-tool.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.ec-dev input{width:46px;font:inherit;font-size:.8rem;border:1px solid var(--line);border-radius:6px;padding:3px 4px;background:var(--surface);color:var(--ink)}
.ec-ops{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.ec-ops button{border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:6px 12px;font:inherit;font-weight:700;font-size:.86rem;cursor:pointer;min-height:44px;min-width:76px;line-height:1.2;touch-action:none;user-select:none;-webkit-user-select:none}
.ec-ops button small{display:block;font-weight:500;font-size:.68rem;color:var(--muted)}.ec-ops button.on{border-color:var(--power-bright);background:var(--power-soft)}.ec-ops button.red.on{border-color:var(--danger);background:var(--danger-soft)}
.ec-ops .ind{border:1px dashed var(--line);border-radius:10px;padding:6px 10px;font-size:.78rem;min-height:44px;display:flex;flex-direction:column;justify-content:center}.ec-ops .ind.on{border-color:var(--power-bright);background:var(--power-soft)}
.ec-lint{margin-top:8px;font-size:.84rem;color:var(--muted)}.ec-lint div{border-left:3px solid #f5a524;padding:2px 8px;margin:4px 0}
.ec-brief{font-size:.95rem;line-height:1.5}.ec-brief ul{margin:6px 0 6px 18px;padding:0}
.ec-mach svg{display:block;width:100%;height:auto;max-height:260px}
.ec-read{font-family:var(--f-mono);font-size:.84rem;margin-top:4px}
.ec-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:10px 0 22px}
.ec-how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0 20px}@media(max-width:760px){.ec-how{grid-template-columns:1fr}}
.ec-how div{background:var(--surface-2);border-radius:10px;padding:10px 12px;font-size:.9rem;line-height:1.45}.ec-how b{display:block}`;
  function css() { if (!document.getElementById('ec-css')) { const s = document.createElement('style'); s.id = 'ec-css'; s.textContent = CSS; document.head.appendChild(s); } }

  // ───────────── task list ─────────────
  function list(main) {
    css(); const d = load();
    const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const n = EC.TASKS.filter((t) => d.done[t.id]).length;
    const page = el(`<div class="wrap"><span class="plate">Circuit Lab</span><h1 style="margin:10px 0 6px">Electrical circuits: build them, power them on</h1>
      <p class="muted" style="margin:0 0 8px;max-width:68ch">Contactors, push buttons, overload relays, timers and lamps, wired by you. No PLC here: this is the hard-wired control that is inside every motor starter. The same test idea as the ladder Lab: build it, power it on, try it, then run the tests.</p>
      <div class="ec-how"><div><b>1. Build</b>Pick a part, tap a cell. Current runs from L at the top to N at the bottom. Tap a dot between two paths to link them.</div><div><b>2. Power on</b>Green wires have voltage. Press the buttons, trip the overload, watch the contactors and the motor.</div><div><b>3. Run the tests</b>They press the buttons for you and check every case, like a commissioning engineer.</div></div>
      <div class="ec-top"><span class="chip">${n} / ${EC.TASKS.length} passed</span><a class="btn" href="#circuit-free">Free play: an empty panel</a><a class="btn ghost" href="#lesson-starting-methods">Lesson: seven ways to start a motor</a></div>
      <div class="ec-levels"></div></div>`);
    const box = page.querySelector('.ec-levels');
    Object.keys(LEVELS).forEach((lv) => {
      const ts = EC.TASKS.filter((t) => t.level === +lv); if (!ts.length) return;
      box.appendChild(el(`<h2 style="margin:6px 0 0">Level ${lv} · ${LEVELS[lv]}</h2>`));
      const g = el('<div class="ec-list"></div>');
      ts.forEach((t) => { const p = plain(t.brief); g.appendChild(el(`<a class="card ch-card" href="#circuit-${t.id}"><div class="top-line"><span class="eyebrow">Level ${t.level} · ${esc(SCNNAME[t.scn])}</span>${d.done[t.id] ? '<span class="chip ok">passed</span>' : ''}</div><h4>${esc(t.title)}</h4><p>${esc(p.length > 130 ? p.slice(0, 128) + '…' : p)}</p></a>`)); });
      box.appendChild(g);
    });
    main.appendChild(page);
  }

  // ───────────── the bench ─────────────
  const W = 84, H = 54, X0 = 30, Y0 = 34, CXO = 30;
  function bench(main, id) {
    css();
    const task = id === 'free' ? EC.FREE : EC.BY_ID[id];
    if (!task) return list(main);
    const store = load();
    let circ = EC.parse(store.circ[task.id] != null ? store.circ[task.id] : task.starter || '');
    let sim = null, tool = null, undo = [], hint = 0, askSol = false, timer = 0, lastSig = '', ang = [0, 0, 0], lastT = 0;
    const part = {}; task.parts.forEach((p) => (part[p.d] = p));
    const idx = EC.TASKS.indexOf(task), next = idx >= 0 ? EC.TASKS[idx + 1] : null;
    const page = el(`<div class="wrap ec">
      <div class="ec-top"><a class="btn small ghost" href="#circuits">← All circuits</a>${task.level ? `<span class="plate">Level ${task.level} · ${LEVELS[task.level]}</span>` : '<span class="plate">Free play</span>'}</div>
      <div class="ec-grid">
        <section class="ec-card ec-main">
          <div class="ec-bar"><button class="btn primary" data-a="power">⚡ Power on</button><button class="btn" data-a="mcb" hidden>Reset breaker F1</button><button class="btn small" data-a="undo">Undo</button><button class="btn small ghost" data-a="clear">Clear</button></div>
          <div class="ec-status"></div>
          <div class="ec-svg edit"></div>
          <div class="ec-pal"></div><div class="ec-ops" hidden></div><div class="ec-lint"></div>
        </section>
        <aside class="ec-side">
          <div class="ec-card"><h2 style="margin:0 0 6px;font-size:1.15rem">${esc(task.title)}</h2><div class="ec-brief">${task.brief}</div><div class="ec-hints"></div>
            <div class="row" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${task.tests.length ? '<button class="btn go" data-a="tests">✓ Run tests</button>' : ''}${task.hints.length ? '<button class="btn" data-a="hint">Hint</button>' : ''}${task.solution ? '<button class="btn ghost" data-a="sol">Solution</button>' : ''}</div>
            <div class="results" style="margin-top:10px"></div></div>
          <div class="ec-card ec-mach"${task.scn === 'none' ? ' hidden' : ''}><div class="panel-title" style="margin-bottom:4px">The machine · ${esc(SCNNAME[task.scn])}</div><div class="ec-m"></div><div class="ec-read"></div></div>
        </aside>
      </div></div>`);
    main.appendChild(page);
    const $ = (q) => page.querySelector(q), svgBox = $('.ec-svg');
    const status = (t, cls) => { const s = $('.ec-status'); s.className = 'ec-status' + (cls ? ' ' + cls : ''); s.textContent = t; };
    const keep = () => { store.circ[task.id] = EC.toText(circ); save(store); };
    const push = () => { undo.push(EC.toText(circ)); if (undo.length > 40) undo.shift(); };

    // ── drawing ──
    function ncols() { let m = 0; circ.cells.forEach((row) => row.forEach((x, c) => { if (x) m = Math.max(m, c + 1); })); circ.links.forEach((row) => row.forEach((v, c) => { if (v) m = Math.max(m, c + 2); })); return Math.max(3, Math.min(EC.COLS, m + (sim ? 0 : 1))); }
    function nrows() { let m = 0; circ.cells.forEach((row, r) => { if (row.some(Boolean)) m = r + 1; }); return Math.max(4, Math.min(EC.ROWS, m + (sim ? 0 : 1))); }
    function draw() {
      const NC = ncols(), NR = nrows(), VW = X0 + NC * W + 6, VH = Y0 + NR * H + 30, LIVE = 'var(--power-bright)', INK = 'currentColor', DIM = 'var(--muted)';
      const col = (c, r) => { if (!sim) return INK; const i = EC.node(c, r); return sim.live(i) ? LIVE : sim.neutral(i) ? INK : DIM; };
      const sw = (c) => (c === LIVE ? 3 : 1.7);
      const ln = (x1, y1, x2, y2, c) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${sw(c)}"/>`;
      const tx = (x, y, s, o) => `<text x="${x}" y="${y}" font-size="${o.z || 10}" ${o.b ? 'font-weight="700" ' : ''}${o.a ? 'text-anchor="' + o.a + '" ' : ''}fill="${o.f || 'currentColor'}" stroke="none"${o.m ? ' font-family="IBM Plex Mono, monospace"' : ''}>${esc(s)}</text>`;
      let g = '';
      // rails
      const xl = X0 + CXO - 18, xr = X0 + (NC - 1) * W + CXO + 14, yL = Y0 - 12, yN = Y0 + NR * H + 12, railL = sim && sim.mcb && !sim.short ? LIVE : INK;
      g += ln(xl, yL, xr, yL, railL) + ln(xl, yN, xr, yN, INK) + tx(8, yL + 4, 'L', { b: 1, z: 12 }) + tx(8, yN + 4, 'N', { b: 1, z: 12 });
      g += `<rect x="${xl - 4}" y="${yL - 7}" width="20" height="14" rx="3" fill="${sim && !sim.mcb ? 'var(--danger)' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.4"/>` + tx(xl + 6, yL + 3.5, 'F1', { z: 8, a: 'middle', f: sim && !sim.mcb ? '#fff' : 'currentColor' });
      for (let c = 0; c < NC; c++) {
        const cx = X0 + c * W + CXO; let after = false, reach = false;
        if (circ.cells[0][c]) g += ln(cx, yL, cx, Y0, sim ? col(c, 0) : INK);
        for (let r = 0; r < NR; r++) {
          const cell = circ.cells[r][c], x = X0 + c * W, y = Y0 + r * H, ya = y + 17, yb = y + 37, my = y + 27, ct = col(c, r), cb = col(c, r + 1);
          if (!cell) { if (after) { g += ln(cx, y, cx, y + H, cb); if (r === NR - 1) reach = true; } }
          else if (cell.t === 'W') { after = false; g += ln(cx, y, cx, y + H, ct); if (r === EC.ROWS - 1) reach = true; }
          else if (cell.t === 'NO' || cell.t === 'NC') {
            after = false; if (r === EC.ROWS - 1) reach = true;
            const k = (part[cell.d] || {}).k, closed = sim ? sim.conducts(cell) : cell.t === 'NC', act = sim ? !!sim.D[cell.d].v : false, bc = closed && ct === LIVE ? LIVE : INK;
            g += ln(cx, y, cx, ya, ct) + ln(cx, yb, cx, y + H, cb);
            if (cell.t === 'NO') g += closed ? ln(cx, yb, cx, ya, bc) : ln(cx, yb, cx - 11, ya + 3, INK);
            else g += ln(cx, ya, cx + 8, ya, ct) + (closed ? ln(cx, yb, cx + 8, ya, bc) : ln(cx, yb, cx - 10, ya + 5, INK));
            const ac = act ? LIVE : INK, a0 = cx - 6, a1 = cx - 17;
            if (k !== 'k') g += `<path d="M${a0} ${my} H${a1}" stroke="${ac}" stroke-width="1.2" stroke-dasharray="3 2"/>`;
            if (k === 'pb') g += `<path d="M${a1 - 4} ${my - 5} H${a1} V${my + 5} H${a1 - 4}" stroke="${ac}" stroke-width="1.6"/>`;
            else if (k === 'es') g += `<path d="M${a1} ${my - 7} A7 7 0 0 0 ${a1} ${my + 7} Z" fill="var(--danger)" stroke="${ac}" stroke-width="1.4"/>`;
            else if (k === 'sel') g += `<path d="M${a1} ${my - 6} V${my + 6} M${a1 - 5} ${my - 5} L${a1} ${my}" stroke="${ac}" stroke-width="1.6"/>`;
            else if (k === 'ls') g += `<circle cx="${a1 - 3}" cy="${my}" r="3.2" stroke="${ac}" stroke-width="1.5"/>`;
            else if (k === 'ol') g += `<path d="M${a1 - 6} ${my + 4} V${my - 4} H${a1} V${my + 4}" stroke="${ac}" stroke-width="1.5"/>`;
            else if (k === 'kt') g += `<path d="M${a1 + 2} ${my - 5} A6 6 0 0 0 ${a1 + 2} ${my + 5}" stroke="${ac}" stroke-width="1.5"/>`;
            const tm = (TERM[k] || TERM.k)[cell.t];
            g += tx(cx + 4, ya - 4, tm[0], { z: 7, f: DIM }) + tx(cx + 4, yb + 9, tm[1], { z: 7, f: DIM });
            g += tx(cx + 16, my, cell.d, { b: 1, z: 12, m: 1 }) + tx(cx + 16, my + 11, (part[cell.d] || {}).n || '', { z: 9, f: DIM });
          } else {
            after = true; if (r === NR - 1) reach = true; const on = sim ? !!sim.D[cell.d].en : false, p = part[cell.d] || {};
            g += ln(cx, y, cx, my - 9, ct) + ln(cx, my + 9, cx, y + H, cb);
            if (cell.t === 'LAMP') g += `<circle cx="${cx}" cy="${my}" r="9" fill="${on ? LAMPC[p.c] || LAMPC.green : 'var(--surface)'}" stroke="currentColor" stroke-width="1.6"/><path d="M${cx - 6} ${my - 6} L${cx + 6} ${my + 6} M${cx - 6} ${my + 6} L${cx + 6} ${my - 6}" stroke="currentColor" stroke-width="1.3"/>`;
            else if (cell.t === 'HORN') g += `<path d="M${cx - 9} ${my - 7} H${cx + 9} V${my + 1} A9 9 0 0 1 ${cx - 9} ${my + 1} Z" fill="${on ? '#f5a524' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.6"/>`;
            else {
              g += `<rect x="${cx - 14}" y="${my - 9}" width="28" height="18" rx="2" fill="${on ? 'var(--power-soft)' : 'var(--surface)'}" stroke="${on ? LIVE : 'currentColor'}" stroke-width="${on ? 2.4 : 1.6}"/>`;
              if (cell.t === 'TON') g += `<rect x="${cx - 22}" y="${my - 9}" width="8" height="18" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/><path d="M${cx - 22} ${my - 9} L${cx - 14} ${my + 9} M${cx - 22} ${my + 9} L${cx - 14} ${my - 9}" stroke="currentColor" stroke-width="1.1"/>`;
              if (cell.t === 'TOF') g += `<rect x="${cx - 22}" y="${my - 9}" width="8" height="18" fill="currentColor" stroke="currentColor" stroke-width="1.4"/>`;
              if (cell.t === 'TON' || cell.t === 'TOF') g += tx(cx, my + 3.5, cell.s + ' s', { z: 8.5, a: 'middle', m: 1 });
              g += tx(cx + 4, my - 12, 'A1', { z: 7, f: DIM }) + tx(cx + 4, my + 17, 'A2', { z: 7, f: DIM });
            }
            g += tx(cx + 18, my, cell.d, { b: 1, z: 12, m: 1 }) + tx(cx + 18, my + 11, cell.t === 'TON' ? 'on-delay' : cell.t === 'TOF' ? 'off-delay' : p.n || '', { z: 9, f: DIM });
          }
        }
        if (reach) g += ln(cx, Y0 + NR * H, cx, yN, INK);
      }
      // links between paths
      for (let r = 1; r < NR; r++) for (let c = 0; c < NC - 1; c++) {
        const x1 = X0 + c * W + CXO, y = Y0 + r * H, on = circ.links[r][c];
        if (on) { const k = col(c, r); g += ln(x1, y, x1 + W, y, k) + `<circle cx="${x1}" cy="${y}" r="2.6" fill="${k}" stroke="none"/><circle cx="${x1 + W}" cy="${y}" r="2.6" fill="${k}" stroke="none"/>`; }
      }
      // touch targets
      let hit = '';
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) hit += `<rect class="hit" x="${X0 + c * W}" y="${Y0 + r * H}" width="${W}" height="${H}" data-c="${c}" data-r="${r}"/>`;
      if (!sim) for (let r = 1; r < NR; r++) for (let c = 0; c < NC - 1; c++) hit += `<circle class="lh${circ.links[r][c] ? ' on' : ''}" cx="${X0 + c * W + CXO + W / 2}" cy="${Y0 + r * H}" r="6.5" data-lr="${r}" data-lc="${c}"><title>Link these two paths here</title></circle>`;
      svgBox.innerHTML = `<svg viewBox="0 0 ${VW} ${VH}" fill="none" stroke="currentColor" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="Control circuit">${g}${hit}</svg>`;
    }

    // ── palette (edit) and operator panel (live) ──
    const forms = (p) => (['pb', 'es', 'sel', 'ls'].includes(p.k) ? [['NO', 'NO'], ['NC', 'NC']] : p.k === 'k' ? [['COIL', 'coil'], ['NO', 'NO'], ['NC', 'NC']] : p.k === 'kt' ? [['TON', 'coil'], ['NO', 'NO'], ['NC', 'NC']] : p.k === 'ol' ? [['NC', 'NC 95-96'], ['NO', 'NO 97-98']] : [[p.k === 'horn' ? 'HORN' : p.k === 'valve' ? 'VALVE' : 'LAMP', 'place']]);
    function palette() {
      const on = (t, d) => (tool && tool.t === t && tool.d === d ? ' class="on"' : '');
      $('.ec-pal').innerHTML = task.parts.map((p) => `<div class="ec-dev"><span><b>${p.d}</b> ${esc(p.n)}<small>${KIND[p.k]}</small></span>${forms(p).map(([t, l]) => `<button type="button" data-t="${t}" data-d="${p.d}"${on(t, p.d)}>${l}</button>`).join('')}${p.k === 'kt' ? `<input type="number" min="1" max="30" value="${p.s || 3}" data-time="${p.d}" aria-label="Time of ${p.d} in seconds"> s` : ''}</div>`).join('')
        + `<button type="button" class="ec-tool${tool && tool.t === 'W' ? ' on' : ''}" data-t="W">│ Wire</button><button type="button" class="ec-tool${tool && tool.t === 'X' ? ' on' : ''}" data-t="X">✕ Erase</button>`;
    }
    function ops() {
      const free = task.scn === 'none' || task.scn === 'free';
      $('.ec-ops').innerHTML = task.parts.map((p) => {
        const v = sim ? sim.D[p.d].v : 0;
        if (p.k === 'pb') return `<button type="button" data-op="${p.d}" data-hold="1" class="${v ? 'on' : ''}">${esc(p.n)}<small>${p.d} · hold</small></button>`;
        if (p.k === 'sel') return `<button type="button" data-op="${p.d}" class="${v ? 'on' : ''}">${esc(p.n)}<small>${p.d} · ${v ? 'ON' : 'off'}</small></button>`;
        if (p.k === 'es') return `<button type="button" data-op="${p.d}" class="red ${v ? 'on' : ''}">${esc(p.n)}<small>${v ? 'PRESSED: turn to release' : p.d + ' · press'}</small></button>`;
        if (p.k === 'ol') return `<button type="button" data-op="${p.d}" class="red ${v ? 'on' : ''}">${esc(p.n)} ${p.d}<small>${v ? 'TRIPPED: tap to reset' : 'tap to trip'}</small></button>`;
        if (p.k === 'ls') return free ? `<button type="button" data-op="${p.d}" class="${v ? 'on' : ''}">${esc(p.n)}<small>${p.d} · ${v ? 'actuated' : 'free'}</small></button>` : `<span class="ind ${v ? 'on' : ''}"><b>${p.d} ${esc(p.n)}</b>${v ? 'actuated' : 'not actuated'}</span>`;
        return '';
      }).join('');
    }
    function lint() { const w = sim ? [] : EC.lint(circ, task); $('.ec-lint').innerHTML = w.map((x) => `<div>${esc(x)}</div>`).join(''); }
    function hints() { $('.ec-hints').innerHTML = task.hints.slice(0, hint).map((t, k) => `<div class="hint"><b>Hint ${k + 1}.</b> ${esc(t)}</div>`).join(''); const b = $('[data-a="hint"]'); if (b) { b.textContent = hint < task.hints.length ? 'Hint ' + (hint + 1) + '/' + task.hints.length : 'No more hints'; b.disabled = hint >= task.hints.length; } }

    // ── the machine drawing ──
    function machine() {
      if (task.scn === 'none') return;
      const st = sim ? sim.st : EC.SCN[task.scn].init(), D = sim ? sim.D : {}, v = (t) => (D[t] ? D[t].v : 0), LIVE = 'var(--power-bright)';
      const wr = (x1, y1, x2, y2, on) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${on ? LIVE : 'currentColor'}" stroke-width="${on ? 3 : 1.8}"/>`;
      const T = (x, y, s, z, f, a) => `<text x="${x}" y="${y}" font-size="${z || 10}" fill="${f || 'currentColor'}" stroke="none" text-anchor="${a || 'middle'}">${esc(s)}</text>`;
      const K = (x, y, id, on) => wr(x, y, x, y + 7, on) + (on ? wr(x, y + 7, x, y + 27, 1) : `<path d="M${x} ${y + 27} L${x - 10} ${y + 8}" stroke="currentColor" stroke-width="1.8"/>`) + wr(x, y + 27, x, y + 34, on) + `<text x="${x + 8}" y="${y + 21}" font-size="11" font-weight="700" fill="${on ? 'var(--power)' : 'currentColor'}" stroke="none">${id}</text>`;
      const OL = (x, y, id) => `<rect x="${x - 16}" y="${y}" width="32" height="16" rx="3" fill="${v(id) ? 'var(--danger)' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.6"/>` + T(x, y + 11.5, id, 9, v(id) ? '#fff' : 'currentColor');
      const M = (x, y, n, a, lab) => `<circle cx="${x}" cy="${y}" r="20" fill="var(--surface)" stroke="${Math.abs(n) > 0.02 ? LIVE : 'currentColor'}" stroke-width="2.2"/><g transform="rotate(${a % 360} ${x} ${y})"><path d="M${x} ${y - 12} V${y + 12} M${x - 12} ${y} H${x + 12}" stroke="${Math.abs(n) > 0.02 ? LIVE : 'var(--muted)'}" stroke-width="3"/></g>` + T(x, y + 34, lab, 10, 'var(--muted)');
      const bus = (x1, x2) => wr(x1, 14, x2, 14, 1) + T((x1 + x2) / 2, 9, '3 × 400 V', 9, 'var(--muted)');
      let g = '', read = '';
      if (task.scn === 'dol') { const k = v('K1'); g = bus(90, 210) + wr(150, 14, 150, 30, 1) + K(150, 30, 'KM1', k) + wr(150, 64, 150, 80, k) + OL(150, 80, 'F2') + wr(150, 96, 150, 120, k) + M(150, 140, st.n, ang[0], 'motor'); read = st.rpm + ' rpm'; }
      else if (task.scn === 'rev') { const a = v('K1'), b = v('K2'); g = bus(60, 240) + wr(105, 14, 105, 30, 1) + K(105, 30, 'KM1', a) + wr(195, 14, 195, 30, 1) + K(195, 30, 'KM2', b) + T(238, 44, 'swaps', 8.5, 'var(--muted)') + T(238, 54, '2 phases', 8.5, 'var(--muted)') + wr(105, 64, 105, 74, a) + wr(195, 64, 195, 74, b) + wr(105, 74, 195, 74, a || b) + wr(150, 74, 150, 84, a || b) + OL(150, 84, 'F2') + wr(150, 100, 150, 120, a || b) + M(150, 140, st.n, ang[0], st.dir > 0 ? 'forward ↻' : st.dir < 0 ? 'reverse ↺' : 'stopped'); read = st.rpm + ' rpm'; }
      else if (task.scn === 'two') { const a = v('K1'), b = v('K2'); g = bus(50, 250) + [[90, 'KM1', 'F2', a, st.n1, 0, 'conveyor 1'], [210, 'KM2', 'F3', b, st.n2, 1, 'conveyor 2 (feeds 1)']].map(([x, k, f, on, n, i, lab]) => wr(x, 14, x, 30, 1) + K(x, 30, k, on) + wr(x, 64, x, 80, on) + OL(x, 80, f) + wr(x, 96, x, 120, on) + M(x, 140, n, ang[i], lab)).join(''); read = 'conveyor 1 ' + (st.run1 ? 'runs' : 'stopped') + ' · conveyor 2 ' + (st.run2 ? 'runs' : 'stopped'); }
      else if (task.scn === 'sd') { const m = v('K1'), y = v('K2'), d = v('K3'); g = bus(40, 260) + wr(150, 14, 150, 26, 1) + K(150, 26, 'KM1', m) + wr(150, 60, 150, 74, m) + OL(150, 74, 'F2') + wr(150, 90, 150, 120, m) + wr(240, 14, 240, 50, 1) + K(240, 50, 'KM3', d) + T(256, 96, 'delta', 9, 'var(--muted)', 'start') + wr(240, 84, 240, 140, d) + wr(240, 140, 170, 140, d) + wr(130, 140, 60, 140, y) + wr(60, 140, 60, 104, y) + K(60, 70, 'KM2', y) + `<path d="M50 68 H70 M54 63 H66" stroke="currentColor" stroke-width="1.8"/>` + T(60, 56, 'star point', 9, 'var(--muted)') + M(150, 140, st.n, ang[0], st.mode === 1 ? 'star' : st.mode === 2 ? 'delta' : 'stopped'); read = 'speed ' + st.pct + ' %'; }
      else if (task.scn === 'tank') { const p = v('K1'), h = 110 * st.level / 100; g = `<rect x="150" y="30" width="90" height="114" rx="4" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><rect x="152" y="${142 - h}" width="86" height="${h}" fill="#3b82f6" fill-opacity=".55"/>` + [['B2', 80], ['B1', 30]].map(([b, lv]) => { const y = 142 - 110 * lv / 100; return `<path d="M240 ${y} H258" stroke="${v(b) ? LIVE : 'currentColor'}" stroke-width="2"/><circle cx="262" cy="${y}" r="5" fill="${v(b) ? LIVE : 'var(--surface)'}" stroke="currentColor" stroke-width="1.5"/>` + T(270, y + 3.5, b + ' ' + lv + ' %', 9, 'currentColor', 'start'); }).join('') + wr(60, 60, 150, 60, p) + `<circle cx="60" cy="60" r="16" fill="var(--surface)" stroke="${p ? LIVE : 'currentColor'}" stroke-width="2.2"/><path d="M52 52 L72 60 L52 68" stroke="${p ? LIVE : 'currentColor'}" stroke-width="2"/>` + T(60, 92, 'pump KM1', 10, 'var(--muted)') + `<path d="M195 144 V168 M189 162 L195 169 L201 162" stroke="currentColor" stroke-width="2"/>` + T(195, 180, 'water is used all the time', 9, 'var(--muted)'); read = 'level ' + st.lv + ' % · pump starts ' + st.starts; }
      else if (task.scn === 'hoist') { const up = v('K1'), dn = v('K2'), y = 150 - 1.2 * st.pos; g = `<rect x="120" y="14" width="60" height="14" rx="3" fill="var(--surface)" stroke="currentColor" stroke-width="2"/>` + T(150, 10, 'hoist drum', 9, 'var(--muted)') + wr(150, 28, 150, y, up || dn) + `<rect x="138" y="${y}" width="24" height="16" rx="3" fill="${up || dn ? 'var(--power-soft)' : 'var(--surface)'}" stroke="currentColor" stroke-width="2"/><path d="M150 ${y + 16} V${y + 24} A5 5 0 1 1 145 ${y + 28}" stroke="currentColor" stroke-width="2"/>` + [['B1', 36, 'top limit'], ['B2', 144, 'bottom limit']].map(([b, yy, lab]) => `<path d="M176 ${yy} H196" stroke="${v(b) ? LIVE : 'currentColor'}" stroke-width="2"/><circle cx="200" cy="${yy}" r="5" fill="${v(b) ? LIVE : 'var(--surface)'}" stroke="currentColor" stroke-width="1.5"/>` + T(210, yy + 3.5, b + ' ' + lab, 9, 'currentColor', 'start')).join('') + T(60, 80, up ? '▲ KM1 up' : dn ? '▼ KM2 down' : 'stopped', 11, up || dn ? 'var(--power)' : 'var(--muted)'); read = 'hook position ' + st.p + ' %'; }
      else if (task.scn === 'free') { g = bus(30, 270) + [['K1', 'KM1', 60, st.n1], ['K2', 'KM2', 150, st.n2], ['K3', 'KM3', 240, st.n3]].map(([k, lab, x, n], i) => wr(x, 14, x, 40, 1) + K(x, 40, lab, v(k)) + wr(x, 74, x, 110, v(k)) + M(x, 130, n, ang[i], 'M' + (i + 1))).join(''); }
      if (st.fault) g += `<rect x="6" y="150" width="288" height="40" rx="6" fill="var(--danger)" stroke="none"/><foreignObject x="10" y="152" width="280" height="36"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#fff;font:600 9.5px/1.25 'IBM Plex Sans',sans-serif">⚠ ${esc(st.fault)}</div></foreignObject>`;
      $('.ec-m').innerHTML = `<svg viewBox="0 0 300 194" fill="none" stroke="currentColor" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="The machine">${g}</svg>`;
      $('.ec-read').textContent = read;
    }

    // ── live ──
    function sig() { return task.parts.map((p) => sim.D[p.d].v + '' + sim.D[p.d].en).join('') + (sim.mcb ? 1 : 0); }
    function frame() {
      if (!sim || !document.body.contains(page)) { clearInterval(timer); timer = 0; return; }
      const now = performance.now(); let n = Math.min(12, Math.round((now - lastT) / 10)); lastT = now;
      while (n-- > 0) sim.tick();
      const st = sim.st; ang[0] += (st.n || st.n1 || 0) * 28; ang[1] += (st.n2 || 0) * 28; ang[2] += (st.n3 || 0) * 28;
      const s = sig();
      if (s !== lastSig) {
        lastSig = s; draw(); ops();
        const onNow = task.parts.filter((p) => ['k', 'kt', 'lamp', 'horn', 'valve'].includes(p.k) && sim.D[p.d].en).map((p) => p.n + ' (' + p.d + ')');
        if (sim.short) status(sim.short + ' Find the path without a load, fix it (Power off), or press Reset breaker.', 'bad');
        else status('Live. Green wires have voltage. On now: ' + (onNow.length ? onNow.join(', ') : 'nothing') + '.', 'live');
        $('[data-a="mcb"]').hidden = sim.mcb;
      }
      if (st.fault && !sim.shown) { sim.shown = 1; status(st.fault, 'bad'); }
      machine();
    }
    function power(on) {
      if (on) { sim = new EC.Sim(circ, task); lastSig = ''; lastT = performance.now(); timer = setInterval(frame, 40); }
      else { sim = null; clearInterval(timer); timer = 0; status(EC.isEmpty(circ) ? 'Pick a part below, then tap a cell. Current runs from L (top) to N (bottom).' : 'Edit mode. Pick a part and tap a cell, or tap a dot between two paths to link them. Then Power on.'); }
      const b = $('[data-a="power"]'); b.textContent = on ? '■ Power off (edit)' : '⚡ Power on'; b.classList.toggle('primary', !on);
      svgBox.classList.toggle('edit', !on); $('.ec-pal').hidden = on; $('.ec-ops').hidden = !on; $('[data-a="mcb"]').hidden = true;
      $('[data-a="undo"]').hidden = on; $('[data-a="clear"]').hidden = on;
      draw(); if (on) { ops(); frame(); } else { palette(); lint(); machine(); }
    }
    function runTests() {
      const res = EC.run(task, circ), ok = res.every((r) => r.ok), box = $('.results');
      box.innerHTML = (ok ? `<div class="res ok"><span class="ri">✓</span><div><b>All ${res.length} tests passed. This circuit works.</b>${next ? `<div class="rm"><a href="#circuit-${next.id}">Next: ${esc(next.title)} →</a></div>` : '<div class="rm">That was the last one. Try Free play.</div>'}</div></div>` : '')
        + res.map((r) => `<div class="res ${r.ok ? 'ok' : 'bad'}"><span class="ri">${r.ok ? '✓' : '✕'}</span><div><b>${esc(r.name)}</b>${r.ok ? '' : `<div class="rm">${esc(r.msg)}</div>`}</div></div>`).join('');
      if (ok && !store.done[task.id]) { store.done[task.id] = 1; save(store); }
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // ── events ──
    page.addEventListener('click', (e) => {
      const t = e.target.closest('[data-a],[data-t],[data-op],[data-c],[data-lr]'); if (!t) return;
      const a = t.dataset.a;
      if (a === 'power') return power(!sim);
      if (a === 'mcb') { sim.resetMcb(); lastSig = ''; return; }
      if (a === 'tests') return runTests();
      if (a === 'hint') { hint++; return hints(); }
      if (a === 'sol') { if (!askSol) { askSol = true; t.textContent = 'Replace my circuit? Tap again'; return; } askSol = false; t.textContent = 'Solution'; if (sim) power(false); push(); circ = EC.parse(task.solution); keep(); draw(); lint(); return; }
      if (a === 'undo') { if (undo.length) { circ = EC.parse(undo.pop()); keep(); draw(); lint(); } return; }
      if (a === 'clear') { if (!EC.isEmpty(circ)) { push(); circ = EC.empty(); keep(); draw(); lint(); status('Cleared. Undo brings it back.'); } return; }
      if (t.dataset.t && !sim) { tool = tool && tool.t === t.dataset.t && tool.d === t.dataset.d ? null : { t: t.dataset.t, d: t.dataset.d }; palette(); if (tool) status(tool.t === 'X' ? 'Erase: tap a part to remove it.' : tool.t === 'W' ? 'Wire: tap a cell to draw a wire straight down through it.' : 'Now tap a cell to place ' + tool.d + (tool.t === 'NO' || tool.t === 'NC' ? ' ' + tool.t : '') + '.'); return; }
      if (t.dataset.lr && !sim) { push(); const r = +t.dataset.lr, c = +t.dataset.lc; circ.links[r][c] = !circ.links[r][c]; keep(); draw(); lint(); return; }
      if (t.dataset.c != null) {
        const r = +t.dataset.r, c = +t.dataset.c, cell = circ.cells[r][c];
        if (sim) { if (!cell || !cell.d) return; const p = part[cell.d], d = sim.D[cell.d]; if (p && (p.k === 'sel' || p.k === 'es' || p.k === 'ol' || (p.k === 'ls' && (task.scn === 'none' || task.scn === 'free')))) d.v = d.v ? 0 : 1; return; }
        if (!tool) return status('First pick a part in the box below (for example "NO" of a button), then tap a cell.');
        push();
        if (tool.t === 'X') circ.cells[r][c] = null;
        else if (tool.t === 'W') circ.cells[r][c] = { t: 'W' };
        else if (tool.t === 'TON') circ.cells[r][c] = { t: 'TON', d: tool.d, s: part[tool.d].s || 3 };
        else circ.cells[r][c] = { t: tool.t, d: tool.d };
        keep(); draw(); lint();
      }
      if (t.dataset.op && sim && !t.dataset.hold) { const d = sim.D[t.dataset.op]; d.v = d.v ? 0 : 1; }
    });
    const hold = (e, v) => { const t = e.target.closest('[data-hold]'); if (t && sim) { sim.D[t.dataset.op].v = v; if (v) e.preventDefault(); return; } const c = e.target.closest('[data-c]'); if (c && sim) { const cell = circ.cells[+c.dataset.r][+c.dataset.c]; if (cell && cell.d && part[cell.d] && part[cell.d].k === 'pb') sim.D[cell.d].v = v; } };
    page.addEventListener('pointerdown', (e) => hold(e, 1));
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => page.addEventListener(n, () => { if (sim) task.parts.forEach((p) => { if (p.k === 'pb') sim.D[p.d].v = 0; }); }));
    page.addEventListener('change', (e) => { const d = e.target.dataset.time; if (!d) return; const s = Math.max(1, Math.min(30, Math.round(+e.target.value) || 3)); part[d].s = s; e.target.value = s; circ.cells.forEach((row) => row.forEach((x) => { if (x && x.d === d && (x.t === 'TON' || x.t === 'TOF')) x.s = s; })); keep(); draw(); });
    page.addEventListener('contextmenu', (e) => { if (e.target.closest('.ec-ops,.ec-svg')) e.preventDefault(); });
    hints(); power(false);
  }
  LL.CircuitUI = { list, bench };
})();
