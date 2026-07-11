(function () {
  const postList = document.getElementById('feed-post-list');
  const composer = document.getElementById('feed-composer');
  const context = window.BOOMBOT_CONTEXT || { wallUserId: null };
  if (!postList) return;

  const socket = window.io ? window.io() : null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function removeEmptyState() {
    const empty = postList.querySelector('.feed-empty');
    if (empty) empty.remove();
  }

  function postCardHtml(post) {
    return `
      <article class="post-card" data-post-id="${post.id}">
        <div class="post-head">
          <img src="${escapeHtml(post.author.avatarUrl)}" alt="" class="post-avatar" />
          <div>
            <a href="/profile/${escapeHtml(post.author.discordId)}" class="post-author">${escapeHtml(post.author.username)}</a>
            <time class="post-time">${new Date(post.createdAt).toLocaleString()}</time>
          </div>
        </div>
        <p class="post-body">${escapeHtml(post.body)}</p>
        <div class="post-actions">
          <button class="reaction-btn" data-post-id="${post.id}" aria-pressed="false">
            <span class="reaction-heart">&#10084;</span>
            <span class="reaction-count">0</span>
          </button>
          <button class="comment-toggle-btn" data-post-id="${post.id}">0 comments</button>
        </div>
        <div class="post-comments">
          <div class="comment-list"></div>
          <form class="comment-form" data-post-id="${post.id}">
            <input type="text" name="body" placeholder="Write a comment&hellip;" maxlength="1000" required />
            <button type="submit" class="btn btn-ticket btn-small">Post</button>
          </form>
        </div>
      </article>
    `;
  }

  function commentHtml(comment) {
    return `
      <div class="comment">
        <a href="/profile/${escapeHtml(comment.author.discordId)}" class="comment-author">${escapeHtml(comment.author.username)}</a>
        <span class="comment-body">${escapeHtml(comment.body)}</span>
      </div>
    `;
  }

  function belongsToThisView(wallUserId) {
    if (context.wallUserId === null) return wallUserId === null || wallUserId === undefined;
    return Number(wallUserId) === Number(context.wallUserId);
  }

  // ---------- Composer ----------
  if (composer) {
    composer.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = composer.querySelector('textarea');
      const body = textarea.value.trim();
      if (!body) return;

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, wallUserId: context.wallUserId })
      }).catch(() => null);

      if (res && res.ok) {
        textarea.value = '';
      } else {
        alert("Couldn't post that - try again in a moment.");
      }
    });
  }

  // ---------- Reactions + comment toggling (event delegation) ----------
  postList.addEventListener('click', async (e) => {
    const reactionBtn = e.target.closest('.reaction-btn');
    if (reactionBtn) {
      const postId = reactionBtn.dataset.postId;
      reactionBtn.classList.toggle('active');
      reactionBtn.setAttribute('aria-pressed', reactionBtn.classList.contains('active'));
      await fetch(`/api/posts/${postId}/reactions`, { method: 'POST' }).catch(() => null);
      return;
    }

    const commentToggle = e.target.closest('.comment-toggle-btn');
    if (commentToggle) {
      const card = commentToggle.closest('.post-card');
      card.querySelector('.post-comments').classList.toggle('open');
    }
  });

  // ---------- Comment submit (event delegation) ----------
  postList.addEventListener('submit', async (e) => {
    const form = e.target.closest('.comment-form');
    if (!form) return;
    e.preventDefault();

    const input = form.querySelector('input[name="body"]');
    const body = input.value.trim();
    if (!body) return;

    const postId = form.dataset.postId;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    }).catch(() => null);

    if (res && res.ok) {
      input.value = '';
    } else {
      alert("Couldn't post that comment - try again.");
    }
  });

  // ---------- Live updates ----------
  if (socket) {
    socket.on('post:new', (post) => {
      if (!belongsToThisView(post.wallUserId)) return;
      removeEmptyState();
      postList.insertAdjacentHTML('afterbegin', postCardHtml(post));
    });

    socket.on('comment:new', (comment) => {
      const card = postList.querySelector(`.post-card[data-post-id="${comment.postId}"]`);
      if (!card) return;
      card.querySelector('.comment-list').insertAdjacentHTML('beforeend', commentHtml(comment));
      const toggleBtn = card.querySelector('.comment-toggle-btn');
      const count = card.querySelectorAll('.comment-list .comment').length;
      toggleBtn.textContent = `${count} comment${count === 1 ? '' : 's'}`;
    });

    socket.on('reaction:update', ({ postId, count }) => {
      const card = postList.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (!card) return;
      card.querySelector('.reaction-count').textContent = count;
    });
  }
})();
