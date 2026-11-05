import { describe, expect, it } from 'vitest'
import { referredLink, roasterPlace, websiteHost } from '#shared/utils/roasters'

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

describe('referredLink', () => {
  it('tells the roaster the visitor came from coffeee', () => {
    expect(referredLink('https://www.squaremilecoffee.com')).toBe(
      'https://www.squaremilecoffee.com/?utm_source=coffeee&utm_medium=referral',
    )
  })

  it('keeps what the link already asks for', () => {
    expect(referredLink('https://lacabra.dk/shop?variant=250g#beans')).toBe(
      'https://lacabra.dk/shop?variant=250g&utm_source=coffeee&utm_medium=referral#beans',
    )
  })

  it('leaves a link that already names its source alone', () => {
    expect(referredLink('https://lacabra.dk/?utm_source=newsletter')).toBe(
      'https://lacabra.dk/?utm_source=newsletter',
    )
  })
})
