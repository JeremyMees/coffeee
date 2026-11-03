import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { findRoaster } from '#server/utils/roasters'
import { orNotFound, requireUser } from '#server/utils/session'

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const roaster = await findRoaster(useDb(), {
    roasterId: getRouterParam(event, 'roasterId')!,
    viewer: user,
  })

  return orNotFound(roaster, 'Roaster not found')
})
