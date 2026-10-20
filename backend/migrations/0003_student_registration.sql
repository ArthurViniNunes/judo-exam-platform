CREATE TABLE IF NOT EXISTS student_evaluators (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS idx_student_evaluators_evaluator
  ON student_evaluators (evaluator_id, created_at DESC);

INSERT OR IGNORE INTO student_evaluators (student_id, evaluator_id)
SELECT DISTINCT student_id, evaluator_id
FROM evaluations
WHERE student_id IS NOT NULL AND evaluator_id IS NOT NULL;
