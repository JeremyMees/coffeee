<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { XIcon } from '@lucide/vue'

const { phone, offered } = useInstall()
const dismissed = useLocalStorage('install-banner-dismissed', false)
</script>

<template>
  <aside
    v-if="phone && offered && !dismissed"
    data-testid="install-banner"
    aria-labelledby="install-banner-title"
    class="relative mt-4 flex flex-col gap-3 rounded-[18px] border border-primary p-4 pr-14"
  >
    <div>
      <h2 id="install-banner-title" class="font-sans font-semibold">
        Put Coffeee on your home screen
      </h2>
      <p class="mt-1 text-xs">Open your shelf in one tap, like any app.</p>
    </div>
    <InstallAction />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-testid="install-banner-dismiss"
      class="absolute top-1.5 right-1.5"
      aria-label="Dismiss"
      @click="dismissed = true"
    >
      <XIcon aria-hidden="true" />
    </Button>
  </aside>
</template>
