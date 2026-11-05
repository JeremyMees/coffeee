import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoasterDetails from '~/components/RoasterDetails.vue'
import type { ShelfRoaster } from '#imports'
import type { Member } from '#test/support/types'
import { byTestId, tid } from '../fixtures'
import { scenario, signIn } from '../server'

let sarah: Member
let squareMile: string

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  squareMile = await scenario.roaster(sarah, 'Square Mile')
  await scenario.roasterDetails(sarah, squareMile, {
    name: 'Square Mile',
    website: 'https://www.squaremilecoffee.com',
    countryCode: 'GB',
    city: 'London',
  })
  await signIn(sarah)
})

async function mountDetails(roasterId = squareMile) {
  const roaster = await $fetch<ShelfRoaster>(`/api/roasters/${roasterId}`)

  return mountSuspended(RoasterDetails, {
    props: { roaster },
    attachTo: document.body,
  })
}

describe('RoasterDetails', () => {
  it('names its logo and name for the morph into the roaster it opens', async () => {
    clearNuxtState('roaster-morph')
    const details = await mountDetails()

    await details.get(tid('roaster-details-name')).trigger('click')

    expect(
      details.get(tid('roaster-details', 'roaster-logo')).attributes('style'),
    ).toContain(`view-transition-name: roaster-logo-${squareMile}`)
    expect(
      details.get(tid('roaster-details-name')).attributes('style'),
    ).toContain(`view-transition-name: roaster-name-${squareMile}`)
  })

  it('shows where the roaster is and links to its website', async () => {
    const details = await mountDetails()

    expect(details.get(tid('roaster-details-name')).text()).toBe('Square Mile')
    expect(details.get(tid('roaster-details-place')).text()).toBe(
      'London, United Kingdom',
    )
    const website = details.get(tid('roaster-details-website'))
    expect(website.text()).toBe('squaremilecoffee.com')
    expect(website.attributes('href')).toBe('https://www.squaremilecoffee.com')
    expect(website.attributes('target')).toBe('_blank')
  })

  it('shows only the name when nothing else is known', async () => {
    const details = await mountDetails(
      await scenario.roaster(sarah, 'La Cabra'),
    )

    expect(details.get(tid('roaster-details-name')).text()).toBe('La Cabra')
    expect(details.find(tid('roaster-details-place')).exists()).toBe(false)
    expect(details.find(tid('roaster-details-website')).exists()).toBe(false)
  })

  it('offers no edit to someone who can only read it', async () => {
    const tom = await scenario.member('Tom')
    const details = await mountDetails(await scenario.roaster(tom, 'La Cabra'))

    expect(details.find(tid('roaster-edit')).exists()).toBe(false)
  })

  it('opens the roaster to edit', async () => {
    const details = await mountDetails()

    await details.get(tid('roaster-edit')).trigger('click')

    await vi.waitFor(() => expect(byTestId('edit-roaster-form')).not.toBeNull())
  })
})
