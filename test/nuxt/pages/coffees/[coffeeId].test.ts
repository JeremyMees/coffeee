import { onlineManager } from '@tanstack/vue-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { and, eq } from 'drizzle-orm'
import App from '~/app.vue'
import {
  clearError,
  coffeePath,
  queryKeys,
  roasterPath,
  shelfCoffeePath,
  shelfPath,
  useError,
  useRouter,
} from '#imports'
import { coffee, coffeeVerdict } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import {
  byTestId,
  currentPath,
  click,
  forgetLastShelf,
  isFetching,
  rememberShelf,
  submit,
  tid,
  type,
} from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'

let sarah: Member
let tom: Member
let ayele: Awaited<ReturnType<typeof scenario.coffee>>

beforeEach(async () => {
  forgetLastShelf()
  clearError()
  sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  await scenario.joinShelf(sarah, tom.shelf)
  ayele = await scenario.coffee(sarah.shelf)
  await signIn(sarah)
})

afterEach(() => onlineManager.setOnline(true))

function openCoffee(route = coffeePath(ayele)) {
  return mountSuspended(App, { route, attachTo: document.body })
}

async function coffeePage(route = coffeePath(ayele)) {
  const page = await openCoffee(route)
  await vi.waitFor(() =>
    expect(page.find('[data-testid$="-skeleton"]').exists()).toBe(false),
  )

  return page
}

async function storedCoffee() {
  const db = await database()
  const [found] = await db.select().from(coffee).where(eq(coffee.id, ayele.id))

  return found
}

describe('the page of a coffee', () => {
  it('shows the coffee without the bags or verdicts of any shelf', async () => {
    const page = await coffeePage()

    expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(page.get(tid('coffee-roaster-name')).text()).toBe('Square Mile')
    expect(page.get(tid('detail-origins')).text()).toBe('Ethiopia')
    expect(page.get(tid('roaster-details-name')).text()).toBe('Square Mile')
    expect(page.find(tid('purchases')).exists()).toBe(false)
    expect(page.find(tid('coffee-buy-again')).exists()).toBe(false)
    expect(page.find(tid('grind-setting-form')).exists()).toBe(false)
  })

  it('leads back to Discover on the current shelf', async () => {
    rememberShelf(tom.shelf.id)

    const page = await coffeePage()
    const back = page.get(tid('coffee-back'))

    expect(back.text()).toBe('Discover')
    expect(back.attributes('href')).toBe(`${shelfPath(tom.shelf)}/discover`)
  })

  it('opens the coffee on each shelf of the viewer, with its bags there', async () => {
    await scenario.coffee(sarah.shelf)
    await scenario.finishBag(sarah.shelf, ayele.id)

    const page = await coffeePage()

    const home = page.get(tid(`coffee-shelf-${sarah.shelf.id}`))
    expect(home.attributes('href')).toBe(shelfCoffeePath(sarah.shelf, ayele))
    expect(home.text()).toContain("Sarah's shelf")
    expect(home.get(tid('coffee-shelf-bags')).text()).toBe(
      '2 bags · 1 in stock',
    )
    expect(
      page.get(tid(`coffee-shelf-${tom.shelf.id}`, 'coffee-shelf-bags')).text(),
    ).toBe('Not bought yet')
  })

  it('rates the coffee', async () => {
    const page = await coffeePage()

    await page.get(tid('verdict-star-4')).trigger('click')

    await vi.waitFor(() =>
      expect(page.get(tid('verdict-rating')).text()).toBe('4 stars'),
    )
    const db = await database()
    await vi.waitFor(async () =>
      expect(
        await db
          .select({ rating: coffeeVerdict.rating })
          .from(coffeeVerdict)
          .where(
            and(
              eq(coffeeVerdict.userId, sarah.id),
              eq(coffeeVerdict.coffeeId, ayele.id),
            ),
          ),
      ).toEqual([{ rating: 4 }]),
    )
  })

  it('shows the new details once they are saved', async () => {
    const page = await coffeePage()
    await page.get(tid('coffee-edit')).trigger('click')
    await vi.waitFor(() => expect(byTestId('edit-coffee-steps')).not.toBeNull())

    await type('coffee-name', 'Ayele Fulasa Natural')
    await submit('edit-coffee-form')

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa Natural'),
    )
    expect((await storedCoffee())?.name).toBe('Ayele Fulasa Natural')
  })

  it('offers no edit to someone who can only read it', async () => {
    const redBrick = await scenario.coffee(tom.shelf, { name: 'Red Brick' })

    const page = await coffeePage(coffeePath(redBrick))

    expect(page.get(tid('coffee-title')).text()).toBe('Red Brick')
    expect(page.find(tid('coffee-edit')).exists()).toBe(false)
    expect(page.find(tid('coffee-photo-pick')).exists()).toBe(false)
  })

  it('is not found when there is no such coffee', async () => {
    await mountSuspended(App, { route: '/coffees/nope' })

    await vi.waitFor(() =>
      expect(useError().value).toMatchObject({ statusCode: 404 }),
    )
  })

  it('sends an outdated slug on to the current one', async () => {
    await mountSuspended(App, { route: `/coffees/old-name-${ayele.id}` })

    await vi.waitFor(() => expect(currentPath()).toBe(coffeePath(ayele)))
  })

  it('deletes the coffee and goes back', async () => {
    const page = await coffeePage()

    await page.get(tid('coffee-delete')).trigger('click')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(currentPath()).toBe(`${shelfPath(sarah.shelf)}/discover`),
    )
    expect(await storedCoffee()).toBeUndefined()
  })

  it('explains why the coffee could not be deleted', async () => {
    failRequest('DELETE', `/api/coffees/${ayele.id}`, {
      status: 409,
      message:
        'Someone else has bought this coffee too, so only an admin can delete it',
    })
    const page = await coffeePage()

    await page.get(tid('coffee-delete')).trigger('click')
    await click('confirm-dialog-confirm')

    await vi.waitFor(() =>
      expect(byTestId('delete-coffee', 'form-error')?.textContent).toContain(
        'only an admin can delete it',
      ),
    )
    expect(currentPath()).toBe(coffeePath(ayele))
    expect(await storedCoffee()).toBeDefined()
  })

  it('offers no delete button to someone who may not delete it', async () => {
    await scenario.coffee(tom.shelf, {}, tom)

    const page = await coffeePage()

    expect(page.find(tid('coffee-edit')).exists()).toBe(true)
    expect(page.find(tid('coffee-delete')).exists()).toBe(false)
  })
})

describe('a coffee page that loads per section', () => {
  const sections = [
    {
      name: 'details',
      path: (id: string) => `/api/coffees/${id}`,
      skeleton: 'coffee-details-skeleton',
      content: 'coffee-details',
      error: 'coffee',
    },
    {
      name: 'verdict',
      path: (id: string) => `/api/coffees/${id}/verdict`,
      skeleton: 'coffee-verdict-skeleton',
      content: 'coffee-verdict',
      error: 'coffee-verdict',
    },
    {
      name: 'reviews',
      path: (id: string) => `/api/coffees/${id}/reviews`,
      skeleton: 'coffee-reviews-skeleton',
      content: 'coffee-reviews',
      error: 'coffee-reviews',
    },
    {
      name: 'roaster',
      path: (id: string) => `/api/coffees/${id}/roaster`,
      skeleton: 'roaster-details-skeleton',
      content: 'roaster-details',
      error: 'roaster-details',
    },
    {
      name: 'shelves',
      path: (id: string) => `/api/coffees/${id}/shelves`,
      skeleton: 'coffee-shelves-skeleton',
      content: 'coffee-shelves',
      error: 'coffee-shelves',
    },
  ]

  it.each(sections.filter(section => section.name !== 'details'))(
    'shows a skeleton for the $name until its request finishes',
    async ({ path, skeleton, content }) => {
      const hold = holdRequest('GET', path(ayele.id))

      const page = await openCoffee()
      const others = sections
        .map(section => section.skeleton)
        .filter(name => name !== skeleton)
      await vi.waitFor(() =>
        expect(others.some(name => page.find(tid(name)).exists())).toBe(false),
      )

      expect(page.find(tid(skeleton)).exists()).toBe(true)
      expect(page.find(tid(content)).exists()).toBe(false)

      hold.release()

      await vi.waitFor(() =>
        expect(page.find(tid(content)).exists()).toBe(true),
      )
      expect(page.find(tid(skeleton)).exists()).toBe(false)
    },
  )

  it.each(sections)(
    'shows an error and a retry for the $name and keeps the rest of the page',
    async ({ path, skeleton, content, error }) => {
      const lift = failRequest('GET', path(ayele.id), {
        status: 403,
        message: 'Nope',
      })

      const page = await openCoffee()
      await vi.waitFor(() =>
        expect(page.find(tid(`${error}-error`)).exists()).toBe(true),
      )

      expect(page.find(tid(skeleton)).exists()).toBe(false)
      const rest = sections.filter(section => section.error !== error)
      await vi.waitFor(() =>
        expect(
          rest.every(section => page.find(tid(section.content)).exists()),
        ).toBe(true),
      )

      lift()
      await page.get(tid(`${error}-retry`)).trigger('click')

      await vi.waitFor(() =>
        expect(page.find(tid(content)).exists()).toBe(true),
      )
      expect(page.find(tid(`${error}-error`)).exists()).toBe(false)
    },
  )

  it.each([
    {
      from: 'Discover',
      route: () => `${shelfPath(sarah.shelf)}/discover`,
    },
    {
      from: 'the roaster’s catalog',
      route: async () =>
        roasterPath({
          id: await scenario.roaster(sarah, 'Square Mile'),
          name: 'Square Mile',
        }),
    },
  ])('stays on $from until the coffee loaded', async ({ route }) => {
    const page = await mountSuspended(App, {
      route: await route(),
      attachTo: document.body,
    })
    await vi.waitFor(() =>
      expect(page.find(tid('catalog-result')).exists()).toBe(true),
    )
    const hold = holdRequest('GET', `/api/coffees/${ayele.id}`)

    const opening = useRouter().push(coffeePath(ayele))
    await vi.waitFor(() =>
      expect(isFetching(queryKeys.coffee(ayele.id))).toBe(true),
    )

    expect(page.find(tid('catalog-result')).exists()).toBe(true)
    expect(page.find(tid('coffee-title')).exists()).toBe(false)

    hold.release()
    await opening

    await vi.waitFor(() =>
      expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa'),
    )
    expect(page.find(tid('coffee-details')).exists()).toBe(true)
    expect(page.find(tid('coffee-edit')).exists()).toBe(true)
  })

  it('shows the coffee at once on its first render', async () => {
    const page = await openCoffee()

    expect(page.get(tid('coffee-title')).text()).toBe('Ayele Fulasa')
    expect(page.find(tid('coffee-photo')).exists()).toBe(true)
    expect(page.find(tid('coffee-header-skeleton')).exists()).toBe(false)
    expect(page.find(tid('coffee-title-placeholder')).exists()).toBe(false)
  })

  it('keeps a heading when the coffee could not load', async () => {
    failRequest('GET', `/api/coffees/${ayele.id}`, {
      status: 403,
      message: 'Nope',
    })

    const page = await openCoffee()

    expect(page.get(tid('coffee-title-placeholder')).element.tagName).toBe('H1')
    expect(page.find(tid('coffee-title')).exists()).toBe(false)
  })

  it('says each section is offline instead of showing skeletons that never end', async () => {
    onlineManager.setOnline(false)

    const page = await openCoffee()

    for (const { error, skeleton } of sections) {
      await vi.waitFor(() =>
        expect(page.find(tid(`${error}-offline`)).exists()).toBe(true),
      )
      expect(page.find(tid(skeleton)).exists()).toBe(false)
    }
  })
})
