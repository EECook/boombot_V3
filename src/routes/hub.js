const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth');
const discord = require('../config/discord');
const posts = require('../models/posts');
const profiles = require('../models/profiles');
const { avatarUrl } = require('../config/discord');
const { getPlatform } = require('../config/platforms');

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
        links: extra ? extra.links.map((l) => ({ ...l, meta: getPlatform(l.platform) })) : [],
        isLive: extra ? !!extra.is_live : false,
        liveUrl: extra ? extra.live_url : null,
        hasAccount: !!extra
      };
    })
    // Only show players who've actually put something on their profile -
    // being in the Discord isn't enough to earn a spot on the wall of cast cards.
    .filter((m) => m.bio || m.pronouns || (m.links && m.links.length > 0) || m.isLive)
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
  const mediaUrl = (req.body.mediaUrl || '').trim().slice(0, 1000);
  const wallUserId = req.body.wallUserId ? Number(req.body.wallUserId) : null;
  if (!body && !mediaUrl) return res.status(400).json({ error: 'Post cannot be empty.' });

  try {
    const post = await posts.createPost({ authorId: req.user.id, wallUserId, body, mediaUrl });
    const io = req.app.get('io');
    io.emit('post:new', serializePost(post));
    res.json({ ok: true, post });
  } catch (err) {
    console.error('createPost failed:', err.message);
    res.status(500).json({ error: 'Could not save that post.' });
  }
});

router.delete('/api/posts/:id', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  try {
    const result = await posts.deletePost(postId, req.user);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    const io = req.app.get('io');
    io.emit('post:deleted', { id: postId });
    res.json({ ok: true });
  } catch (err) {
    console.error('deletePost failed:', err.message);
    res.status(500).json({ error: 'Could not delete that post.' });
  }
});

router.post('/api/posts/:id/comments', requireAuth, async (req, res) => {
  const body = (req.body.body || '').trim().slice(0, 1000);
  const postId = Number(req.params.id);
  if (!body) return res.status(400).json({ error: 'Comment cannot be empty.' });

  try {
    const comment = await posts.createComment({ postId, authorId: req.user.id, body });
    const io = req.app.get('io');
    io.emit('comment:new', serializeComment(comment));
    res.json({ ok: true, comment });
  } catch (err) {
    console.error('createComment failed:', err.message);
    res.status(500).json({ error: 'Could not save that comment.' });
  }
});

router.post('/api/posts/:id/reactions', requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  const emoji = req.body.emoji || posts.REACTION_EMOJIS[0];
  try {
    const result = await posts.toggleReaction({ postId, userId: req.user.id, emoji });
    const io = req.app.get('io');
    io.emit('reaction:update', { postId, reactions: result.reactions.map(({ viewerReacted, ...r }) => r) });
    res.json({ ok: true, reactions: result.reactions });
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

function serializePost(post) {
  return {
    id: post.id,
    body: post.body,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    wallUserId: post.wallUserId,
    author: {
      id: post.author.id,
      username: post.author.username,
      discordId: post.author.discordId,
      avatarUrl: avatarUrl(post.author.discordId, post.author.avatarHash)
    },
    commentCount: 0,
    reactions: []
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
