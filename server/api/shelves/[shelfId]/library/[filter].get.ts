import { createError, defineEventHandler, getRouterParam } from 'h3'
import type { BrowsingFilterKind } from '#shared/types/browsing'
import { browsingFilters } from '#shared/utils/browsing'
import { libraryFilterSearchSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { listLibraryFilterOptions } from '#server/utils/library'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

function isLibraryFilter(filter: string | undefined) {
  return browsingFilters.includes(filter as BrowsingFilterKind)
}

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)
  const filter = getRouterParam(event, 'filter')

  if (!isLibraryFilter(filter)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'The library has no such filter',
    })
  }

  const search = readValidQuery(event, libraryFilterSearchSchema)

  return listLibraryFilterOptions(useDb(), {
    shelfId: shelf.id,
    kind: filter as BrowsingFilterKind,
    search,
  })
})
