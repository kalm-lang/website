import { LitElement, html } from 'lit';

export class CodeBlock extends LitElement {
  static properties = { copied: { state: true }, failed: { state: true } };
  copied = false;
  failed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private source = '';
  createRenderRoot() { return this; }
  connectedCallback() {
    this.source = this.querySelector('code')?.textContent ?? '';
    // Preserve build-time syntax highlighting and the readable fallback.
    const code = this.querySelector('pre');
    if (code) this.append(code);
    super.connectedCallback();
  }
  disconnectedCallback() { clearTimeout(this.timer); super.disconnectedCallback(); }
  private async copy() {
    try {
      await navigator.clipboard.writeText(this.source);
      this.copied = true;
      this.failed = false;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.copied = false; }, 1800);
    } catch { this.failed = true; }
  }
  render() {
    return html`<button class="copy-button" aria-label="Copy code" @click=${this.copy}>${this.copied ? 'copied ✓' : 'copy'}</button>
      <span class="sr-only" role="status">${this.failed ? 'Copy unavailable. Select the code to copy it.' : this.copied ? 'Code copied' : ''}</span>`;
  }
}
customElements.define('kalm-code-block', CodeBlock);
