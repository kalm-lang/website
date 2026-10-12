export function installHomeNavigation() {
  let eligible = false;
  const accept = (event) => {
    const link =
      event.target instanceof Element ? event.target.closest('a[data-home-navigation]') : null;
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.defaultPrevented ||
      link.target ||
      link.hasAttribute('download')
    )
      return null;
    const target = new URL(link.href);
    return location.pathname === '/' && target.origin === location.origin && target.pathname !== '/'
      ? target
      : null;
  };
  document.addEventListener('click', (event) => {
    const target = accept(event);
    eligible = Boolean(target);
    if (!target) return;
    try {
      sessionStorage.setItem('kalm-home-arrival', target.pathname);
    } catch {
      /* Optional arrival motion. */
    }
    window.dispatchEvent(
      new CustomEvent('kalm-home-navigation', { detail: { event, url: target.href } }),
    );
  });
  window.addEventListener('pageswap', (event) => {
    if (
      event.viewTransition &&
      (!eligible || matchMedia('(prefers-reduced-motion: reduce)').matches)
    )
      event.viewTransition.skipTransition();
  });
  window.addEventListener('pageshow', () => {
    eligible = false;
  });
}
