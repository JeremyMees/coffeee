<script setup lang="ts">
import { BellRingIcon } from '@lucide/vue'

const { undecided, busy, turnOn } = usePush()
const failed = ref(false)

async function enable() {
  failed.value = false

  try {
    await turnOn()
  } catch (caught) {
    console.error('Could not turn on push', caught)
    failed.value = true
  }
}
</script>

<template>
  <DismissibleBanner
    title="Turn on push"
    text="Get a push on this device when something happens on your shelves."
    storage-key="push-banner-dismissed"
    testid="push-banner"
    :show="undecided || failed"
  >
    <Button
      type="button"
      data-testid="push-banner-turn-on"
      class="self-start"
      :disabled="busy"
      @click="enable"
    >
      <BellRingIcon aria-hidden="true" />
      Turn on push
    </Button>
    <Alert v-if="failed" variant="destructive" data-testid="push-banner-error">
      <AlertDescription>
        Push couldn't be turned on. Try again.
      </AlertDescription>
    </Alert>
  </DismissibleBanner>
</template>
