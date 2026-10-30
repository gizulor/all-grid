/* js/o_header.js — scroll state for the header and sticky nav
   Loaded once per page by forms/misc/o_header.txp and o_nav.txp.

   Adds .is-scrolled to .o_header and .o_nav--sticky while they're stuck to the top
   of the window (sticky or fixed, and the page has scrolled). The CSS decides what
   that means: o_header--shrink, o_header--solidify.

   Also closes an open menu panel when a resize turns its menu back to inline
   (m_menu--inline@medium), so an overlay can't stay open, invisible, and lock scrolling.

   window.oHeader.update() re-checks; the debug toolbar calls it after switching classes. */

(() => {
  if (window.oHeader) return;

  let raf = 0;

  function update() {
    raf = 0;
    const scrolled = window.scrollY > 0;

    document.querySelectorAll('.o_header, .o_nav--sticky').forEach(el => {
      const position = getComputedStyle(el).position;
      const pinned = position === 'sticky' || position === 'fixed';
      const atTop = Math.round(el.getBoundingClientRect().top) <= 0;
      el.classList.toggle('is-scrolled', scrolled && pinned && atTop);
    });
  }

  function closeInlinePanels() {
    if (!HTMLElement.prototype.hidePopover) return;   // no popover support
    document.querySelectorAll('.m_menu').forEach(menu => {
      const panel = menu.querySelector('.m_menu__panel');
      const toggle = menu.querySelector('.m_menu__toggle');
      // inline = its button is hidden
      if (panel && toggle && panel.matches(':popover-open') && getComputedStyle(toggle).display === 'none') {
        panel.hidePopover();
      }
    });
  }

  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => { closeInlinePanels(); schedule(); }, { passive: true });

  window.oHeader = { update: schedule };
  update();
})();
