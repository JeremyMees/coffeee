import type { ListEntry } from '#shared/types/catalog'

export function coffeeShelves() {
  return [
    { id: 'home', name: "Sarah's shelf", bags: 2, inStock: 1 },
    { id: 'work', name: 'Work', bags: 0, inStock: 0 },
  ]
}

export function ownedShelves() {
  return [
    { id: 'solo', name: "Sarah's shelf", members: [] as ListEntry[] },
    {
      id: 'home',
      name: 'Home',
      members: [
        { id: 'tom', name: 'Tom' },
        { id: 'lisa', name: 'Lisa' },
      ],
    },
  ]
}

export function shelfInvites() {
  return [
    {
      id: 'i1',
      email: 'anna@example.com',
      invitedBy: 'Sarah',
      createdAt: '2026-11-01T10:00:00.000Z',
      expiresAt: '2026-11-08T10:00:00.000Z',
    },
  ]
}

export function shelfMembers() {
  return [
    {
      id: 'user-1',
      name: 'Sarah',
      email: 'sarah@example.com',
      image: null as string | null,
      joinedAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'tom',
      name: 'Tom',
      email: 'tom@example.com',
      image: null as string | null,
      joinedAt: '2026-10-02T10:00:00.000Z',
    },
  ]
}
