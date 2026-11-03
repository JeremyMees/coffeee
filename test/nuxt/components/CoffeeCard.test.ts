import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeCard from '~/components/CoffeeCard.vue'
import type { CardCoffee } from '#imports'
import { daysAgo, tid } from '../fixtures'

const coffee: CardCoffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'medium-dark',
  roastedFor: 'espresso',
  colour: '#2f6f4f',
  roastedOn: daysAgo(3),
  flavorNotes: [],
  photoUrl: null,
  rating: null,
}

function mountCard(props: Record<string, unknown> = {}) {
  return mountSuspended(CoffeeCard, { props: { coffee, ...props } })
}

describe('CoffeeCard', () => {
  it('lists its flavor notes in order', async () => {
    const card = await mountCard({
      coffee: {
        ...coffee,
        flavorNotes: [
          { id: 'n1', name: 'Lime' },
          { id: 'n2', name: 'Milk chocolate' },
        ],
      },
    })

    expect(
      card.findAll(tid('coffee-card-flavor-note')).map(note => note.text()),
    ).toEqual(['Lime', 'Milk chocolate'])
  })

  it('shows the rating, or that it is not yet rated', async () => {
    const rated = await mountCard({ coffee: { ...coffee, rating: 4 } })
    const unrated = await mountCard()

    expect(
      rated
        .get(tid('coffee-card-rating', 'rating-stars'))
        .attributes('aria-label'),
    ).toBe('4 stars')
    expect(unrated.get(tid('coffee-card-rating')).text()).toBe('Not yet rated')
  })

  it('leaves out flavor notes when it has none', async () => {
    const card = await mountCard()

    expect(card.find(tid('coffee-card-flavor-notes')).exists()).toBe(false)
  })

  it('shows the roaster, the name and how it was roasted', async () => {
    const card = await mountCard()

    expect(card.get(tid('coffee-card-roaster')).text()).toBe('Square Mile')
    expect(card.get(tid('coffee-card-name')).text()).toBe('Ayele Fulasa')
    expect(card.get(tid('coffee-card-roast')).text()).toBe(
      'Medium-Dark · Espresso',
    )
  })

  it('counts the days off roast and how fresh that is', async () => {
    const card = await mountCard()

    expect(card.get(tid('coffee-card-days')).text()).toMatch(
      /^3\s*days off roast$/,
    )
    expect(card.get(tid('coffee-card-freshness')).text()).toBe('Resting')
  })

  it('says when there is no roast date', async () => {
    const card = await mountCard({ coffee: { ...coffee, roastedOn: null } })

    expect(card.get(tid('coffee-card-days')).text()).toMatch(
      /^–\s*no roast date$/,
    )
    expect(card.get(tid('coffee-card-freshness')).text()).toBe('Unknown')
  })

  it('opens the coffee when it has somewhere to go', async () => {
    const card = await mountCard({ to: '/shelves/home/coffees/c1' })

    expect(card.element.tagName).toBe('A')
    expect(card.attributes('href')).toBe('/shelves/home/coffees/c1')
  })

  it('is just a card otherwise', async () => {
    const card = await mountCard()

    expect(card.element.tagName).toBe('ARTICLE')
  })

  it('writes on the bag in the colour that reads best', async () => {
    const dark = await mountCard()
    const light = await mountCard({ coffee: { ...coffee, colour: '#f2c14e' } })

    expect((dark.element as HTMLElement).style.color).toMatch(
      /#fffaf5|rgb\(255, 250, 245\)/,
    )
    expect((light.element as HTMLElement).style.color).toMatch(
      /#1d1d1f|rgb\(29, 29, 31\)/,
    )
  })

  it('uses the photo of the bag as its cover', async () => {
    const card = await mountCard({
      coffee: { ...coffee, photoUrl: '/api/photos/coffees/a.webp' },
    })

    expect(card.get(tid('coffee-card-photo')).attributes('src')).toBe(
      '/api/photos/coffees/a.webp',
    )
    expect(card.find(tid('coffee-card-placeholder')).exists()).toBe(false)
  })

  it('keeps a tidy cover when there is no photo', async () => {
    const card = await mountCard()

    expect(card.find(tid('coffee-card-placeholder')).exists()).toBe(true)
    expect(card.find(tid('coffee-card-photo')).exists()).toBe(false)
  })
})
