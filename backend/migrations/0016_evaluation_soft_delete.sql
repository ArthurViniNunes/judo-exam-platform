ALTER TABLE evaluations ADD COLUMN deleted_at TEXT;
ALTER TABLE evaluations ADD COLUMN deleted_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE evaluations ADD COLUMN delete_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_evaluations_deleted_at
  ON evaluations (deleted_at, created_at DESC);
