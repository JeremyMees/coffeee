import { expect, test } from '@playwright/test'
import { test as withPeople } from './support/fixtures'

test('sends anonymous visitors to sign in with Google', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByTestId('sign-in-google')).toBeVisible()
})

test('tells someone without an invite that Coffeee is invite-only', async ({
  page,
}) => {
  await page.goto('/sign-in?error=invite')

  await expect(page.getByTestId('sign-in-refused')).toContainText(
    'Coffeee is invite-only',
  )
})

withPeople(
  'welcomes someone who opens an invite link',
  async ({ page, context, member, people }) => {
    const token = await people.inviteLink(member)
    await context.clearCookies()

    await page.goto(`/invite/${token}`)

    await expect(page.getByTestId('invite-title')).toHaveText("You're invited")
    await expect(page.getByTestId('invite-google')).toBeVisible()
  },
)

test('says when an invite link no longer works', async ({ page }) => {
  await page.goto('/invite/a-token')

  await expect(page.getByTestId('invite-description')).toContainText(
    'This invite has expired or was already used',
  )
  await expect(page.getByTestId('invite-google')).toBeHidden()
  await expect(page.getByTestId('invite-home')).toBeVisible()
})
