import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DeleteCoffeeDialog from '~/components/DeleteCoffeeDialog.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, click } from '../fixtures'

fakeApi()

beforeEach(resetApi)

function mountDialog() {
  return mountSuspended(DeleteCoffeeDialog, {
    props: { coffee: { id: 'c1', name: 'Ayele Fulasa' }, open: true },
    attachTo: document.body,
  })
}

describe('DeleteCoffeeDialog', () => {
  it('asks before deleting the coffee', async () => {
    await mountDialog()

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Delete Ayele Fulasa?',
    )
    expect(api.coffeeDeletes).toEqual([])
  })

  it('deletes the coffee and tells it is gone', async () => {
    const dialog = await mountDialog()

    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(dialog.emitted('deleted')).toHaveLength(1))
    expect(dialog.emitted('update:open')).toEqual([[false]])
    expect(api.coffeeDeletes).toEqual(['c1'])
  })

  it('explains why the coffee was not deleted', async () => {
    api.coffeeDeleteFails = true
    const dialog = await mountDialog()

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'only an admin can delete it',
      ),
    )
    expect(dialog.emitted('deleted')).toBeUndefined()
  })
})
