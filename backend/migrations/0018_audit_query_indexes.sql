CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
  ON audit_events (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action
  ON audit_events (action, created_at DESC, id DESC);
