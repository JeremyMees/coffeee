import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminMergeDialog from '~/components/AdminMergeDialog.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { allByTestId, byTestId, submit, type } from '../fixtures'
import { flavorNoteEntries } from '#test/fixtures/admin'

fakeApi()

beforeEach(resetApi)

async function mountDialog() {
  const dialog = await mountSuspended(AdminMergeDialog, {
    props: { list: 'flavorNotes', entry: flavorNoteEntries()[1]!, open: true },
    attachTo: document.body,
  })
  await vi.waitFor(() =>
    expect(allByTestId('admin-merge-option')).toHaveLength(2),
  )

  return dialog
}

function options() {
  return allByTestId('admin-merge-option').map(option =>
    option.textContent?.trim(),
  )
}

async function pick(row: number) {
  allByTestId('admin-merge-option')[row]!.querySelector('input')!.click()
  await vi.waitFor(() =>
    expect(byTestId('admin-merge-submit')?.textContent).toContain('Merge into'),
  )
}

describe('AdminMergeDialog', () => {
  it('offers every other entry to keep', async () => {
    await mountDialog()

    expect(options()).toEqual(['Lime', 'Jasmine'])
    expect(api.adminQueries.at(-1)).toMatchObject({ except: 'n2' })
  })

  it('searches the entries to keep', async () => {
    await mountDialog()

    await type('admin-merge-search', 'jas')

    await vi.waitFor(() => expect(options()).toEqual(['Jasmine']))
  })

  it('merges into the picked entry and closes', async () => {
    const dialog = await mountDialog()

    await pick(0)
    await submit('admin-merge-form')

    await vi.waitFor(() =>
      expect(dialog.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.adminCalls).toEqual([{ merge: 'n2', intoId: 'n1' }])
  })

  it('asks which entry to keep', async () => {
    await mountDialog()

    await submit('admin-merge-form')

    expect(byTestId('form-error')?.textContent).toContain(
      'Pick the flavor note to keep',
    )
    expect(api.adminCalls).toEqual([])
  })

  it('explains what went wrong', async () => {
    api.adminFails = 'The list is out of reach'
    await mountDialog()

    await pick(1)
    await submit('admin-merge-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'The list is out of reach',
      ),
    )
  })
})
