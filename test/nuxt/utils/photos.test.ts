import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressPhoto, fittedSize, vectorSize } from '#imports'

describe('fittedSize', () => {
  it('shrinks the longest edge to fit', () => {
    expect(fittedSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fittedSize(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('never makes a small photo bigger', () => {
    expect(fittedSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('vectorSize', () => {
  it('draws a vector logo large, keeping its shape', () => {
    expect(
      vectorSize(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"/>',
      ),
    ).toEqual({ width: 1024, height: 256 })
  })

  it('reads the shape from the view box when there is no size', () => {
    expect(
      vectorSize(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 60"/>',
      ),
    ).toEqual({ width: 512, height: 1024 })
  })

  it('ignores sizes that are not in pixels', () => {
    expect(
      vectorSize(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 10 10"/>',
      ),
    ).toEqual({ width: 1024, height: 1024 })
  })

  it('draws a square when the logo gives no size at all', () => {
    expect(vectorSize('<svg xmlns="http://www.w3.org/2000/svg"/>')).toEqual({
      width: 1024,
      height: 1024,
    })
  })
})

describe('compressPhoto', () => {
  const drawImage = vi.fn()
  const fillRect = vi.fn()
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
      fillRect,
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
    fillRect.mockClear()
  })

  it('shrinks the photo and saves it as WebP', async () => {
    const photo = await compressPhoto(new Blob(['huge']))

    expect(photo.type).toBe('image/webp')
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1600, 1200)
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(close).toHaveBeenCalled()
  })

  it('draws a vector logo before shrinking it', async () => {
    const bitmap = vi.mocked(createImageBitmap)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:logo')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue()
    vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue()
    const svg = new Blob(
      ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"/>'],
      { type: 'image/svg+xml' },
    )

    const photo = await compressPhoto(svg)

    expect(photo.type).toBe('image/webp')
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      0,
      0,
      1024,
      512,
    )
    expect(bitmap).toHaveBeenCalledWith(expect.any(HTMLCanvasElement))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:logo')
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
