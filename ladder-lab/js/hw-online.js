/* PLC Start — "Going online" simulator. Mounted in lessons through [[hw:online]] (LL.HW.online).
 * Two copies of one small program: the project on the laptop (offline) and the program in the PLC (online).
 * The learner compiles (and fixes a typo), downloads (and learns why it may need STOP), goes online and
 * watches power flow, compares, uploads, forces an output (FORCE / MAINT LED), changes logic in RUN
 * (online change) and changes the hardware (needs STOP). Plus the classic trap: downloading over a change
 * that somebody made directly in the PLC. Button names follow the tool: TIA Portal, Studio 5000, CODESYS. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-online';
  const KEYS = ['main', 'fb', 'db', 'hw'];
  let uid = 0;

  // ───────────── the words of each tool ─────────────
  // forceLed = the LED that warns about forces. faddr = the address the force table writes.
  // night = how the night shift really did it in this tool (the story must be possible in the real tool).
  // trap = what the real tool says when you download over that change (honest: often nothing).
  const OC_WHY = 'Now you add the OL_OK contact to rung 1, so that an overload also stops the motor.';
  const BR = {
    tia: {
      name: 'TIA Portal', compile: 'Compile', download: 'Download to device', online: 'Go online', offline: 'Go offline',
      compare: 'Compare (offline/online)', cmp: 'Compare', upload: 'Upload from device', force: 'Force table', unforce: 'Stop forcing',
      start: 'Start CPU', stop: 'Stop CPU', cpu: 'CPU', cpuThe: 'The CPU', runW: 'RUN', stopW: 'STOP', forceLed: 'MAINT', runLed: 'the RUN/STOP LED is green',
      sw: ['run', 'stop'], swL: { run: 'RUN', stop: 'STOP' },
      main: 'Main', mainSub: 'OB1 · cyclic program', fbSub: 'FB1 · function block', dbSub: 'DB1 · data block (settings)', hw: 'Device configuration',
      addr: { start: '%I0.0', stop: '%I0.1', ol: '%I0.2', motor: '%Q0.0', lamp: '%Q0.1' }, faddr: '%Q0.0:P', T: 'TRUE', F: 'FALSE', inst: '"FB_Motor_DB"',
      startQ: 'Start the CPU now?', startQ2: 'Start the CPU again?', startYes: 'Start', startNo: 'Leave in STOP',
      oc: [['add', 'Add an overload contact to rung 1'], ['dl', 'Download changes in RUN']],
      ocIntro: 'In TIA Portal you change the block in your project, then you download it. If only program blocks changed, the CPU stays in RUN.',
      words: 'TIA Portal words: <b>Compile</b>, <b>Download to device</b>, <b>Go online</b>, <b>Compare</b>, <b>Upload from device</b>, <b>Force table</b>.',
      wordsMore: 'The CPU has one RUN/STOP LED (green = RUN, yellow = STOP), an ERROR LED and a MAINT LED (yellow when forces are active).',
      night: 'A colleague opened an old copy of the project on another laptop, changed FB_Motor and downloaded it. Only the block changed, so the CPU stayed in RUN.',
      trap: 'Newer TIA Portal versions may warn that the PLC was loaded from another project. Do not click past it. Older versions, and many other cases, give no warning.',
    },
    rock: {
      name: 'Studio 5000', compile: 'Verify', download: 'Download', online: 'Go Online', offline: 'Go Offline',
      compare: 'Compare', cmp: 'Compare', upload: 'Upload', force: 'I/O Forces', unforce: 'Remove all I/O forces',
      start: 'Run Mode', stop: 'Program Mode', cpu: 'controller', cpuThe: 'The controller', runW: 'Run mode', stopW: 'Program mode', forceLed: 'FORCE', runLed: 'the green RUN LED is on',
      sw: ['run', 'rem', 'stop'], swL: { run: 'RUN', rem: 'REM', stop: 'PROG' },
      main: 'MainRoutine', mainSub: 'MainProgram · ladder routine', fbSub: 'Add-On Instruction', dbSub: 'controller tags (settings)', hw: 'I/O configuration',
      addr: { start: 'Local:2:I.Data.0', stop: 'Local:2:I.Data.1', ol: 'Local:2:I.Data.2', motor: 'Local:3:O.Data.0', lamp: 'Local:3:O.Data.1' }, faddr: 'Local:3:O.Data.0', T: '1', F: '0', inst: 'Motor_1',
      startQ: 'Change the controller to Remote Run?', startQ2: 'Change the controller back to Remote Run?', startYes: 'Yes, Remote Run', startNo: 'Stay in Program mode',
      oc: [['start', 'Start pending edits'], ['add', 'Add an overload contact to rung 1'], ['accept', 'Accept pending edits'], ['test', 'Test edits'], ['assemble', 'Assemble edits']],
      ocIntro: 'In Studio 5000 you edit online, rung by rung. The old rung keeps running until you test the new one.',
      words: 'Studio 5000 words: <b>Verify</b>, <b>Download</b>, <b>Go Online</b>, <b>Compare</b>, <b>Upload</b>, <b>I/O Forces</b>. Logic changes in Run are online edits: start, accept, test, assemble.',
      wordsMore: 'The controller front has the LEDs RUN (off in Program mode), FORCE and OK, and a small display that shows the mode. The key switch has RUN, REM (remote) and PROG. The LEDs here are simplified.',
      night: 'Add-On Instructions cannot be edited online. So the colleague changed FB_Motor offline on their own laptop and downloaded it: the line stopped for 2 minutes.',
      trap: 'Real Studio 5000 does NOT warn you. Its Download dialog only asks you to confirm. This simulator stops you so that you can see the trap.',
    },
    cds: {
      name: 'CODESYS', compile: 'Build', download: 'Login with download', online: 'Login', offline: 'Logout',
      compare: 'Compare', cmp: 'Compare', upload: 'Source upload', force: 'Force values', unforce: 'Unforce all values',
      start: 'Start application', stop: 'Stop application', cpu: 'PLC', cpuThe: 'The PLC', runW: 'RUN', stopW: 'STOP', forceLed: 'FORCE', runLed: 'the green RUN LED is on',
      sw: ['run', 'stop'], swL: { run: 'RUN', stop: 'STOP' },
      main: 'PLC_PRG', mainSub: 'program (POU)', fbSub: 'function block (POU)', dbSub: 'global variables (GVL)', hw: 'Device tree',
      addr: { start: '%IX0.0', stop: '%IX0.1', ol: '%IX0.2', motor: '%QX0.0', lamp: '%QX0.1' }, faddr: '%QX0.0', T: 'TRUE', F: 'FALSE', inst: 'fbMotor',
      startQ: 'Start the application now?', startQ2: 'Start the application again?', startYes: 'Start', startNo: 'Leave in STOP',
      oc: [['add', 'Add an overload contact to rung 1'], ['oc', 'Online change']],
      ocIntro: 'In CODESYS you change the code while you are logged in, then you do an Online change. The application keeps running.',
      words: 'CODESYS words: <b>Build</b>, <b>Login</b> (with download, or with online change), <b>Source upload</b>, <b>Force values</b>.',
      wordsMore: 'The PLC state is RUN or STOP. CODESYS runs on many brands of PLC, so the LEDs on the front are different on each device: here they are generic.',
      night: 'A colleague logged in from another laptop, changed FB_Motor with an online change, and stored the project source on the PLC.',
      trap: 'Real CODESYS only says that the application in the PLC has changed. It does not say which copy is newer.',
    },
  };
  const BKEYS = [['tia', 'TIA Portal'], ['rock', 'Studio 5000'], ['cds', 'CODESYS']];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // a short checksum ("fingerprint") of a block's content
  function sum(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('000' + ((h ^ (h >>> 16)) & 0xffff).toString(16).toUpperCase()).slice(-4);
  }
  const ICON = {
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    plc: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M13 4v16M16 8h2M16 11.5h2"/>',
  };
  const icon = (n) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>';

  // ───────────── CSS (once) ─────────────
  const CSS = `
.hw-box.hw-online{border:1px solid var(--line);border-radius:var(--r-panel);background:var(--surface);padding:14px;margin:18px 0;color:var(--ink);font-size:var(--t-16);line-height:1.45;min-width:0;--hwo-w:var(--muted);--hwo-on:var(--power-bright);--hwo-g:color-mix(in srgb,var(--power) 70%,var(--ink));--hwo-r:color-mix(in srgb,var(--danger) 80%,var(--ink))}
.hw-online .hwo-tgt{scroll-margin-top:72px}
.hw-online .hwo-hl{animation:hwo-hl 1.8s ease-out}
@keyframes hwo-hl{0%,40%{outline:3px solid var(--accent-bg);outline-offset:3px}100%{outline:3px solid transparent;outline-offset:3px}}
.hw-online *{box-sizing:border-box}
.hw-online p,.hw-online li{max-width:none}
.hw-online .btn{white-space:normal;text-align:center;line-height:1.2}
.hwo-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.hwo-title{margin:0;font-family:var(--f-body);font-weight:700;font-size:var(--t-20);line-height:1.15;letter-spacing:.01em}
.hwo-seg{display:inline-flex;border:1px solid var(--line);border-radius:var(--r-ctl);overflow:hidden;background:var(--surface-2);max-width:100%}
.hwo-seg button{flex:1 1 auto;min-height:36px;padding:4px 12px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--ink-2);font-weight:600;font-size:var(--t-14);cursor:pointer;white-space:nowrap}
.hwo-seg button:first-child{border-left:0}
.hwo-seg button:hover{background:var(--surface-3)}
.hwo-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwo-intro{margin:8px 0 0;color:var(--ink-2);font-size:var(--t-14)}
.hwo-sec{margin-top:18px}
.hwo-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 12px;margin:0 0 8px}
.hwo-h > b{font-family:var(--f-body);font-size:var(--t-16);letter-spacing:.04em;text-transform:uppercase;color:var(--ink-2)}
.hwo-h > span{font-size:var(--t-13);color:var(--muted)}
.hwo-tools{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 12px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface-2)}
.hwo-gl{font-size:var(--t-11);font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);line-height:1.2}
.hwo-btns{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
.hw-online .hwo-b{min-height:36px;padding:6px 12px;font-size:var(--t-14);border-radius:var(--r-ctl)}
.hw-online .hwo-b.hwo-dis{opacity:.45;cursor:not-allowed}
.hw-online .hwo-b.hwo-dis:hover{background:var(--surface)}
.hw-online .hwo-b.hwo-dis.primary:hover{background:var(--ink)}
.hw-online .hwo-nx{box-shadow:0 0 0 3px var(--accent-bg);animation:hwo-pulse 1.6s ease-in-out infinite}
@keyframes hwo-pulse{50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--accent-bg) 40%,transparent)}}
.hw-online .btn.hwo-danger{border-color:var(--danger);color:var(--hwo-r);background:var(--danger-soft)}
.hw-online .btn.hwo-danger:hover{background:var(--danger-soft);filter:brightness(1.05)}
.hwo-dlg{margin-top:10px;border:2px solid var(--info);border-radius:var(--r-ctl);background:var(--surface);padding:12px 14px;box-shadow:0 6px 22px rgba(0,0,0,.14)}
.hwo-dlg.warn{border-color:var(--accent-bg)}
.hwo-dlg.bad{border-color:var(--danger)}
.hwo-dlg h5{margin:0 0 6px;font-family:var(--f-body);font-size:var(--t-18);line-height:1.2;display:flex;align-items:center;gap:8px}
.hwo-dlg h5 i{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:var(--t-14);font-family:var(--f-body);font-weight:700;background:var(--info);color:var(--surface)}
.hwo-dlg.warn h5 i{background:var(--accent-bg);color:var(--accent-ink)}
.hwo-dlg.bad h5 i{background:var(--danger);color:var(--surface)}
.hwo-dlg p{margin:0 0 6px}
.hwo-why{font-size:var(--t-14);color:var(--ink-2);background:var(--surface-2);border-radius:var(--r-ctl);padding:6px 10px}
.hwo-why b.hwo-rl{color:var(--ink)}
.hwo-flow{display:flex;align-items:center;justify-content:center;gap:10px;margin:2px 0 4px;font:700 var(--t-13) var(--f-body);color:var(--ink-2)}
.hwo-flow > span{display:inline-flex;align-items:center;gap:5px}
.hwo-flow svg{width:20px;height:20px;color:var(--ink-2)}
.hwo-flow .hwo-arr{font-size:var(--t-14)}
.hwo-flow.ul .hwo-arr i:nth-child(1){animation-delay:.3s}.hwo-flow.ul .hwo-arr i:nth-child(3){animation-delay:0s}
.hwo-narrow .hwo-flow .hwo-arr{transform:none}
.hwo-dbtn{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.hwo-bar{height:14px;border-radius:var(--r-ctl);background:var(--surface-3);overflow:hidden;margin:6px 0;border:1px solid var(--line)}
.hwo-bar i{display:block;height:100%;width:0;background:var(--info);transition:width .3s}
.hwo-pl{font:600 var(--t-13) var(--f-mono);color:var(--ink-2)}
.hwo-duo{display:grid;grid-template-columns:minmax(0,1fr) 72px minmax(0,1fr);align-items:stretch}
.hwo-pan{border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface);overflow:hidden;min-width:0;display:flex;flex-direction:column}
.hwo-ph{display:flex;align-items:center;gap:9px;padding:9px 12px;border-bottom:1px solid var(--line-2);background:var(--surface-2)}
.hwo-ph svg{width:24px;height:24px;flex:none;color:var(--ink-2)}
.hwo-ph > span{min-width:0}
.hwo-ph b{display:block;font-size:var(--t-14);line-height:1.2}
.hwo-ph small{display:block;font-size:var(--t-12);color:var(--muted)}
.hwo-pill{margin-left:auto;flex:none;font-size:var(--t-12);font-weight:700;padding:2px 9px;border-radius:var(--r-ctl);white-space:nowrap}
.hwo-pill.ok{background:var(--power-soft);color:var(--hwo-g)}
.hwo-pill.warn{background:var(--accent-bg);color:var(--accent-ink)}
.hwo-pill.bad{background:var(--danger-soft);color:var(--hwo-r)}
.hwo-pill.info{background:var(--surface-3);color:var(--ink-2)}
.hw-online .hwo-blks{list-style:none;margin:0;padding:8px;display:grid;gap:5px}
.hw-online .hwo-blks li{display:grid;grid-template-columns:minmax(0,1fr) auto 26px;gap:2px 8px;align-items:center;padding:6px 8px;margin:0;border-radius:var(--r-ctl);background:var(--surface-2);border:1px solid transparent}
.hw-online .hwo-blks li.ne{border-color:var(--accent-bg);background:color-mix(in srgb,var(--accent-bg) 12%,var(--surface))}
.hw-online .hwo-blks li.hwo-hwr{margin-top:4px}
.hwo-bn{min-width:0}
.hwo-bn b{display:block;font:700 var(--t-13)/1.25 var(--f-mono);overflow-wrap:anywhere}
.hwo-bn small{display:block;font-size:var(--t-12);color:var(--ink-2);line-height:1.25}
.hwo-bv{font:700 var(--t-13)/1.25 var(--f-mono);text-align:right;white-space:nowrap}
.hwo-bv small{display:block;font-weight:500;color:var(--ink-2)}
.hwo-off{margin:8px 8px 0;padding:5px 9px;border-radius:var(--r-ctl);border:1px dashed var(--line);font-size:var(--t-13);color:var(--ink-2);line-height:1.35}
.hw-online .hwo-blks.stale li{border:1px dashed var(--line)}
.hwo-nt{display:inline-block;margin-left:5px;padding:0 6px;border-radius:var(--r-ctl);background:var(--accent-bg);color:var(--accent-ink);font:700 var(--t-11)/1.5 var(--f-body);vertical-align:1px}
.hwo-mk{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:var(--t-14)}
.hwo-mk.eq{background:var(--power-soft);color:var(--hwo-g)}
.hwo-mk.ne{background:var(--accent-bg);color:var(--accent-ink)}
.hwo-mk.fl{animation:hwo-pop .6s ease-out}
@keyframes hwo-pop{from{transform:scale(1.6)}}
.hwo-nwr{grid-column:1 / -1;font-size:var(--t-12);font-weight:600;color:var(--ink)}
.hwo-empty{margin:0;padding:14px 12px;color:var(--muted);font-size:var(--t-14)}
.hwo-cpu{margin:8px 8px 0;padding:9px 11px;border-radius:var(--r-ctl);background:var(--p-bezel,#2b3742);border:1px solid var(--line);color:#dfe7ec;display:grid;gap:8px}
.hwo-cpu1{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hwo-cpun{font:700 var(--t-12) var(--f-mono);letter-spacing:.04em;color:#aab6bf}
.hwo-mode{font:700 var(--t-16)/1 var(--f-body);letter-spacing:.04em;padding:3px 8px;border-radius:var(--r-ctl);background:#3a4650;color:#ffc35c}
.hwo-mode.r{background:#14532d;color:#7ff0a8}
.hwo-leds{display:flex;flex-wrap:wrap;gap:6px 14px}
.hwo-led{display:inline-flex;align-items:center;gap:6px;font:700 var(--t-11) var(--f-mono);letter-spacing:.04em;color:#c9d3da}
.hwo-led i{width:13px;height:13px;border-radius:50%;background:#46525c;border:1px solid #66737d;flex:none}
.hwo-led.g.on i{background:#3ee07f;border-color:#b5f5cd;box-shadow:0 0 9px #3ee07f}
.hwo-led.y.on i{background:#e9a100;border-color:#ffe0a3;box-shadow:0 0 9px #e9a100}
.hwo-led.r.on i{background:#ff4d4d;border-color:#ffc0c0;box-shadow:0 0 9px #ff4d4d}
.hwo-led.blink i{animation:hwo-blink .5s steps(1) infinite}
@keyframes hwo-blink{50%{background:#46525c;box-shadow:none;border-color:#66737d}}
.hwo-swb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:var(--t-12);color:#aab6bf}
.hwo-sw{display:inline-flex;border:1px solid #66737d;border-radius:var(--r-ctl);overflow:hidden}
.hwo-sw button{min-height:32px;min-width:46px;padding:2px 9px;border:0;border-left:1px solid #66737d;background:transparent;color:#dfe7ec;font:700 var(--t-12) var(--f-mono);cursor:pointer}
.hwo-sw button:first-child{border-left:0}
.hwo-sw button:hover{background:#3a4650}
.hwo-sw button[aria-pressed="true"]{background:#dfe7ec;color:#16202a}
.hwo-link{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--muted);text-align:center;min-height:40px}
.hwo-link::before{content:"";position:absolute;left:3px;right:3px;top:50%;margin-top:-1.5px;border-top:3px dashed var(--line)}
.hwo-link.on::before{border-top-style:solid;border-top-color:var(--power)}
.hwo-lb{position:relative;z-index:1;font:700 var(--t-12)/1.2 var(--f-body);background:var(--surface);color:var(--ink-2);border:1px solid var(--line);border-radius:var(--r-tag);padding:2px 4px;white-space:nowrap}
.hwo-link.on .hwo-lb{color:var(--hwo-g);border-color:var(--power)}
.hwo-arr{position:relative;z-index:1;display:flex;gap:1px;font-size:var(--t-13);line-height:1;color:var(--info)}
.hwo-arr i{font-style:normal;animation:hwo-dot .9s infinite;opacity:.2}
.hwo-arr i:nth-child(2){animation-delay:.15s}.hwo-arr i:nth-child(3){animation-delay:.3s}
.hwo-link.ul .hwo-arr i:nth-child(1){animation-delay:.3s}.hwo-link.ul .hwo-arr i:nth-child(3){animation-delay:0s}
@keyframes hwo-dot{30%{opacity:1}}
.hwo-prog{border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface);padding:8px 12px 10px;min-width:0}
.hwo-pt{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;padding:2px 0 6px;border-bottom:1px solid var(--line-2)}
.hwo-pt > b{font-size:var(--t-14)}
.hwo-lg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:var(--t-12);color:var(--muted)}
.hwo-lg span{display:inline-flex;align-items:center;gap:5px}
.hwo-lg i{display:inline-block;width:18px;height:3px;border-radius:var(--r-tag);background:var(--hwo-on)}
.hwo-lg i.c{width:13px;height:14px;border-radius:0;background:var(--power-soft);border-left:2.5px solid var(--power);border-right:2.5px solid var(--power)}
.hwo-st8{display:inline-flex;align-items:center;gap:6px;font-size:var(--t-13);font-weight:700;padding:1px 9px;border-radius:var(--r-ctl);background:var(--surface-3);color:var(--ink-2)}
.hwo-st8.live{background:var(--power-soft);color:var(--hwo-g)}
.hwo-st8.live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--power-bright)}
.hwo-note{margin:8px 0 0;font-size:var(--t-13);color:var(--ink-2);background:var(--surface-2);border-radius:var(--r-ctl);padding:6px 10px}
.hwo-rung{padding:8px 0 4px;border-top:1px dashed var(--line-2)}
.hwo-rung:first-of-type{border-top:0}
.hwo-rc{display:flex;flex-wrap:wrap;align-items:center;gap:3px 8px;font-size:var(--t-13);color:var(--muted);margin-bottom:2px}
.hwo-rc > b{font:700 var(--t-12)/1.5 var(--f-mono);color:var(--surface);background:var(--ink-2);border-radius:var(--r-tag);padding:0 6px}
.hwo-badge{font-size:var(--t-11);font-weight:700;padding:1px 8px;border-radius:var(--r-ctl);background:var(--accent-bg);color:var(--accent-ink)}
.hwo-badge.old{background:var(--surface-3);color:var(--ink-2)}
.hwo-rung.pend .hwo-net{border-left-style:dashed;border-right-style:dashed;border-color:var(--accent-bg)}
.hwo-rung.old .hwo-scr{opacity:.45}
.hwo-scr{overflow-x:auto;scrollbar-width:thin;padding-bottom:2px}
.hwo-net{display:flex;align-items:flex-start;width:100%;min-width:max-content;border-left:3px solid var(--ink-2);border-right:3px solid var(--ink-2)}
.hwo-net.live{border-left-color:var(--hwo-on)}
.hwo-el{position:relative;display:flex;flex-direction:column;width:62px;flex:none}
.hwo-tag{height:18px;font:600 .7rem/18px var(--f-mono);text-align:center;white-space:nowrap;color:var(--ink)}
.hwo-sym{display:flex;align-items:center;height:26px}
.hwo-wl,.hwo-wr{flex:1;height:2px;background:var(--hwo-w)}
.hwo-sym b{flex:none;height:22px}
.hwo-no .hwo-sym b{width:14px;border-left:2.5px solid var(--ink-2);border-right:2.5px solid var(--ink-2)}
.hwo-coil .hwo-sym b{width:22px;border:2.5px solid var(--ink-2);border-top-color:transparent;border-bottom-color:transparent;border-radius:50%}
.hwo-el.pl .hwo-wl,.hwo-el.pr .hwo-wr,.hwo-coil.pl .hwo-wr{background:var(--hwo-on);height:3px}
.hwo-no.cl .hwo-sym b{background:var(--power-soft);border-color:var(--power)}
.hwo-coil.pl .hwo-sym b{background:var(--power-soft);border-left-color:var(--power);border-right-color:var(--power)}
.hwo-el.err .hwo-tag{color:var(--hwo-r);font-weight:700;text-decoration:underline wavy var(--danger);text-underline-offset:3px}
.hwo-el.new .hwo-tag{background:var(--accent-bg);color:var(--accent-ink);border-radius:var(--r-tag);margin:0 2px}
.hwo-f{position:absolute;top:47px;left:50%;transform:translateX(-50%);padding:0 6px;border-radius:var(--r-tag);background:var(--accent-bg);color:var(--accent-ink);font:700 .68rem/17px var(--f-body);white-space:nowrap;font-style:normal}
.hwo-fill{flex:1 1 auto;min-width:14px;height:44px;position:relative}
.hwo-st{display:block;width:10px;height:44px;position:relative;flex:none}
.hwo-fill::after,.hwo-st::after{content:"";position:absolute;left:0;right:0;top:30px;height:2px;background:var(--hwo-w)}
.hwo-fill.p::after,.hwo-st.p::after{background:var(--hwo-on);top:29.5px;height:3px}
.hwo-par{position:relative;display:flex;flex-direction:column;flex:none}
.hwo-br{display:flex;align-items:flex-start}
.hwo-par::before,.hwo-par::after{content:"";position:absolute;top:30px;height:46px;width:2px;background:var(--hwo-w)}
.hwo-par::before{left:0}
.hwo-par::after{right:0}
.hwo-par.pvl::before,.hwo-par.pvr::after{background:var(--hwo-on);width:3px}
.hwo-fb{display:flex;flex-direction:column;flex:none}
.hwo-fbr{display:flex;align-items:flex-start}
.hwo-fbr > i{display:block;width:12px;height:2px;margin-top:12px;background:var(--hwo-w);flex:none}
.hwo-fb.pl .hwo-fbr > i{background:var(--hwo-on);height:3px;margin-top:11.5px}
.hwo-fbx{position:relative;border:2px solid var(--ink-2);border-radius:var(--r-ctl);padding:3px 10px 5px 30px;min-width:150px;background:var(--surface)}
.hwo-fb.pl .hwo-fbx{border-color:var(--power);background:var(--power-soft)}
.hwo-fbx em{position:absolute;left:5px;top:4px;font:700 var(--t-11) var(--f-mono);font-style:normal;color:var(--ink-2)}
.hwo-fbx b{display:block;font:700 var(--t-13)/1.3 var(--f-mono)}
.hwo-fbx small{display:block;font-size:var(--t-12);color:var(--ink-2);line-height:1.3}
.hwo-mach{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}
.hwo-dev{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface-2);min-width:0;flex:1 1 170px}
.hwo-dev > span{min-width:0}
.hwo-dev b{display:block;font-size:var(--t-14);line-height:1.25}
.hwo-dev small{display:block;font-size:var(--t-13);color:var(--ink-2);line-height:1.3}
.hwo-dev.frc{border-color:var(--accent-bg);background:color-mix(in srgb,var(--accent-bg) 14%,var(--surface))}
.hwo-dev svg{width:42px;height:42px;flex:none;color:var(--muted)}
.hwo-dev.on svg{color:var(--power)}
.hwo-dev.on .hwo-bl{animation:hwo-spin .8s linear infinite;transform-origin:21px 21px}
@keyframes hwo-spin{to{transform:rotate(360deg)}}
.hwo-lamp{width:34px;height:34px;border-radius:50%;flex:none;background:var(--surface-3);border:2px solid var(--line);box-shadow:inset 0 -3px 0 rgba(0,0,0,.12)}
.hwo-dev.on .hwo-lamp{background:#3ee07f;border-color:#15964a;box-shadow:0 0 14px #3ee07f}
.hwo-pbs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;padding-top:9px;border-top:1px solid var(--line-2)}
.hwo-pbs > small{flex:1 1 100%;font-size:var(--t-13);color:var(--ink-2);margin-top:-2px}
.hwo-pb{display:inline-flex;align-items:center;gap:9px;min-height:46px;padding:6px 14px 6px 8px;border-radius:var(--r-ctl);border:1px solid var(--line);background:var(--surface);cursor:pointer;font:inherit;font-weight:700;font-size:var(--t-14);color:var(--ink);text-align:left;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.hwo-pb:hover{background:var(--surface-2)}
.hwo-pb .hwo-knob{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--p-bezel,#2b3742);flex:none}
.hwo-pb .hwo-knob i{width:21px;height:21px;border-radius:50%;background:#1a9b4b;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);transition:transform .06s}
.hwo-pb.red .hwo-knob i{background:#cf3a2e}
.hwo-pb.down{background:var(--surface-3)}
.hwo-pb.down .hwo-knob i{transform:scale(.8);box-shadow:inset 0 2px 0 rgba(0,0,0,.3)}
.hwo-pb small{display:block;font:500 var(--t-12) var(--f-mono);color:var(--ink-2)}
.hwo-pb.hwo-dis{opacity:.45;cursor:not-allowed}
.hw-online .hwo-live{margin:10px 0 0}
.hw-online .hwo-live td,.hw-online .hwo-live th{vertical-align:middle;padding:6px 10px}
.hwo-live td small{display:block;font-size:var(--t-12);color:var(--muted);line-height:1.25}
.hwo-ad{font:600 var(--t-13) var(--f-mono);overflow-wrap:break-word}
.hwo-v{display:inline-block;padding:1px 8px;border-radius:var(--r-ctl);font:700 var(--t-12) var(--f-mono);background:var(--surface-3);color:var(--ink-2);white-space:nowrap}
.hwo-v.on{background:var(--power-bright);color:#04210f}
.hwo-v.frc{background:var(--accent-bg);color:var(--accent-ink)}
.hwo-evs{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px}
.hwo-evc{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-ctl);background:var(--surface-2)}
.hwo-evc b{display:block;font-size:var(--t-14)}
.hwo-evc small{display:block;font-size:var(--t-13);color:var(--ink-2);line-height:1.35}
.hwo-ocp{margin:0 0 8px;font-size:var(--t-14);color:var(--ink-2)}
.hw-online .hwo-steps{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.hw-online .hwo-steps li{display:flex;align-items:center;gap:10px;margin:0;padding:6px 8px;min-height:44px;border-radius:var(--r-ctl);border:1px solid var(--line-2);background:var(--surface-2);font-size:var(--t-14);color:var(--muted)}
.hwo-steps li > i{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:var(--t-13);background:var(--surface-3);color:var(--ink-2)}
.hw-online .hwo-steps li.done{color:var(--ink-2)}
.hwo-steps li.done > i{background:var(--power);color:var(--surface)}
.hw-online .hwo-steps li.miss{border-style:dashed;color:var(--ink-2)}
.hwo-steps li.miss > i{background:var(--accent-bg);color:var(--accent-ink)}
.hw-online .hwo-steps li.cur{border-color:var(--ink-2);background:var(--surface);color:var(--ink)}
.hwo-steps li.cur > i{background:var(--ink);color:var(--surface)}
.hwo-ocf{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;font-size:var(--t-14)}
.hwo-win{margin:10px 0 0;padding:10px 12px;border-radius:var(--r-ctl);background:var(--power-soft);border:1px solid var(--power);font-weight:600}
.hw-online .hwo-cl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:6px 10px}
.hw-online .hwo-cl li{margin:0;display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:var(--r-ctl);background:var(--surface-2);font-size:var(--t-14);line-height:1.3}
.hwo-cl li > i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:var(--t-13)}
.hwo-cl li.ok > i{background:var(--power-soft);color:var(--hwo-g)}
.hwo-cl li.no > i{background:var(--danger-soft);color:var(--hwo-r)}
.hw-online .hwo-cl li.lost{background:var(--danger-soft)}
.hwo-cl small{display:block;color:var(--ink-2);font-size:var(--t-13);margin-top:1px}
.hw-online .hwo-cl li.lost small{color:var(--hwo-r);font-weight:600}
.hwo-next{margin:10px 0 0;padding:8px 10px;border-radius:var(--r-ctl);border:1px dashed var(--line);font-size:var(--t-14)}
.hwo-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hwo-cap{position:sticky;bottom:10px;z-index:6;margin-top:16px;padding:9px 12px;border-radius:var(--r-ctl);border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hwo-cap.ok{border-left-color:var(--power)}
.hwo-cap.warn{border-left-color:var(--accent-bg)}
.hwo-cap.bad{border-left-color:var(--danger)}
.hwo-ch{display:flex;align-items:center;justify-content:space-between;gap:8px}
.hwo-k{display:block;font-size:var(--t-12);font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:1px}
.hwo-cap p{margin:0;font-size:var(--t-14)}
.hwo-cap button{cursor:pointer;font:700 var(--t-13)/1.1 var(--f-body);border-radius:var(--r-ctl);white-space:nowrap;touch-action:manipulation}
.hwo-show{flex:none;min-height:32px;padding:2px 12px;border:1px solid var(--accent-bg);background:var(--accent-bg);color:var(--accent-ink)}
.hwo-show[hidden]{display:none}
.hwo-mb{margin-left:6px;min-height:32px;padding:0 10px;border:1px solid var(--line);background:var(--surface-2);color:var(--ink-2)}
.hwo-mb:hover,.hwo-mb[aria-expanded="true"]{background:var(--surface-3);color:var(--ink)}
.hwo-cap p.hwo-mt{margin-top:6px;padding-top:6px;border-top:1px dashed var(--line);font-size:var(--t-14);color:var(--ink-2)}
.hwo-cap p.hwo-mt[hidden]{display:none}
.hwo-cap.flash{animation:hwo-flash .7s ease-out}
@keyframes hwo-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hwo-cap{bottom:calc(var(--tabbar-h) + 8px + env(safe-area-inset-bottom,0px))}}
.hwo-narrow.hw-online{padding:12px 10px}
.hwo-narrow .hwo-title{font-size:var(--t-20)}
.hwo-narrow .hwo-seg{width:100%}
.hwo-narrow .hwo-seg button{padding:4px 6px}
.hwo-narrow .hwo-tools{grid-template-columns:minmax(0,1fr);gap:4px 0;padding:8px 10px}
.hwo-narrow .hwo-tools .hwo-btns{margin-bottom:6px}
.hwo-narrow .hwo-duo{grid-template-columns:minmax(0,1fr)}
.hwo-narrow .hwo-link{flex-direction:row;min-height:50px;gap:10px}
.hwo-narrow .hwo-link::before{left:50%;right:auto;top:3px;bottom:3px;margin:0 0 0 -1.5px;border-top:0;border-left:3px dashed var(--line)}
.hwo-narrow .hwo-link.on::before{border-left-style:solid;border-left-color:var(--power)}
.hwo-narrow .hwo-arr{transform:rotate(90deg)}
.hwo-narrow .hwo-prog{padding:8px 8px 10px}
.hwo-narrow .hwo-cap{max-height:30vh;overflow-y:auto;overscroll-behavior:contain;padding:6px 10px 8px}
.hwo-narrow .hwo-cap p{font-size:var(--t-14);line-height:1.4}
.hwo-narrow .hwo-pb{flex:1 1 140px}
@media (prefers-reduced-motion:reduce){.hw-online .hwo-nx,.hwo-arr i,.hwo-dev.on .hwo-bl,.hwo-led.blink i,.hwo-cap.flash,.hwo-mk.fl{animation:none}.hwo-arr i{opacity:1}.hw-online .hwo-hl{animation:none;outline:3px solid var(--accent-bg);outline-offset:3px}}
`;
  function injectCSS() {
    if (document.getElementById('hw-online-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-online-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ───────────── state ─────────────
  // proj / plc: { ol: overload contact in rung 1, fb: FB_Motor version (2 = night shift), hw: hardware version }
  // last: what the laptop saw of the PLC the last time it was connected (shown while offline)
  function fresh(brand) {
    return {
      v: 1, brand, typo: true, seen: false, ck: '', proj: { ol: false, fb: 1, hw: 1 }, plc: null, last: null,
      mode: 'stop', sw: brand === 'rock' ? 'rem' : 'run', forced: false, night: 0, oc: 0, won: false,
      done: { compile: false, run: false, equal: false, night: false, forceSet: false, force: false, oc: false, hw: false },
    };
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!o || o.v !== 1 || !BR[o.brand]) return null;
      const s = fresh(o.brand), b = (x) => !!x, p = o.proj || {};
      s.typo = b(o.typo); s.seen = b(o.seen); s.ck = typeof o.ck === 'string' ? o.ck : '';
      s.proj = { ol: b(p.ol), fb: p.fb === 2 ? 2 : 1, hw: p.hw === 2 ? 2 : 1 };
      s.plc = o.plc ? { ol: b(o.plc.ol), fb: o.plc.fb === 2 ? 2 : 1, hw: o.plc.hw === 2 ? 2 : 1, src: b(o.plc.src) } : null;
      s.last = s.plc && o.last ? { ol: b(o.last.ol), fb: o.last.fb === 2 ? 2 : 1, hw: o.last.hw === 2 ? 2 : 1 } : null;
      if (s.plc) s.typo = false;
      s.mode = o.mode === 'run' && s.plc ? 'run' : 'stop';
      if (BR[o.brand].sw.indexOf(o.sw) >= 0) s.sw = o.sw;
      s.forced = b(o.forced) && !!s.plc;
      s.night = [0, 1, 2, 3].indexOf(o.night) >= 0 ? o.night : 0;
      s.oc = Number.isInteger(o.oc) ? Math.max(0, Math.min(5, o.oc)) : 0;
      Object.keys(s.done).forEach((k) => (s.done[k] = b(o.done && o.done[k])));
      // a damaged save must not claim PLC work when the PLC is empty
      if (!s.plc) { ['run', 'equal', 'night', 'forceSet', 'force', 'oc', 'hw'].forEach((k) => (s.done[k] = false)); s.night = 0; s.oc = 0; s.proj = { ol: false, fb: 1, hw: 1 }; }
      if (s.done.compile && s.typo) s.done.compile = false;
      s.won = b(o.won) && Object.keys(s.done).every((k) => k === 'forceSet' || s.done[k]);
      return s;
    } catch (e) { return null; }
  }

  // ───────────── the widget ─────────────
  LL.HW.online = function (ph) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'hw-box hw-online';
    const id = 'hwo' + ++uid;
    let st = load();
    const restored = !!st;
    if (!st) st = fresh('tia');
    let online = false, dlg = null, flashCmp = false, timers = [];
    let retF = null; // the button that opened a dialog: focus goes back there when the dialog closes
    let capShow = null; // the area the caption talks about ("Show me" scrolls there)
    let hold = null, lastPtr = 0, ro = null; // a push button held down with the mouse or a finger; the resize watcher
    const rt = { start: false, stopP: false, motor: false }; // buttons and the motor bit (not saved)

    const br = () => BR[st.brand];
    const has = () => !!st.plc;
    const snap = () => { st.last = st.plc ? { ol: st.plc.ol, fb: st.plc.fb, hw: st.plc.hw } : null; };
    const dlName = () => (st.brand === 'cds' && online ? 'Download' : br().download); // CODESYS: already logged in → Online → Download
    const P = () => ({ ol: st.proj.ol, fb: st.proj.fb, hw: st.proj.hw, typo: st.typo });
    const pkey = () => JSON.stringify(P());
    const compiled = () => !st.typo && st.ck === pkey();
    const runs = () => has() && st.mode === 'run';
    const swSoft = () => (st.brand === 'rock' ? st.sw === 'rem' : st.sw === 'run'); // may the laptop change the mode?
    const later = (fn, ms) => { const t = setTimeout(() => { timers = timers.filter((x) => x !== t); if (root.isConnected) fn(); else cleanup(); }, ms); timers.push(t); };
    function save() { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }

    function binfo(k, S) {
      if (k === 'main') return { v: S.ol ? 2 : 1, s: sum('main|' + (S.typo ? 'Rnu' : 'Run') + (S.ol ? '|OL' : '')) };
      if (k === 'fb') return { v: S.fb, s: sum('fb|' + S.fb), night: S.fb === 2 };
      if (k === 'db') return { v: 1, s: sum('db|1') };
      return { v: S.hw, s: sum('hw|' + S.hw) };
    }
    const nameOf = (k) => (k === 'main' ? br().main : k === 'fb' ? 'FB_Motor' : k === 'db' ? 'DB_Settings' : br().hw);
    const list = (ks) => ks.map(nameOf).join(', ');
    function diffs() {
      if (!st.plc) return KEYS.slice();
      const A = P();
      return KEYS.filter((k) => binfo(k, A).s !== binfo(k, st.plc).s);
    }
    function newer(k) {
      if (!st.plc) return 'proj';
      if (k === 'fb') return st.plc.fb > st.proj.fb ? 'plc' : 'proj';
      if (k === 'main') return st.plc.ol && !st.proj.ol ? 'plc' : 'proj';
      if (k === 'hw') return st.plc.hw > st.proj.hw ? 'plc' : 'proj';
      return 'proj';
    }
    // online change progress: TIA / CODESYS follow from the data, Studio 5000 has its own steps
    function norm() {
      const n = br().oc.length;
      if (st.brand !== 'rock') st.oc = st.plc && st.plc.ol ? n : st.proj.ol ? 1 : 0;
      else {
        if (st.plc && st.plc.ol && st.oc < 4) st.oc = n;
        if (!st.proj.ol && st.oc >= 2) st.oc = 0;
      }
    }
    const ocMid = () => st.oc > 0 && st.oc < br().oc.length;
    function cancelOc() {
      if (st.brand === 'rock' && st.oc === 4 && st.plc) st.plc.ol = false;
      st.proj.ol = st.plc ? st.plc.ol : false;
      st.oc = 0;
      norm();
    }
    function setMode(m) {
      st.mode = m;
      if (m === 'stop') { rt.motor = false; return; }
      if (has()) { st.done.run = true; if (st.plc.hw === 2) st.done.hw = true; }
    }
    function scan() {
      if (!runs()) { rt.motor = false; return; }
      rt.motor = (rt.start || rt.motor) && !rt.stopP; // OL_OK is always healthy here
    }
    function modeL() {
      if (!has()) return st.brand === 'rock' ? 'Program · empty' : 'STOP · empty';
      if (st.brand !== 'rock') return st.mode === 'run' ? 'RUN' : 'STOP';
      return (st.sw === 'rem' ? 'Remote ' : '') + (st.mode === 'run' ? 'Run' : 'Program');
    }

    // ───── why is a button not possible right now? (null = possible) ─────
    const ANS = 'First answer the question in the box.';
    function whyDownload() {
      if (st.typo && st.seen) return 'Download is impossible: the project has 1 error ("Motor_Rnu" is not defined). Fix the typo first.';
      if (st.brand === 'rock' && st.sw === 'run') return 'The key switch on the controller is in RUN: the laptop cannot download. Turn the key to REM.';
      if (st.brand === 'rock' && ocMid()) return 'You have online edits in progress. Finish them (steps below) or cancel them first.';
      return null;
    }
    function whyCompare() { return online ? null : `${br().cmp} needs a connection to the PLC: click ${br().online} first.`; }
    function whyUpload() {
      const B = br();
      if (!online) return `${B.upload} needs a connection to the PLC: click ${B.online} first.`;
      if (!has()) return 'The PLC is empty: there is nothing to upload.';
      if (st.brand === 'rock' && ocMid()) return 'You have online edits in progress. Finish or cancel them first.';
      return null;
    }
    function whyCpu() {
      const B = br();
      if (!online) return `${B.start} / ${B.stop} works only online. Click ${B.online} first, or use the switch on the ${B.cpu}.`;
      if (!has()) return `The PLC is empty: there is no program to run. ${B.download} first.`;
      if (!swSoft()) return st.brand === 'rock' ? `The key is on ${B.swL[st.sw]}: the laptop cannot change the mode. Turn the key to REM.` : `The switch on the ${B.cpu} is on STOP: the laptop cannot start it. Turn the switch to RUN.`;
      return null;
    }
    function whyForce() {
      const B = br();
      if (!online) return st.forced ? `To remove forces you must be online: click ${B.online} first.` : `Forcing is an online function: click ${B.online} first.`;
      if (st.forced) return null;
      if (!has()) return 'The PLC is empty: download a program first.';
      if (st.mode !== 'run') return `Start the ${B.cpu} first. Then you can see the difference between the program and the forced output.`;
      return null;
    }
    function whyNight() {
      if (!has()) return 'The PLC is empty: there is nothing to change yet. Download first.';
      if (st.night === 3) return "This already happened, and the fix was overwritten. Press Reset to try again.";
      if (st.night) return 'This already happened. (Reset shows it again.)';
      if (ocMid()) return 'Finish the online change first.';
      return null;
    }
    function whyHw() {
      if (!has()) return 'Download a program first: then the machine gets a new card.';
      if (st.proj.hw === 2) return `The new card is already in your project. ${st.plc.hw === 2 ? 'It is loaded too.' : 'Download it (needs ' + br().stopW + ').'}`;
      if (ocMid()) return 'Finish the online change first.';
      return null;
    }
    function whyOc() {
      const B = br();
      if (!has()) return 'The PLC is empty: download a program first.';
      if (!online) return `Online change works only online: click ${B.online} first.`;
      if (st.brand === 'rock' && st.sw === 'run') return 'The key is on RUN: online edits are blocked. Turn the key to REM (the controller stays in Remote Run).';
      if (st.mode !== 'run') return `The ${B.cpu} is in ${B.stopW}. An online change is a change while the machine runs: start it first.`;
      if (st.oc === 0 && diffs().length) return `Your project and the PLC are not equal. Make them equal first (${B.cmp} shows what is different).`;
      return null;
    }

    // ───── HTML pieces ─────
    function btn(f, label, why, o) {
      o = o || {};
      if (dlg && !why) why = ANS;
      return `<button type="button" class="btn hwo-b${o.cls ? ' ' + o.cls : ''}${why ? ' hwo-dis' : ''}" data-act="${o.act || f}" data-f="${f}"${o.k ? ` data-k="${o.k}"` : ''}${why ? ` aria-disabled="true" data-why="${esc(why)}"` : ''}${o.pressed != null ? ` aria-pressed="${o.pressed}"` : ''}>${label}</button>`;
    }
    function toolsHTML() {
      const B = br();
      const g1 = btn('compile', B.compile) + (st.typo && st.seen ? btn('fix', 'Fix the typo', null, { cls: 'primary' }) : '');
      const g2 = btn('download', dlName(), whyDownload()) + btn('online', online ? B.offline : B.online, null, { pressed: online }) + btn('compare', B.compare, whyCompare()) + btn('upload', B.upload, whyUpload());
      const g3 = btn('cpu', st.mode === 'run' && has() ? B.stop : B.start, whyCpu()) + btn('force', st.forced ? B.unforce : `${B.force}: ${B.faddr} = ${B.T}`, whyForce());
      return `<span class="hwo-gl">Project · laptop</span><div class="hwo-btns">${g1}</div><span class="hwo-gl">Laptop ↔ PLC</span><div class="hwo-btns">${g2}</div><span class="hwo-gl">PLC · online</span><div class="hwo-btns">${g3}</div>`;
    }
    function rowsHTML(isPlc) {
      const B = br();
      if (isPlc && !has()) return `<p class="hwo-empty">Empty: no program and no hardware configuration. The ${B.cpu} stays in ${B.stopW}.</p>`;
      // offline, the laptop cannot see the PLC: it shows the values from the last connection
      const stale = isPlc && !online;
      const S = isPlc ? (stale ? st.last || st.plc : st.plc) : P(), dif = online && has() ? diffs() : null;
      const off = stale ? `<p class="hwo-off"><b>Offline:</b> last known values. The PLC may have changed since then.</p>` : '';
      return off + `<ul class="hwo-blks${stale ? ' stale' : ''}">` + KEYS.map((k) => {
        const I = binfo(k, S), ne = !!dif && dif.indexOf(k) >= 0;
        const sub = k === 'main' ? B.mainSub : k === 'fb' ? B.fbSub : k === 'db' ? B.dbSub : S.hw === 2 ? B.cpu + ' + 3 cards (new AI card)' : B.cpu + ' + 2 cards';
        const mk = dif ? `<span class="hwo-mk ${ne ? 'ne' : 'eq'}${flashCmp ? ' fl' : ''}" role="img" aria-label="${ne ? 'different' : 'equal'}">${ne ? '≠' : '✓'}</span>` : '<span aria-hidden="true"></span>';
        // Compare only says "different". The time stamps tell you who changed it last.
        const nwT = k === 'fb' && newer('fb') === 'plc' ? 'PLC changed 03:40, your file yesterday 17:10.'
          : newer(k) === 'plc' ? 'the PLC copy was changed after your file.' : 'you changed your file after the last download.';
        const nw = ne && !isPlc ? `<span class="hwo-nwr">≠ different · ${nwT}</span>` : '';
        return `<li class="${k === 'hw' ? 'hwo-hwr ' : ''}${ne ? 'ne' : ''}"><span class="hwo-bn"><b>${nameOf(k)}</b><small>${sub}</small></span><span class="hwo-bv">v${I.v}${I.night ? '<span class="hwo-nt">night shift</span>' : ''}<small>#${I.s}</small></span>${mk}${nw}</li>`;
      }).join('') + '</ul>';
    }
    // the LEDs on the front of each brand's CPU (simplified, but with the real names)
    function ledDefs() {
      const r = runs(), bl = !!(dlg && dlg.prog && dlg.dir === 'dl' && st.mode === 'stop');
      if (st.brand === 'tia') return [{ n: 'RUN/STOP', c: r ? 'g' : 'y', on: true, bl }, { n: 'ERROR', c: 'r', on: false }, { n: 'MAINT', c: 'y', on: st.forced }];
      if (st.brand === 'rock') return [{ n: 'RUN', c: 'g', on: r }, { n: 'FORCE', c: 'y', on: st.forced }, { n: 'OK', c: 'g', on: true }];
      return [{ n: 'RUN', c: 'g', on: r }, { n: 'STOP', c: 'y', on: !r, bl }, { n: 'ERROR', c: 'r', on: false }, { n: 'FORCE', c: 'y', on: st.forced }];
    }
    const COL = { g: 'green', y: 'yellow', r: 'red' };
    function duoHTML() {
      const B = br(), c = st.typo && st.seen ? ['bad', '1 error'] : compiled() ? ['ok', 'compiled ✓'] : ['warn', 'not compiled'];
      const dir = dlg && dlg.dir;
      const leds = ledDefs().map((L) => `<span class="hwo-led ${L.c}${L.on ? ' on' : ''}${L.on && L.bl ? ' blink' : ''}" role="img" aria-label="${L.n} LED: ${L.on ? COL[L.c] + (L.bl ? ', flashing' : '') : 'off'}"><i></i>${L.n}</span>`).join('');
      const sw = B.sw.map((v) => `<button type="button" data-act="sw" data-v="${v}" data-f="sw-${v}" aria-pressed="${st.sw === v}">${B.swL[v]}</button>`).join('');
      const lk = dir === 'dl' ? 'download' : dir === 'ul' ? 'upload' : online ? 'online' : 'offline';
      return `<section class="hwo-pan hwo-tgt" aria-label="Project on your laptop"><div class="hwo-ph">${icon('laptop')}<span><b>Project on your laptop (offline)</b><small>your copy · you edit it here</small></span><span class="hwo-pill ${c[0]}">${c[1]}</span></div>${rowsHTML(false)}</section>
<div class="hwo-link${online || dir ? ' on' : ''}${dir ? ' ' + dir : ''}"><span class="hwo-lb">${lk}</span>${dir ? `<span class="hwo-arr" aria-hidden="true">${dir === 'dl' ? '<i>▶</i><i>▶</i><i>▶</i>' : '<i>◀</i><i>◀</i><i>◀</i>'}</span>` : ''}</div>
<section class="hwo-pan hwo-tgt" aria-label="PLC"><div class="hwo-ph">${icon('plc')}<span><b>PLC (online)</b><small>this copy runs the machine</small></span></div>
<div class="hwo-cpu"><div class="hwo-cpu1"><span class="hwo-cpun">${B.cpu.toUpperCase()} FRONT</span><span class="hwo-mode${runs() ? ' r' : ''}">${modeL()}</span></div><div class="hwo-leds">${leds}</div><div class="hwo-swb"><span>${st.brand === 'rock' ? 'Key switch' : 'Mode switch'}</span><div class="hwo-sw" role="group" aria-label="${st.brand === 'rock' ? 'Key switch' : 'Mode switch'} on the ${B.cpu}">${sw}</div></div></div>
${rowsHTML(true)}</section>`;
    }

    // ───── the program: 3 rungs in plain HTML. L = live (draw power flow) ─────
    const ct = (tag, L, pl, on, x) => `<span class="hwo-el hwo-no${L && pl ? ' pl' : ''}${L && on ? ' cl' : ''}${L && pl && on ? ' pr' : ''}${x ? ' ' + x : ''}"><span class="hwo-tag">${tag}</span><span class="hwo-sym"><i class="hwo-wl"></i><b></b><i class="hwo-wr"></i></span></span>`;
    const coil = (tag, L, pl, frc) => `<span class="hwo-el hwo-coil${L && pl ? ' pl' : ''}"><span class="hwo-tag">${tag}</span><span class="hwo-sym"><i class="hwo-wl"></i><b></b><i class="hwo-wr"></i></span>${frc ? '<em class="hwo-f">F forced</em>' : ''}</span>`;
    const fill = (p) => `<span class="hwo-fill${p ? ' p' : ''}"></span>`;
    const stub = (p) => `<i class="hwo-st${p ? ' p' : ''}"></i>`;
    function rung1(ol, L, o) {
      o = o || {};
      const s = L && rt.start, m = L && rt.motor, stopIn = !rt.stopP;
      let h = stub(L) + `<span class="hwo-par${L ? ' pvl' : ''}${m ? ' pvr' : ''}"><span class="hwo-br">${stub(L)}${ct('Start_PB', L, L, rt.start)}${stub(s)}</span><span class="hwo-br">${stub(L)}${ct('Motor_Run', L, L, rt.motor)}${stub(m)}</span></span>`;
      let p = s || m;
      h += ct('Stop_PB', L, p, stopIn);
      p = p && stopIn;
      if (ol) h += ct('OL_OK', L, p, true, o.newOl ? 'new' : '');
      return h + fill(L && p) + coil('Motor_Run', L, p, o.frc);
    }
    function rungHTML(no, cmt, inner, L, o) {
      o = o || {};
      return `<div class="hwo-rung${o.cls ? ' ' + o.cls : ''}"><div class="hwo-rc"><b>${no}</b><span>${cmt}</span>${o.badge || ''}</div><div class="hwo-scr"><div class="hwo-net${L ? ' live' : ''}">${inner}</div></div></div>`;
    }
    function progHTML() {
      const B = br(), showPlc = online && has(), L = showPlc && st.mode === 'run';
      const S = showPlc ? st.plc : P(), frc = st.forced && showPlc;
      let head, note = '';
      if (L) head = `<span class="hwo-st8 live">live from the PLC</span>`;
      else if (showPlc) head = `<span class="hwo-st8">PLC in ${B.stopW}: no power flow</span>`;
      else head = `<span class="hwo-st8">offline: your project, no live values</span>`;
      const legend = L ? '<span class="hwo-lg"><span><i></i>power flows</span><span><i class="c"></i>contact closed</span></span>' : '';
      const c1 = 'Motor: START, STOP, seal-in' + (S.ol ? ', overload' : '');
      let h = `<div class="hwo-pt"><b>${B.main}${showPlc ? ' in the PLC' : ' in your project'}</b>${head}${legend}</div>`;
      const rock = st.brand === 'rock';
      if (showPlc && rock && st.oc === 4) {
        h += rungHTML(1, c1, rung1(true, L, { frc, newOl: true }), L, { badge: '<span class="hwo-badge">new rung: running (test)</span>' });
        h += rungHTML(1, 'Motor: START, STOP, seal-in', rung1(false, false), false, { cls: 'old', badge: '<span class="hwo-badge old">old rung: kept until Assemble</span>' });
      } else {
        h += rungHTML(1, c1, rung1(S.ol, L, { frc }), L);
        if (showPlc && rock && st.oc === 1) h += rungHTML(1, 'copy of rung 1, open for editing', rung1(false, false), false, { cls: 'pend', badge: '<span class="hwo-badge">pending edit</span>' });
        else if (showPlc && st.proj.ol && !st.plc.ol) {
          const t = !rock ? (st.brand === 'tia' ? 'new rung 1: in your project, not loaded yet' : 'new rung 1: changed, not loaded yet') : st.oc === 2 ? 'pending edit: only on your laptop' : 'accepted: in the controller, not running yet';
          h += rungHTML(1, 'Motor: START, STOP, seal-in, overload', rung1(true, false, { newOl: true }), false, { cls: 'pend', badge: `<span class="hwo-badge">${t}</span>` });
        }
      }
      const typo = !showPlc && st.typo;
      h += rungHTML(2, 'Lamp: shows that the motor runs', stub(L) + ct(typo ? 'Motor_Rnu' : 'Motor_Run', L, L, rt.motor, typo && st.seen ? 'err' : '') + fill(L && rt.motor) + coil('Lamp_Run', L, L && rt.motor), L);
      const fbTxt = S.fb === 2 ? 'v2 · + overload alarm (night shift)' : 'v1 · Run := Motor_Run';
      h += rungHTML(3, 'Call the motor block FB_Motor', stub(L) + `<span class="hwo-fb${L ? ' pl' : ''}"><span class="hwo-tag" style="text-align:left;padding-left:14px">${B.inst}</span><span class="hwo-fbr"><i></i><span class="hwo-fbx"><em>EN</em><b>FB_Motor</b><small>${fbTxt}</small></span></span></span>` + fill(L), L);
      if (typo && st.seen) note = `<p class="hwo-note"><b>Error:</b> rung 2 uses <b>"Motor_Rnu"</b>. No tag has this name: it is a typo of Motor_Run.</p>`;
      else if (!showPlc && has()) note = `<p class="hwo-note">You see your project. The PLC runs the machine anyway. ${B.online} to watch the PLC live.</p>`;
      else if (online && !has()) note = '<p class="hwo-note">You are online, but the PLC is empty. You see your project.</p>';
      else if (frc) note = `<p class="hwo-note"><b>F</b> = forced. The coil shows what the program wants (${rt.motor ? B.T : B.F}). The real output ${B.faddr} is forced to ${B.T}.</p>`;
      return h + note + pbsHTML();
    }
    // the two push buttons sit right under the rungs, so you see the contacts change while you press
    function pbsHTML() {
      const B = br(), dis = dlg ? ` aria-disabled="true" data-why="${ANS}"` : '';
      return `<div class="hwo-pbs"><button type="button" class="hwo-pb${rt.start ? ' down' : ''}${dlg ? ' hwo-dis' : ''}" data-act="press" data-k="start" data-f="p-start"${dis}><span class="hwo-knob"><i></i></span><span>Press START<small>${B.addr.start} · NO button</small></span></button>
<button type="button" class="hwo-pb red${rt.stopP ? ' down' : ''}${dlg ? ' hwo-dis' : ''}" data-act="press" data-k="stop" data-f="p-stop"${dis}><span class="hwo-knob"><i></i></span><span>Press STOP<small>${B.addr.stop} · NC button</small></span></button><small>Tip: hold a button down to keep it pressed.</small></div>`;
    }
    function machHTML() {
      const B = br(), r = runs(), qm = r && (rt.motor || st.forced), ql = r && rt.motor, frcOn = r && st.forced && !rt.motor;
      const live = online && has();
      const v = (x, f) => (live ? `<span class="hwo-v${f ? ' frc' : x ? ' on' : ''}">${x ? B.T : B.F}${f ? ' · forced' : ''}</span>` : '<span class="hwo-v">—</span>');
      const motor = `<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="18" fill="none" stroke="currentColor" stroke-width="2.5"/><g class="hwo-bl" fill="currentColor"><ellipse cx="21" cy="12" rx="4" ry="8"/><ellipse cx="21" cy="12" rx="4" ry="8" transform="rotate(120 21 21)"/><ellipse cx="21" cy="12" rx="4" ry="8" transform="rotate(240 21 21)"/></g><circle cx="21" cy="21" r="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="2"/></svg>`;
      let h = `<div class="hwo-mach"><div class="hwo-dev${qm ? ' on' : ''}${frcOn ? ' frc' : ''}">${motor}<span><b>Motor M1</b><small>${qm ? (frcOn ? 'RUNNING, but only because it is forced!' : 'running') : 'stopped'} · output ${B.addr.motor}</small></span></div>
<div class="hwo-dev${ql ? ' on' : ''}"><i class="hwo-lamp" aria-hidden="true"></i><span><b>Lamp H1 "motor runs"</b><small>${ql ? 'on' : 'off'} · output ${B.addr.lamp}</small></span></div></div>`;
      const rows = [
        ['Start_PB', 'START button (NO)', B.addr.start, v(rt.start)],
        ['Stop_PB', 'STOP button (NC): 1 = not pressed', B.addr.stop, v(!rt.stopP)],
        ['OL_OK', 'overload relay (NC): 1 = OK', B.addr.ol, v(true)],
        ['Motor_Run', st.forced && live ? `program says ${rt.motor && r ? B.T : B.F}` : 'motor contactor', B.addr.motor, v(qm, st.forced && r)],
        ['Lamp_Run', 'green lamp', B.addr.lamp, v(ql)],
      ];
      h += `<div class="tbl hwo-live"><table><thead><tr><th>Tag</th><th>Address</th><th>${live ? 'Live value' : 'Value (online only)'}</th></tr></thead><tbody>${rows.map((x) => `<tr><td><b class="hwo-ad">${x[0]}</b><small>${x[1]}</small></td><td><span class="hwo-ad">${x[2].replace(/:/g, ":<wbr>")}</span></td><td>${x[3]}</td></tr>`).join('')}</tbody></table></div>`;
      return h;
    }
    function evHTML() {
      return `<div class="hwo-evs"><div class="hwo-evc"><div><b>The night shift</b><small>A colleague changes the PLC from another laptop. Nobody tells you.</small></div>${btn('night', 'Night shift changed the PLC', whyNight())}</div>
<div class="hwo-evc"><div><b>A new card</b><small>The machine gets a new analog input card. You add it to the hardware configuration.</small></div>${btn('hw', 'Change the hardware (add a card)', whyHw())}</div></div>`;
    }
    function ocHTML() {
      const B = br(), S = B.oc, n = S.length, w = whyOc();
      const miss = st.oc >= n && !st.done.oc; // the contact reached the PLC, but with the CPU stopped
      let h = `<p class="hwo-ocp">${B.ocIntro} ${OC_WHY}</p><ol class="hwo-steps">`;
      S.forEach(([k, l], i) => {
        if (miss) {
          const ok = k === 'add', last = i === n - 1;
          h += `<li class="${ok ? 'done' : last ? 'miss' : ''}"><i aria-hidden="true">${ok ? '✓' : last ? '—' : i + 1}</i><span>${l}${ok ? '<span class="hwo-sr"> (done)</span>' : last ? `: not done. It was loaded in ${B.stopW} instead.` : ''}</span></li>`;
          return;
        }
        const cls = i < st.oc ? 'done' : i === st.oc ? 'cur' : '';
        h += `<li class="${cls}"><i aria-hidden="true">${i < st.oc ? '✓' : i + 1}</i>${i === st.oc ? btn('oc-' + k, l, w, { act: 'oc', k, cls: 'primary' }) : `<span>${l}${i < st.oc ? '<span class="hwo-sr"> (done)</span>' : ''}</span>`}</li>`;
      });
      h += '</ol>';
      if (ocMid()) h += `<div class="hwo-ocf">${btn('occancel', 'Cancel the online change', null)}</div>`;
      else if (st.oc >= n && st.done.oc) h += '<p class="hwo-ocf"><span class="chip ok">✓ done in RUN</span> The overload contact is in the PLC. The machine never stopped.</p>';
      else if (miss) h += `<div class="hwo-ocf"><span class="chip">loaded in ${B.stopW}</span><span>${B.cpuThe} was in ${B.stopW}, so this was not an online change.</span>${btn('ocretry', 'Practise the online change again', null, { cls: 'primary' })}</div>`;
      return h;
    }
    function checks() {
      const B = br(), d = st.done;
      return [
        { ok: d.compile, t: 'Compiled without errors', s: d.compile ? 'The typo is fixed: 0 errors.' : `${B.compile} finds the typo first.` },
        { ok: d.run, t: 'Downloaded and in RUN', s: `The first download needs ${B.stopW}.` },
        { ok: d.equal, t: 'Online and all blocks equal', s: `${B.online}, then ${B.cmp}.` },
        { ok: d.night, lost: st.night === 3, t: 'Night-shift change kept', s: st.night === 3 ? 'Overwritten! Press Reset to try again.' : 'Uploaded, not overwritten.' },
        { ok: d.force, t: 'Force set and removed', s: `Watch the ${B.forceLed} LED.` },
        { ok: d.oc, t: 'Online change done in RUN', s: 'Add a contact without stopping.' },
        { ok: d.hw, t: 'Hardware change loaded', s: `A new card needs ${B.stopW}.` },
      ];
    }
    function checkHTML() {
      const C = checks(), okN = C.filter((c) => c.ok).length, all = okN === C.length, nx = next();
      let h = `<div class="hwo-h"><b>Mission checklist <span class="chip${all ? ' ok' : ''}" style="font-family:var(--f-body);letter-spacing:0;text-transform:none;margin-left:6px">${okN} / ${C.length}</span></b><button type="button" class="btn small" data-act="reset" data-f="reset">Reset (start again)</button></div><ul class="hwo-cl">`;
      C.forEach((c) => (h += `<li class="${c.ok ? 'ok' : 'no'}${c.lost ? ' lost' : ''}"><i aria-hidden="true">${c.ok ? '✓' : '✗'}</i><span><b>${c.t}</b><span class="hwo-sr">${c.ok ? ' done' : ' not yet'}</span><small>${c.s}</small></span></li>`));
      h += '</ul>';
      h += all ? '<p class="hwo-win">Mission complete! Compile, download, go online, compare before you download, upload what others changed, force with care, change logic in RUN, stop for hardware. That is the daily work of a PLC programmer.</p>' : nx ? `<p class="hwo-next"><b>Next:</b> ${nx.t}</p>` : '';
      return h;
    }
    function dlgHTML() {
      if (dlg.prog) {
        const p = dlg.prog, pct = Math.round(((p.i + 1) / p.lines.length) * 100);
        // the arrows also live here: on a phone the arrows between the two panels are often off screen
        const ul = dlg.dir === 'ul', arr = `<span class="hwo-arr" aria-hidden="true">${ul ? '<i>◀</i><i>◀</i><i>◀</i>' : '<i>▶</i><i>▶</i><i>▶</i>'}</span>`;
        const flow = `<div class="hwo-flow${ul ? ' ul' : ''}" aria-hidden="true"><span>${icon('laptop')}laptop</span>${arr}<span>${icon('plc')}PLC</span></div>`;
        return `<div class="hwo-dlg info" role="status"><h5><i aria-hidden="true">${ul ? '◀' : '▶'}</i>${dlg.title}</h5>${flow}<div class="hwo-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div><p class="hwo-pl">${p.lines[p.i]} · ${pct} %</p></div>`;
      }
      const sym = dlg.kind === 'bad' ? '!' : dlg.kind === 'warn' ? '!' : '?';
      return `<div class="hwo-dlg ${dlg.kind}" role="dialog" aria-labelledby="${id}-dt"><h5 id="${id}-dt"><i aria-hidden="true">${sym}</i>${dlg.title}</h5><p>${dlg.text}</p>${dlg.why ? `<p class="hwo-why">${dlg.why}</p>` : ''}<div class="hwo-dbtn">${dlg.btns.map((b, i) => `<button type="button" class="btn${b.primary ? ' primary' : ''}${b.danger ? ' hwo-danger' : ''}" data-act="dlg" data-i="${i}" data-f="dlg-${i}">${b.l}</button>`).join('')}</div></div>`;
    }

    // ───── the next good step (text + the button that gets the yellow ring) ─────
    function next() {
      const B = br(), d = st.done, n = B.oc.length;
      if (dlg) return { t: dlg.prog ? 'Wait a moment: the transfer is running.' : 'Answer the question in the box above.', f: null };
      const keyRun = () => (st.brand === 'rock' && st.sw === 'run' ? { t: 'Turn the key on the controller to <b>REM</b>: in RUN the laptop cannot download.', f: 'sw-rem' } : null);
      const needRun = () => {
        if (st.mode !== 'run' && !swSoft()) return { t: `Turn the ${st.brand === 'rock' ? 'key' : 'switch'} on the ${B.cpu} to <b>${st.brand === 'rock' ? 'REM' : 'RUN'}</b>.`, f: st.brand === 'rock' ? 'sw-rem' : 'sw-run' };
        if (!online) return { t: `Click <b>${B.online}</b>.`, f: 'online' };
        if (st.mode !== 'run') return { t: `Click <b>${B.start}</b>.`, f: 'cpu' };
        return null;
      };
      if (!d.compile) return st.typo && st.seen ? { t: `Click <b>Fix the typo</b>, then <b>${B.compile}</b> again.`, f: 'fix' } : { t: `Click <b>${B.compile}</b>. It checks your project before anything can go to the PLC.`, f: 'compile' };
      const keyEdit = () => (st.brand === 'rock' && st.sw === 'run' ? { t: 'Turn the key to <b>REM</b>: with the key on RUN, online edits are blocked.', f: 'sw-rem' } : null);
      if (!d.run) {
        if (!has()) return keyRun() || { t: `Click <b>${dlName()}</b> to send the program to the PLC.`, f: 'download' };
        return needRun();
      }
      if (!d.equal) {
        if (!online) return { t: `Click <b>${B.online}</b> to connect the laptop to the PLC.`, f: 'online' };
        return { t: `Click <b>${B.cmp}</b>: are both copies the same?`, f: 'compare' };
      }
      if (ocMid()) {
        const r = needRun() || keyEdit();
        if (r) return r;
        return { t: `Online change, step ${st.oc + 1} of ${n}: click <b>${B.oc[st.oc][1]}</b>.`, f: 'oc-' + B.oc[st.oc][0] };
      }
      if (!d.night && st.night !== 3) {
        if (st.night === 0) return { t: 'Something happens at night. Click <b>Night shift changed the PLC</b>.', f: 'night' };
        if (!online) return { t: `Click <b>${B.online}</b>. Is the PLC still the same as your project?`, f: 'online' };
        return { t: `FB_Motor in the PLC was changed at 03:40, after your file. Do <b>not</b> download. Click <b>${B.upload}</b> to take it into your project.`, f: 'upload' };
      }
      if (!d.force) {
        if (st.forced) return online ? { t: `Click <b>${B.unforce}</b>. Never leave forces behind.`, f: 'force' } : { t: `Click <b>${B.online}</b>, then <b>${B.unforce}</b>.`, f: 'online' };
        return needRun() || { t: `Click <b>${B.force}: ${B.faddr} = ${B.T}</b> and watch the ${B.forceLed} LED.`, f: 'force' };
      }
      if (!d.oc) {
        if (st.oc >= n) return { t: `The overload contact was loaded with the ${B.cpu} in ${B.stopW}. Click <b>Practise the online change again</b>.`, f: 'ocretry' };
        const r = needRun() || keyEdit();
        if (r) return r;
        if (st.oc === 0 && diffs().length) return { t: `First make the project and the PLC equal: click <b>${B.cmp}</b> to see what is different.`, f: 'compare' };
        return { t: `Online change, step ${st.oc + 1} of ${n}: click <b>${B.oc[st.oc][1]}</b>.`, f: 'oc-' + B.oc[st.oc][0] };
      }
      if (!d.hw) {
        if (st.proj.hw === 1) return { t: 'Click <b>Change the hardware (add a card)</b>.', f: 'hw' };
        if (!st.plc || st.plc.hw !== 2) return keyRun() || { t: `Click <b>${dlName()}</b>. The hardware changed, so this download needs ${B.stopW}.`, f: 'download' };
        return needRun();
      }
      if (st.night === 3) return { t: "Everything else is done. The night shift's fix was overwritten: press <b>Reset</b> to practise that part again.", f: 'reset' };
      return null;
    }

    // ───── skeleton ─────
    root.innerHTML = `
<div class="hwo-head"><h4 class="hwo-title">Compile, download, go online — and the traps</h4>
<div class="hwo-seg" role="group" aria-label="Programming tool">${BKEYS.map(([k, n]) => `<button type="button" data-act="brand" data-b="${k}" data-f="b-${k}">${n}</button>`).join('')}</div></div>
<p class="hwo-intro">Your project lives on your laptop. The PLC has its own copy, and <b>that</b> copy runs the machine. <b>Offline</b>: you work on your copy. <b>Online</b>: the laptop is connected and shows the PLC copy, live. Work through the checklist. The yellow ring shows a good next step.</p>
<div class="hwo-sec hwo-tgt" data-t="tools"><div class="hwo-h"><b>Your tools</b><span>Buttons use the words of the tool you chose.</span></div><div class="hwo-tools"></div><div class="hwo-dslot" data-slot="tools"></div></div>
<div class="hwo-sec hwo-tgt" data-t="duo"><div class="hwo-h"><b>Laptop and PLC</b><span>v = version · # = checksum (a fingerprint of the block)</span></div><div class="hwo-duo"></div></div>
<div class="hwo-sec hwo-tgt" data-t="prog"><div class="hwo-h"><b>The program</b><span>3 rungs · press the buttons and watch</span></div><div class="hwo-prog"></div></div>
<div class="hwo-sec hwo-tgt" data-t="mach"><div class="hwo-h"><b>The machine</b><span>The PLC runs it, with or without your laptop.</span></div><div class="hwo-machw"></div></div>
<div class="hwo-sec"><div class="hwo-h"><b>Things that happen in a real plant</b></div><div class="hwo-ev"></div></div>
<div class="hwo-sec hwo-tgt" data-t="oc"><div class="hwo-h"><b>Online change: change the logic in RUN</b><span class="hwo-ocn"></span></div><div class="hwo-oc"></div><div class="hwo-dslot" data-slot="oc"></div></div>
<div class="hwo-sec hwo-tgt" data-t="check"><div class="hwo-check"></div><div class="hwo-dslot" data-slot="check"></div></div>
<div class="hwo-cap" role="status" aria-live="polite"><div class="hwo-ch"><span class="hwo-k">What happened</span><button type="button" class="hwo-show" data-act="show" hidden></button></div><p class="hwo-ct"></p><p class="hwo-mt" hidden></p></div>`;
    const $ = (s) => root.querySelector(s);
    const toolsEl = $('.hwo-tools'), duoEl = $('.hwo-duo'), progEl = $('.hwo-prog'), machEl = $('.hwo-machw'), evEl = $('.hwo-ev'), ocEl = $('.hwo-oc'), chkEl = $('.hwo-check'), capEl = $('.hwo-cap'), ocN = $('.hwo-ocn');
    const capT = $('.hwo-ct'), capM = $('.hwo-mt'), showB = $('.hwo-show');
    const slots = root.querySelectorAll('.hwo-dslot');

    function render() {
      const a = document.activeElement, fk = a && root.contains(a) ? a.getAttribute('data-f') : null;
      norm(); scan();
      if (online && has()) snap(); // online, the laptop sees the real PLC
      root.querySelectorAll('[data-act="brand"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.b === st.brand)));
      toolsEl.innerHTML = toolsHTML();
      duoEl.innerHTML = duoHTML();
      progEl.innerHTML = progHTML();
      machEl.innerHTML = machHTML();
      evEl.innerHTML = evHTML();
      ocN.textContent = br().name + ': ' + br().oc.length + ' steps';
      ocEl.innerHTML = ocHTML();
      chkEl.innerHTML = checkHTML();
      slots.forEach((s) => (s.innerHTML = dlg && dlg.slot === s.dataset.slot ? dlgHTML() : ''));
      const nx = next();
      if (nx && nx.f) { const n = root.querySelector('[data-f="' + nx.f + '"]'); if (n) n.classList.add('hwo-nx'); }
      flashCmp = false;
      save();
      if (fk) { const n = root.querySelector('[data-f="' + fk + '"]'); if (n) n.focus({ preventScroll: true }); }
    }

    // ───── caption ─────
    // text = 1–2 short sentences. o.more = the longer "why" (behind the More button).
    // o.show = the area the caption talks about: the "Show me" button scrolls there.
    const WIN = ' <b>Mission complete!</b>';
    function say(text, kind, o) {
      kind = kind || 'info'; o = o || {};
      if (!st.won && checks().every((c) => c.ok)) { st.won = true; text += WIN; kind = 'ok'; save(); }
      capEl.className = 'hwo-cap ' + kind;
      capT.innerHTML = text + (o.more ? ' <button type="button" class="hwo-mb" data-act="more" aria-expanded="false">More ▾</button>' : '');
      capM.innerHTML = o.more || '';
      capM.hidden = true;
      capShow = o.show || null;
      capEl.scrollTop = 0;
      showArrow();
      void capEl.offsetWidth; // restart the flash animation
      capEl.classList.add('flash');
    }
    function toggleMore(b) {
      const open = capM.hidden;
      capM.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'Less ▴' : 'More ▾';
    }
    const TGT = {
      tools: () => root.querySelector('[data-t="tools"]'), duo: () => duoEl,
      proj: () => duoEl.querySelectorAll('.hwo-pan')[0], plc: () => duoEl.querySelectorAll('.hwo-pan')[1],
      prog: () => progEl, mach: () => machEl, oc: () => root.querySelector('[data-t="oc"]'), check: () => root.querySelector('[data-t="check"]'),
    };
    const tgtEl = () => (capShow && TGT[capShow] ? TGT[capShow]() : null);
    // the free space between the page header and the sticky caption
    function safeBox() {
      const capH = capEl.getBoundingClientRect().height, capB = parseFloat(getComputedStyle(capEl).bottom) || 10;
      return { top: 64, bottom: window.innerHeight - capB - capH - 8 };
    }
    function showArrow() {
      const el = tgtEl();
      if (!el) { showB.hidden = true; return; }
      const r = el.getBoundingClientRect(), s = safeBox();
      const a = r.bottom < s.top + 40 ? ' ↑' : r.top > s.bottom - 40 ? ' ↓' : '';
      showB.textContent = 'Show me' + a;
      showB.title = a ? 'Scroll to the part that changed' : 'Highlight the part that changed';
      showB.hidden = false;
    }
    function showMe() {
      const el = tgtEl();
      if (!el) return;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const r = el.getBoundingClientRect(), s = safeBox(), avail = s.bottom - s.top;
      const want = r.height <= avail ? s.top + (avail - r.height) / 2 : s.top; // centre it, or show its top
      if (Math.abs(r.top - want) > 8) window.scrollTo({ top: window.scrollY + r.top - want, behavior: reduce ? 'auto' : 'smooth' });
      el.classList.remove('hwo-hl'); void el.offsetWidth; el.classList.add('hwo-hl');
      later(() => el.classList.remove('hwo-hl'), 1900);
    }

    // ───── dialogs (shown inside the widget, next to the button that opened them) ─────
    function focusDlg() {
      const box = root.querySelector('.hwo-dlg');
      if (!box) return;
      const r = box.getBoundingClientRect(), s = safeBox();
      if (r.top < s.top || r.bottom > s.bottom) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const b = box.querySelector('.btn.primary') || box.querySelector('.btn');
      if (b) b.focus({ preventScroll: true });
    }
    function keepRet() {
      if (dlg) return;
      const a = document.activeElement, f = a && root.contains(a) ? a.getAttribute('data-f') : null;
      if (f && !/^dlg-/.test(f)) retF = f;
    }
    function openDlg(o) { keepRet(); dlg = o; render(); if (o.cap) say(o.cap, o.capK || 'info', o.capO); focusDlg(); }
    function closeDlg() {
      dlg = null; render();
      const a = document.activeElement;
      if (retF && (!a || a === document.body || !root.contains(a))) { const n = root.querySelector('[data-f="' + retF + '"]'); if (n) n.focus({ preventScroll: true }); }
    }
    const cancelBtn = (txt) => ({ l: 'Cancel', esc: true, fn: () => { closeDlg(); say(txt || 'Cancelled: nothing was loaded. The PLC is unchanged.', 'info'); } });
    function paintProg() {
      const p = dlg && dlg.prog;
      if (!p) return;
      const pct = Math.round(((p.i + 1) / p.lines.length) * 100), bar = root.querySelector('.hwo-bar'), pl = root.querySelector('.hwo-pl');
      if (bar) { bar.setAttribute('aria-valuenow', pct); bar.firstChild.style.width = pct + '%'; }
      if (pl) pl.textContent = p.lines[p.i] + ' · ' + pct + ' %';
    }
    function runProgress(slot, title, lines, dir, done) {
      keepRet();
      dlg = { slot, title, dir, prog: { lines, i: 0 } };
      render(); focusDlg();
      const tick = () => {
        if (!dlg || !dlg.prog) return;
        if (dlg.prog.i >= lines.length - 1) { dlg = null; done(); if (!dlg) render(); return; }
        dlg.prog.i++;
        paintProg();
        later(tick, 430);
      };
      later(tick, 430);
    }

    // ───── actions: project ─────
    function compile() {
      const B = br();
      if (st.typo) {
        st.seen = true; render();
        return say(`${B.compile} found <b>1 error</b>: rung 2 uses the tag <b>"Motor_Rnu"</b>, and no tag has this name. The compiler checks every name, so a program with errors never goes to the PLC.`, 'bad',
          { show: 'prog', more: `It is a typo of Motor_Run (look at rung 2, it is underlined in red). Click <b>Fix the typo</b>, then <b>${B.compile}</b> again.` });
      }
      if (compiled()) return say(`Already ${B.compile === 'Build' ? 'built' : B.compile === 'Verify' ? 'verified' : 'compiled'}: nothing changed since last time, so there are still 0 errors.`, 'info');
      st.ck = pkey(); st.done.compile = true; render();
      say(`${B.compile}: <b>0 errors</b>. Your ladder is now code that the ${B.cpu} can run.`, 'ok',
        { show: 'proj', more: `Every block now has a checksum (#…): a fingerprint that changes with every change. Later, ${B.cmp} uses these fingerprints. Next: <b>${dlName()}</b>.` });
    }
    function fix() {
      st.typo = false; render();
      // the Fix button is gone now: keep the keyboard on the next step
      const c = root.querySelector('[data-f="compile"]');
      if (c) c.focus({ preventScroll: true });
      say(`Fixed: rung 2 now reads <b>Motor_Run</b>. The project changed, so you must ${br().compile.toLowerCase()} it again.`, 'info',
        { show: 'prog', more: `Every change makes a new checksum, so the project is "not compiled" again. Click <b>${br().compile}</b>.` });
    }

    // ───── download: compile check → night-shift trap → STOP or RUN → progress → start? ─────
    function hwRule() {
      const B = br();
      return `Logic changes can usually load in ${B.runW}. Hardware configuration changes usually need ${B.stopW}: ` +
        (st.brand === 'rock' ? 'Studio 5000 can add some modules online, but a new card in the local chassis is usually loaded in Program mode.' : `some systems can add I/O in ${B.runW}, but plan a stop.`);
    }
    function download(slot) {
      const B = br();
      if (st.typo) {
        st.seen = true; render();
        return say(`Download is impossible: ${B.compile} found <b>1 error</b> ("Motor_Rnu" is not defined in rung 2). The PLC never gets a program with errors.`, 'bad',
          { show: 'prog', more: 'Click <b>Fix the typo</b> first.' });
      }
      let auto = '';
      if (!compiled()) { st.ck = pkey(); st.done.compile = true; auto = `First, ${dlName()} ran <b>${B.compile}</b> for you: 0 errors.`; }
      const d = diffs();
      if (has() && !d.length) { render(); return say('Nothing to download: the project and the PLC are already equal.', 'info', auto ? { more: auto } : null); }
      if (has() && st.plc.fb > st.proj.fb) {
        // The real tools are often silent here. The simulator stops you, and says so honestly.
        return openDlg({ slot, kind: 'bad', capK: 'bad', cap: `Stop! This simulator found a different FB_Motor in the PLC. Real tools often load without asking: always ${B.cmp} first.`,
          capO: { more: (auto ? auto + ' ' : '') + 'Read the box: it also says what the real tool does.' },
          title: 'Warning: the PLC has a newer block',
          text: "The PLC has a newer FB_Motor. Downloading will overwrite the night shift's fix.",
          why: `Your file: FB_Motor v${st.proj.fb}, saved yesterday 17:10. The PLC: FB_Motor v${st.plc.fb}, changed by the night shift at 03:40.<br><b class="hwo-rl">Real life:</b> ${B.trap}`,
          btns: [{ l: 'Cancel', primary: true, esc: true, fn: () => { closeDlg(); say(`Good choice: never download over a change that you do not know. First take the PLC version into your project with <b>${B.upload}</b>.`, 'ok', { show: 'tools' }); } },
            { l: 'Overwrite anyway', danger: true, fn: () => dl2(slot, d, true, '') }] });
      }
      dl2(slot, d, false, auto);
    }
    function dl2(slot, d, over, auto) {
      const B = br(), first = !has(), hwCh = !first && d.indexOf('hw') >= 0, running = st.mode === 'run';
      const capO = auto ? { more: auto } : null;
      if (!first && !hwCh && st.brand === 'tia') {
        if (!running) return loadPlc(slot, d, false, over, auto);
        return openDlg({ slot, kind: 'info', cap: 'Only logic changed, so the CPU may stay in RUN. Read the load preview in the box.', capO, title: 'Load preview',
          text: `Only program blocks changed (${list(d)}). The CPU can stay in RUN: the machine keeps running.`,
          why: 'A logic change can be loaded between two scans: the CPU swaps the blocks and goes on.',
          btns: [{ l: 'Download in RUN', primary: true, fn: () => loadPlc(slot, d, false, over) }, cancelBtn()] });
      }
      if (!first && !hwCh && st.brand === 'cds' && running) {
        // already logged in: Online → Online change / Download. Not logged in: the Login dialog asks.
        const oL = online ? 'Online change' : 'Login with online change', dL = online ? 'Download' : 'Login with download';
        return openDlg({ slot, kind: 'info', cap: 'Only code changed. CODESYS asks how you want to load it.', capO, title: 'The application in the PLC is different',
          text: `Only code changed (${list(d)}). How do you want to load it?`,
          why: `<b>${oL}</b> loads only the change, and the application keeps running. <b>${dL}</b> loads everything and needs STOP.`,
          btns: [{ l: oL, primary: true, fn: () => loadPlc(slot, d, false, over) }, { l: dL + ' (STOP)', fn: () => loadPlc(slot, d, true, over) }, cancelBtn()] });
      }
      const why = first ? `This is the first download. The PLC gets the hardware configuration and all blocks, and it can build its I/O map only in ${B.stopW}.`
        : hwCh ? (st.brand === 'rock' ? 'The I/O configuration changed (a new card). A download in Studio 5000 always needs Program mode. Studio 5000 can add some modules online, but a new card in the local chassis is usually loaded in Program mode.'
          : `The hardware configuration changed (a new card). The ${B.cpu} must rebuild its I/O map, and it cannot do that while it controls the machine. Some systems can add I/O in RUN, but plan a stop.`)
          : st.brand === 'rock' ? 'Studio 5000 downloads only in Program mode. To change logic while the machine runs, use online edits (see Online change below).'
            : `${dlName()} replaces the whole application, so the application must stop.`;
      openDlg({ slot, kind: 'warn', capK: 'warn', cap: `This download needs ${B.stopW}. Read why in the box.`, capO, title: `This download needs ${B.stopW}`,
        text: running ? `${B.cpuThe} must go to ${B.stopW} for this download: the machine will stop.` : `${B.cpuThe} must be in ${B.stopW} for this download. It is already in ${B.stopW}, so nothing stops.`, why,
        btns: [{ l: running ? 'Stop and download' : 'Download', primary: true, fn: () => loadPlc(slot, d, true, over) }, cancelBtn()] });
    }
    function loadPlc(slot, d, stop, over, auto) {
      const B = br(), first = !has(), prevOl = first ? false : st.plc.ol, hwCh = d.indexOf('hw') >= 0;
      const wasRun = st.mode === 'run', inRun = wasRun && !stop; // texts follow the real mode, not the button
      const lines = [];
      if (stop && wasRun) lines.push(`${B.cpu} → ${B.stopW}: outputs off`);
      ['hw', 'main', 'fb', 'db'].filter((k) => first || d.indexOf(k) >= 0).forEach((k) => lines.push('Loading ' + nameOf(k)));
      lines.push('Checking: done');
      if (stop) setMode('stop');
      const capO = auto ? { more: auto } : null;
      if (inRun) say('Downloading in RUN: only the changed blocks travel to the PLC. The machine keeps running.', 'info', capO);
      else if (wasRun) say(`Downloading: the ${B.cpu} went to ${B.stopW}, so the machine stopped and all outputs are off.`, 'warn', capO);
      else if (stop) say(`Downloading: your project travels from the laptop to the PLC. The ${B.cpu} is in ${B.stopW}, so the machine is not running.`, 'info', capO);
      else say(`Only the changed blocks travel to the PLC. The ${B.cpu} is in ${B.stopW}, so the machine is not running.`, 'info', capO);
      runProgress(slot, inRun ? 'Downloading in RUN' : `Downloading (${B.cpu} in ${B.stopW})`, lines, 'dl', () => {
        st.plc = { ol: st.proj.ol, fb: st.proj.fb, hw: st.proj.hw, src: false };
        snap(); // the laptop knows what it just loaded
        if (st.brand !== 'tia') online = true;
        if (over) st.night = 3;
        norm();
        const newOl = !prevOl && st.plc.ol;
        const lost = over ? "<b>The night shift's fix is gone:</b> FB_Motor in the PLC is the old v1 again, without the overload alarm." : '';
        const lostMore = over ? `Next time the motor overheats there is no alarm, and nobody knows why. Lesson: always <b>${B.cmp}</b> before you download. (Reset to try this part again.)` : '';
        if (st.mode === 'run') {
          let t, more = '';
          if (newOl) {
            st.done.oc = true;
            t = st.brand === 'cds' ? 'Online change done: CODESYS loaded only the changed code, between two PLC cycles. The application kept running.'
              : `Loaded in RUN: the CPU swapped ${B.main} between two scans, and the machine never stopped. That is an online change.`;
            more = hwRule() + (st.brand === 'cds' ? ' The online change also kept all variable values.' : '');
          } else t = 'Loaded in RUN: the machine kept running.';
          render();
          return say(lost ? lost + ' ' + t : t, over ? 'bad' : 'ok', { show: newOl ? 'prog' : 'plc', more: [lostMore, more].filter(Boolean).join(' ') });
        }
        const msg = first ? 'All blocks and the hardware configuration are in the PLC.' : hwCh ? 'The new hardware configuration and the blocks are in the PLC.' : 'The program is in the PLC.';
        openDlg({ slot, kind: 'info', title: wasRun ? B.startQ2 : B.startQ, text: `${msg} ${B.cpuThe} is in ${B.stopW}: all outputs are off.`, why: 'Before you start: look at the machine. Is everybody clear?',
          btns: [{ l: B.startYes, primary: true, fn: () => startAfter(first, hwCh, !!lost) }, { l: B.startNo, esc: true, fn: () => { closeDlg(); say(`${B.cpuThe} stays in ${B.stopW}. Start it later with <b>${B.start}</b> (online) or with the switch on the ${B.cpu}.`, 'info', { show: 'plc' }); } }] });
        if (lost) say(lost, 'bad', { show: 'plc', more: lostMore });
        else if (newOl) say(`${msg} This was a download in ${B.stopW}, not an online change: ${wasRun ? 'the machine stopped' : 'the machine was not running'}.`, 'warn', { show: 'oc', more: 'To practise the real online change, click <b>Practise the online change again</b> in the Online change section.' });
        else say(`${msg} Now decide: start the ${B.cpu}?`, 'info');
      });
    }
    function startAfter(first, hwCh, lost) {
      const B = br();
      closeDlg();
      if (!swSoft()) return say(`${B.cpuThe} cannot start: the ${st.brand === 'rock' ? 'key' : 'switch'} on the ${B.cpu} is on ${B.swL[st.sw]}. Turn it to ${st.brand === 'rock' ? 'REM' : 'RUN'}.`, 'warn', { show: 'plc' });
      setMode('run'); render();
      const watch = online ? 'You are online: press <b>START</b> under the rungs and watch.' : `You are still offline: click <b>${B.online}</b> to watch the program.`;
      if (lost) return say(`${B.runW} again, but without the night shift's fix.`, 'warn', { show: 'plc', more: 'Press Reset to practise the right way: Upload.' });
      if (hwCh && !first) return say(`${B.runW} again, with the new card. Logic changes can usually load in ${B.runW}, but hardware changes usually need ${B.stopW}.`, 'ok', { show: 'plc', more: hwRule() });
      say(`${B.runW}: ${B.runLed}. The ${B.cpu} now reads the inputs, runs the program and writes the outputs, again and again.`, 'ok',
        { show: 'plc', more: (first ? `Why did this download need ${B.stopW}? The ${B.cpu} got a new hardware configuration and all blocks, and it can build them only while it does not control the machine. ` : '') + watch });
    }

    // ───── actions: connection ─────
    function toggleOnline() {
      const B = br();
      if (online) {
        let extra = '';
        // Studio 5000 drops unfinished online edits. CODESYS keeps the change in the project for the next Login.
        if (ocMid() && st.brand === 'rock') { cancelOc(); extra = ' Your unfinished online edits were cancelled.'; }
        online = false; render();
        const off = st.brand === 'cds' ? 'Logged out' : 'Offline';
        if (st.forced) return say(`${off}. <b>Careful:</b> the force is still active in the PLC, and the ${B.forceLed} LED keeps warning everybody.${extra}`, 'warn', { show: 'plc', more: 'The PLC keeps running the machine on its own: offline does not mean stopped.' });
        return say(`${off}. The PLC keeps running the machine on its own: offline does not mean stopped.${extra}`, 'info',
          { show: 'plc', more: st.brand === 'cds' && ocMid() ? 'Your change to rung 1 stays in the project. At the next Login, you can load it with an online change.' : 'Offline, the PLC panel shows the last values the laptop saw. If somebody changes the PLC now, you see it only when you go online again.' });
      }
      online = true; render();
      if (!has()) return say(`Online, but the PLC is empty: there is nothing to watch yet. <b>${dlName()}</b> first.`, 'info', { show: 'plc' });
      const d = diffs();
      if (!d.length) return say(`Online: the laptop now shows what the PLC really runs, and all blocks are equal ✓. ${st.mode === 'run' ? 'Green lines show where power flows: press <b>START</b> under the rungs.' : `The ${B.cpu} is in ${B.stopW}, so no power flows.`}`, 'ok', { show: st.mode === 'run' ? 'prog' : 'duo' });
      say(`Online, but ${d.length} block${d.length > 1 ? 's are' : ' is'} different (orange ≠): the PLC does not run exactly your project. Click <b>${B.cmp}</b> to see what.`, 'warn',
        { show: 'duo', more: st.brand === 'rock' ? 'Real Studio 5000 asks right away: Upload or Download?' : st.brand === 'cds' ? 'Real CODESYS asks right away: login with online change, with download, or without change?' : '' });
    }
    function diffTxt(k) {
      const B = br();
      if (k === 'fb') return newer('fb') === 'plc' ? `<b>FB_Motor</b>: the PLC copy changed at 03:40, your file yesterday 17:10. Do not download: <b>${B.upload}</b> to keep it.` : '<b>FB_Motor</b> is different.';
      if (k === 'main') return newer('main') === 'plc' ? `<b>${B.main}</b>: the PLC copy has a change that your file does not have.` : `<b>${B.main}</b>: you changed your file (rung 1 has a new overload contact).`;
      if (k === 'hw') return `<b>${B.hw}</b>: your project has a new card. Download it (needs ${B.stopW}).`;
      return '<b>DB_Settings</b> is different.';
    }
    function compare() {
      const B = br();
      if (!has()) return say(`${B.cmp}: the PLC is empty, so every block exists only in your project. <b>${dlName()}</b> first.`, 'warn', { show: 'duo' });
      flashCmp = true;
      const d = diffs();
      if (!d.length) { st.done.equal = true; render(); return say(`${B.cmp}: all 4 are equal ✓ (same checksums). What runs in the PLC is exactly your project, so now it is safe to change it and download.`, 'ok', { show: 'duo' }); }
      render();
      say(`${B.cmp}: ${d.length} different (orange ≠). ${diffTxt(d[0])}`, 'warn',
        { show: 'duo', more: d.slice(1).map(diffTxt).join(' ') + (d.indexOf('fb') >= 0 && newer('fb') === 'plc' ? ' Compare only says "different". The time stamps tell you who changed it last.' : '') });
    }
    function upload() {
      const B = br();
      if (st.brand === 'cds' && !st.plc.src) return say('<b>Source upload</b> is not possible: nobody stored the project source on this PLC.', 'bad', { more: 'The PLC holds only compiled code, and CODESYS cannot turn it back into a project. (Online → Source download stores the source on the PLC.)' });
      const d = diffs();
      if (!d.length) return say('Nothing to upload: the PLC has exactly the same blocks as your project.', 'info');
      const mine = d.filter((k) => newer(k) === 'proj');
      if (mine.length) {
        return openDlg({ slot: 'tools', kind: 'warn', capK: 'warn', cap: 'Careful: your project has changes that are not in the PLC yet.', title: 'Upload replaces your changes',
          text: `Your project has changes that are not in the PLC: ${list(mine)}. Upload will replace them with the PLC version.`,
          why: 'Upload copies the PLC into your project. Load your own changes first, or accept that you lose them.',
          btns: [{ l: 'Cancel', primary: true, esc: true, fn: () => { closeDlg(); say('Cancelled: your project is unchanged.', 'info'); } }, { l: 'Upload anyway', danger: true, fn: () => up2(d) }] });
      }
      up2(d);
    }
    function up2(d) {
      const B = br();
      say('Uploading: the blocks travel from the PLC back to your laptop. The PLC keeps running.', 'info');
      runProgress('tools', 'Uploading from the PLC', d.map((k) => 'Reading ' + nameOf(k)).concat(['Checking: done']), 'ul', () => {
        const gotNight = st.proj.fb < st.plc.fb;
        st.proj = { ol: st.plc.ol, fb: st.plc.fb, hw: st.plc.hw };
        st.typo = false; st.ck = pkey();
        if (st.brand === 'rock') st.oc = 0;
        norm();
        if (gotNight && st.night === 1) { st.night = 2; st.done.night = true; }
        render();
        say(gotNight ? `${B.upload}: FB_Motor v2 from the night shift is now in your project, and both copies are equal ✓. The fix is safe: save the project and tell the team.` : `${B.upload} done: your project now has the PLC version, and both copies are equal ✓.`, 'ok',
          { show: 'proj', more: gotNight && st.brand === 'cds' ? 'It worked only because the night shift stored the source on the PLC (Source download).' : '' });
      });
    }

    // ───── actions: PLC ─────
    function cpuBtn() {
      const B = br();
      if (st.mode === 'run') { setMode('stop'); render(); return say(`${B.stopW}: the ${B.cpu} stops the scan and switches all outputs off. The machine stops, and your laptop did this through the cable.`, 'warn', { show: 'plc' }); }
      setMode('run'); render();
      say(`${B.runW}: the ${B.cpu} reads the inputs, runs the program and writes the outputs, again and again. Press <b>START</b> under the rungs and watch the green power flow.`, 'ok', { show: 'prog' });
    }
    function force() {
      const B = br();
      if (st.forced) {
        st.forced = false; if (st.done.forceSet) st.done.force = true; render();
        return say(`All forces removed: the output follows the program again, and the ${B.forceLed} LED is off. Always check this LED before you leave a machine.`, 'ok', { show: 'plc' });
      }
      const already = rt.motor && runs();
      const tiaP = st.brand === 'tia' ? ' <b>:P</b> = the real output terminal, not the process image.' : '';
      const rock2 = st.brand === 'rock' ? ' In Studio 5000 this is two steps: set the force value, then <b>Enable All I/O Forces</b>. The FORCE LED flashes while forces are installed but not enabled, and is solid when they are active.' : '';
      openDlg({ slot: 'tools', kind: 'warn', capK: 'warn', cap: 'The tool asks you to confirm: a force moves a real machine.', title: 'Force a real output?',
        text: `Forcing sets the output ${B.faddr} to ${B.T}, no matter what the program says.` + (already ? ' The motor already runs: the force keeps it on, even after STOP.' : ' The motor will start.'),
        why: 'Is everybody clear of the machine? Never force safety signals.' + tiaP + rock2,
        btns: [{ l: 'Cancel', primary: true, esc: true, fn: () => { closeDlg(); say('Cancelled: nothing was forced.', 'info'); } },
          { l: st.brand === 'rock' ? 'Install and enable force' : `Force ${B.faddr} = ${B.T}`, danger: true, fn: () => {
            const wasOn = rt.motor;
            st.forced = true; st.done.forceSet = true; closeDlg();
            const safe = 'Forcing can hurt people: never force safety signals, and always remove forces.';
            say(wasOn ? `Forced, and the ${B.forceLed} LED is on. Now press <b>STOP</b>: the motor keeps running! ${safe}`
              : `Forced: the motor runs and the ${B.forceLed} LED is on, but the program says OFF. ${safe}`, 'warn',
              { show: 'prog', more: `Look at rung 1: the Motor_Run coil shows what the program wants, and the F marker shows the force. The ${B.forceLed} LED warns everybody that forces are active.` + (st.brand === 'rock' ? ' In Studio 5000: solid FORCE LED = forces enabled; flashing = forces installed but not enabled.' : '') });
          } }] });
    }
    function setSw(v) {
      const B = br(), K = st.brand === 'rock' ? 'key' : 'switch', K1 = K === 'key' ? 'Key' : 'Switch';
      if (v === st.sw) return say(`The ${K} is already on ${B.swL[v]}.`, 'info');
      st.sw = v;
      let t, k = 'info';
      if (v === 'stop') {
        if (st.mode === 'run') { setMode('stop'); k = 'warn'; t = `Someone turned the ${K} on the ${B.cpu} to ${B.swL.stop}: the ${B.cpu} stops and all outputs go off. The laptop cannot start it again until the ${K} is back on ${st.brand === 'rock' ? 'REM or RUN' : 'RUN'}.`; }
        else t = `${K1} on ${B.swL.stop}: the ${B.cpu} stays in ${B.stopW}, and the laptop cannot start it.`;
      } else if (v === 'run') {
        if (!has()) t = `${K1} on RUN, but the PLC is empty: there is no program, so it stays in ${B.stopW}.`;
        else if (st.mode === 'run') t = st.brand === 'rock' ? 'Key on RUN: the controller keeps running. In this position the laptop cannot change the mode, download or edit online.' : 'Switch on RUN: the CPU keeps running.';
        else { setMode('run'); k = 'ok'; t = `${K1} on RUN: the ${B.cpu} starts, and ${B.runLed}.${st.brand === 'rock' ? ' In key position RUN the laptop cannot change the mode, download or edit online.' : ''}`; }
      } else t = 'Key on REM (remote): the laptop may change the mode, download and edit online. The controller keeps its mode.';
      render(); say(t, k, { show: 'plc' });
    }
    // a push button: held = pressed with the mouse or a finger (stays closed until you let go)
    function press(which, held) {
      const B = br(), key = which === 'start' ? 'start' : 'stopP';
      if (rt[key]) return;
      const was = rt.motor;
      rt[key] = true; render();
      if (held) hold = { key, t0: Date.now() };
      else later(() => release(key), 1500);
      if (!runs()) return say(`Nothing happens: the ${B.cpu} is ${has() ? 'in ' + B.stopW : 'empty'}, so no program reads the button.`, 'warn', { show: 'plc' });
      const off = online ? '' : ' (You are offline: the machine reacts, but you cannot see the program.)';
      if (which === 'start') {
        if (was) return say(`The motor already runs: START changes nothing, because the seal-in contact holds the coil on.${off}`, 'info', { show: 'prog' });
        return say(`START pressed: the START contact closes and Motor_Run turns on. When you let go, the seal-in contact (lower branch) keeps the coil on.${off}`, 'ok',
          { show: 'prog', more: 'Hold the button down: the START contact stays closed. Let go and watch: the power now flows through the seal-in contact.' });
      }
      if (st.forced) return say(`STOP pressed: the program switches Motor_Run off, <b>but the motor keeps running</b>, because the output is forced. This is why forcing is dangerous.${off}`, 'bad', { show: 'mach' });
      if (!was) return say(`STOP pressed: the motor was already off. The input ${B.addr.stop} goes to ${B.F} only while you press.${off}`, 'info', { show: 'prog' });
      say(`STOP pressed: the NC button opens, so ${B.addr.stop} goes from ${B.T} to ${B.F} and the coil drops. The seal-in is lost, so the motor stays off after you let go.${off}`, 'info', { show: 'prog' });
    }
    function release(key) { if (!rt[key]) return; rt[key] = false; render(); }
    function pressUp() {
      if (!hold) return;
      const h = hold; hold = null; lastPtr = Date.now();
      const left = 600 - (Date.now() - h.t0); // a quick tap still shows the closed contact for a moment
      if (left > 0) later(() => release(h.key), left); else release(h.key);
    }

    // ───── actions: events ─────
    function nightEv() {
      const B = br();
      st.plc.fb = 2; st.plc.src = true; st.night = 1; render();
      say(`03:40: the night shift changed <b>FB_Motor</b> in the PLC, and nobody told you. ${online ? 'You are online, so FB_Motor turned orange ≠.' : 'You are offline, so your laptop still shows the old values.'}`, 'warn',
        { show: online ? 'duo' : 'plc', more: `Why? Last night the overload relay tripped, but the PLC did not see it and showed no alarm. So the night shift added an overload alarm inside FB_Motor. How? ${B.night} Your project still has the old FB_Motor v1.` + (online ? '' : ` Click <b>${B.online}</b> and <b>${B.cmp}</b> to find out.`) });
    }
    function hwEv() {
      const B = br();
      st.proj.hw = 2; render();
      say(`You added a new analog input card to the ${B.hw} in your project. Your project is now newer than the PLC, and the next download needs ${B.stopW}.`, 'info', { show: 'proj', more: 'The electrician plugs the card in during the next stop.' });
    }
    function ocStep(k) {
      const B = br();
      if (k === 'start') { st.oc = 1; render(); return say('Start pending edits: Studio 5000 makes a copy of rung 1 that you can edit (dashed). The controller still runs the old rung.', 'info', { show: 'prog' }); }
      if (k === 'add') {
        st.proj.ol = true;
        if (st.brand === 'rock') st.oc = 2;
        render();
        const nx = st.brand === 'tia' ? 'Next: <b>Download changes in RUN</b>.' : st.brand === 'rock' ? 'Next: <b>Accept pending edits</b>.' : 'Next: <b>Online change</b>.';
        return say(st.brand === 'tia' ? 'You added the OL_OK contact in your project (the dashed rung). The PLC still runs the old rung 1 until you download.'
          : st.brand === 'rock' ? 'The new OL_OK contact is a pending edit: it exists only on your laptop. The controller still runs the old rung.'
            : `You changed ${B.main} while logged in (the dashed rung). The PLC still runs the old code until the online change.`, 'info', { show: 'prog', more: OC_WHY + ' ' + nx });
      }
      if (k === 'dl') return download('oc');
      if (k === 'oc') {
        say('Online change: CODESYS builds the project and sends only the changed code. The application keeps running.', 'info');
        return runProgress('oc', 'Online change', ['Build: 0 errors', 'Loading the changed code: ' + B.main, 'Switching between two cycles', 'Done'], 'dl', () => {
          st.plc.ol = true; snap(); st.ck = pkey(); st.done.oc = true; norm(); render();
          say('Online change done: CODESYS loaded only the changed code, between two PLC cycles. The application kept running and kept its variable values.', 'ok', { show: 'prog', more: hwRule() });
        });
      }
      if (k === 'accept') {
        say('Accept: Studio 5000 verifies the edit and sends it to the controller. The old rung keeps running.', 'info');
        return runProgress('oc', 'Accept pending edits', ['Verify: 0 errors', 'Sending the edit to the controller', 'Done'], 'dl', () => {
          st.oc = 3; st.ck = pkey(); render();
          say('Accepted: the controller now holds the old AND the new rung 1, but it still runs the old one.', 'info', { show: 'prog', more: 'Next: <b>Test edits</b>.' });
        });
      }
      if (k === 'test') { st.plc.ol = true; st.oc = 4; render(); return say('Test edits: the controller now runs the NEW rung 1, with OL_OK. If something is wrong, Untest goes back to the old rung at once.', 'info', { show: 'prog', more: 'Next: <b>Assemble edits</b>. It deletes the old rung.' }); }
      if (k === 'assemble') { st.oc = 5; st.done.oc = true; render(); return say('Assembled: the new rung is permanent, and the machine never stopped. That is an online change.', 'ok', { show: 'prog', more: hwRule() }); }
    }
    // the contact went in with the CPU stopped: undo it, so the learner can try the real online change
    function ocRetry() {
      st.proj.ol = false; if (st.plc) st.plc.ol = false; if (st.last) st.last.ol = false;
      st.oc = 0; st.ck = pkey(); norm(); render();
      say(`The overload contact was removed from the project and from the PLC again (as if a colleague undid it). ${runs() ? 'Try again, and this time load it in RUN.' : `Start the ${br().cpu} and try again: this time load it in RUN.`}`, 'info', { show: 'oc' });
    }
    function setBrand(k) {
      if (!BR[k] || k === st.brand) return;
      let extra = '';
      if (ocMid()) { cancelOc(); extra = ' Your unfinished online change was cancelled: each tool does it its own way.'; }
      if (k === 'rock' && st.sw === 'run') st.sw = 'rem';
      else if (k !== 'rock' && st.sw === 'rem') st.sw = 'run';
      st.brand = k; st.oc = 0; norm(); render();
      say(br().words + extra, 'info', { show: 'tools', more: br().wordsMore });
    }
    function askReset() {
      if (dlg && dlg.prog) return say('Wait a moment: the transfer is still running.', 'warn');
      const n = checks().filter((c) => c.ok).length;
      if (n < 3) return reset();
      openDlg({ slot: 'check', kind: 'warn', capK: 'warn', cap: `Reset deletes your ${n} ticks. Answer in the box.`, title: 'Start again from the beginning?',
        text: `Reset deletes all your ticks (${n} done). The project, the PLC and the checklist go back to the start.`,
        btns: [{ l: 'Cancel', primary: true, esc: true, fn: () => { closeDlg(); say('Reset cancelled: your ticks are kept.', 'info'); } }, { l: 'Yes, reset', danger: true, fn: reset }] });
    }
    function reset() {
      timers.forEach(clearTimeout); timers = [];
      try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
      st = fresh(st.brand); online = false; dlg = null; hold = null;
      rt.start = false; rt.stopP = false; rt.motor = false;
      render();
      const a = document.activeElement;
      if (!a || a === document.body || !root.contains(a)) { const r = root.querySelector('[data-f="reset"]'); if (r) r.focus({ preventScroll: true }); }
      say(`Start state: your project has a typo, the PLC is empty and in ${br().stopW}, and you are offline. Click <b>${br().compile}</b>.`, 'info', { show: 'tools' });
    }

    // ───── events ─────
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !root.contains(b)) return;
      const act = b.dataset.act;
      if (act === 'more') return toggleMore(b);
      if (act === 'show') return showMe();
      if (act === 'dlg') { const x = dlg && dlg.btns && dlg.btns[+b.dataset.i]; if (x) x.fn(); return; }
      if (act === 'reset') return askReset();
      if (act === 'press' && Date.now() - lastPtr < 800) return; // already handled by pointerdown / pointerup
      if (dlg) { say(dlg.prog ? 'Wait a moment: the transfer is still running.' : ANS, 'warn'); focusDlg(); return; }
      if (b.getAttribute('aria-disabled') === 'true') return say(esc(b.dataset.why || 'Not possible right now.'), 'warn');
      if (act === 'brand') setBrand(b.dataset.b);
      else if (act === 'compile') compile();
      else if (act === 'fix') fix();
      else if (act === 'download') download('tools');
      else if (act === 'online') toggleOnline();
      else if (act === 'compare') compare();
      else if (act === 'upload') upload();
      else if (act === 'cpu') cpuBtn();
      else if (act === 'force') force();
      else if (act === 'sw') setSw(b.dataset.v);
      else if (act === 'press') press(b.dataset.k, false);
      else if (act === 'night') nightEv();
      else if (act === 'hw') hwEv();
      else if (act === 'oc') ocStep(b.dataset.k);
      else if (act === 'ocretry') ocRetry();
      else if (act === 'occancel') { cancelOc(); render(); say('Online change cancelled: the PLC runs the old rung 1, and your project is back to the PLC version.', 'info', { show: 'prog' }); }
    });
    // push buttons: pressed while the mouse button or the finger is down
    root.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-act="press"]');
      if (!b || e.button > 0 || dlg || b.getAttribute('aria-disabled') === 'true') return; // the click explains why not
      lastPtr = Date.now();
      press(b.dataset.k, true);
    });
    root.addEventListener('contextmenu', (e) => { if (e.target.closest('.hwo-pb')) e.preventDefault(); });
    // Escape = the dialog's Cancel button
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !dlg || dlg.prog || !dlg.btns) return;
      const x = dlg.btns.filter((y) => y.esc)[0];
      if (x) { e.preventDefault(); x.fn(); }
    });

    ph.replaceWith(root);
    // narrow layout (phones): decided by the widget's own width, not by the window
    function fit() { if (!root.isConnected) return cleanup(); root.classList.toggle('hwo-narrow', root.clientWidth < 600); }
    let rafS = 0;
    function onScroll() {
      if (!root.isConnected) return cleanup();
      if (!capShow || rafS) return;
      rafS = requestAnimationFrame(() => { rafS = 0; if (root.isConnected) showArrow(); });
    }
    function onUp() { if (!root.isConnected) return cleanup(); pressUp(); }
    // the lesson page can be left and opened again: the old widget must let go of the window
    function cleanup() {
      if (ro) ro.disconnect();
      ro = null;
      window.removeEventListener('resize', fit);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      timers.forEach(clearTimeout); timers = [];
    }
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(root); }
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    if (st.brand === 'rock' && ocMid()) cancelOc(); // Studio 5000: unfinished online edits are dropped when you go offline
    render();
    const B0 = br();
    if (restored && (has() || st.done.compile)) {
      say(has() ? `Welcome back: your progress is restored. You are offline now, and the PLC kept its program (${modeL()}).${st.forced ? ' <b>Careful:</b> a force is still active.' : ''}`
        : `Welcome back: your progress is restored. You are offline, and the PLC is still empty and in ${B0.stopW}.`, st.forced ? 'warn' : 'info',
      { more: 'The laptop disconnects when you leave the page. The PLC does not need the laptop to run.' });
    } else say(`Start here: your project is on the laptop, and the PLC is empty and in ${B0.stopW}. Click <b>${B0.compile}</b>.`, 'info');
    capEl.classList.remove('flash');
  };
})();
