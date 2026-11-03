import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'
import { byTestId, submit, tid, type } from '../../fixtures'

const server = vi.hoisted(() => ({
  role: 'admin',
  invites: [] as {
    id: string
    email: string | null
    expiresAt: string | null
  }[],
  revoked: [] as string[],
}))

registerEndpoint('/api/me', () => ({
  id: 'user-1',
  name: 'Jeremy',
  email: 'jeremy@example.com',
  image: null,
  role: server.role,
  shelves: [{ id: 'home', name: "Jeremy's shelf", ownerId: 'user-1' }],
}))

registerEndpoint('/api/invites', {
  method: 'GET',
  handler: () => server.invites,
})

registerEndpoint('/api/invites', {
  method: 'POST',
  handler: async event => {
    const body = await readBody(event)

    if (body.link) {
      return { id: 'link-1', url: 'http://localhost:3000/invite/the-token' }
    }

    if (body.email === 'tom@example.com') {
      const invite = { id: 'invite-3', email: body.email, expiresAt: null }
      server.invites.push(invite)

      return invite
    }

    if (body.email === 'broken@example.com') {
      throw createError({ statusCode: 500 })
    }

    throw createError({
      statusCode: 409,
      statusMessage: 'That email is already invited',
    })
  },
})

registerEndpoint('/api/invites/invite-1', {
  method: 'DELETE',
  handler: () => {
    server.revoked.push('invite-1')

    return null
  },
})

beforeEach(() => {
  useCurrentUser().value = null
  server.role = 'admin'
  server.invites = [
    { id: 'invite-1', email: 'sarah@example.com', expiresAt: null },
    { id: 'invite-2', email: null, expiresAt: '2026-11-09T10:00:00.000Z' },
  ]
  server.revoked = []
})

describe('admin invites page', () => {
  it('sends someone who is not an admin back home', async () => {
    server.role = 'user'

    await mountSuspended(App, { route: '/admin/invites' })

    expect(useRouter().currentRoute.value.path).toBe('/shelves/home')
  })

  it('lists pending invites and leads back to the admin page', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    expect(page.get(tid('page-title')).text()).toBe('Invites')
    expect(page.findAll(tid('invite'))[0]!.text()).toContain(
      'sarah@example.com',
    )
    expect(page.get(tid('admin-back')).attributes('href')).toBe('/admin')
  })

  it('says when nothing is pending', async () => {
    server.invites = []

    const page = await mountSuspended(App, { route: '/admin/invites' })

    expect(page.get(tid('invites-empty')).text()).toBe('No pending invites.')
  })

  it('shows when a link invite expires', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    expect(page.findAll(tid('invite'))[1]!.text()).toMatch(
      /Invite link\s*· expires Nov 9/,
    )
  })

  it('revokes a pending invite', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    await page.findAll(tid('invite-revoke'))[0]!.trigger('click')

    await vi.waitFor(() => expect(server.revoked).toEqual(['invite-1']))
  })

  it('allows an email from the button in the header and lists it as pending', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    expect(page.get(tid('page-add')).text()).toBe('Add invite')
    await page.get(tid('page-add')).trigger('click')
    await vi.waitFor(() => expect(byTestId('invite-email')).not.toBeNull())
    await type('invite-email', 'tom@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(page.get(tid('invites-pending')).text()).toContain(
        'tom@example.com',
      ),
    )
  })
})
