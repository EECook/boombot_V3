const pool = require('../config/db');

const AUTHOR_FIELDS = `
  u.id AS author_id, u.username AS author_username,
  u.discord_id AS author_discord_id, u.avatar_hash AS author_avatar_hash
`;

/**
 * Lists posts for the main feed (wallUserId = null) or a specific wall.
 * Includes comment count, reaction count, and whether `viewerId` reacted.
 */
async function listPosts({ wallUserId = null, viewerId, limit = 30 }) {
  const wallClause = wallUserId === null ? 'p.wall_user_id IS NULL' : 'p.wall_user_id = ?';
  const params = wallUserId === null ? [] : [wallUserId];

  const [rows] = await pool.query(
    `SELECT p.id, p.body, p.created_at, p.wall_user_id, ${AUTHOR_FIELDS},
       (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
       (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reaction_count,
       (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS viewer_reacted
     FROM posts p
     JOIN users u ON u.id = p.author_id
     WHERE ${wallClause}
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [viewerId, ...params, limit]
  );

  const posts = rows.map(rowToPost);
  if (posts.length === 0) return posts;

  const comments = await listCommentsForPosts(posts.map((p) => p.id));
  posts.forEach((p) => {
    p.comments = comments.filter((c) => c.postId === p.id);
  });
  return posts;
}

async function getPost(postId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.body, p.created_at, p.wall_user_id, ${AUTHOR_FIELDS}
     FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
    [postId]
  );
  return rows[0] ? rowToPost(rows[0]) : null;
}

async function createPost({ authorId, wallUserId, body }) {
  const [result] = await pool.query(
    'INSERT INTO posts (author_id, wall_user_id, body) VALUES (?, ?, ?)',
    [authorId, wallUserId, body]
  );
  return getPost(result.insertId);
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

/** Toggles a heart reaction on/off for this user+post. Returns { reacted, count }. */
async function toggleReaction({ postId, userId }) {
  const [existing] = await pool.query(
    'SELECT id FROM reactions WHERE post_id = ? AND user_id = ?',
    [postId, userId]
  );

  if (existing[0]) {
    await pool.query('DELETE FROM reactions WHERE id = ?', [existing[0].id]);
  } else {
    await pool.query('INSERT INTO reactions (post_id, user_id, emoji) VALUES (?, ?, ?)', [
      postId,
      userId,
      '❤️'
    ]);
  }

  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM reactions WHERE post_id = ?',
    [postId]
  );
  return { reacted: !existing[0], count };
}

function rowToPost(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    wallUserId: row.wall_user_id,
    author: {
      id: row.author_id,
      username: row.author_username,
      discordId: row.author_discord_id,
      avatarHash: row.author_avatar_hash
    },
    commentCount: Number(row.comment_count || 0),
    reactionCount: Number(row.reaction_count || 0),
    viewerReacted: Number(row.viewer_reacted || 0) > 0,
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

module.exports = { listPosts, getPost, createPost, createComment, toggleReaction };
