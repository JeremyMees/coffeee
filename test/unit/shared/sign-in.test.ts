import { describe, expect, it } from 'vitest'
import { isPublicPath, signInFor } from '#shared/utils/sign-in'

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
