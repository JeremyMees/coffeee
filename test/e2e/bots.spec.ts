import { expect, test } from '@playwright/test'

const sitewatch =
  'Mozilla/5.0 (compatible; sitewatch/1.0; contract-address monitor)'

test('answers scanner paths with a 404', async ({ request }) => {
  for (const path of [
    '/wp-json/wp/v2/users',
    '/wp-admin/install.php',
    '/xmlrpc.php',
    '/readme.html',
    '/api/graphql',
    '/.env',
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })

    expect(response.status(), path).toBe(404)
  }
})

test('refuses the sitewatch crawler', async ({ request }) => {
  const response = await request.get('/sign-in', {
    headers: { 'user-agent': sitewatch },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(403)
})

test('still serves the app pages, static files and API', async ({
  request,
}) => {
  for (const path of [
    '/sign-in',
    '/sign-up',
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/manifest.webmanifest',
    '/sw.js',
    '/api/health',
  ]) {
    const response = await request.get(path, { maxRedirects: 0 })

    expect(response.status(), path).toBe(200)
  }

  const signedOut = await request.get('/notifications', { maxRedirects: 0 })
  expect(signedOut.status()).toBe(302)
})

test('lists the public pages in the sitemap from robots.txt', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text()
  const sitemap = await (await request.get('/sitemap.xml')).text()

  expect(robots).toContain('Sitemap: https://www.coffeee.app/sitemap.xml')
  expect(sitemap).toContain('<loc>https://www.coffeee.app/sign-in</loc>')
  expect(sitemap).toContain('<loc>https://www.coffeee.app/sign-up</loc>')
})
