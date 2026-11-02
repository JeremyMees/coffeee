import { describe, expect, it } from 'vitest'
import { roasterPlace, websiteHost } from '#shared/utils/roasters'

describe('roasterPlace', () => {
  it('names the city and the country', () => {
    expect(roasterPlace({ city: 'London', countryCode: 'GB' })).toBe(
      'London, United Kingdom',
    )
  })

  it('leaves out what is not known', () => {
    expect(roasterPlace({ city: null, countryCode: 'SE' })).toBe('Sweden')
    expect(roasterPlace({ city: 'Oslo', countryCode: null })).toBe('Oslo')
    expect(roasterPlace({ city: null, countryCode: null })).toBe('')
  })
})

describe('websiteHost', () => {
  it('shows the website without its scheme or www', () => {
    expect(websiteHost('https://www.squaremilecoffee.com/shop')).toBe(
      'squaremilecoffee.com',
    )
    expect(websiteHost('http://lacabra.dk')).toBe('lacabra.dk')
  })
})
