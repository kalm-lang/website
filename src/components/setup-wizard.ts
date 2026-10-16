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
  private animation?: gsap.core.Timeline;
  private reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  connectedCallback() {
    try {
      if (localStorage.getItem(completeKey) === 'true') return;
    } catch { /* Setup also works without storage. */ }
    if (location.pathname === '/' && !this.reduced()) this.dataset.welcome = 'true';
    this.dialog = this.querySelector<HTMLDialogElement>('dialog')!;
    const preferences = this.preferences();
    if (preferences.os !== 'auto') applyPreferences({...preferences, os: 'auto'});
    this.renderShells();
    this.sync();
    this.showStep(0, false);
    this.hidden = false;
    this.addEventListener('click', this.handleClick);
    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('close', this.handleClosed);
  }

  disconnectedCallback() {
    this.animation?.kill();
    this.removeEventListener('click', this.handleClick);
    this.dialog?.removeEventListener('cancel', this.handleCancel);
    this.dialog?.removeEventListener('close', this.handleClosed);
    if (this.dialog?.open) this.dialog.close();
    this.unlockPage();
  }

  private preferences() {
    return JSON.parse(document.documentElement.dataset.codePreferences || '{}');
  }

  private readonly handleCancel = (event: Event) => { event.preventDefault(); this.close(); };
  private readonly handleClosed = () => {
    this.unlockPage();
    if (this.step === 3) this.dismiss();
  };

  private readonly handleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-setup-dismiss]')) { this.dismiss(); return; }
    if (event.target.closest('[data-setup-open]')) { this.open(); return; }
    if (event.target.closest('[data-setup-close], [data-setup-finish]')) { this.close(); return; }
    if (event.target === this.dialog) {
      const rect = this.dialog.getBoundingClientRect();
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
    this.busy = false;
    this.showStep(this.step, false);
    const root = document.documentElement;
    root.style.setProperty('--dialog-scrollbar-gap', `${innerWidth - root.clientWidth}px`);
    root.dataset.dialogOpen = '';
    this.dialog.showModal();
    this.focusHeading();
    if (this.reduced()) return;
    this.setDialogOrigin();
    this.setBusy(true);
    this.animation = gsap.timeline({onComplete: () => { this.setBusy(false); this.focusHeading(); }});
    this.animation
      .fromTo(this.dialog,
        {autoAlpha: 0, scale: .88, y: 28, rotationX: -5, filter: 'blur(5px)', '--setup-backdrop-alpha': 0, '--setup-backdrop-blur': '0px'},
        {autoAlpha: 1, scale: 1, y: 0, rotationX: 0, filter: 'blur(0px)', '--setup-backdrop-alpha': .58, '--setup-backdrop-blur': '6px', duration: .7, ease: 'expo.out', clearProps: 'transform,filter,transformOrigin'},
      )
      .fromTo(this.dialog.querySelectorAll('.setup-dialog-header, .setup-stage, .setup-dialog-footer'),
        {autoAlpha: 0, y: 18}, {autoAlpha: 1, y: 0, duration: .45, stagger: .065, ease: 'power3.out', clearProps: 'opacity,visibility,transform'}, .14)
      .fromTo(this.dialog.querySelectorAll('[data-setup-step]:not([hidden]) .setup-choice'),
        {autoAlpha: 0, y: 16, scale: .97}, {autoAlpha: 1, y: 0, scale: 1, duration: .5, stagger: .08, ease: 'power3.out', clearProps: 'opacity,visibility,transform'}, .25);
  }

  private close() {
    if (!this.dialog.open) return;
    this.animation?.kill();
    this.setBusy(true);
    const finish = () => {
      this.dialog.close();
      this.setBusy(false);
      gsap.set(this.dialog, {clearProps: 'opacity,visibility,transform,transformOrigin,filter'});
      this.dialog.style.removeProperty('--setup-backdrop-alpha');
      this.dialog.style.removeProperty('--setup-backdrop-blur');
      gsap.set(this.dialog.querySelectorAll('.setup-stage, .setup-dialog-header, .setup-dialog-footer, .setup-choice'), {clearProps: 'opacity,visibility,transform'});
    };
    if (this.reduced()) { finish(); return; }
    this.setDialogOrigin();
    this.animation = gsap.timeline({onComplete: finish}).to(this.dialog,
      {autoAlpha: 0, scale: .88, y: 28, rotationX: -5, '--setup-backdrop-alpha': 0, '--setup-backdrop-blur': '0px', duration: .32, ease: 'expo.in'});
  }

  private setDialogOrigin() {
    const trigger = this.querySelector<HTMLElement>('[data-setup-open]')!.getBoundingClientRect();
    const bounds = this.dialog.getBoundingClientRect();
    gsap.set(this.dialog, {transformOrigin: `${trigger.left + trigger.width / 2 - bounds.left}px ${trigger.top + trigger.height / 2 - bounds.top}px`});
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
