import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import DeleteCoffeeDialog from '~/components/DeleteCoffeeDialog.vue'
import { coffee } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, click } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member
let ayele: Awaited<ReturnType<typeof scenario.coffee>>

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  ayele = await scenario.coffee(sarah.shelf)
  await signIn(sarah)
})

function mountDialog() {
  return mountSuspended(DeleteCoffeeDialog, {
    props: { coffee: { id: ayele.id, name: ayele.name }, open: true },
    attachTo: document.body,
  })
}

async function stored() {
  const db = await database()

  return db
    .select({ id: coffee.id })
    .from(coffee)
    .where(eq(coffee.id, ayele.id))
}

describe('DeleteCoffeeDialog', () => {
  it('asks before deleting the coffee', async () => {
    await mountDialog()

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Delete Ayele Fulasa?',
    )
    expect(await stored()).toHaveLength(1)
  })

  it('deletes the coffee and tells it is gone', async () => {
    const dialog = await mountDialog()

    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(dialog.emitted('deleted')).toHaveLength(1))
    expect(dialog.emitted('update:open')).toEqual([[false]])
    expect(await stored()).toEqual([])
  })

  it('explains why the coffee was not deleted', async () => {
    const tom = await scenario.member('Tom')
    await scenario.coffee(tom.shelf)
    const dialog = await mountDialog()

    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'only an admin can delete it',
      ),
    )
    expect(dialog.emitted('deleted')).toBeUndefined()
    expect(await stored()).toHaveLength(1)
  })
})
