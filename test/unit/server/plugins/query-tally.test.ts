import { createApp, eventHandler, toWebHandler } from 'h3'
import type { NitroApp } from 'nitropack/types'
import { describe, expect, it } from 'vitest'
import plugin from '#server/plugins/query-tally'
import { talliedClient } from '#server/utils/query-tally'

describe('query tally plugin', () => {
  it('reports the queries of every API request', async () => {
    const client = talliedClient({ query: async () => [] })
    const hooks: Record<string, (event: never) => void> = {}
    const h3App = createApp({
      onBeforeResponse: event => hooks.beforeResponse?.(event as never),
    }).use(
      eventHandler(async () => {
        await client.query()

        return { ok: true }
      }),
    )

    plugin({
      h3App,
      hooks: {
        hook: (name: string, run: (event: never) => void) => {
          hooks[name] = run
        },
      },
    } as unknown as NitroApp)

    const response = await toWebHandler(h3App)(
      new Request('http://localhost:3000/api/me'),
    )

    expect(response.headers.get('server-timing')).toMatch(/desc="1 query"$/)
  })
})
