import type {
  DehydratedState,
  Query,
  VueQueryPluginOptions,
} from '@tanstack/vue-query'
import {
  defaultShouldDehydrateQuery,
  dehydrate,
  hydrate,
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

function rendersOnServer(query: Query) {
  return query.meta?.ssr === true && defaultShouldDehydrateQuery(query)
}

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

    nuxt.hooks.hook('app:created', () => {
      const state = nuxt.payload.vueQuery as DehydratedState | undefined

      if (state) hydrate(queryClient, state)
    })

    nuxt.hooks.hook('app:rendered', () => {
      nuxt.payload.vueQuery = dehydrate(queryClient, {
        shouldDehydrateQuery: rendersOnServer,
      })
      queryClient.clear()
    })
  },
})
