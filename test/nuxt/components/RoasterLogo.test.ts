import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import RoasterLogo from '~/components/RoasterLogo.vue'
import { photoMaxBytes } from '#imports'
import { roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { tid } from '../fixtures'
import { database, scenario, signIn } from '../server'

const { compressPhoto } = vi.hoisted(() => ({
  compressPhoto: vi.fn(async () => new Blob(['small'], { type: 'image/webp' })),
}))

mockNuxtImport('compressPhoto', () => compressPhoto)

let sarah: Member
let squareMile: string

beforeEach(async () => {
  compressPhoto.mockClear()
  sarah = await scenario.member('Sarah')
  squareMile = await scenario.roaster(sarah, 'Square Mile')
  await signIn(sarah)
})

async function storedLogo() {
  const db = await database()
  const [found] = await db
    .select({ logoUrl: roaster.logoUrl })
    .from(roaster)
    .where(eq(roaster.id, squareMile))

  return found!.logoUrl
}

async function mountLogo() {
  return mountSuspended(RoasterLogo, {
    props: {
      roaster: {
        id: squareMile,
        name: 'Square Mile',
        logoUrl: await storedLogo(),
      },
    },
  })
}

async function choose(
  wrapper: Awaited<ReturnType<typeof mountLogo>>,
  files: File[],
) {
  const input = wrapper.get(tid('roaster-logo-input'))
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  })
  await input.trigger('change')
}

function logoFile() {
  return new File(['huge'], 'logo.png', { type: 'image/png' })
}

describe('RoasterLogo', () => {
  it('offers to add a logo when there is none', async () => {
    const wrapper = await mountLogo()

    expect(wrapper.get(tid('roaster-logo-pick')).text()).toBe('Add logo')
    expect(wrapper.find(tid('roaster-logo-remove')).exists()).toBe(false)
  })

  it('offers to replace or remove a logo', async () => {
    await scenario.roasterLogo(squareMile)
    const wrapper = await mountLogo()

    expect(wrapper.get(tid('roaster-logo-pick')).text()).toBe('Replace logo')
    expect(wrapper.find(tid('roaster-logo-remove')).exists()).toBe(true)
  })

  it('uploads the logo that is picked', async () => {
    const wrapper = await mountLogo()

    await choose(wrapper, [logoFile()])

    await vi.waitFor(async () =>
      expect(await storedLogo()).toMatch(
        /^\/api\/photos\/roasters\/[\w-]+\.webp$/,
      ),
    )
  })

  it('does nothing when no logo is picked', async () => {
    const wrapper = await mountLogo()

    await choose(wrapper, [])

    expect(compressPhoto).not.toHaveBeenCalled()
    expect(await storedLogo()).toBeNull()
  })

  it('explains why a logo could not be uploaded', async () => {
    compressPhoto.mockResolvedValueOnce(
      new Blob([new Uint8Array(photoMaxBytes + 1)], { type: 'image/webp' }),
    )
    const wrapper = await mountLogo()

    await choose(wrapper, [logoFile()])

    await vi.waitFor(() =>
      expect(wrapper.get(tid('roaster-logo-error')).text()).toBe(
        'That photo is too large',
      ),
    )
    expect(await storedLogo()).toBeNull()
  })

  it('removes the logo', async () => {
    await scenario.roasterLogo(squareMile)
    const wrapper = await mountLogo()

    await wrapper.get(tid('roaster-logo-remove')).trigger('click')

    await vi.waitFor(async () => expect(await storedLogo()).toBeNull())
  })
})
