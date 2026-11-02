import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { brewMethod } from '#server/db/schemas'
import { addBrewMethod, listBrewMethods } from '#server/utils/brew-methods'
import { createTestDatabase, createTestUser } from '#test/support/database'

const seeded = [
  'Espresso',
  'Pour over',
  'AeroPress',
  'Moka pot',
  'French press',
  'Cold brew',
  'Batch brew',
]

async function setup() {
  const { db } = await createTestDatabase()
  const admin = await createTestUser(db, { role: 'admin' })

  return { db, admin }
}

describe('brew methods', () => {
  it('starts with the seeded brew methods in order', async () => {
    const { db } = await setup()

    const methods = await listBrewMethods(db)

    expect(methods.map(method => method.name)).toEqual(seeded)
  })

  it('adds a brew method at the end of the list', async () => {
    const { db, admin } = await setup()

    const added = await addBrewMethod(db, {
      createdBy: admin.id,
      brewMethod: { name: 'Siphon' },
    })

    expect(added).toEqual({ id: expect.any(String), name: 'Siphon' })
    expect((await listBrewMethods(db)).at(-1)).toEqual(added)
    const [stored] = await db
      .select()
      .from(brewMethod)
      .where(eq(brewMethod.name, 'Siphon'))
    expect(stored).toMatchObject({ createdBy: admin.id, position: 7 })
  })

  it('adds nothing that is already on the list', async () => {
    const { db, admin } = await setup()

    expect(
      await addBrewMethod(db, {
        createdBy: admin.id,
        brewMethod: { name: 'pour-over' },
      }),
    ).toBeUndefined()
    expect(await listBrewMethods(db)).toHaveLength(seeded.length)
  })
})
