import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/lead.js";
import { onRequestGet } from "../functions/api/leads.js";

function fakeDB() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      if (sql.startsWith("CREATE")) return { async run() {} };
      return {
        bind(...v) { this.v = v; return this; },
        async run() {
          const [name, email, company, wants_call, source, medium, campaign, referrer, country] = this.v;
          rows.push({ created_at: "2026-10-12T13:00:00Z", name, email, company, wants_call, source, medium, campaign, referrer, country });
        },
        async all() { return { results: [...rows].reverse() }; },
      };
    },
  };
}
const post = (body) => new Request("https://x/api/lead", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const good = { name: " Alex Morgan ", email: "Alex@Co.com", company: "Co", talk: true, source: "brightonseo" };

test("saves a valid lead, trimmed and lower-cased", async () => {
  const env = { DB: fakeDB() };
  const r = await onRequestPost({ request: post(good), env });
  assert.equal(r.status, 200);
  assert.deepEqual(env.DB.rows[0].name, "Alex Morgan");
  assert.equal(env.DB.rows[0].email, "alex@co.com");
  assert.equal(env.DB.rows[0].wants_call, 1);
});

test("rejects missing fields and bad email", async () => {
  for (const b of [{ ...good, name: "" }, { ...good, company: " " }, { ...good, email: "nope" }]) {
    const env = { DB: fakeDB() };
    assert.equal((await onRequestPost({ request: post(b), env })).status, 422);
    assert.equal(env.DB.rows.length, 0);
  }
});

test("rejects bad JSON", async () => {
  assert.equal((await onRequestPost({ request: post("{oops"), env: { DB: fakeDB() } })).status, 400);
  assert.equal((await onRequestPost({ request: post("null"), env: { DB: fakeDB() } })).status, 400);
});

test("honeypot pretends success but stores nothing", async () => {
  const env = { DB: fakeDB() };
  assert.equal((await onRequestPost({ request: post({ ...good, website: "spam.com" }), env })).status, 200);
  assert.equal(env.DB.rows.length, 0);
});

const auth = (p) => ({ authorization: "Basic " + btoa("jane:" + p) });
test("export needs the password", async () => {
  const env = { DB: fakeDB(), LEADS_PASSWORD: "s3cret" };
  assert.equal((await onRequestGet({ request: new Request("https://x/api/leads"), env })).status, 401);
  assert.equal((await onRequestGet({ request: new Request("https://x/api/leads", { headers: auth("wrong!") }), env })).status, 401);
  assert.equal((await onRequestGet({ request: new Request("https://x/api/leads", { headers: auth("s3cret") }), env: { DB: fakeDB() } })).status, 401, "no password set means locked");
});

test("export returns CSV and neutralises formulas", async () => {
  const env = { DB: fakeDB(), LEADS_PASSWORD: "s3cret" };
  await onRequestPost({ request: post({ ...good, company: "=HYPERLINK(\"x\")" }), env });
  const r = await onRequestGet({ request: new Request("https://x/api/leads", { headers: auth("s3cret") }), env });
  assert.equal(r.status, 200);
  const bytes = new Uint8Array(await r.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "BOM so Excel reads UTF-8");
  const text = new TextDecoder().decode(bytes);
  assert.match(text, /^created_at,name,email/);
  assert.match(text, /"'=HYPERLINK\(""x""\)"/);
});

test("JSON for the sign-ups page, without a browser password prompt", async () => {
  const env = { DB: fakeDB(), LEADS_PASSWORD: "s3cret" };
  await onRequestPost({ request: post(good), env });
  const denied = await onRequestGet({ request: new Request("https://x/api/leads?format=json"), env });
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get("www-authenticate"), null);
  const r = await onRequestGet({ request: new Request("https://x/api/leads?format=json", { headers: auth("s3cret") }), env });
  const body = await r.json();
  assert.equal(body.leads.length, 1);
  assert.equal(body.leads[0].email, "alex@co.com");
});
