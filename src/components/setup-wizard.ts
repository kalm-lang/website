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
    const trigger = this.querySelector<HTMLElement>('[data-setup-open]')!.getBoundingClientRect();
    const origin = {x: trigger.left + trigger.width / 2, y: trigger.top + trigger.height / 2};
    const root = document.documentElement;
    root.style.setProperty('--dialog-scrollbar-gap', `${Math.max(0, innerWidth - root.clientWidth)}px`);
    root.dataset.dialogOpen = '';
    if (!this.reduced()) {
      // Set initial styles before showModal to avoid a fully painted first frame.
      gsap.set(this.dialog, {'--setup-backdrop-alpha': 0, '--setup-backdrop-blur': '0px'});
      gsap.set(this.surface, {opacity: 0, scale: .97, y: 12});
    }
    this.dialog.showModal();
    this.focusHeading();
    if (this.reduced()) return;
    this.positionSunlight(origin);
    this.sunlight.hidden = false;
    this.transition = 'opening';
    this.setBusy(true);
    this.animation = gsap.timeline({onComplete: () => {
      this.animation = undefined;
      this.transition = undefined;
      this.resetPresentation();
      this.setBusy(false);
      this.focusHeading();
    }});
    this.animation
      .fromTo(this.rays, {opacity: 0}, {opacity: .16, duration: .25, ease: 'power2.out'}, 0)
      .to(this.rays, {scale: 1, duration: .65, ease: 'power3.out'}, 0)
      .to(this.dialog, {'--setup-backdrop-alpha': .58, '--setup-backdrop-blur': '6px', duration: .55, ease: 'power2.out'}, .1)
      .to(this.surface, {opacity: 1, scale: 1, y: 0, duration: .55, ease: 'power3.out'}, .1)
      .fromTo(this.dialog.querySelectorAll('.setup-dialog-header, [data-setup-step]:not([hidden]) h2, [data-setup-step]:not([hidden]) .setup-description'),
        {opacity: 0, y: 6}, {opacity: 1, y: 0, duration: .38, stagger: .035, ease: 'power2.out'}, .25)
      .fromTo(this.dialog.querySelectorAll('[data-setup-step]:not([hidden]) .setup-choice'),
        {opacity: 0, y: 6}, {opacity: 1, y: 0, duration: .35, stagger: .02, ease: 'power2.out'}, .31)
      .to(this.rays, {opacity: 0, duration: .4, ease: 'power2.inOut'}, .45);
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

  private positionSunlight(origin: {x: number; y: number}) {
    const viewport = this.dialog.getBoundingClientRect();
    const radius = Math.hypot(
      Math.max(Math.abs(origin.x - viewport.left), Math.abs(viewport.right - origin.x)),
      Math.max(Math.abs(origin.y - viewport.top), Math.abs(viewport.bottom - origin.y)),
    );
    // Use layout coordinates so the card's entrance transform cannot move the aim.
    const angle = Math.atan2(
      viewport.top + this.surface.offsetTop + this.surface.offsetHeight / 2 - origin.y,
      viewport.left + this.surface.offsetLeft + this.surface.offsetWidth / 2 - origin.x,
    ) * 180 / Math.PI;
    gsap.set(this.rays, {
      left: origin.x - viewport.left - radius, top: origin.y - viewport.top - radius,
      width: radius * 2, height: radius * 2, rotation: angle, scale: .12,
    });
  }

  private resetPresentation() {
    this.sunlight.hidden = true;
    gsap.killTweensOf(this.dialog.querySelector('.setup-success'));
    gsap.set(this.rays, {clearProps: 'all'});
    gsap.set(this.surface, {clearProps: 'opacity,visibility,transform'});
    gsap.set(this.dialog.querySelectorAll('.setup-dialog-header, .setup-stage, [data-setup-step] h2, .setup-description, .setup-choice, .setup-success'),
      {clearProps: 'opacity,visibility,transform'});
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
