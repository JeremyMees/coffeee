import { describe, expect, it } from 'vitest'
import { checkHealth } from '../../../../server/utils/health'
import { createTestDatabase } from '../../../support/database'

describe('health check', () => {
  it('reports the database as reachable', async () => {
    const { db } = await createTestDatabase()

    expect(await checkHealth(db)).toEqual({
      status: 'ok',
      database: 'reachable',
    })
  })

  it('reports the database as unreachable when queries fail', async () => {
    const { db, client } = await createTestDatabase()
    await client.close()

    expect(await checkHealth(db)).toEqual({
      status: 'error',
      database: 'unreachable',
    })
  })
})
