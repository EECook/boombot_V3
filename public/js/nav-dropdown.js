(function () {
  const menu = document.getElementById('user-menu');
  const trigger = document.getElementById('user-menu-trigger');
  const dropdown = document.getElementById('user-menu-dropdown');
  if (!menu || !trigger || !dropdown) return;

  function close() {
    dropdown.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }
  function open() {
    dropdown.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.contains('open') ? close() : open();
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();
