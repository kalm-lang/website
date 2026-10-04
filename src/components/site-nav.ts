import { icon } from '../../shared/icons.mjs';

// Keep the generated links and active section intact during enhancement.
export class SiteNav extends HTMLElement {
  private open = false;
  private readonly button = document.createElement('button');
  private readonly mobile = window.matchMedia('(max-width: 700px)');
  private readonly resize = () => this.setOpen(false);
  private readonly outside = (event: PointerEvent) => {
    if (this.open && !this.contains(event.target as Node)) this.setOpen(false);
  };
  private readonly escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) { this.setOpen(false); this.button.focus(); }
  };
  connectedCallback() {
    this.button.className = 'menu-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-controls', 'site-navigation');
    this.button.onclick = () => this.setOpen(!this.open);
    this.prepend(this.button);
    this.setOpen(false);
    window.addEventListener('keydown', this.escape);
    this.mobile.addEventListener('change', this.resize);
    document.addEventListener('pointerdown', this.outside);
  }
  disconnectedCallback() {
    window.removeEventListener('keydown', this.escape);
    this.mobile.removeEventListener('change', this.resize);
    document.removeEventListener('pointerdown', this.outside);
  }
  private setOpen(open: boolean) {
    this.open = open;
    this.button.innerHTML = `${icon(open ? 'x' : 'menu')}<span>${open ? 'Close' : 'Menu'}</span>`;
    this.button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    this.button.setAttribute('aria-expanded', String(open));
    const navigation = this.querySelector('nav');
    navigation?.classList.toggle('open', open);
    navigation?.toggleAttribute('inert', !open && this.mobile.matches);
  }
}
customElements.define('kalm-site-nav', SiteNav);
