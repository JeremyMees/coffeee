import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import App from '~/app.vue'
import { clearError, clearNuxtData, useCurrentUser, useError } from '#imports'
import { forgetLastShelf, testUser } from './fixtures'

const server = vi.hoisted(() => ({
  stock: [] as unknown[],
  added: [] as unknown[],
  edits: [] as unknown[],
  coffee: {} as Record<string, unknown>,
}))

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)

  return localDate(date)
}

registerEndpoint('/api/shelves/home/stock', () => server.stock)

registerEndpoint('/api/roasters', () => [
  { id: 'r1', name: 'La Cabra' },
  { id: 'r2', name: 'Square Mile' },
])

registerEndpoint('/api/shelves/home/coffees', {
  method: 'POST',
  handler: async event => {
    const body = await readBody(event)

    if (body.name === 'Broken') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Give the coffee a name',
        data: { errors: { name: 'That name is taken by a ghost' } },
      })
    }

    server.added.push(body)

    return { coffee: { id: 'c9', ...body }, purchase: { id: 'p9' } }
  },
})

function ayele() {
  return {
    id: 'c1',
    name: 'Ayele Fulasa',
    roaster: 'Square Mile',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#2f6f4f',
    canEdit: true,
    purchases: [
      {
        id: 'p2',
        purchasedOn: '2026-11-01',
        roastedOn: '2026-10-28',
        sizeGrams: 250,
        priceCents: 1650,
        finishedAt: null,
      },
      {
        id: 'p1',
        purchasedOn: '2026-09-01',
        roastedOn: null,
        sizeGrams: null,
        priceCents: null,
        finishedAt: '2026-09-20T10:00:00.000Z',
      },
    ],
  }
}

registerEndpoint('/api/shelves/home/coffees/c1', {
  method: 'GET',
  handler: () => server.coffee,
})

registerEndpoint('/api/shelves/home/coffees/c1', {
  method: 'PATCH',
  handler: async event => {
    const body = await readBody(event)

    if (body.name === 'Red Brick') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Square Mile already has a coffee called Red Brick',
        data: {
          errors: { name: 'Square Mile already has a coffee called Red Brick' },
        },
      })
    }

    server.edits.push(body)
    server.coffee = { ...server.coffee, ...body }

    return { id: 'c1', ...body }
  },
})

beforeEach(() => {
  forgetLastShelf()
  clearError()
  clearNuxtData()
  useCurrentUser().value = testUser()
  useAddCoffee().value = false
  server.stock = []
  server.added = []
  server.edits = []
  server.coffee = ayele()
})

describe('the Stock page', () => {
  it('shows each coffee in stock as a card that opens it', async () => {
    server.stock = [
      {
        id: 'c1',
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'medium-dark',
        roastedFor: 'espresso',
        colour: '#2f6f4f',
        roastedOn: daysAgo(3),
      },
    ]

    const page = await mountSuspended(App, { route: '/shelves/home' })
    const card = page.get('ul[aria-label="Current stock"] a')

    expect(card.attributes('href')).toBe('/shelves/home/coffees/c1')
    expect(card.text()).toContain('Square Mile')
    expect(card.get('h2').text()).toBe('Ayele Fulasa')
    expect(card.text()).toContain('Medium-Dark · Espresso')
    expect(card.text()).toMatch(/3\s*days off roast/)
    expect(card.text()).toContain('Resting')
  })

  it('says when a coffee has no roast date', async () => {
    server.stock = [
      {
        id: 'c1',
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        colour: '#f2c14e',
        roastedOn: null,
      },
    ]

    const page = await mountSuspended(App, { route: '/shelves/home' })

    expect(page.get('ul[aria-label="Current stock"]').text()).toContain(
      'no roast date',
    )
  })

  it('invites adding a coffee when nothing is in stock', async () => {
    const page = await mountSuspended(App, { route: '/shelves/home' })

    const button = page.findAll('main button').at(-1)!
    await button.trigger('click')

    expect(page.text()).toContain('Nothing in stock yet')
    expect(useAddCoffee().value).toBe(true)
  })
})

describe('a coffee page', () => {
  it('shows the coffee and the bags bought on this shelf', async () => {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.get('h1').text()).toBe('Ayele Fulasa')
    expect(page.text()).toContain('Square Mile')
    expect(page.text()).toContain('250 g')
    expect(page.text()).toContain('16.50')
    expect(page.text()).toContain('In stock')
    expect(page.text()).toContain('Finished')
    expect(page.text()).toContain('Price unknown')
  })

  it('offers no edit to someone who can only read it', async () => {
    server.coffee = { ...ayele(), canEdit: false }

    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
    })

    expect(page.find('main header button').exists()).toBe(false)
  })

  it('is not found when the shelf has no such coffee', async () => {
    await mountSuspended(App, { route: '/shelves/home/coffees/nope' })

    expect(useError().value).toMatchObject({ statusCode: 404 })
  })
})

function dialog() {
  return document.body.querySelector<HTMLElement>('[role="dialog"]')!
}

function field(selector: string) {
  return dialog().querySelector<HTMLInputElement>(selector)!
}

async function type(selector: string, value: string) {
  const input = field(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function submit() {
  dialog()
    .querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await flushPromises()
}

describe('the edit coffee sheet', () => {
  async function openSheet() {
    const page = await mountSuspended(App, {
      route: '/shelves/home/coffees/c1',
      attachTo: document.body,
    })

    await page.get('main header button').trigger('click')
    await flushPromises()

    return page
  }

  it('opens with the current details filled in', async () => {
    const page = await openSheet()

    expect(dialog().textContent).toContain('Edit coffee')
    expect(field('#coffee-name').value).toBe('Ayele Fulasa')
    expect(field('#coffee-roaster').value).toBe('Square Mile')
    expect(field('input[name="roastLevel"][value="light"]').checked).toBe(true)
    expect(field('input[name="roastedFor"][value="filter"]').checked).toBe(true)
    expect(field('input[name="colour"][value="#2f6f4f"]').checked).toBe(true)

    page.unmount()
  })

  it('saves the new details and shows them on the page', async () => {
    const page = await openSheet()

    await type('#coffee-name', 'Ayele Fulasa Natural')
    field('input[name="roastLevel"][value="medium"]').click()
    await submit()

    await vi.waitFor(() => expect(server.edits).toHaveLength(1))
    expect(server.edits).toEqual([
      {
        name: 'Ayele Fulasa Natural',
        roaster: 'Square Mile',
        roastLevel: 'medium',
        roastedFor: 'filter',
        colour: '#2f6f4f',
      },
    ])
    await vi.waitFor(() =>
      expect(page.get('h1').text()).toBe('Ayele Fulasa Natural'),
    )
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()

    page.unmount()
  })

  it('shows a name that is taken next to the field', async () => {
    const page = await openSheet()

    await type('#coffee-name', 'Red Brick')
    await submit()

    await vi.waitFor(() =>
      expect(dialog().textContent).toContain(
        'Square Mile already has a coffee called Red Brick',
      ),
    )
    expect(server.edits).toEqual([])

    page.unmount()
  })
})

describe('the add coffee sheet', () => {
  async function openSheet() {
    const page = await mountSuspended(App, {
      route: '/shelves/home',
      attachTo: document.body,
    })

    await page
      .get('nav[aria-label="Dock"] button[aria-label="Add coffee"]')
      .trigger('click')
    await flushPromises()

    return page
  }

  async function pickRoaster(search: string, option: string) {
    await type('#coffee-roaster', search)

    const item = [
      ...document.body.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find(element => element.textContent?.trim() === option)!
    item.click()
    await flushPromises()
  }

  async function pickDate(selector: string, isoDate: string) {
    field(selector).click()
    await flushPromises()

    const day = () =>
      document.body.querySelector<HTMLElement>(
        `[data-slot="calendar-cell-trigger"][data-value="${isoDate}"]:not([data-outside-view])`,
      )

    for (let page = 0; !day() && page < 24; page++) {
      document.body
        .querySelector<HTMLElement>('[aria-label="Previous page"]')!
        .click()
      await flushPromises()
    }

    day()!.click()
    await flushPromises()
  }

  function options() {
    return [...document.body.querySelectorAll('[role="option"]')].map(element =>
      element.textContent?.trim(),
    )
  }

  it('opens from the page header on desktop', async () => {
    const page = await mountSuspended(App, { route: '/shelves/home' })

    await page.get('main header button').trigger('click')

    expect(useAddCoffee().value).toBe(true)
  })

  it('opens from the dock with today as the purchase date', async () => {
    const page = await openSheet()

    expect(dialog().textContent).toContain('Add coffee')
    expect(field('#purchased-on').textContent).toContain(
      formatDate(localDate()),
    )

    page.unmount()
  })

  it('explains every missing detail before sending anything', async () => {
    const page = await openSheet()

    await submit()

    await vi.waitFor(() => {
      const text = dialog().textContent
      expect(text).toContain('Give the coffee a name')
      expect(text).toContain('Pick a roaster or add a new one')
      expect(text).toContain('Pick a roast level')
      expect(text).toContain('Pick what it was roasted for')
    })
    expect(server.added).toEqual([])

    page.unmount()
  })

  it('offers existing roasters whatever the case, spacing or hyphens', async () => {
    const page = await openSheet()

    await type('#coffee-roaster', 'square-mile')

    expect(options()).toEqual(['Square Mile'])

    page.unmount()
  })

  it('offers to add a roaster only when none has that name', async () => {
    const page = await openSheet()

    await type('#coffee-roaster', 'April')

    expect(options()).toEqual(['Add “April”'])

    page.unmount()
  })

  it('adds the coffee with its first bag and shows the stock', async () => {
    const page = await openSheet()

    await type('#coffee-name', 'Ayele Fulasa')
    await pickRoaster('square', 'Square Mile')
    field('input[name="roastLevel"][value="light"]').click()
    field('input[name="roastedFor"][value="filter"]').click()
    field('input[name="colour"][value="#3d5a80"]').click()
    await pickDate('#roasted-on', daysAgo(10))
    await type('#size-grams', '250')
    await type('#price', '16.5')
    await submit()

    await vi.waitFor(() => expect(server.added).toHaveLength(1))
    expect(server.added).toEqual([
      {
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedFor: 'filter',
        colour: '#3d5a80',
        purchasedOn: localDate(),
        roastedOn: daysAgo(10),
        sizeGrams: 250,
        price: 16.5,
      },
    ])
    await vi.waitFor(() => expect(useAddCoffee().value).toBe(false))
    expect(useRouter().currentRoute.value.path).toBe('/shelves/home')

    page.unmount()
  })

  it('picks dates from a calendar and can clear the roast date', async () => {
    const page = await openSheet()

    await pickDate('#purchased-on', daysAgo(40))
    await pickDate('#roasted-on', daysAgo(45))

    expect(field('#purchased-on').textContent).toContain(
      formatDate(daysAgo(40)),
    )
    expect(field('#roasted-on').textContent).toContain(formatDate(daysAgo(45)))

    dialog()
      .querySelector<HTMLElement>('[aria-label="Clear roasted on"]')!
      .click()
    await flushPromises()

    expect(field('#roasted-on').textContent).toContain('Pick a date')
    expect(dialog().querySelector('[aria-label="Clear roasted on"]')).toBeNull()

    page.unmount()
  })

  it('adds a new roaster by name', async () => {
    const page = await openSheet()

    await type('#coffee-name', 'Halo')
    await pickRoaster('April', 'Add “April”')
    field('input[name="roastLevel"][value="light"]').click()
    field('input[name="roastedFor"][value="omni"]').click()
    await submit()

    await vi.waitFor(() => expect(server.added).toHaveLength(1))
    expect(server.added).toEqual([
      expect.objectContaining({
        roaster: 'April',
        roastedOn: null,
        sizeGrams: null,
        price: null,
      }),
    ])

    page.unmount()
  })

  it('shows what the server refused next to the field', async () => {
    const page = await openSheet()

    await type('#coffee-name', 'Broken')
    await pickRoaster('square', 'Square Mile')
    field('input[name="roastLevel"][value="light"]').click()
    field('input[name="roastedFor"][value="filter"]').click()
    await submit()

    await vi.waitFor(() =>
      expect(dialog().textContent).toContain('That name is taken by a ghost'),
    )
    expect(useAddCoffee().value).toBe(true)

    page.unmount()
  })
})
