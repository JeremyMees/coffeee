import type { Email } from '#server/types/email'
import type { PushMessage, PushTarget } from '#server/types/push'
import type { TestAuth, TestDatabase } from '#test/support/types'

export const server = {
  db: undefined as TestDatabase | undefined,
  auth: undefined as TestAuth | undefined,
  cookie: undefined as string | undefined,
  outbox: [] as Email[],
  pushes: [] as { target: PushTarget; message: PushMessage }[],
  failures: [] as (() => void)[],
  inFlight: new Set<Promise<unknown>>(),
  holds: [] as {
    method: string
    path: string
    gate: Promise<void>
    release: () => void
  }[],
}
