import { describe, expect, it } from 'vitest'
import { useAccountDelete, useOwnedShelves } from '~/queries/account'
import { useCurrentUser } from '#imports'
import { api, fakeApi } from '../fake-api'
import { currentPath, runOn } from '../fixtures'
import { ownedShelves } from '#test/fixtures/shelves'
import { testUser } from '#test/fixtures/users'

fakeApi()

describe('useOwnedShelves', () => {
  it('fetches the shelves the user owns', async () => {
    const { data, suspense } = await runOn('/', () => useOwnedShelves(true))

    await suspense()

    expect(data.value).toEqual(ownedShelves())
  })

  it('waits until it is needed', async () => {
    const { fetchStatus } = await runOn('/', () => useOwnedShelves(false))

    expect(fetchStatus.value).toBe('idle')
  })
})

describe('useAccountDelete', () => {
  it('deletes the account and forgets the user', async () => {
    useCurrentUser().value = testUser()
    const { mutateAsync } = await runOn('/', useAccountDelete)

    await mutateAsync({ home: 'tom' })

    expect(api.accountDeletes).toEqual([{ heirs: { home: 'tom' } }])
    expect(useCurrentUser().value).toBeNull()
    expect(currentPath()).toBe('/sign-in')
  })
})
