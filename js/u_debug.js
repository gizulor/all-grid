/* js/u_debug.js — debugging aides for logged-in users
   Loaded once per page by forms/misc/u_debug.txp; styles live in the kit's _debug.scss.

   Toolbar (bottom-left). The bug button switches everything on/off; the rest toggle:
     Outlines    dotted outline on every element
     Names       page/form names from <txp::u_debug title='form: thumb' /> markers.
                 Hover any element to highlight the form that output it.
     Containers  every container-query container, with its current inline size
     Grid        baseline grid (1rlh + half), page gutters, breakpoint lines
     Header      (pages with an o_header or o_nav) flips the header's switches and
                 menu type live, and copies the matching <txp::o_header /> tag.
                 Nothing is saved: reload to get the page's own markup back.

   Markers are HTML comments (<!--u_debug form: thumb-->), so they add no elements
   to the page. Each names its parent element; a marker directly in <body> names the page.
   Settings are remembered per browser (localStorage). */

(() => {
  if (window.uDebug) return;

  const KEY = 'sasskit-debug';
  const PREFIX = 'u_debug ';
  const BP_COLOURS = ['#e5484d', '#f5a524', '#30a46c', '#0090ff', '#8e4ec6', '#d6409f'];
  const TOOLS = [
    ['outlines', 'Outlines', 'Dotted outline on every element'],
    ['names', 'Names', 'Page and form names. Hover an element to highlight its form'],
    ['containers', 'Containers', 'Container-query containers and their current width'],
    ['grid', 'Grid', 'Baseline grid, page gutters and breakpoints'],
  ];

  const state = { open: false, outlines: true, names: true, containers: false, grid: false, header: false };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* private mode etc. */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  const root = document.documentElement;
  const body = document.body;
  const make = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  };

  /* Breakpoints, read from the CSS custom property _debug.scss generates */
  const breakpoints = getComputedStyle(root)
    .getPropertyValue('--u-debug-breakpoints')
    .replace(/["']/g, '').trim().split(/\s+/).filter(Boolean)
    .map(pair => { const [name, width] = pair.split(':'); return { name, px: parseFloat(width) }; })
    .filter(bp => bp.name && !isNaN(bp.px))
    .sort((a, b) => a.px - b.px);

  /* Overlay */
  const ui = make('div', 'u_debug-ui');
  ui.setAttribute('aria-hidden', 'true');
  const grid = make('div', 'u_debug-ui__grid');
  const layer = make('div', 'u_debug-ui__layer');
  const box = make('div', 'u_debug-ui__box');
  box.hidden = true;
  ui.append(grid, layer, box);

  breakpoints.forEach((bp, i) => {
    const line = make('div', 'u_debug-ui__bp');
    line.style.left = bp.px + 'px';
    line.style.color = BP_COLOURS[i % BP_COLOURS.length];
    line.append(make('span', null, `${bp.name} ${bp.px}`));
    grid.append(line);
  });

  /* Toolbar */
  const bar = make('div', 'u_debug-bar');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Debugging aides');

  const toggle = make('button', 'u_debug-bar__toggle');
  toggle.type = 'button';
  toggle.title = 'Debugging aides';
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 12h-4v-2h4m0 6h-4v-2h4m6-6h-2.81a5.985 5.985 0 0 0-1.82-1.96L17 4.41 15.59 3l-2.17 2.17a6.002 6.002 0 0 0-2.83 0L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8z"/></svg>';
  toggle.addEventListener('click', () => { state.open = !state.open; save(); schedule(); });

  const info = make('span', 'u_debug-bar__info');
  bar.append(toggle, info);

  const buttons = TOOLS.map(([key, label, title]) => {
    const b = make('button', null, label);
    b.type = 'button';
    b.title = title;
    b.addEventListener('click', () => { state[key] = !state[key]; save(); schedule(); });
    bar.append(b);
    return [key, b];
  });

  /* Header switcher ------------------------------------------------------
     Works on the first .o_header and its menu (or a separate .o_nav).
     Lists must match the CSS: scss/4-organisms/_o_header.scss, 3-molecules/_m_menu.scss */
  const header = document.querySelector('.o_header');
  const menu = (header && header.querySelector('.m_menu')) || document.querySelector('.o_nav');
  const ARRANGE = ['split', 'inline', 'stacked', 'centred'];
  const POSITION = ['sticky', 'over', 'over-hero', 'forehead'];
  const SCROLLED = ['shrink', 'solidify'];
  const MENUS = ['inline', 'compact', 'overlay'];
  const FROM = ['small', 'medium', 'desktop'];
  const H = 'o_header--';
  const INLINE_FROM = /^m_menu--inline@(\w+)$/;

  const has = (el, c) => !!el && el.classList.contains(c);
  const arrangement = () => ARRANGE.find(a => has(header, H + a)) || 'split';
  const menuType = () => MENUS.find(m => has(menu, 'm_menu--' + m)) || 'inline';
  const inlineFrom = () => {
    const c = menu && [...menu.classList].find(c => INLINE_FROM.test(c));
    return c ? c.match(INLINE_FROM)[1] : '';
  };

  const panel = make('div', 'u_debug-bar__panel');
  panel.hidden = true;
  const syncers = [];
  const tagOut = make('code', 'u_debug-bar__tag');
  let headerButton = null;

  function row(label, items, isOn, set) {
    const r = make('div', 'u_debug-bar__row');
    r.append(make('span', 'u_debug-bar__row-label', label));
    items.forEach(([text, value]) => {
      const b = make('button', null, text);
      b.type = 'button';
      b.addEventListener('click', () => { set(value); changed(); });
      syncers.push(() => b.setAttribute('aria-pressed', String(isOn(value))));
      r.append(b);
    });
    panel.append(r);
  }

  function changed() {
    // An open menu panel would stay open across a type change: close it
    const open = menu && menu.querySelector('.m_menu__panel');
    try { if (open && open.matches(':popover-open')) open.hidePopover(); } catch (e) { /* no popover support */ }
    if (window.oHeader) window.oHeader.update();
    syncPanel();
    schedule();
  }

  function txpTag() {
    const lines = [];
    if (header) {
      const classes = [...header.classList].filter(c => c !== 'o_header' && c !== 'is-scrolled');
      const attrs = [`class="${classes.join(' ')}"`];
      if (header.getAttribute('style')) attrs.push(`style="${header.getAttribute('style')}"`);
      if (!header.querySelector('.o_header__slogan')) attrs.push('slogan="0"');
      if (menu && header.contains(menu)) {
        if (menuType() !== 'inline') attrs.push(`menu="${menuType()}"`);
        if (inlineFrom()) attrs.push(`inline="${inlineFrom()}"`);
      } else {
        attrs.push('nav="0"');
      }
      lines.push(`<txp::o_header ${attrs.join(' ')} />`);
    }
    if (menu && !(header && header.contains(menu))) {
      const own = [...menu.classList].filter(c => !/^(o_nav|m_menu|m_menu--.*|is-scrolled)$/.test(c));
      const attrs = own.length ? [`class="${own.join(' ')}"`] : [];
      if (menuType() !== 'inline') attrs.push(`menu="${menuType()}"`);
      if (inlineFrom()) attrs.push(`inline="${inlineFrom()}"`);
      lines.push(`<txp::o_nav ${attrs.join(' ')} />`.replace('  ', ' '));
    }
    return lines.join('\n');
  }

  function syncPanel() {
    syncers.forEach(f => f());
    tagOut.textContent = txpTag();
  }

  if (header || menu) {
    if (header) {
      row('Arrange', ARRANGE.map(a => [a, a]), a => arrangement() === a, a => {
        ARRANGE.forEach(x => header.classList.remove(H + x));
        header.classList.add(H + a);
      });
      row('Position', POSITION.map(p => [p, p]), p => has(header, H + p), p => header.classList.toggle(H + p));
      row('Scrolled', SCROLLED.map(p => [p, p]), p => has(header, H + p), p => header.classList.toggle(H + p));
    }
    if (menu) {
      row('Menu', MENUS.map(m => [m, m]), m => menuType() === m, m => {
        MENUS.forEach(x => menu.classList.remove('m_menu--' + x));
        menu.classList.add('m_menu--' + m);
      });
      row('Inline from', [['never', ''], ...FROM.map(f => [f, f])], f => inlineFrom() === f, f => {
        [...menu.classList].filter(c => INLINE_FROM.test(c)).forEach(c => menu.classList.remove(c));
        if (f) menu.classList.add('m_menu--inline@' + f);
      });
    }

    const copyRow = make('div', 'u_debug-bar__row');
    const copy = make('button', null, 'Copy');
    copy.type = 'button';
    copy.title = 'Copy the tag for your TXP page or form';
    copy.addEventListener('click', () => {
      const done = () => { copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy'; }, 1200); };
      const select = () => { const r = document.createRange(); r.selectNodeContents(tagOut); getSelection().removeAllRanges(); getSelection().addRange(r); };
      if (navigator.clipboard) navigator.clipboard.writeText(tagOut.textContent).then(done, select);
      else select();
    });
    copyRow.append(tagOut, copy);
    panel.append(copyRow);

    headerButton = make('button', null, 'Header');
    headerButton.type = 'button';
    headerButton.title = 'Try header and menu switches live';
    headerButton.addEventListener('click', () => { state.header = !state.header; save(); syncPanel(); schedule(); });
    bar.append(headerButton, panel);
    syncPanel();
  }

  body.append(ui, bar);

  /* Markers → Map(element → [names]) */
  const readMarkers = () => {
    const named = new Map();
    const pages = [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.data.trim();
      if (!text.startsWith(PREFIX)) continue;
      const name = text.slice(PREFIX.length).trim();
      const el = n.parentElement;
      if (!el || el === body || el === root) { pages.push(name); continue; }
      if (!named.has(el)) named.set(el, []);
      named.get(el).push(name);
    }
    return { named, pages };
  };

  const isOurs = el => ui.contains(el) || bar.contains(el);
  const findContainers = () =>
    Array.from(body.querySelectorAll('*')).filter(el =>
      !isOurs(el) && getComputedStyle(el).containerType !== 'normal');

  /* Render (batched to one per frame) */
  let raf = 0;
  let labelFor = new Map();
  let active = null;

  function schedule() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  function place(n, rect, sx, sy) {
    n.style.left = Math.round(rect.left + sx) + 'px';
    n.style.top = Math.round(rect.top + sy) + 'px';
    n.style.width = Math.round(rect.width) + 'px';
    n.style.height = Math.round(rect.height) + 'px';
  }

  function render() {
    raf = 0;
    const on = state.open;
    const { named, pages } = readMarkers();

    body.classList.toggle('u_debug', on && state.outlines);
    body.classList.toggle('u_debug--grid', on && state.grid);
    bar.classList.toggle('is-open', on);
    toggle.setAttribute('aria-expanded', String(on));
    buttons.forEach(([key, b]) => b.setAttribute('aria-pressed', String(!!state[key])));
    if (headerButton) {
      headerButton.setAttribute('aria-pressed', String(!!state.header));
      panel.hidden = !(on && state.header);
    }

    // Info: page name(s), viewport width, active breakpoint, rhythm unit
    const cs = getComputedStyle(root);
    const remPx = parseFloat(cs.fontSize) || 16;
    const unitPx = parseFloat(cs.lineHeight) || remPx * 1.5;
    const width = window.innerWidth;
    const current = breakpoints.filter(bp => width >= bp.px).pop();
    info.replaceChildren();
    if (pages.length) info.append(make('b', null, pages.join(' · ')), ' · ');
    info.append(`${width}px `, make('b', null, current ? current.name : 'base'),
      ` · 1rem ${+remPx.toFixed(1)} · 1rlh ${+unitPx.toFixed(1)}`);

    const overlay = on && (state.names || state.containers || state.grid);
    ui.hidden = !overlay;
    layer.replaceChildren();
    labelFor = new Map();
    if (!overlay) { box.hidden = true; return; }

    // Size the overlay to the page. body's own box ignores absolutely positioned
    // children, so the overlay can't feed back into its own height.
    ui.style.height = Math.ceil(Math.max(body.getBoundingClientRect().height, window.innerHeight)) + 'px';
    const sx = window.scrollX;
    const sy = window.scrollY;

    if (state.names) {
      const stacked = new Map();   // nudge labels that would land on the same spot
      named.forEach((names, el) => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const x = Math.round(r.left + sx);
        const y = Math.round(r.top + sy);
        const key = x + ',' + y;
        const count = stacked.get(key) || 0;
        stacked.set(key, count + 1);
        const label = make('div', 'u_debug-ui__label', names.join(' · '));
        label.style.left = x + 'px';
        label.style.top = (y + count * 14) + 'px';
        layer.append(label);
        labelFor.set(el, label);
      });
    }

    if (state.containers) {
      findContainers().forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const ccs = getComputedStyle(el);
        const inner = el.clientWidth - parseFloat(ccs.paddingLeft) - parseFloat(ccs.paddingRight);
        const name = ccs.containerName && ccs.containerName !== 'none' ? ccs.containerName : 'container';
        const outline = make('div', 'u_debug-ui__container');
        place(outline, r, sx, sy);
        outline.append(make('span', null, `${name} ${Math.round(inner)}px · ${+(inner / remPx).toFixed(1)}rem`));
        layer.append(outline);
      });
    }

    highlight(active);
  }

  /* Hover: highlight the nearest named element (the form that output it) */
  function highlight(el) {
    labelFor.forEach(l => l.classList.remove('is-active'));
    const label = el && labelFor.get(el);
    if (!label || !el.isConnected) { box.hidden = true; return; }
    label.classList.add('is-active');
    place(box, el.getBoundingClientRect(), window.scrollX, window.scrollY);
    box.hidden = false;
  }

  document.addEventListener('mouseover', e => {
    if (!(state.open && state.names)) return;
    let n = e.target;
    while (n && n !== body && !labelFor.has(n)) n = n.parentElement;
    const next = n && labelFor.has(n) ? n : null;
    if (next !== active) { active = next; highlight(active); }
  }, { passive: true });

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule);
  new ResizeObserver(schedule).observe(body);   // content reflow, lazy-loaded images

  window.uDebug = { state, refresh: schedule };
  render();
})();
