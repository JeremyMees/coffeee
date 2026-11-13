import { describe, expect, it } from 'vitest'
import { base64UrlToBytes } from '~/utils/push'

describe('base64UrlToBytes', () => {
  it('reads a key written in URL-safe base64 without padding', () => {
    expect([...base64UrlToBytes('-_8')]).toEqual([251, 255])
    expect([...base64UrlToBytes('AQID')]).toEqual([1, 2, 3])
  })
})
