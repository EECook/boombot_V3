-- Boombot V3 — initial schema
-- Run this once against s412518_boombot_v3

CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  discord_id        VARCHAR(32) NOT NULL UNIQUE,
  username          VARCHAR(64) NOT NULL,
  discriminator     VARCHAR(8)  DEFAULT NULL,
  avatar_hash       VARCHAR(64) DEFAULT NULL,
  is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
  is_member         BOOLEAN NOT NULL DEFAULT TRUE, -- still in the Discord server?
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at     DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One-time codes issued by the !link Discord command
CREATE TABLE IF NOT EXISTS link_codes (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code              VARCHAR(12) NOT NULL UNIQUE,
  discord_id        VARCHAR(32) NOT NULL,
  expires_at        DATETIME NOT NULL,
  used_at           DATETIME DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- express-mysql-session will auto-create its own `sessions` table on first run.

-- ---------- Scaffolded for the next phase (profiles + social feed) ----------
-- Not wired up to any routes yet — just reserving the shape so migrations stay linear.

CREATE TABLE IF NOT EXISTS profiles (
  user_id           BIGINT UNSIGNED PRIMARY KEY,
  custom_avatar_url VARCHAR(512) DEFAULT NULL,
  age               TINYINT UNSIGNED DEFAULT NULL,
  pronouns          VARCHAR(32) DEFAULT NULL,
  birthday          DATE DEFAULT NULL,
  timezone          VARCHAR(64) DEFAULT NULL,
  bio               TEXT DEFAULT NULL,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS social_links (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id           BIGINT UNSIGNED NOT NULL,
  platform          VARCHAR(32) NOT NULL,
  url               VARCHAR(512) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- posts.wall_user_id is NULL for main-hub feed posts, or set to a profile owner for wall posts
CREATE TABLE IF NOT EXISTS posts (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id         BIGINT UNSIGNED NOT NULL,
  wall_user_id      BIGINT UNSIGNED DEFAULT NULL,
  body              TEXT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wall_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS comments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id           BIGINT UNSIGNED NOT NULL,
  author_id         BIGINT UNSIGNED NOT NULL,
  body              TEXT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reactions (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id           BIGINT UNSIGNED NOT NULL,
  user_id           BIGINT UNSIGNED NOT NULL,
  emoji             VARCHAR(16) NOT NULL DEFAULT '❤️',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY one_reaction_per_user_per_post (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
