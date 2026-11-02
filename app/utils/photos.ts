export function fittedSize(
  width: number,
  height: number,
  maxEdge = photoMaxEdge,
) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function encoded(canvas: HTMLCanvasElement, type: PhotoType) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.82))
}

async function bitmapOf(file: Blob) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw createError({
      statusMessage: 'That file is not a photo we can read',
    })
  }
}

export async function compressPhoto(file: Blob) {
  const bitmap = await bitmapOf(file)
  const size = fittedSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()

  const webp = await encoded(canvas, 'image/webp')
  const photo =
    webp?.type === 'image/webp' ? webp : await encoded(canvas, 'image/jpeg')

  if (!photo) {
    throw createError({ statusMessage: 'That photo could not be shrunk' })
  }

  return photo
}
