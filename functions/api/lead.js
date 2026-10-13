// POST /api/lead: saves a Prove it pack sign-up to D1 (binding DB).
import { ensureSchema } from "../../lib/schema.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "bad_request" }, 400); }
  if (!d || typeof d !== "object") return json({ error: "bad_request" }, 400);
  if (d.website) return json({ ok: true }); // honeypot: bots fill the hidden field

  const lead = {
    name: clip(d.name, 120), email: clip(d.email, 200).toLowerCase(), company: clip(d.company, 160),
    wants_call: d.talk === true ? 1 : 0,
    source: clip(d.source, 100), medium: clip(d.medium, 100), campaign: clip(d.campaign, 100),
    referrer: clip(d.referrer, 300), country: clip(request.cf?.country, 2),
  };
  if (!lead.name || !lead.company || !EMAIL.test(lead.email)) return json({ error: "invalid" }, 422);

  await ensureSchema(env.DB);
  await env.DB.prepare(
    "INSERT INTO leads (name,email,company,wants_call,source,medium,campaign,referrer,country) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(lead.name, lead.email, lead.company, lead.wants_call, lead.source, lead.medium, lead.campaign, lead.referrer, lead.country).run();

  return json({ ok: true });
}

