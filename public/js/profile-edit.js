// ---------- Go Live / End Stream toggle ----------
(function () {
  const btn = document.getElementById('live-toggle-btn');
  const label = document.getElementById('live-toggle-label');
  const hiddenInput = document.getElementById('isLive');
  const urlInput = document.getElementById('liveUrl');
  if (!btn || !hiddenInput || !urlInput) return;

  btn.addEventListener('click', () => {
    const goingLive = hiddenInput.value !== 'on';
    hiddenInput.value = goingLive ? 'on' : '';
    btn.classList.toggle('is-live', goingLive);
    label.textContent = goingLive ? 'End Stream' : 'Go Live';
    urlInput.style.display = goingLive ? '' : 'none';
    if (goingLive) urlInput.focus();
  });
})();

// ---------- Add/remove social link rows ----------
(function () {
  const rows = document.getElementById('social-links-rows');
  const addBtn = document.getElementById('add-link-btn');
  if (!rows || !addBtn) return;

  function makeRow() {
    const existingSelect = rows.querySelector('select[name="linkPlatform"]');
    const optionsHtml = existingSelect ? existingSelect.innerHTML : '';

    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <select name="linkPlatform">${optionsHtml}</select>
      <input type="url" name="linkUrl" placeholder="https://..." maxlength="512" />
      <button type="button" class="link-remove-btn" aria-label="Remove">&times;</button>
    `;
    row.querySelector('select').selectedIndex = 0;
    return row;
  }

  addBtn.addEventListener('click', () => {
    if (rows.children.length >= 8) return;
    rows.appendChild(makeRow());
  });

  rows.addEventListener('click', (e) => {
    if (e.target.classList.contains('link-remove-btn')) {
      if (rows.children.length > 1) {
        e.target.closest('.link-row').remove();
      } else {
        const row = e.target.closest('.link-row');
        row.querySelector('input').value = '';
        row.querySelector('select').selectedIndex = 0;
      }
    }
  });
})();
