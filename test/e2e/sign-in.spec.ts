import { expect, test } from '@playwright/test'

test('sends anonymous visitors to sign in with Google', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(
    page.getByRole('button', { name: 'Continue with Google' }),
  ).toBeVisible()
})

test('tells someone without an invite that Coffeee is invite-only', async ({
  page,
}) => {
  await page.goto('/sign-in?error=invite')

  await expect(page.getByText('Coffeee is invite-only')).toBeVisible()
})
