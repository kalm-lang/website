import { gsap } from 'gsap';
import { LitElement, html } from 'lit';

export class CodeTabs extends LitElement {
  static properties = { selected: { state: true } };
  selected = 0;
  private readonly reset = () => { this.selected = 0; this.show(); };
  disconnectedCallback() { super.disconnectedCallback(); window.removeEventListener('pageshow', this.reset); }
  private panels: HTMLElement[] = [];
  createRenderRoot() { return this; }
  connectedCallback() {
    this.panels = [...this.querySelectorAll<HTMLElement>(':scope > section')];
    super.connectedCallback();
    window.addEventListener('pageshow', this.reset);
    this.show();
  }
  private show() { this.panels.forEach((panel, index) => { panel.hidden = index !== this.selected; }); }
  private select(index: number, focus = false) {
    const changed = index !== this.selected;
    this.selected = index;
    this.show();
    const panel = this.panels[index];
    if (changed && panel && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(panel,{opacity:.2,y:2},{opacity:1,y:0,duration:.14,ease:'power2.out',overwrite:true,clearProps:'opacity,transform'});
    }
    if (focus) void this.updateComplete.then(() => this.querySelectorAll<HTMLButtonElement>(':scope > .source-tab-bar > [role="tab"]')[index]?.focus());
  }
  private key(event: KeyboardEvent, index: number) {
    const count = this.panels.length;
    const next = event.key === 'ArrowRight' ? (index + 1) % count
      : event.key === 'ArrowLeft' ? (index - 1 + count) % count
      : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : undefined;
    if (next !== undefined) { event.preventDefault(); this.select(next, true); }
  }
  render() {
    return html`<div class="source-tab-bar" role="tablist" aria-label="Code examples">
      ${this.panels.map((panel, index) => html`<button role="tab" id=${`${panel.id}-tab`}
        aria-controls=${panel.id} aria-selected=${this.selected === index} tabindex=${this.selected === index ? 0 : -1}
        @click=${() => this.select(index)} @keydown=${(event: KeyboardEvent) => this.key(event, index)}>${panel.dataset.label}</button>`)}
    </div>`;
  }
  updated() {
    this.panels.forEach(panel => { panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `${panel.id}-tab`); });
  }
}
customElements.define('kalm-code-tabs', CodeTabs);
