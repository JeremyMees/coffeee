import type { createTestAuth } from '#test/support/auth'
import type { createTestDatabase } from '#test/support/database'

export type TestAuth = Awaited<ReturnType<typeof createTestAuth>>

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db']
