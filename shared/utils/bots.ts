const scannerPatterns = [
  '/(?:wp|wordpress)(?:-|/).*',
  '/.*\\.php(?:/.*)?',
  '/(?:.*/)?\\.(?!well-known/).*',
  '/(?:readme|license)\\.html',
  '/(?:api/)?graphql(?:/.*)?',
  '/(?:comments/)?feed(?:/.*)?',
  '/rss(?:/.*)?',
  '/(?:author-sitemap|sitemap_index)\\.xml',
  '/llms\\.txt',
  '/apple-touch-icon(?:-precomposed)?\\.png',
  '/(?:backup|v2)(?:/.*)?',
]

export const scannerPathSource = `^(?:${scannerPatterns.join('|')})$`

const scannerPath = new RegExp(scannerPathSource)

export function isScannerPath(path: string) {
  return scannerPath.test(path)
}

export const blockedUserAgent = 'sitewatch'

export function isBlockedUserAgent(userAgent: string | null | undefined) {
  return !!userAgent?.includes(blockedUserAgent)
}

export function botEdgeRoutes() {
  return [
    {
      src: '^/.*$',
      has: [
        {
          type: 'header',
          key: 'user-agent',
          value: `.*${blockedUserAgent}.*`,
        },
      ],
      status: 403,
    },
    {
      src: scannerPathSource,
      status: 404,
    },
  ]
}
