# Deploy from GitHub Actions, not Vercel's git integration

Nothing reaches Vercel unless it passed validation (lint, format, typecheck,
tests with an 80% coverage gate, Playwright), so deploys run from GitHub Actions
with the Vercel CLI and Vercel's own git auto-deploys are turned off, the same
setup as our other apps. A pull request gets its own Neon branch
(`preview/pr-<number>`), migrated and passed to a preview deploy, which is
deleted when the pull request closes. A push to `main` migrates the production
database and then deploys with `--prod`; a failing migration stops the deploy,
so every migration must stay compatible with the version still running. Node.js
is pinned to 24, the newest version Vercel Functions run.
