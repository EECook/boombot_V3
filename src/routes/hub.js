const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const discord = require('../config/discord');
const posts = require('../models/posts');
const profiles = require('../models/profiles');
const { avatarUrl } = require('../config/discord');

async function loadRosterAndFeed(viewerId) {
  const [members, extras, feedPosts] = await Promise.all([
    discord.fetchGuildMembers(),
    profiles.getRosterExtras(),
    posts.listPosts({ wallUserId: null, viewerId: viewerId || null })
  ]);

  const roster = members
    .map((m) => {
      const extra = extras[m.user.id] || null;
      return {
        discordId: m.user.id,
        username: m.nick || m.user.username,
        avatarUrl: extra && extra.custom_avatar_url
          ? extra.custom_avatar_url
          : avatarUrl(m.user.id, m.user.avatar),
        bio: extra ? extra.bio : null,
        pronouns: extra ? extra.pronouns : null,
        links: extra ? extra.links : [],
        hasAccount: !!extra
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  return { roster, feedPosts: feedPosts.map(enrichPost) };
}

router.get('/hub', requireAuth, async (req, res) => {
  try {
    const { feedPosts } = await loadRosterAndFeed(req.user.id);
    res.render('hub', { title: 'The Hub - Family Movie Night', feedPosts });
  } catch (err) {
    console.error('Failed to load hub:', err.message);
    res.status(500).render('hub', {
      title: 'The Hub - Family Movie Night',
      feedPosts: [],
      loadError: "Couldn't reach the projection booth. Try refreshing in a moment."
    });
  }
});

// ---------- Feed API (shared by the main feed and profile walls) ----------

router.post('/api/posts', requireAuth, async (req, res) => {
  const body = (req.body.body || '').trim().slice(0, 2000);
  const wallUserId = req.body.wallUserId ? Number(req.body.wallUserId) : null;
  if (!body) return res.status(400).json({ error: 'Post cannot be empty.' });

  try {
    const post = await posts.createPost({ authorId: req.user.id, wallUserId, body });
    const io = req.app.get('io');
    io.emit('post:new', serializePost(post, req));
    res.json({ ok: true, post });
  } catch (err) {
    console.error('createPost failed:', err.message);
    res.status(500).json({ error: 'Could not save that post.' });
  }
});

router.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  const body = (req.body.body || '').trim().slice(0, 1000);
  const postId = Number(req.params.id);
  if (!body) return res.status(400).json({ error: 'Comment cannot be empty.' });

  try {
    const comment = await posts.createComment({ postId, authorId: req.user.id, body });
    const io = req.app.get('io');
    io.emit('comment:new', serializeComment(comment, req));
    res.json({ ok: true, comment });
  } catch (err) {
    console.error('createComment failed:', err.message);
    res.status(500).json({ error: 'Could not save that comment.' });
  }
});

router.post('/api/posts/:id/reactions', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const result = await posts.toggleReaction({ postId, userId: req.user.id });
    const io = req.app.get('io');
    io.emit('reaction:update', { postId, count: result.count });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('toggleReaction failed:', err.message);
    res.status(500).json({ error: 'Could not update that reaction.' });
  }
});

function enrichPost(post) {
  return {
    ...post,
    author: { ...post.author, avatarUrl: avatarUrl(post.author.discordId, post.author.avatarHash) },
    comments: post.comments.map((c) => ({
      ...c,
      author: { ...c.author, avatarUrl: avatarUrl(c.author.discordId, c.author.avatarHash) }
    }))
  };
}

function serializePost(post, req) {
  return {
    id: post.id,
    body: post.body,
    createdAt: post.createdAt,
    wallUserId: post.wallUserId,
    author: {
      username: post.author.username,
      discordId: post.author.discordId,
      avatarUrl: avatarUrl(post.author.discordId, post.author.avatarHash)
    },
    commentCount: 0,
    reactionCount: 0,
    viewerReacted: false
  };
}

function serializeComment(comment) {
  return {
    id: comment.id,
    postId: comment.postId,
    body: comment.body,
    createdAt: comment.createdAt,
    author: {
      username: comment.author.username,
      discordId: comment.author.discordId,
      avatarUrl: avatarUrl(comment.author.discordId, comment.author.avatarHash)
    }
  };
}

module.exports = router;
module.exports.enrichPost = enrichPost;
module.exports.loadRosterAndFeed = loadRosterAndFeed;
