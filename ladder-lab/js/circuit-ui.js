/* Ladder Lab — Circuit Lab pages: the task list (#circuits) and the bench (#circuit-<id>).
 * The bench shows two drawing sheets side by side, like a real diagram: the POWER CIRCUIT (three phases in their
 * wire colours, breaker, contactor, overload relay, motor; live) and the CONTROL CIRCUIT (IEC current paths between
 * L and N that you build). Below: the parts box while you edit, the panel door (buttons and pilot lamps) when the
 * power is on. Engine: circuit.js (LL.EC). */
(function () {
  const LL = (window.LL = window.LL || {}), EC = LL.EC;
  if (!EC) return;
  const STORE = 'll-hw-circuit';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const load = () => { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; d.done = d.done || {}; d.circ = d.circ || {}; return d; } catch (e) { return { done: {}, circ: {} }; } };
  const save = (d) => { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* private mode */ } };
  const LEVELS = { 1: 'First circuits', 2: 'Motor basics', 3: 'Interlocks and timers', 4: 'Real projects', 5: 'Master' };
  const KIND = { pb: 'push button', es: 'emergency stop', sel: 'switch', ls: 'moved by the machine', k: 'contactor / relay', kt: 'timer relay', ol: 'overload relay', lamp: 'lamp', horn: 'horn', valve: 'valve' };
  const SCNNAME = { none: 'Lamps only', free: 'Three motors', dol: 'One motor', rev: 'Reversing motor', two: 'Two conveyors', sd: 'Star-delta motor', tank: 'Tank and pump', hoist: 'Hoist', stein: 'Motor on single phase', steinh: 'Motor on single phase', res: 'Stator resistance', at: 'Autotransformer', rotor: 'Slip-ring motor' };
  const SUPPLY = { stein: '1 × 230 V', steinh: '1 × 230 V' };
  const LAMPC = { green: '#22c55e', red: '#ef4444', amber: '#f5a524' };
  const CAPC = { green: '#16a34a', red: '#dc2626', amber: '#d97706' };
  const TERM = { pb: { NO: ['13', '14'], NC: ['11', '12'] }, sel: { NO: ['13', '14'], NC: ['11', '12'] }, es: { NO: ['13', '14'], NC: ['11', '12'] }, ls: { NO: ['13', '14'], NC: ['11', '12'] }, k: { NO: ['13', '14'], NC: ['21', '22'] }, kt: { NO: ['17', '18'], NC: ['15', '16'] }, ol: { NO: ['97', '98'], NC: ['95', '96'] } };
  const ICON = {
    NO: '<path d="M12 2v6M12 16v6M12 16L6.5 8.5"/>', NC: '<path d="M12 2v6h5M12 16v6M12 16l5-8"/>',
    COIL: '<path d="M12 2v6M12 16v6"/><rect x="5" y="8" width="14" height="8" rx="1"/>', TON: '<path d="M13 2v6M13 16v6"/><rect x="7" y="8" width="13" height="8" rx="1"/><path d="M3 8h4v8H3zM3 8l4 8M7 8l-4 8"/>',
    LAMP: '<path d="M12 2v4M12 18v4M8 8l8 8M16 8l-8 8"/><circle cx="12" cy="12" r="6"/>', HORN: '<path d="M12 2v5M12 19v3M5 7h14v6a7 7 0 0 1-14 0z"/>', VALVE: '<path d="M12 2v6M12 16v6"/><rect x="5" y="8" width="14" height="8" rx="1"/>',
    W: '<path d="M12 2v20"/>', X: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const ico = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${ICON[k] || ''}</svg>`;

  const CSS = `
.ec [hidden]{display:none!important}
.ec-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0 12px}
.ec-card{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:14px 16px}
.ec-task h2{margin:0 0 6px;font-size:1.25rem}.ec-brief{font-size:.96rem;line-height:1.5;max-width:92ch}.ec-brief ul{margin:6px 0 6px 18px;padding:0}
.ec-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.ec-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 8px}
.ec-bar .ec-go{font-size:1rem;padding:10px 20px;border-radius:12px}
.ec-status{flex:1 1 260px;border-left:4px solid var(--info);background:var(--surface);border-radius:10px;padding:8px 12px;font-size:.92rem;line-height:1.4;min-height:2.6em;display:flex;align-items:center}
.ec-status.bad{border-color:var(--danger);background:var(--danger-soft)}.ec-status.live{border-color:var(--power-bright)}
.ec-sheets{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,8fr);gap:14px;align-items:start}
.ec-sheets.solo{grid-template-columns:1fr}
@media(max-width:900px){.ec-sheets{grid-template-columns:1fr}.ec-ctl{order:-1}}
.ec-sheet{border:1px solid var(--line);border-radius:16px;background:var(--surface);overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,.03),0 8px 24px -18px rgba(0,0,0,.35)}
.ec-sheet>header{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:9px 14px;border-bottom:1px solid var(--line-2);font-family:var(--f-display);letter-spacing:.1em;text-transform:uppercase;font-size:.82rem;font-weight:700}
.ec-sheet>header small{font-family:var(--f-mono);letter-spacing:0;text-transform:none;font-weight:500;color:var(--muted);font-size:.74rem}
.ec-paper{background:var(--surface);background-image:radial-gradient(var(--line-2) 1px,transparent 1px);background-size:14px 14px;padding:6px}
.ec-paper svg{display:block;width:100%;height:auto;margin:0 auto;touch-action:manipulation;user-select:none;-webkit-user-select:none}
.ec-svg svg{max-height:72vh}.ec-m svg{max-height:66vh}
.ec-svg .hit{fill:transparent;stroke:none;cursor:pointer}.ec-svg.edit .hit:hover{fill:var(--info);fill-opacity:.1}
.ec-svg .plus{stroke:var(--line);stroke-width:1.4;pointer-events:none}
.ec-svg .lh{fill:var(--surface);stroke:var(--line);stroke-width:1.5;cursor:pointer}.ec-svg .lh.on{fill:var(--ink);stroke:var(--ink)}.ec-svg .lh:hover{stroke:var(--info);stroke-width:2.6}
.ec-svg .fl,.ec-m .fl{stroke:var(--surface);stroke-opacity:.85;stroke-width:1.3;stroke-dasharray:4 12;animation:ecflow .55s linear infinite;pointer-events:none}
@keyframes ecflow{to{stroke-dashoffset:-16}}
.ec-m .fl{animation:none}
@media(prefers-reduced-motion:reduce){.ec-svg .fl{animation:none}}
.ec-svg .glow{filter:drop-shadow(0 0 5px var(--power-bright))}
.ec-read{font-family:var(--f-mono);font-size:.86rem;padding:8px 14px;border-top:1px solid var(--line-2);display:flex;gap:6px 16px;flex-wrap:wrap}
.ec-fault{margin:8px 12px;padding:8px 12px;border-radius:10px;background:var(--danger);color:#fff;font-weight:600;font-size:.88rem;line-height:1.35}
.ec-pwq{padding:10px 14px;border-top:1px solid var(--line-2);display:grid;gap:10px}
.ec-pwq b{display:block;font-size:.88rem;margin-bottom:5px}.ec-pwq .o{display:flex;gap:6px;flex-wrap:wrap}
.ec-pwq button{border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 12px;font:inherit;font-size:.84rem;font-weight:600;cursor:pointer;min-height:36px}
.ec-pwq button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}.ec-pwq.need b::after{content:" · choose";color:var(--danger);font-weight:600}
.ec-box{border-top:1px solid var(--line-2);padding:12px 14px}
.ec-boxt{font-family:var(--f-display);letter-spacing:.1em;text-transform:uppercase;font-size:.78rem;color:var(--muted);margin-bottom:8px}
.ec-pal{display:flex;gap:7px;flex-wrap:wrap}
.ec-dev{border:1px solid var(--line-2);border-radius:12px;padding:6px 8px;background:var(--surface-2);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ec-dev>span{font-size:.8rem;line-height:1.2;margin-right:2px}.ec-dev>span b{font-family:var(--f-mono);font-size:.86rem}.ec-dev>span small{display:block;color:var(--muted);font-size:.68rem}
.ec-dev button,.ec-tool{display:inline-flex;align-items:center;gap:4px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:9px;padding:4px 9px 4px 6px;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer;min-height:36px}
.ec-dev button.on,.ec-tool.on{background:var(--ink);color:var(--surface);border-color:var(--ink);box-shadow:0 0 0 3px var(--info-soft,rgba(59,130,246,.25))}
.ec-dev input{width:46px;font:inherit;font-size:.8rem;border:1px solid var(--line);border-radius:6px;padding:4px;background:var(--surface);color:var(--ink)}
.ec-lint{font-size:.85rem;color:var(--muted)}.ec-lint div{border-left:3px solid #f5a524;padding:3px 9px;margin:8px 0 0}
.ec-door{display:flex;gap:16px 18px;flex-wrap:wrap;align-items:flex-end;background:linear-gradient(180deg,var(--surface-2),var(--surface-3));border:1px solid var(--line);border-radius:14px;padding:16px 16px 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}
.ec-di{display:grid;justify-items:center;gap:5px;font-size:.74rem;font-weight:700;text-align:center;min-width:56px;line-height:1.15}.ec-di small{font-weight:500;color:var(--muted);font-family:var(--f-mono);font-size:.66rem}
.ec-pb{width:50px;height:50px;border-radius:50%;border:4px solid #9aa3ae;background:radial-gradient(circle at 35% 30%,#fff5,#0000 45%),var(--cap,#475569);box-shadow:0 4px 0 #0004,0 6px 10px -4px #0006;cursor:pointer;touch-action:none;transition:transform .05s,box-shadow .05s;padding:0}
.ec-pb.on{transform:translateY(3px);box-shadow:0 1px 0 #0004,inset 0 3px 6px #0006}
.ec-pb.es{width:56px;height:56px;--cap:#dc2626;border:5px solid #facc15}.ec-pb.es.on{box-shadow:inset 0 4px 10px #0008;filter:brightness(.8)}
.ec-sel{width:50px;height:50px;border-radius:50%;border:4px solid #9aa3ae;background:var(--surface);position:relative;cursor:pointer;padding:0;box-shadow:0 4px 0 #0003}
.ec-sel::after{content:"";position:absolute;left:21px;top:5px;width:4px;height:20px;border-radius:2px;background:var(--ink);transform-origin:2px 16px;transform:rotate(-45deg);transition:transform .15s}.ec-sel.on::after{transform:rotate(45deg)}
.ec-lmp{width:38px;height:38px;border-radius:50%;border:4px solid #9aa3ae;background:var(--surface-3);box-shadow:inset 0 2px 5px #0003}.ec-lmp.on{background:radial-gradient(circle at 40% 35%,#fff,var(--lc) 55%);box-shadow:0 0 16px 3px var(--lc)}
.ec-olb{border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:6px 10px;font:inherit;font-weight:700;font-size:.78rem;cursor:pointer;min-height:50px;line-height:1.2}.ec-olb small{display:block;font-weight:500;color:var(--muted);font-size:.66rem}.ec-olb.on{border-color:var(--danger);background:var(--danger-soft)}
.ec-ind{border:1.5px dashed var(--line);border-radius:10px;padding:6px 10px;font-size:.74rem;min-height:50px;display:grid;align-content:center;background:var(--surface)}.ec-ind.on{border-style:solid;border-color:var(--power-bright);background:var(--power-soft)}
.ec-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:10px 0 22px}
.ec-how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:12px 0 20px}@media(max-width:760px){.ec-how{grid-template-columns:1fr}}
.ec-how div{background:var(--surface);border:1px solid var(--line-2);border-radius:12px;padding:10px 12px;font-size:.9rem;line-height:1.45}.ec-how b{display:block}`;
  function css() { if (!document.getElementById('ec-css')) { const s = document.createElement('style'); s.id = 'ec-css'; s.textContent = CSS; document.head.appendChild(s); } }

  // ───────────── task list ─────────────
  function list(main) {
    css(); const d = load();
    const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const n = EC.TASKS.filter((t) => d.done[t.id]).length;
    const page = el(`<div class="wrap"><span class="plate">Circuit Lab</span><h1 style="margin:10px 0 6px">Electrical circuits: build them, power them on</h1>
      <p class="muted" style="margin:0 0 8px;max-width:68ch">Contactors, push buttons, overload relays, timers and lamps, wired by you, with the 3-phase power circuit beside it. No PLC here: this is the hard-wired control inside every motor starter. Build it, power it on, try it, then run the tests.</p>
      <div class="ec-how"><div><b>1. Build</b>Pick a part, tap a cell. Current runs from L at the top to N at the bottom. Tap a dot between two paths to link them.</div><div><b>2. Power on</b>Green wires have voltage. Press the buttons on the panel door, trip the overload, watch the contactors and the motor.</div><div><b>3. Run the tests</b>They press the buttons for you and check every case, like a commissioning engineer.</div></div>
      <div class="ec-top"><span class="chip">${n} / ${EC.TASKS.length} passed</span><a class="btn" href="#circuit-free">Free play: an empty panel</a><a class="btn ghost" href="#lesson-control-circuits">Lesson: read a control circuit</a></div>
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

  // ───────────── the power circuit: three phases in their wire colours ─────────────
  const PHC = ['#b4632a', 'var(--ink)', '#8d97a6'], BLUE = '#2f6fed', DEAD = 'var(--line)', DX = 13, GRN = 'var(--power-bright)';
  function powerSvg(scn, st, D, pw, ang) {
    const v = (t) => (D[t] ? D[t].v : 0), ok = !st.fault, off = -((performance.now() / 30) % 16).toFixed(1);
    const seg = (pts, col, on, flow) => { const d = 'M' + pts.map((p) => p[0] + ' ' + p[1]).join(' L'); return `<path d="${d}" stroke="${on ? col : DEAD}" stroke-width="${on ? 2.6 : 1.7}" stroke-linejoin="round"/>` + (on && flow ? `<path class="fl" style="stroke-dashoffset:${off}" d="${d}"/>` : ''); };
    const T = (x, y, s, o) => { o = o || {}; return `<text x="${x}" y="${y}" font-size="${o.z || 10}" ${o.b ? 'font-weight="700" ' : ''}fill="${o.f || 'currentColor'}" stroke="none" text-anchor="${o.a || 'start'}"${o.m ? ' font-family="IBM Plex Mono, monospace"' : ''}>${esc(s)}</text>`; };
    const xs = (x, n) => (n === 2 ? [x - DX, x + DX] : [x - DX, x, x + DX]);
    // n parallel wires straight down
    const run = (x, y1, y2, on, flow, cols) => xs(x, (cols || PHC).length).map((px, i) => seg([[px, y1], [px, y2]], (cols || PHC)[i], on, flow)).join('');
    const bus = (cols, labs, x1, x2) => cols.map((c, i) => seg([[x1, 13 + i * 9], [x2, 13 + i * 9]], c, true) + T(x1 - 4, 16.5 + i * 9, labs[i], { z: 8.5, a: 'end', m: 1, f: c })).join('');
    const tap = (x, y2, cols) => xs(x, cols.length).map((px, i) => seg([[px, 13 + i * 9], [px, y2]], cols[i], true) + `<circle cx="${px}" cy="${13 + i * 9}" r="2.3" fill="${cols[i]}" stroke="none"/>`).join('');
    // a switching device with n poles, 34 high: kind 'q' breaker, 'k' contactor
    const dev = (x, y, kind, closed, id, sub, cols, live) => {
      const px = xs(x, (cols || PHC).length), w = px[px.length - 1] - px[0] + 22;
      let g = `<rect x="${px[0] - 11}" y="${y + 1}" width="${w}" height="32" rx="6" fill="${kind === 'k' && closed ? 'var(--power-soft)' : 'var(--surface-2)'}" stroke="${kind === 'k' && closed ? GRN : 'var(--line)'}" stroke-width="${kind === 'k' && closed ? 2 : 1.2}"/>`;
      px.forEach((p, i) => {
        const c = live ? (cols || PHC)[i] : DEAD;
        g += seg([[p, y], [p, y + 9]], (cols || PHC)[i], live) + seg([[p, y + 25], [p, y + 34]], (cols || PHC)[i], live && closed);
        g += closed ? `<path d="M${p} ${y + 25} L${p} ${y + 9}" stroke="${c}" stroke-width="2.6"/>` : `<path d="M${p} ${y + 25} L${p - 7} ${y + 11}" stroke="currentColor" stroke-width="1.8"/>`;
        g += kind === 'q' ? `<path d="M${p - 2.5} ${y + 6.5} l5 5 M${p + 2.5} ${y + 6.5} l-5 5" stroke="currentColor" stroke-width="1.1"/>` : `<path d="M${p - 3} ${y + 9} a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.1"/>`;
      });
      g += `<path d="M${px[0] - 5} ${y + 18} H${px[px.length - 1] - 3}" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>`;
      return g + T(px[px.length - 1] + 15, y + 16, id, { b: 1, z: 11, m: 1, f: kind === 'k' && closed ? 'var(--power)' : 'currentColor' }) + T(px[px.length - 1] + 15, y + 27, sub || '', { z: 8.5, f: 'var(--muted)' });
    };
    const ovl = (x, y, id, live, cols) => {
      const px = xs(x, (cols || PHC).length), tr = v(id);
      let g = `<rect x="${px[0] - 11}" y="${y}" width="${px[px.length - 1] - px[0] + 22}" height="26" rx="6" fill="${tr ? 'var(--danger)' : 'var(--surface-2)'}" stroke="${tr ? 'var(--danger)' : 'var(--line)'}" stroke-width="1.2"/>`;
      px.forEach((p, i) => { g += seg([[p, y], [p, y + 7], [p - 4, y + 7], [p - 4, y + 19], [p, y + 19], [p, y + 26]], tr ? '#fff' : (cols || PHC)[i], live || tr); });
      return g + T(px[px.length - 1] + 15, y + 12, id, { b: 1, z: 11, m: 1, f: tr ? 'var(--danger)' : 'currentColor' }) + T(px[px.length - 1] + 15, y + 23, tr ? 'TRIPPED' : 'overload relay', { z: 8.5, f: tr ? 'var(--danger)' : 'var(--muted)' });
    };
    const motor = (x, y, n, a, lab, sub, live, cols, noPe) => {
      const px = xs(x, (cols || PHC).length), r = 25, run_ = Math.abs(n) > 0.02;
      let g = px.map((p, i) => seg([[p, y - r - 16], [p, y - r - 6], [x + (p - x) * 0.6, y - r + 3]], (cols || PHC)[i], live, live && run_)).join('');
      g += `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--surface)" stroke="${run_ ? GRN : 'currentColor'}" stroke-width="${run_ ? 3 : 2}"/>`;
      g += `<g transform="rotate(${Math.round(a) % 360} ${x} ${y})"><circle cx="${x}" cy="${y - r + 6}" r="3" fill="${run_ ? GRN : 'var(--muted)'}" stroke="none"/><circle cx="${x + (r - 6) * 0.866}" cy="${y + (r - 6) * 0.5}" r="3" fill="${run_ ? GRN : 'var(--muted)'}" stroke="none"/><circle cx="${x - (r - 6) * 0.866}" cy="${y + (r - 6) * 0.5}" r="3" fill="${run_ ? GRN : 'var(--muted)'}" stroke="none"/></g>`;
      g += T(x, y + 1, 'M', { z: 15, b: 1, a: 'middle' }) + T(x, y + 12, sub || '3~', { z: 8.5, a: 'middle', f: 'var(--muted)' });
      if (!noPe) g += `<path d="M${x + r} ${y + 8} H${x + r + 12} V${y + 20} M${x + r + 5} ${y + 20} h14 M${x + r + 8} ${y + 24} h8 M${x + r + 10.5} ${y + 28} h3" stroke="#3f9b46" stroke-width="1.6"/>` + T(x + r + 22, y + 13, 'PE', { z: 8, f: 'var(--muted)' });
      return g + T(x, y + r + 14, lab, { z: 10, a: 'middle', f: 'var(--muted)' });
    };
    // a plain feeder: breaker, contactor, overload relay, motor
    const feeder = (x, k, klab, f, n, a, lab, q, noPe) => {
      const on = ok && v(k);
      return tap(x, 44, PHC) + dev(x, 44, 'q', ok, q || 'Q1', 'main breaker', PHC, true) + run(x, 78, 96, ok, on) + dev(x, 96, 'k', on, klab, 'contactor', PHC, ok) + run(x, 130, 148, on, on) + ovl(x, 148, f, on) + run(x, 174, 204, on, on) + motor(x, 245, n, a, lab, '3~', on, null, noPe);
    };
    const B3 = () => bus(PHC, ['L1', 'L2', 'L3'], 26, 284);
    let g = '', vb = [300, 300], read = [];
    if (scn === 'dol') { g = B3() + feeder(140, 'K1', 'KM1', 'F2', st.n, ang[0], 'motor'); read = ['speed ' + st.rpm + ' rpm']; }
    else if (scn === 'free') { vb = [480, 300]; g = bus(PHC, ['L1', 'L2', 'L3'], 26, 464) + [['K1', 'KM1', 70, st.n1], ['K2', 'KM2', 230, st.n2], ['K3', 'KM3', 390, st.n3]].map(([k, lab, x, n], i) => { const on = v(k); return tap(x, 60, PHC) + dev(x, 60, 'k', on, lab, 'contactor', PHC, true) + run(x, 94, 204, on, on) + motor(x, 245, n, ang[i], 'M' + (i + 1), '3~', on); }).join(''); }
    else if (scn === 'two') { g = B3() + [[82, 'K1', 'KM1', 'F2', st.n1, 0, 'conveyor 1', 'Q1'], [212, 'K2', 'KM2', 'F3', st.n2, 1, 'conveyor 2', 'Q2']].map(([x, k, kl, f, n, i, lab, q]) => feeder(x, k, kl, f, n, ang[i], lab, q)).join(''); read = ['conveyor 1 ' + (st.run1 ? 'runs' : 'stopped'), 'conveyor 2 ' + (st.run2 ? 'runs' : 'stopped')]; }
    else if (scn === 'rev' || scn === 'hoist') {
      const a = ok && v('K1'), b = ok && v('K2'), sw = scn === 'hoist' ? 'l13' : pw.swap || '', map = sw === 'l13' ? [2, 1, 0] : sw === 'rot' ? [1, 2, 0] : [0, 1, 2], xa = 86, xb = 206, xm = 146;
      g = B3() + tap(xm, 40, PHC) + dev(xm, 40, 'q', ok, 'Q1', 'main breaker', PHC, true);
      // from the breaker to both contactors
      [xa, xb].forEach((x) => { xs(x, 3).forEach((p, i) => { g += seg([[xs(xm, 3)[i], 74], [xs(xm, 3)[i], 82 + i * 6], [p, 82 + i * 6], [p, 104]], PHC[i], ok, ok && (x === xa ? a : b)); }); });
      g += dev(xa, 104, 'k', a, 'KM1', scn === 'hoist' ? 'up' : 'forward', PHC, ok) + dev(xb, 104, 'k', b, 'KM2', scn === 'hoist' ? 'down' : 'reverse', PHC, ok);
      // from the contactors to the motor wires: KM1 straight, KM2 as chosen
      xs(xa, 3).forEach((p, i) => { g += seg([[p, 138], [p, 150 + i * 6], [xs(xm, 3)[i], 150 + i * 6], [xs(xm, 3)[i], 176]], PHC[i], a, a); });
      if (sw) xs(xb, 3).forEach((p, i) => { const k = map[i]; g += seg([[p, 138], [p, 150 + k * 6], [xs(xm, 3)[k], 150 + k * 6], [xs(xm, 3)[k], 176]], PHC[i], b, b); });
      else g += xs(xb, 3).map((p) => `<path d="M${p} 138 V160" stroke="var(--danger)" stroke-width="1.6" stroke-dasharray="3 3"/>`).join('') + T(xb, 172, 'not wired yet', { z: 9, a: 'middle', f: 'var(--danger)', b: 1 });
      const cols = b && sw ? [0, 1, 2].map((k) => PHC[map.indexOf(k)]) : PHC, on = a || (b && !!sw);
      g += ovl(xm, 176, 'F2', on, cols) + run(xm, 202, 214, on, on, cols) + motor(xm, 255, st.n || st.dir || 0, ang[0], scn === 'hoist' ? 'hoist motor' : st.dir > 0 ? 'forward ↻' : st.dir < 0 ? 'reverse ↺' : 'motor', '3~', on, cols);
      if (scn === 'rev') { read = ['speed ' + st.rpm + ' rpm']; if (b && sw) read.push('U V W get ' + [0, 1, 2].map((k) => 'L' + (map.indexOf(k) + 1)).join(' ')); }
      else {
        // the hoist beside its feeder
        vb = [450, 300]; const y = 232 - 1.75 * st.pos, mv = st.dir !== 0;
        g += `<rect x="330" y="36" width="64" height="16" rx="4" fill="var(--surface-2)" stroke="currentColor" stroke-width="1.8"/>` + T(362, 30, 'drum', { z: 9, a: 'middle', f: 'var(--muted)' }) + seg([[362, 52], [362, y]], 'currentColor', true)
          + `<rect x="349" y="${y}" width="26" height="18" rx="4" fill="${mv ? 'var(--power-soft)' : 'var(--surface)'}" stroke="${mv ? GRN : 'currentColor'}" stroke-width="2"/><path d="M362 ${y + 18} v8 a6 6 0 1 1 -6 6" stroke="currentColor" stroke-width="2"/>`
          + [['B1', 62, 'top limit'], ['B2', 226, 'bottom limit']].map(([bb, yy, lab]) => `<path d="M378 ${yy} h14" stroke="${v(bb) ? GRN : 'currentColor'}" stroke-width="2"/><circle cx="397" cy="${yy}" r="5" fill="${v(bb) ? GRN : 'var(--surface)'}" stroke="currentColor" stroke-width="1.5"/>` + T(407, yy + 1, bb, { z: 10, b: 1, m: 1 }) + T(407, yy + 12, lab, { z: 8.5, f: 'var(--muted)' })).join('');
        read = ['hook ' + st.p + ' %', st.dir > 0 ? '▲ up' : st.dir < 0 ? '▼ down' : 'stopped'];
      }
    } else if (scn === 'sd') {
      const m = ok && v('K1'), y = ok && v('K2'), d = ok && v('K3'), xm = 96, xr = 222, w2 = xs(xr, 3), lite = y && !d;
      g = B3() + tap(xm, 40, PHC) + dev(xm, 40, 'q', ok, 'Q1', 'main breaker', PHC, true);
      xs(xm, 3).forEach((p, i) => { g += seg([[p, 74], [p, 96]], PHC[i], ok, m) + seg([[p, 82 + i * 5], [w2[i], 82 + i * 5], [w2[i], 96]], PHC[(i + 1) % 3], ok, d) + `<circle cx="${p}" cy="${82 + i * 5}" r="2" fill="${ok ? PHC[i] : DEAD}" stroke="none"/>`; });
      g += dev(xm, 96, 'k', m, 'KM1', 'line', PHC, ok) + run(xm, 130, 142, m, m) + ovl(xm, 142, 'F2', m) + run(xm, 168, 198, m, m) + motor(xm, 239, st.n, ang[0], '', '3~', m) + T(xm - 22, 196, 'U1 V1 W1', { z: 8, f: 'var(--muted)', a: 'end' });
      g += dev(xr, 96, 'k', d, 'KM3', 'delta', [PHC[1], PHC[2], PHC[0]], ok);
      // the winding ends W2 U2 V2 come back from the motor to the delta and star contactors
      const wc = d ? [PHC[1], PHC[2], PHC[0]] : ['#7c8794', '#7c8794', '#7c8794'], on2 = d || lite;
      w2.forEach((p, i) => { g += seg([[xs(xm, 3)[i], 264], [xs(xm, 3)[i], 282 + i * 5], [282 - i * 5, 282 + i * 5], [282 - i * 5, 150 + i * 5], [p, 150 + i * 5]], wc[i], on2 && m, on2 && m) + seg([[p, 130], [p, 176]], wc[i], on2 && m, d && m) + `<circle cx="${p}" cy="${150 + i * 5}" r="2" fill="${on2 && m ? wc[i] : DEAD}" stroke="none"/>`; });
      g += dev(xr, 176, 'k', y, 'KM2', 'star', wc, on2 && m) + seg([[w2[0], 210], [w2[0], 218], [w2[2], 218], [w2[2], 210]], '#7c8794', y) + seg([[w2[1], 210], [w2[1], 218]], '#7c8794', y) + T(xr, 231, 'star point', { z: 8.5, a: 'middle', f: 'var(--muted)' }) + T(xm - 22, 288, 'W2 U2 V2', { z: 8, f: 'var(--muted)', a: 'end' });
      read = ['speed ' + st.pct + ' %', st.mode === 1 ? 'in star' : st.mode === 2 ? 'in delta' : 'stopped'];
    } else if (scn === 'stein' || scn === 'steinh') {
      const LN = [PHC[0], BLUE], run_ = ok && v('K1'), conn = scn === 'steinh' ? 'delta' : pw.conn || '', cap = scn === 'steinh' ? 'wl' : pw.cap || '', xm = 110, xu = xm - DX, xv = xm + DX, xw = xm + 3 * DX, good = conn === 'delta' && (cap === 'wl' || cap === 'wn'), turning = Math.abs(st.n) > 0.02;
      g = bus(LN, ['L', 'N'], 26, 284) + tap(xm, 40, LN) + dev(xm, 40, 'q', ok, 'Q1', '2-pole breaker', LN, true) + run(xm, 74, 92, ok, run_, LN) + dev(xm, 92, 'k', run_, 'KM1', 'contactor', LN, ok) + run(xm, 126, 140, run_, run_, LN) + ovl(xm, 140, 'F2', run_, LN) + run(xm, 166, 214, run_, run_, LN);
      // motor with three terminals: U1 on L, V1 on N, W1 through the capacitor
      g += `<circle cx="${xm + DX}" cy="250" r="27" fill="var(--surface)" stroke="${turning ? GRN : 'currentColor'}" stroke-width="${turning ? 3 : 2}"/>` + seg([[xu, 214], [xu + 8, 230]], LN[0], run_) + seg([[xv, 214], [xv, 223]], LN[1], run_)
        + `<g transform="rotate(${Math.round(ang[0]) % 360} ${xm + DX} 250)"><circle cx="${xm + DX}" cy="231" r="3" fill="${turning ? GRN : 'var(--muted)'}" stroke="none"/><circle cx="${xm + DX + 16.5}" cy="259.5" r="3" fill="${turning ? GRN : 'var(--muted)'}" stroke="none"/><circle cx="${xm + DX - 16.5}" cy="259.5" r="3" fill="${turning ? GRN : 'var(--muted)'}" stroke="none"/></g>`
        + T(xm + DX, 251, 'M', { z: 15, b: 1, a: 'middle' }) + T(xm + DX, 262, conn === 'delta' ? '3~ Δ' : conn === 'star' ? '3~ Y' : '3~ ?', { z: 9, a: 'middle', f: conn ? 'var(--muted)' : 'var(--danger)', b: !conn }) + T(xu - 6, 210, 'U1', { z: 8, a: 'end', f: 'var(--muted)' }) + T(xv + 5, 210, 'V1', { z: 8, f: 'var(--muted)' }) + T(xw + 4, 216, 'W1', { z: 8, f: 'var(--muted)' })
        + T(xm + DX, 292, st.hum ? 'hums, does not turn' : st.n > 0.02 ? 'forward ↻' : st.n < -0.02 ? 'reverse ↺' : 'motor 230 / 400 V', { z: 10, a: 'middle', f: st.hum ? 'var(--danger)' : 'var(--muted)', b: !!st.hum });
      // the run capacitor
      const cx = 214, capsym = (x, y, lab, on) => `<path d="M${x - 9} ${y} h18 M${x - 9} ${y + 6} h18" stroke="${on ? GRN : 'currentColor'}" stroke-width="2.6"/>` + T(x + 14, y + 7, lab, { z: 9.5, b: 1, m: 1 });
      if (cap === 'ln') g += seg([[xu, 184], [cx, 184], [cx, 192]], LN[0], run_) + capsym(cx, 192, 'C', false) + seg([[cx, 198], [cx, 204], [xv + 4, 204]], LN[1], run_) + `<circle cx="${xu}" cy="184" r="2.3" fill="${run_ ? LN[0] : DEAD}" stroke="none"/>` + seg([[xw, 222], [xw - 8, 230]], DEAD, false);
      else if (cap) { const fromL = cap === 'wl', xs0 = fromL ? xu : xv, yT = fromL ? 180 : 188, c = run_ ? (fromL ? LN[0] : LN[1]) : DEAD; g += seg([[xs0, yT], [cx, yT], [cx, 196]], fromL ? LN[0] : LN[1], run_, run_ && good) + capsym(cx, 196, 'C run', run_ && good) + seg([[cx, 202], [cx, 222], [xw, 222], [xw - 8, 230]], '#a855f7', run_, run_ && good) + `<circle cx="${xs0}" cy="${yT}" r="2.3" fill="${c}" stroke="none"/>`; }
      else g += capsym(cx, 196, 'C ?', false) + T(cx, 220, 'not wired yet', { z: 9, a: 'middle', f: 'var(--danger)', b: 1 }) + seg([[xw, 222], [xw - 8, 230]], DEAD, false);
      if (scn === 'steinh') { const b = ok && v('K2'); g += seg([[xu, 172], [262, 172], [262, 178]], LN[0], run_, b) + `<circle cx="${xu}" cy="172" r="2.3" fill="${run_ ? LN[0] : DEAD}" stroke="none"/>` + (b ? `<path d="M262 178 V194" stroke="${LN[0]}" stroke-width="2.6"/>` : `<path d="M262 194 L255 180" stroke="currentColor" stroke-width="1.8"/>`) + T(270, 190, 'KM2', { z: 9.5, b: 1, m: 1, f: b ? 'var(--power)' : 'currentColor' }) + seg([[262, 194], [262, 204]], LN[0], run_ && b) + capsym(262, 204, '', b) + T(262, 226, 'C start', { z: 9, a: 'middle', b: 1, m: 1 }) + seg([[262, 210], [262, 214]], '#a855f7', b) + seg([[262, 232], [262, 238], [cx, 238], [cx, 222]], '#a855f7', run_ && b, b); }
      read = ['speed ' + st.rpm + ' rpm', 'about 70 % of the motor power'];
    } else if (scn === 'res') {
      const a = ok && v('K1'), b = ok && v('K2'), x = 110, hot = Math.min(100, Math.round(st.heat / 80));
      g = B3() + tap(x, 40, PHC) + dev(x, 40, 'q', ok, 'Q1', 'main breaker', PHC, true) + run(x, 74, 88, ok, a) + dev(x, 88, 'k', a, 'KM1', 'line', PHC, ok) + run(x, 122, 144, a, a && !b);
      xs(x, 3).forEach((p, i) => { g += `<rect x="${p - 4.5}" y="144" width="9" height="30" rx="2" fill="${a && !b ? (hot > 70 ? 'var(--danger)' : '#f5a524') : 'var(--surface)'}" stroke="${a ? PHC[i] : DEAD}" stroke-width="1.8"/>` + seg([[p, 128 + i * 4], [xs(218, 3)[i], 128 + i * 4], [xs(218, 3)[i], 140]], PHC[i], a, a && b) + seg([[xs(218, 3)[i], 174], [xs(218, 3)[i], 180 + i * 4], [p, 180 + i * 4]], PHC[i], a && b, a && b); });
      g += T(x - 24, 162, 'R', { z: 11, b: 1, a: 'end', m: 1 }) + T(x - 24, 173, hot + ' % hot', { z: 8, a: 'end', f: hot > 70 ? 'var(--danger)' : 'var(--muted)' }) + dev(218, 140, 'k', b, 'KM2', 'bypass', PHC, a) + run(x, 174, 196, a, a) + ovl(x, 196, 'F2', a) + run(x, 222, 232, a, a) + motor(x, 273, st.n, ang[0], 'fan motor', '3~', a); vb = [300, 322];
      read = ['speed ' + st.pct + ' %', b ? 'resistors bridged' : a ? 'through the resistors' : 'stopped'];
    } else if (scn === 'at') {
      const k1 = ok && v('K1'), k2 = ok && v('K2'), k3 = ok && v('K3'), xa = 84, xb = 210, xq = 146, hot = Math.min(100, Math.round(st.heat / 100)), out = k1 || k2;
      g = B3() + tap(xq, 38, PHC) + dev(xq, 38, 'q', ok, 'Q1', 'main breaker', PHC, true);
      [xa, xb].forEach((x) => xs(x, 3).forEach((p, i) => { g += seg([[xs(xq, 3)[i], 72], [xs(xq, 3)[i], 78 + i * 5], [p, 78 + i * 5], [p, 96]], PHC[i], ok, x === xa ? k2 : k1); }));
      g += dev(xa, 96, 'k', k2, 'KM2', 'transformer', PHC, ok) + run(xa, 130, 142, k2, k2) + `<rect x="${xa - 26}" y="142" width="52" height="40" rx="6" fill="${k2 ? (hot > 70 ? 'var(--danger-soft)' : 'var(--power-soft)') : 'var(--surface-2)'}" stroke="${k2 ? GRN : 'var(--line)'}" stroke-width="1.6"/>` + T(xa, 159, 'T1 · 65 %', { z: 9.5, b: 1, a: 'middle', m: 1 }) + T(xa, 172, hot + ' % hot', { z: 8, a: 'middle', f: hot > 70 ? 'var(--danger)' : 'var(--muted)' })
        + run(xa, 182, 192, k2 && k3, k2 && k3) + dev(xa, 192, 'k', k3, 'KM3', 'star point', PHC, k2) + seg([[xa - DX, 226], [xa - DX, 232], [xa + DX, 232], [xa + DX, 226]], '#7c8794', k3) + seg([[xa, 226], [xa, 232]], '#7c8794', k3);
      g += dev(xb, 96, 'k', k1, 'KM1', 'run', PHC, ok);
      xs(xb, 3).forEach((p, i) => { g += seg([[p, 130], [p, 196]], PHC[i], k1, k1) + seg([[xa + 26, 154 + i * 5], [p, 154 + i * 5]], PHC[i], k2 && !k1, k2 && !k1) + `<circle cx="${p}" cy="${154 + i * 5}" r="2" fill="${out ? PHC[i] : DEAD}" stroke="none"/>` + seg([[p, 154 + i * 5], [p, 196]], PHC[i], out, out); });
      g += ovl(xb, 196, 'F2', out) + run(xb, 222, 232, out, out) + motor(xb, 273, st.n, ang[0], 'compressor motor', '3~', out); vb = [300, 322];
      read = ['speed ' + st.pct + ' %', k1 ? 'full voltage' : k2 && k3 ? '65 % voltage' : 'stopped'];
    } else if (scn === 'rotor') {
      const k1 = ok && v('K1'), s1 = v('K2'), s2 = v('K3'), x = 84, hot = Math.min(100, Math.round(st.heat / 120));
      g = B3() + feeder(x, 'K1', 'KM1', 'F2', st.n, ang[0], 'slip-ring motor', 'Q1', true);
      const yr = 245; g += seg([[x + 25, yr], [150, yr]], '#a855f7', k1, k1) + T(128, yr - 6, 'rings', { z: 8, a: 'middle', f: 'var(--muted)' });
      [[176, 'R1', 'K11', s1], [236, 'R2', 'K12', s2]].forEach(([rx, rl, kl, on], i) => {
        const br = on || (i === 0 && s2);
        g += `<rect x="${rx - 22}" y="${yr - 12}" width="44" height="24" rx="5" fill="${k1 && !br ? (hot > 70 ? 'var(--danger)' : '#f5a524') : 'var(--surface-2)'}" stroke="${k1 ? '#a855f7' : 'var(--line)'}" stroke-width="1.6"/>` + T(rx, yr + 4, rl, { z: 10, b: 1, a: 'middle', m: 1 }) + T(rx, yr + 24, br ? 'bridged' : 'in circuit', { z: 8, a: 'middle', f: 'var(--muted)' })
          + seg([[rx + 22, yr], [rx + 38, yr]], '#a855f7', k1, k1) + seg([[rx - 30, yr], [rx - 30, yr - 44], [rx - 8, yr - 44]], '#a855f7', k1 && on, k1 && on) + seg([[rx + 8, yr - 44], [rx + 30, yr - 44], [rx + 30, yr]], '#a855f7', k1 && on, k1 && on)
          + (on ? `<path d="M${rx - 8} ${yr - 44} H${rx + 8}" stroke="#a855f7" stroke-width="2.6"/>` : `<path d="M${rx - 8} ${yr - 44} L${rx + 6} ${yr - 52}" stroke="currentColor" stroke-width="1.8"/>`) + T(rx, yr - 58, kl, { z: 10.5, b: 1, a: 'middle', m: 1, f: on ? 'var(--power)' : 'currentColor' });
      });
      g += `<path d="M274 ${yr - 8} v16 M279 ${yr - 5} v10" stroke="currentColor" stroke-width="1.8"/>` + T(212, yr + 40, 'rotor resistors ' + hot + ' % hot', { z: 8.5, a: 'middle', f: hot > 70 ? 'var(--danger)' : 'var(--muted)' });
      read = ['speed ' + st.pct + ' %', s2 ? 'all bridged' : s1 ? 'step 1 bridged' : k1 ? 'all resistance in' : 'stopped'];
    } else if (scn === 'tank') {
      const p = ok && v('K1'), h = 150 * st.level / 100; vb = [462, 300];
      g = bus(PHC, ['L1', 'L2', 'L3'], 26, 200) + feeder(92, 'K1', 'KM1', 'F2', p ? 1 : 0, ang[0], 'pump motor');
      g += `<rect x="286" y="56" width="104" height="156" rx="6" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><rect x="288" y="${210 - h}" width="100" height="${h}" rx="3" fill="#3b82f6" fill-opacity=".5" stroke="none"/>` + T(338, 48, 'tank ' + st.lv + ' %', { z: 10, a: 'middle', b: 1 })
        + [['B2', 80, 'high'], ['B1', 30, 'low']].map(([b, lv, lab]) => { const y = 210 - 150 * lv / 100; return `<path d="M390 ${y} h10" stroke="${v(b) ? GRN : 'currentColor'}" stroke-width="2"/><circle cx="405" cy="${y}" r="5" fill="${v(b) ? GRN : 'var(--surface)'}" stroke="currentColor" stroke-width="1.5"/>` + T(415, y + 1, b, { z: 10, b: 1, m: 1 }) + T(415, y + 12, lab + ' ' + lv + ' %', { z: 8.5, f: 'var(--muted)' }); }).join('')
        + seg([[230, 245], [262, 245], [262, 74], [286, 74]], '#3b82f6', p, p) + `<path d="M338 212 v22 M332 228 l6 7 l6 -7" stroke="#3b82f6" stroke-width="2"/>` + T(338, 250, 'water is used', { z: 8.5, a: 'middle', f: 'var(--muted)' });
      g += `<circle cx="216" cy="245" r="15" fill="var(--surface)" stroke="${p ? GRN : 'currentColor'}" stroke-width="2.2"/><path d="M209 237 l16 8 l-16 8" stroke="${p ? GRN : 'currentColor'}" stroke-width="2"/><path d="M117 245 H201" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>` + T(216, 274, 'pump', { z: 9, a: 'middle', f: 'var(--muted)' });
      read = ['level ' + st.lv + ' %', 'pump starts ' + st.starts];
    }
    return { svg: `<svg viewBox="-6 0 ${vb[0] + 6} ${vb[1]}" fill="none" stroke="currentColor" stroke-linecap="round" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="Power circuit">${g}</svg>`, read };
  }

  // ───────────── the bench ─────────────
  const W = 84, H = 54, X0 = 30, Y0 = 44, CXO = 30;
  function bench(main, id) {
    css();
    const task = id === 'free' ? EC.FREE : EC.BY_ID[id];
    if (!task) return list(main);
    const store = load();
    let circ = EC.parse(store.circ[task.id] != null ? store.circ[task.id] : task.starter || '');
    let sim = null, tool = null, undo = [], hint = 0, askSol = false, timer = 0, lastSig = '';
    const ang = [0, 0, 0], part = {}; task.parts.forEach((p) => (part[p.d] = p));
    const idx = EC.TASKS.indexOf(task), next = idx >= 0 ? EC.TASKS[idx + 1] : null, hasPow = task.scn !== 'none';
    const page = el(`<div class="wrap ec">
      <div class="ec-top"><a class="btn small ghost" href="#circuits">← All circuits</a>${task.level ? `<span class="plate">Level ${task.level} · ${LEVELS[task.level]}</span>` : '<span class="plate">Free play</span>'}</div>
      <div class="ec-card ec-task"><h2>${esc(task.title)}</h2><div class="ec-brief">${task.brief}</div><div class="ec-hints"></div>
        <div class="ec-acts">${task.tests.length ? '<button class="btn go" data-a="tests">✓ Run tests</button>' : ''}${task.hints.length ? '<button class="btn" data-a="hint">Hint</button>' : ''}${task.solution ? '<button class="btn ghost" data-a="sol">Solution</button>' : ''}</div>
        <div class="results" style="margin-top:10px"></div></div>
      <div class="ec-bar"><button class="btn primary ec-go" data-a="power">⚡ Power on</button><button class="btn" data-a="mcb" hidden>Reset breaker F1</button><button class="btn small" data-a="undo">Undo</button><button class="btn small ghost" data-a="clear">Clear</button><div class="ec-status"></div></div>
      <div class="ec-sheets${hasPow ? '' : ' solo'}">
        <section class="ec-sheet ec-pow"${hasPow ? '' : ' hidden'}><header><span>Power circuit</span><small>${SUPPLY[task.scn] || '3 × 400 V'} · ${esc(SCNNAME[task.scn])}</small></header><div class="ec-paper ec-m"></div><div class="ec-fault" hidden></div><div class="ec-read"></div><div class="ec-pwq" hidden></div></section>
        <section class="ec-sheet ec-ctl"><header><span>Control circuit</span><small>230 V AC · you build this</small></header><div class="ec-paper ec-svg edit"></div>
          <div class="ec-box"><div class="ec-boxt"></div><div class="ec-pal"></div><div class="ec-door" hidden></div><div class="ec-lint"></div></div></section>
      </div></div>`);
    main.appendChild(page);
    const $ = (q) => page.querySelector(q), svgBox = $('.ec-svg');
    const status = (t, cls) => { const s = $('.ec-status'); s.className = 'ec-status' + (cls ? ' ' + cls : ''); s.textContent = t; };
    const keep = () => { store.circ[task.id] = EC.toText(circ); save(store); };
    const push = () => { undo.push(EC.toText(circ)); if (undo.length > 40) undo.shift(); };

    // ── the control circuit ──
    function ncols() { let m = 0; circ.cells.forEach((row) => row.forEach((x, c) => { if (x) m = Math.max(m, c + 1); })); circ.links.forEach((row) => row.forEach((v, c) => { if (v) m = Math.max(m, c + 2); })); return Math.max(3, Math.min(EC.COLS, m + (sim ? 0 : 1))); }
    function nrows() { let m = 0; circ.cells.forEach((row, r) => { if (row.some(Boolean)) m = r + 1; }); return Math.max(4, Math.min(EC.ROWS, m + (sim ? 0 : 1))); }
    function draw() {
      const NC = ncols(), NR = nrows(), VW = X0 + NC * W + 6, VH = Y0 + NR * H + 32, LIVE = GRN, INK = 'currentColor', DIM = 'var(--muted)';
      const col = (c, r) => { if (!sim) return INK; const i = EC.node(c, r); return sim.live(i) ? LIVE : sim.neutral(i) ? INK : DIM; };
      const ln = (x1, y1, x2, y2, c) => { const d = `M${x1} ${y1} L${x2} ${y2}`; return `<path d="${d}" stroke="${c}" stroke-width="${c === LIVE ? 3 : 1.7}"/>` + (c === LIVE ? `<path class="fl" d="${d}"/>` : ''); };
      const tx = (x, y, s, o) => `<text x="${x}" y="${y}" font-size="${o.z || 10}" ${o.b ? 'font-weight="700" ' : ''}${o.a ? 'text-anchor="' + o.a + '" ' : ''}fill="${o.f || 'currentColor'}" stroke="none"${o.m ? ' font-family="IBM Plex Mono, monospace"' : ''}>${esc(s)}</text>`;
      let g = '';
      const xl = X0 + CXO - 18, xr = X0 + (NC - 1) * W + CXO + 14, yL = Y0 - 12, yN = Y0 + NR * H + 12, railL = sim && sim.mcb && !sim.short ? LIVE : INK;
      g += ln(xl, yL, xr, yL, railL) + ln(xl, yN, xr, yN, INK) + tx(8, yL + 4, 'L', { b: 1, z: 13, f: '#b4632a' }) + tx(8, yN + 4, 'N', { b: 1, z: 13, f: BLUE });
      g += `<rect x="${xl - 4}" y="${yL - 7}" width="20" height="14" rx="3" fill="${sim && !sim.mcb ? 'var(--danger)' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.4"/>` + tx(xl + 6, yL + 3.5, 'F1', { z: 8, a: 'middle', f: sim && !sim.mcb ? '#fff' : 'currentColor' });
      for (let c = 0; c < NC; c++) {
        const cx = X0 + c * W + CXO; let after = false, reach = false;
        g += `<circle cx="${cx}" cy="12" r="8" fill="var(--surface-2)" stroke="var(--line)" stroke-width="1"/>` + tx(cx, 15.5, String(c + 1), { z: 9, a: 'middle', f: DIM, m: 1 });
        if (circ.cells[0][c]) g += ln(cx, yL, cx, Y0, sim ? col(c, 0) : INK) + `<circle cx="${cx}" cy="${yL}" r="2.4" fill="${railL}" stroke="none"/>`;
        for (let r = 0; r < NR; r++) {
          const cell = circ.cells[r][c], y = Y0 + r * H, ya = y + 17, yb = y + 37, my = y + 27, ct = col(c, r), cb = col(c, r + 1);
          if (!cell) { if (after) { g += ln(cx, y, cx, y + H, cb); if (r === NR - 1) reach = true; } else if (!sim && tool && tool.t !== 'X') g += `<path class="plus" d="M${cx - 5} ${my} h10 M${cx} ${my - 5} v10"/>`; }
          else if (cell.t === 'W') { after = false; g += ln(cx, y, cx, y + H, ct); if (r === EC.ROWS - 1) reach = true; }
          else if (cell.t === 'NO' || cell.t === 'NC') {
            after = false; if (r === EC.ROWS - 1) reach = true;
            const p = part[cell.d] || {}, k = p.k, closed = sim ? sim.conducts(cell) : cell.t === 'NC', act = sim ? !!sim.D[cell.d].v : false, bc = closed && ct === LIVE ? LIVE : INK;
            g += ln(cx, y, cx, ya, ct) + ln(cx, yb, cx, y + H, cb);
            if (cell.t === 'NO') g += closed ? ln(cx, yb, cx, ya, bc) : `<path d="M${cx} ${yb} L${cx - 11} ${ya + 3}" stroke="currentColor" stroke-width="2"/>`;
            else g += ln(cx, ya, cx + 8, ya, ct) + (closed ? ln(cx, yb, cx + 8, ya, bc) : `<path d="M${cx} ${yb} L${cx - 10} ${ya + 5}" stroke="currentColor" stroke-width="2"/>`);
            const ac = act ? LIVE : INK, a0 = cx - 6, a1 = cx - 17, cap = CAPC[p.c];
            if (k !== 'k') g += `<path d="M${a0} ${my} H${a1}" stroke="${ac}" stroke-width="1.2" stroke-dasharray="3 2"/>`;
            if (k === 'pb') g += `<path d="M${a1 - 5} ${my - 6} H${a1} V${my + 6} H${a1 - 5} Z" fill="${cap || 'none'}" stroke="${cap || ac}" stroke-width="1.6"/>`;
            else if (k === 'es') g += `<path d="M${a1} ${my - 8} A8 8 0 0 0 ${a1} ${my + 8} Z" fill="#dc2626" stroke="#dc2626" stroke-width="1.4"/>`;
            else if (k === 'sel') g += `<path d="M${a1} ${my - 6} V${my + 6} M${a1 - 6} ${my - 5} L${a1} ${my}" stroke="${ac}" stroke-width="1.8"/>`;
            else if (k === 'ls') g += `<circle cx="${a1 - 3}" cy="${my}" r="3.4" stroke="${ac}" stroke-width="1.6"/>`;
            else if (k === 'ol') g += `<path d="M${a1 - 6} ${my + 4} V${my - 4} H${a1} V${my + 4}" stroke="${act ? 'var(--danger)' : INK}" stroke-width="1.6"/>`;
            else if (k === 'kt') g += `<path d="M${a1 + 2} ${my - 5} A6 6 0 0 0 ${a1 + 2} ${my + 5}" stroke="${ac}" stroke-width="1.6"/>`;
            const tm = (TERM[k] || TERM.k)[cell.t];
            g += tx(cx + 4, ya - 4, tm[0], { z: 7.5, f: DIM, m: 1 }) + tx(cx + 4, yb + 9, tm[1], { z: 7.5, f: DIM, m: 1 });
            g += tx(cx + 17, my, cell.d, { b: 1, z: 12, m: 1 }) + tx(cx + 17, my + 11, p.n || '', { z: 9, f: DIM });
          } else {
            after = true; if (r === NR - 1) reach = true; const on = sim ? !!sim.D[cell.d].en : false, p = part[cell.d] || {};
            g += ln(cx, y, cx, my - 9, ct) + ln(cx, my + 9, cx, y + H, cb);
            if (cell.t === 'LAMP') g += `<circle cx="${cx}" cy="${my}" r="9.5" fill="${on ? LAMPC[p.c] || LAMPC.green : 'var(--surface)'}" stroke="currentColor" stroke-width="1.6"${on ? ` style="filter:drop-shadow(0 0 6px ${LAMPC[p.c] || LAMPC.green})"` : ''}/><path d="M${cx - 6.5} ${my - 6.5} L${cx + 6.5} ${my + 6.5} M${cx - 6.5} ${my + 6.5} L${cx + 6.5} ${my - 6.5}" stroke="currentColor" stroke-width="1.3"/>`;
            else if (cell.t === 'HORN') g += `<path d="M${cx - 10} ${my - 7} H${cx + 10} V${my + 1} A10 10 0 0 1 ${cx - 10} ${my + 1} Z" fill="${on ? '#f5a524' : 'var(--surface)'}" stroke="currentColor" stroke-width="1.6"${on ? ' style="filter:drop-shadow(0 0 6px #f5a524)"' : ''}/>`;
            else {
              g += `<rect${on ? ' class="glow"' : ''} x="${cx - 14}" y="${my - 9}" width="28" height="18" rx="2.5" fill="${on ? 'var(--power-soft)' : 'var(--surface)'}" stroke="${on ? LIVE : 'currentColor'}" stroke-width="${on ? 2.4 : 1.6}"/>`;
              if (cell.t === 'TON') g += `<rect x="${cx - 22}" y="${my - 9}" width="8" height="18" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/><path d="M${cx - 22} ${my - 9} L${cx - 14} ${my + 9} M${cx - 22} ${my + 9} L${cx - 14} ${my - 9}" stroke="currentColor" stroke-width="1.1"/>`;
              if (cell.t === 'TOF') g += `<rect x="${cx - 22}" y="${my - 9}" width="8" height="18" fill="currentColor" stroke="currentColor" stroke-width="1.4"/>`;
              if (cell.t === 'TON' || cell.t === 'TOF') g += tx(cx, my + 3.5, cell.s + ' s', { z: 8.5, a: 'middle', m: 1 });
              g += tx(cx + 4, my - 12, 'A1', { z: 7.5, f: DIM, m: 1 }) + tx(cx + 4, my + 18, 'A2', { z: 7.5, f: DIM, m: 1 });
            }
            g += tx(cx + 19, my, cell.d, { b: 1, z: 12, m: 1 }) + tx(cx + 19, my + 11, cell.t === 'TON' ? 'on-delay' : cell.t === 'TOF' ? 'off-delay' : p.n || '', { z: 9, f: DIM });
          }
        }
        if (reach) g += ln(cx, Y0 + NR * H, cx, yN, INK) + `<circle cx="${cx}" cy="${yN}" r="2.4" fill="currentColor" stroke="none"/>`;
      }
      for (let r = 1; r < NR; r++) for (let c = 0; c < NC - 1; c++) {
        const x1 = X0 + c * W + CXO, y = Y0 + r * H;
        if (circ.links[r][c]) { const k = col(c, r); g += ln(x1, y, x1 + W, y, k) + `<circle cx="${x1}" cy="${y}" r="2.8" fill="${k}" stroke="none"/><circle cx="${x1 + W}" cy="${y}" r="2.8" fill="${k}" stroke="none"/>`; }
      }
      let hit = '';
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) hit += `<rect class="hit" x="${X0 + c * W + 2}" y="${Y0 + r * H + 2}" width="${W - 4}" height="${H - 4}" rx="8" data-c="${c}" data-r="${r}"/>`;
      if (!sim) for (let r = 1; r < NR; r++) for (let c = 0; c < NC - 1; c++) hit += `<circle class="lh${circ.links[r][c] ? ' on' : ''}" cx="${X0 + c * W + CXO + W / 2}" cy="${Y0 + r * H}" r="5" data-lr="${r}" data-lc="${c}"><title>Link these two paths here</title></circle>`;
      svgBox.innerHTML = `<svg viewBox="0 0 ${VW} ${VH}" style="max-width:${Math.round(VW * 1.75)}px" fill="none" stroke="currentColor" stroke-linecap="round" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="Control circuit">${g}${hit}</svg>`;
    }

    // ── parts box (edit) and panel door (live) ──
    const forms = (p) => (['pb', 'es', 'sel', 'ls'].includes(p.k) ? [['NO', 'NO'], ['NC', 'NC']] : p.k === 'k' ? [['COIL', 'coil'], ['NO', 'NO'], ['NC', 'NC']] : p.k === 'kt' ? [['TON', 'coil'], ['NO', 'NO'], ['NC', 'NC']] : p.k === 'ol' ? [['NC', '95-96'], ['NO', '97-98']] : [[p.k === 'horn' ? 'HORN' : p.k === 'valve' ? 'VALVE' : 'LAMP', 'place']]);
    function palette() {
      const on = (t, d) => (tool && tool.t === t && tool.d === d ? ' class="on"' : '');
      $('.ec-boxt').textContent = 'Parts box · pick one, then tap a cell';
      $('.ec-pal').innerHTML = task.parts.map((p) => `<div class="ec-dev"><span><b>${p.d}</b> ${esc(p.n)}<small>${KIND[p.k]}</small></span>${forms(p).map(([t, l]) => `<button type="button" data-t="${t}" data-d="${p.d}"${on(t, p.d)}>${ico(t)}${l}</button>`).join('')}${p.k === 'kt' ? `<input type="number" min="1" max="30" value="${p.s || 3}" data-time="${p.d}" aria-label="Time of ${p.d} in seconds"> s` : ''}</div>`).join('')
        + `<button type="button" class="ec-tool${tool && tool.t === 'W' ? ' on' : ''}" data-t="W">${ico('W')}Wire</button><button type="button" class="ec-tool${tool && tool.t === 'X' ? ' on' : ''}" data-t="X">${ico('X')}Erase</button>`;
    }
    function door() {
      const free = task.scn === 'none' || task.scn === 'free';
      $('.ec-boxt').textContent = 'Panel door · press the buttons';
      $('.ec-door').innerHTML = task.parts.map((p) => {
        const v = sim ? sim.D[p.d].v : 0;
        if (p.k === 'lamp') return `<div class="ec-di"><span class="ec-lmp${v ? ' on' : ''}" style="--lc:${LAMPC[p.c] || LAMPC.green}"></span>${esc(p.n)}<small>${p.d}</small></div>`;
        if (p.k === 'horn') return `<div class="ec-di"><span class="ec-lmp${v ? ' on' : ''}" style="--lc:#f5a524"></span>${esc(p.n)}<small>${v ? 'sounds' : p.d}</small></div>`;
        if (p.k === 'pb') return `<div class="ec-di"><button type="button" class="ec-pb${v ? ' on' : ''}" style="--cap:${CAPC[p.c] || '#334155'}" data-op="${p.d}" data-hold="1" aria-label="${esc(p.n)}: hold to press"></button>${esc(p.n)}<small>${p.d}</small></div>`;
        if (p.k === 'es') return `<div class="ec-di"><button type="button" class="ec-pb es${v ? ' on' : ''}" data-op="${p.d}" aria-pressed="${!!v}" aria-label="Emergency stop"></button>${esc(p.n)}<small>${v ? 'pressed' : p.d}</small></div>`;
        if (p.k === 'sel') return `<div class="ec-di"><button type="button" class="ec-sel${v ? ' on' : ''}" data-op="${p.d}" aria-pressed="${!!v}" aria-label="${esc(p.n)}"></button>${esc(p.n)}<small>${v ? 'ON' : 'off'}</small></div>`;
        if (p.k === 'ol') return `<div class="ec-di"><button type="button" class="ec-olb${v ? ' on' : ''}" data-op="${p.d}">${p.d} ${v ? 'TRIPPED' : 'overload'}<small>${v ? 'tap to reset' : 'tap to trip'}</small></button></div>`;
        if (p.k === 'ls') return free ? `<div class="ec-di"><button type="button" class="ec-olb${v ? ' on' : ''}" data-op="${p.d}">${p.d} ${esc(p.n)}<small>${v ? 'actuated' : 'free'}</small></button></div>` : `<div class="ec-di"><span class="ec-ind${v ? ' on' : ''}"><b>${p.d} ${esc(p.n)}</b>${v ? 'actuated' : 'free'}</span></div>`;
        return '';
      }).join('');
    }
    function lint() { const w = sim ? [] : EC.lint(circ, task); $('.ec-lint').innerHTML = w.map((x) => `<div>${esc(x)}</div>`).join(''); }
    function hints() { $('.ec-hints').innerHTML = task.hints.slice(0, hint).map((t, k) => `<div class="hint"><b>Hint ${k + 1}.</b> ${esc(t)}</div>`).join(''); const b = $('[data-a="hint"]'); if (b) { b.textContent = hint < task.hints.length ? 'Hint ' + (hint + 1) + '/' + task.hints.length : 'No more hints'; b.disabled = hint >= task.hints.length; } }
    function pwq() {
      const q = task.power || [], box = $('.ec-pwq'); box.hidden = !q.length || !!sim; if (!q.length) return;
      box.innerHTML = q.map((x) => `<div class="${circ.pw[x.k] ? '' : 'need'}"><b>${esc(x.q)}</b><div class="o">${x.o.map(([val, lab]) => `<button type="button" data-pk="${x.k}" data-pv="${val}" class="${circ.pw[x.k] === val ? 'on' : ''}">${esc(lab)}</button>`).join('')}</div></div>`).join('');
      box.classList.toggle('need', q.some((x) => !circ.pw[x.k]));
    }
    function machine() {
      if (!hasPow) return;
      const st = sim ? sim.st : EC.SCN[task.scn].init(), r = powerSvg(task.scn, st, sim ? sim.D : {}, circ.pw || {}, ang);
      $('.ec-m').innerHTML = r.svg; $('.ec-read').innerHTML = r.read.map((x) => `<span>${esc(x)}</span>`).join('') || '<span style="color:var(--muted)">Power on to see it work</span>';
      const f = $('.ec-fault'); f.hidden = !st.fault; f.textContent = st.fault ? '⚠ ' + st.fault : '';
    }

    // ── live ──
    const sig = () => task.parts.map((p) => sim.D[p.d].v + '' + sim.D[p.d].en).join('') + (sim.mcb ? 1 : 0);
    let lastT = 0;
    function frame() {
      if (!sim || !document.body.contains(page)) { clearInterval(timer); timer = 0; return; }
      const now = performance.now(); let n = Math.min(12, Math.round((now - lastT) / 10)); lastT = now;
      while (n-- > 0) sim.tick();
      const st = sim.st; ang[0] += (st.n || st.n1 || st.dir || 0) * 26; ang[1] += (st.n2 || 0) * 26; ang[2] += (st.n3 || 0) * 26;
      const s = sig();
      if (s !== lastSig) {
        lastSig = s; draw(); door();
        const onNow = task.parts.filter((p) => ['k', 'kt', 'lamp', 'horn', 'valve'].includes(p.k) && sim.D[p.d].en).map((p) => p.n + ' (' + p.d + ')');
        if (sim.short) status(sim.short + ' Find the path without a load and fix it (Power off), or press Reset breaker.', 'bad');
        else status('Live. Green wires have voltage. On now: ' + (onNow.length ? onNow.join(', ') : 'nothing') + '.', 'live');
        $('[data-a="mcb"]').hidden = sim.mcb;
      }
      if (st.fault && !sim.shown) { sim.shown = 1; status(st.fault, 'bad'); }
      machine();
    }
    function power(on) {
      if (on) { sim = new EC.Sim(circ, task); lastSig = ''; lastT = performance.now(); timer = setInterval(frame, 50); }
      else { sim = null; clearInterval(timer); timer = 0; status(EC.isEmpty(circ) ? 'Pick a part in the parts box, then tap a cell. Current runs from L (top) to N (bottom).' : 'Edit mode. Pick a part and tap a cell, or tap a dot between two paths to link them. Then Power on.'); }
      const b = $('[data-a="power"]'); b.textContent = on ? '■ Power off (edit)' : '⚡ Power on'; b.classList.toggle('primary', !on);
      svgBox.classList.toggle('edit', !on); $('.ec-pal').hidden = on; $('.ec-door').hidden = !on; $('[data-a="mcb"]').hidden = true;
      $('[data-a="undo"]').hidden = on; $('[data-a="clear"]').hidden = on;
      draw(); pwq(); if (on) { door(); frame(); } else { palette(); lint(); machine(); }
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
      const t = e.target.closest('[data-a],[data-t],[data-op],[data-c],[data-lr],[data-pk]'); if (!t) return;
      const a = t.dataset.a;
      if (a === 'power') return power(!sim);
      if (a === 'mcb') { sim.resetMcb(); lastSig = ''; return; }
      if (a === 'tests') return runTests();
      if (a === 'hint') { hint++; return hints(); }
      if (a === 'sol') { if (!askSol) { askSol = true; t.textContent = 'Replace my circuit? Tap again'; return; } askSol = false; t.textContent = 'Solution'; if (sim) power(false); push(); circ = EC.parse(task.solution); keep(); draw(); lint(); pwq(); machine(); return; }
      if (a === 'undo') { if (undo.length) { circ = EC.parse(undo.pop()); keep(); draw(); lint(); pwq(); machine(); } return; }
      if (a === 'clear') { if (!EC.isEmpty(circ)) { push(); circ = EC.empty(); keep(); draw(); lint(); pwq(); machine(); status('Cleared. Undo brings it back.'); } return; }
      if (t.dataset.pk && !sim) { push(); circ.pw[t.dataset.pk] = circ.pw[t.dataset.pk] === t.dataset.pv ? '' : t.dataset.pv; keep(); pwq(); lint(); machine(); return; }
      if (t.dataset.t && !sim) { tool = tool && tool.t === t.dataset.t && tool.d === t.dataset.d ? null : { t: t.dataset.t, d: t.dataset.d }; palette(); draw(); if (tool) status(tool.t === 'X' ? 'Erase: tap a part to remove it.' : tool.t === 'W' ? 'Wire: tap a cell to draw a wire straight down through it.' : 'Now tap a cell to place ' + tool.d + (tool.t === 'NO' || tool.t === 'NC' ? ' ' + tool.t : '') + '.'); return; }
      if (t.dataset.lr && !sim) { push(); const r = +t.dataset.lr, c = +t.dataset.lc; circ.links[r][c] = !circ.links[r][c]; keep(); draw(); lint(); return; }
      if (t.dataset.c != null) {
        const r = +t.dataset.r, c = +t.dataset.c, cell = circ.cells[r][c];
        if (sim) { if (!cell || !cell.d) return; const p = part[cell.d], d = sim.D[cell.d]; if (p && (p.k === 'sel' || p.k === 'es' || p.k === 'ol' || (p.k === 'ls' && (task.scn === 'none' || task.scn === 'free')))) d.v = d.v ? 0 : 1; return; }
        if (!tool) return status('First pick a part in the parts box (for example "NO" of a button), then tap a cell.');
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
    page.addEventListener('contextmenu', (e) => { if (e.target.closest('.ec-door,.ec-svg')) e.preventDefault(); });
    hints(); power(false);
  }
  LL.CircuitUI = { list, bench };
})();
