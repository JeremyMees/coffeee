import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { ListEntry, OriginListEntry } from '#shared/types/catalog'
import { nameKey } from '#imports'
import { flavorNoteEntries, otherAdminEntries } from '#test/fixtures/admin'
import { ayele } from '#test/fixtures/coffees'
import { opus } from '#test/fixtures/grinders'
import {
  coffeeShelves,
  ownedShelves,
  shelfInvites,
  shelfMembers,
} from '#test/fixtures/shelves'
import type { notifications } from '#test/fixtures/notifications'
import { profileStats } from '#test/fixtures/users'
import { server } from '#test/nuxt/server-state'

export function fakeList<Entry extends ListEntry>(entries: () => Entry[]) {
  return (event: H3Event) => {
    const key = nameKey(String(getQuery(event).search ?? ''))

    return entries().filter(entry => nameKey(entry.name).includes(key))
  }
}

export function fakeRegions(regions: () => OriginListEntry[]) {
  return (event: H3Event) => {
    const origins = String(getQuery(event).origins ?? '').split(',')

    return fakeList(regions)(event).filter(region =>
      origins.includes(region.origin),
    )
  }
}

export const api = {
  ownedShelves: ownedShelves(),
  profileStats: profileStats(),
  profileRenames: [] as unknown[],
  notifications: [] as ReturnType<typeof notifications>,
  notificationCalls: [] as unknown[],
  notificationEmails: [] as OptionalEmailKind[],
  notificationEmailsFail: false,
  shelfMembers: shelfMembers(),
  shelfCalls: [] as unknown[],
  shelfFails: '',
  shelfInvites: shelfInvites(),
  inviteCalls: [] as unknown[],
  inviteFails: '',
  accountDeletes: [] as unknown[],
  accountDeleteFails: '',
  shelves: [] as string[],
  grinders: [opus()] as OwnedGrinder[],
  grinderCalls: [] as unknown[],
  grinderFails: false,
  roasterFails: false,
  adminEntries: flavorNoteEntries(),
  adminQueries: [] as Record<string, string>[],
  adminCalls: [] as unknown[],
  adminFails: '',
}

export function resetApi() {
  api.ownedShelves = ownedShelves()
  api.profileStats = profileStats()
  api.profileRenames = []
  api.notifications = []
  api.notificationCalls = []
  api.notificationEmails = []
  api.notificationEmailsFail = false
  api.shelfMembers = shelfMembers()
  api.shelfCalls = []
  api.shelfFails = ''
  api.shelfInvites = shelfInvites()
  api.inviteCalls = []
  api.inviteFails = ''
  api.accountDeletes = []
  api.accountDeleteFails = ''
  api.shelves = []
  api.grinders = [opus()]
  api.grinderCalls = []
  api.grinderFails = false
  api.roasterFails = false
  api.adminEntries = flavorNoteEntries()
  api.adminQueries = []
  api.adminCalls = []
  api.adminFails = ''
}

function failAdmin() {
  if (api.adminFails) {
    throw createError({ statusCode: 409, statusMessage: api.adminFails })
  }
}

function fakeAdminEntries(event: H3Event) {
  const query = getQuery(event) as Record<string, string>
  api.adminQueries.push(query)
  const key = nameKey(query.search ?? '')
  const found = api.adminEntries.filter(
    entry => entry.id !== query.except && nameKey(entry.name).includes(key),
  )

  return { total: found.length, entries: found }
}

function registerAdminEndpoints() {
  registerEndpoint('/api/roasters/new-3/logo', {
    method: 'PUT',
    handler: () => {
      api.adminCalls.push({ logo: 'new-3' })

      if (api.roasterFails) {
        throw createError({
          statusCode: 413,
          statusMessage: 'That photo is too large',
        })
      }

      return { logoUrl: '/api/photos/roasters/new.webp' }
    },
  })

  const path = '/api/admin/lists/flavorNotes'

  registerEndpoint(path, { method: 'GET', handler: fakeAdminEntries })

  for (const list of [
    'flavorNotes',
    'coffees',
    'roasters',
    'regions',
    'grinders',
  ]) {
    if (list !== 'flavorNotes') {
      registerEndpoint(`/api/admin/lists/${list}`, {
        method: 'GET',
        handler: () => {
          const entries = otherAdminEntries[list] ?? []

          return { total: entries.length, entries }
        },
      })
    }

    registerEndpoint(`/api/admin/lists/${list}`, {
      method: 'POST',
      handler: async event => {
        const body = await readBody(event)
        api.adminCalls.push({ add: list, body })
        failAdmin()
        const field = 'model' in body ? 'model' : 'name'

        if (body[field] === 'Taken') {
          throw createError({
            statusCode: 409,
            statusMessage: 'Taken is already on the list',
            data: { errors: { [field]: 'Taken is already on the list' } },
          })
        }

        const added = {
          id: `new-${api.adminEntries.length}`,
          name: body[field],
          detail: null,
          detailId: null,
          uses: 0,
        }

        if (list === 'flavorNotes') {
          api.adminEntries = [...api.adminEntries, added]
        }

        return { id: added.id, name: added.name }
      },
    })
  }

  for (const id of ['n1', 'n2', 'n3']) {
    registerEndpoint(`${path}/${id}`, {
      method: 'PATCH',
      handler: async event => {
        const body = await readBody(event)
        const { name } = body
        api.adminCalls.push({ update: id, body })
        failAdmin()
        api.adminEntries = api.adminEntries.map(entry =>
          entry.id === id ? { ...entry, name } : entry,
        )

        return { id, name }
      },
    })

    registerEndpoint(`${path}/${id}/merge`, {
      method: 'POST',
      handler: async event => {
        const { intoId } = await readBody(event)
        api.adminCalls.push({ merge: id, intoId })
        failAdmin()
        const from = api.adminEntries.find(entry => entry.id === id)!
        api.adminEntries = api.adminEntries
          .filter(entry => entry.id !== id)
          .map(entry =>
            entry.id === intoId
              ? { ...entry, uses: entry.uses + from.uses }
              : entry,
          )

        return api.adminEntries.find(entry => entry.id === intoId)
      },
    })

    registerEndpoint(`${path}/${id}`, {
      method: 'DELETE',
      handler: () => {
        api.adminCalls.push({ delete: id })
        failAdmin()
        api.adminEntries = api.adminEntries.filter(entry => entry.id !== id)

        return null
      },
    })
  }
}

function failInvite() {
  if (api.inviteFails) {
    throw createError({ statusCode: 409, statusMessage: api.inviteFails })
  }
}

function registerInviteEndpoints() {
  registerEndpoint('/api/shelves/home/invites', {
    method: 'GET',
    handler: () => api.shelfInvites,
  })

  registerEndpoint('/api/shelves/home/invites', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)
      api.inviteCalls.push({ invite: body })
      failInvite()

      const created = {
        id: `i${api.shelfInvites.length + 1}`,
        email: body.email,
        invitedBy: 'Sarah',
        createdAt: '2026-11-03T10:00:00.000Z',
        expiresAt: '2026-11-10T10:00:00.000Z',
      }
      api.shelfInvites = [created, ...api.shelfInvites]

      return created
    },
  })

  registerEndpoint('/api/shelves/home/invites/i1', {
    method: 'DELETE',
    handler: () => {
      api.inviteCalls.push({ cancel: 'i1' })
      api.shelfInvites = api.shelfInvites.filter(found => found.id !== 'i1')

      return null
    },
  })

  registerEndpoint('/api/me/invites/mi1/accept', {
    method: 'POST',
    handler: () => {
      api.inviteCalls.push({ accept: 'mi1' })
      failInvite()
      api.notifications = api.notifications.map(found =>
        found.inviteId === 'mi1'
          ? { ...found, inviteStatus: 'accepted' as InviteStatus }
          : found,
      )

      return { id: 'office', name: 'Office', ownerId: 'tom' }
    },
  })

  registerEndpoint('/api/me/invites/mi1/decline', {
    method: 'POST',
    handler: () => {
      api.inviteCalls.push({ decline: 'mi1' })
      failInvite()
      api.notifications = api.notifications.filter(
        found => found.inviteId !== 'mi1',
      )

      return null
    },
  })
}

function failShelf() {
  if (api.shelfFails) {
    throw createError({ statusCode: 409, statusMessage: api.shelfFails })
  }
}

function registerShelfEndpoints() {
  registerEndpoint('/api/shelves/home/members', () => api.shelfMembers)

  registerEndpoint('/api/shelves/home', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)
      api.shelfCalls.push({ rename: body })
      failShelf()

      return { id: 'home', name: body.name, ownerId: 'user-1' }
    },
  })

  registerEndpoint('/api/shelves/home', {
    method: 'DELETE',
    handler: () => {
      api.shelfCalls.push({ delete: 'home' })
      failShelf()

      return null
    },
  })

  registerEndpoint('/api/shelves/home/members/tom', {
    method: 'DELETE',
    handler: () => {
      api.shelfCalls.push({ remove: 'tom' })
      failShelf()
      api.shelfMembers = api.shelfMembers.filter(found => found.id !== 'tom')

      return null
    },
  })

  registerEndpoint('/api/shelves/home/owner', {
    method: 'PUT',
    handler: async event => {
      const body = await readBody(event)
      api.shelfCalls.push({ handOver: body })
      failShelf()

      return { id: 'home', name: "Sarah's shelf", ownerId: body.ownerId }
    },
  })

  registerEndpoint('/api/shelves/home/leave', {
    method: 'POST',
    handler: () => {
      api.shelfCalls.push({ leave: 'home' })
      failShelf()

      return null
    },
  })
}

function registerNotificationEndpoints() {
  registerEndpoint('/api/me/notifications', () => api.notifications)

  registerEndpoint('/api/me/notifications/unread', () => ({
    unread: api.notifications.filter(found => !found.readAt).length,
  }))

  registerEndpoint('/api/me/notifications/read', {
    method: 'POST',
    handler: () => {
      api.notificationCalls.push('read')
      api.notifications = api.notifications.map(found => ({
        ...found,
        readAt: found.readAt ?? '2026-11-03T10:00:00.000Z',
      }))

      return null
    },
  })

  registerEndpoint('/api/me/notifications/emails', () => ({
    emailed: api.notificationEmails,
  }))

  registerEndpoint('/api/me/notifications/emails', {
    method: 'PUT',
    handler: async event => {
      const body = await readBody(event)
      api.notificationCalls.push({ emails: body })

      if (api.notificationEmailsFail) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Your settings are out of reach',
        })
      }

      api.notificationEmails = body.emailed

      return { emailed: api.notificationEmails }
    },
  })
}

export function fakeApi() {
  server.fakeOnly = true
  registerAdminEndpoints()
  registerNotificationEndpoints()
  registerInviteEndpoints()
  registerShelfEndpoints()

  registerEndpoint('/api/me/owned-shelves', () => api.ownedShelves)
  registerEndpoint('/api/me/stats', () => api.profileStats)

  registerEndpoint('/api/me', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)
      api.profileRenames.push(body)

      return { name: body.name }
    },
  })

  registerEndpoint('/api/me', {
    method: 'DELETE',
    handler: async event => {
      api.accountDeletes.push(await readBody(event))

      if (api.accountDeleteFails) {
        throw createError({
          statusCode: 409,
          statusMessage: api.accountDeleteFails,
        })
      }

      return null
    },
  })

  registerEndpoint('/api/shelves', {
    method: 'POST',
    handler: async event => {
      const { name } = await readBody(event)
      api.shelves.push(name)

      if (name === 'Broken') {
        throw createError({
          statusCode: 409,
          statusMessage: 'That shelf could not be made',
        })
      }

      return { id: 'garage', name, ownerId: 'user-1' }
    },
  })

  registerEndpoint('/api/coffees/c1', {
    method: 'GET',
    handler: () => {
      const { purchases, ...shared } = ayele()

      return { ...shared, shelves: coffeeShelves() }
    },
  })

  registerEndpoint('/api/roasters/r2', {
    method: 'GET',
    handler: () => ayele().roasterDetails,
  })

  registerEndpoint(
    '/api/roasters',
    fakeList(() => [
      { id: 'r1', name: 'La Cabra' },
      { id: 'r2', name: 'Square Mile' },
    ]),
  )

  registerEndpoint(
    '/api/regions',
    fakeRegions(() => [
      { id: 'g1', name: 'Guji', origin: 'ET' },
      { id: 'h1', name: 'Huila', origin: 'CO' },
    ]),
  )

  registerEndpoint(
    '/api/farms',
    fakeRegions(() => [{ id: 'f1', name: 'La Palma', origin: 'CO' }]),
  )

  registerEndpoint(
    '/api/washing-stations',
    fakeRegions(() => [{ id: 'w1', name: 'Hambela', origin: 'ET' }]),
  )

  registerEndpoint(
    '/api/producers',
    fakeList(() => [
      { id: 'n1', name: 'Nestor Lasso' },
      { id: 'n2', name: 'Diego Bermudez' },
    ]),
  )

  registerEndpoint(
    '/api/processes',
    fakeList(() => [
      { id: 's1', name: 'Washed' },
      { id: 's2', name: 'Natural' },
      { id: 's3', name: 'Anaerobic' },
    ]),
  )

  registerEndpoint(
    '/api/varietals',
    fakeList(() => [
      { id: 'v1', name: 'Geisha' },
      { id: 'v2', name: 'Pink Bourbon' },
    ]),
  )

  registerEndpoint(
    '/api/flavor-notes',
    fakeList(() => [
      { id: 'n1', name: 'Lime' },
      { id: 'n2', name: 'Jasmine' },
    ]),
  )

  registerEndpoint('/api/shelves/home/grinders', {
    method: 'GET',
    handler: () => api.grinders,
  })

  registerEndpoint('/api/shelves/home/grinders', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)
      api.grinderCalls.push({ own: body })

      if (api.grinderFails) {
        throw createError({
          statusCode: 500,
          statusMessage: 'The grinder could not be added',
        })
      }

      const owned = { id: `g${api.grinders.length + 1}`, ...body }
      api.grinders = [...api.grinders, owned]

      return owned
    },
  })

  registerEndpoint('/api/shelves/home/grinders/opus', {
    method: 'DELETE',
    handler: () => {
      api.grinderCalls.push({ disown: 'opus' })

      if (api.grinderFails) {
        throw createError({
          statusCode: 404,
          statusMessage: 'This shelf does not own that grinder',
        })
      }

      api.grinders = api.grinders.filter(owned => owned.id !== 'opus')

      return { id: 'opus' }
    },
  })

  registerEndpoint(
    '/api/grinder-brands',
    fakeList(() => [
      { id: 'b1', name: 'Fellow' },
      { id: 'b2', name: 'Niche' },
    ]),
  )

  registerEndpoint('/api/grinders', event => {
    const models: Record<string, ListEntry[]> = {
      fellow: [
        { id: 'opus', name: 'Opus Gen 2' },
        { id: 'ode', name: 'Ode Gen 2' },
      ],
    }

    return fakeList(
      () => models[nameKey(String(getQuery(event).brand ?? ''))] ?? [],
    )(event)
  })
}
