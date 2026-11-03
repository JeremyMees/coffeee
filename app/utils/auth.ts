const authMessages: Record<string, string> = {
  INVITE_REQUIRED:
    'You need an invite to join Coffeee. Ask an admin, or open the invite link you were sent.',
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match.",
  INVALID_TOKEN: 'This link has expired or was already used.',
}

export function authErrorMessage(error: AuthFailure) {
  return (
    (error.code && authMessages[error.code]) ||
    error.message ||
    'Something went wrong. Try again.'
  )
}
