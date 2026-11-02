import { defineEventHandler, setResponseStatus } from 'h3'
import { useDb } from '#server/utils/db'
import { checkHealth } from '#server/utils/health'

export default defineEventHandler(async event => {
  const health = await checkHealth(useDb())

  if (health.status === 'error') setResponseStatus(event, 503)

  return health
})
