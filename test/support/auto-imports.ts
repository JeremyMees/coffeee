import { fileURLToPath } from 'node:url'
import MagicString from 'magic-string'
import { createUnimport } from 'unimport'
import type { Plugin } from 'vitest/config'

export function nuxtAutoImports(): Plugin {
  const context = createUnimport({
    dirs: [
      fileURLToPath(new URL('../../app/utils/**', import.meta.url)),
      fileURLToPath(new URL('../../shared/utils/**', import.meta.url)),
    ],
    presets: ['vue'],
  })

  return {
    name: 'nuxt-auto-imports',
    enforce: 'post',
    async buildStart() {
      await context.init()
    },
    async transform(code, id) {
      if (
        !/[\\/]app[\\/].*\.ts($|\?)/.test(id) ||
        /[\\/]node_modules[\\/]/.test(id)
      )
        return

      const source = new MagicString(code)

      await context.injectImports(source, id)

      if (!source.hasChanged()) return

      return {
        code: source.toString(),
        map: source.generateMap({ hires: true }),
      }
    },
  }
}
