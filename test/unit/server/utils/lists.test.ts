import { describe, expect, it } from 'vitest'
import { roaster } from '#server/db/schemas'
import { findSimilar } from '#server/utils/lists'
import { nameKey } from '#shared/utils/names'
import { createTestDatabase } from '#test/support/database'

async function withEntries(names: string[]) {
  const { db } = await createTestDatabase()
  await db
    .insert(roaster)
    .values(names.map(name => ({ name, nameKey: nameKey(name) })))

  return db
}

async function similarNames(names: string[], search: string) {
  const db = await withEntries(names)

  return (await findSimilar(db, roaster, search)).map(entry => entry.name)
}

describe('finding similar entries', () => {
  it('lists every entry by name when nothing is typed', async () => {
    expect(
      await similarNames(['Square Mile', 'April', 'La Cabra'], '  '),
    ).toEqual(['April', 'La Cabra', 'Square Mile'])
  })

  it('suggests an entry spelled differently', async () => {
    expect(
      await similarNames(
        ['Co fermentation', 'Washed', 'Natural'],
        'Co-ferment',
      ),
    ).toEqual(['Co fermentation'])
  })

  it('catches a typo', async () => {
    expect(
      await similarNames(['Coffee Collective', 'La Cabra'], 'Cofee colective'),
    ).toEqual(['Coffee Collective'])
  })

  it('finds entries that contain what was typed', async () => {
    expect(await similarNames(['La Cabra', 'Square Mile'], 'abr')).toEqual([
      'La Cabra',
    ])
  })

  it('ranks the closest entry first', async () => {
    expect(
      await similarNames(['Semi washed', 'Washed', 'Natural'], 'washed'),
    ).toEqual(['Washed', 'Semi washed'])
  })

  it('ignores case, accents and hyphens', async () => {
    expect(await similarNames(['Café Señor', 'April'], 'CAFE-SENOR')).toEqual([
      'Café Señor',
    ])
  })

  it('suggests nothing for a brand-new name', async () => {
    expect(await similarNames(['Washed', 'Natural'], 'Koji')).toEqual([])
  })

  it('suggests a handful at most', async () => {
    const names = Array.from({ length: 12 }, (_, index) => `Roaster ${index}`)

    expect(await similarNames(names, 'roaster')).toHaveLength(8)
  })
})
