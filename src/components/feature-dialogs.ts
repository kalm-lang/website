export function enhanceFeatureDialogs() {
  const triggers = new WeakMap<HTMLDialogElement, HTMLElement>();

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest<HTMLElement>('.feature-trigger');
    const dialogId = trigger?.getAttribute('aria-controls');
    const dialog = dialogId ? document.getElementById(dialogId) : null;
    if (trigger && dialog instanceof HTMLDialogElement && typeof dialog.showModal === 'function') {
      event.preventDefault();
      triggers.set(dialog, trigger);
      dialog.showModal();
      dialog.querySelector<HTMLElement>('.feature-close')?.focus({ preventScroll: true });
      return;
    }

    const close = target.closest<HTMLElement>('.feature-close');
    const parentDialog = close?.closest('dialog.feature-dialog');
    if (parentDialog instanceof HTMLDialogElement && parentDialog.open) parentDialog.close();
  });

  document.addEventListener('click', event => {
    if (event.target instanceof HTMLDialogElement && event.target.matches('.feature-dialog')) {
      event.target.close();
    }
  });

  document.querySelectorAll<HTMLDialogElement>('dialog.feature-dialog').forEach(dialog => {
    dialog.addEventListener('close', () => triggers.get(dialog)?.focus({ preventScroll: true }));
  });
}
