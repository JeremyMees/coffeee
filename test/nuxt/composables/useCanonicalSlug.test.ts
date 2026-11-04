import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, useCanonicalSlug, useCurrentUser, useRouter } from '#imports'
import { runOn } from '../fixtures'
import { testUser } from '#test/fixtures/users'

beforeEach(() => {
  useCurrentUser().value = testUser()
})

function currentFullPath() {
  return useRouter().currentRoute.value.fullPath
}

describe('useCanonicalSlug', () => {
  it('leaves an address that already has the right name', async () => {
    await runOn('/coffees/ayele-fulasa-c1', () =>
      useCanonicalSlug(
        'coffees',
        () => 'ayele-fulasa-c1',
        () => ({ id: 'c1', name: 'Ayele Fulasa' }),
      ),
    )

    expect(currentFullPath()).toBe('/coffees/ayele-fulasa-c1')
  })

  it('puts the current name in the address, keeping the query', async () => {
    await runOn('/roasters/old-name-r1?mine=true', () =>
      useCanonicalSlug(
        'roasters',
        () => 'old-name-r1',
        () => ({ id: 'r1', name: 'La Cabra' }),
      ),
    )

    await vi.waitFor(() =>
      expect(currentFullPath()).toBe('/roasters/la-cabra-r1?mine=true'),
    )
  })

  it('follows a rename while the page is open', async () => {
    const named = ref({ id: 'c1', name: 'Ayele Fulasa' })
    await runOn('/coffees/ayele-fulasa-c1', () =>
      useCanonicalSlug(
        'coffees',
        () => currentFullPath().split('/')[2]!,
        () => named.value,
      ),
    )

    named.value = { id: 'c1', name: 'Ayele Washed' }

    await vi.waitFor(() =>
      expect(currentFullPath()).toBe('/coffees/ayele-washed-c1'),
    )
  })

  it('waits until there is something to name', async () => {
    await runOn('/coffees/c1', () =>
      useCanonicalSlug(
        'coffees',
        () => 'c1',
        () => undefined,
      ),
    )

    expect(currentFullPath()).toBe('/coffees/c1')
  })
})
