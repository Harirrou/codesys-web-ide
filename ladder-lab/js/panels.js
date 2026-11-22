/* PLC Start: the panel parts used to choose what to see. Each one is a real control-cabinet part,
   picked to fit what it chooses:
   - rungs(): the topic groups on Home. Every group is a rung; tap it, the contact closes, the power runs
     to the coil and the group opens. Several can be open, like several rungs can be true.
   - breakers(): the lesson levels on Learn. One breaker per level and a main switch for all of them.
   - fuses(): the task levels on Tasks. Seat a fuse and its level is live; the busbar shows where.
   - selector(): the quiz modes. A rotary selector switch with one position per mode.
   All are buttons underneath (keyboard, screen reader), drawn with SVG and CSS so they follow the theme.
   css/app.css, section "panel parts", draws them. */
(function () {
  'use strict';
  const LL = (typeof window !== 'undefined' ? window : globalThis).LL = (typeof window !== 'undefined' ? window : globalThis).LL || {};
  const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let uid = 0;

  // ── rungs: groups = [{ id, name, color, tag, meta, done, of, body: () => Element }], open = [ids]
  const CONTACT = '<svg class="rg-ct" viewBox="0 0 44 36" aria-hidden="true"><rect class="rg-bg" x="16" y="2" width="12" height="32"/><path class="rg-ct-w" d="M0 18h15M29 18h15"/><path class="rg-ct-b" d="M15 5v26M29 5v26"/><rect class="rg-ct-f" x="17" y="8" width="10" height="20"/></svg>';
  const COIL = '<svg class="rg-coil" viewBox="0 0 48 36" aria-hidden="true"><circle class="rg-bg" cx="24" cy="18" r="15"/><path class="rg-ct-w" d="M0 18h10M38 18h10"/><circle class="rg-coil-f" cx="24" cy="18" r="9"/><path class="rg-coil-b" d="M16 5a17 17 0 0 0 0 26M32 5a17 17 0 0 1 0 26"/></svg>';
  function rungs(host, groups, o) {
    o = o || {};
    const open = new Set(o.open || []);
    const box = h('<div class="rg-rails"></div>');
    groups.forEach((g, i) => {
      const id = 'rg' + (++uid);
      const s = h(`<section class="rg" style="--tc:${g.color}">
        <button class="rg-head" type="button" aria-expanded="false" aria-controls="${id}">
          <span class="rg-no">${esc(g.tag || 'R' + String(i + 1).padStart(2, '0'))}</span>
          <span class="rg-t"><b>${esc(g.name)}</b><span class="rg-m">${esc(g.meta || '')}</span></span>
          <span class="rg-line" aria-hidden="true"><i></i></span>${CONTACT}${COIL}
          <span class="rg-pg" title="${g.done} of ${g.of} done">${g.done}/${g.of}</span>
          <span class="rg-hint" aria-hidden="true"></span>
        </button>
        <div class="rg-body" id="${id}" hidden></div>
      </section>`);
      const head = s.querySelector('.rg-head'), body = s.querySelector('.rg-body');
      const set = (on, quiet) => {
        if (on && !body.firstChild) body.appendChild(g.body());
        s.classList.toggle('on', on); head.setAttribute('aria-expanded', on ? 'true' : 'false'); body.hidden = !on;
        if (on) open.add(g.id); else open.delete(g.id);
        if (!quiet && o.onChange) o.onChange([...open]);
      };
      head.addEventListener('click', () => set(!s.classList.contains('on')));
      set(open.has(g.id), true);
      box.appendChild(s);
    });
    host.appendChild(box);
    return box;
  }

  // ── one-of-many parts: items = [{ v, n, name, color, done, of }], value, all: label of the "everything" part
  function pick(cls, label, host, items, o, draw) {
    o = o || {};
    const wrap = h(`<div class="${cls}" role="radiogroup" aria-label="${esc(label)}"></div>`);
    const parts = [];
    const all = o.all ? [{ v: 'all', main: true, name: o.all, n: '', color: '' }].concat(items) : items;
    const sel = (v, quiet) => {
      parts.forEach(([b, it]) => { const on = it.v === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
      wrap.dataset.v = v;
      const it = all.find((x) => x.v === v); if (it && it.color) wrap.style.setProperty('--tc', it.color); else wrap.style.removeProperty('--tc');
      if (!quiet && o.onChange) o.onChange(v);
    };
    all.forEach((it) => {
      const b = h(draw(it));
      b.setAttribute('role', 'radio');
      b.addEventListener('click', () => sel(it.v));
      b.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!k) return;
        e.preventDefault();
        const i = all.indexOf(it), nx = all[(i + k + all.length) % all.length];
        sel(nx.v); parts[all.indexOf(nx)][0].focus();
      });
      parts.push([b, it]); wrap.appendChild(b);
    });
    host.appendChild(wrap);
    sel(all.some((it) => it.v === o.value) ? o.value : all[0].v, true);
    return { el: wrap, set: sel };
  }
  const count = (it) => (it.of ? `<span class="pk-ct">${it.done}/${it.of}</span>` : '');

  function breakers(host, items, o) {
    return pick('bk-panel', o && o.label || 'Choose', host, items, o, (it) => `<button type="button" class="bk${it.main ? ' bk-main' : ''}"${it.color ? ` style="--tc:${it.color}"` : ''} title="${esc(it.name)}">
      <span class="bk-lamp" aria-hidden="true"></span>
      <span class="bk-body" aria-hidden="true"><span class="bk-lever"><span class="bk-on">ON</span><span class="bk-off">OFF</span></span></span>
      <span class="bk-lbl">${it.main ? '<b>ALL</b>' : `<b>${esc(it.n)}</b> ${esc(it.short || it.name)}`}</span>${count(it)}
    </button>`);
  }

  function fuses(host, items, o) {
    const p = pick('fz-panel', o && o.label || 'Choose', host, items, o, (it) => `<button type="button" class="fz${it.main ? ' fz-main' : ''}"${it.color ? ` style="--tc:${it.color}"` : ''} title="${esc(it.name)}">
      <span class="fz-lamp" aria-hidden="true"></span>
      <span class="fz-hold" aria-hidden="true"><span class="fz-cap"></span><span class="fz-glass"><i></i></span><span class="fz-cap"></span></span>
      <span class="fz-lbl"><b>${it.main ? 'ALL' : 'F' + esc(it.n)}</b> ${it.main ? '' : esc(it.short || it.name)}</span>${count(it)}
    </button>`);
    p.el.appendChild(h('<span class="fz-bus" aria-hidden="true"></span>'));
    return p;
  }

  // ── rotary selector (a box of 100 x 66 units, centre 50 / 35): items = [{ v, name, color }], value
  function selector(host, items, o) {
    o = o || {};
    const n = items.length, span = Math.min(260, 50 * (n - 1)), a0 = -span / 2, step = n > 1 ? span / (n - 1) : 0;
    const ang = (i) => a0 + i * step;
    const ticks = Array.from({ length: 72 }, (_, k) => { const a = (k * 5) * Math.PI / 180; const r1 = 92, r2 = k % 2 ? 96 : 99; return `M${(100 + r1 * Math.sin(a)).toFixed(1)} ${(100 - r1 * Math.cos(a)).toFixed(1)}L${(100 + r2 * Math.sin(a)).toFixed(1)} ${(100 - r2 * Math.cos(a)).toFixed(1)}`; }).join('');
    const marks = items.map((it, i) => { const a = ang(i) * Math.PI / 180; return `<circle class="sw-mark" data-i="${i}" cx="${(100 + 80 * Math.sin(a)).toFixed(1)}" cy="${(100 - 80 * Math.cos(a)).toFixed(1)}" r="4" style="--tc:${it.color}"/>`; }).join('');
    const wrap = h(`<div class="sw">
      <div class="sw-dial">
        <svg class="sw-face" viewBox="0 0 200 200" aria-hidden="true"><circle class="sw-plate" cx="100" cy="100" r="99"/><path class="sw-ticks" d="${ticks}"/>${marks}<circle class="sw-ring" cx="100" cy="100" r="60"/></svg>
        <button type="button" class="sw-knob" aria-label="Turn the selector to the next mode"><span class="sw-grip"><i></i></span></button>
        <div class="sw-legend" role="radiogroup" aria-label="${esc(o.label || 'Mode')}"></div>
      </div>
    </div>`);
    const knob = wrap.querySelector('.sw-knob'), leg = wrap.querySelector('.sw-legend');
    const btns = items.map((it, i) => {
      const a = ang(i) * Math.PI / 180, x = 50 + 31 * Math.sin(a), y = (35 - 31 * Math.cos(a)) / 66 * 100;
      const side = Math.sin(a) > 0.25 ? 'r' : Math.sin(a) < -0.25 ? 'l' : 'c';
      const b = h(`<button type="button" role="radio" class="sw-pos sw-${side}" style="--tc:${it.color};left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"><span class="sw-led" aria-hidden="true"></span><span>${esc(it.name)}</span></button>`);
      b.addEventListener('click', () => sel(i));
      b.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (k) { e.preventDefault(); sel((cur + k + n) % n); btns[cur].focus(); } });
      leg.appendChild(b); return b;
    });
    let cur = -1;
    function sel(i, quiet) {
      if (i === cur) return;
      cur = i;
      wrap.style.setProperty('--sw-a', ang(i) + 'deg');
      wrap.style.setProperty('--tc', items[i].color);
      btns.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-checked', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
      wrap.querySelectorAll('.sw-mark').forEach((m) => m.classList.toggle('on', +m.dataset.i === i));
      wrap.classList.remove('clack'); void wrap.offsetWidth; wrap.classList.add('clack');
      if (!quiet && o.onChange) o.onChange(items[i].v);
    }
    knob.addEventListener('click', () => sel((cur + 1) % n));
    host.appendChild(wrap);
    const i0 = Math.max(0, items.findIndex((it) => it.v === o.value));
    sel(i0, true);
    return { el: wrap, set: (v) => sel(Math.max(0, items.findIndex((it) => it.v === v))) };
  }

  LL.Panels = { rungs, breakers, fuses, selector };
})();
