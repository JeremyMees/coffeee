import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeePhoto from '~/components/organisms/CoffeePhoto.vue'
import type { PhotoCoffee } from '#imports'
import { tid } from '../../fixtures'

const ayele: PhotoCoffee = { id: 'c1', name: 'Ayele Fulasa', photoUrl: null }

function mountPhoto(shown: PhotoCoffee = ayele) {
  return mountSuspended(CoffeePhoto, { props: { coffee: shown } })
}

describe('CoffeePhoto', () => {
  it('names its photo for the morph from and back to the card', async () => {
    clearNuxtState('coffee-morph')

    const photo = await mountPhoto()

    expect(photo.get(tid('coffee-photo')).attributes('style')).toContain(
      'view-transition-name: coffee-photo-c1',
    )
  })

  it('shows a tidy placeholder when there is no photo', async () => {
    const wrapper = await mountPhoto()

    expect(wrapper.get(tid('coffee-photo-placeholder')).text()).toBe(
      'No photo yet',
    )
    expect(wrapper.find(tid('coffee-photo-image')).exists()).toBe(false)
  })

  it('shows the photo of the bag', async () => {
    const wrapper = await mountPhoto({
      ...ayele,
      photoUrl: '/api/photos/coffees/ayele.webp',
    })
    const image = wrapper.get(tid('coffee-photo-image'))

    expect(image.attributes('src')).toContain('ayele.webp')
    expect(image.attributes('alt')).toBe('The bag of Ayele Fulasa')
    expect(wrapper.find(tid('coffee-photo-placeholder')).exists()).toBe(false)
  })

  it('leaves changing the photo to the edit sheet', async () => {
    const wrapper = await mountPhoto()

    expect(wrapper.find('input, button, label').exists()).toBe(false)
  })
})
