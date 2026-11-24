import { getSessionCookie } from 'better-auth/cookies'
import { defineEventHandler, getRequestURL, sendRedirect } from 'h3'
import { isPublicPath, signInFor } from '#shared/utils/sign-in'

function rendersPage(path: string) {
  return !path.startsWith('/api/') && !path.startsWith('/_')
}

export default defineEventHandler(event => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return

  const { pathname, search } = getRequestURL(event)

  if (!rendersPage(pathname) || isPublicPath(pathname)) return
  if (getSessionCookie(event.headers)) return

  const { path, query } = signInFor(pathname + search)
  const params = new URLSearchParams(query).toString()

  return sendRedirect(event, params ? `${path}?${params}` : path, 302)
})
