import { icon } from '../../shared/icons.mjs';
import { HeaderPopover } from './header-popover';

type Theme = 'system' | 'light' | 'dark';

export class ThemeToggle extends HTMLElement {
  private theme: Theme = 'system';
  private trigger: HTMLButtonElement | null = null;
  private panel: HTMLDivElement | null = null;
  private menu?: HeaderPopover;
  private readonly choose = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-scrollbar-toggle]')) {
      const style = document.documentElement.dataset.scrollbarStyle === 'native' ? 'custom' : 'native';
      document.documentElement.dataset.scrollbarStyle = style;
      try { localStorage.setItem('kalm-scrollbar', style); } catch { /* Device-local preference only. */ }
      this.updateOptions();
      window.dispatchEvent(new Event('kalm-scrollbar-change'));
      return;
    }
    const theme = event.target.closest<HTMLButtonElement>('[data-theme-choice]')?.dataset.themeChoice;
    if (theme !== 'system' && theme !== 'light' && theme !== 'dark') return;
    this.theme = theme;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('kalm-theme', theme); } catch { /* Appearance also works without storage. */ }
    this.updateTrigger();
    this.updateOptions();
    this.menu?.setOpen(false);
    this.trigger?.focus({ preventScroll: true });
  };

  connectedCallback() {
    this.trigger = this.querySelector<HTMLButtonElement>('.theme-trigger');
    if (!this.trigger) return;
    try {
      const stored = localStorage.getItem('kalm-theme');
      if (stored === 'light' || stored === 'dark') this.theme = stored;
    } catch { /* Appearance also works without storage. */ }
    this.updateTrigger();
    this.panel = document.createElement('div');
    this.panel.className = 'theme-popover';
    this.panel.id = 'theme-popover';
    this.panel.setAttribute('role', 'group');
    this.panel.setAttribute('aria-label', 'Appearance');
    this.panel.setAttribute('popover', 'manual');
    this.panel.innerHTML = (['system', 'light', 'dark'] as const).map(theme => {
      const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';
      const name = theme === 'system' ? 'monitor' : theme === 'light' ? 'sun' : 'moon';
      return `<button class="theme-option" type="button" data-theme-choice="${theme}" aria-pressed="false">${icon(name)}<span>${label}</span></button>`;
    }).join('') + '<div class="theme-divider"></div><button class="theme-scrollbar" type="button" role="switch" data-scrollbar-toggle aria-checked="true"><span>Custom scrollbar</span><span class="switch-track" aria-hidden="true"></span></button>';
    this.panel.addEventListener('click', this.choose);
    this.append(this.panel);
    this.menu = new HeaderPopover(this, this.trigger, this.panel, 'end');
    this.updateOptions();
  }

  disconnectedCallback() {
    this.menu?.destroy();
    this.panel?.remove();
    this.panel = null;
  }

  private updateTrigger() {
    if (!this.trigger) return;
    this.trigger.innerHTML = icon(this.theme === 'system' ? 'monitor' : this.theme === 'light' ? 'sun' : 'moon');
    this.trigger.setAttribute('aria-label', `Color theme: ${this.theme}`);
    this.trigger.title = `Color theme: ${this.theme}`;
  }

  private updateOptions() {
    this.panel?.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === this.theme));
    });
    this.panel?.querySelector('[data-scrollbar-toggle]')?.setAttribute('aria-checked', String(document.documentElement.dataset.scrollbarStyle !== 'native'));
  }
}
customElements.define('kalm-theme-toggle', ThemeToggle);
