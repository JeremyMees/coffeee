import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useForm } from 'vee-validate'
import { defineComponent, h } from 'vue'
import CoffeeDetailsFields from '~/components/CoffeeDetailsFields.vue'
import { fakeApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

async function mountFields(initialValues: Record<string, unknown> = {}) {
  let form!: ReturnType<typeof useForm>

  const Form = defineComponent({
    setup() {
      form = useForm({
        validationSchema: zodSchema(coffeeDetailsSchema),
        initialValues: { name: '', roaster: '', ...initialValues },
      })

      return () => h('form', [h(CoffeeDetailsFields)])
    },
  })

  const wrapper = await mountSuspended(Form)

  return { wrapper, form }
}

describe('CoffeeDetailsFields', () => {
  it('asks for every shared detail of a coffee', async () => {
    const { wrapper } = await mountFields()

    expect(wrapper.find(tid('coffee-name')).exists()).toBe(true)
    expect(wrapper.find(tid('coffee-roaster')).exists()).toBe(true)
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
    expect(
      wrapper
        .findAll(`${tid('coffee-colour')} input`)
        .map(input => input.attributes('aria-label')),
    ).toEqual(bagColours.map(colour => bagColourNames[colour]))
  })

  it('fills the form as details are picked', async () => {
    const { wrapper, form } = await mountFields()

    await wrapper.get(tid('coffee-name')).setValue('Halo')
    await wrapper.get(tid('coffee-roast-level', 'option-dark')).setValue()
    await wrapper.get(tid('coffee-roasted-for', 'option-espresso')).setValue()
    await wrapper.get(tid('coffee-colour', 'colour-cherry')).trigger('change')
    await flushPromises()

    expect(form.values).toMatchObject({
      name: 'Halo',
      roastLevel: 'dark',
      roastedFor: 'espresso',
      colour: '#a4243b',
    })
  })

  it('marks the colour already chosen', async () => {
    const { wrapper } = await mountFields({ colour: '#f2c14e' })

    expect(
      wrapper.get<HTMLInputElement>(tid('coffee-colour', 'colour-mustard'))
        .element.checked,
    ).toBe(true)
  })

  it('shows each error next to its field', async () => {
    const { wrapper, form } = await mountFields()

    await form.validate()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Give the coffee a name')
      expect(wrapper.text()).toContain('Pick a roaster or add a new one')
      expect(wrapper.text()).toContain('Pick a roast level')
      expect(wrapper.text()).toContain('Pick what it was roasted for')
      expect(wrapper.text()).toContain('Pick a colour')
    })
    expect(wrapper.get(tid('coffee-name')).attributes('aria-invalid')).toBe(
      'true',
    )
    expect(wrapper.get(tid('coffee-roaster')).attributes('aria-invalid')).toBe(
      'true',
    )
  })
})
