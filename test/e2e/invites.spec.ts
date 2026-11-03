import { expect, test, uniqueName } from './support/fixtures'

test.beforeEach(async ({ people }) => {
  await people.signIn('Ada', 'admin')
})

test('opens the invites from the admin page', async ({ page }) => {
  await page.goto('/admin')

  await page.getByTestId('admin-link').filter({ hasText: 'Invites' }).click()

  await expect(page).toHaveURL('/admin/invites')
  await expect(page.getByTestId('page-title')).toHaveText('Invites')
})

test('allows an email and revokes it again', async ({ page }) => {
  const email = `${uniqueName('guest').replace(' ', '-')}@example.test`
  await page.goto('/admin/invites')

  await page.getByTestId('page-add').click()
  await page.getByTestId('invite-email').fill(email)
  await page.getByTestId('invite-email-submit').click()

  const invite = page.getByTestId('invite').filter({ hasText: email })
  await expect(invite).toBeVisible()
  await expect(page.getByTestId('add-invite-sheet')).toBeHidden()

  await invite.getByTestId('invite-revoke').click()

  await expect(invite).toBeHidden()
})

test('explains an email that is not an email', async ({ page }) => {
  await page.goto('/admin/invites')

  await page.getByTestId('page-add').click()
  await page.getByTestId('invite-email').fill('not an email')
  await page.getByTestId('invite-email-submit').click()

  await expect(page.getByTestId('invite-email-form')).toContainText(
    'Enter a valid email',
  )
})

test('creates an invite link to copy', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/admin/invites')

  await page.getByTestId('page-add').click()
  await page.getByTestId('invite-link-create').click()

  const link = page.getByTestId('invite-link')
  await expect(link).toHaveValue(/\/invite\/[\w-]+$/)

  await page.getByTestId('invite-link-copy').click()

  await expect(page.getByTestId('invite-link-copy')).toHaveAttribute(
    'aria-label',
    'Copied',
  )
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await link.inputValue(),
  )
})

test('keeps people who are not admins out', async ({ page, people }) => {
  const sam = await people.signIn('Sam')

  await page.goto('/admin/invites')

  await expect(page).toHaveURL(`/shelves/${sam.shelfId}`)
})
