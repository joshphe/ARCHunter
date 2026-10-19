CREATE TABLE IF NOT EXISTS arc_cctp_transfers (
  tx_hash text NOT NULL CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer NOT NULL CHECK (log_index >= 0),
  block_number bigint NOT NULL CHECK (block_number >= 0),
  occurred_at timestamptz NOT NULL,
  domain integer NOT NULL CHECK (domain >= 0 AND domain <> 26),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount_units numeric(40,0) NOT NULL CHECK (amount_units > 0),
  PRIMARY KEY (tx_hash, log_index)
);
CREATE INDEX IF NOT EXISTS arc_cctp_transfers_time_idx ON arc_cctp_transfers (occurred_at DESC);
CREATE INDEX IF NOT EXISTS arc_cctp_transfers_domain_time_idx ON arc_cctp_transfers (domain, occurred_at DESC);
CREATE TABLE IF NOT EXISTS arc_cctp_scan_ranges (
  from_block bigint PRIMARY KEY,
  to_block bigint NOT NULL CHECK (to_block >= from_block),
  from_time timestamptz NOT NULL,
  to_time timestamptz NOT NULL,
  skipped integer NOT NULL DEFAULT 0 CHECK (skipped >= 0),
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS arc_cctp_hourly (
  hour timestamptz NOT NULL,
  domain integer NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount_units numeric(40,0) NOT NULL,
  transfers integer NOT NULL,
  PRIMARY KEY (hour, domain, direction)
);
CREATE TABLE IF NOT EXISTS arc_cctp_collector_state (
  id integer PRIMARY KEY CHECK (id = 1),
  lease_owner text,
  lease_until timestamptz NOT NULL DEFAULT 'epoch',
  next_run_at timestamptz NOT NULL DEFAULT 'epoch',
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO arc_cctp_collector_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
