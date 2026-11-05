import { originName } from './origins'

export const roastersPageSize = 24

export function roasterPlace(roaster: {
  city: string | null
  countryCode: string | null
}) {
  return [roaster.city, roaster.countryCode && originName(roaster.countryCode)]
    .filter(Boolean)
    .join(', ')
}

export function websiteHost(website: string) {
  return new URL(website).host.replace(/^www\./, '')
}

export function referredLink(link: string) {
  const url = new URL(link)

  if (!url.searchParams.has('utm_source')) {
    url.searchParams.set('utm_source', 'coffeee')
    url.searchParams.set('utm_medium', 'referral')
  }

  return url.toString()
}
