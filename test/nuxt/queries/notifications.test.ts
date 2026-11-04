import { beforeEach, describe, expect, it } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useNotificationEmails,
  useNotificationEmailsUpdate,
  useNotifications,
  useNotificationsRead,
  useUnreadNotifications,
} from '~/queries/notifications'
import {
  countUnreadNotifications,
  listEmailedKinds,
  markNotificationsRead,
  setEmailedKinds,
} from '#server/utils/notifications'
import type { Member } from '#test/support/types'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)
  await markNotificationsRead(await database(), sarah.id)
  await scenario.coffee(sarah.shelf, {}, tom)
  await signIn(sarah)
})

describe('useNotifications', () => {
  it('fetches the notifications, newest first', async () => {
    const { data, suspense } = await runOn('/', useNotifications)

    await suspense()

    expect(
      data.value?.map(found => ({
        kind: found.kind,
        actor: found.actor,
        shelf: found.shelf,
        coffee: found.coffee,
        read: found.readAt !== null,
      })),
    ).toEqual([
      {
        kind: 'coffeeAdded',
        actor: 'Tom',
        shelf: "Sarah's shelf",
        coffee: 'Ayele Fulasa',
        read: false,
      },
      {
        kind: 'memberJoined',
        actor: 'Tom',
        shelf: "Sarah's shelf",
        coffee: null,
        read: true,
      },
    ])
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

    expect(await countUnreadNotifications(await database(), sarah.id)).toBe(0)
    expect(client.getQueryData(queryKeys.unreadNotifications())).toEqual({
      unread: 0,
    })
  })
})

describe('useNotificationEmails', () => {
  it('fetches which notifications are emailed', async () => {
    await setEmailedKinds(await database(), {
      userId: sarah.id,
      emailed: ['bagFinished'],
    })
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

    expect(
      (await listEmailedKinds(await database(), sarah.id)).toSorted(),
    ).toEqual(['coffeeAdded', 'memberJoined'])
    expect(client.getQueryData(queryKeys.notificationEmails())).toEqual({
      emailed: ['coffeeAdded', 'memberJoined'],
    })
  })
})
