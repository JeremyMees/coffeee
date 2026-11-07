import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LoadMore from '~/components/atoms/LoadMore.vue'

function loader(state: { hasNextPage: boolean; isFetchingNextPage: boolean }) {
  const fetched: number[] = []
  const pages = {
    hasNextPage: ref(state.hasNextPage),
    isFetchingNextPage: ref(state.isFetchingNextPage),
    fetchNextPage: () => fetched.push(1),
  }

  return {
    fetched,
    mount: () => mountSuspended(LoadMore, { props: { pages } }),
  }
}

describe('LoadMore', () => {
  it('loads the next page when asked', async () => {
    const { fetched, mount } = loader({
      hasNextPage: true,
      isFetchingNextPage: false,
    })
    const wrapper = await mount()

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe('Show more')
    expect(fetched).toHaveLength(1)
  })

  it('waits while a page is loading', async () => {
    const { fetched, mount } = loader({
      hasNextPage: true,
      isFetchingNextPage: true,
    })
    const wrapper = await mount()

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('button').text()).toBe('Loading…')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(fetched).toEqual([])
  })

  it('is gone once everything is loaded', async () => {
    const { mount } = loader({ hasNextPage: false, isFetchingNextPage: false })

    expect((await mount()).find('button').exists()).toBe(false)
  })
})
