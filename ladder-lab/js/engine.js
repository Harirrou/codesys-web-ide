/* Ladder Lab — PLC ladder engine
 * Parses a compact text format, runs scans like a real PLC (read inputs →
 * solve rungs top-to-bottom → write outputs), records power flow for the
 * view, lints common mistakes and translates rungs to Structured Text.
 * Works in the browser (window.LL) and in Node (globalThis.LL) for tests.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  // ───────────────────────── element catalogue ─────────────────────────
  const LOGIC = ['WIRE', 'NO', 'NC', 'P', 'N', 'NOT', 'CMP'];
  const OUTPUT = ['COIL', 'NCOIL', 'SET', 'RST', 'TON', 'TOF', 'TP', 'RTO', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'SHL', 'SHR', 'SHRB', 'CALL', 'PID'];
  const TIMERS = ['TON', 'TOF', 'TP', 'RTO'];
  const COUNTERS = ['CTU', 'CTD'];
  const MATH = ['ADD', 'SUB', 'MUL', 'DIV', 'SHL', 'SHR'];
  const isOutput = (t) => OUTPUT.includes(t);
  const isLogic = (t) => LOGIC.includes(t);

  // ───────────────────────── addressing ─────────────────────────
  const RE = {
    bit: /^([IQM])(\d{1,2})\.([0-7])$/,
    sm: /^SM0\.[015]$/,
    tBit: /^T(\d{1,2})(?:\.(Q|DN|TT|EN))?$/,
    cBit: /^C(\d{1,2})(?:\.(Q|DN))?$/,
    tWord: /^T(\d{1,2})\.(ET|PT)$/,
    cWord: /^C(\d{1,2})\.(CV|PV)$/,
    mw: /^MW(\d{1,3})$/,
    aiw: /^AIW(\d{1,2})$/,
    aqw: /^AQW(\d{1,2})$/,
    int: /^-?\d+$/,
    loc: /^#[A-Za-z_]\w*(?:\.(Q|DN|TT|EN|ET|PT|CV|PV))?$/,
    locBase: /^#[A-Za-z_]\w*$/,
  };
  const norm = (s) => { const t = String(s == null ? '' : s).trim().replace(/\s+/g, ''); if (t[0] === '#') { const i = t.indexOf('.'); return i < 0 ? t : t.slice(0, i) + t.slice(i).toUpperCase(); } return t.toUpperCase(); };
  const isBitAddr = (a) => RE.bit.test(a) || RE.sm.test(a) || RE.tBit.test(a) || RE.cBit.test(a) || RE.loc.test(a);
  const isWordAddr = (a) => RE.tWord.test(a) || RE.cWord.test(a) || RE.mw.test(a) || RE.aiw.test(a) || RE.aqw.test(a) || RE.int.test(a) || RE.loc.test(a);
  const isWritableWord = (a) => RE.mw.test(a) || RE.aqw.test(a) || RE.locBase.test(a);
  const isWritableBit = (a) => /^[QM]\d{1,2}\.[0-7]$/.test(a) || RE.locBase.test(a);
  const timerNo = (a) => { const m = /^T(\d{1,2})/.exec(a); return m ? +m[1] : -1; };
  const counterNo = (a) => { const m = /^C(\d{1,2})/.exec(a); return m ? +m[1] : -1; };

  // Duration text → ms. "3s", "1.5s", "500ms", "2000" (ms)
  function parseDuration(s) {
    s = String(s).trim().toLowerCase();
    let m;
    if ((m = /^([\d.]+)\s*ms$/.exec(s))) return Math.round(+m[1]);
    if ((m = /^([\d.]+)\s*s$/.exec(s))) return Math.round(+m[1] * 1000);
    if ((m = /^([\d.]+)\s*min$/.exec(s))) return Math.round(+m[1] * 60000);
    if (/^[\d.]+$/.test(s)) return Math.round(+s);
    return NaN;
  }
  function fmtDuration(ms) {
    if (ms >= 1000 && ms % 100 === 0) return (ms / 1000) + 's';
    return ms + 'ms';
  }

  // ───────────────────────── cells ─────────────────────────
  let UID = 1;
  function mkCell(type, p) {
    const c = Object.assign({ type, id: UID++ }, p || {});
    if (TIMERS.includes(type)) { c.addr = c.addr || 'T0'; c.pt = c.pt == null ? 1000 : c.pt; }
    if (COUNTERS.includes(type)) { c.addr = c.addr || 'C0'; c.pv = c.pv == null ? 5 : c.pv; }
    if (type === 'CMP') { c.a = c.a || 'MW0'; c.op = c.op || '=='; c.b = c.b == null ? '0' : c.b; }
    if (type === 'MOV') { c.src = c.src == null ? '0' : c.src; c.dst = c.dst || 'MW0'; }
    if (MATH.includes(type)) { c.a = c.a || 'MW0'; c.b = c.b == null ? '1' : c.b; c.dst = c.dst || 'MW0'; }
    if (type === 'CALL') { c.block = c.block || ''; c.inst = c.inst || 'Inst1'; c.args = c.args || {}; }
    if (type === 'PID') { c.a = c.a || 'MW10'; c.b = c.b || 'MW20'; c.dst = c.dst || 'AQW0'; c.kp = c.kp == null ? 1 : c.kp; c.ti = c.ti == null ? 10 : c.ti; c.td = c.td == null ? 0 : c.td; }
    if (type === 'SHRB') { c.src = c.src || 'I0.0'; c.addr = c.addr || 'M10.0'; c.n = c.n == null ? 8 : c.n; }
    return c;
  }
  function cloneCell(c) { const n = Object.assign({}, c); n.id = UID++; return n; }

  const CMP_OPS = ['==', '<>', '>', '>=', '<', '<='];
  function parseCmp(s) {
    const m = /^(.+?)(==|=|<>|!=|>=|<=|>|<)(.+)$/.exec(String(s).trim().replace(/\s+/g, ''));
    if (!m) return null;
    let op = m[2];
    if (op === '=') op = '==';
    if (op === '!=') op = '<>';
    return { a: norm(m[1]), op, b: norm(m[3]) };
  }

  // Token → cell (or special markers)
  /* Bits of a shift register: start M10.0, length 10 → M10.0 … M10.7, M11.0, M11.1 */
  function shiftBits(start, len) {
    const m = /^([QM])(\d{1,2})\.([0-7])$/.exec(start);
    if (!m || !(len >= 1 && len <= 64)) return null;
    const out = [];
    let by = +m[2], bi = +m[3];
    for (let k = 0; k < len; k++) { if (by > 99) return null; out.push(m[1] + by + '.' + bi); if (++bi > 7) { bi = 0; by++; } }
    return out;
  }

  function parseToken(tok) {
    if (tok === '-') return mkCell('WIRE');
    if (tok === '.') return null;
    const m = /^([A-Za-z]+)(?:\((.*)\))?$/.exec(tok);
    if (!m) throw new Error('Cannot read "' + tok + '"');
    const t = m[1].toUpperCase();
    const args = m[2] == null ? [] : m[2].split(',').map((x) => x.trim());
    switch (t) {
      case 'NO': case 'NC': case 'P': case 'N':
      case 'COIL': case 'NCOIL': case 'SET': case 'RST':
        return mkCell(t, { addr: norm(args[0]) });
      case 'NOT': return mkCell('NOT');
      case 'CMP': {
        const c = parseCmp(args.join(','));
        if (!c) throw new Error('Bad compare "' + tok + '"');
        return mkCell('CMP', c);
      }
      case 'TON': case 'TOF': case 'TP': case 'RTO':
        return mkCell(t, { addr: norm(args[0]), pt: parseDuration(args[1] || '1s') });
      case 'CTU': case 'CTD':
        return mkCell(t, { addr: norm(args[0]), pv: parseInt(args[1] || '5', 10) });
      case 'MOV': return mkCell('MOV', { src: norm(args[0]), dst: norm(args[1]) });
      case 'CALL': {
        const raw = m[2] == null ? [] : m[2].split(',').map((x) => x.trim());
        const argsObj = {};
        raw.slice(2).forEach((kv) => { const i = kv.indexOf('='); if (i > 0) argsObj[kv.slice(0, i).trim()] = norm(kv.slice(i + 1)); });
        return mkCell('CALL', { block: raw[0] || '', inst: raw[1] || '', args: argsObj });
      }
      case 'PID': return mkCell('PID', { a: norm(args[0]), b: norm(args[1]), dst: norm(args[2]), kp: parseFloat(args[3] || '1'), ti: parseFloat(args[4] || '0'), td: parseFloat(args[5] || '0') });
      case 'SHRB': return mkCell('SHRB', { src: norm(args[0]), addr: norm(args[1]), n: parseInt(args[2] || '8', 10) });
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'SHL': case 'SHR':
        return mkCell(t, { a: norm(args[0]), b: norm(args[1]), dst: norm(args[2]) });
      default: throw new Error('Unknown element "' + t + '"');
    }
  }

  function cellToken(c) {
    if (!c) return '.';
    switch (c.type) {
      case 'WIRE': return '-';
      case 'NOT': return 'NOT';
      case 'CMP': return 'CMP(' + c.a + c.op + c.b + ')';
      case 'TON': case 'TOF': case 'TP': case 'RTO': return c.type + '(' + c.addr + ',' + fmtDuration(c.pt) + ')';
      case 'CTU': case 'CTD': return c.type + '(' + c.addr + ',' + c.pv + ')';
      case 'MOV': return 'MOV(' + c.src + ',' + c.dst + ')';
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'SHL': case 'SHR': return c.type + '(' + c.a + ',' + c.b + ',' + c.dst + ')';
      case 'SHRB': return 'SHRB(' + c.src + ',' + c.addr + ',' + c.n + ')';
      case 'CALL': return 'CALL(' + [c.block, c.inst].concat(Object.keys(c.args || {}).map((k) => k + '=' + c.args[k])).join(',') + ')';
      case 'PID': return 'PID(' + [c.a, c.b, c.dst, +c.kp, +c.ti, +c.td].join(',') + ')';
      default: return c.type + '(' + (c.addr || '') + ')';
    }
  }

  // ───────────────────────── rungs & programs ─────────────────────────
  function emptyRung(cols, rows) {
    rows = rows || 1;
    const r = { comment: '', rows, cols, cells: [], links: [] };
    for (let i = 0; i < rows; i++) { r.cells.push(new Array(cols).fill(null)); r.links.push(new Array(cols + 1).fill(false)); }
    return r;
  }

  /* Row grammar (whitespace separated):
   *   -        wire            .   empty cell
   *   ~        wires up to the output column
   *   |        vertical link to the row below, at the boundary after the last cell
   *   NO(I0.0) NC(..) P(..) N(..) NOT CMP(MW0>=3)
   *   COIL(Q0.0) NCOIL SET RST TON(T0,3s) TOF TP RTO CTU(C0,5) CTD MOV(5,MW0) ADD(MW0,1,MW0) …
   * An output always lands in the right-most column; if the row already has
   * logic before it, the gap is filled with wire. */
  function parseRung(lines, cols, comment) {
    const rung = emptyRung(cols, lines.length);
    rung.comment = comment || '';
    lines.forEach((line, r) => {
      const toks = line.trim().split(/\s+/).filter(Boolean);
      let c = 0;
      for (const tok of toks) {
        if (tok === '|') { rung.links[r][c] = true; continue; }
        if (tok === '~') { while (c < cols - 1) rung.cells[r][c++] = mkCell('WIRE'); continue; }
        const cell = parseToken(tok);
        if (cell && isOutput(cell.type)) {
          if (c > 0 && rung.cells[r].slice(0, c).some(Boolean)) while (c < cols - 1) rung.cells[r][c++] = mkCell('WIRE');
          rung.cells[r][cols - 1] = cell;
          c = cols;
          continue;
        }
        if (c >= cols - 1) throw new Error('Rung row too long: "' + line.trim() + '"');
        rung.cells[r][c++] = cell;
      }
    });
    return rung;
  }

  function rungToLines(rung) {
    const out = [];
    for (let r = 0; r < rung.rows; r++) {
      const toks = [];
      for (let c = 0; c < rung.cols - 1; c++) {
        toks.push(cellToken(rung.cells[r][c]));
        if (rung.links[r][c + 1]) toks.push('|');
      }
      const o = rung.cells[r][rung.cols - 1];
      if (o) toks.push(cellToken(o));
      else while (toks.length && toks[toks.length - 1] === '.') toks.pop();
      // Compact a pure output-branch row
      if (o && toks.slice(0, -1).every((t) => t === '.')) out.push(cellToken(o));
      else out.push(toks.join(' '));
    }
    return out;
  }

  /* Program text:
   *   NAME Motor start/stop
   *   COLS 7
   *   TAG I0.0 Start
   *   RUNG optional comment
   *   NO(I0.0) | NO(I0.1) COIL(Q0.0)
   *   NO(Q0.0)
   */
  function parseProgram(text, opts) {
    opts = opts || {};
    const prog = { name: 'Untitled', cols: opts.cols || 7, tags: {}, rungs: [], blocks: [] };
    let cur = null, blk = null;
    const flush = () => { if (cur) { (blk ? blk.rungs : prog.rungs).push(parseRung(cur.lines.length ? cur.lines : [''], prog.cols, cur.comment)); cur = null; } };
    const lines = String(text).replace(/\r/g, '').split('\n');
    for (let raw of lines) {
      const line = raw.replace(/\s+;.*$/, '').trim();
      if (!line || line.startsWith('#')) continue;
      let m;
      if ((m = /^NAME\s+(.*)$/i.exec(line))) { prog.name = m[1].trim(); continue; }
      if ((m = /^COLS\s+(\d+)$/i.exec(line))) { prog.cols = Math.max(4, Math.min(12, +m[1])); continue; }
      if ((m = /^TAG\s+(\S+)\s+(.+)$/i.exec(line))) { prog.tags[norm(m[1])] = m[2].trim(); continue; }
      if ((m = /^BLOCK\s+([A-Za-z_]\w*)\s*(.*)$/i.exec(line))) { flush(); blk = { name: m[1], comment: m[2].trim(), params: [], rungs: [] }; prog.blocks.push(blk); continue; }
      if (blk && !cur && (m = /^PARAM\s+(IN|OUT|INOUT)\s+([A-Za-z_]\w*)\s*(BOOL|INT)?\s*(.*)$/i.exec(line))) { blk.params.push({ dir: m[1].toUpperCase(), name: m[2], type: (m[3] || 'BOOL').toUpperCase(), comment: m[4].trim() }); continue; }
      if ((m = /^RUNG\b\s*(.*)$/i.exec(line))) { flush(); cur = { comment: m[1].trim(), lines: [] }; continue; }
      if (!cur) cur = { comment: '', lines: [] };
      cur.lines.push(line);
    }
    flush();
    return prog;
  }

  function programToText(prog) {
    const out = ['NAME ' + prog.name, 'COLS ' + prog.cols];
    Object.keys(prog.tags || {}).forEach((a) => out.push('TAG ' + a + ' ' + prog.tags[a]));
    prog.rungs.forEach((r) => {
      out.push('RUNG' + (r.comment ? ' ' + r.comment : ''));
      rungToLines(r).forEach((l) => out.push(l));
    });
    (prog.blocks || []).forEach((b) => {
      out.push('BLOCK ' + b.name + (b.comment ? ' ' + b.comment : ''));
      b.params.forEach((pp) => out.push('PARAM ' + pp.dir + ' ' + pp.name + ' ' + pp.type + (pp.comment ? ' ' + pp.comment : '')));
      b.rungs.forEach((r) => { out.push('RUNG' + (r.comment ? ' ' + r.comment : '')); rungToLines(r).forEach((l) => out.push(l)); });
    });
    return out.join('\n');
  }

  function cloneProgram(p) { return parseProgram(programToText(p)); }

  function mkTrace(r) {
    return { pin: r.cells.map((row) => row.map(() => 0)), pout: r.cells.map((row) => row.map(() => 0)), node: r.cells.map(() => new Array(r.cols + 1).fill(0)) };
  }

  // ───────────────────────── the machine ─────────────────────────
  class Machine {
    constructor(prog) { this.load(prog); this.reset(); }

    load(prog) {
      this.prog = prog;
      // Counter modes: a counter that has any CTU counts up (done at CV ≥ PV),
      // a counter that only has CTD starts at PV and is done at CV ≤ 0.
      this.cMode = {};
      prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => {
        if (!c) return;
        if (c.type === 'CTU') this.cMode[counterNo(c.addr)] = 'up';
        if (c.type === 'CTD' && this.cMode[counterNo(c.addr)] !== 'up') this.cMode[counterNo(c.addr)] = 'down';
      })));
      this.trace = prog.rungs.map(mkTrace);
      this.blocks = {};
      (prog.blocks || []).forEach((b) => (this.blocks[b.name] = b));
      this.itrace = {};
      // drop timers/counters whose mode changed? keep values: online edit.
      for (const k in this.counters || {}) if (!this.cMode[k]) delete this.counters[k];
      this.phase = 0;
    }

    reset() {
      this.bits = {};
      this.words = {};
      this.timers = {};
      this.counters = {};
      this.edges = {};
      this.inputs = {};
      this.pidState = {};
      this.instances = {};
      this.ctx = null;
      this.scanCount = 0;
      this.time = 0;
      this.phase = 0;
      this.load(this.prog);
    }

    setInputs(obj) { for (const k in obj) this.inputs[k] = RE.aiw.test(k) ? Math.round(+obj[k] || 0) : obj[k] ? 1 : 0; }

    // block context: #Name → mapped actual address, or instance memory "@Inst:Name"
    res(a) { return a && a[0] === '#' && this.ctx ? this.ctx.res(a) : a; }
    tkey(a) { a = this.res(a); return a && a[0] === '@' ? a.split('.')[0] : timerNo(a); }
    ckey(a) { a = this.res(a); return a && a[0] === '@' ? a.split('.')[0] : counterNo(a); }
    ek(id) { return this.ctx ? this.ctx.inst + '/' + id : id; }
    timerFor(a) { return this.timers[this.tkey(a)]; }
    withCtx(ctx, fn) { const old = this.ctx; this.ctx = ctx; try { return fn(); } finally { this.ctx = old; } }
    monitor(inst) {
      const I = this.instances[inst];
      if (!I) return null;
      const m = this, w = (fn) => (...a) => m.withCtx(I.ctx, () => fn.apply(m, a));
      return { trace: this.itrace[inst], bit: w(this.bit), word: w(this.word), compare: w(this.compare), timerFor: w(this.timerFor), timers: this.timers, counters: this.counters };
    }
    callBlock(cell, dt) {
      const b = this.blocks[cell.block];
      if (!b) { this.error = 'CALL: block "' + cell.block + '" does not exist.'; return; }
      if ((this.depth || 0) > 6) { this.error = 'Blocks call each other too deeply (recursion?).'; return; }
      const inst = (this.ctx ? this.ctx.inst + '.' : '') + cell.inst;
      const map = {};
      b.params.forEach((pp) => { const v = cell.args && cell.args[pp.name]; if (v != null && v !== '') map[pp.name] = this.res(v); });
      const ctx = { inst, map, res: (a) => { const mm = /^#(\w+)(?:\.(\w+))?$/.exec(a); if (!mm) return a; const base = map[mm[1]] != null ? map[mm[1]] : '@' + inst + ':' + mm[1]; return mm[2] ? base + '.' + mm[2] : base; } };
      this.instances[inst] = { block: b.name, ctx };
      const tr = this.itrace[inst] || (this.itrace[inst] = b.rungs.map(mkTrace));
      if (tr.length !== b.rungs.length) this.itrace[inst] = b.rungs.map(mkTrace);
      const old = this.ctx; this.ctx = ctx; this.depth = (this.depth || 0) + 1;
      try { b.rungs.forEach((r, i) => this.evalRungOf(r, this.itrace[inst][i], dt)); }
      finally { this.ctx = old; this.depth--; }
    }

    counter(n, hint) {
      let c = this.counters[n];
      if (!c) {
        const mode = this.cMode[n] || (hint === 'CTD' ? 'down' : 'up');
        c = this.counters[n] = { cv: 0, pv: 0, mode, init: false };
      }
      return c;
    }
    timer(n) { return this.timers[n] || (this.timers[n] = { type: '', pt: 0, et: 0, q: 0, tt: 0, en: 0, prevIn: 0 }); }

    bit(a) {
      if (!a) return 0;
      a = this.res(a);
      if (a === 'TRUE' || a === '1') return 1;
      if (a[0] === '@') {
        const [base, f] = a.split('.');
        const t = this.timers[base]; if (t) return f === 'TT' ? t.tt : f === 'EN' ? t.en : t.q;
        const c = this.counters[base]; if (c) return c.mode === 'down' ? (c.cv <= 0 ? 1 : 0) : (c.pv > 0 && c.cv >= c.pv ? 1 : 0);
        return this.bits[a] ? 1 : 0;
      }
      let m;
      if (RE.bit.test(a) || RE.sm.test(a)) return this.bits[a] ? 1 : 0;
      if ((m = RE.tBit.exec(a))) {
        const t = this.timers[+m[1]];
        if (!t) return 0;
        const f = m[2] || 'Q';
        return f === 'TT' ? t.tt : f === 'EN' ? t.en : t.q;
      }
      if ((m = RE.cBit.exec(a))) {
        const c = this.counters[+m[1]];
        if (!c) return 0;
        return c.mode === 'down' ? (c.cv <= 0 ? 1 : 0) : (c.pv > 0 && c.cv >= c.pv ? 1 : 0);
      }
      return 0;
    }
    word(a) {
      let m;
      if (a == null) return 0;
      a = this.res(a);
      if (RE.int.test(a)) return parseInt(a, 10);
      if (a[0] === '@') {
        const [base, f] = a.split('.');
        if (f === 'ET' || f === 'PT') { const t = this.timers[base]; return t ? (f === 'ET' ? t.et : t.pt) : 0; }
        if (f === 'CV' || f === 'PV') { const c = this.counters[base]; return c ? (f === 'CV' ? c.cv : c.pv) : 0; }
        return this.words[a] | 0;
      }
      if (RE.mw.test(a) || RE.aiw.test(a) || RE.aqw.test(a)) return this.words[a] | 0;
      if ((m = RE.tWord.exec(a))) { const t = this.timers[+m[1]]; return t ? (m[2] === 'ET' ? t.et : t.pt) : 0; }
      if ((m = RE.cWord.exec(a))) { const c = this.counters[+m[1]]; return c ? (m[2] === 'CV' ? c.cv : c.pv) : 0; }
      return 0;
    }
    setBit(a, v) { a = this.res(a); if (a && a[0] === '@') this.bits[a] = v ? 1 : 0; else if (isWritableBit(a)) this.bits[a] = v ? 1 : 0; }
    setWord(a, v) {
      a = this.res(a);
      if (!(a && a[0] === '@') && !isWritableWord(a)) return;
      v = Math.trunc(v);
      if (v > 32767) v = 32767; if (v < -32768) v = -32768;
      this.words[a] = v;
    }

    compare(a, op, b) {
      const x = this.word(a), y = this.word(b);
      switch (op) {
        case '==': return x === y;
        case '<>': return x !== y;
        case '>': return x > y;
        case '>=': return x >= y;
        case '<': return x < y;
        case '<=': return x <= y;
      }
      return false;
    }

    evalLogic(cell, p) {
      switch (cell.type) {
        case 'WIRE': return p;
        case 'NO': return p && this.bit(cell.addr) ? 1 : 0;
        case 'NC': return p && !this.bit(cell.addr) ? 1 : 0;
        case 'P': {
          const v = this.bit(cell.addr), k = this.ek(cell.id), prev = this.edges[k] || 0;
          this.edges[k] = v;
          return p && v && !prev ? 1 : 0;
        }
        case 'N': {
          const v = this.bit(cell.addr), k = this.ek(cell.id), prev = this.edges[k] || 0;
          this.edges[k] = v;
          return p && !v && prev ? 1 : 0;
        }
        case 'NOT': return p ? 0 : 1;
        case 'CMP': return p && this.compare(cell.a, cell.op, cell.b) ? 1 : 0;
      }
      return 0;
    }

    resetAddr(a) {
      a = this.res(a);
      if (a && a[0] === '@') {
        const base = a.split('.')[0], t = this.timers[base], c = this.counters[base];
        if (t) { t.et = 0; t.q = 0; t.tt = 0; } else if (c) c.cv = c.mode === 'down' ? c.pv : 0;
        else { this.bits[a] = 0; if (a in this.words) this.words[a] = 0; }
        return;
      }
      if (RE.tBit.test(a) || RE.tWord.test(a)) {
        const t = this.timers[timerNo(a)];
        if (t) { t.et = 0; t.q = 0; t.tt = 0; }
      } else if (RE.cBit.test(a) || RE.cWord.test(a)) {
        const c = this.counter(counterNo(a));
        c.cv = c.mode === 'down' ? c.pv : 0;
      } else if (isWritableWord(a)) this.setWord(a, 0);
      else this.setBit(a, 0);
    }

    execOutput(cell, p, dt) {
      switch (cell.type) {
        case 'COIL': this.setBit(cell.addr, p); break;
        case 'NCOIL': this.setBit(cell.addr, !p); break;
        case 'SET': if (p) this.setBit(cell.addr, 1); break;
        case 'RST': if (p) this.resetAddr(cell.addr); break;
        case 'TON': case 'TOF': case 'TP': case 'RTO': {
          const t = this.timer(this.tkey(cell.addr));
          t.type = cell.type; t.pt = cell.pt;
          if (cell.type === 'TON') {
            t.en = p;
            if (p) { t.et = Math.min(t.et + dt, t.pt); t.q = t.et >= t.pt ? 1 : 0; }
            else { t.et = 0; t.q = 0; }
            t.tt = p && !t.q ? 1 : 0;
          } else if (cell.type === 'TOF') {
            t.en = p;
            if (p) { t.q = 1; t.et = 0; }
            else if (t.q) { t.et = Math.min(t.et + dt, t.pt); if (t.et >= t.pt) t.q = 0; }
            t.tt = !p && t.q ? 1 : 0;
          } else if (cell.type === 'TP') {
            t.en = p;
            if (p && !t.prevIn && !t.q) { t.q = 1; t.et = 0; }
            if (t.q) { t.et = Math.min(t.et + dt, t.pt); if (t.et >= t.pt) t.q = 0; }
            else if (!p) t.et = 0;
            t.tt = t.q;
          } else { // RTO / TONR: retentive
            t.en = p;
            if (p && t.et < t.pt) t.et = Math.min(t.et + dt, t.pt);
            t.q = t.et >= t.pt ? 1 : 0;
            t.tt = p && !t.q ? 1 : 0;
          }
          t.prevIn = p;
          break;
        }
        case 'CTU': case 'CTD': {
          const c = this.counter(this.ckey(cell.addr), cell.type);
          c.pv = cell.pv;
          if (!c.init) { c.init = true; if (c.mode === 'down') c.cv = c.pv; }
          const ek = this.ek(cell.id), prev = this.edges[ek] || 0;
          this.edges[ek] = p;
          if (p && !prev) {
            if (cell.type === 'CTU') c.cv = Math.min(32767, c.cv + 1);
            else c.cv = Math.max(-32768, c.cv - 1);
          }
          break;
        }
        case 'MOV': if (p) this.setWord(cell.dst, this.word(cell.src)); break;
        case 'ADD': if (p) this.setWord(cell.dst, this.word(cell.a) + this.word(cell.b)); break;
        case 'SUB': if (p) this.setWord(cell.dst, this.word(cell.a) - this.word(cell.b)); break;
        case 'MUL': if (p) this.setWord(cell.dst, this.word(cell.a) * this.word(cell.b)); break;
        case 'DIV': if (p) { const d = this.word(cell.b); this.setWord(cell.dst, d === 0 ? 0 : this.word(cell.a) / d); } break;
        case 'SHL': case 'SHR': if (p) { const n = Math.max(0, Math.min(16, this.word(cell.b))); const x = this.word(cell.a) & 0xffff; let v = (cell.type === 'SHL' ? x << n : x >>> n) & 0xffff; if (v > 32767) v -= 65536; this.setWord(cell.dst, v); } break;
        case 'SHRB': if (p) {
          const bits = shiftBits(this.res(cell.addr), Math.abs(cell.n)), d = this.bit(cell.src);
          if (!bits) break;
          if (cell.n > 0) { for (let k = bits.length - 1; k > 0; k--) this.bits[bits[k]] = this.bits[bits[k - 1]] ? 1 : 0; this.bits[bits[0]] = d; }
          else { for (let k = 0; k < bits.length - 1; k++) this.bits[bits[k]] = this.bits[bits[k + 1]] ? 1 : 0; this.bits[bits[bits.length - 1]] = d; }
        } break;
        case 'CALL': if (p) this.callBlock(cell, dt); break;
        case 'PID': {
          const k = this.ek(cell.id), st = this.pidState[k] || (this.pidState[k] = { i: 0, pe: null, out: 0 });
          if (!p) { st.i = 0; st.pe = null; st.out = 0; this.setWord(cell.dst, 0); break; }
          const e = this.word(cell.b) - this.word(cell.a), s = dt / 1000, kp = +cell.kp || 0;
          const P = kp * e, D = cell.td > 0 && st.pe != null ? kp * cell.td * (e - st.pe) / s : 0;
          if (cell.ti > 0) { const ni = st.i + kp * e * s / cell.ti, o2 = P + ni + D; if (!((o2 > 100 && e > 0) || (o2 < 0 && e < 0))) st.i = ni; }
          st.out = Math.max(0, Math.min(100, P + st.i + D)); st.pe = e;
          this.setWord(cell.dst, Math.round(st.out * 276.48));
          break;
        }
      }
    }

    evalRung(i, dt) { return this.evalRungOf(this.prog.rungs[i], this.trace[i], dt); }
    evalRungOf(rung, tr, dt) {
      const R = rung.rows, C = rung.cols;
      let cur = new Array(R).fill(1);
      for (let r = 0; r < R; r++) tr.node[r][0] = 1;
      for (let c = 0; c < C - 1; c++) {
        const next = new Array(R);
        for (let r = 0; r < R; r++) {
          const cell = rung.cells[r][c];
          tr.pin[r][c] = cell ? cur[r] : 0;
          const o = cell ? this.evalLogic(cell, cur[r]) : 0;
          tr.pout[r][c] = o;
          next[r] = o;
        }
        // vertical links at boundary c+1 merge rows into one electrical node
        let r = 0;
        while (r < R) {
          let s = r;
          while (r < R - 1 && rung.links[r][c + 1]) r++;
          let any = 0;
          for (let k = s; k <= r; k++) any = any || next[k];
          for (let k = s; k <= r; k++) next[k] = any;
          r++;
        }
        for (let k = 0; k < R; k++) tr.node[k][c + 1] = next[k];
        cur = next;
      }
      for (let r = 0; r < R; r++) {
        const cell = rung.cells[r][C - 1];
        tr.pin[r][C - 1] = cell ? cur[r] : 0;
        if (cell) this.execOutput(cell, cur[r], dt);
        tr.pout[r][C - 1] = cell ? cur[r] : 0;
      }
    }

    beginScan() {
      for (const k in this.inputs) { if (/^I/.test(k)) this.bits[k] = this.inputs[k]; else if (RE.aiw.test(k)) this.words[k] = Math.max(-32768, Math.min(32767, this.inputs[k])); }
      this.bits['SM0.0'] = 1;
      this.bits['SM0.1'] = this.scanCount === 0 ? 1 : 0;
      this.bits['SM0.5'] = (this.time % 1000) < 500 ? 1 : 0;
    }
    endScan(dt) { this.scanCount++; this.time += dt; }

    scan(dt) {
      dt = dt || 10;
      this.beginScan();
      for (let i = 0; i < this.prog.rungs.length; i++) this.evalRung(i, dt);
      this.endScan(dt);
      this.phase = 0;
    }

    /* Single-step through a scan for teaching: phase 0 = read inputs,
     * 1..n = solve rung n, n+1 = write outputs. Returns the phase executed. */
    stepPhase(dt) {
      dt = dt || 10;
      const n = this.prog.rungs.length;
      const ph = this.phase;
      if (ph === 0) this.beginScan();
      else if (ph <= n) this.evalRung(ph - 1, dt);
      else this.endScan(dt);
      this.phase = ph >= n + 1 ? 0 : ph + 1;
      return ph;
    }

    outputs() {
      const o = {};
      for (const k in this.bits) if (k[0] === 'Q') o[k] = this.bits[k];
      for (const k in this.words) if (RE.aqw.test(k)) o[k] = this.words[k];
      return o;
    }
    read(a) { return isWordAddr(a) ? this.word(a) : this.bit(a); }
  }

  // ───────────────────────── lint ─────────────────────────
  function lint(prog) {
    const all = [];
    const blocks = {};
    (prog.blocks || []).forEach((b) => (blocks[b.name] = b));
    all.push(...lintRungs(prog, prog.rungs, null, blocks));
    (prog.blocks || []).forEach((b) => lintRungs(prog, b.rungs, b, blocks).forEach((x) => all.push(Object.assign(x, { block: b.name }))));
    // instance names: one CALL per instance
    const seen = {};
    const visit = (rungs, where) => rungs.forEach((r, i) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'CALL') { const k = (where ? where + '.' : '') + c.inst; if (seen[k]) all.push({ level: 'error', rung: i + 1, block: where || undefined, msg: 'Instance "' + c.inst + '" is called twice. Every call needs its own instance (its own memory), e.g. ' + c.inst + 'b.' }); seen[k] = 1; } })));
    visit(prog.rungs, '');
    (prog.blocks || []).forEach((b) => visit(b.rungs, b.name));
    return all;
  }
  function lintRungs(prog, rungs, blk, blocks) {
    const issues = [];
    const coils = {}, timers = {}, ctr = {};
    rungs.forEach((rung, i) => {
      const n = i + 1;
      let hasOut = false, hasAny = false;
      rung.cells.forEach((row, r) => row.forEach((c, col) => {
        if (!c) return;
        hasAny = true;
        if (isOutput(c.type)) hasOut = true;
        const need = ['NO', 'NC', 'P', 'N', 'COIL', 'NCOIL', 'SET', 'RST'];
        if (need.includes(c.type)) {
          if (!c.addr) issues.push({ level: 'error', rung: n, msg: c.type + ' has no address.' });
          else if (c.addr[0] === '#' && blk && !RE.loc.test(c.addr)) issues.push({ level: 'error', rung: n, msg: '"' + c.addr + '" is not a valid block variable name.' });
          else if (!isBitAddr(c.addr) && !(c.type === 'RST' && isWritableWord(c.addr)))
            issues.push({ level: 'error', rung: n, msg: '"' + c.addr + '" is not a valid bit address.' });
        }
        if (['COIL', 'NCOIL', 'SET'].includes(c.type) && c.addr && !isWritableBit(c.addr))
          issues.push({ level: 'error', rung: n, msg: 'Cannot write to ' + c.addr + '. Coils drive outputs (Q) or memory bits (M) only.' });
        if (['COIL', 'NCOIL'].includes(c.type) && c.addr) (coils[c.addr] = coils[c.addr] || []).push(n);
        if (TIMERS.includes(c.type)) {
          if (!(RE.tBit.test(c.addr) || (blk && RE.locBase.test(c.addr))) || /\./.test(c.addr)) issues.push({ level: 'error', rung: n, msg: c.type + ' needs a timer name like T0' + (blk ? ' or #Delay' : '') + '.' });
          (timers[c.addr] = timers[c.addr] || []).push(n);
          if (!(c.pt > 0)) issues.push({ level: 'error', rung: n, msg: c.addr + ' needs a preset time above zero.' });
        }
        if (COUNTERS.includes(c.type)) {
          if (!(RE.cBit.test(c.addr) || (blk && RE.locBase.test(c.addr))) || /\./.test(c.addr)) issues.push({ level: 'error', rung: n, msg: c.type + ' needs a counter name like C0' + (blk ? ' or #Count' : '') + '.' });
          (ctr[c.addr + c.type] = ctr[c.addr + c.type] || []).push(n);
        }
        if (c.type === 'CMP') {
          if (!isWordAddr(c.a) || !isWordAddr(c.b)) issues.push({ level: 'error', rung: n, msg: 'Compare needs numbers or words (MW0, T0.ET, C0.CV).' });
        }
        if (c.type === 'MOV' && (!isWordAddr(c.src) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: 'MOV copies a number or word into an MW or AQW word.' });
        if (MATH.includes(c.type) && (!isWordAddr(c.a) || !isWordAddr(c.b) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: c.type + ' needs two operands and an MW or AQW destination.' });
        ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { if (!blk && typeof c[k] === 'string' && c[k][0] === '#') issues.push({ level: 'error', rung: n, msg: c[k] + ' is a block variable: names with # only work inside a block.' }); });
        if (c.type === 'CALL') {
          const b = blocks[c.block];
          if (!b) issues.push({ level: 'error', rung: n, msg: 'CALL: there is no block called "' + c.block + '".' });
          else {
            if (blk && b.name === blk.name) issues.push({ level: 'error', rung: n, msg: 'A block cannot call itself.' });
            if (!/^[A-Za-z_]\w*$/.test(c.inst || '')) issues.push({ level: 'error', rung: n, msg: 'CALL ' + b.name + ': give the instance a name (letters, digits, _), e.g. ' + b.name.replace(/^FB_?/i, '') + '1.' });
            b.params.forEach((pp) => {
              const v = c.args && c.args[pp.name];
              if (v == null || v === '') { issues.push({ level: 'error', rung: n, msg: 'CALL ' + b.name + ': parameter ' + pp.name + ' is not connected.' }); return; }
              const okType = pp.type === 'INT' ? isWordAddr(v) : isBitAddr(v) || ['0', '1', 'TRUE', 'FALSE'].includes(v);
              if (!okType) issues.push({ level: 'error', rung: n, msg: 'CALL ' + b.name + ': ' + pp.name + ' needs ' + (pp.type === 'INT' ? 'a word or number' : 'a bit address') + ', not "' + v + '".' });
              else if (pp.dir !== 'IN' && !(pp.type === 'INT' ? isWritableWord(v) : isWritableBit(v))) issues.push({ level: 'error', rung: n, msg: 'CALL ' + b.name + ': output ' + pp.name + ' must go to something writable (Q, M, MW, AQW), not "' + v + '".' });
            });
            Object.keys(c.args || {}).forEach((k) => { if (!b.params.some((pp) => pp.name === k)) issues.push({ level: 'warn', rung: n, msg: 'CALL ' + b.name + ': it has no parameter called ' + k + '.' }); });
          }
        }
        if (c.type === 'PID') {
          if (!isWordAddr(c.a) || !isWordAddr(c.b) || !isWritableWord(c.dst)) issues.push({ level: 'error', rung: n, msg: 'PID needs PV and SP as words or numbers and OUT as a writable word (MW, AQW).' });
          if (!(c.kp > 0)) issues.push({ level: 'error', rung: n, msg: 'PID: the gain Kp must be above 0.' });
        }
        if (c.type === 'SHRB') {
          if (!isBitAddr(c.src)) issues.push({ level: 'error', rung: n, msg: 'SHRB: the data input must be a bit address, e.g. I0.3.' });
          if (!/^[QM]\d{1,2}\.[0-7]$/.test(c.addr)) issues.push({ level: 'error', rung: n, msg: 'SHRB: the register must start at an M or Q bit, e.g. M10.0.' });
          else if (!shiftBits(c.addr, Math.abs(c.n))) issues.push({ level: 'error', rung: n, msg: 'SHRB: length must be 1 … 64 (negative = shift the other way).' });
          if (!rung.cells.some((rw) => rw.some((x) => x && (x.type === 'P' || x.type === 'N' || (x.type === 'NO' && /^[TC]\d/.test(x.addr || ''))))))
            issues.push({ level: 'warn', rung: n, msg: 'SHRB shifts on EVERY scan while its rung is true. Put an edge (P) or a one-scan pulse in front so it shifts once per event.' });
        }
        if (isOutput(c.type) && col !== rung.cols - 1) issues.push({ level: 'error', rung: n, msg: 'Outputs belong in the right-most column.' });
      }));
      for (let r = 0; r < rung.rows; r++) for (let col = 1; col < rung.cols; col++) {
        const c = rung.cells[r][col];
        if (!c || rung.cells[r][col - 1] || rung.links[r][col] || (r > 0 && rung.links[r - 1][col])) continue;
        issues.push({ level: 'warn', rung: n, msg: 'Row ' + (r + 1) + ': ' + (c.addr || c.type) + ' is not connected on its left side, so it never gets power. Add a vertical link (Branch tool) or a wire.' });
        break;
      }
      if (hasAny && !hasOut) issues.push({ level: 'warn', rung: n, msg: 'This rung has no output, so it does nothing.' });
    });
    for (const a in coils) if (coils[a].length > 1)
      issues.push({ level: 'warn', rung: coils[a][0], msg: 'Double coil: ' + a + ' is driven in rungs ' + coils[a].join(', ') + '. Only the last one wins each scan.' });
    for (const a in timers) if (timers[a].length > 1)
      issues.push({ level: 'warn', rung: timers[a][0], msg: 'Timer ' + a + ' is used by rungs ' + timers[a].join(', ') + '. Give each timer instruction its own number.' });
    for (const a in ctr) if (ctr[a].length > 1)
      issues.push({ level: 'warn', rung: ctr[a][0], msg: 'The same counter instruction appears in rungs ' + ctr[a].join(', ') + '.' });
    return issues;
  }

  // ───────────────────────── Structured Text translation ─────────────────────────
  function stName(a, tags) {
    if (a && a[0] === '#') return a.slice(1);
    if (a === 'SM0.0') return 'TRUE';
    if (a === 'SM0.1') return 'FirstScan';
    if (a === 'SM0.5') return 'Clock_1Hz';
    let m;
    if ((m = RE.tBit.exec(a))) return 'T' + m[1] + '.Q';
    if ((m = RE.cBit.exec(a))) return 'C' + m[1] + '.Q';
    if ((m = RE.tWord.exec(a))) return 'T' + m[1] + '.' + m[2];
    if ((m = RE.cWord.exec(a))) return 'C' + m[1] + '.' + m[2];
    if (RE.int.test(a)) return a;
    const t = tags && tags[a];
    if (!t && (m = RE.aiw.exec(a))) return '%IW' + m[1];
    if (!t && (m = RE.aqw.exec(a))) return '%QW' + m[1];
    if (t) return t.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1');
    if ((m = RE.bit.exec(a))) return '%' + m[1] + 'X' + m[2] + '.' + m[3];
    return a;
  }
  // tiny boolean AST
  const T = { t: 'true' };
  const V = (s) => ({ t: 'v', s });
  function AND(a, b) {
    if (!a || !b) return null;
    if (a.t === 'true') return b;
    if (b.t === 'true') return a;
    const items = [].concat(a.t === 'and' ? a.items : [a], b.t === 'and' ? b.items : [b]);
    return { t: 'and', items };
  }
  function OR(list) {
    const xs = [];
    list.forEach((x) => { if (!x) return; if (x.t === 'or') x.items.forEach((y) => xs.push(y)); else xs.push(x); });
    if (!xs.length) return null;
    if (xs.some((x) => x.t === 'true')) return T;
    const uniq = [], seen = new Set();
    xs.forEach((x) => { const k = pr(x); if (!seen.has(k)) { seen.add(k); uniq.push(x); } });
    if (uniq.length === 1) return uniq[0];
    // factor a common leading AND-prefix:  A·B + A·C  →  A·(B + C)
    const fs = uniq.map((x) => (x.t === 'and' ? x.items : [x]));
    let k = 0;
    while (fs.every((f) => f.length > k && pr(f[k]) === pr(fs[0][k]))) k++;
    if (k > 0) {
      const pre = fs[0].slice(0, k);
      const rests = fs.map((f) => f.slice(k));
      const preNode = pre.length === 1 ? pre[0] : { t: 'and', items: pre };
      if (rests.some((r) => !r.length)) return preNode; // absorption: A + A·B = A
      return AND(preNode, OR(rests.map((r) => (r.length === 1 ? r[0] : { t: 'and', items: r }))));
    }
    return { t: 'or', items: uniq };
  }
  function pr(x, parent) {
    if (!x) return 'FALSE';
    switch (x.t) {
      case 'true': return 'TRUE';
      case 'v': return x.s;
      case 'not': return 'NOT ' + (x.x.t === 'v' ? x.x.s : '(' + pr(x.x) + ')');
      case 'and': return x.items.map((i) => pr(i, 'and')).join(' AND ');
      case 'or': { const s = x.items.map((i) => pr(i, 'or')).join(' OR '); return parent === 'and' ? '(' + s + ')' : s; }
    }
    return '?';
  }
  function toST(prog) {
    const tags = prog.tags || {};
    const out = ['(* ' + prog.name + ' — Structured Text equivalent generated from the ladder *)'];
    const used = { timers: {}, counters: {}, edges: 0 };
    const fbT = new Set();
    prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && (TIMERS.includes(c.type) || COUNTERS.includes(c.type)) && c.addr && c.addr[0] === '#') fbT.add(c.addr); })));
    const nm = (a) => (fbT.has(a) ? a.slice(1) + '.Q' : stName(a, tags));
    prog.rungs.forEach((rung, i) => {
      const R = rung.rows, C = rung.cols;
      let cur = new Array(R).fill(T);
      for (let c = 0; c < C - 1; c++) {
        const next = [];
        for (let r = 0; r < R; r++) {
          const cell = rung.cells[r][c];
          let e = null;
          if (cell) switch (cell.type) {
            case 'WIRE': e = cur[r]; break;
            case 'NO': e = AND(cur[r], V(nm(cell.addr))); break;
            case 'NC': e = AND(cur[r], { t: 'not', x: V(nm(cell.addr)) }); break;
            case 'P': used.edges++; e = AND(cur[r], V('R_TRIG(' + nm(cell.addr) + ')')); break;
            case 'N': used.edges++; e = AND(cur[r], V('F_TRIG(' + nm(cell.addr) + ')')); break;
            case 'NOT': e = cur[r] ? { t: 'not', x: cur[r] } : T; break;
            case 'CMP': e = AND(cur[r], V('(' + stName(cell.a, tags) + ' ' + (cell.op === '==' ? '=' : cell.op) + ' ' + stName(cell.b, tags) + ')')); break;
          }
          next.push(e);
        }
        let r = 0;
        while (r < R) {
          let s = r;
          while (r < R - 1 && rung.links[r][c + 1]) r++;
          if (r > s) { const g = OR(next.slice(s, r + 1)); for (let k = s; k <= r; k++) next[k] = g; }
          r++;
        }
        cur = next;
      }
      out.push('');
      out.push('(* Rung ' + (i + 1) + (rung.comment ? ': ' + rung.comment : '') + ' *)');
      for (let r = 0; r < R; r++) {
        const cell = rung.cells[r][C - 1];
        if (!cell) continue;
        const e = pr(cur[r]);
        const n = (a) => stName(a, tags);
        switch (cell.type) {
          case 'COIL': out.push(n(cell.addr) + ' := ' + e + ';'); break;
          case 'NCOIL': out.push(n(cell.addr) + ' := NOT (' + e + ');'); break;
          case 'SET': out.push('IF ' + e + ' THEN ' + n(cell.addr) + ' := TRUE; END_IF'); break;
          case 'RST':
            if (RE.tBit.test(cell.addr)) out.push('IF ' + e + ' THEN ' + cell.addr + '(IN := FALSE); END_IF  (* reset timer *)');
            else if (RE.cBit.test(cell.addr)) out.push('IF ' + e + ' THEN ' + cell.addr + '.CV := 0; END_IF  (* reset counter *)');
            else out.push('IF ' + e + ' THEN ' + n(cell.addr) + ' := FALSE; END_IF');
            break;
          case 'TON': case 'TOF': case 'TP': case 'RTO':
            if (cell.addr[0] !== '#') used.timers[cell.addr] = cell.type === 'RTO' ? 'TONR' : cell.type;
            out.push(n(cell.addr) + '(IN := ' + e + ', PT := T#' + fmtDuration(cell.pt) + ');'); break;
          case 'CTU': if (cell.addr[0] !== '#') used.counters[cell.addr] = 'CTU'; out.push(n(cell.addr) + '(CU := ' + e + ', PV := ' + cell.pv + ');'); break;
          case 'CTD': if (cell.addr[0] !== '#') used.counters[cell.addr] = used.counters[cell.addr] || 'CTD'; out.push(n(cell.addr) + '(CD := ' + e + ', PV := ' + cell.pv + ');'); break;
          case 'MOV': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + n(cell.src) + '; END_IF'); break;
          case 'SHL': case 'SHR': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + cell.type + '(' + n(cell.a) + ', ' + n(cell.b) + '); END_IF'); break;
          case 'CALL': {
            const b = (prog.blocks || []).find((x) => x.name === cell.block);
            used.inst = used.inst || {}; used.inst[cell.inst] = cell.block;
            const ins = b ? b.params.filter((pp) => pp.dir !== 'OUT').map((pp) => pp.name + ' := ' + n(cell.args[pp.name] || '')) : [];
            out.push('IF ' + e + ' THEN');
            out.push('  ' + cell.inst + '(' + ins.join(', ') + ');');
            if (b) b.params.filter((pp) => pp.dir !== 'IN').forEach((pp) => out.push('  ' + n(cell.args[pp.name] || '') + ' := ' + cell.inst + '.' + pp.name + ';'));
            out.push('END_IF');
            break;
          }
          case 'PID': used.pid = (used.pid || 0) + 1; out.push('IF ' + e + ' THEN  (* PID: Kp ' + cell.kp + ', Ti ' + cell.ti + ' s, Td ' + cell.td + ' s *)'); out.push('  PID' + used.pid + '(PV := ' + n(cell.a) + ', SP := ' + n(cell.b) + ');'); out.push('  ' + n(cell.dst) + ' := PID' + used.pid + '.Y;'); out.push('END_IF'); break;
          case 'SHRB': {
            const bits = shiftBits(cell.addr, Math.abs(cell.n)) || [];
            const lines = [];
            if (cell.n > 0) { for (let k = bits.length - 1; k > 0; k--) lines.push('  ' + n(bits[k]) + ' := ' + n(bits[k - 1]) + ';'); lines.push('  ' + n(bits[0]) + ' := ' + n(cell.src) + ';'); }
            else { for (let k = 0; k < bits.length - 1; k++) lines.push('  ' + n(bits[k]) + ' := ' + n(bits[k + 1]) + ';'); lines.push('  ' + n(bits[bits.length - 1]) + ' := ' + n(cell.src) + ';'); }
            out.push('IF ' + e + ' THEN  (* shift register ' + cell.addr + ', ' + cell.n + ' bits *)'); lines.forEach((l) => out.push(l)); out.push('END_IF');
            break;
          }
          default: {
            const op = { ADD: '+', SUB: '-', MUL: '*', DIV: '/' }[cell.type];
            out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + n(cell.a) + ' ' + op + ' ' + n(cell.b) + '; END_IF');
          }
        }
      }
    });
    const decl = ['VAR'];
    Object.keys(used.timers).forEach((t) => decl.push('  ' + t + ' : ' + used.timers[t] + ';'));
    Object.keys(used.counters).forEach((c) => decl.push('  ' + c + ' : ' + (used.counters[c] === 'CTU' ? 'CTU' : 'CTD') + ';'));
    if (used.edges) decl.push('  (* R_TRIG / F_TRIG: each edge contact needs its own trigger instance *)');
    Object.keys(used.inst || {}).forEach((k) => decl.push('  ' + k + ' : ' + used.inst[k] + ';   (* instance = its own memory *)'));
    if (used.pid) for (let k = 1; k <= used.pid; k++) decl.push('  PID' + k + ' : PID;   (* the PLC\'s PID function block, e.g. PID_Compact / PIDE *)');
    decl.push('END_VAR');
    let fbs = '';
    if (!prog._inBlock) (prog.blocks || []).forEach((b) => {
      const body = toST({ name: b.name, tags, rungs: b.rungs, blocks: prog.blocks, _inBlock: true });
      const st = {}, rank = { BOOL: 0, INT: 1 };
      b.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (!c) return; ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { const v = c[k]; if (typeof v === 'string' && v[0] === '#') { const nm2 = v.slice(1).split('.')[0]; if (b.params.some((pp) => pp.name === nm2)) return; const ty = TIMERS.includes(c.type) && k === 'addr' ? (c.type === 'RTO' ? 'TONR' : c.type) : COUNTERS.includes(c.type) && k === 'addr' ? c.type : /\.(ET|PT|CV|PV)$/.test(v) || ['MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'SHL', 'SHR', 'CMP', 'PID'].includes(c.type) ? 'INT' : 'BOOL'; if (st[nm2] == null || (rank[st[nm2]] != null && (rank[ty] == null || rank[ty] > rank[st[nm2]]))) st[nm2] = ty; } }); })));
      const statics = new Set(Object.keys(st).map((k) => k + ' : ' + st[k] + ';'));
      const sec = (kw, dir) => { const ps = b.params.filter((pp) => pp.dir === dir); return ps.length ? [kw].concat(ps.map((pp) => '  ' + pp.name + ' : ' + pp.type + ';' + (pp.comment ? '   (* ' + pp.comment + ' *)' : '')), ['END_VAR']).join('\n') + '\n' : ''; };
      fbs += '\nFUNCTION_BLOCK ' + b.name + (b.comment ? '   (* ' + b.comment + ' *)' : '') + '\n' + sec('VAR_INPUT', 'IN') + sec('VAR_OUTPUT', 'OUT') + sec('VAR_IN_OUT', 'INOUT') + (statics.size ? 'VAR\n' + [...statics].map((x) => '  ' + x).join('\n') + '\nEND_VAR\n' : '') + body + '\nEND_FUNCTION_BLOCK\n';
    });
    if (prog._inBlock) return out.slice(1).join('\n');
    return (decl.length > 2 ? decl.join('\n') + '\n\n' : '') + out.join('\n') + (fbs ? '\n\n(* ═════ Function blocks ═════ *)' + fbs : '');
  }

  // collect addresses used in a program
  function usedAddrs(prog) {
    const s = new Set();
    prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => {
      if (!c) return;
      ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { if (c[k] && typeof c[k] === 'string' && !RE.int.test(c[k]) && c[k][0] !== '#') s.add(c[k]); });
      if (c.type === 'CALL') Object.values(c.args || {}).forEach((v) => { if (v && !RE.int.test(v) && v[0] !== '#') s.add(v); });
    })));
    return s;
  }

  Object.assign(LL, {
    LOGIC, OUTPUT, TIMERS, COUNTERS, MATH, CMP_OPS, RE,
    isOutput, isLogic, isBitAddr, isWordAddr, isWritableBit, isWritableWord, norm,
    parseDuration, fmtDuration, shiftBits, mkCell, cloneCell, emptyRung,
    parseRung, rungToLines, parseProgram, programToText, cloneProgram, parseToken, cellToken,
    Machine, lint, toST, stName, usedAddrs,
  });
})(typeof window !== 'undefined' ? window : globalThis);
