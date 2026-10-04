CREATE TABLE IF NOT EXISTS project_risk_reviews (
 id bigserial PRIMARY KEY,
 slug text NOT NULL REFERENCES ecosystem_projects(slug),
 priority text NOT NULL CHECK (priority IN ('priority','watch','limited','unassessed')),
 evidence_status text NOT NULL CHECK (evidence_status IN ('partial','verified','reported')),
 reason_en text NOT NULL,
 reason_zh text NOT NULL,
 sources jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sources) = 'array'),
 reviewed_on date NOT NULL,
 import_key text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_risk_reviews_slug_id ON project_risk_reviews(slug, id DESC);
ALTER TABLE ecosystem_project_updates ADD COLUMN IF NOT EXISTS update_kind text NOT NULL DEFAULT 'news' CHECK (update_kind IN ('news','risk'));
