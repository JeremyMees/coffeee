# No consent banner

Coffeee only stores what it needs to work: the Better Auth session cookie and a
cookie that remembers the last shelf someone opened. Errors go to Sentry, which
sets no cookies. There is no analytics, advertising or other tracking. So there
is nothing to ask consent for, and we removed the c15t consent banner along with
its "Privacy settings" links.

## Considered Options

- **Keep c15t**: it was about 58 kB gzipped on every first page load and about
  390 kB of chunks in total, mostly IAB TCF and translations we never used. It
  also called its Inth backend while the server rendered each page, and its
  route had a p95 of about 3.9 s in production. Its test setup needed a
  no-prompt mode for the Vitest and Playwright builds. That was a lot of weight
  and complexity for a banner with nothing to manage.

## Consequences

- Anything new that tracks people or sets a cookie the app does not need (such
  as analytics, Sentry Session Replay or an embedded video) needs consent first,
  so a consent banner has to come back before it ships.
