(function () {
  const rows = document.getElementById('social-links-rows');
  const addBtn = document.getElementById('add-link-btn');
  if (!rows || !addBtn) return;

  function makeRow() {
    const row = document.createElement('div');
    row.className = 'link-row';
    row.innerHTML = `
      <input type="text" name="linkPlatform" placeholder="Platform (e.g. Instagram)" maxlength="32" />
      <input type="url" name="linkUrl" placeholder="https://..." maxlength="512" />
      <button type="button" class="link-remove-btn" aria-label="Remove">&times;</button>
    `;
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
        // Keep at least one row, just clear it
        const inputs = e.target.closest('.link-row').querySelectorAll('input');
        inputs.forEach((i) => (i.value = ''));
      }
    }
  });
})();
