const pool = require('../config/db');
const { avatarUrl } = require('../config/discord');

/** Attaches req.user (and res.locals.user for views) if a session is active. */
async function loadUser(req, res, next) {
  if (!req.session.userId) {
    res.locals.user = null;
    return next();
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  const user = rows[0] || null;

  if (user) {
    user.avatarUrl = avatarUrl(user.discord_id, user.avatar_hash);
  }

  req.user = user;
  res.locals.user = user;
  next();
}

/** Blocks a route unless the visitor is signed in and still a guild member. */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.is_member) {
    return res.redirect('/signin');
  }
  next();
}

module.exports = { loadUser, requireAuth };
