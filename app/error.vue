<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useHead({ title: () => `${notFound.value ? 'Not found' : 'Error'} · Coffeee` })
</script>

<template>
  <main
    class="flex min-h-dvh flex-col justify-center gap-6 px-6 py-[max(2rem,env(safe-area-inset-top))] lg:px-16"
  >
    <span class="text-[30px]"><AppWordmark /></span>
    <h1 class="text-[64px] lg:text-[88px]">
      {{ notFound ? 'Not found' : 'Something broke' }}
    </h1>
    <p class="max-w-md text-xs">
      {{
        notFound
          ? (error.statusMessage ?? 'There is nothing here.')
          : 'Try again in a moment.'
      }}
    </p>
    <Button
      variant="outline"
      class="self-start"
      @click="clearError({ redirect: '/' })"
    >
      Back to your shelf
    </Button>
  </main>
</template>
