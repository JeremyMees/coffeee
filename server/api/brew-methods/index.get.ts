import { defineEventHandler } from 'h3'
import { listBrewMethods } from '#server/utils/brew-methods'
import { useDb } from '#server/utils/db'
import { requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  await requireUser(event)

  return listBrewMethods(useDb())
})
