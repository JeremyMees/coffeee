import { describe, expect, it, vi } from 'vitest'
import { checkHealth } from '#server/utils/health'
import { createTestDatabase } from '#test/support/database'

describe('health check', () => {
  it('reports the database as reachable', async () => {
    const { db } = await createTestDatabase()

    expect(await checkHealth(db)).toEqual({
      status: 'ok',
      database: 'reachable',
    })
  })

  it('reports the database as unreachable when queries fail', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { db, client } = await createTestDatabase()
    await client.close()

    expect(await checkHealth(db)).toEqual({
      status: 'error',
      database: 'unreachable',
    })
    expect(log).toHaveBeenCalledWith(
      'Database health check failed',
      expect.any(Error),
    )
    log.mockRestore()
  })
})
