import { createApp, createRouter, defineEventHandler, toWebHandler } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deletePhoto,
  readLocalPhoto,
  readPhoto,
  storePhoto,
} from '#server/utils/photos'
import { storages } from '#test/support/nitro'

const blob = vi.hoisted(() => ({
  put: vi.fn(async (pathname: string) => ({
    url: `https://store.public.blob.vercel-storage.com/${pathname}`,
  })),
  del: vi.fn(async () => {}),
}))

vi.mock('@vercel/blob', () => blob)

beforeEach(() => {
  storages.clear()
  blob.put.mockClear()
  blob.del.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const photo = { data: Buffer.from('bag'), type: 'image/webp' as const }

function upload(body?: FormData) {
  const router = createRouter().put(
    '/photo',
    defineEventHandler(async event => {
      const { data, type } = await readPhoto(event)

      return { size: data.byteLength, type }
    }),
  )

  return toWebHandler(createApp().use(router))(
    new Request('http://localhost/photo', { method: 'PUT', body }),
  )
}

function formWith(file: Blob, name = 'photo', filename = 'photo.webp') {
  const form = new FormData()
  form.append(name, file, filename)

  return form
}

describe('reading an uploaded photo', () => {
  it('takes a shrunk photo', async () => {
    const response = await upload(
      formWith(new Blob(['bag'], { type: 'image/webp' })),
    )

    expect(await response.json()).toEqual({ size: 3, type: 'image/webp' })
  })

  it('asks for a photo when there is none', async () => {
    const response = await upload(new FormData())

    expect(response.status).toBe(400)
    expect((await response.json()).statusMessage).toBe('Pick a photo first')
  })

  it('ignores a field that is not a file', async () => {
    const form = new FormData()
    form.append('photo', 'not a file')

    expect((await upload(form)).status).toBe(400)
  })

  it('refuses other formats', async () => {
    const response = await upload(
      formWith(new Blob(['bag'], { type: 'image/png' })),
    )

    expect(response.status).toBe(415)
    expect((await response.json()).statusMessage).toBe(
      'Upload the photo as a JPEG or WebP image',
    )
  })

  it('refuses a photo that was not shrunk', async () => {
    const huge = new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], {
      type: 'image/jpeg',
    })

    const response = await upload(formWith(huge, 'photo', 'photo.jpg'))

    expect(response.status).toBe(413)
    expect((await response.json()).statusMessage).toBe(
      'That photo is too large',
    )
  })
})

describe('storing a photo without Blob', () => {
  it('keeps it locally and serves it from the app', async () => {
    const url = await storePhoto(photo)

    expect(url).toMatch(/^\/api\/photos\/coffees\/[\w-]+\.webp$/)
    expect(await readLocalPhoto(url.slice('/api/photos/'.length))).toBe(
      photo.data,
    )
    expect(blob.put).not.toHaveBeenCalled()
  })

  it('deletes it again', async () => {
    const url = await storePhoto(photo)
    const pathname = url.slice('/api/photos/'.length)

    await deletePhoto(url)

    expect(await readLocalPhoto(pathname)).toBeNull()
    expect(blob.del).not.toHaveBeenCalled()
  })

  it('only serves photo paths', async () => {
    expect(await readLocalPhoto('../.env')).toBeNull()
  })
})

describe('storing a photo on Blob', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_store_secret')
    vi.stubEnv('VERCEL_ENV', 'production')
  })

  it('uploads it publicly under its environment and returns its url', async () => {
    const url = await storePhoto({ ...photo, type: 'image/jpeg' })

    expect(url).toMatch(
      /^https:\/\/store\.public\.blob\.vercel-storage\.com\/production\/coffees\/[\w-]+\.jpg$/,
    )
    expect(blob.put).toHaveBeenCalledWith(
      expect.stringMatching(/^production\/coffees\/[\w-]+\.jpg$/),
      photo.data,
      { access: 'public', contentType: 'image/jpeg' },
    )
  })

  it('keeps photos apart while developing', async () => {
    vi.stubEnv('VERCEL_ENV', undefined)

    await storePhoto(photo)

    expect(blob.put).toHaveBeenCalledWith(
      expect.stringMatching(/^development\/coffees\//),
      photo.data,
      expect.anything(),
    )
  })

  it('deletes a photo of its own environment', async () => {
    const url =
      'https://store.public.blob.vercel-storage.com/production/coffees/a.webp'

    await deletePhoto(url)

    expect(blob.del).toHaveBeenCalledWith(url)
  })

  it('leaves the photos of production alone in a preview', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')

    await deletePhoto(
      'https://store.public.blob.vercel-storage.com/production/coffees/a.webp',
    )

    expect(blob.del).not.toHaveBeenCalled()
  })
})

describe('deleting no photo', () => {
  it('does nothing', async () => {
    await deletePhoto(null)

    expect(blob.del).not.toHaveBeenCalled()
  })
})
