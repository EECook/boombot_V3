const express = require('express');
const router = express.Router();

const { loadRosterAndFeed } = require('./hub');

const ERROR_MESSAGES = {
  denied: "Looks like you backed out at the door. Come on in whenever you're ready.",
  invalid_state: "That link went stale. Give it another try.",
  not_a_member:
    "This theater's members-only tonight - you'll need to be in the Discord server first.",
  bad_code: "That code's not valid or already used. Ask for a fresh one with !link.",
  missing_code: 'Enter the code Boombot sent you.',
  server_error: 'Something jammed in the projector. Try again in a moment.'
};

router.get('/', async (req, res) => {
  try {
    const { roster, feedPosts } = await loadRosterAndFeed(req.user ? req.user.id : null);
    res.render('landing', {
      title: 'Family Movie Night',
      roster,
      feedPosts,
      isAuthenticated: !!req.user
    });
  } catch (err) {
    console.error('Failed to load landing roster/feed:', err.message);
    res.render('landing', {
      title: 'Family Movie Night',
      roster: [],
      feedPosts: [],
      isAuthenticated: !!req.user,
      loadError: "Couldn't reach the projection booth. Try refreshing in a moment."
    });
  }
});

router.get('/signin', (req, res) => {
  const error = ERROR_MESSAGES[req.query.error] || null;
  res.render('signin', { title: 'Sign In - Family Movie Night', error });
});

module.exports = router;
