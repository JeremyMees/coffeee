import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppShortcuts from '~/components/molecules/AppShortcuts.vue'
import { allByTestId, byTestId, click } from '../../fixtures'

afterEach(() => {
  vi.restoreAllMocks()
})

async function openShortcuts(platform: string) {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
  await mountSuspended(AppShortcuts, { attachTo: document.body })
  await click('shortcuts-open')
}

function listed() {
  return allByTestId('shortcut').map(shortcut => [
    shortcut.querySelector('[data-testid="shortcut-label"]')!.textContent,
    [...shortcut.querySelectorAll('kbd')]
      .map(key => key.textContent?.trim())
      .join(' '),
  ])
}

describe('AppShortcuts', () => {
  it('stays closed until asked', async () => {
    await mountSuspended(AppShortcuts, { attachTo: document.body })

    expect(byTestId('shortcuts')).toBeNull()
  })

  it('lists every shortcut with ⌘ on a Mac', async () => {
    await openShortcuts('MacIntel')

    expect(listed()).toEqual([
      ['Search the catalog', '⌘ K'],
      ['Add a coffee', 'N'],
    ])
  })

  it('shows Ctrl elsewhere', async () => {
    await openShortcuts('Win32')

    expect(listed()[0]).toEqual(['Search the catalog', 'Ctrl K'])
  })

  it('closes from its close button', async () => {
    await openShortcuts('MacIntel')

    await click('shortcuts-close')

    await vi.waitFor(() => expect(byTestId('shortcuts')).toBeNull())
  })
})
