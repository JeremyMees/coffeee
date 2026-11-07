import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import ProfileName from '~/components/organisms/ProfileName.vue'
import { useCurrentUser } from '#imports'
import { user } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import { byTestId, inputValue, submit, type } from '../../fixtures'
import { database, scenario, signIn } from '../../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

function mountName() {
  return mountSuspended(ProfileName, { attachTo: document.body })
}

async function storedName() {
  const db = await database()
  const [found] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, sarah.id))

  return found?.name
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
    expect(await storedName()).toBe('Sarah Mees')
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
    expect(await storedName()).toBe('Sarah')
  })
})
