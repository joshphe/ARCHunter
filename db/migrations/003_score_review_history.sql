ALTER TABLE ecosystem_projects
  ADD COLUMN IF NOT EXISTS score_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS scorecard_history jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE ecosystem_projects
SET score_reviewed_at = updated_at
WHERE scorecard IS NOT NULL AND score_reviewed_at IS NULL;
