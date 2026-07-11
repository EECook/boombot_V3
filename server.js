require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');

const pool = require('./src/config/db');
const { loadUser } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const pageRoutes = require('./src/routes/pages');

const app = express();

const sessionStore = new MySQLStore({}, pool);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/', pageRoutes);

app.use((req, res) => {
  res.status(404).render('landing', { title: 'Family Movie Night' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Boombot V3 running on port ${PORT}`));
