"""Build public/index.html (live site) and preview.html (self-contained preview) from src/index.html."""
import base64, pathlib, re, zipfile
root = pathlib.Path(__file__).parent
SITE = "https://proveit.jbh.co.uk"  # change here if the page lives at another address
src = (root / "src/index.html").read_text()
logo = (root / "public/assets/jbh-logo.svg").read_text()
# The project folder stamps provenance metadata into SVGs; keep it out of the inlined copies.
logo = re.sub(r"<metadata>.*?</metadata>", "", logo, flags=re.S)
logo = re.sub(r'\s*xmlns:c2pa="[^"]*"', "", logo)
photo_file = root / "public/assets/jane-stage.jpg"
PLACEHOLDER = '<div class="ph">Jane on stage at brightonSEO<br>(photo from Jane\'s email goes here)</div>'

def page(photo_src):
    photo = (f'<img src="{photo_src}" alt="Jane Hunt speaking at brightonSEO" width="1080" height="504" fetchpriority="high">'
             if photo_src else PLACEHOLDER)
    return src.replace("__SITE__", SITE).replace("__LOGO__", logo).replace("__PHOTO__", photo)

# Bundle the three PDFs into one ZIP for the "Download all three" button.
PACK = ["JBH-Prove-it-brightonSEO-slides.pdf", "JBH-Prove-it-Prompt-Research.pdf", "JBH-Prove-it-Prompt-Framework.pdf"]
pack = root / "public/pack"
missing = [f for f in PACK if not (pack / f).exists()]
if not missing:
    with zipfile.ZipFile(pack / "JBH-Prove-it-pack.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in PACK: z.write(pack / f, f)
else:
    print("missing from public/pack:", ", ".join(missing))

live = page("/assets/jane-stage.jpg" if photo_file.exists() else None)
(root / "public/index.html").write_text(live)

# Preview: inline fonts and photo so it renders anywhere, and skip the network call.
prev = page("data:image/jpeg;base64," + base64.b64encode(photo_file.read_bytes()).decode() if photo_file.exists() else None)
for w in ("Bold", "Light"):
    b64 = base64.b64encode((root / f"public/assets/fonts/ProximaNova-{w}.woff2").read_bytes()).decode()
    prev = prev.replace(f"url(/assets/fonts/ProximaNova-{w}.woff2)", f"url(data:font/woff2;base64,{b64})")
for img in sorted((root / "public/assets/covers").glob("*.jpg")):
    prev = prev.replace(f'src="/assets/covers/{img.name}"', 'src="data:image/jpeg;base64,' + base64.b64encode(img.read_bytes()).decode() + '"')
prev = re.sub(r'<link rel="preload"[^>]*>\n', "", prev)
prev = prev.replace("<script>", "<script>window.PREVIEW=true;</script>\n<script>", 1)
# The Artifact host supplies its own document skeleton.
prev = re.sub(r"<!doctype html>\s*|</?html[^>]*>\s*|</?head>\s*|</?body>\s*", "", prev, flags=re.I)
prev = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', "", prev)
(root / "preview.html").write_text(prev)
print("built", len(live), "bytes live,", len(prev), "bytes preview; photo:", photo_file.exists())

# Sign-ups page for Jane: live copy, plus a preview filled with clearly marked example rows.
import datetime, json
leads_src = (root / "src/leads.html").read_text().replace("__LOGO__", logo)
(root / "public/leads.html").write_text(leads_src)
now = datetime.datetime.now(datetime.timezone.utc)
ex = [("Example: Priya Shah", "priya@example.com", "Northlight Gin", 1, "brightonseo", 0.1),
      ("Example: Tom Reid", "tom@example.com", "Copper Hare Outdoor", 0, "linkedin", 0.6),
      ("Example: Hannah Cole", "hannah@example.com", "Bramble & Co", 1, "brightonseo", 3),
      ("Example: Marcus Lee", "marcus@example.com", "Fieldhouse Agency", 0, "", 5),
      ("Example: Sofia Marin", "sofia@example.com", "Kindred Skincare", 0, "brightonseo", 26),
      ("Example: Owen Price", "owen@example.com", "Harbour Home Insurance", 1, "linkedin", 30),
      ("Example: Leah Grant", "leah@example.com", "Pebble Pet Food", 0, "brightonseo", 52),
      ("Example: Dan Okafor", "dan@example.com", "Signal SEO", 0, "", 75)]
rows = [dict(created_at=(now - datetime.timedelta(hours=h)).strftime("%Y-%m-%dT%H:%M:%SZ"), name=n, email=e, company=c,
             wants_call=w, source=s, medium="", campaign="", referrer="", country="GB") for n, e, c, w, s, h in ex]
prev_leads = leads_src
for w in ("Bold", "Light"):
    b64 = base64.b64encode((root / f"public/assets/fonts/ProximaNova-{w}.woff2").read_bytes()).decode()
    prev_leads = prev_leads.replace(f"url(/assets/fonts/ProximaNova-{w}.woff2)", f"url(data:font/woff2;base64,{b64})")
prev_leads = prev_leads.replace("<script>", "<script>window.PREVIEW_LEADS=" + json.dumps(rows) + ";</script>\n<script>", 1)
prev_leads = prev_leads.replace('<main>', '<p style="margin:0;padding:10px 16px;text-align:center;font-size:13.5px;background:var(--pink-wash);color:var(--pink-ink)">Preview with example sign-ups. The live page shows real ones after a password.</p>\n<main>', 1)
prev_leads = re.sub(r"<!doctype html>\s*|</?html[^>]*>\s*|</?head>\s*|</?body>\s*", "", prev_leads, flags=re.I)
prev_leads = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', "", prev_leads)
(root / "preview-leads.html").write_text(prev_leads)
