export function restoreSidebar(section, ensureCurrent = false) {
  const mobile = matchMedia('(max-width: 960px)').matches;
  const surface = document.querySelector(mobile ? '.sidebar-inner' : '.sidebar');
  if (!surface) return;
  try {
    const record = JSON.parse(
      sessionStorage.getItem('kalm-sidebar-' + section + '-' + (mobile ? 'mobile' : 'desktop')) ||
        'null',
    );
    if (record) {
      document.querySelectorAll('.nav-branch').forEach((branch) => {
        const expanded =
          record.branches.includes(branch.querySelector('a').pathname) ||
          branch.classList.contains('current-branch');
        branch.toggleAttribute('data-expanded', expanded);
        branch.querySelector('button').setAttribute('aria-expanded', String(expanded));
      });
      surface.scrollTop = record.top;
    }
  } catch {
    /* Navigation remains usable without storage. */
  }
  if (ensureCurrent && surface.clientHeight) {
    const current = surface.querySelector('[aria-current="page"]');
    if (!current) return;
    const bounds = surface.getBoundingClientRect(),
      item = current.getBoundingClientRect();
    if (item.top < bounds.top) surface.scrollTop += item.top - bounds.top;
    else if (item.bottom > bounds.bottom) surface.scrollTop += item.bottom - bounds.bottom;
  }
}
