import type { z } from 'zod/mini'
import type { filterLabelsSchema } from '../utils/schemas'

export type FilterLabelSearch = z.output<typeof filterLabelsSchema>

export type FilterLabels = Partial<
  Record<keyof FilterLabelSearch, Record<string, string>>
>
