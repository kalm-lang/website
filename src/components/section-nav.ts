// Reveal the selected topic within the sidebar without scrolling the article.
export function revealCurrentTopic() {
  const navigation = document.querySelector<HTMLElement>('.sidebar-inner');
  const current = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!navigation || !current || navigation.scrollHeight <= navigation.clientHeight) return;
  const offset = current.getBoundingClientRect().top - navigation.getBoundingClientRect().top;
  navigation.scrollTop += offset - navigation.clientHeight / 3;
}
