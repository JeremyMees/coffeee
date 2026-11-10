import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import CoffeeFormSteps from '~/components/form/CoffeeFormSteps.vue'
import { byTestId, click, mountInForm } from '../../fixtures'

async function mountSteps(withFirstBag: boolean) {
  const step = ref(1)
  const mounted = await mountInForm(
    defineComponent({
      render: () =>
        h(
          CoffeeFormSteps,
          {
            modelValue: step.value,
            'onUpdate:modelValue': (value: number) => (step.value = value),
            steps: coffeeFormSteps(withFirstBag),
            prefix: 'coffee',
          },
          { submit: () => 'Done' },
        ),
    }),
  )

  return { ...mounted, step }
}

function shown(pane: number) {
  return byTestId(`coffee-pane-${pane}`)?.style.display !== 'none'
}

describe('CoffeeFormSteps', () => {
  it('names each step and shows only the first', async () => {
    await mountSteps(true)

    expect(byTestId('coffee-steps')!.textContent).toContain('Coffee')
    expect(byTestId('coffee-steps')!.textContent).toContain('First bag')
    expect([1, 2, 3, 4].map(shown)).toEqual([true, false, false, false])
  })

  it('leaves out the first bag when it is not a step', async () => {
    await mountSteps(false)

    expect(byTestId('coffee-pane-4')).toBeNull()
  })

  it('names the next step until the last, which submits', async () => {
    const { wrapper, step } = await mountSteps(false)

    expect(byTestId('coffee-back')).toBeNull()
    expect(byTestId('coffee-next')!.textContent).toContain('Next: Origin')
    expect(wrapper.text()).not.toContain('Done')

    await click('coffee-next')

    expect(byTestId('coffee-back')!.textContent).toContain('Back')
    expect(byTestId('coffee-next')!.textContent).toContain('Next: Taste')

    await click('coffee-next')

    expect(step.value).toBe(3)
    expect(byTestId('coffee-next')).toBeNull()
    expect(wrapper.text()).toContain('Done')

    await click('coffee-back')

    expect(step.value).toBe(2)
    expect(shown(2)).toBe(true)
  })

  it('marks the steps whose fields have problems', async () => {
    const { form } = await mountSteps(true)

    form.setErrors({ roastLevel: 'Pick a roast level', price: 'Too much' })
    await new Promise(resolve => setTimeout(resolve))

    expect(byTestId('coffee-step-3')!.dataset.failing).toBe('true')
    expect(byTestId('coffee-step-4')!.dataset.failing).toBe('true')
    expect(byTestId('coffee-step-1')!.dataset.failing).toBeUndefined()
  })
})
