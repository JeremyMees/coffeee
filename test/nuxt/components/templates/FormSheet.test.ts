import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineAsyncComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FormSheet from '~/components/templates/FormSheet.vue'
import { byTestId, setViewport } from '../../fixtures'

function mountSheet(open: boolean) {
  return mountSuspended(FormSheet, {
    props: { title: 'Add coffee', description: 'A coffee you bought.', open },
    attrs: { 'data-testid': 'a-sheet' },
    slots: { default: () => 'The form' },
    attachTo: document.body,
  })
}

afterEach(() => {
  setViewport(1024, 768)
})

describe('FormSheet', () => {
  it('opens as a dialog in the middle on desktop', async () => {
    setViewport(1280, 800)

    await mountSheet(true)

    expect(byTestId('a-sheet')!.dataset.slot).toBe('dialog-content')
    expect(byTestId('form-sheet-handle')!.className).not.toContain('touch-none')
  })

  it('slides up from the bottom on phones', async () => {
    setViewport(375, 812)

    await mountSheet(true)

    expect(byTestId('a-sheet')!.dataset.side).toBe('bottom')
  })

  it('shows its title, description and content when open', async () => {
    await mountSheet(true)

    expect(byTestId('form-sheet-title')!.textContent?.trim()).toBe('Add coffee')
    expect(byTestId('form-sheet-description')!.textContent?.trim()).toBe(
      'A coffee you bought.',
    )
    expect(byTestId('a-sheet')!.textContent).toContain('The form')
  })

  it('shows nothing while closed', async () => {
    await mountSheet(false)

    expect(byTestId('a-sheet')).toBeNull()
  })

  it('shows a skeleton until a form that loads later is there', async () => {
    let load!: () => void
    const LaterForm = defineAsyncComponent(
      () =>
        new Promise<() => ReturnType<typeof h>>(resolve => {
          load = () => resolve(() => h('p', 'The form'))
        }),
    )
    await mountSuspended(FormSheet, {
      props: { title: 'Add coffee', description: 'A coffee.', open: true },
      attrs: { 'data-testid': 'a-sheet' },
      slots: { default: () => h(LaterForm) },
      attachTo: document.body,
    })

    expect(byTestId('form-sheet-skeleton')).not.toBeNull()
    expect(byTestId('a-sheet')!.textContent).not.toContain('The form')

    load()

    await vi.waitFor(() =>
      expect(byTestId('a-sheet')!.textContent).toContain('The form'),
    )
    expect(byTestId('form-sheet-skeleton')).toBeNull()
  })

  it('asks to close from its close button', async () => {
    const sheet = await mountSheet(true)

    byTestId('a-sheet')!
      .querySelector<HTMLElement>('[data-testid="form-sheet-close"]')!
      .click()
    await flushPromises()

    expect(sheet.emitted('update:open')).toEqual([[false]])
  })
})

describe('FormSheet on a phone', () => {
  function drag(distance: number) {
    const handle = byTestId('form-sheet-handle')!
    const pointer = { pointerId: 1, pointerType: 'touch', buttons: 1 }

    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        ...pointer,
        clientX: 100,
        clientY: 100,
      }),
    )
    handle.dispatchEvent(
      new PointerEvent('pointermove', {
        ...pointer,
        clientX: 100,
        clientY: 100 + distance,
      }),
    )
  }

  function letGo(distance: number) {
    byTestId('form-sheet-handle')!.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100 + distance,
      }),
    )
  }

  it('follows a finger dragging it down', async () => {
    setViewport(375, 812)
    await mountSheet(true)

    drag(60)
    await flushPromises()

    expect(byTestId('a-sheet')!.style.transform).toBe('translateY(60px)')
  })

  it('closes when dragged far enough down', async () => {
    setViewport(375, 812)
    const sheet = await mountSheet(true)

    drag(160)
    letGo(160)
    await flushPromises()

    expect(sheet.emitted('update:open')).toEqual([[false]])
  })

  it('springs back when let go too early', async () => {
    setViewport(375, 812)
    const sheet = await mountSheet(true)

    drag(40)
    letGo(40)
    await flushPromises()

    expect(sheet.emitted('update:open')).toBeUndefined()
    expect(byTestId('a-sheet')!.style.transform).toBe('')
  })
})
