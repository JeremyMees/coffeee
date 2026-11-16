import { describe, expect, it } from 'vitest'
import { isIPhone, isPhone, notificationSettingsPlace } from '~/utils/devices'

const android =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const androidTablet =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const iPhone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const chrome =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const edge =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
const firefox =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:132.0) Gecko/20100101 Firefox/132.0'
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

describe('notificationSettingsPlace', () => {
  it('points installed apps to the phone settings', () => {
    expect(notificationSettingsPlace(iPhone, true)).toBe('iPhoneApp')
    expect(notificationSettingsPlace(android, true)).toBe('androidApp')
  })

  it('knows the browser everywhere else', () => {
    expect(notificationSettingsPlace(android, false)).toBe('chromium')
    expect(notificationSettingsPlace(chrome, false)).toBe('chromium')
    expect(notificationSettingsPlace(edge, false)).toBe('chromium')
    expect(notificationSettingsPlace(firefox, false)).toBe('firefox')
    expect(notificationSettingsPlace(mac, false)).toBe('safari')
    expect(notificationSettingsPlace(mac, true)).toBe('safari')
    expect(notificationSettingsPlace('', false)).toBe('other')
  })
})
