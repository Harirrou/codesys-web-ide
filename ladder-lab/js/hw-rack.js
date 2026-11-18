/* Ladder Lab — Rack simulator: modules, slots and I/O addresses. Mounted in lessons through [[hw:rack]].
 * The learner fills a 10-slot rack (power supply, CPU, I/O cards, serial module) for a small machine,
 * sees how the slot and the start byte give every signal its address (Siemens TIA, Rockwell Studio 5000,
 * CODESYS), checks the power budget, and follows one signal hop by hop:
 * sensor → wire → terminal → card LED → process image → program contact (and back for outputs). */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-rack', NS = 10;

  // ───────────── module catalog ─────────────
  const MT = {
    PS: { label: 'PS 25 W', sub: 'power supply', bg: '#64717c', fg: '#fff', pw: 0, supply: 25, ch: 0,
      desc: 'System power supply. It feeds 25 W into the backplane bus. The CPU and every card take their power from there.' },
    CPU: { label: 'CPU', sub: 'runs the program', bg: '#24303a', fg: '#fff', chart: 'var(--hwr-cpu)', pw: 6, ch: 0,
      desc: 'The CPU runs your program. Every scan it reads the inputs, runs the program and writes the outputs.' },
    DI: { label: 'DI 16', sub: '16 inputs · 2 bytes', bg: '#12803f', fg: '#fff', pw: 1.0, area: 'I', bytes: 2, ch: 16, g: 'di',
      desc: '16 digital inputs, 24 V DC. One bit per input: 16 bits = 2 bytes.' },
    DQ: { label: 'DQ 16', sub: '16 outputs · 2 bytes', bg: '#f0a020', fg: '#2a1a00', pw: 1.5, area: 'Q', bytes: 2, ch: 16, g: 'dq',
      desc: '16 digital outputs, 24 V DC, 0.5 A each. One bit per output: 16 bits = 2 bytes.' },
    AI: { label: 'AI 4', sub: '4 × 4–20 mA · 8 bytes', bg: '#2160c4', fg: '#fff', pw: 1.2, area: 'I', bytes: 8, ch: 4, word: true, g: 'ai',
      desc: '4 analog inputs, 4–20 mA. One word (2 bytes) per channel: 4 words = 8 bytes.' },
    AQ: { label: 'AQ 2', sub: '2 analog out · 4 bytes', bg: '#7b4fd0', fg: '#fff', pw: 1.8, area: 'Q', bytes: 4, ch: 2, word: true, g: 'aq',
      desc: '2 analog outputs, 4–20 mA. One word (2 bytes) per channel: 2 words = 4 bytes.' },
    CM: { label: 'CM RS-485', sub: 'Modbus RTU port', bg: '#0b7f77', fg: '#fff', pw: 1.5, ch: 1, g: 'ser',
      desc: 'Serial module RS-485 for Modbus RTU. It has no I/O bytes here: the program talks to the devices with Modbus blocks.' },
  };
  const ORDER = ['PS', 'CPU', 'DI', 'DQ', 'AI', 'AQ', 'CM'];

  // ───────────── the mission machine: a small assembly station ─────────────
  const mk = (rows, extra) => rows.map((r) => Object.assign({ id: r[0], d: r[1], tag: r[2], kind: r[3] }, extra ? extra(r) : {}));
  const DI = mk([
    ['-S1', 'START button', 'Start_PB', 'pb'], ['-S2', 'STOP button (NC)', 'Stop_PB', 'nc'], ['-S3', 'RESET button', 'Reset_PB', 'pb'],
    ['-S4', 'MAN / AUTO selector', 'Auto_Mode', 'sel'], ['-B1', 'part present', 'Part_Present', 'sen'], ['-B2', 'cylinder A home', 'CylA_Home', 'sen'],
    ['-B3', 'cylinder A out', 'CylA_Out', 'sen'], ['-B4', 'cylinder B home', 'CylB_Home', 'sen'], ['-B5', 'cylinder B out', 'CylB_Out', 'sen'],
    ['-B6', 'gripper closed', 'Grip_Closed', 'sen'], ['-B7', 'guard door closed', 'Door_Closed', 'sen'], ['-B8', 'part at conveyor end', 'Conv_End', 'sen'],
    ['-B9', 'part is metal', 'Part_Metal', 'sen'], ['-B10', 'tank level low', 'Tank_Low', 'sen'], ['-B11', 'tank level high', 'Tank_High', 'sen'],
    ['-B12', 'air pressure OK', 'Air_OK', 'sen'], ['-F1', 'motor overload OK', 'Motor_OL_OK', 'ol'], ['-K1', 'contactor feedback', 'Motor_Fbk', 'aux'],
  ]);
  const DQ = mk([
    ['-K1', 'motor contactor', 'Motor_Run', 'k'], ['-Y1', 'valve cylinder A out', 'CylA_Out_V', 'y'], ['-Y2', 'valve cylinder A back', 'CylA_Back_V', 'y'],
    ['-Y3', 'valve cylinder B out', 'CylB_Out_V', 'y'], ['-Y4', 'valve cylinder B back', 'CylB_Back_V', 'y'], ['-Y5', 'valve gripper close', 'Grip_V', 'y'],
    ['-Y6', 'valve blow-off air', 'Blow_V', 'y'], ['-H1', 'green lamp (running)', 'Lamp_Run', 'lamp'], ['-H2', 'red lamp (fault)', 'Lamp_Fault', 'lamp'],
    ['-H3', 'horn', 'Horn', 'horn'],
  ]);
  const AI = mk([['-B20', 'tank level', 'Tank_Level', 'tx', 0, 100, '%'], ['-B21', 'pressure', 'Pressure', 'tx', 0, 10, 'bar'], ['-B22', 'temperature', 'Temperature', 'tx', 0, 150, '°C']],
    (r) => ({ lo: r[4], hi: r[5], u: r[6] }));
  const AQ = mk([['-Y20', 'control valve', 'Valve_Pos', 'valve', 0, 100, '%']], (r) => ({ lo: r[4], hi: r[5], u: r[6] }));
  const SER = mk([['-P1', 'energy meter (Modbus RTU, address 1)', 'Energy_Meter', 'meter']]);
  const GR = [
    { g: 'di', t: 'DI', list: DI, tab: 'DI', name: 'digital inputs', term: '-X2', need: Math.ceil(DI.length * 1.1) },
    { g: 'dq', t: 'DQ', list: DQ, tab: 'DQ', name: 'digital outputs', term: '-X3', need: Math.ceil(DQ.length * 1.1) },
    { g: 'ai', t: 'AI', list: AI, tab: 'AI', name: 'analog inputs', term: '-X4', need: AI.length },
    { g: 'aq', t: 'AQ', list: AQ, tab: 'AQ', name: 'analog outputs', term: '-X5', need: AQ.length },
    { g: 'ser', t: 'CM', list: SER, tab: 'Serial', name: 'serial device', term: '-X6', need: 1 },
  ];
  const GBY = {};
  GR.forEach((G) => (GBY[G.g] = G));
  const grp = (k) => k.split(':')[0];
  const sigOf = (k) => GBY[grp(k)].list[+k.split(':')[1]];
  const termOf = (k) => (grp(k) === 'ser' ? '-X6:1/2' : GBY[grp(k)].term + ':' + (+k.split(':')[1] + 1));
  const BRANDS = [['siemens', 'Siemens', 'TIA'], ['rockwell', 'Rockwell', 'Studio 5000'], ['codesys', 'CODESYS', '']];
  const BNAME = { siemens: 'Siemens TIA', rockwell: 'Studio 5000', codesys: 'CODESYS' };
  // why a signal does not get through: no power supply, no CPU, or the CPU is in STOP (hardware configuration error)
  const deadOf = (C) => (!C.supply ? 'power' : !C.cpu ? 'cpu' : C.stopped ? 'stop' : null);
  const DEADTXT = { power: 'no power', cpu: 'no CPU', stop: 'CPU in STOP' };
  const STOPTXT = 'The CPU is in STOP (red ERROR LED): the hardware configuration has an error, so the program does not run and the outputs stay off. Fix the red module first.';
  const ODDTXT = 'No valid address: in CODESYS a word must start on an even byte, so the program cannot ';
  const RW_NOTE = 'Simplified: in a real ControlLogix chassis the power supply sits on the side and has no slot number. The controller is usually in slot 0 (path 1,0), so the first card would be Local:1. Here all three brands share one rack.';
  const aiBad = (v) => v < 3.6 || v > 21;
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let uidN = 0;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const brk = (s) => esc(s).replace(/([:._])/g, '$1<wbr>'); // let long tag addresses wrap nicely
  const tagH = (s) => esc(s).replace(/_/g, '_<wbr>'); // tags: a break after "_" only as a last resort (the layout gives them room)
  const abrk = (s) => esc(s).replace(/:/g, ':<wbr>'); // addresses: break only after a colon
  // keep device ids like -X2:7 or -B3 on one line
  const nw = (s) => esc(s).replace(/(^|[\s(])(-[A-Z][0-9A-Z]*(?::[0-9/]+)?)/g, '$1<span class="hwr-nw">$2</span>');
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // ───────────── icons (32 × 32, stroke = currentColor) ─────────────
  const IC = {
    pb: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5.5" fill="currentColor"/>',
    nc: '<circle cx="16" cy="16" r="11"/><path d="M10 16h12"/>',
    sel: '<circle cx="16" cy="16" r="11"/><path d="M12 9l8 14" stroke-width="4"/>',
    sen: '<rect x="4" y="10" width="17" height="12" rx="2"/><path d="M21 13h5v6h-5M8 10v12M12 10v12"/><circle cx="27" cy="16" r="1.5" fill="currentColor"/>',
    ol: '<rect x="6" y="6" width="20" height="20" rx="2"/><path d="M11 20l4-8 3 6 3-6"/>',
    aux: '<path d="M3 16h8M21 16h8M11 9v14M21 9v14"/>',
    wire: '<path d="M3 21C9 21 9 11 16 11s7 10 13 10"/>',
    term: '<rect x="8" y="3" width="16" height="26" rx="2"/><circle cx="16" cy="11" r="3.5"/><path d="M14 11h4M8 20h16M8 24h16"/>',
    card: '<rect x="8" y="3" width="16" height="26" rx="2.5"/><circle cx="13" cy="10" r="1.8" fill="currentColor"/><circle cx="13" cy="15" r="1.8" fill="currentColor"/><circle cx="13" cy="20" r="1.8" fill="currentColor"/><path d="M17 10h3M17 15h3M17 20h3"/>',
    pi: '<rect x="3" y="9" width="26" height="14" rx="2"/><path d="M9.5 9v14M16 9v14M22.5 9v14"/><rect x="16" y="9" width="6.5" height="14" fill="currentColor" stroke="none"/>',
    no: '<path d="M2 16h9M21 16h9M11 8v16M21 8v16"/>',
    coil: '<path d="M2 16h8M22 16h8"/><path d="M13 8c-4 4-4 12 0 16M19 8c4 4 4 12 0 16"/>',
    k: '<rect x="8" y="9" width="16" height="14"/><path d="M16 2v7M16 23v7"/>',
    y: '<rect x="8" y="9" width="16" height="14"/><path d="M8 23L24 9M16 2v7M16 23v7"/>',
    lamp: '<circle cx="16" cy="16" r="10"/><path d="M9 9l14 14M23 9L9 23"/>',
    horn: '<path d="M5 12h5l9-6v20l-9-6H5z"/><path d="M23 11c2 3 2 7 0 10M26 8c3.5 5 3.5 11 0 16"/>',
    tx: '<circle cx="16" cy="13" r="9"/><path d="M16 22v7M11 29h10M16 13l5-4"/>',
    valve: '<path d="M4 11v12l12-6zM28 11v12l-12-6z"/><path d="M16 17V6M10 6h12"/>',
    meter: '<rect x="5" y="4" width="22" height="24" rx="3"/><rect x="9" y="8" width="14" height="7"/><path d="M10 21h12"/>',
    fb: '<rect x="5" y="7" width="22" height="18" rx="2"/><path d="M5 12h22M10 17h8M10 21h5"/>',
    pair: '<path d="M3 12c4 0 5 8 9 8s5-8 9-8 5 8 8 8M3 20c4 0 5-8 9-8s5 8 9 8 5-8 8-8"/>',
  };
  const icon = (n) => '<svg class="hwr-ic" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || IC.fb) + '</svg>';

  // ───────────── CSS (once) ─────────────
  const CSS = `
.hw-rack{--hwr-cpu:#24303a}
:root[data-theme="dark"] .hw-rack{--hwr-cpu:#8193a2}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hw-rack{--hwr-cpu:#8193a2}}
.hw-box.hw-rack{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:18px 0;color:var(--ink);font-size:.95rem;line-height:1.45;min-width:0}
.hw-rack *{box-sizing:border-box}
.hw-rack p,.hw-rack li{max-width:none}
.hwr-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.hwr-title{margin:0;font-family:var(--f-display);font-weight:700;font-size:1.32rem;line-height:1.15;letter-spacing:.01em}
.hwr-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface-2);max-width:100%}
.hwr-seg button{flex:1 1 auto;min-height:36px;padding:4px 12px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--ink-2);font-weight:600;font-size:.86rem;cursor:pointer;white-space:nowrap}
.hwr-seg button:first-child{border-left:0}
.hwr-seg button:hover{background:var(--surface-3)}
.hwr-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwr-intro{margin:8px 0 0;color:var(--ink-2);font-size:.92rem}
.hwr-sec{margin-top:18px}
.hwr-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 12px;margin:0 0 8px}
.hwr-h b{font-family:var(--f-display);font-size:.95rem;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2)}
.hwr-h span{font-size:.82rem;color:var(--muted)}
.hwr-cat{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.hwr-catb{position:relative;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;min-height:48px;padding:6px 26px 6px 10px;border:1px solid var(--line);border-left:6px solid var(--c);border-radius:10px;background:var(--surface);color:var(--ink);cursor:pointer;text-align:left;font:inherit}
.hwr-catb:hover{background:var(--surface-2);border-color:var(--ink-2);border-left-color:var(--c)}
.hwr-catb b{font-size:.92rem;line-height:1.2}
.hwr-catb small{font-size:.76rem;color:var(--muted);line-height:1.25}
.hwr-plus{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-weight:700;color:var(--muted);font-size:1.15rem;line-height:1}
.hwr-rackwrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);padding:12px 12px 8px;scrollbar-width:thin}
.hwr-rack{position:relative;display:grid;grid-template-columns:repeat(${NS},62px);gap:6px;width:max-content;margin:0 auto}
.hwr-rail{position:absolute;left:-8px;right:-8px;top:64px;height:84px;border-radius:4px;background:repeating-linear-gradient(90deg,var(--surface-3) 0 9px,var(--line-2) 9px 11px);border:1px solid var(--line)}
.hwr-slot{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3px}
.hwr-mod,.hwr-empty{width:62px;height:212px;border-radius:9px;padding:0;font:inherit;color:inherit;cursor:pointer}
.hwr-empty{border:2px dashed var(--line);background:color-mix(in srgb,var(--surface-2) 70%,transparent);color:var(--muted);font-size:.72rem}
.hwr-empty:hover{border-color:var(--muted)}
.hwr-mod{position:relative;display:flex;flex-direction:column;align-items:stretch;overflow:hidden;border:1px solid var(--line);background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.14),0 4px 10px rgba(0,0,0,.07);text-align:center;transition:transform .15s}
.hwr-mod:hover{transform:translateY(-2px)}
.hwr-mod.hwr-sel{outline:3px solid var(--accent-bg);outline-offset:2px}
.hwr-mod.hwr-bad{border:2px solid var(--danger)}
.hwr-strip{flex:none;display:flex;align-items:center;justify-content:center;height:28px;padding:0 2px;background:var(--c);color:var(--ci);font-weight:700;font-size:.76rem;white-space:nowrap}
.hwr-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:6px 3px;min-height:0}
.hwr-nopow .hwr-mod:not(.hwr-t-PS) .hwr-body{opacity:.5}
.hwr-bad .hwr-foot{color:var(--danger)}
.hwr-foot{flex:none;padding:3px 2px 4px;font:600 .64rem/1.25 var(--f-mono);color:var(--ink-2);border-top:1px solid var(--line-2);background:var(--surface-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hwr-sn{font:700 .76rem var(--f-mono);color:var(--muted)}
.hwr-badge{position:absolute;top:33px;right:3px;width:17px;height:17px;border-radius:50%;background:var(--danger);color:#fff;font:800 .7rem/17px var(--f-body);text-align:center}
.hwr-leds{display:flex;gap:5px}
.hwr-ledcol{display:flex;flex-direction:column;gap:3px}
.hwr-ledrow{display:flex;align-items:center;gap:2px;font:500 .64rem/1 var(--f-mono);color:var(--ink-2)}
.hwr-ledrow em{font-style:normal;width:13px;text-align:right}
.hwr-led{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line);flex:none}
.hwr-led.on{background:var(--power-bright);border-color:var(--power);box-shadow:0 0 6px var(--power-bright)}
.hwr-led.red.on{background:var(--danger);border-color:var(--danger);box-shadow:0 0 6px var(--danger)}
.hwr-led.amb.on{background:var(--accent-bg);border-color:var(--accent);box-shadow:0 0 6px var(--accent-bg)}
.hwr-led.me,.hwr-bar.me{outline:2px solid var(--accent-bg);outline-offset:1px}
.hwr-bars{display:flex;gap:5px;align-items:flex-end}
.hwr-barc{display:flex;flex-direction:column;align-items:center;gap:3px;font:500 .64rem/1 var(--f-mono);color:var(--ink-2)}
.hwr-bar{position:relative;width:9px;height:100px;border-radius:4px;background:var(--surface-3);border:1px solid var(--line);overflow:hidden}
.hwr-t-AQ .hwr-bar{width:14px}
.hwr-bar i{position:absolute;left:0;right:0;bottom:0;height:0;background:var(--c);transition:height .2s}
.hwr-bar i.bad{background:var(--danger);height:100%!important;opacity:.35}
.hwr-ll{display:flex;align-items:center;gap:4px;font:600 .6rem var(--f-mono);color:var(--ink-2);width:50px}
.hwr-big{font:700 1.05rem/1 var(--f-display);color:var(--ink)}
.hwr-tiny{font:600 .64rem/1.2 var(--f-mono);color:var(--ink-2)}
.hwr-port{width:30px;height:15px;border:2px solid var(--muted);border-radius:3px 3px 9px 9px}
.hwr-rj{width:18px;height:16px;border:2px solid var(--muted);border-radius:2px;position:relative}
.hwr-rj:after{content:"";position:absolute;left:4px;right:4px;bottom:-2px;height:4px;background:var(--surface);border:2px solid var(--muted);border-bottom:0}
.hwr-scroll{display:none;font-size:.78rem;color:var(--muted);margin-top:4px}
.hwr-rnote .hwr-note{margin-top:8px}
.hwr-narrow .hwr-scroll{display:block}
.hwr-detail{margin-top:10px;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:12px}
.hwr-detail.hwr-dnone{color:var(--muted);font-size:.9rem;background:var(--surface-2);border-style:dashed;padding:10px 12px}
.hwr-dtop{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.hwr-dname{display:flex;align-items:center;gap:8px;font-size:1.02rem}
.hwr-sw{width:14px;height:14px;border-radius:4px;background:var(--c);flex:none;display:inline-block;border:1px solid rgba(0,0,0,.15)}
.hwr-dbtns{display:flex;flex-wrap:wrap;gap:6px}
.hwr-dbtns .btn.hwr-del{color:var(--danger)}
.hwr-ddesc{margin:6px 0 0;color:var(--ink-2);font-size:.9rem}
.hwr-row{margin-top:10px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.hwr-k{font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.hwr-mono{font-family:var(--f-mono);font-weight:600;overflow-wrap:anywhere}
.hwr-start{margin-top:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.hwr-start label{display:flex;align-items:center;gap:8px;font-weight:600;font-size:.9rem}
.hwr-start input{width:84px;min-height:36px;padding:4px 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font-family:var(--f-mono);font-size:.95rem}
.hwr-start input:disabled{background:var(--surface-2);color:var(--muted)}
.hwr-note{margin:10px 0 0;padding:8px 10px;border-radius:8px;background:var(--surface-2);border-left:4px solid var(--info);font-size:.86rem;color:var(--ink-2)}
.hwr-note.bad{border-left-color:var(--danger);background:var(--danger-soft);color:var(--ink)}
.hwr-note.warn{border-left-color:var(--accent-bg)}
.hwr-chmap{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(205px,1fr));gap:4px}
.hwr-chmap > span{display:grid;grid-template-columns:auto minmax(0,1fr);column-gap:7px;align-items:baseline;padding:4px 8px;border-radius:6px;background:var(--surface-2);font-size:.8rem;min-width:0;line-height:1.35}
.hwr-chmap em{font-style:normal;color:var(--muted);font-family:var(--f-mono);font-size:.7rem;flex:none}
.hwr-chmap b{font-family:var(--f-mono);font-size:.76rem;flex:none}
.hwr-chmap i{grid-column:1 / -1;font-style:normal;min-width:0;color:var(--ink-2)}
.hwr-chmap b{overflow-wrap:anywhere}
.hwr-chmap .hwr-spare{color:var(--muted)}
.hwr-pwt{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 10px;font-size:.88rem;margin-bottom:5px}
.hwr-pwt b{font-family:var(--f-mono)}
.hwr-pbar{position:relative;display:flex;height:24px;border-radius:7px;overflow:hidden;background:var(--surface-3);border:1px solid var(--line)}
.hwr-pbar span{height:100%;background:var(--c);border-right:2px solid var(--surface);flex:none}
.hwr-pbar.over{border:2px solid var(--danger)}
.hwr-pbar.over span{background:var(--danger);opacity:.8}
.hwr-pbar span.hwr-demo{background:repeating-linear-gradient(135deg,var(--c) 0 5px,transparent 5px 9px)}
.hwr-pbar.over span.hwr-demo{background:repeating-linear-gradient(135deg,var(--danger) 0 5px,var(--danger-soft) 5px 9px);opacity:1}
.hwr-pmark{position:absolute;top:-1px;bottom:-1px;width:3px;margin-left:-1px;background:var(--ink)}
.hwr-plim{position:relative;height:16px;margin-top:2px;font:600 .72rem/16px var(--f-mono);color:var(--ink-2)}
.hwr-plim span{position:absolute;transform:translateX(-50%);white-space:nowrap}
.hwr-plg{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:.78rem;color:var(--muted)}
.hwr-plg span{display:inline-flex;align-items:center;gap:5px}
.hwr-plg .hwr-sw{width:10px;height:10px;border-radius:3px}
.hwr-pfoot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;margin-top:8px}
.hwr-pfoot p{margin:0;flex:1 1 280px;font-size:.82rem;color:var(--ink-2)}
.hwr-pfoot .btn[aria-pressed="true"]{background:var(--danger-soft);border-color:var(--danger);color:var(--ink)}
.hwr-simp{margin:6px 0 0;font-size:.78rem;color:var(--muted)}
.hwr-demochip{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:var(--danger-soft);color:var(--danger);font:700 .72rem var(--f-body);letter-spacing:0;text-transform:none;vertical-align:middle}
.hwr-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.hwr-tab{min-height:34px;padding:4px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font:inherit;font-weight:600;font-size:.86rem;cursor:pointer;color:var(--ink-2);display:inline-flex;align-items:center;gap:6px}
.hwr-tab:hover{background:var(--surface-2)}
.hwr-tab[aria-selected="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.hwr-tab:focus-visible{outline:3px solid var(--accent-bg);outline-offset:2px}
.hwr-tbad{width:8px;height:8px;border-radius:50%;background:var(--danger);flex:none}
.hwr-gsum{font-size:.86rem;margin:0 0 8px;color:var(--ink-2);display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center}
.hwr-ok{color:var(--power);font-weight:700}
.hwr-no{color:var(--danger);font-weight:700}
.hwr-io .tbl{margin:0}
.hwr-io td{vertical-align:middle}
.hwr-id{font-family:var(--f-mono);font-weight:700;margin-right:5px;white-space:nowrap}
.hwr-sub{display:none;font-size:.75rem;color:var(--muted);font-family:var(--f-mono);line-height:1.3;margin-top:1px}
.hwr-narrow .hwr-sub{display:block}
.hwr-narrow .hwr-ctag,.hwr-narrow .hwr-ccard{display:none}
.hwr-narrow .hwr-io th,.hwr-narrow .hwr-io td{padding:7px 6px}
.hwr-addr{font-family:var(--f-mono);font-weight:700;font-size:.86rem}
.hwr-nc{display:inline-block;margin-left:4px;padding:1px 7px;border-radius:999px;background:var(--danger-soft);color:var(--danger);font-size:.74rem;font-weight:700;white-space:nowrap}
.hwr-tc{white-space:nowrap;text-align:right;width:1%}
.hwr-v{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 4px;margin-left:6px;border-radius:6px;font:700 .72rem var(--f-mono);background:var(--surface-3);color:var(--ink-2);vertical-align:middle}
.hwr-v.on{background:var(--power-bright);color:#04210f}
.hwr-v.bad{background:var(--danger-soft);color:var(--danger)}
.hwr-narrow .hwr-v{min-width:20px;height:20px;margin-left:4px}
.hwr-narrow .hwr-tc .btn.small{padding-left:8px;padding-right:8px}
tr.hwr-open > td{background:var(--surface-2)}
tr.hwr-none > td{color:var(--muted)}
tr.hwr-pathrow > td{padding:0!important;background:var(--surface-2)}
.hwr-path{padding:12px;border-top:3px solid var(--accent-bg)}
.hwr-ph{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px}
.hwr-ph > b{font-size:.95rem}
.hwr-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.hwr-ctl .btn[aria-pressed="true"]{background:var(--accent-bg);border-color:var(--accent-bg);color:var(--accent-ink)}
.hw-rack .hwr-hops{list-style:none;margin:12px 0 0;padding:0;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px 12px}
.hwr-hops > li{position:relative;margin:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 3px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);text-align:center;transition:background .2s,border-color .2s,box-shadow .2s;min-width:0;scroll-margin:72px 0 120px}
.hwr-hops > li + li::before{content:"";position:absolute;left:-13px;top:24px;width:12px;height:3px;border-radius:2px;background:var(--line)}
.hwr-mid .hwr-hops{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 18px}
.hwr-mid .hwr-hops > li + li::before{left:-19px;width:18px}
.hwr-mid .hwr-hops > li:nth-child(3n+1)::before{display:none}
.hwr-hops > li.lit + li.lit::before{background:var(--power-bright)}
.hwr-hops .hwr-ic{width:28px;height:28px;color:var(--muted);flex:none}
.hwr-hops > li.lit{border-color:var(--power);background:var(--power-soft)}
.hwr-hops > li.lit .hwr-ic{color:var(--power)}
.hwr-hops > li.warn{border-color:var(--accent-bg);background:color-mix(in srgb,var(--accent-bg) 14%,var(--surface))}
.hwr-hops > li.warn .hwr-ic{color:var(--accent)}
.hwr-hops > li.bad{border-color:var(--danger);background:var(--danger-soft)}
.hwr-hops > li.bad .hwr-ic{color:var(--danger)}
.hwr-hops > li.cur{box-shadow:0 0 0 3px var(--accent-bg)}
.hwr-hops > li.flow .hwr-ic path{stroke-dasharray:4 3;animation:hwr-dash .5s linear infinite}
@keyframes hwr-dash{to{stroke-dashoffset:-14}}
.hwr-hk{font-size:.64rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);line-height:1.2}
.hwr-hv{font:600 .74rem/1.3 var(--f-mono);overflow-wrap:break-word;color:var(--ink);min-width:0;max-width:100%}
.hwr-mid .hwr-hv,.hwr-narrow .hwr-hv{font-size:.8rem}
.hwr-hv small{display:block;font:500 .72rem/1.3 var(--f-body);color:var(--ink-2)}
.hwr-hs{display:none}
.hw-rack .hwr-steps{margin:12px 0 0;padding:0 0 0 1.5em;font-size:.88rem;color:var(--ink-2)}
.hwr-steps li{margin:2px 0;opacity:.4;transition:opacity .2s}
.hwr-steps li.done{opacity:1}
.hwr-steps li.cur{opacity:1;color:var(--ink);font-weight:600}
.hwr-narrow .hwr-hops{grid-template-columns:minmax(0,1fr);gap:10px}
.hwr-narrow .hwr-hops > li{display:grid;grid-template-columns:30px minmax(0,1fr);column-gap:10px;align-items:center;text-align:left;padding:8px 10px}
.hwr-narrow .hwr-hops > li > .hwr-ic{grid-row:1 / span 3}
.hwr-narrow .hwr-hops > li > :not(.hwr-ic){grid-column:2}
.hwr-narrow .hwr-hops > li + li::before{left:23px;top:-12px;width:3px;height:12px}
.hwr-narrow .hwr-hv small{display:inline;margin-left:6px}
.hwr-narrow .hwr-hs{display:block;font-size:.84rem;color:var(--ink-2);line-height:1.35;margin-top:3px}
.hwr-narrow .hwr-steps{display:none}
.hwr-pi{display:flex;flex-wrap:wrap;align-items:flex-end;gap:6px 14px;margin-top:12px;font-size:.8rem}
.hwr-pi > .hwr-k{align-self:center}
.hwr-pi .hwr-tagn{text-transform:none;letter-spacing:0;font-family:var(--f-mono);color:var(--ink-2)}
.hwr-pi.dim .hwr-byte{opacity:.45}
.hwr-pinote{align-self:center;font-size:.78rem;font-weight:700;color:var(--danger)}
.hwr-byte{display:inline-flex;align-items:flex-end;gap:6px}
.hwr-byte > b{font-family:var(--f-mono);font-size:.78rem;line-height:28px}
.hwr-bitbox{display:inline-flex;flex-direction:column;gap:1px}
.hwr-bitno{display:flex;padding-left:1px}
.hwr-bitno i{width:21px;font:500 .64rem/1.2 var(--f-mono);font-style:normal;color:var(--muted);text-align:center}
.hwr-bitno i + i{margin-left:1px}
.hwr-bits{display:inline-flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.hwr-bits i{width:21px;height:26px;display:grid;place-items:center;font:700 .76rem var(--f-mono);font-style:normal;color:var(--muted);border-left:1px solid var(--line-2);background:var(--surface)}
.hwr-bits i:first-child{border-left:0}
.hwr-bits i.on{background:var(--power-bright);color:#04210f}
.hwr-bits i.me{box-shadow:inset 0 0 0 3px var(--accent-bg);color:var(--ink)}
.hwr-bits i.me.on{color:#04210f}
.hwr-pleg{align-self:center;display:inline-flex;align-items:center;gap:5px;font-size:.76rem;color:var(--ink-2)}
.hwr-pleg i{width:12px;height:12px;border-radius:3px;background:var(--power-bright);border:1px solid var(--power)}
.hwr-an{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-top:10px}
.hwr-an label{display:flex;align-items:center;gap:10px;flex:1 1 260px;min-width:0;font-weight:600;font-size:.9rem}
.hwr-an input[type=range]{flex:1;min-width:110px;height:32px;accent-color:var(--info);margin:0}
.hwr-an output{font-family:var(--f-mono);font-weight:700;min-width:5.2em;text-align:right}
.hwr-pre{display:flex;flex-wrap:wrap;gap:6px}
.hwr-stat{margin-top:10px;padding:8px 10px;border-radius:8px;font-size:.88rem;border:1px solid var(--line);border-left:4px solid var(--power);background:var(--surface)}
.hwr-stat.warn{border-left-color:var(--accent-bg)}
.hwr-stat.bad{border-left-color:var(--danger);background:var(--danger-soft)}
.hwr-wd{margin-top:8px;font-size:.84rem;color:var(--ink-2)}
.hw-rack .hwr-cl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 10px}
.hwr-cl li{margin:0;display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:8px;background:var(--surface-2);font-size:.88rem;line-height:1.3}
.hwr-cl li > i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:.8rem}
.hwr-cl li.ok > i{background:var(--power-soft);color:var(--power)}
.hwr-cl li.no > i{background:var(--danger-soft);color:var(--danger)}
.hwr-cl small{display:block;color:var(--muted);font-size:.78rem;margin-top:1px}
.hwr-next{margin:10px 0 0;padding:8px 10px;border-radius:8px;border:1px dashed var(--line);font-size:.9rem}
.hwr-nw{white-space:nowrap}
.hwr-narrow .hwr-chmap{grid-template-columns:1fr 1fr}
.hwr-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hwr-win{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--power-soft);border:1px solid var(--power);font-weight:600}
.hwr-cap{position:sticky;bottom:10px;z-index:6;margin-top:16px;padding:9px 12px;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hwr-cap.ok{border-left-color:var(--power)}
.hwr-cap.warn{border-left-color:var(--accent-bg)}
.hwr-cap.bad{border-left-color:var(--danger)}
.hwr-caph{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:1px}
.hwr-cap p{margin:0;font-size:.93rem}
.hwr-more{display:none;align-items:center;min-height:32px;margin:-9px -8px -7px 0;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--ink);font:700 .8rem var(--f-body);cursor:pointer}
.hwr-more:hover{background:var(--surface-2)}
.hwr-narrow .hwr-cap{padding:7px 10px}
.hwr-narrow .hwr-cap.hwr-long .hwr-more{display:inline-flex}
.hwr-narrow .hwr-cap:not(.hwr-capx) p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.hwr-cap.flash{animation:hwr-flash .7s ease-out}
@keyframes hwr-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hwr-cap{bottom:calc(var(--tabbar-h) + 8px + env(safe-area-inset-bottom,0px))}}
.hwr-narrow .hwr-title{font-size:1.2rem}
.hwr-narrow .hwr-seg{width:100%}
.hwr-narrow .hwr-seg button{padding:4px 6px}
.hwr-narrow .hwr-wide{display:none}
@media (prefers-reduced-motion:reduce){.hwr-hops > li.flow .hwr-ic path{animation:none}.hwr-mod,.hwr-bar i{transition:none}.hwr-cap.flash{animation:none}}
`;
  function injectCSS() {
    if (document.getElementById('hw-rack-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-rack-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ───────────── the widget ─────────────
  LL.HW.rack = function (ph) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'hw-box hw-rack';

    // state
    let st = load();
    const restored = st.mods.some(Boolean);
    let sel = null, tab = 'di', open = null, anim = null, slow = false, timer = 0, cap = null;
    let whatIf = false, capOpen = false, pfx = '', wantReveal = false;
    const uid = 'hwr' + ++uidN;
    let vals = {};
    const initVals = () => {
      vals = {};
      DI.forEach((s, i) => (vals['di:' + i] = s.kind === 'nc' || s.kind === 'ol' ? 1 : 0));
      DQ.forEach((s, i) => (vals['dq:' + i] = 0));
      AI.forEach((s, i) => (vals['ai:' + i] = [12, 10.4, 9.3][i] || 12));
      AQ.forEach((s, i) => (vals['aq:' + i] = 40));
      vals['ser:0'] = null;
    };
    initVals();

    function load() {
      const blank = { brand: 'siemens', mods: new Array(NS).fill(null) };
      try {
        const o = JSON.parse(localStorage.getItem(STORE) || 'null');
        if (!o || !Array.isArray(o.mods)) return blank;
        const brand = BNAME[o.brand] ? o.brand : 'siemens';
        let cpu = 0;
        const mods = new Array(NS).fill(null).map((_, i) => {
          const m = o.mods[i];
          if (!m || !MT[m.t]) return null;
          if (m.t === 'CPU' && cpu++) return null;
          const T = MT[m.t];
          return { t: m.t, s: T.bytes ? clamp(Math.round(+m.s) || 0, 0, 999) : null };
        });
        return { brand, mods };
      } catch (e) { return blank; }
    }
    function save() { try { localStorage.setItem(STORE, JSON.stringify({ brand: st.brand, mods: st.mods })); } catch (e) { /* storage full or blocked */ } }

    // ───── derived data: channel assignment, conflicts, rules, power, checks ─────
    function calc() {
      const mods = st.mods, b = st.brand;
      const asg = {}, chan = {}, cnt = { PS: 0, CPU: 0, DI: 0, DQ: 0, AI: 0, AQ: 0, CM: 0 }, cards = { PS: 0, CPU: 0, DI: 0, DQ: 0, AI: 0, AQ: 0, CM: 0 };
      mods.forEach((m) => { if (m) { cnt[m.t] += MT[m.t].ch; cards[m.t]++; } });
      const missing = {};
      GR.forEach((G) => {
        let i = 0;
        for (let s = 0; s < NS; s++) {
          const m = mods[s];
          if (!m || m.t !== G.t) continue;
          chan[s] = [];
          for (let c = 0; c < MT[m.t].ch; c++) {
            if (i < G.list.length) { const k = G.g + ':' + i; asg[k] = { slot: s, ch: c }; chan[s][c] = k; i++; }
          }
        }
        missing[G.g] = G.list.length - i;
      });
      // address conflicts (not in Studio 5000: there the slot is the address)
      const conf = {};
      const addC = (s, o) => (conf[s] = conf[s] || []).push(o);
      if (b !== 'rockwell') {
        for (let a = 0; a < NS; a++) for (let c = a + 1; c < NS; c++) {
          const A = mods[a], B = mods[c];
          if (!A || !B) continue;
          const ta = MT[A.t], tb = MT[B.t];
          if (!ta.bytes || !tb.bytes || ta.area !== tb.area) continue;
          const lo = Math.max(A.s, B.s), hi = Math.min(A.s + ta.bytes, B.s + tb.bytes) - 1;
          if (lo <= hi) { addC(a, { other: c, lo, hi, area: ta.area }); addC(c, { other: a, lo, hi, area: ta.area }); }
        }
        if (b === 'codesys') mods.forEach((m, s) => { if (m && MT[m.t].word && m.s % 2) addC(s, { odd: true }); });
      }
      // rack rules
      const rules = {};
      const addR = (s, t) => (rules[s] = rules[s] || []).push(t);
      mods.forEach((m, s) => {
        if (!m) return;
        if (m.t === 'PS' && s !== 0 && !(mods[0] && mods[0].t === 'PS')) addR(s, 'The first power supply belongs in slot 0, left of the CPU.');
        if (m.t === 'CPU' && s !== 1) addR(s, 'The CPU belongs in slot 1, right of the power supply.');
        if (s === 0 && m.t !== 'PS') addR(s, 'Slot 0 is for the power supply.');
        if (s === 1 && m.t !== 'CPU') addR(s, 'Slot 1 is for the CPU.');
      });
      // power
      let supply = 0, use = 0;
      const parts = [];
      mods.forEach((m, s) => { if (!m) return; const T = MT[m.t]; if (T.supply) supply += T.supply; else { use += T.pw; parts.push({ s, t: m.t, w: T.pw }); } });
      use = Math.round(use * 10) / 10;
      const cpu = cards.CPU > 0;
      const confAny = Object.keys(conf).length > 0, rulesAny = Object.keys(rules).length > 0;
      // the address check: say WHAT is wrong (an overlap, or a word on an odd byte in CODESYS)
      const lab = (s) => MT[mods[s].t].label + ' in slot ' + s;
      const confSlots = Object.keys(conf).map(Number).sort((x, y) => x - y);
      const ovS = confSlots.find((s) => conf[s].some((c) => !c.odd)), oddS = confSlots.find((s) => conf[s].some((c) => c.odd));
      let addrD = 'Every byte is used by one module only.', addrHint = '';
      if (b === 'rockwell') addrD = 'Studio 5000: the slot is the address, no overlap possible.';
      else if (ovS != null) {
        const c = conf[ovS].find((x) => !x.odd);
        addrD = `${lab(ovS)} and ${lab(c.other)} share ${bytesTxt(c.lo, c.hi)} of the ${c.area === 'I' ? 'input' : 'output'} area.`;
        addrHint = `Select ${lab(c.other)} (red) and change its start byte, or press Auto.`;
      } else if (oddS != null) {
        addrD = `${lab(oddS)} starts on odd byte ${mods[oddS].s}: CODESYS words need an even start byte.`;
        addrHint = `Select ${lab(oddS)} and press Auto (or type an even start byte).`;
      }
      // why the CPU would be in STOP (shown in captions)
      let stopWhy = '';
      if (cpu && (confAny || rulesAny)) {
        const rs = Object.keys(rules).map(Number).sort((x, y) => x - y)[0];
        stopWhy = confAny ? (ovS != null ? 'an address overlap' : 'a word on an odd byte') : lab(rs) + ' is in the wrong place';
      }
      const rw = b === 'rockwell';
      // mission checks
      const need = (g) => GBY[g].need;
      const spareTxt = (g) => { const G = GBY[g], n = G.list.length, ch = cnt[G.t]; return ch + ' channels for ' + n + ' signals' + (ch >= n ? ' = ' + (ch - n) + ' spare' : '') + ' (need ' + need(g) + ')'; };
      const checks = [
        { ok: !!(mods[0] && mods[0].t === 'PS'), t: 'Power supply in slot 0', d: (mods[0] && mods[0].t === 'PS' ? 'It feeds the backplane.' : 'Slot 0: ' + (mods[0] ? MT[mods[0].t].label : 'empty') + '.') + (rw ? ' Real ControlLogix: the PS sits on the side and has no slot number.' : ''),
          hint: cards.PS ? 'Move the power supply to slot 0: select it in the rack and press ◀ move left.' : mods[0] ? 'Slot 0 is taken. Select that module and move it right (or remove it), then add PS 25 W.' : 'Click PS 25 W in the catalog.' },
        { ok: !!(mods[1] && mods[1].t === 'CPU'), t: 'CPU in slot 1', d: (mods[1] && mods[1].t === 'CPU' ? 'Right of the power supply.' : 'Slot 1: ' + (mods[1] ? MT[mods[1].t].label : 'empty') + '.') + (rw ? ' Real ControlLogix: the controller is usually in slot 0 (path 1,0).' : ''),
          hint: cpu ? 'Move the CPU to slot 1: select it and use ◀ move left or move right ▶.' : mods[1] ? 'Slot 1 is taken. Move that module right, then add the CPU.' : 'Click CPU in the catalog.' },
        { ok: cnt.DI >= need('di'), t: 'Digital inputs + 10 % spare', d: spareTxt('di'), hint: 'Add DI 16 cards: 18 inputs + 10 % spare need at least ' + need('di') + ' channels.' },
        { ok: cnt.DQ >= need('dq'), t: 'Digital outputs + 10 % spare', d: spareTxt('dq'), hint: 'Add a DQ 16 card: 10 outputs + 10 % spare need ' + need('dq') + ' channels.' },
        { ok: cnt.AI >= need('ai'), t: 'Enough analog inputs', d: cnt.AI + ' channels for 3 signals', hint: 'Add an AI 4 card for the 3 analog sensors.' },
        { ok: cnt.AQ >= need('aq'), t: 'Enough analog outputs', d: cnt.AQ + ' channels for 1 signal', hint: 'Add an AQ 2 card for the control valve.' },
        { ok: cards.CM > 0, t: 'Serial module for the Modbus meter', d: cards.CM ? 'CM RS-485 is in the rack.' : 'No serial port yet.', hint: 'Add a CM RS-485 for the Modbus energy meter.' },
        { ok: !confAny, t: b === 'codesys' ? 'Valid addresses (no overlap, words on even bytes)' : 'Valid addresses (no overlap)', d: addrD, hint: addrHint },
        { ok: supply > 0 && use <= supply, t: 'Power budget OK', d: supply ? use.toFixed(1) + ' W of ' + supply + ' W' : 'No power supply: 0 W.', hint: supply ? 'Too many modules for one power supply: add a second PS.' : 'Add a power supply (PS 25 W).' },
      ];
      const healthy = !confAny && !rulesAny;
      return { asg, chan, cnt, cards, missing, conf, rules, supply, use, parts, cpu, healthy, stopped: cpu && !healthy, stopWhy, checks };
    }

    // ───── addresses ─────
    function chAddr(slot, ch, brand) {
      brand = brand || st.brand;
      const m = st.mods[slot], T = MT[m.t];
      if (!T.bytes) return null;
      const io = T.area === 'I' ? 'I' : 'O';
      if (brand === 'rockwell') return 'Local:' + slot + ':' + io + (T.word ? '.Ch' + ch + 'Data' : '.Data.' + ch);
      if (T.word) {
        const b = m.s + 2 * ch;
        if (brand === 'codesys') return m.s % 2 ? null : '%' + T.area + 'W' + b / 2;
        return T.area + 'W' + b;
      }
      const by = m.s + (ch >> 3), bit = ch & 7;
      return (brand === 'codesys' ? '%' + T.area + 'X' : T.area) + by + '.' + bit;
    }
    function rangeTxt(slot, brand) {
      brand = brand || st.brand;
      const m = st.mods[slot], T = MT[m.t];
      if (!T.bytes) return '';
      if (T.word) {
        const l = [];
        for (let c = 0; c < T.ch; c++) l.push(chAddr(slot, c, brand));
        return l.indexOf(null) >= 0 ? 'no valid words (odd start byte)' : l.join(', ');
      }
      if (brand === 'rockwell') return 'Local:' + slot + ':' + (T.area === 'I' ? 'I' : 'O') + '.Data.0 … .15';
      return chAddr(slot, 0, brand) + '–' + chAddr(slot, T.ch - 1, brand);
    }
    function footTxt(slot) {
      const m = st.mods[slot], T = MT[m.t], b = st.brand;
      if (m.t === 'PS') return '→ bus';
      if (m.t === 'CPU') return 'PLC';
      if (m.t === 'CM') return 'Modbus';
      if (b === 'rockwell') return 'Local:' + slot;
      const a = T.area, s = m.s, e = s + T.bytes - 1;
      if (b === 'codesys') return T.word ? (s % 2 ? 'odd byte' : '%' + a + 'W' + s / 2 + '–' + (e - 1) / 2) : '%' + a + 'B' + s + '–' + e;
      return T.word ? a + 'W' + s + '–' + (e - 1) : a + 'B' + s + '–' + e;
    }
    const bytesTxt = (lo, hi) => (lo === hi ? 'byte ' + lo : 'bytes ' + lo + '–' + hi);
    const fv = (v) => (st.brand === 'codesys' ? (v ? 'TRUE' : 'FALSE') : v ? '1' : '0');
    // brand-specific module texts
    function descOf(t) {
      const b = st.brand;
      if (t === 'CPU' && b === 'rockwell') return 'The controller runs tasks. The I/O tags update in the background at the RPI, not at the start of the scan.';
      if (t === 'CM') return b === 'codesys' ? 'Serial module RS-485 for Modbus RTU. It has no I/O bytes on the backplane here. In CODESYS the Modbus slave in the device tree gets its own %IW addresses in its I/O Mapping tab.'
        : b === 'rockwell' ? 'Serial module RS-485 for Modbus RTU. It has no Local: I/O data here: an add-on instruction (AOI) talks to the meter and copies the values into tags.'
          : 'Serial module RS-485 for Modbus RTU. It has no I/O bytes here: the program talks to the meter with the Modbus_Master block.';
      return MT[t].desc;
    }
    const cmShort = () => (st.brand === 'codesys' ? 'It has no I/O bytes on the backplane: in CODESYS the Modbus slave gets %IW addresses in its I/O Mapping tab.'
      : st.brand === 'rockwell' ? 'It has no Local: I/O data: an add-on instruction (AOI) reads the meter.' : 'It has no I/O bytes: the program reads the meter with the Modbus_Master block.');
    // signal → address (or slot for the serial device), to show what changes when a card moves
    function addrMap() {
      const C = calc(), o = {};
      Object.keys(C.asg).forEach((k) => { const a = C.asg[k]; o[k] = grp(k) === 'ser' ? 'slot ' + a.slot : chAddr(a.slot, a.ch) || 'no address'; });
      return o;
    }
    // " The CPU is now in STOP…" when an action has just broken the hardware configuration
    const stopNews = (was, C) => (!was && C.stopped && C.supply ? ` The CPU goes to STOP (red ERROR LED): the program does not run until you fix ${C.stopWhy ? 'it (' + C.stopWhy + ')' : 'it'}.` : '');
    // the value the program sees, for the small badge in the I/O list
    function badge(k, C) {
      const g = grp(k), a = C.asg[k], dead = deadOf(C);
      if (g === 'di' || g === 'dq') {
        if (!a || dead) return { t: '—', c: '', ti: !a ? 'no channel' : DEADTXT[dead] + ': the program does not see this signal' };
        const pv = stageVal(k, g === 'di' ? 5 : 0);
        return { t: pv ? '1' : '0', c: pv ? ' on' : '', ti: 'value in the program: ' + (pv ? 1 : 0) };
      }
      if (g === 'ai') return { t: f1(vals[k]) + ' mA', c: aiBad(vals[k]) ? ' bad' : '', ti: 'current from the sensor' };
      if (g === 'aq') return !a || dead ? { t: '—', c: '', ti: !a ? 'no channel' : DEADTXT[dead] } : { t: Math.round(vals[k]) + ' %', c: '', ti: 'value from the program' };
      return null;
    }
    function freeStart(t, skip) {
      const T = MT[t];
      if (!T.bytes) return null;
      const used = [];
      st.mods.forEach((m, i) => { if (m && i !== skip && MT[m.t].bytes && MT[m.t].area === T.area) used.push([m.s, m.s + MT[m.t].bytes]); });
      for (let b = 0; b < 1000; b += T.word ? 2 : 1) if (used.every((u) => b + T.bytes <= u[0] || b >= u[1])) return b;
      return 0;
    }

    // value of signal k as seen at stage i of its path (during an animation the later stages still show the old value)
    const stageVal = (k, i) => (anim && anim.key === k && !anim.poll && i > anim.hop ? anim.prev : vals[k]);

    // ───── skeleton ─────
    root.innerHTML = `
<div class="hwr-head"><h4 class="hwr-title">Build the rack: modules, slots and I/O addresses</h4>
<div class="hwr-seg" role="group" aria-label="PLC brand">${BRANDS.map(([k, a, b]) => `<button type="button" data-act="brand" data-b="${k}" data-f="b-${k}">${a}${b ? ' <span class="hwr-wide">' + b + '</span>' : ''}</button>`).join('')}</div></div>
<p class="hwr-intro">Your machine has 33 signals. Put modules into the rack so that every signal gets a channel and an address. Then press <b>▶ test</b> in the I/O list and follow one signal from the field to the program.</p>
<div class="hwr-sec"><div class="hwr-h"><b>Catalog</b><span>Click: the module goes into the first free slot.</span></div>
<div class="hwr-cat">${ORDER.map((t) => `<button type="button" class="hwr-catb" data-act="add" data-t="${t}" data-f="add-${t}" style="--c:${MT[t].chart || MT[t].bg}" aria-label="Add ${MT[t].label}"><b>${MT[t].label}</b><small>${MT[t].sub}</small><span class="hwr-plus" aria-hidden="true">+</span></button>`).join('')}</div></div>
<div class="hwr-sec"><div class="hwr-h"><b>Rack</b><span>Slots 0–9. Click a module to see its addresses.</span></div>
<div class="hwr-rackwrap"><div class="hwr-rack"></div></div><div class="hwr-scroll">The rack is wide: swipe it sideways to see all 10 slots.</div>
<div class="hwr-detail"></div></div>
<div class="hwr-sec hwr-power"></div>
<div class="hwr-sec hwr-io"></div>
<div class="hwr-sec hwr-check"></div>
<div class="hwr-cap" role="status" aria-live="polite"><span class="hwr-k">What happened</span><p></p></div>`;
    const $ = (s) => root.querySelector(s);
    const rackEl = $('.hwr-rack'), detEl = $('.hwr-detail'), powEl = $('.hwr-power'), ioEl = $('.hwr-io'), chkEl = $('.hwr-check'), capEl = $('.hwr-cap');

    // ───── rack ─────
    function modHTML(s, m, C) {
      const T = MT[m.t];
      const probs = (C.conf[s] || []).length + (C.rules[s] || []).length;
      let body = '';
      if (m.t === 'DI' || m.t === 'DQ') {
        body = '<span class="hwr-leds">' + [0, 1].map((col) => '<span class="hwr-ledcol">' + [0, 1, 2, 3, 4, 5, 6, 7].map((r) => { const c = col * 8 + r; return `<span class="hwr-ledrow"><em>${c}</em><i class="hwr-led" data-led="${s}:${c}"></i></span>`; }).join('') + '</span>').join('') + '</span>';
      } else if (m.t === 'AI' || m.t === 'AQ') {
        body = '<span class="hwr-bars">' + Array.from({ length: T.ch }, (_, c) => `<span class="hwr-barc"><span class="hwr-bar" data-barbox="${s}:${c}"><i data-bar="${s}:${c}"></i></span><em>${c}</em></span>`).join('') + '</span><span class="hwr-tiny">4–20 mA</span>';
      } else if (m.t === 'PS') {
        body = '<span class="hwr-big">25 W</span><span class="hwr-ll"><i class="hwr-led on"></i>ON</span><span class="hwr-tiny">to the<br>backplane</span>';
      } else if (m.t === 'CPU') {
        body = '<span class="hwr-ll"><i class="hwr-led" data-cpu="run"></i>RUN</span><span class="hwr-ll"><i class="hwr-led red" data-cpu="err"></i>ERROR</span><span class="hwr-rj" aria-hidden="true"></span><span class="hwr-tiny">program</span>';
      } else if (m.t === 'CM') {
        body = '<span class="hwr-port" aria-hidden="true"></span><span class="hwr-ll"><i class="hwr-led amb" data-cm="tx"></i>TX</span><span class="hwr-ll"><i class="hwr-led amb" data-cm="rx"></i>RX</span><span class="hwr-tiny">RS-485</span>';
      }
      const strip = m.t === 'CM' ? 'CM 485' : T.label;
      return `<button type="button" class="hwr-mod hwr-t-${m.t}${sel === s ? ' hwr-sel' : ''}${probs ? ' hwr-bad' : ''}" data-act="sel" data-slot="${s}" data-f="m${s}" style="--c:${T.bg};--ci:${T.fg}" aria-label="${T.label} in slot ${s}${probs ? ' (problem)' : ''}" aria-pressed="${sel === s}">
<span class="hwr-strip">${strip}</span><span class="hwr-body">${body}</span><span class="hwr-foot">${esc(footTxt(s))}</span>${probs ? '<span class="hwr-badge" aria-hidden="true">!</span>' : ''}</button>`;
    }
    function renderRack(C) {
      let h = '<div class="hwr-rail" aria-hidden="true"></div>';
      for (let s = 0; s < NS; s++) {
        const m = st.mods[s];
        h += '<div class="hwr-slot">' + (m ? modHTML(s, m, C) : `<button type="button" class="hwr-empty" data-act="empty" data-slot="${s}" data-f="m${s}" aria-label="Slot ${s}: empty">empty</button>`) + `<span class="hwr-sn">${s}</span></div>`;
      }
      rackEl.innerHTML = h;
      rackEl.classList.toggle('hwr-nopow', !C.supply);
    }

    // ───── detail panel of the selected module ─────
    function renderDetail(C) {
      const m = sel == null ? null : st.mods[sel];
      if (!m) { detEl.className = 'hwr-detail hwr-dnone'; detEl.textContent = 'No module selected. Click a module in the rack to see its slot, its addresses and its channels.'; return; }
      detEl.className = 'hwr-detail';
      const T = MT[m.t], b = st.brand, s = sel;
      let h = `<div class="hwr-dtop"><span class="hwr-dname"><i class="hwr-sw" style="--c:${T.chart || T.bg}"></i><b>${T.label}</b> in slot ${s}</span>
<span class="hwr-dbtns"><button type="button" class="btn small" data-act="left" data-f="mv-l"${s === 0 ? ' disabled' : ''}>◀ move left</button><button type="button" class="btn small" data-act="right" data-f="mv-r"${s === NS - 1 ? ' disabled' : ''}>move right ▶</button><button type="button" class="btn small hwr-del" data-act="remove" data-f="mv-x">remove</button></span></div>
<p class="hwr-ddesc">${T.desc} Power from the backplane: ${T.supply ? '+' + T.supply + ' W (gives)' : T.pw.toFixed(1) + ' W'}.</p>`;
      (C.rules[s] || []).forEach((t) => (h += `<p class="hwr-note bad">${t} Most systems: power supply, then CPU, then I/O.</p>`));
      if (T.bytes) {
        h += `<div class="hwr-row"><span class="hwr-k">Addresses in ${BNAME[b]}</span><span class="hwr-mono">${abrk(rangeTxt(s))}</span></div>`;
        if (b === 'rockwell') {
          const k0 = C.chan[s] && C.chan[s][0], ex = k0 ? sigOf(k0).tag + ' → ' + chAddr(s, 0) : 'Start_PB → Local:2:I.Data.0';
          h += `<div class="hwr-start"><label>Start byte <input type="number" disabled value="" placeholder="—" aria-label="Start byte (not used in Studio 5000)"></label></div><p class="hwr-note">In Studio 5000 the slot is the address; you make alias tags like ${esc(ex)}.</p>`;
        } else {
          h += `<div class="hwr-start"><label>Start byte <input type="number" inputmode="numeric" min="0" max="999" step="${T.word && b === 'codesys' ? 2 : 1}" value="${m.s}" data-start data-f="start"></label><button type="button" class="btn small" data-act="setstart" data-f="setstart">Set</button><button type="button" class="btn small" data-act="autostart" data-f="autostart" title="Take the next free byte">Auto</button><span class="hwr-tiny" style="font-size:.78rem">uses ${bytesTxt(m.s, m.s + T.bytes - 1)}</span></div>`;
          (C.conf[s] || []).forEach((c) => {
            if (c.odd) h += `<p class="hwr-note bad">Start byte ${m.s} is odd. In CODESYS a word module must start on an even byte (%${T.area}W n = bytes 2n and 2n+1). Use ${m.s - 1} or ${m.s + 1}.</p>`;
            else h += `<p class="hwr-note bad">Overlap: ${bytesTxt(c.lo, c.hi)} of the ${c.area === 'I' ? 'input' : 'output'} area ${c.lo === c.hi ? 'is' : 'are'} also used by ${MT[st.mods[c.other].t].label} in slot ${c.other}. One address would mean two different wires. Change the start byte.</p>`;
          });
          if (T.word && b === 'codesys') h += `<p class="hwr-note">CODESYS counts words: %${T.area}W${m.s % 2 ? 'n' : m.s / 2} = bytes ${m.s % 2 ? '2n and 2n+1' : m.s + ' and ' + (m.s + 1)}. In Siemens, ${T.area}W${m.s} means "the word that starts at byte ${m.s}". Same bytes, different number!</p>`;
          else if (T.word) h += `<p class="hwr-note">${T.area}W${m.s} = bytes ${m.s} and ${m.s + 1}. Each channel is one word (2 bytes), so the next channel is ${T.area}W${m.s + 2}.</p>`;
        }
      }
      if (T.ch && C.chan[s]) {
        h += '<div class="hwr-chmap">';
        for (let c = 0; c < T.ch; c++) {
          const k = C.chan[s][c], a = T.bytes ? chAddr(s, c) : 'port ' + (c + 1);
          h += k ? `<span><em>ch ${c}</em><b>${abrk(a || '—')}</b><i>${esc(sigOf(k).id + ' ' + sigOf(k).d)}</i></span>` : `<span class="hwr-spare"><em>ch ${c}</em><b>${abrk(a || '—')}</b><i>spare</i></span>`;
        }
        h += '</div>';
      }
      detEl.innerHTML = h;
    }

    // ───── power budget ─────
    function renderPower(C) {
      const over = C.use > C.supply, scale = Math.max(C.supply, C.use, 1);
      let h = `<div class="hwr-h"><b>Power budget</b><span>Each power supply gives 25 W to the backplane.</span></div>
<div class="hwr-pwt"><span>Used: <b>${C.use.toFixed(1)} W</b> of <b>${C.supply} W</b></span><span class="${over ? 'hwr-no' : 'hwr-ok'}">${!C.supply && !C.use ? '' : !C.supply ? 'no power supply' : over ? 'over budget' : (C.supply - C.use).toFixed(1) + ' W left'}</span></div>
<div class="hwr-pbar${over ? ' over' : ''}" role="img" aria-label="${C.use.toFixed(1)} watt used of ${C.supply} watt">`;
      C.parts.forEach((p) => (h += `<span style="width:${(p.w / scale) * 100}%;--c:${MT[p.t].chart || MT[p.t].bg}" title="${MT[p.t].label} (slot ${p.s}): ${p.w.toFixed(1)} W"></span>`));
      if (over && C.supply) h += `<i class="hwr-pmark" style="left:${(C.supply / scale) * 100}%"></i>`;
      h += '</div><div class="hwr-plg">' + ['CPU', 'DI', 'DQ', 'AI', 'AQ', 'CM'].map((t) => `<span><i class="hwr-sw" style="--c:${MT[t].chart || MT[t].bg}"></i>${MT[t].label.replace(' RS-485', '')} ${MT[t].pw.toFixed(1)} W</span>`).join('') + '</div>';
      if (!C.supply && C.use) h += '<p class="hwr-note bad">No power supply: the backplane has 0 W. The CPU and the cards are dead (LEDs off). Add a PS 25 W in slot 0.</p>';
      else if (over) h += `<p class="hwr-note bad">Over budget: the modules need ${C.use.toFixed(1)} W, but the power supply gives only ${C.supply} W. Add a second power supply or a bigger one.</p>`;
      powEl.innerHTML = h;
    }

    // ───── I/O list + signal path ─────
    function renderIO(C) {
      const G = GBY[tab], b = st.brand;
      let h = `<div class="hwr-h"><b>I/O list of the machine</b><span>Signals fill the cards in list order, card after card in slot order.</span></div><div class="hwr-tabs" role="tablist" aria-label="Signal groups">`;
      GR.forEach((g) => (h += `<button type="button" role="tab" class="hwr-tab" data-act="tab" data-g="${g.g}" data-f="tab-${g.g}" aria-selected="${g.g === tab}">${g.tab} ${g.list.length}${C.missing[g.g] ? '<i class="hwr-tbad" title="signals without a channel"></i>' : ''}</button>`));
      h += '</div>';
      const n = G.list.length, ch = C.cnt[G.t], cards = C.cards[G.t];
      if (G.g === 'ser') {
        h += `<p class="hwr-gsum"><span>1 device on RS-485.</span>${cards ? '<span class="hwr-ok">✓ serial module in the rack</span>' : '<span class="hwr-no">✗ no serial module</span>'}</p>`;
      } else {
        const ok = ch >= G.need;
        h += `<p class="hwr-gsum"><span>${n} ${G.name} · ${ch} channels on ${cards} card${cards === 1 ? '' : 's'}</span><span class="${ok ? 'hwr-ok' : 'hwr-no'}">${ch >= n ? (ok ? '✓ ' : '✗ ') + (ch - n) + ' spare' + (n ? ' (' + Math.round(((ch - n) / n) * 100) + ' %)' : '') + (ok ? '' : ': need ' + G.need) : '✗ ' + (n - ch) + ' without a channel'}</span></p>`;
      }
      if ((G.g === 'ai' || G.g === 'aq') && b === 'codesys') h += `<p class="hwr-note" style="margin:0 0 8px">CODESYS counts words: %${G.g === 'ai' ? 'I' : 'Q'}W2 = bytes 4 and 5. In Siemens the same word is ${G.g === 'ai' ? 'I' : 'Q'}W4 ("the word that starts at byte 4").</p>`;
      h += `<div class="tbl"><table><thead><tr><th>Signal</th><th class="hwr-ctag">Tag</th><th class="hwr-ccard">Slot.ch</th><th>Address · ${BNAME[b]}</th><th class="hwr-tc">Test</th></tr></thead><tbody>`;
      G.list.forEach((S, i) => {
        const k = G.g + ':' + i, a = C.asg[k];
        let addr = '—';
        if (a) addr = G.g === 'ser' ? (b === 'siemens' ? 'no I/O address: Modbus block' : b === 'rockwell' ? 'no I/O address: module AOI' : 'no I/O address: Modbus device') : chAddr(a.slot, a.ch) || 'odd start byte!';
        const v = vals[k];
        let vtag = '';
        if (G.g === 'di' || G.g === 'dq') { const pv = stageVal(k, G.g === 'di' ? 5 : 0); vtag = `<span class="hwr-v${pv ? ' on' : ''}" title="value in the program">${pv ? 1 : 0}</span>`; }
        else if (G.g === 'ai') vtag = `<span class="hwr-v${v < 3.6 ? ' bad' : ''}">${f1(v)} mA</span>`;
        else if (G.g === 'aq') vtag = `<span class="hwr-v">${Math.round(v)} %</span>`;
        const cardTxt = a ? a.slot + '.' + a.ch : '—';
        h += `<tr class="${a ? '' : 'hwr-none'}${open === k ? ' hwr-open' : ''}"><td><span class="hwr-id">${esc(S.id)}</span>${esc(S.d)}<div class="hwr-sub">${esc(S.tag)}${a ? ' · slot ' + a.slot + ' ch ' + a.ch : ''}</div></td>
<td class="hwr-ctag hwr-mono" style="font-size:.82rem;white-space:nowrap">${esc(S.tag)}</td><td class="hwr-ccard hwr-mono">${cardTxt}</td>
<td>${a ? `<span class="hwr-addr">${abrk(addr)}</span>` : '<span class="hwr-addr">—</span><span class="hwr-nc">no channel</span>'}</td>
<td class="hwr-tc"><button type="button" class="btn small" data-act="test" data-k="${k}" data-f="t-${k}"${a ? '' : ' disabled'} aria-label="Test ${esc(S.id)} ${esc(S.d)}">▶ test</button>${vtag}</td></tr>`;
        if (open === k && a) h += `<tr class="hwr-pathrow"><td colspan="5"><div class="hwr-path" data-k="${k}"></div></td></tr>`;
      });
      h += '</tbody></table></div>';
      ioEl.innerHTML = h;
      buildPath(C);
    }

    // the path model of one signal: 6 hops with label, icon, value, state and one sentence each
    function model(k, C) {
      const g = grp(k), S = sigOf(k), a = C.asg[k], b = st.brand, A = chAddr(a.slot, a.ch), m = st.mods[a.slot], tm = termOf(k);
      const dead = !C.supply ? 'power' : !C.cpu ? 'cpu' : null;
      const deadTxt = dead === 'power' ? 'no power' : 'no CPU';
      const hops = [];
      const H = (key, ic, val, state, txt) => hops.push({ key, ic, val, state, txt });
      const prog = (tag, coil) => (b === 'siemens' ? '"' + tag + '"' : b === 'rockwell' ? (coil ? 'OTE ' : 'XIC ') + tag : tag);
      if (g === 'di') {
        const v = vals[k], on = !!v, sv = (i) => stageVal(k, i), stop = dead === 'power' ? 3 : dead === 'cpu' ? 4 : 6;
        const st0 = (i) => (i >= stop ? 'bad' : sv(i) ? 'lit' : '');
        H('Field device', S.kind, `${esc(S.id)}<small>${devState(S, sv(0))}</small>`, st0(0), devSentence(S, on));
        H('Wire', 'wire', sv(1) ? '24 V' : '0 V', st0(1) + (sv(1) ? ' flow' : ''), on ? '24 V travels along the wire to the control cabinet.' : 'The wire falls to 0 V.');
        H('Terminal', 'term', `${tm}<small>${sv(2) ? '24 V' : '0 V'}</small>`, st0(2), `The wire is screwed to terminal ${tm}. A short wire goes on to the card.`);
        H('Input card', 'card', stop <= 3 ? `ch ${a.ch}<small>slot ${a.slot} · ${deadTxt}</small>` : `ch ${a.ch}<small>slot ${a.slot} · LED ${sv(3) ? 'on' : 'off'}</small>`, st0(3),
          stop <= 3 ? 'There is no power supply: the card is dead and cannot see the signal.' : `The input card in slot ${a.slot} sees ${on ? '24 V' : '0 V'} on channel ${a.ch}: LED ${on ? 'on, the card makes a 1' : 'off, the card makes a 0'}.`);
        H(b === 'rockwell' ? 'Input tag' : 'Process image', 'pi', stop <= 4 ? `${abrk(A)}<small>${deadTxt}</small>` : `${abrk(A)}<small>= ${fv(sv(4))}</small>`, st0(4),
          stop <= 4 ? (dead === 'cpu' ? 'There is no CPU: nobody reads the card.' : 'No power, so no CPU runs and nobody reads the card.')
            : b === 'siemens' ? `At the start of the next scan the CPU copies all inputs into the process image: ${A} = ${fv(on)}.`
              : b === 'rockwell' ? `Every RPI (for example 10 ms) the card sends its data to the controller: ${A} = ${fv(on)}. Logix has no process image: tags update in the background.`
                : `At the start of the next task cycle CODESYS copies the inputs: ${A} = ${fv(on)}.`);
        H('Program', 'no', stop <= 5 ? `${brk(prog(S.tag))}<small>${deadTxt}</small>` : `${brk(prog(S.tag))}<small>contact ${sv(5) ? 'closed' : 'open'}</small>`, st0(5),
          stop <= 5 ? 'No program runs, so nothing reacts.'
            : b === 'siemens' ? `The program reads ${A} ("${S.tag}"): the NO contact ${on ? 'closes and passes power (green)' : 'opens'}.`
              : b === 'rockwell' ? `XIC ${S.tag} (an alias of ${A}) is ${on ? 'true: the rung passes power (green)' : 'false'}.`
                : `The NO contact ${S.tag} (AT ${A}) ${on ? 'closes and passes power (green)' : 'opens'}.`);
      } else if (g === 'dq') {
        const v = vals[k], on = !!v, sv = (i) => stageVal(k, i);
        const st0 = (i) => (dead ? 'bad' : sv(i) ? 'lit' : '');
        H('Program', 'coil', dead ? `${brk(prog(S.tag, 1))}<small>${deadTxt}</small>` : `${brk(prog(S.tag, 1))}<small>coil ${sv(0) ? 'on' : 'off'}</small>`, st0(0),
          dead ? (dead === 'cpu' ? 'There is no CPU, so no program runs: nothing can switch an output.' : 'There is no power supply: the CPU is dead, no program runs.')
            : b === 'siemens' ? `The program sets the coil "${S.tag}" (${A}) to ${fv(on)}.` : b === 'rockwell' ? `OTE ${S.tag} (an alias of ${A}) becomes ${on ? 'true' : 'false'}.` : `The coil ${S.tag} (AT ${A}) becomes ${fv(on)}.`);
        H(b === 'rockwell' ? 'Output tag' : 'Process image', 'pi', `${abrk(A)}<small>= ${dead ? '—' : fv(sv(1))}</small>`, st0(1),
          b === 'rockwell' ? `The output tag ${A} = ${fv(on)}. Logix sends output tags to the card every RPI.` : `The coil only writes the process image: ${A} = ${fv(on)}. The card has not changed yet.`);
        H('Output card', 'card', `ch ${a.ch}<small>slot ${a.slot} · LED ${!dead && sv(2) ? 'on' : 'off'}</small>`, st0(2),
          b === 'rockwell' ? `The card in slot ${a.slot} receives the data: channel ${a.ch} LED ${on ? 'on' : 'off'}.` : `At the end of the scan the CPU sends the output image to the card: slot ${a.slot}, channel ${a.ch}, LED ${on ? 'on' : 'off'}.`);
        H('Terminal', 'term', `${tm}<small>${!dead && sv(3) ? '24 V' : '0 V'}</small>`, st0(3), on ? `The card switches 24 V onto terminal ${tm}.` : `The card switches terminal ${tm} off (0 V).`);
        H('Wire', 'wire', !dead && sv(4) ? '24 V' : '0 V', st0(4) + (!dead && sv(4) ? ' flow' : ''), on ? '24 V travels along the wire to the field.' : 'The wire falls to 0 V.');
        H('Field device', S.kind, `${esc(S.id)}<small>${devState(S, !dead && sv(5))}</small>`, st0(5), devSentence(S, on));
      } else if (g === 'ai') {
        const mA = vals[k], an = anState(mA), eng = S.lo + ((mA - 4) / 16) * (S.hi - S.lo), raw = Math.round(((mA - 4) / 16) * 27648);
        const engT = an.wb ? 'invalid' : f1(eng) + ' ' + S.u;
        const rawT = an.wb ? (b === 'siemens' ? '32767 (error)' : raw + ' (invalid)') : String(raw);
        const deadFrom = dead === 'power' ? 3 : dead === 'cpu' ? 4 : 9;
        const stt = (i) => (i >= deadFrom ? 'bad' : an.wb && i >= 1 ? 'bad' : an.cls !== 'ok' && i >= 1 ? 'warn' : 'lit');
        H('Transmitter', 'tx', `${esc(S.id)}<small>${an.wb ? '? → ' : f1(eng) + ' ' + S.u + ' → '}${f1(mA)} mA</small>`, 'lit', `The transmitter ${S.id} measures the ${S.d} and sends a current: 4 mA = ${S.lo} ${S.u}, 20 mA = ${S.hi} ${S.u}.`);
        H('Wire', 'wire', `${f1(mA)} mA`, stt(1) + (mA > 0.2 ? ' flow' : ''), 'The current flows in a loop through the wire. Long wires and noise do not change a current, so 4–20 mA is robust.');
        H('Terminal', 'term', tm, stt(2), `The wire is screwed to terminal ${tm}.`);
        H('Input card', 'card', dead === 'power' ? `ch ${a.ch}<small>slot ${a.slot} · ${deadTxt}</small>` : `ch ${a.ch}<small>slot ${a.slot} · ${b === 'rockwell' ? 'scaled ' + engT : 'raw ' + rawT}</small>`, stt(3),
          b === 'rockwell' ? `The card in slot ${a.slot} converts AND scales the current: in the module properties you set 4 mA = ${S.lo}, 20 mA = ${S.hi}.` : `The card in slot ${a.slot}, channel ${a.ch}, turns the current into a number: 4 mA = 0, 20 mA = 27648.`);
        H(b === 'rockwell' ? 'Input tag' : 'Process image', 'pi', `${abrk(A || 'odd byte!')}<small>= ${dead ? deadTxt : b === 'rockwell' ? (an.wb ? 'Ch' + a.ch + 'Fault = 1' : f1(eng)) : rawT}</small>`, stt(4),
          b === 'siemens' ? `The CPU copies it into the process image: ${A} (one word = 2 bytes: bytes ${m.s + 2 * a.ch} and ${m.s + 2 * a.ch + 1}).`
            : b === 'rockwell' ? `The controller tag ${A} holds the value as a REAL (a number with decimals).`
              : `It appears as ${A || '(no valid word)'}. CODESYS counts words: this word is bytes ${m.s + 2 * a.ch} and ${m.s + 2 * a.ch + 1}.`);
        H('Program', 'fb', `${brk(S.tag)}<small>= ${dead ? deadTxt : engT}</small>`, stt(5),
          b === 'siemens' ? `The program scales it: NORM_X (0…27648 → 0.0…1.0), then SCALE_X (→ ${S.lo}…${S.hi} ${S.u}).`
            : b === 'rockwell' ? `The program uses ${S.tag} directly: the module already did the scaling.`
              : `Your code scales it: ${S.tag} := raw / 27648 × ${S.hi - S.lo}${S.lo ? ' + ' + S.lo : ''}.`);
        return { hops, an, mA, eng, raw, rawT, engT };
      } else if (g === 'aq') {
        const pct = vals[k], raw = Math.round((pct / 100) * 27648), mA = 4 + pct * 0.16;
        const stt = () => (dead ? 'bad' : 'lit');
        H('Program', 'fb', `${brk(S.tag)}<small>= ${Math.round(pct)} %</small>`, stt(),
          dead ? (dead === 'cpu' ? 'There is no CPU: no program runs, the output stays off.' : 'There is no power supply: no program runs.')
            : b === 'siemens' ? `The program decides the valve position (${Math.round(pct)} %) and scales it to 0…27648 with NORM_X + SCALE_X.`
              : b === 'rockwell' ? `The program writes the position in % straight into the output tag: the module does the scaling.`
                : `Your code scales the position: raw := position / 100 × 27648.`);
        H(b === 'rockwell' ? 'Output tag' : 'Process image', 'pi', `${abrk(A || 'odd byte!')}<small>= ${dead ? '—' : b === 'rockwell' ? f1(pct) : raw}</small>`, stt(), `The value goes into the output ${b === 'rockwell' ? 'tag' : 'image'}: ${A || '(no valid word)'}.`);
        H('Output card', 'card', `ch ${a.ch}<small>slot ${a.slot} · ${dead ? '0 mA' : f1(mA) + ' mA'}</small>`, stt(),
          b === 'rockwell' ? `The card in slot ${a.slot} turns 0.0…100.0 into 4…20 mA.` : `At the end of the scan the card gets the number and makes a current: 0 = 4 mA, 27648 = 20 mA.`);
        H('Terminal', 'term', tm, stt(), `The current leaves the card on terminal ${tm}.`);
        H('Wire', 'wire', dead ? '0 mA' : f1(mA) + ' mA', stt() + (dead ? '' : ' flow'), 'It flows through the wire to the valve positioner.');
        H('Control valve', 'valve', `${esc(S.id)}<small>${dead ? 'closed' : 'open ' + Math.round(pct) + ' %'}</small>`, stt(), `The control valve ${S.id} opens to ${Math.round(pct)} %.`);
        return { hops, pct, raw, mA };
      } else {
        const hop = anim && anim.key === k ? anim.hop : vals[k] == null ? -1 : 6, kw = vals[k];
        const stt = (i) => (dead ? 'bad' : i <= hop ? 'lit' : '') + (anim && anim.key === k && (i === 2 || i === 4) && i === hop ? ' flow' : '');
        const data = b === 'siemens' ? '"Meter".Power' : b === 'rockwell' ? 'Meter_Power' : 'Meter.Power';
        H('Program', 'fb', b === 'siemens' ? 'Modbus_<wbr>Master<small>read 2 registers</small>' : b === 'rockwell' ? 'AOI<small>read 2 registers</small>' : 'Modbus master<small>read 2 registers</small>', stt(0),
          dead ? 'No CPU runs (no power or no CPU): nobody asks the meter.' : b === 'siemens' ? 'The program calls Modbus_Master: "slave 1, read 2 registers".' : b === 'rockwell' ? 'The program triggers the serial module with its add-on instruction: "slave 1, read 2 registers".' : 'The Modbus master in the device tree sends its next request: "slave 1, read 2 registers".');
        H('CM card', 'card', `slot ${a.slot}<small>${hop >= 1 && hop <= 2 ? 'TX' : hop === 4 ? 'RX' : 'port 1'}</small>`, stt(1), `The CM in slot ${a.slot} turns the request into bytes on RS-485 (TX LED blinks).`);
        H('RS-485', 'pair', 'request →', stt(2), 'The bytes travel on the 2-wire RS-485 line to the meter.');
        H('Meter', 'meter', `${esc(S.id)}<small>address 1</small>`, stt(3), 'The energy meter (address 1) hears its address and answers with the register values.');
        H('RS-485', 'pair', '← answer', stt(4), 'The answer comes back. The RX LED blinks and the CRC check says the bytes are good.');
        H('Data', 'pi', `${brk(data)}<small>= ${hop >= 5 && kw != null ? f1(kw) + ' kW' : '…'}</small>`, stt(5), `The value lands in ${data}. Serial data never goes through the process image.`);
      }
      return { hops };
    }
    function devState(S, v) {
      return ({ pb: v ? 'pressed' : 'released', nc: v ? 'released (NC)' : 'pressed', sel: v ? 'AUTO' : 'MAN', sen: v ? 'detects' : 'nothing', ol: v ? 'OK' : 'tripped', aux: v ? 'closed' : 'open',
        k: v ? 'pulled in' : 'off', y: v ? 'energised' : 'off', lamp: v ? 'lit' : 'off', horn: v ? 'sounding' : 'quiet' })[S.kind] || (v ? 'on' : 'off');
    }
    function devSentence(S, on) {
      const id = S.id;
      switch (S.kind) {
        case 'pb': return on ? `${id} is pressed: its contact closes and lets 24 V through.` : `${id} is released: its contact opens.`;
        case 'nc': return on ? `${id} is released: its NC contact is closed and gives 24 V.` : `${id} is pressed: its NC contact opens, 0 V.`;
        case 'sel': return on ? `${id} is turned to AUTO: its contact closes, 24 V.` : `${id} is turned to MAN: its contact opens.`;
        case 'sen': return on ? `Sensor ${id} detects (${S.d}): it switches 24 V on.` : `Sensor ${id} detects nothing: it switches the 24 V off.`;
        case 'ol': return on ? `Overload relay ${id} is OK: its NC contact is closed, 24 V.` : `Overload relay ${id} has tripped (motor too hot): its contact opens.`;
        case 'aux': return on ? 'Contactor -K1 has pulled in: its auxiliary contact closes, 24 V.' : 'Contactor -K1 has dropped out: its auxiliary contact opens.';
        case 'k': return on ? 'Contactor -K1 pulls in: the motor runs.' : 'Contactor -K1 drops out: the motor stops.';
        case 'y': return on ? `Valve coil ${id} gets 24 V: the valve switches and air moves.` : `Valve coil ${id} has no voltage: a spring pushes the valve back.`;
        case 'lamp': return on ? `Lamp ${id} lights.` : `Lamp ${id} goes out.`;
        case 'horn': return on ? `Horn ${id} sounds.` : `Horn ${id} stops.`;
      }
      return '';
    }
    function anState(mA) {
      if (mA < 3.6) return { cls: 'bad', wb: true, t: 'Below 3.6 mA = wire break. The value is not valid: the program must raise an alarm and not use it.' };
      if (mA < 4) return { cls: 'warn', t: 'Under range (3.6–4 mA): a little below zero. Small drift is normal, but check the sensor.' };
      if (mA <= 20) return { cls: 'ok', t: 'Normal range: 4–20 mA.' };
      if (mA <= 21) return { cls: 'warn', t: 'Over range (20–21 mA): above the top of the scale.' };
      return { cls: 'bad', t: 'Above 21 mA = sensor fault or short circuit.' };
    }

    function buildPath(C) {
      const box = ioEl.querySelector('.hwr-path');
      if (!box) return;
      const k = box.dataset.k, g = grp(k), S = sigOf(k);
      let h = `<div class="hwr-ph"><b>Signal path: ${esc(S.id)} ${esc(S.d)}</b><span class="hwr-ctl">`;
      if (g === 'di' || g === 'dq' || g === 'ser') h += `<button type="button" class="btn small" data-act="test" data-k="${k}" data-f="again">${g === 'ser' ? '▶ ask again' : '▶ test again'}</button><button type="button" class="btn small" data-act="slow" data-f="slow" aria-pressed="${slow}">Slow motion</button>`;
      h += `<button type="button" class="btn small ghost" data-act="close" data-f="close" aria-label="Close the signal path">✕ close</button></span></div>`;
      if (g === 'ai') {
        h += `<div class="hwr-an"><label>Current <input type="range" min="0" max="22" step="0.1" value="${vals[k]}" data-slide="${k}" aria-label="Current in mA"><output>${f1(vals[k])} mA</output></label><span class="hwr-pre">${[0, 4, 12, 20, 22].map((x) => `<button type="button" class="btn small" data-act="preset" data-v="${x}" data-f="pre-${x}">${x} mA</button>`).join('')}</span></div>`;
      } else if (g === 'aq') {
        h += `<div class="hwr-an"><label>Program value <input type="range" min="0" max="100" step="1" value="${vals[k]}" data-slide="${k}" aria-label="Valve position in percent"><output>${Math.round(vals[k])} %</output></label><span class="hwr-pre">${[0, 50, 100].map((x) => `<button type="button" class="btn small" data-act="preset" data-v="${x}" data-f="pre-${x}">${x} %</button>`).join('')}</span></div>`;
      }
      h += '<div class="hwr-live"></div>';
      box.innerHTML = h;
      paintPath(C);
    }
    function paintPath(C) {
      const box = ioEl.querySelector('.hwr-path');
      if (!box) return;
      C = C || calc();
      const k = box.dataset.k, g = grp(k);
      if (!C.asg[k]) return;
      const M = model(k, C), hop = anim && anim.key === k ? anim.hop : 99;
      let h = '<ol class="hwr-hops">' + M.hops.map((x, i) => `<li class="${x.state}${i === hop ? ' cur' : ''}">${icon(x.ic)}<span class="hwr-hk">${x.key}</span><span class="hwr-hv">${x.val}</span><span class="hwr-hs">${nw(x.txt)}</span></li>`).join('') + '</ol>';
      if (g === 'di' || g === 'dq') h += piStrip(k, C);
      if (g === 'ai') h += `<div class="hwr-stat ${M.an.cls}">${M.an.t}${M.an.wb ? (st.brand === 'siemens' ? ' The card sends the error value 32767 (16#7FFF).' : st.brand === 'rockwell' ? ' The module sets Ch' + C.asg[k].ch + 'Fault = 1.' : ' The card sets its error (diagnostic) bit.') : ''}</div>`;
      if (g === 'ai' || g === 'aq') {
        const a = C.asg[k], m = st.mods[a.slot], A = chAddr(a.slot, a.ch);
        if (st.brand !== 'rockwell' && A) h += `<p class="hwr-wd">One analog value = one word = 2 bytes: <b class="hwr-mono">${A}</b> uses bytes ${m.s + 2 * a.ch} and ${m.s + 2 * a.ch + 1}${st.brand === 'codesys' ? ' (Siemens would call it ' + MT[m.t].area + 'W' + (m.s + 2 * a.ch) + ')' : ''}.</p>`;
      }
      h += '<ol class="hwr-steps">' + M.hops.map((x, i) => `<li class="${i < hop ? 'done' : i === hop ? 'cur' : hop === 99 ? 'done' : ''}">${nw(x.txt)}</li>`).join('') + '</ol>';
      box.querySelector('.hwr-live').innerHTML = h;
      const out = box.querySelector('output');
      if (out) out.textContent = g === 'ai' ? f1(vals[k]) + ' mA' : Math.round(vals[k]) + ' %';
    }
    function piStrip(k, C) {
      const a = C.asg[k], m = st.mods[a.slot], T = MT[m.t], b = st.brand, stage = T.area === 'I' ? 4 : 1;
      const dead = !C.supply || !C.cpu;
      const lab = b === 'rockwell' ? (T.area === 'I' ? 'Input tag' : 'Output tag') + ' Local:' + a.slot + ':' + (T.area === 'I' ? 'I' : 'O') + '.Data' : 'Process image, ' + (T.area === 'I' ? 'inputs' : 'outputs');
      let h = `<div class="hwr-pi${dead ? ' dim' : ''}"><span class="hwr-k">${esc(lab)}</span>`;
      for (let by = 0; by < 2; by++) {
        const bl = b === 'rockwell' ? 'bits ' + (by * 8 + 7) + '…' + by * 8 : (b === 'codesys' ? '%' : '') + T.area + 'B' + (m.s + by);
        h += `<span class="hwr-byte"><b>${bl}</b><span class="hwr-bits">`;
        for (let bit = 7; bit >= 0; bit--) {
          const c = by * 8 + bit, kk = C.chan[a.slot] && C.chan[a.slot][c], on = !dead && kk ? stageVal(kk, stage) : 0;
          h += `<i class="${on ? 'on' : ''}${c === a.ch ? ' me' : ''}" title="channel ${c}${kk ? ': ' + esc(sigOf(kk).id) : ' (spare)'}">${b === 'rockwell' ? c : bit}</i>`;
        }
        h += '</span></span>';
      }
      return h + '</div>';
    }

    // ───── live LEDs and bars in the rack ─────
    function paintLive(C) {
      C = C || calc();
      root.querySelectorAll('[data-led]').forEach((el) => {
        const p = el.dataset.led.split(':'), s = +p[0], c = +p[1], k = C.chan[s] && C.chan[s][c];
        const g = k ? grp(k) : '';
        const on = k && C.supply && (g === 'di' || C.cpu) ? stageVal(k, g === 'di' ? 3 : 2) : 0;
        el.classList.toggle('on', !!on);
        el.classList.toggle('me', !!k && k === open);
      });
      root.querySelectorAll('[data-bar]').forEach((el) => {
        const p = el.dataset.bar.split(':'), s = +p[0], c = +p[1], k = C.chan[s] && C.chan[s][c];
        let hgt = 0, bad = false;
        if (k && C.supply) {
          if (grp(k) === 'ai') { hgt = vals[k] / 22; bad = vals[k] < 3.6; } else if (C.cpu) hgt = (4 + vals[k] * 0.16) / 22;
        }
        el.style.height = clamp(hgt, 0, 1) * 100 + '%';
        el.classList.toggle('bad', bad);
        el.parentNode.classList.toggle('me', !!k && k === open);
      });
      root.querySelectorAll('[data-cpu]').forEach((el) => el.classList.toggle('on', !!C.supply && (el.dataset.cpu === 'run' ? C.healthy : !C.healthy)));
      root.querySelectorAll('[data-cm]').forEach((el) => {
        const busy = anim && anim.poll && C.supply && C.cpu;
        el.classList.toggle('on', !!busy && (el.dataset.cm === 'tx' ? anim.hop >= 1 && anim.hop <= 2 : anim.hop === 4));
      });
    }

    // ───── checklist ─────
    function renderCheck(C) {
      const okN = C.checks.filter((c) => c.ok).length, all = okN === C.checks.length;
      let h = `<div class="hwr-h"><b>Mission checklist <span class="chip${all ? ' ok' : ''}" style="font-family:var(--f-body);letter-spacing:0;text-transform:none;margin-left:6px">${okN} / ${C.checks.length}</span></b><button type="button" class="btn small" data-act="reset" data-f="reset">Reset (empty rack)</button></div><ul class="hwr-cl">`;
      C.checks.forEach((c) => (h += `<li class="${c.ok ? 'ok' : 'no'}"><i aria-hidden="true">${c.ok ? '✓' : '✗'}</i><span><b>${c.t}</b><span class="hwr-sr">${c.ok ? ' done' : ' not yet'}</span><small>${esc(c.d)}</small></span></li>`));
      h += '</ul>';
      const next = C.checks.find((c) => !c.ok);
      h += all ? '<p class="hwr-win">Mission complete! Every signal has a card, a channel and an address, with spare channels for later changes. Now press ▶ test in the I/O list, or switch the brand: same rack, different addresses.</p>' : `<p class="hwr-next"><b>Next:</b> ${esc(next.hint)}</p>`;
      chkEl.innerHTML = h;
      return all;
    }

    // ───── caption ─────
    function say(text, kind) {
      cap = { text, kind: kind || 'info' };
      capEl.className = 'hwr-cap ' + cap.kind;
      capEl.querySelector('p').innerHTML = nw(text);
      void capEl.offsetWidth; // restart the flash animation
      capEl.classList.add('flash');
    }

    // ───── render everything (keeps keyboard focus on the same control) ─────
    let wasDone = false;
    function renderAll(keepIO) {
      const a = document.activeElement, fkey = a && root.contains(a) ? a.getAttribute('data-f') : null;
      const C = calc();
      if (open && !C.asg[open]) { open = null; stopAnim(); }
      st.mods.forEach((m, s) => { if (!m && sel === s) sel = null; });
      root.querySelectorAll('[data-act="brand"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.b === st.brand)));
      renderRack(C);
      renderDetail(C);
      renderPower(C);
      if (!keepIO) renderIO(C);
      const done = renderCheck(C);
      paintLive(C);
      save();
      if (fkey) { const n = root.querySelector('[data-f="' + fkey + '"]'); if (n && !n.disabled) n.focus({ preventScroll: true }); }
      const fresh = done && !wasDone;
      wasDone = done;
      return { C, fresh };
    }
    const WIN = ' Mission complete: every check is green!';

    // ───── animation of one signal, hop by hop ─────
    function stopAnim() { clearTimeout(timer); anim = null; }
    function tick() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!root.isConnected || !anim) { anim = null; return; }
        anim.hop++;
        const C = calc();
        if (anim.hop >= 6) {
          const k = anim.key;
          anim = null;
          paintPath(C); paintLive(C); refreshRow(k, C);
          say(summary(k, C), 'ok');
          return;
        }
        paintPath(C); paintLive(C);
        const M = model(anim.key, C);
        say('Step ' + (anim.hop + 1) + ' of 6: ' + M.hops[anim.hop].txt, 'info');
        tick();
      }, slow ? 1300 : 250);
    }
    function refreshRow(k, C) {
      const btn = ioEl.querySelector('[data-act="test"][data-k="' + k + '"]:not([data-f="again"])');
      const v = btn && btn.parentNode.querySelector('.hwr-v');
      if (v && (grp(k) === 'di' || grp(k) === 'dq')) { v.textContent = vals[k] ? '1' : '0'; v.classList.toggle('on', !!vals[k]); }
      if (v && grp(k) === 'ai') { v.textContent = f1(vals[k]) + ' mA'; v.classList.toggle('bad', vals[k] < 3.6); }
      if (v && grp(k) === 'aq') v.textContent = Math.round(vals[k]) + ' %';
    }
    function summary(k, C) {
      const g = grp(k), S = sigOf(k), a = C.asg[k], A = chAddr(a.slot, a.ch), m = st.mods[a.slot], b = st.brand, on = !!vals[k], tm = termOf(k);
      if (!C.supply) return `The signal stopped at the card: the rack has no power supply. Add a PS 25 W in slot 0.`;
      if (g === 'di') {
        if (!C.cpu) return `${S.id} reached the card (LED ${on ? 'on' : 'off'}), but there is no CPU to read it. Add a CPU in slot 1.`;
        const ph = ({ pb: on ? 'is pressed' : 'is released', nc: on ? 'is not pressed' : 'is pressed', sel: on ? 'is in AUTO' : 'is in MAN', sen: on ? 'switches on' : 'switches off', ol: on ? 'is OK' : 'has tripped', aux: on ? 'is closed' : 'is open' })[S.kind];
        let t = `${S.id} ${ph}, so ${A} = ${fv(on)}. `;
        t += b === 'rockwell' ? `Why ${A}? The card is in slot ${a.slot} and the wire is on channel ${a.ch}: move the card and the address changes.` : `Why ${A}? The card in slot ${a.slot} starts at byte ${m.s}: channel ${a.ch} is byte ${m.s + (a.ch >> 3)}, bit ${a.ch & 7}.`;
        if (S.kind === 'nc') t += ' STOP is wired NC: 1 = not pressed, so a broken wire also stops the machine (fail-safe).';
        if (S.kind === 'ol') t += ' -F1 is wired NC too: a broken wire looks like a trip, which is safe.';
        if (C.conf[a.slot]) t += ' Warning: this address is also used by another module!';
        return t;
      }
      if (g === 'dq') {
        let t = `${S.tag} = ${fv(on)} → ${A} → slot ${a.slot} ch ${a.ch} → ${tm} → ${S.id} ${devState(S, on)}. `;
        t += b === 'rockwell' ? 'Logix sends output tags to the card every RPI.' : 'Outputs change only when the CPU writes the output image, at the end of the scan.';
        if (C.conf[a.slot]) t += ' Warning: this address is also used by another module!';
        return t;
      }
      if (g === 'ser') return `The meter answered: ${f1(vals[k])} kW. Serial data has no I/O address: it comes through the CM in slot ${a.slot} and a Modbus block, a few times per second, not every scan.`;
      return '';
    }
    function run(k) {
      const C = calc(), g = grp(k);
      if (!C.asg[k]) return;
      if (anim) { const old = anim.key; stopAnim(); refreshRow(old, C); }
      const S = sigOf(k), a = C.asg[k];
      if (g === 'ai' || g === 'aq') {
        if (open === k) { open = null; renderIO(C); paintLive(C); say(`Closed the path of ${S.id}.`); return; }
        open = k; renderIO(C); paintLive(C);
        const M = model(k, C);
        say(g === 'ai' ? `${S.id} is on AI card slot ${a.slot}, channel ${a.ch}: ${f1(M.mA)} mA → ${st.brand === 'rockwell' ? M.engT : 'raw ' + M.rawT} → ${M.engT}. Move the slider to change the current.` : `${S.id} is on AQ card slot ${a.slot}, channel ${a.ch}: ${Math.round(M.pct)} % → ${M.mA.toFixed(1)} mA. Move the slider: it is the value your program writes.`);
        return;
      }
      open = k;
      if (g === 'dq' && (!C.supply || !C.cpu)) { renderIO(C); paintLive(C); say(!C.supply ? 'Nothing happens: there is no power supply, so no CPU runs and no output can switch.' : 'Nothing happens: there is no CPU, so no program runs and no output can switch.', 'bad'); return; }
      if (g === 'ser') {
        if (!C.supply || !C.cpu) { renderIO(C); paintLive(C); say('Nothing happens: without ' + (!C.supply ? 'power' : 'a CPU') + ' nobody asks the meter.', 'bad'); return; }
        vals[k] = 8 + Math.round(Math.random() * 80) / 10;
        anim = { key: k, hop: 0, poll: true };
      } else {
        const prev = vals[k];
        vals[k] = prev ? 0 : 1;
        anim = { key: k, hop: 0, prev };
      }
      renderIO(C); paintLive(C);
      say('Step 1 of 6: ' + model(k, C).hops[0].txt, 'info');
      tick();
    }

    // ───── actions ─────
    function addrSentence(s) {
      const m = st.mods[s], T = MT[m.t], what = T.area === 'I' ? 'its inputs are' : 'its outputs are';
      if (st.brand === 'rockwell') return `the slot is the address: ${what} ${rangeTxt(s)}.`;
      return `it got start byte ${m.s}, so ${what} ${rangeTxt(s)}.`;
    }
    function add(t) {
      const T = MT[t];
      if (t === 'CPU' && st.mods.some((m) => m && m.t === 'CPU')) return say('A rack has only one CPU. One CPU runs one program and owns all the cards in the rack.', 'warn');
      const s = st.mods.indexOf(null);
      if (s < 0) return say('The rack is full: all 10 slots are used. Remove a module first.', 'warn');
      st.mods[s] = { t, s: T.bytes ? freeStart(t, -1) : null };
      sel = s;
      if (T.g) tab = T.g;
      const r = renderAll();
      let txt;
      if (t === 'PS') txt = s === 0 ? 'Power supply in slot 0. It must be left of the CPU: it feeds the backplane that powers the CPU and all cards.' : st.mods[0] && st.mods[0].t === 'PS' ? `Second power supply in slot ${s}: it adds 25 W for more modules.` : `Power supply in slot ${s}. It belongs in slot 0, left of the CPU: move it there.`;
      else if (t === 'CPU') txt = s === 1 ? 'CPU in slot 1, right of the power supply. The I/O cards go on its right.' : `CPU in slot ${s}. It should be in slot 1: power supply, then CPU, then I/O.`;
      else if (t === 'CM') txt = `CM RS-485 in slot ${s}: a serial port for the Modbus energy meter. It has no I/O bytes: the program reads the meter with Modbus blocks.`;
      else txt = `${T.label} in slot ${s}: ${addrSentence(s)}`;
      if (s < 2 && !((s === 0 && t === 'PS') || (s === 1 && t === 'CPU'))) txt += ` Careful: slot ${s} is for the ${s ? 'CPU' : 'power supply'}. Use ◀ ▶ to move modules.`;
      say(txt + (r.fresh ? WIN : ''), r.fresh ? 'ok' : s < 2 && !((s === 0 && t === 'PS') || (s === 1 && t === 'CPU')) ? 'warn' : 'info');
    }
    function move(dir) {
      const s = sel, d = s + dir;
      if (s == null || d < 0 || d >= NS) return;
      const m = st.mods[s], other = st.mods[d], T = MT[m.t], b = st.brand;
      st.mods[d] = m; st.mods[s] = other; sel = d;
      const r = renderAll();
      let txt = `You moved ${T.label} from slot ${s} to slot ${d}${other ? ' (it swapped places with ' + MT[other.t].label + ')' : ''}.`;
      if (T.bytes) {
        txt += b === 'rockwell' ? ` In Studio 5000 the slot is the address: Local:${s} became Local:${d}. Alias tags must point to the new slot!` : ` Its addresses stay ${rangeTxt(d)}: in ${BNAME[b]} the start byte belongs to the module, not to the slot.`;
        if (other && other.t === m.t) txt += ' Two cards of the same type swapped, so the signals moved to the other card (they fill the cards in slot order).';
      }
      const bad = r.C.rules[d];
      if (bad) txt += ' ' + bad[0];
      say(txt + (r.fresh ? WIN : ''), r.fresh ? 'ok' : bad ? 'warn' : 'info');
    }
    function remove() {
      if (sel == null || !st.mods[sel]) return;
      const s = sel, m = st.mods[s], T = MT[m.t], before = calc();
      st.mods[s] = null; sel = null;
      const r = renderAll();
      let txt = `You removed ${T.label} from slot ${s}.`;
      if (m.t === 'PS' && !r.C.supply) txt += ' No power supply now: the backplane has no power, the CPU and the cards go dark.';
      else if (m.t === 'CPU') txt += ' No CPU now: no program runs and nobody reads or writes the cards.';
      else if (T.g) { const lost = r.C.missing[T.g] - before.missing[T.g]; if (lost > 0) txt += ` ${lost} signal${lost > 1 ? 's have' : ' has'} no channel now (red in the I/O list).`; }
      say(txt, 'warn');
    }
    function setStart(val, auto) {
      const s = sel, m = s == null ? null : st.mods[s];
      if (!m || !MT[m.t].bytes || st.brand === 'rockwell') return;
      const T = MT[m.t], v = auto ? freeStart(m.t, s) : Number(val);
      if (!auto && (String(val).trim() === '' || !Number.isInteger(v) || v < 0 || v > 999)) return say('Type a whole number from 0 to 999 for the start byte.', 'warn');
      if (T.word && v % 2 && st.brand === 'codesys') return say(`In CODESYS a word module must start on an even byte: %${T.area}W n = bytes 2n and 2n+1. Byte ${v} is in the middle of a word. Try ${v - 1} or ${v + 1}.`, 'bad');
      const old = m.s;
      m.s = v;
      const r = renderAll(), conf = r.C.conf[s];
      if (conf && conf.length && !conf[0].odd) {
        const c = conf[0];
        return say(`Overlap! ${T.label} in slot ${s} and ${MT[st.mods[c.other].t].label} in slot ${c.other} both use ${bytesTxt(c.lo, c.hi)}. One address would mean two different wires: choose a free start byte, or press Auto.`, 'bad');
      }
      if (v === old) return say(`${T.label} already starts at byte ${v}: ${rangeTxt(s)}.`);
      let txt = `You moved ${T.label} to start at byte ${v}: its ${T.area === 'I' ? 'inputs' : 'outputs'} are now ${rangeTxt(s)} — the program must use the new addresses!`;
      if (T.word && v % 2) txt += ' Siemens accepts an odd start byte, but CODESYS would not (words must start on an even byte).';
      say(txt + (r.fresh ? WIN : ''), r.fresh ? 'ok' : 'warn');
    }
    function setBrand(bk) {
      if (!BNAME[bk] || bk === st.brand) return;
      st.brand = bk;
      const r = renderAll();
      const txt = {
        siemens: 'Siemens TIA: every I/O module gets a start byte. Bits are I byte.bit (I0.3); words are IW + start byte (IW4). You can change the start byte.',
        rockwell: 'Rockwell Studio 5000: no byte numbers. The slot is the address: Local:2:I.Data.3 = slot 2, channel 3. You give it a good name with an alias tag.',
        codesys: 'CODESYS: bits are %IX byte.bit (%IX0.3). Words are counted BY WORD: %IW2 = bytes 4 and 5 (Siemens calls the same word IW4).',
      }[bk];
      say(txt + (r.fresh ? WIN : ''), r.fresh ? 'ok' : 'info');
    }
    function reset() {
      stopAnim();
      try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
      st = { brand: st.brand, mods: new Array(NS).fill(null) };
      sel = null; open = null; tab = 'di'; wasDone = false;
      initVals();
      renderAll();
      try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
      say('Empty rack. Start with the power supply: click PS 25 W in the catalog.', 'info');
    }
    function slide(k, v) {
      vals[k] = +v;
      const C = calc();
      paintPath(C); paintLive(C); refreshRow(k, C);
      const M = model(k, C), S = sigOf(k);
      if (grp(k) === 'ai') say(`${f1(M.mA)} mA → ${st.brand === 'rockwell' ? 'the module scales it' : 'raw ' + M.rawT} → ${S.tag} = ${M.engT}. ${M.an.t}`, M.an.cls === 'ok' ? 'info' : M.an.cls);
      else say(`${S.tag} = ${Math.round(M.pct)} % → ${st.brand === 'rockwell' ? chAddr(C.asg[k].slot, C.asg[k].ch) + ' = ' + f1(M.pct) : 'raw ' + M.raw} → ${M.mA.toFixed(1)} mA → the valve opens ${Math.round(M.pct)} %.`, 'info');
    }

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !root.contains(b) || b.disabled) return;
      const act = b.dataset.act;
      if (act === 'brand') setBrand(b.dataset.b);
      else if (act === 'add') add(b.dataset.t);
      else if (act === 'sel') {
        const s = +b.dataset.slot, m = st.mods[s];
        if (sel === s) { sel = null; renderAll(true); return say(`${MT[m.t].label} deselected.`); }
        sel = s;
        if (MT[m.t].g) tab = MT[m.t].g;
        const r = renderAll();
        const T = MT[m.t];
        let txt = `${T.label} in slot ${s}. ` + (T.bytes ? (st.brand === 'rockwell' ? 'The slot is the address: ' + rangeTxt(s) + '.' : 'Start byte ' + m.s + ': ' + rangeTxt(s) + '.') : T.desc.split('. ')[0] + '.');
        const pr = (r.C.rules[s] || [])[0];
        if (pr) txt += ' ' + pr;
        say(txt, pr || r.C.conf[s] ? 'warn' : 'info');
      } else if (act === 'empty') {
        const s = +b.dataset.slot, free = st.mods.indexOf(null);
        sel = null; renderAll(true);
        say(`Slot ${s} is empty. The catalog puts a new module into the first free slot (now slot ${free}).`);
      } else if (act === 'left') move(-1);
      else if (act === 'right') move(1);
      else if (act === 'remove') remove();
      else if (act === 'setstart') { const i = root.querySelector('[data-start]'); setStart(i ? i.value : ''); }
      else if (act === 'autostart') setStart(0, true);
      else if (act === 'tab') { tab = b.dataset.g; renderIO(calc()); const n = root.querySelector('[data-f="tab-' + tab + '"]'); if (n) n.focus({ preventScroll: true }); const G = GBY[tab]; say(`I/O list: ${G.list.length} ${G.name}. Press ▶ test on a row to follow ${G.g === 'ser' ? 'the Modbus request' : 'the signal'}.`); }
      else if (act === 'test') { const fk = b.getAttribute('data-f'); run(b.dataset.k); const n = root.querySelector('[data-f="' + fk + '"]'); if (n) n.focus({ preventScroll: true }); }
      else if (act === 'close') { const k = open; stopAnim(); open = null; renderIO(calc()); paintLive(); const n = root.querySelector('[data-f="t-' + k + '"]'); if (n) n.focus({ preventScroll: true }); say('Signal path closed. Press ▶ test on any row to open it again.'); }
      else if (act === 'slow') { slow = !slow; b.setAttribute('aria-pressed', String(slow)); say(slow ? 'Slow motion on: each hop now takes more than a second, so you can read every step.' : 'Slow motion off: each hop takes 0.25 s, about as fast as a real PLC scan feels.'); }
      else if (act === 'preset') { const k = open, inp = root.querySelector('[data-slide]'); if (inp) inp.value = b.dataset.v; slide(k, b.dataset.v); }
      else if (act === 'reset') reset();
    });
    root.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.slide) slide(t.dataset.slide, t.value); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-start]')) { e.preventDefault(); setStart(e.target.value); } });

    ph.replaceWith(root);
    // narrow layout (phones): decided by the widget's own width, not the window
    const fit = () => root.classList.toggle('hwr-narrow', root.clientWidth < 600);
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(root); else window.addEventListener('resize', fit);
    const first = renderAll();
    wasDone = first.C.checks.every((c) => c.ok);
    say(restored ? 'Welcome back: your rack is restored. Click a module to see its addresses, or press ▶ test in the I/O list.' : 'Start here: click PS 25 W. The catalog always puts a new module into the first free slot.', 'info');
    capEl.classList.remove('flash');
  };
})();
