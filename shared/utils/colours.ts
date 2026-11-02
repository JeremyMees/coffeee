export const bagColours = [
  '#e4572e',
  '#f2c14e',
  '#2f6f4f',
  '#a4243b',
  '#5b3a29',
  '#f4c7c3',
  '#3d5a80',
  '#1d1d1f',
] as const

const lightInk = '#fffaf5'
const darkInk = '#1d1d1f'

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(index => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255

    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

export function inkOn(colour: string) {
  const background = luminance(colour)
  const onLight = (luminance(lightInk) + 0.05) / (background + 0.05)
  const onDark = (background + 0.05) / (luminance(darkInk) + 0.05)

  return onLight >= onDark ? lightInk : darkInk
}

export type BagColour = (typeof bagColours)[number]

export const bagColourNames: Record<BagColour, string> = {
  '#e4572e': 'Orange',
  '#f2c14e': 'Mustard',
  '#2f6f4f': 'Forest',
  '#a4243b': 'Cherry',
  '#5b3a29': 'Espresso',
  '#f4c7c3': 'Blush',
  '#3d5a80': 'Slate',
  '#1d1d1f': 'Ink',
}
