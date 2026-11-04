import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import CoffeePhoto from '~/components/CoffeePhoto.vue'
import type { PhotoCoffee } from '#imports'
import { coffee } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { tid } from '../fixtures'
import { database, failRequest, scenario, signIn } from '../server'

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

let sarah: Member
let ayele: PhotoCoffee

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  const added = await scenario.coffee(sarah.shelf)
  ayele = { id: added.id, name: added.name, photoUrl: null, canEdit: true }
  await signIn(sarah)
})

async function withPhoto() {
  return { ...ayele, photoUrl: await scenario.coffeePhoto(ayele.id) }
}

function mountPhoto(shown: PhotoCoffee = ayele) {
  return mountSuspended(CoffeePhoto, {
    props: { shelfId: sarah.shelf.id, coffee: shown },
  })
}

async function choose(
  wrapper: Awaited<ReturnType<typeof mountPhoto>>,
  files: File[],
) {
  const input = wrapper.get(tid('coffee-photo-input'))
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  })
  await input.trigger('change')
}

async function storedPhoto() {
  const db = await database()
  const [found] = await db
    .select({ photoUrl: coffee.photoUrl })
    .from(coffee)
    .where(eq(coffee.id, ayele.id))

  return found!.photoUrl
}

describe('CoffeePhoto', () => {
  it('names its photo for the morph from and back to the card', async () => {
    clearNuxtState('coffee-morph')

    const photo = await mountPhoto()

    expect(photo.get(tid('coffee-photo')).attributes('style')).toContain(
      `view-transition-name: coffee-photo-${ayele.id}`,
    )
  })

  it('shows a tidy placeholder when there is no photo', async () => {
    const wrapper = await mountPhoto()

    expect(wrapper.get(tid('coffee-photo-placeholder')).text()).toBe(
      'No photo yet',
    )
    expect(wrapper.get(tid('coffee-photo-pick')).text()).toBe('Add photo')
    expect(wrapper.find(tid('coffee-photo-remove')).exists()).toBe(false)
  })

  it('shows the photo of the bag', async () => {
    const shown = await withPhoto()
    const wrapper = await mountPhoto(shown)
    const image = wrapper.get(tid('coffee-photo-image'))

    expect(image.attributes('src')).toBe(shown.photoUrl)
    expect(image.attributes('alt')).toBe('The bag of Ayele Fulasa')
    expect(wrapper.get(tid('coffee-photo-pick')).text()).toBe('Replace photo')
    expect(wrapper.find(tid('coffee-photo-remove')).exists()).toBe(true)
  })

  it('offers no changes to someone who can only read it', async () => {
    const wrapper = await mountPhoto({ ...(await withPhoto()), canEdit: false })

    expect(wrapper.find(tid('coffee-photo-pick')).exists()).toBe(false)
    expect(wrapper.find(tid('coffee-photo-remove')).exists()).toBe(false)
  })

  it('uploads the photo that is picked', async () => {
    const wrapper = await mountPhoto()

    await choose(wrapper, [
      new File(['huge'], 'bag.jpg', { type: 'image/jpeg' }),
    ])

    await vi.waitFor(async () =>
      expect(await storedPhoto()).toMatch(
        /^\/api\/photos\/coffees\/[\w-]+\.webp$/,
      ),
    )
    expect(
      (wrapper.get(tid('coffee-photo-input')).element as HTMLInputElement)
        .value,
    ).toBe('')
  })

  it('does nothing when no photo is picked', async () => {
    const wrapper = await mountPhoto()

    await choose(wrapper, [])
    await flushPromises()

    expect(wrapper.find(tid('coffee-photo-status')).exists()).toBe(false)
    expect(await storedPhoto()).toBeNull()
  })

  it('explains why a photo could not be uploaded', async () => {
    failRequest(
      'PUT',
      `/api/shelves/${sarah.shelf.id}/coffees/${ayele.id}/photo`,
      { status: 413, message: 'That photo is too large' },
    )
    const wrapper = await mountPhoto()

    await choose(wrapper, [
      new File(['huge'], 'bag.jpg', { type: 'image/jpeg' }),
    ])

    await vi.waitFor(() =>
      expect(wrapper.get(tid('coffee-photo-error')).text()).toBe(
        'That photo is too large',
      ),
    )
    expect(await storedPhoto()).toBeNull()
  })

  it('removes the photo', async () => {
    const wrapper = await mountPhoto(await withPhoto())

    await wrapper.get(tid('coffee-photo-remove')).trigger('click')

    await vi.waitFor(async () => expect(await storedPhoto()).toBeNull())
    expect(wrapper.find(tid('coffee-photo-error')).exists()).toBe(false)
  })
})
