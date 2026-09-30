// Feature map panel: opens from an experience neuron, closes on ✕, Escape or
// a click on the backdrop. While it's open <html> carries data-panel-open, so
// the forward pass leaves scroll and keys alone; focus returns to the opener.

const CLOSE_MS = 180;

export function mountFeatureMap(dialog: HTMLDialogElement) {
  const sections = new Map(
    [...dialog.querySelectorAll<HTMLElement>('[data-fm]')].map((s) => [s.dataset.fm!, s]),
  );
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-fm-close]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let opener: HTMLElement | null = null;
  let closing = 0;

  function open(id: string, from: HTMLElement) {
    const section = sections.get(id);
    if (!section) return;
    clearTimeout(closing);
    opener = from;
    for (const [k, s] of sections) s.hidden = k !== id;
    dialog.setAttribute('aria-labelledby', `fm-${id}`);
    section.parentElement!.scrollTop = 0;
    document.documentElement.setAttribute('data-panel-open', '');
    if (!dialog.open) dialog.showModal();
    closeBtn.focus();
    // Next frame, so the transition runs from the closed state.
    requestAnimationFrame(() => dialog.setAttribute('data-open', ''));
  }

  function close() {
    if (!dialog.open) return;
    dialog.removeAttribute('data-open');
    clearTimeout(closing);
    closing = window.setTimeout(() => dialog.close(), reduced ? 0 : CLOSE_MS);
  }

  // Covers every way out, including a native close.
  dialog.addEventListener('close', () => {
    dialog.removeAttribute('data-open');
    document.documentElement.removeAttribute('data-panel-open');
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault(); // Escape: animate out instead of vanishing
    close();
  });
  closeBtn.addEventListener('click', close);
  // The dialog fills the viewport; a press that starts and ends outside the panel is a backdrop click.
  let downOnBackdrop = false;
  dialog.addEventListener('pointerdown', (e) => (downOnBackdrop = e.target === dialog));
  dialog.addEventListener('click', (e) => {
    if (downOnBackdrop && e.target === dialog) close();
    downOnBackdrop = false;
  });

  // Triggers: the title button (keyboard) and the rest of its neuron (pointer).
  document.querySelectorAll<HTMLButtonElement>('[data-feature]').forEach((btn) => {
    const neuron = btn.closest<HTMLElement>('[data-neuron]') ?? btn;
    neuron.addEventListener('click', (e) => {
      // Only the layer in view: an away layer's text is hidden.
      if ((e.target as Element).closest('a') || neuron.closest('[data-away]')) return;
      open(btn.dataset.feature!, btn);
    });
  });
}
