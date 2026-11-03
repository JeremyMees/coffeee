import { describe, expect, it } from 'vitest'
import { notificationLink, notificationText } from '#imports'
import { notifications } from '../fake-api'

function notification(
  overrides: Partial<ReturnType<typeof notifications>[number]> = {},
) {
  return { ...notifications()[0]!, ...overrides }
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

describe('notificationLink', () => {
  it('links to the coffee on its shelf', () => {
    expect(notificationLink(notification())).toBe('/shelves/home/coffees/c1')
  })

  it('links to the members of the shelf when someone joins or leaves', () => {
    expect(
      notificationLink(
        notification({ kind: 'memberLeft', coffeeId: null, coffee: null }),
      ),
    ).toBe('/shelves/home/settings')
  })

  it('links an invite to the app, where it can be answered', () => {
    expect(
      notificationLink(
        notification({ kind: 'invited', coffeeId: null, coffee: null }),
      ),
    ).toBe('/')
  })
})
