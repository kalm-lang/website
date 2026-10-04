import { LitElement, html } from 'lit';

type Theme = 'system' | 'light' | 'dark';

export class ThemeToggle extends LitElement {
  static properties = { theme: { state: true } };
  theme: Theme = 'system';
  createRenderRoot() { return this; }

  connectedCallback() {
    super.connectedCallback();
    try {
      const stored = localStorage.getItem('kalm-theme');
      if (stored === 'light' || stored === 'dark') this.theme = stored;
    } catch { /* Theme controls also work without browser storage. */ }
  }

  private change(event: Event) {
    this.theme = (event.target as HTMLSelectElement).value as Theme;
    document.documentElement.dataset.theme = this.theme;
    try { localStorage.setItem('kalm-theme', this.theme); } catch { /* Device-local preference only. */ }
  }

  render() {
    return html`<label class="theme-label">theme:
      <select aria-label="Color theme" .value=${this.theme} @change=${this.change}>
        <option value="system">auto</option><option value="light">light</option><option value="dark">dark</option>
      </select></label>`;
  }
}
customElements.define('kalm-theme-toggle', ThemeToggle);
