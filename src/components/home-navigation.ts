import { gsap } from 'gsap';
export function enhanceHomeNavigation() {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving = false;
  const native = 'onpageswap' in window && CSS.supports('view-transition-name', 'page-content');
  window.addEventListener('kalm-home-navigation', ((
    event: CustomEvent<{ event: MouseEvent; url: string }>,
  ) => {
    if (native || reduced()) return;
    event.detail.event.preventDefault();
    if (leaving) return;
    leaving = true;
    const target =
      document.querySelector('dialog[open] .card-turn-back') || document.querySelector('#main');
    gsap.to(target, {
      opacity: 0,
      y: -5,
      duration: 0.16,
      ease: 'power2.in',
      onComplete: () => location.assign(event.detail.url),
    });
  }) as EventListener);
  try {
    const path = sessionStorage.getItem('kalm-home-arrival');
    sessionStorage.removeItem('kalm-home-arrival');
    if (path === location.pathname && !native && !reduced())
      gsap.from('#main', {
        opacity: 0,
        y: 5,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
  } catch {
    /* No arrival animation is required for navigation to work. */
  }
  window.addEventListener('pageshow', (event) => {
    leaving = false;
    if (!event.persisted) return;
    gsap.killTweensOf('#main');
    gsap.set('#main', { clearProps: 'opacity,transform' });
  });
}
