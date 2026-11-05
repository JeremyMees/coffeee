import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfPath } from '#imports'
import type { Member } from '#test/support/types'
import { tid } from '../../../fixtures'
import { scenario, signIn } from '../../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)
  await scenario.grinder(sarah.shelf, { brand: 'Fellow', model: 'Opus Gen 2' })
  await scenario.shelfInvite(sarah.shelf, 'anna@example.com')
  await signIn(sarah)
})

function settings(query = '') {
  return mountSuspended(App, {
    route: `${shelfPath(sarah.shelf)}/settings${query}`,
  })
}

describe('the shelf settings page', () => {
  it('opens on the shelf tab', async () => {
    const page = await settings()

    expect(page.get(tid('page-title')).text()).toBe('Settings')
    expect(page.get(tid('settings-tab-shelf')).attributes('data-state')).toBe(
      'active',
    )
    expect(page.get(tid('shelf-name-form')).isVisible()).toBe(true)
    expect(page.get(tid('shelf-members')).isVisible()).toBe(false)
  })

  it('opens the tab the address names', async () => {
    const page = await settings('?tab=grinders')

    expect(page.get(tid('shelf-grinders')).isVisible()).toBe(true)
    expect(page.get(tid('shelf-name-form')).isVisible()).toBe(false)
  })

  it('shows the grinders the shelf owns', async () => {
    const page = await settings()

    expect(page.get(tid('shelf-grinder-name')).text()).toBe('Fellow Opus Gen 2')
  })

  it('lets members invite people and see pending invites', async () => {
    const page = await settings()

    expect(page.find(tid('shelf-invite-form')).exists()).toBe(true)
    expect(page.get(tid('shelf-invite')).text()).toContain('anna@example.com')
  })

  it('lists the members and lets the shelf owner manage the shelf', async () => {
    const page = await settings()

    expect(page.findAll(tid('shelf-member')).map(row => row.text())).toEqual([
      expect.stringContaining('Sarah (you)'),
      expect.stringContaining('Tom'),
    ])
    expect(page.find(tid('shelf-name-form')).exists()).toBe(true)
    expect(page.find(tid('shelf-delete-button')).exists()).toBe(true)
  })
})
