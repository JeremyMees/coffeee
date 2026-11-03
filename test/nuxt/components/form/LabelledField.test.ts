import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useForm } from 'vee-validate'
import { defineComponent, h } from 'vue'
import LabelledField from '~/components/form/LabelledField.vue'

function mountField(props: Record<string, unknown> = {}) {
  let form!: ReturnType<typeof useForm>

  const Form = defineComponent({
    setup() {
      form = useForm({ initialValues: { name: 'Halo' } })

      return () =>
        h(
          LabelledField,
          { name: 'name', label: 'Coffee', inputId: 'coffee-name', ...props },
          {
            default: (field: { value: string; invalid: boolean }) =>
              h('input', {
                id: 'coffee-name',
                value: field.value,
                'data-invalid': String(field.invalid),
              }),
          },
        )
    },
  })

  return mountSuspended(Form).then(wrapper => ({ wrapper, form }))
}

describe('LabelledField', () => {
  it('labels its input and hands it the field value', async () => {
    const { wrapper } = await mountField()

    expect(wrapper.get('label').text()).toBe('Coffee')
    expect(wrapper.get('label').attributes('for')).toBe('coffee-name')
    expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('Halo')
  })

  it('marks a required field', async () => {
    const plain = await mountField()
    const required = await mountField({ required: true })

    expect(plain.wrapper.find('[data-testid="required-mark"]').exists()).toBe(
      false,
    )
    expect(
      required.wrapper.find('label [data-testid="required-mark"]').exists(),
    ).toBe(true)
  })

  it('can use a small label', async () => {
    const { wrapper } = await mountField({ small: true })

    expect(wrapper.get('label').classes()).toContain('text-xs')
  })

  it('shows its error and marks the input invalid', async () => {
    const { wrapper, form } = await mountField()

    form.setFieldError('name', 'Give the coffee a name')

    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Give the coffee a name'),
    )
    expect(wrapper.get('input').attributes('data-invalid')).toBe('true')
  })
})
