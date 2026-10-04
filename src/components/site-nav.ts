import { LitElement, html } from 'lit';

export class SiteNav extends LitElement {
  static properties = { open: { state: true } };
  open = false;
  private readonly escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.open = false;
      this.querySelector<HTMLButtonElement>('button')?.focus();
    }
  };
  createRenderRoot() { return this; }
  connectedCallback() { if (!this.hasUpdated) this.replaceChildren(); super.connectedCallback(); window.addEventListener('keydown', this.escape); }
  disconnectedCallback() { window.removeEventListener('keydown', this.escape); super.disconnectedCallback(); }
  render() {
    return html`<button class="menu-button" aria-controls="site-navigation" aria-expanded=${this.open}
      @click=${() => { this.open = !this.open; }}>${this.open ? '[-] close' : '[+] menu'}</button>
      <nav id="site-navigation" class=${this.open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        ${[['/docs/quick-start/', 'docs'], ['/examples/', 'examples'], ['/tutorial/', 'learn']].map(([href, text]) =>
          html`<a href=${href} aria-current=${location.pathname.startsWith(href) ? 'page' : 'false'}>${text}</a>`)}
      </nav>`;
  }
}
customElements.define('kalm-site-nav', SiteNav);
