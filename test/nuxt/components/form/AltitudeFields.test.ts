import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import AltitudeFields from '~/components/form/AltitudeFields.vue'
import { mountInForm, tid } from '../../fixtures'

describe('AltitudeFields', () => {
  it('fills both ends of the range', async () => {
    const { wrapper, form } = await mountInForm(AltitudeFields)

    await wrapper.get(tid('coffee-altitude-from')).setValue('1700')
    await wrapper.get(tid('coffee-altitude-to')).setValue('2000')
    await flushPromises()

    expect(form.values).toMatchObject({
      altitudeFrom: '1700',
      altitudeTo: '2000',
    })
  })

  it('explains an altitude range that makes no sense', async () => {
    const { wrapper, form } = await mountInForm(AltitudeFields, {
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
    expect(
      wrapper.get(tid('coffee-altitude-to')).attributes('aria-invalid'),
    ).toBe('true')
  })
})
