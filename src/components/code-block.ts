import { gsap } from 'gsap';
import { icon } from '../../shared/icons.mjs';

export class CodeBlock extends HTMLElement {
  private timer?: ReturnType<typeof setTimeout>;
  private readonly button = document.createElement('button');
  private readonly status = document.createElement('span');
  private source = '';
  connectedCallback() {
    this.source = this.readSource();
    this.button.className = 'copy-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Copy code');
    this.button.onclick = () => void this.copy();
    this.status.className = 'sr-only';
    this.status.setAttribute('role', 'status');
    this.querySelector('.code-actions')?.append(this.button);
    this.append(this.status);
    this.showCopied(false);
  }
  disconnectedCallback() { clearTimeout(this.timer); }
  private showCopied(copied: boolean) {
    this.button.innerHTML = `${icon(copied ? 'check' : 'copy')}<span>${copied ? 'Copied' : 'Copy'}</span>`;
    this.button.classList.toggle('copied', copied);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(this.button.querySelector('.icon'), {opacity:0,scale:.65,rotation:copied?-20:0}, {opacity:1,scale:1,rotation:0,duration:.22,ease:'back.out(1.5)',overwrite:true});
    }
  }
  private readSource() {
    const code = this.querySelector('code');
    const editable = code?.querySelector<HTMLInputElement>('[data-greeting-name]');
    if (!editable) return code?.textContent ?? '';
    const copy = code!.cloneNode(true) as HTMLElement;
    const copyInput = copy.querySelector<HTMLInputElement>('[data-greeting-name]');
    const value = editable.value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
    copyInput?.replaceWith(document.createTextNode(value));
    return copy.textContent ?? '';
  }
  private async copy() {
    try {
      this.source = this.readSource();
      await navigator.clipboard.writeText(this.source);
      this.showCopied(true);
      this.status.textContent = 'Code copied';
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.showCopied(false); this.status.textContent = ''; }, 1800);
    } catch { this.status.textContent = 'Copy unavailable. Select the code to copy it.'; }
  }
}
customElements.define('kalm-code-block', CodeBlock);
