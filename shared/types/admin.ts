import type { z } from 'zod'
import type { adminLists } from '../utils/admin'
import type { adminEntrySearchSchema } from '../utils/schemas'
import type { ListNouns } from './validation'

export type AdminList = (typeof adminLists)[number]

export type AdminListNouns = ListNouns & { uses: string }

export type AdminEntrySearch = z.output<typeof adminEntrySearchSchema>

export interface AdminEntry {
  id: string
  name: string
  detail: string | null
  detailId: string | null
  uses: number
}

export type AdminEntryAction = 'update' | 'merge' | 'delete'

export interface AdminEntryPage {
  total: number
  entries: AdminEntry[]
}
