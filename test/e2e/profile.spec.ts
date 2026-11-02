import { expect, test } from './support/fixtures'

test('shows who is signed in', async ({ page, member }) => {
  await page.goto('/profile')

  await expect(page.getByTestId('profile-name')).toHaveText(member.name)
  await expect(page.getByTestId('profile-email')).toHaveText(member.email)
  await expect(page.getByTestId('profile-invites')).toBeHidden()
})

test('signs out and keeps the shelf closed afterwards', async ({
  page,
  member,
}) => {
  await page.goto('/profile')

  await page.getByTestId('sign-out').click()

  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto(`/shelves/${member.shelfId}`)

  await expect(page).toHaveURL(/\/sign-in\?redirect=/)
  await expect(page.getByTestId('sign-in-google')).toBeVisible()
})
