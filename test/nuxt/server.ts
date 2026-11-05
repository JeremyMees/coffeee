import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createApp, createError, createRouter, eventHandler } from 'h3'
import type { EventHandler, H3Event, RouterMethod } from 'h3'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, resetTestDatabase } from '#test/support/database'
import { createScenario } from '#test/support/scenarios'
import type {
  Member,
  TestAuth,
  TestDatabase,
  TestWindow,
} from '#test/support/types'
import { useCurrentUser } from '#imports'
import { server } from '#test/nuxt/server-state'

let opening: Promise<{ db: TestDatabase; auth: TestAuth }> | undefined

export function database() {
  opening ??= (async () => {
    const { db } = await createTestDatabase()
    const auth = await createTestAuth(db)
    server.db = db
    server.auth = auth

    return { db, auth }
  })()

  return opening.then(({ db }) => db)
}

export const scenario = createScenario(database)

const handlers = import.meta.glob<EventHandler>('../../server/api/**/*.ts', {
  import: 'default',
})

const methods = /\.(get|post|patch|put|delete)$/

function routeOf(file: string) {
  const name = file.replace('../../server', '').replace(/\.ts$/, '')
  const path = name
    .replace(methods, '')
    .replace(/\/index$/, '')
    .replace(/\[\.\.\.\w+\]/g, '**')
    .replace(/\[(\w+)\]/g, ':$1')

  return { path, method: name.match(methods)?.[1] as RouterMethod | undefined }
}

function routes() {
  const router = createRouter()

  for (const [file, load] of Object.entries(handlers)) {
    const { path, method } = routeOf(file)
    const handler = eventHandler(async event => (await load())(event))

    if (method) router[method](path, handler)
    else router.use(path, handler)
  }

  return router
}

function registeredFor(window: TestWindow, event: H3Event) {
  const path = event.path.replace(/^\/_/, '').replace(/[?#].*$/, '')
  const registered = window.__app._registeredEndpointRegistry?.[path] ?? []

  return registered.some(
    config => !config.method || config.method === event.method,
  )
}

function installRoutes() {
  const window = globalThis.window as unknown as TestWindow
  if (window.__routesInstalled) return
  window.__routesInstalled = true
  const registered = window.__registry
  const has = registered.has.bind(registered)
  const app = createApp()
    .use(
      eventHandler(async event => {
        await database()
        if (server.cookie) event.headers.set('cookie', server.cookie)
      }),
    )
    .use(routes())

  registered.has = (url: string) => url.startsWith('/api/') || has(url)
  window.__app.use('/_', app.handler, {
    match: (_path, event) => !event || !registeredFor(window, event),
  })
}

export async function signIn(member: Member) {
  await database()
  const headers = await server.auth!.signIn(member.id)
  server.cookie = headers.get('cookie')!
  useCurrentUser().value = await $fetch('/api/me')
}

export function failRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  failure: {
    status: number
    message: string
    errors?: Record<string, string>
  },
) {
  server.failures.push(
    registerEndpoint(path, {
      method,
      handler: () => {
        throw createError({
          statusCode: failure.status,
          statusMessage: failure.message,
          data: failure.errors && { errors: failure.errors },
        })
      },
    }),
  )
}

export async function resetServer() {
  installRoutes()
  server.cookie = undefined
  server.outbox.length = 0
  server.failures.splice(0).forEach(unregister => unregister())
  await resetTestDatabase()
}
