import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeHeader from '~/components/CoffeeHeader.vue'
import { tid } from '../fixtures'

const coffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  link: 'https://example.com/ayele' as string | null,
}

describe('CoffeeHeader', () => {
  it('names the coffee and its roaster and links to the roaster', async () => {
    const header = await mountSuspended(CoffeeHeader, {
      props: { coffee, editable: false },
    })

    expect(header.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(header.get(tid('coffee-roaster-name')).text()).toBe('Square Mile')
    expect(header.get(tid('coffee-link-out')).attributes('href')).toBe(
      'https://example.com/ayele',
    )
    expect(header.find(tid('coffee-edit')).exists()).toBe(false)
  })

  it('leaves out the link when there is none', async () => {
    const header = await mountSuspended(CoffeeHeader, {
      props: { coffee: { ...coffee, link: null }, editable: false },
    })

    expect(header.find(tid('coffee-link-out')).exists()).toBe(false)
  })

  it('asks to edit when it may be edited', async () => {
    const header = await mountSuspended(CoffeeHeader, {
      props: { coffee, editable: true },
    })

    await header.get(tid('coffee-edit')).trigger('click')

    expect(header.emitted('edit')).toHaveLength(1)
  })
})
