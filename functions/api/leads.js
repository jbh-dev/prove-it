// GET /api/leads: sign-ups, password-protected with LEADS_PASSWORD (any username).
// Returns JSON for the /leads page (?format=json), otherwise a CSV download.
import { ensureSchema } from "../../lib/schema.js";

const COLS = ["created_at", "name", "email", "company", "wants_call", "source", "medium", "campaign", "referrer", "country"];

function authorised(request, password) {
  if (!password) return false;
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let pass;
  try { pass = atob(h.slice(6)).split(":").slice(1).join(":"); } catch { return false; }
  if (pass.length !== password.length) return false;
  let diff = 0;
  for (let i = 0; i < pass.length; i++) diff |= pass.charCodeAt(i) ^ password.charCodeAt(i);
  return diff === 0;
}

// Quote every cell, and stop spreadsheet formula injection from form input.
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};

export async function onRequestGet({ request, env }) {
  const wantsJson = new URL(request.url).searchParams.get("format") === "json";
  if (!authorised(request, env.LEADS_PASSWORD)) {
    // The /leads page shows its own sign-in, so only prompt the browser for direct CSV visits.
    const headers = wantsJson ? { "cache-control": "no-store" } : { "www-authenticate": 'Basic realm="Prove it leads"' };
    return new Response("Sign in to see sign-ups", { status: 401, headers });
  }
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare(`SELECT ${COLS.join(",")} FROM leads ORDER BY id DESC`).all();
  if (wantsJson)
    return new Response(JSON.stringify({ leads: results }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const csv = [COLS.join(","), ...results.map((r) => COLS.map((c) => cell(r[c])).join(","))].join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  return new Response("\ufeff" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="prove-it-sign-ups-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
