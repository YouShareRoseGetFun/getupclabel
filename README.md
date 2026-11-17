# Get UPC Label

Static UPC-A generator. Deploy this directory as the Cloudflare static asset directory; no build step is needed. All runtime scripts are local in `assets/vendor/`.

Run regression checks with `node --test tests/app.test.cjs`. These use a DOM/PDF stub to check validation, preview limits, export counts and placement; they do not replace browser or physical scanner testing.

## Before production

- In a fresh browser session, generate `03600029145` → `036000291452` and `01234567890` → `012345678905`. Reject `036000291453`, empty values, letters and 10 digits.
- Block `cdn.jsdelivr.net`: generation and all three downloads should still work.
- Test 500 CSV rows (20 previews, all accepted rows exported), leading zeros, malformed files and the 1,500-label limit. Keep UPC spreadsheet cells as text.
- Test Safari on iPhone and Chrome on Android: file selection, PNG/SVG/PDF downloads.
- Print at actual size on Letter paper. Check Avery 5160 offsets (left about 4.8 mm, top 12.7 mm), scan the print, and check three pages for drift. Higher image resolution alone does not guarantee scanner compatibility.
- Confirm production serves `/`, `/privacy`, `/terms`, `/contact`, `/assets/og-image.png`, `/robots.txt` and `/sitemap.xml`.
- Bind `getupclabel.com`, then submit its sitemap to the verified Search Console property. Canonical and sitemap intentionally use the production hostname.
- Disable the workers.dev preview URL or configure a host-specific `X-Robots-Tag: noindex` rule in Cloudflare for preview responses. Do not apply that rule to the production domain.
- Add a public support email or accessible feedback URL to Contact when available. The private repository Issues URL is not a public support channel.

Label geometry reference: https://www.avery.com/templates/5164 (4 inches across, 3⅓ inches down, six labels per Letter sheet). Physical printer alignment still requires testing.

Vendored versions: JsBarcode 3.11.6, jsPDF 2.5.1, Papa Parse 5.4.1. Upstream copyright/license headers are retained. Review upstream updates before replacing these pinned files.

## Deployment verification

Cloudflare serves the three supporting HTML files at extensionless URLs. Keep
`privacy.html`, `terms.html`, and `contact.html` as the source filenames; links,
canonicals and sitemap entries use `/privacy`, `/terms`, and `/contact`.

After deployment, fetch the sitemap from the deployed hostname and confirm these
four entries: `/`, `/privacy`, `/terms`, `/contact` (all using the production domain
inside the XML). If only the homepage appears, confirm the deployed commit and
asset directory first, then check caching; the repository sitemap has four entries.
Fetch each vendor script individually and verify it returns JavaScript with status
200 rather than an HTML fallback. The sharing image is a verified 1200 × 630 PNG.

## Content and release checks

The GS1 US pricing table is sourced from the official pricing page linked beside
it. Last checked November 17, 2026. Verify the source and update the displayed date
when changing prices; retain the distinction between free barcode generation and
paid number licensing. Prices differ by GS1 organisation.

To identify the source release, run `git rev-parse HEAD` after committing the
changes. Compare that full SHA with the source commit shown for the active
production deployment in Cloudflare's deployment history. For manual asset
uploads, record the source SHA when uploading. A private GitHub commit URL cannot
prove the active production version to an unauthenticated visitor. The dashboard
comparison requires account access and has not been performed by these local tests.

## Asset directory and public version marker

This repository has no Wrangler configuration file. Its static site files are in
the repository root, so use `.` as the asset/output directory in the deployment
configuration and keep `.assetsignore` here. If a future build copies the website
to `public` or `dist`, copy `.assetsignore` into that output directory as well.
The dashboard asset directory must be checked separately.

`/version.txt` contains a release date and the short SHA of the source commit.
Commit the site changes first, then write `2026-11-17 <source-short-sha>` to
`version.txt` and commit that marker separately. The marker commit follows the
source commit; its own SHA is intentionally different. Refresh the marker for
each release. Confirm its contents after deployment, along with 404 responses
for `/README.md` and `/tests/app.test.cjs`. Robots rules alone do not prevent
files being served.
