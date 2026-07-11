const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const discord = require('../config/discord');
const pool = require('../config/db');
const { upsertUser } = require('../models/users');

/** Kicks off "Sign in with Discord". */
router.get('/discord', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  res.redirect(discord.getAuthorizeUrl(state));
});

/** Discord redirects back here with a `code` after the user approves. */
router.get('/discord/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/signin?error=denied');
  }
  if (!code || !state || state !== req.session.oauthState) {
    return res.redirect('/signin?error=invalid_state');
  }

  try {
    const token = await discord.exchangeCode(code);
    const oauthUser = await discord.fetchOAuthUser(token.access_token);
    const member = await discord.fetchGuildMember(oauthUser.id);

    if (!member) {
      // Not in the server - the whole point of the gate.
      return res.redirect('/signin?error=not_a_member');
    }

    const user = await upsertUser({
      discordId: oauthUser.id,
      username: member.nick || oauthUser.username,
      discriminator: oauthUser.discriminator,
      avatarHash: oauthUser.avatar,
      isAdmin: discord.isAdmin(member)
    });

    req.session.userId = user.id;
    res.redirect('/hub');
  } catch (err) {
    console.error('Discord OAuth callback failed:', err.message);
    res.redirect('/signin?error=server_error');
  }
});

/** Alternative sign-in: player runs !link in Discord, bot DMs a one-time code. */
router.post('/link-code', express.urlencoded({ extended: false }), async (req, res) => {
  const code = (req.body.code || '').trim().toUpperCase();
  if (!code) return res.redirect('/signin?error=missing_code');

  try {
    const [rows] = await pool.query(
      'SELECT * FROM link_codes WHERE code = ? AND used_at IS NULL AND expires_at > NOW()',
      [code]
    );
    const linkCode = rows[0];
    if (!linkCode) return res.redirect('/signin?error=bad_code');

    const member = await discord.fetchGuildMember(linkCode.discord_id);
    if (!member) return res.redirect('/signin?error=not_a_member');

    const user = await upsertUser({
      discordId: linkCode.discord_id,
      username: member.nick || member.user.username,
      discriminator: member.user.discriminator,
      avatarHash: member.user.avatar,
      isAdmin: discord.isAdmin(member)
    });

    await pool.query('UPDATE link_codes SET used_at = NOW() WHERE id = ?', [linkCode.id]);

    req.session.userId = user.id;
    res.redirect('/hub');
  } catch (err) {
    console.error('Link-code sign-in failed:', err.message);
    res.redirect('/signin?error=server_error');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
