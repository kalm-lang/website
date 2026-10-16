import {applyPreferences} from '../../shared/preferences.mjs';
import {icon} from '../../shared/icons.mjs';

const completeKey = 'kalm-setup-complete';

/** A one-time, inline guide for setting the site's code preferences. */
class SetupWizard extends HTMLElement {
  private step = 0;

  connectedCallback() {
    try {
      if (localStorage.getItem(completeKey) === 'true') return;
    } catch { /* Keep the setup available when storage is disabled. */ }
    try {
      if (location.pathname === '/' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.dataset.welcome = 'true';
      }
    } catch { /* Welcome is optional when storage is disabled. */ }
    const preferences = JSON.parse(document.documentElement.dataset.codePreferences || '{}');
    if (preferences.os !== 'auto') {
      preferences.os = 'auto';
      applyPreferences(preferences);
    }
    this.hidden = false;
    this.addEventListener('click', this.handleClick);
    this.sync();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }

  private readonly handleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-setup-dismiss]')) {
      this.dismiss();
      return;
    }
    const choice = event.target.closest<HTMLButtonElement>('[data-setup-choice]');
    if (choice) {
      const record = JSON.parse(document.documentElement.dataset.codePreferences || '{}');
      const setting = choice.dataset.setupChoice!;
      record[setting] = choice.dataset.value!;
      applyPreferences(record);
      this.sync();
      window.dispatchEvent(new Event('kalm-dialect-change'));
      return;
    }
    if (event.target.closest('[data-setup-back]')) {
      this.showStep(this.step - 1);
      return;
    }
    if (event.target.closest('[data-setup-next]')) {
      if (this.step === 2) this.dismiss();
      else this.showStep(this.step + 1);
    }
  };

  private showStep(step: number, focus = true) {
    this.step = Math.max(0, Math.min(2, step));
    this.querySelectorAll<HTMLElement>('[data-setup-step]').forEach(panel => {
      panel.hidden = Number(panel.dataset.setupStep) !== this.step;
    });
    const indicator = this.querySelector<HTMLElement>('[role="progressbar"]')!;
    indicator.setAttribute('aria-valuenow', String(this.step));
    indicator.setAttribute('aria-valuetext', `Step ${this.step + 1} of 3`);
    indicator.style.setProperty('--setup-progress', `${this.step / 3 * 100}%`);
    this.querySelector<HTMLButtonElement>('[data-setup-back]')!.hidden = this.step === 0;
    const next = this.querySelector<HTMLButtonElement>('[data-setup-next]')!;
    const finishing = this.step === 2;
    next.innerHTML = icon(finishing ? 'check' : 'arrow-right');
    next.setAttribute('aria-label', finishing ? 'Finish setup' : 'Next');
    next.title = finishing ? 'Finish setup' : 'Next';
    const currentStep = this.querySelector<HTMLElement>(`[data-setup-step="${this.step}"]`)!;
    const heading = this.querySelector<HTMLElement>('[data-setup-current-title]')!;
    heading.textContent = currentStep.dataset.setupTitle!;
    if (focus) {
      heading.tabIndex = -1;
      heading.focus({preventScroll: true});
    }
  }

  private sync() {
    const root = document.documentElement;
    const preferences = JSON.parse(root.dataset.codePreferences || '{}');
    this.querySelectorAll<HTMLButtonElement>('[data-setup-choice]').forEach(button => {
      const setting = button.dataset.setupChoice!;
      const effective = setting === 'shell' && preferences.shell === 'auto'
        ? root.dataset.codeShell
        : preferences[setting];
      button.setAttribute('aria-pressed', String(effective === button.dataset.value));
    });
    const shellGroup = this.querySelector<HTMLElement>('[data-setup-shell-options]')!;
    const shells: [string, string][] = root.dataset.codeOs === 'windows'
      ? [['powershell', 'PowerShell'], ['cmd', 'Command Prompt']]
      : [['bash', 'Bash'], ['zsh', 'zsh'], ['powershell', 'PowerShell']];
    shellGroup.innerHTML = shells.map(([value, label]) =>
      `<button type="button" data-setup-choice="shell" data-value="${value}" aria-pressed="${(preferences.shell === 'auto' ? root.dataset.codeShell : preferences.shell) === value}">${label}</button>`).join('');
    this.showStep(this.step, false);
  }

  private dismiss() {
    try { localStorage.setItem(completeKey, 'true'); } catch { /* Dismissal still works for this page view. */ }
    this.hidden = true;
  }
}

customElements.define('kalm-setup-wizard', SetupWizard);
