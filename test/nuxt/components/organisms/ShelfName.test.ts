import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import ShelfName from '~/components/organisms/ShelfName.vue'
import { useCurrentUser } from '#imports'
import { shelf } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, inputValue, submit, type } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

function mountName(shelfId = sarah.shelf.id) {
  return mountSuspended(ShelfName, {
    props: { shelfId },
    attachTo: document.body,
  })
}

async function storedName(shelfId = sarah.shelf.id) {
  const db = await database()
  const [found] = await db
    .select({ name: shelf.name })
    .from(shelf)
    .where(eq(shelf.id, shelfId))

  return found?.name
}

describe('ShelfName', () => {
  it('lets the shelf owner rename the shelf', async () => {
    await mountName()

    expect(inputValue('shelf-name-input')).toBe("Sarah's shelf")

    await type('shelf-name-input', ' Flat ')
    await submit('shelf-name-form')

    await vi.waitFor(() => expect(byTestId('shelf-name-saved')).not.toBeNull())
    expect(await storedName()).toBe('Flat')
    expect(useCurrentUser().value?.shelves[0]).toEqual({
      id: sarah.shelf.id,
      name: 'Flat',
      ownerId: sarah.id,
    })
  })

  it('explains a name it cannot use', async () => {
    await mountName()

    await type('shelf-name-input', '   ')
    await submit('shelf-name-form')

    await vi.waitFor(() =>
      expect(byTestId('shelf-name-form')?.textContent).toContain(
        'Give the shelf a name',
      ),
    )
    expect(await storedName()).toBe("Sarah's shelf")
  })

  it('shows why a rename was refused', async () => {
    failRequest('PATCH', `/api/shelves/${sarah.shelf.id}`, {
      status: 403,
      message: 'Only the shelf owner can do that',
    })
    await mountName()

    await type('shelf-name-input', 'Flat')
    await submit('shelf-name-form')

    await vi.waitFor(() =>
      expect(byTestId('shelf-name-error')?.textContent).toContain(
        'Only the shelf owner can do that',
      ),
    )
    expect(await storedName()).toBe("Sarah's shelf")
  })

  it('only shows the name to other members', async () => {
    const tom = await scenario.member('Tom')
    const work = await scenario.shelf(tom, 'Work')
    await scenario.joinShelf(sarah, work)
    await signIn(sarah)

    await mountName(work.id)

    expect(byTestId('shelf-name-form')).toBeNull()
    expect(byTestId('shelf-name-locked')?.textContent).toContain(
      'Work. Only the shelf owner can rename it.',
    )
  })
})
