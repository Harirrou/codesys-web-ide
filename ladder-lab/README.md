# Ladder Lab

Learn PLC ladder logic from beginner to advanced, by building and testing it, not memorising it.
A zero-dependency web app (works offline, installable on phones as a PWA).

| Section | What you get |
|---|---|
| **Explore by topic** | On Home, 24 topic cards, each with its own icon: ladder basics, latches & memory, timers, counters & maths, blocks & structure, sequences & modes, pneumatic cylinders, hydraulics, motors & drives, motor starting circuits, motion & servos, analog & PID, machine safety, alarms & HMI, data / recipes / strings, networks & communication, hardware & going online, commissioning & fault finding, production data & clock, Structured Text, whole machines, real software & brands, interview preparation. Each opens a topic page with everything about it in one place: lessons in order (with simulator / animation marks), practice tasks, machines to open in the Lab, and quiz buttons with that topic selected. Topic chips also on the Learn page and on every lesson. |
| **Learn** | 74 lessons in 7 levels (Foundations → Memory & motor control → Timers → Counters & data → Sequences & pro practice → Real-world projects → Structured Text). Each covers *what / why / where*, with live examples you can press, common mistakes and takeaways. |
| **Lab** | A ladder editor + PLC simulator (real scan cycle, step-by-step scan mode, power-flow monitoring, lint for double coils, etc.) driving 55 animated machines: trainer panel, a worn operator panel (bouncing buttons, noisy knob), reversing motor, conveyor, tank, traffic crossing, 3 pneumatic cylinders, a hydraulic press with its power unit (pump started unloaded, oil level / temperature / filter, 4/3 closed-centre valve, fast / slow / press on pressure, decompression, two-hand control), a hydraulic accumulator charging station with clamps (140 / 160 bar hysteresis, dump valve), a pick & place station (ejector, 5/3 X axis stopped by station sensors, bistable Z valve, vacuum gripper, metal/plastic sorting), garage door, parking lot, star-delta starter, a stator resistance starter (start resistors that burn if the bypass does not close, bypass feedback, welded contacts), an autotransformer starter (65 % tap, closed transition), a slip-ring motor with rotor resistance in three steps (each machine with a live ammeter and current trend), a pump with a soft starter and bypass contactor, a conveyor drive on a fieldbus (control word and status word shown bit by bit, simplified PROFIdrive: 16#047E ready, 16#047F run, acknowledge on bit 7, setpoint 16384 = 100 %), a hydraulic axis with a proportional valve and position transducer, a Modbus RTU line on RS-485 (master module with REQ / DONE / ERROR, temperature controller and energy meter, every frame shown in hex with its CRC), a production cell with andon light (counters, downtime, OEE), a factory building on the PLC clock (shift bell, heating and light schedules), bottle filling line, batch mixer, 3-floor elevator, a 5-floor building elevator (car and hall calls with lamps, collective selective control, two-speed hoist with slow-down vanes, door operator with photo-eye, overload, inspection, fire service), box sorter, an inspection conveyor with part tracking (pitch cam, camera, label printer, reject jet), car wash, two-pump station, analog level tank (4–20 mA in, control valve out), a heat-treatment furnace (PT100, setpoint knob, safety trip, blower on a drive), a bag-filling scale (load cell, coarse/fine, in-flight), a conveyor line with 3 variable-speed drives, a booster pump station for PID control, a two-axis servo gantry (motion control: homing, positioning, pick and place, drive faults), a safety cell (with a safety relay, or with a safety PLC: two-channel E-stop and guard door, contactor feedback), a palletizer exit with a safety light curtain (OSSD1/OSSD2, restart interlock, sequential muting with a muting lamp), a labelling line (barcode reader → print-and-apply printer with a running serial → check scanner, HMI text list), a servo axis station with a touch HMI (manual jog, set home, teach-in, parameters, auto cycle), a pump station alarm panel (horn, ACK, first-out), a cut-to-length line with an encoder and a high-speed counter, two machines handing over parts over a network (heartbeat, handshake, data), drilling station, industrial oven, washing machine, overhead crane, rotary indexing table, greenhouse climate, sliding gate, air compressor station, filling & capping line, palletizer, and a flexible fixture station with 3 barcode-identified tools (3, 6 and 4 clamps), an OFF / MAN / AUTO mode selector and a small touch HMI. The cylinders also have a mode selector and jog buttons. Every machine has a **How it works** page with its I/O list and one-click loading of a working, commented ladder (and ST) program. An **Other brands** window shows the program for Siemens TIA Portal (SCL), Rockwell Studio 5000 (rung text), Schneider Machine Expert, Beckhoff TwinCAT 3, Omron Sysmac Studio, Omron CX-Programmer (mnemonics) and IEC Structured Text, with a cross-brand instruction table. |
| **Structured Text** | A real IEC 61131-3 ST runner in the Lab (switch Ladder ↔ ST): VAR/AT, IF, CASE, FOR, WHILE, REPEAT, EXIT, arrays, TON/TOF/TP/CTU/CTD/R_TRIG/F_TRIG/RS/SR, SHL/SHR/ROL/ROR, a watchdog for runaway loops, compile errors as you type. |
| **Guided path** | Four ordered paths: **Interview preparation** (65 tasks: the classic PLC interview tasks and questions: quiz buzzer, reversing with a pause, sequential start / reverse stop, test bench, 24-hour clock, people counter, hydraulic accumulator charging and press, plus warm-ups, bug fixing, whole machines and senior topics), **Ladder beginner → advanced** (all 192 ladder tasks in 28 stages, each with the lessons to read first), **Sequence mastery** (one cylinder → complete pick & place station) and **Structured Text**. Progress, "continue" button and "next in the path" after every passed task. |
| **Pro tools** | Reusable blocks: FB (with instances) and FC (no memory), block tabs, interface editor, monitoring per instance, and a **Names as** selector that shows blocks, parameters and calls in the words of TIA Portal, Studio 5000, CODESYS, Schneider Machine Expert, TwinCAT 3 or Omron Sysmac. Motion control with PLCopen-style instructions (MC_Power, MC_Home, MC_MoveAbsolute, MC_MoveRelative, MC_Jog, MC_Stop, MC_Reset) on servo axes, PID instruction, data blocks (DB sections with fields, arrays and an index word, edited in a DB tab), strings (STR / ISTR / QSTR with SMOV, CONCAT, ITOS, SMID and string compare), 32-bit double words (MD) and MOD, a high-speed counter (HC0), network data words, forcing of inputs/outputs in the I/O table, and fault-finding exercises with injected field faults (broken sensor, dead valve, swapped wires, dirty photo-eye, NO/NC mix-up). |
| **Challenges** | 212 tasks with filters (Ladder / ST / bug hunts / projects / not passed): whole-machine projects, operating modes (manual / auto / homing), production orders with automatic changeover, cylinder sequences, ST exercises and 🐞 bug hunts checked by automated tests that press buttons, wait and verify outputs like a commissioning engineer. Hints, bug hunts, reference solutions. |
| **Setup simulators** | Three interactive simulators in the lesson "From a new project to a running PLC": **the rack** (put the power supply, CPU and I/O cards into slots, power budget, spare channels, the addresses each card gets in Siemens, Rockwell and CODESYS style, and a signal followed hop by hop from the sensor to the program contact), **the network** (IP addresses and subnets shown as colours, duplicate IP, ping, PROFINET device names with "Assign name", missing GSDML / EDS files, EtherNet/IP mode) and **going online** (compile, download with STOP, go online, compare, upload, force with the MAINT / FORCE LED, online change in RUN, and the trap of downloading over a change made in the PLC), each with a mission checklist, in the words of TIA Portal, Studio 5000 or CODESYS. |
| **Motor starting simulator** | In the lesson "Seven ways to start a motor": one motor, seven starters (direct on line, star-delta, autotransformer, stator resistance, rotor resistance, soft starter, drive). The power circuit is drawn live, the line current and speed are plotted against the direct-start curve, and the control is shown as a relay circuit or as PLC ladder with the same live states, plus a panel that says what stays hardware and what the PLC does. Two loads (fan, loaded conveyor), fault demos (welded star contactor with and without the hard-wired interlock, overload trip), a side-by-side table of your starts, a mission checklist, and a **By hand** mode where you close the contactors yourself. |
| **Word calculator** | In the lesson "Words as bits": two 16-bit words with clickable bits, shown as hex, decimal (signed) and BCD, and the result of AND / OR / XOR / NOT with the reason for each. Presets (drive ready → run, mask the low byte, what changed, BCD) and six small missions. The lesson "REAL numbers" covers NORM_X / SCALE_X scaling, ROUND / TRUNC and the traps of floating point. |
| **I/O wiring simulator** | In the lesson "Wiring inputs and outputs": choose an input card (sinking / sourcing) and a device (push button, PNP, NPN, 2-wire, 4-wire sensor), or an output card (relay, PNP, NPN, triac) and a load (lamp, valve, stepper drive, 230 V lamp, 10 A heater), press Power on and see where the current flows. Wrong choices show what would burn on a real machine. Eight missions: NPN on a sinking card, 2-wire leakage and the bleeder resistor, the load return of an NPN output, the flyback diode, AC on a transistor, the interposing contactor, relays and fast pulses. Card examples for six brands. |
| **HMI screen builder** | In the lesson "Build an HMI screen": an empty panel and the tags of a pump program. Add push buttons, switches, lamps, number displays and inputs, bar graphs, an alarm banner and screen buttons, link each one to a tag, lock the settings screen with a user level, then press Run and use the screen against a simulated pump and tank. A mission checklist and five design rules (momentary start, no E-stop on the screen, grey background, units, limits), with the names of WinCC, FactoryTalk View, Vijeo Designer, CODESYS / TwinCAT and Sysmac. |
| **Your work** | The Lab never replaces your program without asking. **My programs** keeps up to 50 named programs; **Export my work** saves progress, programs and quiz stats to one file (Import restores it); programs can be downloaded / opened as .txt. A **Search** page (magnifier in the header) finds lessons, tasks, machines, glossary terms and topics. |
| **Quiz** | Endless "predict the output" rungs, an endless timer & counter drill (TON/TOF/TP/RTO/CTU/CTD), a 259-question concept bank with a level filter, **Interview questions** (133, by topic: basics, programming, timers & counters, analog & PID, drives & motion, safety, troubleshooting, electrical drawings, hardware & online, diagnostics, electrical & wiring, motor starting, fluid power, projects & practice) and **Industrial networks** (97, by topic: basics, how it works, RS-232 / RS-485, Modbus, PROFIBUS, CAN / CANopen / DeviceNet, LIN, AS-i & HART, IO-Link, PROFINET, EtherNet/IP, EtherCAT, OPC UA & MQTT, safety networks, troubleshooting). The wrong answers are written to the same length as the right one, so you cannot guess by length (checked by the tests). Every answer comes with a short explanation, and **My mistakes** brings back every wrongly answered question until it is answered right. Direct links: `#quiz-iv`, `#quiz-net`. |
| **Glossary** | 287 terms in plain words. |

Addresses follow the Siemens S7-200 style (I0.0, Q0.0, M0.0, T0, C0, MW0, 32-bit MD0, high-speed counter HC0, SM0.5, analog AIW0 / AQW0); lessons map them to Allen-Bradley and IEC/CODESYS names.

## Run it

```bash
cd ladder-lab && python3 -m http.server 8080   # then open http://localhost:8080
```

Opening `index.html` directly also works. On a phone (served over https, e.g. GitHub Pages), use *Add to Home Screen* to install it as an app.

Single-file build (handy to copy to a phone):

```bash
node ladder-lab/tools/build-single.js            # → ladder-lab/dist/ladder-lab.html
```

## Tests

```bash
node ladder-lab/tests/run.js
```

Checks that every challenge's reference solution passes all its tests, every empty/buggy starter fails, the text format round-trips, lint is clean, and every lesson example runs.

## Layout

```
js/engine.js      parser, text format, PLC scan engine, lint, ladder → ST translation
js/st.js          Structured Text compiler + runtime (CASE, FOR, WHILE, arrays, FBs, watchdog)
js/plants.js      virtual machines (physics + canvas drawing) and the test runner
js/ladderview.js  SVG ladder renderer with live power flow
js/hw-rack.js     rack simulator: modules, slots, addresses, signal path
js/hw-net.js      network simulator: IP, subnets, device names, device files
js/hw-online.js   online simulator: compile, download, compare, upload, force, online change
js/hw-bits.js     word calculator: bits, hex, BCD, masks
js/hw-wiring.js   I/O wiring simulator: cards, devices, current paths, 8 missions
js/hw-hmi.js      HMI screen builder with a runtime and a simulated pump
js/hw-starters.js motor starting simulator: seven methods, circuit, current curve, relay / ladder / by hand
js/plants-starters.js  Lab machines: stator resistance, autotransformer and rotor resistance starters, drive on a fieldbus
js/comm.js        step-by-step animations of how networks move data (serial bits, polling, token, CAN arbitration, LIN, EtherCAT, cyclic Ethernet, MQTT)
js/lessons.js     curriculum, glossary, quiz banks
js/challenges.js  challenges with tests and solutions
js/topics.js      the 24 topics: lessons, tasks, machines, quiz links and icon of each
js/app.js         routing, pages, Lab editor, mini simulators, quizzes
```

### Program text format

```
NAME Motor start/stop
TAG I0.0 Start
RUNG Start/stop latch
NO(I0.0) | NO(I0.2) NO(I0.3) COIL(Q0.0)
NO(Q0.0)
```

`|` drops a branch to the next row at that point, `-` is a wire, `.` an empty cell, `~` wires up to the output column.
Elements: `NO NC P N NOT CMP(a>=b)` · `COIL NCOIL SET RST` · `TON TOF TP RTO(T0,3s)` · `CTU CTD(C0,5)` · `MOV(src,dst) ADD SUB MUL DIV MOD(a,b,dst)` · `SHL SHR(in,n,out)` · `SHRB(data,start,n)` (bit shift register, negative n shifts the other way) · word bits `MW100.2`, literals `16#047F` `2#0101` `12.5`, `LIM(lo,x,hi)`, `WAND WOR WXOR(a,b,dst)` `WNOT(a,dst)`, `I_BCD BCD_I(src,dst)`, REAL memory `MR0`…`MR99` with `NORM_X SCALE_X(min,value,max,dst)` `CONV ROUND TRUNC(src,dst)`. · `PID(PV,SP,OUT,Kp,Ti,Td)` · `CALL(Block,Instance,Param=addr,…)` with `BLOCK name` (an FB) or `FC name` sections and `PARAM IN|OUT|INOUT name BOOL|INT`; an FC is called without an instance: `CALL(FC_x,,Param=addr)`; inside a block `#Name` is a parameter or the instance's own memory (temporary in an FC). · Motion: `MC_POWER(AX0)` `MC_HOME(MC0,AX0,I0.0)` `MC_ABS(MC1,AX0,pos,vel)` `MC_REL(MC2,AX0,dist,vel)` `MC_JOG(AX0,vel)` `MC_STOP(MC3,AX0)` `MC_RESET(MC4,AX0)` `MC_SETPOS(MC5,AX0,value)` (set home here); status `MC1.DONE/.BUSY/.ERR/.ABORT`, `AX0.POS/.VEL/.ON/.HOMED/.MOVING/.ERR`.
