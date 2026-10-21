-- Keep total_visits unchanged as the legacy session-based counter.
ALTER TABLE arc_site_metrics
  ADD COLUMN IF NOT EXISTS total_page_views bigint NOT NULL DEFAULT 0 CHECK (total_page_views >= 0),
  ADD COLUMN IF NOT EXISTS page_views_started_at timestamptz NOT NULL DEFAULT now();

-- Only anonymous event IDs are retained for retry deduplication, never IPs or visitor identities.
CREATE TABLE IF NOT EXISTS arc_site_page_view_events (
  event_id uuid PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS arc_site_page_view_events_received_at_idx
  ON arc_site_page_view_events (received_at);
