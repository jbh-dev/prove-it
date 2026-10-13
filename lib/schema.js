// Creates the leads table on first use, so a new D1 database needs no manual setup.
// Mirrors schema.sql. Runs once per worker instance.
let ready;
export function ensureSchema(db) {
  ready ??= (async () => {
    await db.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
      name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL,
      wants_call INTEGER NOT NULL DEFAULT 0,
      source TEXT, medium TEXT, campaign TEXT, referrer TEXT, country TEXT)`).run();
    await db.prepare("CREATE INDEX IF NOT EXISTS leads_email ON leads(email)").run();
  })().catch((e) => { ready = undefined; throw e; });
  return ready;
}
