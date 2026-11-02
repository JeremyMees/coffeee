import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CoffeeRoastFields from '~/components/form/CoffeeRoastFields.vue'
import { mountInForm, tid } from '../../fixtures'

describe('CoffeeRoastFields', () => {
  it('offers every roast level and what it was roasted for', async () => {
    const { wrapper } = await mountInForm(CoffeeRoastFields)

    for (const level of roastLevels) {
      expect(
        wrapper.find(tid('coffee-roast-level', `option-${level}`)).exists(),
      ).toBe(true)
    }
    for (const option of roastedForOptions) {
      expect(
        wrapper.find(tid('coffee-roasted-for', `option-${option}`)).exists(),
      ).toBe(true)
    }
  })

  it('fills the form as they are picked', async () => {
    const { wrapper, form } = await mountInForm(CoffeeRoastFields)

    await wrapper.get(tid('coffee-roast-level', 'option-dark')).setValue()
    await wrapper.get(tid('coffee-roasted-for', 'option-espresso')).setValue()
    await wrapper.get(tid('coffee-colour', 'colour-cherry')).trigger('change')
    await flushPromises()

    expect(form.values).toMatchObject({
      roastLevel: 'dark',
      roastedFor: 'espresso',
      colour: '#a4243b',
    })
  })

  it('shows each error next to its field', async () => {
    const { wrapper, form } = await mountInForm(CoffeeRoastFields)

    await form.validate()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Pick a roast level')
      expect(wrapper.text()).toContain('Pick what it was roasted for')
      expect(wrapper.text()).toContain('Pick a colour')
    })
  })
})
