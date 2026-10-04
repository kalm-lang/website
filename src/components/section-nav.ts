// The same links form a desktop sidebar and a compact mobile topic panel.
export function enhanceSectionNavigation() {
  const details = document.querySelector<HTMLDetailsElement>('.section-navigation');
  if (!details) return;
  const panel = details.querySelector<HTMLElement>('.sidebar-inner');
  const summary = details.querySelector<HTMLElement>('summary');
  const trigger = document.querySelector<HTMLButtonElement>('.topic-trigger');
  if (!panel) return;
  const mobile = window.matchMedia('(max-width: 960px)');
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let openFrame = 0;
  const clearTransition = () => {
    clearTimeout(closeTimer);
    cancelAnimationFrame(openFrame);
    panel.removeAttribute('data-closing');
    panel.removeAttribute('data-open');
  };
  const openPanel = () => {
    clearTransition();
    details.open = true;
    if (!mobile.matches) return;
    // Let the closed position paint before applying the open state.
    void panel.offsetWidth;
    openFrame = requestAnimationFrame(() => {
      panel.dataset.open = '';
    });
  };
  const closePanel = () => {
    if (!details.open || panel.hasAttribute('data-closing')) return;
    if (!mobile.matches) { details.open = false; return; }
    panel.removeAttribute('data-open');
    panel.dataset.closing = '';
    trigger?.setAttribute('aria-expanded', 'false');
    closeTimer = setTimeout(() => {
      details.open = false;
      panel.removeAttribute('data-closing');
    }, 200);
  };
  const resize = () => {
    clearTransition();
    details.open = !mobile.matches;
  };
  mobile.addEventListener('change', resize);
  resize();
  details.dataset.navigationReady = '';
  const header = document.querySelector<HTMLElement>('.site-header');
  if (header) {
    const measureHeader = () => {
      document.documentElement.style.setProperty('--site-header-height', `${header.getBoundingClientRect().height}px`);
    };
    new ResizeObserver(measureHeader).observe(header);
    measureHeader();
  }
  trigger?.addEventListener('click', () => {
    if (details.open && !panel.hasAttribute('data-closing')) closePanel();
    else openPanel();
  });
  trigger?.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    trigger.focus({ preventScroll: true });
  });

  details.addEventListener('toggle', () => {
    trigger?.setAttribute('aria-expanded', String(details.open && mobile.matches && !panel.hasAttribute('data-closing')));
    if (!mobile.matches || !details.open) return;
    requestAnimationFrame(() => {
      const current = panel.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) return;
      const bounds = panel.getBoundingClientRect();
      panel.scrollTop += current.getBoundingClientRect().top - bounds.top - bounds.height / 2;
    });
  });
  details.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.nav-branch-toggle') : null;
    const branch = button?.closest<HTMLElement>('.nav-branch');
    if (!button || !branch) return;
    const expanded = branch.toggleAttribute('data-expanded');
    button.setAttribute('aria-expanded', String(expanded));
  });
  document.addEventListener('pointerdown', event => {
    if (mobile.matches && details.open && !details.contains(event.target as Node) && !trigger?.contains(event.target as Node)) closePanel();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && details.open) {
      closePanel();
      (trigger ?? summary)?.focus({ preventScroll: true });
    }
  });
}
