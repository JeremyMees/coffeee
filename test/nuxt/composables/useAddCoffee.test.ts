import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAddCoffee, useAddCoffeeShortcut, useCurrentUser } from '#imports'
import { forgetLastShelf, runOn, setViewport, testUser } from '../fixtures'

describe('useAddCoffee', () => {
  it('is closed until something opens it', () => {
    clearNuxtState('add-coffee-open')

    expect(useAddCoffee().value).toBe(false)
  })

  it('is one sheet shared by every caller', () => {
    useAddCoffee().value = true

    expect(useAddCoffee().value).toBe(true)
  })
})

describe('useAddCoffeeShortcut', () => {
  beforeEach(() => {
    forgetLastShelf()
    setViewport(1280, 800)
    useCurrentUser().value = testUser()
    useAddCoffee().value = false
  })

  afterEach(() => {
    setViewport(1024, 768)
    document.body.replaceChildren()
  })

  function press(init: KeyboardEventInit = {}, target: EventTarget = window) {
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
      cancelable: true,
      ...init,
    })
    target.dispatchEvent(event)

    return event
  }

  it('opens add coffee on N', async () => {
    await runOn('/shelves/home', useAddCoffeeShortcut)

    const event = press()

    expect(useAddCoffee().value).toBe(true)
    expect(event.defaultPrevented).toBe(true)
  })

  it.each([{ metaKey: true }, { ctrlKey: true }, { altKey: true }])(
    'leaves N with %o to the browser',
    async modifier => {
      await runOn('/shelves/home', useAddCoffeeShortcut)

      const event = press(modifier)

      expect(useAddCoffee().value).toBe(false)
      expect(event.defaultPrevented).toBe(false)
    },
  )

  it('leaves an N typed into a field alone', async () => {
    await runOn('/shelves/home', useAddCoffeeShortcut)
    const input = document.createElement('input')
    document.body.append(input)

    press({}, input)

    expect(useAddCoffee().value).toBe(false)
  })

  it('waits while another dialog is open', async () => {
    await runOn('/shelves/home', useAddCoffeeShortcut)
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    document.body.append(dialog)

    press()

    expect(useAddCoffee().value).toBe(false)
  })

  it('does nothing on a phone', async () => {
    setViewport(375, 812)
    await runOn('/shelves/home', useAddCoffeeShortcut)

    press()

    expect(useAddCoffee().value).toBe(false)
  })
})
