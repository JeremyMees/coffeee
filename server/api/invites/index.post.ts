import {
  createError,
  defineEventHandler,
  getRequestURL,
  readBody,
  setResponseStatus,
} from 'h3'
import { inviteEmailSchema } from '#shared/utils/schemas'
import { useDb } from '../../utils/db'
import { createInviteLink, inviteEmail } from '../../utils/invites'
import { requireAdmin } from '../../utils/session'
import { readValidBody } from '../../utils/validation'

export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const db = useDb()

  if ((await readBody<{ link?: unknown }>(event))?.link === true) {
    const { invite, token } = await createInviteLink(db, {
      createdBy: admin.id,
    })
    setResponseStatus(event, 201)

    return { ...invite, url: `${getRequestURL(event).origin}/invite/${token}` }
  }

  const { email } = await readValidBody(event, inviteEmailSchema)
  const invite = await inviteEmail(db, { email, createdBy: admin.id })

  if (!invite) {
    throw createError({
      statusCode: 409,
      statusMessage: 'That email is already invited',
    })
  }

  setResponseStatus(event, 201)

  return invite
})
