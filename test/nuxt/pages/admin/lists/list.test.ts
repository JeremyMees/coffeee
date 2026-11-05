import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, shelfPath, useError, useRouter } from '#imports'
import type { Member } from '#test/support/types'
import {
  allByTestId,
  byTestId,
  click,
  submit,
  tid,
  type,
} from '../../../fixtures'
import { scenario, signIn } from '../../../server'

let jeremy: Member

beforeEach(async () => {
  clearError()
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await scenario.coffee(jeremy.shelf, { flavorNotes: ['Lime'] })
  await scenario.coffee(jeremy.shelf, {
    name: 'Kochere',
    flavorNotes: ['Lime', 'Limes'],
  })
  await scenario.adminEntry(jeremy, 'flavorNotes', { name: 'Jasmine' })
  await signIn(jeremy)
})

function names(page: VueWrapper) {
  return page.findAll(tid('admin-entry-name')).map(name => name.text())
}

async function openFlavorNotes() {
  return mountSuspended(App, { route: '/admin/lists/flavorNotes' })
}

async function act(page: VueWrapper, action: string, row: number) {
  await page.findAll(tid(`admin-entry-${action}`))[row]!.trigger('click')
}

describe('a shared list on the admin page', () => {
  it('lists the entries with how often they are used', async () => {
    const page = await openFlavorNotes()

    expect(page.get(tid('page-title')).text()).toBe('Flavor notes')
    expect(names(page)).toEqual(['Jasmine', 'Lime', 'Limes'])
    expect(
      page.findAll(tid('data-table-cell-uses')).map(cell => cell.text()),
    ).toEqual(['0', '2', '1'])
    expect(page.get(tid('admin-back')).attributes('href')).toBe('/admin')
  })

  it('searches the entries and keeps the search in the address', async () => {
    const page = await openFlavorNotes()

    await page.get(tid('admin-search')).setValue('jas')

    await vi.waitFor(() => expect(names(page)).toEqual(['Jasmine']))
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({ search: 'jas' }),
    )
  })

  it('opens on the search and page from the address', async () => {
    for (let number = 10; number < 35; number++) {
      await scenario.adminEntry(jeremy, 'flavorNotes', {
        name: `Lime ${number}`,
      })
    }

    const page = await mountSuspended(App, {
      route: '/admin/lists/flavorNotes?search=lim&page=2',
    })

    expect(page.get<HTMLInputElement>(tid('admin-search')).element.value).toBe(
      'lim',
    )
    expect(names(page)).toEqual(['Lime 34', 'Limes'])
  })

  it('adds an entry from the button in the header', async () => {
    const page = await openFlavorNotes()

    await page.get(tid('page-add')).trigger('click')
    await type('admin-entry-name', 'Bergamot')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(names(page)).toEqual(['Bergamot', 'Jasmine', 'Lime', 'Limes']),
    )
    expect(page.find(tid('page-add-coffee')).exists()).toBe(false)
  })

  it('adds a coffee with the full coffee form', async () => {
    const page = await mountSuspended(App, { route: '/admin/lists/coffees' })

    expect(page.get(tid('page-add')).text()).toBe('Add coffee')
    await page.get(tid('page-add')).trigger('click')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-coffee-sheet')).not.toBeNull(),
    )
  })

  it('adds a roaster with the full roaster form', async () => {
    const page = await mountSuspended(App, { route: '/admin/lists/roasters' })

    expect(page.get(tid('page-add')).text()).toBe('Add roaster')
    await page.get(tid('page-add')).trigger('click')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-roaster-sheet')).not.toBeNull(),
    )
  })

  it('updates an entry', async () => {
    const page = await openFlavorNotes()

    await act(page, 'update', 2)
    await type('admin-entry-name', 'Key lime')
    await submit('admin-update-form')

    await vi.waitFor(() =>
      expect(names(page)).toEqual(['Jasmine', 'Key lime', 'Lime']),
    )
  })

  it('updates a coffee with the full coffee form', async () => {
    const page = await mountSuspended(App, { route: '/admin/lists/coffees' })

    await act(page, 'update', 0)

    await vi.waitFor(() => expect(byTestId('edit-coffee-sheet')).not.toBeNull())
  })

  it('updates a roaster with the full roaster form and its logo', async () => {
    const page = await mountSuspended(App, { route: '/admin/lists/roasters' })

    await act(page, 'update', 0)

    await vi.waitFor(() =>
      expect(byTestId('edit-roaster-sheet')).not.toBeNull(),
    )
    expect(byTestId('roaster-logo-field')).not.toBeNull()
  })

  it('merges a duplicate into the entry that is kept', async () => {
    const page = await openFlavorNotes()

    await act(page, 'merge', 2)
    await vi.waitFor(() =>
      expect(allByTestId('admin-merge-option')).toHaveLength(2),
    )
    allByTestId('admin-merge-option')[1]!.querySelector('input')!.click()
    await vi.waitFor(() =>
      expect(byTestId('admin-merge-submit')!.textContent).toContain(
        'Merge into Lime',
      ),
    )
    await submit('admin-merge-form')

    await vi.waitFor(() => expect(names(page)).toEqual(['Jasmine', 'Lime']))
  })

  it('deletes an entry after asking', async () => {
    const page = await openFlavorNotes()

    await act(page, 'delete', 0)
    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(names(page)).toEqual(['Lime', 'Limes']))
  })

  it('explains why an entry could not be deleted', async () => {
    const page = await mountSuspended(App, { route: '/admin/lists/roasters' })

    await act(page, 'delete', 0)
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('admin-delete', 'form-error')?.textContent).toContain(
        'This roaster still has coffees',
      ),
    )
    expect(names(page)).toEqual(['Square Mile'])
  })

  it('shows no page for a list that does not exist', async () => {
    await mountSuspended(App, { route: '/admin/lists/beans' })

    await vi.waitFor(() => expect(useError().value?.statusCode).toBe(404))
  })

  it('sends users who are not admins home', async () => {
    const sarah = await scenario.member('Sarah')
    await signIn(sarah)
    await mountSuspended(App, { route: '/profile' })

    await useRouter().push('/admin/lists/flavorNotes')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.path).toBe(shelfPath(sarah.shelf)),
    )
  })
})
