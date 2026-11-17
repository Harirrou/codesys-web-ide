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
    TON: ['On-delay timer', 'Done bit turns on after the rung has been powered for PT.'],
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
    SHR: ['Shift right', 'OUT = IN shifted right by N bits (16-bit word). Each place = ÷2. Runs every scan while powered.'],
    CALL: ['Call a block', 'Runs a reusable block (FB) while the rung is true. Each call has an instance name: its own memory. Connect every parameter to an address of this machine.'],
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
    s += `<text class="bx-type" x="${bx0 + 7}" y="${by + 12.5}">${t}</text>`;
    if (LL.TIMERS.includes(t)) {
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(cell.addr)}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 31}">PT ${fmtMs(cell.pt)}</text><text class="bx-l bx-v" data-v="et" x="${bx1 - 7}" y="${by + 31}" text-anchor="end">ET 0</text>`;
      s += `<rect class="bar-bg" x="${bx0 + 7}" y="${by + 40}" width="${bw - 14}" height="6" rx="3"/><rect class="bar-fg" data-v="bar" x="${bx0 + 7}" y="${by + 40}" width="0" height="6" rx="3"/>`;
    } else if (LL.COUNTERS.includes(t)) {
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(cell.addr)}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 33}">PV ${cell.pv}</text><text class="bx-l bx-v bx-big" data-v="cv" x="${bx1 - 7}" y="${by + 37}" text-anchor="end">0</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 49}">CV</text>`;
    } else if (t === 'MOV') {
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 32}">${esc(trunc(cell.src, 10))} →</text><text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 48}">${esc(cell.dst)} = <tspan data-v="dst">0</tspan></text>`;
    } else if (t === 'CALL') {
      s += `<text class="bx-addr" x="${bx1 - 7}" y="${by + 12.5}">${esc(trunc(cell.inst || '?', 10))}</text>`;
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 31}" font-weight="700">${esc(trunc(cell.block || '(no block)', 16))}</text>`;
      const args = Object.keys(cell.args || {}).map((k) => k + '=' + cell.args[k]).join(' ');
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 47}">${esc(trunc(args || 'no parameters connected', 19))}</text>`;
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
      const op = { ADD: '+', SUB: '−', MUL: '×', DIV: '÷', SHL: '«', SHR: '»' }[t];
      s += `<text class="bx-l" x="${bx0 + 7}" y="${by + 32}">${esc(trunc(cell.a, 7))} ${op} ${esc(trunc(cell.b, 6))}</text><text class="bx-l bx-v" x="${bx0 + 7}" y="${by + 48}">→ ${esc(cell.dst)} = <tspan data-v="dst">0</tspan></text>`;
    }
    return { wi: `<line class="w wi" x1="${x0}" y1="${cy}" x2="${bx0}" y2="${cy}"/>`, wo: `<line class="w wo" x1="${bx1}" y1="${cy}" x2="${xR}" y2="${cy}"/>`, sym: s, box: true };
  }

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
        p.cv = g.querySelector('[data-v="cv"]'); p.dst = g.querySelector('[data-v="dst"]');
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
        if (p.dst) { const v = on ? m.word(cell.dst) : 0; if (st.dst !== v) { p.dst.textContent = v; st.dst = v; } }
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
