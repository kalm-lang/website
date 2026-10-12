import { gsap } from 'gsap';

export type Dialect = 'kalm' | 'kalms';
export const dialect = (): Dialect => document.documentElement.dataset.dialect === 'kalms' ? 'kalms' : 'kalm';

class DialectToggle extends HTMLElement {
  private readonly sync = () => {
    this.querySelectorAll<HTMLButtonElement>('[data-dialect-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.dialectChoice === dialect())));
    gsap.to(this.querySelector('.dialect-slider-indicator'), { xPercent: dialect() === 'kalms' ? 100 : 0,
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .25, ease: 'power3.out', overwrite: true });
  };
  private readonly choose = (event: Event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-dialect-choice]') : null;
    if (!button) return;
    const value = button.dataset.dialectChoice as Dialect;
    if (value === dialect()) return;
    document.documentElement.dataset.dialect = value;
    try { localStorage.setItem('kalm-dialect', value); } catch { /* Controls work without storage. */ }
    this.sync();
    window.dispatchEvent(new Event('kalm-dialect-change'));
  };
  private readonly storage = (event: StorageEvent) => {
    if (event.key !== 'kalm-dialect') return;
    document.documentElement.dataset.dialect = event.newValue === 'kalms' ? 'kalms' : 'kalm';
    this.sync();
    window.dispatchEvent(new Event('kalm-dialect-change'));
  };
  connectedCallback() { this.sync(); this.addEventListener('click', this.choose); window.addEventListener('storage', this.storage); }
  disconnectedCallback() { this.removeEventListener('click', this.choose); window.removeEventListener('storage', this.storage); gsap.killTweensOf(this.querySelector('.dialect-slider-indicator')); }
}
customElements.define('kalm-dialect-toggle', DialectToggle);
