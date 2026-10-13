// Shared by the synchronous head bootstrap and the preference menu.
export function applyPreferences(record) {
  const root = document.documentElement;
  const capabilities = JSON.parse(root.dataset.codeCapabilities || '{}');
  let saved = record;
  if (!saved) {
    try {
      saved = JSON.parse(localStorage.getItem('kalm-code-preferences') || 'null');
      if (!saved || saved.version !== 1) saved = { dialect: localStorage.getItem('kalm-dialect') };
    } catch {
      saved = {};
    }
  }
  const pick = (value, options, fallback) => (options.includes(value) ? value : fallback);
  const platform = navigator.userAgentData?.platform || navigator.platform;
  const detected = /Win/i.test(platform) ? 'windows' : /Mac/i.test(platform) ? 'macos' : 'linux';
  const preferences = {
    version: 1,
    dialect: pick(saved?.dialect, ['kalm', 'kalms'], 'kalm'),
    style: pick(saved?.style, ['indentation', 'braces'], 'indentation'),
    os: pick(saved?.os, ['auto', 'windows', 'macos', 'linux'], 'auto'),
    shell: pick(saved?.shell, ['auto', 'powershell', 'cmd', 'bash', 'zsh'], 'auto'),
    spaces: 4,
  };
  const os = preferences.os === 'auto' ? detected : preferences.os;
  const allowed = os === 'windows' ? ['powershell', 'cmd'] : ['bash', 'zsh', 'powershell'];
  if (preferences.shell !== 'auto' && !allowed.includes(preferences.shell))
    preferences.shell = 'auto';
  const shell =
    preferences.shell === 'auto'
      ? { windows: 'powershell', macos: 'zsh', linux: 'bash' }[os]
      : preferences.shell;
  root.dataset.codePreferences = JSON.stringify(preferences);
  // Keep saved choices for newer bundles while applying only supported features.
  root.dataset.dialect = capabilities.dialect === false ? 'kalm' : preferences.dialect;
  root.dataset.codeStyle = capabilities.style === false ? 'indentation' : preferences.style;
  root.dataset.codeOs = os;
  root.dataset.codeShell = shell;
  try {
    localStorage.setItem('kalm-code-preferences', JSON.stringify(preferences));
  } catch {
    /* Optional storage. */
  }
  return preferences;
}
