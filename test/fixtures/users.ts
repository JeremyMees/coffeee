import type { CurrentUser } from '~/types/users'

export function testUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 'user-1',
    name: 'Sarah',
    email: 'sarah@example.com',
    image: null,
    role: 'user',
    shelves: [
      { id: 'home', name: "Sarah's shelf", ownerId: 'user-1' },
      { id: 'work', name: 'Work', ownerId: 'user-2' },
    ],
    ...overrides,
  }
}
