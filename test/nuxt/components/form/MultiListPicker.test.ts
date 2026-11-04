import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MultiListPicker from '~/components/form/MultiListPicker.vue'
import {
  allByTestId,
  byTestId,
  chipLabels,
  click,
  inputValue,
  pickMulti,
  type,
} from '../../fixtures'
import { scenario, signIn } from '../../server'

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  await scenario.coffee(sarah.shelf, {
    producers: ['Nestor Lasso', 'Diego Bermudez'],
  })
  await signIn(sarah)
})

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(MultiListPicker, {
    props: {
      id: 'coffee-producers',
      endpoint: '/api/producers',
      placeholder: 'Search or add a producer',
      hint: "Type the producer's name",
      ...props,
    },
    attrs: { 'data-testid': 'coffee-producers' },
    attachTo: document.body,
  })
}

function optionTexts() {
  return allByTestId('multi-option')
    .concat(allByTestId('multi-option-new'))
    .map(element => element.textContent?.trim())
}

describe('MultiListPicker', () => {
  it('suggests entries that match the search', async () => {
    await mountPicker()

    await type('coffee-producers', 'nestor lasso')

    await vi.waitFor(() => expect(optionTexts()).toEqual(['Nestor Lasso']))
  })

  it('offers to add a name that is not on the list', async () => {
    await mountPicker()

    await type('coffee-producers', 'Finca Team')

    await vi.waitFor(() => expect(optionTexts()).toEqual(['Add “Finca Team”']))
  })

  it('adds a picked entry and clears the search', async () => {
    const picker = await mountPicker({ modelValue: ['Diego Bermudez'] })

    await pickMulti('coffee-producers', 'nest', 'Nestor Lasso')

    expect(picker.emitted('update:modelValue')).toEqual([
      [['Diego Bermudez', 'Nestor Lasso']],
    ])
    expect(inputValue('coffee-producers')).toBe('')
  })

  it('adds a new entry by the name typed', async () => {
    const picker = await mountPicker()

    await pickMulti('coffee-producers', ' Finca Team ', 'Add “Finca Team”')

    expect(picker.emitted('update:modelValue')).toEqual([[['Finca Team']]])
  })

  it('leaves out entries already picked', async () => {
    await mountPicker({ modelValue: ['nestor lasso'] })

    await type('coffee-producers', 'Nestor Lasso')

    await vi.waitFor(() =>
      expect(byTestId('multi-hint')!.textContent?.trim()).toBe(
        "Type the producer's name",
      ),
    )
  })

  it('shows and removes the picks', async () => {
    const picker = await mountPicker({
      modelValue: ['Nestor Lasso', 'Diego Bermudez'],
    })

    expect(chipLabels('coffee-producers-chips')).toEqual([
      'Nestor Lasso',
      'Diego Bermudez',
    ])

    await click('coffee-producers-chips', 'chip-remove')

    expect(picker.emitted('update:modelValue')).toEqual([[['Diego Bermudez']]])
  })

  it('is marked invalid when its field has an error', async () => {
    await mountPicker({ invalid: true })

    expect(byTestId('coffee-producers')!.getAttribute('aria-invalid')).toBe(
      'true',
    )
  })
})
