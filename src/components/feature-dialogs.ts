import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export function enhanceFeatureDialogs() {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll<HTMLDialogElement>('dialog.feature-dialog').forEach(dialog => {
    dialog.dataset.cardEnhanced = '';
    const trigger = document.querySelector<HTMLElement>('[aria-controls="' + dialog.id + '"]')!;
    const surface = document.createElement('div');
    surface.className = 'card-turn-surface';
    const back = document.createElement('div');
    back.className = 'card-turn-back';
    back.append(...dialog.childNodes);
    const front = document.createElement('div');
    front.className = 'card-turn-front';
    front.setAttribute('aria-hidden', 'true');
    front.inert = true;
    surface.append(front, back);
    dialog.append(surface);
    let timeline: gsap.core.Timeline | undefined;
    let closing = false;
    const finishClose = () => {
      timeline?.kill();
      timeline = undefined;
      dialog.close();
    };
    const close = () => {
      if (!dialog.open || closing) return;
      closing = true;
      dialog.dataset.transition = 'closing';
      if (reduced.matches || !timeline || timeline.time() === 0) { finishClose(); return; }
      timeline.timeScale(.55 / .4).reverse();
    };
    const open = (event: Event) => {
      event.preventDefault();
      if (dialog.open) {
        if (closing && timeline) { closing = false; dialog.dataset.transition = 'opening'; timeline.timeScale(1).play(); }
        return;
      }
      closing = false;
      const copy = trigger.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
      copy.removeAttribute('aria-controls');
      copy.removeAttribute('href');
      copy.removeAttribute('aria-haspopup');
      copy.className = 'card-face-summary';
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      front.replaceChildren(copy);
      root.dataset.dialogOpen = '';
      dialog.showModal();
      trigger.dataset.cardOpen = '';
      dialog.querySelector<HTMLElement>('.feature-close')?.focus({ preventScroll: true });
      if (reduced.matches) { gsap.set(surface, { rotationY: 180 }); return; }
      dialog.dataset.transition = 'opening';
      gsap.set(dialog, { '--backdrop-alpha': 0, '--backdrop-blur': '0px' });
      // Flip owns the outer layout transform; the inner surface owns the turn.
      const layoutState = Flip.getState(dialog);
      const target = Flip.fit(dialog, trigger, { getVars: true })!;
      gsap.set(dialog, target as gsap.TweenVars);
      const startState = Flip.getState(dialog);
      Flip.fit(dialog, layoutState);
      gsap.set(surface, { rotationY: 0, rotationZ: -2, transformPerspective: 1400 });
      timeline = gsap.timeline({ onReverseComplete: finishClose, onComplete: () => {
        delete dialog.dataset.transition;
        gsap.set(dialog, { clearProps: 'transform,width,height' });
      } });
      timeline.add(Flip.from(startState, { duration: .55, ease: 'power3.inOut' }), 0)
        .to(surface, { rotationY: 180, rotationZ: 0, duration: .55, ease: 'power2.inOut' }, 0)
        .to(dialog, { '--backdrop-alpha': .62, '--backdrop-blur': '4px', duration: .55, ease: 'power2.inOut' }, 0)
        .fromTo(surface, { boxShadow: '0 2px 6px rgb(0 0 0 / 4%)' }, { boxShadow: '0 5px 12px rgb(0 0 0 / 7%)', duration: .28, repeat: 1, yoyo: true }, 0);
    };
    trigger.addEventListener('click', open);
    dialog.querySelector('.feature-close')?.addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    });
    dialog.addEventListener('close', () => {
      timeline?.kill(); timeline = undefined;
      closing = false;
      delete dialog.dataset.transition;
      delete trigger.dataset.cardOpen;
      gsap.set([dialog, surface], { clearProps: 'transform,width,height,boxShadow,--backdrop-alpha,--backdrop-blur' });
      if (!document.querySelector('dialog.feature-dialog[open]')) delete root.dataset.dialogOpen;
      trigger.focus({ preventScroll: true });
    });
    const settle = () => {
      if (!dialog.open) return;
      if (closing) finishClose();
      else { timeline?.progress(1); timeline?.kill(); timeline = undefined; gsap.set(dialog, { clearProps: 'transform,width,height' }); gsap.set(surface, { rotationY: 180, rotationZ: 0 }); delete dialog.dataset.transition; }
    };
    window.addEventListener('resize', settle, { passive: true });
    reduced.addEventListener('change', settle);
  });
}
