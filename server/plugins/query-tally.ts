import { defineNitroPlugin } from 'nitropack/runtime'
import { reportQueries, withQueryTally } from '#server/utils/query-tally'

export default defineNitroPlugin(nitroApp => {
  nitroApp.h3App.handler = withQueryTally(nitroApp.h3App.handler)
  nitroApp.hooks.hook('beforeResponse', reportQueries)
})
