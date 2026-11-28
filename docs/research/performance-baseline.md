# Performance baseline

Date: 2026-11-28

The numbers every change under issue #113 is compared against, where they come
from and how to measure them again. Nothing here has been changed by those fixes
yet, except where a section says so.

## Sources

- **Sentry**: organisation `kees`, project `coffeee`. Page loads, navigations
  and API transactions with their spans, last 30 days up to 28 November 2026.
- **Vercel Usage page** (team `lilmees`, Hobby plan): Active CPU, function calls
  and limits per project, last 30 days.
- **Vercel API and CLI**: CDN request records through `vercel logs requests`.
  Hobby keeps only the last 12 hours of them; anything older needs Observability
  Plus.

## Speed (Sentry, last 30 days)

79 page loads, 171 navigations and about 1,235 API calls, almost all from one
shelf.

| Measure                                         | Value                                          |
| ----------------------------------------------- | ---------------------------------------------- |
| Cold open, time to first byte                   | about 6.1 s                                    |
| Cold open, fully loaded                         | 8–11 s (shelf page load p75 8.3 s, p95 11.1 s) |
| Warm open, time to first byte                   | 150–400 ms                                     |
| Shelf page loads hitting the 3 s worker timeout | 14 of 31                                       |
| API calls                                       | p50 97 ms, p75 212 ms, p95 2.75 s              |
| API calls over 1.5 s                            | 8.4%, nearly all cold starts                   |
| Cold start before the first span                | 2.3–3.9 s                                      |
| First database connection while Neon wakes      | 0.5–1.9 s                                      |
| Requests opening a new connection               | 48% (p50 93 ms)                                |
| A single query                                  | p50 10.6 ms, p95 38 ms                         |

- The coffee detail runs 9 parallel queries, each on its own connection. The
  session check is 2 queries one after another, and it runs 4 times when a
  coffee page opens. That page also fetches the coffee detail twice.
- Routes by total server time: current stock, coffee detail, unread
  notifications count, library, grind settings.
- Queries per request, counted on PGlite by
  `test/unit/server/api/query-budgets.test.ts`: library 6 (15 with a search),
  catalog 6 (15 with a search), current stock 6, coffee detail 13 from the
  catalog and 14 from the shelf, the shelf's roasters 4, `/api/me` 3.

## Cost (Vercel, last 30 days)

| Measure        | Value                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Active CPU     | 2 h 21 min, 73% of the team's 3 h 13 min; Hobby's limit is 4 h a month    |
| Per day        | peak about 10 min around 8 November, about 3 min now                      |
| Per call       | close to 1 s on average; a cold start 0.8–1.0 s, a warm sign-in 30–190 ms |
| Cold boot      | 2.5–3 s                                                                   |
| Function calls | about 534 a day (5–16 November), about 115 a day (25–27 November)         |
| Memory         | 4% of the provisioned limit                                               |

The drop in function calls came from the edge redirect for signed-out visitors
(ADR 0014).

## Bots

From the issue's 12-hour sample: about half of all function calls came from
bots. 88 sign-in renders, 79 of them flagged as bots; 69 scanner requests for
paths the app doesn't have; and a `sitewatch/1.0; contract-address monitor`
crawler loading the whole site about every 36 minutes, a third of all requests.

A second 12-hour sample, taken on 28 November up to 14:02 UTC, before the bot
rules of issue #115 went live: 2,949 CDN requests.

- `sitewatch` made 814 of them: 757 static files, 19 function calls, 19 edge
  redirects and 19 apex-to-www redirects. It loads `/` and every `_nuxt` chunk
  each time.
- 409 requests were scanners. 64 of them still started a function (of 556
  function calls in the sample), because their path has a dot and the edge
  redirect leaves those alone: `/wp-sitemap-users-1.xml`, `/author-sitemap.xml`,
  `/sitemap.xml`, `/sitemap_index.xml`, `/readme.html`,
  `/wp-json/oembed/1.0/embed`, `/wp-json/webmention/1.0`,
  `/index.php/wp-json/wp/v2/users`, `/llms.txt` and the
  `/apple-touch-icon(-precomposed).png` guesses.
- The other 345 did not: 331 got the edge redirect to sign in and 14 got the
  apex-to-www redirect: `/wp-json/…`, `/wp-admin/…`, `.php` paths, `/feed/`,
  `/rss/`, `/graphql`, `/api/graphql`, `/backup/`, `/v2/`.

Since #115, those paths get a 404 and `sitewatch` gets a 403 at the edge; see
ADR 0014.

## Region

The functions ran in `cdg1` (Paris) while Neon runs in AWS eu-central-1
(Frankfurt). The function region is set to `fra1` in the Vercel dashboard
(Settings → Functions), not in code; the project API reports
`serverlessFunctionRegion: fra1`.

A redeploy from the dashboard does not apply it. On 28 November at 14:08 UTC
production was redeployed from commit `ae196aa`, and `vercel inspect` still
listed every function in `cdg1`, with responses carrying
`x-vercel-id: cdg1::cdg1::…`. A redeploy reuses the existing build, and
production is built by GitHub Actions (ADR 0003), so the region changes with the
next push to `main`.

Status: pending the next production deploy. Once it is live, a response should
carry `x-vercel-id: cdg1::fra1::…`; record its date here.

## Measuring again

- **Region**:
  `curl -s -o /dev/null -D - https://www.coffeee.app/sign-in | grep x-vercel-id`.
  The last region before the request id is the one the function ran in.
- **Speed**: in Sentry, open Insights → Frontend for page loads and navigations,
  and Insights → Backend for the API transactions. Filter on the production
  environment and the same 30-day window, and compare the same percentiles. Open
  a few slow transactions to see their spans.
- **Database work per request**: the `Server-Timing` header on every API
  response, and the budgets in `test/unit/server/api/query-budgets.test.ts`. See
  the README.
- **Active CPU and function calls**: the Vercel Usage page for the team,
  filtered to the `coffeee` project, over the last 30 days.
- **Bots**: the last 12 hours of CDN requests, with a token from
  vercel.com/account/tokens:

  ```bash
  VERCEL_TOKEN=… npx vercel logs requests --scope lilmees -p coffeee \
    -e production --since 719m -n 10000 --json > requests.jsonl
  ```

  Each line has `requestPath`, `httpStatus`, `pathType` (`streaming_func` means
  it started a function, `static` and `redirect` did not) and `clientUserAgent`.
