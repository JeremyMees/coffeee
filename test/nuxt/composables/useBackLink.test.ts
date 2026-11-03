import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBackLink, useCurrentUser, useRouter } from '#imports'
import { forgetLastShelf, runOn, testUser } from '../fixtures'

const stock = { label: 'Stock', to: '/shelves/work' }

function cameFrom(back: string | null) {
  window.history.replaceState({ ...window.history.state, back }, '')
}

beforeEach(() => {
  forgetLastShelf()
  useCurrentUser().value = testUser()
  cameFrom(null)
})

async function backLink() {
  const back = await runOn('/shelves/work/coffees/c1', () => useBackLink(stock))
  await flushPromises()

  return back
}

function clickWith(init: MouseEventInit = {}) {
  return new MouseEvent('click', { cancelable: true, ...init })
}

describe('useBackLink', () => {
  it('falls back when there is no page to go back to', async () => {
    const { link } = await backLink()

    expect(link.value).toEqual(stock)
  })

  it.each([
    ['/shelves/work/library?favourites=true', 'Library'],
    ['/shelves/work/discover?q=kenya&sort=communityRating', 'Discover'],
    ['/shelves/work', 'Stock'],
    ['/roasters', 'Roasters'],
    ['/roasters/r1', 'Roaster'],
    ['/coffees/c1', 'Coffee'],
    ['/shelves/home/coffees/c1', 'Coffee'],
  ])('leads back to %s as it was', async (back, label) => {
    cameFrom(back)

    const { link } = await backLink()

    expect(link.value).toEqual({ label, to: back })
  })

  it('falls back when the previous page is not a list', async () => {
    cameFrom('/sign-in')

    const { link } = await backLink()

    expect(link.value).toEqual(stock)
  })

  it('goes back in history so the list keeps its scroll position', async () => {
    cameFrom('/shelves/work/library')
    const { back } = await backLink()
    const historyBack = vi
      .spyOn(useRouter(), 'back')
      .mockImplementation(() => {})
    const event = clickWith()

    back(event)

    expect(event.defaultPrevented).toBe(true)
    expect(historyBack).toHaveBeenCalledOnce()
    historyBack.mockRestore()
  })

  it('lets a modified click open the list in a new tab', async () => {
    cameFrom('/shelves/work/library')
    const { back } = await backLink()
    const event = clickWith({ metaKey: true })

    back(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('follows the link when it falls back', async () => {
    const { back } = await backLink()
    const event = clickWith()

    back(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
