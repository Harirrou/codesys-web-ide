/* PLC Start — PLC ladder engine
 * Parses a compact text format, runs scans like a real PLC (read inputs →
 * solve rungs top-to-bottom → write outputs), records power flow for the
 * view, lints common mistakes and translates rungs to Structured Text.
 * Works in the browser (window.LL) and in Node (globalThis.LL) for tests.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  // Small signs used inside text and on buttons by every module: drawn once here, never as emoji
  // (an emoji looks different on every phone and breaks the look of a technical drawing).
  // the name and the version of the app: one place (the Android build reads the version from this line)
  LL.APP = { name: 'PLC Start', version: '1.5.0' };
  LL.SYM = {
    warn: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 21.5 20h-19z"/><path d="M12 10v4.5M12 17.4v.1"/></svg>',
    bolt: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 2.5 5 13.5h6l-1.5 8L18.5 10h-6z"/></svg>',
    user: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5c1.2-4 4-5.8 7.5-5.8s6.3 1.8 7.5 5.8"/></svg>',
    sound: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
    hold: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v9M7.5 7.5 12 12l4.5-4.5"/><path d="M5 16h14v4H5z"/></svg>',
    bug: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="13.5" rx="4.5" ry="6"/><path d="M9.5 7.8a2.6 2.6 0 0 1 5 0M12 8v11M3.5 13.5h4M16.5 13.5h4M5 7.5l3 2.4M19 7.5l-3 2.4M5 20l3-2.6M19 20l-3-2.6"/></svg>',
    wrench: '<svg class="sym" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 6.2a4.2 4.2 0 0 0 5.3 5.3L21 12.7 12.7 21l-2.2-2.2 6.3-6.3M14.5 6.2 9.3 11.4 3 17.7 6.3 21"/><path d="M14.5 6.2 17 3.8"/></svg>',
  };

  // ───────────────────────── element catalogue ─────────────────────────
  const LOGIC = ['WIRE', 'NO', 'NC', 'P', 'N', 'NOT', 'CMP', 'LIM'];
  const OUTPUT = ['COIL', 'NCOIL', 'SET', 'RST', 'TON', 'TOF', 'TP', 'RTO', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'SHRB', 'CALL', 'PID', 'MC_POWER', 'MC_HOME', 'MC_ABS', 'MC_REL', 'MC_JOG', 'MC_STOP', 'MC_RESET', 'MC_SETPOS', 'SMOV', 'CONCAT', 'ITOS', 'SMID', 'WAND', 'WOR', 'WXOR', 'WNOT', 'I_BCD', 'BCD_I', 'CONV', 'ROUND', 'TRUNC', 'NORM_X', 'SCALE_X', 'JMP', 'LBL', 'MCR', 'FFL', 'FFU', 'LFU'];
  // program flow (jump to a label, MCR zone) and queues (FIFO / LIFO in a word table: MWn = count, MWn+1 … = data)
  const FLOW_OPS = ['JMP', 'LBL', 'MCR'], FIFO_OPS = ['FFL', 'FFU', 'LFU'];
  // word logic (16 bits), BCD conversion and REAL (floating point) instructions
  const WORDLOGIC = ['WAND', 'WOR', 'WXOR', 'WNOT'];
  const BCD_OPS = ['I_BCD', 'BCD_I'];
  const REAL_OPS = ['CONV', 'ROUND', 'TRUNC', 'NORM_X', 'SCALE_X'];
  const STRING_OPS = ['SMOV', 'CONCAT', 'ITOS', 'SMID'];
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
    str: /^(STR\d{1,2}|ISTR\d|QSTR\d)$/,
    dbf: /^DB(\d{1,3})\.([A-Z_]\w*)(?:\[(-?\d{1,4}|MW\d{1,3}|#\w+)\])?$/,
    strLit: /^'[^']*'$/,
    int: /^-?\d+$/,
    // MW10.3 = bit 3 of the word MW10 (bit 0 = least significant), MR0 … MR99 = REAL memory,
    // 12.5 = REAL literal, 16#047F / 2#0000_0101 / 8#17 = hex / binary / octal integer literals
    mwBit: /^MW(\d{1,3})\.(1[0-5]|[0-9])$/,
    mr: /^MR(\d{1,2})$/,
    real: /^-?\d+\.\d+$/,
    hexbin: /^(16#[0-9A-F][0-9A-F_]*|2#[01][01_]*|8#[0-7][0-7_]*)$/,
    loc:/^#[A-Za-z_]\w*(?:\.(Q|DN|TT|EN|ET|PT|CV|PV))?$/,
    locBase: /^#[A-Za-z_]\w*$/,
  };
  const norm = (s) => { const t = String(s == null ? '' : s).trim().replace(/\s+/g, ''); if (t[0] === '#') { const i = t.indexOf('.'); return i < 0 ? t : t.slice(0, i) + t.slice(i).toUpperCase(); } return t.toUpperCase(); };
  const isBitAddr = (a) => dbType(a) === 'BOOL' || RE.bit.test(a) || RE.sm.test(a) || RE.tBit.test(a) || RE.cBit.test(a) || RE.loc.test(a) || RE.axBit.test(a) || RE.mc.test(a) || RE.mwBit.test(a);
  const isWordAddr = (a) => dbType(a) === 'INT' || dbType(a) === 'DINT' || RE.tWord.test(a) || RE.cWord.test(a) || RE.mw.test(a) || RE.md.test(a) || RE.hc.test(a) || RE.axWord.test(a) || RE.aiw.test(a) || RE.aqw.test(a) || RE.int.test(a) || RE.loc.test(a) || RE.hexbin.test(a) || RE.mr.test(a) || RE.real.test(a);
  const isWritableWord = (a) => dbType(a) === 'INT' || dbType(a) === 'DINT' || RE.mw.test(a) || RE.md.test(a) || RE.aqw.test(a) || RE.locBase.test(a) || RE.mr.test(a);
  // REAL (floating point): MR0 … MR99 and literals with a decimal point (12.5)
  const isRealAddr = (a) => RE.mr.test(a || '') || RE.real.test(a || '');
  const isNumLit = (a) => RE.int.test(a) || RE.hexbin.test(a) || RE.real.test(a);
  // the IEC type of a number operand: INT, DINT or REAL
  const numType = (a) => (isRealAddr(a) ? 'REAL' : RE.md.test(a) || RE.hc.test(a) || dbType(a) === 'DINT' ? 'DINT' : 'INT');
  // 16#047F, 2#0000_0101, 8#17 → value; a 16-bit pattern (16#8000 … 16#FFFF) reads as a negative INT, like the word holds it
  const litInt = (a) => { const m = /^(16|8|2)#(.+)$/.exec(a); if (!m) return parseInt(a, 10); let v = parseInt(m[2].replace(/_/g, ''), +m[1]); if (v > 32767 && v <= 65535) v -= 65536; return v; };
  // REAL → integer the way TIA CONV / ROUND and Logix MOV do it: to the nearest, x.5 to the even number
  const roundEven = (x) => { const f = Math.floor(x), d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); };
  // a REAL for people: always a decimal point, at most `dec` decimals (12 → 12.0, 0.51234 → 0.512)
  const fmtReal = (v, dec) => { v = +v || 0; if (!isFinite(v)) return String(v); let s = v.toFixed(dec == null ? 3 : dec).replace(/0+$/, ''); if (s.endsWith('.')) s += '0'; return s === '-0.0' ? '0.0' : s; };
  const hex4 = (v) => '16#' + ((v | 0) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
  // data blocks: DB10.LENGTH or DB10.LENGTH[2] / [MW30]; the type comes from the DB declaration in use
  LL._dbs = [];
  const dbField = (a) => {
    const m = RE.dbf.exec(a || '');
    if (!m) return null;
    const db = (LL._dbs || []).find((d) => d.num === +m[1]);
    const f = db && db.fields.find((x) => x.name.toUpperCase() === m[2]);
    return { m, db, f, idx: m[3] };
  };
  const dbType = (a) => { const d = dbField(a); return d && d.f ? d.f.type : null; };
  const isStrAddr = (a) => RE.str.test(a) || RE.strLit.test(a) || dbType(a) === 'STRING';
  const isWritableStr = (a) => /^(STR\d{1,2}|QSTR\d)$/.test(a) || dbType(a) === 'STRING';
  const isWritableBit = (a) => dbType(a) === 'BOOL' || /^[QM]\d{1,2}\.[0-7]$/.test(a) || RE.locBase.test(a) || RE.mwBit.test(a);
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
    if (type === 'LIM') { c.a = c.a == null ? '0' : c.a; c.src = c.src || 'MW0'; c.b = c.b == null ? '100' : c.b; }
    if (WORDLOGIC.includes(type)) { c.a = c.a || 'MW0'; if (type !== 'WNOT') c.b = c.b == null ? '16#00FF' : c.b; c.dst = c.dst || 'MW2'; }
    if (BCD_OPS.includes(type) || ['CONV', 'ROUND', 'TRUNC'].includes(type)) { c.src = c.src || (BCD_OPS.includes(type) ? 'MW0' : 'MR0'); c.dst = c.dst || 'MW2'; }
    if (type === 'NORM_X') { c.a = c.a == null ? '0' : c.a; c.src = c.src || 'AIW0'; c.b = c.b == null ? '27648' : c.b; c.dst = c.dst || 'MR0'; }
    if (type === 'SCALE_X') { c.a = c.a == null ? '0.0' : c.a; c.src = c.src || 'MR0'; c.b = c.b == null ? '100.0' : c.b; c.dst = c.dst || 'MR1'; }
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
      case 'SMOV': return mkCell(t, { src: norm(args[0] || "''"), dst: norm(args[1] || 'STR0') });
      case 'CONCAT': return mkCell(t, { a: norm(args[0] || 'STR0'), b: norm(args[1] || 'STR1'), dst: norm(args[2] || 'STR2') });
      case 'ITOS': return mkCell(t, { a: norm(args[0] || 'MW0'), n: parseInt(args[1] || '4', 10), dst: norm(args[2] || 'STR0') });
      case 'SMID': return mkCell(t, { src: norm(args[0] || 'ISTR0'), a: norm(args[1] || '1'), b: norm(args[2] || '4'), dst: norm(args[3] || 'STR0') });
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
      // LIM(lo,x,hi) · NORM_X(min,value,max,dst) · SCALE_X(min,value,max,dst): lo/min → a, x/value → src, hi/max → b
      case 'LIM': return mkCell(t, { a: norm(args[0] || '0'), src: norm(args[1] || 'MW0'), b: norm(args[2] || '100') });
      case 'NORM_X': case 'SCALE_X': return mkCell(t, { a: norm(args[0]), src: norm(args[1]), b: norm(args[2]), dst: norm(args[3]) });
      case 'WAND': case 'WOR': case 'WXOR': return mkCell(t, { a: norm(args[0]), b: norm(args[1]), dst: norm(args[2]) });
      case 'WNOT': return mkCell(t, { a: norm(args[0]), dst: norm(args[1]) });
      case 'I_BCD': case 'BCD_I': case 'CONV': case 'ROUND': case 'TRUNC': return mkCell(t, { src: norm(args[0]), dst: norm(args[1]) });
      case 'JMP': case 'LBL': return mkCell(t, { addr: String(args[0] || 'L1').trim().toUpperCase() });
      case 'MCR': return mkCell(t, {});
      case 'FFL': return mkCell(t, { src: norm(args[0] || 'MW10'), dst: norm(args[1] || 'MW100'), n: parseInt(args[2] || '8', 10) });
      case 'FFU': case 'LFU': return mkCell(t, { src: norm(args[0] || 'MW100'), n: parseInt(args[1] || '8', 10), dst: norm(args[2] || 'MW12') });
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
      case 'SMOV': return 'SMOV(' + c.src + ',' + c.dst + ')';
      case 'CONCAT': return 'CONCAT(' + c.a + ',' + c.b + ',' + c.dst + ')';
      case 'ITOS': return 'ITOS(' + c.a + ',' + c.n + ',' + c.dst + ')';
      case 'SMID': return 'SMID(' + c.src + ',' + c.a + ',' + c.b + ',' + c.dst + ')';
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
      case 'LIM': return 'LIM(' + c.a + ',' + c.src + ',' + c.b + ')';
      case 'NORM_X': case 'SCALE_X': return c.type + '(' + c.a + ',' + c.src + ',' + c.b + ',' + c.dst + ')';
      case 'WAND': case 'WOR': case 'WXOR': return c.type + '(' + c.a + ',' + c.b + ',' + c.dst + ')';
      case 'WNOT': return 'WNOT(' + c.a + ',' + c.dst + ')';
      case 'I_BCD': case 'BCD_I': case 'CONV': case 'ROUND': case 'TRUNC': return c.type + '(' + c.src + ',' + c.dst + ')';
      case 'FFL': return 'FFL(' + c.src + ',' + c.dst + ',' + c.n + ')';
      case 'FFU': case 'LFU': return c.type + '(' + c.src + ',' + c.n + ',' + c.dst + ')';
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
    const prog = { name: 'Untitled', cols: opts.cols || 7, tags: {}, rungs: [], blocks: [], dbs: [] };
    let cur = null, blk = null, dbx = null;
    const flush = () => { if (cur) { (blk ? blk.rungs : prog.rungs).push(parseRung(cur.lines.length ? cur.lines : [''], prog.cols, cur.comment)); cur = null; } };
    const lines = String(text).replace(/\r/g, '').split('\n');
    for (let raw of lines) {
      const line = raw.replace(/\s+;.*$/, '').trim();
      if (!line || line.startsWith('#')) continue;
      let m;
      if ((m = /^NAME\s+(.*)$/i.exec(line))) { prog.name = m[1].trim(); continue; }
      if ((m = /^COLS\s+(\d+)$/i.exec(line))) { prog.cols = Math.max(4, Math.min(12, +m[1])); continue; }
      if ((m = /^TAG\s+(\S+)\s+(.+)$/i.exec(line))) { prog.tags[norm(m[1])] = m[2].trim(); continue; }
      if ((m = /^DB\s+(\d{1,3})\s+([A-Za-z_]\w*)\s*(.*)$/i.exec(line))) { flush(); blk = null; dbx = { num: +m[1], name: m[2], comment: m[3].trim(), fields: [] }; prog.dbs.push(dbx); continue; }
      if (dbx && (m = /^FIELD\s+([A-Za-z_]\w*)\s+(BOOL|INT|DINT|STRING)(?:\[(-?\d+)\.\.(-?\d+)\])?\s*(\S*)\s*(.*)$/i.exec(line))) {
        const lo = m[3] == null ? null : +m[3], hi = m[4] == null ? null : +m[4];
        dbx.fields.push({ name: m[1], type: m[2].toUpperCase(), lo, hi, init: m[5] && m[5] !== '-' ? m[5].split(',') : [], comment: m[6].trim() });
        continue;
      }
      if ((m = /^(BLOCK|FB|FC)\s+([A-Za-z_]\w*)\s*(.*)$/i.exec(line))) { flush(); dbx = null; blk = { name: m[2], kind: m[1].toUpperCase() === 'FC' ? 'FC' : 'FB', comment: m[3].trim(), params: [], rungs: [] }; prog.blocks.push(blk); continue; }
      if (blk && !cur && (m = /^PARAM\s+(IN|OUT|INOUT)\s+([A-Za-z_]\w*)\s*(BOOL|INT)?\s*(.*)$/i.exec(line))) { blk.params.push({ dir: m[1].toUpperCase(), name: m[2], type: (m[3] || 'BOOL').toUpperCase(), comment: m[4].trim() }); continue; }
      if ((m = /^RUNG\b\s*(.*)$/i.exec(line))) { flush(); dbx = null; cur = { comment: m[1].trim(), lines: [] }; continue; }
      if (!cur) cur = { comment: '', lines: [] };
      cur.lines.push(line);
    }
    flush();
    LL._dbs = prog.dbs;
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
    (prog.dbs || []).forEach((d) => {
      out.push('DB ' + d.num + ' ' + d.name + (d.comment ? ' ' + d.comment : ''));
      d.fields.forEach((f) => out.push('FIELD ' + f.name + ' ' + f.type + (f.lo != null ? '[' + f.lo + '..' + f.hi + ']' : '') + ' ' + (f.init && f.init.length ? f.init.join(',') : '-') + (f.comment ? ' ' + f.comment : '')));
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
      LL._dbs = prog.dbs || [];
      // Counter modes: a counter that has any CTU counts up (done at CV ≥ PV),
      // a counter that only has CTD starts at PV and is done at CV ≤ 0.
      this.cMode = {};
      prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => {
        if (!c) return;
        if (c.type === 'CTU') this.cMode[counterNo(c.addr)] = 'up';
        if (c.type === 'CTD' && this.cMode[counterNo(c.addr)] !== 'up') this.cMode[counterNo(c.addr)] = 'down';
      })));
      this.trace = prog.rungs.map(mkTrace);
      this.rungLbl = prog.rungs.map((r) => r.cells.map((row) => row[r.cols - 1]).filter((c) => c && c.type === 'LBL').map((c) => c.addr));
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
      this.strs = {};
      // data blocks start with their start values (like a fresh download)
      this.dbv = {};
      (this.prog && this.prog.dbs || []).forEach((d) => d.fields.forEach((f) => {
        const conv = (v) => (f.type === 'STRING' ? String(v == null ? '' : v).replace(/^'|'$/g, '') : f.type === 'BOOL' ? (/^(1|TRUE)$/i.test(String(v)) ? 1 : 0) : Math.trunc(+v || 0));
        const key = 'DB' + d.num + '.' + f.name.toUpperCase();
        if (f.lo == null) this.dbv[key] = conv(f.init[0]);
        else for (let k = f.lo; k <= f.hi; k++) this.dbv[key + '[' + k + ']'] = conv(f.init[k - f.lo]);
      }));
      this.instances = {};
      this.ctx = null;
      this.scanCount = 0;
      this.time = 0;
      this.phase = 0;
      this.error = null;            // a reset takes the PLC out of STOP
      this.load(this.prog);
    }

    str(a) { a = this.res(a); if (RE.dbf.test(a)) { const k = this.dbKey(a); return k ? String(this.dbv[k] == null ? '' : this.dbv[k]) : ''; } if (RE.strLit.test(a)) return a.slice(1, -1); if (/^ISTR/.test(a)) return String(this.inputs[a] == null ? '' : this.inputs[a]); return (this.strs || {})[a] || ''; }
    setStr(a, v) { a = this.res(a); if (RE.dbf.test(a)) { const k = this.dbKey(a); if (k) this.dbv[k] = String(v).slice(0, 80); return; } if (isWritableStr(a)) { this.strs = this.strs || {}; this.strs[a] = String(v).slice(0, 80); } }
    setInputs(obj) { this.hmiPrev = this.hmiPrev || {}; for (const k in obj) if (/^ISTR\d$/.test(k)) this.inputs[k] = String(obj[k] == null ? '' : obj[k]); for (const k in obj) if (/^M\d{1,2}\.[0-7]$/.test(k)) { const v = obj[k] ? 1 : 0; if (this.hmiPrev[k] !== v) { this.bits[k] = v; this.hmiPrev[k] = v; } } for (const k in obj) if (!/^M\d/.test(k) && !/^ISTR/.test(k)) this.inputs[k] = RE.aiw.test(k) || RE.hc.test(k) ? Math.round(+obj[k] || 0) : obj[k] ? 1 : 0; for (const n in this.axes) if (this.inputs['AX' + n + '.FAULT'] && !this.axes[n].err) { const ax = this.axes[n]; ax.err = 1; ax.msg = 'the drive reports a fault (overload / following error)'; if (ax.cmd) this.mcFinish(ax, false, ax.msg); } }

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
    // resolve a data-block address to its storage key; an index outside the array stops the PLC, as on a real one
    dbKey(a) {
      const d = dbField(a);
      if (!d || !d.f) { this.error = 'Unknown data-block field ' + a + '.'; return null; }
      const key = 'DB' + d.db.num + '.' + d.f.name.toUpperCase();
      if (d.f.lo == null) return key;
      let i = d.idx == null ? null : RE.int.test(d.idx) ? +d.idx : this.word(d.idx);
      if (i == null || i < d.f.lo || i > d.f.hi) { this.error = 'Array index out of range: ' + a + (d.idx && !RE.int.test(d.idx) ? ' with ' + d.idx + ' = ' + i : '') + ' (allowed ' + d.f.lo + ' … ' + d.f.hi + '). A real PLC stops here or calls its error routine.'; return null; }
      return key + '[' + i + ']';
    }
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
      if (RE.dbf.test(a)) { const k = this.dbKey(a); return k ? (this.dbv[k] ? 1 : 0) : 0; }
      if (a === 'TRUE' || a === '1') return 1;
      if (a[0] === '@') {
        const [base, f] = a.split('.');
        const t = this.timers[base]; if (t) return f === 'TT' ? t.tt : f === 'EN' ? t.en : t.q;
        const c = this.counters[base]; if (c) return c.mode === 'down' ? (c.cv <= 0 ? 1 : 0) : (c.pv > 0 && c.cv >= c.pv ? 1 : 0);
        return this.bits[a] ? 1 : 0;
      }
      let m;
      if (RE.bit.test(a) || RE.sm.test(a)) return this.bits[a] ? 1 : 0;
      if ((m = RE.mwBit.exec(a))) return ((this.words['MW' + m[1]] | 0) >> +m[2]) & 1;   // bit of a word
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
      if (RE.dbf.test(a)) { const k = this.dbKey(a); return k ? +this.dbv[k] || 0 : 0; }
      if (RE.int.test(a)) return parseInt(a, 10);
      if (RE.real.test(a)) return parseFloat(a);
      if (RE.hexbin.test(a)) return litInt(a);
      if (RE.mr.test(a)) return +this.words[a] || 0;
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
    setBit(a, v) {
      a = this.res(a); if (RE.dbf.test(a)) { const k = this.dbKey(a); if (k) this.dbv[k] = v ? 1 : 0; return; }
      const mb = RE.mwBit.exec(a || '');
      if (mb) { const k = 'MW' + mb[1], bit = 1 << +mb[2]; let w = (this.words[k] | 0) & 0xffff; w = v ? w | bit : w & ~bit; this.words[k] = w > 32767 ? w - 65536 : w; return; }   // writes one bit, the other 15 stay
      if (a && a[0] === '@') this.bits[a] = v ? 1 : 0; else if (isWritableBit(a)) this.bits[a] = v ? 1 : 0;
    }
    setWord(a, v) {
      a = this.res(a);
      if (RE.dbf.test(a)) { const k = this.dbKey(a); if (k) { const dint = dbType(a) === 'DINT'; v = Math.trunc(v); const hi = dint ? 2147483647 : 32767; this.dbv[k] = Math.max(-hi - 1, Math.min(hi, v)); } return; }
      if (!(a && a[0] === '@') && !isWritableWord(a)) return;
      if (RE.mr.test(a)) { v = +v; this.words[a] = isFinite(v) ? Math.max(-3.4e38, Math.min(3.4e38, v)) : 0; return; }   // REAL keeps its decimals
      v = Math.trunc(v);
      const big = RE.md.test(a), hi = big ? 2147483647 : 32767, lo = big ? -2147483648 : -32768;   // MD = 32-bit double word (DINT)
      if (v > hi) v = hi; if (v < lo) v = lo;
      this.words[a] = v;
    }

    compare(a, op, b) {
      if (isStrAddr(this.res(a) || '') || isStrAddr(this.res(b) || '')) { const x = this.str(a), y = this.str(b); return op === '==' ? x === y : op === '<>' ? x !== y : op === '>' ? x > y : op === '>=' ? x >= y : op === '<' ? x < y : x <= y; }
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
        case 'LIM': return p && this.inRange(cell) ? 1 : 0;
      }
      return 0;
    }
    // LIM(lo,x,hi): lo ≤ x ≤ hi (TIA IN_RANGE, Rockwell LIM with lo ≤ hi)
    inRange(cell) { const x = this.word(cell.src); return this.word(cell.a) <= x && x <= this.word(cell.b); }

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
        case 'JMP': if (p) this.jmp = cell.addr; break;          // the rungs down to LBL are not scanned (see evalRung)
        case 'LBL': break;
        case 'MCR':                                              // first MCR opens a zone (off when its rung is false), the next one closes it
          if (!this.mcrZone) { this.mcrZone = true; this.mcrOff = !p; } else { this.mcrZone = false; this.mcrOff = false; }
          break;
        case 'FFL': case 'FFU': case 'LFU': { const k = 'ff:' + this.ek(cell.id), prev = this.edges[k] || 0; this.edges[k] = p ? 1 : 0; if (p && !prev) this.fifoOp(cell); break; }
        case 'MOV': if (p) this.setWord(cell.dst, this.word(cell.src)); break;
        case 'SMOV': if (p) this.setStr(cell.dst, this.str(cell.src)); break;
        case 'CONCAT': if (p) this.setStr(cell.dst, this.str(cell.a) + this.str(cell.b)); break;
        case 'ITOS': if (p) { const v = Math.trunc(this.word(cell.a)), neg = v < 0; let t = String(Math.abs(v)); while (t.length < cell.n) t = '0' + t; this.setStr(cell.dst, (neg ? '-' : '') + t); } break;
        case 'SMID': if (p) { const st0 = Math.max(1, this.word(cell.a)), ln = Math.max(0, this.word(cell.b)); this.setStr(cell.dst, this.str(cell.src).substr(st0 - 1, ln)); } break;
        case 'ADD': if (p) this.setWord(cell.dst, this.word(cell.a) + this.word(cell.b)); break;
        case 'SUB': if (p) this.setWord(cell.dst, this.word(cell.a) - this.word(cell.b)); break;
        case 'MUL': if (p) this.setWord(cell.dst, this.word(cell.a) * this.word(cell.b)); break;
        case 'DIV': if (p) { const d = this.word(cell.b); if (d === 0) { this.error = this.error || 'Division by zero: DIV(' + cell.a + ',' + cell.b + ',' + cell.dst + ') with ' + cell.b + ' = 0. A real PLC stops or logs a fault here (CODESYS: exception, Studio 5000: math overflow fault, TIA: ENO = FALSE). Check the divisor first.'; break; } const q = this.word(cell.a) / d; this.setWord(cell.dst, isRealAddr(this.res(cell.a)) || isRealAddr(this.res(cell.b)) ? q : Math.trunc(q)); } break;   // INT ÷ INT = INT (7 / 2 = 3), even into a REAL
        case 'MOD': if (p) { const d = this.word(cell.b); this.setWord(cell.dst, d === 0 ? 0 : this.word(cell.a) % d); } break;
        case 'SHL': case 'SHR': if (p) { const n = Math.max(0, Math.min(16, this.word(cell.b))); const x = this.word(cell.a) & 0xffff; let v = (cell.type === 'SHL' ? x << n : x >>> n) & 0xffff; if (v > 32767) v -= 65536; this.setWord(cell.dst, v); } break;
        case 'SHRB': if (p) {
          const bits = shiftBits(this.res(cell.addr), Math.abs(cell.n)), d = this.bit(cell.src);
          if (!bits) break;
          if (cell.n > 0) { for (let k = bits.length - 1; k > 0; k--) this.bits[bits[k]] = this.bits[bits[k - 1]] ? 1 : 0; this.bits[bits[0]] = d; }
          else { for (let k = 0; k < bits.length - 1; k++) this.bits[bits[k]] = this.bits[bits[k + 1]] ? 1 : 0; this.bits[bits[bits.length - 1]] = d; }
        } break;
        case 'CALL': if (p) this.callBlock(cell, dt); break;
        // word logic on the 16 bits of a word
        case 'WAND': case 'WOR': case 'WXOR': case 'WNOT': if (p) {
          const x = this.word(cell.a) & 0xffff, y = cell.type === 'WNOT' ? 0 : this.word(cell.b) & 0xffff;
          let v = (cell.type === 'WAND' ? x & y : cell.type === 'WOR' ? x | y : cell.type === 'WXOR' ? x ^ y : ~x) & 0xffff;
          this.setWord(cell.dst, v > 32767 ? v - 65536 : v);
        } break;
        // BCD: every 4 bits hold one decimal digit, 1234 ↔ 16#1234. Outside 0 … 9999 or a bad digit: no write (TIA: ENO = FALSE)
        case 'I_BCD': if (p) { const v = Math.trunc(this.word(cell.src)); if (v >= 0 && v <= 9999) { const b = (Math.floor(v / 1000) << 12) | ((Math.floor(v / 100) % 10) << 8) | ((Math.floor(v / 10) % 10) << 4) | (v % 10); this.setWord(cell.dst, b > 32767 ? b - 65536 : b); } } break;
        case 'BCD_I': if (p) { const w = this.word(cell.src) & 0xffff, d = [12, 8, 4, 0].map((s) => (w >> s) & 15); if (d.every((x) => x <= 9)) this.setWord(cell.dst, d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3]); } break;
        // REAL conversions. CONV REAL → integer rounds to the nearest (x.5 to even, like TIA CONV); integer → REAL is exact
        case 'CONV': case 'ROUND': if (p) { const v = this.word(cell.src); this.setWord(cell.dst, isRealAddr(this.res(cell.dst)) ? (cell.type === 'ROUND' ? roundEven(v) : v) : roundEven(v)); } break;
        case 'TRUNC': if (p) this.setWord(cell.dst, Math.trunc(this.word(cell.src))); break;
        case 'NORM_X': if (p) { const lo = this.word(cell.a), hi = this.word(cell.b); if (hi === lo) { this.error = this.error || 'NORM_X(' + cell.a + ',' + cell.src + ',' + cell.b + ',' + cell.dst + '): MIN and MAX are equal, so it would divide by zero.'; break; } this.setWord(cell.dst, (this.word(cell.src) - lo) / (hi - lo)); } break;
        case 'SCALE_X': if (p) { const lo = this.word(cell.a), hi = this.word(cell.b), v = this.word(cell.src) * (hi - lo) + lo; this.setWord(cell.dst, isRealAddr(this.res(cell.dst)) ? v : roundEven(v)); } break;
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

    evalRung(i, dt) {
      const tr = this.trace[i];
      if (this.jmp != null) {
        if ((this.rungLbl[i] || []).includes(this.jmp)) this.jmp = null;      // the jump lands here: this rung is scanned again
        else { tr.pin.forEach((row) => row.fill(0)); tr.pout.forEach((row) => row.fill(0)); tr.node.forEach((row) => row.fill(0)); tr.skip = 1; return; }   // not scanned: its outputs keep their state
      }
      tr.skip = 0;
      return this.evalRungOf(this.prog.rungs[i], tr, dt);
    }
    // FIFO / LIFO in a word table: MWn holds the count, MWn+1 … MWn+size the data (oldest first)
    fifoOp(cell) {
      const T = cell.type, tbl = T === 'FFL' ? cell.dst : cell.src, m = /^MW(\d+)$/.exec(this.res(tbl) || '');
      if (!m) { this.error = this.error || T + ': the table must be a memory word like MW100 (MW100 = count, MW101 … = data).'; return; }
      const b = +m[1], n = Math.max(1, Math.min(32, Math.abs(+cell.n) || 8)), cnt = Math.max(0, Math.min(n, this.word('MW' + b)));
      if (T === 'FFL') { if (cnt < n) { this.setWord('MW' + (b + 1 + cnt), this.word(cell.src)); this.setWord('MW' + b, cnt + 1); } return; }   // a full table refuses the load
      if (cnt === 0) return;                                                  // an empty table gives nothing
      if (T === 'FFU') { this.setWord(cell.dst, this.word('MW' + (b + 1))); for (let k = 1; k < cnt; k++) this.setWord('MW' + (b + k), this.word('MW' + (b + k + 1))); }
      else this.setWord(cell.dst, this.word('MW' + (b + cnt)));
      this.setWord('MW' + (b + cnt), 0); this.setWord('MW' + b, cnt - 1);
    }
    evalRungOf(rung, tr, dt) {
      const R = rung.rows, C = rung.cols;
      const rail = this.mcrOff ? 0 : 1;                           // inside an MCR zone that is off, every rung is solved as false
      let cur = new Array(R).fill(rail);
      for (let r = 0; r < R; r++) tr.node[r][0] = rail;
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
      this.jmp = null; this.mcrZone = false; this.mcrOff = false;
      this.bits['SM0.0'] = 1;
      this.bits['SM0.1'] = this.scanCount === 0 ? 1 : 0;
      this.bits['SM0.5'] = (this.time % 1000) < 500 ? 1 : 0;
    }
    endScan(dt) {
      if (this.jmp != null) { this.error = this.error || 'JMP ' + this.jmp + ': there is no rung with LBL ' + this.jmp + ' below the jump. A real PLC goes to STOP or will not download this.'; this.jmp = null; }
      for (const n in this.axes) this.axisStep(+n, dt); this.scanCount++; this.time += dt;
    }

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
      for (const k in this.strs || {}) if (/^QSTR/.test(k)) o[k] = this.strs[k];
      return o;
    }
    read(a) { return isStrAddr(a) ? this.str(a) : isWordAddr(a) ? this.word(a) : this.bit(a); }
  }

  // ───────────────────────── lint ─────────────────────────
  function lint(prog) {
    const all = [];
    LL._dbs = prog.dbs || [];
    // data blocks: every DB address must name a declared field, with an index only for arrays
    const dbCheck = (rungs, where) => rungs.forEach((r, i) => r.cells.forEach((row) => row.forEach((c) => {
      if (!c) return;
      ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => {
        const v = c[k]; if (typeof v !== 'string' || !/^DB\d/.test(v)) return;
        const d = dbField(v), msg = (t) => all.push({ level: 'error', rung: i + 1, block: where || undefined, msg: t });
        if (!d) return msg('"' + v + '" is not a valid data-block address: write DB10.NAME or DB10.NAME[index].');
        if (!d.db) return msg('There is no DB ' + d.m[1] + ' in this program (add it with + DB).');
        if (!d.f) return msg('DB' + d.db.num + ' (' + d.db.name + ') has no field ' + d.m[2] + '.');
        if (d.f.lo != null && d.idx == null) return msg(v + ' is an array: give an index, e.g. ' + v + '[' + d.f.lo + '] or ' + v + '[MW30].');
        if (d.f.lo == null && d.idx != null) return msg(d.f.name + ' is not an array: remove the [ ].');
        if (d.idx != null && RE.int.test(d.idx) && (+d.idx < d.f.lo || +d.idx > d.f.hi)) msg('Index ' + d.idx + ' is outside ' + d.f.name + '[' + d.f.lo + '..' + d.f.hi + '].');
      });
    })));
    dbCheck(prog.rungs, '');
    (prog.blocks || []).forEach((b) => dbCheck(b.rungs, b.name));
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
  /* Checks for word bits, word logic, LIM, BCD and REAL. Type rules as in TIA Portal:
   * a REAL never goes into a whole-number word without CONV, ROUND or TRUNC. */
  function lintNew(c, n, issues) {
    const T = c.type;
    const err = (msg) => issues.push({ level: 'error', rung: n, msg });
    const warn = (msg) => issues.push({ level: 'warn', rung: n, msg });
    const R = (a) => isRealAddr(a || ''), num = (a) => isWordAddr(a || '');
    const litVal = (a) => (RE.real.test(a) ? parseFloat(a) : litInt(a));
    const MIS = 'type mismatch — use CONV, ROUND or TRUNC';
    if (['MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(T) && c.dst && isWritableWord(c.dst) && !R(c.dst)) {
      const r = (T === 'MOV' ? [c.src] : [c.a, c.b]).find(R);
      if (r) err(T + ': ' + MIS + '. ' + r + ' is a REAL (a number with decimals), but ' + c.dst + ' holds whole numbers only, so the decimals would be lost. TIA Portal refuses this too. Example: ROUND(' + r + ',' + c.dst + ').');
    }
    if (T === 'DIV' && R(c.dst) && num(c.a) && num(c.b) && !R(c.a) && !R(c.b)) warn('DIV of two whole numbers gives a whole number: 7 / 2 = 3, also into ' + c.dst + '. For 3.5, divide REAL values: CONV(' + c.a + ',MR…) first, or write 2.0.');
    if (['MOD', 'SHL', 'SHR'].includes(T) && [c.a, c.b, c.dst].some(R)) err(T + ' works on whole numbers (INT) only, not on REAL values (MRn, 1.5).');
    if (T === 'ITOS' && R(c.a)) err('ITOS turns a whole number into text. ' + c.a + ' is a REAL: ROUND or TRUNC it into a word first.');
    if (T === 'LIM') {
      if (![c.a, c.src, c.b].every(num)) err('LIM(low,value,high) needs three numbers or words, e.g. LIM(10,MW0,20): it passes power while 10 ≤ MW0 ≤ 20.');
      else if (isNumLit(c.a) && isNumLit(c.b) && litVal(c.a) > litVal(c.b)) warn('LIM: the low limit ' + c.a + ' is above the high limit ' + c.b + ', so it is never true here (like TIA IN_RANGE). Careful: Rockwell LIM then tests OUTSIDE the range.');
    }
    if (WORDLOGIC.includes(T)) {
      const ins = T === 'WNOT' ? [c.a] : [c.a, c.b];
      if (!ins.every(num) || !isWritableWord(c.dst || '')) err(T + ' needs ' + (T === 'WNOT' ? 'a word' : 'two words or numbers (MW10, 16#00FF, 2#0000_0101)') + ' and a word for the result (MW, MD, AQW).');
      else if (ins.concat(c.dst).some(R)) err(T + ' works on the 16 bits of a whole-number word. A REAL (MRn, 1.5) has no bits you can use like this.');
    }
    if (BCD_OPS.includes(T)) {
      if (!num(c.src) || !isWritableWord(c.dst || '')) err(T + ' needs a word or number and a word for the result, e.g. ' + T + '(MW10,MW12).');
      else if (R(c.src) || R(c.dst)) err(T + ' works on whole-number words (INT), not on REAL values.');
      else if (T === 'I_BCD' && isNumLit(c.src) && (litInt(c.src) < 0 || litInt(c.src) > 9999)) err('I_BCD: four BCD digits hold 0 … 9999 only.');
    }
    if (REAL_OPS.includes(T)) {
      const four = T === 'NORM_X' || T === 'SCALE_X';
      if (![c.a, c.src, c.b].slice(four ? 0 : 1, four ? 3 : 2).every(num) || !isWritableWord(c.dst || '')) { err(T + (four ? '(min,value,max,result)' : '(source,result)') + ' needs numbers or words, and a word for the result (MR, MW, MD, AQW).'); return; }
      if ((T === 'ROUND' || T === 'TRUNC') && !R(c.src)) warn(T + ': ' + c.src + ' is already a whole number, so there is nothing to ' + (T === 'ROUND' ? 'round' : 'cut off') + '. Use MOV.');
      if (T === 'CONV' && numType(c.src) === numType(c.dst)) warn('CONV: ' + c.src + ' and ' + c.dst + ' have the same type (' + numType(c.dst) + '), so nothing is converted. Use MOV.');
      if (T === 'NORM_X' && !R(c.dst)) err('NORM_X: ' + MIS + '. The result is 0.0 … 1.0, so it must go to a REAL (MR0 … MR99), not to ' + c.dst + '.');
      if (T === 'NORM_X' && isNumLit(c.a) && isNumLit(c.b) && litVal(c.a) === litVal(c.b)) err('NORM_X: MIN and MAX are the same, so it would divide by zero.');
      if (T === 'SCALE_X' && !R(c.src)) warn('SCALE_X expects a REAL value from 0.0 to 1.0 (for example the result of NORM_X), not the whole number ' + c.src + '.');
    }
  }
  function lintRungs(prog, rungs, blk, blocks) {
    const issues = [];
    const coils = {}, timers = {}, ctr = {};
    const mcrEnd = new Set();   // rungs whose MCR closes a zone: it needs no condition
    {
      // jumps, labels, MCR zones and queues
      const lbl = {}, jmps = []; let mcr = 0, mcrAt = 0;
      rungs.forEach((rung, i) => rung.cells.forEach((row) => row.forEach((c) => {
        if (!c) return; const n = i + 1;
        if (FLOW_OPS.includes(c.type) && blk) issues.push({ level: 'error', rung: n, msg: c.type + ' is only allowed in the main program here, not inside a block.' });
        if ((c.type === 'JMP' || c.type === 'LBL') && !/^L\d{1,2}$/.test(c.addr || '')) issues.push({ level: 'error', rung: n, msg: c.type + ' needs a label name like L1.' });
        if (c.type === 'LBL') { if (lbl[c.addr]) issues.push({ level: 'error', rung: n, msg: 'Label ' + c.addr + ' is used twice (rung ' + lbl[c.addr] + ' and here). A label must be unique.' }); else lbl[c.addr] = n; }
        if (c.type === 'JMP') jmps.push([c.addr, n]);
        if (c.type === 'MCR') { mcr++; mcrAt = n; if (mcr % 2 === 0) mcrEnd.add(n); }
        if (FIFO_OPS.includes(c.type)) {
          const tbl = c.type === 'FFL' ? c.dst : c.src, val = c.type === 'FFL' ? c.src : c.dst;
          if (!/^MW\d{1,4}$/.test(tbl || '')) issues.push({ level: 'error', rung: n, msg: c.type + ': the table must be a memory word like MW100. MW100 then holds the count and MW101 … the data.' });
          if (!(c.n >= 1 && c.n <= 32)) issues.push({ level: 'error', rung: n, msg: c.type + ': the size must be 1 … 32.' });
          if (c.type === 'FFL' ? !isWordAddr(val || '') : !isWritableWord(val || '')) issues.push({ level: 'error', rung: n, msg: c.type + (c.type === 'FFL' ? ': the value to load must be a word or a number.' : ': the value must go to a word like MW12.') });
        }
      })));
      jmps.forEach(([a, n]) => { if (!lbl[a]) issues.push({ level: 'error', rung: n, msg: 'JMP ' + a + ': there is no rung with LBL ' + a + '.' }); else if (lbl[a] <= n) issues.push({ level: 'error', rung: n, msg: 'JMP ' + a + ' jumps backwards (the label is in rung ' + lbl[a] + '). A loop that never ends stops a real PLC: put the label below the jump.' }); });
      if (mcr % 2) issues.push({ level: 'error', rung: mcrAt, msg: 'An MCR zone needs two MCR instructions: one starts the zone (with its condition), one ends it. There ' + (mcr === 1 ? 'is 1' : 'are ' + mcr) + '.' });
    }
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
        if (STRING_OPS.includes(c.type)) {
          const S = (x) => isStrAddr(x || '');
          if (!isWritableStr(c.dst || '')) issues.push({ level: 'error', rung: n, msg: c.type + ': the result must go to a string: STR0 … STR31, or QSTR0 (to a device such as a printer).' });
          if (c.type === 'SMOV' && !S(c.src)) issues.push({ level: 'error', rung: n, msg: "SMOV copies a string: STRn, ISTRn (from a device) or a text in quotes like 'ABC'." });
          if (c.type === 'CONCAT' && (!S(c.a) || !S(c.b))) issues.push({ level: 'error', rung: n, msg: 'CONCAT joins two strings (STRn, ISTRn or a text in quotes).' });
          if (c.type === 'ITOS' && (!isWordAddr(c.a) || !(c.n >= 0 && c.n <= 10))) issues.push({ level: 'error', rung: n, msg: 'ITOS turns a word into text: ITOS(MW10,4,STR1) gives 0007 for 7 (4 = number of digits, 0 = no leading zeros).' });
          if (c.type === 'SMID' && (!S(c.src) || !isWordAddr(c.a) || !isWordAddr(c.b))) issues.push({ level: 'error', rung: n, msg: 'SMID(source,start,length,destination): take part of a string, start counts from 1.' });
        }
        if (c.type === 'CMP' && (isStrAddr(c.a || '') || isStrAddr(c.b || ''))) {
          if (!isStrAddr(c.a || '') || !isStrAddr(c.b || '')) issues.push({ level: 'error', rung: n, msg: 'A string can only be compared with another string, e.g. CMP(STR0==ISTR1).' });
        } else if (c.type === 'CMP') {
          if (!isWordAddr(c.a) || !isWordAddr(c.b)) issues.push({ level: 'error', rung: n, msg: 'Compare needs numbers or words (MW0, T0.ET, C0.CV).' });
        }
        if (c.type === 'MOV' && (!isWordAddr(c.src) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: 'MOV copies a number or word into an MW, MD or AQW word.' });
        if (MATH.includes(c.type) && (!isWordAddr(c.a) || !isWordAddr(c.b) || !isWritableWord(c.dst))) issues.push({ level: 'error', rung: n, msg: c.type + ' needs two operands and an MW, MD or AQW destination.' });
        lintNew(c, n, issues, blk);
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
        if (c.type === 'LBL' || (c.type === 'MCR' && mcrEnd.has(n))) continue;   // a label and the end of an MCR zone stand alone on their rung
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
    { const d = dbField(a); if (d && d.db && d.f) return d.db.name + '.' + d.f.name + (d.idx != null ? '[' + (RE.int.test(d.idx) ? d.idx : stName(d.idx, tags)) + ']' : ''); }
    if (a === 'SM0.0') return 'TRUE';
    if (a === 'SM0.1') return 'FirstScan';
    if (a === 'SM0.5') return 'Clock_1Hz';
    let m;
    if ((m = RE.tBit.exec(a))) return 'T' + m[1] + '.Q';
    if ((m = RE.cBit.exec(a))) return 'C' + m[1] + '.Q';
    if ((m = RE.tWord.exec(a))) return 'T' + m[1] + '.' + m[2];
    if ((m = RE.cWord.exec(a))) return 'C' + m[1] + '.' + m[2];
    if (RE.int.test(a) || RE.real.test(a) || RE.hexbin.test(a)) return a;
    if ((m = RE.mwBit.exec(a))) return stName('MW' + m[1], tags) + '.' + m[2];   // bit access on a word: CODESYS / TwinCAT wVar.3
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
  /* ST for word logic, BCD and REAL instructions, and for MOV / maths with a REAL operand.
   * dia 'tia' = TIA Portal SCL: it has NORM_X, SCALE_X and ROUND, and SHR has named inputs.
   * Returns true when it wrote the cell. */
  function newST(cell, e, out, n, dia, brand, zoneEnd) {
    const T = cell.type, R = isRealAddr;
    const conv = (s, from, to) => (from === to ? s : from + '_TO_' + to + '(' + s + ')');
    const asReal = (a) => (R(a) ? n(a) : isNumLit(a) ? litInt(a) + '.0' : conv(n(a), numType(a), 'REAL'));
    const put = (dst, expr, note) => out.push('IF ' + e + ' THEN ' + n(dst) + ' := ' + expr + ';' + (note ? '   (* ' + note + ' *)' : '') + ' END_IF');
    if (T === 'JMP') {
      // Sysmac Studio ST has no jump statement: only the note, no code
      if (brand === 'sysmac') out.push('(* JMP ' + cell.addr + ': Sysmac ST has no jump. Put the rungs from here down to the label ' + cell.addr + ' inside IF NOT (' + e + ') THEN … END_IF *)');
      else out.push('IF ' + e + ' THEN ' + (dia === 'tia' ? 'GOTO ' : 'JMP ') + cell.addr + '; END_IF   (* better: put the skipped code inside IF NOT (' + e + ') THEN … END_IF *)');
      return true;
    }
    if (T === 'LBL') { out.push(brand === 'sysmac' ? '(* label ' + cell.addr + ': the part that the jump skips ends here *)' : cell.addr + ':   (* the jump lands here *)'); return true; }
    if (T === 'MCR') {
      out.push(zoneEnd ? '(* MCR: end of the zone *)' : '(* MCR: zone start. ST has no MCR: write the rungs of the zone inside IF ' + e + ' THEN … ELSE <outputs of the zone> := FALSE; END_IF *)');
      return true;
    }
    if (FIFO_OPS.includes(T)) {
      const tbl = T === 'FFL' ? cell.dst : cell.src, cnt = n(tbl), sz = cell.n;
      out.push('(* ' + T + ' on a rising edge of: ' + e + '. Table ' + tbl + ': ' + cnt + ' = count, the next ' + sz + ' words = data. In ST use an ARRAY[1..' + sz + '] OF INT and a count: *)');
      if (T === 'FFL') out.push('(*   IF edge AND Count < ' + sz + ' THEN Count := Count + 1; Data[Count] := ' + n(cell.src) + '; END_IF *)');
      else if (T === 'FFU') out.push('(*   IF edge AND Count > 0 THEN ' + n(cell.dst) + ' := Data[1]; FOR i := 1 TO Count - 1 DO Data[i] := Data[i + 1]; END_FOR; Count := Count - 1; END_IF *)');
      else out.push('(*   IF edge AND Count > 0 THEN ' + n(cell.dst) + ' := Data[Count]; Count := Count - 1; END_IF *)');
      return true;
    }
    if (T === 'MOV' && R(cell.dst) && !R(cell.src)) { put(cell.dst, asReal(cell.src)); return true; }
    if (['ADD', 'SUB', 'MUL', 'DIV'].includes(T) && (R(cell.a) || R(cell.b) || R(cell.dst))) {
      const op = { ADD: '+', SUB: '-', MUL: '*', DIV: '/' }[T];
      if (R(cell.a) || R(cell.b)) put(cell.dst, asReal(cell.a) + ' ' + op + ' ' + asReal(cell.b));
      else put(cell.dst, conv(n(cell.a) + ' ' + op + ' ' + n(cell.b), numType(cell.a) === 'DINT' || numType(cell.b) === 'DINT' ? 'DINT' : 'INT', 'REAL'), T === 'DIV' ? 'whole-number division first: 7 / 2 = 3' : '');
      return true;
    }
    if (WORDLOGIC.includes(T)) { put(cell.dst, T === 'WNOT' ? 'NOT ' + n(cell.a) : n(cell.a) + ' ' + { WAND: 'AND', WOR: 'OR', WXOR: 'XOR' }[T] + ' ' + n(cell.b), 'bit by bit, on all 16 bits'); return true; }
    if (T === 'I_BCD') {
      const s = n(cell.src);
      put(cell.dst, '(' + s + ' / 1000) * 4096 + (' + s + ' / 100 MOD 10) * 256 + (' + s + ' / 10 MOD 10) * 16 + ' + s + ' MOD 10', 'INT → BCD, 1234 → 16#1234: every digit takes 4 bits (4096 = 16#1000)' + (dia === 'tia' ? '. LAD: CONV Int → Bcd16' : ''));
      return true;
    }
    if (T === 'BCD_I') {
      const w = 'INT_TO_WORD(' + n(cell.src) + ')';
      const dig = (sh) => 'WORD_TO_INT(' + (sh ? (dia === 'tia' ? 'SHR(IN := ' + w + ', N := ' + sh + ')' : 'SHR(' + w + ', ' + sh + ')') : w) + ' AND 16#F)';
      out.push('IF ' + e + ' THEN   (* BCD → INT, 16#1234 → 1234: every 4 bits hold one decimal digit' + (dia === 'tia' ? '. LAD: CONV Bcd16 → Int' : '') + ' *)');
      out.push('  ' + n(cell.dst) + ' := ' + dig(12) + ' * 1000 + ' + dig(8) + ' * 100');
      out.push('    + ' + dig(4) + ' * 10 + ' + dig(0) + ';');
      out.push('END_IF');
      return true;
    }
    if (T === 'CONV') {
      const f = numType(cell.src), t = numType(cell.dst);
      put(cell.dst, isNumLit(cell.src) && t === 'REAL' ? asReal(cell.src) : conv(n(cell.src), f, t), f === 'REAL' && t !== 'REAL' ? 'REAL → whole number: rounds to the nearest' : '');
      return true;
    }
    if (T === 'ROUND' || T === 'TRUNC') {
      const f = numType(cell.src), t = numType(cell.dst), s = n(cell.src);
      let x;
      if (f !== 'REAL') x = conv(s, f, t);
      else if (T === 'ROUND') x = t === 'REAL' ? 'DINT_TO_REAL(REAL_TO_DINT(' + s + '))' : dia === 'tia' ? 'ROUND(' + s + ')' : 'REAL_TO_' + t + '(' + s + ')';
      else x = t === 'REAL' ? 'DINT_TO_REAL(TRUNC(' + s + '))' : dia !== 'tia' && t === 'INT' ? 'TRUNC_INT(' + s + ')' : 'TRUNC(' + s + ')';
      put(cell.dst, x, T === 'ROUND' ? 'to the nearest whole number' : 'cut off the decimals: 2.9 → 2, -2.9 → -2');
      return true;
    }
    if (T === 'NORM_X' || T === 'SCALE_X') {
      const t = numType(cell.dst);
      if (dia === 'tia') { put(cell.dst, T + '(MIN := ' + n(cell.a) + ', VALUE := ' + n(cell.src) + ', MAX := ' + n(cell.b) + ')'); return true; }
      const lo = asReal(cell.a), hi = asReal(cell.b), v = asReal(cell.src);
      const x = T === 'NORM_X' ? '(' + v + ' - ' + lo + ') / (' + hi + ' - ' + lo + ')' : v + ' * (' + hi + ' - ' + lo + ') + ' + lo;
      put(cell.dst, t === 'REAL' ? x : 'REAL_TO_' + t + '(' + x + ')', T === 'NORM_X' ? 'NORM_X: 0.0 at MIN, 1.0 at MAX' : 'SCALE_X: 0.0 gives MIN, 1.0 gives MAX');
      return true;
    }
    return false;
  }
  function toST(prog) {
    const tags = prog.tags || {};
    const out = ['(* ' + prog.name + ' — Structured Text equivalent generated from the ladder *)'];
    const used = { timers: {}, counters: {}, edges: 0 };
    const dia = prog._dialect, brand = prog._brand, tia = dia === 'tia', sys = brand === 'sysmac';
    const fbT = new Set();
    // which timers and counters this program (or block) has: T0 → TON, C0 → CTU / CTD / CTUD (counted up and down)
    const tType = {}, cKind = {};
    prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => {
      if (!c || !c.addr) return;
      if (TIMERS.includes(c.type)) tType[c.addr] = c.type;
      if (COUNTERS.includes(c.type)) cKind[c.addr] = cKind[c.addr] && cKind[c.addr] !== c.type ? 'CTUD' : c.type;
      if ((TIMERS.includes(c.type) || COUNTERS.includes(c.type)) && c.addr[0] === '#') fbT.add(c.addr);
    })));
    const iname = (a) => (a[0] === '#' ? a.slice(1) : a);                       // the instance: T0, C0, Delay
    const rtoType = tia ? 'TONR' : sys ? 'AccumulationTimer' : 'FB_RTO';       // only TIA has a retentive timer called TONR
    // a bit of a word. Sysmac has no Word.3 on an INT: test and write the bit with a mask
    const sysBit = (a) => { const m = sys ? RE.mwBit.exec(a || '') : null; return m ? { w: stName('MW' + m[1], tags), mask: 'WORD#' + hex4(1 << +m[2]), inv: 'WORD#' + hex4(~(1 << +m[2])) } : null; };
    const sname = (a) => {
      const sb = sysBit(a);
      if (sb) return '((INT_TO_WORD(' + sb.w + ') AND ' + sb.mask + ') <> WORD#16#0000)';
      const m = /^(#?[A-Za-z_]\w*)\.(Q|DN)$/.exec(a || '');                    // the done bit, written with its field
      if (m && (tType[m[1]] || cKind[m[1]])) return iname(m[1]) + (cKind[m[1]] === 'CTUD' ? '.QU' : '.Q');
      return stName(a, tags);
    };
    const nm = (a) => (cKind[a] === 'CTUD' ? iname(a) + '.QU' : fbT.has(a) ? a.slice(1) + '.Q' : sname(a));
    // pass 1: the Boolean result in front of every output, so that a reset rung can go to the reset input of its timer or counter
    const curs = prog.rungs.map((rung) => {
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
            case 'LIM': { const x = stName(cell.src, tags); e = AND(cur[r], V('(' + stName(cell.a, tags) + ' <= ' + x + ' AND ' + x + ' <= ' + stName(cell.b, tags) + ')')); break; }
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
      return cur;
    });
    // the resets of timers and counters, and the count inputs of an up / down counter, by instance
    const resets = {}, cu = {}, cd = {}, cFirst = {};
    const orAll = (xs) => (xs.length === 1 ? xs[0] : xs.map((x) => (/ (AND|OR) /.test(x) ? '(' + x + ')' : x)).join(' OR '));
    prog.rungs.forEach((rung, i) => {
      for (let r = 0; r < rung.rows; r++) {
        const cell = rung.cells[r][rung.cols - 1];
        if (!cell || !cell.addr) continue;
        const e = pr(curs[i][r]);
        if (cell.type === 'RST' && (tType[cell.addr] || cKind[cell.addr])) (resets[cell.addr] = resets[cell.addr] || []).push(e);
        if (cell.type === 'CTU') (cu[cell.addr] = cu[cell.addr] || []).push(e);
        if (cell.type === 'CTD') (cd[cell.addr] = cd[cell.addr] || []).push(e);
        if (COUNTERS.includes(cell.type) && !cFirst[cell.addr]) cFirst[cell.addr] = cell;
      }
    });
    const RSTIN = tia ? 'R' : 'RESET', LOADIN = tia ? 'LD' : 'LOAD';
    let zoneOpen = false;                                                      // MCR: the first one opens the zone, the next one closes it
    // pass 2: the text
    prog.rungs.forEach((rung, i) => {
      const R = rung.rows, C = rung.cols, cur = curs[i];
      out.push('');
      out.push('(* Rung ' + (i + 1) + (rung.comment ? ': ' + rung.comment : '') + ' *)');
      for (let r = 0; r < R; r++) {
        const cell = rung.cells[r][C - 1];
        if (!cell) continue;
        const e = pr(cur[r]);
        const n = sname;
        const zEnd = cell.type === 'MCR' && zoneOpen;
        if (cell.type === 'MCR') zoneOpen = !zoneOpen;
        if (newST(cell, e, out, n, dia, brand, zEnd)) continue;   // word logic, BCD, REAL
        const sb = ['COIL', 'NCOIL', 'SET', 'RST'].includes(cell.type) ? sysBit(cell.addr) : null;
        if (sb) {   // Sysmac: write one bit of an INT with OR (bit on) and AND (bit off)
          const on = sb.w + ' := WORD_TO_INT(INT_TO_WORD(' + sb.w + ') OR ' + sb.mask + ');', off = sb.w + ' := WORD_TO_INT(INT_TO_WORD(' + sb.w + ') AND ' + sb.inv + ');';
          const note = '   (* bit ' + cell.addr.split('.')[1] + ' of ' + sb.w + ': Sysmac has no Word.3 on an INT *)';
          if (cell.type === 'COIL') out.push('IF ' + e + ' THEN ' + on + ' ELSE ' + off + ' END_IF' + note);
          else if (cell.type === 'NCOIL') out.push('IF ' + e + ' THEN ' + off + ' ELSE ' + on + ' END_IF' + note);
          else out.push('IF ' + e + ' THEN ' + (cell.type === 'SET' ? on : off) + ' END_IF' + note);
          continue;
        }
        switch (cell.type) {
          case 'COIL': out.push(n(cell.addr) + ' := ' + e + ';'); break;
          case 'NCOIL': out.push(n(cell.addr) + ' := NOT (' + e + ');'); break;
          case 'SET': out.push('IF ' + e + ' THEN ' + n(cell.addr) + ' := TRUE; END_IF'); break;
          case 'RST': {
            const a = cell.addr, tt = tType[a], ck = cKind[a], nme = iname(a);
            if (tt === 'RTO') out.push('(* reset of the retentive timer ' + nme + ': it is the ' + (tia ? 'R' : sys ? 'Reset' : 'RESET') + ' input of its call *)');
            else if (tt && tia) out.push('IF ' + e + ' THEN RESET_TIMER(' + nme + '); END_IF  (* reset timer *)');
            else if (tt === 'TON') out.push('IF ' + e + ' THEN ' + nme + '(IN := FALSE); END_IF  (* reset timer: a call with IN = FALSE clears a TON *)');
            else if (tt) out.push('(* reset of ' + nme + ': the IEC ' + tt + ' block has no reset input. If you need it, stop its IN input with: AND NOT (' + e + ') *)');
            else if (ck) out.push('(* reset of the counter ' + nme + ': it is the ' + (ck === 'CTD' ? LOADIN + ' input (load PV)' : RSTIN + ' input') + ' of its call *)');
            else if (RE.tBit.test(a) || RE.cBit.test(a)) out.push('(* reset of ' + a + ': this ' + (a[0] === 'T' ? 'timer' : 'counter') + ' is not called here. Reset it where it is called, with the reset input of its call *)');
            else out.push('IF ' + e + ' THEN ' + n(a) + ' := FALSE; END_IF');
            break;
          }
          case 'TON': case 'TOF': case 'TP': case 'RTO': {
            const nme = iname(cell.addr), pt = 'T#' + fmtDuration(cell.pt), rs = resets[cell.addr];
            if (cell.addr[0] !== '#') used.timers[cell.addr] = cell.type === 'RTO' ? rtoType : cell.type;
            if (cell.type !== 'RTO') { out.push(nme + '(IN := ' + e + ', PT := ' + pt + ');'); break; }
            // retentive timer: TONR in TIA, AccumulationTimer in Sysmac, your own block (FB_RTO, printed at the end) in CODESYS / TwinCAT
            if (tia) out.push(nme + '(IN := ' + e + (rs ? ', R := ' + orAll(rs) : '') + ', PT := ' + pt + ');');
            else if (sys) out.push(nme + '(In := ' + e + ', PT := ' + pt + (rs ? ', Reset := ' + orAll(rs) : '') + ');   (* retentive timer: AccumulationTimer *)');
            else out.push(nme + '(IN := ' + e + ', RESET := ' + (rs ? orAll(rs) : 'FALSE') + ', PT := ' + pt + ');   (* retentive timer: IEC has no TONR, so ' + nme + ' is an FB_RTO, the small block at the end *)');
            break;
          }
          case 'CTU': case 'CTD': {
            const a = cell.addr, nme = iname(a), k = cKind[a], rs = resets[a];
            if (a[0] !== '#') used.counters[a] = k;
            if (k === 'CTUD') {   // counted up and down: ONE instance and ONE call with both inputs
              if (cFirst[a] !== cell) { out.push('(* ' + nme + ' counts ' + (cell.type === 'CTU' ? 'up' : 'down') + ' here: it is the ' + (cell.type === 'CTU' ? 'CU' : 'CD') + ' input of the CTUD call above *)'); break; }
              out.push(nme + '(CU := ' + orAll(cu[a] || ['FALSE']) + ', CD := ' + orAll(cd[a] || ['FALSE']) + (rs ? ', ' + RSTIN + ' := ' + orAll(rs) : '') + ', PV := ' + cell.pv + ');   (* up / down counter: one CTUD, its output is ' + nme + '.QU *)');
            } else if (k === 'CTU') out.push(nme + '(CU := ' + e + (rs ? ', ' + RSTIN + ' := ' + orAll(rs) : '') + ', PV := ' + cell.pv + ');');
            else out.push(nme + '(CD := ' + e + ', ' + LOADIN + ' := ' + orAll(['FirstScan'].concat(rs || [])) + ', PV := ' + cell.pv + ');   (* a CTD starts at 0: ' + LOADIN + ' loads PV, at the first scan and at every reset *)');
            break;
          }
          case 'MOV': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + n(cell.src) + '; END_IF'); break;
          case 'SMOV': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + n(cell.src) + '; END_IF'); break;
          case 'CONCAT': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := CONCAT(' + n(cell.a) + ', ' + n(cell.b) + '); END_IF'); break;
          case 'ITOS': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := ' + (cell.n ? "RIGHT(CONCAT('" + '0'.repeat(cell.n) + "', INT_TO_STRING(" + n(cell.a) + ')), ' + cell.n + ')' : 'INT_TO_STRING(' + n(cell.a) + ')') + '; END_IF'); break;
          case 'SMID': out.push('IF ' + e + ' THEN ' + n(cell.dst) + ' := MID(' + n(cell.src) + ', ' + n(cell.b) + ', ' + n(cell.a) + ');   (* MID(text, length, start) *) END_IF'); break;
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
    Object.keys(used.counters).forEach((c) => decl.push('  ' + c + ' : ' + used.counters[c] + ';'));
    if (used.edges) decl.push('  (* R_TRIG / F_TRIG: each edge contact needs its own trigger instance *)');
    Object.keys(used.inst || {}).forEach((k) => decl.push('  ' + k + ' : ' + used.inst[k] + ';   (* instance = its own memory *)'));
    Object.keys(used.mc || {}).forEach((k) => decl.push('  ' + k + ' : ' + used.mc[k] + ';   (* PLCopen motion block *)'));
    if (used.pid) for (let k = 1; k <= used.pid; k++) decl.push('  PID' + k + ' : PID;   (* the PLC\'s PID function block, e.g. PID_Compact / PIDE *)');
    if (!prog._inBlock && !prog._dialect) {   // REAL memory MRn becomes a REAL variable (TIA: a Real tag, named exports: declared with the I/O)
      const mrs = new Set();
      [prog.rungs].concat((prog.blocks || []).map((b) => b.rungs)).forEach((rs) => rs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c) ['a', 'b', 'src', 'dst'].forEach((k) => { if (RE.mr.test(c[k] || '')) mrs.add(c[k]); }); }))));
      [...mrs].sort((x, y) => +x.slice(2) - +y.slice(2)).forEach((a) => decl.push('  ' + stName(a, tags) + ' : REAL;   (* ' + a + ': a number with decimals *)'));
    }
    decl.push('END_VAR');
    let fbs = '';
    if (!prog._inBlock) (prog.blocks || []).forEach((b) => {
      const body = toST({ name: b.name, tags, rungs: b.rungs, blocks: prog.blocks, _inBlock: true, _dialect: prog._dialect, _brand: prog._brand });
      const st = {}, rank = { BOOL: 0, INT: 1 };
      const bck = {};   // counters of this block: CTU, CTD, or CTUD when one counter is counted up and down
      b.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && COUNTERS.includes(c.type) && c.addr) bck[c.addr] = bck[c.addr] && bck[c.addr] !== c.type ? 'CTUD' : c.type; })));
      b.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (!c) return; ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { const v = c[k]; if (typeof v === 'string' && v[0] === '#') { const nm2 = v.slice(1).split('.')[0]; if (b.params.some((pp) => pp.name === nm2)) return; const ty = TIMERS.includes(c.type) && k === 'addr' ? (c.type === 'RTO' ? rtoType : c.type) : COUNTERS.includes(c.type) && k === 'addr' ? bck[v] :/\.(ET|PT|CV|PV)$/.test(v) || ['MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR', 'CMP', 'PID', 'LIM'].concat(WORDLOGIC, BCD_OPS, REAL_OPS).includes(c.type) ? 'INT' : 'BOOL'; if (st[nm2] == null || (rank[st[nm2]] != null && (rank[ty] == null || rank[ty] > rank[st[nm2]]))) st[nm2] = ty; } }); })));
      const statics = new Set(Object.keys(st).map((k) => k + ' : ' + st[k] + ';'));
      const sec = (kw, dir) => { const ps = b.params.filter((pp) => pp.dir === dir); return ps.length ? [kw].concat(ps.map((pp) => '  ' + pp.name + ' : ' + pp.type + ';' + (pp.comment ? '   (* ' + pp.comment + ' *)' : '')), ['END_VAR']).join('\n') + '\n' : ''; };
      const fcB = b.kind === 'FC';
      fbs += '\n' + (fcB ? 'FUNCTION ' + b.name + ' : BOOL' : 'FUNCTION_BLOCK ' + b.name) + (b.comment ? '   (* ' + b.comment + ' *)' : '') + '\n' + sec('VAR_INPUT', 'IN') + sec('VAR_OUTPUT', 'OUT') + sec('VAR_IN_OUT', 'INOUT') + (statics.size ? (fcB ? 'VAR   (* temporary: lost after every call *)\n' : 'VAR\n') + [...statics].map((x) => '  ' + x).join('\n') + '\nEND_VAR\n' : '') + body + '\n' + (fcB ? 'END_FUNCTION' : 'END_FUNCTION_BLOCK') + '\n';
    });
    if (prog._inBlock) return out.slice(1).join('\n');
    // CODESYS, TwinCAT and Machine Expert have no retentive timer block: print a small one when the program uses RTO
    if (rtoType === 'FB_RTO' && [prog.rungs].concat((prog.blocks || []).map((b) => b.rungs)).some((rs) => rs.some((r) => r.cells.some((row) => row.some((c) => c && c.type === 'RTO'))))) {
      fbs += '\n' + ['FUNCTION_BLOCK FB_RTO   (* retentive on-delay timer: the time adds up while IN is TRUE, only RESET clears it *)',
        'VAR_INPUT', '  IN : BOOL;', '  RESET : BOOL;', '  PT : TIME;', 'END_VAR',
        'VAR_OUTPUT', '  Q : BOOL;    (* TRUE when ET has reached PT *)', '  ET : TIME;', 'END_VAR',
        'VAR', '  Last : TIME;', '  WasOn : BOOL;', 'END_VAR',
        'IF RESET THEN', '  ET := T#0s;', 'ELSIF IN AND WasOn AND ET < PT THEN', '  ET := ET + (TIME() - Last);   (* add the time since the last call *)', 'END_IF',
        'IF ET > PT THEN ET := PT; END_IF', 'Last := TIME();', 'WasOn := IN;', 'Q := (ET >= PT) AND NOT RESET;', 'END_FUNCTION_BLOCK'].join('\n') + '\n';
    }
    // data blocks = global structures
    let dbs = '';
    (prog.dbs || []).forEach((d) => {
      const ty = (f) => (f.type === 'STRING' ? 'STRING(80)' : f.type);
      const val = (f, v) => (f.type === 'STRING' ? "'" + String(v).replace(/^'|'$/g, '') + "'" : f.type === 'BOOL' ? (/^(1|TRUE)$/i.test(String(v)) ? 'TRUE' : 'FALSE') : String(+v || 0));
      dbs += '\nTYPE ST_' + d.name + ' :   (* data block DB' + d.num + (d.comment ? ': ' + d.comment : '') + ' *)\nSTRUCT\n' + d.fields.map((f) => '  ' + f.name + ' : ' + (f.lo != null ? 'ARRAY[' + f.lo + '..' + f.hi + '] OF ' : '') + ty(f) + (f.init.length ? ' := ' + (f.lo != null ? '[' + f.init.map((v) => val(f, v)).join(', ') + ']' : val(f, f.init[0])) : '') + ';' + (f.comment ? '   (* ' + f.comment + ' *)' : '')).join('\n') + '\nEND_STRUCT\nEND_TYPE\nVAR_GLOBAL\n  ' + d.name + ' : ST_' + d.name + ';\nEND_VAR\n';
    });
    return (dbs ? '(* ═════ Data blocks ═════ *)' + dbs + '\n' : '') + (decl.length > 2 ? decl.join('\n') + '\n\n' : '') + out.join('\n') + (fbs ? '\n\n(* ═════ Function blocks ═════ *)' + fbs : '');
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
      if (RE.int.test(a) || RE.real.test(a) || RE.hexbin.test(a)) return a;   // Logix reads 12.5, 16#047F and 2#0000_0101 as they are
      { const mb = RE.mwBit.exec(a); if (mb) return tg('MW' + mb[1]) + '.' + mb[2]; }   // bit of an INT tag: Word.3
      { const d = LL.dbField(a); if (d && d.db && d.f) return d.db.name + '.' + d.f.name + (d.idx != null ? '[' + (RE.int.test(d.idx) ? d.idx : tg(d.idx)) + ']' : ''); }
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
        case 'SMOV': notes.push('Logix strings are STRING tags: copy one with COP(src,dest,1), or MOV the .LEN and COP the .DATA.'); return 'COP(' + tg(cell.src) + ',' + tg(cell.dst) + ',1)';
        case 'CONCAT': return 'CONCAT(' + tg(cell.a) + ',' + tg(cell.b) + ',' + tg(cell.dst) + ')';
        case 'ITOS': notes.push('DTOS turns a number into a string; add the leading zeros with CONCAT, or CPT the number + 10000 and MID the last digits.'); return 'DTOS(' + tg(cell.a) + ',' + tg(cell.dst) + ')';
        case 'SMID': return 'MID(' + tg(cell.src) + ',' + tg(cell.b) + ',' + tg(cell.a) + ',' + tg(cell.dst) + ')';
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
        case 'JMP': case 'LBL': return t + '(' + cell.addr + ')';
        case 'MCR': return 'MCR()';
        case 'FFL': notes.push('FFL / FFU / LFU need an array tag and a CONTROL tag (its .POS is the count, .EM = empty, .DN = full).'); return 'FFL(' + tg(cell.src) + ',Fifo[0],FifoCtl,' + cell.n + ',0)';
        case 'FFU': case 'LFU': notes.push('FFL / FFU / LFU need an array tag and a CONTROL tag (its .POS is the count, .EM = empty, .DN = full).'); return t + '(Fifo[0],' + tg(cell.dst) + ',FifoCtl,' + cell.n + ',0)';
        case 'WAND': case 'WOR': case 'WXOR': return { WAND: 'AND', WOR: 'OR', WXOR: 'XOR' }[t] + '(' + tg(cell.a) + ',' + tg(cell.b) + ',' + tg(cell.dst) + ')';
        case 'WNOT': return 'NOT(' + tg(cell.a) + ',' + tg(cell.dst) + ')';
        case 'I_BCD': notes.push('TOD = "to BCD": 1234 becomes 16#1234. FRD = "from BCD" does the opposite.'); return 'TOD(' + tg(cell.src) + ',' + tg(cell.dst) + ')';
        case 'BCD_I': notes.push('FRD = "from BCD": 16#1234 becomes 1234. TOD = "to BCD" does the opposite.'); return 'FRD(' + tg(cell.src) + ',' + tg(cell.dst) + ')';
        case 'CONV': case 'ROUND': notes.push('Logix converts by itself when MOV copies between INT, DINT and REAL tags. REAL → INT rounds to the nearest (x.5 to the even number).'); return 'MOV(' + tg(cell.src) + ',' + tg(cell.dst) + ')';
        case 'TRUNC': return 'TRN(' + tg(cell.src) + ',' + tg(cell.dst) + ')';
        case 'NORM_X': case 'SCALE_X': {
          // Logix 5000 has no SCP (that is SLC 500 / MicroLogix): scale with CPT. Limits written with a decimal point make Logix calculate in REAL
          const rl = (a) => { const s = RE.int.test(String(a)) ? a + '.0' : tg(a); return /^-/.test(s) ? '(' + s + ')' : s; };
          const real = [cell.src, cell.a, cell.b].some((a) => isNumLit(String(a)) || isRealAddr(a));
          const v = (real ? '' : '1.0*') + rl(cell.src), lo = rl(cell.a), hi = rl(cell.b);
          notes.push('Logix 5000 has no SCP instruction (SCP is SLC 500 / MicroLogix): scale with CPT and the formula. Write the limits with a decimal point (0.0, 27648.0), or Logix divides in whole numbers.');
          return 'CPT(' + tg(cell.dst) + ',' + (t === 'NORM_X' ? '(' + v + '-' + lo + ')/(' + hi + '-' + lo + ')' : v + '*(' + hi + '-' + lo + ')+' + lo) + ')';
        }
        case 'PID': notes.push('PID: put SP = ' + tg(cell.b) + ', KP = ' + cell.kp + ', KI and KD in the PID tag (' + 'PID_' + tg(cell.dst) + '); many plants use PIDE in a function block diagram instead.'); return 'PID(PID_' + tg(cell.dst) + ',' + tg(cell.a) + ',0,' + tg(cell.dst) + ',0,0,0)';
      }
      return '';
    };
    const rungs = (rs, title) => {
      let zoneOpen = false;   // MCR: the first one opens the zone, the next one closes it
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
              case 'LIM': e = AND(cur[r], V('LIM(' + tg(cell.a) + ',' + tg(cell.src) + ',' + tg(cell.b) + ')')); break;
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
          if (!cell) continue;
          // a label has no condition, and the second MCR of a pair closes the zone without one: print them also when they stand alone on the rung
          if (cell.type === 'LBL') { groups.push({ cond: '', ins: ['LBL(' + cell.addr + ')'], solo: true }); continue; }
          if (cell.type === 'MCR') { const end = zoneOpen; zoneOpen = !zoneOpen; if (end || !cur[r]) { groups.push({ cond: '', ins: ['MCR()'], solo: true }); continue; } }
          if (!cur[r]) continue;
          const cond = prR(cur[r]), ins = outIns(cell, notes);
          const g = groups.find((x) => !x.solo && x.cond === cond);
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
    { const ua = [...usedAddrs(prog)]; (prog.blocks || []).forEach((b) => usedAddrs({ rungs: b.rungs }).forEach((a) => ua.push(a)));
      const mr = ua.filter((a) => RE.mr.test(a)), mb = ua.filter((a) => RE.mwBit.test(a));
      if (mr.length) out.push('// REAL tags (numbers with decimals): ' + [...new Set(mr)].map(tg).join(', ') + '. Create them with the data type REAL.');
      if (mb.length) out.push('// Bit of a word: ' + [...new Set(mb)].map((a) => { const m = RE.mwBit.exec(a); return tg(a) + ' = bit ' + m[2] + ' of the INT tag ' + tg('MW' + m[1]); }).join(', ') + ' (bit 0 = the lowest bit).'); }
    rungs(prog.rungs, 'MainRoutine');
    (prog.blocks || []).forEach((b) => {
      out.push('');
      out.push('// ═════ ' + (b.kind === 'FC' ? 'Routine (called with JSR) ' : 'Add-On Instruction ') + b.name + (b.comment ? ': ' + b.comment : '') + ' ═════');
      b.params.forEach((pp) => out.push('//   ' + (pp.dir === 'IN' ? 'Input ' : pp.dir === 'OUT' ? 'Output' : 'InOut ') + ' ' + pp.name + ' : ' + (pp.type === 'INT' ? 'INT' : 'BOOL') + (pp.comment ? '   (' + pp.comment + ')' : '')));
      out.push(b.kind === 'FC' ? '//   Other names inside are program tags. Logix has no temporary memory: every tag keeps its value, so write a tag before you read it.' : '//   Other names inside are local tags of the AOI (each instance tag has its own copy, and it keeps its value).');
      rungs(b.rungs, b.name + ' Logic');
    });
    return out.join('\n');
  }

  // collect addresses used in a program
  function usedAddrs(prog) {
    const s = new Set();
    prog.rungs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => {
      if (!c) return;
      ['addr', 'a', 'b', 'src', 'dst'].forEach((k) => { if (c[k] && typeof c[k] === 'string' && !isNumLit(c[k]) && c[k][0] !== '#' && !RE.strLit.test(c[k])) { s.add(c[k]); const mb = RE.mwBit.exec(c[k]); if (mb) s.add('MW' + mb[1]); } });
      if (c.type === 'CALL') Object.values(c.args || {}).forEach((v) => { if (v && !RE.int.test(v) && v[0] !== '#') s.add(v); });
    })));
    return s;
  }

  Object.assign(LL, {
    LOGIC, OUTPUT, TIMERS, COUNTERS, MATH, CMP_OPS, RE, MOTION, STRING_OPS, isStrAddr, isWritableStr,
    isOutput, isLogic, isBitAddr, isWordAddr, isWritableBit, isWritableWord, norm, dbField,
    parseDuration, fmtDuration, shiftBits, mkCell, cloneCell, emptyRung,
    parseRung, rungToLines, parseProgram, programToText, cloneProgram, parseToken, cellToken,
    Machine, lint, toST, toRockwell, stName, usedAddrs,
    WORDLOGIC, BCD_OPS, REAL_OPS, FLOW_OPS, FIFO_OPS, isRealAddr, isNumLit, numType, litInt, roundEven, fmtReal, hex4,
  });
})(typeof window !== 'undefined' ? window : globalThis);

/* PLC Start — the same program for other brands: TIA Portal SCL, TwinCAT 3 / Omron Sysmac ST
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
    // every bit of a shift register is a variable too, not only its first bit
    [prog.rungs].concat((prog.blocks || []).map((b) => b.rungs)).forEach((rs) => rs.forEach((r) => r.cells.forEach((row) => row.forEach((c) => { if (c && c.type === 'SHRB' && c.addr && c.addr[0] !== '#') (LL.shiftBits(c.addr, Math.abs(c.n)) || []).forEach((a) => set.add(a)); }))));
    const out = [];
    [...set].sort().forEach((a) => {
      let kind = null, type = 'BOOL';
      if (RE.bit.test(a)) kind = a[0];
      else if (RE.aiw.test(a)) { kind = 'I'; type = 'INT'; }
      else if (RE.aqw.test(a)) { kind = 'Q'; type = 'INT'; }
      else if (RE.mw.test(a)) { kind = 'M'; type = 'INT'; }
      else if (RE.md.test(a)) { kind = 'M'; type = 'DINT'; }
      else if (RE.hc.test(a)) { kind = 'I'; type = 'DINT'; }
      else if (RE.mr.test(a)) { kind = 'M'; type = 'REAL'; }
      if (!kind) return;
      const name = tags[a] ? san(tags[a]) : a.replace(/\./g, '_');
      out.push({ a, kind, type, name, iec: LL.stName(a, {}) });
    });
    return out;
  }
  // ST with direct addresses replaced by variable names
  function namedST(prog, brand) {
    const vars = ioVars(prog);
    let st = LL.toST(Object.assign({}, prog, { tags: {}, _dialect: 'named', _brand: brand }));
    // whole names only: %MW1 must not touch %MW10, MR1 must not touch MR10
    vars.slice().sort((x, y) => y.iec.length - x.iec.length).forEach((v) => { st = st.replace(new RegExp(v.iec.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&') + '(?!\\w)', 'g'), v.name); });
    return { vars, st };
  }
  const splitDecl = (st) => {
    const m = /^VAR\n([\s\S]*?)\nEND_VAR\n\n/.exec(st);
    return m ? { decl: m[1].split('\n'), body: st.slice(m[0].length) } : { decl: [], body: st };
  };

  function toTwinCAT(prog, sysmac) {
    const { vars, st } = namedST(prog, sysmac ? 'sysmac' : 'twincat');
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
    let b = body.replace(/\bFirstScan\b/g, sysmac ? 'P_First_RunMode' : 'bFirstCycle').replace(/\bClock_1Hz\b/g, sysmac ? 'Get1sClk()' : 'bClock1Hz');
    if (!sysmac && /bFirstCycle/.test(b)) out.splice(out.indexOf('END_VAR'), 0, '  bFirstCycle : BOOL;   // = _TaskInfo[GETCURTASKINDEXEX()].FirstCycle');
    if (!sysmac && /bClock1Hz/.test(b)) {   // TwinCAT has no ready-made blink block in its standard libraries: two timers make the 1 Hz clock
      out.splice(out.indexOf('END_VAR'), 0, '  bClock1Hz : BOOL;   // 1 Hz clock, made with the two timers below (or write your own blink FB)', '  fbClockOff, fbClockOn : TON;');
      b = '// 1 Hz clock: 0.5 s off, 0.5 s on\nfbClockOff(IN := NOT fbClockOn.Q, PT := T#500MS);\nfbClockOn(IN := fbClockOff.Q, PT := T#500MS);\nbClock1Hz := fbClockOff.Q;\n\n' + b;
    }
    // the blocks are POUs of their own: they come after END_PROGRAM, not inside the program
    const cut = b.indexOf('\n\n(* ═════ Function blocks ═════ *)');
    out.push(cut < 0 ? b : b.slice(0, cut));
    if (!sysmac) out.push('END_PROGRAM');
    if (cut >= 0) out.push(b.slice(cut + 2));
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
    Object.keys(prog.tags || {}).filter((a) => used.has(a) && !RE.mwBit.test(a)).forEach((a) => { let nm = san(prog.tags[a]) || a.replace(/\./g, '_'); if (seenN[nm]) nm += '_' + a.replace(/\./g, '_'); seenN[nm] = 1; tags[a] = nm; });
    // REAL memory MRn has no address of its own in TIA: it becomes a Real tag (here at %MD1000 + 4·n)
    [...used].filter((a) => RE.mr.test(a) && !tags[a]).forEach((a) => { let nm = a; if (seenN[nm]) nm += '_r'; seenN[nm] = 1; tags[a] = nm; });
    const tiaAddr = (a) => { const m = RE.mr.exec(a); return m ? 'MD' + (1000 + 4 * +m[1]) + ' (Real)' : a.replace(/^AIW/, 'IW').replace(/^AQW/, 'QW'); };
    let st = LL.toST(Object.assign({}, prog, { tags, _dialect: 'tia' }));
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
      if (/^(TON|TOF|TP|TONR|CTU|CTD|CTUD)$/.test(t)) c2 = c2.replace(new RegExp('(^|\\n)(\\s*)' + k + '\\(', 'g'), '$1$2"' + k + '".' + t + '(').replace(new RegExp('RESET_TIMER\\(' + k + '\\)', 'g'), 'RESET_TIMER("' + k + '")');
      else c2 = c2.replace(new RegExp('(^|[^".#\\w])' + k + '\\(', 'g'), '$1"' + k + '"(');
      c2 = c2.replace(new RegExp('(^|[^".#\\w])' + k + '\\.', 'g'), '$1"' + k + '".');
    });
    // a call of an FC: the block name is written in quotes
    (prog.blocks || []).filter((bk) => bk.kind === 'FC').forEach((bk) => { c2 = c2.replace(new RegExp('(^|[^".#\\w])' + bk.name + '\\(', 'g'), '$1"' + bk.name + '"('); });
    quoteNames.forEach((nm) => { c2 = c2.replace(new RegExp('(^|[^".#\\w%])' + nm + '(?![\\w"])', 'g'), '$1"' + nm + '"'); });
    c2 = c2.replace(/\bFirstScan\b/g, '"FirstScan"').replace(/\bClock_1Hz\b/g, '"Clock_1Hz"');
    // a servo axis is a technology object in TIA Portal
    c2 = c2.replace(/\bAX(\d)\.(ON|HOMED|ERR|MOVING|POS|VEL)\b/g, (m, n, f) => ({ ON: '"AX' + n + '".StatusBits.Enable', HOMED: '"AX' + n + '".StatusBits.HomingDone', ERR: '"AX' + n + '".StatusBits.Error', MOVING: 'NOT "AX' + n + '".StatusBits.StandStill', POS: '"AX' + n + '".ActualPosition', VEL: '"AX' + n + '".ActualVelocity' })[f]).replace(/(^|[^"\w])(AX\d)\b/g, '$1"$2"');
    return c2; });
    (prog.dbs || []).forEach((d) => { b = codeOnly(b, (code) => code.replace(new RegExp('(^|[^"\\w])' + d.name + '\\.', 'g'), '$1"' + d.name + '".')); });
    b = b.replace(/END_IF(?!;)/g, 'END_IF;');
    // bit of a word: slice access "Status".%X3 / %MW10.%X3
    b = codeOnly(b, (code) => code.replace(/("[^"\n]+"|%MW\d+)\.(\d{1,2})(?![\d.])/g, '$1.%X$2'));
    const out = ['// Siemens TIA Portal: SCL (Structured Control Language) for an S7-1200 / S7-1500 block, e.g. OB1 or an FB.',
      '// Create in the PLC tag table: ' + (Object.keys(tags).length ? Object.keys(tags).map((a) => '"' + tags[a] + '" = %' + tiaAddr(a)).join(', ') : 'the addresses used below') + '.'];
    { const bits = [...used].filter((a) => RE.mwBit.test(a)).sort();
      if (bits.length) out.push('// Bit of a word = slice access: %MW10.%X3 is bit 3 of MW10 (bit 0 = the lowest bit). Careful, Siemens byte order:',
        '//   MW10 = MB10 (HIGH byte) + MB11 (LOW byte), so bit 3 of MW10 is %M11.3 and bit 8 is %M10.0. Here: ' + bits.map((a) => { const m = RE.mwBit.exec(a), k = +m[2]; return a + ' = %M' + (+m[1] + (k < 8 ? 1 : 0)) + '.' + (k % 8); }).join(', ') + '.',
        '//   In PLC Start M bits and MW words are separate memory; in a Siemens PLC they overlap, so keep other M bits away from these bytes.');
      if ([...used].some((a) => RE.mr.test(a))) out.push('// REAL: MRn becomes a tag of type Real (4 bytes, a %MD address). TIA does not put a Real into an Int by itself: use CONV, ROUND or TRUNC.'); }
    const td = Object.keys(inst);
    if (td.length) out.push('// Create these instance data blocks (or multi-instances in an FB): ' + td.map((k) => '"' + k + '" : ' + (/^(TON|TOF|TP|TONR)$/.test(inst[k]) ? 'IEC_TIMER' : /^(CTU|CTD|CTUD)$/.test(inst[k]) ? 'IEC_COUNTER' : '"' + inst[k] + '"')).join(', ') + '.');
    (prog.dbs || []).forEach((d) => out.push('// Global DB "' + d.name + '" (DB' + d.num + '): ' + d.fields.map((f) => f.name + ' : ' + (f.lo != null ? 'Array[' + f.lo + '..' + f.hi + '] of ' : '') + (f.type === 'STRING' ? 'String' : f.type === 'BOOL' ? 'Bool' : f.type === 'INT' ? 'Int' : 'DInt')).join(', ') + ' (start values in the DB editor).'));
    if (/"FirstScan"/.test(b)) out.push('// "FirstScan": the first-cycle bit of the system memory byte (Device configuration → System and clock memory), or use OB100.');
    if (/"Clock_1Hz"/.test(b)) out.push('// "Clock_1Hz": bit 5 of the clock memory byte (Device configuration → System and clock memory).');
    if (/R_TRIG\(|F_TRIG\(/.test(b)) out.push('// Edges: SCL has no edge contact. R_TRIG(x) / F_TRIG(x) below is short for an edge instance: create one R_TRIG / F_TRIG instance per edge,',
      '//   call it once per cycle ("R_TRIG_DB"(CLK := x);) and use "R_TRIG_DB".Q in the IF.');
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
        // timers and counters inside a block are multi-instances with the TIA data types TON_TIME, CTU_INT …
        head = head.replace(/^(\s+\w+) : (TON|TOF|TP|TONR);/gm, (m, v, ty) => v + " {InstructionName := '" + ty + "_TIME'; LibVersion := '1.0'} : " + ty + '_TIME;')
          .replace(/^(\s+\w+) : (CTU|CTD|CTUD);/gm, (m, v, ty) => v + " {InstructionName := '" + ty + "_INT'; LibVersion := '1.0'} : " + ty + '_INT;');
        // an FC has no static memory: its own variables are Temp
        if (/^FUNCTION "/.test(sec)) head = head.replace('\nVAR   (* temporary: lost after every call *)\n', '\nVAR_TEMP   (* temporary: lost after every call *)\n');
        (prog.blocks || []).forEach((bk) => { code = code.replace(new RegExp('(^|[^".#\\w])' + bk.name + '\\(', 'g'), '$1"' + bk.name + '"('); });
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
    if ((m = RE.mwBit.exec(a))) return 'D' + m[1] + '.' + m[2].padStart(2, '0');
    if ((m = RE.mr.exec(a))) return 'D' + (2000 + 2 * +m[1]);   // a REAL takes two words
    if (RE.hexbin.test(a)) return '#' + ((LL.litInt(a) & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, '0');
    if (RE.real.test(a)) return (+a < 0 ? '' : '+') + a;   // floating-point constant
    if ((m = RE.aiw.exec(a))) return 'AIN' + m[1];
    if ((m = RE.aqw.exec(a))) return 'AOUT' + m[1];
    if (RE.int.test(a)) return +a < 0 ? String(+a) : '&' + a;   // CX-Programmer: & = decimal, -20 = signed decimal, # = hex (or a BCD set value)
    return a;
  }
  function toOmronCX(prog) {
    const out = ['// Omron CX-Programmer (CP1 / CJ series): mnemonic list. Type it in the mnemonic view, or read it against',
      '// the ladder. Inputs CIO 0.00 …, outputs CIO 100.00 …, work bits W, data words D, timers TIM (0.1 s units),',
      '// counters CNT (they count DOWN from the set value). @LD = rising edge, %LD = falling edge.',
      '// Constants: &250 = decimal, -20 = signed decimal, #047F = hex, +2.5 = floating point. Only TIM / CNT set values are BCD (#30).', ''];
    const LOGIC = new Set(['NO', 'NC', 'P', 'N', 'CMP', 'NOT', 'WIRE', 'LIM']);
    const isR = LL.isRealAddr, fl = (c) => (isR(c.a) || isR(c.b) || isR(c.src) || isR(c.dst) ? 'F' : '');   // F = floating-point version (LD>=F, +F)
    const fc = (a) => (RE.int.test(String(a)) || RE.real.test(String(a)) ? (+a < 0 ? '' : '+') + a + (RE.int.test(String(a)) ? '.0' : '') : null);   // floating-point constant
    const omv = (c, a) => (fl(c) && fc(a) ? fc(a) : omAddr(a));   // an operand of c: in a floating-point instruction a whole number is written +2.0
    const jn = (a) => '&' + (String(a).replace(/\D/g, '') || '0');   // jump number
    const W = 'D2980';   // work words for results that need more than one word (D2980 … D2989)
    let zoneOpen = false;   // MCR: the first one opens the zone (IL), the next one closes it (ILC)
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
            else if (cell.type === 'CMP') e = AND(cur[r], { t: 'v', op: { '==': '=', '<>': '<>', '>': '>', '>=': '>=', '<': '<', '<=': '<=' }[cell.op] + fl(cell), a: omv(cell, cell.a), b: omv(cell, cell.b) });
            else if (cell.type === 'LIM') e = AND(AND(cur[r], { t: 'v', op: '>=' + fl(cell), a: omv(cell, cell.src), b: omv(cell, cell.a) }), { t: 'v', op: '<=' + fl(cell), a: omv(cell, cell.src), b: omv(cell, cell.b) });   // or ZCP(088)
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
        if (!cell || LOGIC.has(cell.type)) continue;
        // a label has no condition, and the second MCR of a pair closes the zone without one: print them also when they stand alone on the rung
        if (cell.type === 'LBL') { lines.push('JME(005) ' + jn(cell.addr) + '   // the jump lands here (JME needs no condition)'); continue; }
        if (cell.type === 'MCR') {
          const end = zoneOpen; zoneOpen = !zoneOpen;
          if (end) { lines.push('ILC(003)   // end of the zone (no condition)'); continue; }
          if (!cur[r]) { lines.push('LD P_Off', 'IL(002)   // zone start with nothing in front: this zone is always off'); continue; }
        }
        if (!cur[r]) continue;
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
          case 'RTO': lines.push('LD P_Off   // second input of TTIM = its reset input (here the reset is done with CNR elsewhere)'); lines.push('TTIM(087) ' + nT(cell.addr) + ' #' + Math.max(1, Math.round(cell.pt / 100)) + '   // accumulative timer'); break;
          case 'CTU': case 'CTD': lines.push('LD P_Off   // reset input of the counter (use CNR elsewhere)'); lines.push('CNT ' + nT(cell.addr) + ' #' + cell.pv + (T === 'CTU' ? '   // counts DOWN from ' + cell.pv + ': done at 0' : '')); break;
          case 'MOV': lines.push(isR(cell.dst) ? (isR(cell.src) ? 'MOVL(498) ' : 'FLT(452) ') + omAddr(cell.src) + ' ' + omAddr(cell.dst) + '   // REAL = 2 words' : 'MOV(021) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst)); break;
          case 'JMP': lines.push('CJP(510) ' + jn(cell.addr) + '   // jumps to JME ' + jn(cell.addr) + ' while the condition is ON. (JMP(004) is the opposite: it jumps while the condition is OFF)'); break;
          case 'MCR': lines.push('IL(002)   // zone start; the zone end is ILC(003), without a condition'); break;
          case 'FFL': lines.push('PUSH(632) ' + omAddr(cell.dst) + ' ' + omAddr(cell.src) + '   // the stack must be set up once with SSET(630)'); break;
          case 'FFU': lines.push('FIFO(633) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst)); break;
          case 'LFU': lines.push('LIFO(634) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst)); break;
          case 'WAND': case 'WOR': case 'WXOR': lines.push({ WAND: 'ANDW(034) ', WOR: 'ORW(035) ', WXOR: 'XORW(036) ' }[T] + omAddr(cell.a) + ' ' + omAddr(cell.b) + ' ' + omAddr(cell.dst)); break;
          case 'WNOT': lines.push('MOV(021) ' + omAddr(cell.a) + ' ' + omAddr(cell.dst)); lines.push('COM(029) ' + omAddr(cell.dst) + '   // invert all 16 bits'); break;
          case 'I_BCD': lines.push('BCD(024) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst) + '   // binary → BCD'); break;
          case 'BCD_I': lines.push('BIN(023) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst) + '   // BCD → binary'); break;
          case 'CONV': case 'ROUND': case 'TRUNC':
            if (!isR(cell.src)) lines.push('FLT(452) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst) + '   // INT → REAL');
            else if (isR(cell.dst)) lines.push('MOVL(498) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst));
            else lines.push('FIX(450) ' + omAddr(cell.src) + ' ' + omAddr(cell.dst) + (T === 'TRUNC' ? '   // REAL → INT, cuts the decimals' : '   // FIX cuts the decimals: to round, first +F(454) 0.5 (positive values)'));
            break;
          case 'NORM_X': case 'SCALE_X': {
            // floating-point maths: a REAL takes 2 words. (SCL(194) also scales, but its result is a 4-digit BCD number, not a REAL)
            lines.push('// ' + T + ': ' + (T === 'NORM_X' ? '(value − min) / (max − min)' : 'value × (max − min) + min') + ' in floating point. A REAL takes 2 words; D2980 … D2991 are work words');
            const f = (a, w) => { if (fc(a)) return fc(a); if (isR(a)) return omAddr(a); lines.push('FLT(452) ' + omAddr(a) + ' ' + w + '   // whole number → REAL'); return w; };
            const v = f(cell.src, 'D2980'), lo = f(cell.a, 'D2982'), hi = f(cell.b, 'D2984'), res = isR(cell.dst) ? omAddr(cell.dst) : 'D2990';
            lines.push('-F(455) ' + hi + ' ' + lo + ' D2986   // max − min');
            if (T === 'NORM_X') lines.push('-F(455) ' + v + ' ' + lo + ' D2988   // value − min', '/F(457) D2988 D2986 ' + res);
            else lines.push('*F(456) ' + v + ' D2986 D2988', '+F(454) D2988 ' + lo + ' ' + res);
            if (!isR(cell.dst)) lines.push('FIX(450) D2990 ' + omAddr(cell.dst) + '   // REAL → whole number (FIX cuts the decimals)');
            break;
          }
          case 'SMOV': lines.push('MOV$(664) ' + cell.src + ' ' + cell.dst + '   // string move'); break;
          case 'CONCAT': lines.push('+$(656) ' + cell.a + ' ' + cell.b + ' ' + cell.dst + '   // string concatenation'); break;
          case 'ITOS': lines.push('STR4(601) ' + omAddr(cell.a) + ' ' + cell.dst + '   // number to ASCII'); break;
          case 'SMID': lines.push('MID$(652) ' + cell.src + ' ' + omAddr(cell.b) + ' ' + omAddr(cell.a) + ' ' + cell.dst); break;
          case 'ADD': case 'SUB': case 'MUL': case 'DIV': if (fl(cell)) { lines.push({ ADD: '+F(454) ', SUB: '-F(455) ', MUL: '*F(456) ', DIV: '/F(457) ' }[T] + omv(cell, cell.a) + ' ' + omv(cell, cell.b) + ' ' + omAddr(cell.dst) + '   // floating point (REAL)'); break; }
            // falls through: whole-number maths
          case 'MOD': {
            const ab = omAddr(cell.a) + ' ' + omAddr(cell.b) + ' ', d = omAddr(cell.dst);
            if ([cell.a, cell.b].some((x) => RE.md.test(String(x)) || RE.hc.test(String(x)))) lines.push('// a 32-bit operand takes 2 words: use the double-word versions +L(401), -L(411), *L(421), /L(431)');
            if (T === 'ADD') lines.push('+(400) ' + ab + d);
            else if (T === 'SUB') lines.push('-(410) ' + ab + d);
            else if (T === 'MUL' && RE.md.test(cell.dst)) lines.push('*(420) ' + ab + d + '   // the product takes 2 words');
            else if (T === 'MUL') lines.push('*(420) ' + ab + W + '   // the product takes 2 words (' + W + ', D2981): do not let it overwrite the word after ' + d, 'MOV(021) ' + W + ' ' + d);
            else lines.push('/(430) ' + ab + W + '   // quotient in ' + W + ', remainder in D2981', 'MOV(021) ' + (T === 'MOD' ? 'D2981 ' : W + ' ') + d + (T === 'MOD' ? '   // the remainder' : '   // the quotient'));
            break;
          }
          case 'SHL': case 'SHR': {
            // NASL / NASR shift a word by N bits in place. Control word: the last two hex digits are the number of bits, first digit 0 = zeros come in
            const d = omAddr(cell.dst), cnt = RE.int.test(String(cell.b)) ? '#' + (+cell.b & 0xff).toString(16).toUpperCase().padStart(4, '0') : omAddr(cell.b);
            if (omAddr(cell.a) !== d) lines.push('MOV(021) ' + omAddr(cell.a) + ' ' + d + '   // the shift works in the word itself: copy the source first');
            lines.push((T === 'SHL' ? 'NASL(580) ' : 'NASR(581) ') + d + ' ' + cnt + '   // shift ' + cell.b + ' bits');
            break;
          }
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
