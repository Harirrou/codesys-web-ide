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
  const OUTPUT = ['COIL', 'NCOIL', 'SET', 'RST', 'TON', 'TOF', 'TP', 'RTO', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'];
  const TIMERS = ['TON', 'TOF', 'TP', 'RTO'];
  const COUNTERS = ['CTU', 'CTD'];
  const MATH = ['ADD', 'SUB', 'MUL', 'DIV'];
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
  };
  const norm = (s) => String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g, '');
  const isBitAddr = (a) => RE.bit.test(a) || RE.sm.test(a) || RE.tBit.test(a) || RE.cBit.test(a);
  const isWordAddr = (a) => RE.tWord.test(a) || RE.cWord.test(a) || RE.mw.test(a) || RE.aiw.test(a) || RE.aqw.test(a) || RE.int.test(a);
  const isWritableWord = (a) => RE.mw.test(a) || RE.aqw.test(a);
  const isWritableBit = (a) => /^[QM]\d{1,2}\.[0-7]$/.test(a);
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
    return c;
  }
  function cloneCell(c) { const n = Object.assign({}, c); n.id = UID++; return n; }

  const CMP_OPS = ['==', '<>', '>', '>=', '<', '<='];
  function parseCmp(s) {
    const m = /^(.+?)(==|=|<>|!=|>=|<=|>|<)(.+)$/.exec(norm(s));
    if (!m) return null;
    let op = m[2];
    if (op === '=') op = '==';
    if (op === '!=') op = '<>';
    return { a: m[1], op, b: m[3] };
  }

  // Token → cell (or special markers)
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
      case 'ADD': case 'SUB': case 'MUL': case 'DIV':
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
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': return c.type + '(' + c.a + ',' + c.b + ',' + c.dst + ')';
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
    const prog = { name: 'Untitled', cols: opts.cols || 7, tags: {}, rungs: [] };
    let cur = null;
    const flush = () => { if (cur) { prog.rungs.push(parseRung(cur.lines.length ? cur.lines : [''], prog.cols, cur.comment)); cur = null; } };
    const lines = String(text).replace(/\r/g, '').split('\n');
    for (let raw of lines) {
      const line = raw.replace(/\s+;.*$/, '').trim();
      if (!line || line.startsWith('#')) continue;
      let m;
      if ((m = /^NAME\s+(.*)$/i.exec(line))) { prog.name = m[1].trim(); continue; }
      if ((m = /^COLS\s+(\d+)$/i.exec(line))) { prog.cols = Math.max(4, Math.min(12, +m[1])); continue; }
      if ((m = /^TAG\s+(\S+)\s+(.+)$/i.exec(line))) { prog.tags[norm(m[1])] = m[2].trim(); continue; }
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
    return out.join('\n');
  }

  function cloneProgram(p) { return parseProgram(programToText(p)); }

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
      this.trace = prog.rungs.map((r) => ({
        pin: r.cells.map((row) => row.map(() => 0)),
        pout: r.cells.map((row) => row.map(() => 0)),
        node: r.cells.map(() => new Array(r.cols + 1).fill(0)),
      }));
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
      this.scanCount = 0;
      this.time = 0;
      this.phase = 0;
      this.load(this.prog);
    }

    setInputs(obj) { for (const k in obj) this.inputs[k] = RE.aiw.test(k) ? Math.round(+obj[k] || 0) : obj[k] ? 1 : 0; }

    counter(n) {
      let c = this.counters[n];
      if (!c) {
        const mode = this.cMode[n] || 'up';
        c = this.counters[n] = { cv: 0, pv: 0, mode, init: false };
      }
      return c;
    }
    timer(n) { return this.timers[n] || (this.timers[n] = { type: '', pt: 0, et: 0, q: 0, tt: 0, en: 0, prevIn: 0 }); }

    bit(a) {
      if (!a) return 0;
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
      if (RE.int.test(a)) return parseInt(a, 10);
      if (RE.mw.test(a) || RE.aiw.test(a) || RE.aqw.test(a)) return this.words[a] | 0;
      if ((m = RE.tWord.exec(a))) { const t = this.timers[+m[1]]; return t ? (m[2] === 'ET' ? t.et : t.pt) : 0; }
      if ((m = RE.cWord.exec(a))) { const c = this.counters[+m[1]]; return c ? (m[2] === 'CV' ? c.cv : c.pv) : 0; }
      return 0;
    }
    setBit(a, v) { if (isWritableBit(a)) this.bits[a] = v ? 1 : 0; }
    setWord(a, v) {
      if (!isWritableWord(a)) return;
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
          const v = this.bit(cell.addr), prev = this.edges[cell.id] || 0;
          this.edges[cell.id] = v;
          return p && v && !prev ? 1 : 0;
        }
        case 'N': {
          const v = this.bit(cell.addr), prev = this.edges[cell.id] || 0;
          this.edges[cell.id] = v;
          return p && !v && prev ? 1 : 0;
        }
        case 'NOT': return p ? 0 : 1;
        case 'CMP': return p && this.compare(cell.a, cell.op, cell.b) ? 1 : 0;
      }
      return 0;
    }

    resetAddr(a) {
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
          const t = this.timer(timerNo(cell.addr));
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
          const c = this.counter(counterNo(cell.addr));
          c.pv = cell.pv;
          if (!c.init) { c.init = true; if (c.mode === 'down') c.cv = c.pv; }
          const prev = this.edges[cell.id] || 0;
          this.edges[cell.id] = p;
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
      }
    }

    evalRung(i, dt) {
      const rung = this.prog.rungs[i], tr = this.trace[i];
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
    const issues = [];
    const coils = {}, timers = {}, ctr = {};
    prog.rungs.forEach((rung, i) => {
      const n = i + 1;
      let hasOut = false, hasAny = false;
      rung.cells.forEach((row, r) => row.forEach((c, col) => {
        if (!c) return;
        hasAny = true;
        if (isOutput(c.type)) hasOut = true;
        const need = ['NO', 'NC', 'P', 'N', 'COIL', 'NCOIL', 'SET', 'RST'];
        if (need.includes(c.type)) {
          if (!c.addr) issues.push({ level: 'error', rung: n, msg: c.type + ' has no address.' });
          else if (!isBitAddr(c.addr) && !(c.type === 'RST' && isWritableWord(c.addr)))
            issues.push({ level: 'error', rung: n, msg: '"' + c.addr + '" is not a valid bit address.' });
        }
        if (['COIL', 'NCOIL', 'SET'].includes(c.type) && c.addr && !isWritableBit(c.addr))
          issues.push({ level: 'error', rung: n, msg: 'Cannot write to ' + c.addr + '. Coils drive outputs (Q) or memory bits (M) only.' });
        if (['COIL', 'NCOIL'].includes(c.type) && c.addr) (coils[c.addr] = coils[c.addr] || []).push(n);
        if (TIMERS.includes(c.type)) {
          if (!RE.tBit.test(c.addr) || /\./.test(c.addr)) issues.push({ level: 'error', rung: n, msg: c.type + ' needs a timer name like T0.' });
          (timers[c.addr] = timers[c.addr] || []).push(n);
          if (!(c.pt > 0)) issues.push({ level: 'error', rung: n, msg: c.addr + ' needs a preset time above zero.' });
        }
        if (COUNTERS.includes(c.type)) {
          if (!RE.cBit.test(c.addr) || /\./.test(c.addr)) issues.push({ level: 'error', rung: n, msg: c.type + ' needs a counter name like C0.' });
          (ctr[c.addr + c.type] = ctr[c.addr + c.type] || []).push(n);
        }
        if (c.type === 'CMP') {
          if (!isWordAddr(c.a) || !isWordAddr(c.b)) issues.push({ level: 'error', rung: n, msg: 'Compare needs numbers or words (MW0, T0.ET, C0.CV).' });
        }
        if (c.type === 'MOV' && (!isWordAddr(c.src) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: 'MOV copies a number or word into an MW or AQW word.' });
        if (MATH.includes(c.type) && (!isWordAddr(c.a) || !isWordAddr(c.b) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: c.type + ' needs two operands and an MW or AQW destination.' });
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
            case 'NO': e = AND(cur[r], V(stName(cell.addr, tags))); break;
            case 'NC': e = AND(cur[r], { t: 'not', x: V(stName(cell.addr, tags)) }); break;
            case 'P': used.edges++; e = AND(cur[r], V('R_TRIG(' + stName(cell.addr, tags) + ')')); break;
            case 'N': used.edges++; e = AND(cur[r], V('F_TRIG(' + stName(cell.addr, tags) + ')')); break;
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
            used.timers[cell.addr] = cell.type === 'RTO' ? 'TONR' : cell.type;
            out.push(cell.addr + '(IN := ' + e + ', PT := T#' + fmtDuration(cell.pt) + ');'); break;
          case 'CTU': used.counters[cell.addr] = 'CTU'; out.push(cell.addr + '(CU := ' + e + ', PV := ' + cell.pv + ');'); break;
          case 'CTD': used.counters[cell.addr] = used.counters[cell.addr] || 'CTD'; out.push(cell.addr + '(CD := ' + e + ', PV := ' + cell.pv + ');'); break;
          case 'MOV': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + n(cell.src) + '; END_IF'); break;
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
    decl.push('END_VAR');
    return (decl.length > 2 ? decl.join('\n') + '\n\n' : '') + out.join('\n');
  }

  // collect addresses used in a program
  function usedAddrs(prog) {
    const s = new Set();
    prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => {
      if (!c) return;
      ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { if (c[k] && !RE.int.test(c[k])) s.add(c[k]); });
    })));
    return s;
  }

  Object.assign(LL, {
    LOGIC, OUTPUT, TIMERS, COUNTERS, MATH, CMP_OPS, RE,
    isOutput, isLogic, isBitAddr, isWordAddr, isWritableBit, isWritableWord, norm,
    parseDuration, fmtDuration, mkCell, cloneCell, emptyRung,
    parseRung, rungToLines, parseProgram, programToText, cloneProgram, parseToken, cellToken,
    Machine, lint, toST, stName, usedAddrs,
  });
})(typeof window !== 'undefined' ? window : globalThis);
