import { defineTask, useRuntimeConfig } from 'nitropack/runtime'
import { useDb } from '#server/utils/db'
import { isLocalDatabase, seedDevData } from '#server/utils/dev-seed'

export default defineTask({
  meta: {
    name: 'dev:seed',
    description:
      'Add test people, ratings and grind settings to the local database',
  },
  async run({ payload }) {
    if (!isLocalDatabase(useRuntimeConfig().databaseUrl)) {
      throw new Error('dev:seed only runs against a local database')
    }

    const shelfName =
      typeof payload.shelf === 'string' ? payload.shelf : undefined

    return { result: await seedDevData(useDb(), shelfName) }
  },
})
