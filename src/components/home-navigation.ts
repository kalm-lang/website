import { gsap } from 'gsap';

const homeIntroTargets =
  '.setup-wizard, .setup-welcome, .setup-welcome-line, .setup-wizard-inner, .hero h1, .hero-description, .hero .actions .button, .hero-sample, .notes-section .section-heading, .feature, .start-box .section-heading, .start-content > *';

let homeArrival: gsap.core.Timeline | undefined;

function clearHomeArrival() {
  if (!homeArrival) return;
  homeArrival.kill();
  gsap.set(homeIntroTargets, { clearProps: 'opacity,visibility,transform,filter' });
  document.querySelector('.setup-wizard')?.removeAttribute('data-welcome');
  delete document.documentElement.dataset.homeIntro;
  homeArrival = undefined;
}

function animateHomeArrival() {
  const setupWizard = document.querySelector<HTMLElement>('.setup-wizard:not([hidden])');
  const welcome = setupWizard?.dataset.welcome === 'true';
  homeArrival = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => {
      gsap.set(homeIntroTargets, { clearProps: 'opacity,visibility,transform,filter' });
      setupWizard?.removeAttribute('data-welcome');
      delete document.documentElement.dataset.homeIntro;
      homeArrival = undefined;
    },
  });
  homeArrival
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
    );
  if (setupWizard) {
    homeArrival.fromTo(setupWizard,
      { autoAlpha: 0, y: -12 },
      { autoAlpha: 1, y: 0, duration: 0.58 },
      '-=0.45',
    );
    if (welcome) {
      homeArrival
        .fromTo(setupWizard.querySelector('.setup-welcome'),
          { autoAlpha: 0, y: 8, filter: 'blur(5px)', scale: 0.98 },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: 0.7, ease: 'power3.out' },
          '<+=0.06',
        )
        .to({}, { duration: 1.8 })
        .to(setupWizard.querySelector('[data-welcome-line="welcome"]'),
          { autoAlpha: 0, y: -12, filter: 'blur(4px)', duration: 0.48, ease: 'power2.inOut' },
        )
        .fromTo(setupWizard.querySelector('[data-welcome-line="setup"]'),
          { autoAlpha: 0, y: 14, filter: 'blur(4px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.68, ease: 'power2.out' },
          '-=0.18',
        )
        .to({}, { duration: 3.4 })
        .to(setupWizard.querySelector('[data-welcome-line="setup"]'),
          { autoAlpha: 0, y: -10, filter: 'blur(3px)', duration: 0.58, ease: 'power2.inOut' },
        )
        .fromTo(setupWizard.querySelector('.setup-wizard-inner'),
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.62, ease: 'power2.out' },
          '-=0.2',
        )
        .call(() => {
          setupWizard.removeAttribute('data-welcome');
        });
    }
  }
  homeArrival.timeScale(1.4);
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
    if ((native && url.origin === location.origin && !rootNavigation && location.pathname !== '/') || reduced()) return;
    event.detail.event.preventDefault();
    if (leaving) return;
    leaving = true;
    const dialog = document.querySelector('dialog[open] .card-turn-back');
    const target = dialog || [
      document.querySelector('#main'),
      document.querySelector('.setup-wizard'),
    ];
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
  window.addEventListener('kalm-home-replay', () => {
    if (location.pathname !== '/') return;
    clearHomeArrival();
    if (!reduced()) animateHomeArrival();
  });
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
