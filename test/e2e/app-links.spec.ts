import { expect, test } from './support/fixtures'

test('lists the shortcuts and the share target in the manifest', async ({
  request,
}) => {
  const response = await request.get('/manifest.webmanifest')
  const manifest = await response.json()

  expect(response.status()).toBe(200)
  expect(manifest.shortcuts).toEqual([
    expect.objectContaining({ name: 'Add coffee', url: '/?add=coffee' }),
    expect.objectContaining({ name: 'Notifications', url: '/notifications' }),
  ])
  expect(manifest.share_target).toEqual({
    action: '/share',
    method: 'GET',
    params: { title: 'title', text: 'text', url: 'url' },
  })
})

test('opens add coffee on the shelf from the shortcut link', async ({
  page,
  member,
}) => {
  await page.goto('/?add=coffee')

  await expect(page).toHaveURL(new RegExp(`/shelves/[^/]*${member.shelfId}$`))
  await expect(page.getByTestId('add-coffee-sheet')).toBeVisible()
  await expect(page.getByTestId('coffee-link')).toHaveValue('')
})

test('opens add coffee with the link from shared text', async ({
  page,
  member,
}) => {
  const text = 'Ayele from the roaster https://roaster.example/ayele'

  await page.goto(`/share?${new URLSearchParams({ title: 'Ayele', text })}`)

  await expect(page).toHaveURL(new RegExp(`/shelves/[^/]*${member.shelfId}$`))
  await expect(page.getByTestId('add-coffee-sheet')).toBeVisible()
  await expect(page.getByTestId('coffee-link')).toHaveValue(
    'https://roaster.example/ayele',
  )
})

test('opens the shelf as usual when nothing shared is a link', async ({
  page,
  member,
}) => {
  await page.goto('/share?text=A+washed+Ethiopian')

  await expect(page).toHaveURL(new RegExp(`/shelves/[^/]*${member.shelfId}$`))
  await expect(page.getByTestId('page-add-coffee')).toBeVisible()
  await expect(page.getByTestId('add-coffee-sheet')).toHaveCount(0)
})
