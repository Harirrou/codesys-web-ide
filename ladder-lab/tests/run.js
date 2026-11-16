// node ladder-lab/tests/run.js — verifies engine + every challenge solution
const path = require('path');
['engine', 'plants', 'challenges', 'lessons'].forEach((f) => { try { require(path.join(__dirname, '../js/' + f + '.js')); } catch (e) { if (f !== 'lessons') throw e; } });
const LL = globalThis.LL;
let fail = 0, pass = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// roundtrip parse/serialize
LL.CHALLENGES.forEach((ch) => {
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
  try { const p = LL.parseProgram(l.sims[k].program); const m = new LL.Machine(p); m.scan(10); pass++; }
  catch (e) { fail++; console.log('FAIL lesson sim', l.id, k, e.message); }
}));
console.log('ST sample:\n' + LL.toST(LL.parseProgram(LL.CH_BY_ID['permissive'].solution)));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
