import { defineEventHandler } from 'h3'
import { coffeeMatchSchema } from '#shared/utils/schemas'
import { findCatalogCoffee } from '#server/utils/catalog-entries'
import { useDb } from '#server/utils/db'
import { requireShelf } from '#server/utils/session'
import { readValidQuery } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { shelf } = await requireShelf(event)
  const search = readValidQuery(event, coffeeMatchSchema)

  return {
    coffee: await findCatalogCoffee(useDb(), { ...search, shelfId: shelf.id }),
  }
})
