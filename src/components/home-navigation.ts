import { gsap } from 'gsap';

const homeIntroTargets =
  '.hero h1, .hero-description, .hero .actions .button, .hero-sample, .notes-section .section-heading, .feature, .start-box .section-heading, .start-content > *';

let homeArrival: gsap.core.Timeline | undefined;

function clearHomeArrival() {
  if (!homeArrival) return;
  homeArrival.kill();
  gsap.set(homeIntroTargets, { clearProps: 'opacity,visibility,transform,filter' });
  delete document.documentElement.dataset.homeIntro;
  homeArrival = undefined;
}

function animateHomeArrival() {
  homeArrival = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      gsap.set(homeIntroTargets, { clearProps: 'opacity,visibility,transform,filter' });
      delete document.documentElement.dataset.homeIntro;
      homeArrival = undefined;
    },
  })
    .fromTo('.hero h1',
      { autoAlpha: 0, y: 34, filter: 'blur(8px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.85 },
    )
    .fromTo('.hero-description',
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.62 },
      '-=0.48',
    )
    .fromTo('.hero .actions .button',
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.56, stagger: 0.1 },
      '-=0.38',
    )
    .fromTo('.hero-sample',
      { autoAlpha: 0, y: 38, scale: 0.965, rotateY: -5, transformPerspective: 1200 },
      { autoAlpha: 1, y: 0, scale: 1, rotateY: 0, duration: 1 },
      '-=0.82',
    )
    .fromTo('.notes-section .section-heading, .feature',
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.075 },
      '-=0.35',
    )
    .fromTo('.start-box .section-heading, .start-content > *',
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1 },
      '-=0.3',
    )
    .timeScale(1.4);
}

export function enhanceHomeNavigation() {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving = false;
  const native = 'onpageswap' in window && CSS.supports('view-transition-name', 'page-content');
  window.addEventListener('kalm-home-navigation', ((
    event: CustomEvent<{ event: MouseEvent; url: string }>,
  ) => {
    const url = new URL(event.detail.url);
    const rootNavigation = url.origin === location.origin && url.pathname === '/';
    if (location.pathname === '/' && url.origin === location.origin && !rootNavigation) clearHomeArrival();
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
    if (location.pathname === '/' && !reduced()) animateHomeArrival();
    else if (path === location.pathname && (!native || location.pathname === '/') && !reduced()) {
      gsap.from('#main', {
        opacity: 0,
        y: 5,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
      });
      gsap.from('.document-scrollbar', {
        opacity: 0,
        duration: 0.22,
        clearProps: 'opacity',
      });
    }
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
