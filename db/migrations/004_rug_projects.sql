CREATE TABLE IF NOT EXISTS rug_projects (
  slug text PRIMARY KEY REFERENCES ecosystem_projects(slug),
  reported_on date NOT NULL,
  incident_on date,
  classification text NOT NULL DEFAULT 'reported' CHECK (classification IN ('reported', 'verified')),
  reason_en text NOT NULL,
  reason_zh text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence) = 'array'),
  project_snapshot jsonb NOT NULL,
  updates_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
