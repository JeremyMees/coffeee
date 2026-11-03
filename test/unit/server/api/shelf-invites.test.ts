import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import linkAcceptHandler from '#server/api/invites/link/[token]/accept.post'
import linkDeclineHandler from '#server/api/invites/link/[token]/decline.post'
import linkHandler from '#server/api/invites/link/[token].get'
import acceptHandler from '#server/api/me/invites/[inviteId]/accept.post'
import declineHandler from '#server/api/me/invites/[inviteId]/decline.post'
import myInvitesHandler from '#server/api/me/invites/index.get'
import cancelHandler from '#server/api/shelves/[shelfId]/invites/[inviteId].delete'
import listHandler from '#server/api/shelves/[shelfId]/invites/index.get'
import createHandler from '#server/api/shelves/[shelfId]/invites/index.post'
import type { Email } from '#server/types/email'
import { shelfMember } from '#server/db/schemas'
import { createShelf, listShelves } from '#server/utils/shelves'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, createTestUser } from '#test/support/database'
import type { TestAuth, TestDatabase } from '#test/support/types'

const current = vi.hoisted(() => ({
  auth: undefined as unknown,
  db: undefined as unknown,
  sent: [] as Email[],
  failSending: false,
}))

vi.mock('#server/utils/auth', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAuth: () => (current.auth as TestAuth).auth,
}))

vi.mock('#server/utils/db', () => ({ useDb: () => current.db }))

vi.mock('#server/utils/email', () => ({
  sendEmail: async (email: Email) => {
    if (current.failSending) throw new Error('Plunk is down')

    current.sent.push(email)
  },
}))

let testAuth: TestAuth
let db: TestDatabase

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
  current.sent = []
  current.failSending = false
})

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/shelves/:shelfId/invites', listHandler)
    .post('/api/shelves/:shelfId/invites', createHandler)
    .delete('/api/shelves/:shelfId/invites/:inviteId', cancelHandler)
    .get('/api/me/invites', myInvitesHandler)
    .post('/api/me/invites/:inviteId/accept', acceptHandler)
    .post('/api/me/invites/:inviteId/decline', declineHandler)
    .get('/api/invites/link/:token', linkHandler)
    .post('/api/invites/link/:token/accept', linkAcceptHandler)
    .post('/api/invites/link/:token/decline', linkDeclineHandler)
  const app = createApp().use(router)

  const headers = new Headers(init.headers)
  headers.set('host', 'localhost:3000')

  return toWebHandler(app)(
    new Request(`http://localhost:3000${path}`, { ...init, headers }),
  )
}

async function person(name: string, email: string) {
  const user = await createTestUser(db, { name, email })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return { user, headers }
}

async function setup() {
  const sarah = await person('Sarah', 'sarah@example.com')
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.user.id })

  function invite(email: string, headers = sarah.headers) {
    return request(`/api/shelves/${home.id}/invites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
    })
  }

  function tokenOf(email: Email) {
    return email.values.link.split('/invite/')[1]!
  }

  return { sarah, home, invite, tokenOf }
}

describe('inviting someone to a shelf', () => {
  it('emails the invite, naming the shelf and who sent it', async () => {
    const { invite } = await setup()

    const response = await invite('Tom@Example.com')

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      email: 'tom@example.com',
      invitedBy: 'Sarah',
    })
    expect(current.sent).toEqual([
      {
        to: 'tom@example.com',
        subject: 'Sarah invited you to Home on Coffeee',
        template: 'ShelfInvite',
        values: {
          shelf: 'Home',
          invitedBy: 'Sarah',
          link: expect.stringMatching(
            /^http:\/\/localhost:3000\/invite\/[\w-]{43}$/,
          ),
        },
      },
    ])
  })

  it('lets any member invite, not only the owner', async () => {
    const { home, invite } = await setup()
    const tom = await person('Tom', 'tom@example.com')
    await db
      .insert(shelfMember)
      .values({ shelfId: home.id, userId: tom.user.id })

    const response = await invite('anna@example.com', tom.headers)

    expect(response.status).toBe(201)
    expect(current.sent[0]!.subject).toBe('Tom invited you to Home on Coffeee')
  })

  it('refuses someone who is not on the shelf', async () => {
    const { invite } = await setup()
    const eve = await person('Eve', 'eve@example.com')

    const response = await invite('anna@example.com', eve.headers)

    expect(response.status).toBe(404)
    expect(current.sent).toEqual([])
  })

  it('refuses an email that is already a member or already invited', async () => {
    const { invite } = await setup()
    await invite('tom@example.com')

    const member = await invite('sarah@example.com')
    const pending = await invite('tom@example.com')

    expect(member.status).toBe(409)
    expect((await member.json()).statusMessage).toBe(
      'That person is already on this shelf',
    )
    expect(pending.status).toBe(409)
    expect((await pending.json()).statusMessage).toBe(
      'That email already has a pending invite',
    )
    expect(current.sent).toHaveLength(1)
  })

  it('refuses an invalid email', async () => {
    const { invite } = await setup()

    expect((await invite('not an email')).status).toBe(400)
  })

  it('drops the invite when its email could not be sent, so it can be retried', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sarah, home, invite } = await setup()
    current.failSending = true

    const failed = await invite('tom@example.com')
    current.failSending = false
    const list = await request(`/api/shelves/${home.id}/invites`, {
      headers: sarah.headers,
    })
    const retried = await invite('tom@example.com')

    expect(failed.status).toBe(502)
    expect(await list.json()).toEqual([])
    expect(retried.status).toBe(201)
    log.mockRestore()
  })
})

describe('pending invites on a shelf', () => {
  it('lets members see and cancel them', async () => {
    const { sarah, home, invite } = await setup()
    const created = await (await invite('tom@example.com')).json()

    const list = await request(`/api/shelves/${home.id}/invites`, {
      headers: sarah.headers,
    })
    const cancelled = await request(
      `/api/shelves/${home.id}/invites/${created.id}`,
      { method: 'DELETE', headers: sarah.headers },
    )
    const again = await request(
      `/api/shelves/${home.id}/invites/${created.id}`,
      { method: 'DELETE', headers: sarah.headers },
    )

    expect(await list.json()).toEqual([
      expect.objectContaining({ email: 'tom@example.com', invitedBy: 'Sarah' }),
    ])
    expect(cancelled.status).toBe(204)
    expect(again.status).toBe(404)
  })

  it('hides them from people who are not on the shelf', async () => {
    const { home, invite } = await setup()
    const eve = await person('Eve', 'eve@example.com')
    await invite('tom@example.com')

    const list = await request(`/api/shelves/${home.id}/invites`, {
      headers: eve.headers,
    })

    expect(list.status).toBe(404)
  })
})

describe('someone with an account', () => {
  it('sees invites sent to their email and accepts one', async () => {
    const { home, invite } = await setup()
    const tom = await person('Tom', 'tom@example.com')
    await invite('tom@example.com')

    const mine = await (
      await request('/api/me/invites', { headers: tom.headers })
    ).json()
    const accepted = await request(`/api/me/invites/${mine[0].id}/accept`, {
      method: 'POST',
      headers: tom.headers,
    })

    expect(mine).toEqual([
      expect.objectContaining({ shelf: 'Home', invitedBy: 'Sarah' }),
    ])
    expect(await accepted.json()).toEqual({
      id: home.id,
      name: 'Home',
      ownerId: home.ownerId,
    })
    expect(await listShelves(db, tom.user.id)).toEqual([
      expect.objectContaining({ id: home.id }),
    ])
  })

  it('declines an invite', async () => {
    const { invite } = await setup()
    const tom = await person('Tom', 'tom@example.com')
    await invite('tom@example.com')
    const [mine] = await (
      await request('/api/me/invites', { headers: tom.headers })
    ).json()

    const declined = await request(`/api/me/invites/${mine.id}/decline`, {
      method: 'POST',
      headers: tom.headers,
    })
    const after = await request('/api/me/invites', { headers: tom.headers })

    expect(declined.status).toBe(204)
    expect(await after.json()).toEqual([])
  })

  it('cannot accept or decline an invite meant for someone else', async () => {
    const { invite } = await setup()
    const eve = await person('Eve', 'eve@example.com')
    const created = await (await invite('tom@example.com')).json()

    const accepted = await request(`/api/me/invites/${created.id}/accept`, {
      method: 'POST',
      headers: eve.headers,
    })
    const declined = await request(`/api/me/invites/${created.id}/decline`, {
      method: 'POST',
      headers: eve.headers,
    })

    expect(accepted.status).toBe(404)
    expect(declined.status).toBe(404)
  })

  it('accepts from the emailed link once', async () => {
    const { home, invite, tokenOf } = await setup()
    const tom = await person('Tom', 'tom@example.com')
    await invite('tom@example.com')
    const token = tokenOf(current.sent[0]!)

    const preview = await request(`/api/invites/link/${token}`)
    const accepted = await request(`/api/invites/link/${token}/accept`, {
      method: 'POST',
      headers: tom.headers,
    })
    const again = await request(`/api/invites/link/${token}`)

    expect(await preview.json()).toEqual({
      shelfId: home.id,
      shelf: 'Home',
      invitedBy: 'Sarah',
    })
    expect((await accepted.json()).id).toBe(home.id)
    expect(again.status).toBe(404)
  })

  it('declines from the emailed link', async () => {
    const { invite, tokenOf } = await setup()
    const tom = await person('Tom', 'tom@example.com')
    await invite('tom@example.com')
    const token = tokenOf(current.sent[0]!)

    const declined = await request(`/api/invites/link/${token}/decline`, {
      method: 'POST',
      headers: tom.headers,
    })
    const again = await request(`/api/invites/link/${token}/decline`, {
      method: 'POST',
      headers: tom.headers,
    })

    expect(declined.status).toBe(204)
    expect(again.status).toBe(404)
  })

  it('needs to be signed in to answer an invite link', async () => {
    const { invite, tokenOf } = await setup()
    await invite('tom@example.com')
    const token = tokenOf(current.sent[0]!)

    const accepted = await request(`/api/invites/link/${token}/accept`, {
      method: 'POST',
    })

    expect(accepted.status).toBe(401)
  })

  it('says when an invite link does not work', async () => {
    const tom = await person('Tom', 'tom@example.com')

    const preview = await request('/api/invites/link/nope')
    const accepted = await request('/api/invites/link/nope/accept', {
      method: 'POST',
      headers: tom.headers,
    })

    expect(preview.status).toBe(404)
    expect(accepted.status).toBe(404)
  })
})
