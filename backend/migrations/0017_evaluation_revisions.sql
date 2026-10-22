ALTER TABLE evaluations
  ADD COLUMN revision_root_id TEXT REFERENCES evaluations(id);

ALTER TABLE evaluations
  ADD COLUMN supersedes_id TEXT REFERENCES evaluations(id);

ALTER TABLE evaluations
  ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE evaluations
  ADD COLUMN correction_reason TEXT;

ALTER TABLE evaluations
  ADD COLUMN corrected_by TEXT REFERENCES users(id);

ALTER TABLE evaluations
  ADD COLUMN corrected_at TEXT;

DROP INDEX IF EXISTS idx_evaluations_event_task;

CREATE INDEX IF NOT EXISTS idx_evaluations_revision_root
  ON evaluations (revision_root_id, revision_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_supersedes
  ON evaluations (supersedes_id)
  WHERE supersedes_id IS NOT NULL;
