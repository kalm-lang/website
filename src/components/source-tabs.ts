import { LitElement, html } from 'lit';

export class SourceTabs extends LitElement {
  static properties = { selected: { state: true } };
  selected = 0;
  private panels: HTMLElement[] = [];
  createRenderRoot() { return this; }
  connectedCallback() {
    this.panels = [...this.querySelectorAll<HTMLElement>(':scope > section')];
    super.connectedCallback();
    this.show();
  }
  private show() { this.panels.forEach((panel, index) => { panel.hidden = index !== this.selected; }); }
  private select(index: number, focus = false) {
    this.selected = index;
    this.show();
    if (focus) void this.updateComplete.then(() => this.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus());
  }
  private key(event: KeyboardEvent, index: number) {
    const count = this.panels.length;
    const next = event.key === 'ArrowRight' ? (index + 1) % count
      : event.key === 'ArrowLeft' ? (index - 1 + count) % count
      : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : undefined;
    if (next !== undefined) { event.preventDefault(); this.select(next, true); }
  }
  render() {
    return html`<div class="source-tab-bar" role="tablist" aria-label="Example source files">
      ${this.panels.map((panel, index) => html`<button role="tab" id=${`${panel.id}-tab`}
        aria-controls=${panel.id} aria-selected=${this.selected === index} tabindex=${this.selected === index ? 0 : -1}
        @click=${() => this.select(index)} @keydown=${(event: KeyboardEvent) => this.key(event, index)}>${panel.dataset.file}</button>`)}
    </div>`;
  }
  updated() {
    this.panels.forEach(panel => { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `${panel.id}-tab`); });
  }
}
customElements.define('kalm-source-tabs', SourceTabs);
