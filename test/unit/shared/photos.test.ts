import { describe, expect, it } from 'vitest'
import { blobHost, isPhotoType, photoTypeOf } from '#shared/utils/photos'

describe('isPhotoType', () => {
  it('takes the formats a shrunk photo comes in', () => {
    expect(isPhotoType('image/webp')).toBe(true)
    expect(isPhotoType('image/jpeg')).toBe(true)
  })

  it('refuses anything else', () => {
    expect(isPhotoType('image/png')).toBe(false)
    expect(isPhotoType('toString')).toBe(false)
    expect(isPhotoType(undefined)).toBe(false)
  })
})

describe('photoTypeOf', () => {
  it('reads the type from the file name', () => {
    expect(photoTypeOf('coffees/a.webp')).toBe('image/webp')
    expect(photoTypeOf('coffees/a.jpg')).toBe('image/jpeg')
    expect(photoTypeOf('coffees/a.png')).toBeUndefined()
  })
})

describe('blobHost', () => {
  it('finds the store host in the read-write token', () => {
    expect(
      blobHost({ BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_AbC123_secret' }),
    ).toBe('abc123.public.blob.vercel-storage.com')
  })

  it('prefers the store id when it is set', () => {
    expect(
      blobHost({
        BLOB_STORE_ID: 'store_XyZ9',
        BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_AbC123_secret',
      }),
    ).toBe('xyz9.public.blob.vercel-storage.com')
  })

  it('has no host without a store', () => {
    expect(blobHost({})).toBeUndefined()
  })
})
