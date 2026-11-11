import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import SpecRow from '~/components/atoms/SpecRow.vue'
import { tid } from '../../fixtures'

function row(centered = false) {
  return mountSuspended(SpecRow, {
    props: { label: 'Roast', centered },
    slots: { default: () => '<dd>Light</dd>' },
  })
}

describe('SpecRow', () => {
  it('names the spec and shows its value', async () => {
    const wrapper = await row()

    expect(wrapper.get('dt').text()).toBe('Roast')
    expect(wrapper.text()).toContain('Light')
    expect(wrapper.get(tid('spec-row-leader')).attributes('aria-hidden')).toBe(
      'true',
    )
  })

  it('lines text up on its baseline and other values on their centre', async () => {
    expect((await row()).get(tid('spec-row')).classes()).toContain(
      'items-baseline',
    )
    expect((await row(true)).get(tid('spec-row')).classes()).toContain(
      'items-center',
    )
  })
})
