# Email and password sign-in, emails sent through Plunk with Maizzle

Shelves bring invites and notifications, so the app has to send email anyway.
That removes the main reason ADR 0002 gave for skipping passwords, so people can
now choose between Google, email and password, and passkeys. Password sign-in
uses Better Auth's built-in email and password support, with email verification
and password reset. Emails are written as Vue templates and built with Maizzle
through `@maizzle/nuxt`, which turns Tailwind classes into inlined, email-safe
HTML plus a plain-text version, and they are sent through Plunk's HTTP API from
a domain Jeremy owns, the same setup as dnd-tracker.

## Consequences

- Sign-up stays invite-only: a password account can only be created from an
  invite. An invite that arrived by email proves the address; any other password
  sign-up must verify its email before it can sign in.
- Accounts with the same verified email are linked, so signing in with Google
  after signing up with a password reaches the same user.
- Emails are sent from Jeremy's own domain, verified in Plunk, while the app
  itself stays on its `vercel.app` address for now.
- Email sending sits behind one server util, so tests replace it and assert on
  what would have been sent instead of calling Plunk.

## Considered Options

- **Resend**: a generous free tier and a good API, but dnd-tracker already uses
  Plunk, and one email provider across projects is simpler to run.
- **Gmail over SMTP**: free and needs no domain, but mail comes from a personal
  address and app passwords are easy to lose.
- **Vue Email**: renders Vue components to email HTML at runtime, but Maizzle is
  already in use in dnd-tracker and its Tailwind output is more battle-tested
  across mail clients.
