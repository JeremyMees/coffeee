import { createError, defineEventHandler, getRouterParam } from 'h3'
import { grindSettingSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { setGrindSetting } from '#server/utils/grind-settings'
import { requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const change = await readValidBody(event, grindSettingSchema)

  const saved = await setGrindSetting(useDb(), {
    shelfId: shelf.id,
    coffeeId: getRouterParam(event, 'coffeeId')!,
    userId: user.id,
    change,
  })

  if (saved.outcome === 'missing') {
    throw createError({ statusCode: 404, statusMessage: saved.message })
  }

  return saved.grindSetting
})
