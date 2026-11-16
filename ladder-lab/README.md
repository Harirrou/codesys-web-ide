# Ladder Lab

Learn PLC ladder logic from beginner to advanced, by building and testing it, not memorising it.
A zero-dependency web app (works offline, installable on phones as a PWA).

| Section | What you get |
|---|---|
| **Learn** | 33 lessons in 7 levels (Foundations → Memory & motor control → Timers → Counters & data → Sequences & pro practice → Real-world projects → Structured Text). Each covers *what / why / where*, with live examples you can press, common mistakes and takeaways. |
| **Lab** | A ladder editor + PLC simulator (real scan cycle, step-by-step scan mode, power-flow monitoring, lint for double coils, etc.) driving 27 animated machines: trainer panel, reversing motor, conveyor, tank, traffic crossing, 3 pneumatic cylinders, garage door, parking lot, star-delta starter, bottle filling line, batch mixer, 3-floor elevator, box sorter, car wash, two-pump station, analog level tank (4–20 mA in, control valve out), drilling station, industrial oven, washing machine, overhead crane, rotary indexing table, greenhouse climate, sliding gate, air compressor station, filling & capping line, palletizer, and a flexible fixture station with 2 barcode-identified tools (3 and 6 clamps) and a small HMI. Every machine has a **How it works** page with its I/O list and one-click loading of a working, commented ladder (and ST) program. One-click **Structured Text** translation (IEC 61131-3 / CODESYS style). |
| **Structured Text** | A real IEC 61131-3 ST runner in the Lab (switch Ladder ↔ ST): VAR/AT, IF, CASE, FOR, WHILE, REPEAT, EXIT, arrays, TON/TOF/TP/CTU/CTD/R_TRIG/F_TRIG/RS/SR, a watchdog for runaway loops, compile errors as you type. |
| **Challenges** | 81 tasks with filters (Ladder / ST / bug hunts / projects / not passed): whole-machine projects, cylinder sequences, ST exercises and 🐞 bug hunts checked by automated tests that press buttons, wait and verify outputs like a commissioning engineer. Hints, bug hunts, reference solutions. |
| **Quiz** | Endless "predict the output" rungs, an endless timer & counter drill (TON/TOF/TP/RTO/CTU/CTD), and a 120-question concept bank with a level filter. |
| **Glossary** | 76 terms in plain words. |

Addresses follow the Siemens S7-200 style (I0.0, Q0.0, M0.0, T0, C0, MW0, SM0.5, analog AIW0 / AQW0); lessons map them to Allen-Bradley and IEC/CODESYS names.

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
Elements: `NO NC P N NOT CMP(a>=b)` · `COIL NCOIL SET RST` · `TON TOF TP RTO(T0,3s)` · `CTU CTD(C0,5)` · `MOV(src,dst) ADD SUB MUL DIV(a,b,dst)`.
