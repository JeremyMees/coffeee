import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AdminEntrySheet from '~/components/AdminEntrySheet.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, inputValue, pickOption, submit, type } from '../fixtures'
import { flavorNoteEntries } from '#test/fixtures/admin'

fakeApi()

beforeEach(resetApi)

function mountForm(list: AdminList, entry?: AdminEntry) {
  return mountSuspended(AdminEntrySheet, {
    props: { list, entry, open: true },
    attachTo: document.body,
  })
}

async function pickCountry(code: string) {
  const select = byTestId<HTMLSelectElement>('admin-entry-country')!
  select.value = code
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('AdminEntrySheet', () => {
  it('adds an entry by its name and closes', async () => {
    const sheet = await mountForm('flavorNotes')

    expect(byTestId('admin-add-submit')?.textContent).toContain(
      'Add flavor note',
    )
    await type('admin-entry-name', 'Bergamot')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(api.adminCalls).toEqual([
        { add: 'flavorNotes', body: { name: 'Bergamot' } },
      ]),
    )
    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
  })

  it('asks for a name', async () => {
    await mountForm('flavorNotes')

    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-form')?.textContent).toContain(
        'Give it a name',
      ),
    )
    expect(api.adminCalls).toEqual([])
  })

  it('adds a region to the country that is picked', async () => {
    await mountForm('regions')

    await pickCountry('CO')
    await type('admin-entry-name', 'Huila')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(api.adminCalls).toEqual([
        { add: 'regions', body: { name: 'Huila', originCode: 'CO' } },
      ]),
    )
  })

  it('asks which country a region is in', async () => {
    await mountForm('regions')

    await type('admin-entry-name', 'Huila')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-form')?.textContent).toContain(
        'Pick a country from the list',
      ),
    )
  })

  it('offers the brands there are and adds a grinder to one', async () => {
    await mountForm('grinders')

    await type('admin-entry-brand', 'fel')
    await pickOption('Fellow')
    await type('admin-entry-model', 'Opus Gen 2')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(api.adminCalls).toEqual([
        { add: 'grinders', body: { brand: 'Fellow', model: 'Opus Gen 2' } },
      ]),
    )
  })

  it('adds a grinder of a new brand', async () => {
    await mountForm('grinders')

    await type('admin-entry-brand', 'Comandante')
    await pickOption('Add “Comandante”')
    await type('admin-entry-model', 'C40')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(api.adminCalls).toEqual([
        { add: 'grinders', body: { brand: 'Comandante', model: 'C40' } },
      ]),
    )
  })

  it('shows what is already on the list next to the field', async () => {
    await mountForm('grinders')

    await type('admin-entry-brand', 'fel')
    await pickOption('Fellow')
    await type('admin-entry-model', 'Taken')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-form')?.textContent).toContain(
        'Taken is already on the list',
      ),
    )
    expect(byTestId('form-error')).toBeNull()
  })

  it('says what went wrong otherwise', async () => {
    api.adminFails = 'The list is out of reach'
    await mountForm('flavorNotes')

    await type('admin-entry-name', 'Bergamot')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'The list is out of reach',
      ),
    )
  })

  it('starts an update from the name of the entry', async () => {
    await mountForm('flavorNotes', flavorNoteEntries()[1])

    expect(byTestId('form-sheet-title')?.textContent).toContain('Update Limes')
    expect(inputValue('admin-entry-name')).toBe('Limes')
    expect(byTestId('admin-update-submit')?.textContent).toContain(
      'Save changes',
    )
  })

  it('updates an entry and closes', async () => {
    const sheet = await mountForm('flavorNotes', flavorNoteEntries()[1])

    await type('admin-entry-name', 'Key lime')
    await submit('admin-update-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.adminCalls).toEqual([
      { update: 'n2', body: { name: 'Key lime' } },
    ])
  })

  it('starts an update of a region from its country', async () => {
    await mountForm('regions', {
      id: 'g1',
      name: 'Guji',
      detail: 'Ethiopia',
      detailId: 'ET',
      uses: 2,
    })

    expect(inputValue('admin-entry-name')).toBe('Guji')
    expect(byTestId<HTMLSelectElement>('admin-entry-country')!.value).toBe('ET')
  })

  it('starts an update of a grinder from its brand and model', async () => {
    await mountForm('grinders', {
      id: 'opus',
      name: 'Opus',
      detail: 'Fellow',
      detailId: 'b1',
      uses: 1,
    })

    expect(inputValue('admin-entry-brand')).toBe('Fellow')
    expect(inputValue('admin-entry-model')).toBe('Opus')
  })
})
