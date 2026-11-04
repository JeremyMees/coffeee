import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminDeleteDialog from '~/components/AdminDeleteDialog.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, click } from '../fixtures'
import { flavorNoteEntries } from '#test/fixtures/admin'

fakeApi()

beforeEach(resetApi)

function mountDialog(list: AdminList = 'flavorNotes') {
  return mountSuspended(AdminDeleteDialog, {
    props: { list, entry: flavorNoteEntries()[2]!, open: true },
    attachTo: document.body,
  })
}

describe('AdminDeleteDialog', () => {
  it('asks before deleting', async () => {
    await mountDialog()

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Delete Jasmine?',
    )
    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      'disappears from every coffee',
    )
    expect(byTestId('confirm-dialog-confirm')?.textContent).toContain(
      'Delete flavor note',
    )
  })

  it('warns that deleting a coffee takes every bag with it', async () => {
    await mountDialog('coffees')

    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      'Every shelf loses its bags',
    )
  })

  it('deletes the entry and closes', async () => {
    const dialog = await mountDialog()

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(dialog.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.adminCalls).toEqual([{ delete: 'n3' }])
  })

  it('explains why it was not deleted', async () => {
    api.adminFails = 'This flavor note still has coffees'
    await mountDialog()

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'This flavor note still has coffees',
      ),
    )
  })
})
