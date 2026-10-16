-- Device cap, sharing alerts and rate limits. See PAYMENTS.md section 3b.

-- The devices that used each unlock code. A code works on up to 5 devices.
-- scripts/reset-devices.ts clears a code's rows.
CREATE TABLE code_devices (
  code_hash TEXT NOT NULL,
  app TEXT NOT NULL,
  device_id TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (code_hash, app, device_id)
);

-- Per code and day, a scrambled form (HMAC) of each network address it was checked from.
-- The reconcile script lists codes used from many places in one day. Never the address itself.
CREATE TABLE code_addresses (
  code_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  address_hash TEXT NOT NULL,
  PRIMARY KEY (code_hash, day, address_hash)
);

-- Tries per network address: 10 a minute and 100 a day. Keys hold the address only until they expire.
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_ms INTEGER NOT NULL
);
CREATE INDEX rate_limits_expires_ms ON rate_limits (expires_ms);
