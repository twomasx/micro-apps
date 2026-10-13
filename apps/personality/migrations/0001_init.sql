-- Results and purchases for the personality test.

CREATE TABLE results (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  answers TEXT NOT NULL,
  scores TEXT NOT NULL,
  type TEXT NOT NULL,
  flags TEXT NOT NULL,
  delete_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- No foreign keys to results: a purchase record stays when a result is deleted.
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL,
  result_id TEXT NOT NULL,
  partner_result_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX purchases_result_id ON purchases (result_id);
CREATE INDEX purchases_partner_result_id ON purchases (partner_result_id);
