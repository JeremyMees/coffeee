import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'

describe('home page', () => {
  it('shows the app name and what it is for', async () => {
    const page = await mountSuspended(App, { route: '/' })

    expect(page.find('h1').text()).toBe('Coffeee')
    expect(page.text()).toContain(
      'Your coffee shelf, and every coffee you ever bought.',
    )
  })
})
