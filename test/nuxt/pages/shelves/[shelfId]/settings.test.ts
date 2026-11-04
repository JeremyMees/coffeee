import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { fakeApi, resetApi } from '../../../fake-api'
import { tid } from '../../../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

describe('the shelf settings page', () => {
  it('opens on the shelf tab', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home/settings',
    })

    expect(page.get(tid('page-title')).text()).toBe('Settings')
    expect(page.get(tid('settings-tab-shelf')).attributes('data-state')).toBe(
      'active',
    )
    expect(page.get(tid('shelf-name-form')).isVisible()).toBe(true)
    expect(page.get(tid('shelf-members')).isVisible()).toBe(false)
  })

  it('opens the tab the address names', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home/settings?tab=grinders',
    })

    expect(page.get(tid('shelf-grinders')).isVisible()).toBe(true)
    expect(page.get(tid('shelf-name-form')).isVisible()).toBe(false)
  })

  it('shows the grinders the shelf owns', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home/settings',
    })

    expect(page.get(tid('shelf-grinder-name')).text()).toBe('Fellow Opus Gen 2')
  })

  it('lets members invite people and see pending invites', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home/settings',
    })

    expect(page.find(tid('shelf-invite-form')).exists()).toBe(true)
    expect(page.get(tid('shelf-invite')).text()).toContain('anna@example.com')
  })

  it('lists the members and lets the shelf owner manage the shelf', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/sarahs-shelf-home/settings',
    })

    expect(page.findAll(tid('shelf-member')).map(row => row.text())).toEqual([
      expect.stringContaining('Sarah (you)'),
      expect.stringContaining('Tom'),
    ])
    expect(page.find(tid('shelf-name-form')).exists()).toBe(true)
    expect(page.find(tid('shelf-delete-button')).exists()).toBe(true)
  })
})
