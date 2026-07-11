const axios = require('axios');

const DISCORD_API = 'https://discord.com/api/v10';

const {
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_REDIRECT_URI,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_ADMIN_ROLE_ID
} = process.env;

/** Builds the "Sign in with Discord" redirect URL. */
function getAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    state
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Exchanges the OAuth `code` for an access token. */
async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_REDIRECT_URI
  });

  const { data } = await axios.post(`${DISCORD_API}/oauth2/token`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data; // { access_token, token_type, expires_in, refresh_token, scope }
}

/** Fetches the logged-in user's own Discord profile using their access token. */
async function fetchOAuthUser(accessToken) {
  const { data } = await axios.get(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data; // { id, username, discriminator, avatar, ... }
}

/**
 * Looks up a Discord ID as a member of our guild using the BOT token.
 * This is how we gate the whole site to server members only - the OAuth
 * scope alone doesn't tell us guild membership, so the bot checks for us.
 * Returns the guild member object, or null if they aren't in the server.
 */
async function fetchGuildMember(discordId) {
  try {
    const { data } = await axios.get(
      `${DISCORD_API}/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
    );
    return data; // { user: {...}, roles: [...], nick, ... }
  } catch (err) {
    if (err.response && err.response.status === 404) return null;
    throw err;
  }
}

function isAdmin(member) {
  return !!member && Array.isArray(member.roles) && member.roles.includes(DISCORD_ADMIN_ROLE_ID);
}

function avatarUrl(discordId, avatarHash) {
  if (!avatarHash) {
    // Discord's default avatar, based on id when no custom avatar is set
    return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) % 5n)}.png`;
  }
  const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}`;
}

module.exports = {
  getAuthorizeUrl,
  exchangeCode,
  fetchOAuthUser,
  fetchGuildMember,
  isAdmin,
  avatarUrl
};
