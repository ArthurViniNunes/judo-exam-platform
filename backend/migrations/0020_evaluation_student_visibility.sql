ALTER TABLE evaluations
  ADD COLUMN student_visible_at TEXT;

ALTER TABLE evaluations
  ADD COLUMN student_visible_by TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_evaluations_student_visibility
  ON evaluations (student_id, student_visible_at, created_at DESC)
  WHERE student_visible_at IS NOT NULL AND deleted_at IS NULL;
