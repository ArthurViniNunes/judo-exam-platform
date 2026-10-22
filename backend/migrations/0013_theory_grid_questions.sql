ALTER TABLE theory_questions
  ADD COLUMN question_type TEXT NOT NULL DEFAULT 'single_choice'
  CHECK (question_type IN ('single_choice', 'grid_single', 'grid_multiple'));

CREATE TABLE IF NOT EXISTS theory_question_rows (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES theory_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  correct_option_ids_json TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE (question_id, position)
);

CREATE INDEX IF NOT EXISTS idx_theory_question_rows_question
  ON theory_question_rows (question_id, position);

ALTER TABLE theory_attempt_questions
  ADD COLUMN question_type TEXT NOT NULL DEFAULT 'single_choice'
  CHECK (question_type IN ('single_choice', 'grid_single', 'grid_multiple'));

ALTER TABLE theory_attempt_questions
  ADD COLUMN rows_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE theory_attempt_questions
  ADD COLUMN correct_grid_answers_json TEXT;

ALTER TABLE theory_answers
  ADD COLUMN selected_grid_answers_json TEXT;
