import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeShelves from '~/components/CoffeeShelves.vue'
import { tid } from '../fixtures'
import { coffeeShelves } from '#test/fixtures/shelves'

describe('CoffeeShelves', () => {
  it('links to the coffee on each shelf and says what that shelf bought', async () => {
    const shelves = await mountSuspended(CoffeeShelves, {
      props: { coffeeId: 'c1', shelves: coffeeShelves() },
    })

    const home = shelves.get(tid('coffee-shelf-home'))
    const work = shelves.get(tid('coffee-shelf-work'))

    expect(home.attributes('href')).toBe('/shelves/home/coffees/c1')
    expect(home.text()).toContain("Sarah's shelf")
    expect(home.get(tid('coffee-shelf-bags')).text()).toBe(
      '2 bags · 1 in stock',
    )
    expect(work.attributes('href')).toBe('/shelves/work/coffees/c1')
    expect(work.get(tid('coffee-shelf-bags')).text()).toBe('Not bought yet')
  })
})
