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

Blocking bots before they reach the function at all is left to Vercel Firewall
rules in the dashboard (Bot Protection, and denying `*.php` and `/wp-*`), as
rate limiting already is
([ADR 0012](0012-security-headers-from-nuxt-security.md)).
