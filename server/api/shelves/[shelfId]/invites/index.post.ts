import {
  createError,
  defineEventHandler,
  getRequestURL,
  setResponseStatus,
} from 'h3'
import { inviteEmailSchema } from '#shared/utils/schemas'
import { useDb } from '#server/utils/db'
import { sendEmail } from '#server/utils/email'
import { cancelShelfInvite, inviteToShelf } from '#server/utils/invites'
import { requireShelf } from '#server/utils/session'
import { readValidBody } from '#server/utils/validation'

export default defineEventHandler(async event => {
  const { user, shelf } = await requireShelf(event)
  const { email } = await readValidBody(event, inviteEmailSchema)
  const db = useDb()
  const result = await inviteToShelf(db, {
    shelfId: shelf.id,
    email,
    createdBy: user.id,
  })

  if (result.outcome === 'member') {
    throw createError({
      statusCode: 409,
      statusMessage: 'That person is already on this shelf',
    })
  }

  if (result.outcome === 'pending') {
    throw createError({
      statusCode: 409,
      statusMessage: 'That email already has a pending invite',
    })
  }

  try {
    await sendEmail({
      to: email,
      subject: `${user.name} invited you to ${shelf.name} on Coffeee`,
      template: 'ShelfInvite',
      values: {
        shelf: shelf.name,
        invitedBy: user.name,
        link: `${getRequestURL(event).origin}/invite/${result.token}`,
      },
    })
  } catch (caught) {
    await cancelShelfInvite(db, {
      shelfId: shelf.id,
      inviteId: result.invite.id,
    })
    console.error('Could not send a shelf invite', caught)

    throw createError({
      statusCode: 502,
      statusMessage: "The invite email couldn't be sent. Try again.",
    })
  }

  setResponseStatus(event, 201)

  return { ...result.invite, invitedBy: user.name }
})
