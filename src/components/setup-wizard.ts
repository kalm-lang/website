import {applyPreferences} from '../../shared/preferences.mjs';
import {icon} from '../../shared/icons.mjs';
import {gsap} from 'gsap';

const completeKey = 'kalm-setup-complete';

/** A persistent invitation, followed by a focused preference walkthrough. */
class SetupWizard extends HTMLElement {
  private step = 0;
  private busy = false;
  private readonly chosenSettings = new Set<string>();
  private dialog!: HTMLDialogElement;
  private surface!: HTMLElement;
  private sunlight!: HTMLElement;
  private rays!: SVGSVGElement;
  private rayWindow!: HTMLElement;
  private launchLabel!: HTMLElement;
  private animation?: gsap.core.Timeline;
  private transition?: 'opening' | 'closing';
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private reduced = () => this.motion.matches;

  connectedCallback() {
    try {
      if (localStorage.getItem(completeKey) === 'true') return;
    } catch { /* Setup also works without storage. */ }
    if (location.pathname === '/' && !this.reduced()) this.dataset.welcome = 'true';
    this.dialog = this.querySelector<HTMLDialogElement>('dialog')!;
    this.surface = this.dialog.querySelector<HTMLElement>('.setup-dialog-surface')!;
    this.sunlight = this.dialog.querySelector<HTMLElement>('.setup-sunlight')!;
    this.rays = this.dialog.querySelector<SVGSVGElement>('.setup-sunlight-rays')!;
    this.rayWindow = this.dialog.querySelector<HTMLElement>('.setup-ray-window')!;
    this.launchLabel = this.dialog.querySelector<HTMLElement>('.setup-launch-label')!;
    const preferences = this.preferences();
    if (preferences.os !== 'auto') applyPreferences({...preferences, os: 'auto'});
    this.renderShells();
    this.sync();
    this.showStep(0, false);
    this.hidden = false;
    this.addEventListener('click', this.handleClick);
    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('close', this.handleClosed);
    window.addEventListener('resize', this.settleAnimation, {passive: true});
    window.visualViewport?.addEventListener('resize', this.settleAnimation, {passive: true});
    this.motion.addEventListener('change', this.handleMotionChange);
  }

  disconnectedCallback() {
    this.animation?.kill();
    this.animation = undefined;
    this.transition = undefined;
    this.removeEventListener('click', this.handleClick);
    this.dialog?.removeEventListener('cancel', this.handleCancel);
    this.dialog?.removeEventListener('close', this.handleClosed);
    window.removeEventListener('resize', this.settleAnimation);
    window.visualViewport?.removeEventListener('resize', this.settleAnimation);
    this.motion.removeEventListener('change', this.handleMotionChange);
    if (this.dialog?.open) this.dialog.close();
    if (this.dialog) this.resetPresentation();
    this.unlockPage();
  }

  private preferences() {
    return JSON.parse(document.documentElement.dataset.codePreferences || '{}');
  }

  private readonly handleCancel = (event: Event) => { event.preventDefault(); this.close(); };
  private readonly handleClosed = () => {
    // A queued close event can arrive after the dialog has already reopened.
    if (this.dialog.open) return;
    this.animation?.kill();
    this.animation = undefined;
    this.transition = undefined;
    this.resetPresentation();
    this.setBusy(false);
    this.unlockPage();
    if (this.step === 3) this.dismiss();
    if (this.isConnected) {
      const trigger = this.step === 3
        ? document.querySelector<HTMLElement>('.settings-trigger')
        : this.querySelector<HTMLElement>('[data-setup-open]');
      trigger?.focus({preventScroll: true});
    }
  };

  private readonly settleAnimation = () => {
    const animation = this.animation;
    if (!this.dialog?.open || !animation) return;
    animation.progress(1);
    animation.kill();
    if (this.animation === animation) this.animation = undefined;
  };

  private readonly handleMotionChange = () => {
    if (this.reduced()) this.settleAnimation();
  };

  private readonly handleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-setup-dismiss]')) { this.dismiss(); return; }
    if (event.target.closest('[data-setup-open]')) { this.open(); return; }
    if (event.target.closest('[data-setup-close], [data-setup-finish]')) { this.close(); return; }
    if (event.target === this.dialog) {
      const rect = this.surface.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
      return;
    }
    if (this.busy) return;
    const choice = event.target.closest<HTMLButtonElement>('[data-setup-choice]');
    if (choice) {
      applyPreferences({...this.preferences(), [choice.dataset.setupChoice!]: choice.dataset.value!});
      this.chosenSettings.add(choice.dataset.setupChoice!);
      this.sync();
      window.dispatchEvent(new Event('kalm-dialect-change'));
      this.showStep(this.step + 1);
    } else if (event.target.closest('[data-setup-back]')) this.showStep(this.step - 1);
    else if (event.target.closest('[data-setup-next]')) this.showStep(this.step + 1);
  };

  private open() {
    if (this.dialog.open) return;
    this.animation?.kill();
    this.animation = undefined;
    this.resetPresentation();
    this.busy = false;
    this.showStep(this.step, false);
    const button = this.querySelector<HTMLElement>('[data-setup-open]')!;
    const trigger = button.getBoundingClientRect();
    const root = document.documentElement;
    root.style.setProperty('--dialog-scrollbar-gap', `${Math.max(0, innerWidth - root.clientWidth)}px`);
    root.dataset.dialogOpen = '';
    if (!this.reduced()) {
      // Set initial styles before showModal to avoid a fully painted first frame.
      gsap.set(this.dialog, {'--setup-backdrop-alpha': 0, '--setup-backdrop-blur': '0px'});
      gsap.set(this.surface, {opacity: 0});
    }
    this.dialog.showModal();
    this.focusHeading();
    if (this.reduced()) return;
    const reveal = this.prepareReveal(button, trigger);
    this.sunlight.hidden = false;
    this.transition = 'opening';
    this.setBusy(true);
    const travel = {duration: .6, ease: 'power3.inOut'};
    const travelStart = .06;
    const lightSweep = {progress: 0};
    this.animation = gsap.timeline({onComplete: () => {
      this.animation = undefined;
      this.transition = undefined;
      this.resetPresentation();
      this.setBusy(false);
      this.focusHeading();
    }});
    this.animation
      .fromTo(this.rays, {opacity: 0}, {opacity: .14, duration: .16, ease: 'power2.out'}, 0)
      .to(this.rays, {opacity: 0, duration: .54, ease: 'power2.inOut'}, .18)
      .to(this.dialog, {'--setup-backdrop-alpha': .58, '--setup-backdrop-blur': '6px', duration: .55, ease: 'power2.out'}, .1)
      .to(this.launchLabel, {opacity: 0, duration: .1, ease: 'power2.in'}, travelStart)
      .to(this.surface, {
        x: 0, y: 0, scaleX: 1, scaleY: 1,
        borderTopLeftRadius: '18px 18px', borderTopRightRadius: '18px 18px',
        borderBottomLeftRadius: '18px 18px', borderBottomRightRadius: '18px 18px',
        ...travel,
      }, travelStart)
      // Keep the pattern still; only its visible front follows the card.
      .to(lightSweep, {progress: 1, ...travel, onUpdate: () => reveal.clip(lightSweep.progress)}, travelStart)
      .to(this.surface, {backgroundColor: reveal.background, borderColor: reveal.border, duration: .4, ease: 'power2.inOut'}, .12)
      .fromTo(this.dialog.querySelectorAll('.setup-dialog-header, .setup-dialog-progress, .setup-stage, .setup-dialog-footer'),
        {opacity: 0, y: 6}, {opacity: 1, y: 0, duration: .33, stagger: .02, ease: 'power2.out'}, .4)
      .fromTo(this.dialog.querySelectorAll('[data-setup-step]:not([hidden]) .setup-choice'),
        {opacity: 0, y: 6}, {opacity: 1, y: 0, duration: .33, stagger: .02, ease: 'power2.out'}, .45)
      .to(this.surface, {'--setup-edge-light': .6, duration: .22, ease: 'power2.out'}, .3)
      .to(this.surface, {'--setup-edge-light': 0, duration: .33, ease: 'power2.inOut'}, .52);
  }

  private close() {
    if (!this.dialog.open || this.transition === 'closing') return;
    this.animation?.kill();
    this.animation = undefined;
    this.transition = 'closing';
    this.sunlight.hidden = true;
    this.setBusy(true);
    const finish = () => {
      this.animation = undefined;
      this.transition = undefined;
      this.dialog.close();
      this.resetPresentation();
      this.setBusy(false);
      this.unlockPage();
    };
    if (this.reduced()) { finish(); return; }
    this.animation = gsap.timeline({onComplete: finish})
      .to(this.surface, {opacity: 0, scale: .985, y: 4, duration: .22, ease: 'power2.inOut'}, 0)
      .to(this.dialog, {'--setup-backdrop-alpha': 0, '--setup-backdrop-blur': '0px', duration: .22, ease: 'power2.inOut'}, 0);
  }

  private prepareReveal(button: HTMLElement, trigger: DOMRect) {
    const viewport = this.dialog.getBoundingClientRect();
    const card = this.surface.getBoundingClientRect();
    const origin = {x: trigger.left + trigger.width / 2, y: trigger.top + trigger.height / 2};
    const center = {x: card.left + card.width / 2, y: card.top + card.height / 2};
    const radius = Math.hypot(
      Math.max(Math.abs(origin.x - viewport.left), Math.abs(viewport.right - origin.x)),
      Math.max(Math.abs(origin.y - viewport.top), Math.abs(viewport.bottom - origin.y)),
    );
    const angle = Math.atan2(center.y - origin.y, center.x - origin.x) * 180 / Math.PI;
    const buttonStyle = getComputedStyle(button);
    const cardStyle = getComputedStyle(this.surface);
    const background = cardStyle.backgroundColor;
    const border = cardStyle.borderTopColor;
    const scaleX = trigger.width / card.width;
    const scaleY = trigger.height / card.height;
    const corner = parseFloat(buttonStyle.borderTopLeftRadius);
    this.launchLabel.replaceChildren(...Array.from(button.childNodes, node => node.cloneNode(true)));
    gsap.set(this.launchLabel, {
      left: trigger.left - viewport.left, top: trigger.top - viewport.top, width: trigger.width, height: trigger.height,
      font: buttonStyle.font, gap: buttonStyle.gap, padding: buttonStyle.padding, opacity: 1,
    });
    const launchCorner = `${corner / scaleX}px ${corner / scaleY}px`;
    gsap.set(this.surface, {
      opacity: 1, x: trigger.left - card.left, y: trigger.top - card.top, scaleX, scaleY, transformOrigin: '0 0',
      borderTopLeftRadius: launchCorner, borderTopRightRadius: launchCorner,
      borderBottomLeftRadius: launchCorner, borderBottomRightRadius: launchCorner,
      backgroundColor: buttonStyle.backgroundColor, borderColor: buttonStyle.borderTopColor,
    });
    gsap.set(this.rays, {
      left: origin.x - viewport.left - radius, top: origin.y - viewport.top - radius,
      width: radius * 2, height: radius * 2, rotation: angle, scale: 1, x: 0, y: 0,
    });
    const dx = center.x - origin.x;
    const dy = center.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const direction = distance > .01 ? {x: dx / distance, y: dy / distance} : {x: 0, y: 1};
    const clip = (progress: number) => {
      const front = {
        x: origin.x - viewport.left + dx * progress,
        y: origin.y - viewport.top + dy * progress,
      };
      const width = trigger.width + (card.width - trigger.width) * progress;
      const height = trigger.height + (card.height - trigger.height) * progress;
      const leadingEdge = (Math.abs(direction.x) * width + Math.abs(direction.y) * height) / 2;
      front.x += direction.x * leadingEdge;
      front.y += direction.y * leadingEdge;
      const corners = [{x: 0, y: 0}, {x: viewport.width, y: 0}, {x: viewport.width, y: viewport.height}, {x: 0, y: viewport.height}];
      const polygon: {x: number; y: number}[] = [];
      // Keep light strictly beyond the card's leading edge, including its sides.
      for (let index = 0; index < corners.length; index++) {
        const start = corners[index];
        const end = corners[(index + 1) % corners.length];
        const startDistance = (start.x - front.x) * direction.x + (start.y - front.y) * direction.y;
        const endDistance = (end.x - front.x) * direction.x + (end.y - front.y) * direction.y;
        if (startDistance >= 0) polygon.push(start);
        if ((startDistance >= 0) !== (endDistance >= 0)) {
          const fraction = startDistance / (startDistance - endDistance);
          polygon.push({x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction});
        }
      }
      this.rayWindow.style.clipPath = polygon.length >= 3
        ? `polygon(${polygon.map(point => `${point.x.toFixed(2)}px ${point.y.toFixed(2)}px`).join(',')})`
        : 'polygon(0 0, 0 0, 0 0)';
      // Feather only the forward side of the cut, leaving no light behind it.
      const span = Math.abs(direction.x) * viewport.width + Math.abs(direction.y) * viewport.height;
      const start = (viewport.width * direction.x + viewport.height * direction.y - span) / 2;
      const boundary = front.x * direction.x + front.y * direction.y - start;
      const angle = Math.atan2(direction.x, -direction.y) * 180 / Math.PI;
      this.rayWindow.style.maskImage = `linear-gradient(${angle}deg, transparent ${boundary}px, #000 ${boundary + 8 + 16 * progress}px)`;
    };
    clip(0);
    return {background, border, clip};
  }

  private resetPresentation() {
    this.sunlight.hidden = true;
    gsap.killTweensOf(this.dialog.querySelector('.setup-success'));
    gsap.set(this.rays, {clearProps: 'all'});
    this.rayWindow.style.removeProperty('clip-path');
    this.rayWindow.style.removeProperty('mask-image');
    gsap.set(this.launchLabel, {clearProps: 'all'});
    this.launchLabel.replaceChildren();
    gsap.set(this.surface, {clearProps: 'opacity,visibility,transform,transformOrigin,borderRadius,backgroundColor,borderColor,--setup-edge-light'});
    gsap.set(this.dialog.querySelectorAll('.setup-dialog-header, .setup-dialog-progress, .setup-stage, [data-setup-step] h2, .setup-description, .setup-choice, .setup-success'),
      {clearProps: 'opacity,visibility,transform'});
    // The completed step keeps its footer hidden independently of the reveal.
    gsap.set(this.dialog.querySelector('.setup-dialog-footer'), {clearProps: 'opacity,transform'});
    this.dialog.style.removeProperty('--setup-backdrop-alpha');
    this.dialog.style.removeProperty('--setup-backdrop-blur');
  }

  private showStep(next: number, animate = true) {
    const step = Math.max(0, Math.min(3, next));
    const direction = step >= this.step ? 1 : -1;
    const stage = this.querySelector<HTMLElement>('.setup-stage')!;
    const apply = () => {
      this.step = step;
      this.querySelectorAll<HTMLElement>('[data-setup-step]').forEach(panel => panel.hidden = Number(panel.dataset.setupStep) !== step);
      const panel = this.querySelector<HTMLElement>(`[data-setup-step="${step}"]`)!;
      this.dialog.setAttribute('aria-labelledby', panel.dataset.setupHeading!);
      this.dialog.setAttribute('aria-describedby', panel.dataset.setupDescription!);
      const progress = this.querySelector<HTMLElement>('[role="progressbar"]')!;
      progress.setAttribute('aria-valuenow', String(step));
      progress.setAttribute('aria-valuetext', step === 3 ? 'Setup complete' : `Step ${step + 1} of 3`);
      progress.style.setProperty('--setup-progress', `${step / 3 * 100}%`);
      this.querySelector<HTMLElement>('[data-setup-position]')!.textContent = `Step ${step + 1} of 3`;
      this.setBusy(this.busy);
      const footer = this.querySelector<HTMLElement>('.setup-dialog-footer')!;
      footer.inert = step === 3;
      footer.style.visibility = step === 3 ? 'hidden' : '';
      const nextButton = this.querySelector<HTMLButtonElement>('[data-setup-next]')!;
      nextButton.innerHTML = icon(step === 2 ? 'check' : 'arrow-right');
      nextButton.setAttribute('aria-label', step === 2 ? 'Finish setup' : 'Next step');
      nextButton.title = step === 2 ? 'Finish setup' : 'Next step';
    };
    this.animation?.kill();
    if (!animate || !this.dialog.open || this.reduced()) {
      apply();
      if (animate && this.dialog.open) this.focusHeading();
      return;
    }
    this.setBusy(true);
    this.animation = gsap.timeline({onComplete: () => { this.setBusy(false); this.focusHeading(); }});
    this.animation.to(stage, {autoAlpha: 0, x: -direction * 16, duration: .16, ease: 'power2.in'})
      .add(apply)
      .fromTo(stage, {autoAlpha: 0, x: direction * 20}, {autoAlpha: 1, x: 0, duration: .32, immediateRender: false, ease: 'power3.out', clearProps: 'opacity,visibility,transform'})
      .add(() => {
        if (step === 3) gsap.fromTo(this.querySelector('.setup-success'), {scale: .65, rotation: -20}, {scale: 1, rotation: 0, duration: .65, ease: 'back.out(1.8)', clearProps: 'transform'});
      }, '-=.2');
  }

  private focusHeading() {
    this.querySelector<HTMLElement>(`[data-setup-step="${this.step}"] h2`)?.focus({preventScroll: true});
  }

  private setBusy(value: boolean) {
    this.busy = value;
    this.dialog.querySelectorAll<HTMLButtonElement>('[data-setup-choice], [data-setup-next], [data-setup-back]').forEach(button => {
      button.disabled = value || (button.hasAttribute('data-setup-back') && this.step === 0);
    });
  }

  private renderShells() {
    const shells = document.documentElement.dataset.codeOs === 'windows' ? ['powershell', 'cmd'] : ['bash', 'zsh', 'powershell'];
    const details: Record<string, [string, string, string]> = {
      powershell: ['PowerShell', 'A modern shell with rich scripting tools.', 'Write-Output "Hello"'],
      cmd: ['Command Prompt', 'The classic Windows command shell.', 'echo Hello'],
      bash: ['Bash', 'A familiar shell for terminals and scripts.', 'echo "Hello"'],
      zsh: ['zsh', 'A flexible shell with handy interactive features.', 'echo "Hello"'],
    };
    this.querySelector<HTMLElement>('[data-setup-shell-options]')!.innerHTML = shells.map(shell => {
      const [name, description, example] = details[shell];
      return `<button class="setup-choice" type="button" data-setup-choice="shell" data-value="${shell}" aria-pressed="false"><span class="setup-choice-heading"><strong>${name}</strong>${icon('arrow-right')}</span><span class="setup-choice-description">${description}</span><span class="setup-example"><code>${example}</code></span></button>`;
    }).join('');
  }

  private sync() {
    const preferences = this.preferences();
    this.querySelectorAll<HTMLButtonElement>('[data-setup-choice]').forEach(button => {
      const setting = button.dataset.setupChoice!;
      const effective = setting === 'shell' && preferences.shell === 'auto' ? document.documentElement.dataset.codeShell : preferences[setting];
      button.setAttribute('aria-pressed', String(this.chosenSettings.has(setting) && effective === button.dataset.value));
    });
  }

  private unlockPage() {
    if (document.querySelector('dialog[open]')) return;
    delete document.documentElement.dataset.dialogOpen;
    document.documentElement.style.removeProperty('--dialog-scrollbar-gap');
  }

  private dismiss() {
    try { localStorage.setItem(completeKey, 'true'); } catch { /* Dismiss for this page view. */ }
    this.hidden = true;
    if (this.step === 3 && !this.reduced()) gsap.fromTo('.settings-trigger', {boxShadow: '0 0 0 0px var(--accent)'}, {boxShadow: '0 0 0 14px transparent', duration: 1.1, clearProps: 'boxShadow'});
  }
}

customElements.define('kalm-setup-wizard', SetupWizard);
