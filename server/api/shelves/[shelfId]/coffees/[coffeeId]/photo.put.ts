import { defineEventHandler } from 'h3'
import { replaceCoffeePhoto } from '#server/utils/coffees'
import { useDb } from '#server/utils/db'
import { readPhoto, storePhoto } from '#server/utils/photos'
import { requireEditableCoffee } from '#server/utils/session'

export default defineEventHandler(async event => {
  const coffee = await requireEditableCoffee(event)
  const photoUrl = await storePhoto(await readPhoto(event))

  return replaceCoffeePhoto(useDb(), coffee, photoUrl)
})
