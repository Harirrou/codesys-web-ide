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
  const OUTPUT = ['COIL', 'NCOIL', 'SET', 'RST', 'TON', 'TOF', 'TP', 'RTO', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'SHRB', 'CALL', 'PID', 'MC_POWER', 'MC_HOME', 'MC_ABS', 'MC_REL', 'MC_JOG', 'MC_STOP', 'MC_RESET', 'MC_SETPOS'];
  const MOTION = ['MC_POWER', 'MC_HOME', 'MC_ABS', 'MC_REL', 'MC_JOG', 'MC_STOP', 'MC_RESET', 'MC_SETPOS'];
  const TIMERS = ['TON', 'TOF', 'TP', 'RTO'];
  const COUNTERS = ['CTU', 'CTD'];
  const MATH = ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR'];
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
    md: /^MD(\d{1,3})$/,
    hc: /^HC(\d)$/,
    axBit: /^AX([0-3])\.(ON|HOMED|MOVING|ERR)$/,
    axWord: /^AX([0-3])\.(POS|VEL)$/,
    ax: /^AX([0-3])$/,
    mc: /^MC(\d{1,2})(?:\.(DONE|BUSY|ERR|ABORT))?$/,
    int: /^-?\d+$/,
    loc: /^#[A-Za-z_]\w*(?:\.(Q|DN|TT|EN|ET|PT|CV|PV))?$/,
    locBase: /^#[A-Za-z_]\w*$/,
  };
  const norm = (s) => { const t = String(s == null ? '' : s).trim().replace(/\s+/g, ''); if (t[0] === '#') { const i = t.indexOf('.'); return i < 0 ? t : t.slice(0, i) + t.slice(i).toUpperCase(); } return t.toUpperCase(); };
  const isBitAddr = (a) => RE.bit.test(a) || RE.sm.test(a) || RE.tBit.test(a) || RE.cBit.test(a) || RE.loc.test(a) || RE.axBit.test(a) || RE.mc.test(a);
  const isWordAddr = (a) => RE.tWord.test(a) || RE.cWord.test(a) || RE.mw.test(a) || RE.md.test(a) || RE.hc.test(a) || RE.axWord.test(a) || RE.aiw.test(a) || RE.aqw.test(a) || RE.int.test(a) || RE.loc.test(a);
  const isWritableWord = (a) => RE.mw.test(a) || RE.md.test(a) || RE.aqw.test(a) || RE.locBase.test(a);
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
    if (type === 'CALL') { c.block = c.block || ''; c.inst = c.inst == null ? 'Inst1' : c.inst; c.args = c.args || {}; }
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
    const m = /^([A-Za-z_]+)(?:\((.*)\))?$/.exec(tok);
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
      case 'MC_POWER': return mkCell(t, { ax: norm(args[0] || 'AX0') });
      case 'MC_JOG': return mkCell(t, { ax: norm(args[0] || 'AX0'), a: norm(args[1] || '100') });
      case 'MC_HOME': return mkCell(t, { addr: norm(args[0] || 'MC0'), ax: norm(args[1] || 'AX0'), src: norm(args[2] || 'I0.0') });
      case 'MC_ABS': case 'MC_REL': return mkCell(t, { addr: norm(args[0] || 'MC1'), ax: norm(args[1] || 'AX0'), a: norm(args[2] || '100'), b: norm(args[3] || '200') });
      case 'MC_STOP': case 'MC_RESET': return mkCell(t, { addr: norm(args[0] || 'MC9'), ax: norm(args[1] || 'AX0') });
      case 'MC_SETPOS': return mkCell(t, { addr: norm(args[0] || 'MC9'), ax: norm(args[1] || 'AX0'), a: norm(args[2] || '0') });
      case 'PID': return mkCell('PID', { a: norm(args[0]), b: norm(args[1]), dst: norm(args[2]), kp: parseFloat(args[3] || '1'), ti: parseFloat(args[4] || '0'), td: parseFloat(args[5] || '0') });
      case 'SHRB': return mkCell('SHRB', { src: norm(args[0]), addr: norm(args[1]), n: parseInt(args[2] || '8', 10) });
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'MOD': case 'SHL': case 'SHR':
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
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'MOD': case 'SHL': case 'SHR': return c.type + '(' + c.a + ',' + c.b + ',' + c.dst + ')';
      case 'SHRB': return 'SHRB(' + c.src + ',' + c.addr + ',' + c.n + ')';
      case 'MC_POWER': return 'MC_POWER(' + c.ax + ')';
      case 'MC_JOG': return 'MC_JOG(' + c.ax + ',' + c.a + ')';
      case 'MC_HOME': return 'MC_HOME(' + c.addr + ',' + c.ax + ',' + c.src + ')';
      case 'MC_ABS': case 'MC_REL': return c.type + '(' + c.addr + ',' + c.ax + ',' + c.a + ',' + c.b + ')';
      case 'MC_STOP': case 'MC_RESET': return c.type + '(' + c.addr + ',' + c.ax + ')';
      case 'MC_SETPOS': return 'MC_SETPOS(' + c.addr + ',' + c.ax + ',' + c.a + ')';
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
      if ((m = /^(BLOCK|FB|FC)\s+([A-Za-z_]\w*)\s*(.*)$/i.exec(line))) { flush(); blk = { name: m[2], kind: m[1].toUpperCase() === 'FC' ? 'FC' : 'FB', comment: m[3].trim(), params: [], rungs: [] }; prog.blocks.push(blk); continue; }
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
      out.push((b.kind === 'FC' ? 'FC ' : 'BLOCK ') + b.name + (b.comment ? ' ' + b.comment : ''));
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
      this.axes = {};
      this.mcs = {};
      this.hmiPrev = {};
      this.instances = {};
      this.ctx = null;
      this.scanCount = 0;
      this.time = 0;
      this.phase = 0;
      this.load(this.prog);
    }

    setInputs(obj) { this.hmiPrev = this.hmiPrev || {}; for (const k in obj) if (/^M\d{1,2}\.[0-7]$/.test(k)) { const v = obj[k] ? 1 : 0; if (this.hmiPrev[k] !== v) { this.bits[k] = v; this.hmiPrev[k] = v; } } for (const k in obj) if (!/^M\d/.test(k)) this.inputs[k] = RE.aiw.test(k) || RE.hc.test(k) ? Math.round(+obj[k] || 0) : obj[k] ? 1 : 0; for (const n in this.axes) if (this.inputs['AX' + n + '.FAULT'] && !this.axes[n].err) { const ax = this.axes[n]; ax.err = 1; ax.msg = 'the drive reports a fault (overload / following error)'; if (ax.cmd) this.mcFinish(ax, false, ax.msg); } }

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
      const fc = b.kind === 'FC';
      const inst = (this.ctx ? this.ctx.inst + '.' : '') + (fc ? b.name + '@' + cell.id : cell.inst);
      if (fc) { const pre = '@' + inst + ':'; for (const k in this.bits) if (k.startsWith(pre)) delete this.bits[k]; for (const k in this.words) if (k.startsWith(pre)) delete this.words[k]; }
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

    // ── motion: axes AX0..AX3 (position in mm, speed in mm/s) and motion command tags MC0..MC99 ──
    axis(n) { return this.axes[n] || (this.axes[n] = { pos: 0, v: 0, en: 0, onT: 0, on: 0, homed: 0, err: 0, msg: '', cmd: null }); }
    axCfg(n) { const c = (this.axisCfg || {})['AX' + n] || {}; return { min: c.min == null ? -1e9 : c.min, max: c.max == null ? 1e9 : c.max, acc: c.acc || 2000, vmax: c.vmax || 1000, homeVel: c.homeVel || 50 }; }
    mcTag(t) { return this.mcs[t] || (this.mcs[t] = { done: 0, busy: 0, err: 0, abort: 0, msg: '' }); }
    mcStart(ax, tag, cmd) {
      const T = this.mcTag(tag);
      T.done = 0; T.err = 0; T.abort = 0; T.msg = '';
      const fail = (msg) => { T.err = 1; T.busy = 0; T.msg = msg; T.keep = T.ex ? 0 : 1; };
      if (ax.err) return fail('the axis is in error: reset it first (MC_RESET)');
      if (!ax.on) return fail('the axis is not powered (MC_POWER)');
      if (cmd.type === 'ABS' && !ax.homed) return fail('the axis is not homed, so it does not know where it is: home it first');
      const cfg = this.axCfg(ax.n);
      if ((cmd.type === 'ABS' || cmd.type === 'REL') && !(cmd.vel > 0)) return fail('the velocity must be above 0');
      if (cmd.type === 'REL') cmd.target = (ax.cmd && ax.cmd.target != null && ax.cmd.type !== 'HOME' ? ax.cmd.target : ax.pos) + cmd.dist;
      if ((cmd.type === 'ABS' || cmd.type === 'REL') && ax.homed && (cmd.target < cfg.min || cmd.target > cfg.max)) { ax.err = 1; ax.msg = 'target ' + Math.round(cmd.target) + ' mm is outside the software limits (' + cfg.min + ' … ' + cfg.max + ' mm)'; return fail(ax.msg); }
      if (cmd.vel) cmd.vel = Math.min(cmd.vel, cfg.vmax);
      if (ax.cmd && ax.cmd.tag && ax.cmd.tag !== tag) { const o = this.mcTag(ax.cmd.tag); if (o.busy) { o.busy = 0; o.abort = 1; o.keep = o.ex ? 0 : 1; } }
      cmd.tag = tag; ax.cmd = cmd; T.busy = 1;
    }
    mcFinish(ax, ok, msg) {
      const c = ax.cmd; ax.cmd = null;
      if (c && c.tag) { const T = this.mcTag(c.tag); T.busy = 0; T.keep = T.ex ? 0 : 1; if (ok) T.done = 1; else { T.err = 1; T.msg = msg || ''; } }
    }
    axisStep(n, dt) {
      const ax = this.axis(n), cfg = this.axCfg(n), s = dt / 1000;
      ax.n = n;
      ax.onT = ax.en ? ax.onT + dt : 0;
      const wasOn = ax.on;
      ax.on = ax.en && ax.onT >= 100 && !ax.err ? 1 : 0;
      if (!ax.on) { ax.v = 0; if (ax.cmd) this.mcFinish(ax, false, wasOn ? 'the axis was switched off' : 'the axis is not powered'); return; }
      const c = ax.cmd;
      const dv = cfg.acc * s;
      const toward = (vdes, k) => { const d = dv * (k || 1); ax.v = ax.v < vdes ? Math.min(vdes, ax.v + d) : Math.max(vdes, ax.v - d); };
      if (!c) { toward(0, 2); ax.pos += ax.v * s; }
      else if (c.type === 'ABS' || c.type === 'REL') {
        const d = c.target - ax.pos;
        const vdes = Math.sign(d) * Math.min(c.vel, Math.sqrt(2 * cfg.acc * Math.abs(d)));
        toward(vdes);
        const step = ax.v * s;
        if ((d >= 0 && step >= d) || (d <= 0 && step <= d) || Math.abs(d) < 0.001) { ax.pos = c.target; ax.v = 0; this.mcFinish(ax, true); }
        else ax.pos += step;
      } else if (c.type === 'JOG') { toward(Math.max(-cfg.vmax, Math.min(cfg.vmax, c.vel))); ax.pos += ax.v * s; if (c.off && ax.v === 0) ax.cmd = null; }
      else if (c.type === 'STOP') { toward(0, 2); ax.pos += ax.v * s; if (ax.v === 0) this.mcFinish(ax, true); }
      else if (c.type === 'HOME') {
        if (this.bit(c.sensor)) { ax.pos = 0; ax.v = 0; ax.homed = 1; this.mcFinish(ax, true); }
        else { toward(-cfg.homeVel); ax.pos += ax.v * s; }
      }
      if (ax.homed && (ax.pos < cfg.min - 0.5 || ax.pos > cfg.max + 0.5)) {
        ax.pos = Math.max(cfg.min, Math.min(cfg.max, ax.pos)); ax.v = 0; ax.err = 1; ax.msg = 'software limit reached (' + cfg.min + ' … ' + cfg.max + ' mm)';
        if (ax.cmd) this.mcFinish(ax, false, ax.msg); ax.cmd = null;
      }
    }

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
      if ((m = RE.axBit.exec(a))) { const x = this.axes[+m[1]]; if (!x) return 0; return m[2] === 'ON' ? x.on : m[2] === 'HOMED' ? x.homed : m[2] === 'ERR' ? x.err : Math.abs(x.v) > 0.001 ? 1 : 0; }
      if ((m = RE.mc.exec(a))) { const t = this.mcs['MC' + m[1]]; if (!t) return 0; return t[(m[2] || 'DONE').toLowerCase()] ? 1 : 0; }
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
      if (RE.md.test(a) || RE.hc.test(a)) return this.words[a] || 0;
      if ((m = RE.axWord.exec(a))) { const x = this.axes[+m[1]]; return x ? Math.round(m[2] === 'POS' ? x.pos : x.v) : 0; }
      if ((m = RE.tWord.exec(a))) { const t = this.timers[+m[1]]; return t ? (m[2] === 'ET' ? t.et : t.pt) : 0; }
      if ((m = RE.cWord.exec(a))) { const c = this.counters[+m[1]]; return c ? (m[2] === 'CV' ? c.cv : c.pv) : 0; }
      return 0;
    }
    setBit(a, v) { a = this.res(a); if (a && a[0] === '@') this.bits[a] = v ? 1 : 0; else if (isWritableBit(a)) this.bits[a] = v ? 1 : 0; }
    setWord(a, v) {
      a = this.res(a);
      if (!(a && a[0] === '@') && !isWritableWord(a)) return;
      v = Math.trunc(v);
      const big = RE.md.test(a), hi = big ? 2147483647 : 32767, lo = big ? -2147483648 : -32768;   // MD = 32-bit double word (DINT)
      if (v > hi) v = hi; if (v < lo) v = lo;
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
      if (MOTION.includes(cell.type)) {
        const mm = RE.ax.exec(cell.ax || ''); if (!mm) return;
        const ax = this.axis(+mm[1]); ax.n = +mm[1];
        const k = 'mc:' + cell.id, prev = this.edges[k]; this.edges[k] = p ? 1 : 0;
        const rise = p && !prev;
        // PLCopen: DONE / ERR / ABORT stay on while the rung (Execute) is true; when it is false they show for one scan, then clear
        if (cell.addr && /^MC/.test(cell.addr)) { const T = this.mcTag(cell.addr); T.ex = p ? 1 : 0; if (p) T.keep = 0; else if (!T.busy) { if (T.keep) T.keep = 0; else { T.done = 0; T.err = 0; T.abort = 0; } } }
        switch (cell.type) {
          case 'MC_POWER': ax.en = p ? 1 : 0; break;
          case 'MC_JOG':
            if (p && ax.on && !ax.err) { if (!ax.cmd || ax.cmd.type !== 'JOG' || ax.cmd.cell !== cell.id) { if (ax.cmd && ax.cmd.tag) { const o = this.mcTag(ax.cmd.tag); if (o.busy) { o.busy = 0; o.abort = 1; } } ax.cmd = { type: 'JOG', cell: cell.id }; } ax.cmd.vel = this.word(cell.a); ax.cmd.off = false; }
            else if (!p && ax.cmd && ax.cmd.type === 'JOG' && ax.cmd.cell === cell.id) { ax.cmd.vel = 0; ax.cmd.off = true; }
            break;
          case 'MC_HOME': if (rise) this.mcStart(ax, cell.addr, { type: 'HOME', sensor: cell.src }); break;
          case 'MC_ABS': if (rise) this.mcStart(ax, cell.addr, { type: 'ABS', target: this.word(cell.a), vel: this.word(cell.b) }); break;
          case 'MC_REL': if (rise) this.mcStart(ax, cell.addr, { type: 'REL', dist: this.word(cell.a), vel: this.word(cell.b) }); break;
          case 'MC_STOP': if (rise) { const T = this.mcTag(cell.addr); T.done = 0; T.err = 0; T.abort = 0; if (ax.cmd && ax.cmd.tag) { const o = this.mcTag(ax.cmd.tag); if (o.busy) { o.busy = 0; o.abort = 1; } } ax.cmd = { type: 'STOP', tag: cell.addr }; T.busy = 1; } break;
          case 'MC_SETPOS': if (rise) { const T = this.mcTag(cell.addr); T.done = 0; T.err = 0; T.abort = 0; T.keep = 0; if (Math.abs(ax.v) > 0.001 || (ax.cmd && ax.cmd.type !== 'JOG')) { T.err = 1; T.msg = 'set the position only while the axis stands still'; } else { const v = this.word(cell.a), cfg = this.axCfg(ax.n); if (v < cfg.min || v > cfg.max) { T.err = 1; T.msg = 'home value ' + v + ' is outside the travel (' + cfg.min + ' … ' + cfg.max + ' mm)'; } else { ax.pos = v; ax.homed = 1; T.done = 1; } } } break;
          case 'MC_RESET': if (rise) { const T = this.mcTag(cell.addr); T.done = 0; T.err = 0; T.keep = 0; if (this.inputs['AX' + ax.n + '.FAULT']) { T.err = 1; T.msg = 'the drive still reports a fault: remove the cause first'; } else { ax.err = 0; ax.msg = ''; T.done = 1; } } break;
        }
        return;
      }
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
        case 'MOD': if (p) { const d = this.word(cell.b); this.setWord(cell.dst, d === 0 ? 0 : this.word(cell.a) % d); } break;
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
      for (const k in this.inputs) { if (/^I/.test(k)) this.bits[k] = this.inputs[k]; else if (RE.aiw.test(k)) this.words[k] = Math.max(-32768, Math.min(32767, this.inputs[k])); else if (RE.hc.test(k)) this.words[k] = this.inputs[k]; }
      this.bits['SM0.0'] = 1;
      this.bits['SM0.1'] = this.scanCount === 0 ? 1 : 0;
      this.bits['SM0.5'] = (this.time % 1000) < 500 ? 1 : 0;
    }
    endScan(dt) { for (const n in this.axes) this.axisStep(+n, dt); this.scanCount++; this.time += dt; }

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
    const visit = (rungs, where) => rungs.forEach((r, i) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'CALL' && c.inst && !(prog.blocks || []).some((b) => b.name === c.block && b.kind === 'FC')) { const k = (where ? where + '.' : '') + c.inst; if (seen[k]) all.push({ level: 'error', rung: i + 1, block: where || undefined, msg: 'Instance "' + c.inst + '" is called twice. Every call needs its own instance (its own memory), e.g. ' + c.inst + 'b.' }); seen[k] = 1; } })));
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
        if (c.type === 'MOV' && (!isWordAddr(c.src) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: 'MOV copies a number or word into an MW, MD or AQW word.' });
        if (MATH.includes(c.type) && (!isWordAddr(c.a) || !isWordAddr(c.b) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: c.type + ' needs two operands and an MW, MD or AQW destination.' });
        ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { if (!blk && typeof c[k] === 'string' && c[k][0] === '#') issues.push({ level: 'error', rung: n, msg: c[k] + ' is a block variable: names with # only work inside a block.' }); });
        if (blk && blk.kind === 'FC') {
          const isParam = (a) => typeof a === 'string' && a[0] === '#' && blk.params.some((pp) => pp.name === a.slice(1).split('.')[0]);
          if ((TIMERS.includes(c.type) || COUNTERS.includes(c.type)) && !isParam(c.addr)) issues.push({ level: 'error', rung: n, msg: 'FC ' + blk.name + ': a ' + c.type + ' needs memory that lasts from scan to scan, and an FC has none. Change the block to an FB (it then gets an instance).' });
          if (c.type === 'P' || c.type === 'N') issues.push({ level: 'error', rung: n, msg: 'FC ' + blk.name + ': an edge must remember the signal of the last scan, and an FC has no memory. Change the block to an FB, or make the edge outside and pass the pulse in.' });
          if (c.type === 'PID') issues.push({ level: 'error', rung: n, msg: 'FC ' + blk.name + ': a PID keeps its integral from scan to scan, so it needs an FB.' });
          if (c.type === 'CALL' && blocks[c.block] && blocks[c.block].kind !== 'FC') issues.push({ level: 'error', rung: n, msg: 'FC ' + blk.name + ': it cannot hold the instance of FB ' + c.block + '. Call the FB from an FB or from the main program.' });
        }
        if (c.type === 'CALL') {
          const b = blocks[c.block];
          if (!b) issues.push({ level: 'error', rung: n, msg: 'CALL: there is no block called "' + c.block + '".' });
          else {
            if (blk && b.name === blk.name) issues.push({ level: 'error', rung: n, msg: 'A block cannot call itself.' });
            if (b.kind !== 'FC' && !/^[A-Za-z_]\w*$/.test(c.inst || '')) issues.push({ level: 'error', rung: n, msg: 'CALL ' + b.name + ': an FB needs an instance name (its own memory: letters, digits, _), e.g. ' + b.name.replace(/^FB_?/i, '') + '1.' });
            if (b.kind === 'FC' && c.inst) issues.push({ level: 'warn', rung: n, msg: 'CALL ' + b.name + ': an FC has no instance (no memory of its own), so the name "' + c.inst + '" is ignored.' });
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
        if (MOTION.includes(c.type)) {
          if (!RE.ax.test(c.ax || '')) issues.push({ level: 'error', rung: n, msg: c.type + ': the axis must be AX0 … AX3.' });
          if (!['MC_POWER', 'MC_JOG'].includes(c.type) && !/^MC\d{1,2}$/.test(c.addr || '')) issues.push({ level: 'error', rung: n, msg: c.type + ' needs a command tag like MC1 (it holds .DONE, .BUSY, .ERR).' });
          if (c.type === 'MC_HOME' && !isBitAddr(c.src)) issues.push({ level: 'error', rung: n, msg: 'MC_HOME: the reference (home) switch must be a bit, e.g. I0.0.' });
          if (c.type === 'MC_SETPOS' && !isWordAddr(c.a)) issues.push({ level: 'error', rung: n, msg: 'MC_SETPOS: the home position value must be a number or a word.' });
          if (['MC_ABS', 'MC_REL', 'MC_JOG'].includes(c.type) && (!isWordAddr(c.a) || (c.type !== 'MC_JOG' && !isWordAddr(c.b)))) issues.push({ level: 'error', rung: n, msg: c.type + ': position / distance and velocity must be numbers or words.' });
          if (c.addr && /^MC/.test(c.addr)) (timers['mc:' + c.addr] = timers['mc:' + c.addr] || []).push(n);
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
      issues.push({ level: 'warn', rung: timers[a][0], msg: /^mc:/.test(a) ? 'Command tag ' + a.slice(3) + ' is used by rungs ' + timers[a].join(', ') + '. Give every motion instruction its own MC tag, or their DONE / BUSY bits get mixed up.' : 'Timer ' + a + ' is used by rungs ' + timers[a].join(', ') + '. Give each timer instruction its own number.' });
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
    if (!t && (m = RE.md.exec(a))) return '%MD' + m[1];
    if (!t && (m = RE.mw.exec(a))) return '%MW' + m[1];
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
            if (b && b.kind === 'FC') {
              const ps = b.params.map((pp) => pp.name + (pp.dir === 'OUT' ? ' => ' : ' := ') + n(cell.args[pp.name] || ''));
              out.push('IF ' + e + ' THEN ' + b.name + '(' + ps.join(', ') + '); END_IF   (* FUNCTION: no instance *)');
              break;
            }
            used.inst = used.inst || {}; used.inst[cell.inst] = cell.block;
            const ins = b ? b.params.filter((pp) => pp.dir !== 'OUT').map((pp) => pp.name + ' := ' + n(cell.args[pp.name] || '')) : [];
            out.push('IF ' + e + ' THEN');
            out.push('  ' + cell.inst + '(' + ins.join(', ') + ');');
            if (b) b.params.filter((pp) => pp.dir !== 'IN').forEach((pp) => out.push('  ' + n(cell.args[pp.name] || '') + ' := ' + cell.inst + '.' + pp.name + ';'));
            out.push('END_IF');
            break;
          }
          case 'MC_POWER': used.mc = used.mc || {}; used.mc['Power_' + cell.ax] = 'MC_Power'; out.push('Power_' + cell.ax + '(Axis := ' + cell.ax + ', Enable := ' + e + ');'); break;
          case 'MC_JOG': used.mc = used.mc || {}; used.mc['Jog_' + cell.ax] = 'MC_Jog'; out.push('Jog_' + cell.ax + '(Axis := ' + cell.ax + ', JogForward := ' + e + ' AND ' + n(cell.a) + ' > 0, JogBackward := ' + e + ' AND ' + n(cell.a) + ' < 0, Velocity := ABS(' + n(cell.a) + '));'); break;
          case 'MC_HOME': used.mc = used.mc || {}; used.mc[cell.addr] = 'MC_Home'; out.push(cell.addr + '(Axis := ' + cell.ax + ', Execute := ' + e + ');   (* reference switch ' + n(cell.src) + ' is set in the axis configuration *)'); break;
          case 'MC_ABS': used.mc = used.mc || {}; used.mc[cell.addr] = 'MC_MoveAbsolute'; out.push(cell.addr + '(Axis := ' + cell.ax + ', Execute := ' + e + ', Position := ' + n(cell.a) + ', Velocity := ' + n(cell.b) + ');'); break;
          case 'MC_REL': used.mc = used.mc || {}; used.mc[cell.addr] = 'MC_MoveRelative'; out.push(cell.addr + '(Axis := ' + cell.ax + ', Execute := ' + e + ', Distance := ' + n(cell.a) + ', Velocity := ' + n(cell.b) + ');'); break;
          case 'MC_STOP': used.mc = used.mc || {}; used.mc[cell.addr] = 'MC_Stop'; out.push(cell.addr + '(Axis := ' + cell.ax + ', Execute := ' + e + ');'); break;
          case 'MC_SETPOS': used.mc = used.mc || {}; used.mc[cell.addr] = 'MC_SetPosition'; out.push(cell.addr + '(Axis := ' + cell.ax + ', Execute := ' + e + ', Position := ' + n(cell.a) + ');   (* TIA Portal: MC_Home with Mode := 0 *)'); break;
          case 'MC_RESET': used.mc = used.mc || {}; used.mc[cell.addr] = 'MC_Reset'; out.push(cell.addr + '(Axis := ' + cell.ax + ', Execute := ' + e + ');'); break;
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
            const op = { ADD: '+', SUB: '-', MUL: '*', DIV: '/', MOD: 'MOD' }[cell.type];
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
    Object.keys(used.mc || {}).forEach((k) => decl.push('  ' + k + ' : ' + used.mc[k] + ';   (* PLCopen motion block *)'));
    if (used.pid) for (let k = 1; k <= used.pid; k++) decl.push('  PID' + k + ' : PID;   (* the PLC\'s PID function block, e.g. PID_Compact / PIDE *)');
    decl.push('END_VAR');
    let fbs = '';
    if (!prog._inBlock) (prog.blocks || []).forEach((b) => {
      const body = toST({ name: b.name, tags, rungs: b.rungs, blocks: prog.blocks, _inBlock: true });
      const st = {}, rank = { BOOL: 0, INT: 1 };
      b.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (!c) return; ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { const v = c[k]; if (typeof v === 'string' && v[0] === '#') { const nm2 = v.slice(1).split('.')[0]; if (b.params.some((pp) => pp.name === nm2)) return; const ty = TIMERS.includes(c.type) && k === 'addr' ? (c.type === 'RTO' ? 'TONR' : c.type) : COUNTERS.includes(c.type) && k === 'addr' ? c.type : /\.(ET|PT|CV|PV)$/.test(v) || ['MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'CMP', 'PID'].includes(c.type) ? 'INT' : 'BOOL'; if (st[nm2] == null || (rank[st[nm2]] != null && (rank[ty] == null || rank[ty] > rank[st[nm2]]))) st[nm2] = ty; } }); })));
      const statics = new Set(Object.keys(st).map((k) => k + ' : ' + st[k] + ';'));
      const sec = (kw, dir) => { const ps = b.params.filter((pp) => pp.dir === dir); return ps.length ? [kw].concat(ps.map((pp) => '  ' + pp.name + ' : ' + pp.type + ';' + (pp.comment ? '   (* ' + pp.comment + ' *)' : '')), ['END_VAR']).join('\n') + '\n' : ''; };
      const fcB = b.kind === 'FC';
      fbs += '\n' + (fcB ? 'FUNCTION ' + b.name + ' : BOOL' : 'FUNCTION_BLOCK ' + b.name) + (b.comment ? '   (* ' + b.comment + ' *)' : '') + '\n' + sec('VAR_INPUT', 'IN') + sec('VAR_OUTPUT', 'OUT') + sec('VAR_IN_OUT', 'INOUT') + (statics.size ? (fcB ? 'VAR   (* temporary: lost after every call *)\n' : 'VAR\n') + [...statics].map((x) => '  ' + x).join('\n') + '\nEND_VAR\n' : '') + body + '\n' + (fcB ? 'END_FUNCTION' : 'END_FUNCTION_BLOCK') + '\n';
    });
    if (prog._inBlock) return out.slice(1).join('\n');
    return (decl.length > 2 ? decl.join('\n') + '\n\n' : '') + out.join('\n') + (fbs ? '\n\n(* ═════ Function blocks ═════ *)' + fbs : '');
  }

  /* Rockwell Studio 5000 / Logix Designer: the same ladder as "neutral text", the rung text that
   * Logix Designer shows and accepts when you edit a rung as text (double-click the rung number).
   * Series = written one after the other, a parallel branch = [ A ,B ]. Tag names come from the
   * symbols; untagged addresses become tags like I0_0 that you create (or alias to the I/O card). */
  function toRockwell(prog) {
    const tags = prog.tags || {};
    const out = [];
    const timers = new Set(), counters = new Set();
    const walk = (rs) => rs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && TIMERS.includes(c.type)) timers.add(c.addr); if (c && COUNTERS.includes(c.type)) counters.add(c.addr); })));
    walk(prog.rungs); (prog.blocks || []).forEach((b) => walk(b.rungs));
    let ons = 0;
    const tg = (a) => {
      if (a == null) return '?';
      a = String(a);
      if (RE.int.test(a)) return a;
      if (a === 'SM0.1') return 'S:FS';
      if (a === 'SM0.5') return 'Clock_1Hz';
      const loc = a[0] === '#';
      const base = loc ? a.slice(1).split('.')[0] : a.split('.')[0];
      const f = a.indexOf('.') >= 0 && (loc || /^[TC]\d/.test(a)) ? a.slice(a.indexOf('.') + 1) : '';
      const isT = timers.has(loc ? '#' + base : base) || (!loc && RE.tBit.test(a)) || (!loc && RE.tWord.test(a));
      const isC = counters.has(loc ? '#' + base : base) || (!loc && RE.cBit.test(a)) || (!loc && RE.cWord.test(a));
      if (isT || isC) {
        const mem = { '': 'DN', Q: 'DN', DN: 'DN', TT: 'TT', EN: 'EN', ET: 'ACC', PT: 'PRE', CV: 'ACC', PV: 'PRE' }[f] || f;
        return base + '.' + mem;
      }
      if (loc) return base;
      const t = tags[a];
      if (t) return t.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, '_$1');
      return a.replace(/\./g, '_');
    };
    const tmr = (a) => (a[0] === '#' ? a.slice(1) : a);
    const CMPI = { '==': 'EQU', '<>': 'NEQ', '>': 'GRT', '>=': 'GEQ', '<': 'LES', '<=': 'LEQ' };
    const prR = (x) => {
      if (!x) return '';
      switch (x.t) {
        case 'true': return '';
        case 'v': return x.s;
        case 'not': return x.x.t === 'v' && /^XIC\(/.test(x.x.s) ? x.x.s.replace(/^XIC/, 'XIO') : 'NOT[' + prR(x.x) + ']';
        case 'and': return x.items.map(prR).join('');
        case 'or': return '[' + x.items.map(prR).join(',') + ']';
      }
      return '';
    };
    const outIns = (cell, notes) => {
      const t = cell.type;
      switch (t) {
        case 'COIL': return 'OTE(' + tg(cell.addr) + ')';
        case 'NCOIL': notes.push('Logix has no negated coil: invert the conditions (XIC ↔ XIO) in front of an OTE.'); return 'OTE(' + tg(cell.addr) + ')';
        case 'SET': return 'OTL(' + tg(cell.addr) + ')';
        case 'RST': return timers.has(cell.addr) || counters.has(cell.addr) || RE.tBit.test(cell.addr) || RE.cBit.test(cell.addr) ? 'RES(' + tmr(cell.addr) + ')' : isWritableWord(cell.addr) ? 'CLR(' + tg(cell.addr) + ')' : 'OTU(' + tg(cell.addr) + ')';
        case 'TON': case 'TOF': case 'RTO': return t + '(' + tmr(cell.addr) + ',' + cell.pt + ',0)';
        case 'TP': notes.push('Logix ladder has no pulse timer (TP): use a one-shot (ONS) that latches a bit, and a TON that unlatches it.'); return 'TON(' + tmr(cell.addr) + ',' + cell.pt + ',0)';
        case 'CTU': case 'CTD': return t + '(' + tmr(cell.addr) + ',' + cell.pv + ',0)';
        case 'MOV': return 'MOV(' + tg(cell.src) + ',' + tg(cell.dst) + ')';
        case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'MOD': return t + '(' + tg(cell.a) + ',' + tg(cell.b) + ',' + tg(cell.dst) + ')';
        case 'SHL': case 'SHR': {
          const n = parseInt(cell.b, 10);
          if (RE.int.test(String(cell.b))) return (t === 'SHL' ? 'MUL' : 'DIV') + '(' + tg(cell.a) + ',' + Math.pow(2, n) + ',' + tg(cell.dst) + ')';
          notes.push('Logix has no word shift in ladder: use CPT with a multiplication / division by a power of 2.'); return 'CPT(' + tg(cell.dst) + ',' + tg(cell.a) + (t === 'SHL' ? '*' : '/') + '(2**' + tg(cell.b) + '))';
        }
        case 'SHRB': notes.push('Bit shift: BSL / BSR work on a DINT array. Create an array for the register and a CONTROL tag for it; .LEN = ' + Math.abs(cell.n) + '.'); return (cell.n < 0 ? 'BSR(' : 'BSL(') + 'SR_' + tg(cell.addr) + '[0],SR_' + tg(cell.addr) + '_Ctl,' + tg(cell.src) + ',' + Math.abs(cell.n) + ')';
        case 'CALL': {
          const b = (prog.blocks || []).find((x) => x.name === cell.block);
          const args = b ? b.params.map((pp) => tg((cell.args || {})[pp.name] || '?')) : [];
          if (b && b.kind === 'FC') { const ins = b.params.filter((pp) => pp.dir !== 'OUT'), outs = b.params.filter((pp) => pp.dir !== 'IN'); notes.push('FC ' + b.name + ' = a routine called with JSR: input parameters, then return parameters (SBR / RET inside the routine).'); return 'JSR(' + b.name + ',' + ins.length + [''].concat(ins.map((pp) => tg((cell.args || {})[pp.name] || '?')), outs.map((pp) => tg((cell.args || {})[pp.name] || '?'))).join(',') + ')'; }
          return cell.block + '(' + [cell.inst].concat(args).join(',') + ')';
        }
        case 'MC_POWER': notes.push('Logix: MSO switches the servo on (once, on the rung going true) and MSF switches it off.'); return 'MSO(' + cell.ax + ',MSO_' + cell.ax + ')';
        case 'MC_JOG': notes.push('Logix: MAJ jogs, MAS stops it when the button is released. Operands shortened: Logix also asks for units, acceleration and profile.'); return 'MAJ(' + cell.ax + ',MAJ_' + cell.ax + ',' + (String(cell.a)[0] === '-' ? 'Reverse' : 'Forward') + ',' + tg(String(cell.a).replace(/^-/, '')) + ')';
        case 'MC_HOME': return 'MAH(' + cell.ax + ',' + cell.addr + ')';
        case 'MC_ABS': case 'MC_REL': notes.push('Logix MAM: move type 0 = absolute, 1 = incremental. Operands shortened: Logix also asks for units, acceleration, deceleration and profile.'); return 'MAM(' + cell.ax + ',' + cell.addr + ',' + (cell.type === 'MC_ABS' ? 0 : 1) + ',' + tg(cell.a) + ',' + tg(cell.b) + ')';
        case 'MC_STOP': return 'MAS(' + cell.ax + ',' + cell.addr + ',All)';
        case 'MC_RESET': return 'MAFR(' + cell.ax + ',' + cell.addr + ')';
        case 'MC_SETPOS': return 'MRP(' + cell.ax + ',' + cell.addr + ',Absolute,Actual,' + tg(cell.a) + ')';
        case 'PID': notes.push('PID: put SP = ' + tg(cell.b) + ', KP = ' + cell.kp + ', KI and KD in the PID tag (' + 'PID_' + tg(cell.dst) + '); many plants use PIDE in a function block diagram instead.'); return 'PID(PID_' + tg(cell.dst) + ',' + tg(cell.a) + ',0,' + tg(cell.dst) + ',0,0,0)';
      }
      return '';
    };
    const rungs = (rs, title) => {
      rs.forEach((rung, i) => {
        const R = rung.rows, C = rung.cols;
        let cur = new Array(R).fill(T);
        for (let c = 0; c < C - 1; c++) {
          const next = [];
          for (let r = 0; r < R; r++) {
            const cell = rung.cells[r][c];
            let e = null;
            if (cell) switch (cell.type) {
              case 'WIRE': e = cur[r]; break;
              case 'NO': e = cell.addr === 'SM0.0' ? cur[r] : AND(cur[r], V('XIC(' + tg(cell.addr) + ')')); break;
              case 'NC': e = AND(cur[r], V('XIO(' + tg(cell.addr) + ')')); break;
              case 'P': e = AND(cur[r], V('XIC(' + tg(cell.addr) + ')ONS(Ons_' + (++ons) + ')')); break;
              case 'N': e = AND(cur[r], V('XIO(' + tg(cell.addr) + ')ONS(Ons_' + (++ons) + ')')); break;
              case 'NOT': e = cur[r] ? { t: 'not', x: cur[r] } : T; break;
              case 'CMP': e = AND(cur[r], V(CMPI[cell.op] + '(' + tg(cell.a) + ',' + tg(cell.b) + ')')); break;
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
        const notes = [];
        const groups = [];
        for (let r = 0; r < R; r++) {
          const cell = rung.cells[r][C - 1];
          if (!cell || !cur[r]) continue;
          const cond = prR(cur[r]), ins = outIns(cell, notes);
          const g = groups.find((x) => x.cond === cond);
          if (g) g.ins.push(ins); else groups.push({ cond, ins: [ins] });
        }
        out.push('');
        out.push('// ' + title + ' rung ' + i + (rung.comment ? ': ' + rung.comment : ''));
        [...new Set(notes)].forEach((n) => out.push('//   note: ' + n));
        groups.forEach((g) => out.push(g.cond + (g.ins.length > 1 ? '[' + g.ins.join(',') + ']' : g.ins[0] || 'NOP()') + ';'));
        if (!groups.length) out.push('NOP();');
      });
    };
    out.push('// ' + (prog.name || 'Program') + ': Studio 5000 / Logix Designer rung text (neutral text)');
    out.push('// Paste one rung at a time: double-click the rung number in Logix Designer and paste the text.');
    out.push('// Timers / counters: create TIMER / COUNTER tags with these names. Times are in ms (PRE).');
    rungs(prog.rungs, 'MainRoutine');
    (prog.blocks || []).forEach((b) => {
      out.push('');
      out.push('// ═════ ' + (b.kind === 'FC' ? 'Routine (called with JSR) ' : 'Add-On Instruction ') + b.name + (b.comment ? ': ' + b.comment : '') + ' ═════');
      b.params.forEach((pp) => out.push('//   ' + (pp.dir === 'IN' ? 'Input ' : pp.dir === 'OUT' ? 'Output' : 'InOut ') + ' ' + pp.name + ' : ' + (pp.type === 'INT' ? 'INT' : 'BOOL') + (pp.comment ? '   (' + pp.comment + ')' : '')));
      out.push(b.kind === 'FC' ? '//   Other names inside are temporary tags: they keep nothing from one call to the next.' : '//   Other names inside are local tags of the AOI (each instance tag has its own copy).');
      rungs(b.rungs, b.name + ' Logic');
    });
    return out.join('\n');
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
    LOGIC, OUTPUT, TIMERS, COUNTERS, MATH, CMP_OPS, RE, MOTION,
    isOutput, isLogic, isBitAddr, isWordAddr, isWritableBit, isWritableWord, norm,
    parseDuration, fmtDuration, shiftBits, mkCell, cloneCell, emptyRung,
    parseRung, rungToLines, parseProgram, programToText, cloneProgram, parseToken, cellToken,
    Machine, lint, toST, toRockwell, stName, usedAddrs,
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* Ladder Lab — the same program for other brands: TIA Portal SCL, TwinCAT 3 / Omron Sysmac ST
 * with named variables, Schneider Machine Expert ST, Omron CX-Programmer mnemonics. */
(function (G) {
  'use strict';
  const LL = G.LL;
  const RE = LL.RE;
  const san = (s) => String(s).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, '_$1');

  // every address the program uses, with a variable name and an IEC type
  function ioVars(prog) {
    const tags = prog.tags || {};
    const set = new Set(LL.usedAddrs(prog));
    (prog.blocks || []).forEach((b) => LL.usedAddrs({ rungs: b.rungs }).forEach((a) => set.add(a)));
    const out = [];
    [...set].sort().forEach((a) => {
      let kind = null, type = 'BOOL';
      if (RE.bit.test(a)) kind = a[0];
      else if (RE.aiw.test(a)) { kind = 'I'; type = 'INT'; }
      else if (RE.aqw.test(a)) { kind = 'Q'; type = 'INT'; }
      else if (RE.mw.test(a)) { kind = 'M'; type = 'INT'; }
      else if (RE.md.test(a)) { kind = 'M'; type = 'DINT'; }
      else if (RE.hc.test(a)) { kind = 'I'; type = 'DINT'; }
      if (!kind) return;
      const name = tags[a] ? san(tags[a]) : a.replace(/\./g, '_');
      out.push({ a, kind, type, name, iec: LL.stName(a, {}) });
    });
    return out;
  }
  // ST with direct addresses replaced by variable names
  function namedST(prog) {
    const vars = ioVars(prog);
    let st = LL.toST(Object.assign({}, prog, { tags: {} }));
    vars.slice().sort((x, y) => y.iec.length - x.iec.length).forEach((v) => { st = st.split(v.iec).join(v.name); });
    return { vars, st };
  }
  const splitDecl = (st) => {
    const m = /^VAR\n([\s\S]*?)\nEND_VAR\n\n/.exec(st);
    return m ? { decl: m[1].split('\n'), body: st.slice(m[0].length) } : { decl: [], body: st };
  };

  function toTwinCAT(prog, sysmac) {
    const { vars, st } = namedST(prog);
    const { decl, body } = splitDecl(st);
    const out = [];
    if (sysmac) {
      out.push('// Omron Sysmac Studio (NJ / NX): ST program. Create these variables in the Global Variables table and');
      out.push('// map the inputs and outputs to the EtherCAT I/O ports in the I/O Map. Timers, counters and FBs are instances.');
    } else {
      out.push('// Beckhoff TwinCAT 3: PROGRAM MAIN. "AT %I*" / "AT %Q*" variables are linked to the EtherCAT terminals');
      out.push('// in the I/O tree (right-click the variable → Change Link). Timers come from Tc2_Standard.');
    }
    out.push(sysmac ? '' : 'PROGRAM MAIN');
    out.push('VAR');
    vars.forEach((v) => {
      const at = sysmac ? '' : v.kind === 'I' ? ' AT %I*' : v.kind === 'Q' ? ' AT %Q*' : '';
      out.push('  ' + v.name + at + ' : ' + v.type + ';   // ' + v.a + (sysmac && v.kind !== 'M' ? ' → map in the I/O Map' : ''));
    });
    decl.forEach((l) => out.push(l.replace(/\(\*/g, '//').replace(/\*\)/g, '')));
    out.push('END_VAR');
    out.push('');
    let b = body.replace(/\bFirstScan\b/g, sysmac ? 'P_First_RunMode' : 'bFirstCycle').replace(/\bClock_1Hz\b/g, sysmac ? 'Get1sClk()' : 'fbBlink.OUT');
    if (!sysmac && /bFirstCycle/.test(b)) out.splice(out.indexOf('END_VAR'), 0, '  bFirstCycle : BOOL;   // = _TaskInfo[GETCURTASKINDEXEX()].FirstCycle');
    if (!sysmac && /fbBlink/.test(b)) out.splice(out.indexOf('END_VAR'), 0, '  fbBlink : BLINK := (TIMELOW := T#500MS, TIMEHIGH := T#500MS);   // Tc2_Utilities: call fbBlink(ENABLE := TRUE); once per cycle');
    out.push(b);
    if (!sysmac) out.push('END_PROGRAM');
    return out.join('\n');
  }

  function toMachineExpert(prog) {
    const st = LL.toST(Object.assign({}, prog, { tags: prog.tags || {} }));
    return ['// Schneider EcoStruxure Machine Expert (M241 / M251 / M262 / M580 with IEC): based on CODESYS,',
      '// so this Structured Text runs as it is. %IX / %QX are the controller\'s embedded I/O; with expansion',
      '// modules, map variables in the I/O mapping instead. M221 (Machine Expert Basic) has no ST: see the',
      '// brand table for its addresses (%I0.0, %Q0.0, %M0, %MW0, %TM0).', '', st].join('\n');
  }

  function toTIA(prog) {
    // only the tags the program uses, with unique names
    const used = new Set(LL.usedAddrs(prog)); (prog.blocks || []).forEach((bk) => LL.usedAddrs({ rungs: bk.rungs }).forEach((a) => used.add(a)));
    const tags = {}, seenN = {};
    Object.keys(prog.tags || {}).filter((a) => used.has(a)).forEach((a) => { let nm = san(prog.tags[a]) || a.replace(/\./g, '_'); if (seenN[nm]) nm += '_' + a.replace(/\./g, '_'); seenN[nm] = 1; tags[a] = nm; });
    let st = LL.toST(Object.assign({}, prog, { tags }));
    const main = st.split('\n\n(* ═════ Function blocks ═════ *)');
    const { decl, body } = splitDecl(main[0]);
    const inst = {};
    decl.forEach((l) => { const m = /^\s*(\w+)\s*:\s*(\w+);/.exec(l); if (m) inst[m[1]] = m[2]; });
    const quoteNames = new Set(Object.values(tags));
    // apply a replacement only to the code, never inside (* comments *)
    const codeOnly = (txt, fn) => txt.split(/(\(\*[\s\S]*?\*\))/).map((part, i) => (i % 2 ? part : fn(part))).join('');
    let b = body;
    b = b.replace(/%IX(\d+)\.(\d)/g, '%I$1.$2').replace(/%QX(\d+)\.(\d)/g, '%Q$1.$2').replace(/%MX(\d+)\.(\d)/g, '%M$1.$2');
    b = codeOnly(b, (code) => { let c2 = code;
    Object.keys(inst).forEach((k) => {
      const t = inst[k];
      if (/^(TON|TOF|TP|TONR|CTU|CTD)$/.test(t)) c2 = c2.replace(new RegExp('(^|\\n)(\\s*)' + k + '\\(', 'g'), '$1$2"' + k + '".' + t + '(');
      else c2 = c2.replace(new RegExp('(^|[^".#\\w])' + k + '\\(', 'g'), '$1"' + k + '"(');
      c2 = c2.replace(new RegExp('(^|[^".#\\w])' + k + '\\.', 'g'), '$1"' + k + '".');
    });
    quoteNames.forEach((nm) => { c2 = c2.replace(new RegExp('(^|[^".#\\w%])' + nm + '(?![\\w"])', 'g'), '$1"' + nm + '"'); });
    c2 = c2.replace(/\bFirstScan\b/g, '"FirstScan"').replace(/\bClock_1Hz\b/g, '"Clock_1Hz"');
    // a servo axis is a technology object in TIA Portal
    c2 = c2.replace(/\bAX(\d)\.(ON|HOMED|ERR|MOVING|POS|VEL)\b/g, (m, n, f) => ({ ON: '"AX' + n + '".StatusBits.Enable', HOMED: '"AX' + n + '".StatusBits.HomingDone', ERR: '"AX' + n + '".StatusBits.Error', MOVING: 'NOT "AX' + n + '".StatusBits.StandStill', POS: '"AX' + n + '".ActualPosition', VEL: '"AX' + n + '".ActualVelocity' })[f]).replace(/(^|[^"\w])(AX\d)\b/g, '$1"$2"');
    return c2; });
    b = b.replace(/END_IF(?!;)/g, 'END_IF;');
    const out = ['// Siemens TIA Portal: SCL (Structured Control Language) for an S7-1200 / S7-1500 block, e.g. OB1 or an FB.',
      '// Create in the PLC tag table: ' + (Object.keys(tags).length ? Object.keys(tags).map((a) => '"' + tags[a] + '" = %' + a.replace(/^AIW/, 'IW').replace(/^AQW/, 'QW')).join(', ') : 'the addresses used below') + '.'];
    const td = Object.keys(inst);
    if (td.length) out.push('// Create these instance data blocks (or multi-instances in an FB): ' + td.map((k) => '"' + k + '" : ' + (/^(TON|TOF|TP|TONR)$/.test(inst[k]) ? 'IEC_TIMER' : /^(CTU|CTD)$/.test(inst[k]) ? 'IEC_COUNTER' : inst[k])).join(', ') + '.');
    if (/"FirstScan"/.test(b)) out.push('// "FirstScan": the first-cycle bit of the system memory byte (Device configuration → System and clock memory), or use OB100.');
    if (/"Clock_1Hz"/.test(b)) out.push('// "Clock_1Hz": bit 5 of the clock memory byte (Device configuration → System and clock memory).');
    if (/R_TRIG\(|F_TRIG\(/.test(b)) out.push('// Edges: TIA needs an R_TRIG / F_TRIG instance per edge ("R_TRIG_DB"(CLK := …); then "R_TRIG_DB".Q), or the P_TRIG / N_TRIG edge-flag instructions.');
    out.push('');
    out.push(b);
    if (main[1]) {
      let fbs = main[1];
      fbs = fbs.replace(/\nFUNCTION_BLOCK (\w+)/g, '\nFUNCTION_BLOCK "$1"').replace(/\nFUNCTION (\w+) : BOOL/g, '\nFUNCTION "$1" : Void');
      // inside a block TIA writes its own variables with #, and the code starts after BEGIN
      fbs = fbs.split(/\n(?=FUNCTION)/).map((sec) => {
        const names = []; sec.replace(/^\s+(\w+)\s*:\s*\w+;/gm, (m, n) => names.push(n));
        const i = sec.lastIndexOf('END_VAR');
        if (i < 0) return sec;
        let head = sec.slice(0, i + 7), code = sec.slice(i + 7);
        names.forEach((n) => { code = code.replace(new RegExp('(^|[^".#\\w])' + n + '(?!\\w)', 'g'), '$1#' + n); });
        code = code.replace(/END_IF(?!;)/g, 'END_IF;');
        return head + '\nBEGIN' + code;
      }).join('\n');
      out.push('');
      out.push('// ═════ Blocks (an SCL source file: Program blocks → External source files → Generate blocks) ═════');
      out.push(fbs);
    }
    return out.join('\n');
  }

  // ── Omron CX-Programmer (CP1 / CJ) mnemonics ──
  function omAddr(a) {
    let m;
    if (a === 'SM0.0') return 'P_On';
    if (a === 'SM0.1') return 'A200.11';
    if (a === 'SM0.5') return 'P_1s';
    if ((m = RE.bit.exec(a))) { const ch = m[1] === 'I' ? +m[2] : m[1] === 'Q' ? 100 + +m[2] : +m[2]; return (m[1] === 'M' ? 'W' : '') + ch + '.' + String(m[3]).padStart(2, '0'); }
    if ((m = RE.tBit.exec(a))) return 'T' + String(m[1]).padStart(4, '0');
    if ((m = RE.cBit.exec(a))) return 'C' + String(m[1]).padStart(4, '0');
    if ((m = RE.tWord.exec(a))) return 'T' + String(m[1]).padStart(4, '0') + (m[2] === 'ET' ? '' : ' (preset)');
    if ((m = RE.cWord.exec(a))) return 'C' + String(m[1]).padStart(4, '0');
    if ((m = RE.mw.exec(a)) || (m = RE.md.exec(a))) return 'D' + m[1];
    if ((m = RE.aiw.exec(a))) return 'AIN' + m[1];
    if ((m = RE.aqw.exec(a))) return 'AOUT' + m[1];
    if (RE.int.test(a)) return '#' + a;
    return a;
  }
  function toOmronCX(prog) {
    const out = ['// Omron CX-Programmer (CP1 / CJ series): mnemonic list. Type it in the mnemonic view, or read it against',
      '// the ladder. Inputs CIO 0.00 …, outputs CIO 100.00 …, work bits W, data words D, timers TIM (0.1 s units),',
      '// counters CNT (they count DOWN from the set value). @LD = rising edge, %LD = falling edge.', ''];
    const LOGIC = new Set(['NO', 'NC', 'P', 'N', 'CMP', 'NOT', 'WIRE']);
    if ((prog.blocks || []).length) out.push('// This program uses blocks: in CX-Programmer they become function blocks (FB) drawn in ladder or ST; the main program is listed here.', '');
    prog.rungs.forEach((rung, ri) => {
      const R = rung.rows, C = rung.cols;
      let cur = new Array(R).fill({ t: 'true' });
      const AND = (a, b) => (!a || !b ? null : a.t === 'true' ? b : b.t === 'true' ? a : { t: 'and', items: [].concat(a.t === 'and' ? a.items : [a], b.t === 'and' ? b.items : [b]) });
      const OR = (xs) => { xs = xs.filter(Boolean); if (!xs.length) return null; if (xs.some((x) => x.t === 'true')) return { t: 'true' }; const uniq = []; const seen = new Set(); xs.forEach((x) => { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); uniq.push(x); } }); return uniq.length === 1 ? uniq[0] : { t: 'or', items: [].concat(...uniq.map((x) => (x.t === 'or' ? x.items : [x]))) }; };
      for (let c = 0; c < C - 1; c++) {
        const next = [];
        for (let r = 0; r < R; r++) {
          const cell = rung.cells[r][c];
          let e = null;
          if (cell && LOGIC.has(cell.type)) {
            if (cell.type === 'WIRE') e = cur[r];
            else if (cell.type === 'NOT') e = cur[r] ? { t: 'not', x: cur[r] } : null;
            else if (cell.type === 'CMP') e = AND(cur[r], { t: 'v', op: { '==': '=', '<>': '<>', '>': '>', '>=': '>=', '<': '<', '<=': '<=' }[cell.op], a: omAddr(cell.a), b: omAddr(cell.b) });
            else e = AND(cur[r], { t: 'v', pre: cell.type === 'NC' ? 'NOT' : cell.type === 'P' ? '@' : cell.type === 'N' ? '%' : '', s: omAddr(cell.addr) });
          }
          next.push(e);
        }
        let r = 0;
        while (r < R) { const s = r; while (r < R - 1 && rung.links[r][c + 1]) r++; if (r > s) { const g = OR(next.slice(s, r + 1)); for (let k = s; k <= r; k++) next[k] = g; } r++; }
        cur = next;
      }
      const lines = [];
      const leaf = (n, first) => {
        if (n.op) return (first ? 'LD' : 'AND') + n.op + ' ' + n.a + ' ' + n.b;
        if (n.pre === 'NOT') return (first ? 'LD NOT ' : 'AND NOT ') + n.s;
        return n.pre + (first ? 'LD ' : 'AND ') + n.s;
      };
      const orLeaf = (n) => (n.op ? 'OR' + n.op + ' ' + n.a + ' ' + n.b : n.pre === 'NOT' ? 'OR NOT ' + n.s : n.pre + 'OR ' + n.s);
      const block = (n) => {
        if (n.t === 'true') { lines.push('LD P_On'); return; }
        if (n.t === 'v') { lines.push(leaf(n, true)); return; }
        if (n.t === 'not') { block(n.x); lines.push('NOT'); return; }
        if (n.t === 'and') n.items.forEach((it, i) => { if (i === 0) block(it); else if (it.t === 'v') lines.push(leaf(it, false)); else { block(it); lines.push('AND LD'); } });
        if (n.t === 'or') n.items.forEach((it, i) => { if (i === 0) block(it); else if (it.t === 'v') lines.push(orLeaf(it)); else { block(it); lines.push('OR LD'); } });
      };
      out.push('// Rung ' + (ri + 1) + (rung.comment ? ': ' + rung.comment : ''));
      for (let r = 0; r < R; r++) {
        const cell = rung.cells[r][C - 1];
        if (!cell || !cur[r] || LOGIC.has(cell.type)) continue;
        block(cur[r]);
        const T = cell.type, A = omAddr(cell.addr || '');
        const nT = (a) => String(+(/\d+/.exec(a) || [0])[0]).padStart(4, '0');
        switch (T) {
          case 'COIL': lines.push('OUT ' + A); break;
          case 'NCOIL': lines.push('OUT NOT ' + A); break;
          case 'SET': lines.push('SET ' + A); break;
          case 'RST': lines.push(/^[TC]\d/.test(cell.addr) ? 'CNR(545) ' + A + ' ' + A : 'RSET ' + A); break;
          case 'TON': lines.push('TIM ' + nT(cell.addr) + ' #' + Math.max(1, Math.round(cell.pt / 100))); break;
          case 'TOF': lines.push('// TOF: no TIM type for it on CP1: NOT of the input into a TIM, or TOF in Sysmac'); lines.push('TIM ' + nT(cell.addr) + ' #' + Math.max(1, Math.round(cell.pt / 100))); break;
          case 'TP': lines.push('// TP: make a pulse with DIFU + KEEP + TIM'); lines.push('TIM ' + nT(cell.addr) + ' #' + Math.max(1, Math.round(cell.pt / 100))); break;
          case 'RTO': lines.push('TTIM(087) ' + nT(cell.addr) + ' #' + Math.max(1, Math.round(cell.pt / 100)) + '   // accumulative timer'); break;
          case 'CTU': case 'CTD': lines.push('LD P_Off   // reset input of the counter (use CNR elsewhere)'); lines.push('CNT ' + nT(cell.addr) + ' #' + cell.pv + (T === 'CTU' ? '   // counts DOWN from ' + cell.pv + ': done at 0' : '')); break;
          case 'MOV': lines.push('MOV(021) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst)); break;
          case 'ADD': lines.push('+(400) ' + omAddr(cell.a) + ' ' + omAddr(cell.b) + ' ' + omAddr(cell.dst)); break;
          case 'SUB': lines.push('-(410) ' + omAddr(cell.a) + ' ' + omAddr(cell.b) + ' ' + omAddr(cell.dst)); break;
          case 'MUL': lines.push('*(420) ' + omAddr(cell.a) + ' ' + omAddr(cell.b) + ' ' + omAddr(cell.dst)); break;
          case 'DIV': case 'MOD': lines.push('/(430) ' + omAddr(cell.a) + ' ' + omAddr(cell.b) + ' ' + omAddr(cell.dst) + (T === 'MOD' ? '   // the remainder is in the next word (D+1)' : '')); break;
          case 'SHL': case 'SHR': lines.push((T === 'SHL' ? 'ASL(025) ' : 'ASR(026) ') + omAddr(cell.dst) + '   // one bit per execution: repeat ' + cell.b + ' times or use NASL / NASR'); break;
          case 'SHRB': lines.push('SFT(010) ' + omAddr(cell.addr).replace(/\.\d+$/, '') + ' ' + omAddr(cell.addr).replace(/\.\d+$/, '') + '   // data and reset inputs before it'); break;
          case 'CALL': lines.push('// CALL ' + cell.block + ': place the FB instance ' + (cell.inst || '') + ' in the ladder'); break;
          case 'PID': lines.push('PIDAT(191) ' + omAddr(cell.a) + ' D100 ' + omAddr(cell.dst) + '   // set point and gains in the parameter words D100 …'); break;
          default: lines.push('// ' + T + ': use the motion / positioning instructions of the unit (e.g. PLS2, ACC on CP1)');
        }
      }
      out.push(...lines, '');
    });
    return out.join('\n');
  }

  LL.toTIA = toTIA;
  LL.toTwinCAT = (p) => toTwinCAT(p, false);
  LL.toSysmac = (p) => toTwinCAT(p, true);
  LL.toMachineExpert = toMachineExpert;
  LL.toOmronCX = toOmronCX;
})(typeof window !== 'undefined' ? window : globalThis);
