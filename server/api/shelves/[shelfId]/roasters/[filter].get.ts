import { createError, defineEventHandler, getRouterParam } from 'h3'
import { libraryFilterSearchSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { listRoasterCountries } from '#server/utils/roasters'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  await requireShelf(event)

  if (getRouterParam(event, 'filter') !== 'countries') {
    throw createError({
      statusCode: 404,
      statusMessage: 'The roasters have no such filter',
    })
  }

  const search = readValidQuery(event, libraryFilterSearchSchema)

  return listRoasterCountries(useDb(), search)
})
