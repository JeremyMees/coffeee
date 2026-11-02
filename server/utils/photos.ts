import { del, put } from '@vercel/blob'
import { createError, readMultipartFormData } from 'h3'
import type { H3Event } from 'h3'
import { useStorage } from 'nitropack/runtime'
import {
  isPhotoType,
  photoExtensions,
  photoMaxBytes,
} from '#shared/utils/photos'
import type { PhotoFolder } from '#shared/types/photos'
import type { Photo } from '#server/types/photos'

const localPhotos = '/api/photos/'
const localPathname = /^(coffees|roasters)\/[\w-]+\.(webp|jpg)$/

function onBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function blobScope() {
  return process.env.VERCEL_ENV ?? 'development'
}

export async function readPhoto(event: H3Event): Promise<Photo> {
  const parts = await readMultipartFormData(event)
  const photo = parts?.find(part => part.name === 'photo' && part.filename)

  if (!photo) {
    throw createError({ statusCode: 400, statusMessage: 'Pick a photo first' })
  }

  if (!isPhotoType(photo.type)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Upload the photo as a JPEG or WebP image',
    })
  }

  if (photo.data.byteLength > photoMaxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: 'That photo is too large',
    })
  }

  return { data: photo.data, type: photo.type }
}

export async function storePhoto(
  photo: Photo,
  folder: PhotoFolder,
  scope = blobScope(),
) {
  const pathname = `${folder}/${crypto.randomUUID()}.${photoExtensions[photo.type]}`

  if (onBlob()) {
    const { url } = await put(`${scope}/${pathname}`, photo.data, {
      access: 'public',
      contentType: photo.type,
    })

    return url
  }

  await useStorage('photos').setItemRaw(pathname, photo.data)

  return `${localPhotos}${pathname}`
}

export async function deletePhoto(url: string | null) {
  if (!url) return

  if (url.startsWith(localPhotos)) {
    await useStorage('photos').removeItem(url.slice(localPhotos.length))
    return
  }

  if (new URL(url).pathname.startsWith(`/${blobScope()}/`)) await del(url)
}

export async function readLocalPhoto(pathname: string) {
  if (!localPathname.test(pathname)) return null

  return useStorage('photos').getItemRaw<Buffer>(pathname)
}
