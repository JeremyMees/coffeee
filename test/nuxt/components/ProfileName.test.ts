import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProfileName from '~/components/ProfileName.vue'
import { useCurrentUser } from '#imports'
import { api, fakeApi, resetApi } from '../fake-api'
import { byTestId, inputValue, submit, type } from '../fixtures'
import { testUser } from '#test/fixtures/users'

fakeApi()

beforeEach(() => {
  resetApi()
  useCurrentUser().value = testUser()
})

function mountName() {
  return mountSuspended(ProfileName, { attachTo: document.body })
}

describe('ProfileName', () => {
  it('lets someone change their name', async () => {
    await mountName()

    expect(inputValue('profile-name-input')).toBe('Sarah')

    await type('profile-name-input', ' Sarah Mees ')
    await submit('profile-name-form')

    await vi.waitFor(() =>
      expect(byTestId('profile-name-saved')).not.toBeNull(),
    )
    expect(api.profileRenames).toEqual([{ name: 'Sarah Mees' }])
    expect(useCurrentUser().value?.name).toBe('Sarah Mees')
  })

  it('explains a name it cannot use', async () => {
    await mountName()

    await type('profile-name-input', '   ')
    await submit('profile-name-form')

    await vi.waitFor(() =>
      expect(byTestId('profile-name-form')?.textContent).toContain(
        'Enter your name',
      ),
    )
    expect(api.profileRenames).toEqual([])
  })
})
