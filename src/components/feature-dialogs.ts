import {gsap} from 'gsap';
import {Flip} from 'gsap/Flip';

gsap.registerPlugin(Flip);

export function enhanceFeatureDialogs() {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const openingDuration = .34;
  const closingDuration = .28;
  document.querySelectorAll<HTMLDialogElement>('dialog.feature-dialog').forEach(dialog => {
    dialog.dataset.cardEnhanced = '';
    const trigger = document.querySelector<HTMLElement>('[aria-controls="' + dialog.id + '"]')!;
    const card = trigger.closest<HTMLElement>('.feature')!;
    const surface = document.createElement('div');
    surface.className = 'card-turn-surface';
    const back = document.createElement('div');
    back.className = 'card-turn-back';
    const content = document.createElement('div');
    content.className = 'card-turn-content';
    content.append(...dialog.childNodes);
    back.append(content);
    const front = document.createElement('div');
    front.className = 'card-turn-front';
    front.setAttribute('aria-hidden', 'true');
    front.inert = true;
    surface.append(front, back);
    dialog.append(surface);
    let timeline: gsap.core.Timeline | undefined;
    let closing = false;
    let opening = false;
    let openWidth = 0;
    let openHeight = 0;

    const lockContent = () => {
      const bounds = back.getBoundingClientRect();
      // The faces clip a fixed content layout during the turn, rather than
      // repeatedly wrapping text as the outer card changes size.
      gsap.set(content, { width: bounds.width - 2, height: bounds.height - 2 });
    };
    const finishOpen = () => {
      opening = false;
      delete dialog.dataset.transition;
      // Keep the dialog at the exact size used as the Flip destination. Letting
      // its contents recalculate immediately here caused a visible snap.
      gsap.set(dialog, { clearProps: 'transform', width: openWidth, height: openHeight });
      gsap.set(content, { clearProps: 'width,height' });
    };
    const finishClose = () => {
      timeline?.kill();
      timeline = undefined;
      // Restore the real card in the same task that removes the dialog from
      // the top layer. The native `close` event is queued, so deferring this
      // until that event briefly exposes the dashed placeholder.
      card.dataset.cardReturning = '';
      delete trigger.dataset.cardOpen;
      delete card.dataset.cardOpen;
      if (card.matches(':hover')) {
        card.addEventListener('pointerleave', () => delete card.dataset.cardReturning, { once: true });
      } else {
        requestAnimationFrame(() => delete card.dataset.cardReturning);
      }
      if (!document.querySelector('dialog.feature-dialog[open]')) {
        delete root.dataset.dialogOpen;
        root.style.removeProperty('--dialog-scrollbar-gap');
      }
      dialog.close();
    };
    const close = () => {
      if (!dialog.open || closing) return;
      closing = true;
      if (reduced.matches) { finishClose(); return; }
      if (opening && timeline) {
        dialog.dataset.transition = 'closing';
        timeline.timeScale(openingDuration / closingDuration).reverse();
        return;
      }
      timeline?.kill();
      const bounds = dialog.getBoundingClientRect();
      lockContent();
      gsap.set(dialog, { width: bounds.width, height: bounds.height });
      dialog.dataset.transition = 'closing';
      const target = Flip.fit(dialog, card, { getVars: true, scale: false })!;
      timeline = gsap.timeline({ onComplete: finishClose });
      timeline.to(dialog, { ...target, duration: closingDuration, ease: 'power2.inOut' }, 0)
        .to(surface, { rotationY: 0, rotationZ: 0, borderRadius: getComputedStyle(card).borderRadius, duration: closingDuration, ease: 'power2.inOut' }, 0)
        .to(dialog, { '--backdrop-alpha': 0, '--backdrop-blur': '0px', duration: closingDuration, ease: 'power2.inOut' }, 0);
    };
    const open = (event: Event) => {
      event.preventDefault();
      if (dialog.open) return;
      closing = false;
      opening = false;
      delete card.dataset.cardReturning;
      const bounds = card.getBoundingClientRect();
      const cardRadius = getComputedStyle(card).borderRadius;
      const copy = trigger.cloneNode(true) as HTMLElement;
      ['id', 'aria-controls', 'href', 'aria-haspopup'].forEach(name => copy.removeAttribute(name));
      copy.className = 'card-face-summary';
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      gsap.set(copy, { width: bounds.width - 2, height: bounds.height - 2 });
      front.replaceChildren(copy);
      root.style.setProperty('--dialog-scrollbar-gap', Math.max(0, innerWidth - root.clientWidth) + 'px');
      root.dataset.dialogOpen = '';
      trigger.dataset.cardOpen = '';
      card.dataset.cardOpen = '';
      gsap.set(dialog, { '--backdrop-alpha': reduced.matches ? .62 : 0, '--backdrop-blur': reduced.matches ? '4px' : '0px' });
      dialog.showModal();
      dialog.querySelector<HTMLElement>('.feature-close')?.focus({ preventScroll: true });
      if (reduced.matches) { gsap.set(surface, { rotationY: 180 }); return; }
      const modalBounds = dialog.getBoundingClientRect();
      openWidth = modalBounds.width;
      openHeight = modalBounds.height;
      gsap.set(dialog, { width: openWidth, height: openHeight });
      lockContent();
      const layoutState = Flip.getState(dialog);
      dialog.dataset.transition = 'opening';
      const target = Flip.fit(dialog, card, { getVars: true, scale: false })!;
      gsap.set(dialog, target as gsap.TweenVars);
      const startState = Flip.getState(dialog);
      Flip.fit(dialog, layoutState, { scale: false });
      gsap.set(surface, { rotationY: 0, rotationZ: 0, transformPerspective: 1400, borderRadius: cardRadius });
      opening = true;
      timeline = gsap.timeline({ onReverseComplete: finishClose, onComplete: finishOpen });
      timeline.add(Flip.from(startState, { duration: openingDuration, ease: 'power2.inOut', scale: false }), 0)
        .to(surface, { rotationY: 180, borderRadius: getComputedStyle(dialog).borderRadius, duration: openingDuration, ease: 'power2.inOut' }, 0)
        .to(dialog, { '--backdrop-alpha': .62, '--backdrop-blur': '4px', duration: openingDuration, ease: 'power2.inOut' }, 0);
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
      closing = false; opening = false;
      delete dialog.dataset.transition;
      delete trigger.dataset.cardOpen;
      delete card.dataset.cardOpen;
      gsap.set([dialog, surface], { clearProps: 'transform,width,height,borderRadius,--backdrop-alpha,--backdrop-blur' });
      gsap.set(content, { clearProps: 'width,height' });
      if (!document.querySelector('dialog.feature-dialog[open]')) {
        delete root.dataset.dialogOpen;
        root.style.removeProperty('--dialog-scrollbar-gap');
      }
      trigger.focus({ preventScroll: true });
    });
    const settle = () => {
      if (!dialog.open) return;
      if (closing) finishClose();
      else {
        timeline?.progress(1); timeline?.kill(); timeline = undefined;
        finishOpen();
        gsap.set(surface, { rotationY: 180, rotationZ: 0 });
      }
    };
    window.addEventListener('resize', settle, { passive: true });
    reduced.addEventListener('change', settle);
  });
}
