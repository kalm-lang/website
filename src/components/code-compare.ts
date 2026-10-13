import {selectSources} from '../../shared/source-selection.mjs';
import {gsap} from 'gsap';
import {codeStyle, dialect} from './dialect-toggle';
import {icon} from '../../shared/icons.mjs';

type Policy = {
  presentation?: 'adaptive' | 'showcase';
  locks?: Record<string, boolean>;
  scriptUnavailable?: string;
  primary?: string;
};
class CodeCompare extends HTMLElement {
  private java = false;
  private sideBySide = false;
  private panels: HTMLElement[] = [];
  private policy: Policy = {};
  private timeline?: gsap.core.Timeline;
  private observer?: ResizeObserver;
  private ready = false;
  private readonly reset = () => {
    this.java = false;
    this.sideBySide = false;
    this.sync(false);
  };
  private readonly preferences = () => this.sync(true);
  private readonly resize = () => this.sync(false);
  private desiredPanels() {
    const root = document.documentElement;
    return selectSources(
      this.panels.map((p) => p.dataset),
      this.policy,
      {
        dialect: dialect(),
        style: codeStyle(),
        os: root.dataset.codeOs,
        shell: root.dataset.codeShell,
      },
      this.java,
      this.sideBySide,
    ).map((index: number) => this.panels[index]);
  }
  private sync(animate: boolean) {
    if (!this.ready) return;
    const stage = this.querySelector<HTMLElement>(':scope > .comparison-panes')!;
    const beforeHeight = stage.getBoundingClientRect().height;
    const beforeWidth = this.getBoundingClientRect().width;
    this.timeline?.kill();
    const home = this.hasAttribute('data-home');
    const modal = !!this.closest('dialog');
    const showcase = this.policy.presentation === 'showcase';
    const next = this.desiredPanels();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const apply = () => {
      const focused = document.activeElement;
      this.panels.forEach((panel) => {
        const visible = next.includes(panel);
        panel.hidden = !visible;
        if (home) {
          panel.dataset.visible = String(visible);
          panel.inert = !visible;
          panel.setAttribute('aria-hidden', String(!visible));
        }
        panel.setAttribute('role', this.sideBySide || home || showcase ? 'region' : 'tabpanel');
      });
      this.dataset.layout = this.sideBySide || (showcase && next.length > 1) ? 'split' : 'inline';
      const availableWidth = Math.min(1312, innerWidth - this.getBoundingClientRect().left - 40);
      const normalWidth = this.parentElement!.getBoundingClientRect().width;
      // A dialog owns its width. Page comparisons may extend beyond the prose column.
      const expand = this.sideBySide && !home && !modal;
      const width = expand ? Math.max(normalWidth, availableWidth) : normalWidth;
      this.style.width = expand ? width + 'px' : '';
      this.dataset.stacked = String(
        width < (modal ? 37 : 57) * parseFloat(getComputedStyle(document.documentElement).fontSize),
      );
      const explanation = this.querySelector<HTMLElement>('.script-unavailable');
      if (explanation)
        explanation.hidden =
          dialect() !== 'kalms' || !next.some((p) => p.dataset.language === 'kalm');
      const active =
        this.panels.find(
          (p) =>
            p.dataset.language === dialect() &&
            (!p.dataset.style || p.dataset.style === codeStyle()),
        ) || this.panels.find((p) => p.dataset.language === 'kalm') ||
        this.panels.find((p) => p.dataset.language === 'kalms');
      this.querySelectorAll<HTMLButtonElement>('[data-comparison-language]').forEach((button) => {
        const java = button.dataset.comparisonLanguage === 'java';
        button.textContent = java
          ? 'Java'
          : active?.dataset.language === 'kalms'
            ? 'Kalm Script'
            : 'Kalm';
        button.setAttribute('aria-selected', String(this.java === java));
        button.tabIndex = this.java === java ? 0 : -1;
        const panel = java ? this.panels.find((p) => p.dataset.language === 'java') : active;
        if (panel) {
          button.setAttribute('aria-controls', panel.id);
          panel.setAttribute('aria-labelledby', button.id);
        }
      });
      const tabs = this.querySelector<HTMLElement>('[role="tablist"]');
      if (tabs) tabs.hidden = this.sideBySide;
      const summary = this.querySelector<HTMLElement>('.comparison-summary');
      if (summary) {
        summary.hidden = !this.sideBySide;
        summary.textContent =
          (active?.dataset.language === 'kalms' ? 'Kalm Script' : 'Kalm') + ' / Java';
      }
      this.querySelector('[data-comparison-layout]')?.setAttribute(
        'aria-pressed',
        String(this.sideBySide),
      );
      this.dispatchEvent(new Event('kalm-source-change', { bubbles: true }));
      if (focused instanceof HTMLInputElement && focused.hasAttribute('data-greeting-name'))
        focused.focus({ preventScroll: true });
    };
    if (!animate || reduced) {
      gsap.set(stage, { clearProps: 'opacity,transform,height,overflow' });
      apply();
      if (!this.sideBySide || modal) this.style.width = '';
      return;
    }
    this.timeline = gsap.timeline();
    this.timeline.to(stage, { opacity: 0.2, y: -2, duration: 0.055, ease: 'power1.in' }).add(() => {
      gsap.set(stage, { clearProps: 'height,overflow' });
      apply();
      const height = stage.getBoundingClientRect().height;
      const width = this.getBoundingClientRect().width;
      gsap.set(stage, { height: beforeHeight, overflow: 'hidden', y: 2 });
      const start = this.timeline!.duration();
      if (!modal && Math.abs(width - beforeWidth) > 1) {
        gsap.set(this, { width: beforeWidth });
        this.timeline!.to(this, {
          width, duration: 0.16, ease: 'power2.out',
          onComplete: () => { if (!this.sideBySide) this.style.width = ''; },
        }, start);
      }
      this.timeline!.to(
        stage,
        {
          height,
          opacity: 1,
          y: 0,
          duration: 0.14,
          ease: 'power2.out',
          onComplete: () => {
            gsap.set(stage, { clearProps: 'opacity,transform,height,overflow' });
          },
        },
        start,
      );
    });
  }
  connectedCallback() {
    this.panels = [...this.querySelectorAll<HTMLElement>(':scope > .comparison-panes > section')];
    this.policy = JSON.parse(this.dataset.policy || '{}');
    if (
      !this.hasAttribute('data-home') &&
      this.policy.presentation !== 'showcase' &&
      this.panels.some((p) => p.dataset.language === 'java') &&
      this.panels.some((p) => ['kalm', 'kalms'].includes(p.dataset.language || ''))
    ) {
      this.querySelector('.comparison-controls')!.innerHTML =
        '<div class="source-tab-bar" role="tablist" aria-label="Compare languages"><button type="button" role="tab" id="' +
        this.id +
        '-kalm-tab" data-comparison-language="kalm">Kalm</button><button type="button" role="tab" id="' +
        this.id +
        '-java-tab" data-comparison-language="java">Java</button></div><span class="comparison-summary" hidden></span><button type="button" class="comparison-layout" data-comparison-layout aria-label="Compare side by side" title="Compare side by side" aria-pressed="false">' +
        icon('columns-2') +
        '</button>';
      this.querySelectorAll<HTMLButtonElement>('[data-comparison-language]').forEach((button) => {
        button.onclick = () => {
          this.java = button.dataset.comparisonLanguage === 'java';
          this.sync(true);
        };
        button.onkeydown = (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          this.java = event.key === 'End' || (event.key !== 'Home' && !this.java);
          this.sync(true);
          this.querySelector<HTMLButtonElement>(
            '[data-comparison-language="' + (this.java ? 'java' : 'kalm') + '"]',
          )?.focus({ preventScroll: true });
        };
      });
      this.querySelector<HTMLButtonElement>('[data-comparison-layout]')!.onclick = () => {
        this.sideBySide = !this.sideBySide;
        this.sync(true);
      };
    }
    this.ready = true;
    this.dataset.ready = '';
    this.sync(false);
    window.addEventListener('kalm-dialect-change', this.preferences);
    window.addEventListener('pageshow', this.reset);
    window.addEventListener('resize', this.resize);
    this.observer = new ResizeObserver(() => {
      if (!this.timeline?.isActive()) this.sync(false);
    });
    this.observer.observe(this.parentElement!);
  }
  disconnectedCallback() {
    this.timeline?.kill();
    this.observer?.disconnect();
    window.removeEventListener('kalm-dialect-change', this.preferences);
    window.removeEventListener('pageshow', this.reset);
    window.removeEventListener('resize', this.resize);
  }
}
customElements.define('kalm-code-compare', CodeCompare);
