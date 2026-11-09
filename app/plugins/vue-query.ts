import type { VueQueryPluginOptions } from '@tanstack/vue-query'
import {
  QueryClient,
  timeoutManager,
  VueQueryPlugin,
} from '@tanstack/vue-query'

const oneMinute = 60 * 1000

function detach<Timer>(timer: Timer): Timer {
  ;(timer as { unref?: () => void }).unref?.()

  return timer
}

timeoutManager.setTimeoutProvider({
  setTimeout: (callback, delay) => detach(setTimeout(callback, delay)),
  clearTimeout: timeoutId => clearTimeout(timeoutId),
  setInterval: (callback, delay) => detach(setInterval(callback, delay)),
  clearInterval: intervalId => clearInterval(intervalId),
})

function isClientError(error: unknown) {
  const status = (error as { statusCode?: number }).statusCode

  return status !== undefined && status < 500
}

export default defineNuxtPlugin({
  name: 'vue-query',
  parallel: true,
  setup(nuxt) {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: oneMinute,
          gcTime: 5 * oneMinute,
          retry: (failures, error) => failures < 2 && !isClientError(error),
        },
      },
    })

    const options: VueQueryPluginOptions = { queryClient }

    nuxt.vueApp.use(VueQueryPlugin, options)

    nuxt.hooks.hook('app:rendered', () => {
      queryClient.clear()
    })
  },
})
