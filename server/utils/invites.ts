import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm'
import type { Database } from '#server/db/database'
import { invite } from '#server/db/schemas'

const linkLifetime = 7 * 24 * 60 * 60 * 1000

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function inviteEmail(
  db: Database,
  input: { email: string; createdBy: string },
) {
  const [created] = await db
    .insert(invite)
    .values({ email: input.email.toLowerCase(), createdBy: input.createdBy })
    .onConflictDoNothing()
    .returning()

  return created
}

export async function createInviteLink(
  db: Database,
  input: { createdBy: string },
) {
  const token = randomBytes(32).toString('base64url')
  const [created] = await db
    .insert(invite)
    .values({
      tokenHash: hashToken(token),
      createdBy: input.createdBy,
      expiresAt: new Date(Date.now() + linkLifetime),
    })
    .returning()

  return { invite: created!, token }
}

export async function claimInvite(
  db: Database,
  input: { email: string; token?: string },
) {
  const email = input.email.toLowerCase()
  const claim = { usedAt: new Date(), usedBy: email }

  const [byEmail] = await db
    .update(invite)
    .set(claim)
    .where(and(eq(invite.email, email), isNull(invite.usedAt)))
    .returning()

  if (byEmail || !input.token) return byEmail

  const [byLink] = await db
    .update(invite)
    .set(claim)
    .where(
      and(
        eq(invite.tokenHash, hashToken(input.token)),
        isNull(invite.usedAt),
        gt(invite.expiresAt, new Date()),
      ),
    )
    .returning()

  return byLink
}

export function listPendingInvites(db: Database) {
  return db
    .select({
      id: invite.id,
      email: invite.email,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    })
    .from(invite)
    .where(
      and(
        isNull(invite.usedAt),
        or(isNull(invite.expiresAt), gt(invite.expiresAt, new Date())),
      ),
    )
    .orderBy(desc(invite.createdAt))
}

export async function revokeInvite(db: Database, id: string) {
  const deleted = await db
    .delete(invite)
    .where(and(eq(invite.id, id), isNull(invite.usedAt)))
    .returning({ id: invite.id })

  return deleted.length > 0
}
