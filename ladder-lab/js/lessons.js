/* Ladder Lab — curriculum. Each lesson: what / why / where / how, live
 * examples ([[sim:key]] placeholders), common mistakes, takeaways and the
 * challenges that practise it. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  LL.LEVELS = [
    { n: 1, name: 'Foundations', sub: 'How a PLC thinks: contacts, coils, AND / OR' },
    { n: 2, name: 'Memory & motor control', sub: 'Latching, set/reset, interlocks, edges' },
    { n: 3, name: 'Timers', sub: 'On-delay, off-delay, pulse, retentive, timed sequences' },
    { n: 4, name: 'Counters & data', sub: 'Counting, comparing, words, field devices' },
    { n: 5, name: 'Sequences & pro practice', sub: 'Step logic, state machines, safety, structure' },
    { n: 6, name: 'Real-world projects', sub: 'Whole machines: filling line, mixer, elevator, sorter, car wash, pump station, level control' },
    { n: 7, name: 'Structured Text (ST)', sub: 'IF, CASE, FOR, WHILE, REPEAT, arrays and function blocks, as in CODESYS' },
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
<li>If a continuous path of "closed" contacts connects the left rail to the coil, the coil is <b>energised</b>. In Ladder Lab, powered wires glow green.</li>
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
<p>Every signal lives at an <b>address</b> in PLC memory. Ladder Lab uses Siemens-style addresses, like the video you watched:</p>
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
<p>Nobody remembers that I0.5 is "Sensor 4". Real projects give every address a <b>symbol</b>, like the I/O table at the bottom of your video. Ladder Lab shows the symbol above each contact and the address below it. Modern PLCs (CODESYS, TIA Portal, Studio 5000) let you program almost entirely with symbol names.</p>
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
<div class="callout tip"><b>In Ladder Lab</b> the bits (M10.0) and the words (MW10) are kept apart, so a beginner cannot break a counter by writing a bit, and the projects sometimes use MW20, MW21, MW22 next to each other. On a real S7 PLC you would number them MW20, MW22, MW24. CODESYS numbers %MW by words (%MW1 = bytes 2 and 3) and Rockwell uses named tags, so there the overlap looks different, but the idea is the same.</div>
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
<div class="callout where"><b>Where:</b> two-hand safety presses (AND), "start from the panel OR from the HMI" (OR), permissives like "guard closed AND air pressure OK AND no fault".</div>
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
<tr><td>Power cut</td><td>Off after restart</td><td>Can be retentive (stays on!)</td></tr>
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
      id: 'edges', level: 2, title: 'Edges & one-shots', min: 8,
      summary: 'Do something once at the moment a signal changes, not for as long as it stays on.',
      body: `
<h3>What it is</h3>
<p>A normal contact is <b>level</b>-sensitive: true for every scan the bit is 1. An <b>edge</b> contact is true for exactly <b>one scan</b>:</p>
<ul>
<li><code>-|P|-</code> rising edge: the scan where the bit goes 0 → 1.</li>
<li><code>-|N|-</code> falling edge: the scan where the bit goes 1 → 0.</li>
</ul>
<p>Other names: one-shot (ONS, OSR), R_TRIG / F_TRIG in IEC and CODESYS, positive / negative transition.</p>
<h3>Why it matters</h3>
<p>A button press lasts ~200 ms, which is maybe 20 scans. Anything that <i>adds</i>, <i>toggles</i> or <i>moves</i> would happen 20 times. Edges make it happen once.</p>
[[sim:edge]]
<h3>The toggle trick (one button ON/OFF)</h3>
<p>Rung 1 makes a one-scan pulse. Rung 2 flips the lamp on that pulse: <code>Lamp := Pulse XOR Lamp</code>.</p>
[[sim:toggle]]
<div class="callout where"><b>Where:</b> counting parts, adding to totals, toggling modes with one button, acknowledging alarms, starting a sequence step exactly once.</div>`,
      sims: {
        edge: { program: 'RUNG Add 1 per scan while held (level)\nNO(I0.0) ADD(MW0,1,MW0)\nRUNG Add 1 per press (edge)\nP(I0.0) ADD(MW2,1,MW2)', inputs: { 'I0.0': pb('Button') }, outputs: {}, note: 'Press once. MW0 races up (+1 every scan), MW2 adds exactly 1.' },
        toggle: { program: 'RUNG One-scan pulse on each press\nP(I0.0) COIL(M0.0)\nRUNG Flip the lamp on each pulse\nNO(M0.0) NC(Q0.0) | COIL(Q0.0)\nNC(M0.0) NO(Q0.0)', inputs: { 'I0.0': pb('ON/OFF') }, outputs: { 'Q0.0': 'Lamp' } },
      },
      takeaways: ['P = one scan on 0→1, N = one scan on 1→0.', 'Use edges for counting, adding, toggling.'],
      mistakes: ['ADD or MOV with a level contact: runs every scan.', 'Using the same edge memory in two places.'],
      challenges: ['toggle'],
    },
    {
      id: 'scan-traps', level: 2, title: 'Scan traps: rung order & double coils', min: 7,
      summary: 'Why one output must have one coil, and why rung order changes behaviour.',
      body: `
<h3>Double coil syndrome</h3>
<p>Two normal coils with the same address in two rungs: rung 1 sets Q0.0 = 1, rung 2 sets it straight back to 0, and only the <b>last</b> rung's answer reaches the terminal. Pressing PB1 seems to do nothing.</p>
[[sim:dbl]]
<p>The fix: <b>one coil per output</b>. Combine every condition into a single rung with branches, or compute parts in M bits and OR them.</p>
<p>Ladder Lab's checker flags this as <b>"Double coil"</b>. Real tools do too (TIA Portal and GX Works warn, Studio 5000 allows it silently).</p>
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
      id: 'ton', level: 3, title: 'On-delay timer (TON)', min: 8,
      summary: 'Output comes on after the input has been on continuously for the preset time.',
      body: `
<h3>What it is</h3>
<p>A <b>TON</b> times while its rung is powered. When the elapsed time (<b>ET</b>) reaches the preset (<b>PT</b>), its <b>done bit</b> (T0, called Q or .DN) turns on. If the rung loses power, ET resets to 0 instantly.</p>
[[sim:ton]]
<div class="tbl"><table>
<tr><th>Signal</th><th>Ladder Lab</th><th>Allen-Bradley</th><th>CODESYS</th></tr>
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
<p>Point a CTU and a CTD at the <b>same</b> counter number: entries add, exits subtract. That gives a live "how many are inside" count for parking lots, buffers and accumulation conveyors.</p>
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
<li>Out-of-range raw values (below about 3.8 mA) mean a sensor fault, not a reading.</li>
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
<p>This is the ladder from the "3 Cylinder Sequential" video, rebuilt on Ladder Lab's cylinder machine. Their names map to ours like this:</p>
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
<tr><td><b>OFF</b></td><td>Nothing moves. Controls powered, outputs off.</td><td>Machine safe for cleaning or inspection (real lock-out still needs isolators).</td></tr>
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
      id: 'blocks', level: 5, title: 'Reusable blocks: write once, use many times (FC / FB)', min: 14,
      summary: 'Real programs are built from blocks: one "motor" block used for twenty motors, each call with its own wiring and its own memory. How blocks, parameters and instances work.',
      body: `
<h3>The problem blocks solve</h3>
<p>A line has twenty identical motors. Copying the same five rungs twenty times works, until you find a bug: now you fix it twenty times and miss one. A <b>block</b> holds the logic <b>once</b>. The main program <b>calls</b> it twenty times, each time connected to different inputs and outputs.</p>
<h3>The words, in every brand</h3>
<div class="tbl"><table>
<tr><th>Idea</th><th>Siemens TIA Portal</th><th>Rockwell Studio 5000</th><th>CODESYS</th><th>Ladder Lab</th></tr>
<tr><td>Main program</td><td>OB1</td><td>MainRoutine</td><td>PLC_PRG</td><td>Main program tab</td></tr>
<tr><td>Block without memory</td><td>FC</td><td>Subroutine (JSR)</td><td>FUNCTION</td><td>(a block that uses only parameters)</td></tr>
<tr><td>Block with memory</td><td>FB + instance DB</td><td>Add-On Instruction</td><td>FUNCTION_BLOCK</td><td>BLOCK + CALL with an instance name</td></tr>
<tr><td>Inputs / outputs of a block</td><td>Input / Output / InOut</td><td>Input / Output parameters</td><td>VAR_INPUT / VAR_OUTPUT</td><td>PARAM IN / OUT / INOUT</td></tr>
<tr><td>Inside the block</td><td>#Start</td><td>Start</td><td>Start</td><td>#Start</td></tr>
<tr><td>Timer done / elapsed</td><td>#Delay.Q / #Delay.ET</td><td>Delay.DN / Delay.ACC</td><td>Delay.Q / Delay.ET</td><td>#Delay.Q (or #Delay) / #Delay.ET</td></tr>
</table></div>
<h3>Parameters and memory</h3>
<ul>
<li><b>Parameters</b> are the block's "terminals": <code>IN Start</code>, <code>OUT Run</code>. Inside the block you write <b>#Start</b>, never I0.0. At the call you connect <code>Start=I0.0</code>.</li>
<li><b>Static memory</b>: any other #name you use inside (a seal-in bit #Req, a timer #Delay, a counter) belongs to the block. Every <b>instance</b> (every call with its own name) gets its own copy. Motor1's timer and Motor2's timer run independently.</li>
<li><b>Reading a timer inside a block:</b> a contact on <code>#Delay.Q</code> (or just <code>#Delay</code>, the same thing) is the timer's done output; <code>#Delay.ET</code> is its elapsed time in ms. Outside a block it is the same: <code>T0</code> = <code>T0.Q</code>. Rockwell calls the same bit <code>.DN</code> and the elapsed time <code>.ACC</code>; Ladder Lab accepts <code>.DN</code>, <code>.TT</code> and <code>.EN</code> too.</li>
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
      takeaways: ['A block holds logic once; the main program calls it many times.', 'Parameters (IN/OUT) are the block\'s terminals; inside you write #Name.', 'Static #names are the block\'s memory; each instance has its own.', 'Every call needs its own instance name.', 'Fix the block once, and every instance is fixed.'],
      mistakes: ['Copying rungs instead of making a block.', 'Using real addresses (I0.0) inside a block instead of parameters.', 'Calling two devices with the same instance name.', 'Putting the CALL behind a condition and wondering why the block "freezes".'],
      challenges: ['blk-motors', 'drive-1', 'drive-line'],
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
<li><b>Direction</b>: more output must move PV towards SP (pump faster → more pressure). Cooling loops are "reverse acting".</li>
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
<div class="callout tip">Ladder Lab's monitor view works exactly like step 1: green contacts are closed, grey ones are open, and the rung shows how far the power gets.</div>`,
      sims: {},
      takeaways: ['Inputs → modes → sequences → alarms → outputs.', 'Troubleshoot from the output backwards.'],
      mistakes: ['Forcing outputs with people near the machine.'],
      challenges: [],
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
<p>Press the <b>ST</b> button in the simulator: Ladder Lab translates every rung. Example:</p>
<pre class="code">(* Start/stop latch *)
Motor := (Start OR Motor) AND Stop AND OL;
(* 3 s on-delay *)
T0(IN := Switch, PT := T#3s);
Lamp := T0.Q;</pre>
<div class="callout where"><b>Next steps after Ladder Lab:</b> install CODESYS (free) and try its built-in simulator, or Siemens TIA Portal with PLCSIM. Recreate the challenges you solved here: same logic, real tools.</div>`,
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
<p>List what must <b>never</b> happen: valve open without a bottle, motor up and down together, heater on in an empty tank, car moving with the door open. Make sure every one is blocked by logic before you add any convenience.</p>
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
<li><code>AT %IX0.0</code> binds a variable to an address. <code>%IX</code> = input bit, <code>%QX</code> = output bit, <code>%MX</code> = memory bit, <code>%IW/%QW/%MW</code> = words, <code>%IB/%QB</code> = bytes. (Ladder Lab also accepts I0.0 / Q0.0.)</li>
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
<p>An index outside the bounds is a <b>runtime fault</b>. A real PLC stops, and Ladder Lab shows it.</p>
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
    ['Reset coil (R) / Unlatch (U, OTU)', 'Writes 0 when powered; also resets timers and counters.'],
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
    ['Offset (steady-state error)', 'The error that remains with P-only control; the I term removes it.'],
    ['Anti-windup', 'Stopping the integral term from growing while the output is clamped at 0 or 100 %.'],
    ['Duty / standby', 'Two machines for one job: the duty one runs, the standby one helps or takes over on a fault.'],
    ['Alternation (lead/lag)', 'Swapping the duty unit every cycle so both wear equally.'],
    ['Tracking', 'Remembering data about an item (measured upstream) until it reaches the station that acts on it.'],
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
  ];

  // ───────────────────────── concept quiz ─────────────────────────
  LL.QUIZ = [
    { l: 5, q: 'Why put the logic for 20 identical motors in one block instead of copying rungs?', a: ['It runs faster', 'Write and test it once; a fix reaches all 20 motors', 'Blocks use less memory', 'It is required by IEC'], c: 1, why: 'One tested block, many calls.' },
    { l: 5, q: 'Inside a block you write #Start. What is it?', a: ['An input address', 'A parameter or the block\'s own variable, connected at each call', 'A comment', 'A timer'], c: 1, why: 'The call connects #Start to a real address.' },
    { l: 5, q: 'Two CALLs of FB_Motor use the same instance name. What happens?', a: ['Nothing special', 'They share and overwrite the same memory (timers, latches)', 'The PLC goes to STOP', 'The second call is ignored'], c: 1, why: 'Instance = memory. Each device needs its own instance.' },
    { l: 5, q: 'A drive gets a run command but never reports "running". What should the program do?', a: ['Keep waiting', 'Raise an alarm after a few seconds (feedback watchdog)', 'Send fault resets in a loop', 'Increase the speed reference'], c: 1, why: 'A command without an answer is always an alarm.' },
    { l: 5, q: 'Three conveyors in a row: in which order do you start them?', a: ['Infeed first', 'All at once', 'Downstream (outfeed) first, then upstream', 'Random'], c: 2, why: 'The conveyor that takes the product must already run.' },
    { l: 5, q: 'A P controller (Ti = 0) settles 0.4 bar below the setpoint. What fixes it?', a: ['More D', 'Adding the I part (integral)', 'Lower Kp', 'A faster sensor'], c: 1, why: 'The integral keeps pushing until the error is zero.' },
    { l: 5, q: 'You raise Kp and the pressure starts to swing. Good tuning practice?', a: ['Keep it, it is fast', 'Use about half of that Kp, then add I', 'Add D at maximum', 'Set Ti to 0.1 s'], c: 1, why: 'Half of the swinging gain is a safe starting point.' },
    { l: 5, q: 'In a GRAFCET, a double horizontal line means…', a: ['an alternative (OR) branch', 'a simultaneous (AND) branch', 'the end of the program', 'an emergency stop'], c: 1, why: 'All paths run together and must all finish before the chart continues.' },
    { l: 5, q: 'When does a GRAFCET transition fire?', a: ['When its condition is true', 'When all steps above it are active AND its condition is true', 'Every scan', 'When the next step is active'], c: 1, why: 'Both rules together.' },
    { l: 5, q: 'A cylinder is visibly out, but its sensor input stays 0. Where is the fault?', a: ['In the program', 'On the input side: sensor position, sensor or cable', 'In the output card', 'In the valve'], c: 1, why: 'What you see and what the PLC sees differ on the input.' },
    { l: 5, q: 'An output is 1 in the PLC, but the valve does not move. Next check?', a: ['Rewrite the rung', 'Fuse, wire, coil voltage at the valve, air supply', 'The input sensors', 'Restart the PLC'], c: 1, why: 'The command leaves the PLC; follow it to the actuator.' },
    { l: 5, q: 'A machine only runs while STOP is held. Most likely?', a: ['START broken', 'STOP wired NO instead of NC', 'Overload tripped', 'PLC fault'], c: 1, why: 'The NC/NO contact type is wrong; rewire it, do not change the program.' },
    { l: 1, q: 'What is "bit memory" (M) in a Siemens PLC?', a: ['The program memory', 'Internal bits (auxiliary relays) your program uses to remember things', 'The input image', 'A memory card'], c: 1, why: 'M = Merker = bit memory: internal flags, not wired to anything.' },
    { l: 1, q: 'How many bits are in a word?', a: ['8', '16', '32', '4'], c: 1, why: 'Byte = 8, word = 16, double word = 32.' },
    { l: 1, q: 'The byte 0000 0101 has the value…', a: ['5', '101', '10', '3'], c: 0, why: 'Bit weights 4 + 1 = 5.' },
    { l: 1, q: 'On a real Siemens PLC, why do programs use MW10, MW12, MW14 and not MW10, MW11?', a: ['Odd numbers are not allowed', 'MW10 and MW11 overlap: both contain byte MB11', 'It is faster', 'Habit only'], c: 1, why: 'MW10 = MB10 + MB11 and MW11 = MB11 + MB12.' },
    { l: 1, q: 'The biggest value an INT (16-bit signed word) can hold is…', a: ['255', '1000', '32767', '65535'], c: 2, why: '−32768 … 32767.' },
    { l: 5, q: 'A PT100 module returns AIW4 = 1875. The temperature is…', a: ['1875 °C', '187.5 °C', '18.75 °C', 'unknown'], c: 1, why: 'Temperature modules give 0.1 °C units.' },
    { l: 5, q: 'Why is AIW6 × 300 / 27648 a bad idea with 16-bit words?', a: ['Division is not allowed', 'AIW6 × 300 overflows (more than 32767)', 'It is too slow', 'It rounds up'], c: 1, why: 'Divide first or use 32-bit / REAL maths.' },
    { l: 5, q: 'A temperature sensor is short-circuited and reads −32768. A program that does not check this will…', a: ['stop heating', 'heat forever, because it looks cold', 'show 0 °C', 'nothing happens'], c: 1, why: 'Always check impossible raw values and fail safe.' },
    { l: 5, q: 'Gross 26.10 kg, empty bag 0.85 kg. Net weight?', a: ['26.95 kg', '25.25 kg', '26.10 kg', '0.85 kg'], c: 1, why: 'Net = gross − tare.' },
    { l: 5, q: 'What is "in-flight" (preact) on a filling scale?', a: ['A bag on a conveyor', 'Material still falling when the gate closes, so the gate must close early', 'The empty bag weight', 'Vibration'], c: 1, why: 'Close the gate early by the in-flight amount; good controllers learn it.' },
    { l: 5, q: 'Why does a thermostat switch on at 195 °C and off at 205 °C instead of both at 200 °C?', a: ['To save energy', 'Hysteresis: noise around one point would make the heater chatter', 'It is required by law', 'Sensors cannot read 200'], c: 1, why: 'Two switching points = calm switching.' },
    { l: 4, q: 'A shift register (SHRB) of length 8 gets one clock pulse. What happens?', a: ['All bits become the DATA value', 'Every bit moves one place, DATA enters the first bit and the last bit is lost', 'The register is cleared', 'Only the first bit changes'], c: 1, why: 'One pulse = one shift: everything moves one place along.' },
    { l: 4, q: 'Why is SHRB almost always clocked through a P (edge) contact?', a: ['The syntax requires it', 'Otherwise it shifts on every scan while the rung is true', 'To make the PLC faster', 'To invert the data'], c: 1, why: 'A button held for 200 ms is about 20 scans: 20 shifts instead of one.' },
    { l: 4, q: 'A checker puts "bad" into bit 0 of a register clocked once per bottle. The rejector is 5 bottles further on. Which bit drives it?', a: ['bit 0', 'bit 4', 'bit 5', 'bit 6'], c: 2, why: 'Bit k holds the data from k pulses ago: 5 bottles later = bit 5.' },
    { l: 4, q: 'What should clock a tracking register on a conveyor?', a: ['A 1-second timer', 'One pulse per pocket from the conveyor (pitch cam or encoder)', 'The camera result', 'The reject output'], c: 1, why: 'Then the register stops when the conveyor stops, and the tracking stays right.' },
    { l: 4, q: 'When is a shift register NOT the right tool?', a: ['Several parts sit between the sensor and the actuator', 'You need the last three test results', 'Parts arrive at random distances and nothing gives one pulse per part', 'You want a running light'], c: 2, why: 'A shift register needs one pulse per step. Random spacing needs positions (encoder) and a list (FIFO).' },
    { l: 4, q: 'One PB2 contact drives eight RST outputs drawn in parallel in one rung. Pressing PB2…', a: ['resets only the first bit', 'resets all eight bits in the same scan', 'resets one bit per scan', 'is a double-coil error'], c: 1, why: 'Outputs in parallel all get the same power: one condition, many outputs.' },
    { l: 4, q: 'SHL of the word 3 (0000 0011) by one place gives…', a: ['1', '6', '4', '12'], c: 1, why: 'Shifting left one place doubles the value: 0000 0110 = 6.' },
    { l: 4, q: 'SHRB with a negative length…', a: ['is an error', 'shifts the other way: DATA enters the last bit', 'clears the register', 'shifts two places'], c: 1, why: 'Negative length reverses the direction (Siemens convention).' },
    { l: 1, q: 'In what order does a PLC scan work?', a: ['Write outputs → solve → read inputs', 'Read inputs → solve rungs top to bottom → write outputs', 'Solve rungs whenever an input changes', 'Solve rungs bottom to top'], c: 1, why: 'Inputs are copied first, rungs solved in order, outputs written at the end.' },
    { l: 1, q: 'A normally-open contact -| |- passes power when its bit is…', a: ['0', '1', 'changing', 'forced'], c: 1, why: 'NO contact = "is the bit 1?".' },
    { l: 1, q: 'Two contacts in series represent…', a: ['OR', 'AND', 'XOR', 'NOT'], c: 1, why: 'Power must pass through both.' },
    { l: 1, q: 'Two contacts in parallel represent…', a: ['AND', 'OR', 'NAND', 'a latch'], c: 1, why: 'Either path lets power through.' },
    { l: 1, q: 'I0.3 means…', a: ['Input 0.3 volts', 'Input byte 0, bit 3', 'Output 3', 'Timer 3'], c: 1, why: 'Siemens addressing: byte.bit.' },
    { l: 1, q: 'A STOP button is wired NC. Nobody touches it. Its input bit is…', a: ['0', '1', 'undefined', 'it depends on the program'], c: 1, why: 'The NC contact is closed at rest, so 24 V reaches the input.' },
    { l: 1, q: 'In the motor run rung, a STOP button that is wired NC should be programmed as…', a: ['NC contact -|/|-', 'NO contact -| |-', 'a SET coil', 'a P edge contact'], c: 1, why: 'You want to pass power while the bit is 1 (not pressed).' },
    { l: 1, q: 'Why are stop buttons wired NC?', a: ['They are cheaper', 'A broken wire then acts like a stop: fail-safe', 'PLCs can only read NC', 'It makes the program shorter'], c: 1, why: 'Loss of signal = stop.' },
    { l: 1, q: 'What does a coil -( )- do when its rung loses power?', a: ['Keeps its last value', 'Writes 0 to its bit', 'Toggles', 'Nothing until reset'], c: 1, why: 'A normal coil writes the rung result every scan.' },
    { l: 1, q: 'Which IEC address equals Siemens Q0.0?', a: ['%IX0.0', '%QX0.0', '%MX0.0', 'Q:0/0'], c: 1, why: 'Q = output, X = bit.' },
    { l: 2, q: 'The holding (seal-in) contact in a start/stop rung is…', a: ['the STOP button', 'a contact of the output itself in parallel with START', 'a timer', 'an edge contact'], c: 1, why: 'The output keeps its own rung alive.' },
    { l: 2, q: 'START and STOP are pressed at the same time on a standard seal-in rung. The motor…', a: ['starts', 'stays off: stop-dominant', 'toggles', 'faults'], c: 1, why: 'STOP is in series with everything.' },
    { l: 2, q: 'After a power failure, a seal-in motor circuit…', a: ['restarts automatically', 'stays off until START is pressed again', 'runs in reverse', 'depends on the scan time'], c: 1, why: 'The coil is off at power-up, so the seal is open.' },
    { l: 2, q: 'SET is in rung 4, RESET for the same bit in rung 9, and both are true. The bit ends up…', a: ['1', '0', 'flickering', 'undefined'], c: 1, why: 'The later rung wins.' },
    { l: 2, q: 'How do you interlock forward K1 and reverse K2?', a: ['NO contact of K2 in K1 rung', 'NC contact of K2 in the K1 rung and NC of K1 in the K2 rung', 'A timer between them', 'Use SET coils'], c: 1, why: 'Each blocks the other.' },
    { l: 2, q: 'A software interlock is enough to prevent a dangerous short circuit.', a: ['True', 'False: add hardware (and mechanical) interlocks'], c: 1, why: 'Programs can be wrong or forced; hardware protection is independent.' },
    { l: 2, q: 'A rising edge contact -|P|- is true for…', a: ['as long as the bit is 1', 'exactly one scan when the bit goes 0→1', '1 second', 'until reset'], c: 1, why: 'One-shot.' },
    { l: 2, q: 'Two rungs both have COIL(Q0.0). What happens?', a: ['They are OR-ed', 'Only the lower rung\'s result reaches the output', 'PLC faults', 'They are AND-ed'], c: 1, why: 'Double coil: the last write wins.' },
    { l: 2, q: 'Why use memory bits (M)?', a: ['They are faster than inputs', 'To store states and reuse intermediate results', 'Because outputs are limited to 8', 'They survive power loss always'], c: 1, why: 'Internal relays structure your logic.' },
    { l: 2, q: 'A one-button ON/OFF toggle needs…', a: ['a normal contact only', 'an edge pulse plus XOR with the output', 'a TOF timer', 'two coils for the same output'], c: 1, why: 'Otherwise it toggles every scan while held.' },
    { l: 3, q: 'TON with PT = 5 s. Input on for 3 s, off, on again for 3 s. Output?', a: ['Turns on after the second 2 s', 'Never turns on', 'On for 1 s', 'On immediately'], c: 1, why: 'TON resets when the input drops.' },
    { l: 3, q: 'Which timer keeps a fan running for a while after the light switch goes off?', a: ['TON', 'TOF', 'TP', 'CTU'], c: 1, why: 'Off-delay.' },
    { l: 3, q: 'Which timer keeps accumulated time after its input drops?', a: ['TON', 'TOF', 'RTO / TONR', 'TP'], c: 2, why: 'Retentive; needs a RESET.' },
    { l: 3, q: 'You need a fixed 2 s solenoid kick no matter how long the button is held. Use…', a: ['TON', 'TP', 'TOF', 'CTD'], c: 1, why: 'Pulse timer.' },
    { l: 3, q: 'T0.ET is…', a: ['the done bit', 'the elapsed time', 'the preset', 'the enable bit'], c: 1, why: 'ET = elapsed time (ACC in Allen-Bradley).' },
    { l: 3, q: 'A cheap way to flash a lamp at 1 Hz on Siemens S7-200 is…', a: ['SM0.0', 'SM0.1', 'SM0.5', 'I0.0'], c: 2, why: 'SM0.5 toggles every 0.5 s.' },
    { l: 3, q: 'Why does a star-delta starter exist?', a: ['To reverse a motor', 'To reduce starting current of large motors', 'To brake', 'To count revolutions'], c: 1, why: 'Star start ≈ ⅓ current.' },
    { l: 3, q: 'Debouncing a flickering sensor is usually done with…', a: ['a short TON on the sensor signal', 'a CTU', 'a SET coil', 'a double coil'], c: 0, why: 'Only believe it once it is stable for a few ms.' },
    { l: 3, q: 'A timeout timer on a cylinder move is used to…', a: ['make it faster', 'detect when it fails to arrive', 'count strokes', 'save energy'], c: 1, why: 'Turns a silent hang into an alarm.' },
    { l: 4, q: 'A CTU counts…', a: ['every scan its input is on', 'rising edges of its input', 'seconds', 'falling edges only'], c: 1, why: 'Edge detection is built in.' },
    { l: 4, q: 'CTU with PV 5 and CV 5. The done bit is…', a: ['0', '1'], c: 1, why: 'Done at CV ≥ PV.' },
    { l: 4, q: 'How do you count cars inside a car park with one counter?', a: ['CTU on entry, RESET on exit', 'CTU on entry and CTD on exit with the same counter number', 'Two TON timers', 'Not possible'], c: 1, why: 'Up/down counting.' },
    { l: 4, q: 'NO(button) → ADD MW0 + 1 → MW0. Pressing once for 0.3 s adds…', a: ['1', 'about 1 per scan, so dozens', '0', '0.3'], c: 1, why: 'Math boxes run every scan while powered. Use an edge contact.' },
    { l: 4, q: 'A compare contact CMP(C0.CV >= 3) passes power when…', a: ['C0 is done', 'the counter value is 3 or more', 'C0 was reset', 'always'], c: 1, why: 'It compares numbers.' },
    { l: 4, q: 'A PNP sensor should be connected to…', a: ['a sinking input card', 'a sourcing input card', 'an output card', 'any card'], c: 0, why: 'PNP sources current; the input must sink it.' },
    { l: 4, q: 'A single-solenoid spring-return valve, when the PLC output turns off…', a: ['stays where it is', 'returns to its rest position', 'locks', 'faults'], c: 1, why: 'The spring pushes it back.' },
    { l: 4, q: 'Which sensor detects a cylinder piston magnet?', a: ['Photo-eye', 'Reed switch', 'Thermocouple', 'Encoder'], c: 1, why: 'Reed switches on the barrel see the magnet.' },
    { l: 4, q: 'A 4–20 mA transmitter reads 0 mA. Most likely…', a: ['the tank is empty', 'the wire is broken or the transmitter failed', 'the value is negative', 'it is 50 %'], c: 1, why: '0 % is 4 mA (live zero), so 0 mA means a fault.' },
    { l: 4, q: 'AIW0 = 19200 on a 6400…32000 (4–20 mA) input. The level is…', a: ['25 %', '50 %', '60 %', '75 %'], c: 1, why: '(19200 − 6400) ÷ 256 = 50.' },
    { l: 4, q: 'Why compute (AIW0 − 6400) ÷ 256 instead of (AIW0 − 6400) × 100 ÷ 25600 in 16-bit math?', a: ['It is more accurate', 'The ×100 would overflow a 16-bit word', 'Division is required first by IEC', 'No reason'], c: 1, why: '25600 × 100 is far above 32767.' },
    { l: 5, q: 'A P-only level controller settles a bit below the setpoint. This is…', a: ['a wiring fault', 'the proportional offset; add an I term', 'integral windup', 'normal for PID'], c: 1, why: 'P needs some error to hold the valve open; I removes it.' },
    { l: 5, q: 'In a duty/standby pump station, alternation means…', a: ['both pumps always run together', 'swapping which pump is duty after each cycle', 'running a pump in reverse', 'alternating 50 Hz'], c: 1, why: 'Equal wear on both pumps.' },
    { l: 5, q: 'In Structured Text, which line assigns a value?', a: ['Motor = TRUE;', 'Motor := TRUE;', 'Motor == TRUE;', 'SET Motor;'], c: 1, why: ':= assigns; = compares.' },
    { l: 5, q: 'WHILE NOT Sensor DO END_WHILE; inside a PLC program will…', a: ['wait for the sensor', 'hang until the watchdog stops the PLC', 'skip the loop', 'run once per scan'], c: 1, why: 'Inputs are not re-read during a scan, so the loop never ends.' },
    { l: 5, q: 'You need to sum 10 values in an array. Best ST construct?', a: ['CASE', 'FOR', 'WHILE NOT done', 'R_TRIG'], c: 1, why: 'A known number of repetitions: FOR.' },
    { l: 5, q: 'In a CASE state machine, how does a step "wait" for a sensor?', a: ['WHILE loop', 'It does not change Step until the sensor is TRUE; the CASE runs again next scan', 'A delay function', 'GOTO'], c: 1, why: 'The scan cycle repeats the CASE; the step changes only when its condition is true.' },
    { l: 5, q: 'How do you use a TON in ST?', a: ['TON(Switch, 3);', 'Declare T1 : TON; call T1(IN := Switch, PT := T#3s); read T1.Q', 'T1 := TON(Switch);', 'IF Switch THEN WAIT(3s);'], c: 1, why: 'Function blocks are instances: declare, call each scan, read outputs.' },
    { l: 5, q: 'Why use a step-number state machine for sequences?', a: ['It uses less memory', 'One active step, easy to debug, extend and show on an HMI', 'It is required by law', 'It is faster'], c: 1, why: 'Clear structure; maps to SFC and CASE.' },
    { l: 5, q: 'A transition rung in a step state machine looks like…', a: ['CMP(MW0==2) AND condition → MOV 3 → MW0', 'MW0 → coil', 'TON → MW0', 'SET MW0'], c: 0, why: 'In step 2, when condition, go to step 3.' },
    { l: 5, q: 'An emergency stop should…', a: ['only be a PLC input', 'cut dangerous energy through a safety relay or safety PLC', 'pause the program', 'be a software flag'], c: 1, why: 'Safety must not depend on standard program logic.' },
    { l: 5, q: 'SM0.1 / first-scan bit is used to…', a: ['flash lamps', 'initialise steps and values after power-up', 'count scans', 'stop the PLC'], c: 1, why: 'On only during the first scan.' },
    { l: 5, q: 'Tank pump: start at LOW, stop at HIGH, stay off between. This behaviour is called…', a: ['interlock', 'hysteresis', 'debounce', 'double coil'], c: 1, why: 'Two thresholds prevent rapid cycling.' },
    { l: 5, q: 'When troubleshooting a stopped machine online, start at…', a: ['the first rung', 'the output that should be on, then find the open contact', 'the HMI', 'the power supply'], c: 1, why: 'Work backwards from the output.' },
    { l: 5, q: 'Which IEC language is best for heavy math and loops?', a: ['LD', 'ST', 'IL', 'SFC'], c: 1, why: 'Structured Text.' },
    { l: 5, q: 'Forcing an output while people are near the machine is…', a: ['fine for testing', 'dangerous: it can move machinery unexpectedly', 'impossible', 'required'], c: 1, why: 'Forces bypass logic and interlocks.' },
    // ── extra bank ──
    { l: 1, q: 'What does PLC stand for?', a: ['Programmable Logic Controller', 'Process Line Computer', 'Power Logic Circuit', 'Programmed Load Contactor'], c: 0, why: 'An industrial computer for control.' },
    { l: 1, q: 'In a ladder diagram, power is imagined flowing…', a: ['from the left rail to the right rail', 'from right to left', 'from the coil to the contacts', 'only downwards'], c: 0, why: 'Left rail = live, right rail = neutral.' },
    { l: 1, q: 'A rung has NO(A) in series with NC(B). The output is ON when…', a: ['A = 1 and B = 0', 'A = 0 and B = 1', 'A = 1 and B = 1', 'either is 1'], c: 0, why: 'NO passes on 1, NC passes on 0, series = AND.' },
    { l: 1, q: 'Which device is normally wired NC?', a: ['Stop / emergency stop button', 'Start button', 'Jog button', 'Lamp test button'], c: 0, why: 'A broken wire must act like a stop.' },
    { l: 1, q: 'How many bits are in one byte (I0.0 … I0.7)?', a: ['8', '16', '4', '10'], c: 0, why: 'Bits 0 to 7.' },
    { l: 1, q: 'Two NC contacts in series (NOT A AND NOT B) equal…', a: ['NOT (A OR B)', 'NOT (A AND B)', 'A OR B', 'A AND B'], c: 0, why: 'De Morgan: off only when neither is on.' },
    { l: 1, q: 'A staircase light switched from two places (either switch changes it) is…', a: ['XOR', 'AND', 'OR', 'NAND'], c: 0, why: 'On when exactly one switch is on.' },
    { l: 1, q: 'Two NO contacts in parallel feeding a coil. Both inputs are 0. The coil is…', a: ['OFF', 'ON', 'flickering', 'undefined'], c: 0, why: 'No path is closed.' },
    { l: 2, q: 'Two start buttons and two stop buttons for one motor: how are they placed?', a: ['Starts in parallel, stops in series', 'Starts in series, stops in parallel', 'All in series', 'All in parallel'], c: 0, why: 'Any start can start; any stop must break the circuit.' },
    { l: 2, q: 'Why seal in a jog/run motor with a memory bit instead of the output?', a: ['So a jog press cannot latch the motor', 'Memory bits are faster', 'Outputs cannot be used as contacts', 'To save outputs'], c: 0, why: 'If the output seals itself in, a jog would latch too.' },
    { l: 2, q: 'A rising-edge P contact on a button held for 2 s is TRUE for…', a: ['one scan', '2 s', 'until released', 'forever'], c: 0, why: 'Edges last exactly one scan.' },
    { l: 2, q: 'Why add a hardware interlock between K1 and K2 when the program already has one?', a: ['It works even if the PLC or program fails', 'It is faster', 'Programs cannot interlock', 'It is cheaper'], c: 0, why: 'Independent protection.' },
    { l: 2, q: 'STOP is only in the seal-in branch, not in series with START. Holding START…', a: ['keeps the motor running even while STOP is pressed', 'stops it', 'faults the PLC', 'has no effect'], c: 0, why: 'The START path bypasses STOP. A classic bug.' },
    { l: 2, q: 'A one-button toggle needs an edge because…', a: ['otherwise it toggles every scan while held', 'buttons are NC', 'coils need edges', 'it saves memory'], c: 0, why: 'A level signal is true for many scans.' },
    { l: 3, q: 'TOF with PT = 5 s. The input goes OFF. The output turns off…', a: ['5 s later', 'immediately', '5 s after the input went ON', 'never'], c: 0, why: 'Off-delay.' },
    { l: 3, q: 'Delay a motor start by 10 s after START: use…', a: ['TON', 'TOF', 'TP', 'CTU'], c: 0, why: 'On-delay.' },
    { l: 3, q: 'A flasher made of two 0.5 s timers has a period of about…', a: ['1 s', '0.5 s', '2 s', '0.25 s'], c: 0, why: '0.5 s off + 0.5 s on.' },
    { l: 3, q: 'Staircase light that restarts its 5 s at every press: best timer?', a: ['TOF fed by the buttons', 'TON', 'RTO', 'CTD'], c: 0, why: 'A TOF restarts whenever its input comes on again.' },
    { l: 3, q: 'In Ladder Lab, T0.ET is measured in…', a: ['milliseconds', 'seconds', 'minutes', 'scans'], c: 0, why: '3 s = 3000.' },
    { l: 3, q: 'Starting three conveyors 2 s apart mainly avoids…', a: ['adding up the inrush currents', 'boxes falling off', 'scan time problems', 'double coils'], c: 0, why: 'Big motors draw 6–8× current when starting.' },
    { l: 3, q: 'A single timer that resets itself (NC of its own done bit) gives…', a: ['a one-scan pulse every PT', 'a 50 % flasher', 'nothing', 'a latch'], c: 0, why: 'Done for one scan, then reset.' },
    { l: 4, q: 'CTD with PV = 4 after 4 pulses: CV and done bit?', a: ['CV 0, done ON', 'CV 4, done OFF', 'CV −4, done ON', 'CV 0, done OFF'], c: 0, why: 'Counts down from PV, done at ≤ 0.' },
    { l: 4, q: 'Three lamps at 1 s, 2 s, 3 s from ONE timer: how?', a: ['Compare instructions on T0.ET', 'Three coils on T0', 'A CTU', 'MOV only'], c: 0, why: 'ET ≥ 1000, ≥ 2000, ≥ 3000.' },
    { l: 4, q: '2-out-of-3 voting is used to…', a: ['avoid nuisance trips from one faulty sensor while staying safe', 'save sensors', 'count faster', 'reduce scan time'], c: 0, why: 'One bad sensor can neither trip nor block the trip alone.' },
    { l: 4, q: 'A 4–20 mA wire breaks. AIW0 reads about…', a: ['0, far below 6400', '32000', '6400', '16000'], c: 0, why: 'No current at all.' },
    { l: 4, q: '0–50 °C on 6400…32000: how many counts per °C?', a: ['512', '256', '640', '100'], c: 0, why: '25600 ÷ 50.' },
    { l: 4, q: 'A counter input is held ON for 3 s. How many counts does a CTU add?', a: ['1', '300', '3', '0'], c: 0, why: 'Counters count rising edges, not scans.' },
    { l: 4, q: 'Heater on below 20 °C and off at 22 °C. The 2 °C gap prevents…', a: ['rapid on/off switching (chattering)', 'overheating', 'sensor faults', 'double coils'], c: 0, why: 'Hysteresis.' },
    { l: 5, q: 'In a step sequence, what normally ends a step?', a: ['A transition condition, usually a sensor confirming the move', 'Always a fixed time', 'The scan ending', 'Pressing START again'], c: 0, why: 'Confirm, then move on.' },
    { l: 5, q: '"Cycle stop" means…', a: ['finish the current cycle, then stop at home', 'stop instantly', 'cut the power', 'pause and resume'], c: 0, why: 'Machines stop in a known state.' },
    { l: 5, q: 'Why does STOP during drilling retract the drill instead of just freezing?', a: ['To leave the machine in a safe, known state', 'It is faster', 'To save energy', 'Freezing is not possible'], c: 0, why: 'A drill left inside the part is a problem for restart.' },
    { l: 5, q: 'A dwell (hold the stamp down 2 s) is made with…', a: ['a TON in the dwell step', 'a CTU', 'a P contact', 'MOV only'], c: 0, why: 'Time-based transition.' },
    { l: 5, q: 'Why number steps 10, 20, 30 instead of 1, 2, 3?', a: ['To insert steps later without renumbering', 'It runs faster', 'IEC requires it', 'It saves memory'], c: 0, why: 'Step 15 fits between 10 and 20.' },
    { l: 5, q: 'A timeout timer on each step lets you…', a: ['detect a stuck move and raise an alarm', 'run faster', 'skip steps', 'save outputs'], c: 0, why: 'Silent hangs become clear alarms.' },
    { l: 6, q: 'Duty/standby alternation toggles the duty pump on…', a: ['the falling edge of the demand (end of each pumping cycle)', 'every scan', 'the start button', 'a 1 Hz clock'], c: 0, why: 'One swap per cycle.' },
    { l: 6, q: 'A compressor "run-on" (idle) timer is there to…', a: ['limit the number of motor starts', 'raise the pressure', 'cool the air', 'save the valve'], c: 0, why: 'Idling is better than restarting too often.' },
    { l: 6, q: 'Why start a compressor unloaded?', a: ['Lower starting torque and current', 'It is quieter', 'To build pressure faster', 'To test the valve'], c: 0, why: 'Load only once the motor is up to speed.' },
    { l: 6, q: 'The "next-state" pattern (compute MW2, copy to MW0 at the end) prevents…', a: ['one event cascading through several states in one scan', 'double coils', 'scan overruns', 'counter overflow'], c: 0, why: 'All transitions read the same state.' },
    { l: 6, q: 'Filling & capping: station 2 counts as done when…', a: ['there is no bottle at the capper OR the cap is done', 'the filler is done', 'the conveyor stopped', 'START is pressed'], c: 0, why: 'An OR branch makes parallel stations work.' },
    { l: 6, q: 'Palletizer with rows of 3, 2 rows per layer and 3 layers: boxes per pallet?', a: ['18', '9', '6', '12'], c: 0, why: '3 × 2 × 3.' },
    { l: 6, q: 'Why does the crane keep its magnet on during STOP?', a: ['Releasing it would drop the load', 'To save energy', 'The magnet cannot turn off', 'To cool the magnet'], c: 0, why: 'STOP must not create a new danger.' },
    { l: 6, q: 'A washing machine door must stay locked while…', a: ['there is water inside or the drum turns', 'the lamp is on', 'the heater is off', 'always'], c: 0, why: 'Flood and injury protection.' },
    { l: 6, q: '"Tracking" in the box sorter means…', a: ['remembering data about an item until it reaches the next station', 'following a box with a camera', 'counting boxes', 'measuring speed'], c: 0, why: 'Measure upstream, act downstream.' },
    { l: 6, q: 'A sliding gate is closing and the photocell is blocked. It should…', a: ['reverse and open', 'keep closing', 'stop forever', 'speed up'], c: 0, why: 'Never close onto a car or person.' },
    { l: 7, q: 'Lamp := Motor; in ladder is…', a: ['one NO contact Motor driving coil Lamp', 'a SET coil', 'an NC contact', 'a timer'], c: 0, why: 'A plain assignment = contact + coil.' },
    { l: 7, q: 'IF A THEN Q := TRUE; END_IF on its own behaves like…', a: ['a SET coil', 'a normal coil', 'a reset', 'a timer'], c: 0, why: 'Nothing ever writes FALSE.' },
    { l: 7, q: 'IF Button THEN Count := Count + 1; END_IF adds…', a: ['1 every scan while the button is held', '1 per press', 'nothing', '10'], c: 0, why: 'Use R_TRIG for once per press.' },
    { l: 7, q: 'Which keyword leaves a FOR or WHILE loop early?', a: ['EXIT', 'BREAK', 'STOP', 'END'], c: 0, why: 'EXIT; RETURN leaves the whole program for this scan.' },
    { l: 7, q: 'FOR i := 1 TO Count DO … with Count = 0 runs…', a: ['zero times', 'once', 'forever', 'it is an error'], c: 0, why: 'Start is already past the end.' },
    { l: 7, q: 'Avg := Sum / 10; with INT Sum = 57 gives…', a: ['5', '5.7', '6', '57'], c: 0, why: 'Integer division truncates.' },
    { l: 7, q: 'ARRAY[0..9] OF INT has how many elements?', a: ['10', '9', '11', '0'], c: 0, why: '0 to 9 inclusive.' },
    { l: 7, q: 'Idx := (Idx + 1) MOD 10; is used for…', a: ['a ring-buffer index that wraps from 9 to 0', 'dividing by 10', 'rounding', 'a timer'], c: 0, why: 'MOD gives the remainder.' },
    { l: 7, q: 'R_TRIG(CLK := Btn); its output .Q is TRUE…', a: ['for one call/scan on a rising edge', 'while Btn is held', 'on release', 'always'], c: 0, why: 'Rising-edge detector.' },
    { l: 7, q: 'In CODESYS, %IX0.3 means…', a: ['input bit 0.3', 'output bit 0.3', 'memory word 3', 'analog input 3'], c: 0, why: 'I = input, X = bit.' },
    { l: 7, q: 'Why call timer blocks every scan, not inside an IF?', a: ['So they see IN go FALSE and reset', 'It is faster', 'IF cannot contain blocks', 'To save memory'], c: 0, why: 'A block that is not called is frozen.' },
    { l: 7, q: 'WHILE i < 4 AND Occ[i] DO … faults when i reaches 4 because…', a: ['ST evaluates both sides of AND and reads Occ[4] out of range', 'WHILE cannot use AND', 'i is a BOOL', 'arrays start at 1'], c: 0, why: 'No short-circuit evaluation.' },
    { l: 7, q: 'Which type holds the literal T#3s?', a: ['TIME', 'INT', 'BOOL', 'REAL'], c: 0, why: 'Durations are TIME.' },
    { l: 6, q: 'A barcode scanner on a tool fixture is triggered by the PLC. When should the PLC evaluate the code word?', a: ['While the "read OK" status bit is on', 'Immediately when it sets the trigger', 'Any time, the word is always valid', 'Only after power-up'], c: 0, why: 'The data is only valid together with its status bit.' },
    { l: 6, q: 'The scanner reads code 3003, which is not in the tool table. The PLC should…', a: ['raise an "unknown tool" alarm and not start', 'run the Tool A sequence', 'ignore it and wait', 'run the last tool\'s sequence'], c: 0, why: 'Poka-yoke: unknown means stop and tell the operator.' },
    { l: 6, q: 'After a tool change, the PLC must…', a: ['read the tool identity again before any cycle', 'keep the old tool number', 'start immediately', 'reset the part counters'], c: 0, why: 'Never assume the tool did not change.' },
    { l: 6, q: 'Recipe-driven programming means…', a: ['one generic sequence; tool differences live in data tables', 'one program per tool', 'the HMI runs the sequence', 'using only timers'], c: 0, why: 'Adding a tool = adding data, not a new sequence.' },
    { l: 6, q: 'An HMI shows "Tool B ready". Where does that text usually come from?', a: ['The PLC writes a message number; the HMI text list turns it into words', 'The PLC sends the text letter by letter', 'The scanner', 'The HMI decides on its own'], c: 0, why: 'Status words + text lists.' },
    { l: 6, q: 'Why keep STOP as a hard-wired button even on a machine with a touch HMI?', a: ['Safety functions must not depend on a screen or network', 'Touch screens cannot have buttons', 'It is cheaper', 'HMIs are read-only'], c: 0, why: 'Hard-wired is independent and always available.' },
    { l: 6, q: 'Tool A has 3 clamps, Tool B has 6. What protects the missing clamp ports on Tool A?', a: ['A "fitted" mask so only existing clamps are driven', 'Nothing is needed', 'A slower scan', 'An HMI message'], c: 0, why: 'Only drive what the tool actually has.' },
    { l: 7, q: 'In a CASE state machine, why can a button press not jump two states in one scan?', a: ['CASE runs only one branch per scan', 'Buttons are too slow', 'CASE has a delay', 'It can'], c: 0, why: 'One branch, then the scan continues after END_CASE.' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
