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
a dot outside `/api/`, `/_` and the public pages, and from any `.php` path to
`/sign-in`. That is the cookie name Better Auth uses on Vercel, where it runs in
production mode. The edge keeps the path in `redirect` but drops the query
string, which only matters for a signed-out `/?add=coffee` shortcut. Paths with
a dot are left alone so static files like `/sw.js` are still served; the Nitro
middleware covers the rest, and every host that is not Vercel.
