import type { PgColumn } from 'drizzle-orm/pg-core'
import type { CoffeeDetails } from '#shared/types/coffee'

export type DropPhoto = (url: string | null) => void

export type CatalogCoffee = Omit<CoffeeDetails, 'altitudeFrom' | 'altitudeTo'> &
  Partial<Pick<CoffeeDetails, 'altitudeFrom' | 'altitudeTo'>>

export interface NameScope {
  column: PgColumn
  value: string | null
}
