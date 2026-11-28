import { createApp, eventHandler, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import bots from '#server/middleware/bots'

function visit(path: string, init: RequestInit = {}) {
  const app = createApp()
    .use(bots)
    .use(eventHandler(() => 'rendered'))

  return toWebHandler(app)(new Request(`http://localhost${path}`, init))
}

describe('bot requests', () => {
  it('get a 404 for scanner paths', async () => {
    const response = await visit('/wp-json/wp/v2/users?per_page=100')

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not found')
  })

  it('get a 403 from the sitewatch crawler', async () => {
    const response = await visit('/sign-in', {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; sitewatch/1.0; contract-address monitor)',
      },
    })

    expect(response.status).toBe(403)
  })

  it.each(['/', '/sign-in', '/api/me', '/sw.js', '/robots.txt'])(
    'leave %s to the app',
    async path => {
      const response = await visit(path)

      expect(await response.text()).toBe('rendered')
    },
  )
})
