const pool = require('../config/db');

/** Creates the user if new, or updates their cached Discord info if they already exist. */
async function upsertUser({ discordId, username, discriminator, avatarHash, isAdmin }) {
  await pool.query(
    `INSERT INTO users (discord_id, username, discriminator, avatar_hash, is_admin, is_member, last_login_at)
     VALUES (?, ?, ?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE
       username = VALUES(username),
       discriminator = VALUES(discriminator),
       avatar_hash = VALUES(avatar_hash),
       is_admin = VALUES(is_admin),
       is_member = TRUE,
       last_login_at = NOW()`,
    [discordId, username, discriminator || null, avatarHash || null, !!isAdmin]
  );

  const [rows] = await pool.query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  return rows[0];
}

async function findByDiscordId(discordId) {
  const [rows] = await pool.query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  return rows[0] || null;
}

module.exports = { upsertUser, findByDiscordId };
