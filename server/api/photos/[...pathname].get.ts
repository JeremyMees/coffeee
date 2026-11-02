import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { photoTypeOf } from '#shared/utils/photos'
import { readLocalPhoto } from '#server/utils/photos'

export default defineEventHandler(async event => {
  const pathname = getRouterParam(event, 'pathname')!
  const photo = await readLocalPhoto(pathname)

  if (!photo) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

  setHeader(event, 'content-type', photoTypeOf(pathname)!)
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')

  return photo
})
