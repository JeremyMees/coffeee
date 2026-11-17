# Security headers from nuxt-security, with its request guards off

Every page gets a content security policy with a fresh nonce on each request,
and the usual hardening headers (frame, content type, referrer and permissions
policies, cross-origin opener and resource policies). nuxt-security sets these
for us and puts the nonce on Nuxt's own inline scripts and styles. Images may
come from the app itself, `data:` and `blob:` URLs (photo previews before
upload), and the Vercel Blob photo host.

We turned off the parts that do not fit Coffeee:

- **Rate limiter**: it counts in each serverless instance's memory, so on Vercel
  it limits nothing reliably. Rate limiting belongs in a Vercel Firewall rule.
- **XSS validator**: it rejects any request whose text contains markup, which
  blocks ordinary coffee notes. Vue escapes what it renders, and emails escape
  their values.
- **CORS handler**: the API is only called from the app's own origin.
- **Logger removal**: it would strip the `console.error` calls Vercel logs show.
- **HSTS**: Vercel already sends it.
- **Cross-origin embedder policy**: it would block photos from the Blob host.
- **Subresource integrity**: the files have hashed names already, and leaving it
  off keeps the service worker's cached files simple.

`upgrade-insecure-requests` is only set on Vercel, so the local and Playwright
builds can run over plain http.
