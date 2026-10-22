ALTER TABLE evaluations ADD COLUMN eligibility_id TEXT REFERENCES student_eligibilities(id);

CREATE INDEX IF NOT EXISTS idx_evaluations_eligibility
  ON evaluations (eligibility_id)
  WHERE eligibility_id IS NOT NULL;
