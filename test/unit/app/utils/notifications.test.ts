import { describe, expect, it } from 'vitest'
import { notificationLink } from '~/utils/notifications'
import { notifications } from '#test/fixtures/notifications'

function notification(
  overrides: Partial<ReturnType<typeof notifications>[number]> = {},
) {
  return { ...notifications()[0]!, ...overrides }
}

describe('notificationLink', () => {
  it('links to the coffee on its shelf', () => {
    expect(notificationLink(notification())).toBe(
      '/shelves/sarahs-shelf-home/coffees/ayele-fulasa-c1',
    )
  })

  it('links to the members of the shelf when someone joins or leaves', () => {
    expect(
      notificationLink(
        notification({ kind: 'memberLeft', coffeeId: null, coffee: null }),
      ),
    ).toBe('/shelves/sarahs-shelf-home/settings?tab=members')
  })

  it('links an accepted invite to the shelf it joined', () => {
    expect(
      notificationLink(
        notification({
          kind: 'invited',
          coffeeId: null,
          coffee: null,
          inviteId: 'mi1',
          inviteStatus: 'accepted',
        }),
      ),
    ).toBe('/shelves/sarahs-shelf-home')
  })

  it('gives an unanswered invite no link, since it is answered in place', () => {
    expect(
      notificationLink(
        notification({
          kind: 'invited',
          coffeeId: null,
          coffee: null,
          inviteId: 'mi1',
          inviteStatus: 'pending',
        }),
      ),
    ).toBeNull()
  })
})
