const pool = require('../config/db');

async function getProfileByUserId(userId) {
  const [rows] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  if (rows[0]) return rows[0];

  // Lazily create an empty profile row on first visit rather than requiring
  // a separate onboarding step.
  await pool.query('INSERT IGNORE INTO profiles (user_id) VALUES (?)', [userId]);
  const [created] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
  return created[0];
}

async function updateProfile(userId, { age, pronouns, birthday, timezone, bio, customAvatarUrl, isLive, liveUrl }) {
  await pool.query(
    `INSERT INTO profiles (user_id, age, pronouns, birthday, timezone, bio, custom_avatar_url, is_live, live_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       age = VALUES(age), pronouns = VALUES(pronouns), birthday = VALUES(birthday),
       timezone = VALUES(timezone), bio = VALUES(bio), custom_avatar_url = VALUES(custom_avatar_url),
       is_live = VALUES(is_live), live_url = VALUES(live_url)`,
    [
      userId,
      age || null,
      pronouns || null,
      birthday || null,
      timezone || null,
      bio || null,
      customAvatarUrl || null,
      !!isLive,
      isLive ? (liveUrl || null) : null
    ]
  );
}

/** Updates only is_live/live_url - won't clobber other profile fields, unlike a full save. */
async function setLiveStatus(userId, isLive, liveUrl) {
  await pool.query(
    `INSERT INTO profiles (user_id, is_live, live_url) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE is_live = VALUES(is_live), live_url = VALUES(live_url)`,
    [userId, !!isLive, isLive ? (liveUrl || null) : null]
  );
}

async function getSocialLinks(userId) {
  const [rows] = await pool.query(
    'SELECT id, platform, url FROM social_links WHERE user_id = ? ORDER BY id ASC',
    [userId]
  );
  return rows;
}

/** Replaces the full set of social links for a user - simplest correct semantics for a small edit form. */
async function replaceSocialLinks(userId, links) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM social_links WHERE user_id = ?', [userId]);
    const clean = links.filter((l) => l.platform && l.url).slice(0, 8);
    for (const link of clean) {
      await conn.query('INSERT INTO social_links (user_id, platform, url) VALUES (?, ?, ?)', [
        userId,
        link.platform.trim().slice(0, 32),
        link.url.trim().slice(0, 512)
      ]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function findUserByDiscordId(discordId) {
  const [rows] = await pool.query('SELECT * FROM users WHERE discord_id = ?', [discordId]);
  return rows[0] || null;
}

/**
 * Bulk-fetches bio/pronouns/avatar-override + social links for everyone who has
 * ever logged in, keyed by discord_id - used to enrich the live Discord roster
 * with the extra profile info players have filled in themselves.
 */
async function getRosterExtras() {
  const [users] = await pool.query(
    `SELECT u.discord_id, u.id AS user_id, p.bio, p.pronouns, p.custom_avatar_url, p.is_live, p.live_url
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id`
  );
  const [links] = await pool.query(
    `SELECT sl.user_id, sl.platform, sl.url FROM social_links sl`
  );

  const byUserId = {};
  users.forEach((u) => {
    byUserId[u.user_id] = { ...u, links: [] };
  });
  links.forEach((l) => {
    if (byUserId[l.user_id]) byUserId[l.user_id].links.push({ platform: l.platform, url: l.url });
  });

  const byDiscordId = {};
  Object.values(byUserId).forEach((u) => {
    byDiscordId[u.discord_id] = u;
  });
  return byDiscordId;
}

module.exports = {
  getProfileByUserId,
  updateProfile,
  setLiveStatus,
  getSocialLinks,
  replaceSocialLinks,
  findUserByDiscordId,
  getRosterExtras
};
