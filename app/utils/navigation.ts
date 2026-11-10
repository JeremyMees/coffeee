export const adminPath = '/admin'

export function isCoffeePath(path: string) {
  return /^(\/shelves\/[^/]+)?\/coffees\/[^/]+$/.test(path)
}

export function isShelfCoffeePath(path: string) {
  return /^\/shelves\/[^/]+\/coffees\/[^/]+$/.test(path)
}
