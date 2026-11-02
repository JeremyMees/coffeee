import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OptionPills from '~/components/OptionPills.vue'
import { tid } from '../fixtures'

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function mountPills(props: Record<string, unknown> = {}) {
  return mountSuspended(OptionPills, {
    props: { name: 'roastLevel', options, ...props },
  })
}

function radio(pills: Awaited<ReturnType<typeof mountPills>>, value: string) {
  return pills.get<HTMLInputElement>(tid(`option-${value}`))
}

describe('OptionPills', () => {
  it('shows each option as a radio in one group', async () => {
    const pills = await mountPills()

    expect(
      radio(pills, 'light').element.closest('label')?.textContent,
    ).toContain('Light')
    expect(
      radio(pills, 'dark').element.closest('label')?.textContent,
    ).toContain('Dark')
    expect(radio(pills, 'light').attributes('name')).toBe('roastLevel')
    expect(radio(pills, 'dark').attributes('name')).toBe('roastLevel')
  })

  it('checks the chosen option', async () => {
    const pills = await mountPills({ modelValue: 'dark' })

    expect(radio(pills, 'dark').element.checked).toBe(true)
    expect(radio(pills, 'light').element.checked).toBe(false)
  })

  it('gives the picked option', async () => {
    const pills = await mountPills()

    await radio(pills, 'light').setValue()

    expect(pills.emitted('update:modelValue')).toEqual([['light']])
  })

  it('is marked invalid only when its field has an error', async () => {
    const valid = await mountPills()
    const invalid = await mountPills({ invalid: true })

    expect(radio(valid, 'light').attributes('aria-invalid')).toBeUndefined()
    expect(radio(invalid, 'light').attributes('aria-invalid')).toBe('true')
  })
})
