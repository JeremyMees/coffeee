import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FormSheet from '~/components/FormSheet.vue'
import { byTestId, setViewport } from '../fixtures'

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
  it('slides in from the right on desktop', async () => {
    setViewport(1280, 800)

    await mountSheet(true)

    expect(byTestId('a-sheet')!.dataset.side).toBe('right')
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

  it('asks to close from its close button', async () => {
    const sheet = await mountSheet(true)

    byTestId('a-sheet')!
      .querySelector<HTMLElement>('[data-slot="sheet-close"]')!
      .click()
    await flushPromises()

    expect(sheet.emitted('update:open')).toEqual([[false]])
  })
})
