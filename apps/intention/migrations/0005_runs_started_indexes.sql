-- Queries filter and sort runs by started_ms, not created_at: the daily free-run count and "Your runs"
-- by device, and the global totals by time. Index what they use.
CREATE INDEX runs_device_started ON runs (device_id, started_ms);
CREATE INDEX runs_started ON runs (started_ms);
DROP INDEX runs_device;
DROP INDEX runs_created;
