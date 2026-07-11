const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const { avatarUrl } = require('../config/discord');
const profilesModel = require('../models/profiles');
const posts = require('../models/posts');
const { enrichPost } = require('./hub');

const PRONOUN_OPTIONS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'other'];
const TIMEZONE_OPTIONS = [
  'Pacific Time (US)', 'Mountain Time (US)', 'Central Time (US)', 'Eastern Time (US)',
  'UTC', 'GMT/BST (UK)', 'Central European Time', 'India Standard Time',
  'Japan Standard Time', 'Australian Eastern Time'
];

router.get('/profile/edit', requireAuth, async (req, res) => {
  const profile = await profilesModel.getProfileByUserId(req.user.id);
  const links = await profilesModel.getSocialLinks(req.user.id);

  res.render('profile-edit', {
    title: 'Edit Your Profile - Family Movie Night',
    profile,
    links,
    discordId: req.user.discord_id,
    pronounOptions: PRONOUN_OPTIONS,
    timezoneOptions: TIMEZONE_OPTIONS
  });
});

router.post('/profile/edit', requireAuth, async (req, res) => {
  const { age, pronouns, birthday, timezone, bio, customAvatarUrl, liveUrl } = req.body;
  const isLive = req.body.isLive === 'on' || req.body.isLive === 'true';

  await profilesModel.updateProfile(req.user.id, {
    age: age ? Number(age) : null,
    pronouns: pronouns || null,
    birthday: birthday || null,
    timezone: timezone || null,
    bio: (bio || '').slice(0, 2000),
    customAvatarUrl: customAvatarUrl || null,
    isLive,
    liveUrl: (liveUrl || '').slice(0, 512)
  });

  const platforms = [].concat(req.body.linkPlatform || []);
  const urls = [].concat(req.body.linkUrl || []);
  const links = platforms.map((platform, i) => ({ platform, url: urls[i] }));
  await profilesModel.replaceSocialLinks(req.user.id, links);

  res.redirect(`/profile/${req.user.discord_id}`);
});

router.get('/profile/:discordId', requireAuth, async (req, res) => {
  const profileUser = await profilesModel.findUserByDiscordId(req.params.discordId);
  if (!profileUser) {
    return res.status(404).render('hub', {
      title: 'The Hub - Family Movie Night',
      roster: [],
      feedPosts: [],
      loadError: "That player hasn't shown up yet."
    });
  }

  const [profile, links, wallPosts] = await Promise.all([
    profilesModel.getProfileByUserId(profileUser.id),
    profilesModel.getSocialLinks(profileUser.id),
    posts.listPosts({ wallUserId: profileUser.id, viewerId: req.user.id })
  ]);

  res.render('profile', {
    title: `${profileUser.username} - Family Movie Night`,
    profileUser: {
      id: profileUser.id,
      discordId: profileUser.discord_id,
      username: profileUser.username,
      avatarUrl: profile.custom_avatar_url || avatarUrl(profileUser.discord_id, profileUser.avatar_hash)
    },
    profile,
    links,
    wallPosts: wallPosts.map(enrichPost),
    isOwnProfile: profileUser.id === req.user.id
  });
});

module.exports = router;
