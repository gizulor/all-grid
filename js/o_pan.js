/* js/o_pan.js — Ken Burns slideshow for figure.o_pan
   Loaded once per page by forms/misc/o_figure_pan.txp. Styles and options:
   scss/4-organisms/_o_pan.scss.

   Moves .is-current along the images. Before each switch it picks the incoming
   image's zoom direction and the point it zooms towards, and waits until that image
   has loaded, so a fade never shows a blank. Pauses while the slideshow is off screen
   or the tab is hidden. Timings come from the CSS (--o-pan-slide, --o-pan-fade). */

(() => {
  if (window.oPan) return;

  // data-drift names → transform-origin
  const SPOTS = {
    'center': '50% 50%',
    'top': '50% 0%', 'top-left': '0% 0%', 'top-right': '100% 0%',
    'left': '0% 50%', 'right': '100% 50%',
    'bottom': '50% 100%', 'bottom-left': '0% 100%', 'bottom-right': '100% 100%',
  };

  const pick = list => list[Math.floor(Math.random() * list.length)];

  // '7s' / '700ms' from a CSS custom property, in ms
  const ms = (el, name, fallback) => {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    if (!v) return fallback;
    return v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000;
  };

  function setup(fig) {
    const imgs = [...fig.querySelectorAll(':scope > img')];
    if (!imgs.length) return;

    const zoom = fig.dataset.zoom || 'random';
    const spots = (fig.dataset.drift || Object.keys(SPOTS).join(' ')).split(/\s+/).filter(s => SPOTS[s]);
    const shuffle = fig.dataset.order === 'random';
    let index = 0;
    let out = Math.random() < .5;
    let timer = 0;
    let visible = false;

    // Zoom direction and target point for the image about to show
    const prepare = img => {
      out = zoom === 'out' ? true
        : zoom === 'in' ? false
        : zoom === 'alternate' ? !out
        : Math.random() < .5;
      img.classList.toggle('is-out', out);
      img.style.setProperty('--o-pan-origin', SPOTS[pick(spots.length ? spots : ['center'])]);
    };

    prepare(imgs[0]);
    imgs[0].classList.add('is-current');
    if (imgs.length === 1) imgs[0].classList.add('is-solo');
    fig.classList.add('is-running', 'is-paused');

    function advance() {
      timer = 0;
      const current = imgs[index];
      const step = shuffle ? 1 + Math.floor(Math.random() * (imgs.length - 1)) : 1;
      const nextIndex = (index + step) % imgs.length;
      const next = imgs[nextIndex];

      next.loading = 'eager';
      const ready = next.decode ? next.decode() : Promise.resolve();

      ready.catch(() => {}).then(() => {
        if (!visible) return;   // paused while it loaded: resume() starts again
        imgs.forEach(img => img.classList.remove('is-leaving'));
        current.classList.replace('is-current', 'is-leaving');
        prepare(next);
        next.classList.add('is-current');
        index = nextIndex;
        setTimeout(() => current.classList.remove('is-leaving'), ms(fig, '--o-pan-fade', 1500));
        timer = setTimeout(advance, ms(fig, '--o-pan-slide', 7000));
      });
    }

    function resume() {
      fig.classList.remove('is-paused');
      if (imgs.length > 1 && !timer) timer = setTimeout(advance, ms(fig, '--o-pan-slide', 7000));
    }

    function pause() {
      fig.classList.add('is-paused');
      clearTimeout(timer);
      timer = 0;
    }

    const update = () => {
      const shouldRun = visible && !document.hidden;
      shouldRun ? resume() : pause();
    };

    new IntersectionObserver(entries => {
      visible = entries[entries.length - 1].isIntersecting;
      update();
    }).observe(fig);

    document.addEventListener('visibilitychange', update);
  }

  const start = () => document.querySelectorAll('.o_pan').forEach(setup);
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();

  window.oPan = { setup };
})();
