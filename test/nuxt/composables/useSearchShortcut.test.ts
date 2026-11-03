import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser, useSearchFocus, useSearchShortcut } from '#imports'
import { currentPath, forgetLastShelf, runOn, testUser } from '../fixtures'

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  useSearchFocus().value = false
})

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    cancelable: true,
    ...init,
  })
  window.dispatchEvent(event)

  return event
}

describe('useSearchShortcut', () => {
  it.each([{ metaKey: true }, { ctrlKey: true }])(
    'opens Discover of the current shelf and asks for focus on %o',
    async modifier => {
      await runOn('/shelves/work/library', useSearchShortcut)

      const event = press(modifier)

      await vi.waitFor(() =>
        expect(currentPath()).toBe('/shelves/work/discover'),
      )
      expect(event.defaultPrevented).toBe(true)
      expect(useSearchFocus().value).toBe(true)
    },
  )

  it('leaves a plain k alone', async () => {
    await runOn('/shelves/work/library', useSearchShortcut)

    const event = press({})

    expect(event.defaultPrevented).toBe(false)
    expect(useSearchFocus().value).toBe(false)
  })
})
