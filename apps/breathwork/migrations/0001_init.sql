-- Purchases of the Breathwork lifetime unlock. No names, no emails.

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
