import { eq } from 'drizzle-orm'
import type { GrindSettingChange, NewGrinder } from '#shared/types/grinders'
import type { RoasterDetails } from '#shared/types/roasters'
import type { VerdictChange } from '#shared/types/verdicts'
import type { NewPurchase } from '#shared/types/purchases'
import { newCoffeeSchema } from '#shared/utils/schemas'
import { coffee, purchase, roaster } from '#server/db/schemas'
import { listBrewMethods } from '#server/utils/brew-methods'
import { addCoffee, replaceCoffeePhoto } from '#server/utils/coffees'
import { ownGrinder } from '#server/utils/grinders'
import { acceptInvite, inviteToShelf } from '#server/utils/invites'
import { findOrCreateEntry } from '#server/utils/lists'
import { storePhoto } from '#server/utils/photos'
import { buyAgain, finishCoffee } from '#server/utils/purchases'
import { editRoaster, replaceRoasterLogo } from '#server/utils/roasters'
import { createShelf, shelfNameFor } from '#server/utils/shelves'
import { judgeCoffee } from '#server/utils/verdicts'
import { setGrindSetting } from '#server/utils/grind-settings'
import { createTestUser } from '#test/support/database'
import type {
  ScenarioCoffee,
  ScenarioShelf,
  TestDatabase,
} from '#test/support/types'
import { testOrigin } from '#test/support/origin'

export function createScenario(database: () => Promise<TestDatabase>) {
  let stamped = Date.now() - 24 * 60 * 60 * 1000

  function nextStamp() {
    stamped += 1000

    return new Date(stamped)
  }

  return {
    async member(name: string, options: { role?: 'user' | 'admin' } = {}) {
      const db = await database()
      const user = await createTestUser(db, {
        name,
        email: `${name.toLowerCase()}-${crypto.randomUUID()}@example.com`,
        role: options.role ?? 'user',
      })
      const shelf = await createShelf(db, {
        name: shelfNameFor(name),
        ownerId: user.id,
      })

      return { id: user.id, name: user.name, email: user.email, shelf }
    },

    async coffee(
      shelf: ScenarioShelf,
      details: ScenarioCoffee = {},
      by: { id: string } = { id: shelf.ownerId },
    ) {
      const db = await database()
      const added = await addCoffee(db, {
        shelfId: shelf.id,
        userId: by.id,
        coffee: newCoffeeSchema.parse({
          name: 'Ayele Fulasa',
          roaster: 'Square Mile',
          roastLevel: 'light',
          roastedFor: 'filter',
          origins: ['ET'],
          processes: ['Washed'],
          purchasedOn: '2026-11-01',
          roastedOn: null,
          sizeGrams: 250,
          price: null,
          ...details,
        }),
        origin: testOrigin,
      })
      const createdAt = nextStamp()

      await db
        .update(coffee)
        .set({ createdAt })
        .where(eq(coffee.id, added.coffee.id))
      await db
        .update(purchase)
        .set({ createdAt })
        .where(eq(purchase.id, added.purchase.id))

      return { ...added.coffee, purchaseId: added.purchase.id }
    },

    async grinder(
      shelf: ScenarioShelf,
      grinder: NewGrinder = {
        brand: 'Niche',
        model: 'Zero',
      },
    ) {
      return ownGrinder(await database(), {
        shelfId: shelf.id,
        userId: shelf.ownerId,
        grinder,
      })
    },

    async brewMethod(name: string) {
      const methods = await listBrewMethods(await database())

      return methods.find(method => method.name === name)!
    },

    async verdict(
      member: { id: string },
      coffeeId: string,
      verdict: VerdictChange,
    ) {
      return judgeCoffee(await database(), {
        userId: member.id,
        coffeeId,
        verdict,
      })
    },

    async roaster(member: { id: string }, name: string) {
      return findOrCreateEntry(await database(), roaster, {
        name,
        createdBy: member.id,
      })
    },

    async joinShelf(
      member: { id: string; email: string },
      shelf: ScenarioShelf,
    ) {
      const db = await database()
      const invited = await inviteToShelf(db, {
        shelfId: shelf.id,
        email: member.email,
        createdBy: shelf.ownerId,
      })

      return acceptInvite(db, {
        userId: member.id,
        email: member.email,
        match: { token: invited.outcome === 'invited' ? invited.token : '' },
        origin: testOrigin,
      })
    },

    async roasterDetails(
      member: { id: string },
      roasterId: string,
      details: RoasterDetails,
    ) {
      return editRoaster(await database(), {
        roasterId,
        editor: member,
        details,
      })
    },

    async roasterLogo(roasterId: string) {
      const logoUrl = await storePhoto(
        { data: Buffer.from('logo'), type: 'image/webp' },
        'roasters',
      )
      await replaceRoasterLogo(
        await database(),
        { roasterId, logoUrl: null },
        logoUrl,
      )

      return logoUrl
    },

    async finishBag(
      shelf: ScenarioShelf,
      coffeeId: string,
      by: { id: string } = { id: shelf.ownerId },
    ) {
      return finishCoffee(await database(), {
        shelfId: shelf.id,
        coffeeId,
        userId: by.id,
        origin: testOrigin,
      })
    },

    async bag(
      shelf: ScenarioShelf,
      coffeeId: string,
      details: Partial<NewPurchase> = {},
      by: { id: string } = { id: shelf.ownerId },
    ) {
      const db = await database()
      const added = await buyAgain(db, {
        shelfId: shelf.id,
        coffeeId,
        userId: by.id,
        purchase: {
          purchasedOn: '2026-11-01',
          roastedOn: null,
          sizeGrams: null,
          price: null,
          ...details,
        },
        origin: testOrigin,
      })
      await db
        .update(purchase)
        .set({ createdAt: nextStamp() })
        .where(eq(purchase.id, added!.id))

      return added!
    },

    async grindSetting(
      member: { id: string },
      shelf: ScenarioShelf,
      coffeeId: string,
      change: GrindSettingChange,
    ) {
      return setGrindSetting(await database(), {
        shelfId: shelf.id,
        coffeeId,
        userId: member.id,
        change,
      })
    },

    async coffeePhoto(coffeeId: string) {
      const photoUrl = await storePhoto(
        { data: Buffer.from('bag'), type: 'image/webp' },
        'coffees',
      )
      await replaceCoffeePhoto(
        await database(),
        { coffeeId, photoUrl: null },
        photoUrl,
      )

      return photoUrl
    },
  }
}
