import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useForm } from 'vee-validate'
import { defineComponent, h } from 'vue'
import CoffeeDetailsFields from '~/components/CoffeeDetailsFields.vue'
import { fakeApi } from '../fake-api'
import { pickOrigin, pickScoped, tid, type } from '../fixtures'

fakeApi()

async function mountFields(initialValues: Record<string, unknown> = {}) {
  let form!: ReturnType<typeof useForm>

  const Form = defineComponent({
    setup() {
      form = useForm({
        validationSchema: zodSchema(coffeeDetailsSchema),
        initialValues: {
          name: '',
          roaster: '',
          origins: [],
          regions: [],
          ...initialValues,
        },
      })

      return () => h('form', [h(CoffeeDetailsFields)])
    },
  })

  const wrapper = await mountSuspended(Form, { attachTo: document.body })

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

  it('only takes a roaster, origin or region once it is picked', async () => {
    const { form } = await mountFields()

    await type('coffee-roaster', 'Squ')
    await type('coffee-origins', 'Colom')
    await flushPromises()

    expect(form.values).toMatchObject({ roaster: '', origins: [] })
  })

  it('fills where it was grown as it is picked', async () => {
    const { wrapper, form } = await mountFields()

    await pickOrigin('colom', 'Colombia')
    await pickScoped('coffee-regions', 'hui', 'Huila')
    await wrapper.get(tid('coffee-altitude-from')).setValue('1700')
    await wrapper.get(tid('coffee-altitude-to')).setValue('2000')
    await flushPromises()

    expect(form.values).toMatchObject({
      origins: ['CO'],
      regions: [{ origin: 'CO', name: 'Huila' }],
      altitudeFrom: '1700',
      altitudeTo: '2000',
    })
  })

  it('drops the regions of an origin that is removed', async () => {
    const { form } = await mountFields({
      origins: ['CO', 'ET'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'ET', name: 'Guji' },
      ],
    })

    form.setFieldValue('origins', ['ET'])
    await flushPromises()

    expect(form.values.regions).toEqual([{ origin: 'ET', name: 'Guji' }])
  })

  it('explains an altitude range that makes no sense', async () => {
    const { wrapper, form } = await mountFields({
      origins: ['CO'],
      altitudeFrom: '2000',
      altitudeTo: '1700',
    })

    await form.validate()

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain(
        "The highest altitude can't be below the lowest",
      ),
    )
  })
})
