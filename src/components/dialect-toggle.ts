import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import { applyPreferences } from '../../shared/preferences.mjs';
import { icon } from '../../shared/icons.mjs';

export type Dialect = 'kalm' | 'kalms';
export const dialect = (): Dialect =>
  document.documentElement.dataset.dialect === 'kalms' ? 'kalms' : 'kalm';
export const codeStyle = () => document.documentElement.dataset.codeStyle || 'indentation';
class CodePreferences extends HTMLElement {
  private cleanup?: () => void;
  private readonly sync = () => {
    const root = document.documentElement;
    const preferences = JSON.parse(root.dataset.codePreferences!);
    const shell = this.querySelector<HTMLSelectElement>('[name="shell"]')!;
    const choices =
      root.dataset.codeOs === 'windows' ? ['powershell', 'cmd'] : ['bash', 'zsh', 'powershell'];
    const names: Record<string, string> = {
      powershell: 'PowerShell',
      cmd: 'cmd',
      bash: 'Bash',
      zsh: 'zsh',
    };
    shell.innerHTML =
      '<option value="auto">Automatic</option>' +
      choices
        .map((value) => '<option value="' + value + '">' + names[value] + '</option>')
        .join('');
    this.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
      select.value = preferences[select.name];
    });
    this.querySelector('.preference-summary')!.textContent =
      dialect() === 'kalms' ? 'Kalm Script' : 'Kalm';
  };
  private readonly restore = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    const previous = document.documentElement.dataset.codePreferences;
    applyPreferences();
    this.sync();
    if (previous !== document.documentElement.dataset.codePreferences)
      window.dispatchEvent(new Event('kalm-dialect-change'));
  };
  private readonly storage = (event: StorageEvent) => {
    if (event.key !== 'kalm-code-preferences') return;
    applyPreferences();
    this.sync();
    window.dispatchEvent(new Event('kalm-dialect-change'));
  };
  connectedCallback() {
    this.innerHTML =
      '<button class="preferences-trigger" type="button" popovertarget="code-preferences" aria-label="Code preferences" title="Code preferences" aria-expanded="false">' +
      icon('sliders-horizontal') +
      '<span class="preference-summary"></span>' +
      icon('chevron-down') +
      '</button>' +
      '<div id="code-preferences" class="preferences-popover" popover="auto" aria-label="Code preferences">' +
      '<h2>Code preferences</h2>' +
      '<label>Language<select name="dialect"><option value="kalm">Kalm</option><option value="kalms">Kalm Script</option></select></label>' +
      '<label>Blocks<select name="style"><option value="indentation">Indentation</option><option value="braces">Braces</option></select></label>' +
      '<p>Four-space indentation</p><details><summary>Environment</summary>' +
      '<label>Operating system<select name="os"><option value="auto">Automatic</option><option value="windows">Windows</option><option value="macos">macOS</option><option value="linux">Linux</option></select></label>' +
      '<label>Shell<select name="shell"></select></label></details></div>';
    const trigger = this.querySelector<HTMLButtonElement>('button')!;
    const popover = this.querySelector<HTMLElement>('[popover]')!;
    popover.addEventListener('toggle', () => {
      const open = popover.matches(':popover-open');
      trigger.setAttribute('aria-expanded', String(open));
      this.cleanup?.();
      this.cleanup = undefined;
      if (open)
        this.cleanup = autoUpdate(trigger, popover, () => {
          void computePosition(trigger, popover, {
            strategy: 'fixed',
            placement: 'bottom-start',
            middleware: [
              offset(8),
              flip(),
              shift({ padding: 12 }),
              size({
                padding: 12,
                apply({ availableWidth, availableHeight, elements }) {
                  Object.assign(elements.floating.style, {
                    maxWidth: Math.max(0, availableWidth) + 'px',
                    maxHeight: Math.max(0, availableHeight) + 'px',
                  });
                },
              }),
            ],
          }).then(({ x, y }) => Object.assign(popover.style, { left: x + 'px', top: y + 'px' }));
        });
    });
    this.addEventListener('change', () => {
      const record = JSON.parse(document.documentElement.dataset.codePreferences!);
      this.querySelectorAll<HTMLSelectElement>('select').forEach((select) => {
        record[select.name] = select.value;
      });
      applyPreferences(record);
      this.sync();
      window.dispatchEvent(new Event('kalm-dialect-change'));
    });
    applyPreferences();
    this.sync();
    window.addEventListener('storage', this.storage);
    window.addEventListener('pageshow', this.restore);
  }
  disconnectedCallback() {
    this.cleanup?.();
    window.removeEventListener('storage', this.storage);
    window.removeEventListener('pageshow', this.restore);
  }
}
customElements.define('kalm-dialect-toggle', CodePreferences);
