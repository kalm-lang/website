export function installHomeNavigation() {
  let forceFallback = false;
  const accept = (event) => {
    const link =
      event.target instanceof Element ? event.target.closest('a[href]') : null;
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
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
    if (
      target.origin === location.origin &&
      target.pathname === location.pathname &&
      target.search === location.search
    ) {
      // The home link otherwise reloads the page and restarts the intro animation.
      if (location.pathname === '/' && link.classList.contains('brand')) {
        event.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        });
        window.dispatchEvent(new Event('kalm-home-replay'));
      }
      return null;
    }
    return target;
  };
  document.addEventListener('click', (event) => {
    const target = accept(event);
    if (!target) return;
    forceFallback = target.origin === location.origin && target.pathname === '/';
    if (target.origin === location.origin) {
      try {
        sessionStorage.setItem('kalm-home-arrival', target.pathname);
      } catch {
        /* Optional arrival motion. */
      }
    }
    window.dispatchEvent(
      new CustomEvent('kalm-home-navigation', { detail: { event, url: target.href } }),
    );
  });
  window.addEventListener('pageswap', (event) => {
    if (
      event.viewTransition &&
      (forceFallback || matchMedia('(prefers-reduced-motion: reduce)').matches)
    )
      event.viewTransition.skipTransition();
  });
  window.addEventListener('pageshow', () => {
    forceFallback = false;
  });
}
