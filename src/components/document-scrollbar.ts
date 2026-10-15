import { gsap } from 'gsap';

// Keep the document as the scroll surface so wheel, touch, anchors, and keyboard
// navigation stay native. The overlay only replaces the document's gutter.
export function enhanceDocumentScrollbar() {
  const root = document.documentElement;
  const phoneLayout = window.matchMedia('(max-width: 700px)');
  root.dataset.scrollbarStyle ??= 'custom';
  const track = document.querySelector<HTMLElement>('.document-scrollbar') ?? document.createElement('div');
  const thumb = track.querySelector<HTMLElement>('.document-scrollbar-thumb') ?? document.createElement('div');
  track.className = 'document-scrollbar';
  track.setAttribute('aria-hidden', 'true');
  thumb.className = 'document-scrollbar-thumb';
  if (!thumb.parentElement) track.append(thumb);
  if (!track.parentElement) document.body.append(track);
  root.dataset.scrollbarReady = '';

  let frame = 0;
  let dragging = false;
  let pointerId = 0;
  let dragOffset = 0;
  let scrollRange = 0;
  let travel = 0;
  let trackTop = 0;
  let thumbHeight = 0;
  let scrollTimer: ReturnType<typeof setTimeout>;
  let homeScrollbarRevealTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let elasticTimer: ReturnType<typeof setTimeout> | undefined;
  let viewportTimer: ReturnType<typeof setTimeout> | undefined;
  let viewportChanging = false;
  let viewportSettling = false;
  let sizeTween: gsap.core.Tween | undefined;
  let elasticTween: gsap.core.Tween | undefined;
  const elastic = {amount: 0};
  let elasticTarget = 0;
  let elasticEdge: 'top' | 'bottom' | undefined;
  let targetHeight = -1;
  let targetWidth = -1;
  const dimensions = {height:160,width:18};
  let outsideWindow = false;
  let pointerX = 0, pointerY = 0;
  let graceBounds: DOMRect | undefined;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cancelClose = () => { clearTimeout(closeTimer); closeTimer = undefined; delete track.dataset.pendingClose; graceBounds = undefined; };
  const beginClose = () => {
    if (closeTimer || dragging || !track.hasAttribute('data-open')) return;
    graceBounds = track.getBoundingClientRect();
    track.dataset.pendingClose = '';
    closeTimer = setTimeout(() => { cancelClose(); delete track.dataset.open; update(); }, 350);
    update();
  };
  const releaseEdgeOverscroll = () => {
    clearTimeout(elasticTimer);
    elasticTimer = undefined;
    elasticTween?.kill();
    elasticTarget = 0;
    if (elastic.amount === 0) return;
    if (reduced.matches) {
      elastic.amount = 0;
      elasticEdge = undefined;
      delete track.dataset.elastic;
      schedule();
      return;
    }
    elasticTween = gsap.to(elastic, {
      amount: 0,
      duration: .86,
      ease: 'elastic.out(1, 0.72)',
      onUpdate: schedule,
      onComplete: () => {
        elasticTween = undefined;
        elasticEdge = undefined;
        delete track.dataset.elastic;
        schedule();
      },
    });
  };
  const pullAtEdge = (distance: number) => {
    const surface = document.scrollingElement;
    if (!surface || reduced.matches || distance === 0) return;
    const range = Math.max(0, surface.scrollHeight - surface.clientHeight);
    const atBottom = distance > 0 && surface.scrollTop >= range - 1;
    const atTop = distance < 0 && surface.scrollTop <= 1;
    if (!atBottom && !atTop) return;
    const edge = atBottom ? 'bottom' : 'top';
    clearTimeout(elasticTimer);
    elasticTween?.kill();
    elasticTween = undefined;
    if (elasticEdge !== edge) {
      elastic.amount = 0;
      elasticTarget = 0;
    }
    elasticEdge = edge;
    elasticTarget = Math.min(240, Math.max(elasticTarget, elastic.amount) + Math.min(Math.abs(distance), 120) * .35);
    track.dataset.elastic = edge;
    elasticTween = gsap.to(elastic, {
      amount: elasticTarget,
      duration: .14,
      ease: 'power2.out',
      onUpdate: schedule,
    });
    elasticTimer = setTimeout(releaseEdgeOverscroll, 120);
  };

  const update = () => {
    frame = 0;
    const surface = document.scrollingElement;
    const viewport = window.visualViewport;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const unavailable = phoneLayout.matches || viewportHeight < 140 || viewportWidth < 240;
    root.toggleAttribute('data-scrollbar-unavailable', unavailable);
    const enabled = root.dataset.scrollbarStyle !== 'native' && !unavailable && !root.hasAttribute('data-dialog-open');
    track.hidden = !enabled;
    if (!surface || !enabled) {
      cancelClose();
      sizeTween?.kill(); targetHeight = -1; targetWidth = -1;
      endDrag();
      delete track.dataset.open;
      delete track.dataset.visible;
      return;
    }
    const expanded = track.hasAttribute('data-open') || dragging;
    const trackHeight = Math.min(expanded ? 560 : 160, viewportHeight * (expanded ? .65 : .22));
    const trackWidth = expanded ? 24 : 18;
    const expansionChanged = targetWidth < 0 || (targetWidth === 24) !== expanded;
    if ((!viewportChanging || expansionChanged) && (trackHeight !== targetHeight || trackWidth !== targetWidth)) {
      const immediate = (!viewportSettling && targetHeight < 0) || dragging || reduced.matches || track.hasAttribute('data-resizing');
      targetHeight = trackHeight; targetWidth = trackWidth;
      sizeTween?.kill();
      const render = () => {
        track.style.height = dimensions.height+'px'; track.style.width = dimensions.width+'px';
        track.style.borderRadius = Math.min(12, dimensions.width/2)+'px'; measure();
      };
      if (immediate) { dimensions.height = trackHeight; dimensions.width = trackWidth; render(); }
      else {
        sizeTween = gsap.to(dimensions, {
          height: trackHeight, width: trackWidth,
          duration: expanded ? (viewportSettling ? .52 : .62) : .46,
          ease: expanded ? 'elastic.out(1, 0.62)' : 'power3.out',
          onUpdate: render, onComplete: render,
        });
      }
    }
    track.style.top = `${(viewport?.offsetTop ?? 0) + viewportHeight / 2}px`;
    // Anchor the right edge so expansion grows inward without shifting the gutter.
    track.style.left = `${(viewport?.offsetLeft ?? 0) + viewportWidth - 8}px`;
    track.style.right = 'auto';
    measure();
  };
  const measure = () => {
    const surface = document.scrollingElement;
    if (!surface || track.hidden) return;
    const style = getComputedStyle(track);
    const padding = parseFloat(style.paddingTop);
    const height = Math.max(0, track.clientHeight - padding - parseFloat(style.paddingBottom));
    scrollRange = Math.max(0, surface.scrollHeight - surface.clientHeight);
    const visible = scrollRange > 8;
    if (!visible) track.removeAttribute('data-visible');
    else if (!track.hasAttribute('data-visible')) {
      const shouldFadeHomeScrollbar = root.hasAttribute('data-home-scrollbar-fade');
      track.setAttribute('data-visible', '');
      if (shouldFadeHomeScrollbar) {
        homeScrollbarRevealTimer = setTimeout(() => {
          homeScrollbarRevealTimer = undefined;
          if (!root.hasAttribute('data-home-scrollbar-fade') || !track.hasAttribute('data-visible') || track.hidden) return;
          track.style.transition = 'none';
          track.style.opacity = '0';
          track.style.visibility = 'visible';
          root.removeAttribute('data-home-scrollbar-fade');
          const fade = track.animate([{ opacity: 0 }, { opacity: 0.9 }], {
            duration: 700,
            easing: 'ease-out',
          });
          fade.onfinish = () => {
            fade.cancel();
            track.style.removeProperty('opacity');
            track.style.removeProperty('visibility');
            track.style.removeProperty('transition');
          };
        }, 650);
      }
    }
    // Leave visible travel even when a page is only slightly longer than the viewport.
    thumbHeight = Math.min(height * .65, Math.max(32, height * surface.clientHeight / surface.scrollHeight));
    travel = Math.max(0, height - thumbHeight);
    trackTop = track.getBoundingClientRect().top + track.clientTop + padding;
    const compression = Math.max(-.045, Math.min(.34, elastic.amount / 160 * .34));
    const position = scrollRange ? Math.min(1, Math.max(0, surface.scrollTop / scrollRange)) * travel : 0;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${position}px) scaleX(${1 + compression * .55}) scaleY(${1 - compression})`;
    if (elasticEdge) {
      const horizontalRadius = thumb.offsetWidth / 2;
      const verticalRadius = Math.min(thumbHeight / 2,
        horizontalRadius * (1 + compression * .55) / Math.max(.5, 1 - compression));
      thumb.style.borderRadius = `${horizontalRadius}px / ${verticalRadius}px`;
    } else {
      thumb.style.removeProperty('border-radius');
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const move = (event: PointerEvent) => {
    if (!dragging || !travel) return;
    const fraction = Math.min(1, Math.max(0, (event.clientY - trackTop - dragOffset) / travel));
    window.scrollTo({ top: fraction * scrollRange, behavior: 'instant' });
  };
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    delete track.dataset.dragging;
    delete root.dataset.scrollbarDragging;
    if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
    const bounds = track.getBoundingClientRect();
    if (outsideWindow) beginClose();
    else if (pointerX < bounds.left - 12 || pointerX > bounds.right + 12 || pointerY < bounds.top - 12 || pointerY > bounds.bottom + 12) beginClose();
    schedule();
  };

  track.addEventListener('pointerenter', event => { outsideWindow = false; pointerX = event.clientX; pointerY = event.clientY; cancelClose(); track.dataset.open = ''; update(); });
  document.addEventListener('pointermove', event => {
    pointerX = event.clientX; pointerY = event.clientY;
    if (!track.hasAttribute('data-open') || dragging) return;
    const bounds = graceBounds ?? track.getBoundingClientRect();
    const safeSpace = 12;
    const nearTrack = event.clientX >= bounds.left - safeSpace && event.clientX <= bounds.right + safeSpace &&
      event.clientY >= bounds.top - safeSpace && event.clientY <= bounds.bottom + safeSpace;
    if (!nearTrack) {
      beginClose();
    } else if (closeTimer) { cancelClose(); update(); }
  }, { passive: true });
  document.addEventListener('pointerleave', event => { if (!event.relatedTarget) { outsideWindow = true; beginClose(); } });
  window.addEventListener('blur', () => { outsideWindow = true; beginClose(); });
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0 || scrollRange <= 8) return;
    event.preventDefault();
    cancelClose();
    pointerX = event.clientX; pointerY = event.clientY;
    const bounds = thumb.getBoundingClientRect();
    const grab = event.target === thumb ? Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)) : .5;
    dragging = true;
    pointerId = event.pointerId;
    track.dataset.dragging = '';
    track.dataset.open = '';
    root.dataset.scrollbarDragging = '';
    update();
    dragOffset = grab * thumbHeight;
    track.setPointerCapture(pointerId);
    move(event);
  });
  track.addEventListener('pointermove', move);
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('scroll', () => {
    const surface = document.scrollingElement;
    if (surface) {
      const range = Math.max(0, surface.scrollHeight - surface.clientHeight);
      if ((elasticEdge === 'bottom' && surface.scrollTop < range - 1) ||
          (elasticEdge === 'top' && surface.scrollTop > 1)) releaseEdgeOverscroll();
    }
    track.dataset.scrolling = '';
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { delete track.dataset.scrolling; }, 700);
    schedule();
  }, { passive: true });
  window.addEventListener('wheel', event => pullAtEdge(event.deltaY), { passive: true });
  let touchY: number | undefined;
  window.addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY; }, { passive: true });
  window.addEventListener('touchmove', event => {
    const y = event.touches[0]?.clientY;
    if (y === undefined || touchY === undefined) return;
    pullAtEdge(touchY - y);
    touchY = y;
  }, { passive: true });
  window.addEventListener('touchend', () => { touchY = undefined; releaseEdgeOverscroll(); }, { passive: true });
  window.addEventListener('touchcancel', () => { touchY = undefined; releaseEdgeOverscroll(); }, { passive: true });
  const viewportChange = () => {
    // Ignore repeated size retargets during zoom, but let an open/close state
    // change animate immediately. Reconcile dimensions when the viewport settles.
    viewportChanging = true;
    graceBounds = undefined;
    releaseEdgeOverscroll();
    endDrag();
    update();
    clearTimeout(viewportTimer);
    viewportTimer = setTimeout(() => {
      viewportChanging = false;
      viewportTimer = undefined;
      // Retarget with one spring after zoom so interrupted dimensions settle
      // smoothly instead of snapping or replaying the two-stage close.
      sizeTween?.kill();
      targetHeight = targetWidth = -1;
      viewportSettling = true;
      update();
      viewportSettling = false;
    }, 120);
  };
  window.addEventListener('resize', viewportChange, { passive: true });
  window.visualViewport?.addEventListener('resize', viewportChange, { passive: true });
  window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
  phoneLayout.addEventListener('change', schedule);
  window.addEventListener('kalm-scrollbar-change', () => { endDrag(); cancelClose(); schedule(); });
  reduced.addEventListener('change', viewportChange);
  const resize = new ResizeObserver(schedule);
  resize.observe(root);
  resize.observe(document.body);
  // Update before paint so the thumb stays inside the track while it contracts.
  new ResizeObserver(update).observe(track);
  new MutationObserver(schedule).observe(root, {
    attributes: true, attributeFilter: ['data-scrollbar-style', 'data-dialog-open', 'data-theme'],
  });
  update();
}
