import { defineEventHandler } from 'h3'
import { listRoasters } from '../utils/coffees'
import { useDb } from '../utils/db'
import { requireUser } from '../utils/session'

export default defineEventHandler(async event => {
  await requireUser(event)

  return listRoasters(useDb())
})
