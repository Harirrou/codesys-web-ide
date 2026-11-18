/* Ladder Lab — Network simulator: IP addresses, subnets, device names, device files.
 * Mounted in lessons through [[hw:net]] (LL.HW.net). The learner fixes the classic start-up faults of an
 * industrial Ethernet network and sees WHY each one breaks communication: different subnet, duplicate IP,
 * missing / wrong / duplicate PROFINET device name, missing device description file (GSDML / EDS), mask mismatch.
 * Two modes: PROFINET (devices found by NAME, the PLC hands out the IP) and EtherNet/IP (devices found by IP).
 * Every action (ping, DCP, BOOTP, keypad) is played as packets in the picture; the page scrolls the picture
 * into view while it plays, and back to the card afterwards. */
(function () {
  const LL = (window.LL = window.LL || {});
  LL.HW = LL.HW || {};

  const STORE = 'll-hw-net';
  const NS = 'http://www.w3.org/2000/svg';
  const DEVS = ['laptop', 'plc', 'hmi', 'io', 'drive'];
  const IOD = ['io', 'drive'];
  const isIO = (k) => k === 'io' || k === 'drive';
  const NAME = { laptop: 'Your laptop', plc: 'PLC_1', hmi: 'HMI_1', io: 'Remote I/O', drive: 'Drive (third-party)' };
  // Names used inside a sentence (lower case where English needs it).
  const SHORT = { laptop: 'your laptop', plc: 'PLC_1', hmi: 'HMI_1', io: 'the Remote I/O', drive: 'the drive' };
  const PNAME = { plc: 'PLC_1', hmi: 'HMI_1', io: 'Remote I/O', drive: 'Drive' }; // short names for the ping list
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const PR = {
    pn: { label: 'PROFINET', brands: 'Siemens, CODESYS, …', file: 'GSDML', ioOk: 'Cyclic I/O every 4 ms (update time).', cyc: 'Cyclic I/O runs every 4 ms.' },
    eip: { label: 'EtherNet/IP', brands: 'Rockwell, Omron, …', file: 'EDS', ioOk: 'I/O connection open, RPI 10 ms.', cyc: 'I/O data runs every 10 ms (RPI).' },
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
  const CHIP = {
    ok: 'OK', name: 'name mismatch', noname: 'no name', badname: 'invalid name', dupname: 'duplicate name',
    dup: 'duplicate IP', subnet: 'different subnet', nofile: 'no device file', mask: 'mask mismatch',
    invalid: 'invalid IP', ipmis: 'IP mismatch', target: 'wrong PLC address', wait: 'waiting',
  };
  const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];
  // Subnet colours [hue, saturation]. Given by order of first appearance (never by hashing), so two different
  // networks never share a colour. No pure red / green: those mean fault / OK. 9 entries = the most networks
  // that can be on screen (2 examples + 5 project IPs + 2 device IPs).
  const PAL = [[212, 80], [28, 90], [285, 65], [185, 75], [325, 75], [48, 90], [255, 60], [210, 12], [75, 60]];

  const ICON = {
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    plc: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M13 4v16M16 8h2M16 11.5h2"/>',
    hmi: '<rect x="3" y="4" width="18" height="13" rx="2"/><rect x="6" y="7" width="8.5" height="7" rx="1"/><path d="M17.5 8.5h.5M17.5 12h.5M9 21h6M12 17v4"/>',
    io: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 10.5h6M9 14h6"/><circle cx="12" cy="18" r=".6"/>',
    drive: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><circle cx="12" cy="10" r="3.6"/><path d="M12 6.4v7.2M8.4 10h7.2M9 18h6"/>',
  };
  const icon = (k) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>';
  const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  let cleanup = null; // disposes the previous widget when the lesson page is opened again

  /* ───────── start state (= the mission) ───────── */
  function start() {
    return {
      proto: 'pn',
      ip: { laptop: '192.168.1.10', plc: '192.168.0.1', hmi: '192.168.0.1', io: '192.168.0.20', drive: '192.168.0.30' },
      mask: { laptop: 24, plc: 24, hmi: 24, io: 24, drive: 24 },
      hmiPlc: '192.168.0.1', // the PLC address stored in the HMI project
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
        bootp: { io: true, drive: false }, // new I/O: BOOTP on (factory); drive from another machine: fixed IP
      },
      ping: 'plc',
      won: { pn: false, eip: false },
      seen: { dcp: false, arp: false, acd: false },
      cap: '',
      capKind: '',
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
    if (['', 'ok', 'bad'].indexOf(s.capKind) < 0) s.capKind = '';
    return s;
  }

  /* ───────── IP maths ───────── */
  const maskN = (p) => (p === 16 ? 0xffff0000 : 0xffffff00) >>> 0;
  const maskStr = (p) => (p === 16 ? '255.255.0.0' : '255.255.255.0');
  const ntoa = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  function parseIp(s) {
    const m = /^\s*(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*$/.exec(String(s == null ? '' : s));
    if (!m) return null;
    const q = m.slice(1, 5), p = q.map(Number);
    if (p.some((x) => x > 255)) return { bad: true };
    const z = q.filter((x) => x.length > 1 && x[0] === '0')[0];
    if (z) return { bad: true, lead: [z, p.join('.')] };
    return { p, n: ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0 };
  }
  // Can a device use this address with this mask? -> { ok, n, net, why }
  function check(s, prefix) {
    const t = String(s == null ? '' : s).trim(), a = parseIp(t);
    if (!t) return { ok: false, empty: true, why: 'the IP field is empty' };
    if (!a) return { ok: false, why: 'an IP is 4 numbers with dots, like 192.168.0.10' };
    if (a.lead) return { ok: false, why: 'write ' + a.lead[1] + ', without leading zeros: some tools read a leading 0 as an octal number' };
    if (a.bad) return { ok: false, why: 'each of the 4 numbers must be 0 to 255' };
    if (a.n === 0) return { ok: false, none: true, why: 'no IP address yet (0.0.0.0)' };
    if (a.p[0] === 0 || a.p[0] === 127 || a.p[0] >= 224) return { ok: false, why: a.p[0] + '.x.x.x is reserved, not for devices' };
    const m = maskN(prefix), hm = ~m >>> 0, host = (a.n & hm) >>> 0, net = (a.n & m) >>> 0;
    if (host === 0) return { ok: false, n: a.n, net, why: t + ' is the street itself (network address), not a house' };
    if (host === hm) return { ok: false, n: a.n, net, why: t + ' is the broadcast address (all houses)' };
    return { ok: true, n: a.n, net };
  }
  const local = (a, b) => (((a.n ^ b.n) & maskN(a.mask)) >>> 0) === 0;
  function reach(a, b) { const ab = local(a, b), ba = local(b, a); return ab && ba ? 'ok' : !ab && !ba ? 'subnet' : 'mask'; }
  function split(ipS, prefix) { const p = String(ipS).trim().split('.'); const k = prefix === 16 ? 2 : 3; return [p.slice(0, k).join('.'), p.slice(k).join('.')]; }
  function list(ks) { const a = ks.map((k) => SHORT[k]); return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const NAME_RX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
  // PROFINET NameOfStation rules (IEC 61158-6-10): DNS-like labels, max 63 per label, not "n.n.n.n", not "port-xyz".
  function nameBad(s) {
    if (!s) return 'The name is empty.';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) return 'A PROFINET name must not look like an IP address.';
    if (/^port-\d{3}(-\d{5})?$/.test(s.split('.')[0])) return 'A PROFINET name must not start with "port-xxx": that form is kept for ports.';
    if (s.length > 240 || !NAME_RX.test(s) || s.split('.').some((l) => l.length > 63)) return '"' + s + '" is not a valid PROFINET name: use small letters, digits, "-" and "." only.';
    return '';
  }
  const nameOk = (s) => !nameBad(s);

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
  const GOOD = { ok: true, code: 'ok', why: '' };
  function dupWhy(N, dup, k) { return N[k].ip + ' is used by ' + list(DEVS.filter((o) => o === k || dup[k].indexOf(o) >= 0)) + '.'; }
  function subnetWhy(a, A, b, B) {
    return cap1(SHORT[a]) + ' ' + A.ip + '/' + A.mask + ' is in network ' + ntoa(A.net) + '; ' + SHORT[b] + ' ' + B.ip + '/' + B.mask + ' is in ' + ntoa(B.net) + '. Different street, no router.';
  }
  function maskWhy(a, A, b, B) {
    const ab = local(A, B), x = ab ? a : b, X = ab ? A : B, y = ab ? b : a, Y = ab ? B : A;
    return cap1(SHORT[x]) + ' (/' + X.mask + ') thinks ' + SHORT[y] + ' is on its street, but ' + SHORT[y] + ' (/' + Y.mask + ') does not. The replies of ' + SHORT[y] + ' get lost.';
  }
  // Laptop or HMI talking to the PLC (plain IP traffic).
  function pair(st, N, dup, a, b) {
    const A = N[a], B = N[b];
    if (!A.ok) return bad('invalid', cap1(SHORT[a]) + ': ' + A.why + '.');
    if (dup[a].length) return bad('dup', dupWhy(N, dup, a));
    if (!B.ok) return bad('wait', 'PLC_1 has no usable IP (' + B.why + ').');
    const r = reach(A, B);
    if (r === 'subnet') return bad('subnet', subnetWhy(a, A, b, B));
    if (r === 'mask') return bad('mask', maskWhy(a, A, b, B));
    if (dup[b].length) return bad('wait', 'PLC_1 shares its IP ' + B.ip + ' with ' + list(dup[b]) + '. Fix that first.');
    if (a === 'hmi') {
      const v = String(st.hmiPlc).trim(), T = parseIp(v);
      if (!T || T.bad) return bad('target', 'The PLC address in the HMI project (' + (v || 'empty') + ') is not a valid IP.');
      if (T.n !== B.n) return bad('target', 'The HMI project still calls ' + v + ', but PLC_1 is ' + B.ip + '. Change it in the HMI project, or keep the PLC at ' + v + '.');
    }
    return GOOD;
  }
  // PLC <-> IO device (PROFINET: by name; EtherNet/IP: by IP). Device-side faults come before "waiting for the PLC".
  function ioConn(st, N, dup, k) {
    const pr = st.proto, D = st[pr], F = PR[pr].file;
    if (!D.file[k]) return bad('nofile', 'No ' + F + ' file installed yet, so the PLC cannot exchange data with this device.');
    const J = Object.assign({ k, ip: String(st.ip[k]).trim(), mask: st.mask[k] }, check(st.ip[k], st.mask[k]));
    if (pr === 'pn') {
      const pn = String(D.name[k]).trim(), dn = D.devName[k], nb = nameBad(pn);
      if (nb) return bad('badname', 'Project name: ' + nb);
      const twinP = IOD.filter((o) => o !== k && String(D.name[o]).trim() === pn)[0];
      if (twinP) return bad('dupname', 'Two devices in the project are named "' + pn + '". The tool will not compile this.');
      if (!dn) return bad('noname', 'The device has no name yet. The PLC calls "' + pn + '" and nobody answers.');
      if (dn !== pn) return bad('name', 'The PLC calls "' + pn + '", but the device is named "' + dn + '".');
      const twin = IOD.filter((o) => o !== k && D.devName[o] === dn)[0];
      if (twin) return bad('dupname', 'Two devices are named "' + dn + '" (' + list([k, twin]) + '). The PLC gets two answers and connects to neither.');
    } else {
      if (!J.ok) return bad('invalid', 'IP in the project: ' + J.why + '.');
      const E = N[k];
      if (!E.ok || E.n !== J.n) return bad('ipmis', E.none ? 'The device has no IP yet (0.0.0.0). The PLC opens its connection to ' + J.ip + ' and nobody answers.' : 'The PLC opens its connection to ' + J.ip + ', but the device has ' + (E.ip || 'no IP') + '.');
    }
    const C = N.plc;
    if (!C.ok) return bad('wait', 'PLC_1 has no usable IP (' + C.why + ').');
    if (dup.plc.length) return bad('wait', 'PLC_1 shares its IP ' + C.ip + ' with ' + list(dup.plc) + '. Fix that first.');
    if (!J.ok) return bad('invalid', 'IP in the project: ' + J.why + '.');
    const clash = DEVS.filter((o) => o !== k && N[o].ok && N[o].n === J.n);
    if (clash.length) return bad('dup', J.ip + ' (project IP) is already used by ' + list(clash) + '.');
    const X = pr === 'pn' ? J : N[k]; // EtherNet/IP: the mask that is really in the device counts
    const r = reach(X, C);
    if (r === 'subnet') return bad('subnet', subnetWhy(k, X, 'plc', C));
    if (r === 'mask') return bad('mask', maskWhy(k, X, 'plc', C));
    return GOOD;
  }
  // Evaluate everything. In PROFINET a connected device takes its project IP + mask from the PLC (pushed to `assigned`).
  function evaluate(st, assigned) {
    for (let pass = 0; ; pass++) {
      const N = nodes(st), dup = dups(N);
      const conn = { lp: pair(st, N, dup, 'laptop', 'plc'), hp: pair(st, N, dup, 'hmi', 'plc'), io: ioConn(st, N, dup, 'io'), drive: ioConn(st, N, dup, 'drive') };
      let changed = false;
      if (st.proto === 'pn' && pass < 3) {
        IOD.forEach((k) => {
          const ip = String(st.ip[k]).trim(), ipCh = st.pn.devIp[k] !== ip;
          if (conn[k].ok && (ipCh || st.pn.devMask[k] !== st.mask[k])) {
            st.pn.devIp[k] = ip; st.pn.devMask[k] = st.mask[k]; changed = true;
            if (assigned && !assigned.some((x) => x.k === k)) assigned.push({ k, ip: ipCh });
          }
        });
      }
      if (changed) continue;
      const nOk = CONNS.filter((c) => conn[c].ok).length;
      const from = (c) => (c.ok ? { code: 'ok', why: '' } : { code: c.code, why: c.why });
      const status = { laptop: from(conn.lp), hmi: from(conn.hp), io: from(conn.io), drive: from(conn.drive) };
      status.plc = !N.plc.ok ? { code: 'invalid', why: 'PLC_1: ' + N.plc.why + '.' } : dup.plc.length ? { code: 'dup', why: dupWhy(N, dup, 'plc') } : { code: 'ok', why: nOk + ' of 4 connections work.' };
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
  // How many root causes are still open (the start state has 5 in both protocols).
  function faultCount(st, ev) {
    const D = st[st.proto], N = ev.N;
    const groups = {};
    DEVS.forEach((k) => { if (ev.dup[k].length) groups[N[k].n] = 1; });
    let n = Object.keys(groups).length;
    if (!N.plc.ok) n++;
    ['lp', 'hp'].forEach((c) => { const x = ev.conn[c]; if (!x.ok && x.code !== 'wait' && x.code !== 'dup') n++; });
    IOD.forEach((k) => {
      if (!D.file[k]) n++;
      let idBad;
      if (st.proto === 'pn') { const pn = String(D.name[k]).trim(); idBad = !(nameOk(pn) && D.devName[k] === pn); }
      else { const J = check(st.ip[k], st.mask[k]); idBad = !(N[k].ok && J.ok && N[k].n === J.n); }
      if (idBad) n++;
      const x = ev.conn[k];
      if (D.file[k] && !idBad && !x.ok && x.code !== 'wait') n++;
    });
    return n;
  }
  const faultsTxt = (n) => (n === 1 ? '1 fault' : n + ' faults');
  // Colour of the cable from a device to the switch.
  function cable(ev, k) {
    const s = ev.status[k];
    if (k === 'plc') return s.code !== 'ok' ? 'bad' : ev.nOk ? 'ok' : 'idle';
    return s.code === 'ok' ? 'ok' : s.code === 'wait' ? 'idle' : 'bad';
  }

  /* ───────── layout of the picture ───────── */
  const NARROW = 640; // below this SVG width the compact layout is used (text stays readable)
  const LAY = {
    wide: { W: 680, H: 292, pos: { laptop: [100, 46], plc: [340, 46], hmi: [580, 46], io: [215, 244], drive: [465, 244] }, bw: { laptop: 150, plc: 150, hmi: 150, io: 180, drive: 190 }, sw: [340, 146, 176, 38], px: { laptop: -56, plc: 0, hmi: 56, io: -40, drive: 40 }, nm: 18 },
    narrow: { W: 340, H: 304, pos: { laptop: [57, 42], plc: [170, 42], hmi: [283, 42], io: [87, 258], drive: [253, 258] }, bw: { laptop: 106, plc: 106, hmi: 106, io: 158, drive: 158 }, sw: [170, 150, 150, 36], px: { laptop: -48, plc: 0, hmi: 48, io: -34, drive: 34 }, nm: 14 },
  };

  /* ───────── CSS (once) ───────── */
  const CSS = `
.hw-net{--hwn-ok:#0d7a3a;--hwn-bad:#b3261e;border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px 16px 16px;margin:18px 0;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0;color:var(--ink)}
:root[data-theme="dark"] .hw-net{--hwn-ok:var(--power);--hwn-bad:var(--danger)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .hw-net{--hwn-ok:var(--power);--hwn-bad:var(--danger)}}
.hw-net button,.hw-net input,.hw-net select{scroll-margin:84px 0 150px}
.hw-net p{margin:0;max-width:none}
.hw-net [hidden]{display:none!important}
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
.hwn-proto button:disabled{cursor:default}
.hwn-proto button:disabled:not([aria-pressed="true"]){opacity:.5}
.hwn-intro{font-size:.95rem;color:var(--ink-2);line-height:1.5}
.hwn-intro b{color:var(--ink)}
.hwn-topo{background:var(--surface-2);border:1px solid var(--line-2);border-radius:12px;overflow:hidden;scroll-margin-top:68px}
.hwn-topo svg{display:block;width:100%;height:auto}
.hwn-topo svg.n{max-width:460px;margin:0 auto}
.hwn-now{display:flex;align-items:flex-start;gap:9px;padding:8px 12px;border-top:1px solid var(--line-2);background:var(--surface);font-size:.92rem;line-height:1.4;min-height:40px;color:var(--ink)}
.hwn-now i{width:10px;height:10px;border-radius:50%;flex:none;margin-top:5px;background:var(--muted)}
.hwn-now.idle{color:var(--muted)}
.hwn-now.idle i{opacity:.5}
.hwn-now.run i{background:var(--info);animation:hwn-blink 1s ease-in-out infinite}
.hwn-now.ok i{background:var(--power-bright)}
.hwn-now.bad i{background:var(--danger)}
@keyframes hwn-blink{50%{opacity:.25}}
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
.hwn-svg .hwn-ring{fill:none;stroke:var(--info);stroke-width:2.5;stroke-dasharray:7 5;opacity:0;transition:opacity .2s}
.hwn-svg .hwn-node.act .hwn-ring{opacity:1;animation:hwn-march 1s linear infinite}
@keyframes hwn-march{to{stroke-dashoffset:-24}}
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
.hwn-svg .hwn-pk text,.hwn-svg .hwn-tag{font:700 10.5px var(--f-mono);fill:var(--ink);text-anchor:middle;paint-order:stroke;stroke:var(--surface-2);stroke-width:3.5px;stroke-linejoin:round}
.hwn-svg.n .hwn-pk text,.hwn-svg.n .hwn-tag{font-size:10px}
.hwn-svg .hwn-x circle{fill:var(--danger);stroke:var(--surface);stroke-width:2}
.hwn-svg .hwn-x path{stroke:var(--surface);stroke-width:2.4;stroke-linecap:round;fill:none}
.hwn-street{display:flex;gap:12px;align-items:flex-start;background:var(--surface-2);border:1px solid var(--line-2);border-left:4px solid var(--info);border-radius:10px;padding:10px 12px;font-size:.92rem;line-height:1.5}
.hwn-street svg{width:26px;height:26px;flex:none;color:var(--info);margin-top:1px}
.hwn-street .hwn-ex{display:flex;flex-wrap:wrap;gap:4px 14px;margin:4px 0 0;font-size:.85rem;color:var(--ink-2)}
.hwn-addr{font-family:var(--f-mono);font-size:.9rem;color:var(--ink);white-space:nowrap}
.hwn-sp{padding:1px 4px;border-radius:4px;border-bottom:2.5px solid}
.hwn-hp{padding:1px 3px}
.hwn-cards{display:grid;gap:12px}
.hwn-g3,.hwn-g2{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:start}
.hwn-c2 .hwn-g3,.hwn-c2 .hwn-g2,.hwn-c3 .hwn-g2{grid-template-columns:repeat(2,minmax(0,1fr))}
.hwn-c2 .hwn-g3>:nth-child(3){grid-column:1/-1}
.hwn-c3 .hwn-g3{grid-template-columns:repeat(3,minmax(0,1fr))}
.hwn-g3{align-items:stretch}
.hwn-card{border:1px solid var(--line);border-top:4px solid var(--line);border-radius:12px;background:var(--surface);padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;align-content:start;min-width:0}
.hwn-card.ok{border-top-color:var(--power-bright)}.hwn-card.bad{border-top-color:var(--danger)}
.hwn-ch{display:flex;align-items:center;gap:10px;min-width:0}
.hwn-ic{width:38px;height:38px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line-2);display:grid;place-items:center;flex:none;color:var(--ink-2)}
.hwn-ic svg{width:22px;height:22px}
.hwn-cn{flex:1;min-width:0;line-height:1.25}
.hwn-cn b{display:block;font-size:1rem}
.hwn-cn small{color:var(--muted);font-size:.8rem}
.hw-net .hwn-chip{white-space:nowrap;font-weight:700;padding:1px 9px;margin:0 7px 0 0;vertical-align:1px;font-size:.78rem}
.hwn-why{font-size:.87rem;color:var(--ink);line-height:1.5;border-radius:8px;padding:7px 9px;background:var(--danger-soft)}
.hwn-why .chip.hwn-bad{background:var(--danger);color:var(--surface)}
.hwn-why .chip.ok{background:var(--hwn-ok);color:var(--surface)}
.hwn-why .chip.hwn-idle{background:var(--surface-3);color:var(--ink)}
.hwn-why.ok{background:var(--power-soft)}.hwn-why.idle{background:var(--surface-2)}
.hwn-fl{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:8px}
.hwn-f{display:grid;gap:3px;min-width:0;border-radius:8px}
.hwn-f>span:first-child{font-size:.76rem;color:var(--muted);font-weight:600}
.hwn-f.hl{animation:hwn-hl 1.8s ease-out}
@keyframes hwn-hl{0%,45%{box-shadow:0 0 0 3px var(--accent-bg)}100%{box-shadow:0 0 0 3px transparent}}
.hwn-rot{font-style:normal;font-weight:500;font-size:.72rem;color:var(--muted);margin-left:6px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px;vertical-align:-1px}
.hwn-rot svg{width:11px;height:11px}
.hw-net input.hwn-in,.hw-net select.hwn-sel{width:100%;min-width:0;min-height:40px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--ink);padding:6px 9px}
.hw-net input.hwn-in{font-family:var(--f-mono);font-size:.95rem}
.hw-net select.hwn-sel{font-size:.88rem;cursor:pointer}
.hw-net input.hwn-in.bad{border-color:var(--danger);background:var(--danger-soft)}
.hw-net input.hwn-in:disabled,.hw-net select.hwn-sel:disabled{opacity:.6;cursor:default}
.hwn-net{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:.8rem;color:var(--muted);min-height:22px}
.hwn-net.err{color:var(--hwn-bad);font-weight:600}
.hwn-vr{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.hwn-ro{flex:1 1 150px;min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:0 10px;min-height:34px;padding:3px 4px 3px 10px;border-left:4px solid var(--line);font-family:var(--f-mono);font-size:.92rem;color:var(--ink)}
.hwn-ro .hwn-rv{overflow-wrap:anywhere}
.hwn-ro .hwn-rs{font-family:var(--f-body);font-size:.78rem;font-weight:600;color:var(--muted);white-space:nowrap}
.hwn-ro.none .hwn-rv{color:var(--muted);font-style:italic;font-family:var(--f-body);font-size:.86rem}
.hwn-ro.same{border-left-color:var(--hwn-ok)}.hwn-ro.same .hwn-rs{color:var(--hwn-ok)}
.hwn-ro.diff{border-left-color:var(--danger)}.hwn-ro.diff .hwn-rs{color:var(--hwn-bad)}
.hwn-note{font-size:.78rem;color:var(--muted);line-height:1.4}
.hwn-file{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;justify-content:space-between;border-radius:9px;padding:8px 10px;background:var(--surface-2);font-size:.86rem}
.hwn-file.miss{background:var(--danger-soft);border:1px solid var(--danger)}
.hwn-file b{display:block;font-size:.9rem}
.hwn-file small{color:var(--ink-2)}
.hwn-file .hwn-okt{color:var(--hwn-ok);font-weight:700}
.hwn-boot{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:space-between;font-size:.84rem;color:var(--ink-2);line-height:1.4}
.hwn-boot.warn{background:rgba(255,176,46,.14);border:1px solid var(--accent-bg);border-radius:9px;padding:7px 9px;color:var(--ink)}
.hwn-sec{border:1px solid var(--line);border-radius:12px;padding:12px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px;background:var(--surface);min-width:0;align-content:start}
.hwn-sh{font-family:var(--f-display);font-weight:700;font-size:1.1rem;letter-spacing:.02em;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hwn-sh small{font-family:var(--f-body);font-weight:500;font-size:.8rem;color:var(--muted);letter-spacing:0}
.hwn-pr{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.hwn-pr select.hwn-sel{flex:1 1 200px;width:100%}
.hwn-pr .btn{min-height:40px;min-width:80px}
.hw-net pre.hwn-term{scroll-margin:84px 0 130px}
@media (max-width:820px){.hw-net pre.hwn-term{scroll-margin:84px 0 200px}}
.hwn-stale{font-size:.82rem;font-weight:600;color:var(--ink-2);background:var(--surface-3);border-radius:8px;padding:5px 9px}
.hwn-term{margin:0;font-family:var(--f-mono);font-size:.8rem;line-height:1.5;background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:8px 10px;white-space:pre-wrap;overflow-wrap:anywhere;min-height:3.4em;color:var(--ink);transition:opacity .2s}
.hwn-term.old{opacity:.45}
.hwn-term:empty::before{content:'Pick a device and press Ping. The result appears here.';color:var(--muted);font-family:var(--f-body)}
.hwn-term .c{color:var(--muted)}.hwn-term .g{color:var(--hwn-ok)}.hwn-term .r{color:var(--hwn-bad)}
.hwn-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}
.hw-net .hwn-list{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.hw-net .hwn-list li{display:flex;gap:10px;align-items:flex-start;margin:0;max-width:none;line-height:1.35}
.hwn-list li>div{min-width:0}
.hwn-list b{font-weight:600;font-size:.92rem}
.hwn-list small{display:block;color:var(--ink-2);font-size:.82rem;margin-top:1px}
.hwn-st{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:.78rem;font-weight:700;line-height:1}
.hwn-st.ok{background:var(--hwn-ok);color:var(--surface)}
.hwn-st.bad{background:var(--danger);color:var(--surface)}
.hwn-st.idle{background:var(--surface-3);color:var(--ink)}
.hwn-mis li.done span:last-child{color:var(--ink)}
.hwn-mis li span:last-child{font-size:.92rem;color:var(--ink-2)}
.hwn-win{border-radius:10px;padding:10px 12px;background:var(--power-soft);border:1px solid var(--power);font-size:.92rem;line-height:1.45;display:grid;gap:8px;scroll-margin:80px 0 160px}
.hwn-win b{color:var(--ink)}
.hwn-win .btn{justify-self:start}
.hwn-cap{position:sticky;bottom:10px;z-index:6;padding:9px 12px;border-radius:12px;border:1px solid var(--line);border-left:5px solid var(--info);background:var(--surface);box-shadow:0 2px 6px rgba(0,0,0,.08),0 10px 24px rgba(0,0,0,.12)}
.hwn-cap.ok{border-left-color:var(--power)}
.hwn-cap.bad{border-left-color:var(--danger)}
.hwn-ct{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.72rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin-bottom:1px}
.hwn-more{border:0;background:none;color:var(--info);font:700 .8rem var(--f-body);letter-spacing:0;text-transform:none;min-height:32px;min-width:48px;margin:-9px -6px -9px 0;padding:0 6px;cursor:pointer}
.hwn-cap p{margin:0;font-size:.93rem;line-height:1.45}
.hwn-cap.flash{animation:hwn-flash .7s ease-out}
.hwn-busy .hwn-cap p{opacity:.55;transition:opacity .2s}
@keyframes hwn-flash{from{box-shadow:0 0 0 4px var(--accent-bg)}}
@media (max-width:820px){.hwn-cap{bottom:calc(var(--tabbar-h, 62px) + 8px + env(safe-area-inset-bottom,0px))}.hw-net button,.hw-net input,.hw-net select{scroll-margin:84px 0 220px}}
@media (max-width:600px){.hw-net{padding:12px;gap:12px}.hwn-ttl{font-size:1.18rem}.hw-net input.hwn-in{font-size:16px}.hw-net select.hwn-sel{font-size:15px}.hwn-cap{padding:8px 10px}.hwn-cap:not(.open) p{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.hwn-now{min-height:56px;font-size:.88rem}}
@media (prefers-reduced-motion:reduce){.hwn-cap.flash,.hwn-f.hl,.hwn-now.run i,.hwn-svg .hwn-node.act .hwn-ring{animation:none}}
`;
  function injectCss() {
    if (document.getElementById('hw-net-css')) return;
    const s = document.createElement('style');
    s.id = 'hw-net-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ───────── the widget ───────── */
  LL.HW.net = function (ph) {
    if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
    injectCss();
    let st = load();
    const root = document.createElement('div');
    root.className = 'hw-box hw-net';
    root.innerHTML = `
<div class="hwn-head">
  <div><div class="hwn-eb">Network simulator</div><div class="hwn-ttl">Set up the network: IP addresses, subnets, device names, device files</div></div>
  <div class="hwn-hr"><button class="btn small ghost" data-a="reset" title="Back to the start of this mission">↺ Reset</button><span class="hwn-prog"></span></div>
</div>
<div class="hwn-proto" role="group" aria-label="Network protocol">
  <button type="button" data-proto="pn">PROFINET<small>${PR.pn.brands}</small></button>
  <button type="button" data-proto="eip">EtherNet/IP<small>${PR.eip.brands}</small></button>
</div>
<p class="hwn-intro"></p>
<div class="hwn-topo"><div class="hwn-svgw"></div>
  <div class="hwn-now idle"><i aria-hidden="true"></i><span></span></div>
  <div class="hwn-legend">
    <span><i class="hwn-lc ok"></i>data flows</span><span><i class="hwn-lc idle"></i>idle / waiting</span><span><i class="hwn-lc bad"></i>fault blocks it</span>
    <span><i class="hwn-ld io"></i>cyclic I/O</span><span><i class="hwn-ld hmi"></i>HMI / online</span><span><i class="hwn-ld ping"></i>ping</span><span><i class="hwn-ld set"></i>setup (DCP / BOOTP)</span>
  </div>
</div>
<div class="hwn-sec hwn-ping">
  <div class="hwn-sh">Ping from your laptop <small>Ping tests only the IP layer: "can this address answer?"</small></div>
  <div class="hwn-pr"><select class="hwn-sel" aria-label="Ping target"></select><button class="btn small primary" data-a="ping">Ping</button></div>
  <div class="hwn-stale" hidden>Old result: the network changed since this ping. Press Ping again.</div>
  <pre class="hwn-term" aria-live="polite"></pre>
</div>
<div class="hwn-street">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
  <div><b>How to read an IP address.</b> Mask 255.255.255.0: the first three numbers are the street, the last one is the house number. Only houses on the same street can talk without a router. (Mask 255.255.0.0: the first two numbers are the street.) <b>Same colour = same street.</b>
  <div class="hwn-ex"></div></div>
</div>
<div class="hwn-cards"></div>
<div class="hwn-two">
  <div class="hwn-sec"><div class="hwn-sh">Connections</div><ul class="hwn-list hwn-conns"></ul></div>
  <div class="hwn-sec"><div class="hwn-sh">Mission <small class="hwn-prog2"></small></div><ul class="hwn-list hwn-mis"></ul><div class="hwn-win" hidden></div></div>
</div>
<div class="hwn-cap" role="status" aria-live="polite"><div class="hwn-ct"><span>What happened</span><button type="button" class="hwn-more" data-a="more" hidden>more</button></div><p></p></div>`;
    ph.replaceWith(root);

    const $ = (s) => root.querySelector(s);
    const svgW = $('.hwn-svgw'), topoEl = $('.hwn-topo'), cardsEl = $('.hwn-cards'), capP = $('.hwn-cap p'), capBox = $('.hwn-cap'), moreBtn = $('.hwn-more');
    const nowEl = $('.hwn-now'), nowT = $('.hwn-now span');
    const pingSel = $('.hwn-ping select'), term = $('.hwn-term'), staleEl = $('.hwn-stale');
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let lastEv = null, busy = false, raf = 0, visible = true, G = null, layName = '', pkL = null, pkT = null, fxL = null;
    let pend = null, capT = 0, rT = 0, dead = false, pingSig = '', actK = '';
    const flights = [], obs = [], colAt = {};
    const lastSpawn = {}, dirs = {};

    const save = () => { if (dead) return; try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* private mode */ } };
    const sig = () => JSON.stringify([st.proto, st.ip, st.mask, st.hmiPlc, st[st.proto]]);

    /* ── captions ── */
    function fitMore() {
      const open = capBox.classList.contains('open');
      moreBtn.hidden = !(open || capP.scrollHeight > capP.clientHeight + 2);
      moreBtn.textContent = open ? 'less' : 'more';
      moreBtn.setAttribute('aria-expanded', String(open));
    }
    function say(text, kind) {
      st.cap = text; st.capKind = kind || ''; save();
      capP.textContent = text;
      capBox.className = 'hwn-cap' + (kind ? ' ' + kind : '');
      void capBox.offsetWidth; capBox.classList.add('flash');
      fitMore();
    }
    function introCap() {
      return 'This machine does not start: ' + faultsTxt(faultCount(st, lastEv)) + ' block the network. Red cables show where to look; start with Ping, right under the picture.';
    }
    function consequences(b, a, assigned) {
      const up = [], down = [], waitL = [];
      CONNS.forEach((c) => {
        if (!b.conn[c].ok && a.conn[c].ok) up.push(CLS[c]);
        else if (b.conn[c].ok && !a.conn[c].ok) { if (a.conn[c].code === 'wait') waitL.push(CLS[c]); else down.push(CLS[c] + ' (' + CHIP[a.conn[c].code] + ')'); }
      });
      let s = '';
      if (up.length) s += 'Now working: ' + up.join(', ') + '.';
      if (assigned && assigned.length) s += ' The PLC gave ' + assigned.map((x) => SHORT[x.k] + (x.ip ? ' its project IP ' + String(st.ip[x.k]).trim() : ' its project mask ' + maskStr(st.mask[x.k]))).join(' and ') + '.';
      if (down.length) s += ' Stopped: ' + down.join(', ') + '.';
      if (waitL.length) s += ' Stopped until PLC_1 has a usable IP: ' + waitL.join(', ') + '.';
      return s.trim();
    }
    // Caption after typing in a field: [what you did, what it caused]
    function capEdit(k, kind, b, a, assigned) {
      const s = a.status[k], io = isIO(k);
      let s1 = '';
      if (kind === 'ip') {
        const ipS = String(st.ip[k]).trim(), c = check(ipS, st.mask[k]);
        if (c.empty) s1 = 'The IP field of ' + SHORT[k] + ' is empty.';
        else if (!c.ok) s1 = '"' + ipS + '" cannot be used: ' + c.why + '.';
        else if (s.code === 'dup' && !io) { const n = 1 + a.dup[k].length; s1 = COUNT[n] + ' devices now share ' + ipS + ' (' + list(DEVS.filter((o) => o === k || a.dup[k].indexOf(o) >= 0)) + '): replies get mixed up.'; }
        else if (b.status[k].code === 'dup' && !io) s1 = cap1(SHORT[k]) + ' now has its own address, ' + ipS + ': no more duplicate.';
        else if (k === 'plc') s1 = 'PLC_1 is now ' + ipS + ': on a real machine this needs a download, and every device that calls the old IP must change too.';
        else { const sp = split(ipS, st.mask[k]); s1 = (io ? 'The project IP of ' + SHORT[k] : cap1(SHORT[k])) + ' is now ' + ipS + ' (street ' + sp[0] + ', house ' + sp[1] + ').'; }
      } else if (kind === 'mask') {
        const m = st.mask[k];
        if (io && st.proto === 'eip') s1 = 'The tool will send mask ' + maskStr(m) + ' with the next "Set IP". The device keeps /' + st.eip.devMask[k] + ' until then.';
        else s1 = cap1(SHORT[k]) + ' now uses mask ' + maskStr(m) + ' (/' + m + '): the first ' + (m === 24 ? 'three' : 'two') + ' numbers are the street.';
      } else if (kind === 'name') {
        const n = String(st.pn.name[k]).trim(), nb = nameBad(n);
        if (nb) s1 = nb;
        else if (n === st.pn.devName[k]) s1 = 'The name in the project now matches the name in the device ("' + n + '").';
        else s1 = 'The PLC now looks for a device named "' + n + '".';
      } else if (kind === 'hmiplc') {
        const v = String(st.hmiPlc).trim(), T = parseIp(v);
        if (!v) s1 = 'The PLC address in the HMI project is empty.';
        else if (!T || T.bad) s1 = '"' + v + '" is not a valid IP address.';
        else if (a.N.plc.ok && T.n === a.N.plc.n) s1 = 'The HMI project now calls the PLC at ' + v + ': that is PLC_1.';
        else s1 = 'The HMI project now calls ' + v + ', but PLC_1 is ' + (a.N.plc.ok ? a.N.plc.ip : 'not usable') + '.';
      }
      let s2 = consequences(b, a, assigned);
      const repeats = (kind === 'ip' && ((s.code === 'dup' && !io) || !check(st.ip[k], st.mask[k]).ok)) || (kind === 'name' && s.code === 'badname') || (kind === 'hmiplc' && s.code === 'target');
      if (!s2 && s.code !== 'ok' && !repeats) s2 = 'Still a problem: ' + s.why;
      if (!s2 && s.code === 'ok' && b.status[k].code === 'ok') s2 = 'The connections did not change.';
      return [s1, s2];
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
      const sk = p.k, parts = capEdit(sk, p.kind, p.base, lastEv, p.assigned);
      const won = !p.base.done && lastEv.done;
      const kind = won ? 'ok' : lastEv.status[sk].code !== 'ok' ? 'bad' : p.base.status[sk].code !== 'ok' ? 'ok' : '';
      say(won ? parts[0] + ' Mission complete: all 6 checks are green.' : (parts[0] + ' ' + parts[1]).trim(), kind);
    }

    /* ── evaluate + paint ── */
    function refresh(quiet) {
      const assigned = [];
      lastEv = evaluate(st, assigned);
      if (lastEv.done) st.won[st.proto] = true;
      if (pend) assigned.forEach((x) => { if (!pend.assigned.some((y) => y.k === x.k)) pend.assigned.push(x); });
      paint();
      save();
      if (!quiet) assigned.forEach((x) => { if (G) fly('plc', x.k, 'set', x.ip ? 'IP' : 'mask', 1000); });
      return lastEv;
    }

    /* ── subnet colours ── */
    function updateColours() {
      const keys = ['192.168.0.0/24', '192.168.1.0/24'];
      const add = (ipS, m) => { const c = check(ipS, m); if (c.ok) { const key = ntoa(c.net) + '/' + m; if (keys.indexOf(key) < 0) keys.push(key); } };
      ['plc', 'laptop', 'hmi', 'io', 'drive'].forEach((k) => add(String(st.ip[k]), st.mask[k]));
      IOD.forEach((k) => add(String(st[st.proto].devIp[k]), st[st.proto].devMask[k]));
      Object.keys(colAt).forEach((key) => { if (keys.indexOf(key) < 0) delete colAt[key]; });
      keys.forEach((key) => {
        if (colAt[key] != null) return;
        const used = Object.keys(colAt).map((x) => colAt[x]);
        let i = 0; while (used.indexOf(i) >= 0) i++;
        colAt[key] = i;
      });
    }
    function pal(net, prefix) { const i = colAt[ntoa(net) + '/' + prefix]; return PAL[(i == null ? 0 : i) % PAL.length]; }
    const hlSpan = (p, txt) => '<span class="hwn-sp" style="background:hsla(' + p[0] + ',' + p[1] + '%,55%,.22);border-color:hsl(' + p[0] + ',' + p[1] + '%,45%)">' + esc(txt) + '</span>';

    /* ── topology picture ── */
    function boxH(k) { return st.proto === 'pn' && isIO(k) ? 64 : 48; }
    function buildTopo() {
      const w = svgW.clientWidth || root.clientWidth || 700;
      const nm = w < NARROW ? 'narrow' : 'wide', L = LAY[nm];
      layName = nm;
      flights.splice(0).forEach((f) => f.res(null));
      const [sx, sy, sw, sh] = L.sw;
      G = { L, anchor: {}, port: {}, cab: {}, len: {}, swc: { x: sx, y: sy }, top: {} };
      let cabs = '', ports = '', nodesH = '';
      DEVS.forEach((k) => {
        const [x, y] = L.pos[k], top = y < sy, bh = boxH(k), bw = L.bw[k];
        const A = { x, y: top ? y + bh / 2 : y - bh / 2 }, P = { x: sx + L.px[k], y: top ? sy - sh / 2 : sy + sh / 2 };
        G.anchor[k] = A; G.port[k] = P; G.top[k] = { x, y: y - bh / 2, bottom: y + bh / 2, isTop: top };
        const my = (A.y + P.y) / 2;
        cabs += `<path class="hwn-cab" data-c="${k}" d="M${A.x} ${A.y} C${A.x} ${my} ${P.x} ${my} ${P.x} ${P.y}"/>`;
        ports += `<rect class="hwn-port" data-p="${k}" x="${P.x - 5}" y="${top ? P.y : P.y - 5}" width="10" height="5" rx="1"/>`;
        const three = bh === 64, yN = three ? -12 : -5, yI = three ? 5 : 12, yD = 21;
        nodesH += `<g class="hwn-node" data-n="${k}" transform="translate(${x} ${y})">
          <rect class="hwn-ring" x="${-bw / 2 - 5}" y="${-bh / 2 - 5}" width="${bw + 10}" height="${bh + 10}" rx="13"/>
          <rect class="hwn-box" x="${-bw / 2}" y="${-bh / 2}" width="${bw}" height="${bh}" rx="10"/>
          <text class="hwn-nm" y="${yN}">${esc(NAME[k])}</text>
          <text class="hwn-ip" y="${yI}"></text>
          ${three ? `<text class="hwn-dn" y="${yD}"></text>` : ''}
          <rect class="hwn-strip" x="${-bw / 2 + 12}" y="${bh / 2 - 6}" width="${bw - 24}" height="3" rx="1.5"/>
        </g>`;
      });
      svgW.innerHTML = `<svg class="hwn-svg ${nm === 'narrow' ? 'n' : ''}" viewBox="0 0 ${L.W} ${L.H}" role="img" aria-label="Network picture: a switch in the middle, with cables to your laptop, PLC_1, HMI_1, the Remote I/O and the drive.">
        <g>${cabs}</g><g class="hwn-pkl"></g>
        <g><rect class="hwn-swr" x="${sx - sw / 2}" y="${sy - sh / 2}" width="${sw}" height="${sh}" rx="8"/><text class="hwn-swt" x="${sx}" y="${sy + 4.5}">SWITCH</text>${ports}</g>
        <g>${nodesH}</g><g class="hwn-pkt"></g><g class="hwn-fxl"></g></svg>`;
      pkL = svgW.querySelector('.hwn-pkl'); pkT = svgW.querySelector('.hwn-pkt'); fxL = svgW.querySelector('.hwn-fxl');
      DEVS.forEach((k) => { G.cab[k] = svgW.querySelector('[data-c="' + k + '"]'); G.len[k] = G.cab[k].getTotalLength(); });
      if (lastEv) paintTopo();
    }
    function setSvgText(el, text, title) {
      el.textContent = text;
      if (title) { const t = document.createElementNS(NS, 'title'); t.textContent = title; el.appendChild(t); }
    }
    function topoName(k, v) {
      const g = G && svgW.querySelector('[data-n="' + k + '"] .hwn-dn');
      if (!g) return;
      const full = v ? 'name: ' + v : 'no name';
      setSvgText(g, v ? 'name: ' + trunc(v, G.L.nm) : 'no name', v && v.length > G.L.nm ? full : '');
      g.setAttribute('class', 'hwn-dn' + (v ? '' : ' none'));
    }
    function topoIp(k, txt, cls) {
      const t = G && svgW.querySelector('[data-n="' + k + '"] .hwn-ip');
      if (!t) return;
      t.textContent = txt; t.setAttribute('class', 'hwn-ip' + (cls ? ' ' + cls : ''));
    }
    function paintTopo() {
      if (!G) return;
      const ev = lastEv;
      DEVS.forEach((k) => {
        const c = cable(ev, k);
        G.cab[k].setAttribute('class', 'hwn-cab ' + c);
        svgW.querySelector('[data-p="' + k + '"]').setAttribute('class', 'hwn-port ' + c);
        const g = svgW.querySelector('[data-n="' + k + '"]');
        g.setAttribute('class', 'hwn-node ' + c + (actK === k ? ' act' : ''));
        const N = ev.N[k];
        if (isIO(k) && N.none) topoIp(k, 'no IP yet', 'none');
        else topoIp(k, trunc(N.ip || '—', 15), N.ok ? '' : 'bad');
        if (g.querySelector('.hwn-dn')) topoName(k, st.pn.devName[k]);
        const strip = g.querySelector('.hwn-strip');
        if (N.ok) { const p = pal(N.net, N.mask); strip.setAttribute('style', 'fill:hsl(' + p[0] + ',' + p[1] + '%,50%)'); }
        else strip.setAttribute('style', 'fill:var(--line)');
      });
    }
    function focusNode(k) {
      actK = k || '';
      if (!G) return;
      DEVS.forEach((d) => { const g = svgW.querySelector('[data-n="' + d + '"]'); if (g) g.classList.toggle('act', d === actK); });
    }

    /* ── "now" line under the picture: what the packets are doing ── */
    function idleText() { return st.proto === 'pn' ? 'Press Ping, or "Assign name" on a card: the packets fly here.' : 'Press Ping, or "Set IP" on a card: the packets fly here.'; }
    function step(text, kind) { nowEl.className = 'hwn-now ' + (kind || 'run'); nowT.textContent = text; }
    const stepIdle = () => step(idleText(), 'idle');

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
    // Cyclic packets (conn set) fly under the switch; action packets (ping, DCP, BOOTP …) fly on top of everything.
    function fly(a, b, cls, label, dur, stopAt, conn) {
      return new Promise((res) => {
        if (dead || !G || !pkL) { res(null); return; }
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'hwn-pk ' + cls);
        const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', label ? 6 : 4.5); g.appendChild(c);
        if (label) { const t = document.createElementNS(NS, 'text'); t.setAttribute('y', -10); t.textContent = label; g.appendChild(t); }
        const f = { a, b, g, t0: performance.now(), dur: reduce ? 0 : dur, stop: stopAt || 1, res, conn };
        const p = ptAt(a, b, 0); g.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
        if (!reduce) (conn ? pkL : pkT).appendChild(g);
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
    function tagAt(k, label) {
      if (!G || !fxL) return;
      const T = G.top[k], t = document.createElementNS(NS, 'text');
      t.setAttribute('class', 'hwn-tag'); t.setAttribute('x', T.x); t.setAttribute('y', T.isTop ? T.bottom + 16 : T.y - 9);
      t.textContent = label; fxL.appendChild(t);
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
      if (dead || !document.body.contains(root)) { dispose(); return; }
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
    const kick = () => { if (!raf && !dead && document.body.contains(root)) raf = requestAnimationFrame(tick); };
    const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

    /* ── keep the picture in view while an action plays ── */
    function settle() {
      return new Promise((res) => {
        let last = window.scrollY, same = 0;
        const t0 = performance.now();
        const f = () => {
          const y = window.scrollY, t = performance.now() - t0;
          same = Math.abs(y - last) < 0.5 ? same + 1 : 0; last = y;
          if ((same >= 5 && t > 200) || t > 1600) res(); else requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });
    }
    const tabH = () => (window.innerWidth <= 820 ? 62 : 0);
    async function showTopo() {
      const a = svgW.getBoundingClientRect(), b = nowEl.getBoundingClientRect();
      const capH = capBox.getBoundingClientRect().height;
      if (a.top >= 56 && b.bottom <= window.innerHeight - tabH() - capH - 16) return false;
      topoEl.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      await settle();
      return true;
    }
    async function scrollToEl(el) {
      if (!el) return;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      await settle();
    }
    function offScreen(el) {
      const r = el.getBoundingClientRect(), capH = capBox.getBoundingClientRect().height;
      return r.top < 56 || r.bottom > window.innerHeight - tabH() - capH - 10;
    }
    // Runs one action: busy, picture into view, animation, caption, then back to the card (or to the win box).
    async function run(fn) {
      if (busy || dead) return;
      flush();
      const before = lastEv;
      setBusy(true); clearX();
      const moved = await showTopo();
      const y1 = window.scrollY;
      let r = null;
      try { r = await fn(); } catch (err) { r = null; setTimeout(() => { throw err; }); } finally { focusNode(''); }
      if (dead) return;
      const won = !before.done && lastEv.done;
      if (r) say(won ? r.s1 + ' Mission complete: all 6 checks are green.' : (r.s1 + ' ' + (r.s2 || '')).trim(), won ? 'ok' : r.kind);
      const userScrolled = Math.abs(window.scrollY - y1) > 40;
      if (won) {
        await wait(900);
        const w = $('.hwn-win');
        if (!userScrolled && w && !w.hidden && offScreen(w)) await scrollToEl(w);
      } else if (r && r.show && !userScrolled) {
        const el = root.querySelector(r.show);
        if (el && offScreen(el)) { await wait(700); el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' }); await settle(); }
      } else if (r && r.back && moved && !userScrolled) {
        await wait(900);
        const el = root.querySelector(r.back), f = el && el.closest('.hwn-f');
        if (el) { await scrollToEl(el); if (f) { f.classList.remove('hl'); void f.offsetWidth; f.classList.add('hl'); setTimeout(() => f.classList.remove('hl'), 1900); } }
      }
      setBusy(false);
    }

    /* ── device cards ── */
    function cardHTML(k) {
      const pr = st.proto, io = isIO(k);
      const ipLbl = { laptop: 'IP address (set in Windows)', plc: 'IP address (in the PLC project)', hmi: 'IP address (in the HMI panel)', io: 'IP in the project', drive: 'IP in the project' }[k];
      const mLbl = io && pr === 'eip' ? 'Mask to send to the device' : 'Subnet mask';
      const ro = '<i class="hwn-rot">' + LOCK + 'read from the device</i>';
      const inA = 'autocomplete="off" autocapitalize="off" spellcheck="false"';
      let h = `<div class="hwn-card" data-card="${k}">
        <div class="hwn-ch"><span class="hwn-ic">${icon(k)}</span><div class="hwn-cn"><b>${esc(NAME[k])}</b><small>${ROLE[k][pr]}</small></div></div>
        <p class="hwn-why"><span class="chip hwn-chip"></span><span class="hwn-wt"></span></p>
        ${io ? '<div class="hwn-file" data-v="file"></div>' : ''}
        <div class="hwn-fl">
          <label class="hwn-f"><span>${ipLbl}</span><input class="hwn-in" data-f="ip" data-k="${k}" value="${esc(st.ip[k])}" ${inA} maxlength="15"></label>
          <label class="hwn-f"><span>${mLbl}</span><select class="hwn-sel" data-f="mask" data-k="${k}"><option value="24">255.255.255.0 (/24)</option><option value="16">255.255.0.0 (/16)</option></select></label>
        </div>
        <div class="hwn-net" data-v="net"></div>`;
      if (k === 'laptop') h += '<p class="hwn-note">Windows: network adapter → IPv4 settings. Golden rule: change your laptop to fit the machine, not the machine to fit your laptop.</p>';
      if (k === 'plc') h += '<p class="hwn-note">On a real PLC this IP becomes active after a download (or with "Assign IP address" when you cannot go online yet).</p>';
      if (k === 'hmi') h += `<label class="hwn-f"><span>PLC address in the HMI project</span><input class="hwn-in" data-f="hmiplc" data-k="hmi" value="${esc(st.hmiPlc)}" ${inA} maxlength="15"></label><p class="hwn-note">The HMI calls the PLC at this address. If the PLC IP changes, this must change too.</p>`;
      if (io && pr === 'pn') {
        h += `<div class="hwn-f"><span>IP in the device now ${ro}</span><div class="hwn-ro" data-v="devip"></div><span class="hwn-note">In PROFINET the PLC sets this IP, once the name matches.</span></div>
          <label class="hwn-f"><span>Name in the project</span><input class="hwn-in" data-f="name" data-k="${k}" value="${esc(st.pn.name[k])}" ${inA} maxlength="63"></label>
          <div class="hwn-f"><span>Name stored in the device ${ro}</span><div class="hwn-vr"><div class="hwn-ro" data-v="devname"></div><button class="btn small" data-a="assign" data-k="${k}">Assign name</button></div>
          <span class="hwn-note">"Assign name" uses DCP: it finds the device by its MAC address (layer 2), so it works even with a wrong IP.</span></div>`;
      } else if (io) {
        h += `<div class="hwn-f"><span>IP set in the device ${ro}</span><div class="hwn-vr"><div class="hwn-ro" data-v="devip"></div><button class="btn small" data-a="setip" data-k="${k}"></button></div>
          <span class="hwn-note">In EtherNet/IP the PLC finds the device by this IP. It must equal the IP in the project.</span></div>
          <div class="hwn-boot" data-v="boot"></div>`;
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
      if (!c.ok) return null;
      const sp = split(ipS, prefix);
      return '<span class="hwn-addr">' + hlSpan(pal(c.net, prefix), sp[0]) + '.<span class="hwn-hp">' + esc(sp[1]) + '</span></span><span>street ' + esc(sp[0]) + ' · house ' + esc(sp[1]) + '</span>';
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
          else if (k !== 'plc') wt = PR[pr].ioOk;
        }
        why.querySelector('.hwn-wt').textContent = wt;
        why.className = 'hwn-why ' + (c === 'bad' ? '' : c);
        const ipS = String(st.ip[k]), chk = check(ipS, st.mask[k]);
        const inp = card.querySelector('input[data-f="ip"]');
        inp.classList.toggle('bad', !chk.ok);
        inp.setAttribute('aria-invalid', chk.ok ? 'false' : 'true');
        const net = card.querySelector('[data-v="net"]'), nh = netHTML(ipS, st.mask[k]);
        if (nh) { net.className = 'hwn-net'; net.innerHTML = nh; }
        else { net.className = 'hwn-net err'; net.textContent = '⚠ ' + cap1(chk.why) + '.'; }
        if (k === 'hmi') {
          const hp = card.querySelector('input[data-f="hmiplc"]'), T = parseIp(String(st.hmiPlc).trim());
          const okA = !!T && !T.bad && ev.N.plc.ok && T.n === ev.N.plc.n;
          hp.classList.toggle('bad', !okA);
          hp.setAttribute('aria-invalid', okA ? 'false' : 'true');
        }
        if (!isIO(k)) return;
        const N = ev.N[k], J = check(ipS, st.mask[k]);
        const ipMatch = N.ok && J.ok && N.n === J.n, maskMatch = D.devMask[k] === st.mask[k];
        const dv = card.querySelector('[data-v="devip"]');
        const val = N.none ? '0.0.0.0' : (N.ip || '(empty)') + ' /' + N.mask;
        let cls = 'hwn-ro', rs = '';
        if (pr === 'pn') {
          if (N.none) { cls += ' none'; rs = 'no IP yet'; }
          else if (ipMatch && maskMatch && ev.conn[k].ok) { cls += ' same'; rs = '✓ set by the PLC'; }
          else rs = 'not the project IP yet';
        } else if (ipMatch) { cls += ' same'; rs = '✓ same IP as the project'; }
        else { cls += ' diff' + (N.none ? ' none' : ''); rs = N.none ? '✕ no IP yet' : '✕ not the project IP'; }
        dv.className = cls;
        dv.innerHTML = '<span class="hwn-rv">' + esc(val) + '</span><span class="hwn-rs">' + rs + '</span>';
        if (pr === 'pn') {
          const dn = card.querySelector('[data-v="devname"]'), v = D.devName[k], pn = String(D.name[k]).trim();
          const okN = !!v && v === pn && nameOk(pn);
          dn.className = 'hwn-ro ' + (okN ? 'same' : 'diff') + (v ? '' : ' none');
          dn.innerHTML = '<span class="hwn-rv">' + esc(v || '(empty: new device)') + '</span><span class="hwn-rs">' + (okN ? '✓ same as the project' : v ? '✕ not the project name' : '✕ no name') + '</span>';
          const nin = card.querySelector('input[data-f="name"]');
          nin.classList.toggle('bad', !nameOk(pn));
          card.querySelector('[data-a="assign"]').disabled = busy || okN;
        } else {
          const on = D.bootp[k], bt = card.querySelector('[data-a="setip"]');
          bt.textContent = on ? 'Set IP (BOOTP/DHCP tool)' : 'Set IP on the device';
          bt.disabled = busy || (ipMatch && maskMatch);
          const boot = card.querySelector('[data-v="boot"]');
          const mNote = ipMatch && !maskMatch ? ' The device still uses mask /' + N.mask + '; press "' + bt.textContent + '" to send /' + st.mask[k] + '.' : '';
          if (on && N.ok) {
            boot.className = 'hwn-boot warn';
            boot.innerHTML = '<span><b>BOOTP/DHCP is still on.</b> After a power cycle the device asks again and can lose this IP.' + mNote + '</span><button class="btn small" data-a="noboot" data-k="' + k + '"' + (busy ? ' disabled' : '') + '>Disable BOOTP/DHCP</button>';
          } else if (on) {
            boot.className = 'hwn-boot';
            boot.innerHTML = '<span>BOOTP/DHCP: <b>on</b> (factory setting). The device asks for an IP at every start-up.</span>';
          } else {
            boot.className = 'hwn-boot';
            boot.innerHTML = '<span>BOOTP/DHCP: <b>off</b> (fixed IP). ' + (ipMatch ? 'The device keeps its IP after a power cycle.' : 'It never asks the BOOTP tool, so set the IP on its keypad or web page.') + mNote + '</span>';
          }
        }
        const fl = card.querySelector('[data-v="file"]');
        if (D.file[k]) {
          fl.className = 'hwn-file';
          fl.innerHTML = '<span><span class="hwn-okt">✓ ' + F + ' installed</span> <small>' + (k === 'io' ? '(it came with the PLC software)' : '(the tool knows this drive now)') + '</small></span>';
        } else {
          fl.className = 'hwn-file miss';
          fl.innerHTML = '<div><b>Unknown device — install its device description file</b><small>' + (pr === 'pn'
            ? 'Without the GSDML the tool does not know its modules, data or parameters. PROFINET has no generic way around it.'
            : 'Without the EDS the tool does not know its data or parameters. (Experts can use a "Generic Ethernet Module" with numbers from the manual, but the EDS is the normal, safer way.)')
            + '</small></div><button class="btn small primary" data-a="install" data-k="' + k + '"' + (busy ? ' disabled' : '') + '>Install ' + F + '</button>';
        }
      });
    }
    function paintLists() {
      const ev = lastEv, pr = st.proto;
      const okTxt = { lp: 'Online: download, monitor, force.', hp: 'The HMI reads and writes PLC tags.', io: PR[pr].ioOk, drive: PR[pr].ioOk };
      $('.hwn-conns').innerHTML = CONNS.map((c) => {
        const x = ev.conn[c], cl = x.ok ? 'ok' : x.code === 'wait' ? 'idle' : 'bad';
        return '<li><span class="hwn-st ' + cl + '" aria-hidden="true">' + (x.ok ? '✓' : x.code === 'wait' ? '…' : '✕') + '</span><div><b>' + CL[c] + '</b><small>' + (x.ok ? okTxt[c] : '<b style="font-weight:700">' + CHIP[x.code] + ':</b> ' + esc(x.why)) + '</small></div></li>';
      }).join('');
      const items = [['lp', 'Laptop reaches the PLC'], ['nodup', 'No duplicate IP'], ['hp', 'HMI connected to the PLC'], ['file', 'Device file installed (' + PR[pr].file + ')'], ['io', 'Remote I/O exchanging data'], ['drive', 'Drive exchanging data']];
      const n = items.filter((it) => ev.mis[it[0]]).length;
      $('.hwn-mis').innerHTML = items.map((it) => '<li class="' + (ev.mis[it[0]] ? 'done' : '') + '"><span class="check ' + (ev.mis[it[0]] ? 'done' : '') + '" role="img" aria-label="' + (ev.mis[it[0]] ? 'done' : 'not done yet') + '">' + (ev.mis[it[0]] ? '✓' : '') + '</span><span>' + it[1] + '</span></li>').join('');
      $('.hwn-prog').textContent = PR[pr].label + ' · Mission ' + n + '/6';
      $('.hwn-prog2').textContent = n + ' of 6 done';
      const win = $('.hwn-win');
      win.hidden = !ev.done;
      if (ev.done) {
        const other = pr === 'pn' ? 'eip' : 'pn', both = st.won.pn && st.won.eip;
        const bootOn = pr === 'eip' && IOD.filter((k) => st.eip.bootp[k]);
        let h = '<div><b>All green.</b> This is what you check at every machine start-up: IP and mask, no duplicate IP, device names, device files.</div>';
        if (bootOn && bootOn.length) h += '<div>One more step: BOOTP/DHCP is still on in ' + list(bootOn) + '. Disable it, or the IP can be lost after a power cycle.</div>';
        h += '<div><b>Bonus:</b> set your laptop to 192.168.1.10 with mask 255.255.0.0 and ping the PLC. Only one side sees the other: that is a mask mismatch.</div>';
        h += both ? '<div><b>Both missions done</b> (PROFINET and EtherNet/IP).</div>' : '<button type="button" class="btn small" data-go="' + other + '"' + (busy ? ' disabled' : '') + '>Try the ' + PR[other].label + ' mission →</button>';
        win.innerHTML = h;
      }
    }
    function paintPing() {
      const cur = st.ping;
      pingSel.innerHTML = ['plc', 'hmi', 'io', 'drive'].map((k) => {
        const ip = String(st.ip[k]).trim() || '(empty)';
        return '<option value="' + k + '">' + esc(PNAME[k]) + ' — ' + esc(ip) + '</option>';
      }).join('');
      pingSel.value = cur;
      const old = !!pingSig && sig() !== pingSig && !!term.textContent;
      staleEl.hidden = !old;
      term.classList.toggle('old', old);
    }
    function paintIntro() {
      const pn = st.proto === 'pn';
      $('.hwn-intro').innerHTML = pn
        ? '<b>PROFINET:</b> the PLC finds each IO device by its <b>name</b>, then gives it the IP from the project. Every device needs its <b>GSDML</b> file. <b>Your mission:</b> make every cable green.'
        : '<b>EtherNet/IP:</b> no names. The PLC (scanner) finds each device by its <b>IP</b>, so the IP in the device must equal the IP in the project. Device file = <b>EDS</b>. Each I/O connection runs at an <b>RPI</b> (requested packet interval). <b>Your mission:</b> make every cable green.';
      root.querySelectorAll('[data-proto]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.proto === st.proto)));
    }
    function paintExample() {
      const p1 = pal(0xc0a80000, 24), p2 = pal(0xc0a80100, 24);
      const sp = (p, a, b) => '<span class="hwn-addr">' + hlSpan(p, a) + '.<span class="hwn-hp">' + b + '</span></span>';
      $('.hwn-ex').innerHTML = '<span>' + sp(p1, '192.168.0', '1') + ' and ' + sp(p1, '192.168.0', '20') + ': same street</span><span>' + sp(p2, '192.168.1', '10') + ': other street</span>';
    }
    function applyBusy() {
      root.classList.toggle('hwn-busy', busy);
      root.querySelectorAll('[data-proto],[data-a="reset"],[data-a="ping"],[data-go],.hwn-in,.hwn-sel').forEach((el) => { el.disabled = busy; });
    }
    function paint() {
      if (layName === '' || !G) buildTopo();
      updateColours();
      paintTopo(); paintCards(); paintLists(); paintPing(); paintExample();
      applyBusy();
      kick();
    }
    function rebuildAll() {
      buildTopo(); buildCards(); paintIntro();
      paint();
    }
    function setBusy(b) { busy = b; paintCards(); paintLists(); applyBusy(); }
    function widthCls() {
      const w = root.clientWidth;
      root.classList.toggle('hwn-c3', w >= 660);
      root.classList.toggle('hwn-c2', w >= 440 && w < 660);
    }
    const clone = () => JSON.parse(JSON.stringify(st));

    /* ── actions ── */
    // PROFINET "Assign device name": DCP Set (layer 2) → OK → the PLC finds the name and sends the project IP.
    function doAssign(k) {
      const n = String(st.pn.name[k]).trim(), nb = nameBad(n);
      if (nb) { flush(); say(nb + ' It cannot be written into the device.', 'bad'); return; }
      run(async () => {
        const ip = String(st.ip[k]).trim(), twin = IOD.filter((o) => o !== k && st.pn.devName[o] === n)[0];
        const sim = clone(); sim.pn.devName[k] = n;
        const out = evaluate(sim, []);
        focusNode(k);
        step('① Your laptop sends DCP "Set name: ' + n + '" to the MAC address of ' + SHORT[k] + '.');
        await fly('laptop', k, 'set', 'DCP', 1300);
        topoName(k, n);
        step('② ' + cap1(SHORT[k]) + ' saves the name and answers OK.');
        await fly(k, 'laptop', 'set', 'OK', 1000);
        if (out.conn[k].ok) {
          step('③ The PLC finds "' + n + '" and sends it its project IP ' + ip + '.');
          await fly('plc', k, 'set', 'IP', 1200);
        }
        st.pn.devName[k] = n;
        refresh(true);
        const first = !st.seen.dcp; st.seen.dcp = true; save();
        const s1 = 'You wrote "' + n + '" into ' + SHORT[k] + ' with DCP' + (first ? ': it finds the device by its MAC address, so the IP does not matter.' : '.');
        if (lastEv.conn[k].ok) {
          step('✓ ' + PR.pn.cyc, 'ok');
          return { s1, s2: 'The PLC found it by this name and gave it its project IP ' + ip + '.', kind: 'ok', back: '[data-card="' + k + '"] [data-v="devname"]' };
        }
        const code = lastEv.status[k].code;
        step('✕ Still blocked: ' + CHIP[code] + '.', 'bad');
        const s2 = twin ? 'Careful: ' + SHORT[twin] + ' already has this name, so now two devices answer to it.' : 'Still blocked: ' + lastEv.status[k].why;
        return { s1, s2, kind: 'bad', back: '[data-card="' + k + '"] [data-v="devname"]' };
      });
    }
    // EtherNet/IP: BOOTP/DHCP tool (device asks, tool answers) or, with BOOTP off, set on the device itself.
    function doSetIp(k) {
      const ipS = String(st.ip[k]).trim(), m = st.mask[k], c = check(ipS, m);
      if (!c.ok) { flush(); say('The IP in the project is not usable (' + c.why + '). Fix it first, then send it to the device.', 'bad'); return; }
      const viaBootp = st.eip.bootp[k];
      run(async () => {
        const sim = clone(); sim.eip.devIp[k] = ipS; sim.eip.devMask[k] = m;
        const out = evaluate(sim, []);
        focusNode(k);
        if (viaBootp) {
          step('① ' + cap1(SHORT[k]) + ' has BOOTP/DHCP on, so it asks with its MAC address: "Who gives me an IP?"');
          await fly(k, 'laptop', 'set', 'BOOTP?', 1200);
          step('② The BOOTP/DHCP tool on your laptop answers: "Use ' + ipS + ' /' + m + '."');
          await fly('laptop', k, 'set', ipS, 1300);
        } else {
          step('① You type ' + ipS + ' /' + m + ' on ' + SHORT[k] + ' itself (keypad or web page). No network tool is needed.');
          tagAt(k, 'keypad: ' + ipS);
          await wait(1500);
        }
        topoIp(k, ipS, '');
        if (out.conn[k].ok) {
          step('③ The PLC opens its I/O connection to ' + ipS + ' (CIP "Forward Open").');
          await fly('plc', k, 'set', 'Fwd Open', 1200);
        }
        st.eip.devIp[k] = ipS; st.eip.devMask[k] = m;
        clearX();
        refresh(true);
        const ok = lastEv.conn[k].ok;
        step(ok ? '✓ ' + PR.eip.cyc : '✕ Still blocked: ' + CHIP[lastEv.status[k].code] + '.', ok ? 'ok' : 'bad');
        let s1, s2;
        if (viaBootp) {
          s1 = cap1(SHORT[k]) + ' asked for an IP (BOOTP) and the tool gave it ' + ipS + (ok ? '; the PLC opens its I/O connection (RPI 10 ms).' : '.');
          s2 = ok ? 'Now click "Disable BOOTP/DHCP", or the device forgets this IP after a power cycle.' : 'Still blocked: ' + lastEv.status[k].why;
        } else {
          s1 = 'You set ' + ipS + ' on ' + SHORT[k] + ' itself: with a fixed IP it never asks the BOOTP tool.';
          s2 = ok ? 'The PLC opens its I/O connection (RPI 10 ms).' : 'Still blocked: ' + lastEv.status[k].why;
        }
        return { s1, s2, kind: ok ? 'ok' : 'bad', back: '[data-card="' + k + '"] [data-v="devip"]' };
      });
    }
    function doNoBoot(k) {
      run(async () => {
        focusNode(k);
        step('① The tool tells ' + SHORT[k] + ': "Keep this IP, stop asking for one."');
        await fly('laptop', k, 'set', 'BOOTP off', 1200);
        st.eip.bootp[k] = false;
        refresh(true);
        step('✓ BOOTP/DHCP is off: the IP stays after a power cycle.', 'ok');
        return { s1: 'BOOTP/DHCP is off: ' + SHORT[k] + ' keeps ' + st.eip.devIp[k] + ' after a power cycle.', s2: '', kind: 'ok', back: '[data-card="' + k + '"] [data-v="devip"]' };
      });
    }
    function doInstall(k) {
      if (busy) return;
      flush();
      const F = PR[st.proto].file, before = lastEv;
      st[st.proto].file[k] = true;
      refresh();
      const ok = lastEv.conn[k].ok, won = !before.done && lastEv.done;
      step('✓ ' + F + ' installed for ' + SHORT[k] + '.', 'ok');
      const s1 = 'You installed the ' + F + ' of ' + SHORT[k] + ': now the tool knows its ' + (st.proto === 'pn' ? 'modules, data and parameters.' : 'data and parameters.');
      say(won ? s1 + ' Mission complete: all 6 checks are green.' : s1 + ' ' + (ok ? 'The PLC starts exchanging data with it.' : 'Still blocked: ' + lastEv.status[k].why), ok ? 'ok' : 'bad');
    }
    function pingResult() {
      const t = st.ping, ev = lastEv, N = ev.N, Lp = N.laptop, tip = String(st.ip[t]).trim();
      const T = parseIp(tip), four = (cls, s) => [[cls, s], [cls, s], [cls, s], [cls, s]];
      const rep = (ms, ttl) => ['g', 'Reply from ' + tip + ': bytes=32 time' + ms + ' TTL=' + (ttl || 64)];
      if (!Lp.ok) return { anim: 'local', lines: four('r', 'PING: transmit failed. General failure.'), recv: 0, cap: 'Your laptop has no valid IP (' + Lp.why + '), so it cannot send anything. Fix its IP first.', now: '✕ Your laptop has no valid IP: nothing leaves it.' };
      if (!T || T.bad) {
        const why = !tip ? 'The IP field of ' + SHORT[t] + ' is empty, so there is nothing to ping.' : T && T.lead ? '"' + tip + '" has leading zeros: write ' + T.lead[1] + ' (some tools read a leading 0 as an octal number).' : '"' + tip + '" is not a valid IP, so there is nothing to ping.';
        return { anim: 'none', lines: [['r', 'Ping request could not find host ' + (tip || '(empty)') + '. Please check the name and try again.']], nostat: true, cap: why, now: '✕ Not a valid IP address.' };
      }
      const tmask = st.mask[t], Tn = { n: T.n, mask: tmask };
      const owners = DEVS.filter((k) => k !== 'laptop' && N[k].ok && N[k].n === T.n);
      if (T.n === Lp.n) return { anim: 'none', lines: [rep('<1ms', 128), rep('<1ms', 128), rep('<1ms', 128), rep('<1ms', 128)], recv: 4, cap: tip + ' is the address of your own laptop, so your laptop answers itself. Give the laptop its own IP.', now: '⚠ Your laptop answered itself.', kind: 'bad' };
      if (!local(Lp, Tn)) {
        const tn = ntoa((T.n & maskN(tmask)) >>> 0);
        return { anim: 'local', lines: four('r', 'PING: transmit failed. General failure.'), recv: 0, cap: 'No route: ' + Lp.ip + '/' + Lp.mask + ' is in network ' + ntoa(Lp.net) + '; ' + (t === 'plc' ? 'the PLC' : SHORT[t]) + ' ' + tip + '/' + tmask + ' is in ' + tn + '. Different street — no router.', now: '✕ No route: ' + tip + ' is not on your laptop\'s street, and there is no router.' };
      }
      if (!owners.length) {
        let why;
        if (isIO(t)) {
          const cur = N[t], D = st[st.proto];
          why = 'Nobody has ' + tip + ' yet: ' + SHORT[t] + (cur.none ? ' has no IP (0.0.0.0)' : cur.ok ? ' still has ' + cur.ip : ' has no valid IP');
          if (st.proto === 'pn') {
            const need = [];
            if (!D.file[t]) need.push('its GSDML is installed');
            if (D.devName[t] !== String(D.name[t]).trim()) need.push('its name matches');
            why += need.length ? '; the PLC gives it ' + tip + ' once ' + need.join(' and ') : '; the PLC cannot give it the IP yet (' + CHIP[ev.conn[t].code] + ')';
          } else why += D.bootp[t] ? '; give it the IP with the BOOTP/DHCP tool' : '; set the IP on the device';
          why += '.';
        } else why = N[t].ok ? 'Nobody answers at ' + tip + '.' : cap1(SHORT[t]) + ' cannot use ' + tip + ': ' + N[t].why + '.';
        const first = !st.seen.arp; st.seen.arp = true;
        return { anim: 'arp', lines: four('r', 'Reply from ' + Lp.ip + ': Destination host unreachable.'), recv: 4, cap: why + (first ? ' The "Reply" lines come from your own laptop: nobody answered its ARP question "who has ' + tip + '?"' : ''), now: '✕ Nobody answers the ARP question "who has ' + tip + '?"' };
      }
      if (owners.length > 1 || ev.dup.laptop.length) {
        const who = ev.dup.laptop.length ? ['laptop'].concat(ev.dup.laptop) : owners, dip = ev.dup.laptop.length ? Lp.ip : tip;
        const first = !st.seen.acd; st.seen.acd = true;
        return { anim: 'dup', owners, lines: [rep('=1ms'), rep('=3ms'), ['r', 'Request timed out.'], rep('=1ms')], recv: 3, kind: 'bad', cap: COUNT[who.length] + ' devices answer to ' + dip + ' (' + list(who) + ') — replies get mixed up, connections drop now and then.' + (first ? ' Many industrial devices detect this (Address Conflict Detection): one stops using the address and its network LED turns red.' : ''), now: '⚠ ' + COUNT[who.length] + ' devices answer to ' + dip + ': duplicate IP.' };
      }
      const o = owners[0], O = N[o];
      if (!local(O, Lp)) return { anim: 'mask', o, lines: four('r', 'Request timed out.'), recv: 0, cap: 'Request timed out: ' + SHORT[o] + ' got the ping, but with mask /' + O.mask + ' it thinks your laptop is on another street, so the reply never comes back. This is a mask mismatch.', now: '✕ The reply gets lost: mask mismatch.' };
      let cap, kind = 'ok';
      if (o !== t) { cap = 'It was ' + SHORT[o] + ' that answered, not ' + SHORT[t] + '!'; kind = 'bad'; }
      else if (isIO(t) && !ev.conn[t].ok) { cap = cap1(SHORT[t]) + ' answered, but ping tests only the IP layer: its I/O exchange is still blocked (' + CHIP[ev.conn[t].code] + ').'; kind = 'bad'; }
      else if (Lp.mask !== O.mask) cap = cap1(SHORT[o]) + ' answered: the masks differ (/' + Lp.mask + ' and /' + O.mask + '), but each side sees the other on its own street.';
      else cap = cap1(SHORT[o]) + ' answered in less than 1 ms: same street (' + split(Lp.ip, Lp.mask)[0] + '), one owner of the address.';
      return { anim: 'ok', o, lines: [rep('<1ms'), rep('<1ms'), rep('<1ms'), rep('<1ms')], recv: 4, cap, kind, now: '✓ Reply from ' + tip + ' in less than 1 ms.' };
    }
    function doPing() {
      run(async () => {
        const res = pingResult(), tip = String(st.ip[st.ping]).trim(), A = res.anim;
        save();
        const head = '<span class="c">C:\\&gt; ping ' + esc(tip || '(empty)') + '</span>\n', hd2 = '<span class="c">Pinging ' + esc(tip) + ' with 32 bytes of data:</span>\n';
        term.classList.remove('old'); staleEl.hidden = true;
        term.innerHTML = head + (res.nostat ? '' : hd2);
        if (A !== 'none') focusNode(res.o || (A === 'ok' || A === 'mask' ? st.ping : ''));
        if (A === 'local') {
          step('① Your laptop wants to ping ' + tip + '…');
          markX(await fly('laptop', 'sw', 'ping', 'ping', 700, 0.4));
        } else if (A === 'arp') {
          step('① Your laptop asks everyone: "Who has ' + tip + '?" (ARP)');
          await fly('laptop', 'sw', 'ping', 'ARP?', 900);
          await Promise.all(DEVS.filter((d) => d !== 'laptop').map((d) => fly('sw', d, 'ping', '', 700)));
          markX(G ? G.port.laptop : null); await wait(300);
        } else if (A === 'mask') {
          step('① Ping to ' + tip + '…');
          await fly('laptop', res.o, 'ping', 'ping', 1200);
          step('② ' + cap1(SHORT[res.o]) + ' answers, but its mask sends the reply nowhere.');
          markX(await fly(res.o, 'laptop', 'ping', 'reply', 600, 0.25));
        } else if (A === 'dup') {
          step('① Ping to ' + tip + '…');
          await fly('laptop', 'sw', 'ping', 'ping', 700);
          await Promise.all(res.owners.map((o) => fly('sw', o, 'ping', '', 700)));
          step('② ' + COUNT[res.owners.length] + ' devices answer to the same address!');
          await Promise.all(res.owners.map((o) => fly(o, 'laptop', 'ping', 'reply', 1100)));
        } else if (A === 'ok') {
          step('① Ping to ' + tip + '…');
          await fly('laptop', res.o, 'ping', 'ping', 1200);
          step('② ' + cap1(SHORT[res.o]) + ' replies.');
          await fly(res.o, 'laptop', 'ping', 'reply', 1200);
        }
        const out = res.lines.map((l) => '<span class="' + l[0] + '">' + esc(l[1]) + '</span>').join('\n');
        const recv = res.recv || 0;
        term.innerHTML = head + (res.nostat ? out : hd2 + out + '\n<span class="c">Packets: Sent = 4, Received = ' + recv + ', Lost = ' + (4 - recv) + ' (' + (100 - recv * 25) + '% loss)</span>');
        pingSig = sig();
        step(res.now, res.kind === 'ok' ? 'ok' : 'bad');
        return { s1: res.cap, s2: '', kind: res.kind || 'bad', show: '.hwn-term' };
      });
    }
    function switchProto(p) {
      if (busy || p === st.proto || (p !== 'pn' && p !== 'eip')) return;
      flush();
      st.proto = p; term.textContent = ''; pingSig = ''; clearX();
      lastEv = evaluate(st, []);
      if (lastEv.done) st.won[p] = true;
      rebuildAll(); save();
      stepIdle();
      const n = faultCount(st, lastEv);
      const head = p === 'eip' ? 'EtherNet/IP: devices are found by their IP, not by a name, and the device file is an EDS.' : 'PROFINET: the PLC finds each IO device by its name and gives it its IP; the device file is a GSDML.';
      const tail = n === 0 ? ' Everything already works here.' : n >= 5 ? ' ' + faultsTxt(n) + ' block the network.' : ' Laptop, PLC and HMI settings carry over from the other mission: ' + faultsTxt(n) + ' left.';
      say(head + tail, '');
    }

    /* ── events ── */
    root.addEventListener('click', (e) => {
      const pb = e.target.closest('[data-proto],[data-go]');
      if (pb) { if (!pb.disabled) switchProto(pb.dataset.proto || pb.dataset.go); return; }
      const b = e.target.closest('[data-a]');
      if (!b || b.disabled) return;
      const a = b.dataset.a, k = b.dataset.k;
      if (a === 'more') { capBox.classList.toggle('open'); fitMore(); return; }
      if (busy) return;
      if (a === 'reset') {
        clearTimeout(capT); pend = null;
        try { localStorage.removeItem(STORE); } catch (err) { /* ignore */ }
        const p = st.proto;
        st = start(); st.proto = p;
        term.textContent = ''; pingSig = ''; clearX();
        lastEv = evaluate(st, []);
        rebuildAll(); stepIdle();
        say('Back to the start of the ' + PR[p].label + ' mission: ' + faultsTxt(faultCount(st, lastEv)) + ' block the network.', '');
      } else if (a === 'assign') doAssign(k);
      else if (a === 'setip') doSetIp(k);
      else if (a === 'noboot') doNoBoot(k);
      else if (a === 'install') doInstall(k);
      else if (a === 'ping') doPing();
    });
    cardsEl.addEventListener('input', (e) => {
      const el = e.target, k = el.dataset.k, f = el.dataset.f;
      if (!k || !f || f === 'mask' || busy) return;
      editStart(k, f);
      if (f === 'ip') st.ip[k] = el.value; else if (f === 'name') st.pn.name[k] = el.value; else if (f === 'hmiplc') st.hmiPlc = el.value;
      refresh();
      stepIdle();
    });
    cardsEl.addEventListener('change', (e) => {
      const el = e.target, k = el.dataset.k, f = el.dataset.f;
      if (!k || !f) return;
      if (f === 'mask') { flush(); editStart(k, 'mask'); st.mask[k] = el.value === '16' ? 16 : 24; refresh(); stepIdle(); flush(); }
      else flush();
    });
    cardsEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.target.blur(); flush(); } });
    pingSel.addEventListener('change', () => { st.ping = pingSel.value; save(); });

    /* ── life cycle ── */
    const onResize = () => {
      clearTimeout(rT);
      rT = setTimeout(() => {
        if (dead || !document.body.contains(root)) { dispose(); return; }
        widthCls();
        const w = svgW.clientWidth;
        if (w && (w < NARROW ? 'narrow' : 'wide') !== layName) { buildTopo(); paintTopo(); kick(); }
        fitMore();
      }, 80);
    };
    function dispose() {
      if (dead) return;
      dead = true;
      obs.forEach((o) => o.disconnect()); obs.length = 0;
      if (!('ResizeObserver' in window)) window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf); raf = 0;
      clearTimeout(capT); clearTimeout(rT);
      flights.splice(0).forEach((f) => f.res(null));
      if (cleanup === dispose) cleanup = null;
    }
    cleanup = dispose;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) kick(); });
      io.observe(root); obs.push(io);
    }
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(onResize); ro.observe(root); obs.push(ro); }
    else window.addEventListener('resize', onResize);

    widthCls();
    lastEv = evaluate(st, []);
    if (lastEv.done) st.won[st.proto] = true;
    rebuildAll();
    stepIdle();
    save();
    capP.textContent = st.cap || introCap();
    capBox.className = 'hwn-cap' + (st.cap && st.capKind ? ' ' + st.capKind : '');
    fitMore();
  };
})();
