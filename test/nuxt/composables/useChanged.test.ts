import { flushPromises } from '@vue/test-utils'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfileStats } from '~/queries/account'
import { useBrewMethods } from '~/queries/brew-methods'
import { useCatalogPages } from '~/queries/catalog'
import {
  useCoffee,
  useCoffeeReviews,
  useCoffeeRoaster,
  useCoffeeShelves,
  useCoffeeVerdict,
  useShelfCoffee,
  useStock,
} from '~/queries/coffees'
import { useShelfGrindSettings } from '~/queries/grind-settings'
import { useShelfGrinders } from '~/queries/grinders'
import { useInvites, useShelfInvites } from '~/queries/invites'
import { useLibraryPages } from '~/queries/library'
import { useNotifications } from '~/queries/notifications'
import { useShelfPurchases } from '~/queries/purchases'
import { useRoaster } from '~/queries/roasters'
import { useShelfMembers } from '~/queries/shelves'
import { coffee } from '#server/db/schemas'
import type { Member, ScenarioShelf } from '#test/support/types'
import { useChanged } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, settleRequests, signIn } from '../server'

interface Shown {
  data: { value: unknown }
}

let sarah: Member
let work: ScenarioShelf
let ayele: Awaited<ReturnType<typeof scenario.coffee>>
let halo: Awaited<ReturnType<typeof scenario.coffee>>

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  work = await scenario.shelf(sarah, 'Work')
  ayele = await scenario.coffee(sarah.shelf, { name: 'Ayele Fulasa' })
  halo = await scenario.coffee(work, {
    name: 'Halo',
    roaster: 'Tim Wendelboe',
  })
  await signIn(sarah)
})

async function showing<Reads extends Record<string, Shown>>(use: () => Reads) {
  const { changed, reads } = await runOn('/', () => ({
    changed: useChanged(),
    reads: use(),
  }))
  await vi.waitFor(() => {
    for (const read of Object.values(reads)) {
      expect(read.data.value).toBeDefined()
    }
  })

  return {
    reads,
    async after(change: Parameters<typeof changed>[0]) {
      await changed(change)
      await flushPromises()
      await settleRequests()
      await flushPromises()
    },
  }
}

function names(rows: unknown) {
  return (rows as { name: string }[] | undefined)?.map(row => row.name)
}

function pageNames(data: unknown) {
  return (data as { pages: { coffees: { name: string }[] }[] }).pages.flatMap(
    page => page.coffees.map(found => found.name),
  )
}

async function rename(coffeeId: string, name: string) {
  const db = await database()
  await db.update(coffee).set({ name }).where(eq(coffee.id, coffeeId))
}

describe('useChanged', () => {
  it('shows an edited coffee everywhere it appears', async () => {
    const { reads, after } = await showing(() => ({
      stock: useStock(sarah.shelf.id),
      catalog: useCatalogPages(work.id, {}),
      shown: useCoffee(ayele.id),
      onShelf: useShelfCoffee(sarah.shelf.id, ayele.id),
    }))
    await rename(ayele.id, 'Ayele Washed')

    await after({ type: 'coffee', coffeeId: ayele.id })

    expect(names(reads.stock.data.value)).toEqual(['Ayele Washed'])
    expect(pageNames(reads.catalog.data.value)).toContain('Ayele Washed')
    expect(reads.shown.data.value).toMatchObject({ name: 'Ayele Washed' })
    expect(reads.onShelf.data.value).toMatchObject({ name: 'Ayele Washed' })
  })

  it('keeps other coffees as they were when one coffee is edited', async () => {
    const { reads, after } = await showing(() => ({
      other: useCoffee(halo.id),
      members: useShelfMembers(sarah.shelf.id),
    }))
    await rename(halo.id, 'Halo Natural')
    const priya = await scenario.member('Priya')
    await scenario.joinShelf(priya, sarah.shelf)

    await after({ type: 'coffee', coffeeId: ayele.id })

    expect(reads.other.data.value).toMatchObject({ name: 'Halo' })
    expect(names(reads.members.data.value)).toEqual(['Sarah'])
  })

  it('shows an edited roaster on its page and on its coffees', async () => {
    const squareMile = await scenario.roaster(sarah, 'Square Mile')
    const { reads, after } = await showing(() => ({
      roaster: useRoaster(squareMile),
      ofCoffee: useCoffeeRoaster(ayele.id),
      stock: useStock(sarah.shelf.id),
      otherCoffee: useCoffee(halo.id),
    }))
    await scenario.roasterDetails(sarah, squareMile, {
      name: 'Square Mile Coffee',
      website: null,
      countryCode: null,
      city: null,
    })
    await rename(halo.id, 'Halo Natural')

    await after({ type: 'roaster', roasterId: squareMile })

    expect(reads.roaster.data.value).toMatchObject({
      name: 'Square Mile Coffee',
    })
    expect(reads.ofCoffee.data.value).toMatchObject({
      name: 'Square Mile Coffee',
    })
    expect(reads.stock.data.value).toEqual([
      expect.objectContaining({ roaster: 'Square Mile Coffee' }),
    ])
    expect(reads.otherCoffee.data.value).toMatchObject({ name: 'Halo' })
  })

  it('shows a new list entry wherever lists are read', async () => {
    const admin = await scenario.member('Ada', { role: 'admin' })
    const { reads, after } = await showing(() => ({
      brewMethods: useBrewMethods(),
    }))
    await scenario.adminEntry(admin, 'brewMethods', { name: 'Siphon' })

    await after({ type: 'catalogEntry' })

    expect(names(reads.brewMethods.data.value)).toContain('Siphon')
  })

  it('shows a new bag on its shelf and keeps other shelves as they were', async () => {
    const { reads, after } = await showing(() => ({
      purchases: useShelfPurchases(sarah.shelf.id, ayele.id),
      stats: useProfileStats(),
      shelves: useCoffeeShelves(ayele.id),
      workStock: useStock(work.id),
    }))
    await scenario.bag(sarah.shelf, ayele.id)
    await scenario.coffee(work, { name: 'Kamwangi' })

    await after({
      type: 'purchase',
      shelfId: sarah.shelf.id,
      coffeeId: ayele.id,
    })

    expect(reads.purchases.data.value).toHaveLength(2)
    expect(reads.stats.data.value).toMatchObject({ bags: 4 })
    expect(reads.shelves.data.value).toContainEqual(
      expect.objectContaining({ id: sarah.shelf.id, bags: 2 }),
    )
    expect(names(reads.workStock.data.value)).toEqual(['Halo'])
  })

  it('shows a rating in the verdict, the reviews and every list', async () => {
    const { reads, after } = await showing(() => ({
      verdict: useCoffeeVerdict(ayele.id),
      reviews: useCoffeeReviews(ayele.id),
      stock: useStock(sarah.shelf.id),
      library: useLibraryPages(sarah.shelf.id, {}),
      stats: useProfileStats(),
    }))
    await scenario.verdict(sarah, ayele.id, { rating: 5, wouldBuyAgain: true })

    await after({ type: 'verdict', coffeeId: ayele.id })

    expect(reads.verdict.data.value).toMatchObject({ rating: 5 })
    expect(reads.reviews.data.value).toMatchObject({
      communityRating: { average: 5, raters: 1 },
    })
    expect(reads.stock.data.value).toEqual([
      expect.objectContaining({ rating: 5 }),
    ])
    expect(
      (
        reads.library.data.value as {
          pages: { coffees: { rating: number | null }[] }[]
        }
      ).pages[0]!.coffees[0],
    ).toMatchObject({ rating: 5 })
    expect(reads.stats.data.value).toMatchObject({ rated: 1 })
  })

  it('keeps other coffees and the coffee page as they were after a rating', async () => {
    const { reads, after } = await showing(() => ({
      shown: useCoffee(ayele.id),
      otherVerdict: useCoffeeVerdict(halo.id),
    }))
    await rename(ayele.id, 'Ayele Washed')
    await scenario.verdict(sarah, halo.id, { rating: 2, wouldBuyAgain: false })

    await after({ type: 'verdict', coffeeId: ayele.id })

    expect(reads.shown.data.value).toMatchObject({ name: 'Ayele Fulasa' })
    expect(reads.otherVerdict.data.value).not.toMatchObject({ rating: 2 })
  })

  it('shows a grind setting on the coffee and leaves the stock alone', async () => {
    const opus = await scenario.grinder(sarah.shelf, {
      brand: '1Zpresso',
      model: 'Opus',
    })
    const espresso = await scenario.brewMethod('Espresso')
    const { reads, after } = await showing(() => ({
      settings: useShelfGrindSettings(sarah.shelf.id, ayele.id),
      stock: useStock(sarah.shelf.id),
    }))
    await scenario.grindSetting(sarah, sarah.shelf, ayele.id, {
      grinderId: opus.id,
      brewMethodId: espresso.id,
      setting: '12',
    })
    await rename(ayele.id, 'Ayele Washed')

    await after({ type: 'grindSetting', coffeeId: ayele.id })

    expect(reads.settings.data.value).toMatchObject({
      grindSettings: [{ model: 'Opus', setting: '12' }],
    })
    expect(names(reads.stock.data.value)).toEqual(['Ayele Fulasa'])
  })

  it('shows a grinder on its shelf and keeps other shelves as they were', async () => {
    const { reads, after } = await showing(() => ({
      home: useShelfGrinders(sarah.shelf.id),
      work: useShelfGrinders(work.id),
    }))
    await scenario.grinder(sarah.shelf, { brand: 'Niche', model: 'Zero' })
    await scenario.grinder(work, { brand: 'Comandante', model: 'C40' })

    await after({ type: 'grinder', shelfId: sarah.shelf.id })

    expect(reads.home.data.value).toEqual([
      expect.objectContaining({ model: 'Zero' }),
    ])
    expect(reads.work.data.value).toEqual([])
  })

  it('shows a new member of the shelf', async () => {
    const { reads, after } = await showing(() => ({
      members: useShelfMembers(sarah.shelf.id),
    }))
    const priya = await scenario.member('Priya')
    await scenario.joinShelf(priya, sarah.shelf)

    await after({ type: 'members', shelfId: sarah.shelf.id })

    expect(names(reads.members.data.value)).toEqual(['Sarah', 'Priya'])
  })

  it('shows a new invite to the shelf', async () => {
    const { reads, after } = await showing(() => ({
      invites: useShelfInvites(sarah.shelf.id),
    }))
    await scenario.shelfInvite(sarah.shelf, 'priya@example.com')

    await after({ type: 'shelfInvites', shelfId: sarah.shelf.id })

    expect(reads.invites.data.value).toEqual([
      expect.objectContaining({ email: 'priya@example.com' }),
    ])
  })

  it('shows a new invite to the app', async () => {
    const admin = await scenario.member('Ada', { role: 'admin' })
    await signIn(admin)
    const { reads, after } = await showing(() => ({ invites: useInvites() }))
    await scenario.adminInvite(admin, 'priya@example.com')

    await after({ type: 'invites' })

    expect(JSON.stringify(reads.invites.data.value)).toContain(
      'priya@example.com',
    )
  })

  it('shows the notifications again after an invite is answered', async () => {
    const priya = await scenario.member('Priya')
    const { reads, after } = await showing(() => ({
      notifications: useNotifications(),
    }))
    await scenario.inviteNotice(sarah, priya.shelf)

    await after({ type: 'myInvites' })

    expect(JSON.stringify(reads.notifications.data.value)).toContain('Priya')
  })
})
