/* PLC Start — Structured Text (IEC 61131-3) compiler + runtime.
 * Supports VAR/AT declarations, BOOL/INT/DINT/REAL/TIME/BYTE/WORD, ARRAY,
 * IF/ELSIF/ELSE, CASE (lists, ranges, ELSE), FOR/BY, WHILE, REPEAT, EXIT,
 * RETURN, FBs TON/TOF/TP/CTU/CTD/R_TRIG/F_TRIG/RS/SR, functions ABS/MIN/MAX/
 * LIMIT/SEL/*_TO_*. Direct addresses: %IX0.0 %QX0.0 %MX0.0 %IW0 %QW0 %MW0
 * %IB0 %QB0 %MB0 (and Siemens-style I0.0 Q0.0 M0.0 MW0 AIW0 AQW0).
 * A watchdog stops runaway loops like a real PLC would. */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  const KW = new Set(['IF', 'THEN', 'ELSIF', 'ELSE', 'END_IF', 'CASE', 'OF', 'END_CASE', 'FOR', 'TO', 'BY', 'DO', 'END_FOR', 'WHILE', 'END_WHILE',
    'REPEAT', 'UNTIL', 'END_REPEAT', 'EXIT', 'RETURN', 'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_GLOBAL', 'VAR_TEMP', 'END_VAR', 'AT',
    'ARRAY', 'PROGRAM', 'END_PROGRAM', 'AND', 'OR', 'XOR', 'NOT', 'MOD', 'TRUE', 'FALSE', 'CONSTANT', 'RETAIN']);
  const BASIC = { BOOL: 'BOOL', INT: 'INT', DINT: 'DINT', SINT: 'INT', UINT: 'UINT', UDINT: 'DINT', BYTE: 'BYTE', WORD: 'WORD', DWORD: 'DINT', REAL: 'REAL', LREAL: 'REAL', TIME: 'TIME' };
  const FBS = {
    TON: { in: ['IN', 'PT'], out: ['Q', 'ET'] }, TOF: { in: ['IN', 'PT'], out: ['Q', 'ET'] }, TP: { in: ['IN', 'PT'], out: ['Q', 'ET'] },
    CTU: { in: ['CU', 'R', 'PV'], out: ['Q', 'CV'] }, CTD: { in: ['CD', 'LD', 'PV'], out: ['Q', 'CV'] },
    R_TRIG: { in: ['CLK'], out: ['Q'] }, F_TRIG: { in: ['CLK'], out: ['Q'] },
    RS: { in: ['S', 'R1'], out: ['Q1'] }, SR: { in: ['S1', 'R'], out: ['Q1'] },
  };
  const FUNCS = ['ABS', 'MIN', 'MAX', 'LIMIT', 'SEL', 'SQRT', 'TRUNC', 'SHL', 'SHR', 'ROL', 'ROR'];
  const LOOP_LIMIT = 10000;

  class STError extends Error { constructor(line, msg) { super(msg); this.line = line; } }

  // ───────────── lexer ─────────────
  function parseTime(s) {
    let ms = 0, m, any = false;
    const re = /(\d+(?:\.\d+)?)(ms|s|m|h|d)/gi;
    s = s.replace(/_/g, '').toLowerCase();
    while ((m = re.exec(s))) { any = true; ms += +m[1] * { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]]; }
    return any ? Math.round(ms) : NaN;
  }
  function addrKey(raw) {
    let a = raw.toUpperCase().replace(/^%/, ''), m;
    if ((m = /^([IQM])X?(\d+)\.([0-7])$/.exec(a))) return { kind: 'bit', key: m[1] + (+m[2]) + '.' + m[3], io: m[1] };
    if ((m = /^([IQM])B(\d+)$/.exec(a))) return { kind: 'byte', pre: m[1], n: +m[2], io: m[1] };
    if ((m = /^IW(\d+)$/.exec(a)) || (m = /^AIW(\d+)$/.exec(a))) return { kind: 'word', key: 'AIW' + (+m[1]), io: 'I' };
    if ((m = /^QW(\d+)$/.exec(a)) || (m = /^AQW(\d+)$/.exec(a))) return { kind: 'word', key: 'AQW' + (+m[1]), io: 'Q' };
    if ((m = /^MW(\d+)$/.exec(a))) return { kind: 'word', key: 'MW' + (+m[1]), io: 'M' };
    return null;
  }
  function lex(src) {
    const toks = [];
    let i = 0, line = 1;
    const n = src.length;
    while (i < n) {
      const ch = src[i];
      if (ch === '\n') { line++; i++; continue; }
      if (/\s/.test(ch)) { i++; continue; }
      if (src.startsWith('(*', i)) { const j = src.indexOf('*)', i + 2); const end = j < 0 ? n : j + 2; for (let k = i; k < end; k++) if (src[k] === '\n') line++; i = end; continue; }
      if (src.startsWith('//', i)) { while (i < n && src[i] !== '\n') i++; continue; }
      const rest = src.slice(i, i + 64);
      let m;
      if ((m = /^(?:T|TIME)#[-\d_.a-z]+/i.exec(rest))) { const v = parseTime(m[0].split('#')[1]); if (isNaN(v)) throw new STError(line, 'Bad time literal ' + m[0] + ' (use T#3s, T#500ms, T#1m30s).'); toks.push({ t: 'num', v, ty: 'TIME', line }); i += m[0].length; continue; }
      if ((m = /^(2|8|16)#[0-9A-Fa-f_]+/.exec(rest))) { const [b, d] = m[0].split('#'); toks.push({ t: 'num', v: parseInt(d.replace(/_/g, ''), +b), ty: 'INT', line }); i += m[0].length; continue; }
      if ((m = /^\d[\d_]*(\.\d+)?([eE][+-]?\d+)?/.exec(rest)) && !/^\d+\.\./.test(rest.slice(0, m[0].length + 1))) {
        // "1..5" must lex as 1 .. 5
        let txt = m[0];
        if (/^\d+\.\d+/.test(txt) && rest.slice(txt.indexOf('.'), txt.indexOf('.') + 2) === '..') txt = txt.slice(0, txt.indexOf('.'));
        toks.push({ t: 'num', v: +txt.replace(/_/g, ''), ty: /[.eE]/.test(txt) ? 'REAL' : 'INT', line }); i += txt.length; continue;
      }
      if ((m = /^\d+/.exec(rest))) { toks.push({ t: 'num', v: +m[0], ty: 'INT', line }); i += m[0].length; continue; }
      if ((m = /^%[IQM][XBWD]?\d+(?:\.\d+)?/i.exec(rest))) { const k = addrKey(m[0]); if (!k) throw new STError(line, 'Unknown address ' + m[0] + '.'); toks.push({ t: 'addr', v: k, raw: m[0], line }); i += m[0].length; continue; }
      if ((m = /^(?:[IQM]\d+\.[0-7]|A[IQ]W\d+|MW\d+)(?![\w.])/i.exec(rest))) { toks.push({ t: 'addr', v: addrKey(m[0]), raw: m[0], line }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_]\w*/.exec(rest))) { const u = m[0].toUpperCase(); toks.push(KW.has(u) ? { t: 'kw', v: u, line } : { t: 'id', v: u, raw: m[0], line }); i += m[0].length; continue; }
      const two = src.substr(i, 2);
      if ([':=', '<>', '<=', '>=', '..', '=>', '**'].includes(two)) { toks.push({ t: 'op', v: two, line }); i += 2; continue; }
      if ('+-*/()[],;:=<>.&'.includes(ch)) { toks.push({ t: 'op', v: ch === '&' ? 'AND' : ch, line }); i++; continue; }
      throw new STError(line, 'Unexpected character "' + ch + '".');
    }
    toks.push({ t: 'eof', v: '', line });
    return toks;
  }

  // ───────────── parser ─────────────
  function parse(src) {
    const toks = lex(src);
    let p = 0;
    const peek = (o) => toks[p + (o || 0)];
    const next = () => toks[p++];
    const is = (t, v) => { const k = toks[p]; return k.t === t && (v == null || k.v === v); };
    const isOp = (v) => is('op', v), isKw = (v) => is('kw', v);
    const fail = (msg, tk) => { throw new STError((tk || peek()).line, msg); };
    const what = (tk) => (tk.t === 'eof' ? 'end of program' : '"' + (tk.raw || tk.v) + '"');
    const expectOp = (v) => { if (!isOp(v)) fail('Expected "' + v + '" but found ' + what(peek()) + '.' + (v === ';' ? ' Every statement ends with a semicolon.' : '')); return next(); };
    const expectKw = (v) => { if (!isKw(v)) fail('Expected ' + v + ' but found ' + what(peek()) + '.'); return next(); };
    const decls = {}, order = [];

    function parseType() {
      if (isKw('ARRAY')) {
        next(); expectOp('[');
        const lo = signedInt(); expectOp('..'); const hi = signedInt(); expectOp(']'); expectKw('OF');
        const el = next();
        if (el.t !== 'id' || !BASIC[el.v]) fail('Arrays may hold BOOL, INT, DINT, REAL or TIME.', el);
        if (hi < lo || hi - lo > 999) fail('Array bounds must be lo..hi with at most 1000 elements.');
        return { arr: true, lo, hi, el: BASIC[el.v] };
      }
      const t = next();
      if (t.t !== 'id') fail('Expected a type such as BOOL, INT or TON.', t);
      if (BASIC[t.v]) return { base: BASIC[t.v] };
      if (FBS[t.v]) return { fb: t.v };
      fail('Unknown type ' + t.raw + '. Use BOOL, INT, DINT, REAL, TIME, BYTE, WORD, ARRAY, or TON/TOF/TP/CTU/CTD/R_TRIG/F_TRIG/RS/SR.', t);
    }
    function signedInt() { let s = 1; if (isOp('-')) { next(); s = -1; } const t = next(); if (t.t !== 'num') fail('Expected a number.', t); return s * t.v; }
    function parseVarBlock() {
      next(); // VAR...
      while (isKw('CONSTANT') || isKw('RETAIN')) next();
      while (!isKw('END_VAR')) {
        if (is('eof')) fail('Missing END_VAR.');
        const names = [];
        do { const t = next(); if (t.t !== 'id') fail('Expected a variable name but found ' + what(t) + '.', t); names.push(t); } while (isOp(',') && next());
        let at = null;
        if (isKw('AT')) { next(); const a = next(); if (a.t !== 'addr') fail('Expected an address after AT, like %IX0.0.', a); at = a.v; }
        expectOp(':');
        const type = parseType();
        let init = null;
        if (isOp(':=')) {
          next();
          if (type.arr && isOp('[')) { next(); init = []; do { init.push(parseExpr()); } while (isOp(',') && next()); expectOp(']'); }
          else init = parseExpr();
        }
        expectOp(';');
        names.forEach((nm) => {
          if (decls[nm.v]) fail('Variable ' + nm.raw + ' is declared twice.', nm);
          if (at && type.fb) fail('A function block cannot be bound to an address.', nm);
          if (at && type.arr) fail('An array cannot be bound with AT here. Copy inputs into it instead.', nm);
          if (at && at.kind === 'bit' && type.base !== 'BOOL') fail(nm.raw + ' is on a bit address, so it must be BOOL.', nm);
          decls[nm.v] = { name: nm.raw, U: nm.v, type, at, init, line: nm.line };
          order.push(nm.v);
        });
      }
      next(); // END_VAR
      if (isOp(';')) next();
    }

    // expressions
    function parseExpr() { return parseOr(); }
    function bin(sub, ops) {
      return function () {
        let a = sub();
        for (;;) {
          const k = peek();
          const op = (k.t === 'kw' || k.t === 'op') && ops.includes(k.v) ? k.v : null;
          if (!op) return a;
          next();
          a = { k: 'bin', op, a, b: sub(), line: k.line };
        }
      };
    }
    function parseUnary() {
      if (isKw('NOT')) { const t = next(); return { k: 'un', op: 'NOT', x: parseUnary(), line: t.line }; }
      if (isOp('-')) { const t = next(); return { k: 'un', op: '-', x: parseUnary(), line: t.line }; }
      if (isOp('+')) { next(); return parseUnary(); }
      return parsePrimary();
    }
    const parseMul = bin(parseUnary, ['*', '/', 'MOD']);
    const parseAdd = bin(parseMul, ['+', '-']);
    const parseRel = bin(parseAdd, ['<', '>', '<=', '>=']);
    const parseEq = bin(parseRel, ['=', '<>']);
    const parseAnd = bin(parseEq, ['AND']);
    const parseXor = bin(parseAnd, ['XOR']);
    const parseOr = bin(parseXor, ['OR']);
    function parsePrimary() {
      const t = next();
      if (t.t === 'num') return { k: 'num', v: t.v, ty: t.ty, line: t.line };
      if (t.t === 'kw' && (t.v === 'TRUE' || t.v === 'FALSE')) return { k: 'num', v: t.v === 'TRUE', ty: 'BOOL', line: t.line };
      if (t.t === 'addr') return { k: 'addr', a: t.v, raw: t.raw, line: t.line };
      if (t.t === 'op' && t.v === '(') { const e = parseExpr(); expectOp(')'); return e; }
      if (t.t === 'id') {
        if (isOp('(')) {
          next();
          const args = [];
          if (!isOp(')')) do { args.push(parseExpr()); } while (isOp(',') && next());
          expectOp(')');
          return { k: 'call', name: t.v, raw: t.raw, args, line: t.line };
        }
        let e = { k: 'var', name: t.v, raw: t.raw, line: t.line };
        for (;;) {
          if (isOp('[')) { next(); const ix = parseExpr(); expectOp(']'); e = { k: 'idx', base: e, ix, line: t.line }; continue; }
          if (isOp('.')) { next(); const mbr = next(); if (mbr.t !== 'id' && mbr.t !== 'kw') fail('Expected a member name after "."', mbr); e = { k: 'mem', base: e, m: mbr.v, line: t.line }; continue; }
          return e;
        }
      }
      fail('Expected a value but found ' + what(t) + '.', t);
    }

    // statements
    const ENDERS = new Set(['END_IF', 'ELSIF', 'ELSE', 'END_CASE', 'END_FOR', 'END_WHILE', 'UNTIL', 'END_REPEAT', 'END_PROGRAM']);
    function isCaseLabel() {
      let o = 0;
      if (peek().t === 'op' && peek().v === '-') o = 1;
      const a = peek(o), b = peek(o + 1);
      return (a.t === 'num' || a.t === 'id') && b.t === 'op' && (b.v === ':' || b.v === ',' || b.v === '..');
    }
    function parseStmts(inCase) {
      const out = [];
      while (!(peek().t === 'kw' && ENDERS.has(peek().v)) && !is('eof')) {
        if (inCase && isCaseLabel()) break;
        const s = parseStmt();
        if (s) out.push(s);
      }
      return out;
    }
    function endWith(kw) { expectKw(kw); if (isOp(';')) next(); }
    function parseStmt() {
      const t = peek();
      if (isOp(';')) { next(); return null; }
      if (t.t === 'kw') {
        switch (t.v) {
          case 'IF': {
            next(); const conds = [];
            let c = parseExpr(); expectKw('THEN'); conds.push([c, parseStmts()]);
            let els = null;
            for (;;) {
              if (isKw('ELSIF')) { next(); c = parseExpr(); expectKw('THEN'); conds.push([c, parseStmts()]); continue; }
              if (isKw('ELSE')) { next(); els = parseStmts(); }
              break;
            }
            endWith('END_IF');
            return { k: 'if', conds, els, line: t.line };
          }
          case 'CASE': {
            next(); const sel = parseExpr(); expectKw('OF');
            const branches = []; let els = null;
            while (!isKw('END_CASE')) {
              if (isKw('ELSE')) { next(); els = parseStmts(true); continue; }
              if (!isCaseLabel()) fail('Expected a case label like "1:" or END_CASE but found ' + what(peek()) + '.');
              const labels = [];
              do {
                const lo = isOp('-') || peek().t === 'num' ? signedInt() : { name: next() };
                let hi = lo;
                if (isOp('..')) { next(); hi = signedInt(); }
                labels.push({ lo, hi });
              } while (isOp(',') && next());
              expectOp(':');
              branches.push({ labels, body: parseStmts(true) });
            }
            endWith('END_CASE');
            return { k: 'case', sel, branches, els, line: t.line };
          }
          case 'FOR': {
            next(); const v = next(); if (v.t !== 'id') fail('Expected a loop variable.', v);
            expectOp(':='); const from = parseExpr(); expectKw('TO'); const to = parseExpr();
            let by = null; if (isKw('BY')) { next(); by = parseExpr(); }
            expectKw('DO'); const body = parseStmts(); endWith('END_FOR');
            return { k: 'for', v: { k: 'var', name: v.v, raw: v.raw, line: v.line }, from, to, by, body, line: t.line };
          }
          case 'WHILE': { next(); const c = parseExpr(); expectKw('DO'); const body = parseStmts(); endWith('END_WHILE'); return { k: 'while', c, body, line: t.line }; }
          case 'REPEAT': { next(); const body = parseStmts(); expectKw('UNTIL'); const c = parseExpr(); endWith('END_REPEAT'); return { k: 'repeat', c, body, line: t.line }; }
          case 'EXIT': next(); expectOp(';'); return { k: 'exit', line: t.line };
          case 'RETURN': next(); expectOp(';'); return { k: 'return', line: t.line };
          default: fail(t.v + ' cannot start a statement here.');
        }
      }
      // assignment or FB call
      if (t.t === 'id' && peek(1).t === 'op' && peek(1).v === '(') {
        next(); next();
        const args = {};
        if (!isOp(')')) do {
          const n = next(); if (n.t !== 'id') fail('Function block inputs are named: T1(IN := Start, PT := T#3s);', n);
          expectOp(':='); args[n.v] = parseExpr();
        } while (isOp(',') && next());
        expectOp(')'); expectOp(';');
        return { k: 'fbcall', name: t.v, raw: t.raw, args, line: t.line };
      }
      const target = parsePrimary();
      if (target.k === 'call') fail('Functions return a value. Use it in an assignment: x := ' + target.raw + '(...);', t);
      if (isOp('=')) fail('Use := to assign a value. A single "=" compares.');
      expectOp(':=');
      const e = parseExpr();
      expectOp(';');
      return { k: 'assign', target, e, line: t.line };
    }

    // program
    if (isKw('PROGRAM')) { next(); if (is('id')) next(); }
    while (/^VAR/.test(peek().v) && peek().t === 'kw') parseVarBlock();
    const body = parseStmts();
    if (isKw('END_PROGRAM')) { next(); if (isOp(';')) next(); }
    if (!is('eof')) fail('Unexpected ' + what(peek()) + '. Check that every IF/CASE/FOR/WHILE has its END_….');
    return { decls, order, body };
  }

  // ───────────── semantic check ─────────────
  function check(ast) {
    const D = ast.decls;
    const typeOf = (e) => {
      switch (e.k) {
        case 'num': return e.ty;
        case 'addr': return e.a.kind === 'bit' ? 'BOOL' : 'INT';
        case 'var': { const d = D[e.name]; if (!d) throw new STError(e.line, 'Unknown variable ' + e.raw + '. Declare it between VAR and END_VAR.'); return d.type.base || (d.type.fb ? 'FB' : 'ARR'); }
        case 'idx': { const b = e.base; if (b.k !== 'var' || !D[b.name] || !D[b.name].type.arr) throw new STError(e.line, 'Only arrays can be indexed with [ ].'); typeOf(e.ix); return D[b.name].type.el; }
        case 'mem': {
          const b = e.base; const d = b.k === 'var' && D[b.name];
          if (!d || !d.type.fb) throw new STError(e.line, 'Only function blocks have members (like T1.Q).');
          const fb = FBS[d.type.fb];
          if (!fb.in.includes(e.m) && !fb.out.includes(e.m)) throw new STError(e.line, d.type.fb + ' has no member ' + e.m + '. It has ' + fb.in.concat(fb.out).join(', ') + '.');
          return ['Q', 'Q1', 'IN', 'CU', 'CD', 'R', 'LD', 'CLK', 'S', 'S1', 'R1'].includes(e.m) ? 'BOOL' : e.m === 'ET' || e.m === 'PT' ? 'TIME' : 'INT';
        }
        case 'un': { const t = typeOf(e.x); return e.op === 'NOT' ? t : t; }
        case 'bin': {
          const a = typeOf(e.a), b = typeOf(e.b);
          if (['=', '<>', '<', '>', '<=', '>='].includes(e.op)) return 'BOOL';
          if (['AND', 'OR', 'XOR'].includes(e.op)) return a === 'BOOL' && b === 'BOOL' ? 'BOOL' : 'INT';
          return a === 'REAL' || b === 'REAL' ? 'REAL' : a === 'TIME' || b === 'TIME' ? 'TIME' : 'INT';
        }
        case 'call': {
          const nm = e.name;
          e.args.forEach(typeOf);
          if (D[nm] && D[nm].type.fb) throw new STError(e.line, 'Call a function block as its own statement: ' + e.raw + '(IN := …); then read ' + e.raw + '.Q');
          if (FBS[nm]) throw new STError(e.line, nm + ' is a function block. Declare an instance (T1 : ' + nm + ';) and call it.');
          if (/_TO_/.test(nm)) { const to = nm.split('_TO_')[1]; return to === 'REAL' || to === 'LREAL' ? 'REAL' : to === 'BOOL' ? 'BOOL' : to === 'TIME' ? 'TIME' : 'INT'; }
          if (!FUNCS.includes(nm)) throw new STError(e.line, 'Unknown function ' + e.raw + '. Available: ' + FUNCS.join(', ') + ', and conversions like INT_TO_REAL.');
          return e.args.length ? typeOf(e.args[e.args.length - 1]) : 'INT';
        }
      }
      return 'INT';
    };
    const lval = (e) => {
      if (e.k === 'addr') { if (e.a.io === 'I') throw new STError(e.line, 'Inputs are read-only: ' + e.raw + ' is written by the field device.'); return; }
      if (e.k === 'var') { const d = D[e.name]; typeOf(e); if (d.type.fb) throw new STError(e.line, 'You cannot assign to a function block. Call it instead.'); if (d.type.arr) throw new STError(e.line, 'Assign array elements one at a time: ' + e.raw + '[i] := …'); if (d.at && d.at.io === 'I') throw new STError(e.line, d.name + ' is an input (AT ' + d.at.key + '); inputs are read-only.'); return; }
      if (e.k === 'idx') { typeOf(e); return; }
      if (e.k === 'mem') { typeOf(e); const fb = FBS[D[e.base.name].type.fb]; if (!fb.in.includes(e.m)) throw new STError(e.line, e.m + ' is an output of the block; it is read-only.'); return; }
      throw new STError(e.line, 'Cannot assign to this.');
    };
    const stmts = (list) => list.forEach((s) => {
      switch (s.k) {
        case 'assign': lval(s.target); typeOf(s.e); break;
        case 'fbcall': {
          const d = D[s.name];
          if (!d) throw new STError(s.line, 'Unknown function block instance ' + s.raw + '. Declare it: ' + s.raw + ' : TON;');
          if (!d.type.fb) throw new STError(s.line, s.raw + ' is not a function block.');
          const fb = FBS[d.type.fb];
          Object.keys(s.args).forEach((k) => { if (!fb.in.includes(k)) throw new STError(s.line, d.type.fb + ' has no input ' + k + '. Its inputs are ' + fb.in.join(', ') + '.'); typeOf(s.args[k]); });
          break;
        }
        case 'if': s.conds.forEach(([c, b]) => { typeOf(c); stmts(b); }); if (s.els) stmts(s.els); break;
        case 'case': typeOf(s.sel); s.branches.forEach((b) => stmts(b.body)); if (s.els) stmts(s.els); break;
        case 'for': lval(s.v); typeOf(s.from); typeOf(s.to); if (s.by) typeOf(s.by); stmts(s.body); break;
        case 'while': case 'repeat': typeOf(s.c); stmts(s.body); break;
      }
    });
    Object.values(D).forEach((d) => { if (d.init && !Array.isArray(d.init)) typeOf(d.init); });
    stmts(ast.body);
  }

  LL.compileST = function (src, name) {
    try {
      const ast = parse(String(src || ''));
      check(ast);
      const lines = String(src).split('\n').length;
      return { lang: 'st', ok: true, src, name: name || 'ST program', ast, lines };
    } catch (e) {
      if (e instanceof STError) return { lang: 'st', ok: false, src, name: name || 'ST program', error: { line: e.line, msg: e.message } };
      throw e;
    }
  };

  // ───────────── runtime ─────────────
  const wrap = (v, bits, signed) => { const m = 2 ** bits; v = Math.trunc(v); v = ((v % m) + m) % m; return signed && v >= m / 2 ? v - m : v; };
  function coerce(v, base) {
    switch (base) {
      case 'BOOL': return !!v;
      case 'INT': return wrap(+v, 16, true);
      case 'DINT': return wrap(+v, 32, true);
      case 'UINT': case 'WORD': return wrap(+v, 16, false);
      case 'BYTE': return wrap(+v, 8, false);
      case 'TIME': return Math.round(+v);
      default: return +v;
    }
  }
  class Break { constructor(kind) { this.kind = kind; } }

  class STMachine {
    constructor(prog) { this.prog = prog; this.trace = null; this.reset(); }
    load(prog) { this.prog = prog; this.reset(); }
    reset() {
      this.bits = {}; this.words = {}; this.inputs = {}; this.vars = {};
      this.scanCount = 0; this.time = 0; this.phase = 0; this.error = null;
      this.timers = {};
      if (!this.prog.ok) { this.error = 'Line ' + this.prog.error.line + ': ' + this.prog.error.msg; return; }
      const D = this.prog.ast.decls;
      for (const k of this.prog.ast.order) {
        const d = D[k];
        if (d.type.fb) { const o = { __fb: d.type.fb }; FBS[d.type.fb].in.concat(FBS[d.type.fb].out).forEach((m) => (o[m] = ['ET', 'PT', 'CV', 'PV'].includes(m) ? 0 : false)); o._p = false; this.vars[k] = o; }
        else if (d.type.arr) {
          const a = new Array(d.type.hi - d.type.lo + 1).fill(coerce(0, d.type.el));
          if (Array.isArray(d.init)) d.init.forEach((e, i) => { if (i < a.length) a[i] = coerce(this.ev(e), d.type.el); });
          this.vars[k] = a;
        } else if (!d.at) this.vars[k] = coerce(d.init ? this.ev(d.init) : 0, d.type.base);
        else if (d.init && d.at.io !== 'I') this.writeAddr(d.at, coerce(this.ev(d.init), d.type.base));
      }
    }
    setInputs(obj) { for (const k in obj) this.inputs[k] = /^AIW/.test(k) ? Math.round(+obj[k] || 0) : obj[k] ? 1 : 0; }

    // I/O image
    readAddr(a) {
      if (a.kind === 'bit') return !!this.bits[a.key];
      if (a.kind === 'word') return this.words[a.key] | 0;
      let v = 0; for (let b = 0; b < 8; b++) if (this.bits[a.pre + a.n + '.' + b]) v |= 1 << b; return v;
    }
    writeAddr(a, v) {
      if (a.io === 'I') return;
      if (a.kind === 'bit') this.bits[a.key] = v ? 1 : 0;
      else if (a.kind === 'word') this.words[a.key] = wrap(+v, 16, true);
      else for (let b = 0; b < 8; b++) this.bits[a.pre + a.n + '.' + b] = (v >> b) & 1;
    }
    err(line, msg) { throw new STError(line, msg); }

    // expression evaluation
    ev(e) {
      switch (e.k) {
        case 'num': return e.v;
        case 'addr': return this.readAddr(e.a);
        case 'var': { const d = this.prog.ast.decls[e.name]; return d.at ? (d.type.base === 'BOOL' ? !!this.readAddr(d.at) : this.readAddr(d.at)) : this.vars[e.name]; }
        case 'idx': {
          const d = this.prog.ast.decls[e.base.name]; const i = Math.trunc(+this.ev(e.ix));
          if (i < d.type.lo || i > d.type.hi) this.err(e.line, 'Array index ' + i + ' is outside ' + d.name + '[' + d.type.lo + '..' + d.type.hi + ']. A real PLC would fault here.');
          return this.vars[e.base.name][i - d.type.lo];
        }
        case 'mem': return this.vars[e.base.name][e.m];
        case 'un': { const x = this.ev(e.x); return e.op === '-' ? -x : typeof x === 'boolean' ? !x : ~x & 0xffff; }
        case 'bin': {
          const op = e.op;
          if (op === 'AND' || op === 'OR' || op === 'XOR') {
            const a = this.ev(e.a), b = this.ev(e.b);
            if (typeof a === 'boolean' && typeof b === 'boolean') return op === 'AND' ? a && b : op === 'OR' ? a || b : a !== b;
            return op === 'AND' ? (+a & +b) : op === 'OR' ? (+a | +b) : (+a ^ +b);
          }
          const a = this.ev(e.a), b = this.ev(e.b);
          switch (op) {
            case '+': return +a + +b; case '-': return +a - +b; case '*': return +a * +b;
            case '/': { if (+b === 0) this.err(e.line, 'Division by zero. A real PLC would stop with a fault.'); const r = +a / +b; return Number.isInteger(+a) && Number.isInteger(+b) && !this.isReal(e) ? Math.trunc(r) : r; }
            case 'MOD': { if (+b === 0) this.err(e.line, 'MOD by zero.'); return +a % +b; }
            case '=': return a == b; case '<>': return a != b; // eslint-disable-line eqeqeq
            case '<': return +a < +b; case '>': return +a > +b; case '<=': return +a <= +b; case '>=': return +a >= +b;
          }
          return 0;
        }
        case 'call': {
          const v = e.args.map((x) => this.ev(x)), nm = e.name;
          if (/_TO_/.test(nm)) { const to = nm.split('_TO_')[1]; return to === 'REAL' || to === 'LREAL' ? +v[0] : to === 'BOOL' ? !!v[0] : Math.round(+v[0]); }
          switch (nm) {
            case 'ABS': return Math.abs(v[0]); case 'MIN': return Math.min(...v); case 'MAX': return Math.max(...v);
            case 'LIMIT': return Math.min(Math.max(v[1], v[0]), v[2]); case 'SEL': return v[0] ? v[2] : v[1];
            case 'SQRT': return Math.sqrt(v[0]); case 'TRUNC': return Math.trunc(v[0]);
            case 'SHL': return ((v[0] & 0xffff) << Math.max(0, Math.min(16, v[1]))) & 0xffff;
            case 'SHR': return (v[0] & 0xffff) >>> Math.max(0, Math.min(16, v[1]));
            case 'ROL': { const n = ((v[1] % 16) + 16) % 16, x = v[0] & 0xffff; return ((x << n) | (x >>> (16 - n))) & 0xffff; }
            case 'ROR': { const n = ((v[1] % 16) + 16) % 16, x = v[0] & 0xffff; return ((x >>> n) | (x << (16 - n))) & 0xffff; }
          }
        }
      }
      return 0;
    }
    isReal(e) {
      const D = this.prog.ast.decls;
      const r = (x) => x.k === 'num' ? x.ty === 'REAL' : x.k === 'var' ? D[x.name] && D[x.name].type.base === 'REAL' : x.k === 'idx' ? D[x.base.name].type.el === 'REAL' : x.k === 'bin' ? r(x.a) || r(x.b) : x.k === 'call' ? /TO_L?REAL|SQRT/.test(x.name) : false;
      return r(e.a) || r(e.b);
    }
    assign(t, v) {
      const D = this.prog.ast.decls;
      if (t.k === 'addr') return this.writeAddr(t.a, t.a.kind === 'bit' ? !!v : v);
      if (t.k === 'var') { const d = D[t.name]; if (d.at) this.writeAddr(d.at, coerce(v, d.type.base)); else this.vars[t.name] = coerce(v, d.type.base); return; }
      if (t.k === 'idx') {
        const d = D[t.base.name]; const i = Math.trunc(+this.ev(t.ix));
        if (i < d.type.lo || i > d.type.hi) this.err(t.line, 'Array index ' + i + ' is outside ' + d.name + '[' + d.type.lo + '..' + d.type.hi + ']. A real PLC would fault here.');
        this.vars[t.base.name][i - d.type.lo] = coerce(v, d.type.el); return;
      }
      if (t.k === 'mem') { const fb = this.vars[t.base.name]; fb[t.m] = ['PT', 'PV'].includes(t.m) ? +v : !!v; }
    }
    runFB(o) {
      const now = this.time;
      switch (o.__fb) {
        case 'TON':
          if (o.IN) { if (!o._p) o._s = now; o.ET = Math.min(now - o._s, o.PT); o.Q = o.ET >= o.PT; } else { o.ET = 0; o.Q = false; }
          o._p = !!o.IN; break;
        case 'TOF':
          if (o.IN) { o.Q = true; o.ET = 0; o._run = false; } else if (o._p) { o._s = now; o._run = true; }
          if (!o.IN && o._run) { o.ET = Math.min(now - o._s, o.PT); if (o.ET >= o.PT) { o.Q = false; o._run = false; } }
          o._p = !!o.IN; break;
        case 'TP':
          if (!o.Q && o.IN && !o._p) { o.Q = true; o._s = now; }
          if (o.Q) { o.ET = Math.min(now - o._s, o.PT); if (o.ET >= o.PT) o.Q = false; } else if (!o.IN) o.ET = 0;
          o._p = !!o.IN; break;
        case 'CTU': if (o.R) o.CV = 0; else if (o.CU && !o._p) o.CV = Math.min(32767, o.CV + 1); o._p = !!o.CU; o.Q = o.CV >= o.PV; break;
        case 'CTD': if (o.LD) o.CV = o.PV; else if (o.CD && !o._p) o.CV = Math.max(-32768, o.CV - 1); o._p = !!o.CD; o.Q = o.CV <= 0; break;
        case 'R_TRIG': o.Q = !!o.CLK && !o._p; o._p = !!o.CLK; break;
        case 'F_TRIG': o.Q = !o.CLK && o._p; o._p = !!o.CLK; break;
        case 'RS': o.Q1 = !o.R1 && (!!o.S || o.Q1); break;
        case 'SR': o.Q1 = !!o.S1 || (!o.R && o.Q1); break;
      }
    }
    exec(list) {
      for (const s of list) {
        switch (s.k) {
          case 'assign': this.assign(s.target, this.ev(s.e)); break;
          case 'fbcall': { const o = this.vars[s.name]; for (const k in s.args) { const v = this.ev(s.args[k]); o[k] = ['PT', 'PV'].includes(k) ? +v : !!v; } this.runFB(o); break; }
          case 'if': { let done = false; for (const [c, b] of s.conds) if (this.ev(c)) { this.exec(b); done = true; break; } if (!done && s.els) this.exec(s.els); break; }
          case 'case': {
            const v = Math.trunc(+this.ev(s.sel)); let hit = false;
            for (const br of s.branches) {
              if (br.labels.some((l) => { const lo = typeof l.lo === 'object' ? this.ev({ k: 'var', name: l.lo.name.v, line: s.line }) : l.lo; const hi = typeof l.hi === 'object' ? lo : l.hi; return v >= lo && v <= hi; })) { this.exec(br.body); hit = true; break; }
            }
            if (!hit && s.els) this.exec(s.els);
            break;
          }
          case 'for': {
            const from = +this.ev(s.from), to = +this.ev(s.to), by = s.by ? +this.ev(s.by) : 1;
            if (by === 0) this.err(s.line, 'FOR … BY 0 would never end.');
            let n = 0;
            this.assign(s.v, from);
            while (by > 0 ? this.ev(s.v) <= to : this.ev(s.v) >= to) {
              if (++n > LOOP_LIMIT) this.err(s.line, 'FOR loop ran more than ' + LOOP_LIMIT + ' times in one scan: watchdog timeout. A real PLC would go to STOP.');
              try { this.exec(s.body); } catch (x) { if (x instanceof Break && x.kind === 'exit') break; throw x; }
              this.assign(s.v, +this.ev(s.v) + by);
            }
            break;
          }
          case 'while': case 'repeat': {
            let n = 0;
            for (;;) {
              if (s.k === 'while' && !this.ev(s.c)) break;
              if (++n > LOOP_LIMIT) this.err(s.line, (s.k === 'while' ? 'WHILE' : 'REPEAT') + ' loop ran more than ' + LOOP_LIMIT + ' times in one scan: watchdog timeout. The PLC went to STOP. Inputs never change inside a loop, so never wait for a sensor in WHILE: use IF or CASE across scans instead.');
              try { this.exec(s.body); } catch (x) { if (x instanceof Break && x.kind === 'exit') break; throw x; }
              if (s.k === 'repeat' && this.ev(s.c)) break;
            }
            break;
          }
          case 'exit': throw new Break('exit');
          case 'return': throw new Break('return');
        }
      }
    }
    scan(dt) {
      dt = dt || 10;
      if (this.error) return;
      for (const k in this.inputs) { if (/^I/.test(k)) this.bits[k] = this.inputs[k]; else if (/^AIW/.test(k)) this.words[k] = this.inputs[k]; }
      try { this.exec(this.prog.ast.body); }
      catch (x) {
        if (x instanceof Break) { /* RETURN or stray EXIT ends the scan */ }
        else if (x instanceof STError) this.error = 'Line ' + x.line + ': ' + x.message;
        else throw x;
      }
      this.scanCount++; this.time += dt;
    }
    stepPhase(dt) { this.scan(dt); return 0; }
    outputs() {
      const o = {};
      for (const k in this.bits) if (k[0] === 'Q') o[k] = this.bits[k];
      for (const k in this.words) if (/^AQW/.test(k)) o[k] = this.words[k];
      return o;
    }
    bit(a) { if (/^[IQM]\d+\.[0-7]$/.test(a)) return this.bits[a] ? 1 : 0; const v = this.read(a); return v ? 1 : 0; }
    word(a) { if (/^(MW|AIW|AQW)\d+$/.test(a)) return this.words[a] | 0; return +this.read(a) || 0; }
    compare() { return false; }
    read(a) {
      a = String(a).toUpperCase();
      if (/^[IQM]\d+\.[0-7]$/.test(a)) return this.bits[a] ? 1 : 0;
      if (/^(MW|AIW|AQW)\d+$/.test(a)) return this.words[a] | 0;
      if (!this.prog.ok) return 0;
      const [n, mbr] = a.split('.');
      const d = this.prog.ast.decls[n];
      if (!d) return 0;
      let v = d.at ? this.readAddr(d.at) : this.vars[n];
      if (mbr && v && typeof v === 'object') v = v[mbr];
      return typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'number' ? v : 0;
    }
    // variables for the watch table
    listVars() {
      if (!this.prog.ok) return [];
      const out = [];
      const fmt = (v, ty) => typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : ty === 'TIME' ? (v / 1000).toFixed(2) + ' s' : ty === 'REAL' ? (+v).toFixed(2) : String(v);
      for (const k of this.prog.ast.order) {
        const d = this.prog.ast.decls[k];
        if (d.at) { out.push({ name: d.name, at: d.at.key || ('%' + d.at.pre + 'B' + d.at.n), value: fmt(d.type.base === 'BOOL' ? !!this.readAddr(d.at) : this.readAddr(d.at), d.type.base), on: d.type.base === 'BOOL' && !!this.readAddr(d.at) }); continue; }
        const v = this.vars[k];
        if (d.type.fb) {
          const f = FBS[d.type.fb];
          const parts = f.out.map((m) => m + '=' + fmt(v[m], m === 'ET' ? 'TIME' : ''));
          out.push({ name: d.name, type: d.type.fb, value: parts.join(' '), on: !!(v.Q || v.Q1) });
        } else if (d.type.arr) out.push({ name: d.name, type: 'ARRAY', value: '[' + v.slice(0, 10).map((x) => fmt(x, d.type.el)).join(', ') + (v.length > 10 ? ', …' : '') + ']' });
        else out.push({ name: d.name, type: d.type.base, value: fmt(v, d.type.base), on: v === true });
      }
      return out;
    }
  }

  LL.STMachine = STMachine;
  LL.makeMachine = (prog) => (prog && prog.lang === 'st' ? new STMachine(prog) : new LL.Machine(prog));

  // Build a VAR block from a machine's I/O list
  LL.stIoDecls = function (plant, tags) {
    const used = new Set();
    const ident = (s) => {
      let n = String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'X';
      if (/^\d/.test(n)) n = '_' + n;
      if (KW.has(n.toUpperCase()) || BASIC[n.toUpperCase()] || FBS[n.toUpperCase()]) n += '_';
      let k = n, i = 2; while (used.has(k.toUpperCase())) k = n + '_' + i++;
      used.add(k.toUpperCase());
      return k;
    };
    const iec = (a) => /^AIW(\d+)/.test(a) ? '%IW' + a.slice(3) : /^AQW(\d+)/.test(a) ? '%QW' + a.slice(3) : '%' + a[0] + 'X' + a.slice(1);
    const lines = ['VAR'];
    plant.inputs.concat(plant.outputs).forEach((d) => {
      if (d.kind === 'sel3') { lines.push('  ' + ident(d.name + 'Manual') + ' AT ' + iec(d.addr) + ' : BOOL;   (* selector in MAN *)'); lines.push('  ' + ident(d.name + 'Auto') + ' AT ' + iec(d.addr2) + ' : BOOL;   (* selector in AUTO *)'); return; }
      const nm = ident((tags && tags[d.addr]) || d.name);
      const ty = /^A[IQ]W/.test(d.addr) ? 'INT' : 'BOOL';
      lines.push('  ' + nm + ' AT ' + iec(d.addr) + ' : ' + ty + ';' + (d.kind === 'pbnc' ? '   (* wired NC: TRUE when not pressed *)' : ''));
    });
    lines.push('END_VAR');
    return lines.join('\n');
  };

  // light syntax highlighting (returns HTML)
  LL.highlightST = function (src) {
    const esc = (s) => s.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    return src.split(/(\(\*[\s\S]*?\*\)|\/\/[^\n]*|%[IQM][XBWD]?\d+(?:\.\d+)?|T#[\w.]+|\b[A-Za-z_]\w*\b|\b\d+(?:\.\d+)?\b)/g).map((p, i) => {
      if (i % 2 === 0) return esc(p);
      if (/^\(\*|^\/\//.test(p)) return '<span class="c">' + esc(p) + '</span>';
      if (/^%|^T#/i.test(p)) return '<span class="a">' + esc(p) + '</span>';
      if (/^\d/.test(p)) return '<span class="n">' + p + '</span>';
      const u = p.toUpperCase();
      if (KW.has(u)) return '<span class="k">' + p + '</span>';
      if (BASIC[u] || FBS[u]) return '<span class="t">' + p + '</span>';
      return esc(p);
    }).join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
