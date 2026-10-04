// Keep native <details> behavior when motion is reduced or unavailable.
export function enhanceDisclosures() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new WeakMap<HTMLDetailsElement, Animation[]>();

  document.addEventListener('click', event => {
    const target = event.target;
    const summary = target instanceof Element ? target.closest('summary') : null;
    const details = summary?.parentElement;
    const panel = details?.querySelector<HTMLElement>(':scope > .feature-body, :scope > .sidebar-inner');
    if (!(details instanceof HTMLDetailsElement) || !panel || reducedMotion.matches || !panel.animate) return;

    event.preventDefault();
    const opening = !details.open;
    const currentHeight = panel.getBoundingClientRect().height;
    active.get(details)?.forEach(animation => animation.cancel());

    if (opening) details.open = true;
    else details.dataset.closing = '';

    const finalHeight = panel.getBoundingClientRect().height;
    const panelAnimation = panel.animate(opening
      ? [{ height: '0px', opacity: 0, transform: 'translateY(-4px)' },
        { height: `${finalHeight}px`, opacity: 1, transform: 'translateY(0)' }]
      : [{ height: `${currentHeight}px`, opacity: 1, transform: 'translateY(0)' },
        { height: '0px', opacity: 0, transform: 'translateY(-4px)' }],
    { duration: 190, easing: 'cubic-bezier(.22,.75,.25,1)' });
    const animations = [panelAnimation];

    if (details.matches('.feature')) {
      const cardSummary = details.querySelector<HTMLElement>(':scope > summary');
      if (cardSummary) animations.push(cardSummary.animate(opening
        ? [{ minHeight: '16rem' }, { minHeight: '0px' }]
        : [{ minHeight: '0px' }, { minHeight: '16rem' }],
      { duration: 190, easing: 'cubic-bezier(.22,.75,.25,1)' }));
    }

    active.set(details, animations);
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (active.get(details) !== animations) return;
      if (!opening) details.open = false;
      delete details.dataset.closing;
      active.delete(details);
    });
  });
}
