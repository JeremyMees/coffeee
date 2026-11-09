import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '~/app.vue'
import { shelfPath, useCurrentUser } from '#imports'
import { listShelfInvites } from '#server/utils/invites'
import { listShelves } from '#server/utils/shelves'
import type { Member } from '#test/support/types'
import { byTestId, click, currentPath, submit, tid, type } from '../../fixtures'
import {
  database,
  failRequest,
  holdRequest,
  scenario,
  signIn,
} from '../../server'

const { social, signUpEmail } = vi.hoisted(() => ({
  social: vi.fn(),
  signUpEmail: vi.fn(),
}))

mockNuxtImport('authClient', () => ({
  signIn: { social },
  signUp: { email: signUpEmail },
}))

let tom: Member
let home: { id: string; name: string; ownerId: string }
let token: string

beforeEach(async () => {
  const sarah = await scenario.member('Sarah')
  tom = await scenario.member('Tom')
  home = await scenario.shelf(sarah, 'Home')
  token = (await scenario.shelfInvite(home, tom.email)).token
  useCurrentUser().value = null
})

function linkPath(link = token) {
  return `/api/invites/link/${link}`
}

function open(link = token) {
  return mountSuspended(App, {
    route: `/invite/${link}`,
    attachTo: document.body,
  })
}

async function visit(link = token) {
  const page = await open(link)
  await vi.waitFor(() =>
    expect(page.find(tid('invite-skeleton')).exists()).toBe(false),
  )

  return page
}

describe('invite page', () => {
  it('names the shelf and who sent the invite', async () => {
    const page = await visit()

    expect(page.get(tid('invite-description')).text()).toContain(
      'Sarah invited you to their shelf Home',
    )
  })

  it('signs up with Google carrying the invite token, landing on the shelf', async () => {
    const page = await visit()

    await page.get(tid('invite-google')).trigger('click')

    expect(social).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
        callbackURL: `/invite/${token}`,
        newUserCallbackURL: shelfPath(home),
        additionalData: { inviteToken: token },
      }),
    )
  })

  it('creates a password account carrying the invite token', async () => {
    signUpEmail.mockResolvedValue({
      data: { user: { emailVerified: false } },
      error: null,
    })
    await visit()

    await type('sign-up-name', 'Tom')
    await type('sign-up-email', 'tom@example.com')
    await type('sign-up-password', 'a-long-password')
    await submit('sign-up-form')

    await vi.waitFor(() =>
      expect(signUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tom@example.com',
          callbackURL: shelfPath(home),
          fetchOptions: { query: { inviteToken: token } },
        }),
      ),
    )
  })

  it('lets someone with an account sign in and come back to answer', async () => {
    const page = await visit()

    expect(page.get(tid('invite-sign-in')).attributes('href')).toBe(
      `/sign-in?redirect=/invite/${token}`,
    )
  })

  it('lets someone signed in join the shelf', async () => {
    await signIn(tom)
    await visit()

    await click('invite-accept')

    await vi.waitFor(() => expect(currentPath()).toBe(shelfPath(home)))
    expect(useCurrentUser().value?.shelves).toContainEqual(
      expect.objectContaining({ id: home.id }),
    )
    const joined = await listShelves(await database(), tom.id)
    expect(joined.map(found => found.id)).toContain(home.id)
  })

  it('lets someone signed in decline', async () => {
    await signIn(tom)
    await visit()

    await click('invite-decline')

    await vi.waitFor(() => expect(currentPath()).not.toBe(`/invite/${token}`))
    expect(await listShelfInvites(await database(), home.id)).toEqual([])
    const shelves = await listShelves(await database(), tom.id)
    expect(shelves.map(found => found.id)).not.toContain(home.id)
  })

  it('tells someone signed in that an admin link is not for them', async () => {
    const jeremy = await scenario.member('Jeremy', { role: 'admin' })
    const link = await scenario.inviteLink(jeremy)
    await signIn(tom)

    await visit(link.token)

    expect(byTestId('invite-signed-in')?.textContent).toContain(
      'You already have an account.',
    )
    expect(byTestId('invite-accept')).toBeNull()
  })

  it('explains a link that no longer works', async () => {
    await scenario.acceptInvite(tom, token)

    const page = await visit()

    expect(page.get(tid('invite-description')).text()).toContain(
      'This invite has expired or was already used.',
    )
    expect(page.find(tid('invite-google')).exists()).toBe(false)
  })

  it('shows straight away while the invite and who is signed in load', async () => {
    const invite = holdRequest('GET', linkPath())
    const me = holdRequest('GET', '/api/me')

    const page = await open()

    expect(page.get(tid('invite-title')).text()).toBe("You're invited")
    expect(page.find(tid('invite-skeleton')).exists()).toBe(true)
    expect(page.find(tid('invite-description')).exists()).toBe(false)
    expect(page.find(tid('invite-google')).exists()).toBe(false)

    invite.release()
    await vi.waitFor(() => expect(byTestId('invite-skeleton')).not.toBeNull())
    me.release()

    await vi.waitFor(() =>
      expect(page.find(tid('invite-google')).exists()).toBe(true),
    )
    expect(page.get(tid('invite-description')).text()).toContain(
      'Sarah invited you to their shelf Home',
    )
    expect(page.find(tid('invite-skeleton')).exists()).toBe(false)
  })

  it('shows an error with a retry when the invite fails to load', async () => {
    const lift = failRequest('GET', linkPath(), {
      status: 403,
      message: 'Nope',
    })

    const page = await open()
    await vi.waitFor(() =>
      expect(page.find(tid('invite-error')).exists()).toBe(true),
    )
    expect(page.get(tid('invite-title')).text()).toBe("You're invited")
    expect(page.find(tid('invite-google')).exists()).toBe(false)

    lift()
    await page.get(tid('invite-retry')).trigger('click')

    await vi.waitFor(() =>
      expect(page.find(tid('invite-google')).exists()).toBe(true),
    )
    expect(page.find(tid('invite-error')).exists()).toBe(false)
  })
})
