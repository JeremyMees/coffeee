import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OriginPicker from '~/components/OriginPicker.vue'
import {
  byTestId,
  chipLabels,
  click,
  inputValue,
  originOptions,
  pickOrigin,
  type,
} from '../fixtures'

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(OriginPicker, {
    props: { id: 'coffee-origins', ...props },
    attrs: { 'data-testid': 'coffee-origins' },
    attachTo: document.body,
  })
}

describe('OriginPicker', () => {
  it('shows the origins already picked', async () => {
    await mountPicker({ modelValue: ['CO', 'ET'] })

    expect(chipLabels('coffee-origins-chips')).toEqual(['Colombia', 'Ethiopia'])
  })

  it('finds countries by name, whatever the case or accents', async () => {
    await mountPicker()

    await type('coffee-origins', 'COTE')

    expect(originOptions()).toEqual(['Côte d’Ivoire'])
  })

  it('lists every country by name before anything is typed', async () => {
    await mountPicker()

    await type('coffee-origins', '')

    expect(originOptions().slice(0, 2)).toEqual([
      'Afghanistan',
      'Åland Islands',
    ])
  })

  it('adds a picked country and clears the search', async () => {
    const picker = await mountPicker({ modelValue: ['CO'] })

    await pickOrigin('ethi', 'Ethiopia')

    expect(picker.emitted('update:modelValue')).toEqual([[['CO', 'ET']]])
    expect(inputValue('coffee-origins')).toBe('')
  })

  it('leaves out countries already picked', async () => {
    await mountPicker({ modelValue: ['CO'] })

    await type('coffee-origins', 'colombia')

    expect(byTestId('origin-hint')!.textContent?.trim()).toBe(
      'No country by that name',
    )
  })

  it('removes a picked country', async () => {
    const picker = await mountPicker({ modelValue: ['CO', 'ET'] })

    await click('coffee-origins-chips', 'chip-remove')

    expect(picker.emitted('update:modelValue')).toEqual([[['ET']]])
  })

  it('is marked invalid when its field has an error', async () => {
    await mountPicker({ invalid: true })

    expect(byTestId('coffee-origins')!.getAttribute('aria-invalid')).toBe(
      'true',
    )
  })
})
