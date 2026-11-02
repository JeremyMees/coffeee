import { defineTask, useRuntimeConfig } from 'nitropack/runtime'
import { connectDb, useDb } from '#server/utils/db'
import { plainText, queryNotionDatabase } from '#server/utils/notion'
import {
  findImportShelf,
  importNotion,
  notionDatabases,
  readNotionCoffee,
} from '#server/utils/notion-import'
import { copyPhoto } from '#server/utils/photo-copies'

function productionDb() {
  const url = process.env.NOTION_PRODUCTION_DATABASE_URL

  if (!url) {
    throw new Error(
      'Set NOTION_PRODUCTION_DATABASE_URL to import into production',
    )
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Set BLOB_READ_WRITE_TOKEN so production photos go to Blob')
  }

  return connectDb(url)
}

export default defineTask({
  meta: {
    name: 'notion:import',
    description: 'Import the Notion coffee inventory onto a shelf',
  },
  async run({ payload }) {
    const token = process.env.NOTION_TOKEN

    if (!token)
      throw new Error('Set NOTION_TOKEN to a Notion integration token')

    const production = payload.target === 'production'
    const db = production ? productionDb() : useDb()
    const scope = production ? 'production' : undefined
    try {
      const email = String(payload.email ?? useRuntimeConfig().adminEmail)
      const target = await findImportShelf(db, email)
      const [coffeePages, notePages] = await Promise.all([
        queryNotionDatabase(token, notionDatabases.coffees),
        queryNotionDatabase(token, notionDatabases.flavorNotes),
      ])
      const flavorNotes = new Map(
        notePages.map(page => [page.id, plainText(page.properties.Name)]),
      )

      const result = await importNotion(db, {
        ...target,
        flavorNotes: [...flavorNotes.values()],
        coffees: coffeePages.map(page => readNotionCoffee(page, flavorNotes)),
        copyPhoto: url => copyPhoto(url, 'coffees', scope),
      })

      return {
        result: {
          target: production ? 'production' : 'development',
          ...result,
        },
      }
    } finally {
      if (production) await db.$client.end()
    }
  },
})
