import sharp from 'sharp'
import { photoMaxBytes, photoMaxEdge } from '#shared/utils/photos'
import type { PhotoFolder } from '#shared/types/photos'
import type { Photo } from '#server/types/photos'
import { storePhoto } from '#server/utils/photos'

export async function shrinkPhoto(data: Buffer): Promise<Photo | null> {
  try {
    const shrunk = await sharp(data)
      .rotate()
      .resize({
        width: photoMaxEdge,
        height: photoMaxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer()

    return shrunk.byteLength > photoMaxBytes
      ? null
      : { data: shrunk, type: 'image/webp' }
  } catch {
    return null
  }
}

export async function copyPhoto(
  url: string,
  folder: PhotoFolder,
  scope?: string,
) {
  const response = await fetch(url)

  if (!response.ok) return null

  const photo = await shrinkPhoto(Buffer.from(await response.arrayBuffer()))

  return photo ? storePhoto(photo, folder, scope) : null
}
