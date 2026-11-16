import { describe, expect, it } from 'vitest'
import { catalogCoffeePath } from '~/utils/catalog'

const shelf = { id: 's1', name: 'Home' }

describe('catalogCoffeePath', () => {
  it('opens a coffee the shelf bought on the shelf, and any other in the catalog', () => {
    const coffee = { id: 'c1', name: 'Ayele Fulasa' }

    expect(catalogCoffeePath(shelf, { ...coffee, onShelf: true })).toBe(
      '/shelves/home-s1/coffees/ayele-fulasa-c1',
    )
    expect(catalogCoffeePath(shelf, { ...coffee, onShelf: false })).toBe(
      '/coffees/ayele-fulasa-c1',
    )
  })
})
