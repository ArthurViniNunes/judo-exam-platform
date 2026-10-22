CREATE TABLE IF NOT EXISTS exam_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'in_progress', 'closed', 'archived')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  closed_at TEXT,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_exam_events_date
  ON exam_events (event_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS exam_event_evaluators (
  event_id TEXT NOT NULL REFERENCES exam_events(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  station TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_event_evaluators_user
  ON exam_event_evaluators (evaluator_id, event_id);

CREATE TABLE IF NOT EXISTS exam_event_entries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES exam_events(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id),
  belt_id TEXT NOT NULL,
  belt_name TEXT NOT NULL,
  eligibility_id TEXT REFERENCES student_eligibilities(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_event_entries_event
  ON exam_event_entries (event_id, created_at);

CREATE TABLE IF NOT EXISTS exam_event_tasks (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES exam_event_entries(id) ON DELETE CASCADE,
  modality TEXT NOT NULL CHECK (modality IN ('technical', 'kata')),
  kata_type TEXT CHECK (
    kata_type IN ('nage-no-kata-partial', 'nage-no-kata-complete', 'katame-no-kata')
    OR kata_type IS NULL
  ),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'called', 'in_progress', 'pending_sync', 'completed')),
  evaluator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  station TEXT,
  claimed_at TEXT,
  completed_at TEXT,
  evaluation_id TEXT REFERENCES evaluations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entry_id, modality)
);

CREATE INDEX IF NOT EXISTS idx_exam_event_tasks_queue
  ON exam_event_tasks (status, modality, created_at);

CREATE INDEX IF NOT EXISTS idx_exam_event_tasks_evaluator
  ON exam_event_tasks (evaluator_id, status);
