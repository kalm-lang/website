import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
gsap.registerPlugin(InertiaPlugin);

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
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let sizeTween: gsap.core.Tween | undefined;
  let targetHeight = -1;
  let targetWidth = -1;
  const dimensions = {height:160,width:18};
  const velocity = InertiaPlugin.track(dimensions, 'height,width')[0];
  let outsideWindow = false;
  let pointerX = 0, pointerY = 0;
  let graceBounds: DOMRect | undefined;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cancelClose = () => { clearTimeout(closeTimer); closeTimer = undefined; delete track.dataset.pendingClose; graceBounds = undefined; };
  const collapse = () => {
    if (dragging) return;
    cancelClose(); delete track.dataset.open; update();
  };
  const beginClose = () => {
    if (closeTimer || dragging || !track.hasAttribute('data-open')) return;
    graceBounds = track.getBoundingClientRect();
    track.dataset.pendingClose = '';
    closeTimer = setTimeout(() => { cancelClose(); delete track.dataset.open; update(); }, 350);
    update();
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
    const pending = track.hasAttribute('data-pending-close');
    const factor = pending ? .96 : 1;
    const trackHeight = Math.min(expanded ? 560 : 160, viewportHeight * (expanded ? .65 : .22)) * factor;
    const trackWidth = (expanded ? 24 : 18) * factor;
    if (trackHeight !== targetHeight || trackWidth !== targetWidth) {
      const immediate = targetHeight < 0 || dragging || reduced.matches || track.hasAttribute('data-resizing');
      targetHeight = trackHeight; targetWidth = trackWidth;
      const velocityHeight = velocity.get('height');
      const velocityWidth = velocity.get('width');
      sizeTween?.kill();
      const render = () => {
        track.style.height = dimensions.height+'px'; track.style.width = dimensions.width+'px';
        track.style.borderRadius = Math.min(12, dimensions.width/2)+'px'; measure();
      };
      if (immediate) { dimensions.height = trackHeight; dimensions.width = trackWidth; render(); }
      else sizeTween = gsap.to(dimensions, {inertia: {
        height: {velocity:velocityHeight,end:trackHeight,min:Math.min(trackHeight,dimensions.height)-8,max:Math.min(viewportHeight-24,Math.max(trackHeight,dimensions.height)+12)},
        width: {velocity:velocityWidth,end:trackWidth,min:16,max:26},
        duration: pending ? .2 : .42,
      }, onUpdate:render});
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
    track.toggleAttribute('data-visible', scrollRange > 8);
    // Leave visible travel even when a page is only slightly longer than the viewport.
    thumbHeight = Math.min(height * .65, Math.max(32, height * surface.clientHeight / surface.scrollHeight));
    travel = Math.max(0, height - thumbHeight);
    trackTop = track.getBoundingClientRect().top + track.clientTop + padding;
    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${scrollRange ? Math.min(1, Math.max(0, surface.scrollTop / scrollRange)) * travel : 0}px)`;
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
    if (outsideWindow || pointerX >= bounds.right - 1) collapse();
    else if (pointerX < bounds.left - 12 || pointerX > bounds.right + 12 || pointerY < bounds.top - 12 || pointerY > bounds.bottom + 12) beginClose();
    schedule();
  };

  track.addEventListener('pointerenter', event => { outsideWindow = false; pointerX = event.clientX; pointerY = event.clientY; cancelClose(); track.dataset.open = ''; update(); });
  document.addEventListener('pointermove', event => {
    pointerX = event.clientX; pointerY = event.clientY;
    if (!track.hasAttribute('data-open') || dragging) return;
    const bounds = graceBounds ?? track.getBoundingClientRect();
    if (event.clientX >= bounds.right - 1) { collapse(); return; }
    const safeSpace = 12;
    const nearTrack = event.clientX >= bounds.left - safeSpace && event.clientX <= bounds.right + safeSpace &&
      event.clientY >= bounds.top - safeSpace && event.clientY <= bounds.bottom + safeSpace;
    if (!nearTrack) {
      beginClose();
    } else if (closeTimer) { cancelClose(); update(); }
  }, { passive: true });
  document.addEventListener('pointerleave', event => { if (!event.relatedTarget) { outsideWindow = true; collapse(); } });
  window.addEventListener('blur', () => { outsideWindow = true; collapse(); });
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
    track.dataset.scrolling = '';
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { delete track.dataset.scrolling; }, 700);
    schedule();
  }, { passive: true });
  const viewportChange = () => {
    // Zoom and viewport changes must fit immediately, even during expansion.
    track.dataset.resizing = '';
    cancelClose(); sizeTween?.kill(); targetHeight = -1; targetWidth = -1;
    endDrag();
    delete track.dataset.open;
    update();
    requestAnimationFrame(() => { delete track.dataset.resizing; });
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
