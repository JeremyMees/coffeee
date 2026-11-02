import { createApp, toWebHandler } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import handler from '#server/api/health.get'
import { createTestDatabase } from '#test/support/database'
import type { TestDatabase } from '#test/support/types'

const database = vi.hoisted(() => ({
  current: undefined as TestDatabase | undefined,
}))

vi.mock('#server/utils/db', () => ({
  useDb: () => database.current,
}))

function getHealth() {
  const app = createApp().use('/api/health', handler)
  return toWebHandler(app)(new Request('http://localhost/api/health'))
}

describe('GET /api/health', () => {
  it('reports the database as reachable', async () => {
    database.current = (await createTestDatabase()).db

    const response = await getHealth()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'ok',
      database: 'reachable',
    })
  })

  it('reports the database as unreachable when it is down', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { db, client } = await createTestDatabase()
    await client.close()
    database.current = db

    const response = await getHealth()

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      status: 'error',
      database: 'unreachable',
    })
    log.mockRestore()
  })
})
