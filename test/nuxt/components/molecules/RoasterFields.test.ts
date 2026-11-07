import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useForm } from 'vee-validate'
import { defineComponent, h } from 'vue'
import RoasterFields from '~/components/molecules/RoasterFields.vue'
import { roasterDetailsSchema, zodSchema } from '#imports'
import { allByTestId, byTestId, inputValue } from '../../fixtures'

async function mountFields(values: Record<string, string>) {
  const Form = defineComponent({
    setup() {
      useForm({
        validationSchema: zodSchema(roasterDetailsSchema),
        initialValues: values,
      })

      return () => h('form', [h(RoasterFields)])
    },
  })

  return mountSuspended(Form, { attachTo: document.body })
}

describe('RoasterFields', () => {
  it('shows the name, website, country and city of a roaster', async () => {
    await mountFields({
      name: 'Square Mile',
      website: 'https://squaremilecoffee.com',
      countryCode: 'GB',
      city: 'London',
    })

    expect(inputValue('roaster-name')).toBe('Square Mile')
    expect(inputValue('roaster-website')).toBe('https://squaremilecoffee.com')
    expect(byTestId<HTMLSelectElement>('roaster-country')!.value).toBe('GB')
    expect(inputValue('roaster-city')).toBe('London')
  })

  it('offers every country by name, after no country at all', async () => {
    await mountFields({ name: '', website: '', countryCode: '', city: '' })

    const options =
      allByTestId('roaster-country')[0]!.querySelectorAll('option')
    expect(options[0]!.textContent?.trim()).toBe('No country')
    expect(options[1]!.textContent?.trim()).toBe('Afghanistan')
  })
})
