import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeSpecCardSkeleton from '~/components/skeletons/CoffeeSpecCardSkeleton.vue'
import { tid } from '../../fixtures'

describe('CoffeeSpecCardSkeleton', () => {
  it('holds the place of a roaster, a name and four spec rows', async () => {
    const skeleton = await mountSuspended(CoffeeSpecCardSkeleton)

    expect(
      skeleton.find(tid('coffee-spec-card-skeleton-roaster')).exists(),
    ).toBe(true)
    expect(skeleton.findAll(tid('coffee-spec-card-skeleton-row'))).toHaveLength(
      4,
    )
  })

  it('leaves out the roaster when the card will not show it', async () => {
    const skeleton = await mountSuspended(CoffeeSpecCardSkeleton, {
      props: { roaster: false, rows: 3 },
    })

    expect(
      skeleton.find(tid('coffee-spec-card-skeleton-roaster')).exists(),
    ).toBe(false)
    expect(skeleton.findAll(tid('coffee-spec-card-skeleton-row'))).toHaveLength(
      3,
    )
  })
})
