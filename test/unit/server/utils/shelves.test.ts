import { describe, expect, it } from 'vitest'
import {
  createShelf,
  findShelf,
  listShelves,
  shelfNameFor,
} from '#server/utils/shelves'
import { createTestDatabase, createTestUser } from '#test/support/database'

async function setup() {
  const { db } = await createTestDatabase()
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })

  return { db, sarah, tom }
}

describe('shelfNameFor', () => {
  it('names a shelf after the first name of its owner', () => {
    expect(shelfNameFor('Sarah Jones')).toBe("Sarah's shelf")
  })

  it('falls back to a plain name when there is no name', () => {
    expect(shelfNameFor('  ')).toBe('My shelf')
  })
})

describe('shelves', () => {
  it('makes the creator of a shelf its owner and a member', async () => {
    const { db, sarah } = await setup()

    const shelf = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    expect(shelf).toMatchObject({ name: 'Work', ownerId: sarah.id })
    expect(await listShelves(db, sarah.id)).toEqual([
      { id: shelf.id, name: 'Work', ownerId: sarah.id },
    ])
  })

  it('lists only the shelves a user is a member of, oldest first', async () => {
    const { db, sarah, tom } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
    await createShelf(db, { name: "Tom's shelf", ownerId: tom.id })
    const work = await createShelf(db, { name: 'Work', ownerId: sarah.id })

    const shelves = await listShelves(db, sarah.id)

    expect(shelves.map(shelf => shelf.id)).toEqual([home.id, work.id])
  })

  it('finds a shelf for its members', async () => {
    const { db, sarah } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

    const found = await findShelf(db, { shelfId: home.id, userId: sarah.id })

    expect(found).toEqual({ id: home.id, name: 'Home', ownerId: sarah.id })
  })

  it('finds nothing for someone who is not a member', async () => {
    const { db, sarah, tom } = await setup()
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })

    const found = await findShelf(db, { shelfId: home.id, userId: tom.id })

    expect(found).toBeUndefined()
  })
})
