/* Ladder Lab — "Every machine has the same states": the PackML state model. Mounted in lessons through [[hw:packml]].
 * The 17 states as a map, the commands that are allowed right now, a small filling machine that reacts, and the
 * events of a real line (upstream empty, out of caps, guard door) so the difference between Hold, Suspend and
 * Abort becomes clear. "-ing" states do their work and move on by themselves. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};
  const STORE = 'll-hw-packml';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // id: [name, x, y, acting?, what the program does, stack light]
  const ST = {
    STOPPED: ['Stopped', 70, 292, 0, 'Everything has stopped, but the machine is still powered. It waits for Reset.', 'off'],
    RESETTING: ['Resetting', 70, 212, 1, 'Go to the home position, clear counters, check that everything is ready.', 'blue'],
    IDLE: ['Idle', 70, 130, 0, 'Ready. Nothing moves. The machine waits for Start.', 'blue'],
    STARTING: ['Starting', 200, 130, 1, 'Start conveyors and pumps in the right order, wait until they are up to speed.', 'green'],
    EXECUTE: ['Execute', 330, 130, 0, 'Production. The normal sequence runs and makes products.', 'green'],
    COMPLETING: ['Completing', 460, 130, 1, 'The order is done: run the last products out, stop the drives in order.', 'green'],
    COMPLETE: ['Complete', 585, 130, 0, 'The order is finished. The machine waits for Reset for the next one.', 'blue'],
    HOLDING: ['Holding', 460, 48, 1, 'Stop in a controlled way because of a problem inside this machine.', 'amber'],
    HELD: ['Held', 330, 48, 0, 'Stopped by an own problem (out of caps, operator pause). Waits for Unhold.', 'amber'],
    UNHOLDING: ['Unholding', 200, 48, 1, 'Get going again after the own problem is fixed.', 'amber'],
    SUSPENDING: ['Suspending', 460, 212, 1, 'Slow down in a controlled way because of a problem outside this machine.', 'amber'],
    SUSPENDED: ['Suspended', 330, 212, 0, 'Waiting for the line: no bottles from upstream, or downstream is full.', 'amber'],
    UNSUSPENDING: ['Unsuspending', 200, 212, 1, 'The line is free again: speed up and go on.', 'amber'],
    STOPPING: ['Stopping', 200, 292, 1, 'A normal stop from any state: finish the motion, switch everything off.', 'off'],
    CLEARING: ['Clearing', 330, 292, 1, 'After an abort: the fault is fixed and acknowledged, clear it.', 'red'],
    ABORTED: ['Aborted', 460, 292, 0, 'Stopped at once by a fault or E-stop. Nothing may move. Waits for Clear.', 'red'],
    ABORTING: ['Aborting', 585, 292, 1, 'Emergency reaction: stop everything as fast as is safe.', 'red'],
  };
  const NEXT = { RESETTING: 'IDLE', STARTING: 'EXECUTE', COMPLETING: 'COMPLETE', HOLDING: 'HELD', UNHOLDING: 'EXECUTE', SUSPENDING: 'SUSPENDED', UNSUSPENDING: 'EXECUTE', STOPPING: 'STOPPED', CLEARING: 'STOPPED', ABORTING: 'ABORTED' };
  const CMD = { Reset: { STOPPED: 'RESETTING', COMPLETE: 'RESETTING' }, Start: { IDLE: 'STARTING' }, Hold: { EXECUTE: 'HOLDING' }, Unhold: { HELD: 'UNHOLDING' }, Suspend: { EXECUTE: 'SUSPENDING' }, Unsuspend: { SUSPENDED: 'UNSUSPENDING' }, Clear: { ABORTED: 'CLEARING' } };
  const NOSTOP = ['STOPPED', 'STOPPING', 'ABORTING', 'ABORTED', 'CLEARING'], NOABORT = ['ABORTING', 'ABORTED'];
  const ARROWS = [['STOPPED', 'RESETTING', 'Reset'], ['RESETTING', 'IDLE', ''], ['IDLE', 'STARTING', 'Start'], ['STARTING', 'EXECUTE', ''], ['EXECUTE', 'COMPLETING', 'done'], ['COMPLETING', 'COMPLETE', ''], ['EXECUTE', 'HOLDING', 'Hold'], ['HOLDING', 'HELD', ''], ['HELD', 'UNHOLDING', 'Unhold'], ['UNHOLDING', 'EXECUTE', ''], ['EXECUTE', 'SUSPENDING', 'Suspend'], ['SUSPENDING', 'SUSPENDED', ''], ['SUSPENDED', 'UNSUSPENDING', 'Unsuspend'], ['UNSUSPENDING', 'EXECUTE', ''], ['STOPPING', 'STOPPED', ''], ['ABORTING', 'ABORTED', ''], ['ABORTED', 'CLEARING', 'Clear'], ['CLEARING', 'STOPPED', '']];
  const LIGHT = { off: '#9aa3ae', blue: '#3b82f6', green: '#22c55e', amber: '#f5a524', red: '#ef4444' };
  const CHECKS = [
    ['cycle', 'A whole order: Reset, Start, let it fill 12 bottles, Complete, Reset again'],
    ['hold', 'Out of caps: the machine holds itself. Fix it and Unhold'],
    ['susp', 'No bottles from upstream: the machine suspends. Bottles come back: it goes on'],
    ['abort', 'Open the guard door in production: Aborted. Then Clear, Reset, and back to Idle'],
    ['stop', 'Press Stop while it produces, and bring it back to Idle'],
  ];
  const CSS = `
.hw-packml{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px;margin:16px 0}
.hwk-h{font-size:1.05rem;font-weight:700;margin-bottom:8px}
.hwk-map{background:var(--surface-2);border-radius:10px;padding:6px;overflow-x:auto}.hwk-map svg{display:block;width:100%;min-width:560px;height:auto}
.hwk-now{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;border-left:4px solid var(--info);background:var(--surface-2);border-radius:8px;padding:9px 12px;margin:10px 0}
.hwk-now i{display:block;width:26px;height:26px;border-radius:50%;border:3px solid #9aa3ae}.hwk-now b{font-size:1.05rem}.hwk-now p{margin:2px 0 0;font-size:.92rem;line-height:1.4}
.hwk-cmd{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.hwk-cmd button{border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;font-size:.88rem;cursor:pointer;min-height:42px}
.hwk-cmd button.can{border-color:var(--power-bright);background:var(--power-soft)}.hwk-cmd button:disabled{opacity:.38;cursor:not-allowed}.hwk-cmd button.red.can{border-color:var(--danger);background:var(--danger-soft)}
.hwk-ev{display:flex;gap:6px;flex-wrap:wrap}.hwk-ev button{border:1px dashed var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:7px 12px;font:inherit;font-size:.84rem;font-weight:600;cursor:pointer;min-height:38px}.hwk-ev button.on{border-style:solid;border-color:#f5a524;background:#f5a52422}
.hwk-sec{font-family:var(--f-display);letter-spacing:.08em;text-transform:uppercase;font-size:.8rem;color:var(--muted);margin:12px 0 6px;display:flex;justify-content:space-between}
.hwk-fill{font-family:var(--f-mono);font-size:.88rem;margin:6px 0}.hwk-fill span{display:inline-block;width:14px;height:20px;border-radius:3px 3px 5px 5px;border:1.5px solid var(--line);margin-right:3px;vertical-align:middle}.hwk-fill span.f{background:#3b82f6;border-color:#3b82f6}
.hwk-chk{display:grid;gap:6px}.hwk-chk div{background:var(--surface-2);border-radius:8px;padding:6px 10px;font-size:.86rem}.hwk-chk div.ok{background:var(--power-soft)}.hwk-chk div::before{content:"○ ";color:var(--muted)}.hwk-chk div.ok::before{content:"✓ ";color:var(--power)}`;

  LL.HW.packml = function (ph) {
    if (!document.getElementById('hw-packml-css')) { const st = document.createElement('style'); st.id = 'hw-packml-css'; st.textContent = CSS; document.head.appendChild(st); }
    let done = {}; try { done = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { done = {}; }
    const S = { st: 'STOPPED', acc: 0, n: 0, fillAcc: 0, caps: true, up: true, door: false, trail: [], msg: 'The machine is Stopped. Press Reset to get it ready.' };
    const box = document.createElement('div'); box.className = 'hw-box hw-packml';
    box.innerHTML = `<div class="hwk-h">One state model for every machine (PackML)</div><div class="hwk-map"></div>
      <div class="hwk-now"><i></i><div><b></b><p></p></div></div>
      <div class="hwk-sec"><span>Commands (green = allowed now)</span></div><div class="hwk-cmd"></div>
      <div class="hwk-sec"><span>Things that happen on a real line</span></div><div class="hwk-ev"><button data-e="caps">Out of caps (own problem)</button><button data-e="up">No bottles from upstream</button><button data-e="door">Guard door opened</button></div>
      <div class="hwk-fill"></div><div class="hwk-sec"><span>Try these</span><span class="hwk-prog"></span></div><div class="hwk-chk"></div>`;
    ph.replaceWith(box);
    const $ = (q) => box.querySelector(q);
    const mark = (k) => { if (!done[k]) { done[k] = 1; try { localStorage.setItem(STORE, JSON.stringify(done)); } catch (e) { /* private mode */ } checks(); } };
    function checks() { $('.hwk-chk').innerHTML = CHECKS.map(([k, t]) => `<div class="${done[k] ? 'ok' : ''}">${esc(t)}</div>`).join(''); $('.hwk-prog').textContent = CHECKS.filter(([k]) => done[k]).length + ' / ' + CHECKS.length; }
    const can = (c) => (c === 'Stop' ? !NOSTOP.includes(S.st) : c === 'Abort' ? !NOABORT.includes(S.st) : !!(CMD[c] && CMD[c][S.st]));
    function go(st, why) {
      S.trail.push(st); if (S.trail.length > 30) S.trail.shift(); S.st = st; S.acc = 0; if (why) S.msg = why;
      const tr = S.trail.join('>');
      if (st === 'IDLE') { if (/COMPLETE>RESETTING>IDLE$/.test(tr)) mark('cycle'); if (/ABORTED>CLEARING>STOPPED>RESETTING>IDLE$/.test(tr)) mark('abort'); if (S.stopped && /STOPPED>RESETTING>IDLE$/.test(tr)) { mark('stop'); S.stopped = 0; } }
      if (st === 'EXECUTE') { if (/HELD>UNHOLDING>EXECUTE$/.test(tr) && S.autoHold) { mark('hold'); S.autoHold = 0; } if (/SUSPENDED>UNSUSPENDING>EXECUTE$/.test(tr) && S.autoSusp) { mark('susp'); S.autoSusp = 0; } }
      render();
    }
    function map() {
      const W = 96, H = 34, c = (id) => [ST[id][1], ST[id][2]];
      let g = '<defs><marker id="hwk-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="context-stroke"/></marker></defs>';
      ARROWS.forEach(([a, b, lab]) => {
        const [x1, y1] = c(a), [x2, y2] = c(b), hot = S.st === a && (lab ? can(lab) || lab === 'done' : true), dx = x2 - x1, dy = y2 - y1, hx = Math.abs(dx) > Math.abs(dy);
        const sx = x1 + (hx ? Math.sign(dx) * W / 2 : 0), sy = y1 + (hx ? 0 : Math.sign(dy) * H / 2), ex = x2 - (hx ? Math.sign(dx) * (W / 2 + 2) : 0), ey = y2 - (hx ? 0 : Math.sign(dy) * (H / 2 + 2));
        if (a === 'CLEARING') { g += `<path d="M${x1} ${y1 + H / 2} V${y1 + 32} H${x2} V${y2 + H / 2 + 2}" stroke="${hot ? 'var(--power-bright)' : 'var(--line)'}" stroke-width="${hot ? 2 : 1.2}" marker-end="url(#hwk-a)"/>`; return; }
        g += `<path d="M${sx} ${sy} L${ex} ${ey}" stroke="${hot ? 'var(--power-bright)' : 'var(--line)'}" stroke-width="${hot ? 2 : 1.2}" marker-end="url(#hwk-a)"/>`;
        if (lab) g += `<text x="${(sx + ex) / 2 + (hx ? 0 : 5)}" y="${(sy + ey) / 2 + (hx ? -5 : 3)}" font-size="9" text-anchor="${hx ? 'middle' : 'start'}" fill="${hot ? 'var(--power)' : 'var(--muted)'}" stroke="none" font-weight="${hot ? 700 : 500}">${lab}</text>`;
      });
      Object.keys(ST).forEach((id) => {
        const [n, x, y, act, , li] = ST[id], on = S.st === id;
        g += `<rect x="${x - W / 2}" y="${y - H / 2}" width="${W}" height="${H}" rx="${act ? 17 : 6}" fill="${on ? LIGHT[li] : 'var(--surface)'}" stroke="${on ? LIGHT[li] : 'currentColor'}" stroke-width="${on ? 2.5 : 1.2}"${act ? ' stroke-dasharray="' + (on ? 'none' : '4 3') + '"' : ''}/><text x="${x}" y="${y + 4}" font-size="11" font-weight="${on ? 700 : 600}" text-anchor="middle" fill="${on ? '#fff' : 'currentColor'}" stroke="none">${n}</text>`;
        if (on && act) g += `<rect x="${x - W / 2 + 8}" y="${y + H / 2 - 6}" width="${(W - 16) * Math.min(1, S.acc / 1.4)}" height="3" rx="1.5" fill="#fff" stroke="none"/>`;
      });
      g += `<text x="328" y="344" font-size="9.5" text-anchor="middle" fill="var(--muted)" stroke="none">Stop works from almost every state → Stopping.   Abort works from every state → Aborting.   Round = the machine is doing something, square = it waits.</text>`;
      $('.hwk-map').innerHTML = `<svg viewBox="0 0 656 352" fill="none" stroke="currentColor" font-family="IBM Plex Sans, sans-serif" role="img" aria-label="PackML state model">${g}</svg>`;
    }
    function render() {
      map(); const s = ST[S.st];
      $('.hwk-now i').style.background = LIGHT[s[5]]; $('.hwk-now i').style.borderColor = LIGHT[s[5]];
      $('.hwk-now b').textContent = s[0] + (S.st === 'EXECUTE' ? ' (producing)' : s[3] ? ' (the machine is working on it)' : ' (waiting)'); $('.hwk-now p').textContent = S.msg + ' ' + s[4];
      $('.hwk-cmd').innerHTML = ['Reset', 'Start', 'Hold', 'Unhold', 'Suspend', 'Unsuspend', 'Stop', 'Clear', 'Abort'].map((c) => `<button data-c="${c}" class="${can(c) ? 'can' : ''}${c === 'Abort' || c === 'Stop' ? ' red' : ''}" ${can(c) ? '' : 'disabled'}>${c}</button>`).join('');
      box.querySelectorAll('[data-e]').forEach((b) => { const k = b.dataset.e, on = k === 'door' ? S.door : !S[k]; b.classList.toggle('on', on); b.textContent = k === 'caps' ? (S.caps ? 'Out of caps (own problem)' : 'Caps refilled') : k === 'up' ? (S.up ? 'No bottles from upstream' : 'Bottles are back') : S.door ? 'Close the guard door' : 'Guard door opened'; });
      $('.hwk-fill').innerHTML = 'Order: ' + Array.from({ length: 12 }, (_, i) => `<span class="${i < S.n ? 'f' : ''}"></span>`).join('') + ' ' + S.n + ' / 12 bottles';
    }
    let last = 0;
    const loop = (now) => {
      if (!document.body.contains(box)) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
      if (NEXT[S.st]) { S.acc += dt; if (S.acc >= 1.4) { if (S.st === 'RESETTING') S.n = 0; go(NEXT[S.st], ''); } else map(); }
      else if (S.st === 'EXECUTE') {
        if (!S.caps) { S.autoHold = 1; go('HOLDING', 'The capper is empty: a problem inside this machine, so the program gives itself the Hold command.'); }
        else if (!S.up) { S.autoSusp = 1; go('SUSPENDING', 'No bottles arrive: a problem outside this machine, so the program gives itself the Suspend command.'); }
        else { S.fillAcc += dt; if (S.fillAcc >= 0.5) { S.fillAcc = 0; S.n++; if (S.n >= 12) go('COMPLETING', 'The order of 12 bottles is done.'); else render(); } }
      } else if (S.st === 'SUSPENDED' && S.up && S.autoSusp) go('UNSUSPENDING', 'Bottles arrive again: the program unsuspends by itself. No operator is needed.');
      requestAnimationFrame(loop);
    };
    box.addEventListener('click', (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.c) {
        const c = t.dataset.c; if (!can(c)) return;
        if (c === 'Unhold' && !S.caps) { S.msg = 'Unhold refused: the capper is still empty. Refill the caps first.'; return render(); }
        if ((c === 'Clear' || c === 'Reset') && S.door) { S.msg = c + ' refused: the guard door is still open.'; return render(); }
        if (c === 'Stop') { S.stopped = S.st === 'EXECUTE' ? 1 : S.stopped; return go('STOPPING', 'Stop command from the operator.'); }
        if (c === 'Abort') return go('ABORTING', 'Abort command.');
        go(CMD[c][S.st], c + ' command.');
      } else if (t.dataset.e) {
        const k = t.dataset.e;
        if (k === 'door') { S.door = !S.door; if (S.door && !NOABORT.includes(S.st)) return go('ABORTING', 'The guard door was opened: the safety system stops the machine and the program goes to Aborting.'); S.msg = S.door ? 'The door is open.' : 'The door is closed again. Now Clear, then Reset.'; }
        else { S[k] = !S[k]; S.msg = k === 'caps' ? (S.caps ? 'Caps refilled. If the machine is Held, press Unhold: an own problem needs a person to confirm.' : 'The cap hopper runs empty.') : S.up ? 'Upstream delivers bottles again.' : 'The machine before this one has stopped: no bottles arrive.'; }
        render();
      }
    });
    render(); checks(); requestAnimationFrame(loop);
  };
})();
