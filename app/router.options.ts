import type { RouterConfig } from 'nuxt/schema'
import { START_LOCATION } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'

type Position = { left: number; top: number }

const pageSettled = new Set(['page:finish', 'page:loading:end'])

function samePath(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  return to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')
}

function target(to: RouteLocationNormalized, saved: Position | null) {
  if (saved) return saved
  if (to.hash) return { el: to.hash }

  return { left: 0, top: 0 }
}

export default {
  scrollBehavior(to, from, saved) {
    if (samePath(to, from)) {
      if (to.hash) return { el: to.hash }

      return from.hash ? (saved ?? { left: 0, top: 0 }) : false
    }

    if (to.meta.scrollToTop === false) return false
    if (from === START_LOCATION) return target(to, saved)

    const nuxtApp = useNuxtApp()
    const router = useRouter()

    if (useRoute().fullPath === to.fullPath) return target(to, saved)

    return new Promise(resolve => {
      const stop = nuxtApp.hooks.beforeEach(({ name }) => {
        if (!pageSettled.has(name)) return

        stop()

        if (router.currentRoute.value.fullPath !== to.fullPath) {
          resolve(false)
          return
        }

        const position = target(to, saved)
        const fading = nuxtApp['~transitionPromise']

        if (fading) {
          fading.then(() => resolve(position))
          return
        }

        if ('el' in position) {
          resolve(position)
          return
        }

        window.scrollTo(position)
        resolve(false)
      })
    })
  },
} satisfies RouterConfig
