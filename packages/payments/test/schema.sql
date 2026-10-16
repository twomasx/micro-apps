-- The purchases, stripe_events and payment_log tables as an app with unlock codes has them after all its
-- migrations (focus: 0001 to 0004). The tests of the shared payments code run against this.
-- When an app migration changes these tables, change this file the same way.

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  unlock_code_hash TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'test',
  payment_intent_id TEXT,
  code_generation INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
CREATE INDEX purchases_unlock_code_hash ON purchases (unlock_code_hash);
CREATE INDEX purchases_payment_intent_id ON purchases (payment_intent_id);

CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

CREATE TABLE payment_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  app TEXT NOT NULL,
  mode TEXT NOT NULL,
  action TEXT NOT NULL,
  product TEXT,
  session_id TEXT,
  result TEXT NOT NULL,
  detail TEXT
);
CREATE INDEX payment_log_at ON payment_log (at);

-- Device cap, sharing alerts and rate limits (focus 0004).
CREATE TABLE code_devices (
  code_hash TEXT NOT NULL,
  app TEXT NOT NULL,
  device_id TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (code_hash, app, device_id)
);

CREATE TABLE code_addresses (
  code_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  address_hash TEXT NOT NULL,
  PRIMARY KEY (code_hash, day, address_hash)
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_ms INTEGER NOT NULL
);
CREATE INDEX rate_limits_expires_ms ON rate_limits (expires_ms);
