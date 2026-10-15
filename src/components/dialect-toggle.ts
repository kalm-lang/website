import {gsap} from 'gsap';
import {applyPreferences} from '../../shared/preferences.mjs';
import {icon} from '../../shared/icons.mjs';

export type Dialect = 'kalm' | 'kalms';
export const dialect = (): Dialect => document.documentElement.dataset.dialect === 'kalms' ? 'kalms' : 'kalm';
export const codeStyle = () => document.documentElement.dataset.codeStyle || 'indentation';

const choices = (name: string, label: string, options: [string, string][]) =>
  '<fieldset class="preference-setting" data-setting="' + name + '"><legend>' + label + '</legend><div class="preference-options">' +
  options.map(([value, text]) => '<button class="theme-option" type="button" data-preference="' + name + '" data-value="' + value + '" aria-pressed="false"><span>' + text + '</span></button>').join('') +
  '</div></fieldset>';

/** Adds the code preference controls and behavior to the shared settings panel. */
export class CodePreferences {
  private environmentExpanded = false;
  private environmentMotion?: gsap.core.Tween;

  constructor(private readonly panel: HTMLElement) {
    const capabilities = JSON.parse(document.documentElement.dataset.codeCapabilities || '{}');
    if (Object.values(capabilities).every(value => value === false) && Object.keys(capabilities).length) {
      this.panel.hidden = true;
      this.panel.closest('.settings-popover')?.querySelector('[data-settings-tab="code"]')?.setAttribute('hidden', '');
      return;
    }
    this.panel.insertAdjacentHTML('beforeend',
      '<div class="code-settings-content">' +
      choices('dialect', 'Language', [['kalm', 'Kalm'], ['kalms', 'Kalm Script']]) +
      choices('style', 'Blocks', [['indentation', 'Indentation'], ['braces', 'Braces']]) +
      '<details class="preference-environment"><summary class="theme-option">Environment' + icon('chevron-down') + '</summary><div class="environment-fields">' +
      choices('os', 'Operating system', [['auto', 'Automatic'], ['windows', 'Windows'], ['macos', 'macOS'], ['linux', 'Linux']]) +
      '<div class="shell-preferences"></div></div></details></div>');
    for (const setting of ['dialect', 'style', 'environment']) {
      if (capabilities[setting] === false) {
        this.panel.querySelector<HTMLElement>(setting === 'environment' ? '.preference-environment' : `[data-setting="${setting}"]`)!.hidden = true;
      }
    }
    this.panel.addEventListener('click', this.choose);
    const environment = this.panel.querySelector<HTMLDetailsElement>('.preference-environment')!;
    const content = environment.querySelector<HTMLElement>('.environment-fields')!;
    environment.querySelector('summary')!.addEventListener('click', event => {
      event.preventDefault();
      this.environmentExpanded = !this.environmentExpanded;
      const expanded = this.environmentExpanded;
      this.environmentMotion?.kill();
      if (expanded && !environment.open) {
        environment.open = true;
        gsap.set(content, { height: 0, opacity: 0 });
      }
      environment.dataset.expanded = String(expanded);
      gsap.set(content, { overflow: 'hidden' });
      this.environmentMotion = gsap.to(content, {
        height: expanded ? content.scrollHeight : 0, opacity: expanded ? 1 : 0,
        duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .14,
        ease: 'power2.out', overwrite: true,
        onComplete: () => {
          if (expanded !== this.environmentExpanded) return;
          environment.open = expanded;
          gsap.set(content, { clearProps: 'height,opacity,overflow' });
        },
      });
    });
    applyPreferences();
    this.sync();
    window.addEventListener('storage', this.storage);
    window.addEventListener('pageshow', this.restore);
  }

  destroy() {
    this.environmentMotion?.kill();
    this.panel.removeEventListener('click', this.choose);
    window.removeEventListener('storage', this.storage);
    window.removeEventListener('pageshow', this.restore);
  }

  private readonly sync = () => {
    const root = document.documentElement;
    const preferences = JSON.parse(root.dataset.codePreferences!);
    const shell = this.panel.querySelector<HTMLElement>('.shell-preferences')!;
    const shells: [string, string][] = root.dataset.codeOs === 'windows'
      ? [['powershell', 'PowerShell'], ['cmd', 'Command Prompt']]
      : [['bash', 'Bash'], ['zsh', 'zsh'], ['powershell', 'PowerShell']];
    if (shell.dataset.os !== root.dataset.codeOs) {
      shell.innerHTML = choices('shell', 'Shell', [['auto', 'Automatic'], ...shells]);
      shell.dataset.os = root.dataset.codeOs;
    }
    this.panel.querySelectorAll<HTMLButtonElement>('[data-preference]').forEach(button => {
      button.setAttribute('aria-pressed', String(preferences[button.dataset.preference!] === button.dataset.value));
    });
  };
  private readonly restore = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    const previous = document.documentElement.dataset.codePreferences;
    applyPreferences();
    this.sync();
    if (previous !== document.documentElement.dataset.codePreferences) window.dispatchEvent(new Event('kalm-dialect-change'));
  };
  private readonly storage = (event: StorageEvent) => {
    if (event.key !== 'kalm-code-preferences') return;
    applyPreferences();
    this.sync();
    window.dispatchEvent(new Event('kalm-dialect-change'));
  };
  private readonly choose = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-preference]');
    if (!button) return;
    const record = JSON.parse(document.documentElement.dataset.codePreferences!);
    if (record[button.dataset.preference!] === button.dataset.value) return;
    record[button.dataset.preference!] = button.dataset.value!;
    applyPreferences(record);
    this.sync();
    window.dispatchEvent(new Event('kalm-dialect-change'));
  };
}
