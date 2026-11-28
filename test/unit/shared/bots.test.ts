import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  botEdgeRoutes,
  isBlockedUserAgent,
  isScannerPath,
} from '#shared/utils/bots'

const scannerPaths = [
  '/.env',
  '/.git/config',
  '/app/.env.production',
  '/wp-admin/install.php',
  '/wp-admin/admin-ajax.php',
  '/wp-json/',
  '/wp-json/wp/v2/users',
  '/wp-json/oembed/1.0/embed',
  '/wp-sitemap-users-1.xml',
  '/wp/wp-json/wp/v2/users',
  '/wordpress/wp-login.php',
  '/index.php',
  '/index.php/wp-json/wp/v2/users',
  '/xmlrpc.php',
  '/readme.html',
  '/api/graphql',
  '/graphql',
  '/feed/',
  '/feed/atom/',
  '/comments/feed/',
  '/rss/',
  '/author-sitemap.xml',
  '/sitemap_index.xml',
  '/llms.txt',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/backup/',
  '/v2/',
]

function appRoutes(folder: string, base = ''): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const name = entry.name
      .replace(/\.(get|post|patch|put|delete)?\.?(ts|vue)$/, '')
      .replace(/^index$/, '')
      .replace(/\[\.\.\.\w+\]/, 'a/b')
      .replace(/\[\w+\]/, 'ab12cd34')
    const path = `${base}/${name}`.replace(/\/$/, '') || '/'

    return entry.isDirectory()
      ? appRoutes(`${entry.parentPath}/${entry.name}`, path)
      : [path]
  })
}

const appPaths = new Set([
  ...appRoutes('app/pages'),
  ...appRoutes('server/api', '/api'),
  ...readdirSync('public').map(file => `/${file}`),
  '/_nuxt/entry.js',
  '/_vercel/insights/script.js',
  '/sw.js',
  '/workbox-122b4a4c.js',
  '/manifest.webmanifest',
  '/.well-known/assetlinks.json',
])

describe('isScannerPath', () => {
  it.each(scannerPaths)('refuses %s', path => {
    expect(isScannerPath(path)).toBe(true)
  })

  it.each([...appPaths])('lets %s through', path => {
    expect(isScannerPath(path)).toBe(false)
  })
})

describe('isBlockedUserAgent', () => {
  it('refuses the sitewatch crawler', () => {
    expect(
      isBlockedUserAgent(
        'Mozilla/5.0 (compatible; sitewatch/1.0; contract-address monitor)',
      ),
    ).toBe(true)
  })

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) Safari/604.1',
    '',
    null,
    undefined,
  ])('lets %s through', userAgent => {
    expect(isBlockedUserAgent(userAgent)).toBe(false)
  })
})

describe('botEdgeRoutes', () => {
  const [crawler, scanners] = botEdgeRoutes()

  it('refuses the sitewatch crawler on every path', () => {
    const header = crawler!.has![0]!

    expect(crawler!.status).toBe(403)
    expect(new RegExp(crawler!.src).test('/_nuxt/entry.js')).toBe(true)
    expect(header.key).toBe('user-agent')
    expect(
      new RegExp(`^${header.value}$`).test(
        'Mozilla/5.0 (compatible; sitewatch/1.0; contract-address monitor)',
      ),
    ).toBe(true)
  })

  it('answers scanner paths with a 404 whether signed in or not', () => {
    expect(scanners).toEqual({ src: expect.any(String), status: 404 })
    expect(new RegExp(scanners!.src).test('/wp-json/wp/v2/users')).toBe(true)
    expect(new RegExp(scanners!.src).test('/sign-in')).toBe(false)
  })
})
