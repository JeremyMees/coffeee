import { expect, test } from './support/fixtures'

test('gives shared links a preview image from the same host', async ({
  page,
  request,
}) => {
  await page.goto('/sign-in')

  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content')

  expect(image).toBe(new URL('/og-image.png', page.url()).href)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )

  const response = await request.get(image!)

  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toBe('image/png')
})
