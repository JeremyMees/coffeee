import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import AdminAddRoasterSheet from '~/components/AdminAddRoasterSheet.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, click, submit, testUser, type } from '../fixtures'

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser({ role: 'admin' })
  URL.createObjectURL = vi.fn(() => 'blob:logo')
  URL.revokeObjectURL = vi.fn()
})

function openSheet() {
  return mountSuspended(AdminAddRoasterSheet, {
    route: '/admin/lists/roasters',
    props: { open: true },
    attachTo: document.body,
  })
}

function pickCountry(code: string) {
  const select = byTestId<HTMLSelectElement>('roaster-country')!
  select.value = code
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

function pickLogo() {
  const input = byTestId<HTMLInputElement>('admin-add-roaster-logo-input')!
  Object.defineProperty(input, 'files', {
    value: [new File(['logo'], 'logo.png', { type: 'image/png' })],
    configurable: true,
  })
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

async function fill() {
  await type('roaster-name', 'La Cabra')
  await type('roaster-website', 'https://lacabra.dk')
  pickCountry('DK')
  await type('roaster-city', 'Aarhus')
}

describe('AdminAddRoasterSheet', () => {
  it('adds a roaster with all its details and closes', async () => {
    const sheet = await openSheet()

    await fill()
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.adminCalls).toEqual([
      {
        add: 'roasters',
        body: {
          name: 'La Cabra',
          website: 'https://lacabra.dk',
          countryCode: 'DK',
          city: 'Aarhus',
        },
      },
    ])
  })

  it('previews the picked logo and uploads it once the roaster is added', async () => {
    const sheet = await openSheet()

    await fill()
    pickLogo()
    await vi.waitFor(() =>
      expect(
        byTestId('admin-add-roaster-logo-preview')?.getAttribute('src'),
      ).toBe('blob:logo'),
    )
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(api.adminCalls).toEqual([
      expect.objectContaining({ add: 'roasters' }),
      { logo: 'new-3' },
    ])
  })

  it('drops the picked logo when asked', async () => {
    await openSheet()

    pickLogo()
    await vi.waitFor(() =>
      expect(byTestId('admin-add-roaster-logo-preview')).not.toBeNull(),
    )
    await click('admin-add-roaster-logo-remove')

    expect(byTestId('admin-add-roaster-logo-preview')).toBeNull()
  })

  it('asks for a name and a website that makes sense', async () => {
    await openSheet()

    await type('roaster-website', 'lacabra')
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-roaster-form')?.textContent).toContain(
        'Give the roaster a name',
      ),
    )
    expect(byTestId('admin-add-roaster-form')?.textContent).toContain(
      'Enter a website that starts with https://',
    )
    expect(api.adminCalls).toEqual([])
  })

  it('shows a roaster that is already on the list next to its name', async () => {
    await openSheet()

    await type('roaster-name', 'Taken')
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-roaster-form')?.textContent).toContain(
        'Taken is already on the list',
      ),
    )
  })

  it('says when the roaster was added but its logo was not', async () => {
    api.roasterFails = true
    const sheet = await openSheet()

    await fill()
    pickLogo()
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(byTestId('form-error')?.textContent).toContain(
        'La Cabra was added, but its logo was not: That photo is too large',
      ),
    )
    expect(sheet.emitted('update:open')).toBeUndefined()
  })
})
