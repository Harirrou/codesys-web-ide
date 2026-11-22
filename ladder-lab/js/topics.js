/* PLC Start — topics: 24 subjects. Each one collects every lesson, task,
 * Lab machine and quiz about one thing, so a learner can find them in one place
 * (Home "Explore by topic", #topic-<id> pages, chips on Learn and lesson pages).
 * Topic: id, title, blurb (one line for the Home card), intro, color, icon
 * (24×24 stroke SVG, drawn in the topic colour), start (first lesson),
 * lessons / tasks / machines (ids, in the order to do them) and quiz
 * (mode 'concept' + level, or 'iv' / 'net' + topic of that quiz bank).
 * Optional: quizFirst (the topic page shows the quiz before the lessons) and
 * path ({ id, label }: a guided path, shown as a second button on the topic page).
 * machines: the Lab machines worth free play in this topic (the task cards name their own machine). */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  LL.TOPICS = [
    {
      id: 'basics', title: 'Ladder basics', color: '#16a34a',
      blurb: 'Contacts, coils, NO / NC, AND / OR and the scan cycle.',
      intro: 'What you learn here: how a PLC reads inputs and switches outputs. Contacts, coils, NO and NC, AND and OR, addresses and the scan cycle.',
      start: 'what-is-plc',
      lessons: ['what-is-plc', 'scan-cycle', 'addresses', 'no-contact', 'nc-contact', 'and-or', 'field-vs-program', 'data-sizes'],
      tasks: [
        'first-light', 'ready-lamp', 'two-hand', 'hall-light', 'permissive', 'xor-stairs', 'majority', 'bug-or',
        'stop-nc', 'fix-stop'
      ],
      machines: ['panel', 'motor'],
      quiz: [
        { mode: 'concept', sel: 1, label: 'Level 1 quiz' },
        { mode: 'iv', sel: 'Basics', label: 'Interview: Basics' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.5v19M19 2.5v19"/><path d="M5 6.5h14M5 17.5h14"/><path d="M5 12h5M14 12h5M10 9v6M14 9v6"/></svg>',
    },
    {
      id: 'electrical', title: 'Electrical basics & wiring', color: '#a21caf',
      blurb: 'Volts, amps, Ohm\'s law, the multimeter, motors and I/O wiring.',
      intro: 'What you learn here: the electricity around the PLC. Ohm\'s law, 24 V control circuits, measuring with a multimeter, 3-phase motors and their nameplate, the overload relay, and how inputs and outputs are wired.',
      start: 'electrical-basics',
      lessons: ['electrical-basics'],
      tasks: [],
      machines: [],
      quiz: [
        { mode: 'iv', sel: 'Electrical & wiring', label: 'Interview: Electrical & wiring' },
        { mode: 'iv', sel: 'Electrical drawings', label: 'Interview: Electrical drawings' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11h-6.5z"/></svg>',
    },
    {
      id: 'memory', title: 'Latches & memory', color: '#0d9488',
      blurb: 'Seal-in, set / reset, edges and interlocks.',
      intro: 'What you learn here: how a program remembers. Seal-in, set and reset, edges (one-shots), interlocks and the traps of the scan.',
      start: 'seal-in',
      lessons: ['seal-in', 'set-reset', 'memory-bits', 'interlock', 'edges', 'scan-traps', 'triggers-advanced'],
      tasks: [
        'start-stop', 'fix-stop', 'two-station', 'jog-run', 'bug-latch', 'set-reset', 'interlock', 'toggle',
        'trig-release', 'trig-own', 'bug-trig-flicker', 'fix-double-coil', 'iv-buzzer', 'trig-count', 'trig-motor',
        'bug-trig-batch', 'diag-stop', 'trig-click', 'trig-bounce', 'trig-change'
      ],
      machines: ['motor', 'panel', 'oldpanel'],
      quiz: [
        { mode: 'concept', sel: 2, label: 'Level 2 quiz' },
        { mode: 'iv', sel: 'Programming', label: 'Interview: Programming' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="17" cy="12" r="2.6" fill="currentColor"/></svg>',
    },
    {
      id: 'timers', title: 'Timers', color: '#d97706',
      blurb: 'TON, TOF, TP, RTO, flashers and timed steps.',
      intro: 'What you learn here: how to wait, delay and flash. TON, TOF, TP and RTO timers, and machines that run on time.',
      start: 'ton',
      lessons: ['ton', 'tof-tp-rto', 'timer-patterns', 'timed-sequences'],
      tasks: [
        'delay-on', 'cascade', 'warning-horn', 'fan-overrun', 'one-pulse', 'service-hours', 'stair-timer', 'flasher',
        'bug-flasher', 'traffic', 'star-delta', 'iv-reverse', 'iv-seqstop', 'iv-testbench', 'stages-cmp', 'ped-crossing',
        'traffic-night'
      ],
      machines: ['panel', 'traffic', 'stardelta', 'conveyor', 'motor'],
      quiz: [
        { mode: 'concept', sel: 3, label: 'Level 3 quiz' },
        { mode: 'iv', sel: 'Timers & counters', label: 'Interview: Timers & counters' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13.5" r="7.5"/><path d="M10 2.5h4M12 2.5V6"/><path d="M12 13.5l3-3"/><path d="M18.4 6.6l1.4-1.4"/></svg>',
    },
    {
      id: 'counters', title: 'Counters & maths', color: '#7c3aed',
      blurb: 'Counters, compare, maths, shift registers and encoders.',
      intro: 'What you learn here: how to count and calculate. Counters, compare, words and maths, 32-bit numbers, shift registers and encoders.',
      start: 'counters',
      lessons: ['counters', 'data-sizes', 'compare-math', 'shift-registers', 'dint-real', 'encoders'],
      tasks: [
        'count-boxes', 'ctd-batch', 'parking', 'trig-count', 'trig-motor', 'bug-trig-batch', 'binary-switches',
        'compare', 'math', 'stages-cmp', 'iv-clock', 'iv-direction', 'sr-hand', 'bug-sr-edge', 'sr-clear', 'sr-delay',
        'sr-history', 'sr-ring', 'shift-chaser', 'track-1', 'track-2', 'track-3', 'auto-batching', 'palletizer',
        'dint-scale', 'enc-1', 'enc-2', 'enc-3', 'st-shift'
      ],
      machines: ['conveyor', 'parking', 'panel', 'tracking', 'feeder', 'palletizer', 'atank', 'traffic'],
      quiz: [
        { mode: 'concept', sel: 4, label: 'Level 4 quiz' },
        { mode: 'iv', sel: 'Timers & counters', label: 'Interview: Timers & counters' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 5v14M9.5 5v14M13.5 5v14M17.5 5v14"/><path d="M3 16L21 8"/></svg>',
    },
    {
      id: 'blocks', title: 'Blocks & structure', color: '#4f46e5',
      blurb: 'Function blocks (FB / FC) and a clear program layout.',
      intro: 'What you learn here: how to write a program that is easy to read and to reuse. Function blocks (FB) and functions (FC), a clear program layout, and how to plan a project.',
      start: 'blocks',
      lessons: ['blocks', 'structure', 'project-method'],
      tasks: ['blk-motors', 'drive-1', 'blk-fc', 'blk-fb-timeout', 'drive-line'],
      machines: ['vfdline', 'cylinders', 'panel'],
      quiz: [
        { mode: 'iv', sel: 'Programming', label: 'Interview: Programming' },
        { mode: 'iv', sel: 'Projects & practice', label: 'Interview: Projects & practice' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="4" width="11" height="16" rx="1.5"/><path d="M2.5 9h4M2.5 15h4M17.5 9h4M17.5 15h4"/></svg>',
    },
    {
      id: 'sequences', title: 'Sequences & modes', color: '#0891b2',
      blurb: 'Step sequences, GRAFCET / SFC and OFF / MAN / AUTO.',
      intro: 'What you learn here: how a machine does one step after another. Step numbers, GRAFCET / SFC, OFF / MANUAL / AUTO modes, homing, and what to do when something goes wrong.',
      start: 'state-machine',
      lessons: ['state-machine', 'seq-tools', 'modes', 'sfc'],
      tasks: [
        'cyl-once', 'cyl-repeat', 'step-machine', 'cylinders-abc', 'cyl-abba-c', 'cyl-dwell', 'cyl-parallel',
        'cyl-cycle-stop', 'sfc-1', 'cyl-modes', 'drill-station', 'oven', 'pp-feed', 'pp-axis', 'pp-pick', 'pp-cycle',
        'bug-pp-crash', 'pp-sort', 'pp-auto', 'pp-home', 'pp-station', 'indexer', 'crane', 'sorter', 'capline', 'fixture',
        'fixture-man', 'fixture-c', 'fixture-orders', 'st-case-abc', 'fixture-modes', 'st-fixture-c', 'fixture-changeover'
      ],
      machines: ['cylinders', 'pickplace', 'drill', 'oven', 'indexer', 'crane', 'sorter', 'capline', 'fixture'],
      quiz: [
        { mode: 'concept', sel: 5, label: 'Level 5 quiz' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3" width="8" height="6" rx="1"/><rect x="3.5" y="15" width="8" height="6" rx="1"/><path d="M7.5 9v6M4.5 12h6"/><path d="M11.5 18H17a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"/><path d="M15.5 3.5L13 6l2.5 2.5"/></svg>',
    },
    {
      id: 'pneumatics', title: 'Pneumatic cylinders', color: '#0284c7',
      blurb: 'All valve types, end sensors, cylinder sequences, pick & place.',
      intro: 'What you learn here: how air cylinders are driven by a PLC. Valves, end sensors, cylinder sequences and a pick & place station.',
      start: 'field-devices',
      lessons: ['field-devices', 'pneu-valves', 'video-circuit', 'state-machine', 'seq-tools'],
      tasks: [
        'cyl-once', 'cyl-repeat', 'cylinders-abc', 'step-machine', 'cyl-abba-c', 'cyl-dwell', 'cyl-parallel',
        'cyl-cycle-stop', 'cyl-modes', 'sfc-1', 'blk-fc', 'blk-fb-timeout', 'cio-2', 'st-repeat-count', 'diag-reed',
        'pp-feed', 'pp-axis', 'pp-pick', 'diag-vacuum', 'pp-cycle', 'bug-pp-crash', 'pp-sort', 'pp-auto', 'pp-home',
        'pp-station', 'st-case-abc', 'vlv-bistable', 'vlv-midstop', 'vlv-lift', 'bug-vlv-both'
      ],
      machines: ['cylinders', 'pickplace', 'valvebench'],
      quiz: [
        { mode: 'iv', sel: 'Fluid power', label: 'Interview: Fluid power' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="9" width="12.5" height="9" rx="1"/><path d="M7.5 9v9"/><path d="M7.5 13.5h14M21.5 11v5"/><path d="M4.5 9V5M12 9V5"/></svg>',
    },
    {
      id: 'hydraulics', title: 'Hydraulics', color: '#b45309',
      blurb: 'Power unit, press, two-hand control, proportional valves.',
      intro: 'What you learn here: how oil power is controlled. The power unit, a press cycle, two-hand control, an accumulator and proportional valves.',
      start: 'hydraulics',
      lessons: ['hydraulics', 'proportional'],
      tasks: ['hyd-b1', 'hyd-b2', 'hyd-1', 'hyd-2', 'bug-hyd', 'hyd-acc', 'prop-1', 'hyd-3', 'hyd-4', 'prop-2'],
      machines: ['hpress', 'accu', 'propaxis'],
      quiz: [
        { mode: 'iv', sel: 'Fluid power', label: 'Interview: Fluid power' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.8C9.6 5.8 5.5 10.5 5.5 14.5a6.5 6.5 0 0 0 13 0c0-4-4.1-8.7-6.5-11.7z"/><path d="M9 15a3 3 0 0 0 3 3"/></svg>',
    },
    {
      id: 'motors', title: 'Motors & drives', color: '#ea580c',
      blurb: 'Start / stop, reversing, star-delta, soft starter, VFD.',
      intro: 'What you learn here: how to start, stop and reverse a motor. Star-delta, soft starter and variable-speed drives (VFD).',
      start: 'seal-in',
      lessons: ['seal-in', 'interlock', 'timed-sequences', 'motor-starters', 'drives'],
      tasks: [
        'start-stop', 'two-station', 'jog-run', 'interlock', 'fix-stop', 'bug-latch', 'iv-reverse', 'star-delta',
        'cascade', 'warning-horn', 'soft-1', 'diag-stop', 'blk-motors', 'drive-1', 'drive-line', 'pump-station',
        'compressor'
      ],
      machines: ['motor', 'stardelta', 'softstart', 'vfdline', 'pumps', 'compressor', 'conveyor', 'panel'],
      quiz: [
        { mode: 'iv', sel: 'Drives & motion', label: 'Interview: Drives & motion' },
        { mode: 'concept', sel: 2, label: 'Level 2 quiz' },
      ],
      // the motor symbol of electrical drawings: a circle with M, and its shaft
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="12" r="8"/><path d="M6.8 15.5v-7l3.7 4.4 3.7-4.4v7"/><path d="M18.5 12h3.5"/></svg>',
    },
    {
      id: 'starting', title: 'Motor starting circuits', color: '#c2410c',
      blurb: 'DOL, star-delta, autotransformer, resistors, soft starter, VFD: circuit and ladder.',
      intro: 'What you learn here: the seven ways to start a 3-phase motor. For each one: the power circuit, why it lowers the starting current, the ladder program, and what stays hard-wired even with a PLC. With a circuit simulator where you can also close the contactors by hand.',
      start: 'starting-methods',
      lessons: ['starting-methods', 'motor-starters', 'drives', 'electrical-basics', 'interlock', 'timed-sequences'],
      tasks: ['start-stop', 'star-delta', 'res-1', 'rotor-1', 'at-1', 'res-2', 'soft-1', 'drive-1', 'el-ol-trip'],
      machines: ['motor', 'stardelta', 'resstart', 'autotrafo', 'rotorres', 'softstart', 'vfdline'],
      quiz: [
        { mode: 'iv', sel: 'Motor starting', label: 'Interview: Motor starting' },
        { mode: 'iv', sel: 'Electrical & wiring', label: 'Interview: Electrical & wiring' },
        { mode: 'concept', sel: 4, label: 'Level 4 quiz' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4l3.5 4.5L10 4M6.5 8.5V14"/><path d="M13.5 20.5l3.75-7 3.75 7z"/><path d="M13 5h7M17.5 2.5L20 5l-2.5 2.5"/></svg>',
    },
    {
      id: 'motion', title: 'Motion & servos', color: '#db2777',
      blurb: 'Servo axes: power on, jog, homing and positioning.',
      intro: 'What you learn here: how a PLC moves a servo axis. Power on, jog, homing, move to a position, and set up the axis from an HMI.',
      start: 'motion',
      lessons: ['motion', 'servo-hmi', 'motion-practice'],
      tasks: ['mo-1', 'mo-2', 'mo-3', 'sv-1', 'sv-2', 'mo-4', 'bug-mo-crash', 'mo-5', 'sv-3'],
      machines: ['gantry', 'servohmi'],
      quiz: [
        { mode: 'iv', sel: 'Drives & motion', label: 'Interview: Drives & motion' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18M6 4L3 7l3 3M18 4l3 3-3 3"/><rect x="8" y="13" width="8" height="5" rx="1"/><path d="M2.5 20.5h19"/></svg>',
    },
    {
      id: 'analog', title: 'Analog & PID', color: '#2563eb',
      blurb: '4–20 mA sensors, scaling, temperature, weight and PID.',
      intro: 'What you learn here: how to read real values like level, temperature and weight. 4–20 mA signals, scaling, and on/off and PID control.',
      start: 'analog',
      lessons: ['analog', 'analog-practice', 'control-loops', 'pid-practice'],
      tasks: [
        'analog-scale', 'furn-1', 'tank', 'furn-2', 'furn-3', 'weigh-1', 'level-control', 'furn-4', 'weigh-2', 'pid-1',
        'pid-2', 'dint-scale', 'st-average', 'st-greenhouse'
      ],
      machines: ['atank', 'furnace', 'weigher', 'booster', 'tank', 'greenhouse'],
      quiz: [
        { mode: 'iv', sel: 'Analog & PID', label: 'Interview: Analog & PID' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 17.5a9 9 0 1 1 17 0"/><circle cx="12" cy="14.5" r="1.6"/><path d="M13.2 13.3l3.6-3.6"/><path d="M12 6.5v1.5M6.4 8.9l1 1M5 14.5h1.5"/></svg>',
    },
    {
      id: 'safety', title: 'Machine safety', color: '#dc2626',
      blurb: 'E-stop, safety relay / PLC, guard doors, light curtains.',
      intro: 'What you learn here: how to keep people safe at a machine. E-stop, safety relay or safety PLC, guard doors, light curtains and two-hand control.',
      start: 'safety',
      lessons: ['safety', 'safety-practice'],
      tasks: ['saf-1', 'diag-relay', 'lc-1', 'saf-2', 'lc-2', 'hyd-3', 'garage', 'gate', 'two-hand', 'majority'],
      machines: ['safecell', 'safeplc', 'curtain', 'hpress', 'garage', 'gate', 'panel'],
      quiz: [
        { mode: 'iv', sel: 'Safety', label: 'Interview: Safety' },
        { mode: 'net', sel: 'Safety networks', label: 'Networks: Safety networks' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
    },
    {
      id: 'alarms', title: 'Alarms & HMI', color: '#e11d48',
      blurb: 'Horn, acknowledge, first-out, HMI texts and panels.',
      intro: 'What you learn here: how a machine tells the operator what is wrong. Alarms with horn, acknowledge and first-out, and texts and buttons on the HMI.',
      start: 'alarm-handling',
      lessons: ['alarm-handling', 'hmi-texts', 'safety', 'servo-hmi'],
      tasks: ['alarm-1', 'furn-3', 'sv-1', 'sv-2', 'alarm-2', 'alarm-3', 'track-3', 'pp-home', 'bcr-3', 'fixture-man'],
      machines: ['alarms', 'labeler', 'tracking', 'furnace', 'servohmi', 'fixture', 'pickplace'],
      quiz: [],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M3 9a9 9 0 0 1 2.5-5M21 9a9 9 0 0 0-2.5-5"/></svg>',
    },
    {
      id: 'data', title: 'Data, recipes & strings', color: '#65a30d',
      blurb: 'Data blocks, arrays, recipes, strings and barcodes.',
      intro: 'What you learn here: how to store and use data. Data blocks, arrays, recipes, text strings, and a barcode reader that sends codes to a label printer.',
      start: 'data-blocks',
      lessons: ['data-blocks', 'data-sizes', 'barcode-printer', 'hmi-texts', 'tool-id', 'st-loops'],
      tasks: [
        'bcr-1', 'bcr-2', 'db-recipe', 'bug-db-index', 'bcr-3', 'fixture-id', 'fixture', 'fixture-man', 'fixture-c',
        'fixture-orders', 'st-for-bargraph', 'st-while-slot', 'st-average', 'st-elevator', 'st-fixture', 'fixture-modes',
        'st-fixture-c', 'fixture-changeover'
      ],
      machines: ['feeder', 'labeler', 'fixture', 'atank', 'panel', 'elevator'],
      quiz: [],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
    },
    {
      id: 'networks', title: 'Networks & communication', color: '#0e7490',
      blurb: 'Serial, Modbus, PROFIBUS, CAN, PROFINET, EtherCAT, MQTT.',
      intro: 'What you learn here: how PLCs and devices talk to each other. How serial, Modbus, PROFIBUS, CAN, PROFINET, EtherCAT and MQTT work, and handshakes between machines.',
      start: 'protocols',
      lessons: ['protocols', 'networks', 'project-setup'],
      tasks: ['mb-1', 'comm-1', 'comm-2', 'comm-3', 'mb-2'],
      machines: ['handover', 'modbus'],
      quiz: [
        { mode: 'net', sel: 'Basics', label: 'Basics' },
        { mode: 'net', sel: 'How it works', label: 'How it works' },
        { mode: 'net', sel: 'Serial (RS-232 / RS-485)', label: 'Serial (RS-232 / RS-485)' },
        { mode: 'net', sel: 'Modbus', label: 'Modbus' },
        { mode: 'net', sel: 'PROFIBUS', label: 'PROFIBUS' },
        { mode: 'net', sel: 'CAN, CANopen, DeviceNet', label: 'CAN, CANopen, DeviceNet' },
        { mode: 'net', sel: 'LIN', label: 'LIN' },
        { mode: 'net', sel: 'AS-i & HART', label: 'AS-i & HART' },
        { mode: 'net', sel: 'IO-Link', label: 'IO-Link' },
        { mode: 'net', sel: 'PROFINET', label: 'PROFINET' },
        { mode: 'net', sel: 'EtherNet/IP', label: 'EtherNet/IP' },
        { mode: 'net', sel: 'EtherCAT', label: 'EtherCAT' },
        { mode: 'net', sel: 'OPC UA & MQTT', label: 'OPC UA & MQTT' },
        { mode: 'net', sel: 'Safety networks', label: 'Safety networks' },
        { mode: 'net', sel: 'Troubleshooting', label: 'Troubleshooting' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5V12M5 16.5V12h14v4.5"/></svg>',
    },
    {
      id: 'setup', title: 'Hardware & going online', color: '#475569',
      blurb: 'IP addresses, the rack and I/O, download, upload, force.',
      intro: 'What you learn here: how a real project starts. Put cards in the rack and read their addresses, set IP addresses and device names, then download, upload and force.',
      start: 'project-setup',
      lessons: ['project-setup', 'addresses'],
      tasks: ['cio-1', 'cio-2'],
      machines: ['cylinders'],
      quiz: [
        { mode: 'iv', sel: 'Hardware & online', label: 'Interview: Hardware & online' },
        { mode: 'iv', sel: 'Diagnostics', label: 'Interview: Diagnostics' },
        { mode: 'net', sel: 'Basics', label: 'Networks: Basics' },
      ],
      // a PLC rack (power supply, CPU, I/O cards) with its network cable
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="12" rx="1.5"/><path d="M7 5v12M11.5 5v12M16 5v12"/><path d="M12 17v4M8.5 21h7"/></svg>',
    },
    {
      id: 'commissioning', title: 'Commissioning & fault finding', color: '#a16207',
      blurb: 'I/O check, drawings, broken sensors, wires and valves.',
      intro: 'What you learn here: how to start a new machine and find faults on it. The I/O check, reading electrical drawings, and finding a broken sensor, wire or valve.',
      start: 'commissioning',
      lessons: ['commissioning', 'drawings', 'troubleshooting', 'structure'],
      tasks: [
        'cio-1', 'cio-2', 'cio-plaus', 'diag-reed', 'diag-stop', 'diag-eye', 'diag-tank', 'diag-vacuum', 'diag-door',
        'diag-relay'
      ],
      machines: ['cylinders', 'motor', 'conveyor', 'tank', 'pickplace', 'lift', 'safecell'],
      quiz: [

        { mode: 'iv', sel: 'Diagnostics', label: 'Interview: Diagnostics' },        { mode: 'iv', sel: 'Troubleshooting', label: 'Interview: Troubleshooting' },
        { mode: 'iv', sel: 'Electrical drawings', label: 'Interview: Electrical drawings' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.2 4A5.5 5.5 0 0 0 10.1 11.4L3.9 17.7a1.75 1.75 0 0 0 2.5 2.5L12.6 13.9A5.5 5.5 0 0 0 20 6.8L16.8 10.1 13.9 7.2z"/></svg>',
    },
    {
      id: 'production', title: 'Production data & clock', color: '#059669',
      blurb: 'OEE, part counters, downtime and the PLC clock.',
      intro: 'What you learn here: how a machine reports what it makes. Part counters, run time and downtime, OEE, and the PLC clock for schedules.',
      start: 'production-data',
      lessons: ['production-data', 'plc-clock'],
      tasks: ['prod-1', 'tod-1', 'service-hours', 'tod-2', 'iv-clock', 'prod-2', 'prod-3'],
      machines: ['prodcell', 'building', 'panel'],
      quiz: [],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="5" y="13" width="3.5" height="5" rx=".5"/><rect x="10.25" y="9" width="3.5" height="9" rx=".5"/><rect x="15.5" y="4.5" width="3.5" height="13.5" rx=".5"/></svg>',
    },
    {
      id: 'st', title: 'Structured Text', color: '#9333ea',
      blurb: 'IF, CASE, loops, arrays and function blocks in ST.',
      intro: 'What you learn here: Structured Text (ST), the text language of PLCs. IF, CASE, loops, arrays and function blocks in ST.',
      start: 'iec',
      lessons: ['iec', 'st-basics', 'st-fb', 'st-case', 'st-loops'],
      tasks: [
        'st-latch', 'st-timers', 'st-bug-latch', 'st-bug-timer', 'st-case-abc', 'st-repeat-count', 'st-traffic',
        'st-gate', 'st-for-bargraph', 'st-while-slot', 'st-shift', 'st-average', 'st-elevator', 'st-mixer',
        'st-bottling', 'st-greenhouse', 'st-fixture', 'fixture-modes', 'st-fixture-c', 'fixture-changeover'
      ],
      machines: [
        'panel', 'motor', 'cylinders', 'traffic', 'gate', 'atank', 'elevator', 'mixer', 'bottling', 'greenhouse',
        'fixture'
      ],
      quiz: [
        { mode: 'concept', sel: 7, label: 'Level 7 quiz' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3.5h-.5a2 2 0 0 0-2 2V9.5A2.5 2.5 0 0 1 3 12a2.5 2.5 0 0 1 2.5 2.5v4a2 2 0 0 0 2 2H8"/><path d="M16 3.5h.5a2 2 0 0 1 2 2V9.5A2.5 2.5 0 0 0 21 12a2.5 2.5 0 0 0-2.5 2.5v4a2 2 0 0 1-2 2H16"/><path d="M9.5 12h0M12 12h0M14.5 12h0" stroke-width="2.4"/></svg>',
    },
    {
      id: 'machines', title: 'Whole machines', color: '#57534e',
      blurb: 'Elevator, car wash, bottling, mixer, crane, palletizer…',
      intro: 'What you learn here: how to program a whole machine from start to end. Elevator, car wash, bottling line, mixer, crane, palletizer and more.',
      start: 'project-method',
      lessons: ['project-method', 'lift-control', 'tool-id'],
      tasks: [
        'garage', 'tank', 'drill-station', 'oven', 'ped-crossing', 'traffic-night', 'bottling', 'mixer', 'washer',
        'carwash', 'elevator', 'sorter', 'crane', 'indexer', 'auto-batching', 'gate', 'compressor', 'pump-station',
        'level-control', 'capline', 'palletizer', 'pp-station', 'hyd-4', 'fixture-id', 'fixture', 'fixture-man',
        'fixture-c', 'fixture-orders', 'lift-1', 'lift-2', 'lift-3', 'lift-4', 'lift-5', 'lift-6', 'lift-7'
      ],
      machines: [
        'elevator', 'lift', 'carwash', 'bottling', 'mixer', 'crane', 'palletizer', 'sorter', 'washer', 'capline',
        'indexer', 'drill', 'oven', 'garage', 'gate', 'compressor', 'pumps', 'traffic', 'conveyor', 'tank', 'atank',
        'fixture', 'pickplace', 'hpress'
      ],
      quiz: [
        { mode: 'concept', sel: 6, label: 'Level 6 quiz' },
        { mode: 'iv', sel: 'Projects & practice', label: 'Interview: Projects & practice' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 20.5V4H7v7.5l4.5-3v3l4.5-3v3l4.5-3v12"/><path d="M2 20.5h20"/><path d="M10 16h1.5M14.5 16H16"/></svg>',
    },
    {
      id: 'brands', title: 'Real software & brands', color: '#1d4ed8',
      blurb: 'TIA Portal, Studio 5000, CODESYS, Schneider, TwinCAT, Omron.',
      intro: 'What you learn here: how your ladder looks in real software. TIA Portal, Studio 5000, CODESYS, Schneider, TwinCAT and Omron: the names, and how to translate.',
      start: 'real-software',
      lessons: ['real-software', 'project-setup', 'iec'],
      tasks: ['port-rk'],
      machines: [],
      quiz: [
        { mode: 'iv', sel: 'Hardware & online', label: 'Interview: Hardware & online' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 9V5a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 21.5 5v8a1.5 1.5 0 0 1-1.5 1.5h-3"/><path d="M7.5 7h14"/><rect x="2.5" y="9" width="14.5" height="11.5" rx="1.5"/><path d="M2.5 12.5h14.5"/></svg>',
    },
    {
      id: 'interview', title: 'Interview preparation', color: '#be123c',
      blurb: 'The classic PLC interview tasks and questions.',
      intro: 'What you learn here: the tasks and questions you meet in a PLC job interview. Practise them here, from easy to hard.',
      start: 'interview-prep',
      lessons: ['interview-prep'],
      // the same tasks, in the same order, as the guided interview path (#path-interview)
      tasks: [
        'start-stop', 'stop-nc', 'two-station', 'interlock', 'toggle', 'set-reset', 'majority', 'iv-buzzer', 'iv-reverse',
        'iv-seqstop', 'iv-testbench', 'iv-clock', 'iv-direction', 'traffic', 'star-delta', 'tank', 'flasher',
        'count-boxes', 'parking', 'pump-station', 'fix-stop', 'bug-latch', 'fix-double-coil', 'bug-flasher',
        'bug-trig-batch', 'bug-sr-edge', 'port-rk', 'diag-stop', 'garage', 'cylinders-abc', 'carwash', 'bottling', 'mixer',
        'washer', 'elevator', 'hyd-b2', 'hyd-acc', 'bug-hyd', 'hyd-3', 'hyd-4', 'cio-1', 'tod-1', 'prod-1', 'prod-3',
        'soft-1', 'mb-1', 'saf-1', 'saf-2', 'db-recipe', 'bcr-2', 'blk-fc', 'blk-fb-timeout', 'alarm-1', 'analog-scale',
        'dint-scale', 'pid-2', 'comm-2', 'mo-3', 'sv-2', 'st-latch', 'st-timers', 'st-case-abc', 'st-average'
      ],
      // free-play machines do not help to prepare an interview: every task card names its machine
      machines: [],
      // the questions are what most people look for here: show them first
      quizFirst: true,
      path: { id: 'interview', label: 'Follow the interview path' },
      quiz: [
        { mode: 'iv', sel: 'Basics', label: 'Interview: Basics' },
        { mode: 'iv', sel: 'Programming', label: 'Interview: Programming' },
        { mode: 'iv', sel: 'Timers & counters', label: 'Interview: Timers & counters' },
        { mode: 'iv', sel: 'Analog & PID', label: 'Interview: Analog & PID' },
        { mode: 'iv', sel: 'Drives & motion', label: 'Interview: Drives & motion' },
        { mode: 'iv', sel: 'Safety', label: 'Interview: Safety' },
        { mode: 'iv', sel: 'Troubleshooting', label: 'Interview: Troubleshooting' },
        { mode: 'iv', sel: 'Electrical drawings', label: 'Interview: Electrical drawings' },
        { mode: 'iv', sel: 'Hardware & online', label: 'Interview: Hardware & online' },
        { mode: 'iv', sel: 'Diagnostics', label: 'Interview: Diagnostics' },
        { mode: 'iv', sel: 'Electrical & wiring', label: 'Interview: Electrical & wiring' },
        { mode: 'iv', sel: 'Fluid power', label: 'Interview: Fluid power' },
        { mode: 'iv', sel: 'Projects & practice', label: 'Interview: Projects & practice' },
      ],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/><path d="M2.5 12.5h19"/><path d="M10.5 12.5v2h3v-2"/></svg>',
    },
  ];
  // ── added by later content waves (generated) ──
  const ADD = {"commissioning": {"lessons": ["cpu-diagnostics", "electrical-basics", "io-wiring", "drive-setup", "process-docs", "loto-handover"], "tasks": ["diag-el-ol"], "machines": []}, "setup": {"lessons": ["cpu-diagnostics", "io-wiring", "plc-tasks"], "tasks": [], "machines": []}, "electrical": {"lessons": ["electrical-basics", "field-vs-program", "field-devices", "drawings", "motor-starters", "starting-methods", "io-wiring", "control-circuits", "process-docs"], "tasks": ["el-ol-trip", "diag-el-ol", "stop-nc", "fix-stop", "diag-stop", "star-delta"], "machines": ["motor", "stardelta", "panel", "resstart", "autotrafo", "rotorres"]}, "motors": {"lessons": ["electrical-basics", "starting-methods", "word-logic", "control-circuits", "drive-setup"], "tasks": ["el-ol-trip", "res-1", "rotor-1", "at-1", "res-2", "stw-1", "stw-2"], "machines": ["resstart", "autotrafo", "rotorres", "busdrive"]}, "interview": {"lessons": ["starting-methods", "io-wiring", "hmi-design", "word-logic", "control-circuits", "plc-tasks", "safety-design", "drive-setup", "packml", "process-docs", "loto-handover", "robot-interface", "flow-data"], "tasks": ["res-1", "rotor-1"], "machines": []}, "basics": {"lessons": ["io-wiring"], "tasks": [], "machines": []}, "alarms": {"lessons": ["hmi-design"], "tasks": [], "machines": []}, "counters": {"lessons": ["word-logic", "real-scaling"], "tasks": [], "machines": []}, "networks": {"lessons": ["word-logic", "robot-interface"], "tasks": ["stw-1", "stw-2"], "machines": ["busdrive"]}, "analog": {"lessons": ["real-scaling", "plc-tasks", "process-docs"], "tasks": ["stw-2"], "machines": ["busdrive"]}, "data": {"lessons": ["word-logic", "real-scaling", "flow-data"], "tasks": ["fifo-1"], "machines": []}, "starting": {"lessons": ["control-circuits", "drive-setup"], "tasks": [], "machines": []}, "memory": {"lessons": ["control-circuits"], "tasks": [], "machines": []}, "blocks": {"lessons": ["plc-tasks", "st-advanced", "flow-data"], "tasks": ["jmp-1", "mcr-1"], "machines": []}, "safety": {"lessons": ["safety-design", "loto-handover"], "tasks": [], "machines": []}, "sequences": {"lessons": ["packml", "robot-interface", "flow-data"], "tasks": ["robot-1", "robot-2"], "machines": ["robotcell"]}, "machines": {"lessons": ["packml", "robot-interface"], "tasks": ["robot-1", "robot-2", "bug-robot"], "machines": ["robotcell"]}, "st": {"lessons": ["st-advanced"], "tasks": [], "machines": []}};
  Object.keys(ADD).forEach((id) => {
    const t = LL.TOPICS.find((x) => x.id === id); if (!t) return;
    ['lessons', 'tasks', 'machines'].forEach((k) => { t[k] = t[k] || []; ADD[id][k].forEach((x) => { if (!t[k].includes(x)) t[k].push(x); }); });
  });
  // ── end of added content ──
  // no prototype: #topic-constructor or #topic-toString must not find a "topic"
  LL.TOPIC_BY_ID = Object.create(null);
  LL.TOPICS.forEach((t) => { LL.TOPIC_BY_ID[t.id] = t; });
  // the topics that contain a lesson (chips on the lesson page)
  LL.topicsOfLesson = (id) => LL.TOPICS.filter((t) => t.lessons.includes(id));
})(typeof window !== 'undefined' ? window : globalThis);
