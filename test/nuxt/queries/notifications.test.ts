import { beforeEach, describe, expect, it } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useNotifications,
  useNotificationsRead,
  useUnreadNotifications,
} from '~/queries/notifications'
import { queryKeys } from '#imports'
import { api, fakeApi, notifications, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  api.notifications = notifications()
})

describe('useNotifications', () => {
  it('fetches the notifications', async () => {
    const { data, suspense } = await runOn('/', useNotifications)

    await suspense()

    expect(data.value).toEqual(notifications())
  })
})

describe('useUnreadNotifications', () => {
  it('fetches how many are unread', async () => {
    const { data, suspense } = await runOn('/', useUnreadNotifications)

    await suspense()

    expect(data.value).toEqual({ unread: 1 })
  })
})

describe('useNotificationsRead', () => {
  it('marks them read and clears the unread count', async () => {
    const { result, client } = await runOn('/', () => ({
      result: useNotificationsRead(),
      client: useQueryClient(),
    }))

    await result.mutateAsync()

    expect(api.notificationCalls).toEqual(['read'])
    expect(client.getQueryData(queryKeys.unreadNotifications())).toEqual({
      unread: 0,
    })
  })
})
