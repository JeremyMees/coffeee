import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PickedChips from '~/components/PickedChips.vue'
import { allByTestId, byTestId, click } from '../fixtures'

function mountChips(chips: { key: string; label: string; detail?: string }[]) {
  return mountSuspended(PickedChips, {
    props: { chips },
    attrs: { 'data-testid': 'chips' },
    attachTo: document.body,
  })
}

describe('PickedChips', () => {
  it('shows each pick with its detail', async () => {
    await mountChips([
      { key: 'CO:huila', label: 'Huila', detail: 'Colombia' },
      { key: 'ET:guji', label: 'Guji' },
    ])

    expect(
      allByTestId('chips', 'chip-label').map(chip => chip.textContent),
    ).toEqual(['Huila', 'Guji'])
    expect(allByTestId('chips', 'chip-detail')).toHaveLength(1)
    expect(byTestId('chips', 'chip-detail')!.textContent).toContain('Colombia')
    expect(byTestId('chips', 'chip-remove')!.getAttribute('aria-label')).toBe(
      'Remove Huila',
    )
  })

  it('asks to remove a pick', async () => {
    const chips = await mountChips([{ key: 'CO', label: 'Colombia' }])

    await click('chips', 'chip-remove')

    expect(chips.emitted('remove')).toEqual([['CO']])
  })

  it('shows nothing without picks', async () => {
    await mountChips([])

    expect(byTestId('chips')).toBeNull()
  })
})
