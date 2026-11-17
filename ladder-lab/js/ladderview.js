/* Ladder Lab — SVG ladder renderer with live power-flow monitoring.
 * Builds the drawing once per program change, then updates classes/text
 * every frame from the machine trace (cheap enough for phones). */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  const CW = 78, OW = 152, RH = 80, HDR = 30, PADL = 16, PADR = 16, GAP = 10;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const trunc = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
  const fmtMs = (ms) => (ms >= 10000 ? (ms / 1000).toFixed(0) + 's' : ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms');

  LL.ELEMENT_INFO = {
    WIRE: ['Wire', 'Connects left to right. Carries power straight through.'],
    NO: ['NO contact', 'Passes power while its bit is 1 ("is it on?").'],
    NC: ['NC contact', 'Passes power while its bit is 0 ("is it off?"). This is NOT.'],
    P: ['Rising edge', 'Passes power for one scan when its bit goes 0 → 1.'],
    N: ['Falling edge', 'Passes power for one scan when its bit goes 1 → 0.'],
    NOT: ['NOT', 'Inverts the power flow at this point.'],
    CMP: ['Compare', 'Passes power while the comparison of two numbers is true.'],
    COIL: ['Coil', 'Writes the rung result (1 or 0) to its bit every scan.'],
    NCOIL: ['Negated coil', 'Writes the inverse of the rung result.'],
    SET: ['Set coil', 'Writes 1 when powered; otherwise leaves the bit alone.'],
    RST: ['Reset coil', 'Writes 0 when powered. Also clears timers, counters and words.'],
    TON: ['On-delay timer', 'Done bit Q turns on after the rung has been powered for PT. Read it with a contact on T0 (same as T0.Q, or T0.DN in Rockwell); read the elapsed time as T0.ET.'],
    TOF: ['Off-delay timer', 'Done bit on immediately; turns off PT after the rung loses power.'],
    TP: ['Pulse timer', 'Gives a fixed PT-long pulse on each rising edge.'],
    RTO: ['Retentive timer', 'Accumulates powered time, keeps it when off. Clear with RST.'],
    CTU: ['Count up', '+1 on each rising edge; done when CV ≥ PV. Clear with RST.'],
    CTD: ['Count down', '−1 on each rising edge; done when CV ≤ 0. RST reloads PV.'],
    MOV: ['Move', 'Copies a value into a word while powered.'],
    ADD: ['Add', 'dst = a + b while powered (use an edge to do it once).'],
    SUB: ['Subtract', 'dst = a − b while powered.'],
    MUL: ['Multiply', 'dst = a × b while powered.'],
    DIV: ['Divide', 'dst = a ÷ b (integer) while powered.'],
    SHL: ['Shift left', 'OUT = IN shifted left by N bits (16-bit word). Each place = ×2. Runs every scan while powered.'],
    MOD: ['Modulo (remainder)', 'Result = A MOD B, the remainder of the division A ÷ B. 1234 MOD 1000 = 234. Use it to split a number into digits or to do something every Nth part.'],
    SHR: ['Shift right', 'OUT = IN shifted right by N bits (16-bit word). Each place = ÷2. Runs every scan while powered.'],
    CALL: ['Call a block', 'Runs a reusable block (FB) while the rung is true. Each call has an instance name: its own memory. Connect every parameter to an address of this machine.'],
    SMOV: ['Move a string', "Copies text: SMOV(ISTR0,STR1) or SMOV('ABC',QSTR0). Strings live in STR0 … STR31; ISTRn come from devices (a barcode reader), QSTRn go to devices (a printer). TIA S_MOVE, Rockwell COP, CODESYS :=."],
    CONCAT: ['Join two strings', "CONCAT(STR1,'-',STR2): STR2 = STR1 followed by '-'. TIA / Rockwell / CODESYS: CONCAT."],
    ITOS: ['Number to text', 'ITOS(MW10,4,STR3): 7 becomes 0007 (4 digits with leading zeros; 0 = no leading zeros). TIA S_CONV / VAL_STRG, Rockwell DTOS, CODESYS INT_TO_STRING.'],
    SMID: ['Part of a string', 'SMID(ISTR0,1,4,STR1): 4 characters from position 1. TIA / CODESYS MID, Rockwell MID.'],
    MC_POWER: ['MC_Power (servo on)', 'While the rung is true the axis drive is switched on (enabled). AX0.ON tells you it is ready. Rung false = drive off, the axis stops. Rockwell: MSO / MSF.'],
    MC_HOME: ['MC_Home (homing)', 'On the rising edge of the rung, the axis moves slowly backwards until the reference switch closes, and calls that point 0 mm. Until then it does not know where it is (AX0.HOMED = 0). DONE / BUSY / ERR on the command tag. Rockwell: MAH.'],
    MC_ABS: ['MC_MoveAbsolute', 'On the rising edge: move to the position (mm) at the velocity (mm/s), with smooth acceleration. Needs a powered, homed axis. DONE when it has arrived. Rockwell: MAM (absolute).'],
    MC_REL: ['MC_MoveRelative', 'On the rising edge: move this distance (mm, negative = backwards) from where it is now. Rockwell: MAM (incremental).'],
    MC_JOG: ['MC_Jog', 'While the rung is true the axis moves at this velocity (mm/s, negative = backwards); when it goes false it stops. Works without homing. Rockwell: MAJ + MAS.'],
    MC_STOP: ['MC_Stop', 'On the rising edge: stop the axis (it decelerates) and cancel the running move (that command reports ABORT). Rockwell: MAS.'],
    MC_SETPOS: ['MC_SetPosition (set home here)', 'On the rising edge: the axis takes this value as its present position and counts as homed, without moving. Use it to "set home here" after jogging to a mark. TIA Portal: MC_Home Mode 0; Rockwell: MRP.'],
    MC_RESET: ['MC_Reset', 'On the rising edge: clear the axis error (after a software-limit error or a drive fault whose cause is gone). Rockwell: MAFR.'],
    PID: ['PID controller', 'Keeps PV at SP by adjusting OUT (0 … 27648 = 0 … 100 %). Kp = % output per unit of error, Ti = integral time (removes the remaining error), Td = derivative time. Off when the rung is false.'],
    SHRB: ['Shift register (bit)', 'Each time it runs, the bits from START move one place along (length N) and DATA enters the first bit. Negative N shifts the other way. Use an edge so it shifts once per event (one pocket, one part).'],
  };

  function symbolSVG(cell, x0, x1, cy, tags, isOut, xR) {
    const t = cell.type;
    const name = (a) => (tags && tags[a]) || '';
    let s = '';
    const lbl = (a, cx) => {
      let o = '';
      const nm = name(a);
      if (nm) o += `<text class="lb-name" x="${cx}" y="${cy - 26}">${esc(trunc(nm, isOut ? 18 : 11))}</text>`;
      o += `<text class="lb-addr" x="${cx}" y="${cy + 33}">${esc(a || '???')}</text>`;
      return o;
    };
    if (t === 'WIRE') {
      return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${(x0 + x1) / 2}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${(x0 + x1) / 2}" y1="${cy}" x2="${x1}" y2="${cy}"/>`, sym: '' };
    }
    if (['NO', 'NC', 'P', 'N'].includes(t)) {
      const cx = (x0 + x1) / 2;
      s += `<rect class="cfill" x="${cx - 9}" y="${cy - 13}" width="18" height="26" rx="2"/>`;
      s += `<line class="bar" x1="${cx - 9}" y1="${cy - 15}" x2="${cx - 9}" y2="${cy + 15}"/><line class="bar" x1="${cx + 9}" y1="${cy - 15}" x2="${cx + 9}" y2="${cy + 15}"/>`;
      if (t === 'NC') s += `<line class="slash" x1="${cx - 13}" y1="${cy + 14}" x2="${cx + 13}" y2="${cy - 14}"/>`;
      if (t === 'P' || t === 'N') s += `<text class="lt" x="${cx}" y="${cy + 4.5}">${t}</text>`;
      s += lbl(cell.addr, cx);
      return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${cx - 9}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${cx + 9}" y1="${cy}" x2="${x1}" y2="${cy}"/>`, sym: s };
    }
    if (t === 'NOT') {
      const cx = (x0 + x1) / 2;
      s += `<rect class="box" x="${cx - 18}" y="${cy - 12}" width="36" height="24" rx="4"/><text class="bx-t" x="${cx}" y="${cy + 4}">NOT</text>`;
      return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${cx - 18}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${cx + 18}" y1="${cy}" x2="${x1}" y2="${cy}"/>`, sym: s };
    }
    if (t === 'CMP') {
      const cx = (x0 + x1) / 2;
      s += `<rect class="box cbox" x="${cx - 33}" y="${cy - 20}" width="66" height="40" rx="5"/>`;
      s += `<text class="bx-s" x="${cx}" y="${cy - 5}">${esc(trunc(cell.a, 9))}</text><text class="bx-t" x="${cx}" y="${cy + 12}">${esc(cell.op === '==' ? '=' : cell.op)} ${esc(trunc(cell.b, 6))}</text>`;
      return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${cx - 33}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${cx + 33}" y1="${cy}" x2="${x1}" y2="${cy}"/>`, sym: s };
    }
    if (['COIL', 'NCOIL', 'SET', 'RST'].includes(t)) {
      const cx = (x0 + x1) / 2;
      s += `<circle class="cfill" cx="${cx}" cy="${cy}" r="12"/>`;
      s += `<path class="arc" d="M${cx - 6} ${cy - 15} A16 16 0 0 0 ${cx - 6} ${cy + 15}"/><path class="arc" d="M${cx + 6} ${cy - 15} A16 16 0 0 1 ${cx + 6} ${cy + 15}"/>`;
      const letter = t === 'SET' ? 'S' : t === 'RST' ? 'R' : t === 'NCOIL' ? '/' : '';
      if (letter) s += `<text class="lt" x="${cx}" y="${cy + 4.5}">${letter}</text>`;
      s += lbl(cell.addr, cx);
      return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${cx - 16}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${cx + 16}" y1="${cy}" x2="${xR}" y2="${cy}"/>`, sym: s };
    }
    // boxes
    const bx0 = x0 + 10, bx1 = x1 - 12, bw = bx1 - bx0, by = cy - 28;
    s += `<rect class="box obox" x="${bx0}" y="${by}" width="${bw}" height="56" rx="6"/>`;
    s += `<rect class="bx-head" x="${bx0}" y="${by}" width="${bw}" height="17" rx="6"/><rect class="bx-head" x="${bx0}" y="${by + 9}" width="${bw}" height="8"/>`;
    const tLabel = LL.MOTION && LL.MOTION.includes(t) ? '' : t === 'CALL' ? ((LL.BRANDS[LL.brand] || LL.BRANDS.ll).call[LL.blockKinds[cell.block] === 'FC' ? 'FC' : 'FB']) : t;
    s += `<text class="bx-type" x="${bx0 + 7}" y="${by + 12.5}">${tLabel}</text>`;
    if (LL.TIMERS.includes(t)) {
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(cell.addr)}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 31}">PT ${fmtMs(cell.pt)}</text><text class="bx-l bx-v" data-v="et" x="${bx1 - 7}" y="${by + 31}" text-anchor="end">ET 0</text>`;
      s += `<rect class="bar-bg" x="${bx0 + 7}" y="${by + 40}" width="${bw - 30}" height="6" rx="3"/><rect class="bar-fg" data-v="bar" x="${bx0 + 7}" y="${by + 40}" width="0" height="6" rx="3"/>`;
      s += `<text class="bx-q" x="${bx1 - 7}" y="${by + 47}" text-anchor="end">Q</text>`;
    } else if (LL.COUNTERS.includes(t)) {
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(cell.addr)}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 33}">PV ${cell.pv}</text><text class="bx-l bx-v bx-big" data-v="cv" x="${bx1 - 7}" y="${by + 37}" text-anchor="end">0</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 49}">CV</text>`;
    } else if (LL.STRING_OPS && LL.STRING_OPS.includes(t)) {
      const l1 = t === 'SMOV' ? cell.src + ' →' : t === 'CONCAT' ? cell.a + ' + ' + cell.b : t === 'ITOS' ? cell.a + ' → ' + cell.n + ' digits' : cell.src + ' [' + cell.a + ',' + cell.b + ']';
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 32}">${esc(trunc(l1, 18))}</text><text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 48}">${esc(cell.dst)} = <tspan data-v="dst">''</tspan></text>`;
    } else if (t === 'MOV') {
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 32}">${esc(trunc(cell.src, 10))} →</text><text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 48}">${esc(cell.dst)} = <tspan data-v="dst">0</tspan></text>`;
    } else if (t === 'CALL') {
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${LL.blockKinds[cell.block] === 'FC' ? 'no instance' : esc(trunc(cell.inst || '?', 10))}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 31}" font-weight="700">${esc(trunc(cell.block || '(no block)', 16))}</text>`;
      const args = Object.keys(cell.args || {}).map((k) => k + '=' + cell.args[k]).join(' ');
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 47}">${esc(trunc(args || 'no parameters connected', 19))}</text>`;
    } else if (LL.MOTION && LL.MOTION.includes(t)) {
      const nm = (LL.brand === 'rk' ? { MC_POWER: 'MSO', MC_HOME: 'MAH', MC_ABS: 'MAM abs', MC_REL: 'MAM inc', MC_JOG: 'MAJ', MC_STOP: 'MAS', MC_RESET: 'MAFR', MC_SETPOS: 'MRP' } : { MC_POWER: 'MC_Power', MC_HOME: 'MC_Home', MC_ABS: 'MC_MoveAbs', MC_REL: 'MC_MoveRel', MC_JOG: 'MC_Jog', MC_STOP: 'MC_Stop', MC_RESET: 'MC_Reset', MC_SETPOS: 'MC_SetPos' })[t];
      s += `<rect class="bx-head" x="${bx0}" y="${by}" width="${bw}" height="17" rx="6"/><rect class="bx-head" x="${bx0}" y="${by + 9}" width="${bw}" height="8"/>`;
      s += `<text class="bx-type" x="${bx0 + 7}" y="${by + 12.5}">${nm}</text>`;
      if (cell.addr && !['MC_POWER', 'MC_JOG'].includes(t)) s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(cell.addr)}</text>`;
      const l1 = t === 'MC_POWER' ? cell.ax + ' enable' : t === 'MC_HOME' ? cell.ax + ' ref ' + cell.src : t === 'MC_ABS' ? cell.ax + ' → ' + cell.a + ' mm' : t === 'MC_REL' ? cell.ax + ' + ' + cell.a + ' mm' : t === 'MC_JOG' ? cell.ax + ' v ' + cell.a : t === 'MC_SETPOS' ? cell.ax + ' := ' + cell.a + ' mm' : cell.ax;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 31}">${esc(trunc(l1, 18))}</text>`;
      s += `<text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 47}">${['MC_ABS', 'MC_REL'].includes(t) ? 'v ' + esc(trunc(cell.b, 5)) + ' · ' : ''}<tspan data-v="mcst">…</tspan></text>`;
    } else if (t === 'PID') {
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 30}">PV ${esc(trunc(cell.a, 6))} SP ${esc(trunc(cell.b, 6))}</text>`;
      s += `<text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 46}">${esc(cell.dst)} = <tspan data-v="dst">0</tspan></text>`;
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">Kp ${cell.kp} Ti ${cell.ti}</text>`;
    } else if (t === 'SHRB') {
      const bits = LL.shiftBits(cell.addr, Math.abs(cell.n)) || [];
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(cell.addr)}${cell.n < 0 ? ' ◀' : ' ▶'}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 30}">DATA ${esc(trunc(cell.src, 6))}  N=${cell.n}</text>`;
      const shown = bits.slice(0, 16), sq = Math.min(9, (bw - 14) / Math.max(1, shown.length) - 1.5);
      shown.forEach((b, k) => { s += `<rect class="sr-bit" data-b="${b}" x="${bx0 + 7 + k * (sq + 1.5)}" y="${by + 39}" width="${sq}" height="9" rx="2"/>`; });
    } else {
      const op = { ADD: '+', SUB: '−', MUL: '×', DIV: '÷', MOD: 'mod', SHL: '«', SHR: '»' }[t];
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 32}">${esc(trunc(cell.a, 7))} ${op} ${esc(trunc(cell.b, 6))}</text><text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 48}">→ ${esc(cell.dst)} = <tspan data-v="dst">0</tspan></text>`;
    }
    return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${bx0}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${bx1}" y1="${cy}" x2="${xR}" y2="${cy}"/>`, sym: s, box: true };
  }

  /* How each brand names reusable blocks. Used by the block editor and the CALL box. */
  LL.BRANDS = {
    ll: { name: 'Ladder Lab', fb: 'FB', fc: 'FC', fbLong: 'FB: a block WITH memory. Every call has its own instance', fcLong: 'FC: a block WITHOUT memory. Only parameters and temporary values', inst: 'Instance name (its own memory)', dirs: { IN: 'IN', OUT: 'OUT', INOUT: 'INOUT' }, stat: 'static', temp: 'temporary', inside: '#Start', call: { FB: 'CALL FB', FC: 'CALL FC' },
      note: 'Ladder Lab uses the Siemens way of writing: #Name inside a block. Choose your brand above to see the same block in its words.' },
    tia: { name: 'Siemens TIA Portal', fb: 'FB', fc: 'FC', fbLong: 'FB (function block) with an instance data block', fcLong: 'FC (function): no instance DB, only Temp variables', inst: 'Instance DB (its own memory)', dirs: { IN: 'Input', OUT: 'Output', INOUT: 'InOut' }, stat: 'Static', temp: 'Temp', inside: '#Start', call: { FB: 'FB', FC: 'FC' },
      note: 'In the block interface you fill Input, Output, InOut, Static and Temp. Inside the block you write #Start, exactly as here. Every call of an FB needs an instance DB (Motor1_DB) that holds its Static memory. An FC has no instance DB: its Temp values are lost after each call.' },
    rk: { name: 'Rockwell Studio 5000', fb: 'AOI', fc: 'Routine', fbLong: 'Add-On Instruction (AOI): each call has its own backing tag', fcLong: 'Subroutine called with JSR, with input and return parameters', inst: 'Backing tag (its own memory)', dirs: { IN: 'Input', OUT: 'Output', INOUT: 'InOut' }, stat: 'Local tag', temp: 'Local tag (not kept)', inside: 'Start', call: { FB: 'AOI', FC: 'JSR' },
      note: 'An FB is an Add-On Instruction. You create a tag of the AOI type for every call (Motor1 : FB_Motor): that backing tag is its memory. Inside the AOI you write Start, without #. An FC is closest to a routine called with JSR (parameters in with SBR, out with RET).' },
    cds: { name: 'CODESYS', fb: 'FUNCTION_BLOCK', fc: 'FUNCTION', fbLong: 'FUNCTION_BLOCK: declare one instance per call in VAR', fcLong: 'FUNCTION: no instance and no memory', inst: 'Instance (declared in VAR)', dirs: { IN: 'VAR_INPUT', OUT: 'VAR_OUTPUT', INOUT: 'VAR_IN_OUT' }, stat: 'VAR', temp: 'VAR (temporary)', inside: 'Start', call: { FB: 'FB', FC: 'FUNC' },
      note: 'A FUNCTION_BLOCK is a type; you declare Motor1 : FB_Motor; in VAR and call Motor1 in the program. Inside you write Start, without #. A FUNCTION has no instance; its local VARs are fresh at every call.' },
  };
  Object.assign(LL.BRANDS, {
    sch: { name: 'Schneider Machine Expert', fb: 'FUNCTION_BLOCK', fc: 'FUNCTION', fbLong: 'FUNCTION_BLOCK (POU): declare one instance per call', fcLong: 'FUNCTION (POU): no instance, no memory', inst: 'Instance (declared in VAR)', dirs: { IN: 'VAR_INPUT', OUT: 'VAR_OUTPUT', INOUT: 'VAR_IN_OUT' }, stat: 'VAR', temp: 'VAR (temporary)', inside: 'Start', call: { FB: 'FB', FC: 'FUNC' },
      note: 'Machine Expert (M241, M251, M262 …) is based on CODESYS: blocks are POUs of type FUNCTION_BLOCK or FUNCTION, instances are declared in VAR, and inside you write Start without #. The small M221 (Machine Expert Basic) has no user function blocks: there you use subroutines (SRi).' },
    tc: { name: 'Beckhoff TwinCAT 3', fb: 'FUNCTION_BLOCK', fc: 'FUNCTION', fbLong: 'FUNCTION_BLOCK: one instance per call, declared in VAR', fcLong: 'FUNCTION: no instance, no memory', inst: 'Instance (declared in VAR)', dirs: { IN: 'VAR_INPUT', OUT: 'VAR_OUTPUT', INOUT: 'VAR_IN_OUT' }, stat: 'VAR', temp: 'VAR (temporary)', inside: 'Start', call: { FB: 'FB', FC: 'FUNC' },
      note: 'TwinCAT 3 is CODESYS-based too: FUNCTION_BLOCK with VAR_INPUT / VAR_OUTPUT, an instance per call (fbMotor1 : FB_Motor;), and names without #. Beckhoff style prefixes names with their type: bStart, nCount, fbMotor1.' },
    om: { name: 'Omron Sysmac Studio', fb: 'FB', fc: 'FUN', fbLong: 'Function block (FB): each call has its own instance variable', fcLong: 'Function (FUN): no instance, no memory', inst: 'Instance (a variable of the FB type)', dirs: { IN: 'Input', OUT: 'Output', INOUT: 'In-Out' }, stat: 'Internal variable', temp: 'Internal (FUN, not kept)', inside: 'Start', call: { FB: 'FB', FC: 'FUN' },
      note: 'Sysmac Studio (NJ / NX): you create function blocks (FB) and functions (FUN) with Input, Output, In-Out and Internal variables. Each FB call needs an instance (a variable of the FB type). FBs have EN / ENO in ladder. On the older CX-Programmer (CP1 / CJ), FBs exist too, with instances.' },
  });
  LL.brand = 'll';
  LL.blockKinds = {};

  /* The same element in every brand: used by the "Other brands" window and the brand lesson. */
  LL.BRAND_COLS = ['Ladder Lab', 'Siemens TIA Portal', 'Rockwell Studio 5000', 'Schneider Machine Expert (CODESYS)', 'Schneider M221 (Machine Expert Basic)', 'Beckhoff TwinCAT 3', 'Omron Sysmac Studio (NJ/NX)', 'Omron CX-Programmer (CP1/CJ)'];
  LL.BRAND_XREF = [
    ['NO contact', 'NO(I0.0)', '-| |-', 'XIC', '-| |-', 'LD / AND / OR', '-| |-', '-| |-', 'LD / AND / OR'],
    ['NC contact', 'NC(I0.0)', '-|/|-', 'XIO', '-|/|-', 'LDN / ANDN / ORN', '-|/|-', '-|/|-', 'LD NOT / AND NOT'],
    ['Rising edge', 'P(I0.0)', '-|P|- or R_TRIG', 'ONS (OSR)', '-|P|- or R_TRIG', 'LDR', 'R_TRIG', 'Upward differentiation -|↑|- , R_TRIG', '@LD, DIFU'],
    ['Falling edge', 'N(I0.0)', '-|N|- or F_TRIG', 'XIO + ONS (OSF)', '-|N|- or F_TRIG', 'LDF', 'F_TRIG', '-|↓|- , F_TRIG', '%LD, DIFD'],
    ['Coil', 'COIL(Q0.0)', '-( )-', 'OTE', '-( )-', 'ST', '-( )-', '-( )-', 'OUT'],
    ['Set / reset', 'SET / RST', '-(S)- / -(R)-', 'OTL / OTU', '-(S)- / -(R)-', 'S / R', '-(S)- / -(R)-', 'SET / RESET', 'SET / RSET (or KEEP)'],
    ['On-delay timer', 'TON(T0,3s)', 'TON (IEC_TIMER instance DB), PT T#3s', 'TON, PRE 3000 (ms)', 'TON, PT T#3S', '%TM0, type TON, base 1 s / 100 ms', 'TON (Tc2_Standard)', 'TON', 'TIM 0000 #30 (0.1 s units)'],
    ['Off-delay / pulse timer', 'TOF / TP', 'TOF / TP', 'TOF / (ONS + TON)', 'TOF / TP', '%TM type TOF / TP', 'TOF / TP', 'TOF / TP', '(TIM + logic)'],
    ['Retentive timer', 'RTO', 'TONR', 'RTO', '(own FB or library)', '(%TM + counter)', '(own FB)', 'AccumulationTimer', 'TTIM'],
    ['Timer done / elapsed', 'T0 (=T0.Q) / T0.ET', '"T0".Q / "T0".ET', 'T0.DN / T0.ACC', 'T0.Q / T0.ET', '%TM0.Q / %TM0.V', 'fbT0.Q / fbT0.ET', 'T0.Q / T0.ET', 'T0000 (done) / T0000 (PV)'],
    ['Up counter', 'CTU(C0,5)', 'CTU (IEC_COUNTER)', 'CTU, .ACC / .DN', 'CTU', '%C0', 'CTU', 'CTU', 'CNT (counts DOWN) / CNTR'],
    ['Compare', 'CMP(MW0>=5)', 'CMP >= box or contact', 'GEQ', 'GE (or >=)', '[%MW0 >= 5]', 'GE (or >=)', 'GE (or >=)', '>= (LD>=)'],
    ['Move / add', 'MOV / ADD', 'MOVE / ADD', 'MOV / ADD', 'MOVE / ADD', '[%MW0 := %MW1 + 1]', ':= / ADD', 'MOVE / ADD', 'MOV / + (binary)'],
    ['Input bit', 'I0.0', '%I0.0', 'Local:1:I.Data.0 (alias tag)', '%IX0.0', '%I0.0', 'bIn AT %I* (linked)', 'variable mapped in the I/O Map', '0.00 (CIO 0)'],
    ['Output bit', 'Q0.0', '%Q0.0', 'Local:2:O.Data.0', '%QX0.0', '%Q0.0', 'bOut AT %Q*', 'variable mapped in the I/O Map', '100.00 (CIO 100)'],
    ['Memory bit', 'M0.0', '%M0.0 (or a DB)', 'BOOL tag', '%MX0.0 or a variable', '%M0', 'a variable', 'a variable', 'W0.00 (H = kept)'],
    ['Word / double word', 'MW10 / MD20', '%MW10 / %MD20', 'INT / DINT tag', '%MW10 / %MD20', '%MW10 / %MD20', 'INT / DINT variable', 'INT / DINT variable', 'D10 / D20 (2 words)'],
    ['Analog input', 'AIW0 (0 … 27648)', '%IW64… (0 … 27648)', 'module channel (scaled in the module)', 'module variable', '%IW0.0 (0 … 1000 by default)', 'INT AT %I* (0 … 32767)', 'mapped variable', 'CIO word of the analog unit'],
    ['First scan', 'SM0.1', 'FirstScan bit or OB100', 'S:FS', 'own bit / first-cycle flag', '%S13', '_TaskInfo[].FirstCycle', 'P_First_RunMode', 'A200.11'],
    ['1 Hz clock', 'SM0.5', 'clock memory bit (e.g. %M0.5)', '(build it with a timer)', 'BLINK (Util)', '%S6', 'BLINK (Tc2_Utilities)', 'Get1sClk', 'P_1s'],
    ['Block with memory', 'FB (BLOCK)', 'FB + instance DB', 'Add-On Instruction', 'FUNCTION_BLOCK', '— (subroutines only)', 'FUNCTION_BLOCK', 'FB', 'FB'],
    ['Block without memory', 'FC', 'FC', 'Routine (JSR)', 'FUNCTION', 'Subroutine SRi', 'FUNCTION', 'FUN', 'Subroutine (SBS / SBN)'],
    ['Servo: move to a position', 'MC_ABS', 'MC_MoveAbsolute', 'MAM', 'MC_MoveAbsolute (SoftMotion)', 'MC_MoveAbs_PTO (pulse output)', 'MC_MoveAbsolute (Tc2_MC2)', 'MC_MoveAbsolute', 'PLS2 / positioning unit'],
    ['PID', 'PID', 'PID_Compact', 'PIDE / PID', 'PID (Util)', 'PID function', 'FB_CTRL_PID', 'PIDAT', 'PIDAT'],
    ['Structured Text', 'as ST', 'SCL', 'ST', 'ST', '— (ladder / IL)', 'ST', 'ST', 'ST (in FBs)'],
  ];
  LL.brandTableHTML = () => '<div class="tbl brand-xref"><table><tr>' + ['What'].concat(LL.BRAND_COLS).map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr>' + LL.BRAND_XREF.map((r) => '<tr>' + r.map((c, i) => (i ? '<td>' : '<td><b>') + esc(c) + (i ? '</td>' : '</b></td>')).join('') + '</tr>').join('') + '</table></div>';

  class LadderView {
    constructor(host, opts) {
      this.host = host;
      this.opts = opts || {};
      this.sel = null;
      this.activeRung = -1;
      host.classList.add('ladder');
      host.addEventListener('click', (e) => this._click(e));
    }

    setProgram(prog, tags) {
      this.prog = prog;
      this.tags = tags || {};
      this.build();
    }

    build() {
      if (this.prog && this.prog.blocks) this.prog.blocks.forEach((b) => (LL.blockKinds[b.name] = b.kind === 'FC' ? 'FC' : 'FB'));
      const prog = this.prog, ed = !!this.opts.editable, tags = this.tags;
      const C = prog.cols;
      const W = PADL + (C - 1) * CW + OW + PADR;
      const xR = PADL + (C - 1) * CW + OW;
      let y = 6;
      const out = [];
      this.parts = [];
      this.linkEls = [];
      this.rungY = [];
      prog.rungs.forEach((rung, i) => {
        const R = rung.rows;
        const h = HDR + R * RH;
        this.rungY.push([y, h]);
        out.push(`<g class="rung" data-rung="${i}">`);
        out.push(`<rect class="rung-bg" data-k="h,${i}" x="2" y="${y}" width="${W - 4}" height="${h}" rx="8"/>`);
        out.push(`<text class="rung-no" x="${PADL}" y="${y + 19}">${String(i + 1).padStart(2, '0')}</text>`);
        out.push(`<text class="rung-cm" x="${PADL + 26}" y="${y + 19}">${esc(trunc(rung.comment || (ed ? 'tap to add a comment' : ''), 60))}</text>`);
        if (ed) out.push(`<rect class="hit hit-h" data-k="h,${i}" x="2" y="${y}" width="${W - 4}" height="${HDR}"/>`);
        const top = y + HDR;
        out.push(`<line class="rail" x1="${PADL}" y1="${top + 4}" x2="${PADL}" y2="${top + R * RH - 4}"/>`);
        out.push(`<line class="rail rail-r" x1="${xR}" y1="${top + 4}" x2="${xR}" y2="${top + R * RH - 4}"/>`);
        for (let r = 0; r < R; r++) {
          const cy = top + r * RH + RH / 2;
          for (let c = 0; c < C; c++) {
            const x0 = PADL + c * CW, x1 = c === C - 1 ? xR : x0 + CW;
            const cell = rung.cells[r][c];
            if (ed) {
              if (!cell) out.push(`<rect class="ph${c === C - 1 ? ' ph-out' : ''}" x="${x0 + 6}" y="${cy - 22}" width="${x1 - x0 - 12}" height="44" rx="6"/>`);
            }
            if (cell) {
              const g = symbolSVG(cell, x0, x1, cy, tags, c === C - 1, xR);
              const id = `p${i}_${r}_${c}`;
              out.push(`<g class="el t-${cell.type}${g.box ? ' isbox' : ''}" id="${id}">${g.wi}${g.wo}${g.sym}</g>`);
              this.parts.push({ id, i, r, c, cell });
            }
            if (ed) out.push(`<rect class="hit" data-k="c,${i},${r},${c}" x="${x0}" y="${cy - RH / 2}" width="${x1 - x0}" height="${RH}"/>`);
          }
        }
        // vertical links
        for (let r = 0; r < R - 1; r++) for (let b = 1; b < C; b++) {
          if (!rung.links[r][b]) continue;
          const x = PADL + b * CW;
          const y1 = top + r * RH + RH / 2, y2 = y1 + RH;
          const id = `l${i}_${r}_${b}`;
          out.push(`<line class="w lk" id="${id}" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/><circle class="dot" cx="${x}" cy="${y1}" r="3"/><circle class="dot" cx="${x}" cy="${y2}" r="3"/>`);
          this.linkEls.push({ id, i, r, b });
        }
        out.push('</g>');
        y += h + GAP;
      });
      out.push(`<rect class="selbox" id="selbox" x="0" y="0" width="0" height="0" rx="7"/>`);
      const H = y + 4;
      this.W = W; this.H = H;
      this.host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ladder diagram">${out.join('')}</svg>`;
      this.svg = this.host.firstChild;
      // cache DOM
      this.parts.forEach((p) => {
        const g = this.svg.getElementById ? this.svg.getElementById(p.id) : this.svg.querySelector('#' + p.id);
        p.g = g; p.wi = g.querySelector('.wi'); p.wo = g.querySelector('.wo');
        p.et = g.querySelector('[data-v="et"]'); p.bar = g.querySelector('[data-v="bar"]');
        p.cv = g.querySelector('[data-v="cv"]'); p.dst = g.querySelector('[data-v="dst"]'); p.mcst = g.querySelector('[data-v="mcst"]');
        p.reg = [...g.querySelectorAll('[data-b]')];
        p.st = {};
      });
      this.linkEls.forEach((l) => { l.el = this.svg.querySelector('#' + l.id); l.st = -1; });
      this.rungBgs = [...this.svg.querySelectorAll('.rung-bg')];
      this.fit();
      this.drawSel();
      this.setActiveRung(this.activeRung);
    }

    fit() {
      if (!this.svg) return;
      const avail = this.host.clientWidth || this.W;
      let s = this.opts.fit || this.opts.zoom === 'fit' ? Math.min(1, avail / this.W) : Math.max(0.62, Math.min(1, avail / this.W));
      if (typeof this.opts.zoom === 'number') s = this.opts.zoom;
      this.svg.setAttribute('width', Math.round(this.W * s));
      this.svg.setAttribute('height', Math.round(this.H * s));
    }

    // live monitoring
    update(m, monitor) {
      if (!this.svg || !m || !m.trace) return;
      const on = monitor !== false;
      for (const p of this.parts) {
        const tr = m.trace[p.i];
        if (!tr) continue;
        const pin = on && tr.pin[p.r] ? tr.pin[p.r][p.c] : 0;
        const pout = on && tr.pout[p.r] ? tr.pout[p.r][p.c] : 0;
        const cell = p.cell;
        let active = 0;
        if (on) {
          switch (cell.type) {
            case 'NO': case 'P': active = m.bit(cell.addr); break;
            case 'NC': case 'N': active = m.bit(cell.addr) ? 0 : 1; break;
            case 'CMP': active = m.compare(cell.a, cell.op, cell.b) ? 1 : 0; break;
            case 'COIL': case 'SET': active = m.bit(cell.addr); break;
            case 'NCOIL': active = m.bit(cell.addr); break;
            case 'RST': active = pin; break;
            case 'TON': case 'TOF': case 'TP': case 'RTO': case 'CTU': case 'CTD': active = m.bit(cell.addr); break;
            default: active = pin;
          }
        }
        const st = p.st;
        if (st.pin !== pin) { p.wi && p.wi.classList.toggle('on', !!pin); st.pin = pin; }
        const wo = LL.isLogic(cell.type) ? pout : pin;
        if (st.wo !== wo) { p.wo && p.wo.classList.toggle('on', !!wo); st.wo = wo; }
        if (st.a !== active) { p.g.classList.toggle('act', !!active); st.a = active; }
        if (p.et) {
          const t = m.timerFor ? m.timerFor(cell.addr) : m.timers[+cell.addr.slice(1)];
          const et = on && t ? t.et : 0;
          if (st.et !== et) { p.et.textContent = 'ET ' + fmtMs(et); p.bar.setAttribute('width', Math.max(0, (cell.pt ? Math.min(1, et / cell.pt) : 0) * (+p.bar.parentNode.querySelector('.bar-bg').getAttribute('width')))); st.et = et; }
        }
        if (p.cv) { const v = on ? m.word(cell.addr + '.CV') : 0; if (st.cv !== v) { p.cv.textContent = v; st.cv = v; } }
        if (p.mcst) {
          const T = cell.type, ax = cell.ax;
          let v = '';
          if (on && m.axes) {
            if (T === 'MC_POWER') v = m.bit(ax + '.ERR') ? 'ERROR' : m.bit(ax + '.ON') ? 'ON' : 'off';
            else if (T === 'MC_JOG') v = 'pos ' + m.word(ax + '.POS');
            else { const tg = cell.addr; v = m.bit(tg + '.ERR') ? 'ERR' : m.bit(tg + '.BUSY') ? 'BUSY ' + m.word(ax + '.POS') : m.bit(tg + '.ABORT') ? 'ABORT' : m.bit(tg + '.DONE') ? 'DONE' : 'idle'; }
          }
          if (st.mcst !== v) { p.mcst.textContent = v; st.mcst = v; }
        }
        if (p.dst) { const v = LL.isStrAddr && LL.isStrAddr(cell.dst || '') ? (on && m.str ? "'" + trunc(m.str(cell.dst), 10) + "'" : "''") : on ? m.word(cell.dst) : 0; if (st.dst !== v) { p.dst.textContent = v; st.dst = v; } }
        if (p.reg && p.reg.length) { const v = on ? p.reg.map((r) => m.bit(r.dataset.b)).join('') : ''; if (st.reg !== v) { p.reg.forEach((r, k) => r.classList.toggle('on', v[k] === '1')); st.reg = v; } }
      }
      for (const l of this.linkEls) {
        const tr = m.trace[l.i];
        const v = on && tr && tr.node[l.r] ? tr.node[l.r][l.b] : 0;
        if (l.st !== v) { l.el.classList.toggle('on', !!v); l.st = v; }
      }
    }

    setActiveRung(i) {
      this.activeRung = i;
      if (!this.rungBgs) return;
      this.rungBgs.forEach((r, k) => r.classList.toggle('scan', k === i));
    }

    select(sel) { this.sel = sel; this.drawSel(); }
    drawSel() {
      const b = this.svg && this.svg.querySelector('#selbox');
      if (!b) return;
      const s = this.sel;
      if (!s || !this.prog.rungs[s.i]) { b.setAttribute('width', 0); return; }
      const [y, h] = this.rungY[s.i];
      const C = this.prog.cols;
      if (s.kind === 'rung') { b.setAttribute('x', 3); b.setAttribute('y', y + 1); b.setAttribute('width', this.W - 6); b.setAttribute('height', h - 2); return; }
      const x0 = PADL + s.c * CW, x1 = s.c === C - 1 ? PADL + (C - 1) * CW + OW : x0 + CW;
      b.setAttribute('x', x0 + 2); b.setAttribute('y', y + HDR + s.r * RH + 3);
      b.setAttribute('width', x1 - x0 - 4); b.setAttribute('height', RH - 6);
    }

    _click(e) {
      if (!this.opts.editable) return;
      const t = e.target.closest('[data-k]');
      if (!t) return;
      const k = t.getAttribute('data-k').split(',');
      if (k[0] === 'h') this.opts.onPick && this.opts.onPick({ kind: 'rung', i: +k[1] });
      else this.opts.onPick && this.opts.onPick({ kind: 'cell', i: +k[1], r: +k[2], c: +k[3] });
    }
  }

  LL.LadderView = LadderView;
  LL.LADDER_GEOM = { CW, OW, RH, HDR, PADL };
})(typeof window !== 'undefined' ? window : globalThis);
