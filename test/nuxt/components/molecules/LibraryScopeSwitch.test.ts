import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LibraryScopeSwitch from '~/components/molecules/LibraryScopeSwitch.vue'
import { tid } from '../../fixtures'

async function scopeSwitch(modelValue: LibraryScope) {
  const picks: LibraryScope[] = []
  const wrapper = await mountSuspended(LibraryScopeSwitch, {
    props: {
      modelValue,
      'onUpdate:modelValue': (scope: LibraryScope) => picks.push(scope),
    },
  })

  return { wrapper, picks }
}

describe('LibraryScopeSwitch', () => {
  it('names both sides and marks the one that is on', async () => {
    const { wrapper } = await scopeSwitch('all')

    expect(wrapper.get(tid('library-scope-all')).text()).toBe('All coffees')
    expect(wrapper.get(tid('library-scope-bought')).text()).toBe('Bought')
    expect(
      wrapper.get(tid('library-scope-all')).attributes('aria-pressed'),
    ).toBe('true')
    expect(
      wrapper.get(tid('library-scope-bought')).attributes('aria-pressed'),
    ).toBe('false')
  })

  it('switches to the side that was picked', async () => {
    const { wrapper, picks } = await scopeSwitch('all')

    await wrapper.get(tid('library-scope-bought')).trigger('click')

    expect(picks).toEqual(['bought'])
  })
})
