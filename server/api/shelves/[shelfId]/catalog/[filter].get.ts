import { createError, defineEventHandler, getRouterParam } from 'h3'
import type { BrowsingFilterKind } from '#shared/types/browsing'
import { browsingFilters } from '#shared/utils/browsing'
import { libraryFilterSearchSchema } from '#shared/utils/schemas'
import { listCatalogFilterOptions } from '#server/utils/catalog'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

function isCatalogFilter(filter: string | undefined) {
  return browsingFilters.includes(filter as BrowsingFilterKind)
}

export default defineEventHandler(async event => {
  await requireShelf(event)
  const filter = getRouterParam(event, 'filter')

  if (!isCatalogFilter(filter)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'The catalog has no such filter',
    })
  }

  const search = readValidQuery(event, libraryFilterSearchSchema)

  return listCatalogFilterOptions(useDb(), {
    kind: filter as BrowsingFilterKind,
    search,
  })
})
