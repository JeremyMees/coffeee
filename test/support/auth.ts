import { testUtils } from 'better-auth/plugins'
import type { TestHelpers } from 'better-auth/plugins'
import { createAuth } from '#server/utils/auth'
import type { TestDatabase } from '#test/support/types'

export async function createTestAuth(db: TestDatabase) {
  const auth = createAuth({
    db,
    secret: 'a-test-secret-that-is-long-enough-to-use',
    productionUrl: 'http://localhost:3000',
    adminEmail: 'jeremy@example.com',
    google: { clientId: 'google-id', clientSecret: 'google-secret' },
    plugins: [testUtils()],
  })
  const { test } = (await auth.$context) as unknown as { test: TestHelpers }

  async function signIn(userId: string) {
    const { headers } = await test.login({ userId })

    return headers
  }

  return { auth, signIn }
}
