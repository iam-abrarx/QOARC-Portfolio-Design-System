/* Style guide interactions only — nothing here belongs on production
   templates. Two jobs: copy a token value to the clipboard, and let
   .is-hover/.is-active demo states be toggled by click since a static
   page can't otherwise show a :hover state at rest. */

document.addEventListener('click', async (event) => {
  const swatch = event.target.closest('[data-copy]');
  if (!swatch) return;

  // The builder makes swatch labels editable — a click there is an author
  // placing a caret, not asking for a copy. Swapping in "Copied" underneath
  // them would eat the keystroke and the caret with it.
  if (event.target.closest('[contenteditable="true"]')) return;

  const value = swatch.getAttribute('data-copy');
  try {
    await navigator.clipboard.writeText(value);
    const label = swatch.querySelector('[data-copy-label]');
    if (label) {
      const original = label.textContent;
      label.textContent = 'Copied';
      setTimeout(() => { label.textContent = original; }, 1000);
    }
  } catch (err) {
    console.warn('Clipboard copy failed', err);
  }
});

/* Scrollspy — marks the TOC entry for whichever section currently owns the
   upper portion of the viewport. The rootMargin pulls the trigger line down
   from the sticky nav so a section highlights as it settles into reading
   position, not the instant its top pixel appears. */
(() => {
  const links = Array.from(document.querySelectorAll('.qo-toc__link'));
  if (!links.length) return;

  const byId = new Map(
    links.map((link) => [link.getAttribute('href').slice(1), link])
  );
  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const visible = new Set();

  const setCurrent = (id) => {
    links.forEach((link) => link.classList.remove('is-current'));
    const link = byId.get(id);
    if (link) link.classList.add('is-current');
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target.id);
      else visible.delete(entry.target.id);
    });

    // Multiple sections can straddle the band; take the topmost in document order.
    const current = sections.find((section) => visible.has(section.id));
    if (current) setCurrent(current.id);
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

  sections.forEach((section) => observer.observe(section));
})();

document.querySelectorAll('[data-demo-state]').forEach((group) => {
  const buttons = group.querySelectorAll('[data-state]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.querySelector(group.dataset.demoState);
      if (!target) return;
      target.classList.remove('is-hover', 'is-active', 'is-disabled');
      buttons.forEach((b) => b.classList.remove('qo-btn--primary'));
      const state = btn.dataset.state;
      if (state !== 'default') target.classList.add(`is-${state}`);
    });
  });
});
