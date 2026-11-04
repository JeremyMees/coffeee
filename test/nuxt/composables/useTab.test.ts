import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser, useRouter, useTab } from '#imports'
import { runOn } from '../fixtures'
import { testUser } from '#test/fixtures/users'

const tabs = ['shelf', 'members', 'grinders'] as const

beforeEach(() => {
  useCurrentUser().value = testUser()
})

describe('useTab', () => {
  it('opens the first tab when the address names none', async () => {
    const tab = await runOn('/profile', () => useTab(tabs))

    expect(tab.value).toBe('shelf')
  })

  it('opens the tab the address names', async () => {
    const tab = await runOn('/profile?tab=members', () => useTab(tabs))

    expect(tab.value).toBe('members')
  })

  it('ignores a tab it does not know', async () => {
    const tab = await runOn('/profile?tab=nope', () => useTab(tabs))

    expect(tab.value).toBe('shelf')
  })

  it('keeps the open tab in the address, leaving other query values', async () => {
    const tab = await runOn('/profile?keep=1', () => useTab(tabs))

    tab.value = 'grinders'

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.fullPath).toBe(
        '/profile?keep=1&tab=grinders',
      ),
    )
    expect(tab.value).toBe('grinders')
  })

  it('drops the tab from the address when going back to the first', async () => {
    const tab = await runOn('/profile?tab=members', () => useTab(tabs))

    tab.value = 'shelf'

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.fullPath).toBe('/profile'),
    )
  })
})
