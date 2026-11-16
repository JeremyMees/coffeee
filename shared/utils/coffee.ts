import type { RoastedFor, RoastLevel } from '../types/coffee'
import type { RoastDates } from '../types/purchases'

const dayLength = 24 * 60 * 60 * 1000

export const roastLevels = ['light', 'medium', 'medium-dark', 'dark'] as const
export const roastedForOptions = ['espresso', 'filter', 'omni'] as const

export const descriptionListFields = [
  'regions',
  'farms',
  'washingStations',
  'producers',
  'processes',
  'varietals',
  'flavorNotes',
] as const

export const seededProcesses = [
  'Washed',
  'Natural',
  'Semi washed',
  'Honey',
  'Anaerobic',
  'Yeast Inoculated',
  'Co fermentation',
  'Black diamond',
  'Nitro Maceration',
  'Nitro Culturing',
  'Extended fermentation',
  'Double',
  'Experimental',
  'Super natural',
]

export const roastLevelLabels: Record<RoastLevel, string> = {
  light: 'Light',
  medium: 'Medium',
  'medium-dark': 'Medium-Dark',
  dark: 'Dark',
}

export const roastedForLabels: Record<RoastedFor, string> = {
  espresso: 'Espresso',
  filter: 'Filter',
  omni: 'Omni',
}

function dayOf(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)

  return Date.UTC(year!, month! - 1, day!)
}

export function isFrozen(roast: Pick<RoastDates, 'frozenOn' | 'thawedOn'>) {
  return Boolean(roast.frozenOn) && !roast.thawedOn
}

export function daysOffRoast(roast: RoastDates, today = new Date()) {
  const roasted = dayOf(roast.roastedOn)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const within = (isoDate: string) =>
    Math.min(Math.max(dayOf(isoDate), roasted), now)
  const frozenFrom = roast.frozenOn ? within(roast.frozenOn) : now
  const frozenUntil = roast.thawedOn ? within(roast.thawedOn) : now
  const frozen = Math.max(frozenUntil - frozenFrom, 0)

  return Math.round((now - roasted - frozen) / dayLength)
}

const freshnessWindows: Record<RoastedFor, { rest: number; peak: number }> = {
  filter: { rest: 7, peak: 30 },
  omni: { rest: 10, peak: 35 },
  espresso: { rest: 14, peak: 45 },
}

export function freshness(days: number, roastedFor: RoastedFor) {
  const { rest, peak } = freshnessWindows[roastedFor]

  if (days < rest) return 'Resting'
  if (days <= peak) return 'Peak'

  return 'Past peak'
}
