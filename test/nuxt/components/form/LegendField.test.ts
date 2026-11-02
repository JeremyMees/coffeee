import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useForm } from 'vee-validate'
import { defineComponent, h } from 'vue'
import LegendField from '~/components/form/LegendField.vue'

function mountField() {
  let form!: ReturnType<typeof useForm>

  const Form = defineComponent({
    setup() {
      form = useForm({ initialValues: { roastLevel: 'light' } })

      return () =>
        h(
          LegendField,
          { name: 'roastLevel', legend: 'Roast level' },
          {
            default: (field: { value: string; invalid: boolean }) =>
              h('output', { 'data-invalid': String(field.invalid) }, [
                field.value,
              ]),
          },
        )
    },
  })

  return mountSuspended(Form).then(wrapper => ({ wrapper, form }))
}

describe('LegendField', () => {
  it('names its group and hands it the field value', async () => {
    const { wrapper } = await mountField()

    expect(wrapper.get('legend').text()).toBe('Roast level')
    expect(wrapper.get('output').text()).toBe('light')
  })

  it('shows its error and marks the group invalid', async () => {
    const { wrapper, form } = await mountField()

    form.setFieldError('roastLevel', 'Pick a roast level')

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Pick a roast level'),
    )
    expect(wrapper.get('output').attributes('data-invalid')).toBe('true')
    expect(wrapper.get('fieldset').attributes('data-invalid')).toBe('true')
  })
})
