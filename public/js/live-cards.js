(function () {
  const socket = window.__boombotSocket;
  if (!socket) return;

  socket.on('profile:live', ({ discordId, isLive, liveUrl }) => {
    const card = document.querySelector(`.cast-card[data-discord-id="${discordId}"]`);
    if (!card) return; // person wasn't already showing on the cast grid - skip rather than fabricate a card

    card.classList.toggle('is-live', isLive);

    if (isLive && liveUrl) {
      card.href = liveUrl;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      if (!card.querySelector('.cast-live-badge')) {
        const badge = document.createElement('span');
        badge.className = 'cast-live-badge';
        badge.innerHTML = '&#9679; LIVE';
        card.prepend(badge);
      }
    } else {
      card.href = `/profile/${discordId}`;
      card.removeAttribute('target');
      card.removeAttribute('rel');
      const badge = card.querySelector('.cast-live-badge');
      if (badge) badge.remove();
    }
  });
})();
