import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { BellOffIcon } from '@lucide/vue'
import Notice from '~/components/molecules/Notice.vue'
import { tid } from '../../fixtures'

function mount(
  props: { tone?: 'info' | 'warning' } = {},
  slots: Record<string, string> = {},
) {
  return mountSuspended(Notice, {
    props: {
      title: 'Push is blocked',
      icon: BellOffIcon,
      testid: 'notice',
      ...props,
    },
    slots: { default: 'Allow notifications to turn it on.', ...slots },
  })
}

describe('Notice', () => {
  it('shows its title and text as a status message', async () => {
    const notice = await mount()

    const block = notice.get(tid('notice'))
    expect(block.attributes('role')).toBe('status')
    expect(block.get('[data-slot=alert-title]').text()).toBe('Push is blocked')
    expect(block.get('[data-slot=alert-description]').text()).toBe(
      'Allow notifications to turn it on.',
    )
    expect(block.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('reads as information unless it is a warning', async () => {
    const info = await mount()
    const warning = await mount({ tone: 'warning' })

    expect(info.get(tid('notice')).classes()).toContain('bg-info-surface')
    expect(warning.get(tid('notice')).classes()).toContain('bg-warning-surface')
  })

  it('offers an action only when given one', async () => {
    const plain = await mount()
    const withAction = await mount(
      {},
      { action: '<button data-testid="notice-fix">Fix it</button>' },
    )

    expect(plain.find('button').exists()).toBe(false)
    expect(withAction.get(tid('notice-fix')).text()).toBe('Fix it')
  })
})
