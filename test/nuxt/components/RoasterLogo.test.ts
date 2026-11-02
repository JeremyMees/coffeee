import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import RoasterLogo from '~/components/RoasterLogo.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { tid } from '../fixtures'

fakeApi()

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

beforeEach(resetApi)

const roaster = { id: 'r2', name: 'Square Mile', logoUrl: null }

function mountLogo(logoUrl: string | null = null) {
  return mountSuspended(RoasterLogo, {
    props: { shelfId: 'home', roaster: { ...roaster, logoUrl } },
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

describe('RoasterLogo', () => {
  it('offers to add a logo when there is none', async () => {
    const wrapper = await mountLogo()

    expect(wrapper.get(tid('roaster-logo-pick')).text()).toBe('Add logo')
    expect(wrapper.find(tid('roaster-logo-remove')).exists()).toBe(false)
  })

  it('offers to replace or remove a logo', async () => {
    const wrapper = await mountLogo('/api/photos/roasters/a.webp')

    expect(wrapper.get(tid('roaster-logo-pick')).text()).toBe('Replace logo')
    expect(wrapper.find(tid('roaster-logo-remove')).exists()).toBe(true)
  })

  it('uploads the logo that is picked', async () => {
    const wrapper = await mountLogo()

    await choose(wrapper, [
      new File(['huge'], 'logo.png', { type: 'image/png' }),
    ])

    await vi.waitFor(() => expect(api.roasterCalls).toEqual(['logo uploaded']))
  })

  it('does nothing when no logo is picked', async () => {
    const wrapper = await mountLogo()

    await choose(wrapper, [])

    expect(api.roasterCalls).toEqual([])
  })

  it('explains why a logo could not be uploaded', async () => {
    api.roasterFails = true
    const wrapper = await mountLogo()

    await choose(wrapper, [
      new File(['huge'], 'logo.png', { type: 'image/png' }),
    ])

    await vi.waitFor(() =>
      expect(wrapper.get(tid('roaster-logo-error')).text()).toBe(
        'That photo is too large',
      ),
    )
  })

  it('removes the logo', async () => {
    const wrapper = await mountLogo('/api/photos/roasters/a.webp')

    await wrapper.get(tid('roaster-logo-remove')).trigger('click')

    await vi.waitFor(() => expect(api.roasterCalls).toEqual(['logo removed']))
  })
})
