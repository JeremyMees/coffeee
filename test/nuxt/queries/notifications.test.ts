import { beforeEach, describe, expect, it } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useNotificationEmails,
  useNotificationEmailsUpdate,
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

describe('useNotificationEmails', () => {
  it('fetches which notifications are emailed', async () => {
    api.notificationEmails = ['bagFinished']
    const { data, suspense } = await runOn('/', useNotificationEmails)

    await suspense()

    expect(data.value).toEqual({ emailed: ['bagFinished'] })
  })
})

describe('useNotificationEmailsUpdate', () => {
  it('saves which notifications are emailed and keeps the answer', async () => {
    const { result, client } = await runOn('/', () => ({
      result: useNotificationEmailsUpdate(),
      client: useQueryClient(),
    }))

    await result.mutateAsync(['coffeeAdded', 'memberJoined'])

    expect(api.notificationCalls).toEqual([
      { emails: { emailed: ['coffeeAdded', 'memberJoined'] } },
    ])
    expect(client.getQueryData(queryKeys.notificationEmails())).toEqual({
      emailed: ['coffeeAdded', 'memberJoined'],
    })
  })
})
