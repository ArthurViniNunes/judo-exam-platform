CREATE TABLE IF NOT EXISTS theory_exam_versions (
  id TEXT PRIMARY KEY,
  belt_id TEXT NOT NULL,
  belt_name TEXT NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  minimum_score INTEGER CHECK (minimum_score BETWEEN 0 AND 100),
  question_order TEXT CHECK (question_order IN ('fixed', 'random') OR question_order IS NULL),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  closed_at TEXT,
  UNIQUE (belt_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_theory_versions_belt_status
  ON theory_exam_versions (belt_id, status, version_number DESC);

CREATE TABLE IF NOT EXISTS theory_questions (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES theory_exam_versions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  points INTEGER NOT NULL CHECK (points BETWEEN 1 AND 100),
  explanation TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (version_id, position)
);

CREATE INDEX IF NOT EXISTS idx_theory_questions_version
  ON theory_questions (version_id, position);

CREATE TABLE IF NOT EXISTS theory_question_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES theory_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE (question_id, position)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_theory_options_one_correct
  ON theory_question_options (question_id)
  WHERE is_correct = 1;

CREATE INDEX IF NOT EXISTS idx_theory_options_question
  ON theory_question_options (question_id, position);

CREATE TABLE IF NOT EXISTS theory_question_media (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL UNIQUE REFERENCES theory_questions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'audio', 'video', 'youtube')),
  source_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  metadata_sensitive INTEGER NOT NULL DEFAULT 0 CHECK (metadata_sensitive IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS theory_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  version_id TEXT NOT NULL REFERENCES theory_exam_versions(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  passed INTEGER CHECK (passed IN (0, 1) OR passed IS NULL),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_theory_attempt_one_active
  ON theory_attempts (student_id)
  WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_theory_attempts_student
  ON theory_attempts (student_id, started_at DESC);

CREATE TABLE IF NOT EXISTS theory_attempt_questions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES theory_attempts(id) ON DELETE CASCADE,
  source_question_id TEXT NOT NULL,
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  points INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_option_id TEXT NOT NULL,
  media_json TEXT,
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE (attempt_id, position)
);

CREATE INDEX IF NOT EXISTS idx_theory_attempt_questions
  ON theory_attempt_questions (attempt_id, position);

CREATE TABLE IF NOT EXISTS theory_answers (
  attempt_question_id TEXT PRIMARY KEY REFERENCES theory_attempt_questions(id) ON DELETE CASCADE,
  selected_option_id TEXT,
  awarded_points INTEGER CHECK (awarded_points >= 0 OR awarded_points IS NULL),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_eligibilities (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  belt_id TEXT NOT NULL,
  belt_name TEXT NOT NULL,
  source_attempt_id TEXT NOT NULL UNIQUE REFERENCES theory_attempts(id),
  valid_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_until TEXT,
  revoked_at TEXT,
  revocation_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_active_eligibility
  ON student_eligibilities (student_id)
  WHERE revoked_at IS NULL;
