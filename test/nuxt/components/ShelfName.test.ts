import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfName from '~/components/ShelfName.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, inputValue, submit, type } from '../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

function mountName(shelfId = 'home') {
  return mountSuspended(ShelfName, {
    props: { shelfId },
    attachTo: document.body,
  })
}

describe('ShelfName', () => {
  it('lets the shelf owner rename the shelf', async () => {
    await mountName()

    expect(inputValue('shelf-name-input')).toBe("Sarah's shelf")

    await type('shelf-name-input', ' Flat ')
    await submit('shelf-name-form')

    await vi.waitFor(() => expect(byTestId('shelf-name-saved')).not.toBeNull())
    expect(api.shelfCalls).toEqual([{ rename: { name: 'Flat' } }])
    expect(useCurrentUser().value?.shelves[0]).toEqual({
      id: 'home',
      name: 'Flat',
      ownerId: 'user-1',
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
    expect(api.shelfCalls).toEqual([])
  })

  it('shows why a rename was refused', async () => {
    api.shelfFails = 'Only the shelf owner can do that'
    await mountName()

    await type('shelf-name-input', 'Flat')
    await submit('shelf-name-form')

    await vi.waitFor(() =>
      expect(byTestId('shelf-name-error')?.textContent).toContain(
        'Only the shelf owner can do that',
      ),
    )
  })

  it('only shows the name to other members', async () => {
    await mountName('work')

    expect(byTestId('shelf-name-form')).toBeNull()
    expect(byTestId('shelf-name-locked')?.textContent).toContain(
      'Work. Only the shelf owner can rename it.',
    )
  })
})
