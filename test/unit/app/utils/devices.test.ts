import { describe, expect, it } from 'vitest'
import { isIPhone, isPhone } from '~/utils/devices'

const android =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const androidTablet =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const iPhone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const mac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

describe('isIPhone', () => {
  it('knows an iPhone from everything else', () => {
    expect(isIPhone(iPhone)).toBe(true)
    expect(isIPhone(android)).toBe(false)
    expect(isIPhone(mac)).toBe(false)
  })
})

describe('isPhone', () => {
  it('counts iPhones and Android phones, not tablets or computers', () => {
    expect(isPhone(iPhone)).toBe(true)
    expect(isPhone(android)).toBe(true)
    expect(isPhone(androidTablet)).toBe(false)
    expect(isPhone(mac)).toBe(false)
    expect(isPhone('')).toBe(false)
  })
})
