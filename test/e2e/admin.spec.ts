import { expect, test } from './support/fixtures'

test('opens a shared list from the sidebar of an admin', async ({
  page,
  people,
}) => {
  await people.signIn('Ada', 'admin')
  await page.goto('/profile')

  await page.getByTestId('sidebar-link').filter({ hasText: 'Admin' }).click()

  await expect(page).toHaveURL('/admin')
  await page.getByTestId('admin-link').filter({ hasText: 'Processes' }).click()

  await expect(page).toHaveURL('/admin/lists/processes')
  await page.getByTestId('admin-search').fill('washed')
  await expect(
    page.getByTestId('admin-entry-name').filter({ hasText: /^Washed$/ }),
  ).toBeVisible()
  await expect(page).toHaveURL('/admin/lists/processes?search=washed')
})

test('keeps the admin link and pages from everyone else', async ({
  page,
  member,
}) => {
  await page.goto(`/shelves/${member.shelfId}`)

  await expect(
    page.getByTestId('sidebar-link').filter({ hasText: 'Admin' }),
  ).toHaveCount(0)

  await page.goto('/admin')

  await expect(page).toHaveURL(
    new RegExp(`/shelves/[a-z0-9-]*${member.shelfId}$`),
  )
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('reaches the admin pages from the profile and acts on a row from its menu', async ({
    page,
    people,
  }) => {
    await people.signIn('Ada', 'admin')
    await page.goto('/profile')

    await page.getByTestId('profile-admin').click()

    await expect(page).toHaveURL('/admin')
    await page
      .getByTestId('admin-link')
      .filter({ hasText: 'Processes' })
      .click()
    await page.getByTestId('admin-search').fill('washed')
    await expect(
      page.getByTestId('admin-entry-name').filter({ hasText: /^Washed$/ }),
    ).toBeVisible()

    const menu = page.getByRole('button', { name: 'Actions for Washed' })
    await expect(menu).toBeInViewport()
    await menu.click()
    await page.getByTestId('admin-entry-menu-merge').click()

    await expect(page.getByTestId('admin-merge')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })

  test('keeps the admin link off the profile of everyone else', async ({
    page,
    member,
  }) => {
    await page.goto(`/shelves/${member.shelfId}`)
    await page.getByRole('link', { name: 'Profile' }).click()

    await expect(page).toHaveURL('/profile')
    await expect(page.getByTestId('sign-out')).toBeVisible()
    await expect(page.getByTestId('profile-admin')).toHaveCount(0)
  })
})
