export function enhanceMainFocus() {
  const main = document.querySelector<HTMLElement>('#main');
  const skip = document.querySelector<HTMLAnchorElement>('.skip-link');
  if (!main) return;
  let tabbing = false;
  let skipping = false;

  document.addEventListener('keydown', event => { tabbing = event.key === 'Tab'; });
  document.addEventListener('keyup', event => { if (event.key === 'Tab') tabbing = false; });
  document.addEventListener('pointerdown', () => {
    tabbing = false;
    delete main.dataset.mainFocus;
  }, { passive: true });
  main.addEventListener('focus', () => {
    if (tabbing || skipping) main.dataset.mainFocus = '';
  });
  main.addEventListener('blur', () => { delete main.dataset.mainFocus; });
  skip?.addEventListener('click', event => {
    event.preventDefault();
    skipping = true;
    main.focus({ preventScroll: true });
    main.dataset.mainFocus = '';
    skipping = false;
    main.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}
