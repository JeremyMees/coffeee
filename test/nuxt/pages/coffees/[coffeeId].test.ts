import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { and, eq } from 'drizzle-orm'
import App from '~/app.vue'
import {
  clearError,
  coffeePath,
  shelfCoffeePath,
  shelfPath,
  useError,
} from '#imports'
import { coffee, coffeeVerdict } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import {
  byTestId,
  currentPath,
  click,
  forgetLastShelf,
  rememberShelf,
  submit,
  tid,
  type,
} from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

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

function coffeePage(route = coffeePath(ayele)) {
  return mountSuspended(App, { route, attachTo: document.body })
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
    await vi.waitFor(() => expect(byTestId('edit-coffee-form')).not.toBeNull())

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

    expect(useError().value).toMatchObject({ statusCode: 404 })
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
