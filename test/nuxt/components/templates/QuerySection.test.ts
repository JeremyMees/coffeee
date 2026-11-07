import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import QuerySection from '~/components/templates/QuerySection.vue'
import { tid } from '../../fixtures'

type FetchStatus = 'fetching' | 'paused' | 'idle'

function section(state: {
  data?: string[]
  isError?: boolean
  fetchStatus?: FetchStatus
}) {
  const refetched: number[] = []
  const query = {
    data: ref(state.data),
    isError: ref(state.isError ?? false),
    fetchStatus: ref<FetchStatus>(state.fetchStatus ?? 'fetching'),
    refetch: () => refetched.push(1),
  }

  return {
    query,
    refetched,
    mount: () =>
      mountSuspended(QuerySection, {
        props: { query, testid: 'items' },
        slots: {
          default: `<template #default="{ data }"><p data-testid="items-content">{{ data.join(', ') }}</p></template>`,
          skeleton: '<p data-testid="items-skeleton">Loading</p>',
        },
      }),
  }
}

describe('QuerySection', () => {
  it('shows the skeleton while there is no data yet', async () => {
    const wrapper = await section({}).mount()

    expect(wrapper.find(tid('items-skeleton')).exists()).toBe(true)
    expect(wrapper.find(tid('items-content')).exists()).toBe(false)
  })

  it('shows the content with its data once it arrived', async () => {
    const { query, mount } = section({})
    const wrapper = await mount()

    query.data.value = ['Ayele', 'Halo']
    await nextTick()

    expect(wrapper.get(tid('items-content')).text()).toBe('Ayele, Halo')
    expect(wrapper.find(tid('items-skeleton')).exists()).toBe(false)
  })

  it('keeps the content while it refreshes or a refresh fails', async () => {
    const wrapper = await section({
      data: ['Ayele'],
      isError: true,
      fetchStatus: 'paused',
    }).mount()

    expect(wrapper.get(tid('items-content')).text()).toBe('Ayele')
    expect(wrapper.find(tid('items-error')).exists()).toBe(false)
    expect(wrapper.find(tid('items-offline')).exists()).toBe(false)
  })

  it('shows an error that can be retried', async () => {
    const { refetched, mount } = section({
      isError: true,
      fetchStatus: 'idle',
    })
    const wrapper = await mount()

    await wrapper.get(tid('items-retry')).trigger('click')

    expect(wrapper.find(tid('items-error')).exists()).toBe(true)
    expect(wrapper.find(tid('items-skeleton')).exists()).toBe(false)
    expect(refetched).toHaveLength(1)
  })

  it('says it is offline when the request is paused', async () => {
    const { refetched, mount } = section({ fetchStatus: 'paused' })
    const wrapper = await mount()

    await wrapper.get(tid('items-retry')).trigger('click')

    expect(wrapper.find(tid('items-offline')).exists()).toBe(true)
    expect(wrapper.find(tid('items-skeleton')).exists()).toBe(false)
    expect(refetched).toHaveLength(1)
  })
})
