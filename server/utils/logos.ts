import sharp from 'sharp'
import type { Photo } from '#server/types/photos'

const logoEdge = 512
const inkThreshold = 40
const wordmarkRoom = 1.12
const roundAspect = 0.95
const roundSlack = 1.5

interface Region {
  left: number
  top: number
  width: number
  height: number
}

interface Ink extends Region {
  reach: number
}

interface Image {
  pixels: Buffer
  width: number
}

const frameDepth = 3
const crumbWidth = 2
const crumbGap = 3
const crumbPasses = 4

function colourAt({ pixels, width }: Image, x: number, y: number) {
  const offset = (y * width + x) * 3

  return [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!]
}

function differs(image: Image, x: number, y: number, background: number[]) {
  const colour = colourAt(image, x, y)

  return background.some(
    (channel, index) => Math.abs(colour[index]! - channel) > inkThreshold,
  )
}

function inkBounds(
  image: Image,
  region: Region,
  background: number[],
): Region | null {
  const right = region.left + region.width
  const bottom = region.top + region.height
  let inkLeft = right
  let inkTop = bottom
  let inkRight = -1
  let inkBottom = -1

  for (let y = region.top; y < bottom; y++) {
    for (let x = region.left; x < right; x++) {
      if (!differs(image, x, y, background)) continue
      inkLeft = Math.min(inkLeft, x)
      inkTop = Math.min(inkTop, y)
      inkRight = Math.max(inkRight, x)
      inkBottom = Math.max(inkBottom, y)
    }
  }

  if (inkRight < 0) return null

  return {
    left: inkLeft,
    top: inkTop,
    width: inkRight - inkLeft + 1,
    height: inkBottom - inkTop + 1,
  }
}

function inkProfile(
  image: Image,
  region: Region,
  background: number[],
  across: 'rows' | 'columns',
) {
  const lines = across === 'rows' ? region.height : region.width
  const span = across === 'rows' ? region.width : region.height

  return Array.from({ length: lines }, (_, line) =>
    Array.from({ length: span }, (_, step) =>
      across === 'rows'
        ? differs(image, region.left + step, region.top + line, background)
        : differs(image, region.left + line, region.top + step, background),
    ).some(Boolean),
  )
}

function crumbAt(profile: boolean[]) {
  let band = 0
  while (band < profile.length && profile[band]) band++

  let gap = 0
  while (band + gap < profile.length && !profile[band + gap]) gap++

  const separate = band + gap < profile.length

  return separate && band <= crumbWidth && gap >= crumbGap ? band + gap : 0
}

function withoutCrumbs(image: Image, region: Region, background: number[]) {
  const rows = inkProfile(image, region, background, 'rows')
  const columns = inkProfile(image, region, background, 'columns')
  const top = crumbAt(rows)
  const bottom = crumbAt([...rows].reverse())
  const left = crumbAt(columns)
  const right = crumbAt([...columns].reverse())

  if (top + bottom + left + right === 0) return null

  return inkBounds(
    image,
    {
      left: region.left + left,
      top: region.top + top,
      width: region.width - left - right,
      height: region.height - top - bottom,
    },
    background,
  )
}

function findInk(
  image: Image,
  region: Region,
  background: number[],
): Ink | null {
  let bounds = inkBounds(image, region, background)

  if (!bounds) return null

  for (let pass = 0; pass < crumbPasses; pass++) {
    const trimmed = withoutCrumbs(image, bounds, background)

    if (!trimmed) break

    bounds = trimmed
  }

  const centerX = bounds.left + bounds.width / 2
  const centerY = bounds.top + bounds.height / 2
  let reach = 0

  for (let y = bounds.top; y < bounds.top + bounds.height; y++) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x++) {
      if (!differs(image, x, y, background)) continue
      reach = Math.max(reach, Math.hypot(x + 0.5 - centerX, y + 0.5 - centerY))
    }
  }

  return { ...bounds, reach }
}

function isRound(ink: Ink) {
  const longest = Math.max(ink.width, ink.height)
  const squarish = Math.min(ink.width, ink.height) / longest > roundAspect

  return squarish && ink.reach <= longest / 2 + roundSlack
}

function hasPlainBorder(image: Image, region: Region, colour: number[]) {
  const right = region.left + region.width - 1
  const bottom = region.top + region.height - 1

  for (let x = region.left; x <= right; x++) {
    if (differs(image, x, region.top, colour)) return false
    if (differs(image, x, bottom, colour)) return false
  }

  for (let y = region.top; y <= bottom; y++) {
    if (differs(image, region.left, y, colour)) return false
    if (differs(image, right, y, colour)) return false
  }

  return true
}

function findFramedBadge(image: Image, outer: Region) {
  let region = outer

  for (let depth = 0; depth < frameDepth; depth++) {
    const frame = colourAt(image, region.left, region.top)

    if (!hasPlainBorder(image, region, frame)) return null

    const inner = findInk(image, region, frame)

    if (!inner) return null
    if (isRound(inner)) return { ink: inner, background: frame }

    region = inner
  }

  return null
}

function circleEdge(ink: Ink) {
  const longest = Math.max(ink.width, ink.height)

  if (isRound(ink)) return longest

  return Math.ceil(Math.max(longest, 2 * ink.reach + 1) * wordmarkRoom)
}

export async function shapeLogo(data: Buffer): Promise<Photo | null> {
  try {
    const upright = await sharp(data)
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize({
        width: logoEdge,
        height: logoEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { width, height } = upright.info
    const pixels = upright.data
    const image = { pixels, width }
    const whole = { left: 0, top: 0, width, height }
    const outerBackground = colourAt(image, 0, 0)
    const outerInk = findInk(image, whole, outerBackground) ?? {
      ...whole,
      reach: 0,
    }
    const { ink, background } = isRound(outerInk)
      ? { ink: outerInk, background: outerBackground }
      : (findFramedBadge(image, outerInk) ?? {
          ink: outerInk,
          background: outerBackground,
        })
    const edge = circleEdge(ink)
    const left = Math.floor((edge - ink.width) / 2)
    const top = Math.floor((edge - ink.height) / 2)
    const [r, g, b] = background

    const shaped = await sharp(pixels, { raw: { width, height, channels: 3 } })
      .extract({
        left: ink.left,
        top: ink.top,
        width: ink.width,
        height: ink.height,
      })
      .extend({
        left,
        right: edge - ink.width - left,
        top,
        bottom: edge - ink.height - top,
        background: { r: r!, g: g!, b: b! },
      })
      .webp({ quality: 90 })
      .toBuffer()

    return { data: shaped, type: 'image/webp' }
  } catch {
    return null
  }
}
