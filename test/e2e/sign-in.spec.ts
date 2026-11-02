import { expect, test } from '@playwright/test'

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

test('welcomes someone who opens an invite link', async ({ page }) => {
  await page.goto('/invite/a-token')

  await expect(page.getByTestId('invite-title')).toHaveText("You're invited")
  await expect(page.getByTestId('invite-google')).toBeVisible()
})
