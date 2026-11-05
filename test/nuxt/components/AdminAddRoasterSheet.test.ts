import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import AdminAddRoasterSheet from '~/components/AdminAddRoasterSheet.vue'
import { photoMaxBytes } from '#imports'
import { roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, click, submit, type } from '../fixtures'
import { database, scenario, signIn } from '../server'

const { compressPhoto } = vi.hoisted(() => ({
  compressPhoto: vi.fn(async () => new Blob(['small'], { type: 'image/webp' })),
}))

mockNuxtImport('compressPhoto', () => compressPhoto)

let jeremy: Member

beforeEach(async () => {
  compressPhoto.mockClear()
  URL.createObjectURL = vi.fn(() => 'blob:logo')
  URL.revokeObjectURL = vi.fn()
  jeremy = await scenario.member('Jeremy', { role: 'admin' })
  await signIn(jeremy)
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

async function stored() {
  const db = await database()

  return db
    .select({
      name: roaster.name,
      website: roaster.website,
      countryCode: roaster.countryCode,
      city: roaster.city,
      logoUrl: roaster.logoUrl,
    })
    .from(roaster)
    .where(eq(roaster.name, 'La Cabra'))
}

describe('AdminAddRoasterSheet', () => {
  it('adds a roaster with all its details and closes', async () => {
    const sheet = await openSheet()

    await fill()
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(sheet.emitted('update:open')).toEqual([[false]]),
    )
    expect(await stored()).toEqual([
      {
        name: 'La Cabra',
        website: 'https://lacabra.dk',
        countryCode: 'DK',
        city: 'Aarhus',
        logoUrl: null,
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
    const [added] = await stored()
    expect(added!.logoUrl).toMatch(/^\/api\/photos\/roasters\/[\w-]+\.webp$/)
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
    expect(await stored()).toEqual([])
  })

  it('shows a roaster that is already on the list next to its name', async () => {
    await scenario.roaster(jeremy, 'La Cabra')
    await openSheet()

    await type('roaster-name', 'La Cabra')
    await submit('admin-add-roaster-form')

    await vi.waitFor(() =>
      expect(byTestId('admin-add-roaster-form')?.textContent).toContain(
        'La Cabra is already on the list',
      ),
    )
    expect(await stored()).toHaveLength(1)
  })

  it('says when the roaster was added but its logo was not', async () => {
    compressPhoto.mockResolvedValueOnce(
      new Blob([new Uint8Array(photoMaxBytes + 1)], { type: 'image/webp' }),
    )
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
    const [added] = await stored()
    expect(added!.logoUrl).toBeNull()
  })
})
