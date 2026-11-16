import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ShareButton from '~/components/molecules/ShareButton.vue'
import { useRequestURL } from '#imports'
import {
  fakeClipboard,
  fakeShareSheet,
  forgetShareSheet,
  tid,
} from '../../fixtures'

afterEach(() => {
  forgetShareSheet()
  vi.useRealTimers()
})

const props = { name: 'Ayele Fulasa', path: '/coffees/ayele-fulasa-c1' }

function link() {
  return `${useRequestURL().origin}${props.path}`
}

async function pressShare() {
  const button = await mountSuspended(ShareButton, { props })
  await button.get(tid('share')).trigger('click')
  await flushPromises()

  return button
}

describe('ShareButton', () => {
  it('opens the share sheet with the name and the full link', async () => {
    const share = fakeShareSheet()
    const clipboard = fakeClipboard()

    const button = await pressShare()

    expect(share).toHaveBeenCalledExactlyOnceWith({
      title: 'Ayele Fulasa',
      url: link(),
    })
    expect(clipboard).not.toHaveBeenCalled()
    expect(button.get(tid('share-label')).text()).toBe('Share')
  })

  it('copies the link and confirms it without a share sheet', async () => {
    const clipboard = fakeClipboard()

    const button = await pressShare()

    expect(clipboard).toHaveBeenCalledExactlyOnceWith(link())
    expect(button.get(tid('share-label')).text()).toBe('Copied')
  })

  it('goes back to Share a moment after copying', async () => {
    vi.useFakeTimers()
    fakeClipboard()

    const button = await pressShare()
    await vi.advanceTimersByTimeAsync(3000)

    expect(button.get(tid('share-label')).text()).toBe('Share')
  })

  it('does nothing when the share sheet is closed without sharing', async () => {
    fakeShareSheet('cancel')
    const clipboard = fakeClipboard()

    const button = await pressShare()

    expect(clipboard).not.toHaveBeenCalled()
    expect(button.get(tid('share-label')).text()).toBe('Share')
  })

  it('copies the link when the share sheet refuses', async () => {
    fakeShareSheet('fail')
    const clipboard = fakeClipboard()

    const button = await pressShare()

    expect(clipboard).toHaveBeenCalledExactlyOnceWith(link())
    expect(button.get(tid('share-label')).text()).toBe('Copied')
  })
})
