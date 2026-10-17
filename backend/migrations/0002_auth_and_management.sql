CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  role TEXT NOT NULL DEFAULT 'evaluator' CHECK (role IN ('super_admin', 'evaluator')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_matrices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  has_kata INTEGER NOT NULL DEFAULT 0 CHECK (has_kata IN (0, 1)),
  kata_type TEXT CHECK (kata_type IN ('nage-no-kata-partial', 'nage-no-kata-complete', 'katame-no-kata') OR kata_type IS NULL),
  minimum_score REAL NOT NULL DEFAULT 7 CHECK (minimum_score BETWEEN 0 AND 10),
  max_categories_below_five INTEGER NOT NULL DEFAULT 1 CHECK (max_categories_below_five >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matrix_categories (
  id TEXT PRIMARY KEY,
  matrix_id TEXT NOT NULL REFERENCES exam_matrices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_matrix_categories_matrix ON matrix_categories (matrix_id, position);

CREATE TABLE IF NOT EXISTS matrix_techniques (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES matrix_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_matrix_techniques_category ON matrix_techniques (category_id, position);

CREATE TABLE evaluations_v2 (
  id TEXT PRIMARY KEY,
  athlete TEXT NOT NULL,
  student_id TEXT REFERENCES students(id),
  evaluator_id TEXT REFERENCES users(id),
  professor TEXT,
  belt TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('teórica', 'técnica', 'kata')),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  result TEXT,
  matrix_id TEXT REFERENCES exam_matrices(id),
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO evaluations_v2 (id, athlete, professor, belt, type, score, detail, created_at)
SELECT id, athlete, professor, belt, type, score, detail, created_at FROM evaluations;

DROP TABLE evaluations;
ALTER TABLE evaluations_v2 RENAME TO evaluations;
CREATE INDEX idx_evaluations_created_at ON evaluations (created_at DESC);
CREATE INDEX idx_evaluations_evaluator ON evaluations (evaluator_id, created_at DESC);
CREATE INDEX idx_evaluations_student ON evaluations (student_id, created_at DESC);
