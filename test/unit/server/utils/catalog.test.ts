import { describe, expect, it } from 'vitest'
import { canEditCatalogEntry } from '#server/utils/catalog'

describe('canEditCatalogEntry', () => {
  it('lets the person who added an entry edit it', () => {
    expect(canEditCatalogEntry({ id: 'sarah', role: 'user' }, 'sarah')).toBe(
      true,
    )
  })

  it('lets an admin edit any entry', () => {
    expect(canEditCatalogEntry({ id: 'ada', role: 'admin' }, 'sarah')).toBe(
      true,
    )
    expect(canEditCatalogEntry({ id: 'ada', role: 'admin' }, null)).toBe(true)
  })

  it('refuses everyone else', () => {
    expect(canEditCatalogEntry({ id: 'tom', role: 'user' }, 'sarah')).toBe(
      false,
    )
    expect(canEditCatalogEntry({ id: 'tom' }, null)).toBe(false)
  })
})
