# Ladder Lab

Learn PLC ladder logic from beginner to advanced, by building and testing it, not memorising it.
A zero-dependency web app (works offline, installable on phones as a PWA).

| Section | What you get |
|---|---|
| **Learn** | 64 lessons in 7 levels (Foundations → Memory & motor control → Timers → Counters & data → Sequences & pro practice → Real-world projects → Structured Text). Each covers *what / why / where*, with live examples you can press, common mistakes and takeaways. |
| **Lab** | A ladder editor + PLC simulator (real scan cycle, step-by-step scan mode, power-flow monitoring, lint for double coils, etc.) driving 50 animated machines: trainer panel, a worn operator panel (bouncing buttons, noisy knob), reversing motor, conveyor, tank, traffic crossing, 3 pneumatic cylinders, a hydraulic press with its power unit (pump started unloaded, oil level / temperature / filter, 4/3 closed-centre valve, fast / slow / press on pressure, decompression, two-hand control), a hydraulic accumulator charging station with clamps (140 / 160 bar hysteresis, dump valve), a pick & place station (ejector, 5/3 X axis stopped by station sensors, bistable Z valve, vacuum gripper, metal/plastic sorting), garage door, parking lot, star-delta starter, a pump with a soft starter and bypass contactor, a hydraulic axis with a proportional valve and position transducer, a production cell with andon light (counters, downtime, OEE), a factory building on the PLC clock (shift bell, heating and light schedules), bottle filling line, batch mixer, 3-floor elevator, a 5-floor building elevator (car and hall calls with lamps, collective selective control, two-speed hoist with slow-down vanes, door operator with photo-eye, overload, inspection, fire service), box sorter, an inspection conveyor with part tracking (pitch cam, camera, label printer, reject jet), car wash, two-pump station, analog level tank (4–20 mA in, control valve out), a heat-treatment furnace (PT100, setpoint knob, safety trip, blower on a drive), a bag-filling scale (load cell, coarse/fine, in-flight), a conveyor line with 3 variable-speed drives, a booster pump station for PID control, a two-axis servo gantry (motion control: homing, positioning, pick and place, drive faults), a safety cell (with a safety relay, or with a safety PLC: two-channel E-stop and guard door, contactor feedback), a palletizer exit with a safety light curtain (OSSD1/OSSD2, restart interlock, sequential muting with a muting lamp), a labelling line (barcode reader → print-and-apply printer with a running serial → check scanner, HMI text list), a servo axis station with a touch HMI (manual jog, set home, teach-in, parameters, auto cycle), a pump station alarm panel (horn, ACK, first-out), a cut-to-length line with an encoder and a high-speed counter, two machines handing over parts over a network (heartbeat, handshake, data), drilling station, industrial oven, washing machine, overhead crane, rotary indexing table, greenhouse climate, sliding gate, air compressor station, filling & capping line, palletizer, and a flexible fixture station with 3 barcode-identified tools (3, 6 and 4 clamps), an OFF / MAN / AUTO mode selector and a small touch HMI. The cylinders also have a mode selector and jog buttons. Every machine has a **How it works** page with its I/O list and one-click loading of a working, commented ladder (and ST) program. An **Other brands** window shows the program for Siemens TIA Portal (SCL), Rockwell Studio 5000 (rung text), Schneider Machine Expert, Beckhoff TwinCAT 3, Omron Sysmac Studio, Omron CX-Programmer (mnemonics) and IEC Structured Text, with a cross-brand instruction table. |
| **Structured Text** | A real IEC 61131-3 ST runner in the Lab (switch Ladder ↔ ST): VAR/AT, IF, CASE, FOR, WHILE, REPEAT, EXIT, arrays, TON/TOF/TP/CTU/CTD/R_TRIG/F_TRIG/RS/SR, SHL/SHR/ROL/ROR, a watchdog for runaway loops, compile errors as you type. |
| **Guided path** | Four ordered paths: **Interview preparation** (62 tasks: the classic PLC interview tasks and questions: quiz buzzer, reversing with a pause, sequential start / reverse stop, test bench, 24-hour clock, people counter, hydraulic accumulator charging and press, plus warm-ups, bug fixing, whole machines and senior topics), **Ladder beginner → advanced** (all 182 ladder tasks in 27 stages, each with the lessons to read first), **Sequence mastery** (one cylinder → complete pick & place station) and **Structured Text**. Progress, "continue" button and "next in the path" after every passed task. |
| **Pro tools** | Reusable blocks: FB (with instances) and FC (no memory), block tabs, interface editor, monitoring per instance, and a **Names as** selector that shows blocks, parameters and calls in the words of TIA Portal, Studio 5000, CODESYS, Schneider Machine Expert, TwinCAT 3 or Omron Sysmac. Motion control with PLCopen-style instructions (MC_Power, MC_Home, MC_MoveAbsolute, MC_MoveRelative, MC_Jog, MC_Stop, MC_Reset) on servo axes, PID instruction, data blocks (DB sections with fields, arrays and an index word, edited in a DB tab), strings (STR / ISTR / QSTR with SMOV, CONCAT, ITOS, SMID and string compare), 32-bit double words (MD) and MOD, a high-speed counter (HC0), network data words, forcing of inputs/outputs in the I/O table, and fault-finding exercises with injected field faults (broken sensor, dead valve, swapped wires, dirty photo-eye, NO/NC mix-up). |
| **Challenges** | 202 tasks with filters (Ladder / ST / bug hunts / projects / not passed): whole-machine projects, operating modes (manual / auto / homing), production orders with automatic changeover, cylinder sequences, ST exercises and 🐞 bug hunts checked by automated tests that press buttons, wait and verify outputs like a commissioning engineer. Hints, bug hunts, reference solutions. |
| **Quiz** | Endless "predict the output" rungs, an endless timer & counter drill (TON/TOF/TP/RTO/CTU/CTD), a 235-question concept bank with a level filter, **Interview questions** (65, by topic: basics, programming, timers & counters, analog & PID, drives & motion, safety, troubleshooting, fluid power, projects & practice) and **Industrial networks** (65, by topic: basics, PROFINET, EtherNet/IP, Modbus, EtherCAT, PROFIBUS & CAN, IO-Link, OPC UA & MQTT, safety networks, troubleshooting). Every answer comes with an explanation. Direct links: `#quiz-iv`, `#quiz-net`. |
| **Glossary** | 76 terms in plain words. |

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
js/lessons.js     curriculum, glossary, concept quiz
js/challenges.js  challenges with tests and solutions
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
Elements: `NO NC P N NOT CMP(a>=b)` · `COIL NCOIL SET RST` · `TON TOF TP RTO(T0,3s)` · `CTU CTD(C0,5)` · `MOV(src,dst) ADD SUB MUL DIV MOD(a,b,dst)` · `SHL SHR(in,n,out)` · `SHRB(data,start,n)` (bit shift register, negative n shifts the other way). · `PID(PV,SP,OUT,Kp,Ti,Td)` · `CALL(Block,Instance,Param=addr,…)` with `BLOCK name` (an FB) or `FC name` sections and `PARAM IN|OUT|INOUT name BOOL|INT`; an FC is called without an instance: `CALL(FC_x,,Param=addr)`; inside a block `#Name` is a parameter or the instance's own memory (temporary in an FC). · Motion: `MC_POWER(AX0)` `MC_HOME(MC0,AX0,I0.0)` `MC_ABS(MC1,AX0,pos,vel)` `MC_REL(MC2,AX0,dist,vel)` `MC_JOG(AX0,vel)` `MC_STOP(MC3,AX0)` `MC_RESET(MC4,AX0)` `MC_SETPOS(MC5,AX0,value)` (set home here); status `MC1.DONE/.BUSY/.ERR/.ABORT`, `AX0.POS/.VEL/.ON/.HOMED/.MOVING/.ERR`.
