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

const handlers: Record<string, () => Promise<EventHandler>> = import.meta.glob(
  '../../server/api/**/*.ts',
  { import: 'default' },
)

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

function pathOf(event: H3Event) {
  return event.path.replace(/^\/_/, '').replace(/[?#].*$/, '')
}

function registeredFor(window: TestWindow, event: H3Event) {
  const path = pathOf(event)
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
        const held = server.holds.find(
          hold => hold.method === event.method && hold.path === pathOf(event),
        )
        if (held) await held.gate
        if (server.cookie) event.headers.set('cookie', server.cookie)
      }),
    )
    .use(routes())

  const tracked = eventHandler(event => {
    const handled = Promise.resolve(app.handler(event))
    server.inFlight.add(handled)

    return handled.finally(() => server.inFlight.delete(handled))
  })

  registered.has = (url: string) => url.startsWith('/api/') || has(url)
  window.__app.use('/_', tracked, {
    match: (_path, event) => !event || !registeredFor(window, event),
  })
}

export async function signIn(member: Member) {
  await database()
  const headers = await server.auth!.signIn(member.id)
  server.cookie = headers.get('cookie')!
  useCurrentUser().value = await $fetch('/api/me')
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export function holdRequest(method: Method, path: string) {
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  server.holds.push({ method, path, gate, release })

  return { release }
}

export function releaseHeldRequests() {
  server.holds.splice(0).forEach(hold => hold.release())
}

export function failRequest(
  method: Method,
  path: string,
  failure: {
    status: number
    message: string
    errors?: Record<string, string>
  },
) {
  let lifted = false
  const unregister = registerEndpoint(path, {
    method,
    handler: () => {
      throw createError({
        statusCode: failure.status,
        statusMessage: failure.message,
        data: failure.errors && { errors: failure.errors },
      })
    },
  })
  const lift = () => {
    if (lifted) return
    lifted = true
    unregister()
  }
  server.failures.push(lift)

  return lift
}

export async function settleRequests() {
  while (server.inFlight.size) {
    await Promise.allSettled([...server.inFlight])
  }
}

export async function resetServer() {
  installRoutes()
  await settleRequests()
  server.cookie = undefined
  server.outbox.length = 0
  server.failures.splice(0).forEach(unregister => unregister())
  await resetTestDatabase()
}
