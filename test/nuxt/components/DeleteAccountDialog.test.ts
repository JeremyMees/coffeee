import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DeleteAccountDialog from '~/components/DeleteAccountDialog.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import {
  allByTestId,
  byTestId,
  click,
  currentPath,
  testUser,
} from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
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
      ...byTestId<HTMLSelectElement>('delete-account-heir-home')!.options,
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
    expect(api.accountDeletes).toEqual([])
  })

  it('deletes the account and goes to sign in', async () => {
    await mountDialog()

    await chooseHeir('home', 'lisa')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(currentPath()).toBe('/sign-in'))
    expect(api.accountDeletes).toEqual([{ heirs: { home: 'lisa' } }])
    expect(useCurrentUser().value).toBeNull()
  })

  it('explains why the account was not deleted', async () => {
    api.accountDeleteFails = 'Coffeee needs another admin'
    await mountDialog()

    await chooseHeir('home', 'tom')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'Coffeee needs another admin',
      ),
    )
  })
})
