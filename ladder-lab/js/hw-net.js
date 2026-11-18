/* Ladder Lab — Network simulator: IP addresses, subnets, device names, device files.
 * Mounted in lessons through [[hw:net]] (LL.HW.net). The learner fixes the classic start-up faults of an
 * industrial Ethernet network and sees WHY each one breaks communication: different subnet, duplicate IP,
 * missing / wrong PROFINET device name, missing device description file (GSDML / EDS), mask mismatch.
 * Two modes: PROFINET (devices found by NAME, the PLC hands out the IP) and EtherNet/IP (devices found by IP). */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};

  const STORE = 'll-hw-net';
  const NS = 'http://www.w3.org/2000/svg';
  const DEVS = ['laptop', 'plc', 'hmi', 'io', 'drive'];
  const IOD = ['io', 'drive'];
  const isIO = (k) => k === 'io' || k === 'drive';
  const NAME = { laptop: 'Your laptop', plc: 'PLC_1', hmi: 'HMI_1', io: 'Remote I/O', drive: 'Drive (third-party)' };
  const SHORT = { laptop: 'your laptop', plc: 'PLC_1', hmi: 'HMI_1', io: 'Remote I/O', drive: 'drive' };
  const PR = {
    pn: { label: 'PROFINET', brands: 'Siemens, CODESYS, …', file: 'GSDML', ioOk: 'Cyclic I/O every 4 ms (update time).' },
    eip: { label: 'EtherNet/IP', brands: 'Rockwell, Omron, …', file: 'EDS', ioOk: 'I/O connection open, RPI 10 ms.' },
  };
  const ROLE = {
    laptop: { pn: 'Programming PC', eip: 'Programming PC' },
    plc: { pn: 'Controller · IO controller', eip: 'Controller · scanner' },
    hmi: { pn: 'Operator panel', eip: 'Operator panel' },
    io: { pn: 'IO device', eip: 'Adapter (I/O module)' },
    drive: { pn: 'IO device · other brand', eip: 'Adapter · other brand' },
  };
  const CONNS = ['lp', 'hp', 'io', 'drive'];
  const CL = { lp: 'Laptop ↔ PLC (online access)', hp: 'HMI ↔ PLC', io: 'PLC ↔ Remote I/O', drive: 'PLC ↔ Drive' };
  const CLS = { lp: 'Laptop ↔ PLC', hp: 'HMI ↔ PLC', io: 'PLC ↔ Remote I/O', drive: 'PLC ↔ Drive' };
  const CHIP = { ok: 'OK', name: 'name mismatch', dup: 'duplicate IP', subnet: 'different subnet', nofile: 'no device file', mask: 'mask mismatch', invalid: 'invalid IP', ipmis: 'IP mismatch', wait: 'waiting' };
  // Subnet colours: a hue derived from the network address (ip AND mask). No pure red / green (those mean fault / OK).
  const HUES = [212, 285, 28, 182, 328, 50, 255];

  const ICON = {
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    plc: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M13 4v16M16 8h2M16 11.5h2"/>',
    hmi: '<rect x="3" y="4" width="18" height="13" rx="2"/><rect x="6" y="7" width="8.5" height="7" rx="1"/><path d="M17.5 8.5h.5M17.5 12h.5M9 21h6M12 17v4"/>',
    io: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 10.5h6M9 14h6"/><circle cx="12" cy="18" r=".6"/>',
    drive: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="10" r="3.6"/><path d="M12 6.4v7.2M8.4 10h7.2M9 18h6"/>',
  };
  const icon = (k) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';

  /* ───────── start state (= the mission) ───────── */
  function start() {
    return {
      proto: 'pn',
      ip: { laptop: '192.168.1.10', plc: '192.168.0.1', hmi: '192.168.0.1', io: '192.168.0.20', drive: '192.168.0.30' },
      mask: { laptop: 24, plc: 24, hmi: 24, io: 24, drive: 24 },
      pn: {
        name: { io: 'io-station-1', drive: 'vfd-conveyor' },
        devName: { io: '', drive: 'vfd-1' },
        devIp: { io: '0.0.0.0', drive: '192.168.2.30' },
        devMask: { io: 24, drive: 24 },
        file: { io: true, drive: false },
      },
      eip: {
        devIp: { io: '0.0.0.0', drive: '192.168.2.30' },
        devMask: { io: 24, drive: 24 },
        file: { io: true, drive: false },
      },
      ping: 'plc',
      cap: '',
    };
  }
  function merge(dst, src) {
    Object.keys(dst).forEach((k) => {
      if (!src || !(k in src)) return;
      const a = dst[k], b = src[k];
      if (a && typeof a === 'object') { if (b && typeof b === 'object') merge(a, b); }
      else if (typeof a === typeof b) dst[k] = b;
    });
  }
  function load() {
    const s = start();
    try { const raw = JSON.parse(localStorage.getItem(STORE) || 'null'); if (raw && typeof raw === 'object') merge(s, raw); } catch (e) { /* ignore */ }
    if (s.proto !== 'pn' && s.proto !== 'eip') s.proto = 'pn';
    DEVS.forEach((k) => { if (s.mask[k] !== 16 && s.mask[k] !== 24) s.mask[k] = 24; });
    ['pn', 'eip'].forEach((p) => IOD.forEach((k) => { if (s[p].devMask[k] !== 16 && s[p].devMask[k] !== 24) s[p].devMask[k] = 24; }));
    if (['plc', 'hmi', 'io', 'drive'].indexOf(s.ping) < 0) s.ping = 'plc';
    return s;
  }

  /* ───────── IP maths ───────── */
  const maskN = (p) => (p === 16 ? 0xffff0000 : 0xffffff00) >>> 0;
  const maskStr = (p) => (p === 16 ? '255.255.0.0' : '255.255.255.0');
  const ntoa = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  function parseIp(s) {
    const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(String(s == null ? '' : s));
    if (!m) return null;
    const p = m.slice(1, 5).map(Number);
    if (p.some((x) => x > 255)) return { bad: true };
    return { p, n: ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0 };
  }
  // Can a device use this address with this mask? -> { ok, n, net, why }
  function check(s, prefix) {
    const t = String(s == null ? '' : s).trim(), a = parseIp(t);
    if (!t) return { ok: false, why: 'the IP is empty' };
    if (!a) return { ok: false, why: 'an IP is 4 numbers with dots, like 192.168.0.10' };
    if (a.bad) return { ok: false, why: 'each of the 4 numbers must be 0 to 255' };
    if (a.n === 0) return { ok: false, none: true, why: 'no IP address yet (0.0.0.0)' };
    if (a.p[0] === 0 || a.p[0] === 127 || a.p[0] >= 224) return { ok: false, why: a.p[0] + '.x.x.x is reserved, not for devices' };
    const m = maskN(prefix), hm = ~m >>> 0, host = (a.n & hm) >>> 0, net = (a.n & m) >>> 0;
    if (host === 0) return { ok: false, n: a.n, net, why: t + ' is the street itself (network address), not a house' };
    if (host === hm) return { ok: false, n: a.n, net, why: t + ' is the broadcast address (all houses)' };
    return { ok: true, n: a.n, net };
  }
  const hueOf = (net, prefix) => HUES[((net >>> (32 - prefix)) + prefix * 3) % HUES.length];
  const local = (a, b) => (((a.n ^ b.n) & maskN(a.mask)) >>> 0) === 0;
  function reach(a, b) { const ab = local(a, b), ba = local(b, a); return ab && ba ? 'ok' : !ab && !ba ? 'subnet' : 'mask'; }
  function split(ipS, prefix) { const p = ipS.split('.'); const k = prefix === 16 ? 2 : 3; return [p.slice(0, k).join('.'), p.slice(k).join('.')]; }
  const list = (ks) => ks.map((k) => NAME[k]).join(' and ');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nameOk = (s) => s.length > 0 && s.length <= 240 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(s);

  /* ───────── the rules ───────── */
  // What each device really has on the wire right now.
  function nodes(st) {
    const D = st[st.proto], o = {};
    DEVS.forEach((k) => {
      const io = isIO(k), ip = String(io ? D.devIp[k] : st.ip[k]).trim(), mk = io ? D.devMask[k] : st.mask[k];
      o[k] = Object.assign({ k, ip, mask: mk }, check(ip, mk));
    });
    return o;
  }
  function dups(N) {
    const d = {};
    DEVS.forEach((k) => (d[k] = DEVS.filter((o) => o !== k && N[k].ok && N[o].ok && N[o].n === N[k].n)));
    return d;
  }
  const bad = (code, why) => ({ ok: false, code, why });
  function subnetWhy(a, A, b, B) {
    return NAME[a] + ' ' + A.ip + '/' + A.mask + ' is in network ' + ntoa(A.net) + '; ' + NAME[b] + ' ' + B.ip + '/' + B.mask + ' is in ' + ntoa(B.net) + '. Different street, no router.';
  }
  function maskWhy(a, A, b, B) {
    const ab = local(A, B), x = ab ? a : b, X = ab ? A : B, y = ab ? b : a, Y = ab ? B : A;
    return NAME[x] + ' (/' + X.mask + ') thinks ' + NAME[y] + ' is on its street, but ' + NAME[y] + ' (/' + Y.mask + ') does not. The replies of ' + NAME[y] + ' get lost.';
  }
  // Laptop or HMI talking to the PLC (plain IP traffic).
  function pair(N, dup, a, b) {
    const A = N[a], B = N[b];
    if (!A.ok) return bad('invalid', NAME[a] + ': ' + A.why + '.');
    if (dup[a].length) return bad('dup', A.ip + ' is used by ' + NAME[a] + ' and ' + list(dup[a]) + '.');
    if (!B.ok) return bad('wait', NAME[b] + ' has no valid IP: ' + B.why + '.');
    const r = reach(A, B);
    if (r === 'subnet') return bad('subnet', subnetWhy(a, A, b, B));
    if (r === 'mask') return bad('mask', maskWhy(a, A, b, B));
    if (dup[b].length) return bad('wait', NAME[b] + ' shares its IP ' + B.ip + ' with ' + list(dup[b]) + '. Fix that first.');
    return { ok: true, code: 'ok', why: '' };
  }
  // PLC <-> IO device (PROFINET: by name; EtherNet/IP: by IP).
  function ioConn(st, N, dup, k) {
    const pr = st.proto, D = st[pr], F = PR[pr].file;
    if (!D.file[k]) return bad('nofile', 'No ' + F + ' file installed yet, so the PLC cannot exchange data with this device.');
    if (pr === 'pn') {
      const pn = String(st.pn.name[k]).trim(), dn = st.pn.devName[k];
      if (!nameOk(pn)) return bad('name', 'The project name "' + pn + '" is not a valid PROFINET name.');
      if (!dn) return bad('name', 'The device has no name yet. The PLC calls "' + pn + '" and nobody answers.');
      if (dn !== pn) return bad('name', 'The PLC calls "' + pn + '", but the device is named "' + dn + '".');
    }
    const C = N.plc;
    if (!C.ok) return bad('wait', 'PLC_1 has no valid IP: ' + C.why + '.');
    if (dup.plc.length) return bad('wait', 'PLC_1 shares its IP ' + C.ip + ' with ' + list(dup.plc) + '. Fix that first.');
    const J = Object.assign({ k, ip: String(st.ip[k]).trim(), mask: st.mask[k] }, check(st.ip[k], st.mask[k]));
    if (!J.ok) return bad('invalid', 'IP in the project: ' + J.why + '.');
    const clash = DEVS.filter((o) => o !== k && N[o].ok && N[o].n === J.n);
    if (clash.length) return bad('dup', J.ip + ' (project IP) is already used by ' + list(clash) + '.');
    const r = reach(J, C);
    if (r === 'subnet') return bad('subnet', subnetWhy(k, J, 'plc', C));
    if (r === 'mask') return bad('mask', maskWhy(k, J, 'plc', C));
    if (pr === 'eip') {
      const E = N[k];
      if (!E.ok || E.n !== J.n) return bad('ipmis', E.none ? 'The device has no IP yet (0.0.0.0). The PLC opens its connection to ' + J.ip + ' and nobody answers.' : 'The PLC opens its connection to ' + J.ip + ', but the device has ' + E.ip + '.');
      if (reach(E, C) !== 'ok') return bad('mask', 'The device has mask /' + E.mask + ', the project says /' + J.mask + '. Set the IP again.');
    }
    return { ok: true, code: 'ok', why: '' };
  }
  // Evaluate everything. In PROFINET a connected device takes its project IP from the PLC (pushed to `assigned`).
  function evaluate(st, assigned) {
    for (let pass = 0; ; pass++) {
      const N = nodes(st), dup = dups(N);
      const conn = { lp: pair(N, dup, 'laptop', 'plc'), hp: pair(N, dup, 'hmi', 'plc'), io: ioConn(st, N, dup, 'io'), drive: ioConn(st, N, dup, 'drive') };
      let changed = false;
      if (st.proto === 'pn' && pass < 3) {
        IOD.forEach((k) => {
          const ip = String(st.ip[k]).trim();
          if (conn[k].ok && (st.pn.devIp[k] !== ip || st.pn.devMask[k] !== st.mask[k])) {
            st.pn.devIp[k] = ip; st.pn.devMask[k] = st.mask[k]; changed = true;
            if (assigned && assigned.indexOf(k) < 0) assigned.push(k);
          }
        });
      }
      if (changed) continue;
      const nOk = CONNS.filter((c) => conn[c].ok).length;
      const status = {};
      const from = (c) => (c.ok ? { code: 'ok', why: '' } : { code: c.code, why: c.why });
      status.laptop = from(conn.lp); status.hmi = from(conn.hp); status.io = from(conn.io); status.drive = from(conn.drive);
      status.plc = !N.plc.ok ? { code: 'invalid', why: 'PLC_1: ' + N.plc.why + '.' } : dup.plc.length ? { code: 'dup', why: N.plc.ip + ' is also used by ' + list(dup.plc) + '.' } : { code: 'ok', why: nOk + ' of 4 connections work.' };
      const D = st[st.proto];
      const mis = {
        lp: conn.lp.ok,
        nodup: !DEVS.some((k) => dup[k].length || status[k].code === 'dup'),
        hp: conn.hp.ok,
        file: D.file.io && D.file.drive,
        io: conn.io.ok,
        drive: conn.drive.ok,
      };
      return { N, dup, conn, status, nOk, mis, done: Object.keys(mis).every((m) => mis[m]) };
    }
  }
  // Colour of the cable from a device to the switch.
  function cable(ev, k) {
    const s = ev.status[k];
    if (k === 'plc') return s.code !== 'ok' ? 'bad' : ev.nOk ? 'ok' : 'idle';
    return s.code === 'ok' ? 'ok' : s.code === 'wait' ? 'idle' : 'bad';
  }

  /* ───────── layout of the picture ───────── */
  const LAY = {
    wide: { W: 680, H: 292, pos: { laptop: [100, 46], plc: [340, 46], hmi: [580, 46], io: [215, 244], drive: [465, 244] }, bw: { laptop: 150, plc: 150, hmi: 150, io: 180, drive: 190 }, sw: [340, 146, 176, 38], px: { laptop: -56, plc: 0, hmi: 56, io: -40, drive: 40 } },
    narrow: { W: 340, H: 304, pos: { laptop: [57, 42], plc: [170, 42], hmi: [283, 42], io: [87, 258], drive: [253, 258] }, bw: { laptop: 106, plc: 106, hmi: 106, io: 158, drive: 158 }, sw: [170, 150, 150, 36], px: { laptop: -48, plc: 0, hmi: 48, io: -34, drive: 34 } },
  };

  /* ───────── CSS (once) ───────── */
  const CSS = `
.hw-net{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px 16px 16px;margin:18px 0;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;color:var(--ink)}
.hw-net button,.hw-net input,.hw-net select{scroll-margin:84px 0 130px}
.hw-net p{margin:0;max-width:none}
.hwn-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.hwn-eb{font-family:var(--f-mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.hwn-ttl{font-family:var(--f-display);font-weight:700;font-size:1.3rem;line-height:1.15;margin-top:3px;text-wrap:balance}
.hwn-hr{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.hwn-prog{font-family:var(--f-mono);font-size:.76rem;color:var(--muted);white-space:nowrap}
.hwn-proto{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:12px}
.hwn-proto button{min-height:48px;border:0;border-radius:9px;background:transparent;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:4px 8px;font-weight:700;font-size:.98rem;color:var(--ink-2);line-height:1.2}
.hwn-proto button small{font-weight:500;font-size:.75rem;color:var(--muted)}
.hwn-proto button:hover{color:var(--ink)}
.hwn-proto button[aria-pressed="true"]{background:var(--surface);color:var(--ink);box-shadow:0 0 0 1.5px var(--ink),0 2px 6px rgba(0,0,0,.12)}
.hwn-intro{font-size:.95rem;color:var(--ink-2);line-height:1.5}
.hwn-intro b{color:var(--ink)}
.hwn-topo{background:var(--surface-2);border:1px solid var(--line-2);border-radius:12px;overflow:hidden}
.hwn-topo svg{display:block;width:100%;height:auto}
.hwn-legend{display:flex;flex-wrap:wrap;gap:4px 16px;padding:8px 12px;border-top:1px solid var(--line-2);font-size:.78rem;color:var(--ink-2);background:var(--surface)}
.hwn-legend span{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.hwn-lc{width:20px;height:4px;border-radius:2px;display:inline-block}
.hwn-lc.ok{background:var(--power-bright)}.hwn-lc.idle{background:var(--muted);opacity:.5}
.hwn-lc.bad{background:repeating-linear-gradient(90deg,var(--danger) 0 6px,transparent 6px 9px)}
.hwn-ld{width:10px;height:10px;border-radius:50%;display:inline-block}
.hwn-ld.io{background:var(--accent-bg)}.hwn-ld.hmi{background:var(--info)}.hwn-ld.ping{background:var(--ink)}.hwn-ld.set{background:#9a5cf0}
.hwn-svg .hwn-cab{fill:none;stroke-width:4;stroke-linecap:round;stroke:var(--muted);stroke-opacity:.45;transition:stroke .3s,stroke-opacity .3s}
.hwn-svg .hwn-cab.ok{stroke:var(--power-bright);stroke-opacity:1}
.hwn-svg .hwn-cab.bad{stroke:var(--danger);stroke-opacity:1;stroke-dasharray:9 6}
.hwn-svg .hwn-box{fill:var(--surface);stroke:var(--line);stroke-width:1.5;transition:stroke .3s}
.hwn-svg .hwn-node.ok .hwn-box{stroke:var(--power-bright);stroke-width:2}
.hwn-svg .hwn-node.bad .hwn-box{stroke:var(--danger);stroke-width:2}
.hwn-svg .hwn-nm{font:700 13.5px var(--f-body);fill:var(--ink);text-anchor:middle}
.hwn-svg .hwn-ip{font:600 12px var(--f-mono);fill:var(--ink-2);text-anchor:middle}
.hwn-svg .hwn-ip.bad{fill:var(--danger)}
.hwn-svg .hwn-ip.none,.hwn-svg .hwn-dn.none{fill:var(--muted);font-style:italic}
.hwn-svg .hwn-dn{font:500 11px var(--f-mono);fill:var(--ink-2);text-anchor:middle}
.hwn-svg.n .hwn-nm{font-size:12.5px}.hwn-svg.n .hwn-ip{font-size:11px}.hwn-svg.n .hwn-dn{font-size:10.5px}
.hwn-svg .hwn-swr{fill:var(--surface-3);stroke:var(--line);stroke-width:1.5}
.hwn-svg .hwn-swt{font:700 12.5px var(--f-display);letter-spacing:.14em;fill:var(--ink-2);text-anchor:middle}
.hwn-svg .hwn-port{fill:var(--muted);opacity:.5}
.hwn-svg .hwn-port.ok{fill:var(--power-bright);opacity:1}
.hwn-svg .hwn-port.bad{fill:var(--danger);opacity:1}
.hwn-svg .hwn-pk circle{stroke:var(--surface);stroke-width:1.5}
.hwn-svg .hwn-pk.io circle{fill:var(--accent-bg)}
.hwn-svg .hwn-pk.hmi circle,.hwn-svg .hwn-pk.on circle{fill:var(--info)}
.hwn-svg .hwn-pk.ping circle{fill:var(--ink)}
.hwn-svg .hwn-pk.set circle{fill:#9a5cf0}
.hwn-svg .hwn-pk text{font:700 10.5px var(--f-mono);fill:var(--ink);text-anchor:middle;paint-order:stroke;stroke:var(--surface-2);stroke-width:3px;stroke-linejoin:round}
.hwn-svg .hwn-x circle{fill:var(--danger);stroke:var(--surface);stroke-width:2}
.hwn-svg .hwn-x path{stroke:#fff;stroke-width:2.4;stroke-linecap:round;fill:none}
.hwn-street{display:flex;gap:12px;align-items:flex-start;background:var(--surface-2);border:1px solid var(--line-2);border-left:4px solid var(--info);border-radius:10px;padding:10px 12px;font-size:.92rem;line-height:1.5}
.hwn-street svg{width:26px;height:26px;flex:none;color:var(--info);margin-top:1px}
.hwn-street .hwn-ex{display:inline-flex;margin:4px 0 0}
.hwn-addr{font-family:var(--f-mono);font-size:.9rem;color:var(--ink);white-space:nowrap}
.hwn-sp{padding:1px 4px;border-radius:4px;border-bottom:2.5px solid}
.hwn-hp{padding:1px 3px}
.hwn-cards{display:grid;gap:12px}
.hwn-g3{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:12px}
.hwn-g2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:12px;align-items:start}
.hwn-card{border:1px solid var(--line);border-top:4px solid var(--line);border-radius:12px;background:var(--surface);padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;align-content:start;min-width:0}
.hwn-card.ok{border-top-color:var(--power-bright)}.hwn-card.bad{border-top-color:var(--danger)}
.hwn-ch{display:flex;align-items:center;gap:10px;min-width:0}
.hwn-ic{width:38px;height:38px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line-2);display:grid;place-items:center;flex:none;color:var(--ink-2)}
.hwn-ic svg{width:22px;height:22px}
.hwn-cn{flex:1;min-width:0;line-height:1.25}
.hwn-cn b{display:block;font-size:1rem}
.hwn-cn small{color:var(--muted);font-size:.8rem}
.hw-net .hwn-chip{white-space:nowrap;font-weight:600;padding:1px 9px;margin:0 7px 0 0;vertical-align:1px;font-size:.78rem}
.hw-net .chip.hwn-bad{background:var(--danger-soft);color:var(--danger)}
.hw-net .chip.hwn-idle{background:var(--surface-3);color:var(--ink-2)}
.hwn-why{font-size:.87rem;color:var(--ink);line-height:1.5;border-radius:8px;padding:7px 9px;background:var(--danger-soft)}
.hwn-why .chip.hwn-bad{background:var(--danger);color:#fff}
.hwn-why .chip.ok{background:var(--power);color:#fff}
.hwn-why.ok{background:var(--power-soft)}.hwn-why.idle{background:var(--surface-2)}
.hwn-fl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:8px}
.hwn-f{display:grid;gap:3px;min-width:0}
.hwn-f>span{font-size:.76rem;color:var(--muted);font-weight:600}
.hw-net input.hwn-in,.hw-net select.hwn-sel{width:100%;min-width:0;min-height:40px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);padding:6px 9px}
.hw-net input.hwn-in{font-family:var(--f-mono);font-size:.95rem}
.hw-net select.hwn-sel{font-size:.88rem;cursor:pointer}
.hw-net input.hwn-in.bad{border-color:var(--danger);background:var(--danger-soft)}
.hwn-net{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:.8rem;color:var(--muted);min-height:22px}
.hwn-net.err{color:var(--danger);font-weight:600}
.hwn-vr{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.hwn-val{flex:1 1 130px;min-height:38px;display:flex;align-items:center;font-family:var(--f-mono);font-size:.9rem;background:var(--surface-2);border:1px dashed var(--line);border-radius:8px;padding:5px 9px;min-width:0;overflow-wrap:anywhere}
.hwn-val.none{color:var(--muted);font-style:italic;font-family:var(--f-body);font-size:.85rem}
.hwn-val.diff{border-color:var(--danger);border-style:solid}
.hwn-val.same{border-color:var(--power);border-style:solid}
.hwn-note{font-size:.78rem;color:var(--muted);line-height:1.4}
.hwn-file{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;justify-content:space-between;border-radius:9px;padding:8px 10px;background:var(--surface-2);font-size:.86rem}
.hwn-file.miss{background:var(--danger-soft);border:1px solid var(--danger)}
.hwn-file b{display:block;font-size:.9rem}
.hwn-file small{color:var(--ink-2)}
.hwn-file .hwn-okt{color:var(--power);font-weight:700}
.hwn-sec{border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;background:var(--surface);min-width:0;align-content:start}
.hwn-sh{font-family:var(--f-display);font-weight:700;font-size:1.1rem;letter-spacing:.02em;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hwn-sh small{font-family:var(--f-body);font-weight:500;font-size:.8rem;color:var(--muted);letter-spacing:0}
.hwn-pr{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.hwn-pr select.hwn-sel{flex:1 1 200px;width:100%}
.hwn-pr .btn{min-height:40px;min-width:92px}
.hwn-term{margin:0;font-family:var(--f-mono);font-size:.82rem;line-height:1.55;background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:8px 10px;white-space:pre-wrap;overflow-wrap:anywhere;min-height:3.4em;color:var(--ink)}
.hwn-term:empty::before{content:'Pick a device and press Ping. The result appears here.';color:var(--muted);font-family:var(--f-body)}
.hwn-term .c{color:var(--muted)}.hwn-term .g{color:var(--power)}.hwn-term .r{color:var(--danger)}
.hwn-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}
.hw-net .hwn-list{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.hw-net .hwn-list li{display:flex;gap:10px;align-items:flex-start;margin:0;max-width:none;line-height:1.35}
.hwn-list li>div{min-width:0}
.hwn-list b{font-weight:600;font-size:.92rem}
.hwn-list small{display:block;color:var(--ink-2);font-size:.82rem;margin-top:1px}
.hwn-st{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:.78rem;font-weight:700;line-height:1}
.hwn-st.ok{background:var(--power);color:#fff}
.hwn-st.bad{background:var(--danger);color:#fff}
.hwn-st.idle{background:var(--surface-3);color:var(--ink-2)}
.hwn-mis li.done span:last-child{color:var(--ink)}
.hwn-mis li span:last-child{font-size:.92rem;color:var(--ink-2)}
.hwn-win{border-radius:10px;padding:10px 12px;background:var(--power-soft);border:1px solid var(--power);font-size:.92rem;line-height:1.45}
.hwn-win b{color:var(--power)}
.hwn-cap{position:sticky;bottom:10px;z-index:5;background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--accent-bg);border-radius:12px;padding:9px 12px 10px;box-shadow:0 6px 22px rgba(0,0,0,.16)}
.hwn-cap .hwn-ct{font-family:var(--f-display);text-transform:uppercase;letter-spacing:.1em;font-size:.8rem;font-weight:700;color:var(--accent)}
.hwn-cap p{margin:2px 0 0;font-size:.95rem;line-height:1.45}
.hwn-cap.flash{animation:hwn-flash .9s ease-out}
@keyframes hwn-flash{0%{box-shadow:0 0 0 4px rgba(255,176,46,.55),0 6px 22px rgba(0,0,0,.16)}100%{box-shadow:0 0 0 0 rgba(255,176,46,0),0 6px 22px rgba(0,0,0,.16)}}
@media (max-width:820px){.hwn-cap{bottom:calc(var(--tabbar-h, 62px) + 8px + env(safe-area-inset-bottom,0px))}.hw-net button,.hw-net input,.hw-net select{scroll-margin:84px 0 200px}}
@media (max-width:600px){.hw-net{padding:12px;gap:12px}.hwn-ttl{font-size:1.18rem}.hw-net input.hwn-in{font-size:16px}.hw-net select.hwn-sel{font-size:15px}.hwn-cap{padding:8px 10px}.hwn-cap .hwn-ct{display:inline;margin-right:6px;font-size:.74rem}.hwn-cap p{display:inline;font-size:.9rem;line-height:1.4}}
@media (prefers-reduced-motion:reduce){.hwn-cap.flash{animation:none}}
`;
  function injectCss() {
    if (document.getElementById('hw-net-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-net-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ───────── the widget ───────── */
  LL.HW.net = function (ph) {
    injectCss();
    let st = load();
    const root = document.createElement('div');
    root.className = 'hw-box hw-net';
    root.innerHTML = `
<div class="hwn-head">
  <div><div class="hwn-eb">Network simulator</div><div class="hwn-ttl">Set up the network: IP addresses, subnets, device names, device files</div></div>
  <div class="hwn-hr"><button class="btn small ghost" data-a="reset" title="Back to the start of the mission">↺ Reset</button><span class="hwn-prog"></span></div>
</div>
<div class="hwn-proto" role="group" aria-label="Network protocol">
  <button type="button" data-proto="pn">PROFINET<small>${PR.pn.brands}</small></button>
  <button type="button" data-proto="eip">EtherNet/IP<small>${PR.eip.brands}</small></button>
</div>
<p class="hwn-intro"></p>
<div class="hwn-topo"><div class="hwn-svgw"></div>
  <div class="hwn-legend">
    <span><i class="hwn-lc ok"></i>data flows</span><span><i class="hwn-lc idle"></i>idle / waiting</span><span><i class="hwn-lc bad"></i>fault blocks it</span>
    <span><i class="hwn-ld io"></i>cyclic I/O</span><span><i class="hwn-ld hmi"></i>HMI / online</span><span><i class="hwn-ld ping"></i>ping</span><span><i class="hwn-ld set"></i>setup (DCP / BOOTP)</span>
  </div>
</div>
<div class="hwn-street">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
  <div><b>How to read an IP address.</b> Mask 255.255.255.0: the first three numbers are the street, the last one is the house number. Only houses on the same street can talk without a router. (Mask 255.255.0.0: the first two numbers are the street.) <b>Same colour = same street.</b>
  <div class="hwn-ex"></div></div>
</div>
<div class="hwn-cards"></div>
<div class="hwn-sec hwn-ping">
  <div class="hwn-sh">Ping from your laptop <small>Ping tests only the IP layer: "can this address answer?"</small></div>
  <div class="hwn-pr"><select class="hwn-sel" aria-label="Ping target"></select><button class="btn small primary" data-a="ping">Ping</button></div>
  <pre class="hwn-term" aria-live="polite"></pre>
</div>
<div class="hwn-two">
  <div class="hwn-sec"><div class="hwn-sh">Connections</div><ul class="hwn-list hwn-conns"></ul></div>
  <div class="hwn-sec"><div class="hwn-sh">Mission <small class="hwn-prog2"></small></div><ul class="hwn-list hwn-mis"></ul><div class="hwn-win" hidden></div></div>
</div>
<div class="hwn-cap" aria-live="polite"><div class="hwn-ct">What happened</div><p></p></div>`;
    ph.replaceWith(root);

    const $ = (s) => root.querySelector(s);
    const svgW = $('.hwn-svgw'), cardsEl = $('.hwn-cards'), capP = $('.hwn-cap p'), capBox = $('.hwn-cap');
    const pingSel = $('.hwn-ping select'), term = $('.hwn-term');
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let lastEv = null, busy = false, raf = 0, visible = true, G = null, layName = '', pkL = null, fxL = null;
    let pend = null, capT = 0;
    const flights = [], obs = [];
    const lastSpawn = {}, dirs = {};

    const save = () => { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* private mode */ } };

    /* ── captions ── */
    function say(text) {
      st.cap = text; save();
      capP.textContent = text;
      capBox.classList.remove('flash'); void capBox.offsetWidth; capBox.classList.add('flash');
    }
    function introCap() {
      return 'This machine does not start: 5 faults block its network. Red cables show where to look. Start with the ping tool, then fix the red cards one by one.';
    }
    function consequences(b, a, assigned) {
      const up = [], down = [];
      CONNS.forEach((c) => {
        if (!b.conn[c].ok && a.conn[c].ok) up.push(CLS[c]);
        else if (b.conn[c].ok && !a.conn[c].ok) down.push(CLS[c] + ' (' + CHIP[a.conn[c].code] + ')');
      });
      let s = '';
      if (up.length) s += 'Now working: ' + up.join(', ') + '.';
      if (assigned && assigned.length) s += ' The PLC gave ' + assigned.map((k) => SHORT[k] + ' its project IP ' + String(st.ip[k]).trim()).join(' and ') + '.';
      if (down.length) s += ' Stopped: ' + down.join(', ') + '.';
      return s.trim();
    }
    function capEdit(k, kind, b, a, assigned) {
      const s = a.status[k], io = isIO(k), who = io ? 'The project IP of ' + SHORT[k] : NAME[k];
      let s1 = '';
      if (kind === 'ip') {
        const ipS = String(st.ip[k]).trim(), c = check(ipS, st.mask[k]);
        if (!c.ok) s1 = '"' + (ipS || ' ') + '" cannot be used: ' + c.why + '.';
        else if (s.code === 'dup') s1 = s.why + ' Two devices with one address: replies get mixed up.';
        else if (b.status[k].code === 'dup') s1 = NAME[k] + ' now has its own address, ' + ipS + '. No more duplicate: each address points to one device again.';
        else { const sp = split(ipS, st.mask[k]); s1 = who + ' is now ' + ipS + ': street ' + sp[0] + ', house ' + sp[1] + '.'; }
      } else if (kind === 'mask') {
        const m = st.mask[k];
        s1 = NAME[k] + ' now uses mask ' + maskStr(m) + ' (/' + m + '): the first ' + (m === 24 ? 'three numbers are' : 'two numbers are') + ' the street.';
      } else if (kind === 'name') {
        const n = String(st.pn.name[k]).trim();
        if (!nameOk(n)) s1 = '"' + n + '" is not a valid PROFINET name. Use small letters, digits, "-" and "." only (like a web address).';
        else if (n === st.pn.devName[k]) s1 = 'The name in the project now matches the name stored in the device ("' + n + '").';
        else s1 = 'The PLC will now look for a device named "' + n + '".';
      }
      let s2 = consequences(b, a, assigned);
      if (!s2 && s.code !== 'ok' && !(kind === 'ip' && (s.code === 'dup' || !check(st.ip[k], st.mask[k]).ok))) s2 = 'Still a problem: ' + s.why;
      if (!s2 && s.code === 'ok' && b.status[k].code === 'ok') s2 = 'The connections did not change.';
      return (s1 + ' ' + s2).trim();
    }
    function editStart(k, kind) {
      if (pend && (pend.k !== k || pend.kind !== kind)) flush();
      if (!pend) pend = { k, kind, base: lastEv, assigned: [] };
      clearTimeout(capT); capT = setTimeout(flush, 900);
    }
    function flush() {
      clearTimeout(capT);
      if (!pend) return;
      const p = pend; pend = null;
      say(capEdit(p.k, p.kind, p.base, lastEv, p.assigned));
    }

    /* ── evaluate + paint ── */
    function refresh() {
      const assigned = [];
      const prev = lastEv;
      lastEv = evaluate(st, assigned);
      if (pend) assigned.forEach((k) => { if (pend.assigned.indexOf(k) < 0) pend.assigned.push(k); });
      paint();
      save();
      assigned.forEach((k) => { if (G) fly('plc', k, 'set', 'IP', 1000); });
      return { prev, ev: lastEv, assigned };
    }

    /* ── topology picture ── */
    function boxH(k) { return st.proto === 'pn' && isIO(k) ? 64 : 48; }
    function buildTopo() {
      const w = svgW.clientWidth || root.clientWidth || 700;
      const nm = w < 520 ? 'narrow' : 'wide', L = LAY[nm];
      layName = nm;
      flights.splice(0).forEach((f) => f.res(null));
      const [sx, sy, sw, sh] = L.sw;
      G = { L, anchor: {}, port: {}, cab: {}, len: {}, swc: { x: sx, y: sy } };
      let cabs = '', ports = '', nodesH = '';
      DEVS.forEach((k) => {
        const [x, y] = L.pos[k], top = y < sy, bh = boxH(k), bw = L.bw[k];
        const A = { x, y: top ? y + bh / 2 : y - bh / 2 }, P = { x: sx + L.px[k], y: top ? sy - sh / 2 : sy + sh / 2 };
        G.anchor[k] = A; G.port[k] = P;
        const my = (A.y + P.y) / 2;
        cabs += `<path class="hwn-cab" data-c="${k}" d="M${A.x} ${A.y} C${A.x} ${my} ${P.x} ${my} ${P.x} ${P.y}"/>`;
        ports += `<rect class="hwn-port" data-p="${k}" x="${P.x - 5}" y="${top ? P.y : P.y - 5}" width="10" height="5" rx="1"/>`;
        const three = bh === 64, yN = three ? -12 : -5, yI = three ? 5 : 12, yD = 21;
        const label = nm === 'narrow' && k === 'laptop' ? 'Your laptop' : NAME[k];
        nodesH += `<g class="hwn-node" data-n="${k}" transform="translate(${x} ${y})">
          <rect class="hwn-box" x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="10"/>
          <text class="hwn-nm" y="${yN}">${esc(label)}</text>
          <text class="hwn-ip" y="${yI}"></text>
          ${three ? `<text class="hwn-dn" y="${yD}"></text>` : ''}
          <rect class="hwn-strip" x="${-bw / 2 + 12}" y="${bh / 2 - 6}" width="${bw - 24}" height="3" rx="1.5"/>
        </g>`;
      });
      svgW.innerHTML = `<svg class="hwn-svg ${nm === 'narrow' ? 'n' : ''}" viewBox="0 0 ${L.W} ${L.H}" role="img" aria-label="Network picture: a switch in the middle, with cables to your laptop, PLC_1, HMI_1, the Remote I/O and the drive.">
        <g>${cabs}</g><g class="hwn-pkl"></g>
        <g><rect class="hwn-swr" x="${sx - sw / 2}" y="${sy - sh / 2}" width="${sw}" height="${sh}" rx="8"/><text class="hwn-swt" x="${sx}" y="${sy + 4.5}">SWITCH</text>${ports}</g>
        <g>${nodesH}</g><g class="hwn-fxl"></g></svg>`;
      pkL = svgW.querySelector('.hwn-pkl'); fxL = svgW.querySelector('.hwn-fxl');
      DEVS.forEach((k) => { G.cab[k] = svgW.querySelector('[data-c="' + k + '"]'); G.len[k] = G.cab[k].getTotalLength(); });
      if (lastEv) paintTopo();
    }
    function paintTopo() {
      if (!G) return;
      const ev = lastEv;
      DEVS.forEach((k) => {
        const c = cable(ev, k);
        G.cab[k].setAttribute('class', 'hwn-cab ' + c);
        svgW.querySelector('[data-p="' + k + '"]').setAttribute('class', 'hwn-port ' + c);
        const g = svgW.querySelector('[data-n="' + k + '"]');
        g.setAttribute('class', 'hwn-node ' + c);
        const N = ev.N[k], ipT = g.querySelector('.hwn-ip');
        if (isIO(k) && N.none) { ipT.textContent = 'no IP yet'; ipT.setAttribute('class', 'hwn-ip none'); }
        else { ipT.textContent = N.ip || '—'; ipT.setAttribute('class', 'hwn-ip' + (N.ok ? '' : ' bad')); }
        const dn = g.querySelector('.hwn-dn');
        if (dn) { const v = st.pn.devName[k]; dn.textContent = v ? 'name: ' + v : 'no name'; dn.setAttribute('class', 'hwn-dn' + (v ? '' : ' none')); }
        const strip = g.querySelector('.hwn-strip');
        if (N.ok) { const h = hueOf(N.net, N.mask); strip.setAttribute('style', 'fill:hsl(' + h + ',72%,50%)'); }
        else strip.setAttribute('style', 'fill:var(--line)');
      });
    }

    /* ── packets ── */
    function legs(a, b) {
      const out = [], pA = a === 'sw' ? G.swc : G.port[a], pB = b === 'sw' ? G.swc : G.port[b];
      if (a !== 'sw') out.push({ k: a, rev: false, len: G.len[a] });
      out.push({ p0: pA, p1: pB, len: Math.hypot(pB.x - pA.x, pB.y - pA.y) });
      if (b !== 'sw') out.push({ k: b, rev: true, len: G.len[b] });
      return out;
    }
    function ptAt(a, b, s) {
      const L = legs(a, b), tot = L.reduce((t, l) => t + l.len, 0);
      let d = Math.max(0, Math.min(1, s)) * tot;
      for (let i = 0; i < L.length; i++) {
        const l = L[i];
        if (d <= l.len || i === L.length - 1) {
          d = Math.min(d, l.len);
          if (l.k) { const p = G.cab[l.k].getPointAtLength(l.rev ? l.len - d : d); return { x: p.x, y: p.y }; }
          const t = l.len ? d / l.len : 0;
          return { x: l.p0.x + (l.p1.x - l.p0.x) * t, y: l.p0.y + (l.p1.y - l.p0.y) * t };
        }
        d -= l.len;
      }
      return G.swc;
    }
    function fly(a, b, cls, label, dur, stopAt, conn) {
      return new Promise((res) => {
        if (!G || !pkL) { res(null); return; }
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'hwn-pk ' + cls);
        const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', label ? 6 : 4.5); g.appendChild(c);
        if (label) { const t = document.createElementNS(NS, 'text'); t.setAttribute('y', -10); t.textContent = label; g.appendChild(t); }
        const f = { a, b, g, t0: performance.now(), dur: reduce ? 0 : dur, stop: stopAt || 1, res, conn };
        const p = ptAt(a, b, 0); g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
        if (!reduce) pkL.appendChild(g);
        flights.push(f);
        if (!raf) raf = requestAnimationFrame(tick);
      });
    }
    function markX(p) {
      if (!p || !fxL) return;
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'hwn-x'); g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
      g.innerHTML = '<circle r="10"/><path d="M-4 -4L4 4M4 -4L-4 4"/>';
      fxL.appendChild(g);
    }
    const clearX = () => { if (fxL) fxL.textContent = ''; };
    const SP = [
      { c: 'io', a: 'plc', b: 'io', cls: 'io', every: 430 },
      { c: 'drive', a: 'plc', b: 'drive', cls: 'io', every: 430 },
      { c: 'hp', a: 'hmi', b: 'plc', cls: 'hmi', every: 950 },
      { c: 'lp', a: 'laptop', b: 'plc', cls: 'on', every: 1500 },
    ];
    function tick(now) {
      raf = 0;
      if (!document.body.contains(root)) { flights.splice(0).forEach((f) => f.res(null)); obs.forEach((o) => o.disconnect()); return; }
      if (lastEv && G && !reduce && visible && !document.hidden) {
        SP.forEach((sp) => {
          if (!lastEv.conn[sp.c].ok) return;
          if (now - (lastSpawn[sp.c] || 0) < sp.every) return;
          lastSpawn[sp.c] = now; dirs[sp.c] = !dirs[sp.c];
          fly(dirs[sp.c] ? sp.a : sp.b, dirs[sp.c] ? sp.b : sp.a, sp.cls, '', 1150, 1, sp.c);
        });
      }
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        if (f.conn && !(lastEv && lastEv.conn[f.conn].ok)) { f.g.remove(); flights.splice(i, 1); f.res(null); continue; }
        const u = f.dur ? Math.min(1, (now - f.t0) / f.dur) : 1;
        const p = ptAt(f.a, f.b, u * f.stop);
        f.g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
        if (u >= 1) { f.g.remove(); flights.splice(i, 1); f.res(p); }
      }
      const want = flights.length || (!reduce && visible && lastEv && CONNS.some((c) => lastEv.conn[c].ok));
      if (want) raf = requestAnimationFrame(tick);
    }
    const kick = () => { if (!raf && document.body.contains(root)) raf = requestAnimationFrame(tick); };
    const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

    /* ── device cards ── */
    function cardHTML(k) {
      const pr = st.proto, io = isIO(k);
      const maskSel = `<select class="hwn-sel" data-f="mask" data-k="${k}" aria-label="Subnet mask of ${esc(NAME[k])}"><option value="24">255.255.255.0 (/24)</option><option value="16">255.255.0.0 (/16)</option></select>`;
      let h = `<div class="hwn-card" data-card="${k}">
        <div class="hwn-ch"><span class="hwn-ic">${icon(k)}</span><div class="hwn-cn"><b>${esc(NAME[k])}</b><small>${ROLE[k][pr]}</small></div></div>
        <p class="hwn-why"><span class="chip hwn-chip"></span><span class="hwn-wt"></span></p>
        ${io ? '<div class="hwn-file" data-v="file"></div>' : ''}
        <div class="hwn-fl">
          <label class="hwn-f"><span>${io ? 'IP in the project' : 'IP address'}</span><input class="hwn-in" data-f="ip" data-k="${k}" value="${esc(st.ip[k])}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="15"></label>
          <label class="hwn-f"><span>Subnet mask</span>${maskSel}</label>
        </div>
        <div class="hwn-net" data-v="net"></div>`;
      if (io) {
        h += `<div class="hwn-f"><span>${pr === 'pn' ? 'IP in the device now' : 'IP set in the device'}</span><div class="hwn-vr"><span class="hwn-val" data-v="devip"></span>${pr === 'eip' ? `<button class="btn small" data-a="bootp" data-k="${k}">Set IP (BOOTP/DHCP tool)</button>` : ''}</div>
          <span class="hwn-note">${pr === 'pn' ? 'In PROFINET the PLC sets this IP, once the name matches.' : 'In EtherNet/IP the PLC finds the device by this IP. It must equal the IP in the project.'}</span></div>`;
        if (pr === 'pn') {
          h += `<label class="hwn-f"><span>Name in the project</span><input class="hwn-in" data-f="name" data-k="${k}" value="${esc(st.pn.name[k])}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="60"></label>
          <div class="hwn-f"><span>Name stored in the device</span><div class="hwn-vr"><span class="hwn-val" data-v="devname"></span><button class="btn small" data-a="assign" data-k="${k}">Assign name</button></div>
          <span class="hwn-note">"Assign name" works even when the IP is wrong: it uses DCP, which finds the device by its MAC address (layer 2).</span></div>`;
        }
      }
      return h + '</div>';
    }
    function buildCards() {
      // Same order as the picture: laptop, PLC, HMI on top; the two IO devices below.
      cardsEl.innerHTML = '<div class="hwn-g3">' + ['laptop', 'plc', 'hmi'].map(cardHTML).join('') + '</div><div class="hwn-g2">' + IOD.map(cardHTML).join('') + '</div>';
      DEVS.forEach((k) => { cardsEl.querySelector('select[data-k="' + k + '"]').value = String(st.mask[k]); });
    }
    function netHTML(ipS, prefix) {
      const c = check(ipS, prefix);
      if (!c.ok && c.n == null) return null;
      const sp = split(ipS.trim(), prefix), h = hueOf(c.net, prefix);
      return '<span class="hwn-addr"><span class="hwn-sp" style="background:hsla(' + h + ',85%,55%,.22);border-color:hsl(' + h + ',72%,48%)">' + esc(sp[0]) + '</span>.<span class="hwn-hp">' + esc(sp[1]) + '</span></span><span>street ' + esc(sp[0]) + ' · house ' + esc(sp[1]) + '</span>';
    }
    function paintCards() {
      const ev = lastEv, pr = st.proto, D = st[pr], F = PR[pr].file;
      DEVS.forEach((k) => {
        const card = cardsEl.querySelector('[data-card="' + k + '"]');
        if (!card) return;
        const s = ev.status[k], c = cable(ev, k);
        card.className = 'hwn-card ' + c;
        const chip = card.querySelector('.hwn-chip');
        chip.textContent = CHIP[s.code];
        chip.className = 'chip hwn-chip ' + (s.code === 'ok' ? 'ok' : s.code === 'wait' ? 'hwn-idle' : 'hwn-bad');
        const why = card.querySelector('.hwn-why');
        let wt = s.why;
        if (s.code === 'ok') {
          if (k === 'laptop') wt = 'Online: you can download, monitor and force.';
          else if (k === 'hmi') wt = 'The HMI reads and writes PLC tags.';
          else if (k === 'plc') wt = s.why;
          else wt = PR[pr].ioOk;
        }
        why.querySelector('.hwn-wt').textContent = wt;
        why.className = 'hwn-why ' + (c === 'bad' ? '' : c);
        const ipS = String(st.ip[k]), chk = check(ipS, st.mask[k]);
        const inp = card.querySelector('input[data-f="ip"]');
        inp.classList.toggle('bad', !chk.ok);
        inp.setAttribute('aria-invalid', chk.ok ? 'false' : 'true');
        const net = card.querySelector('[data-v="net"]'), nh = netHTML(ipS, st.mask[k]);
        if (chk.ok && nh) { net.className = 'hwn-net'; net.innerHTML = nh; }
        else { net.className = 'hwn-net err'; net.textContent = '⚠ ' + chk.why.charAt(0).toUpperCase() + chk.why.slice(1) + '.'; }
        if (isIO(k)) {
          const N = ev.N[k], dv = card.querySelector('[data-v="devip"]'), want = ipS.trim();
          const match = N.ok && N.ip === want && D.devMask[k] === st.mask[k];
          dv.textContent = N.none ? '0.0.0.0 (no IP yet)' : N.ip + ' /' + N.mask + (pr === 'pn' && match && ev.conn[k].ok ? '  ← from the PLC' : '');
          dv.className = 'hwn-val' + (N.none ? ' none' : '') + (pr === 'eip' ? (match ? ' same' : ' diff') : '');
          const bt = card.querySelector('[data-a="bootp"]');
          if (bt) bt.disabled = busy || match;
          if (pr === 'pn') {
            const dn = card.querySelector('[data-v="devname"]'), v = D.devName[k], pn = String(D.name[k]).trim();
            dn.textContent = v ? v : '(empty: new device)';
            dn.className = 'hwn-val' + (v ? '' : ' none') + (v === pn ? ' same' : ' diff');
            const nin = card.querySelector('input[data-f="name"]');
            nin.classList.toggle('bad', !nameOk(pn));
            card.querySelector('[data-a="assign"]').disabled = busy || (v === pn && nameOk(pn));
          }
          const fl = card.querySelector('[data-v="file"]');
          if (D.file[k]) {
            fl.className = 'hwn-file';
            fl.innerHTML = '<span><span class="hwn-okt">✓ ' + F + ' installed</span> <small>' + (k === 'io' ? '(it came with the PLC software)' : '(the tool knows this drive now)') + '</small></span>';
          } else {
            fl.className = 'hwn-file miss';
            fl.innerHTML = '<div><b>Unknown device — install its device description file</b><small>Without the ' + F + ' the tool does not know its modules, data or parameters.</small></div><button class="btn small primary" data-a="install" data-k="' + k + '"' + (busy ? ' disabled' : '') + '>Install ' + F + '</button>';
          }
        }
      });
    }
    function paintLists() {
      const ev = lastEv, pr = st.proto;
      const okTxt = { lp: 'Online: download, monitor, force.', hp: 'The HMI reads and writes PLC tags.', io: PR[pr].ioOk, drive: PR[pr].ioOk };
      $('.hwn-conns').innerHTML = CONNS.map((c) => {
        const x = ev.conn[c], cl = x.ok ? 'ok' : x.code === 'wait' ? 'idle' : 'bad';
        return '<li><span class="hwn-st ' + cl + '" aria-hidden="true">' + (x.ok ? '✓' : x.code === 'wait' ? '…' : '✕') + '</span><div><b>' + CL[c] + '</b><small>' + (x.ok ? okTxt[c] : '<b style="font-weight:600">' + CHIP[x.code] + ':</b> ' + esc(x.why)) + '</small></div></li>';
      }).join('');
      const items = [['lp', 'Laptop reaches the PLC'], ['nodup', 'No duplicate IP'], ['hp', 'HMI connected to the PLC'], ['file', 'Device file installed (' + PR[pr].file + ')'], ['io', 'Remote I/O exchanging data'], ['drive', 'Drive exchanging data']];
      const n = items.filter((it) => ev.mis[it[0]]).length;
      $('.hwn-mis').innerHTML = items.map((it) => '<li class="' + (ev.mis[it[0]] ? 'done' : '') + '"><span class="check ' + (ev.mis[it[0]] ? 'done' : '') + '" role="img" aria-label="' + (ev.mis[it[0]] ? 'done' : 'not done yet') + '">' + (ev.mis[it[0]] ? '✓' : '') + '</span><span>' + it[1] + '</span></li>').join('');
      $('.hwn-prog').textContent = 'Mission ' + n + '/6';
      $('.hwn-prog2').textContent = n + ' of 6 done';
      const win = $('.hwn-win');
      win.hidden = !ev.done;
      if (ev.done) win.innerHTML = '<b>All green.</b> This is what you check at every machine start-up: IP and mask, no duplicate IP, device names, device files. ' + (pr === 'pn' ? 'Now switch to <b>EtherNet/IP</b> and do it the Rockwell way.' : 'You can also try the <b>PROFINET</b> mission.');
    }
    function paintPing() {
      const cur = st.ping;
      pingSel.innerHTML = ['plc', 'hmi', 'io', 'drive'].map((k) => {
        const ip = String(st.ip[k]).trim() || '?';
        return '<option value="' + k + '">' + esc(NAME[k]) + ' — ' + esc(ip) + (isIO(k) ? ' (project)' : '') + '</option>';
      }).join('');
      pingSel.value = cur;
      root.querySelector('[data-a="ping"]').disabled = busy;
    }
    function paintIntro() {
      const pn = st.proto === 'pn';
      $('.hwn-intro').innerHTML = pn
        ? '<b>PROFINET:</b> the PLC finds each IO device by its <b>name</b>, then gives it the IP from the project. Every device needs its <b>GSDML</b> file. <b>Your mission:</b> make every cable green.'
        : '<b>EtherNet/IP:</b> no names. The PLC (scanner) finds each device by its <b>IP</b>, so the IP in the device must equal the IP in the project. Device file = <b>EDS</b>. Each I/O connection runs at an <b>RPI</b> (requested packet interval). <b>Your mission:</b> make every cable green.';
      root.querySelectorAll('[data-proto]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.proto === st.proto)));
      const ex = $('.hwn-ex'), h1 = hueOf(0xc0a80000, 24), h2 = hueOf(0xc0a80100, 24);
      const sp = (h, a, b) => '<span class="hwn-addr"><span class="hwn-sp" style="background:hsla(' + h + ',85%,55%,.22);border-color:hsl(' + h + ',72%,48%)">' + a + '</span>.<span class="hwn-hp">' + b + '</span></span>';
      ex.innerHTML = '<span style="display:inline-flex;flex-wrap:wrap;gap:4px 14px;font-size:.85rem;color:var(--ink-2)"><span>' + sp(h1, '192.168.0', '1') + ' and ' + sp(h1, '192.168.0', '20') + ': same street</span><span>' + sp(h2, '192.168.1', '10') + ': other street</span></span>';
    }
    function paint() {
      if (layName === '' || !G) buildTopo();
      paintTopo(); paintCards(); paintLists(); paintPing();
      kick();
    }
    function rebuildAll() {
      buildTopo(); buildCards(); paintIntro();
      paint();
    }
    function setBusy(b) { busy = b; paintCards(); paintPing(); }

    /* ── actions ── */
    async function doAssign(k) {
      flush();
      const n = String(st.pn.name[k]).trim();
      if (!nameOk(n)) { say('"' + n + '" is not a valid PROFINET name, so it cannot be written. Use small letters, digits, "-" and "." only.'); return; }
      setBusy(true); clearX();
      await fly('laptop', k, 'set', 'DCP', 1100);
      st.pn.devName[k] = n;
      const r = refresh();
      await fly(k, 'laptop', 'set', 'OK', 900);
      setBusy(false);
      const s1 = 'You wrote "' + n + '" into the ' + SHORT[k] + ' with DCP. DCP finds the device by its MAC address, so the IP does not matter.';
      const s2 = r.ev.conn[k].ok ? 'The PLC found it by this name and gave it its project IP ' + String(st.ip[k]).trim() + '.' : 'Still blocked: ' + r.ev.status[k].why;
      say(s1 + ' ' + s2);
    }
    async function doBootp(k) {
      flush();
      const ipS = String(st.ip[k]).trim(), c = check(ipS, st.mask[k]);
      if (!c.ok) { say('The IP in the project is not usable (' + c.why + '). Fix it first, then the tool can send it to the device.'); return; }
      setBusy(true); clearX();
      await fly(k, 'laptop', 'set', 'BOOTP?', 1000);
      await fly('laptop', k, 'set', ipS, 1100);
      st.eip.devIp[k] = ipS; st.eip.devMask[k] = st.mask[k];
      const r = refresh();
      setBusy(false);
      const s1 = 'The BOOTP/DHCP tool found the ' + SHORT[k] + ' by its MAC address and gave it ' + ipS + ', the IP in the project.';
      const s2 = r.ev.conn[k].ok ? 'The PLC now opens its I/O connection (RPI 10 ms).' : 'Still blocked: ' + r.ev.status[k].why;
      say(s1 + ' ' + s2);
    }
    function doInstall(k) {
      flush();
      const F = PR[st.proto].file;
      st[st.proto].file[k] = true;
      const r = refresh();
      const s1 = 'You installed the ' + F + ' of the ' + SHORT[k] + ': now the tool knows its modules, data and parameters.';
      const s2 = r.ev.conn[k].ok ? 'The PLC starts exchanging data with it.' : 'Still blocked: ' + r.ev.status[k].why;
      say(s1 + ' ' + s2);
    }
    async function doPing() {
      if (busy) return;
      flush();
      const t = st.ping, ev = lastEv, N = ev.N, Lp = N.laptop, tip = String(st.ip[t]).trim();
      const head = '<span class="c">C:\\&gt; ping ' + esc(tip || '?') + '</span>\n';
      const T = parseIp(tip);
      let res;
      if (!Lp.ok) res = { anim: 'local', out: ['r', 'PING: transmit failed. General failure.'], cap: 'Your laptop has no valid IP (' + Lp.why + '), so it cannot send anything. Fix its IP first.' };
      else if (!T || T.bad) res = { anim: 'none', out: ['r', 'Ping request could not find host ' + tip + '.'], cap: '"' + tip + '" is not a valid IP, so there is nothing to ping. ' + (T && T.bad ? 'Each number must be 0 to 255.' : 'An IP is 4 numbers with dots.') };
      else {
        const tmask = st.mask[t], Tn = { n: T.n, mask: tmask };
        const owners = DEVS.filter((k) => k !== 'laptop' && N[k].ok && N[k].n === T.n);
        if (T.n === Lp.n) res = { anim: 'none', out: ['g', 'Reply from ' + tip + ': bytes=32 time<1ms TTL=128'], cap: tip + ' is your own laptop\'s address! The reply comes from your laptop itself, not from ' + NAME[t] + '. Give the laptop its own IP.' };
        else if (!local(Lp, Tn)) {
          const tn = ntoa((T.n & maskN(tmask)) >>> 0);
          res = { anim: 'local', out: ['r', 'PING: transmit failed. General failure.'], cap: 'No route: ' + Lp.ip + '/' + Lp.mask + ' is in network ' + ntoa(Lp.net) + '; ' + (t === 'plc' ? 'the PLC' : NAME[t]) + ' ' + tip + '/' + tmask + ' is in ' + tn + '. Different street — no router.', verdict: 'No route' };
        } else if (!owners.length) {
          let why;
          if (isIO(t)) {
            const cur = N[t];
            why = 'No device has ' + tip + ' yet: the ' + SHORT[t] + (cur.none ? ' has no IP (0.0.0.0).' : ' still has its old IP ' + cur.ip + '.') + (st.proto === 'pn' ? ' In PROFINET it gets ' + tip + ' from the PLC once its name matches.' : ' Set it with the BOOTP/DHCP tool.');
          } else why = 'Nobody answers at ' + tip + (N[t].ok ? '.' : ': ' + N[t].why + '.');
          res = { anim: 'timeout', out: ['r', 'Request timed out.\nRequest timed out.'], cap: 'Request timed out. ' + why };
        } else if (owners.length > 1 || ev.dup.laptop.length) {
          const who = ev.dup.laptop.length ? ['laptop'].concat(ev.dup.laptop) : owners;
          const dip = ev.dup.laptop.length ? Lp.ip : tip;
          res = { anim: 'dup', owners, out: ['r', 'Reply from ' + tip + ': bytes=32 time=1ms TTL=64\nRequest timed out.\nReply from ' + tip + ': bytes=32 time=3ms TTL=64'], cap: 'Two devices answer to ' + dip + ' (' + list(who) + ') — replies get mixed up, connections drop now and then.' };
        } else {
          const o = owners[0], O = N[o];
          if (!local(O, Lp)) res = { anim: 'mask', o, out: ['r', 'Request timed out.\nRequest timed out.'], cap: 'Request timed out. ' + NAME[o] + ' got the ping, but with mask /' + O.mask + ' it thinks your laptop is on another street, so its reply has no way back (mask mismatch).' };
          else {
            let extra = '';
            if (o !== t) extra = ' But it was ' + NAME[o] + ' that answered, not ' + NAME[t] + '!';
            else if (isIO(t) && !ev.conn[t].ok) extra = ' But ping tests only the IP layer: the I/O exchange is still blocked (' + CHIP[ev.conn[t].code] + ').';
            else extra = ' Same street (' + ntoa(Lp.net) + '), one owner of the address: it works.';
            res = { anim: 'ok', o, out: ['g', 'Reply from ' + tip + ': bytes=32 time<1ms TTL=64\nReply from ' + tip + ': bytes=32 time<1ms TTL=64'], cap: NAME[o] + ' answered.' + extra };
          }
        }
      }
      setBusy(true); clearX();
      term.innerHTML = head + '<span class="c">Pinging ' + esc(tip || '?') + ' with 32 bytes of data…</span>';
      const A = res.anim;
      if (A === 'local') markX(await fly('laptop', 'sw', 'ping', 'ping', 600, 0.4));
      else if (A === 'timeout') { await fly('laptop', 'sw', 'ping', 'ping', 900); markX(G ? G.port.laptop : null); await wait(250); }
      else if (A === 'mask') { await fly('laptop', res.o, 'ping', 'ping', 1100); markX(await fly(res.o, 'laptop', 'ping', 'reply', 500, 0.25)); }
      else if (A === 'dup') {
        await fly('laptop', 'sw', 'ping', 'ping', 600);
        await Promise.all(res.owners.map((o) => fly('sw', o, 'ping', '', 600)));
        await Promise.all(res.owners.map((o) => fly(o, 'laptop', 'ping', 'reply', 1000)));
      } else if (A === 'ok') { await fly('laptop', res.o, 'ping', 'ping', 1100); await fly(res.o, 'laptop', 'ping', 'reply', 1100); }
      const sent = 4, recv = res.out[0] === 'g' ? 4 : A === 'dup' ? 2 : 0;
      term.innerHTML = head + '<span class="' + res.out[0] + '">' + esc(res.out[1]) + '</span>\n<span class="c">Packets: Sent = ' + sent + ', Received = ' + recv + ', Lost = ' + (sent - recv) + '</span>';
      setBusy(false);
      say(res.cap);
    }

    /* ── events ── */
    root.addEventListener('click', (e) => {
      const pb = e.target.closest('[data-proto]');
      if (pb) {
        if (pb.dataset.proto === st.proto || busy) return;
        flush();
        st.proto = pb.dataset.proto; term.textContent = ''; clearX();
        lastEv = evaluate(st, []);
        rebuildAll(); save();
        say(st.proto === 'eip'
          ? 'EtherNet/IP: devices are found by their IP, not by a name. The device file is an EDS, and each I/O connection runs at an RPI (requested packet interval).'
          : 'PROFINET: the PLC finds each IO device by its name, then gives it the IP from the project. The device file is a GSDML.');
        return;
      }
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      const a = b.dataset.a, k = b.dataset.k;
      if (a === 'reset') {
        if (busy) return;
        clearTimeout(capT); pend = null;
        try { localStorage.removeItem(STORE); } catch (err) { /* ignore */ }
        st = start(); term.textContent = ''; clearX();
        lastEv = evaluate(st, []);
        rebuildAll();
        say('Back to the start: ' + introCap().replace(/^This machine does not start: /, ''));
      } else if (a === 'assign' && !busy) doAssign(k);
      else if (a === 'bootp' && !busy) doBootp(k);
      else if (a === 'install' && !busy) doInstall(k);
      else if (a === 'ping') doPing();
    });
    cardsEl.addEventListener('input', (e) => {
      const el = e.target, k = el.dataset.k, f = el.dataset.f;
      if (!k || !f || f === 'mask') return;
      editStart(k, f);
      if (f === 'ip') st.ip[k] = el.value; else if (f === 'name') st.pn.name[k] = el.value;
      refresh();
    });
    cardsEl.addEventListener('change', (e) => {
      const el = e.target, k = el.dataset.k, f = el.dataset.f;
      if (!k || !f) return;
      if (f === 'mask') { flush(); editStart(k, 'mask'); st.mask[k] = el.value === '16' ? 16 : 24; refresh(); flush(); }
      else flush();
    });
    cardsEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.target.blur(); flush(); } });
    pingSel.addEventListener('change', () => { st.ping = pingSel.value; save(); });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); });
      io.observe(root); obs.push(io);
    }
    let rT = 0;
    const onResize = () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        if (!document.body.contains(root)) { obs.forEach((o) => o.disconnect()); return; }
        const w = svgW.clientWidth;
        if (w && (w < 520 ? 'narrow' : 'wide') !== layName) { buildTopo(); paintTopo(); kick(); }
      }, 80);
    };
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(onResize); ro.observe(svgW); obs.push(ro); }
    else window.addEventListener('resize', onResize);

    lastEv = evaluate(st, []);
    rebuildAll();
    save();
    capP.textContent = st.cap || introCap();
  };
})();
