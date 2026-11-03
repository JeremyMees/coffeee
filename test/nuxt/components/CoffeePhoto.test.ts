import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeePhoto from '~/components/CoffeePhoto.vue'
import type { PhotoCoffee } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

beforeEach(resetApi)

const coffee: PhotoCoffee = {
  id: 'c1',
  name: 'Ayele Fulasa',
  photoUrl: null,
  canEdit: true,
}

function mountPhoto(overrides: Partial<PhotoCoffee> = {}) {
  return mountSuspended(CoffeePhoto, {
    props: { shelfId: 'home', coffee: { ...coffee, ...overrides } },
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

describe('CoffeePhoto', () => {
  it('shows a tidy placeholder when there is no photo', async () => {
    const wrapper = await mountPhoto()

    expect(wrapper.get(tid('coffee-photo-placeholder')).text()).toBe(
      'No photo yet',
    )
    expect(wrapper.get(tid('coffee-photo-pick')).text()).toBe('Add photo')
    expect(wrapper.find(tid('coffee-photo-remove')).exists()).toBe(false)
  })

  it('shows the photo of the bag', async () => {
    const wrapper = await mountPhoto({
      photoUrl: '/api/photos/coffees/a.webp',
    })
    const image = wrapper.get(tid('coffee-photo-image'))

    expect(image.attributes('src')).toBe('/api/photos/coffees/a.webp')
    expect(image.attributes('alt')).toBe('The bag of Ayele Fulasa')
    expect(wrapper.get(tid('coffee-photo-pick')).text()).toBe('Replace photo')
    expect(wrapper.find(tid('coffee-photo-remove')).exists()).toBe(true)
  })

  it('offers no changes to someone who can only read it', async () => {
    const wrapper = await mountPhoto({
      canEdit: false,
      photoUrl: '/api/photos/coffees/a.webp',
    })

    expect(wrapper.find(tid('coffee-photo-pick')).exists()).toBe(false)
    expect(wrapper.find(tid('coffee-photo-remove')).exists()).toBe(false)
  })

  it('uploads the photo that is picked', async () => {
    const wrapper = await mountPhoto()

    await choose(wrapper, [
      new File(['huge'], 'bag.jpg', { type: 'image/jpeg' }),
    ])

    await vi.waitFor(() => expect(api.photos).toEqual(['uploaded']))
    expect(
      (wrapper.get(tid('coffee-photo-input')).element as HTMLInputElement)
        .value,
    ).toBe('')
  })

  it('does nothing when no photo is picked', async () => {
    const wrapper = await mountPhoto()

    await choose(wrapper, [])

    expect(api.photos).toEqual([])
  })

  it('explains why a photo could not be uploaded', async () => {
    api.photoFails = true
    const wrapper = await mountPhoto()

    await choose(wrapper, [
      new File(['huge'], 'bag.jpg', { type: 'image/jpeg' }),
    ])

    await vi.waitFor(() =>
      expect(wrapper.get(tid('coffee-photo-error')).text()).toBe(
        'That photo is too large',
      ),
    )
  })

  it('removes the photo', async () => {
    const wrapper = await mountPhoto({
      photoUrl: '/api/photos/coffees/a.webp',
    })

    await wrapper.get(tid('coffee-photo-remove')).trigger('click')

    await vi.waitFor(() => expect(api.photos).toEqual(['removed']))
    expect(wrapper.find(tid('coffee-photo-error')).exists()).toBe(false)
  })
})
