import { describe, expect, it } from 'vitest'
import { notificationText } from '#shared/utils/notifications'

function notification(
  overrides: Partial<Parameters<typeof notificationText>[0]> = {},
) {
  return {
    kind: 'coffeeAdded' as const,
    actor: 'Tom',
    shelf: "Sarah's shelf",
    coffee: 'Ayele Fulasa',
    ...overrides,
  }
}

describe('notificationText', () => {
  it.each([
    ['invited', 'Tom invited you to Home'],
    ['coffeeAdded', 'Tom added Ayele Fulasa to Home'],
    ['purchaseAdded', 'Tom added a bag of Ayele Fulasa to Home'],
    ['bagFinished', 'Tom finished a bag of Ayele Fulasa on Home'],
    ['memberJoined', 'Tom joined Home'],
    ['memberLeft', 'Tom left Home'],
  ] as const)('says who did what on which shelf: %s', (kind, text) => {
    expect(notificationText(notification({ kind, shelf: 'Home' }))).toBe(text)
  })

  it('says someone when the person deleted their account', () => {
    expect(notificationText(notification({ actor: null }))).toBe(
      "Someone added Ayele Fulasa to Sarah's shelf",
    )
  })
})
