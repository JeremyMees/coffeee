import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeHeader from '~/components/CoffeeHeader.vue'
import { useMorph } from '#imports'
import { tid } from '../fixtures'

const coffee = {
  id: 'c1',
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  link: 'https://example.com/ayele' as string | null,
  roasterDetails: { id: 'r2' },
}

describe('CoffeeHeader', () => {
  it('names its title for the morph from the card that opened it', async () => {
    useMorph('coffee', 'c1').open()

    const header = await mountSuspended(CoffeeHeader, {
      props: { coffee, editable: false },
    })

    expect(header.get(tid('coffee-title')).attributes('style')).toContain(
      'view-transition-name: coffee-name-c1',
    )
  })

  it('names the coffee and its roaster and links to the roaster', async () => {
    const header = await mountSuspended(CoffeeHeader, {
      props: { coffee, editable: false },
    })

    expect(header.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(header.get(tid('coffee-roaster-name')).text()).toBe('Square Mile')
    expect(header.get(tid('coffee-roaster-name')).attributes('href')).toBe(
      '/roasters/r2',
    )
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
