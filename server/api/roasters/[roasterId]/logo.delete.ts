import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { replaceRoasterLogo } from '#server/utils/roasters'
import { requireEditableRoaster } from '#server/utils/session'

export default defineEventHandler(async event => {
  const roaster = await requireEditableRoaster(event)

  return replaceRoasterLogo(useDb(), roaster, null)
})
