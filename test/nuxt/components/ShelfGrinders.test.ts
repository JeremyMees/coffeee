import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShelfGrinders from '~/components/ShelfGrinders.vue'
import { api, fakeApi, resetApi } from '../fake-api'
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

fakeApi()

beforeEach(resetApi)

function mountGrinders() {
  return mountSuspended(ShelfGrinders, {
    props: { shelfId: 'home' },
    attachTo: document.body,
  })
}

function grinderNames() {
  return allByTestId('shelf-grinder-name').map(name => name.textContent?.trim())
}

describe('ShelfGrinders', () => {
  it('lists the grinders the shelf owns', async () => {
    await mountGrinders()

    expect(grinderNames()).toEqual(['Fellow Opus Gen 2'])
    expect(byTestId('shelf-grinders-empty')).toBeNull()
  })

  it('says when the shelf owns no grinders', async () => {
    api.grinders = []

    await mountGrinders()

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
      expect(grinderNames()).toEqual(['Fellow Opus Gen 2', 'Fellow Ode Gen 3']),
    )
    expect(api.grinderCalls).toEqual([
      { own: { brand: 'Fellow', model: 'Ode Gen 3' } },
    ])
    expect(inputValue('grinder-brand')).toBe('')
    expect(inputValue('grinder-model')).toBe('')
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
    expect(api.grinderCalls).toEqual([])
  })

  it('says why a grinder could not be added', async () => {
    api.grinderFails = true
    await mountGrinders()

    await type('grinder-brand', 'Niche')
    await pickOption('Niche')
    await type('grinder-model', 'Zero')
    await pickOption('Add “Zero”')
    await submit('grinder-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'The grinder could not be added',
      ),
    )
  })

  it('removes a grinder from the shelf', async () => {
    await mountGrinders()

    expect(byTestId('shelf-grinder-remove')!.getAttribute('aria-label')).toBe(
      'Remove Fellow Opus Gen 2',
    )
    await click('shelf-grinder-remove')

    await vi.waitFor(() => expect(grinderNames()).toEqual([]))
    expect(api.grinderCalls).toEqual([{ disown: 'opus' }])
  })

  it('says why a grinder could not be removed', async () => {
    api.grinderFails = true
    await mountGrinders()

    await click('shelf-grinder-remove')

    await vi.waitFor(() =>
      expect(byTestId('shelf-grinder-remove-error')!.textContent?.trim()).toBe(
        'This shelf does not own that grinder',
      ),
    )
  })
})
