import { describe, expect, it } from 'vitest'
import {
  coffeePath,
  idFrom,
  newCode,
  roasterPath,
  shelfCoffeePath,
  shelfPath,
  slugFor,
  slugify,
} from '#shared/utils/slugs'

describe('newCode', () => {
  it('makes short codes of lowercase letters and digits, never with a dash', () => {
    const codes = Array.from({ length: 200 }, newCode)

    for (const code of codes) expect(code).toMatch(/^[a-z0-9]{8}$/)
    expect(new Set(codes).size).toBe(200)
  })
})

describe('slugify', () => {
  it.each([
    ['dit is een test', 'dit-is-een-test'],
    ["Sarah's shelf", 'sarahs-shelf'],
    ['Café de la Paix – Paris', 'cafe-de-la-paix-paris'],
    ['  Ayele   Fulasa!  ', 'ayele-fulasa'],
    ['Finca El Paraíso - Lychee', 'finca-el-paraiso-lychee'],
    ['☕☕', ''],
  ])('turns %j into %j', (name, slug) => {
    expect(slugify(name)).toBe(slug)
  })

  it('keeps long names short, without a dash at the end', () => {
    const slug = slugify(
      'A very long coffee name that goes on and on - and on forever',
    )

    expect(slug.length).toBeLessThanOrEqual(40)
    expect(slug).not.toMatch(/-$/)
  })
})

describe('slugFor and idFrom', () => {
  it('puts the id after the name', () => {
    expect(slugFor({ id: 'k3x9q2ab', name: 'dit is een test' })).toBe(
      'dit-is-een-test-k3x9q2ab',
    )
  })

  it('is just the id when the name has nothing to show', () => {
    expect(slugFor({ id: 'k3x9q2ab', name: '☕' })).toBe('k3x9q2ab')
  })

  it.each(['dit-is-een-test-k3x9q2ab', 'whatever-k3x9q2ab', 'k3x9q2ab'])(
    'finds the id in %j',
    slug => {
      expect(idFrom(slug)).toBe('k3x9q2ab')
    },
  )
})

describe('paths', () => {
  const shelf = { id: 'home1234', name: "Sarah's shelf" }
  const coffee = { id: 'c0ffee12', name: 'Ayele Fulasa' }

  it('builds the paths to shelves, coffees and roasters', () => {
    expect(shelfPath(shelf)).toBe('/shelves/sarahs-shelf-home1234')
    expect(shelfCoffeePath(shelf, coffee)).toBe(
      '/shelves/sarahs-shelf-home1234/coffees/ayele-fulasa-c0ffee12',
    )
    expect(coffeePath(coffee)).toBe('/coffees/ayele-fulasa-c0ffee12')
    expect(roasterPath({ id: 'sqm12345', name: 'Square Mile' })).toBe(
      '/roasters/square-mile-sqm12345',
    )
  })
})
