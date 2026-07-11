require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');

const { loadUser } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const pageRoutes = require('./src/routes/pages');
const hubRoutes = require('./src/routes/hub');
const profileRoutes = require('./src/routes/profile');
const pool = require('./src/config/db');
const presence = require('./src/presence');
const { avatarUrl } = require('./src/config/discord');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
app.set('io', io);

// Railway (and most PaaS) terminate HTTPS at a proxy and forward plain HTTP
// to the container - without this, Express can't tell the connection is
// actually secure, which matters for the secure cookie setting below.
app.set('trust proxy', 1);

// IMPORTANT: give the store its own connection config rather than sharing
// the app's mysql2/promise pool. express-mysql-session expects a
// callback-style connection internally - a promise pool's .query() ignores
// the callback argument, so sessions would write but never read back
// correctly (every request looking like a brand new session).
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const sessionMiddleware = session({
  key: 'boombot_session',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(sessionMiddleware);
app.use(loadUser);

app.use('/auth', authRoutes);
app.use('/', hubRoutes);
app.use('/', profileRoutes);
app.use('/', pageRoutes);

app.use((req, res) => {
  res.status(404).render('landing', { title: 'Family Movie Night' });
});

// ---------- Presence: share the same session with Socket.io so we know who's connected ----------
io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

io.on('connection', async (socket) => {
  const userId = socket.request.session && socket.request.session.userId;
  if (!userId) return; // anonymous visitor - nothing to track

  try {
    const [rows] = await pool.query(
      'SELECT id, discord_id, username, avatar_hash FROM users WHERE id = ?',
      [userId]
    );
    const user = rows[0];
    if (!user) return;

    presence.addSocket({
      userId: user.id,
      username: user.username,
      avatarUrl: avatarUrl(user.discord_id, user.avatar_hash),
      discordId: user.discord_id,
      page: 'Somewhere on the site',
      socketId: socket.id
    });
    io.emit('presence:update', presence.list());

    socket.on('presence:hello', ({ page }) => {
      presence.setPage(userId, socket.id, (page || '').slice(0, 60));
      io.emit('presence:update', presence.list());
    });

    socket.on('disconnect', () => {
      presence.removeSocket(userId, socket.id);
      io.emit('presence:update', presence.list());
    });
  } catch (err) {
    console.error('Presence tracking failed for a connection:', err.message);
  }
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Boombot V3 running on port ${PORT}`));
