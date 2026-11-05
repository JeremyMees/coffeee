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

const vectorEdge = 1024

function svgLength(root: Element, name: string) {
  const value = root.getAttribute(name)?.trim() ?? ''

  return /^[\d.]+(px)?$/.test(value) ? Number.parseFloat(value) : 0
}

export function vectorSize(svg: string) {
  const root = new DOMParser().parseFromString(
    svg,
    'image/svg+xml',
  ).documentElement
  const box = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/)
  const width = svgLength(root, 'width') || Number(box[2]) || 1
  const height = svgLength(root, 'height') || Number(box[3]) || 1
  const scale = vectorEdge / Math.max(width, height)

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function whiteCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)

  return { canvas, context }
}

async function vectorBitmap(file: Blob) {
  const size = vectorSize(await file.text())
  const url = URL.createObjectURL(file)

  try {
    const image = new Image(size.width, size.height)
    image.src = url
    await image.decode()

    const { canvas, context } = whiteCanvas(size.width, size.height)
    context.drawImage(image, 0, 0, size.width, size.height)

    return await createImageBitmap(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function bitmapOf(file: Blob) {
  try {
    return file.type === 'image/svg+xml'
      ? await vectorBitmap(file)
      : await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw createError({
      statusMessage: 'That file is not a photo we can read',
    })
  }
}

export async function compressPhoto(file: Blob) {
  const bitmap = await bitmapOf(file)
  const size = fittedSize(bitmap.width, bitmap.height)
  const { canvas, context } = whiteCanvas(size.width, size.height)
  context.drawImage(bitmap, 0, 0, size.width, size.height)
  bitmap.close()

  const webp = await encoded(canvas, 'image/webp')
  const photo =
    webp?.type === 'image/webp' ? webp : await encoded(canvas, 'image/jpeg')

  if (!photo) {
    throw createError({ statusMessage: 'That photo could not be shrunk' })
  }

  return photo
}
