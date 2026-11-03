import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import AddInviteSheet from '~/components/AddInviteSheet.vue'
import { byTestId, click, inputValue, submit, type } from '../fixtures'

const server = vi.hoisted(() => ({ invites: [] as unknown[] }))

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

beforeEach(() => {
  server.invites = []
})

function openSheet() {
  return mountSuspended(AddInviteSheet, {
    props: { open: true },
    attachTo: document.body,
  })
}

describe('AddInviteSheet', () => {
  it('allows an email and closes', async () => {
    const sheet = await openSheet()

    await type('invite-email', 'tom@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(server.invites).toEqual([
      expect.objectContaining({ email: 'tom@example.com' }),
    ])
  })

  it('explains an email that is not an email', async () => {
    await openSheet()

    await type('invite-email', 'not an email')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(byTestId('invite-email-form')?.textContent).toContain(
        'Enter a valid email',
      ),
    )
  })

  it('shows why an email could not be allowed', async () => {
    await openSheet()

    await type('invite-email', 'sarah@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(byTestId('invite-email-form')?.textContent).toContain(
        'That email is already invited',
      ),
    )
  })

  it('explains a failure the server gave no reason for', async () => {
    await openSheet()

    await type('invite-email', 'broken@example.com')
    await submit('invite-email-form')

    await vi.waitFor(() =>
      expect(byTestId('invite-email-form')?.textContent).toContain(
        'Something went wrong. Try again.',
      ),
    )
  })

  it('shows a new invite link to copy and stays open', async () => {
    const sheet = await openSheet()

    await click('invite-link-create')

    await vi.waitFor(() =>
      expect(inputValue('invite-link')).toBe(
        'http://localhost:3000/invite/the-token',
      ),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
  })

  it('copies a new invite link', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await openSheet()
    await click('invite-link-create')
    await vi.waitFor(() => expect(byTestId('invite-link-copy')).not.toBeNull())

    await click('invite-link-copy')

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'http://localhost:3000/invite/the-token',
      )
      expect(byTestId('invite-link-copy')?.getAttribute('aria-label')).toBe(
        'Copied',
      )
    })
    vi.unstubAllGlobals()
  })
})
