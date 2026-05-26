-- SOUNDWAVE — MariaDB schema
-- Run: mysql -u root -p < server/src/database/schema.sql

CREATE DATABASE IF NOT EXISTS soundwave_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE soundwave_prod;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  authorized BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_username (username),
  INDEX idx_authorized (authorized)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INT PRIMARY KEY,
  theme VARCHAR(50) DEFAULT 'cyberpunk',
  volume INT DEFAULT 75,
  crossfade_duration FLOAT DEFAULT 5.0,
  gapless_playback BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'fr',
  neon_intensity FLOAT DEFAULT 1.0,
  low_perf_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#00FF41',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_playlist (user_id, name),
  INDEX idx_user (user_id),
  CONSTRAINT fk_pl_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playlist_songs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playlist_id INT NOT NULL,
  song_id VARCHAR(255) NOT NULL,
  song_title VARCHAR(255),
  artist_name VARCHAR(255),
  artist_slug VARCHAR(255),
  duration INT,
  cover_image VARCHAR(255),
  genre VARCHAR(100),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_pl_song (playlist_id, song_id),
  INDEX idx_playlist (playlist_id),
  INDEX idx_song (song_id),
  CONSTRAINT fk_pls_pl FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  song_id VARCHAR(255) NOT NULL,
  song_title VARCHAR(255),
  artist_name VARCHAR(255),
  artist_slug VARCHAR(255),
  duration INT,
  cover_image VARCHAR(255),
  genre VARCHAR(100),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favorite (user_id, song_id),
  INDEX idx_user (user_id),
  INDEX idx_song (song_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listening_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  song_id VARCHAR(255) NOT NULL,
  song_title VARCHAR(255),
  artist_name VARCHAR(255),
  artist_slug VARCHAR(255),
  artist_country VARCHAR(100),
  artist_continent VARCHAR(100),
  genre VARCHAR(100),
  played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_played_seconds INT,
  completed BOOLEAN DEFAULT FALSE,
  played_percentage FLOAT DEFAULT 0,
  INDEX idx_user (user_id),
  INDEX idx_played_at (played_at),
  INDEX idx_song (song_id),
  INDEX idx_artist (artist_slug),
  CONSTRAINT fk_hist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_statistics_cache (
  user_id INT PRIMARY KEY,
  total_listening_time_minutes INT DEFAULT 0,
  total_songs_played INT DEFAULT 0,
  favorite_artist VARCHAR(255),
  favorite_genre VARCHAR(100),
  favorite_country VARCHAR(100),
  top_5_artists JSON,
  top_5_genres JSON,
  top_5_countries JSON,
  most_played_in_month JSON,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  action VARCHAR(50),
  target_user_id INT,
  target_username VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin (admin_user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(255) UNIQUE,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_token (token_hash),
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin-editable artist metadata, merged with auto-generated music.ts data
CREATE TABLE IF NOT EXISTS artists_metadata (
  id INT AUTO_INCREMENT PRIMARY KEY,
  artist_slug VARCHAR(255) UNIQUE NOT NULL,
  biography TEXT,
  years_active VARCHAR(50),
  main_genre VARCHAR(100),
  description TEXT,
  image_url VARCHAR(500),
  country VARCHAR(100),
  social_links JSON,
  admin_notes TEXT,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (artist_slug),
  CONSTRAINT fk_meta_admin FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
