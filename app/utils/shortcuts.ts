export interface Shortcut {
  keys: string[]
  label: string
}

export function isApplePlatform(platform: string) {
  return /Mac|iPhone|iPad|iPod/.test(platform)
}

export function shortcuts(apple: boolean): Shortcut[] {
  return [
    { keys: [apple ? '⌘' : 'Ctrl', 'K'], label: 'Search the catalog' },
    { keys: ['N'], label: 'Add a coffee' },
  ]
}
