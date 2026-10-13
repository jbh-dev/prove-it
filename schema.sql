-- Leads from the Prove it pack form. lib/schema.js creates this automatically; kept for reference.
CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  company    TEXT    NOT NULL,
  wants_call INTEGER NOT NULL DEFAULT 0,
  source     TEXT, medium TEXT, campaign TEXT, referrer TEXT, country TEXT
);
CREATE INDEX IF NOT EXISTS leads_email ON leads(email);
