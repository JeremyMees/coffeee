import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import App from '~/app.vue'
import { shelfPath } from '#imports'
import { shelf } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { currentPath, forgetLastShelf, tid } from '../../fixtures'
import { database, failRequest, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  forgetLastShelf()
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function create(name: string) {
  const page = await mountSuspended(App, { route: '/shelves/new' })

  await page.get(tid('shelf-name')).setValue(name)
  await page.get(tid('new-shelf-form')).trigger('submit')
  await flushPromises()

  return page
}

async function sarahsShelves() {
  const db = await database()
  return db
    .select({ id: shelf.id, name: shelf.name, ownerId: shelf.ownerId })
    .from(shelf)
    .where(eq(shelf.ownerId, sarah.id))
}

describe('creating a shelf', () => {
  it('names the shelf and goes to it', async () => {
    const page = await create('Garage')

    await vi.waitFor(async () => {
      const garage = (await sarahsShelves()).find(
        found => found.name === 'Garage',
      )
      expect(garage).toBeDefined()
      expect(currentPath()).toBe(shelfPath(garage!))
    })
    await vi.waitFor(() =>
      expect(page.get(tid('top-bar-shelf-switcher')).text()).toBe(
        'Shelf: Garage',
      ),
    )
  })

  it('asks for a name before sending anything', async () => {
    const page = await create('   ')

    await vi.waitFor(() =>
      expect(page.get(tid('new-shelf-form')).text()).toContain(
        'Give the shelf a name',
      ),
    )
    expect((await sarahsShelves()).map(found => found.name)).toEqual([
      "Sarah's shelf",
    ])
    expect(currentPath()).toBe('/shelves/new')
  })

  it('says why the server refused the shelf', async () => {
    failRequest('POST', '/api/shelves', {
      status: 409,
      message: 'That shelf could not be made',
    })

    const page = await create('Garage')

    await vi.waitFor(() =>
      expect(page.get(tid('form-error')).text()).toBe(
        'That shelf could not be made',
      ),
    )
    expect(currentPath()).toBe('/shelves/new')
  })
})
