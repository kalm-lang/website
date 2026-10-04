// Keep the generated links and active section intact during enhancement.
export class SiteNav extends HTMLElement {
  private open = false;
  private readonly button = document.createElement('button');
  private readonly escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) { this.setOpen(false); this.button.focus(); }
  };
  connectedCallback() {
    this.button.className = 'menu-button';
    this.button.setAttribute('aria-controls', 'site-navigation');
    this.button.onclick = () => this.setOpen(!this.open);
    this.prepend(this.button);
    this.setOpen(false);
    window.addEventListener('keydown', this.escape);
  }
  disconnectedCallback() { window.removeEventListener('keydown', this.escape); }
  private setOpen(open: boolean) {
    this.open = open;
    this.button.textContent = open ? '[-] close' : '[+] menu';
    this.button.setAttribute('aria-expanded', String(open));
    this.querySelector('nav')?.classList.toggle('open', open);
  }
}
customElements.define('kalm-site-nav', SiteNav);
