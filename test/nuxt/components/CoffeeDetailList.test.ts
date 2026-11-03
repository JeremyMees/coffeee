import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeDetailList from '~/components/CoffeeDetailList.vue'
import { ayele } from '../fake-api'
import { tid } from '../fixtures'

function mountList(overrides: Partial<EditableCoffee> = {}) {
  return mountSuspended(CoffeeDetailList, {
    props: { coffee: { ...ayele(), ...overrides } as EditableCoffee },
  })
}

describe('CoffeeDetailList', () => {
  it('lists the roast, origin and how it was made', async () => {
    const list = await mountList({
      flavorNotes: [{ id: 'n1', name: 'Lime' }],
    })

    expect(list.get(tid('detail-roast')).text()).toBe('Light · Filter')
    expect(list.get(tid('detail-flavor-notes')).text()).toBe('Lime')
    expect(list.get(tid('detail-origins')).text()).toBe('Ethiopia')
    expect(list.get(tid('detail-altitude')).text()).toBe('1,900–2,200 m')
    expect(list.get(tid('detail-processes')).text()).toBe('Washed')
  })

  it('names the country of each region of a blend', async () => {
    const list = await mountList({
      origins: [
        { code: 'CO', name: 'Colombia' },
        { code: 'ET', name: 'Ethiopia' },
      ],
      regions: [
        { id: 'h1', name: 'Huila', origin: 'CO' },
        { id: 'g1', name: 'Guji', origin: 'ET' },
      ],
    })

    expect(list.get(tid('detail-regions')).text()).toBe(
      'Huila (Colombia), Guji (Ethiopia)',
    )
  })

  it('leaves out what nobody filled in', async () => {
    const list = await mountList({
      origins: [],
      regions: [],
      washingStations: [],
      processes: [],
      altitudeFrom: null,
      altitudeTo: null,
    })

    expect(list.findAll('dt').map(term => term.text())).toEqual(['Roast'])
  })
})
