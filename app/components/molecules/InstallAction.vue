<script setup lang="ts">
import { DownloadIcon, ShareIcon, SquarePlusIcon } from '@lucide/vue'

const { canPrompt, needsSteps, install } = useInstall()
</script>

<template>
  <Button
    v-if="canPrompt"
    type="button"
    data-testid="install-open"
    class="self-start"
    @click="install"
  >
    <DownloadIcon aria-hidden="true" />
    Install Coffeee
  </Button>
  <ol
    v-else-if="needsSteps"
    data-testid="install-steps"
    class="flex flex-col gap-2 text-sm"
  >
    <li class="flex items-center gap-2" data-testid="install-step">
      <ShareIcon class="size-4 shrink-0" aria-hidden="true" />
      <span>1. Tap <strong>Share</strong> in the browser toolbar</span>
    </li>
    <li class="flex items-center gap-2" data-testid="install-step">
      <SquarePlusIcon class="size-4 shrink-0" aria-hidden="true" />
      <span>2. Choose <strong>Add to Home Screen</strong></span>
    </li>
  </ol>
</template>
