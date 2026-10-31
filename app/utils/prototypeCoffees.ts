export interface PrototypeCoffee {
  id: string
  roaster: string
  name: string
  origin: string
  region: string
  altitude: string
  process: string
  varietal: string
  notes: { label: string; emoji: string }[]
  roastLevel: 'Light' | 'Medium' | 'Medium-Dark' | 'Dark'
  roastedFor: 'Espresso' | 'Filter' | 'Omni'
  daysOffRoast: number
  ink: string
  rating?: number
  favourite?: boolean
  timesBought: number
}

export const prototypeStock: PrototypeCoffee[] = [
  {
    id: 'ayele-fulasa',
    roaster: 'Tanat',
    name: 'Ayele Fulasa',
    origin: 'Ethiopia',
    region: 'Yirgacheffe',
    altitude: '2005 masl',
    process: 'Natural',
    varietal: 'JARC 74110',
    notes: [
      { label: 'Wild strawberry', emoji: '🍓' },
      { label: 'Cranberry', emoji: '🫐' },
      { label: 'Chamomile', emoji: '🌼' },
    ],
    roastLevel: 'Light',
    roastedFor: 'Filter',
    daysOffRoast: 9,
    ink: '#c8102e',
    rating: 5,
    favourite: true,
    timesBought: 2,
  },
  {
    id: 'moonlight-blend',
    roaster: 'Boo Coffee Roasters',
    name: 'Moonlight Blend',
    origin: 'Brazil & Guatemala',
    region: 'Minas Gerais, Atitlán',
    altitude: '900–1400 masl',
    process: 'Natural & Washed',
    varietal: 'Yellow Catuaí, Bourbon',
    notes: [
      { label: 'Dark chocolate', emoji: '🍫' },
      { label: 'Caramel', emoji: '🍮' },
      { label: 'Candied hazelnut', emoji: '🌰' },
    ],
    roastLevel: 'Medium',
    roastedFor: 'Espresso',
    daysOffRoast: 16,
    ink: '#ff7604',
    timesBought: 4,
    rating: 4,
    favourite: true,
  },
  {
    id: 'finca-gascon',
    roaster: 'Mok',
    name: 'Finca Gascon',
    origin: 'Colombia',
    region: 'Huila',
    altitude: '1750 masl',
    process: 'Washed',
    varietal: 'Pink Bourbon',
    notes: [
      { label: 'Peach', emoji: '🍑' },
      { label: 'Black tea', emoji: '🍵' },
      { label: 'Honey', emoji: '🍯' },
    ],
    roastLevel: 'Light',
    roastedFor: 'Omni',
    daysOffRoast: 4,
    ink: '#d9467a',
    timesBought: 2,
  },
  {
    id: 'frinsa-manis',
    roaster: 'Tanat',
    name: 'Frinsa Manis',
    origin: 'Indonesia',
    region: 'West Java',
    altitude: '1500 masl',
    process: 'Anaerobic Natural',
    varietal: 'Sigararutang',
    notes: [
      { label: 'Pineapple', emoji: '🍍' },
      { label: 'Rum', emoji: '🥃' },
      { label: 'Cacao nib', emoji: '🍫' },
    ],
    roastLevel: 'Light',
    roastedFor: 'Filter',
    daysOffRoast: 33,
    ink: '#2f6b4f',
    rating: 3,
    timesBought: 1,
  },
]

export const prototypeBoughtBefore: PrototypeCoffee[] = [
  {
    ...prototypeStock[0]!,
    id: 'sakami-schot',
    roaster: 'Schot',
    name: 'Sakami',
    origin: 'Ethiopia',
    roastedFor: 'Filter',
    ink: '#5b4bb7',
    rating: 5,
    favourite: true,
    timesBought: 3,
  },
  {
    ...prototypeStock[0]!,
    id: 'el-diviso',
    roaster: 'Winok',
    name: 'El Diviso',
    origin: 'Colombia',
    roastedFor: 'Filter',
    ink: '#e0a100',
    rating: 4,
    favourite: true,
    timesBought: 1,
  },
  {
    ...prototypeStock[1]!,
    id: 'sunlight-blend',
    roaster: 'Boo Coffee Roasters',
    name: 'Sunlight Blend',
    origin: 'Brazil',
    roastedFor: 'Espresso',
    ink: '#f2552c',
    rating: 3,
    favourite: false,
    timesBought: 2,
  },
  {
    ...prototypeStock[2]!,
    id: 'los-campos',
    roaster: 'Boo Coffee Roasters',
    name: 'Los Campos',
    origin: 'Costa Rica',
    roastedFor: 'Filter',
    ink: '#2d5bd7',
    rating: 4,
    favourite: true,
    timesBought: 1,
  },
  {
    ...prototypeStock[3]!,
    id: 'kiamabara',
    roaster: 'Mok',
    name: 'Kiamabara',
    origin: 'Kenya',
    roastedFor: 'Omni',
    ink: '#8a1c3b',
    rating: 2,
    favourite: false,
    timesBought: 1,
  },
]

export function prototypeFreshness(days: number) {
  if (days < 7) return { label: 'Resting', fill: days / 35 }
  if (days <= 28) return { label: 'Peak', fill: days / 35 }

  return { label: 'Past peak', fill: Math.min(days / 35, 1) }
}

export function prototypeStackGap(
  index: number,
  selected: string | undefined,
  coffees: PrototypeCoffee[],
  cardHeight: number,
  peek: number,
) {
  if (index === 0) return '0px'
  if (coffees[index - 1]?.id === selected) return '16px'

  return `${peek - cardHeight}px`
}
