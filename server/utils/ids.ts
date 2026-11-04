import type { Database } from '#server/types/database'
import { newCode } from '#shared/utils/slugs'

const attempts = 5

function isIdClash(caught: unknown) {
  const error = (caught as { cause?: unknown }).cause ?? caught
  const { code, constraint } = error as { code?: string; constraint?: string }

  return code === '23505' && Boolean(constraint?.endsWith('_pkey'))
}

export async function withFreshId<Result>(
  db: Database,
  insert: (db: Database, id: string) => Promise<Result>,
) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.transaction(tx => insert(tx, newCode()))
    } catch (caught) {
      if (attempt === attempts || !isIdClash(caught)) throw caught
    }
  }
}
