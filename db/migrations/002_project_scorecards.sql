ALTER TABLE ecosystem_projects
  ADD COLUMN IF NOT EXISTS scorecard jsonb;
