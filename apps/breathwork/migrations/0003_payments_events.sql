-- Refunds, disputes, each Stripe event handled once, and a payment log. See PAYMENTS.md.
-- status is now pending, paid, refunded or disputed. Only paid unlocks anything.

-- Links refunds and disputes back to the purchase.
ALTER TABLE purchases ADD COLUMN payment_intent_id TEXT;
-- Goes up by one each time scripts/reissue-code.ts replaces a leaked unlock code.
ALTER TABLE purchases ADD COLUMN code_generation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN updated_at TEXT;
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
