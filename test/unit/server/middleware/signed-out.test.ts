import { createApp, eventHandler, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import signedOut from '#server/middleware/signed-out'

function visit(path: string, init: RequestInit = {}) {
  const app = createApp()
    .use(signedOut)
    .use(eventHandler(() => 'rendered'))

  return toWebHandler(app)(new Request(`http://localhost${path}`, init))
}

describe('signed-out page requests', () => {
  it('are sent to sign in before the page renders', async () => {
    const response = await visit('/admin/invites?tab=open')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      '/sign-in?redirect=%2Fadmin%2Finvites%3Ftab%3Dopen',
    )
  })

  it('go to sign in without a redirect from the home page', async () => {
    const response = await visit('/')

    expect(response.headers.get('location')).toBe('/sign-in')
  })

  it('send scanners probing unknown paths to sign in', async () => {
    const response = await visit('/wp-admin/install.php?step=1')

    expect(response.status).toBe(302)
  })

  it.each([
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password?token=t',
    '/invite/a-token',
    '/api/me',
    '/_vercel/ping',
  ])('leave %s alone', async path => {
    const response = await visit(path)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('rendered')
  })

  it('leave other methods alone', async () => {
    const response = await visit('/share', { method: 'POST' })

    expect(response.status).toBe(200)
  })
})

describe('page requests with a session cookie', () => {
  it.each([
    'better-auth.session_token=token',
    '__Secure-better-auth.session_token=token',
  ])('render with %s', async cookie => {
    const response = await visit('/notifications', { headers: { cookie } })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('rendered')
  })
})
