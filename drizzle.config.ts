import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

if (existsSync('.env')) process.loadEnvFile()

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schemas/index.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.NUXT_DATABASE_URL!,
  },
})
