(function () {
  const socket = window.__boombotSocket;
  if (!socket) return;

  const pageLabel = window.BOOMBOT_PAGE || document.title;

  function announce() {
    socket.emit('presence:hello', { page: pageLabel });
  }

  if (socket.connected) announce();
  socket.on('connect', announce);

  const list = document.getElementById('presence-list');
  const emptyState = document.getElementById('presence-empty');
  if (!list) return; // only the hub renders the panel; other pages just announce presence

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  const currentUserId = window.BOOMBOT_CONTEXT ? window.BOOMBOT_CONTEXT.userId : null;

  socket.on('presence:update', (users) => {
    if (!users.length) {
      list.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    list.innerHTML = users
      .map(
        (u) => `
        <a href="/profile/${escapeHtml(u.discordId)}" class="presence-row">
          <span class="presence-dot" aria-hidden="true"></span>
          <img src="${escapeHtml(u.avatarUrl)}" alt="" class="presence-avatar" />
          <span class="presence-info">
            <span class="presence-name">${escapeHtml(u.username)}${Number(u.userId) === Number(currentUserId) ? ' (you)' : ''}</span>
            <span class="presence-page">${escapeHtml(u.page)}</span>
          </span>
        </a>
      `
      )
      .join('');
  });
})();
