import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyPhoto, shrinkPhoto } from '#server/utils/photo-copies'
import { readLocalPhoto } from '#server/utils/photos'
import { storages } from '#test/support/nitro'

beforeEach(() => {
  storages.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function image(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: '#e4572e' },
  })
}

function serving(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  )
}

describe('shrinking a photo', () => {
  it('turns any image into WebP that fits the largest edge', async () => {
    const shrunk = await shrinkPhoto(await image(3200, 2000).png().toBuffer())

    expect(shrunk?.type).toBe('image/webp')
    expect(await sharp(shrunk!.data).metadata()).toMatchObject({
      format: 'webp',
      width: 1600,
      height: 1000,
    })
  })

  it('does not enlarge a small photo', async () => {
    const shrunk = await shrinkPhoto(await image(400, 300).jpeg().toBuffer())

    expect(await sharp(shrunk!.data).metadata()).toMatchObject({
      width: 400,
      height: 300,
    })
  })

  it('skips a file that is not an image', async () => {
    expect(await shrinkPhoto(Buffer.from('not a photo'))).toBeNull()
  })
})

describe('copying a photo from elsewhere', () => {
  it('stores a shrunk copy of its own', async () => {
    serving(new Response(await image(800, 600).png().toBuffer()))

    const url = await copyPhoto('https://notion/bag.png', 'coffees')

    expect(url).toMatch(/^\/api\/photos\/coffees\/[\w-]+\.webp$/)

    const stored = await readLocalPhoto(url!.slice('/api/photos/'.length))

    expect((await sharp(stored!).metadata()).format).toBe('webp')
  })

  it('skips a photo it could not download', async () => {
    serving(new Response('gone', { status: 403 }))

    expect(await copyPhoto('https://notion/bag.webp', 'coffees')).toBeNull()
  })

  it('skips a download that is not an image', async () => {
    serving(new Response('<html></html>'))

    expect(await copyPhoto('https://notion/bag.webp', 'coffees')).toBeNull()
  })
})
