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
      challenges: ['two-hand', 'hall-light', 'permissive'],
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
      challenges: ['start-stop', 'fix-stop'],
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
<tr><td>Done</td><td>T0</td><td>T0.DN</td><td>T0.Q</td></tr>
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
      challenges: ['delay-on'],
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
      challenges: ['fan-overrun', 'one-pulse', 'service-hours'],
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
      challenges: ['flasher'],
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
      challenges: ['traffic', 'star-delta'],
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
      challenges: ['count-boxes', 'parking'],
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
      challenges: ['compare', 'math'],
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
      challenges: ['analog-scale'],
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
      challenges: ['level-control', 'tank'],
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
      challenges: ['cylinders-abc'],
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
      challenges: ['step-machine'],
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
      challenges: ['tank', 'garage'],
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
      challenges: ['ped-crossing', 'bottling', 'mixer', 'elevator', 'sorter', 'carwash', 'pump-station', 'level-control'],
    },
  ];

  // Programs opened in the full simulator from lessons
  LL.OPEN_PROGRAMS = {
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
    ['Watchdog / timeout', 'Timer that flags a fault when an expected event doesn\'t happen in time.'],
    ['Hysteresis', 'Switching on and off at different thresholds (low/high level) to prevent rapid cycling.'],
    ['HMI', 'Human-Machine Interface: touch panel showing machine state and accepting operator commands.'],
    ['SCADA', 'Supervisory system that monitors many PLCs across a plant.'],
    ['Jog / inching', 'Running a motor only while a button is held, with no latch. Used for setup.'],
  ];

  // ───────────────────────── concept quiz ─────────────────────────
  LL.QUIZ = [
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
    { l: 5, q: 'Why use a step-number state machine for sequences?', a: ['It uses less memory', 'One active step, easy to debug, extend and show on an HMI', 'It is required by law', 'It is faster'], c: 1, why: 'Clear structure; maps to SFC and CASE.' },
    { l: 5, q: 'A transition rung in a step state machine looks like…', a: ['CMP(MW0==2) AND condition → MOV 3 → MW0', 'MW0 → coil', 'TON → MW0', 'SET MW0'], c: 0, why: 'In step 2, when condition, go to step 3.' },
    { l: 5, q: 'An emergency stop should…', a: ['only be a PLC input', 'cut dangerous energy through a safety relay or safety PLC', 'pause the program', 'be a software flag'], c: 1, why: 'Safety must not depend on standard program logic.' },
    { l: 5, q: 'SM0.1 / first-scan bit is used to…', a: ['flash lamps', 'initialise steps and values after power-up', 'count scans', 'stop the PLC'], c: 1, why: 'On only during the first scan.' },
    { l: 5, q: 'Tank pump: start at LOW, stop at HIGH, stay off between. This behaviour is called…', a: ['interlock', 'hysteresis', 'debounce', 'double coil'], c: 1, why: 'Two thresholds prevent rapid cycling.' },
    { l: 5, q: 'When troubleshooting a stopped machine online, start at…', a: ['the first rung', 'the output that should be on, then find the open contact', 'the HMI', 'the power supply'], c: 1, why: 'Work backwards from the output.' },
    { l: 5, q: 'Which IEC language is best for heavy math and loops?', a: ['LD', 'ST', 'IL', 'SFC'], c: 1, why: 'Structured Text.' },
    { l: 5, q: 'Forcing an output while people are near the machine is…', a: ['fine for testing', 'dangerous: it can move machinery unexpectedly', 'impossible', 'required'], c: 1, why: 'Forces bypass logic and interlocks.' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
