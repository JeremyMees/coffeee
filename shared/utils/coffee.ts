import type { RoastedFor, RoastLevel } from '../types/coffee'

const dayLength = 24 * 60 * 60 * 1000

export const roastLevels = ['light', 'medium', 'medium-dark', 'dark'] as const
export const roastedForOptions = ['espresso', 'filter', 'omni'] as const

export const coffeeListFields = ['producers', 'processes', 'varietals'] as const

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

export function daysOffRoast(roastedOn: string, today = new Date()) {
  const [year, month, day] = roastedOn.split('-').map(Number)
  const roasted = Date.UTC(year!, month! - 1, day!)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())

  return Math.round((now - roasted) / dayLength)
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
