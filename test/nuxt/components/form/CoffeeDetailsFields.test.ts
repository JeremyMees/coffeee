import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CoffeeDetailsFields from '~/components/form/CoffeeDetailsFields.vue'
import { fakeApi } from '../../fake-api'
import { mountInForm, pickMulti, tid, type } from '../../fixtures'

fakeApi()

function mountFields(initialValues: Record<string, unknown> = {}) {
  return mountInForm(CoffeeDetailsFields, initialValues)
}

describe('CoffeeDetailsFields', () => {
  it('asks for every shared detail of a coffee', async () => {
    const { wrapper } = await mountFields()

    for (const field of [
      'coffee-name',
      'coffee-roaster',
      'coffee-origins',
      'coffee-regions',
      'coffee-farms',
      'coffee-washing-stations',
      'coffee-altitude-from',
      'coffee-producers',
      'coffee-roast-level',
      'coffee-roasted-for',
      'coffee-colour',
    ]) {
      expect(wrapper.find(tid(field)).exists()).toBe(true)
    }
  })

  it('fills the name and producers as they are entered', async () => {
    const { wrapper, form } = await mountFields()

    await wrapper.get(tid('coffee-name')).setValue('Halo')
    await pickMulti('coffee-producers', 'nest', 'Nestor Lasso')
    await pickMulti('coffee-producers', 'Finca Team', 'Add “Finca Team”')
    await flushPromises()

    expect(form.values).toMatchObject({
      name: 'Halo',
      producers: ['Nestor Lasso', 'Finca Team'],
    })
  })

  it('shows each error next to its field', async () => {
    const { wrapper, form } = await mountFields()

    await form.validate()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Give the coffee a name')
      expect(wrapper.text()).toContain('Pick a roaster or add a new one')
      expect(wrapper.text()).toContain('Pick where it was grown')
      expect(wrapper.text()).toContain('Pick a roast level')
    })
    expect(wrapper.get(tid('coffee-name')).attributes('aria-invalid')).toBe(
      'true',
    )
    expect(wrapper.get(tid('coffee-roaster')).attributes('aria-invalid')).toBe(
      'true',
    )
  })

  it('only takes a roaster or producer once it is picked', async () => {
    const { form } = await mountFields()

    await type('coffee-roaster', 'Squ')
    await type('coffee-producers', 'Nest')
    await flushPromises()

    expect(form.values).toMatchObject({ roaster: '', producers: [] })
  })
})
