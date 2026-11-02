import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CoffeeListFields from '~/components/form/CoffeeListFields.vue'
import { fakeApi } from '../../fake-api'
import { mountInForm, pickMulti, tid, type } from '../../fixtures'

fakeApi()

describe('CoffeeListFields', () => {
  it('asks for processes, varietals and producers', async () => {
    const { wrapper } = await mountInForm(CoffeeListFields)

    expect(wrapper.findAll('label').map(label => label.text())).toEqual([
      'Process',
      'Varietal',
      'Producer',
    ])
  })

  it('fills each list as entries are picked or added', async () => {
    const { form } = await mountInForm(CoffeeListFields)

    await pickMulti('coffee-processes', 'wash', 'Washed')
    await pickMulti('coffee-processes', 'Thermal shock', 'Add “Thermal shock”')
    await pickMulti('coffee-varietals', 'geish', 'Geisha')
    await pickMulti('coffee-producers', 'nest', 'Nestor Lasso')
    await flushPromises()

    expect(form.values).toMatchObject({
      processes: ['Washed', 'Thermal shock'],
      varietals: ['Geisha'],
      producers: ['Nestor Lasso'],
    })
  })

  it('only takes an entry once it is picked', async () => {
    const { form } = await mountInForm(CoffeeListFields)

    await type('coffee-varietals', 'Geis')

    expect(form.values.varietals).toEqual([])
  })

  it('explains a coffee without a process', async () => {
    const { wrapper, form } = await mountInForm(CoffeeListFields)

    await form.validate()

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Pick how it was processed'),
    )
    expect(
      wrapper.get(tid('coffee-processes')).attributes('aria-invalid'),
    ).toBe('true')
  })
})
