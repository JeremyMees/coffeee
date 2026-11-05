import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfGrinders from '~/components/ShelfGrinders.vue'
import { grinderName } from '#imports'
import { listShelfGrinders } from '#server/utils/grinders'
import type { Member } from '#test/support/types'
import {
  allByTestId,
  byTestId,
  click,
  inputValue,
  pickerOptions,
  pickOption,
  submit,
  type,
} from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

let sarah: Member
let opus: { id: string }

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  const tom = await scenario.member('Tom')
  await scenario.grinder(tom.shelf, { brand: 'Fellow', model: 'Ode Gen 2' })
  opus = await scenario.grinder(sarah.shelf, {
    brand: 'Fellow',
    model: 'Opus Gen 2',
  })
  await signIn(sarah)
})

function mountGrinders() {
  return mountSuspended(ShelfGrinders, {
    props: { shelfId: sarah.shelf.id },
    attachTo: document.body,
  })
}

function grinderNames() {
  return allByTestId('shelf-grinder-name').map(name => name.textContent?.trim())
}

async function storedGrinders() {
  const owned = await listShelfGrinders(await database(), sarah.shelf.id)

  return owned.map(grinderName)
}

describe('ShelfGrinders', () => {
  it('lists the grinders the shelf owns', async () => {
    await mountGrinders()

    expect(grinderNames()).toEqual(['Fellow Opus Gen 2'])
    expect(byTestId('shelf-grinders-empty')).toBeNull()
  })

  it('says when the shelf owns no grinders', async () => {
    const lisa = await scenario.member('Lisa')
    await signIn(lisa)

    await mountSuspended(ShelfGrinders, {
      props: { shelfId: lisa.shelf.id },
      attachTo: document.body,
    })

    expect(byTestId('shelf-grinders-empty')!.textContent?.trim()).toBe(
      'No grinders on this shelf yet.',
    )
  })

  it('adds a grinder from a picked brand and a new model', async () => {
    await mountGrinders()

    await type('grinder-brand', 'fel')
    await pickOption('Fellow')
    await type('grinder-model', 'Ode')
    await vi.waitFor(() =>
      expect(pickerOptions()).toEqual(['Ode Gen 2', 'Add “Ode”']),
    )
    await type('grinder-model', 'Ode Gen 3')
    await pickOption('Add “Ode Gen 3”')
    await submit('grinder-form')

    await vi.waitFor(() =>
      expect(grinderNames()).toEqual(['Fellow Ode Gen 3', 'Fellow Opus Gen 2']),
    )
    expect(await storedGrinders()).toEqual([
      'Fellow Ode Gen 3',
      'Fellow Opus Gen 2',
    ])
    await vi.waitFor(() => {
      expect(inputValue('grinder-brand')).toBe('')
      expect(inputValue('grinder-model')).toBe('')
    })
  })

  it('asks for a brand and a model before adding', async () => {
    await mountGrinders()

    await submit('grinder-form')

    await vi.waitFor(() =>
      expect(byTestId('grinder-form')!.textContent).toContain(
        'Pick a brand or add a new one',
      ),
    )
    expect(byTestId('grinder-form')!.textContent).toContain(
      'Pick a model or add a new one',
    )
    expect(await storedGrinders()).toEqual(['Fellow Opus Gen 2'])
  })

  it('says why a grinder could not be added', async () => {
    failRequest('POST', `/api/shelves/${sarah.shelf.id}/grinders`, {
      status: 500,
      message: 'The grinder could not be added',
    })
    await mountGrinders()

    await type('grinder-brand', 'fel')
    await pickOption('Fellow')
    await type('grinder-model', 'Ode')
    await pickOption('Ode Gen 2')
    await submit('grinder-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'The grinder could not be added',
      ),
    )
    expect(await storedGrinders()).toEqual(['Fellow Opus Gen 2'])
  })

  it('removes a grinder from the shelf', async () => {
    await mountGrinders()

    expect(byTestId('shelf-grinder-remove')!.getAttribute('aria-label')).toBe(
      'Remove Fellow Opus Gen 2',
    )
    await click('shelf-grinder-remove')

    await vi.waitFor(() => expect(grinderNames()).toEqual([]))
    expect(await storedGrinders()).toEqual([])
  })

  it('says why a grinder could not be removed', async () => {
    failRequest(
      'DELETE',
      `/api/shelves/${sarah.shelf.id}/grinders/${opus.id}`,
      {
        status: 404,
        message: 'This shelf does not own that grinder',
      },
    )
    await mountGrinders()

    await click('shelf-grinder-remove')

    await vi.waitFor(() =>
      expect(byTestId('shelf-grinder-remove-error')!.textContent?.trim()).toBe(
        'This shelf does not own that grinder',
      ),
    )
    expect(await storedGrinders()).toEqual(['Fellow Opus Gen 2'])
  })
})
