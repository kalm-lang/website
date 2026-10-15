import { gsap } from 'gsap';
export function enhanceHomeNavigation() {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving = false;
  const native = 'onpageswap' in window && CSS.supports('view-transition-name', 'page-content');
  window.addEventListener('kalm-home-navigation', ((
    event: CustomEvent<{ event: MouseEvent; url: string }>,
  ) => {
    const url = new URL(event.detail.url);
    const rootNavigation = url.origin === location.origin && url.pathname === '/';
    if ((native && url.origin === location.origin && !rootNavigation) || reduced()) return;
    event.detail.event.preventDefault();
    if (leaving) return;
    leaving = true;
    const target =
      document.querySelector('dialog[open] .card-turn-back') || document.querySelector('#main');
    const scrollbar = document.querySelector('.document-scrollbar');
    gsap.to(target, {
      opacity: 0,
      y: -5,
      duration: 0.16,
      ease: 'power2.in',
      onComplete: () => location.assign(event.detail.url),
    });
    gsap.to(scrollbar, { opacity: 0, duration: 0.16, ease: 'power2.in' });
  }) as EventListener);
  try {
    const path = sessionStorage.getItem('kalm-home-arrival');
    sessionStorage.removeItem('kalm-home-arrival');
    if (path === location.pathname && (!native || location.pathname === '/') && !reduced())
      gsap.from('#main', {
        opacity: 0,
        y: 5,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
    if (path === location.pathname && (!native || location.pathname === '/') && !reduced())
      gsap.from('.document-scrollbar', {
        opacity: 0,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'opacity',
      });
  } catch {
    /* No arrival animation is required for navigation to work. */
  }
  window.addEventListener('pageshow', (event) => {
    leaving = false;
    if (!event.persisted) return;
    gsap.killTweensOf('#main');
    gsap.set('#main', { clearProps: 'opacity,transform' });
    gsap.killTweensOf('.document-scrollbar');
    gsap.set('.document-scrollbar', { clearProps: 'opacity' });
  });
}
