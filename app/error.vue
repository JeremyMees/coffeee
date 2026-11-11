<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const user = useCurrentUser()

const notFound = computed(() => props.error.statusCode === 404)

useHead({ title: () => `${notFound.value ? 'Not found' : 'Error'} · Coffeee` })
</script>

<template>
  <NuxtLayout :name="user ? 'default' : false">
    <main
      :class="
        user
          ? 'flex flex-col gap-6 py-10 lg:py-16'
          : 'flex min-h-dvh flex-col justify-center gap-6 px-6 py-[max(2rem,env(safe-area-inset-top))] lg:px-16'
      "
    >
      <span v-if="!user" class="text-[30px]"><AppWordmark /></span>
      <h1 class="text-title" data-testid="error-title">
        {{ notFound ? 'Not found' : 'Something broke' }}
      </h1>
      <p class="max-w-md text-xs" data-testid="error-message">
        {{
          notFound
            ? "That page doesn't exist or you don't have access to it."
            : 'Try again in a moment.'
        }}
      </p>
      <Button
        variant="outline"
        class="self-start"
        data-testid="error-back"
        @click="clearError({ redirect: '/' })"
      >
        Back to your shelf
      </Button>
    </main>
  </NuxtLayout>
</template>
