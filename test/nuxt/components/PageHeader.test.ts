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
})
