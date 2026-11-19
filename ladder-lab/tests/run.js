// node ladder-lab/tests/run.js — verifies engine + every challenge solution
const path = require('path');
['engine', 'st', 'plants', 'plants-robot', 'plants-starters', 'challenges', 'lessons', 'topics'].forEach((f) => { try { require(path.join(__dirname, '../js/' + f + '.js')); } catch (e) { if (f !== 'lessons') throw e; } });
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
  ok(/TOD\(MW0,MW7\)/.test(rk) && /FRD\(MW7,MW8\)/.test(rk) && /MOV\(MW0,MR0\)/.test(rk) && /TRN\(MR0,MD10\)/.test(rk) && /SCP\(AIW0,0,27648,0\.0,1\.0,MR1\)/.test(rk) && /SCP\(MR1,0\.0,1\.0,0\.0,100\.0,Level\)/.test(rk) && /CPT\(/.test(rk) && /REAL tags/.test(rk), 'Rockwell: TOD / FRD / MOV / TRN / SCP, REAL tags');
  ok(/Status\.4/.test(tc) && /MR0 : REAL/.test(tc) && /Level : REAL/.test(tc) && (tc.match(/\bMR0 : REAL/g) || []).length === 1 && /MW10\.3/.test(tc) && /MR0 := INT_TO_REAL\(MW0\)/.test(tc), 'TwinCAT: wVar.3 and REAL variables, declared once ' + tc);
  ok(/Level : REAL/.test(sy) && /MR1 := \(INT_TO_REAL\(AIW0\)/.test(sy), 'Sysmac: REAL variables');
  ok(/MR0 : REAL/.test(me) && /INT_TO_REAL/.test(me), 'Machine Expert: REAL variables');
  ok(/LD>= D0 #0000/.test(cx) === false && /LD>= D0 #0/.test(cx) && /AND<= D0 #100/.test(cx) && /D1\.04/.test(cx) && /ANDW\(034\) D0 #00FF D3/.test(cx) && /COM\(029\) D6/.test(cx) && /BCD\(024\) D0 D7/.test(cx) && /BIN\(023\) D7 D8/.test(cx) && /FLT\(452\) D0 D2000/.test(cx) && /\/F\(457\) D2004 #2 D2006/.test(cx), 'Omron CX: LD>= AND<=, D bits, ANDW, COM, BCD, BIN, FLT, /F ' + cx);
  // a block with the new instructions exports too
  const bl = LL.parseProgram('NAME b\nCOLS 6\nRUNG\n~ CALL(FB_A,A1,Raw=MW0)\nBLOCK FB_A\nPARAM IN Raw INT\nRUNG\nLIM(0,#Raw,100) COIL(#Ok)\nRUNG\nWAND(#Raw,16#00FF,#Low)');
  ok(!LL.lint(bl).some((x) => x.level === 'error') && /FUNCTION_BLOCK FB_A/.test(LL.toST(bl)) && /Low : INT/.test(LL.toST(bl)) && /#Low := #Raw AND 16#00FF/.test(LL.toTIA(bl)), 'new instructions inside a block');
}
// quiz answers must not be guessable: the right answer may be the longest in at most 30 % of a bank
[['QUIZ', LL.QUIZ], ['QUIZ_IV', LL.QUIZ_IV], ['QUIZ_NET', LL.QUIZ_NET]].forEach(([n, b]) => {
  const longest = b.filter((q) => { const L = q.a.map((x) => x.length); return L[q.c] === Math.max(...L); }).length;
  ok(longest / b.length <= 0.3, n + ': the right answer is the longest in ' + longest + ' of ' + b.length + ' questions (guessable)');
});
// Circuit Lab (js/circuit.js): every reference circuit passes its tests, an empty panel and every broken starter fail,
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
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
