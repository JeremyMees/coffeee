import {
  createError,
  defineEventHandler,
  getRequestURL,
  readBody,
  setResponseStatus,
} from 'h3'
import { useDb } from '../../utils/db'
import { createInviteLink, inviteEmail } from '../../utils/invites'
import { requireAdmin } from '../../utils/session'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  const body = await readBody<{ email?: unknown; link?: unknown }>(event)
  const db = useDb()

  if (body?.link === true) {
    const { invite, token } = await createInviteLink(db, {
      createdBy: admin.id,
    })
    setResponseStatus(event, 201)

    return { ...invite, url: `${getRequestURL(event).origin}/invite/${token}` }
  }

  if (typeof body?.email !== 'string' || !emailPattern.test(body.email)) {
    throw createError({ statusCode: 400, statusMessage: 'Enter a valid email' })
  }

  const invite = await inviteEmail(db, {
    email: body.email,
    createdBy: admin.id,
  })

  if (!invite) {
    throw createError({
      statusCode: 409,
      statusMessage: 'That email is already invited',
    })
  }

  setResponseStatus(event, 201)

  return invite
})
