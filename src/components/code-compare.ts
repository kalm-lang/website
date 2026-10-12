import { dialect } from './dialect-toggle';

class CodeCompare extends HTMLElement {
  private java = false;
  private sideBySide = false;
  private panels: HTMLElement[] = [];
  private readonly sync = () => {
    const active = this.panels.some(p => p.dataset.language === dialect()) ? dialect() : 'kalm';
    const home = this.hasAttribute('data-home');
    this.panels.forEach(panel => {
      panel.hidden = home ? panel.dataset.language !== active : this.sideBySide
        ? ![active, 'java'].includes(panel.dataset.language!) : panel.dataset.language !== (this.java ? 'java' : active);
      panel.setAttribute('role', this.sideBySide || home ? 'region' : 'tabpanel');
    });
    this.dataset.layout = this.sideBySide ? 'split' : 'inline';
    const explanation = this.querySelector<HTMLElement>('.script-unavailable');
    if (explanation) explanation.hidden = dialect() !== 'kalms';
    this.querySelectorAll<HTMLButtonElement>('[data-comparison-language]').forEach(button => {
      const java = button.dataset.comparisonLanguage === 'java';
      const panel = this.panels.find(p => p.dataset.language === (java ? 'java' : active))!;
      button.textContent = java ? 'Java' : active === 'kalms' ? 'Kalm Script' : 'Kalm';
      button.setAttribute('aria-selected', String(this.java === java));
      button.tabIndex = this.java === java ? 0 : -1;
      button.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-labelledby', button.id);
    });
    const tabs = this.querySelector<HTMLElement>('[role="tablist"]');
    if (tabs) tabs.hidden = this.sideBySide;
    this.querySelector('[data-comparison-layout]')?.setAttribute('aria-pressed', String(this.sideBySide));
  };
  connectedCallback() {
    this.panels = [...this.querySelectorAll<HTMLElement>(':scope > .comparison-panes > section')];
    if (!this.hasAttribute('data-home')) {
      this.querySelector('.comparison-controls')!.innerHTML = `<div class="source-tab-bar" role="tablist" aria-label="Compare languages"><button type="button" role="tab" id="${this.id}-kalm-tab" data-comparison-language="kalm">Kalm</button><button type="button" role="tab" id="${this.id}-java-tab" data-comparison-language="java">Java</button></div><button type="button" class="comparison-layout" data-comparison-layout aria-pressed="false">Side by side</button>`;
      this.querySelectorAll<HTMLButtonElement>('[data-comparison-language]').forEach(button => {
        button.onclick = () => { this.java = button.dataset.comparisonLanguage === 'java'; this.sync(); };
        button.onkeydown = event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          this.java = event.key === 'End' || (event.key !== 'Home' && !this.java);
          this.sync();
          this.querySelector<HTMLButtonElement>(`[data-comparison-language="${this.java ? 'java' : 'kalm'}"]`)?.focus({ preventScroll: true });
        };
      });
      this.querySelector<HTMLButtonElement>('[data-comparison-layout]')!.onclick = () => { this.sideBySide = !this.sideBySide; this.sync(); };
    }
    this.sync();
    window.addEventListener('kalm-dialect-change', this.sync);
  }
  disconnectedCallback() { window.removeEventListener('kalm-dialect-change', this.sync); }
}
customElements.define('kalm-code-compare', CodeCompare);
