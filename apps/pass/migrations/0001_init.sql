-- The all-app pass service. No names, no emails. See PAYMENTS.md.

-- Pass purchases. Same columns as every app's purchases table, so the shared payments code works on it.
-- unlock_code_hash is the SHA-256 of the pass code. The code itself is never stored.
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  unlock_code_hash TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  -- pending, paid, refunded or disputed. Only paid unlocks anything.
  status TEXT NOT NULL,
  mode TEXT NOT NULL,
  payment_intent_id TEXT,
  -- Goes up by one each time scripts/reissue-code.ts replaces a leaked code.
  code_generation INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX purchases_unlock_code_hash ON purchases (unlock_code_hash);
CREATE INDEX purchases_payment_intent_id ON purchases (payment_intent_id);

-- Every Stripe event id seen. The same event a second time does nothing.
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL
);

-- Every checkout start, webhook, verify, unlock, refund and failure. No card data, no email.
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

-- One-time tokens that carry a pass into an app with no typing. Single use, 10 minutes.
-- Only the token's hash is stored. stripe_session_id finds the pass, whose code is made again on use.
CREATE TABLE pass_tokens (
  token_hash TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL,
  created_ms INTEGER NOT NULL,
  expires_ms INTEGER NOT NULL,
  used_ms INTEGER
);
CREATE INDEX pass_tokens_expires_ms ON pass_tokens (expires_ms);
