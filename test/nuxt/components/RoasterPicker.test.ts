import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import RoasterPicker from '~/components/RoasterPicker.vue'
import { clearNuxtData } from '#imports'
import {
  byTestId,
  inputValue,
  pickRoasterOption,
  roasterOptions,
  type,
} from '../fixtures'

const known = { roasters: [] as { id: string; name: string }[] }

registerEndpoint('/api/roasters', () => known.roasters)

beforeEach(() => {
  clearNuxtData()
  known.roasters = [
    { id: 'r1', name: 'La Cabra' },
    { id: 'r2', name: 'Square Mile' },
  ]
})

function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(RoasterPicker, {
    props: { id: 'coffee-roaster', ...props },
    attrs: { 'data-testid': 'roaster' },
    attachTo: document.body,
  })
}

describe('RoasterPicker', () => {
  it('starts from the roaster already picked', async () => {
    await mountPicker({ modelValue: 'La Cabra' })

    expect(inputValue('roaster')).toBe('La Cabra')
  })

  it('offers the roasters that match, whatever the case or hyphens', async () => {
    await mountPicker()

    await type('roaster', 'SQUARE-mile')

    expect(roasterOptions()).toEqual(['Square Mile'])
  })

  it('offers to add a roaster only when none has that name', async () => {
    await mountPicker()

    await type('roaster', 'April')

    expect(roasterOptions()).toEqual(['Add “April”'])
  })

  it('gives the roaster that was picked', async () => {
    const picker = await mountPicker()

    await type('roaster', 'cabra')
    await pickRoasterOption('La Cabra')

    expect(picker.emitted('update:modelValue')).toEqual([['La Cabra']])
  })

  it('gives a new roaster by the name typed', async () => {
    const picker = await mountPicker()

    await type('roaster', '  April ')
    await pickRoasterOption('Add “April”')

    expect(picker.emitted('update:modelValue')).toEqual([['April']])
  })

  it('asks for a name while no roaster is known yet', async () => {
    known.roasters = []
    await mountPicker()

    await type('roaster', '')

    expect(byTestId('roaster-hint')!.textContent?.trim()).toBe(
      "Type the roaster's name",
    )
  })

  it('is marked invalid when its field has an error', async () => {
    await mountPicker({ invalid: true })

    expect(byTestId('roaster')!.getAttribute('aria-invalid')).toBe('true')
  })
})
