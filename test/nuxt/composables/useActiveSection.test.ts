import { beforeEach, describe, expect, it } from 'vitest'
import { useActiveSection, useCurrentUser, useRouter, useState } from '#imports'
import { forgetLastShelf, runOn } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useState('last-section').value = null
})

async function activeOn(route: string) {
  return runOn(route, useActiveSection)
}

async function openFrom(list: string, page: string) {
  const active = await activeOn(list)

  await useRouter().push(page)

  return active
}

describe('useActiveSection', () => {
  it.each([
    ['/shelves/work-work', '/shelves/work-work'],
    ['/shelves/work-work/library', '/shelves/work-work/library'],
    ['/shelves/work-work/discover', '/shelves/work-work/discover'],
    ['/roasters', '/roasters'],
    ['/profile', '/profile'],
  ])('marks %s as its own section', async (route, section) => {
    expect((await activeOn(route)).value).toBe(section)
  })

  it.each([
    ['/shelves/work-work'],
    ['/shelves/work-work/library'],
    ['/shelves/work-work/discover'],
  ])('keeps %s active on a coffee opened from it', async list => {
    const active = await openFrom(
      list,
      '/shelves/work-work/coffees/ayele-fulasa-c1',
    )

    expect(active.value).toBe(list)
  })

  it('keeps Discover active on a coffee outside the shelf', async () => {
    const active = await openFrom(
      '/shelves/work-work/discover',
      '/coffees/ayele-fulasa-c1',
    )

    expect(active.value).toBe('/shelves/work-work/discover')
  })

  it('falls back to Stock on a shelf coffee opened directly', async () => {
    const active = await activeOn('/shelves/work-work/coffees/ayele-fulasa-c1')

    expect(active.value).toBe('/shelves/work-work')
  })

  it('falls back to Discover on a coffee outside the shelf opened directly', async () => {
    const active = await activeOn('/coffees/ayele-fulasa-c1')

    expect(active.value).toBe('/shelves/sarahs-shelf-home/discover')
  })

  it('marks Roasters on a roaster page', async () => {
    const active = await openFrom('/shelves/work-work', '/roasters/r1')

    expect(active.value).toBe('/roasters')
  })

  it('marks Stock on the shelf settings', async () => {
    const active = await activeOn('/shelves/work-work/settings')

    expect(active.value).toBe('/shelves/work-work')
  })

  it.each([['/admin'], ['/admin/invites'], ['/admin/lists/roasters']])(
    'marks Admin on %s',
    async route => {
      useCurrentUser().value = testUser({ role: 'admin' })

      const active = await activeOn(route)

      expect(active.value).toBe('/admin')
    },
  )

  it('marks nothing on pages outside every section', async () => {
    const active = await activeOn('/notifications')

    expect(active.value).toBeNull()
  })
})
