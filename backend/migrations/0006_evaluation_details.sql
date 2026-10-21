CREATE TABLE IF NOT EXISTS evaluation_categories (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluation_categories_evaluation
  ON evaluation_categories (evaluation_id, position);

CREATE TABLE IF NOT EXISTS evaluation_item_parts (
  id TEXT PRIMARY KEY,
  evaluation_item_id TEXT NOT NULL REFERENCES evaluation_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluation_item_parts_item
  ON evaluation_item_parts (evaluation_item_id, position);
