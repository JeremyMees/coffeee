import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DescriptionListFields from '~/components/form/DescriptionListFields.vue'
import { mountInForm, pickMulti, tid, type } from '../../fixtures'
import { scenario, signIn } from '../../server'

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  await scenario.coffee(sarah.shelf, {
    varietals: ['Geisha'],
    producers: ['Nestor Lasso'],
  })
  await signIn(sarah)
})

describe('DescriptionListFields', () => {
  it('asks only for the lists it is given, in that order', async () => {
    const { wrapper } = await mountInForm(
      defineComponent({
        render: () =>
          h(DescriptionListFields, { fields: ['flavorNotes', 'processes'] }),
      }),
    )

    expect(
      wrapper.findAll('label').map(label => label.text().replace(/\s+/g, ' ')),
    ).toEqual(['Flavor note', 'Process * (required)'])
  })

  it('asks for processes, which are required, varietals, flavor notes and producers', async () => {
    const { wrapper } = await mountInForm(DescriptionListFields)

    expect(
      wrapper.findAll('label').map(label => label.text().replace(/\s+/g, ' ')),
    ).toEqual(['Process * (required)', 'Varietal', 'Flavor note', 'Producer'])
  })

  it('fills each list as entries are picked or added', async () => {
    const { form } = await mountInForm(DescriptionListFields)

    await pickMulti('coffee-processes', 'wash', 'Washed')
    await pickMulti('coffee-processes', 'Thermal shock', 'Add “Thermal shock”')
    await pickMulti('coffee-varietals', 'geish', 'Geisha')
    await pickMulti('coffee-flavor-notes', 'Bergamot', 'Add “Bergamot”')
    await pickMulti('coffee-producers', 'nest', 'Nestor Lasso')
    await flushPromises()

    expect(form.values).toMatchObject({
      processes: ['Washed', 'Thermal shock'],
      varietals: ['Geisha'],
      flavorNotes: ['Bergamot'],
      producers: ['Nestor Lasso'],
    })
  })

  it('only takes an entry once it is picked', async () => {
    const { form } = await mountInForm(DescriptionListFields)

    await type('coffee-varietals', 'Geis')

    expect(form.values.varietals).toEqual([])
  })

  it('explains a coffee without a process', async () => {
    const { wrapper, form } = await mountInForm(DescriptionListFields)

    await form.validate()

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Pick how it was processed'),
    )
    expect(
      wrapper.get(tid('coffee-processes')).attributes('aria-invalid'),
    ).toBe('true')
  })
})
