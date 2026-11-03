import { describe, expect, it } from 'vitest'
import { adminListFromRoute, adminListRoute } from '#imports'

describe('adminListRoute', () => {
  it('keeps only the search and pages after the first', () => {
    expect(adminListRoute('', 0)).toEqual({})
    expect(adminListRoute('lime', 2)).toEqual({ search: 'lime', page: '3' })
  })
})

describe('adminListFromRoute', () => {
  it('reads the search and page back', () => {
    expect(adminListFromRoute({ search: 'lime', page: '3' })).toEqual({
      search: 'lime',
      pageIndex: 2,
    })
  })

  it('starts on the first page without a usable page', () => {
    expect(adminListFromRoute({ page: 'nope' })).toEqual({
      search: '',
      pageIndex: 0,
    })
    expect(adminListFromRoute({ search: ['a', 'b'], page: '0' })).toEqual({
      search: '',
      pageIndex: 0,
    })
  })
})
