ALTER TABLE exam_event_tasks
  ADD COLUMN lock_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE evaluations
  ADD COLUMN event_task_id TEXT REFERENCES exam_event_tasks(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_event_task
  ON evaluations (event_task_id)
  WHERE event_task_id IS NOT NULL;
