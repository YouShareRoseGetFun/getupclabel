# Get UPC Label

Static UPC-A generator. Deploy this directory as the Cloudflare static asset directory; no build step is needed. All runtime scripts are local in `assets/vendor/`.

Run regression checks with `node --test tests/app.test.cjs`. These use a DOM/PDF stub to check validation, preview limits, export counts and placement; they do not replace browser or physical scanner testing.

## Before production

- In a fresh browser session, generate `03600029145` → `036000291452` and `01234567890` → `012345678905`. Reject `036000291453`, empty values, letters and 10 digits.
- Block `cdn.jsdelivr.net`: generation and all three downloads should still work.
- Test 500 CSV rows (20 previews, all accepted rows exported), leading zeros, malformed files and the 1,500-label limit. Keep UPC spreadsheet cells as text.
- Test Safari on iPhone and Chrome on Android: file selection, PNG/SVG/PDF downloads.
- Print at actual size on Letter paper. Check Avery 5160 offsets (left about 4.8 mm, top 12.7 mm), scan the print, and check three pages for drift. Higher image resolution alone does not guarantee scanner compatibility.
- Confirm production serves `/`, `/privacy.html`, `/terms.html`, `/contact.html`, `/assets/og-image.png`, `/robots.txt` and `/sitemap.xml`.
- Bind `getupclabel.com`, then submit its sitemap to the verified Search Console property. Canonical and sitemap intentionally use the production hostname.
- Disable the workers.dev preview URL or configure a host-specific `X-Robots-Tag: noindex` rule in Cloudflare for preview responses. Do not apply that rule to the production domain.
- Verify the repository Issues feature is enabled for the Contact link before launch.

Label geometry reference: https://www.avery.com/templates/5164 (4 inches across, 3⅓ inches down, six labels per Letter sheet). Physical printer alignment still requires testing.

Vendored versions: JsBarcode 3.11.6, jsPDF 2.5.1, Papa Parse 5.4.1. Upstream copyright/license headers are retained. Review upstream updates before replacing these pinned files.
