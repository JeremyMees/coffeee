import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import DeleteAccountDialog from '~/components/organisms/DeleteAccountDialog.vue'
import { useCurrentUser } from '#imports'
import { shelf, user } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { allByTestId, byTestId, click, currentPath } from '../../fixtures'
import { database, scenario, signIn } from '../../server'

let sarah: Member
let tom: Member
let lisa: Member
let home: Awaited<ReturnType<typeof scenario.shelf>>

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  lisa = await scenario.member('Lisa')
  home = await scenario.shelf(sarah, 'Home')
  await scenario.joinShelf(tom, home)
  await scenario.joinShelf(lisa, home)
  await signIn(sarah)
})

async function mountDialog() {
  const dialog = await mountSuspended(DeleteAccountDialog, {
    props: { open: true },
    attachTo: document.body,
  })

  await vi.waitFor(() =>
    expect(allByTestId('delete-account-heir')).toHaveLength(1),
  )

  return dialog
}

async function chooseHeir(shelfId: string, userId: string) {
  const select = byTestId<HTMLSelectElement>(`delete-account-heir-${shelfId}`)!
  select.value = userId
  select.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}

async function storedUser() {
  const db = await database()

  return db.select({ id: user.id }).from(user).where(eq(user.id, sarah.id))
}

describe('DeleteAccountDialog', () => {
  it('warns what leaves with the account', async () => {
    await mountDialog()

    expect(byTestId('confirm-dialog-title')?.textContent).toContain(
      'Delete your account?',
    )
    expect(byTestId('confirm-dialog-description')?.textContent).toContain(
      'ratings, would-buy-again verdicts and grind settings',
    )
  })

  it('asks who takes over each shelf with other members', async () => {
    await mountDialog()

    const options = [
      ...byTestId<HTMLSelectElement>(`delete-account-heir-${home.id}`)!.options,
    ].map(option => option.text.trim())

    expect(options).toEqual(['Pick a member', 'Tom', 'Lisa'])
  })

  it('says which shelves are deleted because nobody else is in them', async () => {
    await mountDialog()

    expect(byTestId('delete-account-alone')?.textContent).toContain(
      "Sarah's shelf",
    )
  })

  it('refuses until every shared shelf has someone to take it over', async () => {
    await mountDialog()

    await click('confirm-dialog-confirm')

    expect(byTestId('form-error')?.textContent).toContain(
      'Choose who takes over Home',
    )
    expect(await storedUser()).toHaveLength(1)
  })

  it('deletes the account and goes to sign in', async () => {
    await scenario.member('Jeremy', { role: 'admin' })
    await mountDialog()

    await chooseHeir(home.id, lisa.id)
    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(currentPath()).toBe('/sign-in'))
    const db = await database()
    const [handedOver] = await db
      .select({ ownerId: shelf.ownerId })
      .from(shelf)
      .where(eq(shelf.id, home.id))
    expect(handedOver?.ownerId).toBe(lisa.id)
    expect(await storedUser()).toEqual([])
    expect(useCurrentUser().value).toBeNull()
  })

  it('explains why the account was not deleted', async () => {
    await mountDialog()

    await chooseHeir(home.id, tom.id)
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'Coffeee needs another admin',
      ),
    )
    expect(await storedUser()).toHaveLength(1)
  })
})
