-- SOUNDWAVE migration — adds artists_metadata for admin-editable artist info.
-- Run: mysql -u root -p soundwave_prod < server/src/database/migrations/2026_05_artists_metadata.sql

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
