import {autoUpdate, computePosition, flip, offset, shift, size} from '@floating-ui/dom';
import {gsap} from 'gsap';

/** Positions the header settings menu and manages its focus and motion. */
export class HeaderPopover {
  private open = false;
  private cleanup?: () => void;
  private motion?: gsap.core.Tween;
  private revision = 0;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly toggle = () => this.setOpen(!this.open);
  private readonly outside = (event: PointerEvent) => {
    if (this.open && !this.host.contains(event.target as Node)) this.setOpen(false);
  };
  private readonly escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.open) {
      this.setOpen(false);
      this.trigger.focus({ preventScroll: true });
    }
  };
  private readonly focus = (event: PointerEvent) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (button && event.button === 0) {
      event.preventDefault();
      button.focus({ preventScroll: true });
    }
  };

  constructor(
    private readonly host: HTMLElement,
    private readonly trigger: HTMLButtonElement,
    private readonly panel: HTMLElement,
    private readonly alignment: 'start' | 'end',
  ) {
    panel.setAttribute('popover', 'manual');
    trigger.addEventListener('click', this.toggle);
    host.addEventListener('pointerdown', this.focus);
    document.addEventListener('pointerdown', this.outside);
    window.addEventListener('keydown', this.escape);
  }

  setOpen(open: boolean) {
    const revision = ++this.revision;
    this.open = open;
    this.trigger.setAttribute('aria-expanded', String(open));
    this.panel.inert = !open;
    this.motion?.kill();
    this.cleanup?.();
    this.cleanup = undefined;
    if (open) {
      const entering = !this.panel.matches(':popover-open');
      if (entering) {
        gsap.set(this.panel, { opacity: 0, y: -4, scale: .985 });
        this.panel.showPopover();
      }
      const position = async () => {
        const { x, y } = await computePosition(this.trigger, this.panel, {
          strategy: 'fixed', placement: `bottom-${this.alignment}`,
          middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 }), size({
            padding: 12,
            apply: ({ availableHeight }) => { this.panel.style.maxHeight = Math.max(0, availableHeight) + 'px'; },
          })],
        });
        if (!this.open || revision !== this.revision) return;
        Object.assign(this.panel.style, { left: `${x}px`, top: `${y}px` });
        if (!this.panel.hasAttribute('data-positioned') || !this.panel.classList.contains('open')) {
          this.panel.dataset.positioned = '';
          this.panel.classList.add('open');
          this.motion = gsap.to(this.panel, {
            opacity: 1, y: 0, scale: 1, duration: this.reduced.matches ? 0 : .14,
            ease: 'power2.out', overwrite: true,
          });
        }
      };
      this.cleanup = autoUpdate(this.trigger, this.panel, () => { void position(); });
    } else {
      this.panel.classList.remove('open');
      this.motion = gsap.to(this.panel, {
        opacity: 0, y: -4, scale: .985, duration: this.reduced.matches ? 0 : .11,
        ease: 'power2.in', overwrite: true,
        onComplete: () => {
          if (this.open || revision !== this.revision) return;
          if (this.panel.matches(':popover-open')) this.panel.hidePopover();
          delete this.panel.dataset.positioned;
        },
      });
    }
  }

  destroy() {
    ++this.revision;
    this.motion?.kill();
    this.cleanup?.();
    if (this.panel.matches(':popover-open')) this.panel.hidePopover();
    this.trigger.removeEventListener('click', this.toggle);
    this.host.removeEventListener('pointerdown', this.focus);
    document.removeEventListener('pointerdown', this.outside);
    window.removeEventListener('keydown', this.escape);
  }
}
