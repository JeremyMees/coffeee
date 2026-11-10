import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminEditCoffeeSheet from '~/components/organisms/AdminEditCoffeeSheet.vue'
import type { Member } from '#test/support/types'
import { byTestId, inputValue } from '../../fixtures'
import { scenario, signIn } from '../../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
})

describe('AdminEditCoffeeSheet', () => {
  it('opens the full coffee form filled in with the coffee', async () => {
    const ayele = await scenario.coffee(jeremy.shelf)

    await mountSuspended(AdminEditCoffeeSheet, {
      route: '/admin/lists/coffees',
      props: { coffeeId: ayele.id, open: true },
      attachTo: document.body,
    })

    await vi.waitFor(() =>
      expect(inputValue('coffee-name')).toBe('Ayele Fulasa'),
    )
    expect(byTestId('edit-coffee-sheet')).not.toBeNull()
  })
})
