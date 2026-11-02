import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RoasterDetails from '~/components/RoasterDetails.vue'
import type { ShelfRoaster } from '#imports'
import { fakeApi, resetApi, squareMile } from '../fake-api'
import { byTestId, tid } from '../fixtures'

fakeApi()

beforeEach(resetApi)

function mountDetails(overrides: Partial<ShelfRoaster> = {}) {
  return mountSuspended(RoasterDetails, {
    props: { shelfId: 'home', roaster: { ...squareMile(), ...overrides } },
    attachTo: document.body,
  })
}

describe('RoasterDetails', () => {
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
    const details = await mountDetails({
      website: null,
      countryCode: null,
      city: null,
    })

    expect(details.find(tid('roaster-details-place')).exists()).toBe(false)
    expect(details.find(tid('roaster-details-website')).exists()).toBe(false)
  })

  it('offers no edit to someone who can only read it', async () => {
    const details = await mountDetails({ canEdit: false })

    expect(details.find(tid('roaster-edit')).exists()).toBe(false)
  })

  it('opens the roaster to edit', async () => {
    const details = await mountDetails()

    await details.get(tid('roaster-edit')).trigger('click')

    await vi.waitFor(() => expect(byTestId('edit-roaster-form')).not.toBeNull())
  })
})
