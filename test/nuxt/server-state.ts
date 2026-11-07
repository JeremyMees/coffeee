import type { Email } from '#server/types/email'
import type { TestAuth, TestDatabase } from '#test/support/types'

export const server = {
  db: undefined as TestDatabase | undefined,
  auth: undefined as TestAuth | undefined,
  cookie: undefined as string | undefined,
  outbox: [] as Email[],
  failures: [] as (() => void)[],
  inFlight: new Set<Promise<unknown>>(),
  holds: [] as {
    method: string
    path: string
    gate: Promise<void>
    release: () => void
  }[],
}
