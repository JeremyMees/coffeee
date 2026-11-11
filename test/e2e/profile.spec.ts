import { expect, test } from './support/fixtures'
import { expectTouchable, phone } from './support/touch'

test('shows who is signed in', async ({ page, member }) => {
  await page.goto('/profile')

  await expect(page.getByTestId('profile-name-input')).toHaveValue(member.name)
  await expect(page.getByText(member.name, { exact: true })).toHaveCount(0)
  await expect(page.getByTestId('profile-email')).toHaveText(member.email)
  await expect(page.getByTestId('profile-invites')).toBeHidden()
})

test('changes the name and keeps it after a reload', async ({ page }) => {
  await page.goto('/profile')

  await page.getByTestId('profile-name-input').fill('Tess Mees')
  await page.getByTestId('profile-name-submit').click()

  await expect(page.getByTestId('profile-name-saved')).toBeVisible()

  await page.reload()

  await expect(page.getByTestId('profile-name-input')).toHaveValue('Tess Mees')
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

test('deletes the account after handing a shared shelf to a member', async ({
  page,
  member,
  people,
}) => {
  await people.signIn('Ada', 'admin')
  const sam = await people.signIn('Sam')
  await people.joinShelf(member, sam.shelfId)
  await page.goto('/profile')

  await page.getByTestId('profile-tab-danger').click()
  await page.getByTestId('delete-account-open').click()
  await page.getByTestId('confirm-dialog-confirm').click()

  await expect(page.getByTestId('form-error')).toContainText(
    "Choose who takes over Sam's shelf",
  )

  await page
    .getByTestId(`delete-account-heir-${sam.shelfId}`)
    .selectOption(member.id)
  await page.getByTestId('confirm-dialog-confirm').click()

  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto(`/shelves/${sam.shelfId}`)

  await expect(page).toHaveURL(/\/sign-in\?redirect=/)
})

test('gives the profile tabs a touch-sized target on a phone', async ({
  page,
}) => {
  await page.setViewportSize(phone)
  await page.goto('/profile')

  for (const tab of ['account', 'danger']) {
    await expectTouchable(page.getByTestId(`profile-tab-${tab}`))
  }
  await expectTouchable(page.getByTestId('profile-name-input'))
})
