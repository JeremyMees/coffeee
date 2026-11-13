import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DismissibleBanner from '~/components/templates/DismissibleBanner.vue'
import { tid } from '../../fixtures'

beforeEach(() => {
  localStorage.clear()
})

function mount(show = true) {
  return mountSuspended(DismissibleBanner, {
    props: {
      title: 'Try this',
      text: 'It is new.',
      storageKey: 'try-banner-dismissed',
      show,
      testid: 'try-banner',
    },
    slots: { default: () => 'Do it' },
  })
}

describe('DismissibleBanner', () => {
  it('shows its title, text and action', async () => {
    const banner = await mount()

    expect(banner.get(tid('try-banner')).text()).toContain('Try this')
    expect(banner.get(tid('try-banner')).text()).toContain('It is new.')
    expect(banner.get(tid('try-banner')).text()).toContain('Do it')
  })

  it('stays hidden when there is nothing to show', async () => {
    const banner = await mount(false)

    expect(banner.find(tid('try-banner')).exists()).toBe(false)
  })

  it('stays hidden for good once dismissed', async () => {
    const banner = await mount()

    await banner.get(tid('try-banner-dismiss')).trigger('click')

    expect(banner.find(tid('try-banner')).exists()).toBe(false)
    expect((await mount()).find(tid('try-banner')).exists()).toBe(false)
  })
})
