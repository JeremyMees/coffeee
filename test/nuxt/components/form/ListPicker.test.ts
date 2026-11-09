import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ListPicker from '~/components/form/ListPicker.vue'
import type { Member } from '#test/support/types'
import {
  byTestId,
  inputValue,
  pickerOptions,
  pickOption,
  type,
} from '../../fixtures'
import { scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await scenario.roaster(sarah, 'Square Mile')
  await scenario.roaster(sarah, 'La Cabra')
  await signIn(sarah)
})

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(ListPicker, {
    props: {
      id: 'coffee-roaster',
      endpoint: '/api/roasters',
      placeholder: 'Search or add a roaster',
      hint: 'Type the roaster',
      ...props,
    },
    attrs: { 'data-testid': 'roaster' },
    attachTo: document.body,
  })
}

describe('ListPicker', () => {
  it('starts from the entry already picked', async () => {
    await mountPicker({ modelValue: 'Square Mile' })

    expect(inputValue('roaster')).toBe('Square Mile')
    expect(byTestId('roaster')!.getAttribute('placeholder')).toBe(
      'Search or add a roaster',
    )
  })

  it('asks the list for entries similar to what was typed', async () => {
    await mountPicker()

    await type('roaster', 'squar')

    await vi.waitFor(() =>
      expect(pickerOptions()).toEqual(['Add “squar”', 'Square Mile']),
    )
  })

  it('narrows the list with extra params', async () => {
    await scenario.grinder(sarah.shelf, { brand: 'Fellow', model: 'Ode' })
    await scenario.grinder(sarah.shelf, { brand: 'Baratza', model: 'Odessa' })
    await mountPicker({
      endpoint: '/api/grinders',
      params: { brand: 'Fellow' },
    })

    await type('roaster', 'od')

    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Add “od”', 'Ode']))
  })

  it('waits for typing to pause before asking the list', async () => {
    await mountPicker()

    await type('roaster', 'square mile')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Square Mile']))
    await type('roaster', 'l')
    await type('roaster', 'la')
    await type('roaster', 'la cabra')

    expect(pickerOptions()).toEqual(['Add “la cabra”', 'Square Mile'])
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['La Cabra']))
  })

  it('reuses an earlier search instead of asking again', async () => {
    await mountPicker()

    await type('roaster', 'square')
    await vi.waitFor(() =>
      expect(pickerOptions()).toEqual(['Add “square”', 'Square Mile']),
    )
    await scenario.roaster(sarah, 'Square One')
    await type('roaster', 'la cabra')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['La Cabra']))
    await type('roaster', 'Square')
    await new Promise(resolve => setTimeout(resolve, 300))

    expect(pickerOptions()).toEqual(['Add “Square”', 'Square Mile'])
    await type('roaster', 'squa')
    await vi.waitFor(() => expect(pickerOptions()).toContain('Square One'))
  })

  it('offers to add an entry only when none has that name', async () => {
    await mountPicker()

    await type('roaster', 'SQUARE MILE')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Square Mile']))

    await type('roaster', 'Koji')
    await vi.waitFor(() => expect(pickerOptions()).toEqual(['Add “Koji”']))
  })

  it('gives the entry that was picked', async () => {
    const picker = await mountPicker()

    await type('roaster', 'la cab')
    await pickOption('La Cabra')

    expect(picker.emitted('update:modelValue')).toEqual([['La Cabra']])
  })

  it('gives a new entry by the name typed', async () => {
    const picker = await mountPicker()

    await type('roaster', '  Koji ')
    await pickOption('Add “Koji”')

    expect(picker.emitted('update:modelValue')).toEqual([['Koji']])
  })

  it('shows its hint while the list is empty', async () => {
    await mountPicker({ endpoint: '/api/producers' })

    await type('roaster', '')

    await vi.waitFor(() =>
      expect(byTestId('list-hint')!.textContent?.trim()).toBe(
        'Type the roaster',
      ),
    )
  })

  it('is marked invalid when its field has an error', async () => {
    await mountPicker({ invalid: true })

    expect(byTestId('roaster')!.getAttribute('aria-invalid')).toBe('true')
  })
})
