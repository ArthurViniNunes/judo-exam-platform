CREATE TABLE IF NOT EXISTS evaluation_items (
  id TEXT PRIMARY KEY,
  evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  score REAL NOT NULL CHECK (score BETWEEN 0 AND 100),
  detail TEXT,
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluation_items_evaluation
  ON evaluation_items (evaluation_id, position);
