import { useQueryClient } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationsRead } from '~/queries/notifications'
import { markNotificationsRead } from '#server/utils/notifications'
import { queryKeys, useAppBadge } from '#imports'
import { fakeBadge, forgetBadge, runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)
  await markNotificationsRead(await database(), sarah.id)
  await scenario.coffee(sarah.shelf, {}, tom)
  await scenario.coffee(sarah.shelf, { name: 'Kii' }, tom)
  await signIn(sarah)
})

afterEach(() => {
  forgetBadge()
})

function badgeOn() {
  return runOn('/', () => {
    useAppBadge()

    return { client: useQueryClient(), read: useNotificationsRead() }
  })
}

describe('useAppBadge', () => {
  it('shows the unread count on the app icon', async () => {
    const badge = fakeBadge()

    await badgeOn()

    await vi.waitFor(() => expect(badge.set).toHaveBeenLastCalledWith(2))
  })

  it('follows the unread count when it changes', async () => {
    const badge = fakeBadge()
    const { client } = await badgeOn()
    await vi.waitFor(() => expect(badge.set).toHaveBeenCalled())

    client.setQueryData(queryKeys.unreadNotifications(), { unread: 5 })

    await vi.waitFor(() => expect(badge.set).toHaveBeenLastCalledWith(5))
  })

  it('clears the badge once the notifications are read', async () => {
    const badge = fakeBadge()
    const { read } = await badgeOn()
    await vi.waitFor(() => expect(badge.set).toHaveBeenCalled())

    await read.mutateAsync()

    await vi.waitFor(() => expect(badge.clear).toHaveBeenCalledOnce())
  })

  it('carries on when the device refuses the badge', async () => {
    const badge = fakeBadge({ refuse: true })

    await badgeOn()

    await vi.waitFor(() => expect(badge.set).toHaveBeenCalledWith(2))
  })

  it('does nothing on a browser without badges', async () => {
    const { client } = await badgeOn()

    client.setQueryData(queryKeys.unreadNotifications(), { unread: 0 })

    expect('setAppBadge' in navigator).toBe(false)
  })
})
