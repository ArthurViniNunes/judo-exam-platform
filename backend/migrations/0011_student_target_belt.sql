ALTER TABLE students ADD COLUMN target_belt_id TEXT;
ALTER TABLE students ADD COLUMN target_belt_name TEXT;
ALTER TABLE students ADD COLUMN target_belt_set_at TEXT;

CREATE INDEX IF NOT EXISTS idx_students_target_belt
  ON students (target_belt_id, id)
  WHERE target_belt_id IS NOT NULL;
