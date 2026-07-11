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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
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
  })
);

app.use(loadUser);

app.use('/auth', authRoutes);
app.use('/', hubRoutes);
app.use('/', profileRoutes);
app.use('/', pageRoutes);

app.use((req, res) => {
  res.status(404).render('landing', { title: 'Family Movie Night' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Boombot V3 running on port ${PORT}`));
