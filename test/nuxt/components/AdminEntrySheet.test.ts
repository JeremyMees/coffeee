import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { asc, eq } from 'drizzle-orm'
import AdminEntrySheet from '~/components/AdminEntrySheet.vue'
import type { AdminEntry, AdminList } from '#imports'
import { flavorNote, grinder, grinderBrand, region } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, inputValue, pickOption, submit, type } from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
})

function mountForm(list: AdminList, entry?: AdminEntry) {
  return mountSuspended(AdminEntrySheet, {
    props: { list, entry, open: true },
    attachTo: document.body,
  })
}

function pickCountry(code: string) {
  const select = byTestId<HTMLSelectElement>('admin-entry-country')!
  select.value = code
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

async function flavorNotes() {
  const db = await database()
  const notes = await db
    .select({ name: flavorNote.name })
    .from(flavorNote)
    .orderBy(asc(flavorNote.nameKey))

  return notes.map(note => note.name)
}

async function regions() {
  const db = await database()

  return db
    .select({ name: region.name, originCode: region.originCode })
    .from(region)
}

async function grinders() {
  const db = await database()

  return db
    .select({ brand: grinderBrand.name, model: grinder.name })
    .from(grinder)
    .innerJoin(grinderBrand, eq(grinderBrand.id, grinder.brandId))
    .orderBy(asc(grinder.nameKey))
}

async function flavorNoteEntry(name: string): Promise<AdminEntry> {
  const added = await scenario.adminEntry(jeremy, 'flavorNotes', { name })

  return { ...added, detail: null, detailId: null, uses: 0 }
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
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await flavorNotes()).toEqual(['Bergamot'])
  })

  it('asks for a name', async () => {
    await mountForm('flavorNotes')

    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-form')?.textContent).toContain(
        'Give it a name',
      ),
    )
    expect(await flavorNotes()).toEqual([])
  })

  it('adds a region to the country that is picked', async () => {
    const sheet = await mountForm('regions')

    pickCountry('CO')
    await type('admin-entry-name', 'Huila')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await regions()).toEqual([{ name: 'Huila', originCode: 'CO' }])
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
    expect(await regions()).toEqual([])
  })

  it('offers the brands there are and adds a grinder to one', async () => {
    await scenario.adminEntry(jeremy, 'grinderBrands', { name: 'Fellow' })
    const sheet = await mountForm('grinders')

    await type('admin-entry-brand', 'fel')
    await pickOption('Fellow')
    await type('admin-entry-model', 'Opus Gen 2')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await grinders()).toEqual([{ brand: 'Fellow', model: 'Opus Gen 2' }])
  })

  it('adds a grinder of a new brand', async () => {
    const sheet = await mountForm('grinders')

    await type('admin-entry-brand', 'Comandante')
    await pickOption('Add “Comandante”')
    await type('admin-entry-model', 'C40')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await grinders()).toEqual([{ brand: 'Comandante', model: 'C40' }])
  })

  it('shows what is already on the list next to the field', async () => {
    await scenario.adminEntry(jeremy, 'grinders', {
      brand: 'Fellow',
      model: 'Opus Gen 2',
    })
    await mountForm('grinders')

    await type('admin-entry-brand', 'fel')
    await pickOption('Fellow')
    await type('admin-entry-model', 'Opus Gen 2')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-form')?.textContent).toContain(
        'Fellow Opus Gen 2 is already on the list',
      ),
    )
    expect(byTestId('form-error')).toBeNull()
  })

  it('says what went wrong otherwise', async () => {
    failRequest('POST', '/api/admin/lists/flavorNotes', {
      status: 500,
      message: 'The list is out of reach',
    })
    await mountForm('flavorNotes')

    await type('admin-entry-name', 'Bergamot')
    await submit('admin-add-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'The list is out of reach',
      ),
    )
    expect(await flavorNotes()).toEqual([])
  })

  it('starts an update from the name of the entry', async () => {
    await mountForm('flavorNotes', await flavorNoteEntry('Limes'))

    expect(byTestId('form-sheet-title')?.textContent).toContain('Update Limes')
    expect(inputValue('admin-entry-name')).toBe('Limes')
    expect(byTestId('admin-update-submit')?.textContent).toContain(
      'Save changes',
    )
  })

  it('updates an entry and closes', async () => {
    const sheet = await mountForm('flavorNotes', await flavorNoteEntry('Limes'))

    await type('admin-entry-name', 'Key lime')
    await submit('admin-update-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await flavorNotes()).toEqual(['Key lime'])
  })

  it('starts an update of a region from its country', async () => {
    const guji = await scenario.adminEntry(jeremy, 'regions', {
      name: 'Guji',
      originCode: 'ET',
    })

    await mountForm('regions', {
      ...guji,
      detail: 'Ethiopia',
      detailId: 'ET',
      uses: 0,
    })

    expect(inputValue('admin-entry-name')).toBe('Guji')
    expect(byTestId<HTMLSelectElement>('admin-entry-country')!.value).toBe('ET')
  })

  it('starts an update of a grinder from its brand and model', async () => {
    const opus = await scenario.adminEntry(jeremy, 'grinders', {
      brand: 'Fellow',
      model: 'Opus',
    })
    const [fellow] = await (
      await database()
    )
      .select({ id: grinderBrand.id })
      .from(grinderBrand)

    await mountForm('grinders', {
      ...opus,
      detail: 'Fellow',
      detailId: fellow!.id,
      uses: 0,
    })

    expect(inputValue('admin-entry-brand')).toBe('Fellow')
    expect(inputValue('admin-entry-model')).toBe('Opus')
  })
})
