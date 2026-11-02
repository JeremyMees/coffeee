import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { TestProject } from 'vitest/node'

export default async function setup(project: TestProject) {
  const client = new PGlite({ extensions: { pg_trgm } })

  await migrate(drizzle({ client }), {
    migrationsFolder: 'server/db/migrations',
  })

  const dump = await client.dumpDataDir('none')

  await client.close()

  const folder = await mkdtemp(join(tmpdir(), 'coffeee-test-db-'))
  const path = join(folder, 'migrated.tar')

  await writeFile(path, Buffer.from(await dump.arrayBuffer()))
  project.provide('migratedDatabase', path)

  return () => rm(folder, { recursive: true, force: true })
}
