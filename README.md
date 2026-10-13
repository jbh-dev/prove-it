# Prove it pack landing page

Landing page for Jane Hunt's brightonSEO **Prove it pack**. Visitors give their name, work email and company, then download three PDFs. Every sign-up is saved so Jane can export the leads as a spreadsheet.

- **Hosting:** Cloudflare Pages (free plan), the same platform as Cuttings.
- **Leads:** Cloudflare D1 (free plan) via `functions/api/lead.js`.
- **Sign-ups:** `https://<your-domain>/leads`, protected by a password (`LEADS_PASSWORD`). It shows sign-ups live and downloads a CSV.
- **Suggested address:** `proveit.jbh.co.uk`

## Files

| Path | What it is |
|---|---|
| `src/index.html` | The page source. Edit copy here, then run `python3 build.py`. |
| `public/` | What gets published. `build.py` writes `public/index.html`. |
| `public/pack/` | The three PDFs, plus a ZIP of all three that `build.py` creates. |
| `public/assets/jane-stage.jpg` | Hero photo of Jane on stage. |
| `public/assets/covers/` | First-page thumbnails of the three PDFs, shown in "What's inside". |
| `functions/api/lead.js` | Saves a sign-up. |
| `functions/api/leads.js` | Password-protected CSV export. |
| `lib/schema.js` | Creates the leads table on first use (same as `schema.sql`). |
| `src/leads.html` | The sign-ups page at `/leads`. |
| `tests/` | `npm test` runs the function tests. |

### Jane's files (already added)

1. Save the stage photo as `public/assets/jane-stage.jpg`.
2. Save the PDFs in `public/pack/` with these exact names:
   - `JBH-Prove-it-brightonSEO-slides.pdf`
   - `JBH-Prove-it-Prompt-Research.pdf`
   - `JBH-Prove-it-Prompt-Framework.pdf`
3. Run `python3 build.py`. It creates `JBH-Prove-it-pack.zip` and puts the photo into the page.

## Deploy (one time, all in the Cloudflare dashboard)

The code lives in GitHub at `jbh-dev/prove-it`, and Cloudflare publishes every push to `main` automatically. The leads table creates itself on the first sign-up, so you don't need to run any SQL.

1. **Database:** go to **Storage & Databases > D1 > Create database**, name it `prove-it-leads` and click **Create**.
2. **Site:** go to **Workers & Pages > Create > Pages > Connect to Git** and pick `jbh-dev/prove-it`. Use these settings:
   - Production branch: `main`
   - Framework preset: None
   - Build command: leave it empty
   - Build output directory: `public`

   Then click **Save and Deploy**.
3. **Connect the database:** go to **prove-it > Settings > Bindings > Add > D1 database**. Set the variable name to `DB` and choose `prove-it-leads`.
4. **Password:** go to **prove-it > Settings > Variables and Secrets > Add**. Set the type to Secret, the name to `LEADS_PASSWORD`, and the value to the password Jane will use.
5. **Redeploy:** go to **Deployments**, open the latest deployment, then click **... > Retry deployment** so steps 3 and 4 take effect.

The site is now live at `https://prove-it-e8u.pages.dev`. Cloudflare may add a suffix if that name is taken.

**Command-line alternative:** rename `wrangler.example.toml` to `wrangler.toml` and run these commands:

```bash
wrangler d1 create prove-it-leads          # paste the database_id into wrangler.toml
wrangler pages project create prove-it --production-branch main
wrangler pages secret put LEADS_PASSWORD --project-name prove-it
wrangler pages deploy
```

Don't commit a `wrangler.toml` to the repo. When one exists, Cloudflare ignores the bindings set in the dashboard.

## Point the domain at it

In Cloudflare, open **Workers & Pages > prove-it > Custom domains > Set up a custom domain** and enter `proveit.jbh.co.uk`. Then follow the steps for wherever jbh.co.uk's DNS is managed.

**If jbh.co.uk's DNS is already on Cloudflare:** Cloudflare adds the record for you. Nothing else to do.

**If the DNS is somewhere else** (GoDaddy, 123-reg, the web host's control panel), add one record there:

| Type | Name / Host | Value / Points to | TTL |
|---|---|---|---|
| CNAME | `proveit` | `prove-it-e8u.pages.dev` | 1 hour (or Auto) |

- Use the exact `*.pages.dev` address Cloudflare shows for your project as the value.
- Most panels want just `proveit` as the name, not the full `proveit.jbh.co.uk`.
- Don't touch the existing `@`, `www` or `MX` records. The main website and email are unaffected.
- Go back to Cloudflare's Custom domains screen and wait for **Active**. The SSL certificate is issued automatically. This usually takes a few minutes and can take up to 24 hours.

### Check it works

```bash
dig +short CNAME proveit.jbh.co.uk      # should print prove-it-e8u.pages.dev.
curl -sI https://proveit.jbh.co.uk | head -1   # should print HTTP/2 200
```

Or open https://www.whatsmydns.net/#CNAME/proveit.jbh.co.uk and check that the results show `prove-it-e8u.pages.dev`.

Finally, submit the form once with your own details, download a file, then open `https://proveit.jbh.co.uk/leads`. Sign in with the `LEADS_PASSWORD`, and your test sign-up should be at the top.

## Sign-ups page (for Jane)

`https://proveit.jbh.co.uk/leads` shows every sign-up as it arrives. Share that link and the `LEADS_PASSWORD` with Jane.

- It refreshes every 30 seconds, and new rows since the last visit get a pink dot.
- You can search, filter to "Wants to talk" and download a CSV.
- Ticking "Keep me signed in" remembers the password on that device only.
- The page is hidden from search engines. Without the password it shows nothing, and the data stays in the D1 database.
- To change the password, run `wrangler pages secret put LEADS_PASSWORD --project-name prove-it` and redeploy.
- The raw CSV is also at `/api/leads`. It uses any username plus the password.

## Local development

```bash
python3 build.py
wrangler d1 execute prove-it-leads --local --file=schema.sql
echo "LEADS_PASSWORD=dev" > .dev.vars
wrangler pages dev        # http://localhost:8788
npm test
```

## Notes

- The PDFs are a soft gate. The form shows the links, but anyone with a direct link can still open the files. That's normal for a free pack, and `robots.txt` keeps search engines out of `/pack/`.
- Spam protection is a hidden honeypot field. If bots get through, add Cloudflare Turnstile (free).
- "Discuss GEO support with JBH" opens an email to jane@jbh.co.uk. Swap in the jbh.co.uk contact page URL if you'd prefer.
- Fonts are the Proxima Nova Light and Bold web fonts already used in the Hub. Extrabold isn't in the brand folder, so titles use Bold. Drop in `ProximaNova-Extrabold.woff2` and switch the headings to weight 800 to match the brand exactly.
