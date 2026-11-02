import { afterEach, beforeEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { useQueryClient } from '@tanstack/vue-query'
import { useNuxtApp } from '#imports'

enableAutoUnmount(afterEach)

beforeEach(() => {
  useNuxtApp().vueApp.runWithContext(() => useQueryClient().clear())
})
