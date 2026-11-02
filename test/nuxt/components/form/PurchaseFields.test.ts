import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import PurchaseFields from '~/components/form/PurchaseFields.vue'
import { mountInForm, tid } from '../../fixtures'

describe('PurchaseFields', () => {
  it('asks when the bag was bought and roasted, its size and price', async () => {
    const { wrapper } = await mountInForm(PurchaseFields)

    for (const field of [
      'coffee-purchased-on',
      'coffee-roasted-on',
      'coffee-size',
      'coffee-price',
    ]) {
      expect(wrapper.find(tid(field)).exists()).toBe(true)
    }
  })

  it('fills the size and price as they are entered', async () => {
    const { wrapper, form } = await mountInForm(PurchaseFields)

    await wrapper.get(tid('coffee-size')).setValue('250')
    await wrapper.get(tid('coffee-price')).setValue('16.50')
    await flushPromises()

    expect(form.values).toMatchObject({ sizeGrams: 250, price: 16.5 })
  })
})
