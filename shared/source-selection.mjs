// Select authored variants independently for each pane and unlocked property.
export function selectSources(panels, policy, preferences, java = false, split = false) {
  const locks = policy.locks || {};
  const showcase = policy.presentation === 'showcase';
  const available = panels.some((p) => p.language === preferences.dialect)
    ? preferences.dialect
    : 'kalm';
  const terminal = panels.every((p) => !['kalm', 'kalms', 'java'].includes(p.language));
  const groups = new Map();
  panels.forEach((panel, index) => {
    if (panel.os && !locks.os && panel.os !== preferences.os) return;
    if (panel.shell && !locks.shell && panel.shell !== preferences.shell) return;
    if (panel.dialect && !locks.dialect && panel.dialect !== preferences.dialect) return;
    if (
      !terminal &&
      (showcase
        ? !locks.dialect && ![available, 'java'].includes(panel.language)
        : split
          ? ![available, 'java'].includes(panel.language)
          : panel.language !== (java ? 'java' : available))
    )
      return;
    const key = showcase
      ? panel.pane || (locks.dialect ? panel.language : panel.language === 'java' ? 'java' : 'kalm')
      : terminal
        ? 'terminal'
        : panel.language;
    groups.set(key, [...(groups.get(key) || []), { panel, index }]);
  });
  return [...groups.values()].map(
    (group) =>
      (
        group.find(
          ({ panel }) => !panel.style || locks.style || panel.style === preferences.style,
        ) || group[0]
      ).index,
  );
}
export function initializeSources(id, policy) {
  const frame = document.getElementById(id);
  const root = document.documentElement;
  const panels = [...frame.querySelectorAll(':scope > .comparison-panes > section')];
  const selected = selectSources(
    panels.map((p) => p.dataset),
    policy,
    {
      dialect: root.dataset.dialect || 'kalm',
      style: root.dataset.codeStyle || 'indentation',
      os: root.dataset.codeOs,
      shell: root.dataset.codeShell,
    },
  );
  panels.forEach((panel, index) => {
    panel.hidden = !selected.includes(index);
    if (frame.hasAttribute('data-home')) {
      panel.dataset.visible = String(selected.includes(index));
      panel.inert = !selected.includes(index);
    }
  });
}
