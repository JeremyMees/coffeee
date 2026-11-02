import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schemas'

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
