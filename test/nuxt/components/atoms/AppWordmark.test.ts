import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppWordmark from '~/components/atoms/AppWordmark.vue'
import { tid } from '../../fixtures'

describe('AppWordmark', () => {
  it('spells the name on one line', async () => {
    const wordmark = await mountSuspended(AppWordmark)

    expect(wordmark.get(tid('wordmark')).text()).toBe('coffeee')
    expect(wordmark.find(`${tid('wordmark')} br`).exists()).toBe(false)
  })

  it('stacks the name over three lines', async () => {
    const wordmark = await mountSuspended(AppWordmark, {
      props: { stacked: true },
    })

    expect(wordmark.get(tid('wordmark')).text()).toBe('coffeee')
    expect(wordmark.findAll(`${tid('wordmark')} br`)).toHaveLength(2)
  })
})
