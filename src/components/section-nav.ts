// Reveal the selected topic within the sidebar without scrolling the article.
export function revealCurrentTopic() {
  const navigation = document.querySelector<HTMLElement>('.sidebar-inner');
  const current = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!navigation || !current || navigation.scrollHeight <= navigation.clientHeight) return;
  const offset = current.getBoundingClientRect().top - navigation.getBoundingClientRect().top;
  navigation.scrollTop += offset - navigation.clientHeight / 3;
}

// A native disclosure keeps long topic lists one tap away on smaller screens.
export function enhanceSectionNavigation() {
  const details = document.querySelector<HTMLDetailsElement>('.section-navigation');
  if (!details) return;
  const mobile = window.matchMedia('(max-width: 960px)');
  const resize = () => {
    details.open = !mobile.matches;
    if (details.open) requestAnimationFrame(revealCurrentTopic);
  };
  details.addEventListener('toggle', () => {
    if (details.open) requestAnimationFrame(revealCurrentTopic);
  });
  mobile.addEventListener('change', resize);
  resize();
}
