import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { clearError, useCurrentUser, useError, useRouter } from '#imports'
import { api, fakeApi, resetApi } from '../../../fake-api'
import {
  allByTestId,
  byTestId,
  click,
  submit,
  tid,
  type,
} from '../../../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  clearError()
  resetApi()
  useCurrentUser().value = testUser({ role: 'admin' })
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
    expect(names(page)).toEqual(['Lime', 'Limes', 'Jasmine'])
    expect(
      page.findAll(tid('data-table-cell-uses')).map(cell => cell.text()),
    ).toEqual(['3', '1', '0'])
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
    const page = await mountSuspended(App, {
      route: '/admin/lists/flavorNotes?search=lim&page=2',
    })

    expect(page.get<HTMLInputElement>(tid('admin-search')).element.value).toBe(
      'lim',
    )
    expect(api.adminQueries.at(-1)).toEqual({ search: 'lim', page: '1' })
  })

  it('adds an entry from the button in the header', async () => {
    const page = await openFlavorNotes()

    await page.get(tid('page-add')).trigger('click')
    await type('admin-entry-name', 'Bergamot')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(names(page)).toEqual(['Lime', 'Limes', 'Jasmine', 'Bergamot']),
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

    await act(page, 'update', 1)
    await type('admin-entry-name', 'Key lime')
    await submit('admin-update-form')

    await vi.waitFor(() =>
      expect(names(page)).toEqual(['Lime', 'Key lime', 'Jasmine']),
    )
    expect(api.adminCalls).toEqual([
      { update: 'n2', body: { name: 'Key lime' } },
    ])
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

    await act(page, 'merge', 1)
    await vi.waitFor(() =>
      expect(allByTestId('admin-merge-option')).toHaveLength(2),
    )
    allByTestId('admin-merge-option')[0]!.querySelector('input')!.click()
    await vi.waitFor(() =>
      expect(byTestId('admin-merge-submit')!.textContent).toContain(
        'Merge into Lime',
      ),
    )
    await submit('admin-merge-form')

    await vi.waitFor(() => expect(names(page)).toEqual(['Lime', 'Jasmine']))
    expect(api.adminCalls).toEqual([{ merge: 'n2', intoId: 'n1' }])
  })

  it('deletes an entry after asking', async () => {
    const page = await openFlavorNotes()

    await act(page, 'delete', 2)
    await click('confirm-dialog-confirm')

    await vi.waitFor(() => expect(names(page)).toEqual(['Lime', 'Limes']))
    expect(api.adminCalls).toEqual([{ delete: 'n3' }])
  })

  it('explains why an entry could not be deleted', async () => {
    api.adminFails = 'This flavor note still has coffees'
    const page = await openFlavorNotes()

    await act(page, 'delete', 0)
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('admin-delete', 'form-error')?.textContent).toContain(
        'This flavor note still has coffees',
      ),
    )
    expect(names(page)).toEqual(['Lime', 'Limes', 'Jasmine'])
  })

  it('shows no page for a list that does not exist', async () => {
    await mountSuspended(App, { route: '/admin/lists/beans' })

    await vi.waitFor(() => expect(useError().value?.statusCode).toBe(404))
  })

  it('sends users who are not admins home', async () => {
    useCurrentUser().value = testUser()
    await mountSuspended(App, { route: '/profile' })

    await useRouter().push('/admin/lists/flavorNotes')

    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.path).toBe('/shelves/home'),
    )
  })
})
