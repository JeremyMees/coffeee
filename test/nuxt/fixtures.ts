import type { CurrentUser } from '~/composables/useCurrentUser'

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

export function forgetLastShelf() {
  document.cookie = 'shelf=; max-age=0; path=/'
}
