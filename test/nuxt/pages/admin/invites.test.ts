import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import App from '~/app.vue'
import { useCurrentUser } from '#imports'

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

  it('lists pending invites', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    expect(page.text()).toContain('sarah@example.com')
  })

  it('allows an email and lists it as pending', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    await page.get('#invite-email').setValue('tom@example.com')
    await page.get('form').trigger('submit')

    await vi.waitFor(() => {
      expect(page.text()).toContain('tom@example.com')
      expect(page.get<HTMLInputElement>('#invite-email').element.value).toBe('')
    })
  })

  it('shows why an email could not be allowed', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    await page.get('#invite-email').setValue('sarah@example.com')
    await page.get('form').trigger('submit')
    await flushPromises()

    expect(page.text()).toContain('That email is already invited')
  })

  it('shows a new invite link to copy', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    const create = page.findAll('button').find(button => {
      return button.text() === 'Create a link'
    })
    await create!.trigger('click')

    await vi.waitFor(() => {
      const link = page.get<HTMLInputElement>('input[aria-label="Invite link"]')
      expect(link.element.value).toBe('http://localhost:3000/invite/the-token')
    })
  })

  it('revokes a pending invite', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    const revoke = page.findAll('button').find(button => {
      return button.text() === 'Revoke'
    })
    await revoke!.trigger('click')

    await vi.waitFor(() => expect(server.revoked).toEqual(['invite-1']))
  })

  it('shows when a link invite expires', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    expect(page.text()).toMatch(/Invite link\s*· expires Nov 9/)
  })

  it('explains a failure the server gave no reason for', async () => {
    const page = await mountSuspended(App, { route: '/admin/invites' })

    await page.get('#invite-email').setValue('broken@example.com')
    await page.get('form').trigger('submit')

    await vi.waitFor(() =>
      expect(page.text()).toContain('Something went wrong. Try again.'),
    )
  })

  it('copies a new invite link', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const page = await mountSuspended(App, { route: '/admin/invites' })
    const create = page.findAll('button').find(button => {
      return button.text() === 'Create a link'
    })
    await create!.trigger('click')
    await vi.waitFor(() => page.get('button[aria-label="Copy link"]'))

    await page.get('button[aria-label="Copy link"]').trigger('click')

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'http://localhost:3000/invite/the-token',
      )
      expect(page.find('button[aria-label="Copied"]').exists()).toBe(true)
    })
    vi.unstubAllGlobals()
  })
})
