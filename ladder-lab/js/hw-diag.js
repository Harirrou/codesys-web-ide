/* Ladder Lab — CPU diagnostics simulator. Mounted in lessons through [[hw:diag]] (LL.HW.diag).
 * Five calls from the night shift. The learner sees the CPU front (LEDs, mode switch, display), the I/O modules
 * and a remote I/O station with their own LEDs, the program, and the diagnostic buffer (newest first, with time,
 * event text and "help on event"). For each fault: read the buffer, name the cause, apply the right fix,
 * restart (STOP → RUN) and see RUN green. Words follow the tool: TIA Portal (diagnostic buffer, OB82 / OB86 /
 * OB121 / OB80), Studio 5000 (major / minor faults with Type / Code, module connection codes), CODESYS (PLC log,
 * exceptions, task watchdog). Faults: (1) wire break on an analog input, (2) array index out of range,
 * (3) endless loop → watchdog, (4) remote I/O station lost, (5) a forgotten force (MAINT / FORCE LED). */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-diag';
  let uidN = 0;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // keep device ids (-X4:5, -B20), addresses and fault codes on one line
  const nw = (s) => esc(s)
    .replace(/(^|[\s(])(-[A-Z][0-9A-Z]*(?::[0-9/]+)?)/g, '$1<span class="hwd-nw">$2</span>')
    .replace(/(Type \d+ Code \d+|16#[0-9A-F]+|OB\d+|%[IQ][XW]?\d+(?:\.\d)?|\(?\d+ … \d+\)?)/g, '<span class="hwd-nw">$1</span>');
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ───────────── the words of each tool ─────────────
  const BR = {
    tia: {
      name: 'TIA Portal', seg: ['Siemens', 'TIA'], cpu: 'CPU 1516-3 PN', ps: 'PM 70W', di: 'DI 16', dq: 'DQ 16', ai: 'AI 4xI',
      leds: ['RUN/STOP', 'ERROR', 'MAINT'], sw: { stop: 'STOP', run: 'RUN' },
      buf: 'Diagnostic buffer', where: 'TIA Portal: Online & diagnostics → Diagnostics → Diagnostic buffer. Newest entry at the top (No. 1).',
      help: 'Help on event', net: 'PROFINET', rem: 'ET 200SP', im: 'IM 155-6', lang: 'SCL',
      ai2: '%IW68', q3: '%Q0.3', bad: 'Level_QI', badTxt: 'the value status bit (QI) of channel 2',
      restart: 'Mode switch to STOP, then back to RUN (or Online → Start CPU in TIA Portal).',
      errOB: 'error OB', wd: 150,
    },
    rockwell: {
      name: 'Studio 5000', seg: ['Rockwell', 'Studio 5000'], cpu: '1756-L63', ps: 'PA72', di: 'IB16', dq: 'OB16E', ai: 'IF8',
      leds: ['RUN', 'I/O', 'OK', 'FORCE'], sw: { stop: 'PROG', run: 'RUN' },
      buf: 'Controller faults & log', where: 'Studio 5000: Controller Properties → Major Faults / Minor Faults (and the Controller Log). A module fault: Module Properties → Connection. Newest at the top here.',
      help: 'Fault help', net: 'EtherNet/IP', rem: 'Point I/O', im: '1734-AENTR', lang: 'ST routine',
      ai2: 'Local:3:I.Ch2Data', q3: 'Local:2:O.Data.3', bad: 'Local:3:I.Ch2Fault', badTxt: 'the fault bit Local:3:I.Ch2Fault',
      restart: 'Key switch to PROG, then back to RUN: this clears the major fault (or Clear Majors in Controller Properties).',
      errOB: 'fault routine', wd: 500,
    },
    codesys: {
      name: 'CODESYS', seg: ['CODESYS', ''], cpu: 'CODESYS PLC', ps: 'PSU 24V', di: 'DI 16', dq: 'DQ 16', ai: 'AI 4',
      leds: ['RUN', 'ERR', 'FORCE'], sw: { stop: 'STOP', run: 'RUN' },
      buf: 'PLC log', where: 'CODESYS: double-click the device → Log tab. Newest at the top here.',
      help: 'Log details', net: 'EtherCAT', rem: 'EtherCAT I/O', im: 'Coupler', lang: 'ST',
      ai2: '%IW34', q3: '%QX0.3', bad: 'AI_Ch2_Error', badTxt: 'the channel error bit AI_Ch2_Error',
      restart: 'Switch to STOP, then back to RUN (in the IDE after an exception: Reset warm, then Start).',
      errOB: 'exception handler', wd: 100,
    },
  };
  const BKEYS = ['tia', 'rockwell', 'codesys'];
  const P = (b, t, r, c) => (b === 'rockwell' ? r : b === 'codesys' ? c : t);

  // ───────────── diagnostic entries (text per tool) ─────────────
  // lv: err (red) / warn (yellow) / info / ok (outgoing = gone). key: an entry that names the problem.
  const EV = {
    pon: (b) => ({ lv: 'info', t: P(b, 'Power on: CPU startup (warm restart)', 'Controller Log: power up in Remote Run mode', 'Boot application loaded'),
      h: 'A normal entry. The PLC was switched on and started its program. Nothing to fix here.' }),
    toRun: (b) => ({ lv: 'info', t: P(b, 'Mode transition: STARTUP → RUN', 'Controller Log: mode change to Run', 'Application started: state RUN'),
      h: 'A normal entry: the program runs. The interesting entries are the red and yellow ones, at the top.' }),
    swStop: (b) => ({ lv: 'info', t: P(b, 'Mode transition: → STOP (mode switch)', 'Controller Log: mode change to Program (key switch PROG)', 'Application stopped (STOP switch)'),
      h: 'You moved the mode switch to STOP. In STOP the program does not run and the outputs are off.' }),
    swRun: (b, x) => ({ lv: 'info', t: P(b, 'Mode transition: STOP → STARTUP → RUN', 'Controller Log: mode change to Run' + (x ? ', major faults cleared' : ''), x ? 'Reset warm, application started: state RUN' : 'Application started: state RUN'),
      h: 'You moved the mode switch back to RUN. The CPU starts the program again. ' + P(b, 'TIA Portal can do the same with Online → Start CPU.', 'Going from PROG to RUN with the key also clears the major faults. Studio 5000 can do it with Clear Majors.', 'After an exception, the IDE needs Reset warm and then Start.') }),
    // 1 · wire break on the analog input
    wb: (b) => P(b,
      { lv: 'err', key: 1, t: 'Diagnostic interrupt: AI 4xI (slot 4), channel 2: wire break. Incoming event',
        h: 'The card measures 0 mA on channel 2. A 4–20 mA signal is never below 4 mA when the wire is OK (4 mA is a "live zero"). So the card knows: the wire is broken. It sets the value to 32767 (7FFF hex), sets the value status bit QI to 0 (bad) and calls OB82 (diagnostic interrupt) if it exists. An S7-1500 stays in RUN, so YOUR program must check the value status. Check terminal -X4:5, the cable and the sensor -B20.' },
      { lv: 'warn', key: 1, code: 'I/O module', t: 'Module Local:3 (1756-IF8): channel 2 under range (0 mA). Local:3:I.Ch2Fault = 1',
        h: 'This is not a controller fault: the controller stays in Run. The module marks the channel: Ch2Fault = 1 and Ch2Underrange = 1, and the module gets a yellow triangle in the I/O tree. A 4–20 mA signal is never below 4 mA when the wire is OK (4 mA is a "live zero"), so 0 mA means a broken wire. YOUR program must read Ch2Fault. Check terminal -X4:5, the cable and the sensor -B20.' },
      { lv: 'warn', key: 1, t: 'I/O diagnosis: AI 4 (slot 4), channel 2: wire break. AI_Ch2_Error = TRUE',
        h: 'The application keeps running. The card reports the broken wire in its status: a red triangle in the device tree and an error bit in the I/O mapping. A 4–20 mA signal is never below 4 mA when the wire is OK (4 mA is a "live zero"), so 0 mA means a broken wire. YOUR program must read the error bit. Check terminal -X4:5, the cable and the sensor -B20.' }),
    wbOut: (b) => ({ lv: 'ok', t: P(b, 'Diagnostic interrupt: AI 4xI (slot 4), channel 2: wire break. Outgoing event', 'Module Local:3: channel 2 fault cleared. Ch2Fault = 0', 'I/O diagnosis: AI 4 (slot 4), channel 2: OK again'),
      h: 'Outgoing means: the fault is gone. The current is back in the 4–20 mA range, so the value is valid again.' }),
    // 2 · array index out of range
    idx: (b) => P(b,
      { lv: 'err', key: 1, t: 'Programming error: array index out of range. "Recipes"[Recipe_No], Recipe_No = 12, array 0 … 9. FB "Recipe_Load", network 3. OB121 not loaded',
        h: 'The operator typed recipe 12 on the HMI. The array has only 10 elements (0 … 9), so element 12 does not exist: a programming error. TIA would now call OB121 (programming error). OB121 is not in the project, so the CPU goes to STOP. The button "Open in editor" jumps right to network 3.' },
      { lv: 'err', key: 1, code: 'Major · Type 04 Code 20', t: 'Major fault Type 04 Code 20: array subscript too large. Task MainTask, program MainProgram, routine Recipe_Load, rung 3',
        h: 'Type 4 = program fault. Code 20 = an array index is outside the array (or a CONTROL .POS / .LEN is wrong). The program asked for Recipes[12], but the array has 10 elements (0 … 9). No fault routine cleared it, so the controller faulted: the program stops and the outputs go to their fault state (normally off).' },
      { lv: 'err', key: 1, t: 'Exception: access violation in task MainTask. POU Recipe_Load, line 3: Recipes[Recipe_No], Recipe_No = 12, array [0..9]',
        h: 'The index pointed outside the array, into memory that does not belong to it. The runtime stopped the application (state: Exception). A smaller overrun is even worse: no exception, just wrong data. Tip: add the POU CheckBounds (Add Object → POU for implicit checks) and you find these bugs while you test.' }),
    idxStop: (b) => ({ lv: 'err', key: 1, code: P(b, '', 'Mode', ''), t: P(b, 'STOP caused by programming error (OB121 not loaded)', 'Controller mode: Faulted (major fault). Program stopped', 'Application stopped: state Exception'),
      h: 'The CPU stopped by itself: the program does not run and the outputs are off. The REASON is in the entry just below this one (it is older). Always read the entries under a STOP.' }),
    // 3 · endless loop → cycle time / watchdog
    wd: (b) => P(b,
      { lv: 'err', key: 1, t: 'Time error: maximum cycle time exceeded (150 ms). FB "Part_Search", network 2. OB80 not loaded',
        h: 'One scan took longer than the maximum cycle time (150 ms, set in the CPU properties → Cycle). A WHILE loop waits for the input Part_Found. But the inputs are copied only BETWEEN two scans, so inside the loop the input can never change: an endless loop. OB80 (time error) is not in the project, so the CPU goes to STOP. Even with OB80: a scan that takes twice the maximum time always means STOP.' },
      { lv: 'err', key: 1, code: 'Major · Type 06 Code 01', t: 'Major fault Type 06 Code 01: task watchdog expired. Task MainTask did not finish in 500 ms',
        h: 'Type 6 = task watchdog. The task did not finish within its watchdog time (task properties: 500 ms). A WHILE loop in routine Part_Search waits for Part_Found, and the part does not come. While the loop runs, no other rung runs and no output changes. The controller faults: the program stops.' },
      { lv: 'err', key: 1, t: 'Exception: watchdog in task MainTask (watchdog 100 ms). POU Part_Search, line 2',
        h: 'The task did not finish within its watchdog time (task configuration: watchdog 100 ms, sensitivity 1). A WHILE loop waits for the input Part_Found. But the inputs are copied only at the start of the task cycle, so inside the loop the input can never change: an endless loop. The runtime stops the application (state: Exception).' }),
    wdStop: (b) => ({ lv: 'err', key: 1, code: P(b, '', 'Mode', ''), t: P(b, 'STOP caused by time error (OB80 not loaded)', 'Controller mode: Faulted (major fault). Program stopped', 'Application stopped: state Exception'),
      h: 'The CPU stopped by itself: the program does not run and the outputs are off. The REASON is in the entry just below this one (it is older). Always read the entries under a STOP.' }),
    // 4 · remote I/O station lost
    st: (b) => P(b,
      { lv: 'err', key: 1, t: 'Rack/station failure: IO device "ET200SP-3" (PROFINET device number 3) is not reachable. Incoming event',
        h: 'The CPU lost the PROFINET connection to the remote station. Its inputs read 0 and its outputs go off. An S7-1500 stays in RUN and calls OB86 (rack/station failure) if it exists. An old S7-300/400 WITHOUT OB86 would go to STOP. On the station the BF LED (bus fault) is red. Check the cable, the switch port and the 24 V of the station.' },
      { lv: 'warn', key: 1, code: 'I/O fault · 16#0203', t: 'Module Remote_Station (1734-AENTR): code 16#0203, connection timed out',
        h: 'The controller lost its EtherNet/IP connection to the Point I/O adapter. The I/O LED on the controller flashes, the module gets a yellow triangle, and its outputs go off. The controller stays in Run. Only if "Major fault on controller if connection fails while in Run mode" is ticked (Module Properties → Connection) would it fault with Type 03 Code 16. Check the cable, the switch port and the 24 V of the station.' },
      { lv: 'err', key: 1, t: 'EtherCAT: slave 1001 "Coupler_3" lost (state INIT, not OP). Its I/O is not updated',
        h: 'The EtherCAT master lost the remote coupler: a red triangle in the device tree. The application keeps running, but the I/O of that station is not updated and its outputs go off. The program can read the slave state (8 = OP = running). Check the cable, the connector and the 24 V of the coupler.' }),
    stOut: (b) => ({ lv: 'ok', t: P(b, 'Rack/station return: IO device "ET200SP-3". Outgoing event', 'Module Remote_Station: connection running again', 'EtherCAT: slave 1001 "Coupler_3" back in state OP'),
      h: 'Outgoing / running again: the station answers again. Its inputs and outputs work again.' }),
    // 5 · a forgotten force
    frc: (b) => P(b,
      { lv: 'warn', key: 1, t: 'Force job started: %Q0.3 "Conveyor_Motor" = TRUE',
        h: 'A force wins over the program: the CPU writes TRUE to %Q0.3, whatever the program says. The MAINT LED is yellow while any force is active. Somebody forced the conveyor during a repair and forgot it. Forces stay active after STOP → RUN. Where: the force table → "Stop forcing".' },
      { lv: 'warn', key: 1, code: 'Forces', t: 'I/O forces enabled: Local:2:O.Data.3 (Conveyor_Motor) forced ON',
        h: 'Forces override the program. The FORCE LED is solid amber: forces are installed AND enabled (flashing amber = installed, not enabled). Somebody forced the conveyor during a repair and forgot it. Forces stay after PROG → RUN. Where: the online toolbar → I/O Forces → Remove All. (A low battery would be a minor fault, Type 10 Code 10.)' },
      { lv: 'warn', key: 1, t: 'Forced values active: PLC_PRG.Conveyor_Motor := TRUE (forced)',
        h: 'A forced variable gets the forced value in every cycle, whatever the program writes. The online view marks it with an F. Somebody forced the conveyor during a repair and forgot it. Forces stay after STOP → RUN. Where: Debug → Unforce values.' }),
    frcOff: (b) => ({ lv: 'ok', t: P(b, 'Force job ended: all forces removed', 'I/O forces removed', 'All forced values removed'),
      h: 'No force is active now. The program controls every output again.' }),
  };

  // ───────────── the five faults ─────────────
  // causes / fixes are listed in a fixed mixed order (the right one is not always first)
  const SC = [
    {
      id: 'wire', chip: 'Level alarm', stops: false,
      story: '"The tank level on the HMI shows a crazy value and the pump stopped with a level alarm. But I can see the tank: it is half full!"',
      events: ['wb'],
      causes: [
        { id: 'full', t: 'The tank is really full (20 mA)', no: 'No: a full tank gives 20 mA, a valid value, and no diagnostic entry. The operator sees a half-full tank, and the entry says wire break.' },
        { id: 'wire', ok: 1, t: 'Wire break on AI channel 2 (0 mA)', yes: 'Right: 0 mA on a 4–20 mA input means the wire is broken. The card found it and reported it.' },
        { id: 'scale', t: 'The scaling in the program is wrong', no: 'No: the scaling worked for years. The raw value itself is wrong, and the entry tells you why: wire break.' },
        { id: 'pow', t: 'The analog card has no 24 V power', no: 'No: then all 4 channels would be in fault, and the card LEDs would be off. Only channel 2 is in fault.' },
      ],
      fixes: [
        { id: 'scale', t: 'Change the scaling to 0 … 32767', no: (b) => 'No: ' + (b === 'tia' ? '32767 is not a level. It is the card saying "invalid value".' : 'the value is not a level any more: it is invalid.') + ' A new scaling only hides the fault.' },
        { id: 'wire', need: 1, t: 'Reconnect the wire at terminal -X4:5', short: 'reconnect the wire',
          yes: 'You found a loose wire at terminal -X4:5 and tightened it. The current is back: 11.4 mA. The card reports "fault gone" (a green entry at the top), and the red LEDs go off.' },
        { id: 'card', t: 'Replace the analog card', no: 'Not needed: the card is fine. It found the broken wire and told you so. A new card would show the same fault.' },
        { id: 'prog', need: 1, t: 'Program: use the fault bit (alarm + safe state)', short: 'the program reads the fault bit',
          yes: (b) => 'Now the program checks ' + BR[b].badTxt + ' first. A bad value is not used: the HMI says "Level sensor -B20: wire break" and the pump stays off safely. The next wire break gives a TRUE alarm, not a false one.' },
      ],
      again: '',
    },
    {
      id: 'index', chip: 'Recipe 12', stops: true,
      story: '"I typed recipe 12 for the new product, and the whole machine stopped. All outputs are off, and there is a red light on the PLC."',
      events: ['idx', 'idxStop'],
      causes: [
        { id: 'dl', t: 'The recipe data was never downloaded', no: 'No: then the entry would say so. Read it again: it names the index (12) and the size of the array (0 … 9).' },
        { id: 'wd', t: 'The scan took too long (watchdog)', no: 'No: that is a different entry (time error / task watchdog). This entry is about an array index.' },
        { id: 'idx', ok: 1, t: 'Recipe_No = 12 is outside the array (0 … 9)', yes: 'Right: element 12 does not exist. The program used a number from the HMI without checking it.' },
        { id: 'hmi', t: 'The cable to the HMI is broken', no: 'No: the value 12 came from the HMI without a problem. The value itself is the problem.' },
      ],
      fixes: [
        { id: 'big', t: 'Make the array bigger: 0 … 99', no: 'Not enough: next time the operator types 120. Check EVERY index that comes from outside (HMI, network, calculation).' },
        { id: 'ob', t: (b) => P(b, 'Add an empty OB121 to stay in RUN', 'Add a fault routine that clears it', 'Add CheckBounds that limits the index'),
          no: (b) => P(b, 'The CPU would stay in RUN, but the bad instruction is simply skipped and nobody knows. An error OB is a place to REACT (alarm, safe state), not a fix for the bug.',
            'The controller would stay in Run, but the bad rung is silently ignored and nobody knows. A fault routine is a place to REACT (alarm, safe state), not a fix for the bug.',
            'CheckBounds would quietly change 12 into 9: the machine runs recipe 9 and nobody knows. Use CheckBounds in the test to FIND bugs, not to hide them.') },
        { id: 'check', need: 1, t: 'Check the index first (0 … 9), else alarm', short: 'check the index before use',
          yes: 'Good: the program now uses the array only when 0 ≤ Recipe_No ≤ 9. Recipe 12 gives the alarm "Recipe does not exist" and keeps the old recipe. Even better: also limit the HMI input to 0 … 9.' },
        { id: 'dl', t: 'Download the same program again', no: 'The program is the same, so the bug is the same: Recipe_No is still 12, and the CPU stops again.' },
      ],
      again: 'Recipe_No is still 12, and the program still uses it without a check.',
    },
    {
      id: 'loop', chip: 'Frozen', stops: true,
      story: '"The machine froze in the middle of the cycle: nothing moved, not even the lamps. Then everything went off. The PLC has a red light."',
      events: ['wd', 'wdStop'],
      causes: [
        { id: 'slow', t: 'The CPU is too slow for this program', no: (b) => 'No: the scan was 8 ms for months. Suddenly one scan took more than ' + BR[b].wd + ' ms: something waits inside the scan.' },
        { id: 'loop', ok: 1, t: 'A WHILE loop waits for an input', yes: 'Right: the loop waits for Part_Found inside one scan. Nothing else runs, and the loop never ends.' },
        { id: 'net', t: 'The network has too much traffic', no: 'No: network traffic does not stop the program. The entry names a program block: Part_Search.' },
        { id: 'idx', t: 'An array index is out of range', no: 'No: that would be a different entry (programming error / Type 04 Code 20). This one is about time.' },
      ],
      fixes: [
        { id: 'time', t: 'Raise the max cycle time to 6 seconds', no: 'The loop is endless: it reaches 6 s too. And for 6 s no rung runs and no output changes: the machine is frozen and blind.' },
        { id: 'ob', t: (b) => P(b, 'Add an empty OB80 to stay in RUN', 'Add a fault routine that clears it', 'Raise the watchdog sensitivity to 100'),
          no: (b) => P(b, 'OB80 helps only after a short overrun. An endless loop reaches twice the maximum cycle time, and then the CPU goes to STOP anyway.',
            'Clearing the fault does not end the loop: the task is still stuck, and the watchdog fires again.',
            'Then the watchdog waits longer, but the loop never ends. The application still stops, just later.') },
        { id: 'cpu', t: 'Buy a faster CPU for this machine', no: 'An endless loop is endless on every CPU.' },
        { id: 'loop', need: 1, t: 'Remove the loop: check the input once per scan', short: 'no waiting loop (IF, not WHILE)',
          yes: 'Now step 10 waits with IF, not WHILE: every scan checks Part_Found once and goes on. The scan time is back to 8 ms. A PLC program never waits INSIDE a scan: it waits ACROSS many scans.' },
      ],
      again: 'The WHILE loop is still there, and the part still does not come.',
    },
    {
      id: 'station', chip: 'Infeed dead', stops: false,
      story: '"The infeed conveyor stopped. The HMI still says AUTO, running. There is no alarm!"',
      events: ['st'],
      causes: [
        { id: 'prog', t: 'The remote station lost its program', no: 'No: a remote I/O station has no program. It only reads inputs and switches outputs for the CPU.' },
        { id: 'cpu', t: 'The CPU went into STOP mode', no: 'No: look at the CPU: RUN is green. The program runs; it just cannot reach the station.' },
        { id: 'ol', t: 'The conveyor motor is overloaded', no: 'No: then the motor protection would trip, and the CPU would still see the station. The entry says: station not reachable.' },
        { id: 'cable', ok: 1, t: 'The network cable to the station is broken', yes: 'Right: the CPU cannot reach the station, so the station switched its outputs off. The bus fault LED on the station is red.' },
      ],
      fixes: [
        { id: 'prog', need: 1, t: 'Program: read the station status, stop + alarm', short: 'the program reads the station status',
          yes: 'Now the program reads the station status. If the station is lost, it stops the line in order and shows "Remote station 3 lost". The operator calls the right person at once.' },
        { id: 'dl', t: 'Download the whole program again', no: 'The program did not change. A download does not fix a cable.' },
        { id: 'cable', need: 1, t: 'Plug the cable back in at the switch', short: 'reconnect the network cable',
          yes: 'A forklift had pulled the cable out of switch port 3 (it was not in a cable tray). Plugged in: the station is back (a green entry at the top), the bus fault LED goes off and the conveyor runs again.' },
        { id: 'cpu', t: 'Replace the CPU with a new one', no: 'The CPU found the problem and reported it. The CPU is fine.' },
      ],
      again: '',
    },
    {
      id: 'force', chip: 'Yellow LED', stops: false,
      story: '"There is a yellow light on the PLC. And the conveyor runs all the time, even when there are no parts."',
      events: ['frc'],
      causes: [
        { id: 'bat', t: 'The backup battery is low', no: 'A good idea: a yellow LED can mean a battery or a memory card. But read the entry: it says force.' },
        { id: 'card', t: 'The output card is defective', no: 'No: the card does exactly what it is told. The force tells it TRUE.' },
        { id: 'force', ok: 1, t: 'A force on the conveyor output is active', yes: 'Right: a force wins over the program. The program says FALSE, the force says TRUE, so the motor runs.' },
        { id: 'loop', t: 'The program is stuck in a loop', no: 'No: the CPU is in RUN and the scan time is short. A stuck program would stop the CPU.' },
      ],
      fixes: [
        { id: 'prog', t: 'Change the program to stop the motor', no: 'The program already says FALSE. A force wins over the program, so no program change helps.' },
        { id: 'pow', t: 'Switch the PLC off and on again', no: 'Forces stay active after STOP → RUN, and on many PLCs even after power off. Remove them in the tool.' },
        { id: 'card', t: 'Replace the output card', no: 'The card is fine: it switches what it is told to switch.' },
        { id: 'unforce', need: 1, t: (b) => P(b, 'Force table: Stop forcing', 'Remove all I/O forces', 'Debug: Unforce all values'), short: 'remove all forces',
          yes: (b) => 'All forces removed. The program controls ' + BR[b].q3 + ' again: the conveyor stops until a part is ready, and the ' + P(b, 'MAINT', 'FORCE', 'FORCE') + ' LED goes off. Rule: remove every force after a test, and write it in the logbook.' },
      ],
      again: '',
    },
  ];
  const txt = (v, b) => (typeof v === 'function' ? v(b) : v);

  // ───────────── CSS (once) ─────────────
  const CSS = `
.hw-box.hw-diag{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:18px 0;color:var(--ink);font-size:.95rem;line-height:1.45;min-width:0}
.hw-diag *{box-sizing:border-box}
.hw-diag p,.hw-diag li{max-width:none}
.hwd-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px}
.hwd-title{margin:0;font-family:var(--f-display);font-weight:700;font-size:1.32rem;line-height:1.15;letter-spacing:.01em}
.hwd-seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface-2);max-width:100%}
.hwd-seg button{flex:1 1 auto;min-height:36px;padding:4px 12px;border:0;border-left:1px solid var(--line);background:transparent;color:var(--ink-2);font-weight:600;font-size:.86rem;cursor:pointer;white-space:nowrap}
.hwd-seg button:first-child{border-left:0}
.hwd-seg button:hover{background:var(--surface-3)}
.hwd-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwd-intro{margin:8px 0 0;color:var(--ink-2);font-size:.92rem}
.hwd-sec{margin-top:16px}
.hwd-h{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2px 12px;margin:0 0 8px}
.hwd-h b{font-family:var(--f-display);font-size:.95rem;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-2)}
.hwd-h span{font-size:.82rem;color:var(--muted)}
.hwd-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.hwd-chip{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:4px 12px 4px 6px;border:1px solid var(--line);border-radius:999px;background:var(--surface);font:inherit;font-weight:600;font-size:.86rem;color:var(--ink-2);cursor:pointer}
.hwd-chip:hover{background:var(--surface-2)}
.hwd-chip i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--surface-3);font-style:normal;font-weight:800;font-size:.78rem;color:var(--ink-2)}
.hwd-chip.done i{background:var(--power-soft);color:var(--power)}
.hwd-chip[aria-current="true"]{background:var(--ink);border-color:var(--ink);color:var(--surface)}
.hwd-chip[aria-current="true"] i{background:var(--surface);color:var(--ink)}
.hwd-story{margin-top:10px;display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:var(--surface-2);border-left:4px solid var(--accent-bg)}
.hwd-story svg{flex:none;width:26px;height:26px;color:var(--accent)}
.hwd-story p{margin:0;font-size:.92rem}
.hwd-story small{display:block;font-size:.74rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
/* hardware */
.hwd-hw{display:flex;align-items:stretch;justify-content:center;gap:0;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);padding:12px}
.hwd-st{flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.hwd-mid .hwd-st,.hwd-narrow .hwd-st{align-items:center}
.hwd-st > small{font:700 .7rem var(--f-body);letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.hwd-rack{display:flex;align-items:stretch;gap:4px;padding:6px;border-radius:8px;background:repeating-linear-gradient(90deg,var(--surface-3) 0 9px,var(--line-2) 9px 11px);border:1px solid var(--line)}
.hwd-mod{position:relative;display:flex;flex-direction:column;width:54px;min-height:176px;border:1px solid var(--line);border-radius:7px;background:var(--surface);overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.14),0 4px 10px rgba(0,0,0,.07)}
.hwd-mod.cpu{width:118px}
.hwd-mod.ai{width:62px}
.hwd-mod.ps{width:44px}
.hwd-mod.im{width:58px}
.hwd-mod.bad{border:2px solid var(--danger)}
.hwd-strip{flex:none;display:flex;align-items:center;justify-content:center;height:24px;padding:0 2px;background:var(--c);color:var(--ci,#fff);font:700 .68rem/1 var(--f-body);white-space:nowrap;overflow:hidden}
.hwd-body{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:7px 3px 5px;min-height:0}
.hwd-foot{flex:none;padding:2px;font:600 .6rem/1.3 var(--f-mono);color:var(--muted);text-align:center;border-top:1px solid var(--line-2);background:var(--surface-2);white-space:nowrap;overflow:hidden}
.hwd-ll{display:flex;align-items:center;gap:4px;font:600 .6rem/1.1 var(--f-mono);color:var(--ink-2);white-space:nowrap}
.hwd-led{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line);flex:none}
.hwd-led.g{background:var(--power-bright);border-color:var(--power);box-shadow:0 0 6px var(--power-bright)}
.hwd-led.r{background:var(--danger);border-color:var(--danger);box-shadow:0 0 6px var(--danger)}
.hwd-led.y{background:var(--accent-bg);border-color:var(--accent);box-shadow:0 0 6px var(--accent-bg)}
.hwd-led.blink{animation:hwd-blink 1s steps(2,start) infinite}
@keyframes hwd-blink{to{visibility:hidden}}
.hwd-lcd{width:100%;min-height:30px;padding:3px 5px;border-radius:4px;background:#0f1a14;color:#7dffa8;font:700 .64rem/1.25 var(--f-mono);text-align:center;display:flex;align-items:center;justify-content:center;border:1px solid #000}
.hwd-lcd.y{color:#ffd166}
.hwd-lcd.r{color:#ff8080}
.hwd-cpuleds{display:flex;flex-direction:column;gap:4px;align-self:stretch;padding-left:6px}
.hwd-sw{display:flex;flex-direction:column;width:100%;border:2px solid var(--muted);border-radius:7px;overflow:hidden;margin-top:auto}
.hwd-sw button{min-height:28px;border:0;background:var(--surface-2);color:var(--muted);font:700 .7rem var(--f-mono);cursor:pointer;letter-spacing:.05em}
.hwd-sw button + button{border-top:1px solid var(--line)}
.hwd-sw button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwd-sw button:focus-visible,.hwd-mode button:focus-visible{outline:3px solid var(--accent-bg);outline-offset:-3px}
.hwd-chs{display:grid;grid-template-columns:auto auto;gap:3px 5px}
.hwd-chs span{display:flex;align-items:center;gap:2px;font:500 .58rem/1 var(--f-mono);color:var(--ink-2)}
.hwd-chs .hwd-led{width:8px;height:8px}
.hwd-ain{display:flex;flex-direction:column;gap:5px;width:100%}
.hwd-ain span{display:flex;align-items:center;gap:3px;font:600 .56rem/1 var(--f-mono);color:var(--ink-2);white-space:nowrap}
.hwd-ain span b{font-weight:700;margin-left:auto}
.hwd-ain span.bad b{color:var(--danger)}
.hwd-ain .hwd-led{width:8px;height:8px}
.hwd-big{font:700 .95rem/1 var(--f-display);color:var(--ink)}
.hwd-port{width:18px;height:15px;border:2px solid var(--muted);border-radius:2px;position:relative}
.hwd-port.lost{border-color:var(--danger)}
.hwd-cable{flex:1 1 40px;min-width:34px;max-width:150px;position:relative;display:flex;align-items:center;justify-content:center;align-self:center;height:80px}
.hwd-cable::before{content:"";position:absolute;left:0;right:0;top:50%;border-top:4px solid var(--info);border-radius:2px}
.hwd-cable.lost::before{border-top:4px dashed var(--danger)}
.hwd-cable span{position:relative;z-index:1;padding:1px 6px;border-radius:999px;background:var(--surface-2);border:1px solid var(--line);font:700 .64rem var(--f-mono);color:var(--ink-2);white-space:nowrap;transform:translateY(-22px)}
.hwd-cable.lost span{color:var(--danger);border-color:var(--danger)}
.hwd-cut{position:absolute;z-index:1;top:50%;left:50%;transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;background:var(--danger);color:#fff;display:grid;place-items:center;font-weight:800;font-size:.9rem}
.hwd-field{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}
.hwd-dev{display:flex;gap:8px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-left:4px solid var(--power);border-radius:8px;background:var(--surface);font-size:.8rem;line-height:1.3;min-width:0}
.hwd-dev.bad{border-left-color:var(--danger);background:var(--danger-soft)}
.hwd-dev.warn{border-left-color:var(--accent-bg)}
.hwd-dev.off{border-left-color:var(--line)}
.hwd-dev svg{flex:none;width:26px;height:26px;color:var(--ink-2)}
.hwd-dev b{display:block;font-size:.8rem}
.hwd-dev span{display:block;color:var(--ink-2);min-width:0}
.hwd-dev.bad span{color:var(--danger);font-weight:600}
/* program */
.hwd-prog{border:1px solid var(--line);border-radius:12px;overflow:hidden}
.hwd-code{margin:0;padding:10px 12px;background:var(--surface-2);font:500 .8rem/1.55 var(--f-mono);overflow-x:auto;white-space:pre;color:var(--ink)}
.hwd-code .c{color:var(--muted)}
.hwd-code .bad{background:var(--danger-soft);box-shadow:inset 3px 0 0 var(--danger);display:inline-block;min-width:100%}
.hwd-code .new{background:var(--power-soft);box-shadow:inset 3px 0 0 var(--power);display:inline-block;min-width:100%}
.hwd-sees{display:flex;gap:8px;align-items:flex-start;padding:8px 12px;border-top:1px solid var(--line);font-size:.88rem;background:var(--surface)}
.hwd-sees > b{flex:none;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);padding-top:2px}
.hwd-sees.bad{background:var(--danger-soft)}
.hwd-sees.warn{background:color-mix(in srgb,var(--accent-bg) 14%,var(--surface))}
.hwd-sees.ok{background:var(--power-soft)}
/* diagnostic buffer */
.hwd-buf{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
.hwd-bhead{display:grid;grid-template-columns:24px 34px 96px minmax(0,1fr);gap:8px;padding:6px 10px;background:var(--surface-2);border-bottom:1px solid var(--line);font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.hwd-rows{max-height:290px;overflow-y:auto;scrollbar-width:thin}
.hwd-row{display:grid;grid-template-columns:24px 34px 96px minmax(0,1fr);gap:8px;align-items:start;width:100%;padding:7px 10px;border:0;border-bottom:1px solid var(--line-2);background:transparent;color:var(--ink);font:inherit;font-size:.85rem;line-height:1.35;text-align:left;cursor:pointer}
.hwd-row:hover{background:var(--surface-2)}
.hwd-row[aria-pressed="true"]{background:color-mix(in srgb,var(--info) 13%,var(--surface));box-shadow:inset 4px 0 0 var(--info)}
.hwd-row:focus-visible{outline:3px solid var(--accent-bg);outline-offset:-3px}
.hwd-row .n,.hwd-row .tm{font:600 .78rem/1.5 var(--f-mono);color:var(--ink-2)}
.hwd-row .tx{min-width:0;overflow-wrap:anywhere}
.hwd-row.new .tx b{font-weight:700}
.hwd-ico{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font:800 .72rem/1 var(--f-body);color:#fff;background:var(--muted)}
.hwd-ico.err{background:var(--danger)}
.hwd-ico.warn{background:var(--accent-bg);color:var(--accent-ink)}
.hwd-ico.ok{background:var(--power)}
.hwd-ico.info{background:var(--info)}
.hwd-code-chip{display:inline-block;margin-right:6px;padding:0 7px;border-radius:999px;background:var(--surface-3);font:700 .7rem/1.6 var(--f-mono);color:var(--ink);white-space:nowrap;vertical-align:1px}
.hwd-help{padding:10px 12px;border-top:3px solid var(--info);background:var(--surface-2)}
.hwd-help.none{border-top:1px solid var(--line);color:var(--muted);font-size:.88rem}
.hwd-help h5{margin:0 0 4px;font-size:.78rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--info)}
.hwd-help p{margin:0;font-size:.88rem}
.hwd-where{margin:6px 0 0!important;font-size:.8rem!important;color:var(--muted)}
/* moves */
.hwd-step{margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.hwd-step.lock{background:var(--surface-2)}
.hwd-sh{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-weight:700;font-size:.95rem}
.hwd-sh i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--ink);color:var(--surface);font-style:normal;font-size:.8rem;flex:none}
.hwd-sh.done i{background:var(--power)}
.hwd-sh small{font-weight:500;color:var(--muted);font-size:.82rem}
.hwd-narrow .hwd-sh{flex-wrap:wrap;row-gap:0}
.hwd-narrow .hwd-sh small{flex-basis:100%;padding-left:32px}
.hwd-opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.hwd-opt{display:flex;align-items:center;gap:8px;min-height:42px;padding:6px 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);font:inherit;font-size:.88rem;line-height:1.3;text-align:left;cursor:pointer}
.hwd-opt:hover{background:var(--surface-2);border-color:var(--ink-2)}
.hwd-opt i{flex:none;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:.72rem;border:1.5px solid var(--line);color:transparent}
.hwd-opt.ok{border-color:var(--power);background:var(--power-soft)}
.hwd-opt.ok i{background:var(--power);border-color:var(--power);color:#fff}
.hwd-opt.no{border-color:color-mix(in srgb,var(--danger) 45%,var(--line));color:var(--ink-2)}
.hwd-opt.no i{background:var(--danger-soft);border-color:var(--danger);color:var(--danger)}
.hwd-opt:focus-visible{outline:3px solid var(--accent-bg);outline-offset:2px}
.hwd-mode{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.hwd-mode .hwd-sw2{display:inline-flex;border:2px solid var(--muted);border-radius:9px;overflow:hidden}
.hwd-mode .hwd-sw2 button{min-width:74px;min-height:38px;border:0;background:var(--surface-2);color:var(--ink-2);font:700 .82rem var(--f-mono);cursor:pointer}
.hwd-mode .hwd-sw2 button + button{border-left:1px solid var(--line)}
.hwd-mode .hwd-sw2 button[aria-pressed="true"]{background:var(--ink);color:var(--surface)}
.hwd-mode p{margin:0;flex:1 1 240px;font-size:.84rem;color:var(--ink-2)}
/* checklist + caption (same look as the other hardware widgets) */
.hw-diag .hwd-cl{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px 10px}
.hwd-cl li{margin:0;display:flex;gap:8px;align-items:flex-start;padding:7px 9px;border-radius:8px;background:var(--surface-2);font-size:.88rem;line-height:1.3}
.hwd-cl li > i{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:.8rem}
.hwd-cl li.ok > i{background:var(--power-soft);color:var(--power)}
.hwd-cl li.no > i{background:var(--danger-soft);color:var(--danger)}
.hwd-cl small{display:block;color:var(--muted);font-size:.78rem;margin-top:1px}
.hwd-next{margin:10px 0 0;padding:8px 10px;border-radius:8px;border:1px dashed var(--line);font-size:.9rem}
.hwd-win{margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--power-soft);border:1px solid var(--power);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.hwd-win p{margin:0;flex:1 1 260px;font-weight:600}
.hwd-win ol{margin:6px 0 0;padding-left:1.4em;font-weight:500;font-size:.9rem}
.hwd-nw{white-space:nowrap}
.hwd-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hwd-cap{position:sticky;bottom:10px;z-index:6;margin-top:16px;padding:9px 12px;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hwd-cap.ok{border-left-color:var(--power)}
.hwd-cap.warn{border-left-color:var(--accent-bg)}
.hwd-cap.bad{border-left-color:var(--danger)}
.hwd-caph{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:1px}
.hwd-k{font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.hwd-cap p{margin:0;font-size:.93rem}
.hwd-more{display:none;align-items:center;min-height:32px;margin:-9px -8px -7px 0;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--ink);font:700 .8rem var(--f-body);cursor:pointer}
.hwd-more:hover{background:var(--surface-2)}
.hwd-cap.flash{animation:hwd-flash .7s ease-out}
@keyframes hwd-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hwd-cap{bottom:calc(var(--tabbar-h) + 8px + env(safe-area-inset-bottom,0px))}}
/* narrow (by the widget's own width) */
.hwd-mid .hwd-hw,.hwd-narrow .hwd-hw{flex-direction:column;align-items:center}
.hwd-mid .hwd-cable,.hwd-narrow .hwd-cable{flex:none;width:80px;height:46px}
.hwd-mid .hwd-cable::before,.hwd-narrow .hwd-cable::before{left:50%;right:auto;top:0;bottom:0;border-top:0;border-left:4px solid var(--info)}
.hwd-mid .hwd-cable.lost::before,.hwd-narrow .hwd-cable.lost::before{border-left:4px dashed var(--danger)}
.hwd-mid .hwd-cable span,.hwd-narrow .hwd-cable span{transform:translateX(52px)}
.hwd-narrow .hwd-title{font-size:1.2rem}
.hwd-narrow .hwd-seg{width:100%}
.hwd-narrow .hwd-seg button{padding:4px 6px}
.hwd-narrow .hwd-wide{display:none}
.hwd-narrow .hwd-hw{padding:10px 6px}
.hwd-narrow .hwd-rack{gap:3px;padding:5px}
.hwd-narrow .hwd-mod{width:48px}
.hwd-narrow .hwd-mod.cpu{width:96px}
.hwd-narrow .hwd-mod.ps{width:34px}
.hwd-narrow .hwd-mod.ai{width:60px}
.hwd-narrow .hwd-mod.im{width:56px}
.hwd-narrow .hwd-ain span{font-size:.54rem;gap:2px}
.hwd-narrow .hwd-foot{font-size:.54rem}
.hwd-narrow .hwd-mod.ps .hwd-foot{font-size:.46rem;padding:2px 0}
.hwd-narrow .hwd-mod.ps .hwd-strip{font-size:.56rem}
.hwd-narrow .hwd-field{grid-template-columns:minmax(0,1fr)}
.hwd-narrow .hwd-opts{grid-template-columns:minmax(0,1fr)}
.hwd-narrow .hwd-bhead{display:none}
.hwd-narrow .hwd-row{grid-template-columns:22px 30px minmax(0,1fr);row-gap:2px}
.hwd-narrow .hwd-row .tx{grid-column:2 / -1}
.hwd-narrow .hwd-code{font-size:.74rem}
.hwd-narrow .hwd-sees{flex-direction:column;gap:2px}
.hwd-narrow .hwd-cap{padding:7px 10px}
.hwd-narrow .hwd-cap.hwd-long .hwd-more{display:inline-flex}
.hwd-narrow .hwd-cap:not(.hwd-capx) p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
@media (prefers-reduced-motion:reduce){.hwd-led.blink{animation:none}.hwd-cap.flash{animation:none}}
`;
  function injectCSS() {
    if (document.getElementById('hw-diag-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-diag-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const ICON = {
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    sensor: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="13" r="9"/><path d="M16 22v7M11 29h10M16 13l5-4"/></svg>',
    motor: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="16" r="11"/><path d="M11 21V11l5 7 5-7v10"/></svg>',
    belt: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="26" height="10" rx="5"/><circle cx="8" cy="16" r="2"/><circle cx="24" cy="16" r="2"/></svg>',
  };

  // ───────────── the widget ─────────────
  LL.HW.diag = function (ph) {
    injectCSS();
    const root = document.createElement('div');
    root.className = 'hw-box hw-diag';
    const uid = 'hwd' + ++uidN;

    // saved: brand, solved faults, current fault
    let brand = 'tia', done = {}, cur = 0;
    try {
      const o = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (o) {
        if (BR[o.brand]) brand = o.brand;
        if (o.done && typeof o.done === 'object') SC.forEach((s) => { if (o.done[s.id]) done[s.id] = true; });
        if (Number.isInteger(o.cur) && o.cur >= 0 && o.cur < SC.length) cur = o.cur;
      }
    } catch (e) { /* storage blocked */ }
    const restored = Object.keys(done).length > 0;
    const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ brand, done, cur })); } catch (e) { /* storage full or blocked */ } };

    let S = null, capOpen = false;
    const sc = () => SC[cur];

    // ───── one fault: its state ─────
    function push(id, dt, x) {
      S.clock += dt;
      S.ev.push({ id, n: ++S.seq, t: S.clock, x: !!x });
    }
    function startSc(i) {
      cur = i;
      const D = SC[i];
      // the day starts at 05:58; the fault comes a while later
      S = { ev: [], seq: 0, clock: (5 * 3600 + 58 * 60 + 11) * 1000 + 237, read: false, cause: null, fixed: {}, wrongC: {}, wrongF: {}, cpu: D.stops ? 'fault' : 'run', sw: 'run', sel: null, solved: false };
      push('pon', 0);
      push('toRun', 2131);
      push(D.events[0], 3600000 + 17 * 60000 + 4211);
      for (let k = 1; k < D.events.length; k++) push(D.events[k], 1);
      save();
    }
    const allFixed = () => sc().fixes.filter((f) => f.need).every((f) => S.fixed[f.id]);
    const fixedId = (id) => !!S.fixed[id];
    // live hardware state
    function hwState() {
      const id = sc().id;
      return {
        aiBad: id === 'wire' && !fixedId('wire'),
        remLost: id === 'station' && !fixedId('cable'),
        forced: id === 'force' && !fixedId('unforce'),
        cpu: S.cpu,
      };
    }
    function checks() {
      const D = sc(), H = hwState(), b = brand;
      const normal = S.cpu === 'run' && S.sw === 'run' && !H.aiBad && !H.remLost && !H.forced;
      const list = [
        { ok: S.read, t: 'Read the diagnostics', d: S.read ? 'You opened the entry that names the problem.' : 'Click the newest red or yellow entry in the ' + BR[b].buf.toLowerCase() + '.', hint: 'Read the diagnostics first: click the newest red or yellow entry in the ' + BR[b].buf.toLowerCase() + ' (newest at the top).' },
        { ok: !!S.cause, t: 'Name the cause', d: S.cause ? D.causes.find((c) => c.ok).t : 'Step 2: pick one cause.', hint: 'Pick the cause in step 2. The entry you opened tells you.' },
      ];
      D.fixes.filter((f) => f.need).forEach((f) => list.push({ ok: fixedId(f.id), t: 'Fix: ' + f.short, d: fixedId(f.id) ? 'Done.' : 'Step 3: apply the right fix.', hint: !S.cause ? 'Name the cause first.' : D.fixes.some((x) => x.need && S.fixed[x.id]) ? 'One more fix in step 3: ' + f.short + '.' : 'Step 3: choose a fix. ' + (D.fixes.filter((x) => x.need).length > 1 ? 'This fault needs two fixes: the hardware AND the program.' : 'Fix the cause, not the symptom.') }));
      list.push(D.stops
        ? { ok: normal, t: 'Restart: STOP → RUN, RUN LED green', d: normal ? 'The program runs again.' : S.cpu === 'run' ? 'Running.' : 'The CPU is in STOP.', hint: allFixed() ? 'Restart now: ' + BR[b].restart : 'Fix the cause first: a restart alone gives the same STOP again.' }
        : { ok: normal, t: 'All LEDs normal again', d: normal ? 'RUN green, no red, no yellow.' : 'Look at the LEDs on the CPU and the modules.', hint: S.cpu !== 'run' || S.sw !== 'run' ? 'Switch the CPU back to RUN.' : 'Apply the fix that removes the red or yellow LED.' });
      return list;
    }

    // ───── skeleton ─────
    root.innerHTML = `
<div class="hwd-head"><h4 class="hwd-title">CPU diagnostics: the CPU is in STOP. What now?</h4>
<div class="hwd-seg" role="group" aria-label="PLC brand">${BKEYS.map((k) => `<button type="button" data-act="brand" data-b="${k}" data-f="b-${k}">${BR[k].seg[0]}${BR[k].seg[1] ? ' <span class="hwd-wide">' + BR[k].seg[1] + '</span>' : ''}</button>`).join('')}</div></div>
<p class="hwd-intro">Five calls from the night shift. For each one: <b>read</b> the diagnostics, <b>name</b> the cause, apply the right <b>fix</b>, and <b>restart</b> until RUN is green. This is the routine interviewers want to hear.</p>
<div class="hwd-chips" role="group" aria-label="Faults"></div>
<div class="hwd-story"></div>
<div class="hwd-sec"><div class="hwd-h"><b>The PLC</b><span>Local rack and a remote I/O station. Watch the LEDs.</span></div><div class="hwd-hw"></div><div class="hwd-field"></div></div>
<div class="hwd-sec"><div class="hwd-h"><b class="hwd-bt"></b><span class="hwd-bs"></span></div><div class="hwd-buf"></div></div>
<div class="hwd-sec hwd-moves"></div>
<div class="hwd-sec"><div class="hwd-h"><b>What the program does</b><span class="hwd-lang"></span></div><div class="hwd-prog"></div></div>
<div class="hwd-sec hwd-check"></div>
<div class="hwd-cap"><div class="hwd-caph"><span class="hwd-k">What happened</span><button type="button" class="hwd-more" data-act="more" data-f="more" aria-expanded="false">more ▾</button></div><p role="status" aria-live="polite"></p></div>`;
    const $ = (s) => root.querySelector(s);
    const chipsEl = $('.hwd-chips'), storyEl = $('.hwd-story'), hwEl = $('.hwd-hw'), fieldEl = $('.hwd-field'), bufEl = $('.hwd-buf'),
      movesEl = $('.hwd-moves'), progEl = $('.hwd-prog'), chkEl = $('.hwd-check'), capEl = $('.hwd-cap'), moreEl = $('.hwd-more');

    // ───── LEDs ─────
    function ledCls(name, H) {
      const b = brand, run = H.cpu === 'run', fault = H.cpu === 'fault', io = H.aiBad || H.remLost;
      if (b === 'tia') {
        if (name === 'RUN/STOP') return run ? 'g' : 'y';
        if (name === 'ERROR') return fault ? 'r blink' : io ? 'r blink' : '';
        if (name === 'MAINT') return H.forced ? 'y' : '';
      } else if (b === 'rockwell') {
        if (name === 'RUN') return run ? 'g' : '';
        if (name === 'I/O') return H.remLost ? 'g blink' : 'g';
        if (name === 'OK') return fault ? 'r blink' : 'g';
        if (name === 'FORCE') return H.forced ? 'y' : '';
      } else {
        if (name === 'RUN') return run ? 'g' : 'y';
        if (name === 'ERR') return fault ? 'r' : io ? 'r blink' : '';
        if (name === 'FORCE') return H.forced ? 'y' : '';
      }
      return '';
    }
    function lcd(H) {
      const b = brand, D = sc();
      if (H.cpu === 'fault') {
        if (b === 'rockwell') { const c = D.id === 'index' ? 'T04:C20' : 'T06:C01'; return ['r', 'Major Fault ' + c]; }
        if (b === 'codesys') return ['r', 'EXCEPTION'];
        return ['r', 'STOP · error'];
      }
      if (H.cpu === 'stop') return ['y', b === 'rockwell' ? 'Prog' : 'STOP'];
      if (b === 'rockwell') return H.remLost ? ['y', 'Rem Run · I/O Fault'] : H.forced ? ['y', 'Rem Run · Forces'] : ['', 'Rem Run'];
      if (H.aiBad || H.remLost) return ['y', 'RUN · 1 error'];
      if (H.forced) return ['y', 'RUN · force'];
      return ['', 'RUN'];
    }

    // ───── hardware drawing ─────
    function renderHW() {
      const b = brand, B = BR[b], H = hwState(), run = H.cpu === 'run';
      const L = (cls, label) => `<span class="hwd-ll"><i class="hwd-led ${cls}"></i>${label}</span>`;
      const mod = (c, ci, strip, body, foot, extra, bad, aria) => `<div class="hwd-mod${extra ? ' ' + extra : ''}${bad ? ' bad' : ''}" role="img" aria-label="${esc(aria)}" style="--c:${c};--ci:${ci}"><span class="hwd-strip">${strip}</span><span class="hwd-body">${body}</span><span class="hwd-foot">${foot}</span></div>`;
      // outputs: in STOP every output is off; in RUN the program keeps -M3 off (no part), but a force wins
      const q3 = H.forced && run;
      const dqLeds = (n, on) => '<span class="hwd-chs">' + Array.from({ length: n }, (_, c) => `<span><i class="hwd-led${on(c) ? ' g' : ''}"></i>${c}</span>`).join('') + '</span>';
      const diOn = (c) => [0, 1, 4, 6].includes(c);
      const dqOn = (c) => run && ((c === 3 && q3) || c === 0 || c === 5);
      const lc = lcd(H), swl = B.sw;
      let h = '<div class="hwd-st"><small>Local rack</small><div class="hwd-rack">';
      h += mod('#64717c', '#fff', 'PS', `<span class="hwd-big">24V</span>${L('g', 'ON')}`, B.ps, 'ps', false, 'Power supply: on');
      const cpuLeds = B.leds.map((n) => L(ledCls(n, H), n)).join('');
      const cpuBody = `<span class="hwd-lcd ${lc[0]}" aria-hidden="true">${esc(lc[1])}</span><span class="hwd-cpuleds">${cpuLeds}</span>
<span class="hwd-sw" role="group" aria-label="Mode switch"><button type="button" data-act="mode" data-m="run" data-f="sw-run" aria-pressed="${S.sw === 'run'}">${swl.run}</button><button type="button" data-act="mode" data-m="stop" data-f="sw-stop" aria-pressed="${S.sw === 'stop'}">${swl.stop}</button></span>`;
      h += `<div class="hwd-mod cpu${H.cpu === 'fault' ? ' bad' : ''}" style="--c:#24303a;--ci:#fff"><span class="hwd-strip">${esc(B.cpu)}</span><span class="hwd-body">${cpuBody}</span><span class="hwd-foot">${H.cpu === 'run' ? 'program runs' : 'program stopped'}</span></div>`;
      h += mod('#12803f', '#fff', B.di, `${L('g', 'RUN')}${L('', 'ERR')}${dqLeds(8, diOn)}`, 'inputs', '', false, 'Digital input card: OK');
      h += mod('#f0a020', '#2a1a00', B.dq, `${L('g', 'RUN')}${L('', 'ERR')}${dqLeds(8, dqOn)}`, 'outputs', '', false, 'Digital output card: OK' + (q3 ? ', output 3 on' : ''));
      const aiRows = [['0', '7.2'], ['1', '12.0'], ['2', H.aiBad ? (b === 'tia' ? '32767' : '0.0') : '11.4'], ['3', '4.0']].map(([c, v]) => {
        const bad = c === '2' && H.aiBad;
        return `<span class="${bad ? 'bad' : ''}"><i class="hwd-led ${bad ? 'r' : 'g'}"></i>${c}<b>${v}</b></span>`;
      }).join('');
      h += mod('#2160c4', '#fff', B.ai, `${L('g', 'RUN')}${L(H.aiBad ? 'r blink' : '', 'ERR')}<span class="hwd-ain">${aiRows}</span>`, b === 'tia' ? 'raw / ch' : 'mA / ch', 'ai', H.aiBad, 'Analog input card' + (H.aiBad ? ': channel 2 in fault' : ': OK'));
      h += '</div></div>';
      h += `<div class="hwd-cable${H.remLost ? ' lost' : ''}" aria-hidden="true"><span>${esc(B.net)}</span>${H.remLost ? '<i class="hwd-cut">✂</i>' : ''}</div>`;
      h += `<div class="hwd-st"><small>Remote station 3 · ${esc(B.rem)}</small><div class="hwd-rack">`;
      const lost = H.remLost;
      h += mod('#4b5966', '#fff', esc(B.im), `<span class="hwd-port${lost ? ' lost' : ''}" aria-hidden="true"></span>${L(lost ? '' : 'g', 'LINK')}${L(lost ? 'r' : '', b === 'rockwell' ? 'NET' : b === 'tia' ? 'BF' : 'ERR')}${L(lost ? '' : 'g', 'RUN')}`, 'adapter', 'im', lost, 'Remote station adapter' + (lost ? ': bus fault, no connection' : ': OK'));
      h += mod('#12803f', '#fff', 'DI 8', `${L(lost ? '' : 'g', 'RUN')}${L(lost ? 'r blink' : '', 'ERR')}${dqLeds(8, (c) => !lost && [0, 2].includes(c))}`, 'inputs', '', false, 'Remote input card');
      h += mod('#f0a020', '#2a1a00', 'DQ 8', `${L(lost ? '' : 'g', 'RUN')}${L(lost ? 'r blink' : '', 'ERR')}${dqLeds(8, (c) => !lost && run && c === 1)}`, 'outputs', '', false, 'Remote output card' + (lost ? ': outputs off' : ''));
      h += '</div></div>';
      hwEl.innerHTML = h;
      // what you see on the machine
      const dev = (cls, ic, t, s) => `<div class="hwd-dev ${cls}">${ICON[ic]}<span><b>${t}</b><span>${s}</span></span></div>`;
      let f = '';
      f += H.aiBad ? dev('bad', 'sensor', '-B20 level sensor', '0.0 mA: wire broken at -X4:5') : dev('', 'sensor', '-B20 level sensor', '11.4 mA = 46 % (half full)');
      f += H.forced ? dev(run ? 'warn' : 'off', 'belt', '-M3 conveyor ' + esc(B.q3), run ? 'RUNS: forced, no parts!' : 'off (CPU in STOP)') : dev(run ? '' : 'off', 'belt', '-M3 conveyor ' + esc(B.q3), run ? 'off: waits for a part' : 'off (CPU in STOP)');
      f += lost ? dev('bad', 'motor', '-M5 infeed (station 3)', 'stopped: no connection') : dev(run ? '' : 'off', 'motor', '-M5 infeed (station 3)', run ? 'running' : 'off (CPU in STOP)');
      fieldEl.innerHTML = f;
    }

    // ───── diagnostic buffer ─────
    const fmt = (ms) => { const s = Math.floor(ms / 1000), p = (n, l) => String(n).padStart(l || 2, '0'); return p(Math.floor(s / 3600) % 24) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60) + '.' + p(ms % 1000, 3); };
    const evOf = (e) => EV[e.id](brand, e.x);
    function newestKey() { for (let i = S.ev.length - 1; i >= 0; i--) { const E = evOf(S.ev[i]); if (E.key) return S.ev[i].n; } return null; }
    function renderBuf() {
      const B = BR[brand], list = S.ev.slice().reverse(), sel = S.ev.find((e) => e.n === S.sel);
      $('.hwd-bt').textContent = B.buf;
      $('.hwd-bs').textContent = 'Newest first. Click an entry to read its help.';
      let h = `<div class="hwd-bhead" aria-hidden="true"><span></span><span>No.</span><span>Time</span><span>Event</span></div><div class="hwd-rows" role="group" aria-label="${esc(B.buf)}">`;
      list.forEach((e, i) => {
        const E = evOf(e), sym = { err: '!', warn: '!', ok: '✓', info: 'i' }[E.lv];
        const lvTxt = { err: 'error', warn: 'warning', ok: 'fault gone', info: 'info' }[E.lv];
        h += `<button type="button" class="hwd-row${i === 0 ? ' new' : ''}" data-act="ev" data-n="${e.n}" data-f="ev-${e.n}" aria-pressed="${S.sel === e.n}"><span class="hwd-ico ${E.lv}" aria-hidden="true">${sym}</span><span class="n">${i + 1}</span><span class="tm">${fmt(e.t)}</span><span class="tx"><span class="hwd-sr">${lvTxt}: </span>${E.code ? '<span class="hwd-code-chip">' + esc(E.code) + '</span>' : ''}${i === 0 ? '<b>' + nw(E.t) + '</b>' : nw(E.t)}</span></button>`;
      });
      h += '</div>';
      if (sel) {
        const E = evOf(sel), no = list.indexOf(sel) + 1;
        h += `<div class="hwd-help"><h5>${esc(B.help)} · No. ${no}</h5><p>${nw(E.h)}</p><p class="hwd-where">Where: ${esc(B.where)}</p></div>`;
      } else h += `<div class="hwd-help none">Click an entry to see its ${esc(B.help.toLowerCase())}. ${esc(B.where)}</div>`;
      bufEl.innerHTML = h;
    }

    // ───── moves: cause, fix, restart ─────
    function renderMoves() {
      const D = sc(), b = brand, B = BR[b];
      let h = `<div class="hwd-h"><b>Your moves</b><span>Read → cause → fix → restart</span></div>`;
      h += `<div class="hwd-step${S.read ? '' : ' lock'}"><p class="hwd-sh${S.cause ? ' done' : ''}"><i>${S.cause ? '✓' : '2'}</i>What is the cause?<small>${S.read ? '' : '(read the buffer first)'}</small></p><div class="hwd-opts">`;
      D.causes.forEach((c) => {
        const st = S.cause === c.id ? 'ok' : S.wrongC[c.id] ? 'no' : '';
        h += `<button type="button" class="hwd-opt ${st}" data-act="cause" data-id="${c.id}" data-f="c-${c.id}" aria-pressed="${S.cause === c.id}"><i aria-hidden="true">${st === 'ok' ? '✓' : st === 'no' ? '✗' : ''}</i><span>${nw(c.t)}</span></button>`;
      });
      h += '</div></div>';
      const needN = D.fixes.filter((f) => f.need).length;
      h += `<div class="hwd-step${S.cause ? '' : ' lock'}"><p class="hwd-sh${allFixed() ? ' done' : ''}"><i>${allFixed() ? '✓' : '3'}</i>Apply the fix<small>${S.cause ? (needN > 1 ? '(this one needs 2 fixes)' : '') : '(name the cause first)'}</small></p><div class="hwd-opts">`;
      D.fixes.forEach((f) => {
        const st = S.fixed[f.id] ? 'ok' : S.wrongF[f.id] ? 'no' : '';
        h += `<button type="button" class="hwd-opt ${st}" data-act="fix" data-id="${f.id}" data-f="f-${f.id}" aria-pressed="${!!S.fixed[f.id]}"><i aria-hidden="true">${st === 'ok' ? '✓' : st === 'no' ? '✗' : ''}</i><span>${nw(txt(f.t, b))}</span></button>`;
      });
      h += '</div></div>';
      const runOk = S.cpu === 'run' && S.sw === 'run';
      h += `<div class="hwd-step"><p class="hwd-sh${runOk ? ' done' : ''}"><i>${runOk ? '✓' : '4'}</i>Restart: the mode switch<small>${D.stops ? '' : '(only if the CPU is not in RUN)'}</small></p><div class="hwd-mode"><span class="hwd-sw2" role="group" aria-label="Mode switch"><button type="button" data-act="mode" data-m="stop" data-f="m-stop" aria-pressed="${S.sw === 'stop'}">${B.sw.stop}</button><button type="button" data-act="mode" data-m="run" data-f="m-run" aria-pressed="${S.sw === 'run'}">${B.sw.run}</button></span><p>${esc(B.restart)}</p></div></div>`;
      movesEl.innerHTML = h;
    }

    // ───── the program and what it sees ─────
    function renderProg() {
      const D = sc(), b = brand, B = BR[b], H = hwState(), run = S.cpu === 'run';
      const c = (s) => '<span class="c">' + esc(s) + '</span>';
      const ln = (s, cls) => (cls ? `<span class="${cls}">${s}</span>` : s);
      let L = [], sees = '', kind = '';
      if (D.id === 'wire') {
        const raw = b === 'rockwell' ? B.ai2 + ';            ' + c('// the module scales: 0 … 100 %') : 'SCALE(' + B.ai2 + ');          ' + c('// 0 … 100 %');
        const scaled = b === 'tia' ? '118.5 %' : '-25.0 %';
        if (fixedId('prog')) {
          L = [ln('IF ' + (b === 'tia' ? 'NOT ' : '') + esc(B.bad) + ' THEN' + (b === 'tia' ? '            ' + c('// value status: 1 = good') : '   ' + c('// 1 = bad value')), 'new'),
            ln('  Pump := FALSE;  Alarm_Sensor := TRUE;  ' + c('// say WHAT is wrong'), 'new'), ln('ELSE', 'new'),
            '  Level := ' + raw, '  IF Level &gt; 95.0 OR Level &lt; 2.0 THEN', '    Pump := FALSE;  Alarm_Level := TRUE;', '  END_IF;', ln('END_IF;', 'new')];
          if (H.aiBad) { sees = 'The bad value is NOT used. HMI: "Level sensor -B20: wire break". The pump is held off safely. A true alarm that names the real problem.'; kind = 'warn'; }
          else { sees = 'Value valid: Level = 46.3 %, the pump runs. And the program is ready for the next wire break.'; kind = 'ok'; }
        } else {
          L = [c('// tank level: 4–20 mA on AI channel 2'), 'Level := ' + raw, 'IF Level &gt; 95.0 OR Level &lt; 2.0 THEN   ' + c('// out of the safe band'), '  Pump := FALSE;  Alarm_Level := TRUE;', 'END_IF;'];
          if (H.aiBad) { L[1] = ln(L[1], 'bad'); sees = (b === 'tia' ? 'Raw 32767 → ' : 'Under range → ') + 'Level = ' + scaled + ' → "Level alarm", pump OFF. A FALSE alarm: the tank is half full. The program uses a value that the card already marked as bad.'; kind = 'bad'; }
          else { sees = 'Level = 46.3 %, the pump runs. OK for now, but the next wire break gives the same false alarm.'; kind = 'warn'; }
        }
      } else if (D.id === 'index') {
        if (fixedId('check')) {
          L = [c('// HMI: the operator types the recipe number'), ln('IF Recipe_No &gt;= 0 AND Recipe_No &lt;= 9 THEN', 'new'), '  Recipe := Recipes[Recipe_No];', ln('ELSE', 'new'), ln('  Alarm_Recipe := TRUE;   ' + c('// keep the old recipe'), 'new'), ln('END_IF;', 'new')];
          sees = run ? 'Recipe_No = 12 → not used. HMI: "Recipe 12 does not exist". The old recipe stays, the CPU stays in RUN.' : 'The program is fixed. The CPU is still in STOP: restart it (step 4).';
          kind = run ? 'ok' : 'warn';
        } else {
          L = [c('// HMI: the operator types the recipe number'), ln('Recipe := Recipes[Recipe_No];   ' + c('// ARRAY [0..9]'), 'bad')];
          sees = 'Recipe_No = 12, but Recipes has only the elements 0 … 9 → ' + P(b, 'programming error → STOP (no OB121).', 'major fault Type 04 Code 20.', 'exception: access violation.');
          kind = 'bad';
        }
      } else if (D.id === 'loop') {
        if (fixedId('loop')) {
          L = [c('// step 10: wait for the part, one check per scan'), ln('IF Part_Found THEN', 'new'), ln('  Step := 20;', 'new'), ln('END_IF;', 'new')];
          sees = run ? 'Each scan checks Part_Found once: scan time 8 ms. No part yet? Step 10 simply waits, scan after scan.' : 'The program is fixed. The CPU is still in STOP: restart it (step 4).';
          kind = run ? 'ok' : 'warn';
        } else {
          L = [c('// step 10: wait for the part'), ln('WHILE NOT Part_Found DO        ' + c('// waits INSIDE the scan'), 'bad'), ln('  Search_Time := Search_Time + 1;', 'bad'), ln('END_WHILE;', 'bad'), 'Step := 20;'];
          sees = 'Part_Found stays FALSE, the loop never ends → scan time over ' + B.wd + ' ms → ' + P(b, 'time error → STOP (no OB80).', 'major fault Type 06 Code 01 (watchdog).', 'exception: task watchdog.');
          kind = 'bad';
        }
      } else if (D.id === 'station') {
        const stl = P(b, ['Station3_OK := "Station3".OK;   ' + c('// set in OB86 / from DeviceStates')],
          ['GSV(Module, Remote_Station, EntryStatus, St3);', 'Station3_OK := (St3 AND 16#F000) = 16#4000;  ' + c('// running')],
          ['Station3_OK := Coupler_3_State = 8;   ' + c('// EtherCAT: 8 = OP')]);
        if (fixedId('prog')) {
          L = stl.map((x) => ln(x, 'new')).concat([ln('IF NOT Station3_OK THEN', 'new'), ln('  Line_Stop := TRUE;  Alarm_Station3 := TRUE;   ' + c('// say WHAT is wrong'), 'new'), ln('ELSE', 'new'),
            '  Infeed_Motor := Auto AND Infeed_Ready;', ln('END_IF;', 'new')]);
          if (H.remLost) { sees = 'Station lost → the line stops in order. HMI: "Remote station 3 lost". The operator knows at once whom to call.'; kind = 'warn'; }
          else { sees = 'Station 3 OK: the infeed runs. And a lost station now gives a clear alarm.'; kind = 'ok'; }
        } else {
          L = [c('// Infeed_Motor is an output on the remote station 3'), 'Infeed_Motor := Auto AND Infeed_Ready;'];
          if (H.remLost) { L[1] = ln(L[1], 'bad'); sees = 'The program writes Infeed_Motor = TRUE, but the station is lost: the real motor is OFF. HMI: "AUTO, running", no alarm. Nobody knows why.'; kind = 'bad'; }
          else { sees = 'The infeed runs again. But the next lost station gives the same silent stop.'; kind = 'warn'; }
        }
      } else {
        L = [c('// the conveyor runs only when a part is ready'), 'Conveyor_Motor := Auto AND Part_Ready;   ' + c('// = FALSE now')];
        if (H.forced) { L.push(ln('<span class="c">// FORCE: ' + esc(B.q3) + ' = TRUE (wins over the program)</span>', 'bad')); sees = 'The program writes FALSE. The force writes TRUE → the motor RUNS with no parts. ' + P(b, 'MAINT', 'FORCE', 'FORCE') + ' LED yellow.'; kind = 'bad'; }
        else { sees = 'The program writes FALSE → the motor is off until a part is ready. The program is in control again.'; kind = 'ok'; }
      }
      if (!run && D.id !== 'index' && D.id !== 'loop') { sees = 'The CPU is in STOP: the program does not run and the outputs are off. Switch back to RUN.'; kind = 'warn'; }
      $('.hwd-lang').textContent = B.lang + ' in ' + B.name;
      progEl.innerHTML = `<pre class="hwd-code">${L.join('\n')}</pre><div class="hwd-sees ${kind}"><b>PLC sees</b><span>${nw(sees)}</span></div>`;
    }

    // ───── checklist ─────
    function renderCheck() {
      const C = checks(), okN = C.filter((c) => c.ok).length, all = okN === C.length, nDone = SC.filter((s) => done[s.id]).length;
      let h = `<div class="hwd-h"><b>Mission checklist · fault ${cur + 1} of ${SC.length} <span class="chip${all ? ' ok' : ''}" style="font-family:var(--f-body);letter-spacing:0;text-transform:none;margin-left:6px">${okN} / ${C.length}</span></b><button type="button" class="btn small" data-act="again" data-f="again">Start this fault again</button></div><ul class="hwd-cl">`;
      C.forEach((c) => (h += `<li class="${c.ok ? 'ok' : 'no'}"><i aria-hidden="true">${c.ok ? '✓' : '✗'}</i><span><b>${esc(c.t)}</b><span class="hwd-sr">${c.ok ? ' done' : ' not yet'}</span><small>${nw(c.d)}</small></span></li>`));
      h += '</ul>';
      if (all) {
        const next = SC.findIndex((s, i) => i > cur && !done[s.id]), any = next >= 0 ? next : SC.findIndex((s) => !done[s.id]);
        if (nDone === SC.length) h += `<div class="hwd-win"><p>All ${SC.length} faults fixed! The routine:<ol><li>Make it safe, look: LEDs, HMI, ask the operator.</li><li>Go online, read the buffer: newest first.</li><li>Name the cause with the help text.</li><li>Fix the cause, not the symptom.</li><li>Restart, test, remove forces, write it down.</li></ol></p><button type="button" class="btn small" data-act="go" data-i="0" data-f="go">Play fault 1 again</button></div>`;
        else h += `<div class="hwd-win"><p>Fault ${cur + 1} solved! ${nDone} of ${SC.length} done.</p><button type="button" class="btn small primary" data-act="go" data-i="${any}" data-f="go">Next fault ▶</button></div>`;
      } else h += `<p class="hwd-next"><b>Next:</b> ${nw(C.find((c) => !c.ok).hint)}</p>`;
      chkEl.innerHTML = h;
      return all;
    }

    function renderChips() {
      chipsEl.innerHTML = SC.map((s, i) => `<button type="button" class="hwd-chip${done[s.id] ? ' done' : ''}" data-act="go" data-i="${i}" data-f="ch-${i}" aria-current="${i === cur}"><i aria-hidden="true">${done[s.id] ? '✓' : i + 1}</i>${esc(s.chip)}<span class="hwd-sr">${done[s.id] ? ' (solved)' : ''}</span></button>`).join('');
      storyEl.innerHTML = `${ICON.call}<p><small>Fault ${cur + 1} of ${SC.length} · the call</small>${esc(sc().story)}</p>`;
    }

    // ───── render everything (keeps keyboard focus on the same control) ─────
    function renderAll() {
      const a = document.activeElement, fkey = a && root.contains(a) ? a.getAttribute('data-f') : null;
      const rows = bufEl.querySelector('.hwd-rows'), top = rows ? rows.scrollTop : 0;
      root.querySelectorAll('[data-act="brand"]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.b === brand)));
      renderChips(); renderHW(); renderBuf(); renderMoves(); renderProg();
      const r2 = bufEl.querySelector('.hwd-rows'); if (r2) r2.scrollTop = top;
      const all = renderCheck();
      if (all && !S.solved) { S.solved = true; done[sc().id] = true; save(); renderChips(); renderCheck(); }
      if (fkey) { const n = root.querySelector('[data-f="' + fkey + '"]'); if (n && !n.disabled) n.focus({ preventScroll: true }); }
      return all;
    }

    // ───── caption ─────
    function say(text, kind) {
      capEl.className = 'hwd-cap ' + (kind || 'info');
      capEl.querySelector('p').innerHTML = nw(text);
      fitCap();
      void capEl.offsetWidth;
      capEl.classList.add('flash');
    }
    function fitCap() {
      const p = capEl.querySelector('p'), narrow = root.classList.contains('hwd-narrow');
      capEl.classList.toggle('hwd-capx', capOpen);
      const lh = parseFloat(getComputedStyle(p).lineHeight) || 21;
      capEl.classList.toggle('hwd-long', narrow && p.scrollHeight > lh * 3 + 2);
      moreEl.textContent = capOpen ? 'less ▴' : 'more ▾';
      moreEl.setAttribute('aria-expanded', String(capOpen));
    }
    const WIN = ' Fault solved: every check is green!';
    function finish(text, kind) {
      const wasSolved = S.solved, all = renderAll();
      if (all && !wasSolved) say(text + WIN, 'ok'); else say(text, kind);
    }
    function intro() {
      const D = sc(), B = BR[brand];
      const lead = D.stops ? 'The CPU is in STOP (red LED). ' : D.id === 'force' ? 'The CPU runs, but a yellow LED is on. ' : 'The CPU runs, but a red LED flashes. ';
      return 'Fault ' + (cur + 1) + ': ' + lead + 'Step 1: read the ' + B.buf.toLowerCase() + '. The newest entry is at the top.';
    }

    // ───── actions ─────
    function selEv(n) {
      const e = S.ev.find((x) => x.n === n);
      if (!e) return;
      S.sel = n;
      const E = evOf(e), wasRead = S.read;
      if (E.key && !S.read) S.read = true;
      let t, k = 'info';
      if (E.key) {
        t = (wasRead ? '' : 'Good: this entry names the problem. ') + E.h.split('. ').slice(0, 2).join('. ') + '.' + (S.cause ? '' : ' Now pick the cause (step 2).');
        k = wasRead ? 'info' : 'ok';
      } else if (E.lv === 'ok') t = 'A green entry: a fault went away (outgoing event). ' + E.h;
      else t = 'A normal entry (' + E.t + '). ' + (S.read ? '' : 'Look for the newest red or yellow entry: it is at the top, because the newest entry comes first.');
      finish(t, k);
    }
    function pickCause(id) {
      const D = sc(), c = D.causes.find((x) => x.id === id);
      if (!c) return;
      if (!S.read) { renderAll(); return say('First read the diagnostics: click the newest red or yellow entry in the ' + BR[brand].buf.toLowerCase() + '. Guessing wastes time, and the PLC already knows the answer.', 'warn'); }
      if (S.cause) { renderAll(); return say(S.cause === id ? 'Yes, that is the cause. Now step 3: apply the fix.' : 'You already found the cause: ' + D.causes.find((x) => x.ok).t + '.', 'info'); }
      if (c.ok) { S.cause = id; return finish(txt(c.yes, brand) + ' Now step 3: apply the fix.', 'ok'); }
      S.wrongC[id] = true;
      finish(txt(c.no, brand), 'bad');
    }
    function applyFix(id) {
      const D = sc(), f = D.fixes.find((x) => x.id === id), b = brand;
      if (!f) return;
      if (!S.cause) { renderAll(); return say('First name the cause (step 2). Changing things at random can make it worse, and you would not know what helped.', 'warn'); }
      if (S.fixed[id]) { renderAll(); return say('Already done: ' + txt(f.t, b) + '.', 'info'); }
      if (!f.need) { S.wrongF[id] = true; return finish(txt(f.no, b), 'bad'); }
      S.fixed[id] = true;
      if (id === 'wire') push('wbOut', 4 * 60000 + 31522);
      if (id === 'cable') push('stOut', 3 * 60000 + 9117);
      if (id === 'unforce') push('frcOff', 41000 + 214);
      let t = txt(f.yes, b);
      const left = D.fixes.filter((x) => x.need && !S.fixed[x.id]);
      if (left.length) t += ' One more fix is needed: ' + (left[0].id === 'prog' ? 'the hardware works again, but the PROGRAM still trusts bad values.' : 'the program is ready, but the HARDWARE fault is still there.');
      else if (D.stops && S.cpu !== 'run') t += ' Now restart (step 4): ' + BR[b].restart;
      finish(t, left.length ? 'warn' : 'ok');
    }
    function mode(m) {
      const D = sc(), B = BR[brand];
      if (m === S.sw) {
        renderAll();
        if (m === 'run' && S.cpu === 'fault') return say('The switch is already at ' + B.sw.run + ', but the CPU stopped by itself because of an error. To restart: switch to ' + B.sw.stop + ', then back to ' + B.sw.run + '.', 'warn');
        return say('The switch is already at ' + B.sw[m] + '.', 'info');
      }
      if (m === 'stop') {
        const prev = S.cpu;
        S.sw = 'stop'; S.cpu = 'stop'; S.wasFault = prev === 'fault';
        push('swStop', 5000 + 312);
        if (prev === 'fault') return finish('The switch is at ' + B.sw.stop + '. ' + (allFixed() ? 'Now switch to ' + B.sw.run + ': the cause is fixed, so the CPU should start.' : 'You can switch to ' + B.sw.run + ' now, but the cause is not fixed yet.'), 'info');
        return finish('You stopped a running machine! The program stops and every output goes off. Only do this when you must. Switch back to ' + B.sw.run + '.', 'warn');
      }
      S.sw = 'run';
      push('swRun', 4000 + 127, S.wasFault);
      if (D.stops && !allFixed()) {
        S.cpu = 'fault';
        D.events.forEach((id, k) => push(id, k ? 1 : 96));
        S.sel = null;
        return finish(B.sw.run + ' for a moment, then STOP again: two new red entries at the top. ' + D.again + ' A restart does not fix a cause. Read, fix, THEN restart.', 'bad');
      }
      S.cpu = 'run'; S.wasFault = false;
      const H = hwState();
      let t = B.sw.run + ': the RUN LED is green, the program runs again.';
      if (H.aiBad || H.remLost) t += ' But a red LED still flashes: the fault is still there.';
      else if (H.forced) t += ' But the yellow LED is still on: the force is still there.';
      finish(t, H.aiBad || H.remLost || H.forced ? 'warn' : 'ok');
    }
    function setBrand(k) {
      if (!BR[k]) return;
      if (k === brand) { renderAll(); return say('You are already in ' + BR[k].name + '.', 'info'); }
      brand = k; save();
      renderAll();
      const B = BR[k];
      say(B.name + ': the ' + B.buf.toLowerCase() + ', the LEDs (' + B.leds.join(', ') + ') and the mode switch (' + B.sw.stop + ' / ' + B.sw.run + ') now use ' + B.name + ' words. Same fault, same routine.', 'info');
    }
    function go(i) {
      if (i < 0 || i >= SC.length) return;
      startSc(i);
      renderAll();
      say(intro(), sc().stops ? 'bad' : 'warn');
      const s = root.querySelector('.hwd-story');
      if (s && root.isConnected) { const r = s.getBoundingClientRect(); if (r.top < 60 || r.top > (window.innerHeight || 800) - 120) s.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }
    }

    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !root.contains(t) || t.disabled) return;
      const act = t.dataset.act;
      if (act === 'brand') setBrand(t.dataset.b);
      else if (act === 'ev') selEv(+t.dataset.n);
      else if (act === 'cause') pickCause(t.dataset.id);
      else if (act === 'fix') applyFix(t.dataset.id);
      else if (act === 'mode') mode(t.dataset.m);
      else if (act === 'go') go(+t.dataset.i);
      else if (act === 'again') { startSc(cur); renderAll(); say('Fault ' + (cur + 1) + ' starts again. ' + intro(), sc().stops ? 'bad' : 'warn'); }
      else if (act === 'more') { capOpen = !capOpen; fitCap(); }
    });

    ph.replaceWith(root);
    // layout by the widget's own width: narrow = phone, mid = the remote station goes under the rack
    let ro = null, seen = false, lastW = -1;
    const fit = () => {
      if (!root.isConnected) { if (seen) { if (ro) ro.disconnect(); else window.removeEventListener('resize', fit); } return; }
      seen = true;
      const w = root.clientWidth;
      if (w === lastW) return;
      lastW = w;
      root.classList.toggle('hwd-narrow', w < 560);
      root.classList.toggle('hwd-mid', w >= 560 && w < 720);
      fitCap();
    };
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(() => requestAnimationFrame(fit)); ro.observe(root); } else window.addEventListener('resize', fit);
    startSc(cur);
    renderAll();
    const nd = SC.filter((s) => done[s.id]).length;
    say((restored ? 'Welcome back: ' + nd + ' of ' + SC.length + ' faults solved. ' : '') + intro(), sc().stops ? 'bad' : 'warn');
    capEl.classList.remove('flash');
  };
})();
