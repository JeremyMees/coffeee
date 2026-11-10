import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { HeartIcon } from '@lucide/vue'
import FilterToggle from '~/components/molecules/FilterToggle.vue'

async function toggle(props: { modelValue: boolean; solid?: boolean }) {
  const changes: boolean[] = []
  const wrapper = await mountSuspended(FilterToggle, {
    props: {
      ...props,
      'onUpdate:modelValue': (on: boolean) => changes.push(on),
      label: 'Favourites',
      icon: HeartIcon,
    },
  })

  return { wrapper, changes }
}

describe('FilterToggle', () => {
  it('shows its label and turns on when off', async () => {
    const { wrapper, changes } = await toggle({ modelValue: false })

    await wrapper.trigger('click')

    expect(wrapper.text()).toBe('Favourites')
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    expect(changes).toEqual([true])
  })

  it('shows it is on and turns off', async () => {
    const { wrapper, changes } = await toggle({ modelValue: true })

    await wrapper.trigger('click')

    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(changes).toEqual([false])
  })

  it('fills its icon when on only when asked to', async () => {
    const plain = await toggle({ modelValue: true })
    const solid = await toggle({ modelValue: true, solid: true })

    expect(plain.wrapper.get('svg').classes()).not.toContain('fill-current')
    expect(solid.wrapper.get('svg').classes()).toContain('fill-current')
  })
})
