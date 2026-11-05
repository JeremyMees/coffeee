import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import AdminAddCoffeeSheet from '~/components/AdminAddCoffeeSheet.vue'
import { coffee, roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import {
  byTestId,
  click,
  pickMulti,
  pickOrigin,
  pickRoaster,
  submit,
  type,
} from '../fixtures'
import { database, scenario, signIn } from '../server'

let jeremy: Member

beforeEach(async () => {
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await scenario.roaster(jeremy, 'Square Mile')
  await signIn(jeremy)
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

async function stored() {
  const db = await database()

  return db
    .select({ name: coffee.name, roaster: roaster.name })
    .from(coffee)
    .innerJoin(roaster, eq(roaster.id, coffee.roasterId))
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
    expect(await stored()).toEqual([
      { name: 'Ayele Fulasa', roaster: 'Square Mile' },
    ])
  })

  it('shows a coffee that is already in the catalog next to its name', async () => {
    await scenario.coffee(jeremy.shelf)
    await openSheet()

    await fillRequired('Ayele Fulasa')
    await submit('admin-add-coffee-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-coffee-sheet')?.textContent).toContain(
        'Square Mile Ayele Fulasa is already on the list',
      ),
    )
    expect(await stored()).toHaveLength(1)
  })
})
