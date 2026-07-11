const pool = require('../config/db');

const AUTHOR_FIELDS = `
  u.id AS author_id, u.username AS author_username,
  u.discord_id AS author_discord_id, u.avatar_hash AS author_avatar_hash
`;

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '🍿', '🎬', '👏'];

/**
 * Lists posts for the main feed (wallUserId = null) or a specific wall.
 * Includes comment count and per-emoji reaction breakdown.
 */
async function listPosts({ wallUserId = null, viewerId, limit = 30 }) {
  const wallClause = wallUserId === null ? 'p.wall_user_id IS NULL' : 'p.wall_user_id = ?';
  const params = wallUserId === null ? [] : [wallUserId];

  const [rows] = await pool.query(
    `SELECT p.id, p.body, p.media_url, p.created_at, p.wall_user_id, p.author_id, ${AUTHOR_FIELDS},
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE ${wallClause}
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [...params, limit]
  );

  const posts = rows.map(rowToPost);
  if (posts.length === 0) return posts;

  const postIds = posts.map((p) => p.id);
  const [comments, reactions] = await Promise.all([
    listCommentsForPosts(postIds),
    listReactionsForPosts(postIds, viewerId)
  ]);

  posts.forEach((p) => {
    p.comments = comments.filter((c) => c.postId === p.id);
    p.reactions = reactions[p.id] || [];
  });
  return posts;
}

async function listReactionsForPosts(postIds, viewerId) {
  if (postIds.length === 0) return {};
  const [rows] = await pool.query(
    `SELECT post_id, emoji, COUNT(*) AS count,
       SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS viewer_reacted
     FROM reactions
     WHERE post_id IN (?)
     GROUP BY post_id, emoji
     ORDER BY count DESC`,
    [viewerId || 0, postIds]
  );

  const byPost = {};
  rows.forEach((r) => {
    if (!byPost[r.post_id]) byPost[r.post_id] = [];
    byPost[r.post_id].push({
      emoji: r.emoji,
      count: Number(r.count),
      viewerReacted: Number(r.viewer_reacted) > 0
    });
  });
  return byPost;
}

async function getPost(postId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.body, p.media_url, p.created_at, p.wall_user_id, p.author_id, ${AUTHOR_FIELDS}
     FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
    [postId]
  );
  return rows[0] ? rowToPost(rows[0]) : null;
}

async function createPost({ authorId, wallUserId, body, mediaUrl }) {
  const [result] = await pool.query(
    'INSERT INTO posts (author_id, wall_user_id, body, media_url) VALUES (?, ?, ?, ?)',
    [authorId, wallUserId, body, mediaUrl || null]
  );
  return getPost(result.insertId);
}

async function deletePost(postId, requester) {
  const [rows] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [postId]);
  const post = rows[0];
  if (!post) return { ok: false, status: 404, error: 'Post not found.' };
  if (post.author_id !== requester.id && !requester.is_admin) {
    return { ok: false, status: 403, error: "You can't delete that." };
  }
  await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
  return { ok: true };
}

async function listCommentsForPosts(postIds) {
  if (postIds.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id, c.body, c.created_at, ${AUTHOR_FIELDS}
     FROM comments c JOIN users u ON u.id = c.author_id
     WHERE c.post_id IN (?)
     ORDER BY c.created_at ASC`,
    [postIds]
  );
  return rows.map(rowToComment);
}

async function createComment({ postId, authorId, body }) {
  const [result] = await pool.query(
    'INSERT INTO comments (post_id, author_id, body) VALUES (?, ?, ?)',
    [postId, authorId, body]
  );
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id, c.body, c.created_at, ${AUTHOR_FIELDS}
     FROM comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?`,
    [result.insertId]
  );
  return rowToComment(rows[0]);
}

/** Toggles a specific emoji reaction on/off for this user+post. Returns the post's full reaction breakdown. */
async function toggleReaction({ postId, userId, emoji }) {
  const useEmoji = REACTION_EMOJIS.includes(emoji) ? emoji : REACTION_EMOJIS[0];

  const [existing] = await pool.query(
    'SELECT id FROM reactions WHERE post_id = ? AND user_id = ? AND emoji = ?',
    [postId, userId, useEmoji]
  );

  if (existing[0]) {
    await pool.query('DELETE FROM reactions WHERE id = ?', [existing[0].id]);
  } else {
    await pool.query('INSERT INTO reactions (post_id, user_id, emoji) VALUES (?, ?, ?)', [
      postId,
      userId,
      useEmoji
    ]);
  }

  const reactions = await listReactionsForPosts([postId], userId);
  return { reactions: reactions[postId] || [] };
}

function rowToPost(row) {
  return {
    id: row.id,
    body: row.body,
    mediaUrl: row.media_url,
    createdAt: row.created_at,
    wallUserId: row.wall_user_id,
    author: {
      id: row.author_id,
      username: row.author_username,
      discordId: row.author_discord_id,
      avatarHash: row.author_avatar_hash
    },
    commentCount: Number(row.comment_count || 0),
    reactions: [],
    comments: []
  };
}

function rowToComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      username: row.author_username,
      discordId: row.author_discord_id,
      avatarHash: row.author_avatar_hash
    }
  };
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  deletePost,
  createComment,
  toggleReaction,
  REACTION_EMOJIS
};
