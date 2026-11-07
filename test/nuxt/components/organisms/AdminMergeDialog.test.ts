import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { asc } from 'drizzle-orm'
import AdminMergeDialog from '~/components/organisms/AdminMergeDialog.vue'
import { flavorNote } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { allByTestId, byTestId, submit, type } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let jeremy: Member
let limes: { id: string; name: string }

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await scenario.adminEntry(jeremy, 'flavorNotes', { name: 'Lime' })
  limes = await scenario.adminEntry(jeremy, 'flavorNotes', { name: 'Limes' })
  await scenario.adminEntry(jeremy, 'flavorNotes', { name: 'Jasmine' })
  await signIn(jeremy)
})

async function mountDialog() {
  const dialog = await mountSuspended(AdminMergeDialog, {
    props: {
      list: 'flavorNotes',
      entry: { ...limes, detail: null, detailId: null, uses: 0 },
      open: true,
    },
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

async function stored() {
  const db = await database()
  const notes = await db
    .select({ name: flavorNote.name })
    .from(flavorNote)
    .orderBy(asc(flavorNote.nameKey))

  return notes.map(note => note.name)
}

describe('AdminMergeDialog', () => {
  it('offers every other entry to keep', async () => {
    await mountDialog()

    expect(options()).toEqual(['Jasmine', 'Lime'])
  })

  it('searches the entries to keep', async () => {
    await mountDialog()

    await type('admin-merge-search', 'jas')

    await vi.waitFor(() => expect(options()).toEqual(['Jasmine']))
  })

  it('merges into the picked entry and closes', async () => {
    const dialog = await mountDialog()

    await pick(1)
    await submit('admin-merge-form')

    await vi.waitFor(() =>
      expect(dialog.emitted('update:open')).toEqual([[false]]),
    )
    expect(await stored()).toEqual(['Jasmine', 'Lime'])
  })

  it('asks which entry to keep', async () => {
    await mountDialog()

    await submit('admin-merge-form')

    expect(byTestId('form-error')?.textContent).toContain(
      'Pick the flavor note to keep',
    )
    expect(await stored()).toEqual(['Jasmine', 'Lime', 'Limes'])
  })

  it('explains what went wrong', async () => {
    failRequest('POST', `/api/admin/lists/flavorNotes/${limes.id}/merge`, {
      status: 500,
      message: 'The list is out of reach',
    })
    await mountDialog()

    await pick(0)
    await submit('admin-merge-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'The list is out of reach',
      ),
    )
    expect(await stored()).toEqual(['Jasmine', 'Lime', 'Limes'])
  })
})
