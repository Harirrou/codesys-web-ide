/* Ladder Lab — HMI screen editor: build an operator screen and run it. Mounted in lessons through [[hw:hmi]].
 * The learner places elements from a toolbox (push button, switch, lamp, number display, number input, bar graph,
 * alarm banner, screen button) on a 6 × 6 grid, links each one to a tag of a small built-in machine
 * (pump + tank: Start_PB M20.0, Stop_PB M20.1, Pump Q0.0, Level IW64, Setpoint MW30, Alarm_Limit MW32,
 * Alarm_High M40.0), then presses Run: a built-in PLC program (independent of the main engine) runs the pump
 * with the learner's screen. Five design rules are checked live: momentary start / stop, no E-stop on the HMI,
 * grey background with colour only for abnormal states (ISA-101), units on numbers, limits on inputs. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};

  const STORE = 'll-hw-hmi';
  const COLS = 6, ROWS = 6;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ───────── the machine: tags ───────── */
  const TAG_ORDER = ['start', 'stop', 'pump', 'level', 'sp', 'lim', 'alarm'];
  const TAG = {
    start: { n: 'Start_PB', bit: true, a: 'M20.0', d: 'start bit: the HMI writes it', src: 'hmi' },
    stop: { n: 'Stop_PB', bit: true, a: 'M20.1', d: 'stop bit: the HMI writes it', src: 'hmi' },
    pump: { n: 'Pump', bit: true, a: 'Q0.0', d: 'pump contactor: a PLC output', src: 'out' },
    level: { n: 'Level', bit: false, a: 'IW64', d: 'level sensor: a PLC input, 0–100 %', src: 'in' },
    sp: { n: 'Setpoint', bit: false, a: 'MW30', d: 'fill to this level, in %', src: 'hmi' },
    lim: { n: 'Alarm_Limit', bit: false, a: 'MW32', d: 'high alarm limit, in %', src: 'hmi' },
    alarm: { n: 'Alarm_High', bit: true, a: 'M40.0', d: 'high level alarm: the PLC sets it', src: 'plc' },
  };

  /* ───────── brands ───────── */
  const BRANDS = ['siemens', 'rockwell', 'schneider', 'codesys', 'omron'];
  const BR = {
    siemens: { label: 'Siemens', sub: 'WinCC', tool: 'WinCC (TIA Portal)', users: 'User administration: users, roles and rights. Put the right on the button that opens the screen.', type: ['Bool', 'Int'] },
    rockwell: { label: 'Rockwell', sub: 'FactoryTalk View', tool: 'FactoryTalk View ME (PanelView Plus)', users: 'Security codes (A–P): give the display a code, give the code to the users who may open it.', type: ['BOOL', 'INT'] },
    schneider: { label: 'Schneider', sub: 'Vijeo Designer', tool: 'Vijeo Designer (Harmony HMI)', users: 'Security: users, groups and a security level on the panel.', type: ['BOOL', 'INT'] },
    codesys: { label: 'CODESYS', sub: 'TwinCAT · Visu', tool: 'CODESYS Visualization / TwinCAT PLC HMI', users: 'User management: groups and access rights on the visualization.', type: ['BOOL', 'INT'] },
    omron: { label: 'Omron', sub: 'Sysmac NA', tool: 'Sysmac Studio (NA HMI)', users: 'Security: user levels; set the level on the page.', type: ['BOOL', 'INT'] },
  };
  // What each element is called in each tool.
  const BN = {
    pb: { siemens: 'Button, event "SetBitWhileKeyPressed"', rockwell: 'Momentary push button', schneider: 'Bit switch, operation "Momentary"', codesys: 'Button, input "Tap" (TRUE while pressed)', omron: 'Button, type "Momentary"' },
    pbset: { siemens: 'Button, event "SetBit"', rockwell: 'Latched push button', schneider: 'Bit switch, operation "Set"', codesys: 'Button, input "Execute ST code" (x := TRUE)', omron: 'Button, action "SetVariable"' },
    pbtog: { siemens: 'Button, event "InvertBit"', rockwell: 'Maintained push button', schneider: 'Bit switch, operation "Alternate"', codesys: 'Button, input "Toggle"', omron: 'Button, type "Toggle"' },
    sw: { siemens: 'Switch', rockwell: 'Maintained push button', schneider: 'Bit switch, operation "Alternate"', codesys: 'Button, input "Toggle"', omron: 'Button, type "Toggle"' },
    lamp: { siemens: 'Circle with an "Appearance" animation', rockwell: 'Multistate indicator', schneider: 'Lamp', codesys: 'Lamp', omron: 'Lamp' },
    num: { siemens: 'I/O field, mode "Output"', rockwell: 'Numeric display', schneider: 'Numeric display', codesys: 'Text field with %d', omron: 'Data display' },
    inp: { siemens: 'I/O field, mode "Input" (limits on the HMI tag)', rockwell: 'Numeric input enable (min / max on the object)', schneider: 'Numeric display with input (min / max)', codesys: 'Text field, input "Write variable" (min / max)', omron: 'Data edit (min / max)' },
    bar: { siemens: 'Bar', rockwell: 'Bar graph', schneider: 'Bar graph', codesys: 'Bar display', omron: 'Bar' },
    alarm: { siemens: 'Alarm window / alarm indicator', rockwell: 'Alarm banner', schneider: 'Alarm banner', codesys: 'Alarm banner / alarm table', omron: 'Alarm viewer (banner)' },
    scr: { siemens: 'Button, event "ActivateScreen"', rockwell: 'Goto display button', schneider: 'Panel switch', codesys: 'Button, input "Change shown visualization"', omron: 'Button, action "ShowPage"' },
    estop: { siemens: 'none: a real E-stop is wired', rockwell: 'none: a real E-stop is wired', schneider: 'none: a real E-stop is wired', codesys: 'none: a real E-stop is wired', omron: 'none: a real E-stop is wired' },
  };
  function addr(k, b) {
    const t = TAG[k];
    if (b === 'rockwell' || b === 'omron') return t.n;
    if (b === 'siemens') return t.a;
    const m = /^([MQI])(W?)(\d+)(?:\.(\d))?$/.exec(t.a); // CODESYS, TwinCAT, Schneider Machine Expert
    return m[2] ? '%' + m[1] + 'W' + m[3] : '%' + m[1] + 'X' + m[3] + '.' + m[4];
  }

  /* ───────── element types ───────── */
  const TYPES = {
    pb: { name: 'Push button', w: 2, h: 1, kind: 'bit', label: 'BUTTON' },
    sw: { name: 'Switch', w: 2, h: 1, kind: 'bit', label: 'Switch' },
    lamp: { name: 'Lamp', w: 2, h: 1, kind: 'bit', label: 'Lamp' },
    num: { name: 'Number display', w: 2, h: 1, kind: 'word', label: 'Value' },
    inp: { name: 'Number input', w: 2, h: 1, kind: 'word', label: 'Input' },
    bar: { name: 'Bar graph', w: 1, h: 3, kind: 'word', label: 'Bar' },
    alarm: { name: 'Alarm banner', w: 6, h: 1, kind: 'bit', label: 'High level in the tank' },
    scr: { name: 'Screen button', w: 2, h: 1, kind: 'screen', label: '' },
    estop: { name: 'E-stop button', w: 2, h: 1, kind: 'bit', label: 'E-STOP' },
  };
  const TOOL_ORDER = ['pb', 'sw', 'lamp', 'num', 'inp', 'bar', 'alarm', 'scr', 'estop'];
  const TICON = {
    pb: '<rect x="3" y="7" width="18" height="10" rx="2.5"/><path d="M8 12h8"/>',
    sw: '<rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="16" cy="12" r="2.4"/>',
    lamp: '<circle cx="12" cy="11" r="5.5"/><path d="M9.5 20h5M12 16.5V20"/>',
    num: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M10 10h2.5v2H10v2h2.5M15.5 10H18v4h-2.5"/>',
    inp: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h5M15 9v6"/>',
    bar: '<rect x="8" y="3" width="8" height="18" rx="1.5"/><path d="M8 12h8M8 15h8M8 18h8"/>',
    alarm: '<path d="M12 4l9 15H3z"/><path d="M12 10v4M12 17v.01"/>',
    scr: '<rect x="3" y="5" width="12" height="11" rx="1.5"/><path d="M13 18h8M18 15l3 3-3 3"/>',
    estop: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  };
  const ico = (k) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + TICON[k] + '</svg>';
  const LOCK = '<svg class="hwh-lk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  const BG = { grey: 'Grey (ISA-101)', blue: 'Dark blue', black: 'Black', white: 'White' };
  const LAMPC = { white: 'White', green: 'Green', blue: 'Blue', amber: 'Amber', red: 'Red' };
  const LAMPHEX = { white: '#f6f8fa', green: '#22b14c', blue: '#2f7ee6', amber: '#f2a51a', red: '#e0302a' };
  const LV = ['Everyone', 'Operator (level 1)', 'Technician (level 2)', 'Admin (level 3)'];
  const LVS = ['Everyone', 'Operator', 'Technician', 'Admin'];
  const SCRN = { main: 'Main', set: 'Settings' };
  const ACT = { mom: 'Momentary: 1 only while pressed', set: 'Set bit: becomes 1 and stays 1', tog: 'Toggle: each touch flips the bit' };

  let cleanup = null;

  /* ───────── state ───────── */
  function start() {
    return { brand: 'siemens', mode: 'edit', scr: 'main', sel: 0, next: 1, ranOk: false, cap: '', capKind: '',
      screens: { main: { bg: 'blue', lvl: 0, els: [] }, set: { bg: 'blue', lvl: 0, els: [] } } };
  }
  function cleanEl(e) {
    if (!e || typeof e !== 'object' || !TYPES[e.t]) return null;
    const T = TYPES[e.t], o = mkEl(e.t, +e.id || 0, 'main');
    ['label', 'unit', 'min', 'max', 'smin', 'smax'].forEach((k) => { if (typeof e[k] === 'string') o[k] = e[k].slice(0, 24); });
    if (TAG[e.tag] && (T.kind === 'bit' ? TAG[e.tag].bit : T.kind === 'word' ? !TAG[e.tag].bit : false)) o.tag = e.tag;
    if (ACT[e.act]) o.act = e.act;
    if (LAMPC[e.on]) o.on = e.on;
    if (e.color === 'red' || e.color === 'amber') o.color = e.color;
    if (SCRN[e.target]) o.target = e.target;
    o.x = clamp(Math.round(+e.x || 0), 0, COLS - T.w); o.y = clamp(Math.round(+e.y || 0), 0, ROWS - T.h);
    return o;
  }
  function load() {
    const s = start();
    try {
      const r = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (r && typeof r === 'object') {
        if (BR[r.brand]) s.brand = r.brand;
        s.ranOk = !!r.ranOk;
        if (typeof r.cap === 'string') s.cap = r.cap;
        if (['', 'ok', 'bad'].indexOf(r.capKind) >= 0) s.capKind = r.capKind;
        if (r.scr === 'set') s.scr = 'set';
        let mx = 0;
        ['main', 'set'].forEach((k) => {
          const R = r.screens && r.screens[k];
          if (!R) return;
          if (BG[R.bg]) s.screens[k].bg = R.bg;
          if ([0, 1, 2, 3].indexOf(R.lvl) >= 0) s.screens[k].lvl = R.lvl;
          (Array.isArray(R.els) ? R.els : []).slice(0, 36).forEach((e) => {
            const o = cleanEl(e);
            if (!o || !o.id || !fits(s.screens[k].els, o, o.x, o.y, 0)) return;
            s.screens[k].els.push(o); mx = Math.max(mx, o.id);
          });
        });
        s.next = mx + 1;
      }
    } catch (e) { /* ignore */ }
    return s;
  }
  function mkEl(t, id, scr) {
    const e = { id, t, x: 0, y: 0, label: TYPES[t].label, tag: '', act: 'mom', on: 'green', unit: '', min: '', max: '', smin: '0', smax: '100', color: 'red', target: scr === 'set' ? 'main' : 'set' };
    if (t === 'scr') e.label = scr === 'set' ? '← Main' : 'Settings →';
    return e;
  }
  function fits(els, e, x, y, ignore) {
    const T = TYPES[e.t];
    if (x < 0 || y < 0 || x + T.w > COLS || y + T.h > ROWS) return false;
    return !els.some((o) => o.id !== ignore && o.id !== e.id && x < o.x + TYPES[o.t].w && o.x < x + T.w && y < o.y + TYPES[o.t].h && o.y < y + T.h);
  }
  const num = (s) => { const t = String(s == null ? '' : s).trim(); return /^-?\d+$/.test(t) ? +t : null; };
  function limOk(e) { const a = num(e.min), b = num(e.max); return a != null && b != null && a < b && a >= 0 && b <= 100; }
  function limWhy(e) {
    const a = num(e.min), b = num(e.max);
    if (a == null && b == null) return 'no Min and no Max';
    if (a == null) return 'no Min';
    if (b == null) return 'no Max';
    if (a >= b) return 'Min (' + a + ') is not smaller than Max (' + b + ')';
    if (a < 0 || b > 100) return 'the range ' + a + ' … ' + b + ' goes outside 0 … 100 %';
    return '';
  }
  const ESTOP_RX = /e[\s.-]?stop|emergency|not[\s-]?(halt|aus)/i;

  /* ───────── CSS (once) ───────── */
  const CSS = `
.hw-hmi{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px 16px 16px;margin:18px 0;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;color:var(--ink);--hwh-ok:#0d7a3a;--hwh-bad:#b3261e}
:root[data-theme="dark"] .hw-hmi{--hwh-ok:var(--power);--hwh-bad:var(--danger)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hw-hmi{--hwh-ok:var(--power);--hwh-bad:var(--danger)}}
.hw-hmi p{margin:0;max-width:none}
.hw-hmi [hidden]{display:none!important}
.hw-hmi button,.hw-hmi input,.hw-hmi select{scroll-margin:84px 0 150px}
.hwh-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.hwh-eb{font-family:var(--f-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.hwh-ttl{font-family:var(--f-display);font-weight:700;font-size:1.3rem;line-height:1.15;margin-top:3px;text-wrap:balance}
.hwh-hr{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.hwh-prog{font-family:var(--f-mono);font-size:.76rem;color:var(--muted);white-space:nowrap}
.hwh-seg{display:flex;flex-wrap:wrap;gap:4px;padding:4px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:12px}
.hwh-seg button{flex:1 1 0;min-width:92px;min-height:46px;border:0;border-radius:9px;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 8px;font-weight:700;font-size:.93rem;color:var(--ink-2);line-height:1.2}
.hwh-seg button small{font-weight:500;font-size:.72rem;color:var(--muted)}
.hwh-seg button:hover{color:var(--ink)}
.hwh-seg button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:0 0 0 1.5px var(--ink),0 2px 6px rgba(0,0,0,.12)}
.hwh-intro{font-size:.95rem;color:var(--ink-2);line-height:1.5}
.hwh-intro b{color:var(--ink)}
.hwh-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between}
.hwh-mode{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface-2)}
.hwh-mode button{min-height:42px;padding:4px 16px;border:0;background:transparent;color:var(--ink-2);font-weight:700;font-size:.92rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.hwh-mode button+button{border-left:1px solid var(--line)}
.hwh-mode button svg{width:16px;height:16px}
.hwh-mode button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwh-mode button.run[aria-pressed="true"]{background:var(--power);color:#fff}
.hwh-tabs{display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}
.hwh-tabs>span{font-size:.8rem;color:var(--muted);margin-right:2px}
.hwh-tabs button{min-height:38px;padding:3px 13px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink-2);font-weight:600;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.hwh-tabs button[aria-pressed="true"]{border-color:var(--ink);color:var(--ink);box-shadow:inset 0 -3px 0 var(--accent-bg)}
.hwh-tabs button:disabled{cursor:default;opacity:.55}
.hwh-tabs button[aria-pressed="true"]:disabled{opacity:1}
.hwh-lk{width:12px;height:12px;flex:none}
.hwh-work{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
.hw-hmi.w2 .hwh-work{grid-template-columns:minmax(0,1fr) 250px}
.hw-hmi.w2 .hwh-tools{grid-column:1/-1}
.hw-hmi.w3 .hwh-work{grid-template-columns:150px minmax(0,1fr) 260px}
.hw-hmi.w3 .hwh-tools{grid-column:auto}
.hw-hmi.w2.run .hwh-work{grid-template-columns:minmax(0,1fr) 270px}
.hw-hmi.w3.run .hwh-work{grid-template-columns:minmax(0,1fr) 300px}
.hwh-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;align-content:start}
.hw-hmi.w2 .hwh-tools{grid-template-columns:repeat(auto-fill,minmax(118px,1fr))}
.hw-hmi.w3 .hwh-tools{grid-template-columns:minmax(0,1fr)}
.hwh-tools .hwh-th{grid-column:1/-1;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.hwh-tool{min-height:44px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:8px;padding:5px 9px;font-size:.84rem;font-weight:600;text-align:left;line-height:1.15}
.hwh-tool:hover{border-color:var(--ink-2);background:var(--surface)}
.hwh-tool svg{width:20px;height:20px;flex:none;color:var(--ink-2)}
.hwh-tool:active{transform:translateY(1px)}
.hw-hmi:not(.w2) .hwh-tool{flex-direction:column;justify-content:center;gap:3px;text-align:center;font-size:.76rem;padding:6px 4px;min-height:58px}
.hwh-stage{min-width:0;display:grid;gap:6px}
.hwh-hmi{background:#232a31;border-radius:14px;padding:9px;box-shadow:0 1px 0 rgba(255,255,255,.06) inset,0 4px 14px rgba(0,0,0,.18);position:relative;max-width:640px;width:100%;justify-self:center}
.hwh-sbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:32px;padding:0 4px 7px;color:#e4eaee;font:600 .8rem var(--f-body)}
.hwh-sbar b{font-weight:700;display:inline-flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hwh-sbar small{color:#9fb0bc;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hwh-sbar select{min-height:30px;max-width:150px;border-radius:7px;border:1px solid #4a5661;background:#323c45;color:#eef2f5;font:600 .8rem var(--f-body);padding:2px 6px;cursor:pointer}
.hwh-scr{position:relative;display:grid;grid-template-columns:repeat(${COLS},minmax(0,1fr));grid-template-rows:repeat(${ROWS},var(--rh,52px));border-radius:6px;overflow:hidden;background:#c4c9cd;color:#1c2329;--gl:rgba(0,0,0,.11)}
.hwh-scr.bg-blue{background:#1e4f8f;--gl:rgba(255,255,255,.13)}
.hwh-scr.bg-black{background:#0e1215;--gl:rgba(255,255,255,.12)}
.hwh-scr.bg-white{background:#f2f4f5;--gl:rgba(0,0,0,.09)}
.hwh-scr.edit{background-image:linear-gradient(to right,var(--gl) 1px,transparent 1px),linear-gradient(to bottom,var(--gl) 1px,transparent 1px);background-size:calc(100% / ${COLS}) var(--rh,52px);cursor:default}
.hwh-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:16px;font:600 .9rem var(--f-body);color:rgba(0,0,0,.55);pointer-events:none}
.hwh-scr.bg-blue .hwh-empty,.hwh-scr.bg-black .hwh-empty{color:rgba(255,255,255,.7)}
.hwh-el{position:relative;margin:3px;min-width:0;min-height:0;display:flex;user-select:none;-webkit-user-select:none;border-radius:6px;font-family:var(--f-body);color:#1c2329;outline:none}
.hwh-scr.edit .hwh-el{cursor:grab;touch-action:none}
.hwh-scr.edit .hwh-el.drag{cursor:grabbing;z-index:5;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))}
.hwh-scr.edit .hwh-el:focus-visible{box-shadow:0 0 0 3px var(--info)}
.hwh-el.sel::after{content:'';position:absolute;inset:-3px;border:2.5px solid #ffb02e;border-radius:8px;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
.hwh-el.flash::after{content:'';position:absolute;inset:-3px;border-radius:8px;pointer-events:none;animation:hwh-fl 1.2s ease-out}
@keyframes hwh-fl{0%,40%{box-shadow:0 0 0 4px #ffb02e}100%{box-shadow:0 0 0 4px transparent}}
.hwh-chip{position:absolute;top:-3px;right:-2px;z-index:2;font:700 9.5px/14px var(--f-mono);padding:0 4px;border-radius:4px;background:rgba(20,26,31,.82);color:#fff;pointer-events:none;max-width:calc(100% + 4px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hwh-chip.bad{background:#c62828}
.hwh-face{flex:1;min-width:0;display:flex;align-items:center;border-radius:6px;background:#e3e6e9;border:1px solid #8d969d;overflow:hidden}
.hwh-pb{justify-content:center;text-align:center;font-weight:700;font-size:13px;letter-spacing:.03em;background:linear-gradient(#f6f7f8,#d3d8dc);box-shadow:0 2px 0 #6f7a82;padding:0 6px;white-space:nowrap;text-overflow:ellipsis}
.hwh-scr.live .hwh-el[data-t="pb"],.hwh-scr.live .hwh-el[data-t="scr"],.hwh-scr.live .hwh-el[data-t="estop"],.hwh-scr.live .hwh-el[data-t="sw"],.hwh-scr.live .hwh-el[data-t="inp"]{cursor:pointer;touch-action:manipulation}
.hwh-pb.dn{transform:translateY(2px);box-shadow:0 0 0 #6f7a82;background:linear-gradient(#c9cfd4,#dde1e4)}
.hwh-pb.scr{gap:5px;font-weight:600;letter-spacing:0}
.hwh-sw{justify-content:space-between;gap:6px;padding:0 8px;font-weight:600;font-size:12.5px}
.hwh-sw>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hwh-trk{width:38px;height:20px;border-radius:10px;background:#9aa3aa;flex:none;position:relative;transition:background .15s}
.hwh-trk i{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.4);transition:left .15s}
.hwh-trk.on{background:#38434c}.hwh-trk.on i{left:20px}
.hwh-lamp{gap:8px;padding:0 8px;font-weight:600;font-size:12.5px}
.hwh-lamp>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hwh-dot{width:20px;height:20px;border-radius:50%;flex:none;background:#7d868d;border:2px solid #59636b;box-shadow:inset 0 -3px 4px rgba(0,0,0,.25)}
.hwh-dot.on{box-shadow:inset 0 -3px 4px rgba(0,0,0,.15),0 0 8px 1px var(--lc)}
.hwh-nf{flex-direction:column;align-items:stretch;justify-content:center;padding:1px 7px;gap:0;background:#eef0f2}
.hwh-nf small{font-size:10.5px;font-weight:600;color:#4a555e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}
.hwh-nf b{font:700 16px/1.2 var(--f-mono);text-align:right;white-space:nowrap;overflow:hidden}
.hwh-nf b em{font:600 12px var(--f-body);font-style:normal;color:#4a555e;margin-left:3px}
.hwh-nf b em.miss{color:#c62828}
.hwh-nf.inp b{background:#fff;border:1px solid #9aa3aa;border-radius:4px;padding:0 5px;box-shadow:inset 0 1px 2px rgba(0,0,0,.18)}
.hwh-nf.inp small::after{content:' ✎';color:#2f6fc4}
.hwh-bf{flex-direction:column;align-items:center;justify-content:space-between;padding:4px 4px 3px;gap:3px;background:#eef0f2}
.hwh-bf small{font-size:10.5px;font-weight:600;color:#4a555e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.hwh-bt{flex:1;width:26px;position:relative;background:#fff;border:1px solid #8d969d;border-radius:3px;overflow:hidden}
.hwh-bt i{position:absolute;left:0;right:0;bottom:0;background:#56626c;transition:height .25s}
.hwh-bt s{position:absolute;left:-2px;right:-2px;height:0;border-top:2px dashed #c62828}
.hwh-bt u{position:absolute;left:-2px;right:-2px;height:0;border-top:2px solid #2f6fc4}
.hwh-bf b{font:700 12.5px var(--f-mono);white-space:nowrap}
.hwh-bf b em{font:600 10.5px var(--f-body);font-style:normal;margin-left:2px;color:#4a555e}
.hwh-bf b em.miss{color:#c62828}
.hwh-al{gap:9px;padding:0 6px 0 10px;font-weight:600;font-size:13px;color:#4a555e;background:#dfe3e6}
.hwh-al .ic{width:18px;height:18px;flex:none;opacity:.55}
.hwh-al .tx{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hwh-al.on{background:#d32f2f;border-color:#8e1c1c;color:#fff}
.hwh-al.on.amber{background:#f2a51a;border-color:#9a6400;color:#231500}
.hwh-al.on .ic{opacity:1}
.hwh-al.blink{animation:hwh-bl 1s steps(1) infinite}
@keyframes hwh-bl{50%{background:#7a1414}}
.hwh-al.amber.blink{animation-name:hwh-bla}
@keyframes hwh-bla{50%{background:#8d5c00;color:#fff}}
.hwh-ack{min-height:30px;min-width:52px;border-radius:6px;border:1px solid rgba(0,0,0,.4);background:#fff;color:#1c2329;font:700 12px var(--f-body);cursor:pointer;flex:none}
.hwh-es{justify-content:center;gap:7px;background:#f4c430;border-color:#9c7a00;font-weight:800;font-size:12px;color:#5a0000}
.hwh-es i{width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#ff6b6b,#c00 60%,#800);border:2px solid #600;flex:none}
.hwh-pop{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);z-index:10;width:min(300px,calc(100% - 24px));background:#f4f6f7;color:#1c2329;border-radius:10px;border:1px solid #59636b;box-shadow:0 10px 30px rgba(0,0,0,.45);padding:12px;display:grid;gap:9px;font-family:var(--f-body)}
.hwh-pop h4{margin:0;font-size:.95rem;display:flex;align-items:center;gap:6px}
.hwh-pop p{font-size:.85rem;line-height:1.4;color:#33404a}
.hwh-pop p.err{color:#b3261e;font-weight:600}
.hwh-pop input{min-height:42px;border:1px solid #8d969d;border-radius:7px;padding:4px 10px;font:600 18px var(--f-mono);width:100%;background:#fff;color:#1c2329}
.hwh-pop .row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.hwh-pop button{min-height:40px;min-width:76px;border-radius:7px;border:1px solid #6f7a82;background:#fff;color:#1c2329;font:700 .88rem var(--f-body);cursor:pointer;padding:0 12px}
.hwh-pop button.pri{background:#2b3a46;border-color:#2b3a46;color:#fff}
.hwh-under{font-size:.8rem;color:var(--muted);text-align:center;line-height:1.4}
.hwh-sec{border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;background:var(--surface);min-width:0;align-content:start}
.hwh-sh{font-family:var(--f-display);font-weight:700;font-size:1.1rem;letter-spacing:.02em;display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hwh-sh small{font-family:var(--f-body);font-weight:500;font-size:.8rem;color:var(--muted);letter-spacing:0}
.hwh-sh2{font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-top:2px}
.hwh-bn{font-size:.82rem;line-height:1.4;color:var(--ink-2);background:var(--surface-2);border-radius:8px;padding:6px 9px}
.hwh-bn b{color:var(--ink)}
.hwh-f{display:grid;gap:3px;min-width:0}
.hwh-f>span{font-size:.76rem;color:var(--muted);font-weight:600}
.hwh-f2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hw-hmi input.hwh-in,.hw-hmi select.hwh-sel{width:100%;min-width:0;min-height:40px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);padding:6px 9px;font-size:.9rem}
.hw-hmi select.hwh-sel{cursor:pointer}
.hw-hmi input.hwh-in.bad,.hw-hmi select.hwh-sel.bad{border-color:var(--danger);background:var(--danger-soft)}
.hwh-note{font-size:.8rem;color:var(--muted);line-height:1.4}
.hwh-note.bad{color:var(--hwh-bad);font-weight:600}
.hwh-pos{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.hwh-pos>span{font-size:.76rem;color:var(--muted);font-weight:600;margin-right:2px}
.hwh-pos .btn{min-width:42px;min-height:40px;padding:0;justify-content:center}
.hwh-pos .btn.del{margin-left:auto;min-width:0;padding:0 12px;color:var(--hwh-bad)}
.hwh-tt{width:100%;border-collapse:collapse;font-size:.82rem}
.hwh-tt td{padding:4px 5px;border-bottom:1px solid var(--line-2);vertical-align:top}
.hwh-tt td:first-child{font-weight:600;white-space:nowrap}
.hwh-tt td.a{font-family:var(--f-mono);font-size:.78rem;color:var(--ink-2);white-space:nowrap}
.hwh-tt td.v{font-family:var(--f-mono);font-weight:700;text-align:right;white-space:nowrap;border-radius:4px}
.hwh-tt td.d{color:var(--muted);font-size:.78rem}
.hwh-tt tr.ch td.v{animation:hwh-ch .9s ease-out}
@keyframes hwh-ch{0%{background:var(--accent-bg);color:var(--accent-ink)}100%{background:transparent}}
.hwh-tt td.v.one{color:var(--hwh-ok)}
.hwh-mach svg{display:block;width:100%;height:auto;max-width:330px;margin:0 auto}
.hwh-mach .tank{fill:var(--surface-2);stroke:var(--ink-2);stroke-width:2.5}
.hwh-mach .water{fill:var(--p-water);opacity:.85}
.hwh-mach .pipe{fill:none;stroke:var(--wire);stroke-width:5;stroke-linecap:round}
.hwh-mach .pipe.on{stroke:var(--p-water)}
.hwh-mach .pump{fill:var(--surface);stroke:var(--ink-2);stroke-width:2.5}
.hwh-mach .pump.on{fill:var(--power-bright)}
.hwh-mach .imp{stroke:var(--ink);stroke-width:2.5;fill:none;stroke-linecap:round;transform-box:fill-box;transform-origin:center}
.hwh-mach .imp.on{animation:hwh-rot .8s linear infinite}
@keyframes hwh-rot{to{transform:rotate(360deg)}}
.hwh-mach .lim{stroke:var(--danger);stroke-width:2;stroke-dasharray:6 4}
.hwh-mach .spl{stroke:var(--info);stroke-width:2}
.hwh-mach text{font:600 11px var(--f-body);fill:var(--ink-2)}
.hwh-mach text.big{font:700 15px var(--f-mono);fill:var(--ink)}
.hwh-mach text.r{fill:var(--hwh-bad)}.hwh-mach text.b{fill:var(--info)}
.hwh-mrow{display:flex;gap:8px;flex-wrap:wrap}
.hwh-mrow .btn{flex:1 1 auto;min-height:40px}
.hwh-mrow .btn[aria-pressed="true"]{background:var(--info);border-color:var(--info);color:#fff}
.hwh-trend svg{display:block;width:100%;height:auto}
.hwh-trend .ax{stroke:var(--line);stroke-width:1}
.hwh-trend .lv{fill:none;stroke:var(--p-water);stroke-width:2.2;stroke-linejoin:round}
.hwh-trend .sp{fill:none;stroke:var(--info);stroke-width:1.5;stroke-dasharray:5 3}
.hwh-trend .li{fill:none;stroke:var(--danger);stroke-width:1.5;stroke-dasharray:3 3}
.hwh-trend text{font:500 9.5px var(--f-mono);fill:var(--muted)}
.hwh-leg{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:.75rem;color:var(--ink-2)}
.hwh-leg i{display:inline-block;width:16px;height:0;border-top:2.5px solid;vertical-align:middle;margin-right:5px}
.hw-hmi details{font-size:.84rem}
.hw-hmi summary{cursor:pointer;font-weight:600;color:var(--ink-2);min-height:32px;display:flex;align-items:center}
.hwh-prg{margin:6px 0 0;font-family:var(--f-mono);font-size:.76rem;line-height:1.5;background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:8px 10px;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--ink)}
.hwh-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}
.hw-hmi .hwh-list{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.hw-hmi .hwh-list li{display:flex;gap:10px;align-items:flex-start;margin:0;max-width:none;line-height:1.35}
.hwh-list li>div{min-width:0}
.hwh-list b{font-weight:600;font-size:.9rem}
.hwh-list small{display:block;color:var(--ink-2);font-size:.8rem;margin-top:1px}
.hwh-list small.bad{color:var(--hwh-bad)}
.hwh-st{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:.78rem;font-weight:700;line-height:1}
.hwh-st.ok{background:var(--hwh-ok);color:var(--surface)}
.hwh-st.bad{background:var(--danger);color:var(--surface)}
.hwh-st.idle{background:var(--surface-3);color:var(--ink)}
.hwh-next{font-size:.88rem;line-height:1.45;border-radius:9px;padding:8px 10px;background:var(--surface-2);border-left:4px solid var(--accent-bg)}
.hwh-win{border-radius:10px;padding:10px 12px;background:var(--power-soft);border:1px solid var(--power);font-size:.92rem;line-height:1.45}
.hwh-cap{position:sticky;bottom:10px;z-index:6;padding:9px 12px;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hwh-cap.ok{border-left-color:var(--power)}
.hwh-cap.bad{border-left-color:var(--danger)}
.hwh-ct{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:1px}
.hwh-more{border:0;background:none;color:var(--info);font:700 .8rem var(--f-body);letter-spacing:0;text-transform:none;min-height:32px;min-width:48px;margin:-9px -6px -9px 0;padding:0 6px;cursor:pointer}
.hwh-cap p{margin:0;font-size:.93rem;line-height:1.45}
.hwh-cap.flash{animation:hwh-flash .7s ease-out}
@keyframes hwh-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hwh-cap{bottom:calc(var(--tabbar-h, 62px) + 8px + env(safe-area-inset-bottom,0px))}.hw-hmi button,.hw-hmi input,.hw-hmi select{scroll-margin:84px 0 220px}}
@media (max-width:600px){.hw-hmi{padding:12px;gap:12px}.hwh-ttl{font-size:1.18rem}.hw-hmi input.hwh-in,.hw-hmi select.hwh-sel,.hwh-pop input{font-size:16px}.hwh-cap{padding:8px 10px}.hwh-cap:not(.open) p{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.hwh-seg button{min-width:30%;min-height:44px;font-size:.86rem}.hwh-hmi{padding:6px;border-radius:11px}.hwh-pb{font-size:12px}.hwh-nf b{font-size:14.5px}.hwh-mode button{padding:4px 12px}}
@media (prefers-reduced-motion:reduce){.hwh-cap.flash,.hwh-el.flash::after,.hwh-tt tr.ch td.v,.hwh-mach .imp.on{animation:none}.hwh-al.blink{animation-duration:2s}}
`;
  function injectCss() {
    if (document.getElementById('hw-hmi-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-hmi-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ───────── the widget ───────── */
  LL.HW.hmi = function (ph) {
    if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
    injectCss();
    let st = load();
    st.mode = 'edit';
    const root = document.createElement('div');
    root.className = 'hw-box hw-hmi';
    root.innerHTML = `
<div class="hwh-head">
  <div><div class="hwh-eb">HMI screen editor</div><div class="hwh-ttl">Build the operator screen for a pump, then run it</div></div>
  <div class="hwh-hr"><button class="btn small ghost" data-a="reset" title="Delete both screens and start again">↺ Reset</button><span class="hwh-prog"></span></div>
</div>
<div class="hwh-seg" role="group" aria-label="HMI software">${BRANDS.map((b) => `<button type="button" data-brand="${b}">${BR[b].label}<small>${BR[b].sub}</small></button>`).join('')}</div>
<p class="hwh-intro">An HMI is the touch screen of the machine. It does not control anything by itself: it only <b>reads and writes PLC tags</b>. Your mission: build the screen for this pump, follow the 5 design rules, then press <b>▶ Run</b> and use it.</p>
<div class="hwh-bar">
  <div class="hwh-mode" role="group" aria-label="Mode"><button type="button" data-mode="edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>Edit</button><button type="button" class="run" data-mode="run"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>Run</button></div>
  <div class="hwh-tabs" role="group" aria-label="Screens"><span>Screen:</span><button type="button" data-scr="main">Main</button><button type="button" data-scr="set">Settings</button></div>
</div>
<div class="hwh-work">
  <div class="hwh-tools"></div>
  <div class="hwh-stage">
    <div class="hwh-hmi"><div class="hwh-sbar"></div><div class="hwh-scr" aria-label="HMI screen"></div><div class="hwh-pop" role="dialog" aria-modal="false" hidden></div></div>
    <div class="hwh-under"></div>
  </div>
  <div class="hwh-side"></div>
</div>
<div class="hwh-two">
  <div class="hwh-sec"><div class="hwh-sh">Mission <small class="hwh-p1"></small></div><ul class="hwh-list hwh-mis"></ul><div class="hwh-next"></div></div>
  <div class="hwh-sec"><div class="hwh-sh">Design rules <small class="hwh-p2"></small></div><ul class="hwh-list hwh-rules"></ul></div>
</div>
<div class="hwh-cap" role="status" aria-live="polite"><div class="hwh-ct"><span>What happened</span><button type="button" class="hwh-more" data-a="more" hidden>more</button></div><p></p></div>`;
    ph.replaceWith(root);

    const $ = (s) => root.querySelector(s);
    const toolsEl = $('.hwh-tools'), scrEl = $('.hwh-scr'), sbar = $('.hwh-sbar'), popEl = $('.hwh-pop'), sideEl = $('.hwh-side'), underEl = $('.hwh-under');
    const misEl = $('.hwh-mis'), rulesEl = $('.hwh-rules'), nextEl = $('.hwh-next'), capBox = $('.hwh-cap'), capP = $('.hwh-cap p'), moreBtn = $('.hwh-more');
    let dead = false, timer = 0, visible = true, drag = null, rt = null, lastEv = null, rT = 0;
    const obs = [];

    const save = () => { if (dead) return; try { localStorage.setItem(STORE, JSON.stringify({ brand: st.brand, scr: st.scr, ranOk: st.ranOk, cap: st.cap, capKind: st.capKind, screens: st.screens })); } catch (e) { /* private mode */ } };
    const B = () => st.brand;
    const tagTxt = (k) => (B() === 'rockwell' || B() === 'omron' ? TAG[k].n : TAG[k].n + ' (' + addr(k, B()) + ')');
    const els = (s) => st.screens[s || st.scr].els;
    const allEls = () => els('main').map((e) => ({ e, s: 'main' })).concat(els('set').map((e) => ({ e, s: 'set' })));
    const find = (id) => { for (const s of ['main', 'set']) { const e = els(s).find((x) => x.id === id); if (e) return e; } return null; };
    const lbl = (e) => (e.t === 'alarm' ? 'the alarm banner' : '"' + (String(e.label).trim() || TYPES[e.t].name) + '"');
    const bnName = (e) => BN[e.t === 'pb' && e.act !== 'mom' ? (e.act === 'set' ? 'pbset' : 'pbtog') : e.t][B()];

    /* ── captions ── */
    function fitMore() {
      const open = capBox.classList.contains('open');
      moreBtn.hidden = !(open || capP.scrollHeight > capP.clientHeight + 2);
      moreBtn.textContent = open ? 'less' : 'more';
      moreBtn.setAttribute('aria-expanded', String(open));
    }
    function say(text, kind) {
      st.cap = text; st.capKind = kind || ''; save();
      capP.textContent = text;
      capBox.className = 'hwh-cap' + (kind ? ' ' + kind : '');
      void capBox.offsetWidth; capBox.classList.add('flash');
      fitMore();
    }

    /* ── checks ── */
    function evaluate() {
      const M = els('main'), S = els('set'), A = allEls().map((x) => x.e);
      const isMom = (e, k) => e.t === 'pb' && e.tag === k && e.act === 'mom';
      const mis = [
        { id: 'start', ok: M.some((e) => isMom(e, 'start')), txt: 'START: a push button on Main that writes ' + tagTxt('start'), hint: 'Tap "Push button" in the toolbox. Type START as its text and pick the tag Start_PB.' },
        { id: 'stop', ok: M.some((e) => isMom(e, 'stop')), txt: 'STOP: a push button on Main that writes ' + tagTxt('stop'), hint: 'Add a second push button: text STOP, tag Stop_PB.' },
        { id: 'lamp', ok: M.some((e) => e.t === 'lamp' && e.tag === 'pump'), txt: 'A "running" lamp that shows ' + tagTxt('pump'), hint: 'Add a Lamp and link it to Pump (the output). It must show what the pump really does, not what the button asks.' },
        { id: 'bar', ok: M.some((e) => e.t === 'bar' && e.tag === 'level'), txt: 'A bar graph that shows ' + tagTxt('level'), hint: 'Add a Bar graph and link it to Level.' },
        { id: 'sp', ok: M.some((e) => e.t === 'inp' && e.tag === 'sp' && limOk(e)), txt: 'A number input for ' + tagTxt('sp') + ', with Min and Max', hint: 'Add a Number input, tag Setpoint. Fill Min and Max: which values make sense for a level in %?' },
        { id: 'alarm', ok: M.some((e) => e.t === 'alarm' && e.tag === 'alarm'), txt: 'An alarm banner for ' + tagTxt('alarm'), hint: 'Add an Alarm banner and link it to Alarm_High.' },
        { id: 'nav', ok: M.some((e) => e.t === 'scr' && e.target === 'set') && S.some((e) => e.t === 'scr' && e.target === 'main') && S.some((e) => e.t === 'inp' && e.tag === 'lim' && limOk(e)), txt: 'Screen "Settings": an input for ' + tagTxt('lim') + ' (with limits), and screen buttons Main → Settings → Main', hint: 'Add a Screen button on Main (target Settings). Then open the Settings tab: add a Number input for Alarm_Limit with Min / Max, and a Screen button back to Main.' },
        { id: 'lock', ok: st.screens.set.lvl >= 2 && st.screens.main.lvl <= 1, txt: 'Settings is locked: only Technician or higher may open it', hint: 'Open the Settings tab, tap an empty spot of the screen, and set "Who may open it" to Technician.' },
        { id: 'run', ok: st.ranOk, txt: 'Test it: ▶ Run, start the pump with your START, stop it with your STOP', hint: 'Press ▶ Run. Press your START button: the pump runs. Then press STOP.' },
      ];
      // design rules
      const rules = [];
      const ss = A.filter((e) => (e.tag === 'start' || e.tag === 'stop') && (e.t === 'pb' || e.t === 'sw' || e.t === 'estop'));
      const badS = ss.filter((e) => !(e.t === 'pb' && e.act === 'mom'));
      rules.push({ id: 'mom', name: 'Momentary buttons for START and STOP', st: !ss.length ? 'idle' : badS.length ? 'bad' : 'ok',
        why: badS.length ? cap1(lbl(badS[0])) + (badS[0].t === 'sw' ? ' is a switch' : badS[0].t === 'estop' ? ' is an E-stop' : ' uses "' + (badS[0].act === 'set' ? 'Set bit' : 'Toggle') + '"') + ': ' + TAG[badS[0].tag].n + ' stays 1 after you let go.' : 'A bit that stays 1 can restart the machine by itself.' });
      const es = A.filter((e) => e.t === 'estop' || ESTOP_RX.test(e.label));
      rules.push({ id: 'estop', name: 'No E-stop on the HMI', st: es.length ? 'bad' : 'ok', why: es.length ? 'Delete ' + lbl(es[0]) + '. An E-stop is a red mushroom button, wired to the safety circuit.' : 'A screen can freeze. A real E-stop is hard-wired.' });
      const bgBad = ['main', 'set'].filter((s) => (st.screens[s].bg !== 'grey' && (s === 'main' || els(s).length)));
      const lampBad = A.filter((e) => e.t === 'lamp' && e.tag !== 'alarm' && (e.on === 'red' || e.on === 'amber'));
      rules.push({ id: 'grey', name: 'Grey background, colour only for abnormal states', st: bgBad.length || lampBad.length ? 'bad' : 'ok',
        why: bgBad.length ? 'Screen "' + SCRN[bgBad[0]] + '" has a ' + BG[st.screens[bgBad[0]].bg].toLowerCase() + ' background.' : lampBad.length ? cap1(lbl(lampBad[0])) + ' turns ' + lampBad[0].on + ', but red and amber mean "alarm".' : 'ISA-101: normal = grey, so the alarm colour jumps out.' });
      const nm = A.filter((e) => e.t === 'num' || e.t === 'inp' || e.t === 'bar'), noU = nm.filter((e) => !String(e.unit).trim());
      rules.push({ id: 'unit', name: 'Units on every number', st: !nm.length ? 'idle' : noU.length ? 'bad' : 'ok', why: noU.length ? cap1(lbl(noU[0])) + ' has no unit. 60 what? %, litres, bar?' : 'The operator must know if 60 means %, litres or bar.' });
      const inps = A.filter((e) => e.t === 'inp'), noL = inps.filter((e) => !limOk(e));
      rules.push({ id: 'lim', name: 'Limits (Min / Max) on every input', st: !inps.length ? 'idle' : noL.length ? 'bad' : 'ok', why: noL.length ? cap1(lbl(noL[0])) + ': ' + limWhy(noL[0]) + '.' : 'The HMI refuses a value out of range before the PLC gets it.' });
      const nMis = mis.filter((m) => m.ok).length, nRul = rules.filter((r) => r.st === 'ok').length;
      return { mis, rules, nMis, nRul, done: nMis === mis.length && nRul === rules.length };
    }
    const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    function paintChecks() {
      const ev = evaluate(), was = lastEv;
      lastEv = ev;
      const li = (s, a, b, cls) => `<li><span class="hwh-st ${s}" aria-hidden="true">${s === 'ok' ? '✓' : s === 'bad' ? '✕' : '–'}</span><div><b>${esc(a)}</b>${b ? `<small class="${cls || ''}">${esc(b)}</small>` : ''}</div></li>`;
      misEl.innerHTML = ev.mis.map((m) => li(m.ok ? 'ok' : 'idle', m.txt, '')).join('');
      rulesEl.innerHTML = ev.rules.map((r) => li(r.st, r.name, r.why, r.st === 'bad' ? 'bad' : '')).join('');
      $('.hwh-p1').textContent = ev.nMis + ' / ' + ev.mis.length;
      $('.hwh-p2').textContent = ev.nRul + ' / ' + ev.rules.length;
      $('.hwh-prog').textContent = 'Mission ' + ev.nMis + '/' + ev.mis.length + ' · Rules ' + ev.nRul + '/' + ev.rules.length;
      if (ev.done) {
        nextEl.className = 'hwh-win';
        nextEl.innerHTML = '<b>Mission complete!</b> Your screen works and follows the rules. Try this in Edit: make START a <b>Switch</b>, run again, press STOP and let go. Watch what the pump does, and read why.';
      } else {
        const m = ev.mis.find((x) => !x.ok), r = ev.rules.find((x) => x.st === 'bad');
        nextEl.className = 'hwh-next';
        nextEl.innerHTML = '<b>Next:</b> ' + esc(m ? m.hint : r ? r.why : '');
      }
      if (was && !was.done && ev.done) say('Mission complete! Both screens are built, Settings is locked, and every design rule is green. This is how real operator screens are checked before a machine is shipped.', 'ok');
      return ev;
    }

    /* ── layout / width ── */
    function widthCls() {
      const w = root.clientWidth;
      root.classList.toggle('w2', w >= 640);
      root.classList.toggle('w3', w >= 900);
      root.classList.toggle('run', st.mode === 'run');
      const sw = scrEl.clientWidth || 300;
      scrEl.style.setProperty('--rh', clamp(Math.round(sw / COLS * 0.62), 46, 64) + 'px');
    }

    /* ── element HTML ── */
    function sample(k) { return { start: 0, stop: 0, pump: 1, level: 62, sp: 60, lim: 90, alarm: 1 }[k]; }
    function val(k, live) { if (!k) return null; return live ? rt.T[k] : sample(k); }
    function unitHtml(e) { const u = String(e.unit).trim(); return u ? '<em>' + esc(u) + '</em>' : ''; }
    function elInner(e, live) {
      const v = val(e.tag, live), L = esc(e.label);
      switch (e.t) {
        case 'pb': return `<span class="hwh-face hwh-pb${live && rt.held === e.id ? ' dn' : ''}">${L || '&nbsp;'}</span>`;
        case 'sw': return `<span class="hwh-face hwh-sw"><span>${L}</span><span class="hwh-trk${v ? ' on' : ''}"><i></i></span></span>`;
        case 'lamp': { const on = !!v, c = LAMPHEX[e.on]; return `<span class="hwh-face hwh-lamp"><i class="hwh-dot${on ? ' on' : ''}" style="${on ? 'background:' + c + ';border-color:rgba(0,0,0,.35);--lc:' + c : ''}"></i><span>${L}</span></span>`; }
        case 'num': case 'inp': return `<span class="hwh-face hwh-nf${e.t === 'inp' ? ' inp' : ''}"><small>${L}</small><b>${v == null ? '###' : v}${unitHtml(e)}</b></span>`;
        case 'bar': {
          const a = num(e.smin), b = num(e.smax), lo = a == null ? 0 : a, hi = b == null || b <= lo ? lo + 100 : b;
          const p = v == null ? 0 : clamp((v - lo) / (hi - lo) * 100, 0, 100);
          const lim = e.tag === 'level' ? clamp(((live ? rt.T.lim : 90) - lo) / (hi - lo) * 100, 0, 100) : null;
          const spv = e.tag === 'level' ? clamp(((live ? rt.T.sp : 60) - lo) / (hi - lo) * 100, 0, 100) : null;
          return `<span class="hwh-face hwh-bf"><small>${L}</small><span class="hwh-bt"><i style="height:${p.toFixed(1)}%"></i>${spv != null ? `<u style="bottom:${spv.toFixed(1)}%"></u>` : ''}${lim != null ? `<s style="bottom:${lim.toFixed(1)}%"></s>` : ''}</span><b>${v == null ? '###' : v}${unitHtml(e)}</b></span>`;
        }
        case 'alarm': {
          const on = !!v, un = live && on && rt.unack;
          return `<span class="hwh-face hwh-al${on ? ' on' : ''}${e.color === 'amber' ? ' amber' : ''}${un ? ' blink' : ''}"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TICON.alarm}</svg><span class="tx">${on ? L || 'Alarm' : 'No active alarms'}</span>${un ? '<button type="button" class="hwh-ack" data-ack="1">ACK</button>' : ''}</span>`;
        }
        case 'scr': return `<span class="hwh-face hwh-pb scr">${st.screens[e.target].lvl >= 2 ? LOCK : ''}${L || '&nbsp;'}</span>`;
        case 'estop': return `<span class="hwh-face hwh-es"><i></i><span>${L}</span></span>`;
      }
      return '';
    }
    function chipHtml(e) {
      if (e.t === 'scr') return `<span class="hwh-chip">→ ${SCRN[e.target]}</span>`;
      return e.tag ? `<span class="hwh-chip">${esc(addr(e.tag, B()))}</span>` : '<span class="hwh-chip bad">no tag</span>';
    }
    const place = (n, e) => { n.style.gridColumn = (e.x + 1) + ' / span ' + TYPES[e.t].w; n.style.gridRow = (e.y + 1) + ' / span ' + TYPES[e.t].h; };

    /* ── edit mode ── */
    function renderTools() {
      if (st.mode !== 'edit') { toolsEl.hidden = true; return; }
      toolsEl.hidden = false;
      toolsEl.innerHTML = '<div class="hwh-th">Toolbox · tap to add</div>' + TOOL_ORDER.map((t) => `<button type="button" class="hwh-tool" data-tool="${t}" title="Add a ${TYPES[t].name.toLowerCase()}">${ico(t)}<span>${TYPES[t].name}</span></button>`).join('');
    }
    function renderSbar() {
      const S = st.screens[st.scr];
      if (st.mode === 'edit') sbar.innerHTML = `<b>${S.lvl >= 2 ? LOCK : ''}${SCRN[st.scr]}</b><small>${esc(BR[B()].tool)}</small>`;
      else {
        const s = rt.scr;
        sbar.innerHTML = `<b>${st.screens[s].lvl >= 2 ? LOCK : ''}${SCRN[s]}</b><select data-user aria-label="Logged-in user">${[1, 2, 3].map((l) => `<option value="${l}"${rt.user === l ? ' selected' : ''}>👤 ${LVS[l]}</option>`).join('')}</select>`;
      }
    }
    function renderScreen(flashId) {
      const live = st.mode === 'run', sid = live ? rt.scr : st.scr, S = st.screens[sid];
      scrEl.className = 'hwh-scr bg-' + S.bg + (live ? ' live' : ' edit');
      const list = S.els;
      scrEl.innerHTML = list.length ? '' : `<div class="hwh-empty">${live ? 'This screen is empty.' : 'Empty screen. Tap a tool to add an element.'}</div>`;
      list.forEach((e) => {
        const n = document.createElement('div');
        n.className = 'hwh-el' + (!live && st.sel === e.id ? ' sel' : '') + (flashId === e.id ? ' flash' : '');
        n.dataset.id = e.id; n.dataset.t = e.t;
        if (!live) { n.tabIndex = 0; n.setAttribute('role', 'button'); n.setAttribute('aria-label', TYPES[e.t].name + ' ' + (e.label || '') + (e.tag ? ', tag ' + TAG[e.tag].n : '')); }
        else if (e.t !== 'num' && e.t !== 'bar' && e.t !== 'lamp' && e.t !== 'alarm') { n.tabIndex = 0; n.setAttribute('role', 'button'); n.setAttribute('aria-label', e.label || TYPES[e.t].name); }
        place(n, e);
        const h = elInner(e, live);
        n.innerHTML = h + (live ? '' : chipHtml(e));
        n._h = h;
        scrEl.appendChild(n);
      });
      renderSbar();
      underEl.textContent = live ? 'Runtime: touch the screen like an operator. Values come from the PLC every 100 ms.' : 'Drag an element to move it, or use the arrows on the right. Tap an empty spot for screen settings.';
    }
    function updLive() {
      scrEl.querySelectorAll('.hwh-el').forEach((n) => {
        const e = find(+n.dataset.id);
        if (!e) return;
        const h = elInner(e, true);
        if (h !== n._h) { n._h = h; n.innerHTML = h; }
      });
    }
    function tagOpts(e) {
      const kind = TYPES[e.t].kind;
      const ks = TAG_ORDER.filter((k) => (kind === 'bit' ? TAG[k].bit : !TAG[k].bit));
      return `<option value="">— pick a tag —</option>` + ks.map((k) => `<option value="${k}"${e.tag === k ? ' selected' : ''}>${esc(TAG[k].n)} · ${esc(addr(k, B()))}</option>`).join('');
    }
    const sel = (p, opts, cur, cls) => `<select class="hwh-sel${cls ? ' ' + cls : ''}" data-p="${p}">${Object.keys(opts).map((k) => `<option value="${k}"${String(cur) === k ? ' selected' : ''}>${esc(opts[k])}</option>`).join('')}</select>`;
    function renderProps() {
      if (st.mode !== 'edit') return;
      const e = st.sel ? els().find((x) => x.id === st.sel) : null;
      if (!e) { st.sel = 0; renderScreenProps(); return; }
      const T = TYPES[e.t], b = B();
      let h = `<div class="hwh-sec"><div class="hwh-sh">${esc(T.name)} <small>on ${SCRN[st.scr]}</small></div>
        <p class="hwh-bn"><b>In ${esc(BR[b].tool)}:</b> ${esc(bnName(e))}</p>`;
      if (e.t !== 'alarm') h += `<label class="hwh-f"><span>${e.t === 'pb' || e.t === 'scr' || e.t === 'estop' ? 'Text on the button' : 'Label'}</span><input class="hwh-in" data-p="label" maxlength="16" value="${esc(e.label)}" autocomplete="off"></label>`;
      if (e.t === 'scr') {
        h += `<label class="hwh-f"><span>Opens the screen</span>${sel('target', SCRN, e.target)}</label>`;
      } else {
        const tagLbl = { pb: 'Tag it writes', sw: 'Tag it writes', estop: 'Tag it writes', lamp: 'Tag it shows', num: 'Tag it shows', bar: 'Tag it shows', inp: 'Tag it writes', alarm: 'Alarm bit' }[e.t];
        h += `<label class="hwh-f"><span>${tagLbl}</span><select class="hwh-sel${e.tag ? '' : ' bad'}" data-p="tag">${tagOpts(e)}</select></label>`;
        if (e.tag) {
          const warn = tagWarn(e);
          h += `<p class="hwh-note${warn ? ' bad' : ''}">${esc(warn || TAG[e.tag].n + ': ' + TAG[e.tag].d + '.')}</p>`;
        }
      }
      if (e.t === 'pb') h += `<label class="hwh-f"><span>When touched</span>${sel('act', ACT, e.act)}</label>`;
      if (e.t === 'lamp') h += `<label class="hwh-f"><span>Colour when the bit is 1 (0 = grey)</span>${sel('on', LAMPC, e.on)}</label>`;
      if (e.t === 'alarm') {
        h += `<label class="hwh-f"><span>Alarm text</span><input class="hwh-in" data-p="label" maxlength="28" value="${esc(e.label)}" autocomplete="off"></label>`;
        h += `<label class="hwh-f"><span>Colour</span>${sel('color', { red: 'Red (high priority)', amber: 'Amber (warning)' }, e.color)}</label>`;
      }
      if (e.t === 'num' || e.t === 'inp' || e.t === 'bar') h += `<label class="hwh-f"><span>Unit</span><input class="hwh-in${String(e.unit).trim() ? '' : ' bad'}" data-p="unit" maxlength="6" value="${esc(e.unit)}" placeholder="e.g. %" autocomplete="off"></label>`;
      if (e.t === 'inp') {
        const w = limWhy(e);
        h += `<div class="hwh-f2"><label class="hwh-f"><span>Min</span><input class="hwh-in${w && num(e.min) == null ? ' bad' : ''}" data-p="min" inputmode="numeric" maxlength="6" value="${esc(e.min)}" placeholder="none" autocomplete="off"></label><label class="hwh-f"><span>Max</span><input class="hwh-in${w && num(e.max) == null ? ' bad' : ''}" data-p="max" inputmode="numeric" maxlength="6" value="${esc(e.max)}" placeholder="none" autocomplete="off"></label></div>`;
        h += `<p class="hwh-note${w ? ' bad' : ''}" data-limnote>${esc(w ? 'Limits: ' + w + '. The operator could type any number.' : 'The HMI refuses values outside ' + num(e.min) + ' … ' + num(e.max) + '.')}</p>`;
      }
      if (e.t === 'bar') h += `<div class="hwh-f2"><label class="hwh-f"><span>Scale from</span><input class="hwh-in" data-p="smin" inputmode="numeric" maxlength="6" value="${esc(e.smin)}" autocomplete="off"></label><label class="hwh-f"><span>Scale to</span><input class="hwh-in" data-p="smax" inputmode="numeric" maxlength="6" value="${esc(e.smax)}" autocomplete="off"></label></div>`;
      h += `<div class="hwh-pos"><span>Move</span><button type="button" class="btn small" data-a="mv" data-d="l" aria-label="Move left">◀</button><button type="button" class="btn small" data-a="mv" data-d="u" aria-label="Move up">▲</button><button type="button" class="btn small" data-a="mv" data-d="d" aria-label="Move down">▼</button><button type="button" class="btn small" data-a="mv" data-d="r" aria-label="Move right">▶</button><button type="button" class="btn small del" data-a="del">Delete</button></div>`;
      h += `<button type="button" class="btn small ghost" data-a="desel">Done: screen settings</button></div>`;
      sideEl.innerHTML = h;
    }
    function tagWarn(e) {
      const t = TAG[e.tag], w = e.t === 'pb' || e.t === 'sw' || e.t === 'inp' || e.t === 'estop';
      if (!w) return '';
      if (t.src === 'out') return 'Careful: ' + t.n + ' is a PLC output. The program writes it every scan, so a value from the HMI is lost at once.';
      if (t.src === 'in') return 'Careful: ' + t.n + ' is a real input from the sensor. The PLC reads it every scan, so a typed value is lost at once.';
      if (t.src === 'plc') return 'Careful: the PLC program writes ' + t.n + '. The HMI should only show it.';
      return '';
    }
    function renderScreenProps() {
      const S = st.screens[st.scr], b = B();
      sideEl.innerHTML = `<div class="hwh-sec"><div class="hwh-sh">Screen "${SCRN[st.scr]}" <small>${S.els.length} element${S.els.length === 1 ? '' : 's'}</small></div>
        <p class="hwh-note">Tap an element to change it. Tap a tool to add one.</p>
        <label class="hwh-f"><span>Background</span><select class="hwh-sel" data-s="bg">${Object.keys(BG).map((k) => `<option value="${k}"${S.bg === k ? ' selected' : ''}>${BG[k]}</option>`).join('')}</select></label>
        <label class="hwh-f"><span>Who may open it</span><select class="hwh-sel" data-s="lvl">${LV.map((t, i) => `<option value="${i}"${S.lvl === i ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <p class="hwh-bn"><b>In ${esc(BR[b].tool)}:</b> ${esc(BR[b].users)}</p>
        <div class="hwh-sh2">Tags of the pump PLC</div>
        <table class="hwh-tt"><tbody>${TAG_ORDER.map((k) => `<tr><td>${esc(TAG[k].n)}</td><td class="a">${esc(addr(k, b))}</td><td class="d">${esc(TAG[k].d)}</td></tr>`).join('')}</tbody></table>
        ${b === 'rockwell' || b === 'omron' ? `<p class="hwh-note">${b === 'rockwell' ? 'Studio 5000 has no M addresses: the HMI links to the tag name.' : 'Sysmac uses named variables: the HMI links to the variable name.'}</p>` : ''}</div>`;
    }

    function addEl(t) {
      const e = mkEl(t, st.next++, st.scr), T = TYPES[t];
      let ok = false;
      for (let y = 0; y <= ROWS - T.h && !ok; y++) for (let x = 0; x <= COLS - T.w && !ok; x++) if (fits(els(), e, x, y, 0)) { e.x = x; e.y = y; ok = true; }
      if (!ok) { st.next--; return say('No free space for a ' + T.name.toLowerCase() + ' (' + T.w + ' × ' + T.h + ' cells). Move or delete something first.', 'bad'); }
      els().push(e); st.sel = e.id;
      renderScreen(e.id); renderProps(); paintChecks(); save();
      const b = B();
      if (t === 'estop') return say('Stop! An E-stop must never be on a touch screen. The screen can freeze, the cable can break, the software can crash, and then the button does nothing. A real E-stop is a red mushroom button, wired to the safety relay. Delete this element.', 'bad');
      const msg = {
        pb: 'Push button added. Now give it a text and a tag: which bit should it write? (In ' + BR[b].tool + ': ' + BN.pb[b] + '.)',
        sw: 'Switch added. A switch keeps its state: one touch = 1, next touch = 0. Good for "Auto ON / OFF", not for START or STOP.',
        lamp: 'Lamp added. A lamp only reads a bit. Link it to the bit you want to see.',
        num: 'Number display added. It only reads a word. Link it to a word tag and give it a unit.',
        inp: 'Number input added. The operator types a value; the HMI writes it into a word in the PLC. Give it Min and Max.',
        bar: 'Bar graph added. A bar shows "how full" at one look, faster than reading a number.',
        alarm: 'Alarm banner added. It shows the active alarm text, in colour, and has an ACK button. Link it to the alarm bit.',
        scr: 'Screen button added. It writes no tag: it changes the screen on the HMI. Choose which screen it opens.',
      }[t];
      say(msg, '');
    }
    function delSel() {
      const L = els(), i = L.findIndex((x) => x.id === st.sel);
      if (i < 0) return;
      const e = L[i]; L.splice(i, 1); st.sel = 0;
      renderScreen(); renderProps(); paintChecks(); save();
      say((e.t === 'estop' ? 'The screen E-stop is gone. Good: the real E-stop stays a hard-wired mushroom button.' : TYPES[e.t].name + ' ' + lbl(e) + ' deleted.'), e.t === 'estop' ? 'ok' : '');
    }
    function moveSel(d) {
      const e = els().find((x) => x.id === st.sel);
      if (!e) return;
      const dx = d === 'l' ? -1 : d === 'r' ? 1 : 0, dy = d === 'u' ? -1 : d === 'd' ? 1 : 0;
      let nx = e.x + dx, ny = e.y + dy;
      while (nx >= 0 && ny >= 0 && nx + TYPES[e.t].w <= COLS && ny + TYPES[e.t].h <= ROWS && !fits(els(), e, nx, ny, 0)) { nx += dx; ny += dy; }
      if (!fits(els(), e, nx, ny, 0)) return say(nx < 0 || ny < 0 || nx + TYPES[e.t].w > COLS || ny + TYPES[e.t].h > ROWS ? 'It is already at the edge of the screen.' : 'Something is in the way.', '');
      e.x = nx; e.y = ny;
      const n = scrEl.querySelector('[data-id="' + e.id + '"]'); if (n) place(n, e);
      save();
    }

    // Caption after a property change.
    function propCap(e, p) {
      const T = TYPES[e.t];
      if (p === 'tag') {
        if (!e.tag) return ['The element has no tag now: it shows or writes nothing.', 'bad'];
        const t = TAG[e.tag], A = tagTxt(e.tag), warn = tagWarn(e);
        if (warn) return [warn + (t.src === 'out' ? ' An HMI writes M bits; the program decides the outputs.' : ''), 'bad'];
        if (e.t === 'pb') return [lbl(e).replace(/^./, (c) => c.toUpperCase()) + ' now writes ' + A + (e.act === 'mom' ? ': 1 while the finger is on the button, 0 when you let go. The PLC program reads this bit like a contact.' : e.act === 'set' ? ': it becomes 1 and STAYS 1. Something must reset it.' : ': each touch flips it.'), ''];
        if (e.t === 'sw') return ['The switch now writes ' + A + '. It stays 1 until the next touch.' + (e.tag === 'start' || e.tag === 'stop' ? ' For START or STOP that is a problem: see the rules.' : ''), e.tag === 'start' || e.tag === 'stop' ? 'bad' : ''];
        if (e.t === 'lamp') return ['The lamp now shows ' + A + '.' + (e.tag === 'pump' ? ' Good: it shows the real output, so it is off when the PLC stops the pump, even if START is pressed.' : e.tag === 'start' ? ' It is on only while START is pressed: that says nothing about the pump.' : ''), ''];
        if (e.t === 'inp') return ['The input now writes ' + A + '. Every value the operator types goes straight into the PLC: set Min and Max.', ''];
        if (e.t === 'alarm') return ['The banner now shows ' + A + '. When the PLC sets this bit, the text appears in colour and the operator can acknowledge it.' + (e.tag !== 'alarm' ? ' But is this bit an alarm?' : ''), e.tag === 'alarm' ? '' : 'bad'];
        return [T.name + ' now shows ' + A + '.', ''];
      }
      if (p === 'act') return { mom: ['Momentary: the bit is 1 only while the finger is on the button. Like a real push button with a spring. This is right for START and STOP.', 'ok'], set: ['Set bit: one touch writes 1, and it stays 1. A START bit that stays 1 can restart the pump by itself after a stop.', 'bad'], tog: ['Toggle: each touch flips the bit. A forgotten 1 stays in the PLC: not good for START or STOP.', 'bad'] }[e.act];
      if (p === 'on') return e.on === 'red' || e.on === 'amber' ? ['Red and amber mean "alarm" on a good screen. A running pump is normal, not an alarm. In some industries red even means "running", in others "stopped": colour for normal states is confusing.', 'bad'] : ['Lamp colour: ' + LAMPC[e.on].toLowerCase() + ' when the bit is 1, grey when 0.', ''];
      if (p === 'unit') return String(e.unit).trim() ? ['Unit "' + String(e.unit).trim() + '": now the operator reads "' + (e.tag ? val(e.tag, false) : 60) + ' ' + String(e.unit).trim() + '", not just a number.', 'ok'] : ['No unit: "60" could be %, litres or bar.', 'bad'];
      if (p === 'min' || p === 'max') { const w = limWhy(e); return w ? ['Limits: ' + w + '.', 'bad'] : ['Limits ' + num(e.min) + ' … ' + num(e.max) + ': the HMI now refuses other values before they reach the PLC.', 'ok']; }
      if (p === 'target') return ['This button now opens "' + SCRN[e.target] + '".' + (e.target === st.scr ? ' But you are already on that screen!' : ''), e.target === st.scr ? 'bad' : ''];
      if (p === 'label') {
        if (ESTOP_RX.test(e.label)) return ['A button called "' + e.label + '" on a touch screen is an E-stop that is not safe. The real E-stop must be hard-wired.', 'bad'];
        return null;
      }
      if (p === 'color') return [e.color === 'red' ? 'Red: high priority, act now.' : 'Amber: a warning, act soon.', ''];
      return null;
    }
    function screenCap(p) {
      const S = st.screens[st.scr];
      if (p === 'bg') return S.bg === 'grey' ? ['Grey background: now the alarm is the only strong colour on the screen. The eye finds it in one second. This is the ISA-101 idea ("high performance HMI").', 'ok'] : ['A ' + BG[S.bg].toLowerCase() + ' background looks nice, but it competes with the colours that matter. ISA-101: grey screens, colour only for abnormal states.', 'bad'];
      if (p === 'lvl') {
        if (st.scr === 'main' && S.lvl >= 2) return ['Main now needs ' + LVS[S.lvl] + '. The operator cannot see or start the pump any more! The main screen must stay open for operators.', 'bad'];
        if (S.lvl >= 2) return [SCRN[st.scr] + ' now needs ' + LVS[S.lvl] + ' (level ' + S.lvl + ') or higher. An operator can run the pump, but cannot change the alarm limit.', 'ok'];
        return [SCRN[st.scr] + ': ' + LVS[S.lvl] + ' may open it.' + (st.scr === 'set' ? ' Then any operator can change the alarm limit.' : ''), st.scr === 'set' ? 'bad' : ''];
      }
      return null;
    }

    /* ── run mode: the built-in PLC + machine ── */
    function fresh() {
      return { T: { start: 0, stop: 0, pump: 0, level: 35, sp: 60, lim: 90, alarm: 0 }, lvl: 35, started: false, fill: false, unack: false, extra: false, user: 1, scr: 'main', hist: [], ht: 0, held: 0, lastPress: 0, pendStart: false, sawStart: false, startMom: false, stopMom: false, over: false, prev: {} };
    }
    function enterRun() {
      if (st.mode === 'run') return;
      st.mode = 'run'; rt = fresh(); st.sel = 0;
      closePop();
      paintMode(); renderTools(); widthCls(); renderScreen(); renderMachine();
      clearInterval(timer); timer = setInterval(tick, 100);
      const M = els('main');
      say(M.length ? 'Runtime. The PLC runs the pump program; your screen reads and writes its tags. Level 35 %, setpoint 60 %. You are logged in as Operator. Press your START button.' : 'Runtime, but your Main screen is empty: the operator has nothing to touch. Go back to Edit and add elements.', M.length ? '' : 'bad');
    }
    function leaveRun() {
      if (st.mode !== 'run') return;
      clearInterval(timer); timer = 0;
      st.mode = 'edit'; rt = null; closePop();
      paintMode(); renderTools(); widthCls(); renderScreen(); renderProps();
      say('Back in Edit. The PLC keeps its program; only the screen changes.', '');
    }
    function tick() {
      if (!visible || dead || !rt) return;
      const T = rt.T, dt = 0.1, wasStarted = rt.started, wasPump = T.pump, wasAlarm = T.alarm;
      // PLC scan: read inputs, run the program, write outputs
      T.level = Math.round(rt.lvl);
      let startedNow = false;
      if (T.stop) rt.started = false;
      else if (T.start && !T.alarm && !rt.started) { rt.started = true; rt.fill = rt.lvl < T.sp; startedNow = true; }
      if (rt.lvl >= T.lim && !T.alarm) { T.alarm = 1; rt.unack = true; }
      else if (T.alarm && !rt.unack && rt.lvl < T.lim - 5) T.alarm = 0;
      if (T.alarm) rt.started = false;
      if (rt.started) { if (rt.lvl >= T.sp) rt.fill = false; else if (rt.lvl < T.sp - 10) rt.fill = true; }
      T.pump = rt.started && rt.fill ? 1 : 0;
      // the tank
      const before = rt.lvl;
      rt.lvl = clamp(rt.lvl + ((T.pump ? 6 : 0) + (rt.extra ? 5 : 0) - 2) * dt, 0, 100);
      if (rt.lvl >= 100 && before >= 100 && !rt.over) { rt.over = true; say('The tank overflows! The alarm limit is ' + T.lim + ' %, so the high alarm never came. A limit above 100 % is impossible: this is why inputs need Min and Max.', 'bad'); }
      if (rt.lvl < 97) rt.over = false;
      rt.ht += 100; if (rt.ht >= 500) { rt.ht = 0; rt.hist.push([rt.lvl, T.sp, T.lim]); if (rt.hist.length > 120) rt.hist.shift(); }
      // events for the caption
      if (startedNow && T.start && Date.now() - rt.lastPress > 500) say('The pump started again by itself! ' + tagTxt('start') + ' is still 1, because your START does not let go of the bit (switch, Set or Toggle). As soon as STOP was released, the PLC saw START = 1 again. On a real machine this is dangerous: a stop must stay a stop. Use a momentary button.', 'bad');
      if (T.alarm && !wasAlarm) {
        const has = els(rt.scr).some((e) => e.t === 'alarm' && e.tag === 'alarm');
        say('High level: ' + T.level + ' % ≥ alarm limit ' + T.lim + ' %. The PLC set ' + tagTxt('alarm') + ' and stopped the pump. ' + (has ? 'Your banner shows it, blinking until someone presses ACK.' : 'But this screen has no alarm banner for it: the operator sees the pump stop and does not know why!'), 'bad');
      }
      if (!T.alarm && wasAlarm) say('The alarm is gone: acknowledged, and the level is back under ' + (T.lim - 5) + ' %. The pump does not restart by itself: the operator must press START. That is on purpose.', 'ok');
      if (rt.pendStart && T.pump) { rt.pendStart = false; rt.sawStart = true; }
      if (wasStarted && !rt.started && T.stop && rt.stopMom && rt.sawStart && !st.ranOk) {
        st.ranOk = true; save();
        say('Test passed: your START started the pump and your STOP stopped it. Each button wrote its M bit only while you pressed it; the PLC did the rest.', 'ok');
        paintChecks();
      }
      if (wasPump !== T.pump || wasStarted !== rt.started) { /* lamp + table refresh below */ }
      updLive(); updMachine();
    }
    function writeTag(k, v) {
      if (!rt) return;
      rt.T[k] = v;
      updMachine();
    }
    // Momentary / set / toggle buttons and switches in runtime.
    function pressEl(e) {
      if (!e.tag) return say(lbl(e).replace(/^./, (c) => c.toUpperCase()) + ' has no tag: touching it does nothing. Link it in Edit.', 'bad');
      rt.lastPress = Date.now();
      const k = e.tag, t = TAG[k], A = tagTxt(k);
      const mom = e.t === 'pb' && e.act === 'mom' || e.t === 'estop';
      if (k === 'start') { rt.startMom = mom; if (mom) rt.pendStart = true; }
      if (k === 'stop') rt.stopMom = mom;
      if (mom) { rt.held = e.id; writeTag(k, 1); }
      else if (e.t === 'sw' || e.act === 'tog') writeTag(k, rt.T[k] ? 0 : 1);
      else writeTag(k, 1);
      tick();
      if (e.t === 'estop') return;
      if (!mom) {
        const v = rt.T[k];
        if (t.src !== 'hmi') return say('The HMI wrote ' + A + ' = ' + v + ', but the PLC writes this tag itself every scan: it is back to ' + rt.T[k] + ' at once.', 'bad');
        say((e.t === 'sw' ? 'The switch' : lbl(e)) + ' wrote ' + A + ' = ' + v + ', and the bit STAYS ' + v + '.' + (k === 'start' && v ? ' The pump is latched on. Now press STOP and let go, and watch.' : k === 'stop' && v ? ' While Stop_PB = 1, START cannot work. Touch it again to make it 0.' : ''), k === 'start' || k === 'stop' ? 'bad' : '');
      }
    }
    function releaseEl(e) {
      if (!rt || rt.held !== e.id) return;
      rt.held = 0;
      const k = e.tag, A = tagTxt(k);
      writeTag(k, 0);
      tick();
      const T = rt.T;
      if (e.t === 'estop') return say('That screen E-stop wrote ' + A + ' = 1 and the PLC stopped the pump. It worked this time, because the HMI and the network were OK. A real E-stop must also work when the screen is frozen or the cable is cut: it is a hard-wired mushroom button, never a picture on a screen.', 'bad');
      if (TAG[k].src !== 'hmi') return say('While you pressed, the HMI wrote ' + A + ' = 1, but the PLC program writes this tag itself every scan, so the 1 was lost at once. An HMI writes M bits; the program decides the outputs.', 'bad');
      let s = 'While you pressed ' + lbl(e) + ', the HMI wrote ' + A + ' = 1; now it is 0 again. ';
      if (k === 'start') {
        if (T.stop) s += 'Nothing happened: ' + tagTxt('stop') + ' is still 1, so STOP wins. A STOP that does not let go blocks the machine.';
        else if (T.alarm) s += 'Nothing happened: the high alarm blocks a start. Acknowledge it and wait until the level is lower.';
        else if (rt.started && !T.pump) s += 'The PLC latched the start, but the level is already at the setpoint (' + T.sp + ' %): the pump waits until the level drops to ' + (T.sp - 10) + ' %.';
        else if (rt.started) s += 'The PLC saw the 1 and latched the pump on: ' + tagTxt('pump') + ' = 1. A seal-in keeps it on after you let go.';
      } else if (k === 'stop') s += 'The PLC saw the 1 and stopped the pump: ' + tagTxt('pump') + ' = 0.';
      else s += 'The PLC program does what it wants with this bit.';
      say(s, k === 'start' && (T.stop || T.alarm) ? 'bad' : '');
    }

    /* ── keypad popup (number input) and access denied ── */
    let popFor = null;
    function closePop() { popEl.hidden = true; popEl.innerHTML = ''; popFor = null; }
    function openInput(e) {
      if (!e.tag) return say('This input has no tag: there is nothing to write. Link it in Edit.', 'bad');
      popFor = e;
      const a = num(e.min), b = num(e.max), has = a != null && b != null && a < b;
      popEl.innerHTML = `<h4>${esc(e.label || 'Input')} <small style="font-weight:500;color:#5b6670">${esc(tagTxt(e.tag))}</small></h4>
        <p>${has ? 'Allowed: ' + a + ' … ' + b + ' ' + esc(String(e.unit).trim()) : '<b>No limits set.</b> The HMI will accept any number.'}</p>
        <input type="text" inputmode="numeric" autocomplete="off" value="${rt.T[e.tag]}" aria-label="New value">
        <p class="err" hidden></p>
        <div class="row"><button type="button" data-pop="cancel">Cancel</button><button type="button" class="pri" data-pop="ok">OK</button></div>`;
      popEl.hidden = false;
      const inp = popEl.querySelector('input');
      inp.focus(); inp.select();
    }
    function popErr(t) { const p = popEl.querySelector('.err'); if (p) { p.textContent = t; p.hidden = false; } }
    function commitInput() {
      const e = popFor; if (!e) return;
      const raw = popEl.querySelector('input').value.trim(), v = num(raw);
      if (v == null) return popErr('Type a whole number, like 60.');
      if (v < -32768 || v > 32767) return popErr('An INT word holds −32768 … 32767.');
      const a = num(e.min), b = num(e.max);
      if (a != null && b != null && a < b && (v < a || v > b)) { say('The HMI refused ' + v + ': it is outside ' + a + ' … ' + b + '. The wrong value never reached the PLC. That is what limits are for.', 'ok'); return popErr('Out of range: ' + a + ' … ' + b + '.'); }
      closePop();
      const k = e.tag, T = rt.T, A = tagTxt(k), u = String(e.unit).trim() ? ' ' + String(e.unit).trim() : '';
      writeTag(k, v); tick();
      if (TAG[k].src === 'in') return say('You typed ' + v + ' into ' + A + ', but it is a real input: the PLC reads the sensor every scan and wrote ' + T.level + ' back at once. You cannot type a measurement.', 'bad');
      if (TAG[k].src !== 'hmi') return say('The HMI wrote ' + v + ' into ' + A + ', but the PLC program writes this tag itself.', 'bad');
      if (k === 'sp') {
        if (v > 100) return say('Setpoint = ' + v + u + '. The tank can never reach it, so the pump never stops at the setpoint: only the high alarm at ' + T.lim + ' % stops it. Min / Max on the input would have refused this.', 'bad');
        if (v <= 10) return say('Setpoint = ' + v + u + '. The pump will (almost) never run: the level is always above it. Does the operator know that?', 'bad');
        if (v >= T.lim) return say('Setpoint = ' + v + u + ', but the alarm limit is ' + T.lim + ' %: the tank reaches the alarm before the setpoint. The setpoint Max should be below the alarm limit.', 'bad');
        return say('The HMI wrote ' + v + ' into ' + A + '. The PLC now fills the tank to ' + v + ' %, waits until ' + (v - 10) + ' %, and fills again. Watch the blue line in the trend.', 'ok');
      }
      if (k === 'lim') {
        if (v > 100) return say('Alarm limit = ' + v + u + '. The level can never reach it: the tank would overflow with no alarm! Limits on the input stop this.', 'bad');
        return say('The HMI wrote ' + v + ' into ' + A + '. The high alarm now comes at ' + v + ' %. Only a Technician should change this: that is why Settings is locked.', T.sp >= v ? 'bad' : 'ok');
      }
      say('The HMI wrote ' + v + ' into ' + A + '.', '');
    }
    function goScreen(e) {
      const tgt = e.target;
      if (tgt === rt.scr) return say('This button opens "' + SCRN[tgt] + '", but you are already there. It does nothing.', 'bad');
      const need = st.screens[tgt].lvl;
      if (need > rt.user) {
        popFor = null;
        popEl.innerHTML = `<h4>${LOCK} Access denied</h4><p>"${SCRN[tgt]}" needs <b>${LVS[need]}</b>. You are logged in as ${LVS[rt.user]}.</p><p>A real HMI now asks for a user name and a password.</p><div class="row"><button type="button" data-pop="cancel">Cancel</button><button type="button" class="pri" data-pop="login" data-l="${need}">Log in as ${LVS[need]}</button></div>`;
        popEl.hidden = false;
        popEl.querySelector('.pri').focus();
        return say('Access denied: "' + SCRN[tgt] + '" is locked to ' + LVS[need] + ' and higher. The lock works: an operator cannot change the alarm limit.', 'ok');
      }
      rt.scr = tgt; closePop(); renderScreen();
      const back = els(tgt).some((x) => x.t === 'scr' && x.target !== tgt);
      say('The HMI shows "' + SCRN[tgt] + '" now. The PLC did not notice: changing screens is done inside the HMI.' + (back ? '' : ' But there is no button back! The operator is stuck on this screen.'), back ? '' : 'bad');
    }
    function setUser(l) {
      rt.user = l;
      let s = 'Logged in as ' + LVS[l] + ' (level ' + l + ').';
      if (st.screens[rt.scr].lvl > l) { rt.scr = 'main'; s += ' This screen needs a higher level, so the HMI went back to Main.'; }
      renderScreen();
      say(s + ' Real HMIs log you out automatically after some minutes, so a technician cannot forget to log out.', '');
    }

    /* ── machine panel (run mode) ── */
    function renderMachine() {
      const b = B();
      sideEl.innerHTML = `<div class="hwh-sec hwh-mach"><div class="hwh-sh">The machine <small>pump + tank</small></div>
        <svg viewBox="0 0 300 168" role="img" aria-label="Tank with a fill pump">
          <path class="pipe" data-m="pin" d="M14 146 H58"/><path class="pipe" data-m="pout" d="M86 146 H120 V22 H190 V34"/>
          <path class="pipe" data-m="xin" d="M262 6 V34"/><path class="pipe" d="M236 152 V164 H296"/>
          <circle class="pump" data-m="pump" cx="72" cy="146" r="14"/><path class="imp" data-m="imp" d="M72 136v20M62 146h20"/>
          <text x="72" y="124" text-anchor="middle">pump</text>
          <rect class="tank" x="168" y="34" width="112" height="118" rx="4"/>
          <rect class="water" data-m="water" x="170" y="100" width="108" height="50"/>
          <line class="spl" data-m="spl" x1="160" x2="288" y1="80" y2="80"/><line class="lim" data-m="liml" x1="160" x2="288" y1="40" y2="40"/>
          <text class="big" data-m="lvt" x="224" y="98" text-anchor="middle">35 %</text>
          <text class="b" data-m="spt" x="160" y="76" text-anchor="end">SP</text><text class="r" data-m="limt" x="160" y="36" text-anchor="end">alarm</text>
          <text x="294" y="20" text-anchor="end" data-m="xt">extra inflow</text>
        </svg>
        <div class="hwh-mrow"><button type="button" class="btn small" data-a="extra" aria-pressed="false">Extra inflow: off</button></div>
        <p class="hwh-note">Extra inflow pushes the level up even with the pump off. Use it to test your alarm.</p>
        <div class="hwh-sh2">Tags: what the HMI and the PLC share</div>
        <table class="hwh-tt"><tbody>${TAG_ORDER.map((k) => `<tr data-k="${k}"><td>${esc(TAG[k].n)}</td><td class="a">${esc(addr(k, b))}</td><td class="v"></td></tr>`).join('')}</tbody></table>
        <div class="hwh-sh2">Trend: the last 60 s</div>
        <div class="hwh-trend"><svg viewBox="0 0 260 74" aria-label="Trend of level, setpoint and alarm limit"><line class="ax" x1="22" x2="258" y1="6" y2="6"/><line class="ax" x1="22" x2="258" y1="66" y2="66"/><text x="18" y="9" text-anchor="end">100</text><text x="18" y="69" text-anchor="end">0</text><polyline class="li" data-m="tli" points=""/><polyline class="sp" data-m="tsp" points=""/><polyline class="lv" data-m="tlv" points=""/></svg>
        <div class="hwh-leg"><span><i style="border-color:var(--p-water)"></i>Level</span><span><i style="border-color:var(--info);border-top-style:dashed"></i>Setpoint</span><span><i style="border-color:var(--danger);border-top-style:dotted"></i>Alarm limit</span></div></div>
        <details><summary>The PLC program behind it</summary><pre class="hwh-prg">${esc(prgText())}</pre></details></div>`;
      updMachine();
    }
    function prgText() {
      const a = (k) => addr(k, B());
      return 'Rung 1  Start / stop with seal-in:\n  (' + a('start') + ' OR Run) AND NOT ' + a('stop') + ' AND NOT ' + a('alarm') + '  →  Run\n'
        + 'Rung 2  Fill control:\n  Level < Setpoint − 10  →  SET Fill\n  Level ≥ Setpoint       →  RESET Fill\n'
        + 'Rung 3  Run AND Fill  →  ' + a('pump') + '\n'
        + 'Rung 4  Level ≥ ' + a('lim') + '  →  SET ' + a('alarm') + '\n  (reset after ACK and Level < limit − 5)';
    }
    function updMachine() {
      if (!rt || st.mode !== 'run') return;
      const T = rt.T, q = (m) => sideEl.querySelector('[data-m="' + m + '"]');
      const lvY = (p) => 150 - p / 100 * 114;
      const w = q('water'); if (!w) return;
      const y = lvY(rt.lvl);
      w.setAttribute('y', y.toFixed(1)); w.setAttribute('height', (150 - y).toFixed(1));
      q('lvt').textContent = T.level + ' %'; q('lvt').setAttribute('y', Math.min(140, Math.max(60, y - 6)).toFixed(0));
      const sy = lvY(clamp(T.sp, 0, 100)), ly = lvY(clamp(T.lim, 0, 100));
      ['spl'].forEach(() => { q('spl').setAttribute('y1', sy); q('spl').setAttribute('y2', sy); q('spt').setAttribute('y', sy + 4); });
      q('liml').setAttribute('y1', ly); q('liml').setAttribute('y2', ly); q('limt').setAttribute('y', ly + 4);
      q('spl').style.display = T.sp >= 0 && T.sp <= 100 ? '' : 'none'; q('spt').style.display = q('spl').style.display;
      q('liml').style.display = T.lim >= 0 && T.lim <= 100 ? '' : 'none'; q('limt').style.display = q('liml').style.display;
      q('pump').setAttribute('class', 'pump' + (T.pump ? ' on' : ''));
      q('imp').setAttribute('class', 'imp' + (T.pump ? ' on' : ''));
      q('pin').setAttribute('class', 'pipe' + (T.pump ? ' on' : ''));
      q('pout').setAttribute('class', 'pipe' + (T.pump ? ' on' : ''));
      q('xin').setAttribute('class', 'pipe' + (rt.extra ? ' on' : ''));
      const xb = sideEl.querySelector('[data-a="extra"]');
      if (xb) { xb.setAttribute('aria-pressed', String(rt.extra)); xb.textContent = 'Extra inflow: ' + (rt.extra ? 'ON' : 'off'); }
      sideEl.querySelectorAll('tr[data-k]').forEach((tr) => {
        const k = tr.dataset.k, v = T[k], td = tr.querySelector('.v');
        const txt = TAG[k].bit ? (B() === 'codesys' || B() === 'schneider' ? (v ? 'TRUE' : 'FALSE') : String(v)) : String(v);
        if (td.textContent !== txt) {
          const first = td.textContent === '';
          td.textContent = txt; td.classList.toggle('one', TAG[k].bit && !!v);
          if (!first && (TAG[k].bit || k !== 'level')) { tr.classList.remove('ch'); void tr.offsetWidth; tr.classList.add('ch'); }
        }
      });
      const H = rt.hist, n = H.length;
      if (n > 1) {
        const X = (i) => (258 - (n - 1 - i) * (236 / 119)).toFixed(1), Y = (v) => (66 - clamp(v, 0, 100) * 0.6).toFixed(1);
        q('tlv').setAttribute('points', H.map((h, i) => X(i) + ',' + Y(h[0])).join(' '));
        q('tsp').setAttribute('points', H.map((h, i) => X(i) + ',' + Y(h[1])).join(' '));
        q('tli').setAttribute('points', H.map((h, i) => X(i) + ',' + Y(h[2])).join(' '));
      }
    }

    /* ── mode + brand paint ── */
    function paintMode() {
      root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === st.mode)));
      root.querySelectorAll('[data-brand]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.brand === st.brand)));
      root.querySelectorAll('[data-scr]').forEach((b) => {
        const s = b.dataset.scr, on = st.mode === 'run' ? rt.scr === s : st.scr === s;
        b.setAttribute('aria-pressed', String(on));
        b.disabled = st.mode === 'run';
        b.innerHTML = (st.screens[s].lvl >= 2 ? LOCK : '') + SCRN[s];
      });
    }

    /* ── events ── */
    root.addEventListener('click', (ev) => {
      const t = ev.target;
      const bb = t.closest('[data-brand]');
      if (bb) {
        if (bb.dataset.brand === st.brand) return;
        st.brand = bb.dataset.brand; save(); paintMode(); renderScreen();
        if (st.mode === 'edit') renderProps(); else renderMachine();
        paintChecks();
        const b = B();
        return say(BR[b].label + ': the HMI software is ' + BR[b].tool + '. ' + (b === 'rockwell' ? 'Studio 5000 has no M bits: the HMI links to tag names like Start_PB (BOOL).' : b === 'omron' ? 'Sysmac uses named variables: the HMI links to Start_PB by name.' : b === 'siemens' ? 'The HMI links to PLC tags like Start_PB (M20.0).' : 'Located variables look like ' + addr('start', b) + ' (bit) and ' + addr('sp', b) + ' (word); most projects link the HMI by name.') + ' The ideas are the same in every brand.', '');
      }
      const mb = t.closest('[data-mode]');
      if (mb) { if (mb.dataset.mode === 'run') enterRun(); else leaveRun(); return; }
      const sb = t.closest('[data-scr]');
      if (sb) { if (st.mode !== 'edit' || st.scr === sb.dataset.scr) return; st.scr = sb.dataset.scr; st.sel = 0; save(); paintMode(); renderScreen(); renderProps(); return; }
      const tb = t.closest('[data-tool]');
      if (tb) return addEl(tb.dataset.tool);
      const pb = t.closest('[data-pop]');
      if (pb) {
        const a = pb.dataset.pop;
        if (a === 'cancel') { closePop(); return; }
        if (a === 'ok') return commitInput();
        if (a === 'login') { const l = +pb.dataset.l; closePop(); rt.user = l; const tgt = rt.scr === 'main' ? 'set' : 'main'; rt.scr = st.screens.set.lvl === l ? 'set' : tgt; renderScreen(); return say('Logged in as ' + LVS[l] + '. Now "' + SCRN[rt.scr] + '" opens. In real life the technician logs out when the job is done, or the HMI does it after a few minutes.', 'ok'); }
      }
      const ab = t.closest('[data-a]');
      if (ab) {
        const a = ab.dataset.a;
        if (a === 'more') { capBox.classList.toggle('open'); fitMore(); return; }
        if (a === 'reset') {
          if (st.mode === 'run') leaveRun();
          const b = st.brand; st = start(); st.brand = b;
          try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
          paintMode(); renderTools(); renderScreen(); renderProps(); paintChecks();
          return say('Both screens are empty again. Start with the toolbox: a push button for START.', '');
        }
        if (a === 'del') return delSel();
        if (a === 'mv') return moveSel(ab.dataset.d);
        if (a === 'desel') { st.sel = 0; renderScreen(); renderProps(); return; }
        if (a === 'extra' && rt) { rt.extra = !rt.extra; updMachine(); return say(rt.extra ? 'Extra inflow ON: water comes in from a second line. The level rises even when the pump is off. Watch your alarm banner.' : 'Extra inflow off.', ''); }
      }
      if (st.mode === 'run' && rt) {
        if (t.closest('[data-ack]')) {
          rt.unack = false; updLive();
          return say('Acknowledged: the operator has seen the alarm. The banner stops blinking but stays red while the level is still high. It clears below ' + (rt.T.lim - 5) + ' %.', 'ok');
        }
        const n = t.closest('.hwh-el');
        if (n && scrEl.contains(n)) {
          const e = find(+n.dataset.id); if (!e) return;
          if (e.t === 'inp') return openInput(e);
          if (e.t === 'scr') return goScreen(e);
        }
      }
    });
    // keyboard on the popup
    popEl.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && popFor) { ev.preventDefault(); commitInput(); } else if (ev.key === 'Escape') closePop(); });
    root.addEventListener('change', (ev) => {
      const t = ev.target;
      if (t.matches('[data-user]') && rt) return setUser(+t.value);
      if (st.mode !== 'edit') return;
      if (t.dataset.s) {
        const S = st.screens[st.scr];
        if (t.dataset.s === 'bg') S.bg = BG[t.value] ? t.value : 'grey'; else S.lvl = clamp(+t.value || 0, 0, 3);
        save(); renderScreen(); paintMode(); paintChecks();
        const c = screenCap(t.dataset.s); if (c) say(c[0], c[1]);
        return;
      }
      const p = t.dataset.p; if (!p) return;
      const e = els().find((x) => x.id === st.sel); if (!e) return;
      if (t.tagName === 'SELECT') {
        e[p] = t.value; save(); renderScreen(e.id); paintMode(); renderProps(); paintChecks();
        const sel2 = sideEl.querySelector('[data-p="' + p + '"]'); if (sel2) sel2.focus();
      }
      const c = propCap(e, p); if (c) say(c[0], c[1]);
    });
    root.addEventListener('input', (ev) => {
      const t = ev.target;
      if (st.mode !== 'edit' || !t.dataset.p || t.tagName !== 'INPUT') return;
      const e = els().find((x) => x.id === st.sel); if (!e) return;
      e[t.dataset.p] = t.value.slice(0, 24);
      save();
      const n = scrEl.querySelector('[data-id="' + e.id + '"]');
      if (n) { n.innerHTML = elInner(e, false) + chipHtml(e); n.setAttribute('aria-label', TYPES[e.t].name + ' ' + e.label); }
      if (t.dataset.p === 'unit') t.classList.toggle('bad', !String(e.unit).trim());
      if (t.dataset.p === 'min' || t.dataset.p === 'max') {
        const w = limWhy(e), nt = sideEl.querySelector('[data-limnote]');
        if (nt) { nt.textContent = w ? 'Limits: ' + w + '. The operator could type any number.' : 'The HMI refuses values outside ' + num(e.min) + ' … ' + num(e.max) + '.'; nt.classList.toggle('bad', !!w); }
        sideEl.querySelectorAll('[data-p="min"],[data-p="max"]').forEach((x) => x.classList.toggle('bad', !!w && num(e[x.dataset.p]) == null));
      }
      paintChecks();
    });
    root.addEventListener('keydown', (ev) => {
      const t = ev.target;
      if (t.matches('input.hwh-in') && ev.key === 'Enter') { t.blur(); return; }
      const n = t.closest && t.closest('.hwh-el');
      if (!n || !scrEl.contains(n)) return;
      const e = find(+n.dataset.id); if (!e) return;
      if (st.mode === 'edit') {
        const d = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' }[ev.key];
        if (d) { ev.preventDefault(); st.sel = e.id; moveSel(d); scrEl.querySelectorAll('.hwh-el').forEach((x) => x.classList.toggle('sel', +x.dataset.id === e.id)); renderProps(); n.focus(); return; }
        if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); st.sel = e.id; delSel(); return; }
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); selectEl(e.id); return; }
      } else if ((ev.key === 'Enter' || ev.key === ' ') && !ev.repeat) {
        ev.preventDefault();
        if (e.t === 'pb' || e.t === 'sw' || e.t === 'estop') pressEl(e);
        else if (e.t === 'inp') openInput(e);
        else if (e.t === 'scr') goScreen(e);
      }
    });
    root.addEventListener('keyup', (ev) => {
      if (st.mode !== 'run' || (ev.key !== 'Enter' && ev.key !== ' ')) return;
      const n = ev.target.closest && ev.target.closest('.hwh-el');
      if (n) { const e = find(+n.dataset.id); if (e) releaseEl(e); }
    });
    function selectEl(id) {
      st.sel = id;
      scrEl.querySelectorAll('.hwh-el').forEach((x) => x.classList.toggle('sel', +x.dataset.id === id));
      renderProps();
    }
    // pointer: edit = select / drag; run = momentary press
    scrEl.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      const n = ev.target.closest('.hwh-el');
      if (st.mode === 'run') {
        if (!n || !rt || ev.target.closest('[data-ack]')) return;
        const e = find(+n.dataset.id);
        if (!e || !(e.t === 'pb' || e.t === 'sw' || e.t === 'estop')) return;
        ev.preventDefault();
        try { n.setPointerCapture(ev.pointerId); } catch (e2) { /* ignore */ }
        pressEl(e);
        return;
      }
      if (!n) { if (st.sel) { st.sel = 0; scrEl.querySelectorAll('.hwh-el.sel').forEach((x) => x.classList.remove('sel')); renderProps(); } return; }
      const e = els().find((x) => x.id === +n.dataset.id); if (!e) return;
      const r = scrEl.getBoundingClientRect(), cw = r.width / COLS, rh = r.height / ROWS;
      drag = { id: e.id, n, px: ev.clientX, py: ev.clientY, moved: false, oc: Math.floor((ev.clientX - r.left) / cw) - e.x, or: Math.floor((ev.clientY - r.top) / rh) - e.y, x0: e.x, y0: e.y };
      try { n.setPointerCapture(ev.pointerId); } catch (e2) { /* ignore */ }
      if (st.sel !== e.id) selectEl(e.id);
    });
    scrEl.addEventListener('pointermove', (ev) => {
      if (!drag || st.mode !== 'edit') return;
      if (!drag.moved && Math.hypot(ev.clientX - drag.px, ev.clientY - drag.py) < 6) return;
      drag.moved = true; drag.n.classList.add('drag');
      const e = els().find((x) => x.id === drag.id); if (!e) return;
      const r = scrEl.getBoundingClientRect(), cw = r.width / COLS, rh = r.height / ROWS, T = TYPES[e.t];
      const nx = clamp(Math.floor((ev.clientX - r.left) / cw) - drag.oc, 0, COLS - T.w), ny = clamp(Math.floor((ev.clientY - r.top) / rh) - drag.or, 0, ROWS - T.h);
      if ((nx !== e.x || ny !== e.y) && fits(els(), e, nx, ny, 0)) { e.x = nx; e.y = ny; place(drag.n, e); }
    });
    const endDrag = () => {
      if (!drag) return;
      const d = drag; drag = null;
      d.n.classList.remove('drag');
      if (d.moved) save();
    };
    scrEl.addEventListener('pointerup', (ev) => {
      if (st.mode === 'run') { const n = ev.target.closest('.hwh-el'); if (n && rt && rt.held === +n.dataset.id) releaseEl(find(+n.dataset.id)); return; }
      endDrag();
    });
    scrEl.addEventListener('pointercancel', (ev) => {
      if (st.mode === 'run') { if (rt && rt.held) releaseEl(find(rt.held)); return; }
      endDrag();
    });
    scrEl.addEventListener('lostpointercapture', () => { if (st.mode === 'run' && rt && rt.held) releaseEl(find(rt.held)); });
    scrEl.addEventListener('contextmenu', (ev) => { if (st.mode === 'run') ev.preventDefault(); });

    /* ── life cycle ── */
    const onResize = () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        if (dead || !document.body.contains(root)) { dispose(); return; }
        widthCls(); fitMore();
      }, 60);
    };
    function dispose() {
      if (dead) return;
      dead = true;
      clearInterval(timer); clearTimeout(rT);
      obs.forEach((o) => o.disconnect()); obs.length = 0;
      if (!('ResizeObserver' in window)) window.removeEventListener('resize', onResize);
      if (cleanup === dispose) cleanup = null;
    }
    cleanup = dispose;
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(root); obs.push(io); }
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(onResize); ro.observe(root); obs.push(ro); }
    else window.addEventListener('resize', onResize);
    // the timer also stops if the lesson page is left without a new mount
    const gone = setInterval(() => { if (!document.body.contains(root)) { clearInterval(gone); dispose(); } }, 2000);
    obs.push({ disconnect: () => clearInterval(gone) });

    paintMode(); renderTools(); widthCls(); renderScreen(); renderProps(); paintChecks();
    capP.textContent = st.cap || 'Two empty screens: Main and Settings. The pump has a start and a stop bit, a level sensor and a setpoint. Start with the toolbox: add a push button for START.';
    capBox.className = 'hwh-cap' + (st.cap && st.capKind ? ' ' + st.capKind : '');
    fitMore();
  };
})();
