import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PageHeader from '~/components/PageHeader.vue'
import { useAddCoffee } from '#imports'
import { tid } from '../fixtures'

beforeEach(() => {
  useAddCoffee().value = false
})

describe('PageHeader', () => {
  it('shows the title as the page heading', async () => {
    const header = await mountSuspended(PageHeader, {
      props: { title: 'Library' },
    })

    expect(header.get(tid('page-title')).text()).toBe('Library')
  })

  it('opens the add coffee sheet', async () => {
    const header = await mountSuspended(PageHeader, {
      props: { title: 'Stock' },
    })

    await header.get(tid('page-add-coffee')).trigger('click')

    expect(useAddCoffee().value).toBe(true)
  })

  it('leaves out the add button when asked', async () => {
    const header = await mountSuspended(PageHeader, {
      props: { title: 'Admin', hideAdd: true },
    })

    expect(header.find(tid('page-add-coffee')).exists()).toBe(false)
    expect(header.find(tid('page-add')).exists()).toBe(false)
  })

  it('adds something else in the same place when given a label', async () => {
    const header = await mountSuspended(PageHeader, {
      props: { title: 'Grinders', addLabel: 'Add grinder' },
    })

    await header.get(tid('page-add')).trigger('click')

    expect(header.get(tid('page-add')).text()).toBe('Add grinder')
    expect(header.get(tid('page-add')).attributes('aria-keyshortcuts')).toBe(
      undefined,
    )
    expect(header.emitted('add')).toHaveLength(1)
    expect(useAddCoffee().value).toBe(false)
  })
})
