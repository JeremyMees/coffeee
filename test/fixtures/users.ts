import type { ProfileStats } from '#shared/types/stats'
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

export function profileStats(): ProfileStats {
  return {
    bags: 12,
    grams: 3000,
    spentCents: 19800,
    rated: 9,
    averageRating: 4.2,
    wouldBuyAgain: 5,
    topRoaster: 'Square Mile',
  }
}
