import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom';
import { gsap } from 'gsap';
import { applyPreferences } from '../../shared/preferences.mjs';
import { icon } from '../../shared/icons.mjs';

export type Dialect = 'kalm' | 'kalms';
export const dialect = (): Dialect =>
  document.documentElement.dataset.dialect === 'kalms' ? 'kalms' : 'kalm';
export const codeStyle = () => document.documentElement.dataset.codeStyle || 'indentation';

const choices = (name: string, label: string, options: [string, string][]) =>
  '<fieldset class="preference-setting"><legend>' + label + '</legend><div class="preference-options">' +
  options.map(([value, text]) => '<button type="button" data-preference="' + name + '" data-value="' + value + '" aria-pressed="false">' + text + '</button>').join('') +
  '</div></fieldset>';

class CodePreferences extends HTMLElement {
  private cleanup?: () => void;
  private positionToken = 0;
  private readonly sync = () => {
    const root = document.documentElement;
    const preferences = JSON.parse(root.dataset.codePreferences!);
    const shell = this.querySelector<HTMLSelectElement>('[name="shell"]')!;
    const choices = root.dataset.codeOs === 'windows' ? ['powershell', 'cmd'] : ['bash', 'zsh', 'powershell'];
    const names: Record<string, string> = { powershell: 'PowerShell', cmd: 'Command Prompt', bash: 'Bash', zsh: 'zsh' };
    shell.innerHTML = '<option value="auto">Automatic</option>' + choices.map(value => '<option value="' + value + '">' + names[value] + '</option>').join('');
    this.querySelectorAll<HTMLSelectElement>('select').forEach(select => { select.value = preferences[select.name]; });
    this.querySelectorAll<HTMLButtonElement>('[data-preference]').forEach(button => {
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
  private readonly save = (name: string, value: string) => {
    const record = JSON.parse(document.documentElement.dataset.codePreferences!);
    record[name] = value;
    applyPreferences(record);
    this.sync();
    window.dispatchEvent(new Event('kalm-dialect-change'));
  };

  connectedCallback() {
    this.innerHTML =
      '<button class="theme-trigger preferences-trigger" type="button" aria-controls="code-preferences" aria-label="Code preferences" title="Code preferences" aria-expanded="false">' +
      icon('sliders-horizontal') + '</button>' +
      '<div id="code-preferences" class="preferences-popover" popover="auto" aria-label="Code preferences">' +
      '<h2>Code preferences</h2>' +
      choices('dialect', 'Language', [['kalm', 'Kalm'], ['kalms', 'Kalm Script']]) +
      choices('style', 'Blocks', [['indentation', 'Indentation'], ['braces', 'Braces']]) +
      '<details class="preference-environment"><summary>Environment' + icon('chevron-down') + '</summary><div class="environment-fields">' +
      '<label>Operating system<select name="os"><option value="auto">Automatic</option><option value="windows">Windows</option><option value="macos">macOS</option><option value="linux">Linux</option></select></label>' +
      '<label>Shell<select name="shell"></select></label></div></details></div>';
    const trigger = this.querySelector<HTMLButtonElement>('.preferences-trigger')!;
    const popover = this.querySelector<HTMLElement>('[popover]')!;
    const position = () => {
      const token = ++this.positionToken;
      void computePosition(trigger, popover, {
        strategy: 'fixed', placement: 'bottom-end',
        middleware: [offset(8), flip(), shift({ padding: 12 }), size({ padding: 12, apply({ availableWidth, availableHeight, elements }) {
          Object.assign(elements.floating.style, { maxWidth: Math.max(0, availableWidth) + 'px', maxHeight: Math.max(0, availableHeight) + 'px' });
        } })],
      }).then(({ x, y }) => {
        if (token !== this.positionToken || !popover.matches(':popover-open')) return;
        Object.assign(popover.style, { left: x + 'px', top: y + 'px' });
        popover.dataset.positioned = '';
        requestAnimationFrame(() => { if (popover.matches(':popover-open')) popover.classList.add('open'); });
      });
    };
    trigger.addEventListener('click', () => {
      if (popover.matches(':popover-open')) popover.hidePopover();
      else popover.showPopover();
    });
    popover.addEventListener('toggle', event => {
      const open = (event as ToggleEvent).newState === 'open';
      trigger.setAttribute('aria-expanded', String(open));
      this.cleanup?.();
      this.cleanup = undefined;
      ++this.positionToken;
      if (open) {
        delete popover.dataset.positioned;
        popover.classList.remove('open');
        this.cleanup = autoUpdate(trigger, popover, position);
      } else {
        popover.classList.remove('open');
        delete popover.dataset.positioned;
      }
    });
    this.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>('[data-preference]');
      if (button) this.save(button.dataset.preference!, button.dataset.value!);
    });
    this.addEventListener('change', event => {
      const select = event.target;
      if (select instanceof HTMLSelectElement && select.name) this.save(select.name, select.value);
    });
    const environment = this.querySelector<HTMLDetailsElement>('.preference-environment')!;
    const summary = environment.querySelector('summary')!;
    const content = environment.querySelector<HTMLElement>('.environment-fields')!;
    summary.addEventListener('click', event => {
      event.preventDefault();
      gsap.killTweensOf(content);
      if (!environment.open) {
        environment.open = true;
        gsap.fromTo(content, { height: 0, opacity: 0, overflow: 'hidden' }, { height: 'auto', opacity: 1, duration: .24, ease: 'power2.out', clearProps: 'height,opacity,overflow' });
      } else {
        gsap.to(content, { height: 0, opacity: 0, overflow: 'hidden', duration: .2, ease: 'power2.inOut', onComplete: () => { environment.open = false; gsap.set(content, { clearProps: 'height,opacity,overflow' }); } });
      }
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
