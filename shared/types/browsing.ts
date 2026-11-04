import type { z } from 'zod'
import type { browsingFilters } from '../utils/browsing'
import type { browsingSearchSchema } from '../utils/schemas'

export type BrowsingFilterKind = (typeof browsingFilters)[number]

export type BrowsingSearch = z.output<typeof browsingSearchSchema>
