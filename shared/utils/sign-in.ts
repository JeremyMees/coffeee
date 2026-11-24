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
