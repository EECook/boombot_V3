(function () {
  const postList = document.getElementById('feed-post-list');
  const composer = document.getElementById('feed-composer');
  const context = window.BOOMBOT_CONTEXT || { wallUserId: null, authenticated: false, userId: null, isAdmin: false };
  if (!postList) return;

  // Keep in sync with REACTION_EMOJIS in src/models/posts.js
  const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '🍿', '🎬', '👏'];

  const socket = window.__boombotSocket || null;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function removeEmptyState() {
    const empty = postList.querySelector('.feed-empty');
    if (empty) empty.remove();
  }

  // ---------- Relative timestamps ----------
  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString();
  }
  function refreshTimestamps() {
    postList.querySelectorAll('.post-time[data-iso]').forEach((el) => {
      el.textContent = timeAgo(el.dataset.iso);
    });
  }
  refreshTimestamps();
  setInterval(refreshTimestamps, 30000);

  // ---------- Rendering helpers ----------
  function reactionPillsHtml(post) {
    const pills = (post.reactions || [])
      .map(
        (r) => `
        <button class="reaction-pill ${r.viewerReacted ? 'active' : ''}" data-post-id="${post.id}" data-emoji="${r.emoji}">
          <span>${r.emoji}</span><span class="reaction-count">${r.count}</span>
        </button>`
      )
      .join('');
    const addBtn = context.authenticated
      ? `<button class="reaction-add-btn" data-post-id="${post.id}" aria-label="Add reaction">+</button>`
      : '';
    return pills + addBtn;
  }

  function postCardHtml(post) {
    const canDelete = context.authenticated && (context.userId === post.author.id || context.isAdmin);
    const deleteBtn = canDelete
      ? `<button class="post-delete-btn" data-post-id="${post.id}" aria-label="Delete post" title="Delete post">&times;</button>`
      : '';
    const mediaHtml = post.mediaUrl
      ? `<img src="${escapeHtml(post.mediaUrl)}" alt="" class="post-media" loading="lazy" />`
      : '';

    const commentToggle = context.authenticated
      ? `<button class="comment-toggle-btn" data-post-id="${post.id}">0 comments</button>`
      : `<a href="/signin" class="comment-toggle-btn">0 comments</a>`;

    const commentArea = context.authenticated
      ? `
        <form class="comment-form" data-post-id="${post.id}">
          <input type="text" name="body" placeholder="Write a comment&hellip;" maxlength="1000" required />
          <button type="submit" class="btn btn-ticket btn-small">Post</button>
        </form>
      `
      : `<a href="/signin" class="signin-prompt">Sign in to join the conversation</a>`;

    return `
      <article class="post-card" data-post-id="${post.id}">
        <div class="post-perf" aria-hidden="true"></div>
        <div class="post-head">
          <img src="${escapeHtml(post.author.avatarUrl)}" alt="" class="post-avatar" />
          <div>
            <a href="/profile/${escapeHtml(post.author.discordId)}" class="post-author">${escapeHtml(post.author.username)}</a>
            <time class="post-time" data-iso="${post.createdAt}">just now</time>
          </div>
          ${deleteBtn}
        </div>
        <p class="post-body">${escapeHtml(post.body)}</p>
        ${mediaHtml}
        <div class="post-actions">
          <div class="reaction-row" data-post-id="${post.id}">${reactionPillsHtml(post)}</div>
          ${commentToggle}
        </div>
        <div class="post-comments ${context.authenticated ? '' : 'open'}">
          <div class="comment-list"></div>
          ${commentArea}
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

  function closeReactionPicker() {
    const open = document.querySelector('.reaction-picker');
    if (open) open.remove();
  }

  function openReactionPicker(anchorBtn, postId) {
    closeReactionPicker();
    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    picker.innerHTML = REACTION_EMOJIS.map((e) => `<button type="button" data-emoji="${e}">${e}</button>`).join('');
    anchorBtn.parentElement.style.position = 'relative';
    anchorBtn.parentElement.appendChild(picker);

    picker.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-emoji]');
      if (!btn) return;
      closeReactionPicker();
      await sendReaction(postId, btn.dataset.emoji);
    });
  }

  async function sendReaction(postId, emoji) {
    await fetch(`/api/posts/${postId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji })
    }).catch(() => null);
  }

  // ---------- Composer ----------
  if (composer) {
    composer.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textarea = composer.querySelector('textarea');
      const mediaInput = composer.querySelector('input[name="mediaUrl"]');
      const body = textarea.value.trim();
      const mediaUrl = mediaInput ? mediaInput.value.trim() : '';
      if (!body && !mediaUrl) return;

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, mediaUrl, wallUserId: context.wallUserId })
      }).catch(() => null);

      if (res && res.ok) {
        textarea.value = '';
        if (mediaInput) mediaInput.value = '';
      } else {
        alert("Couldn't post that - try again in a moment.");
      }
    });
  }

  // ---------- Click delegation: reactions, picker, comment toggle, delete ----------
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.reaction-picker') && !e.target.closest('.reaction-add-btn')) {
      closeReactionPicker();
    }
  });

  postList.addEventListener('click', async (e) => {
    const pill = e.target.closest('.reaction-pill');
    if (pill) {
      pill.classList.toggle('active');
      await sendReaction(pill.dataset.postId, pill.dataset.emoji);
      return;
    }

    const addBtn = e.target.closest('.reaction-add-btn');
    if (addBtn) {
      openReactionPicker(addBtn, addBtn.dataset.postId);
      return;
    }

    const commentToggle = e.target.closest('.comment-toggle-btn');
    if (commentToggle) {
      const card = commentToggle.closest('.post-card');
      card.querySelector('.post-comments').classList.toggle('open');
      return;
    }

    const deleteBtn = e.target.closest('.post-delete-btn');
    if (deleteBtn) {
      if (!confirm('Delete this post?')) return;
      const postId = deleteBtn.dataset.postId;
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' }).catch(() => null);
      if (res && res.ok) {
        const card = postList.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (card) card.remove();
      } else {
        alert("Couldn't delete that post.");
      }
    }
  });

  // ---------- Comment submit ----------
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
      refreshTimestamps();
    });

    socket.on('post:deleted', ({ id }) => {
      const card = postList.querySelector(`.post-card[data-post-id="${id}"]`);
      if (card) card.remove();
    });

    socket.on('comment:new', (comment) => {
      const card = postList.querySelector(`.post-card[data-post-id="${comment.postId}"]`);
      if (!card) return;
      card.querySelector('.comment-list').insertAdjacentHTML('beforeend', commentHtml(comment));
      const toggleBtn = card.querySelector('.comment-toggle-btn');
      const count = card.querySelectorAll('.comment-list .comment').length;
      toggleBtn.textContent = `${count} comment${count === 1 ? '' : 's'}`;
    });

    socket.on('reaction:update', ({ postId, reactions }) => {
      const row = postList.querySelector(`.reaction-row[data-post-id="${postId}"]`);
      if (!row) return;
      // Preserve this browser's own "active" state per emoji (the broadcast doesn't know who's asking)
      const activeEmojis = new Set(
        Array.from(row.querySelectorAll('.reaction-pill.active')).map((b) => b.dataset.emoji)
      );
      const post = { id: postId, reactions: reactions.map((r) => ({ ...r, viewerReacted: activeEmojis.has(r.emoji) })) };
      row.innerHTML = reactionPillsHtml(post);
    });
  }
})();
