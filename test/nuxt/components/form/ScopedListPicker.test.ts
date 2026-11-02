import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import ScopedListPicker from '~/components/form/ScopedListPicker.vue'
import { fakeRegions } from '../../fake-api'
import {
  allByTestId,
  byTestId,
  chipLabels,
  click,
  inputValue,
  pickScoped,
  type,
} from '../../fixtures'

const searched: string[] = []

registerEndpoint('/api/farms', event => {
  searched.push(new URL(event.path, 'http://test').searchParams.get('origins')!)

  return fakeRegions(() => [
    { id: 'f1', name: 'El Paraiso', origin: 'CO' },
    { id: 'f2', name: 'Santa Rosa', origin: 'CO' },
    { id: 'f3', name: 'Santa Rosa', origin: 'ET' },
  ])(event)
})

beforeEach(() => {
  searched.length = 0
})

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(ScopedListPicker, {
    props: {
      id: 'coffee-farms',
      endpoint: '/api/farms',
      origins: ['CO'],
      placeholder: 'Search or add a farm',
      hint: "Type the farm's name",
      ...props,
    },
    attrs: { 'data-testid': 'coffee-farms' },
    attachTo: document.body,
  })
}

function optionTexts() {
  return allByTestId('scoped-option')
    .concat(allByTestId('scoped-option-new'))
    .map(element => element.textContent?.replace(/\s+/g, ' ').trim())
}

describe('ScopedListPicker', () => {
  it('waits for an origin before it can be used', async () => {
    await mountPicker({ origins: [] })

    const input = byTestId<HTMLInputElement>('coffee-farms')!
    expect(input.disabled).toBe(true)
    expect(input.placeholder).toBe('Pick an origin first')
  })

  it('asks the list only for entries of the coffee’s origins', async () => {
    await mountPicker({ origins: ['CO', 'ET'] })

    await type('coffee-farms', 'santa rosa')

    await vi.waitFor(() =>
      expect(optionTexts()).toEqual([
        'Santa Rosa · Colombia',
        'Santa Rosa · Ethiopia',
      ]),
    )
    expect(searched).toContain('CO,ET')
  })

  it('names the country only when there are several origins', async () => {
    await mountPicker()

    await type('coffee-farms', 'santa rosa')

    await vi.waitFor(() => expect(optionTexts()).toEqual(['Santa Rosa']))
  })

  it('offers to add a new entry in each origin', async () => {
    await mountPicker({ origins: ['CO', 'ET'] })

    await type('coffee-farms', 'El Paraiso')

    await vi.waitFor(() =>
      expect(optionTexts()).toEqual([
        'El Paraiso · Colombia',
        'Add “El Paraiso” in Ethiopia',
      ]),
    )
  })

  it('adds a picked entry and clears the search', async () => {
    const picker = await mountPicker()

    await pickScoped('coffee-farms', 'paraiso', 'El Paraiso')

    expect(picker.emitted('update:modelValue')).toEqual([
      [[{ origin: 'CO', name: 'El Paraiso' }]],
    ])
    expect(inputValue('coffee-farms')).toBe('')
  })

  it('adds a new entry by the name typed', async () => {
    const picker = await mountPicker()

    await pickScoped('coffee-farms', ' La Esperanza ', 'Add “La Esperanza”')

    expect(picker.emitted('update:modelValue')).toEqual([
      [[{ origin: 'CO', name: 'La Esperanza' }]],
    ])
  })

  it('leaves out entries already picked', async () => {
    await mountPicker({
      modelValue: [{ origin: 'CO', name: 'santa rosa' }],
    })

    await type('coffee-farms', 'Santa Rosa')

    await vi.waitFor(() =>
      expect(byTestId('scoped-hint')!.textContent?.trim()).toBe(
        "Type the farm's name",
      ),
    )
  })

  it('shows and removes the picks', async () => {
    const picker = await mountPicker({
      origins: ['CO', 'ET'],
      modelValue: [
        { origin: 'CO', name: 'El Paraiso' },
        { origin: 'ET', name: 'Santa Rosa' },
      ],
    })

    expect(chipLabels('coffee-farms-chips')).toEqual([
      'El Paraiso',
      'Santa Rosa',
    ])

    await click('coffee-farms-chips', 'chip-remove')

    expect(picker.emitted('update:modelValue')).toEqual([
      [[{ origin: 'ET', name: 'Santa Rosa' }]],
    ])
  })

  it('is marked invalid when its field has an error', async () => {
    await mountPicker({ invalid: true })

    expect(byTestId('coffee-farms')!.getAttribute('aria-invalid')).toBe('true')
  })
})
