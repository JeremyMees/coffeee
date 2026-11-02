import { defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { readPhoto, storePhoto } from '#server/utils/photos'
import { replaceRoasterLogo } from '#server/utils/roasters'
import { requireEditableRoaster } from '#server/utils/session'

export default defineEventHandler(async event => {
  const roaster = await requireEditableRoaster(event)
  const logoUrl = await storePhoto(await readPhoto(event), 'roasters')

  return replaceRoasterLogo(useDb(), roaster, logoUrl)
})
