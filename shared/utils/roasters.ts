import { originName } from './origins'

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
