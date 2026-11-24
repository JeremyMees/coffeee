const publicPaths = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/invite/',
]

export function isPublicPath(path: string) {
  return publicPaths.some(publicPath => path.startsWith(publicPath))
}

export function signInFor(fullPath: string): {
  path: string
  query: Record<string, string>
} {
  return {
    path: '/sign-in',
    query: fullPath === '/' ? {} : { redirect: fullPath },
  }
}

export const sessionCookie = '__Secure-better-auth.session_token'

const skippedOnTheEdge = [
  'api/',
  '_',
  ...publicPaths.map(path => path.slice(1)),
]

export function signedOutEdgeRoutes() {
  const signedOut = [{ type: 'cookie', key: sessionCookie }]

  return [
    {
      src: '^/$',
      missing: signedOut,
      status: 302,
      headers: { Location: '/sign-in' },
    },
    {
      src: `^/((?!${skippedOnTheEdge.join('|')})[^.]+)$`,
      missing: signedOut,
      status: 302,
      headers: { Location: '/sign-in?redirect=/$1' },
    },
    {
      src: '^/.+\\.php$',
      missing: signedOut,
      status: 302,
      headers: { Location: '/sign-in' },
    },
  ]
}
