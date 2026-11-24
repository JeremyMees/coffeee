import { describe, expect, it } from 'vitest'
import {
  isPublicPath,
  sessionCookie,
  signedOutEdgeRoutes,
  signInFor,
} from '#shared/utils/sign-in'

describe('isPublicPath', () => {
  it.each(['/sign-in', '/sign-up', '/forgot-password', '/invite/token'])(
    'lets %s through without signing in',
    path => expect(isPublicPath(path)).toBe(true),
  )

  it.each(['/', '/notifications', '/invite'])('asks to sign in for %s', path =>
    expect(isPublicPath(path)).toBe(false),
  )
})

describe('signInFor', () => {
  it('brings people back to the page they asked for', () => {
    expect(signInFor('/notifications?x=1')).toEqual({
      path: '/sign-in',
      query: { redirect: '/notifications?x=1' },
    })
  })

  it('leaves out the redirect for the home page', () => {
    expect(signInFor('/')).toEqual({ path: '/sign-in', query: {} })
  })
})

function edgeRedirectFor(path: string) {
  const route = signedOutEdgeRoutes().find(({ src }) =>
    new RegExp(src).test(path),
  )

  if (!route) return null

  return route.headers.Location.replace(
    '$1',
    new RegExp(route.src).exec(path)?.[1] ?? '',
  )
}

describe('signedOutEdgeRoutes', () => {
  it.each([
    ['/', '/sign-in'],
    ['/notifications', '/sign-in?redirect=/notifications'],
    [
      '/shelves/home-ab12/library',
      '/sign-in?redirect=/shelves/home-ab12/library',
    ],
    ['/wp-admin/install.php', '/sign-in'],
    ['/xmlrpc.php', '/sign-in'],
  ])('sends signed-out visitors from %s to %s', (path, location) => {
    expect(edgeRedirectFor(path)).toBe(location)
  })

  it.each([
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/invite/a-token',
    '/api/me',
    '/_nuxt/entry.js',
    '/_vercel/insights/script.js',
    '/sw.js',
    '/robots.txt',
    '/manifest.webmanifest',
    '/favicon.ico',
  ])('lets %s through', path => {
    expect(edgeRedirectFor(path)).toBeNull()
  })

  it('only redirects visitors without the session cookie', () => {
    for (const route of signedOutEdgeRoutes()) {
      expect(route.missing).toEqual([{ type: 'cookie', key: sessionCookie }])
    }
  })
})
