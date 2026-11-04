const codeAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
const codeLength = 8
const slugLength = 40

type Named = { id: string; name: string }

export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(codeLength))

  return Array.from(
    bytes,
    byte => codeAlphabet[byte % codeAlphabet.length],
  ).join('')
}

export function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, slugLength)
    .replace(/^-+|-+$/g, '')
}

export function slugFor(named: Named) {
  const slug = slugify(named.name)

  return slug ? `${slug}-${named.id}` : named.id
}

export function idFrom(slug: string) {
  return slug.slice(slug.lastIndexOf('-') + 1)
}

export function shelfPath(shelf: Named) {
  return `/shelves/${slugFor(shelf)}`
}

export function shelfCoffeePath(shelf: Named, coffee: Named) {
  return `${shelfPath(shelf)}/coffees/${slugFor(coffee)}`
}

export function coffeePath(coffee: Named) {
  return `/coffees/${slugFor(coffee)}`
}

export function roasterPath(roaster: Named) {
  return `/roasters/${slugFor(roaster)}`
}
