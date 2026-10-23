ALTER TABLE exam_event_tasks
  ADD COLUMN source_device_id TEXT;

ALTER TABLE exam_event_tasks
  ADD COLUMN source_device_label TEXT;

ALTER TABLE exam_event_tasks
  ADD COLUMN last_sync_at TEXT;

CREATE INDEX IF NOT EXISTS idx_exam_event_tasks_device
  ON exam_event_tasks (source_device_id, status);
