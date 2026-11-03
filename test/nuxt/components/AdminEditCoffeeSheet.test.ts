import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminEditCoffeeSheet from '~/components/AdminEditCoffeeSheet.vue'
import { useCurrentUser } from '#imports'
import { fakeApi, resetApi } from '../fake-api'
import { byTestId, inputValue, testUser } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser({ role: 'admin' })
})

describe('AdminEditCoffeeSheet', () => {
  it('opens the full coffee form filled in with the coffee', async () => {
    await mountSuspended(AdminEditCoffeeSheet, {
      route: '/admin/lists/coffees',
      props: { coffeeId: 'c1', open: true },
      attachTo: document.body,
    })

    await vi.waitFor(() => expect(byTestId('edit-coffee-sheet')).not.toBeNull())
    expect(inputValue('coffee-name')).toBe('Ayele Fulasa')
  })
})
