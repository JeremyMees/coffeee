import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DatePicker from '~/components/DatePicker.vue'
import { byTestId, daysAgo, pickDate, tid } from '../fixtures'

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(DatePicker, {
    props: { id: 'roasted-on', label: 'Roasted on', ...props },
    attrs: { 'data-testid': 'roasted-on' },
    attachTo: document.body,
  })
}

function calendar(selector: string) {
  return document.body.querySelector(
    `${tid('date-picker-calendar')} ${selector}`,
  )
}

describe('DatePicker', () => {
  it('asks for a date while there is none', async () => {
    const picker = await mountPicker()

    expect(picker.get(tid('date-picker-trigger')).text()).toBe('Pick a date')
  })

  it('shows the picked date in words', async () => {
    const picker = await mountPicker({ modelValue: '2026-10-28' })

    expect(picker.get(tid('date-picker-trigger')).text()).toBe(
      formatDate('2026-10-28'),
    )
  })

  it('gives the picked day as an ISO date', async () => {
    const picker = await mountPicker()

    await pickDate('roasted-on', daysAgo(40))

    expect(picker.emitted('update:modelValue')).toEqual([[daysAgo(40)]])
    expect(byTestId('date-picker-calendar')).toBeNull()
  })

  it('clears the date when the picked day is picked again', async () => {
    const picker = await mountPicker({ modelValue: daysAgo(3) })

    await pickDate('roasted-on', daysAgo(3))

    expect(picker.emitted('update:modelValue')).toEqual([['']])
  })

  it('opens on the month of the picked date', async () => {
    const picker = await mountPicker({ modelValue: '2025-03-14' })

    await picker.get(tid('date-picker-trigger')).trigger('click')

    expect(
      calendar('[data-value="2025-03-14"]:not([data-outside-view])'),
    ).not.toBeNull()
  })

  it('does not go past today', async () => {
    const picker = await mountPicker()

    await picker.get(tid('date-picker-trigger')).trigger('click')

    expect(
      calendar('[data-slot="calendar-next-button"]')?.hasAttribute('disabled'),
    ).toBe(true)
  })

  it('can be cleared only when it is optional and has a date', async () => {
    const empty = await mountPicker({ clearable: true })
    expect(empty.find(tid('date-picker-clear')).exists()).toBe(false)

    const required = await mountPicker({ modelValue: '2026-10-28' })
    expect(required.find(tid('date-picker-clear')).exists()).toBe(false)

    const optional = await mountPicker({
      modelValue: '2026-10-28',
      clearable: true,
    })
    const clear = optional.get(tid('date-picker-clear'))
    expect(clear.attributes('aria-label')).toBe('Clear roasted on')
    await clear.trigger('click')
    expect(optional.emitted('update:modelValue')).toEqual([['']])
  })

  it('is marked invalid when its field has an error', async () => {
    const picker = await mountPicker({ invalid: true })

    expect(
      picker.get(tid('date-picker-trigger')).attributes('aria-invalid'),
    ).toBe('true')
  })
})
