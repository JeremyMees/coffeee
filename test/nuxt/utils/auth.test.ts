import { describe, expect, it } from 'vitest'
import { authErrorMessage } from '~/utils/auth'

describe('authErrorMessage', () => {
  it('explains the errors people run into', () => {
    expect(authErrorMessage({ code: 'INVITE_REQUIRED' })).toContain(
      'You need an invite to join Coffeee',
    )
    expect(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe(
      "That email and password don't match.",
    )
  })

  it('falls back to the message from the server', () => {
    expect(
      authErrorMessage({ code: 'PASSWORD_TOO_SHORT', message: 'Too short' }),
    ).toBe('Too short')
  })

  it('has something to say when the server says nothing', () => {
    expect(authErrorMessage({})).toBe('Something went wrong. Try again.')
  })
})
