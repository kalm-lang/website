import { icon } from '../../shared/icons.mjs';

type Theme = 'system' | 'light' | 'dark';

export class ThemeToggle extends HTMLElement {
  private theme: Theme = 'system';
  private open = false;
  private trigger: HTMLButtonElement | null = null;
  private panel: HTMLDivElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly toggle = () => this.setOpen(!this.open);
  private readonly focusWithoutScrolling = (event: PointerEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (button && event.button === 0) {
      event.preventDefault();
      button.focus({ preventScroll: true });
    }
  };
  private readonly outside = (event: PointerEvent) => {
    if (this.open && !this.contains(event.target as Node)) this.setOpen(false);
  };
  private readonly escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) {
      this.setOpen(false);
      this.trigger?.focus({ preventScroll: true });
    }
  };
  private readonly choose = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-scrollbar-toggle]')) {
      const custom = document.documentElement.dataset.scrollbarStyle !== 'native';
      const style = custom ? 'native' : 'custom';
      document.documentElement.dataset.scrollbarStyle = style;
      try { localStorage.setItem('kalm-scrollbar', style); } catch { /* Device-local preference only. */ }
      this.updateOptions();
      window.dispatchEvent(new Event('kalm-scrollbar-change'));
      return;
    }
    const button = event.target.closest<HTMLButtonElement>('[data-theme-choice]');
    const theme = button?.dataset.themeChoice;
    if (theme !== 'system' && theme !== 'light' && theme !== 'dark') return;
    this.theme = theme;
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('kalm-theme', theme); } catch { /* Device-local preference only. */ }
    this.updateTrigger();
    this.setOpen(false);
    this.trigger?.focus({ preventScroll: true });
  };

  connectedCallback() {
    this.trigger = this.querySelector<HTMLButtonElement>('.theme-trigger');
    if (!this.trigger) return;
    try {
      const stored = localStorage.getItem('kalm-theme');
      if (stored === 'light' || stored === 'dark') this.theme = stored;
    } catch { /* Theme controls also work without browser storage. */ }
    this.updateTrigger();
    this.trigger.addEventListener('click', this.toggle);
    this.addEventListener('pointerdown', this.focusWithoutScrolling);
    document.addEventListener('pointerdown', this.outside);
    window.addEventListener('keydown', this.escape);
  }

  disconnectedCallback() {
    clearTimeout(this.closeTimer);
    this.open = false;
    this.panel?.remove();
    this.panel = null;
    this.trigger?.removeEventListener('click', this.toggle);
    this.removeEventListener('pointerdown', this.focusWithoutScrolling);
    document.removeEventListener('pointerdown', this.outside);
    window.removeEventListener('keydown', this.escape);
  }

  private updateTrigger() {
    if (!this.trigger) return;
    const iconName = this.theme === 'system' ? 'monitor' : this.theme === 'light' ? 'sun' : 'moon';
    this.trigger.innerHTML = icon(iconName);
    this.trigger.setAttribute('aria-label', `Color theme: ${this.theme}`);
    this.trigger.title = `Color theme: ${this.theme}`;
  }

  private setOpen(open: boolean) {
    clearTimeout(this.closeTimer);
    this.open = open;
    this.trigger?.setAttribute('aria-expanded', String(open));
    if (open) {
      this.panel?.remove();
      this.panel = document.createElement('div');
      this.panel.className = 'theme-popover';
      this.panel.id = 'theme-popover';
      this.panel.setAttribute('role', 'group');
      this.panel.setAttribute('aria-label', 'Appearance');
      const scrollbarOption = window.matchMedia('(max-width: 700px)').matches ? '' :
        `<div class="theme-divider"></div><button class="theme-scrollbar" type="button" role="switch"
          data-scrollbar-toggle aria-checked="true"><span>Custom scrollbar</span><span class="switch-track" aria-hidden="true"></span></button>`;
      this.panel.innerHTML = (['system', 'light', 'dark'] as const).map(theme => {
        const label = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';
        const iconName = theme === 'system' ? 'monitor' : theme === 'light' ? 'sun' : 'moon';
        return `<button class="theme-option" type="button" data-theme-choice="${theme}" aria-pressed="${this.theme === theme}">${icon(iconName)}<span>${label}</span></button>`;
      }).join('') + scrollbarOption;
      this.panel.addEventListener('click', this.choose);
      this.updateOptions();
      this.append(this.panel);
      if (window.matchMedia('(max-width: 700px)').matches) {
        const panel = this.panel;
        requestAnimationFrame(() => {
          if (this.open && this.panel === panel) panel.classList.add('open');
        });
      } else {
        this.panel.classList.add('open');
      }
    } else {
      const panel = this.panel;
      panel?.classList.remove('open');
      if (panel && window.matchMedia('(max-width: 700px)').matches) {
        this.closeTimer = setTimeout(() => {
          if (!this.open && this.panel === panel) {
            panel.remove();
            this.panel = null;
          }
        }, 200);
      } else {
        panel?.remove();
        this.panel = null;
      }
    }
  }

  private updateOptions() {
    this.panel?.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === this.theme));
    });
    this.panel?.querySelector('[data-scrollbar-toggle]')?.setAttribute('aria-checked',
      String(document.documentElement.dataset.scrollbarStyle !== 'native'));
  }
}

customElements.define('kalm-theme-toggle', ThemeToggle);
