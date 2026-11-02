import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressPhoto, fittedSize } from '#imports'

describe('fittedSize', () => {
  it('shrinks the longest edge to fit', () => {
    expect(fittedSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fittedSize(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('never makes a small photo bigger', () => {
    expect(fittedSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('compressPhoto', () => {
  const drawImage = vi.fn()
  const close = vi.fn()
  let encodes: Record<string, Blob | null>

  beforeEach(() => {
    encodes = { 'image/webp': new Blob(['small'], { type: 'image/webp' }) }
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 4000, height: 3000, close })),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (done, type) =>
        done(
          type! in encodes
            ? encodes[type!]!
            : new Blob([], { type: 'image/png' }),
        ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    drawImage.mockClear()
  })

  it('shrinks the photo and saves it as WebP', async () => {
    const photo = await compressPhoto(new Blob(['huge']))

    expect(photo.type).toBe('image/webp')
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(close).toHaveBeenCalled()
  })

  it('falls back to JPEG where WebP cannot be made', async () => {
    encodes = { 'image/jpeg': new Blob(['small'], { type: 'image/jpeg' }) }

    const photo = await compressPhoto(new Blob(['huge']))

    expect(photo.type).toBe('image/jpeg')
  })

  it('explains when the photo cannot be shrunk', async () => {
    encodes = { 'image/jpeg': null }

    await expect(compressPhoto(new Blob(['huge']))).rejects.toMatchObject({
      statusMessage: 'That photo could not be shrunk',
    })
  })

  it('explains when the file is not a photo', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('bad image')
      }),
    )

    await expect(compressPhoto(new Blob(['text']))).rejects.toMatchObject({
      statusMessage: 'That file is not a photo we can read',
    })
  })
})
