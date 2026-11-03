import { defineEventHandler, getRouterParam } from 'h3'
import { useDb } from '#server/utils/db'
import { findInviteByToken } from '#server/utils/invites'
import { orNotFound } from '#server/utils/session'

export default defineEventHandler(async event => {
  const found = await findInviteByToken(
    useDb(),
    getRouterParam(event, 'token')!,
  )

  return orNotFound(found, 'This invite has expired or was already used')
})
