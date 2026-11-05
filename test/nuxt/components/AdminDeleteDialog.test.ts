import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import AdminDeleteDialog from '~/components/AdminDeleteDialog.vue'
import type { AdminEntry, AdminList } from '#imports'
import { flavorNote, roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, click } from '../fixtures'
import { database, scenario, signIn } from '../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
})

async function entry(name: string, uses = 0): Promise<AdminEntry> {
  const added = await scenario.adminEntry(jeremy, 'flavorNotes', { name })

  return { ...added, detail: null, detailId: null, uses }
}

function mountDialog(shown: AdminEntry, list: AdminList = 'flavorNotes') {
  return mountSuspended(AdminDeleteDialog, {
    props: { list, entry: shown, open: true },
    attachTo: document.body,
  })
}

async function stored(id: string) {
  const db = await database()

  return db
    .select({ name: flavorNote.name })
    .from(flavorNote)
    .where(eq(flavorNote.id, id))
}

async function storedRoaster(id: string) {
  const db = await database()

  return db
    .select({ name: roaster.name })
    .from(roaster)
    .where(eq(roaster.id, id))
}

describe('AdminDeleteDialog', () => {
  it('asks before deleting', async () => {
    await mountDialog(await entry('Jasmine'))

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
    const ayele = await scenario.coffee(jeremy.shelf)

    await mountDialog(
      { id: ayele.id, name: ayele.name, detail: null, detailId: null, uses: 1 },
      'coffees',
    )

    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      'Every shelf loses its bags',
    )
  })

  it('deletes the entry and closes', async () => {
    const jasmine = await entry('Jasmine')
    const dialog = await mountDialog(jasmine)

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(dialog.emitted('update:open')).toEqual([[false]]),
    )
    expect(await stored(jasmine.id)).toEqual([])
  })

  it('explains why it was not deleted', async () => {
    await scenario.coffee(jeremy.shelf)
    const squareMile = await scenario.roaster(jeremy, 'Square Mile')
    await mountDialog(
      {
        id: squareMile,
        name: 'Square Mile',
        detail: null,
        detailId: null,
        uses: 1,
      },
      'roasters',
    )

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'This roaster still has coffees',
      ),
    )
    expect(await storedRoaster(squareMile)).toEqual([{ name: 'Square Mile' }])
  })
})
