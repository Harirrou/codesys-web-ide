// node ladder-lab/tests/run.js — verifies engine + every challenge solution
const path = require('path');
['engine', 'st', 'plants', 'plants-robot', 'plants-starters', 'challenges', 'lessons', 'topics', 'quiz-read', 'fbdview', 'hw-flow', 'hw-safety'].forEach((f) => { try { require(path.join(__dirname, '../js/' + f + '.js')); } catch (e) { if (f !== 'lessons') throw e; } });
const LL = globalThis.LL;
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// a reset takes the PLC out of STOP (division by zero stops it)
{
  const m = LL.makeMachine(LL.parseProgram('RUNG\nNO(SM0.0) DIV(10,MW0,MW2)'));
  m.scan(10);
  ok(!!m.error, 'division by zero stops the PLC');
  m.reset();
  ok(!m.error, 'reset clears the PLC stop');
}

// "Read a program" quiz: in every pattern the reasoning (want) must match the PLC engine (got)
LL.READ_PATTERNS.forEach((_, k) => {
  let bad = '';
  for (let i = 0; i < 60 && !bad; i++) {
    const sc = LL.genRead(k), r = LL.readRun(sc);
    if (LL.lint(r.prog).some((x) => x.level === 'error') || r.m.error) bad = 'program error in ' + sc.kind;
    else if (sc.ask.some((a) => sc.want[a] !== r.got[a])) bad = sc.kind + ': want ' + JSON.stringify(sc.want) + ' got ' + JSON.stringify(r.got) + ' / ' + sc.steps.map((x) => x.say).join(' ');
  }
  ok(!bad, 'read quiz pattern ' + k + ' ' + bad);
});

// FBD view: the logic tree of every rung must give the same value as the ladder, rung by rung, with live bits
LL.CHALLENGES.filter((c) => c.lang !== 'st').forEach((ch) => {
  const prog = LL.parseProgram(ch.solution), m = LL.makeMachine(prog), groups = prog.rungs.map((r) => LL.FBD.trees(r));
  const ins = LL.Plants[ch.plant].inputs.map((i) => i.addr).filter((a) => /^I\d/.test(a)), I = {};
  const hasEdge = (x) => !!x && (x.t === 'in' ? x.cell.type === 'P' || x.cell.type === 'N' : x.t === 'not' ? hasEdge(x.x) : x.items ? x.items.some(hasEdge) : false);
  let bad = '';
  for (let k = 0; k < 30 && !m.error && !bad; k++) {
    if (k % 3 === 0) ins.forEach((a) => { if (Math.random() < 0.3) I[a] = I[a] ? 0 : 1; });
    m.setInputs(I); m.beginScan();
    for (let ri = 0; ri < prog.rungs.length && !m.error; ri++) {
      const dead = m.mcrOff || m.jmp != null;   // inside an MCR zone that is off, or jumped over: the rung has no power whatever its contacts say
      const r = prog.rungs[ri], pre = groups[ri].map((g) => (dead || hasEdge(g.expr) ? null : LL.FBD.value(g.expr, m, ri)));
      m.evalRung(ri, 10);
      groups[ri].forEach((g, gi) => { if (pre[gi] == null || m.error) return; const row = r.cells.findIndex((cells) => cells[r.cols - 1] === g.outs[0]); if (pre[gi] !== (m.trace[ri].pin[row][r.cols - 1] ? 1 : 0)) bad = 'rung ' + (ri + 1) + ' ' + LL.FBD.key(g.expr); });
    }
    m.endScan(10); m.phase = 0;
  }
  ok(!bad, 'FBD tree = ladder in ' + ch.id + ' ' + bad);
});

// jump / MCR zone / queue demo logic (lesson flow-data)
{
  const F = LL.FlowSim; let z = F.newZone();
  const run = (inp, mode, ms) => { for (let t = 0; t < ms; t += 100) F.zone(z, inp, mode, 100); };
  run({ z: 0, b: 1, c: 1 }, 'jmp', 3200);
  ok(z.motor === 1 && z.valve === 1 && z.t1 === 1, 'jump demo: normal scan runs motor, latch and timer');
  run({ z: 1, b: 0 }, 'jmp', 500);
  ok(z.motor === 1 && z.t1 === 1 && z.tr[1] === 'skip', 'jump: skipped rungs keep their last state');
  run({ z: 0, b: 0 }, 'jmp', 100);
  ok(z.motor === 0 && z.et === 0 && z.valve === 1, 'jump off: the rungs are solved again');
  z = F.newZone(); run({ z: 1, b: 1, c: 1 }, 'mcr', 3200);
  ok(z.motor === 1 && z.valve === 1 && z.t1 === 1, 'MCR zone on: like normal rungs');
  run({ z: 0, b: 1, c: 1 }, 'mcr', 100);
  ok(z.motor === 0 && z.valve === 1 && z.et === 0 && z.t1 === 0 && z.tr[2] === 'off', 'MCR zone off: coil drops, timer resets, latch stays');
  run({ z: 0, r: 1 }, 'mcr', 100);
  ok(z.valve === 0, 'the reset rung outside the zone unlatches');
  const q = []; [1, 2, 3].forEach((v) => F.load(q, v, 3));
  ok(F.load(q, 4, 3) === false && q.length === 3, 'a full queue refuses a load');
  ok(F.unload(q, 'fifo') === 1 && F.unload(q, 'lifo') === 3 && F.unload(q, 'fifo') === 2 && F.unload(q, 'fifo') === undefined, 'FIFO gives the oldest, LIFO the newest, empty gives nothing');
  ok(F.next(5, 6) === 0 && F.next(0, 6) === 1 && F.SEQ.rows.every((r) => r.length === F.SEQ.outs.length), 'sequencer wraps and its table is square');
}

// Circuits free play: every machine opens with its parts, and its start circuit runs for 6 s without a fault
if (LL.EC && LL.EC.freeFor) LL.EC.FREE_SCN.forEach((scn) => {
  const EC = LL.EC, f = EC.freeFor(scn), c = EC.parse(f.solution || ''), sim = new EC.Sim(c, f);
  for (let i = 0; i < 30; i++) sim.tick();
  const tag = sim.D.S1 ? 'S1' : sim.D.S2 ? 'S2' : '';
  if (tag) { sim.D[tag].v = 1; for (let i = 0; i < 25; i++) sim.tick(); if (f.parts.find((q) => q.d === tag).k === 'pb') sim.D[tag].v = 0; }
  for (let i = 0; i < 600; i++) sim.tick();
  ok(f.parts.length >= 9 && !sim.st.fault && !sim.short && !EC.lint(c, f).length, 'free play machine ' + scn + ' ' + (sim.st.fault || sim.short || EC.lint(c, f)[0] || ''));
});

// Lab instructions: jump to a label, MCR zone, FIFO / LIFO in a word table
{
  const Z = { 'I0.0': 0, 'I0.1': 0, 'I0.2': 0 }, run = (m, I, n) => { for (let k = 0; k < (n || 1); k++) { m.setInputs(Object.assign({}, Z, I)); m.scan(10); } };
  const noErr = (p) => LL.lint(p).filter((x) => x.level === 'error').length === 0, same = (p) => LL.programToText(LL.parseProgram(LL.programToText(p))) === LL.programToText(p);
  let p = LL.parseProgram('RUNG\nNO(I0.0) JMP(L1)\nRUNG\nNO(I0.1) COIL(Q0.0)\nRUNG\nNO(I0.1) TON(T0,100ms)\nRUNG\nLBL(L1)\nRUNG\nNO(I0.2) COIL(Q0.1)'), m = LL.makeMachine(p);
  ok(noErr(p) && same(p) && !LL.lint(p).length, 'jump program: clean lint and round trip');
  run(m, { 'I0.1': 1, 'I0.2': 1 }, 5); ok(m.bit('Q0.0') === 1 && m.bit('Q0.1') === 1, 'no jump: every rung is scanned');
  run(m, { 'I0.0': 1 }, 30); ok(m.bit('Q0.0') === 1 && m.bit('Q0.1') === 0 && !m.bit('T0') && m.timerFor('T0').et === 50, 'jump: skipped coil keeps its state, skipped timer stands still, the rung after the label is scanned');
  ok(m.trace[1].skip === 1 && m.trace[3].skip === 0 && m.trace[4].skip === 0, 'jump: the skipped rungs are marked');
  run(m, { 'I0.1': 1 }, 6); ok(m.bit('T0') === 1, 'jump off: the timer goes on from where it was');
  run(m, {}, 1); ok(m.bit('Q0.0') === 0 && !m.error, 'jump off: the coil is solved again');
  p = LL.parseProgram('RUNG\nNO(I0.0) JMP(L2)\nRUNG\nNO(I0.1) COIL(Q0.0)'); m = LL.makeMachine(p);
  ok(LL.lint(p).some((x) => x.level === 'error' && /no rung with LBL/.test(x.msg)), 'lint: jump without a label'); run(m, { 'I0.0': 1 }, 1); ok(/LBL L2/.test(m.error || ''), 'a jump without a label stops the PLC');
  ok(LL.lint(LL.parseProgram('RUNG\nLBL(L1)\nRUNG\nNO(I0.0) JMP(L1)')).some((x) => /backwards/.test(x.msg)), 'lint: a backward jump is refused');
  p = LL.parseProgram('RUNG\nNO(I0.0) MCR()\nRUNG\nNO(I0.1) COIL(Q0.0)\nRUNG\nNO(I0.2) SET(Q0.1)\nRUNG\nNO(I0.1) TON(T0,50ms)\nRUNG\nMCR()\nRUNG\nNO(I0.1) COIL(Q0.2)'); m = LL.makeMachine(p);
  ok(noErr(p) && same(p) && !LL.lint(p).length, 'MCR program: clean lint and round trip');
  run(m, { 'I0.0': 1, 'I0.1': 1, 'I0.2': 1 }, 8); ok(m.bit('Q0.0') === 1 && m.bit('Q0.1') === 1 && m.bit('T0') === 1 && m.bit('Q0.2') === 1, 'MCR zone on: like normal rungs');
  run(m, { 'I0.1': 1, 'I0.2': 1 }, 1); ok(m.bit('Q0.0') === 0 && m.bit('Q0.1') === 1 && m.bit('T0') === 0 && m.bit('Q0.2') === 1, 'MCR zone off: coil drops, timer resets, latch stays, the rung after the zone is normal');
  ok(LL.lint(LL.parseProgram('RUNG\nNO(I0.0) MCR()\nRUNG\nNO(I0.1) COIL(Q0.0)')).some((x) => /two MCR/.test(x.msg)), 'lint: an MCR zone needs an end');
  p = LL.parseProgram('RUNG\nNO(I0.0) FFL(MW10,MW100,3)\nRUNG\nNO(I0.1) FFU(MW100,3,MW12)\nRUNG\nNO(I0.2) LFU(MW100,3,MW14)'); m = LL.makeMachine(p);
  ok(noErr(p) && same(p), 'FIFO program: clean lint and round trip');
  const load = (v) => { m.setWord('MW10', v); run(m, { 'I0.0': 1 }, 2); run(m, {}, 1); };
  load(11); load(22); ok(m.word('MW100') === 2 && m.word('MW101') === 11 && m.word('MW102') === 22, 'FFL: one load per rising edge');
  load(33); load(44); ok(m.word('MW100') === 3 && m.word('MW103') === 33, 'FFL: a full table refuses the load');
  run(m, { 'I0.1': 1 }, 2); run(m, {}, 1); ok(m.word('MW12') === 11 && m.word('MW100') === 2 && m.word('MW101') === 22 && m.word('MW103') === 0, 'FFU: the oldest comes out, the rest moves up');
  run(m, { 'I0.2': 1 }, 2); run(m, {}, 1); ok(m.word('MW14') === 33 && m.word('MW100') === 1, 'LFU: the newest comes out');
  run(m, { 'I0.1': 1 }, 1); run(m, {}, 1); run(m, { 'I0.1': 1 }, 1); ok(m.word('MW12') === 22 && m.word('MW100') === 0 && !m.error, 'an empty table gives nothing');
  const all = LL.parseProgram('NAME X\nRUNG\nNO(I0.0) JMP(L1)\nRUNG\nNO(I0.0) MCR()\nRUNG\nMCR()\nRUNG\nLBL(L1)\nRUNG\nNO(I0.0) FFL(MW10,MW100,3)\nRUNG\nNO(I0.1) FFU(MW100,3,MW12)\nRUNG\nNO(I0.1) LFU(MW100,3,MW12)');
  ['toST', 'toRockwell', 'toTIA', 'toTwinCAT', 'toSysmac', 'toMachineExpert', 'toOmronCX'].forEach((fn) => { let t = ''; try { const o = LL[fn](all); t = typeof o === 'string' ? o : JSON.stringify(o); } catch (e) { t = 'undefined (threw ' + e.message + ')'; } ok(t.length > 20 && !/undefined|NaN/.test(t), fn + ' handles jump, MCR and FIFO'); });
}

// safety relay simulator (lesson safety-practice)
{
  const S = LL.SafetySim, mk = (o) => S.init(Object.assign({ app: 'estop2', auto: false, fb: true, delay: false, faults: {} }, o || {}));
  const run = (st, inp, ms) => { for (let t = 0; t < (ms || 100); t += 10) S.step(st, Object.assign({ act: false, reset: false, power: true }, inp), 10); return st; };
  const press = (st, inp) => { run(st, Object.assign({}, inp, { reset: true }), 50); run(st, inp, 50); };
  let st = mk(); run(st, {}); ok(!st.out && st.why === 'wait', 'safety relay waits for the reset button'); press(st, {}); ok(st.out && st.motor, 'safety relay starts with reset');
  run(st, { act: true }); ok(!st.out && !st.motor, 'E-stop drops the outputs'); run(st, {}); ok(!st.out, 'no restart by itself'); run(st, { reset: true, act: true }); run(st, { reset: true }); ok(!st.out, 'a held reset button does not start it'); run(st, {}); press(st, {}); ok(st.out, 'a new press starts it');
  st = mk({ faults: { weld1: true } }); press(st, {}); run(st, { act: true }); ok(!st.out, 'welded contact: the second channel still stops'); run(st, {}); press(st, {}); ok(!st.out && st.why === 'needopen', 'welded contact: restart refused');
  st = mk({ app: 'estop1', faults: { weld1: true } }); press(st, {}); run(st, { act: true }, 300); ok(st.out && st.motor, 'one channel and a welded contact: the E-stop does nothing');
  st = mk(); press(st, {}); st.cfg.faults.cross = true; run(st, {}); ok(!st.out && st.why === 'cross', 'short between the channels trips the relay'); st.cfg.faults.cross = false; press(st, {}); ok(!st.out, 'the fault stays until the supply is cycled'); run(st, { power: false }); run(st, {}); press(st, {}); ok(st.out, 'supply off and on clears the fault');
  st = mk(); press(st, {}); st.cfg.faults.weldK1 = true; run(st, { act: true }); ok(!st.motor && st.k1 === 1, 'welded K1: K2 still stops the motor'); run(st, {}); press(st, {}); ok(!st.out && st.why === 'fb', 'feedback loop blocks the reset');
  st = mk({ fb: false }); press(st, {}); st.cfg.faults.weldK1 = true; run(st, { act: true }); run(st, {}); press(st, {}); ok(st.out, 'without a feedback loop the relay restarts on a welded contactor');
  st = mk({ faults: { stuck: true } }); run(st, {}); run(st, { act: true }); run(st, {}); ok(!st.out && st.why === 'stuck', 'a stuck reset button does not restart');
  st = mk({ auto: true }); run(st, {}); ok(st.out, 'automatic start'); run(st, { act: true }); run(st, {}); ok(st.out, 'automatic start comes back by itself');
  st = mk({ delay: true }); press(st, {}); run(st, { act: true }, 500); ok(!st.out && st.motor && st.ramp, 'delayed contacts hold during the ramp'); run(st, { act: true }, 1200); ok(!st.motor, 'delayed contacts open after the time');
  st = mk({ faults: { break2: true } }); press(st, {}); ok(!st.out && st.why === 'onech', 'a broken wire in one channel keeps it off');
}

// roundtrip parse/serialize
LL.CHALLENGES.forEach((ch) => {
  if (ch.lang === 'st') {
    const p = LL.compileST(ch.solution);
    ok(p.ok, 'st compiles ' + ch.id + ' ' + JSON.stringify(p.error));
    LL.runChallenge(p, ch).forEach((r) => ok(r.ok, ch.id + ' / ' + r.name + ': ' + r.msg));
    const st = LL.compileST(ch.starter || '');
    ok(LL.runChallenge(st, ch).some((r) => !r.ok), 'starter should fail ' + ch.id);
    return;
  }
  const p = LL.parseProgram(ch.solution);
  const t1 = LL.programToText(p), t2 = LL.programToText(LL.parseProgram(t1));
  ok(t1 === t2, 'roundtrip ' + ch.id);
  const errs = LL.lint(p).filter((x) => x.level !== 'info');
  ok(!errs.length, 'lint clean ' + ch.id + ' ' + JSON.stringify(errs));
  const res = LL.runChallenge(p, ch);
  res.forEach((r) => ok(r.ok, ch.id + ' / ' + r.name + ': ' + r.msg));
  if (ch.kind === 'diagnose') {
    ok(LL.runChallenge(p, ch, { faults: ch.faults }).some((r) => !r.ok), 'the fault must break the machine in ' + ch.id);
    ok(ch.options.filter((o) => o.ok).length === 1, 'exactly one right answer in ' + ch.id);
    return;
  }
  const st = LL.parseProgram(ch.starter || 'RUNG\n');
  const sres = LL.runChallenge(st, ch);
  ok(sres.some((r) => !r.ok), 'starter should fail ' + ch.id);
  ok(LL.toST(p).length > 20, 'st ' + ch.id);
});
// lessons examples parse
(LL.LESSONS || []).forEach((l) => Object.keys(l.sims || {}).forEach((k) => {
  try {
    const sp = l.sims[k];
    const p = sp.lang === 'st' ? LL.compileST(sp.program) : LL.parseProgram(sp.program);
    if (sp.lang === 'st' && !p.ok) throw new Error('line ' + p.error.line + ': ' + p.error.msg);
    const m = LL.makeMachine(p); m.scan(10); if (m.error && !sp.expectError) throw new Error(m.error); pass++;
  }
  catch (e) { fail++; console.log('FAIL lesson sim', l.id, k, e.message); }
}));
Object.keys(LL.OPEN_PROGRAMS || {}).forEach((k) => { const o = LL.OPEN_PROGRAMS[k]; if (o.lang === 'st') { const p = LL.compileST(o.program); ok(p.ok, 'open program ' + k + ' ' + JSON.stringify(p.error)); } });
// guided paths: every ladder challenge exactly once in the ladder path, every id exists, lessons exist
(LL.PATHS || []).forEach((P) => P.stages.forEach((stg) => {
  stg.ids.forEach((id) => ok(!!LL.CH_BY_ID[id], 'path ' + P.id + ' unknown challenge ' + id));
  stg.lessons.forEach((l) => ok(LL.LESSONS.some((x) => x.id === l), 'path ' + P.id + ' unknown lesson ' + l));
}));
{
  const lad = LL.PATH_BY_ID.ladder.all, st = LL.PATH_BY_ID.st.all;
  LL.CHALLENGES.forEach((c) => { const n = (c.lang === 'st' ? st : lad).filter((x) => x === c.id).length; ok(n === 1, 'challenge ' + c.id + ' appears ' + n + ' times in its main path'); });
}
LL.LESSONS.forEach((l) => l.challenges.forEach((c) => ok(!!LL.CH_BY_ID[c], 'lesson ' + l.id + ' links unknown challenge ' + c)));
// no shipped ladder program may contain an element that is not connected on its left
{
  const progs = [];
  LL.LESSONS.forEach((l) => Object.keys(l.sims || {}).forEach((k) => { if (l.sims[k].lang !== 'st') progs.push(['lesson ' + l.id, l.sims[k].program]); }));
  LL.CHALLENGES.filter((c) => c.lang !== 'st').forEach((c) => { progs.push(['solution ' + c.id, c.solution]); });
  const app = require('fs').readFileSync(__dirname + '/../js/app.js', 'utf8');
  const re = /program: '((?:[^'\\]|\\.)*)'/g; let mm; while ((mm = re.exec(app))) progs.push(['app.js', mm[1].replace(/\\n/g, '\n')]);
  progs.forEach(([name, src]) => ok(!LL.lint(LL.parseProgram(src)).some((x) => /not connected on its left/.test(x.msg)), 'unconnected element in ' + name));
}
console.log('ST sample:\n' + LL.toST(LL.parseProgram(LL.CH_BY_ID['permissive'].solution)));
// quiz banks: 4 distinct answers, a valid right answer, an explanation, no duplicate questions
[['QUIZ', 'l'], ['QUIZ_IV', 't'], ['QUIZ_NET', 't']].forEach(([bank, key]) => {
  const list = LL[bank] || [];
  ok(list.length > 0, bank + ' is empty');
  const seen = new Set();
  list.forEach((q, i) => {
    ok(Array.isArray(q.a) && q.a.length >= 2 && new Set(q.a).size === q.a.length && q.c >= 0 && q.c < q.a.length, bank + '[' + i + '] answers');
    ok(q.q && q.why && q[key] != null, bank + '[' + i + '] fields');
    ok(!seen.has(q.q), bank + ' duplicate question: ' + q.q); seen.add(q.q);
  });
});
// topics (js/topics.js): every id exists, every lesson and every challenge is in at least one topic, every topic has an icon
{
  const T = LL.TOPICS || [];
  ok(T.length === 24, 'there are 24 topics, found ' + T.length);
  ok(new Set(T.map((t) => t.id)).size === T.length, 'topic ids are unique');
  const hasL = (id) => LL.LESSONS.some((l) => l.id === id);
  const qBank = { concept: [LL.QUIZ, 'l'], iv: [LL.QUIZ_IV || [], 't'], net: [LL.QUIZ_NET || [], 't'] };
  T.forEach((t) => {
    ok(t.id && t.title && t.blurb && t.intro, 'topic ' + t.id + ' has a title, blurb and intro');
    ok(/^#[0-9a-f]{6}$/i.test(t.color || ''), 'topic ' + t.id + ' has a colour');
    ok(/^<svg [^>]*viewBox="0 0 24 24"[\s\S]*<\/svg>$/.test(t.icon || ''), 'topic ' + t.id + ' has an icon');
    ok(hasL(t.start) && t.lessons.includes(t.start), 'topic ' + t.id + ' start lesson ' + t.start);
    ok(t.lessons.length + t.tasks.length > 0, 'topic ' + t.id + ' is not empty');
    t.lessons.forEach((id) => ok(hasL(id), 'topic ' + t.id + ' unknown lesson ' + id));
    t.tasks.forEach((id) => ok(!!LL.CH_BY_ID[id], 'topic ' + t.id + ' unknown task ' + id));
    t.machines.forEach((id) => ok(!!LL.Plants[id], 'topic ' + t.id + ' unknown machine ' + id));
    (t.quiz || []).forEach((q) => { const b = qBank[q.mode]; ok(b && b[0].some((x) => String(x[b[1]]) === String(q.sel)), 'topic ' + t.id + ' quiz ' + q.mode + ' / ' + q.sel + ' has questions'); });
  });
  ok(new Set(T.map((t) => t.icon)).size === T.length, 'every topic has its own icon');
  LL.LESSONS.forEach((l) => ok(T.some((t) => t.lessons.includes(l.id)), 'lesson ' + l.id + ' is in no topic'));
  LL.CHALLENGES.forEach((c) => ok(T.some((t) => t.tasks.includes(c.id)), 'challenge ' + c.id + ' is in no topic'));
  // a typed URL (#topic-constructor) must not find Object's inherited members
  ['constructor', 'toString', '__proto__', 'hasOwnProperty'].forEach((k) => ok(LL.TOPIC_BY_ID[k] === undefined, 'TOPIC_BY_ID has no inherited ' + k));
  T.forEach((t) => {
    ok(LL.TOPIC_BY_ID[t.id] === t, 'TOPIC_BY_ID.' + t.id);
    ['lessons', 'tasks', 'machines'].forEach((f) => ok(new Set(t[f]).size === t[f].length, 'topic ' + t.id + ' lists a ' + f.slice(0, -1) + ' twice'));
    // the Machines list holds every machine its tasks use (a topic may list none: interview, brands)
    if (t.machines.length) t.tasks.forEach((id) => { const p = LL.CH_BY_ID[id] && LL.CH_BY_ID[id].plant; ok(!p || t.machines.includes(p), 'topic ' + t.id + ': task ' + id + ' runs on ' + p + ', which is not in its machines'); });
    if (t.quizFirst) ok((t.quiz || []).length > 0, 'topic ' + t.id + ' shows its quiz first but has none');
    if (t.path) {
      const P = LL.PATH_BY_ID[t.path.id];
      ok(!!P && !!t.path.label, 'topic ' + t.id + ' path ' + (t.path && t.path.id));
      if (P) P.all.forEach((id) => ok(t.tasks.includes(id), 'topic ' + t.id + ' misses task ' + id + ' of its path ' + P.id));
    }
  });
}
// ── engine part 1: bits of a word, hex / binary literals, word logic, LIM, BCD, REAL ──
{
  // an output alone on a row gets power through wires (~), as the editor draws it
  const prog = (body) => LL.parseProgram('NAME t\nCOLS 6\n' + body.split('\n').map((l) => (/^(MOV|ADD|SUB|MUL|DIV|MOD|SHL|ITOS|WAND|WOR|WXOR|WNOT|I_BCD|BCD_I|CONV|ROUND|TRUNC|NORM_X|SCALE_X)\(/.test(l) ? '~ ' + l : l)).join('\n'));
  const run = (body, inputs, scans) => { const p = prog(body); const m = new LL.Machine(p); if (inputs) m.setInputs(inputs); for (let k = 0; k < (scans || 1); k++) m.scan(10); return m; };
  const errs = (body) => LL.lint(prog(body)).filter((x) => x.level === 'error');
  const warns = (body) => LL.lint(prog(body)).filter((x) => x.level === 'warn');
  const rt = (body) => { const t1 = LL.programToText(prog(body)); return t1 === LL.programToText(LL.parseProgram(t1)); };
  // 1. MW10.3: bit 3 of the word MW10 (bit 0 = least significant)
  const bitsP = 'RUNG\nNO(I0.0) SET(MW10.3)\nRUNG\nNO(MW10.3) COIL(Q0.0)\nRUNG\nNO(I0.1) RST(MW10.3)\nRUNG\nNO(I0.2) COIL(MW10.15)\nRUNG\nNC(MW10.0) COIL(Q0.1)\nRUNG\nP(MW10.3) COIL(Q0.2)\nRUNG\nN(MW10.3) COIL(Q0.3)';
  let m = run(bitsP, { 'I0.0': 1 });
  ok(m.word('MW10') === 8 && m.bit('MW10.3') === 1 && m.bit('Q0.0') === 1 && m.bit('Q0.1') === 1, 'SET(MW10.3) makes MW10 = 8 and NO(MW10.3) reads it');
  ok(m.bit('Q0.2') === 1, 'P(MW10.3) sees the rising edge of a word bit');
  m.setInputs({ 'I0.0': 1, 'I0.2': 1 }); m.scan(10);
  ok(m.word('MW10') === 8 - 32768 && m.bit('MW10.15') === 1 && m.bit('Q0.2') === 0, 'COIL(MW10.15) sets the sign bit: MW10 = -32760, bit 3 kept');
  m.setInputs({ 'I0.0': 0, 'I0.1': 1, 'I0.2': 1 }); m.scan(10);
  ok(m.word('MW10') === -32768 && m.bit('MW10.3') === 0 && m.bit('Q0.3') === 1, 'RST(MW10.3) clears only bit 3; N() sees the falling edge');
  m.scan(10);
  ok(m.bit('Q0.0') === 0 && m.bit('Q0.3') === 0, 'the contact on MW10.3 opens on the next scan (rung order)');
  m = run('RUNG\nMOV(5,MW12)\nRUNG\nNO(MW12.0) NC(MW12.1) NO(MW12.2) COIL(Q0.0)');
  ok(m.bit('Q0.0') === 1, 'MOV(5,MW12): bits 0 and 2 are 1, bit 1 is 0');
  ok(rt(bitsP) && !errs(bitsP).length, 'word bits round-trip and lint clean');
  ok(errs('RUNG\nNO(MW10.16) COIL(Q0.0)').length > 0, 'MW10.16 is not a bit (0 … 15)');
  ok(LL.isBitAddr('MW10.15') && LL.isWritableBit('MW0.0') && !LL.isBitAddr('MW10.16'), 'MW bit address checks');
  // 2. hex and binary literals
  m = run('RUNG\nMOV(16#047F,MW0)\nRUNG\nMOV(2#0000_0101,MW1)\nRUNG\nMOV(16#FFFF,MW2)\nRUNG\nCMP(MW0==16#047F) COIL(Q0.0)\nRUNG\nADD(16#10,2#11,MW3)');
  ok(m.word('MW0') === 1151 && m.word('MW1') === 5 && m.word('MW2') === -1 && m.bit('Q0.0') === 1 && m.word('MW3') === 19, 'hex / binary literals: 16#047F = 1151, 2#0000_0101 = 5, 16#FFFF = -1 in a word');
  ok(!errs('RUNG\nMOV(16#047F,MW0)\nRUNG\nCMP(MW0>2#0101) COIL(Q0.0)').length, 'hex literals pass lint');
  // 3. word logic, 16 bits
  m = run('RUNG\nWAND(16#047F,16#00FF,MW3)\nRUNG\nWOR(16#0400,16#000F,MW4)\nRUNG\nWXOR(16#00FF,16#0F0F,MW5)\nRUNG\nWNOT(16#00FF,MW6)\nRUNG\nWNOT(0,MW7)');
  ok(m.word('MW3') === 0x7F && m.word('MW4') === 0x40F && m.word('MW5') === 0x0FF0 && m.word('MW6') === -256 && m.word('MW7') === -1, 'WAND / WOR / WXOR / WNOT on 16 bits');
  m = run('RUNG\nNO(I0.0) WAND(16#00FF,16#000F,MW3)', { 'I0.0': 0 });
  ok(m.word('MW3') === 0, 'word logic does nothing while its rung is false');
  ok(errs('RUNG\nWAND(MR0,16#00FF,MW3)').length && errs('RUNG\nWOR(MW0,1,MR3)').length && errs('RUNG\nWNOT(MW0,I0.0)').length, 'word logic refuses REAL and non-words');
  // 4. LIM(lo,x,hi): lo ≤ x ≤ hi
  const lim = (v) => run('RUNG\nMOV(' + v + ',MW20)\nRUNG\nLIM(10,MW20,20) COIL(Q0.0)').bit('Q0.0');
  ok(lim(9) === 0 && lim(10) === 1 && lim(15) === 1 && lim(20) === 1 && lim(21) === 0, 'LIM(10,MW20,20) includes both limits');
  ok(run('RUNG\nMOV(1.25,MR0)\nRUNG\nLIM(0.5,MR0,1.5) LIM(1.3,MR0,9.0) COIL(Q0.0)\nRUNG\nLIM(0.5,MR0,1.5) COIL(Q0.1)').bit('Q0.1') === 1, 'LIM works with REAL');
  ok(run('RUNG\nNO(I0.0) | COIL(Q0.0)\nLIM(0,MW0,0)').bit('Q0.0') === 1, 'LIM in a parallel branch');
  ok(warns('RUNG\nLIM(20,MW0,10) COIL(Q0.0)').some((x) => /Rockwell LIM/.test(x.msg)), 'LIM with low > high warns');
  // 5. BCD
  m = run('RUNG\nI_BCD(1234,MW30)\nRUNG\nI_BCD(9999,MW31)\nRUNG\nBCD_I(MW31,MW32)\nRUNG\nBCD_I(16#12A4,MW33)\nRUNG\nMOV(77,MW34)\nRUNG\nI_BCD(MW35,MW34)\nRUNG\nMOV(-1,MW35)');
  ok(m.word('MW30') === 0x1234 && m.word('MW31') === 0x9999 - 65536 && m.word('MW32') === 9999, 'I_BCD 1234 → 16#1234, 9999 → 16#9999, BCD_I back to 9999');
  ok(m.word('MW33') === 0, 'BCD_I with a digit above 9 (16#12A4) writes nothing');
  m.scan(10);
  ok(m.word('MW34') === 77, 'I_BCD of -1 (outside 0 … 9999) writes nothing');
  ok(errs('RUNG\nI_BCD(10000,MW0)').length && errs('RUNG\nBCD_I(MR0,MW0)').length, 'BCD range and REAL lint');
  // 6. REAL: MR0 … MR99, literals with a decimal point
  m = run('RUNG\nMOV(12.5,MR0)\nRUNG\nADD(MR0,2.25,MR1)\nRUNG\nDIV(7,2,MR2)\nRUNG\nDIV(7.0,2,MR3)\nRUNG\nMUL(MR0,MW1,MR4)\nRUNG\nMOV(3,MW1)\nRUNG\nSUB(MR0,0.5,MR5)\nRUNG\nMOV(MW1,MR6)', null, 2);
  ok(m.word('MR0') === 12.5 && m.word('MR1') === 14.75 && m.word('MR2') === 3 && m.word('MR3') === 3.5 && m.word('MR4') === 37.5 && m.word('MR5') === 12 && m.word('MR6') === 3, 'REAL maths: 12.5 + 2.25, 7 / 2 = 3 (whole numbers), 7.0 / 2 = 3.5, INT into REAL');
  ok(LL.isRealAddr('MR99') && !LL.isRealAddr('MR100') && LL.isWritableWord('MR0') && LL.numType('MR3') === 'REAL' && LL.numType('MD4') === 'DINT' && LL.numType('MW1') === 'INT', 'REAL address checks');
  const conv = (src, op, dst) => { const mm = run('RUNG\nMOV(' + src + ',MR0)\nRUNG\n' + op + '(MR0,' + (dst || 'MW0') + ')'); return mm.word(dst || 'MW0'); };
  ok(conv('2.5', 'CONV') === 2 && conv('3.5', 'CONV') === 4 && conv('2.6', 'CONV') === 3 && conv('-2.5', 'CONV') === -2 && conv('-2.6', 'CONV') === -3, 'CONV REAL → INT rounds to the nearest, x.5 to even (TIA)');
  ok(conv('2.5', 'ROUND') === 2 && conv('2.4', 'ROUND') === 2 && conv('7.5', 'ROUND') === 8 && conv('2.5', 'ROUND', 'MR1') === 2, 'ROUND');
  ok(conv('2.9', 'TRUNC') === 2 && conv('-2.9', 'TRUNC') === -2 && conv('-2.9', 'TRUNC', 'MR1') === -2, 'TRUNC cuts off the decimals');
  ok(conv('40000.7', 'CONV') === 32767 && conv('99999.4', 'CONV', 'MD0') === 99999, 'CONV into INT saturates, into DINT fits');
  ok(run('RUNG\nMOV(-7,MW0)\nRUNG\nCONV(MW0,MR0)').word('MR0') === -7, 'CONV INT → REAL');
  m = run('RUNG\nNORM_X(0,AIW0,27648,MR10)\nRUNG\nSCALE_X(0.0,MR10,100.0,MR11)\nRUNG\nSCALE_X(0,MR10,27648,AQW0)\nRUNG\nNORM_X(4.0,MR12,20.0,MR13)\nRUNG\nMOV(8.0,MR12)', { AIW0: 13824 }, 2);
  ok(m.word('MR10') === 0.5 && m.word('MR11') === 50 && m.word('AQW0') === 13824 && m.word('MR13') === 0.25, 'NORM_X 13824 of 27648 = 0.5, SCALE_X 0.5 of 0 … 100 = 50.0, back to 13824, 8 mA of 4 … 20 = 0.25');
  m = run('RUNG\nNORM_X(5,MW0,5,MR0)');
  ok(!!m.error && /divide by zero/.test(m.error) && errs('RUNG\nNORM_X(5,MW0,5,MR0)').length, 'NORM_X with MIN = MAX stops with an error');
  const MIS = /type mismatch — use CONV, ROUND or TRUNC/;
  ['MOV(MR0,MW0)', 'MOV(12.5,MW0)', 'ADD(MR0,1,MW0)', 'MUL(2,1.5,MD0)', 'DIV(MR0,2,AQW0)', 'NORM_X(0,AIW0,27648,MW0)'].forEach((x) => ok(errs('RUNG\n' + x).some((e) => MIS.test(e.msg)), 'type mismatch lint for ' + x));
  ['MOD(MR0,2,MR1)', 'SHL(MR0,1,MW0)', 'ITOS(MR0,4,STR0)'].forEach((x) => ok(errs('RUNG\n' + x).length > 0, 'REAL refused by ' + x));
  const realOk = 'RUNG\nNORM_X(0,AIW0,27648,MR0)\nRUNG\nSCALE_X(0.0,MR0,100.0,MR1)\nRUNG\nROUND(MR1,MW10)\nRUNG\nTRUNC(MR1,MW11)\nRUNG\nCONV(MW10,MR2)\nRUNG\nMOV(MW10,MR3)\nRUNG\nADD(MR1,MW10,MR4)\nRUNG\nCMP(MR1>=50.5) COIL(Q0.0)\nRUNG\nSCALE_X(0.0,MR0,27648,AQW0)';
  ok(!errs(realOk).length && !warns(realOk).length, 'a correct REAL program is lint clean ' + JSON.stringify(LL.lint(prog(realOk))));
  ok(warns('RUNG\nDIV(MW0,2,MR0)').some((x) => /7 \/ 2 = 3/.test(x.msg)) && warns('RUNG\nROUND(MW0,MW1)').length && warns('RUNG\nSCALE_X(0,MW0,100,MR0)').length, 'REAL warnings: INT ÷ INT, nothing to round, SCALE_X of a whole number');
  ok(LL.fmtReal(12) === '12.0' && LL.fmtReal(0.51234) === '0.512' && LL.fmtReal(-0.0001) === '0.0' && LL.fmtReal(2.5) === '2.5' && LL.hex4(-256) === '16#FF00', 'REAL and hex formatting');
  // 7. round trip of every new instruction, and the cell fields
  const all = 'RUNG\nLIM(0,MW0,100) NO(MW1.4) COIL(MW2.0)\nRUNG\nWAND(MW0,16#00FF,MW3)\nRUNG\nWOR(MW0,2#0001,MW4)\nRUNG\nWXOR(MW0,MW4,MW5)\nRUNG\nWNOT(MW0,MW6)\nRUNG\nI_BCD(MW0,MW7)\nRUNG\nBCD_I(MW7,MW8)\nRUNG\nCONV(MW0,MR0)\nRUNG\nROUND(MR0,MW9)\nRUNG\nTRUNC(MR0,MD10)\nRUNG\nNORM_X(0,AIW0,27648,MR1)\nRUNG\nSCALE_X(0.0,MR1,100.0,MR2)';
  ok(rt(all), 'all new instructions round-trip');
  { const p = prog(all); const c = p.rungs[0].cells[0][0], n = p.rungs[10].cells[0][5]; ok(c.type === 'LIM' && c.a === '0' && c.src === 'MW0' && c.b === '100' && n.type === 'NORM_X' && n.a === '0' && n.src === 'AIW0' && n.b === '27648' && n.dst === 'MR1', 'LIM / NORM_X fields'); }
  ok(LL.isLogic('LIM') && !LL.isOutput('LIM') && ['WAND', 'WOR', 'WXOR', 'WNOT', 'I_BCD', 'BCD_I', 'CONV', 'ROUND', 'TRUNC', 'NORM_X', 'SCALE_X'].every(LL.isOutput), 'LIM is a contact, the rest are output boxes');
  ok(LL.usedAddrs(prog(all)).has('MW1') && !LL.usedAddrs(prog(all)).has('16#00FF') && !LL.usedAddrs(prog(all)).has('100.0'), 'usedAddrs: base word of a bit, no literals');
  // 8. exports of every brand
  const ex = prog('TAG MW1 Status\nTAG MR2 Level\n' + all + '\nRUNG\nNO(MW10.3) COIL(Q0.0)\nRUNG\nDIV(MR2,2,MR3)\nRUNG\nMOV(5,MR4)');
  const st = LL.toST(ex), tia = LL.toTIA(ex), rk = LL.toRockwell(ex), tc = LL.toTwinCAT(ex), sy = LL.toSysmac(ex), me = LL.toMachineExpert(ex), cx = LL.toOmronCX(ex);
  ok(/\(0 <= %MW0 AND %MW0 <= 100\)/.test(st) && /Status\.4/.test(st) && /%MW2\.0 :=/.test(st) && /%MW3 := %MW0 AND 16#00FF/.test(st) && /%MW6 := NOT %MW0/.test(st), 'ST: LIM, word bits, word logic');
  ok(/MR0 := INT_TO_REAL\(%MW0\)/.test(st) && /%MW9 := REAL_TO_INT\(MR0\)/.test(st) && /%MD10 := TRUNC\(MR0\)/.test(st) && /MR1 := \(INT_TO_REAL\(%IW0\) - 0\.0\) \/ \(27648\.0 - 0\.0\)/.test(st) && /Level := MR1 \* \(100\.0 - 0\.0\) \+ 0\.0/.test(st) && /MR4 := 5\.0/.test(st) && /Level : REAL;/.test(st) && /MR0 : REAL;/.test(st), 'ST: REAL conversions, NORM_X / SCALE_X formulas, REAL declarations ' + st);
  ok(/%MW7 := \(%MW0 \/ 1000\) \* 4096/.test(st) && /SHR\(INT_TO_WORD\(%MW7\), 12\) AND 16#F/.test(st), 'ST: BCD formulas');
  ok(/"Status"\.%X4/.test(tia) && /%MW10\.%X3/.test(tia) && /%M11\.3/.test(tia) && /MB10 \(HIGH byte\) \+ MB11 \(LOW byte\)/.test(tia) && /MW1\.4 = %M2\.4/.test(tia) && /MW2\.0 = %M3\.0/.test(tia), 'TIA: slice access and the Siemens byte order ' + tia);
  ok(/"Level" = %MD1008 \(Real\)/.test(tia) && /"MR0" = %MD1000 \(Real\)/.test(tia) && /NORM_X\(MIN := 0, VALUE := %IW0, MAX := 27648\)/.test(tia) && /"Level" := SCALE_X\(MIN := 0\.0, VALUE := "MR1", MAX := 100\.0\)/.test(tia) && /ROUND\("MR0"\)/.test(tia) && /SHR\(IN := /.test(tia) && !/instance data blocks[^\n]*REAL/.test(tia), 'TIA: Real tags, NORM_X, SCALE_X, ROUND');
  ok(/LIM\(0,MW0,100\)/.test(rk) && /XIC\(Status\.4\)/.test(rk) && /OTE\(MW2\.0\)/.test(rk) && /AND\(MW0,16#00FF,MW3\)/.test(rk) && /OR\(MW0,2#0001,MW4\)/.test(rk) && /XOR\(MW0,MW4,MW5\)/.test(rk) && /NOT\(MW0,MW6\)/.test(rk), 'Rockwell: LIM, Word.3, AND / OR / XOR / NOT');
  ok(/TOD\(MW0,MW7\)/.test(rk) && /FRD\(MW7,MW8\)/.test(rk) && /MOV\(MW0,MR0\)/.test(rk) && /TRN\(MR0,MD10\)/.test(rk) && /CPT\(MR1,\(AIW0-0\.0\)\/\(27648\.0-0\.0\)\)/.test(rk) && /CPT\(Level,MR1\*\(100\.0-0\.0\)\+0\.0\)/.test(rk) && !/SCP\(/.test(rk) && /REAL tags/.test(rk), 'Rockwell: TOD / FRD / MOV / TRN / CPT (Logix has no SCP), REAL tags');
  ok(/Status\.4/.test(tc) && /MR0 : REAL/.test(tc) && /Level : REAL/.test(tc) && (tc.match(/\bMR0 : REAL/g) || []).length === 1 && /MW10\.3/.test(tc) && /MR0 := INT_TO_REAL\(MW0\)/.test(tc), 'TwinCAT: wVar.3 and REAL variables, declared once ' + tc);
  ok(/Level : REAL/.test(sy) && /MR1 := \(INT_TO_REAL\(AIW0\)/.test(sy), 'Sysmac: REAL variables');
  ok(/MR0 : REAL/.test(me) && /INT_TO_REAL/.test(me), 'Machine Expert: REAL variables');
  ok(/LD>= D0 #/.test(cx) === false && /LD>= D0 &0/.test(cx) && /AND<= D0 &100/.test(cx) && /D1\.04/.test(cx) && /ANDW\(034\) D0 #00FF D3/.test(cx) && /COM\(029\) D6/.test(cx) && /BCD\(024\) D0 D7/.test(cx) && /BIN\(023\) D7 D8/.test(cx) && /FLT\(452\) D0 D2000/.test(cx) && /\/F\(457\) D2004 \+2\.0 D2006/.test(cx), 'Omron CX: LD>= AND<=, D bits, ANDW, COM, BCD, BIN, FLT, /F ' + cx);
  // a block with the new instructions exports too
  const bl = LL.parseProgram('NAME b\nCOLS 6\nRUNG\n~ CALL(FB_A,A1,Raw=MW0)\nBLOCK FB_A\nPARAM IN Raw INT\nRUNG\nLIM(0,#Raw,100) COIL(#Ok)\nRUNG\nWAND(#Raw,16#00FF,#Low)');
  ok(!LL.lint(bl).some((x) => x.level === 'error') && /FUNCTION_BLOCK FB_A/.test(LL.toST(bl)) && /Low : INT/.test(LL.toST(bl)) && /#Low := #Raw AND 16#00FF/.test(LL.toTIA(bl)), 'new instructions inside a block');
}
// quiz answers must not be guessable: the right answer may be the longest in at most 30 % of a bank
[['QUIZ', LL.QUIZ], ['QUIZ_IV', LL.QUIZ_IV], ['QUIZ_NET', LL.QUIZ_NET]].forEach(([n, b]) => {
  const longest = b.filter((q) => { const L = q.a.map((x) => x.length); return L[q.c] === Math.max(...L); }).length;
  ok(longest / b.length <= 0.3, n + ': the right answer is the longest in ' + longest + ' of ' + b.length + ' questions (guessable)');
});
// Circuits (js/circuit.js): every reference circuit passes its tests, an empty panel and every broken starter fail,
// the text format round-trips, and the reference circuits have no lint warnings
require(path.join(__dirname, '../js/circuit.js'));
{
  const EC = LL.EC;
  ok(EC.TASKS.length >= 15 && new Set(EC.TASKS.map((t) => t.id)).size === EC.TASKS.length, 'circuit tasks: at least 15, unique ids');
  EC.TASKS.forEach((t) => {
    const c = EC.parse(t.solution);
    ok(EC.toText(EC.parse(EC.toText(c))) === EC.toText(c), 'circuit ' + t.id + ': text format round-trips');
    ok(EC.lint(c, t).length === 0, 'circuit ' + t.id + ': reference circuit has no lint warnings: ' + EC.lint(c, t).join(' | '));
    const r = EC.run(t, c).filter((x) => !x.ok);
    ok(r.length === 0, 'circuit ' + t.id + ': reference circuit passes' + (r[0] ? ': ' + r[0].name + ' → ' + r[0].msg : ''));
    ok(EC.run(t, EC.empty()).some((x) => !x.ok), 'circuit ' + t.id + ': an empty panel fails');
    if (t.starter) ok(EC.run(t, EC.parse(t.starter)).some((x) => !x.ok), 'circuit ' + t.id + ': the broken starter fails');
    c.cells.forEach((row) => row.forEach((x) => { if (x && x.d) ok(t.parts.some((p) => p.d === x.d), 'circuit ' + t.id + ': ' + x.d + ' is in the parts box'); }));
    ok(t.hints.length >= 2 && t.tests.length >= 2 && t.level >= 1 && t.level <= 5, 'circuit ' + t.id + ': has hints, tests and a level');
  });
  // a path from L to N without a load is a short circuit
  const sh = new EC.Sim(EC.parse('W\nW\nW\nW\nW\nW\nW'), EC.BY_ID['c-lamp']); sh.tick();
  ok(!!sh.short && !sh.mcb, 'circuit: L wired straight to N trips the control breaker');
  ok(EC.lint(EC.parse('LAMP:H1\nLAMP:H1'), EC.BY_ID['c-lamp']).length > 0, 'circuit: two loads in series are reported');
}
// brand exports: valid timer, counter, jump and constant syntax
{
  const p = LL.parseProgram('NAME x\nRUNG\nNO(I0.4) TON(T0,3s)\nRUNG\nNO(T0) COIL(Q0.0)\nRUNG\nNO(I0.4) RTO(T5,5s)\nRUNG\nNO(I0.2) RST(T5)\nRUNG\nNO(I0.2) RST(T0)\nRUNG\nNO(I0.0) CTU(C0,5)\nRUNG\nNO(I0.1) CTD(C0,5)\nRUNG\nNO(I0.2) RST(C0)\nRUNG\nNO(C0) COIL(Q0.1)\nRUNG\nNO(I0.0) CTU(C1,9)\nRUNG\nNO(I0.2) RST(C1)\nRUNG\nCMP(MW0>=100) MOV(250,MW2)\nRUNG\nNO(I0.0) SUB(MW0,-20,MW0)\nRUNG\nNC(I0.5) JMP(L1)\nRUNG\nNO(MW100.2) COIL(Q0.2)\nRUNG\nLBL(L1)\nRUNG\nNO(I0.5) MCR()\nRUNG\nP(I0.0) SHRB(I0.4,M10.0,4)\nRUNG\nMCR()\nRUNG\nNO(SM0.0) NORM_X(0,AIW0,27648,MR0)\nRUNG\nNO(SM0.0) MOD(MW0,10,MW6)\nRUNG\nNO(SM0.0) SHL(MW0,2,MW8)\nRUNG\nNO(SM0.0) CALL(FB_M,M1,Go=I0.0)\nRUNG\nNO(SM0.0) CALL(FC_V,,Cmd=I0.0,Valve=Q0.3)\nBLOCK FB_M\nPARAM IN Go BOOL\nRUNG\nNO(#Go) TON(#Delay,1s)\nRUNG\nNO(#Delay.Q) COIL(#Run)\nFC FC_V\nPARAM IN Cmd BOOL\nPARAM OUT Valve BOOL\nRUNG\nNO(#Cmd) COIL(#Tmp)\nRUNG\nNO(#Tmp) COIL(#Valve)');
  const bad = /\b[TC]\d+\.Q\(|\.CV :=|SCP\(|#-/;
  const st = LL.toST(p), tia = LL.toTIA(p), rk = LL.toRockwell(p), tc = LL.toTwinCAT(p), sy = LL.toSysmac(p), me = LL.toMachineExpert(p), cx = LL.toOmronCX(p);
  [['IEC ST', st], ['TIA', tia], ['Rockwell', rk], ['TwinCAT', tc], ['Sysmac', sy], ['Machine Expert', me], ['Omron CX', cx]].forEach(([n, t]) => ok(!bad.test(t), n + ' export: no T0.Q( call, no write to .CV, no SCP, no #- constant'));
  ok(/^T0\(IN := %IX0\.4, PT := T#3s\);$/m.test(st) && /%QX0\.0 := T0\.Q;/.test(st), 'IEC ST: T0(IN := …) is the call, T0.Q is the done bit');
  ok(/T5 : FB_RTO;/.test(st) && /^T5\(IN := %IX0\.4, RESET := %IX0\.2, PT := T#5s\);/m.test(st) && /FUNCTION_BLOCK FB_RTO/.test(st) && !/: TONR;/.test(st) && !/: TONR;/.test(tc) && !/: TONR;/.test(me) && !/: TONR;/.test(sy), 'IEC ST: a retentive timer is an FB_RTO with a RESET input, TONR only in TIA');
  ok(/C0 : CTUD;/.test(st) && /^C0\(CU := %IX0\.0, CD := %IX0\.1, RESET := %IX0\.2, PV := 5\);/m.test(st) && /%QX0\.1 := C0\.QU;/.test(st) && /^C1\(CU := %IX0\.0, RESET := %IX0\.2, PV := 9\);/m.test(st), 'IEC ST: up / down on one counter is one CTUD, the reset is its RESET input');
  ok(/^"T0"\.TON\(IN := %I0\.4, PT := T#3s\);$/m.test(tia) && /%Q0\.0 := "T0"\.Q;/.test(tia) && /^"T5"\.TONR\(IN := %I0\.4, R := %I0\.2, PT := T#5s\);/m.test(tia) && /RESET_TIMER\("T0"\)/.test(tia) && /^"C0"\.CTUD\(CU := %I0\.0, CD := %I0\.1, R := %I0\.2, PV := 5\);/m.test(tia) && /"C0"\.QU/.test(tia), 'TIA: "T0".TON(…), TONR with R, RESET_TIMER, CTUD with R');
  ok(/Delay \{InstructionName := 'TON_TIME'; LibVersion := '1\.0'\} : TON_TIME;/.test(tia) && /VAR_TEMP/.test(tia) && /"FC_V"\(Cmd := /.test(tia) && /FUNCTION "FC_V" : Void/.test(tia) && !/P_TRIG|N_TRIG/.test(tia), 'TIA blocks: TON_TIME, VAR_TEMP in an FC, quoted block names, no P_TRIG / N_TRIG');
  ok(/T5 : AccumulationTimer;/.test(sy) && /Reset := I0_2/.test(sy) && !/JMP L1;|^L1:/m.test(sy) && !/%[IQM][XW]?\d/.test(sy) && !/MW100\.2/.test(sy) && /INT_TO_WORD\(MW100\) AND WORD#16#0004/.test(sy) && /M10_3 := M10_2;/.test(sy), 'Sysmac: AccumulationTimer, no jump, no % addresses, no bit access on an INT');
  ok(/JMP L1;/.test(tc) && /M10_3 : BOOL;/.test(tc) && !/%MX/.test(tc) && tc.indexOf('END_PROGRAM') < tc.indexOf('FUNCTION_BLOCK FB_M') && !/BLINK/.test(LL.toTwinCAT(LL.parseProgram('NAME b\nRUNG\nNO(SM0.5) COIL(Q0.0)'))), 'TwinCAT: every shift bit is a variable, blocks after END_PROGRAM, no BLINK');
  ok(/^LBL\(L1\);$/m.test(rk) && /^XIC\(I0_5\)MCR\(\);$/m.test(rk) && /^MCR\(\);$/m.test(rk) && /CPT\(MR0,\(AIW0-0\.0\)\/\(27648\.0-0\.0\)\)/.test(rk) && !/temporary tags/.test(rk), 'Rockwell: LBL and the closing MCR are printed, CPT for scaling');
  ok(/LD>= D0 &100/.test(cx) && /MOV\(021\) &250 D2/.test(cx) && /-\(410\) D0 -20 D0/.test(cx) && /TIM 0000 #30/.test(cx), 'Omron CX: &250 decimal, -20 signed, # only for TIM / CNT set values');
  ok(/CJP\(510\) &1/.test(cx) && !/JMP\(004\)\s+[#&]/.test(cx) && /^JME\(005\) &1/m.test(cx) && /^IL\(002\)/m.test(cx) && /^ILC\(003\)/m.test(cx), 'Omron CX: CJP + JME for a jump on TRUE, IL / ILC for the zone');
  ok(/LD P_Off[^\n]*\nTTIM\(087\) 0005 #50/.test(cx) && !/SCL\(194\) \w/.test(cx) && /\/F\(457\) D2988 D2986 D2000/.test(cx) && /\/\(430\) D0 &10 D2980[^\n]*\nMOV\(021\) D2981 D6/.test(cx) && /MOV\(021\) D0 D8[^\n]*\nNASL\(580\) D8 #0002/.test(cx), 'Omron CX: TTIM reset line, REAL maths for NORM_X, MOD from the remainder word, NASL');
}

// calculators: every one runs with its example, and known results are right
require(path.join(__dirname, '../js/calc.js'));
require(path.join(__dirname, '../js/calc-proj.js'));
{
  const C = LL.Calc, ids = new Set(), groups = new Set(C.GROUPS.map((g) => g[0]));
  ok(C.LIST.length >= 70 && C.LIST.filter((c) => c.g === 'proj').length >= 15 && C.LIST.filter((c) => c.pic).length >= 20, 'calculators: at least 70, with a project group and pictures');
  C.LIST.forEach((c) => {
    ok(!ids.has(c.id) && /^[a-z0-9]+$/.test(c.id), 'calc ' + c.id + ': unique simple id'); ids.add(c.id);
    ok(groups.has(c.g) && C.LEVELS[c.lv] && c.t && c.d && (c.tips || []).length > 0, 'calc ' + c.id + ': group, level, title, text and tips');
    const r = C.run(c.id);
    ok(r && !r.err && r.r.length > 0 && r.r.some((x) => /big/.test(x[3] || '')), 'calc ' + c.id + ': the example gives a main result' + (r && r.err ? ' (' + r.err + ')' : ''));
    if (!r || r.err) return;
    ok(r.r.every((x) => typeof x[0] === 'string' && typeof x[1] === 'string' && !/NaN|undefined|Infinity|—/.test(x[0] + x[1])), 'calc ' + c.id + ': no broken value in ' + JSON.stringify(r.r.map((x) => x[1])));
    ok((r.how || []).length > 0 && r.how.every((h) => typeof h === 'string' && !/NaN|undefined/.test(h)), 'calc ' + c.id + ': the steps are shown');
    // an empty number field gives a message, not a crash
    const num = c.f.find((x) => x.ty === 'n' && !x.show);
    if (num) ok(!!C.run(c.id, { [num.k]: NaN }).err, 'calc ' + c.id + ': empty field gives a message');
    // zeros must never throw or print NaN
    const z = {}; c.f.forEach((x) => { if (x.ty === 'n') z[x.k] = 0; });
    const rz = C.run(c.id, z);
    ok(rz && (rz.err || rz.r.every((x) => !/NaN|undefined/.test(String(x[1])))), 'calc ' + c.id + ': all zeros is handled ' + JSON.stringify(rz && (rz.err || rz.r.map((x) => x[1]))));
  });
  const val = (id, v, row) => { const r = C.run(id, v); return r.err ? 'ERR ' + r.err : r.r[row || 0][1]; };
  const find = (id, v, label) => { const r = C.run(id, v); const x = !r.err && r.r.find((y) => y[0].indexOf(label) === 0); return x ? x[1] : 'none'; };
  const eq = (a, b, m) => ok(a === b, 'calc ' + m + ': got ' + a + ', want ' + b);
  eq(val('ohm'), '0.1', 'Ohm 24 V / 240 Ω');
  eq(val('ohm', { find: 'r', u: 24, i: 0.02 }), '1200', 'Ohm R');
  eq(val('res', { m: 'p', r1: 100, r2: 100, r3: 0 }), '50', 'parallel');
  eq(val('res', { m: 'd', r1: 3000, r2: 1000, u: 24 }), '6', 'divider');
  eq(val('p3'), '16.98', '10 kW at 400 V');
  eq(val('p3', { sys: 'dc', u: 24, p: 0.12 }), '5', 'DC current');
  eq(val('pfc'), '27.7', 'kvar');
  eq(val('trafo'), '909', 'transformer current'); eq(val('trafo', {}, 1), '22.7', 'short circuit kA');
  eq(val('flc'), '14.5', 'motor current');
  eq(val('speed'), '1000', 'shaft speed at 35 Hz'); eq(val('speed', {}, 1), '1500', 'field speed');
  eq(val('torque'), '49.4', 'torque');
  eq(val('stardelta'), '17.4', 'star-delta relay');
  eq(val('gear'), '45.6', 'belt speed'); eq(find('gear', {}, 'Frequency for'), '32.9', 'Hz for 30 m/min');
  eq(val('accel'), '12.6', 'ramp torque');
  eq(val('cable'), '2.5', 'cable 16 A 50 m'); eq(val('cable', { sys: 'dc', u: 24, i: 2, l: 80, max: 5 }), '6', '24 V cable by drop');
  eq(find('starter', {}, 'Contactor'), '18', 'contactor'); eq(find('starter', {}, 'Motor breaker'), '13 … 18', 'breaker range');
  eq(val('psu24'), '5', '24 V supply'); eq(find('psu24', {}, 'Load now'), '2.54', '24 V load');
  eq(val('heat'), '89', 'fan air flow'); eq(val('heat', { pv: 100 }), 'none', 'no cooling'); eq(find('heat', { tu: 40 }, 'Cooling unit'), '757', 'cooling unit');
  eq(val('io'), '9', 'I/O cards');
  eq(val('scale'), '50', 'scaling'); eq(val('scale', { dir: 'e', x: 25 }), '6912', 'scaling back'); eq(val('scale', { raw: 's74', x: 5530 }), '0', '4 mA on a 0–20 mA channel');
  eq(val('ma'), '5', '12 mA'); eq(val('ma', { dir: 'v', x: 2.5 }), '8', '25 %'); eq(find('ma', { x: 2 }, 'Signal check'), 'Broken wire or dead transmitter', 'wire break');
  eq(val('resol'), '0.0244', '12 bit');
  eq(val('pt100'), '138.51', 'Pt100 at 100 °C'); eq(val('pt100', { dir: 'r', x: 138.5055 }), '100', 'Pt100 back'); eq(val('pt100', { dir: 'r', x: 80.31 }), '-50', 'Pt100 below zero'); eq(val('pt100', { typ: '1000', x: 0 }), '1000', 'Pt1000');
  eq(val('loadcell'), '8', 'load cell mV');
  eq(val('flow'), '30', 'flow l/min'); eq(val('dpflow'), '50', 'dp flow');
  eq(val('num'), '16#00FF', 'hex'); eq(val('num', { x: '-1' }), '16#FFFF', 'minus one'); eq(val('num', { x: '16#8000' }, 2), '-32768', 'signed'); eq(val('num', { x: '1234' }, 6), '16#1234', 'to BCD'); eq(val('num', { x: '16#1234' }, 7), '16#3412', 'swap');
  eq(val('num', { x: '2#1010', bits: '8' }), '16#0A', 'binary in'); ok(/does not fit/.test(val('num', { x: '70000' })), 'calc num: too big');
  eq(val('real'), '16#42F6E979', 'REAL to hex'); eq(val('real', { dir: 'w' }), '123.456001', 'hex to REAL'); eq(val('real', { dir: 'w', h: 'E979 42F6' }, 1), '123.456001', 'word swap');
  ok(/^16#0003 /.test(val('bits')), 'calc bits: AND'); ok(/^16#0F30 /.test(val('bits', {}, 4)), 'calc bits: shift left');
  eq(val('addr'), '10.3', 'byte.bit'); eq(val('addr', { dir: 'a' }), '83', 'bit number');
  ok(/^YES.*10, 11$/.test(val('overlap')), 'calc overlap: MW10 and MD8'); ok(/^No/.test(val('overlap', { a: 'MW10', b: 'MW12' })), 'calc overlap: apart'); ok(/^No/.test(val('overlap', { a: 'MW10', b: 'MD8', m: 'size' })), 'calc overlap: counted by size');
  eq(val('modbus'), '10 = 16#000A', 'Modbus 40011'); eq(val('modbus', { dir: 'o', ty: '4', off: 0 }), '40001 or 400001', 'Modbus back'); eq(find('modbus', { ref: 30001 }, 'Function code to read'), '04', 'input register');
  eq(val('crc'), 'C5 CD', 'CRC-16'); ok(/correct CRC/.test(val('crc', { x: '01 03 00 00 00 0A C5 CD' }, 1)), 'calc crc: check of a full frame');
  eq(val('time'), 'T#2s500ms', 'IEC time'); eq(val('time', { x: 90, u: '60000' }), 'T#1h30m', '90 min');
  eq(val('ovf'), '54.6 min', 'INT overflow');
  eq(val('units'), '6000', 'bar to mbar'); eq(find('units', {}, '6 bar ='), '6000', 'units first row'); eq(val('units', { x: 100, u: '1.0' }), '212', '°C to °F');
  eq(val('scan'), '24', 'reaction time'); eq(val('enc'), '0.0767', 'mm per count'); eq(val('move'), '1.3', 'move time'); eq(val('move', { d: 100 }), '0.447', 'triangle move');
  eq(val('step'), '320', 'pulses per mm'); eq(val('track'), '2.4', 'travel time');
  eq(val('conv'), '0.55', 'conveyor motor'); eq(val('conv', { ang: 90, mu: 0, m: 500, sp: 12, eta: 80, sf: 1 }), '1.5', 'lift motor');
  eq(val('pump'), '5.5', 'pump motor'); eq(val('fan'), '7.68', 'fan power'); eq(val('pneu'), '1178', 'cylinder force'); eq(val('hyd'), '49.9', 'hydraulic force');
  eq(val('tank'), '3770', 'standing tank'); eq(val('tank', { sh: 'h', d: 2, l: 3, lv: 1 }, 1), '50', 'lying tank half full'); eq(val('tank', { sh: 'b', w: 1, l: 2, ht: 2, lv: 1 }), '2000', 'box');
  eq(val('heatup'), '38.8', 'heater'); eq(val('prod'), '79.6', 'OEE');
  eq(val('pid'), '1.8', 'PI gain'); eq(val('pid', {}, 1), '16.67', 'PI Ti'); eq(val('pid', { m: 'o', ty: 'pid' }), '8', 'open-loop PID');
  eq(val('filt'), '0.0476', 'filter'); eq(val('serial'), '254', 'Modbus round');
  eq(val('ip'), '192.168.0.0 /24', 'network'); ok(/^No/.test(val('ip', {}, 1)), 'calc ip: other network'); ok(/^Yes/.test(val('ip', { mask: '/16' }, 1)), 'calc ip: same network with /16'); ok(/not a valid subnet/.test(val('ip', { mask: '255.0.255.0' })), 'calc ip: bad mask');
  eq(find('ip', { ip: '10.1.2.200', mask: '/26', ip2: '' }, 'Addresses'), '10.1.2.193 to 10.1.2.254', 'host range');
  ok(/^263/.test(val('datalog')), 'calc datalog: days'); eq(val('safedist'), '300', 'safety distance'); eq(val('safedist', { t1: 300, t2: 50, d: '30' }), '688', 'safety distance above 500');
  // project calculators
  eq(val('fill'), '500', 'fill: pump flow'); eq(find('fill', {}, 'Pipe size'), 'DN 80', 'fill: pipe'); eq(find('fill', {}, 'Pump motor'), '1.5', 'fill: motor');
  eq(val('fill', { m: 't', q: 300, out: 50 }), '20 min', 'fill: time with an outflow'); ok(/never fills/.test(val('fill', { m: 't', q: 100, out: 100 })), 'calc fill: outflow as big as the pump');
  eq(find('fill', { sh: 'r', d: 2, h: 1.6 }, 'Volume to fill'), '5027', 'fill: round tank volume'); eq(find('fill', { sh: 'r', d: 2, h: 1.6 }, 'The level rises'), '2.7', 'fill: level speed');
  eq(val('drain'), '28.4 min', 'drain time'); eq(val('drain', {}, 1), '443', 'drain start flow'); ok(/lower than at the start/.test(val('drain', { h2: 3 })), 'calc drain: end above start');
  eq(val('sump'), '450', 'pit volume'); eq(val('sump', {}, 1), '225', 'pit distance'); eq(val('sump', {}, 2), '9.6', 'pit starts'); eq(val('sump', { qin: 150 }, 2), '10', 'pit worst case'); eq(val('sump', { qin: 400 }, 2), 'never stops', 'pit: pump too small');
  eq(val('pipe'), 'DN 65', 'pipe size'); eq(val('pipe', {}, 2), '0.229', 'pipe loss'); eq(val('pipe', { pick: '25' }, 1), '11.32', 'pipe speed in DN 25');
  eq(val('kv'), '10', 'Kv'); eq(val('kv', {}, 2), '16', 'Kvs'); eq(val('kv', { q: 20, dp: 4 }), '10', 'Kv with 4 bar');
  eq(val('dilute'), '66.7', 'concentrate'); eq(val('dilute', {}, 3), '33.3 min', 'dosing time'); ok(/stronger/.test(val('dilute', { cf: 40 })), 'calc dilute: too strong');
  eq(val('ratio'), '1', 'dosing flow'); eq(val('ratio', {}, 2), '12', 'dosing mA'); eq(val('ratio', { u: 'pct', dose: 0.01, cap: 10 }), '2', 'dosing in %');
  eq(val('batchw'), '24.919', 'stop weight'); eq(val('batchw', {}, 1), '22.19', 'change to slow'); eq(val('batchw', {}, 3), '17.2', 'fill time');
  eq(val('air'), '773', 'compressor'); eq(val('air', {}, 3), '1000', 'receiver'); eq(val('air', {}, 2), '5.5', 'compressor motor'); ok(/higher than the start/.test(val('air', { poff: 6 })), 'calc air: stop below start');
  eq(val('line'), '30', 'belt speed'); eq(val('line', {}, 4), '400', 'gap time'); eq(val('roll'), '4963', 'roll length'); eq(val('roll', {}, 3), '353.7', 'rpm empty');
  eq(val('cool'), '28.8', 'cooling water'); eq(val('cool', { m: 'a', p: 1, dt: 10 }), '299', 'cooling air'); eq(val('tmix'), '11.1', 'hot water');
  eq(val('levelp'), '0 … 400 mbar', 'level sensor range'); eq(val('levelp', {}, 1), '4.077', 'level at 20 mA'); eq(val('levelp', {}, 4), '8.71', 'mA now'); eq(val('levelp', { ht: 12 }), '0 … 1.6 bar', 'range in bar');
  eq(val('mains'), '43.3', 'main current'); eq(val('mains', {}, 1), '50', 'main switch'); eq(val('mains', {}, 2), '10', 'incoming cable');
  eq(val('brake'), '5', 'brake power'); eq(val('brake', {}, 3), '112', 'brake ohms'); eq(val('brake', { tf: 100 }), 'not needed', 'no resistor');
  eq(val('feeder'), '40', 'feeder Hz'); eq(val('takt'), '2', 'machines'); eq(val('takt', {}, 1), '13.05', 'takt');
  // pictures: every one draws and moves without a broken number, at any time and with zeros
  {
    const mk = () => { const log = []; const node = { style: {}, setAttribute: (k, val) => log.push(String(val)), set textContent(val) { log.push(String(val)); } }; return { log, els: new Proxy({}, { get: () => node }) }; };
    C.LIST.filter((c) => c.pic).forEach((c) => {
      const tryIt = (vals, name) => {
        const v = Object.assign(C.defaults(c), vals), r = C.run(c.id, v);
        if (!r || r.err) return;
        let bad = '';
        try {
          const p = c.pic(v, r.x || {}, r);
          if (!/^<svg[^>]*role="img"[^>]*aria-label="[^"]+"/.test(p.svg) || /NaN|undefined|Infinity/.test(p.svg)) bad = 'svg ' + (p.svg.match(/.{20}(NaN|undefined|Infinity).{20}/) || [p.svg.slice(0, 60)])[0];
          if (!p.cap) bad = 'no caption';
          const need = (p.svg.match(/data-i="([^"]+)"/g) || []).map((m) => m.slice(8, -1)), src = String(p.run);
          (src.match(/\be\.([a-z0-9]+)\b/gi) || []).forEach((m) => { const k = m.slice(2); if (need.indexOf(k) < 0 && !/^b$/.test(k) && !new RegExp('if \\(e\\.' + k + '\\)').test(src)) bad = 'run uses e.' + k + ' but the svg has no data-i="' + k + '"'; });
          [0, 0.4, 1.3, 2.9, 4.4, 6.2, 7.4, 33.3, 1000.7].forEach((t) => { const f = mk(); p.run(f.els, t); const x = f.log.find((s) => /NaN|undefined|Infinity/.test(s)); if (x) bad = 't=' + t + ' ' + x; });
        } catch (e) { bad = String(e.message); }
        ok(!bad, 'calc picture ' + c.id + ' (' + name + '): ' + bad);
      };
      tryIt({}, 'example');
      c.f.filter((x) => x.ty === 's').forEach((x) => x.opts.forEach((o) => tryIt({ [x.k]: o[0] }, x.k + '=' + o[0])));
      c.f.filter((x) => x.ty === 'n').forEach((x) => { tryIt({ [x.k]: 0 }, x.k + '=0'); tryIt({ [x.k]: x.d * 40 }, x.k + ' × 40'); });
    });
  }
  ok(C.run('constructor') === null && C.run('nothing') === null, 'calc: unknown id');
}
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
