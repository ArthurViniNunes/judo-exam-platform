CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'evaluator', 'student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_status
  ON user_roles (role, status, user_id);

INSERT OR IGNORE INTO user_roles (user_id, role, status, created_at, updated_at)
SELECT id, role, status, created_at, COALESCE(last_login_at, created_at)
FROM users;

ALTER TABLE sessions
  ADD COLUMN context TEXT NOT NULL DEFAULT 'professional'
  CHECK (context IN ('professional', 'student'));

ALTER TABLE students ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user
  ON students (user_id)
  WHERE user_id IS NOT NULL;
