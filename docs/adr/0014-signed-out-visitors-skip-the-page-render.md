# Signed-out visitors skip the page render

Coffeee is invite-only, so nobody without a session has anything to see beyond
the sign-in pages. Still, from the day it went live on coffeee.app, scanners and
uptime bots requested `/`, `/sign-in` and WordPress paths like
`/wp-admin/install.php` around the clock. Each of those rendered the full page
on the server and asked the database for a session before the route middleware
sent them to sign in, at one to three seconds a request. Together they cost more
Vercel Active CPU than the people using the app.

A Nitro middleware now answers signed-out page requests first. When a `GET` or
`HEAD` request for a page (anything outside `/api/` and `/_`) has no Better Auth
session cookie and is not one of the public sign-in, sign-up, password and
invite pages, it gets a `302` to `/sign-in`, with the page it asked for as
`redirect`. It only checks that the cookie is there, not that the session is
valid, so it never touches the database. An expired cookie still reaches the
page, and the route middleware sends that person to sign in as before. Both
middlewares share the public pages and the sign-in link from
`shared/utils/sign-in.ts`.

Sentry no longer traces every server request. Requests started by the app in a
browser carry the browser's trace and keep its decision, so our own requests are
all still traced. Requests without one, mostly bots, are traced one time in ten,
and Vercel's internal `/_vercel/ping` requests are never traced.

Vercel's Firewall rules need a paid plan, so the same redirect also runs on
Vercel's edge, before the function starts. `nitro.vercel.config.routes` adds
routes to the build output that send requests without the
`__Secure-better-auth.session_token` cookie from `/`, from any page path without
a dot outside `/api/`, `/_` and the public pages to `/sign-in`. That is the
cookie name Better Auth uses on Vercel, where it runs in production mode. The
edge keeps the path in `redirect` but drops the query string, which only matters
for a signed-out `/?add=coffee` shortcut. Paths with a dot are left alone so
static files like `/sw.js` are still served; the Nitro middleware covers the
rest, and every host that is not Vercel.

## Scanners and crawlers get no function at all

A redirect still made scanners come back for the sign-in page, and paths with a
dot, like `/readme.html`, `/wp-sitemap-users-1.xml` or `/llms.txt`, slipped past
the edge and started a function to be redirected. On 28 November 2026 that was
64 of 556 function calls in 12 hours. A crawler identifying itself as
`sitewatch/1.0; contract-address monitor` also loaded the whole site about every
36 minutes. The numbers are in `docs/research/performance-baseline.md`.

So two routes now come before the signed-out redirects in
`nitro.vercel.config.routes`, from `shared/utils/bots.ts`:

- Any request whose `user-agent` contains `sitewatch` gets a `403`.
- Paths the app doesn't have and scanners ask for get a `404`, signed in or not:
  WordPress paths (`/wp-…`, `/wp/`, `/wordpress/`), any `.php` path, dotfiles
  like `/.env` and `/.git/…` (but not `/.well-known/`), `/readme.html`,
  `/license.html`, `/graphql` and `/api/graphql`, feeds, `/rss`, the WordPress
  sitemaps, `/llms.txt`, the `apple-touch-icon` guesses, `/backup` and `/v2`.
  The list comes from Vercel's request logs; add a path there when the logs show
  a new one.

Neither route has a destination, so the edge answers with the status and the
request never reaches a function. The `.php` redirect to sign in is gone, since
the `404` covers it. `server/middleware/bots.ts` applies the same two rules
before the signed-out middleware, for every host that is not Vercel and for the
e2e tests, which can't run Vercel's edge. A unit test checks that no page, API
route or public file matches the scanner paths.

`public/sitemap.xml` lists the sign-in and sign-up pages, the only pages a
signed-out visitor can see, and `robots.txt` points to it. It is a static file,
so the CDN serves it without a function.
