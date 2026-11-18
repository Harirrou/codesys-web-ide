// node ladder-lab/tests/run.js — verifies engine + every challenge solution
const path = require('path');
['engine', 'st', 'plants', 'challenges', 'lessons', 'topics'].forEach((f) => { try { require(path.join(__dirname, '../js/' + f + '.js')); } catch (e) { if (f !== 'lessons') throw e; } });
const LL = globalThis.LL;
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

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
  ok(T.length === 22, 'there are 22 topics, found ' + T.length);
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
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
