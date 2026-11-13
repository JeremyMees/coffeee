<script setup lang="ts">
const { state, busy, turnOn, turnOff } = usePush()
const saveError = ref('')

const usable = computed(() => state.value === 'on' || state.value === 'off')

async function toggle(on: boolean) {
  saveError.value = ''

  try {
    await (on ? turnOn() : turnOff())
  } catch (caught) {
    console.error('Could not change push', caught)
    saveError.value = on
      ? "Push couldn't be turned on. Try again."
      : "Push couldn't be turned off. Try again."
  }
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h2 class="text-[28px]">Push</h2>
      <p class="mt-1 text-xs">
        Get a push on this device for every notification.
      </p>
    </div>
    <div
      class="flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3"
    >
      <label for="push-this-device" class="font-sans font-semibold">
        Push on this device
      </label>
      <Switch
        id="push-this-device"
        data-testid="push-switch"
        :model-value="state === 'on'"
        :disabled="!usable || busy"
        @update:model-value="toggle"
      />
    </div>
    <div
      v-if="state === 'needsInstall'"
      data-testid="push-needs-install"
      class="flex flex-col gap-3"
    >
      <p class="text-xs">
        On iPhone, push works once Coffeee is on your Home Screen.
      </p>
      <InstallAction />
    </div>
    <p
      v-else-if="state === 'blocked'"
      class="text-xs"
      data-testid="push-blocked"
    >
      Push is blocked in your browser settings. Allow notifications for Coffeee
      there to turn it on.
    </p>
    <p
      v-else-if="state === 'unsupported'"
      class="text-xs"
      data-testid="push-unsupported"
    >
      This browser can't receive push. Email still works.
    </p>
    <Alert v-if="saveError" variant="destructive" data-testid="push-error">
      <AlertDescription>{{ saveError }}</AlertDescription>
    </Alert>
  </section>
</template>
