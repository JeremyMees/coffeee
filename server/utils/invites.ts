import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, gt, isNotNull, isNull, lte, or } from 'drizzle-orm'
import type { Database } from '#server/types/database'
import { invite, shelf, shelfMember, user } from '#server/db/schemas'
import { changeShelf } from '#server/utils/notifications'

const inviteLifetime = 7 * 24 * 60 * 60 * 1000

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function newToken() {
  const token = randomBytes(32).toString('base64url')

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + inviteLifetime),
  }
}

function isPending() {
  return and(
    isNull(invite.usedAt),
    or(isNull(invite.expiresAt), gt(invite.expiresAt, new Date())),
  )
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
  const { token, tokenHash, expiresAt } = newToken()
  const [created] = await db
    .insert(invite)
    .values({ tokenHash, createdBy: input.createdBy, expiresAt })
    .returning()

  return { invite: created!, token }
}

export async function claimInvites(
  db: Database,
  input: { email: string; token?: string },
) {
  const email = input.email.toLowerCase()
  const claim = { usedAt: new Date(), usedBy: email }

  const byLink = input.token
    ? await db
        .update(invite)
        .set(claim)
        .where(and(eq(invite.tokenHash, hashToken(input.token)), isPending()))
        .returning()
    : []

  const byEmail = await db
    .update(invite)
    .set(claim)
    .where(and(eq(invite.email, email), isPending()))
    .returning()

  return {
    invites: [...byLink, ...byEmail],
    provesEmail: byLink.some(claimed => claimed.email === email),
  }
}

export function joinInvitedShelves(
  db: Database,
  input: { userId: string; email: string; origin: string },
) {
  return changeShelf(db, input.origin, async (tx, notify) => {
    const invited = await tx
      .selectDistinct({ shelfId: invite.shelfId })
      .from(invite)
      .where(
        and(
          eq(invite.usedBy, input.email.toLowerCase()),
          isNotNull(invite.usedAt),
          isNotNull(invite.shelfId),
        ),
      )

    if (invited.length === 0) return []

    const joined = await tx
      .insert(shelfMember)
      .values(
        invited.map(found => ({
          shelfId: found.shelfId!,
          userId: input.userId,
        })),
      )
      .onConflictDoNothing()
      .returning({ shelfId: shelfMember.shelfId })

    for (const found of joined) {
      await notify({
        shelfId: found.shelfId,
        actorId: input.userId,
        kind: 'memberJoined',
      })
    }

    return joined.map(found => found.shelfId)
  })
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
    .where(and(isNull(invite.shelfId), isPending()))
    .orderBy(desc(invite.createdAt))
}

export async function revokeInvite(db: Database, id: string) {
  const deleted = await db
    .delete(invite)
    .where(
      and(eq(invite.id, id), isNull(invite.shelfId), isNull(invite.usedAt)),
    )
    .returning({ id: invite.id })

  return deleted.length > 0
}

async function isMember(
  db: Database,
  input: { shelfId: string; email: string },
) {
  const [found] = await db
    .select({ id: user.id })
    .from(shelfMember)
    .innerJoin(user, eq(user.id, shelfMember.userId))
    .where(
      and(eq(shelfMember.shelfId, input.shelfId), eq(user.email, input.email)),
    )

  return Boolean(found)
}

export async function inviteToShelf(
  db: Database,
  input: { shelfId: string; email: string; createdBy: string },
) {
  const email = input.email.toLowerCase()

  if (await isMember(db, { shelfId: input.shelfId, email })) {
    return { outcome: 'member' as const }
  }

  await db
    .delete(invite)
    .where(
      and(
        eq(invite.shelfId, input.shelfId),
        eq(invite.email, email),
        isNull(invite.usedAt),
        lte(invite.expiresAt, new Date()),
      ),
    )

  const { token, tokenHash, expiresAt } = newToken()
  const [created] = await db
    .insert(invite)
    .values({
      email,
      tokenHash,
      expiresAt,
      shelfId: input.shelfId,
      createdBy: input.createdBy,
    })
    .onConflictDoNothing()
    .returning({
      id: invite.id,
      email: invite.email,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    })

  if (!created) return { outcome: 'pending' as const }

  return { outcome: 'invited' as const, invite: created, token }
}

export function listShelfInvites(db: Database, shelfId: string) {
  return db
    .select({
      id: invite.id,
      email: invite.email,
      invitedBy: user.name,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
    })
    .from(invite)
    .innerJoin(user, eq(user.id, invite.createdBy))
    .where(and(eq(invite.shelfId, shelfId), isPending()))
    .orderBy(desc(invite.createdAt))
}

export async function cancelShelfInvite(
  db: Database,
  input: { shelfId: string; inviteId: string },
) {
  const deleted = await db
    .delete(invite)
    .where(
      and(
        eq(invite.id, input.inviteId),
        eq(invite.shelfId, input.shelfId),
        isNull(invite.usedAt),
      ),
    )
    .returning({ id: invite.id })

  return deleted.length > 0
}

export function listInvitesFor(db: Database, email: string) {
  return db
    .select({
      id: invite.id,
      shelf: shelf.name,
      invitedBy: user.name,
      expiresAt: invite.expiresAt,
    })
    .from(invite)
    .innerJoin(shelf, eq(shelf.id, invite.shelfId))
    .innerJoin(user, eq(user.id, invite.createdBy))
    .where(and(eq(invite.email, email.toLowerCase()), isPending()))
    .orderBy(desc(invite.createdAt))
}

export async function findInviteByToken(db: Database, token: string) {
  const [found] = await db
    .select({ shelfId: shelf.id, shelf: shelf.name, invitedBy: user.name })
    .from(invite)
    .innerJoin(user, eq(user.id, invite.createdBy))
    .leftJoin(shelf, eq(shelf.id, invite.shelfId))
    .where(and(eq(invite.tokenHash, hashToken(token)), isPending()))

  return found
}

type InviteMatch = { inviteId: string; email: string } | { token: string }

function matching(match: InviteMatch) {
  const which =
    'token' in match
      ? eq(invite.tokenHash, hashToken(match.token))
      : and(eq(invite.id, match.inviteId), eq(invite.email, match.email))

  return and(which, isNotNull(invite.shelfId), isPending())
}

export function acceptInvite(
  db: Database,
  input: { userId: string; email: string; match: InviteMatch; origin: string },
) {
  return changeShelf(db, input.origin, async (tx, notify) => {
    const [claimed] = await tx
      .update(invite)
      .set({ usedAt: new Date(), usedBy: input.email.toLowerCase() })
      .where(matching(input.match))
      .returning({ shelfId: invite.shelfId })

    if (!claimed) return undefined

    const [added] = await tx
      .insert(shelfMember)
      .values({ shelfId: claimed.shelfId!, userId: input.userId })
      .onConflictDoNothing()
      .returning({ shelfId: shelfMember.shelfId })

    if (added) {
      await notify({
        shelfId: added.shelfId,
        actorId: input.userId,
        kind: 'memberJoined',
      })
    }

    const [joined] = await tx
      .select({ id: shelf.id, name: shelf.name, ownerId: shelf.ownerId })
      .from(shelf)
      .where(eq(shelf.id, claimed.shelfId!))

    return joined
  })
}

export async function declineInvite(db: Database, match: InviteMatch) {
  const deleted = await db
    .delete(invite)
    .where(matching(match))
    .returning({ id: invite.id })

  return deleted.length > 0
}
