# Ladder Lab

Learn PLC ladder logic from beginner to advanced, by building and testing it, not memorising it.
A zero-dependency web app (works offline, installable on phones as a PWA).

| Section | What you get |
|---|---|
| **Learn** | 26 lessons in 6 levels (Foundations → Memory & motor control → Timers → Counters & data → Sequences & pro practice → Real-world projects). Each covers *what / why / where*, with live examples you can press, common mistakes and takeaways. |
| **Lab** | A ladder editor + PLC simulator (real scan cycle, step-by-step scan mode, power-flow monitoring, lint for double coils, etc.) driving 13 animated machines: trainer panel, reversing motor, conveyor, tank, traffic crossing, 3 pneumatic cylinders, garage door, parking lot, star-delta starter, bottle filling line, batch mixer, 3-floor elevator, box sorter. One-click **Structured Text** translation (IEC 61131-3 / CODESYS style). |
| **Challenges** | 32 tasks (including 5 whole-machine projects) checked by automated tests that press buttons, wait and verify outputs like a commissioning engineer. Hints, bug hunts, reference solutions. |
| **Quiz** | Endless "predict the output" rungs + a 45-question concept bank. |
| **Glossary** | 76 terms in plain words. |

Addresses follow the Siemens S7-200 style (I0.0, Q0.0, M0.0, T0, C0, MW0, SM0.5); lessons map them to Allen-Bradley and IEC/CODESYS names.

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
