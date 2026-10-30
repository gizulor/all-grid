/* js/o_tiles.js — self-changing image tiles for figure.o_tiles (all-grid's "shifty")
   Loaded once per page by forms/misc/o_figure_shifty.txp. Styles, modes and knobs:
   scss/4-organisms/_o_tiles.scss.

   The figure's children (images, and cards: anything that isn't an img) become a
   pool. The script lays out tiles to fit the box, fills them from the pool, and
   changes them over time. It re-plans when the box changes size, and pauses while
   off screen or in a hidden tab. Timings are read from the CSS. */

(() => {
  if (window.oTiles) return;

  // Fibonacci spiral in a 13 × 8 box: [column start, end, row start, end] per block, biggest first
  const SPIRAL = [[1, 9, 1, 9], [9, 14, 1, 6], [11, 14, 6, 9], [9, 11, 7, 9], [9, 10, 6, 7], [10, 11, 6, 7]];
  const SLIDES = [['100%', '0%'], ['-100%', '0%'], ['0%', '100%'], ['0%', '-100%']];

  const random = n => Math.floor(Math.random() * n);
  const make = (tag, cls) => { const el = document.createElement(tag); el.className = cls; return el; };

  // '3s' / '300ms' from a custom property, in ms
  const ms = (el, name, fallback) => {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    if (!v) return fallback;
    return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
  };

  function setup(fig) {
    const pool = [...fig.children].filter(el => !el.matches('script, template, figcaption'));
    if (!pool.length) return;

    const spiral = fig.classList.contains('o_tiles--spiral');
    const isCard = el => el.tagName !== 'IMG';
    const showing = new Set();   // pool items currently on screen
    let cells = [];
    let shape = '';
    let timer = 0;
    let running = false;
    let lastCell = null;

    pool.forEach(el => el.remove());
    const probe = make('i', 'o_tiles__probe');                       // --o-tiles-min in px
    const cardProbe = make('i', 'o_tiles__probe o_tiles__probe--card'); // --o-tiles-card-min in px
    fig.append(probe, cardProbe);

    // A copy of a pool item that isn't already showing. Cards only go in tiles at least
    // --o-tiles-card-min wide, so their text has room.
    function take(big) {
      const fits = pool.filter(el => big || !isCard(el));
      const fresh = fits.filter(el => !showing.has(el));
      const list = fresh.length ? fresh : fits.length ? fits : pool;
      const source = list[random(list.length)];
      showing.add(source);
      const copy = source.cloneNode(true);
      if (copy.tagName === 'IMG') copy.loading = 'eager';
      copy.oTilesSource = source;
      return copy;
    }

    // Tell an image how wide its tile is, so srcset picks a suitable file
    function fit(el, cell) {
      if (el.tagName === 'IMG' && cell.clientWidth) el.sizes = `${Math.ceil(cell.clientWidth)}px`;
    }

    function release(el) {
      if (el && el.oTilesSource) showing.delete(el.oTilesSource);
    }

    function addCell(area, index) {
      const cell = make('div', 'o_tiles__cell');
      cell.style.gridArea = area;
      cell.style.setProperty('--i', index);
      fig.append(cell);
      cell.oTilesBig = cell.clientWidth >= (cardProbe.offsetWidth || 240);
      const content = take(cell.oTilesBig);
      cell.append(content);
      fit(content, cell);
      return cell;
    }

    function clear() {
      cells.forEach(cell => { [...cell.children].forEach(release); cell.remove(); });
      cells = [];
    }

    // Shift and panels: as many tiles as fit, some spanning 2 or 4 cells
    // (only where the grid is at least 3 cells that way, so one tile never takes over)
    function planGrid(cols, rows) {
      const used = Array.from({ length: rows }, () => Array(cols).fill(false));
      const free = (c, r, w, h) => {
        if (c + w > cols || r + h > rows) return false;
        if ((w > 1 && cols < 3) || (h > 1 && rows < 3)) return false;
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (used[y][x]) return false;
        return true;
      };
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (used[r][c]) continue;
          const roll = Math.random();
          const options = roll < .15 ? [[2, 2], [2, 1], [1, 2]]
            : roll < .3 ? [[2, 1], [1, 2]]
            : roll < .4 ? [[1, 2], [2, 1]]
            : [];
          const [w, h] = options.find(([w, h]) => free(c, r, w, h)) || [1, 1];
          for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) used[y][x] = true;
          cells.push(addCell(`${r + 1} / ${c + 1} / span ${h} / span ${w}`, cells.length));
        }
      }
    }

    // --o-tiles-tints as a list. Custom properties come back with var()s resolved,
    // so these are plain colours. Split on commas outside brackets: hsl(…), color-mix(…)
    function tints() {
      const raw = getComputedStyle(fig).getPropertyValue('--o-tiles-tints').trim();
      if (!raw || raw === 'none') return [];
      const list = [];
      let depth = 0, start = 0;
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '(') depth++;
        else if (raw[i] === ')') depth--;
        else if (raw[i] === ',' && !depth) { list.push(raw.slice(start, i)); start = i + 1; }
      }
      list.push(raw.slice(start));
      return [...new Set(list.map(t => t.trim()).filter(Boolean))];
    }

    // Spiral: 13 × 8 (or 8 × 13 when the box is portrait), turned a random way each time.
    // Each block a random colour from --o-tiles-tints: not the same as the block before it,
    // nor as the block it replaces (`under`, the previous spiral's colours)
    function planSpiral(portrait, under = []) {
      const flipX = Math.random() < .5;
      const flipY = Math.random() < .5;
      const colours = tints();
      let previous = '';
      SPIRAL.forEach(([c1, c2, r1, r2], i) => {
        if (flipX) [c1, c2] = [15 - c2, 15 - c1];
        if (flipY) [r1, r2] = [10 - r2, 10 - r1];
        const area = portrait ? `${c1} / ${r1} / ${c2} / ${r2}` : `${r1} / ${c1} / ${r2} / ${c2}`;
        const cell = addCell(area, i);
        if (colours.length) {
          const avoid = [previous, under[i]];
          const fresh = colours.filter(c => !avoid.includes(c));
          const choices = fresh.length ? fresh : colours;
          previous = choices[random(choices.length)];
          cell.style.setProperty('--o-tiles-tint', previous);
        }
        cells.push(cell);
      });
    }

    function layout(force) {
      const w = fig.clientWidth;
      const h = fig.clientHeight;
      if (!w || !h) return;
      const portrait = h > w;
      let cols, rows;
      if (spiral) {
        [cols, rows] = portrait ? [8, 13] : [13, 8];
      } else {
        const min = probe.offsetWidth || 160;
        cols = Math.max(1, Math.round(w / min));
        rows = Math.max(1, Math.round(h / min));
      }
      const next = `${cols}×${rows}`;
      if (next === shape && !force) return;
      shape = next;
      fig.style.setProperty('--o-tiles-cols', cols);
      fig.style.setProperty('--o-tiles-rows', rows);
      fig.classList.add('is-running');   // before planning, so tiles measure in the real grid
      clear();
      spiral ? planSpiral(portrait) : planGrid(cols, rows);
      if (fig.classList.contains('is-in')) cells.forEach(cell => cell.classList.add('is-shown'));
    }

    // Next spiral: the old blocks lose their images but keep their colour underneath
    // while the new blocks arrive on top, so the box never goes back to white
    function respiral() {
      const old = cells;
      const under = old.map(cell => cell.style.getPropertyValue('--o-tiles-tint'));
      old.forEach(cell => [...cell.children].forEach(el => { release(el); el.remove(); }));
      cells = [];
      planSpiral(fig.clientHeight > fig.clientWidth, under);
      return old;
    }

    // One tile changes: new content slides in, the old slides out
    function change() {
      const choices = cells.filter(cell => cell !== lastCell);
      const cell = choices.length ? choices[random(choices.length)] : cells[0];
      if (!cell) return;
      lastCell = cell;
      const [dx, dy] = SLIDES[random(SLIDES.length)];
      cell.style.setProperty('--o-tiles-dx', dx);
      cell.style.setProperty('--o-tiles-dy', dy);

      const incoming = take(cell.oTilesBig);
      fit(incoming, cell);
      const ready = incoming.decode ? incoming.decode() : Promise.resolve();
      ready.catch(() => {}).then(() => {
        if (!cell.isConnected) return;
        const old = [...cell.children];
        old.forEach(el => { el.classList.remove('is-entering'); el.classList.add('is-leaving'); });
        incoming.classList.add('is-entering');
        cell.append(incoming);
        setTimeout(() => old.forEach(el => { release(el); el.remove(); }), ms(fig, '--o-tiles-move', 1000));
      });
    }

    // Spiral cycle: in, hold, out, re-plan, repeat
    function cycle(phase) {
      const move = ms(fig, '--o-tiles-move', 1200);
      const stagger = ms(fig, '--o-tiles-stagger', 250);
      const sweep = move * 1.6 + stagger * 5;   // colour and image, every block
      if (phase === 'in') {
        cells.forEach(cell => cell.classList.add('is-shown'));   // colours (if not already)
        fig.classList.add('is-in');                               // then the images
        timer = setTimeout(() => cycle('out'), sweep + ms(fig, '--o-tiles-every', 4000));
      } else if (phase === 'out') {
        fig.classList.remove('is-in');                            // images fade to colour
        timer = setTimeout(() => cycle('new'), move + stagger * 5 + 300);
      } else {
        const old = respiral();
        void fig.offsetWidth;          // let the new blocks' hidden state render first
        timer = setTimeout(() => cycle('in'), 50);
        setTimeout(() => old.forEach(cell => cell.remove()), sweep + 100);
      }
    }

    function tick() {
      change();
      timer = setTimeout(tick, ms(fig, '--o-tiles-every', 3000));
    }

    function start() {
      if (running) return;
      running = true;
      fig.classList.remove('is-paused');
      if (spiral) timer = setTimeout(() => cycle(fig.classList.contains('is-in') ? 'out' : 'in'), 100);
      else timer = setTimeout(tick, ms(fig, '--o-tiles-every', 3000));
    }

    function stop() {
      running = false;
      fig.classList.add('is-paused');
      clearTimeout(timer);
    }

    let visible = false;
    const update = () => (visible && !document.hidden ? start() : stop());

    layout();
    new ResizeObserver(() => { layout(); }).observe(fig);
    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      update();
    }).observe(fig);
    document.addEventListener('visibilitychange', update);
  }

  const startAll = () => document.querySelectorAll('.o_tiles').forEach(setup);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', startAll) : startAll();

  window.oTiles = { setup };
})();