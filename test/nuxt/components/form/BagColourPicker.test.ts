import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BagColourPicker from '~/components/form/BagColourPicker.vue'
import { tid } from '../../fixtures'

describe('BagColourPicker', () => {
  it('offers every bag colour by name', async () => {
    const picker = await mountSuspended(BagColourPicker)

    expect(
      picker.findAll('input').map(input => input.attributes('aria-label')),
    ).toEqual(bagColours.map(colour => bagColourNames[colour]))
  })

  it('marks the colour already chosen', async () => {
    const picker = await mountSuspended(BagColourPicker, {
      props: { modelValue: '#f2c14e' },
    })

    expect(
      picker.get<HTMLInputElement>(tid('colour-mustard')).element.checked,
    ).toBe(true)
  })

  it('picks a colour', async () => {
    const picker = await mountSuspended(BagColourPicker)

    await picker.get(tid('colour-cherry')).trigger('change')

    expect(picker.emitted('update:modelValue')).toEqual([['#a4243b']])
  })
})
