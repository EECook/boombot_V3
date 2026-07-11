(function () {
  const container = document.getElementById('quick-live-toggle');
  const btn = document.getElementById('quick-live-btn');
  const label = document.getElementById('quick-live-label');
  const urlInput = document.getElementById('quick-live-url');
  if (!container || !btn || !urlInput) return;

  let live = container.dataset.live === 'true';

  btn.addEventListener('click', async () => {
    const goingLive = !live;

    if (goingLive) {
      urlInput.style.display = '';
      if (!urlInput.value.trim()) {
        urlInput.focus();
        // First click just reveals the URL field; second click actually submits.
        if (!btn.dataset.primed) {
          btn.dataset.primed = 'true';
          return;
        }
      }
    }

    btn.disabled = true;
    try {
      const res = await fetch('/profile/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLive: goingLive, liveUrl: urlInput.value.trim() })
      });
      if (!res.ok) throw new Error('failed');

      live = goingLive;
      container.dataset.live = String(live);
      btn.classList.toggle('is-live', live);
      label.textContent = live ? 'End Stream' : 'Go Live';
      urlInput.style.display = live ? '' : 'none';
      delete btn.dataset.primed;
    } catch (e) {
      alert("Couldn't update your live status - try again.");
    }
    btn.disabled = false;
  });
})();
