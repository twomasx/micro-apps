-- Every purchase records the Stripe mode it was made in. An app only accepts purchases
-- made in its own PAYMENTS_MODE, so a test purchase never unlocks anything in live mode.
-- Every purchase before this change was made in test mode.

ALTER TABLE purchases ADD COLUMN mode TEXT NOT NULL DEFAULT 'test';
