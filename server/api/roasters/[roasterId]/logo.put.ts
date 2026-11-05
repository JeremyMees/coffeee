import { createError, defineEventHandler } from 'h3'
import { useDb } from '#server/utils/db'
import { shapeLogo } from '#server/utils/logos'
import { readPhoto, storePhoto } from '#server/utils/photos'
import { replaceRoasterLogo } from '#server/utils/roasters'
import { requireEditableRoaster } from '#server/utils/session'

export default defineEventHandler(async event => {
  const roaster = await requireEditableRoaster(event)
  const logo = await shapeLogo((await readPhoto(event)).data)

  if (!logo) {
    throw createError({
      statusCode: 422,
      statusMessage: 'That logo could not be read as an image',
    })
  }

  const logoUrl = await storePhoto(logo, 'roasters')

  return replaceRoasterLogo(useDb(), roaster, logoUrl)
})
