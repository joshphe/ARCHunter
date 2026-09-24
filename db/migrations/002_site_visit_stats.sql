CREATE TABLE IF NOT EXISTS arc_site_metrics (
  id smallint PRIMARY KEY CHECK (id = 1),
  total_visits bigint NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO arc_site_metrics (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
