import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RequiredMark from '~/components/form/RequiredMark.vue'
import { tid } from '../../fixtures'

describe('RequiredMark', () => {
  it('shows a star and tells screen readers the field is required', async () => {
    const mark = await mountSuspended(RequiredMark)

    expect(mark.get(tid('required-mark')).text()).toBe('*')
    expect(mark.get(tid('required-mark')).attributes('aria-hidden')).toBe(
      'true',
    )
    expect(mark.text()).toContain('(required)')
  })
})
