import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminEditRoasterSheet from '~/components/AdminEditRoasterSheet.vue'
import { useCurrentUser } from '#imports'
import { fakeApi, resetApi } from '../fake-api'
import { byTestId, inputValue, testUser } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser({ role: 'admin' })
})

describe('AdminEditRoasterSheet', () => {
  it('opens the full roaster form with its logo, filled in with the roaster', async () => {
    await mountSuspended(AdminEditRoasterSheet, {
      route: '/admin/lists/roasters',
      props: { roasterId: 'r2', open: true },
      attachTo: document.body,
    })

    await vi.waitFor(() =>
      expect(byTestId('edit-roaster-sheet')).not.toBeNull(),
    )
    expect(inputValue('roaster-name')).toBe('Square Mile')
    expect(byTestId('roaster-logo-field')).not.toBeNull()
  })
})
