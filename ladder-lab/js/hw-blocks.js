/* PLC Start: FC and FB made visible, and the standards map. Mounted in lessons through [[hw:blocks]] and [[hw:stdmap]].
 * [[hw:blocks]]  The block factory: one block, three CALLs that run three conveyors. Switch the block between FB (each
 *                instance has its own memory drawer) and FC (no memory: the drawer is emptied after every call), or put
 *                the classic bug in it (a global M bit inside the FB). The scan cursor walks the calls one by one.
 * [[hw:stdmap]]  The standards in one picture: IEC 61131 as a rack of ten modules, and where the other numbers sit
 *                in a plant. Tap a module or a chip for the short version and the one line to say in an interview.
 * The logic and the data are pure (LL.BlockSim, LL.STD) and tested in node. */
(function (G) {
  const LL = (G.LL = G.LL || {});
  // ───────────── pure: one scan of three CALLs of FB_StartStop ─────────────
  const BlockSim = {
    init: () => ({ kind: 'FB', bug: false, mem: [0, 0, 0], glob: 0, run: [0, 0, 0], start: [0, 0, 0], stop: 1, scans: 0 }),
    scan(st) {
      st.scans++;
      for (let i = 0; i < 3; i++) {
        let m = st.kind === 'FC' ? 0 : st.bug ? st.glob : st.mem[i];        // FC: the temporary #Mem starts empty every call
        m = st.start[i] || (m && st.stop) ? 1 : 0;                         // seal-in: Start OR (Mem AND Stop)
        st.run[i] = m;
        if (st.kind === 'FB') { if (st.bug) st.glob = m; else st.mem[i] = m; }
      }
      return st;
    },
  };
  LL.BlockSim = BlockSim;
  // ───────────── the standards ─────────────
  const STD = {
    parts: [
      ['1', 'General information', 'What a PLC is, the words and the features. The dictionary.', 2, 'IEC 61131-1 defines what a PLC is and the words we use.'],
      ['2', 'Equipment and tests', 'The hardware: 24 V inputs and outputs, noise, temperature, the tests a PLC must pass.', 2, 'Part 2 is why a 24 V input reads a sensor the same on every brand.'],
      ['3', 'Programming languages', 'LD, FBD, ST, SFC (and the old IL), data types, timers, counters, and the program units: PROGRAM, FUNCTION, FUNCTION_BLOCK.', 3, 'IEC 61131-3 is the reason an FB, a TON or ST look almost the same in TIA Portal, CODESYS and Studio 5000.'],
      ['4', 'User guidelines', 'Advice for users: choosing, installing and maintaining a PLC system.', 1, 'Part 4 is guidance for the whole life of a PLC system.'],
      ['5', 'Communications', 'How a PLC exchanges data with other devices (send, receive, status).', 1, 'Part 5 is the communication functions; in practice you meet the fieldbus standards.'],
      ['6', 'Functional safety', 'Safety PLCs: what makes a PLC fit for safety functions.', 2, 'Part 6 is about safety PLCs; machine safety itself is ISO 13849 and IEC 62061.'],
      ['7', 'Fuzzy control', 'Fuzzy logic programming. Rare.', 1, 'Part 7 exists, you will almost never use it.'],
      ['8', 'Guidelines for the languages', 'How to apply part 3 well: good practice for programs.', 2, 'Part 8 is the "how to write good 61131-3 code" guide.'],
      ['9', 'IO-Link (SDCI)', 'Single-drop digital communication for sensors and actuators: IO-Link.', 2, 'IO-Link is IEC 61131-9: smart sensors on a normal 3-wire cable.'],
      ['10', 'PLCopen XML exchange', 'A file format to move programs between brands and tools.', 1, 'Part 10 is the XML format to exchange programs between tools.'],
    ],
    layers: [
      ['Business and production', [['ISA-95 / IEC 62264', 'How the plant floor talks to the office: orders, recipes, production reports (MES / ERP).', 'ISA-95 defines the levels from the sensor (0) to the business system (4).']]],
      ['Batches and packaging', [['ISA-88 / IEC 61512', 'Batch control: recipes, units, phases, procedures. Food, pharma, chemicals.', 'ISA-88 separates the recipe from the equipment that runs it.'], ['PackML (ISA-TR88.00.02)', 'One state machine for packaging machines: Idle, Execute, Held, Aborted… The same buttons on every machine.', 'PackML gives every machine the same states and modes.']]],
      ['Control programs', [['IEC 61131-3', 'The PLC languages and blocks: LD, FBD, ST, SFC, FC, FB, data types.', 'All big PLC brands follow IEC 61131-3.'], ['IEC 61499', 'Distributed blocks driven by events, spread over many devices.', 'IEC 61499 is for event-driven, distributed control; 61131-3 is cyclic.']]],
      ['Networks and data', [['IEC 61158 / IEC 61784', 'The fieldbus family: PROFIBUS, PROFINET, EtherCAT, EtherNet/IP, Modbus TCP profiles.', 'The fieldbuses are standardised in IEC 61158 and 61784.'], ['IEC 62541 (OPC UA)', 'OPC UA: secure, brand-free data exchange from machines to IT.', 'OPC UA is IEC 62541: the common language from machine to MES.'], ['IEC 61131-9 (IO-Link)', 'The last metre to the sensor.', 'IO-Link brings parameters and diagnostics from each sensor.']]],
      ['Machine safety', [['IEC 60204-1', 'Electrical equipment of machines: E-stop, colours, wiring, protective earth, control voltages.', 'IEC 60204-1 is the rule book for the electrics of a machine.'], ['ISO 13849-1', 'Safety of control systems: Performance Level PL a to e, categories B, 1–4.', 'ISO 13849 rates a safety function from PL a to PL e.'], ['IEC 62061', 'The same goal as ISO 13849, with SIL 1 to 3.', 'IEC 62061 rates safety functions in SIL.'], ['IEC 61508 / IEC 61511', 'The base standard of functional safety, and its version for the process industry.', 'IEC 61508 is the mother standard; 61511 is for process plants.'], ['ISO 12100', 'Risk assessment: find the hazards first, then reduce them.', 'Every safety design starts with an ISO 12100 risk assessment.']]],
      ['Drawings and colours', [['IEC 60617', 'The graphical symbols on electrical drawings.', 'Contacts, coils and motors are drawn with IEC 60617 symbols.'], ['IEC 81346', 'Reference designations: =plant +location -device, like -K1, -Q1, -S0.', 'IEC 81346 gives every device its name and place on the drawing.'], ['ISO 1219', 'Pneumatic and hydraulic symbols and names (1A1, 1V1).', 'ISO 1219 is the fluid power drawing.'], ['IEC 60073', 'Colours of lamps and buttons: red stop / danger, green start / safe, yellow warning, blue must act.', 'Lamp and button colours follow IEC 60073 and IEC 60204-1.']]],
      ['Security', [['IEC 62443', 'Cyber security for automation: zones, conduits, users, patches.', 'IEC 62443 protects machines and plants against attacks.']]],
    ],
  };
  LL.STD = STD;
  if (typeof document === 'undefined') return;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CSS = `
.hw-bf { display: grid; gap: 12px; }
.bf-top { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
.bf-seg { display: inline-flex; border: 1px solid var(--edge); border-radius: var(--r-ctl); overflow: hidden; }
.bf-seg button { appearance: none; border: 0; background: var(--surface); color: var(--ink); font: 600 var(--t-13) var(--f-body); padding: 8px 12px; min-height: 40px; cursor: pointer; }
.bf-seg button + button { border-left: 1px solid var(--edge); }
.bf-seg button.on { background: #4f46e5; color: #fff; }
.bf-bug { display: inline-flex; gap: 8px; align-items: center; font-size: var(--t-13); cursor: pointer; }
.bf-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 12px; align-items: start; }
.bf-tpl { border: 2px solid #4f46e5; border-radius: var(--r-panel); background: var(--surface); padding: 10px 12px; }
.bf-tpl h4 { margin: 0 0 6px; font: 700 var(--t-14) var(--f-mono); color: #4f46e5; }
.bf-tpl table { width: 100%; border-collapse: collapse; font-size: var(--t-12); }
.bf-tpl td { padding: 3px 4px; border-bottom: 1px solid var(--line-2); }
.bf-tpl td:first-child { font: 600 var(--t-11) var(--f-mono); color: var(--muted); }
.bf-tpl .bf-code { margin-top: 8px; font: 500 var(--t-12)/1.5 var(--f-mono); background: var(--surface-2); padding: 6px 8px; border-radius: var(--r-ctl); white-space: pre; overflow-x: auto; }
.bf-calls { display: grid; gap: 8px; }
.bf-call { display: grid; grid-template-columns: 150px 120px minmax(0, 1fr); grid-template-areas: 'n code code' 'drawer pb belt'; gap: 8px 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--line); border-radius: var(--r-panel); background: var(--surface); transition: box-shadow .15s, border-color .15s; }
.bf-call.cur { border-color: #4f46e5; box-shadow: 0 0 0 2px color-mix(in srgb, #4f46e5 30%, transparent); }
.bf-call .bf-n { grid-area: n; font: 700 var(--t-12) var(--f-mono); color: #4f46e5; }
.bf-call code { grid-area: code; }
.bf-call .bf-drawer { grid-area: drawer; }
.bf-call .bf-pb { grid-area: pb; }
.bf-call .bf-belt { grid-area: belt; }
.bf-call code { font: 500 var(--t-12) var(--f-mono); color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.bf-pb { appearance: none; font: 700 var(--t-13) var(--f-body); border: 0; border-radius: 999px; min-height: 40px; padding: 0 14px; background: radial-gradient(circle at 40% 35%, #3fd17a, #088339); color: #fff; cursor: pointer; box-shadow: 0 3px 0 #05542a; touch-action: none; }
.bf-pb:active, .bf-pb.down { transform: translateY(2px); box-shadow: 0 1px 0 #05542a; }
.bf-drawer { border: 1px dashed var(--edge); border-radius: var(--r-ctl); padding: 6px 8px; font: 500 var(--t-12) var(--f-mono); text-align: center; min-height: 40px; display: grid; place-items: center; }
.bf-drawer.has { border-style: solid; border-color: #4f46e5; background: color-mix(in srgb, #4f46e5 8%, var(--surface)); }
.bf-drawer.on { background: color-mix(in srgb, var(--power-bright) 22%, var(--surface)); border-color: var(--power); }
.bf-drawer.bug { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, var(--surface)); }
.bf-belt { height: 36px; border-radius: 6px; border: 2px solid var(--edge); background: repeating-linear-gradient(90deg, #5d666b 0 10px, #8d969b 10px 20px); background-size: 40px 100%; position: relative; }
.bf-belt.run { animation: bf-run .5s linear infinite; border-color: var(--power); }
.bf-belt::after { content: attr(data-l); position: absolute; inset: 0; display: grid; place-items: center; font: 700 var(--t-12) var(--f-body); color: #fff; text-shadow: 0 1px 2px #000; }
@keyframes bf-run { to { background-position: 40px 0; } }
.bf-foot { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.bf-say { font-size: var(--t-14); padding: 8px 12px; border-left: 4px solid #4f46e5; background: var(--surface-2); border-radius: 0 var(--r-ctl) var(--r-ctl) 0; }
.bf-say.bad { border-left-color: var(--danger); }
@media (max-width: 760px) { .bf-grid { grid-template-columns: minmax(0, 1fr); } .bf-call { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: 'n n' 'drawer pb' 'belt belt'; } .bf-call code { display: none; } }
.sm-tabs { display: inline-flex; border: 1px solid var(--edge); border-radius: var(--r-ctl); overflow: hidden; }
.sm-tabs button { appearance: none; border: 0; background: var(--surface); color: var(--ink); font: 600 var(--t-13) var(--f-body); padding: 8px 12px; min-height: 40px; cursor: pointer; }
.sm-tabs button + button { border-left: 1px solid var(--edge); }
.sm-tabs button.on { background: var(--ink); color: var(--surface); }
.sm-rack { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 4px; padding: 10px; border-radius: var(--r-panel); background: linear-gradient(180deg, #3a4044, #22272a); }
.sm-mod { appearance: none; border: 0; cursor: pointer; min-height: 120px; border-radius: 3px; background: linear-gradient(180deg, #e9ecea, #c9cec9); color: #161a1d; display: grid; grid-template-rows: auto 1fr auto; justify-items: center; padding: 6px 2px; font: 600 11px/1.2 var(--f-body); }
.sm-mod b { font: 700 var(--t-16) var(--f-mono); }
.sm-mod i { width: 9px; height: 9px; border-radius: 50%; background: #5d666b; }
.sm-mod.k3 i { background: #088339; box-shadow: 0 0 6px #3fd17a; } .sm-mod.k2 i { background: #e9a100; }
.sm-mod.on { outline: 3px solid #4f46e5; outline-offset: -3px; background: linear-gradient(180deg, #fff, #dfe3df); }
.sm-mod span { writing-mode: vertical-rl; transform: rotate(180deg); text-align: left; max-height: 80px; overflow: hidden; }
.sm-layers { display: grid; gap: 6px; }
.sm-layer { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 10px; align-items: center; padding: 8px 10px; border-radius: var(--r-ctl); background: var(--surface); border: 1px solid var(--line); }
.sm-layer > b { font-size: var(--t-13); color: var(--ink-2); }
.sm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sm-chip { appearance: none; cursor: pointer; font: 600 var(--t-12) var(--f-mono); padding: 7px 10px; min-height: 36px; border-radius: var(--r-ctl); border: 1px solid var(--edge); background: var(--surface-2); color: var(--ink); }
.sm-chip.on { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.sm-card { padding: 12px 14px; border: 1px solid #4f46e5; border-left: 6px solid #4f46e5; border-radius: var(--r-panel); background: var(--surface); }
.sm-card h4 { margin: 0 0 4px; font-size: var(--t-16); }
.sm-card p { margin: 0 0 6px; font-size: var(--t-14); color: var(--ink-2); }
.sm-card .sm-say { font-size: var(--t-14); color: var(--ink); }
.sm-card .sm-need { font: 600 var(--t-12) var(--f-mono); color: var(--muted); }
@media (max-width: 760px) { .sm-rack { grid-template-columns: repeat(5, minmax(0, 1fr)); } .sm-layer { grid-template-columns: minmax(0, 1fr); } }
`;
  const css = () => { if (!document.getElementById('hw-bf-css')) { const s = document.createElement('style'); s.id = 'hw-bf-css'; s.textContent = CSS; document.head.appendChild(s); } };
  LL.HW = LL.HW || {};

  LL.HW.blocks = function (ph) {
    css();
    const st = BlockSim.init();
    let cur = 0, slow = true;
    const box = document.createElement('div'); box.className = 'hw-box hw-bf';
    box.innerHTML = `<div class="bf-top"><div class="bf-seg" role="radiogroup" aria-label="Kind of block"><button type="button" data-k="FB">FB: with memory</button><button type="button" data-k="FC">FC: no memory</button></div>
        <label class="bf-bug"><input type="checkbox" data-bug> Put the classic bug in: a global M10.0 inside the FB</label></div>
      <div class="bf-grid"><div class="bf-tpl"></div><div class="bf-calls">${[0, 1, 2].map((i) => `<div class="bf-call" data-i="${i}"><span class="bf-n">CALL ${i + 1}</span><code></code><div class="bf-drawer"></div><button type="button" class="bf-pb" data-pb="${i}">START ${i + 1}</button><div class="bf-belt" data-l="Conveyor ${i + 1}"></div></div>`).join('')}</div></div>
      <div class="bf-foot"><button type="button" class="btn" data-stop>STOP (all)</button><label class="bf-bug"><input type="checkbox" data-slow checked> Show the scan going through the calls</label></div>
      <div class="bf-say" aria-live="polite"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q), $$ = (q) => box.querySelectorAll(q);
    $$('[data-k]').forEach((b) => b.addEventListener('click', () => { st.kind = b.dataset.k; st.mem = [0, 0, 0]; st.glob = 0; draw(); }));
    $('[data-bug]').addEventListener('change', (e) => { st.bug = e.target.checked; st.mem = [0, 0, 0]; st.glob = 0; draw(); });
    $('[data-slow]').addEventListener('change', (e) => { slow = e.target.checked; });
    $$('[data-pb]').forEach((b) => {
      const i = +b.dataset.pb, set = (v) => (e) => { e.preventDefault(); st.start[i] = v; b.classList.toggle('down', !!v); };
      b.addEventListener('pointerdown', set(1)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, set(0)));
      b.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') set(1)(e); }); b.addEventListener('keyup', set(0));
    });
    const sb = $('[data-stop]'), stopSet = (v) => (e) => { e.preventDefault(); st.stop = v; sb.classList.toggle('on', !v); };
    sb.addEventListener('pointerdown', stopSet(0)); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => sb.addEventListener(ev, stopSet(1)));
    function draw() {
      const fc = st.kind === 'FC', bug = st.bug && !fc;
      $$('[data-k]').forEach((b) => b.classList.toggle('on', b.dataset.k === st.kind));
      $('[data-bug]').disabled = fc;
      const name = (fc ? 'FC' : 'FB') + '_StartStop';
      $('.bf-tpl').innerHTML = `<h4>${name}</h4><table><tr><td>IN</td><td>Start</td></tr><tr><td>IN</td><td>Stop</td></tr><tr><td>OUT</td><td>Run</td></tr><tr><td>${fc ? 'TEMP' : bug ? 'GLOBAL!' : 'STATIC'}</td><td>${bug ? 'M10.0' : '#Mem'}</td></tr></table><div class="bf-code">${esc(`${bug ? 'M10.0' : 'Mem'} := Start OR\n  (${bug ? 'M10.0' : 'Mem'} AND Stop);\nRun := ${bug ? 'M10.0' : 'Mem'};`)}</div>`;
      $$('.bf-call').forEach((row, i) => {
        row.classList.toggle('cur', slow && i === cur);
        row.querySelector('code').textContent = `CALL ${name}${fc ? '' : ', Conv' + (i + 1)}  Start=PB${i + 1}  Run=Q0.${i}`;
        const d = row.querySelector('.bf-drawer'), m = bug ? st.glob : st.mem[i];
        d.className = 'bf-drawer' + (fc ? '' : ' has') + (bug ? ' bug' : '') + (!fc && m ? ' on' : '');
        d.textContent = fc ? 'no instance: #Mem is thrown away' : bug ? 'Conv' + (i + 1) + ': uses M10.0 = ' + m : 'Conv' + (i + 1) + '.Mem = ' + m;
        row.querySelector('.bf-belt').classList.toggle('run', !!st.run[i]);
      });
      const say = $('.bf-say'), n = st.run.filter(Boolean).length;
      say.classList.toggle('bad', bug && n > 0 && st.start.filter(Boolean).length < n);
      say.textContent = fc ? 'FC: the block forgets #Mem after every call. A conveyor runs only while you hold its START. Same inputs, same result: good for maths, bad for memory.'
        : bug ? 'Bug: all three instances read and write the same global bit M10.0. Start one conveyor and the next ones in the scan start too. Inside an FB, keep memory in #static variables.'
        : 'FB: every CALL has its own instance (Conv1, Conv2, Conv3) with its own #Mem. Start them one by one: each one remembers on its own. STOP clears all three.';
    }
    let raf = 0, last = 0, acc = 0;
    function tick(t) {
      raf = requestAnimationFrame(tick);
      if (!box.isConnected) { cancelAnimationFrame(raf); return; }
      BlockSim.scan(st);
      acc += t - (last || t); last = t;
      if (acc > 380) { acc = 0; cur = (cur + 1) % 3; }
      draw();
    }
    draw(); raf = requestAnimationFrame(tick);
  };

  LL.HW.stdmap = function (ph) {
    css();
    let tab = 'rack', sel = '3';
    const box = document.createElement('div'); box.className = 'hw-box hw-bf';
    box.innerHTML = `<div class="sm-tabs" role="tablist"><button type="button" data-t="rack">IEC 61131: the PLC standard</button><button type="button" data-t="map">All the other numbers</button></div><div class="sm-body"></div><div class="sm-card" aria-live="polite"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    box.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; sel = tab === 'rack' ? '3' : 'IEC 60204-1'; draw(); }));
    const need = (k) => ['', 'Good to know the name', 'Know what it is for', 'Know it well'][k];
    function draw() {
      box.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
      if (tab === 'rack') {
        $('.sm-body').innerHTML = `<div class="sm-rack" role="radiogroup" aria-label="Parts of IEC 61131">${STD.parts.map((p) => `<button type="button" role="radio" class="sm-mod k${p[3]}${p[0] === sel ? ' on' : ''}" data-p="${p[0]}" aria-checked="${p[0] === sel}"><b>${p[0]}</b><span>${esc(p[1])}</span><i></i></button>`).join('')}</div>`;
        box.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { sel = b.dataset.p; draw(); }));
        const p = STD.parts.find((x) => x[0] === sel);
        $('.sm-card').innerHTML = `<h4>IEC 61131-${esc(p[0])}: ${esc(p[1])}</h4><p>${esc(p[2])}</p><p class="sm-say"><b>Say it in an interview:</b> ${esc(p[4])}</p><span class="sm-need">Lamp: ${need(p[3])} (green = know it well, amber = know what it is for, grey = the name is enough)</span>`;
      } else {
        $('.sm-body').innerHTML = `<div class="sm-layers">${STD.layers.map(([lay, list]) => `<div class="sm-layer"><b>${esc(lay)}</b><div class="sm-chips">${list.map((c) => `<button type="button" class="sm-chip${c[0] === sel ? ' on' : ''}" data-c="${esc(c[0])}">${esc(c[0])}</button>`).join('')}</div></div>`).join('')}</div>`;
        box.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => { sel = b.dataset.c; draw(); const c = $('.sm-card'); if (c.getBoundingClientRect().bottom > innerHeight) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }));
        let c = null, lay = '';
        STD.layers.forEach(([l, list]) => list.forEach((x) => { if (x[0] === sel) { c = x; lay = l; } }));
        if (c) $('.sm-card').innerHTML = `<h4>${esc(c[0])}</h4><p>${esc(c[1])}</p><p class="sm-say"><b>Say it in an interview:</b> ${esc(c[2])}</p><span class="sm-need">Level: ${esc(lay)}</span>`;
      }
    }
    draw();
  };
})(typeof window !== 'undefined' ? window : globalThis);
