import {icon} from '../../shared/icons.mjs';
import {HeaderPopover} from './header-popover';
import {CodePreferences} from './dialect-toggle';

type Theme = 'system' | 'light' | 'dark';

export class SettingsMenu extends HTMLElement {
  private theme: Theme = 'system';
  private trigger: HTMLButtonElement | null = null;
  private panel: HTMLDivElement | null = null;
  private menu?: HeaderPopover;
  private codePreferences?: CodePreferences;
  private readonly choose = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest<HTMLButtonElement>('[data-settings-tab]');
    if (tab) {
      const selected = tab.dataset.settingsTab;
      this.panel?.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(button => {
        const active = button.dataset.settingsTab === selected;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      this.panel?.querySelectorAll<HTMLElement>('[data-settings-panel]').forEach(content => {
        content.hidden = content.dataset.settingsPanel !== selected;
      });
      return;
    }
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
    this.trigger = this.querySelector<HTMLButtonElement>('.settings-trigger');
    if (!this.trigger) return;
    try {
      const stored = localStorage.getItem('kalm-theme');
      if (stored === 'light' || stored === 'dark') this.theme = stored;
    } catch { /* Appearance also works without storage. */ }
    this.updateTrigger();
    this.panel = document.createElement('div');
    this.panel.className = 'settings-popover';
    this.panel.id = 'settings-popover';
    this.panel.setAttribute('aria-label', 'Settings');
    this.panel.setAttribute('popover', 'manual');
    this.panel.innerHTML = '<div class="settings-tabs" role="tablist" aria-label="Settings"><button class="settings-tab" type="button" role="tab" id="settings-theme-tab" aria-controls="settings-theme-panel" data-settings-tab="theme" aria-selected="true" tabindex="0">Theme</button><button class="settings-tab" type="button" role="tab" id="settings-code-tab" aria-controls="settings-code-panel" data-settings-tab="code" aria-selected="false" tabindex="-1">Code</button></div><div class="theme-settings-content" id="settings-theme-panel" data-settings-panel="theme" role="tabpanel" aria-labelledby="settings-theme-tab">' + (['system', 'light', 'dark'] as const).map(theme => {
      const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';
      const name = theme === 'system' ? 'monitor' : theme === 'light' ? 'sun' : 'moon';
      return `<button class="theme-option" type="button" data-theme-choice="${theme}" aria-pressed="false">${icon(name)}<span>${label}</span></button>`;
    }).join('') + '<div class="theme-divider"></div><button class="theme-scrollbar" type="button" role="switch" data-scrollbar-toggle aria-checked="true"><span>Custom scrollbar</span><span class="switch-track" aria-hidden="true"></span></button></div><div id="settings-code-panel" data-settings-panel="code" role="tabpanel" aria-labelledby="settings-code-tab" hidden></div>';
    this.panel.addEventListener('click', this.choose);
    this.append(this.panel);
    this.codePreferences = new CodePreferences(this.panel.querySelector<HTMLElement>('[data-settings-panel="code"]')!);
    this.menu = new HeaderPopover(this, this.trigger, this.panel, 'end');
    this.updateOptions();
  }

  disconnectedCallback() {
    this.menu?.destroy();
    this.codePreferences?.destroy();
    this.panel?.remove();
    this.panel = null;
  }

  private updateTrigger() {
    if (!this.trigger) return;
    this.trigger.innerHTML = icon('settings');
    this.trigger.setAttribute('aria-label', 'Settings');
    this.trigger.title = 'Settings';
  }

  private updateOptions() {
    this.panel?.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === this.theme));
    });
    this.panel?.querySelector('[data-scrollbar-toggle]')?.setAttribute('aria-checked', String(document.documentElement.dataset.scrollbarStyle !== 'native'));
  }
}
customElements.define('kalm-settings-menu', SettingsMenu);
