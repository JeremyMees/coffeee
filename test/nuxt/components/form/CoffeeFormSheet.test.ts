import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeFormSheet from '~/components/form/CoffeeFormSheet.vue'
import { shelfPath } from '#imports'
import type { Member } from '#test/support/types'
import {
  byTestId,
  chipLabels,
  click,
  currentPath,
  inputValue,
  isChecked,
  pickMulti,
  pickOrigin,
  pickRoaster,
  submit,
  type,
} from '../../fixtures'
import { failRequest, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await scenario.roaster(sarah, 'Square Mile')
  await signIn(sarah)
})

function failingPath() {
  return `/api/shelves/${sarah.shelf.id}/coffees`
}

function sendToFailingRoute() {
  return $fetch(failingPath(), { method: 'POST', body: {} })
}

async function openSheet(
  props: Partial<InstanceType<typeof CoffeeFormSheet>['$props']> = {},
) {
  const sheet = await mountSuspended(CoffeeFormSheet, {
    route: shelfPath(sarah.shelf),
    props: {
      prefix: 'coffee-form',
      title: 'Coffee form',
      description: 'A coffee and its details.',
      submitLabel: 'Send it',
      send: vi.fn(async () => {}),
      open: true,
      ...props,
    },
    attachTo: document.body,
  })

  await vi.waitFor(
    () => expect(byTestId('coffee-form-form')).not.toBeNull(),
    3000,
  )

  return sheet
}

function sheetText() {
  return byTestId('coffee-form-sheet')!.textContent
}

function currentPane() {
  return [1, 2, 3, 4].find(
    number => byTestId(`coffee-form-pane-${number}`)?.style.display === '',
  )
}

function failingSteps() {
  return [1, 2, 3, 4].filter(
    number => byTestId(`coffee-form-step-${number}`)?.dataset.failing,
  )
}

async function fillRequired(name = 'Ayele Fulasa') {
  await type('coffee-name', name)
  await pickRoaster('square', 'Square Mile')
  await pickOrigin('ethi', 'Ethiopia')
  await pickMulti('coffee-processes', 'wash', 'Washed')
  await click('coffee-roast-level', 'option-light')
  await click('coffee-roasted-for', 'option-filter')
}

describe('CoffeeFormSheet', () => {
  it('starts empty on the first step, with the submit label it was given', async () => {
    await openSheet()

    expect(byTestId('form-sheet-title')!.textContent).toContain('Coffee form')
    expect(currentPane()).toBe(1)
    expect(inputValue('coffee-name')).toBe('')
    expect(isChecked('coffee-roast-level', 'option-light')).toBe(false)
    expect(byTestId('coffee-form-step-4')).toBeNull()
    expect(byTestId('coffee-form-submit')!.textContent).toContain('Send it')
  })

  it('asks for a first bag bought today when told to', async () => {
    await openSheet({ firstBag: true })

    expect(byTestId('coffee-form-steps')!.textContent).toContain('First bag')
    expect(
      byTestId('coffee-purchased-on', 'date-picker-trigger')!.textContent,
    ).toContain(formatDate(localDate()))
  })

  it('starts from the details of the coffee it was given', async () => {
    const ayele = await scenario.coffee(sarah.shelf, { varietals: ['Geisha'] })
    const coffee = await $fetch(
      `/api/shelves/${sarah.shelf.id}/coffees/${ayele.id}`,
    )
    await openSheet({ coffee })

    expect(inputValue('coffee-name')).toBe('Ayele Fulasa')
    expect(isChecked('coffee-roast-level', 'option-light')).toBe(true)
    expect(isChecked('coffee-roasted-for', 'option-filter')).toBe(true)
    expect(chipLabels('coffee-varietals-chips')).toEqual(['Geisha'])
  })

  it('goes back to the first step with a problem and sends nothing', async () => {
    const send = vi.fn(async () => {})
    await openSheet({ send })
    await type('coffee-name', 'Ayele Fulasa')
    await pickRoaster('square', 'Square Mile')
    await click('coffee-form-next')
    await click('coffee-form-next')

    await submit('coffee-form-form')

    await vi.waitFor(() => expect(currentPane()).toBe(2))
    expect(sheetText()).toContain('Pick where it was grown')
    expect(sheetText()).toContain('Pick a roast level')
    expect(failingSteps()).toEqual([2, 3])
    expect(send).not.toHaveBeenCalled()
  })

  it('sends the checked coffee, closes and goes where it was told', async () => {
    const send = vi.fn(async () => {})
    const sheet = await openSheet({ send, goTo: () => '/profile' })
    await fillRequired()

    await submit('coffee-form-form')

    await vi.waitFor(() => expect(currentPath()).toBe('/profile'))
    expect(sheet.emitted('update:open')).toEqual([[false]])
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        origins: ['ET'],
        roastLevel: 'light',
      }),
    )
  })

  it('stays where it is when not told where to go', async () => {
    const sheet = await openSheet()
    await fillRequired()

    await submit('coffee-form-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(currentPath()).toBe(shelfPath(sarah.shelf))
  })

  it('shows what the server refused next to the field, on its step', async () => {
    failRequest('POST', failingPath(), {
      status: 400,
      message: 'Fix the highlighted fields',
      errors: { roastedFor: 'That is no way to roast it' },
    })
    const sheet = await openSheet({ send: sendToFailingRoute })
    await fillRequired()

    await submit('coffee-form-form')

    await vi.waitFor(() =>
      expect(sheetText()).toContain('That is no way to roast it'),
    )
    expect(currentPane()).toBe(3)
    expect(failingSteps()).toEqual([3])
    expect(byTestId('form-error')).toBeNull()
    expect(sheet.emitted('update:open')).toBeUndefined()
  })

  it('shows the reason the server refused it', async () => {
    failRequest('POST', failingPath(), {
      status: 409,
      message: 'That coffee could not be added',
    })
    const sheet = await openSheet({ send: sendToFailingRoute })
    await fillRequired()

    await submit('coffee-form-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'That coffee could not be added',
      ),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
  })

  it('says something went wrong when the server gives no reason', async () => {
    failRequest('POST', failingPath(), { status: 500, message: '' })
    await openSheet({ send: sendToFailingRoute })
    await fillRequired()

    await submit('coffee-form-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')!.textContent?.trim()).toBe(
        'Something went wrong. Try again.',
      ),
    )
  })

  it('cannot be sent twice while sending', async () => {
    let finish = () => {}
    const send = vi.fn(
      () => new Promise<void>(resolve => (finish = () => resolve())),
    )
    await openSheet({ send })
    await fillRequired()

    await submit('coffee-form-form')

    await vi.waitFor(() =>
      expect(byTestId<HTMLButtonElement>('coffee-form-submit')!.disabled).toBe(
        true,
      ),
    )
    finish()
    await flushPromises()
  })

  it('throws away unsaved changes and problems when it opens again', async () => {
    failRequest('POST', failingPath(), { status: 500, message: '' })
    const sheet = await openSheet({ send: sendToFailingRoute })
    await fillRequired('Half typed')
    await click('coffee-form-next')
    await submit('coffee-form-form')
    await vi.waitFor(() => expect(byTestId('form-error')).not.toBeNull())

    await sheet.setProps({ open: false })
    await sheet.setProps({ open: true })
    await flushPromises()

    expect(inputValue('coffee-name')).toBe('')
    expect(currentPane()).toBe(1)
    expect(byTestId('form-error')).toBeNull()
  })
})
