import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

const ignoredLogs = [/^<Suspense>/]

export default defineConfig({
  test: {
    onConsoleLog: log => !ignoredLogs.some(pattern => pattern.test(log)),
    projects: [
      {
        resolve: {
          alias: {
            '#server': fileURLToPath(new URL('server', import.meta.url)),
            '#shared': fileURLToPath(new URL('shared', import.meta.url)),
            '#test': fileURLToPath(new URL('test', import.meta.url)),
            'nitropack/runtime': fileURLToPath(
              new URL('test/support/nitro.ts', import.meta.url),
            ),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,vue}', 'server/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        'app/components/ui/**',
        'app/assets/**',
        'app/utils/shadcn.ts',
        'server/utils/db.ts',
        'server/db/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
