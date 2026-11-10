import { describe, expect, it } from 'vitest'
import {
  emptyRoasterFilter,
  isRoasterFiltered,
  roasterFromRoute,
  roasterQuery,
  roasterRoute,
} from '~/utils/roasters'

const denmark = { value: 'DK', label: 'Denmark' }
const unitedKingdom = { value: 'GB', label: 'United Kingdom' }

describe('isRoasterFiltered', () => {
  it('is filtered by a country or Bought from, not by nothing', () => {
    expect(isRoasterFiltered(emptyRoasterFilter())).toBe(false)
    expect(isRoasterFiltered({ country: [denmark], boughtFrom: false })).toBe(
      true,
    )
    expect(isRoasterFiltered({ country: [], boughtFrom: true })).toBe(true)
  })
})

describe('roasterQuery', () => {
  it('asks for everything without a search or filters', () => {
    expect(roasterQuery('  ', emptyRoasterFilter())).toEqual({})
  })

  it('asks for what was typed, the countries and Bought from', () => {
    expect(
      roasterQuery(' cabra ', { country: [denmark], boughtFrom: true }),
    ).toEqual({ search: 'cabra', countryCode: 'DK', boughtFrom: 'true' })
    expect(
      roasterQuery('', {
        country: [denmark, unitedKingdom],
        boughtFrom: false,
      }),
    ).toEqual({ countryCode: ['DK', 'GB'] })
  })
})

describe('roasterRoute', () => {
  it('keeps the search as q, next to the filters', () => {
    expect(
      roasterRoute('cabra', { country: [denmark], boughtFrom: true }),
    ).toEqual({ q: 'cabra', countryCode: 'DK', boughtFrom: 'true' })
    expect(roasterRoute('', emptyRoasterFilter())).toEqual({})
  })
})

describe('roasterFromRoute', () => {
  it('reads the search and filters back with the country names', () => {
    expect(
      roasterFromRoute({
        q: 'cabra',
        countryCode: ['DK', 'GB', 'XX'],
        boughtFrom: 'true',
      }),
    ).toEqual({
      search: 'cabra',
      filter: { country: [denmark, unitedKingdom], boughtFrom: true },
    })
  })

  it('starts empty from an empty address', () => {
    expect(roasterFromRoute({})).toEqual({
      search: '',
      filter: emptyRoasterFilter(),
    })
  })
})
