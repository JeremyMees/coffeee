import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminAddCoffeeSheet from '~/components/AdminAddCoffeeSheet.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import {
  byTestId,
  click,
  pickMulti,
  pickOrigin,
  pickRoaster,
  submit,
  type,
} from '../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser({ role: 'admin' })
})

function openSheet() {
  return mountSuspended(AdminAddCoffeeSheet, {
    route: '/admin/lists/coffees',
    props: { open: true },
    attachTo: document.body,
  })
}

async function fillRequired(name: string) {
  await type('coffee-name', name)
  await pickRoaster('square', 'Square Mile')
  await pickOrigin('ethi', 'Ethiopia')
  await pickMulti('coffee-processes', 'wash', 'Washed')
  await click('coffee-roast-level', 'option-light')
  await click('coffee-roasted-for', 'option-filter')
}

describe('AdminAddCoffeeSheet', () => {
  it('asks only for the coffee, not a first bag', async () => {
    await openSheet()

    expect(byTestId('form-sheet-title')?.textContent).toContain('Add coffee')
    expect(byTestId('admin-add-coffee-step-4')).toBeNull()
  })

  it('adds the coffee to the catalog and closes', async () => {
    const sheet = await openSheet()

    await fillRequired('Ayele Fulasa')
    await submit('admin-add-coffee-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.adminCalls).toEqual([
      {
        add: 'coffees',
        body: expect.objectContaining({
          name: 'Ayele Fulasa',
          roaster: 'Square Mile',
          origins: ['ET'],
          processes: ['Washed'],
        }),
      },
    ])
  })

  it('explains every missing detail without sending anything', async () => {
    await openSheet()

    await submit('admin-add-coffee-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-coffee-sheet')?.textContent).toContain(
        'Give the coffee a name',
      ),
    )
    expect(api.adminCalls).toEqual([])
  })

  it('shows a coffee that is already in the catalog next to its name', async () => {
    await openSheet()

    await fillRequired('Taken')
    await submit('admin-add-coffee-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-coffee-sheet')?.textContent).toContain(
        'Taken is already on the list',
      ),
    )
  })
})
