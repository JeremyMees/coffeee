import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoasterLogoImage from '~/components/RoasterLogoImage.vue'
import { tid } from '../fixtures'

describe('RoasterLogoImage', () => {
  it('shows the logo of the roaster', async () => {
    const logo = await mountSuspended(RoasterLogoImage, {
      props: {
        roaster: {
          name: 'Square Mile',
          logoUrl: '/api/photos/roasters/a.webp',
        },
      },
    })

    const image = logo.get(tid('roaster-logo-image'))
    expect(image.attributes('src')).toBe('/api/photos/roasters/a.webp')
    expect(image.attributes('alt')).toBe('The logo of Square Mile')
  })

  it('shows the first letter of its name without a logo', async () => {
    const logo = await mountSuspended(RoasterLogoImage, {
      props: { roaster: { name: 'Square Mile', logoUrl: null } },
    })

    expect(logo.get(tid('roaster-logo-placeholder')).text()).toBe('S')
  })
})
