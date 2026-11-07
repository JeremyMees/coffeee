import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminEditRoasterSheet from '~/components/organisms/AdminEditRoasterSheet.vue'
import type { Member } from '#test/support/types'
import { byTestId, inputValue } from '../../fixtures'
import { scenario, signIn } from '../../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
})

describe('AdminEditRoasterSheet', () => {
  it('opens the full roaster form with its logo, filled in with the roaster', async () => {
    const squareMile = await scenario.roaster(jeremy, 'Square Mile')

    await mountSuspended(AdminEditRoasterSheet, {
      route: '/admin/lists/roasters',
      props: { roasterId: squareMile, open: true },
      attachTo: document.body,
    })

    await vi.waitFor(() =>
      expect(byTestId('edit-roaster-sheet')).not.toBeNull(),
    )
    expect(inputValue('roaster-name')).toBe('Square Mile')
    expect(byTestId('roaster-logo-field')).not.toBeNull()
  })
})
