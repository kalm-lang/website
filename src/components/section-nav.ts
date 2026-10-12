import { restoreSidebar } from '../../shared/sidebar.mjs';
// The same links form a desktop sidebar and a compact mobile topic panel.
export function enhanceSectionNavigation() {
  const details = document.querySelector<HTMLDetailsElement>('.section-navigation');
  if (!details) return;
  const panel = details.querySelector<HTMLElement>('.sidebar-inner');
  const summary = details.querySelector<HTMLElement>('summary');
  const trigger = document.querySelector<HTMLButtonElement>('.topic-trigger');
  if (!panel) return;
  const mobile = window.matchMedia('(max-width: 960px)');
  const sidebar = details.closest<HTMLElement>('.sidebar')!;
  const section = sidebar.dataset.section!;
  const save = () => {
    const surface = mobile.matches ? panel : sidebar;
    try {
      sessionStorage.setItem(
        'kalm-sidebar-' + section + '-' + (mobile.matches ? 'mobile' : 'desktop'),
        JSON.stringify({
          top: surface.scrollTop,
          branches: [
            ...details.querySelectorAll<HTMLAnchorElement>(
              '.nav-branch[data-expanded] .nav-parent',
            ),
          ].map((link) => link.pathname),
        }),
      );
    } catch {
      /* Optional storage. */
    }
  };
  sidebar.addEventListener('scroll', save, { passive: true });
  panel.addEventListener('scroll', save, { passive: true });
  details.addEventListener('click', () => queueMicrotask(save));
  window.addEventListener('pagehide', save);
  window.addEventListener('pageshow', () => restoreSidebar(section, true));
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
    restoreSidebar(section, true);
    openFrame = requestAnimationFrame(() => {
      panel.dataset.open = '';
    });
  };
  const closePanel = () => {
    if (!details.open || panel.hasAttribute('data-closing')) return;
    if (!mobile.matches) {
      details.open = false;
      return;
    }
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
    restoreSidebar(section, !mobile.matches);
  };
  mobile.addEventListener('change', resize);
  resize();
  details.dataset.navigationReady = '';
  const header = document.querySelector<HTMLElement>('.site-header');
  if (header) {
    const measureHeader = () => {
      document.documentElement.style.setProperty(
        '--site-header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    };
    new ResizeObserver(measureHeader).observe(header);
    measureHeader();
  }
  trigger?.addEventListener('click', () => {
    if (details.open && !panel.hasAttribute('data-closing')) closePanel();
    else openPanel();
  });
  trigger?.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    trigger.focus({ preventScroll: true });
  });

  details.addEventListener('toggle', () => {
    trigger?.setAttribute(
      'aria-expanded',
      String(details.open && mobile.matches && !panel.hasAttribute('data-closing')),
    );
    if (!mobile.matches || !details.open) return;
    requestAnimationFrame(() => {
      restoreSidebar(section, true);
    });
  });
  details.addEventListener('click', (event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('.nav-branch-toggle')
        : null;
    const branch = button?.closest<HTMLElement>('.nav-branch');
    if (!button || !branch) return;
    const expanded = branch.toggleAttribute('data-expanded');
    button.setAttribute('aria-expanded', String(expanded));
  });
  document.addEventListener('pointerdown', (event) => {
    if (
      mobile.matches &&
      details.open &&
      !details.contains(event.target as Node) &&
      !trigger?.contains(event.target as Node)
    )
      closePanel();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobile.matches && details.open) {
      closePanel();
      (trigger ?? summary)?.focus({ preventScroll: true });
    }
  });
}
