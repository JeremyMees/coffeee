import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocale } from '#imports'

beforeEach(() => {
  useState('locale').value = undefined
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useLocale', () => {
  it('takes the language the browser prefers', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['nl-BE', 'en'])

    expect(useLocale().value).toBe('nl-BE')
  })

  it('keeps the locale the page was rendered with', () => {
    useState('locale').value = 'en-GB'
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['nl-BE'])

    expect(useLocale().value).toBe('en-GB')
  })
})
