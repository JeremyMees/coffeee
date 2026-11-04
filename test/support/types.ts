import type { App } from 'h3'
import type { z } from 'zod'
import type { newCoffeeSchema } from '#shared/utils/schemas'
import type { createShelf } from '#server/utils/shelves'
import type { createTestAuth } from '#test/support/auth'
import type { createTestDatabase } from '#test/support/database'
import type { createScenario } from '#test/support/scenarios'

export type TestAuth = Awaited<ReturnType<typeof createTestAuth>>

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>['db']

export type Scenario = ReturnType<typeof createScenario>

export type Member = Awaited<ReturnType<Scenario['member']>>

export type ScenarioShelf = Pick<
  Awaited<ReturnType<typeof createShelf>>,
  'id' | 'ownerId'
>

export type ScenarioCoffee = Partial<z.input<typeof newCoffeeSchema>>

export interface TestWindow {
  __app: App & {
    _registeredEndpointRegistry?: Record<string, { method?: string }[]>
  }
  __registry: Set<string>
  __routesInstalled?: boolean
}

declare module 'vitest' {
  interface ProvidedContext {
    migratedDatabase: string
  }
}
