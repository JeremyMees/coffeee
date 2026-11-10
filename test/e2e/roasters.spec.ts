import { expect, test, uniqueName } from './support/fixtures'

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('adds a roaster from the + in the dock', async ({ page, member }) => {
    const roaster = uniqueName('Roaster')
    await page.goto(`/shelves/${member.shelfId}`)

    await expect(page.getByTestId('page-add-coffee')).toBeHidden()
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByTestId('dock-add-coffee')).toBeVisible()
    await page.getByTestId('dock-add-roaster').click()

    const sheet = page.getByTestId('add-roaster-sheet')
    await sheet.getByTestId('roaster-name').fill(roaster)
    await sheet.getByTestId('add-roaster-submit').click()
    await expect(sheet).toBeHidden()

    await page.getByRole('link', { name: 'Roasters' }).click()
    await expect(
      page.getByTestId('roaster-result-name').filter({ hasText: roaster }),
    ).toBeVisible()
  })

  test('closes the add menu on Escape and opens Add coffee from it', async ({
    page,
    member,
  }) => {
    await page.goto(`/shelves/${member.shelfId}`)
    const add = page.getByTestId('dock-add')

    await add.click()
    await expect(page.getByTestId('dock-add-menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('dock-add-menu')).toBeHidden()

    await add.click()
    await page.getByTestId('dock-add-coffee').click()
    await expect(page.getByTestId('add-coffee-sheet')).toBeVisible()
  })
})
