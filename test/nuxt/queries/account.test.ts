import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { useAccountDelete, useOwnedShelves } from '~/queries/account'
import { shelf, user } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { useCurrentUser } from '#imports'
import { currentPath, runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member
let tom: Member

beforeEach(async () => {
  await scenario.member('Jeremy', { role: 'admin' })
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await scenario.joinShelf(tom, sarah.shelf)
  await signIn(sarah)
})

describe('useOwnedShelves', () => {
  it('fetches the shelves the user owns, with who else is on them', async () => {
    const { data, suspense } = await runOn('/', () => useOwnedShelves(true))

    await suspense()

    expect(data.value).toEqual([
      {
        id: sarah.shelf.id,
        name: "Sarah's shelf",
        members: [{ id: tom.id, name: 'Tom' }],
      },
    ])
  })

  it('waits until it is needed', async () => {
    const { fetchStatus } = await runOn('/', () => useOwnedShelves(false))

    expect(fetchStatus.value).toBe('idle')
  })
})

describe('useAccountDelete', () => {
  it('deletes the account, hands the shelf over and forgets the user', async () => {
    const { mutateAsync } = await runOn('/', useAccountDelete)

    await mutateAsync({ [sarah.shelf.id]: tom.id })

    const db = await database()
    const [left] = await db.select().from(user).where(eq(user.id, sarah.id))
    const [handedOver] = await db
      .select({ ownerId: shelf.ownerId })
      .from(shelf)
      .where(eq(shelf.id, sarah.shelf.id))
    expect(left).toBeUndefined()
    expect(handedOver?.ownerId).toBe(tom.id)
    expect(useCurrentUser().value).toBeNull()
    expect(currentPath()).toBe('/sign-in')
  })
})
