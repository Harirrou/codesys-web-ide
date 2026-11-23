/* PLC Start — curriculum. Each lesson: what / why / where / how, live
 * examples ([[sim:key]] placeholders), common mistakes, takeaways and the
 * challenges that practise it. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  LL.LEVELS = [
    { n: 1, color: '#16a34a', name: 'Foundations', sub: 'How a PLC thinks: contacts, coils, AND / OR' },
    { n: 2, color: '#0d9488', name: 'Memory & motor control', sub: 'Latching, set/reset, interlocks, edges' },
    { n: 3, color: '#d97706', name: 'Timers', sub: 'On-delay, off-delay, pulse, retentive, timed sequences' },
    { n: 4, color: '#2563eb', name: 'Counters & data', sub: 'Counting, comparing, words, field devices' },
    { n: 5, color: '#db2777', name: 'Sequences & pro practice', sub: 'Step logic, state machines, safety, structure' },
    { n: 6, color: '#ea580c', name: 'Real-world projects', sub: 'Whole machines: filling line, mixer, elevator, sorter, car wash, pump station, level control' },
    { n: 7, color: '#9333ea', name: 'Structured Text (ST)', sub: 'IF, CASE, FOR, WHILE, REPEAT, arrays and function blocks, as in CODESYS' },
  ];

  const pb = (name) => ({ name, kind: 'pb' });
  const nc = (name) => ({ name, kind: 'pbnc' });
  const sw = (name) => ({ name, kind: 'sw' });

  LL.LESSONS = [
    // ═══════════════════════ LEVEL 1 ═══════════════════════
    {
      id: 'what-is-plc', level: 1, title: 'What a PLC is, and why ladder', min: 6,
      summary: 'A rugged computer that reads switches, decides, and drives motors and valves, over and over.',
      body: `
<h3>What it is</h3>
<p>A <b>PLC</b> (Programmable Logic Controller) is an industrial computer built to control machines. Wires from <b>inputs</b> (push buttons, limit switches, sensors) come into it, and wires to <b>outputs</b> (contactors, lamps, solenoid valves, buzzers) go out of it. The program in the middle decides which outputs switch on.</p>
<p><b>Ladder logic</b> (LD) is the most common way to write that program. It looks like an electrical drawing on purpose: before PLCs, machines were controlled by cabinets full of relays wired together. Ladder kept that picture so electricians could read the new controllers on day one.</p>
<h3>Reading a ladder</h3>
<ul>
<li>Two vertical lines are the <b>power rails</b>. Imagine the left one is live and the right one is neutral.</li>
<li>Each horizontal line between them is a <b>rung</b>. A rung is one rule: <i>"if these conditions, then this output"</i>.</li>
<li>Conditions on the left are <b>contacts</b> <code>-| |-</code>. The result on the right is a <b>coil</b> <code>-( )-</code>.</li>
<li>If a continuous path of "closed" contacts connects the left rail to the coil, the coil is <b>energised</b>. In PLC Start, powered wires glow green.</li>
</ul>
[[sim:first]]
<div class="callout where"><b>Where you'll meet PLCs:</b> packaging lines, water treatment, car factories, elevators, HVAC, cranes, food & beverage, conveyors at airports and warehouses, oil & gas skids. Anything with motors, valves and sensors that must run 24/7.</div>
<h3>Why not just use a PC or Arduino?</h3>
<ul>
<li><b>Rugged:</b> built for heat, vibration and electrical noise; runs for decades.</li>
<li><b>Deterministic:</b> it repeats the same scan every few milliseconds, so timing is predictable.</li>
<li><b>Maintainable:</b> a technician can watch the ladder live and see exactly which contact is blocking a machine at 3 a.m.</li>
<li><b>Standard I/O:</b> 24 V DC inputs, relay or transistor outputs, analog cards, fieldbus.</li>
</ul>`,
      sims: { first: { program: 'RUNG Press the button: power flows to the lamp\nNO(I0.0) COIL(Q0.0)', inputs: { 'I0.0': pb('Button') }, outputs: { 'Q0.0': 'Lamp' }, note: 'Hold the button. The contact closes, the rung conducts, and the coil (the lamp) switches on.' } },
      takeaways: ['Inputs → program → outputs.', 'A rung is a rule: conditions on the left, result on the right.', 'Green path from the left rail to the coil = output ON.'],
      mistakes: ['Thinking the ladder is the real wiring. It is a program. The real wiring stops at the PLC terminals.'],
      challenges: ['first-light'],
    },
    {
      id: 'scan-cycle', level: 1, title: 'The scan cycle', min: 7,
      summary: 'Read all inputs → solve rungs top to bottom → write all outputs → repeat.',
      body: `
<h3>What it is</h3>
<p>A PLC does not "watch" a button the way you do. It runs a tight loop called the <b>scan</b>, typically every 1–20 ms:</p>
<ol>
<li><b>Read inputs:</b> copies every input terminal into memory (the input image).</li>
<li><b>Solve the program:</b> evaluates rung 1, then rung 2, then rung 3 … top to bottom, left to right.</li>
<li><b>Write outputs:</b> copies the result bits to the output terminals.</li>
<li><b>Housekeeping</b> (communication, diagnostics), then start again.</li>
</ol>
<h3>Why it matters</h3>
<p>Three consequences catch beginners:</p>
<ul>
<li>A rung can only use what earlier rungs <b>in the same scan</b> already wrote. Rung order matters.</li>
<li>If two rungs write the same coil, the <b>last one wins</b> (more in "Scan traps").</li>
<li>A signal shorter than one scan can be missed. That is why fast pulses need special inputs.</li>
</ul>
<h3>See it step by step</h3>
<p>In the simulator, press <b>Step</b> to run one phase at a time: read inputs → rung 1 → rung 2 → write outputs. The rung being solved is highlighted. Try it with this example: rung 1 copies the button into memory bit M0.0, rung 2 copies M0.0 to the lamp.</p>
[[sim:scan]]
<div class="callout tip"><b>Trick:</b> when a program "does something weird", read it like the PLC does: one rung at a time, top to bottom, with the values as they are <i>at that moment</i>.</div>`,
      sims: { scan: { program: 'RUNG Copy the button into a memory bit\nNO(I0.0) COIL(M0.0)\nRUNG Copy the memory bit to the lamp\nNO(M0.0) COIL(Q0.0)', inputs: { 'I0.0': pb('Button') }, outputs: { 'Q0.0': 'Lamp' }, step: true, note: 'Use "Step" to execute one phase at a time and watch the highlighted rung.' } },
      takeaways: ['Scan = read inputs, solve rungs in order, write outputs.', 'Later rungs see what earlier rungs wrote in the same scan.'],
      mistakes: ['Expecting outputs to change "in the middle" of a scan.', 'Ignoring rung order when two rungs depend on each other.'],
      challenges: [],
    },
    {
      id: 'addresses', level: 1, title: 'Inputs, outputs & addresses', min: 6,
      summary: 'I0.0 is input 0, bit 0. Q is outputs, M is memory. Give everything a name.',
      body: `
<h3>Addresses</h3>
<p>Every signal lives at an <b>address</b> in PLC memory. PLC Start uses Siemens-style addresses, like the video you watched:</p>
<div class="tbl"><table>
<tr><th>Address</th><th>Meaning</th><th>Example</th></tr>
<tr><td><code>I0.0 … I1.7</code></td><td>Digital <b>inputs</b> (byte.bit)</td><td>I0.1 = Start button</td></tr>
<tr><td><code>Q0.0 … Q1.7</code></td><td>Digital <b>outputs</b></td><td>Q0.0 = Solenoid valve 1</td></tr>
<tr><td><code>M0.0 … M9.7</code></td><td><b>Memory</b> bits (internal relays)</td><td>M0.1 = "system running"</td></tr>
<tr><td><code>T0 … T31</code></td><td><b>Timers</b>: T0 is the done bit; T0.ET is elapsed ms</td><td>T1 = 5 s delay done</td></tr>
<tr><td><code>C0 … C31</code></td><td><b>Counters</b>: C0 is the done bit; C0.CV is the count</td><td>C0.CV = boxes counted</td></tr>
<tr><td><code>MW0 …</code></td><td>Memory <b>words</b> (16-bit numbers)</td><td>MW0 = step number</td></tr>
<tr><td><code>SM0.0 / SM0.1 / SM0.5</code></td><td>System bits: always ON / first scan / 1 Hz clock</td><td>SM0.5 = flasher</td></tr>
</table></div>
<p><code>I0.3</code> means <b>byte 0, bit 3</b>. Eight bits make a byte, so after I0.7 comes I1.0.</p>
<h3>Same idea, other brands</h3>
<div class="tbl"><table>
<tr><th></th><th>Siemens</th><th>Allen-Bradley</th><th>IEC / CODESYS</th></tr>
<tr><td>Input</td><td>I0.0</td><td>Local:1:I.Data.0</td><td>%IX0.0</td></tr>
<tr><td>Output</td><td>Q0.0</td><td>Local:2:O.Data.0</td><td>%QX0.0</td></tr>
<tr><td>Memory bit</td><td>M0.0</td><td>B3:0/0 or a BOOL tag</td><td>%MX0.0 or a BOOL variable</td></tr>
<tr><td>On-delay timer</td><td>TON / S_ODT</td><td>TON (.DN .TT .EN)</td><td>TON (Q, ET)</td></tr>
</table></div>
<h3>Symbols (tags)</h3>
<p>Nobody remembers that I0.5 is "Sensor 4". Real projects give every address a <b>symbol</b>, like the I/O table at the bottom of your video. PLC Start shows the symbol above each contact and the address below it. Modern PLCs (CODESYS, TIA Portal, Studio 5000) let you program almost entirely with symbol names.</p>
<div class="callout tip"><b>Habit to build now:</b> make the I/O list before you draw a single rung. Address, symbol, description, and for inputs whether the device is wired NO or NC.</div>`,
      sims: {},
      takeaways: ['I = inputs, Q = outputs, M = memory, T = timers, C = counters, MW = words.', 'Always work from a named I/O list.'],
      mistakes: ['Writing to an input address. Inputs are written by the field device, not by the program.'],
      challenges: [],
    },
    {
      id: 'data-sizes', level: 1, title: 'Bits, bytes & words: how PLC memory is organised', min: 12,
      summary: 'What "bit memory", byte, word and double word mean, how big each one is, what you store in it, and how they sit on top of each other.',
      body: `
<h3>The bit: one yes / no</h3>
<p>The smallest thing a PLC stores is a <b>bit</b>: 0 or 1, off or on, false or true (data type <b>BOOL</b>). A push button, a sensor, a lamp, a motor contactor: each is one bit. <code>I0.3</code> is an input bit, <code>Q0.0</code> an output bit, <code>M0.1</code> a memory bit.</p>
<h3>"Bit memory": the M area</h3>
<p><b>Bit memory</b> is Siemens' English name for the <b>M</b> area (German: <i>Merker</i>, "marker"). It is a block of bits inside the PLC that are <b>not wired</b> to anything: the PLC's own <b>auxiliary relays</b>. Your program writes them and reads them to remember things: "the motor was started", "step 3 is active", "an alarm happened". Other brands call the same idea internal relays, internal bits (Rockwell B3 / BOOL tags) or %MX (CODESYS).</p>
<div class="tbl"><table>
<tr><th>Area</th><th>Letter</th><th>What lives there</th><th>Who writes it</th></tr>
<tr><td>Inputs</td><td>I</td><td>buttons, switches, sensors (and analog inputs AIW / IW)</td><td>the field, copied at the start of every scan</td></tr>
<tr><td>Outputs</td><td>Q</td><td>lamps, contactors, valves (and analog outputs AQW / QW)</td><td>your program, sent out at the end of every scan</td></tr>
<tr><td><b>Bit memory</b></td><td><b>M</b></td><td>flags, latches, steps, intermediate results; words MW for numbers</td><td>your program only</td></tr>
<tr><td>Timers / counters</td><td>T / C</td><td>timer and counter status bits and values</td><td>the timer and counter instructions</td></tr>
<tr><td>Data blocks</td><td>DB</td><td>bigger structured data (S7-300/1200/1500)</td><td>your program</td></tr>
</table></div>
<h3>Byte, word, double word</h3>
<div class="tbl"><table>
<tr><th>Size</th><th>Bits</th><th>Address example</th><th>Range</th><th>Typical use</th></tr>
<tr><td><b>Bit</b> (BOOL)</td><td>1</td><td>M10.3</td><td>0 / 1</td><td>button, lamp, flag</td></tr>
<tr><td><b>Byte</b> (BYTE)</td><td>8</td><td>MB10 = M10.0 … M10.7</td><td>0 … 255</td><td>8 inputs at once, a small code</td></tr>
<tr><td><b>Word</b> (WORD / INT)</td><td>16</td><td>MW10 = MB10 + MB11</td><td>0 … 65535 / −32768 … 32767</td><td>analog values, counters, step numbers, setpoints</td></tr>
<tr><td><b>Double word</b> (DWORD / DINT / REAL)</td><td>32</td><td>MD10 = MW10 + MW12</td><td>±2 147 483 647, or decimals (REAL)</td><td>big counts, flow totals, scaled values with decimals</td></tr>
</table></div>
<p>That is why addresses look like <code>I0.3</code>: <b>byte 0, bit 3</b>. A byte has 8 bits (0 … 7), so after I0.7 comes I1.0.</p>
<h3>Numbers are bits too</h3>
<p>Each bit of a byte or word has a <b>weight</b>: 1, 2, 4, 8, 16, 32, 64, 128 … The value is the sum of the weights of the bits that are 1. <code>0000 0101</code> = 4 + 1 = <b>5</b>. Programmers often write it in <b>hex</b> (groups of 4 bits): <code>16#05</code>. Switch the bits below and watch the byte and word values change.</p>
[[mem:explorer]]
<h3>The trap on real PLCs: addresses overlap</h3>
<p>On a Siemens PLC the areas sit on top of each other: <b>MW10 is MB10 and MB11</b>, which are <b>M10.0 … M11.7</b>. Writing M10.0 changes MW10! And <b>MW10 and MW11 share MB11</b>, so two words next to each other destroy each other. That is why real programs use <b>even</b> word numbers: MW10, MW12, MW14 (and MD10, MD14 for double words). In Siemens the <b>first</b> byte is the <b>high</b> byte of the word (shown above).</p>
<div class="callout tip"><b>In PLC Start</b> the bits (M10.0) and the words (MW10) are kept apart, so a beginner cannot break a counter by writing a bit, and the projects sometimes use MW20, MW21, MW22 next to each other. On a real S7 PLC you would number them MW20, MW22, MW24. CODESYS numbers %MW by words (%MW1 = bytes 2 and 3) and Rockwell uses named tags, so there the overlap looks different, but the idea is the same.</div>
<div class="callout where"><b>Where you meet this:</b> every I/O list (byte.bit addresses), every analog value (a word), every HMI tag (BOOL, INT, REAL), and every time you read a PLC manual's "memory map".</div>`,
      sims: {},
      takeaways: ['Bit = 0/1; byte = 8 bits; word = 16 bits; double word = 32 bits.', 'Bit memory (M, Merker) = the PLC\'s internal relays for your own flags and values.', 'I0.3 = byte 0, bit 3. After bit 7 comes the next byte.', 'Bits have weights 1, 2, 4, 8 …; a number is the sum.', 'On real Siemens PLCs MW10 = MB10 + MB11 = M10.0 … M11.7: use even word numbers.'],
      mistakes: ['Using MW10 and MW11 together on a real S7 (they overlap).', 'Writing a bit (M10.0) that is part of a word you also use.', 'Expecting a word to hold more than 32767 (INT).'],
      challenges: ['binary-switches', 'math', 'compare'],
    },
    {
      id: 'no-contact', level: 1, title: 'Normally-open contact & coil', min: 5,
      summary: '-| |- passes power when its bit is 1. -( )- copies the rung result to a bit.',
      body: `
<h3>What it is</h3>
<p>The <b>normally-open (NO) contact</b> <code>-| |-</code> asks one question: <i>"is this bit 1?"</i> If yes, it closes and power passes. If no, it stays open.</p>
<p>The <b>coil</b> <code>-( )-</code> writes the answer: if power reaches it, its bit becomes 1, otherwise 0. Every scan, again and again.</p>
[[sim:no]]
<h3>Why "normally open"?</h3>
<p>The name comes from relays: a NO contact is open in its normal (unpowered) state and closes when the relay coil is energised. In the PLC, "energised" means the bit is 1.</p>
<h3>Where it's used</h3>
<p>Everywhere. Start buttons, "door closed" sensors, permissive conditions, contacts of other outputs, timer done bits. It is the most-used instruction in any program.</p>
<div class="callout tip"><b>Read it out loud:</b> "IF PB1 THEN L1". A single contact and coil is just a copy: <code>L1 := PB1</code>.</div>`,
      sims: { no: { program: 'RUNG L1 follows PB1\nNO(I0.0) COIL(Q0.0)', inputs: { 'I0.0': pb('PB1') }, outputs: { 'Q0.0': 'L1' } } },
      takeaways: ['NO contact = "is the bit 1?"', 'Coil = "write the rung result to the bit".'],
      mistakes: ['Expecting the coil to stay on after the button is released. That needs a latch (level 2).'],
      challenges: ['first-light'],
    },
    {
      id: 'nc-contact', level: 1, title: 'Normally-closed contact (NOT)', min: 5,
      summary: '-|/|- passes power when its bit is 0. It is the NOT of logic.',
      body: `
<h3>What it is</h3>
<p>The <b>normally-closed (NC) contact</b> <code>-|/|-</code> asks the opposite question: <i>"is this bit 0?"</i> It passes power while the bit is 0 and opens when the bit becomes 1.</p>
[[sim:nc]]
<h3>Where it's used</h3>
<ul>
<li><b>"Not yet":</b> run the pump while the tank is NOT full.</li>
<li><b>Interlocks:</b> forward only if reverse is NOT on.</li>
<li><b>Breaking a latch:</b> a stop condition in series.</li>
<li><b>Ending a step:</b> step 2 active while step 3 is NOT active (like M0.3 in your video).</li>
</ul>
<div class="callout warn"><b>Important:</b> an NC contact in the program has nothing to do with whether the real switch is NO or NC. That is the #1 confusion in PLC programming. Lesson 7 shows why.</div>`,
      sims: { nc: { program: 'RUNG Ready lamp is on unless PB2 is pressed\nNC(I0.1) COIL(Q0.1)', inputs: { 'I0.1': pb('PB2') }, outputs: { 'Q0.1': 'Ready' } } },
      takeaways: ['NC contact = "is the bit 0?" = NOT.', 'An NC contact closes when its bit is 0.'],
      mistakes: ['Using NC contacts for stop buttons that are already wired NC (see lesson 7).'],
      challenges: ['ready-lamp'],
    },
    {
      id: 'and-or', level: 1, title: 'Series = AND, parallel = OR', min: 8,
      summary: 'Contacts in a row must all be closed. Branches give alternative paths.',
      body: `
<h3>Series = AND</h3>
<p>Contacts one after another form a chain. Power gets through only if <b>every</b> contact is closed: <code>Press := PB1 AND PB2</code>.</p>
[[sim:and]]
<h3>Parallel = OR</h3>
<p>A <b>branch</b> gives power a second path around a contact. If <b>any</b> path is closed, power gets through: <code>Light := SW1 OR SW2</code>.</p>
[[sim:or]]
<h3>Combining them</h3>
<p>Real rungs mix both. Draw the branch only around the part that is OR-ed:</p>
<p><code>Pump := Auto AND (Local OR Remote)</code></p>
[[sim:combo]]
<h3>Truth tables</h3>
<div class="tbl"><table>
<tr><th>A</th><th>B</th><th>A AND B (series)</th><th>A OR B (parallel)</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>0</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>1</td><td>0</td><td>0</td><td>1</td></tr>
<tr><td>1</td><td>1</td><td>1</td><td>1</td></tr>
</table></div>
<div class="callout where"><b>Where:</b> two-hand start on a press (AND; the real safety function also needs a safety relay), "start from the panel OR from the HMI" (OR), permissives like "guard closed AND air pressure OK AND no fault".</div>
<div class="callout tip"><b>Trick:</b> press <b>ST</b> in the simulator any time to see your rungs written as Boolean text. Reading <code>A AND (B OR C)</code> next to the picture trains your eye fast.</div>`,
      sims: {
        and: { program: 'RUNG Both hands\nNO(I0.0) NO(I0.1) COIL(Q0.0)', inputs: { 'I0.0': pb('Left hand'), 'I0.1': pb('Right hand') }, outputs: { 'Q0.0': 'Press' } },
        or: { program: 'RUNG Either switch\nNO(I0.4) | COIL(Q0.2)\nNO(I0.5)', inputs: { 'I0.4': sw('Door SW'), 'I0.5': sw('Stairs SW') }, outputs: { 'Q0.2': 'Hall light' } },
        combo: { program: 'RUNG Pump = Auto AND (Local OR Remote)\nNO(I0.4) | NO(I0.0) | COIL(Q0.0)\n. NO(I0.5)', inputs: { 'I0.4': sw('Auto'), 'I0.0': pb('Local'), 'I0.5': sw('Remote') }, outputs: { 'Q0.0': 'Pump' } },
      },
      takeaways: ['Series = AND, parallel branch = OR.', 'Branch only around the OR-ed part.'],
      mistakes: ['Closing a branch in the wrong place, which ORs more than intended.', 'Forgetting the branch must rejoin before the coil.'],
      challenges: ['two-hand', 'hall-light', 'permissive', 'xor-stairs', 'majority', 'bug-or'],
    },
    {
      id: 'field-vs-program', level: 1, title: 'Real NO/NC wiring vs program contacts', min: 9,
      summary: 'Stop buttons are wired NC for safety, so in the program you use a NO contact. Here is why.',
      body: `
<h3>Two different worlds</h3>
<p>There are <b>two</b> independent "NO / NC" choices:</p>
<ol>
<li><b>Field wiring:</b> is the physical switch wired with its NO or its NC contact? This decides whether the <b>input bit</b> is 1 or 0 at rest.</li>
<li><b>Program contact:</b> do you examine that bit for 1 (NO contact) or for 0 (NC contact)?</li>
</ol>
<div class="tbl"><table>
<tr><th>Device</th><th>Wired</th><th>At rest, input =</th><th>Pressed, input =</th><th>To act when <i>pressed</i>, use</th></tr>
<tr><td>Start button</td><td>NO</td><td>0</td><td>1</td><td><code>-| |-</code> NO contact</td></tr>
<tr><td>Stop button</td><td>NC</td><td>1</td><td>0</td><td><code>-|/|-</code> NC contact</td></tr>
<tr><td colspan="4">…but a stop button's job is to <b>allow running while NOT pressed</b>, so in the motor rung you need "pass power while input = 1":</td><td><code>-| |-</code> NO contact</td></tr>
</table></div>
<h3>Why wire stops NC? Fail-safe.</h3>
<p>If the wire to a NC stop button breaks or a terminal comes loose, the input drops to 0, exactly like pressing STOP, and the machine <b>stops</b>. With a NO stop button, a broken wire would go unnoticed until the day someone presses STOP and nothing happens.</p>
<p>The same goes for overload relays, guard switches, pressure switches and most safety-related signals: they are wired so that <b>a healthy signal = 1</b>.</p>
[[sim:stop]]
<div class="callout warn"><b>Classic bug:</b> the drawing shows the stop button as NC, so the programmer also uses an NC contact. Result: the stop input is 1 at rest, the NC contact is open, and the motor <b>never starts</b>. Try challenge "Bug hunt: motor won't start".</div>
<div class="callout tip"><b>Rule of thumb:</b> in the program, think about the <b>bit</b>, not the button. Ask yourself: "when things are OK, is this bit 1 or 0?" Then choose the contact that passes power in the OK state.</div>`,
      sims: { stop: { program: 'RUNG Motor runs while START held and STOP not pressed\nNO(I0.0) NO(I0.3) COIL(Q0.0)', inputs: { 'I0.0': pb('START'), 'I0.3': nc('STOP (wired NC)') }, outputs: { 'Q0.0': 'Motor' }, note: 'Look at I0.3: it reads 1 while nobody touches STOP. That is why the program uses a NO contact for it.' } },
      takeaways: ['Field NO/NC sets the bit value; program NO/NC tests the bit.', 'Stops, overloads and guards are wired NC (fail-safe), so use NO contacts for them in run rungs.'],
      mistakes: ['Copying the symbol from the wiring diagram into the program without thinking about the bit value.'],
      challenges: ['stop-nc', 'fix-stop'],
    },

    // ═══════════════════════ LEVEL 2 ═══════════════════════
    {
      id: 'seal-in', level: 2, title: 'Latching: the seal-in circuit', min: 8,
      summary: 'A contact of the output in parallel with START keeps it on after you let go.',
      body: `
<h3>The problem</h3>
<p>Push buttons are momentary: they only make contact while pressed. A motor must keep running after the operator lets go of START.</p>
<h3>The solution: seal-in (holding contact)</h3>
<p>Put a contact of the <b>output itself</b> in parallel with START. Once the coil is on, its own contact keeps the rung powered: it "seals itself in". STOP sits in series and breaks the circuit.</p>
<p><code>Motor := (Start OR Motor) AND Stop_ok AND OL_ok</code></p>
[[sim:latch]]
<p>This is exactly the first rung of your video: <i>Stop · (Start ∥ M0.1) → M0.1</i>. M0.1 becomes the "system running" memory, and the rest of the program uses it.</p>
<h3>Why it's the most important rung in industry</h3>
<ul>
<li><b>Stop-dominant:</b> if START and STOP are pressed together, STOP wins, because STOP is in series with everything.</li>
<li><b>No auto-restart after power loss:</b> when power returns, the coil is off, the seal is open, and the machine waits for a new START. Safety standards require this.</li>
<li><b>Easy to troubleshoot:</b> the whole condition is visible on one rung.</li>
</ul>
<div class="callout where"><b>Where:</b> every motor starter, pump, fan, conveyor, "cycle running" bit, alarm latch.</div>`,
      sims: { latch: { program: 'RUNG Start/stop latch with seal-in\nNO(I0.0) | NO(I0.3) COIL(Q0.0)\nNO(Q0.0)', inputs: { 'I0.0': pb('START'), 'I0.3': nc('STOP') }, outputs: { 'Q0.0': 'Motor' }, note: 'Tap START and release it: the Q0.0 contact on the branch keeps the rung alive.' } },
      takeaways: ['Seal-in = output contact in parallel with START.', 'STOP in series → stop-dominant.', 'No restart after a power cut.'],
      mistakes: ['Putting STOP inside the branch, where it only breaks one path.', 'Sealing in with the START button instead of the output.'],
      challenges: ['start-stop', 'fix-stop', 'two-station', 'jog-run', 'bug-latch'],
    },
    {
      id: 'set-reset', level: 2, title: 'Set / reset coils', min: 7,
      summary: '(S) turns a bit on and leaves it. (R) turns it off. The later rung wins.',
      body: `
<h3>What it is</h3>
<p>A normal coil writes 1 <i>or</i> 0 every scan. A <b>SET</b> coil <code>-(S)-</code> only writes 1 (when powered) and otherwise leaves the bit alone. A <b>RESET</b> coil <code>-(R)-</code> only writes 0. Together they form a latch over two rungs.</p>
[[sim:sr]]
<h3>Who wins?</h3>
<p>If both SET and RESET conditions are true in the same scan, the rung that runs <b>last</b> decides. Put RESET below SET for <b>reset-dominant</b> (the safe choice for machines), or SET below RESET for set-dominant.</p>
<h3>Seal-in or set/reset?</h3>
<div class="tbl"><table>
<tr><th></th><th>Seal-in coil</th><th>Set / Reset</th></tr>
<tr><td>Visibility</td><td>All conditions on one rung</td><td>Spread over many rungs</td></tr>
<tr><td>Power cut</td><td>Rockwell: off after restart. Other brands: depends on the memory area</td><td>Rockwell: stays on. Other brands: stays on only if the bit is retentive</td></tr>
<tr><td>Best for</td><td>Motors, anything with a STOP</td><td>Step bits, alarms, modes, "remember that…"</td></tr>
</table></div>
<div class="callout warn"><b>Careful:</b> a bit SET in five places and RESET in seven places is a troubleshooting nightmare. Keep sets and resets for one bit close together.</div>`,
      sims: { sr: { program: 'RUNG Set\nNO(I0.0) SET(Q0.0)\nRUNG Reset (lower rung = wins)\nNO(I0.1) RST(Q0.0)', inputs: { 'I0.0': pb('ON'), 'I0.1': pb('OFF') }, outputs: { 'Q0.0': 'Lamp' }, note: 'Hold both buttons: the lamp is off, because the reset rung runs later in the scan.' } },
      takeaways: ['SET writes only 1, RESET writes only 0.', 'Same scan, both true → the lower rung wins.'],
      mistakes: ['Using a normal coil and a SET coil on the same bit.', 'Forgetting that set bits may survive a power cycle.'],
      challenges: ['set-reset'],
    },
    {
      id: 'memory-bits', level: 2, title: 'Internal memory bits (M)', min: 6,
      summary: 'Relays that exist only inside the PLC, free to use, and the way to structure logic.',
      body: `
<h3>What it is</h3>
<p><b>M bits</b> (internal relays, markers, flags, BOOL variables) are bits with no terminal attached. Use them as coils and as contacts anywhere.</p>
<h3>Why use them</h3>
<ul>
<li><b>Name a state:</b> M0.1 "system running" is easier to reason about than repeating the full start/stop logic everywhere (your video does exactly this).</li>
<li><b>Reuse a result:</b> calculate "all guards closed AND air OK AND no fault" once, use it in twenty rungs.</li>
<li><b>Separate decisions from outputs:</b> decide in M bits, then drive outputs from those decisions. Easier to change later.</li>
<li><b>Steps and modes:</b> step bits, auto/manual mode, alarm flags.</li>
</ul>
[[sim:mem]]
<div class="callout tip"><b>Pattern used by pros:</b> Inputs → <i>conditions</i> (M bits) → <i>sequence/steps</i> (M bits) → <i>outputs</i> (Q). Each layer only looks at the layer before it.</div>`,
      sims: { mem: { program: 'RUNG System ready = both guards closed AND air pressure OK\nNO(I0.4) NO(I0.5) NO(I0.6) COIL(M0.0)\nRUNG Ready lamp\nNO(M0.0) COIL(Q0.0)\nRUNG Motor can only start when ready\nNO(I0.0) NO(M0.0) COIL(Q0.1)', inputs: { 'I0.4': sw('Guard 1'), 'I0.5': sw('Guard 2'), 'I0.6': sw('Air OK'), 'I0.0': pb('Jog') }, outputs: { 'Q0.0': 'Ready', 'Q0.1': 'Motor' } } },
      takeaways: ['M bits are free internal relays.', 'Compute a condition once, use it many times.'],
      mistakes: ['Driving the same M bit from two coils (double coil).'],
      challenges: [],
    },
    {
      id: 'interlock', level: 2, title: 'Interlocking', min: 8,
      summary: 'Prevent two things that must never happen together, like forward and reverse.',
      body: `
<h3>What it is</h3>
<p>An <b>interlock</b> blocks one action while another conflicting one is active. The classic: a reversing motor has two contactors, K1 forward and K2 reverse. If both close, two phases are shorted. Bang.</p>
<p>Put an <b>NC contact of K2 in the K1 rung</b>, and an <b>NC contact of K1 in the K2 rung</b>.</p>
[[sim:il]]
<h3>Layers of protection</h3>
<ol>
<li><b>Software interlock</b> (this lesson): NC contacts in the program.</li>
<li><b>Hardware interlock:</b> auxiliary NC contacts of K1/K2 wired in series with the other coil, so the PLC can't close both even if its program is wrong.</li>
<li><b>Mechanical interlock:</b> a lever between the two contactors.</li>
</ol>
<p>Real machines use all three. Never rely on software alone for anything that can destroy equipment or hurt people.</p>
<div class="callout where"><b>Where:</b> forward/reverse, star/delta, up/down hoists, open/close valves, two cylinders that would collide, a door that must be closed before a press runs.</div>`,
      sims: { il: { program: 'RUNG Forward (blocked while reverse runs)\nNO(I0.0) | NO(I0.3) NC(Q0.1) COIL(Q0.0)\nNO(Q0.0)\nRUNG Reverse (blocked while forward runs)\nNO(I0.1) | NO(I0.3) NC(Q0.0) COIL(Q0.1)\nNO(Q0.1)', inputs: { 'I0.0': pb('FWD'), 'I0.1': pb('REV'), 'I0.3': nc('STOP') }, outputs: { 'Q0.0': 'K1 fwd', 'Q0.1': 'K2 rev' }, note: 'Start forward, then press REV: nothing happens until you press STOP.' } },
      takeaways: ['Interlock = NC contact of the conflicting output.', 'Software + hardware + mechanical for anything dangerous.'],
      mistakes: ['Interlocking only one direction.', 'Relying only on the program for safety.'],
      challenges: ['interlock'],
    },
    {
      id: 'edges', level: 2, title: 'Edges & one-shots (triggers)', min: 14,
      summary: 'Do something once at the moment a signal changes, not for as long as it stays on. Rising and falling edges, how they work inside, edges on outputs and timers, and the classic traps.',
      body: `
<h3>Level or edge?</h3>
<p>A normal contact is <b>level</b>-sensitive: true for every scan the bit is 1. An <b>edge</b> contact (a <b>trigger</b>, a <b>one-shot</b>) is true for exactly <b>one scan</b>:</p>
<ul>
<li><code>-|P|-</code> <b>rising edge</b>: the scan where the bit goes 0 → 1 (the moment you press).</li>
<li><code>-|N|-</code> <b>falling edge</b>: the scan where the bit goes 1 → 0 (the moment you let go).</li>
</ul>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 560 250" width="560" style="max-width:100%;height:auto" role="img" aria-label="Timing diagram of NO, P and N contacts"><g font-family="IBM Plex Mono, monospace" font-size="11" fill="currentColor"><line x1="120.0" y1="14" x2="120.0" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="146.2" y1="14" x2="146.2" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="172.5" y1="14" x2="172.5" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="198.8" y1="14" x2="198.8" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="225.0" y1="14" x2="225.0" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="251.2" y1="14" x2="251.2" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="277.5" y1="14" x2="277.5" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="303.8" y1="14" x2="303.8" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="330.0" y1="14" x2="330.0" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="356.2" y1="14" x2="356.2" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="382.5" y1="14" x2="382.5" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="408.8" y1="14" x2="408.8" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="435.0" y1="14" x2="435.0" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="461.2" y1="14" x2="461.2" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="487.5" y1="14" x2="487.5" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="513.8" y1="14" x2="513.8" y2="216" stroke="currentColor" stroke-opacity=".15"/><line x1="540.0" y1="14" x2="540.0" y2="216" stroke="currentColor" stroke-opacity=".15"/><text x="120" y="236" font-size="10" fill-opacity=".7">each column = one scan (10 ms)</text><text x="8" y="48" font-weight="700">Button I0.0</text><path d="M120.0 56.0 L146.2 56.0 L146.2 56.0 L172.5 56.0 L172.5 56.0 L198.8 56.0 L198.8 56.0 L198.8 30.0 L225.0 30.0 L225.0 30.0 L251.2 30.0 L251.2 30.0 L277.5 30.0 L277.5 30.0 L303.8 30.0 L303.8 30.0 L330.0 30.0 L330.0 30.0 L356.2 30.0 L356.2 30.0 L382.5 30.0 L382.5 30.0 L408.8 30.0 L408.8 30.0 L408.8 56.0 L435.0 56.0 L435.0 56.0 L461.2 56.0 L461.2 56.0 L487.5 56.0 L487.5 56.0 L513.8 56.0 L513.8 56.0 L540.0 56.0" fill="none" stroke="#1a9b4b" stroke-width="2.5"/><text x="8" y="98" font-weight="700">NO(I0.0)</text><path d="M120.0 106.0 L146.2 106.0 L146.2 106.0 L172.5 106.0 L172.5 106.0 L198.8 106.0 L198.8 106.0 L198.8 80.0 L225.0 80.0 L225.0 80.0 L251.2 80.0 L251.2 80.0 L277.5 80.0 L277.5 80.0 L303.8 80.0 L303.8 80.0 L330.0 80.0 L330.0 80.0 L356.2 80.0 L356.2 80.0 L382.5 80.0 L382.5 80.0 L408.8 80.0 L408.8 80.0 L408.8 106.0 L435.0 106.0 L435.0 106.0 L461.2 106.0 L461.2 106.0 L487.5 106.0 L487.5 106.0 L513.8 106.0 L513.8 106.0 L540.0 106.0" fill="none" stroke="#1a9b4b" stroke-width="2.5"/><text x="8" y="148" font-weight="700">P(I0.0)</text><path d="M120.0 156.0 L146.2 156.0 L146.2 156.0 L172.5 156.0 L172.5 156.0 L198.8 156.0 L198.8 156.0 L198.8 130.0 L225.0 130.0 L225.0 130.0 L225.0 156.0 L251.2 156.0 L251.2 156.0 L277.5 156.0 L277.5 156.0 L303.8 156.0 L303.8 156.0 L330.0 156.0 L330.0 156.0 L356.2 156.0 L356.2 156.0 L382.5 156.0 L382.5 156.0 L408.8 156.0 L408.8 156.0 L435.0 156.0 L435.0 156.0 L461.2 156.0 L461.2 156.0 L487.5 156.0 L487.5 156.0 L513.8 156.0 L513.8 156.0 L540.0 156.0" fill="none" stroke="#e9a100" stroke-width="2.5"/><text x="8" y="198" font-weight="700">N(I0.0)</text><path d="M120.0 206.0 L146.2 206.0 L146.2 206.0 L172.5 206.0 L172.5 206.0 L198.8 206.0 L198.8 206.0 L225.0 206.0 L225.0 206.0 L251.2 206.0 L251.2 206.0 L277.5 206.0 L277.5 206.0 L303.8 206.0 L303.8 206.0 L330.0 206.0 L330.0 206.0 L356.2 206.0 L356.2 206.0 L382.5 206.0 L382.5 206.0 L408.8 206.0 L408.8 206.0 L408.8 180.0 L435.0 180.0 L435.0 180.0 L435.0 206.0 L461.2 206.0 L461.2 206.0 L487.5 206.0 L487.5 206.0 L513.8 206.0 L513.8 206.0 L540.0 206.0" fill="none" stroke="#2c6cc4" stroke-width="2.5"/><text x="229.0" y="142" font-size="10">one scan at 0 → 1</text><text x="439.0" y="192" font-size="10">one scan at 1 → 0</text></g></svg></div>
<h3>Why it matters</h3>
<p>A button press lasts about 200 ms: 20 scans. Anything that <i>adds</i>, <i>toggles</i>, <i>shifts</i> or <i>moves to the next step</i> would happen 20 times. Edges make it happen once.</p>
[[sim:edge]]
<h3>When to use the falling edge</h3>
<ul>
<li><b>Start on release</b>: a taped-down or jammed START button can never start the machine.</li>
<li><b>A part has left the sensor</b>: count a box when it has completely passed, or release the next one only when the previous one is gone.</li>
<li><b>Something stopped</b>: N on the motor output counts stops, whatever caused them.</li>
</ul>
<h3>How a P contact works inside</h3>
<p>The PLC keeps the value of the signal from the <b>previous scan</b> in a memory bit. Rising edge = "1 now AND 0 last scan". You can build it yourself with two rungs, and you must be able to read it: older programs are full of it.</p>
[[sim:own]]
<p>The order matters: the edge rung must come <b>before</b> the rung that stores the signal, otherwise it compares the signal with itself and never fires. For a falling edge: NC(signal) NO(last scan).</p>
<h3>Edges work on any bit</h3>
<p>Not only on buttons: on an output (P on the motor = "the motor has just started"), on a timer's done bit ("the time has just run out"), on a counter's done bit ("the box has just become full"), on a step bit ("we just entered step 3"). The edge of a timer or counter done bit is a very common way to do something <b>once</b> when it finishes.</p>
<h3>The toggle trick (one button ON/OFF)</h3>
<p>Rung 1 makes a one-scan pulse. Rung 2 flips the lamp on that pulse: <code>Lamp := Pulse XOR Lamp</code>.</p>
[[sim:toggle]]
<h3>The same thing in every brand</h3>
<div class="tbl"><table>
<tr><th>PLC Start</th><th>TIA Portal</th><th>Studio 5000</th><th>CODESYS</th></tr>
<tr><td>P(I0.0)</td><td>-|P|- with its own edge memory bit (written below the contact), or R_TRIG</td><td>XIC(I0.0)ONS(storage bit), or OSR</td><td>-|P|- or an R_TRIG instance</td></tr>
<tr><td>N(I0.0)</td><td>-|N|- with its own edge memory bit, or F_TRIG</td><td>XIO(I0.0)ONS(storage bit), or OSF</td><td>-|N|- or an F_TRIG instance</td></tr>
</table></div>
<h3>Traps</h3>
<ul>
<li><b>No edge</b>: ADD, MOV, SHRB or a toggle on a level contact runs every scan while the button is held.</li>
<li><b>Shared edge memory</b>: in TIA Portal and Studio 5000 each edge has its own memory (storage) bit. Using the same one for two edges makes one of them never fire. PLC Start gives each edge its own automatically.</li>
<li><b>A one-scan pulse on a lamp</b>: on for 10 ms, nobody sees it. Use the pulse to SET, toggle, count or start a timer.</li>
<li><b>Bouncing contacts and noisy signals</b>: several edges for one press. Filter first, then take the edge (see "Triggers in practice").</li>
</ul>
<div class="callout where"><b>Where:</b> counting parts, adding to totals, toggling modes with one button, acknowledging alarms, advancing a sequence step exactly once, logging events, starting on release.</div>`,
      sims: {
        edge: { program: 'RUNG Add 1 per scan while held (level)\nNO(I0.0) ADD(MW0,1,MW0)\nRUNG Add 1 per press (edge)\nP(I0.0) ADD(MW2,1,MW2)\nRUNG Add 1 per release (falling edge)\nN(I0.0) ADD(MW4,1,MW4)', inputs: { 'I0.0': pb('Button') }, outputs: {}, note: 'Press once and hold. MW0 races up (+1 every scan), MW2 adds exactly 1 when you press, MW4 adds 1 when you let go.' },
        own: { program: 'RUNG Rising edge by hand: 1 now AND 0 in the last scan\nNO(I0.0) NC(M1.0) COIL(M0.0)\nRUNG Remember the button for the next scan (AFTER the edge rung)\nNO(I0.0) COIL(M1.0)\nRUNG Count the pulses\nNO(M0.0) ADD(MW0,1,MW0)', inputs: { 'I0.0': pb('Button') }, outputs: {}, step: true, note: 'Use Step to go through one scan at a time while you hold the button: M0.0 is 1 only in the first scan, because from then on M1.0 remembers that the button was already pressed.' },
        toggle: { program: 'RUNG One-scan pulse on each press\nP(I0.0) COIL(M0.0)\nRUNG Flip the lamp on each pulse\nNO(M0.0) NC(Q0.0) | COIL(Q0.0)\nNC(M0.0) NO(Q0.0)', inputs: { 'I0.0': pb('ON/OFF') }, outputs: { 'Q0.0': 'Lamp' } },
      },
      takeaways: ['P = one scan on 0→1, N = one scan on 1→0.', 'Use edges for counting, adding, toggling, shifting and stepping.', 'Inside, an edge compares the signal with its value in the last scan.', 'Edges work on any bit: outputs, timers, counters, steps.', 'Each edge needs its own memory.'],
      mistakes: ['ADD or MOV with a level contact: runs every scan.', 'Using the same edge memory in two places.', 'Hand-made edge with the "remember" rung above the edge rung.', 'Putting a one-scan pulse on a lamp.'],
      challenges: ['toggle', 'trig-release', 'trig-own', 'bug-trig-flicker', 'trig-count', 'trig-motor', 'bug-trig-batch'],
    },
    {
      id: 'scan-traps', level: 2, title: 'Scan traps: rung order & double coils', min: 7,
      summary: 'Why one output must have one coil, and why rung order changes behaviour.',
      body: `
<h3>Double coil syndrome</h3>
<p>Two normal coils with the same address in two rungs: rung 1 sets Q0.0 = 1, rung 2 sets it straight back to 0, and only the <b>last</b> rung's answer reaches the terminal. Pressing PB1 seems to do nothing.</p>
[[sim:dbl]]
<p>The fix: <b>one coil per output</b>. Combine every condition into a single rung with branches, or compute parts in M bits and OR them.</p>
<p>PLC Start's checker flags this as <b>"Double coil"</b>. Many real tools do not warn (TIA Portal and Studio 5000 normally allow it silently): use the cross-reference list.</p>
<h3>Rung order</h3>
<p>Because rungs are solved top to bottom, a bit written in rung 5 is seen by rung 6 in the <i>same</i> scan, but by rung 4 only in the <i>next</i> scan. Usually harmless, but it matters for:</p>
<ul>
<li>Set/reset priority (lower wins).</li>
<li>One-scan pulses: a pulse made <i>below</i> the rung that uses it is never seen.</li>
<li>Sequences that should advance only one step per scan.</li>
</ul>
<div class="callout tip"><b>Trick:</b> use <b>Step</b> in the simulator to go rung by rung, and watch the bit change mid-scan.</div>`,
      sims: { dbl: { program: 'RUNG Lamp from PB1\nNO(I0.0) COIL(Q0.0)\nRUNG Lamp from PB2 (overwrites rung 1!)\nNO(I0.1) COIL(Q0.0)', inputs: { 'I0.0': pb('PB1'), 'I0.1': pb('PB2') }, outputs: { 'Q0.0': 'Lamp' }, note: 'PB2 works, PB1 does nothing: rung 2 overwrites it in every scan.' } },
      takeaways: ['One output, one coil.', 'Later rungs win; earlier rungs see changes only next scan.'],
      mistakes: ['Adding "just one more rung" for the same output when fixing a bug.'],
      challenges: ['fix-double-coil'],
    },

    // ═══════════════════════ LEVEL 3 ═══════════════════════
    {
      id: 'electrical-basics', level: 2, title: "Electrical basics for PLC people", min: 18,
      summary: "Ohm's law, 24 V DC and 400 V AC, fuses, the multimeter, star and delta, nameplates, the overload relay and earthing.",
      body: `<p>A PLC programmer does not need to be an electrician. But on a real machine, many "program problems" are electrical: a blown fuse, a broken wire, a burnt coil. If you understand voltage, current and the multimeter, you find these faults in minutes, and you talk with the electricians in their language. Interviewers ask about this a lot.</p>

<h3>Voltage, current and resistance</h3>
<ul>
<li><b>Voltage</b> (U, in volts, V) is the push. Like water pressure in a pipe.</li>
<li><b>Current</b> (I, in amperes, A) is how much flows. Like litres per second.</li>
<li><b>Resistance</b> (R, in ohms, Ω) is how hard it is to flow. Like a narrow pipe.</li>
</ul>
<p>They are linked by <b>Ohm's law</b>: <code>U = I × R</code>. If you know two values, you can calculate the third.</p>
<div class="tbl"><table><thead><tr><th>You want</th><th>Formula</th><th>Example</th></tr></thead><tbody>
<tr><td>Current</td><td><code>I = U / R</code></td><td>24 V / 600 Ω = 0.04 A = 40 mA</td></tr>
<tr><td>Resistance</td><td><code>R = U / I</code></td><td>24 V / 0.1 A = 240 Ω</td></tr>
<tr><td>Voltage</td><td><code>U = I × R</code></td><td>2 A × 1.5 Ω = 3 V</td></tr>
<tr><td>Power</td><td><code>P = U × I</code></td><td>24 V × 0.04 A ≈ 1 W</td></tr>
</tbody></table></div>
<div class="callout tip"><b>Worked example.</b> A relay coil has 600 Ω. The PLC output gives 24 V. Current: I = 24 V / 600 Ω = 0.04 A = <b>40 mA</b>. A normal PLC output can give 0.5 A, so this is fine. Now a long cable: 100 m there and 100 m back, 1.5 Ω in total, and a valve that takes 2 A. The cable loses U = 2 A × 1.5 Ω = <b>3 V</b>. The valve gets only 21 V. That is why long cables need a bigger cross-section.</div>

<h3>24 V DC and 230 / 400 V AC</h3>
<div class="tbl"><table><thead><tr><th></th><th>24 V DC</th><th>230 / 400 V AC</th></tr></thead><tbody>
<tr><td>What it is</td><td>Direct current: always flows the same way, from + to −.</td><td>Alternating current: makes 50 full cycles per second (50 Hz; 60 Hz in America), so the direction changes 100 times per second.</td></tr>
<tr><td>Wires</td><td>L+ (+24 V) and M (0 V)</td><td>230 V between a phase L and N. 400 V between two phases L1, L2, L3.</td></tr>
<tr><td>Used for</td><td>PLC inputs and outputs, sensors, relays, valves, HMI</td><td>Motors, heaters, pumps, and the input of the 24 V power supply</td></tr>
<tr><td>Danger</td><td>Safe to touch</td><td>Deadly. Only trained electricians work on it.</td></tr>
</tbody></table></div>
<p><b>Why 24 V for control?</b> It is safe to touch (no electric shock), so people can work near it. It is still strong enough to switch relays and valves reliably over long wires, and to be noisy-proof. And every brand uses it: Siemens, Schneider, Beckhoff, Omron, Rockwell. One power supply feeds everything.</p>

<h3>Fuses and circuit breakers</h3>
<p>A <b>fuse</b> or a <b>miniature circuit breaker (MCB)</b> protects the <b>wires</b>. If too much current flows (a short circuit or overload), it opens the circuit before the wire gets hot and starts a fire. A fuse melts and must be changed. An MCB trips and you switch it on again.</p>
<ul>
<li>Choose it for the wire: a thin wire needs a small fuse.</li>
<li>A blown fuse looks the same as a good one. Measure it!</li>
<li>Before you change a blown fuse, find out <b>why</b> it blew. Otherwise the new one blows too.</li>
<li>A fuse does <b>not</b> protect people. People are protected by an <b>RCD</b> (30 mA) and by earthing. A motor is protected by its <b>overload relay</b>.</li>
</ul>

<h3>Measure like an electrician</h3>
<p>The multimeter has a dial: <b>V DC</b> (24 V circuits), <b>V AC</b> (mains), <b>Ω</b> (resistance) and the <b>continuity beep</b>. The red probe goes in the V Ω jack, the black probe in COM.</p>
<div class="callout where"><b>The rule:</b> volts with the power <b>ON</b>. Ohms and the beep with the power <b>OFF</b>. The Ω mode sends its own small current; the circuit voltage spoils the reading and can damage the meter. Before you touch: switch off, lock, and <b>prove it is dead</b> with the meter.</div>
<p>The key idea: in a working 24 V circuit,</p>
<div class="tbl"><table><thead><tr><th>You measure across…</th><th>You read</th><th>Why</th></tr></thead><tbody>
<tr><td>a <b>closed</b> contact or a good wire</td><td>0 V</td><td>Both sides have the same 24 V. No difference.</td></tr>
<tr><td>an <b>open</b> contact, a blown fuse or a broken wire</td><td>24 V</td><td>One side has 24 V; the load pulls the other side to 0 V.</td></tr>
<tr><td>a load (coil, lamp) that gets power</td><td>24 V</td><td>The load uses the whole voltage.</td></tr>
</tbody></table></div>
<p>The fast method is <b>walking the line</b>: keep the black probe on 0 V (M) and move the red probe along the circuit, point by point. Where the 24 V stops, the fault is between that point and the one before.</p>
<p>Try it here. Learn the good readings on the working circuit, then find the four hidden faults. Two of them have the same symptom: only measuring tells them apart.</p>
[[hw:meter]]

<h3>Three-phase motors: star or delta?</h3>
<p>A 3-phase motor has 3 windings. Their ends are on 6 terminals: U1–U2, V1–V2, W1–W2. With small metal bridges you connect them in one of two ways:</p>
<ul>
<li><b>Star (Y)</b>: one bridge joins U2, V2 and W2. Each winding gets 400 V / √3 = <b>230 V</b>.</li>
<li><b>Delta (Δ)</b>: three bridges, each winding between two phases. Each winding gets the full <b>400 V</b>.</li>
</ul>
<div class="callout tip"><b>The rule:</b> the <b>smaller</b> voltage on the nameplate is the voltage of ONE winding. If your mains is the bigger voltage, connect in star. If your mains is the smaller voltage, connect in delta. On 400 V mains: a "230/400 V Δ/Y" motor runs in <b>star</b>; a "400/690 V Δ/Y" motor runs in <b>delta</b> (and only such a motor can use a star-delta starter, see <a href="#lesson-motor-starters">Motor starters</a>).</div>
<p>Connect it wrong and it costs money: a 230/400 V motor in delta on 400 V gets 1.73 × its voltage, takes about 3 × the current and burns. A 400/690 V motor in star on 400 V has only 1/3 of its torque: under load it cannot reach speed and overheats.</p>

<h3>Reading a nameplate</h3>
<div class="tbl"><table><thead><tr><th>On the plate</th><th>Meaning</th></tr></thead><tbody>
<tr><td>230/400 V Δ/Y</td><td>Delta for 230 V mains, star for 400 V mains</td></tr>
<tr><td>13.6/7.9 A</td><td>Rated current: 13.6 A in delta (230 V), 7.9 A in star (400 V)</td></tr>
<tr><td>4.0 kW</td><td>Mechanical power at the shaft (not taken from the mains)</td></tr>
<tr><td>cos φ 0.83</td><td>Power factor: part of the current only builds the magnetic field</td></tr>
<tr><td>1440 min⁻¹</td><td>Speed at full load. 4 poles at 50 Hz = 1500 rpm; the difference is the slip</td></tr>
<tr><td>IP55 · Ins.Cl. F · S1</td><td>Dust and water jets protected · windings up to 155 °C · continuous duty</td></tr>
</tbody></table></div>
<p>Check the numbers: √3 × 400 V × 7.9 A × 0.83 ≈ 4.5 kW electrical. With 88.6 % efficiency that is 4.0 kW at the shaft. It fits.</p>

<h3>Setting the overload relay</h3>
<p>The <b>overload relay</b> (or the motor protection breaker) protects the motor against too much current for too long: a blocked pump, a missing phase, a too heavy load. It is a thermal model of the motor.</p>
<ul>
<li>Set it to the <b>rated current on the nameplate</b> for the connection you use. On 400 V in star above: <b>7.9 A</b>.</li>
<li>Too high: the motor is not protected. Too low: it trips for no reason on a hot day.</li>
<li>In a star-delta starter the relay often sits in the motor lines; then it is set to 0.58 × the rated current. Read the drawing.</li>
<li>Its NC contact <b>95–96</b> goes to a PLC input (or into the contactor circuit). Wire it NC: a broken wire then looks like a trip, which is safe.</li>
<li>After a trip: let the motor cool, find the cause, then reset. Never turn the setting up to "fix" trips.</li>
</ul>

<h3>Earthing (PE)</h3>
<p>The green-yellow wire is <b>PE</b>, the protective earth. All metal parts (cabinet, motor housing, machine frame) are connected to it. If a live wire touches the housing, a big current flows to earth at once, and the fuse or RCD switches off. Without PE the housing would stay live and the next person who touches it gets a shock.</p>
<ul>
<li>PE is never switched and never fused, and it is never a working wire: do not use it as 0 V.</li>
<li>In many cabinets the 0 V (M) of the 24 V supply is connected to PE. Then a 24 V wire touching the cabinet blows the fuse at once, instead of staying hidden until a second fault starts the machine by itself.</li>
</ul>
<div class="callout where"><b>Where:</b> the PLC only sees 1 or 0. An electrical fault shows up as an input that never comes or an output that does nothing. Your online view (TIA Portal watch table, Machine Expert or CODESYS online values, TwinCAT online, Omron I/O map, Studio 5000 tag monitor) shows what the PLC sees. The meter shows what is really on the wire. Use both.</div>`,
      sims: {},
      takeaways: ["Ohm's law: U = I × R. A 600 Ω coil on 24 V takes 40 mA.", "Control circuits use 24 V DC: safe to touch, strong enough, the same for every brand.", "Volts with the power ON; ohms and the beep with the power OFF.", "Across a closed contact or a good wire you read 0 V; across an open one you read 24 V.", "A fuse protects the wire, an RCD protects people, the overload relay protects the motor.", "The smaller nameplate voltage is the winding voltage: mains = bigger voltage → star, mains = smaller voltage → delta.", "Set the overload relay to the nameplate current of the connection you use.", "PE connects all metal parts to earth so a fault switches off at once."],
      mistakes: ["Measuring ohms with the power on: the reading is nonsense and the meter can be damaged.", "Reading 0 V across a contact and calling it closed, when there is no voltage on either side.", "Measuring a 24 V DC circuit with the dial on V AC and seeing almost 0 V.", "Changing a blown fuse without looking for the short circuit that blew it.", "Connecting a 230/400 V motor in delta on 400 V mains: it burns.", "Turning the overload relay up to stop trips instead of finding the cause.", "Using the PE wire as a 0 V return."],
      challenges: ["el-ol-trip", "diag-el-ol", "stop-nc", "star-delta"],
    },
    {
      id: 'control-circuits', level: 2, title: "Hard-wired control circuits: read them, then build them", min: 10,
      summary: "Power circuit and control circuit, how to read current paths from L to N, the parts and their terminal numbers, the five patterns behind every circuit, and how a circuit turns into ladder. With the Circuits section to build and test them.",
      body: `
<h3>Two circuits in every starter</h3>
<p>Open any motor starter and you find two circuits:</p>
<div class="tbl"><table>
<tr><th></th><th>Power circuit</th><th>Control circuit</th></tr>
<tr><td>Carries</td><td>The motor current (thick wires, 400 V)</td><td>Only the current of coils and lamps (thin wires, 24 V or 230 V)</td></tr>
<tr><td>Parts</td><td>Main breaker, contactor main contacts, overload relay, motor</td><td>Push buttons, contactor coils, auxiliary contacts, timers, lamps</td></tr>
<tr><td>Its job</td><td>Give the motor power</td><td>Decide <b>when</b> each contactor closes</td></tr>
</table></div>
<p>The control circuit is the brain. Before PLCs it was the whole brain. Today a PLC often does the deciding, but every safety function and every simple starter is still wired like this, and you must be able to read it.</p>
<div class="callout tip"><b>Build them yourself:</b> the <a href="#circuits">Circuits</a> gives you the parts, a live circuit with green wires where there is voltage, the motor behind it and tests. Start with <a href="#circuit-c-lamp">a switch and a lamp</a>.</div>

<h3>How to read a control circuit</h3>
<ol>
<li><b>Top to bottom.</b> The supply line <b>L</b> is on top, <b>N</b> at the bottom. Each vertical line is one <b>current path</b>.</li>
<li><b>The load is last.</b> Each path ends in one load just above N: a coil, a lamp, a timer. Everything above it is contacts.</li>
<li><b>Contacts are drawn at rest:</b> no voltage, nothing pressed. A NO contact is drawn open, an NC contact closed.</li>
<li><b>One device, several places.</b> The coil of K1 is in one path, its contacts in others. The same tag (K1) tells you they belong together.</li>
<li><b>No load, no path.</b> A path from L to N with only contacts is a short circuit.</li>
</ol>

<h3>The parts and their tags</h3>
<div class="tbl"><table>
<tr><th>Tag</th><th>Part</th><th>Terminals</th><th>Remember</th></tr>
<tr><td><b>S</b></td><td>Push button, selector switch, E-stop</td><td>NO 13-14, NC 11-12</td><td>STOP and E-stop are NC: a broken wire stops the machine</td></tr>
<tr><td><b>K</b> (KM, KA)</td><td>Contactor or relay</td><td>Coil A1-A2, NO 13-14, NC 21-22</td><td>One coil moves all its contacts</td></tr>
<tr><td><b>F</b></td><td>Overload relay (breakers and fuses have other numbers, or no contact)</td><td>NC 95-96, NO 97-98</td><td>95-96 goes in the coil path, 97-98 to the TRIP lamp</td></tr>
<tr><td><b>KT</b></td><td>Timer relay</td><td>NO 17-18, NC 15-16</td><td>On-delay: the contacts switch after the time</td></tr>
<tr><td><b>B</b></td><td>Switch moved by the machine: limit, float, pressure</td><td>NO 13-14, NC 11-12</td><td>"Actuated" means the machine pushes it</td></tr>
<tr><td><b>H</b></td><td>Lamp, horn</td><td>X1-X2</td><td>A load, like a coil</td></tr>
</table></div>

<h3>Five patterns make every circuit</h3>
<div class="tbl"><table>
<tr><th>Pattern</th><th>How it is drawn</th><th>Try it</th></tr>
<tr><td><b>Series = AND</b></td><td>Contacts one below the other. All must be closed</td><td><a href="#circuit-c-series">Series and parallel</a></td></tr>
<tr><td><b>Parallel = OR</b></td><td>Contacts side by side, linked above and below. One is enough</td><td><a href="#circuit-c-two">Two stations</a></td></tr>
<tr><td><b>Seal-in</b></td><td>A NO contact of the contactor beside its own START button</td><td><a href="#circuit-c-seal">Direct-on-line starter</a></td></tr>
<tr><td><b>Interlock</b></td><td>An NC contact of the other contactor above each coil</td><td><a href="#circuit-c-rev">Forward / reverse</a></td></tr>
<tr><td><b>Timer</b></td><td>A timer coil beside the contactor, its contacts in other paths</td><td><a href="#circuit-c-sd">Star-delta</a></td></tr>
</table></div>

<h3>From the circuit to ladder</h3>
<p>Turn the drawing a quarter turn and you have ladder: L becomes the left rail, N the right rail, each current path becomes a rung, the load becomes the coil at the end. That is where ladder logic comes from: it was made so electricians could read PLC programs.</p>
<div class="tbl"><table>
<tr><th>Hard-wired</th><th>Ladder</th></tr>
<tr><td>Push button contact</td><td>Contact with an input address (I0.0)</td></tr>
<tr><td>Contactor coil</td><td>Coil with an output address (Q0.0)</td></tr>
<tr><td>Helper relay (KA)</td><td>Memory bit (M0.0)</td></tr>
<tr><td>Timer relay</td><td>TON / TOF</td></tr>
<tr><td>Changing the logic</td><td>Rewire the panel → edit a rung</td></tr>
</table></div>
<p>One trap when you move a circuit into a PLC: a STOP button wired NC gives the input a <b>1</b> while it is not pressed. In the program you then use a normal (NO) contact for it. See <a href="#lesson-field-vs-program">field wiring and the program</a>.</p>
<div class="callout where"><b>Where:</b> every motor starter, every safety circuit, every old machine. In interviews: "Draw a direct-on-line starter" and "Draw star-delta with its interlock" are standard questions. Practise both in the <a href="#circuits">Circuits</a> until you can draw them from memory.</div>`,
      sims: {},
      takeaways: ["Power circuit: motor current. Control circuit: decides when the contactors close.", "Read from L (top) to N (bottom). The load is the last part of each path.", "Contacts are drawn at rest: NO open, NC closed.", "Series is AND, parallel is OR, a NO contact beside START is the seal-in.", "Ladder is the same drawing turned a quarter turn."],
      mistakes: ["Seal-in contact beside the STOP button and not beside START.", "Two coils or lamps in series: each gets half the voltage.", "The overload contact left out of the coil path: the motor burns after a trip.", "Interlock forgotten between two contactors that must never close together.", "A path from L to N without a load: a short circuit."],
      challenges: ["start-stop", "interlock", "star-delta"],
    },
    {
      id: 'ton', level: 3, title: 'On-delay timer (TON)', min: 8,
      summary: 'Output comes on after the input has been on continuously for the preset time.',
      body: `
<h3>What it is</h3>
<p>A <b>TON</b> times while its rung is powered. When the elapsed time (<b>ET</b>) reaches the preset (<b>PT</b>), its <b>done bit</b> (T0, called Q or .DN) turns on. If the rung loses power, ET resets to 0 instantly.</p>
[[sim:ton]]
<div class="tbl"><table>
<tr><th>Signal</th><th>PLC Start</th><th>Allen-Bradley</th><th>CODESYS</th></tr>
<tr><td>Done</td><td>T0 (= T0.Q)</td><td>T0.DN</td><td>T0.Q</td></tr>
<tr><td>Timing</td><td>T0.TT</td><td>T0.TT</td><td>T0.IN AND NOT T0.Q</td></tr>
<tr><td>Elapsed</td><td>T0.ET (ms)</td><td>T0.ACC</td><td>T0.ET</td></tr>
</table></div>
<h3>Where it's used</h3>
<ul>
<li>Delay starting a second motor so inrush currents don't add up.</li>
<li>"Hold the button for 3 s" to confirm a dangerous action.</li>
<li><b>Debounce</b> a noisy sensor: only believe it when it stays on for 50 ms.</li>
<li>Alarm only if the high level persists for 10 s.</li>
<li>Star-delta changeover, warning horn before a conveyor starts.</li>
</ul>
<div class="callout tip"><b>Pattern:</b> timer on one rung, its done bit used on other rungs. Keep timers on their own rung. It's easier to read and you can use the done bit anywhere.</div>`,
      sims: { ton: { program: 'RUNG 3 s on-delay\nNO(I0.4) TON(T0,3s)\nRUNG Lamp when done\nNO(T0) COIL(Q0.0)', inputs: { 'I0.4': sw('Switch') }, outputs: { 'Q0.0': 'Lamp' }, note: 'Switch on and watch ET count up. Switch off early and ET jumps back to 0.' } },
      takeaways: ['TON: on after PT of continuous input; resets instantly.', 'Use T0 (done) contacts elsewhere.'],
      mistakes: ['Expecting TON to remember time across interruptions (that is RTO).'],
      challenges: ['delay-on', 'cascade', 'warning-horn'],
    },
    {
      id: 'tof-tp-rto', level: 3, title: 'Off-delay, pulse & retentive timers', min: 10,
      summary: 'TOF keeps running after the input drops. TP makes a fixed pulse. RTO accumulates.',
      body: `
<h3>TOF: off-delay</h3>
<p>Output turns on <b>immediately</b> with the input, and stays on for PT <b>after</b> the input turns off. Use it for fan overrun, a cooling pump after shutdown, keeping a conveyor running to clear the last part, or lighting that stays on.</p>
[[sim:tof]]
<h3>TP: pulse</h3>
<p>On a rising edge, the output is on for exactly PT, no matter how long or short the input is. Use it for fixed-length kicks: a feeder solenoid, a horn blast, a lubrication shot.</p>
[[sim:tp]]
<h3>RTO / TONR: retentive on-delay</h3>
<p>Like TON, but it <b>keeps</b> its elapsed time when the input drops. Only a <b>RESET</b> coil clears it. Use it for run-hour meters, maintenance intervals, and total heating time in a batch interrupted by a pause.</p>
[[sim:rto]]
<div class="tbl"><table>
<tr><th>Timer</th><th>Output turns ON</th><th>Output turns OFF</th><th>Time resets</th></tr>
<tr><td>TON</td><td>PT after input on</td><td>with input</td><td>input off</td></tr>
<tr><td>TOF</td><td>with input</td><td>PT after input off</td><td>input on</td></tr>
<tr><td>TP</td><td>on input rising edge</td><td>after PT</td><td>after pulse, input off</td></tr>
<tr><td>RTO</td><td>when accumulated ≥ PT</td><td>on RESET</td><td>RESET only</td></tr>
</table></div>`,
      sims: {
        tof: { program: 'RUNG 5 s off-delay\nNO(I0.4) TOF(T1,5s)\nRUNG Fan\nNO(T1) COIL(Q0.1)', inputs: { 'I0.4': sw('Light switch') }, outputs: { 'Q0.1': 'Fan' } },
        tp: { program: 'RUNG 2 s pulse per press\nNO(I0.0) TP(T4,2s)\nRUNG Feeder\nNO(T4) COIL(Q0.0)', inputs: { 'I0.0': pb('Feed') }, outputs: { 'Q0.0': 'Feeder' } },
        rto: { program: 'RUNG Accumulate run time\nNO(I0.4) RTO(T5,5s)\nRUNG Service lamp\nNO(T5) COIL(Q0.7)\nRUNG Clear\nNO(I0.2) RST(T5)', inputs: { 'I0.4': sw('Running'), 'I0.2': pb('Service done') }, outputs: { 'Q0.7': 'Service due' } },
      },
      takeaways: ['TOF = delay the OFF.', 'TP = fixed pulse.', 'RTO = remembers time; needs RESET.'],
      mistakes: ['Forgetting the RESET for a retentive timer, so it is "done" forever.'],
      challenges: ['fan-overrun', 'one-pulse', 'service-hours', 'stair-timer'],
    },
    {
      id: 'timer-patterns', level: 3, title: 'Timer tricks: flashers, debounce, timeouts', min: 9,
      summary: 'Oscillators, filtering noisy sensors, and watchdogs that catch stuck machines.',
      body: `
<h3>Flasher (oscillator)</h3>
<p>Two timers that reset each other make a blinker: T1 times the OFF phase, then T2 times the ON phase, and T2 resets T1.</p>
[[sim:flash]]
<p>Shortcut: most PLCs have clock bits. In Siemens that's SM0.5 or a clock memory byte, in AB you'd use a free-running timer, in CODESYS BLINK. <code>Alarm AND SM0.5 → beacon</code>.</p>
<h3>Debounce</h3>
<p>Mechanical contacts bounce and sensors flicker. Only believe a signal when it is stable: <code>Sensor → TON(50ms) → use the done bit</code>.</p>
<h3>Watchdog / timeout</h3>
<p>Start a timer when you command a movement, and stop it when the "arrived" sensor confirms. If the timer finishes first, something is stuck: raise an alarm and stop.</p>
[[sim:wd]]
<div class="callout where"><b>Where:</b> every professional sequence has a timeout on every move. "Cylinder A did not extend within 3 s" is far better than a machine that just hangs.</div>`,
      sims: {
        flash: { program: 'RUNG OFF phase\nNO(I0.4) NC(T2) TON(T1,500ms)\nRUNG ON phase\nNO(T1) TON(T2,500ms)\nRUNG Beacon\nNO(I0.4) NO(T1) COIL(Q0.4)', inputs: { 'I0.4': sw('Alarm') }, outputs: { 'Q0.4': 'Beacon' } },
        wd: { program: 'RUNG Valve command\nNO(I0.4) COIL(Q0.0)\nRUNG Timeout while commanded but not arrived\nNO(Q0.0) NC(I0.5) TON(T6,3s)\nRUNG Fault latch\nNO(T6) | NC(I0.3) COIL(M1.0)\nNO(M1.0)\nRUNG Fault lamp\nNO(M1.0) COIL(Q0.5)', inputs: { 'I0.4': sw('Extend cmd'), 'I0.5': sw('Arrived sensor'), 'I0.3': nc('Reset') }, outputs: { 'Q0.0': 'Valve', 'Q0.5': 'Fault' }, note: 'Command the valve but don\'t switch "Arrived" on: after 3 s the fault latches. RESET clears it.' },
      },
      takeaways: ['Two cross-reset timers = oscillator.', 'TON on a sensor = debounce.', 'Timeouts turn silent hangs into clear alarms.'],
      mistakes: ['Flasher timers that never reset because the reset contact is on the wrong timer.'],
      challenges: ['flasher', 'bug-flasher'],
    },
    {
      id: 'timed-sequences', level: 3, title: 'Timed sequences: traffic light & star-delta', min: 10,
      summary: 'Chain timers so each phase starts when the previous one is done.',
      body: `
<h3>Timer chains</h3>
<p>For purely time-based sequences, chain timers: T1 times phase 1, then T1's done bit starts T2, T2 starts T3, and T3 resets T1 to loop. The outputs are decoded from the done bits:</p>
<div class="tbl"><table>
<tr><th>Phase</th><th>Condition</th><th>Lamp</th></tr>
<tr><td>Green</td><td>Run AND NOT T1</td><td>Q0.2</td></tr>
<tr><td>Yellow</td><td>T1 AND NOT T2</td><td>Q0.1</td></tr>
<tr><td>Red</td><td>T2 (or not running)</td><td>Q0.0</td></tr>
</table></div>
<p>Build it in the challenge "Traffic light cycle", with the crossing animated.</p>
<h3>Star-delta starting</h3>
<p>Big motors draw 6–8× their rated current when starting direct-on-line. A <b>star-delta</b> starter starts the windings in star (≈⅓ current), then after a few seconds switches to delta for full torque. Three contactors: main KM, star KY, delta KΔ. KY and KΔ must <b>never</b> be closed together, so they are interlocked.</p>
<div class="callout tip"><b>Where timers aren't enough:</b> if a step should end when a sensor confirms something rather than after a fixed time, you need a <i>sequence</i> (level 5). Timed-only sequences are blind: if a cylinder sticks, the program carries on regardless.</div>`,
      sims: {},
      open: [{ label: 'Open traffic crossing', plant: 'traffic', program: 'traffic' }, { label: 'Open star-delta starter', plant: 'stardelta', program: 'star-delta' }],
      takeaways: ['Timer chain: each done bit starts the next timer; the last resets the first.', 'Interlock contactors that must never close together.'],
      mistakes: ['Using timers where a sensor confirmation is needed.'],
      challenges: ['traffic', 'star-delta', 'traffic-night'],
    },

    // ═══════════════════════ LEVEL 4 ═══════════════════════
    {
      id: 'counters', level: 4, title: 'Counters: CTU & CTD', min: 8,
      summary: 'Count rising edges; done bit at the preset; reset with a RESET coil.',
      body: `
<h3>What it is</h3>
<p>A <b>CTU</b> (count up) adds 1 to its current value <b>CV</b> on every rising edge of its rung. When CV ≥ PV (preset), its done bit C0 turns on. A <b>CTD</b> subtracts 1 per edge. Use a <b>RESET</b> coil on C0 to clear it.</p>
[[sim:ctu]]
<p>Counters count <b>edges</b>, not scans: holding the button adds only 1. That edge detection is built in.</p>
<h3>Up/down on one counter</h3>
<p>Point a CTU and a CTD at the <b>same</b> counter number: entries add, exits subtract. (That is the way of this simulator and of Rockwell. In TIA Portal, CODESYS and TwinCAT you use one <b>CTUD</b> block with a CU and a CD input.) That gives a live "how many are inside" count for parking lots, buffers and accumulation conveyors.</p>
<div class="callout where"><b>Where:</b> batch counting (5 boxes per carton), production totals, cycles until maintenance, retries before fault, people/cars inside.</div>
<div class="callout warn"><b>Watch out:</b> a counter only counts if its input really goes 0 → 1. Two boxes touching each other under a photo-eye look like one long box. Mechanical spacing or a timer gap fixes it.</div>`,
      sims: { ctu: { program: 'RUNG Count presses\nNO(I0.0) CTU(C0,5)\nRUNG Reset\nNO(I0.1) RST(C0)\nRUNG Done lamp\nNO(C0) COIL(Q0.0)', inputs: { 'I0.0': pb('Count'), 'I0.1': pb('Reset') }, outputs: { 'Q0.0': '5 reached' } } },
      takeaways: ['CTU/CTD count rising edges.', 'Done bit at preset; RESET clears.', 'Share a number for up/down counting.'],
      mistakes: ['Forgetting the reset, so the batch is "done" forever.', 'Resetting with a level signal that stays on and blocks counting.'],
      challenges: ['count-boxes', 'parking', 'ctd-batch', 'palletizer'],
    },
    {
      id: 'compare-math', level: 4, title: 'Words, compare, MOV & math', min: 9,
      summary: 'Numbers in ladder: compare contacts, MOV to copy values, ADD/SUB/MUL/DIV.',
      body: `
<h3>Words</h3>
<p>A <b>word</b> (MW0, MW2 …) holds a 16-bit integer (-32768 … 32767). Timer elapsed times (T0.ET) and counter values (C0.CV) are numbers too.</p>
<h3>Compare contacts</h3>
<p>A compare box sits on the rung like a contact and passes power when the comparison is true: <code>==  &lt;&gt;  &gt;  &gt;=  &lt;  &lt;=</code>.</p>
[[sim:cmp]]
<h3>MOV and math</h3>
<p>Output boxes run on <b>every scan</b> while their rung is powered:</p>
<ul>
<li><code>MOV 5 → MW0</code> copies a value.</li>
<li><code>ADD MW0 + 1 → MW0</code>, plus SUB, MUL and DIV (integer: 7 / 2 = 3).</li>
</ul>
<div class="callout warn"><b>The #1 math bug:</b> <code>NO(button) → ADD MW0+1</code> adds 1 <b>every scan</b> (100× per second). Use an edge contact <code>P</code> to add once per press.</div>
<div class="callout where"><b>Where:</b> recipes (MOV setpoints), step numbers (state machines), scaling analog values, production totals, comparing a timer's ET to switch things at several moments with one timer.</div>`,
      sims: { cmp: { program: 'RUNG Count presses\nNO(I0.0) CTU(C1,100)\nRUNG Clear\nNO(I0.1) RST(C1)\nRUNG Lamp 1 at ≥ 3\nCMP(C1.CV>=3) COIL(Q0.0)\nRUNG Lamp 2 at ≥ 6\nCMP(C1.CV>=6) COIL(Q0.1)', inputs: { 'I0.0': pb('Count'), 'I0.1': pb('Clear') }, outputs: { 'Q0.0': '≥ 3', 'Q0.1': '≥ 6' } } },
      takeaways: ['Compare contacts test numbers.', 'MOV/ADD run every scan while powered: use edges.'],
      mistakes: ['Comparing ms (T0.ET) with seconds.', 'Integer division surprises.'],
      challenges: ['compare', 'math', 'stages-cmp'],
    },
    {
      id: 'shift-registers', level: 4, title: 'Bit shifting & shift registers', min: 16,
      summary: 'What a shift register really is, how to read the rungs, when to use one (and when not), and the five jobs it does in real machines.',
      body: `
<h3>In one sentence</h3>
<p>A shift register is a <b>row of memory bits that moves one place every time you give it a pulse</b>. It remembers <b>what happened, in order</b>, for a fixed number of steps.</p>
<h3>Picture it: a line of people passing cards</h3>
<p>Eight people stand in a row, each holding a card with 0 or 1. When the whistle blows (<b>the pulse</b>), everybody passes their card to the person on their right. The first person picks up a new card from the pile (<b>DATA</b>). The card of the last person falls on the floor. That is <b>one shift</b>. Nothing else happens until the next whistle.</p>
<h3>Step by step</h3>
<p>Register of 8 bits (b0 … b7), all 0. SW1 is the DATA card, each press of PB1 is the whistle:</p>
<div class="tbl compact"><table>
<tr><th></th><th>DATA</th><th>b0</th><th>b1</th><th>b2</th><th>b3</th><th>b4</th><th>b5</th><th>b6</th><th>b7</th></tr>
<tr><td>start</td><td></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>PB1 #1</td><td>1</td><td><b>1</b></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>PB1 #2</td><td>0</td><td>0</td><td><b>1</b></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>PB1 #3</td><td>1</td><td><b>1</b></td><td>0</td><td><b>1</b></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>PB1 #4</td><td>0</td><td>0</td><td><b>1</b></td><td>0</td><td><b>1</b></td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
</table></div>
<p>Read a column downwards: the 1 that went in at press 1 is in bit 3 after press 4. <b>Bit k always holds the DATA from k pulses ago.</b> That one rule is the whole secret.</p>
<h3>Reading the two rungs of the example</h3>
<p><b>Rung 1: <code>P(PB1) → SHRB(DATA = SW1, START = Q0.0, N = 8)</code></b>. Say it out loud: "<i>At the moment PB1 is pressed, shift the eight bits starting at Q0.0 one place, and put SW1 into the first one.</i>" The <b>P</b> matters: SHRB shifts on <b>every scan</b> while its rung is true. A press lasts maybe 200 ms = 20 scans, so without the edge you would get 20 shifts and the whole register fills at once.</p>
<p><b>Rung 2: one PB2 contact, eight RST outputs below each other</b>. This is <b>one condition with many outputs in parallel</b>: "<i>while PB2 is pressed, reset Q0.0, and Q0.1, and … Q0.7.</i>" It does exactly the same as eight rungs with the same contact, just shorter. You will see this pattern everywhere: one reset button clearing many bits, one mode switch turning several things off, one alarm stopping several motors.</p>
[[sim:sr]]
<h3>Why not a timer or a counter?</h3>
<div class="tbl"><table>
<tr><th>Tool</th><th>It knows…</th><th>It cannot tell you…</th></tr>
<tr><td>Timer</td><td>how much time has passed</td><td>where a part is if the line stops or slows down</td></tr>
<tr><td>Counter</td><td>how many parts passed</td><td>which one of them was bad</td></tr>
<tr><td>One memory bit</td><td>about one part</td><td>about the second and third part in between</td></tr>
<tr><td><b>Shift register</b></td><td><b>which</b> part had <b>what</b>, and <b>where</b> it is now, in order</td><td>(needs one pulse per step)</td></tr>
</table></div>
<h3>When to use one: three questions</h3>
<ol>
<li>Is something <b>measured at one place</b> and <b>used at another place later</b>?</li>
<li>Do the objects move in <b>steps</b> (pockets, pallets, one bottle after the other, one test after the other) and can you get <b>one pulse per step</b>?</li>
<li>Can there be <b>more than one</b> object between the measuring place and the using place?</li>
</ol>
<p>Three times "yes" → shift register. Only one object in between → one memory bit is enough (the box sorter). Parts at random distances with no pulse per part → you need positions from an encoder and a list (FIFO) instead.</p>
<h3>How to design one: four answers</h3>
<div class="tbl"><table>
<tr><th>Question</th><th>Bottle example</th></tr>
<tr><td>What is the <b>clock</b>? (one pulse per step)</td><td>"a bottle passed the checker", with an edge</td></tr>
<tr><td>What is the <b>DATA</b>? (what must I remember)</td><td>"this bottle is bad"</td></tr>
<tr><td>How many steps to where I use it? = <b>bit number</b></td><td>rejector 3 bottles later → bit 3</td></tr>
<tr><td>How <b>long</b> must it be?</td><td>at least the farthest station + 1 (here 4; 8 is fine)</td></tr>
</table></div>
[[sim:delay]]
<h3>Five jobs it does in real machines</h3>
<ol>
<li><b>Tracking:</b> carry a measurement down a conveyor to a reject jet, a label printer, a sorting gate.</li>
<li><b>Delay by N events:</b> act on something N parts / N cycles later.</li>
<li><b>History:</b> the last N results side by side ("three fails in a row").</li>
<li><b>Sequencer:</b> one 1-bit walking round a ring = one active step at a time.</li>
<li><b>Displays:</b> running lights, chasers, scrolling patterns.</li>
</ol>
<h3>Shifting a whole word: SHL, SHR, ROL, ROR</h3>
<p>The same idea on one word: <b>SHL</b> moves all 16 bits one place up (= ×2), <b>SHR</b> down (= ÷2), <b>ROL/ROR</b> rotate so the bit that falls out comes back at the other end. <code>0000 0101 (5) SHL 1 = 0000 1010 (10)</code>. Use them for patterns and arithmetic; use SHRB when every bit means "one object".</p>
<div class="callout warn"><b>The three classic mistakes:</b> no edge on the clock (it shifts every scan) · clocking a conveyor register with a timer instead of a pulse per pocket · counting stations wrongly: if DATA enters bit 0 at the sensor, the station N steps later is bit N.</div>
<div class="callout where"><b>Where:</b> bottling and packaging lines, electronics test lines, sorting conveyors, labelling, car-body tracking in paint shops, and every running-light display.</div>`,
      sims: {
        sr: { program: 'RUNG One shift per press of PB1: SW1 is the DATA bit\nP(I0.0) SHRB(I0.4,Q0.0,8)\nRUNG PB2 clears: one condition, eight outputs in parallel\nNO(I0.1) ~ | RST(Q0.0)\n. . . . . . | RST(Q0.1)\n. . . . . . | RST(Q0.2)\n. . . . . . | RST(Q0.3)\n. . . . . . | RST(Q0.4)\n. . . . . . | RST(Q0.5)\n. . . . . . | RST(Q0.6)\nRST(Q0.7)', inputs: { 'I0.0': { name: 'PB1 shift', kind: 'pb' }, 'I0.4': { name: 'SW1 data', kind: 'sw' }, 'I0.1': { name: 'PB2 clear', kind: 'pb' } }, outputs: { 'Q0.0': 'bit 0', 'Q0.1': 'bit 1', 'Q0.2': 'bit 2', 'Q0.3': 'bit 3', 'Q0.4': 'bit 4', 'Q0.5': 'bit 5', 'Q0.6': 'bit 6', 'Q0.7': 'bit 7' }, note: 'Do the table above: SW1 on, press PB1; SW1 off, press; SW1 on, press; SW1 off, press. Then PB2 to clear.' },
        delay: { program: 'RUNG Each bottle (PB1) shifts once. SW1 = this bottle is bad\nP(I0.0) SHRB(I0.4,M10.0,8)\nRUNG Bottle at the checker\nNO(M10.0) COIL(Q0.0)\nRUNG 1 bottle later\nNO(M10.1) COIL(Q0.1)\nRUNG 2 bottles later\nNO(M10.2) COIL(Q0.2)\nRUNG Rejector: 3 bottles later = bit 3\nNO(M10.3) COIL(Q0.3)', inputs: { 'I0.0': { name: 'PB1 next bottle', kind: 'pb' }, 'I0.4': { name: 'SW1 bad bottle', kind: 'sw' } }, outputs: { 'Q0.0': 'checker', 'Q0.1': '+1', 'Q0.2': '+2', 'Q0.3': 'REJECT +3' }, note: 'SW1 on, press PB1 (a bad bottle), SW1 off, then press PB1 three more times: the reject lamp lights exactly when that bottle arrives.' },
      },
      takeaways: ['A shift register is a row of bits that moves one place per pulse; DATA enters the first bit.', 'Bit k holds the DATA from k pulses ago.', 'Clock it with an edge (P) or a one-scan pulse.', 'Use it when something measured here is needed there, several steps later.', 'One condition can drive many outputs in parallel: same as many rungs with the same contact.', 'SHL/SHR/ROL/ROR shift a whole word.'],
      mistakes: ['Clocking without an edge: the register fills in a flash.', 'Clocking a conveyor register with a timer instead of one pulse per pocket.', 'Off by one: the station N steps after the sensor is bit N when DATA enters bit 0.', 'Checking "three in a row" every scan instead of once per pulse: the alarm comes back after reset.'],
      challenges: ['sr-hand', 'bug-sr-edge', 'sr-clear', 'sr-delay', 'sr-history', 'sr-ring', 'shift-chaser', 'track-1', 'track-2', 'track-3', 'st-shift'],
    },
    {
      id: 'field-devices', level: 4, title: 'Field devices: sensors & actuators', min: 10,
      summary: 'What is actually wired to I and Q: proximity, photo-eyes, reed switches, contactors, valves.',
      body: `
<h3>Input devices</h3>
<div class="tbl"><table>
<tr><th>Device</th><th>Senses</th><th>Typical use</th></tr>
<tr><td>Push button / selector</td><td>Operator</td><td>Start, stop, auto/manual</td></tr>
<tr><td>Limit switch</td><td>Mechanical contact</td><td>Door end positions, travel limits</td></tr>
<tr><td>Inductive proximity</td><td>Metal, no contact (mm range)</td><td>Gear teeth, cylinder rods, metal parts</td></tr>
<tr><td>Capacitive proximity</td><td>Almost anything incl. liquids</td><td>Level through plastic tank walls</td></tr>
<tr><td>Photo-eye (photoelectric)</td><td>Interrupted light beam</td><td>Boxes on conveyors, safety beams</td></tr>
<tr><td>Reed switch / magnetic</td><td>Magnet in a piston</td><td>Cylinder end positions (Sensor 1–4 in your video)</td></tr>
<tr><td>Float / level switch</td><td>Liquid level</td><td>Tank low / high</td></tr>
<tr><td>Pressure / temperature switch</td><td>Process threshold</td><td>Air OK, overheating</td></tr>
</table></div>
<h3>PNP vs NPN (sourcing vs sinking)</h3>
<p>3-wire DC sensors switch either +24 V (<b>PNP</b>, sourcing) or 0 V (<b>NPN</b>, sinking) to the input. The PLC input card must match: a <b>sinking</b> input card takes PNP sensors (common in Europe), a <b>sourcing</b> card takes NPN sensors (common in Asia). Mismatch = sensor LED lights but the PLC sees nothing.</p>
<h3>Output devices</h3>
<div class="tbl"><table>
<tr><th>Device</th><th>Does</th><th>Note</th></tr>
<tr><td>Contactor</td><td>Switches motor power</td><td>The PLC drives its 24 V coil, not the motor</td></tr>
<tr><td>Solenoid valve</td><td>Switches air/oil to a cylinder</td><td>Single solenoid = spring return; double = memory</td></tr>
<tr><td>Pilot lamp / beacon / horn</td><td>Signals operators</td><td>Green running, red fault, amber attention</td></tr>
<tr><td>VFD (drive)</td><td>Speed-controlled motor</td><td>Run/direction bits + speed word</td></tr>
</table></div>
<div class="callout tip"><b>Single vs double solenoid valves:</b> a single solenoid valve returns when you switch it off (fail-safe position). A double solenoid valve stays where it was last pushed, so it needs both an extend and a retract output, and the program must never energise both.</div>`,
      sims: {},
      takeaways: ['Know your sensor type and wiring before writing logic.', 'The PLC switches coils of contactors and valves, not the load directly.'],
      mistakes: ['PNP sensor on a sourcing input card.', 'Treating a double-solenoid valve like a spring-return valve.'],
      challenges: [],
    },

    {
      id: 'pneu-valves', level: 4, title: 'Pneumatic valves: every type, when and why', min: 15,
      summary: 'Read a valve symbol, know the 8 directional valves (2/2, 3/2, 5/2, 5/3) and the small ones around them, and choose the right one: what must the cylinder do when the power fails?',
      body: `
<p>A PLC never moves a cylinder by itself. It switches a <b>coil</b> on a <b>valve</b>, and the valve sends air to the cylinder. The valve you choose decides what the cylinder does when a coil goes off, when the power fails, when the E-stop is pressed or when the air is shut off. So it changes the program and the safety of the machine.</p>
<h3>1. Read the name and the symbol</h3>
<ul>
<li><b>5/2</b> means <b>5 ports, 2 positions</b>. 3/2 = 3 ports, 2 positions. 5/3 = 5 ports, 3 positions.</li>
<li><b>Port numbers</b> (ISO 5599): <b>1</b> = supply, <b>2</b> and <b>4</b> = to the cylinder, <b>3</b> and <b>5</b> = exhausts. The coil <b>14</b> joins 1 to 4; the coil (or spring) <b>12</b> joins 1 to 2.</li>
<li>In the symbol every <b>square is one position</b>. Arrows show where the air flows, a <b>T</b> is a blocked port. The ports always stay at the square in use: when the valve switches, picture the squares sliding over the ports.</li>
<li>At the ends you see what moves the valve: a coil (rectangle with a slash), a spring (zigzag), a push button or manual override, a roller lever, an air pilot.</li>
</ul>
<p>Mount a valve on the island, switch its coils like PLC outputs, then cut the power, shut off the air or hang a load on the cylinder:</p>
[[hw:valves]]
<h3>2. The family, and when to use each one</h3>
<div class="tbl"><table>
<tr><th>Valve</th><th>Drives</th><th>Power fails</th><th>Use it for</th></tr>
<tr><td><b>2/2</b> NC</td><td>one line</td><td>closes</td><td>blow-off nozzles, air knives, vacuum on / off, shut-off</td></tr>
<tr><td><b>3/2</b> NC</td><td>single-acting cylinder</td><td>vents: spring returns</td><td>clamps, stoppers, ejectors, the soft-start / dump valve of a machine</td></tr>
<tr><td><b>3/2</b> NO</td><td>single-acting cylinder</td><td>pressurises: goes out</td><td>brakes released by air, functions that must stay on without power</td></tr>
<tr><td><b>5/2 monostable</b></td><td>double-acting cylinder</td><td>springs back: cylinder retracts</td><td>the everyday choice: pushers, lifts, slides, grippers</td></tr>
<tr><td><b>5/2 bistable</b></td><td>double-acting cylinder</td><td>stays, keeps pushing</td><td>grippers and clamps that must hold the part</td></tr>
<tr><td><b>5/3 closed centre</b></td><td>double-acting cylinder</td><td>stops and holds (trapped air)</td><td>stop anywhere, positioning, vertical axes (with pilot check valves)</td></tr>
<tr><td><b>5/3 exhaust centre</b></td><td>double-acting cylinder</td><td>no force on either side</td><td>move by hand after a stop, free a trapped hand</td></tr>
<tr><td><b>5/3 pressure centre</b></td><td>double-acting cylinder</td><td>pressure on both sides</td><td>balanced or rodless cylinders, holding with pilot check valves</td></tr>
</table></div>
<h3>3. How to choose, in four questions</h3>
<ol>
<li><b>Single- or double-acting?</b> A spring return (single) needs a 3/2. Air both ways (double) needs a 5/2 or 5/3.</li>
<li><b>What must happen when the power fails or the E-stop opens?</b> Go back → 5/2 monostable. Stay where it is → 5/2 bistable. Stop where it is → 5/3 closed centre. No force at all → 5/3 exhaust centre.</li>
<li><b>Must it stop in the middle?</b> Only a 5/3 can stop a cylinder between its ends.</li>
<li><b>Is the load vertical?</b> A falling load is dangerous. Never use an exhaust centre on it; a closed centre holds only for a short time, because valves leak. For people under a load use pilot check valves on the cylinder or a mechanical clamp.</li>
</ol>
<div class="callout tip"><b>Rule of thumb:</b> first decide the safe state of the movement, then pick the valve that goes there by itself. Do not try to fix a wrong valve in the program: when the power fails, the program does not run.</div>
<h3>4. What switches the valve</h3>
<ul>
<li><b>Solenoid</b>: the PLC output (24 V DC). Most valves are <b>pilot-operated</b>: the coil moves a tiny pilot valve and the supply air moves the big spool. They need a minimum pressure (often 2 to 3 bar) to switch.</li>
<li><b>Spring</b> return, or <b>centring springs</b> on a 5/3.</li>
<li><b>Manual override</b>: the small yellow button on the valve, to test a movement during commissioning. It moves the cylinder even when the program says no: check the danger zone first.</li>
<li><b>Mechanical</b>: roller lever, plunger, push button. <b>Air pilot</b>: another valve switches it (pure pneumatic control).</li>
<li><b>Valve islands</b>: 8 to 32 valves on one manifold with one supply, one exhaust and one fieldbus cable (PROFINET, EtherNet/IP, IO-Link) instead of a wire for every coil.</li>
</ul>
<h3>5. In the PLC program</h3>
<ul>
<li><b>5/2 monostable</b>: one output, a normal coil. ON for as long as the cylinder must be out.</li>
<li><b>5/2 bistable</b>: two outputs. A short pulse on Y14 (out) or Y12 (back). Interlock them so both are never on together.</li>
<li><b>5/3</b>: two outputs. Y14 = out, Y12 = back, both off = the centre position (stop). Never both on.</li>
</ul>
<pre class="code">Out  := Step_Out AND NOT Back_cmd;   (* Y14 *)
Back := Step_Back AND NOT Out_cmd;   (* Y12 *)</pre>
<p>Always check the end sensors (B1 back, B2 out) before the next step, and add a time-out: if the sensor does not come in time, the valve, the air or the sensor has a fault.</p>
<h3>6. Speed, force and the small valves</h3>
<ul>
<li><b>One-way flow control, meter-out</b>: throttles the air leaving the cylinder. The piston moves smoothly, even with a changing load. Fit it at the cylinder ports.</li>
<li><b>Quick exhaust valve</b>: dumps the air right at the cylinder: a much faster return.</li>
<li><b>Check valve</b>: air one way only. <b>Shuttle valve</b>: OR. <b>Two-pressure valve</b>: AND.</li>
<li><b>Pressure regulator</b>: sets the force. Force = pressure × piston area (6 bar on a 32 mm piston ≈ 480 N).</li>
</ul>
[[hw:airlogic]]
<div class="callout warn"><b>Safety:</b> compressed air is stored energy. Before you work on a machine, shut off and <b>exhaust</b> the air (a lockable 3/2 shut-off valve on the supply), not only the power. A cylinder can still move on trapped air. Safety functions need certified safety valves, often two in series with monitored spools.</div>
<div class="callout where"><b>Where:</b> every machine with cylinders: packaging, assembly cells, pick &amp; place, presses, sorting gates, robot grippers, food and pharma lines, trucks and trains (doors and brakes).</div>
`,
      sims: {},
      takeaways: ['5/2 = 5 ports, 2 positions. 1 supply, 2 and 4 to the cylinder, 3 and 5 exhaust; coil 14 gives 1→4.', 'Choose the valve by the safe state: back (5/2 mono), stay (5/2 bistable), stop (5/3 closed), free (5/3 exhaust).', 'Monostable: hold the coil. Bistable and 5/3: two outputs, never both on.', 'Meter-out flow control for speed, a regulator for force, a quick exhaust for a fast return.'],
      mistakes: ['A 5/3 exhaust centre on a vertical load: it falls when the valve stops.', 'Switching both coils of a bistable or 5/3 valve on together.', 'Trusting a closed centre to hold a load for a long time: valves leak.', 'Working on a machine with the power off but the air still on.'],
      challenges: ['vlv-bistable', 'vlv-midstop', 'vlv-lift', 'bug-vlv-both', 'cyl-once', 'cyl-repeat'],
    },
    {
      id: 'vacuum', level: 4, title: 'Vacuum grippers: grip, check, lift, release', min: 12,
      summary: 'How a suction cup holds a part, how the air makes the vacuum, why the PLC waits for the vacuum switch before it lifts, and how a blow-off pulse lets the part go.',
      body: `
<p>Boxes, sheets, glass, bags, bottles: many machines pick parts with <b>suction cups</b>. The air outside pushes the part onto the cup when the air inside the cup is taken away. The PLC switches the vacuum on and off, and it <b>checks</b> the vacuum before it moves.</p>
<h3>1. Where the vacuum comes from</h3>
<ul>
<li><b>Venturi ejector</b>: compressed air rushes through a nozzle and drags the air out of the cup. No moving parts, small, fast, right at the gripper. A valve (Y1) on its supply switches it. It uses compressed air the whole time it is on.</li>
<li><b>Vacuum pump</b> (electric): better for big or porous parts and long hold times, but bigger and slower to react.</li>
<li>Vacuum is written as <b>-kPa</b> or <b>-bar</b> below the air around us: -60 kPa = -0.6 bar is a typical working vacuum.</li>
</ul>
<h3>2. Holding force</h3>
<p><b>Force = vacuum × cup area.</b> A 30 mm cup at -60 kPa holds about 42 N, just over 4 kg on paper. On paper only: the part must also be <b>accelerated</b> when it moves, so add a <b>safety factor</b> of 2 for a flat part lifted straight up and 4 when the part is held at the side or moved fast. The <a href="#calc-vcup">vacuum cup calculator</a> does this for you.</p>
<p>Try it: grip a light part and lift it; then make the part heavier, or use a smaller cup, or tear the cup:</p>
[[hw:vacuum]]
<h3>3. The vacuum switch: the PLC's eyes</h3>
<ul>
<li>A vacuum switch (or a vacuum sensor with a switch point) on the gripper tells the PLC: <b>"vacuum reached, the part is held"</b>.</li>
<li>Set it a little below the normal vacuum, for example at -45 kPa when the gripper normally reaches -60.</li>
<li>No signal after a time-out (0.5 to 1 s): <b>no part, a torn cup, a porous part or no air</b>. Do not lift; give an alarm.</li>
<li>Watch it <b>during</b> the move too: if it drops, stop the move before the part falls on someone.</li>
</ul>
<h3>4. The sequence in the program</h3>
<ol>
<li>Move down onto the part.</li>
<li>Vacuum ON (Y1). Wait for the vacuum switch, with a time-out.</li>
<li>Lift and move. The vacuum switch must stay ON.</li>
<li>Move down to the place position.</li>
<li>Vacuum OFF and a short <b>blow-off pulse</b> (Y2, 100 to 300 ms): the cup lets go at once instead of after a second.</li>
<li>Move up; check that the vacuum switch is OFF (the part did not stick to the cup).</li>
</ol>
<div class="callout tip"><b>Saving air:</b> many ejectors have an air-saving circuit: they stop at -70 kPa, a check valve keeps the vacuum, and they start again only when it drops to -60. On a tight part the ejector is off most of the time.</div>
<div class="callout warn"><b>Safety:</b> if the air or the power fails, an ejector stops at once and the part falls. Never move parts over people; for heavy parts use a gripper with a check valve or a mechanical safety catch.</div>
<div class="callout where"><b>Where:</b> packaging and palletising robots, sheet metal feeders, glass handling, labelling, pick &amp; place units, bag and carton erectors.</div>
`,
      sims: {},
      takeaways: ['Force = vacuum × cup area; add a safety factor of 2 (lifted flat) or 4 (held at the side, fast moves).', 'Lift only when the vacuum switch is ON, with a time-out; watch it during the move.', 'Release with vacuum OFF plus a short blow-off pulse.'],
      mistakes: ['Lifting on a timer instead of on the vacuum switch: with a torn cup the part stays behind (or falls on the way).', 'Choosing the cup for the weight only, without the acceleration of the move.', 'No blow-off: the part sticks to the cup and is carried back.'],
      challenges: ['pp-pick', 'diag-vacuum', 'pp-cycle'],
    },
    {
      id: 'pneu-drawings', level: 4, title: 'Reading a pneumatic drawing', min: 10,
      summary: 'The names on a pneumatic drawing (0Z1, 1V1, 1A1, 1B1, 1M1), how the drawing is laid out, and how to use it to find a fault on the machine.',
      body: `
<p>Every machine with air has a <b>pneumatic drawing</b> next to the electrical one. It shows every valve, cylinder and sensor with a name. When something does not move, the drawing tells you what to check, and in which order.</p>
<h3>1. The layout</h3>
<ul>
<li>The <b>air supply is at the bottom</b>: service unit, shut-off valve, the main line.</li>
<li>Above it the <b>valves</b>, and at the top the <b>cylinders</b> and other actuators. Air flows from the bottom to the top.</li>
<li>Every cylinder with its valves and sensors is <b>one circuit</b>, drawn in its own column: circuit 1, circuit 2…</li>
<li>Everything is drawn at rest: power off, air on, cylinders in their start position.</li>
</ul>
<h3>2. The names (ISO 1219-2)</h3>
<div class="tbl"><table>
<tr><th>Name</th><th>Means</th></tr>
<tr><td><b>0Z1</b></td><td>circuit 0 (supply), Z = air preparation: filter, regulator, gauge</td></tr>
<tr><td><b>0V1</b></td><td>circuit 0, V = valve: the shut-off / soft-start valve</td></tr>
<tr><td><b>1A1</b></td><td>circuit 1, A = actuator: the cylinder</td></tr>
<tr><td><b>1V1</b></td><td>circuit 1, the directional valve of that cylinder</td></tr>
<tr><td><b>1V2, 1V3</b></td><td>more valves of circuit 1: flow controls, check valves</td></tr>
<tr><td><b>1B1, 1B2</b></td><td>B = sensor: the end-position sensors of 1A1</td></tr>
<tr><td><b>1M1</b></td><td>M = the coil of 1V1. The same name is on the electrical drawing at the PLC output.</td></tr>
</table></div>
<p>So <b>1M1</b> joins the two drawings: find it on the electrical drawing and you know the PLC output; find it on the pneumatic drawing and you know which valve and which cylinder.</p>
<p>Tap the parts to read them, then switch to <b>Find the fault</b>:</p>
[[hw:pdraw]]
<h3>3. Finding a fault, step by step</h3>
<ol>
<li><b>Air?</b> Gauge on 0Z1, shut-off valve 0V1 on.</li>
<li><b>Does the PLC switch the coil?</b> Output LED on the PLC and the LED on the valve connector.</li>
<li><b>Does the valve switch?</b> Use the manual override: if the cylinder moves now, the fault is electrical (coil, connector, cable).</li>
<li><b>Does the cylinder move freely?</b> Flow controls, jammed mechanics, a leak (you hear it).</li>
<li><b>Does the sensor see it?</b> The LED on the sensor, and the PLC input.</li>
</ol>
<div class="callout where"><b>Where:</b> commissioning and maintenance of every machine with cylinders. Valve islands have their own drawing too: slot number, coil names, and the fieldbus address.</div>
`,
      sims: {},
      takeaways: ['Air flows from the bottom (supply) to the top (cylinders); one column per circuit.', '1A1 cylinder, 1V1 its valve, 1B1/1B2 its sensors, 1M1 the coil (same name on the electrical drawing).', 'Fault finding: air → PLC output → valve (manual override) → mechanics → sensor.'],
      mistakes: ['Changing the program when the fault is a closed flow control or a moved sensor.', 'Forgetting that the drawing shows the machine at rest.'],
      challenges: ['diag-reed', 'cio-2', 'diag-vacuum'],
    },
    {
      id: 'io-wiring', level: 4, title: "Wiring inputs and outputs: PNP, NPN, relays and transistors", min: 14,
      summary: "Where the current flows in an input and an output circuit: sinking and sourcing, 2-wire sensors, the four kinds of output card, flyback diodes and interposing relays. With a wiring simulator where every mistake is free.",
      body: `
<h3>Why wiring matters to a programmer</h3>
<p>Your program can be perfect and the machine still does nothing, because a sensor is wired to the wrong kind of card. In an interview, and on your first commissioning, you must be able to say <b>where the current flows</b> for every input and every output.</p>
<div class="callout tip"><b>The one idea:</b> current needs a closed loop: from +24 V, through the devices, back to 0 V. No loop, no signal. In each loop one device <b>gives</b> current (it sources) and the other <b>takes</b> it (it sinks).</div>

<h3>Try it: wire, power on, see the current</h3>
<p>Pick a card and a device, then press <b>Power on</b>. The green dashes show the current. Every wrong choice is safe here, and the simulator tells you what would burn on a real machine. The eight missions take you through the classic mistakes.</p>
[[hw:wiring]]

<h3>Inputs: PNP and NPN, sinking and sourcing</h3>
<div class="tbl"><table>
<tr><th>Sensor</th><th>What it switches</th><th>Card it needs</th><th>Common of the card goes to</th><th>Where you meet it</th></tr>
<tr><td><b>PNP</b> (sourcing)</td><td>+24 V to the input</td><td><b>Sinking</b> input</td><td>0 V</td><td>Europe: Siemens, Schneider, Beckhoff</td></tr>
<tr><td><b>NPN</b> (sinking)</td><td>0 V to the input</td><td><b>Sourcing</b> input</td><td>+24 V</td><td>Asia: Omron, Mitsubishi, older machines</td></tr>
</table></div>
<p>Remember it like this: <b>one gives, one takes</b>. A PNP sensor gives, so the card must take. Two that give, or two that take, make no current.</p>
<p>Wire colours of a 3-wire sensor: <b>brown</b> = +24 V, <b>blue</b> = 0 V, <b>black</b> = signal.</p>

<h3>The 2-wire sensor and its leakage current</h3>
<p>A 2-wire sensor has no own supply wire. It takes a little current <b>through the input</b>, also when it is off: about 1.5 mA. Some input cards read that as a 1. Then the input never goes off.</p>
<p>The fix is a <b>bleeder resistor</b> from the input to 0 V. The small current flows through the resistor and not through the input.</p>

<h3>Outputs: four kinds of card</h3>
<div class="tbl"><table>
<tr><th>Output</th><th>Switches</th><th>Good</th><th>Bad</th><th>Use it for</th></tr>
<tr><td><b>Relay</b></td><td>AC or DC, about 2 A</td><td>Any voltage, mixed loads</td><td>Slow (10 ms), wears out</td><td>Lamps, small contactors, mixed voltages</td></tr>
<tr><td><b>Transistor PNP</b></td><td>+24 V DC, 0.5 A</td><td>Fast, no wear</td><td>DC only, dies from a coil spike</td><td>Valves, lamps, pulses. The standard in Europe</td></tr>
<tr><td><b>Transistor NPN</b></td><td>0 V (24 V DC), 0.5 A</td><td>Fast, no wear</td><td>The load must go to +24 V</td><td>Asian machines, drive inputs</td></tr>
<tr><td><b>Triac</b></td><td>AC only, 0.5 A</td><td>No wear</td><td>Leaks a little when off</td><td>AC valves and AC lamps that switch often</td></tr>
</table></div>
<p>The other end of the load: a <b>PNP</b> output gives +24 V, so the load goes to <b>0 V</b>. An <b>NPN</b> output gives 0 V, so the load goes to <b>+24 V</b>. If the LED on the card is on but the load is dead, check this first.</p>

<h3>Three protections you must know</h3>
<ul>
<li><b>Flyback diode</b> across every DC coil (valve, relay, contactor). A coil makes a voltage spike of hundreds of volts when it is switched off. The diode gives that current a safe way round. Without it the transistor dies, today or in a month.</li>
<li><b>Interposing relay or contactor</b> when the load needs more current or another voltage than the card can switch. The PLC switches only the small coil. The contact switches the heater or the motor from its own supply and fuse.</li>
<li><b>A fuse for each group</b> of outputs, and the commons wired as the drawing says. A missing common is the most frequent wiring fault on a new panel.</li>
</ul>

<h3>Fault finding with a multimeter</h3>
<ol>
<li><b>Input does not come on:</b> measure between the input terminal and the common. PNP sensor on: 24 V. If it is 0 V, go back to the sensor: supply (brown to blue = 24 V?), then the signal wire.</li>
<li><b>Output LED on, load dead:</b> measure across the load. 24 V across it and it does nothing: the load is broken. 0 V across it: a wire, the fuse, or the wrong return (0 V / +24 V).</li>
<li><b>Input never goes off:</b> a 2-wire sensor without a bleeder, or a triac output wired to an input.</li>
</ol>
<div class="callout where"><b>Where:</b> every panel. The electrician wires it, but the programmer is the one called when "the PLC does not see the sensor". The I/O check in <a href="#lesson-commissioning">Commissioning</a> finds these faults one by one.</div>`,
      sims: {},
      takeaways: ["Current needs a closed loop from +24 V back to 0 V.", "One gives, one takes: a PNP sensor needs a sinking input, an NPN sensor a sourcing input.", "PNP output: load to 0 V. NPN output: load to +24 V.", "A flyback diode across every DC coil.", "Big or AC loads: the PLC switches a relay, the relay switches the load."],
      mistakes: ["An NPN sensor on a sinking card: the sensor LED is on, the input stays off.", "A valve coil on a transistor output without a diode.", "230 V AC on a transistor output.", "A 10 A heater directly on a 2 A relay output: the contact welds.", "A relay output for fast pulses."],
      challenges: ["cio-1", "diag-stop", "diag-el-ol"],
    },
    {
      id: 'analog', level: 4, title: 'Analog signals & scaling (4–20 mA)', min: 11,
      summary: 'Levels, pressures and temperatures arrive as numbers. Turn raw counts into engineering units.',
      body: `
<h3>What it is</h3>
<p>A switch is on or off. A <b>transmitter</b> measures a quantity (level, pressure, temperature, flow) and sends a continuous signal, most often <b>4–20 mA</b> (sometimes 0–10 V). The analog input card converts it to a number, the <b>raw value</b>. In Siemens S7-200 style: <code>AIW0</code> = 0…32000 for 0…20 mA, so <b>4 mA = 6400</b> and <b>20 mA = 32000</b>.</p>
<h3>Why 4 mA and not 0?</h3>
<p>The "live zero". A healthy transmitter at 0 % still sends 4 mA. If a wire breaks, the current drops to <b>0 mA</b>, which is clearly below 4 mA. The PLC can tell "0 % level" apart from "broken cable" and raise a fault instead of trusting a false reading. Fail-safe again.</p>
<h3>Scaling</h3>
<p>Convert counts to engineering units with a straight line:</p>
<pre class="code">value = (raw − raw_min) × (span) ÷ (raw_max − raw_min) + eng_min
level % = (AIW0 − 6400) × 100 ÷ 25600
        = (AIW0 − 6400) ÷ 256          ← integer-friendly</pre>
<p>Integer math in 16-bit words overflows above 32767, so <code>× 100</code> first would break (25600 × 100). Dividing by 256 avoids it. Real projects use 32-bit integers or REAL (floating point) maths, or a ready-made scaling block (SCALE_X/NORM_X in TIA Portal, LIN_TRAFO in CODESYS, SCP in Allen-Bradley).</p>
[[sim:scale]]
<h3>Analog outputs</h3>
<p>Analog outputs work the other way round: write 0…32000 to <code>AQW0</code> and the card drives 0…20 mA (or 4…20 mA) to a <b>control valve</b> positioner or a VFD speed reference.</p>
<h3>Alarms on analog values</h3>
<ul>
<li>High / low alarms with compare instructions (<code>MW0 ≥ 90</code>).</li>
<li>Add a <b>deadband</b> or delay timer so a value hovering at 90.0 % doesn't make the alarm flicker.</li>
<li>Out-of-range raw values (below about 3.6 mA) mean a sensor fault, not a reading.</li>
</ul>
<div class="callout where"><b>Where:</b> tank levels, line pressure, oven temperature, flow totals, motor speed references. Practically every process plant.</div>`,
      sims: { scale: { program: 'RUNG Remove the 4 mA live zero\nNO(SM0.0) SUB(AIW0,6400,MW0)\nRUNG 256 counts per percent\nNO(SM0.0) DIV(MW0,256,MW0)\nRUNG High alarm ≥ 90 %\nCMP(MW0>=90) COIL(Q0.0)\nRUNG Wire break: below 4 mA\nCMP(AIW0<6000) COIL(Q0.1)', inputs: { 'AIW0': { name: 'Level transmitter', kind: 'ana', min: 0, max: 32000, value: 19200 } }, plant: 'atank', outputs: { 'Q0.0': 'High alarm', 'Q0.1': 'Sensor fault' }, note: 'Drag the slider: 19200 = 12 mA = 50 %. Slide below 4 mA to see the wire-break fault.' } },
      takeaways: ['4–20 mA → 6400…32000 counts; 4 mA = 0 %.', 'Scale with (raw − 6400) ÷ 256 for percent.', 'Below 4 mA means a sensor or wire fault.'],
      mistakes: ['Multiplying before dividing and overflowing 16 bits.', 'Treating 0 mA as "empty" instead of "broken".'],
      challenges: ['analog-scale', 'st-greenhouse'],
    },

    // ═══════════════════════ LEVEL 5 ═══════════════════════
    {
      id: 'control-loops', level: 5, title: 'Closed-loop control: on/off, P, PI, PID', min: 12,
      summary: 'Measure, compare with a setpoint, correct, continuously. The idea behind every PID block.',
      body: `
<h3>Open loop vs closed loop</h3>
<p><b>Open loop:</b> "open the valve 40 %" and hope. <b>Closed loop:</b> measure the result (the <b>process value</b>, PV), compare it with the target (<b>setpoint</b>, SP), and correct the output (<b>controller output</b>, CV) all the time. The difference SP − PV is the <b>error</b>.</p>
<h3>1. On/off (two-point) control</h3>
<p>Pump on below LOW, off above HIGH: the tank project from level 5. Simple and robust, but the value swings between the two limits. The gap between them, the <b>hysteresis</b>, stops the pump from short-cycling.</p>
<h3>2. Proportional (P)</h3>
<p><code>output = Kp × error</code>. A bigger error opens the valve more. Smooth, but it always leaves a small <b>offset</b>: some error is needed to keep the valve open against the outflow. In the analog-tank project with Kp = 10, the level settles near 46 % instead of 50 %. More demand gives more offset; a higher Kp gives less offset but more risk of oscillation.</p>
<h3>3. Integral (I): removes the offset</h3>
<p>The I part adds up the error over time: <code>output += error × Kp × dt ÷ Ti</code>. As long as any error remains, the output keeps creeping until the error is zero. PI is the workhorse for levels, flows, pressures and temperatures.</p>
<h3>4. Derivative (D): damping</h3>
<p>The D part reacts to how fast the error changes, braking overshoot. It is useful for slow, heavy processes such as temperatures, and usually left off for noisy signals like flow.</p>
<h3>In real PLCs</h3>
<div class="tbl"><table>
<tr><th>Platform</th><th>PID block</th></tr>
<tr><td>Siemens S7-200 / 1200 / 1500</td><td>PID wizard / PID_Compact</td></tr>
<tr><td>CODESYS</td><td>PID (Util library), PID_FIXCYCLE</td></tr>
<tr><td>Allen-Bradley</td><td>PID, PIDE</td></tr>
</table></div>
<p>You give it SP, PV and tuning (Kp, Ti, Td), and it writes the output. It runs at a fixed cycle (cyclic interrupt), not at a random scan time.</p>
<h3>Tuning in one paragraph</h3>
<p>Start with P only and raise Kp until the value starts to oscillate, then halve it. Add I (start with a long Ti) and shorten Ti until the offset disappears quickly without big overshoot. Add D only if needed. Always clamp the output to 0…100 % and stop the integral from winding up while clamped (<b>anti-windup</b>).</p>
<div class="callout tip">Build the P controller in project <b>"Analog level control"</b> and watch the trend: the level settles below the dashed setpoint. That gap is exactly what the I term would remove.</div>`,
      sims: {},
      takeaways: ['Error = SP − PV.', 'P leaves an offset, I removes it, D damps.', 'Clamp the output and use anti-windup.'],
      mistakes: ['Expecting a P controller to reach the setpoint exactly.', 'Running PID in the normal scan with a changing cycle time.'],
      challenges: ['level-control', 'tank', 'st-greenhouse'],
    },
    {
      id: 'analog-practice', level: 5, title: 'Analog sensors in practice: temperature, weight, knobs & drives', min: 14,
      summary: 'Different sensors deliver their values differently. How to scale them without overflow, keep noisy values calm, catch sensor faults and drive analog outputs.',
      body: `
<h3>Not every analog value looks the same</h3>
<div class="tbl"><table>
<tr><th>Signal</th><th>What the PLC reads</th><th>Example in the Lab</th></tr>
<tr><td>4–20 mA transmitter (level, pressure, flow)</td><td>raw counts, e.g. 0 … 27648 (S7-1200) or 6400 … 32000 (S7-200 style)</td><td>analog tank AIW0</td></tr>
<tr><td>0–10 V (potentiometer, drive feedback)</td><td>0 … 27648</td><td>setpoint knob AIW6</td></tr>
<tr><td>PT100 / thermocouple on a temperature module</td><td>temperature directly, in 0.1 °C</td><td>furnace AIW4</td></tr>
<tr><td>Load cell on a weighing module</td><td>weight directly (here 10 g units), gross</td><td>scale AIW8</td></tr>
<tr><td>Analog output to a drive / valve</td><td>you write 0 … 27648 = 0 … 100 %</td><td>blower AQW4, tank valve AQW0</td></tr>
</table></div>
<p>First question for every analog signal: <b>what does the raw number mean?</b> The module manual tells you.</p>
<h3>Scaling without overflow</h3>
<p>Straight line: <code>value = raw × (max − min) / raw_span + min</code>. With 16-bit words the trap is the multiplication: 27648 × 300 is far above 32767 and the result is garbage. Divide first (27648 / 300 ≈ 92), or use 32-bit / REAL maths (<b>NORM_X + SCALE_X</b> in TIA Portal, <b>SCP</b> in Rockwell, REAL in CODESYS ST).</p>
<h3>Noisy values: hysteresis, settling, filtering</h3>
<ul>
<li><b>Hysteresis</b>: switch on and off at two different values, so noise around one value cannot make the output chatter (thermostat 195 / 205 °C).</li>
<li><b>Settling time</b>: judge a value only when it is calm (a scale after the gate has closed).</li>
<li><b>Filtering</b>: average several readings (the ST moving-average project).</li>
</ul>
<h3>Sensor faults: fail safe</h3>
<p>A broken wire or a short circuit gives an impossible value (Siemens: 32767 and −32768; 4–20 mA: below 3.6 mA). Check the <b>raw</b> value and treat it as a fault. Think about which way it fails: a shorted temperature sensor looks <b>cold</b>, so a program that does not check it heats forever. Important limits get an <b>independent</b> shutdown (safety trip / temperature limiter), because the normal output can fail too (a welded contactor).</p>
<h3>Weighing words</h3>
<ul>
<li><b>Gross</b> = everything on the scale, <b>tare</b> = the empty container, <b>net</b> = gross − tare.</li>
<li><b>Coarse / fine</b>: fill fast, finish slowly for accuracy.</li>
<li><b>In-flight (preact)</b>: material still falling when the gate closes. Close early by that amount, and let the controller <b>learn</b> it from the error of each fill.</li>
</ul>
<h3>Analog outputs</h3>
<p>Speed references for drives, valve positions, heater power. Calculate the value in a word, <b>clamp</b> it to 0 … 27648, and write it to the output every scan. A straight line between two points (here 20 % at 50 °C, 100 % at 150 °C) covers most jobs.</p>
<div class="callout where"><b>Where:</b> furnaces and ovens, kilns, plastic machines (zone temperatures), filling and bagging lines, batching plants, dosing pumps, HVAC fans and pumps on drives.</div>`,
      sims: {},
      takeaways: ['Know what the raw value means: counts, 0.1 °C, 10 g …', 'Scale without overflow: divide first or use 32-bit / REAL.', 'Hysteresis and settling time tame noisy values.', 'Check impossible raw values for wire break / short; fail safe; add an independent trip.', 'Net = gross − tare; coarse/fine; learn the in-flight amount.', 'Analog outputs: calculate, clamp, write every scan.'],
      mistakes: ['Multiplying a raw value before dividing (overflow).', 'Using one switching point on a noisy value (chatter).', 'Trusting the sensor: a short circuit can look like "cold" or "empty".', 'Judging a weight while material is still falling.'],
      challenges: ['furn-1', 'furn-2', 'furn-3', 'furn-4', 'weigh-1', 'weigh-2', 'analog-scale', 'level-control'],
    },
    {
      id: 'video-circuit', level: 5, title: 'Your video, decoded: 3-cylinder sequence', min: 12,
      summary: 'The circuit from the short you shared, rebuilt rung by rung, plus what it doesn\'t tell you.',
      body: `
<p>This is the ladder from the "3 Cylinder Sequential" video, rebuilt on PLC Start's cylinder machine. Their names map to ours like this:</p>
<div class="tbl"><table>
<tr><th>Video</th><th>Here</th><th>Meaning</th></tr>
<tr><td>Stop I0.0, Start I0.1</td><td>STOP I0.1 (NC), START I0.0</td><td>Operator buttons</td></tr>
<tr><td>Sensor 1 / 2 / 3</td><td>A1 I0.3, B1 I0.5, C1 I0.7</td><td>Cylinder fully out</td></tr>
<tr><td>Sensor 4</td><td>C0 I0.6</td><td>Cylinder C back home</td></tr>
<tr><td>Solenoid valve 1/2/3</td><td>Y1/Y2/Y3 Q0.0–Q0.2</td><td>Extend A / B / C</td></tr>
<tr><td>M0.1, M0.2, M0.3</td><td>same</td><td>Running, retract-all, retract-done</td></tr>
</table></div>
<h3>Rung by rung</h3>
<ol>
<li><b>Running latch:</b> Stop · (Start ∥ M0.1) → M0.1. The seal-in from level 2.</li>
<li><b>Valve 1:</b> M0.1 · NOT M0.2 → Y1. A extends as soon as the system runs.</li>
<li><b>Valve 2:</b> Sensor 1 · M0.1 · NOT M0.2 → Y2. B waits until A is fully out.</li>
<li><b>Valve 3:</b> Sensor 2 · M0.1 · NOT M0.2 → Y3. C waits for B.</li>
<li><b>Retract all:</b> (Sensor 3 · M0.1 ∥ M0.2) · NOT M0.3 → M0.2. When C is out, M0.2 latches and its NC contacts in rungs 2–4 drop all three valves, so everything retracts together.</li>
<li><b>Retract done:</b> Sensor 4 · M0.2 → M0.3. When C is home, M0.3 breaks the M0.2 latch, and because M0.1 is still on, A extends again: <b>the cycle repeats forever</b>.</li>
</ol>
<p><b>Open it in the simulator</b>, press START and watch the power flow:</p>
<div class="open-row" data-open="video"></div>
<h3>What a pro would add</h3>
<ul>
<li><b>Home check:</b> START should only work with all cylinders retracted. As written, it starts from any position.</li>
<li><b>Cycle stop:</b> STOP drops M0.1 in the middle of a stroke. Often you want "finish the cycle, then stop" plus a separate emergency stop.</li>
<li><b>Timeouts:</b> if A never reaches Sensor 1, the machine silently waits forever.</li>
<li><b>Only sensor 4 confirms the retract:</b> A and B are assumed home. A stuck B could crash into the next cycle.</li>
<li><b>Step logic is implicit</b>, hidden in sensor states. For longer sequences, a step-number state machine (next lesson) is far easier to extend and debug.</li>
</ul>
<div class="callout tip">Try challenge <b>"Cylinder sequence A+ B+ C+ C− B− A−"</b>: a version that checks home positions and retracts in reverse order.</div>`,
      sims: {},
      takeaways: ['Sequences step forward on sensor confirmation.', 'Memory bits hold "which phase are we in".', 'Always add home checks, stop behaviour and timeouts.'],
      mistakes: ['Assuming a cylinder arrived because time passed.'],
      challenges: ['cylinders-abc', 'cyl-parallel', 'st-case-abc'],
    },
    {
      id: 'state-machine', level: 5, title: 'State machines with a step number', min: 12,
      summary: 'One word holds the current step. Transitions move it; outputs are decoded from it.',
      body: `
<h3>The idea</h3>
<p>Keep the current step in one word, <b>MW0</b>. Exactly one step is active at a time. Two kinds of rungs:</p>
<ul>
<li><b>Transitions:</b> <code>CMP(MW0 == 2) AND B_out → MOV 3 → MW0</code>. "In step 2, when B is out, go to step 3."</li>
<li><b>Actions:</b> <code>CMP(MW0 == 1) OR CMP(MW0 == 2) → Y1</code>. "Valve A is on in steps 1 and 2."</li>
</ul>
[[sim:sm]]
<h3>Why pros prefer it</h3>
<ul>
<li><b>Debugging:</b> "the machine is stuck in step 7" tells you exactly what it's waiting for.</li>
<li><b>Extending:</b> inserting a step is adding rungs, not untangling latches.</li>
<li><b>Safety:</b> only one step can be active, so there are no overlapping latches.</li>
<li><b>HMI:</b> show the step number and a text per step to the operator.</li>
<li>It maps 1:1 to <b>SFC</b> (Sequential Function Chart) and to a <code>CASE</code> statement in Structured Text.</li>
</ul>
<pre class="code">CASE Step OF
  0: IF Start AND A_home AND B_home THEN Step := 1; END_IF
  1: Y1 := TRUE;  IF A_out THEN Step := 2; END_IF
  2: Y2 := TRUE;  IF B_out THEN Step := 3; END_IF
  …
END_CASE</pre>
<div class="callout tip"><b>Number steps by 10</b> (0, 10, 20, 30 …) in real projects. Then you can insert step 15 later without renumbering everything.</div>`,
      sims: { sm: { program: 'RUNG 0 → 1 on start\nCMP(MW0==0) P(I0.0) MOV(1,MW0)\nRUNG 1 → 2 after 2 s\nCMP(MW0==1) NO(T0) MOV(2,MW0)\nRUNG 2 → 0 after 2 s\nCMP(MW0==2) NO(T1) MOV(0,MW0)\nRUNG Step 1 timer\nCMP(MW0==1) TON(T0,2s)\nRUNG Step 2 timer\nCMP(MW0==2) TON(T1,2s)\nRUNG Lamp A in step 1\nCMP(MW0==1) COIL(Q0.0)\nRUNG Lamp B in step 2\nCMP(MW0==2) COIL(Q0.1)', inputs: { 'I0.0': pb('START') }, outputs: { 'Q0.0': 'Step 1', 'Q0.1': 'Step 2' }, note: 'Watch MW0 in the values panel: 0 → 1 → 2 → 0.' } },
      takeaways: ['One step word, transition rungs (CMP + MOV), action rungs (CMP → coil).', 'Same structure as SFC and a CASE statement.'],
      mistakes: ['Driving outputs inside transition rungs.', 'Several transitions out of one step without priority.'],
      challenges: ['cyl-once', 'cyl-repeat', 'step-machine', 'cyl-cycle-stop', 'cyl-dwell', 'cyl-parallel', 'drill-station', 'oven', 'cyl-abba-c'],
    },
    {
      id: 'seq-tools', level: 5, title: 'Sequence toolkit: valves, sensors elsewhere, branches & recovery', min: 14,
      summary: 'The techniques that turn "A+ B+ A− B−" into a real handling machine: which valve does what, moving until a sensor somewhere else, waiting, branching, remembering, and getting out of trouble.',
      body: `
<h3>1. Know your valve: it changes the program</h3>
<div class="tbl"><table>
<tr><th>Valve</th><th>Output pattern</th><th>On power loss</th><th>Used for</th></tr>
<tr><td><b>5/2 monostable</b> (one coil + spring)</td><td>Coil ON for as long as the cylinder must be out</td><td>Goes back to its rest position</td><td>Ejectors, clamps, stoppers: "out only while commanded"</td></tr>
<tr><td><b>5/2 bistable</b> (two coils, "memory valve")</td><td>A short pulse on the DOWN coil, later a pulse on the UP coil. <b>Never both together.</b></td><td>Stays where it was</td><td>Lifts and grippers that must not move by themselves</td></tr>
<tr><td><b>5/3 closed centre</b> (two coils + centring springs)</td><td>LEFT coil or RIGHT coil; <b>both off = stop and hold</b> anywhere</td><td>Stops where it is</td><td>Axes that stop at several stations, positioned by sensors</td></tr>
<tr><td><b>Vacuum generator + vacuum switch</b></td><td>Vacuum ON from gripping until the part is set down</td><td>Part may fall</td><td>Suction grippers. The vacuum switch proves the part is really held</td></tr>
</table></div>
<p>With a bistable valve the decoded output can be a single step: the coil only has to be on while the movement starts. With a monostable valve the coil must stay on through every step in which the cylinder has to stay out, so you decode a <b>range</b> of steps.</p>
<h3>2. "Move until a sensor at another place"</h3>
<p>A transition does not have to use the sensor of the cylinder that moves. It can use <b>any</b> signal on the machine: a station sensor along an axis, a photo-eye on a conveyor, a "part present" sensor, a vacuum switch, another station's ready bit.</p>
<pre class="code">Step 6: X right             → leaves when "X at conveyor" (I1.2)
Step 7: (no output) wait    → leaves when "place free" (I1.6), a photo-eye on another machine
Output: X right = step 6 AND NOT at conveyor   ← stop on the sensor itself</pre>
<p>Putting <b>NC(target sensor)</b> into the output rung makes the axis stop in the same scan in which it arrives, even if the step waits longer (step mode, interlocks).</p>
<h3>3. Waiting is a step too</h3>
<p>"Wait until the conveyor is free", "wait for the press to be up", "wait for the operator": these are steps <b>with no output</b>. They make the machine predictable: it is always in exactly one step, and the step number tells you what it is waiting for.</p>
<h3>4. Branches: different parts, different sequences</h3>
<p>A step can have <b>two exit rungs</b> with opposite conditions:</p>
<pre class="code">CMP(MW0==5) NO(Z up) NO(metal)  MOV(6,MW0)    → to the conveyor block 6…11
CMP(MW0==5) NO(Z up) NC(metal)  MOV(20,MW0)   → to the chute block 20…23, which ends in 11</pre>
<p>Give each branch its own range of step numbers and join them again at a common step. A loop is a branch back to an earlier step: "2 → 1 while fewer than 3 strokes, 2 → 3 when done".</p>
<h3>5. Remember what you measured (tracking)</h3>
<p>Many sensors only see a part at one place. The metal sensor sees the part at the pickup, not in the gripper. Store the result in a bit or word <b>while the part is there</b> and use the stored value later. Conveyor lines do the same with shift registers.</p>
<h3>6. Interlocks in the transitions, not in timing</h3>
<p>"Move X only when Z is up" belongs in the transition into the move step (wait for the Z-up sensor), never in a guess like "Z needs 0.6 s". Sensors keep working when the air pressure drops; timings don't.</p>
<h3>7. When it goes wrong: watchdog, alarm, homing</h3>
<ul>
<li><b>Watchdog:</b> one timer restarts at every step change and runs while a movement is expected. If it expires, go to an alarm step and store <b>which step</b> got stuck. That number is gold for the maintenance team.</li>
<li><b>Alarm step:</b> movements off, automatic off, red lamp, but <b>do not drop or release a part</b> (keep the vacuum or the clamp).</li>
<li><b>Homing:</b> RESET brings the machine to its start position <b>in a safe order</b>: first the movement that removes collision risk (gripper up), then the axes. A part still held is put back first.</li>
<li><b>Step mode</b> (commissioning): each START press advances one step. Gate the step update, keep the outputs of the current step, and switch the watchdog off.</li>
<li><b>Cycle stop vs. stop:</b> a cycle stop finishes the part and stops at home. An emergency stop is a hard-wired safety function that does not wait for anything.</li>
</ul>
<div class="callout where"><b>Where:</b> pick &amp; place units, palletising grippers, assembly cells, press feeders, labelling machines, test benches: every handling machine is built from these few patterns.</div>`,
      sims: {},
      takeaways: ['Monostable: hold the coil. Bistable: pulse one coil, never both. 5/3: both off = stop where it is.', 'A transition can use any sensor on the machine, not only the moving cylinder\'s own.', 'Waiting is a step with no outputs.', 'Branch = two exit rungs with opposite conditions; give each branch its own step range.', 'Remember measurements while the part is at the sensor.', 'Watchdog per step, alarm keeps the part, homing in a safe order.'],
      mistakes: ['Switching both coils of a bistable or 5/3 valve on together.', 'Moving an axis on a timer instead of waiting for "gripper up".', 'Reading the metal sensor after the part has left it.', 'Switching the vacuum off before the part is down.', 'Letting a step-mode wait run the axis past its sensor.'],
      challenges: ['cyl-once', 'cyl-repeat', 'pp-feed', 'pp-axis', 'pp-pick', 'pp-cycle', 'bug-pp-crash', 'pp-sort', 'pp-auto', 'pp-home', 'pp-station'],
    },
    {
      id: 'hydraulics', level: 5, title: "Hydraulics: how it differs from pneumatics", min: 13,
      summary: "Oil instead of air: the power unit the PLC must run (unloaded start, oil level, temperature, filter), 4/3 closed-centre valves that hold a load, pressing on pressure, dwell and decompression, and why a valve left on at the end stop heats the oil.",
      body: `
<h3>Air or oil: what changes for the PLC?</h3>
<p>Both move cylinders with valves and solenoids, so the ladder looks similar. But oil does not compress, works at 100–300 bar instead of 6 bar, and the machine has its <b>own pump</b>. That changes the program in several places.</p>
<div class="tbl"><table>
<tr><th></th><th>Pneumatics</th><th>Hydraulics</th></tr>
<tr><td>Medium, pressure</td><td>air, about 6 bar</td><td>oil, 100–300 bar: up to 50 × more force from the same size</td></tr>
<tr><td>Energy source</td><td>the factory air network (compressor somewhere else)</td><td>its own <b>power unit</b> (HPU): tank, pump motor, relief valve, filter, cooler. <b>The PLC runs it.</b></td></tr>
<tr><td>Typical valve</td><td>5/2 (spring or bistable)</td><td>4/3 <b>spring-centred</b>, two solenoids: Y1 one way, Y2 the other, <b>both off = stop</b></td></tr>
<tr><td>Stop in the middle</td><td>poor: air is a spring</td><td>yes: a closed centre stops the ram (it still creeps slowly); a pilot-operated check valve <b>holds the load</b></td></tr>
<tr><td>Valve on at the end stop</td><td>harmless, often kept on</td><td>oil goes over the relief valve at full pressure: <b>heat, wasted energy</b>. Switch off, or unload the pump.</td></tr>
<tr><td>End of a pressing move</td><td>position sensor</td><td>often <b>pressure</b> (pressure switch or transducer): force, not position</td></tr>
<tr><td>Speed</td><td>fast, hard to control</td><td>slower, controlled: two speeds (fast approach / slow press) or a proportional valve with an analog output</td></tr>
<tr><td>Switching to the other direction</td><td>just switch</td><td>after high pressure: <b>decompress</b> first (valve centred a moment), or a pressure shock (bang)</td></tr>
<tr><td>Leaks</td><td>noise, cost</td><td>oil on the floor, fire risk: <b>level switch</b> stops the pump</td></tr>
<tr><td>Monitoring</td><td>pressure switch on the air supply</td><td>oil level, oil temperature, filter clogged, motor overload, pressure</td></tr>
</table></div>
<h3>The circuit of the press in the Lab</h3>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 560 300" width="560" style="max-width:100%;height:auto" role="img" aria-label="Hydraulic circuit of the press"><g fill="none" stroke="currentColor" stroke-width="1.6" font-family="IBM Plex Sans, sans-serif" font-size="11">
<rect x="20" y="240" width="150" height="40"/><text x="95" y="265" text-anchor="middle" stroke="none" fill="currentColor">oil tank (+ level, temperature)</text>
<circle cx="60" cy="190" r="18"/><path d="M60 172 l-8 14 h16 z" fill="currentColor"/><text x="60" y="160" text-anchor="middle" stroke="none" fill="currentColor">pump + motor (Q0.0)</text>
<path d="M60 208 V240"/><path d="M60 172 V120 H330"/>
<rect x="110" y="135" width="40" height="30"/><path d="M118 158 l24 -16"/><path d="M130 120 V135"/><path d="M130 165 V240"/><text x="130" y="185" text-anchor="middle" stroke="none" fill="currentColor" font-size="10">relief 200 bar</text>
<rect x="190" y="135" width="40" height="30"/><path d="M200 150 h20"/><path d="M210 120 V135"/><path d="M210 165 V240"/><text x="210" y="185" text-anchor="middle" stroke="none" fill="currentColor" font-size="10">Y0 unloading</text>
<rect x="280" y="80" width="40" height="30"/><rect x="320" y="80" width="40" height="30"/><rect x="360" y="80" width="40" height="30"/>
<path d="M290 110 l20 -30 M310 110 l-20 -30" stroke-width="1"/><path d="M332 95 h16 M340 88 v14" stroke-width="1"/><path d="M370 110 v-30 M390 110 v-30" stroke-width="1"/>
<text x="300" y="72" text-anchor="middle" stroke="none" fill="currentColor" font-size="10">Y2 up</text><text x="340" y="72" text-anchor="middle" stroke="none" fill="currentColor" font-size="10">centre: closed</text><text x="380" y="72" text-anchor="middle" stroke="none" fill="currentColor" font-size="10">Y1 down</text>
<path d="M330 120 V110"/><path d="M350 110 V240 H170"/>
<path d="M330 80 V40 H470"/><path d="M350 80 V60 H470" />
<rect x="470" y="25" width="70" height="60"/><path d="M490 25 V85" stroke-width="3"/><path d="M490 55 H560"/>
<text x="505" y="105" text-anchor="middle" stroke="none" fill="currentColor">cylinder</text>
<text x="420" y="140" stroke="none" fill="currentColor" font-size="10">pressure switch 150 bar</text><circle cx="460" cy="40" r="4" fill="currentColor"/>
</g></svg></div>
<h3>The power unit, step by step</h3>
<ul>
<li><b>Start unloaded.</b> A motor that starts against full pressure draws a huge current and trips. Keep the unloading valve Y0 off at the start, and allow pressure after about 2 s. With a star-delta starter, keep it off until the changeover to delta is done.</li>
<li><b>Unload when idle.</b> With a fixed pump and a closed-centre valve, oil that is not used goes over the relief valve: all the motor power becomes heat. Switch Y0 on only while a valve moves the cylinder (or use a pressure-compensated pump).</li>
<li><b>Oil level</b>: stop the pump at once when it is low; a pump sucking air is destroyed in seconds.</li>
<li><b>Oil temperature</b>: cooler on at about 45 °C, off at 40 °C (hysteresis); stop the machine above about 60–70 °C. In winter, some units heat the oil before starting.</li>
<li><b>Filter clogged</b>: a warning for maintenance, not a stop.</li>
</ul>
<h3>The press cycle</h3>
<p>Fast approach → slow-down point → press until the pressure switch → <b>dwell</b> (hold the force) → <b>decompression</b> (valve centred 0.2–0.5 s) → up → everything off and the pump unloaded. Pump STOP or a fault: the valve centres and the ram stops (a pilot-operated check valve holds it there). Never Y1 and Y2 together.</p>
<p>A press is a dangerous machine: the closing stroke needs a <b>two-hand control</b> (both buttons within 0.5 s, held during the stroke) or a light curtain, built with safety hardware. Accumulators keep pressure after the pump stops: they must be discharged before maintenance.</p>
<h3>Accumulators</h3>
<p>An <b>accumulator</b> is a steel bottle with a gas bladder that stores oil under pressure. A small pump charges it between two pressures (for example <b>140 → 160 bar</b>) and then runs unloaded; the accumulator supplies short, big flows (clamps, brakes, emergency movements). Because it keeps its pressure when the pump stops, a <b>dump valve</b> empties it at STOP or on a fault: never open a hydraulic pipe before the pressure gauge reads 0.</p>
<h3>Questions you will hear in an interview</h3>
<p>Practise more in <a href="#quiz-iv">Quiz → Interview questions</a>.</p>
<div class="tbl"><table>
<tr><th>Question</th><th>A good short answer</th></tr>
<tr><td>What is the difference between pneumatics and hydraulics for the PLC?</td><td>Hydraulics has its own power unit the PLC runs (unloaded start, oil level, temperature, filter); 4/3 closed-centre valves hold the load; valves must not stay on at the end stop; pressing ends on pressure; decompression before reversing.</td></tr>
<tr><td>Why is the pump started unloaded?</td><td>The motor would start against full pressure and trip, or need a much bigger motor. Load it after 1–3 s (or after star-delta changeover).</td></tr>
<tr><td>How do you make sure Y1 and Y2 are never on together?</td><td>Interlock in the program (NC of the other direction in each rung, or one step = one output) and, on many machines, also in the wiring.</td></tr>
<tr><td>Why use a pressure switch or transducer on a press?</td><td>The press must stop on force, not on position: the part height varies. A transducer also lets you set the force from the HMI and see a worn pump.</td></tr>
<tr><td>Why hysteresis on accumulator charging or the oil cooler?</td><td>With one set-point the valve or fan switches on and off every scan or second (chatter): it wears out.</td></tr>
<tr><td>The oil gets hot. What do you check in the program?</td><td>Pump loaded while nothing moves, a valve left on at an end stop, the cooler control; then the relief valve setting and the cooler itself.</td></tr>
<tr><td>What must happen when the pump stops in the middle of a stroke?</td><td>All valves centre, the load holds, the sequence stops; the restart goes to a safe position first (usually up).</td></tr>
<tr><td>How is a hydraulic press made safe?</td><td>Two-hand control (type III) or a light curtain with safety hardware, safety valves monitored by the safety PLC, the accumulator dumped at stop, and lock-out before maintenance.</td></tr>
</table></div>
<div class="callout where"><b>Where:</b> presses, injection moulding machines, press brakes, steel mills, mobile machines (excavators, cranes), lifting tables, test benches. Everything that needs a lot of force or must hold a load.</div>`,
      sims: {},
      takeaways: ["A hydraulic machine has its own power unit, and the PLC runs and monitors it.", "Start the pump unloaded; unload it whenever nothing moves.", "4/3 closed-centre valve: both solenoids off = stop and hold. Never both on.", "Pressing ends on pressure, then dwell, then decompress before going back."],
      mistakes: ["Programming it like pneumatics: valve left on at the end stop, so the oil heats.", "Starting the pump loaded: the motor trips.", "Switching straight from pressing to up: pressure shock.", "Fast speed into the part.", "Running the pump on a low oil level."],
      challenges: ['hyd-b1', 'hyd-b2', 'hyd-1', 'hyd-2', 'bug-hyd', 'hyd-3', 'hyd-acc', 'hyd-4'],
    },
    {
      id: 'commissioning', level: 4, title: "Commissioning: I/O check and the first run", min: 12,
      summary: "What happens between \"the wiring is finished\" and \"the machine produces\": the checks before power, the I/O check against the list, the safety test, analog loop checks, the dry run, and the program features that make it easier.",
      body: `
<h3>Never press AUTO first</h3>
<p>A new machine has new wiring, and new wiring has mistakes: swapped wires, an NC sensor where an NO was planned, a valve coil on the wrong output, a motor turning the wrong way. If the first thing you do is start the automatic cycle, the machine crashes into itself. Commissioning is done in a fixed order.</p>
<h3>The order</h3>
<ol>
<li><b>Power off:</b> look at the wiring, terminals tight, protective earth, the right fuses. Check 24 V is not shorted.</li>
<li><b>Power on, PLC in STOP:</b> 24 V present, the PLC and remote I/O and drives are online, no red LEDs.</li>
<li><b>Input check:</b> operate every sensor and button by hand and see the right input change in the PLC (the I/O table or a watch table). Tick it on the <b>I/O check sheet</b>.</li>
<li><b>Before anything moves:</b> test every E-stop and every guard switch, and see the power contactors drop out. Only then go on.</li>
<li><b>Output check:</b> with the air or oil pressure low and nobody in the machine, switch every output on by <b>forcing</b> it, one at a time, and see the right device react. Motors: <b>bump</b> them to check the direction, with the coupling or belt off if possible.</li>
<li><b>Analog loop check:</b> simulate 4 mA, 12 mA and 20 mA (a loop calibrator) and read 0 %, 50 %, 100 % in the PLC; check the wire-break value.</li>
<li><b>Safety validation:</b> every E-stop, door switch and light curtain again, now with the machine running: does it stop what it must? Write it down (it is part of the validation).</li>
<li><b>Manual mode:</b> every movement by hand, end positions, interlocks.</li>
<li><b>Dry run</b> in AUTO without product, then with product at low speed, then at full speed.</li>
<li><b>Sign-off:</b> FAT (factory acceptance test, at the builder) and SAT (site acceptance test, at the customer).</li>
</ol>
<h3>The I/O check sheet</h3>
<div class="tbl"><table>
<tr><th>Address</th><th>Tag</th><th>Device</th><th>How tested</th><th>OK</th></tr>
<tr><td>I0.3</td><td>A1</td><td>Reed switch, cylinder A out</td><td>Cylinder A out by hand: I0.3 = 1, back: 0</td><td>✓</td></tr>
<tr><td>I0.1</td><td>STOP</td><td>Push button, NC</td><td>Not pressed: 1, pressed: 0</td><td>✓</td></tr>
<tr><td>Q0.1</td><td>Y2</td><td>Valve B</td><td>Force Q0.1: cylinder B goes out</td><td>✓</td></tr>
<tr><td>AIW0</td><td>LT101</td><td>Level 4–20 mA</td><td>4 / 12 / 20 mA → 0 / 50 / 100 %</td><td>✓</td></tr>
</table></div>
<h3>Typical findings</h3>
<ul>
<li>Two sensor wires swapped: the program "sees" the wrong cylinder.</li>
<li>Two valve coils swapped: the wrong cylinder moves.</li>
<li>NPN sensor on a PNP input card (or the reverse): the input never comes on.</li>
<li>NC contact where NO was planned (or the reverse): the input is inverted.</li>
<li>Motor turns backwards: swap two phases (or the drive parameter).</li>
<li>4–20 mA wired as 0–20 mA in the configuration: an empty tank shows 20 %, a full tank still shows 100 %.</li>
</ul>
<h3>Write programs that help</h3>
<p>A good program finds wiring and sensor faults by itself, at commissioning and for years: <b>plausibility checks</b> (home and out sensor never together), <b>watchdogs</b> (the sensor must come within a time), analog <b>wire-break</b> detection, and a clear alarm text that names the device. Forcing is a commissioning tool: remove every force before production, and never force a safety signal.</p>
<div class="callout where"><b>Where:</b> every new machine, every rebuild, and every time a sensor, valve or cable is replaced: check that one I/O again.</div>`,
      sims: {},
      takeaways: ["Commission in a fixed order: power off checks, inputs, outputs, analog, safety, manual, dry run.", "Check every I/O once against the list and tick it off.", "Force outputs one at a time, with low pressure and nobody in the machine.", "Plausibility checks and watchdogs make the program find wiring faults."],
      mistakes: ["Starting AUTO before the I/O check.", "Leaving forces active after commissioning.", "Forcing or bridging a safety signal.", "Testing a motor direction with the load coupled."],
      challenges: ["cio-1", "cio-2", "cio-plaus"],
    },
    {
      id: 'loto-handover', level: 5, title: "Lock-out, and handing a project over", min: 10,
      summary: "The seven steps of lock-out / tag-out, why an E-stop or a forced output is not isolation, and what belongs in a handover: backups, as-built drawings, lists, passwords, test records, FAT and SAT, and a change log.",
      body: `
<h3>Before you touch a machine: lock-out, tag-out</h3>
<p>Most serious accidents with machines happen during repair, cleaning and fault finding, not during production. The rule that prevents them is <b>lock-out, tag-out (LOTO)</b>: switch the energy off at the source, put <b>your own padlock</b> on it, and keep the key in your pocket.</p>
<ol>
<li><b>Tell</b> the operators what you will do.</li>
<li><b>Stop</b> the machine in the normal way.</li>
<li><b>Isolate</b> every energy source: main switch, air supply valve, hydraulic pump, steam, water.</li>
<li><b>Lock and tag</b>: your padlock and your name on every isolator. Three people working means three padlocks.</li>
<li><b>Release stored energy</b>: vent the air, let hydraulic accumulators down, block or lower anything that can fall, wait until drive capacitors are empty (often 5 minutes).</li>
<li><b>Prove it is dead</b>: try to start the machine, and measure the voltage with a tester you have just checked.</li>
<li>Work. Then tools out, guards on, people out, <b>your own</b> padlock off.</li>
</ol>
<div class="callout tip"><b>An E-stop is not isolation.</b> Neither is "PLC in STOP", a forced output or a software interlock. They stop a machine. They do not make it safe to put your hands in. Only an isolator with a padlock does.</div>
<p>As a PLC person you will often be asked to "just hold that valve with a force so I can reach in". The answer is no: isolate, lock, then reach in.</p>

<h3>Work on a live panel</h3>
<p>Fault finding sometimes needs the power on. Then: only trained people, the right meter and probes, one hand where possible, no jewellery, know what is 24 V and what is 400 V before you open the door, and never bridge a safety contact.</p>

<h3>The end of a project: handover</h3>
<p>A machine is finished when someone else can run it and repair it without calling you. That needs a handover package:</p>
<div class="tbl"><table>
<tr><th>What</th><th>Why</th></tr>
<tr><td><b>Final program backup</b> of the PLC, the HMI and every drive, with a clear version name and date</td><td>After a CPU failure the machine is back in an hour, not a week</td></tr>
<tr><td><b>Comments and tag names</b> in the program, in the language the plant asked for</td><td>The next person reads it at 3 a.m. with the line down</td></tr>
<tr><td><b>As-built drawings</b>: every change made during commissioning drawn in</td><td>A drawing that is wrong is worse than no drawing</td></tr>
<tr><td><b>I/O list, alarm list, parameter list</b> (timers, limits, drive settings)</td><td>They answer most questions without opening the program</td></tr>
<tr><td><b>Passwords and licences</b>, handed over in a safe way</td><td>A locked PLC with a lost password is scrap</td></tr>
<tr><td><b>Test records</b>: I/O check, safety function tests, the customer's sign-off</td><td>Proof that it worked, and a start for the next fault finding</td></tr>
<tr><td><b>Training</b> for operators and maintenance</td><td>Most "faults" in the first month are questions</td></tr>
</table></div>

<h3>FAT and SAT</h3>
<p><b>FAT</b> (factory acceptance test): the customer tests the machine at the builder, before it ships. <b>SAT</b> (site acceptance test): the same again after installation in the plant. Both follow a written test list. Everything that fails goes on a <b>punch list</b> with a name and a date.</p>

<h3>Changes after handover</h3>
<ul>
<li>Go online and <b>compare</b> first: is the program in the PLC the same as your file?</li>
<li>Save a backup <b>before</b> the change, and one after it.</li>
<li>Write one line in a change log: date, name, what, why.</li>
<li>Remove every force and every test bridge before you leave.</li>
</ul>
<div class="callout where"><b>Where:</b> every plant, every day. In interviews: "What do you do before you put your hand into a machine?" and "What do you hand over at the end of a project?" Related: <a href="#lesson-commissioning">Commissioning</a> and <a href="#lesson-project-setup">going online</a>.</div>`,
      sims: {},
      takeaways: ["Isolate, lock with your own padlock, release stored energy, prove it is dead.", "An E-stop, PLC STOP or a force is not isolation.", "A project is finished when others can run and repair it without you.", "Backup of PLC, HMI and drives, with a version name.", "Compare online before a change, back up before and after, write it in the log."],
      mistakes: ["Reaching in with the machine only stopped by the E-stop.", "Forgetting air pressure, a raised load or the capacitors of a drive.", "Someone else's padlock taken off for them.", "Leaving with a force still active.", "Drawings never updated after commissioning."],
      challenges: ["cio-1"],
    },
    {
      id: 'drawings', level: 4, title: "Reading electrical drawings", min: 12,
      summary: "Find your way in a drawing set: pages and columns, the everyday symbols, device tags (-K1, -X2:5, -B3), wire numbers, cross-references from a coil to its contacts, the PLC input page, and how to find a fault with the drawing.",
      body: `
<h3>Why drawings matter</h3>
<p>The program says <i>what</i> the machine does; the electrical drawings say <i>where every wire goes</i>. When a sensor "does not work", you follow it on the drawing from the device to the terminal to the PLC input, and measure at each point. In interviews you are often handed a page and asked "where is this wired?".</p>
<h3>A drawing set, page by page</h3>
<ul>
<li><b>Cover and contents</b>: project, revision, list of pages.</li>
<li><b>Power</b>: supply, main switch, breakers, contactors, drives, motors.</li>
<li><b>Control</b>: 24 V supply, E-stop circuit, safety relay, contactor coils.</li>
<li><b>PLC</b>: one page per card, every input and output with its device.</li>
<li><b>Terminal plans</b>: every terminal strip (-X1, -X2…), what is connected inside and outside.</li>
<li><b>Cable plans</b>: every cable, its cores and where they go. <b>Parts list</b> at the end.</li>
</ul>
<p>Pages are divided into numbered <b>columns</b>; a place is written <b>page.column</b>, e.g. <b>4.3</b>.</p>
<h3>The symbols you meet every day</h3>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 640 320" width="640" style="max-width:100%;height:auto" role="img" aria-label="Common symbols in electrical drawings"><g fill="none" stroke="currentColor" stroke-width="1.8" font-family="IBM Plex Sans, sans-serif" font-size="12"><g transform="translate(40,20)"><path d="M40 15 V35 M40 55 V75 M40 55 L27 33"/></g><text x="80" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">NO contact</text><text x="80" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">closes</text><g transform="translate(140,20)"><path d="M40 15 V35 H53 M40 55 V75 M40 55 L55 31"/></g><text x="180" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">NC contact</text><text x="180" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">opens</text><g transform="translate(240,20)"><path d="M40 15 V35 M40 57 V75"/><rect x="24" y="35" width="32" height="22"/><text x="62" y="33" text-anchor="start" stroke="none" fill="currentColor" font-size="10" font-weight="500">A1</text><text x="62" y="70" text-anchor="start" stroke="none" fill="currentColor" font-size="10" font-weight="500">A2</text></g><text x="280" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Coil</text><text x="280" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-K relay</text><g transform="translate(340,20)"><path d="M40 15 V35 M40 55 V75 M40 55 L27 33"/><path d="M28 44 H10 M10 36 V52" stroke-dasharray="3 3"/></g><text x="380" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Button NO</text><text x="380" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-S start</text><g transform="translate(440,20)"><path d="M40 15 V35 H53 M40 55 V75 M40 55 L55 31"/><path d="M46 44 H70 M70 36 V52" stroke-dasharray="3 3"/></g><text x="480" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Button NC</text><text x="480" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-S stop</text><g transform="translate(540,20)"><path d="M40 15 V33 M40 61 V75"/><circle cx="40" cy="47" r="14"/><path d="M30 37 L50 57 M50 37 L30 57"/></g><text x="580" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Lamp</text><text x="580" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-H</text><g transform="translate(40,170)"><path d="M40 5 V25"/><circle cx="40" cy="47" r="22"/><text x="40" y="45" text-anchor="middle" stroke="none" fill="currentColor" font-size="16" font-weight="700">M</text><text x="40" y="61" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="500">3~</text></g><text x="80" y="282" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Motor</text><text x="80" y="298" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-M</text><g transform="translate(140,170)"><path d="M40 10 V75"/><rect x="31" y="27" width="18" height="32"/></g><text x="180" y="282" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Fuse</text><text x="180" y="298" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-F</text><g transform="translate(240,170)"><path d="M40 10 V30 M40 50 V75 M40 50 L27 28"/><path d="M34 25 L46 35 M46 25 L34 35"/><rect x="52" y="34" width="14" height="14"/><path d="M55 44 V38 H63 V44"/></g><text x="280" y="282" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Breaker</text><text x="280" y="298" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-Q</text><g transform="translate(340,170)"><path d="M40 10 V36 M40 50 V75"/><circle cx="40" cy="43" r="7"/><text x="56" y="47" text-anchor="start" stroke="none" fill="currentColor" font-size="11" font-weight="500">5</text></g><text x="380" y="282" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">Terminal</text><text x="380" y="298" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-X2:5</text><g transform="translate(440,170)"><rect x="22" y="22" width="36" height="40" rx="5"/><path d="M30 22 V8 M40 22 V8 M50 62 V76"/><text x="30" y="4" text-anchor="middle" stroke="none" fill="currentColor" font-size="9" font-weight="500">BN</text><text x="46" y="4" text-anchor="middle" stroke="none" fill="currentColor" font-size="9" font-weight="500">BK</text><text x="50" y="86" text-anchor="middle" stroke="none" fill="currentColor" font-size="9" font-weight="500">BU</text><text x="40" y="46" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="700">PNP</text></g><text x="480" y="282" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">PNP sensor</text><text x="480" y="298" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-B</text><g transform="translate(540,170)"><path d="M40 5 V25"/><rect x="14" y="25" width="52" height="40"/><text x="40" y="42" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">DI 0</text><text x="40" y="57" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="500">I0.0</text></g><text x="580" y="282" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">PLC input</text><text x="580" y="298" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-A1</text></g></svg></div>
<p>Everything is drawn <b>at rest</b>: machine off, no power, buttons not pressed. So an NC contact is drawn closed, even though it opens when you press the button.</p>
<h3>Device tags: what the letters mean</h3>
<div class="tbl"><table>
<tr><th>Letter</th><th>Device</th><th>Example</th></tr>
<tr><td>-A</td><td>PLC, card, module, drive unit</td><td>-A1 input card</td></tr>
<tr><td>-B</td><td>sensor (proximity, pressure, temperature)</td><td>-B1 part present</td></tr>
<tr><td>-F</td><td>protection: fuse, overload</td><td>-F3 fuse 24 V</td></tr>
<tr><td>-H</td><td>lamp, horn</td><td>-H1 running</td></tr>
<tr><td>-K</td><td>relay, contactor</td><td>-K1 motor contactor</td></tr>
<tr><td>-M</td><td>motor</td><td>-M1 conveyor</td></tr>
<tr><td>-Q</td><td>breaker, main switch, power contactor</td><td>-Q1 motor breaker</td></tr>
<tr><td>-S</td><td>switch, push button</td><td>-S2 START</td></tr>
<tr><td>-T</td><td>transformer, power supply</td><td>-T1 24 V supply</td></tr>
<tr><td>-W</td><td>cable</td><td>-W12</td></tr>
<tr><td>-X</td><td>terminal strip, connector</td><td>-X2:5 = strip X2, terminal 5</td></tr>
<tr><td>-Y</td><td>valve solenoid</td><td>-Y1 cylinder A out</td></tr>
</table></div>
<p>(These are the traditional letters, still used on most drawings. New drawings to IEC 81346-2 use P for lamps, Q for power contactors and K for PLCs. A full tag can also carry the place: <b>=MACHINE+CABINET-K1</b>.)</p>
<h3>Reading a control page: cross-references</h3>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 640 352" width="640" style="max-width:100%;height:auto" role="img" aria-label="Example control page with cross-references"><g fill="none" stroke="currentColor" stroke-width="1.8" font-family="IBM Plex Sans, sans-serif" font-size="12"><rect x="40" y="4" width="100" height="18" stroke-width="1"/><text x="90" y="17" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">1</text><rect x="140" y="4" width="100" height="18" stroke-width="1"/><text x="190" y="17" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">2</text><rect x="240" y="4" width="100" height="18" stroke-width="1"/><text x="290" y="17" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">3</text><rect x="340" y="4" width="100" height="18" stroke-width="1"/><text x="390" y="17" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">4</text><rect x="440" y="4" width="100" height="18" stroke-width="1"/><text x="490" y="17" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">5</text><rect x="540" y="4" width="100" height="18" stroke-width="1"/><text x="590" y="17" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="700">6</text><path d="M30 46 H630" stroke-width="2.4"/><path d="M30 320 H630" stroke-width="2.4"/><text x="26" y="50" text-anchor="end" stroke="none" fill="currentColor" font-size="11" font-weight="700">L+</text><text x="26" y="324" text-anchor="end" stroke="none" fill="currentColor" font-size="11" font-weight="700">M</text><path d="M190 46 V60"/><path d="M190 60 V80 H203 M190 100 V120 M190 100 L205 76"/><text x="168" y="92" text-anchor="end" stroke="none" fill="currentColor" font-size="12" font-weight="700">-S1</text><text x="168" y="106" text-anchor="end" stroke="none" fill="currentColor" font-size="10" font-weight="500">STOP</text><path d="M190 120 V140"/><text x="196" y="134" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">402</text><path d="M190 140 V160 M190 180 V200 M190 180 L177 158"/><text x="168" y="172" text-anchor="end" stroke="none" fill="currentColor" font-size="12" font-weight="700">-S2</text><text x="168" y="186" text-anchor="end" stroke="none" fill="currentColor" font-size="10" font-weight="500">START</text><path d="M190 140 H290 M190 200 H290"/><path d="M290 140 V160 M290 180 V200 M290 180 L277 158"/><text x="310" y="168" text-anchor="start" stroke="none" fill="currentColor" font-size="12" font-weight="700">-K1</text><text x="310" y="182" text-anchor="start" stroke="none" fill="currentColor" font-size="10" font-weight="500">13 – 14</text><path d="M190 200 V220"/><text x="196" y="212" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">403</text><rect x="174" y="220" width="32" height="22"/><path d="M190 242 V320"/><text x="166" y="236" text-anchor="end" stroke="none" fill="currentColor" font-size="12" font-weight="700">-K1</text><path d="M198 250 H286" stroke-width="1"/><text x="200" y="262" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">1 – 2  /3.2</text><text x="200" y="273" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">3 – 4  /3.2</text><text x="200" y="284" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">5 – 6  /3.3</text><text x="200" y="295" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">13 – 14  /4.3</text><text x="200" y="306" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">23 – 24  /4.5</text><path d="M490 46 V100"/><path d="M490 100 V120 M490 140 V160 M490 140 L477 118"/><text x="510" y="128" text-anchor="start" stroke="none" fill="currentColor" font-size="12" font-weight="700">-K1</text><text x="510" y="142" text-anchor="start" stroke="none" fill="currentColor" font-size="10" font-weight="500">23 – 24   /4.2</text><path d="M490 160 V196"/><text x="496" y="182" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">404</text><circle cx="490" cy="214" r="18"/><path d="M478 202 L502 226 M502 202 L478 226"/><path d="M490 232 V320"/><text x="516" y="210" text-anchor="start" stroke="none" fill="currentColor" font-size="12" font-weight="700">-H1</text><text x="516" y="224" text-anchor="start" stroke="none" fill="currentColor" font-size="10" font-weight="500">running</text><text x="330" y="342" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="600">page 4  ·  motor M1 start / stop</text></g></svg></div>
<ul>
<li>The coil <b>-K1</b> is on page 4, column 2. Under it, a small table lists <b>where its contacts are</b>: main contacts 1–2, 3–4, 5–6 on <b>page 3</b> (the power page), auxiliary 13–14 on <b>/4.3</b> (the seal-in, same page) and 23–24 on <b>/4.5</b> (the lamp).</li>
<li>Next to each contact you find the way back: "-K1 23–24 <b>/4.2</b>" = its coil is on page 4, column 2.</li>
<li>Numbers on the wires (402, 403, 404) are <b>wire numbers</b>, printed on the wire markers in the cabinet.</li>
<li>This page is the seal-in circuit you know from ladder: STOP (NC) in series, START (NO) with K1 13–14 in parallel, then the coil.</li>
</ul>
<h3>Reading a PLC input page</h3>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 640 316" width="640" style="max-width:100%;height:auto" role="img" aria-label="Example PLC input page"><g fill="none" stroke="currentColor" stroke-width="1.8" font-family="IBM Plex Sans, sans-serif" font-size="12"><path d="M30 40 H630" stroke-width="2.4"/><path d="M30 280 H630" stroke-width="2.4"/><text x="26" y="44" text-anchor="end" stroke="none" fill="currentColor" font-size="11" font-weight="700">L+</text><text x="26" y="284" text-anchor="end" stroke="none" fill="currentColor" font-size="11" font-weight="700">M</text><rect x="70" y="120" width="70" height="70" rx="8"/><text x="105" y="152" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">PNP</text><text x="105" y="168" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">-B1</text><text x="105" y="210" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="500">part present</text><path d="M85 120 V40"/><text x="80" y="100" text-anchor="end" stroke="none" fill="currentColor" font-size="10" font-weight="500">BN</text><path d="M85 190 V280"/><text x="80" y="240" text-anchor="end" stroke="none" fill="currentColor" font-size="10" font-weight="500">BU</text><path d="M140 155 H290"/><text x="160" y="148" text-anchor="start" stroke="none" fill="currentColor" font-size="10" font-weight="500">BK</text><text x="220" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="500">cable -W12</text><circle cx="300" cy="155" r="9"/><text x="300" y="132" text-anchor="middle" stroke="none" fill="currentColor" font-size="12" font-weight="700">-X2</text><text x="300" y="182" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="500">5</text><path d="M309 155 H440"/><text x="375" y="148" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="500">wire 1-I0.0</text><rect x="440" y="90" width="150" height="150"/><text x="515" y="112" text-anchor="middle" stroke="none" fill="currentColor" font-size="13" font-weight="700">-A1</text><text x="515" y="128" text-anchor="middle" stroke="none" fill="currentColor" font-size="10" font-weight="500">DI 16 × 24 V DC</text><circle cx="452" cy="155" r="5"/><text x="466" y="159" text-anchor="start" stroke="none" fill="currentColor" font-size="11" font-weight="700">I0.0   ← "part present"</text><circle cx="452" cy="185" r="5"/><text x="466" y="189" text-anchor="start" stroke="none" fill="currentColor" font-size="11" font-weight="500">I0.1</text><circle cx="452" cy="215" r="5"/><text x="466" y="219" text-anchor="start" stroke="none" fill="currentColor" font-size="11" font-weight="500">I0.2</text><path d="M590 220 H610 V280"/><text x="600" y="212" text-anchor="start" stroke="none" fill="currentColor" font-size="9" font-weight="500">M</text><text x="330" y="306" text-anchor="middle" stroke="none" fill="currentColor" font-size="11" font-weight="600">page 7  ·  PLC inputs, card -A1 slot 2</text></g></svg></div>
<p>Sensor <b>-B1</b>: brown to L+ (+24 V), blue to M (0 V), black is the signal. It runs in cable <b>-W12</b> to terminal <b>-X2:5</b>, and from there a wire goes to input <b>I0.0</b> of card <b>-A1</b>. In the program, I0.0 is "part present".</p>
<h3>Fault finding with the drawing</h3>
<ol>
<li>Find the device on the PLC page (search the tag or the address in the PDF or EPLAN).</li>
<li>Check the input LED on the card. Off? Measure 24 V at the card terminal, then at -X2:5, then at the sensor.</li>
<li>Where the voltage disappears, the fault is between that point and the last good one: a loose terminal, a broken wire, a bad connector, a dead sensor.</li>
<li>Write any change into the drawing (red-lining), so the drawings stay true.</li>
</ol>
<div class="callout where"><b>Where:</b> every cabinet. Common tools: EPLAN Electric P8, AutoCAD Electrical, SEE Electrical, WSCAD. Test yourself in <a href="#quiz-iv">Quiz → Interview questions → Electrical drawings</a>.</div>`,
      sims: {},
      takeaways: ["A place in the drawings is page.column, e.g. /4.3.", "Letters tell the device: K relay, Q breaker, F protection, M motor, B sensor, S switch, X terminal, A module.", "Under a coil, the cross-reference table shows where all its contacts are.", "Everything is drawn at rest: no power, nothing pressed."],
      mistakes: ["Reading an NC contact as \"open\" because the machine is running.", "Changing wiring without updating the drawing.", "Mixing up the wire number and the terminal number.", "Looking for a fault in the program before checking the field with the drawing."],
      challenges: ['cio-1', 'cio-2'],
    },
    {
      id: 'process-docs', level: 5, title: "Process documents: P&ID, I/O list, loop diagram, cause and effect", min: 12,
      summary: "The four documents a process plant gives the programmer: how to read instrument tags like LIC-101 on a P&ID, what the I/O list and the loop diagram are for, and how a cause and effect matrix turns into interlock rungs.",
      body: `
<h3>Why a programmer must read process documents</h3>
<p>In a factory that makes liquids, gas, food or chemicals, nobody hands you a ladder program to copy. You get <b>documents</b>, and the program comes out of them. Four documents carry almost everything you need.</p>

<h3>1. The P&amp;ID: what is in the plant</h3>
<p>A <b>P&amp;ID</b> (piping and instrumentation diagram) shows every pipe, tank, pump, valve and instrument, and how they are connected. Here is a small one: a tank with level control.</p>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 640 300" width="640" style="max-width:100%;height:auto" role="img" aria-label="A small P and I D: tank level control"><g fill="none" stroke="currentColor" stroke-width="1.6" font-family="IBM Plex Sans, sans-serif"><rect x="250" y="70" width="130" height="170" rx="10"/><text x="315" y="262" font-size="12" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">TK-101</text><path d="M40 110 H120 M160 110 H250" stroke-width="2.4"/><path d="M120 98 L160 122 M120 122 L160 98 M120 98 V122 M160 98 V122"/><path d="M140 110 V84"/><path d="M126 84 a14 12 0 0 1 28 0 z"/><text x="140" y="140" font-size="11" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">LV-101</text><text x="70" y="100" font-size="10" text-anchor="middle" font-weight="500" fill="currentColor" stroke="none">water in</text><circle cx="315" cy="34" r="19" fill="none"/><text x="315" y="29" font-size="11" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">LT</text><text x="315" y="47" font-size="10" text-anchor="middle" font-weight="500" fill="currentColor" stroke="none">101</text><path d="M315 53 V70"/><circle cx="190" cy="34" r="19" fill="none"/><path d="M171 34 H209"/><text x="190" y="29" font-size="11" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">LIC</text><text x="190" y="47" font-size="10" text-anchor="middle" font-weight="500" fill="currentColor" stroke="none">101</text><path d="M296 34 H209" stroke-dasharray="6 4"/><path d="M172 44 L146 74" stroke-dasharray="6 4"/><circle cx="440" cy="100" r="19" fill="none"/><text x="440" y="95" font-size="11" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">LSHH</text><text x="440" y="113" font-size="10" text-anchor="middle" font-weight="500" fill="currentColor" stroke="none">102</text><path d="M380 100 H421"/><path d="M380 220 H470" stroke-width="2.4"/><circle cx="492" cy="220" r="22"/><path d="M478 203 L514 220 L478 237"/><path d="M514 220 H600" stroke-width="2.4"/><text x="492" y="262" font-size="12" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">P-101</text><text x="575" y="210" font-size="10" text-anchor="middle" font-weight="500" fill="currentColor" stroke="none">to process</text><path d="M440 81 V62 H166 L154 80" stroke-dasharray="2 4"/><text x="392" y="56" font-size="10" text-anchor="middle" font-weight="500" fill="currentColor" stroke="none">interlock</text><text x="20" y="290" font-size="10" text-anchor="start" font-weight="500" fill="currentColor" stroke="none">thick line = pipe · dashed = electrical signal · dotted = interlock (software)</text></g></svg></div>
<p>Every instrument is a circle (a "bubble") with a <b>tag</b>. The letters follow a standard (ISA 5.1):</p>
<div class="tbl"><table>
<tr><th>First letter: what is measured</th><th>Next letters: what it does</th></tr>
<tr><td><b>F</b> flow · <b>L</b> level · <b>P</b> pressure · <b>T</b> temperature</td><td><b>T</b> transmitter (sends a 4–20 mA signal) · <b>I</b> indicator · <b>C</b> controller · <b>S</b> switch · <b>A</b> alarm · <b>V</b> valve</td></tr>
<tr><td colspan="2"><b>H</b> high, <b>L</b> low, <b>HH</b> very high, <b>LL</b> very low. So <b>LSHH</b> is a level switch, very high.</td></tr>
</table></div>
<p>Read the picture: <b>LT-101</b> measures the level and sends it to <b>LIC-101</b>, a level controller (a PID in your PLC). The controller moves the valve <b>LV-101</b>. Same number = same loop. <b>LSHH-102</b> is a separate switch for "much too high".</p>
<p>A line through the bubble means &quot;on the control panel&quot;. A circle inside a square is a function in the PLC or DCS that is shown on the HMI (LIC-101 here; it is drawn as a plain circle to keep the picture simple). No line means &quot;in the field, on the pipe&quot;.</p>

<h3>2. The I/O list: what goes to the PLC</h3>
<p>One row for each signal: tag, description, type (DI, DO, AI, AO), range and unit, PLC address, alarm limits. It is your tag table before you have written a single rung. Check it against the P&amp;ID: every bubble that has a signal must be in the list.</p>

<h3>3. The loop diagram: how one signal is wired</h3>
<p>One page for one loop: from the transmitter in the field, through the junction box and the terminal strip, to the exact channel of the I/O card. You need it when "the level shows zero": you follow the loop page terminal by terminal with a meter.</p>

<h3>4. The cause and effect matrix: what must happen when</h3>
<p>The interlocks as a table. Causes are rows, effects are columns, an X joins them:</p>
<div class="tbl"><table>
<tr><th>Cause ↓ &nbsp; Effect →</th><th>Close LV-101</th><th>Stop P-101</th><th>Alarm on HMI</th></tr>
<tr><td>LSHH-102 tank very high</td><td>X</td><td></td><td>X</td></tr>
<tr><td>LT-101 below 10 %</td><td></td><td>X</td><td>X</td></tr>
<tr><td>P-101 overload trip</td><td></td><td>X</td><td>X</td></tr>
</table></div>
<p>Each column becomes one rung: <b>"Stop P-101" = level low OR overload trip</b>. If a column has three X, the rung has three contacts. Program it exactly as the matrix says, and test it row by row during commissioning.</p>

<h3>From the documents to the program</h3>
<ol>
<li>Every row of the I/O list: a tag, and for analogs the scaling.</li>
<li>Every control loop on the P&amp;ID (LIC, FIC, TIC…): a PID block in a periodic task.</li>
<li>Every motor and valve: one standard block with start, stop, feedback and fault.</li>
<li>Every column of the cause and effect matrix: one interlock rung.</li>
<li>Every alarm limit: a compare, a delay, an alarm bit.</li>
</ol>
<div class="callout where"><b>Where:</b> water treatment, food and drink, chemicals, oil and gas, pharma. In interviews for process plants: "What does FIC-203 mean?" and "How do you program a cause and effect matrix?" For machine drawings see <a href="#lesson-drawings">Reading electrical drawings</a>.</div>`,
      sims: {},
      takeaways: ["P&ID tags: the first letter is what is measured (F, L, P, T), the next letters are what it does.", "Same number, same loop: LT-101, LIC-101, LV-101.", "The I/O list is your tag table.", "A loop diagram follows one signal from the field to the card channel.", "Each column of the cause and effect matrix is one interlock rung."],
      mistakes: ["Starting to program before the I/O list is checked against the P&ID.", "Reading LSHH as a transmitter: it is a switch.", "Programming an interlock from memory, not from the matrix.", "A control loop called in the main program, not in a periodic task.", "Not testing the matrix row by row."],
      challenges: ["level-control", "pid-1"],
    },
    {
      id: 'production-data', level: 5, title: "Production data: counters, downtime and OEE", min: 12,
      summary: "The numbers a plant runs on: part counters per shift, run and downtime, cycle time, the andon light, and OEE (availability × performance × quality), with the PLC traps: edges, overflow, division by zero and retentive memory.",
      body: `
<h3>What the plant wants to know</h3>
<p>Besides running the machine, the PLC is where production data starts: the HMI, the SCADA or the MES (manufacturing execution system) read these values from the PLC.</p>
<ul>
<li><b>Counters</b>: parts, good parts, rejects, per shift (reset at the shift change, by a button or by the clock).</li>
<li><b>Times</b>: running, stopped by a fault, waiting for material (starved), waiting for the next machine (blocked), planned stops.</li>
<li><b>Cycle time</b>: the time per part, compared with the ideal.</li>
<li><b>Andon light</b>: green producing, amber waiting, red fault, so anyone can see the state from far away.</li>
</ul>
<h3>OEE</h3>
<p><b>OEE</b> (Overall Equipment Effectiveness) is one number for how well the machine is used:</p>
<div class="tbl"><table>
<tr><th>Factor</th><th>Formula</th><th>Loses on</th></tr>
<tr><td>Availability</td><td>run time / planned production time</td><td>breakdowns, setups, material shortage</td></tr>
<tr><td>Performance</td><td>ideal cycle time × parts / run time</td><td>slow cycles, small stops</td></tr>
<tr><td>Quality</td><td>good parts / all parts</td><td>rejects, rework</td></tr>
<tr><td><b>OEE</b></td><td>A × P × Q</td><td>everything</td></tr>
</table></div>
<p>Example: 80 % × 95 % × 98 % = 74 %. About 85 % is called world class; many machines run at 50–60 %. The point is not the number but <b>which factor</b> is low.</p>
<h3>The PLC traps</h3>
<ul>
<li><b>Count the edge</b>: a "cycle done" signal lasts several scans. NO(I0.2) ADD(...) counts once per scan; P(I0.2) once per part.</li>
<li><b>Overflow</b>: a 16-bit INT ends at 32 767. A shift has 28 800 s, and 200 parts × 200 = 40 000. Multiply into 32-bit (DINT / MD) first, then divide.</li>
<li><b>Division by zero</b>: at the start of the shift the divisor is 0. Check it before dividing; some PLCs stop or log a fault.</li>
<li><b>Retentive memory</b>: counters must survive a power cut. Use retentive memory (TIA: "retain" in the DB, Rockwell: tags are retentive, CODESYS: VAR RETAIN).</li>
<li><b>Who resets</b>: decide whether the PLC, the HMI or the MES resets the shift counters, and only one of them.</li>
</ul>
<div class="callout where"><b>Where:</b> every production machine with an HMI or a line monitoring system; OEE boards in automotive, packaging, food.</div>`,
      sims: {},
      takeaways: ["Count parts on the rising edge.", "Measure run, fault and starved time separately: they tell you what to fix.", "OEE = availability × performance × quality.", "Use 32-bit for big products, never divide by zero, keep counters retentive."],
      mistakes: ["Counting the level of the cycle signal instead of its edge.", "16-bit overflow after a few minutes of production.", "Dividing at the start of the shift when the divisor is 0.", "Counters that reset at every power cut."],
      challenges: ["prod-1", "prod-2", "prod-3"],
    },
    {
      id: 'proportional', level: 6, title: "Proportional valves: speed, ramps and positioning", min: 11,
      summary: "Hydraulics with an analog output: the proportional valve sets the flow and so the speed. Why the output must ramp, how soft limits work, and how a simple P controller moves an axis to a position.",
      body: `
<h3>On/off valves vs proportional valves</h3>
<p>An ordinary valve is open or closed: full speed or stop, with a bang at every change. A <b>proportional valve</b> opens as far as the signal says: the PLC writes an analog output (±10 V or 4–20 mA, here −27648 … +27648 = −100 … +100 %) to the valve amplifier, and the cylinder speed follows. Brands: Bosch Rexroth, Parker, Moog, Atos. With a position sensor in a closed loop, the same valve becomes a <b>servo-hydraulic axis</b> (press brakes, injection moulding, test benches).</p>
<h3>Ramps</h3>
<p>Oil does not compress: a jump from 0 to 50 % flow means a jump in force and pressure (a <b>pressure peak</b>), noise and wear. So the output follows the setpoint with a <b>ramp</b>: at most a few % per 100 ms. In ladder: every 100 ms, move the output towards the setpoint by one step, or to the setpoint if it is closer than one step. The same idea is used for drives (acceleration ramps) and for analog setpoints from an HMI.</p>
<h3>Soft limits</h3>
<p>The ends of the cylinder must not be hit at speed. Stop asking for speed before the end (soft limit), far enough that the ramp-down ends before the mechanical end: distance ≈ speed × ramp time / 2.</p>
<h3>Positioning with a P controller</h3>
<p>Speed = (target − position) × gain. Far away the speed is at its limit; near the target it becomes smaller and smaller, so the axis creeps in without overshoot. "In position" = error inside a window (±2 mm) for a short time. Limit the error before multiplying, or the result overflows a 16-bit word. Real axes add an integral part or a feed-forward and a dead-band compensation of the valve, often in a motion module (Rexroth, Delta RMC) or with PLCopen hydraulic blocks.</p>
<div class="callout where"><b>Where:</b> press brakes, lifting tables, injection moulding, sawmills, steel mills, test benches, mobile hydraulics.</div>`,
      sims: {},
      takeaways: ["A proportional valve sets the speed with an analog output.", "Always ramp the output: no pressure peaks.", "Soft limits leave room for the ramp-down.", "P control: speed = error × gain, limited; in position = error in a window for a moment."],
      mistakes: ["Writing the setpoint straight to the valve (pressure peaks).", "Ramp only for accelerating, not for stopping.", "Overflow when multiplying a big error.", "Full speed until the target, then stop: overshoot."],
      challenges: ["prop-1", "prop-2"],
    },
    {
      id: 'plc-clock', level: 3, title: "The PLC clock: schedules and time windows", min: 9,
      summary: "Every PLC has a real-time clock: read it, turn the time into minutes since midnight, and make time windows, weekday schedules, shift bells and timed overrides.",
      body: `
<h3>Reading the clock</h3>
<p>The PLC has a battery- or capacitor-backed real-time clock, usually synchronised from the network (NTP). You read it with an instruction:</p>
<div class="tbl"><table>
<tr><th>Brand</th><th>Read the local time</th></tr>
<tr><td>Siemens TIA Portal</td><td>RD_LOC_T → DTL (YEAR, MONTH, DAY, WEEKDAY 1 = Sunday!, HOUR, MINUTE …)</td></tr>
<tr><td>Rockwell Studio 5000</td><td>GSV WallClockTime LocalDateTime → DINT[7] (year … microsecond)</td></tr>
<tr><td>CODESYS / Schneider / TwinCAT</td><td>SysTimeRtcGet + SysTimeRtcConvertUtcToDate, or DTU / F_GetSystemTime (TwinCAT)</td></tr>
<tr><td>Omron Sysmac</td><td>GetTime() or the system variable _CurrentTime</td></tr>
<tr><td>PLC Start</td><td>already read into AIW10 = hour, AIW11 = minute, AIW12 = weekday (1 = Monday)</td></tr>
</table></div>
<p>Watch the weekday numbering: it is different between brands.</p>
<h3>Minutes since midnight</h3>
<p>Comparing "after 05:30 and before 18:00" with hours and minutes separately is messy. Convert once: <b>t = hour × 60 + minute</b> (05:30 = 330, 18:00 = 1080). Then a time window is two compares: <code>t &gt;= start AND t &lt; end</code>. Use &gt;= for the start and &lt; for the end, so two windows can follow each other without a gap or an overlap.</p>
<p>A window across midnight (22:00–06:00) is <code>t &gt;= 1320 OR t &lt; 360</code>.</p>
<h3>Events and timed overrides</h3>
<ul>
<li>A condition like "minute = 0" lasts a whole minute: use an edge or a <b>TP</b> to do something once (ring the bell 3 s).</li>
<li>A button that gives light "for 30 minutes": a <b>TOF</b> started by the button.</li>
<li>Holidays: a switch or a calendar table in a data block.</li>
<li>Summer / winter time: synchronise the clock with NTP (it gives UTC) and set the time zone and the summer-time rule in the PLC, or the schedule shifts one hour twice a year.</li>
</ul>
<div class="callout where"><b>Where:</b> shift bells and breaks, building services (heating, ventilation, lights), pumps that run at night tariff, cleaning cycles, production calendars.</div>`,
      sims: {},
      takeaways: ["Read the clock with the brand's instruction; check the weekday numbering.", "Convert to minutes since midnight; a window is two compares (>= start, < end).", "Use an edge or TP for once-per-event actions, TOF for timed overrides."],
      mistakes: ["Comparing hours only and forgetting the minutes.", "Using <= at the end of a window (one minute too long, overlapping windows).", "A bell that rings for the whole minute.", "Windows across midnight written as one AND."],
      challenges: ["tod-1", "tod-2"],
    },
    {
      id: 'motor-starters', level: 4, title: "Motor starters: direct, star-delta, soft starter or VFD", min: 10,
      summary: "Four ways to start a three-phase motor, what each one costs and protects, and the PLC signals and sequences for each, including the soft starter with its bypass contactor.",
      body: `
<h3>Why not just switch it on?</h3>
<p>A motor started directly on the line draws <b>6–8 × its rated current</b> and gives a hard torque jolt: lights flicker, couplings and belts suffer, and pumps make water hammer. Bigger motors therefore use a starter that limits this.</p>
<div class="tbl"><table>
<tr><th></th><th>Direct on line (DOL)</th><th>Star-delta</th><th>Soft starter</th><th>Variable-speed drive (VFD)</th></tr>
<tr><td>Starting current</td><td>6–8 × In</td><td>about 2–3 × In, with a peak at the changeover</td><td>2–4 × In, adjustable</td><td>about 1 × In</td></tr>
<tr><td>Starting torque</td><td>full</td><td>one third</td><td>reduced, adjustable</td><td>full, controlled</td></tr>
<tr><td>Soft stop</td><td>no</td><td>no</td><td>yes (pumps!)</td><td>yes</td></tr>
<tr><td>Speed control</td><td>no</td><td>no</td><td>no</td><td><b>yes</b></td></tr>
<tr><td>PLC signals</td><td>1 contactor</td><td>3 contactors, timer, interlock</td><td>RUN, top of ramp, fault, bypass</td><td>run, direction, speed (analog or fieldbus), ready, fault</td></tr>
<tr><td>Cost</td><td>lowest</td><td>low</td><td>medium</td><td>highest</td></tr>
<tr><td>Typical use</td><td>small motors</td><td>older fans and pumps that start unloaded</td><td>pumps, fans, compressors, conveyors</td><td>anything that needs speed control or saves energy</td></tr>
</table></div>
<h3>The soft starter sequence</h3>
<ol>
<li>START: line contactor <b>KM1</b> and <b>RUN</b>: the starter raises the voltage over a few seconds.</li>
<li><b>Top of ramp</b>: the motor is at full speed; close the <b>bypass KM2</b> so the starter's thyristors do not carry the current (heat).</li>
<li>STOP: open KM2 first, keep RUN a moment so the starter takes the current back, then remove RUN: <b>stop ramp</b>. Keep KM1 on until the ramp is over.</li>
<li>Fault relay from the starter: everything off, latch, reset.</li>
</ol>
<p>Many modern soft starters have the bypass built in; then the PLC only gives RUN and reads ready, top of ramp and fault.</p>
<p>The older methods (autotransformer, stator resistance, rotor resistance), a circuit simulator for all of them, and the question "ladder or hardware?" are in the next lesson: <a href="#lesson-starting-methods">Seven ways to start a motor</a>.</p>
<div class="callout where"><b>Where:</b> pump stations, fans, compressors, crushers, long conveyors. A VFD where the speed must change; a soft starter where it only has to start and stop gently.</div>`,
      sims: {},
      takeaways: ["DOL is simple but draws 6–8 × In.", "Star-delta cuts the current but also the torque to a third.", "Soft starter: gentle start and stop, bypass at the top of the ramp.", "VFD: the only one with speed control."],
      mistakes: ["Closing the bypass before the top of ramp.", "Removing RUN with the bypass still closed: no stop ramp.", "Opening the line contactor during the stop ramp.", "Using a soft starter where speed control is needed."],
      challenges: ["soft-1"],
    },
    {
      id: 'starting-methods', level: 4, title: "Seven ways to start a motor: the circuit, the ladder, and who does what", min: 15,
      summary: "Direct on line, star-delta, autotransformer, stator resistance, rotor resistance, soft starter and drive: how each one lowers the starting current, what stays hardware, what the ladder does, and how both work together. With a circuit simulator.",
      body: `
<h3>The problem: a motor at standstill is almost a short circuit</h3>
<p>A 3-phase motor that stands still and gets full voltage takes <b>6 to 8 times</b> its rated current, until it is near full speed. Two things suffer:</p>
<ul>
<li><b>The supply:</b> the voltage dips, lights flicker, other machines trip.</li>
<li><b>The machine:</b> the torque comes as a hit. Belts, couplings and gearboxes wear out, and pipes get water hammer.</li>
</ul>
<p>Every starting method does the same trick: <b>give the motor less at the start, then give it everything</b>. They differ in what they reduce, and in what that costs.</p>
<div class="callout tip"><b>One rule to remember:</b> torque falls with the <b>square</b> of the voltage. Half the voltage gives only a quarter of the torque. So every method that lowers the voltage also makes the motor weak at the start.</div>

<h3>Try all seven</h3>
<p>Same motor, same load, seven starters. Press START and compare the blue current line with the grey line (the direct start). Then change the load to the loaded conveyor and see which methods cannot move it. With <b>By hand</b> you close the contactors yourself.</p>
[[hw:starters]]

<h3>The seven methods in one table</h3>
<div class="tbl"><table>
<tr><th>Method</th><th>The trick</th><th>Start current</th><th>Start torque</th><th>Hardware</th><th>Good for</th></tr>
<tr><td><b>1. Direct on line (DOL)</b></td><td>None: full voltage at once</td><td>6–8 ×</td><td>full</td><td>1 contactor</td><td>Small motors, to about 5–7 kW</td></tr>
<tr><td><b>2. Star-delta</b></td><td>Windings in star first: each one gets 58 % voltage</td><td>about 2 ×, and a peak at the changeover</td><td>one third</td><td>3 contactors, a motor with 6 terminals</td><td>Fans and pumps: light starts</td></tr>
<tr><td><b>3. Autotransformer</b></td><td>A transformer gives 50, 65 or 80 % voltage</td><td>tap² : 65 % tap = 42 % of DOL</td><td>tap² : 42 % of DOL</td><td>3 contactors and a big transformer</td><td>Big motors on a weak supply</td></tr>
<tr><td><b>4. Stator resistance</b></td><td>Resistors in series take part of the voltage</td><td>about 4 ×</td><td>about 40 %</td><td>2 contactors and hot resistors</td><td>Small, smooth starts. Old machines</td></tr>
<tr><td><b>5. Rotor resistance</b></td><td>Resistors in the <b>rotor</b> circuit of a slip-ring motor</td><td>about 2 ×</td><td><b>high</b>, up to 2 ×</td><td>Slip-ring motor, 3–5 step contactors, resistors</td><td>Heavy starts: crushers, mills, cranes</td></tr>
<tr><td><b>6. Soft starter</b></td><td>Electronics raise the voltage smoothly</td><td>2–4 ×, adjustable</td><td>reduced</td><td>One electronic unit with a bypass</td><td>Pumps, fans, compressors</td></tr>
<tr><td><b>7. Drive (VFD)</b></td><td>Frequency and voltage rise together</td><td>about 1–1.5 ×</td><td>full, controlled</td><td>One drive</td><td>Speed control, saving energy, very soft starts</td></tr>
</table></div>
<p>Look at number 5: it is the only old method with a low current <b>and</b> a high torque. That is why crushers and cranes used slip-ring motors. Today a normal motor with a drive does the same job.</p>

<h3>Can ladder do this instead of the hardware?</h3>
<p><b>No for the power, yes for the brain.</b> Split every starter into three layers:</p>
<div class="tbl"><table>
<tr><th>Layer</th><th>Its job</th><th>Who does it</th></tr>
<tr><td><b>Power circuit</b></td><td>Carries the motor current and lowers it at the start</td><td><b>Always hardware:</b> breaker, contactors, resistors, transformer, soft starter, drive. A PLC output gives 24 V and half an amp: it can only switch a contactor coil.</td></tr>
<tr><td><b>Protection and interlock</b></td><td>Stops a fire or a short circuit</td><td><b>Hardware, even with a PLC:</b> the overload contact and the E-stop are in the coil circuit. NC contacts (and a mechanical lock) sit between star and delta. They work when the PLC is in STOP or has a bug, and they catch a welded contact.</td></tr>
<tr><td><b>Sequence and timing</b></td><td>Decides <b>when</b> each contactor closes</td><td><b>Timer relays or the PLC program.</b> This is the part that ladder replaces.</td></tr>
</table></div>
<p>So the ladder does not lower the current. The star connection, the resistor or the drive does that. The ladder is the <b>conductor of the orchestra</b>: it only says who plays when.</p>

<h3>Relay control or PLC: what changes?</h3>
<div class="tbl"><table>
<tr><th></th><th>Hard-wired (relays, timer relays)</th><th>PLC ladder</th></tr>
<tr><td>Change the star time</td><td>Turn a knob inside the panel</td><td>Type a number on the HMI</td></tr>
<tr><td>Change the sequence</td><td>Rewire</td><td>Edit a rung</td></tr>
<tr><td>Find a fault</td><td>Measure with a meter</td><td>See every contact online, alarm text on the HMI</td></tr>
<tr><td>Extra checks</td><td>Each one costs a relay</td><td>Free: feedback, start too long, starts per hour</td></tr>
<tr><td>Cost</td><td>Cheap for one motor alone</td><td>Better when the machine has a PLC anyway</td></tr>
</table></div>

<h3>Both together: the normal way today</h3>
<ol>
<li><b>Hardware keeps it safe.</b> Overload contact and E-stop in series with the coils. NC interlock contacts between contactors that must never close together.</li>
<li><b>The PLC runs the sequence.</b> A run latch, timers, one output for each contactor. The same interlock again as NC contacts in the rungs, so the program never even asks for a wrong state.</li>
<li><b>The PLC watches the hardware.</b> One auxiliary contact of each contactor goes back to an input. Command on but no feedback after 1 s: stop, alarm "KM2 did not close". Feedback on without a command: "contact welded", do not start.</li>
<li><b>The PLC protects the starter.</b> The start takes too long: stop. Too many starts in an hour: wait. Resistors, transformers and soft starters need time to cool down.</li>
</ol>
<div class="callout tip"><b>With a soft starter or a drive</b> the sequence lives inside the unit. The PLC only says run, stop and how fast, and reads ready, running and fault. That is why new panels have so few contactors.</div>

<h3>The ladder for each method</h3>
<p>All of them begin with the same first rung, the <b>run latch</b>: START, seal-in, and STOP and the overload contact in series. After it:</p>
<div class="tbl"><table>
<tr><th>Method</th><th>Outputs</th><th>The rungs after the run latch</th><th>Practise</th></tr>
<tr><td>DOL</td><td>1</td><td>Line contactor = run</td><td><a href="#ch-start-stop">Start / stop</a></td></tr>
<tr><td>Star-delta</td><td>3</td><td>Timer. Star = run AND NOT timer AND NOT delta. Delta = run AND timer AND NOT star</td><td><a href="#ch-star-delta">Star-delta starter</a></td></tr>
<tr><td>Stator resistance</td><td>2</td><td>Line = run. Timer. Bypass = line AND timer</td><td><a href="#ch-res-1">Resistance starter</a>, then <a href="#ch-res-2">with feedback</a></td></tr>
<tr><td>Autotransformer</td><td>3</td><td>Star point and transformer at the start. Timer. Star point off, run contactor on (interlocked). Transformer off</td><td><a href="#ch-at-1">Autotransformer starter</a></td></tr>
<tr><td>Rotor resistance</td><td>4</td><td>Line = run. A chain of timers: each one bridges the next resistor step</td><td><a href="#ch-rotor-1">Slip-ring motor</a></td></tr>
<tr><td>Soft starter</td><td>2–3</td><td>Line and RUN. Bypass at "top of ramp". Stop ramp</td><td><a href="#ch-soft-1">Soft starter</a></td></tr>
<tr><td>Drive (VFD)</td><td>1 + speed</td><td>Run command and speed setpoint. Read ready and fault</td><td><a href="#ch-drive-1">Drive</a></td></tr>
</table></div>
<p>The soft starter and the drive have their own lessons: <a href="#lesson-motor-starters">Motor starters</a> and <a href="#lesson-drives">Drives</a>.</p>
<p><b>Wire them by hand too.</b> In the <a href="#circuits">Circuits</a> you build the hard-wired control circuit beside the 3-phase power circuit: <a href="#circuit-c-seal">direct on line</a>, <a href="#circuit-c-sd">star-delta</a>, <a href="#circuit-c-res">stator resistance</a>, <a href="#circuit-c-at">autotransformer</a>, <a href="#circuit-c-rotor">rotor resistance</a>, <a href="#circuit-c-soft">soft starter</a>, <a href="#circuit-c-vfd">drive</a>, and a <a href="#circuit-c-stein">3-phase motor on a single-phase supply with a capacitor</a>.</p>

<h3>Which one do I choose?</h3>
<ul>
<li>The speed must change, or energy matters: <b>drive (VFD)</b>.</li>
<li>Only a gentle start and stop, like a pump: <b>soft starter</b>.</li>
<li>Small motor on a strong supply: <b>direct on line</b>.</li>
<li>Light start, low budget, motor with 6 terminals: <b>star-delta</b>.</li>
<li>Very heavy start: <b>slip-ring motor with rotor resistance</b>, or today a drive.</li>
<li>Autotransformer and stator resistance: you meet them in <b>old plants</b>. You must be able to read and repair them.</li>
</ul>
<div class="callout where"><b>Where:</b> every plant with motors above a few kW: pump stations, fans, compressors, conveyors, crushers, cranes. In interviews you are often asked to draw star-delta and to say why it cannot start a loaded conveyor.</div>`,
      sims: {},
      takeaways: ["A direct start takes 6–8 × the rated current.", "Torque falls with the square of the voltage: less voltage, much less torque.", "The power circuit and the interlocks are hardware. The ladder does the sequence and the timing.", "Hardware interlock and PLC together: the PLC also watches the contactor feedback.", "Only rotor resistance and a drive start a heavy load with a low current."],
      mistakes: ["Thinking the PLC lowers the current. It only decides when each contactor closes.", "Star-delta interlock only in the program: a welded contact makes a short circuit.", "Star-delta or a soft starter on a load that starts heavy: the motor does not turn.", "Changing over too early: the current peak is as high as a direct start.", "Leaving start resistors or the autotransformer in the circuit: they burn."],
      challenges: ["res-1", "rotor-1", "at-1", "res-2"],
    },
    {
      id: 'safety', level: 5, title: 'Safety, E-stops, alarms & first scan', min: 10,
      summary: 'What must never depend on your program, and how to handle faults like a pro.',
      body: `
<h3>Emergency stop is hardware</h3>
<p>An <b>E-stop</b> must cut power to dangerous motion through a <b>safety relay</b> or safety PLC, independent of the standard PLC program. The standard PLC also reads the E-stop (through an auxiliary contact) so it knows to reset sequences and show a message, but it is <b>not</b> what makes the machine safe. Standards such as ISO 13849 and IEC 62061 define how.</p>
<h3>Fail-safe principles</h3>
<ul>
<li>Signals that permit running are wired so <b>1 = healthy</b> (NC stops, guards, overloads).</li>
<li>Outputs are de-energised in the safe state (spring-return valves, brakes that clamp without power).</li>
<li>No automatic restart after a stop, fault or power return. Require a new START.</li>
</ul>
<h3>Alarm handling</h3>
<p>A fault should <b>latch</b> (so a short glitch isn't missed), stop what's needed, light a lamp, and stay until the cause is gone <b>and</b> the operator acknowledges:</p>
[[sim:alarm]]
<h3>First-scan initialisation</h3>
<p><code>SM0.1</code> (FirstScan in CODESYS, S:FS in AB) is on for the very first scan after power-up. Use it to put the sequence in step 0, clear commands, and load default setpoints.</p>
<div class="callout warn">Never "fix" a nuisance trip by bypassing a safety input in software. Find the cause.</div>`,
      sims: { alarm: { program: 'RUNG Alarm latches on overtemperature\nNO(I0.5) | NO(I0.0) COIL(M2.0)\nNO(M2.0) | NC(I0.5)\nRUNG Alarm horn until acknowledged\nNO(M2.0) NC(M2.1) COIL(Q0.6)\nRUNG Acknowledge memory\nNO(I0.0) NO(M2.0) | COIL(M2.1)\nNO(M2.1) NO(M2.0)\nRUNG Fault lamp flashes until acknowledged, then steady\nNO(M2.0) NO(SM0.5) | COIL(Q0.4)\nNO(M2.0) NO(M2.1)', inputs: { 'I0.5': sw('Overtemp'), 'I0.0': pb('Ack / reset') }, outputs: { 'Q0.6': 'Horn', 'Q0.4': 'Fault lamp' }, note: 'Switch Overtemp on and off: the alarm stays latched. Ack silences the horn; the alarm clears only when the cause is gone and you press Ack again.' } },
      takeaways: ['E-stop = hardware safety circuit.', 'Latch faults, require acknowledge, no auto restart.', 'Initialise on first scan.'],
      mistakes: ['Making the E-stop a normal PLC input only.', 'Alarms that clear themselves before anyone sees them.'],
      challenges: ['tank', 'garage', 'gate', 'compressor'],
    },
    {
      id: 'modes', level: 5, title: 'Operating modes: OFF / MANUAL / AUTO & changeover', min: 12,
      summary: 'Every production machine has modes. What each mode may do, how to switch safely, homing, and automatic changeover between products.',
      body: `
<h3>Why modes?</h3>
<p>A machine spends most of its life in <b>AUTO</b>, but people also have to set it up, clear a jam, test a clamp or change a tool. Those jobs need <b>MANUAL</b> control of single movements. Mixing the two without rules is how machines crash and people get hurt, so the mode is a <b>deliberate choice</b>: a key switch or selector, often with password levels on the HMI.</p>
<div class="tbl"><table>
<tr><th>Mode</th><th>What may happen</th><th>Typical rules</th></tr>
<tr><td><b>OFF</b></td><td>Nothing moves. Controls powered, outputs off.</td><td>Nothing is commanded to move. That is not safe for hands in the machine: for cleaning or inspection, isolate and lock out.</td></tr>
<tr><td><b>MANUAL</b> (setup, jog)</td><td>One movement per button, <b>only while the button is held</b> (hold-to-run) or one toggle per press on an HMI.</td><td>START does nothing. <b>Interlocks stay active</b>: "B only when A is out", "no clamp the tool does not have", "screw only when clamped". Often reduced speed.</td></tr>
<tr><td><b>AUTO</b></td><td>The sequence runs by itself after START.</td><td>Jog buttons do nothing. START only from the <b>home position</b>. Leaving AUTO stops or aborts the cycle.</td></tr>
</table></div>
<h3>One coil per output, two sources</h3>
<p>The classic beginner mistake is writing each valve twice: once in the sequence and once for jogging (a double coil, see "Scan traps"). Instead, let the sequence set "AUTO wants" bits, and combine:</p>
<pre class="code">Valve A = (AUTO AND step wants A) OR (MANUAL AND Jog A)
Valve B = (AUTO AND step wants B) OR (MANUAL AND Jog B AND A is out)   ← interlock</pre>
<h3>Switching modes safely</h3>
<ul>
<li><b>AUTO → MANUAL during a cycle</b>: stop the sequence, but do <b>not</b> blindly switch everything off. A clamp holding a part should stay closed, otherwise the part falls. Raise a message ("Mode changed during cycle") so the operator knows the cycle was interrupted.</li>
<li><b>MANUAL → AUTO</b>: the sequence assumes it starts from <b>home</b>. If the machine is not home, refuse START and offer a <b>homing</b> function ("RESET = go home") that moves everything to its rest position in a safe order.</li>
<li><b>Any → OFF</b>: step to 0, outputs to their safe state.</li>
<li>Never let a mode change <b>start</b> a movement by itself. Movement always needs an operator action.</li>
</ul>
<h3>Reading a 3-position selector</h3>
<p>A selector OFF / MAN / AUTO usually has two contacts: one closes in MAN, the other in AUTO, none in OFF. In the simulator: cylinders I1.0 = MAN, I1.1 = AUTO; fixture I4.0 = MAN, I4.1 = AUTO. Both on at once is a wiring fault: treat it as OFF.</p>
<h3>Changeover (product change)</h3>
<p>Flexible lines run <b>production orders</b>: "200 × product A, then 50 × B". When an order is finished the machine must be <b>changed over</b>: new tool, new recipe, sometimes new settings. The PLC's job:</p>
<ol>
<li>Count good parts per order and detect "order complete".</li>
<li>Stop accepting START and tell the operator <b>which tool to fit</b> (HMI message, amber lamp).</li>
<li>After the change, <b>identify the new tool</b> (barcode/RFID) and <b>compare it with the order</b>. The wrong tool is refused: that is <b>poka-yoke</b>.</li>
<li>Load the recipe for the new tool and continue automatically.</li>
</ol>
<p>Shortening this time is a whole discipline: <b>SMED</b> (Single-Minute Exchange of Die). Automatic tool identification and recipe loading are a big part of it.</p>
<div class="callout tip"><b>PackML:</b> in packaging and many other industries, modes and states follow the standard <b>ISA-TR88 / PackML</b> model: modes <i>Production, Maintenance, Manual</i>, and states such as <i>Idle, Starting, Execute, Holding, Held, Stopping, Aborted, Clearing, Resetting</i>. The pattern here (mode selector + step number + alarm + reset) is the same idea in a smaller size.</div>
<div class="callout where"><b>Where:</b> every assembly cell, press, packaging machine, palletizer, CNC loader and test bench. Car-body welding fixtures, moulds and press dies are changed over many times a day with exactly the tool-check described above.</div>`,
      sims: {},
      takeaways: ['OFF = nothing moves, MANUAL = one movement while held, AUTO = sequence after START.', 'One coil per output: (AUTO AND step) OR (MANUAL AND jog).', 'Interlocks stay active in MANUAL.', 'AUTO starts only from home; leaving AUTO stops the cycle without dropping the part.', 'Changeover: order complete → ask for the tool → verify it → load its recipe.'],
      mistakes: ['Writing each output twice (sequence and jog): double coil.', 'Disabling interlocks in manual "because the operator knows what he does".', 'Restarting AUTO from wherever the machine was left in manual.', 'Trusting the operator to fit the right tool without checking its code.'],
      challenges: ['cyl-modes', 'fixture-man', 'fixture-c', 'fixture-orders', 'fixture-modes', 'st-fixture-c', 'fixture-changeover'],
    },
    {
      id: 'packml', level: 6, title: "PackML: the same states for every machine", min: 12,
      summary: "The standard machine state model: waiting and acting states, the commands between them, the difference between Hold, Suspend, Stop and Abort, and how to program it as a step sequence. With a state map you can drive.",
      body: `
<h3>The problem PackML solves</h3>
<p>Every machine builder invents own words: "ready", "auto", "cycle on", "paused", "fault". On a line with machines from five builders, the operator and the line PLC must learn five languages. <b>PackML</b> (from the packaging industry, standard ISA-TR88) gives every machine the <b>same states with the same names</b>. Today it is used far beyond packaging.</p>

<h3>Try it: run a machine through its states</h3>
[[hw:packml]]

<h3>Two kinds of state</h3>
<ul>
<li><b>Waiting states</b> (square): Stopped, Idle, Held, Suspended, Complete, Aborted: six of them. The machine stays there until a command comes. Execute is an <b>acting</b> state: it goes on until the order is done.</li>
<li><b>Acting states</b> (round, they end in -ing): Resetting, Starting, Holding… The machine does a job, and when the job is done it moves on <b>by itself</b>.</li>
</ul>

<h3>Hold, Suspend, Stop, Abort: four ways to not produce</h3>
<div class="tbl"><table>
<tr><th>Command</th><th>The reason is…</th><th>Example</th><th>How it goes on</th></tr>
<tr><td><b>Hold</b></td><td>inside this machine</td><td>Out of caps, operator pause</td><td>A person fixes it and presses Unhold</td></tr>
<tr><td><b>Suspend</b></td><td>outside this machine</td><td>No bottles from upstream, downstream full</td><td>By itself, when the line is free again</td></tr>
<tr><td><b>Stop</b></td><td>a normal, wanted stop</td><td>End of shift</td><td>Reset, then Start</td></tr>
<tr><td><b>Abort</b></td><td>a fault or a safety event</td><td>Guard door opened, drive fault</td><td>Fix it, Clear, Reset, Start</td></tr>
</table></div>
<p>This split is the most useful part. The line knows: a <b>suspended</b> machine is healthy and only waits. A <b>held</b> machine needs a person. That goes straight into the downtime report: who lost the time?</p>

<h3>How you program it</h3>
<p>It is the step sequence you already know, with fixed step names:</p>
<ol>
<li>One word holds the <b>state number</b>. Many builders use the PackML numbers: 2 Stopped, 4 Idle, 6 Execute, 9 Aborted, 11 Held, 5 Suspended, 17 Complete…</li>
<li>One block decides the <b>transitions</b>: state + command → next state. Nothing else may write the state.</li>
<li>For each acting state, a piece of program does the work and sets <b>"state complete"</b> when it is done.</li>
<li>Your normal machine sequence runs only in <b>Execute</b>.</li>
<li>The HMI shows the state name and enables only the buttons that are allowed.</li>
</ol>
<p>PackML also defines <b>modes</b> (Production, Maintenance, Manual) and a set of standard tags (PackTags) for commands, status and counters, so a line system can read every machine the same way.</p>
<div class="callout where"><b>Where:</b> packaging, food and drink, pharma, and more and more in general machine building. Siemens, Rockwell, Beckhoff, B&amp;R and others ship ready PackML blocks. In interviews: "What is the difference between Held and Suspended?"</div>`,
      sims: {},
      takeaways: ["PackML gives every machine the same state names.", "States that end in -ing do a job and move on by themselves.", "Hold: own problem. Suspend: the line. Stop: wanted. Abort: fault or safety.", "The normal sequence runs only in Execute.", "One block alone changes the state."],
      mistakes: ["Using Hold when upstream is empty: the downtime is counted against the wrong machine.", "Several places in the program that write the state number.", "Leaving Aborted without a Clear by a person.", "Production code that also runs in Held or Stopped.", "Buttons on the HMI that are not allowed in the current state."],
      challenges: ["cyl-modes", "capline"],
    },
    {
      id: 'fb-intro', level: 4, title: 'FC and FB: what, where, when', min: 8,
      summary: 'A function (FC) is a calculator: same inputs, same answer, no memory. A function block (FB) is a small machine with its own memory drawer: one per CALL. Write once, use many times.',
      body: `
<h3>Why blocks?</h3>
<p>Ten conveyors start and stop the same way. Copy the rungs ten times and every fix must be made ten times. Write the logic <b>once</b> as a block, then <b>CALL</b> it ten times with different wires: inputs in, outputs out.</p>
<h3>FC: the calculator</h3>
<ul>
<li>No memory. Every call starts from zero: same inputs → same outputs.</li>
<li>Use it for maths and simple logic: scaling, limits, the biggest of three, a lamp test.</li>
<li>Inside, its own variables are <b>temporary</b>: thrown away after the call.</li>
</ul>
<h3>FB: the small machine with a memory drawer</h3>
<ul>
<li>Has memory that stays from scan to scan: seal-ins, timers, edges, counters, steps.</li>
<li>Every CALL needs its own <b>instance</b> (its own drawer): Conv1, Conv2, Conv3. In TIA Portal an instance DB, in Studio 5000 a tag of the AOI, in CODESYS a variable of the FB type.</li>
<li>Use it for anything that must remember: a motor, a valve with a timeout, a toggle, a debounce, a batch counter.</li>
</ul>
<p>Switch the block between FB and FC, start the conveyors one by one, then try the classic bug:</p>
[[hw:blocks]]
<h3>The rule in one line</h3>
<div class="callout tip"><b>Does it need to remember anything from the last scan</b> (a latch, a timer, an edge, a count)? <b>Yes → FB.</b> <b>No → FC.</b></div>
<div class="tbl"><table>
<tr><th></th><th>FC (function)</th><th>FB (function block)</th></tr>
<tr><td>Memory</td><td>none (temporary only)</td><td>yes, one instance per call</td></tr>
<tr><td>Timers, edges, counters inside</td><td>no</td><td>yes</td></tr>
<tr><td>Typical blocks</td><td>Scale, Limit, Max, Average, lamp logic</td><td>Motor, Valve, Toggle, Debounce, Alarm, Batch, PID</td></tr>
<tr><td>TIA Portal</td><td>FC</td><td>FB + instance DB</td></tr>
<tr><td>Studio 5000</td><td>routine (JSR)</td><td>Add-On Instruction (AOI)</td></tr>
<tr><td>CODESYS / IEC 61131-3</td><td>FUNCTION</td><td>FUNCTION_BLOCK</td></tr>
</table></div>
<div class="callout where"><b>Where:</b> every professional program. A packaging line has one FB_Motor called 40 times, one FB_Valve called 60 times and one FC_Scale for every analog input.</div>
`,
      sims: {},
      takeaways: ['Write once, CALL many times with different wires.', 'Needs to remember anything (latch, timer, edge, count)? FB. Otherwise FC.', 'Every FB call has its own instance: its own memory.'],
      mistakes: ['A seal-in or a timer inside an FC: it forgets every scan.', 'Two calls with the same instance, or a global M bit inside an FB: the calls overwrite each other.'],
      challenges: ['fb-first', 'fb-lamptest', 'fb-scale', 'fb-limit', 'fb-max3', 'fb-startstop', 'fb-toggle', 'fb-debounce'],
    },
    {
      id: 'fb-design', level: 5, title: 'Designing a good block (and writing one in an interview)', min: 9,
      summary: 'The interface (IN, OUT, IN_OUT), static and temporary variables, the five rules of a good block, a small library of real-world blocks, and how to answer "write me a function".',
      body: `
<h3>1. The interface: what goes in, what comes out</h3>
<ul>
<li><b>IN</b>: read only (a button, a sensor, a setpoint).</li>
<li><b>OUT</b>: written by the block (a contactor, an alarm, a result).</li>
<li><b>IN_OUT</b>: read and written (a counter or a big structure the block changes).</li>
<li>Inside an FB: <b>static</b> variables (they stay) and <b>temporary</b> ones (gone after the call).</li>
</ul>
<h3>2. Five rules of a good block</h3>
<ol>
<li><b>Only use its own variables and parameters</b>, never a global M bit or I/O address inside. Otherwise two calls fight over the same bit.</li>
<li><b>One instance per call.</b></li>
<li><b>Write every output in every call</b>, so an output never keeps a stale value.</li>
<li><b>A clear name and comment</b>: FB_Motor, FC_Scale, what each parameter means, units.</li>
<li><b>Small and testable</b>: one job per block. Big blocks are built from small ones (an FB inside an FB).</li>
</ol>
<h3>3. A small real-world library</h3>
<div class="tbl"><table>
<tr><th>Block</th><th>Kind</th><th>Used for</th></tr>
<tr><td>FC_Scale</td><td>FC</td><td>4–20 mA / 0–27648 to engineering units, every analog input</td></tr>
<tr><td>FC_Limit, FC_Max3</td><td>FC</td><td>setpoints from the HMI, the hottest of several sensors</td></tr>
<tr><td>FB_Motor</td><td>FB</td><td>start / stop, feedback check, overload, run hours</td></tr>
<tr><td>FB_Valve</td><td>FB</td><td>open / close with a timeout alarm on the end switches</td></tr>
<tr><td>FB_Debounce, FB_Toggle</td><td>FB</td><td>chattering sensors, one-button on / off</td></tr>
<tr><td>FB_Alarm</td><td>FB</td><td>delay, latch, acknowledge, HMI text number</td></tr>
<tr><td>FB_Batch, FB_Totalizer</td><td>FB</td><td>parts per box, litres per day</td></tr>
</table></div>
<h3>4. "Write me a function": how to answer in an interview</h3>
<ol>
<li><b>Say FC or FB, and why</b> ("it has to remember the last state, so an FB").</li>
<li><b>Write the interface first</b>: IN, OUT, types, units.</li>
<li><b>Then the logic</b>, a few lines.</li>
<li><b>Name the edge cases</b>: value below the minimum, a division by zero, two buttons at once, power-up.</li>
<li><b>Say how you would test it</b>, and how you would call it twice.</li>
</ol>
<pre class="code">FUNCTION FC_Limit : INT
VAR_INPUT  In, Min, Max : INT; END_VAR
  FC_Limit := In;
  IF In &lt; Min THEN FC_Limit := Min; END_IF
  IF In &gt; Max THEN FC_Limit := Max; END_IF
END_FUNCTION</pre>
<p>The same task in ladder: <a href="#ch-fb-limit">FC 4/5: limit a value</a>. Then <a href="#ch-fb-toggle">the toggle</a> and <a href="#ch-bug-fb-global">the bug hunt</a>: both are asked again and again.</p>
`,
      sims: {},
      takeaways: ['IN read, OUT written, IN_OUT both; static stays, temporary is gone after the call.', 'No global bits or I/O addresses inside a block; one instance per call; write every output.', 'Interview: FC or FB and why, interface first, then logic, then edge cases and tests.'],
      mistakes: ['A global M bit or a fixed I/O address inside an FB.', 'An output that is only written in some calls (an IF without ELSE): it keeps an old value.', 'One giant block that does everything.'],
      challenges: ['fb-batch', 'bug-fb-global', 'bug-fc-forgets', 'fb-nested', 'blk-fb-timeout', 'blk-motors'],
    },
    {
      id: 'standards', level: 6, title: 'The standards in one map (IEC 61131-3 and friends)', min: 8,
      summary: 'The numbers you see in job ads and on drawings: what each one is for, which ones you must know well, and the one line to say in an interview.',
      body: `
<p>A standard is an agreement written down, so a contactor, a drawing or a PLC program means the same thing in every country and with every brand. You do not learn them by heart. You need to know <b>which one is for what</b>, and know a few <b>well</b>.</p>
[[hw:stdmap]]
<h3>The ones to know well</h3>
<ul>
<li><b>IEC 61131-3</b>: the PLC languages (LD, FBD, ST, SFC) and the blocks (PROGRAM, FUNCTION, FUNCTION_BLOCK). The languages are in <a href="#lesson-iec">Beyond ladder: IEC 61131-3</a>.</li>
<li><b>IEC 60204-1</b>: the electrics of a machine (E-stop, colours, earth, control voltage).</li>
<li><b>ISO 13849-1</b> (PL a–e) and <b>IEC 62061</b> (SIL): how safe a safety function must be.</li>
<li><b>IEC 81346</b> and <b>IEC 60617</b>: the names (-K1, -S0) and symbols on electrical drawings.</li>
</ul>
<div class="callout tip"><b>In an interview:</b> say what a standard is <b>for</b> and where you met it ("our machines were built to IEC 60204-1, the safety functions to ISO 13849 PL d"). Nobody expects the clause numbers.</div>
`,
      sims: {},
      takeaways: ['IEC 61131 has 10 parts; part 3 (languages and blocks) is the one programmers use every day.', 'Safety: ISO 12100 (risk), ISO 13849 (PL) or IEC 62061 (SIL), IEC 60204-1 (electrics).', 'Know what each standard is for; nobody expects the clause numbers.'],
      mistakes: ['Saying "IEC 61131" when you mean the languages: that is part 3, IEC 61131-3.', 'Mixing up PL (ISO 13849) and SIL (IEC 62061).'],
      challenges: [],
    },
    {
      id: 'blocks', level: 5, title: 'Reusable blocks: write once, use many times (FC / FB)', min: 14,
      summary: 'Real programs are built from blocks: one "motor" block used for twenty motors, each call with its own wiring and its own memory. How blocks, parameters and instances work.',
      body: `
<h3>The problem blocks solve</h3>
<p>A line has twenty identical motors. Copying the same five rungs twenty times works, until you find a bug: now you fix it twenty times and miss one. A <b>block</b> holds the logic <b>once</b>. The main program <b>calls</b> it twenty times, each time connected to different inputs and outputs.</p>
<h3>The words, in every brand</h3>
<div class="tbl"><table>
<tr><th>Idea</th><th>Siemens TIA Portal</th><th>Rockwell Studio 5000</th><th>CODESYS</th><th>PLC Start</th></tr>
<tr><td>Main program</td><td>OB1</td><td>MainRoutine</td><td>PLC_PRG</td><td>Main program tab</td></tr>
<tr><td>Block without memory</td><td>FC</td><td>Routine called with JSR (parameters with SBR / RET)</td><td>FUNCTION</td><td>Kind FC</td></tr>
<tr><td>Block with memory</td><td>FB + instance DB</td><td>Add-On Instruction (AOI) + backing tag</td><td>FUNCTION_BLOCK + instance in VAR</td><td>Kind FB + CALL with an instance name</td></tr>
<tr><td>The block's own memory</td><td>Static (in the instance DB)</td><td>Local tags of the AOI</td><td>VAR</td><td>other #names in an FB</td></tr>
<tr><td>Scratch values, lost after the call</td><td>Temp</td><td>(local tags are kept)</td><td>VAR of a FUNCTION</td><td>other #names in an FC</td></tr>
<tr><td>Inputs / outputs of a block</td><td>Input / Output / InOut</td><td>Input / Output parameters</td><td>VAR_INPUT / VAR_OUTPUT</td><td>PARAM IN / OUT / INOUT</td></tr>
<tr><td>Inside the block</td><td>#Start</td><td>Start</td><td>Start</td><td>#Start</td></tr>
<tr><td>A call in ladder</td><td>FB box with "Motor1_DB" above it; FC box</td><td>AOI box with the backing tag; JSR box</td><td>FB box with the instance name above it</td><td>CALL box</td></tr>
<tr><td>Timer done / elapsed</td><td>#Delay.Q / #Delay.ET</td><td>Delay.DN / Delay.ACC</td><td>Delay.Q / Delay.ET</td><td>#Delay.Q (or #Delay) / #Delay.ET</td></tr>
</table></div>
<h3>FC or FB?</h3>
<p>Ask one question: <b>does the block have to remember anything from one scan to the next?</b> A latch, a timer, a counter, an edge, a step number: that is memory, so it is an <b>FB</b>, and every call needs its own instance. If the outputs follow only from the inputs in this scan (logic, a calculation, a conversion), an <b>FC</b> is enough: no instance, nothing to manage.</p>
<div class="tbl"><table>
<tr><th>Job</th><th>Kind</th><th>Why</th></tr>
<tr><td>Valve output and "arrived" signals of a cylinder</td><td>FC</td><td>pure logic</td></tr>
<tr><td>Scale a raw value to °C</td><td>FC</td><td>a calculation</td></tr>
<tr><td>Motor with start / stop seal-in</td><td>FB</td><td>the latch is memory</td></tr>
<tr><td>Cylinder with a move timeout</td><td>FB</td><td>a timer is memory</td></tr>
<tr><td>Alarm with acknowledge, drive with a watchdog, PID</td><td>FB</td><td>state, timers, integral</td></tr>
</table></div>
<p>PLC Start checks it for you: a timer, counter, edge or PID inside an FC is an error, just as the real tools refuse it or make you pass the memory in from outside. In the Lab, the <b>Names as</b> selector above the ladder shows every block, parameter and call in the words of TIA Portal, Studio 5000 or CODESYS.</p>
<h3>Parameters and memory</h3>
<ul>
<li><b>Parameters</b> are the block's "terminals": <code>IN Start</code>, <code>OUT Run</code>. Inside the block you write <b>#Start</b>, never I0.0. At the call you connect <code>Start=I0.0</code>.</li>
<li><b>Static memory</b>: any other #name you use inside (a seal-in bit #Req, a timer #Delay, a counter) belongs to the block. Every <b>instance</b> (every call with its own name) gets its own copy. Motor1's timer and Motor2's timer run independently.</li>
<li><b>Reading a timer inside a block:</b> a contact on <code>#Delay.Q</code> (or just <code>#Delay</code>, the same thing) is the timer's done output; <code>#Delay.ET</code> is its elapsed time in ms. Outside a block it is the same: <code>T0</code> = <code>T0.Q</code>. Rockwell calls the same bit <code>.DN</code> and the elapsed time <code>.ACC</code>; PLC Start accepts <code>.DN</code>, <code>.TT</code> and <code>.EN</code> too.</li>
<li>The <b>instance name</b> is the memory. Two calls with the same instance name would share and fight over the same memory: always give each call its own instance.</li>
</ul>
<h3>How it runs</h3>
<p>When the scan reaches a CALL whose rung is true, the PLC runs all the block's rungs right there, with the #names pointing at that call's wiring and that instance's memory, then continues with the next rung of the main program. Rung false = block not executed (its outputs keep their last value), so most calls use an always-on contact.</p>
<h3>Designing a good block</h3>
<ol>
<li>One device or one function: a motor, a valve, a drive, an analog channel with alarms.</li>
<li>Everything that differs between devices is a <b>parameter</b>; everything the block must remember is <b>static</b>.</li>
<li>Give each parameter a comment; the next technician reads the interface, not the inside.</li>
<li>Test the block once, very well. Then every instance benefits.</li>
</ol>
<div class="callout tip"><b>Watching an instance:</b> in the Lab, open the block's tab and choose the instance to monitor: you see the power flow of Motor2, not Motor1. TIA Portal and Studio 5000 work the same way ("open instance" / "monitor in context").</div>
<div class="callout where"><b>Where:</b> every professional project. Machine builders keep libraries of tested blocks (motor, valve, drive, analog input, alarm) and build new machines mostly by calling them.</div>`,
      sims: {},
      takeaways: ['A block holds logic once; the main program calls it many times.', 'Needs memory (latch, timer, edge, counter)? FB with an instance. Only logic or a calculation? FC.', 'Parameters (IN/OUT) are the block\'s terminals; inside you write #Name.', 'Static #names are the block\'s memory; each instance has its own.', 'Every call needs its own instance name.', 'Fix the block once, and every instance is fixed.'],
      mistakes: ['Copying rungs instead of making a block.', 'Using real addresses (I0.0) inside a block instead of parameters.', 'Calling two devices with the same instance name.', 'Putting the CALL behind a condition and wondering why the block "freezes".'],
      challenges: ['blk-motors', 'blk-fc', 'blk-fb-timeout', 'drive-1', 'drive-line'],
    },
    {
      id: 'drives', level: 5, title: 'Variable-speed drives (VFD) in practice', min: 12,
      summary: 'How a PLC talks to a frequency inverter: run command, ready / running / fault feedback, fault reset, speed reference, ramps, and how to start and stop a line of driven conveyors.',
      body: `
<h3>What a drive is</h3>
<p>A variable-frequency drive (VFD, inverter) turns the fixed mains into a variable frequency, so the motor runs at any speed: 50 Hz = full speed, 25 Hz = half. It also ramps the motor up and down gently and protects it (overload, overcurrent, overtemperature).</p>
<h3>The signals</h3>
<div class="tbl"><table>
<tr><th>Signal</th><th>Direction</th><th>Meaning</th></tr>
<tr><td>Run (forward / reverse)</td><td>PLC → drive</td><td>"run now"; the drive ramps up to the reference</td></tr>
<tr><td>Speed reference</td><td>PLC → drive</td><td>analog 0–10 V / 4–20 mA (0 … 27648) or a word over the fieldbus</td></tr>
<tr><td>Fault reset</td><td>PLC → drive</td><td>a short pulse (rising edge) after the cause is gone</td></tr>
<tr><td>Ready</td><td>drive → PLC</td><td>healthy, may run</td></tr>
<tr><td>Running</td><td>drive → PLC</td><td>output active: proof that the run command arrived</td></tr>
<tr><td>Fault</td><td>drive → PLC</td><td>tripped (overload, overvoltage …), needs a reset</td></tr>
<tr><td>Actual speed / current</td><td>drive → PLC</td><td>analog or fieldbus value for display and checks</td></tr>
</table></div>
<p>On PROFINET / EtherNet/IP the same signals travel as bits in a <b>control word</b> and a <b>status word</b>, plus a speed word in each direction. The logic is identical.</p>
<h3>Good practice</h3>
<ul>
<li><b>Only command a ready drive</b>, and always <b>watch the feedback</b>: a command without a "running" answer within a few seconds is an alarm (broken wire, drive in local mode, missing enable).</li>
<li><b>Minimum speed</b>: many motors and conveyors must not crawl (cooling, torque); clamp the reference.</li>
<li><b>Fault reset</b> as a short pulse, and only when the operator asks. Never reset automatically in a loop.</li>
<li><b>Lines</b>: start <b>downstream first</b> (the conveyor that takes the product must already run), stop <b>upstream first</b>. If a conveyor trips, stop everything that feeds it at once.</li>
<li>The emergency stop does not go through the program: drives have <b>STO</b> (Safe Torque Off), wired into the safety circuit.</li>
</ul>
<div class="callout where"><b>Where:</b> conveyors, pumps and fans (energy saving), mixers, winders, cranes, extruders. Most motors in a modern plant run on a drive.</div>`,
      sims: {},
      takeaways: ['Run + speed reference out; ready, running, fault back.', 'Command only a ready drive and watch the running feedback.', 'Reset faults with a pulse, on request.', 'Clamp the speed reference (minimum speed).', 'Lines: start downstream first, stop upstream first.'],
      mistakes: ['No feedback watchdog: the PLC thinks a conveyor runs while it stands still.', 'Resetting faults automatically again and again.', 'Starting a feeding conveyor before the one it feeds.'],
      challenges: ['drive-1', 'drive-line'],
    },
    {
      id: 'drive-setup', level: 5, title: "Set up a drive: the first ten parameters", min: 12,
      summary: "Quick commissioning of a variable frequency drive: nameplate data, ramps, limits, command and setpoint source, the faults that wrong values give, and the parameter numbers in SINAMICS, Altivar and PowerFlex. With a drive you can commission.",
      body: `
<h3>A new drive does not know your motor</h3>
<p>A drive comes out of the box with factory values for some standard motor. Before the first start you must tell it what is really connected. Every brand calls this <b>quick commissioning</b> (or a start-up wizard), and every brand asks for the same few things.</p>
<div class="callout tip"><b>The nameplate is your source.</b> Voltage, current, frequency and speed are printed on the motor. Take a photo before the motor is built into the machine.</div>

<h3>Try it: commission a drive</h3>
<p>The drive below still has its factory values. Read the nameplate, set the parameters, then run the motor. Wrong values give the same faults a real drive gives.</p>
[[hw:drive]]

<h3>The ten parameters, and why each one matters</h3>
<div class="tbl"><table>
<tr><th>Setting</th><th>Why the drive needs it</th><th>If it is wrong</th></tr>
<tr><td>Motor rated <b>voltage</b> and <b>frequency</b></td><td>Together they give the voltage for each Hz (400 V / 50 Hz = 8 V per Hz)</td><td>Too few volts per hertz (voltage set too low or frequency too high): weak, hot motor. Too many: overcurrent at once</td></tr>
<tr><td>Motor rated <b>current</b></td><td>It is the overload protection of the motor (Altivar: set ItH too; PowerFlex: P033)</td><td>Too low: trips for no reason. Too high: the motor can burn</td></tr>
<tr><td>Motor rated <b>speed</b></td><td>The drive works out the slip and shows the right rpm</td><td>Wrong speed display, poor control at low speed</td></tr>
<tr><td><b>Ramp-up</b> time</td><td>How fast the frequency may rise</td><td>Too short: overcurrent fault</td></tr>
<tr><td><b>Ramp-down</b> time</td><td>How fast the frequency may fall</td><td>Too short with a heavy load: overvoltage fault</td></tr>
<tr><td><b>Minimum</b> and <b>maximum</b> frequency</td><td>Limits that no setpoint can pass</td><td>A fan that stalls, or a pump that runs too fast</td></tr>
<tr><td><b>Command source</b></td><td>Who may start: keypad, terminals, network</td><td>"The PLC output is on, but nothing happens"</td></tr>
<tr><td><b>Setpoint source</b></td><td>Who sets the speed: keypad, analog input, network</td><td>The motor runs, but always at the same speed</td></tr>
</table></div>

<h3>Why a fast stop gives "overvoltage"</h3>
<p>When the drive lowers the frequency faster than the load slows down, the load <b>drives the motor</b>. The motor becomes a generator and pushes energy back into the drive. The voltage inside the drive (the DC link) rises until it trips. Three cures: a longer ramp, a <b>braking resistor</b> that burns the energy, or letting the motor coast.</p>

<h3>The same settings in three brands</h3>
<div class="tbl"><table>
<tr><th>Setting</th><th>Siemens SINAMICS</th><th>Schneider Altivar</th><th>Rockwell PowerFlex 525</th></tr>
<tr><td>Rated voltage</td><td>p0304</td><td>UnS</td><td>P031</td></tr>
<tr><td>Rated current</td><td>p0305</td><td>nCr (and ItH for the overload)</td><td>P034 (and P033 for the overload)</td></tr>
<tr><td>Rated frequency</td><td>p0310</td><td>FrS</td><td>P032</td></tr>
<tr><td>Rated speed</td><td>p0311</td><td>nSP</td><td>P036</td></tr>
<tr><td>Ramp-up / ramp-down</td><td>p1120 / p1121</td><td>ACC / dEC</td><td>P041 / P042</td></tr>
<tr><td>Minimum / maximum</td><td>p1080 / p1082 (G120: in rpm)</td><td>LSP / HSP</td><td>P043 / P044</td></tr>
<tr><td>Command and setpoint source</td><td>p0015 (I/O macro)</td><td>Cd1 / Fr1</td><td>P046 / P047</td></tr>
</table></div>
<p>The numbers differ, the ideas do not. Always check the manual of your exact drive: parameter numbers change between series.</p>

<h3>After quick commissioning</h3>
<ul>
<li><b>Motor identification</b> (auto-tuning): the drive measures the motor once. Do it when the drive offers it.</li>
<li><b>Direction check</b>: a short run at low speed. Wrong way: swap two motor wires, or change the direction parameter.</li>
<li><b>Save</b> the parameters, and keep a copy with the machine documents.</li>
<li><b>Safe Torque Off</b> wiring, if the machine uses it, belongs to the safety circuit, not to the PLC program.</li>
</ul>
<div class="callout where"><b>Where:</b> every conveyor, pump and fan with a drive. In interviews: "The drive trips on overvoltage when it stops. Why?" and "The PLC gives a run signal but the motor does not start. What do you check?" Wire the control signals yourself in the <a href="#circuit-c-vfd">Circuits drive task</a>, and control one from ladder in <a href="#lesson-drives">Drives in practice</a>.</div>`,
      sims: {},
      takeaways: ["Type in the motor nameplate first: voltage, current, frequency, speed.", "Ramp-up too short gives overcurrent. Ramp-down too short gives overvoltage.", "The rated current in the drive is the motor protection.", "Command source and setpoint source decide who controls the drive.", "The ideas are the same in every brand. Only the numbers differ."],
      mistakes: ["Starting with factory values.", "Rated current left too high: the motor is not protected.", "A short ramp-down on a heavy fan without a braking resistor.", "Command source still on keypad when the PLC should start it.", "Not saving the parameters after commissioning."],
      challenges: ["drive-1", "drive-line"],
    },
    {
      id: 'word-logic', level: 5, title: "Words as bits: hex, masks, control words and BCD", min: 14,
      summary: "A word can hold 16 separate signals. Read and write it in hex, pick single bits, keep or set bits with AND / OR / XOR masks, start a drive with a control word, and convert BCD. With a click-the-bits calculator.",
      body: `
<h3>Why look at a word bit by bit?</h3>
<p>A word is 16 bits. Sometimes it holds a number, like a counter value. But very often it holds <b>16 separate yes / no signals</b> packed together:</p>
<ul>
<li>the <b>status word</b> of a drive: ready, running, fault, speed reached…</li>
<li>the <b>control word</b> you send to a drive: on, enable, acknowledge…</li>
<li>an <b>alarm word</b> for the HMI: one bit for each alarm</li>
<li>the outputs of a valve island or the inputs of a remote I/O station</li>
</ul>
<p>To work with such words you need three tools: <b>hex numbers</b>, <b>single bits</b> and <b>masks</b>.</p>

<h3>Hex: four bits, one digit</h3>
<p>Sixteen bits are hard to read: 0000010001111111. So we cut them into groups of four and write one <b>hex digit</b> for each group. The digits are 0–9 and then A–F for 10–15.</p>
<div class="tbl"><table>
<tr><th>Bits</th><td>0000</td><td>0100</td><td>0111</td><td>1111</td></tr>
<tr><th>Hex digit</th><td>0</td><td>4</td><td>7</td><td>F</td></tr>
</table></div>
<p>So that word is <code>16#047F</code>. In the Lab you can type <code>16#047F</code> or <code>2#0000_0100_0111_1111</code> anywhere a number is allowed. Studio 5000 writes <code>16#047F</code> too; CODESYS and TwinCAT also accept <code>16#047F</code>; Omron CX-Programmer writes <code>#047F</code>.</p>

<h3>Try it: click the bits</h3>
[[hw:bits]]

<h3>One bit of a word</h3>
<p>Write the word address, a dot and the bit number: <code>MW100.2</code> is bit 2 of MW100. Use it like any contact or coil. Bit 0 is the right-most bit.</p>
<p>A word from a device arrives in an input word. Copy it to a memory word first, then use its bits: <code>MOV(AIW30,MW100)</code>, then <code>NO(MW100.2)</code>.</p>
<div class="tbl"><table>
<tr><th>Software</th><th>Bit 2 of a word</th></tr>
<tr><td>TIA Portal</td><td><code>"Status".%X2</code> (slice access) or <code>%MW100</code> overlaid with <code>%M101.2</code></td></tr>
<tr><td>Studio 5000</td><td><code>Status.2</code></td></tr>
<tr><td>CODESYS, TwinCAT, Schneider</td><td><code>Status.2</code></td></tr>
<tr><td>Omron CX-Programmer</td><td><code>D100.02</code></td></tr>
</table></div>

<h3>Masks: AND, OR, XOR, NOT</h3>
<div class="tbl"><table>
<tr><th>Instruction</th><th>A result bit is 1 when…</th><th>You use it to…</th><th>Example</th></tr>
<tr><td><code>WAND(a,b,dst)</code></td><td>both bits are 1</td><td><b>keep</b> some bits, remove the rest</td><td>16#12AB AND 16#00FF = 16#00AB</td></tr>
<tr><td><code>WOR(a,b,dst)</code></td><td>at least one bit is 1</td><td><b>switch bits on</b></td><td>16#047E OR 16#0001 = 16#047F</td></tr>
<tr><td><code>WXOR(a,b,dst)</code></td><td>the two bits are different</td><td><b>flip</b> bits, or find <b>what changed</b></td><td>old XOR new = the changed bits</td></tr>
<tr><td><code>WNOT(a,dst)</code></td><td>the bit was 0</td><td>turn a mask around</td><td>NOT 16#00FF = 16#FF00</td></tr>
</table></div>
<p>Typical use: "is any alarm on?" Mask the alarm word with the alarms you care about, then compare with zero: <code>WAND(MW50,16#000F,MW52)</code>, <code>CMP(MW52&lt;&gt;0)</code>.</p>

<h3>The classic: a drive on a network</h3>
<p>A drive on PROFINET, EtherNet/IP or EtherCAT has no start wire. The PLC sends a <b>control word</b> and reads a <b>status word</b>. With the PROFIdrive profile (Siemens SINAMICS and many others):</p>
<div class="tbl"><table>
<tr><th>You send</th><th>Meaning</th><th>The drive answers (status bits)</th></tr>
<tr><td><code>16#047E</code></td><td>Everything is enabled, but the ON bit (bit 0) is 0: "get ready"</td><td>bit 0 = ready to switch on</td></tr>
<tr><td><code>16#047F</code></td><td>The same with bit 0 = 1: "run"</td><td>bit 2 = running, bit 8 = speed reached, bit 10 = above a comparison speed set in the drive</td></tr>
<tr><td><code>16#04FE</code></td><td>Bit 7 = 1: "acknowledge the fault"</td><td>bit 3 = fault goes to 0</td></tr>
</table></div>
<p>The order matters: the drive wants to see the ON bit <b>go from 0 to 1</b>. If you send 16#047F from the first scan, it does not start. This protects people: a drive must not start by itself when the PLC powers up.</p>
<p>The speed setpoint is a second word: <code>16#4000</code> = 16384 = 100 %. Drives with the CiA 402 profile (Schneider, Beckhoff, Omron servo drives) work the same way with other numbers: 6, then 7, then 15.</p>

<h3>LIM: is the value in range?</h3>
<p><code>LIM(10,MW0,20)</code> is a contact that passes power while 10 ≤ MW0 ≤ 20. One instruction where you would need two compares. TIA Portal calls it IN_RANGE, Studio 5000 calls it LIM.</p>

<h3>BCD: one decimal digit in every 4 bits</h3>
<p>Thumbwheel switches, old 7-segment displays and many clocks use <b>BCD</b>: each decimal digit gets its own 4 bits. The number 1234 becomes 0001 0010 0011 0100, which reads as <code>16#1234</code>.</p>
<p>The trap: if you read that word as a normal number, you get 4660, not 1234. So convert at the edge of your program: <code>BCD_I(src,dst)</code> on the way in, <code>I_BCD(src,dst)</code> on the way out.</p>

<h3>Negative numbers</h3>
<p>In a signed word, bit 15 is the sign. <code>16#FFFF</code> is −1, <code>16#8000</code> is −32768. That is why a word of status bits can show a strange negative number in a watch table: switch the display to hex.</p>
<div class="callout where"><b>Where:</b> every drive, servo, robot and valve island on a network. Alarm words for the HMI. Old machines with thumbwheels. In interviews: "How do you check bit 3 of a status word?" and "How do you start a drive over PROFINET?"</div>`,
      sims: {},
      takeaways: ["Four bits make one hex digit: 16#047F.", "MW100.2 is bit 2 of the word. Bit 0 is on the right.", "AND keeps bits, OR sets bits, XOR flips bits or shows what changed.", "A drive on a network: 16#047E first, then 16#047F. Acknowledge with bit 7.", "BCD 1234 is 16#1234, not the number 1234: convert with BCD_I and I_BCD."],
      mistakes: ["Sending 16#047F from the first scan: the drive wants to see the ON bit rise.", "Reading a BCD word as a normal number.", "Using the command bit for the running lamp, and not the status bit of the drive.", "Looking at a status word in decimal and seeing a strange negative number.", "A mask with the wrong bit: count from 0, from the right."],
      challenges: ["stw-1", "stw-2"],
    },
    {
      id: 'pid-practice', level: 5, title: 'PID in practice: the block and how to tune it', min: 12,
      summary: 'Using a real PID instruction: what Kp, Ti and Td do, why P alone leaves an offset, how to tune by hand, and the traps (windup, wrong direction, noisy D).',
      body: `
<h3>The PID instruction</h3>
<p><code>PID(PV, SP, OUT, Kp, Ti, Td)</code>: the PLC compares the measured value <b>PV</b> with the setpoint <b>SP</b> every scan and calculates the output <b>OUT</b> (0 … 27648 = 0 … 100 %). Real PLCs have the same block: <b>PID_Compact</b> (Siemens), <b>PIDE</b> (Rockwell), <b>PID</b> in CODESYS. When the rung is false the controller is off and its output is 0.</p>
<div class="tbl"><table>
<tr><th>Part</th><th>Parameter</th><th>What it does</th><th>Too much</th></tr>
<tr><td><b>P</b> proportional</td><td>Kp (% output per unit of error)</td><td>reacts at once, in proportion to the error</td><td>swinging</td></tr>
<tr><td><b>I</b> integral</td><td>Ti (seconds; 0 = off)</td><td>keeps adding while any error is left: removes the offset</td><td>overshoot, slow swinging</td></tr>
<tr><td><b>D</b> derivative</td><td>Td (seconds; 0 = off)</td><td>reacts to how fast the error changes; damps</td><td>a nervous output on noisy signals</td></tr>
</table></div>
<h3>Why P alone is not enough</h3>
<p>To run a pump at 80 % with Kp = 1 %/unit, the controller needs an error of 80 units. So the pressure settles <b>below</b> the setpoint: the <b>offset</b>. A bigger Kp shrinks the offset but makes the loop swing. The I part fixes it: as long as there is an error, it keeps pushing, until the error is zero.</p>
<h3>Tuning by hand (works for most loops)</h3>
<ol>
<li>Ti = 0, Td = 0. Start with a small Kp.</li>
<li>Raise Kp step by step until the value starts to swing. Use about <b>half</b> of that Kp.</li>
<li>Add I: start with Ti about the swing period you saw, then reduce Ti until the response is quick but does not overshoot much.</li>
<li>D is rarely needed (temperatures with long delays); leave it at 0 for pressure and flow.</li>
<li>Test with disturbances: open taps, change the setpoint. A good loop recovers calmly.</li>
</ol>
<h3>Traps</h3>
<ul>
<li><b>Direction</b>: more output must move PV towards SP (pump faster → more pressure). A loop where more output makes PV go <b>down</b> (cooling) needs the other direction: set the direct / reverse option of the block (PID_Compact: &quot;Invert control logic&quot;). The two words are used differently by different makers, so read the manual of your block.</li>
<li><b>Windup</b>: when the output is stuck at 100 %, the integral must stop growing (the Lab's PID does this), otherwise it overshoots badly afterwards.</li>
<li><b>Fast loops in slow tasks</b>: run PID at a fixed, short cycle time (cyclic interrupt OB in Siemens).</li>
<li><b>When not to use PID</b>: a tank with a simple level band or a thermostat often needs only on/off with hysteresis.</li>
</ul>
<div class="callout where"><b>Where:</b> pressure boosting, flow and dosing, temperature of ovens and extruders, tension on winders, speed of pumps and fans.</div>`,
      sims: {},
      takeaways: ['PID(PV, SP, OUT, Kp, Ti, Td); rung false = controller off.', 'P alone leaves an offset; I removes it; D damps but dislikes noise.', 'Tune: Kp to the edge of swinging, take half; then add I.', 'Watch direction, windup and cycle time.'],
      mistakes: ['Using P only and wondering why the setpoint is never reached.', 'Too small a Ti: slow swinging and overshoot.', 'Adding D on a noisy measurement.'],
      challenges: ['pid-1', 'pid-2', 'level-control'],
    },
    {
      id: 'sfc', level: 5, title: 'GRAFCET / SFC: sequences as charts', min: 12,
      summary: 'Many machines are documented as step charts. How to read GRAFCET (IEC 60848) and SFC (IEC 61131-3), and how to turn a chart into ladder with one bit per step.',
      body: `
<h3>Why charts?</h3>
<p>A sequence is easier to agree on as a picture: the mechanical designer, the customer and the programmer can all read it. In Europe the standard is <b>GRAFCET</b> (IEC 60848); PLCs implement it as <b>SFC</b> (Sequential Function Chart, IEC 61131-3): Siemens S7-GRAPH, CODESYS SFC, Rockwell SFC.</p>
<h3>The symbols</h3>
<ul>
<li><b>Step</b>: a square with a number. The <b>initial step</b> has a double square and is active at start-up. Active steps carry a token.</li>
<li><b>Action</b>: a box next to a step: what happens while the step is active (Y1: A+).</li>
<li><b>Transition</b>: a short bar between steps, with its <b>condition</b> (A1, START·A0).</li>
<li><b>Alternative branch</b> (single horizontal line, OR): only one path is taken, the one whose condition comes true.</li>
<li><b>Simultaneous branch</b> (double line, AND): all paths start together, and the chart only continues when all of them have finished.</li>
</ul>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 330 440" width="330" style="max-width:100%;height:auto" role="img" aria-label="GRAFCET chart"><g fill="none" stroke="currentColor" stroke-width="1.6" font-family="IBM Plex Mono, monospace" font-size="11"><rect x="148" y="12" width="34" height="28" rx="2"/><rect x="152" y="16" width="26" height="20" rx="1"/><text x="165" y="30" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">0</text><line x1="182" y1="26" x2="192" y2="26"/><rect x="192" y="15" width="62" height="22" rx="2"/><text x="223" y="30" text-anchor="middle" fill="currentColor" stroke="none">(home)</text><line x1="165" y1="40" x2="165" y2="70"/><line x1="154" y1="56" x2="176" y2="56" stroke-width="3"/><text x="181" y="60" fill="currentColor" stroke="none">START·A0·B0·C0</text><rect x="148" y="70" width="34" height="28" rx="2"/><text x="165" y="88" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">1</text><line x1="182" y1="84" x2="192" y2="84"/><rect x="192" y="73" width="62" height="22" rx="2"/><text x="223" y="88" text-anchor="middle" fill="currentColor" stroke="none">Y1: A+</text><line x1="165" y1="98" x2="165" y2="128"/><line x1="154" y1="113" x2="176" y2="113" stroke-width="3"/><text x="181" y="117" fill="currentColor" stroke="none">A1</text><line x1="85" y1="128" x2="245" y2="128"/><line x1="85" y1="132" x2="245" y2="132"/><line x1="105" y1="132" x2="105" y2="146"/><line x1="225" y1="132" x2="225" y2="146"/><rect x="88" y="146" width="34" height="28" rx="2"/><text x="105" y="164" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">2</text><line x1="88" y1="160" x2="78" y2="160"/><rect x="16" y="149" width="62" height="22" rx="2"/><text x="47" y="164" text-anchor="middle" fill="currentColor" stroke="none">Y2: B+</text><rect x="208" y="146" width="34" height="28" rx="2"/><text x="225" y="164" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">4</text><line x1="242" y1="160" x2="252" y2="160"/><rect x="252" y="149" width="62" height="22" rx="2"/><text x="283" y="164" text-anchor="middle" fill="currentColor" stroke="none">Y3: C+</text><line x1="105" y1="174" x2="105" y2="206"/><line x1="94" y1="190" x2="116" y2="190" stroke-width="3"/><text x="89" y="194" text-anchor="end" fill="currentColor" stroke="none">B1</text><line x1="225" y1="174" x2="225" y2="206"/><line x1="214" y1="190" x2="236" y2="190" stroke-width="3"/><text x="241" y="194" fill="currentColor" stroke="none">C1</text><rect x="88" y="206" width="34" height="28" rx="2"/><text x="105" y="224" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">3</text><line x1="88" y1="220" x2="78" y2="220"/><rect x="16" y="209" width="62" height="22" rx="2"/><text x="47" y="224" text-anchor="middle" fill="currentColor" stroke="none">B back</text><rect x="208" y="206" width="34" height="28" rx="2"/><text x="225" y="224" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">5</text><line x1="242" y1="220" x2="252" y2="220"/><rect x="252" y="209" width="62" height="22" rx="2"/><text x="283" y="224" text-anchor="middle" fill="currentColor" stroke="none">C back</text><line x1="105" y1="234" x2="105" y2="252"/><line x1="225" y1="234" x2="225" y2="252"/><line x1="85" y1="252" x2="245" y2="252"/><line x1="85" y1="256" x2="245" y2="256"/><line x1="165" y1="256" x2="165" y2="290"/><line x1="154" y1="273" x2="176" y2="273" stroke-width="3"/><text x="181" y="277" fill="currentColor" stroke="none">B0·C0</text><rect x="148" y="290" width="34" height="28" rx="2"/><text x="165" y="308" text-anchor="middle" fill="currentColor" stroke="none" font-weight="700">6</text><line x1="182" y1="304" x2="192" y2="304"/><rect x="192" y="293" width="62" height="22" rx="2"/><text x="223" y="308" text-anchor="middle" fill="currentColor" stroke="none">A back</text><line x1="165" y1="318" x2="165" y2="350"/><line x1="154" y1="334" x2="176" y2="334" stroke-width="3"/><text x="181" y="338" fill="currentColor" stroke="none">A0</text><path d="M165 350 V 366 H 22 V 26 H 148"/><path d="M140 22 L 148 26 L 140 30" /></g><g font-family="IBM Plex Sans, sans-serif" font-size="10" fill="currentColor"><text x="10" y="400">□ step (▣ = initial step) · ▬ transition + condition</text><text x="10" y="416">═ double line = simultaneous branch (AND): both paths run</text><text x="10" y="432">Y1 stays on in steps 1 … 5 (spring-return valve)</text></g></svg></div>
<h3>The two rules</h3>
<ol>
<li>A transition fires when <b>all</b> steps just above it are active <b>and</b> its condition is true.</li>
<li>When it fires, the steps above become inactive and the steps below become active.</li>
</ol>
<h3>Chart to ladder: one memory bit per step</h3>
<pre class="code">SM0.1                       → SET M20.0               (initial step)
M20.1 · A1                  → SET M20.2, SET M20.4, RST M20.1   (split)
M20.3 · M20.5 · B0 · C0     → SET M20.6, RST M20.3, RST M20.5   (join)
Y1 = M20.1 + M20.2 + … + M20.5                        (actions)</pre>
<p>Each transition is one rung with one contact chain and several SET/RST outputs in parallel. Unlike a single step <i>number</i>, step <i>bits</i> allow <b>several steps to be active at once</b>: exactly what a simultaneous branch needs.</p>
<div class="callout tip"><b>Step number or step bits?</b> A step word (MW0) is simpler for straight sequences and alternative branches. Step bits follow the chart one-to-one and handle simultaneous branches. Both are correct; follow what the documentation uses.</div>
<div class="callout where"><b>Where:</b> machine documentation in Europe, technician and engineering exams, S7-GRAPH programs in automotive plants, and any sequence where several things happen in parallel.</div>`,
      sims: {},
      takeaways: ['Step, action, transition with a condition.', 'Single line = OR branch; double line = AND branch.', 'A transition fires when all steps above it are active and its condition is true.', 'Ladder: one bit per step; one rung per transition with SET next / RST previous.'],
      mistakes: ['Forgetting to reset the upstream step (two steps stay active).', 'Joining a simultaneous branch on only one of its last steps.', 'Making actions with SET/RST instead of decoding them from the step bits.'],
      challenges: ['sfc-1', 'cylinders-abc'],
    },
    {
      id: 'troubleshooting', level: 5, title: 'Fault finding on the machine: a method', min: 11,
      summary: 'Most stoppages are not program bugs: a sensor moved, a wire broke, a coil burned. A quick, safe method to find the cause with the I/O table and forcing.',
      body: `
<h3>First question: did anything change?</h3>
<p>If the machine ran fine yesterday and nobody touched the program, the program is almost never the cause. Suspect the <b>field</b>: sensors, wires, valves, contactors, fuses, mechanics.</p>
<h3>The method</h3>
<ol>
<li><b>Observe</b>: what is the last thing that happened, and what should have come next?</li>
<li><b>Find what the PLC is waiting for</b>: the step, the transition, the missing condition. The online ladder (power flow) shows which contact is open.</li>
<li><b>Compare reality with the I/O table</b>: is the cylinder out but the input 0? Is the output 1 but nothing moves? The mismatch tells you where to look.</li>
<li><b>Split the chain in half</b>: input fault (sensor, cable, input card) or output fault (output card, fuse, wire, coil, valve, mechanics)?</li>
<li><b>Prove it</b>: force the suspected input or output. If the machine then works, the program is fine.</li>
<li><b>Repair the cause</b>, remove all forces, test the machine through a full cycle.</li>
</ol>
<div class="tbl"><table>
<tr><th>You see</th><th>Likely cause</th></tr>
<tr><td>Movement happened, input stays 0</td><td>sensor misplaced or broken, cable cut, input fuse</td></tr>
<tr><td>Input 1 although nothing is there</td><td>dirty / misaligned photo-eye, sensor too close, short circuit</td></tr>
<tr><td>Output 1, nothing moves</td><td>output fuse, wire, burned coil, no air / no power, mechanics stuck</td></tr>
<tr><td>Two signals behave "impossibly"</td><td>wires swapped (often right after maintenance)</td></tr>
<tr><td>Works only while a button is held</td><td>NO/NC contact type wrong</td></tr>
</table></div>
<h3>Forcing safely</h3>
<p>Forcing makes the PLC ignore the real input, or switches an output whatever the program says. On a real machine it can move things unexpectedly: only with the danger area clear, only for as long as you need, and remove every force afterwards (PLCs show a "force active" lamp). Never "fix" a machine by leaving a force on or by changing the program around a hardware fault.</p>
<div class="callout where"><b>Where:</b> every maintenance job. A technician who can read the I/O table and the online ladder finds most faults in minutes.</div>`,
      sims: {},
      takeaways: ['If the program did not change, suspect the field first.', 'Find what the PLC is waiting for.', 'Compare what you see with what the PLC sees.', 'Split: input side or output side.', 'Prove it by forcing, safely; remove all forces afterwards.'],
      mistakes: ['Changing the program to work around a broken sensor.', 'Leaving forces active.', 'Bridging safety contacts to "test".'],
      challenges: ['diag-reed', 'diag-stop', 'diag-eye', 'diag-tank', 'diag-vacuum', 'diag-door'],
    },
    {
      id: 'cpu-diagnostics', level: 5, title: "The CPU is in STOP: reading the diagnostics", min: 15,
      summary: "A red LED and a dead machine. Read the LEDs and the diagnostic buffer, know the error OBs and the Rockwell fault types, fix the cause and restart: the 5-step routine.",
      body: `<p>A red LED on the PLC. The machine is dead. The operator looks at you. Do not switch the power off and on, and do not download "the last good program". The PLC already knows what happened: it wrote it down, with the time. Your job is to read it.</p>
<h3>First look: the LEDs</h3>
<p>Every CPU shows its state with a few LEDs. Learn them for your brand: they tell you in two seconds which kind of problem you have.</p>
<div class="tbl"><table>
<tr><th>You see</th><th>Siemens S7-1500</th><th>Rockwell ControlLogix</th><th>CODESYS PLC (typical)</th></tr>
<tr><td>Program runs</td><td>RUN/STOP green</td><td>RUN green, OK green</td><td>RUN green</td></tr>
<tr><td>CPU stopped by an error</td><td>RUN/STOP yellow + ERROR red</td><td>OK flashes red (major fault)</td><td>ERR red, state Exception</td></tr>
<tr><td>A module or station has a fault</td><td>ERROR flashes red, module LED red</td><td>I/O flashes (5580 controllers have no I/O LED: look at the display and the OK LED), module has a yellow triangle</td><td>ERR flashes, red triangle in the device tree</td></tr>
<tr><td>Something needs attention</td><td>MAINT yellow (for example a force is active)</td><td>FORCE amber (forces on), BAT (battery, older controllers only)</td><td>depends on the PLC; forced values marked F</td></tr>
</table></div>
<p>Then go online with the laptop and read the list of events. Try it: five real faults, one after the other.</p>
[[hw:diag]]
<h3>The diagnostic buffer: the black box of the PLC</h3>
<p>The CPU writes every important event into a list: power on, mode changes, module faults, program errors. Each entry has a <b>time</b>, a <b>text</b> and a <b>help text</b>. The newest entry is at the top.</p>
<ul>
<li><b>Read from the top down.</b> The first red entry is usually the STOP. The entry just <i>under</i> it (a bit older) tells you <b>why</b>.</li>
<li><b>Incoming / outgoing</b> (Siemens): incoming = the fault started, outgoing = the fault is gone. A wire break that comes and goes many times is a loose terminal.</li>
<li><b>Help on event</b> explains the entry. For a program error, the button <b>Open in editor</b> jumps to the block and the network.</li>
<li>The buffer survives a power cycle. So read it <b>before</b> you change anything.</li>
</ul>
<div class="callout where"><b>Where:</b> TIA Portal: Online &amp; diagnostics → Diagnostics → Diagnostic buffer (also on the CPU display and in the web server). Studio 5000: Controller Properties → Major Faults / Minor Faults, the Controller Log, and Module Properties → Connection for a module. CODESYS: double-click the device → Log tab.</div>
<h3>Siemens: the error OBs</h3>
<p>When an error happens, the CPU calls a special organization block (OB). You write in it what the program must do. What happens if the OB is <b>not</b> in the project depends on the error and on the CPU:</p>
<div class="tbl"><table>
<tr><th>OB</th><th>Called when</th><th>OB missing on an S7-1500</th><th>OB missing on an old S7-300/400</th></tr>
<tr><td>OB80</td><td>Time error: the scan took longer than the maximum cycle time</td><td>STOP</td><td>STOP</td></tr>
<tr><td>OB82</td><td>Diagnostic interrupt: a module reports a fault (wire break, short circuit, no 24 V)</td><td>stays in RUN, entry in the buffer</td><td>STOP</td></tr>
<tr><td>OB86</td><td>Rack / station failure: a remote station is lost (and its return)</td><td>stays in RUN, entry in the buffer</td><td>STOP</td></tr>
<tr><td>OB121</td><td>Programming error: array index out of range, bad pointer, missing block</td><td>STOP</td><td>STOP</td></tr>
</table></div>
<p>Two traps. First: an <b>empty</b> error OB keeps the CPU in RUN, but it hides the problem: the bad instruction is skipped and nobody knows. Put real code in the OB: save the information, set an alarm bit, bring the machine to a safe state. Second: OB80 helps only after a short overrun. If one scan takes <b>twice</b> the maximum cycle time, the CPU goes to STOP even with OB80. An endless loop always ends there.</p>
<h3>Rockwell: major and minor faults</h3>
<p>Studio 5000 sorts faults into two kinds:</p>
<ul>
<li><b>Major fault</b>: the controller stops the program (mode Faulted, the OK LED flashes red) and the outputs go to their fault state, normally off. A <b>fault routine</b> can clear some program faults and keep running, but only use it to react, not to hide a bug.</li>
<li><b>Minor fault</b>: the controller writes it down and keeps running. Examples: arithmetic overflow, battery low.</li>
</ul>
<p>Every fault has a <b>Type</b> and a <b>Code</b>. Learn the common ones:</p>
<div class="tbl"><table>
<tr><th>Type / Code</th><th>Meaning</th><th>Kind</th></tr>
<tr><td>Type 4, Code 20</td><td>Array subscript too large (index outside the array), or a CONTROL .POS / .LEN is wrong</td><td>major</td></tr>
<tr><td>Type 6, Code 1</td><td>Task watchdog expired: the task did not finish in time (often an endless loop)</td><td>major</td></tr>
<tr><td>Type 3, Code 16</td><td>A required I/O connection failed (only if the module is set to "Major fault on controller if connection fails")</td><td>major</td></tr>
<tr><td>Type 4, Code 4</td><td>Arithmetic overflow</td><td>minor</td></tr>
<tr><td>Type 10, Code 10</td><td>Battery not detected or needs replacing</td><td>minor</td></tr>
</table></div>
<p>A lost module is often <b>not</b> a controller fault: the module gets a yellow triangle and a connection code (for example 16#0203, connection timed out), and the controller keeps running. After the repair you clear the major fault with <b>Clear Majors</b>, or by turning the key from PROG to RUN.</p>
<h3>CODESYS: the PLC log and exceptions</h3>
<p>In CODESYS a serious program error raises an <b>exception</b>: for example an <b>access violation</b> (an index or pointer outside its memory) or an <b>integer divide by zero</b>. The application stops in the state <b>Exception</b>, and the log shows the task and the POU. Each task also has a <b>watchdog</b> (a time and a sensitivity): if the task does not finish in time, it stops with a watchdog exception. After the fix: <b>Reset warm</b>, then <b>Start</b>. Tip: the implicit check POUs (CheckBounds, CheckDivDInt …) find these bugs while you test.</p>
<h3>Why a good program reads diagnostic bits</h3>
<p>Look at fault 1 in the simulator. The wire to the level sensor breaks. The card knows it at once: 0 mA is impossible on a 4–20 mA signal ("live zero"). It sets the value to 32767 and a fault bit. A program that ignores the bit uses 32767 as a level: 118 %, a false "tank full" alarm, and the operator searches in the wrong place.</p>
<div class="tbl"><table>
<tr><th>The program ignores diagnostics</th><th>The program reads diagnostics</th></tr>
<tr><td>Uses an invalid value as if it were real</td><td>Checks the value status / fault bit first</td></tr>
<tr><td>False alarm, or no alarm at all</td><td>A clear alarm: "Level sensor -B20: wire break"</td></tr>
<tr><td>Or the whole PLC stops (missing OB on old CPUs)</td><td>Only the affected part goes to a safe state; the rest keeps running</td></tr>
<tr><td>The technician needs a laptop to find the cause</td><td>The operator reads the cause on the HMI</td></tr>
</table></div>
<p>The rule: a <b>field fault</b> (wire, sensor, station) must not stop the CPU. The program reads the bit and reacts. A <b>program bug</b> (bad index, endless loop) must be fixed in the code: check every index that comes from outside, and never wait inside a scan.</p>
<h3>The 5-step routine (say this in the interview)</h3>
<ol>
<li><b>Make it safe and look.</b> Ask the operator what happened. Read the HMI alarms and the LEDs on the CPU and the modules.</li>
<li><b>Go online and read the diagnostics.</b> Diagnostic buffer / major and minor faults / PLC log. Newest first; read the entry under the STOP.</li>
<li><b>Find the cause.</b> Use the help text, "Open in editor" or the module status. Is it the field (wire, sensor, cable) or the program?</li>
<li><b>Fix the cause, not the symptom.</b> Repair the wire, check the index, remove the loop. Do not just restart, do not hide it with an empty error OB.</li>
<li><b>Restart and test.</b> STOP → RUN, watch a full cycle, remove all forces, and write down what you found.</li>
</ol>
<div class="callout tip"><b>Interview answer:</b> "First I make it safe and look at the LEDs and the HMI. Then I go online and read the diagnostic buffer, newest entry first. It tells me if it is a module, a station or a program error, and where. I fix the cause, restart, test a full cycle, and write it in the logbook. And in my programs I read the fault bits, so a broken wire gives a clear alarm instead of a STOP."</div>
<div class="callout where"><b>Where:</b> every service call and every commissioning. The diagnostic buffer is the first thing an experienced technician opens.</div>`,
      sims: {},
      takeaways: ["The PLC writes every fault into the diagnostic buffer, with the time. Read it before you change anything.", "Newest entry first. Under a STOP entry, the older entry tells you why.", "Siemens: OB80 time error, OB82 diagnostic interrupt, OB86 station failure, OB121 programming error.", "S7-1500 without OB80 or OB121: STOP. Without OB82 or OB86: stays in RUN. Old S7-300/400: STOP for all.", "Rockwell: a major fault stops the program, a minor fault is only logged. Type 4 Code 20 = array index, Type 6 Code 1 = watchdog.", "CODESYS: exceptions (access violation, divide by zero) and the task watchdog stop the application; Reset warm, then Start.", "A good program reads fault bits and station status: a field fault gives a clear alarm, not a STOP.", "The routine: make it safe and look, read the diagnostics, find the cause, fix the cause, restart and test."],
      mistakes: ["Switching the power off and on before reading the diagnostic buffer.", "Restarting the CPU again and again without fixing the cause.", "Adding an empty OB121 or fault routine so the CPU \"stays in RUN\": the bug is hidden, not fixed.", "Raising the maximum cycle time to \"fix\" an endless loop.", "Using an analog value without checking its fault or value status bit (32767 looks like a real value).", "Leaving a force active after a repair (MAINT / FORCE LED stays on)."],
      challenges: ["furn-3", "bug-db-index", "cio-plaus"],
    },
    {
      id: 'real-software', level: 5, title: 'From PLC Start to TIA Portal, Studio 5000, Schneider, TwinCAT, Omron and CODESYS', min: 16,
      summary: 'Everything you built here exists in the real tools, with different names. How to start a project in each, the instruction-by-instruction translation, and the traps when you change brand.',
      body: `
<h3>The three big tools</h3>
<div class="tbl"><table>
<tr><th></th><th>Siemens TIA Portal</th><th>Rockwell Studio 5000 (Logix Designer)</th><th>CODESYS</th></tr>
<tr><td>PLCs</td><td>S7-1200, S7-1500</td><td>ControlLogix, CompactLogix</td><td>Many brands: Schneider (Machine Expert), WAGO, Beckhoff TwinCAT (based on it), ABB, Eaton, Festo …</td></tr>
<tr><td>Main program</td><td>OB1 (Main)</td><td>MainTask → MainProgram → MainRoutine</td><td>PLC_PRG, called by a task</td></tr>
<tr><td>Memory</td><td>Tags in the PLC tag table and data blocks (DB)</td><td>Tags only (no addresses)</td><td>Variables (with or without %I / %Q / %M addresses)</td></tr>
<tr><td>Languages</td><td>LAD, FBD, SCL (= ST), GRAPH (= SFC)</td><td>Ladder, FBD, ST, SFC</td><td>LD, FBD, ST, SFC, IL, CFC</td></tr>
<tr><td>Where to learn</td><td>Trial licence, many schools</td><td>Licence needed, many schools</td><td>Free download, with a soft-PLC on your PC</td></tr>
</table></div>
<h3>Your first project, in every tool</h3>
<ol>
<li><b>Create the project</b> and add the CPU you really have (hardware configuration). The I/O cards you add give you the addresses.</li>
<li><b>Make the I/O list as tags</b>: Start = I0.0, Motor = Q0.0 … (In Studio 5000 you create tags and alias them to the module, e.g. Local:1:I.Data.0.)</li>
<li><b>Write the ladder</b> in OB1 / MainRoutine / PLC_PRG, with the same rungs you wrote here.</li>
<li><b>Compile</b>, fix the errors, <b>download</b> to the PLC (or the simulator: PLCSIM, Logix Emulate, CODESYS Control Win).</li>
<li><b>Go online</b>: the same green power flow you see in PLC Start. Watch tables and force tables are the I/O table of the Lab.</li>
</ol>
<h3>Schneider, Beckhoff and Omron</h3>
<ul>
<li><b>Schneider Electric</b>: <b>EcoStruxure Machine Expert</b> for M241 / M251 / M262 is built on CODESYS: the same IEC languages, POUs, FUNCTION_BLOCKs and %IX / %QX addresses. The small <b>M221</b> uses <b>Machine Expert Basic</b>: ladder or IL with %I0.0, %Q0.0, %M0, %MW0, timers %TM0, counters %C0. Big process PLCs (M340 / M580) use <b>Control Expert</b>.</li>
<li><b>Beckhoff TwinCAT 3</b>: a PLC on an industrial PC, programmed inside Visual Studio, also CODESYS-based. Variables are declared with AT %I* / AT %Q* and linked to the EtherCAT terminals; ST is used most, ladder works too.</li>
<li><b>Omron</b>: <b>Sysmac Studio</b> for NJ / NX: IEC ladder and ST with variables mapped to EtherCAT I/O, FBs and FUNs. The older <b>CX-Programmer</b> for CP1 / CJ: addresses like 0.00 (inputs), 100.00 (outputs), W bits, D words, TIM / CNT (and CNT counts <i>down</i>).</li>
</ul>
<h3>The same element in every brand</h3>
<p>Scroll sideways. In the Lab, the <b>Other brands</b> button shows <i>your own program</i> for TIA Portal, Studio 5000, Schneider, TwinCAT, Omron Sysmac, Omron CX and IEC ST, and the <b>Names as</b> selector above the ladder renames blocks and parameters in your brand's words.</p>
[[brands:table]]
<h3>Reading Rockwell rung text</h3>
<p>Studio 5000 can show every rung as one line of text, and you can type or paste a rung that way (double-click the rung number). Series elements are written one after another, a parallel branch is <code>[ A ,B ]</code>:</p>
<pre class="code">[XIC(Start),XIC(Motor)]XIO(Stop_Pressed)OTE(Motor);</pre>
<p>In the Lab, the <b>Other brands</b> button shows your own program this way (tab Studio 5000), and in all the other brands.</p>
<h3>Traps when you change brand</h3>
<ul>
<li><b>Siemens memory overlaps</b>: MW10 is the bytes MB10 and MB11, MD10 is MW10 + MW12, and M10.0 is a bit inside MB10. Writing MD10 changes MW12! PLC Start keeps them separate; in TIA, use tags in data blocks and the problem disappears.</li>
<li><b>Rockwell timers are in ms</b> and counters keep counting past the preset (.ACC goes on, .DN stays on).</li>
<li><b>NC STOP buttons</b> are the same everywhere: the contact in the program is NO, because the wire already does the inverting.</li>
<li><b>Old Siemens timers</b> (S_ODT, T0 on S7-300) still exist in old machines; new projects use IEC timers (TON) with instance data.</li>
<li><b>Analog values</b>: Siemens gives raw 0 … 27648; Rockwell usually scales in the module; always check the module manual.</li>
</ul>
<div class="callout tip"><b>The good news:</b> the thinking is the same in every brand: scan, contacts, seal-in, edges, timers, step bits, blocks. Learn the logic once, and a new tool is just new menus and new names.</div>
<div class="callout where"><b>Where:</b> you will meet all three. Siemens dominates in Europe, Rockwell in North America, CODESYS-based PLCs everywhere in machine building.</div>`,
      sims: {},
      takeaways: ['TIA Portal, Studio 5000, Machine Expert, TwinCAT, Sysmac and CODESYS all run the same ideas with different names.', 'Machine Expert and TwinCAT are CODESYS-based: IEC ST and FBs carry over almost unchanged.', 'Omron CX counters count down; M221 timers are %TM blocks.', 'XIC = NO, XIO = NC, OTE = coil, OTL / OTU = set / reset, [ , ] = branch.', 'T0.DN (Rockwell) = T0.Q (Siemens, CODESYS).', 'Siemens M memory overlaps: MD10 contains MW12.', 'Use the Other brands button to see your program in each brand.'],
      mistakes: ['Using MD10 and MW12 for different things on a Siemens PLC.', 'Entering a Rockwell timer preset in seconds instead of ms.', 'Assuming the analog range is the same on every brand.'],
      challenges: ['port-rk'],
    },
    {
      id: 'project-setup', level: 5, title: "From a new project to a running PLC: hardware, network, going online", min: 20,
      summary: "How a real PLC project starts. Choose the cards and read their addresses. Put the PLC, the laptop and the devices on one network. Then compile, download, go online, compare and force safely. Last, meet the real tools and their simulators.",
      body: `<p>In PLC Start the PLC is already there: you write a rung and it runs. On a real job you start with an empty project and a box of hardware. Before the first rung can run, you do three jobs:</p>
<ol>
<li><b>Hardware</b>: tell the tool which cards are in the rack. The tool then gives every signal its address.</li>
<li><b>Network</b>: give the PLC, the laptop and every device an address, so they can find each other.</li>
<li><b>Going online</b>: compile, download, watch the program run, and change it safely.</li>
</ol>
<p>Each job has a simulator below. Click, make mistakes, and read the <b>What happened</b> box: it tells you why. After that you find the real tools with their licences and simulators, and your first real project step by step.</p>

<h3>1. The rack: cards, slots and addresses</h3>
<p>A modular PLC is a <b>rack</b> of modules side by side. Each place in the rack is a <b>slot</b> with a number. These are the modules you will use. The last column shows how many bytes each card uses in the <b>process image</b>: the memory where the CPU keeps a copy of all inputs and outputs (more below).</p>
<div class="tbl"><table>
<tr><th>Module</th><th>What it does</th><th>Space in the process image</th></tr>
<tr><td><b>PS</b> (power supply)</td><td>Feeds the <b>backplane</b>: the bus behind the modules that carries power and data. The CPU and the cards take their power from it.</td><td>none</td></tr>
<tr><td><b>CPU</b></td><td>Runs the program, scan after scan.</td><td>none</td></tr>
<tr><td><b>DI 16</b></td><td>16 digital inputs: buttons, sensors, contacts</td><td>16 bits = 2 bytes</td></tr>
<tr><td><b>DQ 16</b></td><td>16 digital outputs: valves, lamps, contactors</td><td>16 bits = 2 bytes</td></tr>
<tr><td><b>AI 4</b></td><td>4 analog inputs, for example 4–20 mA</td><td>4 words (1 per channel) = 8 bytes</td></tr>
<tr><td><b>AQ 2</b></td><td>2 analog outputs</td><td>2 words = 4 bytes</td></tr>
<tr><td><b>CM RS-485</b> (communication module)</td><td>Serial port, for example for Modbus RTU</td><td>none on most CPUs (some modules use a few status bytes). The program talks to the devices with communication blocks.</td></tr>
</table></div>
<p><b>Hardware configuration.</b> In the tool you build a copy of the real rack: the same modules, with the same order numbers (the part number on the label), firmware versions (the software inside the module) and slots. When the CPU starts, it compares this copy with the real rack. If a card is missing or different, the CPU shows an error and that card does not work. With some settings the CPU does not go to RUN at all.</p>
<p><b>Where the addresses come from.</b> The program knows nothing about wires. It only knows addresses. The tool gives every card its addresses, and each brand does it in its own way:</p>
<ul>
<li><b>Siemens (TIA Portal)</b>: each card gets a start byte. A DI 16 at byte 0 gives I0.0 … I1.7, and the next DI 16 starts at I2.0. A word is 2 bytes: IW2 = bytes 2 and 3. So an AI 4 card that starts at byte 4 gives IW4, IW6, IW8 and IW10. You can change the start byte in the card properties.</li>
<li><b>Rockwell (Studio 5000)</b>: the slot number is part of the name. On a ControlLogix (1756) card, <code>Local:2:I.Data.0</code> = slot 2, input, bit 0 (newer 5069 cards use <code>Local:2:I.Pt00.Data</code>). If you move the card, every name changes. That is why the program uses <b>alias tags</b> like Start_PB, not the module names.</li>
<li><b>CODESYS</b>: %IX0.0 = input byte 0, bit 0. Word addresses count words, not bytes: %IW0 = bytes 0 and 1, %IW1 = bytes 2 and 3. Siemens calls the same word IW2. Careful: TwinCAT counts in bytes, so there %IW2 = bytes 2 and 3. The I/O Mapping tab of each card shows its addresses.</li>
</ul>
<p>Never guess an address. Read it in the tool and write it in the I/O list.</p>
<p><b>The process image.</b> At the start of every scan the CPU copies all inputs into memory: the <b>input image</b>. The program reads only this copy, so an input cannot change in the middle of the scan. The program writes into the <b>output image</b>, and at the end of the scan the CPU sends it to the output cards. Siemens works like this and calls the two copies PII and PIQ (process image of the inputs and of the outputs). CODESYS also works like this, with one copy for each task. Rockwell Logix is different: the I/O updates on its own timer, the <b>RPI</b> (requested packet interval, for example every 10 ms). So an input tag can change in the middle of the scan.</p>
<p><b>Spare channels.</b> Machines change during commissioning: one more sensor, one more lamp. Plan about 10–20 % free channels of each type and, if you can, a free slot. A spare channel costs little today. A new card later costs a machine stop, cabinet work and new drawings. A spare channel also helps when a channel breaks: move the wire and change one address.</p>
<p><b>Power budget.</b> The power supply gives a fixed power to the backplane, for example 25 W. The CPU and every card take a part of it. Add them up: the total must stay below what the supply gives. If the total is too high, cards can reset or fail at random, often only when the machine is busy. The tool or the manual shows the budget. Sensors and valves usually get their 24 V from a separate supply, not from the backplane.</p>
<p><b>Follow the signal.</b> A signal passes many points on its way. If one point is wrong, the program never sees it:</p>
<ul>
<li><b>Input</b>: sensor → wire → terminal → card channel (the LED lights) → bit in the input image → contact in the program.</li>
<li><b>Output</b>: coil in the program → bit in the output image → card channel (LED) → terminal → wire → valve or contactor.</li>
</ul>
<p>When you look for a fault, check the points in this order. The LED on the card splits the problem in two: the field side or the PLC side.</p>
<div class="callout tip"><b>Try it:</b> fill the rack for the I/O list of a small assembly station. Add cards until every check is green. Then switch the brand: the same rack gives other addresses. At the end, press <b>▶ test</b> in the I/O list and follow one signal from the sensor to the contact in the program.</div>
[[hw:rack]]
<div class="callout where"><b>Where:</b> the electrical drawings show the same path: every wire has a terminal, a card and a channel. See <a href="#lesson-drawings">Reading electrical drawings</a> and <a href="#lesson-commissioning">Commissioning: I/O check and the first run</a>.</div>

<h3>2. The network: IP address, subnet mask, device name</h3>
<p>Today the PLC, the HMI, the remote I/O, the drives and your laptop are often on one Ethernet network. To talk, they must find each other.</p>
<p><b>IP address.</b> Every device needs its own address, for example 192.168.0.1. If two devices have the <b>same</b> IP address, you get strange faults: the connection drops, or data goes to the wrong device.</p>
<p><b>Subnet mask.</b> The mask says which part of the address is the network and which part is the device. With 255.255.255.0 (also written /24) the first three numbers are the network. Two devices talk directly only when this network part is the same. Think of a street address: the first three numbers are the street, the last number is the house. Only houses on the same street talk directly. In this table every device uses the mask 255.255.255.0, and the PLC is 192.168.0.1:</p>
<div class="tbl"><table>
<tr><th>Device</th><th>IP address</th><th>Reaches the PLC?</th></tr>
<tr><td>HMI</td><td>192.168.0.2</td><td>yes: same network 192.168.0</td></tr>
<tr><td>Laptop</td><td>192.168.0.200</td><td>yes</td></tr>
<tr><td>Laptop</td><td>192.168.1.200</td><td><b>no</b>: 192.168.1 is another subnet</td></tr>
<tr><td>Drive</td><td>192.168.0.1</td><td><b>no</b>: same IP as the PLC (duplicate)</td></tr>
</table></div>
<p>In a /24 network, do not give .0 or .255 to a device: .0 is the address of the network itself and .255 is the <b>broadcast</b> address (a message to it goes to all devices). The <b>gateway</b> is only needed to reach another subnet through a router. Your laptop needs a fixed IP address in the machine's subnet on its Ethernet port. <b>Ping</b> is the first test: the laptop sends a small test message to an IP address, and the device answers if the path works.</p>
<p><b>PROFINET: devices are found by name.</b> In the project, every IO device has a <b>device name</b>, for example io-station-1. When the PLC starts, it asks on the network: "Who is io-station-1?" Then it gives that device the IP address from the project. A new device from the box has no name, so nothing happens. A device with another name, for example from another machine, is not found either. You must <b>assign the device name</b> once, online, from the tool: you find the device by its <b>MAC address</b> (a fixed hardware address printed on the device) or you make its LED flash. Do the same when you replace a broken device. Some PLCs do this automatically if the project shows which port is cabled to which device (the <b>topology</b>), but only if the new device has no name (new, or reset to factory settings). Device names use small letters, digits, "-" and ".".</p>
<p><b>EtherNet/IP: devices are found by IP address.</b> Here the IP address is the identity. You set the IP on the device itself: with a BOOTP/DHCP tool (a PC program that sends an IP address to a new device), with rotary switches, or on its web page. Then you enter the same IP in the project.</p>
<p><b>Device description file.</b> The tool knows the devices of its own brand. For a device from another maker you need its description file: <b>GSDML</b> for PROFINET, <b>EDS</b> for EtherNet/IP (EtherCAT uses <b>ESI</b> files). The file tells the tool which modules the device has and how many bytes it sends and receives. Download it from the device maker and install it:</p>
<ul>
<li><b>TIA Portal</b>: Options → Manage general station description files (GSD).</li>
<li><b>Studio 5000</b>: Tools → EDS Hardware Installation Tool.</li>
<li><b>CODESYS</b>: Tools → Device Repository → Install.</li>
</ul>
<p>Use the file version that matches the firmware of the device.</p>
<div class="callout tip"><b>Try it:</b> this machine does not start: 5 faults block its network. Start with the ping tool. Then fix the faults one by one: the laptop in the wrong subnet, the duplicate IP, two device names (one missing, one wrong) and the missing device file. Then switch to EtherNet/IP: there the IP address is the identity.</div>
[[hw:net]]
<div class="callout where"><b>Where:</b> every machine with a network. To see how the data really travels, read <a href="#lesson-networks">Networks: PLCs that talk to each other</a> and <a href="#lesson-protocols">Industrial communication</a>.</div>

<h3>3. Going online: download, upload, compare, force</h3>
<p><b>Offline and online.</b> Offline means the project on your PC. Online means the tool is connected to the PLC and shows live values: the green power flow you know from PLC Start. The project on the PC and the program in the PLC are two copies, and they can be different.</p>
<div class="tbl"><table>
<tr><th>Action</th><th>Direction</th><th>What it does</th></tr>
<tr><td><b>Compile</b></td><td>on the PC</td><td>Checks the program and translates it for the CPU. Fix every error and read the warnings.</td></tr>
<tr><td><b>Download</b></td><td>PC → PLC</td><td>Sends the project to the PLC. A full download or a hardware change usually stops the PLC: the machine stops. Some controllers have a key switch (RUN, REM, PROG): in RUN the laptop cannot download.</td></tr>
<tr><td><b>Go online</b></td><td>PC ↔ PLC</td><td>Shows the live values. It changes nothing in the PLC.</td></tr>
<tr><td><b>Compare</b></td><td>PC ↔ PLC</td><td>Shows where the two copies are different.</td></tr>
<tr><td><b>Upload</b></td><td>PLC → PC</td><td>Reads the program from the PLC. Use it when you have no project, or to get a change that someone made in the PLC.</td></tr>
<tr><td><b>Force</b></td><td>in the PLC</td><td>Holds an input or output at a value, whatever the field or the program says.</td></tr>
<tr><td><b>Online change</b></td><td>PC → PLC, in RUN</td><td>Changes the program while the machine keeps running.</td></tr>
</table></div>
<p><b>The download trap.</b> Last night a technician changed a timer preset in the PLC. This morning you download your project from yesterday. His change is gone, and nobody notices. A download can also overwrite <b>values</b>: setpoints, counters and recipes go back to the start values in your project. The rule: <b>go online and compare before every download.</b> If the PLC is different, find out why, and copy the change into your project first.</p>
<p><b>Upload.</b> An upload does not always give you the full project. Some older PLCs do not store comments and tag names: an upload then shows only addresses. In CODESYS you can upload only if the project source was stored in the PLC (Source download). If it was not, there is nothing to upload. So keep the original project, archive it with the date, and keep one master copy that everybody uses.</p>
<p><b>Write or force.</b> <b>Write</b> (also called modify) changes a value once: in the next scan the program or the input can change it back. <b>Force</b> holds the value until you remove the force. Most PLCs show a force lamp or a message. A forced output can move the machine: first make sure that nobody is in the danger area, and remove every force before you leave. The names in each tool:</p>
<ul>
<li><b>TIA Portal</b>: watch table and force table.</li>
<li><b>CODESYS</b>: Write values and Force values.</li>
<li><b>Studio 5000</b>: I/O forces.</li>
</ul>
<p><b>Online change.</b> You can change the program while the machine runs. In TIA Portal you download the changed blocks in RUN. In Studio 5000 you make online edits (start, accept, test, assemble). In CODESYS you log in with "online change". Before you accept, think about what the machine is doing at that moment. New timers and bits start at 0. A deleted coil keeps its last state: if a valve was on, it stays on. Hardware changes usually need STOP.</p>
<div class="callout tip"><b>Try it:</b> compile (fix the typo), download, go online and compare. Then comes the trap: someone changed the PLC at night. Compare first and upload, or you lose the change. Then force an output, make an online change in RUN, and add a card to see why that needs STOP.</div>
[[hw:online]]
<div class="callout where"><b>Where:</b> every visit to a running machine. When something is wrong in the field, use the method in <a href="#lesson-troubleshooting">Fault finding on the machine</a>.</div>

<h3>4. The tools: installing, licences and simulators</h3>
<p>Each brand has its own engineering tool. The big tools need a strong Windows PC with a lot of memory and disk space, and they support only some Windows versions. Licences are often bound to one PC or to a USB dongle. A <b>simulator</b> (or soft PLC) runs your program on the PC, so you can test the logic without hardware. A <b>runtime</b> is the software that makes a device work as a PLC.</p>
<p>Licences and trials change often. The notes below are a guide only: <b>check the vendor's site for the current conditions</b> before you install.</p>
<div class="tbl"><table>
<tr><th>Siemens</th><th>TIA Portal (STEP 7)</th></tr>
<tr><td>PLCs</td><td>S7-1200 and S7-1500 (and S7-300 / S7-400 in older projects)</td></tr>
<tr><td>Editions</td><td>STEP 7 Basic: S7-1200 only. STEP 7 Professional: all of them.</td></tr>
<tr><td>Simulator</td><td><b>S7-PLCSIM</b>: simulates S7-1200 and S7-1500 CPUs on your PC. <b>S7-PLCSIM Advanced</b>: S7-1500 and ET 200SP CPUs (not S7-1200), with a virtual Ethernet network and an interface for other software (virtual commissioning: you test the program with a simulated machine, for example a 3D model).</td></tr>
<tr><td>Licence</td><td>Paid. S7-PLCSIM normally comes with STEP 7 (Basic: S7-1200; Professional: also S7-1500); check this for your version. PLCSIM Advanced has its own licence.</td></tr>
<tr><td>To learn</td><td>Siemens offers a time-limited trial of STEP 7 Professional and WinCC on its support site after you register (it has been 21 days). Siemens has also offered a 21-day trial in the cloud, with nothing to install. Many schools have licences through the Siemens education program (SCE).</td></tr>
</table></div>
<div class="tbl"><table>
<tr><th>Rockwell</th><th>Studio 5000 Logix Designer</th></tr>
<tr><td>PLCs</td><td>ControlLogix and CompactLogix (GuardLogix for safety)</td></tr>
<tr><td>Editions</td><td>From Mini to Professional. The smaller editions support only some controllers and functions.</td></tr>
<tr><td>Simulator</td><td><b>FactoryTalk Logix Echo</b>: simulates newer controllers (ControlLogix 5580 and 5590, CompactLogix 5380, and their GuardLogix versions) on your PC. <b>Studio 5000 Logix Emulate</b>: the older simulator for older controllers (5560 / 5570). Newer versions of Logix Designer (37 and later) no longer support Logix Emulate: check the release notes.</td></tr>
<tr><td>Licence</td><td>Paid. Logix Echo has its own licence.</td></tr>
<tr><td>To learn</td><td>Rockwell has offered a 30-day trial of Logix Echo. You still need Studio 5000 Logix Designer (version 33 or later; 36 or later for CompactLogix 5380), and it has its own licence. For Logix Designer, ask your school or a distributor about an evaluation licence. Free, but different: <b>Connected Components Workbench</b> (CCW) Standard Edition for the small Micro800 PLCs, with a demo of the Micro800 Simulator. Its ladder is not the same as in Studio 5000.</td></tr>
</table></div>
<div class="tbl"><table>
<tr><th>CODESYS</th><th>CODESYS Development System V3.5</th></tr>
<tr><td>PLCs</td><td>PLCs of many brands run the CODESYS runtime (WAGO, Festo, ABB, Eaton, Raspberry Pi …). Schneider Machine Expert is built on it. Beckhoff TwinCAT looks very similar (the same languages), but it is its own system.</td></tr>
<tr><td>Simulator</td><td>A built-in <b>simulation mode</b> (Online → Simulation): no runtime needed, but the I/O and fieldbuses are not simulated. <b>CODESYS Control Win</b>: a real soft PLC on your Windows PC.</td></tr>
<tr><td>Licence</td><td>The Development System is free (you need a free account in the CODESYS Store). A runtime needs a licence; on a PLC of another brand it usually comes with the PLC.</td></tr>
<tr><td>To learn</td><td>Free. Without a licence, Control Win runs in demo mode for 2 hours; then you restart it.</td></tr>
</table></div>
<div class="tbl"><table>
<tr><th>Beckhoff</th><th>TwinCAT 3</th></tr>
<tr><td>PLCs</td><td>Beckhoff industrial PCs and embedded PCs, with EtherCAT I/O</td></tr>
<tr><td>Tool</td><td>XAE: the engineering, inside Visual Studio. XAR: the runtime, the PLC itself.</td></tr>
<tr><td>Simulator</td><td>Your own Windows PC can run the real runtime: the PC becomes the PLC. Check the system requirements first.</td></tr>
<tr><td>Licence</td><td>The engineering is a free download. The runtime and extra functions need paid licences.</td></tr>
<tr><td>To learn</td><td>A 7-day trial licence that you can renew again and again. It is for learning and testing, not for a machine in production.</td></tr>
</table></div>
<div class="tbl"><table>
<tr><th>Schneider</th><th>EcoStruxure Machine Expert / Machine Expert Basic</th></tr>
<tr><td>PLCs</td><td>Machine Expert Basic: Modicon M221. Machine Expert: M241, M251, M262 (built on CODESYS).</td></tr>
<tr><td>Simulator</td><td>Machine Expert Basic has a built-in simulator. Machine Expert has a simulation mode (from CODESYS).</td></tr>
<tr><td>Licence</td><td>Machine Expert Basic: free. Machine Expert: paid (Standard or Professional). After the trial you can also register for a free licence for one PC, with limited functions.</td></tr>
<tr><td>To learn</td><td>Machine Expert starts with a trial licence at the first launch (it has been 42 days). Machine Expert Basic is free with its simulator: a good start for ladder.</td></tr>
</table></div>
<div class="tbl"><table>
<tr><th>Omron</th><th>Sysmac Studio</th></tr>
<tr><td>PLCs</td><td>NJ and NX controllers. Older CP1 / CJ PLCs use CX-Programmer (in the CX-One package).</td></tr>
<tr><td>Simulator</td><td>A built-in simulator for NJ / NX. 3D motion simulation is an extra option with its own licence.</td></tr>
<tr><td>Licence</td><td>Paid.</td></tr>
<tr><td>To learn</td><td>Omron offers a 30-day free trial.</td></tr>
</table></div>
<p><b>Free for a beginner</b> (check the conditions on the vendor's site):</p>
<ul>
<li><b>PLC Start</b>: logic, scan, timers, addresses and networks, right here.</li>
<li><b>CODESYS</b> with its simulation mode or Control Win (2-hour demo): a full IEC 61131-3 tool, free.</li>
<li><b>TwinCAT 3</b>: free engineering and a renewable 7-day trial runtime.</li>
<li><b>Machine Expert Basic</b> with its simulator: simple ladder for the M221.</li>
<li><b>Connected Components Workbench</b> Standard Edition: Rockwell's free tool for the small Micro800 PLCs, with a simulator demo (its ladder differs from Studio 5000).</li>
<li><b>Trials</b> of TIA Portal, Sysmac Studio and Logix Echo run only for a short time: plan what you want to learn before the trial starts.</li>
</ul>
<div class="callout tip"><b>Two warnings.</b> Download only from the vendor's site: illegal "free" copies (cracked versions) often carry malware (viruses), and no company wants them on its network. And a simulator tests the logic, not the wiring, the sensors or the real network: the last test is always on the real machine.</div>

<h3>5. Your first real project, step by step</h3>
<p>The same ten steps work in every tool. Only the menu names change. Each step has one row, and below it the names in TIA Portal, Studio 5000 and CODESYS.</p>
<div class="tbl"><table>
<tr><th>TIA Portal</th><th>Studio 5000</th><th>CODESYS</th></tr>
<tr><td colspan="3"><b>1. New project, choose the CPU</b></td></tr>
<tr><td>Add new device: CPU order number and firmware</td><td>New project: controller type and revision</td><td>Standard project: choose the device, PLC_PRG in LD</td></tr>
<tr><td colspan="3"><b>2. Hardware</b></td></tr>
<tr><td>Device view: drag the cards into the slots</td><td>I/O Configuration → New Module, set the slot</td><td>Add the I/O under the device; I/O Mapping tab</td></tr>
<tr><td colspan="3"><b>3. Network</b></td></tr>
<tr><td>CPU properties: IP address; network view: device names</td><td>Ethernet port: IP address; add devices by IP (EDS)</td><td>Add an Ethernet adapter, then a PROFINET IO controller or an EtherNet/IP scanner</td></tr>
<tr><td colspan="3"><b>4. Tags</b></td></tr>
<tr><td>PLC tag table: Start_PB = %I0.0</td><td>Alias tag: Start_PB → Local:2:I.Data.0</td><td>Start_PB AT %IX0.0 : BOOL, or map it in I/O Mapping</td></tr>
<tr><td colspan="3"><b>5. Program</b></td></tr>
<tr><td>OB1 (Main)</td><td>MainTask → MainProgram → MainRoutine</td><td>PLC_PRG, called by a task</td></tr>
<tr><td colspan="3"><b>6. Compile</b></td></tr>
<tr><td>Compile</td><td>Verify Controller</td><td>Build</td></tr>
<tr><td colspan="3"><b>7. Connect: the laptop IP must be in the same subnet</b></td></tr>
<tr><td>Accessible devices</td><td>RSLinx / FactoryTalk Linx; Who Active</td><td>Communication Settings → Scan network</td></tr>
<tr><td colspan="3"><b>8. Download</b></td></tr>
<tr><td>Download to device</td><td>Download (Program mode), then Run mode</td><td>Login → download, then Start</td></tr>
<tr><td colspan="3"><b>9. Test online</b></td></tr>
<tr><td>Monitoring on, watch table, force table</td><td>Online, Monitor Tags, I/O forces</td><td>Online view, watch list, Write / Force values</td></tr>
<tr><td colspan="3"><b>10. Back up</b></td></tr>
<tr><td>Archive the project</td><td>Save the .ACD file with the date</td><td>Project archive</td></tr>
</table></div>
<div class="callout where"><b>Every time you visit a machine:</b> go online and compare, archive the PLC program with the date, make your change, test it, remove all forces, and archive again. Interviewers love the question "What do you do before you download?" Test yourself in <a href="#quiz-iv">Quiz → Interview questions → Hardware &amp; online</a>.</div>`,
      sims: {},
      takeaways: ["The slot and the start byte give every signal its address: read it in the tool, never guess it.", "Plan 10–20 % spare channels and check the power budget before you order the cards.", "One subnet, and one unique IP address for each device.", "PROFINET finds devices by name, EtherNet/IP by IP address; a device from another maker needs its GSDML / EDS file.", "Download = PC → PLC, upload = PLC → PC: go online and compare before every download.", "Forces and online changes act on a running machine: make sure nobody is in the danger area, think about the machine state, remove every force."],
      mistakes: ["Downloading an old project over a change made in the PLC, without comparing first.", "Laptop in another subnet, or two devices with the same IP address.", "Forgetting to assign the PROFINET device name to a new or replaced device.", "Ordering exactly the channels you need today, with no spares, or going over the power budget.", "Leaving forces on, or deleting a rung with a coil in RUN so the output stays on."],
      challenges: [],
    },
    {
      id: 'alarm-handling', level: 6, title: 'Alarms the professional way', min: 13,
      summary: 'An alarm is more than a lamp. Filter it, latch it, make the operator acknowledge it, sound a horn for new ones, and show which alarm came first.',
      body: `
<h3>What an alarm must do</h3>
<p>An alarm tells a person that something needs action. It must never be missed, even if the problem lasted only a moment, and it must not cry wolf. Every plant uses the same pattern (the standard ISA-18.2 describes it):</p>
<div class="tbl"><table>
<tr><th>State</th><th>Cause still there?</th><th>Acknowledged?</th><th>Lamp</th><th>Horn</th></tr>
<tr><td>Normal</td><td>no</td><td>—</td><td>off</td><td>off</td></tr>
<tr><td>New alarm</td><td>yes</td><td>no</td><td><b>flashing</b></td><td><b>on</b></td></tr>
<tr><td>Acknowledged</td><td>yes</td><td>yes</td><td>steady</td><td>off</td></tr>
<tr><td>Gone, not acknowledged</td><td>no</td><td>no</td><td>flashing</td><td>on</td></tr>
<tr><td>Gone and acknowledged</td><td>no</td><td>yes</td><td>off (normal)</td><td>off</td></tr>
</table></div>
[[sim:alarm]]
<h3>The building blocks</h3>
<ul>
<li><b>Filter</b>: a TON of 0.5 … 5 s on the raw signal, so a splash or a pressure dip does not stop the plant. Trips that protect people or equipment from instant damage get no delay.</li>
<li><b>Latch</b>: SET "active" on the rising edge of the filtered signal. Without a latch, a 0.2 s fault leaves no trace.</li>
<li><b>Not acknowledged</b>: a second bit, SET together with "active", RESET by ACK.</li>
<li><b>Clear</b>: "active" resets only when the cause is gone <b>and</b> it was acknowledged.</li>
<li><b>Lamp</b> = (not acknowledged AND clock) OR (active AND acknowledged). <b>Horn</b> = any alarm not acknowledged, so a new alarm sounds it again.</li>
</ul>
<h3>Trip or warning?</h3>
<p>Give every alarm a class: a <b>trip</b> stops the machine (low oil pressure), a <b>warning</b> only informs (filter getting dirty). The program uses an "any trip active" bit to stop and to block the restart.</p>
<h3>First-out</h3>
<p>When a machine trips, one fault often causes others within a second: no oil → hot bearing → overload. All lamps light, but only the <b>first</b> one is the cause. A first-out memory stores the number of the first alarm since everything was clear: the edge of each alarm writes its number only if the memory is still 0.</p>
<h3>Write it once</h3>
<p>Alarm logic is the perfect block: FB_Alarm with Cond and Ack in, Active, Unack and Lamp out, called once per alarm. Plants often collect the alarm bits into words (16 alarms per word) for the HMI.</p>
<div class="callout tip"><b>In the real tools:</b> TIA Portal HMIs read alarm bits and show texts, time stamps and acknowledgement (ProDiag can generate them). Rockwell has the ALMD / ALMA instructions and FactoryTalk alarms. CODESYS has an alarm manager. They all implement this same state table.</div>
<div class="callout where"><b>Where:</b> every machine and process plant. Too many alarms at once (an "alarm flood") hide the important one: filter well, use first-out, and only alarm what needs an action.</div>`,
      sims: { alarm: { program: 'NAME One alarm\nRUNG 1 s filter\nNO(I0.0) TON(T1,1s)\nRUNG Alarm comes: active + not acknowledged\nP(T1) ~ | SET(M1.0)\nSET(M1.1)\nRUNG ACK\nNO(I0.5) RST(M1.1)\nRUNG Clears when gone AND acknowledged\nNC(T1) NC(M1.1) RST(M1.0)\nRUNG Lamp: flashing = new, steady = acknowledged\nNO(M1.1) NO(SM0.5) | COIL(Q0.0)\nNO(M1.0) NC(M1.1)\nRUNG Horn\nNO(M1.1) COIL(Q0.5)', inputs: { 'I0.0': sw('Fault in the field'), 'I0.5': pb('ACK') }, outputs: { 'Q0.0': 'Alarm lamp', 'Q0.5': 'Horn' }, note: 'Switch the fault on for 2 s: horn and flashing lamp. ACK: steady. Fault off: lamp off. Now switch it on for 2 s and off again BEFORE ACK: it keeps flashing until you acknowledge.' } },
      takeaways: ['Filter, latch, acknowledge: never miss a short fault, never cry wolf.', 'Flashing = new, steady = acknowledged but still there.', 'The horn sounds for any unacknowledged alarm, so a new one sounds it again.', 'First-out shows the cause of a trip.', 'One alarm block, called once per alarm.'],
      mistakes: ['Lamp wired straight to the sensor: a short fault leaves no trace.', 'ACK clears the alarm while the cause is still there.', 'No filter: splashes and dips stop the plant.', 'One "general fault" lamp for everything.'],
      challenges: ['alarm-1', 'alarm-2', 'alarm-3'],
    },
    {
      id: 'hmi-design', level: 6, title: "Build an HMI screen: tags, buttons, limits and design rules", min: 15,
      summary: "What an HMI is and is not, which tag sits behind each element, why START is a momentary button, five design rules, user levels, and the names in WinCC, FactoryTalk View, Vijeo Designer, CODESYS and Sysmac. With a screen builder you can run.",
      body: `
<h3>What an HMI really is</h3>
<p>The HMI is the touch screen of the machine. It does <b>not control anything</b>. It only does two things: it <b>writes</b> values into PLC tags (a button writes a bit, an input field writes a number), and it <b>reads</b> PLC tags and shows them (lamps, numbers, bars, alarms).</p>
<div class="callout tip"><b>Rule:</b> all logic stays in the PLC. If the screen freezes or is unplugged, the machine must stay safe and keep its rules. The HMI is a window, not the brain.</div>

<h3>Try it: build the screen for a pump, then run it</h3>
<p>You get an empty screen and the tags of a small pump program. Add a START and a STOP button, a lamp, a bar graph, an input for the setpoint and an alarm banner. Then press <b>Run</b> and use your screen like an operator. The checklist shows what is missing, and the five design rules show what a good screen needs.</p>
[[hw:hmi]]

<h3>The elements and the tag behind each one</h3>
<div class="tbl"><table>
<tr><th>Element</th><th>Reads or writes</th><th>Tag type</th><th>Watch out for</th></tr>
<tr><td>Push button</td><td>Writes a bit</td><td>BOOL (an M bit, never an input I)</td><td>Use <b>momentary</b>: 1 only while pressed</td></tr>
<tr><td>Switch</td><td>Writes a bit that stays</td><td>BOOL</td><td>Good for auto / manual, not for start</td></tr>
<tr><td>Lamp</td><td>Reads a bit</td><td>BOOL</td><td>Show the real output, not the button bit</td></tr>
<tr><td>Number display</td><td>Reads a number</td><td>INT, REAL</td><td>Always show the unit</td></tr>
<tr><td>Number input</td><td>Writes a number</td><td>INT, REAL</td><td>Min and Max, and check again in the PLC</td></tr>
<tr><td>Bar graph, trend</td><td>Reads a number</td><td>INT, REAL</td><td>Scale it in real units</td></tr>
<tr><td>Alarm banner</td><td>Reads alarm bits</td><td>BOOL or a word of bits</td><td>One clear text for each alarm</td></tr>
<tr><td>Screen button</td><td>Nothing in the PLC</td><td>none</td><td>Lock settings with a user level</td></tr>
</table></div>

<h3>Why START must be a momentary button</h3>
<p>A "set" button writes 1 and leaves it there. Then the PLC sees START pressed for ever. After a stop or a power cut the machine <b>starts again by itself</b>. With a momentary button the bit is 1 only while the finger is on the screen, like a real push button. The seal-in in the PLC keeps the pump running.</p>
<p>One more trap: the screen can lose its connection <b>while the finger is on the button</b>. Then the bit stays 1 in the PLC. Good programs reset HMI command bits in the PLC after they have used them.</p>

<h3>Five design rules (rule 3 is from ISA-101; the others are good practice and safety standards)</h3>
<ol>
<li><b>Momentary buttons</b> for start and stop commands.</li>
<li><b>No E-stop on the screen.</b> A screen can freeze. An emergency stop is a real, hard-wired button.</li>
<li><b>Grey background, colour only for abnormal states.</b> If everything is colourful, the red alarm does not stand out. Normal = grey, alarm = red, warning = yellow.</li>
<li><b>A unit on every number.</b> 60 what? Percent, litres, bar?</li>
<li><b>Limits on every input</b>, and the same limits again in the PLC. The HMI is not the only way a wrong number can arrive.</li>
</ol>

<h3>Users and locked screens</h3>
<p>The operator may start, stop and change the setpoint. Only a technician may change alarm limits and timers. So settings screens get a <b>user level</b>, and the HMI asks for a login before it opens them.</p>

<h3>The same things in each brand</h3>
<div class="tbl"><table>
<tr><th>Brand</th><th>HMI software</th><th>A screen is called</th><th>A tag link is called</th></tr>
<tr><td>Siemens</td><td>WinCC in TIA Portal (Basic, Comfort, Unified)</td><td>Screen</td><td>HMI tag connected to a PLC tag</td></tr>
<tr><td>Rockwell</td><td>FactoryTalk View ME / SE (PanelView)</td><td>Display</td><td>Tag through a shortcut to the controller</td></tr>
<tr><td>Schneider</td><td>Vijeo Designer / EcoStruxure Operator Terminal Expert</td><td>Panel</td><td>Variable</td></tr>
<tr><td>CODESYS, TwinCAT</td><td>Built-in visualisation (TwinCAT HMI)</td><td>Visualisation</td><td>The program variable itself</td></tr>
<tr><td>Omron</td><td>Sysmac Studio with an NA panel</td><td>Page</td><td>Variable mapping</td></tr>
</table></div>
<div class="callout where"><b>Where:</b> almost every machine has at least one panel. In an interview you are often asked: "Why not put the E-stop on the HMI?" and "What happens when the HMI loses its connection?" Next step: <a href="#lesson-alarm-handling">alarms the professional way</a> and <a href="#lesson-hmi-texts">HMI text lists</a>.</div>`,
      sims: {},
      takeaways: ["The HMI only reads and writes PLC tags. The logic stays in the PLC.", "Start and stop are momentary buttons.", "A lamp shows the real output, not the command.", "Grey screens, colour only for abnormal states.", "Units and limits on every number, and the limits again in the PLC."],
      mistakes: ["A set or toggle button for START: the machine restarts by itself.", "An E-stop button drawn on the screen.", "A lamp linked to the button bit: it lights when the pump does not run.", "An input without limits: the operator types 9999.", "Settings open to every user."],
      challenges: ["sv-1", "fixture-man", "enc-2"],
    },
    {
      id: 'dint-real', level: 6, title: 'Bigger numbers: 32-bit DINT and REAL', min: 12,
      summary: 'A 16-bit word stops at 32 767. When to use 32-bit double words (DINT) and floating point (REAL), the multiply-first rule, MOD, and the traps of each.',
      body: `
<h3>The data types</h3>
<div class="tbl"><table>
<tr><th>Type</th><th>Size</th><th>Range</th><th>PLC Start</th><th>Use for</th></tr>
<tr><td>BOOL</td><td>1 bit</td><td>0 / 1</td><td>I, Q, M bits</td><td>signals</td></tr>
<tr><td>INT</td><td>16 bit</td><td>−32 768 … 32 767</td><td>MW, AIW, AQW</td><td>analog values, small counts, steps</td></tr>
<tr><td>DINT</td><td>32 bit</td><td>−2 147 483 648 … 2 147 483 647</td><td><b>MD</b>, HC</td><td>totals, encoder positions, big intermediate results</td></tr>
<tr><td>REAL</td><td>32 bit</td><td>±3.4·10<sup>38</sup>, about 7 digits</td><td>MR0 … MR99</td><td>physics, PID, flow totals</td></tr>
</table></div>
<h3>Overflow: the silent killer</h3>
<p>(AIW0 − 6400) × 5000 is up to 128 000 000. In a 16-bit word that does not fit. Depending on the brand the result <b>wraps around</b> (32 767 + 1 = −32 768) and sets an overflow flag, or it is clamped; PLC Start clamps at the limit. Either way the number is garbage, and the program keeps running with it.</p>
[[sim:dint]]
<h3>Three rules for integer maths</h3>
<ol>
<li><b>Multiply first, divide last.</b> Integer division throws the fraction away: 5248 ÷ 256 = 20, not 20.5. Dividing first loses precision; multiplying first keeps it.</li>
<li><b>Make the intermediate big enough</b>: put the product into a DINT (MD), divide, and the result fits back into an INT.</li>
<li><b>Use MOD for the remainder</b>: 35 100 ÷ 1000 = 35 metres, 35 100 MOD 1000 = 100 mm.</li>
</ol>
<h3>Fixed point: decimals without REAL</h3>
<p>Keep integers but choose a small unit: temperature in 0.1 °C (215 = 21.5 °C), pressure in 0.01 bar, weight in 10 g. Fast, exact and simple to compare. Many sensors (IO-Link) already send values this way.</p>
<h3>REAL (floating point)</h3>
<p>Real PLCs also calculate with REAL: in TIA Portal NORM_X and SCALE_X turn 0 … 27648 into 0.0 … 100.0 %; in Studio 5000 and CODESYS you write REAL tags in CPT or ST. Two traps:</p>
<ul>
<li><b>Never compare REALs with =</b>: 0.1 added ten times is not exactly 1.0. Use ≥ / ≤ or a band.</li>
<li><b>REAL totals stop counting</b>: with about 7 digits, 16 777 216 + 1 is still 16 777 216. Keep totals in DINT (or LREAL).</li>
</ul>
<div class="callout tip"><b>Siemens memory:</b> MD20 is MW20 + MW22. If you use MD20, keep MW20 and MW22 free. In PLC Start MD and MW are separate.</div>
<div class="callout where"><b>Where:</b> production totals, energy counters, encoder positions, recipe maths with big factors, flow totals. Every time a number can pass 32 767, use DINT.</div>`,
      sims: { dint: { program: 'NAME 16 bit vs 32 bit\nRUNG Counts above 4 mA: 0 … 25600\nNO(SM0.0) SUB(AIW0,6400,MW0)\nRUNG WRONG: the 16-bit product overflows\nNO(SM0.0) MUL(MW0,5000,MW2)\nRUNG\nNO(SM0.0) DIV(MW2,25600,MW12)\nRUNG RIGHT: 32-bit product, then divide\nNO(SM0.0) MUL(MW0,5000,MD100)\nRUNG\nNO(SM0.0) DIV(MD100,25600,MW10)', inputs: { 'AIW0': { name: 'Level transmitter', kind: 'ana', min: 6400, max: 32000, value: 11648 } }, outputs: {}, note: 'MW10 = litres (0 … 5000), right. MW12 = the same formula in 16 bits: wrong almost everywhere. Move the slider and compare.' } },
      takeaways: ['INT stops at 32 767; DINT goes to 2.1 billion.', 'Multiply first, divide last, with a DINT in between.', 'MOD gives the remainder.', 'Fixed point (0.1 °C, 0.01 bar) gives decimals with integers.', 'Never compare REALs with =; keep totals in DINT.'],
      mistakes: ['Dividing first and losing the fraction.', 'A 16-bit total that stops (or wraps) at 32 767.', 'Comparing a REAL with = 0.3.', 'On Siemens: using MD20 and MW22 for different things.'],
      challenges: ['dint-scale', 'enc-3'],
    },
    {
      id: 'real-scaling', level: 6, title: "REAL numbers: scale with NORM_X and SCALE_X, then round", min: 10,
      summary: "Numbers with decimals in the PLC: the REAL memory, scaling a raw analog value in two steps, getting back to a whole number with ROUND or TRUNC, and the four classic traps.",
      body: `
<h3>Why REAL?</h3>
<p>Whole numbers lose everything after the point: 7 / 2 = 3. For scaling, flow, temperature and PID you want 3.5. A <b>REAL</b> is a number with decimals (floating point, 32 bits). In the Lab the REAL memory is <code>MR0</code> … <code>MR99</code>, and you can write REAL numbers like <code>12.5</code>.</p>

<h3>Scaling in two steps: NORM_X, then SCALE_X</h3>
<p>An analog input gives a raw number, for example 0 … 27648 for 0 … 10 V. You want 0.0 … 100.0 %. Siemens does this in two small steps, and the Lab does the same:</p>
<ol>
<li><code>NORM_X(0,AIW0,27648,MR0)</code>: "where is the value between min and max?" The answer is always <b>0.0 … 1.0</b>. Half-way gives 0.5.</li>
<li><code>SCALE_X(0.0,MR0,100.0,MR1)</code>: stretch 0.0 … 1.0 to the range you want. 0.5 gives 50.0.</li>
</ol>
<p>The formula behind both steps:</p>
<p><code>out = (in − inMin) × (outMax − outMin) / (inMax − inMin) + outMin</code></p>
<p>For a 4–20 mA sensor the raw minimum depends on the channel setting. Channel set to 4–20 mA: 4 mA is already 0. Channel set to 0–20 mA: 4 mA is 5530, so use <code>NORM_X(5530,AIW0,27648,MR0)</code>. Below 4 mA the result goes negative: a good sign of a broken wire.</p>
<div class="tbl"><table>
<tr><th>Software</th><th>How you scale</th></tr>
<tr><td>TIA Portal</td><td>NORM_X + SCALE_X</td></tr>
<tr><td>Studio 5000</td><td>CPT with the formula (SCP on SLC and MicroLogix)</td></tr>
<tr><td>CODESYS, TwinCAT</td><td>The formula in ST, or LIN_TRAFO from the Util library</td></tr>
<tr><td>Schneider, Omron</td><td>The formula in ST, or the scaling block of the analog card</td></tr>
</table></div>

<h3>Back to a whole number: CONV, ROUND, TRUNC</h3>
<p>The HMI, a counter preset or an analog output often needs a whole number again. A REAL does not go into a word by itself: you must say <b>how</b>.</p>
<div class="tbl"><table>
<tr><th>Instruction</th><th>2.4</th><th>2.5</th><th>3.5</th><th>2.9</th><th>−2.9</th></tr>
<tr><td><code>ROUND</code> (and <code>CONV</code>)</td><td>2</td><td>2</td><td>4</td><td>3</td><td>−3</td></tr>
<tr><td><code>TRUNC</code></td><td>2</td><td>2</td><td>3</td><td>2</td><td>−2</td></tr>
</table></div>
<p>Look at 2.5 → 2 and 3.5 → 4: Siemens and Rockwell round a half to the <b>even</b> number. TRUNC just cuts the decimals off.</p>
<p>If you MOV a REAL into a word, the Lab shows a type error, like TIA Portal does. That is a help: silent conversion is a classic bug.</p>

<h3>Four traps with REAL</h3>
<ul>
<li><b>Never compare with "equal".</b> 0.1 added ten times is 1.0000001, not 1.0. Use ≥ and ≤, or a small window with <code>LIM</code>.</li>
<li><b>Only about 7 digits.</b> A totalizer in a REAL stops counting small amounts when it gets big: 16 777 216 + 1 is still 16 777 216. Count in a DINT.</li>
<li><b>Division by zero.</b> NORM_X with min = max divides by zero. In the Lab the PLC stops with an error, like a real CPU can.</li>
<li><b>REAL is not for counting.</b> Parts, steps and indexes stay whole numbers.</li>
</ul>
<div class="callout where"><b>Where:</b> every analog value: level in %, pressure in bar, speed in rpm, PID. The task "Drive on the network 2" uses NORM_X and SCALE_X twice: the speed knob to the drive setpoint, and the actual speed to rpm for the HMI.</div>`,
      sims: {},
      takeaways: ["NORM_X gives 0.0 … 1.0. SCALE_X stretches it to your range.", "A REAL goes into a word only with CONV, ROUND or TRUNC.", "ROUND goes to the nearest whole number (a half goes to the even one). TRUNC cuts.", "Never compare REAL values with \"equal\".", "Count in whole numbers, calculate in REAL."],
      mistakes: ["MOV of a REAL into a word.", "Comparing a REAL with = and waiting for ever.", "A totalizer in a REAL that stops growing.", "NORM_X with min equal to max.", "Forgetting that a 4–20 mA sensor does not start at raw 0."],
      challenges: ["stw-2"],
    },
    {
      id: 'encoders', level: 6, title: 'Encoders and high-speed counters', min: 13,
      summary: 'How a PLC measures length and position exactly: encoder pulses, why normal inputs miss them, the high-speed counter, and how to stop accurately with fast and creep speed.',
      body: `
<h3>What an encoder is</h3>
<p>A disc with slots turns with the shaft; a light sensor gives a <b>pulse</b> for every slot. Count the pulses and you know how far the shaft turned. On a measuring wheel or a feed roll, that is how far the material moved.</p>
<div class="tbl"><table>
<tr><th>Type</th><th>Gives</th><th>Use</th></tr>
<tr><td>Incremental, one track (A)</td><td>pulses</td><td>length, speed, one direction</td></tr>
<tr><td>Incremental, A + B (quadrature)</td><td>pulses + direction (which track comes first)</td><td>position that can go back and forth</td></tr>
<tr><td>Track Z (zero)</td><td>one pulse per revolution</td><td>exact reference for homing</td></tr>
<tr><td>Absolute (SSI, PROFINET, EtherCAT)</td><td>the position itself, as a number</td><td>no homing needed after power loss</td></tr>
</table></div>
<p><b>Resolution</b>: a 1000-pulse encoder on a wheel of 100 mm circumference gives 10 pulses per mm. With quadrature (counting all edges of A and B) you get 4× more.</p>
<h3>Why a normal input is not enough</h3>
<p>A normal input is read once per scan (5 … 20 ms) and has an input filter of a few ms. It can follow perhaps 25 … 50 pulses per second. A strip at 400 mm/s with 10 pulses per mm makes <b>4000 pulses per second</b>: a normal input sees a random pattern and the count is worthless.</p>
<p>A <b>high-speed counter (HSC)</b> counts in hardware, next to the input terminal, at 100 kHz and more. The program just reads its value (HC0 in the Lab, like the S7-200), compares it, and resets or preloads it.</p>
<h3>Stopping accurately</h3>
<ol>
<li><b>Fast</b> until a slow-down point.</li>
<li><b>Creep</b> (slow) for the last few mm: from creep speed the stop is almost instant.</li>
<li><b>Stop</b> at the target count. Then do the work (cut, punch, label).</li>
<li><b>Reset</b> (or preload) the counter at the reference point, e.g. after each cut.</li>
</ol>
<p>Why the creep? At 400 mm/s the drive needs about 18 mm to stop. Without it, every piece is 18 mm too long, and the error changes with the load. For even better accuracy, real systems use the counter's hardware comparison outputs or a positioning drive.</p>
<h3>In the real tools</h3>
<ul>
<li><b>Siemens</b>: the S7-1200 has built-in HSCs (configure in the device view, read the count, control with CTRL_HSC); the S7-1500 uses Technology Modules (TM Count; the compact CPUs 1511C / 1512C have counters built in).</li>
<li><b>Rockwell</b>: CompactLogix embedded or module HSCs (e.g. 1734-VHSC).</li>
<li><b>CODESYS</b>: an encoder input module or an EtherCAT encoder terminal; the count appears as a DINT variable.</li>
</ul>
<div class="callout tip"><b>Counts are DINTs:</b> 10 pulses/mm passes 32 767 after only 3.3 m. Keep counts and positions in 32-bit, or reset at every piece.</div>
<div class="callout where"><b>Where:</b> cut-to-length lines, label positioning, flying shears, palletiser lifts, conveyors with tracking, speed measurement (pulses per second).</div>`,
      sims: {},
      takeaways: ['An encoder gives pulses; pulses per mm turn them into length.', 'Normal inputs miss fast pulses; a high-speed counter counts them in hardware.', 'Fast → creep → stop: accurate whatever the speed.', 'Reset or preload the counter at a known point.', 'Counts are 32-bit.'],
      mistakes: ['Counting encoder pulses with a normal input and CTU.', 'Stopping from full speed and wondering why every piece is too long.', 'Never resetting the counter, so the second piece is wrong.', 'Feeding with the knife (or tool) not in its home position.'],
      challenges: ['enc-1', 'enc-2', 'enc-3'],
    },
    {
      id: 'networks', level: 6, title: 'Networks: PLCs that talk to each other', min: 14,
      summary: 'PROFINET, EtherNet/IP, Modbus and friends. How data from another PLC appears in yours, how to notice a dead link with a heartbeat, and how two machines hand over parts with a handshake.',
      body: `
<h3>Who talks to the PLC</h3>
<ul>
<li><b>Remote I/O and drives</b>: the I/O cards are in the field, the network brings them to the PLC.</li>
<li><b>Other PLCs</b>: two machines in a line exchange "part ready", "ready to receive", recipe numbers.</li>
<li><b>HMIs and SCADA</b>: screens read and write tags.</li>
<li><b>IT and the cloud</b>: production data, often through OPC UA.</li>
</ul>
<div class="tbl"><table>
<tr><th>Network</th><th>Typical with</th><th>Notes</th></tr>
<tr><td>PROFINET</td><td>Siemens</td><td>cyclic I/O data; a PLC can be an "I-Device" for another PLC</td></tr>
<tr><td>EtherNet/IP</td><td>Rockwell</td><td>produced / consumed tags between controllers</td></tr>
<tr><td>Modbus TCP / RTU</td><td>everything</td><td>simple, universal: read and write registers (words) and coils (bits)</td></tr>
<tr><td>EtherCAT</td><td>Beckhoff, motion</td><td>very fast I/O and drives</td></tr>
<tr><td>IO-Link</td><td>sensors</td><td>digital point-to-point link to smart sensors (values, settings, diagnostics)</td></tr>
<tr><td>OPC UA</td><td>SCADA, MES, IT</td><td>structured data with names, security</td></tr>
</table></div>
<h3>How the data appears in your program</h3>
<p>With cyclic networks (PROFINET, EtherNet/IP), the partner's data simply <b>shows up as inputs</b>, refreshed every few ms, and your outputs arrive in the partner. You agree on a <b>transfer area</b>: "my Q8.1 is your I8.1". In the Lab, machine A's signals are I8.0, I8.1 and AIW20, and yours are Q8.0 … Q8.2 and AQW20. With Modbus or messages (Rockwell MSG, Siemens GET / PUT) you send read or write requests instead.</p>
<h3>Heartbeat: is the other side alive?</h3>
<p>When the link breaks, the inputs from the partner usually go to <b>0</b> (or freeze). Your program cannot tell "A has no part" from "the cable is cut". So each side sends a bit that <b>keeps changing</b> (a heartbeat), and each side checks that the partner's heartbeat changes at least every 1 … 3 s. If not: <b>comm fault</b>, stop handshakes, alarm.</p>
[[sim:hb]]
<h3>Handshake: both sides agree</h3>
<div class="tbl"><table>
<tr><th>Step</th><th>A (sender)</th><th>B (receiver, you)</th></tr>
<tr><td>1</td><td>part ready = 1, data valid (part type)</td><td></td></tr>
<tr><td>2</td><td></td><td>ready to receive = 1 (running, empty, link OK)</td></tr>
<tr><td>3</td><td>moves the part</td><td>part arrives at the infeed</td></tr>
<tr><td>4</td><td></td><td>part received = 1</td></tr>
<tr><td>5</td><td>part ready = 0</td><td></td></tr>
<tr><td>6</td><td></td><td>part received = 0 → back to step 1</td></tr>
</table></div>
<p>Each side changes its signal only after it has <b>seen</b> the other side's answer, so nothing depends on timing, and every step can have a <b>timeout</b> alarm. Take the <b>data</b> (part type, recipe) while it is guaranteed valid, at the start of the transfer, and keep it until the part has arrived.</p>
<p>How the bits really travel on each network, with animations: lesson <a href="#lesson-protocols">Industrial communication</a>. Test yourself: <a href="#quiz-net">Quiz → Industrial networks</a> (PROFINET, EtherNet/IP, Modbus, EtherCAT, IO-Link, OPC UA …).</p>
<div class="callout tip"><b>Safety is different:</b> emergency stops and guard doors between machines use safety networks (PROFIsafe, CIP Safety) or hard wiring, never ordinary bits like these.</div>
<div class="callout where"><b>Where:</b> every production line with more than one machine, robots taking parts from machines, drives on PROFINET, a SCADA system reading counters.</div>`,
      sims: { hb: { program: 'NAME Heartbeat watchdog\nRUNG My heartbeat: 1 Hz clock\nNO(SM0.5) COIL(Q8.0)\nRUNG Partner heartbeat stuck at 1 for 2 s …\nNO(I8.0) TON(T1,2s)\nRUNG … or stuck at 0 for 2 s\nNC(I8.0) TON(T2,2s)\nRUNG Comm fault (latched)\nNO(T1) | SET(M0.1)\nNO(T2)\nRUNG RESET when the heartbeat is alive again\nNO(I0.2) NC(T1) NC(T2) RST(M0.1)\nRUNG Comm fault lamp\nNO(M0.1) COIL(Q0.1)', inputs: { 'I8.0': sw('Partner heartbeat (toggle it!)'), 'I0.2': pb('RESET') }, outputs: { 'Q8.0': 'My heartbeat', 'Q0.1': 'Comm fault' }, note: 'You are the partner: flip the heartbeat switch at least every 2 s and all is well. Stop flipping (the "cable is cut") and the comm fault comes. Flip again, then RESET.' } },
      takeaways: ['Partner data appears as inputs and outputs in an agreed transfer area.', 'On link loss, inputs go to 0 or freeze: use a heartbeat to notice.', 'Handshake: each side answers only what it has seen.', 'Take the data while it is valid and keep it.', 'Safety signals between machines use safety networks or wires.'],
      mistakes: ['Treating "input = 0" as "partner has nothing" without checking the heartbeat.', 'Moving a part on a timer instead of waiting for the answer.', 'Reading data after the partner has already dropped "data valid".', 'Sending an E-stop as an ordinary network bit.'],
      challenges: ['comm-1', 'comm-2', 'comm-3'],
    },
    {
      id: 'heartbeat', level: 6, title: 'Heartbeat and communication watchdog', min: 14,
      summary: 'How a PLC proves it is alive with a life word, and how it notices that the other side stopped answering: the echo must keep changing. A simple version with a TON and the industrial version with a stopwatch and a response time.',
      body: `
<p>Two devices talk over a network: your PLC and a remote device (another PLC, a robot, an HMI, a drive). When the cable is pulled or the other side hangs, its data simply <b>stops</b> or reads <b>0</b>. Your program cannot tell "the remote has nothing to say" from "the remote is dead". So you add a <b>heartbeat</b> and a <b>watchdog</b>.</p>
<h3>1. The idea</h3>
<ul>
<li>Your PLC counts a number, the <b>LifeWord</b>, up by 1 every <b>0.1 s</b>: 0, 1, 2 … 599, then 0 again.</li>
<li>The remote device copies it back: the <b>LifeWordReply</b> (an <b>echo</b>).</li>
<li>The PLC watches the echo. If it does <b>not change for more than 1 s</b>, it sets <b>CommError</b>. When it changes again, CommError goes off.</li>
<li>The key point: the PLC does <b>not</b> check reply = LifeWord. It only checks that the reply keeps <b>changing</b>.</li>
</ul>
<p>Switch the remote between OK, frozen, slow and cut. Watch the values, the power flow in both rungs, the GRAFCET step and the CommError trend. Slow motion lets you follow single scans:</p>
[[hw:lifeword]]
<h3>2. Rung 1: the heartbeat, step by step</h3>
<ol>
<li><b>A 0.1 s pulse.</b> A timer that restarts itself: <span class="addr">NC(T9) TON(T9,100ms)</span>. Its done bit is ON for exactly <b>one scan</b> every 0.1 s. (Siemens has a clock memory byte for this, other brands a system clock bit; you then need an edge: P_TRIG / R_TRIG.)</li>
<li><b>On the pulse: LifeWord + 1</b> (INC, or ADD 1).</li>
<li><b>LifeWord ≥ 600: MOVE 0 to LifeWord.</b> 600 × 0.1 s = 1 minute: the value stays small, repeats, and you can still see "it moved".</li>
</ol>
<h3>3. Rung 2: the watchdog (simple version)</h3>
<ol>
<li><b>Change detected:</b> LifeWordReply &lt;&gt; LastReply. In the same rung, <b>MOVE LifeWordReply → LastReply</b>, so the next scan compares with the new value.</li>
<li><b>WatchdogTimer</b>: a TON with PT = 1 s. Its input is <b>NOT changed</b>: it runs while nothing changes, and every change restarts it.</li>
<li><b>WatchdogTimer.Q → SET CommError.</b></li>
<li><b>Change detected → RESET CommError.</b></li>
</ol>
<p>As a GRAFCET it is just two steps:</p>
<div class="tbl"><table>
<tr><th>Step</th><th>Leave it when</th><th>Go to</th></tr>
<tr><td><b>OK</b> (CommError = 0)</td><td>the reply is frozen for more than 1 s</td><td>COMM ERROR</td></tr>
<tr><td><b>COMM ERROR</b> (CommError = 1)</td><td>the reply changes</td><td>OK</td></tr>
</table></div>
<h3>4. The industrial version: a stopwatch</h3>
<p>Library blocks (for example the watchdog blocks of the big brands) use a <b>stopwatch</b> instead of a TON. It gives you one more value: how fast the other side answers.</p>
<ul>
<li>A change: <b>ResponseTime := TimeAcc</b>, then <b>TimeAcc := 0.1</b>.</li>
<li>No change, on every 0.1 s pulse: <b>TimeAcc := TimeAcc + 0.1</b> (stop at 10 s so it cannot run away).</li>
<li><b>TimeAcc &gt; 1.0 → SET CommError</b>; a change resets it.</li>
<li>ResponseTime on a good link: 0.1 to 0.3 s. Growing slowly over the weeks? The network or the remote side is getting overloaded: you see it <b>before</b> it fails.</li>
</ul>
<p>In the Lab tasks the stopwatch counts in tenths of a second in an INT (MW34: 10 = 1.0 s); the Structured Text task uses a real REAL.</p>
<h3>5. Exercises</h3>
<details class="callout tip"><summary><b>1.</b> What happens to CommError if the remote answers only every 2 s?</summary><p>It <b>blinks</b>: after 1 s without a change it comes on, at the next answer (after 2 s) it goes off, and so on. A blinking comm alarm means "slow", a steady one means "dead". Try "Remote slow" above.</p></details>
<details class="callout tip"><summary><b>2.</b> Why 600?</summary><p>600 × 0.1 s = 1 minute. The value stays small (it fits any INT and is easy to read on an HMI), it repeats, and every value is different from the last one: that is all the watchdog needs.</p></details>
<details class="callout tip"><summary><b>3.</b> Why check "changed" and not "equal"?</summary><p>The echo always arrives a little <b>late</b> (transport delay, bus cycle, the other program's scan). When it arrives, your LifeWord has already moved on. "Reply = LifeWord" would be false almost all the time, even on a perfect link. "The reply keeps changing" is true exactly when the other side is alive.</p></details>
<p><b>4.</b> Add a second watchdog for another data channel: task <a href="#ch-hb-two">Heartbeat 4/4</a>. <b>5.</b> The same logic in Structured Text: task <a href="#ch-st-hb">ST: heartbeat and watchdog</a>. Compare: in ST the whole watchdog is one IF … ELSIF.</p>
<h3>6. Real project: a water tower over a radio link</h3>
<p>The pump is at the PLC; the tower is 3 km away, and its level comes back by radio with the echo. Without a watchdog, a frozen link keeps showing the old level: the pump runs on and the tower <b>overflows</b>. A cut cable is worse: the level reads 0 = "empty", so the level control <b>wants</b> the pump. Build it in task <a href="#ch-hb-tower">Project: water tower over a radio link</a>:</p>
<ul>
<li>CommError <b>stops the pump</b> and drops auto: data that is not fresh must not drive anything.</li>
<li>CommError is <b>latched</b>: RESET only works while the link is alive, then the operator presses START. No surprise restart.</li>
<li>An <b>early warning</b> from the response time (slower than 0.5 s), before the link really fails.</li>
</ul>
<h3>7. The expert level</h3>
<ul>
<li><b>Choose the watchdog time</b> from the update time: about 3 to 5 × the normal answer time. Too short gives false alarms, too long reacts late.</li>
<li><b>What the data does on an error</b>: keep the last value, go to a <b>safe substitute value</b> (valve closed, speed 0), or stop the function. Decide it per signal, write it in the I/O list.</li>
<li><b>Both directions</b>: the remote side must watch <b>your</b> life word too, and go safe on its own when your PLC stops.</li>
<li><b>Diagnostics</b>: count the errors, store the longest silence and the worst response time, show them on the HMI. A link that gets slower week after week is a cable, a switch or a radio that is failing.</li>
<li><b>Built-in help</b>: PROFINET and EtherNet/IP devices have their own connection timeout and status bits (device OK, connection faulted). Use them too, but the life word also proves that the <b>program</b> on the other side runs, not only the network card.</li>
<li><b>Safety</b>: a life word is not a safety function. For E-stops and guards over a network use a safety protocol (PROFIsafe, CIP Safety, FSoE): they add a counter, a CRC and a watchdog, certified.</li>
</ul>
<div class="callout warn"><b>What to do on CommError:</b> the data from the remote side is old. Stop using it: stop the movements that depend on it, hold or go to a safe state, show the alarm. Comm watchdogs are not safety functions; safety over a network needs a safety protocol (PROFIsafe, CIP Safety, FSoE).</div>
<div class="callout where"><b>Where:</b> PLC to PLC links, PLC to robot, PLC to HMI or SCADA, drives on a fieldbus, remote I/O, anything that talks over a cable or Wi-Fi.</div>
`,
      sims: {},
      takeaways: ['LifeWord: +1 every 0.1 s, 0..599. The remote echoes it.', 'Watch that the echo keeps CHANGING; never compare it with LifeWord (it is always late).', 'No change for more than 1 s: CommError. A change: OK again. A blinking CommError means a slow link.', 'A stopwatch instead of a TON also gives the response time.'],
      mistakes: ['Checking reply = LifeWord: false on a perfect link because of the transport delay.', 'A heartbeat bit that is always 1 when the cable is pulled (the input freezes at its last value): watch for a change, not for a value.', 'Using the remote data after CommError as if it were fresh.'],
      challenges: ['hb-life', 'hb-watch', 'hb-stopwatch', 'hb-two', 'hb-tower', 'st-hb', 'comm-1'],
    },
    {
      id: 'protocols', level: 6, title: "Industrial communication: how the data really travels", min: 20,
      summary: "Serial RS-232 / RS-485, Modbus, PROFIBUS, CAN, CANopen, DeviceNet, LIN, AS-i, HART, IO-Link, PROFINET, EtherNet/IP, EtherCAT, OPC UA and MQTT: what happens on the wire, how they differ, and which one to use when, with step-by-step animations.",
      body: `
<h3>The big picture</h3>
<p>Every network does the same job: move bits from one device to another. They differ in <b>the cable</b>, <b>who may talk when</b>, <b>how fast</b>, and <b>what the bytes mean</b>. Think of four floors:</p>
<div class="tbl"><table>
<tr><th>Floor</th><th>Job</th><th>Typical networks</th></tr>
<tr><td>IT / cloud</td><td>production data, recipes, dashboards</td><td>OPC UA, MQTT</td></tr>
<tr><td>Controllers and field devices</td><td>I/O, drives, other PLCs, every few ms</td><td>PROFINET, EtherNet/IP, EtherCAT, Modbus TCP</td></tr>
<tr><td>Older fieldbuses</td><td>the same job on serial cables, still in many plants</td><td>PROFIBUS, CANopen, DeviceNet, Modbus RTU</td></tr>
<tr><td>Sensor level</td><td>one sensor or a few simple ones</td><td>IO-Link, AS-Interface, HART, LIN (cars)</td></tr>
</table></div>

<h3>1. The bits: serial communication (UART, RS-232, RS-485)</h3>
<p>The oldest and simplest way: send a byte as a row of bits, one after the other, on one wire. A <b>UART</b> chip in each device does this. There is no clock wire, so both sides must agree on the <b>baud rate</b> (bits per second) and the format, e.g. <b>19200 8E1</b> = 19200 baud, 8 data bits, Even parity, 1 stop bit. Change one setting on one side and you only get garbage.</p>
[[comm:serial]]
<div class="tbl"><table>
<tr><th></th><th>RS-232</th><th>RS-485</th></tr>
<tr><td>Devices</td><td>2 (point to point)</td><td>up to 32 on one pair (more with repeaters)</td></tr>
<tr><td>Length</td><td>about 15 m</td><td>up to about 1200 m (slower = longer)</td></tr>
<tr><td>How a bit is sent</td><td>voltage against ground (+12 V / −12 V)</td><td>difference between two wires A and B: noise hits both and cancels</td></tr>
<tr><td>Typical use</td><td>barcode reader, printer, scale, old devices, service ports</td><td>Modbus RTU, PROFIBUS DP, many drives and meters</td></tr>
<tr><td>Must do</td><td>TX of one side to RX of the other (crossed)</td><td>a daisy chain (no star), termination at both ends</td></tr>
</table></div>
<p>RS-422 sits in between: like RS-485 but one sender and up to 10 receivers. RS-232, RS-422 and RS-485 only define the <b>electrical</b> part; Modbus RTU, PROFIBUS and others define what the bytes mean.</p>

<h3>2. Who may talk? Polling (Modbus RTU)</h3>
<p>One shared pair of wires: if two devices talk at once, both messages are destroyed. The simplest rule: <b>one master asks, one slave answers</b>.</p>
[[comm:poll]]
<p>Easy and universal: almost every meter, temperature controller and drive speaks Modbus. The price: the master must ask for everything, one device after the other, and a dead slave costs a full timeout every round.</p>

<h3>3. Token passing (PROFIBUS DP)</h3>
<p>PROFIBUS also uses RS-485 signals, up to 12 Mbit/s, but with its own cable (purple, 150 Ω) and its own termination, switched on in the plug at both ends, and allows several masters: they pass a token. Each master polls its own slaves in a fixed order, so the cycle time is the same every time.</p>
[[comm:token]]
<p>PROFIBUS PA is the process version (same protocol, slower, power and data on two wires, allowed in explosive areas). Typical: older Siemens plants, process instruments.</p>

<h3>4. Arbitration (CAN, CANopen, DeviceNet)</h3>
<p>CAN was invented for cars: no master, any node may talk, and a clever rule decides who wins when two start together, without losing any time.</p>
[[comm:can]]
<div class="tbl"><table>
<tr><th></th><th>CANopen</th><th>DeviceNet</th><th>J1939</th></tr>
<tr><td>Built on</td><td>CAN</td><td>CAN (+ 24 V power in the same cable)</td><td>CAN</td></tr>
<tr><td>Speed / size</td><td>up to 1 Mbit/s (short), 127 nodes</td><td>125–500 kbit/s, 64 nodes</td><td>250 / 500 kbit/s</td></tr>
<tr><td>Where</td><td>drives, robots, medical, mobile machines</td><td>older Rockwell plants: valves, sensors, starters</td><td>trucks, tractors, construction machines</td></tr>
</table></div>
<p>CAN needs 120 Ω at both ends of the bus. With power off you measure about 60 Ω between CAN-H and CAN-L when both are there.</p>

<h3>5. Header and response (LIN)</h3>
<p>LIN is the cheap little brother of CAN, for cars: one wire, slow, one master. You will rarely program it in a factory, but you meet it in automotive jobs and in some machine sub-modules.</p>
[[comm:lin]]

<h3>6. Cyclic exchange through switches (PROFINET, EtherNet/IP)</h3>
<p>Ethernet changed everything: full-duplex cables and switches mean there is no shared wire to fight over. Each device gets its own conversation, and data simply flows every cycle.</p>
[[comm:cyclic]]
<p>PROFINET (Siemens and many others) finds devices by name; EtherNet/IP (Rockwell, Omron and others) uses CIP connections with an RPI. In your program both look the same: the device's data is just inputs and outputs, updated every few ms. Modbus TCP also runs on Ethernet but stays client / server: the PLC still asks for every value.</p>

<h3>7. One frame for everyone (EtherCAT)</h3>
<p>EtherCAT goes the other way: instead of one packet per device, one frame visits every device.</p>
[[comm:ethercat]]
<p>Others you may meet with the same goal (fast, synchronised motion): <b>Sercos III</b> (Bosch Rexroth), <b>POWERLINK</b> (B&amp;R), <b>CC-Link IE</b> (Mitsubishi), PROFINET IRT.</p>

<h3>8. Sensor level: IO-Link, AS-Interface, HART</h3>
<ul>
<li><b>IO-Link</b>: one smart sensor on one port of an IO-Link master, normal 3-wire cable. Values, settings and diagnostics instead of only on / off. Not a bus: point to point.</li>
<li><b>AS-Interface (AS-i)</b>: a yellow two-wire flat cable carrying power AND data to up to 62 simple sensors, buttons and valves; the master polls them all in about 5–10 ms. Cheap wiring for many simple devices.</li>
<li><b>HART</b>: a small digital signal riding on top of a 4–20 mA loop (process instruments). The 4–20 mA still carries the main value; HART adds settings, diagnostics and extra values on the same two wires.</li>
</ul>

<h3>9. Up to SCADA, MES and the cloud: OPC UA and MQTT</h3>
[[comm:pubsub]]

<h3>All of them side by side</h3>
<div class="tbl"><table>
<tr><th>Network</th><th>Cable</th><th>Speed</th><th>Who may talk</th><th>Typical use</th></tr>
<tr><td>RS-232</td><td>3+ wires</td><td>≤ 115 kbit/s</td><td>point to point</td><td>barcode reader, printer, scale</td></tr>
<tr><td>Modbus RTU</td><td>RS-485 pair</td><td>9.6–115 kbit/s</td><td>master polls</td><td>meters, controllers, drives, any brand</td></tr>
<tr><td>PROFIBUS DP</td><td>RS-485 (purple)</td><td>≤ 12 Mbit/s</td><td>token + polling</td><td>older Siemens plants</td></tr>
<tr><td>CANopen</td><td>CAN pair</td><td>≤ 1 Mbit/s</td><td>arbitration</td><td>drives, mobile machines</td></tr>
<tr><td>DeviceNet</td><td>CAN + 24 V</td><td>≤ 500 kbit/s</td><td>arbitration</td><td>older Rockwell plants</td></tr>
<tr><td>LIN</td><td>1 wire</td><td>≤ 19.2 kbit/s</td><td>master schedule</td><td>car windows, mirrors, seats</td></tr>
<tr><td>AS-i</td><td>yellow flat cable</td><td>~5 ms cycle</td><td>master polls</td><td>many simple sensors and buttons</td></tr>
<tr><td>IO-Link</td><td>3-wire sensor cable</td><td>≤ 230 kbit/s</td><td>point to point</td><td>smart sensors</td></tr>
<tr><td>Modbus TCP</td><td>Ethernet</td><td>100 Mbit/s</td><td>client asks</td><td>simple third-party devices, SCADA</td></tr>
<tr><td>PROFINET</td><td>Ethernet (green)</td><td>100 Mbit/s, ms / µs</td><td>cyclic, producer / consumer</td><td>Siemens world, everything</td></tr>
<tr><td>EtherNet/IP</td><td>Ethernet</td><td>100 Mbit/s, ms</td><td>cyclic, producer / consumer</td><td>Rockwell world, Omron PLC-to-PLC</td></tr>
<tr><td>EtherCAT</td><td>Ethernet, line</td><td>100 Mbit/s, µs</td><td>one frame through all</td><td>fast I/O and motion (Beckhoff, Omron)</td></tr>
<tr><td>OPC UA</td><td>Ethernet / IT</td><td>slow (100 ms+)</td><td>client / server, pub / sub</td><td>SCADA, MES, IT</td></tr>
<tr><td>MQTT</td><td>Ethernet / internet</td><td>slow</td><td>publish / subscribe via broker</td><td>cloud, dashboards, IIoT</td></tr>
</table></div>

<h3>Which one when? (in plain words)</h3>
<ul>
<li><b>The PLC brand usually chooses for you</b>: Siemens → PROFINET, Rockwell → EtherNet/IP, Beckhoff → EtherCAT, Omron → EtherCAT for devices and EtherNet/IP between PLCs.</li>
<li><b>Many servo axes that must move together</b> → EtherCAT, PROFINET IRT or Sercos.</li>
<li><b>A device from another brand with only basic communication</b> (energy meter, temperature controller, old drive) → Modbus RTU or Modbus TCP.</li>
<li><b>Smart sensors</b> → IO-Link. <b>Hundreds of simple on / off devices</b> → remote I/O, or AS-i.</li>
<li><b>An older plant</b> → keep its PROFIBUS / DeviceNet / CANopen, or connect it with a <b>gateway</b> (a box that translates one network to another).</li>
<li><b>A barcode reader, printer or scale with a serial port</b> → RS-232 / RS-485 with a serial communication module.</li>
<li><b>Data to SCADA, MES, databases</b> → OPC UA. <b>To the cloud</b> → MQTT (or OPC UA).</li>
<li><b>Safety signals between machines</b> → PROFIsafe, CIP Safety or FSoE, never ordinary bits.</li>
</ul>

<h3>What you do as the PLC programmer</h3>
<ol>
<li>Install the device description file (GSDML, EDS, ESI, IODD …).</li>
<li>Add the device in the hardware configuration and give it its identity: address, name or IP.</li>
<li>Set the update time (cycle, RPI, baud rate).</li>
<li>Use its data in the program: it appears as inputs and outputs, or you call a read / write block (Modbus, serial, MSG).</li>
<li>Watch the health: status bits, diagnostics, a heartbeat or a watchdog, and an alarm when it fails.</li>
</ol>
<div class="callout tip"><b>The five most common network faults:</b> wrong address / name / IP, wrong or missing termination, baud or format not the same on both sides, a broken or badly shielded cable near motor cables, and two devices with the same address.</div>
<div class="callout where"><b>Where:</b> every machine with more than a few devices. Practise with <b>Modbus 1</b> and <b>Modbus 2</b>, and test yourself in <a href="#quiz-net">Quiz → Industrial networks</a>.</div>`,
      sims: {},
      takeaways: ["Every network answers: which cable, who may talk when, how fast, what the bytes mean.", "Serial lines need the same baud and format on both sides; RS-485 needs a daisy chain and termination.", "Polling (Modbus), token (PROFIBUS), arbitration (CAN), cyclic exchange (PROFINET, EtherNet/IP), one frame for all (EtherCAT), publish / subscribe (MQTT).", "The PLC brand often chooses the network; Modbus connects almost anything; OPC UA and MQTT carry data up to IT."],
      mistakes: ["Different baud rate or parity on one device.", "A star instead of a daisy chain on RS-485 / CAN / PROFIBUS, or termination missing or at the wrong place.", "Two devices with the same address, name or IP.", "Bus cables next to motor cables, shields not connected.", "Using OPC UA or MQTT for fast machine I/O."],
      challenges: ["mb-1", "mb-2"],
    },
    {
      id: 'triggers-advanced', level: 5, title: 'Triggers in practice: clicks, bounce and changes', min: 12,
      summary: 'Real signals are not clean. Debounce contacts before taking an edge, detect a change of a value with a deadband, act once when entering a step, and give one button several commands.',
      body: `
<h3>Contact bounce</h3>
<p>A mechanical contact does not close cleanly: the metal springs back and the contact opens and closes several times within a few ms. A fast PLC sees several edges for one press. Worn buttons, limit switches and relay contacts all do it; photo-eyes on shiny or uneven parts flicker in the same way.</p>
<p><b>Fix: filter first, then take the edge.</b> NO(input) TON(T,50ms) is only done when the signal has been steady for 50 ms; then use P(T). The filter time must be longer than the longest single bounce, and short enough that nobody notices.</p>
<h3>Change of a value</h3>
<p>A trigger can also be "this number has changed": the operator turned a knob, a recipe number changed, a step number moved on. Keep a copy of the value; when the value differs from the copy, act and update the copy in the same rung. The difference disappears, so the trigger lasts exactly one scan.</p>
<p>Analog values always move a little (noise). Compare with a <b>deadband</b>: only a difference bigger than, say, 200 counts is a change. The copy is the value at the last logged change, not the value of the last scan, so slow drift is caught as well.</p>
[[sim:cov]]
<h3>Do it once when entering a step</h3>
<p>In a sequence, P on a step bit runs something once when the step becomes active: reset a timer, store a time stamp, count a cycle, send a message. The same with N when leaving a step.</p>
<h3>One button, several commands</h3>
<div class="tbl"><table>
<tr><th>Gesture</th><th>How to recognise it</th></tr>
<tr><td>Long press</td><td>TON on the button; act on P of the timer (at the moment the time is reached) and remember "this press was long"</td></tr>
<tr><td>Short click</td><td>N of the button while the press was not long; then wait</td></tr>
<tr><td>Double click</td><td>P of the button while still waiting after a short click</td></tr>
<tr><td>Single click confirmed</td><td>the waiting timer ran out without a second press</td></tr>
</table></div>
<p>A single click can only be confirmed after the double-click window: that small delay is the price of having both.</p>
<h3>Shorter than a scan</h3>
<p>An edge needs the PLC to see the signal at least once. A pulse shorter than the scan time can fall between two scans and be lost. For fast signals use a high-speed counter, a hardware interrupt (e.g. a TIA Portal hardware interrupt OB), or the "pulse catch" option of the input card.</p>
<div class="callout where"><b>Where:</b> old operator panels, limit switches, mechanical counters, HMI setpoints that must be logged for quality, recipe changes, sequences that write a record per cycle, single-button devices.</div>`,
      sims: { cov: { program: 'NAME Change of value with a deadband\nRUNG At power-up: the current value is the reference\nNO(SM0.1) MOV(AIW0,MW12)\nRUNG Distance from the last logged value\nNO(SM0.0) SUB(AIW0,MW12,MW14)\nRUNG A real change: more than 2000 counts up or down\nCMP(MW14>2000) | COIL(M0.0)\nCMP(MW14<-2000)\nRUNG Log it: count, new reference, lamp for 2 s\nNO(M0.0) ~ | ADD(MW20,1,MW20)\n. . . . . . | MOV(AIW0,MW12)\nTP(T0,2s)\nRUNG Changed lamp\nNO(T0) COIL(Q0.0)', inputs: { 'AIW0': { name: 'Knob', kind: 'ana', min: 0, max: 27648, value: 13824 } }, outputs: { 'Q0.0': 'Changed' }, note: 'Move the knob a little: nothing. Move it more than 2000 counts away from MW12 (the last logged value): MW20 counts once and the lamp lights for 2 s.' } },
      takeaways: ['Bouncing contacts give several edges: filter first, then take the edge.', 'Change of value: compare with a stored copy and update it in the same rung.', 'Use a deadband on analog values.', 'P on a step bit = do it once when entering the step.', 'A pulse shorter than a scan can be missed.'],
      mistakes: ['Taking the edge of a raw, bouncing contact.', 'Comparing an analog value with its last-scan value (noise triggers all the time).', 'A debounce time shorter than the bounce.', 'Expecting to catch a 2 ms pulse with a 10 ms scan.'],
      challenges: ['trig-click', 'trig-bounce', 'trig-change'],
    },
    {
      id: 'motion', level: 5, title: 'Motion control: servo motors from ladder', min: 15,
      summary: 'Yes, a PLC drives servo motors from ladder. What a servo is, the three ways a PLC commands one, the axis, homing, and the motion instructions (PLCopen MC_… and Rockwell M…) with their Done / Busy / Error handshake.',
      body: `
<h3>What a servo is</h3>
<p>A <b>servo axis</b> is three things: a motor, a <b>position sensor</b> on it (an encoder), and a <b>servo drive</b> that compares where the motor is with where it should be, thousands of times per second, and corrects. The result: the axis goes exactly to 350.0 mm, at exactly the speed you ask, with smooth acceleration, and holds there.</p>
<div class="tbl"><table>
<tr><th></th><th>Contactor motor</th><th>VFD (inverter)</th><th>Servo</th></tr>
<tr><td>Controls</td><td>on / off</td><td>speed</td><td>position, speed and torque</td></tr>
<tr><td>Stops at a position</td><td>no (needs sensors, overshoots)</td><td>roughly, with sensors or an encoder</td><td>exactly (0.01 mm)</td></tr>
<tr><td>Typical use</td><td>pumps, fans</td><td>conveyors, mixers</td><td>pick and place, cut to length, robots, packaging</td></tr>
</table></div>
<h3>Can I really do it in ladder?</h3>
<p>Yes. Every big brand has motion instructions in ladder. Three ways, from cheap to powerful:</p>
<ol>
<li><b>Pulse train (PTO)</b>: the PLC sends step pulses and a direction signal to a stepper or a simple servo drive (S7-1200, many compact PLCs). Each pulse = a small step.</li>
<li><b>A drive that positions by itself</b>: the PLC sends a target and a start bit over the network (for example SINAMICS with EPOS); the drive does the rest.</li>
<li><b>Motion instructions on an axis</b>: the PLC runs the axis (a <b>technology object</b> in TIA Portal, an <b>axis tag</b> in Studio 5000, a SoftMotion axis in CODESYS) and talks to the drive over PROFINET, EtherNet/IP or EtherCAT. This is what PLC Start simulates.</li>
</ol>
<h3>The axis</h3>
<p>You configure the axis once: units (mm), how many encoder counts are one mm, maximum speed and acceleration, <b>software limits</b> (here 0 … 600 mm). After that your program only speaks mm and mm/s. The axis also tells you its state: <code>AX0.POS</code> (mm), <code>AX0.VEL</code>, <code>AX0.ON</code>, <code>AX0.HOMED</code>, <code>AX0.MOVING</code>, <code>AX0.ERR</code>.</p>
<h3>Homing</h3>
<p>An incremental encoder only counts: after power-up the axis does not know where it is. <b>Homing</b> moves slowly to a reference switch and calls that point 0. Until the axis is homed, the software limits are not active. In TIA Portal an absolute move is then refused; in other systems it may run and go to a wrong place, so always check the homed bit in your own rung. With several axes, home them in a <b>safe order</b> (the gripper up first, then the horizontal axis).</p>
<h3>The instructions, in every brand</h3>
<div class="tbl"><table>
<tr><th>Job</th><th>PLC Start</th><th>TIA Portal / CODESYS (PLCopen)</th><th>Studio 5000</th></tr>
<tr><td>Switch the drive on</td><td>MC_POWER(AX0)</td><td>MC_Power</td><td>MSO (off: MSF)</td></tr>
<tr><td>Homing</td><td>MC_HOME(MC0,AX0,switch)</td><td>MC_Home</td><td>MAH</td></tr>
<tr><td>Go to a position</td><td>MC_ABS(MC1,AX0,pos,vel)</td><td>MC_MoveAbsolute</td><td>MAM (absolute)</td></tr>
<tr><td>Move a distance</td><td>MC_REL(MC2,AX0,dist,vel)</td><td>MC_MoveRelative</td><td>MAM (incremental)</td></tr>
<tr><td>Jog while a button is held</td><td>MC_JOG(AX0,vel)</td><td>MC_MoveJog / MC_Jog</td><td>MAJ, then MAS</td></tr>
<tr><td>Stop</td><td>MC_STOP(MC3,AX0)</td><td>MC_Stop / MC_Halt</td><td>MAS</td></tr>
<tr><td>Clear an error</td><td>MC_RESET(MC4,AX0)</td><td>MC_Reset</td><td>MAFR</td></tr>
<tr><td>Status of a command</td><td>MC1.DONE, .BUSY, .ERR, .ABORT</td><td>Done, Busy, Error, CommandAborted</td><td>.PC (finished), .IP (moving), .ER (.DN only means: accepted)</td></tr>
</table></div>
[[sim:servo]]
<h3>The handshake: Execute, Busy, Done</h3>
<ul>
<li>A move <b>starts on the rising edge</b> of its rung (Execute). Holding the rung true does not start it again; the rung must go false and true again.</li>
<li><b>BUSY</b> while it moves, <b>DONE</b> when it has arrived, <b>ERR</b> if it was refused or failed, <b>ABORT</b> if another command on the same axis took over.</li>
<li>DONE / ERR stay on while the rung is true and clear when it goes false (PLCopen). In Studio 5000, .DN only means the move was accepted: use .PC (process complete) as the Done of the move.</li>
<li>Give every motion instruction its <b>own command tag</b> (MC0, MC1, …). Two instructions with the same tag mix up their DONE bits.</li>
</ul>
<div class="callout tip"><b>Safety:</b> MC_Stop is not an emergency stop. Emergency stops and guard doors switch the drive's <b>STO</b> (Safe Torque Off) input through a safety relay or safety PLC.</div>
<div class="callout where"><b>Where:</b> pick and place, palletisers, cut-to-length and flying saws, labelling and packaging machines, CNC loaders, any axis that must stop exactly.</div>`,
      sims: { servo: { program: 'NAME One servo axis (no plant: the reference switch is always on)\nRUNG Servo on\nNO(I0.4) MC_POWER(AX0)\nRUNG Homing: here the reference switch is always reached at once\nP(I0.0) MC_HOME(MC0,AX0,SM0.0)\nRUNG Go to 300 mm at 150 mm/s\nP(I0.1) MC_ABS(MC1,AX0,300,150)\nRUNG Back to 0 mm\nP(I0.2) MC_ABS(MC2,AX0,0,150)\nRUNG Show the position in MW0\nNO(SM0.0) MOV(AX0.POS,MW0)\nRUNG Ready lamp\nNO(AX0.ON) NO(AX0.HOMED) COIL(Q0.0)\nRUNG Moving lamp\nNO(AX0.MOVING) COIL(Q0.1)', inputs: { 'I0.4': sw('Servo on'), 'I0.0': pb('Home'), 'I0.1': pb('Go 300 mm'), 'I0.2': pb('Go 0 mm') }, outputs: { 'Q0.0': 'Ready', 'Q0.1': 'Moving' }, note: 'Servo on, then try "Go 300 mm": refused (not homed: watch the box say ERR). Home, then go to 300 and back: MW0 shows the position ramping up and down.' } },
      takeaways: ['A servo = motor + encoder + drive: exact position and speed.', 'Ladder drives it with motion instructions: MC_Power, MC_Home, MC_MoveAbsolute … (Rockwell MSO, MAH, MAM …).', 'Home before absolute moves; home axes in a safe order.', 'A move starts on the rising edge; watch BUSY, DONE, ERR.', 'One command tag per instruction. Emergency stop = STO, not MC_Stop.'],
      mistakes: ['Holding Execute true and expecting a second move to start.', 'Moving to an absolute position before homing.', 'Two motion instructions sharing one command tag.', 'Using MC_Stop as the emergency stop.'],
      challenges: ['mo-1', 'mo-2', 'mo-3'],
    },
    {
      id: 'servo-hmi', level: 6, title: 'Servo setup from the HMI: manual mode, homing, teach-in', min: 13,
      summary: 'How machines let an operator jog a servo, give it its home position, teach positions and set speeds on a touch panel, and how the PLC program behind that screen works.',
      body: `
<h3>How an HMI talks to the PLC</h3>
<p>A touch panel does not have wires to the PLC inputs. It reads and writes PLC <b>memory</b> over the network:</p>
<ul>
<li>A <b>button</b> writes a bit: 1 while touched, 0 when released (a "momentary" button). Your program treats it like a push button, but it is an M bit or a bit in a data block, not an I address.</li>
<li>A <b>number field</b> writes a word when the operator types a value (jog speed, a position, a home value).</li>
<li><b>Displays and lamps</b> only read: position, mode, "homed", error text.</li>
</ul>
<p>In TIA Portal the HMI tags point at PLC tags or DB variables, in Studio 5000 (FactoryTalk View) at controller tags, in CODESYS (visualisation or a panel) at variables. The idea is the same everywhere. Emergency stops never go through the HMI: they are wired.</p>
<h3>A typical axis screen</h3>
<div class="tbl"><table>
<tr><th>Element</th><th>What the program does</th></tr>
<tr><td>MAN / AUTO</td><td>set a mode bit. Manual commands work only in MAN; changing mode stops the cycle</td></tr>
<tr><td>ENABLE</td><td>toggles the servo on / off (MC_Power)</td></tr>
<tr><td>JOG + / JOG −</td><td>MC_Jog while touched, at the jog speed (slow!)</td></tr>
<tr><td>HOME</td><td>reference search with the home switch (MC_Home)</td></tr>
<tr><td>SET HOME</td><td>"this is the home position", here, without moving (MC_SetPosition)</td></tr>
<tr><td>TEACH P1, P2 …</td><td>copy the present position into a parameter</td></tr>
<tr><td>GO P1, P2 …</td><td>move there at the move speed (MC_MoveAbsolute)</td></tr>
<tr><td>RESET</td><td>clear the axis error (MC_Reset)</td></tr>
<tr><td>Status</td><td>position, ON, HOMED, ERROR and the error text</td></tr>
</table></div>
<h3>Ways to give an axis its home</h3>
<div class="tbl"><table>
<tr><th>Method</th><th>How</th><th>TIA Portal</th><th>Studio 5000</th><th>When</th></tr>
<tr><td>Reference switch search</td><td>the axis drives slowly to a switch and calls that point home</td><td>MC_Home mode 3 (active)</td><td>MAH (active)</td><td>incremental encoder, free travel</td></tr>
<tr><td>Set home here (direct)</td><td>jog to a mark or a pin, touch SET HOME: the present position becomes the home value</td><td>MC_Home mode 0 (direct absolute)</td><td>MRP (redefine position)</td><td>no switch, setting up a new machine, after a mechanical repair</td></tr>
<tr><td>Absolute encoder</td><td>the encoder always knows its position; set the offset once at commissioning</td><td>absolute encoder adjustment (MC_Home mode 7)</td><td>MRP once, kept by the drive</td><td>no homing after every power-up</td></tr>
</table></div>
<p>The <b>home value</b> is the position the axis should have at that point. If the mark on the machine is at 250 mm, enter 250 and touch SET HOME there.</p>
<h3>Teach-in</h3>
<p>Instead of measuring positions with a ruler, the setter jogs the axis to exactly the right spot and touches TEACH: the program copies <code>AX0.POS</code> into the position word. Only allow it when the axis is homed: a position of an unhomed axis means nothing. Show the taught values on the screen, so they can also be corrected by typing.</p>
<h3>Parameters</h3>
<ul>
<li>Give every parameter a sensible default and a check: no speed above the maximum, no position outside the travel.</li>
<li>Keep them through a power cut: retentive memory (TIA Portal: "Retain" in the DB; Studio 5000: tags keep their values; CODESYS: VAR RETAIN / PERSISTENT).</li>
<li>Jog slowly: the setter is standing next to the machine.</li>
</ul>
<div class="callout where"><b>Where:</b> every servo machine has such a screen: on packaging machines, palletisers, labellers, cut-to-length lines and pick-and-place units. It is where a maintenance technician spends most of their time with an axis.</div>`,
      sims: {},
      takeaways: ['HMI buttons write bits, number fields write words, displays read.', 'Manual commands only in MAN; changing mode stops the cycle.', 'Home by a switch search, by "set home here", or once with an absolute encoder.', 'Teach = copy the present position into a parameter, only when homed.', 'Parameters need defaults, limits and retentive memory.'],
      mistakes: ['Letting JOG work in AUTO.', 'Teaching before homing.', 'An ENABLE button that toggles every scan while it is touched.', 'Emergency stop on the touch panel.'],
      challenges: ['sv-1', 'sv-2', 'sv-3'],
    },
    {
      id: 'motion-practice', level: 6, title: 'Motion in practice: sequences, collisions and faults', min: 12,
      summary: 'Build a multi-axis cycle with steps and motion instructions, keep axes from colliding, choose absolute or relative moves, and recover from a drive fault without dropping the part.',
      body: `
<h3>A motion sequence</h3>
<p>Use the step method you already know: one memory bit per step. In each step one (or more) motion instructions start, triggered by the step bit; the transition to the next step waits for their <b>DONE</b>.</p>
<pre class="code">NO(M10.4) MC_ABS(MC4,AX1,0,300)         step 4: Z up
NO(M10.4) NO(MC4.DONE) → SET M10.5, RST M10.4
NO(M10.5) MC_ABS(MC5,AX0,350,500)       step 5: X to the box</pre>
<p>Put the motion rungs <b>above</b> the transition rungs, and a "done → reset request" rung above the move it resets, so every new step gives its move a clean rising edge.</p>
<h3>Collisions: the program is the only thing in the way</h3>
<p>A servo does what it is told, with a lot of force. Two axes started in the same step move at the same time. That is fast, but only safe if the path is free. Typical rules:</p>
<ul>
<li>Horizontal moves only with the gripper at a <b>safe height</b> (wait for Z DONE, or check AX1.POS &lt; 40 mm).</li>
<li>Home vertical axes first.</li>
<li>Check targets before moving: the software limits catch the worst, but not a box in the way.</li>
</ul>
<h3>Absolute or relative?</h3>
<p><b>Absolute</b> (MC_MoveAbsolute): "go to 350 mm". Repeatable, needs homing. Use it for stations. <b>Relative</b> (MC_MoveRelative): "move 50 mm from here". Use it for indexing a feed or stepping along a row; small errors add up, so re-home or use absolute moves for the reference points.</p>
<h3>Positions from data</h3>
<p>Positions do not have to be fixed numbers: move to a word (MW12). Fill it from a recipe, the HMI, or a decision (metal → 350, plastic → 550). One move instruction then serves every variant.</p>
<h3>Faults: hold, keep, resume</h3>
<ol>
<li>A drive fault (overload, following error, jam) puts the axis in <b>error</b>: it stops and refuses commands.</li>
<li>Hold the sequence where it is. Do <b>not</b> drop what the gripper holds: the vacuum stays on.</li>
<li>After the repair: <b>MC_Reset</b> clears the error, START continues. A "hold" contact in every motion rung makes the rung go false during the fault and true again on START: a fresh rising edge restarts the interrupted move.</li>
</ol>
<div class="callout where"><b>Where:</b> every multi-axis machine: gantries, palletisers, pick and place, labellers, case packers. These patterns are the same in TIA Portal, Studio 5000 and CODESYS.</div>`,
      sims: {},
      takeaways: ['Steps start moves; transitions wait for DONE.', 'Motion rungs above transitions: every move gets a clean rising edge.', 'Move horizontally only at a safe height; home vertical axes first.', 'Absolute for stations, relative for steps; positions can come from words.', 'On a fault: hold, keep the part, reset, resume.'],
      mistakes: ['Starting X and Z in the same step without a free path.', 'Restarting a move by keeping its rung true.', 'Dropping the part when an axis faults.', 'Long chains of relative moves without a reference.'],
      challenges: ['mo-4', 'bug-mo-crash', 'mo-5'],
    },
    {
      id: 'interview-prep', level: 6, title: 'Preparing for a PLC programming interview', min: 15,
      summary: 'What PLC interviews look like, how to attack a practical programming task, the questions that come up again and again, and where to practise each one in PLC Start.',
      body: `
<h3>What to expect</h3>
<ul>
<li><b>Oral questions</b>: scan cycle, NO / NC, timers, counters, analog signals, safety, networks. Short, clear answers with an example win.</li>
<li><b>A practical task</b>, often 30 minutes to 2 hours on a real PLC or simulator: start / stop, a sequence, a traffic light, a tank, a clock, a quiz buzzer … Usually 8–10 rungs of good logic.</li>
<li><b>Reading or fixing someone else's program</b>: "why does this motor not start?" They want to see how you think.</li>
<li><b>The brand of the job</b>: TIA Portal, Studio 5000, Machine Expert, TwinCAT or Sysmac. Know its names for the basics (the Other brands button and the brand table help).</li>
</ul>
<h3>How to attack a practical task</h3>
<ol>
<li><b>Ask</b> what is not clear: what happens on power-up, on STOP during a cycle, when a sensor fails?</li>
<li><b>Write the I/O list</b> first, with NO / NC for every input. STOP and overload are NC contacts in the field.</li>
<li><b>Describe the sequence</b> in steps (or a GRAFCET) before drawing rungs.</li>
<li><b>Program in a clear structure</b>: inputs and conditions, modes, sequence (one bit per step), outputs. One coil per output.</li>
<li><b>Comment every rung</b>. The interviewer reads your comments first.</li>
<li><b>Test the edge cases</b> out loud: both buttons at once, STOP in every step, power-up, a held button, a sensor that never comes (watchdog).</li>
<li><b>Explain your choices</b> and what you would add on a real machine (alarms, safety relay, HMI).</li>
</ol>
<h3>Questions that come back again and again</h3>
<div class="tbl"><table>
<tr><th>Question</th><th>The short answer</th><th>Practise</th></tr>
<tr><td>What happens in one scan?</td><td>Read inputs → solve rungs top to bottom → write outputs</td><td>Lesson "The scan cycle"</td></tr>
<tr><td>Why is STOP wired NC?</td><td>A broken wire must stop the machine (fail-safe)</td><td>The NC stop button trap</td></tr>
<tr><td>TON, TOF, TP, RTO?</td><td>On-delay, off-delay, fixed pulse, keeps its time</td><td>Timer drill in the Quiz</td></tr>
<tr><td>What is a seal-in / latch?</td><td>The output's own contact keeps it on after the button is released</td><td>Start / stop with seal-in</td></tr>
<tr><td>Why do you need edges?</td><td>So something happens once per event, not every scan</td><td>Edges 1–4, Count presses</td></tr>
<tr><td>What is a double coil?</td><td>The same output in two rungs: only the last one counts</td><td>Bug hunt: double coil</td></tr>
<tr><td>4–20 mA: why not 0–20?</td><td>The live zero shows a broken wire (below 4 mA)</td><td>Scale a 4–20 mA signal</td></tr>
<tr><td>FB or FC?</td><td>Needs memory (timer, latch, edge) → FB with an instance</td><td>Blocks: FC for three cylinders</td></tr>
<tr><td>P, I and D?</td><td>Now, the past (removes the offset), the trend</td><td>PID 1 and 2</td></tr>
<tr><td>Sinking or sourcing input?</td><td>PNP sensors switch +24 V (sourcing) into a sinking input card</td><td>Lesson "Field devices"</td></tr>
<tr><td>What does a watchdog do?</td><td>Raises a fault when an expected signal does not come in time</td><td>Cylinders with a timeout, heartbeat</td></tr>
<tr><td>Emergency stop in the PLC?</td><td>No: safety relay or safety PLC, STO on drives</td><td>Lesson "Safety basics"</td></tr>
</table></div>
<div class="callout tip"><b>Use the Interview path:</b> the Path page has an <b>Interview preparation</b> path with the classic tasks in order: warm-up questions, classic programs, reading and fixing code, whole machines, and senior topics.</div>
<div class="callout where"><b>In the room:</b> think out loud, keep it simple first and improve after, and never hide a doubt about safety. "I would check this with the risk assessment" is a good answer.</div>`,
      sims: {},
      takeaways: ['Ask about power-up, STOP and sensor failure before you start.', 'I/O list first, sequence in steps, one coil per output, comments everywhere.', 'Test the edge cases out loud.', 'Know the basics in the brand of the job.', 'Safety is never just a PLC rung.'],
      mistakes: ['Starting to draw rungs before understanding the sequence.', 'A STOP that does not work with a broken wire.', 'No comments.', 'Forgetting what happens on power-up.'],
      challenges: ['iv-buzzer', 'iv-reverse', 'iv-seqstop', 'iv-testbench', 'iv-clock', 'iv-direction'],
    },
    {
      id: 'safety-practice', level: 5, title: 'Machine safety in practice: safety relay or safety PLC', min: 15,
      summary: 'How real machines are made safe: E-stops and guard doors with two channels, safety relays and safety PLCs, reset, feedback monitoring, and what your normal ladder program still has to do.',
      body: `
<h3>The rule</h3>
<p>A normal PLC program can have a bug, a forced bit or a stuck output. So a normal PLC is <b>never</b> the only thing between a person and a moving blade. Safety functions (E-stop, guard doors, light curtains, two-hand controls, safe speed) run in <b>safety-rated</b> hardware, designed to the standards (ISO 13849 with its PL a … e, IEC 62061 with its SIL) after a <b>risk assessment</b>.</p>
<h3>Two ways to build it</h3>
<div class="tbl"><table>
<tr><th></th><th>Safety relay</th><th>Safety PLC (or safety I/O + safety CPU)</th></tr>
<tr><td>What it is</td><td>a small box per safety function, wired</td><td>a PLC with a certified safety program, often in the same CPU as the normal program</td></tr>
<tr><td>Good for</td><td>1–3 safety functions, simple machines</td><td>many devices, zones, muting, safe speed, lines with networks</td></tr>
<tr><td>Change the logic</td><td>rewire</td><td>change the safety program (with a password and a new validation)</td></tr>
<tr><td>Examples</td><td>Pilz PNOZ, Schneider Preventa XPS, Omron G9SE, Siemens 3SK, ABB Jokab</td><td>Siemens F-CPU (TIA Safety), Rockwell GuardLogix, Omron NX-SL, Beckhoff TwinSAFE, Schneider Modicon safety, Pilz PSS</td></tr>
<tr><td>Over the network</td><td>status contacts to the PLC</td><td>PROFIsafe, CIP Safety, FSoE (Safety over EtherCAT)</td></tr>
</table></div>
<h3>Inside the box: a safety relay and its wiring</h3>
<div class="sfc-wrap"><svg class="sfc" viewBox="0 0 620 330" width="620" style="max-width:100%;height:auto" role="img" aria-label="Safety relay wiring"><g fill="none" stroke="currentColor" stroke-width="1.6" font-family="IBM Plex Mono, monospace" font-size="10"><path d="M20 20 L20 285"/><text x="24" y="16" fill="currentColor" stroke="none" text-anchor="start">+24 V</text><path d="M30 60 L40 60"/><path d="M30 60 L30 72 L250 72"/><path d="M40 60 L50 60"/><path d="M50 54 L62 60"/><path d="M60 60 L70 60"/><path d="M60 53 L60 61"/><text x="55" y="50" fill="currentColor" stroke="none" text-anchor="middle">E-stop</text><path d="M70 60 L90 60"/><path d="M90 60 L100 60"/><path d="M100 54 L112 60"/><path d="M110 60 L120 60"/><path d="M110 53 L110 61"/><text x="105" y="50" fill="currentColor" stroke="none" text-anchor="middle">door</text><path d="M120 60 L250 60"/><text x="185" y="55" fill="currentColor" stroke="none" text-anchor="middle">channel 1</text><path d="M30 100 L40 100"/><path d="M30 100 L30 112 L250 112"/><path d="M40 100 L50 100"/><path d="M50 94 L62 100"/><path d="M60 100 L70 100"/><path d="M60 93 L60 101"/><text x="55" y="90" fill="currentColor" stroke="none" text-anchor="middle">E-stop</text><path d="M70 100 L90 100"/><path d="M90 100 L100 100"/><path d="M100 94 L112 100"/><path d="M110 100 L120 100"/><path d="M110 93 L110 101"/><text x="105" y="90" fill="currentColor" stroke="none" text-anchor="middle">door</text><path d="M120 100 L250 100"/><text x="185" y="95" fill="currentColor" stroke="none" text-anchor="middle">channel 2</text><path d="M30 150 L40 150"/><path d="M30 150 L30 162 L250 162"/><path d="M40 150 L50 150"/><path d="M50 150 L62 143"/><path d="M62 150 L70 150"/><text x="55" y="138" fill="currentColor" stroke="none" text-anchor="middle">RESET</text><path d="M70 150 L90 150"/><path d="M90 150 L100 150"/><path d="M100 144 L112 150"/><path d="M110 150 L120 150"/><path d="M110 143 L110 151"/><text x="105" y="140" fill="currentColor" stroke="none" text-anchor="middle">K1</text><path d="M120 150 L140 150"/><path d="M140 150 L150 150"/><path d="M150 144 L162 150"/><path d="M160 150 L170 150"/><path d="M160 143 L160 151"/><text x="155" y="140" fill="currentColor" stroke="none" text-anchor="middle">K2</text><path d="M170 150 L250 150"/><text x="30" y="178" fill="currentColor" stroke="none" text-anchor="start">reset loop: RESET + NC aux contacts</text><text x="30" y="191" fill="currentColor" stroke="none" text-anchor="start">of K1 and K2: a welded contactor</text><text x="30" y="204" fill="currentColor" stroke="none" text-anchor="start">keeps the loop open, no reset</text><rect x="250" y="35" width="120" height="200" rx="6"/><text x="310" y="28" fill="currentColor" stroke="none" text-anchor="middle" font-weight="700">SAFETY RELAY</text><text x="256" y="57" fill="currentColor" stroke="none" text-anchor="start">S11</text><text x="256" y="83" fill="currentColor" stroke="none" text-anchor="start">S12</text><text x="256" y="97" fill="currentColor" stroke="none" text-anchor="start">S21</text><text x="256" y="123" fill="currentColor" stroke="none" text-anchor="start">S22</text><text x="256" y="147" fill="currentColor" stroke="none" text-anchor="start">S33</text><text x="256" y="173" fill="currentColor" stroke="none" text-anchor="start">S34</text><text x="256" y="215" fill="currentColor" stroke="none" text-anchor="start">A1 / A2  supply</text><text x="364" y="67" fill="currentColor" stroke="none" text-anchor="end">13–14</text><text x="364" y="107" fill="currentColor" stroke="none" text-anchor="end">23–24</text><text x="364" y="187" fill="currentColor" stroke="none" text-anchor="end">Y32</text><path d="M370 70 L400 70"/><path d="M400 70 L410 70"/><path d="M410 70 L422 63"/><path d="M422 70 L430 70"/><text x="415" y="58" fill="currentColor" stroke="none" text-anchor="middle">Q0.0 (PLC)</text><path d="M430 70 L470 70"/><rect x="470" y="60" width="26" height="20"/><text x="483" y="74" fill="currentColor" stroke="none" text-anchor="middle">K1</text><path d="M370 110 L400 110"/><path d="M400 110 L410 110"/><path d="M410 110 L422 103"/><path d="M422 110 L430 110"/><text x="415" y="98" fill="currentColor" stroke="none" text-anchor="middle">Q0.1 (PLC)</text><path d="M430 110 L470 110"/><rect x="470" y="100" width="26" height="20"/><text x="483" y="114" fill="currentColor" stroke="none" text-anchor="middle">K2</text><path d="M496 70 L530 70"/><path d="M496 110 L530 110"/><text x="534" y="74" fill="currentColor" stroke="none" text-anchor="start">0 V</text><text x="534" y="114" fill="currentColor" stroke="none" text-anchor="start">0 V</text><path d="M370 190 L440 190"/><text x="444" y="194" fill="currentColor" stroke="none" text-anchor="start">PLC I0.4 (relay OK)</text><text x="250" y="262" fill="currentColor" stroke="none" text-anchor="start" font-weight="700">power to the motor:  L1 ──[ K1 ]──[ K2 ]── M</text><text x="250" y="280" fill="currentColor" stroke="none" text-anchor="start">two contactors in series: one welded, the other still cuts</text><text x="20" y="306" fill="currentColor" stroke="none" text-anchor="start">Terminal names as on Pilz PNOZ X / Schneider XPS-AF. Omron G9SE: T11/T12, T21/T22, T31/T32, S14/S24.</text><text x="20" y="320" fill="currentColor" stroke="none" text-anchor="start">Always follow the datasheet of your relay.</text></g></svg>
<p>Read the drawing: each E-stop and each door switch has <b>two contacts</b>, one in each channel. Each channel is a <b>loop</b> from one relay terminal through the contacts and back to the next terminal. The relay sends its own test signal through the loop, so it also finds a short between the two channels.</p>
<h3>Try it: a safety relay on the rail</h3>
<p>This is the unit you find in almost every cabinet: a narrow yellow (or grey, or red) relay with a row of LEDs. Pick the layout that looks like your relay, pick what it is used for, then operate it and make faults. Watch the LEDs: they tell you what the relay sees.</p>
[[hw:safetyrelay]]
<h3>Reading the LEDs in front of the cabinet</h3>
<div class="tbl"><table>
<tr><th>What you see</th><th>What it means</th><th>What to do</th></tr>
<tr><td>Only the power LED is on</td><td>The channels are open: an E-stop is pressed or a door is open</td><td>Find the open device. Many machines show it on the HMI</td></tr>
<tr><td>Power and both input LEDs on, output LED off</td><td>The relay is ready and waits for the start</td><td>Press reset. No start? Check the feedback loop: a contactor may be stuck</td></tr>
<tr><td>Only one input LED on</td><td>One channel is open: a broken wire, a loose terminal, or a contact that did not close</td><td>Measure both channels at the relay terminals</td></tr>
<tr><td>Both input LEDs on, but it does not reset after an E-stop</td><td>One channel did not open when the other did: a welded contact or a bridged wire</td><td>Operate the device again and watch both input LEDs: both must go off</td></tr>
<tr><td>Fault LED on</td><td>The relay found a fault: often a short between the channels, or a short to 24 V</td><td>Remove the cause, then switch the supply off and on</td></tr>
<tr><td>No LED at all</td><td>No supply on A1 / A2</td><td>Check the fuse and the 24 V</td></tr>
</table></div>
<p>The exact blink codes are different for every maker. The manual of the relay has a small table for them.</p>
<h3>Which safety relay for which job</h3>
<div class="tbl"><table>
<tr><th>Type</th><th>Used for</th><th>What is special</th></tr>
<tr><td>Basic relay, 2 channels</td><td>E-stop, guard door</td><td>Two inputs, a start input, 2 or 3 safety contacts. The one in the simulator</td></tr>
<tr><td>Relay for electronic sensors</td><td>Light curtain, laser scanner, coded door switch</td><td>Takes two OSSD signals. The sensor tests itself</td></tr>
<tr><td>Relay with delayed contacts</td><td>Drives that must brake first (stop category 1)</td><td>Some contacts open at once, some after a set time</td></tr>
<tr><td>Two-hand relay</td><td>Presses, punching machines</td><td>Both buttons within 0.5 s, and both released before the next stroke</td></tr>
<tr><td>Standstill / speed monitor</td><td>Unlocking a door only when the saw has stopped</td><td>Measures the motor, gives a "safe to open" contact</td></tr>
<tr><td>Contact expansion module</td><td>More outputs than the relay has</td><td>Adds contacts; its own feedback goes into the start circuit</td></tr>
<tr><td>Configurable safety relay / small safety PLC</td><td>Machines with many doors, modes and muting</td><td>The logic is set in software in place of wiring</td></tr>
</table></div>
<h3>The names on popular relays</h3>
<div class="tbl"><table>
<tr><th></th><th>Channel 1</th><th>Channel 2</th><th>Start / reset</th><th>Safety outputs</th><th>LEDs</th></tr>
<tr><td>Pilz PNOZ s4</td><td>S11 – S12</td><td>S21 – S22</td><td>S34</td><td>13-14, 23-24, 33-34</td><td>Power, In1, In2, Out, Reset, Fault</td></tr>
<tr><td>Siemens 3SK1</td><td>T1 – IN1</td><td>T2 – IN2</td><td>INS (feedback: INF)</td><td>13-14, 23-24, 33-34</td><td>DEVICE, OUT, IN, SF</td></tr>
<tr><td>Schneider XPS-AF</td><td>S11 – S12</td><td>S21 – S22</td><td>S33 – S34</td><td>13-14, 23-24, 33-34</td><td>A1/A2, K1, K2</td></tr>
<tr><td>Omron G9SE</td><td>T11 – T12</td><td>T21 – T22</td><td>T31 – T32</td><td>13-14, 23-24 (and more)</td><td>PWR, IN1, IN2, OUT</td></tr>
<tr><td>Allen-Bradley GSR SI</td><td>S11 – S12</td><td>S21 – S22</td><td>S34</td><td>13-14, 23-24</td><td>PWR/Fault, IN, OUT</td></tr>
</table></div>
<p>Makers change terminal names between types and years. The table is a guide for reading a drawing: for wiring, use the datasheet of the exact relay.</p></div>
<div class="tbl"><table>
<tr><th>Terminals</th><th>What is connected</th><th>Why</th></tr>
<tr><td>A1 / A2</td><td>24 V supply</td><td></td></tr>
<tr><td>S11–S12, S21–S22</td><td>channel 1 and channel 2: one NC contact of each E-stop or door switch, in series on each channel (doors that are opened often: better one relay or one safety input pair per door, because series wiring hides faults)</td><td>two channels: one welded or bridged contact cannot defeat the stop; the relay also detects cross-circuits</td></tr>
<tr><td>S33–S34</td><td>reset loop: RESET button + NC auxiliary contacts of K1 and K2 in series</td><td>manual reset, and feedback: a welded contactor keeps the loop open and blocks the reset</td></tr>
<tr><td>13–14, 23–24</td><td>safety NO outputs: the coils of K1 and K2 (here in series with the PLC outputs)</td><td>the relay cuts the hazard in hardware, whatever the PLC does</td></tr>
<tr><td>Y32 (or 33–34)</td><td>semiconductor / auxiliary output to a PLC input</td><td>the PLC sees "relay OK" for messages and to drop its run commands</td></tr>
<tr><td>41–42</td><td>auxiliary NC contact</td><td>status only: never use it for safety</td></tr>
</table></div>
<p>Two contactors in series with read-back is the classic wiring for stop category 0. With a drive, the relay outputs usually go to the drive's STO inputs instead. Try the exercise <b>Fault finding: the safety relay will not reset</b>: the most common call-out on machines with safety relays.</p>
<h3>Light curtains (safety light barriers)</h3>
<p>A <b>safety light curtain</b> is a row of infrared beams across an opening. It replaces a door where people or material must pass often. Brands: SICK deTec4, Keyence GL-R, Omron F3SG, Schneider XUSL, Pilz PSENopt, Banner EZ-SCREEN.</p>
<ul>
<li><b>OSSD1 / OSSD2</b> (Output Signal Switching Devices): two safety outputs that are on while the field is clear. The curtain tests them with short pulses, so a short circuit is found. Wire both to the safety relay or safety inputs.</li>
<li><b>Type 4</b> (up to PL e / SIL 3) for hands and bodies at dangerous machines; Type 2 only for lower risks.</li>
<li><b>Resolution</b>: 14 mm detects a finger, 30 mm a hand, larger values a body.</li>
<li><b>Restart interlock</b>: after an interruption, nothing restarts until a reset button is pressed, placed where the whole danger zone can be seen.</li>
<li><b>Safety distance</b> (ISO 13855): the curtain must be far enough away that the machine has stopped before a hand gets there: <b>S = K × T + C</b>, with K = 2000 mm/s (approach speed), T = total stopping time (curtain + relay + machine), C = 8 × (d − 14) mm for a resolution d up to 40 mm (coarser curtains: K = 1600 mm/s and C = 850 mm). Example: T = 0.2 s, d = 14 mm → S = 400 mm.</li>
<li><b>Muting</b>: the curtain is bypassed for a moment so material can pass (pallets on a conveyor). Muting sensors recognise the material by <b>order and timing</b> (A then B within a few seconds, only while the conveyor runs), a <b>muting lamp</b> must show it, and it has a maximum time. Order, timing and the place of the sensors make it hard for a person to start muting by accident; a dirty sensor must not start it either. Muting is still a bypass: it needs its own risk assessment.</li>
<li><b>Blanking</b>: some beams may stay blocked by a fixed part of the machine. If that part is missing, the curtain stops the machine; gaps beside it need a fixed guard.</li>
</ul>
<p>In the safety blocks: PLCopen <code>SF_MutingSeq</code> / <code>SF_MutingPar</code>, TIA <code>MUTING</code>, GuardLogix <code>LC</code> (light curtain) and <code>TSAM</code> / <code>TSSM</code> / <code>FSBM</code> (two- and four-sensor muting). Practise it in <b>Light curtain 1</b> and <b>Light curtain 2</b>.</p>
<h3>The building blocks of every safety function</h3>
<ul>
<li><b>Two channels</b>: an E-stop has two NC contacts, a guard door two switches. If one contact welds shut, the other still opens the circuit.</li>
<li><b>Discrepancy monitoring</b>: the two channels must change together (within e.g. 0.5 s). If not, a wire is broken or a contact is stuck: fault, and no restart until both channels have opened together.</li>
<li><b>Manual reset</b>: after a trip, releasing the E-stop must <b>not</b> restart anything. A deliberate RESET is needed, and then a START.</li>
<li><b>Feedback (EDM)</b>: two contactors in series, each with an NC auxiliary contact read back. A welded contactor is found at the next start, and the other contactor still cuts the motor.</li>
<li><b>Stop categories</b>: 0 = cut the power at once; 1 = brake under control, then cut; 2 = controlled stop, power stays. A drive's <b>STO</b> (Safe Torque Off) is the usual way to cut it.</li>
</ul>
<h3>What your normal ladder program does</h3>
<ul>
<li>Reads the safety status (relay OK, or the "enable" bits from the safety program) and <b>drops its own run commands</b> when it goes off, so nothing restarts by itself.</li>
<li>Shows the operator what happened: which E-stop, which door, reset needed (flashing reset lamp), and the text on the HMI.</li>
<li>Stops the process in a controlled way where it can (a cycle stop, or braking before the safety cuts the power).</li>
<li>Never bypasses or "helps" the safety function.</li>
</ul>
<h3>The safety blocks in each brand</h3>
<div class="tbl"><table>
<tr><th>Function</th><th>PLCopen Safety (Omron, Beckhoff, CODESYS Safety)</th><th>Siemens TIA Safety</th><th>Rockwell GuardLogix</th></tr>
<tr><td>E-stop, two channels</td><td>SF_EmergencyStop + SF_Equivalent</td><td>ESTOP1 (F-I/O does the discrepancy)</td><td>DCS (dual channel input), ESTOP</td></tr>
<tr><td>Guard door</td><td>SF_GuardMonitoring, SF_GuardLocking</td><td>SFDOOR</td><td>DCS</td></tr>
<tr><td>Contactor feedback</td><td>SF_EDM</td><td>FDBACK</td><td>CROUT (configurable redundant output)</td></tr>
<tr><td>Reset / acknowledge</td><td>inputs of the blocks</td><td>ACK_GL, ACK_REI</td><td>reset inputs, DCSRT</td></tr>
<tr><td>Two-hand control</td><td>SF_TwoHandControlTypeII / III</td><td>TWO_HAND</td><td>THRSe</td></tr>
</table></div>
<div class="callout tip"><b>About the exercises:</b> in PLC Start you write this logic in normal ladder to understand how it works. On a real machine you use the certified blocks of a safety controller, or a safety relay, and the machine is validated by a competent person.</div>
<div class="callout where"><b>Where:</b> every machine with a moving hazard: presses, saws, robots cells, palletisers, conveyors with access points.</div>`,
      sims: {},
      takeaways: ['Safety functions run in safety-rated hardware, never only in a normal PLC.', 'Safety relay for a few functions, safety PLC for many or for networks.', 'Two channels, discrepancy, manual reset and contactor feedback are in every safety function.', 'The normal program drops its run commands and shows what happened, so nothing restarts by itself.', 'Same ideas in every brand: SF_EmergencyStop / ESTOP1 / DCS, SF_EDM / FDBACK / CROUT.'],
      mistakes: ['A run seal-in that survives an E-stop, so the machine restarts after reset.', 'One channel only: one welded contact and the E-stop does nothing.', 'An E-stop as an ordinary PLC input or HMI button.', 'Bridging a door switch "for the test".'],
      challenges: ['saf-1', 'diag-relay', 'saf-2', 'lc-1', 'lc-2'],
    },
    {
      id: 'safety-design', level: 5, title: "Safety design: from the risk to the performance level", min: 13,
      summary: "How to decide how reliable a safety function must be: risk assessment, the three questions of the risk graph, performance levels a to e, categories, MTTFd, DC and CCF in plain words, PL against SIL, and stop categories.",
      body: `
<h3>A safety function is not normal control</h3>
<p>Normal control makes the machine work. A <b>safety function</b> keeps people from being hurt when something goes wrong: "when the door opens, the robot stops". It must still work when a wire breaks, a contact welds or the program has a bug. So it is designed in a different way, and the first question is always: <b>how reliable must it be?</b></p>

<h3>The steps, in order</h3>
<ol>
<li><b>Risk assessment.</b> Walk around the machine and list every hazard: crushing, cutting, burning, electric shock.</li>
<li><b>Remove the hazard by design</b> if you can: lower force, more distance, no gap.</li>
<li><b>Guard it</b>: a fixed cover, or a door or light curtain with a safety function.</li>
<li><b>Warn</b>: signs and training. This is the weakest step, never the only one.</li>
</ol>
<p>For each safety function of step 3 you now need its <b>required performance level, PLr</b>.</p>

<h3>Three questions, one letter</h3>
<p>The standard ISO 13849-1 uses a small graph. Answer three questions and follow the path:</p>
[[hw:risk]]

<h3>What the letter means</h3>
<div class="tbl"><table>
<tr><th>PL</th><th>Dangerous failures per hour</th><th>In plain words</th><th>Typical structure</th></tr>
<tr><td><b>a</b></td><td>0.001 % to 0.01 %</td><td>low risk reduction</td><td>one channel, normal parts</td></tr>
<tr><td><b>b</b></td><td>0.0003 % to 0.001 %</td><td></td><td>one channel, well-tried parts</td></tr>
<tr><td><b>c</b></td><td>0.0001 % to 0.0003 %</td><td></td><td>one channel, well-tried or tested</td></tr>
<tr><td><b>d</b></td><td>0.00001 % to 0.0001 %</td><td>the usual level for robot cells and doors</td><td>two channels, faults are found</td></tr>
<tr><td><b>e</b></td><td>0.000001 % to 0.00001 %</td><td>presses, the highest level</td><td>two channels, full monitoring</td></tr>
</table></div>

<h3>Four things decide which PL a circuit reaches</h3>
<ul>
<li><b>Category</b> (B, 1, 2, 3, 4): the structure. One channel or two? Is it tested? Is every fault found?</li>
<li><b>MTTFd</b>: how long the parts work before a dangerous failure, on average. Good parts, less switching: longer.</li>
<li><b>DC</b> (diagnostic coverage): how many of the possible faults the system notices. Contactor feedback and two-channel comparison raise it.</li>
<li><b>CCF</b> (common cause failure): one event must not kill both channels at once. Separate cables, different parts, protection against over-voltage.</li>
</ul>
<p>The makers of safety parts give these numbers. Free tools (for example SISTEMA) add them up to the PL you reached. It must be at least the PLr you needed.</p>

<h3>PL and SIL</h3>
<p>A second standard (IEC 62061) uses <b>SIL</b> 1 to 3 for the same idea. Roughly: PL b and c are SIL 1, PL d is SIL 2, PL e is SIL 3. For machines you may use PL (ISO 13849-1) or SIL (IEC 62061). Process plants use SIL from another standard, IEC 61511.</p>

<h3>How it stops: stop categories</h3>
<div class="tbl"><table>
<tr><th>Stop category</th><th>What happens</th><th>Example</th></tr>
<tr><td><b>0</b></td><td>Power is cut at once. The motor coasts.</td><td>Contactor drops, a simple conveyor</td></tr>
<tr><td><b>1</b></td><td>A controlled, fast stop first, then the power is cut.</td><td>A drive brakes a heavy saw, then safe torque off</td></tr>
<tr><td><b>2</b></td><td>A controlled stop, and the power stays on. The standstill is watched.</td><td>A robot that holds its position</td></tr>
</table></div>

<h3>What this means for you as the programmer</h3>
<ul>
<li>A normal PLC is <b>not</b> a safety device. Safety functions go through a safety relay or a safety PLC with tested blocks.</li>
<li>Your normal program only <b>reads</b> the safety state, to show a message and to stop sequences cleanly.</li>
<li>Never bridge or force a safety signal "just for the test".</li>
<li>After every change: test each safety function and write the result down. This is called <b>validation</b>.</li>
</ul>
<div class="callout where"><b>Where:</b> every new machine and every rebuild. In interviews: "What is the difference between PL d and PL e?" and "Why two channels?". Build the circuits in <a href="#lesson-safety-practice">Safety in practice</a> and on the safety cell machines in the Lab.</div>`,
      sims: {},
      takeaways: ["Each safety function gets a required performance level, PLr, from a to e.", "Three questions: how bad, how often, can it be avoided.", "PL d and e are normally built with two channels and monitoring (Category 3 or 4).", "The PL reached depends on structure, part quality, diagnostics and common-cause protection.", "A normal PLC is not a safety device."],
      mistakes: ["Starting with the hardware and not with the risk.", "One channel for a hazard that can cost a hand.", "Thinking a warning sign replaces a guard.", "Forcing a safety signal during commissioning and forgetting it.", "Changing a safety function without testing and writing it down."],
      challenges: ["saf-1", "saf-2", "lc-1"],
    },
    {
      id: 'barcode-printer', level: 6, title: 'Strings: barcode readers and label printers', min: 14,
      summary: 'How a PLC reads a barcode, builds a label text with a running serial number, sends it to a print-and-apply printer and checks the result, with the string instructions of every brand.',
      body: `
<h3>The barcode reader (BCR)</h3>
<ul>
<li><b>Trigger</b>: the PLC starts a read when a sensor sees the product (or the reader reads continuously).</li>
<li><b>Result</b>: a status (<b>read OK</b> / <b>no read</b>) and the <b>data</b>, a string such as <code>A100</code>.</li>
<li><b>Connection</b>: today usually PROFINET or EtherNet/IP (Cognex, SICK, Keyence, Datalogic …): the result appears in the PLC's input area, with a result counter or a "new result" bit as handshake. Older readers use RS-232 / serial.</li>
<li>Always handle <b>no read</b>: a damaged label must never let a product through unchecked.</li>
</ul>
<h3>Strings in the PLC</h3>
<div class="tbl"><table>
<tr><th>Job</th><th>PLC Start</th><th>TIA Portal</th><th>Studio 5000</th><th>CODESYS / TwinCAT / Machine Expert</th><th>Omron</th></tr>
<tr><td>String variable</td><td>STR0 … STR31</td><td>STRING[n] in a DB</td><td>STRING tag (.LEN, .DATA)</td><td>STRING(n)</td><td>STRING</td></tr>
<tr><td>Copy</td><td>SMOV</td><td>S_MOVE / :=</td><td>COP</td><td>:=</td><td>MOV$ / :=</td></tr>
<tr><td>Join</td><td>CONCAT</td><td>CONCAT</td><td>CONCAT</td><td>CONCAT</td><td>+$ / CONCAT</td></tr>
<tr><td>Number → text</td><td>ITOS (with leading zeros)</td><td>S_CONV, VAL_STRG</td><td>DTOS</td><td>INT_TO_STRING</td><td>STR4 (4 hex digits, CX-Programmer) / INT_TO_STRING (Sysmac Studio)</td></tr>
<tr><td>Part of a text</td><td>SMID</td><td>MID</td><td>MID</td><td>MID</td><td>MID$ / MID</td></tr>
<tr><td>Compare</td><td>CMP(STR1==ISTR0)</td><td>CMP == on strings</td><td>EQU / NEQ on strings</td><td>= / &lt;&gt;</td><td>=$ / EQ</td></tr>
</table></div>
<h3>The label printer</h3>
<p>The label layout (logo, fonts, barcode type) is stored in the printer. The PLC only sends the <b>variable data</b> and a print command, either as fields over the network or as a small printer-language message. For a Zebra printer, a Code 128 barcode with the text <code>A100-0007</code> is:</p>
<pre class="code">^XA^FO50,50^BCN,100,Y,N,N^FDA100-0007^FS^XZ</pre>
<p>A <b>print-and-apply</b> printer also puts the label on the product: the product must stand still (or the speed must be known) until "label applied".</p>
<h3>Running serial numbers</h3>
<ul>
<li>Keep the counter in <b>retentive</b> memory: after a power cut the next number must not repeat one already printed.</li>
<li>Always the same width: <b>leading zeros</b> (0007, not 7), and a clear rule after the maximum (9999 → 0001).</li>
<li>Count only labels that were really applied, and log them if traceability is required.</li>
</ul>
<h3>Check what you printed</h3>
<p>A second scanner after the printer reads the label and compares it with what was sent. Smudged print, a missing label or a wrong product: <b>reject</b> the product and tell the operator. The data must follow the right product: with one product between two stations a single bit is enough; with several, use a shift register or a FIFO of product records.</p>
<div class="callout where"><b>Where:</b> packaging and logistics lines, automotive part marking, pharmaceutical serialisation, warehouse sorting. "Scan, print, verify" is one of the most common PLC jobs.</div>`,
      sims: {},
      takeaways: ['A BCR gives a status (read OK / no read) and a string; always handle no read.', 'String instructions: move, join, number to text, part of text, compare: same idea in every brand.', 'The printer stores the layout; the PLC sends the variable data and a print command.', 'Serial numbers: fixed width with leading zeros, retentive, a clear roll-over rule.', 'Verify the printed label and reject what does not match.'],
      mistakes: ['Printing a label for a product that was not read.', 'A serial number that restarts at 1 after a power cut.', 'Moving the product while the label is being applied.', 'Data that ends up on the wrong product (no tracking).'],
      challenges: ['bcr-1', 'bcr-2', 'bcr-3'],
    },
    {
      id: 'hmi-texts', level: 6, title: 'HMI text lists and alarm texts', min: 10,
      summary: 'Why the PLC sends numbers and bits, not sentences, and how the HMI turns them into messages, step texts and alarms with text lists.',
      body: `
<h3>The PLC sends numbers, the HMI owns the words</h3>
<p>A PLC program does not build sentences for the operator. It writes a <b>number</b> (a message number, a step number, a fault code) or sets <b>alarm bits</b>. The HMI has the texts. That way the texts can be changed or translated without touching the PLC, and the same number shows in English, Arabic or French on the same screen.</p>
<h3>Text list: number → text</h3>
<div class="tbl"><table>
<tr><th>MW50</th><th>Text on the HMI</th></tr>
<tr><td>1</td><td>Stopped: press START</td></tr>
<tr><td>2</td><td>Running</td></tr>
<tr><td>4</td><td>No read: box rejected</td></tr>
<tr><td>5</td><td>Label check failed: box rejected</td></tr>
<tr><td>6</td><td>Printer not ready: check the labels</td></tr>
</table></div>
<p>In ladder: one MOV per message, from the least to the most important. The last rung that is true wins in each scan, so the most important message is shown. A step number with a text list ("Step 30: waiting for the clamp") is the best help a maintenance technician can get.</p>
<h3>Alarms: one bit per alarm</h3>
<ul>
<li><b>Discrete (bit) alarms</b>: the PLC sets bit n of an alarm word, the HMI shows alarm text n with a time stamp, a class (fault, warning) and keeps a history. The operator acknowledges on the HMI, which writes an acknowledge bit back.</li>
<li><b>Analog alarms</b>: the HMI watches a value against limits ("Temperature too high: 287 °C").</li>
<li><b>Values in texts</b>: texts can include live values: "Box @1@ rejected", where @1@ is a tag.</li>
</ul>
<div class="tbl"><table>
<tr><th>Brand</th><th>Text lists</th><th>Alarms</th></tr>
<tr><td>Siemens WinCC (TIA Portal)</td><td>Text and graphic lists</td><td>HMI alarms (discrete / analog), Program_Alarm, ProDiag</td></tr>
<tr><td>Rockwell FactoryTalk View</td><td>Multistate indicator, local messages</td><td>Alarms and Events (or HMI alarms)</td></tr>
<tr><td>Schneider EcoStruxure Operator Terminal Expert</td><td>Message / state displays</td><td>Alarm groups</td></tr>
<tr><td>Omron NA (Sysmac Studio) / NB (NB-Designer)</td><td>Text lists in the HMI project</td><td>User alarms</td></tr>
<tr><td>CODESYS / TwinCAT visualisation</td><td>Text lists</td><td>Alarm manager</td></tr>
</table></div>
<div class="callout tip"><b>Practice:</b> the labelling line has an HMI line that shows the text for MW50, and a number without a text shows in red, as on a real panel with a missing entry.</div>`,
      sims: {},
      takeaways: ['The PLC writes numbers and bits; the HMI holds the texts.', 'Text list: message number or step number → text.', 'One MOV per message, the most important last.', 'Bit alarms: bit n → alarm text n, with class, time and acknowledge.'],
      mistakes: ['Building operator texts in the PLC.', 'Several messages fighting over the same word without an order.', 'A message number with no text on the HMI.'],
      challenges: ['bcr-3'],
    },
    {
      id: 'data-blocks', level: 6, title: 'Data blocks, structures and arrays (recipes)', min: 13,
      summary: 'Where real programs keep their data: data blocks with named fields, structures and arrays, an index to pick a recipe, start values and retentive data, and the same idea in every brand.',
      body: `
<h3>Why data blocks</h3>
<p>A small program can live with M bits and MW words. A real machine has hundreds of values: recipes, parameters, counters, product data, alarm bits. Scattering them over numbered addresses is how mistakes happen. A <b>data block</b> groups them under names: <code>Recipes.Length[2]</code> says what it is; <code>MW124</code> does not.</p>
<h3>The parts</h3>
<ul>
<li><b>Fields</b> with a name and a type (BOOL, INT, DINT, STRING …) and a <b>start value</b>.</li>
<li><b>Structures</b> (a PLC data type / UDT / STRUCT): a reusable layout, e.g. "Recipe" = Length + Qty + Name.</li>
<li><b>Arrays</b>: the same field many times, <code>Length[1..3]</code>, chosen by an <b>index</b>. With the index in a word (<code>Length[MW30]</code>), one rung serves every recipe.</li>
<li><b>Retain</b>: data that must survive a power cut (serial numbers, counters, recipes changed on the HMI) is marked retentive.</li>
</ul>
<h3>The index must be checked</h3>
<p><code>Length[MW30]</code> with MW30 = 7 reads outside the array. A real PLC stops (TIA Portal: STOP or the programming-error OB121, Studio 5000: a major fault, CODESYS: an exception or wrong data). Always check the index first: <code>CMP(MW30&gt;=1) CMP(MW30&lt;=3)</code>.</p>
<h3>Start values and a download</h3>
<p>Every data block has start values. Initialising the block again puts the start values back and loses what the operator changed on the HMI. TIA Portal does this when the structure of the block changed; Studio 5000 overwrites the tag values with every download. Keep recipes that operators edit in retentive blocks, and download them with care.</p>
<h3>The same idea in every brand</h3>
<div class="tbl"><table>
<tr><th>Brand</th><th>Where the data lives</th><th>Layout</th><th>Example</th></tr>
<tr><td>PLC Start</td><td>DB sections</td><td>fields, arrays</td><td>DB10.LENGTH[MW30]</td></tr>
<tr><td>Siemens TIA Portal</td><td>global DB, instance DB</td><td>PLC data type (UDT)</td><td>"Recipes".Length["RecipeNo"]</td></tr>
<tr><td>Rockwell Studio 5000</td><td>controller / program tags (no DBs)</td><td>user-defined data type (UDT), arrays</td><td>Recipes.Length[RecipeNo]</td></tr>
<tr><td>CODESYS, TwinCAT 3, Schneider Machine Expert</td><td>GVL (global variable list)</td><td>DUT: STRUCT, ARRAY</td><td>Recipes.Length[nRecipe]</td></tr>
<tr><td>Omron Sysmac Studio</td><td>global variables</td><td>structure data types, arrays</td><td>Recipes.Length[RecipeNo]</td></tr>
<tr><td>Omron CX / Schneider M221</td><td>DM area (D) / %MW tables</td><td>word addresses</td><td>D100 + index, %MW100[%MW30]</td></tr>
</table></div>
<h3>In the Lab</h3>
<p><b>+ DB</b> above the ladder creates a data block. Add fields (type, an array range like 1..3, start values separated by commas) and use them as <code>DB10.NAME</code> or <code>DB10.NAME[2]</code> / <code>DB10.NAME[MW30]</code>. The "Now" column shows the actual values while the PLC runs, and the Other brands window shows the block as a structure in each brand.</p>
<div class="callout where"><b>Where:</b> recipes and product data, machine parameters, alarm words for the HMI, data per station or per product in tracking, instance data of function blocks.</div>`,
      sims: {},
      takeaways: ['Data blocks give data names, types and start values.', 'Structures and arrays: one rung with an index serves every recipe.', 'Check every index before using it: out of range stops some PLCs and silently damages other data in others.', 'Retentive data survives a power cut; a download restores start values.', 'TIA: DB + UDT; Rockwell: tags + UDT; CODESYS / TwinCAT / Machine Expert: GVL + STRUCT; Sysmac: global variables + structures.'],
      mistakes: ['Using an index from the HMI without a range check.', 'Recipes in non-retentive memory.', 'Downloading a data block and losing the operator\'s values.', 'Absolute addresses (DB10.DBW4) where a name would be clear.'],
      challenges: ['db-recipe', 'bug-db-index'],
    },
    {
      id: 'structure', level: 5, title: 'Program structure & troubleshooting', min: 9,
      summary: 'How to lay out a program others can maintain, and how to find faults fast.',
      body: `
<h3>A layout that scales</h3>
<ol>
<li><b>Inputs & conditions:</b> debounce, invert, scale; compute "ready", "guards OK", "air OK".</li>
<li><b>Modes:</b> auto / manual / maintenance, start/stop latches.</li>
<li><b>Sequences:</b> one state machine per station.</li>
<li><b>Alarms:</b> detect, latch, acknowledge.</li>
<li><b>Outputs:</b> one rung per output, combining auto, manual and interlocks.</li>
</ol>
<p>Big PLCs split this into blocks (POUs, FBs, routines). In CODESYS you'd use one program per station with function blocks for reusable devices like "Cylinder" or "Motor".</p>
<h3>Write it so the night shift can read it</h3>
<ul>
<li>Every rung has a comment saying <i>why</i>, not just what.</li>
<li>Symbols for every address. No magic numbers; name your setpoints.</li>
<li>One coil per output; sets and resets of one bit next to each other.</li>
</ul>
<h3>Troubleshooting like a pro</h3>
<ol>
<li><b>Go online and look at the output rung.</b> Which contact is open (not green)? That's what the machine is waiting for.</li>
<li><b>Follow that bit:</b> use cross-reference to find where it's written, and repeat until you reach a real input.</li>
<li><b>Check the field device:</b> sensor LED, wiring, 24 V, PNP/NPN.</li>
<li><b>Force with caution:</b> forcing overrides I/O and can move machinery unexpectedly. Use it only with the area safe, and always remove forces.</li>
</ol>
<div class="callout tip">PLC Start's monitor view works exactly like step 1: green contacts are closed, grey ones are open, and the rung shows how far the power gets.</div>`,
      sims: {},
      takeaways: ['Inputs → modes → sequences → alarms → outputs.', 'Troubleshoot from the output backwards.'],
      mistakes: ['Forcing outputs with people near the machine.'],
      challenges: [],
    },
    {
      id: 'plc-tasks', level: 5, title: "Tasks and interrupts: who has the CPU?", min: 12,
      summary: "Main cyclic program, periodic task, interrupt and startup code: when each one runs, why a short pulse is missed, why PID needs a fixed time, and what the watchdog does. With a millisecond-by-millisecond time line.",
      body: `
<h3>One CPU, several programs</h3>
<p>Until now your whole program ran in one loop: read the inputs, run every rung, write the outputs, again. That loop is the <b>main cyclic program</b>, and it is enough for most machines. But a real CPU can run more than one program, and it decides in every millisecond which one gets the processor.</p>
<div class="tbl"><table>
<tr><th>Kind of program</th><th>It runs…</th><th>Use it for</th></tr>
<tr><td><b>Main cyclic program</b></td><td>again and again: as fast as it can (Siemens, Rockwell) or at a fixed cycle such as 10 ms (CODESYS, TwinCAT, Omron)</td><td>Almost everything: sequences, interlocks, alarms</td></tr>
<tr><td><b>Periodic task</b></td><td>at a fixed time, for example every 100 ms</td><td>PID, ramps, filters, flow totals: all maths that needs an exact time</td></tr>
<tr><td><b>Interrupt (event task)</b></td><td>at once, when an input changes</td><td>Very short pulses: a registration mark, a fast sensor</td></tr>
<tr><td><b>Startup code</b></td><td>once, when the CPU goes to RUN</td><td>Start values, clearing steps</td></tr>
</table></div>
<p>A program with a higher priority <b>interrupts</b> a lower one: the main program stops in the middle of a rung, the other program runs, then the main program goes on where it was.</p>

<h3>Try it: watch the CPU millisecond by millisecond</h3>
[[hw:tasks]]

<h3>The names in each software</h3>
<div class="tbl"><table>
<tr><th></th><th>Siemens TIA</th><th>Studio 5000</th><th>CODESYS / TwinCAT</th><th>Omron Sysmac</th></tr>
<tr><td>Main</td><td>OB1</td><td>Continuous task</td><td>MainTask / PlcTask (a fixed cycle, e.g. 10 ms)</td><td>Primary periodic task</td></tr>
<tr><td>Periodic</td><td>OB30 … (cyclic interrupt)</td><td>Periodic task</td><td>Cyclic task with an interval</td><td>Periodic task</td></tr>
<tr><td>Event</td><td>OB40 … (hardware interrupt)</td><td>Event task</td><td>Event task</td><td>Event task</td></tr>
<tr><td>Startup</td><td>OB100</td><td>First scan bit S:FS</td><td>Init code on the first cycle</td><td>P_First_Run flag</td></tr>
</table></div>

<h3>Rule 1: a signal must be longer than one cycle</h3>
<p>The main program reads its inputs once per cycle. A pulse that comes and goes between two readings does not exist for it. So: if the cycle is 40 ms, every signal you want to see must stay for more than 40 ms (plus the input filter). If it cannot, use an interrupt, or better a <b>high-speed counter</b> input that counts in hardware.</p>

<h3>Rule 2: maths with time goes in a periodic task</h3>
<p>A PID block calculates with "time since my last call". In the main program this time changes with every cycle. In a periodic task it is exact. The same is true for ramps, for filters and for adding up a flow to a total.</p>

<h3>Rule 3: keep interrupts short, and copy shared data</h3>
<p>An interrupt can change a value while the main program is in the middle of using it. Two habits keep you safe:</p>
<ul>
<li>In the interrupt do only the urgent thing: count, store a position, set a bit. Do the rest in the main program.</li>
<li>In the main program copy the shared value once at the top, and work with the copy.</li>
</ul>

<h3>Rule 4: never wait in a loop</h3>
<p>The CPU measures the time of each cycle. If one cycle is longer than the limit (often 150 ms), the <b>watchdog</b> stops the CPU and switches all outputs off. That is a safety feature: a program that hangs must not leave a machine running. A loop that waits for an input ("repeat until the sensor comes") is the classic cause. Use a step sequence: check the sensor once per cycle and move on.</p>
<div class="callout where"><b>Where:</b> PID loops, registration marks on packaging machines, flying saws, flow totals, and every time someone asks "why does the PLC not see my sensor?". In interviews: "What is the scan time, and what happens if it is too long?"</div>`,
      sims: {},
      takeaways: ["The main program reads its inputs once per cycle.", "A signal must be longer than one cycle, or you need an interrupt or a high-speed counter.", "PID, ramps and totals go in a periodic task.", "Keep interrupts short and copy shared values.", "Never wait in a loop: the watchdog stops the CPU."],
      mistakes: ["Expecting the main program to see a 5 ms pulse.", "PID in the main program: the tuning changes when the program grows.", "A loop that waits for a sensor.", "A long calculation inside an interrupt.", "Using a value in the main program while an interrupt changes it."],
      challenges: ["enc-1", "pid-1"],
    },
    {
      id: 'flow-data', level: 5, title: "Jumps, MCR zones, FIFO and sequencers", min: 11,
      summary: "Four instructions you meet in older programs and in interviews: what a jump really skips, what an MCR zone does to coils, latches and timers, how FIFO and LIFO queues track parts, and what a sequencer is. With a simulator for all four, the names in each brand, and what to write today.",
      body: `
<h3>Four instructions you will meet in other people's programs</h3>
<p>You can build every machine with contacts, coils, timers, counters and blocks. But sooner or later you open a program that somebody else wrote, often 20 years ago, and it is full of <b>jumps</b>, <b>MCR zones</b>, <b>FIFO</b> queues and <b>sequencers</b>. You must be able to read them, find faults in them, and know what to use instead today. They are also classic interview questions.</p>

<h3>Try it first</h3>
[[hw:flow]]

<div class="callout tip"><b>Also in the Lab:</b> the toolbox has <b>JMP</b>, <b>LBL</b>, <b>MCR</b>, <b>FIFO in</b>, <b>FIFO out</b> and <b>LIFO out</b>. A rung that a jump skips is shown pale while the program runs. A queue lives in memory words: with the table MW100, MW100 is the count and MW101 … hold the data.</div>

<h3>1. Jump: skip a part of the program</h3>
<p>A jump (JMP) goes straight to a label (LBL) further down. The rungs in between are <b>not scanned at all</b>.</p>
<ul>
<li>Everything in the skipped part <b>keeps its last state</b>. A motor that was on stays on. This is the trap.</li>
<li>A timer in the skipped part is not checked: its contact does not change while skipped. On many real PLCs the time still runs, so it can be finished at once when it is scanned again. Do not put timers in code that is jumped over.</li>
<li>A jump <b>backwards</b> makes a loop. If the loop never ends, the watchdog stops the CPU.</li>
</ul>
<p><b>Use it for:</b> skipping code that is not needed now, for example the code of a machine option that is not fitted. <b>Never</b> use a jump to switch something off.</p>

<h3>2. Zone (MCR): switch a group of rungs off</h3>
<p>A zone has a start and an end. When the zone is <b>off</b>, the rungs inside are still scanned, but each one is solved as <b>false</b>.</p>
<ul>
<li>Normal coils inside go <b>off</b>.</li>
<li>On-delay timers reset.</li>
<li><b>Latched bits (SET) keep their state</b>, because a false rung does not run the SET and does not run the RESET.</li>
</ul>
<div class="callout warn"><b>An MCR zone is not a safety function.</b> The name "master control relay" comes from the hard-wired relay that cuts the power to the outputs. The instruction only changes how software rungs are solved. Emergency stop stays hard-wired or goes through a safety relay or safety PLC.</div>

<h3>Jump or zone: the difference in one table</h3>
<div class="tbl"><table>
<tr><th>Inside the part that is switched off</th><th>Jump over it</th><th>MCR zone off</th></tr>
<tr><td>Are the rungs scanned?</td><td>No</td><td>Yes, as false</td></tr>
<tr><td>Normal coil ( )</td><td>keeps its last state</td><td>goes off</td></tr>
<tr><td>Latched bit (S)</td><td>keeps its state</td><td>keeps its state</td></tr>
<tr><td>On-delay timer</td><td>not updated</td><td>resets</td></tr>
<tr><td>Scan time</td><td>shorter</td><td>the same</td></tr>
</table></div>

<h3>3. Queue: FIFO and LIFO</h3>
<p>A queue is a small table with two instructions: <b>load</b> puts a value in, <b>unload</b> takes one out.</p>
<ul>
<li><b>FIFO</b> (first in, first out): the oldest value comes out first, like people waiting in a line. Use it to track parts on a line: the camera stores "good" or "bad", and the reject arm further down takes the results out in the same order.</li>
<li><b>LIFO</b> (last in, first out): the newest value comes out first, like a stack of plates. Use it for a stacker, where the last pallet in is the first one out.</li>
</ul>
<p>Always look at two bits: <b>EMPTY</b> before you unload, and <b>FULL</b> before you load. A load into a full queue is lost, and from then on every result belongs to the wrong part.</p>
<p>Parts that move one place with every machine cycle are easier with a <a href="#lesson-shift-registers">shift register</a>. A queue is better when parts come at random times.</p>

<h3>4. Sequencer: a table of output patterns</h3>
<p>A sequencer (drum) holds a table. Each row is one step: which outputs are on. A pulse moves it to the next row, and it copies that row to the outputs. It is the software copy of the old mechanical drum with cams.</p>
<p><b>Good:</b> short, and easy to change the pattern. <b>Bad:</b> hard to read when you look for a fault, because the rung does not show <i>why</i> the machine waits. Today most people write a <a href="#lesson-sfc">step sequence</a> with one bit or one number per step, or CASE in Structured Text.</p>

<h3>The names in each software</h3>
<div class="tbl"><table>
<tr><th></th><th>Studio 5000</th><th>Siemens TIA</th><th>CODESYS / TwinCAT</th><th>Schneider (M221)</th><th>Omron</th></tr>
<tr><td>Jump</td><td>JMP, LBL</td><td>JMP, JMPN, LABEL</td><td>jump and label in LD; JMP in ST</td><td>jump to %Li</td><td>CJP … JME (JMP … JME jumps when its condition is OFF)</td></tr>
<tr><td>Zone</td><td>MCR</td><td>only in S7-300/400 (MCR&lt; MCR&gt;); not in S7-1200/1500</td><td>none: use IF or the EN input</td><td>MCS, MCR (small controllers)</td><td>IL, ILC (interlock)</td></tr>
<tr><td>Queue</td><td>FFL, FFU and LFL, LFU</td><td>library blocks (LGF FIFO / LIFO) or an array with an index</td><td>your own block with an array</td><td>register %Ri (FIFO or LIFO)</td><td>stack instructions (push, FIFO, LIFO)</td></tr>
<tr><td>Sequencer</td><td>SQO, SQI, SQL</td><td>S7-GRAPH, or an array with a step index (old: DRUM)</td><td>array with a step index, or CASE</td><td>drum controller %DRi</td><td>array with a step index</td></tr>
</table></div>
<div class="callout tip"><b>What to write today:</b> blocks with an enable input in place of jumps and zones, an array with an index for a queue, and a step sequence in place of a sequencer. Read the old instructions, do not copy them into new programs without a reason.</div>
<div class="callout where"><b>Where:</b> older Allen-Bradley and Omron machines are full of JMP, MCR / IL, FIFO and SQO. In interviews: "What is the difference between a jump and an MCR zone?" and "How do you track a bad part to the reject station?"</div>
`,
      sims: {},
      takeaways: ["A jump does not scan the rungs: everything in there keeps its last state.", "An MCR zone solves its rungs as false: coils drop, timers reset, latched bits stay.", "An MCR zone is not a safety function.", "FIFO gives the oldest value, LIFO the newest. Check EMPTY and FULL.", "A sequencer is a table of output patterns with a step pointer."],
      mistakes: ["Jumping over a rung to switch its output off: the output stays on.", "Thinking an MCR zone resets latched bits.", "Using MCR in place of a hard-wired emergency stop.", "Loading a full queue: every later result belongs to the wrong part.", "A backward jump with no way out: the watchdog stops the CPU."],
      challenges: ["db-recipe", "iv-seqstop"],
    },
    {
      id: 'iec', level: 5, title: 'Beyond ladder: IEC 61131-3 & CODESYS', min: 8,
      summary: 'LD, FBD, ST, SFC and IL: the same logic in five languages, and when to pick each.',
      body: `
<h3>The five IEC 61131-3 languages</h3>
<div class="tbl"><table>
<tr><th>Language</th><th>Looks like</th><th>Best for</th></tr>
<tr><td><b>LD</b> Ladder Diagram</td><td>Relay schematic</td><td>Discrete logic, interlocks, maintenance-friendly code</td></tr>
<tr><td><b>FBD</b> Function Block Diagram</td><td>Logic gates & boxes</td><td>Process control, signal flow, PID</td></tr>
<tr><td><b>ST</b> Structured Text</td><td>Pascal-like code</td><td>Math, loops, data handling, recipes, state machines</td></tr>
<tr><td><b>SFC</b> Sequential Function Chart</td><td>Flowchart of steps</td><td>Sequences (steps + transitions)</td></tr>
<tr><td><b>IL</b> Instruction List</td><td>Assembly</td><td>Legacy (deprecated)</td></tr>
</table></div>
<p>In CODESYS, TIA Portal and Studio 5000 you can mix them: ladder for interlocks, ST for calculations, SFC for the sequence.</p>
<h3>Your ladder as Structured Text</h3>
<p>Press the <b>ST</b> button in the simulator: PLC Start translates every rung. Example:</p>
<pre class="code">(* Start/stop latch *)
Motor := (Start OR Motor) AND Stop AND OL;
(* 3 s on-delay *)
T0(IN := Switch, PT := T#3s);
Lamp := T0.Q;</pre>
<div class="callout where"><b>Next steps after PLC Start:</b> install CODESYS (free) and try its built-in simulator, or Siemens TIA Portal with PLCSIM. Recreate the challenges you solved here: same logic, real tools.</div>`,
      sims: {},
      takeaways: ['LD for logic, ST for math, SFC for sequences.', 'Every rung has a Boolean equivalent.'],
      mistakes: ['Forcing everything into ladder when ST would be clearer, or the other way round.'],
      challenges: [],
    },
    // ═══════════════════════ LEVEL 6 ═══════════════════════
    {
      id: 'tool-id', level: 6, title: 'Tool identification, recipes & HMI', min: 14,
      summary: 'One machine, many tools: read the tool\'s barcode, check it against a table, run that tool\'s sequence, and talk to the operator through an HMI.',
      body: `
<h3>Where you find this in industry</h3>
<p>Flexible machines run several product variants with <b>interchangeable tooling</b>: welding and assembly fixtures in car-body shops, press dies, injection moulds, robot grippers (end-of-arm tools), test adapters. Each tool carries an identity: a <b>barcode</b> or 2D code, or an <b>RFID tag</b> (Balluff, SICK, Siemens RF, Pepperl+Fuchs…). The PLC reads it, looks it up, and only runs the sequence that belongs to that tool. This is <b>poka-yoke</b> (mistake-proofing): the wrong tool or an unknown tool simply cannot start a cycle.</p>
<h3>1. The scanner handshake</h3>
<ol>
<li>PLC sets the <b>trigger</b> output (Q0.7).</li>
<li>The scanner reads and answers with a status bit, <b>read OK</b> or <b>no read</b>, and puts the code in a <b>data word</b> (%IW2).</li>
<li>PLC evaluates the result <b>only while the status is valid</b>, then drops the trigger.</li>
</ol>
<p>Real scanners talk over PROFINET / EtherNet/IP / IO-Link with exactly this pattern: trigger, busy/done/error bits and a data area. Always handle the error case and add a timeout.</p>
<h3>2. Validate the code</h3>
<p>Never trust a read blindly. Compare it with a <b>table of known tools</b>: in ladder with CMP rungs, in ST with a FOR loop over an array. An unknown code is an alarm, not "probably Tool A".</p>
<pre class="code">Tool := 0;
FOR i := 1 TO 2 DO
  IF Barcode = ToolCode[i] THEN Tool := i; END_IF
END_FOR
IF Tool = 0 THEN HmiAlarm := 2; Step := 90; END_IF   (* unknown tool *)</pre>
<h3>3. Two ways to program the variants</h3>
<div class="tbl"><table>
<tr><th></th><th>Dedicated sequence per tool</th><th>Recipe-driven (data tables)</th></tr>
<tr><td>Idea</td><td>Tool A steps 10–18, Tool B steps 30–38</td><td>One generic sequence; what differs is data: clamp groups, fitted clamps, process time</td></tr>
<tr><td>Good for</td><td>2–3 very different tools; easy to read in ladder</td><td>Many similar tools; adding Tool C = adding table data</td></tr>
<tr><td>Risk</td><td>Copy-paste errors, programs grow with every tool</td><td>Table mistakes; needs validation and good HMI display</td></tr>
</table></div>
<p>The fixture station projects let you build both: dedicated sequences in ladder (Level 6), recipe-driven in ST (Level 7). Adding Tool C in both shows the difference.</p>
<h3>4. Talking to the HMI</h3>
<p>An HMI does not run your logic. It <b>reads and writes PLC tags</b>. The usual pattern:</p>
<ul>
<li><b>Status words</b> the PLC writes and the HMI displays: message number (MW20), tool (MW21), step (MW22), counters, alarm number (MW26). The HMI has a text list that turns each number into a sentence, possibly in several languages.</li>
<li><b>Command bits</b> the HMI writes and the PLC reads: START, RESET, mode selection. Treat them like push buttons, and use edges when they must act once.</li>
<li>Keep safety-related functions (STOP, E-stop) on <b>real hard-wired buttons</b>, never only on the touch screen.</li>
</ul>
<h3>5. Alarms and safe states</h3>
<ul>
<li>Every move gets a <b>watchdog</b>: a clamp that does not close in time is an alarm with a clear text.</li>
<li>On an alarm: valves to the safe state, red lamp, message, wait for <b>RESET</b>, then re-identify the tool.</li>
<li><b>Tool change</b> only with clamps open and no part, then always <b>read the tool again</b>. The PLC must never assume the old tool is still there.</li>
<li>Only drive outputs the current tool actually has (a <b>fitted mask</b>), so a missing clamp never gets air.</li>
</ul>
<div class="callout where"><b>Try it:</b> Lab → machine "Flexible fixture station" → <b>ⓘ How it works</b>. Then do the ladder projects in order: identify the tool → two sequences → MANUAL mode → add Tool C → production orders. The same machine in ST (recipe tables) comes in Level 7.</div>`,
      sims: {},
      takeaways: ['Trigger → status bit → data word; evaluate only while valid, handle no-read.', 'Validate the code against a table; unknown = alarm.', 'Dedicated sequences per tool or one recipe-driven sequence.', 'HMI = status words + command bits; STOP stays hard-wired.'],
      mistakes: ['Assuming the tool did not change after a tool change.', 'Driving clamps the current tool does not have.', 'Putting STOP only on the touch screen.'],
      challenges: ['fixture-id', 'fixture', 'fixture-man', 'fixture-c', 'fixture-orders', 'st-fixture'],
    },
    {
      id: 'robot-interface', level: 6, title: "PLC and robot: the handshake", min: 11,
      summary: "How a PLC works with an industrial robot: job number, START, BUSY, DONE and the handshake between them, the CLEAR signal that keeps robot and machine apart, the step sequence for a machine-tending cell, fault handling and where safety sits.",
      body: `
<h3>The PLC does not move the robot</h3>
<p>An industrial robot has its own controller and its own programs, written by a robot programmer. Your PLC is the <b>boss of the cell</b>: it knows when the machine door is open, when a part waits, when the machine is finished. It tells the robot <b>which job</b> to do and <b>when</b>, and it waits for the answer. The two talk with a handful of signals, hard-wired or over PROFINET / EtherNet/IP.</p>

<h3>The handshake</h3>
<div class="tbl"><table>
<tr><th>Step</th><th>PLC → robot</th><th>Robot → PLC</th></tr>
<tr><td>1</td><td>Checks: robot READY and at HOME</td><td>READY = 1, HOME = 1</td></tr>
<tr><td>2</td><td>Sets the <b>job number</b>, then <b>START</b> = 1</td><td></td></tr>
<tr><td>3</td><td></td><td><b>BUSY</b> = 1, HOME = 0. The robot works</td></tr>
<tr><td>4</td><td></td><td>Finished: <b>DONE</b> = 1, BUSY = 0</td></tr>
<tr><td>5</td><td>Sees DONE: <b>START</b> = 0</td><td></td></tr>
<tr><td>6</td><td></td><td>Sees START = 0: <b>DONE</b> = 0. Ready for the next job</td></tr>
</table></div>
<p>Why so many steps? Because each side <b>confirms</b> what it saw. If the PLC only gave a short pulse, the robot could miss it. If the robot only gave a short DONE, the PLC could miss it. With a handshake nothing is lost, even when one side is slow.</p>
<div class="callout tip"><b>Rule:</b> set the job number first, START after it, and do not change the job number while START is on.</div>

<h3>Zones: who may be where</h3>
<p>The robot and the machine share a space: the inside of the machine. One more signal keeps them apart: <b>CLEAR</b> ("I am outside the machine"). The PLC uses it in two interlocks:</p>
<ul>
<li>The door may close only when the robot is CLEAR.</li>
<li>The machine may start only when the door is closed <b>and</b> the robot is CLEAR.</li>
</ul>
<p>And the other way: the robot gets START only when the door is fully <b>open</b>. Big cells have several such zones, between two robots or between a robot and a press.</p>

<h3>As a step sequence</h3>
<pre class="code">10  open the door            → door open
20  robot START, job LOAD    → DONE
30  START off                → DONE off, robot CLEAR
40  close the door           → door closed
50  machine cycle start      → part finished
60  open the door            → door open
70  robot START, job UNLOAD  → DONE
80  START off                → DONE off, robot CLEAR
90  close the door           → door closed, back to 0</pre>
<p>Every step waits for a real signal. The outputs only read the step number. Add a time limit to each step: if the robot does not answer in 20 s, stop and show which step is waiting. That one line of alarm text saves hours.</p>

<h3>When the robot has a fault</h3>
<ul>
<li>READY goes off, FAULT comes on. Take START away and freeze the sequence.</li>
<li>Do not move the door or the machine while the arm may be inside.</li>
<li>After the fault is fixed at the robot: RESET, bring the robot HOME, and only then restart the cycle from a known step.</li>
</ul>

<h3>Safety is separate</h3>
<p>The fence door, the E-stop and the enabling switch of the robot go through the <b>safety system</b> (safety relay or safety PLC) to the robot's safety inputs. Your normal program only reads their state. A robot cell is usually PL d: see <a href="#lesson-safety-design">Safety design</a>.</p>

<h3>The names you will meet</h3>
<div class="tbl"><table>
<tr><th>Robot</th><th>How the PLC starts programs</th></tr>
<tr><td>FANUC</td><td>UOP signals (UI / UO), program select with RSR or PNS numbers</td></tr>
<tr><td>KUKA</td><td>"Automatic External" interface with a program number</td></tr>
<tr><td>ABB</td><td>System inputs and outputs (Start, Motors On…), often with a main routine that reads a job number</td></tr>
<tr><td>Universal Robots, Yaskawa, others</td><td>Digital I/O or a fieldbus, with the same idea</td></tr>
</table></div>
<div class="callout where"><b>Where:</b> machine tending, palletizing, welding cells, press lines. In interviews: "How does a PLC talk to a robot?" Answer with the handshake and the zone signal. Try it on the <b>Robot cell</b> machine in the Lab.</div>`,
      sims: {},
      takeaways: ["The PLC tells the robot which job and when. The robot moves by itself.", "Handshake: START, wait for DONE, START off, wait for DONE off.", "Job number first, then START. Do not change it while START is on.", "CLEAR is the zone signal: no door move and no machine start without it.", "Every step waits for a real signal and has a time limit."],
      mistakes: ["A short START pulse the robot can miss.", "Closing the door or starting the machine without the CLEAR signal.", "Changing the job number while the robot reads it.", "Restarting in the middle of a cycle after a robot fault.", "Safety signals wired through the normal PLC."],
      challenges: ["robot-1", "robot-2", "bug-robot"],
    },
    {
      id: 'project-method', level: 6, title: 'How to plan a real project', min: 10,
      summary: 'From a machine description to a working, tested program in seven steps.',
      body: `
<p>The Level 6 projects are whole machines. Nobody writes those rung by rung from the top. Engineers follow a routine, and the routine is the skill that transfers to every PLC brand.</p>
<h3>1. Understand the machine</h3>
<p>Watch it (open the project and play with the buttons with an empty program). What moves? What can be sensed? What can go wrong or hurt someone?</p>
<h3>2. Write the I/O list</h3>
<p>Address, name, type (NO/NC button, sensor), and what <b>1</b> means. The I/O list in each project task is your starting point.</p>
<h3>3. Describe the sequence in words, then as a step table</h3>
<p>Example for the bottle filling line:</p>
<div class="tbl"><table>
<tr><th>Step</th><th>Outputs on</th><th>Go to next step when</th></tr>
<tr><td>0 Idle</td><td>none</td><td>START pressed → 1</td></tr>
<tr><td>1 Index</td><td>Conveyor</td><td>a bottle <b>arrives</b> (rising edge of "in place") → 2</td></tr>
<tr><td>2 Fill</td><td>Fill valve</td><td>"bottle full" → 1</td></tr>
<tr><td>any</td><td>none</td><td>STOP → 0</td></tr>
</table></div>
<p>The step table is the program. Each row becomes one transition rung, and each output column becomes one output rung.</p>
<h3>4. Safety and interlocks first</h3>
<p>List what must <b>never</b> happen: valve open without a bottle, motor up and down together, heater on in an empty tank, car moving with the door open. Make sure every one is blocked by logic (and where a person can be hurt, by a hard-wired or safety-rated function as well) before you add any convenience.</p>
<h3>5. Build: transitions, then outputs</h3>
<p>Write the step logic (memory bits or a step number in MW0), then one rung per output decoded from the steps. One coil per output.</p>
<h3>6. Test the normal cycle with Step and slow motion</h3>
<p>Use <b>¼×</b> speed and watch the step word in the values table. Does each step end exactly when you planned?</p>
<h3>7. Test the abnormal cases</h3>
<ul>
<li>STOP in the middle of every step.</li>
<li>A sensor that never comes (does the machine wait safely, or raise an alarm?).</li>
<li>Pressing buttons at the wrong time, or two at once.</li>
<li>Power loss and restart (press Reset): no surprise movement.</li>
</ul>
<div class="callout tip"><b>Tracking trick (sorter project):</b> when an item is measured at one place and acted on further down the line, the PLC must <b>remember</b> the result until the item arrives. With one item in between, a single bit is enough. With several, real machines use a shift register or a FIFO of words.</div>
<div class="callout where"><b>Where:</b> this is how commissioning engineers work on packaging lines, process skids, lifts and warehouse sorters, whatever the PLC brand.</div>`,
      sims: {},
      takeaways: ['I/O list → step table → safety → transitions → outputs → test normal → test abnormal.', 'The step table is the program.', 'Remember measured data until the item reaches the station that uses it.'],
      mistakes: ['Starting to draw rungs before the sequence is written down.', 'Testing only the happy path.'],
      challenges: ['ped-crossing', 'bottling', 'mixer', 'elevator', 'sorter', 'carwash', 'pump-station', 'level-control', 'drill-station', 'oven', 'traffic-night', 'washer', 'crane', 'indexer', 'auto-batching', 'gate', 'compressor', 'capline', 'palletizer'],
    },
    {
      id: 'lift-control', level: 6, title: 'Elevator control: how real lifts think', min: 14,
      summary: 'Floor position, door operator, call memory, collective selective control, two-speed levelling, the safety chain, inspection and fire service: the whole logic of a passenger lift.',
      body: `
<h3>Why the elevator is the classic PLC project</h3>
<p>A lift looks simple (go to a floor, open the door) but it combines almost everything: memory (calls), position tracking, a decision about direction, a sequence for the door, timers, speed control, and safety rules that must never be broken. Lift controllers in buildings do exactly this, often in a PLC or a dedicated controller with the same logic.</p>
<h3>1. Where is the car?</h3>
<p>Each floor has a <b>door-zone</b> sensor (a magnet or vane in the shaft) that is on only while the car is level. The PLC remembers the <b>last floor seen</b> in a word (MW0). Between floors the car is "after floor MW0". Big lifts use an absolute encoder instead, but the idea is the same.</p>
<h3>2. The door operator</h3>
<p>A door motor with OPEN and CLOSE and two limit switches, programmed as a small state machine: closed → opening → open (dwell) → closing → closed. The <b>photo-eye</b> (light curtain) and the open button reopen a closing door. The car may move <b>only</b> with the door closed: in real lifts the door contacts are part of the hard-wired <b>safety chain</b>.</p>
<h3>3. Calls and direction</h3>
<div class="tbl"><table>
<tr><th>Term</th><th>Meaning</th></tr>
<tr><td>Car call</td><td>Button inside the car: "take me to floor k". Stop in either direction.</td></tr>
<tr><td>Hall call</td><td>Button on the landing, UP or DOWN: "I want to go up/down from here".</td></tr>
<tr><td>Registered</td><td>Stored in memory and shown by the button lamp until served.</td></tr>
<tr><td>Collective selective</td><td>Travelling up, stop for car calls and UP hall calls; on the way down, for car calls and DOWN hall calls. The highest DOWN call is served on the way up (the car turns there), the lowest UP call on the way down.</td></tr>
</table></div>
<p>The direction is a latch: keep going while calls are ahead, then reverse. <b>Hold the direction while the door is open</b>, or the car forgets why it stopped. Allow a start only if there are calls in that direction.</p>
<h3>4. Two speeds and levelling</h3>
<p>Fast travel, then a <b>slow-down point</b> before the stopping floor, then a slow approach and a stop on the door-zone sensor. The PLC decides at the slow-down vane: "does the next floor want a stop?" A call that arrives after that point is too late: the car passes and serves it later. Modern lifts do the same with a variable-frequency drive and a speed profile.</p>
<h3>5. Special operations</h3>
<ul>
<li><b>Overload:</b> the weighing device stops the car from leaving; the door stays open and a buzzer sounds.</li>
<li><b>Car stop switch / safety chain:</b> stop at once, independent of the program logic.</li>
<li><b>Inspection:</b> for maintenance on the car roof: hold-to-run at slow speed, no calls, no automatic doors.</li>
<li><b>Fire service recall (Phase I):</b> cancel all calls, return nonstop to the main floor, park with the door open for the fire brigade.</li>
</ul>
<div class="callout tip"><b>How these projects were tested:</b> besides the normal tests, the reference program was run against hundreds of random passengers pressing random buttons, with overloads, blocked doors, car-stop presses and fire alarms. That stress testing found real bugs, for example a car that forgot a DOWN call because its direction changed before the door opened. Commissioning engineers do the same: test the strange cases, not only the happy path.</div>
<div class="callout where"><b>Where:</b> passenger and goods lifts, car-park lifts, stacker cranes and shuttles in warehouses (same "calls and direction" logic), and any machine that must serve requests from several places.</div>`,
      sims: {},
      takeaways: ['Door-zone sensors + "last floor seen" give the position.', 'The door is its own state machine; travel only with the door closed and nothing pending.', 'Calls are latched bits with lamps; served when the door opens there.', 'Collective selective: keep the direction while calls are ahead, then reverse.', 'Slow down at the vane before a stop; a late call is served later.', 'Overload, safety chain, inspection and fire service override normal operation.'],
      mistakes: ['Changing direction before the door opens, so the call that caused the stop is forgotten.', 'Deciding "last call" from the car position instead of from the floor in question.', 'Stopping from full speed because the slow-down decision came too late.', 'Opening the door between floors or moving with it open.'],
      challenges: ['lift-1', 'lift-2', 'lift-3', 'lift-4', 'lift-5', 'lift-6', 'lift-7', 'elevator'],
    },
    // ═══════════════════════ LEVEL 7 · ST ═══════════════════════
    {
      id: 'st-basics', level: 7, title: 'Structured Text basics: VAR, :=, IF', min: 10,
      summary: 'The same logic as ladder, written as text. Variables, addresses, assignments and IF.',
      body: `
<h3>Why ST?</h3>
<p>Structured Text is the text language of IEC 61131-3 (CODESYS, TIA Portal's SCL, Studio 5000 ST). Ladder is great for interlocks and quick troubleshooting. ST is better for maths, loops, data and long sequences. Most real projects mix both.</p>
<h3>Program layout</h3>
<pre class="code">PROGRAM PLC_PRG
VAR
  Start  AT %IX0.0 : BOOL;   (* a real input *)
  StopOK AT %IX0.3 : BOOL;   (* wired NC *)
  Motor  AT %QX0.0 : BOOL;   (* a real output *)
  Speed  : INT := 0;         (* internal variable with a start value *)
END_VAR

Motor := (Start OR Motor) AND StopOK;   (* the seal-in rung! *)
END_PROGRAM</pre>
<ul>
<li><code>VAR … END_VAR</code> declares every variable with a <b>type</b>: BOOL, INT, DINT, REAL, TIME, BYTE, WORD, ARRAY, or a function block like TON.</li>
<li><code>AT %IX0.0</code> binds a variable to an address. <code>%IX</code> = input bit, <code>%QX</code> = output bit, <code>%MX</code> = memory bit, <code>%IW/%QW/%MW</code> = words, <code>%IB/%QB</code> = bytes. (PLC Start also accepts I0.0 / Q0.0.)</li>
<li><code>:=</code> assigns. <code>=</code> only compares. Every statement ends with <code>;</code></li>
<li>Comments: <code>(* … *)</code> or <code>// …</code></li>
</ul>
<h3>Ladder ↔ ST</h3>
<div class="tbl"><table>
<tr><th>Ladder</th><th>ST</th></tr>
<tr><td>Series contacts</td><td><code>A AND B</code></td></tr>
<tr><td>Parallel branch</td><td><code>A OR B</code></td></tr>
<tr><td>NC contact</td><td><code>NOT A</code></td></tr>
<tr><td>Coil</td><td><code>Q := …;</code></td></tr>
<tr><td>SET / RESET coil</td><td><code>IF S THEN Q := TRUE; END_IF</code></td></tr>
</table></div>
<h3>IF / ELSIF / ELSE</h3>
[[sim:latch]]
<div class="callout warn"><b>Classic ST bug:</b> an assignment inside an IF without an ELSE <b>keeps</b> its value when the condition goes false. It behaves like a SET coil, not a normal coil. Either add an ELSE, or write the plain assignment <code>Lamp := Motor;</code>.</div>
<div class="callout tip">In the Lab, switch the toolbar to <b>ST</b> to write your own programs for any machine. <b>File → Insert I/O declarations</b> writes the VAR block for you.</div>`,
      sims: { latch: { lang: 'st', program: "VAR\n  Start  AT %IX0.0 : BOOL;\n  StopOK AT %IX0.3 : BOOL;   (* wired NC *)\n  Motor  AT %QX0.0 : BOOL;\n  Lamp   AT %QX0.1 : BOOL;\n  Speed  : INT;\nEND_VAR\n\n(* the seal-in rung in one line *)\nMotor := (Start OR Motor) AND StopOK;\n\nIF Motor THEN\n  Speed := 1450;\n  Lamp := TRUE;\nELSE\n  Speed := 0;\n  Lamp := FALSE;\nEND_IF", inputs: { 'I0.0': pb('START'), 'I0.3': nc('STOP') }, outputs: { 'Q0.0': 'Motor', 'Q0.1': 'Lamp' }, note: 'Same behaviour as the ladder seal-in: tap START, then STOP. Watch Speed in the values.' } },
      takeaways: ['VAR … END_VAR with a type for everything.', ':= assigns, = compares, ; ends a statement.', 'AND/OR/NOT are the series, parallel and NC contacts.'],
      mistakes: ['Writing = instead of :=.', 'IF without ELSE accidentally latching an output.'],
      challenges: ['st-latch', 'st-bug-latch'],
    },
    {
      id: 'st-fb', level: 7, title: 'Timers, counters & edges in ST', min: 9,
      summary: 'Function blocks are objects: declare an instance, call it every scan, read .Q and .ET.',
      body: `
<h3>Function block instances</h3>
<pre class="code">VAR
  Delay : TON;        (* one instance = one timer *)
  Count : CTU;
  Edge  : R_TRIG;
END_VAR

Delay(IN := Switch, PT := T#3s);   (* call it EVERY scan *)
Lamp := Delay.Q;                   (* read outputs with a dot *)

Edge(CLK := Button);
IF Edge.Q THEN Presses := Presses + 1; END_IF   (* once per press *)</pre>
<ul>
<li>Each instance has its own memory, so you need a new instance for every timer.</li>
<li>Call the block <b>unconditionally every scan</b>. A timer called inside an IF that turns false stops being updated.</li>
<li>Time literals: <code>T#500ms</code>, <code>T#3s</code>, <code>T#1m30s</code>.</li>
<li>Outputs: TON/TOF/TP have <code>.Q .ET</code>, CTU/CTD have <code>.Q .CV</code>, R_TRIG/F_TRIG have <code>.Q</code>, and RS/SR have <code>.Q1</code>.</li>
</ul>
[[sim:fb]]
<div class="callout tip"><b>Pulse generator trick:</b> <code>Blink(IN := NOT Blink.Q, PT := T#500ms);</code> restarts itself and gives a one-scan pulse every 0.5 s. Toggling a lamp on that pulse makes it flash.</div>`,
      sims: { fb: { lang: 'st', program: "VAR\n  PB  AT %IX0.0 : BOOL;\n  SW  AT %IX0.4 : BOOL;\n  L1  AT %QX0.0 : BOOL;\n  L2  AT %QX0.1 : BOOL;\n  Delay : TON;\n  Blink : TON;\n  Edge  : R_TRIG;\n  Presses : INT;\nEND_VAR\n\nDelay(IN := SW, PT := T#2s);\nL1 := Delay.Q;\n\nEdge(CLK := PB);\nIF Edge.Q THEN Presses := Presses + 1; END_IF\n\n(* self-restarting timer = pulse every 0.5 s *)\nBlink(IN := NOT Blink.Q, PT := T#500ms);\nIF Blink.Q THEN L2 := NOT L2; END_IF", inputs: { 'I0.0': pb('Count'), 'I0.4': sw('Switch') }, outputs: { 'Q0.0': 'Delayed', 'Q0.1': 'Flasher' } } },
      takeaways: ['Declare an instance, call it every scan, read .Q / .ET / .CV.', 'R_TRIG gives one scan per press.'],
      mistakes: ['Calling a timer only inside an IF.', 'Sharing one timer instance between two jobs.'],
      challenges: ['st-timers', 'st-bug-timer'],
    },
    {
      id: 'st-case', level: 7, title: 'CASE: state machines in ST', min: 11,
      summary: 'The cleanest way to write a sequence: one CASE branch per step.',
      body: `
<h3>Syntax</h3>
<pre class="code">CASE Step OF
  0:      (* idle *)
          IF Start THEN Step := 10; END_IF
  10:     IF A_out THEN Step := 20; END_IF
  20, 30: Lamp := TRUE;            (* several values *)
  40..49: Alarm := TRUE;           (* a range *)
ELSE
  Step := 0;                       (* anything unexpected *)
END_CASE</pre>
<p>Only the branch matching the current value runs, once per scan. The CASE itself never waits: a step "waits" by simply not changing <code>Step</code> until its condition is true, scan after scan.</p>
<h3>The pattern pros use</h3>
<ol>
<li>One INT step variable, numbered in tens (10, 20, 30…) so you can insert steps later.</li>
<li>Inside each branch, only <b>transitions</b>: <code>IF condition THEN Step := next; END_IF</code></li>
<li>After the CASE, <b>decode outputs</b> from the step: <code>Y1 := Step &gt;= 10 AND Step &lt;= 50;</code> One assignment per output, so no output can get stuck on.</li>
<li>Stop / fault handling after the CASE: <code>IF NOT StopOK THEN Step := 0; END_IF</code></li>
</ol>
[[sim:traffic]]
<h3>Your video's circuit, in ST</h3>
<p>The 3-cylinder circuit from the video (A+ B+ C+, then all retract, repeat), written with CASE. Compare it with the ladder version in level 5: same machine, far easier to extend.</p>
<div class="open-row" data-open="st-video"></div>`,
      sims: { traffic: { lang: 'st', program: "VAR\n  Run    AT %IX0.4 : BOOL;\n  Red    AT %QX0.4 : BOOL;\n  Yellow AT %QX0.2 : BOOL;\n  Green  AT %QX0.0 : BOOL;\n  State  : INT := 0;\n  T      : TON;\nEND_VAR\n\nCASE State OF\n  0: (* red *)\n     T(IN := Run, PT := T#3s);\n     IF T.Q THEN T(IN := FALSE); State := 1; END_IF\n  1: (* green *)\n     T(IN := TRUE, PT := T#3s);\n     IF T.Q THEN T(IN := FALSE); State := 2; END_IF\n  2: (* yellow *)\n     T(IN := TRUE, PT := T#1s);\n     IF T.Q THEN T(IN := FALSE); State := 0; END_IF\nEND_CASE\n\nRed := State = 0;\nGreen := State = 1;\nYellow := State = 2;", inputs: { 'I0.4': sw('RUN') }, outputs: { 'Q0.4': 'Red', 'Q0.2': 'Yellow', 'Q0.0': 'Green' }, note: 'One timer, reused in every state. Switch RUN on and watch State in the values.' } },
      takeaways: ['CASE runs one branch per scan; steps wait by not changing Step.', 'Transitions inside CASE, outputs decoded after it.', 'Number steps 10, 20, 30…'],
      mistakes: ['Writing WHILE NOT sensor DO inside a step (see next lesson).', 'Setting outputs inside branches and forgetting to reset them.'],
      challenges: ['st-case-abc', 'st-repeat-count', 'st-traffic', 'st-mixer', 'st-bottling', 'st-gate'],
    },
    {
      id: 'st-loops', level: 7, title: 'FOR, WHILE, REPEAT & arrays', min: 12,
      summary: 'Loops run completely inside one scan. Use them for data, never for waiting.',
      body: `
<h3>Arrays</h3>
<pre class="code">VAR
  Levels : ARRAY[1..10] OF INT;
  Occ    : ARRAY[0..3] OF BOOL := [FALSE, TRUE, FALSE, FALSE];
END_VAR
Levels[3] := 42;</pre>
<p>An index outside the bounds is a <b>runtime fault</b>. Some PLCs stop (S7-1500, Studio 5000), and PLC Start shows it that way. Others (CODESYS, TwinCAT without bounds checking) keep running and silently overwrite other data, which is worse.</p>
<h3>FOR: a known number of times</h3>
<pre class="code">Sum := 0;
FOR i := 1 TO 10 DO
  Sum := Sum + Levels[i];
END_FOR
Average := Sum / 10;

FOR i := 10 TO 1 BY -1 DO … END_FOR   (* counting down *)</pre>
[[sim:for]]
<h3>WHILE: as long as a condition holds</h3>
<pre class="code">i := 0;
WHILE i &lt; 4 DO
  IF NOT Occ[i] THEN EXIT; END_IF   (* EXIT leaves the loop *)
  i := i + 1;
END_WHILE
(* i = first free slot, or 4 if all are occupied *)</pre>
<h3>REPEAT: at least once</h3>
<pre class="code">REPEAT
  n := n * 2;
UNTIL n &gt; 1000
END_REPEAT</pre>
<h3>The rule that matters most</h3>
<p>A loop runs <b>completely within one scan</b>. While it runs, the PLC does not read new inputs or write outputs, so <code>WHILE NOT Sensor DO … END_WHILE</code> can never see the sensor change. The loop runs until the <b>watchdog</b> stops the CPU. Try it:</p>
[[sim:wd]]
<div class="callout warn"><b>Never wait in a loop.</b> To wait for something, use a CASE step (or a timer) that checks the condition once per scan.</div>
<div class="callout where"><b>Where loops are right:</b> summing or averaging samples, searching a recipe table, shifting tracking data along a conveyor, copying blocks of data, checking all alarms in an array.</div>`,
      sims: {
        for: { lang: 'st', program: "VAR\n  S1 AT %IX0.4 : BOOL;  S2 AT %IX0.5 : BOOL;\n  S3 AT %IX0.6 : BOOL;  S4 AT %IX0.7 : BOOL;\n  Lamps AT %QB0 : BYTE;   (* Q0.0 … Q0.7 *)\n  Sw : ARRAY[1..4] OF BOOL;\n  i, OnCount, Pattern : INT;\nEND_VAR\n\nSw[1] := S1; Sw[2] := S2; Sw[3] := S3; Sw[4] := S4;\n\nOnCount := 0;\nFOR i := 1 TO 4 DO\n  IF Sw[i] THEN OnCount := OnCount + 1; END_IF\nEND_FOR\n\n(* show the count as a bar graph *)\nPattern := 0;\nFOR i := 1 TO OnCount DO\n  Pattern := Pattern * 2 + 1;\nEND_FOR\nLamps := Pattern;", inputs: { 'I0.4': sw('S1'), 'I0.5': sw('S2'), 'I0.6': sw('S3'), 'I0.7': sw('S4') }, outputs: { 'Q0.0': 'L1', 'Q0.1': 'L2', 'Q0.2': 'L3', 'Q0.3': 'L4' }, note: 'Switch any two on: two lamps light. The first FOR counts, the second builds the bar pattern.' },
        wd: { lang: 'st', program: "VAR\n  Go     AT %IX0.0 : BOOL;\n  Sensor AT %IX0.4 : BOOL;\n  Lamp   AT %QX0.0 : BOOL;\nEND_VAR\n\n(* WRONG: waiting for a sensor inside WHILE *)\nIF Go THEN\n  WHILE NOT Sensor DO\n    Lamp := TRUE;   (* the sensor can never change in here *)\n  END_WHILE\nEND_IF", inputs: { 'I0.0': pb('Go'), 'I0.4': sw('Sensor') }, outputs: { 'Q0.0': 'Lamp' }, note: 'Press Go with Sensor off: the watchdog stops the PLC. Press reset (↺) to restart it.' },
      },
      takeaways: ['FOR = known count, WHILE = condition first, REPEAT = at least once, EXIT = leave.', 'Loops finish inside one scan, so never wait for inputs in a loop.', 'Array index out of range = PLC fault.'],
      mistakes: ['WHILE i < 4 AND Occ[i] … reads Occ[4], because ST evaluates both sides of AND.', 'Waiting for a sensor in WHILE: watchdog stop.'],
      challenges: ['st-for-bargraph', 'st-while-slot', 'st-average', 'st-elevator'],
    },
    {
      id: 'st-advanced', level: 7, title: "ST for big programs: data types, enums and methods", min: 11,
      summary: "Three tools beyond the basics of Structured Text: your own data types (STRUCT / UDT), named states (ENUM), and function blocks with methods, EXTENDS and INTERFACE, with advice on when they help and when they hurt.",
      body: `
<h3>Three tools that make big programs small</h3>
<p>With the basics of Structured Text you can write any logic. These three tools let you write it <b>once</b> and keep it tidy. The Lab runs IF, CASE, loops, arrays and function blocks, but not the things on this page: read them here, and use them in CODESYS or TwinCAT (TIA Portal SCL has data types, but no methods).</p>

<h3>1. Your own data types (STRUCT / UDT)</h3>
<p>A motor is never one bit. It is a start command, a feedback, a fault, a run-hours counter. A <b>structure</b> keeps them together under one name:</p>
<pre class="code">TYPE ST_Motor :
STRUCT
  Start    : BOOL;
  Running  : BOOL;     (* feedback from the contactor *)
  Fault    : BOOL;
  RunHours : REAL;
END_STRUCT
END_TYPE

VAR
  Pump1, Pump2 : ST_Motor;
  Fans : ARRAY[1..8] OF ST_Motor;
END_VAR

IF Pump1.Fault THEN Pump2.Start := TRUE; END_IF
Fans[3].Start := TRUE;</pre>
<p>Siemens calls it a <b>PLC data type (UDT)</b>, Rockwell a <b>user-defined data type</b>, CODESYS a <b>DUT</b>. Add one field and all eight fans have it.</p>

<h3>2. Names for numbers (ENUM)</h3>
<p>"Step 30" tells nobody anything. An <b>enumeration</b> gives each number a name, and the compiler checks your spelling:</p>
<pre class="code">TYPE E_State : (Idle, Filling, Heating, Draining, Fault); END_TYPE

VAR State : E_State; END_VAR

CASE State OF
  E_State.Idle:    IF StartPB THEN State := E_State.Filling; END_IF
  E_State.Filling: Valve := TRUE;
                   IF LevelHigh THEN State := E_State.Heating; END_IF
END_CASE</pre>
<p>Online you now read "Heating" in the watch table, not 20.</p>

<h3>3. Blocks with methods (object-oriented ST)</h3>
<p>CODESYS, TwinCAT and Schneider Machine Expert (and the separate Siemens tool SIMATIC AX) let a function block have <b>methods</b>: small named actions that belong to the block.</p>
<pre class="code">FUNCTION_BLOCK FB_Valve
VAR
  Output   : BOOL;
  OpenTime : TON;
END_VAR

METHOD Open  : BOOL   Output := TRUE;   END_METHOD
METHOD Close : BOOL   Output := FALSE;  END_METHOD

(* in the program *)
Inlet.Open();
IF TankFull THEN Inlet.Close(); END_IF</pre>
<p>Three more words you will meet:</p>
<ul>
<li><b>EXTENDS</b>: a new block takes everything from an old one and adds to it. FB_ControlValve EXTENDS FB_Valve.</li>
<li><b>INTERFACE</b>: a list of methods that different blocks promise to have. Then a pump and a valve can both be told <code>Start()</code>.</li>
<li><b>PROPERTY</b>: a value of the block that you read or write like a variable, with code behind it.</li>
</ul>

<h3>When to use it, and when not</h3>
<div class="tbl"><table>
<tr><th>Good</th><th>Careful</th></tr>
<tr><td>Twenty equal devices: one tested block, one data type</td><td>Maintenance must be able to read it online. Many plants ask for ladder, or forbid deep inheritance</td></tr>
<tr><td>Machine builders with a library used on every machine</td><td>Rockwell Logix has no methods: you use AOIs and UDTs</td></tr>
<tr><td>Clear names: <code>Conveyor.Start()</code></td><td>Three levels of EXTENDS for one valve is too clever</td></tr>
</table></div>
<div class="callout where"><b>Where:</b> TwinCAT and CODESYS projects, machine builders' libraries, and more and more in TIA Portal. In interviews for those jobs: "What is the difference between a function and a function block?" (a function has no memory) and "What is a UDT for?"</div>`,
      sims: {},
      takeaways: ["A STRUCT / UDT keeps everything about one device under one name.", "An ENUM gives step numbers readable names.", "A method is a named action that belongs to a function block.", "A function has no memory. A function block has.", "Write for the person who must read it online at night."],
      mistakes: ["Twenty copies of the same code with different tag numbers.", "Step numbers with no names.", "Deep inheritance that nobody on site can follow.", "Using methods on a platform that maintenance cannot open.", "Forgetting that the Lab does not run these parts."],
      challenges: ["st-case-abc", "st-average"],
    },
  ];

  // keep "How to plan a real project" first in level 6, then tool identification
  (function () {
    const L = LL.LESSONS, i = L.findIndex((l) => l.id === 'tool-id');
    if (i >= 0) { const [t] = L.splice(i, 1); L.splice(L.findIndex((l) => l.id === 'project-method') + 1, 0, t); }
  })();

  // Programs opened in the full simulator from lessons
  LL.OPEN_PROGRAMS = {
    'st-video': {
      plant: 'cylinders', lang: 'st',
      program: "PROGRAM PLC_PRG\n(* The 3-cylinder video circuit, written with CASE:\n   A+ B+ C+, then all retract together, repeat while running *)\nVAR\n  Start  AT %IX0.0 : BOOL;\n  StopOK AT %IX0.1 : BOOL;   (* wired NC: TRUE when not pressed *)\n  A0 AT %IX0.2 : BOOL;  A1 AT %IX0.3 : BOOL;\n  B0 AT %IX0.4 : BOOL;  B1 AT %IX0.5 : BOOL;\n  C0 AT %IX0.6 : BOOL;  C1 AT %IX0.7 : BOOL;\n  Y1 AT %QX0.0 : BOOL;  Y2 AT %QX0.1 : BOOL;  Y3 AT %QX0.2 : BOOL;\n  Running : BOOL;     (* M0.1 in the video *)\n  Step : INT := 0;\nEND_VAR\n\nRunning := (Start OR Running) AND StopOK;\n\nCASE Step OF\n  0:  IF Running AND A0 AND B0 AND C0 THEN Step := 10; END_IF\n  10: IF A1 THEN Step := 20; END_IF     (* A out: sensor 1 *)\n  20: IF B1 THEN Step := 30; END_IF     (* B out: sensor 2 *)\n  30: IF C1 THEN Step := 40; END_IF     (* C out: sensor 3 *)\n  40: IF A0 AND B0 AND C0 THEN Step := 0; END_IF   (* all home *)\nEND_CASE\n\nIF NOT Running AND Step <> 40 THEN Step := 0; END_IF\n\nY1 := Step >= 10 AND Step <= 30;\nY2 := Step >= 20 AND Step <= 30;\nY3 := Step = 30;\nEND_PROGRAM",
    },
    video: {
      plant: 'cylinders',
      program: 'NAME 3-cylinder sequence (video circuit)\nRUNG M0.1 running: Stop · (Start ∥ M0.1)\nNO(I0.1) | NO(I0.0) | COIL(M0.1)\n. NO(M0.1)\nRUNG Valve 1: extend A while running and not retracting\nNO(M0.1) NC(M0.2) COIL(Q0.0)\nRUNG Valve 2: extend B when A is out (Sensor 1)\nNO(I0.3) NO(M0.1) NC(M0.2) COIL(Q0.1)\nRUNG Valve 3: extend C when B is out (Sensor 2)\nNO(I0.5) NO(M0.1) NC(M0.2) COIL(Q0.2)\nRUNG M0.2 retract all: C out (Sensor 3), held until M0.3\nNO(I0.7) NO(M0.1) | NC(M0.3) COIL(M0.2)\nNO(M0.2) -\nRUNG M0.3 retract done: C home (Sensor 4)\nNO(I0.6) NO(M0.2) COIL(M0.3)',
    },
  };

  // ───────────────────────── glossary ─────────────────────────
  LL.GLOSSARY = [
    ['FC (function)', 'A block without memory: the same inputs always give the same outputs. Used for maths and simple logic. FUNCTION in IEC 61131-3.'],
    ['FB (function block)', 'A block with its own memory (static variables, timers, edges). Every call needs its own instance. FUNCTION_BLOCK in IEC 61131-3, an AOI in Studio 5000.'],
    ['Instance', 'The memory of one call of an FB: its own static variables and timers. In TIA Portal an instance DB.'],
    ['Static variable', 'A variable inside an FB that keeps its value from scan to scan (one per instance).'],
    ['Temporary variable', 'A variable inside a block that is thrown away after the call. An FC has only these.'],
    ['IN_OUT parameter', 'A block parameter that the block both reads and writes.'],
    ['POU (program organisation unit)', 'IEC 61131-3 word for a PROGRAM, a FUNCTION or a FUNCTION_BLOCK.'],
    ['Life word', 'A counter the PLC sends to another device, +1 every 0.1 s (for example 0 to 599). The other side echoes it; while the echo keeps changing, the link is alive.'],
    ['Echo (life word reply)', 'The value a remote device copies back from what it received, so the sender can see the link works.'],
    ['Communication watchdog', 'A timer or stopwatch in the program that sets an alarm when data from another device stops changing for too long.'],
    ['Response time (comm)', 'How long the other side takes to answer: the time between two changes of the echo. Measured with a stopwatch in the watchdog.'],
    ['Venturi ejector', 'A vacuum generator without moving parts: compressed air through a nozzle drags the air out of a suction cup.'],
    ['Vacuum switch', 'A switch on a vacuum gripper that tells the PLC the vacuum is reached, so the part is held.'],
    ['Blow-off pulse', 'A short puff of air into a suction cup after the vacuum is switched off, so the part lets go at once.'],
    ['ISO 1219', 'The standard for pneumatic and hydraulic symbols (part 1) and for drawings and names like 1A1, 1V1, 1B1 (part 2).'],
    ['5/2 valve', 'A directional valve with 5 ports (1 supply, 2 and 4 to the cylinder, 3 and 5 exhaust) and 2 positions. The standard valve for a double-acting cylinder.'],
    ['3/2 valve', 'A valve with 3 ports (1 supply, 2 out, 3 exhaust) and 2 positions. Drives a single-acting cylinder; normally closed (NC) or normally open (NO).'],
    ['5/3 exhaust centre', 'A 5/3 valve whose centre position vents both cylinder ports: no force, the cylinder can be moved by hand. A vertical load falls.'],
    ['5/3 pressure centre', 'A 5/3 valve whose centre position gives air to both cylinder ports. A single-rod cylinder creeps out because the piston side has the bigger area.'],
    ['Shuttle valve', 'A pneumatic OR: two inputs, one output. A ball closes the input without pressure.'],
    ['Two-pressure valve', 'A pneumatic AND: air at the output only when both inputs have air.'],
    ['Quick exhaust valve', 'A valve at the cylinder port that dumps the exhaust air right there instead of through the tube and the main valve: a faster stroke.'],
    ['Meter-out', 'Speed control that throttles the air leaving the cylinder. Smooth and steady movement; the normal way to set cylinder speed.'],
    ['Manual override', 'The small button on a solenoid valve that switches it by hand, for tests during commissioning. It moves the cylinder whatever the program says.'],
    ['Valve island', 'Many valves on one manifold with a common supply, exhaust and one fieldbus or IO-Link connection to the PLC.'],
    ['PLC', 'Programmable Logic Controller: an industrial computer that reads inputs, runs a program in a repeating scan, and drives outputs.'],
    ['Ladder Diagram (LD)', 'Graphical PLC language that looks like a relay schematic: rails, rungs, contacts and coils.'],
    ['Rung', 'One horizontal line of ladder logic: conditions on the left, result(s) on the right.'],
    ['Power rail', 'The vertical lines on the left (live) and right (neutral) of a ladder diagram.'],
    ['Scan / scan cycle', 'The PLC loop: read inputs → solve rungs top to bottom → write outputs → housekeeping. Typically 1–20 ms.'],
    ['Scan time', 'How long one scan takes. Signals shorter than this may be missed.'],
    ['Input image / process image', 'Copy of all input states taken at the start of the scan; the program reads this copy.'],
    ['NO contact -| |-', 'Normally-open contact: passes power when its bit is 1.'],
    ['NC contact -|/|-', 'Normally-closed contact: passes power when its bit is 0 (logical NOT).'],
    ['Coil -( )-', 'Writes the rung result (1/0) to a bit every scan.'],
    ['Negated coil -(/)-', 'Writes the inverse of the rung result.'],
    ['Set coil (S) / Latch (L, OTL)', 'Writes 1 when powered, otherwise leaves the bit unchanged.'],
    ['Reset coil (R) / Unlatch (U, OTU)', 'Writes 0 when powered. Here, and in S7-200 style, it also resets a timer or counter; Rockwell uses RES for that.'],
    ['Seal-in / holding contact', 'A contact of an output wired in parallel with its start condition so it stays on after the start signal goes away.'],
    ['Latch', 'Any circuit that remembers a state: seal-in or set/reset.'],
    ['Stop-dominant / reset-dominant', 'When start and stop are both active, stop wins. Safer default for machines.'],
    ['Interlock', 'Logic that prevents conflicting actions, e.g. forward and reverse contactors at the same time.'],
    ['Permissive', 'A condition that must be true before something is allowed to start (guard closed, air OK…).'],
    ['RLO', 'Result of Logic Operation (Siemens term): the power-flow state at a point in the rung.'],
    ['Rising edge (P, R_TRIG, OSR, ONS)', 'True for exactly one scan when a signal goes 0 → 1.'],
    ['Falling edge (N, F_TRIG, OSF)', 'True for exactly one scan when a signal goes 1 → 0.'],
    ['One-shot', 'A pulse lasting one scan, made with an edge contact.'],
    ['Double coil', 'The same output written by two normal coils. Only the last rung in the scan wins. A classic bug.'],
    ['Memory bit (M, marker, internal relay, flag)', 'Bit inside the PLC with no physical terminal. Used to store states and intermediate results.'],
    ['Word (MW)', '16-bit integer in memory. Holds numbers such as step numbers, counts, setpoints.'],
    ['Tag / symbol', 'Human-readable name for an address, e.g. Start_PB for I0.1.'],
    ['Address', 'Location in PLC memory: I0.0 (input byte 0 bit 0), Q0.0, M0.0, MW0 …'],
    ['TON', 'On-delay timer: output on after the input has been on for the preset time.'],
    ['TOF', 'Off-delay timer: output on immediately, off a preset time after the input goes off.'],
    ['TP', 'Pulse timer: fixed-length output pulse on each rising edge of the input.'],
    ['RTO / TONR', 'Retentive on-delay timer: keeps accumulated time when input goes off; cleared by a reset.'],
    ['PT / Preset', 'The target value of a timer (time) or counter (count).'],
    ['ET / ACC', 'Elapsed / accumulated time of a timer.'],
    ['DN / Q (done bit)', 'Timer or counter output bit that turns on when the preset is reached.'],
    ['CTU', 'Count-up counter: +1 on each rising edge; done at CV ≥ PV.'],
    ['CTD', 'Count-down counter: −1 on each rising edge; done at CV ≤ 0.'],
    ['CV / PV', 'Counter current value / preset value.'],
    ['Compare instruction', 'Contact-like box that passes power when a numeric comparison is true (==, <>, >, >=, <, <=).'],
    ['MOV', 'Copies a value into a word while the rung is powered.'],
    ['First scan bit (SM0.1, S:FS)', 'On only during the first scan after power-up or run; used for initialisation.'],
    ['Clock bit (SM0.5)', 'System bit that toggles at a fixed rate; handy for flashing lamps.'],
    ['State machine', 'Program structure where a step number decides what happens; transitions change the step.'],
    ['SFC', 'Sequential Function Chart: IEC language drawn as steps and transitions.'],
    ['Structured Text (ST)', 'IEC text language similar to Pascal. Great for math, loops, CASE state machines.'],
    ['FBD', 'Function Block Diagram: IEC language of logic gates and boxes connected by wires.'],
    ['IEC 61131-3', 'International standard defining PLC languages (LD, FBD, ST, SFC, IL) and data types.'],
    ['CODESYS', 'Hardware-independent IEC 61131-3 development environment used by many PLC brands.'],
    ['POU', 'Program Organisation Unit (IEC): a program, function block or function.'],
    ['Function block (FB)', 'Reusable block with its own memory, e.g. a TON or your own "Motor" block.'],
    ['Retentive memory', 'Memory that keeps its value through a power cycle.'],
    ['Force', 'Overriding an input or output value from the programming tool. Use with great care.'],
    ['Online monitoring', 'Watching the running program live, with power flow and values shown.'],
    ['Cross-reference', 'List of every place an address is used. Essential for troubleshooting.'],
    ['Fail-safe', 'Designing so a broken wire or lost power leads to a safe state (e.g. NC stop buttons).'],
    ['E-stop', 'Emergency stop: a hard-wired safety circuit via a safety relay/PLC that removes dangerous energy.'],
    ['Safety relay', 'Certified device that monitors E-stops and guards and cuts power redundantly.'],
    ['Contactor', 'Heavy-duty relay that switches motor power; the PLC drives its coil.'],
    ['Overload relay (OL)', 'Thermal or electronic device that trips when a motor draws too much current for too long.'],
    ['Star-delta starter', 'Reduced-current motor start: windings in star, then switched to delta.'],
    ['VFD', 'Variable Frequency Drive: controls motor speed; the PLC sends run commands and a speed reference.'],
    ['Solenoid valve', 'Electrically operated valve switching air or oil to a cylinder.'],
    ['Single / double solenoid', 'Single: spring returns when de-energised. Double: two coils, stays in last position.'],
    ['Reed switch', 'Magnetic sensor on a cylinder that detects the piston magnet (end positions).'],
    ['Limit switch', 'Mechanical switch actuated by a moving part at a position.'],
    ['Proximity sensor', 'Non-contact sensor: inductive (metal) or capacitive (most materials).'],
    ['Photo-eye', 'Photoelectric sensor that detects objects by interrupting or reflecting light.'],
    ['PNP / NPN', 'Sensor output type: PNP sources +24 V (needs a sinking input), NPN sinks to 0 V (needs a sourcing input).'],
    ['Sinking / sourcing', 'Direction of current at an I/O point. The input card and sensor must be complementary.'],
    ['Discrete / digital I/O', 'On/off signals (24 V DC typically).'],
    ['Analog I/O', 'Continuous signals such as 4–20 mA or 0–10 V, read as numbers.'],
    ['4–20 mA', 'The standard analog current loop. 4 mA = 0 % (live zero), 20 mA = 100 %; below 4 mA means a fault.'],
    ['Raw value / counts', 'The number an analog card produces, e.g. AIW0 = 6400…32000 for 4…20 mA.'],
    ['Scaling', 'Converting raw counts into engineering units (%, bar, °C) with a straight-line formula.'],
    ['Transmitter', 'Field device that measures a process value and sends it as an analog signal.'],
    ['Setpoint (SP)', 'The target value a controller tries to reach.'],
    ['Process value (PV)', 'The measured value being controlled.'],
    ['PID', 'Proportional–Integral–Derivative controller: output from the error, its sum over time, and its rate of change.'],
    ['Anti-windup', 'Stopping the integral term from growing while the output is clamped at 0 or 100 %.'],
    ['Duty / standby', 'Two machines for one job: the duty one runs, the standby one helps or takes over on a fault.'],
    ['Alternation (lead/lag)', 'Swapping the duty unit every cycle so both wear equally.'],
    ['Debounce', 'Ignoring short glitches so a signal is believed only when stable (often a short TON).'],
    ['Bistable valve (memory valve)', 'A 5/2 valve with two coils and no spring. A pulse on one coil switches it, and it stays there after the coil (or the power) goes off. Never energise both coils together.'],
    ['Monostable valve', 'A valve with one coil and a return spring: the cylinder stays out only while the coil is on, and goes back on power loss.'],
    ['5/3 closed-centre valve', 'Valve with two coils and a centre position that blocks both cylinder ports: both coils off = the cylinder stops and holds where it is. Used to stop an axis at sensors.'],
    ['Vacuum gripper', 'Suction cup fed by a vacuum generator. A vacuum switch confirms the part is really held before the machine moves.'],
    ['Pick and place', 'Handling unit that picks a part at one place and puts it down at another, usually with an X axis, a Z axis and a gripper.'],
    ['Homing', 'Bringing a machine to its start position after a stop, alarm or power cut, in a safe order (e.g. gripper up first, then the axis).'],
    ['Step mode', 'Commissioning mode in which a sequence advances one step per button press, so every movement can be checked.'],
    ['Cycle stop', 'Stop request that lets the current cycle finish and stops the machine at its home position.'],
    ['Tracking', 'Remembering data about a part (type, measurement, good/bad) from the place where it was measured to the place where it is used.'],
    ['Car call / hall call', 'Car call: a floor button inside the lift car. Hall call: an UP or DOWN button on a landing. Both are registered (stored and lit) until served.'],
    ['Collective selective control', 'Standard passenger-lift logic: travelling up the car stops for car calls and UP hall calls, travelling down for car calls and DOWN hall calls, and reverses when no calls are left ahead.'],
    ['Door zone (levelling)', 'The small zone around each floor where the car is level and the door may open; sensed by a magnet or vane in the shaft.'],
    ['Hall lantern', 'Arrow light at the landing that shows in which direction the arriving lift will travel.'],
    ['Fire service recall', 'Lift operation after a fire alarm or key switch: all calls cancelled, the car returns nonstop to the main floor and parks with the doors open for the fire brigade.'],
    ['Inspection operation', 'Maintenance mode for lifts: the car moves only while a button is held, at slow speed, with normal calls and automatic doors disabled.'],
    ['Safety chain', 'Series circuit of all safety contacts (doors, car stop switch, limits). If any opens, the drive stops regardless of the program.'],
    ['Parallel outputs', 'Several output instructions drawn under each other at the end of one rung. They all get the same condition: one contact, many results (like one reset button clearing many bits).'],
    ['Shift register', 'Chain of bits that moves one place along on every clock pulse while a new data bit enters at the start. Used to track parts on conveyors (SHRB in Siemens, BSL/BSR in Rockwell).'],
    ['SHL / SHR / ROL / ROR', 'Word shift instructions: shift left (×2 per place), shift right (÷2 per place), rotate left/right (the bit that falls out comes back at the other end).'],
    ['Pitch sensor', 'Sensor (cam, encoder or flag) that gives one pulse each time a conveyor moves one pocket or one product spacing. The clock for tracking.'],
    ['Bit memory (M, Merker)', 'The PLC\'s internal bits, not wired to anything: auxiliary relays your program uses to remember flags, steps and results. Siemens calls the area "bit memory".'],
    ['Byte / word / double word', 'Groups of 8, 16 and 32 bits. MB10 = M10.0 … M10.7; MW10 = MB10 + MB11; MD10 = MW10 + MW12 (Siemens).'],
    ['INT / DINT / REAL', 'Number types: 16-bit integer (−32768 … 32767), 32-bit integer, and 32-bit floating point with decimals.'],
    ['PT100 (RTD)', 'Platinum resistance temperature sensor, 100 Ω at 0 °C. A temperature module turns it into °C, often in 0.1 °C steps.'],
    ['Load cell', 'Weight sensor (a strain gauge) under a scale. A weighing module turns its tiny signal into a weight value.'],
    ['Tare / gross / net', 'Tare = the empty container, gross = everything on the scale, net = gross − tare.'],
    ['In-flight (preact)', 'Material still falling after a feed gate closes. The gate is closed early by this amount.'],
    ['Wire break detection', 'Recognising a broken sensor cable from an impossible analog value (e.g. 32767, or below 3.6 mA on 4–20 mA).'],
    ['Function block (FB) / instance', 'A reusable block with its own memory. Each call has an instance (in Siemens an instance DB) holding that call\'s timers, latches and values.'],
    ['FC / subroutine', 'A reusable block without its own memory (Siemens FC, Rockwell JSR subroutine, IEC FUNCTION).'],
    ['Block parameter', 'An input or output of a block (IN, OUT, INOUT), connected to real addresses at each call.'],
    ['VFD (frequency inverter)', 'Variable-frequency drive: runs an AC motor at variable speed with ramps and motor protection.'],
    ['STO (Safe Torque Off)', 'Safety function of a drive that removes motor torque through a safety-rated input, independent of the PLC program.'],
    ['Feedback watchdog', 'Checking that a commanded device answers (running, open, closed) within a time, otherwise an alarm.'],
    ['Offset (steady-state error)', 'The error a P-only controller leaves, because it needs an error to produce output. The I part removes it.'],
    ['Integral windup', 'The integral keeps growing while the output is saturated, causing overshoot later. Good PID blocks stop integrating (anti-windup).'],
    ['GRAFCET / SFC', 'Chart language for sequences: steps, transitions with conditions, actions, OR and AND branches (IEC 60848 / IEC 61131-3).'],
    ['Forcing', 'Overriding an input or output in the PLC regardless of the field or program, for testing. Use only with the danger area clear and remove it afterwards.'],
    ['Watchdog / timeout', 'Timer that flags a fault when an expected event doesn\'t happen in time.'],
    ['Hysteresis', 'Switching on and off at different thresholds (low/high level) to prevent rapid cycling.'],
    ['HMI', 'Human-Machine Interface: touch panel showing machine state and accepting operator commands.'],
    ['SCADA', 'Supervisory system that monitors many PLCs across a plant.'],
    ['Jog / inching', 'Running a motor only while a button is held, with no latch. Used for setup.'],
    ["DINT / double word (MD)", "32-bit signed integer, −2 147 483 648 … 2 147 483 647. For totals, encoder counts and big intermediate results. In Siemens memory MD20 = MW20 + MW22."],
    ["REAL", "Floating-point number (about 7 significant digits). Good for physics and PID; never compare with =, and do not keep big totals in it."],
    ["Overflow", "A result too big for its data type. Depending on the PLC it wraps around (32767 + 1 = −32768) or is clamped, and an overflow flag is set. Use a bigger type."],
    ["MOD", "Modulo: the remainder of an integer division. 35100 MOD 1000 = 100."],
    ["Fixed point", "Storing decimals as integers in a small unit: 215 = 21.5 °C (0.1 °C units)."],
    ["Encoder", "Sensor that gives pulses (incremental) or a position number (absolute) as a shaft turns. Measures length, position and speed."],
    ["Quadrature (A/B)", "Two encoder tracks a quarter period apart: the order of their edges gives the direction; counting all edges gives 4× resolution."],
    ["High-speed counter (HSC)", "Hardware counter at the input terminals that counts pulses far faster than the scan (kHz … MHz). The program reads, resets or preloads its value."],
    ["Creep speed", "A slow speed for the last part of a move, so the stop is accurate whatever the full speed was."],
    ["First-out", "Alarm memory that shows which alarm came first when several follow one another: the cause of the trip."],
    ["Acknowledge (ACK)", "The operator confirms they saw an alarm: the horn stops and the lamp goes from flashing to steady."],
    ["Alarm flood", "Many alarms at once after one fault, hiding the important one. Filters, first-out and good alarm design prevent it."],
    ["Heartbeat", "A bit that keeps toggling, sent to a partner so it can check the link is alive. If it stops changing: comm fault."],
    ["Handshake", "An exchange of signals where each side answers only what it has seen from the other (ready → ready to receive → received → done)."],
    ["PROFINET / EtherNet/IP", "Industrial Ethernet networks (Siemens / Rockwell) that exchange I/O data cyclically, every few ms."],
    ["Modbus", "Simple, universal protocol (TCP or serial RTU) for reading and writing registers (words) and coils (bits)."],
    ["XIC / XIO / OTE", "Rockwell names: examine if closed (NO contact), examine if open (NC contact), output energize (coil). OTL / OTU = latch / unlatch (SET / RESET)."],
    ["Add-On Instruction (AOI)", "Rockwell's reusable block with its own parameters and memory: the same idea as a Siemens FB or a CODESYS FUNCTION_BLOCK."],
    ["Contact bounce", "A mechanical contact opens and closes several times within a few ms when it is operated. The PLC can see several edges for one press."],
    ["Deadband", "A band around a value inside which changes are ignored, so noise does not trigger an action."],
    ["Change of value (COV)", "A trigger that fires when a number changes: compare it with a stored copy, act, and update the copy."],
    ["Edge memory bit", "The bit an edge instruction uses to remember the signal of the last scan (TIA Portal: the bit under -|P|-; Rockwell: the ONS storage bit). Each edge needs its own."],
    ["Pulse catch", "Input-card option that stretches a very short pulse so the program sees it in the next scan."],
    ["Servo (servo axis)", "Motor + encoder + servo drive in a closed loop: goes exactly to a position at a set speed and holds it."],
    ["Axis / technology object", "The PLC object that represents one servo axis: units, limits, speed, acceleration and its state (position, homed, error). TIA Portal: technology object; Studio 5000: axis tag; CODESYS: SoftMotion axis."],
    ["Homing (referencing)", "Moving an axis to a reference switch (or index pulse) to find its zero point after power-up."],
    ["PLCopen motion", "Standard set of motion function blocks (MC_Power, MC_Home, MC_MoveAbsolute …) used by Siemens, CODESYS and many others."],
    ["MC_MoveAbsolute / MAM", "Motion instruction: go to a position at a velocity, starting on the rising edge of Execute."],
    ["Software limits", "Minimum and maximum positions set in the axis configuration; moves beyond them are refused once the axis is homed."],
    ["Following error", "The difference between where the servo should be and where it is. Too big = jam or overload: the drive faults."],
    ["Pulse train output (PTO)", "A PLC output that sends step pulses and a direction signal to a stepper or simple servo drive."],
    ["FC / FB", "Siemens names for blocks: an FC (function) has no memory of its own; an FB (function block) keeps memory in an instance. Rockwell: routine (JSR) / Add-On Instruction; CODESYS: FUNCTION / FUNCTION_BLOCK."],
    ["Teach-in", "Setting a position by jogging the axis to the right spot and storing its present position, instead of typing a measured number."],
    ["Direct homing (set position)", "Giving an axis its home without moving: the present position becomes the home value. TIA Portal MC_Home mode 0, PLCopen MC_SetPosition, Rockwell MRP."],
    ["Safety PLC (F-CPU)", "A PLC certified to run safety programs (TIA F-CPU, GuardLogix, NX-SL, TwinSAFE). Safety I/O talks to it over PROFIsafe, CIP Safety or FSoE."],
    ["Discrepancy time", "The time two channels of a safety input may disagree before it is a fault (broken wire, stuck contact)."],
    ["EDM (feedback monitoring)", "External Device Monitoring: reading back the NC auxiliary contacts of the contactors, to find a welded contactor before the next start."],
    ["Stop category 0 / 1 / 2", "IEC 60204-1: 0 = cut the power at once; 1 = controlled stop, then cut the power; 2 = controlled stop with the power kept."],
    ["String", "A text variable (STRING). In PLCs it has a maximum length; instructions copy, join, cut and compare strings."],
    ["Barcode reader (BCR)", "A scanner that reads 1D / 2D codes when triggered and returns a status (read OK / no read) and the data string."],
    ["Print and apply", "A label printer that also puts the label on the product; the product must stand still or move at a known speed."],
    ["Text list", "An HMI table that turns a number from the PLC into a text (message, step, state)."],
    ["Data block (DB)", "A block of named data (fields, structures, arrays) with start values. Siemens: global or instance DB; Rockwell: tags; CODESYS: a GVL."],
    ["UDT / structure", "A user-defined data type: a named layout of fields (e.g. a recipe) used many times. TIA: PLC data type; Rockwell: UDT; CODESYS: STRUCT (DUT)."],
    ["Array index", "The number that picks one element of an array, e.g. Length[MW30]. Outside the declared range it stops a real PLC."],
    ["Light curtain (safety light barrier)", "A row of infrared beams across an opening, with two self-tested safety outputs (OSSD1, OSSD2) that switch off when a beam is broken."],
    ["OSSD", "Output Signal Switching Device: the safety output of a light curtain or laser scanner, usually two of them, pulse-tested to find short circuits."],
    ["Muting", "Bypassing a safety light curtain for a moment so material can pass, recognised by muting sensors in a fixed order and time; shown by a muting lamp."],
    ["Safety distance", "ISO 13855: S = K × T + C. How far a protective device must be from the hazard so the machine has stopped before a person reaches it."],
    ["Hydraulic power unit (HPU)", "The pump, motor, oil tank, relief valve, filter and cooler that supply a hydraulic machine; the PLC starts it, unloads it and monitors level, temperature and filter."],
    ["Unloading valve", "Sends the pump flow back to the tank at low pressure, so the pump can start unloaded and runs without making heat while nothing moves."],
    ["Relief valve", "Limits the maximum pressure in a hydraulic system by sending oil back to the tank; all the oil that goes through it turns into heat."],
    ["4/3 valve (closed centre)", "A directional valve with 4 ports and 3 positions; spring-centred, both solenoids off = all ports closed, so the cylinder stops and holds."],
    ["Decompression", "Letting the oil pressure in a cylinder fall for a moment (valve centred) before switching it to the other direction, to avoid a pressure shock."],
    ["Two-hand control", "Both buttons pressed within 0.5 s and held during the dangerous stroke (ISO 13851), so the operator's hands are away from the tool."],
    ["Accumulator (hydraulic)", "A pressure vessel with a gas bladder that stores oil under pressure, charged by the pump between two set-points; it must be emptied (dump valve) before work on the system."],
    ["Dump valve", "A valve that opens to the tank when de-energised and empties an accumulator at stop or on a fault, so the system has no stored pressure."],
    ["I/O check", "Commissioning step: every input and output is operated once and checked against the I/O list before the machine runs automatically."],
    ["FAT / SAT", "Factory acceptance test (at the machine builder) and site acceptance test (at the customer): the documented tests before a machine is handed over."],
    ["Plausibility check", "A program check for states that cannot be true together (home and out sensor both on), used to find sensor and wiring faults."],
    ["OEE", "Overall Equipment Effectiveness = availability × performance × quality: how much of the planned time produced good parts at the ideal speed."],
    ["Andon light", "A signal tower (green / amber / red) that shows the state of a machine to everyone on the floor."],
    ["Cycle time", "The time to make one part, measured from one \"cycle done\" to the next."],
    ["Proportional valve", "A hydraulic valve whose opening follows an analog signal, so the PLC sets speed (or pressure), not only direction."],
    ["Ramp", "A setpoint that changes gradually (a fixed step per time) instead of jumping, to avoid shocks and pressure peaks."],
    ["Soft limit", "A position limit in the program, before the mechanical end, where the axis stops being driven so it can stop in time."],
    ["Real-time clock (RTC)", "The PLC's battery-backed clock with date, time and weekday, read with an instruction and used for schedules."],
    ["Soft starter", "A thyristor starter that raises and lowers the motor voltage gradually for a gentle start and stop; usually bypassed by a contactor at full speed."],
    ["Bypass contactor", "A contactor in parallel with a soft starter that carries the motor current once the motor is at full speed, so the starter does not overheat."],
    ["UART", "The chip in a serial port that turns bytes into a row of bits on a wire (start bit, data bits, parity, stop bit) and back."],
    ["Baud rate", "Bits per second on a serial line. Both sides must use the same baud rate and format, e.g. 19200 8E1."],
    ["Parity bit", "An extra bit that makes the number of 1s even (or odd), so a single damaged bit is noticed."],
    ["CRC", "A check number calculated from the bytes of a frame and sent with it; the receiver recalculates it to find damaged frames."],
    ["Polling", "A master asks each device in turn; devices answer only when asked (Modbus RTU, AS-i, LIN)."],
    ["Token passing", "Masters pass a token; only the holder may use the bus (PROFIBUS with several masters)."],
    ["Arbitration (CAN)", "When two CAN nodes send at once, the lower ID wins bit by bit without destroying the message."],
    ["Producer / consumer", "A device sends its data on its own every cycle and any interested device takes it (PROFINET, EtherNet/IP)."],
    ["Gateway", "A device that translates between two networks, e.g. Modbus RTU to PROFINET."],
    ["LIN", "Local Interconnect Network: a cheap single-wire bus with one master, mainly in cars (windows, mirrors, seats)."],
    ["DeviceNet", "A CAN-based fieldbus from the Rockwell / ODVA world, with 24 V power in the cable, up to 64 nodes."],
    ["AS-Interface", "A two-wire yellow flat cable carrying power and data to many simple sensors and actuators."],
    ["HART", "A digital signal on top of a 4–20 mA loop, used to set up and diagnose process instruments."],
    ["Termination resistor", "A resistor (e.g. 120 Ω) at both ends of an RS-485 or CAN line that stops signal reflections."],
    ["Cross-reference", "A note in electrical drawings showing where else a device appears, e.g. /4.3 = page 4, column 3."],
    ["Device tag", "The name of a device in the drawings, e.g. -K1 (relay), -B3 (sensor), -X2:5 (terminal 5 of strip X2)."],
    ["Wire number", "The number printed on the markers at both ends of a wire, matching the drawing."],
    ["PII / PIQ", "The Siemens names for the process image: the copy of all inputs (PII) and all outputs (PIQ) that the program uses during the scan."],
    ["Hardware configuration", "The copy of the real rack in the tool (modules, order numbers, firmware, slots and addresses) that the CPU checks against the real hardware when it starts."],
    ["Device description file (GSDML / EDS)", "A file from the device maker that tells the tool what a device contains and how many bytes it sends: GSDML for PROFINET, EDS for EtherNet/IP, ESI for EtherCAT."],
    ["PROFINET device name", "The name (for example io-station-1) that a PROFINET controller uses to find an IO device and give it its IP, so every new or replaced device must get it."],
    ["Subnet mask", "The number that says which part of an IP address is the network: with 255.255.255.0 (/24) two devices talk directly only when the first three numbers are the same."],
    ["Download", "Sending the project from the PC to the PLC, which often stops the PLC, so go online and compare first."],
    ["Upload", "Reading the program from the PLC into the PC when the project is missing or someone changed the PLC, but not every PLC stores the full project (in CODESYS only after a Source download)."],
    ["Go online", "Connecting the tool to the PLC to see live values and power flow, without changing anything in the PLC."],
    ["Online change (online edit)", "Changing the program while the PLC stays in RUN, where a deleted coil keeps its last value."],
    ["Write (modify)", "Changing a value once from the tool, so the program or the input can change it back (a force holds it)."],
    ["Power budget", "The power that the CPU and all cards take from the backplane, which must stay below what the power supply gives."],
    ["Spare channels", "Free I/O channels (about 10–20 %) planned for later changes and for replacing a broken channel."],
    ["Diagnostic buffer", "The list of events in a Siemens CPU (faults, mode changes), with the time; newest first. Read it before you change anything."],
    ["Error OB", "A Siemens organization block that the CPU calls when an error happens (OB80, OB82, OB86, OB121). Your code there decides what the machine does."],
    ["OB82 (diagnostic interrupt)", "Called when a module reports a fault, for example a wire break. An S7-1500 stays in RUN without it."],
    ["OB86 (rack / station failure)", "Called when a remote I/O station is lost and when it comes back."],
    ["OB121 (programming error)", "Called on a program error, for example an array index out of range. Without it an S7-1500 goes to STOP."],
    ["OB80 (time error)", "Called when a scan takes longer than the maximum cycle time. Twice the time means STOP anyway."],
    ["Major fault", "Rockwell: a fault that stops the program (mode Faulted). Shown with a Type and a Code, for example Type 4 Code 20."],
    ["Minor fault", "Rockwell: a fault that is only logged; the program keeps running. Example: battery low (Type 10 Code 10)."],
    ["Fault routine", "Rockwell: a routine that runs on a major program fault and may clear it. Use it to react, not to hide bugs."],
    ["Exception (CODESYS)", "A serious runtime error, like an access violation or a divide by zero. The application stops until you reset it."],
    ["Task watchdog", "A time limit for one cycle of a task. If the task does not finish in time (an endless loop), the CPU stops."],
    ["Live zero", "A signal range that does not start at 0, like 4–20 mA. Then 0 mA means a broken wire, not a zero value."],
    ["Value status (QI)", "Siemens: one bit per analog channel. 1 = the value is good, 0 = do not use it (wire break, overflow)."],
    ["MAINT LED", "Siemens: yellow LED for \"maintenance needed\", for example while a force is active."],
    ["Voltage (U, volt V)", "The electrical push between two points. Measured with a voltmeter, in volts."],
    ["Current (I, ampere A)", "How much electricity flows through a wire, in amperes (1 A = 1000 mA)."],
    ["Resistance (R, ohm Ω)", "How hard it is for current to flow. A closed contact has almost 0 Ω; an open one is OL."],
    ["Ohm's law", "U = I × R. Example: 24 V on a 600 Ω coil gives I = 24 / 600 = 0.04 A."],
    ["Multimeter", "The electrician's meter: V DC, V AC, Ω and continuity on one dial. Red probe in VΩ, black in COM."],
    ["Continuity test (beep)", "Meter mode that beeps when two points are connected (below about 50 Ω). Power OFF only."],
    ["OL on a meter", "Over limit: the resistance is too high to measure, so the circuit between the probes is open."],
    ["Walking the line", "Fault finding: black probe on 0 V, red probe from point to point. Where the 24 V stops, the fault is."],
    ["Prove dead", "Before you touch: switch off, lock, and check with the meter that there is really no voltage."],
    ["Fuse", "A part that melts when too much current flows and opens the circuit. It protects the wires."],
    ["Miniature circuit breaker (MCB)", "Does the job of a fuse but trips mechanically; you can switch it on again."],
    ["RCD (residual current device)", "Switches off when current leaks to earth (for example through a person). Protects people."],
    ["Flyback diode", "Diode across a DC coil that absorbs the voltage spike when the coil switches off."],
    ["PE (protective earth)", "The green-yellow wire that connects all metal parts to earth, so a fault switches off at once."],
    ["SELV / PELV", "Safe extra-low voltage like 24 V: no shock danger. PELV has its 0 V connected to earth."],
    ["Three-phase supply (L1 L2 L3)", "Three AC phases: 400 V between two phases, 230 V between one phase and N (in Europe)."],
    ["Star connection (Y)", "Motor windings joined at one point (U2 V2 W2 bridged). Each winding gets 400 V / √3 = 230 V."],
    ["Delta connection (Δ)", "Each motor winding between two phases. Each winding gets the full line voltage (400 V)."],
    ["Motor nameplate", "The metal plate on a motor: voltages, currents, power, cos φ, speed, protection, duty."],
    ["Rated current (In)", "The current a motor takes at full load. Set the overload relay to this value."],
    ["Power factor (cos φ)", "The share of the motor current that does real work; the rest builds the magnetic field."],
    ["Slip", "The difference between the synchronous speed (1500 rpm for 4 poles at 50 Hz) and the real speed."],
    ["Inrush current", "The high current (6–8 × In) a motor takes for a moment when it starts."],
    ["Clamp meter", "A meter that measures the current in a wire by clamping around it, without opening the circuit."],
    ["Reduced-voltage starter", "A starter that gives the motor less voltage at the start: star-delta, autotransformer, stator resistance, soft starter."],
    ["Autotransformer starter", "A starter that feeds the motor from a transformer tap (50, 65 or 80 %) during the start."],
    ["Stator resistance starter", "A starter with resistors in series with the motor that a bypass contactor bridges after the start."],
    ["Slip-ring motor", "A motor whose rotor winding is brought out on three rings, so resistors can be added to the rotor circuit."],
    ["Rotor resistance starter", "A starter for a slip-ring motor: rotor resistors are bridged step by step. Low current and high torque."],
    ["Closed transition", "A changeover where the motor is never without voltage, so there is no second current peak."],
    ["Contactor feedback", "An auxiliary contact of a contactor wired to a PLC input, so the PLC knows if it really closed."],
    ["Starts per hour", "The number of starts a motor or starter may do in one hour without overheating."],
    ["Welded contact", "A contact that has melted together and stays closed when its coil is off."],
    ["Bleeder resistor", "A resistor from an input to 0 V that takes the leakage current of a 2-wire sensor, so the input really goes off."],
    ["Leakage current", "A small current that flows through a 2-wire sensor or a triac output even when it is off."],
    ["Interposing relay", "A small relay or contactor between a PLC output and a load that needs more current or another voltage."],
    ["Triac output", "A PLC output that switches AC with an electronic switch, without moving contacts."],
    ["Relay output", "A PLC output with a real contact: it switches AC or DC, but it is slow and wears out."],
    ["Transistor output", "A fast PLC output for 24 V DC without moving parts. PNP gives +24 V, NPN gives 0 V."],
    ["Momentary button", "An HMI button that writes 1 only while it is pressed, like a real push button."],
    ["User level", "A right on the HMI (operator, technician, engineer) that decides which screens and inputs a person may use."],
    ["ISA-101", "A standard for HMI design: grey screens, colour only for abnormal states, clear hierarchy."],
    ["HMI tag", "A value in the HMI that is linked to a PLC tag, so the screen can read or write it."],
    ["Control word", "A 16-bit word the PLC sends to a drive or device: each bit is a command, like on, enable or acknowledge."],
    ["Status word", "A 16-bit word a drive or device sends back: each bit is a state, like ready, running or fault."],
    ["Mask", "A word used with AND, OR or XOR to pick, set or flip some bits of another word."],
    ["PROFIdrive", "A standard way for drives on PROFIBUS and PROFINET to use control word, status word and setpoint."],
    ["NORM_X", "Scaling step 1: where is the value between min and max? The result is 0.0 to 1.0."],
    ["SCALE_X", "Scaling step 2: stretch a value from 0.0 to 1.0 into a new range."],
    ["TRUNC", "Cuts the decimals of a REAL off: 2.9 becomes 2."],
    ["Bit of a word", "One of the 16 bits of a word, used like a normal bit: MW100.2."],
    ["Control circuit", "The thin-wire circuit with buttons, coils and contacts that decides when a contactor closes."],
    ["Power circuit", "The thick-wire circuit that carries the motor current: breaker, contactor, overload relay, motor."],
    ["Current path", "One vertical line of a control circuit, from L through contacts to a load and to N."],
    ["Auxiliary contact", "A small extra contact of a contactor (13-14, 21-22) used in the control circuit, for seal-in and interlock."],
    ["Hold-to-run", "A control with no seal-in: the machine moves only while the button is held."],
    ["Cycle time (scan time)", "The time the PLC needs for one pass: read the inputs, run the program, write the outputs."],
    ["Periodic task", "A program that the CPU calls at a fixed time, for example every 100 ms. Used for PID and ramps."],
    ["Interrupt", "A short program that runs at once when an event happens, and pauses the main program."],
    ["Watchdog", "A timer in the CPU that stops it when one program cycle takes too long."],
    ["Performance level (PL)", "A letter from a to e that says how reliable a safety function is. e is the highest."],
    ["PLr", "The required performance level of a safety function, found with the risk graph."],
    ["Risk assessment", "Listing every hazard of a machine and deciding how each one is removed or guarded."],
    ["Category (safety)", "The structure of a safety circuit: B, 1, 2, 3 or 4. From 3 on there are two channels."],
    ["Diagnostic coverage (DC)", "The share of dangerous faults that a safety system notices by itself."],
    ["Stop category", "How a machine stops: 0 = power off at once, 1 = brake then power off, 2 = stop with power on."],
    ["SIL", "Safety integrity level: the scale of another safety standard, 1 to 3 for machines (IEC 62061). PL d is about SIL 2."],
    ["Quick commissioning", "The first set-up of a drive: motor data, ramps, limits and sources."],
    ["Ramp time", "The time a drive takes to change the frequency from zero to maximum, or back."],
    ["DC link", "The energy store inside a drive, between its input and its output. Braking too fast overfills it."],
    ["Braking resistor", "A resistor on a drive that turns braking energy into heat."],
    ["Command source", "The drive setting that says who may start the motor: keypad, terminals or network."],
    ["Motor identification", "A measurement the drive does once on the motor, to control it better. Also called auto-tuning."],
    ["PackML", "A standard state model and tag set for machines: the same state names on every machine."],
    ["Held (PackML)", "The machine stopped because of a problem inside itself and waits for a person."],
    ["Suspended (PackML)", "The machine is fine and waits for the line: no product coming in, or no room going out."],
    ["Aborted (PackML)", "The machine was stopped at once by a fault or a safety event and must be cleared."],
    ["P&ID", "Piping and instrumentation diagram: every pipe, tank, valve and instrument of a process plant."],
    ["Instrument tag", "The name of an instrument on a P&ID, like LIC-101: letters for what it measures and does, a number for the loop."],
    ["Loop diagram", "One page that shows how one signal is wired from the field device to the PLC card."],
    ["Cause and effect matrix", "A table of interlocks: causes in rows, effects in columns, an X where one triggers the other."],
    ["LOTO", "Lock-out, tag-out: isolate the energy, lock it with your own padlock, and prove the machine is dead before work."],
    ["Stored energy", "Energy that stays after switching off: air pressure, hydraulic accumulators, raised loads, drive capacitors."],
    ["As-built drawing", "A drawing updated with every change made during building and commissioning."],
    ["Punch list", "The list of open points found in a test, each with a name and a date."],
    ["UDT (STRUCT)", "Your own data type: several values of one device kept together under one name."],
    ["ENUM", "A data type with named values, used to give step numbers readable names."],
    ["Method", "A named action that belongs to a function block, called like Valve.Open()."],
    ["Job number", "A number the PLC gives to a robot (or a drive, a printer) to say which program to run."],
    ["Interference zone", "A space two machines share, like the inside of a machine and a robot arm. A signal says who is in it."],
    ["Machine tending", "A robot loads raw parts into a machine and unloads the finished ones."],
    ["Robot controller", "The robot's own computer. It holds the robot programs and moves the arm."],
    ["Jump (JMP)", "An instruction that goes straight to a label. The rungs in between are not scanned and keep their state."],
    ["Label (LBL)", "The place in the program where a jump lands."],
    ["MCR zone", "A group of rungs between two MCR instructions. When the zone is off, the rungs are solved as false. Not a safety function."],
    ["FIFO", "First in, first out: a queue where the oldest value comes out first. Used to track parts on a line."],
    ["LIFO", "Last in, first out: a stack where the newest value comes out first."],
    ["Sequencer (SQO, drum)", "A table of output patterns with a pointer. Every pulse moves to the next row."],
    ["Feedback loop (EDM)", "NC contacts of the contactors, wired into the start circuit of a safety relay. A contactor that did not drop blocks the next start."],
    ["Monitored reset", "A reset that needs a new press of the button. A stuck or bridged button does not start the machine."],
    ["Cross-circuit detection", "The safety relay notices a short between its two channels, because each channel has its own test signal."],
    ["Contact expansion module", "A module that gives a safety relay more output contacts."],
  ];

  // ───────────────────────── concept quiz ─────────────────────────
  LL.QUIZ = [
    { l: 6, q: "The cable to a remote level transmitter is cut and the level now reads 0. What can go wrong?", a: ["Nothing: 0 is a safe value", "The level control thinks the tank is empty and starts the pump: overflow", "The PLC goes to STOP", "The level shows 100 %"], c: 1, why: "A dead link often looks like a real value. Only the watchdog can tell old or missing data from a real 0." },
    { l: 6, q: "How long should a comm watchdog time be?", a: ["As short as possible, 10 ms", "About 3 to 5 times the normal answer time", "Always exactly 1 s", "As long as possible, 1 minute"], c: 1, why: "Short enough to react before damage, long enough that a normal late answer does not raise an alarm." },
    { l: 6, q: "Why does a comm watchdog check that the echo CHANGES, and not that echo = life word?", a: ["The echo arrives a little late, so it is almost never equal, even on a good link", "Comparing two words is not allowed in ladder", "The echo is always 0 on a good link", "Equal would need a REAL"], c: 0, why: "Transport delay and the other side's scan make the echo late. A changing echo proves the other side is alive." },
    { l: 6, q: "The remote side answers only every 2 s. The watchdog time is 1 s. What does CommError do?", a: ["Stays off", "Stays on", "Blinks: on after 1 s of silence, off at each answer", "Goes on once and needs a reset"], c: 2, why: "1 s without a change sets it, the next answer resets it: a blinking comm alarm means a slow link." },
    { l: 6, q: "A life word counts +1 every 0.1 s from 0 to 599. How long until it repeats?", a: ["6 s", "1 minute", "10 minutes", "600 s"], c: 1, why: "600 × 0.1 s = 60 s." },
    { l: 4, q: "When may the PLC lift a part held by suction cups?", a: ["After a fixed 0.5 s with the vacuum on", "When the vacuum switch says the vacuum is reached", "As soon as the vacuum valve is switched on", "When the part sensor under the cup goes off"], c: 1, why: "Only the vacuum switch proves the part is held. A timer lifts even with a torn cup or no air." },
    { l: 4, q: "What is the holding force of a suction cup?", a: ["Vacuum × cup area", "Air pressure × hose length", "Weight of the part × 2", "Cup diameter × vacuum"], c: 0, why: "Force = pressure difference × area. Then divide by a safety factor of 2 to 4 for the moves." },
    { l: 4, q: "On a pneumatic drawing, what is 1B2?", a: ["The second valve of circuit 1", "The second sensor of circuit 1", "The coil of valve 1V1", "Cylinder 2 of circuit 1"], c: 1, why: "The number in front is the circuit, the letter the kind of part (B = sensor), the last number which one." },
    { l: 4, q: "The LED on valve 1V1 lights but cylinder 1A1 does not move. The manual override moves it. Where is the fault?", a: ["In the PLC program", "The valve does not switch electrically: coil, connector or pilot", "The cylinder is jammed", "The air supply is off"], c: 1, why: "The override proves air, valve spool and cylinder are fine; what is left is the electrical switching of the valve." },
    { l: 4, q: "What does 5/2 mean on a valve?", a: ["5 bar and 2 coils", "5 ports and 2 positions", "5 mm bore and 2 outputs", "5 positions and 2 ports"], c: 1, why: "Ports first, positions second: 1 supply, 2 and 4 to the cylinder, 3 and 5 exhaust; two positions." },
    { l: 4, q: "A 5/2 monostable valve holds a cylinder out. The power fails. What happens?", a: ["The cylinder stays out", "The cylinder stops halfway", "The spring switches the valve back and the cylinder retracts", "The cylinder becomes free to move by hand"], c: 2, why: "Monostable = one stable position. Without the coil the spring returns the valve, so the cylinder goes back." },
    { l: 4, q: "A gripper must NOT drop the part when the power fails. Which valve?", a: ["5/2 monostable", "5/2 bistable", "5/3 exhaust centre", "3/2 normally closed"], c: 1, why: "A bistable valve keeps its last position without power, so the gripper keeps its air and holds the part." },
    { l: 4, q: "Which valve can stop a cylinder in the middle of its stroke?", a: ["3/2 NC", "5/2 monostable", "5/2 bistable", "5/3 closed centre"], c: 3, why: "Only a 5/3 has a centre position. Closed centre blocks both ports and the cylinder stops where it is." },
    { l: 4, q: "Why is a 5/3 exhaust centre dangerous on a vertical load?", a: ["It switches too slowly", "Both sides are vented in the centre, so nothing holds the load and it falls", "It needs two power supplies", "It blocks the supply air"], c: 1, why: "The exhaust centre removes all force. Good for moving a cylinder by hand, bad when gravity pulls." },
    { l: 4, q: "How do you set the speed of a pneumatic cylinder in the usual way?", a: ["Lower the supply pressure", "A one-way flow control that throttles the exhaust air (meter-out)", "Switch the coil on and off fast", "Use a bigger valve"], c: 1, why: "Meter-out throttles the air leaving the cylinder: smooth, steady movement even when the load changes." },
    { l: 4, q: "A shuttle valve works like which logic function?", a: ["AND", "OR", "NOT", "XOR"], c: 1, why: "Air at X or at Y gives air at the output. The two-pressure valve is the AND." },
    { l: 5, q: "Why put the logic for 20 identical motors in one block instead of copying rungs?", a: ["A block runs faster than the same copied rungs", "Test it once; one fix then reaches all 20 motors", "A block uses no memory, copied rungs use a lot", "Copied rungs are not allowed by the IEC 61131 standard"], c: 1, why: "One tested block, many calls." },
    { l: 5, q: "Inside a block you write #Start. What is it?", a: ["A fixed input address that is the same in every single call", "A parameter or local variable, connected at each call", "A comment marker; the PLC ignores the text after #", "A system bit that is 1 in the first scan only"], c: 1, why: "The call connects #Start to a real address." },
    { l: 5, q: "Two CALLs of FB_Motor use the same instance name. What happens?", a: ["The compiler gives each call its own copy anyway", "They share one memory and overwrite timers and latches", "The PLC goes to STOP mode with a double-instance error", "The second call is skipped, and only the first one runs"], c: 1, why: "Instance = memory. Each device needs its own instance." },
    { l: 5, q: "A drive gets a run command but never reports \"running\". What should the program do?", a: ["Keep waiting; the drive will report running at some point", "Raise an alarm after a few seconds (feedback watchdog)", "Send fault resets in a loop until it reports running", "Raise the speed reference until the running bit comes"], c: 1, why: "A command without an answer is always an alarm." },
    { l: 5, q: "Three conveyors in a row: in which order do you start them?", a: ["Infeed first, then the next ones down the line", "All three at once, with one common start command", "Downstream (outfeed) first, then upstream", "The middle conveyor first, then both ends together"], c: 2, why: "The conveyor that takes the product must already run." },
    { l: 5, q: "A P controller (Ti = 0) settles 0.4 bar below the setpoint. What fixes it?", a: ["Add more D (derivative) action", "Add the I part (integral action)", "Lower Kp so the loop is calmer", "Fit a faster pressure transmitter"], c: 1, why: "The integral keeps pushing until the error is zero." },
    { l: 5, q: "You raise Kp and the pressure starts to swing. Good tuning practice?", a: ["Keep it; swinging means the loop is fast", "Use about half of that Kp, then add I", "Set D to maximum to stop the swinging", "Set Ti to 0.1 s to calm the loop down"], c: 1, why: "Half of the swinging gain is a safe starting point." },
    { l: 5, q: "In a GRAFCET, a double horizontal line means…", a: ["an alternative (OR) branch", "a simultaneous (AND) branch", "the end of the whole program", "an emergency stop for all steps"], c: 1, why: "All paths run together and must all finish before the chart continues." },
    { l: 5, q: "When does a GRAFCET transition fire?", a: ["As soon as its condition is true, whatever the steps do", "Its steps above are active AND its condition is true", "Once every scan, after all the steps have been solved", "When the step below it is already active and ready"], c: 1, why: "Both rules together." },
    { l: 5, q: "A cylinder is visibly out, but its sensor input stays 0. Where is the fault?", a: ["In the program: the rung for this input is wrong", "On the input side: sensor position, sensor or cable", "In the output card that drives the cylinder valve", "In the valve, because it pushes the cylinder too far"], c: 1, why: "What you see and what the PLC sees differ on the input." },
    { l: 5, q: "An output is 1 in the PLC, but the valve does not move. Next check?", a: ["Rewrite the rung, because the output logic is wrong", "Fuse, wire, coil voltage at the valve, air supply", "The input sensors that tell the PLC the valve moved", "Restart the PLC so the output card resets itself"], c: 1, why: "The command leaves the PLC; follow it to the actuator." },
    { l: 5, q: "A machine only runs while STOP is held. Most likely?", a: ["The START button is broken", "STOP is wired NO instead of NC", "The motor overload relay has tripped", "The PLC CPU has an internal fault"], c: 1, why: "NC/NO is wrong: rewire the STOP button, do not change the program." },
    { l: 1, q: "What is \"bit memory\" (M) in a Siemens PLC?", a: ["The memory that stores the program code itself", "Internal bits your program uses to remember things", "The input image that is copied at the start of each scan", "The plug-in memory card that holds the project"], c: 1, why: "M = Merker = bit memory: internal flags, not wired to anything." },
    { l: 1, q: "How many bits are in a word?", a: ["8", "16", "32", "4"], c: 1, why: "Byte = 8, word = 16, double word = 32." },
    { l: 1, q: "The byte 0000 0101 has the value…", a: ["5", "101", "10", "3"], c: 0, why: "Bit weights 4 + 1 = 5." },
    { l: 1, q: "On a real Siemens PLC, why do programs use MW10, MW12, MW14 and not MW10, MW11?", a: ["Odd word numbers are not allowed by the CPU", "MW10 and MW11 overlap: both contain byte MB11", "Even addresses are read faster by the CPU", "It is only habit; MW11 would work just the same"], c: 1, why: "MW10 = MB10 + MB11 and MW11 = MB11 + MB12." },
    { l: 1, q: "The biggest value an INT (16-bit signed word) can hold is…", a: ["255", "65535", "32767", "2147483647"], c: 2, why: "−32768 … 32767." },
    { l: 5, q: "A PT100 module returns AIW4 = 1875. The temperature is…", a: ["1875 °C", "187.5 °C", "18.75 °C", "0.1875 °C"], c: 1, why: "Temperature modules give 0.1 °C units." },
    { l: 5, q: "Why is AIW6 × 300 / 27648 a bad idea with 16-bit words?", a: ["PLCs cannot divide by a number this big", "AIW6 × 300 overflows (more than 32767)", "The multiply takes too long in one scan", "The result always rounds up by one unit"], c: 1, why: "In 16 bits, divide by a constant worked out before (AIW6 / 92). Better: use 32-bit or REAL maths." },
    { l: 5, q: "A temperature sensor is short-circuited and reads −32768. A program that does not check this will…", a: ["stop heating, because the value is too low", "heat forever, because it looks cold", "show 0 °C and keep the heater switched off", "go to STOP with a range error at once"], c: 1, why: "Always check impossible raw values and fail safe." },
    { l: 5, q: "Gross 26.10 kg, empty bag 0.85 kg. Net weight?", a: ["26.95 kg", "25.25 kg", "26.10 kg", "22.185 kg"], c: 1, why: "Net = gross − tare." },
    { l: 5, q: "What is \"in-flight\" (preact) on a filling scale?", a: ["A bag that is still moving on the conveyor", "Material still falling when the gate closes", "The weight of the empty bag on the scale", "Vibration of the scale while the gate is open"], c: 1, why: "Close the gate early by the in-flight amount; good controllers learn it." },
    { l: 5, q: "Why does a thermostat switch on at 195 °C and off at 205 °C instead of both at 200 °C?", a: ["To save energy by heating only every other minute", "Hysteresis: one switch point would make it chatter", "The law asks for two switch points on every electric heater", "The sensor cannot give an exact reading at 200 °C"], c: 1, why: "Two switching points = calm switching." },
    { l: 4, q: "A shift register (SHRB) of length 8 gets one clock pulse. What happens?", a: ["All eight bits take the DATA value at the same time", "Every bit moves one place; DATA enters the first bit", "The whole register is cleared and DATA goes to bit 7", "Only the first bit changes; the other bits stay the same"], c: 1, why: "One pulse = one shift: everything moves one place along." },
    { l: 4, q: "Why is SHRB almost always clocked through a P (edge) contact?", a: ["The SHRB syntax gives an error without an edge contact", "Else it shifts every scan while the rung is true", "An edge contact makes the shift faster for the PLC", "The edge contact inverts the DATA bit before the shift"], c: 1, why: "A button held for 200 ms is about 20 scans: 20 shifts instead of one." },
    { l: 4, q: "A checker puts \"bad\" into bit 0 of a register clocked once per bottle. The rejector is 5 bottles further on. Which bit drives it?", a: ["bit 0", "bit 4", "bit 5", "bit 6"], c: 2, why: "Bit k holds the data from k pulses ago: 5 bottles later = bit 5." },
    { l: 4, q: "What should clock a tracking register on a conveyor?", a: ["A 1-second clock pulse from a free-running timer", "A pulse per pocket from a conveyor cam or encoder", "The camera result each time a bottle is checked", "The reject output each time a bad part is pushed off"], c: 1, why: "Then the register stops when the conveyor stops, and the tracking stays right." },
    { l: 4, q: "When is a shift register NOT the right tool?", a: ["Several parts sit between the sensor and the reject arm", "You need to keep the last three test results in a row", "Parts come at random gaps with no pulse per part", "You want a running light that moves along eight lamps"], c: 2, why: "A shift register needs one pulse per step. Random spacing needs positions (encoder) and a list (FIFO)." },
    { l: 4, q: "One PB2 contact drives eight RST outputs drawn in parallel in one rung. Pressing PB2…", a: ["resets only the first bit, in the top branch", "resets all eight bits in the same scan", "resets one bit per scan, so eight scans in all", "is a double-coil error and resets nothing"], c: 1, why: "Outputs in parallel all get the same power: one condition, many outputs." },
    { l: 4, q: "SHL of the word 3 (0000 0011) by one place gives…", a: ["1", "6", "4", "12"], c: 1, why: "Shifting left one place doubles the value: 0000 0110 = 6." },
    { l: 4, q: "SHRB with a negative length…", a: ["is a compile error, so it cannot be downloaded at all", "shifts the other way: DATA enters the last bit", "clears the whole register at each clock pulse", "shifts two places per pulse instead of one"], c: 1, why: "Negative length reverses the direction (Siemens convention)." },
    { l: 1, q: "In what order does a PLC scan work?", a: ["Write outputs → solve rungs top to bottom → read inputs", "Read inputs → solve rungs top to bottom → write outputs", "Solve a rung at once each time one of its inputs changes", "Read inputs → write outputs → then solve the rungs in order"], c: 1, why: "Inputs are copied first, rungs solved in order, outputs written at the end." },
    { l: 1, q: "A normally-open contact -| |- passes power when its bit is…", a: ["0", "1", "changing", "forced"], c: 1, why: "NO contact = \"is the bit 1?\"." },
    { l: 1, q: "Two contacts in series represent…", a: ["OR", "AND", "XOR", "NAND"], c: 1, why: "Power must pass through both." },
    { l: 1, q: "Two contacts in parallel represent…", a: ["AND", "OR", "NAND", "a latch"], c: 1, why: "Either path lets power through." },
    { l: 1, q: "I0.3 means…", a: ["Input with 0.3 V signal", "Input byte 0, bit 3", "Output byte 0, bit 3", "Input word 0, value 3"], c: 1, why: "Siemens addressing: byte.bit." },
    { l: 1, q: "A STOP button is wired NC. Nobody touches it. Its input bit is…", a: ["0", "1", "undefined", "it depends on the program"], c: 1, why: "The NC contact is closed at rest, so 24 V reaches the input." },
    { l: 1, q: "In the motor run rung, a STOP button that is wired NC should be programmed as…", a: ["NC contact -|/|-", "NO contact -| |-", "a SET coil -(S)-", "a P edge contact -|P|-"], c: 1, why: "You want to pass power while the bit is 1 (not pressed)." },
    { l: 1, q: "Why are stop buttons wired NC?", a: ["NC buttons are cheaper and easier to buy", "A broken wire then acts like a stop: fail-safe", "Most PLC input cards can only read NC contacts", "NC contacts make the stop rung shorter in the program"], c: 1, why: "Loss of signal = stop." },
    { l: 1, q: "What does a coil -( )- do when its rung loses power?", a: ["Keeps its last value", "Writes 0 to its bit", "Toggles its bit", "Keeps 1 until a reset"], c: 1, why: "A normal coil writes the rung result every scan." },
    { l: 1, q: "Which IEC address equals Siemens Q0.0?", a: ["%IX0.0", "%QX0.0", "%MX0.0", "Q:0/0"], c: 1, why: "Q = output, X = bit." },
    { l: 2, q: "The holding (seal-in) contact in a start/stop rung is…", a: ["the STOP button contact in series with START", "an output contact in parallel with START", "a short timer that holds the rung for a while", "a P edge contact on START so it runs once"], c: 1, why: "The output keeps its own rung alive." },
    { l: 2, q: "START and STOP are pressed at the same time on a standard seal-in rung. The motor…", a: ["starts: START wins the rung", "stays off: stop-dominant", "toggles on each scan", "goes to a fault state"], c: 1, why: "STOP is in series with everything." },
    { l: 2, q: "After a power failure, a seal-in motor circuit…", a: ["restarts by itself when the power comes back", "stays off until START is pressed again", "runs in reverse for one scan, then stops", "restarts only if the scan time is short"], c: 1, why: "The coil is off at power-up, so the seal is open." },
    { l: 2, q: "SET is in rung 4, RESET for the same bit in rung 9, and both are true. The bit ends up…", a: ["1", "0", "flickering", "undefined"], c: 1, why: "The later rung wins." },
    { l: 2, q: "How do you interlock forward K1 and reverse K2?", a: ["NO of K2 in the K1 rung, and NO of K1 in the K2 rung", "NC of K2 in the K1 rung, NC of K1 in the K2 rung", "A short timer between the two direction rungs", "SET coils for K1 and K2 instead of normal coils"], c: 1, why: "Each blocks the other." },
    { l: 2, q: "A software interlock is enough to prevent a dangerous short circuit.", a: ["True: the program always blocks both contactors", "False: add hardware and mechanical interlocks", "True, if the PLC scan time is short enough", "True, if you use SET and RESET coils for it"], c: 1, why: "Programs can be wrong or forced. Hardware protection works on its own." },
    { l: 2, q: "A rising edge contact -|P|- is true for…", a: ["all the time while the bit stays at 1", "exactly one scan when the bit goes 0→1", "exactly one second after the bit goes 0→1", "until a RESET coil writes it back to 0"], c: 1, why: "One-shot." },
    { l: 2, q: "Two rungs both have COIL(Q0.0). What happens?", a: ["The two rung results are OR-ed into the output", "Only the lower rung's result reaches the output", "The PLC sees an error and goes to STOP mode", "Only the first (upper) rung's result reaches the output"], c: 1, why: "Double coil: the last write wins." },
    { l: 2, q: "Why use memory bits (M)?", a: ["M bits are read much faster than real inputs", "To store states and reuse in-between results", "Because a PLC has only eight real outputs", "All M bits always keep their value after power loss"], c: 1, why: "Internal relays structure your logic." },
    { l: 2, q: "A one-button ON/OFF toggle needs…", a: ["a normal contact and one coil, nothing more", "an edge pulse plus XOR with the output", "a TOF timer that holds the output on", "two coils that write the same output bit"], c: 1, why: "Otherwise it toggles every scan while held." },
    { l: 3, q: "TON with PT = 5 s. Input on for 3 s, off, on again for 3 s. Output?", a: ["Turns on after 2 s", "It never turns on", "On for 1 s only", "On straight away"], c: 1, why: "TON resets when the input drops." },
    { l: 3, q: "Which timer keeps a fan running for a while after the light switch goes off?", a: ["TON", "TOF", "TP", "TONR"], c: 1, why: "Off-delay." },
    { l: 3, q: "Which timer keeps accumulated time after its input drops?", a: ["TON", "TOF", "RTO / TONR", "TP (pulse)"], c: 2, why: "Retentive; needs a RESET." },
    { l: 3, q: "You need a fixed 2 s solenoid kick no matter how long the button is held. Use…", a: ["TON", "TP", "TOF", "CTD"], c: 1, why: "Pulse timer." },
    { l: 3, q: "T0.ET is…", a: ["the done (output) bit", "the elapsed time", "the preset time", "the enable input"], c: 1, why: "ET = elapsed time (ACC in Allen-Bradley)." },
    { l: 3, q: "A cheap way to flash a lamp at 1 Hz on Siemens S7-200 is…", a: ["SM0.0", "SM0.1", "SM0.5", "I0.0"], c: 2, why: "SM0.5 toggles every 0.5 s." },
    { l: 3, q: "Why does a star-delta starter exist?", a: ["To reverse the motor without a second contactor", "To cut the starting current of large motors", "To brake the motor quickly when it stops", "To count the motor revolutions at start"], c: 1, why: "Star start ≈ ⅓ current." },
    { l: 3, q: "Debouncing a flickering sensor is usually done with…", a: ["a short TON on the sensor signal", "a CTU that counts the flickers", "a SET coil that latches the signal", "two coils for the same output bit"], c: 0, why: "Only believe it once it is stable for a few ms." },
    { l: 3, q: "A timeout timer on a cylinder move is used to…", a: ["make the cylinder move faster", "detect when it fails to arrive", "count the strokes of the cylinder", "save air by cutting the valve early"], c: 1, why: "Turns a silent hang into an alarm." },
    { l: 4, q: "A CTU counts…", a: ["every scan its input is on", "rising edges of its input", "seconds while its input is on", "only falling edges of its input"], c: 1, why: "Edge detection is built in." },
    { l: 4, q: "CTU with PV 5 and CV 5. The done bit is…", a: ["0: CV must be above PV", "1: CV has reached PV", "0 until the next pulse", "1 for one scan, then 0"], c: 1, why: "Done at CV ≥ PV." },
    { l: 4, q: "How do you count cars inside a car park with one counter?", a: ["CTU on entry and RESET on each exit", "CTU on entry, CTD on exit, same counter", "Two TON timers, one for each gate barrier", "It is not possible with only one counter"], c: 1, why: "Up/down counting." },
    { l: 4, q: "NO(button) → ADD MW0 + 1 → MW0. Pressing once for 0.3 s adds…", a: ["exactly 1, once per press", "about 1 per scan, so dozens", "0, as ADD only runs on an edge", "0.3, the time it was held"], c: 1, why: "Math boxes run every scan while powered. Use an edge contact." },
    { l: 4, q: "A compare contact CMP(C0.CV >= 3) passes power when…", a: ["C0 is done, whatever its value is", "the counter value is 3 or more", "C0 was just reset back to 0", "always, it is a fixed contact"], c: 1, why: "It compares numbers." },
    { l: 4, q: "A PNP sensor should be connected to…", a: ["a sinking input card", "a sourcing input card", "a sourcing output card", "any type of input card"], c: 0, why: "PNP sources current; the input must sink it." },
    { l: 4, q: "A single-solenoid spring-return valve, when the PLC output turns off…", a: ["stays in its last position", "returns to its rest position", "locks until the air is removed", "goes to the middle position"], c: 1, why: "The spring pushes it back." },
    { l: 4, q: "Which sensor detects a cylinder piston magnet?", a: ["Photo-eye", "Reed switch", "Thermocouple", "Encoder"], c: 1, why: "Reed switches on the barrel see the magnet." },
    { l: 4, q: "A 4–20 mA transmitter reads 0 mA. Most likely…", a: ["the tank is empty, so the level is 0 %", "a broken wire or failed transmitter", "the value is negative, below 0 %", "the level is at 50 % of range"], c: 1, why: "0 % is 4 mA (live zero), so 0 mA means a fault." },
    { l: 4, q: "AIW0 = 19200 on a 6400…32000 (4–20 mA) input. The level is…", a: ["25 %", "50 %", "60 %", "40 %"], c: 1, why: "(19200 − 6400) ÷ 256 = 50." },
    { l: 4, q: "Why compute (AIW0 − 6400) ÷ 256 instead of (AIW0 − 6400) × 100 ÷ 25600 in 16-bit math?", a: ["Dividing first gives a more exact result", "The ×100 would overflow a 16-bit word", "IEC says you must divide before you multiply", "No reason; both give the same in 16-bit"], c: 1, why: "25600 × 100 is far above 32767." },
    { l: 5, q: "A P-only level controller settles a bit below the setpoint. This is…", a: ["a wiring fault in the level sensor loop", "the proportional offset; add an I term", "integral windup from too much I gain", "normal for PID and cannot be removed"], c: 1, why: "P needs some error to hold the valve open; I removes it." },
    { l: 5, q: "In a duty/standby pump station, alternation means…", a: ["both pumps always running together at half speed", "swapping which pump is duty after each cycle", "running the standby pump in reverse", "alternating the motor supply at 50 Hz"], c: 1, why: "Equal wear on both pumps." },
    { l: 5, q: "In Structured Text, which line assigns a value?", a: ["Motor = TRUE;", "Motor := TRUE;", "Motor == TRUE;", "SET Motor;"], c: 1, why: ":= assigns; = compares." },
    { l: 5, q: "WHILE NOT Sensor DO END_WHILE; inside a PLC program will…", a: ["wait there until the sensor turns on", "hang until the watchdog stops the PLC", "skip the loop because inputs are frozen", "run the loop once per scan, then continue"], c: 1, why: "Inputs are not re-read during a scan, so the loop never ends." },
    { l: 5, q: "You need to sum 10 values in an array. Best ST construct?", a: ["CASE", "FOR", "WHILE NOT done", "R_TRIG"], c: 1, why: "A known number of repetitions: FOR." },
    { l: 5, q: "In a CASE state machine, how does a step \"wait\" for a sensor?", a: ["A WHILE loop inside that step waits for the sensor", "Step stays the same until the sensor is TRUE", "A DELAY function pauses the CASE for it", "A GOTO jumps back to the start of the step"], c: 1, why: "The CASE runs again every scan. The step changes only when its condition is true." },
    { l: 5, q: "How do you use a TON in ST?", a: ["Write Q := TON(Switch, T#3s); a TON returns Q like a function", "Declare T1 : TON; call T1(IN:=Switch, PT:=T#3s); read T1.Q", "Write IF Switch THEN WAIT(T#3s); END_IF; then set the output", "Declare T1 : TON; call it once in the first scan; read T1.ET"], c: 1, why: "A TON is a block instance: declare it, call it every scan, read its outputs." },
    { l: 5, q: "Why use a step-number state machine for sequences?", a: ["It uses less memory than any other way to write a sequence", "One active step; easy to debug, extend and show on an HMI", "The law and IEC 61131 say every sequence must use one", "Step numbers make the PLC scan faster than plain logic"], c: 1, why: "Clear structure; maps to SFC and CASE." },
    { l: 5, q: "A transition rung in a step state machine looks like…", a: ["CMP(MW0==2) AND condition → MOV 3 → MW0", "NO(condition) → coil MW0, one coil per step", "TON(condition) → MW0, the timer sets the step", "SET MW0 when condition, RESET it in step 3"], c: 0, why: "In step 2, when condition, go to step 3." },
    { l: 5, q: "An emergency stop should…", a: ["pause the program and hold all outputs in place", "cut energy through a safety relay or safety PLC", "set a software flag that the HMI shows to the operator", "be a normal PLC input that the program checks"], c: 1, why: "Safety must not depend on normal program logic." },
    { l: 5, q: "SM0.1 / first-scan bit is used to…", a: ["make a lamp flash at a steady 1 Hz rate", "set up steps and values after power-up", "count how many scans the PLC has made so far", "stop the PLC when a serious fault happens"], c: 1, why: "On only during the first scan." },
    { l: 5, q: "Tank pump: start at LOW, stop at HIGH, stay off between. This behaviour is called…", a: ["interlock", "hysteresis", "debounce", "double coil"], c: 1, why: "Two thresholds prevent rapid cycling." },
    { l: 5, q: "When troubleshooting a stopped machine online, start at…", a: ["the first rung of the program, then go down", "the output that should be ON, then trace back", "the PLC CPU, by restarting it to clear faults", "the last rung of the program, then go up again"], c: 1, why: "Work backwards from the output." },
    { l: 5, q: "Which IEC language is best for heavy math and loops?", a: ["LD", "ST", "IL", "SFC"], c: 1, why: "Structured Text." },
    { l: 5, q: "Forcing an output while people are near the machine is…", a: ["fine, because a force is only used for testing", "dangerous: machinery can move without warning", "safe, because forces obey all interlocks", "safe, as long as the HMI shows a warning"], c: 1, why: "Forces bypass logic and interlocks." },
    { l: 1, q: "What does PLC stand for?", a: ["Programmable Logic Controller", "Process Line Control Computer", "Power Logic Circuit Board", "Programmed Load Contactor Unit"], c: 0, why: "An industrial computer for control." },
    { l: 1, q: "In a ladder diagram, power is imagined flowing…", a: ["from the left rail to the right rail", "from the right rail back to the left rail", "from the coil back to the first contact", "from the top rung down to the last rung"], c: 0, why: "Left rail = live, right rail = neutral." },
    { l: 1, q: "A rung has NO(A) in series with NC(B). The output is ON when…", a: ["A = 1 and B = 0", "A = 0 and B = 1", "A = 1 and B = 1", "either A or B is 1"], c: 0, why: "NO passes on 1, NC passes on 0, series = AND." },
    { l: 1, q: "Which device is normally wired NC?", a: ["Stop / emergency stop button", "Start button on the panel", "Jog button for setup moves", "Lamp test button on the cabinet"], c: 0, why: "A broken wire must act like a stop." },
    { l: 1, q: "How many bits are in one byte (I0.0 … I0.7)?", a: ["8", "16", "4", "10"], c: 0, why: "Bits 0 to 7." },
    { l: 1, q: "Two NC contacts in series (NOT A AND NOT B) equal…", a: ["NOT (A OR B)", "NOT (A AND B)", "A OR B", "A AND B"], c: 0, why: "De Morgan: ON only when neither A nor B is on." },
    { l: 1, q: "A staircase light switched from two places (either switch changes it) is…", a: ["XOR", "AND", "OR", "NAND"], c: 0, why: "On when exactly one switch is on." },
    { l: 1, q: "Two NO contacts in parallel feeding a coil. Both inputs are 0. The coil is…", a: ["OFF", "ON", "blinking", "unknown"], c: 0, why: "No path is closed." },
    { l: 2, q: "Two start buttons and two stop buttons for one motor: how are they placed?", a: ["Starts in parallel, stops in series", "Starts in series, stops in parallel", "All four buttons wired in one series line", "All four buttons wired in parallel"], c: 0, why: "Any start can start; any stop must break the circuit." },
    { l: 2, q: "Why seal in a jog/run motor with a memory bit instead of the output?", a: ["So a jog press cannot latch the motor", "Memory bits are scanned faster than outputs", "Outputs cannot be used as contacts in ladder", "To use fewer physical outputs on the card"], c: 0, why: "If the output seals itself in, a jog would latch too." },
    { l: 2, q: "A rising-edge P contact on a button held for 2 s is TRUE for…", a: ["one scan", "two scans", "2 seconds", "one second"], c: 0, why: "An edge is TRUE for exactly one scan." },
    { l: 2, q: "Why add a hardware interlock between K1 and K2 when the program already has one?", a: ["It works even if the PLC or program fails", "It switches faster than a PLC output", "Programs are not allowed to interlock", "It is cheaper than the program interlock"], c: 0, why: "Independent protection." },
    { l: 2, q: "STOP is only in the seal-in branch, not in series with START. Holding START…", a: ["runs the motor even while STOP is pressed", "stops the motor as soon as STOP is pressed", "puts the PLC into STOP mode with a fault", "has no effect: the motor will not start"], c: 0, why: "The START path bypasses STOP. A classic bug." },
    { l: 2, q: "A one-button toggle needs an edge because…", a: ["otherwise it toggles every scan while held", "the button is wired normally closed", "a coil can only change state on an edge", "an edge uses less PLC memory than a level"], c: 0, why: "A level signal is true for many scans." },
    { l: 3, q: "TOF with PT = 5 s. The input goes OFF. The output turns off…", a: ["5 s later", "at once", "10 s later", "after 5 scans"], c: 0, why: "Off-delay: the output stays on for PT after the input goes off." },
    { l: 3, q: "Delay a motor start by 10 s after START: use…", a: ["TON", "TOF", "TP", "CTU"], c: 0, why: "On-delay." },
    { l: 3, q: "A flasher made of two 0.5 s timers has a period of about…", a: ["1 s", "0.5 s", "2 s", "0.25 s"], c: 0, why: "0.5 s off + 0.5 s on = 1 s." },
    { l: 3, q: "Staircase light that restarts its 5 s at every press: best timer?", a: ["a TOF fed by the buttons", "a TON fed by the buttons", "a TP pulse from the buttons", "an RTO fed by the buttons"], c: 0, why: "A TOF restarts whenever its input comes on again." },
    { l: 3, q: "In PLC Start, T0.ET is measured in…", a: ["milliseconds", "microseconds", "whole seconds", "number of scans"], c: 0, why: "3 s = 3000." },
    { l: 3, q: "Starting three conveyors 2 s apart mainly avoids…", a: ["adding up the inrush currents", "boxes falling off the belt", "scan time problems in the PLC", "double coils in the program"], c: 0, why: "Big motors draw 6–8× current when starting." },
    { l: 3, q: "A single timer that resets itself (NC of its own done bit) gives…", a: ["a one-scan pulse every PT", "a 50 % duty flasher signal", "a latch that stays on forever", "a timer that runs only once"], c: 0, why: "Done for one scan, then reset." },
    { l: 4, q: "CTD with PV = 4 after 4 pulses: CV and done bit?", a: ["CV 0, done ON", "CV 4, done OFF", "CV −4, done ON", "CV 0, done OFF"], c: 0, why: "Counts down from PV, done at ≤ 0." },
    { l: 4, q: "Three lamps at 1 s, 2 s, 3 s from ONE timer: how?", a: ["Compare instructions on T0.ET", "Three coils on the T0 done bit", "A CTU on the START button", "One MOV of T0.ET to the lamps"], c: 0, why: "ET ≥ 1000, ≥ 2000, ≥ 3000." },
    { l: 4, q: "2-out-of-3 voting is used to…", a: ["ignore one faulty sensor and still trip safely", "save money by buying cheaper sensors", "count the sensor pulses three times faster", "make the PLC scan faster by reading fewer inputs"], c: 0, why: "One bad sensor can neither trip nor block the trip alone." },
    { l: 4, q: "A 4–20 mA wire breaks. AIW0 reads about…", a: ["0 (far below 6400)", "32000 (top of range)", "6400 (zero point)", "16000 (mid scale)"], c: 0, why: "No current at all." },
    { l: 4, q: "0–50 °C on 6400…32000: how many counts per °C?", a: ["512", "256", "640", "100"], c: 0, why: "25600 ÷ 50." },
    { l: 4, q: "A counter input is held ON for 3 s. How many counts does a CTU add?", a: ["1", "300", "3", "0"], c: 0, why: "Counters count rising edges, not scans." },
    { l: 4, q: "Heater on below 20 °C and off at 22 °C. The 2 °C gap prevents…", a: ["rapid on/off switching (chattering)", "faults in the temperature sensor", "double coils in the heater rung", "the sensor reading too high a temperature"], c: 0, why: "Hysteresis." },
    { l: 5, q: "In a step sequence, what normally ends a step?", a: ["A transition, usually a sensor confirming the move", "Always a fixed delay from one timer in each step", "The end of the current PLC scan, every single time", "The operator pressing START again for every single step"], c: 0, why: "Confirm, then move on." },
    { l: 5, q: "\"Cycle stop\" means…", a: ["finish the current cycle, then stop at home", "stop all motion at once, wherever it is", "cut the power to all motors right now", "pause in the middle and resume later from there"], c: 0, why: "Machines stop in a known state." },
    { l: 5, q: "Why does STOP during drilling retract the drill instead of just freezing?", a: ["To leave the machine in a safe, known state", "Because retracting is faster than freezing", "To save energy while the drill is stopped", "Because a frozen drill motor cannot stop"], c: 0, why: "A drill left inside the part is a problem for restart." },
    { l: 5, q: "A dwell (hold the stamp down 2 s) is made with…", a: ["a TON in the dwell step", "a CTU in the dwell step", "a P contact in the dwell step", "a MOV in the dwell step"], c: 0, why: "Time-based transition." },
    { l: 5, q: "Why number steps 10, 20, 30 instead of 1, 2, 3?", a: ["To insert steps later without renumbering", "The PLC runs bigger step numbers faster", "The IEC 61131-3 standard says steps must be tens", "It uses less memory in the step word"], c: 0, why: "Step 15 fits between 10 and 20." },
    { l: 5, q: "A timeout timer on each step lets you…", a: ["detect a stuck move and raise an alarm", "make each step run faster than before", "skip a slow step and go to the next one", "use fewer outputs in each step"], c: 0, why: "Silent hangs become clear alarms." },
    { l: 6, q: "Duty/standby alternation toggles the duty pump on…", a: ["the end of each pumping cycle (falling edge)", "every PLC scan while any of the pumps is running", "each press of the START button on the panel", "every pulse of a 1 Hz clock in the program"], c: 0, why: "One swap per cycle." },
    { l: 6, q: "A compressor \"run-on\" (idle) timer is there to…", a: ["limit the number of motor starts", "raise the tank pressure a bit higher", "cool the compressed air before use", "protect the unload valve from wear"], c: 0, why: "Idling is better than restarting too often." },
    { l: 6, q: "Why start a compressor unloaded?", a: ["Lower starting torque and current", "It makes the start much quieter", "It builds pressure faster at start", "It tests the unload valve each time"], c: 0, why: "Load only once the motor is up to speed." },
    { l: 6, q: "The \"next-state\" pattern (compute MW2, copy to MW0 at the end) prevents…", a: ["one event jumping through many states in one scan", "double coils when two states share one output", "the scan time growing too long in big programs", "counter overflow when the state number gets too high"], c: 0, why: "All transitions read the same state." },
    { l: 6, q: "Filling & capping: station 2 counts as done when…", a: ["there is no bottle at the capper OR the cap is done", "the filler at station 1 has finished filling", "the conveyor has stopped and every bottle is standing still", "the operator presses START again on the panel"], c: 0, why: "An OR branch makes parallel stations work." },
    { l: 6, q: "Palletizer with rows of 3, 2 rows per layer and 3 layers: boxes per pallet?", a: ["18", "9", "6", "12"], c: 0, why: "3 × 2 × 3 = 18." },
    { l: 6, q: "Why does the crane keep its magnet on during STOP?", a: ["Releasing it would drop the load", "To save energy during a stop", "The magnet cannot be turned off", "To keep the magnet coil cool"], c: 0, why: "STOP must not create a new danger." },
    { l: 6, q: "A washing machine door must stay locked while…", a: ["there is water inside or the drum turns", "the front panel lamp is switched on", "the heater is off and the drum is not moving", "the mains plug is in, even when it is empty"], c: 0, why: "Flood and injury protection." },
    { l: 6, q: "\"Tracking\" in the box sorter means…", a: ["keeping an item's data until it reaches the next station", "following each box with a camera along the belt", "counting how many boxes have passed the first sensor today", "measuring the belt speed with an encoder wheel"], c: 0, why: "Measure upstream, act downstream." },
    { l: 6, q: "A sliding gate is closing and the photocell is blocked. It should…", a: ["reverse and open", "keep closing slowly", "stop and stay there", "speed up and close"], c: 0, why: "Never close onto a car or person." },
    { l: 7, q: "Lamp := Motor; in ladder is…", a: ["one NO contact Motor driving coil Lamp", "one NO contact Motor driving a SET Lamp", "one NC contact Motor driving coil Lamp", "a TON on Motor driving coil Lamp"], c: 0, why: "A plain assignment = contact + coil." },
    { l: 7, q: "IF A THEN Q := TRUE; END_IF on its own behaves like…", a: ["a SET coil", "a normal coil", "a RESET coil", "a TON timer"], c: 0, why: "Nothing ever writes FALSE." },
    { l: 7, q: "IF Button THEN Count := Count + 1; END_IF adds…", a: ["1 every scan while the button is held", "1 for each press of the button", "1 per press, because IF reacts to edges", "10 per second while it is held"], c: 0, why: "Use R_TRIG for once per press." },
    { l: 7, q: "Which keyword leaves a FOR or WHILE loop early?", a: ["EXIT", "BREAK", "STOP", "END"], c: 0, why: "EXIT leaves the loop; RETURN leaves the current block." },
    { l: 7, q: "FOR i := 1 TO Count DO … with Count = 0 runs…", a: ["zero times", "only once", "forever", "an error"], c: 0, why: "Start is already past the end." },
    { l: 7, q: "Avg := Sum / 10; with INT Sum = 57 gives…", a: ["5", "5.7", "6", "57"], c: 0, why: "Integer division truncates." },
    { l: 7, q: "ARRAY[0..9] OF INT has how many elements?", a: ["10", "9", "11", "0"], c: 0, why: "0 to 9 inclusive." },
    { l: 7, q: "Idx := (Idx + 1) MOD 10; is used for…", a: ["a ring-buffer index that wraps from 9 to 0", "dividing Idx by 10 and keeping the result", "rounding Idx up to the nearest multiple of 10", "a timer that counts up in steps of ten"], c: 0, why: "MOD gives the remainder." },
    { l: 7, q: "R_TRIG(CLK := Btn); its output .Q is TRUE…", a: ["for one call/scan on a rising edge", "for as long as Btn is held down", "for one scan when Btn is released", "all the time after the first press"], c: 0, why: "Rising-edge detector." },
    { l: 7, q: "In CODESYS, %IX0.3 means…", a: ["input bit 0.3", "output bit 0.3", "memory word 3", "analog input 3"], c: 0, why: "I = input, X = bit." },
    { l: 7, q: "Why call timer blocks every scan, not inside an IF?", a: ["So they see IN go FALSE and reset", "Because an IF cannot contain a block call", "To save memory in the instance data", "Because the timer runs faster that way"], c: 0, why: "A block that is not called is frozen." },
    { l: 7, q: "WHILE i < 4 AND Occ[i] DO … faults when i reaches 4 because…", a: ["ST evaluates both sides of AND, so it reads Occ[4]", "WHILE conditions are not allowed to use AND", "i overflows as an INT when it goes past 3", "arrays start at 1, so Occ[0] does not exist at all"], c: 0, why: "In CODESYS and TwinCAT both sides of AND are read, so Occ[4] is out of range (other brands may stop early: never rely on it, check the index first)." },
    { l: 7, q: "Which type holds the literal T#3s?", a: ["TIME", "DINT", "STRING", "TOD"], c: 0, why: "Durations like T#3s are TIME." },
    { l: 6, q: "A barcode scanner on a tool fixture is triggered by the PLC. When should the PLC evaluate the code word?", a: ["While the \"read OK\" status bit is on", "Immediately when it sets the trigger bit", "Any time, the code word is always valid", "Only once, right after power-up"], c: 0, why: "The data is only valid together with its status bit." },
    { l: 6, q: "The scanner reads code 3003, which is not in the tool table. The PLC should…", a: ["raise an \"unknown tool\" alarm and not start", "run the Tool A sequence as a safe default", "ignore the code and wait for a new scan", "run the sequence of the last known tool again"], c: 0, why: "Poka-yoke: unknown means stop and tell the operator." },
    { l: 6, q: "After a tool change, the PLC must…", a: ["read the tool identity again before any cycle", "keep the old tool number until power-off", "start the next cycle right away to save time", "reset all part counters, then start"], c: 0, why: "Never assume the tool did not change." },
    { l: 6, q: "Recipe-driven programming means…", a: ["one sequence; tool differences live in data tables", "a separate copy of the whole program for each new tool", "the HMI runs the sequence instead of the PLC", "using only timers, so no sensors are needed"], c: 0, why: "Adding a tool = adding data, not a new sequence." },
    { l: 6, q: "An HMI shows \"Tool B ready\". Where does that text usually come from?", a: ["The PLC sends a number; an HMI text list shows the words", "The PLC sends the full text, letter by letter, every scan", "The scanner sends it straight to the HMI screen", "The HMI decides by itself from the camera image"], c: 0, why: "Status words + text lists." },
    { l: 6, q: "Why keep STOP as a hard-wired button even on a machine with a touch HMI?", a: ["Safety functions must not depend on a screen or network", "Touch screens cannot show a button that looks big and red", "A hard-wired button is cheaper than an HMI page", "HMIs are read-only and cannot send any commands"], c: 0, why: "Hard-wired is independent and always available." },
    { l: 6, q: "Tool A has 3 clamps, Tool B has 6. What protects the missing clamp ports on Tool A?", a: ["A \"fitted\" mask so only existing clamps are driven", "Nothing, because unused valve outputs do no harm", "A slower scan time while Tool A is mounted", "An HMI message that warns the operator not to start"], c: 0, why: "Only drive what the tool actually has." },
    { l: 7, q: "In a CASE state machine, why can a button press not jump two states in one scan?", a: ["CASE runs only one branch per scan", "Buttons are too slow to change in one scan", "CASE adds a short delay between the states", "It can: a press always jumps two states"], c: 0, why: "One branch, then the scan continues after END_CASE." },
    { l: 5, q: "In Studio 5000, XIC(Start) is…", a: ["a normally-open contact on Start", "an output coil named Start", "a timer instruction on Start", "a normally closed contact"], c: 0, why: "XIC = examine if closed: true when the bit is 1." },
    { l: 5, q: "Rockwell T1.DN is the same as…", a: ["T1.Q in TIA Portal / CODESYS", "T1.ET in TIA Portal / CODESYS", "T1.PT in TIA Portal / CODESYS", "T1.IN in TIA Portal / CODESYS"], c: 0, why: "DN is the done bit, the same as Q." },
    { l: 5, q: "On a Siemens PLC you use MD20 for a total. What else changes when MD20 is written?", a: ["MW20 and MW22", "Nothing at all", "MW24 and MW26", "MD24 only"], c: 0, why: "MD20 is MW20 + MW22 (bytes MB20 … MB23)." },
    { l: 6, q: "An alarm lamp should be FLASHING when…", a: ["the alarm is not acknowledged yet", "the alarm is acknowledged and still there", "everything is normal on the machine", "the horn has been switched off"], c: 0, why: "Flashing = new; steady = acknowledged." },
    { l: 6, q: "A fault lasted 0.5 s and disappeared before anyone looked. A good alarm…", a: ["keeps flashing until ACK", "goes off by itself at once", "is hidden as a false alarm", "resets the PLC to clear it"], c: 0, why: "Latched until acknowledged, so nobody misses it." },
    { l: 6, q: "Why put a 1 s filter (TON) on a pressure switch alarm?", a: ["so short dips do not stop the plant", "to make the alarm react faster", "to save memory in the alarm list", "because the law requires a 1 s filter"], c: 0, why: "Filter noise; but not on trips that protect against instant damage." },
    { l: 6, q: "Three alarms come within 2 s. Which one is most likely the cause?", a: ["the first one (first-out)", "the last one (newest)", "the one with the lowest number", "all three are equally likely"], c: 0, why: "Later alarms are often consequences." },
    { l: 6, q: "(AIW0 − 6400) × 5000 ÷ 25600 in 16-bit integers gives nonsense because…", a: ["the product overflows 32 767", "integer division is not allowed", "AIW0 is a REAL, not an INT", "the scan is too slow for maths"], c: 0, why: "Use a 32-bit DINT for the intermediate result." },
    { l: 6, q: "Integer maths with a 32-bit intermediate: the best order is…", a: ["multiply first, divide last", "divide first, then multiply last", "the order does not matter", "add first, then multiply"], c: 0, why: "Dividing first throws the fraction away." },
    { l: 6, q: "35 100 MOD 1000 =", a: ["100", "351", "350", "35.1"], c: 0, why: "35100 / 1000 = 35, remainder 100. MOD gives the remainder." },
    { l: 6, q: "Why not compare a REAL with = 0.3?", a: ["floating-point results are rarely exact", "the = contact only works with BOOL values", "a REAL compare takes too many scans", "a REAL compare overflows the accumulator"], c: 0, why: "Add 0.1 ten times in a REAL and you get 1.0000001, not 1.0. Use a band, or >= / <=." },
    { l: 6, q: "An encoder gives 4000 pulses/s. Counting it with a normal input and CTU…", a: ["misses most pulses", "counts every pulse", "counts each pulse twice", "is faster than an HSC"], c: 0, why: "A normal input is read once per scan. Use a high-speed counter." },
    { l: 6, q: "Why slow down to creep speed before the target length?", a: ["a stop from full speed takes many mm", "creep speed uses less energy per cut", "the encoder cannot count at full speed", "the knife needs time to get ready"], c: 0, why: "From creep speed the stop is almost instant and always the same." },
    { l: 6, q: "An A/B (quadrature) encoder gives, compared with a single track…", a: ["the direction, and up to 4× resolution", "the absolute position after power-up", "twice the speed range, no direction", "a backup track if one wire breaks"], c: 0, why: "The order of the A and B edges gives the direction." },
    { l: 6, q: "The network cable to the partner PLC is pulled. Its inputs in your PLC usually…", a: ["go to 0 or freeze: only a heartbeat shows it", "switch to 1 so the partner machine stops safely", "keep toggling with the last pattern they had", "jump to the maximum value, so you see a fault"], c: 0, why: "Without a heartbeat you cannot tell \"nothing to do\" from \"link dead\"." },
    { l: 6, q: "In a hand-over handshake, B sets \"part received\" when…", a: ["the part has really arrived at B", "a fixed time after A says part ready", "as soon as A sets \"part ready\"", "once at power-up, to start the cycle"], c: 0, why: "Each side only answers what it has really seen." },
    { l: 6, q: "When should B read the part data (e.g. the part type) from A?", a: ["while A says the data is valid, and keep it", "when the part arrives, even if A dropped \"valid\"", "once at power-up, then use it for all parts", "every scan, even when A says data is not valid"], c: 0, why: "Data is only valid while A offers it. Copy it then and keep it." },
    { l: 6, q: "An emergency stop between two machines should go over…", a: ["PROFIsafe / CIP Safety, or hard wiring", "an ordinary PROFINET or EtherNet/IP bit", "a Modbus TCP register, read every scan", "an HMI button that writes a PLC bit"], c: 0, why: "Ordinary bits are not safety rated." },
    { l: 2, q: "A falling-edge contact N(I0.0) is true…", a: ["for one scan when I0.0 goes from 1 to 0", "the whole time while I0.0 stays at 0", "for one scan when I0.0 goes from 0 to 1", "for one second after I0.0 goes from 1 to 0"], c: 0, why: "N = the moment the signal drops. It is true for one scan only." },
    { l: 2, q: "Why start a machine on the RELEASE of START?", a: ["a stuck or taped button can never start it", "the release is detected faster than the press", "the button contacts wear out less this way", "it needs one input less than a rising edge"], c: 0, why: "A falling edge needs the button to be let go." },
    { l: 2, q: "A hand-made rising edge is NO(I0.0) NC(M1.0) COIL(M0.0) with NO(I0.0) COIL(M1.0). Where must the second rung be?", a: ["after the first one", "before the first one", "anywhere in the program", "in a separate block (FC)"], c: 0, why: "If it comes first, M1.0 already holds this scan's value and the edge never fires." },
    { l: 4, q: "You want to count how often a motor really started. Put the P contact on…", a: ["the motor output", "the START push-button", "the STOP button", "the first-scan bit"], c: 0, why: "Pressing START while the motor runs is not a new start." },
    { l: 5, q: "A worn button gives 4 edges per press. Best fix in the program?", a: ["a 50 ms TON filter, then the edge of the timer", "use a falling edge (N contact) instead of a P edge", "count only every fourth edge from the button", "make the scan faster so no bounce is missed"], c: 0, why: "Filter the signal first, then take the edge." },
    { l: 5, q: "Logging knob changes: why compare with a deadband?", a: ["analog noise would trigger all the time", "a deadband uses less memory in the log", "it makes the compare faster in the scan", "the log can only store one value per second"], c: 0, why: "Only a real move of the knob should count." },
    { l: 5, q: "With short, long and double click on one button, why is the single click recognised a little late?", a: ["it must wait to see if a second click follows", "the scan is too slow to see a short press", "the button needs time to debounce for 1 s", "the PLC reads the button only every 100 ms or so"], c: 0, why: "The double-click window must pass first." },
    { l: 5, q: "Can a PLC control a servo motor from ladder?", a: ["Yes: motion instructions, pulse outputs or a drive", "No, servo motion always needs a separate robot controller", "Only from Structured Text, never from ladder", "Only through a VFD with fixed speed steps"], c: 0, why: "All big brands have motion instructions in ladder (MC_… in IEC, MAM… in Rockwell)." },
    { l: 5, q: "Why must an axis be homed before MC_MoveAbsolute?", a: ["an incremental encoder forgets zero at power-off", "homing warms up the motor and the gearbox", "the move runs faster after a homing run", "MC_MoveAbsolute only works when the axis is at position 0"], c: 0, why: "Homing finds the reference point again." },
    { l: 5, q: "A move instruction starts…", a: ["on the rising edge of its rung (Execute)", "every scan while the Execute input is true", "when its DONE bit from the last move is on", "once at power-up, when the axis is enabled"], c: 0, why: "To start it again, the rung must go false and then true again." },
    { l: 5, q: "Two motion instructions use the same command tag MC1. What goes wrong?", a: ["their DONE / BUSY / ERR bits get mixed up", "nothing, one tag can serve many instructions", "the axis moves twice as fast as set", "the PLC goes to STOP with a tag error"], c: 0, why: "Use one command tag per instruction." },
    { l: 5, q: "The Rockwell instruction for an absolute move is…", a: ["MAM", "MSO", "MAH", "MAFR"], c: 0, why: "MAM = Motion Axis Move (absolute or incremental). MSO = servo on, MAH = home, MAFR = fault reset." },
    { l: 6, q: "X and Z start in the same step and the gripper hits the box. The fix:", a: ["move X only after Z reports DONE at the safe height", "make X slower so that Z always has time to go up first", "raise the software limit of the Z axis a bit", "add a 1 s timer between the Z and X starts"], c: 0, why: "Wait for the real position, not for a time." },
    { l: 6, q: "A drive fault stops X while the gripper holds a part. Good practice:", a: ["hold the sequence, keep the vacuum on, reset and resume", "switch everything off at once, including the vacuum", "drop the part in the reject bin and then start again", "restart the PLC to clear the fault, then home every axis"], c: 0, why: "Never drop the part. Hold, fix, resume." },
    { l: 6, q: "The emergency stop of a servo machine should act on…", a: ["the drive's STO input through a safety device", "an MC_Stop block called first in the main program", "MC_Power, to switch the drive enable off", "an HMI button that writes a stop bit"], c: 0, why: "Safety is hardware, not a motion command." },
    { l: 5, q: "A block must remember a timer value from scan to scan. It must be…", a: ["an FB (with an instance)", "an FC, called in every scan", "a coil with a retentive bit", "the main program OB1 only"], c: 0, why: "An FC has no memory of its own. An FB keeps its data in the instance." },
    { l: 5, q: "In Studio 5000, the equivalent of a Siemens FB with its instance DB is…", a: ["an Add-On Instruction with a backing tag", "a JSR to a subroutine with its parameters", "an ONS instruction with a storage bit", "a MOV into a controller-scoped DINT tag"], c: 0, why: "AOI + backing tag = FB + instance DB." },
    { l: 6, q: "An HMI JOG button is usually…", a: ["a momentary bit the HMI writes into PLC memory", "a hard-wired cable from the HMI to a PLC input card", "an analog value from 0 to 100 percent", "a safety-rated signal over PROFIsafe"], c: 0, why: "It is 1 while touched and 0 when released." },
    { l: 6, q: "The setter jogs to a mark at 250 mm on the frame and touches SET HOME. What should the home value be?", a: ["250", "0", "-250", "125"], c: 0, why: "The home value is the position the axis should have at that point: the mark is at 250 mm." },
    { l: 6, q: "Why allow TEACH only when the axis is homed?", a: ["the position of an unhomed axis means nothing", "teaching is too slow before homing is done", "the HMI cannot show the position before homing", "teach values are lost at each power-up"], c: 0, why: "After homing, the numbers match the machine." },
    { l: 6, q: "Which homing needs no movement at every power-up?", a: ["an absolute encoder, adjusted once", "a reference switch search (MC_Home)", "jogging to a mark, then SET HOME", "a search for the encoder zero pulse"], c: 0, why: "An absolute encoder always knows where it is." },
    { l: 2, q: "In an interview you are asked to write start / stop. What do you check first?", a: ["STOP is wired NC, so a broken wire stops it", "the START button is red, so it is easy to see", "the scan time is short enough, under 10 ms", "the HMI shows the running motor in green"], c: 0, why: "Fail-safe stop first." },
    { l: 3, q: "Three motors start 3 s apart. Which timer keeps motor 2 running for 3 s after motor 3 stops?", a: ["TOF", "TON", "TP", "TONR"], c: 0, why: "Off-delay: the output stays on for the set time after the input goes off." },
    { l: 4, q: "A 24-hour clock made from a 1 s pulse drifts. What does a real machine use?", a: ["the PLC real-time clock", "a faster 1 s pulse timer", "an off-delay TOF chain", "a counter of scan cycles"], c: 0, why: "Timer clocks drift and forget the time at power-off." },
    { l: 2, q: "Quiz buzzer: why use P contacts for the player buttons?", a: ["so a button held during the reset cannot win", "so the PLC sees the press a scan faster", "because the player buttons are wired NC, not NO", "so two players can win at the same time"], c: 0, why: "Only a new press counts." },
    { l: 5, q: "Which brand calls a block with memory an Add-On Instruction?", a: ["Rockwell Studio 5000", "Siemens TIA Portal", "Schneider Machine Expert", "Omron Sysmac Studio"], c: 0, why: "TIA: FB. CODESYS / TwinCAT / Machine Expert: FUNCTION_BLOCK. Sysmac: FB." },
    { l: 5, q: "On an Omron CP1, the counter CNT…", a: ["counts down from its set value", "counts up from 0 to its set value", "is a timer, not a counter", "needs no reset input at all"], c: 0, why: "CNT counts down. CNTR counts both ways." },
    { l: 5, q: "TwinCAT 3 and Schneider Machine Expert are both based on…", a: ["CODESYS", "TIA Portal", "Studio 5000", "CX-Programmer"], c: 0, why: "So IEC ST and FBs carry over almost unchanged." },
    { l: 5, q: "Why does an E-stop have two contacts wired to two inputs?", a: ["if one contact welds, the other still stops it", "so the stop signal reaches the PLC twice as fast", "one contact is for the HMI, one for the PLC", "one contact goes to the HMI, one to the alarm lamp"], c: 0, why: "Redundancy: one fault must not stop the safety function." },
    { l: 5, q: "After the E-stop is released, the machine should…", a: ["stay off until RESET and then START", "restart by itself after 5 seconds", "restart only if it was running before", "restart by itself when the button is out"], c: 0, why: "No automatic restart." },
    { l: 5, q: "What does EDM (feedback monitoring) find?", a: ["a welded contactor, before the next start", "a broken PLC output card, during the run", "a too slow PLC scan, before the watchdog trips", "an HMI error, before the operator sees it"], c: 0, why: "The NC auxiliary contact must show \"open\" before switching on." },
    { l: 5, q: "A safety relay or a safety PLC? A machine with 8 guard doors, 4 E-stops and safe speed on 3 drives:", a: ["a safety PLC", "one safety relay", "a normal PLC", "a timer relay"], c: 0, why: "Many functions and drives: a safety controller. A safety relay is for one or two simple functions." },
    { l: 5, q: "In a machine with a safety relay, the normal PLC program must…", a: ["drop its run commands when the relay trips", "switch the safety relay on and off itself", "bypass the safety relay when the setter jogs", "do nothing, the relay already does all"], c: 0, why: "So nothing restarts by itself after the reset." },
    { l: 6, q: "The serial on a label must always have 4 digits. Number 7 becomes…", a: ["0007", "7", "00007", "07"], c: 0, why: "4 digits with leading zeros: ITOS(MW10,4,…)." },
    { l: 6, q: "The barcode reader reports \"no read\". What must the line do?", a: ["not label the product, and reject it", "print an empty label and let it pass", "print the last good code on it again", "ignore it and count the product as good"], c: 0, why: "A product without a valid code must never pass unchecked." },
    { l: 6, q: "Why does the PLC send a message NUMBER to the HMI and not the text?", a: ["texts live on the HMI: easy to change and translate", "a PLC is not allowed to send any STRING data to an HMI", "numbers are faster for the operator to type in", "it does not matter, both ways work the same"], c: 0, why: "Text lists on the HMI can change without a PLC download." },
    { l: 6, q: "Where should the serial counter of a label printer be kept?", a: ["in retentive memory, so it survives a power cut", "in a normal M word, cleared at each restart", "only inside the printer, never in the PLC itself", "in a timer preset, so it counts up by itself"], c: 0, why: "Unique numbers must never repeat after a power cut." },
    { l: 6, q: "The operator types recipe 7, but the array is Length[1..3]. Reading Length[MW30]…", a: ["can stop the PLC (index out of range): check it first", "simply reads 0, so there is no need to check it", "reads the last element, Length[3], instead", "is fine: the PLC wraps 7 round to element 1"], c: 0, why: "Always check the index before you use it." },
    { l: 6, q: "What does Rockwell use instead of data blocks?", a: ["tags, with UDTs and arrays", "numbered DBs, like DB10", "only M bits and M words", "tables kept in the HMI"], c: 0, why: "Controller-scoped or program-scoped tags." },
    { l: 6, q: "You change the structure of a data block and download it, so it is initialised again. What happens to values the operator changed on the HMI?", a: ["they are reset to the start values (unless kept)", "nothing, the DB keeps all the HMI values", "they are doubled and written back to the HMI", "they move into M memory until the next stop"], c: 0, why: "Values not kept as retentive are re-initialised. Download with care." },
    { l: 5, q: "A light curtain has OSSD1 and OSSD2. The safety program should…", a: ["use both: run only when both are on", "use OSSD1 only, OSSD2 is a spare", "use OSSD2 only, it is the safe one", "use them as a counter of beam breaks"], c: 0, why: "One shorted wire must not defeat the stop." },
    { l: 6, q: "Why does muting need sensor A first, then B within a few seconds?", a: ["so only moving material starts the muting", "so the sensors use less energy on standby", "so the PLC can count every pallet that passes", "it does not: any order of A and B is fine"], c: 0, why: "Order and timing recognise the material, not a person." },
    { l: 5, q: "Safety distance S = K × T + C. If the machine stops more slowly (T bigger), the curtain must be…", a: ["further away from the hazard", "closer to the hazard zone", "at the same distance as now", "removed and replaced by a door"], c: 0, why: "More stopping time needs more distance." },
    { l: 5, q: "After a person leaves the light curtain, the machine…", a: ["stays stopped until RESET and START", "restarts at once, as the beam is clear", "restarts by itself after 2 seconds", "restarts only if it was running before"], c: 0, why: "Restart interlock." },
    { l: 4, q: "A hydraulic press waits at the top with the pump running. What should the PLC do with the unloading valve?", a: ["switch it off: the pump runs unloaded, no heat", "keep full pressure on, so the press is always ready", "switch the pump motor off and on every cycle", "nothing, the relief valve handles it fine"], c: 0, why: "Oil over the relief valve turns all the motor power into heat." },
    { l: 5, q: "Why does the pump of a hydraulic unit start unloaded?", a: ["starting on full pressure draws too much current", "to save oil while the pump comes up to speed", "to let the valves warm up before the first cycle starts", "it does not: a pump always starts loaded"], c: 0, why: "Start unloaded, then load it after about 2 s." },
    { l: 5, q: "The 4/3 valve of a press is spring-centred with a closed centre. Both solenoids off means…", a: ["the cylinder stops and holds its position", "the cylinder goes back to its home position", "the cylinder floats and can be pushed by hand", "the pump stops because the oil cannot flow"], c: 0, why: "Oil does not compress, so the ram stays where it is." },
    { l: 5, q: "The ram has pressed at 200 bar. Why wait 0.3 s with the valve centred before going up?", a: ["decompression: to avoid a pressure shock (bang)", "to let the hot oil cool down before the next stroke", "to give the counter time to count the part", "there is no reason, it only wastes cycle time"], c: 0, why: "Let the pressure fall first, then switch to up." },
    { l: 4, q: "A pneumatic cylinder valve stays on at the end stop. A hydraulic one should…", a: ["switch off, or oil goes over the relief valve and heats", "also stay on: hydraulics works like pneumatics", "pulse on and off all the time to keep the cylinder pressed", "switch both solenoids on to lock the cylinder there"], c: 0, why: "Hydraulics is not pneumatics." },
    { l: 6, q: "Two-hand control: one button is taped down, the other is pressed 2 s later. The press…", a: ["does not start: both must come within 0.5 s", "starts, because both buttons are now pressed", "starts slowly, at a safe creep speed", "starts 0.5 s after the second button"], c: 0, why: "Synchronous actuation stops tie-down tricks." },
    { l: 5, q: "An accumulator is charged with ONE set-point: charge below 150 bar, stop at 150 bar. What happens?", a: ["the unloading valve switches on and off all the time", "it works perfectly and holds exactly 150 bar all day long", "the pump never runs, so pressure drops to 0", "the accumulator overfills and bursts at once"], c: 0, why: "This is chatter. Use two set-points: charge at 140, stop at 160." },
    { l: 5, q: "Why does a hydraulic unit have a dump valve on the accumulator?", a: ["to release stored pressure at stop, before pipes are opened", "to cool the oil by sending it from the accumulator to the tank", "to fill the tank again from the accumulator at start", "to let the pump start unloaded at each power-up"], c: 0, why: "Stored energy stays in the accumulator after the pump stops." },
    { l: 2, q: "Jog buttons on a 4/3 valve: DOWN and UP pressed together. The program should…", a: ["switch both solenoids off", "switch both solenoids on", "keep the one pressed first", "stop the pump motor at once"], c: 0, why: "Never Y1 and Y2 together." },
    { l: 6, q: "A press reaches its pressure switch only after 9 s instead of 2 s. A pressing watchdog of 6 s would…", a: ["stop, alarm and go back up: pump worn, leak or no part", "do nothing, because the pressure switch came on in the end", "press harder by raising the pressure set-point", "restart the pump and try the press stroke again"], c: 0, why: "A watchdog finds slow or missing events." },
    { l: 4, q: "A new machine is wired. What do you do before the first AUTO cycle?", a: ["an I/O check: each input and output against the I/O list", "start AUTO at low speed and watch carefully what happens", "nothing, the program was already tested offline", "only test the E-stop, the rest is checked in AUTO"], c: 0, why: "New wiring has mistakes. Find them before the machine moves on its own." },
    { l: 4, q: "During the I/O check, forcing Q0.1 (valve B) moves cylinder C. Most likely…", a: ["the coil wires of B and C are swapped", "the program logic for valve B is wrong", "sensor B1 is broken and reads false", "the PLC output card Q0.1 is broken"], c: 0, why: "A force skips the program. The output reaches the wrong device." },
    { l: 5, q: "The cylinder home sensor and out sensor are both on. The program should…", a: ["raise a sensor alarm (plausibility check)", "ignore it until the next cycle starts", "trust the out sensor and continue the sequence", "assume the cylinder is home and go on"], c: 0, why: "A cylinder cannot be in both places." },
    { l: 3, q: "\"Cycle done\" lasts 200 ms. NO(I0.2) ADD(MW10,1,MW10) counts…", a: ["every scan while it is on: far too many", "exactly once per part, as it should", "once per second while the signal is on", "nothing, because ADD only works on an edge"], c: 0, why: "Count the rising edge: P(I0.2)." },
    { l: 5, q: "Availability 90 %, performance 80 %, quality 95 %. OEE is about…", a: ["68 %", "90 %", "80 %", "265 %"], c: 0, why: "OEE = A × P × Q = 0.9 × 0.8 × 0.95 = 0.684." },
    { l: 5, q: "Run time 500 s × 100 in a 16-bit INT gives…", a: ["an overflow: 50 000 does not fit (max 32 767)", "exactly 50 000, as the INT range is large enough", "5 000, because INT drops the last digit", "an error in the HMI only, the PLC is fine"], c: 0, why: "Use a 32-bit DINT / MD." },
    { l: 6, q: "Why must the output to a proportional valve ramp?", a: ["a jump in flow gives a pressure peak and a shock", "the valve cannot follow fast changes in its analog value", "a ramp saves oil and keeps the tank level", "it does not have to, a jump is quite safe"], c: 0, why: "Oil does not compress, so a jump gives a shock." },
    { l: 6, q: "P control positioning: speed = error × gain. Near the target the speed…", a: ["gets smaller and smaller", "stays at full speed to the end", "reverses direction", "is zero from the start"], c: 0, why: "The error gets small, so the speed gets small. That is why it does not overshoot." },
    { l: 3, q: "A heating window from 05:30 to 18:00 in minutes since midnight is…", a: ["t >= 330 AND t < 1080", "t >= 5.30 AND t < 18.00", "t > 530 AND t < 1800", "t >= 330 OR t < 1080"], c: 0, why: "Minutes = hour × 60 + minute: 5×60+30 = 330, 18×60 = 1080." },
    { l: 3, q: "\"Minute = 0 and hour = 6\" is true for a whole minute. To ring a bell for 3 s you use…", a: ["a TP (or an edge) started by the condition", "a coil driven directly by the condition", "a 3 s TON timer with the condition on its input", "a counter that counts the condition up"], c: 0, why: "One pulse per event." },
    { l: 4, q: "A soft starter: when do you close the bypass contactor?", a: ["at \"top of ramp\", when the motor is at full speed", "at START, so the soft starter can begin its ramp up", "right after STOP, to brake the motor quickly", "never, it is only used for maintenance work"], c: 0, why: "Closing it earlier is a direct-on-line start." },
    { l: 4, q: "Which starter can change the motor speed during operation?", a: ["VFD (inverter drive)", "soft starter", "star-delta starter", "direct-on-line starter"], c: 0, why: "Only a drive changes the frequency, and so the speed." },
    { l: 4, q: "A motor is started direct on line. About how much current does it take at the first moment?", a: ["6 to 8 times its rated current", "1 to 2 times its rated current", "Exactly its rated current, 1 ×", "Half of its rated current"], c: 0, why: "At standstill the motor is almost a short circuit. The current falls only when it is near full speed." },
    { l: 4, q: "The voltage at the motor is cut to half during the start. What happens to the torque?", a: ["It falls to one quarter", "It falls to about one half", "It stays almost the same", "It doubles for a short time"], c: 0, why: "Torque goes with the square of the voltage. This is why reduced-voltage starters are weak at the start." },
    { l: 4, q: "In a star-delta starter with a PLC, what does the ladder program do?", a: ["It decides when each contactor closes", "It lowers the motor current by itself", "It carries the motor current in star", "It replaces the overload relay fully"], c: 0, why: "The star connection lowers the current. The program only does the sequence and the timing." },
    { l: 4, q: "Why is the star / delta interlock also wired with NC contacts, when the PLC already has it in the program?", a: ["A welded contact or PLC fault can still close both", "The PLC outputs are too weak to drive the two coils alone", "The wiring makes the changeover a little bit faster", "A program interlock is not allowed by the PLC standard"], c: 0, why: "The hardware interlock works without the program and reacts to the real contactor, not to the command." },
    { l: 4, q: "Which old starting method gives a HIGH torque with a LOW current?", a: ["Rotor resistance on a slip-ring motor", "Stator resistance in the three line wires", "Star-delta with a long star time set", "Autotransformer on the 50 % tap"], c: 0, why: "Resistance in the rotor moves the torque peak to standstill. All stator-side methods lose torque with the voltage." },
    { l: 4, q: "A stator resistance starter: KM1 closes, the timer runs, but the bypass KM2 never closes. What happens?", a: ["The start resistors overheat", "The motor runs faster than rated", "The breaker trips at once", "The motor changes its direction"], c: 0, why: "The resistors are made for a few seconds only. Feedback monitoring in the PLC stops the motor in time." },
    { l: 4, q: "In a rotor resistance starter, what is the right order?", a: ["Line contactor first, then step by step", "All step contactors first, then the line", "Line and all steps closed together", "The last step first, then back to the first"], c: 0, why: "The motor must start with all resistance in. Each step is bridged only after the speed has risen." },
    { l: 4, q: "The PLC commands a contactor, but its auxiliary contact does not come back within 1 s. What should the program do?", a: ["Stop the starter and raise an alarm", "Wait one more minute, then try again", "Ignore it and go on with the start", "Switch the PLC itself to STOP"], c: 0, why: "Command without feedback means a broken coil, wire or contactor. Going on can burn resistors or a transformer." },
    { l: 4, q: "An NPN sensor is wired to a sinking input card. The sensor LED lights, but the input stays 0. Why?", a: ["0 V is on both sides of the input", "The sensor gives too much current", "The input card is in STOP mode", "+24 V is on both sides of the input"], c: 0, why: "An NPN sensor switches 0 V, and the common of a sinking card is 0 V too. No voltage difference, no current." },
    { l: 4, q: "A PNP transistor output drives a lamp. Where does the other end of the lamp go?", a: ["To 0 V", "To +24 V", "To the next output", "To the input common"], c: 0, why: "A PNP output gives +24 V. The loop closes through the load to 0 V." },
    { l: 4, q: "Which output card can switch a 230 V AC lamp?", a: ["A relay output or a triac output", "A PNP transistor output only", "An NPN transistor output only", "Any card: the voltage does not matter"], c: 0, why: "Transistor outputs are for 24 V DC. Relay contacts and triacs can switch AC." },
    { l: 4, q: "A 2-wire sensor is off, but the input still reads 1. What helps?", a: ["A bleeder resistor from input to 0 V", "A flyback diode across the sensor wires", "A bigger fuse in the sensor supply", "A longer cable to the input card"], c: 0, why: "The sensor leaks about 1.5 mA when off. The resistor takes this current around the input." },
    { l: 4, q: "The PLC must switch a 10 A heater. The output card gives 2 A at most. What do you do?", a: ["Let the output switch a contactor", "Wire two outputs in parallel instead", "Use a thicker wire to the heater", "Pulse the output very quickly"], c: 0, why: "An interposing contactor: the PLC switches 0.1 A, the contactor switches the 10 A from its own fuse." },
    { l: 6, q: "On an HMI, which button type is right for START?", a: ["Momentary: 1 only while pressed", "Set: becomes 1 and then stays 1", "Toggle: flips at each new touch", "Any type: the PLC sorts it out"], c: 0, why: "A bit that stays 1 can restart the machine by itself after a stop or a power cut." },
    { l: 6, q: "The \"pump running\" lamp on the HMI should be linked to which tag?", a: ["The pump output of the PLC", "The START button bit of the HMI", "The STOP button bit", "The alarm bit of the pump"], c: 0, why: "The lamp must show what the pump really does, not what the operator asked for." },
    { l: 6, q: "Why do good HMI screens use a grey background?", a: ["So alarms in colour stand out", "So the screen uses less power", "So the panel is cheaper to make", "So the screen refreshes faster"], c: 0, why: "If everything is colourful, the eye does not find the one red alarm. Colour is kept for abnormal states." },
    { l: 5, q: "Which bits are 1 in the hex number 16#000A?", a: ["Bits 1 and 3", "Bits 0 and 2", "Bits 2 and 4", "Bits 1 and 2"], c: 0, why: "A is 10 = 8 + 2 = binary 1010. Counting from 0 on the right: bit 1 and bit 3." },
    { l: 5, q: "MW10 holds 16#12AB. What is the result of WAND(MW10,16#00FF,MW12)?", a: ["16#00AB", "16#1200", "16#12FF", "16#FFAB"], c: 0, why: "AND keeps only the bits where the mask has a 1: here the low byte." },
    { l: 5, q: "You want to switch bit 7 of a word on and leave the other bits as they are. Which operation?", a: ["OR with 16#0080", "AND with 16#0080", "XOR with 16#FF7F", "AND with 16#FF7F"], c: 0, why: "OR sets the bits that are 1 in the mask and does not touch the others." },
    { l: 5, q: "A PROFIdrive drive gets 16#047F from the first PLC scan and does not start. Why?", a: ["It must first see the ON bit as 0", "The word is too big for this drive", "Bit 10 must be 0 to start", "It needs 16#FFFF to start"], c: 0, why: "The drive needs 16#047E first, then 16#047F: an edge on bit 0. It must not start by itself at power-up." },
    { l: 5, q: "A thumbwheel shows 1234 in BCD. What do you read if you take the word as a normal number?", a: ["4660", "1234", "4321", "0"], c: 0, why: "BCD 1234 is the bit pattern 16#1234, and 16#1234 as a number is 4660. Convert with BCD_I." },
    { l: 6, q: "NORM_X(0,AIW0,27648,MR0) and AIW0 is 13824. What is in MR0?", a: ["0.5", "50.0", "13824.0", "2.0"], c: 0, why: "NORM_X answers where the value is between min and max, as 0.0 … 1.0. Half-way is 0.5." },
    { l: 6, q: "MR0 is 2.9. What does TRUNC(MR0,MW0) write?", a: ["2", "3", "2.9", "29"], c: 0, why: "TRUNC cuts the decimals off. ROUND would give 3." },
    { l: 6, q: "Why should you not test a REAL with \"equal\"?", a: ["Tiny rounding errors make it miss", "REAL numbers cannot be compared at all", "The PLC stops with a type error", "Equal is slower than less-than"], c: 0, why: "0.1 added ten times is 1.0000001 in floating point, not 1.0. Use limits or a window." },
    { l: 5, q: "The PLC cycle time is 40 ms. A sensor gives a pulse of 5 ms. What will the main program see?", a: ["Sometimes the pulse, mostly nothing", "Every single pulse, only a little bit late", "Every pulse, but twice each", "A pulse of exactly 40 ms"], c: 0, why: "The inputs are read once per cycle. A 5 ms pulse is seen only if it happens to be there at that moment." },
    { l: 5, q: "Where should a PID block be called?", a: ["In a periodic task with a fixed time", "In the main program, on every single cycle", "In a hardware interrupt of a sensor", "In the startup code, one time only"], c: 0, why: "PID maths uses the time between calls. Only a periodic task makes that time exact." },
    { l: 5, q: "A program has a loop that waits until a sensor comes on. The sensor is broken. What happens?", a: ["The watchdog stops the CPU", "The loop ends after ten tries", "The CPU skips that one rung", "The sensor input is forced on"], c: 0, why: "The cycle never ends, the cycle time limit is passed, and the CPU goes to STOP with all outputs off." },
    { l: 5, q: "What does an interrupt do to the main program?", a: ["It pauses it, runs, then lets it go on", "It ends it and then starts a whole new cycle", "It waits until the cycle has ended", "It runs beside it on a second CPU"], c: 0, why: "A higher priority program takes the CPU at once. The main program continues where it stopped." },
    { l: 5, q: "In the risk graph, what do S, F and P stand for?", a: ["Severity, frequency, possibility to avoid", "Safety, function and the performance level", "Speed, force, position of the hazard", "Sensor, feedback, power contactor"], c: 0, why: "How bad is the injury, how often is someone there, and can the person avoid it." },
    { l: 5, q: "Serious injury, operator there often, no chance to avoid it. Which performance level is required?", a: ["PL e", "PL c", "PL a", "PL b"], c: 0, why: "S2, F2, P2 is the worst path of the graph: the highest level, e." },
    { l: 5, q: "What is the main difference between a Category 1 and a Category 3 safety circuit?", a: ["Category 3 has two channels", "Category 3 uses a normal PLC", "Category 3 needs no E-stop", "Category 3 works without power"], c: 0, why: "With two channels a single fault does not stop the safety function. Category 1 has one well-tried channel." },
    { l: 5, q: "What is a stop category 1?", a: ["A controlled stop, then power off", "Power off at once, the motor coasts", "A controlled stop, power stays on", "A stop by the operator's stop button"], c: 0, why: "Category 0 cuts power at once. Category 1 brakes first. Category 2 keeps the power on at standstill." },
    { l: 5, q: "What do you set first in a new drive?", a: ["The motor data from the nameplate", "The colours of the keypad display", "The address of the PLC network", "The password for the parameters"], c: 0, why: "Voltage, current, frequency and speed. Everything else in the drive is calculated from them." },
    { l: 5, q: "A drive trips with 'overvoltage' every time a heavy fan stops. What helps?", a: ["A longer ramp-down time", "A shorter ramp-down time", "A higher maximum frequency", "A lower motor rated current"], c: 0, why: "The fan drives the motor, which feeds energy back. A longer ramp or a braking resistor solves it." },
    { l: 5, q: "The rated current in the drive is set much higher than on the motor nameplate. What is the risk?", a: ["The motor is not protected and can burn", "The drive trips at every single start", "The motor now turns in the wrong direction", "The motor runs faster than its limit"], c: 0, why: "The drive's motor protection works from this value. Too high means it never trips for this motor." },
    { l: 6, q: "In PackML, upstream runs out of product. Which state is right for your machine?", a: ["Suspended", "Held by an operator", "Aborted", "Complete"], c: 0, why: "Suspended means: I am fine, the reason is outside. Held means the reason is inside this machine." },
    { l: 6, q: "What is special about PackML states that end in -ing?", a: ["They finish by themselves", "They need an operator command", "They can only be left by Abort", "They are used only in manual mode"], c: 0, why: "Acting states do a job and then move on when it is complete. Waiting states need a command." },
    { l: 6, q: "After an Abort, what must happen before the machine can produce again?", a: ["Clear, then Reset, then Start", "Start, then Clear, then Reset", "Unhold, then Start again", "Only Start: Abort resets itself"], c: 0, why: "Aborted → Clear → Stopped → Reset → Idle → Start. A person must confirm that the fault is gone." },
    { l: 5, q: "On a P&ID, what is LIC-101?", a: ["A level controller in loop 101", "A level switch, very low", "A flow transmitter, loop 101", "A light for an alarm, number 101"], c: 0, why: "L = level, I = indicating, C = controller. It is usually a PID in the PLC, shown on the HMI." },
    { l: 5, q: "A cause and effect matrix has three X in the column 'Stop pump'. What does the rung look like?", a: ["Three conditions in parallel stop the pump", "Three conditions in series stop the pump motor", "Three pumps are stopped by one condition", "Three timers start one after the other"], c: 0, why: "Each X is one cause for that effect. Any one of them must stop the pump: OR." },
    { l: 5, q: "What is the last step of lock-out before you start to work?", a: ["Prove it is dead: try to start, measure", "Tell the operator the work is done", "Take the padlock off the main switch again", "Press the E-stop two more times"], c: 0, why: "Never trust the switch alone. Try a start and measure with a tester you have just checked." },
    { l: 5, q: "Why is an E-stop not enough for repair work?", a: ["It stops the machine but does not isolate energy", "It only works while the PLC is still in RUN mode", "It is too far away from most machine parts", "It wears out when it is pressed too often"], c: 0, why: "Someone can release it, and stored air, oil or a raised load are still there. Only isolation with a padlock is safe." },
    { l: 7, q: "What is a STRUCT (UDT) for?", a: ["To keep the data of one device together", "To make a program run a great deal faster", "To give a step number a clear name", "To call a block at a fixed time"], c: 0, why: "Start, feedback, fault and hours of a motor under one name, and the same type for every motor." },
    { l: 7, q: "What is the difference between a function and a function block?", a: ["A function block keeps its values between calls", "A function block can only be called one time", "A function can use timers, a block cannot", "A function is written in ladder, a block only in ST"], c: 0, why: "A function has no memory: same inputs, same result. A function block has an instance with its own data." },
    { l: 6, q: "In a PLC to robot handshake, what does the PLC do when it sees DONE?", a: ["It takes START away", "It sets START again", "It changes the job number", "It switches the robot off"], c: 0, why: "START off tells the robot that DONE was seen. The robot then drops DONE and is ready for the next job." },
    { l: 6, q: "When may the machine door close in a robot cell?", a: ["When the robot reports CLEAR", "When the robot reports BUSY", "As soon as START is given", "When the part is at the infeed"], c: 0, why: "CLEAR means the arm is outside the machine. Without it the door would hit the arm." },
    { l: 6, q: "Why set the job number before START, and not at the same time?", a: ["The robot reads the number when START comes", "The robot needs the number just to switch on", "The PLC can only write one bit per scan", "The job number is a safety signal"], c: 0, why: "If both change together the robot may read an old or half-changed number and run the wrong job." },
    { l: 5, q: "A motor coil is ON. Then the program jumps over that rung on every scan. What does the motor do?", a: ["It stays ON", "It goes OFF at once", "It blinks with the scan", "It goes OFF after one scan"], c: 0, why: "Rungs that are jumped over are not scanned, so their outputs keep the last state." },
    { l: 5, q: "An MCR zone is switched off. Inside it are a normal coil and a latched (SET) bit, both ON. What happens?", a: ["The coil goes off, the latched bit stays", "Both of them go off at exactly the same time", "Both of them stay on, just like they were before", "The latched bit goes off, the normal coil stays on"], c: 0, why: "The rungs are solved as false. A false rung drops a normal coil but does not run a SET or a RESET." },
    { l: 5, q: "Three parts are loaded into a FIFO: 1, 2, 3. Which one comes out first?", a: ["Part 1", "Part 3", "Part 2", "None: it is full"], c: 0, why: "First in, first out: the oldest value leaves first. A LIFO would give part 3." },
    { l: 5, q: "What should the program check before it loads a value into a queue?", a: ["That the queue is not FULL", "That the queue is completely EMPTY", "That the last value was a good part", "That the PLC is in the first scan"], c: 0, why: "A load into a full queue is lost, and all later results are shifted to the wrong part." },
    { l: 5, q: "What is a sequencer (SQO, drum)?", a: ["A table of output patterns with a pointer", "A timer block that counts all the machine cycles", "A list that holds the last twenty alarms of a line", "A block that sorts a table of numbers by their size"], c: 0, why: "Each pulse moves the pointer one row and copies that row to the outputs." },
    { l: 5, q: "On a safety relay only the power LED is on. What is the most likely reason?", a: ["An E-stop or a door is open", "The relay itself is broken and must be changed", "The motor has an overload and has tripped", "The PLC program has stopped the relay"], c: 0, why: "Power on and both input LEDs off means the two channels are open: a device is operated." },
    { l: 5, q: "Why are the NC contacts of the two contactors wired into the start circuit of a safety relay?", a: ["A welded contactor then blocks the next start", "So the contactors pull in a little bit faster", "So the relay can switch a much bigger motor", "So the reset button needs less current to work"], c: 0, why: "This is the feedback loop. A contactor that did not drop keeps its NC contact open, and the relay cannot be reset." },
    { l: 5, q: "A two-channel E-stop has one welded contact. What does the safety relay do?", a: ["It stops, then refuses to restart", "It does not notice anything and keeps running as before", "It stops only after the reset button is pressed twice", "It switches to automatic start to save the machine"], c: 0, why: "The second channel still opens, so the machine stops. The relay then sees that one channel never opened and blocks the restart." },
    { l: 5, q: "What does a monitored reset (monitored start) need?", a: ["A new press of the reset button", "The reset button held down all the time", "A reset signal from the E-stop itself", "No button: the relay starts by itself"], c: 0, why: "The relay looks for a change of the button signal. A button that is stuck or bridged does not start the machine." },
  ];
  LL.QUIZ_IV = [
    { t: "Programming", q: "What is the difference between an FC and an FB?", a: ["An FC has no memory of its own; an FB keeps static data in an instance for every call", "An FC is written in ladder and an FB only in Structured Text", "An FB runs faster because it has no parameters", "An FC can call blocks; an FB cannot"], c: 0, why: "FC: same inputs, same outputs, only temporary variables. FB: static variables, timers and edges live in its instance." },
    { t: "Programming", q: "You need a block for a motor with a start/stop latch and a feedback timeout. FC or FB?", a: ["FC, because it is called many times", "FB: the latch and the timer must remember their state between scans", "Either: memory does not matter in blocks", "Neither: latches cannot be in blocks"], c: 1, why: "Anything that remembers (latch, timer, edge, counter) needs the static memory of an FB instance." },
    { t: "Programming", q: "Two motors use the same FB, and starting one also starts the other. The most likely reason?", a: ["The PLC scan is too slow", "The block uses a global M bit, or both calls share one instance", "The FB needs an IN_OUT parameter", "FBs cannot run two motors"], c: 1, why: "Memory inside an FB must be #static (one per instance), and every call needs its own instance." },
    { t: "Programming", q: "What is an instance DB (instance data)?", a: ["The memory of one call of an FB: its parameters and static variables", "A list of all blocks in the project", "The temporary variables of an FC", "A backup of the PLC program"], c: 0, why: "Each FB call gets its own instance; that is how one block can run ten motors independently." },
    { t: "Programming", q: "What are IN, OUT and IN_OUT parameters?", a: ["IN is read by the block, OUT written by it, IN_OUT read and written", "IN are digital, OUT analog, IN_OUT both", "IN run first, OUT last, IN_OUT in between", "They are only comments for the reader"], c: 0, why: "The interface says what flows in and out; IN_OUT passes something the block changes." },
    { t: "Programming", q: "What does IEC 61131-3 define?", a: ["The PLC languages (LD, FBD, ST, SFC) and program units like FUNCTION and FUNCTION_BLOCK", "The colours of push buttons", "The safety level of a machine", "The wire colours in a cabinet"], c: 0, why: "Part 3 of IEC 61131 is the programming part, followed by all big PLC brands." },
    { t: "Programming", q: "Name one standard for machine safety and what it measures.", a: ["ISO 13849-1: the Performance Level (PL a to e) of a safety function", "IEC 61131-3: the safety level of a PLC program", "IEC 60617: the safety level of a symbol", "ISA-95: the safety of a network"], c: 0, why: "ISO 13849-1 gives PL a–e; IEC 62061 does the same job with SIL 1–3." },
    { t: "Basics", q: "Explain the PLC scan cycle.", a: ["Read all inputs into the image, run the program top to bottom, write the outputs", "React to each input the moment it changes, one rung at a time, with no fixed order", "Write the outputs first, then read the inputs, then run the program from the bottom", "Run every rung at the same time, and update an output as soon as its rung is done"], c: 0, why: "Inputs are frozen for the whole scan; outputs change only at the end. That is why the order of rungs matters." },
    { t: "Basics", q: "Why is a STOP push button wired with an NC contact?", a: ["A broken wire or a failed contact then stops the machine", "NC buttons are cheaper and last longer than NO buttons", "The PLC input card can read only NC contacts, not NO ones", "So the red stop lamp lights up while the machine runs"], c: 0, why: "Fail-safe: a broken stop circuit must look like \"stop pressed\". In the program you then use a NO (examine-if-closed) contact." },
    { t: "Basics", q: "A PNP (sourcing) sensor gives +24 V when active. Which input card does it need?", a: ["A sinking input card (current flows into the input to 0 V)", "A sourcing input card (the card also gives out +24 V)", "Any digital card: the polarity of DC signals does not matter", "An analog 0–10 V input card, because the sensor gives a voltage"], c: 0, why: "Sourcing device → sinking input. PNP sensors are the standard in Europe, NPN in parts of Asia." },
    { t: "Basics", q: "What does \"retentive\" mean for a memory bit or counter?", a: ["It keeps its value through a power cycle or a STOP → RUN", "It is reset to zero at the start of every single scan cycle", "It can only be written by the HMI, never by the program", "It is read-only, so the program cannot change it at all"], c: 0, why: "Counters, totals and machine states often must survive a power cut: put them in retentive memory." },
    { t: "Basics", q: "What is the first-scan bit used for?", a: ["To set start values once at start-up (setpoints, reset steps)", "To count how many scans the CPU has done since power-on", "To detect a hardware fault on an input card at any time", "To make a 1 Hz clock pulse for all flashing lamps and alarm lights"], c: 0, why: "Siemens: OB100 or the first-scan flag; Rockwell: S:FS; CODESYS: an INIT flag." },
    { t: "Basics", q: "An input pulse is 5 ms long and the scan time is 20 ms. What can happen?", a: ["The PLC can miss the pulse completely", "Nothing: the PLC always sees every pulse", "The PLC sees the same pulse four times", "The CPU stops with a cycle time fault"], c: 0, why: "Inputs are read once per scan. Use a high-speed counter, an interrupt input or a pulse-stretching input card." },
    { t: "Basics", q: "What is the CPU watchdog (maximum cycle time)?", a: ["If one scan takes too long, the CPU goes to STOP or calls an error routine", "A function that restarts the HMI when its screen stops updating", "A check of the backup battery that the CPU runs once every hour", "A timer that switches all outputs off after one full hour with no input change"], c: 0, why: "A program stuck in a loop must not freeze the outputs. Siemens calls OB80, Rockwell raises a major fault." },
    { t: "Basics", q: "PLC or DCS: what is the usual difference?", a: ["PLC: machines and fast logic. DCS: one integrated system for a big process plant", "A DCS is just a small PLC, used for a single motor or a single valve on a machine", "A PLC cannot do any analog control, so every analog loop needs a DCS", "There is no difference: the two names mean exactly the same product"], c: 0, why: "The line is blurred today, but that is the classic answer: machines → PLC, refinery or power plant → DCS." },
    { t: "Basics", q: "HMI or SCADA?", a: ["HMI: the operator panel of one machine. SCADA: supervision of a whole site", "They are the same thing: two names for one operator panel on a machine", "SCADA is a PLC programming language; HMI is the screen that shows it", "HMI runs inside the PLC CPU; SCADA runs inside each sensor all over the site"], c: 0, why: "SCADA examples: WinCC, Ignition, FactoryTalk View SE, AVEVA." },
    { t: "Basics", q: "Download or upload?", a: ["Download: PC to PLC. Upload: PLC to PC", "Upload: PC to PLC. Download: PLC to PC", "Both mean: copy the project to the PLC", "Download wipes the PLC; upload restores it"], c: 0, why: "Always compare online and offline before a download, so you do not overwrite someone's changes." },
    { t: "Basics", q: "Siemens organisation blocks: what are OB1, OB100 and OB35?", a: ["OB1 main cycle, OB100 start-up, OB35 cyclic interrupt", "OB1 start-up, OB100 main cycle, OB35 error handling", "OB1, OB100 and OB35 are three timers with a fixed time base", "They are data blocks that store the machine settings"], c: 0, why: "Rockwell uses tasks instead: continuous, periodic and event tasks." },
    { t: "Programming", q: "The same coil is written in two rungs. What happens?", a: ["Only the last rung decides; the first rung has no effect", "The output is ON if either of the two rungs is true", "The PLC refuses to go to RUN and shows a compile error", "The output flickers at random between the ON and OFF states"], c: 0, why: "Each rung overwrites the output image; the last one wins at the real output. Rungs between the two coils still see the first result. Use one coil and OR the conditions, or SET / RESET." },
    { t: "Programming", q: "What is a seal-in (latching) circuit?", a: ["START in parallel with a contact of the output, in series with STOP", "A timer that holds the output on for a fixed time after START", "A safety relay that keeps the motor on when the PLC fails", "START in series with STOP, and an NC contact of the output in parallel"], c: 0, why: "The most asked interview question. Draw it, and explain why STOP is NC in the field and NO in the program." },
    { t: "Programming", q: "SET and RESET of the same bit are both true in one scan. Which wins?", a: ["The one in the later rung (in a flip-flop box it depends on the box and the brand)", "Always SET, because a SET instruction always has the higher priority in a PLC", "Always RESET, in every PLC brand and in every type of block", "The PLC goes to STOP with a fault because of the conflict"], c: 0, why: "Order of execution decides. For a STOP you want reset dominant." },
    { t: "Programming", q: "Why use a one-shot (edge, P / ONS) contact?", a: ["To act once per change, e.g. count a part, not every scan while on", "To make a short signal longer, so the PLC cannot miss it", "To delay a signal, so other rungs see it a few seconds later", "To invert a signal, so the contact is true while the input is switched off"], c: 0, why: "Without the edge an ADD runs in every scan the button is held." },
    { t: "Programming", q: "Function (FC) or function block (FB)?", a: ["An FB has its own memory (instance data) kept between calls; an FC has none", "An FC has its own memory kept between calls; an FB has no memory of its own at all", "An FC always runs faster, and an FB cannot have any inputs or outputs", "They are identical; FB is only the older name used in Step 7 projects"], c: 0, why: "Anything with timers, edges or states inside → FB with an instance per use." },
    { t: "Programming", q: "INT is 16 bits signed. Its range is…", a: ["−32 768 … +32 767", "−32 767 … +32 768", "−16 384 … +16 383", "−65 536 … +65 535"], c: 0, why: "DINT is 32 bits (±2.1 billion), REAL is 32-bit floating point with about 7 significant digits." },
    { t: "Programming", q: "Why is a state machine (step sequence) better than many latches for a sequence?", a: ["One step is active at a time, so the state is always known and easy to debug", "It uses much less memory, so the PLC can hold a bigger program", "It makes the scan much faster, because only one rung is executed in each scan", "Latches are not allowed by IEC 61131-3, so a sequence must use steps"], c: 0, why: "Step number in a word or one bit per step with SET / RESET; transitions and outputs in separate rungs." },
    { t: "Programming", q: "How do you make two motors (forward / reverse) never run together?", a: ["In the program AND in hardware (NC auxiliary contacts of the contactors)", "Only in the program: an NC contact of the other output is enough", "Only with a timer, so one contactor waits before the other starts", "Only with a fast fuse that blows if both contactors are switched on together"], c: 0, why: "The program cannot see a welded contactor: the hardware interlock is needed too." },
    { t: "Programming", q: "What is debouncing?", a: ["Ignoring contact chatter: the signal must be stable for some ms", "Making a slow signal faster, so the PLC can see short pulses", "Counting how many times a contact bounces, to find worn parts", "Turning a digital signal into an analog value, inside the sensor itself"], c: 0, why: "A TON of 20–50 ms on mechanical contacts, or the input filter of the card." },
    { t: "Programming", q: "Why should a sequence step have a timeout?", a: ["So a missing sensor (jam, broken sensor) gives an alarm, not an endless wait", "To make each step faster, because the timer pushes the machine on", "Because the PLC goes to STOP if a step has no timer in it at all", "So the machine jumps to the next step anyway when the sensor does not come on"], c: 0, why: "Watchdog per step: the alarm text tells the maintenance man which sensor did not come." },
    { t: "Programming", q: "Name the five IEC 61131-3 languages.", a: ["LD, FBD, ST, SFC and IL (IL is now obsolete)", "LD, FBD, ST, C++ and Python (Python is the newest)", "LD, Basic, Pascal, FBD and Assembler", "LD, FBD, ST, SFC and C (C is for fast code)"], c: 0, why: "Many jobs ask: ladder for discrete logic, ST for maths, data and algorithms, SFC for sequences." },
    { t: "Programming", q: "Indirect addressing (an array with an index) is used for…", a: ["Recipes, tables, FIFOs: one piece of code works on element i", "Making timers run faster by giving each one an index number", "Safety functions, because the CPU checks an index value twice", "Drawing wiring diagrams that show which card each wire uses"], c: 0, why: "Always check the index range first: out of range stops many PLCs." },
    { t: "Timers & counters", q: "TON, TOF, TP: one sentence each.", a: ["TON: delays ON. TOF: delays OFF. TP: fixed-length pulse from a rising edge", "TON: delays OFF. TOF: delays ON. TP: a pulse that lasts while the input is on", "All three delay the switch-on; they only differ in the time base they use", "They are three counters: count up, count down and count input pulses"], c: 0, why: "Draw the timing diagram if you can: interviewers like it." },
    { t: "Timers & counters", q: "What is special about a retentive timer (RTO / TONR)?", a: ["It keeps its elapsed time when the input goes off; it needs a separate reset", "It resets itself to zero every time the input goes off, just like a normal TON", "It counts down from the preset to zero, instead of counting up from zero", "It only works with the real-time clock and the date of the CPU"], c: 0, why: "Used for \"total running hours\" or a time that may be interrupted." },
    { t: "Timers & counters", q: "A CTU input is held on for 5 s. How much does the counter count?", a: ["1: a counter counts rising edges", "500: it counts once per scan", "5: it counts once per second", "0: it counts only on falling edges"], c: 0, why: "Counters count transitions, unlike an ADD without an edge." },
    { t: "Timers & counters", q: "How do you make a flashing lamp (1 s on, 1 s off) with timers?", a: ["Two TONs that reset each other, or use the system clock bit", "One TON with PT = 1 s, and its Q output drives the lamp directly", "A CTU counter that counts the scans and drives the lamp", "An analog output that sends a sine wave to the lamp"], c: 0, why: "Classic interview task, also with different on / off times." },
    { t: "Timers & counters", q: "Why do you need a high-speed counter for an encoder?", a: ["Pulses come faster than the scan; the HSC counts them in hardware", "Normal counters can only count down, and an encoder needs up", "To save memory, because normal counters use a lot of memory", "Encoders give an analog signal that normal counter instructions cannot read"], c: 0, why: "An encoder at 3000 rpm with 1000 pulses / rev gives 50 kHz." },
    { t: "Analog & PID", q: "Why is 4–20 mA preferred over 0–10 V?", a: ["Less affected by cable and noise, and 0 mA shows a broken wire", "4–20 mA always has a higher resolution than any 0–10 V input card", "A PLC cannot read 0–10 V signals without an external converter", "It uses less power, so the sensor needs no supply at all"], c: 0, why: "Below about 3.6 mA = wire break or sensor fault (NAMUR NE43)." },
    { t: "Analog & PID", q: "A level transmitter 0–5 m gives 4–20 mA, the card reads 0–27648 for 4–20 mA. The raw value is 13824. The level is…", a: ["2.5 m", "1.25 m", "3.75 m", "5.0 m"], c: 0, why: "13824 / 27648 = 50 % of the span → 2.5 m. Scale: eng = raw × (max − min) / 27648 + min." },
    { t: "Analog & PID", q: "A 12-bit analog input has how many steps?", a: ["4096", "1024", "2048", "65536"], c: 0, why: "2¹² = 4096. 16-bit cards: about 27 648 or 32 000 steps for the nominal range depending on brand." },
    { t: "Analog & PID", q: "PT100 or thermocouple?", a: ["PT100: accurate, up to ~600 °C. Thermocouple: far hotter, needs cold-junction compensation", "PT100: for 1000 °C and more. Thermocouple: more accurate, and it never needs any compensation", "They are the same sensor; only the wire colour and the price are different", "A thermocouple gives 4–20 mA directly; a PT100 gives 0–10 V directly to the card"], c: 0, why: "PT100 = 100 Ω at 0 °C; wired with 3 or 4 wires to cancel the cable resistance (with 2 wires the cable adds an error)." },
    { t: "Analog & PID", q: "In a PID controller, what does the I part do?", a: ["Removes the steady-state error by adding up the error over time", "Reacts to the rate of change of the error, to damp the fast changes", "Sets the gain that multiplies the error at this very moment", "Filters the noise of the measured value before the P part"], c: 0, why: "P alone leaves an offset; I removes it; D damps fast changes but amplifies noise." },
    { t: "Analog & PID", q: "What is integral windup?", a: ["The output is at its limit, but the integral keeps growing, so it overshoots", "A wiring fault: the 4–20 mA loop is wired with the wrong polarity", "The D part grows far too big when the measured value has a lot of noise on it", "The motor slowly turns backwards when the setpoint is set to zero"], c: 0, why: "Anti-windup: stop integrating while the output is limited (built into PID blocks)." },
    { t: "Analog & PID", q: "Where do you ground the shield of an analog cable?", a: ["Usually at one end only (cabinet side), to avoid ground loops", "Always at both ends, so that no noise can enter the cable at any point", "Never: a grounded shield brings noise into the analog signal", "In the middle of the cable, at a terminal box, for balance"], c: 0, why: "Follow the manufacturer. One end avoids ground loops for small analog signals. With good equipotential bonding, both ends protect better against high-frequency noise, and fast networks want both ends." },
    { t: "Analog & PID", q: "When is a simple on/off control (with hysteresis) better than PID?", a: ["When the process is slow and a small swing is fine, e.g. a tank level", "When the value must be held within 0.1 % at all times", "For servo positioning, where the axis must stop exactly", "Never: a PID controller always works better than a simple on/off control"], c: 0, why: "Hysteresis prevents the actuator from switching every second." },
    { t: "Drives & motion", q: "Why use star-delta starting?", a: ["To cut the starting current to about one third (torque also drops)", "To reverse the direction of the motor without needing a second contactor", "To change the motor speed in steps between star and delta", "To brake the motor fast by switching from delta back to star"], c: 0, why: "Typical: star for a few seconds, a short pause, then delta." },
    { t: "Drives & motion", q: "What does a braking resistor do on a VFD?", a: ["Burns the energy fed back when braking, so the DC bus does not trip", "It brakes the motor shaft mechanically, like a spring-applied brake", "It limits the start current of the motor, like a soft starter does", "It filters noise from the motor cable, so the encoder signal is clean"], c: 0, why: "Alternatives: longer ramps, a regenerative unit." },
    { t: "Drives & motion", q: "Control a VFD: hardwired or fieldbus?", a: ["Fieldbus: speed, status and faults on one cable. Hardwired: simple, any brand", "Only hardwired is allowed: a fieldbus is too slow to control a drive", "Only fieldbus is allowed: hardwired signals are not a standard any more", "Hardwired gives fault codes and motor current; fieldbus gives only run and stop"], c: 0, why: "Know the trade-off. The safe stop (STO) is hardwired or goes via a safety protocol." },
    { t: "Drives & motion", q: "Incremental or absolute encoder?", a: ["Absolute knows its position after power-up; incremental needs homing", "Incremental knows its position after power-up; absolute needs homing", "Incremental is always more accurate, so it never needs any homing run", "Absolute encoders need a high-speed counter card to work at all"], c: 0, why: "Multi-turn absolute encoders count revolutions too." },
    { t: "Drives & motion", q: "Servo or stepper?", a: ["Servo: closed loop with encoder feedback. Stepper: open loop, can lose steps", "Stepper: closed loop with encoder feedback. Servo: open loop, it can lose steps", "Servos cannot hold a position when stopped; steppers always can", "They are identical motors; only the drive software is different"], c: 0, why: "Steppers with encoders (\"closed-loop steppers\") exist in between." },
    { t: "Drives & motion", q: "What is homing?", a: ["Moving an axis to a reference switch to set its zero position", "Returning the HMI to the main screen after a time without input", "Resetting a VFD after a fault, so the motor can run again", "Restarting the PLC, so all axes go back to their old values"], c: 0, why: "Needed after power-up for incremental encoders; PLCopen MC_Home." },
    { t: "Drives & motion", q: "Three sensor types: which detects metal only?", a: ["Inductive proximity sensor", "Capacitive proximity sensor", "Photoelectric (light) sensor", "Ultrasonic distance sensor"], c: 0, why: "Capacitive detects almost anything (also liquids through plastic); photoelectric: through-beam, retro-reflective, diffuse." },
    { t: "Safety", q: "Why must an E-stop not rely only on the normal PLC program?", a: ["A normal PLC can fail, be forced or have a bug; safety needs safety-rated parts", "A normal PLC is too slow: its scan takes seconds, and an E-stop needs milliseconds", "E-stop buttons give an analog signal that a normal PLC card cannot read", "It is only a recommendation; the law allows a normal PLC program for it"], c: 0, why: "Standard PLC = control; safety relay / safety PLC = protection." },
    { t: "Safety", q: "Stop categories 0, 1 and 2 (IEC 60204-1)?", a: ["0: power off at once. 1: controlled stop, then power off. 2: stop, power stays on", "They are three speed levels: 0 = slow stop, 1 = medium stop, 2 = fast stop", "0: controlled stop. 1: power off at once. 2: no stop at all, only a warning on the HMI", "All three are allowed for an E-stop, and 2 is the most common choice there"], c: 0, why: "An E-stop must be category 0 or 1. Category 1 is common with drives: ramp down fast, then STO." },
    { t: "Safety", q: "What do PL and SIL stand for?", a: ["Performance Level and Safety Integrity Level: how reliable safety must be", "PLC Language and System Integration Level of a control project", "Power Line and Signal Level of the 24 V control supply inside the cabinet", "Production Line and Speed Index Level: how fast the machine may run"], c: 0, why: "PL a–e (ISO 13849-1), SIL 1–3 for machines (IEC 62061; IEC 61508 itself goes up to SIL 4). A risk assessment decides the required level." },
    { t: "Safety", q: "Why two channels for an E-stop?", a: ["So one welded or shorted contact cannot prevent the stop", "So one E-stop button can stop two machines at the same time", "So the second channel can light the E-stop lamp on the panel", "Because two thin wires are cheaper than one thick wire"], c: 0, why: "The safety relay also checks that both channels open together (discrepancy monitoring)." },
    { t: "Safety", q: "After an E-stop is released, the machine must…", a: ["Stay stopped until a deliberate reset and a new start", "Restart at once from the step where it stopped before", "Restart by itself after 5 s, when the area looks clear", "Go to the home position by itself, then wait for start"], c: 0, why: "No automatic restart: a basic rule in every machine." },
    { t: "Safety", q: "What is STO on a drive?", a: ["Safe Torque Off: the drive safely stops making torque in the motor", "Start Torque Optimisation: extra torque for a heavy start", "Speed Target Output: the speed setpoint that the PLC sends to the drive", "Safe Torque Overload: the drive trips when the torque is too high"], c: 0, why: "STO cuts the motor power without opening the main contactor. It is the basis of most drive safety functions (SS1 = ramp, then STO)." },
    { t: "Safety", q: "What is muting on a light curtain?", a: ["A short bypass, by sensors in a fixed order, so material passes but people cannot", "Switching it off with a key switch during maintenance work in the machine", "Lowering its sensitivity, so small parts and dust do not trip it any more", "Turning off the alarm buzzer that sounds every time the light curtain is interrupted"], c: 0, why: "Muting has a muting lamp and a maximum time." },
    { t: "Troubleshooting", q: "The input LED on the card is ON but the bit in the PLC is 0. What do you check?", a: ["A force on the bit, the address and hardware config, the module status", "The sensor itself: clean it, adjust it or replace it with a brand new one", "The 24 V supply of the sensor and the fuse in front of it", "Replace the CPU, because it does not read the input card any more"], c: 0, why: "LED on = the voltage reaches the card. The problem is between the card and the program." },
    { t: "Troubleshooting", q: "The output bit and LED are ON but the valve does not switch. Next step?", a: ["Measure at the valve terminals, then check fuse, wiring, coil and air supply", "Change the program first, because the output rung must be wrong somewhere", "Replace the CPU at once, because it is not sending the output signal out", "Force the output again a few times, until the valve finally moves"], c: 0, why: "The PLC did its job; the fault is in the field." },
    { t: "Troubleshooting", q: "A machine stops at 3 a.m. and you are called. First thing?", a: ["Read the alarms, ask the operator, make it safe, then diagnose", "Download your latest program, then see if the fault is gone", "Reset everything and restart the machine as fast as you possibly can", "Bypass the sensor in the alarm, so production can continue"], c: 0, why: "Interviewers test whether you jump to changing code or bridge things." },
    { t: "Troubleshooting", q: "An intermittent fault that comes and goes. Good approach?", a: ["Log or trend the signal, count events, check moving cables, noise, heat", "Wait until the fault becomes permanent, because then it is easy to find it", "Replace parts one by one at random, until the fault stops coming", "Add a longer filter timer to every input in the whole program"], c: 0, why: "Trace tools: TIA Trace, Studio 5000 Trends, CODESYS Trace." },
    { t: "Troubleshooting", q: "What are the dangers of forcing an I/O?", a: ["The machine follows the force, not the program, and people can get hurt", "Forcing sends a high current that can damage the I/O card", "Forces are removed by the next scan, so nothing really happens", "There are no dangers, because the program still checks all the safety parts"], c: 0, why: "Forgotten forces also cause strange faults later. Remove all forces when finished; many plants require a permit to force." },
    { t: "Troubleshooting", q: "What is cross-reference in the programming software good for?", a: ["Finding every place a tag is read or written", "Comparing the programs of two different PLCs", "Printing the wiring diagram of each I/O card", "Making a backup copy of the project on the PC"], c: 0, why: "First tool when \"why is this output on?\"." },
    { t: "Troubleshooting", q: "Online edit (change in RUN): what must you think about?", a: ["What it does in the current machine state, and save so online = offline", "Nothing: an online edit is always safe, in any state the machine is in now", "The PLC must be in STOP first, or the edit is never accepted", "Only the HMI: online edits change nothing in the running logic"], c: 0, why: "Rockwell: test edits / accept; Siemens: download in RUN; CODESYS: online change." },
    { t: "Electrical drawings", q: "On a schematic, \"-K3\" is…", a: ["A contactor or relay (letter K)", "A circuit breaker (letter K)", "A motor (letter K, kinetic)", "A key switch on the panel (letter K)"], c: 0, why: "Common letters on drawings: K relay / contactor, Q breaker (new standard IEC 81346: Q for power contactors too), F protection, M motor, B sensor, S switch, H lamp (new standard: P), X terminal, A PLC / module." },
    { t: "Electrical drawings", q: "Next to a contact of -K3 you read \"/5.2\". What does it mean?", a: ["The coil of -K3 is on page 5, column 2", "Wire number 5.2 between -K3 and the PLC", "Terminal 5, pin 2 on the -K3 relay base", "The contact is rated 5.2 A at 24 V DC"], c: 0, why: "Cross-references let you jump between a coil and all its contacts." },
    { t: "Electrical drawings", q: "A sensor -B12 is wired to \"-X2:14\". What is that?", a: ["Terminal 14 on terminal strip -X2", "PLC input 14 on the card in slot 2", "Page 2, column 14 of the drawings", "Core 14 in the cable named -X2"], c: 0, why: "Find the terminal plan of -X2 to see what is connected on both sides." },
    { t: "Electrical drawings", q: "On the PLC input page, I0.3 shows a symbol of an NC contact for \"-S2 STOP\". In the program you use…", a: ["A NO contact: the input is 1 while STOP is not pressed", "An NC contact: the input is 1 while STOP is pressed", "An NC contact, because it must match the drawing symbol", "A TON timer, so a short press of STOP is ignored"], c: 0, why: "The drawing shows the device; the program checks the signal." },
    { t: "Electrical drawings", q: "What do \"L+\" and \"M\" mean on a 24 V control page?", a: ["+24 V and 0 V of the control supply", "Line and motor of the main power circuit", "Lamp and meter on the operator panel", "Live and mains earth of the 230 V supply"], c: 0, why: "Other common names: +24V / 0V, L+ / L−, P24 / M." },
    { t: "Electrical drawings", q: "A 3-wire PNP sensor has brown, blue and black wires. Which is the signal?", a: ["Black (brown = +24 V, blue = 0 V)", "Brown (black = +24 V, blue = 0 V)", "Blue (brown = +24 V, black = 0 V)", "Any: the sensor finds the polarity"], c: 0, why: "Standard colours for DC sensors (IEC 60947-5-2). White is often the second output." },
    { t: "Electrical drawings", q: "Where on a drawing set do you find which wire goes into which cable?", a: ["The cable plan (cable list)", "The PLC program and tag list", "The bill of materials only", "The cover page and contents"], c: 0, why: "A drawing set: cover, contents, power pages, control, PLC I/O, terminal plans, cable plans, parts list." },
    { t: "Electrical drawings", q: "The drawing shows contacts in which state?", a: ["De-energised and not operated (machine off, buttons not pressed)", "Energised and running, as in the normal production state of the machine", "In the fault state, so the electrician can see the problem", "In whatever state the drawer chose for that page of the set"], c: 0, why: "That is why an NC contact is drawn closed even though it opens when the machine runs." },
    { t: "Hardware & online", q: "A DI 16 card sits in slot 2 of a ControlLogix (1756) rack. What is the tag of its first input?", a: ["Local:2:I.Data.0", "Local:0:I.Data.2", "Local:2:O.Data.0", "Local:3:I.Data.0"], c: 0, why: "In Studio 5000 the slot is part of the name: Local, slot 2, I = input, Data, bit 0. If you move the card, the name changes, so the program uses alias tags." },
    { t: "Hardware & online", q: "In CODESYS, which bytes are in %IW1?", a: ["Bytes 2 and 3", "Bytes 1 and 2", "Bytes 0 and 1", "Bytes 16 and 17"], c: 0, why: "CODESYS word addresses count words, not bytes: %IW0 = bytes 0 and 1, %IW1 = bytes 2 and 3. Siemens calls the same word IW2." },
    { t: "Hardware & online", q: "Siemens and CODESYS copy all inputs into a process image at the start of the scan. What is different on a Rockwell ControlLogix?", a: ["Its I/O updates on its own timer (RPI), so an input can change during the scan", "Nothing: it also copies all inputs into an image at the start of each scan", "It reads all inputs only once, when the power comes on, and then keeps them fixed", "It reads an input only when a special block in the program asks for it"], c: 0, why: "Logix I/O is not tied to the scan. If a routine needs one stable picture, copy the inputs to internal tags at its start." },
    { t: "Hardware & online", q: "Why do you plan about 10–20 % spare channels on the I/O cards?", a: ["To add a sensor later, or to replace a broken channel, without a new card", "The CPU scans the program faster when some channels on each card are left free", "The power supply needs some free channels on each card so it stays cool", "Free channels make the I/O addresses shorter and easier to read"], c: 0, why: "A spare channel costs little today. A new card later costs a machine stop, cabinet work and new drawings." },
    { t: "Hardware & online", q: "The CPU and cards in a rack need 27 W from the backplane. The power supply gives 25 W. What do you do?", a: ["Use a bigger power supply, or add a second one if the system allows it", "Nothing: 2 W over the limit is not a real problem for a power supply", "Move the CPU to the last slot, at the far end of the rack, to share the load", "Use thicker wires between the sensors and the input cards"], c: 0, why: "If the total is too high, cards can reset or fail at random, often only when the machine is busy. Some systems (S7-1500) take an extra supply for a new power segment; others need a bigger supply or a second rack. The tool or the manual shows the budget." },
    { t: "Hardware & online", q: "PLC: 192.168.0.1, mask 255.255.255.0. Your laptop: 192.168.1.50, same mask. Can you go online?", a: ["No: the laptop is in another subnet (192.168.1)", "Yes: all 192.168 addresses are in one network", "Yes, but only with a special crossover network cable", "Yes, but only when the PLC is in STOP mode"], c: 0, why: "With the mask 255.255.255.0 the first three numbers must be the same, and the last number must be free. Give the laptop an address like 192.168.0.50." },
    { t: "Hardware & online", q: "A new PROFINET remote I/O is wired. The IP address in the project is right, but the PLC reports the device as missing. What is the most likely missing step?", a: ["Assign the device name from the project to the device", "Install the EDS file of the remote I/O module in the tool", "Upload the program from the remote I/O module first", "Change the subnet mask of the PLC to 255.255.0.0"], c: 0, why: "A PROFINET controller finds its IO devices by name, then gives them their IP. A new device from the box has no name." },
    { t: "Hardware & online", q: "You add a drive from another maker to a Siemens PLC on PROFINET. It is not in the hardware catalog. What do you need?", a: ["Its GSDML file from the drive maker, installed in TIA Portal", "Its EDS file from the drive maker, installed in TIA Portal", "A newer CPU type that has a bigger hardware catalog built in", "A PLCSIM licence, so TIA Portal can simulate the new drive"], c: 0, why: "The device description file tells the tool the modules and the data size of the device. EtherNet/IP uses EDS files instead." },
    { t: "Hardware & online", q: "How does an EtherNet/IP scanner (for example a CompactLogix) find its devices?", a: ["By IP address: the same IP is set in the device and in the project", "By device name: it calls each device by its own name, like PROFINET", "By the slot number of the network card in the local PLC rack", "By the serial number that is printed on the label of each device"], c: 0, why: "In EtherNet/IP the IP address is the identity. You set it with a BOOTP/DHCP tool, rotary switches or the web page of the device." },
    { t: "Hardware & online", q: "What is the difference between writing (modifying) a value and forcing it?", a: ["Write changes it once; force holds it until you remove the force", "No difference: both of them hold the value until you remove it again", "Force works only when the PLC is offline or in STOP mode", "Write is allowed only when the PLC is in STOP mode"], c: 0, why: "A force overrides the field and the program. First make sure nobody is in the danger area, and remove every force when you are done." },
    { t: "Hardware & online", q: "Last night someone changed a timer preset in the running PLC. You download your project from yesterday. What happens?", a: ["The change is lost: the PLC now has your old value", "The PLC keeps the new preset and takes all the rest", "The tool merges both versions without asking you", "The PLC refuses the download and shows an error"], c: 0, why: "A download replaces what is in the PLC. Go online and compare first, and copy the change into your project before you download." },
    { t: "Hardware & online", q: "With an online change you delete a rung whose coil drove a valve. The valve was ON. What happens?", a: ["It can stay ON: nothing writes that output any more", "It turns OFF at once, because the coil is now gone", "The PLC goes to STOP and shows an online edit error", "The valve output starts to flash on and off very fast"], c: 0, why: "Deleting a coil does not reset its bit. Switch the output off first (or reset it in the logic), then delete the rung." },
    { t: "Hardware & online", q: "You must change a machine, but nobody can find the project. What do you do first?", a: ["Upload the program from the PLC and save a copy with the date", "Write a new program on the PC and download it at once", "Reset the PLC to factory settings and start again from zero", "Force all outputs off first, and then go and look for the project"], c: 0, why: "The upload is your backup and your starting point. Older PLCs may not store comments and tag names, so you may see only addresses. In CODESYS, an upload works only if the source was stored in the PLC." },
    { t: "Hardware & online", q: "What can a simulator such as PLCSIM, Logix Echo or CODESYS Control Win NOT test?", a: ["The real wiring, sensors and devices of the machine", "The ladder logic and the math in the program", "The timers and counters used in the program code", "The order of the steps in a sequence (SFC or ladder)"], c: 0, why: "A simulator runs your program on the PC. Test the logic there; test the wiring with an I/O check on the real machine." },
    { t: "Fluid power", q: "Single-acting or double-acting cylinder?", a: ["Single: air one way, a spring returns. Double: air in both directions", "Single: air in both directions. Double: air one way, two springs return", "Single-acting is always faster, because it has only one air port", "Double-acting has a return spring on each side of the piston"], c: 0, why: "Valve: 3/2 for single-acting, 5/2 or 5/3 for double-acting." },
    { t: "Fluid power", q: "Monostable or bistable valve: what happens on power loss?", a: ["Monostable goes back to its rest position; bistable stays where it is", "Bistable goes back to its rest position; monostable stays just where it is", "Both go back to their rest positions, because springs push them", "Both stay exactly where they are until the air pressure is gone"], c: 0, why: "Which one is safer depends on the machine: a clamp should usually stay closed." },
    { t: "Fluid power", q: "Hydraulic press waits at the top with the pump running. What should the program do?", a: ["Unload the pump and centre the valves, so no oil goes over the relief valve", "Keep full pressure ready, so the next stroke can start faster", "Switch the pump motor off and on again in every machine cycle", "Keep the up valve on, so the ram stays pressed hard against the top end stop"], c: 0, why: "Oil over the relief valve turns into heat. Hydraulics is not pneumatics: a valve left on at the end stop heats the oil." },
    { t: "Projects & practice", q: "How do you start a new machine program?", a: ["I/O list and specification first, then structure, then code, then test", "Start writing ladder at rung 1, and add the other things as you find them", "Copy an old program of another machine and change the addresses", "Ask the electrician to write the I/O list after the code is done"], c: 0, why: "Interviewers want to hear: understand the process, plan, structure, test." },
    { t: "Projects & practice", q: "What makes a program easy to maintain?", a: ["Clear names and comments, one structure for all stations, clear alarms", "As few rungs as possible, with many tricks packed into each rung", "Using only SET and RESET coils, so every output is easy to find", "Using only Structured Text, because nobody needs to read ladder diagrams now"], c: 0, why: "The night shift electrician must understand it." },
    { t: "Projects & practice", q: "What is FAT and SAT?", a: ["Factory Acceptance Test at the builder, Site Acceptance Test at the customer", "Fast Analog Test and Slow Analog Test of the input cards in the rack", "File Allocation Table and System Address Table inside the PLC CPU", "Final Assembly Test at the customer, and a Safety Audit Test that is required by law"], c: 0, why: "Both follow a written test protocol that the customer signs." },
    { t: "Projects & practice", q: "Why keep backups and version control of PLC programs?", a: ["To restore after a failure and to know who changed what and when", "Because the PLC deletes its program after every power cut or restart", "To make the PLC run faster, because old versions slow it down", "Only for big companies; one small machine needs no backup at all"], c: 0, why: "Tools: Siemens Version Control Interface, Rockwell AssetCentre, Git for exported files, versiondog / Octoplant." },
    { t: "Projects & practice", q: "Which PLC brands and software have you used? A good answer…", a: ["Names what you used and for what job, and shows you learn new brands fast", "Says \"all of them\", so the interviewer cannot find a weak point", "Names only one brand and says you will never use any other one", "Avoids the question and talks about your hobbies and your new car instead"], c: 0, why: "For example: \"TIA Portal on S7-1500 for a packaging line\". The logic is the same everywhere; show the concepts." },
    { t: "Diagnostics", q: "The CPU is in STOP with a red ERROR LED. What do you do first?", a: ["Go online and read the diagnostic buffer, newest first", "Switch the PLC off and on again to clear the error", "Download the last good program from your laptop", "Change the CPU, because a red LED means it is broken"], c: 0, why: "The buffer says what happened and when. A power cycle or a download can hide the cause." },
    { t: "Diagnostics", q: "In the diagnostic buffer the top entry says \"STOP\". Where is the reason?", a: ["In the older entry just under the STOP entry", "In the oldest entry at the very bottom of the list", "Only in the CPU display, not in the buffer", "In the project comments of the main program"], c: 0, why: "The newest entry is at the top. The event that caused the STOP happened just before it, so it is listed just under it." },
    { t: "Diagnostics", q: "An S7-1500 has no OB121. An array index goes out of range. What happens?", a: ["The CPU goes to STOP and writes it into the buffer", "The CPU stays in RUN and uses element 0 instead", "The CPU stays in RUN and only the HMI shows a warning", "The CPU restarts by itself after a few seconds"], c: 0, why: "OB121 is the programming-error OB. Without it (and without local error handling) the S7-1500 goes to STOP." },
    { t: "Diagnostics", q: "A wire breaks on a 4–20 mA input of an S7-1500. OB82 is missing. What happens?", a: ["The CPU stays in RUN; the value goes to 32767", "The CPU goes to STOP at once with a red LED", "Nothing: the value just stays at the last reading", "The card switches itself off and shows nothing"], c: 0, why: "An S7-1500 stays in RUN without OB82 (an old S7-300 would stop). The program must read the value status." },
    { t: "Diagnostics", q: "Why do you add code to OB82 / OB86 (or read the fault bits) instead of leaving it empty?", a: ["To give a clear alarm and make the machine safe", "To make the CPU faster when a module has a fault", "To delete the entry from the diagnostic buffer", "Because an empty OB cannot be downloaded to the CPU"], c: 0, why: "The OB is where the program reacts: alarm, safe state, save information. Empty, it only hides the fault." },
    { t: "Diagnostics", q: "Studio 5000: what is the difference between a major and a minor fault?", a: ["Major stops the program; minor is only logged", "Major is in the hardware; minor is in the program", "Major needs a new controller; minor needs a reset", "There is no difference; both stop the controller"], c: 0, why: "A major fault stops the program (unless a fault routine clears it). A minor fault, like a low battery, only gets logged." },
    { t: "Diagnostics", q: "Studio 5000 shows major fault Type 4 Code 20. What does it mean?", a: ["An array index was outside the array", "The task watchdog time was exceeded", "The battery must be replaced soon", "An I/O module lost its connection"], c: 0, why: "Type 4 = program fault, Code 20 = array subscript too large (or a CONTROL .POS / .LEN is wrong)." },
    { t: "Diagnostics", q: "A CPU goes to STOP: \"maximum cycle time exceeded\". A colleague wants to raise the time to 6 s. Good idea?", a: ["No: find what waits in the scan, usually a loop", "Yes: a longer cycle time is always the safer choice", "Yes: but only if OB80 is also added to the project", "No: lower it to 10 ms so the CPU works harder"], c: 0, why: "An endless loop is endless at 6 s too, and for 6 s no output changes. A PLC never waits inside a scan." },
    { t: "Diagnostics", q: "The MAINT (or FORCE) LED is yellow and the conveyor runs without parts. Likely cause?", a: ["A force is still active on the conveyor output", "The program has an endless loop in the main block", "The output card has a short circuit on channel 3", "The CPU memory card is almost full of programs"], c: 0, why: "A force wins over the program and lights MAINT / FORCE. Remove all forces after a test." },
    { t: "Diagnostics", q: "A remote I/O station is lost. The CPU stays in RUN, but the HMI shows no alarm. What is missing?", a: ["The program does not read the station status", "The CPU should have gone to STOP by itself", "The station needs its own copy of the program", "The HMI must poll the station every second"], c: 0, why: "The program must read the station status (OB86, DeviceStates, GSV EntryStatus, slave state) and give an alarm." },
    { t: "Diagnostics", q: "CODESYS: the application is in state \"Exception\" after an access violation. What is the order?", a: ["Read the log, fix the code, Reset warm, then Start", "Press Start again until the application keeps running", "Reset origin and download a new empty project first", "Add CheckBounds and leave it in to hide the problem"], c: 0, why: "The log names the task and the POU. Fix the cause first; after an exception you need a reset before Start." },
    { t: "Electrical & wiring", q: "A relay coil has 600 Ω and gets 24 V DC. What current does it take?", a: ["40 mA", "4 mA", "400 mA", "14.4 A"], c: 0, why: "Ohm's law: I = U / R = 24 V / 600 Ω = 0.04 A = 40 mA. A PLC output (0.5 A) can drive it easily." },
    { t: "Electrical & wiring", q: "In a working 24 V circuit you measure across a CLOSED contact. What does the meter show?", a: ["About 0 V", "About 24 V", "About 12 V", "OL (open line)"], c: 0, why: "Both sides of a closed contact have the same voltage, so the difference is 0 V. An open contact shows the full 24 V." },
    { t: "Electrical & wiring", q: "With the power ON you measure 24 V across a fuse. What does it mean?", a: ["The fuse is open (blown)", "The fuse is good and closed", "The fuse has a short circuit", "The supply voltage is too high"], c: 0, why: "A good fuse is like a wire: 0 V across it. 24 V across it means it is open, so the load pulls the far side to 0 V." },
    { t: "Electrical & wiring", q: "Why must the power be OFF when you measure resistance (Ω)?", a: ["The circuit voltage spoils the meter's own test current", "Resistance doubles when the circuit has voltage on it", "The Ω mode only works on AC circuits with power off", "The breaker trips when the meter is set to ohms"], c: 0, why: "In Ω mode the meter sends a small current and measures the voltage it causes. Circuit voltage makes the reading wrong and can damage the meter." },
    { t: "Electrical & wiring", q: "A motor nameplate says 230/400 V Δ/Y. Your mains is 3 × 400 V. How do you connect it?", a: ["Star (Y)", "Delta (Δ)", "Either one works", "Star-delta only"], c: 0, why: "Each winding is made for 230 V (the smaller voltage). In star, 400 V mains gives 400 / √3 = 230 V per winding." },
    { t: "Electrical & wiring", q: "A motor nameplate says 400/690 V Δ/Y. Your mains is 3 × 400 V. How do you connect it for normal running?", a: ["Delta (Δ)", "Star (Y)", "Star, with a transformer", "It cannot run on 400 V"], c: 0, why: "Each winding is made for 400 V, the smaller voltage. In delta each winding gets the full 400 V. This motor can also use a star-delta starter." },
    { t: "Electrical & wiring", q: "The plate shows 13.6/7.9 A for 230/400 V. The motor runs in star on 400 V. What do you set the overload relay to?", a: ["7.9 A", "13.6 A", "8.7 A (10 % more)", "10.8 A (the average)"], c: 0, why: "Set it to the rated current of the connection you use: 7.9 A at 400 V. Higher does not protect the motor; lower trips for no reason." },
    { t: "Electrical & wiring", q: "Why is 24 V DC the standard voltage for control circuits?", a: ["Safe to touch, yet strong enough for relays and long wires", "It makes the PLC scan faster than 230 V AC inputs would", "A lower voltage lets thin cables carry more current safely", "It is the only voltage that a PLC CPU can understand"], c: 0, why: "24 V is below the dangerous touch voltage, still switches relays and valves reliably, and every brand uses it." },
    { t: "Electrical & wiring", q: "What does a fuse or a circuit breaker mainly protect?", a: ["The wires, against overcurrent", "People, against electric shock", "The PLC, against wrong programs", "The motor, against overloads"], c: 0, why: "It opens before the wire gets too hot. People are protected by the RCD and earthing; the motor by its overload relay." },
    { t: "Electrical & wiring", q: "What is the job of the flyback diode across a DC relay coil?", a: ["It absorbs the voltage spike when the coil switches off", "It stops the coil from pulling in with the wrong polarity", "It makes the relay switch faster when it turns on", "It limits the coil current to protect the PLC output"], c: 0, why: "A coil that switches off makes a spike of hundreds of volts. The diode lets that energy die away in the coil and protects the contact or PLC output." },
    { t: "Electrical & wiring", q: "Why is the 0 V (M) of a 24 V control circuit often connected to PE?", a: ["An earth fault then blows the fuse instead of hiding", "The PLC needs the earth to read its inputs correctly", "It halves the voltage, so the circuit is safer to touch", "So the PE wire can be used as the 0 V return wire"], c: 0, why: "If a 24 V wire touches the earthed cabinet, the fuse blows at once. Without the link the fault stays hidden until a second fault starts something by itself." },
    { t: "Electrical & wiring", q: "A motor on 400 V mains is connected in star. What voltage does each winding get?", a: ["About 230 V (400 / √3)", "400 V, the full line voltage", "About 690 V (400 × √3)", "200 V (half of the 400 V)"], c: 0, why: "In star each winding sits between one phase and the star point: 400 V / 1.73 ≈ 230 V. In delta it gets the full 400 V." },
    { t: "Motor starting", q: "Why are big motors not started direct on line?", a: ["The high current dips the supply and the torque hits the machine", "The motor would turn in the wrong direction at the very first start", "A direct start needs a more costly contactor than a starter", "The motor cannot reach its full speed without a starter"], c: 0, why: "6–8 × current for seconds, and a hard torque step. Starters reduce one or both." },
    { t: "Motor starting", q: "Why can a star-delta starter not start a loaded conveyor?", a: ["In star the motor has only one third of its torque", "In star the motor turns at only one third of its speed", "The star contactor is too small for a loaded belt", "The changeover time is too short for a heavy load"], c: 0, why: "Each winding gets 58 % voltage in star, and torque goes with voltage squared: one third." },
    { t: "Motor starting", q: "What makes the current peak when star-delta changes over?", a: ["The motor is switched to full voltage below full speed", "The timer relay sends a short pulse into the motor windings", "Star and delta are closed together for a moment", "The overload relay resets during the changeover"], c: 0, why: "If the motor has not reached speed in star, delta starts almost like a direct start. Also, in the short pause between star and delta the motor voltage goes out of step with the mains, which gives a short high peak when delta closes." },
    { t: "Motor starting", q: "Soft starter or VFD: what is the main difference?", a: ["Only the VFD can change the running speed", "Only the soft starter lowers the start current", "Only the soft starter needs a motor cable", "Only the VFD needs an overload protection"], c: 0, why: "A soft starter only changes the voltage during start and stop. A VFD changes the frequency, so it controls speed." },
    { t: "Motor starting", q: "Which parts of a starter stay hardware when a PLC controls it?", a: ["Power circuit, overload contact and interlocks", "Only the timers and the sequence relays of the panel", "Only the start and the stop push button", "Nothing: the PLC replaces all of them"], c: 0, why: "The PLC replaces the sequence and timing relays. Power and protection must work without the program." },
    { t: "Motor starting", q: "An autotransformer starter uses the 65 % tap. How much current does the supply see, compared to a direct start?", a: ["About 42 % (0.65 × 0.65)", "About 65 % (same as the tap)", "About 80 % (a little less)", "About 35 % (100 − 65)"], c: 0, why: "The motor current falls to 65 %, and the transformer reduces it again on the line side: tap squared." },
    { t: "Motor starting", q: "What is a slip-ring motor?", a: ["A motor whose rotor winding is brought out on rings", "A motor with two stator windings for two fixed speeds", "A motor with a brake on the rotor shaft end", "A motor that needs DC on its stator winding"], c: 0, why: "Through the rings you add resistance to the rotor: high starting torque with a low current." },
    { t: "Motor starting", q: "Why does a soft starter usually have a bypass contactor?", a: ["So the thyristors do not heat up while running", "So the motor can also run in the reverse direction", "So the start current becomes even lower", "So the PLC can measure the motor speed"], c: 0, why: "At full speed the bypass carries the current. The electronics are only needed for start and stop." },
    { t: "Motor starting", q: "What does 'closed transition' mean in a starter?", a: ["The motor is never without voltage at the changeover", "Both contactors stay closed for the whole running time", "The panel door must be closed for a start", "The star point stays closed after the start"], c: 0, why: "An open transition leaves the motor for a moment without voltage, and the reconnection makes a peak." },
    { t: "Motor starting", q: "The star contactor is welded closed. The program asks for delta. What saves the panel?", a: ["The NC interlock contact in the delta coil circuit", "The star time that runs in the PLC program rung", "The seal-in contact in the first rung of the run latch", "The green start push button on the panel door"], c: 0, why: "The NC contact follows the real contactor. The program only knows its own command, not a welded contact." },
    { t: "Motor starting", q: "Why does a PLC limit the number of starts per hour?", a: ["Every start heats the motor and the starter", "Every start wears out the PLC output card", "The supply company counts and bills each start", "The timers in the PLC need time to reset"], c: 0, why: "Windings, start resistors, transformers and soft starters need time to cool between starts." },
    { t: "Motor starting", q: "Which method starts a motor with about rated current and full torque?", a: ["A variable frequency drive", "A star-delta starter", "A stator resistance starter", "An autotransformer starter"], c: 0, why: "The drive raises frequency and voltage together, so the motor always works near its normal slip." },
    { t: "Electrical & wiring", q: "Explain sinking and sourcing in one sentence.", a: ["A sourcing device gives current, a sinking device takes it", "A sourcing device uses AC power, a sinking device uses DC only", "A sourcing device is an input, a sinking one an output", "A sourcing device is faster, a sinking one more robust"], c: 0, why: "In every loop one side gives current from +24 V and the other takes it to 0 V. PNP sources, NPN sinks." },
    { t: "Electrical & wiring", q: "The LED of a transistor output is on, but the valve does not switch. What do you measure first?", a: ["The voltage across the valve coil", "The resistance of the output card", "The current in the PLC supply", "The voltage at a spare output"], c: 0, why: "24 V across the coil and no action: the coil is broken. 0 V: a wire, a fuse or the wrong return." },
    { t: "Electrical & wiring", q: "Why not use a relay output for 5000 pulses per second?", a: ["A relay is too slow and wears out fast", "A relay output gives too much current for it", "A relay cannot switch 24 V DC at all", "A relay output needs an AC supply"], c: 0, why: "A relay needs about 10 ms to move and has a limited number of switchings. A transistor switches in microseconds." },
    { t: "Projects & practice", q: "Why should an E-stop never be only a button on the HMI?", a: ["A screen can freeze or lose its connection", "A screen button is too small to find in a hurry", "HMI buttons are slower than real ones", "The HMI cannot write bits to the PLC"], c: 0, why: "Emergency stop must be a hard-wired device in a safety circuit. The HMI may only show its state." },
    { t: "Projects & practice", q: "The HMI loses its connection while the operator holds a jog button. What must the PLC program do?", a: ["Stop the jog when the HMI heartbeat is lost", "Keep the jog running until the HMI comes back", "Switch the CPU to STOP at once", "Ignore it: the bit resets by itself"], c: 0, why: "The last written value stays in the PLC. A heartbeat or a reset of command bits in the PLC prevents a stuck command." },
    { t: "Projects & practice", q: "An operator can type a setpoint on the HMI. Where do you check its limits?", a: ["On the HMI and again in the PLC", "On the HMI only, that is enough", "In the PLC only, never on the HMI", "Nowhere: the operator knows the range"], c: 0, why: "The HMI gives a friendly message. The PLC check protects the machine when the value comes from somewhere else." },
    { t: "Drives & motion", q: "How do you start a drive over PROFINET with the standard telegram?", a: ["Send 16#047E, then 16#047F, with a setpoint", "Send 16#FFFF once, then the setpoint", "Set the start input of the drive to 1", "Send only the setpoint: the drive starts alone"], c: 0, why: "The control word must show the ON bit rising, with the enable bits set. 16#4000 is 100 % speed." },
    { t: "Drives & motion", q: "The drive shows a fault. Which control-word bit acknowledges it?", a: ["Bit 7, with a rising edge", "Bit 0, with a falling edge", "Bit 10, held at one", "Bit 3, with a rising edge"], c: 0, why: "Bit 7 is fault acknowledge. The cause must be gone, and the ON bit must go 0 → 1 again afterwards." },
    { t: "Programming", q: "How do you check whether any of the low four alarm bits of a word is on?", a: ["AND with 16#000F, compare with 0", "OR with 16#000F, compare with 0", "XOR with 16#FFFF, compare with 0", "Shift the word left by four bits"], c: 0, why: "The mask removes the bits you do not care about. If the rest is not zero, at least one alarm is on." },
    { t: "Programming", q: "A status word shows −32768 in the watch table. What happened?", a: ["Only bit 15 is on: view it in hex", "The word has overflowed and is lost", "The device sends a negative speed", "The network cable is plugged wrong"], c: 0, why: "In a signed word bit 15 is the sign. 16#8000 reads as −32768. Bit patterns belong in hex or binary." },
    { t: "Analog & PID", q: "What is the scaling formula from a raw value to engineering units?", a: ["(in − inMin) × outSpan / inSpan + outMin", "(in + inMin) × inSpan / outSpan − outMin", "in × outMax × inMax, then minus outMin", "(in − outMin) / outSpan × inSpan + inMin"], c: 0, why: "First find where the value is in its range, then stretch it to the new range. NORM_X and SCALE_X do these two steps." },
    { t: "Electrical drawings", q: "In a control circuit, where is the seal-in contact of a contactor drawn?", a: ["In parallel with the START button", "In parallel with the STOP button", "In series below the contactor coil", "In series with the overload contact"], c: 0, why: "It bridges START, so the coil stays fed when START is released. STOP stays in series above and can still open the path." },
    { t: "Electrical drawings", q: "Which terminals of the overload relay go in the coil circuit of the contactor?", a: ["95-96, the NC contact", "97-98, the NO contact", "13-14, the NO contact", "A1-A2, the coil ends"], c: 0, why: "95-96 opens when the relay trips and drops the contactor. 97-98 closes and can light a TRIP lamp." },
    { t: "Electrical drawings", q: "How are contacts drawn in a circuit diagram?", a: ["At rest: no voltage, nothing pressed", "As they are while the motor is running", "Always open, to keep it simple", "As they were at the last fault"], c: 0, why: "The diagram shows the de-energized state. NO contacts are drawn open, NC contacts closed." },
    { t: "Electrical & wiring", q: "Two lamps are wired in series between L and N. What happens?", a: ["Each gets about half the voltage", "Both light at full brightness", "The control breaker trips at once", "Only the first lamp lights up"], c: 0, why: "Loads in series share the voltage. Loads belong side by side, each on its own path to N." },
    { t: "Electrical & wiring", q: "Why is a hoist button usually wired without a seal-in?", a: ["It must stop when the button is let go", "A seal-in would make the hoist too fast", "Hoist contactors have no extra contacts", "The limit switches do the seal-in job"], c: 0, why: "This is hold-to-run: the operator's hand is the stop. Used for hoists, jog and setup movements." },
    { t: "Electrical & wiring", q: "A tank pump controlled by one float switch clicks on and off every second. What is missing?", a: ["A second level and a seal-in", "A bigger contactor for the pump", "A flyback diode on the float", "A faster overload relay"], c: 0, why: "Start at the low level, stop at the high level, and hold in between. That gap (hysteresis) gives long, calm runs." },
    { t: "Programming", q: "What is the scan time, and why does it matter?", a: ["The time of one program cycle: shorter signals are missed", "The time the CPU needs to start after power on, in seconds", "The time a timer block needs before its output goes on", "The time between two downloads from the laptop to the PLC"], c: 0, why: "Inputs are read once per cycle and outputs written once per cycle. It limits how fast the PLC can react." },
    { t: "Programming", q: "When do you use a periodic (cyclic interrupt) task?", a: ["For PID, ramps and totals that need a fixed time", "For every rung that has a timer or a counter in it", "For the start and stop logic of all the motors", "For alarms that the operator must acknowledge"], c: 0, why: "Anything that calculates with elapsed time needs a constant call interval." },
    { t: "Programming", q: "An interrupt and the main program both use the same counter value. What is the risk?", a: ["The value changes in the middle of the main program", "The interrupt cannot read a value of the main program", "The CPU needs twice the memory for that one value", "The main program is deleted when the interrupt ends"], c: 0, why: "Copy the value once at the start of the main program and work with the copy." },
    { t: "Safety", q: "How do you find the required performance level of a safety function?", a: ["With the risk graph: severity, frequency, avoidance", "By the price of the safety relay that you plan to buy", "By the number of E-stop buttons on the machine", "By the supply voltage of the machine's motors"], c: 0, why: "ISO 13849-1: three questions lead to PLr a to e. Then you design a circuit that reaches at least that level." },
    { t: "Safety", q: "Why do higher performance levels need two channels?", a: ["One fault alone must not stop the safety function", "Two channels switch the load off twice as fast as one", "One channel cannot carry the motor current", "Two channels make the wiring cheaper to test"], c: 0, why: "With two channels and comparison, a welded contact or a broken wire is found, and the other channel still stops the machine." },
    { t: "Safety", q: "What does diagnostic coverage (DC) describe?", a: ["How many dangerous faults the system notices", "How many sensors one safety relay can read at once", "How long a part works before it fails", "How fast the machine stops after a demand"], c: 0, why: "Feedback contacts and channel comparison raise DC. It is one of the four inputs to the reached PL." },
    { t: "Safety", q: "A drive must brake a heavy saw before the power is cut. Which stop category is that?", a: ["Stop category 1", "Stop category 0", "Stop category 2", "Stop category 3"], c: 0, why: "Category 1: controlled stop, then power removed. Category 0 would let the saw coast for a long time." },
    { t: "Drives & motion", q: "The PLC gives the run signal, but the drive does not start and shows no fault. What do you check first?", a: ["The command source parameter of the drive", "The ramp-up time parameter inside the drive", "The rated speed parameter of the motor", "The colour of the motor cable shield"], c: 0, why: "If the drive still listens to its keypad or the network, a terminal signal does nothing. Then check enable and STO inputs." },
    { t: "Drives & motion", q: "Why can a too short ramp-down trip a drive?", a: ["The motor becomes a generator and raises the DC link", "The motor needs more current to slow down faster", "The mains voltage rises when the motor slows down", "The overload relay cannot follow the quickly falling speed"], c: 0, why: "The load pushes the motor. The energy comes back into the drive and the DC link voltage rises until it trips." },
    { t: "Drives & motion", q: "What is a braking resistor on a drive for?", a: ["It burns the energy that comes back when braking", "It limits the current when the motor is starting", "It protects the motor cable from a short circuit", "It keeps the drive warm when the motor is off"], c: 0, why: "With it the drive can brake a heavy load quickly without an overvoltage fault." },
    { t: "Projects & practice", q: "In PackML, what is the difference between Held and Suspended?", a: ["Held: own problem. Suspended: waiting for the line", "Held: a safety stop. Suspended: a normal stop", "Held: the manual mode. Suspended: the automatic mode", "Held: end of order. Suspended: start of order"], c: 0, why: "It tells the line and the downtime report who caused the stop: this machine, or its neighbours." },
    { t: "Projects & practice", q: "Why do plants ask for PackML on new machines?", a: ["Every machine reports the same states and tags", "Every machine then uses the very same PLC brand", "Every machine then needs no safety system", "Every machine then runs at the same speed"], c: 0, why: "The operators learn one model, and the line control and the reporting system read all machines the same way." },
    { t: "Electrical drawings", q: "What do the letters in the tag FIC-203 mean?", a: ["Flow, indicating, controller, loop 203", "Frequency, input, contactor, panel 203", "Fault, interlock, circuit, drawing 203", "Filter, inlet, cooling, pipe number 203"], c: 0, why: "ISA 5.1: the first letter is the measured variable, the following letters are the functions, the number is the loop." },
    { t: "Electrical drawings", q: "What is a loop diagram used for?", a: ["To follow one signal from the field to the I/O card", "To show every pipe, tank and pump of the whole plant", "To list all the alarms with their set limits", "To show the order of the steps in a sequence"], c: 0, why: "One page per loop with every terminal. It is the fault-finding document for a single signal." },
    { t: "Projects & practice", q: "What do you check before you change a program on a running plant?", a: ["Online and offline are the same, and you have a backup", "The HMI has the newest colour scheme installed", "The plant manager has left the building for the whole day", "The PLC has been switched off for one full minute"], c: 0, why: "Compare first. If the PLC holds changes that are not in your file, your download would delete them." },
    { t: "Projects & practice", q: "What is the difference between FAT and SAT?", a: ["FAT is at the builder, SAT is at the customer's site", "FAT is for safety, SAT is for the software only", "FAT is done by operators, SAT by programmers", "FAT is a quick test, SAT a long test with a full load"], c: 0, why: "Factory acceptance test before shipping, site acceptance test after installation. Both follow a written test list." },
    { t: "Safety", q: "Name the key steps of lock-out, tag-out.", a: ["Isolate, lock, release stored energy, verify", "Press E-stop, put up a sign, then start work", "Stop the PLC, force outputs off, start work", "Call the operator, open the guard, reach in"], c: 0, why: "Each person locks with an own padlock, and the dead state is proven before any work." },
    { t: "Programming", q: "Why use an ENUM for the steps of a sequence?", a: ["Readable names, checked by the compiler", "The sequence then runs in a shorter time", "The steps then need no memory in the CPU", "The sequence can then skip a broken step"], c: 0, why: "State = Heating is clear in the code and in the watch table. A typing mistake becomes a compile error." },
    { t: "Drives & motion", q: "How does a PLC control an industrial robot in a cell?", a: ["It selects a job and starts it with a handshake", "It sends every axis position to the robot arm", "It loads a new program into the robot each cycle", "It switches the robot motors with contactors"], c: 0, why: "The robot controller moves the arm. The PLC gives job number and START, and waits for BUSY, DONE and zone signals." },
    { t: "Drives & motion", q: "What is an interference zone signal between a robot and a machine?", a: ["A signal that says the robot is outside the machine", "A signal that says the robot has an internal fault now", "A signal that counts the parts the robot has moved", "A signal that sets the speed of the robot's arm"], c: 0, why: "Door moves and machine starts are interlocked with it, so robot and machine are never in the same space." },
    { t: "Troubleshooting", q: "A robot cell stops and nothing moves. The PLC is in step 20 'robot job'. What do you check?", a: ["Which handshake signal is missing: BUSY or DONE", "Whether the HMI screen shows the right colours", "Whether the PLC battery was changed earlier this year", "Whether the cell lights are switched on inside"], c: 0, why: "The step tells you what the PLC waits for. Look at READY, BUSY, DONE on both sides, then at the robot's own message." },
    { t: "Programming", q: "What is the difference between a jump and an MCR zone?", a: ["Jump: rungs are not scanned. MCR: scanned as false", "Jump: for safety circuits. MCR: for normal logic only", "Jump: only goes backwards. MCR: only goes forwards", "Jump: resets all timers. MCR: keeps all the timers"], c: 0, why: "After a jump the outputs keep their last state. In an MCR zone that is off, normal coils drop and TON timers reset." },
    { t: "Programming", q: "Can an MCR instruction replace the emergency stop circuit?", a: ["No, it only changes how rungs are solved", "Yes, when the zone covers all of the outputs", "Yes, when the CPU is a fast modern type", "Yes, but only on machines with one motor"], c: 0, why: "Emergency stop must be hard-wired or go through safety-rated hardware. Software in a normal PLC is not a safety function." },
    { t: "Programming", q: "A camera checks parts, and a reject arm sits four parts further down. Parts come at random times. How do you track the result?", a: ["Store each result in a FIFO, unload it at the arm", "Use one memory bit and overwrite it with every new part", "Start a timer at the camera and reject when the time ends", "Reject every fourth part that passes in front of the arm"], c: 0, why: "A FIFO keeps the results in the order of the parts. With a fixed machine cycle a shift register does the same." },
    { t: "Programming", q: "Why do many engineers avoid jumps in new programs?", a: ["Skipped outputs keep their state; hard to follow", "Jumps make the scan time of the PLC very much longer", "Jumps are not allowed in ladder by the IEC standard", "Jumps wear out the memory of the CPU faster than coils"], c: 0, why: "A block with an enable input does the same and is easy to read online." },
    { t: "Safety", q: "A safety relay does not reset after an E-stop was released. Both input LEDs are on. What do you check?", a: ["The feedback loop and whether both channels opened", "The motor current and the overload relay setting only", "The program of the PLC for a missing reset rung", "The mains voltage on the three motor phases"], c: 0, why: "Typical causes: a contactor that did not drop (feedback loop open), a reset button fault, or one channel that never opened (welded contact)." },
    { t: "Safety", q: "When is automatic start of a safety relay allowed?", a: ["Only when nobody can be inside the danger zone", "Always, because it saves the operator some time", "Never: every safety relay needs a reset button", "Only when the machine has more than one E-stop"], c: 0, why: "If a person can stand behind the guard or the light curtain, closing it must not restart the machine: a manual, monitored reset is needed." },
    { t: "Safety", q: "What is a safety relay with delayed contacts used for?", a: ["A drive that must brake first", "A motor that needs a star-delta start", "A lamp that must flash before the start", "A PLC that needs time to boot up"], c: 0, why: "Stop category 1: the instant contacts tell the drive to ramp down, the delayed contacts cut the power after the set time." },
  ];
  LL.QUIZ_NET = [
    { t: "Basics", q: "Fieldbus or industrial Ethernet: what is the main difference?", a: ["Fieldbuses use serial cables (RS-485, CAN); industrial Ethernet uses Ethernet cables and switches", "Fieldbuses use Ethernet cables and switches; industrial Ethernet uses serial RS-485 or CAN cables", "Fieldbuses carry only digital on/off signals; industrial Ethernet carries only analog sensor values", "Fieldbuses need no device file at all; industrial Ethernet needs a GSD or EDS file for each device"], c: 0, why: "Classic fieldbuses: PROFIBUS, CANopen, DeviceNet. Industrial Ethernet: PROFINET, EtherNet/IP, EtherCAT, Modbus TCP. New machines almost always use Ethernet." },
    { t: "Basics", q: "Cyclic (implicit) or acyclic (explicit) communication?", a: ["Cyclic: I/O data sent automatically at a fixed rate. Acyclic: only on request, e.g. a parameter", "Cyclic: only on request, e.g. reading a parameter. Acyclic: I/O data sent automatically at a fixed rate", "Cyclic: data for the HMI screens only. Acyclic: all I/O data between the PLC and its devices", "Cyclic: data sent over copper cable. Acyclic: data sent over fibre-optic cable between cabinets"], c: 0, why: "Cyclic = PROFINET RT data or EtherNet/IP implicit I/O. Acyclic = record read / write or an explicit MSG." },
    { t: "Basics", q: "What does \"deterministic\" mean for an industrial network?", a: ["Data arrives within a known, guaranteed time, every cycle", "The network never loses a single packet, even with bad cables", "The network always runs at the top speed, 1 Gbit/s or more", "Every device gets its IP address automatically from a server"], c: 0, why: "Motion control needs both speed and determinism (IRT, EtherCAT)." },
    { t: "Basics", q: "Master / slave, client / server, producer / consumer: which matches Modbus TCP?", a: ["Client / server: the client (PLC or SCADA) asks, the server answers", "Producer / consumer: each device sends its data every cycle by itself", "Publish / subscribe: devices send to a broker, others subscribe to topics", "Token passing: a token goes round and only its holder may send data"], c: 0, why: "EtherNet/IP uses producer / consumer, MQTT publish / subscribe." },
    { t: "Basics", q: "PLC 192.168.0.10 / 24 and drive 192.168.1.20 / 24. Can they talk directly?", a: ["No: different subnets. They need the same subnet or a router", "Yes: all 192.168 addresses are private, so they always reach each other", "Yes: a /24 mask only checks the first two numbers of the address", "No: two devices can only talk directly if their last numbers are equal"], c: 0, why: "/24 = mask 255.255.255.0: the first three numbers must match." },
    { t: "Basics", q: "Maximum length of one copper Ethernet segment (100BASE-TX)?", a: ["100 m", "10 m", "1000 m", "300 m"], c: 0, why: "Longer: a switch in between, or fibre." },
    { t: "Basics", q: "Why a managed switch in a machine network?", a: ["Diagnostics, VLANs, IGMP snooping, ring redundancy and port security", "All traffic gets faster, because managed switches add no delay at all", "Unmanaged switches cannot carry PROFINET or EtherNet/IP frames at all", "It replaces the firewall, so no other security measures are needed"], c: 0, why: "Unmanaged switches work for small machines, but they give no diagnostics." },
    { t: "Basics", q: "Line, star or ring topology: which one keeps running when one cable breaks?", a: ["Ring with a redundancy protocol (MRP or DLR)", "Line: the devices after the break still work", "Star: the switch sends the data around the break", "Line with a terminating resistor at both ends"], c: 0, why: "In a line, everything after the break is lost. A ring (MRP for PROFINET, DLR for EtherNet/IP) sends the data the other way round." },
    { t: "Basics", q: "Which file describes a device to the engineering tool?", a: ["A device description file: GSDML, EDS, ESI or IODD", "The PDF manual, imported into the hardware catalog", "A Wireshark capture of the device starting up", "The device firmware file, loaded from a USB stick"], c: 0, why: "GSD / GSDML: PROFIBUS / PROFINET. EDS: EtherNet/IP, DeviceNet, CANopen. ESI: EtherCAT. IODD: IO-Link. Install it before you add the device." },
    { t: "Basics", q: "What is a VLAN used for?", a: ["Splitting one switch network into separate logical networks", "Making Wi-Fi faster by using more radio channels at once", "Sending 24 V power to all of the devices over the data cable", "Encrypting all data so that nobody can read the packets"], c: 0, why: "Segmentation is also a basic cyber-security measure." },
    { t: "How it works", q: "What is \"polling\"?", a: ["The master asks each device in turn; each answers only when asked", "Each device sends its data by itself whenever its value has changed", "All devices send at the same time and the switch sorts the data", "The PLC measures the bus voltage to see which devices are present"], c: 0, why: "Modbus RTU, AS-i and LIN work this way." },
    { t: "How it works", q: "What is a gateway?", a: ["A device that translates between two networks, e.g. Modbus RTU to PROFINET", "A switch that joins two Ethernet segments that both use the very same protocol", "A repeater that makes an RS-485 line longer, using the same protocol", "A firewall that blocks all traffic from the office network to the PLC"], c: 0, why: "Typical for connecting an old or third-party device to your PLC." },
    { t: "How it works", q: "Half duplex or full duplex?", a: ["Half: one direction at a time (RS-485, CAN). Full: both at once (Ethernet)", "Half: half the baud rate (RS-485). Full: the full baud rate (Ethernet)", "Half: one wire pair, no ground needed. Full: two wire pairs, always on fibre", "Half: data only from master to slave. Full: data also from slave back"], c: 0, why: "Full duplex is one reason switched Ethernet has no collisions." },
    { t: "How it works", q: "Why are there no collisions on switched industrial Ethernet?", a: ["Each link is full duplex; the switch sends each packet only to its port", "Ethernet is so fast that two packets can never meet on the same cable", "Devices pass a token around, and only the device holding the token may send", "Collisions still happen, but the PLC hides them and repeats each frame"], c: 0, why: "Each cable is a private path in both directions. Old Ethernet with hubs had collisions; switches ended that." },
    { t: "How it works", q: "What does producer / consumer mean (PROFINET, EtherNet/IP)?", a: ["Each device sends its data by itself every cycle; whoever needs it uses it", "The PLC asks each device in turn, and each device answers only when it is asked", "Only the producer may receive data; consumers may only send data to it", "Data is sent once at start-up and then kept in the consumer's memory"], c: 0, why: "Faster and simpler than polling, because no requests are needed." },
    { t: "How it works", q: "Why does EtherCAT put every device in one frame?", a: ["A frame is at least 64 bytes, so one shared frame wastes far less time", "Because each EtherCAT device can only receive one frame per second", "To save cable, because then all devices can share one copper wire pair", "For security: one frame is harder to read with Wireshark than many"], c: 0, why: "One frame, many devices = very short cycle times." },
    { t: "How it works", q: "Big-endian or little-endian?", a: ["The order of bytes in a word: high byte first or low byte first", "The order of bits on the wire: start bit first or stop bit first", "Which end of an RS-485 line must get the terminating resistor", "Whether a device is the first or the last one in a daisy chain"], c: 0, why: "Modbus sends the high byte of each register first. The order of two registers for 32-bit values is not fixed." },
    { t: "How it works", q: "What is the \"update time\" (cycle / RPI) of a network device?", a: ["How often its I/O data is exchanged; faster means more network load", "How long the device needs to boot up after the power is switched on again", "How often the device checks the vendor's server for new firmware", "How long the cable to the device may be at the chosen speed"], c: 0, why: "Choose it from the process: a valve island needs ms, a temperature 100 ms is plenty." },
    { t: "How it works", q: "Why a daisy chain (in and out at each device) on RS-485, CAN and PROFIBUS, and not a star?", a: ["Signals reflect from open cable ends; a terminated line keeps them clean", "It is only cheaper; a star would carry the signals just as well", "Each device needs two cables so it can get its address from its neighbours", "A star would need a separate master for each branch of the network"], c: 0, why: "Short stubs are tolerated; long branches cause errors." },
    { t: "Serial (RS-232 / RS-485)", q: "RS-232 or RS-485?", a: ["RS-232: point-to-point, about 15 m. RS-485: multi-drop, about 1200 m", "RS-232: multi-drop, up to about 1200 m. RS-485: point-to-point, about 15 m", "RS-232: for Ethernet devices. RS-485: only for PROFIBUS DP networks", "RS-232: differential, two wires. RS-485: one wire measured to ground"], c: 0, why: "RS-485 is differential and multi-drop. Modbus RTU and PROFIBUS use it." },
    { t: "Serial (RS-232 / RS-485)", q: "A device is set to \"9600 8N1\". What does it mean?", a: ["9600 bits per second, 8 data bits, no parity, 1 stop bit", "9600 bytes per second, 8 bits per word, no CRC, 1 start bit", "Slave address 9600, 8 registers to read, node number 1", "9600 devices maximum, 8 networks, no gateways, 1 master"], c: 0, why: "Both sides must use exactly the same settings, or they only read garbage." },
    { t: "Serial (RS-232 / RS-485)", q: "Why does every serial byte begin with a start bit?", a: ["There is no clock wire: the start bit says a byte begins now", "It is a simple error check: a damaged byte has no start bit", "It wakes up the PLC from sleep so it can read the serial port", "It holds the address of the device that must read the byte"], c: 0, why: "After the start bit the receiver samples each bit in its middle, using its own clock." },
    { t: "Serial (RS-232 / RS-485)", q: "How do you connect TX and RX between two RS-232 devices?", a: ["TX of one to RX of the other (crossed), plus ground", "TX to TX and RX to RX (straight), plus ground", "Only the two TX pins together; RX is not used", "Any way round: the port finds the right pins itself"], c: 0, why: "If both TX pins meet, both talk into each other and nobody listens. A \"null modem\" cable crosses them." },
    { t: "Serial (RS-232 / RS-485)", q: "What is a UART?", a: ["The chip that turns a byte into a row of bits on a wire, and back", "The special cable that crosses TX and RX between two devices", "A Modbus function code that reads several registers at once", "A small network switch that is built into each and every serial device"], c: 0, why: "Every serial port has one. RS-232 / RS-485 only add the voltages and wires." },
    { t: "Serial (RS-232 / RS-485)", q: "What is the parity bit for?", a: ["To detect one damaged bit: the count of 1s must be even (or odd)", "To repair any damaged bits, so the byte never has to be sent again", "To hold the address of the device that the byte is sent to", "To tell the receiver which baud rate the sender is now using"], c: 0, why: "It finds one wrong bit, not two. Protocols add a CRC for better checking." },
    { t: "Serial (RS-232 / RS-485)", q: "At 9600 baud with 8N1, how long does one byte take?", a: ["About 1 ms (10 bits × 104 µs)", "About 1 µs (8 bits × 0.1 µs)", "About 1 s (10 bits × 0.1 s)", "About 8 ms (8 bits × 1 ms)"], c: 0, why: "Start + 8 data + stop = 10 bits. That is why serial links feel slow with many devices." },
    { t: "Serial (RS-232 / RS-485)", q: "Why can RS-485 go much further than RS-232?", a: ["It sends each bit as a difference between two wires, so noise cancels", "It uses a much higher voltage, so noise is too small to matter", "It has a fibre inside the cable, so electrical noise can never reach it", "It is always slower, and slow signals can travel any distance"], c: 0, why: "Twisted pair + difference = noise immunity. RS-232 measures against ground, which picks up noise." },
    { t: "Serial (RS-232 / RS-485)", q: "On a 2-wire RS-485 line, can two devices send at the same time?", a: ["No: one pair means one talker at a time; the protocol decides who", "Yes: each device sends on its own frequency, like a radio station", "Yes, but only if the baud rate is set to 9600 or lower on all devices", "No: only the master may ever send; slaves never send anything back"], c: 0, why: "That is why Modbus RTU has one master that asks." },
    { t: "Serial (RS-232 / RS-485)", q: "Why put a CRC at the end of a Modbus RTU frame?", a: ["So the receiver can check that no byte was damaged on the way", "So the receiver knows which slave address the frame is for", "So both sides can agree on the baud rate before they send any data", "So nobody can read the data, because the CRC encrypts it"], c: 0, why: "If the CRC does not match, the frame is thrown away and the master reports an error." },
    { t: "Modbus", q: "Modbus RTU and Modbus TCP?", a: ["RTU: serial with CRC. TCP: the same registers over Ethernet, port 502", "RTU: over Ethernet, port 502. TCP: serial RS-232 with a CRC", "RTU: holding registers only. TCP: coils and input registers, but no holding", "RTU: for reading data only. TCP: for writing data to the devices"], c: 0, why: "Gateways convert one to the other." },
    { t: "Modbus", q: "The four Modbus data tables?", a: ["Coils, discrete inputs, holding registers, input registers", "Inputs, outputs, timers and counters, like in the PLC", "Bits, bytes, strings and floats, with one table for each data type", "Coils, flags, data blocks and diagnostic registers"], c: 0, why: "Registers are 16-bit words." },
    { t: "Modbus", q: "Function code 03 does what?", a: ["Read holding registers", "Write a single coil", "Read input registers", "Write a single register"], c: 0, why: "01 read coils, 02 read discrete inputs, 03 read holding, 04 read input registers, 05 / 06 write single coil / register, 15 / 16 write multiple." },
    { t: "Modbus", q: "Function code 16 does what?", a: ["Write multiple holding registers", "Read multiple input registers", "Write a single holding register", "Read multiple discrete inputs"], c: 0, why: "Use 06 for one register, 16 for several (e.g. a 32-bit value)." },
    { t: "Modbus", q: "A manual says \"register 40011\". Which address do you put in the request?", a: ["Offset 10 (40001 = offset 0); check with one test read", "Offset 40011, exactly the number written in the manual", "Offset 11, because Modbus addresses always start at 1", "Offset 4, because the 4 marks the holding register table"], c: 0, why: "40001 is offset 0, so 40011 is offset 10. Some tools use 1-based numbers: check with one test read. The off-by-one is the most common Modbus mistake." },
    { t: "Modbus", q: "A 32-bit float over Modbus reads as nonsense. Most likely?", a: ["The word order of the two registers differs between the devices", "Modbus cannot carry floats at all, only 16-bit integer values", "The baud rate is wrong, so every second bit gets lost on the way", "The cable is too long, so the high bytes always arrive too late"], c: 0, why: "Try \"word swap\" in the driver settings and compare with a known value." },
    { t: "Modbus", q: "How many slaves on one Modbus RTU line, and which addresses?", a: ["Addresses 1–247 (0 = broadcast); 32 unit loads per segment", "Addresses 0–125 (126 = default); 126 devices per segment", "Addresses 1–8 only; one master and eight slaves per line", "Addresses 1–63 (0 = the master); 64 devices per segment"], c: 0, why: "Addresses 1–247, 0 = broadcast. Electrically 32 unit loads per RS-485 segment. More devices: repeaters or devices with 1/8 unit load." },
    { t: "Modbus", q: "RS-485 line: where do you put termination resistors?", a: ["At both physical ends of the line (about 120 Ω)", "At every device on the line (about 120 Ω each)", "Only at the master, at the start of the line (1 kΩ)", "In the middle of the line, so both halves are equal"], c: 0, why: "Also biasing resistors at one point, and a daisy chain, not a star." },
    { t: "Modbus", q: "All serial settings must match on every device. Which are they?", a: ["Baud rate, data bits, parity and stop bits", "IP address, subnet mask and default gateway", "Device name, slave address and firmware version", "Baud rate, RPI, update time and watchdog time"], c: 0, why: "One wrong parity and nobody answers." },
    { t: "Modbus", q: "Modbus is master / slave. What does that mean for a slow device?", a: ["The master waits for each answer or a timeout, so a dead slave slows all", "The slow slave simply sends its answer later, whenever it is ready", "All slaves answer at the same time, so one slow slave changes nothing at all", "The master skips the slow slave for good and never asks it again"], c: 0, why: "Set sensible timeouts and retries; poll less important data less often." },
    { t: "PROFIBUS", q: "PROFIBUS DP physical layer and speed?", a: ["RS-485, 9.6 kbit/s to 12 Mbit/s; faster means shorter segments", "Ethernet, 100 Mbit/s; up to 100 m of copper between two devices", "CAN, 10 kbit/s to 1 Mbit/s; faster means shorter segments", "RS-232, always 9.6 kbit/s; up to 15 m between two devices"], c: 0, why: "12 Mbit/s: 100 m per segment; 187.5 kbit/s: 1000 m." },
    { t: "PROFIBUS", q: "PROFIBUS termination?", a: ["Resistor ON in the plug at the first and last device, OFF between", "Resistor ON in the plug at every device of the segment, for safety", "Resistor ON only in the master plug; slave plugs never need one", "No resistor is needed, because PROFIBUS cables are shielded"], c: 0, why: "A wrong termination is the number one PROFIBUS fault; switching a plug ON in the middle cuts off the rest." },
    { t: "PROFIBUS", q: "Maximum PROFIBUS addresses?", a: ["126 (0–125); 32 devices per segment", "247 (1–247); 32 devices per segment", "64 (0–63); 16 devices per segment", "256 (0–255); 64 devices per segment"], c: 0, why: "Address 126 is the default for new devices." },
    { t: "CAN, CANopen, DeviceNet", q: "In CANopen, PDO and SDO?", a: ["PDO: fast process data. SDO: reading and writing parameters", "PDO: reading and writing parameters. SDO: fast process data", "PDO: data for the safety PLC. SDO: data for the HMI screens", "PDO: data sent by the master only. SDO: data sent by slaves only"], c: 0, why: "PDO = Process Data Object, SDO = Service Data Object (object dictionary). NMT controls the device states; a heartbeat shows it is alive." },
    { t: "CAN, CANopen, DeviceNet", q: "CAN bus termination?", a: ["120 Ω at both ends of the bus", "120 Ω at every node on the bus", "50 Ω at the master only", "1 kΩ at both ends of the bus"], c: 0, why: "Measure about 60 Ω between CAN-H and CAN-L with the power off: both ends are terminated." },
    { t: "CAN, CANopen, DeviceNet", q: "Two CAN nodes start sending at exactly the same moment. What happens?", a: ["The lower ID wins bit by bit; the other stops and tries again later", "Both messages are destroyed and both nodes wait a random time", "The higher ID wins, because it has more dominant 1 bits on the bus wires", "The master on the bus decides which node may send its message"], c: 0, why: "A 0 bit is \"dominant\": it overwrites a 1. The node that hears a 0 when it sent a 1 knows it lost." },
    { t: "CAN, CANopen, DeviceNet", q: "On CAN, which message gets through first?", a: ["The one with the lowest ID", "The one with the highest ID", "The one with the most data", "The one from the master"], c: 0, why: "So important messages (network commands, SYNC, drive error messages) get low IDs." },
    { t: "CAN, CANopen, DeviceNet", q: "How many data bytes fit in one classic CAN message?", a: ["Up to 8 (CAN FD: up to 64)", "Up to 64 (CAN FD: up to 512)", "Up to 1500, like Ethernet", "Exactly 2 (one register)"], c: 0, why: "Small messages, sent often and fast." },
    { t: "CAN, CANopen, DeviceNet", q: "CANopen and DeviceNet: what is the same, what is different?", a: ["Both run on CAN; DeviceNet (Rockwell) also carries 24 V in the cable", "Both run on Ethernet; CANopen uses switches, and DeviceNet uses old hubs", "They are the same protocol on CAN; only the name differs by vendor", "CANopen carries 24 V in the cable; DeviceNet needs separate power"], c: 0, why: "Same \"road\" (CAN), different \"language\" on top. CANopen is used for drives, robots, medical and mobile machines." },
    { t: "CAN, CANopen, DeviceNet", q: "How many nodes on DeviceNet?", a: ["Up to 64 (MAC ID 0–63)", "Up to 126 (MAC ID 0–125)", "Up to 247 (MAC ID 1–247)", "Up to 16 (MAC ID 0–15)"], c: 0, why: "Each node has a MAC ID set by switches or software." },
    { t: "CAN, CANopen, DeviceNet", q: "What is a CANopen heartbeat?", a: ["A small message each node sends regularly to show it is alive", "A clock signal on an extra wire that keeps all nodes in time", "The bus speed that all nodes must use, for example 500 kbit/s", "A message the master sends once to start all nodes on the bus"], c: 0, why: "If it stops, the master knows the node is gone." },
    { t: "LIN", q: "Where do you find LIN?", a: ["In cars: windows, mirrors, seats; a cheap, slow sub-bus under CAN", "In PROFINET switches, to connect the ports to each other", "In safety PLCs, as a fast backplane link between the two CPUs", "In large process plants, as a fast fibre backbone between the PLCs"], c: 0, why: "One wire, 19.2 kbit/s max. Rare in factory machines." },
    { t: "LIN", q: "How many masters does a LIN bus have?", a: ["One", "Two", "Ten", "None"], c: 0, why: "The master sends every header; slaves only answer." },
    { t: "LIN", q: "Why does every LIN header contain the sync byte 0x55?", a: ["Its 01010101 pattern lets slaves tune their clock to the master", "It is the address of the master, so slaves know who is asking", "It marks the end of the frame, so slaves know they can answer", "It is a checksum, so slaves can check the header is not damaged"], c: 0, why: "0x55 = 01010101. Slaves often have no crystal, so they adjust their clock to this byte." },
    { t: "LIN", q: "Who sends the data in a LIN frame?", a: ["The node that owns the ID in the header", "Always the master; slaves only listen to the bus", "All slaves together, each in its own time slot", "The slave with the lowest address, by arbitration"], c: 0, why: "Header from the master, response from one slave." },
    { t: "AS-i & HART", q: "What is special about the AS-Interface (AS-i) cable?", a: ["A yellow two-wire flat cable that carries both power and data", "A fibre-optic cable, so it is fully immune to motor noise", "A green 8-wire shielded cable with RJ45 plugs on every device", "A data-only cable; every device needs its own 24 V supply"], c: 0, why: "Cheap wiring for many simple sensors, buttons and valves." },
    { t: "AS-i & HART", q: "How many slaves on one AS-i network?", a: ["Up to 62 (A/B addressing), 31 classic", "Up to 247 (A/B addressing), 126 classic", "Up to 126 (A/B addressing), 64 classic", "Up to 16 (A/B addressing), 8 classic"], c: 0, why: "The master polls them all in about 5–10 ms." },
    { t: "AS-i & HART", q: "What is HART?", a: ["A digital signal on top of the 4–20 mA loop, for settings and diagnostics", "A fieldbus with its own cable that fully replaces the 4–20 mA loop and its wires", "A safety protocol that turns a 4–20 mA loop into a SIL 3 signal", "A type of small PLC made for process plants with many analog inputs"], c: 0, why: "The 4–20 mA still carries the main value; HART adds information on the same two wires." },
    { t: "AS-i & HART", q: "PROFIBUS PA is used for…", a: ["Process instruments, also in Ex areas, with power and data on 2 wires", "Fast multi-axis motion control, with cycle times far below 1 ms and µs jitter", "Office networks, to link the PLC with the ERP system and e-mail", "Car electronics: windows, mirrors and seats under the CAN bus"], c: 0, why: "Same PROFIBUS protocol, slower (31.25 kbit/s), intrinsically safe." },
    { t: "IO-Link", q: "What is IO-Link?", a: ["A point-to-point link from a master port to one sensor, 3-wire cable", "A fieldbus that connects up to 100 sensors on one long shielded line", "A wireless protocol that sends sensor data to the PLC by radio", "A safety network that connects light curtains to a safety PLC"], c: 0, why: "IEC 61131-9; up to 20 m; the master sits on PROFINET, EtherNet/IP, EtherCAT …" },
    { t: "IO-Link", q: "What do you gain with an IO-Link sensor instead of a switching one?", a: ["Measured values, parameters from the PLC, diagnostics, easy replacement", "Much longer sensor cables, up to 1000 m, with no shielding needed", "No need for a PLC at all: the sensor runs the machine logic by itself", "A faster PLC scan time, because the sensor does part of the PLC's work"], c: 0, why: "The master stores the parameters (data storage) and writes them to an identical new sensor." },
    { t: "IO-Link", q: "Which file describes an IO-Link device?", a: ["IODD", "GSDML", "ESI", "EDS"], c: 0, why: "IO-Link Device Description, from the IODDfinder." },
    { t: "IO-Link", q: "Can an IO-Link port also read a normal switching sensor?", a: ["Yes, in standard digital input (SIO) mode", "No, it only works with IO-Link sensors", "Only with a special analog adapter plug", "Yes, but only analog 4–20 mA sensors"], c: 0, why: "Mixed ports make wiring simpler." },
    { t: "PROFINET", q: "How does a PROFINET controller find its devices?", a: ["By device name; the controller then gives it its IP address", "By the IP address that you type into each device by hand", "By the serial number printed on the label of each device", "By its MAC address only; device names and IPs are not used"], c: 0, why: "A new or replaced device must get its name (\"assign device name\") unless topology-based replacement is used." },
    { t: "PROFINET", q: "What is the \"update time\" of a PROFINET device?", a: ["How often cyclic I/O data is exchanged, e.g. every 1, 2 or 4 ms", "How often the device checks the vendor server for new firmware", "How long the device needs to boot after the power comes on", "How often the HMI screen reads new values from the device"], c: 0, why: "Shorter update time = more network load. RT works down to about 1 ms, IRT below 1 ms." },
    { t: "PROFINET", q: "PROFINET RT or IRT?", a: ["RT: normal I/O in the ms range. IRT: motion, µs jitter, special switches", "RT: for safety data only. IRT: for all normal I/O data, on any standard switch", "RT: for motion with µs jitter. IRT: for slow I/O like temperatures", "They are the same; IRT is only the name used on fibre-optic cable"], c: 0, why: "IRT reserves bandwidth and needs IRT-capable switches. Conformance class C includes IRT." },
    { t: "PROFINET", q: "What is an I-Device?", a: ["A PLC that also acts as a PROFINET device for another controller", "An IO-Link master that is plugged directly into a PROFINET port", "An HMI that reads and writes PLC data over PROFINET by itself", "A diagnostic tool that shows all PROFINET devices and their names"], c: 0, why: "Common for machine-to-line communication." },
    { t: "PROFINET", q: "MRP is…", a: ["Media Redundancy Protocol: a ring that recovers from one cable break", "Motion Reference Profile: a standard for servo drives on PROFINET IRT", "Monitored Relay Protocol: the safety layer that runs on PROFINET", "Main Router Port: the switch port that connects to the office"], c: 0, why: "Recovery is typically 200 ms or less. One device is the ring manager, the others are clients." },
    { t: "PROFINET", q: "Device replacement without a PG: how is it possible?", a: ["With topology set up, the controller knows it by its port neighbours", "By pressing the reset button on the new device for ten seconds", "It is not possible: a PG is always needed to assign the device name", "The new device takes the old device's name from the switch's MAC table"], c: 0, why: "The controller recognises the new device by its port neighbours and gives it the name. The new device must be reset to factory settings (no name)." },
    { t: "PROFINET", q: "Siemens S7 GET / PUT communication fails. A common cause?", a: ["PUT / GET access is not enabled in the CPU protection settings", "PROFINET does not support S7 communication between two CPUs", "The HMI is switched off, and GET / PUT goes through the HMI", "The two CPUs are not in the same PROFINET IO system in TIA Portal"], c: 0, why: "The option is \"Permit access with PUT / GET from remote partner\". S7-1200 / 1500 block it by default." },
    { t: "PROFINET", q: "Color and wires of a typical PROFINET cable?", a: ["Green, 4 wires (2 pairs) for 100 Mbit/s, M12 or RJ45", "Purple, 2 wires (1 pair), with 9-pin Sub-D plugs", "Yellow flat cable, 2 wires, with piercing contacts", "Orange, 8 wires (4 pairs) for 10 Gbit/s, RJ45 only"], c: 0, why: "Fast-connect plugs strip and connect in the field." },
    { t: "EtherNet/IP", q: "EtherNet/IP is built on which protocol?", a: ["CIP (Common Industrial Protocol), like DeviceNet", "Modbus TCP, with extra function codes for I/O", "PROFIBUS DP, packed into standard Ethernet frames", "HTTP, the same protocol that web browsers use"], c: 0, why: "Managed by ODVA; the main network for Rockwell / Allen-Bradley." },
    { t: "EtherNet/IP", q: "What is the RPI?", a: ["Requested Packet Interval: how often cyclic I/O data is sent", "Remote Programming Interface: the port used for online edits", "Rockwell Product Identifier: the device's catalog number", "Ring Protection Interval: the time a DLR ring needs to recover"], c: 0, why: "Typical 2–50 ms; faster RPI = more load." },
    { t: "EtherNet/IP", q: "Implicit and explicit messaging?", a: ["Implicit: cyclic I/O (UDP 2222). Explicit: request / response, like MSG", "Implicit: request / response, like MSG. Explicit: cyclic I/O data", "Implicit: plain, unencrypted data. Explicit: data that is encrypted with TLS", "Implicit: data on copper cable. Explicit: data on fibre-optic cable"], c: 0, why: "Implicit uses UDP 2222, explicit uses TCP 44818. Read a drive parameter with a MSG; run the drive with implicit I/O." },
    { t: "EtherNet/IP", q: "Produced / consumed tags are used for…", a: ["Cyclic data exchange between two Logix controllers", "Sending HMI alarm messages from the PLC to the panel", "Loading new firmware into the I/O modules of the rack", "Safety data only, between two GuardLogix controllers"], c: 0, why: "One controller produces a tag, the other consumes it at an RPI." },
    { t: "EtherNet/IP", q: "Why enable IGMP snooping on switches with EtherNet/IP?", a: ["Multicast I/O is otherwise flooded to every port and overloads devices", "It encrypts all the I/O traffic, so that no one on the network can read it", "It gives each new device on the network an IP address automatically", "It is needed so the PLC can find its devices by their device name"], c: 0, why: "Or use unicast connections, which most new devices support." },
    { t: "EtherNet/IP", q: "DLR is…", a: ["Device Level Ring: ring redundancy for EtherNet/IP, recovery in ~3 ms", "Data Logging Record: a file that logs all messages on the network", "Dual Loop Relay: a safety relay with two channels for emergency stops", "Direct Link Request: an explicit message that reads another PLC"], c: 0, why: "Devices with two ports and an embedded switch form the ring." },
    { t: "EtherNet/IP", q: "An Ethernet module shows \"connection timed out\" for one device. Typical causes?", a: ["Wrong IP, device off, bad cable or port, RPI too fast, wrong keying", "A bug in the ladder logic of the main routine of the program", "Too many tags on the HMI screens, so the PLC CPU is overloaded by requests", "A low controller battery, so the module loses its settings"], c: 0, why: "Check the module properties, the device web page and the switch port. Electronic keying must match the real device." },
    { t: "EtherCAT", q: "What makes EtherCAT fast?", a: ["One frame passes all devices; each reads and writes its data on the fly", "It always uses 10 Gbit/s fibre-optic cable between all of its devices", "Each device gets its own frame, and the master sends them all in parallel", "It only sends values that changed, so most cycles carry no data at all"], c: 0, why: "Cycle times of 100 µs and less with hundreds of I/O." },
    { t: "EtherCAT", q: "Distributed clocks in EtherCAT are for…", a: ["Synchronising all devices to one time, jitter well below 1 µs", "Showing the same date and time on every HMI panel of the line", "Logging every EtherCAT frame with a time stamp for diagnostics", "Giving each device its own cycle time, so they run independently"], c: 0, why: "Needed for multi-axis motion." },
    { t: "EtherCAT", q: "Can you put a normal Ethernet switch between EtherCAT devices?", a: ["No: inside the segment devices are chained; use junction modules", "Yes: any standard unmanaged switch works, like with PROFINET RT", "Yes, but only a managed switch with IGMP snooping turned on", "No: EtherCAT does not use Ethernet frames, so the switch drops them"], c: 0, why: "EtherCAT uses standard Ethernet frames, but each device processes them on the fly. Branches use junction modules, not switches." },
    { t: "EtherCAT", q: "Which file describes an EtherCAT device?", a: ["ESI (EtherCAT Slave Information, XML)", "GSDML (Generic Station Description, XML)", "EDS (Electronic Data Sheet, text)", "IODD (IO Device Description, XML)"], c: 0, why: "Beckhoff TwinCAT, Omron Sysmac and CODESYS scan the bus and match the ESI." },
    { t: "EtherCAT", q: "Safety over EtherCAT is called…", a: ["FSoE (Fail Safe over EtherCAT)", "PROFIsafe, as on PROFINET", "CIP Safety, as on EtherNet/IP", "SafetyBUS p over EtherCAT"], c: 0, why: "Like PROFIsafe and CIP Safety, it uses the black channel principle." },
    { t: "OPC UA & MQTT", q: "What is OPC UA mostly used for?", a: ["Exchanging structured, secure data between PLCs, SCADA, MES and IT", "Fast cyclic I/O between a PLC and its sensors, with 100 µs cycles", "Safety signals such as emergency stops between two safety PLCs", "Motion control of servo drives with microsecond jitter and sync"], c: 0, why: "Built into S7-1500, Logix (built in on new 5580 / 5380 firmware; older ones through FactoryTalk Linx or a gateway), CODESYS, TwinCAT, Omron NX." },
    { t: "OPC UA & MQTT", q: "Default port of an OPC UA server (opc.tcp)?", a: ["4840", "502", "1883", "44818"], c: 0, why: "Certificates must be trusted on both sides before a secure connection works." },
    { t: "OPC UA & MQTT", q: "OPC UA connection refused, \"certificate untrusted\". What do you do?", a: ["Trust each side's certificate: client on server, server on client", "Change the IP address of the server, so the client sees it as a new one", "Switch off the PLC firewall for good, so all clients can connect", "Reinstall the PLC firmware so a new certificate is created on it"], c: 0, why: "Security mode None is for tests only." },
    { t: "OPC UA & MQTT", q: "MQTT works with…", a: ["A broker: devices publish to topics, others subscribe to them", "Polling: the client reads registers from each server in turn", "A token ring: only the device with the token may send data", "Device names: the controller assigns IPs and then exchanges I/O"], c: 0, why: "Light, good for cloud and IIoT. Sparkplug B defines the topics and payload for industry." },
    { t: "OPC UA & MQTT", q: "Default MQTT ports?", a: ["1883 (plain), 8883 (TLS)", "502 (plain), 802 (TLS)", "80 (plain), 443 (TLS)", "44818 (plain), 2222 (TLS)"], c: 0, why: "Use TLS and authentication outside the machine network." },
    { t: "OPC UA & MQTT", q: "OPC Classic (DA) versus OPC UA?", a: ["OPC DA: Windows only, uses DCOM. OPC UA: any platform, built-in security", "OPC DA: the newer one, any platform. OPC UA: older, Windows only, uses DCOM", "They are identical; UA is only the new name for the same protocol", "OPC DA: for Siemens PLCs only. OPC UA: for Rockwell PLCs only"], c: 0, why: "Many old SCADA systems still use OPC DA through gateways." },
    { t: "Safety networks", q: "What is the \"black channel\" principle?", a: ["The safety layer adds its own checks, so the network below need not be safe", "Safety data must run in its own separate black cable, apart from normal data", "Safety data is encrypted, so no one can change it on the network", "Safety signals are wired directly, so they use no network at all"], c: 0, why: "Checks: counter, CRC, timeout, addresses. PROFIsafe, CIP Safety and FSoE all work this way." },
    { t: "Safety networks", q: "Which safety protocol runs on PROFINET?", a: ["PROFIsafe", "CIP Safety", "openSAFETY", "SafetyBUS p"], c: 0, why: "Every safety device has an F-address (PROFIsafe address) set on the device and in the configuration." },
    { t: "Safety networks", q: "A safety device on the network trips \"watchdog time exceeded\". What does it mean?", a: ["A safety message came too late; the device went to its safe state", "The safety program has a logic error and must be compiled again", "The device hardware is broken and must be replaced right away", "The safety cable is too short for the configured update time"], c: 0, why: "Check the network load, the update time and the watchdog setting. The watchdog must be longer than the worst-case network delay." },
    { t: "Troubleshooting", q: "A PROFINET device shows a red BF (bus fault) LED. First checks?", a: ["Cable and port LEDs, device name and IP, the right GSDML in the project", "Replace the CPU first, because a BF LED means the CPU is faulty", "Change the PLC program, because a BF LED means the logic has a bug", "Make the scan time shorter, so the CPU can talk to the device faster again"], c: 0, why: "Also check the right device / GSDML version. The online diagnostics and topology view show which device and port." },
    { t: "Troubleshooting", q: "Two devices with the same IP address. Symptom?", a: ["Both drop the connection now and then; the device fails intermittently", "Nothing happens: the switch simply gives each one a new address", "The network gets faster, because the two devices share the work", "Only the HMI stops working; the PLC and all its I/O keep running normally"], c: 0, why: "Both devices answer for the same IP, so packets go to one or the other. Keep an IP list; many devices detect duplicates." },
    { t: "Troubleshooting", q: "Which tool shows the real packets on an industrial Ethernet network?", a: ["Wireshark, on a mirror port or a network tap", "Excel, with the PLC data exported as a CSV file", "The PLC watch table, in online monitoring mode", "A multimeter, on the TX and RX pins of the plug"], c: 0, why: "Filters: pn_rt (PROFINET), enip / cip, mbtcp (Modbus TCP)." },
    { t: "Troubleshooting", q: "An RS-485 network has errors only when a large motor starts. Likely?", a: ["Noise: check shielding, grounding, cable routing and termination", "The baud rate is too low for the extra data from the motor", "A wrong IP address, which only matters while the big motor is running", "The PLC is too slow to scan the bus while the motor starts"], c: 0, why: "Keep bus cables 20 cm or more from motor cables, and cross them at right angles." },
    { t: "Troubleshooting", q: "How do you protect a machine network (cyber security)?", a: ["Segment it, close unused ports, use passwords and updates (IEC 62443)", "Connect it straight to the internet, so the machine builder can help fast", "Keep the default passwords, so that service staff can always log in", "Nothing is needed: PLCs use protocols that hackers do not know"], c: 0, why: "IEC 62443: defense in depth. Cell zones, a firewall to the office, certificates, firmware updates: several layers, not one." },
    { t: "Troubleshooting", q: "Remote access to a machine for the builder. The safe way?", a: ["A VPN gateway, on only when needed, logged, approved by the customer", "Port forwarding on the office router straight to the PLC's IP address", "A permanent TeamViewer on the HMI, with no password, for fast help", "A Wi-Fi hotspot in the control cabinet, with the default password"], c: 0, why: "Many incidents start from an open remote connection." },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
