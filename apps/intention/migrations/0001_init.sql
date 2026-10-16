-- Intention runs and Lab Pass purchases. No names, no emails, no IP addresses.

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  -- Random id made on the device. Not linked to a person.
  device_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  -- Start time in milliseconds since 1970, for the real-time clock of the stream.
  started_ms INTEGER NOT NULL,
  -- The exercise. 'tug' for now. Totals work per kind and across all kinds.
  kind TEXT NOT NULL,
  -- 'left' or 'right'. Chosen by the server, never the client.
  aim TEXT NOT NULL,
  -- 'crypto' today. A later source gets its own value so totals can be split.
  source TEXT NOT NULL,
  length_bits INTEGER NOT NULL,
  -- Bits the run actually got.
  n INTEGER NOT NULL,
  -- Number of 1s minus number of 0s.
  deviation INTEGER NOT NULL,
  -- deviation toward the aim divided by the square root of length_bits.
  z REAL NOT NULL,
  -- 'running', 'complete' or 'abandoned'. A 'running' row past its end counts as abandoned.
  status TEXT NOT NULL,
  -- The Intention Hour this run fell in (its date), or NULL.
  hour_event TEXT,
  -- Every bit, packed 8 to a byte, first bit in the highest bit of the first byte.
  bits BLOB,
  -- JSON list of [milliseconds after the start, bits in that batch].
  batch_times TEXT NOT NULL,
  ended_at TEXT
);

CREATE INDEX runs_device ON runs (device_id, created_at);
CREATE INDEX runs_created ON runs (created_at);
CREATE INDEX runs_hour_event ON runs (hour_event);

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  -- SHA-256 of the unlock code. Empty until the purchase is paid.
  unlock_code_hash TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX purchases_unlock_code_hash ON purchases (unlock_code_hash);
