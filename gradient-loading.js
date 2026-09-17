/* Keep intermediate startup layouts offscreen until the initial scene is ready. */
(() => {
  const root = document.documentElement;
  root.classList.add('editor-starting');
  let finished = false;
  function reveal() {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    root.classList.remove('editor-starting');
    document.querySelector('.editor-loading')?.remove();
  }
  // A failed asset must never leave the workbench behind an endless loader.
  const fallback = setTimeout(reveal, 8000);
  document.addEventListener('DOMContentLoaded', async () => {
    if (finished) return;
    await Promise.allSettled([window.gradientFeaturedReady, window.gradientDeliveryReady]);
    await document.fonts.ready;
    // The template strip is refreshed 120ms after the final canvas render.
    await new Promise(resolve => setTimeout(resolve, 180));
    requestAnimationFrame(() => requestAnimationFrame(reveal));
  }, { once: true });
})();
