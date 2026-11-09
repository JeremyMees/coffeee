import { defineEventHandler } from 'h3'
import { replaceCoffeePhoto } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { requireEditableCoffee } from '#server/utils/session'

export default defineEventHandler(async event => {
  const coffee = await requireEditableCoffee(event)

  return replaceCoffeePhoto(useDb(), coffee, null)
})
