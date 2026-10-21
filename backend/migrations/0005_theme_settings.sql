CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  light_accent TEXT NOT NULL,
  dark_accent TEXT NOT NULL,
  dark_background TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO theme_settings (
  id,
  light_accent,
  dark_accent,
  dark_background
) VALUES (1, '#4f7646', '#ef4444', '#100808');
