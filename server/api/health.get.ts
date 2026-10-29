import { defineEventHandler, setResponseStatus } from 'h3'
import { useDb } from '../utils/db'
import { checkHealth } from '../utils/health'

export default defineEventHandler(async event => {
  const health = await checkHealth(useDb())

  if (health.status === 'error') setResponseStatus(event, 503)

  return health
})
