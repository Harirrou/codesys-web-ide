// node ladder-lab/tests/run.js — verifies engine + every challenge solution
const path = require('path');
['engine', 'st', 'plants', 'challenges', 'lessons'].forEach((f) => { try { require(path.join(__dirname, '../js/' + f + '.js')); } catch (e) { if (f !== 'lessons') throw e; } });
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
console.log('ST sample:\n' + LL.toST(LL.parseProgram(LL.CH_BY_ID['permissive'].solution)));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
