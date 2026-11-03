import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import CoffeeDetailsFields from '~/components/form/CoffeeDetailsFields.vue'
import { fakeApi } from '../../fake-api'
import { mountInForm, tid, type } from '../../fixtures'

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
      'coffee-processes',
      'coffee-varietals',
      'coffee-flavor-notes',
      'coffee-link',
      'coffee-roast-level',
      'coffee-roasted-for',
    ]) {
      expect(wrapper.find(tid(field)).exists()).toBe(true)
    }
  })

  it('fills the name and link as they are entered', async () => {
    const { wrapper, form } = await mountFields()

    await wrapper.get(tid('coffee-name')).setValue('Halo')
    await wrapper.get(tid('coffee-link')).setValue('https://example.com/halo')
    await flushPromises()

    expect(form.values).toMatchObject({
      name: 'Halo',
      link: 'https://example.com/halo',
    })
  })

  it('explains a link that is not a web address', async () => {
    const { wrapper, form } = await mountFields({ link: 'example.com' })

    await form.validate()

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(
        'Enter a link that starts with https://',
      ),
    )
    expect(wrapper.get(tid('coffee-link')).attributes('aria-invalid')).toBe(
      'true',
    )
  })

  it('shows each error next to its field', async () => {
    const { wrapper, form } = await mountFields()

    await form.validate()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Give the coffee a name')
      expect(wrapper.text()).toContain('Pick a roaster or add a new one')
      expect(wrapper.text()).toContain('Pick where it was grown')
      expect(wrapper.text()).toContain('Pick how it was processed')
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
