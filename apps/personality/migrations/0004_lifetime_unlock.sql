-- One lifetime unlock with an unlock code, like the other apps, instead of a report per result.
-- Purchases no longer belong to a result, so result_id may be empty now. SQLite cannot drop NOT NULL from a
-- column, so the table is rebuilt with every row kept. Old rows keep their product (report, couple, both)
-- and result ids as a record; only rows with an unlock code unlock anything now.
-- product defaults to 'lifetime' because the shared checkout (packages/payments unlockRoutes) does not write it.

CREATE TABLE purchases_new (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL DEFAULT 'lifetime',
  result_id TEXT,
  partner_result_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'test',
  payment_intent_id TEXT,
  updated_at TEXT,
  unlock_code_hash TEXT,
  code_generation INTEGER NOT NULL DEFAULT 0
);

INSERT INTO purchases_new (id, stripe_session_id, product, result_id, partner_result_id, amount_cents, currency, status, created_at, mode, payment_intent_id, updated_at)
  SELECT id, stripe_session_id, product, result_id, partner_result_id, amount_cents, currency, status, created_at, mode, payment_intent_id, updated_at
  FROM purchases;

DROP TABLE purchases;
ALTER TABLE purchases_new RENAME TO purchases;

CREATE INDEX purchases_result_id ON purchases (result_id);
CREATE INDEX purchases_partner_result_id ON purchases (partner_result_id);
CREATE INDEX purchases_payment_intent_id ON purchases (payment_intent_id);
CREATE INDEX purchases_unlock_code_hash ON purchases (unlock_code_hash);

-- Device cap, sharing alerts and rate limits, as in the other apps. See PAYMENTS.md section 3b.

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

-- Tries per network address: 10 a minute and 100 a day. Keys hold a scrambled form of the address (an HMAC), never the address, and expire.
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_ms INTEGER NOT NULL
);
CREATE INDEX rate_limits_expires_ms ON rate_limits (expires_ms);
