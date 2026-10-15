-- Anonymous attention test summaries, for "compared with people who took it here".
-- No names, no device id, no IP address. The date is the day only.

CREATE TABLE test_results (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  length TEXT NOT NULL CHECK (length IN ('quick', 'full')),
  -- 1 for this device's first test of this length. Only first tests make the comparison.
  nth INTEGER NOT NULL,
  commissions INTEGER NOT NULL,
  omissions INTEGER NOT NULL,
  anticipations INTEGER NOT NULL,
  mean_rt INTEGER,
  sd_rt INTEGER,
  cv REAL,
  score INTEGER NOT NULL,
  created_on TEXT NOT NULL
);

CREATE INDEX test_results_first ON test_results (length, version, nth);
